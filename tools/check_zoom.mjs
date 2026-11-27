// The Phase 2 test (task 2.11): zoom Basin → planet and back without a break;
// no shaking; smooth on a phone.
//
//   node tools/check_zoom.mjs [--out DIR]
//
// Runs the real app in headless Chromium on a 1280 × 800 desktop window and on
// Pixel 7 emulation with the CPU slowed 4× (decision P10), along the path
//   Basin → Tallis (region) → Tallis system → Tallis (planet, with its moons)
//   → Tallis close up (its globe and places) → Tallis relay (a station)
// and then back out to the Basin with the mouse wheel, one notch at a time.
//
//   Without a break  Every frame of the way is logged. The camera's distance
//                    and target must change smoothly: in per-second terms,
//                    the distance by at most 60 e-folds a second and the
//                    target by at most 40 distances a second (a flight peaks
//                    near 25 and 10; a jump would be thousands). No frame may
//                    be blank, and the scene is never rebuilt.
//   No shaking       At each stop: two frames with nothing changed are
//                    pixel-identical; and while the camera circles slowly,
//                    the focus stays within 0.5 px of the screen center, by
//                    the camera's own numbers and by the pixels drawn.
//   Smooth           This browser draws in software, so its frame rate says
//                    nothing about a phone's graphics chip. Measured here: our
//                    own work per frame on the CPU, which must leave room in a
//                    30 fps frame (33 ms). Phase 2 set it under 8 ms on desktop
//                    and under 11 ms with the CPU slowed 4×, on the machine of
//                    that test. Since decision BQ2 (docs/PHASE_B0.md) each stop
//                    is compared with the Phase 2 reference instead: at most
//                    1.5× its mean + 0.5 ms, scaled by machine speed
//                    (machineMs in tools/views.mjs). The reference is
//                    docs/section-b/baseline/phase2/zoom.json, recorded on main
//                    with --record-ref FILE; without it, the fixed limits. The software frame rate is logged
//                    for reference. Smoothness on a real phone is for the GM.
// Screenshots of each stop go to --out.

import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { offsetKm } from '../src/views/origin.js';
import { machineMs } from './views.mjs';

const require = createRequire(import.meta.url);
// Decision BD13: the map is for computers only. --phone also runs the phone
// (Pixel 7) emulation of Phase 2.
const PHONE = process.argv.includes('--phone');
const { chromium, devices } = require('playwright');
const outArg = process.argv.indexOf('--out');
const OUT = resolve(outArg > 0 ? process.argv[outArg + 1] : join(tmpdir(), 'lancer-zoom'));
const recArg = process.argv.indexOf('--record-ref');
const RECORD = recArg > 0 ? resolve(process.argv[recArg + 1]) : null;
const REF_FILE = new URL('../docs/section-b/baseline/phase2/zoom.json', import.meta.url);
const REF = !RECORD && existsSync(REF_FILE) ? JSON.parse(readFileSync(REF_FILE, 'utf8')) : null;
let scale = 1; // machine speed here against the reference's

const results = [];
function check(name, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

function decode(png) {
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
  return { width, height, bpp, px: out };
}

// Brightness-weighted center of the bright pixels in a small box at the screen center.
async function centroid(page, half) {
  const { width, height } = page.viewportSize();
  const png = await page.screenshot({ clip: { x: width / 2 - half, y: height / 2 - half, width: 2 * half, height: 2 * half } });
  const img = decode(png);
  let sx = 0, sy = 0, sw = 0, n = 0;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const k = (y * img.width + x) * img.bpp;
    const v = Math.max(img.px[k], img.px[k + 1], img.px[k + 2]);
    if (v > 50) { sx += (x + 0.5) * v; sy += (y + 0.5) * v; sw += v; n++; }
  }
  // At least 4 bright pixels: one faint background dot crossing the threshold
  // is not the focus object (it moved the 'center' by 2 px at the Tallis
  // relay, which draws nothing bright at the center; task B0.4).
  return n >= 4 ? [sx / sw - img.width / 2, sy / sw - img.height / 2] : null;
}

