// Task B0.2: the visual regression check.
//
//   node tools/check_visuals.mjs [--ref phase2|wip|DIR] [--device desktop|phone]
//        [--only NAME,NAME] [--worlds wip] [--out DIR] [--limit PCT]
//
// Goes to each view of tools/baseline/views.json (as tools/record_baseline.mjs
// does), takes the same JPEG screenshot, and compares it with the reference
// image in docs/section-b/baseline/<ref>/<device>/ (default ref: phase2, the
// state the GM accepted). For each view it reports:
//
//   changed   the share of pixels where a color channel differs by more than
//             16 of 255, in percent: the number to watch
//   mean      the mean difference over all pixels and channels (0–255)
//   max       the largest difference of one channel
//
// A view passes when `changed` is at most --limit percent (default 0.5). The
// same pixels give the same JPEG, so an unchanged view reports 0. A view that
// fails also gets a difference picture in --out (changed pixels in red over a
// dim copy of the new view), next to the new screenshot. Writes
// --out/visuals.json. Exits 1 if a view fails or a page shows an error.
//
// When a change in the look is wanted, record it as the new reference with
// tools/record_baseline.mjs (after the GM approves it).

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { startApp, openPage, goTo, shoot } from './views.mjs';

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const refArg = arg('--ref') ?? 'phase2';
const REF = existsSync(refArg) ? resolve(refArg) : resolve('docs/section-b/baseline', refArg);
const OUT = resolve(arg('--out') ?? join(tmpdir(), 'lancer-visuals'));
const LIMIT = Number(arg('--limit') ?? 0.5);
const THRESHOLD = 16;
const devices = arg('--device') ? [arg('--device')] : ['desktop', 'phone'];
const only = arg('--only')?.split(',');
const views = JSON.parse(readFileSync(new URL('./baseline/views.json', import.meta.url), 'utf8'))
  .filter((v) => !only || only.includes(v.name));

// Compare two JPEG files in the browser (canvas decodes them; no library).
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
      const d = Math.max(Math.abs(pa[i] - pb[i]), Math.abs(pa[i + 1] - pb[i + 1]), Math.abs(pa[i + 2] - pb[i + 2]));
      sum += Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2]);
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

const app = await startApp(5186, { worlds: arg('--worlds') ?? undefined });
const report = { ref: REF, limit: LIMIT, threshold: THRESHOLD, views: {} };
let failed = 0;
try {
  const cmp = await openPage(app, 'desktop');
  for (const device of devices) {
    mkdirSync(join(OUT, device), { recursive: true });
    for (const v of views) {
      const refFile = join(REF, device, `${v.name}.jpg`);
      const newFile = join(OUT, device, `${v.name}.jpg`);
      const { page, errors, close } = await openPage(app, device);
      let r;
      try {
        await goTo(page, app.base, v);
        await shoot(page, newFile);
        if (!existsSync(refFile)) r = { missing: true };
        else {
          r = await compare(cmp.page, refFile, newFile, null);
          if (r.size) r.ok = false;
          else {
            r.ok = r.changed <= LIMIT;
            if (!r.ok) await compare(cmp.page, refFile, newFile, join(OUT, device, `${v.name}.diff.jpg`));
          }
        }
      } catch (e) {
        r = { error: String(e).split('\n')[0], ok: false };
      } finally {
        await close();
      }
      r.errors = errors;
      if (errors.length) r.ok = false;
      if (r.ok === false) failed++;
      (report.views[v.name] ??= {})[device] = r;
      const nums = r.changed != null ? `changed ${r.changed.toFixed(3)}%, mean ${r.mean.toFixed(2)}, max ${r.max}` : r.missing ? 'no reference' : r.size ? `size differs ${r.size.join('×')}` : r.error;
      console.log(`${r.ok === false ? 'FAIL' : 'ok  '} ${device} ${v.name}: ${nums}${errors.length ? `; ${errors.length} page errors` : ''}`);
    }
  }
  await cmp.close();
} finally {
  await app.close();
}
writeFileSync(join(OUT, 'visuals.json'), `${JSON.stringify(report, null, 1)}\n`);
console.log(`\n${failed ? `FAIL: ${failed} views differ from ${REF} by more than ${LIMIT}% (or show errors)` : `PASS: every view within ${LIMIT}% of ${REF}`}\nNew screenshots and difference pictures: ${OUT}`);
process.exit(failed ? 1 : 0);
