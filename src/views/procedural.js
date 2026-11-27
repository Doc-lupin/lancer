// Procedural world surfaces, painted on the GPU from each body's data: one
// surface provider for surfaces.js (registerSurface), so a texture file named
// in the data, or a later generator registered after this one, still wins.
//
// What drives the look (all from map.json):
//   type and world      the kind of surface: water world, dry rock, ice,
//                       lava, gas giant, or a world hidden under thick haze
//   variant             details: maria, rust, chaos terrain, magma ocean …
//   stats.surface       water / land / ice percentages: the sea level is set
//                       so the oceans cover the stated share, and the ice caps
//                       reach down to cover theirs
//   stats.tempMeanC     cold worlds get snow on their high ground
//   appearance.color    the land (or cloud-top) colour everything is built on
//   appearance.clouds   a cloud layer
//   tidallyLocked       ice on the far side, open ground facing the star
//
// Each body gets a color map (sRGB), a normal map for its relief, a roughness
// map (oceans are glossy, so they catch the sun), and where it applies an
// emissive map (lava) and a cloud map. Maps are 1024 × 512, equirectangular,
// lon −180° at the left, north at the top, the layout of globeGeometry.js. A
// body is painted when its globe first shows, in a few milliseconds; surfaces.js
// keeps the 16 most recent and frees the rest.
//
// The sea level: a first small pass paints the height alone (256 × 128); it is
// read back, and the level below which the stated share of the surface lies
// (by area) becomes the coastline.

import * as THREE from 'three';
import { registerSurface } from './surfaces.js';
import { WIP_WORLDS } from './planet/switch.js';
import { useMap } from '../data/store.js';
import { tierOf } from './quality.js';
import { view } from './camera/view.js';

// Map size from the quality tier (quality.js): 1024 × 512 at medium and high.
const size = () => tierOf(useMap.getState()).surfaceSize;
const PROBE = [256, 128];

// Which painter each world uses.
const WET = new Set(['continental', 'super-earth', 'megaflora', 'karst', 'ocean']);
const HAZY = new Set(['hothouse', 'steam', 'toxic-air', 'dense-air', 'methane-sea']);
const ICY = new Set(['ice', 'snowball', 'subglacial-ocean', 'cryovolcanic']);
const MOLTEN = new Set(['lava', 'volcanic']);
const KIND = { wet: 0, rock: 1, ice: 2, lava: 3, gas: 4 };
const PASS = { height: 0, color: 1, normal: 2, rough: 3, emit: 4, clouds: 5 };

