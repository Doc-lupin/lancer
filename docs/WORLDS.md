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

## Composing a description

The catalog text is written to be assembled into a description of a single world. An entry is composed in the following order: the type description, the variant description, the climate description, the description of each world feature, and the habitability description. Additional text specific to the world, such as its history, settlements and notes from the map data, follows.

The type description describes the class as a whole and names its Basin example where one exists. Every other description refers to a single world as "the world" and is complete in itself, so that any number of features can follow one another in one entry without repetition. New entries added to the catalog follow the same rules: each is written in complete sentences, refers to no other feature or variant, and states only what holds for any world to which it is applied.

The resulting entry for Tallis, for example, reads in part: "Most of the world's rainfall is gathered into a small number of long drainage basins that run from the continental interiors to the sea. ... Absent machinery buried kilometers beneath the world's surface regulates its air and climate. The structures were discovered by survey and are spaced in a pattern that has not been explained."

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
| `garden` | The world supports unprotected human life in the open air and on open ground. A native or Absent-maintained biosphere provides breathable air, potable water and soils that can be farmed, and settlements require no sealed construction. Garden worlds are the most valuable property in the Basin and the most contested. |
| `habitable` | The world supports unprotected human life in the open air, but only under hardship or within limits. Settlement may be confined to a narrow band, a season or a region; the climate may be harsh or deteriorating; or the native biosphere may be dangerous. Settlements are open but built with the world's limits in mind. |
| `marginal` | People live on the world, but against its environment. Settlement depends on masks, filtered air, sealed towns or seasonal occupation, and populations are usually small and supplied in part from elsewhere. Most marginal settlements in the Basin exist to work a resource. |
| `hostile` | The world does not support unprotected human life at any season. All settlement is in sealed, pressurized habitats, and surface work requires full environmental protection. Hostile worlds are settled for their resources or their position. |
| `lethal` | Conditions on the world exceed the tolerance of standard environmental equipment through heat, pressure, radiation or chemical attack. Installations, where practical at all, are hardened, shielded and usually unstaffed or occupied only briefly. |
| `none` | The world has no solid surface on which to settle. Gas giants, ice giants and mini-Neptunes fall in this category; any human presence is limited to orbital stations, floating platforms in the upper atmosphere or installations on the world's moons. |

### Climate

| Value | Definition |
|---|---|
| `scorching` | Surface temperatures on the world are high enough to melt lead and, in places, rock. Liquid water cannot exist, and exposed equipment fails within hours without active cooling. |
| `hot` | The world's surface is persistently hotter than unprotected humans can tolerate at low latitudes and during the day. Habitable conditions, where they exist, are found at high latitudes, at altitude or at night. |
| `warm` | The world is warmer than temperate on average, with tropical conditions at low latitudes and mild winters elsewhere. Ice is rare outside the highest mountains. |
| `temperate` | Mean temperatures on the world fall within the range of most settled Union worlds, with seasons that are noticeable but not extreme. |
| `cool` | The world is cooler than temperate on average, with long winters, short growing seasons and permanent ice at high latitudes and altitudes. |
| `cold` | Frost is persistent on the world outside a limited band of latitude or a short summer season, and much of its water is frozen. |
| `frozen` | The world's surface lies permanently below the freezing point of water. Any liquid present is below the surface or consists of substances with lower freezing points. |

### Habitable: wet (`habitable-wet`)

Habitable worlds with abundant surface water and an established open-air biosphere. Wet worlds account for most of the Basin's garden worlds and most of its population, and their climates are shaped above all by the distribution of land and sea.

Usual habitability: garden, habitable, marginal.

#### Continental world (`continental`)

A continental world is a terrestrial planet whose surface is divided between two or more large landmasses and the oceans that connect them. A moderate axial tilt produces distinct seasons, and a complete water cycle carries rainfall far inland, so that the land supports the full range of biomes from coastal forest to interior grassland and mountain tundra. Continental worlds are the preferred target for agricultural settlement because they offer large areas of arable soil, navigable rivers and stable coastlines within a single climate system. In the Basin the type example is Tallis, whose air and rainfall are regulated by Absent machinery buried several kilometers beneath the crust; most of the Basin's continental worlds show some sign of similar regulation.

Variants:

- `river-valley`: Most of the world's rainfall is gathered into a small number of long drainage basins that run from the continental interiors to the sea. The valleys hold the deepest soils and the mildest climate on the planet, and settlement, agriculture and transport follow the rivers almost exclusively, leaving the uplands between them thinly populated.
- `highland-interior`: The interiors of the world's continents rise into high, dry plateaus that lie in the rain shadow of coastal mountains. Rainfall on the uplands is unreliable and fails in many years, so the interior supports grazing and dry farming at best while the coasts and lowland valleys carry most of the population. The Reach, on Tallis, is an example of such an interior.
- `maritime`: The world's continents are narrow and deeply indented, so that no point on land lies far from the sea. Ocean currents moderate the climate throughout the year, producing mild winters, cool summers and frequent rain, and seasonal extremes are smaller than on worlds with broad continental interiors.
- `grassland`: Broad interior plains dominated by grasses and grass-like plants cover much of the world's land. The plains support large populations of grazing fauna and have deep, fertile soils, but they are exposed to wind, drought and fire, and trees grow only along rivers and in sheltered uplands.
- `moss`: The world's land cover consists largely of mosses, liverworts and other low, non-woody growth, with few true trees. The ground layer is slow to grow and easily damaged by vehicles or cultivation, and cleared ground can remain bare for decades before it recovers.
- `twin-continent`: The world's land is divided between two continents of similar size that face one another across a single ocean basin. The two landmasses often differ markedly in climate and native life, having been separated for a long period of geological time.

#### Forest world (`forest`)

A forest world is a habitable planet on which closed-canopy forest covers most of the land below the tree line. The forests are maintained by reliable rainfall and deep soils, and open ground is limited to coasts, high ground, wetlands and areas cleared by fire. Rivers are long and slow, and much of the world's carbon and fresh water is held in its vegetation. Settlement on forest worlds advances slowly, because land must be cleared before it can be farmed; early economies typically rest on timber, trapping and small cleared holdings along rivers and coasts.

Variants:

- `temperate-broadleaf`: The world's forests are dominated by broad-leaved trees that shed their foliage in a cold or dry season. The canopy changes color before the leaves fall, and the forest floor receives full light for part of each year, which supports a dense understory and a rich ground flora.
- `rainforest-cold`: Cool, wet conifer forest grows along the world's coasts, where mountain ranges force moist ocean air to rise and release its water. The trees are tall and long-lived, mosses and lichens cover every surface, and the forest floor is deep in fallen timber that decays only slowly.
- `petrified`: Large stands of mineralized trees from an earlier biosphere survive across the world, standing among or beneath the present forest. The petrified wood is hard, heavy and often colorful, and the fossil forests preserve a detailed record of conditions on the world before its present climate developed.
- `canopy-dwellers`: Most of the world's animal life lives in the upper layers of the forest and rarely descends to the ground. The forest floor is quiet and comparatively empty, while the canopy holds dense and noisy communities whose activity follows the light.
- `bamboo-analog`: Fast-growing, grass-like plants with woody stems form dense stands across large areas of the world. Cleared land is recolonized within a single season, which makes agriculture laborious but provides abundant, rapidly renewed building material.

#### Lake world (`lake`)

A lake world is a habitable planet whose land surface has been scoured by past glaciation or shaped by volcanism and subsidence into a dense network of lakes, channels and wetlands. On some lake worlds standing fresh water covers a third or more of the land. The terrain between the lakes is usually low and rocky, with thin soils, and travel is often easier by boat than overland. Freshwater fisheries provide much of the food supply, and settlements are commonly sited on narrows, isthmuses and lake outlets.

Variants:

- `glacial-scour`: Thousands of small and medium lakes fill basins carved into hard bedrock by former ice sheets. Ridges of glacial debris divide the lakes from one another, and soils between them are thin and stony.
- `great-lakes`: A small number of very large freshwater lakes occupy the world's continental interiors. The largest are inland seas in their own right, with weather systems, storms and measurable tides, and they dominate the climate and transport of the regions around them.
- `crater-lakes`: Many of the world's lakes fill impact craters or volcanic calderas and are correspondingly round, deep and steep-sided. Their waters are often cold and clear at depth, and some are chemically distinct from one another.
- `oxbow-country`: Meandering lowland rivers wander across broad floodplains, cutting off loops of channel that become crescent-shaped lakes. The landscape changes from decade to decade as rivers migrate, and the land between the lakes is fertile but prone to flooding.

#### Marsh world (`marsh`)

A marsh world is a habitable planet of low relief and poor drainage, on which fens, bogs, peatlands and slow, braided rivers cover much of the land. Decomposition in waterlogged soils releases methane and sulfur compounds that collect in low ground and give the air a characteristic odor. Firm, dry ground is scarce and valuable. Settlements are built on raised ground, on pilings or on floating platforms, and travel follows waterways and causeways. Marsh worlds store large quantities of carbon in their peat and are productive of both native life and disease.

Variants:

- `peatland`: Deep deposits of peat, built up over thousands of years, cover large areas of the world. The peat is a usable fuel but burns persistently once ignited, and fires in dry years can smolder underground for years.
- `mangrove-coast`: Salt-tolerant forest grows on the tidal flats along most of the world's coastlines, its roots trapping sediment and extending the land seaward. The coastal forests shelter the interior from storm surge and support dense communities of marine and amphibious life.
- `reed-sea`: Vast beds of reeds and similar tall emergent plants cover shallow water across the world's lowlands. Open channels through the reed beds are maintained by currents and by the movement of large fauna, and they shift from season to season.
- `mire`: Acidic, oxygen-poor bogs cover much of the world's lowland. The bog water preserves organic material for very long periods, so that the remains of earlier life, and of any earlier visitors, may be found intact at depth.

#### Ocean world (`ocean`)

An ocean world is a habitable planet on which liquid water covers more than nine-tenths of the surface, leaving land only as islands, shoals and the tips of submarine ranges. The ocean acts as a very large heat reservoir, and ocean worlds tend toward mild and stable climates with small seasonal ranges. Marine life is usually abundant and land life limited. Settlement depends on island holdings, floating towns and sea farming, and on the supply of metals and other materials that islands alone cannot provide. Stillwater, in the Lantern Reach, is an ocean world without tides and with almost no wind, on which city-sized Absent platforms float at regular intervals.

