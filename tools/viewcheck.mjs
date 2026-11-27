// The view checks of Section B in one pass (B0.1 to B0.3, and the label
// contrast of the Phase B0 test). Each view of tools/baseline/views.json is
// loaded once per device, and on it, in this order:
//
//   perf      measure() against the view's budget (tools/baseline/budgets.json)
//   visuals   a JPEG screenshot compared with the reference picture
//   contrast  each label's contrast against what lies behind it (WCAG ratio,
//             90th percentile of the background), compared with the reference
//
// or, with record, all three written as the new reference. Used by
// check_views.mjs (all checks), check_visuals.mjs, check_performance.mjs,
// check_contrast.mjs (one each) and record_baseline.mjs (record).
//
// Common options:
//   --ref NAME|DIR   reference (default: accepted, docs/section-b/baseline/accepted)
//   --device D       desktop (the default) or phone (decision BD13: the map
//                    is for computers; phone is the old Pixel 7 emulation)
//   --only A,B       these views only
//   --quick          the views marked "quick" in views.json (12), fewer frames
//                    measured: for iterating; run the full set before approval
//   --worlds wip     the WIP procedural worlds on (decision BQ1)
//   --quality T      a quality tier (low, medium, high, ultra; B0.6); default:
//                    the device's (desktop high, phone medium)
//   --out DIR        where new screenshots and the report go (record: the
//                    reference folder)
//   --targets        the fixed targets in budgets.json fail the check too

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { inflateSync } from 'node:zlib';
import { startApp, openPage, goTo, measure, shoot, machineMs } from './views.mjs';

const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
const AA = 4.5;
const THRESHOLD = 16; // a channel differing by more than this counts as changed
const TIMES = ['workMs', 'frameMs', 'heldMs'];

// ---- pictures: compare two JPEG files in the browser (no image library) ----
async function compare(page, refFile, newFile, diffFile) {
  const url = (f) => `data:image/jpeg;base64,${readFileSync(f).toString('base64')}`;
  const r = await page.evaluate(async ([a, b, threshold, wantDiff]) => {
    const load = (src) => new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { size: [ia.width, ia.height, ib.width, ib.height] };
    const w = ia.width, h = ia.height;
    const pixels = (im) => { const c = new OffscreenCanvas(w, h); const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, w, h); };
    const pa = pixels(ia).data;
    const out = pixels(ib);
    const pb = out.data;
    let changed = 0, sum = 0, max = 0;
    for (let i = 0; i < pa.length; i += 4) {
      const dr = Math.abs(pa[i] - pb[i]), dg = Math.abs(pa[i + 1] - pb[i + 1]), db = Math.abs(pa[i + 2] - pb[i + 2]);
      const d = Math.max(dr, dg, db);
      sum += dr + dg + db;
      if (d > max) max = d;
      const hit = d > threshold;
      if (hit) changed++;
      if (wantDiff) {
        if (hit) { pb[i] = 255; pb[i + 1] = 40; pb[i + 2] = 40; } else { pb[i] *= 0.35; pb[i + 1] *= 0.35; pb[i + 2] *= 0.35; }
      }
    }
    let diff = null;
    if (wantDiff) {
      const c = new OffscreenCanvas(w, h);
      c.getContext('2d').putImageData(out, 0, 0);
      const blob = await c.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
      diff = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result.split(',')[1]); fr.readAsDataURL(blob); });
    }
    const n = w * h;
    return { changed: (100 * changed) / n, mean: sum / (3 * n), max, diff };
  }, [url(refFile), url(newFile), THRESHOLD, Boolean(diffFile)]);
  if (r.diff) writeFileSync(diffFile, Buffer.from(r.diff, 'base64'));
  delete r.diff;
  return r;
}

// ---- contrast: labels against the background behind them ----
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
  const px = new Uint8Array(width * height * bpp);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      px[y * stride + x] = (v + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
    }
  }
  return { width, height, bpp, px };
}
const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

