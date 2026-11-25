# Lancer: 3D Universe Map Tool

An interactive 3D map of a fictional universe, built as a web page (no installation). The GM makes and changes the map; players view it during a game session.

The full plan is in [docs/PLAN.md](docs/PLAN.md). The original document is in `docs/`.

Status: Phase 1 (complete the data) is done and its test passes; the work is merged into `main`. Phase 2 (the 3D view) is next and has not started: there is no app code yet.

`data/map.json` holds the whole Basin: 24 regions, 155 systems (40 of them unmapped), 329 bodies, 163 places, 10 control areas, 37 lanes and 50 factions, with the dashboard clock set to 5029u, day 300. Every world has a datablock: physical stats compared to Union standard, and a setting profile written as an in-universe register (survey, control, ratings, people, routed trade, gazetteer pronunciation).

| Document | Contents |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Design decisions, functions, phases and their tests; notes for starting Phase 2 |
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
src/          (from Phase 2)
  data/       Store (Zustand) and data loading
  views/      Sector, system and planet views
  interface/  Data panel, text boxes, news ticker, search
  storage/    Save, load, JSON export
public/       (from Phase 2)
  textures/   Planet textures
docs/         Plan and reference documents
tools/        Python data tools (build, validation, descriptions)
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