Variants:

- `shoal-sea`: Wide continental shelves lie only tens of meters below the surface across much of the world, forming shallow, sunlit seas. The shallows are productive and easily farmed, and in places they are exposed at low water as sandbanks and flats.
- `deep-ocean`: The world's ocean is deep almost everywhere, with little shallow water outside a few island margins. Life is concentrated in the sunlit surface layer and around the few seamounts and vents, and the abyssal floor lies beyond practical reach.
- `kelp-forest`: Dense stands of large floating or anchored vegetation cover extensive areas of open sea. The marine forests support complex communities beneath and among them and are a ready source of food, fiber and chemical feedstock.
- `doldrum`: The world has little wind, and its ocean surface lies flat and still for weeks at a time. The calm limits mixing between surface and deep water, so that layers of different temperature and chemistry persist for long periods, and sailing craft are of little use.
- `storm-sea`: Strong prevailing winds blow across the world's ocean without interruption by land, raising a permanent long-period swell and frequent gales. Surface operations are difficult in all seasons, and floating settlements must be built to ride very large waves.
- `algal`: Algal blooms color large parts of the world's ocean green, red or brown according to season and region. The blooms are the base of a productive food web, but some release toxins or deplete the water of oxygen as they decay.

#### Archipelago world (`archipelago`)

An archipelago world is an ocean world whose land occurs as long chains of volcanic or reef-built islands rising from the seafloor. The island arcs follow tectonic boundaries or the tracks of volcanic hotspots, and they divide the ocean into a patchwork of sheltered seas, lagoons and open water. Large moons often raise strong tides that alternately expose and submerge the lower islands. Settlement favors sheltered lagoons and harbors, and island communities are linked by sea traffic rather than by any continental network. Wending is the Basin's type example: its archipelagos flood and drain twice a day under the pull of two large moons, and its towns ride the tides on long cables.

Variants:

- `volcanic-arc`: The world's islands stand above subduction zones and form long, curving chains of active and dormant volcanoes. Eruptions, earthquakes and tsunamis are regular events, but the volcanic soils are exceptionally fertile.
- `hotspot-chain`: The world's islands were built in sequence by volcanic hotspots in the mantle, so that each chain ages steadily away from an active volcano at one end. The oldest islands have been worn down to reefs and shoals, while the youngest are still growing.
- `tidal-flats`: Much of the world's land is low enough to be exposed at low tide and submerged at high tide. The tidal flats are broad, muddy and highly productive, and the boundary between land and sea moves by kilometers in the course of a day.
- `atoll`: Ring-shaped reefs encircle the sites of sunken volcanoes across the world, enclosing calm lagoons that are protected from the open ocean. The atolls rise only a few meters above sea level and are vulnerable to storm surge.

#### Reef world (`reef`)

A reef world is a habitable planet with warm, shallow seas in which reef-building organisms have constructed much of the existing land over geological time. Its islands and shelves are biological in origin and continue to grow at their margins wherever conditions allow. Reef ecosystems are dense, diverse and productive, but they are sensitive to changes in temperature, sedimentation and water chemistry, and they recover slowly from dredging, quarrying and runoff. Settlement is coastal and depends heavily on the reefs for food and building stone.

Variants:

- `barrier-reef`: Long reef walls run parallel to the world's coasts, enclosing broad, calm lagoons between reef and shore. The barriers break the force of ocean swell and storms and make the lagoons the natural site for harbors and settlement.
- `living-isles`: The world's islands are still actively growing at their margins, where reef organisms continue to build new rock. Coastlines advance measurably over decades, and the youngest land consists of living reef only recently raised above the water.
- `bleached`: The world's reefs are dying back in response to a recent change in temperature or chemistry, leaving large areas of pale, dead structure. Reef-dependent life is in decline, and the islands are beginning to erode faster than they grow.

#### Tropical world (`tropical`)

A tropical world is a warm, humid planet with little seasonal variation, on which rainforest or similar dense vegetation extends from the coasts to high elevations across most latitudes. Biomass and species diversity are high, as are the rates of disease, decay and corrosion. Soils are often thin and quickly exhausted once cleared, because most nutrients are held in living vegetation rather than in the ground. Settlers on tropical worlds contend with heat, humidity and native pathogens, and cleared land returns to forest within a few years if not maintained.

Variants:

- `rainforest`: Multi-layered evergreen forest covers most of the world's land, with emergent trees rising above a continuous canopy and a dim, humid understory below. Rain falls on most days of the year.
- `cloud-forest`: Mountain forests on the world lie in near-permanent mist, drawing much of their moisture directly from cloud. The trees are festooned with mosses and epiphytes, and visibility on the high slopes is often limited to a few meters.
- `tepui`: Isolated table mountains rise sheer from the surrounding forest across the world, their summits cut off from the lowlands by cliffs hundreds of meters high. Each summit supports its own distinct community of life that has developed in isolation.
- `cenote`: The world's lowlands are underlain by porous limestone, so that rain drains rapidly underground and there are few surface rivers. Water is reached through collapsed sinkholes that open into flooded caves, and these sinkholes are the natural centers of settlement.
- `thunderstorm`: Daily convective storms build over the world's land in the afternoons, producing heavy rain and lightning at a frequency far above that of temperate worlds. Electrical activity is a hazard to unshielded equipment and to aircraft.

#### Monsoon world (`monsoon`)

A monsoon world is a habitable planet with a strongly seasonal climate in which a wet season of heavy rain and widespread flooding alternates with a long dry season. The seasonal reversal of winds between land and sea drives the cycle, and its timing and strength govern agriculture, transport and settlement. Rivers swell and shift their courses each wet season, rebuilding floodplains and deltas, while dry-season water must be stored or drawn from wells. A failed or delayed wet season can bring famine to regions that depend on it.

Variants:

- `floodplain`: Broad lowlands across the world are inundated during each wet season and drain slowly in the dry. The annual flood renews the soil and supports intensive agriculture, but permanent structures must be built on raised ground.
- `delta`: The world's large rivers end in broad deltas that are rebuilt and reshaped each wet season, with channels abandoned and new ones cut as the flood dictates. The deltas are fertile, densely vegetated and difficult to map with any permanence.
- `dry-forest`: Much of the world's forest sheds its leaves during the long dry season and stands bare until the rains return. The forest is open and fire-prone in the dry months and dense and humid in the wet.

#### Megaflora world (`megaflora`)

A megaflora world is a habitable planet on which plant life reaches extreme size: trees hundreds of meters tall, root systems extending for kilometers and an understory that receives little or no direct light. The condition usually reflects some combination of high atmospheric carbon dioxide, long or continuous growing seasons, low gravity and exceptional warmth. Fauna on megaflora worlds tends to be correspondingly large, and the forest structure presents serious obstacles to clearance, construction and overland travel. Verdance, in the Lantern Reach, whose Absent climate machinery runs hot, is a megaflora world on which two attempts at settlement have been abandoned.

Variants:

- `giant-canopy`: A closed canopy at great height covers the world's forests, and the ground beneath lies in permanent shade. Life on the forest floor depends on material falling from above, while most primary production takes place in the upper canopy.
- `root-bridge`: The root systems of the largest plants on the world extend across rivers, ravines and lesser trees, forming natural bridges and living structures that persist for centuries. The roots stabilize steep ground but make excavation slow and difficult.
- `aerial-flora`: Many of the world's plants live entirely above the ground, either as epiphytes on the giant trees or as buoyant, gas-filled organisms drifting in the lower atmosphere. The air above the canopy is populated with floating life.

#### Fungal world (`fungal`)

A fungal world is a habitable planet whose biosphere is dominated by fungi, molds and analogous decomposer organisms rather than by photosynthetic plants. Such worlds are usually dim, overcast or rich in organic debris, and their landscapes are shaped by mycelial networks, fruiting bodies of every size and thick mats of decaying matter. Spore releases are a regular feature of the environment and can reduce visibility for hours; some spores are irritant or toxic to human lungs, and filtration is advisable for long-term residents. Fungal worlds are productive of chemicals and pharmaceuticals but difficult to farm with imported crops.

Variants:

- `mycelial-mat`: A continuous underground mycelial network links the vegetation of whole regions of the world, exchanging nutrients and chemical signals across great distances. Disturbance in one place can produce measurable responses elsewhere in the network.
- `spore-fog`: Seasonal or daily spore releases fill the world's low ground with dense fog that reduces visibility to a few meters. The fogs are heaviest at dawn and settle as a fine powder on every exposed surface.
- `giant-fungus`: Fruiting bodies on the world reach the size of trees and form open, forest-like stands. They grow rapidly, collapse quickly and are replaced in cycles that follow the seasons.

#### Bioluminescent world (`bioluminescent`)

A bioluminescent world is a habitable planet on which a large proportion of organisms produce their own light. The trait is most common on dim worlds and on worlds with long nights, where light is used for signaling, hunting, defense and symbiosis. Night landscapes may be brighter than overcast days, and the glow varies with season, tide and the activity of the organisms producing it. The condition is of considerable scientific interest and has made several such worlds popular with settlers despite the practical difficulties of farming under altered light.

Variants:

- `glowing-sea`: Luminous plankton fill whole ocean basins on the world, lighting breaking waves and the wakes of vessels. The glow is strongest in warm seasons and in areas of upwelling.
- `lantern-forest`: The world's forest canopy glows through the night with light produced by plants, fungi and the animals that live among them. Patterns of light move through the canopy in waves.
- `cave-glow`: Bioluminescence on the world is largely confined to cave systems and the deep sea, where light-producing organisms form self-contained communities independent of the sun.

### Habitable: dry (`habitable-dry`)

Habitable worlds on which liquid water is scarce at the surface but life is nonetheless established. Life and settlement concentrate wherever water can be found or reached, and control of water is the basis of most local economies.

Usual habitability: garden, habitable, marginal.

#### Desert world (`desert`)

A desert world is a habitable planet on which liquid surface water is scarce outside the polar regions and deep aquifers, and on which sand seas, gravel plains and bare rock cover most of the land. Low humidity produces large daily temperature ranges, with hot days and cold nights. Life is sparse but well adapted and often concentrated where water collects or lies close to the surface. Settlement depends on wells, ice mining at the poles, condensation or imported water, and desert worlds are frequently valued for minerals exposed by the lack of soil and vegetation.

Variants:

