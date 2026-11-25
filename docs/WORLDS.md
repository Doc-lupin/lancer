# Worlds of the Basin

A guide for designing systems (Phase 1 tasks 1.5–1.9 and 1.11). The Basin should feel varied: no two systems alike, few barren rocks without a reason, and the strange worlds the setting promises.

## Fields on a body

| Field | Meaning |
|---|---|
| `world` | World type from the catalog below. Required on planets, moons, rogue planets, gas giants and named asteroids by the Phase 1 test. |
| `habitability` | How people live there (scale below). |
| `climate` | scorching, hot, warm, temperate, cool, cold or frozen. Use it to vary a type: a cold `karst` world, a hot `tidally-locked` one. |
| `worldFeatures` | What makes this world different from others of its type: rings, a great storm, Absent machinery, lattice seams, native life and so on. |
| `class` | Free text for anything else: "cold super-Earth", "shattered ice moon". |

## Habitability

| Value | Meaning | Basin examples |
|---|---|---|
| `garden` | Open air, open ground, native or Absent-tended biosphere. | Tallis, Pennant, Verdance |
| `habitable` | Open air with hardship: harsh seasons, a narrow band, a failing climate. | Gloam's twilight band, Orison |
| `marginal` | Masks, seasons or sealed towns; people live there but the world fights back. | Scald, Bellows, Cairn |
| `hostile` | Sealed habitats only. | Ostrom IV, Halvard's Rest, the Hollows |
| `lethal` | Hardened habitats only, if at all: heat, radiation, pressure. | Cinder's pulsar worlds, hothouse worlds |
| `none` | No surface: gas and ice giants. | Halvard, Choir |

The validator flags a habitability that is unusual for the type's family as a warning, not an error, so a habitable ice world can exist if there is a reason.

## Canon worlds

Recommended types for the worlds the documents describe. Apply them in tasks 1.7–1.9.

| World | Type | Habitability | Climate | Features |
|---|---|---|---|---|
| Tallis | `continental` | garden | temperate | climate-engine |
| Pennant | `boreal` | garden | cool | climate-engine (the 40 km ring), eccentric-orbit |
| Orison | `continental` | habitable | cool | failing-climate-engine, lattice-seams |
| Wending | `archipelago` | garden | warm | native-life |
| Verdance (Lantern Reach) | `megaflora` | garden | warm | climate-engine, megafauna |
| Stillwater (Lantern Reach) | `ocean` | habitable | temperate | absent-ruins (the platforms) |
| The four unseen Lantern garden worlds | `tropical`, `lake`, `savanna`, `bioluminescent` | garden | varied | climate-engine |
| Gloam | `tidally-locked` | habitable | cold | lattice-seams, custodians |
| Scald | `glassed` | marginal | hot | lattice-seams, custodians |
| Cairn | `dense-air` | marginal | cold | native-life, lattice-seams |
| Bellows (Shoals) | `seasonal` | marginal | cold | climate-engine |
| Ostrom IV | `super-earth` | hostile | cold | |
| Lumen's moon | `volcanic` | hostile | warm | tidal-heating |
| Halvard's Rest | `subglacial-ocean` | hostile | frozen | subsurface-ocean |
| Halvard | `cold-giant` | none | | great-storm, rings |
| Choir (Shoals) | `cold-giant` | none | | rings, lattice-crust (the rings) |
| Tarn | `barren` | hostile | cold | rings, absent-ruins (the shipyard) |
| Ashlar (Deeps) | `barren` | hostile | cold | absent-ruins (the towers) |
| The Hollows' rogue worlds | `subglacial-ocean` | hostile | frozen | heat-engine, lattice-seams |
| The Pale's airless worlds | `crystalline` | hostile | frozen | lattice-crust |
| The Orrery's nine worlds | a mix, no two alike | hostile to garden | varied | resonant-orbit |
| Halyard Station's moon | `shattered` | hostile | frozen | |
| Cinder's planets | `pulsar-world` | lethal | | radiation |

## Variety rules for new systems

- Give every system at least one world worth a second look: an unusual type, a feature, or a pairing (a garden moon of a gas giant, a binary planet, a giant with a lattice ring).
- Don't repeat a type within a region unless the repeat is the point (the Pale's crystal worlds). Use `climate` and `worldFeatures` to make two worlds of the same type differ.
- Let the star decide. Hot and lava worlds near giants and blue stars; pulsar worlds at Cinder; icy and methane worlds far out; giants of every temperature class, not just banded cold ones.
- Rough mix for the whole Basin: about a quarter giants (spread across the temperature classes), a third hostile rock, a fifth ice, a tenth marginal, and the rest habitable and small bodies. The Basin has more garden worlds than it should (canon), so habitable worlds are rare but not vanishingly so.

## Catalog

<!-- catalog:start -->

Generated from the schema by `tools/world_catalog.py`. Edit the schema, then rerun.

### Habitable: wet (`habitable-wet`)

| Type | What it is |
|---|---|
| `continental` | Large continents of forest, grassland and river, with open seas between. |
| `forest` | Canopy over most of the land; long rivers and deep soil. |
| `lake` | Land scoured into thousands of lakes and channels. |
| `marsh` | Low, waterlogged country: fens, peat and slow brown rivers. |
| `ocean` | A world ocean with scattered islands. |
| `archipelago` | Chains of volcanic islands in shallow seas, flooded and drained by the tides. |
| `reef` | Shallow seas built up by reef-forming life; most land is living rock. |
| `tropical` | Hot and wet, rainforest from coast to mountain. |
| `monsoon` | Seasons of flood and drought; rivers that change course. |
| `megaflora` | Plant life on a giant scale; forests hundreds of meters tall. |
| `fungal` | A biosphere dominated by fungi and molds; spore fogs at dawn. |
| `bioluminescent` | Life that glows; nights brighter than some days. |

