// Loads data/map.json once into the store (decision P7). The file is fetched,
// not bundled, so it stays the one copy of the data.

import mapUrl from '../../data/map.json?url';
import { useMap } from '../data/store.js';

export async function loadMap(url = mapUrl) {
  const { status, setLoading, setMap, setError } = useMap.getState();
  if (status === 'loading' || status === 'ready') return;
  setLoading();
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status} ${res.statusText}`);
    setMap(await res.json());
  } catch (err) {
    setError(err);
  }
}
