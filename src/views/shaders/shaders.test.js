// The shared shader library (task B0.8), through its JavaScript twins.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pcg3d, hash3 } from './hash.js';
import { noise3, fbm3, ridged3, cell3, curl3 } from './noise.js';
import { rayleighPhase, hgPhase, csPhase, raySphere } from './scatter.js';
import { blackbody, blackbodyIntegrated, wavelengthRgb, cie1931 } from './color.js';

// A small fixed set of sample points, the same on every run.
const points = (n) => Array.from({ length: n }, (_, i) => hash3([i, 7, -3]).map((v, k) => (v - 0.5) * (k + 1) * 23.7));

test('the hash is deterministic, 32-bit, and spreads evenly', () => {
  assert.deepEqual(pcg3d([1, 2, 3]), pcg3d([1, 2, 3]));
  assert.notDeepEqual(pcg3d([1, 2, 3]), pcg3d([1, 2, 4]));
  for (const v of pcg3d([4294967295, 0, 12345])) assert.ok(Number.isInteger(v) && v >= 0 && v < 2 ** 32);
  // Negative lattice points work (as the GLSL's uvec3(ivec3) keeps the bits).
  assert.deepEqual(hash3([-1, -2, -3]), hash3([4294967295, 4294967294, 4294967293]));
  const xs = Array.from({ length: 20000 }, (_, i) => hash3([i, -i, i * 7])[0]);
  const mean = xs.reduce((a, b) => a + b) / xs.length;
  assert.ok(Math.abs(mean - 0.5) < 0.01, `mean ${mean}`);
  const bins = new Array(10).fill(0);
  for (const x of xs) bins[Math.floor(x * 10)]++;
  for (const b of bins) assert.ok(Math.abs(b - 2000) < 200, `bins ${bins}`);
});

test('gradient noise: 0 on lattice points, within about ±1, continuous', () => {
  for (const c of [[0, 0, 0], [3, -2, 7], [-11, 5, 2]]) assert.equal(noise3(c), 0);
  let lo = 0, hi = 0;
  for (const p of points(4000)) {
    const n = noise3(p);
    lo = Math.min(lo, n); hi = Math.max(hi, n);
    assert.ok(Math.abs(noise3([p[0] + 1e-4, p[1], p[2]]) - n) < 1e-3, 'continuous');
  }
  assert.ok(lo > -1.1 && hi < 1.1 && hi - lo > 1, `range ${lo} to ${hi}`);
});

test('fbm and ridged noise stay in range; fractional octaves fade in smoothly', () => {
  for (const p of points(500)) {
    const f = fbm3(p, 6, 0.5, 2);
    const r = ridged3(p, 6, 0.5, 2);
    assert.ok(Math.abs(f) <= 1.1 && r >= 0 && r <= 1.0001, `${f} ${r}`);
    assert.ok(Math.abs(fbm3(p, 4.001, 0.5, 2) - fbm3(p, 4, 0.5, 2)) < 1e-3, 'no jump at an octave');
  }
});

test('cell noise: nearest no farther than second, both plausible, id in [0, 1)', () => {
  for (const p of points(500)) {
    const [f1, f2, id] = cell3(p);
    assert.ok(f1 >= 0 && f1 <= f2 && f1 < Math.sqrt(3) && id >= 0 && id < 1, `${f1} ${f2} ${id}`);
  }
});

test('curl noise has no divergence', () => {
  const h = 1e-2;
  for (const p of points(200)) {
    const d = (k) => {
      const a = [...p], b = [...p];
      a[k] += h; b[k] -= h;
      return (curl3(a)[k] - curl3(b)[k]) / (2 * h);
    };
    const div = d(0) + d(1) + d(2);
    const size = Math.hypot(...curl3(p));
    assert.ok(Math.abs(div) < 0.02 * Math.max(1, size), `divergence ${div} at size ${size}`);
  }
});

test('every phase function integrates to 1 over the sphere', () => {
  const integrate = (f) => { let s = 0; const n = 20000; for (let i = 0; i < n; i++) { const mu = -1 + (2 * (i + 0.5)) / n; s += f(mu) * (2 / n); } return 2 * Math.PI * s; };
  assert.ok(Math.abs(integrate(rayleighPhase) - 1) < 1e-4);
  for (const g of [-0.5, 0, 0.3, 0.76, 0.9]) {
    assert.ok(Math.abs(integrate((mu) => hgPhase(mu, g)) - 1) < 2e-3, `HG g=${g}`);
    assert.ok(Math.abs(integrate((mu) => csPhase(mu, g)) - 1) < 2e-3, `CS g=${g}`);
  }
  assert.ok(hgPhase(1, 0.8) > hgPhase(-1, 0.8), 'g > 0 scatters forward');
});

test('ray and sphere', () => {
  assert.deepEqual(raySphere([0, 0, -5], [0, 0, 1], 1), [4, 6]);
  const miss = raySphere([0, 3, -5], [0, 0, 1], 1);
  assert.ok(miss[1] < miss[0]);
  const inside = raySphere([0, 0, 0], [1, 0, 0], 2);
  assert.deepEqual(inside, [-2, 2]);
});

test('blackbody: the fast formula matches the Planck spectrum, and looks right', () => {
  for (const T of [1800, 2500, 3200, 4000, 5000, 5800, 6500, 8000, 10000, 15000, 25000]) {
    const a = blackbody(T), b = blackbodyIntegrated(T);
    for (let k = 0; k < 3; k++) assert.ok(Math.abs(a[k] - b[k]) < 0.03, `${T} K: ${a.map((v) => v.toFixed(3))} vs ${b.map((v) => v.toFixed(3))}`);
  }
  const red = blackbody(3000), sun = blackbody(5800), white = blackbody(6500), blue = blackbody(15000);
  assert.ok(red[0] === 1 && red[1] < 0.7 && red[2] < red[1], `3000 K ${red}`);
  assert.ok(sun[0] === 1 && sun[2] > 0.8, `5800 K ${sun}`);
  for (const v of white) assert.ok(v > 0.93, `6500 K ${white}`);
  assert.ok(blue[2] === 1 && blue[0] < 0.8, `15000 K ${blue}`);
  assert.deepEqual(blackbody(600000), blackbody(25000), 'hotter than the formula: its hot end');
});

test('wavelength colors: blue, green, red where they should be; ȳ peaks near 555 nm', () => {
  const at = (l) => { const c = wavelengthRgb(l); return c.indexOf(Math.max(...c)); };
  assert.equal(at(450), 2);
  assert.equal(at(530), 1);
  assert.equal(at(656.3), 0); // H-alpha
  let best = 0, peak = 0;
  for (let l = 380; l <= 780; l++) if (cie1931(l)[1] > best) { best = cie1931(l)[1]; peak = l; }
  assert.ok(Math.abs(peak - 555) <= 15, `peak ${peak}`);
});
