# Map data schema

`map.schema.json` (JSON Schema 2020-12) describes `data/map.json`, the single data file the app loads and saves.

The schema checks the shape of each object. It does not check that an id points to something real, or that the data is complete. `tools/validate_map.py` (task 1.2) does that.

## Rules for every object

- Lists are flat: regions, systems, bodies, places and areas are separate arrays, and each object names its parent by id. The store and the reference check both work on flat lists.
- Objects reject unknown fields, so a misspelled field fails validation. A `_comment` field is allowed anywhere for notes to the editor.
- Units: light-years for `pos`, AU or km for orbits (`orbit.unit`), km for radii, degrees for latitude and longitude.

| Field | Meaning |
|---|---|
| `id` | Lowercase kebab-case, unique across the whole file. Regions use the bare name (`scald`). System ids always end in `-system` (`scald-system`). A body uses its name, plus its type when the id is taken (`scald-planet`). A lane mouth is `<lane id>-at-<region>` (`ostrom-scald-at-ostrom`). |
| `name` | Display name. Ends with " (WIP)" when the name is invented. |
| `origin` | `canon` if the setting documents establish the object, `invented` if not. |
| `nameOrigin` | Only when the name's origin differs from the object's, e.g. a canon star with an invented name, or "Ostrom II (WIP)": the documents say Ostrom has six planets but name only Ostrom IV. Defaults to `origin`. "(WIP)" follows this value. A name built from canon names ("Ostrom – Scald", "Scald mouth") counts as canon. |
| `visibility` | `all`: players see the object. `gm`: hidden in player mode. |
| `notes` | Player-visible text. |
| `gmNotes` | GM-only text. Hidden in player mode even when the object is visible. |

## Checking the data

`python3 tools/validate_map.py [file]` checks a map file (default `data/map.json`). Add `--complete` for the Phase 1 exit test, which also requires every region to have a system, every lane end to be attached to a system, every faction to have a color, every region position to be locked and every orbiting body to have an orbit. `example.json` is a two-region example that passes `--complete`. `python3 tools/test_validate_map.py` tests the validator against it.

## Top level

| Field | Meaning |
|---|---|
| `schemaVersion` | Always 1 for now. |
| `basin` | The Basin itself: name, `diameterLy`, `axes` (description of the coordinate axes). |
| `clock` | Calendar and current date (below). |
| `layers`, `alignments`, `factions`, `feuds` | Affiliation data. `feuds` is optional. |
| `regions`, `systems`, `bodies`, `places`, `areas` | The map hierarchy: region → system → body → place or area. |
| `lanes` | Primary lanes (and any local lanes shown). |
| `units`, `textBoxes`, `headlines` | Strategy and interface content. Can be empty. |

## Shared parts

| Part | Fields |
|---|---|
| `date` | `year` (Union), `day` 1–365. |
| `control` | `status`: `held`, `contested`, `none` or `unknown`. `holders`: faction ids (at least one for held or contested, none otherwise). `note`: e.g. "by concession". |
| `presence` | List of `{faction, strength, note, visibility}` for factions present but not in control. `strength` is `major` or `minor`. |
| `lattice` | `rating` (none, trace, small, moderate, rich, very rich, exceptional, unknown), `trend` (rising, falling, steady), `where`. |

## Clock

| Field | Meaning |
|---|---|
| `daysPerYear` | 365. |
| `basinYearOffset` | 5017. Basin year = Union year − 5017. |
| `epoch` | Fixed reference date. Orbit phases are given at this date. Don't change it once orbits are entered. |
| `current` | The date the map shows. The dashboard clock changes this. |
| `lanternTide` | The 73-day Lantern cycle: `cycleDays`, `openDays`, and an `anchor`: a `date` and its `cycleDay`. Cycle days count 1 to `cycleDays`; lanes are open on days 1 to `openDays`. |

## Affiliation

