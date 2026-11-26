// Assemble the files for the GM's phone link (a private claude.ai artifact,
// https://claude.ai/artifact/K9tk8ckJppNExxZyuMYquM, see docs/PHASE2.md).
//
//   npm run build && node tools/phone_link.mjs [--out DIR]
//
// Writes DIR/index.html (a small page with the dark background and touch
// settings) and copies the built app's main script and map data from dist/
// beside it, leaving out the test scenes. Publish DIR/index.html with the
// Artifact tool to the same link, passing the assets as `files` (and null for
// the previous script's path, which the new build renames). Before each
// publish, scan the script for e-mail addresses, private links and keys.

import { mkdirSync, readdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const i = process.argv.indexOf('--out');
const OUT = resolve(i > 0 ? process.argv[i + 1] : join(tmpdir(), 'basin-map'));
const DIST = resolve('dist/assets');
const assets = readdirSync(DIST);
const script = assets.find((f) => /^index-.*\.js$/.test(f));
const data = assets.filter((f) => /^map-.*\.json$/.test(f));
if (!script || !data.length) throw new Error('No build found: run npm run build first.');

rmSync(join(OUT, 'assets'), { recursive: true, force: true });
mkdirSync(join(OUT, 'assets'), { recursive: true });
for (const f of [script, ...data]) copyFileSync(join(DIST, f), join(OUT, 'assets', f));
writeFileSync(join(OUT, 'index.html'), `<title>Lancer Basin Map</title>
<style>
  /* A single dark look: the map is a night sky in every theme. */
  :root { color-scheme: dark; --bg: #000; }
  html, body, #root { width: 100%; height: 100%; margin: 0; overflow: hidden; background: var(--bg); }
  #root { touch-action: none; } /* touch gestures go to the map, not to page scroll or zoom */
</style>
<div id="root"></div>
<script type="module" src="./assets/${script}"></script>
`);
console.log(`${OUT}/index.html\n  assets/${script}\n${data.map((f) => `  assets/${f}`).join('\n')}`);
