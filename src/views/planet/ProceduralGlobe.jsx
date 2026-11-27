// A procedural world's globe (Planet.jsx shows it for planets, moons, giants
// and rogue planets that have no imported maps): the ground or cloud tops on
// the level-of-detail patches (cubeSphere.js), a cloud shell, the sky shell
// and rings, all in the body's own frame (globe.js, P16) and scaled to its
// radius. The world's fields are painted the first time it shows (fields.js)
// and kept for the 8 most recent worlds.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { offsetKm } from '../origin.js';
import { view } from '../camera/view.js';
import { latLonSphere } from '../globeGeometry.js';
import { random } from '../surfaces.js';
import { choosePatches, patchGeometry, setPatches, MAX_LEVEL } from './cubeSphere.js';
import { recipe, placeHints, sunlight } from './recipes.js';
import { paintFields } from './fields.js';
import { biomeTexture } from './biomes.js';
import { terrainMaterial } from './terrain.js';
import { gasMaterial } from './gas.js';
import { useMap } from '../../data/store.js';
import { readyGlobes } from '../jobs.js';
import { cloudMaterial, CLOUD_SHELL } from './clouds.js';
import { skyMaterial } from './atmosphere.js';
import { ringMaterial, ringTextures, RING, RING_INNER, RING_OUTER } from './rings.js';

const SHELL = latLonSphere(160, 80);
const KEEP = 8;
const worlds = new Map(); // body id → { r, hints, fields, biomes }, oldest first

function world(gl, body, places) {
  if (worlds.has(body.id)) {
    const w = worlds.get(body.id);
    worlds.delete(body.id);
    worlds.set(body.id, w);
    return w;
  }
  while (worlds.size >= KEEP) {
    const [oldest, w] = worlds.entries().next().value;
    w.fields?.dispose();
    w.biomes?.dispose();
    worlds.delete(oldest);
  }
  const rand = random(`world:${body.id}`);
  const r = recipe(body, rand);
  const hints = placeHints(places.filter((p) => p.body === body.id));
  const w = { r, hints };
  if (r.kind === 'terrain') {
    w.fields = paintFields(gl, r, hints, rand);
    w.biomes = biomeTexture(r.vegetation);
    w.biomes.wrapS = w.biomes.wrapT = THREE.ClampToEdgeWrapping;
  }
  worlds.set(body.id, w);
  return w;
}

export default function ProceduralGlobe({ info, blend, places, index }) {
  const group = useRef();
  const { body } = info;
  const gl = useThree((s) => s.gl);
  const w = useMemo(() => world(gl, body, places), [gl, body, places]);
  const sun = useMemo(() => sunlight(index, body), [index, body]);
  const ring = body.appearance?.rings ? [RING_INNER, RING_OUTER] : null;
  const geometry = useMemo(() => patchGeometry(), []);
  const { surface, clouds, sky, rings } = useMemo(() => {
    const ringAlpha = ringTextures().alpha;
    const color = body.appearance?.color ?? '#9a8f80';
    const surface = w.r.kind === 'gas'
      ? gasMaterial({ r: w.r, ringAlpha, ring })
      : terrainMaterial({ r: w.r, fields: w.fields, hints: w.hints, biomes: w.biomes, radiusKm: info.radiusKm, ringAlpha, ring });
    const clouds = w.r.kind === 'terrain' && w.r.clouds > 0 ? cloudMaterial(w.fields.climate, w.r.air, w.r.seed) : null;
    const sky = w.r.air ? skyMaterial(w.r.air, {}) : null;
    sky && (sky.uniforms.uAirTop.value = w.r.air.top);
    return { surface, clouds, sky, rings: ring ? ringMaterial(color) : null };
  }, [w, info.radiusKm, body]);
  // Its fields bake at once (fields.js), so it is ready when mounted.
  useEffect(() => { readyGlobes.add(body.id); return () => readyGlobes.delete(body.id); }, [body.id]);
  useEffect(() => () => {
    geometry.dispose();
    for (const m of [surface, clouds, sky, rings]) m?.dispose();
  }, [geometry, surface, clouds, sky, rings]);

  const basis = useMemo(() => {
    const { lon0, lon90, north } = info.axes;
    return new THREE.Matrix4().makeBasis(new THREE.Vector3(...lon0), new THREE.Vector3(...lon90), new THREE.Vector3(...north));
  }, [info]);
  const inverseBasis = useMemo(() => basis.clone().invert(), [basis]);
  const tmp = useMemo(() => ({ rel: [0, 0, 0], inv: new THREE.Matrix4(), cam: new THREE.Vector3(), sunDir: new THREE.Vector3() }), []);

  useFrame(({ camera, size }) => {
    const g = group.current;
    const cam = view.rig?.camera;
    if (!g || !cam) return;
    offsetKm(cam, info.place, tmp.rel);
    g.position.set(...tmp.rel);
    g.quaternion.setFromRotationMatrix(basis);
    g.scale.setScalar(info.radiusKm);
    g.updateMatrixWorld();
    const b = blend.current.get(body.id) ?? 0;
    g.visible = b > 0;
    if (!g.visible) return;
    // The camera and the star in the planet's own frame (radius 1).
    tmp.cam.set(0, 0, 0).applyMatrix4(tmp.inv.copy(g.matrixWorld).invert());
    if (info.toStar) tmp.sunDir.set(...info.toStar).applyMatrix4(inverseBasis).normalize();
    else tmp.sunDir.set(0, 0, 1);
    const focal = size.height / 2 / Math.tan((camera.fov * Math.PI) / 360);
    setPatches(geometry, choosePatches(tmp.cam.toArray(), focal, w.r.kind === 'gas' ? 5 : MAX_LEVEL));
    for (const m of [surface, clouds, sky]) {
      if (!m) continue;
      const u = m.uniforms;
      u.uCam?.value.copy(tmp.cam);
      u.uSunDir.value.copy(tmp.sunDir);
      u.uSunColor.value.set(...sun.color);
      if (u.uAmbient) u.uAmbient.value = sun.ambient;
      u.uOpacity.value = b;
    }
    // World Lab view (B0.7): the map on the ground, clouds and air hidden.
    const lab = useMap.getState().labView;
    if (surface.uniforms.uDebug) surface.uniforms.uDebug.value = lab;
    if (clouds) clouds.uniforms.uOpacity.value = lab ? 0 : b;
    if (sky) sky.uniforms.uOpacity.value = lab ? 0 : b;
    surface.transparent = b < 1;
    if (rings) {
      rings.uniforms.uOpacity.value = b;
      rings.uniforms.uLight.value.copy(tmp.sunDir);
      rings.uniforms.uLit.value = info.toStar ? 1 : 0;
    }
  }, -1);

  return (
    <group ref={group} userData={{ layer: 'globes', body: body.id }}>
      <mesh geometry={geometry} material={surface} frustumCulled={false} />
      {clouds && <mesh geometry={SHELL} material={clouds} scale={CLOUD_SHELL} renderOrder={1} />}
      {sky && <mesh geometry={SHELL} material={sky} scale={w.r.air.top} renderOrder={2} />}
      {rings && <mesh geometry={RING} material={rings} renderOrder={3} />}
    </group>
  );
}