// Lists the labels showing, hides them, and measures each against what lies
// behind (the labels' dark text shadow left out, so on the safe side).
async function contrast(page) {
  const labels = await page.evaluate(() => {
    const found = [];
    for (const el of document.querySelectorAll('[data-region],[data-body],[data-place],[data-lane]')) {
      const op = Number(getComputedStyle(el).opacity);
      const r = el.getBoundingClientRect();
      if (op < 0.5 || r.width < 2 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) continue;
      const key = ['region', 'body', 'place', 'lane'].find((k) => el.dataset[k] != null);
      const parts = [...el.querySelectorAll('*')].filter((c) => [...c.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
      for (const p of parts.length ? parts : [el]) {
        const b = p.getBoundingClientRect();
        found.push({ id: `${key}:${el.dataset[key]}${parts.length > 1 ? `:${parts.indexOf(p)}` : ''}`, color: getComputedStyle(p).color, box: [b.left, b.top, b.width, b.height] });
      }
      el.style.visibility = 'hidden';
    }
    return found;
  });
  const dpr = await page.evaluate(() => devicePixelRatio);
  const img = decodePng(await page.screenshot({ animations: 'disabled' }));
  const rows = [];
  for (const l of labels) {
    const [r, g, b] = l.color.match(/[\d.]+/g).map(Number);
    const text = lum(r, g, b);
    const x0 = Math.max(0, Math.floor(l.box[0] * dpr)), y0 = Math.max(0, Math.floor(l.box[1] * dpr));
    const x1 = Math.min(img.width, Math.ceil((l.box[0] + l.box[2]) * dpr)), y1 = Math.min(img.height, Math.ceil((l.box[1] + l.box[3]) * dpr));
    const ls = [];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const k = (y * img.width + x) * img.bpp;
      ls.push(lum(img.px[k], img.px[k + 1], img.px[k + 2]));
    }
    if (!ls.length) continue;
    ls.sort((p, q) => p - q);
    rows.push({ id: l.id, contrast: +ratio(text, ls[Math.floor(0.9 * (ls.length - 1))]).toFixed(2) });
  }
  return rows;
}

// ---- performance numbers and budgets ----
const numbers = (m) => ({
  workMs: m.workMs.median, frameMs: m.frameMs.median, heldMs: m.flight.worstGapMs,
  drawCalls: m.drawCalls, gpuMB: m.gpuBytesEstimate / 1048576,
});

export function parseArgs(argv = process.argv) {
  const arg = (k) => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
  return {
    ref: arg('--ref') ?? 'accepted', device: arg('--device'), only: arg('--only')?.split(','),
    quick: argv.includes('--quick'), worlds: arg('--worlds') ?? undefined, quality: arg('--quality') ?? undefined, out: arg('--out'),
    targets: argv.includes('--targets'), checks: arg('--checks')?.split(','),
  };
}

// checks: ['perf', 'visuals', 'contrast'] (any); record: true writes the reference to opts.out.
export async function runViews({ checks, record = false, port = 5179, ...o }) {
  const want = new Set(record ? ['perf', 'visuals', 'contrast'] : checks);
  const REF = existsSync(o.ref) ? resolve(o.ref) : resolve('docs/section-b/baseline', o.ref);
  if (record && !o.out) { console.error('Give --out DIR (docs/section-b/baseline/accepted only after the GM approves a look).'); process.exit(2); }
  const OUT = resolve(o.out ?? join(tmpdir(), 'lancer-views'));
  // Decision BD13: computers only. --device phone still runs the emulation.
  const devices = o.device ? [o.device] : ['desktop'];
  const views = read(new URL('./baseline/views.json', import.meta.url))
    .filter((v) => (!o.only || o.only.includes(v.name)) && (!o.quick || v.quick));
  const budgets = read(new URL('./baseline/budgets.json', import.meta.url));
  const refBase = !record && existsSync(join(REF, 'baseline.json')) ? read(join(REF, 'baseline.json')) : null;
  const refContrast = !record && existsSync(join(REF, 'contrast.json')) ? read(join(REF, 'contrast.json')) : null;
  // Record: merge into what is there, so --only and --device update part of it.
  const baseFile = join(OUT, 'baseline.json'), contrastFile = join(OUT, 'contrast.json');
  const recBase = record ? (existsSync(baseFile) ? read(baseFile) : { views: {} }) : null;
  const recContrast = record ? (existsSync(contrastFile) ? read(contrastFile) : { aa: AA, views: {} }) : null;
  const n = o.quick ? 10 : 30, budgetMs = o.quick ? 3000 : 8000;

  const app = await startApp(port, { worlds: o.worlds, quality: o.quality });
  const report = { ref: record ? null : REF, views: {} };
  let failed = 0;
  const t0 = Date.now();
  try {
    const here = want.has('perf') ? await machineMs(app) : null;
    const scale = refBase?.machine?.ms && here ? here / refBase.machine.ms : 1;
    if (record) {
      Object.assign(recBase, {
        recorded: new Date().toISOString().slice(0, 10),
        commit: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: new URL('..', import.meta.url) }).toString().trim(),
        note: 'Headless Chromium, software rendering. workMs: our CPU work per frame; frameMs: frame to frame; gpuBytesEstimate: geometry and textures reachable from the scene; machine.ms: machineMs in tools/views.mjs.',
        worlds: o.worlds ?? 'default', machine: { ms: here },
      });
    }
    if (here) console.log(`machine: ${here} ms here${refBase ? `, ${refBase.machine?.ms ?? '?'} in the reference (times ×${scale.toFixed(2)})` : ''}`);
    const cmp = want.has('visuals') && !record ? await openPage(app, 'desktop') : null;
    for (const device of devices) {
      mkdirSync(join(OUT, device), { recursive: true });
      for (const v of views) {
        const { page, errors, close } = await openPage(app, device);
        const r = { problems: [], notes: [] };
        try {
          const flight = await goTo(page, app.base, v);
          if (want.has('perf')) {
            const m = await measure(page, n, budgetMs);
            r.now = numbers({ ...m, flight });
            if (record) ((recBase.views[v.name] ??= { view: v })[device] = { flight, ...m, errors });
            const base = refBase?.views[v.name]?.[device];
            if (base) {
              const was = numbers(base);
              for (const [k, { ratio: q, plus }] of Object.entries({ ...budgets.default, ...budgets.views[v.name] })) {
                const limit = (was[k] * q + plus) * (TIMES.includes(k) ? scale : 1);
                if (r.now[k] > limit) r.problems.push(`${k} ${r.now[k].toFixed(1)} > ${limit.toFixed(1)}`);
              }
            } else if (!record) r.problems.push('no performance reference');
            for (const [k, limit] of Object.entries(budgets.targets[device] ?? {})) {
              if (r.now[k] > limit) (o.targets ? r.problems : r.notes).push(`target ${k} ${r.now[k].toFixed(0)} > ${limit}`);
            }
          }
          if (want.has('visuals')) {
            const file = join(OUT, device, `${v.name}.jpg`);
            await shoot(page, file);
            if (!record) {
              const refFile = join(REF, device, `${v.name}.jpg`);
              if (!existsSync(refFile)) r.problems.push('no reference picture');
              else {
                const c = await compare(cmp.page, refFile, file, null);
                r.visual = c;
                if (c.size) r.problems.push(`picture size differs ${c.size.join('×')}`);
                else if (c.changed > 0.5) {
                  r.problems.push(`picture changed ${c.changed.toFixed(3)}% (mean ${c.mean.toFixed(2)})`);
                  await compare(cmp.page, refFile, file, join(OUT, device, `${v.name}.diff.jpg`));
                }
              }
            }
          }
          if (want.has('contrast')) {
            const rows = await contrast(page);
            r.contrast = rows;
            if (record) (recContrast.views[v.name] ??= {})[device] = rows;
            const low = rows.filter((x) => x.contrast < AA);
            const ref = refContrast?.views[v.name]?.[device];
            if (ref) {
              const was = new Map(ref.map((x) => [x.id, x.contrast]));
              let bad = low.filter((x) => (was.get(x.id) ?? AA) >= AA);
              if (!bad.length && low.length > ref.filter((x) => x.contrast < AA).length) bad = low;
              if (bad.length) r.problems.push(`labels newly under ${AA}:1: ${bad.map((x) => `${x.id} ${x.contrast}`).join(', ')}`);
            } else if (!record) r.problems.push('no contrast reference');
          }
        } catch (e) {
          r.problems.push(String(e).split('\n')[0]);
        } finally {
          await close();
        }
        if (errors.length) r.problems.push(`${errors.length} page errors: ${errors[0]}`);
        if (r.problems.length) failed++;
        (report.views[v.name] ??= {})[device] = r;
        const nw = r.now;
        const parts = [
          nw && `work ${nw.workMs.toFixed(1)} ms, frame ${nw.frameMs.toFixed(0)} ms, held ${nw.heldMs.toFixed(0)} ms, ${nw.drawCalls} calls`,
          r.visual && !r.visual.size && `picture ${r.visual.changed.toFixed(3)}%`,
          r.contrast && `${r.contrast.length} labels, ${r.contrast.filter((x) => x.contrast < AA).length} under ${AA}:1`,
        ].filter(Boolean).join('; ');
        console.log(`${r.problems.length ? 'FAIL' : 'ok  '} ${device} ${v.name}: ${parts}${r.problems.length ? ` — ${r.problems.join('; ')}` : ''}${r.notes.length ? ` (${r.notes.join(', ')})` : ''}`);
      }
    }
    await cmp?.close();
  } finally {
    await app.close();
  }
  if (record) {
    writeFileSync(baseFile, `${JSON.stringify(recBase, null, 1)}\n`);
    writeFileSync(contrastFile, `${JSON.stringify(recContrast, null, 1)}\n`);
  }
  if (!record) writeFileSync(join(OUT, 'report.json'), `${JSON.stringify(report, null, 1)}\n`);
  const runs = Object.values(report.views).reduce((s, d) => s + Object.keys(d).length, 0);
  const what = record ? 'recorded' : [...want].join(', ');
  console.log(`\n${record ? `Recorded ${runs} views into ${OUT}` : failed ? `FAIL: ${failed} of ${runs} views (${what}) against ${REF}` : `PASS: ${runs} views (${what}) against ${REF}`} in ${Math.round((Date.now() - t0) / 1000)} s. Pictures and report: ${OUT}`);
  return failed;
}
