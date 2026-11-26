// The system level (task 2.9): every body at its place on the clock's date,
// and orbit lines.
//   bodies  one instanced draw call. Planets, giants, moons, asteroids and the
//           center bodies of starless systems are drawn as discs shaded from
//           the direction of their system's star (a rogue planet, with no
//           star, gets only faint light); stations as small squares, lane
//           mouths as diamonds, fields as soft clouds. True size when close,
//           never smaller than a few pixels.
//   orbits  screen-space strips (strip.js), 128 pieces to an orbit; belts as
//           a wide faint band. Bodies with no period (lane mouths, the gate)
//           have no orbit line.
// A system's bodies fade in as the camera comes within a few framing
// distances of it; a moon or station shows only once it is a few pixels
// apart from what it orbits. Companion stars are drawn by Stars.jsx.
// As with the stars and lanes, only values that are the same at every corner
// of a shape reach the fragment shader.

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMap, isHidden } from '../data/store.js';
import { displayColor } from './color.js';
import { bodyOffsetKm, daysSinceEpoch, orbitPoint, KM_PER_AU } from '../data/orbits.js';
import { offsetKm, place, pixelsPerKm } from './origin.js';
import { view } from './camera/view.js';
import { bodyRadiusKm, GLOBE_TYPES } from './mapTargets.js';
import { globeBlend } from './Planet.jsx';
import { stripVertex, stripFragment, screenMaterial, quadGeometry, STRIP_CORNERS, STRIP_ATTRS } from './strip.js';

// How visible each body is this frame (0–1), for the body labels.
export const bodyAlpha = new Map();

const SEGMENTS = 128;
const FADE_IN = [4, 14]; // a system's bodies: shown within 4 framing distances, gone beyond 14
const APART_PX = [3, 9]; // a body shows as it comes this many pixels apart from what it orbits

// Shape, smallest size (CSS px) and color for each body type.
const LOOK = {
  planet: { shape: 0, minPx: 4, color: '#9a8f80' },
  'gas-giant': { shape: 0, minPx: 5, color: '#c8b48a' },
  moon: { shape: 0, minPx: 3, color: '#a8a8a8' },
  asteroid: { shape: 0, minPx: 2.5, color: '#8a8070' },
  'rogue-planet': { shape: 0, minPx: 4, color: '#7f9bb8' },
  wreck: { shape: 0, minPx: 4, color: '#a08a6a' },
  structure: { shape: 0, minPx: 4, color: '#9aa0aa' },
  station: { shape: 1, minPx: 6, color: '#d8dde6' },
  'lane-mouth': { shape: 2, minPx: 8, color: '#79c8e3' },
  field: { shape: 3, minPx: 12, color: '#a0c8ff' },
};
const ORBIT = { color: '#8796ad', alpha: 0.28, width: 1 };
const BELT = { color: '#b49a78', alpha: 0.16, width: 7 };

