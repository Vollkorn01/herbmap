(async function () {
  "use strict";
  const M = window.HerbModel;

  const EVIDENCE_LABEL = { good: "Good evidence", some: "Some evidence", traditional: "Traditional use" };
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonth = new Date().getMonth() + 1;
  const DETAIL_MIN_ZOOM = 12;          // from here on, score 50 m cells live
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const levelOf = (s) => (s >= 60 ? "High" : s >= 30 ? "Medium" : s >= 10 ? "Low" : "Very low");

  // Colour ramp for likelihood (0–100): pale yellow → deep green.
  const RAMP = [[0, [250, 236, 150]], [30, [176, 214, 110]], [60, [62, 154, 84]], [100, [8, 78, 50]]];
  function rampColor(t) {
    for (let i = 1; i < RAMP.length; i++) if (t <= RAMP[i][0]) {
      const [a, ca] = RAMP[i - 1], [b, cb] = RAMP[i], f = (t - a) / (b - a);
      return ca.map((v, k) => Math.round(v + (cb[k] - v) * f));
    }
    return RAMP[RAMP.length - 1][1];
  }
  const rgb = (c) => `rgb(${c.join(",")})`;
  // Precomputed RGBA per score; weak scores fade out so the map stays readable.
  const PALETTE = new Uint8ClampedArray(256 * 4);
  for (let s = 0; s <= 100; s++) {
    const c = rampColor(s);
    PALETTE.set([...c, s < 8 ? 0 : Math.round(255 * (0.35 + 0.65 * Math.min(1, s / 55)))], s * 4);
  }

  // ---------- data ----------
  async function gunzipFetch(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(url + " " + r.status);
    const ds = r.body.pipeThrough(new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(ds).arrayBuffer());
  }
  const [HERBS, GRID, META, OVMETA, PHOTOS] = await Promise.all([
    fetch("data/herbs.json").then((r) => r.json()),
    fetch("data/grid.json").then((r) => r.json()),
    fetch("data/env/meta.json").then((r) => r.json()),
    fetch("data/overview/meta.json").then((r) => r.json()),
    fetch("data/photos.json").then((r) => r.json()).catch(() => ({}))
  ]);
  document.getElementById("loading").remove();
  const herbById = Object.fromEntries(HERBS.map((h) => [h.id, h]));
  const prepared = Object.fromEntries(HERBS.map((h) => [h.id, M.prepare(h, META.codes)]));
  const tileSet = new Set(META.tiles.map(([x, y]) => `${x}_${y}`));
  const N = 65536;

  // Regional factor from records (zoom-14 squares = 32 x 32 detail cells).
  const decodeB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const RW = GRID.width, RH = GRID.height;
  const surveyedArr = decodeB64(GRID.surveyed);
  const regArr = Object.fromEntries(HERBS.map((h) => [h.id, GRID.herbs[h.id] ? decodeB64(GRID.herbs[h.id].grid) : new Uint8Array(RW * RH)]));
  function regionalAt(id, gx, gy) {
    const rx = (gx >> 5) - GRID.x0, ry = (gy >> 5) - GRID.y0;
    if (rx < 0 || ry < 0 || rx >= RW || ry >= RH) return { reg: 0, surveyed: false };
    const k = ry * RW + rx;
    return { reg: regArr[id][k], surveyed: surveyedArr[k] === 1 };
  }

  // 50 m environmental chunks, one per zoom-11 tile
  const chunks = new Map();
  function getChunk(cx, cy) {
    const k = `${cx}_${cy}`;
    if (!tileSet.has(k)) return Promise.resolve(null);
    if (!chunks.has(k)) chunks.set(k, gunzipFetch(`data/env/${k}.gz`).catch((e) => { chunks.delete(k); throw e; }));
    return chunks.get(k);
  }
  const layerIndex = Object.fromEntries(META.layers.map((n, i) => [n, i]));
  const cellReader = (buf, idx) => (name) => buf[layerIndex[name] * N + idx];

  function scoreCell(id, buf, idx, gx, gy, detail = false) {
    const code = buf[idx];
    if (!code) return detail ? null : 255;
    const p = prepared[id];
    const h = M.habitatScore(p, code, cellReader(buf, idx), detail);
    const { reg, surveyed } = regionalAt(id, gx, gy);
    const R = M.regionalFactor(reg, surveyed);
    if (!detail) return M.finalScore(h, R);
    return { ...h, reg, surveyed, R, score: M.finalScore(h.value, R) };
  }

  // Score a whole chunk for one herb -> canvas (cached)
  const chunkCanvases = new Map();
  function chunkCanvas(id, cx, cy) {
    const key = `${id}|${cx}_${cy}`;
    if (chunkCanvases.has(key)) return chunkCanvases.get(key);
    const pr = getChunk(cx, cy).then((buf) => {
      if (!buf) return null;
      const img = new ImageData(256, 256);
      const p = prepared[id];
      let idx = 0;
      const v = (name) => buf[layerIndex[name] * N + idx];
      for (idx = 0; idx < N; idx++) {
        const code = buf[idx];
        if (!code) continue;
        const h = M.habitatScore(p, code, v, false);
        if (h <= 0) continue;
        const gx = cx * 256 + (idx & 255), gy = cy * 256 + (idx >> 8);
        const { reg, surveyed } = regionalAt(id, gx, gy);
        const s = M.finalScore(h, M.regionalFactor(reg, surveyed));
        img.data.set(PALETTE.subarray(s * 4, s * 4 + 4), idx * 4);
      }
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      c.getContext("2d").putImageData(img, 0, 0);
      return c;
    });
    chunkCanvases.set(key, pr);
    if (chunkCanvases.size > 300) chunkCanvases.delete(chunkCanvases.keys().next().value);
    return pr;
  }

  // ~200 m overview grids (zoom-9 pixels), one per herb plus "richness"
  const OW = OVMETA.width, OH = OVMETA.height;
  const overviews = new Map();
  function getOverview(id) {
    if (!overviews.has(id)) overviews.set(id, gunzipFetch(`data/overview/${id}.gz`));
    return overviews.get(id);
  }
  const ovCanvases = new Map();
  async function overviewCanvas(key, values, max) {
    if (ovCanvases.has(key)) return ovCanvases.get(key);
    const img = new ImageData(OW, OH);
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (!v) continue;
      const s = max ? Math.round(Math.min(100, 100 * v / max)) : v;
      img.data.set(PALETTE.subarray(s * 4, s * 4 + 4), i * 4);
      if (max && v) img.data[i * 4 + 3] = Math.max(img.data[i * 4 + 3], 120);
    }
    const c = document.createElement("canvas");
    c.width = OW; c.height = OH;
    c.getContext("2d").putImageData(img, 0, 0);
    ovCanvases.set(key, c);
    return c;
  }

  // ---------- state ----------
  const state = { query: "", uses: new Set(), inSeason: false, selected: null };
  function matches(h) {
    if (state.inSeason && !h.season.includes(currentMonth)) return false;
    if (state.uses.size && !h.uses.some((u) => state.uses.has(u))) return false;
    if (state.query) {
      const hay = [h.name, h.de, h.latin, h.family, h.uses.join(" "), h.properties, h.habitat].join(" ").toLowerCase();
      if (!state.query.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  }
  const visibleHerbs = () => HERBS.filter(matches);

  // Map values for the current view when no herb is selected: number of listed herbs with a good score.
  let richnessKey = null, richnessData = null, richnessMax = 1;
  async function currentRichness() {
    const herbs = visibleHerbs();
    const key = herbs.length === HERBS.length ? "_richness" : "rich:" + herbs.map((h) => h.id).join(",");
    if (key === richnessKey) return { key, data: richnessData, max: richnessMax };
    let data;
    if (key === "_richness") data = await getOverview("_richness");
    else {
      data = new Uint8Array(OW * OH);
      const all = await Promise.all(herbs.map((h) => getOverview(h.id)));
      for (const o of all) for (let i = 0; i < o.length; i++) if (o[i] >= 50) data[i]++;
    }
    let max = 1;
    for (const v of data) if (v > max) max = v;
    richnessKey = key; richnessData = data; richnessMax = max;
    return { key, data, max };
  }

  // ---------- map ----------
  const CH_BOUNDS = L.latLngBounds([45.7, 5.8], [47.9, 10.6]);
  const map = L.map("map", { minZoom: 7, maxZoom: 18, maxBounds: CH_BOUNDS.pad(0.3), maxBoundsViscosity: 0.8, zoomSnap: 0.5 })
    .fitBounds(CH_BOUNDS);
  const ATTR = '© <a href="https://www.swisstopo.admin.ch/" target="_blank" rel="noopener">swisstopo</a>, BAFU, WSL, BLW · Records: <a href="https://www.gbif.org" target="_blank" rel="noopener">GBIF.org</a>';
  const wmts = (layer, ext = "jpeg", opts = {}) => L.tileLayer(
    `https://wmts.geo.admin.ch/1.0.0/${layer}/default/current/3857/{z}/{x}/{y}.${ext}`, { attribution: ATTR, maxZoom: 18, ...opts });
  const basemaps = {
    "Swiss map (grey)": wmts("ch.swisstopo.pixelkarte-grau"),
    "Swiss map (colour)": wmts("ch.swisstopo.pixelkarte-farbe"),
    "Aerial photo": wmts("ch.swisstopo.swissimage")
  };
  basemaps["Swiss map (grey)"].addTo(map);
  const overlayPane = map.createPane("overlays");
  overlayPane.style.zIndex = 450;
  const overlays = {
    "Hiking trails": wmts("ch.swisstopo.swisstlm3d-wanderwege", "png", { pane: "overlays", opacity: 0.9 }),
    "Protected areas (picking often banned)": L.layerGroup([
      "ch.bafu.bundesinventare-flachmoore", "ch.bafu.bundesinventare-hochmoore", "ch.bafu.bundesinventare-auen",
      "ch.bafu.bundesinventare-trockenwiesen_trockenweiden", "ch.bafu.schutzgebiete-schweizerischer_nationalpark"
    ].map((l) => wmts(l, "png", { pane: "overlays", opacity: 0.7 }))),
    "Habitat map (WSL)": wmts("ch.bafu.lebensraumkarte-schweiz", "png", { pane: "overlays", opacity: 0.6 })
  };
  L.control.layers(basemaps, overlays, { position: "topright" }).addTo(map);

  const HerbLayer = L.GridLayer.extend({
    createTile(coords, done) {
      const tile = document.createElement("canvas");
      tile.width = tile.height = 256;
      const ctx = tile.getContext("2d");
      ctx.imageSmoothingEnabled = coords.z < 15;
      const z = coords.z;
      const sel = state.selected;
      const draw = async () => {
        if (sel && z >= DETAIL_MIN_ZOOM) {
          const f = 2 ** (z - 11);
          const cx = Math.floor(coords.x / f), cy = Math.floor(coords.y / f);
          const c = await chunkCanvas(sel.id, cx, cy);
          if (c) { const sub = 256 / f; ctx.drawImage(c, (coords.x - cx * f) * sub, (coords.y - cy * f) * sub, sub, sub, 0, 0, 256, 256); }
        } else {
          let c;
          if (sel) c = await overviewCanvas(sel.id, await getOverview(sel.id), 0);
          else { const r = await currentRichness(); c = await overviewCanvas(r.key, r.data, r.max); }
          const scale = 2 ** (9 - z);   // overview px per screen px
          ctx.drawImage(c, coords.x * 256 * scale - OVMETA.x0, coords.y * 256 * scale - OVMETA.y0, 256 * scale, 256 * scale, 0, 0, 256, 256);
        }
      };
      draw().then(() => done(null, tile), (e) => { console.error(e); done(null, tile); });
      return tile;
    }
  });
  let opacity = 0.8;
  let heat = new HerbLayer({ opacity, zIndex: 5, updateWhenZooming: false }).addTo(map);
  function redraw() {
    map.removeLayer(heat);
    heat = new HerbLayer({ opacity, zIndex: 5, updateWhenZooming: false }).addTo(map);
    renderLegend();
  }

  async function renderLegend() {
    const el = document.getElementById("legend");
    const grad = `linear-gradient(90deg, ${RAMP.map(([t, c]) => `${rgb(c)} ${t}%`).join(", ")})`;
    const slider = `<label class="opacity">Overlay <input type="range" id="opacity" min="0.2" max="1" step="0.05" value="${opacity}"></label>`;
    const detail = map.getZoom() >= DETAIL_MIN_ZOOM;
    if (state.selected) {
      el.innerHTML = `<b>Likelihood · ${esc(state.selected.name)}</b>
        <div class="ramp" style="background:${grad}"></div>
        <div class="ramp-labels"><span>Low</span><span>Medium</span><span>High</span></div>
        <div class="legend-note">${detail ? "50 m detail: habitat, terrain, soil, water + records" : "Best spots per ~200 m · zoom in for 50 m detail"}</div>${slider}`;
    } else {
      const r = await currentRichness();
      el.innerHTML = `<b>Medicinal herbs with good spots</b>
        <div class="ramp" style="background:${grad}"></div>
        <div class="ramp-labels"><span>1</span><span>${r.max} herbs</span></div>
        <div class="legend-note">Per ~200 m · select a herb for its own 50 m map</div>${slider}`;
    }
    el.querySelector("#opacity").addEventListener("input", (e) => { opacity = +e.target.value; heat.setOpacity(opacity); });
  }
  L.DomEvent.disableClickPropagation(document.getElementById("legend"));
  L.DomEvent.disableScrollPropagation(document.getElementById("legend"));
  let lastDetail = null;
  map.on("zoomend", () => {
    const d = map.getZoom() >= DETAIL_MIN_ZOOM;
    if (d !== lastDetail) { lastDetail = d; renderLegend(); }
  });

  // ---------- describing a spot ----------
  const px11 = (latlng) => map.project(latlng, 11);
  const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const dist = (m) => (m >= 2500 ? "> 2.5 km" : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 10) * 10} m`);
  const habitatLabel = (code) => {
    const l = META.labels[code] || {};
    return { en: l.en || l.de || code, de: l.de };
  };
  const FACTOR_LABEL = { habitat: "Habitat", altitude: "Altitude", moisture: "Moisture", light: "Light", soil: "Soil", warmth: "Warmth", forest: "Forest type" };
  const NEAR_LABEL = { water: "near water", edge: "near the forest edge", hedge: "near hedges/trees", buildings: "near buildings", paths: "along paths" };

  async function showPointPopup(latlng, title) {
    const p = px11(latlng);
    const gx = Math.floor(p.x), gy = Math.floor(p.y);
    const cx = gx >> 8, cy = gy >> 8, idx = (gy & 255) * 256 + (gx & 255);
    const popup = L.popup({ maxWidth: 340, minWidth: 260 }).setLatLng(latlng).setContent('<div class="popup">Loading…</div>').openOn(map);
    let buf;
    try { buf = await getChunk(cx, cy); } catch (e) { popup.setContent('<div class="popup">Could not load map data here.</div>'); return; }
    if (!buf || !buf[idx]) { popup.setContent('<div class="popup">Outside the mapped area.</div>'); return; }
    const code = META.codes[buf[idx] - 1];
    const hl = habitatLabel(code);
    const herbs = visibleHerbs();
    const results = herbs.map((h) => ({ h, s: scoreCell(h.id, buf, idx, gx, gy) })).filter((r) => r.s >= 10).sort((a, b) => b.s - a.s);
    const sel = state.selected;
    const base = M.habitatScore(prepared[(sel || HERBS[0]).id], buf[idx], cellReader(buf, idx), true);
    const env = base.env || M.indices(cellReader(buf, idx));
    const asp = buf[layerIndex.aspect * N + idx];
    const facing = asp === 255 ? "" : DIRS[Math.round(asp / 250 * 8) % 8];
    const envBits = [];
    if (env.elev != null) envBits.push(`${env.elev.toLocaleString()} m`);
    envBits.push(env.slope >= 3 ? `${env.slope}° slope${facing ? " facing " + facing : ""}` : "flat");
    if (base.moisture != null) envBits.push(base.moisture < 0.3 ? "dry" : base.moisture < 0.55 ? "fresh soil" : base.moisture < 0.75 ? "moist" : "wet");
    if (base.lime != null) envBits.push(base.lime < 0.3 ? "acidic soil" : base.lime > 0.65 ? "lime-rich" : "neutral soil");
    envBits.push(`water ${dist(env.water)}`, `forest edge ${dist(env.edge)}`, `path ${dist(env.paths)}`);
    if (env.buildings <= 300) envBits.push(`buildings ${dist(env.buildings)}`);

    let selHtml = "";
    if (sel) {
      const d = scoreCell(sel.id, buf, idx, gx, gy, true);
      if (d && !d.bare) {
        const bars = d.factors.map((f) => `<div class="fbar"><span>${FACTOR_LABEL[f.key]}</span><i><b style="width:${Math.round(f.fit * 100)}%;background:${rgb(rampColor(f.fit * 100))}"></b></i></div>`).join("");
        const recs = d.reg >= 60 ? "common in this area" : d.reg >= 30 ? "regularly recorded nearby" : d.reg > 0 ? "occasionally recorded nearby" : d.surveyed ? "not recorded within ~5 km" : "few plant records in this area";
        const why = [];
        if (d.habitatAffinity >= 0.6) why.push(`typical habitat`);
        else if (d.habitatAffinity >= 0.3) why.push(`possible habitat`);
        if (d.near) why.push(NEAR_LABEL[d.near]);
        selHtml = `<div class="sel-box"><div class="sel-head"><b>${esc(sel.name)}</b><span class="score" style="background:${rgb(rampColor(d.score))};color:${d.score > 45 ? "#fff" : "#1f2a22"}">${d.score}</span></div>
          <div class="sel-sub">${levelOf(d.score)} likelihood${why.length ? " · " + why.join(", ") : ""}</div>
          ${bars}<div class="fbar"><span>Records</span><i><b style="width:${Math.round(d.R * 100)}%;background:${rgb(rampColor(d.R * 100))}"></b></i></div>
          <div class="sel-sub">Plant records: ${recs}</div></div>`;
      } else selHtml = `<div class="sel-box"><b>${esc(sel.name)}</b>: nothing grows here (water, rock, buildings or road).</div>`;
    }
    const list = results.length
      ? `<ul>${results.slice(0, 12).map((r) => `<li data-id="${r.h.id}"><span class="dot" style="background:${rgb(rampColor(r.s))}"></span>${esc(r.h.name)}<span class="lv">${r.s}</span></li>`).join("")}</ul>`
      : `<p class="none">No listed herb is likely right here.</p>`;
    popup.setContent(`<div class="popup">
      ${title ? `<h4>${esc(title)}</h4>` : ""}
      <div class="hab"><b>${esc(hl.en)}</b>${hl.de && hl.de !== hl.en ? `<br><span>${esc(hl.de)}</span>` : ""}</div>
      <div class="env">${envBits.map((b) => `<span>${esc(b)}</span>`).join("")}</div>
      ${selHtml}
      <div class="list-title">Herbs likely at this spot</div>${list}</div>`);
    popup.getElement()?.querySelectorAll("li[data-id]").forEach((li) =>
      li.addEventListener("click", () => selectHerb(li.dataset.id, { latlng })));
  }

  const legendEl = document.getElementById("legend");
  map.on("popupopen", () => legendEl.classList.add("hidden"));
  map.on("popupclose", () => legendEl.classList.remove("hidden"));
  map.on("click", (e) => { document.getElementById("mapHint").classList.add("gone"); showPointPopup(e.latlng); });

  let locationMarker = null;
  document.getElementById("locateBtn").addEventListener("click", () => {
    if (!navigator.geolocation) return alert("Your browser can't share its location.");
    navigator.geolocation.getCurrentPosition((pos) => {
      const ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
      if (!CH_BOUNDS.contains(ll)) return alert("You seem to be outside Switzerland. Click on the map instead.");
      if (locationMarker) locationMarker.remove();
      locationMarker = L.circleMarker(ll, { radius: 7, color: "#fff", weight: 2, fillColor: "#2563eb", fillOpacity: 1 }).addTo(map);
      map.flyTo(ll, 14, { duration: 0.8 });
      map.once("moveend", () => showPointPopup(ll, "Your location"));
      document.getElementById("mapHint").classList.add("gone");
    }, () => alert("Couldn't get your location. You can click on the map instead."), { timeout: 10000 });
  });

  // ---------- best spots in view ----------
  const spotLayer = L.layerGroup().addTo(map);
  document.getElementById("spotsBtn").addEventListener("click", async () => {
    const sel = state.selected;
    if (!sel) return;
    spotLayer.clearLayers();
    const o = await getOverview(sel.id);
    const b = map.getBounds();
    const nw = map.project(b.getNorthWest(), 9), se = map.project(b.getSouthEast(), 9);
    const cand = [];
    for (let y = Math.max(0, Math.floor(nw.y) - OVMETA.y0); y < Math.min(OH, Math.ceil(se.y) - OVMETA.y0); y++)
      for (let x = Math.max(0, Math.floor(nw.x) - OVMETA.x0); x < Math.min(OW, Math.ceil(se.x) - OVMETA.x0); x++) {
        const v = o[y * OW + x];
        if (v >= 20) cand.push([v, x, y]);
      }
    cand.sort((a, b) => b[0] - a[0]);
    const minSep = Math.max(3, (se.x - nw.x) / 12);
    const picks = [];
    for (const c of cand) {
      if (picks.every((p) => Math.hypot(p[1] - c[1], p[2] - c[2]) >= minSep)) picks.push(c);
      if (picks.length === 5) break;
    }
    if (!picks.length) return alert(`No good spots for ${sel.name} in this view. Try zooming out.`);
    // refine each ~200 m overview cell to its best 50 m cell (4 x 4 detail cells)
    const refined = await Promise.all(picks.map(async ([v, x, y]) => {
      const gx0 = (x + OVMETA.x0) * 4, gy0 = (y + OVMETA.y0) * 4;
      let best = null;
      try {
        const buf = await getChunk(gx0 >> 8, gy0 >> 8);
        if (buf) for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) {
          const gx = gx0 + dx, gy = gy0 + dy, s = scoreCell(sel.id, buf, (gy & 255) * 256 + (gx & 255), gx, gy);
          if (s !== 255 && (!best || s > best[0])) best = [s, gx, gy];
        }
      } catch (e) { /* fall back to the overview cell centre */ }
      return best ? map.unproject([best[1] + 0.5, best[2] + 0.5], 11) : map.unproject([x + OVMETA.x0 + 0.5, y + OVMETA.y0 + 0.5], 9);
    }));
    picks.forEach((pk, i) => {
      const ll = refined[i];
      L.marker(ll, { icon: L.divIcon({ className: "spot", html: `<span>${i + 1}</span>`, iconSize: [26, 26] }) })
        .on("click", () => showPointPopup(ll, `Spot ${i + 1}`)).addTo(spotLayer);
    });
  });

  // ---------- sidebar ----------
  const listEl = document.getElementById("herbList");
  const countEl = document.getElementById("count");
  const photoOf = (id) => (PHOTOS[id] && PHOTOS[id][0]) || null;

  function renderList() {
    const herbs = visibleHerbs().slice().sort((a, b) => a.name.localeCompare(b.name));
    countEl.textContent = `${herbs.length} of ${HERBS.length} herbs`;
    listEl.innerHTML = herbs.length ? herbs.map((h) => {
      const st = OVMETA.stats[h.id] || { medium: 0 };
      const pct = Math.round(100 * st.medium);
      const ph = photoOf(h.id);
      return `<li class="herb-item" tabindex="0" data-id="${h.id}">
        <span class="thumb">${ph ? `<img src="${ph.file}" alt="" loading="lazy">` : ""}</span>
        <span class="name">${esc(h.name)}</span>
        <span class="spread" title="Medium or high likelihood in ${pct}% of Switzerland"><i style="width:${Math.max(4, Math.min(100, pct * 2))}%"></i></span>
        <span class="latin">${esc(h.de)} · <em>${esc(h.latin)}</em></span>
        <span class="tags">${h.uses.map((u) => `<span class="tag">${esc(u)}</span>`).join("")}${h.protection ? '<span class="tag prot">Protected</span>' : ""}</span>
      </li>`;
    }).join("") : `<li class="empty">No herbs match. Try another search or clear the filters.</li>`;
  }
  listEl.addEventListener("click", (e) => { const li = e.target.closest(".herb-item"); if (li) selectHerb(li.dataset.id); });
  listEl.addEventListener("keydown", (e) => {
    const li = e.target.closest(".herb-item");
    if (li && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); selectHerb(li.dataset.id); }
  });

  function wherePrefs(h) {
    const m = h.model, out = [];
    const top = Object.entries(m.habitats).sort((a, b) => b[1] - a[1]).filter(([, v]) => v >= 0.6).slice(0, 5);
    const name = (code) => (META.labels[code]?.en) || habitatLabel(code).en;
    if (top.length) out.push(`<li><b>Habitats:</b> ${top.map(([c]) => esc(name(c))).join(", ")}</li>`);
    out.push(`<li><b>Altitude:</b> best ${m.elev[1]}–${m.elev[2]} m (from ${m.elev[0]} to ${m.elev[3]} m)</li>`);
    const [lo, hi] = m.moisture, mid = (lo + hi) / 2;
    out.push(`<li><b>Soil moisture:</b> ${mid < 0.3 ? "dry" : mid < 0.5 ? "dry to fresh" : mid < 0.65 ? "fresh to moist" : mid < 0.8 ? "moist to wet" : "wet"}</li>`);
    out.push(`<li><b>Light:</b> ${{ open: "full sun, open land", half: "light shade, edges", shade: "shade of the forest floor" }[m.light]}</li>`);
    const soil = [];
    if (m.lime) soil.push(m.lime[0] === "lime" ? (m.lime[1] > 0.5 ? "lime-rich" : "prefers lime") : (m.lime[1] > 0.5 ? "acidic (lime-free)" : "prefers acidic"));
    if (m.nutrients) soil.push(m.nutrients[0] === "rich" ? "nutrient-rich" : "nutrient-poor");
    if (soil.length) out.push(`<li><b>Soil:</b> ${soil.join(", ")}</li>`);
    if (m.warm >= 0.4) out.push(`<li><b>Climate:</b> warm, sunny south-facing slopes</li>`);
    if (m.forest) out.push(`<li><b>Forest:</b> ${m.forest === "broadleaf" ? "broadleaf (beech, maple, ash…)" : "conifer (spruce, fir, pine)"}</li>`);
    const near = Object.entries(m.near || {}).filter(([, w]) => w >= 0.5).sort((a, b) => b[1] - a[1]).map(([k]) => NEAR_LABEL[k]);
    if (near.length) out.push(`<li><b>Look:</b> ${near.join(", ")}</li>`);
    return out.join("");
  }

  function gallery(h) {
    const ph = PHOTOS[h.id] || [];
    if (!ph.length) return "";
    return `<figure class="gallery">
      <div class="main-photo"><img id="mainPhoto" src="${ph[0].file}" alt="${esc(h.name)}"></div>
      <figcaption id="photoCredit">${credit(ph[0])}</figcaption>
      ${ph.length > 1 ? `<div class="thumbs">${ph.map((p, i) => `<button type="button" data-i="${i}" class="${i ? "" : "on"}"><img src="${p.file}" alt="Photo ${i + 1} of ${esc(h.name)}" loading="lazy"></button>`).join("")}</div>` : ""}
    </figure>`;
  }
  const credit = (p) => `Photo: ${esc(p.author)} · <a href="${esc(p.source)}" target="_blank" rel="noopener">${esc(p.license)}, ${esc(p.site || "Wikimedia Commons")}</a>`;

  function renderDetail(h) {
    const st = OVMETA.stats[h.id] || { medium: 0, high: 0 };
    const pct = (x) => (x * 100 < 1 ? (x * 100).toFixed(1) : Math.round(x * 100));
    document.getElementById("detail").innerHTML = `
      <div class="detail">
        ${gallery(h)}
        <h2>${esc(h.name)}</h2>
        <p class="latin"><b>${esc(h.de)}</b> · <em>${esc(h.latin)}</em></p>
        <p class="family">${esc(h.family)} family · Parts used: ${esc(h.parts)}</p>
        <div class="badges">
          <span class="badge ev-${h.evidence}">${EVIDENCE_LABEL[h.evidence]}</span>
          ${h.uses.map((u) => `<span class="badge">${esc(u)}</span>`).join("")}
        </div>

        <h3>Where to find it</h3>
        <p>${esc(h.habitat)}</p>
        <ul class="prefs">${wherePrefs(h)}</ul>
        <div class="stats">
          <div><b>${pct(st.high)}%</b><small>of Switzerland high</small></div>
          <div><b>${pct(st.medium)}%</b><small>medium or high</small></div>
          <div><b>${(GRID.herbs[h.id]?.records || 0).toLocaleString()}</b><small>records since 1990</small></div>
        </div>
        <button class="ghost-btn small" id="spotsBtn2" type="button">★ Show best spots in the map view</button>

        <h3>When to look</h3>
        <div class="months">${MONTHS.map((m, i) => `<span class="${h.season.includes(i + 1) ? "on" : ""} ${i + 1 === currentMonth ? "now" : ""}" title="${MONTH_FULL[i]}">${m[0]}</span>`).join("")}</div>

        <h3>Identification</h3>
        <p>${esc(h.lookalikes)}</p>

        <h3>Healing properties</h3>
        <p>${esc(h.properties)}</p>

        <h3>How it's used</h3>
        <p>${esc(h.preparation)}</p>

        <h3>Cautions</h3>
        <div class="warn-box">${esc(h.cautions)}</div>
        ${h.protection ? `<div class="prot-box"><b>Protection:</b> ${esc(h.protection)}</div>` : ""}
      </div>`;
    document.getElementById("spotsBtn2").addEventListener("click", () => document.getElementById("spotsBtn").click());
    const ph = PHOTOS[h.id] || [];
    document.querySelectorAll(".thumbs button").forEach((b) => b.addEventListener("click", () => {
      const p = ph[+b.dataset.i];
      document.getElementById("mainPhoto").src = p.file;
      document.getElementById("photoCredit").innerHTML = credit(p);
      document.querySelectorAll(".thumbs button").forEach((x) => x.classList.toggle("on", x === b));
    }));
  }

  function selectHerb(id, opts = {}) {
    const herb = herbById[id];
    if (!herb) return;
    state.selected = herb;
    spotLayer.clearLayers();
    renderDetail(herb);
    document.getElementById("listView").hidden = true;
    document.getElementById("detailView").hidden = false;
    document.getElementById("panel").scrollTop = 0;
    document.getElementById("spotsBtn").hidden = false;
    redraw();
    if (opts.latlng) showPointPopup(opts.latlng); else map.closePopup();
    history.replaceState(null, "", "#" + herb.id);
  }
  function showList() {
    state.selected = null;
    spotLayer.clearLayers();
    document.getElementById("listView").hidden = false;
    document.getElementById("detailView").hidden = true;
    document.getElementById("spotsBtn").hidden = true;
    map.closePopup();
    redraw();
    history.replaceState(null, "", location.pathname + location.search);
  }
  document.getElementById("backBtn").addEventListener("click", showList);

  // Filters
  const allUses = [...new Set(HERBS.flatMap((h) => h.uses))].sort();
  const chipsEl = document.getElementById("useChips");
  chipsEl.innerHTML = allUses.map((u) => `<button type="button" class="chip" aria-pressed="false" data-use="${esc(u)}">${esc(u)}</button>`).join("");
  chipsEl.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const u = b.dataset.use;
    state.uses.has(u) ? state.uses.delete(u) : state.uses.add(u);
    b.setAttribute("aria-pressed", state.uses.has(u));
    render();
  });
  let searchTimer;
  document.getElementById("search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.query = e.target.value.trim().toLowerCase(); render(); }, 200);
  });
  document.getElementById("monthName").textContent = `(${MONTH_FULL[currentMonth - 1]})`;
  document.getElementById("seasonToggle").addEventListener("change", (e) => { state.inSeason = e.target.checked; render(); });
  const dialog = document.getElementById("aboutDialog");
  document.getElementById("aboutBtn").addEventListener("click", () => dialog.showModal());

  function render() {
    renderList();
    if (!state.selected) redraw();
  }

  renderList();
  const fromHash = location.hash.slice(1);
  if (fromHash && herbById[fromHash]) selectHerb(fromHash); else renderLegend();
})();
