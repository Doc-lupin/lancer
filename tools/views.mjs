// Shared helpers for the Section B view tools: open the app in headless
// Chromium, go to a named view, and measure it. Used by tools/viewcheck.mjs
// (the view checks and the baseline recorder) and a few others.
//
// A view is an object; all fields are optional and apply in this order:
//   name     file name
//   press    keys to press after load, e.g. ["l"] (lanes bright), ["l","l"] (off)
//   focus    fly to this id, framed as a click does
//   close    fly in close to this body's globe
//   yaw, pitch   set the camera's angles (radians)
//   dist     multiply the camera's distance (e.g. 0.5 for twice as close)
//   debug    World Lab view on procedural worlds: 0 off, 1 height, 2 moisture,
//            3 temperature (uDebug in src/views/planet/terrain.js)
//
// Each view starts from a fresh page load, so it does not depend on the views
// before it (label positions keep their last spot; bakes are cached).

import { createRequire } from 'node:module';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

export const DEVICES = {
  desktop: { context: { viewport: { width: 1280, height: 800 } }, cpuSlowdown: 1 },
  // Decision P10: phone emulation with the CPU slowed 4×.
  phone: { context: devices['Pixel 7'], cpuSlowdown: 4 },
};

// worlds: 'wip' opens the app with the WIP procedural worlds on (?worlds=wip,
// decision BQ1); otherwise the default, Phase 2 globes.
export async function startApp(port, { worlds } = {}) {
  const server = await createServer({ logLevel: 'error', server: { port, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ args: ['--enable-precise-memory-info'] });
  return {
    base: `http://localhost:${port}/${worlds ? `?worlds=${worlds}` : ''}`,
    browser,
    close: async () => { await browser.close(); await server.close(); },
  };
}

// How fast this machine runs our kind of work: a fixed piece of JavaScript
// (math into a typed array, then a sort) timed in an unthrottled page: the
// fastest of 7 runs in ms (other load on the machine only makes runs slower). Time budgets recorded on one machine are scaled by
// the ratio of this number when they are checked on another (B0.3, BQ2).
export async function machineMs(app) {
  const context = await app.browser.newContext();
  const page = await context.newPage();
  try {
    return await page.evaluate(() => {
      const run = () => {
        const t = performance.now();
        const a = new Float64Array(200000);
        let x = 0;
        for (let k = 0; k < 12; k++) {
          for (let i = 0; i < a.length; i++) { a[i] = Math.sin(i * 0.001 + k) * Math.sqrt(i + k); x += a[i]; }
          a.sort();
        }
        return [performance.now() - t, x];
      };
      run();
      return +Math.min(...Array.from({ length: 7 }, () => run()[0])).toFixed(1);
    });
  } finally {
    await context.close();
  }
}

// A new page for one device, with page errors collected.
export async function openPage(app, device) {
  const d = DEVICES[device];
  const context = await app.browser.newContext(d.context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 400)); });
  // The orbit hint shows for the first 9 s (CameraToggle.jsx); the tools hide
  // it rather than wait for it. Pictures are the same as after its fade.
  await page.addInitScript(() => addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style');
    s.textContent = '[data-hint="orbit"] { opacity: 0 !important; transition: none !important; }';
    document.head.appendChild(s);
  }));
  if (d.cpuSlowdown > 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: d.cpuSlowdown });
  }
  return { page, errors, close: () => context.close() };
}

// Draw `n` frames, one after another (bakes run in the first frame a thing shows).
export const frames = (page, n) => page.evaluate(async (n) => {
  for (let i = 0; i < n; i++) {
    window.__lancer.invalidate();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }
}, n);

const settle = (page) => page.waitForFunction(() => !window.__lancer.view.rig.fly, null, { timeout: 120000 });

// Load the app and go to the view. Returns the number of frames flown and
// the longest gap between them (ms), which shows bakes that hold the view.
export async function goTo(page, base, v) {
  await page.goto(base);
  await page.waitForFunction(() => window.__lancer?.view.rig?.camera, null, { timeout: 60000 });
  await frames(page, 3);
  for (const k of v.press ?? []) await page.keyboard.press(k);
  // The longest gap between frames while flying: a bake that holds the view.
  const flight = { frames: 0, worstGapMs: 0 };
  const fly = async (go, arg) => {
    await page.evaluate(() => window.__lancer.startRecording());
    await page.evaluate(go, arg);
    await settle(page);
    const s = await page.evaluate(() => {
      const f = window.__lancer.frames();
      let worst = 0;
      for (let i = 1; i < f.length; i++) worst = Math.max(worst, f[i].t - f[i - 1].t);
      return { n: f.length, worst };
    });
    flight.frames += s.n;
    flight.worstGapMs = Math.max(flight.worstGapMs, +s.worst.toFixed(1));
  };
  if (v.focus) await fly((f) => window.__lancer.focus(f), v.focus);
  if (v.close) await fly((f) => window.__lancer.focusAt(f, window.__lancer.view.targets.get(f).closeKm), v.close);
  await page.evaluate((v) => {
    const r = window.__lancer.view.rig;
    if (v.yaw != null) r.yaw = v.yaw;
    if (v.pitch != null) r.pitch = v.pitch;
    if (v.dist) r.distance *= v.dist;
    if (v.debug != null) window.__lancer.scene.traverse((o) => { if (o.material?.uniforms?.uDebug) o.material.uniforms.uDebug.value = v.debug; });
    window.__lancer.invalidate();
  }, v);
  // Let late bakes and the last redraw finish; label fades are finished by the
  // screenshot (animations disabled).
  await frames(page, 3);
  await steady(page);
  return flight;
}

