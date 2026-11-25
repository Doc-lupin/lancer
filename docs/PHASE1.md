# Phase 1: Complete the data — work plan

Prepared Nov 25, 2026, after a full review of `data/raw/`, `data/parsed/`, `tools/` and both plans.
Phase 1 checklist and test are in [PLAN.md](PLAN.md). This file breaks them into small tasks and lists what must be decided first.

**Exit test (from PLAN.md):** `data/map.json` matches the schema; every reference resolves; every region has a star or special object.

## Review results

The Markdown files in `data/raw/` match their `.docx` sources word for word. All lane and faction references in `data/parsed/` resolve to a region. The 35 lanes match the official map. Region positions fit in the 25 ly sphere, at least 3.9 ly apart.

Problems to fix during Phase 1:

| # | Where | Problem |
|---|---|---|
| R1 | `factions.json` | 13 factions have an `alignment` that is not in the alignments list: `against-crossroads`, `against-purview`, `corvel-contract`, `none`, `near-crossroads`, `sells-to-all`, `corvel; long-families`, `neutral`, and no value for the Glass Syndicate and the three faiths. The current reference check does not cover alignments. |
| R2 | `lanes.json` | `type` holds one value, but some lanes have more than one behavior. The Silent Mouths are silent, tidal (on their own cycle) and one-way at the same time. |
| R3 | `lanes.json` | Ostrom has six primary lane mouths, but the three Silent Mouths are one lane record. |
| R4 | Geography | Gloam's "two lane mouths are covered by orbital guns", but four lanes touch Gloam (Ostrom, Halvard, Shoals, Orison tide). |
| R5 | `regions.json` | A region has "as few as two" stars, but Sable and Halvard list one star each, and Orison and Cairn list none. Orison's tidal mouth and Cairn's Deeps mouth are "at the edge of the region", which suggests a second star in each. |
| R6 | `regions.json` | The Pale lists 3 stars, but the text says "white dwarfs" (plural), a neutron star and a remnant: 4 or more. |
| R7 | `regions.json` | Star type not given for the primaries of Tallis, Pennant, Scald's two companions, Tarn and its two companions, and Ferrous's four stars. |
| R8 | `reference.json` vs PLAN.md | Tidal phase is off by one. `reference.json` says open days 0–13; PLAN.md says day 5 means "open 9 more days", which needs days 1–14. |
| R9 | `timeline.json` | The source eras overlap (Lean Years 5018–5020, Instrument and recovery 5020–5023, Rush 5023–5026). The parsed file made them disjoint. Minor. |
| R10 | History doc | The year-by-year chronology in the source stops after 5017u. Later years exist only in the narrative. Not a Phase 1 blocker (timeline is priority 3). |
| R11 | Branches | All Phase 0 work is on branch `ccr-5119788e-n79nkh`, not on `main`. |

## Decisions needed

Each has a recommended default. The schema task (1.1) needs D1–D6. The others can wait until their task.

**Decided Nov 25, 2026:** D1–D7 as recommended. D8–D15 are still open.

