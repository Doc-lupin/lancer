// Task B0.2: the visual regression check. Each view's JPEG screenshot against
// the reference picture; a view fails when more than 0.5% of its pixels
// differ by more than 16 of 255 in a channel, and gets a difference picture.
// Options in tools/viewcheck.mjs; all view checks at once: check_views.mjs.
import { runViews, parseArgs } from './viewcheck.mjs';
process.exit((await runViews({ ...parseArgs(), checks: ['visuals'] })) ? 1 : 0);
