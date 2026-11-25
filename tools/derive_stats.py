"""Derive the datablock (stats and profile) for worlds and stations.

Called by tools/build_map.py after assembly, or alone:
  python3 tools/derive_stats.py FILE      derive in place (e.g. the example map)

`stats` holds physical figures and comparisons to Union standard (Earth = 1).
`profile` holds travel, control, people, economy, ratings and GM hooks.
Most values are worked out here from orbits, star kinds, world types,
features, places and the lane network. Authored values in data/src/profiles.json
(merged into each body before this runs) always win over derived ones.
Field guide: docs/DATABLOCK.md.
"""
import heapq, json, math, re, sys, zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DRIVE = 9.81  # standard drive: 1 g, accelerating to midpoint then braking (m/s^2)
CATALOG = ROOT / "data/schema/worlds.json"

# Star kinds: luminosity (Sun = 1), surface temperature (K), color word.
STAR = {
    "red-dwarf": (0.02, 3200, "red"), "orange-dwarf": (0.25, 4500, "orange"), "yellow-dwarf": (1.0, 5800, "yellow-white"),
    "yellow-white-star": (2.5, 6600, "white"), "white-star": (15, 9000, "brilliant white"), "blue-white-star": (300, 15000, "blue-white"),
    "blue-star": (30000, 35000, "blue"), "protostar": (5, 4000, "orange, veiled"), "subgiant": (4, 5500, "yellow"),
    "red-giant": (150, 4000, "swollen red"), "orange-giant": (60, 4500, "swollen orange"), "yellow-giant": (150, 5500, "swollen yellow"),
    "blue-giant": (10000, 20000, "blue"), "red-supergiant": (50000, 3500, "vast red"), "blue-supergiant": (200000, 20000, "blue"),
    "carbon-star": (5000, 3000, "deep red"), "wolf-rayet": (100000, 50000, "violet-white"), "white-dwarf": (0.001, 10000, "tiny white"),
    "neutron-star": (0.00001, 600000, "invisible"), "pulsar": (0.00001, 600000, "flickering point"), "magnetar": (0.00001, 600000, "invisible"),
    "black-hole": (0.0, 0, "none"), "remnant": (0.001, 5000, "faint"), "brown-dwarf": (0.0003, 1200, "dull red"),
}
MASS = {"red-dwarf": 0.3, "orange-dwarf": 0.7, "yellow-dwarf": 1.0, "yellow-white-star": 1.3, "white-star": 2.0, "blue-white-star": 4.0,
        "blue-star": 15, "protostar": 1.0, "subgiant": 1.2, "red-giant": 1.2, "orange-giant": 1.5, "yellow-giant": 2.5, "blue-giant": 12,
        "red-supergiant": 15, "blue-supergiant": 20, "carbon-star": 1.5, "wolf-rayet": 15, "white-dwarf": 0.6, "neutron-star": 1.4,
        "pulsar": 1.4, "magnetar": 1.4, "black-hole": 8, "remnant": 1.0, "brown-dwarf": 0.06}
# Climate bands, mean surface temperature in degrees C.
CLIMATE = {"scorching": (200, 3000), "hot": (35, 200), "warm": (18, 30), "temperate": (8, 18), "cool": (-2, 8), "cold": (-40, -2), "frozen": (-270, -40)}
GIANT_TEMP = {"hot-giant": (700, 1400), "silicate-giant": (1300, 2200), "cloudless-giant": (30, 300), "warm-giant": (-20, 80),
              "cold-giant": (-180, -90), "ice-giant": (-225, -180), "helium-giant": (-160, 900), "puffy-giant": (-150, 1200), "mini-neptune": (-220, 600)}
DENSITY = {"iron": 7.5, "carbon": 4.0, "diamond": 5.0, "chthonian": 8.0, "super-earth": 6.0, "lava": 5.0, "volcanic": 3.5, "barren": 3.6,
           "pulsar-world": 5.5, "shattered": 1.8, "crystalline": 4.0, "steam": 3.5, "high-gravity": 6.0, "superhabitable": 5.8,
           "ice": 1.9, "subglacial-ocean": 2.6, "cryovolcanic": 1.8, "methane-sea": 1.9, "hydrocarbon": 2.0, "snowball": 4.5, "hycean": 3.0,
           "dwarf-planet": 2.1, "comet": 0.6, "moonlet": 2.0, "water-world": 3.5}
GIANTS = {"hot-giant", "silicate-giant", "cloudless-giant", "warm-giant", "cold-giant", "puffy-giant", "helium-giant", "ice-giant", "mini-neptune"}

