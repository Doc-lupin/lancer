"""Validate the map data file against the schema and the data rules.

Usage: python3 tools/validate_map.py [map.json] [--complete] [--quiet]

Default file: data/map.json. Needs the jsonschema package (dev only).

Without --complete: checks the schema, unique ids, that every reference
resolves, names and "(WIP)", parent/child consistency and layer sizes.
Data that is only missing (no systems yet, no colors yet) is a warning.

With --complete: the Phase 1 exit test. Missing data becomes an error:
every region has a system, every lane end is a system, every faction has
a color, every region position is locked, every orbiting body has an orbit,
every planet, moon and giant has a world type and habitability.
Regions in the "beyond" arm (the Quiet) are exempt from the first two.

Each message reads: LEVEL [code] where: text. Exit status 1 on any error.
"""
import json, math, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "data/schema/map.schema.json"
DEFAULT_MAP = ROOT / "data/map.json"

ARRAYS = ["layers", "alignments", "factions", "feuds", "regions", "systems", "bodies",
          "places", "areas", "lanes", "units", "textBoxes", "headlines"]
NAMED = [a for a in ARRAYS if a not in ("textBoxes", "headlines")]
NO_SURFACE = {"star", "gas-giant", "asteroid-belt", "field", "lane-mouth"}
WORLD_BODIES = {"planet", "gas-giant", "moon", "rogue-planet", "asteroid"}
# Airless world types: climate text for cool, cold, temperate and warm describes seasons and weather.
AIRLESS = {"barren", "iron", "moonlet", "dwarf-planet", "shattered", "pulsar-world", "diamond", "chthonian", "carbon",
           "crystalline", "comet", "ice"}
CATALOG = ROOT / "data/schema/worlds.json"
LAYER_MAX = 15
WIP = " (WIP)"


class Report:
    def __init__(self):
        self.errors, self.warnings = [], []

    def error(self, code, where, text):
        self.errors.append(f"ERROR [{code}] {where}: {text}")

    def warn(self, code, where, text):
        self.warnings.append(f"WARN  [{code}] {where}: {text}")

    def issue(self, strict, code, where, text):
        (self.error if strict else self.warn)(code, where, text)


def check_schema(m, r):
    try:
        from jsonschema import Draft202012Validator
    except ImportError:
        r.error("setup", "jsonschema", "package not installed (pip install jsonschema)")
        return False
    v = Draft202012Validator(json.loads(SCHEMA.read_text()))
    errs = sorted(v.iter_errors(m), key=lambda e: list(e.absolute_path))
    for e in errs:
        path = "/".join(str(p) for p in e.absolute_path) or "(top)"
        r.error("schema", path, e.message[:300])
    return not errs


def index(m, r):
    """Map every id to (array name, object). Reports duplicates."""
    ids = {}
    everything = [("basin", m["basin"])] + [(a, o) for a in ARRAYS for o in m.get(a, [])]
    for arr, o in everything:
        i = o["id"]
        if i in ids:
            r.error("dup-id", f"{arr}/{i}", f"id also used in {ids[i][0]}")
        else:
            ids[i] = (arr, o)
    return ids


