// Camera controls check (task 2.5).
//
//   node tools/check_camera.mjs [--out DIR]
//
// Starts Vite, opens ?test=camera in headless Chromium and drives the camera
// with real input events (mouse wheel, clicks, drags; on a phone, taps,
// one-finger drags and two-finger pinches). Checks:
//   - wheel zoom (notches 100 ms apart, slower than a fast spin) changes the distance by the same ratio per notch at every
//     scale, and zooming in over an object inside the focus makes it the focus,
//     so the Basin → star → planet → station descent is one continuous zoom;
//   - zooming out climbs station → planet → star → Basin;
//   - a click or tap flies to the object and ends exactly on it, never passing
//     it and never coming closer than the end distance;
//   - a drag orbits without counting as a click; a pinch zooms by the ratio of
//     the finger spread.
// Screenshots of the four levels go to --out. Uses the Playwright installed
// with the environment (decision P9).

import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { offsetKm, KM_PER_AU, KM_PER_LY } from '../src/views/origin.js';
import { WHEEL_STEP, MAX_DISTANCE_KM } from '../src/views/camera/rig.js';

const require = createRequire(import.meta.url);
// Decision BD13: the map is for computers only. --phone also runs the phone
// (Pixel 7) emulation of Phase 2.
const PHONE = process.argv.includes('--phone');
const { chromium, devices } = require('playwright');
const outArg = process.argv.indexOf('--out');
const OUT = resolve(outArg > 0 ? process.argv[outArg + 1] : join(tmpdir(), 'lancer-camera'));

const results = [];
function check(name, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}
const fmt = (km) => (km > 0.05 * KM_PER_LY ? `${(km / KM_PER_LY).toPrecision(3)} ly` : km > 1e7 ? `${(km / KM_PER_AU).toPrecision(3)} AU` : `${km.toPrecision(3)} km`);

const state = (page) => page.evaluate(() => window.__camera.state());
const screen = (page, id) => page.evaluate((i) => window.__camera.screen(i), id);
async function settle(page) {
  await page.waitForFunction(() => !window.__camera.state().flying, null, { timeout: 10000 });
  await page.waitForTimeout(50);
}

// Orbit with 60 px mouse drags until `id` is on screen, as a user would.
async function bringIntoView(page, id) {
  const { width, height } = page.viewportSize();
  for (let i = 0; i < 12; i++) {
    const p = await screen(page, id);
    if (p && p[0] > 40 && p[0] < width - 40 && p[1] > 40 && p[1] < height - 40) return i;
    await page.mouse.move(width / 2, height / 2);
    await page.mouse.down();
    await page.mouse.move(width / 2 + 60, height / 2, { steps: 3 });
    await page.mouse.up();
    await page.waitForTimeout(30);
  }
  return -1;
}

// Spin the wheel in, with the pointer over `id`, until the focus is `id` and
// the distance is at most `untilKm`. Returns the notches used and whether every
// notch changed the distance by the wheel ratio.
async function wheelInto(page, id, untilKm) {
  const drags = await bringIntoView(page, id);
  if (drags > 0) console.log(`     (orbited ${drags * 60} px to bring the ${id} into view)`);
  const p = await screen(page, id);
  await page.mouse.move(p[0], p[1]);
  let notches = 0, steady = true, prev = (await state(page)).distance;
  for (; notches < 200; ) {
    await page.mouse.wheel(0, -100);
    notches++;
    // Slower than a fast spin (notches under 90 ms apart zoom faster, rig.js).
    await page.waitForTimeout(100);
    const s = await state(page);
    const ratio = prev / s.distance;
    const atLimit = Math.abs(s.distance - untilKm) < 1e-9; // the last notch stops at the closest distance
    if (!atLimit && Math.abs(ratio - WHEEL_STEP) > 1e-6 && Math.abs(ratio - 1) > 1e-9) steady = false;
    prev = s.distance;
    if (s.focus === id && s.distance <= untilKm) break;
    if (Math.abs(ratio - 1) < 1e-12) break; // reached the closest distance
  }
  await settle(page);
  return { notches, steady, state: await state(page) };
}

