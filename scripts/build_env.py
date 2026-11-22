#!/usr/bin/env python3
"""Environmental layers on the detail grid (~52 m, EPSG:3857, see grid.py).

Sources (all Swiss federal open geodata, data.geo.admin.ch):
  elevation   swisstopo swissALTIRegio (10 m, read at its 40 m overview)
  broadleaf   BAFU/WSL NFI forest mix rate (share of broadleaf trees, 10 m)
  soil        BLW soil suitability map 1:200k: waterlogging, water storage,
              nutrient storage
  lithology   swisstopo geotechnical map 1:500k, aggregated rock types
  calcium     BAFU geochemical soil atlas, calcium class

Writes .cache/env_<name>.npy (uint8 / int16 arrays on the detail grid).
"""
import glob
import sys
from pathlib import Path

import numpy as np
import pyogrio
import rasterio
from rasterio import features
from rasterio.enums import Resampling
from rasterio.warp import reproject
from rasterio.windows import from_bounds

sys.path.insert(0, str(Path(__file__).parent))
import grid  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache"
DATA = Path("/home/user/herbdata")
Z = grid.DETAIL_Z
SHAPE = grid.shape(Z)
DST_T = grid.transform(Z)
LV95_BOUNDS = (2480000, 1070000, 2840000, 1300000)
GEO = "https://data.geo.admin.ch"


def save(name, arr):
    np.save(CACHE / f"env_{name}.npy", arr)
    print(f"  {name}: {arr.dtype} range {np.nanmin(arr)}..{np.nanmax(arr)}", flush=True)


def warp(src, src_t, resampling, src_nodata=None, dst_dtype="float32", dst_nodata=np.nan):
    dst = np.full(SHAPE, dst_nodata, dst_dtype)
    reproject(src, dst, src_transform=src_t, src_crs="EPSG:2056", src_nodata=src_nodata,
              dst_transform=DST_T, dst_crs="EPSG:3857", dst_nodata=dst_nodata, resampling=resampling)
    return dst


def read_cog(url, overview_level):
    with rasterio.open("/vsicurl/" + url, overview_level=overview_level) as d:
        win = from_bounds(*LV95_BOUNDS, transform=d.transform).round_offsets().round_lengths()
        a = d.read(1, window=win)
        return a, d.window_transform(win), d.nodata


def terrain():
    print("terrain (swissALTIRegio @40 m)…", flush=True)
    a, t, nd = read_cog(f"{GEO}/ch.swisstopo.swissaltiregio/swissaltiregio/swissaltiregio_2056_5728.tif", 0)
    a = a.astype("float32")
    a[(a > 5000) | (a < -100)] = np.nan
    res = t.a
    gy, gx = np.gradient(a, res)          # rows go south, so gy is -dN
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    # aspect as the downhill direction, 0 = north, 90 = east
    east, north = -gx, gy
    elev = warp(a, t, Resampling.bilinear, np.nan)
    slp = warp(slope.astype("float32"), t, Resampling.average, np.nan)
    e = warp(east.astype("float32"), t, Resampling.average, np.nan)
    n = warp(north.astype("float32"), t, Resampling.average, np.nan)
    aspect = (np.degrees(np.arctan2(e, n)) + 360) % 360
    save("elev", np.where(np.isnan(elev), -1, np.round(elev)).astype("int16"))
    save("slope", np.where(np.isnan(slp), 255, np.clip(np.round(slp), 0, 90)).astype("uint8"))
    asp = np.where(np.isnan(aspect) | (np.nan_to_num(slp) < 2), 255, np.round(aspect / 360 * 250) % 250)
    save("aspect", asp.astype("uint8"))


def broadleaf():
    print("broadleaf share (NFI @40 m)…", flush=True)
    a, t, nd = read_cog(f"{GEO}/ch.bafu.landesforstinventar-waldmischungsgrad/landesforstinventar-waldmischungsgrad/landesforstinventar-waldmischungsgrad_2056.tif", 1)
    a = a.astype("float32")
    a[(a < 0) | (a > 100)] = np.nan
    b = warp(a, t, Resampling.average, np.nan)
    save("broadleaf", np.where(np.isnan(b), 255, np.round(b)).astype("uint8"))


