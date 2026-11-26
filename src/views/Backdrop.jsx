// The far sky behind the map: the galaxy the Basin sits in. It is scenery,
// not map data: nothing here can be clicked, it never moves with the camera
// (only turns with it), and it stays dimmer and smaller than every map star.
//
// The sky follows the map's axes (docs/PLAN.md): the Basin lies in the
// galactic plane (x–y), +y is coreward and z is out of the plane. So the
// galaxy's band runs along the map's own plane, thick, dense and warm toward
// the core (+y), thin and faint rimward (−y), split by dark dust lanes that
// are heaviest coreward. Looking face-on at the map is looking out of the
// galaxy, toward its pole, where the sky is sparse; tilt the view to look
// across the map coreward to see the core.
//
// The band is painted once, when the map opens, into a sky texture laid out
// by galactic longitude and latitude (one render to a texture, so the detail
// costs nothing per frame), then drawn on a sphere around the camera. The
// stars are points scattered to the same density. Two draw calls per frame;
// both are drawn first, with no depth, so everything on the map covers them:
// they are in three.js's opaque list (not "transparent", though they blend by
// adding light), which is drawn before everything else. The camera sits at the
// scene origin (floating origin), so a sphere of directions centred there is
// always the sky.

import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { random } from './surfaces.js';
import { FROM_DISPLAY_GLSL } from './color.js';
import { EXPOSURE } from './exposure.js';

const SKY_KM = 1e9; // any distance well inside the far plane; only directions matter
// Galactic frame in scene axes: toward the core, along the rotation, the pole.
const CORE = [0, 1, 0];
const ALONG = [1, 0, 0];
const POLE = [0, 0, 1];
const TEXTURE = [2048, 1024];
const STARS = 15000;

// Shared GLSL: value noise and the galaxy's shape, in galactic longitude l
// (0 at the core, ±π rimward) and latitude b, with d the direction in the
// galactic frame (x core, y along, z pole).
const GALAXY = /* glsl */ `
  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { s += a * noise(p); p = p * 2.07 + 3.1; a *= 0.5; } return s; }

  vec3 galaxy(float l, float b, vec3 d) {
    float core = exp(-l * l / 1.1);                  // 1 toward the core, 0 rimward
    float H = mix(0.045, 0.15, core);                 // the disc's half-thickness, radians
    float warp = 0.018 * sin(l * 1.7 + 0.6);          // the band isn't perfectly straight
    float bb = b - warp;
    float disc = exp(-bb * bb / (2.0 * H * H)) * mix(0.32, 1.0, pow(core, 0.6));
    float wide = exp(-bb * bb / (2.0 * 9.0 * H * H)) * mix(0.05, 0.25, core); // the thick disc's haze
    // The bulge: a flattened glow round the core itself.
    float r = sqrt(l * l + bb * bb * 2.2);
    float bulge = 1.3 * exp(-r * r / 0.05) + 0.45 * exp(-r * r / 0.3);

    float clouds = fbm(d * 5.0);
    float grain = fbm(d * 22.0 + 7.0);

    // Dust: a great rift along the plane, heaviest coreward, and patches.
    float riftAt = 0.012 * sin(l * 3.0 + 1.0) + 0.03 * (fbm(d * 4.0 + 11.0) - 0.5);
    float riftW = H * mix(0.5, 0.3, core);
    float rift = exp(-pow((bb - riftAt) / riftW, 2.0)) * mix(0.35, 1.0, core);
    // Dust in threads rather than blobs: ridged noise, thin where it folds.
    vec3 q = d * 6.0 + 1.6 * vec3(fbm(d * 2.5 + 1.0), fbm(d * 2.5 + 4.0), fbm(d * 2.5 + 9.0)); // swirled
    float threads = pow(1.0 - abs(2.0 * fbm(q) - 1.0), 5.0) * smoothstep(0.35, 0.65, fbm(d * 3.0 + 13.0));
    float patches = (0.7 * threads + 0.25 * smoothstep(0.55, 0.8, fbm(d * 18.0 + 8.0))) * exp(-bb * bb / (2.0 * 1.4 * H * H));
    float dust = clamp(rift * (0.45 + 0.6 * fbm(d * 16.0 + 5.0)) + patches * mix(0.5, 1.0, core), 0.0, 0.9);

    vec3 discColor = mix(vec3(0.62, 0.7, 0.92), vec3(0.98, 0.86, 0.7), pow(core, 0.8));
    vec3 col = (discColor * (disc * (0.35 + 1.1 * clouds) * (0.75 + 0.5 * grain) + wide) + vec3(1.0, 0.8, 0.58) * bulge * (0.8 + 0.4 * clouds));
    // Glowing gas where stars form: faint pink knots along the disc.
    float knots = smoothstep(0.66, 0.86, fbm(d * 11.0 + 21.0)) * disc;
    col += vec3(0.9, 0.38, 0.5) * knots * 0.35;
    // Dust dims the light and reddens what gets through.
    col *= (1.0 - dust) * mix(vec3(1.0), vec3(1.0, 0.72, 0.52), dust * 0.8);
    // A very faint glow over the whole sky, brighter toward the core.
    col += vec3(0.5, 0.55, 0.7) * 0.03 * (1.0 + 2.0 * core * exp(-b * b / 0.5));
    // Exposure, with a soft shoulder that keeps the brightest core well below
    // the map's own stars.
    return 0.55 * (1.0 - exp(-col * 0.5));
  }
`;

