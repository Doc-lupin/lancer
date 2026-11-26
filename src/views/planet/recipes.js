// What a world looks like, from its data: one recipe per kind of world
// (world in map.json), varied per body by a seeded random, so two worlds of a
// kind still differ. The shaders (terrain.js, gas.js, atmosphere.js) take
// these settings as they are; nothing here touches the GPU.
//
//   terrain   tectonic plates (count, share that are continental, how high
//             they push mountains, how deep they rift), then noise (scale,
//             octaves, persistence, lacunarity, ridge sharpness, warp), then
//             features: craters, basins, dunes, terraces, canyons, ice cracks,
//             crystal facets, volcanoes
//   climate   mean temperature and the equator-to-pole spread (from stats),
//             lapse with height, tidal locking, water share and moisture
//   surface   'biome' (temperature × moisture → land cover, biomes.js) or
//             'mineral' (a palette over height and noise), water, ice, glow,
//             gloss and glitter
//   gas       bands, turbulence, storms and palette, for giants and for worlds
//             hidden under haze
//   air       scattering for the atmosphere shell (atmosphere.js)

import { STAR_KINDS } from '../../data/starKinds.js';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const mul = (a, k) => a.map((v) => Math.min(1, v * k));
// Turn a colour's hue a little (for variety between worlds of one kind).
function shift(c, amount) {
  const [r, g, b] = c;
  const k = amount;
  return [r + k * (g - b), g + k * (b - r), b + k * (r - g)].map((v) => Math.min(1, Math.max(0, v)));
}

const BASE_TERRAIN = {
  plates: 0, continental: 0.4, mountains: 1, rift: 0.5,
  scale: 1.6, octaves: 8, persistence: 0.5, lacunarity: 2.05, ridge: 0.3, warp: 0.5,
  craters: 0, basins: 0, detail: 0.05, dunes: 0, terrace: 0, canyons: 0, cracks: 0, crystals: 0, volcanoes: 0, chaos: 0,
  reliefKm: 8,
};

