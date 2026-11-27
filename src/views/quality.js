// Quality tiers (task B0.6, Table 6 of docs/SECTION_B.md). Every effect that
// costs real GPU time reads its setting from the current tier; the map must
// work at the lowest. bakeSteps: tiles of a bake painted per frame at most
// (jobs.js, B0.9). Later phases add their own fields here (cloud motion,
// scattering steps, belt rocks, volumes, ...).
//
// The tier is chosen in this order: ?quality=low|medium|high|ultra in the
// address; the viewer's own choice (the Quality button, kept in this
// browser); otherwise high. The map is for desktop browsers (decision BD13)
// and quality comes first (BD15): nothing lowers the tier by itself; a
// viewer on a weak laptop picks low or medium, one with a strong GPU ultra.

export const TIERS = {
  // Laptops with integrated graphics: one device pixel per CSS pixel, no
  // bloom, smaller bakes.
  low: { pixelRatio: 1, multisampling: 0, bloom: false, skyTexture: [1024, 512], skyStars: 6000, surfaceSize: [512, 256], bakeSteps: 2 },
  // Older desktop GPUs: no multisampling.
  medium: { pixelRatio: 2, multisampling: 0, bloom: true, skyTexture: [2048, 1024], skyStars: 15000, surfaceSize: [1024, 512], bakeSteps: 4 },
  // Mid-range desktop GPUs: the default.
  high: { pixelRatio: 2, multisampling: 4, bloom: true, skyTexture: [2048, 1024], skyStars: 15000, surfaceSize: [1024, 512], bakeSteps: 6 },
  // Strong graphics chips: sharper and denser.
  ultra: { pixelRatio: 3, multisampling: 8, bloom: true, skyTexture: [4096, 2048], skyStars: 30000, surfaceSize: [2048, 1024], bakeSteps: 8 },
};
export const TIER_NAMES = Object.keys(TIERS);

const KEY = 'lancer.quality';

// The tier when the viewer has not chosen one: high (BD13, BD15). Before
// BD13, touch screens got medium or low here.
export function detectTier() {
  return 'high';
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

// The current tier's settings, for code outside React (bakes).
export const tierOf = (state) => TIERS[state.quality] ?? TIERS.high;
