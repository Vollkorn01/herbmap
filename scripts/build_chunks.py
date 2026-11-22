#!/usr/bin/env python3
"""Pack the detail layers into one gzip file per zoom-11 map tile (256 x 256 cells, ~13 km).

Each file holds len(LAYERS) planes of 65,536 bytes, in the order of js/model.js LAYERS.
Also writes data/env/meta.json with the grid definition, habitat codes and labels.
"""
import gzip
import json
import shutil
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import grid  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache"
OUT = ROOT / "data" / "env"
LAYERS = ["habitat", "elev", "slope", "aspect", "broadleaf", "water", "paths", "buildings",
          "edge", "hedge", "woody", "waterlog", "waterstore", "nutrients", "lime"]


def layer(name):
    a = np.load(CACHE / f"env_{name}.npy")
    if name == "elev":  # metres -> 20 m steps, 255 = no data
        a = np.where(a < 0, 255, np.clip(np.round(a / 20), 0, 254)).astype("uint8")
    assert a.dtype == np.uint8 and a.shape == grid.shape(grid.DETAIL_Z), (name, a.dtype, a.shape)
    return a


def main():
    shutil.rmtree(OUT, ignore_errors=True)
    OUT.mkdir(parents=True)
    stack = np.stack([layer(n) for n in LAYERS])
    hab = stack[0]
    tiles, total = [], 0
    for ty in range(grid.NTY):
        for tx in range(grid.NTX):
            sl = np.s_[:, ty * 256:(ty + 1) * 256, tx * 256:(tx + 1) * 256]
            if not hab[sl[1:]].any():
                continue
            x, y = grid.TX0 + tx, grid.TY0 + ty
            data = gzip.compress(np.ascontiguousarray(stack[sl]).tobytes(), 9)
            (OUT / f"{x}_{y}.gz").write_bytes(data)
            tiles.append([x, y])
            total += len(data)
    codes = json.loads((CACHE / "habitat_codes.json").read_text())
    labels = json.loads((CACHE / "habitat_labels.json").read_text())
    en = json.loads((ROOT / "scripts" / "habitat_en.json").read_text())
    meta = {**grid.describe(), "layers": LAYERS, "tiles": tiles, "codes": codes,
            "labels": {c: {"en": en.get(c), "de": labels.get(c, {}).get("de")} for c in codes}}
    (OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, separators=(",", ":")))
    print(f"{len(tiles)} chunks, {total / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
