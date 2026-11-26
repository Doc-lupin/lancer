// Surface maps for globes: the one place that decides what a body's surface
// looks like (task 2.10). Planet.jsx asks surfaceMaps(body) and applies what
// comes back; nothing else needs to change to add textures or height maps.
//
// All maps are equirectangular, 2:1: longitude −180° at the left edge to
// +180° at the right, north at the top. The globe's geometry
// (globeGeometry.js) is laid out the same way, so a map lines up with the
// places' [lat, lon].
//
// Where a body's maps come from, first match wins:
//   1. a registered provider, e.g. the procedural generator by world type
//      (procedural.js, registered when the map opens):
//        registerSurface((body, tools) => body.world === 'ocean' ? { map, heightMap, heightScale: 0.004 } : null);
//   2. an image file named in the data, appearance.texture, loaded from
//      public/textures/ (the schema already has this field);
//   3. the built-in look: soft bands for gas giants, faint mottling otherwise.
//
// A provider returns null to pass, or an object with any of:
//   map           color (sRGB); multiplied by appearance.color unless tint is false
//   tint          false for full-color maps (an image texture defaults to false)
//   heightMap     grey, linear: raises the surface (needs no extra work here)
//   heightScale   height of white in the height map, as a fraction of the
//                 radius (default 0.005). Places still sit on the smooth
//                 sphere: lift them by the same height when relief is large.
//   normalMap, roughnessMap, emissiveMap   as three.js uses them (an
//                 emissive map glows on the night side too: lava, city lights)
//   clouds        grey = cloud cover, drawn as a lit layer just above the
//                 surface
//   dispose       frees the maps' GPU memory; called when the body's maps
//                 drop out of the cache (only the most recent 16 are kept)
// `tools` gives loadTexture(file, { color }) for files in public/textures/,
// canvasTexture(width, height, draw, { color }) for maps drawn on the CPU,
// and bake(width, height, material, { color, mipmaps }) to paint a map on the
// GPU with a shader (procedural.js): the material draws a full-screen
// square, and gets vUv with the map's layout.

import * as THREE from 'three';

const providers = [];
const cache = new Map(); // body id → maps, oldest first
const KEEP = 16;
let renderer = null;

// The renderer that bake() paints with (Planet.jsx sets it).
export function setBaker(gl) {
  renderer = gl;
}

// Paint a map with a shader on the GPU. The material's vertex shader should
// pass uv through as vUv and place the square with gl_Position =
// vec4(position.xy, 0.0, 1.0). A color map is stored as sRGB, so the shader
// writes linear values; other maps are stored as written.
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
quad.frustumCulled = false;
const bakeScene = new THREE.Scene().add(quad);
const bakeCamera = new THREE.Camera();
export function bake(width, height, material, { color = true, mipmaps = true } = {}) {
  if (!renderer) throw new Error('bake() needs setBaker(renderer) first');
  const target = new THREE.WebGLRenderTarget(width, height, {
    depthBuffer: false,
    colorSpace: color ? THREE.SRGBColorSpace : THREE.NoColorSpace,
    generateMipmaps: mipmaps,
    minFilter: mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter,
  });
  target.texture.wrapS = THREE.RepeatWrapping;
  target.texture.anisotropy = 4;
  quad.material = material;
  const before = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.render(bakeScene, bakeCamera);
  renderer.setRenderTarget(before);
  return target;
}

// Read back a small baked map's red channel, 0–1, one value per pixel, rows
// from the bottom (south) up.
export function readRed(target) {
  const { width, height } = target;
  const px = new Uint8Array(width * height * 4);
  renderer.readRenderTargetPixels(target, 0, 0, width, height, px);
  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i++) out[i] = px[i * 4] / 255;
  return out;
}
let onTextureLoaded = () => {};

export function registerSurface(provider) {
  providers.unshift(provider);
  cache.clear();
}

// Called when a texture file finishes loading (Planet.jsx asks for a redraw).
export function whenTexturesLoad(fn) {
  onTextureLoaded = fn;
}

const files = new Map();
export function loadTexture(file, { color = true } = {}) {
  const key = `${file}|${color}`;
  if (!files.has(key)) {
    const tex = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/${file}`, () => onTextureLoaded());
    tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    files.set(key, tex);
  }
  return files.get(key);
}

export function canvasTexture(width, height, draw, { color = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(width, height);
  draw(img.data, width, height);
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

// Small seeded random numbers, so generated maps are the same every time.
export function random(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The built-in look: grey, tinted by appearance.color.
function builtIn(body) {
  const rand = random(body.id);
  if (body.type === 'gas-giant') {
    // Latitude bands: lightness drifting smoothly from row to row.
    let v = 0;
    const rows = Array.from({ length: 128 }, () => (v = 0.85 * v + 0.15 * (rand() * 2 - 1)));
    return {
      map: canvasTexture(8, 128, (data, w, h) => {
        for (let y = 0; y < h; y++) {
          const l = 200 + 55 * Math.max(-1, Math.min(1, rows[h - 1 - y] * 3));
          for (let x = 0; x < w; x++) data.set([l, l, l, 255], 4 * (y * w + x));
        }
      }),
    };
  }
  // Mottling: soft blobs of lighter and darker ground, wrapping east–west.
  const blobs = Array.from({ length: 40 }, () => [rand() * 256, rand() * 128, 6 + rand() * 26, rand() * 2 - 1]);
  return {
    map: canvasTexture(256, 128, (data, w, h) => {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let v = 0;
          for (const [bx, by, br, s] of blobs) {
            const dx = Math.min(Math.abs(x - bx), w - Math.abs(x - bx));
            v += s * Math.exp(-(dx * dx + (y - by) ** 2) / (br * br));
          }
          const l = 215 + 40 * Math.max(-1, Math.min(1, v));
          data.set([l, l, l, 255], 4 * (y * w + x));
        }
      }
    }),
  };
}

const tools = { loadTexture, canvasTexture, random, bake, readRed };

export function surfaceMaps(body) {
  if (cache.has(body.id)) {
    const maps = cache.get(body.id);
    cache.delete(body.id); // most recently used goes last
    cache.set(body.id, maps);
    return maps;
  }
  while (cache.size >= KEEP) {
    const [oldest, maps] = cache.entries().next().value;
    maps.dispose?.();
    cache.delete(oldest);
  }
  let maps = null;
  for (const p of providers) if ((maps = p(body, tools))) break;
  if (!maps && body.appearance?.texture) maps = { map: loadTexture(body.appearance.texture), tint: false };
  if (!maps) maps = builtIn(body);
  maps = { tint: true, heightScale: 0.005, ...maps };
  cache.set(body.id, maps);
  return maps;
}