# Atmosphere by world type: pressure (atm or None for giants), main gases, breathability.
AIR_STD = (1.0, "nitrogen and oxygen", "breathable")
AIR = {
    "seasonal": (0.9, "nitrogen, with oxygen in season", "breathable in season"),
    "dense-air": (4.5, "dense nitrogen and oxygen", "breathable with a gas mix"),
    "thin-air": (0.25, "thin nitrogen and carbon dioxide", "mask required"),
    "toxic-air": (1.1, "nitrogen, oxygen and toxic traces", "filter required"),
    "storm": (1.2, "nitrogen and oxygen", "breathable"), "dust": (0.4, "thin carbon dioxide and dust", "mask required"),
    "glassed": (0.55, "thin nitrogen and oxygen", "mask for exertion"), "salt": (0.8, "nitrogen and oxygen", "breathable"),
    "high-gravity": (2.5, "dense nitrogen and oxygen", "breathable"), "flare-scoured": (0.6, "thin nitrogen and carbon dioxide", "mask required"),
    "water-world": (1.5, "nitrogen, oxygen and water vapor", "breathable"), "superhabitable": (1.3, "nitrogen and oxygen", "breathable"),
    "barren": (0.0, "none", "vacuum"), "super-earth": (0.3, "thin nitrogen", "sealed suit"), "iron": (0.0, "none", "vacuum"),
    "carbon": (0.1, "carbon monoxide and methane traces", "sealed suit"), "diamond": (0.0, "none", "vacuum"),
    "chthonian": (0.05, "escaping rock vapor", "sealed suit"), "lava": (0.01, "rock vapor", "sealed suit"), "volcanic": (0.01, "sulfur dioxide traces", "sealed suit"),
    "hothouse": (90, "carbon dioxide under sulfuric acid cloud", "sealed suit"), "pulsar-world": (0.0, "none", "vacuum"),
    "shattered": (0.0, "none", "vacuum"), "crystalline": (0.0, "none", "vacuum"), "steam": (200, "supercritical water and steam", "sealed suit"),
    "ice": (0.0, "none", "vacuum"), "subglacial-ocean": (0.0, "none", "vacuum"), "cryovolcanic": (0.001, "water vapor traces", "vacuum"),
    "methane-sea": (1.5, "nitrogen and methane", "sealed suit"), "hydrocarbon": (0.1, "nitrogen and methane", "sealed suit"),
    "snowball": (0.6, "nitrogen and carbon dioxide", "sealed suit"), "hycean": (10, "hydrogen", "sealed suit"),
    "dwarf-planet": (0.0, "none", "vacuum"), "comet": (0.0, "none", "vacuum"), "moonlet": (0.0, "none", "vacuum"),
}
VARIANT_AIR = {("super-earth", "thick-air"): (50, "carbon dioxide", "sealed suit"), ("iron", "rust"): (0.01, "thin carbon dioxide", "sealed suit"),
               ("dense-air", "high-pressure"): (8, "dense nitrogen and oxygen", "breathable with a gas mix"),
               ("toxic-air", "chlorine"): (1.1, "nitrogen, oxygen and chlorine", "filter required")}
GREENHOUSE = lambda p: 0 if p is None or p < 0.005 else (5 if p < 0.5 else (33 if p < 2 else (60 if p < 20 else 400)))
ALBEDO = {"habitable-wet": 0.3, "habitable-dry": 0.3, "habitable-cold": 0.4, "habitable-special": 0.3, "marginal": 0.35,
          "rocky": 0.15, "icy": 0.6, "giant": 0.35, "small": 0.1}

# Surface makeup by type: (water, land, ice, other, other kind).
SURFACE = {
    "continental": (65, 32, 3, 0, None), "forest": (55, 43, 2, 0, None), "lake": (35, 60, 5, 0, None), "marsh": (45, 55, 0, 0, None),
    "ocean": (92, 6, 2, 0, None), "archipelago": (95, 5, 0, 0, None), "reef": (85, 15, 0, 0, None), "tropical": (60, 40, 0, 0, None),
    "monsoon": (55, 45, 0, 0, None), "megaflora": (50, 50, 0, 0, None), "fungal": (45, 55, 0, 0, None), "bioluminescent": (60, 40, 0, 0, None),
    "desert": (2, 96, 2, 0, None), "oasis": (3, 97, 0, 0, None), "arid": (5, 95, 0, 0, None), "mediterranean": (50, 50, 0, 0, None),
    "savanna": (40, 60, 0, 0, None), "steppe": (30, 68, 2, 0, None), "supercontinent": (55, 45, 0, 0, None),
    "tundra": (30, 50, 20, 0, None), "boreal": (55, 38, 7, 0, None), "alpine": (40, 45, 15, 0, None), "fjord": (55, 30, 15, 0, None),
    "arctic": (30, 10, 60, 0, None), "superhabitable": (50, 50, 0, 0, None), "karst": (30, 70, 0, 0, None),
    "tidally-locked": (5, 40, 55, 0, None), "geothermal": (10, 40, 50, 0, None), "seasonal": (20, 70, 10, 0, None),
    "dense-air": (40, 60, 0, 0, None), "thin-air": (1, 95, 4, 0, None), "toxic-air": (40, 60, 0, 0, None), "storm": (75, 25, 0, 0, None),
    "dust": (0, 100, 0, 0, None), "glassed": (1, 52, 0, 47, "glass"), "salt": (2, 38, 0, 60, "salt"), "high-gravity": (60, 40, 0, 0, None),
    "flare-scoured": (5, 95, 0, 0, None), "water-world": (100, 0, 0, 0, None), "barren": (0, 100, 0, 0, None),
    "super-earth": (0, 85, 15, 0, None), "iron": (0, 100, 0, 0, None), "carbon": (0, 85, 0, 15, "tar"), "diamond": (0, 100, 0, 0, None),
    "chthonian": (0, 100, 0, 0, None), "lava": (0, 30, 0, 70, "lava"), "volcanic": (0, 80, 0, 20, "lava and sulfur"),
    "hothouse": (0, 100, 0, 0, None), "pulsar-world": (0, 100, 0, 0, None), "shattered": (0, 60, 40, 0, None),
    "crystalline": (0, 60, 0, 40, "lattice crust"), "steam": (100, 0, 0, 0, None), "ice": (0, 10, 90, 0, None),
    "subglacial-ocean": (0, 0, 100, 0, None), "cryovolcanic": (0, 5, 95, 0, None), "methane-sea": (0, 0, 85, 15, "methane seas"),
    "hydrocarbon": (0, 0, 60, 40, "tar seas"), "snowball": (0, 0, 100, 0, None), "hycean": (100, 0, 0, 0, None),
    "dwarf-planet": (0, 40, 60, 0, None), "comet": (0, 20, 80, 0, None), "moonlet": (0, 100, 0, 0, None),
}
VARIANT_SURFACE = {("tidally-locked", "eyeball-ocean"): (20, 5, 75, 0, None), ("tidally-locked", "twilight-band"): (3, 47, 50, 0, None),
                   ("glassed", "partial"): (1, 84, 0, 15, "glass"), ("superhabitable", "wet"): (75, 25, 0, 0, None),
                   ("desert", "polar-caps"): (0, 92, 8, 0, None), ("lava", "crusted"): (0, 70, 0, 30, "lava"),
                   ("super-earth", "thick-air"): (0, 100, 0, 0, None)}
