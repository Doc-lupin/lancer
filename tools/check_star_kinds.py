"""Check that src/data/starKinds.js agrees with STAR in tools/derive_stats.py.

  python3 tools/check_star_kinds.py

Checks: the same kinds as STAR and the schema's starKind list; luminosity,
temperature and color word copied exactly; a #rrggbb display color for each;
radius = sqrt(L) / (T / 5772)^2 within 1%, except the kinds set by hand;
every star kind used in data/map.json is in the table. Needs Node.
"""
import json, math, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from derive_stats import STAR  # noqa: E402

HAND_SET_RADIUS = {"neutron-star", "pulsar", "magnetar", "black-hole", "brown-dwarf"}


def js_table():
    code = "import('./src/data/starKinds.js').then(m => console.log(JSON.stringify(m.STAR_KINDS)))"
    out = subprocess.run(["node", "--input-type=module", "-e", code], cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def main():
    js = js_table()
    schema = json.loads((ROOT / "data/schema/map.schema.json").read_text())
    enum = set(schema["$defs"]["starKind"]["enum"])
    m = json.loads((ROOT / "data/map.json").read_text())
    used = {s["center"]["kind"] for s in m["systems"] if s["center"]["type"] == "star"}
    used |= {b["kind"] for b in m["bodies"] if b["type"] == "star"}

    errors = []
    for name, kinds in (("STAR in derive_stats.py", set(STAR)), ("the schema's starKind list", enum), ("map.json", used)):
        missing = kinds - set(js)
        if missing:
            errors.append(f"starKinds.js lacks kinds in {name}: {sorted(missing)}")
    extra = set(js) - set(STAR)
    if extra:
        errors.append(f"starKinds.js has kinds not in STAR: {sorted(extra)}")

    for kind, (L, T, word) in STAR.items():
        k = js.get(kind)
        if not k:
            continue
        for field, want in (("luminosity", L), ("temperature", T), ("colorWord", word)):
            if k[field] != want:
                errors.append(f"{kind}: {field} is {k[field]!r}, STAR has {want!r}")
        if not re.fullmatch(r"#[0-9a-f]{6}", k["color"]):
            errors.append(f"{kind}: color {k['color']!r} is not #rrggbb")
        if not k["radius"] > 0:
            errors.append(f"{kind}: radius must be above 0")
        elif kind not in HAND_SET_RADIUS:
            want = math.sqrt(L) / (T / 5772) ** 2
            if abs(k["radius"] - want) > 0.01 * want:
                errors.append(f"{kind}: radius {k['radius']} should be {want:.3g} from L and T")

    for e in errors:
        print("ERROR", e)
    print(f"starKinds.js: {len(js)} kinds, {len(used)} used in map.json, {len(errors)} errors")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
