// Shared shader library (task B0.8): color science.
//
//   cie1931(lambda)       the CIE 1931 2° color matching functions (x̄, ȳ, z̄)
//                         at a wavelength in nm: the multi-lobe Gaussian fit of
//                         Wyman, Sloan and Shirley (JCGT 2013)
//   xyzToSrgb(xyz)        CIE XYZ to linear sRGB (D65 white)
//   blackbody(T)          the color of a black body at T kelvin, linear sRGB,
//                         largest channel 1 (color only; brightness is the
//                         star's luminosity). From the Planckian locus formula
//                         of Kim et al. (2002), valid 1667–25000 K; hotter or
//                         cooler temperatures are taken at the nearest end.
//   wavelengthRgb(lambda) the color of pure light of one wavelength, linear
//                         sRGB, channels below 0 (outside sRGB) set to 0. For
//                         emission lines: H-alpha 656.3 nm, [O III] 500.7 nm.
//
// JavaScript only: planck(lambda, T) (spectral radiance, relative) and
// blackbodyIntegrated(T), the slow reference that sums the Planck spectrum
// against the matching functions; the tests check blackbody() against it.
// Phase B7 colors the stars from their temperatures with these. Each GLSL
// function has a JavaScript twin, line for line.

export const COLOR_GLSL = /* glsl */ `
float lobe(float x, float mu, float s1, float s2) { float t = (x - mu) / (x < mu ? s1 : s2); return exp(-0.5 * t * t); }
vec3 cie1931(float l) {
  return vec3(
    1.056 * lobe(l, 599.8, 37.9, 31.0) + 0.362 * lobe(l, 442.0, 16.0, 26.7) - 0.065 * lobe(l, 501.1, 20.4, 26.2),
    0.821 * lobe(l, 568.8, 46.9, 40.5) + 0.286 * lobe(l, 530.9, 16.3, 31.1),
    1.217 * lobe(l, 437.0, 11.8, 36.0) + 0.681 * lobe(l, 459.0, 26.0, 13.8));
}
vec3 xyzToSrgb(vec3 c) {
  return mat3(3.2404542, -0.9692660, 0.0556434,
              -1.5371385, 1.8760108, -0.2040259,
              -0.4985314, 0.0415560, 1.0572252) * c;
}
vec3 blackbody(float T) {
  T = clamp(T, 1667.0, 25000.0);
  float t = 1000.0 / T, t2 = t * t, t3 = t2 * t;
  float x = T <= 4000.0 ? -0.2661239 * t3 - 0.2343589 * t2 + 0.8776956 * t + 0.179910
                        : -3.0258469 * t3 + 2.1070379 * t2 + 0.2226347 * t + 0.240390;
  float x2 = x * x, x3 = x2 * x;
  float y = T <= 2222.0 ? -1.1063814 * x3 - 1.34811020 * x2 + 2.18555832 * x - 0.20219683
          : T <= 4000.0 ? -0.9549476 * x3 - 1.37418593 * x2 + 2.09137015 * x - 0.16748867
                        : 3.0817580 * x3 - 5.87338670 * x2 + 3.75112997 * x - 0.37001483;
  vec3 c = max(xyzToSrgb(vec3(x / y, 1.0, (1.0 - x - y) / y)), 0.0);
  return c / max(c.r, max(c.g, c.b));
}
vec3 wavelengthRgb(float l) { return max(xyzToSrgb(cie1931(l)), 0.0); }
`;

const lobe = (x, mu, s1, s2) => { const t = (x - mu) / (x < mu ? s1 : s2); return Math.exp(-0.5 * t * t); };
export const cie1931 = (l) => [
  1.056 * lobe(l, 599.8, 37.9, 31.0) + 0.362 * lobe(l, 442.0, 16.0, 26.7) - 0.065 * lobe(l, 501.1, 20.4, 26.2),
  0.821 * lobe(l, 568.8, 46.9, 40.5) + 0.286 * lobe(l, 530.9, 16.3, 31.1),
  1.217 * lobe(l, 437.0, 11.8, 36.0) + 0.681 * lobe(l, 459.0, 26.0, 13.8),
];
export const xyzToSrgb = ([X, Y, Z]) => [
  3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z,
  -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z,
  0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z,
];

const chroma = (c) => { const m = c.map((v) => Math.max(v, 0)); const k = Math.max(...m); return m.map((v) => v / k); };

export function blackbody(T) {
  T = Math.min(25000, Math.max(1667, T));
  const t = 1000 / T, t2 = t * t, t3 = t2 * t;
  const x = T <= 4000 ? -0.2661239 * t3 - 0.2343589 * t2 + 0.8776956 * t + 0.179910
    : -3.0258469 * t3 + 2.1070379 * t2 + 0.2226347 * t + 0.240390;
  const x2 = x * x, x3 = x2 * x;
  const y = T <= 2222 ? -1.1063814 * x3 - 1.34811020 * x2 + 2.18555832 * x - 0.20219683
    : T <= 4000 ? -0.9549476 * x3 - 1.37418593 * x2 + 2.09137015 * x - 0.16748867
      : 3.0817580 * x3 - 5.87338670 * x2 + 3.75112997 * x - 0.37001483;
  return chroma(xyzToSrgb([x / y, 1, (1 - x - y) / y]));
}

export const wavelengthRgb = (l) => xyzToSrgb(cie1931(l)).map((v) => Math.max(v, 0));

// Spectral radiance of a black body (relative: the constants that only scale
// it are left out). lambda in nm.
export function planck(l, T) {
  const m = l * 1e-9;
  return 1 / (m ** 5 * (Math.exp(0.014387769 / (m * T)) - 1));
}

// The slow reference: the Planck spectrum summed against the matching
// functions, 360–830 nm in 1 nm steps.
export function blackbodyIntegrated(T) {
  const xyz = [0, 0, 0];
  for (let l = 360; l <= 830; l++) {
    const p = planck(l, T), c = cie1931(l);
    for (let k = 0; k < 3; k++) xyz[k] += p * c[k];
  }
  return chroma(xyzToSrgb(xyz));
}
