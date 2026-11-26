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
export const LEAVE_FACTOR = 1.5; // go up a level when farther than this × the distance to the parent
const PITCH_LIMIT = 1.5; // radians, just short of straight up or down
const RECENTRE_MS = 600;

const copy = (p) => place(p.anchor, p.offset);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeSine = (t) => (1 - Math.cos(Math.PI * t)) / 2;

// Smooth zoom-and-pan (van Wijk and Nuij, 2003): the path that keeps motion on
// screen even, rising just enough to keep a long journey in view, then coming
// down. w0 and w1 are the start and end distances, u1 the length of the
// journey; s runs 0..S. Returns { S, at(s) → { u, w } }: u the distance
// travelled along the line, w the camera's distance. w never dips below the
// smaller of w0 and w1, and u only grows.
const RHO = Math.SQRT2;
export function zoomPath(w0, w1, u1) {
  if (u1 < 1e-9 * Math.max(w0, w1)) {
    const k = Math.log(w1 / w0);
    const S = Math.abs(k) / RHO;
    return { S, at: (s) => ({ u: S ? (u1 * s) / S : u1, w: w0 * Math.exp(S ? (k * s) / S : 0) }) };
  }
  const b = (i) => (w1 * w1 - w0 * w0 + (i ? -1 : 1) * RHO ** 4 * u1 * u1) / (2 * (i ? w1 : w0) * RHO * RHO * u1);
  const r0 = -Math.asinh(b(0));
  const r1 = -Math.asinh(b(1));
  const S = (r1 - r0) / RHO;
  const c0 = Math.cosh(r0), s0 = Math.sinh(r0);
  return {
    S,
    at: (s) => ({
      u: (w0 / (RHO * RHO)) * (c0 * Math.tanh(RHO * s + r0) - s0),
      w: (w0 * c0) / Math.cosh(RHO * s + r0),
    }),
  };
}

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
  if (rig.mode === 'free') return place(rig.eye.anchor, rig.eye.offset); // free movement (free.js)
  const d = viewDirection(rig);
  return place(rig.target.anchor, rig.target.offset.map((v, i) => v + rig.distance * d[i]));
}

export function orbit(rig, dxPx, dyPx) {
  if (rig.fly) rig.fly.angles = null; // the user has taken over the angle
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
  return Math.max(LEAVE_FACTOR * apart, 1.6 * f.viewKm * frame);
}

// Multiply the distance by `factor` (above 1 = out). Stops at the focus's
// closest distance and at MAX_DISTANCE_KM; going out past leaveDistance hands
// the focus to the parent, which slides to the middle of the view.
export function zoom(rig, targets, factor, now) {
  const f = targets.get(rig.focusId);
  // Zooming in stops at the focus's closest distance; zooming out never jumps
  // (after a handover, the camera may already be inside the new focus's minimum).
  let d = rig.distance * factor;
  if (factor < 1) d = Math.max(d, Math.min(f.minKm, rig.distance));
  rig.distance = Math.min(d, MAX_DISTANCE_KM);
  if (rig.fly) rig.fly.d1 = null; // the user has taken over the distance
  while (factor > 1 && rig.distance > leaveDistance(targets, rig.focusId, rig.frame ?? 1)) {
    focusOn(rig, targets, targets.get(rig.focusId).parentId, now, null);
  }
}

// The camera angle a level prefers (task 2.10), or null to keep the current one.
// Each target may carry `pitch` (0.3 for the Basin and regions, a chart-like
// view; 0.9 for systems and bodies, looking down on their orbits) and, for a
// round body, `closeDir` or `toStar`, used in its close view (closeKm): facing
// the middle of its places if it has any; otherwise just above the equator,
// turned 40° from the star, so the globe shows lit with a terminator.
// The angle only changes when it is well off the preference, so a view the
// user has turned to is mostly kept.
const CLOSE_PITCH = 0.25;
const CLOSE_PITCH_RINGS = 0.45; // high enough that the rings open up
const CLOSE_TURN = 40 * Math.PI / 180;
export function preferredAngles(rig, t, distanceKm) {
  const close = t.closeKm && distanceKm <= 1.2 * t.closeKm * (rig.frame ?? 1);
  if (close) {
    // Facing the middle of the body's places, if it has any.
    if (t.closeDir) {
      const [x, y, z] = t.closeDir;
      return { yaw: Math.atan2(x, z), pitch: Math.max(-1.2, Math.min(1.2, Math.asin(y))) };
    }
    const pitch = t.rings ? CLOSE_PITCH_RINGS : CLOSE_PITCH;
    if (!t.toStar) return { yaw: rig.yaw, pitch };
    const [x, , z] = t.toStar;
    const c = Math.cos(CLOSE_TURN), s = Math.sin(CLOSE_TURN);
    return { yaw: Math.atan2(x * c + z * s, -x * s + z * c), pitch };
  }
  if (t.pitch != null && Math.abs(rig.pitch - t.pitch) > 0.35) return { yaw: rig.yaw, pitch: t.pitch };
  return null;
}

