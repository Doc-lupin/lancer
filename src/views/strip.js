// Lines drawn as strips of constant width in screen pixels, used by the lanes
// (task 2.7) and the orbit lines (task 2.9).
//
// Each piece is one instance: its two ends (camera-relative, km), a color with
// opacity, and a width in CSS pixels. The vertex shader clips the piece to the
// camera's near plane, projects both ends to device pixels and builds the
// strip there; the fragment shader smooths its edges by the distance from the
// segment. Only values that are the same at every corner reach the fragment
// shader, because values that vary across a shape fail at light-year
// distances (task 2.6). Drawn without depth testing, before everything else.

import * as THREE from 'three';
import { CAMERA } from './origin.js';

// Trims a piece to the part that can show on screen, before it goes to the
// GPU (task 2.11, after flicker on a phone). Cutting a piece at a near plane
// 1 m from the camera and projecting the cut in 32-bit floats made strips
// swing or flip as the view turned. Here, in 64-bit, each piece is cut
// against the near plane and four side planes set GUARD times wider than the
// view, so the GPU only ever projects points close to the screen. a and b are
// camera-relative (km) and are rewritten in place; false means nothing shows.
const GUARD = 2;
const va = [0, 0, 0], vb = [0, 0, 0];
const toView = (m, p, out) => {
  for (let r = 0; r < 3; r++) out[r] = m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r];
  return out;
};
export function clipToView(camera, aspect, a, b) {
  const m = camera.matrixWorldInverse.elements;
  toView(m, a, va);
  toView(m, b, vb);
  const ty = GUARD * Math.tan((camera.fov * Math.PI) / 360);
  const tx = ty * aspect;
  const near = CAMERA.nearKm;
  let t0 = 0, t1 = 1;
  // Keep where f ≥ 0, for each plane f (linear along the piece).
  const planes = [
    (v) => -v[2] - near,
    (v) => tx * -v[2] - v[0], (v) => tx * -v[2] + v[0],
    (v) => ty * -v[2] - v[1], (v) => ty * -v[2] + v[1],
  ];
  for (const f of planes) {
    const fa = f(va), fb = f(vb);
    if (fa < 0 && fb < 0) return false;
    if (fa < 0) t0 = Math.max(t0, fa / (fa - fb));
    else if (fb < 0) t1 = Math.min(t1, fa / (fa - fb));
    if (t0 > t1) return false;
  }
  if (t0 > 0 || t1 < 1) {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    for (let i = 0; i < 3; i++) { b[i] = a[i] + d[i] * t1; a[i] = a[i] + d[i] * t0; }
  }
  return true;
}

// Corners of a strip (along 0..1, side -1..1) and the attributes it needs.
export const STRIP_CORNERS = [[0, -1, 0], [0, 1, 0], [1, -1, 0], [1, 1, 0]];
export const STRIP_ATTRS = [['aStart', 3], ['aEnd', 3], ['aColor', 4], ['aWidth', 1]];

// Shared GLSL: view-space point → device pixels, and clipping to the near plane.
export const common = /* glsl */ `
uniform vec2 uViewport;
uniform float uPixelRatio;
uniform float uNear;
vec2 toScreen(vec4 v) { vec4 c = projectionMatrix * v; return (c.xy / c.w * 0.5 + 0.5) * uViewport; }
vec4 offScreen() { return vec4(2.0, 2.0, 2.0, 1.0); }
`;

export const stripVertex = /* glsl */ `
${common}
attribute vec3 aStart;
attribute vec3 aEnd;
attribute vec4 aColor;
attribute float aWidth;
flat varying vec2 vA;
flat varying vec2 vB;
flat varying vec4 vColor;
flat varying float vHalf;
// Keep a screen segment within a margin around the viewport, so the numbers
// stay small enough for exact distances in the fragment shader.
void clipToBox(inout vec2 a, inout vec2 b, vec2 lo, vec2 hi) {
  vec2 d = b - a;
  float t0 = 0.0, t1 = 1.0;
  for (int i = 0; i < 2; i++) {
    if (abs(d[i]) < 1e-6) continue;
    float ta = (lo[i] - a[i]) / d[i], tb = (hi[i] - a[i]) / d[i];
    t0 = max(t0, min(ta, tb));
    t1 = min(t1, max(ta, tb));
  }
  vec2 a0 = a;
  a = a0 + d * t0;
  b = a0 + d * max(t0, t1);
}
void main() {
  vec4 a = modelViewMatrix * vec4(aStart, 1.0);
  vec4 b = modelViewMatrix * vec4(aEnd, 1.0);
  if (a.z > -uNear && b.z > -uNear) { gl_Position = offScreen(); return; }
  if (a.z > -uNear) a = mix(a, b, (a.z + uNear) / (a.z - b.z));
  if (b.z > -uNear) b = mix(b, a, (b.z + uNear) / (b.z - a.z));
  vec2 sa = toScreen(a), sb = toScreen(b);
  clipToBox(sa, sb, vec2(-200.0), uViewport + 200.0);
  vA = sa; vB = sb; vColor = aColor;
  vHalf = 0.5 * aWidth * uPixelRatio;
  vec2 dir = sb - sa;
  float len = length(dir);
  dir = len > 1e-3 ? dir / len : vec2(1.0, 0.0);
  vec2 n = vec2(-dir.y, dir.x);
  float pad = vHalf + 1.5;
  vec2 s = (position.x < 0.5 ? sa - dir * pad : sb + dir * pad) + n * position.y * pad;
  gl_Position = vec4(s / uViewport * 2.0 - 1.0, 0.0, 1.0);
}`;

// uButt = 1 gives flat ends, for lines made of many short pieces (orbits,
// fronts): rounded ends would overlap at every joint and show as beads.
export const stripFragment = /* glsl */ `
uniform float uButt;
flat varying vec2 vA;
flat varying vec2 vB;
flat varying vec4 vColor;
flat varying float vHalf;
void main() {
  vec2 p = gl_FragCoord.xy, ab = vB - vA;
  float t = dot(p - vA, ab) / max(dot(ab, ab), 1e-6);
  if (uButt > 0.5 && (t < 0.0 || t >= 1.0)) discard;
  t = clamp(t, 0.0, 1.0);
  float d = length(p - (vA + ab * t));
  float a = vColor.a * (1.0 - smoothstep(vHalf - 0.6, vHalf + 0.6, d));
  if (a <= 0.003) discard;
  gl_FragColor = vec4(vColor.rgb * a, a);
}`;

export function screenMaterial(vertexShader, fragmentShader, { butt = false } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uViewport: { value: new THREE.Vector2() }, uPixelRatio: { value: 1 }, uNear: { value: CAMERA.nearKm }, uButt: { value: butt ? 1 : 0 } },
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide, // the quads are built on screen; their winding varies
    // Premultiplied "over" blending. Not marked transparent, so the lanes are
    // drawn with the opaque pass, before the stars (renderOrder -1).
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
}

export function quadGeometry(corners, count, attrs) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(corners.flat(), 3));
  g.setIndex([0, 1, 2, 2, 1, 3]);
  for (const [name, size] of attrs) g.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(count * size), size));
  g.instanceCount = count;
  return g;
}

