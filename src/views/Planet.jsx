// The planet level (task 2.10): a real globe for any round body that is large
// on screen (planets, giants, moons, asteroids, rogue planets, wrecks, the
// Orrery's structure), crossfading with the flat disc System.jsx draws below
// that size (globeBlend).
//   surface     tinted with appearance.color; giants get soft latitude bands,
//               rocky bodies faint mottling (canvas textures, no files; real
//               textures and clouds are for later, P11)
//   light       one directional light from the system's star; a rogue planet,
//               with no star, gets faint light all round
//   atmosphere  a thin rim glow 2% above the surface (appearance.atmosphere).
//               Globes only show within ~40 radii, where that gap is well
//               inside the depth rule of task 2.4 (gap ≥ 2 × 10^-4 × distance)
//   rings       in the equatorial plane (appearance.rings)
// Globes are turned by globe.js (P16). Precision: globes are only drawn close
// up, so ordinary shaders with varying values are fine here.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMap, isHidden } from '../data/store.js';
import { bodyOffsetKm, daysSinceEpoch } from '../data/orbits.js';
import { bodyAxes } from '../data/globe.js';
import { offsetKm, place, pixelsPerKm } from './origin.js';
import { view } from './camera/view.js';
import { bodyRadiusKm, GLOBE_TYPES } from './mapTargets.js';

// Radius on screen (CSS px) over which the flat disc hands over to the globe.
const GLOBE_FROM_PX = 10;
const GLOBE_TO_PX = 16;
export const globeBlend = (radiusPx) => Math.min(1, Math.max(0, (radiusPx - GLOBE_FROM_PX) / (GLOBE_TO_PX - GLOBE_FROM_PX)));
const MAX_GLOBES = 6;

const SPHERE = new THREE.SphereGeometry(1, 96, 64).rotateX(Math.PI / 2); // poles along z (north = body frame z)
const RING_INNER = 1.35;
const RING_OUTER = 2.3;

// Everything about a body's globe that doesn't change frame to frame.
export function globeInfo(body, index, clock) {
  const days = daysSinceEpoch(clock);
  const system = index.byId.get(body.system);
  const offset = bodyOffsetKm(body, index, days);
  const parent = body.parent ? bodyOffsetKm(index.byId.get(body.parent), index, days) : [0, 0, 0];
  const toParent = parent.map((v, i) => v - offset[i]);
  const len = Math.hypot(...toParent);
  const toStar = offset.map((v) => -v);
  const starLen = Math.hypot(...toStar);
  return {
    body,
    place: place(system.pos, offset),
    radiusKm: bodyRadiusKm(body),
    axes: bodyAxes(body, days, len ? toParent.map((v) => v / len) : null),
    toStar: system.center.type === 'star' && starLen ? toStar.map((v) => v / starLen) : null,
  };
}

