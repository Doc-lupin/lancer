# Section B: Visual Overhaul — Action Plan

Written in ASD-STE100 Simplified Technical English (short sentences, active
voice, one instruction in each sentence). Technical names stay as they are.

**Section A** is the original project: Phases 0 to 5 in [PLAN.md](PLAN.md).
**Section B** is this plan. It changes the map from simple shapes to a
dynamic visual database. Every world, star and orbit gets its look from its
data and from physical models.

**Status (Nov 27, 2026): Phase B0 done and merged into `main`, closed by the GM
without its final test run (B0.1 to B0.11; work log [PHASE_B0.md](PHASE_B0.md)). Next: Phase B1
(orbits), then Section A Phase 3, then Phase B2 (BD5). The map is for desktop
browsers (BD13); quality comes first (BD15); WebGPU from B2 (BD14). The WIP
worlds are off by default (BQ1). Handoff for the next session:
[SECTION_B_HANDOFF.md](SECTION_B_HANDOFF.md).**

## 1. Objective

Make the map visually stunning and correct. The output must:

1. Show each world as a unique place, made from its data, with many biomes on each world.
2. Show the full range of alien biospheres, not only Earth copies.
3. Move the bodies on true orbits: eccentric, inclined, retrograde and irregular.
4. Show stars, stellar remnants and black holes with their physical properties.
5. Keep the map readable. Labels, lanes and data stay clear at all times.
6. Run smoothly in desktop browsers, from laptops with integrated graphics to strong GPUs (decision BD13: the map is viewed on computers only).

## 2. Rules for Section B

1. Obey the rules in `CLAUDE.md`. Do one small task at a time. Tie each task to one function in Table 4.
2. Do not break Section A. All Section A checks must pass after each task.
3. Do not start a phase until the previous phase's test passes.
4. The data is the authority. A generated world must agree with its data (water share, ice share, temperature, places, notes).
5. Make all generation deterministic. The same seed must give the same world on each device.
6. Tag each new data value with its origin. Invented values get the `invented` tag. Follow the schema in `data/schema/`.
7. Give each effect a quality tier (Table 6). Design for the high tier first (decision BD15). The map must work at the lowest tier.
8. Do not add a library without the GM's approval (Table 7).
9. Record each new decision in Section 8 of this file when it is made, with its research sources (Section 8, Sources).
10. Run the checks only when the GM asks (GM, Nov 27). Long runs slow the work.

## 3. Scope

In scope:

- Orbits and motion for all bodies, with time controls.
- World generation: tectonics, erosion, hydrology, climate, weather, biospheres.
- A catalog of biomes and world types in the data, with views to visit each biome.
- Planet surfaces from orbit down to low altitude.
- Gas giants, ice giants and ring systems.
- Stars of all 24 kinds, stellar remnants, black holes.
- Asteroids, belts, comets, rogue planets, wrecks, stations, structures, lane mouths.
- Nebulae, dust clouds and the galactic sky.
- The render pipeline: high dynamic range, bloom, tone mapping, shadows.

Out of scope:

- Walking or flying on the ground at human scale.
- Physics for ships or combat.
- Sound.
- Editing of terrain by hand in the map (the GM edits the data and the seed).

## 4. Functions

| ID | Function | Priority |
|---|---|---|
| F1 | Render pipeline and quality tiers | 1 |
| F2 | Orbits and motion | 1 |
| F3 | World generation: tectonics, terrain, erosion, hydrology | 1 |
| F4 | Climate and weather | 1 |
| F5 | Biospheres | 1 |
| F6 | Surfaces up close (materials, water, lights, shadows) | 2 |
| F7 | Gas giants, ice giants and rings | 2 |
| F8 | Stars, stellar remnants and black holes | 2 |
| F9 | Small bodies, stations and structures | 3 |
| F10 | Deep space: nebulae, dust, sky | 3 |
| F11 | Review, measurement and regression checks | 1 |
| F12 | Biome and world-type catalog: visit biomes, add biomes and world types | 1 |

## 5. Phases

Each phase has an objective, tasks, a test and the tools it uses.

### Phase B0: Foundation and measurement (F1, F11)

Objective: make the base for all later work. Measure before change.

Tasks:

- B0.1 Record a baseline. Take reference screenshots of 40 fixed views (desktop and phone). Record frame time and memory for each view.
- B0.2 Make a visual regression check (`tools/check_visuals.mjs`). Compare each view to its reference image. Report the difference as a number.
- B0.3 Make a performance check. Set a budget for each view: frame time, draw calls, GPU memory, bake time.
- B0.4 Change the render pipeline to high dynamic range. Use linear color for all light. Apply one tone map at the end. Add exposure control.
- B0.5 Add bloom for stars, glow and lava (needs decision BD1, Table 7).
- B0.6 Add quality tiers (Table 6). Select the tier from the device. Let the user change it.
- B0.7 Make a "World Lab" debug panel (development builds only). Show height, plates, temperature, moisture, wind, biome and normal maps for the world in view. The WIP code already has a first debug view (`uDebug` in `planet/terrain.js`).
- B0.8 Make a shared shader library: noise, cell noise, curl noise, scattering, color science (blackbody color, spectra).
- B0.9 Make a GPU job queue. Divide long bakes into small parts across frames. The view must not stop during a bake.
- B0.10 Make a cache for baked worlds in IndexedDB. Use the data hash and the generator version as the key.
- B0.11 Record each new decision and its research sources in Section 8.

Test:

- All Section A checks pass.
- The regression and performance checks run on desktop (and, as built before BD13, on phone emulation).
- The tone map and bloom do not change label or lane contrast below the WCAG AA contrast ratio (4.5:1) for labels.
- A bake never holds a frame for more than 50 ms on desktop.

### Phase B1: Orbits and motion (F2)

Objective: move all bodies on true Keplerian orbits. Show irregular motion.

Tasks:

- B1.1 Extend the orbit schema. Add: eccentricity, inclination, longitude of the ascending node, argument of periapsis, mean anomaly at epoch, retrograde flag, reference plane (parent equator or system plane). The schema already has `inclinationDeg` and `eccentricity`.
- B1.2 Fill the new values in `data/src/`. Keep canon values. Generate the others with `tools/` from the system's history (for example, captured moons get high inclination). Tag them `invented`.
- B1.3 Solve Kepler's equation for all orbits (`src/data/orbits.js`). Use double precision. Use a robust solver for high eccentricity (e up to 0.97).
- B1.4 Add binary and multiple stars. Put both stars on orbits around the barycenter. Support circumbinary planets (P-type) and planets around one star (S-type).
- B1.5 Add irregular motion. Use precomputed perturbation terms for resonant and chaotic bodies. Add Trojan bodies at L4 and L5. Add tumbling rotation for small irregular moons.
- B1.6 Add axial precession and seasons. Seasons must follow the dashboard clock and the axial tilt.
- B1.7 Draw orbits as true 3D ellipses. Mark periapsis, apoapsis and the ascending node. Show the inclination against the reference plane when the user selects a body.
- B1.8 Draw orbit lines with a fade along the path ("trail" from the body). Show the orbit direction.
- B1.9 Add time controls: pause, play, faster, slower, jump to date. The clock stays the source of truth (Section A Phase 3 clock).
- B1.10 Make a Python reference (`tools/ephemeris.py`). Compute positions for test dates.

Test:

- Positions in the view match `tools/ephemeris.py` to 1 part in 10^9 of the orbit size, for 200 dates.
- Each body sits on its drawn orbit line to within 0.5 px.
- Retrograde, inclined and eccentric orbits show correctly in 10 reference views.
- `check_system`, `check_zoom` and `check_jitter` pass.

### Phase B2: World generation — tectonics and terrain (F3)

Objective: make the shape of each world from a physical process, not only from noise.

Tasks:

- B2.0 Make the world test bed (decision BD12). Development builds only. Do not put test worlds in `map.json`.
  1. Make a world gallery test scene (`?test=worlds`, as `?test=camera`). Show a grid of globes under the same light: one globe for each world type, or one for each variant of a selected type. Make the grid from the world-type catalog (B4.11), so new types and variants show without a code change. Measure the color distance between types here (B4 test). Add the scene to the phone link as a second page.
  2. Add "Try as" controls to the World Lab (B0.7). Select a world type, a variant and a star kind. Rebuild the planet in view with them. Do not save the change.
