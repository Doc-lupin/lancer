// Region effects (task 2.8): the Furnace's nebula and the Mire's dust cloud,
// each a cloud of puffs spread through the region (a simple particle cloud;
// full volume effects are out of scope for the first release). Each puff is
// a wisp, not a round blob: one of four cloud shapes, full of filaments,
// painted once on the GPU into a small atlas (surfaces.js bake), turned at
// random. The nebula glows pink at its heart and violet and blue outward.
//   nebula  glowing pink, violet and blue, added to what is behind it
//   dust    murky brown, laid over the stars, so the Mire's stars are dimmed
//           ("a dark dust cloud hiding its stars")
// Puffs are sized in km and fade out as they come close to the camera, so
// flying in doesn't fill the screen. One instanced draw call per effect.

import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useMap, isHidden } from '../data/store.js';
import { displayColor } from './color.js';
import { offsetKm, place, KM_PER_LY } from './origin.js';
import { view } from './camera/view.js';
import { spriteVertex, spriteFragmentHead, spriteUniforms, spriteGeometry, updateViewport } from './sprite.js';
import { bake, setBaker } from './surfaces.js';
import { EXPOSURE } from './exposure.js';

const STYLES = {
  nebula: {
    // Inner colors first: glowing hydrogen pink at the heart, violet and blue outward.
    puffs: 140, colors: ['#ff4f7a', '#ff3d8b', '#ff6a4d', '#d455ff', '#9a5cff', '#5a62ff', '#4a86ff'], alpha: [0.2, 0.45],
    blending: { blending: THREE.AdditiveBlending }, renderOrder: 1,
  },
  'dust-cloud': {
    puffs: 110, colors: ['#47241a', '#3b1d11', '#4d2a1c', '#301912', '#2a150e'], alpha: [0.34, 0.58],
    blending: { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor }, renderOrder: 2,
    over: true,
  },
};

// vType holds the puff's own random number: which shape, and how it's turned.
const fragment = /* glsl */ `
${spriteFragmentHead}
uniform sampler2D uShapes;
uniform float uExposure, uOver;
void main() {
  #include <logdepthbuf_fragment>
  vec2 q = (gl_FragCoord.xy - vCenter) / max(vRadius, 0.5);
  float d = length(q);
  if (d > 1.0) discard;
  float ang = vType * 6.2831853 * 7.0;
  q = mat2(cos(ang), sin(ang), -sin(ang), cos(ang)) * q;
  float tile = floor(vType * 4.0);
  vec2 uv = (q * 0.5 + 0.5) * 0.5 + vec2(mod(tile, 2.0), floor(tile / 2.0)) * 0.5;
  // Far off (a few pixels across) a puff is a soft glow; its wisps show as it grows.
  float shape = mix(exp(-d * d * 2.5), texture2D(uShapes, uv).r, smoothstep(4.0, 24.0, vRadius));
  float a = vColor.a * shape * (1.0 - smoothstep(0.85, 1.0, d));
  if (a < 0.002) discard;
  // Light (the nebula, added): converted with its alpha, so a puff over dark
  // space looks as written. Dust (laid over): converted before its alpha, so
  // thick dust settles to its own color, as it did before linear light (B0.4).
  vec3 rgb = uOver > 0.5 ? fromDisplay(vColor.rgb) * a : fromDisplay(vColor.rgb * a);
  gl_FragColor = vec4(rgb * uExposure, a);
}`;

