// The far sky behind the map: faint background stars and the glow of the
// galaxy's band. It is scenery, not map data: nothing here can be clicked, it
// never moves with the camera (only turns with it), and it stays dimmer and
// smaller than every map star so the two are never confused.
//
// Two draw calls: the stars as points, the band as a sphere around the camera.
// Both are drawn first, with no depth, so everything on the map covers them:
// they are in three.js's opaque list (not "transparent", though they blend by
// adding light), which is drawn before everything else.
// The camera sits at the scene origin (floating origin), so a sphere of
// directions centred there is always the sky.

import { useMemo } from 'react';
import * as THREE from 'three';
import { random } from './surfaces.js';

const COUNT = 4200;
const SKY_KM = 1e9; // any distance well inside the far plane; only directions matter
// The galaxy's plane, tilted against the map's own so the band crosses the view.
const BAND_NORMAL = new THREE.Vector3(0.32, 0.86, -0.4).normalize();

function starPoints() {
  const rnd = random('backdrop-stars');
  const pos = new Float32Array(COUNT * 3);
  const look = new Float32Array(COUNT * 4); // display colour, brightness
  const n = BAND_NORMAL;
  const u = new THREE.Vector3(1, 0, 0).cross(n).normalize();
  const w = n.clone().cross(u);
  const v = new THREE.Vector3();
  for (let i = 0; i < COUNT; i++) {
    // About half the stars crowd toward the band, the rest scatter evenly.
    const lon = rnd() * Math.PI * 2;
    const inBand = rnd() < 0.5;
    const s = inBand ? (rnd() + rnd() + rnd() - 1.5) * 0.28 : rnd() * 2 - 1;
    const lat = Math.asin(Math.max(-1, Math.min(1, s)));
    v.copy(u).multiplyScalar(Math.cos(lat) * Math.cos(lon))
      .addScaledVector(w, Math.cos(lat) * Math.sin(lon))
      .addScaledVector(n, Math.sin(lat))
      .multiplyScalar(SKY_KM);
    pos.set([v.x, v.y, v.z], i * 3);
    // Most are barely there; a few are a little brighter. Tints from cool
    // blue-white to warm orange, all pale.
    const b = 0.1 + 0.42 * rnd() ** 3.5;
    const t = rnd();
    const c = t < 0.2 ? [0.78, 0.85, 1] : t < 0.8 ? [0.95, 0.95, 0.97] : [1, 0.86, 0.7];
    look.set([...c, b], i * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aLook', new THREE.BufferAttribute(look, 4));
  return g;
}

const starMaterial = () => new THREE.ShaderMaterial({
  uniforms: { uScale: { value: 1 } },
  vertexShader: /* glsl */ `
    attribute vec4 aLook;
    uniform float uScale;
    varying vec4 vLook;
    void main() {
      vLook = aLook;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = (1.0 + 1.2 * aLook.a) * uScale;
    }`,
  fragmentShader: /* glsl */ `
    varying vec4 vLook;
    void main() {
      float r = length(gl_PointCoord - 0.5) * 2.0;
      float a = vLook.a * smoothstep(1.0, 0.2, r);
      gl_FragColor = vec4(vLook.rgb * a, a);
    }`,
  depthTest: false, depthWrite: false,
  blending: THREE.AdditiveBlending,
});

// The band: brightest along the galaxy's plane, broken up by soft clouds and
// darker dust, all very faint.
const bandMaterial = () => new THREE.ShaderMaterial({
  uniforms: { uNormal: { value: BAND_NORMAL } },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uNormal;
    varying vec3 vDir;
    float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float noise(vec3 p) {
      vec3 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
                 mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
    void main() {
      vec3 d = normalize(vDir);
      float lat = dot(d, uNormal);
      float band = exp(-lat * lat / 0.018) + 0.35 * exp(-lat * lat / 0.09);
      float clouds = fbm(d * 3.0);
      float dust = smoothstep(0.45, 0.75, fbm(d * 6.0 + 7.0)) * exp(-lat * lat / 0.004);
      float glow = band * (0.45 + 0.9 * clouds) * (1.0 - 0.7 * dust);
      vec3 col = mix(vec3(0.55, 0.62, 0.8), vec3(0.85, 0.78, 0.68), clouds);
      gl_FragColor = vec4(col * glow * 0.075, 1.0);
    }`,
  side: THREE.BackSide, depthTest: false, depthWrite: false,
  blending: THREE.AdditiveBlending,
});

export default function Backdrop() {
  const [stars, band] = useMemo(() => {
    const s = new THREE.Points(starPoints(), starMaterial());
    s.material.uniforms.uScale.value = Math.min(2, window.devicePixelRatio || 1);
    const b = new THREE.Mesh(new THREE.SphereGeometry(SKY_KM, 48, 24), bandMaterial());
    for (const [o, order] of [[b, -1001], [s, -1000]]) {
      o.frustumCulled = false;
      o.renderOrder = order;
      o.userData.layer = 'backdrop';
    }
    return [s, b];
  }, []);
  return (
    <>
      <primitive object={band} />
      <primitive object={stars} />
    </>
  );
}
