// Planet level check (task 2.10).
//
//   node tools/check_planet.mjs [--out DIR]
//
// Starts Vite, opens the map in headless Chromium (desktop and Pixel 7) and
// checks:
//   - a second click on the focused planet flies in close, where its globe
//     shows in place of the flat disc;
//   - Scald: places are drawn and named, the Seam is drawn, and on screen the
//     Concord's places lie north of the Seam and the League's south;
//   - turning to the far side of Scald hides the places there;
//   - Tallis: its two moons are drawn on their orbits in the planet view;
//   - a map registered through src/views/surfaces.js lines up with lat/lon:
//     dots painted at two [lat, lon] on Scald's map appear where those
//     coordinates are on screen (with a height map applied too);
//   - Tallis III's rings are drawn; no page errors.
// Screenshots go to --out. Uses the Playwright installed with the environment.

import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const outArg = process.argv.indexOf('--out');
const OUT = resolve(outArg > 0 ? process.argv[outArg + 1] : join(tmpdir(), 'lancer-planet'));

const results = [];
function check(name, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

function brightest(png) {
  let width, height, type;
  const idat = [];
  for (let i = 8; i < png.length;) {
    const len = png.readUInt32BE(i);
    const tag = png.toString('ascii', i + 4, i + 8);
    if (tag === 'IHDR') { width = png.readUInt32BE(i + 8); height = png.readUInt32BE(i + 12); type = png[i + 17]; }
    if (tag === 'IDAT') idat.push(png.subarray(i + 8, i + 8 + len));
    i += 12 + len;
  }
  const bpp = type === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = new Uint8Array(width * height * bpp);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      out[y * stride + x] = (v + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
    }
  }
  let max = 0;
  for (let i = 0; i < out.length; i++) if (i % bpp < 3) max = Math.max(max, out[i]);
  return max;
}
// Whether the middle pixel of a small clip is magenta (the test map's dots).
function magenta(png) {
  let width, height, type;
  const idat = [];
  for (let i = 8; i < png.length;) {
    const len = png.readUInt32BE(i);
    const tag = png.toString('ascii', i + 4, i + 8);
    if (tag === 'IHDR') { width = png.readUInt32BE(i + 8); height = png.readUInt32BE(i + 12); type = png[i + 17]; }
    if (tag === 'IDAT') idat.push(png.subarray(i + 8, i + 8 + len));
    i += 12 + len;
  }
  const bpp = type === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = new Uint8Array(width * height * bpp);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      out[y * stride + x] = (v + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
    }
  }
  const m = (Math.floor(height / 2) * width + Math.floor(width / 2)) * bpp;
  const [r, g, b] = [out[m], out[m + 1], out[m + 2]];
  return r > 2 * g + 20 && b > 2 * g + 20 ? true : `rgb(${r},${g},${b})`;
}
const peak = async (page, x, y, half = 3) => brightest(await page.screenshot({ clip: { x: Math.round(x - half), y: Math.round(y - half), width: 2 * half + 1, height: 2 * half + 1 } }));
const ev = (page, fn, arg) => page.evaluate(fn, arg);
async function settle(page) {
  await page.waitForFunction(() => !window.__lancer.view.rig.fly, null, { timeout: 10000 });
  await page.waitForTimeout(350);
}
const focus = async (page, id) => { await ev(page, (i) => window.__lancer.focus(i), id); await settle(page); };
async function click(page, id, touch) {
  const p = await ev(page, (i) => window.__lancer.screen(i), id);
  if (touch) await page.touchscreen.tap(p[0], p[1]); else await page.mouse.click(p[0], p[1]);
  await page.waitForTimeout(100);
  await settle(page);
}

const CONCORD = ['kettle-flats', 'haldane-house', 'glasstown'];
const LEAGUE = ['league-hall'];

