"""Assemble data/map.json from the parsed extracts and the authored files.

Usage: python3 tools/build_map.py [--out PATH] [--no-check]

Inputs (all paths under data/):
  parsed/regions.json, lanes.json, factions.json, reference.json, positions.json
      Source extracts. Converted to the schema here.
  src/factions.json     Layers, the category-to-layer map, faction edits.
  src/lanes.json        Lane edits and new lanes ("lanes": [...]).
  src/regions/<id>.json One file per region: "region" (edits to the region),
                        "systems", "bodies", "places", "areas".
  src/unmapped.json     Unmapped stars: "systems", "bodies".
  src/clock.json        Replaces the clock built from reference.json.
  src/content.json      "units", "textBoxes", "headlines".
In a region file a system may give "offset" (light-years from the region
center) instead of "pos"; the build turns it into an absolute "pos", so
the stars move with the region when its center is hand-adjusted.
All src files are optional. An edit is merged into the object with the
same id, field by field; a field set to null is removed. An entry with a
new id is added.

During Phase 1, data/map.json is generated: edit the inputs, not the
output. After Phase 1 it becomes the only source (decision D5).
The result is checked with tools/validate_map.py (structure mode).
"""
import json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_map import validate  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PARSED = ROOT / "data/parsed"
SRC = ROOT / "data/src"
OUT = ROOT / "data/map.json"
CANON = {"origin": "canon", "visibility": "all"}

# Region effects named in the plan (Furnace nebula, Mire dust cloud).
EFFECTS = {"furnace": "nebula", "mire": "dust-cloud"}

# Regions the Factions doc marks "Contested" without naming a holder.
# Contenders come from the canon feuds and region text; review in task 1.12.
CONTENDERS = {
    "tarn": (["basin-office", "smith-shimano", "ringwreckers"], "The Tarn yards feud"),
    "cairn": (["kerr-varga", "charter-bench"], "Cairn feud over the native-life protections"),
    "shoals": (["purview", "seventh"], "Purview prospecting against the Seventh"),
}
SILENT_MOUTHS = 3


def load(path, default=None):
    if not path.exists():
        if default is None:
            sys.exit(f"missing input: {path.relative_to(ROOT)}")
        return default
    return json.loads(path.read_text())


def merge(base, edits, label):
    """Merge edit objects into a list of objects by id. Returns the new list."""
    out = {o["id"]: o for o in base}
    order = [o["id"] for o in base]
    for e in edits:
        if "id" not in e:
            sys.exit(f"{label}: entry without id: {e}")
        if e["id"] in out:
            obj = out[e["id"]]
            for k, v in e.items():
                if v is None:
                    obj.pop(k, None)
                else:
                    obj[k] = v
        else:
            out[e["id"]] = {k: v for k, v in e.items() if v is not None}
            order.append(e["id"])
    return [out[i] for i in order]


def slug(text):
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return re.sub(r"^the-", "", s)


def clean(o, keep=("days",)):
    """Drop empty strings, empty lists and nulls, except fields where null has a meaning."""
    return {k: v for k, v in o.items() if k in keep or v not in ("", [], None)}


def build_regions(parsed, positions):
    out = []
    for r in parsed:
        held, also = r.get("heldBy", []), r.get("alsoPresent", [])
        if r["id"] in CONTENDERS:
            holders, note = CONTENDERS[r["id"]]
            control = {"status": "contested", "holders": holders, "note": note}
        elif held:
            control = {"status": "contested" if r.get("contested") else "held", "holders": held}
            if r.get("heldNote"):
                control["note"] = r["heldNote"]
        elif r["arm"] == "beyond":
            control = {"status": "unknown"}
        else:
            control = {"status": "none"}
        p = positions[r["id"]]
        out.append(clean({
            "id": r["id"], "name": r["name"], **CANON,
            "arm": r["arm"], "frontier": r["frontier"], "label": r.get("label"),
            "chartPos": r.get("chartPos"), "pos": p["pos"], "locked": p.get("locked", False),
            "effect": EFFECTS.get(r["id"], "none"),
            "lattice": clean(r["lattice"]) if r.get("lattice") else None,
            "control": control,
            "presence": [{"faction": f} for f in also if f not in control.get("holders", [])],
            "notes": r.get("notes"),
        }))
    return out


