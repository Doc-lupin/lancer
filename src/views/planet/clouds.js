// The cloud shell, 0.8% above the ground (inside the depth rule of task 2.4
// at globe distances): cloudiness from the climate field (fields.js) with fine
// detail added per pixel, lit by the star with a soft terminator, seen through
// the air like everything else. The ground (terrain.js) reads the same cover
// for the clouds' shadows.

import * as THREE from 'three';
import { NOISE } from './noise.js';
import { SCATTER, airUniforms } from './atmosphere.js';
import { EXPOSURE } from '../exposure.js';

export const CLOUD_SHELL = 1.008;

export const COVER = /* glsl */ `
  uniform samplerCube uClimate;
  uniform float uClouds;
  float cloudCover(vec3 d, float octaves) {
    float base = texture(uClimate, d).b;
    float detail = fbm(d * 22.0 + uSeed.zxy, octaves) + 0.5;
    float wisp = fbm(d * 70.0 + uSeed, max(octaves - 2.0, 1.0)) + 0.5;
    return smoothstep(0.42, 0.78, base * 0.8 + detail * 0.32 + wisp * 0.08) * step(0.001, uClouds);
  }
`;

export function cloudMaterial(climate, air, seed) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...airUniforms(air),
      uClimate: { value: climate }, uClouds: { value: 1 }, uSeed: { value: new THREE.Vector3(...seed) },
      uCam: { value: new THREE.Vector3() }, uOpacity: { value: 1 }, uExposure: EXPOSURE, uAmbient: { value: 0.01 }, uSun: { value: 1.7 },
    },
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
      uniform vec3 uSeed, uCam;
      uniform float uOpacity, uExposure, uAmbient, uSun;
      varying vec3 vLocal;
      ${NOISE}
      ${SCATTER}
      ${COVER}
      void main() {
        #include <logdepthbuf_fragment>
        vec3 d = normalize(vLocal);
        float e = max(length(fwidth(vLocal)), 1e-6);
        float oct = clamp(log2(1.0 / (e * 22.0)) + 1.0, 2.0, 7.0);
        float c = cloudCover(d, oct);
        if (c < 0.01) discard;
        float mu = dot(d, uSunDir);
        // Thick cloud is bright on top; thin edges let light through.
        float lit = smoothstep(-0.12, 0.25, mu) * (0.75 + 0.25 * c);
        vec3 col = vec3(0.96, 0.97, 1.0) * (uSunColor * uSun * lit + uAmbient);
        // A warm edge at the terminator.
        col *= mix(vec3(1.0, 0.75, 0.55), vec3(1.0), smoothstep(-0.05, 0.3, mu));
        vec3 p = d * ${CLOUD_SHELL.toFixed(3)};
        vec3 rd = normalize(p - uCam);
        vec3 tr;
        vec3 ins = scatter(uCam, rd, length(p - uCam), tr);
        col = col * mix(vec3(1.0), tr, 0.7) + ins * 0.55;
        gl_FragColor = vec4(col * uExposure, c * 0.95 * uOpacity); // linear; Output.jsx tone maps
      }`,
    transparent: true, depthWrite: false,
  });
}
