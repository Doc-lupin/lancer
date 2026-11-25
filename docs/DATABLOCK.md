# World datablock

Every typed world in `data/map.json` carries a datablock in two parts: `stats`, its physical figures, and `profile`, what it means to the people of the Basin. The datablock is written as an in-universe register, the kind the Survey Office and the Exchange would keep: it holds what a well-informed traveler could look up, and nothing the GM keeps hidden. A visible world's datablock never draws on GM-only objects (its moon count, settlements, defenses and trade leave them out). Stations carry a `profile`. The information box shows the datablock above the world's description; `python3 tools/describe_world.py <body id>` prints both.

Most values are derived by `tools/derive_stats.py` during the build, from the world's orbit, star, type, variant, features, places and the lane network. Values written in `data/src/profiles.json` always win over derived ones; that file holds populations, trends, settled years, the economies of the notable worlds and stations, and a few physical overrides. Pronunciations come from `data/src/pronunciation.json`.

**Union standard** means Earth: 1 g, a 24-hour day, a 365.25-day year, 1 atm, and the sunlight Earth receives. Fields ending in `Rel` compare a world to standard.

## stats

| Field | Meaning | Derived from |
|---|---|---|
| `sizeClass`, `diameterKm`, `radiusRel` | Size, from minor body to inflated giant | Radius |
| `massRel`, `gravityG`, `escapeKms` | Mass, surface gravity (cloud tops for giants), escape velocity | Radius and a density for the world type |
| `orbitAccess` | Cost of reaching orbit: easy, standard, costly, very costly, no surface | Escape velocity |
| `dayHours`, `dayRel`, `tidallyLocked` | Length of day. A locked world's day equals its orbit | Rotation where recorded; otherwise a range for the type |
| `yearDays`, `yearRel`, `localDaysPerYear` | Year around the star. Moons share their planet's | Orbital period |
| `axialTiltDeg`, `seasons` | Tilt; seasons none, mild, strong or extreme | Tilt, eccentricity and season features |
| `distanceAu`, `insolationRel` | Distance from the star and sunlight relative to standard | Orbit and star luminosity |
| `heatSource` | Star; "star, regulated" where Absent machinery holds the climate; Absent engine; tidal heating | Features and system center |
| `tempMeanC`, `tempRangeC`, `tempNote` | Mean surface temperature, typical range and what drives it | Sunlight, albedo and greenhouse effect, held within the world's climate band (see below) |
| `pressureAtm`, `breathability`, `atmosphere` | Surface pressure, how people breathe there, main gases | World type and variant |
| `surface` | Shares of water, land, ice and other (glass, lava, salt, tar, lattice crust) | World type and variant |
| `precipitation` | None, arid, light, moderate, wet, torrential, or a special case | World type and atmosphere |
| `geology` | Dead, quiet, active or violent | Type and features |
| `radiation` | Surface radiation: low, moderate, high, lethal | Star kind, flares, magnetic field, atmosphere, radiation features |
| `sky` | Sky color, the sun's color and apparent size, other bright objects | Atmosphere, star, moons, rings, features. The Watchfire is visible from every world |
| `moons`, `moonNames`, `rings` | Moons orbiting the world, and rings | The data |
| `biosphere`, `nativeLife` | None, microbial, simple, complex, with megafauna, extinct; edibility and sapience review | Life features and habitability |
| `absent` | Absent works on the world: engines, ruins, custodians and the like | Absent features |

**Temperature and climate.** The world's recorded `climate` is the deliberate choice. If the physical estimate falls outside the climate's band, the mean is placed inside the band on the side the physics points to; on garden worlds this is the Absent climate engines at work, and `heatSource` says "star, regulated". Orbits of livable worlds were set (task 1.15) so that their sunlight fits their climate. Airless worlds take their physical temperature directly, since cool, cold, temperate and warm describe weather; they are labeled frozen, hot or scorching, or carry no climate when their temperature falls between.

| Climate | Mean band |
|---|---|
| scorching | 200 to 3,000 °C |
| hot | 35 to 200 °C |
| warm | 18 to 30 °C |
| temperate | 8 to 18 °C |
| cool | −2 to 8 °C |
| cold | −40 to −2 °C |
| frozen | −270 to −40 °C |

## profile

