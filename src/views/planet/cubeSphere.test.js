import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FACES, facePoint, choosePatches, patchGeometry, setPatches, MAX_PATCH_COUNT } from './cubeSphere.js';

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

test('each face has u × v = n, so its triangles face outward', () => {
  for (const { n, u, v } of FACES) assert.deepEqual(cross(u, v), n);
});

test('face points lie on the unit sphere, and the six faces meet', () => {
  for (let f = 0; f < 6; f++) for (const [a, b] of [[-1, -1], [0, 0], [1, 0.3], [-0.5, 1]]) {
    assert.ok(Math.abs(Math.hypot(...facePoint(f, a, b)) - 1) < 1e-12);
  }
  // The +x face's u = +1 edge is the +y face's v = +1 edge.
  const p = facePoint(0, 1, 0.25), q = facePoint(2, 0.25, 1);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(p[i] - q[i]) < 1e-12);
});

test('far away: the six faces, unsplit (or split little)', () => {
  const ps = choosePatches([0, 0, 200], 900);
  assert.ok(ps.length <= 6 * 4, `${ps.length} patches`);
});

test('close up: patches near the camera are small, far ones large or culled', () => {
  const eye = [0, 0, 1.2];
  const ps = choosePatches(eye, 900);
  assert.ok(ps.length > 30 && ps.length < MAX_PATCH_COUNT, `${ps.length} patches`);
  const near = ps.filter((p) => p[0] === 4 && Math.abs(p[1] + p[3] / 2) < 0.1 && Math.abs(p[2] + p[3] / 2) < 0.1);
  assert.ok(near.every((p) => p[4] >= 4), 'patches under the camera are split');
  assert.ok(!ps.some((p) => p[0] === 5), 'the far face is beyond the horizon');
});

test('patches tile each face without overlap', () => {
  const ps = choosePatches([0.3, 0.9, 1.1], 1200);
  for (let f = 0; f < 6; f++) {
    const area = ps.filter((p) => p[0] === f).reduce((s, p) => s + p[3] * p[3], 0);
    assert.ok(area <= 4 + 1e-9, `face ${f} area ${area}`);
  }
});

test('the patch grid and its instance data', () => {
  const g = patchGeometry();
  assert.equal(g.attributes.aGrid.count, 33 * 33 + 4 * 32);
  assert.equal(setPatches(g, [[0, -1, -1, 2, 0]]), true);
  assert.equal(setPatches(g, [[0, -1, -1, 2, 0]]), false);
  assert.equal(g.instanceCount, 1);
});
