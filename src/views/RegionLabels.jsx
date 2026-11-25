// Region names at the Basin level (task 2.6), as page text over the canvas so
// they stay sharp and readable on a phone. Each label sits just below its
// region's stars, so it doesn't cover them, or else above, right or left.
// Every label that fits is placed by name first, inner regions before frontier
// ones and the crossroads outward; then each gets its subtitle where there
// is still room (not in lanes mode, where the lane labels need the space).
//   RegionLabels         the text, rendered outside the canvas
//   RegionLabelsUpdater  inside the canvas: each frame, moves every label to
//                        its region's center on screen
// A label fades out as the camera comes within a few light-years of its
// region, where the stars themselves take over. Where labels would overlap,
// the one nearer the camera wins. Clicking a label flies to the region.

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useMap, isHidden } from '../data/store.js';
import { displayName } from '../data/names.js';
import { KM_PER_LY, pixelsPerKm } from './origin.js';
import { view } from './camera/view.js';
import { focusOn } from './camera/rig.js';
import { screenPos } from './camera/pick.js';

const FADE_FROM_LY = 6; // fully shown beyond this distance from the camera
const FADE_TO_LY = 3; // gone within this
const PAD = 4; // px kept clear around each label

const els = new Map(); // region id → label element
// Where the region labels are on screen this frame; lane labels keep clear of them.
export const regionLabelBoxes = [];
let redraw = () => {};

function useRegions() {
  const map = useMap((s) => s.map);
  const index = useMap((s) => s.index);
  const playerMode = useMap((s) => s.playerMode);
  return useMemo(() => map.regions.filter((r) => !isHidden(index, r.id, playerMode)), [map, index, playerMode]);
}

export function RegionLabels() {
  const regions = useRegions();
  const fly = (id) => {
    if (!view.rig || !view.targets.has(id)) return;
    focusOn(view.rig, view.targets, id, performance.now());
    redraw();
  };
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {regions.map((r) => (
        <button
          key={r.id}
          data-region={r.id}
          ref={(el) => (el ? els.set(r.id, el) : els.delete(r.id))}
          onClick={() => fly(r.id)}
          style={{
            position: 'absolute', left: 0, top: 0, opacity: 0, pointerEvents: 'none',
            background: 'none', border: 0, padding: '2px 4px', cursor: 'pointer', textAlign: 'center',
            color: '#d8dde6', font: '600 13px/1.2 system-ui, sans-serif', letterSpacing: '0.02em',
            textShadow: '0 0 3px #000, 0 0 6px #000', whiteSpace: 'nowrap', willChange: 'transform, opacity',
          }}
        >
          <span style={{ display: 'block' }}>{displayName(r.name)}</span>
          {r.label && <span style={{ display: 'block', font: '400 11px/1.2 system-ui, sans-serif', color: '#8f98a6' }}>{r.label}</span>}
        </button>
      ))}
    </div>
  );
}

// [full size, name-only size] of a label, measured once.
function measure(el) {
  if (!el._sizes) {
    const name = el.children[0];
    const padX = el.offsetWidth - Math.max(name.offsetWidth, el.children[1]?.offsetWidth ?? 0);
    const padY = el.offsetHeight - name.offsetHeight - (el.children[1]?.offsetHeight ?? 0);
    el._sizes = [[el.offsetWidth, el.offsetHeight], [name.offsetWidth + padX, name.offsetHeight + padY]];
  }
  return el._sizes;
}

export function RegionLabelsUpdater() {
  const regions = useRegions();
  const { camera, size, invalidate } = useThree();
  const lanesMode = useMap((s) => s.lanesMode);
  useEffect(() => {
    redraw = invalidate;
    return () => { redraw = () => {}; };
  }, [invalidate]);

  useFrame(() => {
    const cam = view.rig?.camera;
    if (!cam) return;
    const shown = [];
    const items = [];
    for (const r of regions) {
      const el = els.get(r.id);
      const t = view.targets.get(r.id);
      if (!el || !t) continue;
      const p = screenPos(camera, cam, t.place, size.width, size.height);
      const ly = p ? p[2] / KM_PER_LY : 0;
      const alpha = p ? Math.min(1, Math.max(0, (ly - FADE_TO_LY) / (FADE_FROM_LY - FADE_TO_LY))) : 0;
      const below = p ? Math.min(60, t.radiusKm * pixelsPerKm(p[2], camera.fov, size.height)) + 2 : 0;
      items.push({ el, p, alpha, below, frontier: r.frontier ? 1 : 0, fromCenter: Math.hypot(...r.pos) });
    }
    items.sort((a, b) => a.frontier - b.frontier || a.fromCenter - b.fromCenter);
    // Pass 1: every label as its name alone, in priority order.
    // Pass 2: give each placed label its subtitle where that still fits.
    const boxes = new Map();
    const fits = (box, self) => {
      if (box[2] < 0 || box[0] > size.width || box[3] < 0 || box[1] > size.height) return false;
      for (const [other, o] of boxes) if (other !== self && box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1]) return false;
      return true;
    };
    const spots = (it, [w, h]) => {
      const { p, below: b } = it;
      return [
        [p[0] - w / 2, p[1] + b], // below
        [p[0] - w / 2, p[1] - b - h], // above
        [p[0] + b, p[1] - h / 2], // right
        [p[0] - b - w, p[1] - h / 2], // left
      ].map(([x, y]) => [x - PAD, y - PAD, x + w + PAD, y + h + PAD]);
    };
    for (const it of items) {
      if (it.alpha <= 0) continue;
      const box = spots(it, measure(it.el)[1]).find((b) => fits(b, it));
      if (box) { boxes.set(it, box); it.compact = true; }
    }
    for (const it of items) {
      if (lanesMode || !boxes.has(it) || !it.el.children[1]) continue;
      const box = spots(it, measure(it.el)[0]).find((b) => fits(b, it));
      if (box) { boxes.set(it, box); it.compact = false; }
    }
    regionLabelBoxes.length = 0;
    for (const b of boxes.values()) regionLabelBoxes.push(b);
    for (const it of items) {
      const { el } = it;
      const box = boxes.get(it);
      const alpha = box ? it.alpha : 0;
      if (box) {
        el.style.transform = `translate(${Math.round(box[0] + PAD)}px, ${Math.round(box[1] + PAD)}px)`;
        if (el.children[1]) el.children[1].style.display = it.compact ? 'none' : 'block';
      }
      el.style.opacity = alpha.toFixed(2);
      el.style.pointerEvents = alpha > 0.5 ? 'auto' : 'none';
    }
  });
  return null;
}