def check_stars(regions):
    """Every star listed in parsed/regions.json needs a schema star kind (used in task 1.7)."""
    defs = json.loads((ROOT / "data/schema/map.schema.json").read_text())["$defs"]
    kinds, feats = set(defs["starKind"]["enum"]), set(defs["starFeature"]["enum"])
    bad = [f"{r['id']}: {st['name']} ({st.get('kind')})" for r in regions for st in r.get("stars", [])
           if st.get("kind") not in kinds or st.get("kindOrigin", "canon") not in ("canon", "invented")
           or not set(st.get("features", [])) <= feats]
    if bad:
        sys.exit("parsed/regions.json: stars without a valid kind: " + "; ".join(bad))


def build_lanes(parsed, bypasses):
    held = {}
    for b in bypasses:
        h = b["heldBy"]
        if h is None:
            control = {"status": "none"}
        elif h.startswith("Contested"):
            control = {"status": "contested", "holders": ["synod", "purview"], "note": h}
        else:
            control = {"status": "held", "holders": [h]}
        for l in b["lanes"]:
            held[l] = (b["name"], control)
    names = {}
    out = []
    for l in parsed:
        t = l["type"]
        lane = {
            "id": l["id"], **CANON,
            "from": {"region": l["from"]}, "to": {"region": l["to"]},
            "scope": "primary", "days": l["days"], "daysRange": l.get("daysRange"),
            "drifting": t == "drifting", "oneWay": l["oneWay"], "silent": t == "silent",
        }
        if t == "tidal":
            lane["tidal"] = {"cycle": "lantern"}
        if l["id"] in held:
            lane["bypass"], lane["control"] = held[l["id"]]
        lane["notes"] = l.get("notes")
        if t == "silent":
            # Decision D2: one lane per Silent Mouth.
            for n in range(1, SILENT_MOUTHS + 1):
                out.append(clean({**lane, "id": f"silent-mouth-{n}", "name": f"Silent Mouth {n} (WIP)",
                                  "nameOrigin": "invented", "tidal": {"cycle": "unknown"}}))
            continue
        lane["name"] = l.get("name") or None  # filled below once region names are known
        names[l["id"]] = (l["from"], l["to"])
        out.append(lane)
    return out, names


def build_factions(parsed, src):
    by_cat = src["layerByCategory"]
    known = {a["id"] for a in parsed["alignments"]}
    factions = []
    for f in parsed["factions"]:
        align, note = f.get("alignment"), f.get("alignmentNote")
        if align is not None and align not in known:
            sys.exit(f"parsed/factions.json: {f['id']} has alignment '{align}', which is not in the alignments list")
        factions.append(clean({
            "id": f["id"], "name": f["name"], **CANON,
            "category": f["category"], "layers": [by_cat[f["category"]]],
            "parent": f.get("parent"), "seat": f.get("seat"), "seatDetail": f.get("seatDetail"),
            "alignment": align, "alignmentNote": note,
            "leaders": f.get("leaders"), "strength": f.get("strength"),
            "latticeAtHome": f.get("latticeAtHome"), "notes": f.get("notes"),
        }))
    factions = merge(factions, src.get("factions", []), "src/factions.json")
    alignments = [clean({"id": a["id"], "name": a["name"], **CANON, "notes": a.get("notes")})
                  for a in parsed["alignments"]]
    feuds = [clean({
        "id": "feud-" + slug(fd["name"]), "name": fd["name"], **CANON,
        "sides": fd["sides"], "over": fd.get("over"),
        "regions": fd.get("regions"), "lanes": fd.get("lanes"),
    }) for fd in parsed["feuds"]]
    return src["layers"], alignments, factions, feuds


def build_clock(ref):
    c = ref["clock"]
    start = {"year": c["start"]["year"], "day": c["start"]["day"]}
    return {
        "daysPerYear": 365,
        "basinYearOffset": 5017,
        "epoch": {"year": start["year"], "day": 1},
        "current": start,
        "lanternTide": {
            "cycleDays": ref["tidalCycleDays"],
            "openDays": ref["tidalOpenDays"],
            "anchor": {"date": start, "cycleDay": c["tidalCycleDayAtStart"]},
        },
    }


