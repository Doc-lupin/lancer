// The single store for all map data. Views read from here and keep no copy.
// The map itself is read-only in the app until Phase 5 (decision D5).

import { create } from 'zustand';
import { initialTier } from '../views/quality.js';

// Collections whose objects have an id and can be looked up.
const COLLECTIONS = ['regions', 'systems', 'bodies', 'places', 'areas', 'lanes', 'factions', 'layers'];

// The id of an object's parent in the hierarchy
// region → system → body (→ child body) → place or area. Regions have none.
function parentId(kind, obj) {
  switch (kind) {
    case 'systems': return obj.region;
    case 'bodies': return obj.parent ?? obj.system;
    case 'places':
    case 'areas': return obj.body;
    default: return null;
  }
}

// Lookups built once when the map arrives:
// byId: id → object; kindOf: id → collection name; parentOf: id → parent id;
// childrenOf: id → child ids (systems of a region, bodies of a system,
// moons of a planet, places and areas on a body).
export function buildIndex(map) {
  const byId = new Map();
  const kindOf = new Map();
  const parentOf = new Map();
  const childrenOf = new Map();
  for (const kind of COLLECTIONS) {
    for (const obj of map[kind] ?? []) {
      if (byId.has(obj.id)) throw new Error(`Duplicate id "${obj.id}" in ${kind} and ${kindOf.get(obj.id)}`);
      byId.set(obj.id, obj);
      kindOf.set(obj.id, kind);
    }
  }
  for (const [id, obj] of byId) {
    const p = parentId(kindOf.get(id), obj);
    if (p == null) continue;
    if (!byId.has(p)) throw new Error(`"${id}" names a parent "${p}" that is not in the map`);
    parentOf.set(id, p);
    if (!childrenOf.has(p)) childrenOf.set(p, []);
    childrenOf.get(p).push(id);
  }
  return { byId, kindOf, parentOf, childrenOf };
}

// Ids from the object itself up to its region, e.g. place → body → system → region.
export function parentChain(index, id) {
  const chain = [];
  for (let cur = id; cur != null; cur = index.parentOf.get(cur)) {
    if (chain.includes(cur)) throw new Error(`Parent loop at "${cur}"`);
    chain.push(cur);
  }
  return chain;
}

// In player mode an object is hidden if it, or anything above it, is GM-only.
export function isHidden(index, id, playerMode) {
  if (!playerMode) return false;
  return parentChain(index, id).some((i) => index.byId.get(i)?.visibility === 'gm');
}

export const useMap = create((set) => ({
  status: 'empty', // empty | loading | ready | error
  error: null,
  map: null,
  index: null,
  playerMode: false, // GM view by default; the switch arrives in Phase 4
  lanes: 'faint', // how lanes show: faint, bright (lanes mode, with labels; task 2.7) or off
  cameraMode: 'orbit', // orbit around a focus, or free movement (camera/free.js)
  exposure: 1, // linear multiplier on light from the world (views/exposure.js, task B0.4)
  quality: initialTier(), // low, medium, high or ultra (views/quality.js, task B0.6)

  setLoading: () => set({ status: 'loading', error: null }),
  setMap: (map) => set({ map, index: buildIndex(map), status: 'ready', error: null }),
  setError: (error) => set({ status: 'error', error: String(error) }),
  setPlayerMode: (playerMode) => set({ playerMode }),
  setLanes: (lanes) => set({ lanes }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setExposure: (exposure) => set({ exposure }),
  setQuality: (quality) => set({ quality }),
}));
