// The map: one canvas for every zoom level (no scene swaps). Once the store
// has the map, the camera targets are built and the camera starts framed on
// the whole Basin.

import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useMap } from '../data/store.js';
import { CAMERA } from './origin.js';
import { view } from './camera/view.js';
import { createRig, frameFor } from './camera/rig.js';
import { screenPos } from './camera/pick.js';
import CameraRig from './camera/CameraRig.jsx';
import { buildTargets } from './mapTargets.js';
import Stars from './Stars.jsx';
import { RegionLabels, RegionLabelsUpdater } from './RegionLabels.jsx';

// Development builds only: lets the browser checks in tools/ read the renderer.
function DebugHook() {
  const { gl, scene, camera, size, invalidate } = useThree();
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    window.__lancer = {
      render: () => ({ ...gl.info.render }),
      screen: (id) => screenPos(camera, view.rig.camera, view.targets.get(id).place, size.width, size.height),
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
            <Stars />
            <RegionLabelsUpdater />
            <DebugHook />
          </>
        )}
      </Canvas>
      {ready && <RegionLabels />}
      {status === 'error' && (
        <p style={{ position: 'fixed', left: 16, top: 16, color: '#f88', font: '14px system-ui' }}>
          Could not load the map: {error}
        </p>
      )}
    </>
  );
}
