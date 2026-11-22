#!/usr/bin/env python3
"""Download up to 4 freely licensed photos per herb.

Main source: the community-curated species photos on iNaturalist (field photos
of the living plant), Creative Commons licences only. Fallback: Wikimedia
Commons (Wikidata main image, Wikipedia article photos, category), with
drawings, herbarium sheets, micrographs and models skipped.
Writes img/herbs/<id>-<n>.jpg and data/photos.json (author, licence, source).
"""
import html
import json
import re
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
HERBS = json.loads((ROOT / "data" / "herbs.json").read_text())
OUT = ROOT / "img" / "herbs"
S = requests.Session()
S.headers["User-Agent"] = "herbmap-build/1.0 (educational, non-commercial)"
COMMONS = "https://commons.wikimedia.org/w/api.php"
PER_HERB = 4
WIDTH = 640
SKIP = re.compile(r"herbar|illustr|drawing|zeichnung|k[öo]hler|thom[eé]|sturm|model|map|karte|distribution|"
                  r"verbreitung|scan|seed|samen|pollen|micro|stamp|briefmarke|\.svg|\.png|\.gif|\.tif|\.oga|\.ogg|"
                  r"\.webm|\.pdf|logo|icon|diagram|chart|tea|tee|pharma|drug|product|capsule|label|botanical", re.I)
# species to photograph where the map uses a genus or aggregate
PHOTO_NAME = {"dandelion": "Taraxacum officinale", "thyme": "Thymus serpyllum", "ladysmantle": "Alchemilla vulgaris",
              "linden": "Tilia cordata", "masterwort": "Peucedanum ostruthium"}


def api(url, **params):
    params.setdefault("format", "json")
    for attempt in range(6):
        r = S.get(url, params=params, timeout=30)
        if r.status_code == 200:
            time.sleep(0.3)
            return r.json()
        time.sleep(int(r.headers.get("Retry-After", 0)) or 5 * 2 ** attempt)
    r.raise_for_status()


def wikidata(name):
    d = api("https://www.wikidata.org/w/api.php", action="wbsearchentities", search=name, language="en",
            type="item", limit=5)
    for hit in d.get("search", []):
        e = api("https://www.wikidata.org/w/api.php", action="wbgetentities", ids=hit["id"],
                props="claims|sitelinks")["entities"][hit["id"]]
        claims = e.get("claims", {})
        taxon = [c["mainsnak"]["datavalue"]["value"] for c in claims.get("P225", []) if "datavalue" in c["mainsnak"]]
        if name in taxon:
            p18 = [c["mainsnak"]["datavalue"]["value"] for c in claims.get("P18", []) if "datavalue" in c["mainsnak"]]
            cat = [c["mainsnak"]["datavalue"]["value"] for c in claims.get("P373", []) if "datavalue" in c["mainsnak"]]
            links = {k: v["title"] for k, v in e.get("sitelinks", {}).items() if k in ("dewiki", "enwiki")}
            return p18, cat, links
    return [], [], {}


def article_images(lang, title):
    d = api(f"https://{lang}.wikipedia.org/w/api.php", action="query", prop="images", titles=title, imlimit=50)
    files = []
    for p in d["query"]["pages"].values():
        files += [i["title"].split(":", 1)[1] for i in p.get("images", [])]
    return files


def category_files(cat):
    d = api(COMMONS, action="query", list="categorymembers", cmtitle=f"Category:{cat}", cmtype="file", cmlimit=40)
    return [m["title"].split(":", 1)[1] for m in d["query"]["categorymembers"]]


def infos(filenames):
    """Licence/author/thumbnail for many files, batched 50 per request; keeps input order."""
    clean = lambda v: html.unescape(re.sub(r"<[^>]+>", "", v or "")).strip()
    out = {}
    for i in range(0, len(filenames), 50):
        chunk = filenames[i:i + 50]
        d = api(COMMONS, action="query", titles="|".join(f"File:{f}" for f in chunk), prop="imageinfo",
                iiprop="url|extmetadata|size|mime", iiurlwidth=WIDTH)
        norm = {n["to"]: n["from"] for n in d["query"].get("normalized", [])}
        for p in d["query"]["pages"].values():
            if "imageinfo" not in p:
                continue
            ii = p["imageinfo"][0]
            m = ii.get("extmetadata", {})
            lic = clean(m.get("LicenseShortName", {}).get("value"))
            if ii.get("mime") != "image/jpeg" or ii.get("width", 0) < 600 or not lic:
                continue
            if not re.search(r"CC|Public domain|PD|CC0", lic, re.I):
                continue
            key = norm.get(p["title"], p["title"]).split(":", 1)[1].replace("_", " ")
            out[key] = {"thumb": ii["thumburl"], "author": clean(m.get("Artist", {}).get("value"))[:120] or "Unknown",
                        "license": lic, "source": ii["descriptionurl"], "ratio": ii["height"] / ii["width"]}
    return [out.get(f.replace("_", " ")) for f in filenames]


