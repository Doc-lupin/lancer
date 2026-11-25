# Phase 2: 3D view — work plan

**Status: in progress. Tasks 2.1–2.5 done.** Branch `phase-2`, cut from `main` on Nov 25, 2026. The Phase 1 test still passes on it (`python3 tools/validate_map.py --complete`: 0 errors, 0 warnings).

Phase 2 checklist and test are in [PLAN.md](PLAN.md). This file breaks them into small tasks and lists what must be decided first.

**Exit test (from PLAN.md):** zoom Basin → planet and back without a break; no shaking; smooth on a phone.

## What the data gives the view

Measured on `data/map.json` at the start of the phase:

| Item | Count or range |
|---|---|
| Regions | 24 (the Furnace and the Mire have an `effect`) |
| Systems | 155: 144 star centers, 7 rogue planets, 3 wrecks, 1 structure; 40 have `charted: false` |
| Bodies | 329: 118 planets, 27 gas giants, 20 moons, 39 stations, 71 lane mouths, 4 companion stars, 9 wrecks, 7 rogue planets, 10 asteroids, 6 belts, 14 fields, 4 structures |
| Places | 163, each on a body at `at: [lat, long]` |
| Lanes | 37, each end a system and a lane-mouth body |
| System positions | Light-years, all within 24.4 ly of the origin |
| Orbits in AU | 272, from 0.006 to 120 AU |
| Orbits in km | 46, from 12 km to 6,200,000 km |

The smallest thing the GM will look at closely is a station a few hundred metres across; the largest view is the whole Basin, about 49 ly (4.6 × 10^14 km). That is a range of about 10^15, two orders more than the 10^13 in the risk table. The precision test (task 2.4) has to cover it.

## Decisions needed

Each has a recommended default. Task 2.1 needs P1 and P2; task 2.4 needs P3 and P4. The others can wait until their task.

**Decided Nov 25, 2026 (GM):** P1, P2, P6 and P10 as recommended. The others stand at their recommended default until their task.

