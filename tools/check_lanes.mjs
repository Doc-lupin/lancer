// Lanes check (task 2.7).
//
//   node tools/check_lanes.mjs [--out DIR]
//
// Starts Vite, opens the map in headless Chromium (desktop and Pixel 7) and
// checks:
//   - all 37 lanes are drawn: 31 whole and 6 drifting ones in 18 dashes each,
//     plus 3 chevrons on each of the 9 one-way lanes, in two draw calls;
//   - lanes are faint by default; the button and the L key step them to
//     bright (lanes mode, with labels) and off (not drawn at all), then back;
//   - on the clock's date (5029u day 300) the five Lantern-tide lanes are open,
//     with 9 more days, and drawn in the open style;
//   - lanes show on screen, from the Basin and from inside a system, where one
//     end is beside the camera and the other light-years away;
//   - no page errors.
// Pixels are read from screenshots. Uses the Playwright installed with the
// environment.

import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const outArg = process.argv.indexOf('--out');
const OUT = resolve(outArg > 0 ? process.argv[outArg + 1] : join(tmpdir(), 'lancer-lanes'));

const results = [];
function check(name, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

// The brightest channel of a 1 × 1 px screenshot (a one-pixel PNG needs no
// unfiltering: every filter leaves the first pixel as it is).
async function pixel(page, x, y) {
  const png = await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 } });
  const chunks = [];
  for (let i = 8; i < png.length;) {
    const len = png.readUInt32BE(i);
    if (png.toString('ascii', i + 4, i + 8) === 'IDAT') chunks.push(png.subarray(i + 8, i + 8 + len));
    i += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  return Math.max(raw[1], raw[2], raw[3]);
}

// Brightest pixel across a short line through (x, y), to catch a 1–2 px lane.
async function brightness(page, x, y) {
  let best = 0;
  for (let d = -3; d <= 3; d++) best = Math.max(best, await pixel(page, x + d, y), await pixel(page, x, y + d));
  return best;
}

// A point on lane `id` at fraction t, in screen pixels, from the page's camera.
const laneScreen = (page, id, t) => page.evaluate(([id, t]) => window.__lancer.laneScreen(id, t), [id, t]);

async function settle(page) {
  await page.waitForFunction(() => !window.__lancer.view.rig.fly, null, { timeout: 10000 });
  await page.waitForTimeout(200);
}

