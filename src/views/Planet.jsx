// The planet level (task 2.10): a real globe for any round body that is large
// on screen (planets, giants, moons, asteroids, rogue planets, wrecks, the
// Orrery's structure), crossfading with the flat disc System.jsx draws below
// that size (globeBlend). With the WIP switch on (planet/switch.js, decision
// BQ1), planets, moons, giants and rogue planets are procedural worlds (planet/ProceduralGlobe.jsx: terrain from plates, climate,
// biomes, clouds, scattering air, level of detail) unless maps are imported or
// registered for them; those, and asteroids, wrecks and structures, get the
// globe below.
//   surface     from surfaces.js, the one place that picks a body's maps
//               (generated, an image in public/textures/, or a registered
//               generator; color, height, normal and roughness maps), tinted
//               with appearance.color unless the map is full color. The
//               sphere is laid out by lat/lon (globeGeometry.js), so maps line
//               up with the places.
//   light       one directional light from the system's star; a rogue planet,
//               with no star, gets faint light all round
//   atmosphere  (appearance.atmosphere) a shell 6% above the surface that
//               works out how close each view ray passes to the planet: a
//               soft halo outside the limb, a haze thickening toward the edge
//               of the disc, lit on the star's side, warm at the terminator
//   clouds      a lit layer 1% above the surface, when the maps include one
//               (a provider can paint them). Globes only show within ~40
//               radii, where both gaps are inside the depth rule of task 2.4
//               (gap ≥ 2 × 10^-4 × distance)
//   rings       in the equatorial plane (appearance.rings), lighting themselves
// Globes are turned by globe.js (P16). Precision: globes are only drawn close
// up, so ordinary shaders with varying values are fine here.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useMap, isHidden } from '../data/store.js';
import { bodyOffsetKm, daysSinceEpoch } from '../data/orbits.js';
import { bodyAxes } from '../data/globe.js';
import { offsetKm, place, pixelsPerKm } from './origin.js';
import { view } from './camera/view.js';
import { bodyRadiusKm, GLOBE_TYPES } from './mapTargets.js';
import { latLonSphere } from './globeGeometry.js';
import { surfaceMaps, random, whenTexturesLoad, setBaker } from './surfaces.js';
import { runJobs, readyGlobes } from './jobs.js';
import { TIERS } from './quality.js';
import { ringMaterial, RING } from './planet/rings.js';
import ProceduralGlobe from './planet/ProceduralGlobe.jsx';
import { hasRecipe } from './planet/recipes.js';
import { WIP_WORLDS } from './planet/switch.js';
import './procedural.js'; // the Phase 2 surfaces, while WIP_WORLDS is off
import { globes } from './occlusion.js';
import { FROM_DISPLAY_GLSL } from './color.js';
import { EXPOSURE } from './exposure.js';
import { BLOOM } from './bloom.js';

// Radius on screen (CSS px) over which the flat disc hands over to the globe.
const GLOBE_FROM_PX = 10;
const GLOBE_TO_PX = 16;
// A globe still baking (task B0.9: bakes run through the job queue,
// jobs.js) is not shown: its flat disc and place markers stay, so nothing
// half-painted appears and the view never stops.
// How far a body has handed over from its disc to its globe: by size on
// screen (globeBlend), and only once its globe is ready.
export const globeShown = (id, radiusPx) => (readyGlobes.has(id) ? globeBlend(radiusPx) : 0);

export const globeBlend = (radiusPx) => Math.min(1, Math.max(0, (radiusPx - GLOBE_FROM_PX) / (GLOBE_TO_PX - GLOBE_FROM_PX)));
const MAX_GLOBES = 6;

const SPHERE = latLonSphere(128, 64);
// For bodies with a height map, so the relief has vertices to move; built on first use.
let fine = null;
const fineSphere = () => (fine ??= latLonSphere(512, 256));

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