def build():
    regions_p = load(PARSED / "regions.json")["regions"]
    lanes_p = load(PARSED / "lanes.json")["lanes"]
    factions_p = load(PARSED / "factions.json")
    ref = load(PARSED / "reference.json")
    positions = load(PARSED / "positions.json")["regions"]
    src_f = load(SRC / "factions.json")

    check_stars(regions_p)
    regions = build_regions(regions_p, positions)
    lanes, pending_names = build_lanes(lanes_p, ref["bypasses"])
    layers, alignments, factions, feuds = build_factions(factions_p, src_f)

    systems, bodies, places, areas = [], [], [], []
    region_edits = []
    for f in sorted((SRC / "regions").glob("*.json")) if (SRC / "regions").exists() else []:
        d = load(f)
        if "region" in d:
            region_edits.append({"id": f.stem, **d["region"]})
        systems += d.get("systems", [])
        bodies += d.get("bodies", [])
        places += d.get("places", [])
        areas += d.get("areas", [])
    regions = merge(regions, region_edits, "src/regions")
    centers = {r["id"]: r["pos"] for r in regions}
    for st in systems:
        if "offset" in st:
            if "pos" in st or st.get("region") not in centers:
                sys.exit(f"src/regions: system {st['id']} needs a known region and offset or pos, not both")
            off = st.pop("offset")
            st["pos"] = [round(c + o, 3) for c, o in zip(centers[st["region"]], off)]
    unmapped = load(SRC / "unmapped.json", {})
    systems += unmapped.get("systems", [])
    bodies += unmapped.get("bodies", [])

    rname = {r["id"]: r["name"] for r in regions}
    for lane in lanes:
        if lane["id"] in pending_names and not lane.get("name"):
            a, b = pending_names[lane["id"]]
            lane["name"] = f"{rname[a]} – {rname[b]}"
    lanes = [clean(l) for l in merge(lanes, load(SRC / "lanes.json", {}).get("lanes", []), "src/lanes.json")]

    content = load(SRC / "content.json", {})
    return {
        "$schema": "schema/map.schema.json",
        "_comment": "Generated by tools/build_map.py from data/parsed and data/src. "
                    "During Phase 1, edit those inputs, not this file.",
        "schemaVersion": 1,
        "basin": {"id": "basin", "name": "The Basin", **CANON,
                  "diameterLy": ref["scale"]["basinDiameterLy"],
                  "axes": "+x trailing, -x spinward, +y coreward, -y rimward, z depth; light-years; origin near Ostrom"},
        "clock": load(SRC / "clock.json", {}) or build_clock(ref),
        "layers": layers, "alignments": alignments, "factions": factions, "feuds": feuds,
        "regions": regions, "systems": systems, "bodies": bodies, "places": places, "areas": areas,
        "lanes": lanes,
        "units": content.get("units", []), "textBoxes": content.get("textBoxes", []),
        "headlines": content.get("headlines", []),
    }


FIRST = ("id", "name", "nameOrigin", "origin", "visibility")


def order_keys(m):
    """Put id, name and tags first in every listed object, so records read alike."""
    for k, v in m.items():
        if isinstance(v, list) and v and isinstance(v[0], dict):
            m[k] = [{**{f: o[f] for f in FIRST if f in o}, **{f: x for f, x in o.items() if f not in FIRST}} for o in v]
    return m


def dump(o, indent=0):
    """JSON with one object per line inside arrays and short lists kept inline."""
    pad = "  " * indent
    if isinstance(o, list) and all(not isinstance(x, (dict, list)) for x in o):
        return json.dumps(o, ensure_ascii=False)
    if isinstance(o, list):
        if not o:
            return "[]"
        return "[\n" + ",\n".join(pad + "  " + dump(x, indent + 1) for x in o) + "\n" + pad + "]"
    if isinstance(o, dict) and indent >= 2:
        return json.dumps(o, ensure_ascii=False)
    if isinstance(o, dict):
        items = [f'{pad}  {json.dumps(k)}: {dump(v, indent + 1)}' for k, v in o.items()]
        return "{\n" + ",\n".join(items) + "\n" + pad + "}"
    return json.dumps(o, ensure_ascii=False)


def main(argv):
    out = Path(argv[argv.index("--out") + 1]) if "--out" in argv else OUT
    m = order_keys(build())
    out.write_text(dump(m) + "\n")
    counts = ", ".join(f"{len(m[k])} {k}" for k in ("regions", "systems", "bodies", "lanes", "factions"))
    print(f"wrote {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}: {counts}")
    if "--no-check" in argv:
        return 0
    r = validate(m)
    for line in r.errors:
        print(line)
    codes = {}
    for w in r.warnings:
        code = w.split("[", 1)[1].split("]", 1)[0]
        codes[code] = codes.get(code, 0) + 1
    summary = ", ".join(f"{n} {c}" for c, n in sorted(codes.items()))
    print(f"check: {len(r.errors)} errors, {len(r.warnings)} warnings ({summary or 'none'})")
    if r.warnings:
        print("details: python3 tools/validate_map.py")
    return 1 if r.errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
