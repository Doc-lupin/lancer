// Icons for systems with no star at the center (task 2.8), in one instanced
// draw call. Each is drawn in the fragment shader by its type:
//   rogue planet  a dark disc with a pale rim (the Hollows' starless worlds)
//   wreck         a ring broken in three places (the Boneyard's Absent wrecks)
//   structure     a clock face: ring, four ticks and a center dot (the Orrery)
// Bodies themselves, at true size, come with task 2.9.

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMap, isHidden } from '../data/store.js';
import { offsetKm } from './origin.js';
import { view } from './camera/view.js';
import { spriteVertex, spriteFragmentHead, spriteUniforms, spriteGeometry, updateViewport } from './sprite.js';

export const CENTER_ICONS = {
  'rogue-planet': { type: 0, color: '#9bb7d6' },
  wreck: { type: 1, color: '#d4a466' },
  structure: { type: 2, color: '#efd77e' },
};
const ICON_PX = 11;

const fragment = /* glsl */ `
${spriteFragmentHead}
float line(vec2 p, vec2 a, vec2 b) { vec2 ab = b - a; float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0); return length(p - a - ab * t); }
void main() {
  #include <logdepthbuf_fragment>
  vec2 q = gl_FragCoord.xy - vCenter;
  float r = vRadius;
  float hw = 0.8 * uPixelRatio;              // half the stroke width
  float ring = abs(length(q) - 0.72 * r);
  float stroke = ring;
  float fill = 0.0;
  if (vType < 0.5) {
    fill = 0.35 * (1.0 - smoothstep(0.72 * r - 1.0, 0.72 * r, length(q)));
  } else if (vType < 1.5) {
    float turn = fract(atan(q.y, q.x) / 6.2831853 * 3.0 + 0.1);
    if (turn < 0.16) stroke = 1e3;           // three gaps in the ring
  } else {
    for (int i = 0; i < 4; i++) {
      vec2 d = vec2(cos(float(i) * 1.5707963), sin(float(i) * 1.5707963));
      stroke = min(stroke, line(q, d * 0.72 * r, d * r));
    }
    stroke = min(stroke, max(length(q) - 0.16 * r, 0.0));
  }
  float a = max(1.0 - smoothstep(hw - 0.5, hw + 0.5, stroke), fill) * vColor.a;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor.rgb * a, a);
}`;

export default function Centers() {
  const map = useMap((s) => s.map);
  const index = useMap((s) => s.index);
  const playerMode = useMap((s) => s.playerMode);
  const centers = useMemo(() => map.systems
    .filter((s) => CENTER_ICONS[s.center.type] && !isHidden(index, s.id, playerMode))
    .map((s) => ({ id: s.id, type: s.center.type, place: view.targets.get(s.id).place, icon: CENTER_ICONS[s.center.type] })),
  [map, index, playerMode]);

  const mesh = useMemo(() => {
    const g = spriteGeometry(centers.length);
    const c = new THREE.Color();
    centers.forEach((it, i) => {
      c.set(it.icon.color);
      g.attributes.aColor.setXYZW(i, c.r, c.g, c.b, 1);
      g.attributes.aSize.setX(i, ICON_PX);
      g.attributes.aType.setX(i, it.icon.type);
    });
    const m = new THREE.ShaderMaterial({
      vertexShader: spriteVertex,
      fragmentShader: fragment,
      uniforms: spriteUniforms(),
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const mesh = new THREE.InstancedMesh(g, m, centers.length);
    mesh.frustumCulled = false;
    mesh.userData.layer = 'icons';
    mesh.userData.types = centers.map((it) => it.type);
    return mesh;
  }, [centers]);

  const rel = useMemo(() => [0, 0, 0], []);
  const mat = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ size, viewport }) => {
    const cam = view.rig?.camera;
    if (!cam) return;
    updateViewport(mesh.material, size, viewport);
    centers.forEach((it, i) => {
      offsetKm(cam, it.place, rel);
      mesh.setMatrixAt(i, mat.makeTranslation(rel[0], rel[1], rel[2]));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, -1);

  return <primitive object={mesh} />;
}
