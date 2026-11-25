// Mouse and touch controls for the camera rig, and the per-frame camera update.
//   drag (mouse or one finger)  orbit around the focus
//   wheel or pinch              zoom by a ratio; zooming in over something
//                               inside the focus makes it the focus
//   click or tap                fly to the object under the pointer
// The scene redraws only when something changes (frameloop "demand").

import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { view } from './view.js';
import { orbit, zoom, focusOn, step, cameraPlace, viewDirection, isDescendant, frameFor, WHEEL_STEP } from './rig.js';
import { pickAt } from './pick.js';

const CLICK_SLOP_PX = 6;
const PICK_PX = { mouse: 14, pen: 14, touch: 24 };
const dir = [0, 0, 0];

export default function CameraRig() {
  const { gl, camera, invalidate } = useThree();

  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map();
    let press = null; // a possible click: where it started and whether it moved
    let pinch = 0;

    const local = (e) => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const pick = (x, y, type) => {
      if (!view.rig.camera) return null;
      return pickAt(view.targets, camera, view.rig.camera, x, y, el.clientWidth, el.clientHeight, PICK_PX[type] ?? 14, view.rig.focusId);
    };
    const spread = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a[0] - b[0], a[1] - b[1]);
    };

    const down = (e) => {
      el.setPointerCapture(e.pointerId);
      const p = local(e);
      pointers.set(e.pointerId, p);
      press = pointers.size === 1 ? { start: p, moved: false } : null;
      if (pointers.size === 2) pinch = spread();
    };
    const move = (e) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const p = local(e);
      pointers.set(e.pointerId, p);
      if (pointers.size === 1) {
        if (press && Math.hypot(p[0] - press.start[0], p[1] - press.start[1]) > CLICK_SLOP_PX) press.moved = true;
        if (!press || press.moved) orbit(view.rig, p[0] - prev[0], p[1] - prev[1]);
      } else if (pointers.size === 2) {
        const s = spread();
        if (s > 0 && pinch > 0) zoom(view.rig, view.targets, pinch / s, performance.now());
        pinch = s;
      }
      invalidate();
    };
    const up = (e) => {
      if (!pointers.has(e.pointerId)) return;
      const p = local(e);
      pointers.delete(e.pointerId);
      if (press && !press.moved && pointers.size === 0 && e.type === 'pointerup') {
        const id = pick(p[0], p[1], e.pointerType);
        if (id) focusOn(view.rig, view.targets, id, performance.now());
      }
      if (pointers.size < 2) pinch = 0;
      if (pointers.size === 0 || pointers.size === 1) press = null;
      invalidate();
    };
    const wheel = (e) => {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1;
      const factor = WHEEL_STEP ** ((e.deltaY * unit) / 100);
      const now = performance.now();
      if (factor < 1) {
        const [x, y] = local(e);
        const id = pick(x, y, 'mouse');
        if (id && id !== view.rig.focusId && isDescendant(view.targets, id, view.rig.focusId)) {
          focusOn(view.rig, view.targets, id, now, null);
        }
      }
      zoom(view.rig, view.targets, factor, now);
      invalidate();
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [gl, camera, invalidate]);

  // Runs before the views place their objects (priority -2, see useAnchored).
  useFrame(({ size }) => {
    const rig = view.rig;
    if (!rig) return;
    rig.frame = frameFor(size.width / size.height);
    const moving = step(rig, performance.now());
    rig.camera = cameraPlace(rig);
    viewDirection(rig, dir);
    camera.position.set(0, 0, 0);
    camera.up.set(0, 1, 0);
    camera.lookAt(-dir[0], -dir[1], -dir[2]);
    camera.updateMatrixWorld();
    if (moving) invalidate();
  }, -2);

  return null;
}