const GLSL = /* glsl */ `
  uniform float uPass, uKind, uScale, uSea, uWater, uCap, uCraters, uBump, uCold;
  uniform float uMaria, uLineae, uChaos, uMolten, uEyeball, uBandFreq, uContrast, uCloudCover, uWidth;
  uniform vec3 uSeed, uLand, uDry, uHigh, uOcean, uShallow, uIce, uStorm;
  varying vec2 vUv;

  // Gradient noise (3D), and sums of it: continuous over the sphere, no seam.
  vec3 hash33(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return -1.0 + 2.0 * fract((p.xxy + p.yxx) * p.zyx);
  }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return mix(mix(mix(dot(hash33(i), f), dot(hash33(i + vec3(1, 0, 0)), f - vec3(1, 0, 0)), u.x),
                   mix(dot(hash33(i + vec3(0, 1, 0)), f - vec3(0, 1, 0)), dot(hash33(i + vec3(1, 1, 0)), f - vec3(1, 1, 0)), u.x), u.y),
               mix(mix(dot(hash33(i + vec3(0, 0, 1)), f - vec3(0, 0, 1)), dot(hash33(i + vec3(1, 0, 1)), f - vec3(1, 0, 1)), u.x),
                   mix(dot(hash33(i + vec3(0, 1, 1)), f - vec3(0, 1, 1)), dot(hash33(i + vec3(1, 1, 1)), f - vec3(1, 1, 1)), u.x), u.y), u.z);
  }
  const mat3 ROT = mat3(0.00, 1.60, 1.20, -1.60, 0.72, -0.96, -1.20, -0.96, 1.28);
  float fbm(vec3 p, int octaves) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 9; i++) { if (i >= octaves) break; s += a * noise(p); p = ROT * p * 1.03; a *= 0.5; }
    return s;
  }
  float ridged(vec3 p, int octaves) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 7; i++) { if (i >= octaves) break; float n = 1.0 - abs(noise(p)); s += a * n * n; p = ROT * p * 1.03; a *= 0.5; }
    return s;
  }

  // Craters: bowls with raised rims, at one size per call.
  float craters(vec3 p, float density) {
    vec3 i = floor(p), f = fract(p);
    float h = 0.0;
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
      vec3 c = vec3(x, y, z);
      vec3 r = hash33(i + c) * 0.5 + 0.5;
      if (r.z > density) continue;
      float size = 0.18 + 0.3 * fract(r.x * 7.3 + r.y * 3.1);
      float t = length(c + r - f) / size;
      if (t > 1.6) continue;
      float bowl = t < 1.0 ? (t * t - 1.0) : 0.0;
      float rim = exp(-pow((t - 1.0) / 0.22, 2.0)) * 0.35;
      h += (bowl + rim) * size;
    }
    return h;
  }

  vec3 dirAt(vec2 uv) {
    float lon = (uv.x - 0.5) * 6.2831853, lat = (uv.y - 0.5) * 3.1415927;
    return vec3(cos(lat) * cos(lon), cos(lat) * sin(lon), sin(lat));
  }

  // Height, unitless (sea level is uSea); w returns the swirl used, for color.
  float height(vec3 d) {
    vec3 p = d * uScale + uSeed;
    vec3 w = vec3(fbm(p * 0.7 + 1.7, 4), fbm(p * 0.7 + 9.2, 4), fbm(p * 0.7 + 4.4, 4));
    float h = fbm(p + w * 1.1, 8);
    float hills = ridged(p * 2.6 + w, 6);
    h += 0.22 * hills * smoothstep(-0.05, 0.25, h);
    if (uCraters > 0.0) {
      h += uCraters * (0.5 * craters(d * 5.0 + uSeed, 0.35) + 0.25 * craters(d * 12.0 + uSeed, 0.45) + 0.12 * craters(d * 30.0 + uSeed, 0.5));
    }
    if (uKind == 3.0) h += 0.15 * fbm(p * 3.0, 4);
    return h;
  }

  float lineae(vec3 d) {
    vec3 p = d * 3.0 + uSeed;
    float l = 0.0;
    for (int i = 0; i < 3; i++) {
      float n = 1.0 - abs(noise(p + float(i) * 7.1 + 0.4 * fbm(p * 2.0, 3)));
      l = max(l, pow(n, 28.0));
      p = ROT * p * 0.9;
    }
    return l;
  }

  // Gas giants and hazy worlds: bands pulled about by turbulence, and a storm.
  vec3 bands(vec3 d, out float storm) {
    float lat = asin(d.z);
    vec3 p = d * 2.0 + uSeed;
    float turb = fbm(vec3(p.x * 1.5, p.y * 1.5, p.z * 6.0), 6);
    float fine = fbm(vec3(p.x * 6.0, p.y * 6.0, p.z * 24.0), 5);
    float y = lat + 0.06 * turb + 0.012 * fine;
    float b = 0.55 * sin(y * uBandFreq + uSeed.x) + 0.3 * sin(y * uBandFreq * 2.3 + uSeed.y) + 0.15 * sin(y * uBandFreq * 5.1 + uSeed.z);
    // A great storm: an oval, swirled.
    vec3 sd = vec3(cos(uStorm.x) * cos(uStorm.y), cos(uStorm.x) * sin(uStorm.y), sin(uStorm.x));
    float ang = acos(clamp(dot(d, sd), -1.0, 1.0));
    vec3 east = normalize(cross(vec3(0, 0, 1), sd));
    float dx = dot(d - sd, east), dy = d.z - sd.z;
    float r = length(vec2(dx / 1.8, dy)) / max(uStorm.z, 1e-3); // (no storm: size 0)
    storm = uStorm.z > 0.0 ? smoothstep(1.0, 0.6, r) : 0.0;
    float zone = smoothstep(-0.55, 0.55, b);
    if (storm > 0.0) zone = mix(zone, 0.5 + 0.5 * sin(min(r, 2.0) * 9.0 + 4.0 * atan(dy, dx)), storm * 0.35);
    vec3 belt = uDry, light = uLand;
    vec3 c = mix(belt, light, mix(0.5, zone, uContrast));
    c *= 0.9 + 0.2 * fine;
    c = mix(c, uHigh, storm * 0.5 * (0.7 + 0.3 * fine));
    c *= 1.0 - 0.25 * smoothstep(1.05, 1.45, abs(lat)); // darker poles
    return c;
  }

  vec3 toLinear(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }

  void main() {
    vec3 d = dirAt(vUv);
    float lat = asin(d.z);
    vec3 p = d * uScale + uSeed;
    float h = uKind == 4.0 ? 0.0 : height(d);
    float wet = uWater > 0.0 ? step(h, uSea) : 0.0;
    // Ice caps: the share of the sphere above |lat| = asin(uCap) is the ice share.
    float capEdge = abs(d.z) - uCap + 0.06 * fbm(p * 2.0 + 3.0, 4);
    float cap = uCap < 1.0 ? smoothstep(-0.01, 0.02, capEdge) : 0.0;
    if (uEyeball > 0.0) cap = max(cap, smoothstep(0.05, 0.25, -d.x + 0.12 * fbm(p * 2.0, 4)));

    if (uPass == 0.0) { gl_FragColor = vec4(vec3(clamp(h * 0.5 + 0.5, 0.0, 1.0)), 1.0); return; }

    if (uPass == 2.0) {
      // Normal (tangent space: x east, y north) from the height's slopes.
      if (uKind == 4.0) { gl_FragColor = vec4(0.5, 0.5, 1.0, 1.0); return; }
      float e = 1.5 / uWidth * 6.2831853;
      float clat = max(cos(lat), 0.05);
      vec3 de = vec3(-d.y, d.x, 0.0) / max(length(d.xy), 1e-4);
      vec3 dn = normalize(cross(de, d));
      float hx = (max(height(normalize(d + de * e)), uWater > 0.0 ? uSea : -9.0) - max(height(normalize(d - de * e)), uWater > 0.0 ? uSea : -9.0)) / (2.0 * e);
      float hy = (max(height(normalize(d + dn * e)), uWater > 0.0 ? uSea : -9.0) - max(height(normalize(d - dn * e)), uWater > 0.0 ? uSea : -9.0)) / (2.0 * e);
      float k = uBump * (1.0 - cap * 0.6);
      vec3 n = normalize(vec3(-hx * k, -hy * k, 1.0));
      gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
      return;
    }

    if (uPass == 3.0) {
      float r = wet > 0.5 ? 0.5 : mix(0.9, 0.55, cap);
      if (uKind == 2.0) r = 0.6;
      if (uKind == 3.0) r = 0.75;
      if (uKind == 4.0) r = 1.0; // cloud tops: no shine
      gl_FragColor = vec4(vec3(r), 1.0);
      return;
    }

    if (uPass == 5.0) {
      // Clouds: weather in bands (wet at the equator and mid-latitudes, clear
      // in the subtropics), swirled.
      vec3 q = d * 2.2 + uSeed * 1.3;
      vec3 w = vec3(fbm(q * 0.8, 4), fbm(q * 0.8 + 5.2, 4), fbm(q * 0.8 + 9.7, 4));
      float c = fbm(q + w * 1.6, 8) * 0.5 + 0.5;
      float a = abs(lat);
      float climate = 0.1 * exp(-a * a / 0.02) - 0.16 * exp(-pow((a - 0.45) / 0.14, 2.0)) + 0.1 * exp(-pow((a - 0.95) / 0.2, 2.0));
      float cover = smoothstep(0.6 - uCloudCover * 0.25, 0.8 - uCloudCover * 0.25, c + climate);
      cover *= 0.55 + 0.4 * (fbm(q * 6.0, 4) * 0.5 + 0.5);
      gl_FragColor = vec4(vec3(cover), 1.0);
      return;
    }

    float glow = 0.0;
    vec3 col;
    if (uKind == 4.0) {
      float storm;
      col = bands(d, storm);
    } else {
      float t = clamp((h - uSea) / 0.55, 0.0, 1.0); // height above the sea
      float moist = fbm(p * 1.3 + 20.0, 5) * 0.5 + 0.5;
      moist += 0.18 * exp(-lat * lat / 0.03) - 0.28 * exp(-pow((abs(lat) - 0.45) / 0.15, 2.0));
      vec3 ground = mix(uDry, uLand, smoothstep(0.35, 0.65, moist));
      ground = mix(ground, uHigh, smoothstep(0.25, 0.75, t));
      ground *= 0.85 + 0.3 * (fbm(p * 8.0, 4) * 0.5 + 0.5);
      if (uMaria > 0.0) ground = mix(ground, ground * 0.55, smoothstep(0.05, 0.2, fbm(p * 0.8 + 7.0, 4)) * uMaria);
      if (uCraters > 0.0) {
        float cr = craters(d * 12.0 + uSeed, 0.45);
        ground *= 1.0 + 0.6 * clamp(cr * 3.0, -0.3, 0.4);
      }
      // Snow on high ground, more on cold worlds.
      float snow = smoothstep(0.75 - 0.5 * uCold, 0.95 - 0.5 * uCold, t + 0.1 * fbm(p * 4.0, 3)) * step(0.5, uWater + uCold);
      ground = mix(ground, uIce, snow);
      col = ground;
      if (uKind == 2.0) {
        float dirty = fbm(p * 2.5 + 2.0, 6) * 0.5 + 0.5;
        col = mix(uIce, uLand, smoothstep(0.35, 0.75, dirty) * 0.7);
        float l = lineae(d) * uLineae;
        col = mix(col, uHigh, l * 0.8);
        if (uChaos > 0.0) col = mix(col, uHigh * 1.1, smoothstep(0.2, 0.35, fbm(p * 1.5 + 13.0, 5)) * uChaos * 0.6);
      }
      if (uKind == 3.0) {
        float cracks = pow(ridged(p * 1.6 + 2.0, 5), 3.0);
        float pools = smoothstep(0.1, 0.25, fbm(p * 0.9 + 6.0, 5)) * uMolten;
        glow = clamp(smoothstep(0.55, 0.85, cracks) + pools, 0.0, 1.0);
        col = mix(uLand * 0.6, vec3(1.0, 0.45, 0.12), glow * 0.85);
      }
      if (wet > 0.5) {
        float depth = clamp((uSea - h) / 0.25, 0.0, 1.0);
        col = mix(uShallow, uOcean, smoothstep(0.0, 0.6, depth));
      }
      col = mix(col, uIce, cap);
    }

    if (uPass == 4.0) { gl_FragColor = vec4(toLinear(vec3(1.0, 0.42, 0.1) * glow * 1.4), 1.0); return; }
    gl_FragColor = vec4(toLinear(col), 1.0);
  }
`;

