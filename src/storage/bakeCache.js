// Cache of baked worlds (task B0.10): a globe's painted maps, kept in this
// browser's IndexedDB so each world is painted once, not on every visit.
//
// Key: the painter's own key (a hash of its settings for the body, which come
// from the body's data, and the map size of the quality tier) with the
// painter's version (a hash of its shader source and a number to raise when
// its code changes). Value: the maps as lossless PNG blobs, in order.
//
// At most MAX_WORLDS worlds and MAX_BYTES bytes; the least recently used go
// first. Where storage is blocked (private windows, full quota), every call
// does nothing and resolves to null: worlds are then simply painted again.

const DB = 'lancer-bakes';
const STORE = 'worlds';
const MAX_WORLDS = 48;
const MAX_BYTES = 256 * 1024 * 1024;

let opened = null;
function db() {
  if (opened) return opened;
  opened = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opened;
}

const request = (r) => new Promise((ok) => { r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); });

// The maps stored under `key` (Blob[]), or null. Marks them as just used.
export async function loadBake(key) {
  const d = await db();
  if (!d) return null;
  try {
    const store = d.transaction(STORE, 'readwrite').objectStore(STORE);
    const rec = await request(store.get(key));
    if (!rec) return null;
    rec.used = Date.now();
    store.put(rec, key);
    return rec.blobs;
  } catch {
    return null;
  }
}

// Store the maps (Blob[]) under `key`, then drop the least recently used
// worlds past the limits.
export async function saveBake(key, blobs) {
  const d = await db();
  if (!d) return;
  try {
    const bytes = blobs.reduce((s, b) => s + b.size, 0);
    await request(d.transaction(STORE, 'readwrite').objectStore(STORE).put({ blobs, bytes, used: Date.now() }, key));
    const store = d.transaction(STORE, 'readwrite').objectStore(STORE);
    const all = [];
    await new Promise((ok) => {
      const c = store.openCursor();
      c.onsuccess = () => {
        const cur = c.result;
        if (!cur) return ok();
        all.push({ key: cur.key, used: cur.value.used, bytes: cur.value.bytes });
        cur.continue();
      };
      c.onerror = () => ok();
    });
    all.sort((a, b) => b.used - a.used);
    let total = 0;
    all.forEach((w, i) => {
      total += w.bytes;
      if (i >= MAX_WORLDS || total > MAX_BYTES) store.delete(w.key);
    });
  } catch {
    // Not kept: the world is painted again next time.
  }
}

// A short, stable hash of a string (two 32-bit FNV-1a passes), for keys.
export function hashKey(text) {
  let a = 2166136261, b = 0x811c9dc5 ^ 0x5bd1e995;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 16777619);
    b = Math.imul(b ^ c, 16777619) ^ (b >>> 13);
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}
