#!/usr/bin/env python3
"""Build the Swiss herb likelihood grid from GBIF occurrence records.

For every herb we download GBIF density tiles (records since 1990, country = CH)
binned into squares that match Web-Mercator zoom-14 tiles (~1.7 km x 1.7 km in
Switzerland). Most records are reported on a ~5 km grid, so values are smoothed
with a Gaussian kernel; the effective resolution is roughly 5 km. We do the same for *all* vascular plants, which measures how much
botanists have recorded in each square.

likelihood = smoothed share of all plant records in a square that are this herb
             (the "reporting rate"), scaled so 100 = the herb's top 5 % of
             surveyed squares. Herbs that are rare even in their best areas are
             scaled against a shared reference rate instead, so they score lower.

This corrects for survey effort: a square near Zürich with 5,000 plant records
and 10 of the herb scores lower than a remote square with 50 records and 10 of
the herb.

Usage:  pip install mapbox-vector-tile requests
        python3 scripts/build_grid.py          # writes data/grid.json
"""
import base64
import json
import math
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import mapbox_vector_tile
import requests

ROOT = Path(__file__).resolve().parent.parent
HERBS = json.loads((ROOT / "data" / "herbs.json").read_text())
OUT = ROOT / "data" / "grid.json"

TILE_Z = 9            # tiles we request
CELL_Z = 14           # each cell = one zoom-14 tile
PER_TILE = 2 ** (CELL_Z - TILE_Z)   # 32 cells per tile side
SQUARE = 128          # GBIF squareSize: 128 of 4096 tile units -> 32 squares per tile side
YEARS = "1990,2026"
PLANTS_KEY = 7707728  # Tracheophyta (vascular plants)
BBOX = (5.9, 45.8, 10.5, 47.85)  # lon/lat bounds of Switzerland
MIN_EFFORT = 15       # smoothed plant records needed before we call a square "surveyed"
PRIOR = 40            # pseudo-records added to effort: damps noisy scores in sparsely surveyed squares
REF_RATE = 0.003      # shared reference: herbs rarer than this (in their best areas) never reach 'high'
MIN_SCORE = 8         # weaker signals are dropped (mostly a single record in a neighbouring square)

session = requests.Session()
session.headers["User-Agent"] = "herbmap-build/1.0"


def lonlat_to_tile(lon, lat, z):
    n = 2 ** z
    x = int((lon + 180) / 360 * n)
    lat_r = math.radians(lat)
    y = int((1 - math.log(math.tan(lat_r) + 1 / math.cos(lat_r)) / math.pi) / 2 * n)
    return x, y


def tiles():
    x0, y0 = lonlat_to_tile(BBOX[0], BBOX[3], TILE_Z)
    x1, y1 = lonlat_to_tile(BBOX[2], BBOX[1], TILE_Z)
    return [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]


def get(url, params):
    for attempt in range(5):
        try:
            r = session.get(url, params=params, timeout=60)
            if r.status_code == 204:
                return None
            r.raise_for_status()
            return r
        except requests.RequestException as e:
            if attempt == 4:
                raise
            time.sleep(2 ** attempt)


def taxon_key(herb):
    params = {"name": herb["gbif"], "kingdom": "Plantae", "strict": "true"}
    if herb.get("rank"):
        params["rank"] = herb["rank"]
    d = get("https://api.gbif.org/v1/species/match", params).json()
    key = d.get("acceptedUsageKey") or d.get("usageKey")
    if not key:
        sys.exit(f"No GBIF match for {herb['gbif']}: {d}")
    return key, d.get("scientificName")


def fetch_tile(taxon, tx, ty):
    url = f"https://api.gbif.org/v2/map/occurrence/density/{TILE_Z}/{tx}/{ty}.mvt"
    r = get(url, {"srs": "EPSG:3857", "taxonKey": taxon, "country": "CH",
                  "bin": "square", "squareSize": SQUARE, "year": YEARS})
    cells = {}
    if r is None or not r.content:
        return cells
    layer = mapbox_vector_tile.decode(r.content, default_options={"y_coord_down": True}).get("occurrence")
    if not layer:
        return cells
    unit = layer["extent"] // PER_TILE
    for f in layer["features"]:
        ring = f["geometry"]["coordinates"][0]
        x = min(p[0] for p in ring) // unit
        y = min(p[1] for p in ring) // unit
        if 0 <= x < PER_TILE and 0 <= y < PER_TILE:
            key = (tx * PER_TILE + x, ty * PER_TILE + y)
            cells[key] = cells.get(key, 0) + f["properties"]["total"]
    return cells


CACHE = ROOT / ".cache"


