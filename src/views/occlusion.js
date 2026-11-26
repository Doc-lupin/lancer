// Names of things hidden behind a planet's globe are hidden too (a far
// region's name used to show on top of the planet in front of it).
// Planet.jsx lists the globes drawn this frame, camera-relative; the label
// layers use visiblePos() in place of screenPos().

import { offsetKm } from './origin.js';
import { screenPos } from './camera/pick.js';

// { c: [x, y, z] km from the camera, r: radius km }, refilled every frame.
export const globes = [];

const rel = [0, 0, 0];
// Whether a point (camera-relative km) is behind one of the globes. A point
// on or just above a globe (its own name, its places) doesn't count.
export function behindGlobe(p) {
  const len = Math.hypot(...p);
  if (!len) return false;
  for (const { c, r } of globes) {
    const dx = p[0] - c[0], dy = p[1] - c[1], dz = p[2] - c[2];
    if (dx * dx + dy * dy + dz * dz < (1.1 * r) ** 2) continue;
    const t = (c[0] * p[0] + c[1] * p[1] + c[2] * p[2]) / len; // along the line of sight
    if (t <= 0 || t > len) continue;
    const ex = c[0] - (p[0] * t) / len, ey = c[1] - (p[1] * t) / len, ez = c[2] - (p[2] * t) / len;
    if (ex * ex + ey * ey + ez * ez < r * r) return true;
  }
  return false;
}

// screenPos, or null when the place is behind a globe.
export function visiblePos(camera, cam, place, width, height) {
  if (globes.length && behindGlobe(offsetKm(cam, place, rel))) return null;
  return screenPos(camera, cam, place, width, height);
}
