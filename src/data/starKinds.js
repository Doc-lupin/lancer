// Star kinds: what the view needs to draw each `kind` in the schema's starKind list.
//
// luminosity (Sun = 1), temperature (K) and colorWord are copied from STAR in
// tools/derive_stats.py; keep the two in step (tools/check_star_kinds.py checks).
//
// color is the display color, picked by hand to match colorWord and temperature.
// Hues are a little stronger than true star colors so kinds stay apart on a dark
// map. The black hole's color is its accretion disk's glow.
//
// radius (Sun = 1) is worked out from luminosity and temperature, the way
// derive_stats.py does: R = sqrt(L) / (T / 5772)^2. Four kinds don't fit that
// formula and are set by hand:
//   neutron star, pulsar, magnetar: 10 km.
//   black hole: event horizon of 8 Suns (MASS in derive_stats.py), 23.6 km.
//   brown dwarf: 0.1, about Jupiter's size (the formula gives 0.4).

export const SUN_RADIUS_KM = 695700;

export const STAR_KINDS = {
  'red-dwarf':         { luminosity: 0.02,    temperature: 3200,   colorWord: 'red',              color: '#ff6a3d', radius: 0.46 },
  'orange-dwarf':      { luminosity: 0.25,    temperature: 4500,   colorWord: 'orange',           color: '#ffa45c', radius: 0.823 },
  'yellow-dwarf':      { luminosity: 1.0,     temperature: 5800,   colorWord: 'yellow-white',     color: '#ffe9a8', radius: 0.99 },
  'yellow-white-star': { luminosity: 2.5,     temperature: 6600,   colorWord: 'white',            color: '#fff6e4', radius: 1.21 },
  'white-star':        { luminosity: 15,      temperature: 9000,   colorWord: 'brilliant white',  color: '#f2f5ff', radius: 1.59 },
  'blue-white-star':   { luminosity: 300,     temperature: 15000,  colorWord: 'blue-white',       color: '#c8d8ff', radius: 2.56 },
  'blue-star':         { luminosity: 30000,   temperature: 35000,  colorWord: 'blue',             color: '#9db4ff', radius: 4.71 },
  'protostar':         { luminosity: 5,       temperature: 4000,   colorWord: 'orange, veiled',   color: '#ff9a55', radius: 4.66 },
  'subgiant':          { luminosity: 4,       temperature: 5500,   colorWord: 'yellow',           color: '#ffe08a', radius: 2.2 },
  'red-giant':         { luminosity: 150,     temperature: 4000,   colorWord: 'swollen red',      color: '#ff7a45', radius: 25.5 },
  'orange-giant':      { luminosity: 60,      temperature: 4500,   colorWord: 'swollen orange',   color: '#ffa04f', radius: 12.7 },
  'yellow-giant':      { luminosity: 150,     temperature: 5500,   colorWord: 'swollen yellow',   color: '#ffd36b', radius: 13.5 },
  'blue-giant':        { luminosity: 10000,   temperature: 20000,  colorWord: 'blue',             color: '#aabfff', radius: 8.33 },
  'red-supergiant':    { luminosity: 50000,   temperature: 3500,   colorWord: 'vast red',         color: '#ff5a30', radius: 608 },
  'blue-supergiant':   { luminosity: 200000,  temperature: 20000,  colorWord: 'blue',             color: '#a6bcff', radius: 37.2 },
  'carbon-star':       { luminosity: 5000,    temperature: 3000,   colorWord: 'deep red',         color: '#e0301c', radius: 262 },
  'wolf-rayet':        { luminosity: 100000,  temperature: 50000,  colorWord: 'violet-white',     color: '#c9b8ff', radius: 4.21 },
  'white-dwarf':       { luminosity: 0.001,   temperature: 10000,  colorWord: 'tiny white',       color: '#e8eeff', radius: 0.0105 },
  'neutron-star':      { luminosity: 0.00001, temperature: 600000, colorWord: 'invisible',        color: '#b8c8ff', radius: 1.44e-5 },
  'pulsar':            { luminosity: 0.00001, temperature: 600000, colorWord: 'flickering point', color: '#d0dcff', radius: 1.44e-5 },
  'magnetar':          { luminosity: 0.00001, temperature: 600000, colorWord: 'invisible',        color: '#c0b0ff', radius: 1.44e-5 },
  'black-hole':        { luminosity: 0.0,     temperature: 0,      colorWord: 'none',             color: '#ffb070', radius: 3.39e-5 },
  'remnant':           { luminosity: 0.001,   temperature: 5000,   colorWord: 'faint',            color: '#c8b8a0', radius: 0.0421 },
  'brown-dwarf':       { luminosity: 0.0003,  temperature: 1200,   colorWord: 'dull red',         color: '#a8402a', radius: 0.1 },
};
