// The map: one canvas for every zoom level (no scene swaps). Once the store
// has the map, the camera targets are built and the camera starts framed on
// the whole Basin.

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useMap } from '../data/store.js';
import { CAMERA } from './origin.js';
import { view } from './camera/view.js';
import { createRig, frameFor } from './camera/rig.js';
import CameraRig from './camera/CameraRig.jsx';
import { buildTargets } from './mapTargets.js';
import Backdrop from './Backdrop.jsx';
import Stars from './Stars.jsx';
import { RegionLabels, RegionLabelsUpdater } from './RegionLabels.jsx';
import Lanes from './Lanes.jsx';
import RegionEffects from './RegionEffects.jsx';
import Centers from './Centers.jsx';
import System from './System.jsx';
import Planets from './Planet.jsx';
import Places, { PlaceLabels, PlaceLabelsUpdater } from './Places.jsx';
import { BodyLabels, BodyLabelsUpdater } from './BodyLabels.jsx';
import { LaneLabels, LaneLabelsUpdater } from './LaneLabels.jsx';
import LanesToggle from '../interface/LanesToggle.jsx';
import CameraToggle from '../interface/CameraToggle.jsx';
import DebugHook from './DebugHook.jsx';

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
            <Backdrop />
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
            {import.meta.env.DEV && <DebugHook />}
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
          <CameraToggle />
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