// By world. Colours are filled in later from appearance.color where they're null.
const WORLDS = {
  continental: { terrain: { plates: 14, continental: 0.42, ridge: 0.45, detail: 0.09 }, surface: 'biome' },
  'super-earth': { terrain: { plates: 20, continental: 0.38, mountains: 1.3, scale: 2.1, reliefKm: 6 }, surface: 'biome' },
  megaflora: { terrain: { plates: 12, continental: 0.5, ridge: 0.2 }, surface: 'biome', moist: 0.35, vegetation: 'deep' },
  karst: { terrain: { plates: 10, continental: 0.5, terrace: 0.7, canyons: 0.45, ridge: 0.15 }, surface: 'biome', rock: '#b8ae98' },
  ocean: { terrain: { plates: 10, continental: 0.1, mountains: 0.6, reliefKm: 4 }, surface: 'biome' },
  'tidally-locked': { terrain: { plates: 10, continental: 0.4 }, surface: 'biome', eyeball: 1 },
  barren: { terrain: { craters: 0.55, basins: 0.4, scale: 1.3, ridge: 0.15, detail: 0.06, reliefKm: 7 }, surface: 'mineral' },
  iron: { terrain: { plates: 5, continental: 0.5, craters: 0.35, canyons: 0.5, ridge: 0.4 }, surface: 'mineral', gloss: 0.3 },
  ice: { terrain: { craters: 0.18, cracks: 0.5, ridge: 0.2, scale: 1.2, reliefKm: 3 }, surface: 'mineral', icy: 1 },
  snowball: { terrain: { plates: 10, continental: 0.3, cracks: 0.25, reliefKm: 4 }, surface: 'mineral', icy: 1, frozenSea: 1 },
  'subglacial-ocean': { terrain: { craters: 0.06, cracks: 1, ridge: 0.1, scale: 1.0, reliefKm: 1.5 }, surface: 'mineral', icy: 1 },
  cryovolcanic: { terrain: { craters: 0.1, cracks: 0.45, volcanoes: 0.6, reliefKm: 3 }, surface: 'mineral', icy: 1 },
  lava: { terrain: { plates: 9, continental: 0.6, mountains: 0.6, ridge: 0.5, reliefKm: 5 }, surface: 'mineral', glow: 1, lavaSea: 0.35 },
  volcanic: { terrain: { volcanoes: 1, ridge: 0.3, craters: 0.02, reliefKm: 8 }, surface: 'mineral', glow: 0.35, io: 1 },
  crystalline: { terrain: { crystals: 1, ridge: 0.5, craters: 0.1 }, surface: 'mineral', gloss: 0.6, glitter: 0.8 },
  'flare-scoured': { terrain: { craters: 0.3, canyons: 0.35, ridge: 0.25 }, surface: 'mineral', gloss: 0.4, scorched: 1 },
  carbon: { terrain: { plates: 6, dunes: 0.4, ridge: 0.2 }, surface: 'mineral', gloss: 0.2, tarSea: 0.12 },
  diamond: { terrain: { crystals: 0.6, craters: 0.15 }, surface: 'mineral', gloss: 0.8, glitter: 1 },
  glassed: { terrain: { craters: 0.5, ridge: 0.1, detail: 0.02 }, surface: 'mineral', gloss: 0.9, scorched: 0.5 },
  shattered: { terrain: { canyons: 1, craters: 0.4, terrace: 0.3, ridge: 0.5, reliefKm: 12 }, surface: 'mineral' },
  chthonian: { terrain: { plates: 6, terrace: 0.4, craters: 0.2, reliefKm: 10 }, surface: 'mineral', gloss: 0.4 },
  'pulsar-world': { terrain: { craters: 0.3, ridge: 0.3 }, surface: 'mineral', glow: 0.08, glowColor: '#6a8cff' },
  dust: { terrain: { dunes: 1, craters: 0.15, canyons: 0.3, ridge: 0.15 }, surface: 'mineral' },
  geothermal: { terrain: { cracks: 0.35, volcanoes: 0.3, craters: 0.1, reliefKm: 3 }, surface: 'mineral', icy: 1, springs: 1 },
};
const HAZE = {
  hothouse: { palette: ['#e6cf96', '#cfa968', '#f2e2b8'], contrast: 0.2 },
  steam: { palette: ['#e8ecef', '#c7d0d8', '#f6f7f8'], contrast: 0.15 },
  'toxic-air': { palette: ['#cdd18a', '#a9a85c', '#e6e3a8'], contrast: 0.25 },
  'dense-air': { palette: ['#c9d6e3', '#9fb2c6', '#e8eef4'], contrast: 0.25 },
  'methane-sea': { palette: ['#d89a52', '#b87533', '#e9b878'], contrast: 0.18 },
};
const GIANTS = {
  'cold-giant': { palette: ['#efe3c8', '#b9875a', '#d9b98c', '#8f5a3c'], contrast: 0.9, storms: [1, 3], bands: [12, 18] },
  'warm-giant': { palette: ['#efe6da', '#9c6a4a', '#d8c2a8', '#6e4a38'], contrast: 0.8, storms: [2, 5], bands: [14, 22] },
  'hot-giant': { palette: ['#6a3326', '#2e1712', '#8a4a30', '#1c0e0b'], contrast: 0.45, storms: [0, 2], bands: [8, 12], thermal: 1 },
  'helium-giant': { palette: ['#eeeeec', '#c4c4c2', '#dcdcda', '#a8a8a6'], contrast: 0.35, storms: [0, 2], bands: [10, 16] },
  'ice-giant': { palette: ['#9fd2e0', '#5f99b6', '#c6e8f0', '#3e6f94'], contrast: 0.25, storms: [0, 2], bands: [6, 10], streaks: 1 },
  'mini-neptune': { palette: ['#a6d0da', '#7aaabb', '#d0e8ee', '#5a8da0'], contrast: 0.18, storms: [0, 1], bands: [5, 8] },
  'silicate-giant': { palette: ['#4a3430', '#2a1c1a', '#6a4a40', '#181010'], contrast: 0.5, storms: [1, 2], bands: [9, 14], thermal: 0.5 },
};

// The atmosphere's look from the data: thickness from pressure, tint from the
// sky's colour as the world's people see it.
function air(body, gas) {
  const s = body.stats ?? {};
  const sky = (s.sky?.color ?? '').toLowerCase();
  const p = s.pressureAtm ?? (gas ? 10 : 0);
  if (!gas && (!body.appearance?.atmosphere || p < 0.02 || sky === 'black' || sky === 'not applicable')) return null;
  // Rayleigh optical depth straight up, red/green/blue (Earth's at 1 atm).
  let rayleigh = [0.047, 0.108, 0.266];
  let mie = 0.02, mieColor = [1, 1, 1];
  if (sky.includes('violet')) rayleigh = [0.08, 0.1, 0.3];
  if (sky.includes('orange')) { rayleigh = [0.02, 0.02, 0.01]; mie = 0.35; mieColor = [1, 0.62, 0.3]; }
  if (sky.includes('yellow')) { rayleigh = [0.02, 0.02, 0.012]; mie = 0.3; mieColor = [1, 0.93, 0.7]; }
  if (sky.includes('pink') || sky.includes('salmon')) { rayleigh = [0.03, 0.03, 0.04]; mie = 0.2; mieColor = [1, 0.7, 0.62]; }
  if (sky.includes('grey') || sky.includes('overcast')) { rayleigh = [0.03, 0.035, 0.045]; mie = 0.35; mieColor = [0.9, 0.9, 0.9]; }
  if (gas) { rayleigh = [0.008, 0.014, 0.03]; mie = 0.05; }
  const thick = Math.min(3, Math.max(0.15, Math.sqrt(p)));
  return { rayleigh: rayleigh.map((v) => v * thick), mie: mie * thick, mieColor, top: gas ? 1.03 : 1.022 };
}