PRECIP = {"habitable-wet": "wet", "habitable-dry": "arid", "habitable-cold": "moderate", "habitable-special": "moderate", "marginal": "moderate"}
TYPE_PRECIP = {"tropical": "torrential", "monsoon": "torrential", "storm": "torrential", "desert": "arid", "oasis": "arid", "dust": "none",
               "glassed": "arid", "salt": "arid", "thin-air": "none", "methane-sea": "moderate (methane)", "hothouse": "acid, never reaching the ground",
               "seasonal": "moderate", "water-world": "wet", "steam": "torrential", "snowball": "none", "hycean": "wet", "arctic": "arid",
               "mediterranean": "moderate", "savanna": "moderate", "steppe": "arid", "tidally-locked": "moderate", "dense-air": "wet"}
GEOLOGY_ACTIVE = {"active-volcanism", "tidal-heating", "cryovolcanoes", "geysers", "plate-tectonics", "quakes", "supervolcano", "shield-volcanoes"}
HAZARD_FEATURES = {"radiation", "custodians", "megafauna", "apex-predators", "dangerous-biosphere", "endemic-disease", "flaring-sun",
                   "toxic-dust", "volcanic-winter", "quakes", "avalanches", "extreme-lightning", "unexploded-ordnance", "acid-rain",
                   "gas-pockets", "cave-ins", "tsunamis", "flash-floods", "venomous-fauna", "parasites", "time-anomaly", "whiteouts"}
SECURITY_FEATURES = {"battlefield": "active fighting", "insurgency": "insurgency", "siege": "a siege", "smuggler-anchorage": "smugglers",
                     "unexploded-ordnance": "unexploded ordnance"}
OUTLAWS = {"seventh", "unlit", "tallymen", "hallorans-heirs", "ringwreckers"}
ABSENT = {"climate-engine": "climate engine", "failing-climate-engine": "failing climate engine", "heat-engine": "heat engine",
          "absent-ruins": "ruins", "absent-towers": "towers", "absent-platforms": "floating platforms", "absent-shipyard": "shipyard",
          "absent-wreckage": "wreckage", "buried-structure": "buried structure", "orbital-structure": "orbital structure",
          "dormant-machinery": "dormant machinery", "powered-wreck": "powered wreck", "sealed-chamber": "sealed chamber",
          "absent-signal": "repeating signal", "swept-space": "swept space", "geometric-patterns": "geometric patterns",
          "gravity-anomaly": "gravity anomalies", "time-anomaly": "lost time", "custodians": "custodians below about 400 m"}
RESOURCE_LABEL = {"metal-ores": "metal ore", "rare-earths": "rare earths", "radioactives": "radioactives", "precious-metals": "precious metals",
                  "water-ice-reserves": "water and reaction mass", "volatiles": "volatiles", "helium-3": "helium-3", "deuterium": "deuterium",
                  "hydrocarbons": "hydrocarbons", "timber": "timber", "fisheries": "fish", "arable-land": "grain", "grazing-land": "meat and hides",
                  "medicinal-flora": "medicines", "exotic-compounds": "exotic compounds", "salvage": "salvage", "building-stone": "stone"}
PRINT = {"stewardship": "licensed print shops", "charter-bench": "licensed print shops", "landholders-league": "licensed print shops",
         "riverlands-combine": "licensed print shops", "synod": "licensed print shops", "orison-assembly": "licensed print shops",
         "lagoon-towns": "licensed and unsigned prints", "purview": "Armory licenses only", "smith-shimano": "company designs only",
         "kerr-varga": "company designs only", "ferrous-consolidated": "licensed print shops", "mercer-ibarra": "licensed print shops",
         "free-lines": "licensed and unsigned prints", "sable-harbor": "open market, banned designs included", "long-families": "unsigned prints",
         "compact": "unsigned prints", "seventh": "unsigned prints", "coldwell-claims": "unsigned prints", "bellows-commune": "unsigned prints",
         "northern-concord": "licensed print shops", "southern-league": "licensed and unsigned prints", "basin-office": "licensed print shops",
         "rimelight": "company designs only", "reach-companies": "licensed print shops", "survey-office": "licensed print shops"}
SETTLED_KINDS = {"city", "town", "settlement", "camp", "base", "port", "mine", "refinery", "landing"}
NOUN = {"planet": "planet", "moon": "moon", "gas-giant": "giant", "rogue-planet": "planet", "asteroid": "body"}


def frac(key, salt=""):
    return (zlib.crc32((key + salt).encode()) % 10000) / 10000


