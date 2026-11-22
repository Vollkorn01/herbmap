(async function () {
  "use strict";

  const LEVELS = ["high", "medium", "low"];
  const LEVEL_LABEL = { high: "High", medium: "Medium", low: "Low" };
  const EVIDENCE_LABEL = { good: "Good evidence", some: "Some evidence", traditional: "Traditional use" };
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonth = new Date().getMonth() + 1;
  const levelOf = (score) => (score >= 60 ? "high" : score >= 30 ? "medium" : "low");
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Colour ramp for likelihood (0–100): pale yellow → deep green.
  const RAMP = [[0, [250, 236, 150]], [30, [176, 214, 110]], [60, [62, 154, 84]], [100, [8, 78, 50]]];
  function rampColor(t, stops = RAMP) {
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const [a, ca] = stops[i - 1], [b, cb] = stops[i];
        const f = (t - a) / (b - a);
        return ca.map((v, k) => Math.round(v + (cb[k] - v) * f));
      }
    }
    return stops[stops.length - 1][1];
  }
  const rgb = (c) => `rgb(${c.join(",")})`;
  const levelColor = (lvl) => rgb(rampColor({ high: 80, medium: 45, low: 15 }[lvl]));

  // ---------- data ----------
  const [HERBS, GRID] = await Promise.all([
    fetch("data/herbs.json").then((r) => r.json()),
    fetch("data/grid.json").then((r) => r.json())
  ]);
  document.getElementById("loading").remove();
  const CELL_Z = GRID.cellZoom, X0 = GRID.x0, Y0 = GRID.y0, W = GRID.width, H = GRID.height;
  // Cell index in the packed grids; -1 when outside the data area.
  const key = (rx, ry) => (rx >= 0 && ry >= 0 && rx < W && ry < H ? ry * W + rx : -1);
  const decode = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const valueGetter = (arr) => (k) => (k < 0 || !arr[k] ? undefined : arr[k]);
  const cellMaps = {};
  for (const h of HERBS) {
    const data = GRID.herbs[h.id];
    const arr = data ? decode(data.grid) : new Uint8Array(W * H);
    cellMaps[h.id] = { arr, get: valueGetter(arr) };
    const cells = [];
    arr.forEach((v, i) => { if (v) cells.push([i % W, Math.floor(i / W), v]); });
    h.stats = { records: data ? data.records : 0, cells };
  }
  const richnessArr = decode(GRID.richness);
  const richness = { get: valueGetter(richnessArr) };
  const maxRichness = Math.max(1, ...richnessArr);
  const surveyedArr = decode(GRID.surveyed);
  const surveyed = { has: (k) => k >= 0 && surveyedArr[k] === 1, size: surveyedArr.reduce((a, b) => a + b, 0) };

  // ---------- state ----------
  const state = { query: "", uses: new Set(), inSeason: false, selected: null };

  function matches(h) {
    if (state.inSeason && !h.season.includes(currentMonth)) return false;
    if (state.uses.size && !h.uses.some((u) => state.uses.has(u))) return false;
    if (state.query) {
      const hay = [h.name, h.de, h.latin, h.family, h.uses.join(" "), h.properties].join(" ").toLowerCase();
      if (!state.query.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  }
  const visibleHerbs = () => HERBS.filter(matches);

  // ---------- map ----------
  const CH_BOUNDS = L.latLngBounds([45.7, 5.8], [47.9, 10.6]);
  const map = L.map("map", {
    minZoom: 7, maxZoom: 18, maxBounds: CH_BOUNDS.pad(0.3), maxBoundsViscosity: 0.8, zoomSnap: 0.5
  }).fitBounds(CH_BOUNDS);

  const swisstopo = (layer, ext = "jpeg", maxNativeZoom = 18) => L.tileLayer(
    `https://wmts.geo.admin.ch/1.0.0/${layer}/default/current/3857/{z}/{x}/{y}.${ext}`,
    { attribution: '© <a href="https://www.swisstopo.admin.ch/" target="_blank" rel="noopener">swisstopo</a> · Records: <a href="https://www.gbif.org" target="_blank" rel="noopener">GBIF.org</a>', maxNativeZoom, maxZoom: 18 }
  );
  const basemaps = {
    "Swiss map (grey)": swisstopo("ch.swisstopo.pixelkarte-grau"),
    "Swiss map (colour)": swisstopo("ch.swisstopo.pixelkarte-farbe"),
    "Aerial photo": swisstopo("ch.swisstopo.swissimage")
  };
  basemaps["Swiss map (grey)"].addTo(map);
  L.control.layers(basemaps, null, { position: "topright" }).addTo(map);

  // Canvas grid layer that paints ~1.7 km squares (Web Mercator zoom-14 tiles).
  const HeatLayer = L.GridLayer.extend({
    createTile(coords) {
      const tile = document.createElement("canvas");
      const size = this.getTileSize();
      tile.width = size.x; tile.height = size.y;
      const ctx = tile.getContext("2d");
      const z = coords.z;
      const valueAt = this.options.valueAt, colorOf = this.options.colorOf;
      if (z <= CELL_Z) {
        // Paint one pixel per square (plus a 1-square margin) and let the browser
        // upscale it smoothly, so the ~5 km data reads as a gradient, not blocks.
        const n = 2 ** (CELL_Z - z);
        const gx0 = coords.x * n - X0, gy0 = coords.y * n - Y0;
        const off = document.createElement("canvas");
        off.width = off.height = n + 2;
        const octx = off.getContext("2d");
        const img = octx.createImageData(n + 2, n + 2);
        let any = false;
        for (let j = -1; j <= n; j++) for (let i = -1; i <= n; i++) {
          const v = valueAt(key(gx0 + i, gy0 + j));
          if (v == null) continue;
          any = true;
          const c = colorOf(v), o = ((j + 1) * (n + 2) + (i + 1)) * 4;
          img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
        }
        if (!any) return tile;
        octx.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = n < 64;  // keep crisp at the national overview
        ctx.imageSmoothingQuality = "high";
        const px = size.x / n;
        ctx.drawImage(off, -px, -px, size.x + 2 * px, size.y + 2 * px);
      } else {
        const f = 2 ** (z - CELL_Z);
        const v = valueAt(key(Math.floor(coords.x / f) - X0, Math.floor(coords.y / f) - Y0));
        if (v != null) { ctx.fillStyle = rgb(colorOf(v)); ctx.fillRect(0, 0, size.x, size.y); }
      }
      return tile;
    }
  });

  let heat = null;
  let opacity = 0.72;
  // The data is ~5 km coarse: fade it at close zoom so paths and terrain stay readable.
  const zoomFade = () => { const z = map.getZoom(); return z <= 11 ? 1 : z >= 15 ? 0.3 : 1 - 0.175 * (z - 11); };
  const effectiveOpacity = () => opacity * zoomFade();
  map.on("zoomend", () => heat && heat.setOpacity(effectiveOpacity()));
  function drawHeat() {
    if (heat) map.removeLayer(heat);
    const sel = state.selected;
    if (sel) {
      const m = cellMaps[sel.id];
      heat = new HeatLayer({ valueAt: (k) => m.get(k), colorOf: (v) => rampColor(v), opacity: effectiveOpacity(), zIndex: 5 });
    } else {
      // Overview: how many of the currently listed herbs have medium/high likelihood here.
      const herbs = visibleHerbs();
      const all = herbs.length === HERBS.length;
      let counts = richness, max = maxRichness;
      if (!all) {
        const c = new Uint8Array(W * H);
        for (const h of herbs) cellMaps[h.id].arr.forEach((v, i) => { if (v >= 35) c[i]++; });
        counts = { get: valueGetter(c) };
        max = Math.max(1, ...c);
      }
      heat = new HeatLayer({ valueAt: (k) => counts.get(k), colorOf: (v) => rampColor(100 * v / max), opacity: effectiveOpacity(), zIndex: 5 });
      heat.maxCount = max;
    }
    heat.addTo(map);
    renderLegend();
  }

  function renderLegend() {
    const el = document.getElementById("legend");
    const grad = `linear-gradient(90deg, ${RAMP.map(([t, c]) => `${rgb(c)} ${t}%`).join(", ")})`;
    const slider = `<label class="opacity">Overlay <input type="range" id="opacity" min="0.2" max="1" step="0.05" value="${opacity}"></label>`;
    if (state.selected) {
      el.innerHTML = `<b>Likelihood to find · ${esc(state.selected.name)}</b>
        <div class="ramp" style="background:${grad}"></div>
        <div class="ramp-labels"><span>Low</span><span>Medium</span><span>High</span></div>
        <div class="legend-note">Blank: not recorded nearby or too few records</div>${slider}`;
    } else {
      el.innerHTML = `<b>Medicinal herbs likely per area</b>
        <div class="ramp" style="background:${grad}"></div>
        <div class="ramp-labels"><span>1</span><span>${heat.maxCount} herbs</span></div>
        <div class="legend-note">Herbs with medium or high likelihood here</div>${slider}`;
    }
    el.querySelector("#opacity").addEventListener("input", (e) => {
      opacity = +e.target.value;
      heat.setOpacity(effectiveOpacity());
    });
  }
  // Keep map gestures from firing when using the legend slider.
  L.DomEvent.disableClickPropagation(document.getElementById("legend"));
  L.DomEvent.disableScrollPropagation(document.getElementById("legend"));

  // ---------- "what grows here" ----------
  function cellAt(latlng) {
    const p = map.project(latlng, CELL_Z);
    return key(Math.floor(p.x / 256) - X0, Math.floor(p.y / 256) - Y0);
  }

  function showPointPopup(latlng, title) {
    const k = cellAt(latlng);
    const results = visibleHerbs()
      .map((h) => ({ herb: h, score: cellMaps[h.id].get(k) }))
      .filter((r) => r.score != null)
      .sort((a, b) => b.score - a.score);
    const sel = state.selected;
    let selLine = "";
    if (sel) {
      const s = cellMaps[sel.id].get(k);
      selLine = `<div class="sel-line"><b>${esc(sel.name)}</b>: ${s != null
        ? `${LEVEL_LABEL[levelOf(s)]} likelihood (${s}/100)`
        : surveyed.has(k) ? "not recorded in this area" : "too few plant records here to say"}</div>`;
    }
    const list = results.length
      ? `<ul>${results.map((r) => `<li data-id="${r.herb.id}"><span class="dot" style="background:${rgb(rampColor(r.score))}"></span>${esc(r.herb.name)}<span class="lv">${r.score}</span></li>`).join("")}</ul>`
      : `<p class="none">${surveyed.has(k) ? "None of the listed herbs were recorded in this area." : "Too few plant records in this area to say."}${state.uses.size || state.query || state.inSeason ? " Try clearing your filters." : ""}</p>`;
    const html = `<div class="popup"><h4>${esc(title || "Herbs likely here")}</h4>
      <div class="sub">${latlng.lat.toFixed(4)}° N, ${latlng.lng.toFixed(4)}° E · ${results.length} herb${results.length === 1 ? "" : "s"} · score 0–100</div>${selLine}${list}</div>`;
    const popup = L.popup({ maxWidth: 300 }).setLatLng(latlng).setContent(html).openOn(map);
    popup.getElement().querySelectorAll("li[data-id]").forEach((li) =>
      li.addEventListener("click", () => selectHerb(li.dataset.id, { keepView: true, latlng })));
  }

  map.on("click", (e) => {
    document.getElementById("mapHint").classList.add("gone");
    showPointPopup(e.latlng);
  });

  let locationMarker = null;
  document.getElementById("locateBtn").addEventListener("click", () => {
    if (!navigator.geolocation) return alert("Your browser can't share its location.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
        if (!CH_BOUNDS.contains(ll)) return alert("You seem to be outside Switzerland. Click on the map instead.");
        if (locationMarker) locationMarker.remove();
        locationMarker = L.circleMarker(ll, { radius: 7, color: "#fff", weight: 2, fillColor: "#2563eb", fillOpacity: 1 }).addTo(map);
        map.flyTo(ll, 12, { duration: 0.8 });
        map.once("moveend", () => showPointPopup(ll, "Herbs near you"));
        document.getElementById("mapHint").classList.add("gone");
      },
      () => alert("Couldn't get your location. You can click on the map instead."),
      { timeout: 10000 }
    );
  });

  // ---------- sidebar ----------
  const listEl = document.getElementById("herbList");
  const countEl = document.getElementById("count");
  const surveyedCount = surveyed.size;

  function renderList() {
    const herbs = visibleHerbs().slice().sort((a, b) => a.name.localeCompare(b.name));
    countEl.textContent = `${herbs.length} of ${HERBS.length} herbs`;
    listEl.innerHTML = herbs.length ? herbs.map((h) => {
      const pct = Math.round(100 * h.stats.cells.filter((c) => c[2] >= 30).length / surveyedCount);
      return `
      <li class="herb-item" tabindex="0" data-id="${h.id}">
        <span class="name">${esc(h.name)}</span>
        <span class="spread" title="Medium or high likelihood in ${pct}% of Switzerland"><i style="width:${Math.max(4, pct)}%"></i></span>
        <span class="latin">${esc(h.de)} · <em>${esc(h.latin)}</em></span>
        <span class="tags">${h.uses.map((u) => `<span class="tag">${esc(u)}</span>`).join("")}${h.protection ? '<span class="tag prot">Protected</span>' : ""}</span>
      </li>`;
    }).join("") : `<li class="empty">No herbs match. Try another search or clear the filters.</li>`;
  }

  listEl.addEventListener("click", (e) => {
    const li = e.target.closest(".herb-item");
    if (li) selectHerb(li.dataset.id);
  });
  listEl.addEventListener("keydown", (e) => {
    const li = e.target.closest(".herb-item");
    if (li && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); selectHerb(li.dataset.id); }
  });

  function renderDetail(h) {
    const cells = h.stats.cells;
    const byLevel = { high: 0, medium: 0, low: 0 };
    cells.forEach((c) => byLevel[levelOf(c[2])]++);
    const pct = (n) => (100 * n / surveyedCount).toFixed(n && n / surveyedCount < 0.01 ? 1 : 0);
    document.getElementById("detail").innerHTML = `
      <div class="detail">
        <h2>${esc(h.name)}</h2>
        <p class="latin"><b>${esc(h.de)}</b> · <em>${esc(h.latin)}</em></p>
        <p class="family">${esc(h.family)} family · Parts used: ${esc(h.parts)}</p>
        <div class="badges">
          <span class="badge ev-${h.evidence}">${EVIDENCE_LABEL[h.evidence]}</span>
          ${h.uses.map((u) => `<span class="badge">${esc(u)}</span>`).join("")}
        </div>

        <h3>Healing properties</h3>
        <p>${esc(h.properties)}</p>

        <h3>How it's used</h3>
        <p>${esc(h.preparation)}</p>

        <h3>Cautions</h3>
        <div class="warn-box">${esc(h.cautions)}</div>
        ${h.protection ? `<div class="prot-box"><b>Protection:</b> ${esc(h.protection)}</div>` : ""}

        <h3>Where to find it in Switzerland</h3>
        <p>${esc(h.habitat)}</p>
        <p class="muted">Altitude: ${esc(h.altitude)}</p>
        <div class="stats">
          ${LEVELS.map((l) => `<div><span class="dot" style="background:${levelColor(l)}"></span><b>${byLevel[l].toLocaleString()}</b> ${LEVEL_LABEL[l].toLowerCase()}<small>${pct(byLevel[l])}% of areas</small></div>`).join("")}
        </div>
        <p class="muted small">${h.stats.records.toLocaleString()} records since 1990 · data resolution about 5 km</p>
        <button class="ghost-btn small" id="bestBtn" type="button">Zoom to where it grows</button>

        <h3>When to look</h3>
        <div class="months">${MONTHS.map((m, i) => `<span class="${h.season.includes(i + 1) ? "on" : ""} ${i + 1 === currentMonth ? "now" : ""}" title="${MONTH_FULL[i]}">${m[0]}</span>`).join("")}</div>

        <h3>Identification</h3>
        <p>${esc(h.lookalikes)}</p>
      </div>`;
    document.getElementById("bestBtn").addEventListener("click", () => fitBest(h));
  }

  function cellBounds(rx, ry) {
    const nw = map.unproject([(rx + X0) * 256, (ry + Y0) * 256], CELL_Z);
    const se = map.unproject([(rx + X0 + 1) * 256, (ry + Y0 + 1) * 256], CELL_Z);
    return L.latLngBounds(nw, se);
  }
  function fitBest(h) {
    const cells = h.stats.cells;
    if (!cells.length) return;
    const good = cells.filter((c) => c[2] >= 30);
    const use = good.length ? good : cells;
    const b = L.latLngBounds([]);
    use.forEach(([x, y]) => b.extend(cellBounds(x, y)));
    map.flyToBounds(b, { padding: [30, 30], duration: 0.8 });
  }

  function selectHerb(id, opts = {}) {
    const herb = HERBS.find((h) => h.id === id);
    if (!herb) return;
    state.selected = herb;
    renderDetail(herb);
    document.getElementById("listView").hidden = true;
    document.getElementById("detailView").hidden = false;
    document.getElementById("panel").scrollTop = 0;
    drawHeat();
    if (opts.latlng) showPointPopup(opts.latlng);
    history.replaceState(null, "", "#" + herb.id);
  }

  function showList() {
    state.selected = null;
    document.getElementById("listView").hidden = false;
    document.getElementById("detailView").hidden = true;
    map.closePopup();
    drawHeat();
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
    searchTimer = setTimeout(() => { state.query = e.target.value.trim().toLowerCase(); render(); }, 150);
  });
  document.getElementById("monthName").textContent = `(${MONTH_FULL[currentMonth - 1]})`;
  document.getElementById("seasonToggle").addEventListener("change", (e) => {
    state.inSeason = e.target.checked;
    render();
  });

  const dialog = document.getElementById("aboutDialog");
  document.getElementById("aboutBtn").addEventListener("click", () => dialog.showModal());

  function render() {
    renderList();
    if (!state.selected) drawHeat();
  }

  // Init
  renderList();
  const fromHash = location.hash.slice(1);
  if (fromHash && HERBS.some((h) => h.id === fromHash)) selectHerb(fromHash); else drawHeat();
})();
