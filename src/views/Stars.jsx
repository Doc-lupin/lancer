// Every star-centered system, in two instanced draw calls (task 2.6):
//   core  a sphere at true size, never smaller than CORE_PX on screen (P5);
//   glow  a soft disc facing the camera, sized in screen pixels by luminosity,
//         drawn additively so close pairs brighten.
// Colors and luminosity come from src/data/starKinds.js. Unmapped stars
// (charted: false) are drawn dimmer. A black hole has a dark core in its
// disk's glow. Positions are set relative to the camera each frame (P3).

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMap, isHidden } from '../data/store.js';
import { STAR_KINDS } from '../data/starKinds.js';
import { offsetKm, pixelsPerKm } from './origin.js';
import { view } from './camera/view.js';
import { starRadiusKm } from './mapTargets.js';

const CORE_PX = 2.5;
const UNMAPPED_CORE = 0.5; // color multiplier for unmapped stars
const UNMAPPED_GLOW = 0.35;

// Glow width in CSS pixels from luminosity (Sun = 1): 8 px for the Sun,
// 3.2 px more per factor of ten, from 5 px (dim dwarfs, remnants) to 26 px.
export const glowPx = (L) => Math.min(26, Math.max(5, 8 + 3.2 * Math.log10(Math.max(L, 1e-6))));

const CORE_GEOMETRY = new THREE.IcosahedronGeometry(1, 3);

// The glow is measured from the star's center in screen pixels (gl_FragCoord),
// not from texture coordinates. Interpolating a coordinate across a quad
// ~10^14 km away fails (the quad's two triangles disagree, seen in task 2.6),
// while values that are the same at every corner ("flat") come through intact.
const glowVertex = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aColor;
attribute float aSize;
uniform vec2 uPxToClip;  // 2 / canvas size in CSS pixels
uniform vec2 uViewport;  // canvas size in device pixels
uniform float uPixelRatio;
flat varying vec2 vCenter;
flat varying float vRadius;
flat varying vec3 vColor;
void main() {
  vColor = aColor;
  vec4 c = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vCenter = (c.xy / c.w * 0.5 + 0.5) * uViewport;
  vRadius = 0.5 * aSize * uPixelRatio;
  gl_Position = c;
  gl_Position.xy += position.xy * aSize * uPxToClip * c.w;
  #include <logdepthbuf_vertex>
}`;

const glowFragment = /* glsl */ `
#include <logdepthbuf_pars_fragment>
flat varying vec2 vCenter;
flat varying float vRadius;
flat varying vec3 vColor;
void main() {
  #include <logdepthbuf_fragment>
  float d = length(gl_FragCoord.xy - vCenter) / vRadius;
  float a = exp(-d * d * 4.0) * (1.0 - smoothstep(0.75, 1.0, d));
  gl_FragColor = vec4(vColor * a, a);
}`;

export default function Stars() {
  const map = useMap((s) => s.map);
  const index = useMap((s) => s.index);
  const playerMode = useMap((s) => s.playerMode);
  const core = useRef();
  const glow = useRef();

  const stars = useMemo(() => map.systems
    .filter((s) => s.center.type === 'star' && !isHidden(index, s.id, playerMode))
    .map((s) => {
      const k = STAR_KINDS[s.center.kind];
      return {
        id: s.id,
        place: view.targets.get(s.id)?.place ?? { anchor: s.pos, offset: [0, 0, 0] },
        radiusKm: starRadiusKm(s.center.kind),
        color: new THREE.Color(k.color),
        glow: glowPx(k.luminosity) * (s.charted ? 1 : 0.75),
        dim: !s.charted,
        dark: s.center.kind === 'black-hole',
      };
    }), [map, index, playerMode]);

  const { glowGeometry, glowMaterial, coreMaterial } = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    const colors = new Float32Array(stars.length * 3);
    stars.forEach((s, i) => s.color.clone().multiplyScalar(s.dim ? UNMAPPED_GLOW : 1).toArray(colors, i * 3));
    g.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
    g.setAttribute('aSize', new THREE.InstancedBufferAttribute(new Float32Array(stars.length), 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: glowVertex,
      fragmentShader: glowFragment,
      uniforms: { uPxToClip: { value: new THREE.Vector2() }, uViewport: { value: new THREE.Vector2() }, uPixelRatio: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { glowGeometry: g, glowMaterial: m, coreMaterial: new THREE.MeshBasicMaterial() };
  }, [stars]);

  // Core colors are set once; they don't change with the camera.
  const setCoreColors = (mesh) => {
    if (!mesh) return;
    core.current = mesh;
    const c = new THREE.Color();
    stars.forEach((s, i) => mesh.setColorAt(i, s.dark ? c.set(0x000000) : c.copy(s.color).multiplyScalar(s.dim ? UNMAPPED_CORE : 1)));
    mesh.instanceColor.needsUpdate = true;
  };

  const m = useMemo(() => new THREE.Matrix4(), []);
  const rel = useMemo(() => [0, 0, 0], []);
  const scale = useMemo(() => new THREE.Vector3(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);

  useFrame(({ camera, size, viewport }) => {
    const cam = view.rig?.camera;
    if (!cam || !core.current || !glow.current) return;
    const sizes = glowGeometry.attributes.aSize;
    const u = glowMaterial.uniforms;
    u.uPxToClip.value.set(2 / size.width, 2 / size.height);
    u.uViewport.value.set(size.width * viewport.dpr, size.height * viewport.dpr);
    u.uPixelRatio.value = viewport.dpr;
    stars.forEach((s, i) => {
      offsetKm(cam, s.place, rel);
      const dist = Math.hypot(rel[0], rel[1], rel[2]);
      const perKm = pixelsPerKm(dist, camera.fov, size.height);
      const truePx = 2 * s.radiusKm * perKm;
      const r = Math.max(s.radiusKm, CORE_PX / 2 / perKm);
      pos.set(rel[0], rel[1], rel[2]);
      core.current.setMatrixAt(i, m.compose(pos, q, scale.setScalar(r)));
      glow.current.setMatrixAt(i, m.compose(pos, q, scale.setScalar(1)));
      sizes.array[i] = s.glow + 1.6 * truePx;
    });
    core.current.instanceMatrix.needsUpdate = true;
    glow.current.instanceMatrix.needsUpdate = true;
    sizes.needsUpdate = true;
  }, -1);

  return (
    <>
      <instancedMesh ref={setCoreColors} args={[CORE_GEOMETRY, coreMaterial, stars.length]} frustumCulled={false} />
      <instancedMesh ref={glow} args={[glowGeometry, glowMaterial, stars.length]} frustumCulled={false} />
    </>
  );
}