// Click (or tap) on `id` and record every frame of the flight.
async function flyTo(page, id, tap = false) {
  if (!tap) await bringIntoView(page, id);
  const p = await screen(page, id);
  const before = await state(page);
  await page.evaluate(() => window.__camera.record());
  if (tap) await page.touchscreen.tap(p[0], p[1]);
  else await page.mouse.click(p[0], p[1]);
  await page.waitForTimeout(50);
  await settle(page);
  const frames = await page.evaluate(() => window.__camera.frames());
  const dest = await page.evaluate((i) => window.__camera.place(i), id);
  const after = await state(page);
  const v = offsetKm(before.target, dest);
  const len = Math.hypot(...v);
  let backwards = 0, passed = 0, tooClose = 0;
  const floor = Math.min(before.distance, after.distance);
  let prevAhead = Infinity;
  for (const f of frames) {
    const left = offsetKm(f.target, dest);
    const ahead = len ? (left[0] * v[0] + left[1] * v[1] + left[2] * v[2]) / len : 0;
    if (ahead > prevAhead + 1e-6 * len) backwards++;
    if (ahead < -1e-9 * len - 1e-9) passed++;
    if (f.distance < floor * (1 - 1e-9)) tooClose++;
    prevAhead = ahead;
  }
  const exact = JSON.stringify(after.target) === JSON.stringify(dest);
  return { frames: frames.length, backwards, passed, tooClose, exact, before, after };
}

async function desktop(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}?test=camera`);
  await page.waitForFunction(() => window.__camera?.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, '1-basin.png') });
  console.log('\nDesktop (1280 × 800)');

  // One continuous zoom down the levels, moving the pointer onto the next object.
  const legs = [['star', 3 * KM_PER_AU, '2-star'], ['planet', 30000, '3-planet'], ['station', 0.4, '4-station']];
  let total = 0;
  for (const [id, until, shot] of legs) {
    const r = await wheelInto(page, id, until);
    total += r.notches;
    check(`wheel in over the ${id} makes it the focus`, r.state.focus === id, `${r.notches} notches, now ${fmt(r.state.distance)}`);
    check(`every notch zooms by ${WHEEL_STEP}× (zooming in towards the ${id})`, r.steady);
    await page.screenshot({ path: join(OUT, `${shot}.png`) });
  }
  check('Basin to station in one continuous zoom', (await state(page)).focus === 'station', `${total} notches in all`);

  // Drag: orbit, not a click.
  const s0 = await state(page);
  await page.mouse.move(640, 400);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(640 + 20 * i, 400, { steps: 1 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  const s1 = await state(page);
  check('a 200 px drag orbits by 1 radian and does not count as a click', Math.abs(s0.yaw - s1.yaw - 1) < 1e-6 && s1.focus === s0.focus && !s1.flying, `yaw ${s0.yaw.toFixed(3)} → ${s1.yaw.toFixed(3)}`);

  // Zoom all the way out.
  const climbed = ['station'];
  for (let i = 0; i < 200 && (await state(page)).distance < MAX_DISTANCE_KM; i++) {
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(100);
    const f = (await state(page)).focus;
    if (climbed.at(-1) !== f) climbed.push(f);
  }
  await settle(page);
  check('zooming out climbs station → planet → star → Basin', climbed.join(' → ') === 'station → planet → star → basin', climbed.join(' → '));

  // Fly by clicking, one level at a time.
  for (const id of ['star', 'planet', 'station']) {
    const r = await flyTo(page, id);
    check(`click flies to the ${id} and ends exactly on it`, r.exact && r.after.focus === id, `${r.frames} frames, ${fmt(r.before.distance)} → ${fmt(r.after.distance)}`);
    check(`  … never moving back, passing it, or coming closer than the end distance`, !r.backwards && !r.passed && !r.tooClose, `backwards ${r.backwards}, passed ${r.passed}, too close ${r.tooClose}`);
  }
  // A long flight: zoom out until the far star shows, then click it (46 ly away).
  // (Zooming out leaves the star for the Basin sooner than it used to, so keep
  // going until the far star is on screen too.)
  const shows = async () => { const p = await screen(page, 'far-star'); return p && p[0] > 40 && p[0] < 1240 && p[1] > 40 && p[1] < 760; };
  for (let i = 0; i < 200 && ((await state(page)).focus !== 'basin' || !(await shows())); i++) {
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(100);
  }
  await settle(page);
  const r = await flyTo(page, 'far-star');
  check('click on the far star flies 46 ly and ends exactly on it', r.exact && !r.backwards && !r.passed && !r.tooClose, `${r.frames} frames, ${fmt(r.before.distance)} → ${fmt(r.after.distance)}`);
  check('no page errors (desktop)', errors.length === 0, errors.join('; '));
  await page.close();
}

async function phone(browser, base) {
  const page = await browser.newPage(devices['Pixel 7']);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}?test=camera`);
  await page.waitForFunction(() => window.__camera?.ready);
  await page.waitForTimeout(300);
  console.log('\nPhone (Pixel 7 emulation)');

  const r = await flyTo(page, 'star', true);
  check('tap flies to the star and ends exactly on it', r.exact && !r.backwards && !r.passed && !r.tooClose, `${fmt(r.before.distance)} → ${fmt(r.after.distance)}`);

  const cdp = await page.context().newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  async function pinch(from, to) {
    const cx = 206, cy = 420;
    await touch('touchStart', [[cx - from / 2, cy], [cx + from / 2, cy]]);
    for (let i = 1; i <= 10; i++) {
      const s = from + ((to - from) * i) / 10;
      await touch('touchMove', [[cx - s / 2, cy], [cx + s / 2, cy]]);
    }
    await touch('touchEnd', []);
    await page.waitForTimeout(100);
  }
  const a = await state(page);
  await pinch(100, 300);
  const b = await state(page);
  check('pinching the fingers 3× apart zooms in 3×', Math.abs(a.distance / b.distance - 3) < 0.05 && b.focus === a.focus, `${fmt(a.distance)} → ${fmt(b.distance)}`);
  await pinch(300, 100);
  const c = await state(page);
  check('pinching them back zooms out 3×', Math.abs(c.distance / b.distance - 3) < 0.05, `${fmt(b.distance)} → ${fmt(c.distance)}`);

  await touch('touchStart', [[150, 400]]);
  for (let i = 1; i <= 10; i++) await touch('touchMove', [[150 + 10 * i, 400]]);
  await touch('touchEnd', []);
  await page.waitForTimeout(100);
  const d = await state(page);
  check('a one-finger drag orbits and does not count as a tap', Math.abs(c.yaw - d.yaw - 0.5) < 1e-6 && !d.flying && d.focus === c.focus, `yaw ${c.yaw.toFixed(3)} → ${d.yaw.toFixed(3)}`);
  check('no page errors (phone)', errors.length === 0, errors.join('; '));
  await page.close();
}

