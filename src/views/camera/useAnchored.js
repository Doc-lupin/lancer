// Places an object relative to the camera every frame (floating origin, P3)
// and keeps it at least minPx wide on screen (P5).

import { useFrame } from '@react-three/fiber';
import { offsetKm, pixelsPerKm } from '../origin.js';
import { view } from './view.js';

export function useAnchored(ref, place, { radiusKm = 0, minPx = 0 } = {}) {
  useFrame(({ camera, size }) => {
    const obj = ref.current;
    if (!obj || !view.rig?.camera) return;
    const rel = offsetKm(view.rig.camera, place, obj.userData.rel ?? (obj.userData.rel = [0, 0, 0]));
    obj.position.set(rel[0], rel[1], rel[2]);
    if (minPx && radiusKm) {
      const px = 2 * radiusKm * pixelsPerKm(Math.hypot(...rel), camera.fov, size.height);
      obj.scale.setScalar(Math.max(1, minPx / px));
    }
  }, -1);
}
