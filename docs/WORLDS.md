# Worlds of the Basin

This document classifies the planets, moons and minor bodies of the Basin for the map's data and serves as the reference for designing systems (Phase 1 tasks 1.5 to 1.9 and 1.11). The classification follows established planetary science where it applies and adds types particular to the Basin, chiefly those shaped by lattice and by Absent machinery.

The Basin is unusual in two respects. It holds more habitable worlds than a cluster of its size should, most of them maintained by Absent climate engines; and its frontier contains worlds whose condition has no natural explanation. Its catalog should reflect both. Barren rock is common in every system, but no system should consist of nothing else.

## Recording a world

Each world is recorded on its body in the map data with the following fields.

| Field | Content |
|---|---|
| `world` | World type, from the catalog below. Required on every planet, moon, rogue planet, gas giant and named asteroid by the Phase 1 test. |
| `variant` | Variant of that type, from the type's list. Optional. |
| `habitability` | Degree to which people can live on the world, from `garden` to `none`. |
| `climate` | Thermal regime, from `scorching` to `frozen`. Applies to solid worlds; omit for giants. |
| `worldFeatures` | Particular conditions that distinguish the world from others of its type. |
| `class` | Free-text description for anything not captured above, e.g. "cold super-Earth" or "shattered ice moon". |

Type and variant describe what a world is. Climate and features describe how it differs from others of its kind. Two worlds of the same type and variant should still differ in climate, features or both.

The validator rejects a variant that does not belong to the recorded type, a giant type on a solid body and a solid type on a giant. A habitability outside the usual range for a type's family is reported as a warning only, since the Basin's Absent machinery makes exceptions possible.

## Canon worlds

The setting documents describe the following worlds. Their recommended classification is given here and is applied when their regions are entered (tasks 1.7 to 1.9).

| World | Region | Type | Variant | Habitability | Climate | Features |
|---|---|---|---|---|---|---|
| Tallis | Tallis | `continental` | `river-valley` | garden | temperate | climate-engine, native-life |
| Pennant | Pennant | `boreal` | `fjord-coast` | garden | cool | climate-engine, eccentric-orbit |
| Orison | Orison | `continental` | `maritime` | habitable | cool | failing-climate-engine, lattice-seams |
| Wending | Wending | `archipelago` | `tidal-flats` | garden | warm | extreme-tides, native-life |
| Verdance | The Lantern Reach | `megaflora` | `giant-canopy` | garden | warm | climate-engine, megafauna, abandoned-settlement |
| Stillwater | The Lantern Reach | `ocean` | `doldrum` | habitable | temperate | absent-ruins |
| Four unseen garden worlds | The Lantern Reach | `tropical`, `lake`, `savanna`, `bioluminescent` | | garden | varied | climate-engine |
| Gloam | Gloam | `tidally-locked` | `twilight-band` | habitable | cold | lattice-seams, custodians, katabatic-winds |
| Scald | Scald | `glassed` | `glassfield` | marginal | hot | lattice-seams, custodians, battlefield |
| Cairn | Cairn | `dense-air` | `overcast` | marginal | cold | builder-organisms, possible-sapience, lattice-seams |
| Bellows | The Shoals | `seasonal` | `oxygen-season` | marginal | cold | climate-engine, lattice-seams |
| Ostrom IV | Ostrom | `super-earth` | `cold` | hostile | cold | |
| Lumen's moon | Lumen | `volcanic` | `lava-lakes` | hostile | warm | tidal-heating, tidally-locked-to-parent |
| Halvard's Rest | Halvard | `subglacial-ocean` | `thin-shell` | hostile | frozen | subsurface-ocean |
| Halvard | Halvard | `cold-giant` | `storm-giant` | none | | great-storm, rings |
| Choir | The Shoals | `cold-giant` | `banded` | none | | lattice-rings |
| Tarn | Tarn | `barren` | `cratered` | hostile | cold | rings, absent-ruins |
| Ashlar | The Deeps | `barren` | `tower-field` | hostile | cold | absent-ruins, quarantine |
| Rogue worlds | The Hollows | `subglacial-ocean` | `rogue-warmed` | hostile | frozen | heat-engine, lattice-seams |
| Airless worlds | The Pale | `crystalline` | `lattice-crust` | hostile | frozen | lattice-crust, absent-signal |
| The nine worlds | The Orrery | a different type for each | | hostile to garden | varied | resonant-orbit |
| Halyard Station's moon | Halyard | `shattered` | `rubble-pile` | hostile | frozen | |
| Planets of Cinder | Ostrom | `pulsar-world` | `survivor` | lethal | | radiation |

## Composition of systems

The following conventions apply to new systems.

1. Each system contains at least one world of note: an uncommon type, a distinguishing feature or an unusual pairing, such as a habitable moon of a warm giant, a binary planet or a giant with a lattice ring.
2. A world type is not repeated within a region unless the repetition is characteristic of the region, as with the Pale's crystalline worlds. Climate and features distinguish worlds of the same type where repetition occurs.
3. World types follow the star and the orbit. Lava, chthonian, steam and hot giant types occur close to their stars or around giants and blue stars; pulsar worlds occur only around pulsars; ice, methane-sea and hydrocarbon types occur far out; carbon and diamond worlds are associated with carbon stars and stripped companions. Giants are distributed across all temperature classes rather than limited to cold banded giants.
4. The approximate composition of the Basin as a whole is one quarter giants of all classes, one third hostile rock, one fifth ice, one tenth marginal worlds and the remainder habitable worlds and catalogued small bodies. Habitable worlds are rare, though less so than in comparable clusters.

## Catalog

<!-- catalog:start -->

Generated from `data/schema/worlds.json` by `tools/world_catalog.py`. Edit that file, then rerun the tool.

### Habitability

