import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildIndex } from './store.js';
import { orbitAngleDeg, bodyOffsetKm, daysSinceEpoch, trueAnomaly, orbitPoint, KM_PER_AU } from './orbits.js';

const map = JSON.parse(readFileSync(new URL('../../data/map.json', import.meta.url), 'utf8'));
const index = buildIndex(map);
const body = (id) => index.byId.get(id);
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

test('the clock stands 299 days after the epoch', () => {
  assert.equal(daysSinceEpoch(map.clock), 299); // 5029u day 1 → day 300
});

// Worked by hand: angle = phaseDeg + 360 × 299 / periodDays, less whole turns.
test('three hand-worked bodies on 5029u day 300', () => {
  // Cairn III: 300 + 360 × 299 / 4167.3 = 300 + 25.830 = 325.830°
  near(orbitAngleDeg(body('cairn-iii').orbit, 299), 325.830, 0.001);
  // Tallis: 60 + 360 × 299 / 393.0 = 60 + 273.893 = 333.893°
  near(orbitAngleDeg(body('tallis-planet').orbit, 299), 333.893, 0.001);
  // Ostrom I: 40 + 360 × 299 / 45.0 = 40 + 2392.000 = 2432.000 → less 6 turns (2160) = 272.000°
  near(orbitAngleDeg(body('ostrom-i').orbit, 299), 272.0, 0.001);
});

test('a lane mouth with no period stays at its phase', () => {
  assert.equal(orbitAngleDeg(body('ostrom-tallis-at-ostrom').orbit, 299), 80);
  const [x, y, z] = bodyOffsetKm(body('ostrom-tallis-at-ostrom'), index, 299);
  near(Math.hypot(x, y), 2.6 * KM_PER_AU, 1);
  near(Math.atan2(y, x) * 180 / Math.PI, 80, 1e-9);
  assert.equal(z, 0);
});

test('a moon sits at its distance from its planet, which sits at its own', () => {
  const planet = bodyOffsetKm(body('tallis-planet'), index, 299);
  const moon = bodyOffsetKm(body('tallis-a'), index, 299);
  near(Math.hypot(...planet), 1.05 * KM_PER_AU, 1);
  near(Math.hypot(...moon.map((v, i) => v - planet[i])), 210000, 1e-3);
  // Tallis A: 30 + 360 × 299 / 10.569 = 30 + 10184.502 → 10214.502 − 28 × 360 = 134.502°
  near(Math.atan2(moon[1] - planet[1], moon[0] - planet[0]) * 180 / Math.PI, 134.502, 0.001);
});

test("Pennant's eccentric year: nearest at periapsis, farthest at apoapsis, on its ellipse", () => {
  const o = body('pennant-planet').orbit; // a = 1.608 AU, e = 0.18
  near(Math.hypot(...orbitPoint(o, 0)), 1.608 * (1 - 0.18) * KM_PER_AU, 1);
  near(Math.hypot(...orbitPoint(o, Math.PI)), 1.608 * (1 + 0.18) * KM_PER_AU, 1);
  // Mean and true anomaly agree at periapsis and apoapsis, and the year still takes periodDays.
  const dayAt = (deg) => ((deg - o.phaseDeg) / 360) * o.periodDays;
  near(trueAnomaly(o, dayAt(360)), 0, 1e-9);
  near(Math.abs(trueAnomaly(o, dayAt(180))), Math.PI, 1e-9);
});

test('every body has a position, and every orbiting one sits at its distance', () => {
  const cache = new Map();
  for (const b of map.bodies) {
    const p = bodyOffsetKm(b, index, 299, cache);
    assert.ok(p.every(Number.isFinite), b.id);
    if (!b.orbit || b.orbit.eccentricity) continue;
    const parent = b.parent ? bodyOffsetKm(body(b.parent), index, 299, cache) : [0, 0, 0];
    const want = b.orbit.distance * (b.orbit.unit === 'au' ? KM_PER_AU : 1);
    near(Math.hypot(...p.map((v, i) => v - parent[i])), want, want * 1e-12 + 1e-6);
  }
});