def fetch_taxon(taxon):
    cache = CACHE / f"gbif-{taxon}-{YEARS.replace(',', '-')}.json"
    if cache.exists():
        return {tuple(map(int, k.split(","))): v for k, v in json.loads(cache.read_text()).items()}
    out = fetch_taxon_live(taxon)
    CACHE.mkdir(exist_ok=True)
    cache.write_text(json.dumps({f"{k[0]},{k[1]}": v for k, v in out.items()}))
    return out


def fetch_taxon_live(taxon):
    out = {}
    with ThreadPoolExecutor(8) as pool:
        for cells in pool.map(lambda t: fetch_tile(taxon, *t), tiles()):
            for k, v in cells.items():
                out[k] = out.get(k, 0) + v
    return out


# Most Swiss records (Info Flora) are reported on a ~5 km grid, i.e. every third
# square. A Gaussian kernel (sigma ~2.7 km) interpolates smoothly between those points.
SIGMA = 1.6
KERNEL = [(dx, dy, math.exp(-(dx * dx + dy * dy) / (2 * SIGMA ** 2)))
          for dx in range(-3, 4) for dy in range(-3, 4) if dx * dx + dy * dy <= 10]


def smooth(counts, keys):
    out = {}
    for (x, y), v in counts.items():
        for dx, dy, w in KERNEL:
            k = (x + dx, y + dy)
            if k in keys:
                out[k] = out.get(k, 0) + w * v
    return out


def pack(result):
    """Replace cell lists with dense byte grids (1 byte per square, 0 = no data), base64-encoded."""
    w = max(c[0] for c in result["surveyed"]) + 1
    h = max(c[1] for c in result["surveyed"]) + 1
    result["width"], result["height"] = w, h

    def grid(cells, value=lambda c: c[2]):
        buf = bytearray(w * h)
        for c in cells:
            if 0 <= c[0] < w and 0 <= c[1] < h:
                buf[c[1] * w + c[0]] = value(c)
        return base64.b64encode(bytes(buf)).decode()

    result["surveyed"] = grid(result["surveyed"], lambda c: 1)
    result["richness"] = grid(result["richness"])
    for herb in result["herbs"].values():
        herb["grid"] = grid(herb.pop("cells"))


def main():
    print("Fetching all vascular plant records (survey effort)…", flush=True)
    plants = fetch_taxon(PLANTS_KEY)
    keys = set(plants)
    effort = smooth(plants, keys)
    effort = {k: effort.get(k, 0) for k in keys}
    surveyed = {k for k, v in effort.items() if v >= MIN_EFFORT}
    print(f"  {sum(plants.values()):,} records in {len(plants):,} squares, {len(surveyed):,} well surveyed")

    x0 = min(k[0] for k in keys)
    y0 = min(k[1] for k in keys)
    result = {
        "cellZoom": CELL_Z, "x0": x0, "y0": y0,
        "years": YEARS, "source": "GBIF.org occurrence density, country CH",
        "built": time.strftime("%Y-%m-%d"),
        # squares with enough plant records to trust a zero
        "surveyed": sorted([k[0] - x0, k[1] - y0] for k in surveyed),
        "herbs": {},
    }
    richness = {}
    tops = {}
    for herb in HERBS:
        key, sci = taxon_key(herb)
        counts = fetch_taxon(key)
        s = smooth(counts, keys)
        rate = {k: s[k] / (effort[k] + PRIOR) for k in surveyed if s.get(k)}
        if not rate:
            print(f"  {herb['id']}: no records!")
            continue
        vals = sorted(rate.values())
        top = vals[min(len(vals) - 1, int(len(vals) * 0.95))]
        cells = []
        for k, r in rate.items():
            score = round(100 * min(1.0, r / max(top, REF_RATE)) ** 0.7)  # gentle curve so mid values are visible
            if score >= MIN_SCORE:
                cells.append([k[0] - x0, k[1] - y0, score])
                if score >= 35:
                    richness[k] = richness.get(k, 0) + 1
        cells.sort()
        tops[herb["id"]] = top
        result["herbs"][herb["id"]] = {
            "taxonKey": key, "name": sci, "records": sum(counts.values()), "cells": cells
        }
        print(f"  {herb['id']:12s} {sci:45s} {sum(counts.values()):7,} records  {len(cells):5,} cells", flush=True)

    print("95th-percentile reporting rates:", {k: round(v * 1000, 2) for k, v in sorted(tops.items(), key=lambda kv: kv[1])})
    result["richness"] = sorted([k[0] - x0, k[1] - y0, v] for k, v in richness.items())
    pack(result)
    OUT.write_text(json.dumps(result, separators=(",", ":")))
    print(f"Wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