| Value | Definition |
|---|---|
| `garden` | Open air and open ground. A native or Absent-maintained biosphere supports unassisted settlement and agriculture. |
| `habitable` | Open air with hardship. Settlement is possible without sealed habitats but is limited by season, latitude, a narrow climatic band or a deteriorating climate. |
| `marginal` | Settlement depends on masks, sealed towns or seasonal occupation. Populations are usually small and supplied from elsewhere. |
| `hostile` | Sealed habitats only. The surface does not support unprotected life at any season. |
| `lethal` | Hardened habitats only, where practical at all. Temperature, pressure or radiation exceeds the tolerance of standard environmental equipment. |
| `none` | No solid surface. Applies to gas giants, ice giants and mini-Neptunes; settlement is limited to orbital or floating stations. |

### Climate

| Value | Definition |
|---|---|
| `scorching` | Surface temperatures high enough to melt lead or rock. |
| `hot` | Persistently above the limits of unprotected human tolerance at low latitudes. |
| `warm` | Warmer than temperate on average; tropical conditions at low latitudes. |
| `temperate` | Mean temperatures within the range of most settled Union worlds. |
| `cool` | Below temperate on average; long winters or short growing seasons. |
| `cold` | Persistent frost outside a limited band or season. |
| `frozen` | Permanently below the freezing point of water across the surface. |

### Habitable: wet (`habitable-wet`)

Worlds with abundant surface water and an established open-air biosphere. Wet worlds account for most of the Basin's garden worlds and most of its population.

Usual habitability: garden, habitable, marginal.

#### Continental world (`continental`)

A terrestrial world divided between two or more large landmasses and connected oceans, with a moderate axial tilt and a full water cycle. Continental worlds support the widest range of biomes of any class and are the preferred target for agricultural settlement. The type example in the Basin is Tallis, whose air and rainfall are regulated by Absent machinery several kilometers below the surface.

Variants:

- `river-valley`: Long drainage basins carry most of the rainfall; settlement follows the rivers.
- `highland-interior`: Continental interiors rise into dry uplands, as in the Reach on Tallis.
- `maritime`: Narrow continents and a mild oceanic climate with little seasonal range.
- `grassland`: Broad interior plains dominated by grasses and grazing fauna.
- `moss`: Low ground cover with few trees; slow-growing and easily damaged.
- `twin-continent`: Two landmasses of similar size facing each other across a single ocean.

#### Forest world (`forest`)

A world on which closed-canopy forest covers most land below the tree line. Soils are deep and rivers long; open ground is limited to coasts, uplands and burn scars. Clearing land for agriculture is slow, and forest settlement tends toward forestry, trapping and small cleared holdings.

Variants:

- `temperate-broadleaf`: Deciduous forest with a pronounced autumn.
- `rainforest-cold`: Wet, mossy conifer forest on cool coasts.
- `petrified`: Large stands of mineralized trees from an earlier biosphere.
- `canopy-dwellers`: Most fauna lives above the ground; the forest floor is quiet.
- `bamboo-analog`: Fast-growing grass-like stands that regrow cleared land within a season.

#### Lake world (`lake`)

A world whose land has been scoured by past glaciation into a dense network of lakes, channels and eskers. Standing water may cover a third of the land surface. Travel is easier by boat than overland, and freshwater fisheries are the main source of food.

Variants:

- `glacial-scour`: Thousands of small lakes in hard rock, with thin soils between.
- `great-lakes`: A few inland seas large enough to have tides and storms.
- `crater-lakes`: Lakes filling impact or volcanic basins, often deep and round.
- `oxbow-country`: Meandering lowland rivers and the lakes they leave behind.

#### Marsh world (`marsh`)

A low-relief world with poor drainage, where fens, peat bogs and slow rivers cover much of the land. Methane and sulfur compounds from decay are common near the surface. Firm ground is scarce, and settlements are built on raised ground, pilings or floating platforms.

Variants:

- `peatland`: Deep peat that burns for years once lit.
- `mangrove-coast`: Salt-tolerant forest on tidal flats along every coastline.
- `reed-sea`: Vast shallow reed beds with channels kept open by fauna.
- `mire`: Acidic bog with preserved remains of older life in its depths.

#### Ocean world (`ocean`)

A world on which ocean covers more than nine-tenths of the surface, with land limited to islands and shoals. Ocean worlds carry large heat reservoirs and tend to have mild, stable climates. Settlement relies on floating towns, island holdings and sea farming. Stillwater, in the Lantern Reach, is an ocean world without tides and with almost no wind.

Variants:

- `shoal-sea`: Wide continental shelves and shallow seas over most of the world.
- `deep-ocean`: Abyssal depths with almost no shallow water.
- `kelp-forest`: Dense floating or anchored vegetation over large areas of open sea.
- `doldrum`: Little wind and few waves; the sea is flat for weeks at a time.
- `storm-sea`: Strong winds and permanent long-period swell.
- `algal`: Seas colored by algal blooms; green, red or brown by season.

#### Archipelago world (`archipelago`)

An ocean world whose land occurs as long chains of volcanic or coral islands. Island arcs follow tectonic or hotspot lines, and large moons often raise strong tides between them. Wending is the Basin's type example: its archipelagos flood and drain twice a day, and its towns ride the tides on cables.

Variants:

- `volcanic-arc`: Island chains above subduction zones; frequent eruptions.
- `hotspot-chain`: Islands aging in a line away from an active hotspot.
- `tidal-flats`: Low islands exposed and drowned by large tides.
- `atoll`: Ring-shaped reefs around sunken volcanoes, enclosing lagoons.

#### Reef world (`reef`)

A world with shallow, warm seas in which reef-building organisms have constructed most of the land over geological time. The islands are biological in origin and continue to grow. Reef ecosystems are dense and productive but easily damaged by dredging and runoff.

Variants:

- `barrier-reef`: Long reef walls enclosing calm lagoons along every coast.
- `living-isles`: Islands still growing at their margins.
- `bleached`: Reefs dying back from a recent change in temperature or chemistry.