- B2.1 Continue from the WIP code: cube-sphere level of detail (`planet/cubeSphere.js`), fields baked in cube maps (`planet/fields.js`).
- B2.2 Simulate plate tectonics over time (decision BD9; reference: Cortial et al., "Procedural Tectonic Planets", Eurographics 2019). Use a coarse cube-sphere grid (about 6 × 64² cells). Give each cell a plate, a crust type (continental or oceanic), a crust thickness and an age.
  1. Set the start from the data. Get the number of plates from the world type and size. Get the continental share from the water share. Get the seed from the body id.
  2. Move each plate about its own Euler pole for 20 to 40 steps (tens of millions of years each). Move the cells with their plate.
  3. At each step, find the boundaries and their type (convergent, divergent, transform).
  4. Where ocean crust meets continental crust: sink the ocean crust. Make a trench offshore and a volcanic range inland.
  5. Where continents collide: thicken the crust. Raise high ranges and a plateau.
  6. Where ocean crust meets ocean crust: make an arc of volcanic islands.
  7. Where plates separate: make new ocean crust of age 0 at a mid-ocean ridge. On land, make a rift valley that can open into a new sea.
  8. Where plates slide past: make a fault line. Do not raise mountains.
  9. Keep hotspots fixed below the moving plates. Make chains of volcanic islands that get older along the chain.
  10. Weld small continental pieces (terranes) onto the continents they hit.
- B2.2a Calculate height from the crust, not from noise. Use isostasy for land: thicker continental crust stands higher (35 km of crust about 1 km; doubled crust 4 to 6 km). Use the age of ocean floor for its depth: depth ≈ 2.5 km + 0.35 km × √(age in millions of years). Put the coasts on the continent edges. Use noise only for detail at render time.
- B2.2b Select the regime from the world type. Do not use plates on every world. Use one rigid shell for small or cold rock worlds (giant volcanoes, rift scars, old craters). Use resurfacing for hothouse worlds (young flat plains, few craters). Use cracked shells, chaos terrain and cryovolcanoes for ice worlds. Use magma seas or crater history for lava and airless worlds.
- B2.3 Run the simulation in WebGPU compute shaders at the high and ultra tiers (decision BD14). Use WebGL2 render-to-texture passes or a Web Worker as the fallback (low and medium tiers, browsers without WebGPU). Use the job queue (B0.9) and the cache (B0.10).
- B2.4 Add erosion. Use hydraulic erosion: cut in proportion to the water flow and the slope (stream power), and put the sediment on lowlands and coastal plains. Use the flow of B3.5. Use thermal erosion: collapse slopes that are steeper than the angle of repose. Run both on the cube map. Keep the cube faces seamless.
- B2.5 Add crater history for airless worlds. Use crater size and age distributions. Old craters are softer. Young craters have rays.
- B2.6 Add special terrain sets: dunes from wind (B3 winds), karst, chaos terrain, cryovolcanoes, ice lineae, crystal fields, glassed plains, shattered crust.
- B2.7 Fit the world to its data. Set sea level from the stated water share. Put places on the right ground (towns on land, ports at coasts). Use the notes where the generator can read them (for example "two continents").
- B2.8 Let the GM lock a world. Store the seed and the main settings in the data (`generation` block, tagged `invented`).
- B2.9 Make a height export for each world (`tools/`), for print maps and for checks.

Test:

- Water share within 2% of the data for all worlds with water.
- 100% of towns, cities and bases on land. 100% of ports within 1° of a coast.
- Mountain belts lie along convergent boundaries (measured in the World Lab).
- Ocean depth increases with the age of the ocean floor; coasts follow the continent edges.
- Bake time per world: less than 2 s at the high tier on a mid-range desktop GPU and less than 4 s at the low tier on integrated graphics, spread over frames without a held frame (B0.9); from the cache after the first visit (B0.10).
- No seams at cube faces (pixel check along all 12 edges).

### Phase B3: Climate and weather (F4)

Objective: give each world a climate from physics, and weather that moves with time.

Tasks:

- B3.1 Calculate insolation from the star's luminosity, the orbit distance (with eccentricity), the axial tilt and the date.
- B3.2 Calculate temperature from insolation, height (lapse rate), albedo (ice, cloud, desert) and heat transport (ocean and air). Calibrate to the data (`tempMeanC`, `tempRangeC`).
- B3.3 Model the general circulation. Set the number of cells from the rotation rate (fast rotation: more cells and bands). Use a special model for tidally locked worlds (flow from night side to day side).
- B3.4 Carry moisture with the winds. Calculate rain, rain shadows and deserts.
- B3.5 Make rivers and lakes. Find the closed basins with priority-flood (Barnes et al. 2014). A basin that connects to the ocean is ocean. A closed basin is a lake where rain is more than evaporation, and a salt flat where it is less. Give each cell a flow direction to its lowest neighbour. Add the rainfall down the flow. Make a river where the sum is more than a limit. Show rivers as map lines that fade in from the region scale (decision BD10); show them at true size up close.
- B3.5a Use the same model for other liquids: methane seas and rain (Titan type), lava seas, and oceans under an ice shell. Change only the temperatures and boiling points.
- B3.6 Make seasons. Snow lines, sea ice and vegetation change with the clock.
- B3.7 Make weather move. Advect cloud fields with the winds over time. Make cyclones and fronts. Make dust storms on dry worlds.
- B3.8 Make weather on other chemistry: methane rain (Titan type), sulfuric acid clouds (Venus type), steam worlds, iron rain on hot worlds.
- B3.9 Add lightning on night sides for storm worlds. Add aurorae for worlds with magnetic fields.

