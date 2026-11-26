// Every star: each star-centered system's, and the companion stars that
// orbit some of them (task 2.9). Two instanced draw calls (task 2.6):
//   core  a sphere at true size, never smaller than CORE_PX on screen (P5);
//   glow  a soft disc facing the camera, sized in screen pixels by luminosity,
//         drawn additively so close pairs brighten: a bright core and a faint
//         wide halo, growing up to 4× into a bloom inside a system.
// Colors and luminosity come from src/data/starKinds.js. Unmapped stars
// (charted: false) are drawn dimmer, except those in FULL_BRIGHTNESS. A black
// hole has a dark core in its disk's glow. Positions are set relative to the
// camera each frame (P3).

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMap, isHidden } from '../data/store.js';
import { STAR_KINDS } from '../data/starKinds.js';
import { offsetKm, pixelsPerKm } from './origin.js';
import { view } from './camera/view.js';
import { starRadiusKm } from './mapTargets.js';
import { FROM_DISPLAY_GLSL } from './color.js';
import { BLOOM } from './bloom.js';

const CORE_PX = 2.5;
const UNMAPPED_CORE = 0.5; // color multiplier for unmapped stars
const UNMAPPED_GLOW = 0.35;
// Unmapped stars drawn at full brightness all the same. The Watchfire is
// visible from every world in the Basin and spacers steer by it (GM, Nov 25).
const FULL_BRIGHTNESS = new Set(['watchfire-system']);

// Glow width in CSS pixels from luminosity (Sun = 1): 8 px for the Sun,
// 3.2 px more per factor of ten, from 5 px (dim dwarfs, remnants) to 26 px.
// How bright a star's core is in linear light inside its system (task B0.5):
// from 2.2 for dim dwarfs (under the bloom threshold of 2 for all but white
// ones) up to 8 for giants, so the bright stars bloom (Output.jsx). From far
// away (the Basin, a region) cores stay at their color, under the threshold:
// there stars are chart marks, and labels win (BD7, contrast check).
export const coreLight = (L) => Math.min(8, Math.max(2.2, 2.2 + 1.2 * Math.log10(Math.max(L, 1e-6))));

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
${FROM_DISPLAY_GLSL}
flat varying vec2 vCenter;
flat varying float vRadius;
flat varying vec3 vColor;
void main() {
  #include <logdepthbuf_fragment>
  float d = length(gl_FragCoord.xy - vCenter) / vRadius;
  // A bright core and a faint, wide halo, like light scattered in an eye or lens.
  float a = (exp(-d * d * 4.0) + 0.22 / (1.0 + d * d * 60.0)) * (1.0 - smoothstep(0.6, 1.0, d));
  gl_FragColor = vec4(fromDisplay(vColor * a), a);
}`;

export default function Stars() {
  const map = useMap((s) => s.map);
  const index = useMap((s) => s.index);
  const playerMode = useMap((s) => s.playerMode);
  const core = useRef();
  const glow = useRef();

  // System stars, then companion stars (bodies of type star, task 2.9).
  const stars = useMemo(() => {
    const entry = (id, kind, placeOf, charted) => {
      const k = STAR_KINDS[kind];
      return {
        id,
        place: view.targets.get(id)?.place ?? placeOf,
        radiusKm: starRadiusKm(kind),
        color: new THREE.Color(k.color),
        glow: glowPx(k.luminosity) * (charted || FULL_BRIGHTNESS.has(id) ? 1 : 0.75),
        dim: !charted && !FULL_BRIGHTNESS.has(id),
        dark: kind === 'black-hole',
        light: coreLight(k.luminosity),
      };
    };
    const systems = map.systems
      .filter((s) => s.center.type === 'star' && !isHidden(index, s.id, playerMode))
      .map((s) => entry(s.id, s.center.kind, { anchor: s.pos, offset: [0, 0, 0] }, s.charted));
    const companions = map.bodies
      .filter((b) => b.type === 'star' && !isHidden(index, b.id, playerMode) && view.targets.has(b.id))
      .map((b) => entry(b.id, b.kind, null, index.byId.get(b.system).charted));
    return [...systems, ...companions];
  }, [map, index, playerMode]);

  const { glowGeometry, glowMaterial, coreMaterial } = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    const colors = new Float32Array(stars.length * 3);
    // The glow's own shader needs display colors (color.js); the core's built-in material converts for itself.
    stars.forEach((s, i) => s.color.clone().convertLinearToSRGB().multiplyScalar(s.dim ? UNMAPPED_GLOW : 1).toArray(colors, i * 3));
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
  const tint = useMemo(() => new THREE.Color(), []);

  useFrame(({ camera, size, viewport }) => {
    const cam = view.rig?.camera;
    if (!cam || !core.current || !glow.current) return;
    const sizes = glowGeometry.attributes.aSize;
    const u = glowMaterial.uniforms;
    u.uPxToClip.value.set(2 / size.width, 2 / size.height);
    u.uViewport.value.set(size.width * viewport.dpr, size.height * viewport.dpr);
    u.uPixelRatio.value = viewport.dpr;
    BLOOM.stars = false;
    stars.forEach((s, i) => {
      offsetKm(cam, s.place, rel);
      const dist = Math.hypot(rel[0], rel[1], rel[2]);
      const perKm = pixelsPerKm(dist, camera.fov, size.height);
      const truePx = 2 * s.radiusKm * perKm;
      const r = Math.max(s.radiusKm, CORE_PX / 2 / perKm);
      pos.set(rel[0], rel[1], rel[2]);
      core.current.setMatrixAt(i, m.compose(pos, q, scale.setScalar(r)));
      glow.current.setMatrixAt(i, m.compose(pos, q, scale.setScalar(1)));
      // Inside a system (closer than ~200 AU) the glow grows into a bloom, and
      // the core grows brighter than white (real bloom, B0.5).
      const near = Math.min(1, Math.max(0, Math.log10(3e10 / dist) / 2));
      const bloom = 1 + 3 * near;
      if (near > 0 && !s.dark) BLOOM.stars = true;
      if (!s.dark) core.current.setColorAt(i, tint.copy(s.color).multiplyScalar((1 + (s.light - 1) * near) * (s.dim ? UNMAPPED_CORE : 1)));
      sizes.array[i] = s.glow * bloom + 1.6 * truePx;
    });
    core.current.instanceMatrix.needsUpdate = true;
    core.current.instanceColor.needsUpdate = true;
    glow.current.instanceMatrix.needsUpdate = true;
    sizes.needsUpdate = true;
  }, -1);

  return (
    <>
      <instancedMesh ref={setCoreColors} args={[CORE_GEOMETRY, coreMaterial, stars.length]} frustumCulled={false} userData={{ layer: 'stars' }} />
      <instancedMesh ref={glow} args={[glowGeometry, glowMaterial, stars.length]} frustumCulled={false} userData={{ layer: 'stars' }} />
    </>
  );
}
