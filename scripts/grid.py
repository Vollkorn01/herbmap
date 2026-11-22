"""Shared raster grid for all environmental layers.

All layers live on the Web-Mercator (EPSG:3857) pixel grid so they line up with
map tiles without reprojection in the browser.

  DETAIL_Z = 11  -> ~52 m cells in Switzerland (what the browser scores)
  FINE_Z   = 12  -> ~26 m cells (habitat polygons are rasterised here, then
                    aggregated 2x2 to the detail grid)

The grid covers whole zoom-11 tiles (256 x 256 detail cells), one data chunk each.
"""
import math

from rasterio.transform import Affine

WORLD = 2 * math.pi * 6378137.0
DETAIL_Z = 11
FINE_Z = 12
BBOX = (5.90, 45.78, 10.55, 47.84)  # lon/lat around Switzerland


def lonlat_to_px(lon, lat, z):
    n = 256 * 2 ** z
    x = (lon + 180) / 360 * n
    r = math.radians(lat)
    y = (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * n
    return x, y


def _tiles():
    x0, y0 = lonlat_to_px(BBOX[0], BBOX[3], DETAIL_Z)
    x1, y1 = lonlat_to_px(BBOX[2], BBOX[1], DETAIL_Z)
    return int(x0 // 256), int(y0 // 256), int(x1 // 256), int(y1 // 256)


TX0, TY0, TX1, TY1 = _tiles()
NTX, NTY = TX1 - TX0 + 1, TY1 - TY0 + 1


def shape(z):
    f = 2 ** (z - DETAIL_Z)
    return NTY * 256 * f, NTX * 256 * f  # rows, cols


def origin_px(z):
    f = 2 ** (z - DETAIL_Z)
    return TX0 * 256 * f, TY0 * 256 * f


def transform(z):
    res = WORLD / (256 * 2 ** z)
    ox, oy = origin_px(z)
    return Affine(res, 0, ox * res - WORLD / 2, 0, -res, WORLD / 2 - oy * res)


def describe():
    return {"detailZoom": DETAIL_Z, "tx0": TX0, "ty0": TY0, "ntx": NTX, "nty": NTY}


if __name__ == "__main__":
    print(describe(), "detail shape", shape(DETAIL_Z), "fine shape", shape(FINE_Z))
