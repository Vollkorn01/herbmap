(function () {
  "use strict";

  const HERBS = window.HERBS;
  const REGIONS = window.REGIONS;
  const LEVELS = ["high", "medium", "low"];
  const LEVEL_RANK = { high: 3, medium: 2, low: 1 };
  const LEVEL_LABEL = { high: "High", medium: "Medium", low: "Low" };
  const EVIDENCE_LABEL = { good: "Good evidence", some: "Some evidence", traditional: "Traditional use" };
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonth = new Date().getMonth() + 1;

  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const levelColor = (lvl) => css("--" + lvl);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- state ----------
  const state = { query: "", uses: new Set(), inSeason: false, selected: null };

  // ---------- geometry ----------
  function pointInPoly(lat, lng, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [yi, xi] = poly[i], [yj, xj] = poly[j];
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function normLng(lng) { return ((((lng + 180) % 360) + 360) % 360) - 180; }

  // Best likelihood of a herb at a point (null if absent), plus the region it came from.
  function herbAt(herb, lat, lng) {
    for (const lvl of LEVELS) {
      for (const key of herb.ranges[lvl]) {
        if (pointInPoly(lat, lng, REGIONS[key].poly)) return { level: lvl, region: REGIONS[key].label };
      }
    }
    return null;
  }

  // ---------- filtering ----------
  function matches(herb) {
    if (state.inSeason && !herb.season.includes(currentMonth)) return false;
    if (state.uses.size && !herb.uses.some((u) => state.uses.has(u))) return false;
    if (state.query) {
      const hay = [herb.name, herb.latin, herb.family, herb.uses.join(" "), herb.properties].join(" ").toLowerCase();
      if (!state.query.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  }
  const visibleHerbs = () => HERBS.filter(matches);

  // ---------- map ----------
  const map = L.map("map", { worldCopyJump: true, minZoom: 2, zoomControl: true }).setView([35, 10], 3);
  const dark = window.matchMedia("(prefers-color-scheme: dark)");
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 12
  }).addTo(map);
  dark.addEventListener("change", () => render());

  const overlay = L.layerGroup().addTo(map);
  let locationMarker = null;

  function drawOverview() {
    overlay.clearLayers();
    const herbs = visibleHerbs();
    // Score each region by how many (filtered) herbs grow there, weighted by likelihood.
    const scores = {};
    for (const h of herbs) for (const lvl of LEVELS) for (const key of h.ranges[lvl]) {
      scores[key] = (scores[key] || 0) + LEVEL_RANK[lvl];
    }
    const max = Math.max(1, ...Object.values(scores));
    const color = css("--high");
    Object.entries(scores)
      .sort((a, b) => b[1] - a[1]) // big ones first so smaller regions stay clickable on top
      .forEach(([key, score]) => {
        const t = score / max;
        L.polygon(REGIONS[key].poly, {
          color, weight: 1, opacity: 0.5, fillColor: color, fillOpacity: 0.08 + 0.42 * t, interactive: false
        }).addTo(overlay);
      });
    renderLegend("overview");
  }

  function drawHerb(herb) {
    overlay.clearLayers();
    const bounds = L.latLngBounds([]);
    // Zoom to where the herb is most likely; fall back to all ranges.
    const focus = herb.ranges.high.length || herb.ranges.medium.length ? ["high", "medium"] : ["low"];
    // Draw low first so high sits on top.
    [...LEVELS].reverse().forEach((lvl) => {
      herb.ranges[lvl].forEach((key) => {
        const c = levelColor(lvl);
        const poly = L.polygon(REGIONS[key].poly, {
          color: c, weight: 1.5, opacity: 0.9, fillColor: c, fillOpacity: lvl === "high" ? 0.55 : lvl === "medium" ? 0.45 : 0.35,
          interactive: false
        }).addTo(overlay);
        if (focus.includes(lvl)) bounds.extend(poly.getBounds());
      });
    });
    if (bounds.isValid()) map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 6, duration: 0.8 });
    renderLegend("herb");
  }

  function renderLegend(mode) {
    const el = document.getElementById("legend");
    if (mode === "herb") {
      el.innerHTML = `<b>Likelihood to find</b>` + LEVELS.map((l) =>
        `<div class="row"><span class="sw" style="background:${levelColor(l)}"></span>${LEVEL_LABEL[l]}<span class="desc"> — ${
          { high: "common in suitable habitat", medium: "occasional or local", low: "rare or escaped" }[l]}</span></div>`).join("");
    } else {
      const c = css("--high");
      el.innerHTML = `<b>Medicinal herb richness</b>
        <div class="ramp" style="background:linear-gradient(90deg, color-mix(in srgb, ${c} 12%, transparent), ${c})"></div>
        <div class="ramp-labels"><span>Few herbs</span><span>Many herbs</span></div>`;
    }
  }

  // ---------- "what grows here" ----------
  function herbsAtPoint(lat, lng) {
    lng = normLng(lng);
    return visibleHerbs()
      .map((h) => ({ herb: h, hit: herbAt(h, lat, lng) }))
      .filter((r) => r.hit)
      .sort((a, b) => LEVEL_RANK[b.hit.level] - LEVEL_RANK[a.hit.level] || a.herb.name.localeCompare(b.herb.name));
  }

  function showPointPopup(latlng, title) {
    const results = herbsAtPoint(latlng.lat, latlng.lng);
    const sel = state.selected;
    let selLine = "";
    if (sel) {
      const hit = herbAt(sel, latlng.lat, normLng(latlng.lng));
      selLine = `<div class="sub"><b>${esc(sel.name)}</b>: ${hit ? `${LEVEL_LABEL[hit.level]} likelihood (${esc(hit.region)})` : "not expected here"}</div>`;
    }
    const list = results.length
      ? `<ul>${results.map((r) => `<li data-id="${r.herb.id}"><span class="dot" style="background:${levelColor(r.hit.level)}"></span>${esc(r.herb.name)}<span class="lv">${LEVEL_LABEL[r.hit.level]}</span></li>`).join("")}</ul>`
      : `<p class="none">No herbs from the current list are expected here.${state.uses.size || state.query || state.inSeason ? " Try clearing your filters." : ""}</p>`;
    const html = `<div class="popup"><h4>${esc(title || "Herbs likely here")}</h4>
      <div class="sub">${latlng.lat.toFixed(2)}°, ${normLng(latlng.lng).toFixed(2)}° · ${results.length} herb${results.length === 1 ? "" : "s"}</div>${selLine}${list}</div>`;
    const popup = L.popup({ maxWidth: 300 }).setLatLng(latlng).setContent(html).openOn(map);
    popup.getElement().querySelectorAll("li[data-id]").forEach((li) =>
      li.addEventListener("click", () => selectHerb(li.dataset.id, { keepView: true })));
  }

  map.on("click", (e) => {
    document.getElementById("mapHint").classList.add("gone");
    showPointPopup(e.latlng);
  });

  document.getElementById("locateBtn").addEventListener("click", () => {
    if (!navigator.geolocation) return alert("Your browser can't share its location.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
        if (locationMarker) locationMarker.remove();
        locationMarker = L.circleMarker(ll, { radius: 7, color: "#fff", weight: 2, fillColor: "#2563eb", fillOpacity: 1 }).addTo(map);
        map.flyTo(ll, 6, { duration: 0.8 });
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

  function reachDots(herb) {
    return LEVELS.map((l) => herb.ranges[l].length
      ? `<i title="${LEVEL_LABEL[l]} likelihood in ${herb.ranges[l].length} region(s)" style="background:${levelColor(l)}"></i>` : "").join("");
  }

  function renderList() {
    const herbs = visibleHerbs().slice().sort((a, b) => a.name.localeCompare(b.name));
    countEl.textContent = `${herbs.length} of ${HERBS.length} herbs`;
    listEl.innerHTML = herbs.length ? herbs.map((h) => `
      <li class="herb-item" tabindex="0" data-id="${h.id}">
        <span class="name">${esc(h.name)}</span>
        <span class="reach">${reachDots(h)}</span>
        <span class="latin">${esc(h.latin)}</span>
        <span class="tags">${h.uses.map((u) => `<span class="tag">${esc(u)}</span>`).join("")}</span>
      </li>`).join("") : `<li class="empty">No herbs match. Try another search or clear the filters.</li>`;
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
    const where = LEVELS.flatMap((l) => h.ranges[l].map((key) => ({ l, key })));
    document.getElementById("detail").innerHTML = `
      <div class="detail">
        <h2>${esc(h.name)}</h2>
        <p class="latin">${esc(h.latin)}</p>
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

        <h3>Where to find it</h3>
        <p>${esc(h.habitat)}</p>
        <ul class="where">${where.map(({ l, key }) => `
          <li data-region="${key}"><span class="dot" style="background:${levelColor(l)}"></span>
          <span class="lvl" style="color:${levelColor(l)}">${LEVEL_LABEL[l]}</span>${esc(REGIONS[key].label)}</li>`).join("")}
        </ul>

        <h3>When to look</h3>
        <div class="months">${MONTHS.map((m, i) => `<span class="${h.season.includes(i + 1) ? "on" : ""} ${i + 1 === currentMonth ? "now" : ""}" title="${MONTH_FULL[i]}">${m[0]}</span>`).join("")}</div>

        <h3>Identification</h3>
        <p>${esc(h.lookalikes)}</p>
      </div>`;
    document.querySelectorAll(".where li").forEach((li) => li.addEventListener("click", () => {
      map.flyToBounds(L.polygon(REGIONS[li.dataset.region].poly).getBounds(), { padding: [40, 40], maxZoom: 7, duration: 0.8 });
    }));
  }

  function selectHerb(id, opts = {}) {
    const herb = HERBS.find((h) => h.id === id);
    if (!herb) return;
    state.selected = herb;
    renderDetail(herb);
    document.getElementById("listView").hidden = true;
    document.getElementById("detailView").hidden = false;
    document.getElementById("panel").scrollTop = 0;
    if (opts.keepView) {
      const c = map.getCenter();
      drawHerb(herb);
      map.stop(); map.setView(c, map.getZoom());
    } else {
      map.closePopup();
      drawHerb(herb);
    }
    history.replaceState(null, "", "#" + herb.id);
    if (window.matchMedia("(max-width: 820px)").matches && !opts.keepView) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showList() {
    state.selected = null;
    document.getElementById("listView").hidden = false;
    document.getElementById("detailView").hidden = true;
    map.closePopup();
    drawOverview();
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
  document.getElementById("search").addEventListener("input", (e) => {
    state.query = e.target.value.trim().toLowerCase();
    render();
  });
  document.getElementById("monthName").textContent = `(${MONTH_FULL[currentMonth - 1]})`;
  document.getElementById("seasonToggle").addEventListener("change", (e) => {
    state.inSeason = e.target.checked;
    render();
  });

  // About dialog
  const dialog = document.getElementById("aboutDialog");
  document.getElementById("aboutBtn").addEventListener("click", () => dialog.showModal());

  function render() {
    renderList();
    if (state.selected) drawHerb(state.selected); else drawOverview();
  }

  // Init
  renderList();
  const fromHash = location.hash.slice(1);
  if (fromHash && HERBS.some((h) => h.id === fromHash)) selectHerb(fromHash); else drawOverview();
})();
