// Camera rig (decision P6): orbit around a focus, zoom by a ratio, fly to an
// object, and go up to the parent level when zoomed out far enough.
// Plain functions on a plain object, so they can be tested without a browser.
//
// The camera sits `distance` km from `target`, in the direction given by `yaw`
// and `pitch`, looking at the target. `frame` (≥ 1) widens framing distances on
// screens narrower than they are tall, so a portrait phone sees the same width
// as a landscape screen; CameraRig keeps it up to date. `target` is a place (../origin.js), so
// the camera keeps full precision anywhere in the Basin.

import { place, offsetKm, KM_PER_LY } from '../origin.js';

export const MAX_DISTANCE_KM = 120 * KM_PER_LY;
export const WHEEL_STEP = 1.5; // zoom ratio per mouse-wheel notch (100 units of deltaY)
export const ORBIT_RAD_PER_PX = 0.005;
export const LEAVE_FACTOR = 2; // go up a level when farther than this × the distance to the parent
const PITCH_LIMIT = 1.5; // radians, just short of straight up or down
const RECENTRE_MS = 600;

const copy = (p) => place(p.anchor, p.offset);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export const frameFor = (aspect) => Math.max(1, 1 / aspect);

export function createRig(targets, focusId, { distanceKm, yaw = 0.6, pitch = 0.35, frame = 1 } = {}) {
  const f = targets.get(focusId);
  return { focusId, target: copy(f.place), distance: distanceKm ?? f.viewKm * frame, yaw, pitch, fly: null, camera: null, frame };
}

// Unit vector from the target towards the camera.
export function viewDirection(rig, out = [0, 0, 0]) {
  const c = Math.cos(rig.pitch);
  out[0] = Math.sin(rig.yaw) * c;
  out[1] = Math.sin(rig.pitch);
  out[2] = Math.cos(rig.yaw) * c;
  return out;
}

export function cameraPlace(rig) {
  const d = viewDirection(rig);
  return place(rig.target.anchor, rig.target.offset.map((v, i) => v + rig.distance * d[i]));
}

export function orbit(rig, dxPx, dyPx) {
  rig.yaw -= dxPx * ORBIT_RAD_PER_PX;
  rig.pitch = clamp(rig.pitch + dyPx * ORBIT_RAD_PER_PX, -PITCH_LIMIT, PITCH_LIMIT);
}

export function isDescendant(targets, id, ancestorId) {
  for (let p = targets.get(id)?.parentId; p; p = targets.get(p)?.parentId) if (p === ancestorId) return true;
  return false;
}

// Zoomed out past this, the focus moves up to the parent.
export function leaveDistance(targets, id, frame = 1) {
  const f = targets.get(id);
  const p = f.parentId && targets.get(f.parentId);
  if (!p) return Infinity;
  const apart = Math.hypot(...offsetKm(p.place, f.place));
  return Math.max(LEAVE_FACTOR * apart, 2 * p.minKm, 2 * f.viewKm * frame);
}

// Multiply the distance by `factor` (above 1 = out). Stops at the focus's
// closest distance and at MAX_DISTANCE_KM; going out past leaveDistance hands
// the focus to the parent, which slides to the middle of the view.
export function zoom(rig, targets, factor, now) {
  const f = targets.get(rig.focusId);
  rig.distance = clamp(rig.distance * factor, f.minKm, MAX_DISTANCE_KM);
  if (rig.fly) rig.fly.d1 = null; // the user has taken over the distance
  while (factor > 1 && rig.distance > leaveDistance(targets, rig.focusId, rig.frame ?? 1)) {
    focusOn(rig, targets, targets.get(rig.focusId).parentId, now, null);
  }
}

// Make `id` the focus and move the target there. With distanceKm (default:
// the object's viewKm) the camera also zooms to that distance; with null it
// keeps the current distance and only slides the target over.
export function focusOn(rig, targets, id, now, distanceKm = targets.get(id).viewKm * (rig.frame ?? 1)) {
  const to = copy(targets.get(id).place);
  const from = copy(rig.target);
  const v = offsetKm(from, to);
  const d0 = rig.distance;
  const d1 = distanceKm;
  let hop = 0;
  let dur = RECENTRE_MS;
  if (d1 != null) {
    // Rise far enough mid-flight to keep the journey in view, then come down.
    hop = Math.max(0, Math.log(1.2 * Math.hypot(...v)) - Math.log(Math.max(d0, d1)));
    dur = Math.min(3000, 800 + 50 * Math.abs(Math.log(d1 / d0)) + 100 * hop);
  }
  rig.focusId = id;
  rig.fly = { from, to, v, d0, d1, hop, t0: now, dur };
}

// Advance a flight to time `now`. Returns true while something moved.
// The target follows a straight line at an eased pace, never passing the
// destination. The distance follows a smooth curve in log scale that never
// dips below the smaller of the start and end distances. Positions are taken
// from the start's anchor for the first half and the destination's for the
// second, so the flight ends exactly on the destination.
export function step(rig, now) {
  const f = rig.fly;
  if (!f) return false;
  const t = Math.min(1, (now - f.t0) / f.dur);
  if (t >= 1) {
    rig.target = copy(f.to);
    if (f.d1 != null) rig.distance = f.d1;
    rig.fly = null;
    return true;
  }
  const s = ease(t);
  rig.target = s < 0.5
    ? place(f.from.anchor, f.from.offset.map((x, i) => x + f.v[i] * s))
    : place(f.to.anchor, f.to.offset.map((x, i) => x - f.v[i] * (1 - s)));
  if (f.d1 != null) {
    rig.distance = Math.exp((1 - s) * Math.log(f.d0) + s * Math.log(f.d1) + f.hop * 4 * s * (1 - s));
  }
  return true;
}
