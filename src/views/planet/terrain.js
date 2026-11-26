// The ground of a rocky or icy world: the patches of cubeSphere.js raised by
// the world's height, and coloured, lit and seen through its air per pixel.
//
// Height = the baked shape (fields.js: plates, mountain belts, basins, big
// craters, volcanoes) + fine detail made on the spot, finer the closer the
// camera: noise and ridges, dunes, canyons, ice cracks, small craters,
// crystal facets, terraces. The vertices take as much detail as the patch
// can hold; the pixels take the rest through the surface's slope (shading),
// so nearer views always show more.
//
// Colour: 'biome' worlds look up land cover by temperature and moisture
// (biomes.js), with bare rock on steep slopes and mountain belts, snow on cold
// heights and beaches at the shore; 'mineral' worlds use their palette over
// height and noise, with basins, crater rims and rays, cracks, calderas and
// crystal facets. Seas are drawn flat at sea level, glossy (they catch the
// sun), frozen on cold worlds, molten on lava worlds and black tar on carbon
// ones. Night sides show lava glow and, on settled worlds, city lights.
// Clouds cast shadows; rings cast shadows; the air dims and hazes it all.

import * as THREE from 'three';
import { NOISE, CUBE } from './noise.js';
import { SCATTER, airUniforms } from './atmosphere.js';
import { COVER } from './clouds.js';
import { MAX_HINTS } from './fields.js';

const HEIGHT = /* glsl */ `
  uniform samplerCube uShape;
  uniform vec3 uSeed;
  uniform float uScale, uPersistence, uLacunarity, uRidge, uDetail;
  uniform float uDunes, uTerrace, uCanyons, uCracks, uCrystals, uCraters, uChaos;
  float gRim, gRay, gLine, gFacet; // features found by the last height(), for colour
  float shapeH(vec3 d) { return (texture(uShape, d).r - 0.5) * 4.0; }
  float detail(vec3 d, float oct) {
    vec3 p = d * uScale * 9.0 + uSeed;
    float h = uDetail * mix(fbm(p, oct, uPersistence, uLacunarity), ridged(p * 0.7, oct, uPersistence, uLacunarity) - 0.45, uRidge);
    gRim = 0.0; gRay = 0.0; gLine = 0.0; gFacet = 0.0;
    if (uDunes > 0.0) {
      vec3 q = d * 90.0 + uSeed;
      float wave = q.x * 0.8 + q.y * 0.55 + q.z * 0.2 + 3.0 * fbm(q * 0.08, 3.0);
      h += uDunes * 0.01 * pow(1.0 - abs(sin(wave * 3.14159)), 2.0) * smoothstep(-0.2, 0.3, fbm(d * 4.0 + uSeed.yzx, 3.0));
    }
    if (uCanyons > 0.0) {
      float c = 1.0 - abs(fbm(d * uScale * 2.2 + uSeed.yzx, 6.0) * 2.4);
      h -= uCanyons * 0.2 * pow(sat(c), 14.0);
    }
    if (uCracks > 0.0) {
      vec3 q = d * 3.0 + uSeed.zxy;
      for (int i = 0; i < 3; i++) {
        float n = 1.0 - abs(gnoise(q + 0.35 * fbm(q * 2.0, 3.0)));
        gLine = max(gLine, pow(n, 60.0));
        q = OCT * q * 1.7;
      }
      h += uCracks * 0.012 * gLine;
    }
    if (uCraters > 0.0) {
      float r1, y1, r2, y2;
      h += uCraters * (0.05 * craterField(d * 26.0 + uSeed, 0.5, r1, y1) + (oct > 6.0 ? 0.02 * craterField(d * 80.0 + uSeed.yzx, 0.55, r2, y2) : 0.0));
      gRim = max(r1, oct > 6.0 ? r2 * 0.6 : 0.0); gRay = y1;
    }
    if (uCrystals > 0.0) {
      vec3 id;
      vec3 c = cells(d * 45.0 + uSeed, id);
      h += uCrystals * 0.02 * (c.y - c.x);
      gFacet = hash13(id);
    }
    return h;
  }
  float terrace(float h) {
    if (uTerrace <= 0.0) return h;
    float f = h * 14.0;
    float t = (floor(f) + smoothstep(0.0, 1.0, pow(fract(f), 3.0))) / 14.0;
    return mix(h, t, uTerrace);
  }
  float height(vec3 d, float oct) { return terrace(shapeH(d) + detail(d, oct)); }
`;

