# Phase B0: Foundation and measurement — work log

Tasks, test and functions are in [SECTION_B.md](SECTION_B.md), Phase B0.
Branch `section-b`.

**Status (Nov 27, 2026): B0.1 to B0.4 done; B0.5 (bloom) built and checked,
waiting for the GM's approval (BQ4). Next: B0.6.** BQ1 to BQ3 are decided
and done.

## How to run the checks

`tools/check_all.sh [--quick]` runs everything and prints one line per step:
unit tests, data checks, the ten Section A browser checks (seven in
parallel; camera, controls and zoom alone, because they time input and CPU
work), then the view checks against `docs/section-b/baseline/accepted`.

| Run | What | Time on this machine |
|---|---|---|
| `--quick` | everything; 12 of the 40 views (marked `quick` in `views.json`), fewer frames measured | about 13 min |
| full | everything; all 40 views on desktop and phone | about 27 min |

Use `--quick` while working on a task; run the full set before asking the
GM to approve. The view checks alone: `node tools/check_views.mjs [--quick]`
(`--checks perf,visuals,contrast` to pick). Record a new reference after an
approval: `node tools/record_baseline.mjs --out docs/section-b/baseline/accepted`.

Before Nov 27 the same work took about 2 hours: each of the three view
checks loaded all 80 views itself, each view waited up to 9 s for the orbit
hint to fade, and the Section A checks ran one after another.
`tools/viewcheck.mjs` now loads each view once and runs all three checks on
it; the tools hide the hint with a style rule. Checked on the approved code:
all 80 pictures identical to the reference, every view within budget, no
label lost contrast, in 19 minutes against about 80.

## Checks at the start of the phase

The handoff ([SECTION_B_HANDOFF.md](SECTION_B_HANDOFF.md), issue 1) says to
run all checks first, because the parked planet work was not checked.
Results on `section-b` at commit `8abcef4` (the WIP planet work):

| Check | Result |
|---|---|
| `npm test` | 50 of 50 pass |
| `validate_map.py --complete`, `test_validate_map.py`, `world_catalog.py --check` | pass |
| `check_cubemap`, `check_stars`, `check_lanes`, `check_effects`, `check_camera`, `check_jitter`, `check_system`, `check_planet`, `check_controls` | pass |
| `check_zoom` (the Phase 2 test) | **3 of 24 fail** |

The three `check_zoom` failures:

1. and 2. "Without a break", Basin → station, desktop and phone. On the
   flight from the Tallis close-up to the Tallis relay, one frame is held
   for 1.1–1.2 s. The moons' procedural globes bake when they come into
   view. The flight is timed, so after the held frame the camera is far
   along its path: the target moves 14,528 distances/s (desktop) and 2,998
   (phone); the limit is 40. Cause: issue 2 of the handoff. B0.9 (job queue)
   and B0.10 (cache) remove it.
3. "Our work per frame under 11 ms" on phone: 18.4 ms at the station stop
   (11.5 and 13.1 ms at the planet stops). The procedural globes add CPU work
   in each frame (level-of-detail selection on the cube sphere).

So `section-b` did not pass the Phase 2 test. Section B rule 2 says that all
Section A checks must pass after each task. See BQ1.

### The same checks on `main`, on this machine

`main` was checked again in this container for comparison (Nov 26):

| Check on `main` | Result here | Result when Phase 2 was accepted |
|---|---|---|
| `check_zoom`, work per frame on phone | **fails**: 14.7 ms at the station stop, 12.3 ms at the planet | 4.9 ms at most |
| `check_system` | **fails**: at Ostrom 3 of 4 shown planets are named | pass |

This container's CPU is slower than the machine of the Phase 2 test, so the
11 ms limit fails on `main` too. Against `main` on the same machine, the WIP
globes add about 25% (18.4 ms against 14.7 ms), not the 4× that the old
4.9 ms suggests. The Ostrom label failure also occurs on `main` here, and it
passed once on `section-b` in this container: label placement depends on
timing. Both are faults of the check or the machine, not of Section B work.
They are BQ2.

