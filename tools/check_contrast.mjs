// Phase B0 test: tone map and bloom keep label contrast at 4.5:1 (WCAG AA).
// Each label against the background behind it; a label that met 4.5:1 in the
// reference and now falls below fails. Options in tools/viewcheck.mjs; all
// view checks at once: check_views.mjs.
import { runViews, parseArgs } from './viewcheck.mjs';
process.exit((await runViews({ ...parseArgs(), checks: ['contrast'] })) ? 1 : 0);
