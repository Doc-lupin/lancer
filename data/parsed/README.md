# Parsed setting data

Extracted from the five Basin documents in `data/raw/source/`. These are source extracts for Phase 1, **not** the final schema or `map.json`.

| File | Contents |
|------|----------|
| `regions.json` | 24 regions (23 on the map + the Quiet): arm, frontier flag, chart label, 2D chart position, lattice, holders, stars, named bodies |
| `lanes.json` | 35 primary lanes: endpoints, days, type, one-way flag, bypass names |
| `factions.json` | 45 factions with seat, alignment, leaders, strength; the Returned NHPs; 11 feuds |
| `timeline.json` | Eras and year-by-year events 4961u–5029u, tagged with regions |
| `reference.json` | Directions, scale, arms, lane types, lattice scale, bypasses |
| `positions.json` | Generated 3D centers for each region, in light-years (first pass, for hand adjustment) |
| `positions_preview.svg` | Top, front and side views of the positions with lanes drawn |

## Positions

`tools/generate_positions.py [seed]` builds `positions.json` from the chart layout. Axes: +x trailing, +y coreward, z depth, origin near Ostrom. It keeps the 2D chart arrangement, adds depth (more for frontier regions, little for the crossroads), keeps everything inside a 25 ly radius and at least 3.5 ly apart. The Quiet sits outside the sphere.

To adjust by hand, edit a region's `pos` and set `"locked": true`. Re-running the generator (any seed) keeps locked values and only moves the rest. Run `tools/preview_positions.py` to redraw the preview.

Lane days are not tied to distance, as decided. A 1-day lane can span 7 ly and an 18-day lane 10 ly.

Stars inside each region are not placed yet. They come with the invented systems.

All IDs are kebab-case and cross-referenced (lanes → regions, regions → factions). A check confirmed every reference resolves.

## Gaps to settle before Phase 1

1. **No faction colors.** The plan needs a color for each faction.
2. **3D positions are generated, not canon.** The docs give only the 2D chart. Region centers are generated (see below); stars inside regions are still to do.
3. **Most stars and planets are unnamed.** Only key worlds are named (Tallis, Pennant, Gloam, Halvard's Rest, Choir, Bellows, Verdance, Stillwater, Ashlar, etc.). System and planet views will need placeholder or invented bodies, orbits and moons.
4. **History chronology is cut off.** The detailed chronology in the History doc stops after 5017u in the source file itself. Later years come from the narrative and the Primer's key dates table.
5. **Variable lanes.** The Sable Run is charted at 12 days but varies 10–15. The Quiet's lane time is unknown, and it is unclear whether it is tidal, silent or both.
