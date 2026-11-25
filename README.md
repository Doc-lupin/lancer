# Lancer: 3D Universe Map Tool

An interactive 3D map of a fictional universe, built as a web page (no installation). The GM makes and changes the map; players view it during a game session.

The full plan is in [docs/PLAN.md](docs/PLAN.md). The original document is in `docs/`.

Status: Phase 1 (complete the data) is done and its test passes, on branch `phase-1`. `data/map.json` holds the whole Basin: 155 systems, 329 bodies, 163 places, 37 lanes and 50 factions. Phase 2 (the 3D view) is next. Every world has a datablock (physical stats, and a setting profile read as an in-universe register, with routed trade). See [docs/PHASE1.md](docs/PHASE1.md), [docs/WORLDS.md](docs/WORLDS.md) and [docs/DATABLOCK.md](docs/DATABLOCK.md).

## Stack

| Library           | Use                                              |
|-------------------|--------------------------------------------------|
| Three.js          | 3D objects                                       |
| React             | Interface panels                                 |
| React Three Fiber | Connects Three.js to React                       |
| drei              | Text boxes on 3D objects, camera controls        |
| Zustand           | Single data store                                |

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
  views/      Sector, system and planet views
  interface/  Data panel, text boxes, news ticker, search
  storage/    Save, load, JSON export
public/
  textures/   Planet textures
docs/         Plan and reference documents
```

The code is split into small files on purpose, so each LLM task touches only a few of them.
