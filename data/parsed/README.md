# Parsed setting data

Extracted from the five Basin documents in `data/raw/source/`. These are source extracts for Phase 1, **not** the final schema or `map.json`.

| File | Contents |
|------|----------|
| `regions.json` | 24 regions (23 on the map + the Quiet): arm, frontier flag, chart label, 2D chart position, lattice, holders, stars, named bodies |
| `lanes.json` | 35 primary lanes: endpoints, days, type, one-way flag, bypass names |
| `factions.json` | 45 factions with seat, alignment, leaders, strength; the Returned NHPs; 11 feuds |
| `timeline.json` | Eras and year-by-year events 4961u–5029u, tagged with regions |
| `reference.json` | Directions, scale, arms, lane types, lattice scale, bypasses |

All IDs are kebab-case and cross-referenced (lanes → regions, regions → factions). A check confirmed every reference resolves.

## Gaps to settle before Phase 1

1. **No faction colors.** The plan needs a color for each faction.
2. **No 3D positions.** The docs say the Basin is a rough 50 ly sphere, but give only the 2D chart layout. `chartPos` is the box center in pixels on the official map image.
3. **Most stars and planets are unnamed.** Only key worlds are named (Tallis, Pennant, Gloam, Halvard's Rest, Choir, Bellows, Verdance, Stillwater, Ashlar, etc.). System and planet views will need placeholder or invented bodies, orbits and moons.
4. **History chronology is cut off.** The detailed chronology in the History doc stops after 5017u in the source file itself. Later years come from the narrative and the Primer's key dates table.
5. **Variable lanes.** The Sable Run is charted at 12 days but varies 10–15. The Quiet's lane time is unknown, and it is unclear whether it is tidal, silent or both.
