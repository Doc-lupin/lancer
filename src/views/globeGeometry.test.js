import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latLonSphere, uvToLatLon } from './globeGeometry.js';
import { surfaceVector } from '../data/globe.js';

const g = latLonSphere(36, 18);
const pos = g.attributes.position;
const uv = g.attributes.uv;

test('every vertex sits where its texture coordinate says, in lat/lon', () => {
  for (let i = 0; i < pos.count; i++) {
    const want = surfaceVector(uvToLatLon([uv.getX(i), uv.getY(i)]));
    for (let k = 0; k < 3; k++) assert.ok(Math.abs(pos.getComponent(i, k) - want[k]) < 1e-6, `vertex ${i}`);
  }
});

test('an equirectangular map: left edge −180°, middle 0°, top the north pole', () => {
  assert.deepEqual(uvToLatLon([0, 0.5]), [0, -180]);
  assert.deepEqual(uvToLatLon([0.5, 0.5]), [0, 0]);
  assert.deepEqual(uvToLatLon([0.75, 0.5]), [0, 90]);
  assert.deepEqual(uvToLatLon([0.5, 1]), [90, 0]);
});

test('triangles face outwards', () => {
  const idx = g.index.array;
  const p = (i) => [pos.getX(i), pos.getY(i), pos.getZ(i)];
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [p(idx[t]), p(idx[t + 1]), p(idx[t + 2])];
    const u = b.map((v, k) => v - a[k]), w = c.map((v, k) => v - a[k]);
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const mid = [0, 1, 2].map((k) => a[k] + b[k] + c[k]);
    assert.ok(n[0] * mid[0] + n[1] * mid[1] + n[2] * mid[2] > 0, `triangle ${t / 3} faces inwards`);
  }
});
