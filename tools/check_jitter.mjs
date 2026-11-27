// Precision test for the floating origin and depth buffer (task 2.4).
//
//   node tools/check_jitter.mjs [--out DIR]
//
// Starts the Vite dev server, opens ?test=precision in headless Chromium on a
// desktop window and a phone (Pixel 7 emulation), and zooms from 50 ly to
// 0.5 km above the test station in 17 steps. At each step the camera circles
// the station slowly for 20 frames.
//
// For every frame and every corner of every test object it compares two
// screen positions:
//   rendered:  the matrices the page sends to the GPU, multiplied the way the
//              GPU does it, in 32-bit floats;
//   reference: the exact position, worked out with whole-number arithmetic
//              from the same places and camera.
// Jitter is how far that difference changes from one frame to the next.
// It also counts red pixels, which appear only if depth fails (see
// src/views/PrecisionTest.jsx).
//
// A resolution sweep then shrinks the planet's layer gap, seen from about
// 40,000 km, to find where depth starts to fail. One step of a 24-bit
// logarithmic depth buffer with the far plane at 10^16 km is
// 2^-24 × ln 2 × log2(10^16) ≈ 2.2 millionths of the distance; the sweep
// shows where that lands in practice.
//
// Runs twice: with anchored places (the app's way, src/views/origin.js) and
// with plain km values, which is expected to fail up close.
// Pass: with anchored places, jitter at most 0.5 px and no red pixels at every
// step on both devices. Screenshots and a contact sheet go to --out.
// Uses the Playwright that is installed with the environment, not a package
// dependency (decision P9).

import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
// Decision BD13: the map is for computers only. --phone also runs the phone
// (Pixel 7) emulation of Phase 2.
const PHONE = process.argv.includes('--phone');
const { chromium, devices } = require('playwright');

const KM_PER_LY = 9.4607304725808e12;
const JITTER_LIMIT = 0.5;
const FRAMES = 20;
const outArg = process.argv.indexOf('--out');
const OUT = resolve(outArg > 0 ? process.argv[outArg + 1] : join(tmpdir(), 'lancer-precision'));

const STEPS = [];
for (let d = 50 * KM_PER_LY; d >= 4; d /= 10) STEPS.push(d);
STEPS.push(1, 0.5);

// ---- exact arithmetic: a number is a BigInt counting units of 2^-F km ----
const F = 200n;
function exact(x) {
  if (x === 0) return 0n;
  const v = new DataView(new ArrayBuffer(8));
  v.setFloat64(0, x);
  const hi = v.getUint32(0), lo = v.getUint32(4);
  const sign = hi >>> 31 ? -1n : 1n;
  const bits = (hi >>> 20) & 0x7ff;
  let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  let e;
  if (bits === 0) e = -1074n;
  else { mant |= 1n << 52n; e = BigInt(bits) - 1075n; }
  const shift = e + F;
  return sign * (shift >= 0n ? mant << shift : mant >> -shift);
}
const toNumber = (n) => Number(n >> (F - 64n)) / 2 ** 64;
const LY = exact(KM_PER_LY);
// Exact vector from place a to place b, rounded to 64 bits only at the end.
function trueOffset(a, b) {
  return [0, 1, 2].map((i) => {
    const anchor = ((exact(b.anchor[i]) - exact(a.anchor[i])) * LY) >> F;
    return toNumber(anchor + exact(b.offset[i]) - exact(a.offset[i]));
  });
}

// ---- small vector helpers ----
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };

// Column-major 4×4 matrix times vector. f32 = true rounds every step to 32 bits, like a GPU.
function mul(m, v, f32) {
  const r = f32 ? Math.fround : (x) => x;
  const out = [0, 0, 0, 0];
  for (let row = 0; row < 4; row++) {
    let acc = 0;
    for (let k = 0; k < 4; k++) acc = r(acc + r(r(m[k * 4 + row]) * r(v[k])));
    out[row] = acc;
  }
  return out;
}
function toPixels(clip, [w, h], f32) {
  const r = f32 ? Math.fround : (x) => x;
  if (clip[3] <= 0) return null;
  const x = r(clip[0] / clip[3]), y = r(clip[1] / clip[3]);
  return [((x + 1) / 2) * w, ((1 - y) / 2) * h];
}

// Screen position of each corner, rendered and exact. Returns [[name, err], ...].
function errors(sample) {
  const toStation = trueOffset(sample.camera, sample.station);
  const back = norm(toStation.map((v) => -v));
  const right = norm(cross([0, 1, 0], back));
  const up = cross(back, right);
  const [w, h] = sample.viewport;
  const out = [];
  for (const obj of sample.objects) {
    const rel = trueOffset(sample.camera, obj.place);
    obj.points.forEach((p, i) => {
      const world = rel.map((v, k) => v + obj.scale * p[k]);
      const view = [dot(right, world), dot(up, world), dot(back, world), 1];
      const ref = toPixels(mul(sample.proj, view, false), sample.viewport, false);
      const got = toPixels(mul(sample.proj, mul(obj.mv, [...p, 1], true), true), sample.viewport, true);
      const onScreen = ref && ref[0] > -w / 2 && ref[0] < 1.5 * w && ref[1] > -h / 2 && ref[1] < 1.5 * h;
      out.push([`${obj.name}#${i}`, onScreen && got ? sub(got, ref) : null]);
    });
  }
  return out;
}

