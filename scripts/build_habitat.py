#!/usr/bin/env python3
"""Rasterise the WSL Habitat Map of Switzerland (TypoCH) for all cantons.

Source: BAFU/WSL "Lebensraumkarte der Schweiz" v1.2, data.geo.admin.ch
        (ch.bafu.lebensraumkarte-schweiz), one FileGDB per canton.

Output (in .cache/):
  habitat_fine.npy  uint8 class index per ~26 m cell (0 = no data)
  woody_fine.npy    uint8 bit flags: 1 = shrubs/hedge, 2 = single tree outside forest
  habitat_codes.json  list of TypoCH codes; index i+1 in the raster = codes[i]

Each canton is downloaded, rasterised and deleted again; progress is resumable.
"""
import glob
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import pyogrio
from rasterio import features
from rasterio.transform import Affine
from rasterio.windows import from_bounds

sys.path.insert(0, str(Path(__file__).parent))
import grid  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache"
WORK = Path("/home/user/herbdata")
CANTONS = "ag ai ar be bl bs fr ge gl gr ju lu ne nw ow sg sh so sz tg ti ur vd vs zg zh".split()
URL = "https://data.geo.admin.ch/ch.bafu.lebensraumkarte-schweiz/lebensraumkarte-schweiz_{c}/lebensraumkarte-schweiz_{c}_2056.gdb.zip"

Z = grid.FINE_Z
BATCH = 300_000
SHAPE = grid.shape(Z)
T = grid.transform(Z)


def load(name, dtype=np.uint8):
    p = CACHE / name
    return np.load(p) if p.exists() else np.zeros(SHAPE, dtype)


def rasterise(gdf, values, out, all_touched=False, only_empty=True, combine=None):
    if gdf.empty:
        return
    win = from_bounds(*gdf.total_bounds, transform=T).round_offsets().round_lengths()
    r0, c0 = max(0, int(win.row_off) - 1), max(0, int(win.col_off) - 1)
    r1 = min(SHAPE[0], int(win.row_off + win.height) + 2)
    c1 = min(SHAPE[1], int(win.col_off + win.width) + 2)
    wt = T * Affine.translation(c0, r0)
    burned = features.rasterize(zip(gdf.geometry.values, values), out_shape=(r1 - r0, c1 - c0),
                                transform=wt, fill=0, dtype="uint8", all_touched=all_touched)
    view = out[r0:r1, c0:c1]
    if combine == "or":
        view |= burned
    elif only_empty:
        mask = (view == 0) & (burned != 0)
        view[mask] = burned[mask]
    else:
        view[burned != 0] = burned[burned != 0]


def main():
    CACHE.mkdir(exist_ok=True)
    done_path = CACHE / "habitat_done.json"
    done = json.loads(done_path.read_text()) if done_path.exists() else []
    codes_path = CACHE / "habitat_codes.json"
    codes = json.loads(codes_path.read_text()) if codes_path.exists() else []
    hab = load("habitat_fine.npy")
    woody = load("woody_fine.npy")
    print("grid", SHAPE, "done:", done, flush=True)

    for c in (sys.argv[1:] or CANTONS):
        if c in done:
            continue
        t0 = time.time()
        zpath = WORK / f"{c}.gdb.zip"
        if not zpath.exists():
            subprocess.run(["curl", "-sf", "--retry", "4", "-o", str(zpath), URL.format(c=c)], check=True)
        out = WORK / c
        shutil.rmtree(out, ignore_errors=True)
        subprocess.run(["unzip", "-q", "-o", str(zpath), "-d", str(out)], check=True)
        gdb = glob.glob(str(out / "**" / "*.gdb"), recursive=True)[0]
        layers = [l[0] for l in pyogrio.list_layers(gdb)]
        hl = next(l for l in layers if l.lower().startswith("habitatmap"))
        wl = next((l for l in layers if "einzelbaum" in l.lower()), None)

        n_hab = 0
        total = pyogrio.read_info(gdb, layer=hl)["features"]
        for start in range(0, total, BATCH):  # batches keep memory low for big cantons
            df = pyogrio.read_dataframe(gdb, layer=hl, columns=["TypoCH"], skip_features=start,
                                        max_features=BATCH).to_crs(3857)
            df = df[df.geometry.notna() & ~df.geometry.is_empty]
            for code in sorted(set(df.TypoCH.astype(str)) - set(codes)):
                codes.append(code)
            assert len(codes) < 255, "too many habitat codes"
            idx = {code: i + 1 for i, code in enumerate(codes)}
            rasterise(df, df.TypoCH.astype(str).map(idx).astype("uint8").values, hab)
            n_hab += len(df)
            del df

        n_w = 0
        if wl:
            total = pyogrio.read_info(gdb, layer=wl)["features"]
            for start in range(0, total, BATCH * 2):
                w = pyogrio.read_dataframe(gdb, layer=wl, columns=["TypoCH"], skip_features=start,
                                           max_features=BATCH * 2).to_crs(3857)
                w = w[w.geometry.notna() & ~w.geometry.is_empty]
                shrub = w[w.TypoCH.astype(str).str.startswith("5.3")]
                tree = w[w.TypoCH.astype(str).str.startswith("STR")]
                rasterise(shrub, np.ones(len(shrub), "uint8"), woody, all_touched=True, combine="or")
                rasterise(tree, np.full(len(tree), 2, "uint8"), woody, all_touched=True, combine="or")
                n_w += len(w)
                del w, shrub, tree

        shutil.rmtree(out, ignore_errors=True)
        zpath.unlink()
        np.save(CACHE / "habitat_fine.npy", hab)
        np.save(CACHE / "woody_fine.npy", woody)
        codes_path.write_text(json.dumps(codes))
        done.append(c)
        done_path.write_text(json.dumps(done))
        print(f"{c}: {n_hab:,} habitat polygons, {n_w:,} trees/shrubs, {len(codes)} codes, {time.time() - t0:.0f}s", flush=True)

    print("filled cells:", int((hab > 0).sum()), "of", hab.size)


if __name__ == "__main__":
    main()
