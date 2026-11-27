// Shared shader library (task B0.8): hashing.
//
// pcg3d (Jarzynski and Olano, "Hash Functions for GPU Rendering", JCGT 2020):
// an integer hash, so the same seed gives the same world on every GPU (risk
// table of docs/SECTION_B.md: "integer hashes in shaders"). Each GLSL function
// here has a JavaScript twin written line for line, for tests and for work on
// the CPU; keep the two in step.

export const HASH_GLSL = /* glsl */ `
uvec3 pcg3d(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v;
}
// Integer lattice point (any sign) to three floats in [0, 1).
vec3 hash3(ivec3 c) { return vec3(pcg3d(uvec3(c))) * (1.0 / 4294967296.0); }
`;

const u32 = (x) => x >>> 0;
const mul = (a, b) => Math.imul(a, b) >>> 0;

export function pcg3d([x, y, z]) {
  x = u32(mul(x, 1664525) + 1013904223);
  y = u32(mul(y, 1664525) + 1013904223);
  z = u32(mul(z, 1664525) + 1013904223);
  x = u32(x + mul(y, z)); y = u32(y + mul(z, x)); z = u32(z + mul(x, y));
  x = u32(x ^ (x >>> 16)); y = u32(y ^ (y >>> 16)); z = u32(z ^ (z >>> 16));
  x = u32(x + mul(y, z)); y = u32(y + mul(z, x)); z = u32(z + mul(x, y));
  return [x, y, z];
}

export const hash3 = (c) => pcg3d(c.map(u32)).map((v) => v / 4294967296);
