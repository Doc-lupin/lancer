# 3D Universe Map Tool: Plan

Condensed from `3D_Universe_Map_Tool_Overview_and_Action_Plan.docx` (Nov 24, 2026).

## View levels

One continuous zoom, with no cuts or scene changes between levels:

- **Basin**: the whole bubble, with regions as clusters of stars.
- **Region**: the 2 to 12 stars of one region and their local lanes.
- **System**: one star, its planets and their orbits.
- **Planet**: one planet, its moons and its stations.

## Design decisions (Nov 25, 2026)

- **Continuous zoom.** The camera flies smoothly from the whole Basin down to one planet. The "Back" buttons become "zoom out to the parent level".
- **Real distance.** Stars sit at plausible physical positions in a rough sphere about 50 ly across. Lanes are drawn faded by default. A **lanes mode** makes the lanes bright and clear and labels them with days and type.
- **Unmapped systems.** Stars that exist but aren't charted are drawn dimmer. The Basin has more than 100 stars and only a fraction are on the official map.
- **Missing systems and planets** will be invented to fill out each region. Every object carries an origin tag (`canon` / `invented`) during production to help with cuts. The tag can be dropped before release.
- **Affiliation layers.** Swappable map overlays: governments, corporations, cultures (peoples), religions, and possibly outlaws and armed companies. Each faction gets a layer category and a color.
- **Contested control** is drawn as stripes in the colors of the factions involved.
- **Player mode** only hides GM notes in the interface. Players are trusted, so there is no separate player file.
- **Instancing** for stars and icons, as planned.

## Open questions

- How region positions in 3D are chosen: hand-placed, generated, or generated and then adjusted.
- Data needed for the cultures and religions layers: which regions each people or faith is present in, and how strongly.
- A current game date for the tidal lane cycle (73 days, about 14 open).

## Functions

| Function                 | Description                                                              | Priority |
|--------------------------|--------------------------------------------------------------------------|----------|
| View control             | Turn, move and zoom the camera. Click an object to move the camera to it. | 1 |
| Level change             | Sector → system → planet, and back.                                       | 1 |
| Object data              | Panel with name, type and notes of the selected object.                   | 1 |
| Data storage             | All map data in one JSON file. Save and load it.                          | 1 |
| Regional control         | A faction for each system; faction borders in faction color.              | 2 |
| Units                    | Unit icon on a system with owner, size, notes.                            | 2 |
| Unit movement            | Line for each move order; unit moves along the lane.                      | 2 |
| Text boxes               | Attached to an object, or placed on the screen.                           | 2 |
| News ticker              | Headlines scrolling along the bottom of the screen.                       | 2 |
| GM mode / player mode    | GM edits data; GM notes hidden from players.                              | 2 |
| Search                   | Find an object by name.                                                   | 3 |
| Timeline                 | Record of changes; show the map at an earlier date.                       | 3 |

## Phases

Do not start a phase until the previous phase's test passes.

### Phase 1: Prepare the data
- [ ] List star systems, planets, moons and stations (name, type, position, notes, origin tag)
- [ ] Invent the missing systems and planets; place all stars in 3D
- [ ] List factions (name, color, layer category)
- [ ] Write the JSON schema
- [ ] Fill `data/map.json` with a small set (5–10 systems)
- **Test:** the JSON file opens without errors; every object has all its fields.

### Phase 2: Make the 3D views
- [ ] Sector view from the JSON file
- [ ] Camera controls (OrbitControls)
- [ ] Continuous zoom through Basin → region → system → planet
- [ ] Faded lanes by default; lanes mode toggle
- [ ] Dim rendering for unmapped stars
- [ ] System view (click a system)
- [ ] Orbits, with planets moving along them
- [ ] Planet view (click a planet)
- [ ] Back button on each view
- **Test:** sector → planet → back works; no jitter when zooming.

### Phase 3: Add the interface
- [ ] Data panel
- [ ] Text boxes
- [ ] News ticker
- [ ] Search box
- **Test:** panels show correct data and don't cover too much of the 3D view.

### Phase 4: Add the strategy functions
- [ ] Regional control (GM sets faction per system)
- [ ] Faction borders, with stripes for contested areas
- [ ] Swappable affiliation layers (governments, corporations, cultures, religions)
- [ ] Units placed by the GM
- [ ] Move orders and unit movement
- [ ] GM mode and player mode
- **Test:** a control change redraws the border immediately; player mode hides GM notes.

### Phase 5: Save, test and release
- [ ] Save/load via JSON export
- [ ] Database storage, if players need live changes
- [ ] Test on a computer and a phone
- [ ] Test session with one player; fix what it shows
- **Test:** data stays correct after closing and reopening the tool.

## Risks

| Risk                     | Result                                   | Corrective action |
|--------------------------|------------------------------------------|-------------------|
| Large distances          | Objects shake when zoomed near           | Continuous zoom rules out separate scenes. Use a floating origin (re-center the world on the focused object), a logarithmic depth buffer, and per-level unit scales |
| Too many objects         | Slow view, mostly on phones              | Instancing for stars and icons |
| Code file too large      | LLM loses track; changes break other parts | Small files: data, views, interface, storage |
| Data in several places   | Panels and 3D view disagree              | One Zustand store |
| Planet surfaces          | Flyable terrain is a lot of work         | Textured sphere with clouds and atmosphere; no terrain in first release |
| Data loss                | Changes lost when the page closes        | Export the JSON file after each session |
