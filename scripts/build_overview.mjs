#!/usr/bin/env node
// Score every ~50 m cell for every herb with js/model.js and aggregate to a
// ~200 m overview grid (zoom-9 pixels) used when the map is zoomed out.
// Overview value = mean of the 4 best of the 16 detail cells (= "good spots nearby").
// Usage: node scripts/build_overview.mjs
import { createRequire } from "node:module";
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const Model = require(path.join(ROOT, "js/model.js"));
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, "data/env/meta.json")));
const herbs = JSON.parse(fs.readFileSync(path.join(ROOT, "data/herbs.json")));
const regional = JSON.parse(fs.readFileSync(path.join(ROOT, "data/grid.json")));

const OUT = path.join(ROOT, "data/overview");
fs.mkdirSync(OUT, { recursive: true });
const N = 256 * 256, L = meta.layers.length;
const W = meta.ntx * 64, H = meta.nty * 64;           // overview grid size (zoom 9)
const overview = herbs.map(() => new Uint8Array(W * H));
const prepared = herbs.map((h) => Model.prepare(h, meta.codes));

// regional factor lookup (zoom-14 squares = 32 x 32 detail cells)
const decode = (b64) => Buffer.from(b64, "base64");
const RW = regional.width, RH = regional.height;
const surveyed = decode(regional.surveyed);
const regGrids = herbs.map((h) => regional.herbs[h.id] ? decode(regional.herbs[h.id].grid) : new Uint8Array(RW * RH));

let done = 0;
const t0 = Date.now();
const best = new Float32Array(16);
for (const [tx, ty] of meta.tiles) {
  const buf = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, `data/env/${tx}_${ty}.gz`)));
  const layer = {};
  meta.layers.forEach((name, i) => { layer[name] = buf.subarray(i * N, (i + 1) * N); });
  let idx = 0;
  const v = (name) => layer[name][idx];
  const scores = new Float32Array(N);
  herbs.forEach((herb, hi) => {
    const p = prepared[hi];
    for (idx = 0; idx < N; idx++) {
      const code = layer.habitat[idx];
      if (!code) { scores[idx] = -1; continue; }
      const h = Model.habitatScore(p, code, v, false);
      if (h <= 0) { scores[idx] = 0; continue; }
      const gx = tx * 256 + (idx & 255), gy = ty * 256 + (idx >> 8);
      const rx = (gx >> 5) - regional.x0, ry = (gy >> 5) - regional.y0;
      const k = rx >= 0 && ry >= 0 && rx < RW && ry < RH ? ry * RW + rx : -1;
      const R = Model.regionalFactor(k >= 0 ? regGrids[hi][k] : 0, k >= 0 && surveyed[k] === 1);
      scores[idx] = Model.finalScore(h, R);
    }
    // aggregate 4x4 -> overview
    const ox0 = (tx - meta.tx0) * 64, oy0 = (ty - meta.ty0) * 64;
    for (let oy = 0; oy < 64; oy++) for (let ox = 0; ox < 64; ox++) {
      let n = 0;
      for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) {
        const s = scores[(oy * 4 + dy) * 256 + ox * 4 + dx];
        if (s >= 0) best[n++] = s;
      }
      if (!n) continue;
      const arr = Array.from(best.subarray(0, n)).sort((a, b) => b - a);
      const top = arr.slice(0, 4);
      const val = top.reduce((a, b) => a + b, 0) / top.length;
      overview[hi][(oy0 + oy) * W + ox0 + ox] = Math.max(1, Math.round(val));  // 0 = no data
    }
  });
  done++;
  if (done % 20 === 0) console.log(`${done}/${meta.tiles.length} chunks, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

// richness: how many herbs reach a good score (>= 50) in each overview cell
const rich = new Uint8Array(W * H);
for (const o of overview) for (let i = 0; i < o.length; i++) if (o[i] >= 50) rich[i]++;
herbs.forEach((h, hi) => fs.writeFileSync(path.join(OUT, `${h.id}.gz`), zlib.gzipSync(overview[hi], { level: 9 })));
fs.writeFileSync(path.join(OUT, "_richness.gz"), zlib.gzipSync(rich, { level: 9 }));
const stats = {};
herbs.forEach((h, hi) => {
  const o = overview[hi]; let n = 0, good = 0, high = 0;
  for (const x of o) { if (x) n++; if (x >= 30) good++; if (x >= 60) high++; }
  stats[h.id] = { medium: good / n, high: high / n };
});
fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify({ zoom: 9, width: W, height: H, x0: meta.tx0 * 64, y0: meta.ty0 * 64, stats }));
console.log("done", ((Date.now() - t0) / 1000).toFixed(0), "s");
for (const [id, s] of Object.entries(stats)) console.log(id.padEnd(12), (s.medium * 100).toFixed(1).padStart(5) + "% >=30", (s.high * 100).toFixed(1).padStart(5) + "% >=60");