- `erg`: Seas of moving sand dunes cover large areas of the world, advancing slowly downwind and burying anything left in their path. Some dunes reach several hundred meters in height.
- `reg`: Flat plains of gravel and wind-polished stone extend across much of the world, firm underfoot and easily crossed by vehicles. Vegetation is almost absent, and the horizon is broken only by isolated outcrops.
- `ironsand`: The world's sand is dark and rich in iron minerals, absorbing sunlight and growing very hot by day. The sand is weakly magnetic and interferes with simple navigational instruments.
- `coastal-fog`: Cold ocean currents along the world's coasts produce persistent fog that drifts inland each morning. The fog is the main source of moisture for coastal life, and the narrow fog belt supports most of the world's vegetation.
- `polar-caps`: Most of the world's water is locked in ice caps at the poles, leaving the lower latitudes dry. The caps grow and shrink with the seasons, and settlement is concentrated at their margins where water can be mined.

#### Oasis world (`oasis`)

An oasis world is a desert planet on which life and settlement are concentrated around isolated sources of water: springs, artesian basins and the outflows of deep aquifers. Each oasis supports a self-contained community of native life and, typically, a settlement, while the land between is dry and thinly inhabited. Distances between oases are often large, and the routes connecting them form the basis of the world's economy and political geography. Control of water is the primary source of authority on such worlds.

Variants:

- `artesian`: Water rises under natural pressure from deep sandstone aquifers to the surface across the world, feeding springs and pools far from any rain. The aquifers were filled in a wetter past and are not being replenished.
- `spring-line`: The world's oases lie in lines along geological faults where groundwater is forced to the surface. Settlements form chains along these lines, separated by open desert.
- `qanat`: Water on the world is drawn from distant highlands through long, gently sloping tunnels dug by native life or by settlers. The tunnels are vital infrastructure and are maintained and guarded accordingly.

#### Arid world (`arid`)

An arid world is a dry habitable planet with strongly eroded relief, on which mesas, buttes, badlands and deep canyons have been carved by infrequent but violent rains. Vegetation is sparse and seasonal, and soils are thin or absent over large areas. Flash floods are the principal natural hazard, filling dry channels within minutes of distant rainfall. The exposed rock of arid worlds makes geological survey straightforward, and many are valued for their mineral resources.

Variants:

- `mesa`: Flat-topped remnants of an older plateau stand above the world's plains, bounded by cliffs and capped by resistant rock. The mesa tops are often cooler and wetter than the plains below and support distinct communities of life.
- `badlands`: Soft, gullied sediments cover large areas of the world, eroded into intricate ridges and channels with almost no soil or vegetation. The badlands are difficult to cross and change shape with every storm.
- `canyon`: Rivers on the world have cut canyons kilometers deep into layered rock, exposing a long geological record in their walls. The canyon floors are sheltered and comparatively well watered, and settlement concentrates there.
- `striped`: The world's rock formations are banded in strongly contrasting colors, the result of alternating layers of different mineral composition. The banding is visible from orbit and makes the world's geology unusually easy to read.

#### Mediterranean world (`mediterranean`)

A Mediterranean world is a habitable planet with hot, dry summers and mild, wet winters, on which vegetation is dominated by drought-tolerant shrubs, low woodland and aromatic scrub. Coastlines are typically rocky and indented, and inland the terrain rises quickly into hills and mountains. Fire is a regular part of the ecological cycle, and many native plants depend on it. The climate suits orchards, vines, olives and terraced agriculture, and such worlds have historically supported dense coastal settlement.

Variants:

- `scrubland`: Dense, aromatic shrubland covers much of the world's land, tough and fire-adapted. The scrub is difficult to cross on foot and burns readily in the dry season.
- `terraced-hills`: Steep coastal hills dominate the world's settled regions, their slopes suited to terraced cultivation. Soil is held in place only where terraces are maintained, and abandoned terraces erode quickly.
- `fire-climax`: The world's plant communities depend on regular burning to regenerate, and in the absence of fire they become overgrown and unstable. Native life has adapted to a cycle of fire every few years.

#### Savanna world (`savanna`)

A savanna world is a warm habitable planet dominated by grassland with scattered trees, under a climate with a long dry season and a short, intense wet season. The grasslands support large populations of grazing fauna and the predators that follow them, and periodic fire maintains the open landscape by preventing forest from establishing. Savanna worlds are well suited to pastoral settlement, though water supply during the dry season is the limiting factor for both native life and settlers.

Variants:

- `tree-savanna`: The world's grasslands are dotted with trees, forming an open woodland with a grassy understory. The trees provide shade and browse but are widely spaced enough for easy travel.
- `veld`: High, open grassland with very few trees covers much of the world, swept by wind and lit by long views. The veld lies at moderate altitude and is cooler than lowland savanna.
- `migration-plains`: Very large herds of native grazers cross the world's plains each year in pursuit of seasonal rains, following routes that have been in use for thousands of years. The migrations shape the vegetation and dominate the ecology of the regions they cross.

#### Steppe world (`steppe`)

A steppe world is a cool, dry habitable planet on which grassland and low scrub cover the greater part of the land. Seasonal temperature ranges are large, with hot summers and severe winters, and the wind blows almost constantly across open country. Soils are deep and fertile where water permits cultivation, but much of the land is suitable only for grazing. Distances on steppe worlds are long and settlement is sparse, often organized around water sources and transport routes.

Variants:

- `short-grass`: Low, hard grasses cover very large areas of the world, forming a uniform landscape broken by occasional rivers and low hills. The grass is drought-resistant and supports grazing across great distances.
- `loess`: Deep deposits of fine, wind-blown soil cover parts of the world, often tens of meters thick. The loess is highly fertile but erodes readily when cleared, forming steep gullies.
- `salt-steppe`: Dry grassland on the world gives way to saline basins where water collects and evaporates, leaving crusts of salt. Salt-tolerant plants fringe the basins, and fresh water is scarce.

#### Supercontinent world (`supercontinent`)

A supercontinent world is a habitable planet whose land is assembled into a single landmass surrounded by a world ocean. The coastal margins are wet and green, but the interior lies thousands of kilometers from the sea and is dry, with extreme seasonal temperatures. Most life and nearly all settlement are confined to the coasts and to the few rivers that cross the interior. Over geological time such landmasses tend to break apart, and many supercontinent worlds show the early signs of rifting.

Variants:

- `green-rim`: A narrow belt of fertile, well-watered land runs around the coasts of the world's single continent, enclosing a vast desert core. Settlement is distributed along the rim and connected by coastal traffic.
- `inland-sea`: A large saline sea occupies a basin in the interior of the world's continent, fed by rivers that never reach the ocean. The sea moderates the climate of its shores and supports an isolated ecosystem.
- `rift`: The world's continent is beginning to split along an active rift, marked by a line of volcanoes, earthquakes and long, deep valleys that may eventually flood to form a new ocean.

### Habitable: cold (`habitable-cold`)

Habitable worlds whose usable area is limited chiefly by low temperatures. Growing seasons are short, settlement favors coasts and lowlands, and native life is adapted to long periods of cold and darkness.

Usual habitability: garden, habitable, marginal.

#### Tundra world (`tundra`)

A tundra world is a cold habitable planet on which permanently frozen ground underlies most of the land and vegetation is limited to mosses, lichens, sedges and dwarf shrubs. Summers are brief and cool; during them the upper layer of soil thaws and becomes waterlogged, while the ground beneath remains frozen. Native life is adapted to long periods of dormancy, and animal populations often migrate or hibernate. Construction on tundra worlds must avoid warming the ground beneath it, since thawed permafrost loses its strength and structures founded on it subside.

Variants:

- `lichen-plain`: Dry, lichen-covered uplands stretch across much of the world, firm underfoot and slow to recover from damage. The lichens are the main food of the world's larger grazing fauna.
- `polygon-ground`: The world's ground is patterned for kilometers by networks of ice wedges that crack the soil into regular polygons. The pattern is visible from the air and indicates ice-rich permafrost close to the surface.
- `thermokarst`: The world's permafrost is thawing, causing the ground to slump into pits and ponds and releasing stored carbon. The landscape is unstable and changing year by year.

#### Boreal world (`boreal`)

A boreal world is a cool to cold habitable planet dominated by coniferous forest and bog, with long winters and a short, intense growing season. Snow covers the ground for much of the year, and rivers freeze solid and serve as winter roads. The forests are extensive but slow-growing, and their soils are acidic and poor; agriculture is possible in sheltered valleys and along coasts. Pennant, the seat of the Wayfarer Synod, is the Basin's principal boreal world, its northern continent cut by fjords and broad river valleys.

Variants:

- `taiga`: Unbroken coniferous forest covers the world's mid-latitudes for thousands of kilometers, interrupted only by rivers, lakes and bogs. The forest is uniform in composition and burns in large fires at long intervals.
- `fjord-coast`: Glacier-cut inlets penetrate the world's coasts deep into the interior, with steep, forested walls and sheltered water. Settlement is concentrated at the heads of the fjords and in the broad valleys that run inland from them.
- `muskeg`: Wide expanses of peat bog interrupt the world's forest, waterlogged in summer and frozen in winter. The bogs are impassable in the warm season and are crossed only when frozen.
- `larch`: Deciduous conifers dominate the world's forests, turning gold before winter and dropping their needles. The bare winter forest admits more light to the ground than evergreen forest does.

#### Alpine world (`alpine`)

An alpine world is a habitable planet with extensive high mountain ranges and plateaus, on which most habitable land lies in valleys and on lower slopes. Air at altitude is thin and cold, and the weather changes quickly as air masses are forced over the ranges. Glaciers, avalanches and rockfall are constant hazards. Mountain passes control communication between regions, and populations in separate valleys often develop independently of one another.

Variants:

- `high-plateau`: Extensive tablelands lie above the world's main cloud layer at high altitude, cold, dry and exposed to intense sunlight. The plateaus support hardy grassland and grazing but little else.
- `glacier-valley`: Steep-sided valleys with glaciers at their heads cut through the world's mountains, their floors carpeted with meltwater streams and glacial debris. The valleys are the main routes through the ranges.
- `volcanic-range`: The world's mountain ranges are built by active volcanoes, with peaks still growing and periodically erupting. Volcanic soils on the lower slopes are fertile and widely farmed.

#### Fjord world (`fjord`)

