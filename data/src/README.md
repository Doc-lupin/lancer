# Authored map data

`tools/build_map.py` merges these files with `data/parsed/` into `data/map.json`. During Phase 1, edit here, then rebuild. Objects follow `data/schema/map.schema.json`; the field guide is `data/schema/README.md`.

| File | Holds |
|---|---|
| `factions.json` | Layers, the category-to-layer map, edits to factions |
| `lanes.json` | Edits to lanes, mostly attaching lane ends to systems and mouths |
| `regions/<region id>.json` | One region: `region` (edits), `systems`, `bodies`, `places`, `areas` |
| `unmapped.json` | Unmapped stars (task 1.11) |
| `clock.json`, `content.json` | Clock override; units, text boxes, headlines |

An entry whose id already exists changes only the fields it lists. A field set to `null` is removed.

## Conventions (set by the Ostrom and Tallis pilot)

- **Positions.** A system gives `offset`, in light-years from its region center, not `pos`. Its stars then move with the region when the center is hand-adjusted. Keep offsets within 1.5 ly (D12, open).
- **Ids.** Systems end in `-system`. A body takes its name, plus its type if the id is taken (`tallis-planet`). Lane mouths are `<lane id>-at-<region>`.
- **Origin.** `canon` if the documents establish the object, even when its orbit, size and coordinates are invented. Ostrom's six planets are canon; Tallis III is invented.
- **Names.** A name the documents don't give ends in " (WIP)", with `nameOrigin: "invented"` on a canon object. Roman numerals for planets, letters for small moons (`Tallis a (WIP)`). Names made from canon names (`Scald mouth`) count as canon.
- **Orbits.** AU around a star, km around a planet. Periods follow Kepler's third law from the parent's mass. `periodDays: null` holds a body still (lane mouths, the gate). The orbit epoch is 5029u day 1.
- **Notes.** `notes` are what players may read. `gmNotes` are secrets only. Editor remarks, such as "location invented", go in `_comment`.
- **Control.** Set `control` on systems, key bodies, places and areas. Planets split between factions get `areas` (lat/lon polygons).
- **Variety (D16, D18).** Don't default to dwarfs and barren rock. Use the full range of star kinds and features (docs/PHASE1.md, Stellar variety) and companion stars. Every planet, moon and giant gets a `world` type, `variant`, `habitability`, `climate` and `worldFeatures` from [docs/WORLDS.md](../../docs/WORLDS.md), which also has the canon world types and the variety rules.
- **Climate on airless worlds.** The cool, cold, temperate and warm climate texts describe seasons and weather. Give airless worlds (barren, iron, ice, moonlets and the like) `frozen`, `hot` or `scorching`; the validator warns otherwise.
- **Surface coordinates.** Each region file's `_comment` says where the continents are, so later places stay consistent.
