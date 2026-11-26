import { test } from 'node:test';
import assert from 'node:assert/strict';
import { place, offsetKm, KM_PER_LY, KM_PER_AU } from '../origin.js';
import { createRig, cameraPlace, viewDirection, focusOn, step } from './rig.js';
import { toFree, toOrbit, look, move, axes, nearest, speedKm } from './free.js';

const KEEL = [-8.94, -18.79, 12.75];
const targets = new Map([
  ['basin', { place: place([0, 0, 0]), radiusKm: 25 * KM_PER_LY, viewKm: 60 * KM_PER_LY, minKm: KM_PER_LY, parentId: null, pickable: false }],
  ['star', { place: place(KEEL), radiusKm: 572561, viewKm: 3 * KM_PER_AU, minKm: 1e6, parentId: 'basin', solid: true }],
  ['planet', { place: place(KEEL, [KM_PER_AU, 0, 0]), radiusKm: 6000, viewKm: 30000, minKm: 15000, parentId: 'star', solid: true }],
]);
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);
const same = (p, q, tol) => near(Math.hypot(...offsetKm(p, q)), 0, tol);

test('switching to free and back to orbit moves nothing', () => {
  const rig = createRig(targets, 'planet', { distanceKm: 40000, yaw: 0.7, pitch: 0.4 });
  const before = cameraPlace(rig);
  const dir = viewDirection(rig);
  toFree(rig);
  same(cameraPlace(rig), before, 1e-6);
  toOrbit(rig, 'planet', 40000);
  same(cameraPlace(rig), before, 1e-6);
  assert.deepEqual(viewDirection(rig), dir);
});

test('a drag right turns the view so the scene moves right with the finger', () => {
  const rig = createRig(targets, 'planet', { distanceKm: 40000, yaw: 0.3, pitch: 0.2 });
  toFree(rig);
  const { r } = axes(rig);
  const yaw = rig.yaw;
  look(rig, 50, 0);
  const { f: f1 } = axes(rig);
  // The view turned left: its forward now leans away from the old right.
  assert.ok(f1[0] * r[0] + f1[1] * r[1] + f1[2] * r[2] < 0);
  near(rig.yaw - yaw, 50 * 0.004, 1e-12);
});

test('moving forward closes on what the camera looks at; it cannot fly into a planet', () => {
  const rig = createRig(targets, 'planet', { distanceKm: 40000 });
  toFree(rig);
  const before = Math.hypot(...offsetKm(rig.eye, targets.get('planet').place));
  move(rig, targets, [0, 0, 10000]);
  near(Math.hypot(...offsetKm(rig.eye, targets.get('planet').place)), before - 10000, 1e-6);
  move(rig, targets, [0, 0, 1e6]);
  near(Math.hypot(...offsetKm(rig.eye, targets.get('planet').place)), 1.2 * 6000, 1e-6);
});

test('speed follows the distance to the nearest surface', () => {
  const rig = createRig(targets, 'planet', { distanceKm: 40000 });
  toFree(rig);
  const n = nearest(targets, rig.eye);
  assert.equal(n.id, 'planet');
  near(speedKm(n, false), 0.8 * (40000 - 6000), 1e-6);
  near(speedKm(n, true), 5 * 0.8 * (40000 - 6000), 1e-6);
});

test('a long free flight keeps the eye precise: its anchor moves with it', () => {
  const rig = createRig(targets, 'star', { distanceKm: 2 * KM_PER_LY });
  toFree(rig);
  const start = cameraPlace(rig);
  move(rig, targets, [0, 0, KM_PER_LY]);
  near(Math.hypot(...offsetKm(start, rig.eye)), KM_PER_LY, KM_PER_LY * 1e-12);
  assert.ok(Math.hypot(...rig.eye.offset) < 1e14); // offset kept small by re-anchoring near the nearest star
});

test('a click in free mode: back to orbit, then a flight that ends on the object', () => {
  const rig = createRig(targets, 'star', { distanceKm: 5 * KM_PER_AU });
  toFree(rig);
  move(rig, targets, [1e7, 0, 0]);
  toOrbit(rig, 'star', 1e8);
  focusOn(rig, targets, 'planet', 0);
  while (step(rig, (rig.fly?.t0 ?? 0) + (rig.fly?.dur ?? 0) + 1));
  assert.deepEqual(rig.target, targets.get('planet').place);
});