#### Tropical world (`tropical`)

A warm, humid world with little seasonal variation, on which rainforest extends from coast to mountain across most latitudes. Biomass and species diversity are high, as are rates of disease and decay. Equipment corrodes quickly and cleared land returns to forest within a few years.

Variants:

- `rainforest`: Multi-layered evergreen forest over most land.
- `cloud-forest`: Mountain forest in permanent mist.
- `tepui`: Isolated table mountains with their own ecosystems above the forest.
- `cenote`: Limestone lowlands with water reached through collapsed sinkholes.
- `thunderstorm`: Daily convective storms and extreme lightning frequency.

#### Monsoon world (`monsoon`)

A world with a strongly seasonal climate in which a wet season of heavy rain and flooding alternates with a long dry season. Rivers shift course from year to year and floodplains are rebuilt annually. Agriculture follows the flood.

Variants:

- `floodplain`: Broad lowlands inundated each wet season.
- `delta`: River mouths that rebuild and abandon their channels.
- `dry-forest`: Forest that sheds its leaves through the dry season.

#### Megaflora world (`megaflora`)

A world on which plant life reaches extreme size: trees hundreds of meters tall, root systems spanning kilometers and an understory that receives little light. Megaflora worlds usually combine high carbon dioxide, long growing seasons and low gravity or an exceptionally warm climate. Verdance, in the Lantern Reach, whose climate machinery runs hot, has defeated two attempts at settlement.

Variants:

- `giant-canopy`: A closed canopy at great height; the ground lies in permanent shade.
- `root-bridge`: Root systems that span rivers and ravines.
- `aerial-flora`: Lighter-than-air or epiphytic plants that live entirely above the ground.

#### Fungal world (`fungal`)

A world whose biosphere is dominated by fungi, molds and analogous decomposers rather than photosynthetic plants. Fungal worlds are usually dim or overcast. Spore fogs are common at dawn, and some spores are hazardous to human lungs.

Variants:

- `mycelial-mat`: A continuous underground network linking whole regions.
- `spore-fog`: Seasonal or daily spore releases that reduce visibility to meters.
- `giant-fungus`: Fruiting bodies the size of trees.

#### Bioluminescent world (`bioluminescent`)

A world on which a large proportion of organisms produce light, usually on a dim or long-night world where light is used for signaling, hunting or symbiosis. Night landscapes on these worlds can be brighter than overcast days. The glow follows seasonal and tidal cycles.

Variants:

- `glowing-sea`: Luminous plankton across whole ocean basins.
- `lantern-forest`: Forest whose canopy glows through the night.
- `cave-glow`: Light confined to cave systems and the deep sea.

### Habitable: dry (`habitable-dry`)

Worlds on which liquid water is scarce at the surface but life is established. Settlement concentrates where water can be reached.

Usual habitability: garden, habitable, marginal.

#### Desert world (`desert`)

A world on which surface water is scarce outside the poles and deep aquifers, and sand seas, gravel plains and bare rock cover most of the land. Day-night temperature ranges are large. Life is sparse but well established, and settlement depends on wells, ice mining or imported water.

Variants:

- `erg`: Sand seas of moving dunes.
- `reg`: Flat gravel and stone plains.
- `ironsand`: Dark, iron-rich sand; hot underfoot and magnetic.
- `coastal-fog`: Cold currents bring fog to the coasts, which support most of the life.
- `polar-caps`: Water locked in polar ice, with dry equatorial lands between.

#### Oasis world (`oasis`)

A desert world on which life and settlement cluster around isolated sources of water: springs, artesian basins and the outflows of deep aquifers. Distances between oases are large, and routes between them are the basis of its economy and its politics.

Variants:

- `artesian`: Water rising under pressure from deep sandstone aquifers.
- `spring-line`: Oases strung along a fault where groundwater surfaces.
- `qanat`: Water drawn through long tunnels from distant highlands.

#### Arid world (`arid`)

A dry world with eroded relief: mesas, buttes, badlands and deep canyons cut by short, violent rains. Vegetation is sparse and seasonal. Flash floods are the principal hazard.

Variants:

- `mesa`: Flat-topped remnants of an old plateau standing above the plains.
- `badlands`: Gullied, soft sediment with almost no soil.
- `canyon`: Rivers cut kilometers deep into layered rock.
- `striped`: Banded rock formations of strongly contrasting color.

#### Mediterranean world (`mediterranean`)

A world with hot, dry summers and mild, wet winters. Vegetation is dominated by drought-tolerant shrubs and low woodland, and coastlines are rocky. Wildfire is a regular part of the cycle, and the climate suits orchards and terraced agriculture.

Variants:

- `scrubland`: Dense aromatic shrubland.
- `terraced-hills`: Steep coastal hills suited to terraced cultivation.
- `fire-climax`: Plant communities that depend on regular burning.

#### Savanna world (`savanna`)

A warm world of grassland with scattered trees, under a climate with a long dry season and a short wet one. Savanna worlds tend to support large grazing fauna and the predators that follow them.

Variants:

- `tree-savanna`: Open woodland with a grassy understory.
- `veld`: High, open grassland with few trees.
- `migration-plains`: Plains crossed annually by very large migratory herds.

#### Steppe world (`steppe`)

A cool, dry world dominated by grassland and low scrub, with large seasonal temperature ranges and persistent wind. Soils are deep and fertile where water allows cultivation. Distances are long and settlement is sparse.

Variants:

- `short-grass`: Low grass over very large areas.
- `loess`: Deep wind-blown soils, fertile and easily eroded.
- `salt-steppe`: Dry grassland with saline basins.

#### Supercontinent world (`supercontinent`)

A world whose land is assembled into a single landmass. Coastal margins are wet and green, but the interior lies thousands of kilometers from the sea and is dry, with extreme seasonal temperatures. Most life and settlement are confined to the coasts.

Variants:

