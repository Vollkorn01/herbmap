# Herb Map

An interactive map of medicinal herbs: where they grow, how likely you are to find them, and what they are traditionally and clinically used for.

## Features

- **World map** of 31 medicinal herbs (chamomile, St John's wort, arnica, nettle, elder, ashwagandha, tea tree, devil's claw, …).
- **Likelihood ratings** per region: *high* (common in suitable habitat), *medium* (occasional/local), *low* (rare, endangered or garden escape).
- **Overview mode** shades regions by how many medicinal herbs grow there.
- **"What grows here?"** — click anywhere on the map, or use *Herbs near me*, to list herbs likely at that spot.
- **Herb profiles** — healing properties, preparation, cautions & interactions, lookalikes, habitat, season calendar and evidence level.
- Filter by use (sleep, digestion, skin & wounds…), search, and "findable this month".
- Works on phones; light and dark mode.

## Running it

It's a static site with no build step. Open `index.html` via any web server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

To publish, enable **GitHub Pages** for this repository (Settings → Pages → deploy from branch, root folder).

## Editing the data

- `js/herbs.js` — the herb profiles and which regions they grow in.
- `js/regions.js` — the region polygons (`[lat, lng]` points).

Ranges are hand-drawn and deliberately coarse; within a region a plant only grows where its habitat suits it.

## Disclaimer

For education only — not medical advice. Herbs can cause side effects and interact with medication. Never eat a wild plant unless you are certain of its identification, and respect local plant-protection laws.

Map data © OpenStreetMap contributors.