def check_refs(m, ids, r):
    def ref(where, value, *arrays):
        if value is None:
            return None
        hit = ids.get(value)
        if hit is None or hit[0] not in arrays:
            r.error("ref", where, f"'{value}' is not a known {' or '.join(arrays)} id")
            return None
        return hit[1]

    def control_and_presence(where, o):
        for h in o.get("control", {}).get("holders", []):
            ref(f"{where}.control", h, "factions")
        for p in o.get("presence", []):
            ref(f"{where}.presence", p["faction"], "factions")

    for f in m["factions"]:
        w = f"factions/{f['id']}"
        for l in f["layers"]:
            ref(w + ".layers", l, "layers")
        ref(w + ".parent", f.get("parent"), "factions")
        ref(w + ".alignment", f.get("alignment"), "alignments")
        for s in f.get("seat", []):
            ref(w + ".seat", s, "regions")
    for fd in m.get("feuds", []):
        w = f"feuds/{fd['id']}"
        for side in fd["sides"]:
            for f in side:
                ref(w + ".sides", f, "factions")
        for x in fd.get("regions", []):
            ref(w + ".regions", x, "regions")
        for x in fd.get("lanes", []):
            ref(w + ".lanes", x, "lanes")
    for arr in ("regions", "systems", "bodies", "places", "areas", "lanes"):
        for o in m[arr]:
            control_and_presence(f"{arr}/{o['id']}", o)
    for s in m["systems"]:
        ref(f"systems/{s['id']}.region", s.get("region"), "regions")
    for b in m["bodies"]:
        ref(f"bodies/{b['id']}.system", b["system"], "systems")
        ref(f"bodies/{b['id']}.parent", b.get("parent"), "bodies")
    for arr in ("places", "areas"):
        for o in m[arr]:
            ref(f"{arr}/{o['id']}.body", o["body"], "bodies")
    for u in m["units"]:
        w = f"units/{u['id']}"
        ref(w + ".faction", u["faction"], "factions")
        locs = [("location", u["location"])] + [(f"orders[{n}].to", o["to"]) for n, o in enumerate(u.get("orders", [])) if "to" in o]
        for label, loc in locs:
            for k, v in loc.items():
                ref(f"{w}.{label}.{k}", v, k + "s" if k != "body" else "bodies")
        for n, o in enumerate(u.get("orders", [])):
            for l in o["lanes"]:
                ref(f"{w}.orders[{n}].lanes", l, "lanes")
    for t in m["textBoxes"]:
        if "object" in t["anchor"] and t["anchor"]["object"] not in ids:
            r.error("ref", f"textBoxes/{t['id']}.anchor", f"'{t['anchor']['object']}' is not a known id")
    for h in m["headlines"]:
        for x in h.get("about", []):
            if x not in ids:
                r.error("ref", f"headlines/{h['id']}.about", f"'{x}' is not a known id")


def check_names(m, r):
    for arr in NAMED:
        for o in m[arr]:
            named_origin = o.get("nameOrigin", o["origin"])
            w = f"{arr}/{o['id']}"
            if named_origin == "invented" and not o["name"].endswith(WIP):
                r.error("wip-name", w, f"invented name '{o['name']}' must end with '{WIP.strip()}'")
            if named_origin == "canon" and "(WIP)" in o["name"]:
                r.error("wip-name", w, f"canon name '{o['name']}' must not contain '(WIP)' (set nameOrigin: invented?)")


