// Gas giants, and worlds hidden under thick haze: no ground, only cloud tops,
// made per pixel so they stay sharp however close the camera comes.
//
//   bands       zones and belts from the jets: the band pattern is pulled by
//               turbulence (noise sheared along the jets, so it streams in
//               lines), with eddies and festoons at the band edges
//   storms      up to six ovals, each a swirl; the first is the great one
//   polar       some giants get a hexagonal polar jet
//   streaks     bright high clouds (ice giants)
//   thermal     hot giants glow dull red on their night side
// Lit with a soft terminator, shaded by rings, seen through their own thick
// air (atmosphere.js). Uses the cube-sphere patches without raising them.

import * as THREE from 'three';
import { NOISE, CUBE } from './noise.js';
import { SCATTER, airUniforms } from './atmosphere.js';
import { EXPOSURE } from '../exposure.js';

const vertex = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute vec3 aGrid;
  attribute vec4 iPatch;
  varying vec3 vDir;
  ${CUBE}
  void main() {
    vec2 ab = iPatch.yz + aGrid.xy * iPatch.w;
    vec3 dir = normalize(spherify(faceN(iPatch.x) + ab.x * faceU(iPatch.x) + ab.y * faceV(iPatch.x)));
    float r = aGrid.z > 0.5 ? 1.0 - 0.03 * iPatch.w : 1.0;
    vDir = dir;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(dir * r, 1.0);
    #include <logdepthbuf_vertex>
  }`;

const fragment = /* glsl */ `
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D uRingAlpha;
  uniform vec3 uCam, uSeed, uP0, uP1, uP2, uP3;
  uniform vec4 uStorm[6];
  uniform float uStormCount, uBands, uContrast, uTurb, uStreaks, uThermal, uPolar;
  uniform float uAmbient, uSun, uExposure, uOpacity, uRing, uRingInner, uRingOuter;
  varying vec3 vDir;
  ${NOISE}
  ${SCATTER}

  float ringShadow(vec3 p, vec3 L) {
    if (uRing < 0.5 || abs(L.z) < 1e-3) return 1.0;
    float t = -p.z / L.z;
    if (t <= 0.0) return 1.0;
    float r = length((p + L * t).xy);
    if (r < uRingInner || r > uRingOuter) return 1.0;
    return 1.0 - 0.85 * texture(uRingAlpha, vec2((r - uRingInner) / (uRingOuter - uRingInner), 0.5)).r;
  }
  // Turn a point about the pole by an angle.
  vec3 spin(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z); }

  void main() {
    #include <logdepthbuf_fragment>
    vec3 d = normalize(vDir);
    float e = max(length(fwidth(vDir)), 2e-6);
    float oct = clamp(log2(1.0 / (e * 6.0)) + 1.0, 2.0, 9.0);
    float lat = asin(d.z);
    // Jets: each band turns at its own rate, shearing the clouds into streams.
    float jet = sin(lat * uBands + uSeed.x);
    vec3 q = spin(d, jet * 1.6 * uTurb);
    vec3 p = vec3(q.x * 1.2, q.y * 1.2, q.z * 5.0) * 2.0 + uSeed;
    vec3 w = vec3(fbm(p * 0.6, 4.0), fbm(p * 0.6 + 7.1, 4.0), fbm(p * 0.6 + 3.3, 4.0));
    float turb = fbm(p + 1.8 * w * uTurb, oct);
    float edge = 1.0 - abs(jet);                          // band edges, where eddies form
    float y = lat + 0.05 * uTurb * turb + 0.03 * uTurb * edge * fbm(p * 3.0 + 5.0, oct - 1.0);
    float b = 0.6 * sin(y * uBands + uSeed.x) + 0.28 * sin(y * uBands * 2.31 + uSeed.y) + 0.12 * sin(y * uBands * 5.07 + uSeed.z);
    float zone = smoothstep(-0.6, 0.6, b);
    vec3 col = mix(uP1, uP0, mix(0.5, zone, uContrast));
    col = mix(col, uP2, smoothstep(0.3, 0.9, fbm(p * 1.5 + 11.0, oct - 1.0) + 0.3) * 0.35);
    col *= 0.88 + 0.24 * (turb + 0.5);

    // Storms.
    for (int i = 0; i < 6; i++) {
      if (float(i) >= uStormCount) break;
      vec4 s = uStorm[i];
      vec3 c = vec3(cos(s.x) * cos(s.y), cos(s.x) * sin(s.y), sin(s.x));
      vec3 east = normalize(cross(vec3(0.0, 0.0, 1.0), c));
      vec3 north = cross(c, east);
      vec2 o = vec2(dot(d - c, east) / 1.7, dot(d - c, north)) / s.z;
      float r = length(o);
      if (r > 1.6 || dot(d, c) < 0.0) continue;
      float swirl = 0.5 + 0.5 * sin(r * 10.0 - 3.0 * atan(o.y, o.x) + fbm(vec3(o * 3.0, float(i)), 4.0) * 3.0);
      float inside = smoothstep(1.0, 0.55, r);
      vec3 sc = s.w > 0.5 ? uP3 : uP0 * 1.08;
      col = mix(col, mix(sc, sc * 0.8, swirl), inside * 0.85);
      col = mix(col, uP0 * 1.05, smoothstep(1.25, 1.0, r) * (1.0 - inside) * 0.5); // a pale collar
    }
    // A hexagonal polar jet.
    if (uPolar > 0.5 && d.z > 0.0) {
      float a = atan(d.y, d.x);
      float hex = cos(3.14159 / 6.0) / cos(mod(a, 3.14159 / 3.0) - 3.14159 / 6.0);
      float rr = length(d.xy) / 0.42;
      col = mix(col, uP1 * 0.85, smoothstep(0.06, 0.0, abs(rr - hex)) * 0.6);
      col = mix(col, uP3, smoothstep(0.3, 0.0, rr) * 0.4);
    }
    // Bright high clouds.
    if (uStreaks > 0.0) {
      float st = smoothstep(0.55, 0.8, fbm(vec3(q.x * 3.0, q.y * 3.0, q.z * 30.0) + uSeed, oct - 1.0) + 0.3);
      col = mix(col, vec3(0.97, 0.99, 1.0), st * uStreaks * 0.7);
    }
    col *= 1.0 - 0.3 * smoothstep(1.1, 1.5, abs(lat)); // darker poles

    vec3 albedo = pow(col, vec3(2.2));
    vec3 L = uSunDir;
    float mu = dot(d, L);
    float diff = smoothstep(-0.12, 0.35, mu) * (0.35 + 0.65 * max(mu, 0.0)) * ringShadow(d, L);
    vec3 c3 = albedo * (uSunColor * uSun * diff + uAmbient);
    if (uThermal > 0.0) c3 += vec3(0.9, 0.18, 0.05) * uThermal * 0.25 * (0.6 + 0.4 * turb) * (1.0 - smoothstep(-0.2, 0.2, mu));
    vec3 rd = normalize(d - uCam);
    vec3 tr;
    vec3 ins = scatter(uCam, rd, length(d - uCam), tr);
    c3 = c3 * tr + ins;
    gl_FragColor = vec4(c3 * uExposure, uOpacity); // linear; Output.jsx tone maps
  }`;

const v3 = (a) => new THREE.Vector3(...a);

export function gasMaterial({ r, ringAlpha, ring }) {
  const storms = r.storms.map(([la, lo, size, dark]) => new THREE.Vector4(la, lo, size, dark));
  while (storms.length < 6) storms.push(new THREE.Vector4());
  const u = {
    ...airUniforms(r.air),
    uRingAlpha: { value: ringAlpha }, uSeed: { value: v3(r.seed) },
    uP0: { value: v3(r.palette[0]) }, uP1: { value: v3(r.palette[1]) }, uP2: { value: v3(r.palette[2] ?? r.palette[0]) }, uP3: { value: v3(r.palette[3] ?? r.palette[1]) },
    uStorm: { value: storms }, uStormCount: { value: r.storms.length },
    uBands: { value: r.bands }, uContrast: { value: Math.min(1, r.contrast) }, uTurb: { value: r.turbulence },
    uStreaks: { value: r.streaks }, uThermal: { value: r.thermal }, uPolar: { value: r.polar },
    uRing: { value: ring ? 1 : 0 }, uRingInner: { value: ring?.[0] ?? 0 }, uRingOuter: { value: ring?.[1] ?? 0 },
    uCam: { value: new THREE.Vector3() }, uAmbient: { value: 0.01 }, uSun: { value: 1.7 }, uExposure: EXPOSURE, uOpacity: { value: 1 },
  };
  return new THREE.ShaderMaterial({ uniforms: u, vertexShader: vertex, fragmentShader: fragment });
}
