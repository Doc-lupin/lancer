// Builds the camera targets (camera/view.js) from the map: the Basin, its
// regions, its systems (a star, or a rogue planet, wreck or structure at the
// center, whose body gives the size) and the bodies in them (task 2.9), at
// their places on the clock's current date. Belts aren't targets; a system's
// center body is the system itself.
//
// Distances: a target is framed when the camera stands far enough back for its
// radius to fill most of the view (FRAME). Its closest distance is 2.5 × its
// radius (task 2.5).

import { place, KM_PER_LY, KM_PER_AU, CAMERA } from './origin.js';
import { STAR_KINDS, SUN_RADIUS_KM } from '../data/starKinds.js';
import { isHidden } from '../data/store.js';
import { bodyOffsetKm, daysSinceEpoch } from '../data/orbits.js';

const FRAME = 1.3 / Math.tan((CAMERA.fov * Math.PI) / 360); // distance per km of radius
const MIN_REGION_LY = 0.5;

// Size for bodies the data gives no radius (km).
const DEFAULT_RADIUS_KM = { station: 1, 'lane-mouth': 1000, field: 0.02 * KM_PER_AU, structure: 1000, wreck: 500 };

export function bodyRadiusKm(body) {
  if (body.type === 'star') return starRadiusKm(body.kind);
  return body.radiusKm ?? DEFAULT_RADIUS_KM[body.type] ?? 1000;
}

export const starRadiusKm = (kind) => (STAR_KINDS[kind]?.radius ?? 1) * SUN_RADIUS_KM;

// Radius of whatever is at a system's center: its star, or its center body.
export function centerRadiusKm(system, index) {
  if (system.center.type === 'star') return starRadiusKm(system.center.kind);
  return index.byId.get(system.center.body)?.radiusKm ?? 1000;
}

export function buildTargets(map, index, { playerMode = false } = {}) {
  const hidden = (id) => isHidden(index, id, playerMode);
  const targets = new Map();
  const basinR = (map.basin.diameterLy / 2) * KM_PER_LY;
  targets.set('basin', { place: place([0, 0, 0]), radiusKm: basinR, viewKm: basinR * FRAME, minKm: KM_PER_LY, parentId: null, pickable: false });

  for (const r of map.regions) {
    if (hidden(r.id)) continue;
    const spread = Math.max(MIN_REGION_LY, ...(index.childrenOf.get(r.id) ?? [])
      .map((id) => index.byId.get(id))
      .filter((s) => index.kindOf.get(s.id) === 'systems')
      .map((s) => Math.hypot(...s.pos.map((v, i) => v - r.pos[i]))));
    const radiusKm = spread * KM_PER_LY;
    targets.set(r.id, { place: place(r.pos), radiusKm, viewKm: radiusKm * FRAME, minKm: 0.2 * KM_PER_LY, parentId: 'basin' });
  }

  for (const s of map.systems) {
    if (hidden(s.id)) continue;
    const radiusKm = centerRadiusKm(s, index);
    // Framed to its farthest body (companion stars aside: the Orrery's lies 30
    // AU out, beyond its nine worlds); a star system at least 0.5 AU across, a
    // starless one (a rogue planet, wreck or structure alone) around its body.
    const orbits = (index.childrenOf.get(s.id) ?? [])
      .map((id) => index.byId.get(id))
      .filter((b) => index.kindOf.get(b.id) === 'bodies' && b.orbit && !b.parent && b.type !== 'star')
      .map((b) => b.orbit.distance * (b.orbit.unit === 'au' ? KM_PER_AU : 1));
    const reach = s.center.type === 'star'
      ? Math.max(30 * radiusKm, 0.5 * KM_PER_AU, ...orbits)
      : Math.max(4 * radiusKm, ...orbits);
    targets.set(s.id, {
      place: place(s.pos), radiusKm, viewKm: reach * FRAME, minKm: 2.5 * radiusKm,
      parentId: s.region && targets.has(s.region) ? s.region : 'basin',
    });
  }
  const days = daysSinceEpoch(map.clock);
  const cache = new Map();
  const centers = new Set(map.systems.map((s) => s.center.body).filter(Boolean));
  const orbitKm = (b) => (b.orbit ? b.orbit.distance * (b.orbit.unit === 'au' ? KM_PER_AU : 1) : 0);
  for (const b of map.bodies) {
    if (b.type === 'asteroid-belt' || centers.has(b.id) || hidden(b.id) || !targets.has(b.system)) continue;
    const radiusKm = bodyRadiusKm(b);
    const children = (index.childrenOf.get(b.id) ?? []).map((id) => index.byId.get(id)).filter((c) => index.kindOf.get(c.id) === 'bodies');
    const reach = Math.max(4 * radiusKm, ...children.map((c) => 1.2 * orbitKm(c)));
    targets.set(b.id, {
      place: place(index.byId.get(b.system).pos, bodyOffsetKm(b, index, days, cache)),
      radiusKm, viewKm: reach * FRAME, minKm: 2.5 * radiusKm,
      parentId: b.parent && targets.has(b.parent) ? b.parent : b.system,
    });
  }
  return targets;
}
