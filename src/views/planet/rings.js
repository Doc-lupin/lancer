// Rings in a body's equatorial plane (appearance.rings): banded, lighting
// themselves (starlight skims along their plane, so a lit material left them
// nearly black), with the planet's shadow across them. The globes (Planet.jsx,
// planet/ProceduralGlobe.jsx) share them, and the planets' shaders read the
// same banding for the rings' shadow on the planet.

import * as THREE from 'three';
import { displayColor } from '../color.js';
import { random } from '../surfaces.js';

export const RING_INNER = 1.35;
export const RING_OUTER = 2.3;

// Ring textures, along the ring from its inner edge to its outer edge: how
// opaque (bands and gaps, kept linear) and how light (a little variation).
export const ringTextures = (() => {
  let made = null;
  return () => {
    if (made) return made;
    const rand = random('rings');
    const W = 512;
    // Three broad rings: a faint inner one, a dense middle one and a fainter
    // outer one past a wide gap, with fine banding over all three.
    const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const zone = (t, a, b, edge) => smoothstep(a, a + edge, t) * (1 - smoothstep(b - edge, b, t));
    const fine = Array.from({ length: 40 }, () => [rand(), 0.002 + 0.01 * rand(), rand() * 2 - 1]);
    const gaps = [[0.635, 0.018, 0.92], [0.885, 0.005, 0.85], [0.33, 0.004, 0.5]];
    const alpha = (t) => {
      let a = 0.28 * zone(t, 0, 0.22, 0.04) + 0.92 * zone(t, 0.2, 0.62, 0.03) + 0.62 * zone(t, 0.64, 1, 0.02);
      for (const [c, w, s] of fine) a *= 1 + 0.22 * s * Math.exp(-(((t - c) / w) ** 2));
      for (const [c, w, d] of gaps) a *= 1 - d * Math.exp(-(((t - c) / w) ** 2));
      return Math.min(0.97, Math.max(0, a));
    };
    const paint = (value, color) => {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      for (let x = 0; x < W; x++) {
        const v = Math.round(255 * value(x / (W - 1)));
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, 0, 1, 1);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.NoColorSpace; // read as written: the ring shader writes display values
      return tex;
    };
    made = { alpha: paint(alpha), light: paint((t) => 0.74 + 0.16 * rand() + 0.1 * Math.sin(t * 40)) };
    return made;
  };
})();

// The ring material. Its position varies only across one planet's rings (a few
// radii, in the planet's own units), so plain varyings are fine here.
export function ringMaterial(color) {
  const t = ringTextures();
  return new THREE.ShaderMaterial({
    uniforms: {
      uAlpha: { value: t.alpha }, uLightMap: { value: t.light },
      uColor: { value: displayColor(new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.45).getHex()) },
      uOpacity: { value: 1 }, uLight: { value: new THREE.Vector3(1, 0, 0) }, uLit: { value: 0 },
    },
    vertexShader: /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec2 vUv;
      varying vec3 vLocal;
      void main() {
        vUv = uv;
        vLocal = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_fragment>
      uniform sampler2D uAlpha, uLightMap;
      uniform vec3 uColor, uLight;
      uniform float uOpacity, uLit;
      varying vec2 vUv;
      varying vec3 vLocal;
      void main() {
        #include <logdepthbuf_fragment>
        float a = texture2D(uAlpha, vUv).r;
        vec3 col = uColor * texture2D(uLightMap, vUv).r;
        // In the planet's shadow: the way to the star passes through the planet
        // (radius 1 in these units).
        float s = -dot(vLocal, uLight);
        float shade = 1.0;
        if (uLit > 0.5 && s > 0.0) shade = mix(0.12, 1.0, smoothstep(0.96, 1.03, length(vLocal + s * uLight)));
        gl_FragColor = vec4(col * shade, a * uOpacity);
      }`,
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
  });
}

// Ring geometry with u running from the inner to the outer edge.
export const RING = (() => {
  const g = new THREE.RingGeometry(RING_INNER, RING_OUTER, 160, 1);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    uv.setXY(i, (r - RING_INNER) / (RING_OUTER - RING_INNER), 0.5);
  }
  return g;
})();