const vertex = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute vec3 aGrid;
  attribute vec4 iPatch;
  attribute float iLevel;
  uniform float uSea, uHasSea, uDisplace;
  varying vec3 vDir;
  ${NOISE}
  ${CUBE}
  ${HEIGHT}
  void main() {
    vec2 ab = iPatch.yz + aGrid.xy * iPatch.w;
    vec3 dir = normalize(spherify(faceN(iPatch.x) + ab.x * faceU(iPatch.x) + ab.y * faceV(iPatch.x)));
    float h = terrace(textureLod(uShape, dir, 0.0).r * 4.0 - 2.0 + detail(dir, clamp(iLevel + 2.0, 2.0, 8.0)));
    float lift = uHasSea > 0.5 ? max(h - uSea, 0.0) : h;
    float r = 1.0 + clamp(lift * uDisplace, -0.004, 0.005);
    if (aGrid.z > 0.5) r -= 0.03 * iPatch.w; // the skirt
    vDir = dir;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(dir * r, 1.0);
    #include <logdepthbuf_vertex>
  }`;

const fragment = /* glsl */ `
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D uBiomes, uRingAlpha;
  uniform vec3 uCam, uRock0, uRock1, uRock2, uAccent, uWaterDeep, uWaterShallow, uIce, uGlowColor;
  uniform float uSea, uHasSea, uFrozenSea, uLavaSea, uTarSea, uBump, uReliefKm;
  uniform float uBiome, uGlow, uGloss, uGlitter, uIcy, uIo, uSprings, uCity;
  uniform float uAmbient, uSun, uExposure, uOpacity;
  uniform float uRing, uRingInner, uRingOuter, uDebug;
  uniform vec4 uHint[${MAX_HINTS}];
  uniform float uHintCount;
  varying vec3 vDir;
  ${NOISE}
  ${SCATTER}
  ${HEIGHT}
  ${COVER}

  float ringShadow(vec3 p, vec3 L) {
    if (uRing < 0.5 || abs(L.z) < 1e-3) return 1.0;
    float t = -p.z / L.z;
    if (t <= 0.0) return 1.0;
    float r = length((p + L * t).xy);
    if (r < uRingInner || r > uRingOuter) return 1.0;
    return 1.0 - 0.85 * texture(uRingAlpha, vec2((r - uRingInner) / (uRingOuter - uRingInner), 0.5)).r;
  }

  void main() {
    #include <logdepthbuf_fragment>
    vec3 d = normalize(vDir);
    float e = max(length(fwidth(vDir)), 2e-6);
    float oct = clamp(log2(1.0 / (e * uScale * 9.0)) + 0.5, 1.0, 9.0);
    float h = height(d, oct);
    float rim = gRim, ray = gRay, line = gLine, facet = gFacet;
    vec4 shp = texture(uShape, d);
    bool sea = uHasSea > 0.5 && h < uSea;

    // The surface's slope, from the height a pixel or so away.
    vec3 t1 = normalize(cross(abs(d.z) < 0.99 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0), d));
    vec3 t2 = cross(d, t1);
    float eps = max(e * 1.5, 1e-5);
    float floorH = uHasSea > 0.5 ? uSea : -9.0;
    float hc = max(h, floorH);
    float h1 = max(height(normalize(d + t1 * eps), oct), floorH);
    float h2 = max(height(normalize(d + t2 * eps), oct), floorH);
    vec3 N = normalize(d - ((h1 - hc) * t1 + (h2 - hc) * t2) / eps * uBump);
    float slope = 1.0 - dot(N, d);

    // Climate, looked up a little off the spot by fine noise, so its coarse
    // grid never shows: boundaries between biomes come out ragged and natural.
    float fineOct = clamp(oct - 3.0, 1.0, 6.0);
    vec3 jit = vec3(fbm(d * 60.0 + uSeed, fineOct), fbm(d * 60.0 + uSeed.yzx + 4.0, fineOct), fbm(d * 60.0 + uSeed.zxy + 8.0, fineOct));
    vec4 cl = texture(uClimate, normalize(d + jit * 0.018));
    float elevKm = max(0.0, h - max(uSea, -2.0)) * uReliefKm;
    float T = cl.r * 200.0 - 100.0 - 6.5 * max(0.0, h - shapeH(d)) * uReliefKm + 4.0 * fbm(d * 40.0 + uSeed, fineOct);
    float M = clamp(cl.g + 0.16 * fbm(d * 90.0 + uSeed.yzx, fineOct) + 0.08 * jit.x, 0.0, 1.0);

    vec3 albedo;
    float gloss = uGloss, spec = 60.0;
    vec3 emit = vec3(0.0);
    float mottle = fbm(d * uScale * 30.0 + uSeed.zxy, min(oct, 5.0));
    if (sea) {
      float depth = uSea - shapeH(d);
      if (uLavaSea > 0.5) {
        float crust = smoothstep(-0.32, -0.12, fbm(d * 30.0 + uSeed, min(oct, 6.0)));
        albedo = mix(vec3(0.03, 0.02, 0.015), vec3(0.07, 0.05, 0.04), crust);
        emit = mix(uWaterDeep, uWaterShallow, pow(1.0 - crust, 3.0)) * pow(1.0 - crust, 2.0) * 0.8;
        gloss = 0.2;
      } else if (uTarSea > 0.5) {
        albedo = uWaterDeep; gloss = 1.0; spec = 220.0;
      } else if (uFrozenSea > 0.5 || T < -12.0) {
        albedo = mix(vec3(0.78, 0.86, 0.94), uIce, 0.5 + 0.5 * mottle) * (1.0 - 0.15 * line);
        gloss = 0.35;
      } else {
        albedo = mix(uWaterShallow, uWaterDeep, smoothstep(0.0, 0.12, depth));
        // Waves for the sun's glint.
        N = normalize(d + 0.015 * vec3(gnoise(d * 400.0 + uSeed), gnoise(d * 400.0 + uSeed.yzx), gnoise(d * 400.0 + uSeed.zxy)));
        gloss = 1.0; spec = 350.0;
        // Sea ice near the poles.
        albedo = mix(albedo, vec3(0.88, 0.92, 0.96), smoothstep(-6.0, -12.0, T + 3.0 * mottle));
      }
    } else if (uBiome > 0.5) {
      albedo = texture(uBiomes, vec2((T + 50.0) / 100.0, 1.0 - M)).rgb;
      vec3 rock = mix(uRock0, uRock2, 0.5 + 0.5 * mottle) * 0.8;
      float rocky = sat(slope * 18.0 - 0.15) + shp.g * smoothstep(1.0, 4.5, elevKm) * 0.7;
      albedo = mix(albedo, rock, sat(rocky));
      albedo = mix(albedo, uIce, smoothstep(-1.0, -7.0, T - slope * 30.0)); // snow on cold heights
      if (uHasSea > 0.5) albedo = mix(albedo, vec3(0.82, 0.76, 0.6), smoothstep(0.005, 0.0, h - uSea) * step(4.0, T) * (1.0 - sat(slope * 30.0)));
      // Patchwork: woods and clearings, fields of lighter and darker ground.
      float fields = fbm(d * 400.0 + uSeed.zxy, clamp(oct - 5.0, 1.0, 4.0));
      albedo *= 0.82 + 0.25 * (mottle + 0.5) + 0.18 * fields;
    } else {
      float hr = h - shapeH(d) * 0.5;
      albedo = mix(uRock0, uRock1, smoothstep(-0.35, 0.35, fbm(d * uScale * 3.0 + uSeed.zxy, 5.0) + 0.3 * hr));
      albedo = mix(albedo, uRock2, smoothstep(0.25, 0.9, shapeH(d)) * 0.6);
      albedo *= 0.82 + 0.36 * (mottle + 0.5);
      albedo *= 1.0 - 0.45 * shp.b;                       // basins (maria)
      albedo = mix(albedo, uRock2 * 1.05, sat(rim * 0.1 + ray * 0.35)); // crater rims, rays
      albedo = mix(albedo, uAccent, line * (uIcy > 0.5 ? 0.85 : 0.5));         // cracks
      if (uChaos > 0.0) albedo = mix(albedo, uAccent * 1.2, smoothstep(0.15, 0.35, fbm(d * 6.0 + uSeed.yzx, 5.0)) * uChaos * 0.55);
      if (uIo > 0.5) {
        float v = shp.a;
        albedo = mix(albedo, vec3(0.75, 0.2, 0.08), smoothstep(0.25, 0.45, v) * (1.0 - smoothstep(0.55, 0.7, v)) * 0.8); // red rings
        albedo = mix(albedo, uAccent, smoothstep(0.7, 0.85, v));                                                      // black calderas
      }
      if (uSprings > 0.5) albedo = mix(albedo, uAccent, smoothstep(0.75, 0.9, shp.a) * 0.8);
      if (uGlitter > 0.0) albedo *= 0.8 + 0.4 * facet;
    }

    // Glow: lava in cracks and calderas, seen on the night side too.
    if (uGlow > 0.0 && !sea) {
      float cracks = ridged(d * uScale * 5.0 + uSeed, 5.0, 0.5, 2.0);
      float g = smoothstep(0.82, 0.97, cracks) * (uIo > 0.5 ? smoothstep(0.8, 0.95, shp.a) * 3.0 : 1.0);
      emit += uGlowColor * g * uGlow * 0.7;
      albedo = mix(albedo, albedo * 0.3, uGlow * 0.6 * (1.0 - g)); // dark crust
    }

    // Light.
    vec3 L = uSunDir;
    float mu = dot(d, L);
    float day = smoothstep(-0.06, 0.08, mu);
    float diff = max(dot(N, L), 0.0) * day;
    if (uClouds > 0.0) diff *= 1.0 - 0.5 * cloudCover(normalize(d + L * 0.01), 4.0);
    diff *= ringShadow(d, L);
    vec3 col = albedo * (uSunColor * uSun * diff + uAmbient);
    if (gloss > 0.0) {
      vec3 V = normalize(uCam - d);
      vec3 H = normalize(L + V);
      float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
      float s = pow(max(dot(N, H), 0.0), spec) * (spec + 8.0) / 25.0;
      col += uSunColor * uSun * s * gloss * (0.25 + fres) * day * (sea ? 0.08 : 0.25) * ringShadow(d, L);
      if (uGlitter > 0.0 && hash13(floor(d * 2500.0)) > 0.985) col += uSunColor * uSun * pow(max(dot(N, H), 0.0), 8.0) * uGlitter * 2.0 * day;
    }
    col += emit;
    // City lights on the night side, gathered round the towns.
    if (uCity > 0.0) {
      float lights = 0.0;
      for (int i = 0; i < ${MAX_HINTS}; i++) {
        if (float(i) >= uHintCount) break;
        if (uHint[i].w < 0.5) continue;
        lights += exp(-(1.0 - dot(d, uHint[i].xyz)) / 0.00025);
      }
      // Specks, not a glow: streets and towns.
      float speck = pow(sat(fbm(d * 900.0 + uSeed, 3.0) + 0.55), 6.0);
      lights = min(lights, 1.0) * speck * (sea ? 0.0 : 1.0);
      col += vec3(1.0, 0.72, 0.38) * lights * uCity * 0.6 * (1.0 - smoothstep(-0.15, 0.02, mu));
    }
    // Through the air.
    vec3 rd = normalize(d - uCam);
    vec3 tr;
    vec3 ins = scatter(uCam, rd, length(d - uCam), tr);
    // A little less haze over the ground than a strict model gives, so the land
    // reads clearly; the sky at the limb keeps it all.
    col = col * mix(vec3(1.0), tr, 0.7) + ins * 0.55;
    gl_FragColor = vec4(tonemap(col * uExposure), uOpacity);
    // Debug views (set uDebug from the console): 1 height, 2 moisture, 3 temperature.
    if (uDebug > 0.5) gl_FragColor = vec4(uDebug < 1.5 ? vec3(0.5 + 0.25 * (h - uSea), sea ? 0.0 : 0.5, sea ? 1.0 : 0.0) : uDebug < 2.5 ? vec3(M) : vec3(sat((T + 50.0) / 100.0), 0.0, 1.0 - sat((T + 50.0) / 100.0)), 1.0);
  }`;

const v3 = (a) => new THREE.Vector3(...a);

export function terrainMaterial({ r, fields, hints, biomes, radiusKm, ringAlpha, ring }) {
  const t = r.terrain;
  const hint = hints.map(([x, y, z, w]) => new THREE.Vector4(x, y, z, w));
  while (hint.length < MAX_HINTS) hint.push(new THREE.Vector4());
  const displace = Math.min(0.005, (t.reliefKm * 4) / radiusKm);
  const c = r.climate;
  const u = {
    ...airUniforms(r.air),
    uShape: { value: fields.shape }, uClimate: { value: fields.climate }, uBiomes: { value: biomes }, uRingAlpha: { value: ringAlpha },
    uSeed: { value: v3(r.seed) }, uScale: { value: t.scale }, uPersistence: { value: t.persistence }, uLacunarity: { value: t.lacunarity },
    uRidge: { value: t.ridge }, uDetail: { value: t.detail }, uDunes: { value: t.dunes }, uTerrace: { value: t.terrace },
    uCanyons: { value: t.canyons }, uCracks: { value: t.cracks }, uCrystals: { value: t.crystals }, uCraters: { value: Math.min(1, t.craters * 1.5) },
    uChaos: { value: t.chaos },
    uSea: { value: fields.sea }, uHasSea: { value: fields.sea > -8 ? 1 : 0 }, uFrozenSea: { value: c.frozenSea }, uLavaSea: { value: c.lavaSea }, uTarSea: { value: c.tarSea },
    uDisplace: { value: displace }, uBump: { value: Math.max(0.03, displace * 12) }, uReliefKm: { value: t.reliefKm },
    uBiome: { value: r.surface === 'biome' ? 1 : 0 },
    uRock0: { value: v3(r.rock[0].map((x) => x ** 2.2)) }, uRock1: { value: v3(r.rock[1].map((x) => x ** 2.2)) }, uRock2: { value: v3(r.rock[2].map((x) => x ** 2.2)) },
    uAccent: { value: v3(r.accent.map((x) => x ** 2.2)) }, uIce: { value: v3([0.85, 0.89, 0.95]) },
    uWaterDeep: { value: v3(r.waterDeep.map((x) => x ** 2.2)) }, uWaterShallow: { value: v3(r.waterShallow.map((x) => x ** 2.2)) },
    uGlow: { value: r.glow }, uGlowColor: { value: v3(r.glowColor) }, uGloss: { value: r.gloss }, uGlitter: { value: r.glitter },
    uIcy: { value: r.icy }, uIo: { value: r.io }, uSprings: { value: r.accent && r.terrain.volcanoes && r.icy ? 1 : 0 }, uCity: { value: r.cityLights },
    uClouds: { value: r.clouds }, uHint: { value: hint }, uHintCount: { value: hints.length },
    uRing: { value: ring ? 1 : 0 }, uRingInner: { value: ring?.[0] ?? 0 }, uRingOuter: { value: ring?.[1] ?? 0 },
    uDebug: { value: 0 }, uCam: { value: new THREE.Vector3() }, uAmbient: { value: 0.01 }, uSun: { value: 1.7 }, uExposure: { value: 1 }, uOpacity: { value: 1 },
  };
  return new THREE.ShaderMaterial({ uniforms: u, vertexShader: vertex, fragmentShader: fragment });
}