Test:

- Mean and range of temperature within 3 °C of the data for 95% of worlds.
- Wind belts and rain shadows visible in the World Lab for 10 reference worlds.
- All rivers end in a sea, a lake or a closed basin.
- Ice cover within 2% of the data's ice share for all worlds with ice.
- Weather moves without jumps when the clock runs (pixel difference between frames below a limit).

### Phase B4: Biospheres and the biome catalog (F5, F12)

Objective: show the full range of life and land. Each world shows many
biomes, not one color. Exotic world types and alien biomes look as different
as the data says. The GM can visit each biome and add new biomes and new world
types without a code change.

Dependency: the visit tasks (B4.12 to B4.15) use the data panel of Section A
Phase 3. Decision BD5 puts Phase 3 before this phase.

Tasks, biospheres:

- B4.1 Make a biosphere model from the data: `biosphere` (complex, simple, microbial, extinct, with megafauna), `nativeLife`, world features, climate and star type. 31 worlds have a biosphere entry now.
- B4.2 Calculate the color of photosynthesis from the star's spectrum. Under red dwarfs (47 systems), plants are dark: black, deep red or purple. Under hot stars, plants can be pale, yellow or blue-green.
- B4.3 Make biome sets for each biochemistry:
  1. Water and carbon (Earth-like, with alien colors).
  2. Chemosynthetic life at vents and hot springs.
  3. Cryo-life on ice worlds (colored ice, pigmented melt pools).
  4. Crystal or mineral life (glittering fields).
  5. Ocean life only (blooms, colored seas, reefs).
  6. Floating life in the clouds of gas giants.
  7. Megaflora and burrow-life (from the data variants).
- B4.4 Show life at all scales: color of continents from orbit, patterns (forest bands, blooms) at middle range, texture up close.
- B4.5 Add bioluminescence on night sides and in seas where the data supports it.
- B4.6 Show dead and dying biospheres: extinct worlds, "dying garden" worlds, terraformed and climate-engine worlds (Tallis).

Tasks, the biome catalog (adding biomes):

- B4.7 Define a biome in the schema (`data/schema/`). A biome has:
  1. An id, a name, an origin tag and a visibility tag.
  2. A biochemistry (from B4.3), or none for lifeless ground.
  3. A climate envelope: temperature, moisture, pressure, light level, star types.
  4. Ground preferences: height, slope, distance to sea, soil or rock type.
  5. A palette for each season, and night colors (bioluminescence).
  6. A material for close views (rock, sand, soil, vegetation, ice, crystal, liquid, mat).
  7. A pattern (forest, grass, reef, crystal field, fungal mat, dunes, salt flat, lava field).
  8. A short description for the data panel.
- B4.8 Make the first catalog in `data/src/biomes/`. Include all Earth-type biomes (Whittaker set: ice, tundra, taiga, temperate forest, grassland, desert, savanna, rainforest, wetland, alpine, beach, reef) and the alien sets of B4.3. Tag the alien biomes `invented`.
- B4.9 Replace the single biome lookup table (`planet/biomes.js`) with a biome map for each world. Store the two strongest biomes and their blend weight at each point. Support any number of biomes in the catalog.
- B4.10 Choose each world's biomes from its climate, its world type, its biosphere and its star. Let the GM add, remove or weight biomes for one world in the data (`biomes` list on the body).
- B4.11 Make the world types a catalog too (`data/src/worldTypes/`). Move the recipes of `planet/recipes.js` into it: terrain, climate, surface, air and the biome sets that each type allows. Cover all world types in `map.json` (about 40) and add exotic types: hycean (ocean under hydrogen air), eyeball, lava ocean, iron rain, ammonia sea, cloud forest, salt world, sand-sea world, ring-shadowed world. The GM adds a world type with a new file. The code does not change.
- B4.11a Put each type's variants in its file (decision BD11). Mark each variant `visible` or not. Give each visible variant modifiers: terrain, hydrology, climate, biome weights, palette and signature features. A variant that is not visible changes only the description and the data panel. Do the 53 world types that the Basin uses first (habitable wet and dry first), then the types in the catalog only. The catalog (`docs/WORLDS.md`) has 71 types and 218 variants.