| Field | Meaning | Derived from |
|---|---|---|
| `surveyStatus` | Settled, surveyed, partly surveyed, seen from orbit only, unvisited | Places, stations and whether the region is frontier |
| `authority` | Who governs, or "contested: …", or no authority | Control on the world, its system or its region |
| `claims` | Allotment-registered, disputed, closed by quarantine, pending a sapience ruling, held by a faction, unclaimed | Features and control |
| `security` | 1 to 5, military and criminal threat, with reasons | Contested control, fighting, insurgency, sieges, smugglers, outlaws in the region, contested ground; fortified settlements offset one point |
| `hazard` | 1 to 5, environmental danger, with reasons | Habitability plus hazard features (radiation, custodians, predators, disease, flares, quakes and others) |
| `navyReach` | Navy home waters, within patrol range (3 lane days or less from Ostrom or Tallis), occasional patrols (6 or less), beyond the Navy's reach | Lane network |
| `toMarrow` | Shortest route in lane days to Ostrom and the regions it passes, noting tidal or drifting lanes. News travels no faster | Lane network, respecting one-way lanes |
| `transitDays`, `transitFrom` | Days from the nearest lane mouth at standard drive (1 g, accelerating to midpoint then braking), using positions on the clock date; or from a local-lane arrival if the system has no primary mouth | Orbits and clock |
| `portClass`, `defenses` | Landing pad, landing field, spaceport, orbital station or both; guns, pickets, garrisons | Places and stations; a capital or traffic hub has a spaceport |
| `settlements` | Count, the main settlement and notable places | Places |
| `population`, `populationTrend`, `settled` | People awake, trend (uninhabited, abandoned, growing, stable, declining, evacuating) and first settlement year | Authored; the Basin totals about 1.2 million awake |
| `peoples`, `faiths` | The peoples and faiths present, major or minor | Presence on the world and its region |
| `economy` | Trade and supply; see below | Features, places, control and the lane network, with authored economies for notable worlds |
| `lattice` | Rating, where, whether worked and by whom | Lattice data, mining places, exports and control |
| `code` | Quick-reference line (below) | Generated |

`populationTrend` reads abandoned for a world that was settled and is now empty (Verdance, Sump, Ashlar).

## economy

| Field | Meaning |
|---|---|
| `base` | Primary activity: farming and ranching, lattice mining, refining, frame manufacture, free-port trade, Navy picket and levy collection, and so on; none when uninhabited |
| `exports` | Each good with where it goes (`to`) and its commodity class |
| `imports` | Each good with where it comes from (`from`) and its class |
| `resources` | Known resources other than lattice, each worked, unworked, claimed but unworked, or closed by quarantine |
| `levies` | Tithes, tolls and protection paid on the world's trade routes |
| `printAccess` | What can be printed there: licensed print shops, company designs only, Armory licenses only, unsigned prints, open market |
| `food`, `water` | Self-sufficient, a surplus exported, partly local, imported, recycled aboard, shipped in with supplies; empty when uninhabited |

**How trade is routed.** Every import names a supplier, and that supplier's exports name the buyer's region, so the two sides of a trade always agree.

- Lattice is sold to a market: the Assay House on the Marrow, which sets the Basin price; Sable Harbor, the levy-free port; or the Halvard's Rest refinery. The seller's allegiance picks the market. Crossroads sellers and Mercer-Ibarra sell to the Assay House; Rimelight and Kerr-Varga sell to both the Assay House and Sable; the Southern League sells through Halvard's Rest and Sable; the Gatherers' Guild and the Seventh sell at Sable; the Purview keeps its lattice for its own yards and the Armory. A small lattice rating supplies local printers only.
- Lattice buyers draw first on their own holder's mines or market, then on the market nearest their allegiance.
- Other goods come from the nearest producer by lane days. A good with no producer in the Basin is bought on the Exchange at the Marrow (Sable Harbor for the trailing traders and outlaws).
- Outposts of fewer than 200 people are supplied by their holder and do not trade on their own.

**Levies** follow the route each trade takes:

| Levy | Applies to |
|---|---|
| Navy tithe: a tenth of lattice crossing Ostrom | Lattice whose route passes through Ostrom. Trade with Sable Harbor takes routes that keep clear of Ostrom, which is how Sable's lattice stays levy-free |
| Mercer-Ibarra passage fee on the Halvard Gap | Any trade using the Halvard Gap, except Mercer-Ibarra's own |
| Purview entry tax on ships entering the Shoals | Trade into, out of or through the Shoals, except the Purview's own |
| The Tallymen's tally on the Sable Run | Protection paid on trade along the Sable Run |
| Picket levies | Worlds with a picket |
| No levy or inspection | Free ports such as Wending |

Authored levies add to these (Bellows pays the Seventh for protection).

## Quick-reference code

`CON/G 1.1g +9°C 1atm/B W65 H1 S3 P520K` reads: world type code / habitability, gravity, mean temperature, pressure / breathability, water share, hazard rating, security rating, population.

| Part | Values |
|---|---|
| Type code | Two to three letters per world type, unique across the catalog (CON continental, TLO tidally locked, GLA glassed, CGD cold giant, and so on) |
| Habitability | G garden, H habitable, M marginal, X hostile, L lethal, N no surface |
| Breathability | B breathable, S in season, D with a gas mix, K mask, F filter, U sealed suit, V vacuum, - no surface |
| W, H, S, P | Water percentage, hazard 1–5, security 1–5, population (K thousands, M millions) |

## Gazetteer

`pronunciation` gives a respelling with the stressed syllable in capitals: Tallis TAL-iss, Tuyere twee-YAIR, Halvard's Rest HAL-vardz REST. Numerals and moon letters are spoken (Ostrom IV: OSS-trum FOUR; Tallis a: TAL-iss AY), and Calder catalog numbers are read as words (KAWL-der one-zero-five). Regions, systems, worlds and stations carry one.
