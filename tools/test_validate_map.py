"""Tests for validate_map.py. Run: python3 tools/test_validate_map.py

The example map (data/schema/example.json) must pass the complete check.
Each broken copy must fail with the expected error code.
"""
import copy, json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_map import ROOT, validate  # noqa: E402

EXAMPLE = json.loads((ROOT / "data/schema/example.json").read_text())


def find(m, arr, i):
    return next(o for o in m[arr] if o["id"] == i)


def add_quiet(m):
    m["regions"].append({"id": "quiet", "name": "The Quiet", "arm": "beyond", "frontier": True, "pos": [6, 1, -31],
                         "locked": True, "effect": "none", "control": {"status": "unknown"}, "origin": "canon", "visibility": "all"})
    m["lanes"].append({"id": "silent-mouth-1", "name": "Silent Mouth 1 (WIP)", "nameOrigin": "invented",
                       "from": {"region": "quiet"}, "to": {"region": "ostrom", "system": "ostrom-system"},
                       "days": None, "drifting": False, "oneWay": True, "silent": True, "tidal": {"cycle": "unknown"},
                       "origin": "canon", "visibility": "all"})


def many_factions(m):
    for n in range(15):
        m["factions"].append({"id": f"extra-{n}", "name": f"Extra {n} (WIP)", "category": "government",
                              "layers": ["governments"], "origin": "invented", "visibility": "all"})


