// Camera test scene (task 2.5). Open with ?test=camera.
// The four objects of the precision test, as plain shapes, each one a camera
// target: the Basin (nothing drawn) → the Keel's star → a planet → a station,
// plus a far star. Drag to orbit, wheel or pinch to zoom, click to fly.
// tools/check_camera.mjs drives it through window.__camera.

import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { place, KM_PER_LY, KM_PER_AU, CAMERA } from '../origin.js';
import { view } from './view.js';
import { createRig } from './rig.js';
import { screenPos } from './pick.js';
import { useAnchored } from './useAnchored.js';
import CameraRig from './CameraRig.jsx';

const KEEL = [-8.94, -18.79, 12.75];
const CALDER_329 = [9.01, 21.93, -0.54];
const SUN_KM = 695700;
const PLANET = [0.6 * KM_PER_AU, 0.1 * KM_PER_AU, 0.79 * KM_PER_AU];
const STATION = [PLANET[0], PLANET[1], PLANET[2] + 40000];

const TARGETS = {
  basin: { place: place([0, 0, 0]), radiusKm: 0, viewKm: 60 * KM_PER_LY, minKm: 1 * KM_PER_LY, parentId: null, pickable: false },
  'far-star': { place: place(CALDER_329), radiusKm: 8.33 * SUN_KM, viewKm: 3 * KM_PER_AU, minKm: 10 * SUN_KM, parentId: 'basin', color: '#aabfff' },
  star: { place: place(KEEL), radiusKm: 0.823 * SUN_KM, viewKm: 3 * KM_PER_AU, minKm: SUN_KM, parentId: 'basin', color: '#ffa45c' },
  planet: { place: place(KEEL, PLANET), radiusKm: 6000, viewKm: 30000, minKm: 7200, parentId: 'star', color: '#3fb7c9' },
  station: { place: place(KEEL, STATION), radiusKm: 0.15, viewKm: 1, minKm: 0.4, parentId: 'planet', color: '#e8e8e8', box: true },
};

const SPHERE = new THREE.SphereGeometry(1, 48, 24);
const BOX = new THREE.BoxGeometry(0.3, 0.12, 0.3);

function Body({ t }) {
  const ref = useRef();
  useAnchored(ref, t.place, { radiusKm: t.radiusKm, minPx: 4 });
  return (
    <group ref={ref}>
      <mesh geometry={t.box ? BOX : SPHERE} scale={t.box ? 1 : t.radiusKm}>
        <meshBasicMaterial color={t.color} />
      </mesh>
    </group>
  );
}

// Writes the focus and distance in the corner, and records frames for the checker.
function Probe({ label }) {
  const { camera, size } = useThree();
  const frames = useRef(null);
  useEffect(() => {
    window.__camera = {
      ready: true,
      state: () => ({ focus: view.rig.focusId, distance: view.rig.distance, yaw: view.rig.yaw, flying: !!view.rig.fly, target: view.rig.target }),
      screen: (id) => screenPos(camera, view.rig.camera, view.targets.get(id).place, size.width, size.height),
      place: (id) => view.targets.get(id).place,
      record: () => { frames.current = []; },
      frames: () => frames.current,
    };
    return () => delete window.__camera;
  }, [camera, size]);
  useFrame(() => {
    const r = view.rig;
    if (frames.current) frames.current.push({ t: performance.now(), focus: r.focusId, distance: r.distance, target: r.target, flying: !!r.fly });
    const d = r.distance;
    const text = d > 0.05 * KM_PER_LY ? `${(d / KM_PER_LY).toPrecision(3)} ly` : d > 1e7 ? `${(d / KM_PER_AU).toPrecision(3)} AU` : `${d.toPrecision(3)} km`;
    if (label.current) label.current.textContent = `focus: ${r.focusId} · ${text}`;
  });
  return null;
}

export default function CameraTest() {
  const label = useRef();
  if (view.rig?.focusId == null || !view.targets.has('station')) {
    view.targets = new Map(Object.entries(TARGETS));
    view.rig = createRig(view.targets, 'basin');
  }
  return (
    <>
      <Canvas
        flat
        frameloop="demand"
        gl={{ logarithmicDepthBuffer: true }}
        camera={{ fov: CAMERA.fov, near: CAMERA.nearKm, far: CAMERA.farKm, position: [0, 0, 0] }}
      >
        <color attach="background" args={['#000']} />
        {Object.entries(TARGETS).filter(([, t]) => t.color).map(([id, t]) => <Body key={id} t={t} />)}
        <CameraRig />
        <Probe label={label} />
      </Canvas>
      <div ref={label} style={{ position: 'fixed', left: 12, top: 10, color: '#9aa', font: '13px system-ui', pointerEvents: 'none' }} />
    </>
  );
}
