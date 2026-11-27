// A world's large-scale fields, painted once on the GPU into two cube maps
// (seamless, no polar pinching) when its globe first shows:
//
//   shape    (256² a face) height, mountain belts, basins, volcanoes. Height
//            comes from tectonic plates: plates of continental or oceanic
//            crust, each turning about its own axis; where two meet head-on
//            they raise mountain ranges (continent to continent), coastal
//            ranges and trenches (continent to ocean) or island arcs (ocean to
//            ocean); where they pull apart, rift valleys and mid-ocean ridges.
//            Over that, noise (octaves, persistence, lacunarity, ridges,
//            warp), craters, basins and volcanoes, and the places' pull.
//   climate  (128² a face) temperature, moisture and cloudiness. Temperature
//            from latitude (or, for a tidally locked world, the angle from the
//            point facing its star), the world's mean and spread, and height
//            (6.5 °C per km). Moisture is carried by the prevailing winds
//            (trade winds, westerlies, polar easterlies): the shader walks
//            upwind to the nearest sea, and loses moisture with distance and
//            to any mountains in between (rain shadows); plus the rainy
//            equator and the dry subtropics.
//
// The sea level is set so the oceans cover the stated share of the surface:
// a small flat map of the height is painted and read back, and the level
// below which that share of the area lies becomes the coastline.
//
// Values are stored in 0–1 (height h as h / 4 + 0.5, temperature T as
// (T + 100) / 200), so an 8-bit fallback works where half floats can't be
// drawn to.

import * as THREE from 'three';
import { NOISE } from './noise.js';
import { bake, readRed } from '../surfaces.js';

const SHAPE_SIZE = 256;
const CLIMATE_SIZE = 256;
const PROBE = [256, 128];
export const MAX_PLATES = 24;
export const MAX_HINTS = 32;

