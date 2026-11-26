// Surface places (task 2.10): a marker for each place on a globe that is
// showing (Planet.jsx), and a line along the surface for fronts that have a
// path (the Seam on Scald). Places on stations, which have no globe, wait for
// the data panel (Phase 3).
//   markers  one instanced draw call; color by kind (towns warm white, bases
//            and fronts red, mines and refineries amber, Absent structures,
//            ruins and sites cyan, landings pale)
//   fronts   strips along the surface (strip.js)
// A marker shows only while its spot faces the camera, worked out here, so
// the globe hides the far side without depth tricks; markers and fronts fade
// in with the globe.
//   PlaceLabels / PlaceLabelsUpdater: names for the places on the largest
//   globe once it is at least LABEL_GLOBE_PX across on screen.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useMap, isHidden } from '../data/store.js';
import { displayName } from '../data/names.js';
import { surfaceOffsetKm } from '../data/globe.js';
import { offsetKm, pixelsPerKm } from './origin.js';
import { view } from './camera/view.js';
import { screenPos } from './camera/pick.js';
import { GLOBE_TYPES } from './mapTargets.js';
import { globeInfo, globeBlend } from './Planet.jsx';
import { spriteVertex, spriteFragmentHead, spriteUniforms, spriteGeometry, updateViewport } from './sprite.js';
import { stripVertex, stripFragment, screenMaterial, quadGeometry, clipToView, STRIP_CORNERS, STRIP_ATTRS } from './strip.js';
import { displayColor } from './color.js';
import { regionLabelBoxes } from './RegionLabels.jsx';
import { FADE, spotOrder, wasShown, settle } from './labelPlace.js';

const KIND_COLOR = {
  city: '#ffe6b0', town: '#ffe6b0', settlement: '#ffe6b0', port: '#ffe6b0',
  base: '#ff7a5c', camp: '#ff7a5c', front: '#ff5a48', battlefield: '#ff5a48',
  mine: '#ffb84d', refinery: '#ffb84d',
  structure: '#79d8e8', ruin: '#79d8e8', site: '#79d8e8',
  landing: '#d8dde6', other: '#d8dde6',
};
const MARKER_PX = 8;
const LIFT = 0.002; // markers sit just above the ground
const PATH_STEPS = 12; // pieces between two points of a front's path
const LABEL_GLOBE_PX = 160; // diameter on screen before place names show

const markerFragment = /* glsl */ `
${spriteFragmentHead}
void main() {
  #include <logdepthbuf_fragment>
  float d = length(gl_FragCoord.xy - vCenter);
  float r = vRadius;
  float core = 1.0 - smoothstep(0.55 * r - 0.6, 0.55 * r + 0.6, d);
  float ring = 1.0 - smoothstep(0.7 * uPixelRatio - 0.5, 0.7 * uPixelRatio + 0.5, abs(d - 0.85 * r));
  vec3 rgb = mix(vec3(0.0), vColor.rgb, core);   // a dark ring around a colored dot
  float a = max(core, ring * 0.85) * vColor.a;
  if (a < 0.01) discard;
  gl_FragColor = vec4(rgb * a, a);
}`;

// Places on round bodies, with their globe; fronts with their path. One list,
// shared by the markers and the labels (the markers note which places face
// the camera, and the labels read it).
let cached = { key: null, value: null };
function usePlaces() {
  const map = useMap((s) => s.map);
  const index = useMap((s) => s.index);
  const playerMode = useMap((s) => s.playerMode);
  const key = [map, index, playerMode];
  if (cached.key && cached.key.every((k, i) => k === key[i])) return cached.value;
  const value = (() => {
    const globes = new Map();
    const places = [];
    for (const p of map.places) {
      const b = index.byId.get(p.body);
      if (!GLOBE_TYPES.has(b.type) || !view.targets.has(b.system) || isHidden(index, p.id, playerMode)) continue;
      if (!globes.has(b.id)) globes.set(b.id, globeInfo(b, index, map.clock));
      const g = globes.get(b.id);
      places.push({
        place: p, globe: g, name: displayName(p.name),
        offset: surfaceOffsetKm(p.at, g.axes, g.radiusKm, LIFT),
        normal: surfaceOffsetKm(p.at, g.axes, 1),
        color: displayColor(KIND_COLOR[p.kind] ?? KIND_COLOR.other),
      });
    }
    return { globes, places };
  })();
  cached = { key, value };
  return value;
}

