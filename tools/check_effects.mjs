// Region effects and system-center icons check (task 2.8).
//
//   node tools/check_effects.mjs [--out DIR]
//
// Starts Vite, opens the map in headless Chromium (desktop and Pixel 7) and
// checks, by reading pixels from screenshots with each layer turned on and off:
//   - the Furnace's nebula and the Mire's dust are visible from the Basin
//     level, the nebula pink-violet and the dust brown;
//   - the dust dims the Mire's stars;
//   - flying into a Furnace system doesn't fill the screen with nebula;
//   - 11 icons: 7 rogue planets, 3 wrecks, 1 structure, none bigger than a
//     Sun-like star, each visible, and a click on one flies to its system;
//   - draw calls and page errors.
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
const OUT = resolve(outArg > 0 ? process.argv[outArg + 1] : join(tmpdir(), 'lancer-effects'));

const results = [];
function check(name, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

// 8-bit RGB or RGBA PNG → { width, height, px: Uint8Array of RGB }.
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
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      out[y * stride + x] = (v + pred) & 255;
    }
  }
  const px = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) for (let k = 0; k < 3; k++) px[i * 3 + k] = out[i * bpp + k];
  return { width, height, px };
}

// Mean [r, g, b] over a box centered on (x, y).
async function mean(page, x, y, half) {
  const { width, height } = page.viewportSize();
  const clip = { x: Math.max(0, Math.round(x - half)), y: Math.max(0, Math.round(y - half)) };
  clip.width = Math.min(width - clip.x, 2 * half);
  clip.height = Math.min(height - clip.y, 2 * half);
  const { px } = decodePng(await page.screenshot({ clip }));
  const sum = [0, 0, 0];
  for (let i = 0; i < px.length; i += 3) for (let k = 0; k < 3; k++) sum[k] += px[i + k];
  return sum.map((s) => s / (px.length / 3));
}
async function peak(page, x, y, half = 3) {
  const { px } = decodePng(await page.screenshot({ clip: { x: Math.round(x - half), y: Math.round(y - half), width: 2 * half + 1, height: 2 * half + 1 } }));
  return Math.max(...px);
}

// Show or hide layers by the tag each view puts on its mesh (nebula, dust, icons).
const layers = (page, show) => page.evaluate((show) => {
  for (const o of window.__lancer.scene.children) if (o.userData.layer in show) o.visible = show[o.userData.layer];
  window.__lancer.invalidate();
}, show);

async function settle(page) {
  await page.waitForFunction(() => !window.__lancer.view.rig.fly, null, { timeout: 10000 });
  await page.waitForTimeout(250);
}
const fmt = (c) => c.map((v) => v.toFixed(1)).join(', ');

