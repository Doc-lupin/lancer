// The Section B view checks in one pass: performance (B0.3), pictures (B0.2)
// and label contrast (Phase B0 test), each view loaded once. Options in
// tools/viewcheck.mjs.
//
//   node tools/check_views.mjs [--quick] [--ref accepted] [--device D] [--only A,B] [--checks perf,visuals,contrast]
import { runViews, parseArgs } from './viewcheck.mjs';
const o = parseArgs();
process.exit((await runViews({ ...o, checks: o.checks ?? ['perf', 'visuals', 'contrast'] })) ? 1 : 0);