async function run(browser, base, name, options) {
  console.log(`\n${name}`);
  const page = await browser.newPage(options);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base);
  await page.waitForFunction(() => window.__lancer?.view.rig?.camera, null, { timeout: 15000 });
  await page.waitForTimeout(400);

  // A test map for Scald, as an imported texture or a generator would supply:
  // magenta dots at two [lat, lon], on a dark ground, full color, plus a height map.
  const DOTS = [[0, 0], [-30, 20]]; // both on the face the close view turns to
  await ev(page, async (dots) => {
    const { registerSurface, canvasTexture } = await import('/src/views/surfaces.js');
    const W = 1024, H = 512;
    const paint = (fill) => (data, w, h) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(fill(x, y, w, h), 4 * (y * w + x));
    };
    const near = (x, y, w, h) => dots.some(([lat, lon]) => Math.hypot(x - ((lon + 180) / 360) * w, y - (1 - (lat + 90) / 180) * h) < 7);
    const map = canvasTexture(W, H, paint((x, y, w, h) => (near(x, y, w, h) ? [255, 0, 255, 255] : [40, 40, 40, 255])));
    const heightMap = canvasTexture(256, 128, paint((x) => { const v = 128 + 100 * Math.sin(x / 10); return [v, v, v, 255]; }), { color: false });
    registerSurface((body) => (body.id === 'scald-planet' ? { map, tint: false, heightMap, heightScale: 0.002 } : null));
  }, DOTS);

  // Scald: fly to it, then click it again to come in close.
  await focus(page, 'scald-planet');
  const before = await ev(page, () => window.__lancer.globeShowing('scald-planet'));
  await click(page, 'scald-planet', options.hasTouch);
  const st = await ev(page, () => ({ d: window.__lancer.view.rig.distance, close: window.__lancer.view.targets.get('scald-planet').closeKm * window.__lancer.view.rig.frame, globe: window.__lancer.globeShowing('scald-planet'), disc: window.__lancer.bodyAlpha('scald-planet') }));
  // (Scald has no moons, so its planet view is already close enough for the globe.)
  check('a second click on Scald flies in close, where its globe replaces the disc', st.globe && st.disc === 1 && Math.abs(st.d / st.close - 1) < 1e-6, `${Math.round(st.d)} km away (planet view: globe ${before})`);
  const disc = await ev(page, () => { const m = window.__lancer.scene.children.find((o) => o.userData.layer === 'bodies'); return m.geometry.attributes.aColor.getW(m.userData.ids.indexOf('scald-planet')); });
  check('the flat disc is gone where the globe shows', disc === 0, `disc opacity ${disc}`);
  await page.screenshot({ path: join(OUT, `${name}-scald.png`) });

  // The test map's dots are where their [lat, lon] are on screen.
  const dotHits = [];
  const labelsShown = (v) => ev(page, (vis) => document.querySelectorAll('[data-place],[data-body],[data-region]').forEach((e) => { e.style.visibility = vis; }), v);
  await labelsShown('hidden'); // measure the globe, not text laid over it
  for (const at of DOTS) {
    const p = await ev(page, (a) => window.__lancer.placeScreen('the-seam', a), at);
    if (!p) { dotHits.push('behind'); continue; }
    const png = await page.screenshot({ clip: { x: Math.round(p[0]) - 1, y: Math.round(p[1]) - 1, width: 3, height: 3 } });
    dotHits.push(magenta(png));
  }
  await labelsShown('');
  check('a registered surface map lines up with lat/lon on the globe', dotHits.every((h) => h === true), dotHits.join(', '));

  // Places drawn and named.
  const ids = [...CONCORD, ...LEAGUE, 'kerrtown'];
  let drawn = 0;
  for (const id of ids) {
    const p = await ev(page, (i) => window.__lancer.placeScreen(i), id);
    if (p && (await peak(page, p[0], p[1])) > 120) drawn++;
  }
  const named = await ev(page, () => [...document.querySelectorAll('[data-place]')].filter((e) => e.style.opacity === '1').length);
  check("Scald's places are drawn", drawn === ids.length, `${drawn} of ${ids.length} markers`);
  check("Scald's places are named", named >= (options.hasTouch ? 5 : 8), `${named} names`);
  const seam = await ev(page, () => window.__lancer.frontPieces());
  check('the Seam is drawn', seam >= 20, `${seam} pieces facing the camera`);

  // North and south of the Seam, on screen.
  const [c, n] = await ev(page, () => window.__lancer.northScreen('scald-planet'));
  const up = [n[0] - c[0], n[1] - c[1]];
  const side = async (id) => {
    const at = await ev(page, (i) => {
      const p = window.__lancer.placeScreen(i);
      return p;
    }, id);
    const lon = (await ev(page, (i) => window.__lancer.placeAt(i), id))[1];
    const s = await ev(page, ([l]) => window.__lancer.seamScreen(l), [lon]);
    return (at[0] - s[0]) * up[0] + (at[1] - s[1]) * up[1];
  };
  const north = [];
  for (const id of CONCORD) north.push(await side(id));
  const south = [];
  for (const id of LEAGUE) south.push(await side(id));
  check("on screen, the Concord's places lie north of the Seam and the League's south", north.every((v) => v > 0) && south.every((v) => v < 0), `Concord ${north.map((v) => v.toFixed(0)).join(', ')}; League ${south.map((v) => v.toFixed(0)).join(', ')} (px towards the pole)`);

  // The far side: turn the camera half round.
  await ev(page, () => { const r = window.__lancer.view.rig; r.yaw += Math.PI; r.pitch = -r.pitch; window.__lancer.invalidate(); });
  await page.waitForTimeout(300);
  const hidden = await ev(page, (list) => list.map((i) => window.__lancer.placeAlpha(i)), ids);
  check('from the far side of Scald its places are hidden', hidden.every((a) => a === 0), hidden.map((a) => a.toFixed(2)).join(', '));

  // Tallis: moons drawn on their orbits in the planet view.
  await focus(page, 'tallis-planet');
  await page.screenshot({ path: join(OUT, `${name}-tallis-moons.png`) });
  const moons = [];
  for (const id of ['tallis-a', 'tallis-b']) {
    const p = await ev(page, (i) => window.__lancer.screen(i), id);
    const a = await ev(page, (i) => window.__lancer.bodyAlpha(i), id);
    moons.push(a === 1 && p && (await peak(page, p[0], p[1])) > 60);
  }
  check("Tallis's two moons are drawn on their orbits", moons.every(Boolean), moons.join(', '));
  await click(page, 'tallis-planet', options.hasTouch);
  await page.screenshot({ path: join(OUT, `${name}-tallis.png`) });

  // Tallis III's rings.
  await focus(page, 'tallis-iii');
  await click(page, 'tallis-iii', options.hasTouch);
  const rings = await ev(page, () => window.__lancer.scene.getObjectsByProperty('type', 'Group').some((g) => g.userData.layer === 'globes' && g.userData.body === 'tallis-iii' && g.visible && g.children.some((m) => m.geometry.type === 'RingGeometry')));
  check("Tallis III's globe shows with its rings", rings);
  await page.screenshot({ path: join(OUT, `${name}-tallis-iii.png`) });
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.close();
}

mkdirSync(OUT, { recursive: true });
const server = await createServer({ logLevel: 'error', server: { port: 5193, strictPort: true } });
await server.listen();
const base = 'http://localhost:5193/';
const browser = await chromium.launch();
try {
  const warm = await browser.newPage();
  await warm.goto(base);
  await warm.waitForTimeout(3000);
  await warm.close();
  await run(browser, base, 'desktop', { viewport: { width: 1280, height: 800 } });
  await run(browser, base, 'phone', devices['Pixel 7']);
  console.log(`\nScreenshots: ${OUT}`);
} finally {
  await browser.close();
  await server.close();
}
const pass = results.every(Boolean);
console.log(pass ? `\nPASS: ${results.length} checks` : `\nFAIL: ${results.filter((r) => !r).length} of ${results.length} checks`);
process.exit(pass ? 0 : 1);
