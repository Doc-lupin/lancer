# Lancer: 3D Universe Map Tool

An interactive 3D map of a fictional universe, built as a web page (no installation). The GM makes and changes the map; players view it during a game session.

The full plan is in [docs/PLAN.md](docs/PLAN.md). The original document is in `docs/`.

Status (Nov 27, 2026): Section A Phases 1 (the data) and 2 (the 3D view) are done and accepted. Section B, the visual overhaul ([docs/SECTION_B.md](docs/SECTION_B.md)), has finished Phase B0 (render pipeline, quality tiers, checks); next is Phase B1 (orbits), then Section A Phase 3 (the interface). The map is for desktop browsers. Run it with `npm install && npm run dev`.

`data/map.json` holds the whole Basin: 24 regions, 155 systems (40 of them unmapped), 329 bodies, 163 places, 10 control areas, 37 lanes and 50 factions, with the dashboard clock set to 5029u, day 300. Every world has a datablock: physical stats compared to Union standard, and a setting profile written as an in-universe register (survey, control, ratings, people, routed trade, gazetteer pronunciation).

| Document | Contents |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Section A: design decisions, functions, phases and their tests |
| [docs/SECTION_B.md](docs/SECTION_B.md) | Section B (visual overhaul): phases B0–B11, quality tiers, decisions BD1–BD15, sources |
| [docs/SECTION_B_HANDOFF.md](docs/SECTION_B_HANDOFF.md) | Where Section B stands and how to continue it |
| [docs/PHASE2.md](docs/PHASE2.md), [docs/PHASE_B0.md](docs/PHASE_B0.md) | Work logs of Phase 2 and Phase B0 |
| [docs/PHASE1.md](docs/PHASE1.md) | Phase 1 tasks, decisions D1–D19, departures from the documents |
| [docs/WORLDS.md](docs/WORLDS.md) | World types, variants and features, with description templates |
| [docs/DATABLOCK.md](docs/DATABLOCK.md) | Every datablock field, how it is derived, trade routing and levies |
| [data/schema/README.md](data/schema/README.md) | Field guide for `map.json` |
| [data/src/README.md](data/src/README.md) | The authored source files and how the build merges them |

## Stack

| Library           | Use                                              |
|-------------------|--------------------------------------------------|
| Three.js          | 3D objects                                       |
| React             | Interface panels                                 |
| React Three Fiber | Connects Three.js to React                       |
| drei              | Text boxes on 3D objects, camera controls        |
| Zustand           | Single data store                                |
| Vite              | Dev server and build (decision D19)              |

## Layout

```
data/
  raw/        Source documents (source/*.docx), Markdown conversions, extracted images
  parsed/     Structured JSON extracts of regions, lanes, factions, timeline
  schema/     JSON schema, field guide and a two-region example
  src/        Authored map data (per-region files, layers, lane edits)
  map.json    The map data file, built by tools/build_map.py
src/
  data/       Store (Zustand) and data loading
  views/      The 3D map: stars, lanes, systems, globes, effects; planet/ (procedural
              worlds, off by default), shaders/ (shared GLSL), camera/
  interface/  Buttons, the World Lab (development builds)
  storage/    Map loading, the cache of baked worlds
public/
  textures/   Planet textures
docs/         Plans, work logs, reference documents; section-b/ (baselines)
tools/        Python data tools; browser checks (check_*.mjs, check_all.sh)
```

The code is split into small files on purpose, so each LLM task touches only a few of them.

## Data tools

The map is authored in `data/src/` and built into `data/map.json` (decision D5: this stays the source until Phase 5, when the app gains saving; until then the app only reads `map.json`). Edit the source files, never `map.json` by hand. The tools need Python 3 and `jsonschema` (dev use only, not part of the app).

```bash
python3 tools/build_map.py
```

Rebuilds `data/map.json` from `data/src/`, derives every datablock and runs the structure check.

```bash
python3 tools/validate_map.py --complete
```

The Phase 1 test: schema, references, hierarchy, worlds, datablocks, factions and clock.

```bash
python3 tools/test_validate_map.py
```

Validator tests.

```bash
python3 tools/describe_world.py tallis-planet
```

Prints a world's datablock and description as the information box will show them.

```bash
python3 tools/world_catalog.py --check
```

Confirms the world catalog, the schema enums and `docs/WORLDS.md` agree.