### Habitable: dry (`habitable-dry`)

| Type | What it is |
|---|---|
| `desert` | Sand seas and bare rock; water only underground or at the poles. |
| `oasis` | Mostly desert, with life gathered around deep aquifers and springs. |
| `arid` | Mesas, badlands and canyons; short, violent rains. |
| `mediterranean` | Dry summers, wet winters; scrub, orchards and rocky coasts. |
| `savanna` | Grassland with scattered trees and a long dry season. |
| `steppe` | Cold, dry grassland; wind and open distance. |
| `supercontinent` | One huge landmass with a dry interior and green coasts. |

### Habitable: cold (`habitable-cold`)

| Type | What it is |
|---|---|
| `tundra` | Permafrost, moss and lichen; short summers. |
| `boreal` | Endless conifer forest and bog; long winters. |
| `alpine` | High mountains and plateaus; thin, cold air on the heights. |
| `fjord` | Glacier-cut coasts and deep inlets; cold, wet, forested valleys. |
| `arctic` | Ice sheets over most of the world; life on the coasts and in the sea. |

### Habitable: special (`habitable-special`)

| Type | What it is |
|---|---|
| `superhabitable` | Larger and kinder to life than any settler's home: more land, richer seas, heavier gravity. |
| `karst` | Limestone country riddled with caves, sinkholes and underground rivers; rich in minerals. |
| `tidally-locked` | One face always to its star: a burning day side, a frozen night side and a living twilight band. |
| `geothermal` | A cold world warmed from below; life clusters around vents and hot springs. |

### Marginal (semi-habitable) (`marginal`)

| Type | What it is |
|---|---|
| `seasonal` | Breathable for part of the year only. |
| `dense-air` | Thick, heavy air and permanent overcast; breathable only with care. |
| `thin-air` | Thin, cold air; masks outdoors. |
| `toxic-air` | Air that needs filters, and life that tolerates it. |
| `storm` | Perpetual storms and surge; shelter is survival. |
| `dust` | Dust storms that cover the world for months. |
| `glassed` | Plains fused to glass by some ancient catastrophe. |
| `salt` | Salt pans and brine lakes; hardy life at the margins. |
| `high-gravity` | Gravity that wears down bodies and machines; thick, low air. |
| `flare-scoured` | Swept by stellar flares; life underground or on the night side. |

### Hostile rock (`rocky`)

| Type | What it is |
|---|---|
| `barren` | Airless, cratered rock. |
| `super-earth` | A large rocky world with no native life; thin or heavy air. |
| `iron` | Mostly metal core; dense, dark and rich in ore. |
| `carbon` | Graphite plains, tar pits and carbide mountains. |
| `diamond` | A carbon crust pressed into diamond. |
| `chthonian` | The stripped core of a gas giant that strayed too close to its star. |
| `lava` | A molten or half-molten surface. |
| `volcanic` | Constant eruptions and sulfur plains, usually from tidal heating. |
| `hothouse` | Runaway greenhouse: crushing, scalding air under acid cloud. |
| `pulsar-world` | Scoured by a pulsar's beam; glassy, irradiated rock. |
| `shattered` | Broken by tides or collision; a loose pile of rubble held by its own weight. |
| `crystalline` | Crusted with lattice laid down from outside, as on the Pale's airless worlds. |

### Ice (`icy`)

| Type | What it is |
|---|---|
| `ice` | A frozen surface of water ice and rock. |
| `subglacial-ocean` | A liquid ocean under kilometers of ice. |
| `cryovolcanic` | Ice volcanoes and geysers. |
| `methane-sea` | Lakes and seas of liquid methane and ethane under an orange haze. |
| `hydrocarbon` | Tar seas and waxy hydrocarbon dunes. |
| `snowball` | A once-temperate world frozen solid. |

### Giants (`giant`)

| Type | What it is |
|---|---|
| `hot-giant` | A close-orbiting gas giant, bloated and glowing. |
| `silicate-giant` | So hot that its clouds are rock vapor; glows red on the night side. |
| `cloudless-giant` | Too warm for ammonia, too cool for water: deep, clear blue. |
| `warm-giant` | Bright white water-vapor clouds. |
| `cold-giant` | Banded ammonia clouds; the classic gas giant. |
| `puffy-giant` | Very low density; its atmosphere bleeds into space. |
| `helium-giant` | Hydrogen-poor; pale grey and white. |
| `ice-giant` | Water, ammonia and methane under a blue-green haze. |
| `mini-neptune` | A small gas world: deep atmosphere and no surface. |

### Small bodies (`small`)

| Type | What it is |
|---|---|
| `dwarf-planet` | A small round world. |
| `comet` | A captured comet: dust, ice and jets. |
| `moonlet` | A small, irregular moon or rock. |

**Climate:** scorching, hot, warm, temperate, cool, cold, frozen.

**World features:** rings, great-storm, aurorae, tidal-heating, eccentric-orbit, retrograde-orbit, resonant-orbit, binary-planet, cryovolcanoes, geysers, subsurface-ocean, radiation, low-gravity, native-life, megafauna, climate-engine, failing-climate-engine, heat-engine, absent-ruins, custodians, lattice-seams, lattice-crust, glassed-areas.

<!-- catalog:end -->