- `green-rim`: Narrow fertile coasts around a desert core.
- `inland-sea`: A large saline sea in the continental interior.
- `rift`: The landmass is beginning to split along an active rift.

### Habitable: cold (`habitable-cold`)

Worlds whose habitable area is limited by low temperatures. Growing seasons are short and settlement favors coasts and lowlands.

Usual habitability: garden, habitable, marginal.

#### Tundra world (`tundra`)

A cold world on which permafrost underlies most land and vegetation is limited to mosses, lichens, sedges and dwarf shrubs. Summers are brief; the active soil layer thaws and becomes waterlogged. Construction requires care to avoid melting the ground beneath it.

Variants:

- `lichen-plain`: Dry, lichen-covered uplands.
- `polygon-ground`: Ice-wedge polygons patterning the ground for kilometers.
- `thermokarst`: Ground slumping and pocked with ponds as the permafrost thaws.

#### Boreal world (`boreal`)

A cool to cold world dominated by coniferous forest and bog, with long winters and a short, intense growing season. Rivers freeze for much of the year and serve as winter roads. Pennant, the seat of the Wayfarer Synod, is the Basin's principal boreal world.

Variants:

- `taiga`: Unbroken conifer forest across the mid-latitudes.
- `fjord-coast`: Glacier-cut coasts with forested valleys running inland.
- `muskeg`: Forest interrupted by wide peat bogs.
- `larch`: Deciduous conifers that turn gold before winter.

#### Alpine world (`alpine`)

A world with extensive high mountain ranges and plateaus, where most habitable land lies in valleys and on lower slopes. Air at altitude is thin and cold, and weather changes quickly. Mountain passes control communication between regions.

Variants:

- `high-plateau`: Extensive tablelands above the main cloud layer.
- `glacier-valley`: Steep valleys with glaciers at their heads.
- `volcanic-range`: Mountain ranges built by active volcanoes.

#### Fjord world (`fjord`)

A cold, wet world on which glaciers have cut long, deep inlets into mountainous coasts. Coastal valleys are forested and sheltered; interiors are often ice-covered. Settlement is coastal and travel is by sea.

Variants:

- `skerry-coast`: Coasts fringed by thousands of small rocky islands.
- `tidewater-glacier`: Glaciers that reach the sea and calve icebergs.

#### Arctic world (`arctic`)

A world on which ice sheets cover most of the land and sea ice much of the ocean, leaving habitable ground along coasts, in ice-free valleys and around geothermal areas. Marine life is often richer than life on land.

Variants:

- `ice-sheet`: Continental ice kilometers thick.
- `pack-ice`: Seas frozen over for most of the year.
- `ice-free-oases`: Dry valleys swept clear of ice by katabatic wind.
- `polynya`: Areas of open water kept clear by currents or upwelling heat.

### Habitable: special (`habitable-special`)

Habitable worlds classed by an unusual physical condition (size, geology or rotation) rather than by climate. Each type occurs with any climate.

Usual habitability: garden, habitable, marginal.

#### Superhabitable world (`superhabitable`)

A world more favorable to life than the homeworlds of its settlers: typically larger than Earth, warmer, with shallower seas, more land and a longer-lived biosphere. Surface gravity is higher than Union standard, which affects health and engineering over the long term.

Variants:

- `wet`: Shallow seas and archipelagos over much of the world.
- `dry`: Large, fertile continental interiors.
- `cold`: Cool climate offset by a deep atmosphere and long seasons.

#### Karst world (`karst`)

A world on which soluble rock, chiefly limestone, dominates the crust, producing cave systems, sinkholes, disappearing rivers and tower landscapes. Surface water is scarce despite adequate rainfall, because it drains underground. Karst worlds are rich in mineral deposits and their caves are often extensively settled.

Variants:

- `wet`: Tower karst and flooded caves under heavy rain.
- `dry`: Bare limestone pavement and deep sinkholes.
- `cold`: Ice caves and frozen subterranean rivers.

#### Tidally locked world (`tidally-locked`)

A world that keeps one face toward its star, with permanent day on one hemisphere and permanent night on the other. Habitable conditions occur in a terminator band between the two, or under a large sub-stellar ocean. Winds blow constantly from the night side toward the day side. Gloam, where the Purview's settlements occupy the twilight band, is the Basin's best-known example.

Variants:

- `twilight-band`: Habitable only in the band between day and night.
- `eyeball-ocean`: A single ice-free ocean on the day side, frozen elsewhere.
- `night-ice`: A frozen night hemisphere holding most of the world's water.
- `hot`: A scorched day side; life only near the terminator.
- `cold`: A frozen world habitable only beneath its star.

#### Geothermal world (`geothermal`)

A cold or distant world warmed from below. Life concentrates around volcanic regions, vents and hot springs, and the habitable area is a patchwork of warm oases in otherwise frozen terrain. Geothermal power is plentiful.

Variants:

- `vent-field`: Life around hydrothermal vents on land and seafloor.
- `hot-spring-basin`: Warm basins of springs, terraces and steam.
- `lava-tube`: Settlement within warm volcanic tunnels.

### Marginal (`marginal`)

Worlds on which people live, but against the environment: behind masks, inside sealed towns or for part of the year. Most marginal settlements in the Basin exist for mining.

Usual habitability: habitable, marginal, hostile.

#### Seasonal world (`seasonal`)

A world whose atmosphere becomes breathable for part of the year and unbreathable for the rest, through eccentric orbit, biological cycles or artificial regulation. Settlement alternates between open-air work and sealed shelter. Bellows, in the Shoals, has breathable air for five months of each year, supplied by Absent machinery.

Variants:

- `oxygen-season`: Oxygen rises seasonally to breathable levels.
- `thaw-season`: Surface ice and volatiles melt for a short summer.
- `bloom-season`: A biological bloom alters the atmosphere for part of the year.

#### Dense-atmosphere world (`dense-air`)

