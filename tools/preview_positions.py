"""Render data/parsed/positions.json as an SVG with three views:
top (x-y, chart-like), front (x-z) and side (z-y).
Usage: python3 tools/preview_positions.py  ->  data/parsed/positions_preview.svg
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
pos = {k: v["pos"] for k, v in json.loads((ROOT / "data/parsed/positions.json").read_text())["regions"].items()}
regions = {r["id"]: r for r in json.loads((ROOT / "data/parsed/regions.json").read_text())["regions"]}
lanes = json.loads((ROOT / "data/parsed/lanes.json").read_text())["lanes"]

ARM = {"crossroads": "#1f6feb", "coreward": "#2da44e", "trailing": "#bf8700",
       "spinward": "#8250df", "rimward": "#cf222e", "beyond": "#6e7781"}
LANE = {"stable": "", "drifting": "6 4", "tidal": "2 3", "one-way": "", "silent": "2 3"}
S, PAD, R = 9, 40, 33          # px per ly, panel padding, extent in ly
W = 2 * R * S + 2 * PAD
views = [("Top: x trailing →, y coreward ↑", 0, 1), ("Front: x trailing →, z depth ↑", 0, 2), ("Side: z depth →, y coreward ↑", 2, 1)]

out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W*3}" height="{W+20}" font-family="sans-serif" font-size="11">',
       f'<rect width="100%" height="100%" fill="#fff"/>']
for n, (title, a, b) in enumerate(views):
    ox = n * W
    def pt(p):
        return ox + PAD + (p[a] + R) * S, PAD + (R - p[b]) * S
    cx, cy = pt([0, 0, 0])
    out.append(f'<text x="{ox+PAD}" y="20" font-weight="bold">{title}</text>')
    out.append(f'<circle cx="{cx}" cy="{cy}" r="{25*S}" fill="none" stroke="#d0d7de" stroke-dasharray="4 4"/>')
    for l in lanes:
        x1, y1 = pt(pos[l["from"]]); x2, y2 = pt(pos[l["to"]])
        out.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#8c959f" '
                   f'stroke-opacity="0.5" stroke-dasharray="{LANE[l["type"]]}"/>')
    for i, p in sorted(pos.items(), key=lambda kv: kv[1][3 - a - b]):
        x, y = pt(p); r = regions[i]
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" fill="{ARM[r["arm"]]}" '
                   f'fill-opacity="{0.45 if r["frontier"] else 1}" stroke="#24292f" stroke-width="0.5"/>')
        out.append(f'<text x="{x+7:.1f}" y="{y+4:.1f}" fill="#24292f">{r["name"].replace("The ", "")}</text>')
legend = "  ".join(f'<tspan fill="{c}">● {k}</tspan>' for k, c in ARM.items())
out.append(f'<text x="{PAD}" y="{W+10}">{legend}  · faded dot = frontier · dashed ring = 25 ly radius</text></svg>')
(ROOT / "data/parsed/positions_preview.svg").write_text("\n".join(out))
print("wrote data/parsed/positions_preview.svg")