def vector(path, column, mapping=None, layer=None, all_touched=False, fill=0, dtype="uint8"):
    df = pyogrio.read_dataframe(path, layer=layer).to_crs(3857)
    vals = df[column] if mapping is None else df[column].map(mapping)
    ok = vals.notna() & df.geometry.notna()
    return features.rasterize(zip(df.geometry[ok], vals[ok].astype(int)), out_shape=SHAPE, transform=DST_T,
                              fill=fill, dtype=dtype, all_touched=all_touched)


def soil():
    print("soil suitability map…", flush=True)
    g = glob.glob(str(DATA / "bodeneignung-vernaessung" / "**" / "*.gdb"), recursive=True)[0]
    for col, name in [("VERNASS", "waterlog"), ("WASSERSPEI", "waterstore"), ("NAHRSTOFF", "nutrients")]:
        df = pyogrio.read_dataframe(g, columns=[col]).to_crs(3857)
        df = df[df[col] > 0]
        r = features.rasterize(zip(df.geometry, df[col].astype(int)), out_shape=SHAPE, transform=DST_T,
                               fill=0, dtype="uint8")
        save(name, r)  # 0 = unknown, otherwise class 1..4 (waterlog) or 1..6


# Lime content of the bedrock, 0 (acidic silicate) .. 100 (limestone/dolomite)
LIME = {
    "Kalksteine, z.T. Mergel": 100, "Dolomite": 100, "Dolomit- und Kalkmarmore": 95,
    "Mergelschiefer, Kalkphyllite": 80, "Mergel, z.T. Sandstein": 75, "Tone, Rauwacken": 70,
    "Konglomerate, Brekzien": 60, "Sandsteine, z.T. Mergel": 50, "Tone, Silte, Sande": 50,
    "Sande, Kiese, Gerölle": 55, "Blöcke, Gerölle": 45, "Tongesteine, Tonschiefer": 40,
    "Basische Gesteine": 40, "Amphibolite": 30, "Ultrabasische Gesteine": 30, "Vulkanite": 20,
    "Radiolarite, Hornsteine": 15, "Glimmerschiefer, Gneise": 12, "Porphyrite, Quarzporphyre": 10,
    "Quarzphyllite": 10, "Gneise": 8, "Granite, Syenite": 5, "Quarzite": 5,
}


def lime():
    print("lithology + soil calcium…", flush=True)
    shp = str(DATA / "gk500" / "Lithologie_Aggregiert.shp")
    df = pyogrio.read_dataframe(shp).to_crs(3857)
    df["lime"] = df.LITHO_DE.map(LIME)
    df = df[df.lime.notna()]
    litho = features.rasterize(zip(df.geometry, (df.lime + 1).astype(int)), out_shape=SHAPE,
                               transform=DST_T, fill=0, dtype="uint8").astype("float32") - 1
    with rasterio.open(f"/vsicurl/{GEO}/ch.bafu.geochemischer-bodenatlas_schweiz_calcium/geochemischer-bodenatlas_schweiz_calcium/geochemischer-bodenatlas_schweiz_calcium_2056.tif") as d:
        ca = d.read(1).astype("float32")
        ca[ca == 0] = np.nan
        ca_t = d.transform
    ca = warp((ca - 1) / 7 * 100, ca_t, Resampling.bilinear, np.nan)   # classes 1..8 -> 0..100
    out = np.where(litho >= 0, litho, np.nan)
    both = ~np.isnan(out) & ~np.isnan(ca)
    out[both] = 0.55 * out[both] + 0.45 * ca[both]
    only_ca = np.isnan(out) & ~np.isnan(ca)
    out[only_ca] = ca[only_ca]
    save("lime", np.where(np.isnan(out), 255, np.round(out)).astype("uint8"))


if __name__ == "__main__":
    CACHE.mkdir(exist_ok=True)
    steps = {"terrain": terrain, "broadleaf": broadleaf, "soil": soil, "lime": lime}
    for name in (sys.argv[1:] or steps):
        steps[name]()