const ev = (page, fn, arg) => page.evaluate(fn, arg);
async function settle(page) {
  await page.waitForFunction(() => !window.__lancer.view.rig.fly, null, { timeout: 15000 });
  await page.waitForTimeout(300);
}

// Smoothness of a logged stretch of frames: largest rates of change.
function rates(frames) {
  let dLog = 0, dTarget = 0, blank = 0, rebuilt = 0, worstJump = null;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1], b = frames[i];
    const dt = Math.max(1e-3, (b.t - a.t) / 1000);
    dLog = Math.max(dLog, Math.abs(Math.log(b.distance / a.distance)) / dt);
    dTarget = Math.max(dTarget, Math.hypot(...offsetKm(a.target, b.target)) / Math.min(a.distance, b.distance) / dt);
    if (b.lastCalls === 0) blank++;
    if (b.layers !== frames[0].layers) rebuilt++;
    const jump = Math.hypot(...offsetKm(a.target, b.target)) / Math.min(a.distance, b.distance) / dt;
    if (!worstJump || jump > worstJump.jump) worstJump = { i, of: frames.length, from: a.focus, to: b.focus, jump, da: a.distance, db: b.distance, dt, ta: a.target, tb: b.target };
  }
  if (worstJump) console.log('  largest target jump:', JSON.stringify(worstJump));
  return { dLog, dTarget, blank, rebuilt, frames: frames.length };
}

const PATH = [
  { label: 'Tallis (region)', go: (p) => ev(p, () => window.__lancer.focus('tallis')), small: false },
  { label: 'Tallis system', go: (p) => ev(p, () => window.__lancer.focus('tallis-system')), small: true },
  { label: 'Tallis (planet)', go: (p) => ev(p, () => window.__lancer.focus('tallis-planet')), small: true },
  { label: 'Tallis close up', go: (p) => ev(p, () => window.__lancer.focusAt('tallis-planet', window.__lancer.view.targets.get('tallis-planet').closeKm)), small: false },
  { label: 'Tallis relay (station)', go: (p) => ev(p, () => window.__lancer.focus('tallis-relay')), small: true },
];

