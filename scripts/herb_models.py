#!/usr/bin/env python3
"""Habitat profiles for each herb, merged into data/herbs.json under "model".

habitats   affinity 0..1 per TypoCH habitat code (longest matching prefix wins),
           following Delarze et al. "Lebensräume der Schweiz" and Info Flora.
elev       [min, optimum from, optimum to, max] in metres
moisture   optimum range on the 0 (dry) .. 1 (wet) moisture index
light      "open" (full sun) | "half" (edges, light shade) | "shade" (forest floor)
lime       ["lime" | "acid", strength 0..1]
nutrients  ["rich" | "poor", strength 0..1]
warm       strength 0..1 of preference for warm, south-facing slopes
near       affinity for being close to water, forest edge, hedges/single trees,
           buildings (farms, villages) and paths — catches narrow strips the
           50 m habitat cells miss (stream banks, hedge rows, path verges)
forest     "broadleaf" | "conifer" preference inside forests
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LAWN = {"4.0.0.0.1": 0.5, "4.0.0.0.2": 0.5, "4.0.0.0.3": 0.4}

MODELS = {
    "chamomile": dict(
        habitats={"8.2": 0.85, "8.2.3": 0.6, "7.1": 0.8, "9.1": 0.5, "9.0.1": 0.4, "4.0.1": 0.35, "9.3.3": 0.35},
        elev=[190, 250, 750, 1200], moisture=[0.3, 0.6], light="open", nutrients=["rich", 0.5], warm=0.3,
        near={"paths": 0.35}),
    "yarrow": dict(
        habitats={"4.5.1": 1, "4.5.2": 0.9, "4.5.3": 0.9, "4.5.4": 0.7, "4.2.4": 0.8, "4.3": 0.5, "4.3.5": 0.6,
                  "4.0.1": 0.4, **LAWN, "7.1": 0.6, "8.1.5": 0.6, "9.3.3": 0.4, "4.1": 0.4},
        elev=[190, 300, 2000, 2700], moisture=[0.2, 0.55], light="open", near={"paths": 0.4, "edge": 0.3}),
    "stjohnswort": dict(
        habitats={"4.2.4": 1, "4.1": 0.6, "5.3": 0.45, "6.4": 0.5, "7.1": 0.6, "9.3.4": 0.6, "9.3.3": 0.4,
                  "4.5.1": 0.35, "4.5.3": 0.3, "3.2": 0.4, "8.1.6": 0.4, "9.1": 0.5},
        elev=[190, 300, 1200, 1700], moisture=[0.1, 0.45], light="open", warm=0.6,
        near={"edge": 0.7, "hedge": 0.5, "paths": 0.3}),
    "nettle": dict(
        habitats={"7.1": 0.9, "6.1": 1, "2.3.2": 0.8, "5.2": 0.8, "6.3.1": 0.6, "6.2.3": 0.35, "4.5.4": 0.4,
                  "9.2.2": 0.8, "9.1": 0.6, "8.1.5": 0.5, "6.3.3": 0.4},
        elev=[190, 300, 1600, 2400], moisture=[0.45, 0.85], light="half", nutrients=["rich", 1],
        near={"buildings": 0.8, "water": 0.6, "edge": 0.4, "hedge": 0.4}),
    "dandelion": dict(
        habitats={"4.5.1": 1, "4.5.2": 1, "4.5.3": 1, "4.5.4": 0.9, "4.0": 0.8, **{k: 0.8 for k in LAWN},
                  "4.0.1": 0.7, "7.1": 0.7, "8.1.5": 0.8, "9.3.3": 0.4, "4.2.4": 0.3, "4.3": 0.4},
        elev=[190, 300, 2000, 2800], moisture=[0.3, 0.7], light="open", nutrients=["rich", 0.7],
        near={"paths": 0.3, "buildings": 0.3}),
    "arnica": dict(
        habitats={"4.3.5": 1, "5.4": 0.6, "4.3.3": 0.4, "2.2.2": 0.5, "2.3.1": 0.5, "4.5.4": 0.2, "4.5.2": 0.25,
                  "6.6.2": 0.15, "6.5": 0.2, "4.2.4": 0.15},
        elev=[600, 1100, 2300, 2800], moisture=[0.25, 0.65], light="open", lime=["acid", 1],
        nutrients=["poor", 1]),
    "valerian": dict(
        habitats={"2.3.2": 1, "2.3.1": 0.7, "2.1.2.2": 0.6, "2.2.1": 0.4, "6.1": 0.8, "5.2": 0.7, "6.3.1": 0.4},
        elev=[190, 300, 1500, 2000], moisture=[0.6, 0.95], light="half", near={"water": 0.8, "edge": 0.3}),
    "thyme": dict(
        habitats={"4.2.4": 1, "4.1": 0.9, "4.3.1": 0.8, "4.3.2": 0.6, "4.3.3": 0.5, "4.3.5": 0.6, "3.3": 0.4,
                  "3.4": 0.3, "4.5.4": 0.4, "4.5.3": 0.3, "5.4": 0.4, "6.4": 0.4, "9.3.4": 0.3},
        elev=[190, 500, 2400, 3000], moisture=[0.05, 0.4], light="open", warm=0.6, nutrients=["poor", 0.8]),
    "elder": dict(
        habitats={"5.3": 1, "6.1": 0.8, "6.3": 0.5, "6.2.3": 0.4, "6.2.4": 0.4, "7.1": 0.6, "8.1.5": 0.4},
        elev=[190, 300, 1100, 1600], moisture=[0.4, 0.8], light="half", nutrients=["rich", 0.8],
        near={"hedge": 0.8, "edge": 0.7, "buildings": 0.6, "water": 0.4}),
    "plantain": dict(
        habitats={"4.5.1": 1, "4.5.3": 1, "4.2.4": 0.8, "4.5.2": 0.8, "4.0": 0.6, **{k: 0.6 for k in LAWN},
                  "4.0.1": 0.6, "7.1": 0.7, "9.3.3": 0.6, "8.1.5": 0.8, "8.1.6": 0.5, "4.5.4": 0.4},
        elev=[190, 300, 1400, 1900], moisture=[0.2, 0.6], light="open", near={"paths": 0.5}),
    "wildgarlic": dict(
        habitats={"6.1.4": 1, "6.1": 0.9, "6.3.1": 1, "6.2.3": 0.7, "6.2.4": 0.8, "6.3.3": 0.7, "6.3": 0.6,
                  "6.2": 0.5, "6.2.5": 0.4, "6.3.2": 0.6, "6.1.2": 0.6},
        elev=[190, 300, 1000, 1500], moisture=[0.5, 0.85], light="shade", lime=["lime", 0.5],
        nutrients=["rich", 0.7], forest="broadleaf", near={"water": 0.4}),
    "comfrey": dict(
        habitats={"2.3.2": 1, "2.1.2.2": 0.8, "6.1": 0.7, "5.2": 0.6, "7.1": 0.5, "4.5.1": 0.4, "2.3.1": 0.4},
        elev=[190, 250, 900, 1300], moisture=[0.6, 0.95], light="open", nutrients=["rich", 0.7],
        near={"water": 0.9, "paths": 0.2}),
    "bilberry": dict(
        habitats={"6.6.2": 1, "6.6": 0.8, "6.6.1": 0.8, "5.4": 1, "6.2.2": 0.7, "6.5": 0.8, "6.5.1": 0.6,
                  "6.2.5": 0.5, "4.3.5": 0.5, "5.3.9": 0.4, "6.4": 0.3},
        elev=[400, 900, 2200, 2600], moisture=[0.35, 0.8], light="half", lime=["acid", 1],
        nutrients=["poor", 0.8], forest="conifer"),
    "rosehip": dict(
        habitats={"5.3": 1, "4.2.4": 0.6, "6.4": 0.4, "7.1": 0.4, "4.5.3": 0.3, "9.3.4": 0.4},
        elev=[190, 300, 1300, 1800], moisture=[0.15, 0.55], light="open", lime=["lime", 0.3], warm=0.4,
        near={"hedge": 0.9, "edge": 0.7}),
    "lemonbalm": dict(
        habitats={"7.1": 0.8, "9.2": 0.4, "8.1.6": 0.7, "9.3.3": 0.3, "5.3": 0.3, "8.2.3": 0.5},
        elev=[190, 200, 700, 1000], moisture=[0.3, 0.6], light="open", warm=0.9, nutrients=["rich", 0.5],
        near={"buildings": 0.9}),
    "feverfew": dict(
        habitats={"7.1": 0.9, "9.2": 0.5, "9.1": 0.6, "9.3.3": 0.3, "8.2.3": 0.4, "9.0.1": 0.4},
        elev=[190, 250, 800, 1200], moisture=[0.2, 0.55], light="open", warm=0.6, near={"buildings": 1}),
    "ladysmantle": dict(
        habitats={"4.5.2": 1, "4.5.4": 1, "4.5.3": 0.7, "4.5.1": 0.5, "4.3.3": 0.7, "4.3.1": 0.5, "4.3.5": 0.6,
                  "4.4": 0.6, "2.3.2": 0.5, "5.2": 0.5, "4.3.2": 0.4},
        elev=[400, 900, 2300, 2800], moisture=[0.4, 0.8], light="open", near={"water": 0.3}),
    "hawthorn": dict(
        habitats={"5.3": 1, "6.3.3": 0.5, "6.2.1": 0.5, "6.4": 0.3, "4.2.4": 0.4},
        elev=[190, 300, 1000, 1500], moisture=[0.2, 0.6], light="open", warm=0.3,
        near={"hedge": 1, "edge": 0.8}),
    "linden": dict(
        habitats={"6.3.2": 1, "6.3.1": 0.8, "6.2.1": 0.5, "6.2.4": 0.5, "6.3.3": 0.6, "6.2.3": 0.4, "6.3": 0.5,
                  "6.2": 0.4},
        elev=[190, 300, 1000, 1500], moisture=[0.25, 0.65], light="half", lime=["lime", 0.3], warm=0.3,
        forest="broadleaf", near={"buildings": 0.3}),
    "coltsfoot": dict(
        habitats={"3.2.1": 0.9, "3.2.2": 0.8, "3.3": 0.7, "7.1": 0.7, "9.1": 0.9, "9.0.1": 0.7, "9.3.3": 0.4,
                  "4.1": 0.4, "2.1": 0.5},
        elev=[190, 300, 1800, 2400], moisture=[0.45, 0.85], light="open", lime=["lime", 0.5],
        near={"water": 0.4, "paths": 0.3}),
    "mullein": dict(
        habitats={"7.1": 0.8, "9.1": 0.8, "9.0.1": 0.7, "3.2.1": 0.7, "9.3.4": 0.7, "4.1": 0.6, "4.2.4": 0.4,
                  "3.3": 0.4, "6.4": 0.3},
        elev=[190, 300, 1400, 1900], moisture=[0.05, 0.4], light="open", warm=0.6, near={"paths": 0.3}),
    "meadowsweet": dict(
        habitats={"2.3.2": 1, "2.2.1": 0.6, "2.3.1": 0.7, "2.1.2.2": 0.7, "6.1": 0.7, "5.2": 0.7},
        elev=[190, 300, 1300, 1800], moisture=[0.7, 1], light="open", near={"water": 1}),
    "horsetail": dict(
        habitats={"8.2": 0.6, "7.1": 0.7, "9.3.4": 0.6, "9.1": 0.6, "3.2.1": 0.6, "2.3.2": 0.4, "4.0.1": 0.4,
                  "3.2.2": 0.5, "9.3.3": 0.4},
        elev=[190, 300, 1600, 2300], moisture=[0.5, 0.85], light="open", near={"water": 0.5, "paths": 0.4}),
    "gentian": dict(
        habitats={"4.3.1": 0.9, "4.2.4": 0.7, "4.5.4": 0.7, "4.5.2": 0.6, "4.3.3": 0.8, "4.3.5": 0.5, "5.4": 0.3},
        elev=[800, 1100, 2100, 2500], moisture=[0.25, 0.6], light="open", lime=["lime", 0.7]),
    "cowslip": dict(
        habitats={"4.2.4": 1, "4.5.1": 0.6, "4.5.2": 0.5, "6.2.1": 0.6, "6.4": 0.6, "6.3.3": 0.4, "5.3": 0.3},
        elev=[190, 300, 1500, 2000], moisture=[0.15, 0.5], light="open", lime=["lime", 0.7], warm=0.4,
        near={"edge": 0.5}),
    "juniper": dict(
        habitats={"4.2.4": 0.6, "4.3": 0.6, "4.3.5": 0.6, "5.4": 1, "6.4": 0.8, "6.4.3": 0.9, "4.5.4": 0.3,
                  "3.3": 0.3},
        elev=[300, 600, 2400, 2900], moisture=[0.05, 0.45], light="open", warm=0.5, nutrients=["poor", 0.8]),
    "mallow": dict(
        habitats={"7.1": 1, "9.1": 0.6, "9.0.1": 0.5, "9.3.3": 0.4, "9.2": 0.4, "8.2.3": 0.4, "8.1.6": 0.4},
        elev=[190, 200, 800, 1100], moisture=[0.25, 0.6], light="open", warm=0.6, nutrients=["rich", 0.8],
        near={"buildings": 0.9, "paths": 0.5}),
    "marjoram": dict(
        habitats={"4.2.4": 1, "5.3": 0.4, "6.4": 0.6, "6.2.1": 0.5, "4.1": 0.5, "9.3.4": 0.4, "7.1": 0.3},
        elev=[190, 300, 1300, 1800], moisture=[0.1, 0.45], light="open", lime=["lime", 0.7], warm=0.7,
        near={"edge": 0.8, "hedge": 0.5}),
    "masterwort": dict(
        habitats={"5.2": 1, "4.5.4": 0.6, "2.3.2": 0.6, "5.3.9": 0.8, "4.5.2": 0.4, "4.3.3": 0.5, "3.3": 0.3},
        elev=[1000, 1300, 2300, 2700], moisture=[0.55, 0.9], light="open", lime=["acid", 0.3],
        nutrients=["rich", 0.6], near={"water": 0.6, "buildings": 0.4}),
    "woodruff": dict(
        habitats={"6.2.3": 1, "6.2.4": 0.9, "6.2.5": 0.8, "6.2": 0.7, "6.3.1": 0.6, "6.3.2": 0.6, "6.3.3": 0.6,
                  "6.2.1": 0.3, "6.2.2": 0.2},
        elev=[250, 400, 1300, 1600], moisture=[0.35, 0.7], light="shade", forest="broadleaf"),
    "hops": dict(
        habitats={"6.1": 1, "5.3": 0.7, "2.1.2.2": 0.4, "6.3.3": 0.3},
        elev=[190, 250, 900, 1300], moisture=[0.55, 0.9], light="half", nutrients=["rich", 0.7],
        near={"water": 0.8, "hedge": 0.6, "edge": 0.5}),
    "selfheal": dict(
        habitats={"4.5.3": 1, "4.5.1": 0.8, "4.5.2": 0.8, "4.5.4": 0.7, **{k: 0.6 for k in LAWN}, "2.3.2": 0.5,
                  "2.3.1": 0.5, "9.3.3": 0.5, "4.2.4": 0.4},
        elev=[190, 300, 1600, 2100], moisture=[0.35, 0.75], light="open", near={"paths": 0.5}),
    "birch": dict(
        habitats={"6.5": 1, "6.5.1": 1, "2.4.1": 0.5, "5.3": 0.4, "6.4": 0.5, "6.2.2": 0.4, "3.2.1": 0.4,
                  "9.1": 0.5, "6.6": 0.2},
        elev=[190, 300, 1600, 2000], moisture=[0.2, 0.9], light="open", lime=["acid", 0.4],
        near={"edge": 0.6, "hedge": 0.5}),
    "mint": dict(
        habitats={"2.3.2": 1, "2.1.2.2": 0.8, "2.2.1": 0.6, "6.1.2": 0.6, "4.5.4": 0.5, "5.2": 0.6, "3.2.1": 0.5,
                  "7.1": 0.4},
        elev=[190, 300, 1700, 2200], moisture=[0.65, 1], light="open", nutrients=["rich", 0.5],
        near={"water": 1}),
    "lungwort": dict(
        habitats={"6.2.3": 0.9, "6.2.4": 0.9, "6.3.3": 0.9, "6.3.1": 0.8, "6.1.4": 0.8, "6.3.2": 0.7, "6.2": 0.6,
                  "6.3": 0.6, "5.3": 0.4},
        elev=[250, 300, 1000, 1500], moisture=[0.4, 0.75], light="shade", lime=["lime", 0.6],
        forest="broadleaf", near={"edge": 0.3}),
    "groundivy": dict(
        habitats={"6.1": 0.8, "6.1.4": 0.9, "6.3.3": 0.7, "6.3": 0.6, "5.3": 0.7, "4.5.1": 0.6, "4.5.3": 0.6,
                  "7.1": 0.6, "8.1.5": 0.7, **LAWN, "2.3.2": 0.5},
        elev=[190, 250, 1000, 1500], moisture=[0.45, 0.8], light="half", nutrients=["rich", 0.6],
        near={"hedge": 0.6, "edge": 0.6, "buildings": 0.3}),
}

if __name__ == "__main__":
    path = ROOT / "data" / "herbs.json"
    herbs = json.loads(path.read_text())
    for h in herbs:
        h["model"] = MODELS[h["id"]]
    assert set(MODELS) == {h["id"] for h in herbs}
    path.write_text(json.dumps(herbs, ensure_ascii=False, indent=1))
    print("wrote models for", len(herbs), "herbs")