// Light from the system's star: its colour, softened toward white.
export function sunlight(index, body) {
  const sys = index.byId.get(body.system);
  const kind = sys?.center?.type === 'star' ? STAR_KINDS[sys.center.kind] : null;
  if (!kind) return { color: [0, 0, 0], ambient: 0.05 };
  return { color: mix([1, 1, 1], hex(kind.color), 0.5), ambient: 0.006 };
}

const GLOBES = new Set(['planet', 'gas-giant', 'moon', 'rogue-planet']);
export const hasRecipe = (body) => GLOBES.has(body.type);

// Land and water hints from the body's places: towns and bases pull land up
// under them, so settlements stand on land; "ocean" or "sea" places pull it
// down. Up to 32, as directions in the body frame with a weight.
const LANDISH = new Set(['town', 'settlement', 'city', 'base', 'mine', 'camp', 'landing', 'refinery', 'ruin', 'battlefield', 'front', 'site']);
export function placeHints(places) {
  const out = [];
  for (const p of places) {
    if (out.length >= 32) break;
    const watery = /ocean|sea|shore|reef|harbou?r/i.test(p.name);
    const w = watery ? (/shore|harbou?r/i.test(p.name) ? 0.35 : -1) : LANDISH.has(p.kind) ? 1 : p.kind === 'port' ? 0.4 : 0;
    if (!w) continue;
    const [lat, lon] = p.at.map((v) => (v * Math.PI) / 180);
    out.push([Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat), w]);
  }
  return out;
}

