// Names at the system level (task 2.9): the system the camera is in (worked
// out from the focus) gets its own name at the center and a name beside each
// body that is showing. Page text over the canvas, like the region labels.
// Each label goes right of its body, or left, below or above, never over
// another label or another body's dot (which would catch a tap meant for that
// body; only the system's own name may, when no clear spot is left beside
// its star); where none fits, it waits. Priority: the system, planets and giants, companion stars,
// structures and wrecks; then lane mouths; then moons and stations; then
// fields and asteroids. Clicking a label flies to the body.
//   BodyLabels         the text, outside the canvas
//   BodyLabelsUpdater  inside the canvas: finds the system and places labels

import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useMap, isHidden } from '../data/store.js';
import { displayName } from '../data/names.js';
import { pixelsPerKm } from './origin.js';
import { view } from './camera/view.js';
import { focusOn } from './camera/rig.js';
import { screenPos } from './camera/pick.js';
import { bodyAlpha } from './System.jsx';
import { regionLabelBoxes } from './RegionLabels.jsx';

const PRIORITY = { planet: 1, 'gas-giant': 1, star: 1, structure: 1, wreck: 1, 'rogue-planet': 1, 'lane-mouth': 2, moon: 3, station: 3, field: 4, asteroid: 4 };
const COLOR = { 'lane-mouth': '#9ad8e8', station: '#b9c0cc', moon: '#c3c7cf', field: '#a9c4e6' };
const PAD = 3;
const CLEAR = 6; // px kept clear around a body's dot, so a label's shadow doesn't dim it
const els = new Map();
let setSystemId = () => {};
let redraw = () => {};

// The system containing the camera's focus, if the focus is a system or inside one.
function systemOf(id) {
  const { index } = useMap.getState();
  for (let t = id; t; t = view.targets.get(t)?.parentId) if (index.kindOf.get(t) === 'systems') return t;
  return null;
}

export function BodyLabels() {
  const [systemId, setSystem] = useState(null);
  const map = useMap((s) => s.map);
  const index = useMap((s) => s.index);
  const playerMode = useMap((s) => s.playerMode);
  useEffect(() => { setSystemId = setSystem; return () => { setSystemId = () => {}; }; }, []);
  if (!systemId) return null;
  const system = index.byId.get(systemId);
  const items = [
    { id: systemId, name: displayName(system.name), type: 'system' },
    ...map.bodies
      .filter((b) => b.system === systemId && PRIORITY[b.type] && view.targets.has(b.id) && !isHidden(index, b.id, playerMode))
      .map((b) => ({ id: b.id, name: displayName(b.name), type: b.type })),
  ];
  const fly = (id) => { focusOn(view.rig, view.targets, id, performance.now()); redraw(); };
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {items.map((it) => (
        <button
          key={it.id}
          data-body={it.id}
          data-kind={it.type}
          ref={(el) => (el ? els.set(it.id, el) : els.delete(it.id))}
          onClick={() => fly(it.id)}
          style={{
            position: 'absolute', left: 0, top: 0, opacity: 0, pointerEvents: 'none', background: 'none', border: 0,
            padding: '1px 3px', cursor: 'pointer', whiteSpace: 'nowrap', color: COLOR[it.type] ?? '#e4e8ef',
            font: `${it.type === 'system' ? 600 : 500} ${it.type === 'system' ? 14 : 12}px/1.2 system-ui, sans-serif`,
            textShadow: '0 0 2px #000, 0 0 4px #000', willChange: 'transform, opacity',
          }}
        >
          {it.name}
        </button>
      ))}
    </div>
  );
}

export function BodyLabelsUpdater() {
  const { camera, size, invalidate } = useThree();
  const current = useRef(null);
  useEffect(() => { redraw = invalidate; return () => { redraw = () => {}; }; }, [invalidate]);

  useFrame(() => {
    const rig = view.rig;
    if (!rig?.camera) return;
    const sys = systemOf(rig.focusId);
    if (sys !== current.current) { current.current = sys; setSystemId(sys); }
    if (!sys) return;
    const items = [];
    for (const [id, el] of els) {
      const t = view.targets.get(id);
      if (!t) continue;
      const kind = el.dataset.kind;
      const alpha = kind === 'system' || kind === 'star' ? 1 : bodyAlpha.get(id) ?? 0;
      const p = alpha > 0.5 ? screenPos(camera, rig.camera, t.place, size.width, size.height) : null;
      const r = p ? Math.max(3, t.radiusKm * pixelsPerKm(p[2], camera.fov, size.height)) : 0;
      items.push({ el, p, r, rank: kind === 'system' ? 0 : PRIORITY[kind] ?? 5 });
    }
    items.sort((a, b) => a.rank - b.rank || (a.p?.[2] ?? Infinity) - (b.p?.[2] ?? Infinity));
    const taken = [...regionLabelBoxes];
    const dots = items.filter((it) => it.p).map((it) => ({ it, box: [it.p[0] - it.r - CLEAR, it.p[1] - it.r - CLEAR, it.p[0] + it.r + CLEAR, it.p[1] + it.r + CLEAR] }));
    const overlaps = (b, o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1];
    for (const item of items) {
      const { el, p, r } = item;
      let box = null;
      if (p) {
        const w = el.offsetWidth, h = el.offsetHeight, g = r + CLEAR;
        const spots = [
          [p[0] + g, p[1] - h / 2], [p[0] - g - w, p[1] - h / 2], [p[0] - w / 2, p[1] + g], [p[0] - w / 2, p[1] - g - h],
        ].map(([x, y]) => [x - PAD, y - PAD, x + w + PAD, y + h + PAD])
          .filter((b) => b[0] > 0 && b[2] < size.width && b[1] > 0 && b[3] < size.height && !taken.some((o) => overlaps(b, o)));
        const clear = (b) => !dots.some((d) => d.it !== item && overlaps(b, d.box));
        box = spots.find(clear) ?? (item.rank === 0 ? spots[0] : null) ?? null;
      }
      if (box) {
        taken.push(box);
        el.style.transform = `translate(${Math.round(box[0] + PAD)}px, ${Math.round(box[1] + PAD)}px)`;
      }
      el.style.opacity = box ? '1' : '0';
      el.style.pointerEvents = box ? 'auto' : 'none';
    }
  });
  return null;
}