// Fly up one level: to the focus's parent, framed (double-click or double-tap
// on empty space, or Esc).
export function upLevel(rig, targets, now) {
  const parent = targets.get(rig.focusId)?.parentId;
  if (parent) focusOn(rig, targets, parent, now);
  return !!parent;
}

// Make `id` the focus and move the target there. With distanceKm (default:
// the object's viewKm) the camera also zooms to that distance, and turns to
// the level's preferred angle; with null it keeps the current distance and
// angle and only slides the target over.
export function focusOn(rig, targets, id, now, distanceKm = targets.get(id).viewKm * (rig.frame ?? 1)) {
  const to = copy(targets.get(id).place);
  const from = copy(rig.target);
  const v = offsetKm(from, to);
  const d0 = rig.distance;
  const d1 = distanceKm;
  let path = null;
  let dur = RECENTRE_MS;
  if (d1 != null) {
    path = zoomPath(d0, d1, Math.hypot(...v));
    path.end = path.at(path.S).u; // the whole journey, to measure progress against
    dur = Math.min(3200, Math.max(600, 500 + 115 * path.S));
  }
  let angles = null;
  if (d1 != null) {
    const want = preferredAngles(rig, targets.get(id), d1);
    if (want) {
      // Turn the short way round.
      const dy = ((((want.yaw - rig.yaw) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
      angles = { yaw0: rig.yaw, yaw1: rig.yaw + dy, pitch0: rig.pitch, pitch1: clamp(want.pitch, -PITCH_LIMIT, PITCH_LIMIT) };
    }
  }
  rig.focusId = id;
  rig.fly = { from, to, v, d0, d1, path, t0: now, dur, angles };
}

// Advance a flight to time `now`. Returns true while something moved.
// The target follows a straight line and the distance the zoom path above,
// at a sine-eased pace: the target never passes the destination and the
// camera never comes closer than the smaller of the start and end distances. Positions are taken
// from the start's anchor for the first half and the destination's for the
// second, so the flight ends exactly on the destination.
export function step(rig, now) {
  const f = rig.fly;
  if (!f) return false;
  const t = Math.min(1, (now - f.t0) / f.dur);
  if (t >= 1) {
    rig.target = copy(f.to);
    if (f.d1 != null) rig.distance = f.d1;
    if (f.angles) { rig.yaw = f.angles.yaw1; rig.pitch = f.angles.pitch1; }
    rig.fly = null;
    return true;
  }
  // Progress along the line (k) and distance: from the zoom path for a
  // flight, an eased slide for a recentring (distance unchanged).
  let s = ease(t);
  let k = s;
  if (f.path) {
    s = easeSine(t);
    const p = f.path.at(s * f.path.S);
    k = f.path.end ? Math.min(1, Math.max(0, p.u / f.path.end)) : s;
    rig.distance = p.w;
  }
  rig.target = k < 0.5
    ? place(f.from.anchor, f.from.offset.map((x, i) => x + f.v[i] * k))
    : place(f.to.anchor, f.to.offset.map((x, i) => x - f.v[i] * (1 - k)));
  if (f.angles) {
    rig.yaw = f.angles.yaw0 + (f.angles.yaw1 - f.angles.yaw0) * s;
    rig.pitch = f.angles.pitch0 + (f.angles.pitch1 - f.angles.pitch0) * s;
  }
  return true;
}
