// The map: one canvas for every zoom level (no scene swaps). Once the store
// has the map, the camera targets are built and the camera starts framed on
// the whole Basin.

import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useMap } from '../data/store.js';
import { CAMERA, lerpPlace } from './origin.js';
import { laneEndPlaces } from '../data/lanes.js';
import { STAR_KINDS } from '../data/starKinds.js';
import { view } from './camera/view.js';
import { createRig, frameFor, focusOn } from './camera/rig.js';
import { screenPos } from './camera/pick.js';
import CameraRig from './camera/CameraRig.jsx';
import { buildTargets } from './mapTargets.js';
import Stars from './Stars.jsx';
import { RegionLabels, RegionLabelsUpdater } from './RegionLabels.jsx';
import Lanes from './Lanes.jsx';
import RegionEffects from './RegionEffects.jsx';
import Centers from './Centers.jsx';
import System, { bodyAlpha } from './System.jsx';
import Planets, { globeInfo } from './Planet.jsx';
import { surfaceOffsetKm, pathLatAt } from '../data/globe.js';
import Places, { PlaceLabels, PlaceLabelsUpdater } from './Places.jsx';
import { BodyLabels, BodyLabelsUpdater } from './BodyLabels.jsx';
import { LaneLabels, LaneLabelsUpdater } from './LaneLabels.jsx';
import LanesToggle from '../interface/LanesToggle.jsx';

// Development builds only: lets the browser checks in tools/ read the renderer.
function DebugHook() {
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
      view, scene, invalidate,
    };
    return () => delete window.__lancer;
  }, [gl, scene, camera, size, invalidate]);
  return null;
}

export default function Scene() {
  const status = useMap((s) => s.status);
  const error = useMap((s) => s.error);
  const map = useMap((s) => s.map);
  const index = useMap((s) => s.index);
  const playerMode = useMap((s) => s.playerMode);

  const ready = useMemo(() => {
    if (status !== 'ready') return false;
    view.targets = buildTargets(map, index, { playerMode });
    if (!view.rig || !view.targets.has(view.rig.focusId)) {
      view.rig = createRig(view.targets, 'basin', { yaw: 0, pitch: 0.3, frame: frameFor(innerWidth / innerHeight) });
    }
    return true;
  }, [status, map, index, playerMode]);

  return (
    <>
      <Canvas
        flat
        frameloop="demand"
        gl={{ logarithmicDepthBuffer: true }}
        camera={{ fov: CAMERA.fov, near: CAMERA.nearKm, far: CAMERA.farKm, position: [0, 0, 0] }}
      >
        <color attach="background" args={['#000']} />
        {ready && (
          <>
            <CameraRig />
            <Lanes />
            <System />
            <Planets />
            <Places />
            <Stars />
            <Centers />
            <RegionEffects />
            <RegionLabelsUpdater />
            <LaneLabelsUpdater />
            <BodyLabelsUpdater />
            <PlaceLabelsUpdater />
            <DebugHook />
          </>
        )}
      </Canvas>
      {ready && (
        <>
          <RegionLabels />
          <LaneLabels />
          <BodyLabels />
          <PlaceLabels />
          <LanesToggle />
        </>
      )}
      {status === 'error' && (
        <p style={{ position: 'fixed', left: 16, top: 16, color: '#f88', font: '14px system-ui' }}>
          Could not load the map: {error}
        </p>
      )}
    </>
  );
}
