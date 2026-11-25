// Stars and region labels check (task 2.6).
//
//   node tools/check_stars.mjs [--out DIR]
//
// Starts Vite, opens the map in headless Chromium on a desktop window and on
// Pixel 7 emulation, and checks:
//   - every star-centered system is drawn, in two draw calls in all;
//   - region labels: at least 12 px text, none overlapping; at the Basin level
//     at least 20 of 24 shown on desktop, 16 on the phone (22 after zooming 2×);
//   - clicking a region's label flies to the region, and clicking a star there
//     flies to its system;
//   - no page errors.
// Screenshots go to --out. Uses the Playwright installed with the environment.

import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const outArg = process.argv.indexOf('--out');
const OUT = resolve(outArg > 0 ? process.argv[outArg + 1] : join(tmpdir(), 'lancer-stars'));

const results = [];
function check(name, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function settle(page) {
  await page.waitForFunction(() => !window.__lancer.view.rig.fly, null, { timeout: 10000 });
  await page.waitForTimeout(150);
}

async function labels(page) {
  return page.evaluate(() => [...document.querySelectorAll('button[data-region]')].map((b) => {
    const r = b.getBoundingClientRect();
    return { text: b.children[0].textContent, shown: +b.style.opacity > 0, px: parseFloat(getComputedStyle(b).fontSize), box: [r.left, r.top, r.right, r.bottom] };
  }));
}

async function run(browser, base, name, options) {
  console.log(`\n${name}`);
  const page = await browser.newPage(options);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base);
  await page.waitForFunction(() => window.__lancer?.view.rig?.camera, null, { timeout: 15000 });
  await page.waitForTimeout(400);

  const info = await page.evaluate(() => {
    const meshes = window.__lancer.scene.children.filter((o) => o.userData.layer === 'stars');
    return { calls: window.__lancer.render().calls, counts: meshes.map((m) => m.count), stars: window.__lancer.view.targets.size };
  });
  // Two instanced meshes, one draw call each. (Lanes, icons and effects add their own.)
  check('all 144 star systems drawn in two draw calls', info.counts.length === 2 && info.counts.every((c) => c === 144), `2 star meshes, instances ${info.counts.join(' + ')}; ${info.calls} calls in all`);

  const ls = await labels(page);
  const shown = ls.filter((l) => l.shown);
  const overlaps = [];
  for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) {
    const a = shown[i].box, b = shown[j].box;
    if (a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]) overlaps.push(`${shown[i].text}/${shown[j].text}`);
  }
  check('region labels are at least 12 px', shown.every((l) => l.px >= 12), `names ${Math.min(...shown.map((l) => l.px))} px`);
  check('no two shown labels overlap', overlaps.length === 0, overlaps.join(', '));
  const hiddenNames = (list) => list.filter((l) => !l.shown).map((l) => l.text).join(', ') || 'none';
  if (!options.hasTouch) {
    check('at least 20 of 24 region labels shown at the Basin level', shown.length >= 20, `${shown.length}; hidden: ${hiddenNames(ls)}`);
  } else {
    // The whole Basin is 412 px wide on this phone, so not every label fits at once.
    check('at least 16 of 24 region labels shown at the Basin level', shown.length >= 16, `${shown.length}; hidden: ${hiddenNames(ls)}`);
    await page.evaluate(() => { const r = window.__lancer.view.rig; r.distance /= 2; window.__lancer.invalidate(); });
    await page.waitForTimeout(300);
    const zoomed = await labels(page);
    check('  … and at least 22 after zooming in 2×', zoomed.filter((l) => l.shown).length >= 22, `${zoomed.filter((l) => l.shown).length}; hidden: ${hiddenNames(zoomed)}`);
    await page.screenshot({ path: join(OUT, `${name}-1b-basin-zoomed.png`) });
    await page.evaluate(() => { const r = window.__lancer.view.rig; r.distance *= 2; window.__lancer.invalidate(); });
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: join(OUT, `${name}-1-basin.png`) });

  // Fly to Tallis by its label, then to the Tallis system by its star.
  const tallis = ls.find((l) => l.text === 'Tallis' && l.shown);
  check('the Tallis label is shown', !!tallis);
  if (!tallis) { await page.close(); return; }
  const tap = async (x, y) => (options.hasTouch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
  await tap((tallis.box[0] + tallis.box[2]) / 2, (tallis.box[1] + tallis.box[3]) / 2);
  await page.waitForTimeout(100);
  await settle(page);
  let focus = await page.evaluate(() => window.__lancer.view.rig.focusId);
  check('clicking the Tallis label flies to the region', focus === 'tallis', focus);
  await page.screenshot({ path: join(OUT, `${name}-2-tallis.png`) });

  const screen = await page.evaluate(() => window.__lancer.screen('tallis-system'));
  await tap(screen[0], screen[1]);
  await page.waitForTimeout(100);
  await settle(page);
  focus = await page.evaluate(() => window.__lancer.view.rig.focusId);
  check('clicking the Tallis star flies to its system', focus === 'tallis-system', focus);
  await page.screenshot({ path: join(OUT, `${name}-3-tallis-system.png`) });
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.close();
}

mkdirSync(OUT, { recursive: true });
const server = await createServer({ logLevel: 'error', server: { port: 5197, strictPort: true } });
await server.listen();
const base = 'http://localhost:5197/';
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