A fjord world is a cold, wet habitable planet on which glaciers have cut long, deep inlets into mountainous coasts. The coastal valleys are sheltered, forested and comparatively mild, while the interiors are often covered by ice fields. Settlement is almost entirely coastal, and travel between communities is by sea. The fjords are deep enough to admit large vessels far inland, and their sheltered waters are productive of marine life.

Variants:

- `skerry-coast`: Thousands of small, rocky islands fringe the world's coasts, sheltering a maze of channels from the open ocean. Navigation among the skerries is intricate and local knowledge is essential.
- `tidewater-glacier`: Glaciers descend from the world's interior ice fields to the sea and calve icebergs into the fjords. The calving fronts are dangerous to approach, and drifting ice is a hazard to shipping.

#### Arctic world (`arctic`)

An arctic world is a cold habitable planet on which ice sheets cover most of the land and sea ice covers much of the ocean for most of the year. Habitable ground is restricted to coasts, ice-free valleys and areas warmed by geothermal activity. Marine life is often far richer than life on land, and the world's food chains begin in the sea. Settlements on arctic worlds are small, coastal and dependent on the ocean, and the short summer is the only season for most construction and travel.

Variants:

- `ice-sheet`: Continental ice sheets several kilometers thick cover most of the world's land, flowing slowly toward the coasts. Bedrock lies far beneath the ice and is reached only by deep boreholes.
- `pack-ice`: The world's seas are frozen over for most of the year, and open water appears only briefly in summer. The pack ice moves under wind and current and crushes vessels caught in it.
- `ice-free-oases`: Dry valleys swept clear of ice by strong winds descending from the ice sheets lie scattered across the world. They are cold and arid but provide the only exposed ground in large regions.
- `polynya`: Areas of open water persist within the world's sea ice throughout the year, kept clear by currents, wind or upwelling heat. They are centers of marine life and the natural sites of coastal settlement.

### Habitable: special (`habitable-special`)

Habitable worlds classed by an unusual physical condition, whether size, geology or rotation, rather than by climate. Each special type occurs with any climate, and its variants record which.

Usual habitability: garden, habitable, marginal.

#### Superhabitable world (`superhabitable`)

A superhabitable world is a planet more favorable to life than the homeworlds of the people who settle it. Such worlds are typically somewhat larger than Earth, a little warmer, with shallower seas, more land and a longer-lived and more diverse biosphere. Surface gravity is higher than Union standard, usually by a quarter to a half, which has long-term consequences for health, construction and the cost of reaching orbit. The worlds are rare and highly prized; disputes over their ownership are among the most bitter in any settled region.

Variants:

- `wet`: Shallow seas and extensive archipelagos cover much of the world, providing an exceptionally long and productive coastline. Marine and coastal life is abundant.
- `dry`: Large, fertile continental interiors dominate the world, well watered by a deep atmosphere and reliable rainfall. Grassland and open forest cover vast areas suitable for agriculture.
- `cold`: The world's cool climate is offset by a deep atmosphere and long seasons, producing broad belts of productive forest and grassland at latitudes that would be frozen on lesser worlds.

#### Karst world (`karst`)

A karst world is a habitable planet on which soluble rock, chiefly limestone and its analogs, dominates the crust. Water dissolves the rock along its joints and bedding planes, producing extensive cave systems, sinkholes, disappearing rivers and landscapes of isolated rock towers. Surface water is scarce even where rainfall is adequate, because it drains rapidly underground; the largest rivers on such worlds may flow entirely within caves. Karst worlds are rich in mineral deposits, and their caves are often extensively settled for shelter and water.

Variants:

- `wet`: Heavy rainfall on the world has carved the limestone into dense forests of rock towers separated by steep valleys and flooded caves. Rivers emerge from cliffs and vanish into sinkholes.
- `dry`: Bare limestone pavement and deep sinkholes cover the world's dry interior, with water available only at depth. The surface is harsh and exposed, and the caves below are the only refuge.
- `cold`: Ice caves and frozen subterranean rivers riddle the world's limestone. Meltwater flows underground in summer and freezes in winter, and some cave systems hold permanent ice.

#### Tidally locked world (`tidally-locked`)

A tidally locked world is a planet whose rotation has been slowed by its star's gravity until one face is turned permanently toward the star. One hemisphere lies in permanent day and the other in permanent night, and the climate is organized around the difference between them rather than around latitude and season. Habitable conditions occur in the terminator band between the two hemispheres, or beneath the star where an ocean can moderate the heat. Winds blow constantly from the cold night side toward the warm day side, and the night side may hold much of the world's water as ice. Gloam, where the settlements of the Gloam Purview occupy the twilight band and lattice is mined from the frozen night side, is the Basin's best-known example.

Variants:

- `twilight-band`: Habitable conditions on the world are confined to the band of permanent twilight between day and night, a strip a few hundred kilometers wide. Settlements lie along the band, with the day side too hot and the night side too cold for unprotected life.
- `eyeball-ocean`: A single ice-free ocean lies beneath the world's star on the day side, surrounded by ice that covers the rest of the planet. Seen from space, the world resembles an eye with the ocean as its pupil.
- `night-ice`: Most of the world's water has been carried to the night hemisphere by the prevailing winds and frozen there, building ice sheets of great thickness. The day side is correspondingly dry.
- `hot`: The world's day side is scorched and largely sterile, and life is limited to a narrow region close to the terminator. Winds of great strength carry heat toward the night side.
- `cold`: The world is cold overall, and only the region directly beneath its star is warm enough for liquid water and open-air life. The habitable area forms a single disc on the day side.

#### Geothermal world (`geothermal`)

A geothermal world is a cold or distant planet that is made habitable in places by heat from its own interior. Life concentrates around volcanic regions, hydrothermal vents and hot springs, and the habitable area forms a scattered patchwork of warm oases in otherwise frozen terrain. Geothermal energy is plentiful and easily tapped, and settlements are built directly over or within the warm ground. The distribution of habitable land changes slowly as volcanic activity migrates.

Variants:

- `vent-field`: Life on the world clusters around hydrothermal vents on land and on the seafloor, drawing energy from chemical reactions in the vent fluids rather than from sunlight.
- `hot-spring-basin`: Warm basins of springs, mineral terraces and steam vents form the world's habitable regions, separated by expanses of cold, barren ground. The basins are humid, misty and densely vegetated.
- `lava-tube`: Long tunnels left by ancient lava flows run beneath the world's surface, warm, sheltered and protected from radiation. Settlement within the tubes is common.

### Marginal (`marginal`)

Worlds on which people live, but against the environment: behind masks, inside sealed towns or for part of the year. Most marginal settlements in the Basin exist to work a resource, chiefly lattice, and most marginal populations depend on supply from elsewhere.

Usual habitability: habitable, marginal, hostile.

#### Seasonal world (`seasonal`)

A seasonal world is a planet whose atmosphere becomes breathable for part of the year and unbreathable for the rest. The cycle may be driven by an eccentric orbit, by the seasonal activity of native life or by artificial regulation, and it divides the year into an open season of outdoor work and agriculture and a closed season spent in sealed shelter. Settlements on seasonal worlds are built to be sealed quickly, and the timing of the change governs the whole of local life. Bellows, in the Shoals, is a seasonal world on which Absent machinery floods the atmosphere with oxygen for five months of each year and leaves it unbreathable for the other seven.

Variants:

- `oxygen-season`: Oxygen in the world's atmosphere rises to breathable levels for part of each year and falls away for the rest. The change is gradual, and the opening and closing weeks of the season are marked by headaches, fatigue and accidents among those who misjudge it.
- `thaw-season`: Surface ice and frozen volatiles on the world melt during a short summer, raising atmospheric pressure and releasing water for a brief growing season. For the remainder of the year the surface is frozen and the air too thin to breathe.
- `bloom-season`: A seasonal bloom of native life alters the composition of the world's atmosphere for part of each year, either producing oxygen or consuming toxic gases. The bloom is sensitive to disturbance, and its failure can close the open season early.

#### Dense-atmosphere world (`dense-air`)

A dense-atmosphere world is a planet with an atmosphere several times Union standard pressure, usually beneath permanent or near-permanent cloud. The air may be breathable at reduced oxygen fractions, but its density carries risks of nitrogen narcosis and oxygen toxicity, and residents rely on adjusted gas mixtures or careful acclimatization. Light at the surface is dim and diffuse, sound carries strongly, and winds, though slow, exert great force. Heat is distributed evenly across the world, so that temperature varies little between day and night or between latitudes. Cairn, whose colonial organisms build stone structures that move, is a dense-atmosphere world under an overcast that almost never breaks.

Variants:

- `overcast`: Permanent cloud covers the world, and its star is never seen from the surface. Daylight is a uniform grey, and the cloud deck reflects much of the incoming light back into space, keeping the surface cool.
- `heavy-haze`: A persistent haze limits visibility on the world to a few kilometers, scattering light into a featureless glow. Orbital imaging of the surface is possible only at certain wavelengths.
- `high-pressure`: Surface pressure on the world is high enough that unprotected work requires specially mixed breathing gases and decompression procedures on leaving the surface. Equipment designed for standard pressure fails quickly.

#### Thin-atmosphere world (`thin-air`)

A thin-atmosphere world is a planet whose atmosphere is too tenuous for unassisted breathing, though warm enough at the surface for outdoor work with masks and pressure clothing. Weather is weak but persistent winds raise fine dust, and the thin air offers little protection against radiation from the star. Liquid water is unstable at the surface and boils or freezes quickly. Settlement is sealed or semi-sealed, and agriculture is conducted under cover.

Variants:

- `high-desert`: The world is cold, dry and swept by thin winds that polish exposed rock. Frost forms each night and sublimates each morning without melting.
- `thin-canyon`: The world's air is thick enough to breathe with only light assistance in the deepest canyons and basins, where pressure is highest. Settlement is confined to these low places.
- `dust-veil`: Fine dust remains suspended in the world's thin air for months at a time, reddening the sky and reducing the light reaching the surface.

#### Toxic-atmosphere world (`toxic-air`)

A toxic-atmosphere world is a planet whose air has a breathable pressure and oxygen content but carries toxic components that make filtration necessary. The contaminants may be sulfur compounds from volcanism, chlorine from an unusual chemical cycle, carbon monoxide, or biological agents produced by native life. Native organisms are adapted to the chemistry and often depend on it. Settlers live in sealed buildings, wear filters outdoors and must protect crops and livestock from the air.

Variants:

- `sulfurous`: Sulfur dioxide and hydrogen sulfide from widespread volcanism contaminate the world's atmosphere, giving it a sharp odor and corroding metal. Concentrations are highest near active vents.
- `chlorine`: Chlorine compounds take part in the world's atmospheric chemistry, tinting the sky a pale green. Native life uses chlorine in its metabolism, and human tissue is damaged by prolonged exposure.
- `pollen-heavy`: Pollens and spores produced by the world's native vegetation are toxic or strongly allergenic to humans. Concentrations rise sharply in the flowering season.

#### Storm world (`storm`)

A storm world is a planet with extreme and persistent weather, on which wind belts, cyclones and storm surges make the surface dangerous in every season. The condition may arise from a fast rotation, a strong temperature contrast between regions, an unusually energetic atmosphere or the failure of a regulating mechanism. Structures are built low, underground or behind heavy walls, and surface travel is planned around the weather. Orison, whose Absent climate machinery is failing, is trending toward this condition: its storms grow stronger every year and its coastal surges never fully recede.

Variants:

- `hurricane-belt`: Permanent cyclonic storms occupy fixed latitude bands on the world, separated by calmer zones where settlement is possible. Crossing a storm belt is a major undertaking.
- `superrotation`: The world's upper atmosphere circles the planet much faster than the surface rotates, driving constant high winds at all altitudes. Wind at the surface rarely falls below gale force.
- `surge-coast`: Storm surges on the world push the sea far inland along low coasts, and each surge leaves the coastline altered. Coastal settlement is in retreat.

#### Dust world (`dust`)

A dust world is a dry planet on which dust storms occur regularly and can cover the entire globe for months at a time. The dust is fine, electrostatically charged and abrasive; it penetrates seals, wears moving parts and degrades optics and solar collectors. During storm seasons surface temperatures change as the dust absorbs sunlight, and visibility may fall to a few meters. Settlement on dust worlds is sealed, and maintenance is a constant burden.

Variants:

- `global-storm`: Storms on the world grow each year until they cover the entire planet for a season, cutting off sunlight to the surface and halting most outdoor activity.
- `dust-devil`: Constant local vortices cross the world's dry plains, lifting dust in tall columns and leaving tracks across the ground. Individually small, they are numerous enough to keep the air hazy at all times.
- `red-dust`: The world's dust is rich in iron oxides, coloring the sky salmon by day and blue at sunset. The dust stains every exposed surface.

#### Glassed world (`glassed`)

A glassed world is a planet on which large areas of the surface have been fused into glass by an extreme heating event: an impact, a stellar flare, or a cause less natural. The glassfields are flat and nearly featureless, cracked into plates and low ridges, and offer almost no cover; heat and light reflected from the glass add to the burden of working on them. The remaining land is usually desert or broken upland. Glassing preserves whatever lay beneath it, and the fused layer can seal mineral deposits from erosion. Scald, nearly half of whose surface was glassed thousands of years before the expedition arrived, is the type example; the rocky planets of its two companion stars show the same glassing in places.

Variants:

- `glassfield`: Continuous plains of fused glass run for thousands of kilometers across the world, cracked into plates and low ridges by cooling and later movement. The glass rings underfoot and reflects heat into the faces of those crossing it.
- `tektite-plain`: Scattered beads and fragments of glass, formed as molten droplets that fell back to the surface, lie in sheets across the world's sand and gravel plains.
- `partial`: Glass covers the world in discontinuous patches among otherwise unaltered desert and highland, as if the heating event struck unevenly.

#### Salt world (`salt`)

A salt world is a planet on which the evaporation of former seas has left extensive salt pans, evaporite basins and brine lakes. Most salt worlds are former ocean worlds that have lost much of their water to space or to the interior. Salt-tolerant life is common in the brines and along their margins, and the evaporite deposits are a source of industrial chemicals. Fresh water is scarce and must usually be produced by distillation.

Variants:

- `salt-pan`: Flat, white evaporite plains cover large areas of the world, bright enough to dazzle under the sun. The pans flood briefly after rain and dry to a hard crust.
- `brine-lake`: Dense brines collect in closed basins across the world, colored red, green or purple by the microorganisms that live in them.
- `evaporite-dome`: Salt has risen through the world's crust in domes and flows that move slowly across the surface as glaciers of salt, distorting the rock around them.

#### High-gravity world (`high-gravity`)

A high-gravity world is a large terrestrial planet with surface gravity well above Union standard, typically one and a half to three times. The atmosphere is dense and lies close to the ground, mountains are low, and native life is squat, strong and close to the surface. Prolonged residence imposes heavy costs on the human body, including joint and circulatory problems, and long-term settlers are often rotated off-world. Launches to orbit are expensive, and the world's resources are used locally or moved only when their value justifies the cost.

Variants:

- `crushed-relief`: The world's high gravity limits the height of its mountains, which rarely exceed a few kilometers, and its landscape is one of low ranges and broad plains.
- `dense-sea`: A heavy, dense atmosphere lies over shallow seas on the world, driving powerful waves even in moderate winds. Coastal erosion is rapid.

#### Flare-scoured world (`flare-scoured`)

A flare-scoured world is a planet orbiting an active flare star closely enough that stellar flares periodically strip its upper atmosphere and sterilize exposed surfaces. Native life, where it exists, survives underground, underwater or on the side of the world facing away from the star during flares. Settlements are buried or heavily shielded, and all surface work is governed by flare forecasts and warnings. Between flares the world may be calm and even temperate.

Variants:

- `burrow-life`: The world's native life is concentrated beneath the surface, emerging to feed between flares and retreating when the star brightens.
- `night-side`: The world is habitable only on its night side or in the hours of darkness, when its own bulk shields the surface from flares. Daylight work is restricted.
- `aurora-world`: Constant aurorae fill the world's skies as the stellar wind strikes its atmosphere, bright enough to read by at night.

#### Water world (`water-world`)

A water world is a planet with a global ocean hundreds of kilometers deep, no exposed land and a seafloor of high-pressure ice rather than rock. Without land or contact between ocean and rock, the water is poor in dissolved minerals, and life, where it exists, is sparse. The surface is a single unbroken sea, and weather systems circle the world without obstruction. Settlement is possible only on floating structures supplied from elsewhere, and water worlds are chiefly of value as sources of water and hydrogen.

Variants:

- `abyssal`: The world's ocean has no reachable floor; soundings descend for hundreds of kilometers before meeting high-pressure ice. Life is limited to the upper few hundred meters.
- `steam-mantle`: Hot, high-pressure water lies at depth beneath the world's ocean surface, heated from the interior. Upwellings of warm water reach the surface in places.

### Hostile rock (`rocky`)

Terrestrial bodies that do not support open-air life. They are the commonest solid worlds in the Basin and the main source of metals, carbon and, in places, lattice, and they host most of its pickets, mines and shielded installations.

Usual habitability: hostile, lethal.

#### Barren world (`barren`)

A barren world is an airless or nearly airless rocky planet or moon with a cratered surface, no liquid water and no life. Barren worlds are the commonest solid bodies in the Basin and in most star systems. Their surfaces record billions of years of impacts, and without weather to erode them, features persist almost indefinitely. They are used for mining, pickets, storage and shielded installations, and their low escape velocities make them convenient bases. On a few barren worlds in the Basin the Absent built above ground, most notably at Ashlar in the Deeps.

Variants:

- `cratered`: The world's surface is saturated with impact craters of every size, overlapping one another so densely that new impacts erase old ones. The terrain is rugged and unchanged for billions of years.
- `maria`: Dark plains of basaltic lava fill old impact basins on the world, smoother and younger than the surrounding cratered highlands. The maria record a period of volcanism long since ended.
- `regolith`: A deep layer of fine dust and broken rock covers the world's bedrock, the product of countless small impacts. The regolith offers poor footing and fouls machinery.
- `tower-field`: Structures of non-natural origin stand on the world's surface, rising above the regolith in numbers and at heights that no geological process explains.

#### Super-Earth (`super-earth`)

A super-Earth is a rocky planet with a mass between about two and ten times that of Earth and no native life. Its greater gravity holds an atmosphere more readily than smaller worlds, and atmospheres range from thin to crushing depending on temperature and history. Interiors are hot and geologically active, though some super-Earths have a single rigid crust without plate tectonics. Super-Earths are common in the Basin and frequently serve as anchors for orbital stations. Ostrom IV, over which the Marrow orbits, is a cold super-Earth with a thin nitrogen atmosphere and nothing on the surface worth landing for.

Variants:

- `cold`: The world lies far enough from its star that its surface is frozen and its thin atmosphere of nitrogen and inert gases carries no weather of note. The plains are smooth and featureless.
- `thick-air`: A deep, cloudy atmosphere hides the world's surface entirely, with high pressure and heat at ground level. The surface has been mapped only by radar.
- `stagnant-lid`: The world has a single unbroken crust with no plate tectonics, and heat escapes through large, scattered volcanoes rather than along plate boundaries.

#### Iron world (`iron`)

An iron world is a dense planet composed mostly of metallic core, having lost the greater part of its rocky mantle to giant impacts or to stripping by its star. The surface is dark, metal-rich and often heavily cratered, and the world's density is well above that of ordinary rocky planets. Iron worlds are valued for their accessible metal and are a principal source of ore for printer feed in systems where they occur.

Variants:

- `exposed-core`: Metallic iron and nickel are exposed at the world's surface across large areas, where the overlying rock has been stripped away. The metal can be worked directly.
- `rust`: A thin atmosphere containing traces of oxygen has oxidized the iron at the world's surface, coloring it red-brown and coating it in a friable crust of rust.

#### Carbon world (`carbon`)

A carbon world is a planet formed in a carbon-rich environment, whose crust consists of graphite, carbides and hydrocarbon deposits rather than silicate rock. Its surface is dark and its geology unfamiliar: tar pits, graphite plains and mountains of silicon and titanium carbides. Carbon worlds are associated with carbon stars, with the debris of stripped stellar companions and with systems that formed in carbon-rich regions of a nebula. They are of interest as sources of industrial carbon and hydrocarbon feedstock.

Variants:

- `graphite-plain`: Dark, slippery plains of graphite cover much of the world, absorbing nearly all the light that falls on them. The surface is soft and wears easily.
- `tar-pit`: Hydrocarbon seeps and lakes of tar dot the world's surface, fed from deposits at depth. The tar traps anything that crosses it unwarily.
- `carbide-range`: Mountain ranges of silicon and titanium carbides rise on the world, harder than most tooling and extremely resistant to erosion.