// Make the picture depend on the view only, not on how the flight went:
// - Name labels try their spot from the last frame first (labelPlace.js), so
//   their sides depend on the frames flown. Forget those spots and draw two
//   frames: the first places every label from this view alone, the second
//   keeps them.
async function steady(page) {
  await page.evaluate(() => { for (const el of document.querySelectorAll('body *')) { delete el._spot; delete el._shown; } });
  await frames(page, 2);
}

// Draw up to `n` frames in a row (at least 5, and no more once `budgetMs` has
// passed: close views draw slowly in software) and measure them; then the
// scene's memory.
//   workMs    our own per-frame work on the CPU, before three.js draws
//   frameMs   time from one frame to the next (includes the software draw)
//   gpuBytes  an estimate: geometry buffers and textures reachable from the
//             scene, including render targets used as uniforms
export async function measure(page, n = 30, budgetMs = 8000) {
  return page.evaluate(async ([n, budgetMs]) => {
    const L = window.__lancer;
    L.startRecording();
    const t0 = performance.now();
    for (let i = 0; i < n && (i < 5 || performance.now() - t0 < budgetMs); i++) {
      L.invalidate();
      await new Promise((r) => requestAnimationFrame(() => r()));
    }
    await new Promise((r) => requestAnimationFrame(() => r()));
    const f = L.frames().slice(1);
    const stat = (xs) => {
      const s = [...xs].sort((a, b) => a - b);
      const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
      return { median: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), max: +s[s.length - 1].toFixed(2) };
    };
    const gaps = f.slice(1).map((x, i) => x.t - f[i].t);
    const render = L.render();
    const memory = L.memory();

    const seenGeo = new Set(); const seenTex = new Set();
    let geoBytes = 0; let texBytes = 0;
    const BYTES = { 1009: 1, 1010: 1, 1015: 4, 1016: 2, 1013: 4, 1014: 4 }; // Unsigned/byte, float, half float, int
    const CH = { 1023: 4, 1022: 3, 1028: 1, 1030: 2 }; // RGBA, RGB, Red, RG
    const addTex = (t) => {
      if (!t?.isTexture || seenTex.has(t)) return;
      seenTex.add(t);
      const img = t.image;
      const faces = t.isCubeTexture || t.isWebGLCubeRenderTargetTexture || Array.isArray(img) ? 6 : 1;
      const one = Array.isArray(img) ? img[0] : img;
      const w = one?.width ?? 0, h = one?.height ?? 0, d = one?.depth ?? 1;
      texBytes += w * h * d * faces * (CH[t.format] ?? 4) * (BYTES[t.type] ?? 1) * (t.generateMipmaps ? 4 / 3 : 1);
    };
    L.scene.traverse((o) => {
      const g = o.geometry;
      if (g && !seenGeo.has(g)) {
        seenGeo.add(g);
        for (const a of Object.values(g.attributes)) geoBytes += a.array?.byteLength ?? 0;
        if (g.index) geoBytes += g.index.array.byteLength;
      }
      for (const m of [].concat(o.material ?? [])) {
        for (const v of Object.values(m)) addTex(v);
        for (const u of Object.values(m.uniforms ?? {})) [].concat(u?.value ?? []).forEach(addTex);
      }
    });
    if (L.scene.background) addTex(L.scene.background);
    return {
      frames: f.length,
      workMs: stat(f.map((x) => x.workMs)),
      frameMs: stat(gaps),
      drawCalls: render.calls,
      triangles: render.triangles,
      geometries: memory.geometries,
      textures: memory.textures,
      gpuBytesEstimate: Math.round(geoBytes + texBytes),
      jsHeapBytes: performance.memory?.usedJSHeapSize ?? null,
    };
  }, [n, budgetMs]);
}

// A still picture: CSS fades off, so two shots of a still view are the same.
// JPEG at quality 92: about 80 KB a view against 1 MB as PNG (the dithered
// sky does not compress), and the same pixels give the same file.
export const shoot = (page, path) => page.screenshot({ path, type: 'jpeg', quality: 92, animations: 'disabled' });
