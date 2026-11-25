// Region effects (task 2.8): the Furnace's nebula and the Mire's dust cloud,
// each a cloud of soft puffs spread through the region (a simple particle
// cloud; full volume effects are out of scope for the first release).
//   nebula  glowing pink, violet and blue, added to what is behind it
//   dust    murky brown, laid over the stars, so the Mire's stars are dimmed
//           ("a dark dust cloud hiding its stars")
// Puffs are sized in km and fade out as they come close to the camera, so
// flying in doesn't fill the screen. One instanced draw call per effect.

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMap, isHidden } from '../data/store.js';
import { displayColor } from './color.js';
import { offsetKm, place, KM_PER_LY } from './origin.js';
import { view } from './camera/view.js';
import { spriteVertex, spriteFragmentHead, spriteUniforms, spriteGeometry, updateViewport } from './sprite.js';

const STYLES = {
  nebula: {
    puffs: 80, colors: ['#ff3d8b', '#b84dff', '#4f7bff', '#ff6a4d', '#ff4fd8'], alpha: [0.14, 0.3],
    blending: { blending: THREE.AdditiveBlending }, renderOrder: 1,
  },
  'dust-cloud': {
    puffs: 80, colors: ['#3d2618', '#33200f', '#47291a', '#2a1a12'], alpha: [0.35, 0.55],
    blending: { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor }, renderOrder: 2,
  },
};

const fragment = /* glsl */ `
${spriteFragmentHead}
void main() {
  #include <logdepthbuf_fragment>
  float d = length(gl_FragCoord.xy - vCenter) / max(vRadius, 0.5);
  float a = vColor.a * exp(-d * d * 2.5) * (1.0 - smoothstep(0.85, 1.0, d));
  if (a < 0.002) discard;
  gl_FragColor = vec4(vColor.rgb * a, a);
}`;

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
    return {
      place: place(region.pos, offset),
      sizeKm: R * (0.25 + 0.3 * rand()),
      color: displayColor(style.colors[Math.floor(rand() * style.colors.length)]),
      alpha: style.alpha[0] + (style.alpha[1] - style.alpha[0]) * rand(),
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
    });
    const m = new THREE.ShaderMaterial({
      vertexShader: spriteVertex,
      fragmentShader: fragment,
      uniforms: spriteUniforms({ uWorldSize: { value: 1 }, uFadeFrom: { value: 0.25 }, uFadeTo: { value: 0.9 } }),
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