#### Diamond world (`diamond`)

A diamond world is a carbon world whose interior pressure has converted a large part of its carbon to diamond. Such worlds may be the remnants of carbon-rich stellar companions stripped down by a pulsar or white dwarf, or carbon planets of unusual mass. Diamond is common and easily extracted, so its value in the Basin is industrial rather than ornamental, chiefly for cutting tools and heat sinks.

Variants:

- `diamond-mantle`: Diamond forms a thick layer at depth beneath the world's graphite crust, reached by drilling or exposed in the walls of deep craters.
- `stripped-companion`: The world is the remnant of a star stripped to its carbon core by a compact companion, dense and almost pure carbon throughout.

#### Chthonian world (`chthonian`)

A chthonian world is the remnant core of a gas giant that migrated close to its star and lost its atmosphere to stellar heating. What remains is dense, hot and rocky or metallic, larger and heavier than most terrestrial planets of similar appearance. Some chthonian worlds retain a residual atmosphere that streams away from the day side. They are of scientific interest as exposed giant-planet cores and of practical interest for their metals.

Variants:

- `stripped-core`: The world's surface is bare core rock, exposed comparatively recently and still hot from the loss of its envelope.
- `comet-tail`: A residual atmosphere escapes from the world in a tail that streams away from the star, visible from neighboring planets.

#### Lava world (`lava`)

A lava world is a planet whose surface is molten or partly molten, either because it orbits very close to its star or because tidal heating keeps its interior near melting. Lava oceans may cover the day side while a solid crust forms on the night side. The hottest examples have atmospheres of vaporized rock and rains of silicate droplets. Lava worlds glow visibly on their night sides and are lethal to approach without heavy shielding.

Variants:

- `magma-ocean`: Molten rock covers most of the world's surface in an ocean of lava, with currents and waves of its own. Solid crust forms only as floating rafts.
- `dayside-melt`: The world's day side is molten while its night side is solid rock, and the boundary between the two moves as heat is redistributed. Lava flows from day into night and freezes.
- `crusted`: A thin, constantly renewed crust covers the world's molten interior, breaking and re-forming over upwelling lava.

#### Volcanic world (`volcanic`)

A volcanic world is a planet or moon with intense and continuous volcanism, usually driven by tidal heating from a giant parent or a close companion. Its surface is young, being resurfaced continually by eruptions; sulfur and silicate plains, lava lakes and eruption plumes are characteristic. Volcanic worlds release large quantities of material to their surroundings, which may supply a parent planet's rings or radiation belts. Lumen's moon, home to Smith-Shimano's Lumen Station, is a tidally heated volcanic world on which pressurized settlement is possible near the volcanic belts.

Variants:

- `sulfur-plains`: Deposits of sulfur in yellow, orange and red cover most of the world's surface, laid down by eruptions and changing color with temperature.
- `lava-lakes`: Persistent lakes of molten rock occupy calderas across the world, their surfaces crusting and breaking in a steady cycle.
- `plume`: Eruption plumes on the world rise hundreds of kilometers above the surface and fall back as wide rings of debris.
- `obsidian`: Fields of black volcanic glass cover the world's lava plains, sharp-edged and highly reflective.

#### Hothouse world (`hothouse`)

A hothouse world is a planet in a runaway greenhouse state. A dense atmosphere of carbon dioxide traps heat until surface temperatures are high enough to melt lead, and clouds of sulfuric acid hide the surface permanently. Surface pressure is many times Union standard. Many hothouse worlds are believed to have had oceans before the greenhouse took hold, and traces of their former state may survive in the geology. Exploration of the surface is possible only by heavily protected probes.

Variants:

- `acid-cloud`: Thick decks of sulfuric acid cloud enclose the world, reflecting most of its star's light and raining acid that evaporates before reaching the ground.
- `superrotating`: Winds in the world's upper atmosphere circle the planet in a few days, far faster than the surface rotates, while the dense lower atmosphere is nearly still.
- `lost-ocean`: Landforms on the world's surface record a former ocean: dry basins, eroded coastlines and mineral deposits formed in water.

#### Pulsar world (`pulsar-world`)

A pulsar world is a planet orbiting a pulsar, either a survivor of the supernova that formed the pulsar or a body that accreted afterward from its debris. The surface is glassy and heavily irradiated, and the pulsar's beam sweeps across the system at the star's rotation period, bathing the planets in particle radiation. No atmosphere survives for long. Installations on pulsar worlds require heavy shielding and are rarely permanent. Cinder's airless planets, in the Ostrom region, are of this type; the Stewardship picket there is shielded accordingly.

Variants:

- `survivor`: The world predates the supernova and survived it, scorched and stripped of its atmosphere and outer layers.
- `second-generation`: The world formed after the supernova from the debris disk left around the pulsar, and its composition reflects the material of the destroyed star.

#### Shattered world (`shattered`)

A shattered world is a body broken by impact or tidal stress into a loose aggregate of fragments held together only by its own gravity. Shattered worlds have low density, irregular shapes and unstable surfaces, and large voids may lie between the fragments of their interiors. They are easy to mine and difficult to build upon. Halyard Station is anchored to a shattered ice moon in the trailing arm, and the dense belts of Ferrous are thought to include the remains of shattered worlds.

Variants:

- `rubble-pile`: The world is a loosely bound pile of fragments of every size with large voids between them, and its surface shifts under small disturbances.
- `split`: Two large fragments of the world remain in contact, joined along a narrow neck and slowly separating.
- `debris-halo`: A cloud of debris from the world's breakup surrounds it, hazardous to approaching craft and slowly falling back.

#### Crystalline world (`crystalline`)

A crystalline world is a planet whose surface carries a crust of lattice or a similar crystalline material that appears to have been deposited from outside rather than grown from the rock beneath. The type is known only in the Basin and its origin is not understood. Crusts are typically thin and easily stripped, and they replace themselves slowly once removed. On the airless worlds closest to the white dwarfs of the Pale, the crusts lie thickest on the hemispheres facing the dwarfs.

Variants:

- `lattice-crust`: Thin deposits of lattice coat the world's dark rock, thickest on the hemisphere facing the nearest compact star.
- `crystal-field`: Crystalline growths stand above the world's surface in fields, some reaching several meters in height.
- `glitter`: Fine crystal dust covers the world's surface and reflects starlight, so that the world appears to sparkle when viewed from orbit.

#### Steam world (`steam`)

A steam world is a hot water world whose surface is a supercritical mixture of water and steam beneath a dense atmosphere. There is no clear boundary between ocean and sky; pressure and temperature increase steadily with depth. Steam worlds are thought to be water worlds that have migrated too close to their stars. They are lethal to approach and useful chiefly as subjects of study.

Variants:

- `supercritical`: The world has no distinct ocean surface, and its envelope passes gradually from steam to supercritical fluid with depth.
- `boiling-sea`: A boiling ocean lies beneath a dense steam atmosphere on the world, with violent convection and constant cloud.

### Ice (`icy`)

Bodies whose surfaces are dominated by water ice or other frozen volatiles, usually beyond the snow line of their star or far from any star at all. Several hold liquid oceans beneath their crust, and together they supply most of the Basin's water and reaction mass.

Usual habitability: marginal, hostile, lethal.

#### Ice world (`ice`)

An ice world is a planet or moon whose surface is composed mainly of water ice, often mixed with rock dust and other frozen volatiles. Ice worlds are common beyond the snow line of every star system in the Basin and include many of the moons of its giants. Their surfaces range from ancient and heavily cratered to smooth and recently resurfaced, depending on whether the interior is still warm. Ice worlds supply water, oxygen and reaction mass to nearby installations and are the principal resource of systems such as Halyard.

Variants:

- `dirty-ice`: The world's ice is darkened by rock dust and organic compounds, so that its surface is grey or brown rather than white. Dark ice absorbs more sunlight and is warmer than clean ice.
- `bright-ice`: The world's surface is clean, highly reflective ice that returns most of the light falling on it. It appears brilliant white from orbit and remains extremely cold.
- `chaos-terrain`: Large areas of the world's ice have been broken into rafts and blocks and refrozen in disordered positions, a sign of warm material or liquid water rising from below.

#### Subglacial ocean world (`subglacial-ocean`)

A subglacial ocean world is a planet or moon with a liquid water ocean beneath a shell of ice kilometers thick. The ocean is kept liquid by tidal heating from a parent body, by radioactive decay in the rocky core or by some outside source of heat, and it may be in contact with the rock below, where chemical reactions can support life. Settlements are built on or within the ice, with shafts sunk to reach the ocean. Such worlds hold large reserves of water and, in some cases, lattice in the rock beneath. Halvard's Rest, the refinery moon of Mercer-Ibarra, and the rogue worlds of the Hollows, warmed by Absent heat engines, are subglacial ocean worlds.

Variants:

- `thin-shell`: The ice covering the world's ocean is only a few kilometers thick, and the ocean can be reached by drilling. Cracks and ridges on the surface mark places where water has risen close to it.
- `thick-shell`: The ice covering the world's ocean is tens of kilometers thick, and the ocean beneath it has been detected only by its effect on the world's rotation and magnetic field.
- `vent-ocean`: Hydrothermal vents on the floor of the world's ocean release heat and dissolved minerals, supporting communities of life in complete darkness.
- `rogue-warmed`: The world's ocean is kept liquid by heat from a source outside any natural system, in the absence of a star or a tidal partner.

#### Cryovolcanic world (`cryovolcanic`)

A cryovolcanic world is an icy planet or moon with active volcanism in which the erupting material is water, ammonia or methane rather than molten rock. Cryovolcanoes and geysers resurface the world, and the most energetic of them vent material to orbit, where it may feed a ring around the parent planet. Plumes carry samples of subsurface liquid to the surface, making cryovolcanic worlds the easiest places to study their hidden oceans.

Variants:

- `geyser-field`: Fields of erupting jets cluster along zones of tidal stress on the world, venting water vapor and ice grains high above the surface.
- `ice-dome`: Large domes of extruded ice rise from the world's plains, formed by slow eruptions of thick, cold slurry.
- `ammonia-flows`: Flows of ammonia and water spread across the world's surface from fissures, freezing into smooth, lobed plains.

#### Methane-sea world (`methane-sea`)