// Paint the band into a texture laid out by longitude (u, core at the middle)
// and latitude (v).
function bakeSky(gl) {
  // Half floats where the GPU can draw to them: 8 bits showed steps in the
  // faint haze.
  const half = gl.extensions.has('EXT_color_buffer_half_float') || gl.extensions.has('EXT_color_buffer_float');
  const target = new THREE.WebGLRenderTarget(TEXTURE[0], TEXTURE[1], { depthBuffer: false, type: half ? THREE.HalfFloatType : THREE.UnsignedByteType });
  target.texture.wrapS = THREE.RepeatWrapping;
  target.texture.generateMipmaps = false;
  const material = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      ${GALAXY}
      void main() {
        float l = (vUv.x - 0.5) * 6.2831853;
        float b = (vUv.y - 0.5) * 3.1415927;
        vec3 d = vec3(cos(b) * cos(l), cos(b) * sin(l), sin(b));
        gl_FragColor = vec4(galaxy(l, b, d), 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  const before = gl.getRenderTarget();
  gl.setRenderTarget(target);
  gl.render(scene, new THREE.Camera());
  gl.setRenderTarget(before);
  material.dispose();
  return target;
}

// The sky sphere: looks up each direction's longitude and latitude.
const skyMaterial = (texture) => new THREE.ShaderMaterial({
  uniforms: {
    uSky: { value: texture }, uExposure: EXPOSURE,
    uCore: { value: new THREE.Vector3(...CORE) }, uAlong: { value: new THREE.Vector3(...ALONG) }, uPole: { value: new THREE.Vector3(...POLE) },
  },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    ${FROM_DISPLAY_GLSL}
    uniform sampler2D uSky;
    uniform float uExposure;
    uniform vec3 uCore, uAlong, uPole;
    varying vec3 vDir;
    void main() {
      vec3 d = normalize(vDir);
      float l = atan(dot(d, uAlong), dot(d, uCore));
      float b = asin(clamp(dot(d, uPole), -1.0, 1.0));
      vec3 c = texture2D(uSky, vec2(l / 6.2831853 + 0.5, b / 3.1415927 + 0.5)).rgb;
      // A little noise against banding on the 8-bit screen.
      c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
      gl_FragColor = vec4(fromDisplay(max(c, 0.0)) * uExposure, 1.0);
    }`,
  side: THREE.BackSide, depthTest: false, depthWrite: false,
  blending: THREE.AdditiveBlending,
});

// How crowded the sky is in a direction, 0–1, matching the band's shape
// (without its noise).
function crowding(l, b) {
  const core = Math.exp(-(l * l) / 1.1);
  const H = 0.045 + (0.15 - 0.045) * core;
  const bb = b - 0.018 * Math.sin(l * 1.7 + 0.6);
  const disc = Math.exp(-(bb * bb) / (2 * H * H)) * (0.32 + 0.68 * core ** 0.6);
  const r2 = l * l + bb * bb * 2.2;
  return Math.min(1, disc + 1.2 * Math.exp(-r2 / 0.05) + 0.3 * Math.exp(-r2 / 0.3));
}

function starPoints() {
  const rnd = random('backdrop-stars');
  const pos = new Float32Array(STARS * 3);
  const look = new Float32Array(STARS * 4); // display colour, brightness
  for (let i = 0; i < STARS; i++) {
    // A third scattered evenly over the sky; the rest crowd into the band
    // and the core, as many as its brightness says.
    let l, b, c;
    for (;;) {
      l = (rnd() * 2 - 1) * Math.PI;
      b = Math.asin(rnd() * 2 - 1);
      c = crowding(l, b);
      if (i < STARS / 3 || rnd() < c) break;
    }
    const cb = Math.cos(b);
    const d = [0, 1, 2].map((k) => SKY_KM * (cb * Math.cos(l) * CORE[k] + cb * Math.sin(l) * ALONG[k] + Math.sin(b) * POLE[k]));
    pos.set(d, i * 3);
    // Most are barely there; a few are a little brighter. Stars in the band
    // are fainter on average (more, further away), and redder toward the core.
    const inBand = i >= STARS / 3;
    let bright = (inBand ? 0.07 : 0.1) + (inBand ? 0.3 : 0.42) * rnd() ** 4;
    const t = rnd();
    const warm = inBand ? Math.exp(-(l * l) / 1.1) * 0.5 : 0;
    const col = t < 0.18 - warm * 0.2 ? [0.78, 0.86, 1] : t < 0.78 - warm ? [0.96, 0.95, 0.97] : [1, 0.85, 0.68];
    // Inside the dust rift fewer stars show through.
    if (inBand && Math.abs(b - 0.012 * Math.sin(l * 3 + 1)) < 0.02 + 0.03 * Math.exp(-(l * l) / 1.1) && rnd() < 0.7) bright *= 0.3;
    look.set([...col, bright], i * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aLook', new THREE.BufferAttribute(look, 4));
  return g;
}

const starMaterial = () => new THREE.ShaderMaterial({
  uniforms: { uScale: { value: 1 }, uExposure: EXPOSURE },
  vertexShader: /* glsl */ `
    attribute vec4 aLook;
    uniform float uScale;
    varying vec4 vLook;
    void main() {
      vLook = aLook;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = (1.1 + 2.0 * aLook.a) * uScale;
    }`,
  fragmentShader: /* glsl */ `
    ${FROM_DISPLAY_GLSL}
    uniform float uExposure;
    varying vec4 vLook;
    void main() {
      float r = length(gl_PointCoord - 0.5) * 2.0;
      float a = vLook.a * smoothstep(1.0, 0.15, r);
      gl_FragColor = vec4(fromDisplay(vLook.rgb * a) * uExposure, a);
    }`,
  depthTest: false, depthWrite: false,
  blending: THREE.AdditiveBlending,
});

export default function Backdrop() {
  const gl = useThree((s) => s.gl);
  const [sky, stars, band] = useMemo(() => {
    const sky = bakeSky(gl);
    const s = new THREE.Points(starPoints(), starMaterial());
    s.material.uniforms.uScale.value = Math.min(2, window.devicePixelRatio || 1);
    const b = new THREE.Mesh(new THREE.SphereGeometry(SKY_KM, 64, 32), skyMaterial(sky.texture));
    for (const [o, order] of [[b, -1001], [s, -1000]]) {
      o.frustumCulled = false;
      o.renderOrder = order;
      o.userData.layer = 'backdrop';
    }
    return [sky, s, b];
  }, [gl]);
  useEffect(() => () => {
    sky.dispose();
    for (const o of [stars, band]) { o.geometry.dispose(); o.material.dispose(); }
  }, [sky, stars, band]);
  return (
    <>
      <primitive object={band} />
      <primitive object={stars} />
    </>
  );
}
