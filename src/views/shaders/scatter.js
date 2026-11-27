// Shared shader library (task B0.8): light scattering.
//
//   rayleighPhase(mu)        small molecules (blue skies); mu = cos(angle
//                            between the view ray and the light)
//   hgPhase(mu, g)           Henyey–Greenstein: one lobe, g > 0 forward
//                            (haze, dust, cloud droplets), g < 0 backward
//   csPhase(mu, g)           Cornette–Shanks: Henyey–Greenstein with a
//                            Rayleigh-like (1 + mu²) term, closer to measured
//                            aerosols; the Mie term of most sky models
//   raySphere(ro, rd, r)     where a ray from ro along the unit rd enters and
//                            leaves a sphere of radius r at the origin (enter,
//                            leave); leave < enter means a miss
//
// Each phase function integrates to 1 over the sphere (per steradian), so
// light is neither made nor lost. Phase B5 builds the precomputed scattering
// tables on these. Each GLSL function has a JavaScript twin, line for line.

export const SCATTER_GLSL = /* glsl */ `
const float PI4 = 12.566370614359172;
float rayleighPhase(float mu) { return 3.0 / (4.0 * PI4) * (1.0 + mu * mu); }
float hgPhase(float mu, float g) {
  float gg = g * g;
  return (1.0 - gg) / (PI4 * pow(1.0 + gg - 2.0 * g * mu, 1.5));
}
float csPhase(float mu, float g) {
  float gg = g * g;
  return 3.0 * (1.0 - gg) * (1.0 + mu * mu) / (2.0 * PI4 * (2.0 + gg) * pow(1.0 + gg - 2.0 * g * mu, 1.5));
}
vec2 raySphere(vec3 ro, vec3 rd, float r) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - r * r;
  float disc = b * b - c;
  if (disc < 0.0) return vec2(1.0, -1.0);
  float s = sqrt(disc);
  return vec2(-b - s, -b + s);
}
`;

const PI4 = 4 * Math.PI;
export const rayleighPhase = (mu) => (3 / (4 * PI4)) * (1 + mu * mu);
export const hgPhase = (mu, g) => (1 - g * g) / (PI4 * (1 + g * g - 2 * g * mu) ** 1.5);
export const csPhase = (mu, g) => (3 * (1 - g * g) * (1 + mu * mu)) / (2 * PI4 * (2 + g * g) * (1 + g * g - 2 * g * mu) ** 1.5);
export function raySphere(ro, rd, r) {
  const b = ro[0] * rd[0] + ro[1] * rd[1] + ro[2] * rd[2];
  const c = ro[0] * ro[0] + ro[1] * ro[1] + ro[2] * ro[2] - r * r;
  const disc = b * b - c;
  if (disc < 0) return [1, -1];
  const s = Math.sqrt(disc);
  return [-b - s, -b + s];
}
