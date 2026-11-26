// Controls check (after the GM's phone test of Phase 2).
//
//   node tools/check_controls.mjs
//
// Starts Vite, opens the map in headless Chromium (desktop, and Pixel 7 with
// touch) and checks:
//   - lanes and orbit lines don't flicker as the view turns: the strip shader
//     is replayed in 32-bit floats, as a phone's GPU runs it, for every piece,
//     over small turns at three levels; no strip may swing by half a pixel or
//     more across a screen-sized length;
//   - the camera button (and F) switches between orbit and free without
//     moving the camera;
//   - free mode: a drag turns the view with the finger; held keys (desktop),
//     the wheel (desktop) and a pinch (phone) move along the view; the camera
//     stops short of a planet; a click or tap on something flies there and
//     returns to orbit mode.
// Uses the Playwright installed with the environment.

import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { offsetKm } from '../src/views/origin.js';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const results = [];
function check(name, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}
const ev = (page, fn, arg) => page.evaluate(fn, arg);
async function settle(page) {
  await page.waitForFunction(() => !window.__lancer.view.rig.fly, null, { timeout: 15000 });
  await page.waitForTimeout(250);
}
const camState = (page) => ev(page, () => {
  const r = window.__lancer.view.rig;
  return { cam: r.camera, yaw: r.yaw, pitch: r.pitch, mode: r.mode ?? 'orbit', focus: r.focusId };
});
const distTo = async (page, id) => {
  const s = await ev(page, (i) => ({ cam: window.__lancer.view.rig.camera, place: window.__lancer.view.targets.get(i).place }), id);
  return Math.hypot(...offsetKm(s.cam, s.place));
};

// Largest swing of any strip piece, in px across a screen-sized length, over
// 30 small turns, with the strip shader's projection replayed in 32-bit floats.
async function swing(page, layer) {
  return ev(page, async (layer) => {
    const L = window.__lancer, f = Math.fround, near = 1e-3;
    const W = innerWidth * devicePixelRatio, H = innerHeight * devicePixelRatio;
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const mul = (m, v, r) => { const o = [0, 0, 0, 0]; for (let row = 0; row < 4; row++) { let acc = 0; for (let k = 0; k < 4; k++) acc = r(acc + r(r(m[k * 4 + row]) * r(v[k]))); o[row] = acc; } return o; };
    const ends = (a0, b0, mv, pr, r) => {
      let a = mul(mv, [...a0, 1], r), b = mul(mv, [...b0, 1], r);
      if (a[2] > -near && b[2] > -near) return null;
      const mix = (x, y, t) => x.map((v, i) => r(v + r(r(y[i] - v) * t)));
      if (a[2] > -near) a = mix(a, b, r(r(a[2] + near) / r(a[2] - b[2])));
      if (b[2] > -near) b = mix(b, a, r(r(b[2] + near) / r(b[2] - a[2])));
      const scr = (v) => { const c = mul(pr, v, r); return [r(r(r(c[0] / c[3]) * 0.5 + 0.5) * W), r(r(r(c[1] / c[3]) * 0.5 + 0.5) * H)]; };
      return [scr(a), scr(b)];
    };
    let worst = 0, pieces = 0;
    for (let k = 0; k < 30; k++) {
      L.view.rig.yaw += 0.002; L.invalidate(); await frame();
      const mesh = L.scene.children.find((o) => o.userData.layer === layer);
      const mv = L.camera.matrixWorldInverse.elements, pr = L.camera.projectionMatrix.elements;
      const s = mesh.geometry.attributes.aStart, e = mesh.geometry.attributes.aEnd;
      for (let i = 0; i < mesh.geometry.instanceCount; i++) {
        const A = [s.getX(i), s.getY(i), s.getZ(i)], B = [e.getX(i), e.getY(i), e.getZ(i)];
        const g = ends(A, B, mv, pr, f), t = ends(A, B, mv, pr, (x) => x);
        if (!g || !t) continue;
        pieces++;
        let d = Math.abs(Math.atan2(g[1][1] - g[0][1], g[1][0] - g[0][0]) - Math.atan2(t[1][1] - t[0][1], t[1][0] - t[0][0]));
        if (d > Math.PI) d = 2 * Math.PI - d;
        worst = Math.max(worst, d * Math.min(3000, Math.hypot(t[1][0] - t[0][0], t[1][1] - t[0][1])));
      }
    }
    return { worst, pieces };
  }, layer);
}

