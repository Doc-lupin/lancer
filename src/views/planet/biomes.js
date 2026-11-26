// Land cover from climate, after Whittaker's biome chart: a small texture the
// terrain shader looks up by temperature (across, −50 °C to +50 °C) and
// moisture (up, 0 to 1). Ice, tundra, taiga, temperate forest, grassland,
// desert, savanna and rainforest, blended smoothly. The vegetation's hue comes
// from the world (appearance.color), so a world of red or blue-black plants
// keeps them.

import { canvasTexture } from '../surfaces.js';

const T0 = -50, T1 = 50;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const mul = (a, k) => a.map((v) => Math.min(1, v * k));

// The land colour (display values, 0–1) at a temperature (°C) and moisture.
export function biomeColor(T, M, veg) {
  const forest = mul(veg, 0.78);
  const taiga = mix(mul(veg, 0.5), [0.12, 0.2, 0.15], 0.45);
  const jungle = mix(mul(veg, 0.62), [0.06, 0.2, 0.06], 0.25);
  const grass = mix(veg, [0.62, 0.62, 0.36], 0.5);
  const savanna = [0.66, 0.6, 0.36];
  const steppe = [0.6, 0.56, 0.42];
  const desert = [0.78, 0.66, 0.47];
  const hotDesert = [0.82, 0.6, 0.4];
  const tundra = mix([0.5, 0.5, 0.42], mul(veg, 0.7), 0.25);
  const ice = [0.93, 0.95, 0.98];
  // Moisture first, at each temperature belt.
  const wet = (dry, mid, moist) => (M < 0.32 ? mix(dry, mid, smooth(0.04, 0.3, M)) : mix(mid, moist, smooth(0.34, 0.62, M)));
  const cold = wet(mix(tundra, [0.6, 0.6, 0.56], 0.4), tundra, tundra);
  const cool = wet(steppe, mix(steppe, taiga, 0.5), taiga);
  const mild = wet(desert, grass, forest);
  const hot = wet(hotDesert, savanna, jungle);
  let c = mix(cold, cool, smooth(-6, 2, T));
  c = mix(c, mild, smooth(4, 12, T));
  c = mix(c, hot, smooth(16, 24, T));
  return mix(c, ice, 1 - smooth(-18, -8, T));
}

// The lookup texture for one world (sRGB, so the shader reads linear values).
export function biomeTexture(veg) {
  return canvasTexture(64, 32, (data, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const T = T0 + ((x + 0.5) / w) * (T1 - T0);
      const M = (y + 0.5) / h;
      const c = biomeColor(T, M, veg);
      data.set([...c.map((v) => Math.round(v * 255)), 255], 4 * (y * w + x));
    }
  });
}
export const BIOME_RANGE = [T0, T1];
