// Floating origin (decision P3, refined in task 2.4).
//
// A position in the Basin is a "place": an anchor in light-years (normally a
// system's `pos`) plus an offset in km from that anchor. A single km value is
// not enough: 64-bit numbers near the Keel, 24 ly out, step in 31 m, which is
// visible when circling a station. With anchors, the camera and an object in
// the same system share an anchor, the light-years cancel exactly, and only the
// km offsets are subtracted.
//
// The camera sits at the scene origin. Each frame, every object is placed at
// offsetKm(cameraPlace, objectPlace), so the GPU's 32-bit floats only ever see
// distances measured from the camera.

export const KM_PER_LY = 9.4607304725808e12;
export const KM_PER_AU = 149597870.7;

export function place(anchorLy, offsetKm = [0, 0, 0]) {
  return { anchor: [...anchorLy], offset: [...offsetKm] };
}

// Vector in km from place `from` to place `to`, written into `out`.
// Anchors are subtracted first (exactly zero when shared), then offsets.
export function offsetKm(from, to, out = [0, 0, 0]) {
  for (let i = 0; i < 3; i++) {
    out[i] = (to.anchor[i] - from.anchor[i]) * KM_PER_LY + (to.offset[i] - from.offset[i]);
  }
  return out;
}

// The same point expressed against a new anchor. Used when the camera moves
// into another system, so its offset stays small.
export function reanchor(p, anchorLy) {
  const d = offsetKm(place(anchorLy), p);
  return place(anchorLy, d);
}

// Screen pixels covered by 1 km at a given distance (perspective camera).
export function pixelsPerKm(distanceKm, fovDeg, heightPx) {
  return heightPx / 2 / (distanceKm * Math.tan((fovDeg * Math.PI) / 360));
}

// Camera settings that cover 1 m to beyond the Basin with a logarithmic depth buffer (P4).
export const CAMERA = { fov: 50, nearKm: 1e-3, farKm: 1e16 };