Tasks, visiting biomes:

- B4.12 Show the biome under the pointer on a globe. Show its name, its description and the local climate values in the data panel.
- B4.13 Add a biome legend for the world in view: each biome, its color and its share of the surface. Highlight a biome's area when the user points to it in the legend.
- B4.14 Add "Visit": the camera flies down to a low-altitude view over a typical place of the selected biome, with the sun at a good angle. A second "Visit" goes to the next place of that biome.
- B4.15 Add a biome tour for each world: the camera visits each biome in turn. The GM can save a view as a bookmark in the data.
- B4.16 Make a biome preview in the World Lab: show a new biome on a test world before it goes into the catalog.

Test:

- Each living or wet world shows all biomes that its climate allows (at least 5 on Earth-type worlds with water).
- Biome shares on each world match the biome map to within 1%.
- A new biome file and a new world-type file show in the map after a rebuild, with no code change. The validator accepts them and checks their fields.
- "Visit" puts the camera over ground of the selected biome in 20 of 20 tries (checked by the biome id under the screen center).
- Each biosphere type and each world type has a distinct palette. Measure the color distance between types in the review gallery.
- Plant colors follow the star type for all living worlds.
- The GM approves the review gallery (B11.3).

### Phase B5: Surfaces up close (F6)

Objective: keep detail and beauty from orbit down to low altitude.

Tasks:

- B5.1 Use splat materials for the ground: rock, sand, soil, vegetation, snow, ice, lava. Blend them by height, slope, climate and biome.
- B5.2 Add procedural detail textures with triplanar projection. Add detail normals that grow with zoom.
- B5.3 Make water: waves, sun glint, foam at coasts, color by depth, sea ice.
- B5.4 Replace the ray-marched air with precomputed scattering tables (Bruneton model). Include aerial perspective and multiple scattering.
- B5.5 Add shadows: cloud shadows, ring shadows, eclipse shadows from moons, terrain self-shadow near the terminator.
- B5.6 Add night lights from population data: cities, roads between towns, lights on stations.
- B5.7 Make level-of-detail changes invisible. Morph vertices between levels.
- B5.8 Keep places correct on raised terrain. Put each marker on the real ground height.

Test:

- No visible pop during a zoom from orbit to low altitude (frame-to-frame pixel check).
- Frame time within budget at each quality tier.
- Each marker within 1 px of its ground point.

### Phase B6: Gas giants, ice giants and rings (F7)

Objective: make giants dynamic, varied and alive.

Tasks:

- B6.1 Make bands from zonal jets. Set the jet count and speed from the rotation and the giant type.
- B6.2 Advect the cloud pattern with the jets over time (flow maps). Add turbulence at the band edges.
- B6.3 Add storms with lifetimes: great storms, white ovals, dark spots, polar vortices, hexagons.
- B6.4 Add depth: cloud layers at different heights, haze, deep color.
- B6.5 Add lightning and aurorae. Add the thermal glow of hot giants.
- B6.6 Make ring systems from data: gaps from moon resonances, color, opacity. Light the rings by forward and back scattering. Show the planet shadow on the rings and the ring shadow on the planet.
- B6.7 Show moon shadows that move across the giant (transits).

Test:

- All 27 giants look different in the review gallery (color distance and band count).
- Bands move without jumps when the clock runs.
- Ring gaps match the resonance positions of the moons.

### Phase B7: Stars, remnants and black holes (F8)

Objective: show each of the 24 star kinds with its physical character.

Tasks:

- B7.1 Calculate star color from temperature (blackbody spectrum to sRGB). Use luminosity for glow size and exposure.
- B7.2 Make the star surface up close: limb darkening, granulation, spots, faculae. Animate the surface with the clock.
- B7.3 Make the corona, prominences and flares. Red dwarfs flare often (data `variable` and `features`).
- B7.4 Make giants and supergiants: large convection cells, a soft edge, mass loss. Make the Watchfire (blue supergiant) a landmark.
- B7.5 Make remnants: white dwarfs (small, hot, blue-white), neutron stars, pulsars (sweeping beams with their spin), magnetars (field lines, flares).
- B7.6 Make protostars with disks and jets, Wolf-Rayet stars with wind shells, carbon stars with dust shells.
- B7.7 Make binary interaction: mass transfer streams and accretion disks where the data says so.
- B7.8 Make the black hole: an accretion disk with Doppler beaming, gravitational lensing of the disk and the background sky (ray tracing in the shader), the photon ring, jets.
- B7.9 Add lens flare and star spikes at the correct quality tiers. Keep them off over labels.