// Everything the shaders need for one body. `rand` is seeded by the body.
export function recipe(body, rand) {
  const s = body.stats ?? {};
  const color = hex(body.appearance?.color ?? '#8a8070');
  const world = body.world ?? '';
  const variant = body.variant ?? '';
  const seed = [rand() * 100, rand() * 100, rand() * 100];
  const jitter = (v, k) => v * (1 + (rand() * 2 - 1) * k);

  if (body.type === 'gas-giant' || HAZE[world]) {
    const g = GIANTS[world] ?? HAZE[world] ?? GIANTS['cold-giant'];
    const haze = !!HAZE[world];
    // Each giant's palette is turned toward its own colour, then varied.
    const hue = (rand() * 2 - 1) * 0.12;
    const palette = g.palette.map((c) => shift(mix(hex(c), color, haze ? 0.35 : 0.25), hue));
    const nStorms = Math.round((g.storms?.[0] ?? 0) + rand() * ((g.storms?.[1] ?? 0) - (g.storms?.[0] ?? 0)) + (variant === 'storm-giant' ? 3 : 0));
    const storms = Array.from({ length: Math.min(6, nStorms) }, (_, i) => [
      (rand() * 2 - 1) * 1.1, rand() * Math.PI * 2, (i === 0 ? 0.09 : 0.03) + rand() * (i === 0 ? 0.07 : 0.03), rand() < 0.6 ? 1 : 0,
    ]);
    const bands = g.bands ?? [6, 9];
    return {
      kind: 'gas', seed, haze,
      palette, contrast: (g.contrast ?? 0.5) * (variant === 'banded' ? 1.3 : variant === 'pale' ? 0.6 : 1) * jitter(1, 0.15),
      bands: bands[0] + rand() * (bands[1] - bands[0]), turbulence: jitter(haze ? 0.5 : 1, 0.25),
      storms, streaks: g.streaks ?? 0, thermal: g.thermal ?? 0, polar: rand() < 0.25 ? 1 : 0,
      air: air(body, true) ?? { rayleigh: [0.008, 0.014, 0.03], mie: 0.05, mieColor: [1, 1, 1], top: 1.03 },
    };
  }

  const w = WORLDS[world] ?? (body.type === 'rogue-planet' ? WORLDS['subglacial-ocean'] : WORLDS.barren);
  const t = { ...BASE_TERRAIN, ...w.terrain };
  // Vary the noise: no two worlds of a kind share a shape.
  t.scale = jitter(t.scale, 0.2);
  t.persistence = Math.min(0.62, Math.max(0.38, jitter(t.persistence, 0.12)));
  t.lacunarity = 1.9 + rand() * 0.4;
  t.ridge = Math.min(1, Math.max(0, t.ridge + (rand() * 2 - 1) * 0.15));
  t.warp = jitter(t.warp, 0.4);
  t.plates = t.plates ? Math.round(jitter(t.plates, 0.3)) : 0;
  if (variant === 'cratered') t.craters = Math.max(t.craters, 0.7);
  if (variant === 'maria') t.basins = 1;
  if (variant === 'chaos-terrain') t.chaos = 1;
  if (variant === 'rubble-pile' || variant === 'debris-halo') t.craters = Math.max(t.craters, 0.6);
  if (variant === 'geyser-field' || variant === 'plume') t.volcanoes = Math.max(t.volcanoes, 0.5);

  const surface = s.surface ?? {};
  const temp = s.tempMeanC ?? (body.type === 'rogue-planet' ? -200 : 0);
  const range = s.tempRangeC ?? [temp - 20, temp + 20];
  const tilt = ((body.rotation?.axialTiltDeg ?? s.axialTiltDeg ?? 15) * Math.PI) / 180;
  const water = w.lavaSea ?? w.tarSea ?? (surface.water ?? (w.surface === 'biome' ? 60 : 0)) / 100;
  const ice = (surface.ice ?? 0) / 100;

  // Colours: the land from appearance.color, varied.
  const hue = (rand() * 2 - 1) * 0.08;
  const base = shift(color, hue);
  let rock = [mul(base, 0.75), base, mix(base, [0.92, 0.9, 0.86], 0.35)];
  if (w.rock) rock = [mul(hex(w.rock), 0.75), hex(w.rock), mix(hex(w.rock), [1, 1, 1], 0.3)];
  let accent = mul(base, 0.5);
  if (w.icy) {
    rock = [mix(base, [0.72, 0.76, 0.8], 0.5), mix(base, [0.9, 0.93, 0.96], 0.6), [0.95, 0.97, 1]];
    accent = world === 'snowball' ? [0.55, 0.65, 0.75] : variant === 'dirty-ice' ? [0.35, 0.3, 0.27] : [0.55, 0.3, 0.2]; // Europa's red-brown cracks
  }
  if (w.io) {
    rock = [[0.9, 0.82, 0.35], [0.95, 0.9, 0.62], [0.85, 0.55, 0.25]];
    accent = [0.08, 0.06, 0.05];
  }
  if (variant === 'rust') rock = rock.map((c) => mix(c, [0.62, 0.3, 0.18], 0.45));
  if (w.springs) accent = [0.2, 0.7, 0.7];
  if (w.scorched) accent = [0.08, 0.07, 0.07];
  const glow = (w.glow ?? 0) * (variant === 'magma-ocean' || variant === 'lava-lakes' ? 1.3 : 1) + (variant === 'rogue-warmed' ? 0.25 : 0);
  return {
    kind: 'terrain', seed, terrain: t,
    surface: w.surface ?? 'mineral',
    climate: {
      temp, spread: Math.min(90, Math.max(12, (range[1] - range[0]) * 1.2)) * (1 - 0.45 * Math.sin(tilt)),
      tidal: w.eyeball || (s.tidallyLocked && w.surface === 'biome') ? 1 : 0,
      water, ice, moist: w.moist ?? 0, frozenSea: w.frozenSea ?? (temp < -15 && w.surface === 'biome' ? 1 : 0),
      lavaSea: w.lavaSea ? 1 : 0, tarSea: w.tarSea ? 1 : 0,
    },
    vegetation: w.vegetation === 'deep' ? mix(base, [0.1, 0.25, 0.08], 0.3) : base,
    rock, accent,
    waterDeep: w.lavaSea ? [0.9, 0.25, 0.05] : w.tarSea ? [0.02, 0.02, 0.02] : shift([0.015, 0.05, 0.12], (rand() * 2 - 1) * 0.1),
    waterShallow: w.lavaSea ? [1, 0.55, 0.15] : w.tarSea ? [0.06, 0.05, 0.04] : shift([0.05, 0.24, 0.3], (rand() * 2 - 1) * 0.15),
    glow, glowColor: w.glowColor ? hex(w.glowColor) : variant === 'rogue-warmed' ? [0.3, 0.8, 1] : [1, 0.38, 0.08],
    gloss: w.gloss ?? 0, glitter: w.glitter ?? 0, icy: w.icy ?? 0, io: w.io ?? 0,
    clouds: body.appearance?.clouds ? (s.precipitation === 'wet' ? 0.62 : s.precipitation === 'light' ? 0.3 : 0.48) : 0,
    cityLights: Math.min(1, Math.log10(1 + (body.profile?.population ?? 0)) / 6),
    air: air(body, false),
  };
}
