"""Write the world catalog in docs/WORLDS.md from data/schema/worlds.json.

Usage: python3 tools/world_catalog.py [--check]

data/schema/worlds.json is the only source for world types, variants,
features, habitability and climate. This rewrites the part of
docs/WORLDS.md between the catalog markers. --check exits 1 instead if
the doc is out of date or if the schema's id lists differ from the catalog.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "data/schema/worlds.json"
SCHEMA = ROOT / "data/schema/map.schema.json"
DOC = ROOT / "docs/WORLDS.md"
START, END = "<!-- catalog:start -->", "<!-- catalog:end -->"


def load():
    return json.loads(CATALOG.read_text())


def show(template):
    """Template text for the reference doc, with the world's name shown as [World]."""
    return re.sub(r"\{(World|world)('s)?\}", lambda m: "[" + m.group(1) + "]" + (m.group(2) or ""), template)


def render(cat=None):
    cat = cat or load()
    out = [START, "", "Generated from `data/schema/worlds.json` by `tools/world_catalog.py`. Edit that file, then rerun the tool.",
           "In the text below, [World] stands for the world's name, which `tools/describe_world.py` fills in.", ""]
    out += ["### Habitability", "", "| Value | Text |", "|---|---|"]
    out += [f"| `{h['id']}` | {show(h['description'])} |" for h in cat["habitability"]]
    out += ["", "### Climate", "", "| Value | Text |", "|---|---|"]
    out += [f"| `{c['id']}` | {show(c['description'])} |" for c in cat["climate"]]
    for fam in cat["families"]:
        out += ["", f"### {fam['name']} (`{fam['id']}`)", "", fam["description"],
                "", f"Usual habitability: {', '.join(fam['habitability'])}."]
        for t in (t for t in cat["types"] if t["family"] == fam["id"]):
            out += ["", f"#### {t['name']} (`{t['id']}`)", "", t["description"], "",
                    f"Opening: {show(t['entry'])}", "", "Variants:", ""]
            for v in t["variants"]:
                ex = f" *Example: {v['example']}*" if v.get("example") else ""
                out.append(f"- `{v['id']}`: {show(v['description'])}{ex}")
    out += ["", "### World features", "",
            "Features apply to any body unless a group or feature lists the bodies it suits. Excluded features cannot be recorded on the same world."]
    for g in cat["featureGroups"]:
        out += ["", f"#### {g['name']}", ""]
        if g.get("bodies"):
            out += [f"For {', '.join(g['bodies'])} only.", ""]
        out += ["| Feature | Text | Notes |", "|---|---|---|"]
        for f in g["features"]:
            notes = []
            if f.get("bodies"):
                notes.append("only on " + ", ".join(f["bodies"]))
            if f.get("excludes"):
                notes.append("excludes " + ", ".join(f"`{x}`" for x in f["excludes"]))
            if f.get("example"):
                notes.append("example: " + f["example"])
            out.append(f"| `{f['id']}` | {show(f['description'])} | {'; '.join(notes)} |")
    out += ["", END]
    return "\n".join(out)


def schema_mismatches(cat=None):
    cat = cat or load()
    defs = json.loads(SCHEMA.read_text())["$defs"]
    want = {
        "worldType": [t["id"] for t in cat["types"]],
        "habitability": [h["id"] for h in cat["habitability"]],
        "climate": [c["id"] for c in cat["climate"]],
        "worldFeature": [f["id"] for g in cat["featureGroups"] for f in g["features"]],
    }
    return [k for k, ids in want.items() if defs[k]["enum"] != ids]


def main(argv):
    cat = load()
    doc = DOC.read_text()
    a, b = doc.index(START), doc.index(END) + len(END)
    new = doc[:a] + render(cat) + doc[b:]
    bad = schema_mismatches(cat)
    if "--check" in argv:
        problems = (["docs/WORLDS.md is out of date: run python3 tools/world_catalog.py"] if new != doc else []) + \
                   [f"schema $defs.{k} enum differs from data/schema/worlds.json" for k in bad]
        print("\n".join(problems) or "catalog, schema and docs/WORLDS.md agree")
        return 1 if problems else 0
    DOC.write_text(new)
    print("wrote docs/WORLDS.md catalog" + (f"; schema enums differ: {', '.join(bad)}" if bad else ""))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
