// Lanes (task 2.7): faded by default, bright in lanes mode. Drifting lanes are
// broken into dashes; one-way lanes carry chevrons pointing the way of travel;
// tidal lanes are bright while the tide is open and dim while it is closed
// (decision P12), taken from the clock's current date; the Silent Mouths,
// whose tide is unknown, stay dim.
//
// Each lane is drawn as pieces (one, or a dash each), and each piece as a
// strip of constant width in screen pixels. The shaders work out everything in
// screen pixels from values that are the same at every corner of a piece, as
// the star glow does (task 2.6), because values that vary across a shape fail
// at light-year distances. Lanes are drawn first and without depth testing, so
// stars and bodies always sit on top of them.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useMap, isHidden } from '../data/store.js';
import { displayColor } from './color.js';
import { laneEndPlaces, tideState } from '../data/lanes.js';
import { offsetKm } from './origin.js';
import { common, stripVertex, stripFragment, screenMaterial as material, quadGeometry, clipToView } from './strip.js';
import { view } from './camera/view.js';
import { screenPos } from './camera/pick.js';

const DASHES = 18; // pieces along a drifting lane
const DASH_FILL = 0.55;
const MARKS_AT = [0.3, 0.5, 0.7]; // chevrons along a one-way lane
const MARK_SPACING = 5; // below this many chevron widths apart on screen, only the middle one shows

// Color, opacity and width (CSS px) of a lane.
export function laneStyle(lane, tide, lanesMode) {
  let color = '#9fb3d1';
  let alpha = lanesMode ? 0.85 : 0.2;
  if (lane.silent) color = '#a993e0';
  if (tide) {
    if (tide.open) { color = '#79e3d2'; alpha = lanesMode ? 1 : 0.4; }
    else alpha = lanesMode ? 0.3 : 0.08;
  }
  return { color, alpha, width: lanesMode ? 2 : 1.25 };
}

const markVertex = /* glsl */ `
${common}
attribute vec3 aAt;
attribute vec3 aAhead;
attribute vec4 aColor;
attribute float aSize;
flat varying vec2 vCenter;
flat varying vec2 vDir;
flat varying vec4 vColor;
flat varying float vSize;
void main() {
  vec4 a = modelViewMatrix * vec4(aAt, 1.0);
  vec4 b = modelViewMatrix * vec4(aAhead, 1.0);
  if (a.z > -uNear || b.z > -uNear) { gl_Position = offScreen(); return; }
  vec2 sa = toScreen(a), sb = toScreen(b);
  vec2 dir = sb - sa;
  float len = length(dir);
  vDir = len > 1e-3 ? dir / len : vec2(1.0, 0.0);
  vCenter = sa; vColor = aColor;
  vSize = aSize * uPixelRatio;
  vec2 s = sa + position.xy * vSize;
  gl_Position = vec4(s / uViewport * 2.0 - 1.0, 0.0, 1.0);
}`;

// A ">" shape: two strokes meeting at the front, pointing along vDir.
const markFragment = /* glsl */ `
uniform float uPixelRatio;
flat varying vec2 vCenter;
flat varying vec2 vDir;
flat varying vec4 vColor;
flat varying float vSize;
float seg(vec2 p, vec2 a, vec2 b) { vec2 ab = b - a; float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0); return length(p - a - ab * t); }
void main() {
  vec2 d = gl_FragCoord.xy - vCenter;
  vec2 q = vec2(dot(d, vDir), dot(d, vec2(-vDir.y, vDir.x))) / vSize;
  vec2 tip = vec2(0.22, 0.0);
  float dist = min(seg(q, vec2(-0.2, -0.3), tip), seg(q, vec2(-0.2, 0.3), tip)) * vSize;
  float hw = 0.9 * uPixelRatio;
  float a = vColor.a * (1.0 - smoothstep(hw - 0.6, hw + 0.6, dist));
  if (a <= 0.003) discard;
  gl_FragColor = vec4(vColor.rgb * a, a);
}`;

