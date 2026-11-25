"""Write the world-type catalog in docs/WORLDS.md from the schema.

Usage: python3 tools/world_catalog.py [--check]

The schema ($defs.worldType, habitability, climate, worldFeature) is the
only source. This rewrites the part of docs/WORLDS.md between the catalog
markers. --check exits 1 if the file is out of date instead of writing.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "data/schema/map.schema.json"
DOC = ROOT / "docs/WORLDS.md"
START, END = "<!-- catalog:start -->", "<!-- catalog:end -->"
TITLES = {
    "habitable-wet": "Habitable: wet", "habitable-dry": "Habitable: dry", "habitable-cold": "Habitable: cold",
    "habitable-special": "Habitable: special", "marginal": "Marginal (semi-habitable)", "rocky": "Hostile rock",
    "icy": "Ice", "giant": "Giants", "small": "Small bodies",
}


def render():
    defs = json.loads(SCHEMA.read_text())["$defs"]
    out, fam = [START, "", "Generated from the schema by `tools/world_catalog.py`. Edit the schema, then rerun."], None
    for d in defs["worldType"]["oneOf"]:
        if d["title"] != fam:
            fam = d["title"]
            out += ["", f"### {TITLES.get(fam, fam)} (`{fam}`)", "", "| Type | What it is |", "|---|---|"]
        out.append(f"| `{d['const']}` | {d['description']} |")
    out += ["", f"**Climate:** {', '.join(defs['climate']['enum'])}.", "",
            f"**World features:** {', '.join(defs['worldFeature']['enum'])}.", "", END]
    return "\n".join(out)


def main(argv):
    doc = DOC.read_text()
    a, b = doc.index(START), doc.index(END) + len(END)
    new = doc[:a] + render() + doc[b:]
    if "--check" in argv:
        if new != doc:
            print("docs/WORLDS.md is out of date: run python3 tools/world_catalog.py")
            return 1
        print("docs/WORLDS.md catalog is up to date")
        return 0
    DOC.write_text(new)
    print("wrote docs/WORLDS.md catalog")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
