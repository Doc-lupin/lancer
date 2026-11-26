// Phase B0 test: "The tone map and bloom do not change label contrast below
// the WCAG AA contrast ratio (4.5:1)".
//
//   node tools/check_contrast.mjs [--device desktop|phone] [--only NAME,NAME]
//        [--record FILE] [--ref FILE] [--worlds wip]
//
// For each view of tools/baseline/views.json: lists the name labels that show
// (regions, bodies, places, lanes) with their text color, hides them, takes a
// screenshot of what lies behind, and works out each label's contrast ratio
// (WCAG: (L1 + 0.05) / (L2 + 0.05), relative luminance) against the 90th
// percentile of the background's luminance in the label's box: a bright
// background, not the average. The labels' dark text shadow is left out, so
// the number is on the safe side.
//
// --record FILE writes the results. --ref FILE (default:
// docs/section-b/baseline/accepted/contrast.json) compares with them: a label
// that met 4.5:1 there and now falls below fails, as does a view where more
// labels fall below 4.5:1 than before. Labels under 4.5:1 in both are
// reported, not failed: their background was already bright.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { resolve } from 'node:path';
import { startApp, openPage, goTo } from './views.mjs';

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const AA = 4.5;
const devices = arg('--device') ? [arg('--device')] : ['desktop', 'phone'];
const only = arg('--only')?.split(',');
const RECORD = arg('--record') && resolve(arg('--record'));
const REF_FILE = resolve(arg('--ref') ?? 'docs/section-b/baseline/accepted/contrast.json');
const REF = !RECORD && existsSync(REF_FILE) ? JSON.parse(readFileSync(REF_FILE, 'utf8')) : null;
const views = JSON.parse(readFileSync(new URL('./baseline/views.json', import.meta.url), 'utf8')).filter((v) => !only || only.includes(v.name));

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

const app = await startApp(5181, { worlds: arg('--worlds') ?? undefined });
const out = { aa: AA, views: {} };
let failed = 0;
try {
  for (const device of devices) {
    for (const v of views) {
      const { page, close } = await openPage(app, device);
      try {
        await goTo(page, app.base, v);
        const labels = await page.evaluate(() => {
          const sel = '[data-region],[data-body],[data-place],[data-lane]';
          const found = [];
          for (const el of document.querySelectorAll(sel)) {
            const op = Number(getComputedStyle(el).opacity);
            const r = el.getBoundingClientRect();
            if (op < 0.5 || r.width < 2 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) continue;
            const key = ['region', 'body', 'place', 'lane'].find((k) => el.dataset[k] != null);
            // Each line of text that has its own color (a region's name and its subtitle).
            const parts = [...el.querySelectorAll('*')].filter((c) => c.childNodes.length && [...c.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
            for (const p of parts.length ? parts : [el]) {
              const b = p.getBoundingClientRect();
              found.push({ id: `${key}:${el.dataset[key]}${parts.length > 1 ? `:${parts.indexOf(p)}` : ''}`, color: getComputedStyle(p).color, box: [b.left, b.top, b.width, b.height] });
            }
            el.style.visibility = 'hidden';
          }
          return found;
        });
        const dpr = await page.evaluate(() => devicePixelRatio);
        const img = decode(await page.screenshot({ animations: 'disabled' }));
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
          const bg = ls[Math.floor(0.9 * (ls.length - 1))];
          rows.push({ id: l.id, contrast: +ratio(text, bg).toFixed(2) });
        }
        (out.views[v.name] ??= {})[device] = rows;
        const low = rows.filter((x) => x.contrast < AA);
        let bad = [];
        const ref = REF?.views[v.name]?.[device];
        if (ref) {
          const was = new Map(ref.map((x) => [x.id, x.contrast]));
          bad = low.filter((x) => (was.get(x.id) ?? AA) >= AA);
          if (low.length > ref.filter((x) => x.contrast < AA).length && !bad.length) bad = low;
        }
        if (bad.length) failed++;
        const worst = rows.length ? Math.min(...rows.map((x) => x.contrast)).toFixed(2) : '—';
        console.log(`${bad.length ? 'FAIL' : 'ok  '} ${device} ${v.name}: ${rows.length} labels, ${low.length} under ${AA}:1, lowest ${worst}${bad.length ? `; newly under: ${bad.map((x) => `${x.id} ${x.contrast}`).join(', ')}` : low.length ? ` (${low.map((x) => `${x.id} ${x.contrast}`).join(', ')})` : ''}`);
      } finally {
        await close();
      }
    }
  }
} finally {
  await app.close();
}
if (RECORD) { writeFileSync(RECORD, `${JSON.stringify(out, null, 1)}\n`); console.log(`\nRecorded: ${RECORD}`); }
console.log(`\n${failed ? `FAIL: label contrast fell below ${AA}:1 in ${failed} views` : REF ? `PASS: no label fell below ${AA}:1 against ${REF_FILE}` : 'No reference: nothing compared.'}`);
process.exit(failed ? 1 : 0);
