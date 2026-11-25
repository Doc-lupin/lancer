# 3D Universe Map Tool: Action Plan V2

Repository copy of the V2 plan (Nov 25, 2026). The shared document is at
https://claude.ai/artifact/MDzMcUZF9q7TRJi2YMVwLC. V1 is `3D_Universe_Map_Tool_Overview_and_Action_Plan.docx`.

## Design decisions

| Subject | Decision |
|---|---|
| Zoom | One continuous zoom: Basin → region → system → planet. Click flies to an object; zoom out goes to the parent level. No scene changes, no Back buttons. |
| Distance | Real 3D positions in a ~50 ly sphere. Lane days are not tied to distance. |
| Positions | Generated from the chart (`tools/generate_positions.py`), then hand-adjusted. Locked values survive regeneration. |
| Lanes | Faded by default. Lanes mode makes them bright with day/type labels. |
| Tidal lanes | Always drawn; bright when open (~14 of 73 days), dim when closed, driven by the dashboard clock. |
| Clock | Union year + day, Basin year beside it. Starts at 5029u, day 300 (year 12), tidal cycle day 5 of 73 (open 9 more days). |
| Unmapped stars | Drawn dimmer. |
| Invented content | Origin tag on every object (`canon` / `invented`) to help with cuts. Invented objects also get "(WIP)" at the end of their name, e.g. "Tew II (WIP)". |
| Orbits | Planet positions follow the dashboard clock. |
| Use | Private use only. |
| Affiliation layers | Swappable: governments, corporations, cultures, religions. One layer and one color per faction. |
| Contested areas | Stripes in the colors of the factions involved. |
| Player mode | Hides GM notes in the interface only. Players are trusted; no separate player file. |
| Performance | Instancing for stars and icons. |

## Functions

| Function | Priority |
|---|---|
| Continuous zoom | 1 |
| Object data panel | 1 |
| Data storage (one JSON file) | 1 |
| Lanes mode | 1 |
| Dashboard clock | 2 |
| Tidal fade | 2 |
| Affiliation layers + contested stripes | 2 |
| Units, unit movement | 2 |
| Text boxes, news ticker | 2 |
| GM mode / player mode | 2 |
| Search, timeline | 3 |

## Data rules

- Hierarchy: Basin → region → system → body (planet, moon, station, structure, lane mouth). A planet or moon can have surface places (towns, fronts, sites) with latitude and longitude.
- Every region shows as stars at the Basin level. The Furnace and the Mire hold stars inside a nebula or dust cloud (region effect). In the Hollows and the Boneyard each "star" has a rogue planet or wreck at its center instead of a sun; the Orrery has its structure. A system's center can be a star, rogue planet, wreck or structure.
- A lane connects two stars, not two regions. Known mouth stars: Brace, Marchwell. Invent the rest.
- Control can be set at every level down to the planet view: region, system, planet (Scald is split on the planet).
- Every object has an origin tag and a visibility tag (`all` / `gm`).
- New data can be created at any phase, not only Phase 1. Tag it `invented`.

## Phases

Do not start a phase until the previous phase's test passes.

### Phase 0: Setup (done)
- [x] Work directory and layout
- [x] Parse the five source documents into `data/parsed/`
- [x] Generate first 3D region positions

### Phase 1: Complete the data
Task breakdown, review findings and open decisions: [PHASE1.md](PHASE1.md).

- [x] JSON schema: Basin, region, system, body, lane, faction, unit, text box, headline, clock
- [x] System center types (star, rogue planet, wreck, structure); region effects (none, nebula, dust cloud); origin and visibility tags
- [x] Hand-adjust and lock region positions
- [x] Stars in each region, with positions
- [x] Unmapped stars
- [x] Missing planets, moons and stations (invented tag)
- [x] Attach each lane to a star at each end
- [ ] Layer and color for each faction
- [ ] Add the five peoples; write presence for peoples and faiths
- [ ] Clock start in the data: 5029u, day 300, tidal cycle day 5
- [ ] Assemble `data/map.json`
- **Test:** the file matches the schema; every reference resolves; every region has a star or special object.

### Phase 2: 3D view
- [ ] Regions and stars from JSON, instanced; unmapped stars dimmer
- [ ] Camera controls, continuous zoom, floating origin
- [ ] Faded lanes + lanes mode; one-way direction marks; drifting lanes broken
- [ ] Nebula and dust-cloud effects; systems with a planet, wreck or structure at the center
- [ ] System level (star, planets, orbits following the clock); planet level (planet, moons, stations, surface places on the globe)
- **Test:** zoom Basin → planet and back without a break; no shaking; smooth on a phone.

### Phase 3: Interface
- [ ] Data panel
- [ ] Dashboard clock; tidal lanes fade from it
- [ ] Text boxes, news ticker, search
- **Test:** panels show correct data; a clock change updates tidal lanes immediately; panels don't hide too much of the view.

### Phase 4: Strategy functions
- [ ] Affiliation layers and selector
- [ ] Control areas; stripes for contested areas
- [ ] Units, move orders, unit movement
- [ ] GM mode and player mode
- **Test:** a control change redraws immediately; each layer shows the right factions; player mode hides GM notes.

### Phase 5: Save, test, release
- [ ] Save/load via JSON export
- [ ] Decide how players get the map
- [ ] Remove or hide origin tags if wanted
- [ ] Test on computer and phone; test session with one player; fix findings
- **Test:** data stays correct after closing and reopening.

## Risks

| Risk | Corrective action |
|---|---|
| Large range of scale (~10^13) | Floating origin, logarithmic depth buffer, units per level (ly / AU / km). Test first in Phase 2. |
| Too many objects | Instancing; less detail at a distance. |
| Special regions need volume effects | Simple glow or particle cloud first. |
| 45 faction colors | One layer at a time (<15 factions each); stripes and labels. |
| Invented data volume | Inner regions first; less detail at the frontier. |
| Large code files | Small files: data, views, interface, storage. |
| Data in several places | One Zustand store. |
| Planet surfaces | Textured sphere with clouds and atmosphere. |
| Data loss | Export JSON after each session; keep it in Git. |

## Open items

- [ ] How players get the map: sent file, hosted page, or live data (deferred to Phase 5)
- [x] Target number of unmapped stars: 40, about 148 stars in all (D11)

## Out of scope for the first release

- Flyable terrain
- Full volume effects for nebula and dust cloud
- Full local lanes (show a few in region view)
- Lane drift animation
- Route planning and travel-time calculation
- Drag-to-move positions in 3D (edit the JSON)
- Ship-level combat or tactical maps
