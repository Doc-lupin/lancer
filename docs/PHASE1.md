# Phase 1: Complete the data — work plan

**Status: complete. The Phase 1 test passed on Nov 25, 2026.**

| Check | Result |
|---|---|
| `data/map.json` matches the schema | 0 errors |
| Every reference resolves | 1,447 references, 0 unresolved |
| Every region has a star or special object | All 23 charted regions (the Quiet, beyond the map, is exempt) |
| Complete check (`tools/validate_map.py --complete`) | 0 errors, 0 warnings |
| Validator tests, catalog and template checks | 51/51 tests; catalog, schema and WORLDS.md agree; 547 templates fill |

Contents of the finished map: 24 regions; 155 systems (115 charted, 40 unmapped) holding 148 stars of 23 kinds; 329 bodies, among them 118 planets, 27 giants, 20 moons, 39 stations, 9 Absent wrecks and 71 lane mouths; 182 worlds of 53 types (8 garden, 4 habitable, 18 marginal, 100 hostile, 25 lethal, 27 giants); 163 places and 10 control areas; 37 lanes with every end attached; 50 factions in 5 layers. 389 objects are canon and 268 invented; 13 are GM-only.

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

**Decided Nov 25, 2026:** D1–D7 as recommended; D9, D10 and D12 applied as recommended in task 1.7; D8 applied as recommended in task 1.10; D11 applied as recommended in task 1.11 (40 unmapped stars); D13 and D14 decided as recommended in task 1.12, with the Synod in both the governments and the faiths layers (it holds Pennant and is worshipped across the Basin); D15 applied as recommended in task 1.13. All decisions are now settled. At the close of Phase 1 the GM revised D5 (the build pipeline stays until Phase 5) and approved Vite (D19).