def check_hierarchy(m, ids, r, strict):
    systems = {s["id"]: s for s in m["systems"]}
    bodies = {b["id"]: b for b in m["bodies"]}
    regions = {x["id"]: x for x in m["regions"]}
    centers = set()

    for s in m["systems"]:
        w = f"systems/{s['id']}"
        if s.get("region") is None and s["charted"]:
            r.warn("unmapped", w, "has no region but is marked charted")
        c = s["center"]
        if "body" in c:
            b = bodies.get(c["body"])
            if b is None:
                r.error("ref", w + ".center.body", f"'{c['body']}' is not a known bodies id")
            else:
                centers.add(b["id"])
                if b["system"] != s["id"]:
                    r.error("center", w, f"center body '{b['id']}' belongs to system '{b['system']}'")
                if b["type"] != c["type"]:
                    r.error("center", w, f"center type '{c['type']}' but body '{b['id']}' is a {b['type']}")
                if "orbit" in b or "parent" in b:
                    r.error("center", w, f"center body '{b['id']}' must have no orbit and no parent")

    for b in m["bodies"]:
        w = f"bodies/{b['id']}"
        p = bodies.get(b.get("parent"))
        if p is not None and p["system"] != b["system"]:
            r.error("parent", w, f"parent '{p['id']}' is in system '{p['system']}', not '{b['system']}'")
        seen, cur = set(), b
        while cur is not None and cur.get("parent"):
            if cur["id"] in seen:
                r.error("parent", w, "parent chain loops")
                break
            seen.add(cur["id"])
            cur = bodies.get(cur["parent"])
        if b["type"] == "moon" and "parent" not in b:
            r.error("parent", w, "a moon needs a parent body")
        if b["id"] not in centers and b["type"] != "rogue-planet" and "orbit" not in b:
            r.issue(strict, "orbit", w, "no orbit (needed for the clock to place it)")
        o = b.get("orbit")
        if o and o["unit"] == "au" and p is not None and p["type"] not in ("star",):
            r.warn("orbit", w, "orbits a body other than a star but uses AU; moons and stations usually use km")
        if b["visibility"] == "all":
            sys_ = systems.get(b["system"])
            if (p and p["visibility"] == "gm") or (sys_ and sys_["visibility"] == "gm"):
                r.warn("visibility", w, "visible to players inside a GM-only parent")

    for arr in ("places", "areas"):
        for o in m[arr]:
            b = bodies.get(o["body"])
            if b is not None and b["type"] in NO_SURFACE:
                r.error("surface", f"{arr}/{o['id']}", f"'{b['id']}' is a {b['type']}, which has no surface")

    for reg in m["regions"]:
        w = f"regions/{reg['id']}"
        has = any(s.get("region") == reg["id"] for s in m["systems"])
        if not has and reg["arm"] != "beyond":
            r.issue(strict, "empty-region", w, "has no system (star or special object)")
        if not reg.get("locked"):
            r.issue(strict, "unlocked", w, "position not locked (hand-adjust, then set locked: true)")
        radius = m["basin"].get("diameterLy", 50) / 2
        if reg["arm"] != "beyond" and math.dist(reg["pos"], (0, 0, 0)) > radius:
            r.warn("outside", w, f"center is more than {radius} ly from the origin")

    for l in m["lanes"]:
        w = f"lanes/{l['id']}"
        for side in ("from", "to"):
            end = l[side]
            reg = regions.get(end["region"])
            if reg is None:
                r.error("ref", f"{w}.{side}.region", f"'{end['region']}' is not a known regions id")
                continue
            s = systems.get(end.get("system"))
            if "system" in end and s is None:
                r.error("ref", f"{w}.{side}.system", f"'{end['system']}' is not a known systems id")
            elif s is not None and s.get("region") != reg["id"]:
                r.error("lane-end", f"{w}.{side}", f"system '{s['id']}' is in region '{s.get('region')}', not '{reg['id']}'")
            elif s is None and reg["arm"] != "beyond":
                r.issue(strict, "lane-end", f"{w}.{side}", "lane end not attached to a system")
            if "mouth" in end:
                mb = bodies.get(end["mouth"])
                if "system" not in end:
                    r.error("lane-end", f"{w}.{side}.mouth", "a mouth needs the lane end's system too")
                elif mb is None:
                    r.error("ref", f"{w}.{side}.mouth", f"'{end['mouth']}' is not a known bodies id")
                elif mb["type"] != "lane-mouth" or mb["system"] != end["system"]:
                    r.error("lane-end", f"{w}.{side}.mouth", f"'{mb['id']}' must be a lane-mouth in system '{end['system']}'")
        if l["days"] is None and not l["silent"]:
            r.warn("days", w, "lane time unknown on a lane that is not silent")
        rng = l.get("daysRange")
        if rng and (rng[0] > rng[1] or (l["days"] is not None and not rng[0] <= l["days"] <= rng[1])):
            r.error("days", w, f"days {l['days']} outside daysRange {rng}")
        if l["from"]["region"] == l["to"]["region"] and l.get("scope", "primary") == "primary":
            r.warn("lane-end", w, "primary lane with both ends in one region")

    for u in m["units"]:
        for n, o in enumerate(u.get("orders", [])):
            lanes = [x for x in (ids.get(i) for i in o["lanes"]) if x and x[0] == "lanes"]
            for a, b in zip(lanes, lanes[1:]):
                ra = {a[1]["from"]["region"], a[1]["to"]["region"]}
                rb = {b[1]["from"]["region"], b[1]["to"]["region"]}
                if not ra & rb:
                    r.error("route", f"units/{u['id']}.orders[{n}]", f"lanes '{a[1]['id']}' and '{b[1]['id']}' do not meet")


