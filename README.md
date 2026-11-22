# Herb Map Switzerland

Where to find medicinal herbs in Switzerland — and what they're good for.

**Live site:** https://vollkorn01.github.io/herbmap/

## Features

- **36 medicinal herbs that grow wild in Switzerland** (arnica, St John's wort, yellow gentian, masterwort, wild garlic, lady's mantle, cowslip, …) with English, German and Latin names.
- **Likelihood maps from real plant records**, on official **swisstopo** maps (grey or colour map and aerial photos).
- **"What grows here?"**: click anywhere, or use *Herbs near me*, to list herbs likely in that area, with a 0–100 score.
- **Overview map** of how many medicinal herbs are likely in each area.
- **Herb profiles**: healing properties, preparation, cautions and interactions, deadly lookalikes, Swiss protection notes, habitat, altitude and when to look.
- Filter by use, search, and "findable this month". Works on phones.

## How the likelihood is calculated

`scripts/build_grid.py` downloads [GBIF](https://www.gbif.org) occurrence-density tiles for Switzerland (records since 1990, including Info Flora data) for each herb and for all vascular plants. Squares are ~1.7 km (Web-Mercator zoom-14 tiles).

1. Most Swiss records are reported on a ~5 km grid, so both counts are smoothed with a Gaussian kernel (σ ≈ 2.7 km).
2. **Reporting rate** = herb records ÷ all plant records in the area. This corrects for survey effort: well-botanised areas don't look better just because more people recorded there.
3. The rate is scaled to 0–100 against the herb's own best 5 % of areas. Herbs that are scarce even there are scaled against a shared reference, so they stay "low"/"medium".

Levels: **high** ≥ 60, **medium** 30–59, **low** < 30. Treat the map as a regional guide (~5 km), not a pinpoint, and absence of records isn't proof of absence.

Rebuild the data (cached downloads go to `.cache/`):

```bash
pip install mapbox-vector-tile requests
python3 scripts/build_grid.py
```

## Running locally

Static site, no build step:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Data & credits

- Base maps © [swisstopo](https://www.swisstopo.admin.ch/) (free geodata, attribution required).
- Plant records: GBIF.org occurrence data for Switzerland, from many datasets incl. Info Flora. See [GBIF citation guidelines](https://www.gbif.org/citation-guidelines).
- Inspired by [pilzradar.ch](https://www.pilzradar.ch) ([andrinr/shrooms](https://github.com/andrinr/shrooms), MIT).

## Disclaimer

For education only — not medical advice. Herbs can cause side effects and interact with medication. Never eat a wild plant unless you are certain of its identity, and respect nature reserves and cantonal plant-protection rules.
