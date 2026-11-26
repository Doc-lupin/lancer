// The end of the render pipeline (task B0.4). The scene renders into a
// half-float buffer in linear light; one effect tone maps it
// (the shoulder in color.js), and the composer encodes it for the screen
// (sRGB). Bloom (B0.5) runs in the same composer, before the tone map.
//
// Multisampling smooths globe edges. It is 4× on screens under 2 device pixels
// per CSS pixel (computers) and off on denser screens (phones), where pixels
// are small enough to hide the steps and a 4× half-float buffer would take
// about 80 MB. Quality tiers (B0.6) will set this.
//
// The composer draws in two renderer calls, and three.js counts draw calls per
// call. So the count is reset once a frame here, after the debug hook has read
// the last frame's total (priority 0) and before the composer draws (1).

import { useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from '@react-three/postprocessing';
import { Effect, BlendFunction, BloomEffect } from 'postprocessing';
import { OUTPUT_GLSL } from './color.js';
import { useMap } from '../data/store.js';

class ToneMap extends Effect {
  constructor() {
    super('LancerToneMap', /* glsl */ `
${OUTPUT_GLSL}
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = vec4(shoulder(max(inputColor.rgb, 0.0)), inputColor.a);
}`, { blendFunction: BlendFunction.SRC });
  }
}

export default function Output() {
  const gl = useThree((s) => s.gl);
  const toneMap = useMemo(() => new ToneMap(), []);
  // Bloom (task B0.5): light over a luminance of 2 spreads into a soft halo.
  // Chart marks never pass 2 (color.js), so only light blooms: star cores
  // (Stars.jsx) and hot lava (Planet.jsx). Added before the tone map.
  const bloom = useMemo(() => new BloomEffect({ blendFunction: BlendFunction.ADD, mipmapBlur: true, luminanceThreshold: 2, luminanceSmoothing: 0.4, intensity: 0.9, radius: 0.7 }), []);
  const samples = useThree((s) => (s.viewport.dpr >= 2 ? 0 : 4));
  useEffect(() => {
    gl.info.autoReset = false;
    return () => { gl.info.autoReset = true; };
  }, [gl]);
  useFrame(() => gl.info.reset(), 0.5);
  // Exposure (exposure.js) is a shared uniform: redraw when it changes.
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => useMap.subscribe((s, prev) => { if (s.exposure !== prev.exposure) invalidate(); }), [invalidate]);
  return (
    <EffectComposer frameBufferType={THREE.HalfFloatType} multisampling={samples}>
      <primitive object={bloom} />
      <primitive object={toneMap} />
    </EffectComposer>
  );
}
