// Task B0.1: record a baseline before Section B changes the look.
//
//   node tools/record_baseline.mjs [--out DIR] [--device desktop|phone] [--only NAME,NAME] [--worlds wip]
//
// Goes to each view in tools/baseline/views.json (40 fixed views; fields in
// tools/views.mjs) on a 1280 × 800 desktop window and on Pixel 7 emulation
// with the CPU slowed 4×. For each view it saves a screenshot and records:
// the frames flown to get there and the longest gap between them (a bake
// that holds the view), then over up to 30 frames drawn in a row (at most
// about 8 s of them) our own work per
// frame (CPU), the frame time, draw calls, triangles, three.js's geometry and
// texture counts, an estimate of GPU memory, and the JS heap.
//
// Writes DIR/<device>/<view>.jpg and DIR/baseline.json (default DIR:
// docs/section-b/baseline). --worlds wip turns on the WIP procedural worlds
// (decision BQ1). Headless Chromium draws in software, so frame
// times here are far slower than on a graphics chip; they are a reference
// for later changes on this machine, not a measure of a phone.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { startApp, openPage, goTo, measure, shoot } from './views.mjs';

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const OUT = resolve(arg('--out') ?? 'docs/section-b/baseline');
const devices = arg('--device') ? [arg('--device')] : ['desktop', 'phone'];
const only = arg('--only')?.split(',');
const views = JSON.parse(readFileSync(new URL('./baseline/views.json', import.meta.url), 'utf8'))
  .filter((v) => !only || only.includes(v.name));

const file = join(OUT, 'baseline.json');
const out = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { views: {} };
out.recorded = new Date().toISOString().slice(0, 10);
out.commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: new URL('..', import.meta.url) }).toString().trim();
out.note = 'Headless Chromium, software rendering. workMs: our CPU work per frame; frameMs: frame to frame; gpuBytesEstimate: geometry and textures reachable from the scene.';

const worlds = arg('--worlds') ?? undefined;
out.worlds = worlds ?? 'phase2';
const app = await startApp(5187, { worlds });
let failed = 0;
try {
  for (const device of devices) {
    mkdirSync(join(OUT, device), { recursive: true });
    for (const v of views) {
      const { page, errors, close } = await openPage(app, device);
      try {
        const flight = await goTo(page, app.base, v);
        const m = await measure(page);
        await shoot(page, join(OUT, device, `${v.name}.jpg`));
        out.views[v.name] ??= { view: v };
        out.views[v.name].view = v;
        out.views[v.name][device] = { flight, ...m, errors };
        console.log(`${device} ${v.name}: work ${m.workMs.median} ms, frame ${m.frameMs.median} ms, ${m.drawCalls} calls, flight gap ${flight.worstGapMs} ms, gpu ~${(m.gpuBytesEstimate / 1048576).toFixed(1)} MB${errors.length ? `, ${errors.length} page errors` : ''}`);
      } catch (e) {
        failed++;
        console.log(`${device} ${v.name}: FAILED ${String(e).split('\n')[0]}`);
      } finally {
        await close();
      }
    }
  }
} finally {
  await app.close();
}
writeFileSync(file, `${JSON.stringify(out, null, 1)}\n`);
console.log(`${file}${failed ? ` (${failed} views failed)` : ''}`);
process.exit(failed ? 1 : 0);