| # | Question | Recommended |
|---|---|---|
| D1 | Lane behavior model | Separate flags instead of one type: `drifting`, `tidal` (with `cycleDays`, `openDays`, `phaseOffset`), `oneWay`, `silent`. `days` plus optional `daysRange`. |
| D2 | Silent Mouths | Three lane records, one per mouth, all into Ostrom from the Quiet, with their own unknown tidal cycle. |
| D3 | Origin of a canon object with an invented name (e.g. Lumen's unnamed orange dwarf) | `origin: canon` for the object, `nameOrigin: invented` for the name. "(WIP)" follows the name: "Lumen B (WIP)". |
| D4 | Control on a split planet (Scald, Tallis, Pennant, Gloam) | Control areas on the globe as lat/long polygons, each with one or more factions. Contested = more than one faction. |
| D5 | Authoring format | Write one file per region in `data/src/regions/`, assembled into `data/map.json` by a script. **Revised at the end of Phase 1 (GM, Nov 25):** `data/src/` and `tools/build_map.py` stay the source until Phase 5. The app reads `map.json` and does not write it; when saving from the app arrives in Phase 5, `map.json` becomes the only source. |
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
| D17 | Variety in canon stars too (GM, Nov 25) | Decided: some canon star types change. Each change keeps the documents' wording in `type`, is marked `kindOrigin: invented`, and is listed under Departures from the documents. |
| D18 | Variety in worlds (GM, Nov 25) | Decided: 71 world types in 9 families with 218 variants, 245 features in 15 groups, habitability and climate. All text except class descriptions is a template naming the world; `tools/describe_world.py` composes a world's entry. Catalog source: `data/schema/worlds.json` (the schema holds the id lists). Guide, canon assignments and catalog: [WORLDS.md](WORLDS.md). The Phase 1 test requires a world type on every planet, moon and giant. |
| D19 | Build tool for the app (GM, Nov 25) | Decided: Vite, for the dev server and the production build from Phase 2 on. |

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
| 1.5 | (done, approved by the GM Nov 25) Pilot: Ostrom and Tallis complete (systems, planets, moons, stations, lane mouths, surface places, control) | `data/src/regions/ostrom.json`, `tallis.json` | Validator passes; the GM reads the two regions and approves the level of detail |
| 1.6 | (done) GM approved the generated region positions as they stand; all 24 locked | `data/parsed/positions.json` | All regions `locked: true`; preview redrawn |
| 1.7 | (done) Canon systems for all other regions, with D9 companions and 24 Shoals systems (D10) | `data/src/regions/*.json` | Every region has its systems and centers |
| 1.8 | (done) Bodies, inner arms: coreward (Pennant, Orison, Wending), trailing (Halyard, Lumen, Sable), spinward (Gloam, Halvard), rimward (Scald, Ferrous, Tarn, Cairn), one commit per arm | `data/src/regions/<id>.json` | Validator passes after each arm |
| 1.9 | (done) Bodies, frontier, at full detail (GM request): Lantern Reach, Pale, Orrery, Furnace, Hollows, Shoals, Deeps, Boneyard, Mire; the Quiet stays empty | `data/src/regions/<id>.json` | Validator passes |
| 1.10 | (done) Lane mouths: every lane end attached to a system and a lane-mouth body (D2, D8) | `data/src/lanes.json`, `data/src/regions/*.json` | Every lane end resolves to a system |
| 1.11 | (done) 40 unmapped stars (D11, D12) | `data/src/unmapped.json` | Count matches D11; all inside the sphere |
| 1.12 | (done) Factions: layers, colors, five peoples, presence for peoples and faiths, control at region/system/planet level | `data/src/factions.json`, `data/src/regions/*.json`, `tools/build_map.py` | Each layer ≤15; every region and split planet has control set |
| 1.13 | (done) Clock start | `data/src/clock.json` | 5029u, day 300 (Basin year 12), tidal day 5 of 73, open 9 more days |
| 1.14 | (done) Assemble `data/map.json`, run the Phase 1 test, tick the boxes in PLAN.md | `data/map.json`, `docs/PLAN.md` | Exit test passes |
| 1.15 | (done) World datablock (added after the test, at the GM's request): stats and profile for every world and station, gazetteer pronunciations, comparisons to standard | `tools/derive_stats.py`, `data/src/profiles.json`, `data/src/pronunciation.json`, `docs/DATABLOCK.md` | Complete check still passes |

Fixed in 1.4: R1 (stray alignments mapped to `independent` with the source wording kept as `alignmentNote`; the Glass Syndicate and the three faiths have no alignment), R6 (the Pale has two white dwarfs), R7 (every star in `data/parsed/regions.json` has a schema `kind`; `kindOrigin: invented` marks the ones the documents don't give, listed below), D7 (cycle days 1–73, open 1–14).

Invented star types (R7, revised for D16): Tallis yellow dwarf; Pennant yellow-white (F) star, with Pennant on a long, eccentric year; Wending's two dim stars a red dwarf and a white dwarf; the nine Lantern stars three yellow dwarfs, two orange dwarfs, two yellow-white stars, one white (A) star and one orange giant; Halyard's four dim stars two red dwarfs, a brown dwarf and a white dwarf; Scald's companions an orange dwarf and a red flare star; Ferrous a red giant (which broke up its inner worlds), a white dwarf with a debris disk, an orange dwarf and a yellow-white star; Tarn a white (A) star with a red dwarf and a brown dwarf; the Deeps' old stars a red giant, an orange giant, a carbon star and two white dwarfs, plus two red dwarfs; the Boneyard's three dim stars a white dwarf, a brown dwarf and a red dwarf. Wending's "hot white star" is a blue-white (B) star.

## Stellar variety (D16)

The schema covers the full range: main-sequence M to O, protostars, subgiants, giants and supergiants, carbon stars, Wolf-Rayet stars, white dwarfs, neutron stars, pulsars, magnetars, black holes and brown dwarfs, with features (flares, disks, jets, planetary nebulae, strong winds), natural variable stars and multiple-star systems (companion stars as bodies).

Canon types stay as written; several regions are canonically dwarf-heavy (Ostrom, the Tallis companions, Pennant's Tew and Ashby, Lumen, Sable, Gloam, the Shoals). The rest of the range goes where the setting gives a reason:

| Where | Plan |
|---|---|
| The Furnace (1.7) | The hot end: protostars with protoplanetary disks, young blue (O) and blue-white (B) stars, one Wolf-Rayet star with jets. Its radiation is why sensors fail there. |
| The Pale (1.7) | Decided under D17: a black hole with a faint accretion disk, a magnetar, and a white dwarf inside its planetary nebula. |
| The Mire (1.7) | Stars hidden in the dust: one red supergiant glowing through the cloud, the rest unseen. |
| The Shoals (1.7) | "Mostly red dwarfs": add flare stars, brown dwarfs and a few orange dwarfs among the 24. |
| Orison, Cairn, Sable, Halvard companions (D9) | One distant companion each, not all dwarfs. |
| Companion stars | Some inner systems get a binary partner as a `star` body. |
| Unmapped stars (1.11) | Most of the spread: giants, a supergiant visible from everywhere in the Basin, binaries, a planetary nebula, a magnetar. |

### Departures from the documents (D17)

The setting documents should be updated to match these, or the changes reverted. Features alone (flares, starspots, nebulae) add to the documents without contradicting them.

| Star | Documents say | Now |
|---|---|---|
| Cinder (Ostrom) | burned-out white dwarf | pulsar with jets; its airless planets are pulsar worlds; the picket is shielded |
| Marl (Ostrom) | red dwarf | red dwarf, flare star |
| Brace (Tallis) | red dwarf | red giant that stripped its worlds; its planets, picket and Halyard mouth moved out to 2.4–6 AU |
| Marchwell (Tallis) | dim brown dwarf | dim white dwarf |
| Tew (Pennant) | red dwarf | orange giant; its mining worlds baked bare |
| Ashby (Pennant) | red dwarf | brown dwarf |
| The Pale's neutron star | neutron star | magnetar |
| The Pale's remnant | cold remnant of something larger | black hole with a faint accretion disk |
| One of the Pale's white dwarfs | white dwarf | white dwarf inside a planetary nebula |
| Lumen's second orange dwarf | orange dwarf | yellow-white (F) star |
| Gloam | dim red star | red dwarf, heavily spotted; its light wavers over weeks |
| Gloam's companion | cool orange dwarf | cool orange giant |
| Halvard | yellow star | yellow giant; Halvard orbits far out |

Unchanged: Ostrom (the quiet orange star at the crossroads), Wending, Scald, Lumen's brown dwarf, Sable, the Orrery's red dwarf, and the Shoals' "mostly red dwarfs" (varied in 1.7 within that wording).

Rough target for the whole Basin (~130 stars): about half red and brown dwarfs, a fifth orange and yellow dwarfs, a tenth F, A, B and O stars, a tenth giants and supergiants, a tenth remnants, plus a few rarities.



Notes from 1.3:
- `data/map.json` is generated by `python3 tools/build_map.py`. Edit `data/parsed/` and `data/src/`, not the output (the build docstring lists the inputs and merge rules).
- Layers in `data/src/factions.json` follow the D13 recommendation and are provisional until D13 is settled.
- Alignment values that are not defined alignments are kept as `alignmentNote` until task 1.4 fixes them (R1).
- Tarn, Cairn and the Shoals are "Contested" in the Factions doc with no holder named. The build sets contenders from the canon feuds (Tarn yards; Cairn) and the Purview–Seventh conflict (Shoals). Review in 1.12.
- The Returned NHPs (`returned` in `data/parsed/factions.json`) are not in the map yet. Decide in 1.12 whether they become units, places or faction notes.

Notes from 1.7:
- 104 systems: 98 stars, 5 rogue worlds in the Hollows, 2 drifting Absent wrecks in the Boneyard (beside its three dim stars, per PLAN.md) and the Orrery's central structure, with its red dwarf as a companion body. Every star kind in the schema is used.
- New names (all marked "(WIP)") follow a theme per region: tidal words at Wending (Neap, Slack), lamp words in the Lantern Reach (Cresset, Taper, Wick, Sconce, Votive, Tallow, Beacon, Glimmer, Brand), forge words in the Furnace (Crucible, Anvil, Tuyere, Quench, Clinker, Bloom), shoal words in the Shoals, rope words at Halyard (Sheet, Bight, Cleat), glassmaking at Scald (Frit, Cullet), metalworking at Ferrous (Billet, Ingot, Temper), water words at Tarn (Mere, Lough), old things in the Deeps (Elder, Sere, Soot, Relict, Lees, Umber, Dregs), burial words in the Boneyard (Ossuary, Charnel, Knell, the Spine, the Keel), marsh words in the Mire (Murk, Slough, Fen, Quag), cold words in the Hollows (Gelid, Rime, Cistern, Sump, Coldharbour) and dead-star words in the Pale (Shroud, Wane, Pyre, the Well).
- D9 companions: Vesper (Orison, region edge, Gloam tidal mouth), Jet (Sable), Gaff (Halvard), Barrow (Cairn, region edge, Deeps mouth).
- Placed for later tasks: Verdance at Taper, Stillwater at Wick, the four unseen Lantern garden worlds at Sconce, Votive, Beacon and Glimmer; Choir at Riffle and Bellows at Eddy in the Shoals; Ashlar at Relict in the Deeps; Rimelight's stations on Gelid, Rime (two) and Cistern, and the lost one on Sump.

Notes from 1.8:
- 86 bodies in the twelve inner regions (37 planets, 16 giants, 8 moons, 8 large asteroids, 8 stations, 5 belts, 3 fields and the Tarn yards), using 33 world types, with 34 surface places and 8 control areas.
- Split planets: Pennant (Synod north, Corvel's besieged south), Gloam (Purview twilight band, night side contested with the Coldwell Claims), Scald (Concord and League glassfields either side of the Seam).
- New named bodies follow the region themes: Wending's moons Ebb and Flood, Halyard Station's moon Splinter, Lumen's moon Russet, Sable's moonlet Mooring, the Ferrous foundry asteroids Hearth and Bloomery; Waymeet, Harbourage, Anchorhold, Brinemoor, Longfall, Terminus and Mercer's Hold are invented settlement names.
- Locations the documents do not give (the Syndicate registry, Purview camp on Scald, the Tallis garrison and similar) are placed where they fit the canon and can be moved.

Second pass over the 14 finished regions (GM request, Nov 25), stepping beyond the documents; everything added is `origin: invented` and named "(WIP)":
- Five new systems where the documents fix no star count: Matins and Compline at Orison, Onyx at Sable, Spar at Halvard, Dolmen at Cairn. Regions whose star count the documents state got planets, moons, stations and places instead.
- Notable invented worlds with proper names: Sanctum (Orison's candidate refuge, a thawing tundra world with diseases that have killed two survey crews), Litany (a storm-sea world where Halloran's Heirs rest), Menhir (a cold karst world of crystal caverns), Mirage (a thin-air moon where Syndicate crews rest from the war), Hob (a warm moon at Cairn that nobody has looked at, GM-only), Canticle (an ice moon with a Synod hermitage), Warden, Ropewalk, Spark. Renamed: Censer, Iris, Anthracite, Brimstone, Lethe, Brackwater, Cauldron.
- 73 new places, among them the Marrow's offices and decks, Tallis's river towns, Compact districts and League market town, Pennant's Pilgrim Guard fortress, Reach staging yards and siege lines, Orison's evacuation port, Wending's further lagoon towns and the burned copy-house, Gloam's twilight towns and Noonpoint, Scald's company camps along the Seam, and the Great Ring on Cairn.
- GM-only additions: the Tallymen's anchorage and berth, the Ringwreckers' hold, the Coldwell landing field, Mercer-Ibarra's quiet dock for the Seventh, and Hob.
- Totals after the pass: 109 systems, 160 bodies, 129 places, 10 control areas.

Notes from 1.9 (full detail, at the GM's request):
- Six new systems where the documents fix no count: Smelt (Furnace), Hoar and Floe (Hollows), Vestige (Deeps), the Bier (a third drifting wreck in the Boneyard) and Morass (Mire). The Lantern Reach keeps its nine stars and the Boneyard its three dim stars.
- The Lantern Reach's six garden worlds: Verdance (Taper) with its two abandoned landings and the Verdance Colonial Company's staging station; Stillwater (Wick) with the settled platform and unsettled ones; and four seen only from orbit, Verdigris, Halcyon (where a Synod survey party has landed), Meridian and Nocturne, each claimed by Corvel against the Synod. Also Wickless, a cold moon whose seas freeze and thaw with the Lantern cycle.
- The Orrery's nine worlds (Pinion, Arbor, Pallet, Ratchet, Detent, Mainspring, Balance, Fusee, Escapement), each a different type, with periods of 20 to 180 days in exact 1:2:...:9 resonance.
- The Pale's crystalline worlds at Shroud and Wane, the Survey Office station and Corvel's signal tender; Horizon, a frozen world circling the Well. The source of the 41-hour signal, the Caller, is GM-only.
- The Hollows: a heat engine on every rogue world, Rimelight's four stations on Gelid, Rime and Cistern, and the ruin of the fifth on Sump.
- The Shoals: a small lattice world in every system; Choir and its rings, Bellows with the towns Firstbreath and Sealhold, three Purview prospecting stations, and the Seventh's anchorage at Skerry (GM-only).
- The Deeps: Ashlar with its tower field, first landing site and quarantine picket; Elder I with a buried biosphere; Soot's carbon and diamond worlds. WAYMARK's ship and an Unlit den are GM-only.
- The Boneyard: named wrecks (Sepulchre, Reliquary, Catafalque, Ribcage, the Lantern Hulk), Ferrous Consolidated's concession station and salvage camps.
- The Mire: lattice dust lanes, the hidden marsh world Bogland, and an Unlit anchorage (GM-only).
- Totals: 115 systems, 264 bodies, 163 places. Thirteen items are GM-only.

Notes from 1.10:
- 62 lane ends attached in 21 regions, each with a lane-mouth body whose notes give the lane's length, behavior and direction. With the 11 from the pilot, every end is attached except the Quiet's three, which lie beyond the map.
- Placement follows the documents where they speak: the Wending passage opens near Halyard Station, the Tallis lane's Halyard mouth is where the Basin Office tender was destroyed, the Halvard Gap opens near Halvard's rings, Orison's tidal mouth and Cairn's Deeps mouth sit at the edge companions Vesper and Barrow, and all four of Tarn's mouths are at Tarn. Gloam per D8: Ostrom and Halvard mouths at Gloam under the guns, Shoals and Orison tide mouths at Ember. Elsewhere a region's mouths are spread across its systems.
- After 1.10 the Phase 1 test fails only on faction colors (task 1.12).

Notes from 1.11:
- 40 unmapped stars, seen at long range and never charted, with no known lanes. Most are named from the Calder probe catalog (Calder 117 and so on); three notable ones are named: the Watchfire, a blue supergiant 22 ly out that is visible from every world in the Basin and that spacers steer by; Lodestar, a blue giant; and Howl, a magnetar. One white dwarf sits in a planetary nebula, three red dwarfs flare, and three are wide binaries with their companions recorded as star bodies.
- With them the Basin holds 148 stars of 23 kinds (only the generic `remnant` is unused): 45% red and brown dwarfs, 16% orange and yellow dwarfs, 12% hot and young stars, 11% giants and 15% stellar remnants.

Notes from 1.12:
- Layers: governments 15 (with the Synod), corporations 15, companies and outlaws 12, peoples 5, faiths 4 (with the Synod). Every faction has a color, chosen to suit it and distinct within its layer (D14); colors may repeat across layers.
- The five peoples are factions in the peoples layer: Charter folk, the tail, the Thawed, the Basin-born and seam crews.
- Faiths and peoples are shown mostly through presence, marked major or minor with a short reason. The Synod holds Pennant (governments layer) and is present in the faiths layer at Pennant (major) and at Ostrom, Tallis, Wending, Halyard and the Lantern Reach, where its congregations and Cosmopolitan crews worship. The Vigil is major on the Marrow, the Gardeners on Orison, the Listeners on Scald; the tail is major across the trailing arm and much of the Basin.
- Contested regions reviewed: Tarn (Basin Office, Smith-Shimano, Ringwreckers) and Cairn (Kerr-Varga, the Bench) match their canon feuds; the Shoals now include the Bellows Commune beside the Purview and the Seventh, as the Factions doc lists it.
- System-level control where a system differs from its region: the Purview's prospecting systems and Tideline in the Shoals, the Commune's Eddy, Rimelight's Hollows, Ferrous Consolidated's Boneyard concessions, Matins and Dolmen.
- After 1.12 the complete Phase 1 check passes with no errors and no warnings.

Notes from 1.15:
- Every one of the 182 typed worlds carries `stats` and `profile`; the 39 stations carry `profile`. Field guide: [DATABLOCK.md](DATABLOCK.md).
- Authored: populations for 74 worlds and stations totaling 1,199,350 awake (the canon's "nearly 1.2 million"), trends, settled years, and the economies of the notable worlds and stations (canon trade: Tallis feeds the inner Basin, Halyard waters the trailing arm, Ferrous makes printer feed, the Assay House sets the lattice price). 381 gazetteer pronunciations.
- Deriving temperatures from stellar brightness exposed orbits that contradicted their climates. Sixteen livable worlds moved to orbits that fit (Gloam, Orison, Pennant, Wending, Halcyon, Meridian, Nocturne, Iris, Menhir and others); hostile worlds kept their orbits and took the climate their star gives them; the Ferrous belt and foundry asteroids moved out to 18 AU and Sable's moonlets a little further from Sable. Airless worlds take their physical temperature directly.
- A tidally locked world's day now always equals its orbit (Gloam's day is its 55-day year).
- Revision at the GM's request: the datablock reads as an in-universe register. GM story hooks were removed. Trade became an `economy` section with each world's primary activity, routed exports and imports, resources and levies (see DATABLOCK.md). Visible worlds no longer draw on GM-only objects.
- Consistency pass with that revision: contested worlds read as disputed; camps get landing pads and capitals spaceports; Verdance, Sump and Ashlar read as abandoned; the Hollows worlds and Bellows got the lattice ratings their seams imply; worlds without a magnetic field get the radiation their description promises; still air means little rain; Halyard I lost a "dim sun" it does not have at 12.5× standard light; Splinter has its Cormorant barracks' 1,500 people (taken from Halyard Station's count); every station has a pronunciation. The validator now checks for GM-only names in visible datablocks, lattice exports without the rating for them, contested worlds read as held, and food that is both self-sufficient and imported.

The pilot in 1.5 exists to catch schema problems on two regions before data goes into the other twenty-two. Change the schema there if needed, not later.