def world_catalog():
    """Families, usual habitability, variants and feature rules from data/schema/worlds.json."""
    cat = json.loads(CATALOG.read_text())
    family = {t["id"]: t["family"] for t in cat["types"]}
    usual = {f["id"]: set(f["habitability"]) for f in cat["families"]}
    variants = {t["id"]: {v["id"] for v in t["variants"]} for t in cat["types"]}
    features = {f["id"]: {"excludes": set(f.get("excludes", [])), "bodies": f.get("bodies") or g.get("bodies")}
                for g in cat["featureGroups"] for f in g["features"]}
    return family, usual, variants, features


def check_worlds(m, r, strict):
    family, usual, variants, features = world_catalog()
    for b in m["bodies"]:
        w = f"bodies/{b['id']}"
        t, hab = b.get("world"), b.get("habitability")
        if b["type"] not in WORLD_BODIES:
            for k in ("world", "variant", "habitability", "climate", "worldFeatures"):
                if k in b:
                    r.error("world", w, f"a {b['type']} cannot have '{k}'")
            continue
        if t is None or hab is None:
            r.issue(strict, "world", w, "no world type or habitability (see docs/WORLDS.md)")
        fam = family.get(t)
        if fam is not None:
            if (fam == "giant") != (b["type"] == "gas-giant"):
                r.error("world", w, f"world type '{t}' ({fam}) does not fit a body of type {b['type']}")
            if b["type"] == "asteroid" and fam != "small":
                r.error("world", w, f"an asteroid needs a small-body world type, not '{t}'")
            if hab is not None and hab not in usual[fam]:
                r.warn("world", w, f"habitability '{hab}' is unusual for a {fam} world ('{t}')")
        if t in AIRLESS and b.get("climate") in ("cool", "cold", "temperate", "warm"):
            r.warn("world", w, f"climate '{b['climate']}' describes weather; an airless {t} world reads better as frozen, hot or scorching")
        v = b.get("variant")
        if v is not None and (t is None or v not in variants.get(t, set())):
            r.error("world", w, f"variant '{v}' is not a variant of world type '{t}' (see docs/WORLDS.md)")
        for f in b.get("worldFeatures", []):
            info = features.get(f)
            if info is None:
                continue
            clash = [x for x in info["excludes"] if x in b.get("worldFeatures", []) and x > f]
            for x in clash:
                r.error("world", w, f"features '{f}' and '{x}' exclude each other")
            if info["bodies"] and b["type"] not in info["bodies"]:
                r.warn("world", w, f"feature '{f}' is meant for {', '.join(info['bodies'])}, not a {b['type']}")
        st, pr = b.get("stats"), b.get("profile")
        if st is None or pr is None:
            r.issue(strict, "datablock", w, "no stats or profile (run tools/build_map.py)")
        elif hab == "garden" and not -10 <= st.get("tempMeanC", 0) <= 32:
            r.error("datablock", w, f"a garden world at a mean of {st['tempMeanC']} °C")
        elif st.get("gravityG") and st.get("sizeClass") == "Earth-sized" and not 0.5 <= st["gravityG"] <= 2:
            r.warn("datablock", w, f"Earth-sized but {st['gravityG']} g")
        if hab == "none" and b["type"] != "gas-giant":
            r.error("world", w, "habitability 'none' is for gas giants; a solid world is at least 'lethal'")


def check_population(m, r, strict):
    pops = [b.get("profile", {}).get("population", 0) for b in m["bodies"]]
    total = sum(pops)
    full_basin = len(m["systems"]) > 100  # the population rule describes the whole Basin, not samples
    if full_basin and any(b.get("profile") for b in m["bodies"]) and strict and not 1100000 <= total <= 1300000:
        r.error("datablock", "bodies", f"awake population totals {total:,}; the setting says nearly 1.2 million")
    for b in m["bodies"]:
        if b["type"] == "station" and "profile" not in b:
            r.issue(strict, "datablock", f"bodies/{b['id']}", "station without a profile (run tools/build_map.py)")


LATTICE_RANK = ["none", "trace", "small", "moderate", "rich", "very rich", "exceptional"]