A world with an atmosphere several times Union standard pressure, usually under permanent cloud. The air may be breathable at reduced oxygen fractions but carries risks of nitrogen narcosis and oxygen toxicity. Light at the surface is diffuse and dim. Cairn, whose colonial organisms build moving stone structures, is a dense-atmosphere world.

Variants:

- `overcast`: Permanent cloud cover; the sun is never seen.
- `heavy-haze`: Visibility reduced to a few kilometers by haze.
- `high-pressure`: Pressures requiring careful gas mixtures for unprotected work.

#### Thin-atmosphere world (`thin-air`)

A world whose atmosphere is too thin for unassisted breathing, though warm enough at the surface for work with masks and pressure clothing. Weather is weak, dust is persistent, and radiation at the surface is higher than on denser worlds.

Variants:

- `high-desert`: Cold, dry and wind-polished.
- `thin-canyon`: Air thick enough to breathe only in deep canyons and basins.
- `dust-veil`: Fine dust suspended in the thin air for months.

#### Toxic-atmosphere world (`toxic-air`)

A world with a breathable pressure and oxygen content but with toxic components (sulfur compounds, chlorine, carbon monoxide or biological agents) that require filtration. Native life has adapted to the chemistry; settlers depend on filters and sealed buildings.

Variants:

- `sulfurous`: Sulfur compounds from volcanism.
- `chlorine`: Chlorine-cycle chemistry; pale green skies.
- `pollen-heavy`: Native pollens or spores that are toxic to humans.

#### Storm world (`storm`)

A world with extreme and persistent weather: wind belts, hurricanes and storm surges that make the surface dangerous at all seasons. Settlement is built low, below ground or behind walls. Orison is trending toward this condition as its climate machinery fails.

Variants:

- `hurricane-belt`: Permanent cyclones in fixed latitude bands.
- `superrotation`: The atmosphere circles the world faster than it rotates.
- `surge-coast`: Coasts flooded by surges that never fully recede.

#### Dust world (`dust`)

A dry world on which planet-wide dust storms occur regularly and can last for months. Dust is fine, electrostatically charged and abrasive. Solar power, optics and air filtration are all compromised during storm seasons.

Variants:

- `global-storm`: Storms that cover the entire world for a season.
- `dust-devil`: Constant local vortices across dry plains.
- `red-dust`: Iron-oxide dust that colors the sky.

#### Glassed world (`glassed`)

A world on which large areas of the surface have been fused to glass by an extreme heating event: impact, stellar flare or something less natural. Glassfields are flat, cracked into plates and ridges, and offer almost no cover. Scald, nearly half of whose surface is glass, is the type example; its companion stars' planets show the same glassing.

Variants:

- `glassfield`: Continuous fused plains cracked into plates.
- `tektite-plain`: Scattered glass beads and fragments over sand.
- `partial`: Glass in patches among unaltered desert and highland.

#### Salt world (`salt`)

A world on which evaporation has left extensive salt pans, evaporite basins and brine lakes. Halophilic life is common. Salt worlds are often former ocean worlds that have lost much of their water.

Variants:

- `salt-pan`: Flat, white evaporite plains.
- `brine-lake`: Dense, colored brines in closed basins.
- `evaporite-dome`: Salt domes and glaciers of flowing salt.

#### High-gravity world (`high-gravity`)

A large terrestrial world with surface gravity well above Union standard, typically one and a half to three times. Air is dense and low-lying, mountains are low and life is squat. Long residence has health costs, and launches to orbit are expensive.

Variants:

- `crushed-relief`: Low relief; mountains rarely exceed a few kilometers.
- `dense-sea`: A heavy atmosphere over shallow, wind-driven seas.

#### Flare-scoured world (`flare-scoured`)

A world orbiting an active flare star close enough that flares strip the upper atmosphere and sterilize exposed surfaces. Life, native or settled, survives underground, underwater or on a night side. Flare warnings govern all surface work.

Variants:

- `burrow-life`: Native life concentrated below the surface.
- `night-side`: Habitable only on the hemisphere facing away from the star.
- `aurora-world`: Constant aurorae from the stellar wind.

#### Water world (`water-world`)

A world with a global ocean hundreds of kilometers deep, no exposed land and a seafloor of high-pressure ice rather than rock. Without land or seabed minerals, life is sparse. Settlement is possible only on floating structures.

Variants:

- `abyssal`: No reachable seafloor.
- `steam-mantle`: Hot, high-pressure water at depth.

### Hostile rock (`rocky`)

Terrestrial bodies with no open-air habitability. They are the commonest solid worlds in the Basin and the main source of metals, carbon and, in places, lattice.

Usual habitability: hostile, lethal.

#### Barren world (`barren`)

An airless or nearly airless rocky world with a cratered surface, no liquid water and no life. Barren worlds are the commonest solid bodies in the Basin. They are used for mining, pickets and storage, and occasionally hold Absent constructions, as at Ashlar in the Deeps.

Variants:

- `cratered`: Ancient surface saturated with impact craters.
- `maria`: Dark basaltic plains filling old impact basins.
- `regolith`: Deep dust over bedrock; poor footing.
- `tower-field`: Surface structures of non-natural origin.

#### Super-Earth (`super-earth`)

A rocky world between about two and ten times the mass of Earth with no native life. Atmospheres range from thin to crushing depending on temperature and history. Ostrom IV, the cold super-Earth over which the Marrow orbits, has a thin nitrogen atmosphere and nothing on the surface worth landing for.

Variants:

- `cold`: Thin, cold atmosphere over frozen plains.
- `thick-air`: A deep, cloudy atmosphere over a hidden surface.
- `stagnant-lid`: A single unbroken crust with no plate tectonics.

#### Iron world (`iron`)

A dense world composed mostly of metallic core, having lost most of its rocky mantle to impact or stripping. Surface rock is dark and metal-rich. Iron worlds are valued for ore and are a common source of printer feed.

Variants:

- `exposed-core`: Metal visible at the surface in large areas.
- `rust`: Surface iron oxidized red by a thin atmosphere.

#### Carbon world (`carbon`)

A world formed in a carbon-rich environment, with a crust of graphite, carbides and hydrocarbon deposits instead of silicate rock. Surfaces are dark and tar pits and graphite plains are common. Carbon worlds are associated with carbon stars and with certain stripped systems.

Variants:

- `graphite-plain`: Dark, slippery plains of graphite.
- `tar-pit`: Hydrocarbon seeps and tar lakes.
- `carbide-range`: Mountains of silicon and titanium carbides.

#### Diamond world (`diamond`)

A carbon world whose interior pressure has converted much of its carbon to diamond. Such worlds may be the remnants of carbon-rich stellar companions stripped by a pulsar or a white dwarf. Extraction is straightforward but value in the Basin is industrial rather than ornamental.

Variants:

- `diamond-mantle`: Diamond at depth beneath a graphite crust.
- `stripped-companion`: Remnant of a star stripped to its carbon core.

#### Chthonian world (`chthonian`)

The remnant core of a gas giant that migrated close to its star and lost its atmosphere to heating. Chthonian worlds are dense, hot and rocky or metallic, sometimes with a residual atmosphere streaming away from the day side.

Variants:

- `stripped-core`: Bare core rock, recently exposed.
- `comet-tail`: A residual atmosphere escaping in a tail.

#### Lava world (`lava`)

A world close enough to its star, or heated enough by tides, to have a molten or partly molten surface. Lava oceans may cover the day side, with a solid crust on the night side. Rock vapor atmospheres and silicate rain occur on the hottest examples.

Variants:

- `magma-ocean`: Molten rock over most of the surface.
- `dayside-melt`: Molten on the day side only.
- `crusted`: A thin, renewing crust over molten interior.

#### Volcanic world (`volcanic`)

A world with intense, ongoing volcanism, usually driven by tidal heating from a giant parent or a close companion. Surfaces are young and resurfaced continually; sulfur and silicate plains, lava lakes and plumes are characteristic. Lumen's moon, home to Lumen Station, is a tidally heated volcanic world settled near its volcanic belts.

Variants:

- `sulfur-plains`: Yellow and red sulfur deposits over most of the surface.
- `lava-lakes`: Persistent lakes of molten rock.
- `plume`: Eruption plumes reaching hundreds of kilometers.
- `obsidian`: Black volcanic glass fields.

#### Hothouse world (`hothouse`)

A world in a runaway greenhouse state, with a dense carbon dioxide atmosphere, surface temperatures hot enough to melt lead and clouds of sulfuric acid. The surface is permanently hidden. Hothouse worlds may once have had oceans.

Variants:

- `acid-cloud`: Thick sulfuric acid cloud decks.
- `superrotating`: Upper winds circling the world in days.
- `lost-ocean`: Geological traces of a former ocean.

#### Pulsar world (`pulsar-world`)

A world orbiting a pulsar, either a survivor of the supernova or formed afterward from its debris. Surfaces are glassy and heavily irradiated, and the pulsar's beam sweeps the system at its rotation period. Cinder's airless planets, outside Ostrom, are of this type; the Stewardship's picket there is heavily shielded.

Variants:

- `survivor`: Predates the supernova; scorched and stripped.
- `second-generation`: Formed from supernova debris after the event.

#### Shattered world (`shattered`)

A body broken by impact or tidal stress into a loose aggregate of fragments held together by its own gravity. Shattered worlds have low density, irregular shapes and unstable surfaces. Halyard Station is anchored to a shattered ice moon, and Ferrous's belts may be the remains of shattered worlds.

Variants:

- `rubble-pile`: Loosely bound fragments with large voids.
- `split`: Two large fragments still in contact.
- `debris-halo`: Surrounded by a cloud of its own debris.

#### Crystalline world (`crystalline`)

A world whose surface carries a crust of lattice or similar crystal, apparently deposited from outside rather than grown from the crust beneath. The type is known only in the Basin. On the airless worlds closest to the white dwarfs of the Pale, the crusts are thin, easy to strip and slow to replace.

Variants:

- `lattice-crust`: Thin lattice deposits over dark rock.
- `crystal-field`: Crystalline growths standing above the surface.
- `glitter`: Fine crystal dust that reflects starlight.

#### Steam world (`steam`)

A hot water world whose surface is a supercritical mixture of water and steam under a dense atmosphere. There is no boundary between ocean and sky. Steam worlds are water worlds that have migrated too close to their star.

Variants:

- `supercritical`: No distinct ocean surface.
- `boiling-sea`: A boiling ocean under a dense steam atmosphere.

### Ice (`icy`)

Bodies dominated by water ice or other volatiles, usually beyond the snow line of their star. Several hold liquid oceans beneath their crust.

Usual habitability: marginal, hostile, lethal.

#### Ice world (`ice`)

A world whose surface is composed mainly of water ice, often mixed with rock and other ices. Ice worlds are common beyond the snow line of every Basin system. Surfaces range from heavily cratered to smooth and recently resurfaced.

Variants:

- `dirty-ice`: Ice darkened by rock and organic material.
- `bright-ice`: Clean, highly reflective ice.
- `chaos-terrain`: Ice broken into rafts and refrozen.

#### Subglacial ocean world (`subglacial-ocean`)

A world with a liquid water ocean beneath a shell of ice kilometers thick, kept liquid by tidal heating, radioactive decay or an outside source. Settlements are built on the ice or within it, and access to the ocean is by shaft. Halvard's Rest and the rogue worlds of the Hollows, which are warmed by Absent heat engines, are of this type.

Variants:

- `thin-shell`: Ice a few kilometers thick; the ocean is reachable.
- `thick-shell`: Ice tens of kilometers thick.
- `vent-ocean`: Hydrothermal vents on the ocean floor.
- `rogue-warmed`: Kept liquid by heat from outside the natural system.