INAT_OK = {"cc0", "cc-by", "cc-by-sa", "cc-by-nc", "cc-by-nc-sa"}
LICENSE_NAME = {"cc0": "CC0", "cc-by": "CC BY", "cc-by-sa": "CC BY-SA", "cc-by-nc": "CC BY-NC", "cc-by-nc-sa": "CC BY-NC-SA"}


def inat_photos(name, limit):
    d = api("https://api.inaturalist.org/v1/taxa", q=name, per_page=10, is_active="true")
    taxon = next((t for t in d.get("results", []) if t["name"].lower() == name.lower()), None)
    if not taxon:
        return []
    t = api(f"https://api.inaturalist.org/v1/taxa/{taxon['id']}")["results"][0]
    out = []
    for tp in t.get("taxon_photos", []):
        ph = tp["photo"]
        if ph.get("license_code") not in INAT_OK:
            continue
        w, h = (ph.get("original_dimensions") or {}).get("width", 1), (ph.get("original_dimensions") or {}).get("height", 1)
        if not 0.5 < h / max(w, 1) < 1.6:
            continue
        author = re.sub(r"^\(c\)\s*", "", ph.get("attribution", "")).split(",")[0].strip()
        out.append({"thumb": ph["url"].replace("/square.", "/medium."), "author": author or "iNaturalist user",
                    "license": LICENSE_NAME[ph["license_code"]],
                    "source": f"https://www.inaturalist.org/photos/{ph['id']}", "site": "iNaturalist"})
        if len(out) == limit:
            break
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[1:])
    result_path = ROOT / "data" / "photos.json"
    result = json.loads(result_path.read_text()) if result_path.exists() else {}
    for herb in HERBS:
        if only and herb["id"] not in only:
            continue
        if not only and herb["id"] in result:
            continue
        name = PHOTO_NAME.get(herb["id"], herb["gbif"])
        photos = []
        for meta in inat_photos(name, PER_HERB):
            dest = OUT / f"{herb['id']}-{len(photos) + 1}.jpg"
            img = S.get(meta["thumb"], timeout=60)
            time.sleep(0.5)
            if img.status_code == 200 and img.headers.get("content-type", "").startswith("image"):
                dest.write_bytes(img.content)
                photos.append({"file": f"img/herbs/{dest.name}", **{k: meta[k] for k in ("author", "license", "source", "site")}})
        if len(photos) >= 3:
            result[herb["id"]] = photos
            print(f"{herb['id']:12s} {name:28s} {len(photos)} photos (iNaturalist)", flush=True)
            result_path.write_text(json.dumps(result, ensure_ascii=False, indent=1))
            continue
        p18, cats, links = wikidata(name)
        candidates = list(p18)
        if "dewiki" in links:
            candidates += article_images("de", links["dewiki"])
        if "enwiki" in links:
            candidates += article_images("en", links["enwiki"])
        for c in cats or [name]:
            candidates += category_files(c)
        seen, keep = set(), []
        for f in candidates:
            key = f.replace("_", " ")
            if key in seen or SKIP.search(f):
                continue
            seen.add(key)
            keep.append(f)
        for meta in infos(keep[:60]):
            if not meta or not (0.5 < meta["ratio"] < 1.6):
                continue
            dest = OUT / f"{herb['id']}-{len(photos) + 1}.jpg"
            img = S.get(meta["thumb"], timeout=60)
            time.sleep(0.5)
            if img.status_code != 200:
                continue
            dest.write_bytes(img.content)
            photos.append({"file": f"img/herbs/{dest.name}", "author": meta["author"], "license": meta["license"],
                           "source": meta["source"], "site": "Wikimedia Commons"})
            if len(photos) == PER_HERB:
                break
        result[herb["id"]] = photos
        print(f"{herb['id']:12s} {name:28s} {len(photos)} photos", flush=True)
        result_path.write_text(json.dumps(result, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