Test:

- Star colors match the blackbody reference for each temperature (measured in the gallery).
- The black hole's lensing matches a reference image from a Schwarzschild ray tracer (`tools/`), within a set pixel tolerance.
- `check_stars` passes. Stars stay identifiable by kind at the Basin level.

### Phase B8: Small bodies, stations and structures (F9)

Objective: give every small object its own shape.

Tasks:

- B8.1 Make asteroids as irregular shapes (deformed meshes with craters). Tumble them.
- B8.2 Make belts and fields as instanced clouds of rocks with level of detail. Show collisional families and gaps.
- B8.3 Make comets: nucleus, coma, dust tail and ion tail. The tails point away from the star. Their length changes with distance.
- B8.4 Make rogue planets: dark, with geothermal glow and thin starlight.
- B8.5 Make wrecks and megastructures from procedural parts. Use the data for size and type (the Orrery, the Spine, the Absent wrecks).
- B8.6 Make stations from procedural modules: rings, spines, docks, lights.
- B8.7 Make lane mouths as a visual effect that shows lane state (open, closed, tidal, silent).

Test:

- Each object type has a distinct look in the review gallery.
- 10,000 belt rocks on screen stay within the frame budget at the medium tier.

### Phase B9: Deep space (F10)

Objective: make nebulae and dust real volumes.

Tasks:

- B9.1 Make nebulae as ray-marched volumes: emission (hydrogen red, oxygen teal), absorption, and light from the stars inside.
- B9.2 Make dust clouds absorb the light of stars behind them. The Mire hides its stars.
- B9.3 Improve the galactic sky: more stars at higher tiers, the coreward bulge, dust lanes (from the current `Backdrop.jsx`).
- B9.4 Add a far view mode for the whole Basin with soft depth of field (high tier only).

Test:

- Frame time within budget inside the Furnace at each tier.
- `check_effects` passes, with updated values where the look changes on purpose.

### Phase B10: Integration and release (F1, F11)

Objective: join all parts. Make the full system stable.

Tasks:

- B10.1 Tune all light to one exposure model. Check each level: Basin, region, system, planet, surface.
- B10.2 Add options: reduce motion, effects off, a "chart" mode with flat colors for players and print.
- B10.3 Tune the low tier on a laptop with integrated graphics, and the high tier on a mid-range desktop GPU.
- B10.4 Update the docs: `PHASE2.md` notes, data documentation for the new schema fields, World Lab guide.
- B10.5 Run all checks. Fix all findings.
- B10.6 Get the GM's approval. Merge Section B into `main`.

Test:

- All Section A and Section B checks pass.
- The GM approves the final review gallery and a test session in a desktop browser.

### Phase B11: Review (continuous, all phases)

- B11.1 After each phase, update the review link (private artifact; it was the phone link before BD13) for the GM.
- B11.2 Keep a gallery page of reference views. Update it after each phase.
- B11.3 Ask the GM to approve the gallery before the next phase starts.

## 6. Quality tiers

| Tier | For | Examples |
|---|---|---|
| Low | Laptops with integrated graphics | No bloom; clouds baked; 4 scattering steps; 1,000 belt rocks; no volumes. |
| Medium | Older or low-end desktop GPUs | Bloom; moving clouds; scattering tables; 5,000 rocks; simple volumes. |
| High | Mid-range desktop GPUs (the default) | All effects; lensing; 10,000+ rocks; full volumes; detail textures. |
| Ultra | Strong GPUs | Higher bake sizes; more ray-march steps; depth of field. |

Before BD13, low and medium were for phones (B0.6 picks them on touch screens).

## 7. Tools

Use all tools that are available. Get approval before a new library.

**Tools in the project now:**

| Tool | Use in Section B |
|---|---|
| Three.js, React Three Fiber, drei | Rendering, render-to-texture bakes, cube maps, instancing. |
| Zustand | One store for all state: time controls, quality tier, World Lab settings. |
| Vite | Build; shader files as modules. |
| `node --test` | Unit tests for orbit math, level of detail, recipes, tectonics steps. |
| Playwright (pre-installed) | Visual regression, performance budgets, gallery screenshots. |
| Python tools in `tools/` | Ephemeris reference, data generation for orbits and generation blocks, schema validation, lensing reference, height exports. |
| Web Workers, OffscreenCanvas | CPU parts of the simulations away from the main thread. |
| IndexedDB | Cache of baked worlds. |
| WebGL2 | Float render targets, cube maps, instancing, parallel shader compile. |

