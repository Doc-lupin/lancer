# Lancer: 3D Universe Map Tool

An interactive 3D map of a fictional universe, built as a web page (no installation). The GM makes and changes the map; players view it during a game session.

The full plan is in [docs/PLAN.md](docs/PLAN.md). The original document is in `docs/`.

Status: setup only. Phase 1 (data preparation) has not started.

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
  raw/        Source lists from the GM: systems, planets, moons, stations, factions
  schema/     JSON schema for the map data (Phase 1)
  map.json    The map data file (added in Phase 1)
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