def rnd(x, n=1):
    return round(x, n) if x is not None else None


def size_class(r, giant):
    if giant:
        return "Neptune-sized" if r < 30000 else ("Saturn-sized" if r < 62000 else ("Jupiter-sized" if r < 80000 else "inflated giant"))
    for lim, label in [(300, "minor body"), (1500, "small"), (4000, "sub-Earth"), (5500, "near-Earth"), (7500, "Earth-sized"), (11000, "super-Earth")]:
        if r < lim:
            return label
    return "large super-Earth"


class Ctx:
    def __init__(self, m):
        self.m = m
        self.cat = json.loads(CATALOG.read_text())
        self.family = {t["id"]: t["family"] for t in self.cat["types"]}
        self.typename = {t["id"]: t["name"] for t in self.cat["types"]}
        self.systems = {s["id"]: s for s in m["systems"]}
        self.bodies = {b["id"]: b for b in m["bodies"]}
        self.regions = {r["id"]: r for r in m["regions"]}
        self.factions = {f["id"]: f for f in m["factions"]}
        self.places_by_body = {}
        for p in m["places"]:
            self.places_by_body.setdefault(p["body"], []).append(p)
        self.children = {}
        for b in m["bodies"]:
            if "parent" in b:
                self.children.setdefault(b["parent"], []).append(b)
        c = m["clock"]
        self.t = (c["current"]["year"] - c["epoch"]["year"]) * c["daysPerYear"] + c["current"]["day"] - c["epoch"]["day"]
        self.typecode = self._type_codes()
        self.graph = self._lane_graph()

    def _type_codes(self):
        codes, used = {}, set()
        for t in self.cat["types"]:
            parts = t["id"].split("-")
            base = (parts[0][:3] if len(parts) == 1 else "".join(p[0] for p in parts) + parts[-1][1]).upper()
            c, i = base, 1
            while c in used:
                c = base[:2] + t["id"].replace("-", "")[2 + i].upper(); i += 1
            used.add(c); codes[t["id"]] = c
        return codes

    def _lane_graph(self):
        g = {}
        for l in self.m["lanes"]:
            if l["days"] is None:
                continue
            a, b = l["from"]["region"], l["to"]["region"]
            info = (l["days"], l["id"], "tidal" in l, l["drifting"])
            g.setdefault(a, []).append((b,) + info)
            if not l["oneWay"]:
                g.setdefault(b, []).append((a,) + info)
        return g

    def route(self, start, goals):
        """Shortest lane route in days from a region to any goal region."""
        if start in goals:
            return 0, [start], False, False
        best = {start: 0}
        q = [(0, start, [start], False, False)]
        while q:
            d, r, path, tid, dri = heapq.heappop(q)
            if r in goals:
                return d, path, tid, dri
            if d > best.get(r, 1e9):
                continue
            for nb, days, _, t, dr in self.graph.get(r, []):
                nd = d + days
                if nd < best.get(nb, 1e9):
                    best[nb] = nd
                    heapq.heappush(q, (nd, nb, path + [nb], tid or t, dri or dr))
        return None, None, False, False

    # ------------------------------------------------------------ geometry
    def host(self, b):
        """The body at the top of b's parent chain (orbits the system center)."""
        while b.get("parent") in self.bodies:
            b = self.bodies[b["parent"]]
        return b

    def pos_au(self, b):
        """Position of a body (or its top-level parent) in the system plane at the clock date, in AU."""
        h = self.host(b)
        o = h.get("orbit")
        if not o:
            return (0.0, 0.0)
        r = o["distance"] if o["unit"] == "au" else o["distance"] / 1.496e8
        ang = o["phaseDeg"] + (360 * self.t / o["periodDays"] if o.get("periodDays") else 0)
        a = math.radians(ang)
        return (r * math.cos(a), r * math.sin(a))

    def separation(self, a, b):
        """Distance in AU between two bodies; bodies around the same host use their km orbits."""
        ha, hb = self.host(a), self.host(b)
        if ha["id"] == hb["id"]:
            ka = a["orbit"]["distance"] if a is not ha and a.get("orbit", {}).get("unit") == "km" else 0
            kb = b["orbit"]["distance"] if b is not hb and b.get("orbit", {}).get("unit") == "km" else 0
            return max(abs(ka - kb), 1000) / 1.496e8
        return math.dist(self.pos_au(a), self.pos_au(b))

    def star_of(self, b):
        s = self.systems[b["system"]]
        k = s["center"].get("kind")
        return k

    # ------------------------------------------------------------ stats
    def stats(self, b):
        w, v = b["world"], b.get("variant")
        fam = self.family[w]
        giant = w in GIANTS
        feats = set(b.get("worldFeatures", []))
        r = b.get("radiusKm", 3000)
        kind = self.star_of(b)
        L, Tstar, scolor = STAR.get(kind, (0.0, 0, "none"))
        h = self.host(b)
        d = None
        if h.get("orbit") and h["orbit"]["unit"] == "au" and kind:
            d = h["orbit"]["distance"]
        S = L / d ** 2 if d and L else 0.0
        # mass and gravity
        if giant:
            mass = {"ice-giant": 16, "mini-neptune": 7, "puffy-giant": 40}.get(w, 300 * (r / 70000) ** 2)
            grav = mass / (r / 6371) ** 2
        else:
            rho = DENSITY.get(w, 5.5)
            mass = rho / 5.51 * (r / 6371) ** 3
            grav = rho / 5.51 * (r / 6371)
        esc = 11.19 * math.sqrt(mass / (r / 6371))
        access = "no surface" if giant else ("easy" if esc < 5 else ("standard" if esc < 13 else ("costly" if esc < 20 else "very costly")))
        # day and year
        rot = b.get("rotation", {})
        locked = bool(rot.get("tidallyLocked")) or w == "tidally-locked" or "tidally-locked-to-parent" in feats
        my_orbit = b.get("orbit", {}).get("periodDays")
        if locked and my_orbit:
            day = my_orbit * 24  # a locked world's day is its orbit, whatever rotation was recorded
        elif rot.get("periodHours"):
            day = rot["periodHours"]
        elif "slow-rotation" in feats:
            day = 300 + 2700 * frac(b["id"], "day")
        elif "fast-rotation" in feats:
            day = 3 + 5 * frac(b["id"], "day")
        elif "spin-orbit-resonance" in feats and my_orbit:
            day = my_orbit * 24 * 2 / 3
        elif giant:
            day = 9 + 9 * frac(b["id"], "day")
        elif fam == "small":
            day = 4 + 16 * frac(b["id"], "day")
        else:
            day = 16 + 30 * frac(b["id"], "day")
        year = h.get("orbit", {}).get("periodDays") if h.get("orbit", {}).get("unit") == "au" else None
        tilt = rot.get("axialTiltDeg")
        if locked and not b.get("parent"):
            tilt = rot.get("axialTiltDeg", round(3 * frac(b["id"], "tilt"), 1))
        elif tilt is None:
            tilt = 60 + 38 * frac(b["id"], "tilt") if "high-obliquity" in feats else 35 * frac(b["id"], "tilt") ** 1.5
        ecc = h.get("orbit", {}).get("eccentricity", 0)
        if locked and not b.get("parent"):
            seasons = "none (tidally locked)"
        elif giant:
            seasons = "not applicable"
        elif "extreme-seasons" in feats or tilt > 45:
            seasons = "extreme"
        elif "mild-seasons" in feats:
            seasons = "mild"
        else:
            score = tilt + 120 * ecc + (15 if "eccentric-orbit" in feats else 0)
            seasons = "none" if score < 5 else ("mild" if score < 15 else ("strong" if score < 35 else "extreme"))
        # atmosphere
        p, gases, breath = VARIANT_AIR.get((w, v), AIR.get(w, AIR_STD))
        if giant:
            p, gases, breath = None, ("hydrogen, helium and methane" if w in ("ice-giant", "mini-neptune") else
                                      ("helium" if w == "helium-giant" else "hydrogen and helium")), "no surface"
        # temperature
        heat = "star" if S > 0 else "none"
        if "heat-engine" in feats or self.systems[b["system"]]["center"]["type"] == "structure":
            heat = "Absent engine"
        elif "tidal-heating" in feats and S < 0.05:
            heat = "tidal heating"
        Teq = 278.6 * S ** 0.25 * (1 - ALBEDO.get(fam, 0.3)) ** 0.25 if S else 30.0
        phys = Teq + GREENHOUSE(p) - 273.15
        band = GIANT_TEMP.get(w) if giant else CLIMATE.get(b.get("climate"))
        airless = p is not None and p < 0.005
        if not band or band[0] <= phys <= band[1] or (airless and heat == "star"):
            mean = phys  # airless worlds take their physical temperature; their climate label is descriptive
        else:
            # Outside its band (Absent regulation, a dense atmosphere or an invented orbit): place it inside the band,
            # on the side physics points to, varied per world so clamped worlds do not stack on the boundary.
            w_ = band[1] - band[0]
            step = w_ * (0.1 + 0.3 * frac(b["id"], "temp"))
            mean = band[0] + step if phys < band[0] else band[1] - step
        if band and not (band[0] <= phys <= band[1]) and heat == "star" and not giant:
            heat = "star, regulated" if "climate-engine" in feats else heat
        if giant:
            spread, note = 0, "cloud tops"
        elif w == "tidally-locked":
            spread, note = 0, f"day side about {round(mean + 70)} °C, night side about {round(mean - 90)} °C, twilight near the mean"
        elif p is not None and p < 0.005:
            spread, note = min(160, 40 + day / 6), "airless: large swings between day and night"
        elif p is not None and p < 0.5:
            spread, note = 30, "thin air: wide daily swings"
        elif p is not None and p > 3:
            spread, note = 3, "dense air: little variation"
        else:
            spread, note = 8 + (10 if seasons in ("strong", "extreme") else 0), "seasonal and daily range"
        trange = [max(-270, round(mean - spread)), round(mean + spread)] if spread else None
        # surface, precipitation, geology, radiation
        wat, land, ice, other, okind = VARIANT_SURFACE.get((w, v), SURFACE.get(w, (0, 100, 0, 0, None)))
        surface = None if giant else {"water": wat, "land": land, "ice": ice, "other": other, **({"otherKind": okind} if okind else {})}
        if giant:
            precip = "not applicable"
        elif p is None or p < 0.005:
            precip = "none"
        else:
            precip = TYPE_PRECIP.get(w, PRECIP.get(fam, "light"))
        if w in ("lava", "volcanic") or "supervolcano" in feats:
            geo = "violent"
        elif feats & GEOLOGY_ACTIVE or fam.startswith("habitable"):
            geo = "active"
        elif "tectonically-dead" in feats or "ancient-surface" in feats or fam == "small":
            geo = "dead"
        else:
            geo = "quiet"
        rad = 0
        if kind in ("pulsar", "magnetar", "neutron-star", "blue-star", "wolf-rayet", "blue-giant", "blue-supergiant"):
            rad += 2
        if "flaring-sun" in feats or "flares" in self.systems[b["system"]]["center"].get("features", []):
            rad += 1
        if "radiation" in feats:
            rad += 2
        if "no-magnetosphere" in feats:
            rad += 1
        if p is not None and p < 0.005:
            rad += 1
        if p is not None and p >= 1:
            rad -= 1
        if "strong-magnetosphere" in feats and not giant:
            rad -= 1
        radiation = ["low", "low", "moderate", "high", "lethal"][max(0, min(4, rad))] if not giant else "high in the belts" if "radiation-belts" in feats else "moderate"
        # sky
        moons = [c for c in self.children.get(b["id"], []) if c["type"] in ("moon", "asteroid")]
        if p is None:
            sky = "not applicable"
        elif p < 0.005:
            sky = "black"
        elif "dust" in gases or w == "dust":
            sky = "salmon pink"
        elif "chlorine" in gases:
            sky = "pale green"
        elif "methane" in gases:
            sky = "orange haze"
        elif w in ("hothouse", "steam") or p > 20:
            sky = "yellow-white haze"
        elif p < 0.5:
            sky = "deep blue, darkening toward black"
        elif "permanent-overcast" in feats or w == "dense-air":
            sky = "grey overcast"
        elif kind in ("red-dwarf", "brown-dwarf", "red-giant", "red-supergiant", "carbon-star"):
            sky = "dim blue-violet"
        else:
            sky = "blue"
        if L and d and Tstar:
            rstar = math.sqrt(L) / (Tstar / 5772) ** 2
            sun_size = rstar / d
        else:
            sun_size = None
        objects = []
        if b.get("parent") in self.bodies and b["type"] in ("moon", "asteroid"):
            objects.append(f"{self.bodies[b['parent']]['name'].replace(' (WIP)', '')} overhead")
        objects += [c["name"].replace(" (WIP)", "") for c in moons[:4]]
        if "rings" in feats or b.get("appearance", {}).get("rings"):
            objects.append("its rings")
        if "lantern-pulse" in feats:
            objects.append("the pulsing Lantern stars")
        if "nebula-sky" in feats:
            objects.append("the glow of the nebula")
        if "pulsar-sky" in feats:
            objects.append("a flickering pulsar")
        objects.append("the Watchfire")
        if not L:
            sun = "none"
        elif sun_size is None or sun_size < 0.02:
            sun = f"{scolor}, a point of light"
        else:
            sun = f"{scolor}, {rnd(sun_size, 2)}× standard size"
        # life and the Absent
        if "extinct-biosphere" in feats and not feats & {"native-life", "microbial-only"}:
            bio = "extinct"
        elif "microbial-only" in feats:
            bio = "microbial"
        elif feats & {"megafauna", "apex-predators", "marine-megafauna"}:
            bio = "complex, with megafauna"
        elif "native-life" in feats or fam.startswith("habitable"):
            bio = "complex" if fam.startswith("habitable") or b.get("habitability") in ("garden", "habitable") else "simple"
        else:
            bio = "none"
        life = []
        if "alien-biochemistry" in feats:
            life.append("inedible to humans")
        if "edible-biosphere" in feats:
            life.append("largely edible")
        if "possible-sapience" in feats:
            life.append("under review for sapience")
        if "dangerous-biosphere" in feats:
            life.append("dangerous")
        stats = {
            "sizeClass": size_class(r, giant), "diameterKm": round(2 * r), "radiusRel": rnd(r / 6371, 2), "massRel": rnd(mass, 3),
            "gravityG": rnd(grav, 2), "escapeKms": rnd(esc, 1), "orbitAccess": access,
            "dayHours": rnd(day, 1), "dayRel": rnd(day / 24, 2), "tidallyLocked": locked,
            "yearDays": rnd(year, 1), "yearRel": rnd(year / 365.25, 2) if year else None,
            "localDaysPerYear": rnd(year * 24 / day, 1) if year and day else None,
            "axialTiltDeg": rnd(tilt, 1), "seasons": seasons,
            "distanceAu": rnd(d, 3), "insolationRel": rnd(S, 3) if S else 0, "heatSource": heat,
            "tempMeanC": round(mean), "tempRangeC": trange, "tempNote": note,
            "pressureAtm": rnd(p, 3), "breathability": breath, "atmosphere": gases,
            "surface": surface, "precipitation": precip, "geology": geo, "radiation": radiation,
            "sky": {"color": sky, "sun": sun, "sunSizeRel": rnd(sun_size, 3), "objects": objects},
            "moons": len(moons), "moonNames": [c["name"] for c in moons], "rings": bool("rings" in feats or b.get("appearance", {}).get("rings")),
            "biosphere": bio, "nativeLife": ", ".join(life) or ("none" if bio == "none" else "none noted"),
            "absent": [ABSENT[f] for f in b.get("worldFeatures", []) if f in ABSENT],
        }
        return stats

    # ------------------------------------------------------------ profile
    def profile(self, b, stats):
        feats = set(b.get("worldFeatures", []))
        sysm = self.systems[b["system"]]
        reg = self.regions.get(sysm.get("region")) if sysm.get("region") else None
        places = self.places_by_body.get(b["id"], [])
        stations = [c for c in self.children.get(b["id"], []) if c["type"] == "station"]
        control = b.get("control") or sysm.get("control") or (reg or {}).get("control") or {"status": "none"}
        holders = control.get("holders", [])
        prof = {}
        # survey
        settled = [p for p in places if p["kind"] in SETTLED_KINDS]
        if settled or stations or b["type"] == "station":
            survey = "settled"
        elif reg is None:
            survey = "unvisited"
        elif not reg["frontier"]:
            survey = "surveyed"
        elif places:
            survey = "partly surveyed"
        else:
            survey = "seen from orbit only"
        prof["surveyStatus"] = survey
        # authority and claims
        if control["status"] == "none":
            auth = "no authority"
        elif control["status"] == "unknown":
            auth = "unknown"
        else:
            names = [self.factions[h]["name"] for h in holders]
            auth = ("contested: " if control["status"] == "contested" else "") + ", ".join(names)
        prof["authority"] = auth
        if "quarantine" in feats:
            claims = "closed by quarantine"
        elif "possible-sapience" in feats:
            claims = "pending the Bench's sapience ruling"
        elif "disputed-claims" in feats:
            claims = "disputed"
        elif "allotment-claims" in feats:
            claims = "registered with the Allotment"
        elif holders:
            claims = f"held by {self.factions[holders[0]]['name']}"
        else:
            claims = "unclaimed"
        prof["claims"] = claims
        # security
        sec, why = 1, []
        if control["status"] == "contested":
            sec += 2; why.append("contested control")
        elif control["status"] in ("none", "unknown"):
            sec += 1; why.append("no authority")
        elif not set(holders) & {"stewardship"}:
            sec += 0
        for f, label in SECURITY_FEATURES.items():
            if f in feats:
                sec += 1; why.append(label)
        outl = [p["faction"] for p in (reg or {}).get("presence", []) + b.get("presence", []) if p["faction"] in OUTLAWS]
        if outl:
            sec += 1; why.append("outlaws in the region: " + ", ".join(sorted({self.factions[o]["name"] for o in outl})))
        if any(a["body"] == b["id"] and a["control"]["status"] == "contested" for a in self.m["areas"]):
            sec += 1; why.append("contested ground on the surface")
        if "fortified" in feats:
            sec -= 1; why.append("fortified")
        prof["security"] = {"rating": max(1, min(5, sec)), "reasons": why or ["settled and policed"]}
        # navy reach and distance to the Marrow
        rid = sysm.get("region")
        if rid in ("ostrom", "tallis"):
            prof["navyReach"] = "Navy home waters"
        elif rid:
            nd, _, _, _ = self.route(rid, {"ostrom", "tallis"})
            prof["navyReach"] = "beyond the Navy's reach" if nd is None or nd > 6 else ("within patrol range" if nd <= 3 else "occasional patrols")
        else:
            prof["navyReach"] = "beyond the Navy's reach"
        if rid:
            dd, path, tid, dri = self.route(rid, {"ostrom"})
            if dd is None:
                prof["toMarrow"] = {"days": None, "route": [], "note": "no known route"}
            else:
                notes = [n for n, f in (("uses a tidal lane", tid), ("uses a drifting lane", dri)) if f]
                prof["toMarrow"] = {"days": dd, "route": [self.regions[x]["name"] for x in path],
                                    **({"note": "; ".join(notes)} if notes else {})}
        else:
            prof["toMarrow"] = {"days": None, "route": [], "note": "no known route"}
        # transit from the nearest lane mouth (0.3 g brachistochrone)
        mouths = [x for x in self.m["bodies"] if x["type"] == "lane-mouth" and x["system"] == b["system"]]
        here = self.pos_au(b)
        if mouths:
            mt = min(mouths, key=lambda mb: self.separation(b, mb))
            dist_au, via = self.separation(b, mt), mt["name"]
            extra = 0
        else:
            L = STAR.get(sysm["center"].get("kind"), (0,))[0]
            arrive = (min(8, max(0.3, 1.5 * math.sqrt(L))) if L else 0.3, 0.0)
            dist_au, via, extra = math.dist(here, arrive), "local lane", 0.25
        days = 2 * math.sqrt(dist_au * 1.496e11 / DRIVE) / 86400 + extra if dist_au > 0 else extra
        prof["transitDays"] = rnd(days, 1)
        prof["transitFrom"] = via
        # port, defenses, settlements
        kinds = {p["kind"] for p in places}
        port = "orbital station" if stations else None
        if kinds & {"city", "port"}:
            port = "orbital station and spaceport" if port else "spaceport"
        elif kinds & {"landing", "town", "base"}:
            port = port or "landing field"
        prof["portClass"] = port or ("this is the port" if b["type"] == "station" else "none")
        defs = [label for f, label in (("orbital-guns", "orbital guns"), ("fortified", "fortified settlements"), ("picket", "picket")) if f in feats]
        defs += [s["name"] for s in stations if re.search(r"picket|gun|squadron|guard", s["id"] + s.get("class", ""))]
        defs += [p["name"] for p in places if p["kind"] == "base"]
        prof["defenses"] = defs
        main = max(settled, key=lambda p: (p.get("population", 0), p["kind"] in ("city", "town")), default=None)
        prof["settlements"] = {"count": len(settled), "main": main["name"] if main else None, "notable": [p["name"] for p in places[:6]]}
        # people
        pop = b.get("profile", {}).get("population")
        if pop is None:
            pop = sum(p.get("population", 0) for p in places) or (b.get("population") or 0)
        prof["population"] = pop
        prof["populationTrend"] = "uninhabited" if not pop else "stable"
        pres = {p["faction"]: p.get("strength", "minor") for p in (reg or {}).get("presence", []) + b.get("presence", [])}
        inhabited = bool(pop or settled)
        prof["peoples"] = [{"faction": f, "strength": s} for f, s in pres.items() if self.factions[f]["category"] == "people"] if inhabited else []
        faith_ids = [f for f, s in pres.items() if self.factions[f]["category"] == "faith" or "religions" in self.factions[f]["layers"]]
        prof["faiths"] = [{"faction": f, "strength": pres[f]} for f in faith_ids] if inhabited else []
        # economy
        exports = [RESOURCE_LABEL[f] for f in b.get("worldFeatures", []) if f in RESOURCE_LABEL]
        lat = b.get("lattice", {})
        worked = bool(feats & {"mining-camps", "lattice-seams"} and (settled or "mining-camps" in feats))
        if lat.get("rating") in ("moderate", "rich", "very rich", "exceptional") and worked:
            exports.insert(0, "lattice")
        imports = []
        if inhabited:
            if lat.get("rating") in (None, "none", "trace"):
                imports.append("lattice")
            if b.get("habitability") not in ("garden", "habitable"):
                imports.append("food")
            if stats and stats.get("surface") and not stats["surface"]["water"] and not stats["surface"]["ice"] and "water-ice-reserves" not in feats:
                imports.append("water")
            imports.append("printer feed")
        prof["exports"] = exports
        prof["imports"] = imports
        prof["printAccess"] = PRINT.get(holders[0], "licensed print shops") if inhabited and holders else ("none" if not inhabited else "unsigned prints")
        if not inhabited:
            food = water = "none needed (uninhabited)"
        else:
            hab = b.get("habitability")
            food = "exports food" if "arable-land" in feats else ("self-sufficient" if hab in ("garden", "habitable") else
                                                                   ("partly self-sufficient" if hab == "marginal" else "imports all food"))
            s = stats.get("surface") if stats else None
            water = "abundant" if s and s["water"] >= 30 else ("local" if (s and (s["water"] or s["ice"])) or "water-ice-reserves" in feats else "imported")
        prof["food"], prof["water"] = food, water
        prof["lattice"] = {"rating": lat.get("rating", "none"), **({"where": lat["where"]} if lat.get("where") else {}),
                           "worked": worked, "workedBy": holders if worked else []}
        # hazard
        if stats:
            base = {"garden": 1, "habitable": 2, "marginal": 3, "hostile": 4, "lethal": 5, "none": 4}[b["habitability"]]
            why = [f"{b['habitability']} world"]
            extra_h = [f for f in b.get("worldFeatures", []) if f in HAZARD_FEATURES]
            why += [f.replace("-", " ") for f in extra_h]
            prof["hazard"] = {"rating": max(1, min(5, base + (len(extra_h) + 1) // 2)), "reasons": why}
        else:
            prof["hazard"] = {"rating": 2 if b["type"] == "station" else 3, "reasons": ["station: sealed habitat"]}
        return prof

    def qcode(self, b, stats, prof):
        hab = {"garden": "G", "habitable": "H", "marginal": "M", "hostile": "X", "lethal": "L", "none": "N"}[b["habitability"]]
        br = {"breathable": "B", "breathable in season": "S", "breathable with a gas mix": "D", "mask required": "K",
              "mask for exertion": "K", "filter required": "F", "sealed suit": "U", "vacuum": "V", "no surface": "-"}[stats["breathability"]]
        press = "--" if stats["pressureAtm"] is None else f"{stats['pressureAtm']:g}atm"
        wat = "-" if not stats["surface"] else stats["surface"]["water"]
        pop = prof["population"]
        popc = "0" if not pop else (f"{pop / 1e6:.1f}M" if pop >= 1e6 else (f"{round(pop / 1e3)}K" if pop >= 1e3 else str(pop)))
        temp = stats["tempMeanC"]
        return (f"{self.typecode[b['world']]}/{hab} {stats['gravityG']:.1f}g {temp:+d}°C {press}/{br} "
                f"W{wat} H{prof['hazard']['rating']} S{prof['security']['rating']} P{popc}")


def merge(derived, authored):
    """Authored values win; nested objects merge one level down."""
    out = dict(derived)
    for k, v in (authored or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict) and k not in ("security", "hazard", "toMarrow"):
            out[k] = {**out[k], **v}
        else:
            out[k] = v
    return out


def derive(m):
    ctx = Ctx(m)
    for b in m["bodies"]:
        authored_stats, authored_prof = b.get("stats", {}), b.get("profile", {})
        if b.get("world"):
            st = merge(ctx.stats(b), authored_stats)
            b["stats"] = st
            pr = merge(ctx.profile(b, st), authored_prof)
            if pr.get("population") and pr.get("populationTrend") == "uninhabited":
                pr["populationTrend"] = authored_prof.get("populationTrend", "stable")
            pr["code"] = ctx.qcode(b, st, pr)
            b["profile"] = pr
        elif b["type"] == "station":
            pr = merge(ctx.profile(b, None), authored_prof)
            if pr.get("population") and pr.get("populationTrend") == "uninhabited":
                pr["populationTrend"] = authored_prof.get("populationTrend", "stable")
            b["profile"] = pr
    return m


if __name__ == "__main__":
    p = Path(sys.argv[1])
    m = json.loads(p.read_text())
    derive(m)
    p.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n")
    print(f"derived datablocks in {p}")
