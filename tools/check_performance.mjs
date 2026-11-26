// Task B0.3: the performance check.
//
//   node tools/check_performance.mjs [--ref phase2|wip|DIR] [--device desktop|phone]
//        [--only NAME,NAME] [--worlds wip] [--targets] [--out DIR]
//
// Goes to each view of tools/baseline/views.json, measures it as
// tools/record_baseline.mjs does, and checks five numbers against the view's
// budget (tools/baseline/budgets.json), made from the same view in the
// reference baseline (default: phase2, docs/section-b/baseline/phase2):
//
//   workMs     our own CPU work per frame (median)
//   frameMs    time from one frame to the next, with the draw (median)
//   heldMs     the longest frame on the flight to the view: bake time
//   drawCalls  draw calls in a frame
//   gpuMB      the estimate of GPU memory (geometry and textures)
//
// Times are scaled by machine speed: machineMs() here against machine.ms in
// the reference. Headless Chromium draws in software, so frameMs measures
// shader cost on this CPU, not on a graphics chip.
//
// A view fails when a number is over its budget or the page shows an error.
// The targets in budgets.json (the Phase B0 test: no frame held more than
// 50 ms on desktop) are reported; with --targets they fail the check too.
// Writes --out/performance.json. Exits 1 if a view fails.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { startApp, openPage, goTo, measure, machineMs } from './views.mjs';

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const refArg = arg('--ref') ?? 'phase2';
const REF = existsSync(refArg) ? resolve(refArg) : resolve('docs/section-b/baseline', refArg);
const OUT = resolve(arg('--out') ?? join(tmpdir(), 'lancer-performance'));
const strictTargets = process.argv.includes('--targets');
const devices = arg('--device') ? [arg('--device')] : ['desktop', 'phone'];
const only = arg('--only')?.split(',');
const read = (u) => JSON.parse(readFileSync(u, 'utf8'));
const views = read(new URL('./baseline/views.json', import.meta.url)).filter((v) => !only || only.includes(v.name));
const budgets = read(new URL('./baseline/budgets.json', import.meta.url));
const ref = read(join(REF, 'baseline.json'));

const TIMES = ['workMs', 'frameMs', 'heldMs'];
const numbers = (m) => ({
  workMs: m.workMs.median, frameMs: m.frameMs.median, heldMs: m.flight.worstGapMs,
  drawCalls: m.drawCalls, gpuMB: m.gpuBytesEstimate / 1048576,
});

const app = await startApp(5184, { worlds: arg('--worlds') ?? undefined });
const report = { ref: REF, views: {} };
let failed = 0;
try {
  const here = await machineMs(app);
  const scale = ref.machine?.ms ? here / ref.machine.ms : 1;
  report.machine = { ms: here, refMs: ref.machine?.ms ?? null, scale: +scale.toFixed(3) };
  console.log(`machine: ${here} ms here, ${ref.machine?.ms ?? 'unknown (taken as equal)'} in the reference; times scaled ×${scale.toFixed(2)}\n`);
  mkdirSync(OUT, { recursive: true });
  for (const device of devices) {
    for (const v of views) {
      const base = ref.views[v.name]?.[device];
      const { page, errors, close } = await openPage(app, device);
      const r = { ok: true, over: [], targetsMissed: [] };
      try {
        const flight = await goTo(page, app.base, v);
        const now = numbers({ ...(await measure(page)), flight });
        r.now = now;
        if (!base) { r.ok = false; r.over.push('no reference'); } else {
          const was = numbers(base);
          const rule = { ...budgets.default, ...budgets.views[v.name] };
          r.budget = {};
          for (const [k, { ratio, plus }] of Object.entries(rule)) {
            const limit = (was[k] * ratio + plus) * (TIMES.includes(k) ? scale : 1);
            r.budget[k] = +limit.toFixed(2);
            if (now[k] > limit) r.over.push(`${k} ${now[k].toFixed(1)} > ${limit.toFixed(1)}`);
          }
        }
        for (const [k, limit] of Object.entries(budgets.targets[device] ?? {})) {
          if (now[k] > limit) r.targetsMissed.push(`${k} ${now[k].toFixed(0)} > ${limit}`);
        }
      } catch (e) {
        r.over.push(String(e).split('\n')[0]);
      } finally {
        await close();
      }
      r.errors = errors;
      if (r.over.length || errors.length || (strictTargets && r.targetsMissed.length)) r.ok = false;
      if (!r.ok) failed++;
      (report.views[v.name] ??= {})[device] = r;
      const n = r.now;
      const line = n ? `work ${n.workMs.toFixed(1)} ms, frame ${n.frameMs.toFixed(0)} ms, held ${n.heldMs.toFixed(0)} ms, ${n.drawCalls} calls, ${n.gpuMB.toFixed(1)} MB` : '';
      console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${device} ${v.name}: ${line}${r.over.length ? `; over budget: ${r.over.join(', ')}` : ''}${r.targetsMissed.length ? `; target missed: ${r.targetsMissed.join(', ')}` : ''}${errors.length ? `; ${errors.length} page errors` : ''}`);
    }
  }
} finally {
  await app.close();
}
writeFileSync(join(OUT, 'performance.json'), `${JSON.stringify(report, null, 1)}\n`);
const missed = Object.values(report.views).flatMap((d) => Object.values(d)).filter((r) => r.targetsMissed.length).length;
console.log(`\n${failed ? `FAIL: ${failed} views over budget against ${REF}` : `PASS: every view within budget against ${REF}`}`);
console.log(`Targets (budgets.json): ${missed ? `missed in ${missed} views${strictTargets ? '' : ' (reported only; --targets to fail on them)'}` : 'met in every view'}`);
process.exit(failed ? 1 : 0);
