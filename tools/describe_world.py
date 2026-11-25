"""Compose a world's description from the catalog (reference implementation).

Usage: python3 tools/describe_world.py [body-id ...] [--map PATH] [--check]

With body ids, prints the composed entry for each body in data/map.json.
With --check, renders every catalog template against sample names and
reports any template that leaves a placeholder unfilled.

Templates in data/schema/worlds.json refer to the world through four
placeholders: {World}, {world}, {World's}, {world's}. Within each block of
text the first reference becomes the world's name and later references a
noun for its body type ("the planet", "the moon", "the giant"), so that
the entry reads naturally. Names lose a trailing " (WIP)", and a leading
"The" is lowercased mid-sentence ("the Marrow").

An entry is composed in this order: the type's opening, the variant,
the climate, each world feature, and the habitability. The interface
(Phase 3) uses the same rules; keep the two in step.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "data/schema/worlds.json"
MAP = ROOT / "data/map.json"
PLACEHOLDER = re.compile(r"\{(World|world)('s)?\}")
NOUNS = {"planet": "the planet", "rogue-planet": "the planet", "moon": "the moon", "gas-giant": "the giant",
         "asteroid": "the body", "dwarf-planet": "the planet"}


def clean_name(name):
    return re.sub(r"\s*\(WIP\)$", "", name).strip()


def possessive(s):
    return s + "'s"


def fill(template, name, body_type):
    """Fill placeholders in one block: name on the first reference, noun after."""
    noun = NOUNS.get(body_type, "the world")
    used = [False]

    def sub(m):
        capital, poss = m.group(1) == "World", bool(m.group(2))
        if not used[0]:
            used[0] = True
            text = name
            if not capital and text.startswith("The "):
                text = "the " + text[4:]
        else:
            text = noun
            if capital:
                text = text[0].upper() + text[1:]
        return possessive(text) if poss else text

    return PLACEHOLDER.sub(sub, template)


def index(cat):
    types = {t["id"]: t for t in cat["types"]}
    feats = {f["id"]: f for g in cat["featureGroups"] for f in g["features"]}
    return types, feats, {c["id"]: c for c in cat["climate"]}, {h["id"]: h for h in cat["habitability"]}


def compose(body, cat):
    """Return the list of paragraphs describing a body, or [] if it has no world type."""
    types, feats, climate, hab = index(cat)
    t = types.get(body.get("world"))
    if t is None:
        return []
    name, kind = clean_name(body["name"]), body["type"]
    blocks = [t["entry"]]
    v = next((x for x in t["variants"] if x["id"] == body.get("variant")), None)
    if v:
        blocks.append(v["description"])
    if body.get("climate") in climate:
        blocks.append(climate[body["climate"]]["description"])
    blocks += [feats[f]["description"] for f in body.get("worldFeatures", []) if f in feats]
    if body.get("habitability") in hab:
        blocks.append(hab[body["habitability"]]["description"])
    return [fill(b, name, kind) for b in blocks]


def templates(cat):
    """Every template in the catalog, with a label."""
    types, feats, climate, hab = index(cat)
    for t in cat["types"]:
        yield f"type {t['id']}", t["entry"]
        for v in t["variants"]:
            yield f"variant {t['id']}/{v['id']}", v["description"]
    for k, d in [("climate", climate), ("habitability", hab), ("feature", feats)]:
        for i, x in d.items():
            yield f"{k} {i}", x["description"]


def check(cat):
    problems = []
    for label, tpl in templates(cat):
        if not PLACEHOLDER.search(tpl):
            problems.append(f"{label}: no reference to the world")
        for name, kind in [("Tallis", "planet"), ("The Marrow", "moon"), ("Cinder II (WIP)", "gas-giant")]:
            out = fill(tpl, clean_name(name), kind)
            if "{" in out or "}" in out:
                problems.append(f"{label}: unfilled placeholder in {out!r}")
    return problems


def main(argv):
    cat = json.loads(CATALOG.read_text())
    if "--check" in argv:
        problems = check(cat)
        print("\n".join(problems) or f"all {sum(1 for _ in templates(cat))} templates fill cleanly")
        return 1 if problems else 0
    path = Path(argv[argv.index("--map") + 1]) if "--map" in argv else MAP
    m = json.loads(path.read_text())
    ids = [a for i, a in enumerate(argv) if not a.startswith("--") and (i == 0 or argv[i - 1] != "--map")]
    bodies = [b for b in m["bodies"] if (not ids or b["id"] in ids) and b.get("world")]
    for b in bodies:
        print(f"## {b['name']}\n")
        print("\n\n".join(compose(b, cat)) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
