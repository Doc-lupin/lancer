// Cube-map orientation check (Section B, src/views/planet/fields.js).
//
//   node tools/check_cubemap.mjs
//
// The planet fields are painted into cube maps with three.js's CubeCamera and
// read back with texture(cube, direction). This paints each direction's own
// value into a cube render target and reads it back at seven directions: each
// must come back as itself, or the fields would be mirrored or turned against
// the places' latitudes and longitudes. Passed on Nov 26, 2026 with three
// 0.187.0; run it again after a three.js upgrade.

import { createRequire } from 'node:module';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const server = await createServer({ logLevel: 'error', server: { port: 5188, strictPort: true } });
await server.listen();
const browser = await chromium.launch();
let pass = false;
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:5188/');
  const out = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const gl = new THREE.WebGLRenderer();
    const rt = new THREE.WebGLCubeRenderTarget(64, { type: THREE.HalfFloatType });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 v; void main(){ v = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 v; void main(){ gl_FragColor = vec4(normalize(v) * 0.5 + 0.5, 1.0); }',
    })));
    new THREE.CubeCamera(0.1, 10, rt).update(gl, scene);
    const dirs = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.6, 0.8, 0], [0.6, 0, 0.8], [0, 0.6, 0.8], [-0.48, 0.6, 0.64]];
    const t = new THREE.WebGLRenderTarget(dirs.length, 1, { type: THREE.FloatType });
    const m = new THREE.ShaderMaterial({
      uniforms: { c: { value: rt.texture }, d: { value: dirs.map((x) => new THREE.Vector3(...x)) } },
      vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform samplerCube c; uniform vec3 d[7]; void main(){ int i = int(gl_FragCoord.x); gl_FragColor = vec4(texture(c, d[i]).rgb * 2.0 - 1.0, 1.0); }',
    });
    const q = new THREE.Scene();
    q.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m));
    gl.setRenderTarget(t);
    gl.render(q, new THREE.Camera());
    gl.setRenderTarget(null);
    const px = new Float32Array(dirs.length * 4);
    gl.readRenderTargetPixels(t, 0, 0, dirs.length, 1, px);
    return dirs.map((d, i) => ({ d, got: [px[i * 4], px[i * 4 + 1], px[i * 4 + 2]] }));
  });
  const worst = Math.max(...out.map(({ d, got }) => Math.max(...d.map((v, k) => Math.abs(v - got[k])))));
  pass = worst < 0.02;
  for (const { d, got } of out) console.log(`${JSON.stringify(d)} → ${JSON.stringify(got.map((v) => +v.toFixed(3)))}`);
  console.log(pass ? `\nPASS: each direction reads back as itself (largest error ${worst.toFixed(4)})` : `\nFAIL: largest error ${worst.toFixed(4)}`);
} finally {
  await browser.close();
  await server.close();
}
process.exit(pass ? 0 : 1);
