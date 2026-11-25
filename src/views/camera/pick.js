// Picking by screen distance, not by hitting the mesh, so small things are
// easy to tap on a phone. A child that sits on top of its parent on screen
// (a planet beside its star seen from light-years away) can't be picked; the
// parent is picked instead until the two come apart.

import * as THREE from 'three';
import { offsetKm, pixelsPerKm } from '../origin.js';

const v = new THREE.Vector3();
const rel = [0, 0, 0];

// Screen position in CSS pixels, or null when behind the camera.
export function screenPos(camera, cameraPlace, p, width, height) {
  offsetKm(cameraPlace, p, rel);
  v.set(rel[0], rel[1], rel[2]).applyMatrix4(camera.matrixWorldInverse);
  if (v.z >= 0) return null;
  v.applyMatrix4(camera.projectionMatrix);
  return [((v.x + 1) / 2) * width, ((1 - v.y) / 2) * height, Math.hypot(...rel)];
}

export function pickAt(targets, camera, cameraPlace, x, y, width, height, radiusPx) {
  const pos = new Map();
  for (const [id, t] of targets) if (t.pickable !== false) pos.set(id, screenPos(camera, cameraPlace, t.place, width, height));
  let best = null;
  let bestD = Infinity;
  for (const [id, p] of pos) {
    if (!p) continue;
    const t = targets.get(id);
    const ownPx = t.radiusKm * pixelsPerKm(p[2], camera.fov, height);
    const d = Math.hypot(p[0] - x, p[1] - y);
    if (d > Math.max(radiusPx, ownPx)) continue;
    const pp = pos.get(t.parentId);
    if (pp && Math.hypot(p[0] - pp[0], p[1] - pp[1]) < 2 * radiusPx) continue;
    if (d < bestD) { best = id; bestD = d; }
  }
  return best;
}