**Libraries and features decided by BD1 to BD4 (Section 8):**

| Item | Purpose |
|---|---|
| `postprocessing` and `@react-three/postprocessing` | Approved. Bloom, tone mapping, lens effects (B0.5). |
| Three.js WebGPU renderer and TSL compute | From the start of Phase B2, for the high and ultra tiers (BD14). WebGL2 stays as the fallback. |
| `leva` | Approved for development builds only. Sliders for the World Lab. |
| KTX2 textures (Three.js loader, Basis transcoder) | Only if detail textures exceed 20 MB. |

**Tools for planning, research and review:**

| Tool | Use |
|---|---|
| Web research | Scientific references: plate tectonics models, Bruneton scattering, Kepler solvers, photosynthesis under other stars, black hole imaging. Record the sources in the decisions file. |
| Parallel agents | Independent reviews of shaders and math; research in parallel. |
| Private artifacts | Review link after each phase (desktop browser); the review gallery; this plan as a shared page if the GM wants one. |
| The artifact viewer check | Check the review link before each update. |
| Memory notes | Keep the GM's preferences for the look between sessions. |

## 8. Decisions

BD1 to BD8: the GM accepted all eight recommendations on Nov 26, 2026. The
"Recommendation" column is now the decision.

| ID | Subject | Options | Recommendation |
|---|---|---|---|
| BD1 | Bloom and post-processing library | Add `postprocessing`; or write our own passes | Add the library: it is mature and fast. |
| BD2 | WebGPU | WebGL2 only; or WebGPU with WebGL2 fallback | WebGL2 first. Add WebGPU in Phase B9 if budgets need it. (Replaced by BD14.) |
| BD3 | World Lab sliders | `leva`; or our own panel | `leva`, development builds only. |
| BD4 | Texture compression | KTX2; or plain PNG | KTX2 only if detail textures exceed 20 MB. |
| BD5 | Order with Section A | Section B now, Section A Phases 3–5 after; or alternate | Do B0 and B1 now, then Section A Phase 3 (the clock that B1.9 needs), then continue B. |
| BD6 | Data changes | New schema fields for orbits, generation and biospheres | Add them with `invented` tags; keep canon values. |
| BD7 | Realism and readability | Strict physics; or physics with tuned exaggeration | Physics with tuned exaggeration (relief, air height, glow). Labels always win. |
| BD8 | Time | Real clock only; or a time-lapse mode | Both. The clock stays the source of truth. |

BD9 to BD15: decided by the GM on Nov 27, 2026. Phase B0's own questions (BQ1 to BQ4) are in [PHASE_B0.md](PHASE_B0.md).

| ID | Subject | Options | Decision |
|---|---|---|---|
| BD9 | Plate tectonics | A simulation over time; or one better snapshot (plates and boundary types in one pass) | The simulation, on a coarse grid (B2.2). It gives believable continents, island chains and old worn ranges; on the coarse grid its cost is small. |
| BD10 | Rivers on screen | Map lines visible from orbit; or true size only, up close | Map lines that fade in from the region scale, true size up close (B3.5). Physics with tuned exaggeration (BD7). |
| BD11 | World variants | Types only; or variants in each type's file | Variants in the type files, each marked visible or not; visible ones get modifiers (B4.11a). |
| BD12 | Test bed for world variation | Test systems in the map (beyond the Silent Mouths); or tools outside the map data | Tools outside the map data: a world gallery (`?test=worlds`) and "Try as" in the World Lab (B2.0). Test systems in the map would contradict canon (the Quiet holds no systems; nothing is known beyond the Silent Mouths), change every check that counts the map, and could show to players. |
| BD13 | Devices | Phones and computers; or computers only | Computers only: the GM and the players view the map in desktop browsers (GM, Nov 27). Desktop GPUs allow larger bakes, volumetric clouds, full scattering and WebGPU compute. Quality tiers stay, for weak laptops. |
| BD14 | WebGPU | WebGL2 only (BD2: WebGPU in B9); or WebGPU from B2 | WebGPU from the start of B2 for the high and ultra tiers, with WebGL2 as the fallback. Desktop browsers have it (BD13); compute shaders run the plate, erosion and climate simulations at much higher resolution. Part of three.js: no new library. |
| BD15 | Quality and cheap systems | Tune for weak devices; or quality first | Quality first (GM, Nov 27): design for mid-range desktop GPUs and up. The low tier must work but need not look as good. Nothing lowers the tier by itself; the default is high. |