## B0.1: baseline (done)

`node tools/record_baseline.mjs [--out DIR] [--device desktop|phone] [--only NAME,…]`

The tool goes to each of 40 fixed views (`tools/baseline/views.json`) on a
1280 × 800 desktop window and on Pixel 7 emulation with the CPU slowed 4×
(P10). Each view starts from a fresh page load, so a view does not depend on
the views before it. For each view it saves a JPEG screenshot and records:

| Field | Meaning |
|---|---|
| `flight.worstGapMs` | The longest gap between frames on the flight to the view: a bake that holds the view. |
| `workMs` | Our own CPU work per frame, before three.js draws (median, 95th percentile, max). |
| `frameMs` | Time from one frame to the next, with the draw. |
| `drawCalls`, `triangles` | From three.js, for the last frame. |
| `geometries`, `textures` | three.js memory counts. |
| `gpuBytesEstimate` | Geometry buffers and textures reachable from the scene. An estimate, not a measurement. |
| `jsHeapBytes` | The JS heap. |

Up to 30 frames are measured per view, at most about 8 s of them, because
close views draw slowly in software. Shared helpers are in `tools/views.mjs`
for B0.2 and B0.3.

Screenshots are JPEG at quality 92: about 80 KB (desktop) and 150–220 KB
(phone) a view. PNG was about 1 MB a view, because the dithered sky does not
compress. The same pixels give the same file.

**The 40 views:** the Basin in 6 ways (default, lanes bright, lanes off,
face-on, looking coreward, far); 8 regions (Tallis, the Furnace from outside
and inside, the Mire, the Hollows, the Boneyard, the Orrery, Scald with lanes
bright); 10 systems (Tallis, Ostrom, the Watchfire, the Well with its black
hole, Cinder's pulsar, Murk's red supergiant, Anvil's Wolf-Rayet star,
Quench's protostar, the Calder 147 binary, Gelid's rogue planet); Tallis
with its moons; 14 globes close up (Tallis, Tallis in the World Lab's height
and temperature views, ringed Tallis III, Scald, Cairn, Halvard's Rest,
Slagfall, Stillwater, Verdance, Nocturne, Umber I, Brand I, Halyard II); the
Tallis relay station.

### Two baselines

| Folder | App code | Use |
|---|---|---|
| `docs/section-b/baseline/phase2/` | `main` at `cfd7905`: Phase 2 as the GM accepted it | The reference. All checks pass on it. |
| `docs/section-b/baseline/wip/` | `section-b` with the WIP worlds on (`--worlds wip`; first recorded at `8abcef4`, again at `f6e7712`) | The parked work, measured against the reference. |

Each has `desktop/`, `phone/` and `baseline.json`. The Phase 2 baseline was
taken from a worktree of `main` with only the new tools and the dev-only
`memory()` line in `DebugHook.jsx` added. Phase 2 has no World Lab, so its
views 27 and 28 are the same as view 26.

Headless Chromium draws in software. Frame times here are much slower than
on a graphics chip. Use them to compare states on this machine, not to judge
a phone.

### What the baseline shows

Numbers from the first recording. The second recording (B0.2) gave the same
picture within normal run-to-run variation.

No view failed and there were no page errors in either state.