#### Cryovolcanic world (`cryovolcanic`)

An icy world with active volcanism of water, ammonia or methane instead of molten rock. Cryovolcanoes and geysers resurface the world and may vent material to orbit. Plumes carry samples of subsurface oceans to the surface.

Variants:

- `geyser-field`: Fields of erupting jets near tidal stress zones.
- `ice-dome`: Large domes of extruded ice.
- `ammonia-flows`: Ammonia-water lavas.

#### Methane-sea world (`methane-sea`)

A cold world with a thick nitrogen atmosphere, an orange organic haze and lakes and seas of liquid methane and ethane. Rain, rivers and erosion occur, but in hydrocarbons. The chemistry is of long-standing scientific interest.

Variants:

- `polar-seas`: Hydrocarbon seas concentrated at the poles.
- `haze-world`: Haze so thick the surface is seldom seen from orbit.
- `dune-belt`: Equatorial dunes of organic sand.

#### Hydrocarbon world (`hydrocarbon`)

A cold world on which heavier hydrocarbons predominate: tar seas, waxy dunes and bitumen plains. Hydrocarbon worlds are a potential source of chemical feedstock, though extraction in the cold is difficult.

Variants:

- `tar-sea`: Viscous hydrocarbon seas.
- `wax-dunes`: Dunes of solid paraffin-like compounds.

#### Snowball world (`snowball`)

A world that once had a temperate climate and has frozen over entirely, often after a change in its star, orbit or atmosphere. Traces of former oceans, rivers and life may lie under the ice.

Variants:

- `frozen-ocean`: An ocean frozen to great depth.
- `buried-life`: Remains of a former biosphere under the ice.
- `slushball`: A narrow band of open water at the equator.

#### Hydrogen-ocean world (`hycean`)

A world with a deep water ocean under a thick hydrogen atmosphere. The hydrogen blanket can keep the ocean liquid far from the star. Hydrogen-ocean worlds are candidates for exotic marine life but are not breathable.

Variants:

- `cold-hycean`: Liquid ocean far beyond the normal habitable zone.
- `dark-hycean`: Ocean warmed by internal heat on a starless world.

### Giants (`giant`)

Worlds without a solid surface, classed by mass and by the chemistry of their visible cloud deck, which follows temperature. Giants dominate the outer parts of most Basin systems.

Usual habitability: none.

#### Hot giant (`hot-giant`)

A gas giant orbiting close to its star, with an atmosphere heated to well above a thousand degrees. Hot giants are often inflated and may be losing atmosphere. Their day sides lack cloud and their night sides glow.

Variants:

- `inflated`: Radius larger than its mass would suggest.
- `evaporating`: Atmosphere escaping in a visible tail.

#### Silicate-cloud giant (`silicate-giant`)

A very hot giant whose cloud deck consists of silicate and iron vapor condensates. Such giants are dark by day and faintly red by night. They are among the least reflective objects of their size.

Variants:

- `iron-rain`: Iron droplets falling through the deep atmosphere.
- `dark-day`: Very low reflectivity on the day side.

#### Cloudless giant (`cloudless-giant`)

A giant too warm for ammonia cloud and too cool for water cloud, with a clear upper atmosphere that scatters blue light. Cloudless giants appear deep azure. Their upper atmospheres are used as references for long-range survey.

Variants:

- `azure`: A deep, uniform blue.
- `alkali-haze`: Traces of sodium and potassium haze.

#### Warm giant (`warm-giant`)

A giant at moderate distance from its star with bright clouds of water vapor. Warm giants are highly reflective and appear white. They often lie close to the habitable zone of their star and may have temperate moons.

Variants:

- `water-cloud`: Bright white water-vapor cloud decks.
- `habitable-moons`: Orbits within the star's habitable zone.

#### Cold giant (`cold-giant`)

A gas giant in the outer system, with banded clouds of ammonia and ammonium compounds and large, long-lived storms. This is the commonest giant class in the Basin. Halvard, which carries a stationary storm larger than Tallis, is a cold giant.

Variants:

- `banded`: Distinct zones and belts in tan and cream.
- `storm-giant`: Dominated by one or more storms larger than worlds.
- `pale`: Muted bands and weak storms.

#### Low-density giant (`puffy-giant`)

A giant with an unusually low density, its atmosphere extended far beyond what its mass would normally hold. Low-density giants are typically losing atmosphere and may be young.

Variants:

- `super-puff`: Density comparable to foam.
- `young`: Still contracting after formation.

#### Helium giant (`helium-giant`)

A giant depleted in hydrogen, its atmosphere dominated by helium. Helium giants lack the methane absorption that colors most giants and appear grey or white. They are believed to form when hydrogen is lost to stellar heating over a long period.

Variants:

- `grey`: Featureless grey-white cloud decks.
- `residual`: A depleted former hot giant.

#### Ice giant (`ice-giant`)

A giant composed mostly of water, ammonia and methane ices above a rocky core, with a hydrogen and helium envelope. Methane absorption gives ice giants a blue to blue-green color. They are common in the outer reaches of Basin systems.

Variants:

- `blue`: Deep blue methane color.
- `cyan`: Paler, hazier blue-green.
- `tilted`: Rotation axis lying close to the orbital plane.

#### Mini-Neptune (`mini-neptune`)

A small gas world, between about two and four Earth radii, with a deep atmosphere over a rocky or icy core and no accessible surface. Mini-Neptunes are among the commonest planets in the galaxy and in the Basin.

Variants:

- `hazy`: High-altitude photochemical haze.
- `water-rich`: A deep water-rich layer beneath the envelope.

### Small bodies (`small`)

Bodies below the size at which they are usually counted as planets. Most are catalogued only by number.

Usual habitability: hostile, lethal.

#### Dwarf planet (`dwarf-planet`)

A body massive enough to be rounded by its own gravity but too small to clear its orbit. Dwarf planets are common in the outer belts of Basin systems and sometimes hold thin, seasonal atmospheres.

