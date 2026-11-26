// Mouse, touch and keyboard controls for the camera rig, and the per-frame
// camera update. Orbit mode:
//   drag (mouse or one finger)  orbit around the focus
//   wheel or pinch              zoom by a ratio; zooming in over something
//                               inside the focus makes it the focus
//   click or tap                fly to the object under the pointer, or to the
//                               region or body whose name label is under it
//   double-click or double-tap  on empty space, or Esc: fly up one level
//   a fast-spun wheel           zooms faster, up to 3× per notch
// Labels never catch the pointer themselves (a drag, pinch or wheel that starts
// on a label still moves the camera); a click on one is found here instead.
// Free mode (store cameraMode, free.js):
//   drag                        look around
//   W A S D or arrows, Q E      move forward, back, sideways, down, up; Shift faster
//   wheel or pinch              move forward or back
//   click or tap                fly to the object, back in orbit mode
// The scene redraws only when something changes (frameloop "demand").

import { useEffect } from 'react';
import { useMap } from '../../data/store.js';
import { useFrame, useThree } from '@react-three/fiber';
import { view } from './view.js';
import { orbit, zoom, focusOn, upLevel, step, cameraPlace, viewDirection, isDescendant, frameFor, WHEEL_STEP } from './rig.js';
import { pickAt } from './pick.js';
import { toFree, toOrbit, look, move as moveFree, nearest, speedKm, WHEEL_MOVE } from './free.js';

const CLICK_SLOP_PX = 6;
// Free movement keys: [right, up, forward] directions.
const MOVE_KEYS = {
  w: [0, 0, 1], arrowup: [0, 0, 1], s: [0, 0, -1], arrowdown: [0, 0, -1],
  a: [-1, 0, 0], arrowleft: [-1, 0, 0], d: [1, 0, 0], arrowright: [1, 0, 0],
  e: [0, 1, 0], q: [0, -1, 0],
};
let lastFrame = 0;

// Fly to a region, system or body, as a click on it does (labels use this for
// Enter on a focused label). Set while the camera controls are mounted.
export let flyTo = () => {};

// The id of the shown name label under a point on the page, if any.
function labelAt(x, y) {
  for (const el of document.querySelectorAll('[data-region], [data-body]')) {
    if (+el.style.opacity < 0.5) continue;
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return el.dataset.region ?? el.dataset.body;
  }
  return null;
}
const PICK_PX = { mouse: 14, pen: 14, touch: 24 };
const dir = [0, 0, 0];