const bodyVertex = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec4 aColor;
attribute float aRadius;
attribute float aMinPx;
attribute float aShape;
attribute vec3 aLight;
uniform vec2 uViewport;
uniform float uPixelRatio;
flat varying vec2 vCenter;
flat varying float vRadius;
flat varying vec4 vColor;
flat varying float vShape;
flat varying vec3 vLight;
void main() {
  vec4 c = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  if (c.w <= 0.0 || aColor.a < 0.003) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float r = max(aRadius * projectionMatrix[1][1] / c.w * 0.5 * uViewport.y, 0.5 * aMinPx * uPixelRatio);
  vCenter = (c.xy / c.w * 0.5 + 0.5) * uViewport;
  vRadius = r;
  vColor = aColor;
  vShape = aShape;
  vLight = dot(aLight, aLight) > 0.0 ? normalize(mat3(viewMatrix) * aLight) : vec3(0.0);
  gl_Position = c;
  gl_Position.xy += position.xy * 4.0 * (r + 2.0) / uViewport * c.w;
  #include <logdepthbuf_vertex>
}`;

const bodyFragment = /* glsl */ `
#include <logdepthbuf_pars_fragment>
uniform float uPixelRatio;
flat varying vec2 vCenter;
flat varying float vRadius;
flat varying vec4 vColor;
flat varying float vShape;
flat varying vec3 vLight;
void main() {
  #include <logdepthbuf_fragment>
  vec2 p = gl_FragCoord.xy - vCenter;
  float r = vRadius;
  float hw = 0.6 * uPixelRatio;
  vec3 rgb = vColor.rgb;
  float a;
  if (vShape < 0.5) {
    // A sphere: normal from the pixel's place on the disc, lit from the star.
    vec2 q = p / r;
    float d = length(q);
    a = 1.0 - smoothstep(1.0 - 0.8 / r, 1.0 + 0.8 / r, d);
    vec3 n = vec3(q, sqrt(max(0.0, 1.0 - d * d)));
    float lit = dot(vLight, vLight) > 0.0 ? max(dot(n, vLight), 0.0) : 0.25;
    // Small discs are kept evenly bright so a dot stays visible.
    float shade = mix(1.0, 0.1 + 0.9 * lit, smoothstep(3.0, 8.0, r));
    rgb *= shade;
  } else if (vShape < 1.5) {
    vec2 b = abs(p) - vec2(0.55 * r);
    float box = abs(max(b.x, b.y));
    a = 1.0 - smoothstep(hw - 0.5, hw + 0.5, box);
  } else if (vShape < 2.5) {
    float dia = abs(abs(p.x) + abs(p.y) - 0.75 * r) * 0.7071;
    a = 1.0 - smoothstep(hw - 0.5, hw + 0.5, dia);
  } else {
    float d = length(p) / r;
    a = 0.35 * exp(-d * d * 3.0) * (1.0 - smoothstep(0.85, 1.0, d));
  }
  a *= vColor.a;
  if (a < 0.004) discard;
  gl_FragColor = vec4(rgb * a, a);
}`;

const orbitKm = (o) => o.distance * (o.unit === 'au' ? KM_PER_AU : 1);

export default function System() {
  const map = useMap((s) => s.map);
  const index = useMap((s) => s.index);
  const playerMode = useMap((s) => s.playerMode);

  // Bodies drawn, with their place, size and look; orbits, as rings of points.
  const { bodies, orbits } = useMemo(() => {
    const days = daysSinceEpoch(map.clock);
    const cache = new Map();
    const bodies = [];
    const orbits = [];
    for (const b of map.bodies) {
      const system = index.byId.get(b.system);
      if (isHidden(index, b.id, playerMode) || !view.targets.has(b.system) || b.type === 'star') continue;
      const offset = bodyOffsetKm(b, index, days, cache);
      const parentOffset = b.parent ? bodyOffsetKm(index.byId.get(b.parent), index, days, cache) : [0, 0, 0];
      const look = LOOK[b.type];
      if (look) {
        const len = Math.hypot(...offset);
        const lit = system.center.type === 'star' && len > 0;
        bodies.push({
          body: b, system, look,
          place: place(system.pos, offset),
          radiusKm: bodyRadiusKm(b),
          color: displayColor(b.appearance?.color ?? look.color),
          light: lit ? offset.map((v) => -v / len) : [0, 0, 0],
          apartKm: b.orbit ? orbitKm(b.orbit) : 0,
          parentPlace: place(system.pos, parentOffset),
        });
      }
      if (b.orbit?.periodDays) {
        const ring = Array.from({ length: SEGMENTS + 1 }, (_, i) => {
          const pt = orbitPoint(b.orbit, (2 * Math.PI * i) / SEGMENTS);
          return pt.map((v, k) => v + parentOffset[k]);
        });
        orbits.push({ body: b, system, ring, style: b.type === 'asteroid-belt' ? BELT : ORBIT, radiusKm: orbitKm(b.orbit), parentPlace: place(system.pos, parentOffset) });
      }
    }
    return { bodies, orbits };
  }, [map, index, playerMode]);

  const bodyMesh = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    const attr = (name, size) => g.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(bodies.length * size), size));
    attr('aColor', 4); attr('aRadius', 1); attr('aMinPx', 1); attr('aShape', 1); attr('aLight', 3);
    bodies.forEach((it, i) => {
      g.attributes.aRadius.setX(i, it.radiusKm);
      g.attributes.aMinPx.setX(i, it.look.minPx);
      g.attributes.aShape.setX(i, it.look.shape);
      g.attributes.aLight.setXYZ(i, ...it.light);
    });
    const m = new THREE.ShaderMaterial({
      vertexShader: bodyVertex,
      fragmentShader: bodyFragment,
      uniforms: { uViewport: { value: new THREE.Vector2() }, uPixelRatio: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const mesh = new THREE.InstancedMesh(g, m, bodies.length);
    mesh.frustumCulled = false;
    mesh.userData.layer = 'bodies';
    mesh.userData.ids = bodies.map((it) => it.body.id);
    return mesh;
  }, [bodies]);

  const orbitMesh = useMemo(() => {
    const g = quadGeometry(STRIP_CORNERS, orbits.length * SEGMENTS, STRIP_ATTRS);
    g.instanceCount = 0;
    const mesh = new THREE.Mesh(g, screenMaterial(stripVertex, stripFragment));
    mesh.frustumCulled = false;
    mesh.renderOrder = -1;
    mesh.userData.layer = 'orbits';
    return mesh;
  }, [orbits]);

  const tmp = useMemo(() => ({ rel: [0, 0, 0], base: [0, 0, 0], m: new THREE.Matrix4(), c: new THREE.Color() }), []);

  useFrame(({ camera, size, viewport }) => {
    const cam = view.rig?.camera;
    if (!cam) return;
    const { rel, base, m, c } = tmp;
    const perKmAt = (d) => pixelsPerKm(d, camera.fov, size.height);
    const smooth = (x, [lo, hi]) => Math.min(1, Math.max(0, (x - lo) / (hi - lo)));

    // How far each system's bodies are shown, by the camera's distance to it.
    const shown = new Map();
    const systemAlpha = (sys) => {
      if (!shown.has(sys.id)) {
        const t = view.targets.get(sys.id);
        offsetKm(cam, t.place, rel);
        const d = Math.hypot(...rel) / t.viewKm;
        shown.set(sys.id, 1 - smooth(d, FADE_IN));
      }
      return shown.get(sys.id);
    };
    // How far apart on screen a thing is from what it orbits.
    const apart = (parentPlace, km) => {
      offsetKm(cam, parentPlace, rel);
      return km * perKmAt(Math.hypot(...rel));
    };

    // Bodies.
    const g = bodyMesh.geometry;
    bodyMesh.material.uniforms.uViewport.value.set(size.width * viewport.dpr, size.height * viewport.dpr);
    bodyMesh.material.uniforms.uPixelRatio.value = viewport.dpr;
    bodies.forEach((it, i) => {
      let alpha = systemAlpha(it.system);
      if (alpha > 0 && it.apartKm) alpha *= smooth(apart(it.parentPlace, it.apartKm), APART_PX);
      offsetKm(cam, it.place, rel);
      bodyAlpha.set(it.body.id, alpha); // shown at all (for labels), globe or disc
      // Round bodies hand over to their globe (Planet.jsx) as they grow on screen.
      if (alpha > 0 && GLOBE_TYPES.has(it.body.type)) alpha *= 1 - globeBlend(it.radiusKm * perKmAt(Math.hypot(...rel)));
      bodyMesh.setMatrixAt(i, m.makeTranslation(rel[0], rel[1], rel[2]));
      g.attributes.aColor.setXYZW(i, it.color.r, it.color.g, it.color.b, alpha);
    });
    bodyMesh.instanceMatrix.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
    bodyMesh.visible = bodies.some((it, i) => g.attributes.aColor.getW(i) > 0); // no draw call at the Basin

    // Orbits of the systems in view.
    const og = orbitMesh.geometry;
    const { aStart, aEnd, aColor, aWidth } = og.attributes;
    let n = 0;
    for (const o of orbits) {
      let alpha = systemAlpha(o.system);
      if (alpha <= 0) continue;
      alpha *= smooth(apart(o.parentPlace, o.radiusKm), [6, 18]);
      if (alpha <= 0) continue;
      offsetKm(cam, place(o.system.pos), base);
      displayColor(o.style.color, c);
      for (let i = 0; i < SEGMENTS; i++) {
        const p0 = o.ring[i], p1 = o.ring[i + 1];
        aStart.setXYZ(n, base[0] + p0[0], base[1] + p0[1], base[2] + p0[2]);
        aEnd.setXYZ(n, base[0] + p1[0], base[1] + p1[1], base[2] + p1[2]);
        aColor.setXYZW(n, c.r, c.g, c.b, o.style.alpha * alpha);
        aWidth.setX(n, o.style.width);
        n++;
      }
    }
    og.instanceCount = n;
    for (const a of [aStart, aEnd, aColor, aWidth]) a.needsUpdate = true;
    orbitMesh.material.uniforms.uViewport.value.set(size.width * viewport.dpr, size.height * viewport.dpr);
    orbitMesh.material.uniforms.uPixelRatio.value = viewport.dpr;
  }, -1);

  return (
    <>
      <primitive object={orbitMesh} />
      <primitive object={bodyMesh} />
    </>
  );
}
