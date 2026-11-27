// Shared shader library (task B0.8): noise, on the integer hash (hash.js).
//
//   noise3(p)                  gradient noise (Perlin's 12 edge gradients,
//                              quintic fade), about -1 to 1, 0 on lattice points
//   fbm3(p, oct, pers, lac)    sum of octaves; fractional octave counts fade in
//   ridged3(p, oct, pers, lac) ridges where the noise crosses 0 (mountain
//                              crests, cracks), 0 to about 1
//   cell3(p)                   Worley noise: distance to the nearest and the
//                              second nearest feature point, and a number 0–1
//                              for the nearest one's cell
//   curl3(p)                   the curl of a noise vector field: a flow with
//                              no sources or sinks (clouds, gas bands, nebulae)
//
// Include HASH_GLSL before NOISE_GLSL. Each GLSL function has a JavaScript
// twin below, written line for line; keep the two in step (tests in
// shaders.test.js). Names end in 3 so they don't clash with the older noise
// of src/views/planet/noise.js, which moves here in Phase B2.

import { pcg3d } from './hash.js';

export const NOISE_GLSL = /* glsl */ `
const vec3 GRAD3[12] = vec3[12](
  vec3(1, 1, 0), vec3(-1, 1, 0), vec3(1, -1, 0), vec3(-1, -1, 0),
  vec3(1, 0, 1), vec3(-1, 0, 1), vec3(1, 0, -1), vec3(-1, 0, -1),
  vec3(0, 1, 1), vec3(0, -1, 1), vec3(0, 1, -1), vec3(0, -1, -1));
float corner3(ivec3 c, vec3 f) { return dot(GRAD3[pcg3d(uvec3(c)).x % 12u], f); }
float noise3(vec3 p) {
  ivec3 i = ivec3(floor(p));
  vec3 f = p - floor(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float x00 = mix(corner3(i, f), corner3(i + ivec3(1, 0, 0), f - vec3(1, 0, 0)), u.x);
  float x10 = mix(corner3(i + ivec3(0, 1, 0), f - vec3(0, 1, 0)), corner3(i + ivec3(1, 1, 0), f - vec3(1, 1, 0)), u.x);
  float x01 = mix(corner3(i + ivec3(0, 0, 1), f - vec3(0, 0, 1)), corner3(i + ivec3(1, 0, 1), f - vec3(1, 0, 1)), u.x);
  float x11 = mix(corner3(i + ivec3(0, 1, 1), f - vec3(0, 1, 1)), corner3(i + ivec3(1, 1, 1), f - vec3(1, 1, 1)), u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}
float fbm3(vec3 p, float oct, float pers, float lac) {
  float sum = 0.0, amp = 1.0, norm = 0.0;
  for (int k = 0; k < 12; k++) {
    float w = clamp(oct - float(k), 0.0, 1.0);
    if (w <= 0.0) break;
    sum += w * amp * noise3(p);
    norm += w * amp;
    amp *= pers;
    p = p * lac + vec3(17.31, -9.27, 5.13);
  }
  return sum / max(norm, 1e-6);
}
float ridged3(vec3 p, float oct, float pers, float lac) {
  float sum = 0.0, amp = 1.0, norm = 0.0;
  for (int k = 0; k < 12; k++) {
    float w = clamp(oct - float(k), 0.0, 1.0);
    if (w <= 0.0) break;
    float r = 1.0 - abs(noise3(p));
    sum += w * amp * r * r;
    norm += w * amp;
    amp *= pers;
    p = p * lac + vec3(17.31, -9.27, 5.13);
  }
  return sum / max(norm, 1e-6);
}
vec3 cell3(vec3 p) {
  ivec3 i = ivec3(floor(p));
  float f1 = 9.0, f2 = 9.0, id = 0.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    ivec3 c = i + ivec3(x, y, z);
    vec3 h = hash3(c);
    float d = length(vec3(c) + h - p);
    if (d < f1) { f2 = f1; f1 = d; id = h.x; } else if (d < f2) { f2 = d; }
  }
  return vec3(f1, f2, id);
}
vec3 curl3(vec3 p) {
  const float e = 1e-3;
  vec3 dx = vec3(e, 0, 0), dy = vec3(0, e, 0), dz = vec3(0, 0, e);
  vec3 o1 = vec3(31.416, 47.853, 12.679), o2 = vec3(-23.137, 17.311, 61.207);
  float dPzdy = noise3(p + o2 + dy) - noise3(p + o2 - dy);
  float dPydz = noise3(p + o1 + dz) - noise3(p + o1 - dz);
  float dPxdz = noise3(p + dz) - noise3(p - dz);
  float dPzdx = noise3(p + o2 + dx) - noise3(p + o2 - dx);
  float dPydx = noise3(p + o1 + dx) - noise3(p + o1 - dx);
  float dPxdy = noise3(p + dy) - noise3(p - dy);
  return vec3(dPzdy - dPydz, dPxdz - dPzdx, dPydx - dPxdy) / (2.0 * e);
}
`;