export default function Lanes() {
  const map = useMap((s) => s.map);
  const index = useMap((s) => s.index);
  const playerMode = useMap((s) => s.playerMode);
  const lanes = useMap((s) => s.lanes);
  const lanesMode = lanes === 'bright';
  const invalidate = useThree((s) => s.invalidate);
  const strips = useRef();
  const marks = useRef();

  // Pieces and marks; only colors change with lanes mode.
  const { pieces, chevrons } = useMemo(() => {
    const pieces = [];
    const chevrons = [];
    for (const lane of map.lanes) {
      if (isHidden(index, lane.id, playerMode)) continue;
      const [a, b] = laneEndPlaces(lane, index, map.clock);
      const tide = tideState(lane, map.clock);
      const spans = lane.drifting
        ? Array.from({ length: DASHES }, (_, i) => [i / DASHES, (i + DASH_FILL) / DASHES])
        : [[0, 1]];
      for (const [t0, t1] of spans) pieces.push({ lane, tide, a, b, t0, t1 });
      if (lane.oneWay) for (const t of MARKS_AT) chevrons.push({ lane, tide, a, b, t });
    }
    return { pieces, chevrons };
  }, [map, index, playerMode]);

  const { stripGeometry, markGeometry, stripMaterial, markMaterial } = useMemo(() => ({
    stripGeometry: quadGeometry([[0, -1, 0], [0, 1, 0], [1, -1, 0], [1, 1, 0]], pieces.length,
      [['aStart', 3], ['aEnd', 3], ['aColor', 4], ['aWidth', 1]]),
    markGeometry: quadGeometry([[-0.5, -0.5, 0], [-0.5, 0.5, 0], [0.5, -0.5, 0], [0.5, 0.5, 0]], chevrons.length,
      [['aAt', 3], ['aAhead', 3], ['aColor', 4], ['aSize', 1]]),
    stripMaterial: material(stripVertex, stripFragment),
    markMaterial: material(markVertex, markFragment),
  }), [pieces, chevrons]);

  // Colors and widths, whenever lanes mode changes.
  useEffect(() => {
    const c = new THREE.Color();
    const fill = (geometry, items, sizeAttr, sizeOf) => {
      const color = geometry.attributes.aColor;
      const size = geometry.attributes[sizeAttr];
      items.forEach((it, i) => {
        const st = laneStyle(it.lane, it.tide, lanesMode);
        displayColor(st.color, c);
        color.setXYZW(i, c.r, c.g, c.b, st.alpha);
        size.setX(i, sizeOf(st));
      });
      color.needsUpdate = true;
      size.needsUpdate = true;
    };
    fill(stripGeometry, pieces, 'aWidth', (st) => st.width);
    fill(markGeometry, chevrons, 'aSize', (st) => (lanesMode ? 12 : 9) + st.width);
    chevrons.forEach((it, i) => { it.size = markGeometry.attributes.aSize.getX(i); });
    invalidate();
    for (const m of [strips.current, marks.current]) if (m) m.visible = lanes !== 'off';
  }, [lanes, lanesMode, pieces, chevrons, stripGeometry, markGeometry, invalidate]);

  const ra = useMemo(() => [0, 0, 0], []);
  const rb = useMemo(() => [0, 0, 0], []);
  useFrame(({ camera, size, viewport }) => {
    const cam = view.rig?.camera;
    if (!cam || useMap.getState().lanes === 'off') return;
    for (const m of [stripMaterial, markMaterial]) {
      m.uniforms.uViewport.value.set(size.width * viewport.dpr, size.height * viewport.dpr);
      m.uniforms.uPixelRatio.value = viewport.dpr;
    }
    const at = (it, t, attr, i) => attr.setXYZ(i, ra[0] + (rb[0] - ra[0]) * t, ra[1] + (rb[1] - ra[1]) * t, ra[2] + (rb[2] - ra[2]) * t);
    const { aStart, aEnd } = stripGeometry.attributes;
    const lerp = (t) => [ra[0] + (rb[0] - ra[0]) * t, ra[1] + (rb[1] - ra[1]) * t, ra[2] + (rb[2] - ra[2]) * t];
    pieces.forEach((it, i) => {
      offsetKm(cam, it.a, ra);
      offsetKm(cam, it.b, rb);
      const A = lerp(it.t0), B = lerp(it.t1);
      if (!clipToView(camera, size.width / size.height, A, B)) A.fill(0), B.fill(0); // nothing on screen
      aStart.setXYZ(i, ...A);
      aEnd.setXYZ(i, ...B);
    });
    const { aAt, aAhead, aSize } = markGeometry.attributes;
    const screenLength = new Map();
    chevrons.forEach((it, i) => {
      offsetKm(cam, it.a, ra);
      offsetKm(cam, it.b, rb);
      at(it, it.t, aAt, i);
      at(it, it.t + 0.01, aAhead, i);
      if (!screenLength.has(it.lane)) {
        const pa = screenPos(camera, cam, it.a, size.width, size.height);
        const pb = screenPos(camera, cam, it.b, size.width, size.height);
        screenLength.set(it.lane, pa && pb ? Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) : Infinity);
      }
      const crowded = screenLength.get(it.lane) * 0.2 < MARK_SPACING * it.size;
      aSize.setX(i, crowded && it.t !== 0.5 ? 0 : it.size);
    });
    for (const a of [aStart, aEnd, aAt, aAhead, aSize]) a.needsUpdate = true;
  }, -1);

  return (
    <>
      <mesh ref={strips} geometry={stripGeometry} material={stripMaterial} frustumCulled={false} renderOrder={-1} userData={{ layer: 'lanes' }} />
      <mesh ref={marks} geometry={markGeometry} material={markMaterial} frustumCulled={false} renderOrder={-1} userData={{ layer: 'lanes' }} />
    </>
  );
}