let material = null;
function painter() {
  if (material) return material;
  const uniforms = {};
  for (const n of ['uPass', 'uKind', 'uScale', 'uSea', 'uWater', 'uCap', 'uCraters', 'uBump', 'uCold', 'uMaria', 'uLineae', 'uChaos', 'uMolten', 'uEyeball', 'uBandFreq', 'uContrast', 'uCloudCover', 'uWidth']) uniforms[n] = { value: 0 };
  for (const n of ['uSeed', 'uLand', 'uDry', 'uHigh', 'uOcean', 'uShallow', 'uIce', 'uStorm']) uniforms[n] = { value: new THREE.Vector3() };
  material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: GLSL,
    depthTest: false, depthWrite: false,
  });
  return material;
}

// "#rrggbb" → [r, g, b], 0–1, as written (display values).
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const scale = (a, k) => a.map((v) => Math.min(1, v * k));

// Everything the painter needs to know about a body.
function settings(body, rand) {
  const s = body.stats ?? {};
  const surface = s.surface ?? {};
  const color = rgb(body.appearance?.color ?? '#8a8070');
  const world = body.world ?? '';
  const variant = body.variant ?? '';
  const kind = body.type === 'gas-giant' || HAZY.has(world) ? KIND.gas
    : MOLTEN.has(world) ? KIND.lava
      : ICY.has(world) ? KIND.ice
        : WET.has(world) || (surface.water ?? 0) > 5 ? KIND.wet : KIND.rock;
  const temp = s.tempMeanC ?? 0;
  const water = kind === KIND.wet ? (surface.water ?? 60) / 100 : 0;
  const ice = Math.min(0.95, (surface.ice ?? (temp < -60 ? 30 : 0)) / 100);
  const u = {
    uKind: kind, uScale: 1.4 + rand() * 0.8, uSeed: [rand() * 50, rand() * 50, rand() * 50],
    uWater: water, uSea: 0, uCap: kind === KIND.ice ? 1 : 1 - ice,
    uCraters: ['barren', 'iron', 'shattered', 'flare-scoured', 'pulsar-world', 'chthonian', 'dust'].includes(world) || variant === 'cratered' || variant === 'maria' ? 0.9 : kind === KIND.ice ? 0.25 : 0,
    uBump: kind === KIND.wet ? 0.35 : kind === KIND.ice ? 0.25 : 0.5,
    uCold: Math.min(1, Math.max(0, (-temp + 5) / 40)),
    uMaria: variant === 'maria' ? 1 : 0,
    uLineae: world === 'subglacial-ocean' || variant === 'thin-shell' || variant === 'geyser-field' ? 1 : 0.25,
    uChaos: variant === 'chaos-terrain' ? 1 : 0,
    uMolten: variant === 'magma-ocean' || variant === 'lava-lakes' ? 1 : world === 'lava' ? 0.4 : 0,
    uEyeball: s.tidallyLocked && body.type === 'planet' && kind !== KIND.gas ? 1 : 0,
    uBandFreq: body.type === 'gas-giant' ? 9 + rand() * 8 : 6 + rand() * 4,
    uContrast: body.type !== 'gas-giant' ? 0.25 : world === 'ice-giant' || world === 'mini-neptune' ? 0.35 : world === 'helium-giant' ? 0.45 : 0.9,
    uStorm: body.type === 'gas-giant' && (variant === 'storm-giant' || rand() < 0.5)
      ? [(rand() * 2 - 1) * 0.6, (rand() * 2 - 1) * Math.PI, 0.08 + rand() * 0.08] : [0, 0, 0],
    uCloudCover: s.precipitation === 'wet' ? 0.45 : s.precipitation === 'light' ? 0.1 : 0.3,
  };
  // Colours, as display values; the painter turns them linear.
  if (kind === KIND.gas) {
    u.uLand = mix(color, [0.97, 0.94, 0.86], 0.45); // light zones
    u.uDry = mix(scale(color, 0.62), [0.55, 0.3, 0.2], 0.15); // dark belts
    u.uHigh = mix(color, [0.85, 0.45, 0.3], 0.5); // the storm
  } else if (kind === KIND.wet) {
    u.uLand = color;
    u.uDry = mix(color, [0.66, 0.56, 0.4], 0.7);
    u.uHigh = mix(color, [0.42, 0.36, 0.3], 0.75);
  } else if (kind === KIND.ice) {
    u.uLand = mix(color, [0.6, 0.55, 0.5], 0.4);
    u.uHigh = mix(color, [0.55, 0.32, 0.22], 0.7); // reddish cracks
  } else {
    u.uLand = color;
    u.uDry = mix(color, scale(color, 1.25), 0.6);
    u.uHigh = scale(color, 0.72);
  }
  u.uOcean = [0.03, 0.09, 0.2];
  u.uShallow = [0.07, 0.3, 0.38];
  u.uIce = kind === KIND.ice ? mix([0.93, 0.95, 0.98], color, 0.25) : [0.92, 0.94, 0.97];
  return u;
}

