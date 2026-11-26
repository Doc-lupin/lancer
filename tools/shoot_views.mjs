// Screenshots of chosen views, for looking at the map's visuals (Section B:
// baselines, the review gallery, debugging a world). Not a check: it passes
// nothing and fails nothing.
//
//   node tools/shoot_views.mjs --views '<json>' [--out DIR] [--phone] [--sheet NAME]
//   node tools/shoot_views.mjs --views views.json ...
//
// Each view is an object; all fields are optional and apply in this order:
//   name     file name (default view-N)
//   focus    fly to this id, framed as a click does
//   close    fly in close to this body's globe
//   yaw, pitch   set the camera's angles (radians)
//   dist     multiply the camera's distance (e.g. 0.5 for twice as close)
//   debug    World Lab view on procedural worlds: 0 off, 1 height, 2 moisture,
//            3 temperature (uDebug in src/views/planet/terrain.js)
// Example: '[{"name":"tallis","close":"tallis-planet"},{"name":"wet","debug":2}]'
// --sheet NAME also writes NAME.png, all views side by side (needs python3 with
// Pillow). Prints page errors. Uses the Playwright installed with the
// environment (see tools/check_*.mjs).

import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const raw = arg('--views') ?? '[{}]';
const views = JSON.parse(existsSync(raw) ? readFileSync(raw, 'utf8') : raw);
const OUT = resolve(arg('--out') ?? join(tmpdir(), 'lancer-views'));
const phone = process.argv.includes('--phone');
mkdirSync(OUT, { recursive: true });

const server = await createServer({ logLevel: 'error', server: { port: 5189, strictPort: true } });
await server.listen();
const browser = await chromium.launch();
const files = [];
try {
  const page = await browser.newPage(phone ? devices['Pixel 7'] : { viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 400)); });
  await page.goto('http://localhost:5189/');
  await page.waitForFunction(() => window.__lancer?.view.rig?.camera, null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  const settle = () => page.waitForFunction(() => !window.__lancer.view.rig.fly, null, { timeout: 20000 });
  for (const [i, v] of views.entries()) {
    if (v.focus) { await page.evaluate((f) => window.__lancer.focus(f), v.focus); await settle(); }
    if (v.close) {
      await page.evaluate((f) => window.__lancer.focusAt(f, window.__lancer.view.targets.get(f).closeKm * (window.__lancer.view.rig.frame ?? 1)), v.close);
      await settle();
    }
    await page.evaluate((v) => {
      const r = window.__lancer.view.rig;
      if (v.yaw != null) r.yaw = v.yaw;
      if (v.pitch != null) r.pitch = v.pitch;
      if (v.dist) r.distance *= v.dist;
      if (v.debug != null) window.__lancer.scene.traverse((o) => { if (o.material?.uniforms?.uDebug) o.material.uniforms.uDebug.value = v.debug; });
      window.__lancer.invalidate();
    }, v);
    await page.waitForTimeout(700);
    const file = join(OUT, `${v.name ?? `view-${i + 1}`}.png`);
    await page.screenshot({ path: file });
    files.push(file);
    console.log(file);
  }
  console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors');
} finally {
  await browser.close();
  await server.close();
}

const sheet = arg('--sheet');
if (sheet && files.length) {
  const py = `
import sys
from PIL import Image
files, out = sys.argv[1:-1], sys.argv[-1]
ims = [Image.open(f).convert('RGB') for f in files]
w, h = ims[0].size
cols = min(4, len(ims)); rows = (len(ims) + cols - 1) // cols
s = 0.5
W, H = int(w * s), int(h * s)
sheet = Image.new('RGB', (W * cols, H * rows))
for i, im in enumerate(ims): sheet.paste(im.resize((W, H)), ((i % cols) * W, (i // cols) * H))
sheet.save(out)`;
  execFileSync('python3', ['-c', py, ...files, join(OUT, `${sheet}.png`)]);
  console.log(join(OUT, `${sheet}.png`));
}