// The shape field, as a function of direction. Shared by the cube pass and
// the flat probe.
const SHAPE = /* glsl */ `
  uniform vec3 uSeed;
  uniform float uPlateCount, uMountains, uRift, uPlateWarp;
  uniform vec4 uPlate[${MAX_PLATES}];  // centre, base height
  uniform vec4 uMotion[${MAX_PLATES}]; // turning axis × speed, continental
  uniform float uScale, uOctaves, uPersistence, uLacunarity, uRidge, uWarp;
  uniform float uCraters, uBasins, uVolcanoes;
  uniform vec4 uHint[${MAX_HINTS}];
  uniform float uHintCount;
  ${NOISE}

  vec4 shape(vec3 d) {
    float mountain = 0.0;
    vec3 w = vec3(fbm(d * 1.7 + uSeed, 4.0), fbm(d * 1.7 + uSeed.yzx + 5.2, 4.0), fbm(d * 1.7 + uSeed.zxy + 9.7, 4.0));
    float h;
    if (uPlateCount > 0.5) {
      vec3 dw = normalize(d + uPlateWarp * w);
      int i1 = 0, i2 = 0; float c1 = -2.0, c2 = -2.0;
      for (int i = 0; i < ${MAX_PLATES}; i++) {
        if (float(i) >= uPlateCount) break;
        float c = dot(dw, uPlate[i].xyz);
        if (c > c1) { c2 = c1; i2 = i1; c1 = c; i1 = i; } else if (c > c2) { c2 = c; i2 = i; }
      }
      float gap = 0.5 * (acos(clamp(c2, -1.0, 1.0)) - acos(clamp(c1, -1.0, 1.0)));
      float b1 = uPlate[i1].w, b2 = uPlate[i2].w;
      // Continental crust raised, oceanic low; the coasts themselves come from
      // the noise below, so they don't follow the plates' edges.
      h = 0.3 * mix(0.5 * (b1 + b2), b1, smoothstep(0.0, 0.35, gap));
      vec3 toOther = uPlate[i2].xyz - uPlate[i1].xyz;
      vec3 across = normalize(toOther - dw * dot(toOther, dw) + 1e-5);
      float conv = dot(cross(uMotion[i1].xyz, dw) - cross(uMotion[i2].xyz, dw), across);
      float near = exp(-gap / 0.045), wide = exp(-gap / 0.11);
      bool k1 = uMotion[i1].w > 0.5, k2 = uMotion[i2].w > 0.5;
      if (conv > 0.0) {
        if (k1 && k2) { h += uMountains * conv * 0.9 * wide; mountain = conv * wide; }        // ranges
        else if (k1) { h += uMountains * conv * 0.75 * near; mountain = conv * near; }        // coastal range
        else if (k2) h -= 0.45 * conv * near;                                                 // trench
        else { h += 0.4 * conv * near; mountain = 0.5 * conv * near; }                        // island arc
      } else {
        if (k1) h += uRift * conv * 0.6 * near;                                               // rift valley
        else h -= 0.3 * conv * near * 0.5;                                                    // mid-ocean ridge
      }
      h += 0.75 * fbm(d * uScale * 0.8 + uSeed + uWarp * 1.4 * w, uOctaves, uPersistence, uLacunarity);
    } else {
      h = 0.7 * fbm(d * uScale + uSeed + uWarp * w, uOctaves, uPersistence, uLacunarity);
    }
    // Ranges get crests.
    float crest = ridged(d * uScale * 2.6 + uSeed.zxy, 6.0, uPersistence, uLacunarity);
    h += (0.12 * uRidge + 0.6 * clamp(mountain, 0.0, 1.0)) * (crest - 0.35);
    mountain = clamp(mountain * 1.5 + 0.3 * uRidge * crest * step(0.0, h), 0.0, 1.0);
    // Basins: wide, smooth lowlands (the dark maria of a moon).
    float basin = uBasins > 0.0 ? smoothstep(0.08, 0.32, fbm(d * 1.1 + uSeed.yxz + 3.0, 4.0)) * uBasins : 0.0;
    h -= 0.22 * basin;
    // Large craters.
    float rim, ray, volc = 0.0;
    if (uCraters > 0.0) {
      h += uCraters * (0.55 * craterField(d * 3.5 + uSeed, 0.35, rim, ray) + 0.3 * craterField(d * 8.0 + uSeed.yzx, 0.45, rim, ray));
    }
    // Volcanoes: broad shields with a caldera at the top.
    if (uVolcanoes > 0.0) {
      vec3 id;
      vec3 c = cells(d * 4.0 + uSeed, id);
      float keep = step(0.55, hash13(id));
      float cone = exp(-c.x * c.x * 9.0) * keep;
      h += uVolcanoes * (0.35 * cone - 0.25 * exp(-c.x * c.x * 140.0) * keep);
      volc = cone;
    }
    // The places' pull: land under towns, sea where the names say so.
    float pull = 0.0;
    for (int i = 0; i < ${MAX_HINTS}; i++) {
      if (float(i) >= uHintCount) break;
      pull += uHint[i].w * exp(-(1.0 - dot(d, uHint[i].xyz)) / 0.02);
    }
    // Enough to lift the ground above the sea, not to pile up mountains.
    h += 0.28 * tanh(pull) * (1.0 - smoothstep(0.1, 0.5, h) * step(0.0, pull));
    return vec4(h, mountain, basin, volc);
  }
`;

// Where the wind comes from (shared with the World Lab's wind view in
// terrain.js). Needs uTidal.
export const UPWIND = /* glsl */ `
  // Where the wind comes from (a unit vector along the ground).
  vec3 upwind(vec3 d) {
    if (uTidal > 0.5) {
      vec3 s = vec3(1.0, 0.0, 0.0);
      vec3 away = d * dot(d, s) - s; // away from the point facing the star
      return length(away) > 1e-4 ? normalize(away) : vec3(0.0, 1.0, 0.0);
    }
    vec3 east = normalize(cross(vec3(0.0, 0.0, 1.0), d) + vec3(1e-5, 0.0, 0.0));
    vec3 pole = cross(d, east) * sign(d.z);
    float lat = abs(asin(d.z));
    // Trade winds and polar easterlies blow from the east, westerlies from the
    // west; smoothly, so the belts don't leave seams.
    float fromEast = cos(lat * 4.0);
    return normalize(east * fromEast + pole * 0.25 * cos(lat * 2.0));
  }
`;

