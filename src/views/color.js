// Color for the high-dynamic-range pipeline (task B0.4).
//
// The scene renders into a half-float buffer in linear light. One pass at the
// end (OUTPUT_GLSL, in Scene.jsx) tone maps it and the composer encodes it
// for the screen (sRGB). The tone map is the shoulder of Khronos PBR Neutral
// without its toe offset: colors with every channel at or under 0.8 (linear)
// pass unchanged; brighter light is compressed smoothly toward white and
// desaturated a little, so stars and glows can exceed white without clipping.
//
// Many of our own shaders (lanes, icons, markers, orbit lines, star dots,
// glows, nebulae, the sky) still compute the color they want on screen. They
// end with fromDisplay() (FROM_DISPLAY_GLSL), the exact inverse of the output:
// sRGB to linear, then undo the shoulder. So they look as before, while all
// blending and later effects (bloom, B0.5) work in linear light. Colors for
// those shaders are given as they should look: displayColor().

import * as THREE from 'three';

export function displayColor(hex, out = new THREE.Color()) {
  return out.set(hex).convertLinearToSRGB();
}

// Where the shoulder starts, and how much it desaturates.
const KNEE = '0.8';
const DESATURATION = '0.15';

// The tone map, for the output pass. In: linear light (≥ 0). Out: linear, ≤ 1.
export const OUTPUT_GLSL = /* glsl */ `
vec3 shoulder(vec3 c) {
  float p = max(c.r, max(c.g, c.b));
  if (p <= ${KNEE}) return c;
  float d = 1.0 - ${KNEE};
  float np = 1.0 - d * d / (p + d - ${KNEE});
  float g = 1.0 - 1.0 / (${DESATURATION} * (p - np) + 1.0);
  return mix(c * (np / p), vec3(np), g);
}`;

// For our own shaders: the linear value that the output turns into this
// display color. Display values over 0.97 of white (after linearizing) are
// taken as 0.97, so the linear value stays finite (under 2).
export const FROM_DISPLAY_GLSL = /* glsl */ `
vec3 fromDisplay(vec3 s) {
  s = clamp(s, 0.0, 1.0);
  vec3 c = mix(s / 12.92, pow((s + 0.055) / 1.055, vec3(2.4)), step(0.04045, s));
  float np = max(c.r, max(c.g, c.b));
  if (np <= ${KNEE}) return c;
  if (np > 0.97) { c *= 0.97 / np; np = 0.97; }
  float d = 1.0 - ${KNEE};
  float p = d * d / (1.0 - np) - d + ${KNEE};
  float g = 1.0 - 1.0 / (${DESATURATION} * (p - np) + 1.0);
  return (c - g * np) / (1.0 - g) * (p / np);
}`;
