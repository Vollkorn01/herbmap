#!/usr/bin/env python3
"""Look up the official TypoCH label for every habitat code in the rasterised map
by querying one sample location per code from the geo.admin.ch identify service."""
import json, sys, time
from pathlib import Path
import numpy as np, requests
from pyproj import Transformer
sys.path.insert(0, str(Path(__file__).parent))
import grid

CACHE = Path(__file__).resolve().parent.parent / ".cache"
codes = json.loads((CACHE / "habitat_codes.json").read_text())
out_path = CACHE / "habitat_labels.json"
labels = json.loads(out_path.read_text()) if out_path.exists() else {}
hab = np.load(CACHE / "habitat_fine.npy", mmap_mode="r")
T = grid.transform(grid.FINE_Z)
to_lv95 = Transformer.from_crs(3857, 2056, always_xy=True)
rng = np.random.default_rng(0)
for i, code in enumerate(codes, 1):
    if code in labels:
        continue
    ys, xs = np.nonzero(hab[::4, ::4] == i)
    if not len(ys):
        continue
    for attempt in range(6):
        k = rng.integers(len(ys))
        x, y = T * (xs[k] * 4 + 0.5, ys[k] * 4 + 0.5)
        e, n = to_lv95.transform(x, y)
        r = requests.get("https://api3.geo.admin.ch/rest/services/api/MapServer/identify", params={
            "geometryType": "esriGeometryPoint", "geometry": f"{e:.0f},{n:.0f}", "imageDisplay": "500,500,96",
            "mapExtent": f"{e-250:.0f},{n-250:.0f},{e+250:.0f},{n+250:.0f}", "tolerance": 0,
            "layers": "all:ch.bafu.lebensraumkarte-schweiz", "sr": 2056, "returnGeometry": "false", "lang": "de"}, timeout=30).json()
        found = [a["attributes"] for a in r.get("results", [])]
        hit = next((a for a in found if a["typoch_de"].split(" ")[0] == code), None)
        if hit:
            labels[code] = {"de": hit["typoch_de"].split(" ", 1)[1], "fr": hit["typoch_fr"].split(" ", 1)[1]}
            break
        time.sleep(0.2)
    print(code, labels.get(code, {}).get("de", "?"), flush=True)
out_path.write_text(json.dumps(labels, ensure_ascii=False, indent=1))