| Measure | Phase 2 | WIP |
|---|---|---|
| Basin, regions and systems: draw calls, GPU estimate, CPU work | 7–11, 20.4 MB, 1 ms desktop, 4–7 ms phone | the same |
| Frame time at globe close-ups, desktop | 80–260 ms | 640–1,950 ms (5–20× slower: the terrain, cloud and air shaders) |
| Frame time at the Tallis relay, desktop | 48 ms | 2,100 ms |
| CPU work at the Tallis close-up and relay, phone | 10.6 and 8.9 ms | 14.8 and 14.8 ms |
| Held frame on arrival at a close-up | 1.4–3.2 s (Phase 2's GPU paint of a world) | 0.5–1.1 s (Verdance 3.3 s) |
| Held frame on the flight to the Tallis relay, desktop | 1.8 s | 4.1 s |
| GPU estimate at close-ups | 27–33 MB | 21–29 MB |

Three findings for later tasks:

- **Bakes hold the view in both states.** Phase 2's world painter also holds
  a frame for 1.4–3.2 s in software when a globe first shows. The B0 test
  limit is 50 ms. B0.9 must cover the Phase 2 painter as well as the WIP
  bakes, or replace it.
- **The WIP globe draws as a grid from the Tallis relay** (view 40, WIP).
  Tallis shows as bright curved lines (the edges of its cube-sphere patches)
  and no surface. Phase 2 shows no such lines. New known issue 9.
- **The WIP close-up shaders are heavy.** The frame time at close-ups goes
  up 5–20× in software. B0.3 must set a budget for this; B0.6 (quality
  tiers) gives the way to meet it on phones.

## B0.2: visual regression check (done)

`node tools/check_visuals.mjs [--ref phase2|wip|DIR] [--device desktop|phone] [--only NAME,…] [--worlds wip] [--out DIR] [--limit PCT]`

The check goes to each of the 40 views as `record_baseline.mjs` does, takes
the same JPEG screenshot, and compares it with the reference in
`docs/section-b/baseline/<ref>/<device>/` (default: `phase2`). The browser
decodes both pictures in a canvas, so no image library is needed. For each
view it reports:

| Number | Meaning |
|---|---|
| `changed` | The share of pixels where a color channel differs by more than 16 of 255, in percent. The pass limit is 0.5%. |
| `mean` | The mean difference over all pixels and channels (0–255). |
| `max` | The largest difference in one channel. |

A view also fails if its reference is missing or the page shows an error.
For each view that fails, the check writes a difference picture (changed
pixels in red over a dim copy of the new view) next to the new screenshot.
The report is `visuals.json` in `--out`.

**Pictures depend on the view only.** The first run found two sources of
difference that were not in the drawing:

1. Name labels try their spot from the last frame first (`labelPlace.js`),
   so their sides depended on how many frames the flight took. Before the
   shot, the tools now forget those spots and draw two frames.
2. The orbit hint shows for the first 9 s after the map opens. The tools now
   wait until it is off.

After this change, two runs gave identical pictures. The Phase 2 references
were recorded again from `main` with these rules (commit `f6e7712`), and the
WIP set with `--worlds wip`.

**Result (Nov 26):** `section-b` with the WIP worlds off against the Phase 2
references: **all 80 views (40 desktop, 40 phone) identical, 0.000% changed.**
So decision BQ1 brings back exactly the look the GM accepted.

### BQ1 done

- `src/views/planet/switch.js`: `WIP_WORLDS` is true only in development
  builds with `?worlds=wip` in the address.
- `src/views/procedural.js` is back from `main`. It paints the Phase 2
  surfaces when the switch is off. Place markers sit at 0.002 R then (0.006 R
  with the WIP worlds).
- The view tools take `--worlds wip`.

With the switch off, every check gives the same result on `section-b` as on
`main` in this container. Two checks fail on both (BQ2).

## B0.3: performance check (done)

`node tools/check_performance.mjs [--ref phase2|wip|DIR] [--device desktop|phone] [--only NAME,…] [--worlds wip] [--targets] [--out DIR]`

The check goes to each of the 40 views, measures it as `record_baseline.mjs`
does, and checks five numbers against the view's budget:

| Number | What it is |
|---|---|
| `workMs` | Our own CPU work per frame (median). |
| `frameMs` | Frame to frame, with the draw (median). In software, this measures shader cost on the CPU. |
| `heldMs` | The longest frame on the flight to the view: the bake time. |
| `drawCalls` | Draw calls in a frame. |
| `gpuMB` | The estimate of GPU memory. |

**Budgets** (`tools/baseline/budgets.json`): each view's budget is its value
in the reference baseline (default `phase2`) times a ratio plus a margin. The
margins come from the variation between two recordings of the same code on
the same machine: CPU work varied up to 1.5×, frame time 1.36×, held frames
2.3×; draw calls and GPU memory did not vary.

| Number | Budget |
|---|---|
| `workMs` | 1.5 × reference + 0.5 ms |
| `frameMs` | 1.4 × reference + 5 ms |
| `heldMs` | 2.5 × reference + 100 ms |
| `drawCalls` | reference + 2 |
| `gpuMB` | 1.1 × reference + 2 MB |

A budget for one view can be set in `views` in the same file. So the check
catches large regressions (above about 1.5×). Smaller ones are inside the
run-to-run variation of software rendering; find them with repeated runs.

**Machine speed.** `machineMs()` in `tools/views.mjs` times a fixed piece of
JavaScript (the fastest of 7 runs; about 255 ms here, within 2% from run to
run). Each baseline records it as `machine.ms`. Time budgets are scaled by the
ratio of this machine to the reference machine.

**Targets.** `targets` in `budgets.json` holds fixed limits from the plan:
now the Phase B0 test, "a bake never holds a frame for more than 50 ms on
desktop". The check reports them; with `--targets` they also fail it. They
fail now, so they are reported only until B0.9.

**Result (Nov 26):** `section-b` (WIP worlds off) against `phase2`: **all 80
views within budget.** With `--worlds wip` the check fails, as it must: at the
Tallis close-up the frame time is 1,250 ms against a budget of 207 ms, at the
Tallis relay 2,066 ms against 111 ms.

The held-frame target (50 ms, desktop) is missed in 34 of 40 views, in three
groups. B0.9 must deal with all three:

| Held frame | Views | Probable cause |
|---|---|---|
| 72–116 ms | regions and systems without effects; Tallis with its moons | first frames of a flight (shader compile, label layout); not yet located |
| 266–451 ms | the Furnace, the Mire, and the systems inside them (Quench, Murk, Anvil) | the nebula and dust paint (`RegionEffects.jsx`) |
| 1.5–4.7 s | every globe close-up, the Tallis relay, Gelid's rogue planet | the Phase 2 world painter (`procedural.js`) when a globe first shows |

### BQ2 done

- `check_system` forgets the labels' last spots and draws two frames before it
  counts names. Ostrom: 4 of 4 named, in three runs of three (3 of 4 before).
- `check_zoom` compares CPU work at each stop with a Phase 2 reference
  recorded on `main` (`docs/section-b/baseline/phase2/zoom.json`, written with
  `--record-ref`): at most 1.5 × the reference mean + 0.5 ms, scaled by machine
  speed. Without the reference it uses the old fixed limits. On `section-b`:
  **24 of 24 pass** (phone worst 15.0 ms against a reference of 14.5 ms).

With these two changes every Section A check passes on `section-b`.

Found on the way, for a later task (readability): after a flight, a label's
memory of its last spot can leave out a name that a fresh placement fits
(Ostrom, 3 of 4 named). The map should place names as well as the reset does.

## B0.4: high dynamic range pipeline (done)

- **Packages:** `postprocessing` 6.39.6 and `@react-three/postprocessing`
  3.2.2 (approved by BD1, exact versions).
- **`src/views/Output.jsx`:** the scene renders into a half-float buffer in
  linear light. One effect at the end tone maps it, and the composer encodes
  it for the screen (sRGB). The draw-call count is reset once a frame, so the
  checks see the whole frame. Multisampling is 4× on screens under 2 device
  pixels per CSS pixel and off on denser screens (phones), until B0.6.
- **The tone map** (`OUTPUT_GLSL` in `src/views/color.js`) is the shoulder of
  Khronos PBR Neutral without its toe offset: colors with every channel at or
  under 0.8 (linear) pass unchanged; brighter light rolls off toward white.
  The toe offset of Neutral would have darkened mid-tones by about 10%.
- **Our own shaders** still compute display colors. They end with
  `fromDisplay(color × alpha)` (`FROM_DISPLAY_GLSL`), the exact inverse of the
  output, so each mark over black looks as before. Dust is converted before
  its alpha instead, so thick dust settles to its own brown.
- **Exposure** (`src/views/exposure.js`, `store.exposure`, `setExposure` in the
  debug hook): one multiplier on light from the world (globe lights, air,
  rings, nebula and dust, the sky). Lanes, orbit lines, icons, markers, star
  dots and body discs don't take it. Checked at the Tallis close-up: at 0.5
  the globe dims (89.7 to 64.9 mean), markers, labels and lanes do not change.
  A slider comes with the World Lab (B0.7).
- **WIP planet shaders** output linear light; their own ACES curve is
  removed. They come out darker than before (ACES brightened mid-tones); they
  are off by default and get tuned when they are turned on (B2, B5).
- **Nebula colors:** the two outer blues carry less green (`#4f7bff` to
  `#5a62ff`, `#3fa0ff` to `#4a86ff`). Added in linear light, the old ones made
  the Furnace blue-green from the Basin on a phone (`check_effects`).

**Section A checks changed:** `check_effects` expects 10 draw calls at the
Basin (the tone map adds one). `check_zoom` measures the drawn center of the
focus only when at least 4 pixels are bright: at the Tallis relay, which
draws nothing bright at the center, one faint background dot at the
threshold moved it by 2 px.

**Results (Nov 26):**

| Check | Result |
|---|---|
| Section A checks (10) | all pass |
| `npm test` | 50 of 50 |
| `check_visuals` against `phase2` | 48 of 80 views within 0.5%; 32 changed, largest mean difference 4.0 of 255 (the Furnace, the Mire, Murk, Quench, Anvil, globe close-ups) |
| `check_performance` against `phase2` | CPU work unchanged. Frame time in software: phone ×1.23 (median), 39 of 40 within budget; desktop ×1.91 with 4× multisampling, 1 of 40 within budget |

Without multisampling, desktop frame times stay within budget (Basin 78 ms
against 53 ms), but globe edges show small steps at 1 device pixel per CSS
pixel.

The review page for the GM: https://claude.ai/artifact/VEFKP2opukqTdbVyWzv2PL
(before, after and difference for each changed view).

## B0.5: bloom (built; BQ4 open)

- **`Output.jsx`:** `BloomEffect` (postprocessing, mipmap blur) before the
  tone map, adding light: threshold at a luminance of 2, intensity 0.9,
  radius 0.7. Since B0.4 no chart mark passes 1.93, so only light blooms.
- **Star cores** (`Stars.jsx`) pass white near a star only: inside about
  200 AU (the same ramp that grows the glow sprite), up to 2.2 for dim
  dwarfs and 8 for giants by luminosity, and only while the disc is small on
  screen (fading out from 24 to 120 px across). From the Basin and the
  regions stars stay chart marks: there, bloom pushed three region labels
  under 4.5:1 on the phone. Up close, a large disc washed the view in haze.
- **Lava** (`Planet.jsx`): emissive at 4 × exposure, so the hottest lava
  blooms; lava now takes exposure like other light.
- **Bloom runs only when something can bloom** (`bloom.js`): stars set a
  flag when one is near, globes when lava shows. Otherwise its 16 passes
  are skipped and its strength set to 0 (a uniform: no shader rebuild). The
  Basin and the regions pay nothing for it.
- **Dust** (`RegionEffects.jsx`) lets light through as (1 − a)² per puff
  instead of (1 − a); its own brown is unchanged. A star brighter than white
  still fades behind the Mire (brightest Mire star 254 → 162 desktop, 125
  phone, seen from inside a system; 252 → 76 from the region).
- **Label contrast check** (`check_contrast`, now part of `check_views`):
  each label against the background behind it, WCAG ratio, 90th
  percentile, the labels' dark text shadow left out. Fails when a label
  that met 4.5:1 in the reference falls below. The accepted reference has
  825 label lines in 80 views, 105 of them already under 4.5:1 over bright
  backgrounds.
- **Section A checks changed:** `check_effects` measures the nebula's and
  dust's own color with the stars hidden (since bloom, the dust also hides
  the stars' glow, checked on its own); the Basin still has 10 draw calls,
  since bloom does not run there.

**Results (Nov 27):** every Section A check passes; no label lost contrast.
Against the accepted look, 75 of 80 views are unchanged; 5 changed: the
Mire (mean difference 4.5 desktop, 3.5 phone: dust darker where light
passes through), Slagfall (1.1 and 0.8: hotter lava, faint glow) and the
Watchfire system view (0.8, desktop: its core blooms). Views where bloom
runs (systems near a star, planets, lava) cost 14 to 16 more draw calls and
5 to 25% more frame time in software; CPU work is unchanged.

## Decisions

**BQ1. The WIP planet work fails the Phase 2 test.** Options:

1. Keep the WIP globes on. Accept 3 failures of `check_zoom` until B0.9,
   B0.10 and a CPU fix for the level of detail are done.
2. Turn the WIP globes off by default (a development switch), so that
   `section-b` passes all checks. Use the Phase 2 globes until the bake queue,
   the cache and the CPU fix are in. Then turn them on, with the WIP baseline
   as the comparison.

Recommendation: option 2. It obeys rule 2 of Section B, and B0.2 and B0.3 can
use the Phase 2 baseline as their reference without known failures.
**Decided (GM, Nov 26): option 2.**

**BQ2. Two Section A checks fail on `main` in this container.** The phone
CPU limit of `check_zoom` (11 ms; 14.7 ms here) and the Ostrom names in
`check_system` (3 of 4). Neither is caused by Section B work. Options:

1. Change the two checks. `check_zoom` compares CPU work with the Phase 2
   baseline on the same machine (B0.3 gives that baseline and budget) instead
   of a fixed number of milliseconds. `check_system` forgets the labels'
   last spots before it counts names, as the view tools now do; then find
   out whether Ostrom fails every time, and fix the label placement if so.
2. Keep the checks as they are. Record the two failures as known for this
   machine.

Recommendation: option 1. A fixed limit in milliseconds tests the machine,
not the change; a check that passes or fails by timing hides real faults.
**Decided (GM, Nov 26): option 1.** Done in B0.3, above.

**BQ3. Approve B0.4.** Three parts:

1. The new look of the 32 changed views. Recommendation: approve, and record
   it as the new reference for `check_visuals`.
2. The two nebula colors. Recommendation: approve.
3. Desktop frame time ×1.9 in the software renderer, from 4× multisampling
   in the half-float buffer. Recommendation: accept it and record a new
   performance reference; B0.6 lets slow computers turn multisampling off.

**Decided (GM, Nov 26): all three as recommended.** The approved state is
recorded in `docs/section-b/baseline/accepted/` (from commit `58b97aa`), the
default reference of `check_visuals` and `check_performance` from now on.
`phase2/` stays as the record of the Phase 2 look. `check_zoom` keeps its
Phase 2 reference: B0.4 did not change CPU work.

**BQ4. Approve B0.5.** Two parts:

1. The new look of the 5 changed views (bloom on near stars and lava; dust
   that dims light behind it more). Recommendation: approve, and record it
   as the new reference.
2. The cost where bloom runs: 14 to 16 more draw calls and 5 to 25% more
   frame time in the software renderer; on a graphics chip, bloom at this
   size is about 1 ms. Recommendation: accept it; the low quality tier
   (B0.6) turns bloom off.