| # | Question | Recommended |
|---|---|---|
| D1 | Lane behavior model | Separate flags instead of one type: `drifting`, `tidal` (with `cycleDays`, `openDays`, `phaseOffset`), `oneWay`, `silent`. `days` plus optional `daysRange`. |
| D2 | Silent Mouths | Three lane records, one per mouth, all into Ostrom from the Quiet, with their own unknown tidal cycle. |
| D3 | Origin of a canon object with an invented name (e.g. Lumen's unnamed orange dwarf) | `origin: canon` for the object, `nameOrigin: invented` for the name. "(WIP)" follows the name: "Lumen B (WIP)". |
| D4 | Control on a split planet (Scald, Tallis, Pennant, Gloam) | Control areas on the globe as lat/long polygons, each with one or more factions. Contested = more than one faction. |
| D5 | Authoring format | Write one file per region in `data/src/regions/`, assembled into `data/map.json` by a script. After Phase 1, `map.json` is the only source (the app saves to it). |
| D6 | Validator | Python with `jsonschema` (already installed here, dev use only, not part of the app). Asking because CLAUDE.md says no new libraries without asking. |
| D7 | Tidal day index | Days 1–73, open on days 1–14. Day 5 → open 9 more days. Fix `reference.json`. |
| D8 | Gloam's mouths (R4) | Ostrom and Halvard mouths at Gloam (under the guns). Shoals and Orison tide mouths at the orange dwarf. |
| D9 | Regions short of stars (R5) | Add one invented companion each to Sable, Halvard, Orison and Cairn. Put the Orison tide and Cairn–Deeps mouths there. |
| D10 | Shoals star count ("dozens") | 24 systems. |
| D11 | Unmapped stars (open item in PLAN.md) | Enough to bring the total to ~130 stars. With D10, charted stars come to about 90, so ~40 unmapped. |
| D12 | Star spread inside a region | Within 1.5 ly of the region center, so regions (≥3.9 ly apart) never overlap. |
| D13 | Faction layers (≤15 factions each) | Governments 15 (with the Synod); corporations 15 (commerce); companies + outlaws 12; cultures 5 peoples; religions 4 (Synod, Vigil, Gardeners, Listeners). The Synod is in two layers. |
| D14 | Faction colors | One palette per layer; colors only need to be distinct inside a layer. |
| D15 | Calendar | Union year of 365 days; Basin year = Union year − 5017. |
| D16 | Stellar variety (raised by the GM, Nov 25) | Not every star a dwarf. Canon types stay; invented ones spread across the full range (see Stellar variety below). |

## Canon hints gathered from the documents

Use these before inventing anything.

**Lane mouth stars.** Brace: Tallis → Halyard. Marchwell: Tallis → Pennant. Cinder: the Stewardship picket "on the lanes out of Ostrom" (which lanes is not stated). Silent Mouths: Ostrom system, a few million km beyond the gate. Halyard: Wending passage opens near Halyard Station (largest system). Halvard: Gap opens near the planet's rings. Orison: tidal mouth at the edge of the region. Cairn: Deeps mouth at the edge of the region. Tarn: four mouths.

**Planets with split control.** Scald: Northern Concord (Kettle Flats) and Southern League, front along the Seam (600 km), Kerrtown on the southern edge of the glassfields. Tallis: Stewardship on the coasts and river valleys, the Compact in the Reach (interior upland). Pennant: Synod on the northern continent, Corvel and Lantern Company under siege in the south. Gloam: Purview in the twilight band, Coldwell Claims on the night side.

**Surface places.** Tallis: the Landing (east coast), Dry Creek, Sallow Ford, eleven Absent climate structures. Pennant: 40 km ring structure (southern continent). Scald: the Seam, Kettle Flats, Kerrtown, the attacked Kerr-Varga refinery. Gloam: Coldwell (largest camp), Purview yards (orbit). Wending: ~30 lagoon towns. Cairn: stone fields, Kerr-Varga landing site. Ashlar: tower field. Verdance: two abandoned sites. Stillwater: settled platform. Bellows: sealed towns. Halvard's Rest: refinery. Lumen's moon: Lumen Station, volcanic belts.

**Stations and structures.** The Marrow, IPS-N Ostrom yards, the gate, THRESHOLD's platform, Halyard Station, Lumen Station, Sable Harbor, Rimelight's four stations on three rogue worlds (a fifth lost) and its Tarn receiving station, Basin Office stations in Tarn's rings, the Tarn shipyard, Survey Office stations in the Pale and the Orrery, Ferrous foundries in the largest asteroids, Purview orbital guns and yards, Mercer-Ibarra's six ships at the Gap, the Orrery's central structure, Boneyard wrecks, Hollows heat engines.

**Peoples (presence).** Charter folk: Bench and older Navy officers (Marrow, Tallis). Tail: independent trade and free companies (everywhere, strongest in the trailing arm). Thawed: the Stacks and the Compact (Marrow, the Reach). Basin-born: everywhere, a fifth of the population. Seam crews: Scald, Gloam's night side, the Shoals.

**Faiths (presence).** Synod: Pennant; congregations on Tallis, the Marrow and Cosmopolitan crews. Vigil: chapel on the Marrow's hull, Tallis. Gardeners: Tallis, Pennant, many on Orison. Listeners: mostly Scald, some on Gloam and in the Shoals.

**Clock.** 5029u day 300 (Basin year 12). Tidal cycle day 5. Drone arrived about four months earlier; Kasprzak last seen early summer.

## Tasks

One task = one session's work, touching only the files listed. Do them in order. Each task ends with the validator passing on what exists so far (from task 1.2 on).

| # | Task | Files | Done when |
|---|---|---|---|
| 1.0 | Settle D1–D6 (done) | `docs/PHASE1.md` | Answers recorded here |
| 1.1 | (done) JSON schema: Basin, region, system, body, surface place, control area, lane, faction, layer, unit, text box, headline, clock. Enums for center type (star, rogue planet, wreck, structure), region effect (none, nebula, dust cloud), origin, visibility. Player `notes` and `gmNotes` kept apart. Orbit fields (AU, period, phase at epoch), rotation, tidal lock. | `data/schema/map.schema.json`, `data/schema/README.md` | Schema loads; README explains each field in one line |
| 1.2 | (done) Validator: schema check, unique IDs, every reference resolves, every region has a system, every lane end is a system in the right region, "(WIP)" on invented names only, each layer ≤15 factions | `tools/validate_map.py`, `tools/test_validate_map.py`, `data/schema/example.json` | Passes on a hand-written two-region sample; fails on a broken sample |
| 1.3 | (done) Assembler: parsed data + `data/src/` files → `data/map.json` | `tools/build_map.py` | Builds a map with 24 regions and no systems yet |
| 1.4 | (done) Fix R1, R7 and D7 in the parsed data | `data/parsed/factions.json`, `data/parsed/regions.json`, `data/parsed/reference.json` | Validator alignment and star checks pass |
| 1.5 | (written, awaiting GM review) Pilot: Ostrom and Tallis complete (systems, planets, moons, stations, lane mouths, surface places, control) | `data/src/regions/ostrom.json`, `tallis.json` | Validator passes; the GM reads the two regions and approves the level of detail |
| 1.6 | GM hand-adjusts region positions and locks them | `data/parsed/positions.json` | All regions `locked: true`; preview redrawn |
| 1.7 | Canon systems for all other regions (from `regions.json`), with D8–D10 companions | `data/src/regions/*.json` | Every region has its systems and centers |
| 1.8 | Bodies, inner arms first: coreward (Pennant, Orison, Wending), trailing (Halyard, Lumen, Sable), spinward (Gloam, Halvard), rimward (Scald, Ferrous, Tarn, Cairn). One task per arm. | `data/src/regions/<id>.json` | Validator passes after each arm |
| 1.9 | Bodies, frontier, lighter detail: Lantern Reach, Pale, Orrery, Furnace, Hollows, Shoals, Deeps, Boneyard, Mire, the Quiet | same | Validator passes |
| 1.10 | Lane mouths: attach each lane end to a system (D2, D8) | `data/parsed/lanes.json` or `data/src/lanes.json` | Every lane end resolves to a system |
| 1.11 | Unmapped stars (D11, D12) | `data/src/unmapped.json` | Count matches D11; all inside the sphere |
| 1.12 | Factions: layers, colors, five peoples, presence for peoples and faiths, control at region/system/planet level | `data/src/factions.json` | Each layer ≤15; every region and split planet has control set |
| 1.13 | Clock start | `data/src/clock.json` | 5029u, day 300, tidal day 5 |
| 1.14 | Assemble `data/map.json`, run the Phase 1 test, tick the boxes in PLAN.md | `data/map.json`, `docs/PLAN.md` | Exit test passes |

Fixed in 1.4: R1 (stray alignments mapped to `independent` with the source wording kept as `alignmentNote`; the Glass Syndicate and the three faiths have no alignment), R6 (the Pale has two white dwarfs), R7 (every star in `data/parsed/regions.json` has a schema `kind`; `kindOrigin: invented` marks the ones the documents don't give, listed below), D7 (cycle days 1–73, open 1–14).

Invented star types (R7, revised for D16): Tallis yellow dwarf; Pennant yellow-white (F) star, with Pennant on a long, eccentric year; Wending's two dim stars a red dwarf and a white dwarf; the nine Lantern stars three yellow dwarfs, two orange dwarfs, two yellow-white stars, one white (A) star and one orange giant; Halyard's four dim stars two red dwarfs, a brown dwarf and a white dwarf; Scald's companions an orange dwarf and a red flare star; Ferrous a red giant (which broke up its inner worlds), a white dwarf with a debris disk, an orange dwarf and a yellow-white star; Tarn a white (A) star with a red dwarf and a brown dwarf; the Deeps' old stars a red giant, an orange giant, a carbon star and two white dwarfs, plus two red dwarfs; the Boneyard's three dim stars a white dwarf, a brown dwarf and a red dwarf. Wending's "hot white star" is a blue-white (B) star.

## Stellar variety (D16)

The schema covers the full range: main-sequence M to O, protostars, subgiants, giants and supergiants, carbon stars, Wolf-Rayet stars, white dwarfs, neutron stars, pulsars, magnetars, black holes and brown dwarfs, with features (flares, disks, jets, planetary nebulae, strong winds), natural variable stars and multiple-star systems (companion stars as bodies).

Canon types stay as written; several regions are canonically dwarf-heavy (Ostrom, the Tallis companions, Pennant's Tew and Ashby, Lumen, Sable, Gloam, the Shoals). The rest of the range goes where the setting gives a reason:

| Where | Plan |
|---|---|
| The Furnace (1.7) | The hot end: protostars with protoplanetary disks, young blue (O) and blue-white (B) stars, one Wolf-Rayet star with jets. Its radiation is why sensors fail there. |
| The Pale (1.7) | Its "cold remnant of something larger" could be a black hole. GM to decide; it stays `remnant` until then. |
| The Mire (1.7) | Stars hidden in the dust: one red supergiant glowing through the cloud, the rest unseen. |
| The Shoals (1.7) | "Mostly red dwarfs": add flare stars, brown dwarfs and a few orange dwarfs among the 24. |
| Orison, Cairn, Sable, Halvard companions (D9) | One distant companion each, not all dwarfs. |
| Companion stars | Some inner systems get a binary partner as a `star` body. |
| Unmapped stars (1.11) | Most of the spread: giants, a supergiant visible from everywhere in the Basin, binaries, a planetary nebula, a magnetar. |

Rough target for the whole Basin (~130 stars): about half red and brown dwarfs, a fifth orange and yellow dwarfs, a tenth F, A, B and O stars, a tenth giants and supergiants, a tenth remnants, plus a few rarities.



Notes from 1.3:
- `data/map.json` is generated by `python3 tools/build_map.py`. Edit `data/parsed/` and `data/src/`, not the output (the build docstring lists the inputs and merge rules).
- Layers in `data/src/factions.json` follow the D13 recommendation and are provisional until D13 is settled.
- Alignment values that are not defined alignments are kept as `alignmentNote` until task 1.4 fixes them (R1).
- Tarn, Cairn and the Shoals are "Contested" in the Factions doc with no holder named. The build sets contenders from the canon feuds (Tarn yards; Cairn) and the Purview–Seventh conflict (Shoals). Review in 1.12.
- The Returned NHPs (`returned` in `data/parsed/factions.json`) are not in the map yet. Decide in 1.12 whether they become units, places or faction notes.

The pilot in 1.5 exists to catch schema problems on two regions before data goes into the other twenty-two. Change the schema there if needed, not later.
