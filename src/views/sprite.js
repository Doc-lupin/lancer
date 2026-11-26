// Shared vertex shader for camera-facing sprites drawn with instancing: region
// effect puffs and system-center icons. As with the star glow (task 2.6), the
// fragment shader gets only values that are the same at every corner (flat):
// the sprite's center and radius in device pixels, its color and its type.
// Values that vary across a shape fail at light-year distances.
//
// aSize is a diameter in CSS pixels, or with uWorldSize = 1 a radius in km.
// With uFadeTo > 0, sprites fade out as their radius grows from uFadeFrom to
// uFadeTo screen heights, so a puff close to the camera doesn't fill the view.

import * as THREE from 'three';
import { FROM_DISPLAY_GLSL } from './color.js';

export const spriteVertex = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec4 aColor;
attribute float aSize;
attribute float aType;
uniform vec2 uViewport;
uniform float uPixelRatio;
uniform float uWorldSize;
uniform float uFadeFrom;
uniform float uFadeTo;
flat varying vec2 vCenter;
flat varying float vRadius;
flat varying vec4 vColor;
flat varying float vType;
void main() {
  vec4 c = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float r = uWorldSize > 0.5
    ? aSize * projectionMatrix[1][1] / c.w * 0.5 * uViewport.y
    : 0.5 * aSize * uPixelRatio;
  float fade = uFadeTo > 0.0 ? 1.0 - smoothstep(uFadeFrom, uFadeTo, r / uViewport.y) : 1.0;
  if (c.w <= 0.0 || aColor.a * fade < 0.002) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vCenter = (c.xy / c.w * 0.5 + 0.5) * uViewport;
  vRadius = r;
  vColor = vec4(aColor.rgb, aColor.a * fade);
  vType = aType;
  gl_Position = c;
  gl_Position.xy += position.xy * 4.0 * (r + 2.0) / uViewport * c.w; // r plus room for a soft edge
  #include <logdepthbuf_vertex>
}`;

export const spriteFragmentHead = /* glsl */ `
#include <logdepthbuf_pars_fragment>
${FROM_DISPLAY_GLSL}
uniform float uPixelRatio;
flat varying vec2 vCenter;
flat varying float vRadius;
flat varying vec4 vColor;
flat varying float vType;
`;

export function spriteUniforms(extra = {}) {
  return {
    uViewport: { value: new THREE.Vector2() },
    uPixelRatio: { value: 1 },
    uWorldSize: { value: 0 },
    uFadeFrom: { value: 0 },
    uFadeTo: { value: 0 },
    ...extra,
  };
}

// Instanced quad with the sprite attributes, for `count` sprites.
export function spriteGeometry(count) {
  const g = new THREE.PlaneGeometry(1, 1);
  g.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
  g.setAttribute('aSize', new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
  g.setAttribute('aType', new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
  return g;
}

// Keep the viewport uniforms current; call from useFrame.
export function updateViewport(material, size, viewport) {
  material.uniforms.uViewport.value.set(size.width * viewport.dpr, size.height * viewport.dpr);
  material.uniforms.uPixelRatio.value = viewport.dpr;
}
