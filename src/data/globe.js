// Surfaces of planets and moons (task 2.10): where a place at [lat, lon] is,
// and which way a globe is turned on a given date (decision P16).
//
// Body frame: north pole along +y, the orbits' north (P15), tilted by
// `rotation.axialTiltDeg` about the x axis. Longitude 0:
//   tidally locked   faces what the body orbits (its star, or its planet)
//   periodHours      turns from +x at the epoch, one turn per period
//   neither          stays towards +x
// Latitude is north-positive; longitude runs east from 0 towards 90.

const RAD = Math.PI / 180;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a, k) => a.map((v) => v * k);
const add = (a, b) => a.map((v, i) => v + b[i]);

// Unit vector for [lat, lon] in the body frame (x: lon 0, y: lon 90 east, z: north).
export function surfaceVector([lat, lon]) {
  const c = Math.cos(lat * RAD);
  return [c * Math.cos(lon * RAD), c * Math.sin(lon * RAD), Math.sin(lat * RAD)];
}

// The body frame's axes in the map's frame: lon0, lon90 and north.
// `towardParent` is the direction from the body to what it orbits (for tidal locking).
export function bodyAxes(body, days, towardParent = null) {
  const tilt = (body.rotation?.axialTiltDeg ?? 0) * RAD;
  // A right-handed frame: lon0 × lon90 = north. Untilted, east (lon 90) is −z,
  // so globes turn the same way as their orbits.
  const north = [0, Math.cos(tilt), Math.sin(tilt)];
  const e1 = [1, 0, 0];
  const e2 = [0, Math.sin(tilt), -Math.cos(tilt)];
  let spin = 0;
  if (body.rotation?.tidallyLocked && towardParent) spin = Math.atan2(dot(towardParent, e2), dot(towardParent, e1));
  else if (body.rotation?.periodHours) spin = ((2 * Math.PI * days * 24) / body.rotation.periodHours) % (2 * Math.PI);
  const lon0 = add(scale(e1, Math.cos(spin)), scale(e2, Math.sin(spin)));
  const lon90 = add(scale(e1, -Math.sin(spin)), scale(e2, Math.cos(spin)));
  return { lon0, lon90, north };
}

// A surface point's offset from the body's center, in km in the map's frame.
export function surfaceOffsetKm(at, axes, radiusKm, lift = 0) {
  const [x, y, z] = surfaceVector(at);
  const r = radiusKm * (1 + lift);
  return [0, 1, 2].map((i) => r * (x * axes.lon0[i] + y * axes.lon90[i] + z * axes.north[i]));
}

// Latitude of a path (e.g. the Seam) at a longitude, between its points;
// beyond its ends, the end point's latitude.
export function pathLatAt(path, lon) {
  const pts = [...path].sort((a, b) => a[1] - b[1]);
  if (lon <= pts[0][1]) return pts[0][0];
  for (let i = 1; i < pts.length; i++) {
    if (lon <= pts[i][1]) {
      const t = (lon - pts[i - 1][1]) / (pts[i][1] - pts[i - 1][1]);
      return pts[i - 1][0] + t * (pts[i][0] - pts[i - 1][0]);
    }
  }
  return pts.at(-1)[0];
}