| # | Question | Recommended |
|---|---|---|
| P1 | Language | Plain JavaScript with JSX. TypeScript would be a new tool. |
| P2 | Packages | `three`, `react`, `react-dom`, `@react-three/fiber`, `@react-three/drei`, `zustand`, and as dev tools `vite` and `@vitejs/plugin-react` (Vite's React plugin, needed to build JSX; asking because it is not named in CLAUDE.md). Exact versions pinned in `package.json`, with `package-lock.json` committed. |
| P3 | Floating origin | **Revised in task 2.4.** A position is a *place*: an anchor in light-years (normally its system's `pos`) plus an offset in km from it (`src/views/origin.js`). Each frame the view works out every object's offset from the camera's place, anchors first, and hands Three.js only that, so the GPU's 32-bit floats only ever see distances from the camera. The camera itself stays at the scene origin and takes the anchor of the system it is in. (First proposed as one km value per position; 2.4 showed that steps in 31 m at the Keel.) |
| P4 | Depth buffer | `logarithmicDepthBuffer: true` on the renderer, near plane 1 m, far plane 10^16 km. **Confirmed in task 2.4, with a layer rule:** two surfaces stay apart only if their gap is more than about 6 × 10^-5 of their distance from the camera, so a layer (atmosphere, clouds, a marker on a surface, a hull plate) is drawn only while its gap is at least 2 × 10^-4 × its distance. A 1% atmosphere shows within 50 radii. If a phone still shows depth flicker, fall back to two passes (far stars, then the near system). |
| P5 | Sizes on screen | True positions always. Stars, systems and icons drawn with a minimum size in pixels, so they stay visible from far away; a body becomes a true-size sphere once it is larger than that minimum. No exaggerated planet sizes. |
| P6 | Camera control | Our own small controller in `src/views/camera/`: orbit around a focus, zoom by a ratio per wheel step or pinch (so one gesture works at every scale), fly to an object on click, zoom out to the parent when the camera passes the parent's view distance. drei's `CameraControls` assumes a fixed target and fights the rebasing in P3. drei is still used for text labels. |
| P7 | Loading `map.json` | Fetched once at start (`import url from '../../data/map.json?url'`, then `fetch`), not bundled into the code. The file stays in `data/`, read-only, per D5. |
| P8 | Star colors and luminosities | Port the `STAR` table of `tools/derive_stats.py` by hand to `src/data/starKinds.js`, plus a check in `tools/` that both tables list the same kinds and values. |
| P9 | JavaScript tests | Node's built-in test runner (`node --test`) for data helpers; no new library. Scripted browser checks with the Playwright that is pre-installed in this environment, kept in `tools/` and not added to `package.json`. |
| P10 | Phone for the test | The GM names a phone. Until then: Chromium's phone emulation with 4× CPU throttling. "Smooth" = at least 30 frames per second throughout the zoom, aiming for 60. |
| P11 | Planet look in Phase 2 | Sphere tinted from `appearance.color`, rings where given, a thin atmosphere shell. Textures and clouds later (they belong to the risk "planet surfaces"). |
| P12 | Lanes | A straight line from mouth body to mouth body. One-way lanes get chevrons along the line pointing the way of travel; drifting lanes are dashed ("broken"). In Phase 2 tidal lanes take their open or closed state from `clock.current` once at load; the live clock comes in Phase 3. |
| P13 | Player mode in Phase 2 | A `playerMode` flag in the store from task 2.2, default off (GM). Views skip `visibility: "gm"` objects when it is on. The switch in the interface is Phase 4. |

## Tasks

One task = one session's work, touching only the files listed. Do them in order. Each task ends with `npm run build` passing (from task 2.1 on) and the Phase 1 check still passing.

| # | Task | Function | Files | Done when |
|---|---|---|---|---|
| 2.0 | Settle P1–P13 | — | `docs/PHASE2.md` | Answers recorded here |
| 2.1 | (done) App scaffold: Vite + React + R3F, one empty canvas filling the page | Continuous zoom | `package.json`, `package-lock.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/views/Scene.jsx` | `npm run dev` shows a black canvas; `npm run build` passes |
| 2.2 | (done) Store: load `map.json` once into Zustand; lookups by id; parent chain (body → system → region); "(WIP)" stripped for display, as in `tools/describe_world.py`; `playerMode` flag (P13) | Data storage | `src/storage/loadMap.js`, `src/data/store.js`, `src/data/names.js`, `src/data/store.test.js`; one line each in `src/main.jsx` (start the load) and `package.json` (`npm test`) | `node --test` loads the file and finds 24 regions, 155 systems, 329 bodies; every parent chain resolves |
| 2.3 | (done) Star kinds table (P8) | Continuous zoom | `src/data/starKinds.js`, `tools/check_star_kinds.py` | Every `kind` in `map.json` has a color and luminosity; the check passes |
| 2.4 | (done) Precision test, first, as the risk table asks: floating origin and log depth (P3, P4) with three test objects, one at each scale (ly, AU, km), and a scripted zoom from 50 ly to 1 km above a station | Continuous zoom | `src/views/origin.js`, `src/views/PrecisionTest.jsx`, `tools/check_jitter.mjs`; `src/main.jsx` (opens the test with `?test=precision`) | With the camera still, no test object moves more than half a pixel between frames at any step; no depth flicker. The GM looks at the screenshots |
| 2.5 | (done) Camera controller (P6): orbit, zoom by ratio, pinch and drag on touch, click to fly to an object, zoom out to the parent | Continuous zoom | `src/views/camera/*.js`; `src/main.jsx` (opens the test with `?test=camera`); `tools/check_camera.mjs` | One wheel or pinch gesture covers Basin to station; the fly-to ends on the object with no overshoot. (Met as one unbroken zoom with the same ratio per notch; see the notes.) |
| 2.6 | Regions and stars from the store, instanced; star color and brightness from `starKinds`; unmapped stars dimmer; region labels at the Basin level (P5) | Continuous zoom | `src/views/Stars.jsx`, `src/views/RegionLabels.jsx` | 155 systems drawn in one or two draw calls; labels readable on a phone |
| 2.7 | Lanes faded by default; lanes mode bright with day and type labels; one-way chevrons; drifting lanes dashed; tidal open or closed from the clock (P12) | Lanes mode | `src/data/lanes.js`, `src/data/lanes.test.js`, `src/views/Lanes.jsx`, `src/interface/LanesToggle.jsx` | All 37 lanes drawn; the toggle switches modes; the tidal state for day 300 is "open, 9 more days" |
| 2.8 | Region effects: a simple glow or particle cloud for the Furnace's nebula and the Mire's dust; non-star centers (rogue planet, wreck, structure) with their own instanced icons | Continuous zoom | `src/views/RegionEffects.jsx`, `src/views/Centers.jsx` | Both effects visible from the Basin level; every system center type has an icon |
| 2.9 | System level: center star and companion stars, planets and giants placed by orbit and clock, orbit lines, belts and fields, lane mouths, stations | Continuous zoom | `src/data/orbits.js`, `src/data/orbits.test.js`, `src/views/System.jsx` | Orbit angle = `phaseDeg + 360 × days since epoch / periodDays`, tested against three hand-worked bodies; Ostrom and Tallis look right to the GM |
| 2.10 | Planet level: globe with tint and rings (P11), moons and stations on km orbits, surface places as markers at their latitude and longitude | Continuous zoom | `src/views/Planet.jsx`, `src/views/Places.jsx`, `src/data/globe.js`, `src/data/globe.test.js` | Scald's places sit on either side of the Seam; Tallis's moons and stations are in orbit |
| 2.11 | Phase 2 test: scripted zoom Basin → Tallis → planet → station and back, on desktop and in phone emulation (P10); jitter and frame-rate log; the GM tries it on their phone; tick the boxes in PLAN.md | — | `tools/check_zoom.mjs`, `docs/PLAN.md`, `docs/PHASE2.md` | Exit test passes |

Tasks 2.1–2.5 have no map content worth showing; the first look at the Basin comes with 2.6.

## Risks for this phase

| Risk | What to do |
|---|---|
| Range of scale is ~10^15, not ~10^13 | Done in task 2.4: anchored places hold under 0.001 px from 50 ly to 0.5 km. No zoom cap needed. |
| Log depth costs fill rate on phones | Not measurable in task 2.4: the headless browser draws in software. Measure in task 2.11 on the GM's phone; fall back to two passes (P4). |
| 745 KB `map.json` on a phone connection | Fine for private use. If start-up is slow, gzip on the host serves it at about a tenth. |
| Labels at every level crowd the screen | Labels only for the level in view and its children, fading with distance. |
| Clicking small objects on a phone | Pick by screen distance to the icon, not by ray hit on the true-size mesh. |

Notes from 2.1:
- Pinned versions: three 0.187.0, react and react-dom 19.3.1, @react-three/fiber 9.8.2, @react-three/drei 10.7.9, zustand 5.1.0; dev tools vite 8.3.8 and @vitejs/plugin-react 6.3.0. Each was at least two weeks old when chosen, and the peer dependencies agree.
- Checked with Playwright: on desktop (1280 × 800) and on Pixel 7 emulation the canvas fills the window at the device's pixel ratio and the page does not scroll. `touch-action: none` on the root sends touch gestures to the map (needed for pinch in 2.5).
- The build is 1.1 MB (311 KB gzipped) with an empty scene, because React Three Fiber pulls in all of Three.js. Vite warns about chunks over 500 kB; the warning is left on for now. Fine for private use; revisit in Phase 5 if loading on a phone is slow.
- The console shows one warning, "THREE.Clock: This module has been deprecated", coming from React Three Fiber 9.8.2 itself. Harmless; it goes away when R3F moves to `THREE.Timer`.

Notes from 2.2:
- The store is `useMap` in `src/data/store.js`: `status` (empty, loading, ready, error), `map` (the file as loaded), `index` and `playerMode`. `index` holds `byId`, `kindOf`, `parentOf` and `childrenOf` over regions, systems, bodies, places, areas, lanes, factions and layers: 773 ids, none repeated. A repeated id or a parent that isn't in the map stops the load with an error.
- Parent chain: place or area → body → parent body (for a moon or a station around a planet) → system → region. The 40 unmapped stars have `region: null`, as the schema allows, so their chains stop at the system; views treat them as children of the Basin.
- Player mode hides an object if it, or anything above it, is GM-only. No visible object sits under a GM-only one today; the rule stops a later edit from leaking one.
- `displayName()` drops a trailing " (WIP)", the same rule as `clean_name()` in `tools/describe_world.py`.
- `npm test` runs `node --test "src/**/*.test.js"`: 6 tests pass.
- `npm run build` copies `map.json` into `dist/assets/` under a hashed name (745 KB, 102 KB gzipped). Checked in the browser on the dev server and the built preview: one fetch, store `ready`, no console errors. The first dev start after installing reloads the page once while Vite prepares zustand; later starts fetch once.

Notes from 2.3:
- `STAR` in `tools/derive_stats.py` gives a color word ("swollen red"), not a color the screen can use. `src/data/starKinds.js` copies luminosity, temperature and the word, and adds two columns for the view: `color`, a display color picked by hand to match the word, a little stronger than true star colors so kinds stay apart on a dark map; and `radius` (Sun = 1), worked out from luminosity and temperature with the same formula `derive_stats.py` uses for its stats.
- The formula doesn't fit four groups, so their radius is set by hand: neutron stars, pulsars and magnetars at 10 km; the black hole at its event horizon for 8 Suns (23.6 km, mass from `MASS`); brown dwarfs at 0.1, about Jupiter's size (the formula gives 0.4 because the table's brown-dwarf luminosity is high for 1200 K). The black hole's display color is its accretion disk's glow.
- `python3 tools/check_star_kinds.py` compares the two tables through Node: same 24 kinds as `STAR` and the schema; the three copied columns exact; every color `#rrggbb`; radii within 1% of the formula except the hand-set ones; all 23 kinds used in `map.json` present. Tried against a broken copy (a changed luminosity, a wrong radius, a color word in place of a hex, a missing kind): all four reported, exit code 1.
- If `STAR` changes in Python, run the check; it names the rows to update in `starKinds.js`.

Notes from 2.4:
- Run with `node tools/check_jitter.mjs [--out DIR]` (about 20 seconds). It starts Vite, opens `?test=precision` in headless Chromium on a 1280 × 800 desktop window and on Pixel 7 emulation, and zooms on a test station at the Keel, the system farthest from the origin, from 50 ly to 0.5 km in 17 steps, circling slowly for 20 frames at each.
- For every corner of every test object, the screen position the GPU draws (the page's real matrices, multiplied in 32-bit floats as a GPU does) is compared with the exact position (whole-number arithmetic from the same places). Jitter is how much that difference changes from frame to frame.
- Result with anchored places: jitter and error under 0.001 px at every step on both devices. With one km value per position, the first form of P3, the same zoom jitters by 16 px at 1 km on desktop and 33 px on the phone, and fails from 47 km in. 64-bit numbers near the Keel step in 31 m (2 m near Ostrom), which is the cause. P3 now uses anchored places.
- Depth: each test object is a green surface over a red one (plates 1 m apart on the station; spheres 1% of the radius apart on the planet and the stars), and any red pixel counts as a failure. A resolution sweep shrinks the planet's gap seen from about 34,000 km: clean at 8.8 × 10^-5 of the distance and above, red from 5.9 × 10^-5 down. Depth is worked out per pixel and drifts at triangle edges, which is why it fails earlier than one step of the buffer (2.2 × 10^-6) would suggest. The layer rule in P4 keeps three times that margin. With it, no red pixel at any step on either device.
- Open `?test=precision` in a browser to watch the test zoom by itself; add `&mode=naive` to see the plain-km version shake up close. The test is loaded only on that address and adds 3.7 KB in its own file; the map's code is unchanged.
- Not measured here: speed. The headless browser draws in software, so frame rates mean nothing. That is task 2.11, on the GM's phone.

Notes from 2.5:
- Files in `src/views/camera/`: `rig.js` (the camera's state and moves as plain functions), `view.js` (the one rig and the registry of things it can focus on), `pick.js`, `CameraRig.jsx` (mouse and touch input, per-frame camera update), `useAnchored.js` (places an object relative to the camera each frame and keeps it at least a few pixels wide, P3 and P5), `CameraTest.jsx` (test scene at `?test=camera`), `rig.test.js`.
- Controls: drag with the mouse or one finger to orbit; wheel or pinch to zoom; click or tap to fly. Zooming in with the pointer over something inside the focus makes it the focus; zooming out past twice the distance to the parent hands the focus up a level (`LEAVE_FACTOR`), and the parent slides to the middle of the view.
- Zoom is 1.5× per wheel notch at every scale and follows the finger spread exactly on a pinch. The test's "one gesture covers Basin to station" is met as one unbroken zoom, not one flick: 50 ly to the station is a factor of 10^15, so the browser check takes 87 notches (35 to the Keel's star, 24 to the planet, 28 to the station), moving the pointer onto the next object as it comes apart from its parent. A single pinch covering 10^15 would make every ordinary zoom uncontrollable. Clicking is the fast way: each fly-to takes 0.8 to 3 seconds whatever the distance.
- Flights: the target moves along a straight line at an eased pace; the distance follows a smooth curve in log scale and rises mid-flight when the journey is longer than the view. Checked in `rig.test.js` for all 16 flights between the four test levels, and in the browser for clicks and taps: every flight ends exactly on the object (the same anchor and offset), the target never moves backwards or past it, and the camera never comes closer than the end distance.
- Picking is by screen distance (14 px for a mouse, 24 px for a finger) or anywhere on the object's disc when it is bigger than that. A child within 2 × that radius of its parent on screen can't be picked, so a planet beside its star seen from light-years away gives the star.
- The scene redraws only when something moves (`frameloop="demand"`), which saves the phone's battery when the map is still.
- Rule for the views: a body's closest distance (`minKm`) is about 2.5 × its radius. At 0.2 km the 0.3 km test station filled the screen; 0.4 km frames it.
- `node tools/check_camera.mjs [--out DIR]` runs 22 checks with real input events on desktop and Pixel 7 emulation (pinch via two touch points), about 30 seconds: all pass. `npm test` (11 tests), the precision test and the Phase 1 check still pass.