export default function CameraRig() {
  const { gl, camera, invalidate } = useThree();

  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map();
    let press = null; // a possible click: where it started and whether it moved
    let pinch = 0;
    let lastEmpty = null; // the last click on empty space, for a double click
    let wheelAt = 0, spin = 1; // a fast-spun wheel zooms faster
    const free = () => view.rig.mode === 'free';
    // Leave free mode where the camera is: orbit a point straight ahead, at the
    // distance of the nearest thing, focused on it.
    const backToOrbit = () => {
      if (!free()) return;
      const n = nearest(view.targets, view.rig.eye);
      toOrbit(view.rig, n?.id ?? 'basin', Math.max(n?.centerKm ?? 1, 1));
      useMap.getState().setCameraMode('orbit');
    };

    const local = (e) => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const pick = (x, y, type) => {
      if (!view.rig.camera) return null;
      return pickAt(view.targets, camera, view.rig.camera, x, y, el.clientWidth, el.clientHeight, PICK_PX[type] ?? 14, view.rig.focusId);
    };
    // Fly to `id`; leaves free mode first. A second click on the focused body
    // flies in close, to its globe.
    const fly = (id) => {
      backToOrbit();
      const t = view.targets.get(id);
      const close = id === view.rig.focusId && t.closeKm && view.rig.distance > 1.2 * t.closeKm * (view.rig.frame ?? 1);
      focusOn(view.rig, view.targets, id, performance.now(), close ? t.closeKm * (view.rig.frame ?? 1) : undefined);
      invalidate();
    };
    flyTo = (id) => view.targets.has(id) && fly(id);
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
    // A pointing hand over anything a click would fly to (mouse only).
    let hoverQueued = false, hoverAt = null;
    const hover = () => {
      hoverQueued = false;
      if (!hoverAt || pointers.size) return;
      const [cx, cy, x, y] = hoverAt;
      const label = labelAt(cx, cy);
      const id = label && view.targets.has(label) ? label : pick(x, y, 'mouse');
      el.style.cursor = id ? 'pointer' : '';
    };
    const move = (e) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) {
        if (e.pointerType === 'mouse') {
          hoverAt = [e.clientX, e.clientY, ...local(e)];
          if (!hoverQueued) { hoverQueued = true; requestAnimationFrame(hover); }
        }
        return;
      }
      el.style.cursor = press?.moved ? 'grabbing' : el.style.cursor;
      const p = local(e);
      pointers.set(e.pointerId, p);
      if (pointers.size === 1) {
        if (press && Math.hypot(p[0] - press.start[0], p[1] - press.start[1]) > CLICK_SLOP_PX) press.moved = true;
        if (!press || press.moved) (free() ? look : orbit)(view.rig, p[0] - prev[0], p[1] - prev[1]);
      } else if (pointers.size === 2) {
        const s = spread();
        if (s > 0 && pinch > 0) {
          if (free()) {
            const n = nearest(view.targets, view.rig.eye);
            moveFree(view.rig, view.targets, [0, 0, Math.log(s / pinch) * speedKm(n, false) * 1.5]);
          } else zoom(view.rig, view.targets, pinch / s, performance.now());
        }
        pinch = s;
      }
      invalidate();
    };
    const up = (e) => {
      if (!pointers.has(e.pointerId)) return;
      const p = local(e);
      pointers.delete(e.pointerId);
      if (press && !press.moved && pointers.size === 0 && e.type === 'pointerup') {
        const label = labelAt(e.clientX, e.clientY);
        const id = label && view.targets.has(label) ? label : pick(p[0], p[1], e.pointerType);
        if (id) { fly(id); lastEmpty = null; } else {
          // Two taps on empty space, close in time and place: up one level.
          const now = performance.now();
          if (lastEmpty && now - lastEmpty.t < 400 && Math.hypot(p[0] - lastEmpty.p[0], p[1] - lastEmpty.p[1]) < 30) {
            backToOrbit();
            upLevel(view.rig, view.targets, now);
            lastEmpty = null;
          } else lastEmpty = { t: now, p };
        }
      }
      if (pointers.size < 2) pinch = 0;
      if (pointers.size === 0 || pointers.size === 1) press = null;
      invalidate();
    };
    const wheel = (e) => {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1;
      const notches = (e.deltaY * unit) / 100;
      if (free()) {
        const n = nearest(view.targets, view.rig.eye);
        moveFree(view.rig, view.targets, [0, 0, -notches * WHEEL_MOVE * Math.max(0.01, n ? n.surfaceKm : 1)]);
        invalidate();
        return;
      }
      const now = performance.now();
      // Mouse wheel notches (not a trackpad's many small steps) that come
      // quickly one after another zoom progressively faster, up to 3×.
      spin = Math.abs(e.deltaY * unit) >= 50 && now - wheelAt < 90 ? Math.min(3, spin * 1.25) : 1;
      wheelAt = now;
      const factor = WHEEL_STEP ** (notches * spin);
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

    // Keys held for free movement; F switches between orbit and free.
    const keys = new Set();
    const typing = (e) => e.target.closest?.('input, textarea, [contenteditable]');
    const keyDown = (e) => {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        backToOrbit();
        upLevel(view.rig, view.targets, performance.now());
        invalidate();
        return;
      }
      if (k === 'f' && !e.repeat) {
        const { cameraMode, setCameraMode } = useMap.getState();
        setCameraMode(cameraMode === 'free' ? 'orbit' : 'free');
        return;
      }
      if (free() && MOVE_KEYS[k]) { keys.add(k); e.preventDefault(); invalidate(); }
      if (k === 'shift') keys.add('shift');
    };
    const keyUp = (e) => { keys.delete(e.key.toLowerCase()); };
    const blur = () => keys.clear();
    view.keys = keys;
    addEventListener('keydown', keyDown);
    addEventListener('keyup', keyUp);
    addEventListener('blur', blur);
    // Follow the mode the store asks for (the button, the F key).
    const unsubscribe = useMap.subscribe((st, prev) => {
      if (st.cameraMode === prev.cameraMode || !view.rig) return;
      if (st.cameraMode === 'free' && !free()) toFree(view.rig);
      if (st.cameraMode === 'orbit') backToOrbit();
      invalidate();
    });

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    addEventListener('wheel', wheel, { passive: false }); // anywhere over the map, labels included
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      removeEventListener('wheel', wheel);
      flyTo = () => {};
      removeEventListener('keydown', keyDown);
      removeEventListener('keyup', keyUp);
      removeEventListener('blur', blur);
      unsubscribe();
    };
  }, [gl, camera, invalidate]);

  // Runs before the views place their objects (priority -2, see useAnchored).
  useFrame(({ size }) => {
    const rig = view.rig;
    if (!rig) return;
    rig.frame = frameFor(size.width / size.height);
    const now = performance.now();
    const dt = Math.min(0.1, (now - (lastFrame || now)) / 1000);
    lastFrame = now;
    let moving = step(rig, now);
    if (rig.mode === 'free') {
      // Held keys move the camera, at a speed set by the nearest surface.
      const held = [...(view.keys ?? [])].filter((k) => MOVE_KEYS[k]);
      const n = nearest(view.targets, rig.eye);
      if (held.length) {
        const v = speedKm(n, view.keys.has('shift')) * dt;
        const d = [0, 0, 0];
        for (const k of held) for (let i = 0; i < 3; i++) d[i] += MOVE_KEYS[k][i] * v;
        moveFree(rig, view.targets, d);
        moving = true;
      }
      if (n) rig.focusId = n.id; // labels and levels follow where the camera is
    }
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