async function stopChecks(page, label, small) {
  // Still: two frames with nothing changed are identical.
  await ev(page, () => window.__lancer.invalidate());
  // (Label and hint fades are CSS transitions: the screenshots finish them, so
  // a label still fading in after the flight doesn't count as a change.)
  await page.waitForTimeout(120);
  const a = await page.screenshot({ animations: 'disabled' });
  await ev(page, () => window.__lancer.invalidate());
  await page.waitForTimeout(120);
  const b = await page.screenshot({ animations: 'disabled' });
  const still = Buffer.compare(a, b) === 0;

  // Circling slowly: the focus stays at the center.
  await ev(page, () => document.querySelectorAll('[data-place],[data-body],[data-region],[data-lane]').forEach((e) => { e.style.visibility = 'hidden'; }));
  const { width, height } = page.viewportSize();
  let mathOff = 0, pixOff = 0, pixFirst = null;
  for (let i = 0; i < 12; i++) {
    const s = await ev(page, () => {
      const r = window.__lancer.view.rig;
      r.yaw += 0.004;
      window.__lancer.invalidate();
      return window.__lancer.screen(r.focusId);
    });
    await page.waitForTimeout(60);
    mathOff = Math.max(mathOff, Math.hypot(s[0] - width / 2, s[1] - height / 2));
    if (small) {
      const c = await centroid(page, 7); // just the focus object, not its neighbours
      if (c) { pixFirst ??= c; pixOff = Math.max(pixOff, Math.hypot(c[0] - pixFirst[0], c[1] - pixFirst[1])); }
    }
  }
  await ev(page, () => document.querySelectorAll('[data-place],[data-body],[data-region],[data-lane]').forEach((e) => { e.style.visibility = ''; }));
  check(`${label}: no shaking`, still && mathOff < 0.5 && pixOff < 0.75,
    `still frames identical: ${still}; focus off center ${mathOff.toFixed(3)} px${small ? `, drawn center moved ${pixOff.toFixed(2)} px` : ''} while circling`);

  // Our own work per frame, over 30 frames with the camera turning.
  await ev(page, () => window.__lancer.startRecording());
  const t0 = Date.now();
  for (let i = 0; i < 30; i++) {
    await ev(page, () => { window.__lancer.view.rig.yaw += 0.002; window.__lancer.invalidate(); return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
  }
  const frames = await ev(page, () => window.__lancer.frames());
  const work = frames.map((f) => f.workMs).sort((x, y) => x - y);
  const fps = frames.length / ((Date.now() - t0) / 1000);
  return { label, mean: work.reduce((s, v) => s + v, 0) / work.length, p95: work[Math.floor(work.length * 0.95)], fps };
}

async function run(browser, base, name, options, throttle) {
  console.log(`\n${name}${throttle > 1 ? ` (CPU slowed ${throttle}×)` : ''}`);
  const page = await browser.newPage(options);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (throttle > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  }
  await page.goto(base);
  await page.waitForFunction(() => window.__lancer?.view.rig?.camera, null, { timeout: 60000 });
  await page.waitForTimeout(500);
  const shots = [];
  const perf = [];
  const shoot = async (label) => {
    const file = join(OUT, `${name}-${shots.length}.png`);
    await page.screenshot({ path: file });
    shots.push({ file, label });
  };
  await shoot('Basin');
  perf.push(await stopChecks(page, 'Basin', false));

  // Down: log every frame of every flight.
  await ev(page, () => window.__lancer.startRecording());
  for (const stop of PATH) {
    await stop.go(page);
    await settle(page);
    const down = await ev(page, () => window.__lancer.frames());
    await shoot(stop.label);
    perf.push(await stopChecks(page, stop.label, stop.small));
    await ev(page, (keep) => { window.__lancer.startRecording(); window.__lancer.frames().push(...keep); }, down.slice(-1));
    stop.frames = down;
  }
  const downFrames = PATH.flatMap((s) => s.frames);
  const d = rates(downFrames);
  check('down, Basin → station: without a break', d.dLog < 60 && d.dTarget < 40 && d.blank === 0 && d.rebuilt === 0,
    `${d.frames} frames; distance changes at most ${d.dLog.toFixed(1)} e-folds/s, target ${d.dTarget.toFixed(1)} distances/s; ${d.blank} blank, scene rebuilt ${d.rebuilt}×`);
  const focusPath = [...new Set(downFrames.map((f) => f.focus))];
  check('down: the focus passes through every level', ['tallis', 'tallis-system', 'tallis-planet', 'tallis-relay'].every((id) => focusPath.includes(id)), focusPath.join(' → '));

  // Back up: one wheel notch at a time, to the outer limit.
  const { width, height } = page.viewportSize();
  await page.mouse.move(width / 2, height / 2);
  await ev(page, () => window.__lancer.startRecording());
  const climbed = [];
  for (let i = 0; i < 250; i++) {
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(25);
    const s = await ev(page, () => ({ f: window.__lancer.view.rig.focusId, d: window.__lancer.view.rig.distance }));
    if (climbed.at(-1) !== s.f) climbed.push(s.f);
    if (s.f === 'basin' && i > 5 && s.d > 1e15) break;
  }
  await settle(page);
  const up = rates(await ev(page, () => window.__lancer.frames()));
  check('up, station → Basin with the wheel: without a break', up.dLog < 60 && up.dTarget < 40 && up.blank === 0 && up.rebuilt === 0,
    `${up.frames} frames; distance at most ${up.dLog.toFixed(1)} e-folds/s, target ${up.dTarget.toFixed(1)} distances/s; ${up.blank} blank`);
  check('up: the focus climbs back to the Basin', climbed.at(-1) === 'basin', climbed.join(' → '));
  await shoot('Back at the Basin');

  console.log('\n  stop                       our work per frame (mean / 95th pct)   software frames/s');
  for (const p of perf) console.log(`  ${p.label.padEnd(26)} ${p.mean.toFixed(2).padStart(6)} / ${p.p95.toFixed(2).padStart(6)} ms ${''.padStart(20)}${p.fps.toFixed(1).padStart(6)}`);
  const ref = REF?.[name];
  if (ref) {
    const over = perf.map((p) => ({ ...p, limit: ((ref.stops[p.label] ?? Infinity) * 1.5 + 0.5) * scale })).filter((p) => p.mean > p.limit);
    check('our work per frame within 1.5× the Phase 2 reference + 0.5 ms at every stop (scaled by machine speed)', over.length === 0,
      over.length ? over.map((p) => `${p.label} ${p.mean.toFixed(2)} > ${p.limit.toFixed(2)} ms`).join('; ') : `machine ×${scale.toFixed(2)}; worst mean ${Math.max(...perf.map((p) => p.mean)).toFixed(2)} ms`);
  } else {
    const limit = throttle > 1 ? 11 : 8;
    const worst = Math.max(...perf.map((p) => p.mean));
    check(`our work per frame under ${limit} ms at every stop (no reference: fixed limit)`, worst < limit, `worst mean ${worst.toFixed(2)} ms`);
  }
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.close();
  return { shots, perf };
}

async function contactSheet(browser, all) {
  const cells = all.map((s) => `<figure><img src="file://${s.file}"><figcaption>${s.label}</figcaption></figure>`).join('');
  writeFileSync(join(OUT, 'sheet.html'), `<html><body style="margin:0;background:#111;color:#ccc;font:14px system-ui;padding:12px">
<style>main{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}figure{margin:0}img{width:100%;display:block}figcaption{padding:4px 0}</style><main>${cells}</main></body></html>`);
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await page.goto(`file://${join(OUT, 'sheet.html')}`);
  await page.screenshot({ path: join(OUT, 'sheet.png'), fullPage: true });
  await page.close();
}

mkdirSync(OUT, { recursive: true });
const server = await createServer({ logLevel: 'error', server: { port: 5192, strictPort: true } });
await server.listen();
const base = 'http://localhost:5192/';
const browser = await chromium.launch();
try {
  const warm = await browser.newPage();
  await warm.goto(base);
  await warm.waitForTimeout(3000);
  await warm.close();
  const here = await machineMs({ browser });
  if (REF) scale = here / REF.machineMs;
  console.log(`machine: ${here} ms${REF ? `, reference ${REF.machineMs} ms (×${scale.toFixed(2)})` : RECORD ? '' : ', no reference: fixed limits'}\n`);
  const desk = await run(browser, base, 'desktop', { viewport: { width: 1280, height: 800 } }, 1);
  const phone = PHONE ? await run(browser, base, 'phone', devices['Pixel 7'], 4) : null;
  if (RECORD) {
    const stops = (perf) => Object.fromEntries(perf.map((p) => [p.label, +p.mean.toFixed(2)]));
    writeFileSync(RECORD, `${JSON.stringify({ recorded: new Date().toISOString().slice(0, 10), machineMs: here, desktop: { stops: stops(desk.perf) }, ...(phone && { phone: { stops: stops(phone.perf) } }) }, null, 1)}\n`);
    console.log(`Reference written: ${RECORD}`);
  }
  await contactSheet(browser, desk.shots);
  console.log(`\nScreenshots: ${OUT}`);
} finally {
  await browser.close();
  await server.close();
}
const pass = results.every(Boolean);
console.log(pass ? `\nPASS: ${results.length} checks` : `\nFAIL: ${results.filter((r) => !r).length} of ${results.length} checks`);
process.exit(pass ? 0 : 1);