function fmtDistance(km) {
  if (km >= 0.1 * KM_PER_LY) return `${+(km / KM_PER_LY).toPrecision(2)} ly`;
  if (km >= 1e7) return `${+(km / 149597870.7).toPrecision(2)} AU`;
  return `${+km.toPrecision(2)} km`;
}

async function run(browser, base, device, mode, shots) {
  const page = await browser.newPage(device.options);
  const problems = [];
  page.on('pageerror', (e) => problems.push(String(e)));
  await page.goto(`${base}?test=precision`);
  await page.waitForFunction(() => window.__precision?.ready);
  const rows = [];
  for (const [s, distanceKm] of STEPS.entries()) {
    let jitter = 0, worst = 0, red = 0, prev = null;
    for (let f = 0; f < FRAMES; f++) {
      const countRed = mode === 'anchored' && f % 5 === 0;
      const sample = await page.evaluate((o) => window.__precision.frame(o), {
        mode, distanceKm, azimuthDeg: 10 + f * 0.05, elevationDeg: 12, countRed,
      });
      if (countRed) red = Math.max(red, sample.red);
      const errs = errors(sample);
      for (const [i, [, e]] of errs.entries()) {
        if (!e) continue;
        worst = Math.max(worst, Math.hypot(...e));
        const p = prev?.[i][1];
        if (p) jitter = Math.max(jitter, Math.hypot(e[0] - p[0], e[1] - p[1]));
      }
      prev = errs;
      if (f === 0 && shots) {
        const file = join(OUT, `${device.name}-${String(s).padStart(2, '0')}.png`);
        await page.screenshot({ path: file });
        shots.push({ file, label: fmtDistance(distanceKm) });
      }
    }
    rows.push({ distance: fmtDistance(distanceKm), jitter, worst, red });
  }
  await page.close();
  return { rows, problems };
}

function report(device, mode, { rows, problems }) {
  console.log(`\n${device} — ${mode} places`);
  console.log('distance      jitter px   off by px   red px');
  for (const r of rows) {
    console.log(`${r.distance.padEnd(12)}  ${r.jitter.toFixed(3).padStart(9)}   ${r.worst.toFixed(3).padStart(9)}   ${r.red ?? '-'}`);
  }
  for (const p of problems) console.log('PAGE ERROR', p);
  const fails = rows.filter((r) => r.jitter > JITTER_LIMIT || r.red > 0);
  return problems.length === 0 && fails.length === 0;
}

async function sweep(browser, base) {
  const page = await browser.newPage(DEVICES[0].options);
  await page.goto(`${base}?test=precision`);
  await page.waitForFunction(() => window.__precision?.ready);
  console.log('\nResolution sweep (desktop): planet layers seen from about 40,000 km');
  console.log('gap km     gap / distance   red px');
  for (const planetGapKm of [60, 12, 6, 4, 3, 2, 1.5, 1, 0.6, 0.06]) {
    let red = 0, dist = 0;
    for (let f = 0; f < 5; f++) {
      const s = await page.evaluate((o) => window.__precision.frame(o), {
        distanceKm: 1, azimuthDeg: 10 + f * 0.05, elevationDeg: 12, countRed: true, planetGapKm,
      });
      red = Math.max(red, s.red);
      dist = Math.hypot(...trueOffset(s.camera, s.objects.find((o) => o.name === 'planet').place)) - 6000;
    }
    console.log(`${String(planetGapKm).padEnd(9)}  ${(planetGapKm / dist).toExponential(1).padStart(14)}   ${red}`);
  }
  await page.close();
}

async function contactSheet(browser, shots, file) {
  const cells = shots.map((s) => `<figure><img src="file://${s.file}"><figcaption>${s.label}</figcaption></figure>`).join('');
  const html = `<html><body style="margin:0;background:#111;color:#ccc;font:14px system-ui;padding:12px">
<style>main{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}figure{margin:0}img{width:100%;display:block}figcaption{padding:4px 0}</style>
<main>${cells}</main></body></html>`;
  const htmlFile = join(OUT, 'sheet.html');
  writeFileSync(htmlFile, html);
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await page.goto(`file://${htmlFile}`);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
}

mkdirSync(OUT, { recursive: true });
const server = await createServer({ logLevel: 'error', server: { port: 5199, strictPort: true } });
await server.listen();
const base = 'http://localhost:5199/';
const browser = await chromium.launch();
const DEVICES = [
  { name: 'desktop', options: { viewport: { width: 1280, height: 800 } } },
  { name: 'phone', options: devices['Pixel 7'] },
].filter((d) => PHONE || d.name !== 'phone');
let pass = true;
try {
  // Warm-up visit, so Vite's first dependency scan and reload happen before measuring.
  const warm = await browser.newPage();
  await warm.goto(`${base}?test=precision`);
  await warm.waitForTimeout(3000);
  await warm.close();

  const shots = [];
  for (const device of DEVICES) {
    for (const mode of ['anchored', 'naive']) {
      const result = await run(browser, base, device, mode, mode === 'anchored' && device.name === 'desktop' ? shots : null);
      const ok = report(device.name, mode, result);
      if (mode === 'anchored') pass &&= ok;
      else console.log(ok ? '(plain km held up here too)' : '(plain km fails, as expected)');
    }
  }
  await sweep(browser, base);
  await contactSheet(browser, shots, join(OUT, 'sheet.png'));
  console.log(`\nScreenshots and contact sheet: ${OUT}`);
} finally {
  await browser.close();
  await server.close();
}
console.log(pass ? '\nPASS: anchored places hold within 0.5 px with no depth errors at every step.' : '\nFAIL');
process.exit(pass ? 0 : 1);
