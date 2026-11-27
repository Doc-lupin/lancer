// The World Lab (task B0.7): a debug panel for development builds only
// (Scene.jsx loads it lazily under import.meta.env.DEV, so leva never reaches
// the built app; decision BD3). It shows the large-scale maps of the world in
// view on its globe, and holds the settings that tuning needs.
//
//   Map          off, height, moisture, temperature, plates (mountain belts
//                red, basins green, volcanoes blue), wind (from the east red,
//                from the west cyan, poleward brighter), biome (ground color,
//                unlit) or normal. Shown on the WIP procedural worlds; clouds
//                and air are hidden while a map shows.
//   WIP worlds   reloads with or without ?worlds=wip (decision BQ1).
//   Exposure     the store's exposure (B0.4).
//   Quality      the tier (B0.6).
//   World        the body in view and its world type, variant and seed.
//
// Hidden in automated browsers (navigator.webdriver), so the checks' pictures
// stay as they are.

import { useEffect } from 'react';
import { Leva, useControls, button } from 'leva';
import { useMap } from '../data/store.js';
import { view } from '../views/camera/view.js';
import { TIER_NAMES, saveTier } from '../views/quality.js';
import { WIP_WORLDS } from '../views/planet/switch.js';

const MAPS = { off: 0, height: 1, moisture: 2, temperature: 3, plates: 4, wind: 5, biome: 6, normal: 7 };

function setWip(on) {
  const u = new URL(location.href);
  if (on) u.searchParams.set('worlds', 'wip'); else u.searchParams.delete('worlds');
  location.assign(u);
}

function worldInView() {
  const { index } = useMap.getState();
  const b = index?.byId.get(view.rig?.focusId);
  if (!b) return '—';
  return [b.name ?? b.id, b.world ?? b.type, b.variant].filter(Boolean).join(' · ');
}

export default function WorldLab() {
  const setLabView = useMap((s) => s.setLabView);
  const setExposure = useMap((s) => s.setExposure);
  const setQuality = useMap((s) => s.setQuality);

  const [, set] = useControls('World Lab', () => ({
    World: { value: worldInView(), editable: false },
    Map: { value: 'off', options: Object.keys(MAPS), onChange: (m) => setLabView(MAPS[m]) },
    'WIP worlds': { value: WIP_WORLDS, onChange: (on, path, ctx) => { if (!ctx.initial && on !== WIP_WORLDS) setWip(on); } },
    Exposure: { value: useMap.getState().exposure, min: 0.1, max: 4, step: 0.05, onChange: (e) => setExposure(e) },
    Quality: { value: useMap.getState().quality, options: TIER_NAMES, onChange: (q, path, ctx) => { if (!ctx.initial) { saveTier(q); setQuality(q); } } },
    'Reset exposure': button(() => { setExposure(1); set({ Exposure: 1 }); }),
  }));

  // The world in view follows the camera; read it twice a second.
  useEffect(() => {
    const t = setInterval(() => set({ World: worldInView() }), 500);
    return () => clearInterval(t);
  }, [set]);

  return <Leva collapsed titleBar={{ title: WIP_WORLDS ? 'World Lab' : 'World Lab (maps: turn on WIP worlds)' }} />;
}
