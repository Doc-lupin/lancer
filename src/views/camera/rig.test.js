import { test } from 'node:test';
import assert from 'node:assert/strict';
import { place, offsetKm, KM_PER_LY, KM_PER_AU } from '../origin.js';
import { createRig, zoom, focusOn, step, cameraPlace, MAX_DISTANCE_KM, WHEEL_STEP } from './rig.js';

// Basin → Keel star → planet → station, as in the camera test scene.
const KEEL = [-8.94, -18.79, 12.75];
const PLANET = [0.6 * KM_PER_AU, 0.1 * KM_PER_AU, 0.79 * KM_PER_AU];
const STATION = [PLANET[0], PLANET[1], PLANET[2] + 40000];
const targets = new Map([
  ['basin', { place: place([0, 0, 0]), radiusKm: 0, viewKm: 60 * KM_PER_LY, minKm: 1 * KM_PER_LY, parentId: null, pickable: false }],
  ['star', { place: place(KEEL), radiusKm: 572561, viewKm: 3 * KM_PER_AU, minKm: 700000, parentId: 'basin' }],
  ['planet', { place: place(KEEL, PLANET), radiusKm: 6000, viewKm: 30000, minKm: 7200, parentId: 'star' }],
  ['station', { place: place(KEEL, STATION), radiusKm: 0.15, viewKm: 1, minKm: 0.2, parentId: 'planet' }],
]);

function flyAndRecord(rig, id) {
  const dest = targets.get(id).place;
  focusOn(rig, targets, id, 0);
  const { dur, v } = rig.fly;
  const len = Math.hypot(...v);
  const frames = [];
  for (let t = 0; t <= dur + 20; t += 16) {
    step(rig, t);
    const left = offsetKm(rig.target, dest);
    // How much of the journey is still ahead, measured along the line of flight.
    const ahead = len ? (left[0] * v[0] + left[1] * v[1] + left[2] * v[2]) / len : 0;
    frames.push({ ahead, distance: rig.distance });
  }
  return frames;
}

test('a flight across the Basin ends exactly on the station, without passing it', () => {
  const rig = createRig(targets, 'basin');
  const frames = flyAndRecord(rig, 'station');
  assert.equal(rig.fly, null);
  assert.deepEqual(rig.target, targets.get('station').place);
  assert.equal(rig.distance, 1);
  for (let i = 1; i < frames.length; i++) {
    assert.ok(frames[i].ahead <= frames[i - 1].ahead + 1e-9, `target moved backwards at frame ${i}`);
    assert.ok(frames[i].ahead >= -1e-6, `target passed the station at frame ${i}`);
    assert.ok(frames[i].distance >= 1 - 1e-12, `camera came closer than the view distance at frame ${i}`);
  }
  // The last part of the approach only slows down.
  const tail = frames.slice(-10).map((f) => f.distance);
  for (let i = 1; i < tail.length; i++) assert.ok(tail[i] <= tail[i - 1]);
});

test('every flight between the four levels ends on its object and never comes too close', () => {
  for (const from of targets.keys()) {
    for (const to of targets.keys()) {
      const rig = createRig(targets, from);
      const frames = flyAndRecord(rig, to);
      assert.deepEqual(rig.target, targets.get(to).place, `${from} → ${to}`);
      const lowest = Math.min(targets.get(from).viewKm, targets.get(to).viewKm);
      assert.ok(frames.every((f) => f.distance >= lowest * (1 - 1e-12)), `${from} → ${to} dips below ${lowest}`);
    }
  }
});

test('the wheel zooms by the same ratio at every scale, from 50 ly to the station with no stop', () => {
  const rig = createRig(targets, 'station', { distanceKm: 50 * KM_PER_LY });
  let notches = 0;
  while (rig.distance > targets.get('station').minKm) {
    const before = rig.distance;
    zoom(rig, targets, 1 / WHEEL_STEP, 0);
    notches++;
    const ratio = before / rig.distance;
    if (rig.distance > targets.get('station').minKm) assert.ok(Math.abs(ratio - WHEEL_STEP) < 1e-9);
    assert.equal(rig.focusId, 'station');
  }
  assert.equal(notches, 88); // ln(50 ly / 0.2 km) / ln 1.5 = 87.3
});

test('zooming out climbs station → planet → star → Basin, then stops at the outer limit', () => {
  const rig = createRig(targets, 'station');
  const seen = ['station'];
  let t = 0;
  while (rig.distance < MAX_DISTANCE_KM) {
    zoom(rig, targets, WHEEL_STEP, t);
    while (step(rig, (t += 16)));
    if (seen.at(-1) !== rig.focusId) seen.push(rig.focusId);
  }
  assert.deepEqual(seen, ['station', 'planet', 'star', 'basin']);
  zoom(rig, targets, WHEEL_STEP, t);
  assert.equal(rig.distance, MAX_DISTANCE_KM);
});

test('the camera keeps its precision at the Keel', () => {
  const rig = createRig(targets, 'station', { distanceKm: 1 });
  const cam = cameraPlace(rig);
  assert.deepEqual(cam.anchor, KEEL);
  assert.ok(Math.abs(Math.hypot(...offsetKm(cam, targets.get('station').place)) - 1) < 1e-6); // within 1 mm
});

test('a long flight to a small thing keeps the destination in sight on the way in', () => {
  // From a planet's close view across 4 AU to a station: the old curve zoomed
  // to 20 km while the target still had millions of km to go (found in task 2.11).
  const rig = createRig(targets, 'planet', { distanceKm: 25000 });
  const dest = targets.get('station').place;
  focusOn(rig, targets, 'station', 0, 1);
  const { dur } = rig.fly;
  let worst = 0;
  for (let t = 16; t <= dur; t += 16) {
    step(rig, t);
    const left = Math.hypot(...offsetKm(rig.target, dest));
    worst = Math.max(worst, left / rig.distance); // how many camera distances the target still has to go
  }
  assert.ok(worst < 40, `the target was ${worst.toFixed(0)} camera distances from the station at one point`);
});