const CLIMATE = /* glsl */ `
  uniform samplerCube uShape;
  uniform float uSea, uHasSea, uReliefKm, uTemp, uSpread, uTidal, uMoist, uClouds;
  uniform vec3 uSeed;
  ${NOISE}
  float heightAt(vec3 d) { return (texture(uShape, d).r - 0.5) * 4.0; }
  ${UPWIND}
  vec4 climate(vec3 d) {
    float lat = asin(d.z);
    float h = heightAt(d);
    float elevKm = max(0.0, h - uSea) * uReliefKm;
    float warm = uTidal > 0.5 ? d.x : 1.5 * (cos(lat) * cos(lat) - 2.0 / 3.0);
    float T = uTemp + uSpread * warm - 6.5 * elevKm + 3.0 * fbm(d * 3.0 + uSeed, 3.0);
    float m;
    if (uHasSea < 0.5) m = 0.12 + 0.2 * (fbm(d * 2.0 + uSeed, 4.0) + 0.5);
    else if (h < uSea) m = 1.0;
    else {
      // Walk upwind to the sea, noting the highest ground crossed; three paths
      // a little apart, averaged, so the moisture spreads instead of streaking.
      m = 0.0;
      for (int k = -1; k <= 1; k++) {
        vec3 p = d;
        float dist = 3.0, barrier = 0.0, stride = 0.022, prev = h;
        for (int i = 1; i <= 48; i++) {
          vec3 wind = upwind(p);
          vec3 side = cross(p, wind);
          p = normalize(p + normalize(wind + side * 0.35 * float(k)) * stride);
          float hp = heightAt(p);
          if (hp < uSea) { dist = (float(i) - 1.0 + (prev - uSea) / max(prev - hp, 1e-4)) * stride; break; }
          barrier = max(barrier, (hp - uSea) * uReliefKm);
          prev = hp;
        }
        m += (0.12 + 0.88 * exp(-dist / 0.6)) * exp(-max(0.0, barrier - elevKm) / 3.0) / 3.0;
      }
      m = clamp(m + 0.15 * smoothstep(0.0, 3.0, elevKm), 0.0, 1.0); // windward slopes
    }
    float a = uTidal > 0.5 ? 0.0 : abs(lat);
    m += 0.3 * exp(-a * a / 0.025) - 0.18 * exp(-pow((a - 0.5) / 0.12, 2.0)) + 0.12 * exp(-pow((a - 0.95) / 0.2, 2.0));
    m = clamp(m + uMoist + 0.12 * fbm(d * 4.0 + uSeed.yzx, 4.0), 0.0, 1.0);
    // Cloudiness: weather bands, more over wet ground, swirled.
    vec3 q = d * 2.2 + uSeed * 1.3;
    vec3 sw = vec3(fbm(q * 0.8, 4.0), fbm(q * 0.8 + 5.2, 4.0), fbm(q * 0.8 + 9.7, 4.0));
    float c = fbm(q + sw * 2.2, 7.0) + 0.45;
    float band = uTidal > 0.5 ? 0.35 * exp(-pow(1.0 - d.x, 2.0) * 3.0) : 0.12 * exp(-a * a / 0.02) - 0.18 * exp(-pow((a - 0.45) / 0.14, 2.0)) + 0.12 * exp(-pow((a - 0.95) / 0.2, 2.0));
    float cloud = clamp(c + band + 0.25 * (m - 0.5) - (1.0 - uClouds) * 0.6, 0.0, 1.0);
    return vec4((T + 100.0) / 200.0, m, cloud, 1.0);
  }
`;

const cubeVertex = 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const flatVertex = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

let halfFloat = null;
function cubeTarget(gl, size) {
  halfFloat ??= gl.extensions.has('EXT_color_buffer_half_float') || gl.extensions.has('EXT_color_buffer_float');
  return new THREE.WebGLCubeRenderTarget(size, {
    type: halfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType,
    generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, depthBuffer: false,
  });
}

function paintCube(gl, target, material) {
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), material));
  material.side = THREE.BackSide;
  const cam = new THREE.CubeCamera(0.1, 10, target);
  cam.update(gl, scene);
  scene.children[0].geometry.dispose();
  material.dispose();
}

function uniformsFrom(values) {
  const u = {};
  for (const [k, v] of Object.entries(values)) u[k] = { value: v };
  return u;
}

// Plates for a world: centres spread over the sphere (a jittered spiral),
// each continental or oceanic, each turning about its own axis.
export function makePlates(t, rand) {
  const n = Math.min(MAX_PLATES, t.plates);
  const plate = [], motion = [];
  const turn = rand() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const z = 1 - (2 * (i + 0.5)) / n + (rand() - 0.5) * (1.2 / n);
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    const a = i * 2.39996 + turn + (rand() - 0.5) * 0.6;
    const cont = rand() < t.continental;
    plate.push(new THREE.Vector4(r * Math.cos(a), r * Math.sin(a), z, cont ? 0.3 + 0.15 * rand() : -0.45 + 0.12 * rand()));
    const ax = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize().multiplyScalar(0.4 + 0.6 * rand());
    motion.push(new THREE.Vector4(ax.x, ax.y, ax.z, cont ? 1 : 0));
  }
  while (plate.length < MAX_PLATES) { plate.push(new THREE.Vector4()); motion.push(new THREE.Vector4()); }
  return { plate, motion, count: n };
}