async function run(browser, base, name, options) {
  console.log(`\n${name}`);
  const page = await browser.newPage(options);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base);
  await page.waitForFunction(() => window.__lancer?.view.rig?.camera, null, { timeout: 15000 });
  await page.waitForTimeout(400);

  const info = await page.evaluate(() => {
    const byLayer = {};
    for (const o of window.__lancer.scene.children) if (o.userData.layer) byLayer[o.userData.layer] = o.count;
    return { calls: window.__lancer.render().calls, byLayer, icons: window.__lancer.centerTypes() };
  });
  check('draw calls at the Basin: backdrop 2, stars 2, lanes 2, icons 1, effects 2 (no bodies, orbits, places or fronts)', info.calls === 9, `${info.calls}`);
  check('11 center icons: 7 rogue planets, 3 wrecks, 1 structure', info.icons['rogue-planet'] === 7 && info.icons.wreck === 3 && info.icons.structure === 1 && Object.keys(info.icons).length === 3, JSON.stringify(info.icons));

  // Icons are no bigger than a Sun-like star's glow (8 px), so they don't out-scale the stars.
  const iconSizes = await page.evaluate(() => {
    const icons = window.__lancer.scene.children.find((o) => o.userData.layer === 'icons');
    return Array.from(icons.geometry.attributes.aSize.array);
  });
  check('center icons are no bigger than a Sun-like star (8 px) at the Basin view', Math.max(...iconSizes) <= 8, `${Math.min(...iconSizes).toFixed(1)}–${Math.max(...iconSizes).toFixed(1)} px`);

  // Effects from the Basin level: the same box with and without them.
  await page.screenshot({ path: join(OUT, `${name}-1-basin.png`) });
  for (const [id, want] of [['furnace', 'pink-violet'], ['mire', 'brown']]) {
    const p = await page.evaluate((id) => window.__lancer.screen(id), id);
    const half = options.hasTouch ? 14 : 28; // about the cloud's size at this zoom
    await layers(page, { nebula: true, dust: true });
    await page.waitForTimeout(150);
    const on = await mean(page, p[0], p[1], half);
    await layers(page, { nebula: false, dust: false });
    await page.waitForTimeout(150);
    const off = await mean(page, p[0], p[1], half);
    await layers(page, { nebula: true, dust: true });
    const add = on.map((v, i) => v - off[i]);
    const hue = want === 'brown' ? add[0] > add[1] && add[1] > add[2] : add[0] > add[1] && add[2] > add[1];
    check(`the ${id === 'furnace' ? "Furnace's nebula" : "Mire's dust"} shows from the Basin, ${want}`, Math.max(...add) > 4 && hue, `adds ${fmt(add)} (r, g, b) on average`);
  }

  // The dust dims the Mire's stars, seen from the region.
  await page.evaluate(() => window.__lancer.focus('mire'));
  await settle(page);
  const mireStar = await page.evaluate(() => window.__lancer.brightestIn('mire'));
  await layers(page, { dust: false });
  await page.waitForTimeout(150);
  const clear = await peak(page, mireStar[0], mireStar[1]);
  await layers(page, { dust: true });
  await page.waitForTimeout(150);
  const dusty = await peak(page, mireStar[0], mireStar[1]);
  check("the dust dims the Mire's stars", dusty < clear * 0.9, `brightest Mire star ${clear} → ${dusty}`);
  await page.screenshot({ path: join(OUT, `${name}-2-mire.png`) });

  // Inside the Furnace: the nebula must not fill the screen.
  await page.evaluate(() => window.__lancer.focus(window.__lancer.view.targets.has('crucible-system') ? 'crucible-system' : [...window.__lancer.view.targets.keys()].find((k) => k.endsWith('-system') && window.__lancer.view.targets.get(k).parentId === 'furnace')));
  await settle(page);
  const { width, height } = page.viewportSize();
  const inside = await mean(page, width / 2, height / 2, Math.min(width, height) / 2 - 1);
  check('inside a Furnace system the nebula does not fill the screen', Math.max(...inside) < 25, `screen average ${fmt(inside)}`);
  await page.screenshot({ path: join(OUT, `${name}-3-furnace-system.png`) });

  // Icons, from the regions that have them; then a click on one.
  for (const region of ['hollows', 'boneyard', 'orrery']) {
    await page.evaluate((id) => window.__lancer.focus(id), region);
    await settle(page);
    const ids = await page.evaluate((r) => [...window.__lancer.view.targets].filter(([, t]) => t.parentId === r).map(([id]) => id).filter((id) => window.__lancer.centerOf(id) !== 'star'), region);
    const seen = [];
    for (const id of ids) {
      const p = await page.evaluate((i) => window.__lancer.screen(i), id);
      if (p && p[0] > 8 && p[0] < width - 8 && p[1] > 8 && p[1] < height - 8) seen.push((await peak(page, p[0], p[1], 7)) > 80);
    }
    check(`${region}: every center icon on screen is drawn`, seen.length > 0 && seen.every(Boolean), `${seen.filter(Boolean).length} of ${seen.length} on screen`);
    await page.screenshot({ path: join(OUT, `${name}-4-${region}.png`) });
  }
  await page.evaluate(() => window.__lancer.focus('hollows'));
  await settle(page);
  const g = await page.evaluate(() => window.__lancer.screen('gelid-system'));
  if (options.hasTouch) await page.touchscreen.tap(g[0], g[1]); else await page.mouse.click(g[0], g[1]);
  await page.waitForTimeout(100);
  await settle(page);
  const focus = await page.evaluate(() => window.__lancer.view.rig.focusId);
  check('a click on a rogue planet icon flies to its system', focus === 'gelid-system', focus);
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.close();
}

mkdirSync(OUT, { recursive: true });
const server = await createServer({ logLevel: 'error', server: { port: 5195, strictPort: true } });
await server.listen();
const base = 'http://localhost:5195/';
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
