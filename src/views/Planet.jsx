// The planet level (task 2.10): a real globe for any round body that is large
// on screen (planets, giants, moons, asteroids, rogue planets, wrecks, the
// Orrery's structure), crossfading with the flat disc System.jsx draws below
// that size (globeBlend).
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
//               (procedural.js paints them). Globes only show within ~40
//               radii, where both gaps are inside the depth rule of task 2.4
//               (gap ≥ 2 × 10^-4 × distance)
//   rings       in the equatorial plane (appearance.rings), lighting themselves
// Globes are turned by globe.js (P16). Precision: globes are only drawn close
// up, so ordinary shaders with varying values are fine here.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { displayColor } from './color.js';
import { useMap, isHidden } from '../data/store.js';
import { bodyOffsetKm, daysSinceEpoch } from '../data/orbits.js';
import { bodyAxes } from '../data/globe.js';
import { offsetKm, place, pixelsPerKm } from './origin.js';
import { view } from './camera/view.js';
import { bodyRadiusKm, GLOBE_TYPES } from './mapTargets.js';
import { latLonSphere } from './globeGeometry.js';
import { surfaceMaps, random, whenTexturesLoad, setBaker } from './surfaces.js';
import './procedural.js'; // registers the procedural surfaces
import { globes } from './occlusion.js';

// Radius on screen (CSS px) over which the flat disc hands over to the globe.
const GLOBE_FROM_PX = 10;
const GLOBE_TO_PX = 16;
export const globeBlend = (radiusPx) => Math.min(1, Math.max(0, (radiusPx - GLOBE_FROM_PX) / (GLOBE_TO_PX - GLOBE_FROM_PX)));
const MAX_GLOBES = 6;

const SPHERE = latLonSphere(128, 64);
// For bodies with a height map, so the relief has vertices to move; built on first use.
let fine = null;
const fineSphere = () => (fine ??= latLonSphere(512, 256));
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

// Ring textures, along the ring from its inner edge to its outer edge: how
// opaque (bands and gaps, kept linear) and how light (a little variation).
const ringTextures = (() => {
  let made = null;
  return () => {
    if (made) return made;
    const rand = random('rings');
    const W = 512;
    // Three broad rings: a faint inner one, a dense middle one and a fainter
    // outer one past a wide gap, with fine banding over all three.
    const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const zone = (t, a, b, edge) => smoothstep(a, a + edge, t) * (1 - smoothstep(b - edge, b, t));
    const fine = Array.from({ length: 40 }, () => [rand(), 0.002 + 0.01 * rand(), rand() * 2 - 1]);
    const gaps = [[0.635, 0.018, 0.92], [0.885, 0.005, 0.85], [0.33, 0.004, 0.5]];
    const alpha = (t) => {
      let a = 0.28 * zone(t, 0, 0.22, 0.04) + 0.92 * zone(t, 0.2, 0.62, 0.03) + 0.62 * zone(t, 0.64, 1, 0.02);
      for (const [c, w, s] of fine) a *= 1 + 0.22 * s * Math.exp(-(((t - c) / w) ** 2));
      for (const [c, w, d] of gaps) a *= 1 - d * Math.exp(-(((t - c) / w) ** 2));
      return Math.min(0.97, Math.max(0, a));
    };
    const paint = (value, color) => {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      for (let x = 0; x < W; x++) {
        const v = Math.round(255 * value(x / (W - 1)));
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, 0, 1, 1);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.NoColorSpace; // read as written: the ring shader writes display values
      return tex;
    };
    made = { alpha: paint(alpha), light: paint((t) => 0.74 + 0.16 * rand() + 0.1 * Math.sin(t * 40)) };
    return made;
  };
})();

// The ring material. Its position varies only across one planet's rings (a few
// radii, in the planet's own units), so plain varyings are fine here.
function ringMaterial(color) {
  const t = ringTextures();
  return new THREE.ShaderMaterial({
    uniforms: {
      uAlpha: { value: t.alpha }, uLightMap: { value: t.light },
      uColor: { value: displayColor(new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.45).getHex()) },
      uOpacity: { value: 1 }, uLight: { value: new THREE.Vector3(1, 0, 0) }, uLit: { value: 0 },
    },
    vertexShader: /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec2 vUv;
      varying vec3 vLocal;
      void main() {
        vUv = uv;
        vLocal = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_fragment>
      uniform sampler2D uAlpha, uLightMap;
      uniform vec3 uColor, uLight;
      uniform float uOpacity, uLit;
      varying vec2 vUv;
      varying vec3 vLocal;
      void main() {
        #include <logdepthbuf_fragment>
        float a = texture2D(uAlpha, vUv).r;
        vec3 col = uColor * texture2D(uLightMap, vUv).r;
        // In the planet's shadow: the way to the star passes through the planet
        // (radius 1 in these units).
        float s = -dot(vLocal, uLight);
        float shade = 1.0;
        if (uLit > 0.5 && s > 0.0) shade = mix(0.12, 1.0, smoothstep(0.96, 1.03, length(vLocal + s * uLight)));
        gl_FragColor = vec4(col * shade, a * uOpacity);
      }`,
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
  });
}

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
uniform vec3 uColor;
uniform vec3 uLight;   // toward the star, view space; zero for none
uniform vec3 uCenter;  // the planet's centre, view space (km)
uniform float uRadius; // km
uniform float uOpacity;
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
  gl_FragColor = vec4(col * a, a);
}`;

function Globe({ info, blend }) {
  const group = useRef();
  const { body } = info;
  const appearance = body.appearance ?? {};
  const color = appearance.color ?? '#9a8f80';
  const maps = useMemo(() => surfaceMaps(body), [body]);
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
      uOpacity: { value: 1 },
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