// The height below which `share` of the sphere's area lies, from a flat map.
function seaLevel(values, [w, h], share) {
  const pairs = [];
  let total = 0;
  for (let y = 0; y < h; y++) {
    const weight = Math.cos(((y + 0.5) / h - 0.5) * Math.PI);
    for (let x = 0; x < w; x++) { pairs.push([values[y * w + x], weight]); total += weight; }
  }
  pairs.sort((a, b) => a[0] - b[0]);
  let acc = 0;
  for (const [v, wt] of pairs) { acc += wt; if (acc >= share * total) return (v - 0.5) * 4; }
  return 2;
}

// Paint a world's fields. `r` is its recipe, `hints` its places' pull.
export function paintFields(gl, r, hints, rand) {
  const t = r.terrain;
  const plates = makePlates(t, rand);
  const hint = hints.map(([x, y, z, w]) => new THREE.Vector4(x, y, z, w));
  while (hint.length < MAX_HINTS) hint.push(new THREE.Vector4());
  const shapeUniforms = uniformsFrom({
    uSeed: new THREE.Vector3(...r.seed), uPlateCount: plates.count, uMountains: t.mountains, uRift: t.rift, uPlateWarp: 0.3 + 0.15 * t.warp,
    uPlate: plates.plate, uMotion: plates.motion,
    uScale: t.scale, uOctaves: t.octaves, uPersistence: t.persistence, uLacunarity: t.lacunarity, uRidge: t.ridge, uWarp: t.warp,
    uCraters: t.craters, uBasins: t.basins, uVolcanoes: t.volcanoes,
    uHint: hint, uHintCount: hints.length,
  });

  // The sea level, from a flat probe.
  let sea = -9;
  const water = r.climate.water;
  if (water > 0.005) {
    const probe = new THREE.ShaderMaterial({
      uniforms: shapeUniforms, vertexShader: flatVertex, depthTest: false, depthWrite: false,
      fragmentShader: `varying vec2 vUv; ${SHAPE}
        void main() {
          float lon = (vUv.x - 0.5) * 6.2831853, lat = (vUv.y - 0.5) * 3.1415927;
          vec3 d = vec3(cos(lat) * cos(lon), cos(lat) * sin(lon), sin(lat));
          gl_FragColor = vec4(clamp(shape(d).x / 4.0 + 0.5, 0.0, 1.0), 0.0, 0.0, 1.0);
        }`,
    });
    const target = bake(PROBE[0], PROBE[1], probe, { color: false, mipmaps: false });
    sea = seaLevel(readRed(target), PROBE, Math.min(0.97, water));
    target.dispose();
    probe.dispose();
  }

  const shape = cubeTarget(gl, SHAPE_SIZE);
  paintCube(gl, shape, new THREE.ShaderMaterial({
    uniforms: shapeUniforms, vertexShader: cubeVertex,
    fragmentShader: `varying vec3 vDir; ${SHAPE}
      void main() { vec4 s = shape(normalize(vDir)); gl_FragColor = vec4(s.x / 4.0 + 0.5, s.yzw); }`,
  }));

  const c = r.climate;
  const climate = cubeTarget(gl, CLIMATE_SIZE);
  paintCube(gl, climate, new THREE.ShaderMaterial({
    uniforms: uniformsFrom({
      uShape: shape.texture, uSea: sea, uHasSea: water > 0.005 && !c.lavaSea && !c.tarSea ? 1 : 0, uReliefKm: t.reliefKm,
      uTemp: c.temp, uSpread: c.spread, uTidal: c.tidal, uMoist: c.moist, uClouds: r.clouds ?? 0, uSeed: new THREE.Vector3(...r.seed),
    }),
    vertexShader: cubeVertex,
    fragmentShader: `varying vec3 vDir; ${CLIMATE} void main() { gl_FragColor = climate(normalize(vDir)); }`,
  }));

  return {
    shape: shape.texture, climate: climate.texture, sea,
    dispose: () => { shape.dispose(); climate.dispose(); },
  };
}
