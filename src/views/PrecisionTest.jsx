// Precision test scene (task 2.4). Open with ?test=precision.
//
// Four objects at the three scales, anchored at the Keel, the system farthest
// from the origin, where 64-bit numbers are least precise:
//   far star  46 ly away (Calder 329)      ly scale
//   star      at the Keel's position       AU scale
//   planet    1 AU from the star           AU scale
//   station   40,000 km from the planet    km scale
// Each is a green surface with a red one just behind it: plates 1 m apart on
// the station; spheres 1% of the radius apart on the planet and the stars, the
// gap of the planned atmosphere shell (P11). Any red pixel means the depth
// buffer could not tell them apart.
//
// Layer rule found by this test (see the resolution sweep in
// tools/check_jitter.mjs): the logarithmic depth buffer keeps two surfaces
// apart only if their gap is more than about 6 × 10^-5 of their distance from
// the camera. So a layer is drawn only while its gap is at least
// LAYER_GAP_RATIO × distance, about three times that; farther off, the body is
// a single surface. A 1% atmosphere shows within 50 radii of its planet.
//
// Without a driver the camera zooms in and out on the station by itself.
// tools/check_jitter.mjs drives it frame by frame through window.__precision.
// Add &mode=naive to see positions kept as plain km instead of anchored places.

import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { place, offsetKm, pixelsPerKm, KM_PER_LY, KM_PER_AU, CAMERA } from './origin.js';

const KEEL = [-8.94, -18.79, 12.75];
const CALDER_329 = [9.01, 21.93, -0.54];
const SUN_KM = 695700;
const PLANET = [0.6 * KM_PER_AU, 0.1 * KM_PER_AU, 0.79 * KM_PER_AU];
const STATION = [PLANET[0], PLANET[1], PLANET[2] + 40000];
const MIN_PX = 3; // smallest size on screen, in device pixels (P5)
const LAYER_GAP_RATIO = 2e-4; // a layer is drawn only while gap ≥ this × distance

const OBJECTS = [
  { name: 'far star', place: place(CALDER_329), radiusKm: 8.33 * SUN_KM, gapKm: 8.33 * SUN_KM * 0.01 },
  { name: 'star', place: place(KEEL), radiusKm: 0.823 * SUN_KM, gapKm: 0.823 * SUN_KM * 0.01 },
  { name: 'planet', place: place(KEEL, PLANET), radiusKm: 6000, gapKm: 60 },
  { name: 'station', place: place(KEEL, STATION), radiusKm: 0.15, gapKm: 0.001, plates: true },
];
const STATION_PLACE = OBJECTS[3].place;

const GREEN = new THREE.MeshBasicMaterial({ color: '#22dd44' });
const RED = new THREE.MeshBasicMaterial({ color: '#ff2020' });
const SPHERE = new THREE.SphereGeometry(1, 48, 24);
const PLATE = new THREE.PlaneGeometry(0.3, 0.3);
const BACK_PLATE = new THREE.PlaneGeometry(0.29, 0.29);

// Vector in km from one place to another as plain km values: what P3 first proposed.
function naiveOffsetKm(from, to, out) {
  for (let i = 0; i < 3; i++) {
    out[i] = (to.anchor[i] * KM_PER_LY + to.offset[i]) - (from.anchor[i] * KM_PER_LY + from.offset[i]);
  }
  return out;
}

function TestObject({ obj, groupRef }) {
  if (obj.plates) {
    return (
      <group ref={groupRef}>
        <mesh geometry={PLATE} material={GREEN} />
        <mesh geometry={BACK_PLATE} material={RED} position={[0, 0, -0.001]} />
      </group>
    );
  }
  const inner = (obj.radiusKm - obj.gapKm) / obj.radiusKm;
  return (
    <group ref={groupRef}>
      <mesh geometry={SPHERE} material={GREEN} scale={obj.radiusKm} />
      <mesh geometry={SPHERE} material={RED} scale={obj.radiusKm * inner} />
    </group>
  );
}