def check_datablock_consistency(m, r):
    """The datablock reads as a public register: no hidden names, and trade that agrees with itself."""
    hidden = {o["name"] for k in ("bodies", "places", "areas") for o in m[k] if o.get("visibility") == "gm"}
    for b in m["bodies"]:
        pr = b.get("profile")
        if not pr:
            continue
        w = f"bodies/{b['id']}"
        if b.get("visibility") != "gm":
            text = json.dumps(pr, ensure_ascii=False) + json.dumps(b.get("stats", {}), ensure_ascii=False)
            for n in hidden:
                if f'"{n}"' in text or f"{n} (" in text or f"{n}," in text:
                    r.error("datablock", w, f"names the GM-only object '{n}'")
        eco = pr.get("economy")
        if not eco:
            continue
        rating = pr.get("lattice", {}).get("rating", "none")
        rk = LATTICE_RANK.index(rating) if rating in LATTICE_RANK else -1
        markets = {"marrow", "sable-harbor-port", "halvards-rest"}
        for x in eco["exports"]:
            if x.get("class") == "lattice" and b["type"] != "station" and b["id"] not in markets and rk < 2:
                r.error("datablock", w, f"exports lattice with a '{rating}' rating")
            if x.get("class") == "lattice" and rk == 2 and any(t in ("the Assay House (the Marrow)", "Sable Harbor") for t in x["to"]):
                r.error("datablock", w, "a small lattice rating supplies local printers only")
        if pr["authority"].startswith("contested") and pr["claims"].startswith("held by"):
            r.error("datablock", w, "contested world whose claims read as held")
        classes_in = {i.get("class") for i in eco["imports"]}
        if eco.get("food") and eco["food"].startswith("self-sufficient") and "food" in classes_in:
            r.error("datablock", w, "self-sufficient in food but imports it")
        if not pr.get("population") and eco["exports"] and b["type"] != "station":
            r.warn("datablock", w, "uninhabited world with exports")


def check_factions_and_clock(m, r, strict):
    by_layer = {}
    for f in m["factions"]:
        for l in f["layers"]:
            by_layer.setdefault(l, []).append(f)
        if "color" not in f:
            r.issue(strict, "color", f"factions/{f['id']}", "no color")
    for l, fs in by_layer.items():
        if len(fs) > LAYER_MAX:
            r.error("layer-size", f"layers/{l}", f"{len(fs)} factions; at most {LAYER_MAX} per layer")
        colors = {}
        for f in fs:
            c = f.get("color", "").lower()
            if c and c in colors:
                r.error("color", f"layers/{l}", f"'{f['id']}' and '{colors[c]}' share color {c}")
            colors.setdefault(c, f["id"])
    for l in m["layers"]:
        if l["id"] not in by_layer:
            r.warn("layer-size", f"layers/{l['id']}", "layer has no factions")

    c = m["clock"]
    t = c["lanternTide"]
    if t["openDays"] > t["cycleDays"]:
        r.error("clock", "clock.lanternTide", "openDays is longer than cycleDays")
    if t["anchor"]["cycleDay"] > t["cycleDays"]:
        r.error("clock", "clock.lanternTide.anchor", "cycleDay is past the end of the cycle")
    for l in m["lanes"]:
        cu = l.get("tidal", {}).get("custom")
        if cu and (cu["openDays"] > cu["cycleDays"] or cu["anchor"]["cycleDay"] > cu["cycleDays"]):
            r.error("clock", f"lanes/{l['id']}.tidal", "custom cycle: openDays or anchor cycleDay past cycleDays")


def validate(m, strict=False):
    r = Report()
    if not check_schema(m, r):
        return r  # the other checks assume the shape is right
    ids = index(m, r)
    check_refs(m, ids, r)
    check_names(m, r)
    check_hierarchy(m, ids, r, strict)
    check_worlds(m, r, strict)
    check_population(m, r, strict)
    check_datablock_consistency(m, r)
    check_factions_and_clock(m, r, strict)
    return r


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    path = Path(args[0]) if args else DEFAULT_MAP
    strict, quiet = "--complete" in argv, "--quiet" in argv
    try:
        m = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as e:
        print(f"ERROR [load] {path}: {e}")
        return 1
    r = validate(m, strict)
    for line in r.errors + ([] if quiet else r.warnings):
        print(line)
    mode = "complete (Phase 1 test)" if strict else "structure"
    print(f"{path.name}: {mode} check, {len(r.errors)} errors, {len(r.warnings)} warnings")
    return 1 if r.errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