// How far a globe is showing, and whether a spot on it faces the camera.
function globeState(cam, g, camera, size, rel) {
  offsetKm(cam, g.place, rel);
  const dist = Math.hypot(...rel);
  return { rel: [...rel], dist, px: g.radiusKm * pixelsPerKm(dist, camera.fov, size.height) };
}
const facing = (normal, toPoint) => {
  const l = Math.hypot(...toPoint);
  return -(normal[0] * toPoint[0] + normal[1] * toPoint[1] + normal[2] * toPoint[2]) / l;
};

export default function Places() {
  const { places } = usePlaces();

  const markers = useMemo(() => {
    const g = spriteGeometry(places.length);
    places.forEach((it, i) => g.attributes.aSize.setX(i, MARKER_PX));
    const m = new THREE.ShaderMaterial({
      vertexShader: spriteVertex, fragmentShader: markerFragment, uniforms: spriteUniforms(),
      transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const mesh = new THREE.InstancedMesh(g, m, places.length);
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    mesh.userData.layer = 'places';
    mesh.userData.ids = places.map((it) => it.place.id);
    return mesh;
  }, [places]);

  // Fronts: each path densified along great circles.
  const fronts = useMemo(() => places.filter((it) => it.place.path).map((it) => {
    const pts = [];
    const path = it.place.path;
    for (let i = 0; i < path.length - 1; i++) {
      for (let k = 0; k < PATH_STEPS; k++) {
        const t = k / PATH_STEPS;
        pts.push([path[i][0] + (path[i + 1][0] - path[i][0]) * t, path[i][1] + (path[i + 1][1] - path[i][1]) * t]);
      }
    }
    pts.push(path.at(-1));
    return { ...it, pts: pts.map((at) => ({ off: surfaceOffsetKm(at, it.globe.axes, it.globe.radiusKm, LIFT), n: surfaceOffsetKm(at, it.globe.axes, 1) })) };
  }), [places]);

  const frontMesh = useMemo(() => {
    const count = fronts.reduce((n, f) => n + f.pts.length - 1, 0);
    const mesh = new THREE.Mesh(quadGeometry(STRIP_CORNERS, count, STRIP_ATTRS), screenMaterial(stripVertex, stripFragment, { butt: true }));
    mesh.frustumCulled = false;
    mesh.renderOrder = 4;
    mesh.userData.layer = 'fronts';
    return mesh;
  }, [fronts]);

  const tmp = useMemo(() => ({ rel: [0, 0, 0], m: new THREE.Matrix4() }), []);
  useFrame(({ camera, size, viewport }) => {
    const cam = view.rig?.camera;
    if (!cam) return;
    const states = new Map();
    const state = (g) => {
      if (!states.has(g)) states.set(g, globeState(cam, g, camera, size, tmp.rel));
      return states.get(g);
    };
    updateViewport(markers.material, size, viewport);
    const colors = markers.geometry.attributes.aColor;
    places.forEach((it, i) => {
      const s = state(it.globe);
      const blend = globeBlend(s.px);
      const p = s.rel.map((v, k) => v + it.offset[k]);
      const face = blend > 0 ? facing(it.normal, p) : -1;
      const alpha = blend * Math.min(1, Math.max(0, face / 0.12));
      markers.setMatrixAt(i, tmp.m.makeTranslation(p[0], p[1], p[2]));
      colors.setXYZW(i, it.color.r, it.color.g, it.color.b, alpha);
      it.screenAlpha = alpha;
    });
    markers.instanceMatrix.needsUpdate = true;
    colors.needsUpdate = true;
    markers.visible = places.some((it) => it.screenAlpha > 0); // no draw call when no globe is showing

    const g = frontMesh.geometry;
    const { aStart, aEnd, aColor, aWidth } = g.attributes;
    let n = 0;
    let anyFront = false;
    for (const f of fronts) {
      const s = state(f.globe);
      const blend = globeBlend(s.px);
      for (let i = 0; i < f.pts.length - 1; i++) {
        const a = s.rel.map((v, k) => v + f.pts[i].off[k]);
        const b = s.rel.map((v, k) => v + f.pts[i + 1].off[k]);
        const face = Math.min(facing(f.pts[i].n, a), facing(f.pts[i + 1].n, b));
        if (!clipToView(camera, size.width / size.height, a, b)) a.fill(0), b.fill(0);
        aStart.setXYZ(n, ...a);
        aEnd.setXYZ(n, ...b);
        aColor.setXYZW(n, f.color.r, f.color.g, f.color.b, 0.95 * blend * Math.min(1, Math.max(0, face / 0.12)));
        aWidth.setX(n, 2.5);
        if (aColor.getW(n) > 0) anyFront = true;
        n++;
      }
    }
    for (const a of [aStart, aEnd, aColor, aWidth]) a.needsUpdate = true;
    frontMesh.visible = anyFront;
    updateViewport(frontMesh.material, size, viewport);
  }, -1);

  return (
    <>
      <primitive object={frontMesh} />
      <primitive object={markers} />
    </>
  );
}

// ---- Place names ----

const els = new Map();
let setGlobeId = () => {};
let redraw = () => {};

export function PlaceLabels() {
  const { places } = usePlaces();
  const [globeId, setGlobe] = useState(null);
  useEffect(() => { setGlobeId = setGlobe; return () => { setGlobeId = () => {}; }; }, []);
  // The scene only redraws on change: ask for a frame once the names are on the page.
  useEffect(() => { redraw(); }, [globeId]);
  if (!globeId) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {places.filter((it) => it.globe.body.id === globeId).map((it) => (
        <div
          key={it.place.id}
          data-place={it.place.id}
          ref={(el) => (el ? els.set(it.place.id, { el, it }) : els.delete(it.place.id))}
          style={{
            position: 'absolute', left: 0, top: 0, opacity: 0, whiteSpace: 'nowrap', padding: '0 2px',
            color: KIND_COLOR[it.place.kind] ?? KIND_COLOR.other, font: '500 11.5px/1.2 system-ui, sans-serif',
            textShadow: '0 0 2px #000, 0 0 4px #000, 0 0 6px #000', willChange: 'transform, opacity', transition: FADE,
          }}
        >
          {it.name}
        </div>
      ))}
    </div>
  );
}

const RANK = { city: 0, front: 0, town: 1, port: 1, settlement: 2, battlefield: 2, base: 3, refinery: 3, mine: 4, camp: 4, landing: 4, structure: 5, ruin: 5, site: 5 };

export function PlaceLabelsUpdater() {
  const { globes } = usePlaces();
  const { camera, size, invalidate } = useThree();
  const current = useRef(null);
  const rel = useMemo(() => [0, 0, 0], []);
  useEffect(() => { redraw = invalidate; return () => { redraw = () => {}; }; }, [invalidate]);

  useFrame(() => {
    const cam = view.rig?.camera;
    if (!cam) return;
    // The largest globe on screen, if big enough for names.
    let best = null;
    let bestPx = LABEL_GLOBE_PX / 2;
    for (const g of globes.values()) {
      const s = globeState(cam, g, camera, size, rel);
      if (s.px > bestPx) { best = g.body.id; bestPx = s.px; }
    }
    if (best !== current.current) { current.current = best; setGlobeId(best); }
    if (!best) return;
    const items = [...els.values()].map(({ el, it }) => ({ el, it, p: it.screenAlpha > 0.5 ? screenPos(camera, cam, { anchor: it.globe.place.anchor, offset: it.globe.place.offset.map((v, k) => v + it.offset[k]) }, size.width, size.height) : null }));
    items.sort((a, b) => (RANK[a.it.place.kind] ?? 6) - (RANK[b.it.place.kind] ?? 6) || wasShown(a.el) - wasShown(b.el));
    const dots = items.filter((x) => x.p).map((x) => ({ x, box: [x.p[0] - 6, x.p[1] - 6, x.p[0] + 6, x.p[1] + 6] }));
    const taken = [...regionLabelBoxes];
    const overlaps = (b, o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1];
    for (const item of items) {
      const { el, p } = item;
      let box = null, spot = null;
      if (p) {
        const w = el.offsetWidth, h = el.offsetHeight;
        const spots = [[p[0] + 7, p[1] - h / 2], [p[0] - 7 - w, p[1] - h / 2], [p[0] - w / 2, p[1] + 7], [p[0] - w / 2, p[1] - 7 - h]]
          .map(([x, y]) => [x, y, x + w, y + h]);
        spot = spotOrder(el._spot, 4).find((i) => {
          const b = spots[i];
          return b[0] > 0 && b[2] < size.width && b[1] > 0 && b[3] < size.height
            && !taken.some((o) => overlaps(b, o)) && !dots.some((d) => d.x !== item && overlaps(b, d.box));
        }) ?? null;
        box = spot == null ? null : spots[spot];
      }
      if (box) {
        taken.push(box);
        el.style.transform = `translate(${Math.round(box[0])}px, ${Math.round(box[1])}px)`;
      }
      settle(el, box, spot);
    }
  });
  return null;
}
