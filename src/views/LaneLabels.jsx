// Lane labels for lanes mode (task 2.7): the lane's proper name if it has one,
// its days, and anything unusual (one-way, drifting, silent, the tide). Page
// text over the canvas, like the region labels, at the middle of each lane on
// screen, or else at a point further along it, clear of the region labels and
// of each other. Every lane that fits gets its short form first ("5 d"),
// nearer lanes first; then each grows to the full text where there is room.
//   LaneLabels         the text, outside the canvas
//   LaneLabelsUpdater  inside the canvas: moves the labels each frame

import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useMap, isHidden } from '../data/store.js';
import { laneEnds, laneLabel, laneDaysShort } from '../data/lanes.js';
import { place } from './origin.js';
import { view } from './camera/view.js';
import { screenPos } from './camera/pick.js';
import { regionLabelBoxes } from './RegionLabels.jsx';

const PAD = 3;
const ALONG = [0.5, 0.38, 0.62, 0.27, 0.73]; // where along the lane to try, in order
const els = new Map(); // lane id → element

function useLanes() {
  const map = useMap((s) => s.map);
  const index = useMap((s) => s.index);
  const playerMode = useMap((s) => s.playerMode);
  return useMemo(() => map.lanes
    .filter((l) => !isHidden(index, l.id, playerMode))
    .map((l) => {
      const [a, b] = laneEnds(l, index);
      return { lane: l, spots: ALONG.map((t) => place(a.map((v, i) => v + (b[i] - v) * t))), text: laneLabel(l, map.clock), short: laneDaysShort(l) };
    }), [map, index, playerMode]);
}

export function LaneLabels() {
  const lanes = useLanes();
  const lanesMode = useMap((s) => s.lanesMode);
  if (!lanesMode) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {lanes.map(({ lane, text, short }) => (
        <div
          key={lane.id}
          data-lane={lane.id}
          ref={(el) => (el ? els.set(lane.id, el) : els.delete(lane.id))}
          style={{
            position: 'absolute', left: 0, top: 0, opacity: 0, padding: '1px 5px', borderRadius: 4,
            background: 'rgba(6, 10, 16, 0.72)', color: '#cfe8e4', textAlign: 'center', whiteSpace: 'nowrap',
            font: '500 12px/1.25 system-ui, sans-serif', willChange: 'transform, opacity',
          }}
        >
          <div data-short>{short}</div>
          <div data-full style={{ display: 'none' }}>
            {text.map((line, i) => <div key={i} style={i === text.length - 1 && text.length > 1 ? { color: '#9fb8b4', fontWeight: 400 } : undefined}>{line}</div>)}
          </div>
        </div>
      ))}
    </div>
  );
}

// [short size, full size] of a label, measured once.
function measure(el) {
  if (!el._sizes) {
    const [short, full] = el.children;
    const sizeWith = (shortShown) => {
      short.style.display = shortShown ? 'block' : 'none';
      full.style.display = shortShown ? 'none' : 'block';
      return [el.offsetWidth, el.offsetHeight];
    };
    el._sizes = [sizeWith(true), sizeWith(false)];
  }
  return el._sizes;
}

export function LaneLabelsUpdater() {
  const lanes = useLanes();
  const lanesMode = useMap((s) => s.lanesMode);
  const { camera, size } = useThree();

  useFrame(() => {
    const cam = view.rig?.camera;
    if (!cam || !lanesMode) return;
    const items = [];
    for (const it of lanes) {
      const el = els.get(it.lane.id);
      if (!el) continue;
      const ps = it.spots.map((sp) => screenPos(camera, cam, sp, size.width, size.height));
      items.push({ el, ps, depth: ps[0]?.[2] ?? Infinity });
    }
    items.sort((a, b) => a.depth - b.depth);
    const taken = new Map(); // item → box
    const others = (self) => [...regionLabelBoxes, ...[...taken].filter(([k]) => k !== self).map(([, b]) => b)];
    const findSpot = (it, [w, h]) => {
      const blocked = others(it);
      for (const p of it.ps) {
        if (!p) continue;
        const box = [p[0] - w / 2 - PAD, p[1] - h / 2 - PAD, p[0] + w / 2 + PAD, p[1] + h / 2 + PAD];
        const onScreen = box[0] > 0 && box[2] < size.width && box[1] > 0 && box[3] < size.height;
        if (onScreen && !blocked.some((o) => box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1])) return box;
      }
      return null;
    };
    for (const it of items) {
      const box = findSpot(it, measure(it.el)[0]);
      if (box) { taken.set(it, box); it.full = false; }
    }
    for (const it of items) {
      if (!taken.has(it)) continue;
      const box = findSpot(it, measure(it.el)[1]);
      if (box) { taken.set(it, box); it.full = true; }
    }
    for (const it of items) {
      const box = taken.get(it);
      const { el } = it;
      if (box) {
        el.style.transform = `translate(${Math.round(box[0] + PAD)}px, ${Math.round(box[1] + PAD)}px)`;
        el.children[0].style.display = it.full ? 'none' : 'block';
        el.children[1].style.display = it.full ? 'block' : 'none';
      }
      el.style.opacity = box ? '1' : '0';
    }
  });
  return null;
}