function setUniforms(m, u) {
  for (const [k, v] of Object.entries(u)) {
    if (Array.isArray(v)) m.uniforms[k].value.set(...v);
    else m.uniforms[k].value = v;
  }
}

// The height below which `share` of the sphere's area lies.
function seaLevel(values, [w, h], share) {
  const pairs = [];
  let total = 0;
  for (let y = 0; y < h; y++) {
    const weight = Math.cos(((y + 0.5) / h - 0.5) * Math.PI);
    for (let x = 0; x < w; x++) { pairs.push([values[y * w + x], weight]); total += weight; }
  }
  pairs.sort((a, b) => a[0] - b[0]);
  let acc = 0;
  for (const [v, wt] of pairs) { acc += wt; if (acc >= share * total) return v * 2 - 1; }
  return 1;
}

const GLOBES = new Set(['planet', 'gas-giant', 'moon', 'rogue-planet']);

// Off while the WIP procedural worlds are on (planet/switch.js).
if (!WIP_WORLDS) registerSurface((body, { random, newTarget, paint, readRedAsync, enqueue }) => {
  if (!GLOBES.has(body.type) || body.appearance?.texture) return null;
  const m = painter();
  const u = settings(body, random(`surface:${body.id}`));
  const SIZE = size();
  u.uWidth = SIZE[0];
  // The maps exist at once, empty; a job paints them a tile at a time (task
  // B0.9), so the view never stops. The globe shows when they are ready.
  const targets = [];
  const target = (w, h, opts) => { const t = newTarget(w, h, opts); targets.push(t); return t; };
  const passes = [
    [PASS.color, target(SIZE[0], SIZE[1], { color: true })],
    [PASS.normal, target(SIZE[0], SIZE[1], { color: false })],
    [PASS.rough, target(SIZE[0] / 2, SIZE[1] / 2, { color: false })],
  ];
  const maps = {
    tint: false,
    ready: false,
    map: passes[0][1].texture,
    normalMap: passes[1][1].texture,
    roughnessMap: passes[2][1].texture,
    dispose: () => { maps.disposed = true; targets.forEach((t) => t.dispose()); },
  };
  if (u.uKind === KIND.lava) { const t = target(SIZE[0], SIZE[1], { color: true }); passes.push([PASS.emit, t]); maps.emissiveMap = t.texture; }
  if (body.appearance?.clouds && u.uKind !== KIND.gas) { const t = target(SIZE[0], SIZE[1], { color: false }); passes.push([PASS.clouds, t]); maps.clouds = t.texture; }
  // The material is shared: set this body's settings before each pass.
  const use = (pass) => { setUniforms(m, u); m.uniforms.uPass.value = pass; return m; };
  enqueue(function* surfaceJob() {
    if (u.uWater > 0) {
      // Sea level: the height on a small map, read back without stopping the
      // GPU, and the level below which the stated share of the area lies.
      const probe = newTarget(PROBE[0], PROBE[1], { color: false, mipmaps: false });
      yield* paint(probe, use(PASS.height));
      const red = yield readRedAsync(probe);
      probe.dispose();
      u.uSea = seaLevel(red, PROBE, u.uWater);
    }
    for (const [pass, t] of passes) {
      if (maps.disposed) return;
      yield* paint(t, use(pass));
    }
    maps.ready = true;
  }, { name: `surface ${body.id}`, priority: body.id === view.rig?.focusId ? 1 : 0 });
  return maps;
});