Variants:

- `icy-dwarf`: Ice and rock, often with nitrogen frost.
- `rocky-dwarf`: Rock and metal in an inner belt.

#### Comet (`comet`)

A small body of ice, dust and rock. When close to its star a comet develops a coma and tails as volatiles sublimate. Captured comets in stable orbits are a common source of water in systems without ice moons, notably in Halyard.

Variants:

- `active`: Venting jets and developing a tail.
- `dormant`: Volatiles exhausted near the surface; a dark crust.
- `captured`: Held in a stable orbit around a planet.

#### Moonlet (`moonlet`)

A small, irregular moon or rock, usually a captured asteroid or a fragment of a larger body. Moonlets lack the gravity to be rounded. The port at Sable is built from hulls moored around the largest of its dark moonlets.

Variants:

- `captured-asteroid`: An irregular captured body.
- `shepherd`: A small moon maintaining the edge of a ring.
- `dark`: Very low reflectivity; carbon-rich surface.

### World features

#### Orbit and rotation

| Feature | Definition |
|---|---|
| `tidally-locked-to-parent` | Keeps one face to the planet it orbits; common among close moons. |
| `eccentric-orbit` | An elongated orbit that produces strong seasonal change in received light. |
| `retrograde-orbit` | Orbits against the rotation of its parent; often a captured body. |
| `resonant-orbit` | Period in a simple ratio with a neighbor's. The Orrery's nine worlds are in exact mutual resonance. |
| `binary-planet` | Two bodies of comparable size orbiting a common center outside either. |
| `trojan` | Shares an orbit with a larger body, sixty degrees ahead of or behind it. |
| `captured-body` | Originated elsewhere and was captured into its present orbit. |
| `high-obliquity` | Axial tilt so large that the poles take turns facing the star. |
| `slow-rotation` | A day lasting weeks or longer. |
| `fast-rotation` | A day of a few hours; flattened at the poles. |

#### Rings and near space

| Feature | Definition |
|---|---|
| `rings` | A ring system of ice, rock or dust. |
| `radiation` | Exposure to intense radiation from a star, belt or remnant; surface work needs shielding. |
| `strong-magnetosphere` | A magnetic field strong enough to trap radiation belts around the world. |
| `aurorae` | Frequent, bright aurorae. |
| `atmospheric-escape` | Atmosphere being lost to space, sometimes visibly as a tail. |
| `debris-field` | Orbital debris from impacts, broken moons or wrecks. |

#### Atmosphere and weather

| Feature | Definition |
|---|---|
| `great-storm` | A storm larger than many worlds, stable for years. Halvard's has not moved in twelve years of observation. |
| `permanent-overcast` | Cloud that never breaks. |
| `superrotation` | Upper winds circling the world faster than it turns. |
| `dust-storms` | Recurring regional or global dust storms. |
| `acid-rain` | Acidic precipitation that attacks metal and stone. |
| `extreme-lightning` | Lightning at many times the rate of temperate worlds. |
| `haze` | A persistent photochemical or volcanic haze. |
| `katabatic-winds` | Cold winds pouring off high ice. |

#### Surface and interior

| Feature | Definition |
|---|---|
| `tidal-heating` | Internal heat from tidal flexing by a parent or companion. |
| `active-volcanism` | Ongoing eruptions. |
| `cryovolcanoes` | Volcanoes of water, ammonia or methane. |
| `geysers` | Erupting jets of water or volatiles. |
| `subsurface-ocean` | Liquid water beneath the surface. |
| `extreme-tides` | Tides of many meters from a large moon or close parent. |
| `impact-basin` | A dominant impact scar hundreds of kilometers across. |
| `mega-canyon` | A canyon system on a continental scale. |
| `quakes` | Frequent strong seismic activity. |
| `caves` | Extensive natural cave systems. |
| `low-gravity` | Surface gravity well below Union standard. |
| `glassed-areas` | Fused glass surfaces from an extreme heating event. |

#### Life

| Feature | Definition |
|---|---|
| `native-life` | An indigenous biosphere of any complexity. |
| `microbial-only` | Native life limited to microorganisms. |
| `megafauna` | Native animals large enough to threaten a frame. Verdance's predators are the standard example. |
| `dangerous-biosphere` | Native pathogens, toxins or predators that limit settlement. |
| `builder-organisms` | Native organisms that construct large structures. Cairn's colonial organisms build stone works that move. |
| `possible-sapience` | Native life under review for sapience under the Charter's native-life protections. |

#### Absent works

| Feature | Definition |
|---|---|
| `climate-engine` | Absent machinery below the surface regulating air and climate; found on the Basin's garden worlds. |
| `failing-climate-engine` | Climate machinery that has partly stopped or runs erratically, as on Orison. |
| `heat-engine` | Absent machinery warming a world from outside the natural energy budget, as in the Hollows. |
| `absent-ruins` | Absent structures on or near the world: towers, platforms, shipyards or stranger things. |
| `absent-signal` | A repeating Absent transmission received from the world or its vicinity. |
| `custodians` | Active Absent machines that defend deep workings, usually below about four hundred meters. |

#### Lattice

| Feature | Definition |
|---|---|
| `lattice-seams` | Lattice in seams through rock, worked by seam crews. |
| `lattice-crust` | Lattice deposited as surface crusts. |
| `lattice-dust` | Lattice grains suspended in air, ice or rings. |
| `lattice-rings` | A ring system composed largely of lattice, as at Choir in the Shoals. |

#### Settlement and history

| Feature | Definition |
|---|---|
| `abandoned-settlement` | Remains of a failed or evacuated settlement. |
| `quarantine` | Closed by Survey Office or other quarantine. |
| `battlefield` | Site of recent or ongoing fighting. |
| `wreck-field` | Wrecked ships or structures on the surface or in orbit. |

<!-- catalog:end -->
