// Free movement for the camera (task 2.11, at the GM's request), beside the
// orbiting of rig.js. In free mode the camera has its own place, `rig.eye`,
// and looks along −viewDirection(rig), as it does when orbiting, so switching
// either way keeps the camera exactly where it is and where it looks.
//   look       drag: the view turns with the finger (drag right, the scene
//              moves right)
//   move       keys, wheel or pinch: along the view, sideways and up/down
//   speed      in units of the distance to the nearest object's surface, so
//              the same keys cross light-years in the Basin and metres
//              beside a station
// Plain functions on the rig, testable without a browser.

import { place, offsetKm, reanchor } from '../origin.js';
import { viewDirection, cameraPlace } from './rig.js';

export const LOOK_RAD_PER_PX = 0.004;
export const FREE_SPEED = 0.8; // nearest-surface distances per second
export const FAST = 5; // with Shift
export const WHEEL_MOVE = 0.15; // nearest-surface distances per wheel notch
export const KEEP_OUT = 1.2; // the camera stays this many radii from a body's center
const PITCH_LIMIT = 1.5;
const REANCHOR_KM = 1e10; // move the eye's anchor when its offset grows past this

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function toFree(rig) {
  rig.eye = cameraPlace(rig);
  rig.mode = 'free';
  rig.fly = null;
}

// Back to orbiting a point straight ahead, `pivotKm` away: nothing moves.
export function toOrbit(rig, focusId, pivotKm) {
  const d = viewDirection(rig);
  rig.target = place(rig.eye.anchor, rig.eye.offset.map((v, i) => v - d[i] * pivotKm));
  rig.distance = pivotKm;
  rig.focusId = focusId;
  rig.mode = 'orbit';
  rig.eye = null;
}

export function look(rig, dxPx, dyPx) {
  rig.yaw += dxPx * LOOK_RAD_PER_PX;
  rig.pitch = clamp(rig.pitch - dyPx * LOOK_RAD_PER_PX, -PITCH_LIMIT, PITCH_LIMIT);
}

// The camera's own axes: forward (where it looks), right and up.
export function axes(rig) {
  const d = viewDirection(rig);
  const f = [-d[0], -d[1], -d[2]];
  const r = [-f[2], 0, f[0]]; // f × world up (0, 1, 0)
  const l = Math.hypot(...r) || 1;
  for (let i = 0; i < 3; i++) r[i] /= l;
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  return { f, r, u };
}

// The nearest solid thing (a system's center or a body) to the eye:
// { id, surfaceKm, centerKm, t }.
export function nearest(targets, eye) {
  let best = null;
  const rel = [0, 0, 0];
  for (const [id, t] of targets) {
    if (!t.solid) continue;
    offsetKm(eye, t.place, rel);
    const c = Math.hypot(...rel);
    const s = c - t.radiusKm;
    if (!best || s < best.surfaceKm) best = { id, surfaceKm: s, centerKm: c, t };
  }
  return best;
}

// Move by [right, up, forward] in km, stopping at the edge of the nearest
// body rather than passing through it, and keep the eye's offset small.
export function move(rig, targets, [right, up, forward]) {
  const { f, r, u } = axes(rig);
  const step = [0, 1, 2].map((i) => r[i] * right + u[i] * up + f[i] * forward);
  const before = nearest(targets, rig.eye);
  if (before) {
    // Where the path first meets the body's keep-out sphere, if it does.
    const c = offsetKm(rig.eye, before.t.place);
    const R = KEEP_OUT * before.t.radiusKm;
    const a = step[0] ** 2 + step[1] ** 2 + step[2] ** 2;
    const b = -2 * (step[0] * c[0] + step[1] * c[1] + step[2] * c[2]);
    const k = c[0] ** 2 + c[1] ** 2 + c[2] ** 2 - R * R;
    const disc = b * b - 4 * a * k;
    if (a > 0 && k > 0 && disc >= 0) {
      const t = (-b - Math.sqrt(disc)) / (2 * a);
      if (t >= 0 && t < 1) for (let i = 0; i < 3; i++) step[i] *= t;
    }
  }
  rig.eye = place(rig.eye.anchor, rig.eye.offset.map((v, i) => v + step[i]));
  const n = nearest(targets, rig.eye);
  if (n && n.centerKm < KEEP_OUT * n.t.radiusKm) {
    const away = offsetKm(n.t.place, rig.eye);
    const k = (KEEP_OUT * n.t.radiusKm) / (Math.hypot(...away) || 1);
    rig.eye = place(n.t.place.anchor, n.t.place.offset.map((v, i) => v + away[i] * k));
  }
  if (n && Math.hypot(...rig.eye.offset) > REANCHOR_KM) rig.eye = reanchor(rig.eye, n.t.place.anchor);
  return n;
}

// How far to go per second, by the distance to the nearest surface.
export const speedKm = (n, fast) => FREE_SPEED * Math.max(0.01, n ? n.surfaceKm : 1) * (fast ? FAST : 1);