A methane-sea world is a cold planet or moon with a thick nitrogen atmosphere, an orange organic haze and lakes and seas of liquid methane and ethane. It has a full hydrological cycle in which hydrocarbons take the place of water: rain falls, rivers run and erosion shapes the land, all at temperatures far below the freezing point of water. The bedrock is water ice. Methane-sea worlds are rich in organic chemistry and valued as sources of hydrocarbon feedstock and nitrogen.

Variants:

- `polar-seas`: The world's hydrocarbon seas are concentrated around its poles, while its equatorial regions are dry.
- `haze-world`: Organic haze in the world's atmosphere is thick enough that the surface is seldom visible from orbit except at infrared wavelengths.
- `dune-belt`: Long dunes of organic sand girdle the world's equatorial regions, shaped by steady winds.

#### Hydrocarbon world (`hydrocarbon`)

A hydrocarbon world is a cold planet or moon on which heavier hydrocarbons predominate at the surface: seas of tar, dunes of waxy solids and plains of bitumen. Its atmosphere is usually thin and its chemistry slower and more viscous than that of methane-sea worlds. Hydrocarbon worlds are potential sources of chemical feedstock, though extraction at their temperatures is difficult and energy-intensive.

Variants:

- `tar-sea`: Viscous seas of tar fill the world's lowlands, moving only slowly and freezing almost solid in winter.
- `wax-dunes`: Dunes of solid paraffin-like compounds cover large regions of the world, soft and slippery underfoot.

#### Snowball world (`snowball`)

A snowball world is a planet that once had a temperate climate and has since frozen over entirely, following a change in its star's output, its orbit or its atmosphere. Ice now covers its former oceans and continents, and its surface reflects so much light that recovery is difficult without outside intervention. Traces of former oceans, rivers and life may lie preserved beneath the ice, and such worlds are of considerable interest to survey.

Variants:

- `frozen-ocean`: The world's oceans have frozen to great depth, possibly to the seafloor, and the former coastlines lie under ice.
- `buried-life`: Remains of a former biosphere lie preserved beneath the world's ice, from microorganisms to the structures of larger life.
- `slushball`: A narrow band of open water and slush persists around the world's equator, where some native life survives.

#### Hydrogen-ocean world (`hycean`)

A hydrogen-ocean world is a planet with a deep water ocean beneath a thick atmosphere of hydrogen. The hydrogen acts as a powerful greenhouse blanket and can keep the ocean liquid far beyond the distance at which an ordinary planet would freeze. The atmosphere is not breathable, but the ocean beneath may host marine life of an unusual kind. Hydrogen-ocean worlds are candidates for biological survey and sources of hydrogen and water.

Variants:

- `cold-hycean`: The world's ocean remains liquid far beyond its star's normal habitable zone, warmed by the insulating effect of its hydrogen atmosphere.
- `dark-hycean`: The world has no star, or orbits so far from one that it receives almost no light, and its ocean is warmed by internal heat alone.

### Giants (`giant`)

Worlds without a solid surface, classed by mass and by the chemistry of their visible cloud deck, which follows temperature: silicate and iron clouds on the hottest, water on warm giants, ammonia on cold ones and methane-tinted haze on ice giants. Giants dominate the outer parts of most Basin systems and hold most of their moons.

Usual habitability: none.

#### Hot giant (`hot-giant`)

A hot giant is a gas giant orbiting very close to its star, with an atmosphere heated to well over a thousand degrees. Hot giants are often inflated to radii larger than their mass would suggest, and many are losing atmosphere to the star. Their day sides are free of cloud and their night sides glow with their own heat. They usually orbit in a few days and are locked with one face toward the star. Their presence close to a star tends to clear the inner system of smaller planets.

Variants:

- `inflated`: The world's radius is substantially larger than its mass would suggest, its atmosphere swollen by heating from the star and from within.
- `evaporating`: The world is losing atmosphere to its star, and the escaping gas forms a visible tail trailing behind it in its orbit.

#### Silicate-cloud giant (`silicate-giant`)

A silicate-cloud giant is a very hot gas giant whose cloud deck is composed of silicate and iron condensates rather than water or ammonia. Such giants absorb most of the light that falls on them and appear dark by day, while their night sides glow a dull red. Their weather includes winds of extreme speed and precipitation of molten rock and iron at depth.

Variants:

- `iron-rain`: Droplets of molten iron condense and fall through the world's deep atmosphere, re-evaporating before they reach any surface.
- `dark-day`: The world reflects almost none of the light that falls on its day side and appears nearly black against its star.

#### Cloudless giant (`cloudless-giant`)

A cloudless giant is a gas giant whose temperature lies between the condensation points of ammonia and of water, so that neither forms clouds in its upper atmosphere. Without a cloud deck, the deep atmosphere scatters light much as a clear sky does, and the giant appears a deep, uniform blue. Cloudless giants are uncommon and visually distinctive, and their clear atmospheres make them useful references for long-range survey.

Variants:

- `azure`: The world appears a deep, uniform blue from orbit, without visible banding or storms.
- `alkali-haze`: Traces of sodium and potassium in the world's upper atmosphere form a thin haze that tints its blue toward violet.

#### Warm giant (`warm-giant`)

A warm giant is a gas giant at a moderate distance from its star, warm enough for its upper cloud deck to consist of water vapor. Warm giants are highly reflective and appear bright white. They frequently lie within or close to their star's habitable zone, and their larger moons may therefore be warm enough to hold liquid water and life of their own.

Variants:

- `water-cloud`: Bright decks of water-vapor cloud cover the world, reflecting most of the light that falls on them and giving it a brilliant white appearance.
- `habitable-moons`: The world orbits within its star's habitable zone, and its larger moons receive enough light and heat to hold liquid water at their surfaces.

#### Cold giant (`cold-giant`)

A cold giant is a gas giant in the outer part of its star system, with an upper atmosphere cold enough for clouds of ammonia and ammonium compounds. It is the commonest class of giant in the Basin. Its cloud deck is divided into alternating light zones and dark belts by fast zonal winds, and large storms, some lasting for centuries, form along the boundaries between them. Cold giants typically have extensive systems of moons and rings. Halvard, which carries a stationary storm larger than Tallis, is a cold giant.

Variants:

- `banded`: The world's clouds are organized into distinct light zones and dark belts in shades of tan, cream and brown, with turbulent eddies along their edges.
- `storm-giant`: The world's appearance is dominated by one or more storms larger than terrestrial planets, persisting for years or centuries.
- `pale`: The world's bands are muted and its storms weak, giving it a pale, washed-out appearance.

#### Low-density giant (`puffy-giant`)

A low-density giant is a gas giant with an unusually low mean density, its atmosphere extended far beyond what its mass would ordinarily hold. Some low-density giants are young and still contracting after formation; others are being inflated by heating or tidal forces. Most are losing atmosphere to space, and their extended envelopes make them susceptible to disruption.

Variants:

- `super-puff`: The world's mean density is comparable to that of light foam, its envelope extending to a radius far beyond that of other giants of similar mass.
- `young`: The world is still contracting after formation and radiates more heat than it receives from its star.

#### Helium giant (`helium-giant`)

A helium giant is a gas giant whose atmosphere is dominated by helium rather than hydrogen. Such worlds are thought to form when a hot giant loses most of its hydrogen to stellar heating over a long period, leaving the heavier helium behind. Without the methane absorption that colors most giants, helium giants appear grey or white.

Variants:

- `grey`: The world's cloud decks are a featureless grey-white, without the colors or banding typical of hydrogen giants.
- `residual`: The world is the depleted remnant of a former hot giant, smaller and denser than it once was.

#### Ice giant (`ice-giant`)

An ice giant is a giant planet composed mostly of water, ammonia and methane above a rocky core, beneath a comparatively thin envelope of hydrogen and helium. Methane in the upper atmosphere absorbs red light and gives ice giants their blue to blue-green color. Ice giants are common in the outer reaches of Basin systems; they have faint ring systems and families of small, icy moons, and their interiors may hold layers of superionic water.

Variants:

- `blue`: Methane absorption gives the world a deep blue color, with occasional dark storms and bright high clouds.
- `cyan`: The world is a paler, hazier blue-green, its features softened by a high-altitude haze.
- `tilted`: The world's rotation axis lies close to the plane of its orbit, so that each pole spends decades in continuous daylight and then in darkness.

#### Mini-Neptune (`mini-neptune`)

A mini-Neptune is a small gaseous planet, between about two and four times the radius of Earth, with a deep atmosphere of hydrogen and helium over a rocky or icy core and no accessible surface. Mini-Neptunes are among the commonest planets in the galaxy and in the Basin. Their atmospheres may conceal oceans of water or supercritical fluid at depth.

Variants:

- `hazy`: A high-altitude photochemical haze shrouds the world, obscuring the deeper atmosphere and giving it a featureless appearance.
- `water-rich`: A deep layer rich in water lies beneath the world's hydrogen envelope, possibly as an ocean of supercritical fluid.

### Small bodies (`small`)

Bodies below the size at which they are usually counted as planets: dwarf planets, comets and small moons. Most are catalogued only by number; those of note serve as anchors for stations or sources of water and metal.

Usual habitability: hostile, lethal.

#### Dwarf planet (`dwarf-planet`)

A dwarf planet is a body massive enough to have been pulled into a rounded shape by its own gravity but too small to have cleared its orbit of other material. Dwarf planets are common in the outer belts of Basin systems and in the belts of some inner systems. The icy examples may hold thin, seasonal atmospheres of nitrogen or methane that freeze onto the surface when the body is far from its star.

Variants:

- `icy-dwarf`: The world is composed of ice and rock, its surface coated in nitrogen and methane frost that sublimates and refreezes with the seasons.
- `rocky-dwarf`: The world is composed of rock and metal and lies in an inner asteroid belt, cratered and airless.

#### Comet (`comet`)

A comet is a small body of ice, dust and rock. When its orbit carries it close to its star, the ices sublimate, forming a coma around the nucleus and tails of dust and gas that stream away from the star. Comets captured into stable orbits around planets serve as convenient sources of water in systems without ice moons. Halyard's outer systems are crowded with comets, and they supply much of the trailing arm's water and reaction mass.

Variants:

- `active`: The world is venting jets of gas and dust from its surface, and it carries a coma and developing tail.
- `dormant`: The world's surface volatiles are exhausted, and a dark crust of residue seals the ice beneath it.
- `captured`: The world has been captured into a stable orbit around a planet, where it no longer approaches its star closely enough to become active.

