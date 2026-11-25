// Builds the camera targets (camera/view.js) from the map: the Basin, its
// regions and its systems, whether a star or a rogue planet, wreck or
// structure is at the center (the center body's radius is used for those).
// Bodies come with tasks 2.9 and 2.10.
//
// Distances: a target is framed when the camera stands far enough back for its
// radius to fill most of the view (FRAME). Its closest distance is 2.5 × its
// radius (task 2.5).

import { place, KM_PER_LY, KM_PER_AU, CAMERA } from './origin.js';
import { STAR_KINDS, SUN_RADIUS_KM } from '../data/starKinds.js';
import { isHidden } from '../data/store.js';

const FRAME = 1.3 / Math.tan((CAMERA.fov * Math.PI) / 360); // distance per km of radius
const MIN_REGION_LY = 0.5;

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
    const orbits = (index.childrenOf.get(s.id) ?? [])
      .map((id) => index.byId.get(id).orbit)
      .filter((o) => o && o.unit === 'au')
      .map((o) => o.distance * KM_PER_AU);
    const reach = Math.max(30 * radiusKm, 0.5 * KM_PER_AU, ...orbits);
    targets.set(s.id, {
      place: place(s.pos), radiusKm, viewKm: reach * FRAME, minKm: 2.5 * radiusKm,
      parentId: s.region && targets.has(s.region) ? s.region : 'basin',
    });
  }
  return targets;
}