### Sources (B0.11)

Methods used or planned in Section B, and where they come from.

| Where | Method | Source |
|---|---|---|
| B0.4 | Tone map: the shoulder of Khronos PBR Neutral | Khronos Group, "PBR Neutral Tone Mapping" (2024) |
| B0.4 | Linear light, sRGB encoding | IEC 61966-2-1 (sRGB) |
| B0.5 | Bloom: mipmap blur | `postprocessing` (pmndrs), after Jimenez, "Next Generation Post Processing in Call of Duty: Advanced Warfare" (SIGGRAPH 2014) |
| B0.5 | Label contrast ratio 4.5:1 | W3C, WCAG 2.2, success criterion 1.4.3 |
| B0.8 | `pcg3d` integer hash | Jarzynski and Olano, "Hash Functions for GPU Rendering", JCGT 9(3), 2020 |
| B0.8 | Gradient noise, 12 edge gradients, quintic fade | Perlin, "Improving Noise", SIGGRAPH 2002 |
| B0.8 | Cell noise | Worley, "A Cellular Texture Basis Function", SIGGRAPH 1996 |
| B0.8 | Curl noise | Bridson, Houriham and Nordenstam, "Curl-Noise for Procedural Fluid Flow", SIGGRAPH 2007 |
| B0.8 | Phase functions | Rayleigh; Henyey and Greenstein, ApJ 93, 1941; Cornette and Shanks, Applied Optics 31(16), 1992 |
| B0.8 | CIE 1931 matching functions, fitted | Wyman, Sloan and Shirley, "Simple Analytic Approximations to the CIE XYZ Color Matching Functions", JCGT 2(2), 2013 |
| B0.8 | Blackbody color from temperature | Kim et al., "Design of Advanced Color Temperature Control System for HDTV Applications", J. Korean Physical Society 41(6), 2002 (Planckian locus); Planck's law |
| B0.9 | Async read back | three.js `readRenderTargetPixelsAsync` (WebGL2 pixel buffer and fence) |
| Phase 2 | Smooth zoom-and-pan flights | van Wijk and Nuij, "Smooth and Efficient Zooming and Panning", InfoVis 2003 |
| B2.2 | Plate tectonics over time | Cortial, Peytavie, Galin and Guérin, "Procedural Tectonic Planets", Computer Graphics Forum 38(2), Eurographics 2019 |
| B2.2a | Ocean depth from crust age | Parsons and Sclater, J. Geophysical Research 82(5), 1977 (half-space cooling) |
| B2.2a | Height from crust thickness | Airy isostasy |
| B2.4 | Hydraulic erosion by stream power | Whipple and Tucker, J. Geophysical Research 104(B8), 1999 |
| B3.5 | Closed basins, drainage | Barnes, Lehman and Mulla, "Priority-Flood", Computers and Geosciences 62, 2014 |
| B5.4 | Precomputed atmospheric scattering | Bruneton and Neyret, "Precomputed Atmospheric Scattering", Computer Graphics Forum 27(4), 2008 |

## 9. Risks

| Risk | Corrective action |
|---|---|
| Weak laptops (integrated graphics) are too slow | Quality tiers; budgets in checks; bakes divided across frames; baked worlds cached. |
| Long bake times | GPU bakes; Web Workers; IndexedDB cache; small bake sizes at low tiers. |
| Shader compile stalls | Parallel shader compile; warm-up during the flight; fewer shader variants. |
| Worlds disagree with the data | Fit checks in B2 and B3; the GM can lock a world. |
| The map gets hard to read | Labels and lanes on top; contrast checks; "chart" mode. |
| Scope grows without end | One function for each task; a test for each phase; the GM approves each phase. |
| Checks are slow in headless software rendering | Small test sizes in checks; full sizes in the gallery only. |
| Different results on different GPUs | Deterministic seeds; integer hashes in shaders; tolerances in regression checks. |
| GPU memory | Least-recently-used caches for worlds (8 now); compressed textures at low tiers. |

## 10. First steps

1. Decisions BD1 to BD8 are made (Section 8).
2. Start Phase B0 with task B0.1 (baseline screenshots and budgets).
3. Then Phase B1, then Section A Phase 3 (BD5), then Phases B2 onward.
4. Work on branch `section-b`. The WIP planet work is there, not on `main`. Read [SECTION_B_HANDOFF.md](SECTION_B_HANDOFF.md) first.
