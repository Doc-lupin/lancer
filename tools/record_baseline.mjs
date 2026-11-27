// Task B0.1: record a reference: for each view, its screenshot, its numbers
// (baseline.json: frames, CPU work, frame time, draw calls, memory) and its
// labels' contrast (contrast.json), in one pass. Record into
// docs/section-b/baseline/accepted only after the GM approves a look.
//
//   node tools/record_baseline.mjs --out DIR [--device D] [--only A,B] [--worlds wip]
import { runViews, parseArgs } from './viewcheck.mjs';
await runViews({ ...parseArgs(), record: true });
