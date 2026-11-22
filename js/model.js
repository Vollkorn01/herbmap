/* Herb habitat model, shared by the browser and the Node build (scripts/build_overview.mjs).
 *
 * Each ~50 m cell has environmental layers (see LAYERS). For a herb we combine
 *   habitat   affinity for the mapped TypoCH habitat type, or being close to a
 *             stream, forest edge, hedge, building or path the herb likes
 *   altitude, moisture, light, lime/acid soil, nutrients, warmth, forest type
 * into a habitat suitability 0..1 (product of the factors), then multiply by the
 * regional factor from real plant records (GBIF/Info Flora, ~5 km).
 * All rules are explicit; nothing here is fitted to data.
 */
(function (root) {
  "use strict";

  const LAYERS = ["habitat", "elev", "slope", "aspect", "broadleaf", "water", "paths", "buildings",
    "edge", "hedge", "woody", "waterlog", "waterstore", "nutrients", "lime"];

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  // Longest-prefix lookup in a {code: value} table ("6.2.3" falls back to "6.2", "6").
  function lookup(table, code) {
    let c = code;
    while (c) {
      if (c in table) return table[c];
      const i = c.lastIndexOf(".");
      if (i < 0) break;
      c = c.slice(0, i);
    }
    return undefined;
  }

  // Habitat wetness (0 dry .. 1 wet), nutrient level and lime hints by TypoCH code.
  const WET = { "1": 1, "2": 0.9, "2.3.1": 0.75, "2.4": 0.95, "6.1": 0.8, "6.5": 0.85, "5.2": 0.7, "3.2.1": 0.6,
    "4.2": 0.15, "4.1": 0.1, "4.3.1": 0.3, "4.3.2": 0.25, "6.4": 0.2, "6.4.1": 0.45, "3.3": 0.25, "3.4": 0.1, "6.2.1": 0.3 };
  const NUTR = { "4.5": 0.8, "7.1": 0.9, "8.2": 0.8, "4.0": 0.7, "9.2.2": 1, "5.2": 0.8, "6.1": 0.8, "4.2": 0.2,
    "4.1": 0.1, "4.3": 0.25, "4.3.5": 0.1, "5.4": 0.1, "2.2": 0.2, "2.3.1": 0.25, "2.4": 0.05, "6.6.2": 0.2,
    "6.2.2": 0.25, "6.4": 0.2, "6.5": 0.1, "3": 0.2 };
  const LIME = { "2.2.3": 0.95, "2.2.2": 0.05, "4.3.5": 0.05, "4.3.1": 0.95, "4.3.3": 0.8, "6.2.2": 0.15,
    "6.6.2": 0.15, "6.2.1": 0.9, "6.4.3": 0.8, "4.2.4": 0.75, "5.4": 0.2, "2.4": 0.05, "6.5": 0.1 };
  // Cells where nothing grows (water, glaciers, buildings, sealed ground).
  const BARE = ["1", "3.1", "9.2", "9.3.2", "9.4", "9.0.2", "9"];
  const isBare = (code) => BARE.some((p) => code === p || (code.startsWith(p + ".") && !code.startsWith("9.2.2")));
  const isForest = (code) => code.startsWith("6") && !code.startsWith("6.0");

  const NEAR_SCALE = { water: 40, edge: 30, hedge: 20, buildings: 60, paths: 20 };  // metres

  /** Precompute per-habitat-code tables for one herb. codes[i] is raster value i+1. */
  function prepare(herb, codes) {
    const m = herb.model, n = codes.length + 1;
    const t = { aff: new Float32Array(n), wet: new Float32Array(n).fill(-1), nutr: new Float32Array(n).fill(0.5),
      lime: new Float32Array(n).fill(-1), kind: new Uint8Array(n), bare: new Uint8Array(n) };
    t.bare[0] = 1;
    codes.forEach((code, i) => {
      const k = i + 1;
      t.aff[k] = lookup(m.habitats, code) || 0;
      const w = lookup(WET, code); if (w !== undefined) t.wet[k] = w;
      const nu = lookup(NUTR, code); if (nu !== undefined) t.nutr[k] = nu;
      const li = lookup(LIME, code); if (li !== undefined) t.lime[k] = li;
      t.kind[k] = isForest(code) ? 1 : code.startsWith("5.3") ? 2 : 0;
      t.bare[k] = isBare(code) ? 1 : 0;
    });
    const near = Object.entries(m.near || {});
    return { herb, m, t, near, elev: m.elev, moist: m.moisture };
  }

  /** Environmental indices for one cell. `v(name)` returns the raw layer byte. */
  function indices(v) {
    const slope = v("slope") === 255 ? 0 : v("slope");
    const asp = v("aspect");
    const warm = asp === 255 || slope < 3 ? 0.5
      : 0.5 + 0.5 * Math.cos((asp / 250 * 360 - 180) * Math.PI / 180) * Math.min(1, slope / 25);
    const elevB = v("elev");
    return {
      elev: elevB === 255 ? null : elevB * 20,
      slope, warm,
      water: v("water") * 10, paths: v("paths") * 10, buildings: v("buildings") * 20,
      edge: v("edge") * 10, hedge: v("hedge") * 10,
      broadleaf: v("broadleaf") === 255 ? null : v("broadleaf"),
      waterlog: v("waterlog"), waterstore: v("waterstore"), soilNutr: v("nutrients"),
      lime: v("lime") === 255 ? null : v("lime") / 100
    };
  }

  function moistureIndex(e, hw) {
    let sum = 0, wsum = 0;
    if (e.waterlog) { sum += 0.35 * [0, 0.2, 0.45, 0.7, 0.9][e.waterlog]; wsum += 0.35; }
    if (e.waterstore) { sum += 0.2 * (0.15 + (e.waterstore - 1) * 0.12); wsum += 0.2; }
    sum += 0.45 * (0.25 + 0.7 * Math.exp(-e.water / 60)); wsum += 0.45;
    let M = sum / wsum - 0.2 * Math.min(1, e.slope / 35) - 0.15 * (e.warm - 0.5);
    if (e.elev != null) M += 0.1 * clamp((e.elev - 800) / 1500);
    if (hw >= 0) M = 0.4 * M + 0.6 * hw;
    return clamp(M);
  }

  function lightIndex(kind, e) {
    if (kind === 1) return 0.15 + 0.6 * Math.exp(-e.edge / 25);
    if (kind === 2) return 0.45;
    return 1 - 0.25 * Math.exp(-e.hedge / 15);
  }

  /** Score one cell. Returns suitability 0..1, or a detailed breakdown when `detail` is true. */
  function habitatScore(p, cellCode, v, detail) {
    const t = p.t, m = p.m;
    if (t.bare[cellCode]) return detail ? { value: 0, bare: true, factors: [] } : 0;
    const e = indices(v);
    // habitat or nearby feature
    const aff = t.aff[cellCode];
    let nearBest = 0, nearKey = null;
    for (const [k, w] of p.near) {
      const s = w * Math.exp(-e[k] / NEAR_SCALE[k]);
      if (s > nearBest) { nearBest = s; nearKey = k; }
    }
    const H = 1 - (1 - aff) * (1 - 0.85 * nearBest);
    if (H <= 0.001 && !detail) return 0;
    // altitude
    let E = 1;
    if (e.elev != null) {
      const [lo, a, b, hi] = p.elev;
      E = e.elev < lo || e.elev > hi ? 0 : e.elev < a ? smooth(lo, a, e.elev) : e.elev > b ? 1 - smooth(b, hi, e.elev) : 1;
    }
    if (E === 0 && !detail) return 0;
    // moisture
    const Mi = moistureIndex(e, t.wet[cellCode]);
    const [mlo, mhi] = p.moist;
    const md = Mi < mlo ? mlo - Mi : Mi > mhi ? Mi - mhi : 0;
    const Mf = Math.max(0.03, Math.exp(-(md / 0.2) * (md / 0.2)));
    // light
    const L = lightIndex(t.kind[cellCode], e);
    const Lf = m.light === "open" ? 0.15 + 0.85 * L
      : m.light === "shade" ? clamp(1.15 - 0.9 * L, 0.25, 1)
      : clamp(1 - 1.5 * Math.abs(L - 0.6), 0.25, 1);
    // lime / acid
    let C = e.lime == null ? 0.5 : e.lime;
    if (t.lime[cellCode] >= 0) C = 0.5 * C + 0.5 * t.lime[cellCode];
    let Cf = 1;
    if (m.lime) {
      const g = m.lime[0] === "lime" ? smooth(0.2, 0.7, C) : 1 - smooth(0.25, 0.7, C);
      Cf = 1 - m.lime[1] * 0.9 * (1 - g);
    }
    // nutrients
    const N = clamp(0.6 * t.nutr[cellCode] + 0.25 * (e.soilNutr ? (e.soilNutr - 1) / 5 : 0.5)
      + 0.25 * Math.exp(-e.buildings / 150));
    let Nf = 1;
    if (m.nutrients) {
      const g = m.nutrients[0] === "rich" ? smooth(0.3, 0.75, N) : 1 - smooth(0.3, 0.7, N);
      Nf = 1 - m.nutrients[1] * 0.85 * (1 - g);
    }
    // warmth
    const Wf = m.warm ? 1 - m.warm * 0.6 * (1 - e.warm) : 1;
    // forest type
    let Ff = 1;
    if (m.forest && t.kind[cellCode] === 1 && e.broadleaf != null) {
      const b = e.broadleaf / 100;
      Ff = 0.35 + 0.65 * (m.forest === "broadleaf" ? b : 1 - b);
    }
    const value = H * E * Mf * Lf * Cf * Nf * Wf * Ff;
    if (!detail) return value;
    return {
      value, env: e, habitatAffinity: aff, near: nearKey && nearBest > 0.15 ? nearKey : null,
      moisture: Mi, light: L, lime: C, nutrients: N,
      factors: [
        { key: "habitat", fit: H }, { key: "altitude", fit: E }, { key: "moisture", fit: Mf },
        { key: "light", fit: Lf }, { key: "soil", fit: Cf * Nf }, { key: "warmth", fit: Wf },
        ...(m.forest && t.kind[cellCode] === 1 ? [{ key: "forest", fit: Ff }] : [])
      ]
    };
  }

  /** Regional factor from records: reg = 0..100 score (or 0 when none), surveyed = enough records nearby. */
  function regionalFactor(reg, surveyed) {
    if (reg > 0) return 0.25 + 0.75 * Math.pow(reg / 100, 0.6);
    return surveyed ? 0.12 : 0.4;
  }

  /** Final 0..100 likelihood from habitat suitability and the regional factor. */
  function finalScore(h, R) {
    const x = h * R;
    return x <= 0 ? 0 : Math.round(100 * Math.pow(x, 0.6));
  }

  const api = { LAYERS, prepare, habitatScore, regionalFactor, finalScore, lookup, indices };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HerbModel = api;
})(typeof self !== "undefined" ? self : this);
