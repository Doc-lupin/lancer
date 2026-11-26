# Phase B0: Foundation and measurement — work log

Tasks, test and functions are in [SECTION_B.md](SECTION_B.md), Phase B0.
Branch `section-b`.

**Status (Nov 26, 2026): B0.1 and B0.2 done. Next: B0.3.** BQ1 is decided
(option 2: the WIP worlds are off by default). BQ2 is open.

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
