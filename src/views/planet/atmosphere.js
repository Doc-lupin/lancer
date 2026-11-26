// Atmospheric scattering: light from the star scattered toward the camera by
// the air (Rayleigh: strong in blue, so skies are blue and sunsets red) and
// by haze (Mie: grey or tinted, bright toward the sun), single scattering,
// ray-marched. The same function serves three places, so they agree:
//   the ground   seen through the air: dimmed and hazed (terrain.js, gas.js)
//   the clouds   likewise (clouds.js)
//   the sky      the shell around the planet, beyond its edge (this file)
// Units: the planet's radius is 1; the air reaches recipe.air.top. Scale
// heights and densities are set from the recipe (from the data's pressure and
// sky colour, recipes.js), and exaggerated a little in height so the air
// shows at globe scale.

import * as THREE from 'three';
import { NOISE } from './noise.js';

export const SCATTER = /* glsl */ `
  uniform float uAir, uAirTop, uHR, uHM, uSkyPower;
  uniform vec3 uRay, uMieColor, uSunDir, uSunColor;
  uniform float uMieB;
  vec2 sphereHit(vec3 ro, vec3 rd, float r) {
    float b = dot(ro, rd), c = dot(ro, ro) - r * r, h = b * b - c;
    if (h < 0.0) return vec2(1e9, -1e9);
    h = sqrt(h);
    return vec2(-b - h, -b + h);
  }
  // Light scattered toward the camera along a ray up to tMax, and what gets
  // through (trans).
  vec3 scatter(vec3 ro, vec3 rd, float tMax, out vec3 trans) {
    trans = vec3(1.0);
    if (uAir < 0.5) return vec3(0.0);
    vec2 a = sphereHit(ro, rd, uAirTop);
    float t0 = max(a.x, 0.0), t1 = min(a.y, tMax);
    if (t1 <= t0) return vec3(0.0);
    float ds = (t1 - t0) / 12.0;
    vec3 sumR = vec3(0.0), sumM = vec3(0.0);
    float odR = 0.0, odM = 0.0;
    for (int i = 0; i < 12; i++) {
      vec3 p = ro + rd * (t0 + ds * (float(i) + 0.5));
      float hgt = max(length(p) - 1.0, 0.0);
      float dR = exp(-hgt / uHR) * ds, dM = exp(-hgt / uHM) * ds;
      odR += dR; odM += dM;
      if (sphereHit(p, uSunDir, 0.999).x > 0.0) continue; // in the planet's shadow
      float ls = sphereHit(p, uSunDir, uAirTop).y / 4.0;
      float lR = 0.0, lM = 0.0;
      for (int j = 0; j < 4; j++) {
        float hq = max(length(p + uSunDir * ls * (float(j) + 0.5)) - 1.0, 0.0);
        lR += exp(-hq / uHR) * ls; lM += exp(-hq / uHM) * ls;
      }
      vec3 att = exp(-(uRay * (odR + lR) + uMieB * 1.1 * (odM + lM)));
      sumR += dR * att; sumM += dM * att;
    }
    trans = exp(-(uRay * odR + uMieB * 1.1 * odM));
    float mu = dot(rd, uSunDir), g = 0.76;
    float pR = 0.0597 * (1.0 + mu * mu);
    float pM = 0.1194 * ((1.0 - g * g) * (1.0 + mu * mu)) / ((2.0 + g * g) * pow(1.0 + g * g - 2.0 * g * mu, 1.5));
    return uSunColor * uSkyPower * (sumR * uRay * pR + sumM * uMieB * uMieColor * pM);
  }
`;

// Uniform values for a recipe's air (null: none).
export function airUniforms(air) {
  const top = air?.top ?? 1.02;
  const span = top - 1;
  const hR = span * 0.25, hM = span * 0.09;
  return {
    uAir: { value: air ? 1 : 0 },
    uAirTop: { value: top },
    uHR: { value: hR },
    uHM: { value: hM },
    uRay: { value: new THREE.Vector3(...(air?.rayleigh ?? [0, 0, 0]).map((v) => v / hR)) },
    uMieB: { value: (air?.mie ?? 0) / hM },
    uMieColor: { value: new THREE.Vector3(...(air?.mieColor ?? [1, 1, 1])) },
    uSkyPower: { value: 6 },
    uSunDir: { value: new THREE.Vector3(1, 0, 0) },
    uSunColor: { value: new THREE.Vector3(1, 1, 1) },
  };
}

// The sky shell: drawn where the view ray misses the planet, adding the light
// scattered along it.
export function skyMaterial(air, shared) {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared, ...airUniforms(air), uCam: { value: new THREE.Vector3() }, uOpacity: { value: 1 }, uExposure: { value: 1 } },
    vertexShader: /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec3 vLocal;
      void main() {
        vLocal = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <logdepthbuf_pars_fragment>
      uniform vec3 uCam;
      uniform float uOpacity, uExposure;
      varying vec3 vLocal;
      ${NOISE}
      ${SCATTER}
      void main() {
        #include <logdepthbuf_fragment>
        vec3 rd = normalize(vLocal * uAirTop - uCam);
        if (sphereHit(uCam, rd, 1.0).x > 0.0) discard; // the ground is drawn by the surface
        vec3 trans;
        vec3 c = scatter(uCam, rd, 1e9, trans);
        gl_FragColor = vec4(tonemap(c * uExposure) * uOpacity, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}
