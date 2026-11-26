// A unit sphere laid out by latitude and longitude, in the body frame of
// src/data/globe.js (x: lon 0, y: lon 90 east, z: north). Its texture
// coordinates follow the usual equirectangular map: u runs with longitude
// from −180° at the left edge to +180° at the right, v with latitude from the
// south pole (0) to the north pole (1). So any image or generated map in that
// layout lines up with the places' [lat, lon].
//
// The longitude seam at ±180° has its own column of vertices, so maps don't
// smear across it.

import * as THREE from 'three';
import { surfaceVector } from '../data/globe.js';

export function latLonSphere(lonSegments = 128, latSegments = 64) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let j = 0; j <= latSegments; j++) {
    const lat = -90 + (180 * j) / latSegments;
    for (let i = 0; i <= lonSegments; i++) {
      const lon = -180 + (360 * i) / lonSegments;
      positions.push(...surfaceVector([lat, lon]));
      uvs.push(i / lonSegments, j / latSegments);
    }
  }
  const row = lonSegments + 1;
  for (let j = 0; j < latSegments; j++) {
    for (let i = 0; i < lonSegments; i++) {
      const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
      // Counterclockwise seen from outside.
      if (j > 0) indices.push(a, b, d);
      if (j < latSegments - 1) indices.push(a, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(positions, 3)); // a unit sphere's normal is its position
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  return g;
}

// [lat, lon] for a texture coordinate, the inverse of the layout above.
export const uvToLatLon = ([u, v]) => [-90 + 180 * v, -180 + 360 * u];
