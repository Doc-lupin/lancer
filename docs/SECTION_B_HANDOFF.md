# Section B: Handoff (Nov 26, 2026)

What a new session needs to continue Section B ([SECTION_B.md](SECTION_B.md)).
Read this, then `CLAUDE.md`, then start Phase B0 (task B0.1).

## 1. Branches

| Branch | Holds |
|---|---|
| `main` | Section A Phases 0–2 (accepted), the Section B plan. |
| `section-b` | `main` + the procedural planet work (off by default: `?worlds=wip` in development, decision BQ1) + the tools below + this file. **Work here.** |
| `ccr-23ad96e8-4fi4vg` | The previous session's branch. Everything on it is also on `section-b`; it can be deleted. |
| `phase-2` | Same as the Phase 2 state of `main`. Kept for history. |

The parked planet work is one commit ("WIP: procedural planet overhaul") on
top of `main`. `main` does not have it, because it has not passed the browser
checks.

## 2. The procedural planet work (src/views/planet/)

Planets, moons, gas giants and rogue planets with no imported maps now get a
procedural globe. Asteroids, wrecks and structures, and any body with an
imported texture or a registered provider (`surfaces.js`), keep the Phase 2
globe.

| File | Does | Plan task it starts |
|---|---|---|
| `cubeSphere.js` (+ test) | Cube-sphere quadtree level of detail; 32 × 32 patches, skirts, one instanced draw call. | B2.1 |
| `noise.js` | GLSL: gradient noise, fbm with octaves/persistence/lacunarity, ridged noise, cells, craters, tone map. | B0.8 |
| `recipes.js` | World data → settings, by `world` (about 40 types), varied per body by seed; air from pressure and sky colour; sunlight colour from the star; place hints. | B4.11 |
| `fields.js` | Bakes two cube maps per world: shape (static Voronoi plates with convergent and divergent boundaries, noise, basins, craters, volcanoes, the pull of places) and climate (temperature, moisture by an upwind march to the sea, cloudiness). Sets the sea level from the data's water share by a read-back probe. | B2, B3 |
| `biomes.js` | One 64 × 32 lookup table (Whittaker type) per world. | B4.9 replaces it |
| `terrain.js` | Ground shader: displacement on the patches, per-pixel detail, normals, biome or mineral colours, seas (water, ice, lava, tar), glow, city lights, cloud and ring shadows, aerial perspective, debug views (`uDebug`). | B2, B5 |
| `gas.js` | Gas giants and hazy worlds: jets, turbulence, storms, polar hexagon, streaks, thermal glow, ring shadow. | B6 |
| `clouds.js` | Cloud shell (1.008 R) and the shared cloud-cover function. | B3.7 |
| `atmosphere.js` | Single-scattering ray march (Rayleigh and Mie) and the sky shell. | B5.4 replaces it |
| `rings.js` | Ring textures and material (moved out of `Planet.jsx`). | B6.6 |
| `ProceduralGlobe.jsx` | Puts it together; keeps 8 worlds' fields (LRU). | — |

Pictures of the state at this handoff are in `docs/section-b/`. The two world
sheets are from earlier tuning passes. Lava glow, ocean glint and city lights
were toned down after them. `wip-close-ups.jpg` is the latest.

### Known issues and open work

1. **Checked Nov 26:** every check passes except `check_zoom` (3 of 24 fail: held frames from bakes, and CPU work per frame on phone). Details and decision BQ1 in [PHASE_B0.md](PHASE_B0.md). Place markers were lifted from 0.002 to 0.006 R (`Places.jsx`, `LIFT`); `check_planet` still passes.
2. **Bakes stop the view.** A world's fields bake when its globe first shows: two cube maps (256² a face), with three 48-step upwind marches for each climate texel. Phase B0.9 (job queue) and B0.10 (IndexedDB cache) fix this. Frame time and bake time are not measured yet.
3. **Tectonics are static.** Plates are Voronoi cells with a motion each, not a simulation over time (B2.2). Coasts come from noise, so they don't follow plate edges.
4. **One biome table per world.** B4.9 replaces it with a biome map and a catalog.
5. **Haze over the ground is reduced by hand** (`terrain.js` and `clouds.js`: transmittance mixed 70%, in-scatter × 0.55) so that land reads clearly. B5.4 (precomputed scattering) replaces this.
6. **Moisture** still shows faint streaks along the winds. A per-pixel jitter of the climate lookup hides the grid.
7. **Labels behind a globe** were seen once over the globe at a very close camera (`occlusion.js`). Not yet reproduced.
8. **Hazy worlds** (hothouse, steam, toxic, dense air, methane sea) use the gas shader. Their surfaces are never shown.
9. **Grid instead of a surface.** From the Tallis relay, Tallis's globe draws as bright patch edges with no surface (baseline view 40, `docs/section-b/baseline/wip/`).

## 3. Tools added for Section B

| Tool | Use |
|---|---|
| `node tools/shoot_views.mjs --views '<json>' [--phone] [--sheet NAME]` | Screenshots of chosen views (focus, close-up, angles, distance, debug view). For baselines (B0.1), the gallery (B11.2) and debugging. |
| `node tools/check_cubemap.mjs` | Checks that cube maps read back in the right orientation. Passed with three 0.187.0. |
| `npm run build && node tools/phone_link.mjs --out DIR` | Assembles the phone-link files from `dist/`. |

The review link (the phone link before BD13: the map is now for desktop
browsers only) is https://claude.ai/artifact/K9tk8ckJppNExxZyuMYquM (version
5, Nov 27: `section-b` at `8a936eb`, with the HDR pipeline, bloom and quality
tiers; the World Lab is not in it, as it is in development builds only). To update it from a new session: read it first with
the Artifact tool (`action: "read"`), then publish DIR/index.html to that URL
with the assets as `files`, and `null` for the previous script's path.

## 4. Lessons learned

Shaders:

- GLSL reserved words: `half`, `patch`. Three.js defines `saturate` as a macro in `<common>`; use `sat`. Do not name a variable `step`.
- Our own shaders write straight to the screen. Convert colours (`displayColor` in `color.js`), or tone map and gamma-encode at the end, as the planet shaders do.
- A value that varies across a shape fails at light-year distances. Use flat varyings and `gl_FragCoord` (stars, sprites, lanes). Shaders in a planet's own frame are fine close up.
- A division by a uniform that can be zero gives NaN, and NaN turns the whole map black. (A gas giant without a storm did this.)
- Store baked values in 0–1 so the 8-bit fallback works where half floats can't be drawn to.

Depth and scale:

- Layer rule: a gap between two layers must be at least 2 × 10⁻⁴ × the camera distance. Globes show within about 40 radii. Shells: clouds 1.008 R, air top 1.022–1.03 R; terrain displacement at most 0.005 R; place markers 0.006 R.
- The floating origin puts the camera at the scene origin. A sphere centred there is the sky.

Checks:

- Headless Chromium draws in software, so bakes and big shaders are slow there. Give checks small sizes; give the gallery full sizes.
- Each check uses its own Vite port. Run the whole suite in the background; it takes about 25 minutes.
- To compare still frames, take the screenshots with `animations: 'disabled'`, because labels and hints fade by CSS.
- Load Playwright with `createRequire` (see any `tools/check_*.mjs`); do not install it again.

## 5. The GM's way of working

- One phase at a time. The GM approves each phase, often after a look on the phone.
- The GM asked for the Section B plan in ASD-STE100 (Simplified Technical English). Keep writing plain, with no filler.
- The GM picks from options; give a recommendation with each question.
- Invented content gets the `invented` origin tag and "(WIP)" at the end of its name.
