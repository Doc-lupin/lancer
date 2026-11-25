"""Derive the datablock (stats and profile) for worlds and stations.

Called by tools/build_map.py after assembly, or alone:
  python3 tools/derive_stats.py FILE      derive in place (e.g. the example map)

`stats` holds physical figures and comparisons to Union standard (Earth = 1).
`profile` holds travel, control, people, economy and ratings, written as the
Basin's public survey and trade registers would record them.
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
LATTICE_RANK = ["none", "trace", "small", "moderate", "rich", "very rich", "exceptional"]
RESOURCE_NAME = {"arable-land": "arable land", "grazing-land": "grazing land", "fisheries": "fisheries", "timber": "timber stands",
                 "medicinal-flora": "medicinal plants", "water-ice-reserves": "water ice"}
OUTPOST = 200  # below this many people, an outpost is supplied by its holder rather than trading on its own
LIVING_RESOURCES = {"timber", "fisheries", "arable-land", "grazing-land", "medicinal-flora"}
ACTIVITY = [("refinery", "refining"), ("orbital-yards", "shipbuilding"), ("mining-camps", "mining"), ("mine", "mining"),
            ("arable-land", "farming"), ("homesteads", "farming"), ("grazing-land", "ranching"), ("fisheries", "fishing"),
            ("timber", "forestry"), ("free-port", "free-port trade"), ("salvage", "salvage"), ("traffic-hub", "shipping services"),
            ("mission", "mission work"), ("survey-camp", "survey work"), ("survey-beacon", "survey work"), ("refugee-settlements", "relief work"), ("base", "garrison")]
STATION_ACTIVITY = [("quarantine", "quarantine enforcement"), ("staging", "staging and transshipment"), ("picket", "Navy picket and levy collection"), ("relay", "communications"), ("research", "research"),
                    ("survey", "survey work"), ("signal", "signal research"), ("salvage", "salvage"), ("shipyard", "shipbuilding"),
                    ("yards", "ship repair and refit"), ("gun", "defense"), ("armed", "defense and passage control"),
                    ("fuel", "fuel and water supply"), ("mining", "mining and smelting"), ("prospect", "lattice prospecting"),
("receiving", "receiving and transshipment"), ("anchored", "water, fuel and freight"),
                    ("hulls", "free-port trade"), ("asteroid", "finance, exchange and government"), ("shielded", "lattice gathering"),
                    ("claim", "lattice mining"), ("raider", "raiding"), ("hidden", "raiding and smuggling"), ("hideout", "salvage and raiding"),
                    ("platform", "research"), ("anchorage", "unknown")]
# Commodity classes, matched in order against a good's name.
CLASSES = [("composite", "manufactures"), ("lattice", "lattice"), ("printer feed", "printer feed"), ("grain", "food"), ("meat", "food"),
           ("fish", "food"), ("seed", "food"), ("food", "food"), ("water", "water"), ("reaction mass", "water"), ("ice", "water"),
           ("frames", "frames"), ("frigate", "ships"), ("corvette", "ships"), ("ships", "ships"), ("refit", "ships"), ("hull", "ships"),
           ("timber", "timber"), ("medicine", "medicines"), ("ore", "metal"), ("iron", "metal"), ("nickel", "metal"), ("metal", "metal"),
           ("rare earth", "metal"), ("precious", "metal"), ("radioactive", "metal"), ("helium-3", "fuel"), ("deuterium", "fuel"),
           ("hydrocarbon", "fuel"), ("volatile", "fuel"), ("salvage", "salvage"), ("absent", "salvage"), ("stone", "stone"),
           ("pattern", "patterns"), ("design", "patterns"), ("prints", "patterns"), ("munitions", "munitions"), ("exotic", "exotics"),
           ("shielding", "manufactures"), ("machine", "manufactures"), ("supplies", "manufactures"), ("fittings", "manufactures"),
           ("freight", "services"), ("moorage", "services"), ("banking", "services"), ("credit", "services"), ("contracts", "services"),
           ("insurance", "services"), ("passage", "services"), ("brokerage", "services")]
# Lattice markets: where lattice is sold and bought. Everything else trades between producers and buyers directly.
MARKET_NAMES = {"marrow": "the Assay House (the Marrow)", "sable-harbor-port": "Sable Harbor", "halvards-rest": "the Halvard's Rest refinery"}
LATTICE_MARKET = {"northern-concord": ["marrow"], "mercer-ibarra": ["marrow"], "stewardship": ["marrow"], "rimelight": ["marrow", "sable-harbor-port"],
                  "kerr-varga": ["marrow", "sable-harbor-port"], "southern-league": ["halvards-rest", "sable-harbor-port"],
                  "gatherers-guild": ["sable-harbor-port"], "seventh": ["sable-harbor-port"], "purview": []}
ALIGN_MARKET = {"crossroads": ["marrow"], "gap-accord": ["halvards-rest"], "trailing-traders": ["sable-harbor-port"], "outlaw": ["sable-harbor-port"]}
INTERNAL = {"purview": "the Purview yards and the Armory"}
SETTLED_KINDS = {"city", "town", "settlement", "camp", "base", "port", "mine", "refinery", "landing"}
NOUN = {"planet": "planet", "moon": "moon", "gas-giant": "giant", "rogue-planet": "planet", "asteroid": "body"}


def rank(rating):
    return LATTICE_RANK.index(rating) if rating in LATTICE_RANK else -1


def classify(good):
    g = good.lower()
    return next((c for k, c in CLASSES if re.search(r"\b" + re.escape(k), g)), "goods")


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

    def route(self, start, goals, avoid=()):
        """Shortest lane route in days from a region to any goal region, optionally avoiding regions."""
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
                if nb in avoid and nb not in goals:
                    continue
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
    def seen(self, b, objs):
        """Objects that may inform b's datablock: a visible body's draws only on visible objects."""
        if b.get("visibility") == "gm":
            return list(objs)
        return [o for o in objs if o.get("visibility") != "gm"]

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
            if "still-air" in feats and precip in ("moderate", "wet", "torrential"):
                precip = "light"  # calm air carries little weather
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
            rad += 2
        if p is not None and p < 0.005:
            rad += 1
        if p is not None and p >= 1:
            rad -= 1
        if "strong-magnetosphere" in feats and not giant:
            rad -= 1
        radiation = ["low", "low", "moderate", "high", "lethal"][max(0, min(4, rad))] if not giant else "high in the belts" if "radiation-belts" in feats else "moderate"
        # sky
        moons = [c for c in self.seen(b, self.children.get(b["id"], [])) if c["type"] in ("moon", "asteroid")]
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
            "sizeClass": size_class(r, giant), "diameterKm": round(2 * r), "radiusRel": rnd(r / 6371, 2), "massRel": float(f"{mass:.3g}"),
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
        places = self.seen(b, self.places_by_body.get(b["id"], []))
        stations = [c for c in self.seen(b, self.children.get(b["id"], [])) if c["type"] == "station"]
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
        elif control["status"] == "contested":
            claims = "disputed between " + " and ".join(self.factions[h]["name"] for h in holders)
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
        if any(a["body"] == b["id"] and a["control"]["status"] == "contested" for a in self.seen(b, self.m["areas"])):
            sec += 1; why.append("contested ground on the surface")
        if "fortified" in feats:
            sec -= 1; why.append("offset by fortified settlements")
        prof["security"] = {"rating": max(1, min(5, sec)), "reasons": why}  # a default reason is set once navy reach is known
        # navy reach and distance to the Marrow
        rid = sysm.get("region")
        if rid in ("ostrom", "tallis"):
            prof["navyReach"] = "Navy home waters"
        elif rid:
            nd, _, _, _ = self.route(rid, {"ostrom", "tallis"})
            prof["navyReach"] = "beyond the Navy's reach" if nd is None or nd > 6 else ("within patrol range" if nd <= 3 else "occasional patrols")
        else:
            prof["navyReach"] = "beyond the Navy's reach"
        if not prof["security"]["reasons"]:
            near = prof["navyReach"] in ("Navy home waters", "within patrol range")
            prof["security"]["reasons"] = ["settled and policed" if (settled or stations or b["type"] == "station") and near else "no recorded threats"]
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
        big_town = any(p["kind"] == "town" and p.get("population", 0) >= 10000 for p in places)
        port = "orbital station" if stations else None
        if kinds & {"city", "port"} or big_town or (feats & {"capital", "traffic-hub"} and settled and b["type"] != "station"):
            port = "orbital station and spaceport" if port else "spaceport"
        elif kinds & {"landing", "town", "base"}:
            port = port or "landing field"
        elif kinds & {"camp", "mine", "refinery", "settlement"} or b.get("profile", {}).get("population"):
            port = port or "landing pad"
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
        # economy: trade partners are filled in by trade() once every profile exists
        lat = b.get("lattice", {})
        rating = lat.get("rating", "none")
        working = bool(feats & {"mining-camps", "refinery", "company-town"} or kinds & {"mine", "refinery"})
        worked = inhabited and rank(rating) >= rank("small") and bool(feats & {"mining-camps", "lattice-seams"}) and working
        res = []
        for f in b.get("worldFeatures", []):
            if f not in RESOURCE_LABEL:
                continue
            label = RESOURCE_NAME.get(f, RESOURCE_LABEL[f])
            if "quarantine" in feats:
                status = "closed by quarantine"
            elif inhabited and ((f in LIVING_RESOURCES and (pop >= 1000 or "homesteads" in feats)) or (f not in LIVING_RESOURCES and working)):
                status = "worked"
            elif "allotment-claims" in feats or "disputed-claims" in feats or holders:
                status = "claimed, unworked"
            else:
                status = "unworked"
            res.append({"resource": label, "status": status})
        goods = {RESOURCE_NAME.get(f, RESOURCE_LABEL[f]): RESOURCE_LABEL[f] for f in b.get("worldFeatures", []) if f in RESOURCE_LABEL}
        exports = [goods[r["resource"]] for r in res if r["status"] == "worked"]
        if worked:
            exports.insert(0, "lattice")
        imports = []
        if inhabited and pop < OUTPOST:
            seat = (self.factions[holders[0]].get("seat") or [None])[0] if holders else None
            src = (self.factions[holders[0]]["name"] + (f" ({self.regions[seat]['name']})" if seat in self.regions else "")) if holders else "passing traders"
            imports.append({"good": "supplies", "from": src})
        elif inhabited:
            if not worked:
                imports.append("lattice")
            if b.get("habitability") not in ("garden", "habitable") and not feats & {"fisheries", "arable-land"}:
                imports.append("food")
            if stats and stats.get("surface") and not stats["surface"]["water"] and not stats["surface"]["ice"] and "water-ice-reserves" not in feats:
                imports.append("water")
            imports.append("printer feed")
        hab = b.get("habitability")
        if not inhabited:
            food = water = None
        else:
            food = ("self-sufficient, with a surplus for export" if feats & {"arable-land", "grazing-land", "fisheries"} and hab in ("garden", "habitable")
                    else "self-sufficient" if hab in ("garden", "habitable")
                    else "partly local, the rest imported" if hab == "marginal" or feats & {"fisheries", "arable-land"}
                    else "imported")
            s_ = stats.get("surface") if stats else None
            water = ("abundant" if s_ and s_["water"] >= 30 else
                     "local, from ice" if (s_ and s_["ice"]) or "water-ice-reserves" in feats else
                     "local" if s_ and s_["water"] else "imported")
        prof["economy"] = {
            "base": self.activity(b, feats, kinds, worked, inhabited),
            "exports": [{"good": g} for g in exports],
            "imports": [i if isinstance(i, dict) else {"good": i} for i in imports],
            "resources": res,
            "levies": [],
            "printAccess": PRINT.get(holders[0], "licensed print shops") if inhabited and holders else ("none" if not inhabited else "unsigned prints"),
            "food": food, "water": water}
        prof["lattice"] = {"rating": rating, **({"where": lat["where"]} if lat.get("where") else {}),
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

    def activity(self, b, feats, kinds, worked, inhabited):
        """Primary economic activity, from features, places and station class."""
        if not inhabited:
            return "none"
        if b["type"] == "station":
            c = (b.get("class") or b["id"]).lower()
            for key, label in STATION_ACTIVITY:
                if key in c or key in b["id"]:
                    return label
            return "station services"
        acts = []
        for key, label in ACTIVITY:
            if key in feats or key in kinds:
                if label == "mining" and worked:
                    label = "lattice mining"
                if label not in acts:
                    acts.append(label)
        return " and ".join(acts[:2]) or "subsistence"

    def qcode(self, b, stats, prof):
        hab = {"garden": "G", "habitable": "H", "marginal": "M", "hostile": "X", "lethal": "L", "none": "N"}[b["habitability"]]
        br = {"breathable": "B", "breathable in season": "S", "breathable with a gas mix": "D", "mask required": "K",
              "mask for exertion": "K", "filter required": "F", "sealed suit": "U", "vacuum": "V", "no surface": "-"}[stats["breathability"]]
        press = "--" if stats["pressureAtm"] is None else f"{stats['pressureAtm']:g}atm"
        wat = "-" if not stats["surface"] else stats["surface"]["water"]
        pop = prof["population"]
        popc = "0" if not pop else (f"{pop / 1e6:.1f}M" if pop >= 1e6 else (f"{round(pop / 1e3)}K" if pop >= 1e3 else str(pop)))
        temp = stats["tempMeanC"]
        g = stats["gravityG"]
        gs = f"{g:.1f}" if g >= 0.1 else f"{g:.2f}"
        return (f"{self.typecode[b['world']]}/{hab} {gs}g {temp:+d}°C {press}/{br} "
                f"W{wat} H{prof['hazard']['rating']} S{prof['security']['rating']} P{popc}")


def trade(ctx, m):
    """Fill in where exports go, where imports come from, and the levies on the way.

    Lattice is sold to a market (the Assay House, Sable Harbor or the Halvard's Rest
    refinery) chosen by the seller's allegiance, and bought from the market nearest
    the buyer's allegiance; a small lattice rating supplies only its own region.
    Other goods come from the nearest producer by lane days, and an exporter's
    destinations are exactly the regions of the buyers that chose it.
    """
    MARKETS = {k: v for k, v in MARKET_NAMES.items() if k in ctx.bodies}
    traders = [b for b in m["bodies"] if b.get("profile", {}).get("economy")]
    region = {b["id"]: ctx.systems[b["system"]].get("region") for b in traders}
    rname = lambda r: ctx.regions[r]["name"] if r in ctx.regions else "uncharted space"
    dist_cache = {}

    sable = region.get("sable-harbor-port") or "sable"

    def dist(a, b, avoid=()):
        """Lane days; trade with Sable Harbor keeps clear of Ostrom, which is how its lattice stays levy-free."""
        if a == b:
            return 0
        avoid = tuple(avoid) or (("ostrom",) if sable in (a, b) and "ostrom" not in (a, b) else ())
        if (a, b, avoid) not in dist_cache:
            d, pth, _, _ = ctx.route(a, {b}, avoid) if a and b else (None, None, False, False)
            if d is None and avoid:
                d, pth, _, _ = ctx.route(a, {b})
            dist_cache[(a, b, avoid)] = (d if d is not None else 1e9, pth or [])
        return dist_cache[(a, b, avoid)][0]

    def path(a, b):
        if a == b:
            return [a]
        dist(a, b)
        avoid = ("ostrom",) if sable in (a, b) and "ostrom" not in (a, b) else ()
        return dist_cache[(a, b, avoid)][1]

    def holders(b):
        c = b.get("control") or ctx.systems[b["system"]].get("control") or (ctx.regions.get(region[b["id"]]) or {}).get("control") or {}
        return c.get("holders", [])

    def align(b):
        hs = holders(b)
        return ctx.factions[hs[0]].get("alignment") if hs else None

    def label(sup, buyer_region):
        name = sup["name"]
        r = region[sup["id"]]
        return name if r == buyer_region or rname(r) == name else f"{name} ({rname(r)})"

    for b in traders:
        for x in b["profile"]["economy"]["exports"] + b["profile"]["economy"]["imports"]:
            x.setdefault("class", classify(x["good"]))
    visible = lambda b: b.get("visibility") != "gm"
    pop = lambda b: b["profile"].get("population", 0)
    suppliers = {}
    for b in traders:
        if pop(b) or b["profile"]["settlements"]["count"]:
            for x in b["profile"]["economy"]["exports"]:
                suppliers.setdefault(x["class"], []).append(b)
    buyers = {}      # (supplier id, class) -> [buyer region ids]
    routes = {}      # body id -> [(region path, class)]

    def record(sup, cls, buyer):
        if visible(buyer) or not visible(sup):
            buyers.setdefault((sup["id"], cls), []).append(region[buyer["id"]])
        routes.setdefault(buyer["id"], []).append((path(region[buyer["id"]], region[sup["id"]]), cls))
        routes.setdefault(sup["id"], []).append((path(region[sup["id"]], region[buyer["id"]]), cls))

    byname = {o["name"]: o for o in traders}
    byname.update({v: ctx.bodies[k] for k, v in MARKETS.items()})
    for b in traders:  # authored sources register the buyer with the supplier
        for i in b["profile"]["economy"]["imports"]:
            if i.get("from") in byname:
                sup = byname[i["from"]]
                record(sup, i["class"], b)
                if i["from"] not in MARKETS.values():
                    i["from"] = label(sup, region[b["id"]])

    def markets_for(b, selling):
        hs = holders(b)
        out = []
        for h in hs or [None]:
            ms = LATTICE_MARKET.get(h)
            if ms is None:
                ms = ALIGN_MARKET.get(ctx.factions[h].get("alignment") if h else None)
            if ms is None:  # independent or unheld: the nearest open market
                ms = [min([k for k in ("marrow", "sable-harbor-port") if k in MARKETS] or ["marrow"], key=lambda k: dist(region.get(b["id"]), region.get(k)))]
            out += [k for k in ms if k != b["id"] and k not in out and k in MARKETS]
        return out

    # 1. lattice sellers to markets
    for b in traders:
        eco = b["profile"]["economy"]
        for x in eco["exports"]:
            if x["class"] != "lattice" or "to" in x or b["id"] in MARKETS:
                continue
            hs = holders(b)
            if rank(b["profile"]["lattice"]["rating"]) == rank("small"):
                local = [o for o in traders if o is not b and region[o["id"]] == region[b["id"]]
                         and any(i["class"] == "lattice" for i in o["profile"]["economy"]["imports"])]
                x["to"] = [o["name"] for o in local] or ["local printers"]
                for o in local:
                    for i in o["profile"]["economy"]["imports"]:
                        if i["class"] == "lattice" and "from" not in i:
                            i["from"] = label(b, region[o["id"]])
                    routes.setdefault(b["id"], []).append(([region[b["id"]]], "lattice"))
                continue
            internal = [INTERNAL[h] for h in hs if h in INTERNAL]
            ms = markets_for(b, True)
            x["to"] = internal + [MARKETS[k] for k in ms]
            x["to"] = x["to"] or ["the Exchange (the Marrow)"]
            if internal and len(hs) == 1:
                continue
            for k in ms:
                mk = ctx.bodies[k]
                buyers.setdefault((k, "lattice-in"), []).append(region[b["id"]])
                routes.setdefault(b["id"], []).append((path(region[b["id"]], region[k]), "lattice"))
    # 2. markets buy from their sellers; 3. other lattice buyers draw on a market or their own holder's mines
    for b in traders:
        for i in b["profile"]["economy"]["imports"]:
            if i["class"] != "lattice" or "from" in i:
                continue
            if b["id"] in MARKETS:
                regs = buyers.get((b["id"], "lattice-in"), [])
                regs = ["local mines" if r == region[b["id"]] else rname(r) for r in regs]
                names = sorted(set(regs), key=lambda n: -regs.count(n))
                i["from"] = ", ".join(names[:5]) if names else "miners across the Basin"
                continue
            own = [o for o in traders if o is not b and set(holders(o)) & set(holders(b)) and (visible(o) or not visible(b))
                   and any(x["class"] == "lattice" for x in o["profile"]["economy"]["exports"])
                   and (set(holders(o)) & set(INTERNAL) or dist(region[b["id"]], region[o["id"]]) <= 12)]
            if own:  # a holder's own mines or market come first
                sup = min(own, key=lambda o: (dist(region[b["id"]], region[o["id"]]), -pop(o)))
                i["from"] = label(sup, region[b["id"]])
                record(sup, "lattice", b)
                continue
            ms = markets_for(b, False)
            if not ms:
                i["from"] = "the Exchange (the Marrow)"
                continue
            k = min(ms, key=lambda k: dist(region[b["id"]], region[k]))
            i["from"] = MARKETS[k]
            record(ctx.bodies[k], "lattice", b)
    for b in traders:  # sellers whose lattice also feeds their holder's own stations
        for x in b["profile"]["economy"]["exports"]:
            if x["class"] == "lattice" and "to" in x and b["id"] not in MARKETS:
                for r in dict.fromkeys(buyers.get((b["id"], "lattice"), [])):
                    n = "local buyers" if r == region[b["id"]] else rname(r)
                    if not any(n in t for t in x["to"]):
                        x["to"].append(n)
    # 4. everything else: the nearest producer, or the Marrow's Exchange when nobody produces it
    for b in traders:
        for i in b["profile"]["economy"]["imports"]:
            if "from" in i:
                continue
            cands = [o for o in suppliers.get(i["class"], []) if o is not b and (visible(o) or not visible(b))]
            if not cands:
                i["from"] = ("suppliers across the Basin" if b["id"] == "marrow" else
                             "the Exchange (the Marrow)" if align(b) not in ("trailing-traders", "outlaw") else "Sable Harbor")
                continue
            sup = min(cands, key=lambda o: (dist(region[b["id"]], region[o["id"]]), -pop(o)))
            i["from"] = label(sup, region[b["id"]])
            record(sup, i["class"], b)
    # destinations for exports
    for b in traders:
        for x in b["profile"]["economy"]["exports"]:
            if "to" in x:
                continue
            regs = buyers.get((b["id"], x["class"]), [])
            if regs:
                order = sorted(set(regs), key=lambda r: (-regs.count(r), dist(region[b["id"]], r)))
                x["to"] = [("local buyers" if r == region[b["id"]] else rname(r)) for r in order[:6]]
                if len(order) > 6:
                    x["to"].append(f"{len(order) - 6} other regions")
                if b["id"] in MARKETS and x["class"] == "lattice":
                    for k in markets_for(b, True):
                        x["to"].append(MARKETS[k])
                        routes.setdefault(b["id"], []).append((path(region[b["id"]], region[k]), "lattice"))
            elif x["class"] == "services":
                x["to"] = ["passing ships"]
            elif any(i["class"] == x["class"] for o in traders if o is not b and visible(o) for i in o["profile"]["economy"]["imports"]):
                imp = [o for o in traders if o is not b and visible(o) and any(i["class"] == x["class"] for i in o["profile"]["economy"]["imports"])]
                near = min(dist(region[b["id"]], region[o["id"]]) for o in imp)
                regs = list(dict.fromkeys(region[o["id"]] for o in imp if dist(region[b["id"]], region[o["id"]]) == near))
                x["to"] = [("local buyers" if r == region[b["id"]] else rname(r)) for r in regs]
                routes.setdefault(b["id"], []).append((path(region[b["id"]], regs[0]), x["class"]))
            else:
                a = align(b)
                k = "sable-harbor-port" if a in ("trailing-traders", "outlaw") else "halvards-rest" if a == "gap-accord" and b["id"] != "halvards-rest" else "marrow"
                x["to"] = ["the Exchange (the Marrow)" if k == "marrow" or k not in ctx.bodies else ctx.bodies[k]["name"]]
                if k in region:
                    routes.setdefault(b["id"], []).append((path(region[b["id"]], region[k]), x["class"]))
    # levies along the routes
    for b in traders:
        eco = b["profile"]["economy"]
        hs = set(holders(b))
        lev = []
        feats = set(b.get("worldFeatures", []))
        for pth, cls in routes.get(b["id"], []):
            pairs = set(zip(pth, pth[1:])) | set(zip(pth[1:], pth))
            if cls == "lattice" and "ostrom" in pth:
                lev.append("Navy tithe: a tenth of lattice crossing Ostrom")
            if ("halvard", "ferrous") in pairs and "mercer-ibarra" not in hs:
                lev.append("Mercer-Ibarra passage fee on the Halvard Gap")
            if "shoals" in pth and "purview" not in hs:
                lev.append("Purview entry tax on ships entering the Shoals")
            if ("sable", "tarn") in pairs:
                lev.append("the Tallymen's tally on the Sable Run (protection)")
        if "free-port" in feats:
            lev.append("no levy or inspection at the free port")
        if "picket" in feats:
            lev.append("levies collected by the picket")
        eco["levies"] = list(dict.fromkeys(lev + eco["levies"]))
        lat = b["profile"]["lattice"]
        if rank(lat["rating"]) >= rank("small") and any(x["class"] == "lattice" for x in eco["exports"]) and b["id"] not in MARKETS:
            lat["worked"], lat["workedBy"] = True, holders(b)
        if any(i["good"] == "supplies" for i in eco["imports"]) and eco["food"] is not None:
            eco["food"] = eco["food"] if eco["food"].startswith("self") else "shipped in with supplies"
            eco["water"] = eco["water"] if eco["water"] != "imported" else "shipped in with supplies"
        elif eco["food"] is not None:
            cls_in = {i["class"] for i in eco["imports"]} | ({"food", "water"} if any(i["good"] == "supplies" for i in eco["imports"]) else set())
            cls_out = {x["class"] for x in eco["exports"]}
            if "food" in cls_out and "food" in cls_in:
                eco["food"] = (f"a surplus of {' and '.join(x['good'] for x in eco['exports'] if x['class'] == 'food')} exported; "
                               f"{' and '.join(i['good'] for i in eco['imports'] if i['class'] == 'food')} imported")
            elif "food" in cls_out:
                eco["food"] = "self-sufficient, with a surplus for export"
            elif "food" in cls_in:
                eco["food"] = "partly local, the rest imported" if b.get("habitability") in ("garden", "habitable", "marginal") else "imported"
            elif not eco["food"].startswith("self") and b["type"] != "station":
                eco["food"] = "self-sufficient"
            if "water" in cls_out:
                eco["water"] = eco["water"] if eco["water"] != "imported" else "local, from ice"
            elif "water" in cls_in:
                eco["water"] = "imported"
            elif eco["water"] == "imported":
                eco["water"] = "recycled aboard" if b["type"] == "station" else "local, from ice"


def merge(derived, authored):
    """Authored values win; nested objects merge one level down."""
    out = dict(derived)
    for k, v in (authored or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict) and k not in ("security", "hazard", "toMarrow"):
            out[k] = {**out[k], **v}
        else:
            out[k] = v
    return out


def authored_economy(pr):
    eco = pr.get("economy")
    if not eco:
        return pr
    for k in ("exports", "imports"):
        if k in eco:
            eco[k] = [{"good": x} if isinstance(x, str) else dict(x) for x in eco[k]]
    return pr


def derive(m):
    ctx = Ctx(m)
    for b in m["bodies"]:
        if b.get("profile"):
            authored_economy(b["profile"])
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
    for b in m["bodies"]:
        pr = b.get("profile")
        if pr and b["type"] != "station" and not pr.get("population") and pr.get("settled") and pr["surveyStatus"] == "settled":
            pr["surveyStatus"] = "surveyed"
        if pr and b["type"] != "station" and not pr.get("population") and pr.get("populationTrend") in (None, "uninhabited", "stable") and pr.get("settled"):
            pr["populationTrend"] = "abandoned"
        if pr:
            for k in ("exports", "imports"):  # an authored 'from' may name a body by id
                for x in pr["economy"][k]:
                    for f in ("from",):
                        if x.get(f) in ctx.bodies:
                            x[f] = ctx.bodies[x[f]]["name"]
    trade(ctx, m)
    return m


if __name__ == "__main__":
    p = Path(sys.argv[1])
    m = json.loads(p.read_text())
    for b in m["bodies"]:  # start again from the authored part: populations and settlement dates
        b.pop("stats", None)
        if "profile" in b:
            b["profile"] = {k: v for k, v in b["profile"].items() if k in ("population", "populationTrend", "settled")}
            if not b["profile"]:
                del b["profile"]
    derive(m)
    p.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n")
    print(f"derived datablocks in {p}")
