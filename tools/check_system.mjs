// System level check (task 2.9).
//
//   node tools/check_system.mjs [--out DIR]
//
// Starts Vite, opens the map in headless Chromium (desktop and Pixel 7) and
// checks:
//   - at the Basin view no body or orbit line is drawn;
//   - flying to Ostrom and to Tallis, every planet and giant is drawn where its
//     orbit puts it on the clock's date, with orbit lines, and named;
//   - lanes end on their lane-mouth bodies (the Ostrom lane at Tallis);
//   - a station shows only once it is apart from its planet on screen: hidden
//     in the Ostrom system view, shown in the Ostrom IV view;
//   - clicking a planet flies to it; no page errors.
// Screenshots of Ostrom, Tallis and Ostrom IV go to --out (for the GM to judge).
// Uses the Playwright installed with the environment.

import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const outArg = process.argv.indexOf('--out');
const OUT = resolve(outArg > 0 ? process.argv[outArg + 1] : join(tmpdir(), 'lancer-system'));

const results = [];
function check(name, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

// Brightest channel in a small box: unfiltered PNG rows (filter 0) only appear
// for tiny clips, so decode the general case.
function decodePng(png) {
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
const peak = async (page, x, y, half = 3) => decodePng(await page.screenshot({ clip: { x: Math.round(x - half), y: Math.round(y - half), width: 2 * half + 1, height: 2 * half + 1 } }));

const ev = (page, fn, arg) => page.evaluate(fn, arg);
async function settle(page) {
  await page.waitForFunction(() => !window.__lancer.view.rig.fly, null, { timeout: 10000 });
  await page.waitForTimeout(300);
}
async function focus(page, id) {
  await ev(page, (i) => window.__lancer.focus(i), id);
  await settle(page);
}
const shownLabels = (page) => ev(page, () => [...document.querySelectorAll('[data-body]')].filter((e) => e.style.opacity === '1').map((e) => e.dataset.body));

const PLANETS = {
  'ostrom-system': ['ostrom-i', 'ostrom-ii', 'ostrom-iii', 'ostrom-iv', 'ostrom-v', 'ostrom-vi'],
  'tallis-system': ['tallis-i', 'tallis-planet', 'tallis-iii', 'tallis-iv'],
};

async function run(browser, base, name, options) {
  console.log(`\n${name}`);
  const page = await browser.newPage(options);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base);
  await page.waitForFunction(() => window.__lancer?.view.rig?.camera, null, { timeout: 15000 });
  await page.waitForTimeout(400);
  const { width, height } = page.viewportSize();
  const onScreen = (p) => p && p[0] > 6 && p[0] < width - 6 && p[1] > 6 && p[1] < height - 6;

  const atBasin = await ev(page, () => ({ orbits: window.__lancer.layerCount('orbits')[0], alpha: Math.max(...['ostrom-iv', 'tallis-planet', 'cairn-iii'].map((id) => window.__lancer.bodyAlpha(id))) }));
  check('at the Basin view no bodies or orbit lines are drawn', atBasin.orbits === 0 && atBasin.alpha === 0, `${atBasin.orbits} orbit pieces, body opacity ${atBasin.alpha}`);

  for (const [sys, planets] of Object.entries(PLANETS)) {
    await focus(page, sys);
    const label = sys.replace('-system', '');
    await page.screenshot({ path: join(OUT, `${name}-${label}.png`) });
    // Planets within a few pixels of their star are hidden on purpose; the
    // rest must be drawn, have an orbit line and (space allowing) a name.
    const shown = [];
    for (const id of planets) {
      const p = await ev(page, (i) => window.__lancer.screen(i), id);
      const alpha = await ev(page, (i) => window.__lancer.bodyAlpha(i), id);
      if (onScreen(p) && alpha === 1) shown.push({ id, p });
    }
    const orbitPieces = (await ev(page, () => window.__lancer.layerCount('orbits')))[0];
    check(`${label}: an orbit line for each planet shown`, shown.length >= 3 && orbitPieces >= shown.length * 128, `${shown.length} of ${planets.length} planets shown, ${orbitPieces / 128} orbits drawn`);
    let drawn = 0;
    const peaks = [];
    for (const { id, p } of shown) { const v = await peak(page, p[0], p[1]); peaks.push(`${id} ${v}`); if (v > 60) drawn++; }
    check(`${label}: every planet shown is drawn at its orbital place`, drawn === shown.length, `${drawn} of ${shown.length}: ${peaks.join(', ')}`);
    const labels = await shownLabels(page);
    const named = shown.filter(({ id }) => labels.includes(id)).length;
    check(`${label}: the system and its planets are named`, labels.includes(sys) && named >= shown.length - (options.hasTouch ? 1 : 0), `${named} of ${shown.length} shown planets named`);
  }

  // At Tallis: the Ostrom lane ends on its mouth body.
  await focus(page, 'tallis-system');
  const end = await ev(page, () => window.__lancer.laneScreen('ostrom-tallis', 1));
  const mouth = await ev(page, () => window.__lancer.screen('ostrom-tallis-at-tallis'));
  check('the Ostrom lane ends on its mouth at Tallis', end && mouth && Math.hypot(end[0] - mouth[0], end[1] - mouth[1]) < 0.5, mouth ? `mouth at ${mouth[0].toFixed(1)}, ${mouth[1].toFixed(1)}` : 'not on screen');

  // Stations near a planet appear only once apart from it on screen.
  await focus(page, 'ostrom-system');
  const far = await ev(page, () => window.__lancer.bodyAlpha('marrow'));
  await focus(page, 'ostrom-iv');
  const near = await ev(page, () => window.__lancer.bodyAlpha('marrow'));
  const labels = await shownLabels(page);
  check('the Marrow is hidden in the Ostrom view and shown, named, in the Ostrom IV view', far === 0 && near === 1 && labels.includes('marrow'), `opacity ${far} → ${near}`);
  await page.screenshot({ path: join(OUT, `${name}-ostrom-iv.png`) });

  // Click a planet to fly to it.
  await focus(page, 'ostrom-system');
  const v = await ev(page, () => window.__lancer.screen('ostrom-v'));
  if (options.hasTouch) await page.touchscreen.tap(v[0], v[1]); else await page.mouse.click(v[0], v[1]);
  await page.waitForTimeout(100);
  await settle(page);
  const f = await ev(page, () => window.__lancer.view.rig.focusId);
  check('clicking Ostrom V flies to it', f === 'ostrom-v', f);
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.close();
}

mkdirSync(OUT, { recursive: true });
const server = await createServer({ logLevel: 'error', server: { port: 5194, strictPort: true } });
await server.listen();
const base = 'http://localhost:5194/';
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