// Four cloud shapes in a 2 × 2 atlas: swirled noise with bright filaments,
// fading to nothing at each tile's edge.
let shapes = null;
function cloudShapes() {
  if (shapes) return shapes;
  const m = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 7; i++) { s += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return s; }
      void main() {
        vec2 tile = floor(vUv * 2.0);
        vec2 q = fract(vUv * 2.0) * 2.0 - 1.0;
        vec2 seed = tile * 17.3 + 3.1;
        vec2 p = q * 2.2 + seed;
        vec2 w = vec2(fbm(p + 1.7), fbm(p + 8.3));
        float body = fbm(p + 2.2 * w);
        float threads = pow(1.0 - abs(2.0 * fbm(p * 1.6 + 3.0 * w) - 1.0), 7.0);
        float fall = smoothstep(1.0, 0.25, length(q + 0.25 * (w - 0.5)));
        float v = (smoothstep(0.35, 0.8, body) * 0.75 + threads * 0.6) * fall;
        gl_FragColor = vec4(vec3(clamp(v * 1.3, 0.0, 1.0)), 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  shapes = bake(512, 512, m, { color: false }).texture;
  shapes.wrapS = THREE.ClampToEdgeWrapping;
  m.dispose();
  return shapes;
}

// Small seeded random numbers, so a region's cloud is the same every time.
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

// Puffs for one region: spread around its center, denser in the middle,
// reaching about 1.5 times as far as the region's stars.
export function makePuffs(region, radiusKm, style) {
  const rand = random(region.id);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const R = Math.max(1.5 * radiusKm, 1.2 * KM_PER_LY) * 1.1;
  return Array.from({ length: style.puffs }, () => {
    const offset = [gauss(), gauss(), gauss()].map((v) => Math.max(-1.3, Math.min(1.3, v * 0.5)) * R);
    // Colors run from the first (the heart) to the last (the edge), loosely.
    const out = Math.min(0.999, Math.hypot(...offset) / (1.2 * R) + 0.25 * (rand() - 0.5));
    const k = Math.max(0, Math.floor(out * style.colors.length));
    return {
      place: place(region.pos, offset),
      sizeKm: R * (0.15 + 0.45 * rand() ** 1.5),
      color: displayColor(style.colors[Math.min(style.colors.length - 1, k)]),
      alpha: style.alpha[0] + (style.alpha[1] - style.alpha[0]) * rand(),
      seed: rand(),
    };
  });
}

function Effect({ kind, puffs }) {
  const style = STYLES[kind];
  const { geometry, material } = useMemo(() => {
    const g = spriteGeometry(puffs.length);
    puffs.forEach((p, i) => {
      g.attributes.aColor.setXYZW(i, p.color.r, p.color.g, p.color.b, p.alpha);
      g.attributes.aSize.setX(i, p.sizeKm);
      g.attributes.aType.setX(i, p.seed);
    });
    const m = new THREE.ShaderMaterial({
      vertexShader: spriteVertex,
      fragmentShader: fragment,
      uniforms: spriteUniforms({ uWorldSize: { value: 1 }, uFadeFrom: { value: 0.25 }, uFadeTo: { value: 0.9 }, uShapes: { value: cloudShapes() }, uExposure: EXPOSURE, uOver: { value: style.over ? 1 : 0 } }),
      transparent: true,
      depthWrite: false,
      ...style.blending,
    });
    return { geometry: g, material: m };
  }, [puffs, style]);

  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geometry, material, puffs.length);
    m.frustumCulled = false;
    m.renderOrder = style.renderOrder;
    m.userData.layer = kind === 'nebula' ? 'nebula' : 'dust';
    return m;
  }, [geometry, material, puffs, style, kind]);

  const rel = useMemo(() => [0, 0, 0], []);
  const mat = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ size, viewport }) => {
    const cam = view.rig?.camera;
    if (!cam) return;
    updateViewport(material, size, viewport);
    puffs.forEach((p, i) => {
      offsetKm(cam, p.place, rel);
      mesh.setMatrixAt(i, mat.makeTranslation(rel[0], rel[1], rel[2]));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, -1);

  return <primitive object={mesh} />;
}

export default function RegionEffects() {
  setBaker(useThree((s) => s.gl)); // for the cloud shapes
  const map = useMap((s) => s.map);
  const index = useMap((s) => s.index);
  const playerMode = useMap((s) => s.playerMode);
  const byKind = useMemo(() => {
    const out = {};
    for (const r of map.regions) {
      if (!STYLES[r.effect] || isHidden(index, r.id, playerMode)) continue;
      const radiusKm = view.targets.get(r.id)?.radiusKm ?? KM_PER_LY;
      (out[r.effect] ??= []).push(...makePuffs(r, radiusKm, STYLES[r.effect]));
    }
    return out;
  }, [map, index, playerMode]);
  return Object.entries(byKind).map(([kind, puffs]) => <Effect key={kind} kind={kind} puffs={puffs} />);
}