# (name, change, strict, expected error code or None for "must pass")
CASES = [
    ("example passes structure check", lambda m: None, False, None),
    ("example passes complete check", lambda m: None, True, None),
    ("the Quiet is exempt from systems", add_quiet, True, None),
    ("schema: unknown field", lambda m: find(m, "bodies", "scald-planet").update(radiusKM=1), False, "schema"),
    ("schema: missing origin", lambda m: find(m, "regions", "ostrom").pop("origin"), False, "schema"),
    ("duplicate id", lambda m: find(m, "places", "kerrtown").update(id="scald-planet"), False, "dup-id"),
    ("control holder unknown", lambda m: find(m, "regions", "scald")["control"]["holders"].append("nobody"), False, "ref"),
    ("presence faction unknown", lambda m: find(m, "regions", "scald")["presence"].append({"faction": "ghosts"}), False, "ref"),
    ("faction layer unknown", lambda m: find(m, "factions", "kerr-varga").update(layers=["religions"]), False, "ref"),
    ("faction parent unknown", lambda m: find(m, "factions", "northern-concord").update(parent="glass"), False, "ref"),
    ("feud lane unknown", lambda m: m["feuds"][0].update(lanes=["scald-tarn"]), False, "ref"),
    ("system region unknown", lambda m: find(m, "systems", "cinder-system").update(region="tallis"), False, "ref"),
    ("body system unknown", lambda m: find(m, "bodies", "gate").update(system="gate-system"), False, "ref"),
    ("place on unknown body", lambda m: find(m, "places", "kerrtown").update(body="scald-prime"), False, "ref"),
    ("unit location unknown", lambda m: m["units"][0].update(location={"place": "dry-creek"}), False, "ref"),
    ("order lane unknown", lambda m: m["units"][1]["orders"][0].update(lanes=["scald-ferrous"]), False, "ref"),
    ("text box anchor unknown", lambda m: m["textBoxes"][0].update(anchor={"object": "nowhere"}), False, "ref"),
    ("headline about unknown", lambda m: m["headlines"][0].update(about=["tallis"]), False, "ref"),
    ("invented name without WIP", lambda m: find(m, "bodies", "scald-ii").update(name="Scald II"), False, "wip-name"),
    ("canon name with WIP", lambda m: find(m, "places", "kerrtown").update(name="Kerrtown (WIP)"), False, "wip-name"),
    ("invented nameOrigin without WIP", lambda m: find(m, "areas", "scald-north").update(name="Concord fields"), False, "wip-name"),
    ("center body in other system", lambda m: (m["bodies"].append({"id": "wreck-1", "name": "Wreck (WIP)", "system": "cinder-system", "type": "wreck", "origin": "invented", "visibility": "all"}),
                                              find(m, "systems", "scald-system").update(center={"type": "wreck", "body": "wreck-1"})), False, "center"),
    ("center type mismatch", lambda m: (find(m, "bodies", "gate").pop("orbit"), find(m, "systems", "ostrom-system").update(center={"type": "wreck", "body": "gate"})), False, "center"),
    ("parent in other system", lambda m: find(m, "bodies", "scald-ii").update(parent="ostrom-iv"), False, "parent"),
    ("parent loop", lambda m: (find(m, "bodies", "scald-planet").update(parent="scald-ii")), False, "parent"),
    ("moon without parent", lambda m: find(m, "bodies", "scald-ii").pop("parent"), False, "parent"),
    ("place on a lane mouth", lambda m: find(m, "places", "kerrtown").update(body="ostrom-scald-at-scald"), False, "surface"),
    ("lane end system in wrong region", lambda m: m["lanes"][0]["from"].update(system="scald-system", mouth="ostrom-scald-at-scald"), False, "lane-end"),
    ("mouth not a lane-mouth", lambda m: m["lanes"][0]["to"].update(mouth="scald-planet"), False, "lane-end"),
    ("mouth without system", lambda m: m["lanes"][0]["to"].pop("system"), False, "lane-end"),
    ("days outside range", lambda m: m["lanes"][0].update(daysRange=[5, 8]), False, "days"),
    ("too many factions in a layer", many_factions, False, "layer-size"),
    ("two factions share a color", lambda m: find(m, "factions", "southern-league").update(color="#3AA39A"), False, "color"),
    ("tidal anchor past cycle", lambda m: m["clock"]["lanternTide"]["anchor"].update(cycleDay=80), False, "clock"),
    ("route lanes do not meet", lambda m: (m["lanes"].append({"id": "far-lane", "name": "Far lane (WIP)", "from": {"region": "far-a"}, "to": {"region": "far-b"}, "days": 2, "drifting": False, "oneWay": False, "silent": False, "origin": "invented", "visibility": "all"}),
                                           m["units"][1]["orders"][0]["lanes"].append("far-lane")), False, "route"),
    ("complete: region without system", lambda m: [m["systems"].remove(s) for s in list(m["systems"]) if s["region"] == "scald"] and None, True, "empty-region"),
    ("complete: lane end not attached", lambda m: m["lanes"][0]["to"].clear() or m["lanes"][0]["to"].update(region="scald"), True, "lane-end"),
    ("complete: faction without color", lambda m: find(m, "factions", "kerr-varga").pop("color"), True, "color"),
    ("complete: unlocked region", lambda m: find(m, "regions", "scald").update(locked=False), True, "unlocked"),
    ("complete: body without orbit", lambda m: find(m, "bodies", "scald-planet").pop("orbit"), True, "orbit"),
    ("giant world type on a planet", lambda m: find(m, "bodies", "scald-planet").update(world="cold-giant", habitability="none"), False, "world"),
    ("rock world type on a gas giant", lambda m: m["bodies"].append({"id": "scald-v", "name": "Scald V (WIP)", "system": "scald-system", "type": "gas-giant", "world": "barren", "habitability": "lethal", "orbit": {"distance": 5, "unit": "au", "periodDays": 3000, "phaseDeg": 0}, "origin": "invented", "visibility": "all"}), False, "world"),
    ("habitability none on a solid world", lambda m: find(m, "bodies", "scald-ii").update(habitability="none"), False, "world"),
    ("world type on a station", lambda m: find(m, "bodies", "marrow").update(world="barren"), False, "world"),
    ("schema: unknown world type", lambda m: find(m, "bodies", "scald-planet").update(world="jungle-planet"), False, "schema"),
    ("complete: world without type", lambda m: find(m, "bodies", "scald-planet").pop("world"), True, "world"),
    ("variant of another world type", lambda m: find(m, "bodies", "scald-planet").update(variant="river-valley"), False, "world"),
    ("variant without a world type", lambda m: find(m, "bodies", "ostrom-iv").pop("world") and find(m, "bodies", "ostrom-iv").update(variant="cold"), False, "world"),
    ("features that exclude each other", lambda m: find(m, "bodies", "scald-planet").update(worldFeatures=["moonless", "many-moons"]), False, "world"),
    ("moon-only feature on a planet warns only", lambda m: find(m, "bodies", "scald-planet").update(worldFeatures=["dominant-parent"]), False, None),
    ("complete: world without a datablock", lambda m: find(m, "bodies", "scald-planet").pop("stats"), True, "datablock"),
    ("garden world far too hot", lambda m: find(m, "bodies", "scald-planet").update(habitability="garden", stats={**find(m, "bodies", "scald-planet")["stats"], "tempMeanC": 90}), False, "datablock"),
    ("schema: bad breathability", lambda m: find(m, "bodies", "scald-planet")["stats"].update(breathability="fine"), False, "schema"),
    ("schema: unknown profile field", lambda m: find(m, "bodies", "scald-planet")["profile"].update(mood="tense"), False, "schema"),
    ("structure check only warns on missing data", lambda m: find(m, "factions", "kerr-varga").pop("color"), False, None),
]


def main():
    failed = 0
    for name, change, strict, code in CASES:
        m = copy.deepcopy(EXAMPLE)
        change(m)
        r = validate(m, strict)
        codes = {e.split("[", 1)[1].split("]", 1)[0] for e in r.errors}
        ok = (not r.errors) if code is None else (code in codes)
        if not ok:
            failed += 1
            print(f"FAIL {name}: expected {code or 'no errors'}, got {sorted(codes) or 'no errors'}")
            for e in r.errors[:5]:
                print("     " + e)
    import world_catalog
    if world_catalog.render() not in world_catalog.DOC.read_text():
        failed += 1
        print("FAIL docs/WORLDS.md catalog is out of date: run python3 tools/world_catalog.py")
    import describe_world
    for problem in describe_world.check(world_catalog.load()):
        failed += 1
        print(f"FAIL template: {problem}")
    for k in world_catalog.schema_mismatches():
        failed += 1
        print(f"FAIL schema $defs.{k} enum differs from data/schema/worlds.json")
    print(f"{len(CASES) - failed}/{len(CASES)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