function Harness({ groups }) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    const rel = [0, 0, 0];
    const mv = new THREE.Matrix4();
    const buffer = new THREE.Vector2();

    // planetGapKm overrides the planet's layer gap and draws its layers at any size (resolution sweep).
    function frame({ mode = 'anchored', distanceKm, azimuthDeg = 10, elevationDeg = 12, countRed = false, planetGapKm = null }) {
      const toRel = mode === 'naive' ? naiveOffsetKm : offsetKm;
      const az = (azimuthDeg * Math.PI) / 180;
      const el = (elevationDeg * Math.PI) / 180;
      const dir = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
      const cam = place(KEEL, STATION.map((v, i) => v + distanceKm * dir[i]));
      gl.getDrawingBufferSize(buffer);

      camera.position.set(0, 0, 0);
      toRel(cam, STATION_PLACE, rel);
      camera.lookAt(rel[0], rel[1], rel[2]);
      camera.updateMatrixWorld();

      OBJECTS.forEach((obj, i) => {
        const g = groups[i].current;
        toRel(cam, obj.place, rel);
        g.position.set(rel[0], rel[1], rel[2]);
        const dist = Math.hypot(...rel);
        const px = 2 * obj.radiusKm * pixelsPerKm(dist, CAMERA.fov, buffer.y);
        const scale = Math.max(1, MIN_PX / px);
        g.scale.setScalar(scale);
        const inner = g.children[1];
        let gap = obj.gapKm;
        if (obj.name === 'planet' && planetGapKm != null) {
          gap = planetGapKm;
          inner.scale.setScalar(obj.radiusKm - gap);
        }
        inner.visible = planetGapKm != null || gap * scale >= LAYER_GAP_RATIO * dist;
      });

      gl.render(scene, camera);

      const objects = OBJECTS.map((obj, i) => {
        const g = groups[i].current;
        mv.multiplyMatrices(camera.matrixWorldInverse, g.matrixWorld);
        const r = obj.plates ? 0.15 : obj.radiusKm;
        const points = [[0, 0, 0]];
        for (const x of [-r, r]) for (const y of [-r, r]) for (const z of obj.plates ? [0] : [-r, r]) points.push([x, y, z]);
        return { name: obj.name, place: obj.place, scale: g.scale.x, mv: [...mv.elements], points };
      });

      let red = null;
      if (countRed) {
        const ctx = gl.getContext();
        const w = ctx.drawingBufferWidth, h = ctx.drawingBufferHeight;
        const px = new Uint8Array(w * h * 4);
        ctx.readPixels(0, 0, w, h, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
        red = 0;
        for (let i = 0; i < px.length; i += 4) if (px[i] > 160 && px[i + 1] < 90 && px[i + 2] < 90) red++;
      }

      return { camera: cam, station: STATION_PLACE, proj: [...camera.projectionMatrix.elements], viewport: [buffer.x, buffer.y], objects, red };
    }

    const params = new URLSearchParams(location.search);
    const mode = params.get('mode') ?? 'anchored';
    let driven = false;
    let raf = 0;
    const start = performance.now();
    // Zoom from 50 ly to 0.5 km and back over 40 seconds, circling slowly.
    const tick = (now) => {
      if (driven) return;
      const t = ((now - start) / 20000) % 2;
      const k = t < 1 ? t : 2 - t;
      const distanceKm = 50 * KM_PER_LY * Math.pow(0.5 / (50 * KM_PER_LY), k);
      frame({ mode, distanceKm, azimuthDeg: 10 + 15 * Math.sin(now / 4000), elevationDeg: 12 });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.__precision = {
      ready: true,
      frame(opts) {
        driven = true;
        cancelAnimationFrame(raf);
        return frame(opts);
      },
    };
    return () => {
      cancelAnimationFrame(raf);
      delete window.__precision;
    };
  }, [gl, scene, camera, groups]);

  return null;
}

export default function PrecisionTest() {
  const groups = useMemo(() => OBJECTS.map(() => ({ current: null })), []);
  return (
    <Canvas
      flat
      frameloop="never"
      gl={{ logarithmicDepthBuffer: true, preserveDrawingBuffer: true }}
      camera={{ fov: CAMERA.fov, near: CAMERA.nearKm, far: CAMERA.farKm, position: [0, 0, 0] }}
    >
      <color attach="background" args={['#000']} />
      {OBJECTS.map((obj, i) => <TestObject key={obj.name} obj={obj} groupRef={groups[i]} />)}
      <Harness groups={groups} />
    </Canvas>
  );
}
