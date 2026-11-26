// Development builds only: helpers that let the browser checks in tools/
// read the scene, find things on screen and fly the camera. Not part of the
// built app (import.meta.env.DEV is false there).

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useMap } from '../data/store.js';
import { lerpPlace } from './origin.js';
import { laneEndPlaces } from '../data/lanes.js';
import { STAR_KINDS } from '../data/starKinds.js';
import { view } from './camera/view.js';
import { focusOn } from './camera/rig.js';
import { screenPos } from './camera/pick.js';
import { bodyAlpha } from './System.jsx';
import { globeInfo } from './Planet.jsx';
import { surfaceOffsetKm, pathLatAt } from '../data/globe.js';

export default function DebugHook() {
  const { gl, scene, camera, size, invalidate } = useThree();
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    window.__lancer = {
      render: () => ({ ...gl.info.render }),
      screen: (id) => screenPos(camera, view.rig.camera, view.targets.get(id).place, size.width, size.height),
      laneScreen: (id, t) => {
        const { map, index } = useMap.getState();
        const [a, b] = laneEndPlaces(map.lanes.find((l) => l.id === id), index, map.clock);
        return screenPos(camera, view.rig.camera, lerpPlace(a, b, t), size.width, size.height);
      },
      focus: (id) => { focusOn(view.rig, view.targets, id, performance.now()); invalidate(); },
      focusAt: (id, km) => { focusOn(view.rig, view.targets, id, performance.now(), km * (view.rig.frame ?? 1)); invalidate(); },
      bodyAlpha: (id) => bodyAlpha.get(id) ?? 0,
      // A place's screen position (lat, lon on its globe), a globe's north pole on screen,
      // a place marker's opacity, and whether a body's globe is showing.
      placeScreen: (id, at) => {
        const { map, index } = useMap.getState();
        const p = map.places.find((x) => x.id === id);
        const g = globeInfo(index.byId.get(p.body), index, map.clock);
        const off = surfaceOffsetKm(at ?? p.at, g.axes, g.radiusKm);
        return screenPos(camera, view.rig.camera, { anchor: g.place.anchor, offset: g.place.offset.map((v, i) => v + off[i]) }, size.width, size.height);
      },
      northScreen: (bodyId) => {
        const { map, index } = useMap.getState();
        const g = globeInfo(index.byId.get(bodyId), index, map.clock);
        const at = (k) => screenPos(camera, view.rig.camera, { anchor: g.place.anchor, offset: g.place.offset.map((v, i) => v + k * g.radiusKm * g.axes.north[i]) }, size.width, size.height);
        return [at(0), at(1)];
      },
      placeAlpha: (id) => {
        const m = scene.children.find((o) => o.userData.layer === 'places');
        return m.geometry.attributes.aColor.getW(m.userData.ids.indexOf(id));
      },
      placeAt: (id) => useMap.getState().map.places.find((x) => x.id === id).at,
      seamScreen: (lon) => {
        const seam = useMap.getState().map.places.find((x) => x.id === 'the-seam');
        return window.__lancer.placeScreen('the-seam', [pathLatAt(seam.path, lon), lon]);
      },
      globeShowing: (bodyId) => scene.getObjectsByProperty('type', 'Group').some((g) => g.userData.layer === 'globes' && g.userData.body === bodyId && g.visible),
      frontPieces: () => { const m = scene.children.find((o) => o.userData.layer === 'fronts'); const c = m.geometry.attributes.aColor; let n = 0; for (let i = 0; i < m.geometry.instanceCount; i++) if (c.getW(i) > 0.5) n++; return n; },
      layerCount: (layer) => scene.children.filter((o) => o.userData.layer === layer).map((o) => o.geometry.instanceCount ?? o.count),
      centerOf: (id) => useMap.getState().index.byId.get(id)?.center?.type,
      centerTypes: () => {
        const icons = scene.children.find((o) => o.userData.layer === 'icons');
        const counts = {};
        for (const t of icons.userData.types) counts[t] = (counts[t] ?? 0) + 1;
        return counts;
      },
      brightestIn: (regionId) => {
        const { map } = useMap.getState();
        const stars = map.systems.filter((s) => s.region === regionId && s.center.type === 'star');
        const best = stars.sort((a, b) => STAR_KINDS[b.center.kind].luminosity - STAR_KINDS[a.center.kind].luminosity)[0];
        return screenPos(camera, view.rig.camera, view.targets.get(best.id).place, size.width, size.height);
      },
      // Frame log for tools/check_zoom.mjs: startRecording(), then frames().
      startRecording: () => { frames.current = []; },
      frames: () => frames.current,
      view, scene, invalidate,
    };
    return () => delete window.__lancer;
  }, [gl, scene, camera, size, invalidate]);

  // Time spent in our own per-frame work: from the first update (priority -3)
  // to the last (this component is mounted last, so its priority-0 update
  // runs after every other), before three.js draws.
  const started = useRef(0);
  const frames = useRef(null);
  useFrame(() => { started.current = performance.now(); }, -3);
  useFrame(() => {
    if (!frames.current || !view.rig) return;
    const r = view.rig;
    frames.current.push({
      t: performance.now(), workMs: performance.now() - started.current, focus: r.focusId, distance: r.distance,
      target: { anchor: [...r.target.anchor], offset: [...r.target.offset] }, yaw: r.yaw, pitch: r.pitch,
      lastCalls: gl.info.render.calls,
      // The lasting layers' identities: a scene swap would replace them (globes come and go by design).
      layers: scene.children.filter((o) => o.userData.layer && o.userData.layer !== 'globes').map((o) => o.uuid).join(),
    });
  });
  return null;
}