async function contactSheet(browser) {
  const shots = [['1-basin', 'Basin'], ['2-star', 'Keel star'], ['3-planet', 'planet'], ['4-station', 'station']];
  const html = `<html><body style="margin:0;background:#111;color:#ccc;font:14px system-ui;padding:12px">
<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${shots.map(([f, l]) => `<figure style="margin:0"><img style="width:100%" src="file://${join(OUT, f)}.png"><figcaption>${l}</figcaption></figure>`).join('')}</div></body></html>`;
  writeFileSync(join(OUT, 'sheet.html'), html);
  const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  await page.goto(`file://${join(OUT, 'sheet.html')}`);
  await page.screenshot({ path: join(OUT, 'sheet.png'), fullPage: true });
  await page.close();
}

mkdirSync(OUT, { recursive: true });
const server = await createServer({ logLevel: 'error', server: { port: 5198, strictPort: true } });
await server.listen();
const base = 'http://localhost:5198/';
const browser = await chromium.launch();
try {
  const warm = await browser.newPage();
  await warm.goto(`${base}?test=camera`);
  await warm.waitForTimeout(3000);
  await warm.close();
  await desktop(browser, base);
  if (PHONE) await phone(browser, base);
  await contactSheet(browser);
  console.log(`\nScreenshots: ${OUT}`);
} finally {
  await browser.close();
  await server.close();
}
const pass = results.every(Boolean);
console.log(pass ? `\nPASS: ${results.length} checks` : `\nFAIL: ${results.filter((r) => !r).length} of ${results.length} checks`);
process.exit(pass ? 0 : 1);
