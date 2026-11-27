// Task B0.3: the performance check. CPU work, frame time, held frame (bake),
// draw calls and GPU memory of each view against its budget
// (tools/baseline/budgets.json), times scaled by machine speed. Options in
// tools/viewcheck.mjs; all view checks at once: check_views.mjs.
import { runViews, parseArgs } from './viewcheck.mjs';
process.exit((await runViews({ ...parseArgs(), checks: ['perf'] })) ? 1 : 0);