#### Moonlet (`moonlet`)

A moonlet is a small, irregular moon or rock, usually a captured asteroid or a fragment of a larger body. Moonlets lack the gravity to pull themselves into a rounded shape, and their surface gravity is too weak to hold loose material securely. They are convenient anchors for stations, docks and moorings. The port at Sable is built from hulls moored around the largest of its dark moonlets.

Variants:

- `captured-asteroid`: The world is a captured asteroid in an irregular, often inclined orbit, its composition unrelated to the planet it orbits.
- `shepherd`: The world orbits at the edge of a ring and its gravity keeps the ring's boundary sharp.
- `dark`: The world's carbon-rich surface reflects almost no light, and it is difficult to see against the sky.

### World features

#### Orbit and rotation

| Feature | Definition |
|---|---|
| `tidally-locked-to-parent` | The world's rotation is locked to the planet it orbits, so that one hemisphere permanently faces its parent and the other faces away. From the near side the parent hangs fixed in the sky, waxing and waning through its phases. |
| `eccentric-orbit` | The world follows a markedly elongated orbit, and the light and heat it receives vary considerably between its closest and farthest approaches to its star. Seasons are governed more by distance than by axial tilt and are unequal in length. |
| `retrograde-orbit` | The world orbits in the opposite direction to its parent's rotation and to most other bodies in its system. A retrograde orbit usually indicates that the world was captured rather than formed in place. |
| `resonant-orbit` | The world's orbital period stands in an exact whole-number ratio to that of one or more neighbors, so that their alignments repeat on a fixed schedule. The Orrery's nine worlds are bound in a mutual resonance of this kind. |
| `binary-planet` | The world forms a binary pair with a body of comparable size, the two orbiting a common center that lies in the space between them. Each is prominent in the other's sky, and both share an orbit around their star. |
| `trojan` | The world shares its orbit with a much larger body, holding a stable position sixty degrees ahead of or behind it. Debris and smaller bodies often collect in the same region. |
| `captured-body` | The world did not form in its present orbit but was captured from elsewhere, and its composition differs from that of its neighbors. |
| `high-obliquity` | The world's axis is tilted so far that its poles in turn face directly toward the star. Each hemisphere passes through months of continuous daylight followed by months of darkness, and seasonal extremes are severe. |
| `slow-rotation` | The world rotates slowly, with a day lasting weeks or longer. Its surface heats strongly through the long day and cools deeply through the long night. |
| `fast-rotation` | The world rotates rapidly, with a day of only a few hours. It is visibly flattened at the poles, and its weather is organized into narrow, fast-moving bands. |

#### Rings and near space

| Feature | Definition |
|---|---|
| `rings` | A system of rings encircles the world, composed of ice, rock or dust and divided into bands by gaps and the influence of small moons. The rings are visible across the sky from the world's surface and from its moons. |
| `radiation` | The world is exposed to intense radiation from its star, a stellar remnant or trapped radiation belts. Unshielded electronics degrade quickly, and surface work requires shielding and close monitoring of exposure. |
| `strong-magnetosphere` | The world has a strong magnetic field that deflects much of the stellar wind and traps charged particles in belts around it. The belts are hazardous to cross but protect the surface. |
| `aurorae` | Aurorae are frequent and bright in the world's skies, sometimes reaching far from the poles. They are visible on most nights and can disturb communications. |
| `atmospheric-escape` | The world is steadily losing atmosphere to space, driven by heating or stellar wind. The escaping gas can be detected around the world and, in extreme cases, seen as a faint tail. |
| `debris-field` | A field of orbital debris surrounds the world, left by impacts, broken moons or wrecked craft. Navigation near the world requires current charts of the field. |

#### Atmosphere and weather

| Feature | Definition |
|---|---|
| `great-storm` | A storm larger than many planets persists in the world's atmosphere and has remained in place for years. It dominates the appearance of the world and the weather around it. Halvard's great storm has not moved in twelve years of observation. |
| `permanent-overcast` | Cloud covers the world without a break, and its star is never seen from the surface. Light at ground level is diffuse and shadowless. |
| `superrotation` | The world's atmosphere circles the planet faster than its surface rotates, sustaining strong winds at all latitudes and carrying weather around the globe in a matter of days. |
| `dust-storms` | Dust storms recur on the world, raising fine particles that cover regions or, at times, the entire planet for weeks. Visibility and solar power fall sharply while they last. |
| `acid-rain` | Rain on the world is acidic and attacks exposed metal, stone and organic material. Structures and equipment require protective coatings or regular replacement. |
| `extreme-lightning` | Lightning strikes the world at many times the rate of temperate planets, and electrical activity in its storms is a hazard to aircraft and unshielded equipment. |
| `haze` | A persistent haze, photochemical or volcanic in origin, hangs in the world's atmosphere. It colors the sky, softens the light at the surface and limits visibility at long range. |
| `katabatic-winds` | Cold, dense winds pour off the world's high ice and plateaus and down into its lowlands, reaching great strength where valleys channel them. |

#### Surface and interior

| Feature | Definition |
|---|---|
| `tidal-heating` | Tidal flexing by the world's parent or a close companion heats its interior. The heat drives volcanism or keeps subsurface liquid from freezing, and the world is geologically more active than its size would suggest. |
| `active-volcanism` | Volcanoes on the world are active, and eruptions occur somewhere on its surface every year. Fresh lava fields, ash deposits and volcanic gases are features of the landscape. |
| `cryovolcanoes` | Volcanoes on the world erupt water, ammonia or methane rather than molten rock, building domes and flows of ice and sometimes venting material into space. |
| `geysers` | Geysers erupt from the world's surface, venting water or other volatiles in jets that may rise far above the ground. They are concentrated along zones of geological stress or heat. |
| `subsurface-ocean` | A body of liquid water lies beneath the world's surface, insulated by rock or ice. Its depth and extent are known only approximately, and it may host life of its own. |
| `extreme-tides` | A large moon or close parent raises tides of many meters on the world, flooding and exposing broad areas of coast twice in each cycle and driving strong currents through narrow channels. |
| `impact-basin` | A single impact basin hundreds of kilometers across dominates one hemisphere of the world, its rim forming a ring of mountains and its floor a broad, low plain. |
| `mega-canyon` | A canyon system on a continental scale cuts across the world, many times deeper and longer than the largest canyons on settled Union worlds. |
| `quakes` | Strong earthquakes are frequent on the world, and construction must be designed to withstand them. Fault lines and fresh scarps mark its surface. |
| `caves` | Extensive natural cave systems run beneath the world's surface, offering shelter from its climate and radiation and providing access to its interior. |
| `low-gravity` | Surface gravity on the world is well below Union standard. Long residence weakens bone and muscle, but launches to orbit are cheap and heavy loads are easily moved. |
| `glassed-areas` | Areas of the world's surface have been fused into glass by an extreme heating event. The glass is flat, smooth and nearly featureless, cracked into plates by cooling. |

#### Life

| Feature | Definition |
|---|---|
| `native-life` | The world has an indigenous biosphere. Native life may be simple or complex, but it predates human arrival and is subject to the Charter's native-life protections. |
| `microbial-only` | Native life on the world is limited to microorganisms. There are no native plants or animals, but microbial mats and films may cover large areas and alter the chemistry of air and water. |
| `megafauna` | The world supports native animals large enough to threaten a frame. Predators of this size make the open country dangerous and require settlements to be defended. Verdance's predators are the standard example. |
| `dangerous-biosphere` | Native life on the world poses a serious hazard to settlers through pathogens, toxins, parasites or aggressive predators. Settlement requires medical precautions and perimeter defense. |
| `builder-organisms` | Native organisms on the world construct large structures from stone, soil or their own secretions. On Cairn, colonial organisms build stone structures several meters high that are observed to move. |
| `possible-sapience` | Native life on the world is under review for possible sapience under the Charter's native-life protections. A finding of sapience would void claims on the world and restrict access to it. |

#### Absent works

| Feature | Definition |
|---|---|
| `climate-engine` | Absent machinery buried kilometers beneath the world's surface regulates its air and climate. The structures were discovered by survey and are spaced in a pattern that has not been explained. All of the Basin's garden worlds appear to have them. |
| `failing-climate-engine` | The Absent machinery regulating the world's climate is failing. Parts of it have stopped entirely while others run erratically, and the world's winters, storms and coastal surges grow worse each year. Orison is the Basin's example. |
| `heat-engine` | Absent machinery warms the world from outside its natural energy budget, keeping water liquid where it would otherwise freeze. Nobody has switched one off or explained how it works. The rogue worlds of the Hollows are warmed in this way. |
| `absent-ruins` | Structures built by the Absent stand on or near the world: towers, platforms, shipyards or constructions of no recognizable purpose. Their age and function are unknown. |
| `absent-signal` | A repeating transmission of Absent origin is received from the world or its vicinity at a fixed interval. Its content has not been deciphered, and its source has not been located. |
| `custodians` | Active Absent machines defend the world's deep workings and attack anyone who digs too close, usually below about four hundred meters. Mining crews treat the depth as a boundary. |

#### Lattice

| Feature | Definition |
|---|---|
| `lattice-seams` | Lattice occurs on the world in seams through the rock, much as quartz does, and is mined by seam crews. The work is well paid and dangerous. |
| `lattice-crust` | Lattice coats parts of the world's surface as thin crusts that appear to have been deposited from outside. The crusts are easy to strip and slow to replace. |
| `lattice-dust` | Fine grains of lattice are suspended in the world's air, ice or rings, enormous in total quantity but slow to gather in useful amounts. |
| `lattice-rings` | The world's rings are composed largely of lattice, among the purest deposits known. Choir, in the Shoals, is the example; the local lane to it drifts so fast that no route holds for long. |

#### Settlement and history

| Feature | Definition |
|---|---|
| `abandoned-settlement` | The remains of a failed or evacuated settlement stand on the world, with structures, equipment and records left in place by those who departed. |
| `quarantine` | The world is under quarantine, closed to landing by order of the Survey Office or another authority. The quarantine is enforced unevenly, and unauthorized landings occur. |
| `battlefield` | The world is the site of recent or continuing fighting. Wrecked frames, fortifications, craters and unexploded ordnance mark the contested ground. |
| `wreck-field` | Wrecked ships, frames or structures lie on the world's surface or in its orbit, the remains of accidents, battles or abandoned operations, and are worked by salvagers. |

<!-- catalog:end -->
