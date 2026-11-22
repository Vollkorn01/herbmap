#!/usr/bin/env python3
"""Distance and density layers on the detail grid.

From swisstopo swissTLM3D (2026):
  water      distance to streams, rivers and lake shores (underground sections excluded)
  buildings  distance to buildings
  paths      distance to roads and paths
From the rasterised habitat map (build_habitat.py):
  habitat    dominant TypoCH class per detail cell
  edge       distance to the nearest forest edge (inside or outside the forest)
  woody      shrub/hedge and single-tree cover, and distance to hedges

Distances are computed on the ~26 m fine grid and stored in metres / 10
(water, paths, edge; capped at 2.5 km) or metres / 20 (buildings, 5 km).
"""
import glob
import json
import sys
from pathlib import Path

import numpy as np
import pyogrio
from rasterio import features
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
import grid  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache"
TLM = glob.glob("/home/user/herbdata/tlm/*.gdb")
FZ, DZ = grid.FINE_Z, grid.DETAIL_Z
FSHAPE, DSHAPE = grid.shape(FZ), grid.shape(DZ)
FT = grid.transform(FZ)


def metres_per_px():
    """True ground size of a fine pixel for every row (Mercator scale varies with latitude)."""
    rows = np.arange(FSHAPE[0]) + 0.5
    y_merc = FT.f + rows * FT.e
    lat = np.degrees(2 * np.arctan(np.exp(y_merc / 6378137.0)) - np.pi / 2)
    return (FT.a * np.cos(np.radians(lat))).astype("float32")[:, None]


MPP = None


def distance_m(mask):
    """Distance in metres from every cell to the nearest True cell."""
    global MPP
    if MPP is None:
        MPP = metres_per_px()
    d = ndimage.distance_transform_edt(~mask).astype("float32")
    return d * MPP


def pool_min(a):
    r, c = DSHAPE
    return a.reshape(r, 2, c, 2).min(axis=(1, 3))


def pool_sum(a):
    r, c = DSHAPE
    return a.reshape(r, 2, c, 2).sum(axis=(1, 3), dtype="uint8")


def save(name, arr):
    np.save(CACHE / f"env_{name}.npy", arr)
    print(f"  {name}: {arr.dtype} mean {arr.mean():.1f}", flush=True)


def burn_lines(layer, keep=None, columns=("OBJEKTART",), batch=400_000):
    """Rasterise a TLM layer in batches (millions of features would not fit in memory at once)."""
    total = pyogrio.read_info(TLM[0], layer=layer)["features"]
    out = np.zeros(FSHAPE, bool)
    n = 0
    for start in range(0, total, batch):
        df = pyogrio.read_dataframe(TLM[0], layer=layer, columns=list(columns), skip_features=start, max_features=batch)
        if keep is not None:
            df = df[keep(df)]
        df = df[df.geometry.notna()].to_crs(3857)
        if len(df):
            out |= features.rasterize(((g, 1) for g in df.geometry), out_shape=FSHAPE, transform=FT,
                                      fill=0, dtype="uint8", all_touched=True).astype(bool)
        n += len(df)
        del df
    print(f"    {layer}: {n:,} features", flush=True)
    return out


def water():
    print("water…", flush=True)
    w = burn_lines("TLM_FLIESSGEWAESSER", keep=lambda d: (d.VERLAUF != 200) & (d.OBJEKTART != 6),
                   columns=("OBJEKTART", "VERLAUF"))
    w |= burn_lines("TLM_STEHENDES_GEWAESSER")
    save("water", np.clip(np.round(pool_min(distance_m(w)) / 10), 0, 250).astype("uint8"))


def paths():
    print("paths & roads…", flush=True)
    p = burn_lines("TLM_STRASSE")
    save("paths", np.clip(np.round(pool_min(distance_m(p)) / 10), 0, 250).astype("uint8"))


def buildings():
    print("buildings…", flush=True)
    b = burn_lines("TLM_GEBAEUDE_FOOTPRINT")
    save("buildings", np.clip(np.round(pool_min(distance_m(b)) / 20), 0, 250).astype("uint8"))


def mode2x2(a):
    """Most common value in every 2x2 block (ties: top-left wins)."""
    r, c = DSHAPE
    q = [a[i::2, j::2][:r, :c] for i in (0, 1) for j in (0, 1)]
    best, count = q[0].copy(), np.zeros(DSHAPE, "uint8")
    for cand in q:
        n = sum((cand == other).astype("uint8") for other in q)
        better = n > count
        best[better], count[better] = cand[better], n[better]
    return best


def habitat():
    print("habitat-derived layers…", flush=True)
    codes = json.loads((CACHE / "habitat_codes.json").read_text())
    hab = np.load(CACHE / "habitat_fine.npy")
    save("habitat", mode2x2(hab))
    forest_ids = [i + 1 for i, c in enumerate(codes) if c.startswith("6")]
    forest = np.isin(hab, forest_ids)
    known = hab > 0
    del hab
    # distance to the forest boundary, measured on both sides of it
    d_out = distance_m(forest)        # open land: distance to the forest
    d_in = distance_m(~forest & known)  # forest: distance to open land
    edge = np.where(forest, d_in, d_out)
    save("edge", np.clip(np.round(pool_min(edge) / 10), 0, 250).astype("uint8"))
    del d_out, d_in, edge, forest
    woody = np.load(CACHE / "woody_fine.npy")
    shrub = (woody & 1) > 0
    tree = (woody & 2) > 0
    # bits 0-2: number of fine cells with shrubs (0-4), bits 3-5: with single trees (0-4)
    save("woody", (pool_sum(shrub.astype("uint8")) | (pool_sum(tree.astype("uint8")) << 3)).astype("uint8"))
    save("hedge", np.clip(np.round(pool_min(distance_m(shrub | tree)) / 10), 0, 250).astype("uint8"))


if __name__ == "__main__":
    steps = {"water": water, "paths": paths, "buildings": buildings, "habitat": habitat}
    for name in (sys.argv[1:] or steps):
        steps[name]()