// Small seeded random numbers, so a body's texture is the same every time.
function random(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const textures = new Map();
function surfaceTexture(body) {
  if (textures.has(body.id)) return textures.get(body.id);
  const rand = random(body.id);
  const canvas = document.createElement('canvas');
  const giant = body.type === 'gas-giant';
  canvas.width = giant ? 8 : 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(canvas.width, canvas.height);
  if (giant) {
    // Latitude bands: lightness drifting smoothly from row to row.
    let v = 0;
    const rows = [];
    for (let y = 0; y < canvas.height; y++) { v = 0.85 * v + 0.15 * (rand() * 2 - 1); rows.push(v); }
    rows.forEach((r, y) => {
      for (let x = 0; x < canvas.width; x++) {
        const k = 4 * (y * canvas.width + x);
        const l = 200 + 55 * Math.max(-1, Math.min(1, r * 3));
        img.data.set([l, l, l, 255], k);
      }
    });
  } else {
    // Mottling: a few soft blobs of lighter and darker ground.
    const blobs = Array.from({ length: 40 }, () => [rand() * 256, rand() * 128, 6 + rand() * 26, rand() * 2 - 1]);
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 256; x++) {
        let v = 0;
        for (const [bx, by, br, s] of blobs) {
          const dx = Math.min(Math.abs(x - bx), 256 - Math.abs(x - bx));
          v += s * Math.exp(-(dx * dx + (y - by) ** 2) / (br * br));
        }
        const l = 215 + 40 * Math.max(-1, Math.min(1, v));
        img.data.set([l, l, l, 255], 4 * (y * 256 + x));
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  textures.set(body.id, tex);
  return tex;
}

const ringTexture = (() => {
  let tex = null;
  return () => {
    if (tex) return tex;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const rand = random('rings');
    for (let x = 0; x < 256; x++) {
      const t = x / 255;
      const a = (0.25 + 0.5 * rand()) * Math.sin(Math.PI * t) ** 0.6 * (t > 0.62 && t < 0.67 ? 0.15 : 1);
      const v = Math.round(255 * a); // grey: used both as color and as the alpha map (green channel)
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, 0, 1, 1);
    }
    tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
})();

// Ring geometry with u running from the inner to the outer edge.
const RING = (() => {
  const g = new THREE.RingGeometry(RING_INNER, RING_OUTER, 160, 1);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    uv.setXY(i, (r - RING_INNER) / (RING_OUTER - RING_INNER), 0.5);
  }
  return g;
})();

const atmosphereVertex = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vN;
varying vec3 vV;
void main() {
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`;
const atmosphereFragment = /* glsl */ `
#include <logdepthbuf_pars_fragment>
uniform vec3 uColor;
uniform vec3 uLight;   // toward the star, view space; zero for none
uniform float uOpacity;
varying vec3 vN;
varying vec3 vV;
void main() {
  #include <logdepthbuf_fragment>
  float rim = pow(1.0 - max(dot(vN, vV), 0.0), 3.0);
  float lit = dot(uLight, uLight) > 0.0 ? clamp(dot(vN, uLight) * 0.9 + 0.35, 0.0, 1.0) : 0.3;
  float a = rim * lit * uOpacity;
  gl_FragColor = vec4(uColor * a, a);
}`;

function Globe({ info, blend }) {
  const group = useRef();
  const { body } = info;
  const appearance = body.appearance ?? {};
  const color = appearance.color ?? '#9a8f80';
  const surface = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(color), map: surfaceTexture(body), roughness: 1, metalness: 0,
  }), [body, color]);
  const atmosphere = useMemo(() => appearance.atmosphere && new THREE.ShaderMaterial({
    vertexShader: atmosphereVertex,
    fragmentShader: atmosphereFragment,
    uniforms: {
      uColor: { value: new THREE.Color(color).lerp(new THREE.Color('#9cc8ff'), 0.6).convertLinearToSRGB() }, // display color (color.js)
      uLight: { value: new THREE.Vector3() },
      uOpacity: { value: 1 },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }), [appearance.atmosphere, color]);
  const rings = useMemo(() => appearance.rings && new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.35), map: ringTexture(), alphaMap: ringTexture(),
    transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1, metalness: 0,
  }), [appearance.rings, color]);

  const basis = useMemo(() => {
    const { lon0, lon90, north } = info.axes;
    return new THREE.Matrix4().makeBasis(new THREE.Vector3(...lon0), new THREE.Vector3(...lon90), new THREE.Vector3(...north));
  }, [info]);
  const rel = useMemo(() => [0, 0, 0], []);
  const light = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }) => {
    const g = group.current;
    const cam = view.rig?.camera;
    if (!g || !cam) return;
    offsetKm(cam, info.place, rel);
    g.position.set(rel[0], rel[1], rel[2]);
    g.quaternion.setFromRotationMatrix(basis);
    g.scale.setScalar(info.radiusKm);
    const b = blend.current.get(body.id) ?? 0;
    g.visible = b > 0;
    for (const m of [surface, rings]) {
      if (!m) continue;
      m.opacity = b * (m === rings ? 0.9 : 1);
      m.transparent = m === rings || b < 1;
    }
    if (atmosphere) {
      atmosphere.uniforms.uOpacity.value = b;
      if (info.toStar) light.set(...info.toStar).transformDirection(camera.matrixWorldInverse);
      else light.set(0, 0, 0);
      atmosphere.uniforms.uLight.value.copy(light);
    }
  }, -1);

  return (
    <group ref={group} userData={{ layer: 'globes', body: body.id }}>
      <mesh geometry={SPHERE} material={surface} />
      {atmosphere && <mesh geometry={SPHERE} material={atmosphere} scale={1.02} />}
      {rings && <mesh geometry={RING} material={rings} />}
    </group>
  );
}

export default function Planets() {
  const map = useMap((s) => s.map);
  const index = useMap((s) => s.index);
  const playerMode = useMap((s) => s.playerMode);
  const [shown, setShown] = useState([]);
  const blend = useRef(new Map());
  const sun = useRef();
  const ambient = useRef();

  const candidates = useMemo(() => map.bodies
    .filter((b) => GLOBE_TYPES.has(b.type) && view.targets.has(b.system) && !isHidden(index, b.id, playerMode))
    .map((b) => globeInfo(b, index, map.clock)), [map, index, playerMode]);
  const byId = useMemo(() => new Map(candidates.map((c) => [c.body.id, c])), [candidates]);

  useEffect(() => () => blend.current.clear(), []);

  const rel = useMemo(() => [0, 0, 0], []);
  useFrame(({ camera, size }) => {
    const cam = view.rig?.camera;
    if (!cam) return;
    const near = [];
    for (const c of candidates) {
      offsetKm(cam, c.place, rel);
      const px = c.radiusKm * pixelsPerKm(Math.hypot(...rel), camera.fov, size.height);
      const b = globeBlend(px);
      blend.current.set(c.body.id, b);
      if (b > 0) near.push([px, c.body.id]);
    }
    near.sort((a, b) => b[0] - a[0]);
    const ids = near.slice(0, MAX_GLOBES).map(([, id]) => id);
    if (ids.join() !== shown.join()) setShown(ids);
    // Light from the star of the largest globe's system, aimed at it.
    const main = byId.get(ids[0]);
    if (sun.current && ambient.current) {
      sun.current.intensity = main?.toStar ? 3.6 : 0;
      ambient.current.intensity = main?.toStar ? 0.06 : 0.35;
      if (main) {
        offsetKm(cam, main.place, rel);
        sun.current.target.position.set(rel[0], rel[1], rel[2]);
        const d = main.toStar ?? [0, 0, 1];
        sun.current.position.set(rel[0] + d[0] * main.radiusKm * 10, rel[1] + d[1] * main.radiusKm * 10, rel[2] + d[2] * main.radiusKm * 10);
        sun.current.target.updateMatrixWorld();
      }
    }
  }, -1);

  return (
    <>
      <directionalLight ref={sun} intensity={0} />
      <ambientLight ref={ambient} intensity={0} />
      {shown.map((id) => byId.get(id) && <Globe key={id} info={byId.get(id)} blend={blend} />)}
    </>
  );
}
