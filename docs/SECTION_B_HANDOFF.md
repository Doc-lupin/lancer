# Section B: Handoff (Nov 27, 2026, after Phase B0)

What a new session needs to continue Section B ([SECTION_B.md](SECTION_B.md)).
Read this, then `CLAUDE.md`, then the plan's Section 8 (decisions BD1 to BD15).

## 1. Where things stand

- **Phase B0 is done** (B0.1 to B0.11) **and merged into `main`**. The GM
  closed it without its final test run. Work log: [PHASE_B0.md](PHASE_B0.md) (what each task built, its
  results, decisions BQ1 to BQ4, the B0 test status).
- **Next: Phase B1** (orbits and motion), then **Section A Phase 3** (the
  interface and the clock, which B1.9 needs), then **Phase B2** (BD5). B2
  starts with B2.0 (the world test bed) and uses WebGPU at the high and ultra
  tiers (BD14).
- **The map is for desktop browsers only** (BD13). **Quality comes first**
  (BD15): design for mid-range desktop GPUs; the low tier must work.

## 2. Branches

| Branch | Holds |
|---|---|
| `main` | Section A Phases 0–2 and Section B Phase B0, merged from `section-b` on Nov 27, 2026 (at the commit that added this sentence). The GM asked for the merge; Phase B0's final test was not run (see [PHASE_B0.md](PHASE_B0.md)). |
| `section-b` | The Section B working branch. **Continue Section B here**, and merge it into `main` when the GM approves a phase. Equal to `main` at the merge. |
| `ccr-23ad96e8-4fi4vg` | An older session's branch; everything on it is in `main`. Can be deleted. |
| `phase-2` | The Phase 2 state, for history. |

## 3. What Phase B0 built

| Area | Files | Notes |
|---|---|---|
| HDR pipeline (B0.4) | `src/views/Output.jsx`, `color.js`, `exposure.js` | Half-float linear buffer; one tone map at the end (Khronos Neutral's shoulder, no toe); our own shaders end with `fromDisplay(color × alpha)`; exposure on light, not on chart marks |
| Bloom (B0.5) | `Output.jsx`, `bloom.js`, `Stars.jsx`, `Planet.jsx` | Threshold 2 (chart marks never pass 1.93); star cores pass white only near a star and while their disc is small; lava at 4 × exposure; bloom skipped when nothing can bloom |
| Quality tiers (B0.6) | `src/views/quality.js`, `src/interface/QualityToggle.jsx` | low, medium, high (default), ultra; `?quality=`; Quality button and Q key |
| World Lab (B0.7) | `src/interface/WorldLab.jsx` | Development builds only (`leva`); maps on the WIP worlds; exposure, quality, WIP switch |
| Shader library (B0.8) | `src/views/shaders/` | Hash, noise, scattering, color, each GLSL function with a JavaScript twin and tests |
| Job queue (B0.9) | `src/views/jobs.js`, `surfaces.js` | Bakes a tile at a time; a globe shows when its maps are ready (`globeShown`) |
| Cache (B0.10) | `src/storage/bakeCache.js` | IndexedDB, PNG maps, 48 worlds / 256 MB; key from the painter's version and settings |
| WIP switch (BQ1) | `src/views/planet/switch.js`, `procedural.js` | The WIP worlds are off by default (`?worlds=wip` in development); the Phase 2 painter serves meanwhile |

B0.7 to B0.10 were built and unit tested (`npm test`, 67 tests), not tried in
a browser.

## 4. The WIP planet work (src/views/planet/)

Off by default (BQ1). Phase B2 continues from it.

| File | Does | Plan task |
|---|---|---|
| `cubeSphere.js` (+ test) | Cube-sphere quadtree level of detail | B2.1 |
| `noise.js` | Older GLSL noise; moves to `src/views/shaders/` | B2 |
| `recipes.js` | World data → settings for about 40 world types | B4.11 (catalog) |
| `fields.js` | Bakes shape and climate cube maps at once; static Voronoi plates | B2.1 (onto the queue), B2.2 (simulation) |
| `biomes.js` | One biome table per world | B4.9 replaces it |
| `terrain.js` | Ground shader; World Lab maps (`uDebug` 1–7) | B2, B5 |
| `gas.js`, `clouds.js`, `atmosphere.js`, `rings.js` | Giants, clouds, single scattering, rings | B6, B3.7, B5.4, B6.6 |
| `ProceduralGlobe.jsx` | Puts it together | — |

Known issues: tectonics are static and coasts come from noise (B2.2); one
biome table per world (B4.9); haze over the ground reduced by hand (B5.4);
faint moisture streaks along the winds; hazy worlds use the gas shader; from
the Tallis relay the WIP Tallis globe draws as a grid of patch edges
(`docs/section-b/baseline/wip/`, view 40). Their shaders output linear light
now (B0.4) and come out darker than before; tune when B2 turns them on.

## 5. Checks

**Run them only when the GM asks** (plan rule 10). When asked:

- `tools/check_all.sh --quick` while working: unit and data checks, the ten
  Section A browser checks (seven in parallel), and 12 views.
- `tools/check_all.sh` before an approval: all 40 views.
- Desktop only (BD13). `--phone` on a Section A check, or `--device phone` on
  a view tool, still runs the old Pixel 7 emulation.

Reference: `docs/section-b/baseline/accepted/` (the B0.5 look, desktop): the
pictures, `baseline.json` (numbers), `contrast.json` (labels). Record it again
only after the GM approves a new look, from a git worktree at the approved
commit, so nothing else changes the files meanwhile:
`node tools/record_baseline.mjs --out docs/section-b/baseline/accepted`.
`phase2/` and `wip/` are history.

## 6. Review link

https://claude.ai/artifact/K9tk8ckJppNExxZyuMYquM (version 5, Nov 27:
`section-b` at `8a936eb`, with the HDR pipeline, bloom and quality tiers; the
World Lab is not in it). It was the phone link before BD13; open it in a
desktop browser. To update: `npm run build && node tools/phone_link.mjs --out
DIR`; read the artifact first (`action: "read"`); publish DIR/index.html to
that URL with the assets as `files` and `null` for the previous script's path.
Scan the script for addresses, private links and keys first.

