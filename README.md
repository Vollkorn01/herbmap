# Herb Map Switzerland

Where to find medicinal herbs in Switzerland — at 50 m detail — and what they're good for.

**Live site:** https://vollkorn01.github.io/herbmap/

## Features

- **36 medicinal herbs that grow wild in Switzerland**, with photos, German and Latin names, healing properties, cautions, deadly lookalikes and Swiss protection notes.
- **50 m likelihood maps** combining an ecological profile of each herb with Swiss habitat, terrain, soil, water and forest data, plus real plant records.
- **Click any spot** to see its habitat type, altitude, slope, soil, distance to water/forest edge/paths, and *why* a herb scores high or low there (factor bars).
- **★ Best spots in view**: numbered markers for the most promising places in the current map view.
- Overlays: hiking trails, nationally protected areas (fens, bogs, floodplains, dry grasslands, National Park), and the WSL habitat map.
- swisstopo base maps (grey, colour, aerial), filters by use and season, "herbs near me".

## How the likelihood is calculated

`likelihood = 100 × (habitat suitability × regional factor) ^ 0.6`

**Habitat suitability** (0–1, `js/model.js`) is the product of:

| Factor | Data |
| --- | --- |
| Habitat type, or closeness to a stream, forest edge, hedge, building or path the herb likes | Habitat Map of Switzerland v1.2 (WSL/BAFU, TypoCH types, incl. hedges and single trees); swissTLM3D streams, lakes, buildings, roads and paths |
| Altitude | swissALTIRegio (swisstopo) |
| Moisture | waterlogging and water storage (BLW soil suitability map), distance to water, wet habitat types, slope, sun exposure |
| Light | forest vs open land, distance to the forest edge, hedges |
| Lime / acid soil | geotechnical map 1:500k rock types (swisstopo) + soil calcium (BAFU geochemical soil atlas) + habitat type hints |
| Nutrients | habitat type, nutrient storage (BLW), nearness to farms/buildings |
| Warmth | slope and aspect (south-facing slopes) |
| Forest type | broadleaf share (NFI forest mix rate, WSL/BAFU) |

Each herb's profile (habitat affinities, altitude range, moisture, light, soil, nearby features) is in `scripts/herb_models.py`, written from Swiss plant ecology (Delarze et al., *Lebensräume der Schweiz*; Info Flora). These are expert rules, not a model fitted to observations.

**Regional factor** comes from GBIF occurrence records since 1990 (incl. Info Flora) for ~1.7 km squares, smoothed to the ~5 km Info Flora reporting grid: the herb's share of all plant records, which corrects for survey effort (`scripts/build_grid.py`).

## Building the data

The raw sources are several GB, so the build downloads, processes and deletes them. Python 3 with `numpy scipy rasterio pyogrio geopandas pyproj mapbox-vector-tile requests`, and Node.js.

```bash
python3 scripts/build_grid.py          # GBIF regional records      -> data/grid.json
python3 scripts/build_habitat.py       # habitat map, all cantons   -> .cache/
python3 scripts/build_env.py           # terrain, forest, soil, rock -> .cache/
python3 scripts/build_distances.py     # water, paths, buildings, forest edge, hedges (needs swissTLM3D in /home/user/herbdata/tlm)
python3 scripts/habitat_labels.py      # official habitat labels
python3 scripts/herb_models.py         # herb profiles -> data/herbs.json
python3 scripts/build_chunks.py        # 50 m tiles -> data/env/
node scripts/build_overview.mjs        # ~200 m overview per herb -> data/overview/
python3 scripts/fetch_photos.py        # photos -> img/herbs/, data/photos.json
```

All layers share the Web-Mercator grid in `scripts/grid.py` (zoom-11 pixels ≈ 52 m), so the browser can score tiles without reprojection.

## Running locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Data & credits

- Base maps, swissALTIRegio, swissTLM3D, geotechnical map © [swisstopo](https://www.swisstopo.admin.ch/)
- Habitat Map of Switzerland © WSL / BAFU; NFI forest mix rate © WSL / BAFU; Geochemical soil atlas © BAFU; protected-area inventories © BAFU
- Soil suitability map © BLW
- Plant records: [GBIF.org](https://www.gbif.org) (many datasets incl. Info Flora)
- Photos: [iNaturalist](https://www.inaturalist.org) contributors and Wikimedia Commons, Creative Commons licences; author and licence shown under each photo
- Inspired by [pilzradar.ch](https://www.pilzradar.ch) ([andrinr/shrooms](https://github.com/andrinr/shrooms), MIT)

All Swiss federal geodata are open government data ("free use, source must be provided").

## Disclaimer

For education only — not medical advice. Herbs can cause side effects and interact with medication. Never eat a wild plant unless you are certain of its identity, and respect nature reserves and cantonal plant-protection rules.