// ---- JavaScript twins ----

const GRAD3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
const lerp = (a, b, t) => a + (b - a) * t;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const corner3 = (c, f) => { const g = GRAD3[pcg3d(c.map((v) => v >>> 0))[0] % 12]; return g[0] * f[0] + g[1] * f[1] + g[2] * f[2]; };

export function noise3(p) {
  const i = p.map(Math.floor);
  const f = p.map((v, k) => v - i[k]);
  const u = f.map((t) => t * t * t * (t * (t * 6 - 15) + 10));
  const at = (dx, dy, dz) => corner3([i[0] + dx, i[1] + dy, i[2] + dz], [f[0] - dx, f[1] - dy, f[2] - dz]);
  const x00 = lerp(at(0, 0, 0), at(1, 0, 0), u[0]);
  const x10 = lerp(at(0, 1, 0), at(1, 1, 0), u[0]);
  const x01 = lerp(at(0, 0, 1), at(1, 0, 1), u[0]);
  const x11 = lerp(at(0, 1, 1), at(1, 1, 1), u[0]);
  return lerp(lerp(x00, x10, u[1]), lerp(x01, x11, u[1]), u[2]);
}

function octaves(p, oct, pers, lac, one) {
  let sum = 0, amp = 1, norm = 0;
  for (let k = 0; k < 12; k++) {
    const w = Math.min(1, Math.max(0, oct - k));
    if (w <= 0) break;
    sum += w * amp * one(p);
    norm += w * amp;
    amp *= pers;
    p = add(p.map((v) => v * lac), [17.31, -9.27, 5.13]);
  }
  return sum / Math.max(norm, 1e-6);
}
export const fbm3 = (p, oct, pers, lac) => octaves(p, oct, pers, lac, noise3);
export const ridged3 = (p, oct, pers, lac) => octaves(p, oct, pers, lac, (q) => { const r = 1 - Math.abs(noise3(q)); return r * r; });

export function cell3(p) {
  const i = p.map(Math.floor);
  let f1 = 9, f2 = 9, id = 0;
  for (let z = -1; z <= 1; z++) for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) {
    const c = [i[0] + x, i[1] + y, i[2] + z];
    const h = pcg3d(c.map((v) => v >>> 0)).map((v) => v / 4294967296);
    const d = Math.hypot(c[0] + h[0] - p[0], c[1] + h[1] - p[1], c[2] + h[2] - p[2]);
    if (d < f1) { f2 = f1; f1 = d; id = h[0]; } else if (d < f2) f2 = d;
  }
  return [f1, f2, id];
}

export function curl3(p) {
  const e = 1e-3;
  const o1 = [31.416, 47.853, 12.679], o2 = [-23.137, 17.311, 61.207];
  const n = (q, o, d) => noise3([q[0] + o[0] + d[0], q[1] + o[1] + d[1], q[2] + o[2] + d[2]]);
  const Z = [0, 0, 0], dx = [e, 0, 0], dy = [0, e, 0], dz = [0, 0, e];
  const neg = (d) => d.map((v) => -v);
  const dPzdy = n(p, o2, dy) - n(p, o2, neg(dy));
  const dPydz = n(p, o1, dz) - n(p, o1, neg(dz));
  const dPxdz = n(p, Z, dz) - n(p, Z, neg(dz));
  const dPzdx = n(p, o2, dx) - n(p, o2, neg(dx));
  const dPydx = n(p, o1, dx) - n(p, o1, neg(dx));
  const dPxdy = n(p, Z, dy) - n(p, Z, neg(dy));
  return [(dPzdy - dPydz) / (2 * e), (dPxdz - dPzdx) / (2 * e), (dPydx - dPxdy) / (2 * e)];
}