## 7. Open items

- Try B0.7 to B0.10 in a browser: the World Lab, the job queue (no held
  frames; globes appear when ready), the cache (second visits).
- Shader compile stalls of 72 to 116 ms on ordinary flights: compile at load
  (`compileAsync`).
- Slagfall's held frame of 2.2 s at the low tier (B0.6): measure again.
- The shader library's GLSL is compiled first when a shader uses it.
- The WIP fields bake at once: onto the queue and into the cache in B2.1.
- After a flight, a remembered label spot can leave out a name that a fresh
  placement fits (Ostrom, 3 of 4 named): readability, later.

## 8. Lessons learned

Shaders and color:

- Our own shaders compute display colors and end with `fromDisplay()`
  (`color.js`): convert color × alpha together, so a mark over black looks
  as written. Layers laid over (dust) convert before alpha.
- Light that should bloom must pass a luminance of 2; chart marks never do.
- Shared uniforms (`EXPOSURE`) are plain objects shared by materials; never
  write their `.value` from one material.
- GLSL reserved words: `half`, `patch`. Use `sat`, not `saturate`. Do not name
  a variable `step`. A division by a uniform that can be 0 gives NaN, which
  turns the map black.

Depth and scale:

- A gap between two layers must be at least 2 × 10⁻⁴ × the camera distance.
- Values that vary across a shape fail at light-year distances: use flat
  varyings and `gl_FragCoord`.

Checks:

- Headless Chromium draws in software: frame times are for comparing
  versions on one machine only. A real GPU (the GM's computer, through Remote
  Control) would make the checks fast and their numbers real.
- Pictures must depend on the view only: the tools forget the labels' last
  spots before a shot and hide the orbit hint.
- Do not edit `src/` while checks run: their Vite servers reload.
- Parallel Vite servers share one dependency cache; `check_stars` runs alone
  first to build it.
- Load Playwright with `createRequire`; do not install it again.

## 9. The GM's way of working

- One task at a time; the GM approves each phase and each change of look.
- Plain writing, no filler; the plan is in ASD-STE100 (simplified technical
  English).
- Give options with a recommendation. "Go with your recommendations" is an
  approval; record it in Section 8 or in the phase log.
- No checks unless asked; say how long a run will take.
- Quality over cheap systems; desktop browsers only.
- Invented content gets the `invented` origin tag and "(WIP)" at the end of
  its name.
