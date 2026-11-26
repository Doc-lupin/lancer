import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildIndex } from './store.js';
import { bodyOffsetKm, daysSinceEpoch } from './orbits.js';
import { surfaceVector, bodyAxes, surfaceOffsetKm, pathLatAt } from './globe.js';

const map = JSON.parse(readFileSync(new URL('../../data/map.json', import.meta.url), 'utf8'));
const index = buildIndex(map);
const days = daysSinceEpoch(map.clock);
const body = (id) => index.byId.get(id);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

test('surface vectors: the equator at lon 0 and 90, and the north pole', () => {
  assert.deepEqual(surfaceVector([0, 0]).map((v) => +v.toFixed(12)), [1, 0, 0]);
  assert.deepEqual(surfaceVector([0, 90]).map((v) => +v.toFixed(12)), [0, 1, 0]);
  assert.deepEqual(surfaceVector([90, 0]).map((v) => +v.toFixed(12)), [0, 0, 1]);
});

test("a tilted globe's axes stay at right angles, and north leans by the tilt", () => {
  const axes = bodyAxes(body('tallis-planet'), days); // tilt 19°
  for (const [a, b] of [['lon0', 'lon90'], ['lon0', 'north'], ['lon90', 'north']]) near(dot(axes[a], axes[b]), 0, 1e-12);
  near(Math.acos(axes.north[1]) * 180 / Math.PI, 19, 1e-9);
  const cross = [1, 2, 0].map((i, k) => axes.lon0[(k + 1) % 3] * axes.lon90[(k + 2) % 3] - axes.lon0[(k + 2) % 3] * axes.lon90[(k + 1) % 3]);
  cross.forEach((v, i) => near(v, axes.north[i], 1e-12)); // right-handed
});

test("Gloam is tidally locked: longitude 0 faces its star, the twilight band (±90°) is side-on", () => {
  const g = body('gloam-planet');
  const toStar = unit(bodyOffsetKm(g, index, days).map((v) => -v));
  const axes = bodyAxes(g, days, toStar);
  near(dot(unit(surfaceOffsetKm([0, 0], axes, 1)), toStar), 1, 1e-9);
  near(dot(unit(surfaceOffsetKm([0, 90], axes, 1)), toStar), 0, 1e-9);
  near(dot(unit(surfaceOffsetKm([0, 180], axes, 1)), toStar), -1, 1e-9);
});

test('a place sits on the surface, at its radius from the center', () => {
  const s = body('scald-planet');
  const axes = bodyAxes(s, days);
  near(Math.hypot(...surfaceOffsetKm([14, 31], axes, s.radiusKm)), s.radiusKm, 1e-9);
});

test("Scald: the Concord's places lie north of the Seam, the League's south", () => {
  const seam = map.places.find((p) => p.id === 'the-seam');
  const s = body('scald-planet');
  const axes = bodyAxes(s, days);
  const north = (at) => dot(surfaceOffsetKm(at, axes, 1), axes.north); // height towards the pole, on the globe
  const held = (p, f) => p.control?.holders?.length === 1 && p.control.holders[0] === f;
  const concord = map.places.filter((p) => p.body === 'scald-planet' && held(p, 'northern-concord'));
  const league = map.places.filter((p) => p.body === 'scald-planet' && held(p, 'southern-league'));
  assert.ok(concord.length >= 3 && league.length >= 1, `${concord.length} Concord, ${league.length} League places`);
  for (const p of concord) assert.ok(north(p.at) > north([pathLatAt(seam.path, p.at[1]), p.at[1]]), `${p.id} is not north of the Seam`);
  for (const p of league) assert.ok(north(p.at) < north([pathLatAt(seam.path, p.at[1]), p.at[1]]), `${p.id} is not south of the Seam`);
});