async function run(browser, base, name, options) {
  console.log(`\n${name}`);
  const page = await browser.newPage(options);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base);
  await page.waitForFunction(() => window.__lancer?.view.rig?.camera, null, { timeout: 15000 });
  await page.waitForTimeout(400);

  const counts = await page.evaluate(() => {
    const lanes = window.__lancer.scene.children.filter((o) => o.userData.layer === 'lanes');
    const [strips, marks] = lanes;
    return { meshes: lanes.filter((o) => o.visible).length, pieces: strips.geometry.instanceCount, marks: marks.geometry.instanceCount, calls: window.__lancer.render().calls };
  });
  check('37 lanes: 31 whole + 6 drifting × 18 dashes, 9 one-way × 3 chevrons', counts.pieces === 31 + 6 * 18 && counts.marks === 27, `${counts.pieces} pieces, ${counts.marks} chevrons`);
  check('lanes in two instanced meshes (one draw call each)', counts.meshes === 2, `${counts.meshes} meshes; ${counts.calls} calls in all`);

  const mid = await laneScreen(page, 'ostrom-tallis', 0.5);
  const faint = await brightness(page, mid[0], mid[1]);
  const toggle = page.locator('button[data-lanes]');
  check('lanes start faint', (await toggle.getAttribute('data-lanes')) === 'faint');
  check('no lane labels outside lanes mode', (await page.locator('[data-lane]').count()) === 0);
  await toggle.click();
  await page.waitForTimeout(300);
  const bright = await brightness(page, mid[0], mid[1]);
  check('lanes are faint by default and bright in lanes mode', faint > 15 && bright > 2.5 * faint, `Ostrom–Tallis at mid-lane: ${faint} → ${bright}`);
  check('one press makes them bright', (await toggle.getAttribute('data-lanes')) === 'bright');
  const shownLabels = await page.evaluate(() => [...document.querySelectorAll('[data-lane]')].filter((e) => e.style.opacity === '1').length);
  check('lane labels appear in lanes mode', shownLabels >= (options.hasTouch ? 4 : 15), `${shownLabels} of 37 shown at the Basin level`);
  await page.screenshot({ path: join(OUT, `${name}-1-lanes-mode.png`) });

  const tide = await page.evaluate(() => {
    const el = document.querySelector('[data-lane="orison-gloam"] [data-full]');
    return el.textContent;
  });
  check('the Orison tide reads open, 9 more days', tide.includes('tide open, 9 more days'), tide);
  const openStyle = await page.evaluate(() => {
    const strips = window.__lancer.scene.children.find((o) => o.userData.layer === 'lanes');
    const c = strips.geometry.attributes.aColor;
    const teal = [];
    // The open style's #79e3d2, as display values (src/views/color.js), at full strength.
    const want = [0x79, 0xe3, 0xd2].map((v) => v / 255);
    for (let i = 0; i < c.count; i++) if (Math.abs(c.getX(i) - want[0]) < 0.01 && Math.abs(c.getY(i) - want[1]) < 0.01 && Math.abs(c.getZ(i) - want[2]) < 0.01 && c.getW(i) === 1) teal.push(i);
    return teal.length;
  });
  check('five tidal lanes drawn open (teal, full strength)', openStyle === 5, `${openStyle} pieces`);

  if (!options.hasTouch) {
    await page.keyboard.press('l');
    await page.waitForTimeout(300);
    const off = await brightness(page, mid[0], mid[1]);
    const meshes = await page.evaluate(() => window.__lancer.scene.children.filter((o) => o.userData.layer === 'lanes' && o.visible).length);
    check('the L key turns them off: nothing drawn', (await toggle.getAttribute('data-lanes')) === 'off' && meshes === 0 && off < faint, `${meshes} lane meshes showing; mid-lane ${off} (faint was ${faint})`);
    await page.keyboard.press('l');
    await page.waitForTimeout(300);
    check('and once more back to faint', (await toggle.getAttribute('data-lanes')) === 'faint');
    await page.keyboard.press('l');
    await page.waitForTimeout(300);
  }

  // Inside the Tallis system: the lane to Ostrom starts at the star beside the camera.
  await page.evaluate(() => window.__lancer.focus('tallis-system'));
  await settle(page);
  await page.screenshot({ path: join(OUT, `${name}-2-tallis-system.png`) });
  const { width, height } = page.viewportSize();
  let seen = null;
  // The lane runs Ostrom → Tallis, so the Tallis end is t = 1.
  for (const t of [1e-6, 3e-6, 1e-5, 3e-5, 1e-4, 3e-4, 1e-3, 3e-3, 1e-2].map((x) => 1 - x)) {
    const p = await laneScreen(page, 'ostrom-tallis', t);
    if (!p || p[0] < 10 || p[0] > width - 10 || p[1] < 10 || p[1] > height - 10) continue;
    if (Math.hypot(p[0] - width / 2, p[1] - height / 2) < 30) continue; // too close to the star's glow
    seen = { t, p, v: await brightness(page, p[0], p[1]) };
    break;
  }
  check('from inside the Tallis system the lane to Ostrom is drawn', seen && seen.v > 60, seen ? `at t = ${seen.t}: ${seen.v}` : 'no point on screen');
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.close();
}

mkdirSync(OUT, { recursive: true });
const server = await createServer({ logLevel: 'error', server: { port: 5196, strictPort: true } });
await server.listen();
const base = 'http://localhost:5196/';
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
