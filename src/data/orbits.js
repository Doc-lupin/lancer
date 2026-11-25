// Where bodies are on a given date (task 2.9).
//
// Orbits lie in the chart's plane, x–y (x trailing, y coreward), around the
// system center or the parent body; angles run from +x towards +y (decision
// P15). `phaseDeg` is the angle at the epoch (5029u day 1), so
//   angle = phaseDeg + 360 × days since epoch / periodDays
// and a null period keeps the body fixed at phaseDeg (lane mouths, some
// stations). With an eccentricity, phaseDeg is the mean anomaly, the
// periapsis is at 0°, and `distance` is the semi-major axis.
// `inclinationDeg`, when given, tilts the orbit about its line at 0°.

// Days from date a to date b ({ year, day }, Union calendar).
export function daysBetween(a, b, daysPerYear = 365) {
  return (b.year - a.year) * daysPerYear + (b.day - a.day);
}

export const KM_PER_AU = 149597870.7;
const RAD = Math.PI / 180;

export const daysSinceEpoch = (clock, date = clock.current) => daysBetween(clock.epoch, date, clock.daysPerYear);

// Mean angle in degrees, 0–360.
export function orbitAngleDeg(orbit, days) {
  const a = orbit.periodDays ? orbit.phaseDeg + (360 * days) / orbit.periodDays : orbit.phaseDeg;
  return ((a % 360) + 360) % 360;
}

const toKm = (orbit) => orbit.distance * (orbit.unit === 'au' ? KM_PER_AU : 1);

// Point on an orbit at true anomaly `nu` (radians), in km from what it orbits.
export function orbitPoint(orbit, nu) {
  const a = toKm(orbit);
  const e = orbit.eccentricity ?? 0;
  const r = e ? (a * (1 - e * e)) / (1 + e * Math.cos(nu)) : a;
  const x = r * Math.cos(nu);
  const y = r * Math.sin(nu);
  const inc = (orbit.inclinationDeg ?? 0) * RAD;
  return [x, y * Math.cos(inc), y * Math.sin(inc)];
}

// True anomaly (radians) on a given day.
export function trueAnomaly(orbit, days) {
  const M = orbitAngleDeg(orbit, days) * RAD;
  const e = orbit.eccentricity ?? 0;
  if (!e) return M;
  let E = M;
  for (let i = 0; i < 20; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
}

// Offset in km of a body from its system's center on a given day, through
// its chain of parents. Bodies without an orbit sit at the center.
export function bodyOffsetKm(body, index, days, cache = new Map()) {
  if (cache.has(body.id)) return cache.get(body.id);
  let out = [0, 0, 0];
  if (body.orbit) {
    const own = orbitPoint(body.orbit, trueAnomaly(body.orbit, days));
    const parent = body.parent ? bodyOffsetKm(index.byId.get(body.parent), index, days, cache) : [0, 0, 0];
    out = own.map((v, i) => v + parent[i]);
  }
  cache.set(body.id, out);
  return out;
}