| Object | Fields |
|---|---|
| `layer` | `kind`: governments, corporations, companies, cultures, religions or other. The selector shows one layer at a time. |
| `alignment` | Named bloc, e.g. the crossroads or the Gap Accord. |
| `faction` | `category` (government, company, outlaw, commerce, faith, people); `layers` (one or more layer ids); `color` (#rrggbb, one per faction); `parent` (e.g. the Northern Concord's parent is the Glass Syndicate); `seat` (region ids) and `seatDetail`; `alignment` and `alignmentNote`; `leaders`, `strength`, `population`, `latticeAtHome`. |
| `feud` | `sides` (two or more lists of faction ids), `over`, and the `regions` and `lanes` it touches. |

On a layer, an object is colored by its `control.holders` that belong to that layer. If none of them do, it uses its `presence` factions in that layer. Contested (more than one faction) is drawn as stripes.

## Map hierarchy

| Object | Fields |
|---|---|
| `region` | `arm` (crossroads, coreward, trailing, spinward, rimward, beyond); `frontier`; `label` (chart subtitle); `chartPos` (box center on the official chart); `pos` (center, ly); `locked` (hand-placed, keep on regeneration); `effect` (none, nebula, dust-cloud); `lattice`; `control` (required); `presence`. |
| `system` | `region` (null for a star outside any region); `charted` (false = unmapped star, drawn dimmer); `pos` (ly, absolute); `center`; `lattice`, `control`, `presence`. |
| `system.center` | `type`: star, rogue-planet, wreck or structure. A star needs `kind`. Any other type needs `body`, the id of the body at the center. `variable` makes the star pulse: `{cycle: "lantern"}` follows the clock's Lantern tide; `{cycle: "natural", periodDays}` for an ordinary variable star. `amplitude` (0–1) is how far the brightness swings. `features` (below) adds flares, disks, jets and the like. A system with several stars puts the others in `bodies` as type `star`, orbiting the center. |
| `starKind` | Main sequence, coolest to hottest: red-dwarf (M), orange-dwarf (K), yellow-dwarf (G), yellow-white-star (F), white-star (A), blue-white-star (B), blue-star (O). Young: protostar. Evolved: subgiant, red-giant, orange-giant, yellow-giant, blue-giant, red-supergiant, blue-supergiant, carbon-star, wolf-rayet. Remnants: white-dwarf, neutron-star, pulsar, magnetar, black-hole, remnant (unidentified). Substellar: brown-dwarf. |
| `starFeature` | flares, starspots, debris-disk, protoplanetary-disk, accretion-disk, planetary-nebula, jets, strong-wind. Set on a star as `features`. |
| `body` | `system`; `parent` (the body it orbits; none = orbits the center); `type` (star, planet, gas-giant, moon, rogue-planet, asteroid, asteroid-belt, field, station, structure, wreck, lane-mouth); `kind` (stars only); `class` (free text, e.g. "garden world"); `orbit`; `radiusKm`; `rotation`; `appearance`; `population`; `lattice`, `control`, `presence`. |
| `body.orbit` | `distance` and `unit` (au or km); `periodDays` (null = fixed position, e.g. a lane mouth); `phaseDeg` (angle at the epoch); `inclinationDeg`; `eccentricity`. Positions follow the dashboard clock. |
| `body.rotation` | `periodHours`, `tidallyLocked`, `axialTiltDeg`. |
| `body.appearance` | `color`, `texture` (file in `public/textures/`), `clouds`, `atmosphere`, `rings`. |
| `place` | A point on a planet or moon: `body`, `kind` (city, town, settlement, base, camp, mine, refinery, port, landing, front, battlefield, structure, ruin, site, other), `at` [lat, lon], `path` (a line of [lat, lon], for fronts like the Seam), `population`, `control`. |
| `area` | A control area on a planet or moon: `body`, `polygon` (at least 3 [lat, lon] points), `control`. Used where a planet is split, e.g. Scald, Tallis, Pennant, Gloam. |

## Lanes

| Field | Meaning |
|---|---|
| `name` | The lane's canon name if it has one ("The Halvard Gap"); otherwise the two region names, "Ostrom – Scald". A name made from region names counts as canon. |
| `from`, `to` | Lane ends: `region` (required), `system` and `mouth` (a body of type lane-mouth) once known. Order matters only for one-way lanes. |
| `scope` | `primary` (default) or `local`. |
| `days` | Lane time; null when unknown (the Silent Mouths). `daysRange` [min, max] for lanes that vary, e.g. the Sable Run [10, 15]. |
| `drifting`, `oneWay`, `silent` | Behavior flags. A lane can have several, e.g. a Silent Mouth is silent, one-way and tidal. |
| `tidal` | Absent if the lane is always open. `{cycle: "lantern"}` follows the clock's Lantern tide; `{cycle: "unknown"}` for the Silent Mouths; `{cycle: "custom", custom: {...}}` for any other cycle. |
| `bypass` | Bypass name, e.g. "The Halvard Gap". |
| `control` | Who holds the lane, e.g. Mercer-Ibarra holds the Gap. |

## Units, text boxes, headlines

| Object | Fields |
|---|---|
| `unit` | `faction`; `kind` (fleet, ship, convoy, frames, troops, other); `size` (free text, e.g. "200 frames"); `location` (one of region, system, body, place or lane); `orders`. |
| `unit.orders[]` | `lanes` (the route, in order), `to`, `depart` (date), `status` (planned, moving, done, cancelled), `visibility`. |
| `textBox` | `title`, `text`, `anchor`: `{object: id}` to attach to a map object or `{screen: [x, y]}` (0–1) to fix it on the screen. |
| `headline` | `text`, `date`, `about` (ids of related objects). Feeds the news ticker. |
