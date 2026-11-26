// The globe's mesh: a cube blown up into a sphere, each face a quadtree of
// square patches that split as the camera comes closer, so the detail on
// screen stays about even and the poles aren't pinched (as on a lat/lon
// sphere). Every patch is the same 32 × 32 grid, drawn with instancing: one
// draw call per globe. The vertex shader (terrain.js) turns a patch's grid
// into points on the sphere; this file only decides which patches to draw.
//
// Patches meet patches of other sizes along their edges, where the finer one
// has vertices the coarser one doesn't; a skirt (a strip hanging down from
// every edge) hides the hairline gaps that could open there.
//
// Units: the planet's radius is 1. Face coordinates run from −1 to 1.

import * as THREE from 'three';

export const GRID = 32;
export const MAX_LEVEL = 10;
// Split a patch when one grid step would cover more than this many pixels.
const STEP_PX = 7;
const MAX_PATCHES = 900;

// The six faces: outward normal n and the axes u, v across it (u × v = n, so
// the grid's triangles face outward). Shaders keep the same table.
export const FACES = [
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0] },
];

// A cube point (one coordinate ±1) to the sphere, spread evenly (cells near
// the cube's corners would otherwise shrink).
export function spherify([x, y, z]) {
  const x2 = x * x, y2 = y * y, z2 = z * z;
  return [
    x * Math.sqrt(Math.max(0, 1 - y2 / 2 - z2 / 2 + (y2 * z2) / 3)),
    y * Math.sqrt(Math.max(0, 1 - z2 / 2 - x2 / 2 + (z2 * x2) / 3)),
    z * Math.sqrt(Math.max(0, 1 - x2 / 2 - y2 / 2 + (x2 * y2) / 3)),
  ];
}

export function facePoint(face, a, b) {
  const { n, u, v } = FACES[face];
  return spherify([0, 1, 2].map((i) => n[i] + a * u[i] + b * v[i]));
}

// The patches to draw for a camera at `eye` (planet units, in the planet's
// own frame), with `focalPx` the screen's focal length in pixels and
// `maxLevel` the deepest split (smaller for small bodies). Each patch is
// [face, a0, b0, size, level], its corner in face coordinates and its width.
export function choosePatches(eye, focalPx, maxLevel = MAX_LEVEL) {
  const out = [];
  const eyeLen = Math.hypot(...eye);
  // Beyond the horizon: a point is hidden when it's further round than the
  // horizon by more than the patch's own half-width.
  const horizon = eyeLen > 1 ? Math.acos(Math.min(1, 1 / eyeLen)) : Math.PI;
  const eyeDir = eye.map((v) => v / (eyeLen || 1));
  const stack = [];
  for (let f = 0; f < 6; f++) stack.push([f, -1, -1, 2, 0]);
  while (stack.length) {
    const p = stack.pop();
    const [f, a, b, size, level] = p;
    const c = facePoint(f, a + size / 2, b + size / 2);
    const halfAngle = size * 0.62; // a patch's half-width as an angle (generous)
    const toCenter = Math.acos(Math.max(-1, Math.min(1, c[0] * eyeDir[0] + c[1] * eyeDir[1] + c[2] * eyeDir[2])));
    if (toCenter - halfAngle > horizon + 0.05) continue;
    const dist = Math.max(1e-6, Math.hypot(eye[0] - c[0], eye[1] - c[1], eye[2] - c[2]) - halfAngle);
    const stepPx = ((halfAngle * 2) / GRID / dist) * focalPx;
    if (level < maxLevel && stepPx > STEP_PX && out.length + stack.length + 4 < MAX_PATCHES) {
      const h = size / 2;
      stack.push([f, a, b, h, level + 1], [f, a + h, b, h, level + 1], [f, a, b + h, h, level + 1], [f, a + h, b + h, h, level + 1]);
    } else out.push(p);
  }
  return out;
}

// The patch grid: (GRID + 1)² points, then a skirt round the edge. aGrid is
// (a, b, skirt) with a, b from 0 to 1 across the patch.
export function patchGeometry(maxPatches = MAX_PATCHES) {
  const g = new THREE.InstancedBufferGeometry();
  const pts = [];
  const idx = [];
  const at = (i, j) => j * (GRID + 1) + i;
  for (let j = 0; j <= GRID; j++) for (let i = 0; i <= GRID; i++) pts.push(i / GRID, j / GRID, 0);
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) idx.push(at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j), at(i + 1, j + 1), at(i, j + 1));
  // Skirt: a copy of the edge ring, pulled down, joined to the edge.
  const ring = [];
  for (let i = 0; i < GRID; i++) ring.push(at(i, 0));
  for (let j = 0; j < GRID; j++) ring.push(at(GRID, j));
  for (let i = GRID; i > 0; i--) ring.push(at(i, GRID));
  for (let j = GRID; j > 0; j--) ring.push(at(0, j));
  const base = pts.length / 3;
  ring.forEach((k) => pts.push(pts[k * 3], pts[k * 3 + 1], 1));
  for (let r = 0; r < ring.length; r++) {
    const a = ring[r], b = ring[(r + 1) % ring.length];
    const a2 = base + r, b2 = base + ((r + 1) % ring.length);
    idx.push(a, a2, b2, a, b2, b); // facing out from the patch (the ring runs counterclockwise)
  }
  g.setAttribute('aGrid', new THREE.Float32BufferAttribute(pts, 3));
  // three.js wants a position attribute for its bookkeeping; the shader ignores it.
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.setIndex(idx);
  g.setAttribute('iPatch', new THREE.InstancedBufferAttribute(new Float32Array(maxPatches * 4), 4));
  g.setAttribute('iLevel', new THREE.InstancedBufferAttribute(new Float32Array(maxPatches), 1));
  g.instanceCount = 0;
  return g;
}

// Write the chosen patches into the geometry; false if nothing changed.
export function setPatches(g, patches) {
  const key = patches.map((p) => p.join(',')).join(';');
  if (g.userData.key === key) return false;
  g.userData.key = key;
  const ip = g.attributes.iPatch, il = g.attributes.iLevel;
  patches.forEach(([f, a, b, size, level], i) => {
    ip.setXYZW(i, f, a, b, size);
    il.setX(i, level);
  });
  ip.needsUpdate = true;
  il.needsUpdate = true;
  g.instanceCount = patches.length;
  return true;
}

export const MAX_PATCH_COUNT = MAX_PATCHES;