async function run(browser, base, name, options) {
  console.log(`\n${name}`);
  const page = await browser.newPage(options);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base);
  await page.waitForFunction(() => window.__lancer?.view.rig?.camera, null, { timeout: 15000 });
  await page.waitForTimeout(400);
  const { width, height } = page.viewportSize();

  // No flicker.
  for (const [stop, layers] of [['tallis', ['lanes']], ['tallis-system', ['lanes', 'orbits']], ['tallis-planet', ['lanes', 'orbits']]]) {
    await ev(page, (i) => window.__lancer.focus(i), stop);
    await settle(page);
    for (const layer of layers) {
      const s = await swing(page, layer);
      check(`${stop}: ${layer} hold still as the view turns`, s.pieces > 0 && s.worst < 0.5, `worst swing ${s.worst.toFixed(3)} px over ${s.pieces} piece-frames`);
    }
  }

  // Orbit ⇄ free without a jump.
  await ev(page, () => window.__lancer.focus('tallis-system'));
  await settle(page);
  const button = page.locator('button[data-camera]');
  const a = await camState(page);
  await button.click();
  await page.waitForTimeout(150);
  const b = await camState(page);
  check('the camera button switches to free mode without moving the camera', (await button.getAttribute('data-camera')) === 'free' && b.mode === 'free'
    && Math.hypot(...offsetKm(a.cam, b.cam)) < 1e-3 && a.yaw === b.yaw && a.pitch === b.pitch, `moved ${Math.hypot(...offsetKm(a.cam, b.cam)).toExponential(1)} km`);

  // Look: a drag right moves the scene right.
  const target = 'tallis-iii';
  const before = await ev(page, (i) => window.__lancer.screen(i), target);
  await page.mouse.move(width / 2, height / 2);
  if (options.hasTouch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: width / 2, y: height / 2, id: 0 }] });
    for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: width / 2 + 10 * i, y: height / 2, id: 0 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.mouse.down();
    await page.mouse.move(width / 2 + 60, height / 2, { steps: 6 });
    await page.mouse.up();
  }
  await page.waitForTimeout(150);
  const after = await ev(page, (i) => window.__lancer.screen(i), target);
  const c = await camState(page);
  check('in free mode a drag right turns the view so the scene follows the finger', after[0] > before[0] + 20 && Math.hypot(...offsetKm(b.cam, c.cam)) < 1e-3,
    `Tallis III moved ${(after[0] - before[0]).toFixed(0)} px right; camera stayed put`);

  // Move: toward what is ahead.
  const ahead = await ev(page, () => {
    const L = window.__lancer, r = L.view.rig;
    // Face Tallis III, the giant, to move towards it.
    const t = L.view.targets.get('tallis-iii').place;
    const d = [0, 1, 2].map((i) => (t.anchor[i] - r.camera.anchor[i]) * 9.4607304725808e12 + (t.offset[i] - r.camera.offset[i]));
    const l = Math.hypot(...d);
    r.yaw = Math.atan2(-d[0] / l, -d[2] / l);
    r.pitch = Math.asin(-d[1] / l);
    L.invalidate();
    return 'tallis-iii';
  });
  await page.waitForTimeout(100);
  const d0 = await distTo(page, ahead);
  if (!options.hasTouch) {
    await page.keyboard.down('w');
    await page.waitForTimeout(600);
    await page.keyboard.up('w');
    await page.waitForTimeout(100);
    const d1 = await distTo(page, ahead);
    check('holding W moves forward, towards what the camera faces', d1 < d0 * 0.8, `${(d0 / 1e6).toFixed(1)} → ${(d1 / 1e6).toFixed(1)} million km`);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(100);
    const d2 = await distTo(page, ahead);
    check('the wheel moves back and forth along the view', d2 > d1, `${(d1 / 1e6).toFixed(1)} → ${(d2 / 1e6).toFixed(1)} million km`);
    // Hold W a long time with Shift: the camera must stop short of the giant.
    await page.keyboard.down('Shift');
    await page.keyboard.down('w');
    await page.waitForTimeout(3000);
    await page.keyboard.up('w');
    await page.keyboard.up('Shift');
    const R = await ev(page, () => window.__lancer.view.targets.get('tallis-iii').radiusKm);
    const d3 = await distTo(page, ahead);
    check('the camera stops short of a planet', d3 >= 1.2 * R - 1, `${Math.round(d3)} km from the center, radius ${R} km`);
  } else {
    const cdp = await page.context().newCDPSession(page);
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
    await touch('touchStart', [[width / 2 - 40, height / 2], [width / 2 + 40, height / 2]]);
    for (let i = 1; i <= 8; i++) await touch('touchMove', [[width / 2 - 40 - 15 * i, height / 2], [width / 2 + 40 + 15 * i, height / 2]]);
    await touch('touchEnd', []);
    await page.waitForTimeout(150);
    const d1 = await distTo(page, ahead);
    check('a pinch outward moves forward', d1 < d0 * 0.8, `${(d0 / 1e6).toFixed(1)} → ${(d1 / 1e6).toFixed(1)} million km`);
  }

  // Back to orbit with the button: no jump.
  const e0 = await camState(page);
  await button.click();
  await page.waitForTimeout(150);
  const e1 = await camState(page);
  check('the button switches back to orbit without moving the camera', e1.mode === 'orbit' && (await button.getAttribute('data-camera')) === 'orbit'
    && Math.hypot(...offsetKm(e0.cam, e1.cam)) < 1e-3, `moved ${Math.hypot(...offsetKm(e0.cam, e1.cam)).toExponential(1)} km; focus ${e1.focus}`);

  // A click in free mode flies to the object and returns to orbit.
  await button.click();
  await page.waitForTimeout(150);
  const p = await ev(page, () => window.__lancer.screen('tallis-iii'));
  if (options.hasTouch) await page.touchscreen.tap(p[0], p[1]); else await page.mouse.click(p[0], p[1]);
  await page.waitForTimeout(100);
  await settle(page);
  const g = await camState(page);
  check('in free mode a click on something flies there and returns to orbit', g.mode === 'orbit' && g.focus === 'tallis-iii' && (await button.getAttribute('data-camera')) === 'orbit', `focus ${g.focus}, mode ${g.mode}`);
  check('no page errors', errors.length === 0, errors.join('; '));
  await page.close();
}

const server = await createServer({ logLevel: 'error', server: { port: 5191, strictPort: true } });
await server.listen();
const base = 'http://localhost:5191/';
const browser = await chromium.launch();
try {
  const warm = await browser.newPage();
  await warm.goto(base);
  await warm.waitForTimeout(3000);
  await warm.close();
  await run(browser, base, 'desktop', { viewport: { width: 1280, height: 800 } });
  await run(browser, base, 'phone', devices['Pixel 7']);
} finally {
  await browser.close();
  await server.close();
}
const pass = results.every(Boolean);
console.log(pass ? `\nPASS: ${results.length} checks` : `\nFAIL: ${results.filter((r) => !r).length} of ${results.length} checks`);
process.exit(pass ? 0 : 1);
