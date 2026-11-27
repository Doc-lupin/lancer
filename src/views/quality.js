// Quality tiers (task B0.6, Table 6 of docs/SECTION_B.md). Every effect that
// costs real GPU time reads its setting from the current tier; the map must
// work at the lowest. Later phases add their own fields here (cloud motion,
// scattering steps, belt rocks, volumes, ...).
//
// The tier is chosen in this order: ?quality=low|medium|high|ultra in the
// address; the viewer's own choice (the Quality button, kept in this
// browser); otherwise from the device (detectTier).

import { useMap } from '../data/store.js';

export const TIERS = {
  // Old phones: one device pixel per CSS pixel, no bloom, smaller bakes.
  low: { pixelRatio: 1, multisampling: 0, bloom: false, skyTexture: [1024, 512], skyStars: 6000, surfaceSize: [512, 256] },
  // Most phones: small pixels hide jagged edges, so no multisampling.
  medium: { pixelRatio: 2, multisampling: 0, bloom: true, skyTexture: [2048, 1024], skyStars: 15000, surfaceSize: [1024, 512] },
  // Computers.
  high: { pixelRatio: 2, multisampling: 4, bloom: true, skyTexture: [2048, 1024], skyStars: 15000, surfaceSize: [1024, 512] },
  // Strong graphics chips: sharper and denser.
  ultra: { pixelRatio: 3, multisampling: 8, bloom: true, skyTexture: [4096, 2048], skyStars: 30000, surfaceSize: [2048, 1024] },
};
export const TIER_NAMES = Object.keys(TIERS);

const KEY = 'lancer.quality';

// A touch screen with little memory or few cores is an old phone; another
// touch screen, a phone or tablet; anything with a mouse, a computer. Ultra
// is only by choice.
export function detectTier() {
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  if (!coarse) return 'high';
  const memory = navigator.deviceMemory ?? 4; // GB, rounded; not every browser says
  const cores = navigator.hardwareConcurrency ?? 4;
  return memory <= 3 || cores <= 2 ? 'low' : 'medium';
}

export function initialTier() {
  if (typeof location === 'undefined') return 'high';
  const asked = new URLSearchParams(location.search).get('quality');
  if (TIERS[asked]) return asked;
  try {
    const saved = localStorage.getItem(KEY);
    if (TIERS[saved]) return saved;
  } catch { /* storage blocked: use the device's tier */ }
  return detectTier();
}

export function saveTier(tier) {
  try { localStorage.setItem(KEY, tier); } catch { /* not kept: fine */ }
}

// For code outside React (shaders, bakes): the current tier's settings, kept
// in step with the store.
export const QUALITY = { tier: useMap.getState().quality, get: () => TIERS[QUALITY.tier] };
useMap.subscribe((s) => { QUALITY.tier = s.quality; });