// Emissive (lava) strength in linear light: the hottest lava reaches a
// luminance of about 2.6, over the bloom threshold of 2 (task B0.5).
const LAVA_GLOW = 4;
const ATMOSPHERE_SHELL = 1.06;
const CLOUD_SHELL = 1.01;
const atmosphereVertex = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vPos;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`;
const atmosphereFragment = /* glsl */ `
#include <logdepthbuf_pars_fragment>
${FROM_DISPLAY_GLSL}
uniform vec3 uColor;
uniform vec3 uLight;   // toward the star, view space; zero for none
uniform vec3 uCenter;  // the planet's centre, view space (km)
uniform float uRadius; // km
uniform float uOpacity;
uniform float uExposure;
varying vec3 vPos;
void main() {
  #include <logdepthbuf_fragment>
  vec3 r = normalize(vPos);
  float t = dot(uCenter, r);
  vec3 closest = r * t;
  float p = length(closest - uCenter) / uRadius; // 1 at the limb
  float glow;
  vec3 n;
  if (p < 1.0) {
    // Over the disc: haze, thickening toward the limb. Lit where the ray meets
    // the ground.
    float s = t - sqrt(1.0 - p * p) * uRadius;
    n = normalize(r * s - uCenter);
    glow = 0.08 + 0.92 * pow(p, 7.0);
  } else {
    // Beyond the limb: thinning with height.
    n = normalize(closest - uCenter);
    glow = exp(-(p - 1.0) / 0.012) + 0.25 * exp(-(p - 1.0) / 0.035);
    glow *= smoothstep(${ATMOSPHERE_SHELL.toFixed(3)}, ${(ATMOSPHERE_SHELL - 0.015).toFixed(3)}, p);
  }
  float sun = dot(uLight, uLight) > 0.0 ? dot(n, uLight) : 0.3;
  float lit = smoothstep(-0.25, 0.4, sun);
  // Warm where the light skims through at the terminator.
  vec3 col = mix(vec3(1.0, 0.55, 0.32), uColor, smoothstep(-0.1, 0.45, sun));
  float a = glow * lit * uOpacity * 0.85;
  gl_FragColor = vec4(fromDisplay(col * a) * uExposure, a);
}`;

function Globe({ info, blend }) {
  const group = useRef();
  const { body } = info;
  const appearance = body.appearance ?? {};
  const color = appearance.color ?? '#9a8f80';
  const maps = useMemo(() => surfaceMaps(body), [body]);
  useEffect(() => () => readyGlobes.delete(body.id), [body.id]);
  const invalidate = useThree((s) => s.invalidate);
  const surface = useMemo(() => new THREE.MeshStandardMaterial({
    color: maps.tint ? new THREE.Color(color) : new THREE.Color('#ffffff'),
    map: maps.map ?? null,
    displacementMap: maps.heightMap ?? null,
    displacementScale: maps.heightMap ? maps.heightScale : 0,
    bumpMap: maps.heightMap ?? null,
    normalMap: maps.normalMap ?? null,
    roughnessMap: maps.roughnessMap ?? null,
    emissiveMap: maps.emissiveMap ?? null,
    emissive: maps.emissiveMap ? new THREE.Color('#ffffff') : new THREE.Color('#000000'),
    roughness: 1, metalness: 0,
  }), [maps, color]);
  const atmosphere = useMemo(() => appearance.atmosphere && new THREE.ShaderMaterial({
    vertexShader: atmosphereVertex,
    fragmentShader: atmosphereFragment,
    uniforms: {
      uColor: { value: new THREE.Color(color).lerp(new THREE.Color('#9cc8ff'), 0.6).convertLinearToSRGB() }, // display color (color.js)
      uLight: { value: new THREE.Vector3() },
      uCenter: { value: new THREE.Vector3() },
      uRadius: { value: 1 },
      uOpacity: { value: 1 }, uExposure: EXPOSURE,
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }), [appearance.atmosphere, color]);
  const clouds = useMemo(() => maps.clouds && new THREE.MeshStandardMaterial({
    color: '#ffffff', alphaMap: maps.clouds, transparent: true, depthWrite: false, roughness: 1, metalness: 0,
  }), [maps]);
  // Rings light themselves: starlight skims along the ring plane, so a lit
  // material left them nearly black (seen after task 2.11). The planet's
  // shadow falls across them.
  const rings = useMemo(() => appearance.rings && ringMaterial(color), [appearance.rings, color]);

  const basis = useMemo(() => {
    const { lon0, lon90, north } = info.axes;
    return new THREE.Matrix4().makeBasis(new THREE.Vector3(...lon0), new THREE.Vector3(...lon90), new THREE.Vector3(...north));
  }, [info]);
  const inverseBasis = useMemo(() => basis.clone().invert(), [basis]);
  const rel = useMemo(() => [0, 0, 0], []);
  const light = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }) => {
    if (maps.ready !== false && !readyGlobes.has(body.id)) { readyGlobes.add(body.id); invalidate(); }
    const g = group.current;
    const cam = view.rig?.camera;
    if (!g || !cam) return;
    offsetKm(cam, info.place, rel);
    g.position.set(rel[0], rel[1], rel[2]);
    g.quaternion.setFromRotationMatrix(basis);
    g.scale.setScalar(info.radiusKm);
    const b = blend.current.get(body.id) ?? 0;
    g.visible = b > 0;
    surface.opacity = b;
    // Lava is light from the world: it takes exposure, and its hottest parts
    // pass the bloom threshold (Output.jsx, task B0.5).
    surface.emissiveIntensity = LAVA_GLOW * EXPOSURE.value;
    if (b > 0 && maps.emissiveMap) BLOOM.lava = true;
    surface.transparent = b < 1;
    if (clouds) clouds.opacity = b;
    if (rings) {
      rings.uniforms.uOpacity.value = b;
      // The direction to the star in the planet's own frame (the ring plane is
      // its equator), for the planet's shadow.
      if (info.toStar) rings.uniforms.uLight.value.set(...info.toStar).applyMatrix4(inverseBasis).normalize();
      rings.uniforms.uLit.value = info.toStar ? 1 : 0;
    }
    if (atmosphere) {
      atmosphere.uniforms.uOpacity.value = b;
      if (info.toStar) light.set(...info.toStar).transformDirection(camera.matrixWorldInverse);
      else light.set(0, 0, 0);
      atmosphere.uniforms.uLight.value.copy(light);
      atmosphere.uniforms.uCenter.value.set(rel[0], rel[1], rel[2]).applyMatrix4(camera.matrixWorldInverse);
      atmosphere.uniforms.uRadius.value = info.radiusKm;
    }
  }, -1);

  return (
    <group ref={group} userData={{ layer: 'globes', body: body.id }}>
      <mesh geometry={maps.heightMap ? fineSphere() : SPHERE} material={surface} />
      {clouds && <mesh geometry={SPHERE} material={clouds} scale={CLOUD_SHELL} />}
      {atmosphere && <mesh geometry={SPHERE} material={atmosphere} scale={ATMOSPHERE_SHELL} />}
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
  setBaker(useThree((s) => s.gl)); // before the globes ask for their maps

  const candidates = useMemo(() => map.bodies
    .filter((b) => GLOBE_TYPES.has(b.type) && view.targets.has(b.system) && !isHidden(index, b.id, playerMode))
    .map((b) => globeInfo(b, index, map.clock)), [map, index, playerMode]);
  const byId = useMemo(() => new Map(candidates.map((c) => [c.body.id, c])), [candidates]);

  useEffect(() => () => blend.current.clear(), []);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => whenTexturesLoad(invalidate), [invalidate]);

  const rel = useMemo(() => [0, 0, 0], []);
  useFrame(({ camera, size }) => {
    // Bakes, a few tiles a frame (B0.9); ask for another frame while any remain.
    const steps = TIERS[useMap.getState().quality].bakeSteps;
    if (runJobs({ maxSteps: steps, budgetMs: 6 })) invalidate();
    const cam = view.rig?.camera;
    if (!cam) return;
    const near = [];
    for (const c of candidates) {
      offsetKm(cam, c.place, rel);
      const px = c.radiusKm * pixelsPerKm(Math.hypot(...rel), camera.fov, size.height);
      const b = globeBlend(px);
      // Mounted by size, so its bake starts; shown once ready.
      blend.current.set(c.body.id, readyGlobes.has(c.body.id) ? b : 0);
      if (b > 0) near.push([px, c.body.id]);
    }
    near.sort((a, b) => b[0] - a[0]);
    const ids = near.slice(0, MAX_GLOBES).map(([, id]) => id);
    // The globes drawn, for hiding the names behind them (occlusion.js).
    globes.length = 0;
    for (const id of ids) {
      const c = byId.get(id);
      if ((blend.current.get(id) ?? 0) < 0.5) continue;
      globes.push({ c: offsetKm(cam, c.place, [0, 0, 0]), r: c.radiusKm });
    }
    if (ids.join() !== shown.join()) setShown(ids);
    // Light from the star of the largest globe's system, aimed at it.
    const main = byId.get(ids[0]);
    if (sun.current && ambient.current) {
      sun.current.intensity = (main?.toStar ? 3.6 : 0) * EXPOSURE.value;
      ambient.current.intensity = (main?.toStar ? 0.06 : 0.35) * EXPOSURE.value;
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
      {shown.map((id) => {
        const info = byId.get(id);
        if (!info) return null;
        // Imported or registered maps win; otherwise worlds are procedural
        // when the WIP switch is on (planet/switch.js).
        return WIP_WORLDS && hasRecipe(info.body) && !surfaceMaps(info.body, { builtIn: false })
          ? <ProceduralGlobe key={id} info={info} blend={blend} places={map.places} index={index} />
          : <Globe key={id} info={info} blend={blend} />;
      })}
    </>
  );
}
