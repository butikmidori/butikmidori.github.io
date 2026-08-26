#!/usr/bin/env python3
"""Generate mi.do.ri social preview assets and static product share pages.

Primary use:
  python tools/generate_product_previews.py --source auto --write-fallback

Sources:
  live  -> fetch catalog from LIVE_CATALOG_URL in assets/js/app.js
  local -> use assets/data/catalog-data.js only
  auto  -> try live first, then local fallback

The generator intentionally owns these generated areas:
  - produk/<slug>/index.html
  - assets/images/share/*.jpg

It also maps local product photos named <PRODUCT_ID>-01.* etc. into the fallback
catalog when --write-fallback is enabled.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

try:
    from PIL import Image, ImageFilter, ImageOps
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "Pillow belum terpasang. Jalankan: python -m pip install -r tools/requirements-preview.txt"
    ) from exc

SITE = "https://butikmidori.github.io"
VERSION = "4.11.0"
CATALOG_PREFIX = "window.MIDORI_CATALOG = "
IMAGE_EXTENSIONS = {".webp", ".jpg", ".jpeg", ".png"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate mi.do.ri product preview pages/images")
    parser.add_argument(
        "--source",
        choices=("auto", "live", "local"),
        default="auto",
        help="Catalog source. Default: auto (live then local).",
    )
    parser.add_argument(
        "--write-fallback",
        action="store_true",
        help="Write resolved catalog back to assets/data/catalog-data.js.",
    )
    parser.add_argument(
        "--root",
        default=None,
        help="Website root. Defaults to parent of tools/.",
    )
    return parser.parse_args()


def website_root(args: argparse.Namespace) -> Path:
    if args.root:
        return Path(args.root).resolve()
    return Path(__file__).resolve().parents[1]


def load_local_catalog(root: Path) -> dict[str, Any]:
    path = root / "assets/data/catalog-data.js"
    raw = path.read_text(encoding="utf-8").strip()
    if not raw.startswith(CATALOG_PREFIX):
        raise RuntimeError(f"Format {path} tidak dikenali.")
    payload = raw[len(CATALOG_PREFIX):].strip().rstrip(";")
    data = json.loads(payload)
    validate_catalog(data, "fallback lokal")
    return data


def extract_live_catalog_url(root: Path) -> str:
    app = (root / "assets/js/app.js").read_text(encoding="utf-8")
    match = re.search(r'const\s+LIVE_CATALOG_URL\s*=\s*["\']([^"\']+)["\']', app)
    if not match:
        raise RuntimeError("LIVE_CATALOG_URL tidak ditemukan di assets/js/app.js")
    return match.group(1)


def fetch_live_catalog(root: Path) -> dict[str, Any]:
    base = extract_live_catalog_url(root)
    callback = "MIDORI_PREVIEW_GENERATOR"
    sep = "&" if "?" in base else "?"
    url = f"{base}{sep}callback={urllib.parse.quote(callback)}&preview_generator=1"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "mi.do.ri-preview-generator/4.11.0",
            "Accept": "application/json,text/javascript,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        body = response.read().decode("utf-8-sig").strip()

    data: dict[str, Any]
    if body.startswith("{"):
        data = json.loads(body)
    else:
        # Accept standard JSONP: CALLBACK({...});
        pattern = rf"^\s*{re.escape(callback)}\s*\(\s*(.*)\s*\)\s*;?\s*$"
        match = re.match(pattern, body, flags=re.DOTALL)
        if not match:
            # Be a little tolerant if Apps Script normalizes the callback name.
            generic = re.match(r"^\s*[A-Za-z_$][\w$\.]*\s*\(\s*(.*)\s*\)\s*;?\s*$", body, flags=re.DOTALL)
            if not generic:
                raise RuntimeError("Respons Apps Script bukan JSON/JSONP yang dikenali.")
            match = generic
        data = json.loads(match.group(1))

    if data.get("error"):
        raise RuntimeError(data.get("message") or "Apps Script mengembalikan error.")
    validate_catalog(data, "Google Sheets live")
    return data


def validate_catalog(data: dict[str, Any], label: str) -> None:
    if not isinstance(data, dict) or not isinstance(data.get("products"), list):
        raise RuntimeError(f"Data {label} tidak memiliki array products yang valid.")


def normalize_media_value(value: Any) -> str:
    return str(value or "").strip()


def push_media_candidate(target: list[str], value: Any) -> None:
    if isinstance(value, list):
        for item in value:
            push_media_candidate(target, item)
        return

    normalized = normalize_media_value(value)
    if normalized and normalized not in target:
        target.append(normalized)


def normalize_catalog_media(catalog: dict[str, Any]) -> None:
    for product in catalog.get("products", []):
        images: list[str] = []
        for key in (
            "images", "image", "photo", "foto",
            "FOTO_UTAMA", "FOTO_2", "FOTO_3", "FOTO_4", "FOTO_5", "FOTO_6",
            "foto_utama", "foto_2", "foto_3", "foto_4", "foto_5", "foto_6",
            "fotoUtama", "foto2", "foto3", "foto4", "foto5", "foto6",
            "image1", "image2", "image3", "image4", "image5", "image6",
            "IMAGE_1", "IMAGE_2", "IMAGE_3", "IMAGE_4", "IMAGE_5", "IMAGE_6",
        ):
            push_media_candidate(images, product.get(key))
        product["images"] = images[:6]

        product["video"] = normalize_media_value(
            product.get("video")
            or product.get("URL_VIDEO")
            or product.get("url_video")
            or product.get("urlVideo")
            or product.get("videoUrl")
            or product.get("VIDEO_URL")
            or product.get("Video")
        )


def resolve_catalog(root: Path, source: str) -> tuple[dict[str, Any], str]:
    if source == "local":
        catalog = load_local_catalog(root)
        normalize_catalog_media(catalog)
        return catalog, "local"
    if source == "live":
        catalog = fetch_live_catalog(root)
        normalize_catalog_media(catalog)
        return catalog, "live"
    try:
        catalog = fetch_live_catalog(root)
        normalize_catalog_media(catalog)
        return catalog, "live"
    except Exception as exc:
        print(f"[WARN] Data live gagal: {exc}")
        print("[INFO] Menggunakan catalog-data.js lokal.")
        catalog = load_local_catalog(root)
        normalize_catalog_media(catalog)
        return catalog, "local"


def build_image_index(root: Path) -> dict[str, list[Path]]:
    folder = root / "assets/images/products"
    result: dict[str, list[Path]] = {}
    if not folder.exists():
        return result
    for path in sorted(folder.iterdir()):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        name = path.name.lower()
        # Expected convention: prd0065-01.webp, PRD0167-02.jpg, etc.
        match = re.match(r"^([a-z0-9]+)-(.+)$", name)
        if not match:
            continue
        result.setdefault(match.group(1), []).append(path)
    return result


def map_local_images(root: Path, catalog: dict[str, Any]) -> tuple[int, int]:
    index = build_image_index(root)
    mapped = 0
    with_photo = 0
    for product in catalog.get("products", []):
        pid = str(product.get("id") or "").strip().lower()
        candidates = index.get(pid, [])
        if candidates:
            with_photo += 1
            rels = [p.relative_to(root).as_posix() for p in candidates][:6]
            current = [str(x) for x in (product.get("images") or []) if x]
            if current != rels:
                product["images"] = rels
                mapped += 1
    return mapped, with_photo


def write_fallback_catalog(root: Path, catalog: dict[str, Any]) -> None:
    path = root / "assets/data/catalog-data.js"
    payload = json.dumps(catalog, ensure_ascii=False, separators=(",", ":"))
    path.write_text(f"{CATALOG_PREFIX}{payload};\n", encoding="utf-8")


def make_default_card(root: Path, share_dir: Path) -> None:
    logo_path = root / "assets/images/brand/logo-midori-primary.png"
    if not logo_path.exists():
        raise RuntimeError("assets/images/brand/logo-midori-primary.png tidak ditemukan.")
    logo = Image.open(logo_path).convert("RGBA")
    canvas = Image.new("RGB", (1200, 630), (247, 246, 241))
    fitted = ImageOps.contain(logo, (760, 470), Image.Resampling.LANCZOS)
    x = (1200 - fitted.width) // 2
    y = (630 - fitted.height) // 2
    canvas.paste(fitted.convert("RGB"), (x, y), fitted.getchannel("A"))
    canvas.save(share_dir / "midori-default.jpg", "JPEG", quality=90, optimize=True, progressive=True)


def make_product_card(src: Path, dest: Path) -> None:
    """Create a social-safe 1200x630 card with the full portrait product image.

    The product photo is never blurred into the side areas. It is preserved in a
    centered 4:5 portrait stage over the Emerald & Cream luxury palette.
    """
    img = Image.open(src).convert("RGB")
    canvas = Image.new("RGB", (1200, 630), (247, 246, 241))

    # Subtle editorial side panels; intentionally flat/clean (no photo blur).
    left_panel = Image.new("RGB", (348, 630), (230, 240, 233))
    right_panel = Image.new("RGB", (348, 630), (247, 246, 241))
    canvas.paste(left_panel, (0, 0))
    canvas.paste(right_panel, (852, 0))

    # Gold hairlines give the card a restrained boutique finish.
    gold = (200, 169, 106)
    for x in (347, 852):
        for y in range(630):
            canvas.putpixel((x, y), gold)

    # 4:5 stage (504 x 630). Contain preserves the complete original image.
    stage_size = (504, 630)
    stage = Image.new("RGB", stage_size, (247, 246, 241))
    fitted = ImageOps.contain(img, stage_size, method=Image.Resampling.LANCZOS)
    sx = (stage_size[0] - fitted.width) // 2
    sy = (stage_size[1] - fitted.height) // 2
    stage.paste(fitted, (sx, sy))
    canvas.paste(stage, (348, 0))

    canvas.save(dest, "JPEG", quality=90, optimize=True, progressive=True)


def local_image_for_product(root: Path, product: dict[str, Any]) -> Path | None:
    for rel in product.get("images") or []:
        if not isinstance(rel, str) or not rel:
            continue
        if rel.startswith("http://") or rel.startswith("https://"):
            continue
        candidate = (root / rel).resolve()
        try:
            candidate.relative_to(root.resolve())
        except ValueError:
            continue
        if candidate.exists() and candidate.is_file():
            return candidate
    return None


def generate_share_images(root: Path, products: list[dict[str, Any]]) -> dict[str, str]:
    share_dir = root / "assets/images/share"
    share_dir.mkdir(parents=True, exist_ok=True)

    # The folder is generator-owned; clear stale JPG/JPEG cards but keep any unrelated files.
    for path in share_dir.iterdir():
        if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg"}:
            path.unlink()

    make_default_card(root, share_dir)
    generated: dict[str, str] = {}
    for product in products:
        if str(product.get("status") or "") != "Aktif":
            continue
        slug = str(product.get("slug") or "").strip()
        if not slug:
            continue
        image = local_image_for_product(root, product)
        if image is None:
            continue
        dest = share_dir / f"{slug}.jpg"
        try:
            make_product_card(image, dest)
            generated[slug] = dest.relative_to(root).as_posix()
        except Exception as exc:
            print(f"[WARN] Gagal membuat preview {slug}: {exc}")
    return generated


def product_page(product: dict[str, Any], image_rel: str, has_product_photo: bool) -> str:
    slug = str(product.get("slug") or "").strip()
    name = str(product.get("name") or "Produk mi.do.ri").strip()
    brand = str(product.get("brand") or "mi.do.ri").strip()
    share_url = f"{SITE}/produk/{urllib.parse.quote(slug)}/"
    image_url = f"{SITE}/{image_rel}"
    alt = f"{name} — {brand}" if has_product_photo else "mi.do.ri — Fashion Muslim Multibrand"
    desc = f"Cek detail dan ketersediaan {name} dari {brand} di mi.do.ri."
    target = f"/katalog.html?produk={urllib.parse.quote(slug)}#katalog"
    product_id = str(product.get("id") or "").strip()

    return f'''<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0F3D34">
  <meta name="midori-version" content="{VERSION}">
  <title>{html.escape(name)} — {html.escape(brand)} | mi.do.ri</title>
  <meta name="description" content="{html.escape(desc, quote=True)}">
  <meta property="og:locale" content="id_ID">
  <meta property="og:site_name" content="mi.do.ri">
  <meta property="og:type" content="product">
  <meta property="og:title" content="{html.escape(name + ' — ' + brand, quote=True)}">
  <meta property="og:description" content="{html.escape(desc, quote=True)}">
  <meta property="og:url" content="{share_url}">
  <meta property="og:image" content="{image_url}">
  <meta property="og:image:secure_url" content="{image_url}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{html.escape(alt, quote=True)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{html.escape(name + ' — ' + brand, quote=True)}">
  <meta name="twitter:description" content="{html.escape(desc, quote=True)}">
  <meta name="twitter:image" content="{image_url}">
  <link rel="canonical" href="{share_url}">
  <link rel="icon" type="image/png" href="/assets/images/brand/favicon-midori.png">
  <link rel="apple-touch-icon" href="/assets/images/brand/favicon-midori.png">
  <script>
    // Halaman ini menyediakan metadata Open Graph untuk crawler sosial.
    // Pengunjung manusia diteruskan ke modal produk di katalog.
    window.location.replace({json.dumps(target)});
  </script>
  <style>
    *{{box-sizing:border-box}}body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#F7F6F1;font-family:Arial,sans-serif;color:#16211D}}
    .card{{width:min(92vw,760px);background:#FFFFFF;border-radius:24px;padding:24px;box-shadow:0 18px 50px rgba(0,0,0,.08);text-align:center}}
    .card img{{display:block;width:100%;max-height:440px;object-fit:contain;border-radius:18px;background:#E6F0E9}}
    h1{{font-size:28px;margin:20px 0 6px}}p{{margin:0 0 20px;color:#67736D}}small{{display:block;margin:-10px 0 18px;color:#89908b}}a{{display:inline-block;padding:12px 20px;border-radius:999px;background:#0F3D34;color:#fff;text-decoration:none}}
  </style>
</head>
<body>
  <main class="card">
    <img src="/{html.escape(image_rel, quote=True)}" alt="{html.escape(alt, quote=True)}">
    <h1>{html.escape(name)}</h1>
    <p>{html.escape(brand)}</p>
    <small>{html.escape(product_id)}</small>
    <a href="{html.escape(target, quote=True)}">Buka detail produk</a>
  </main>
</body>
</html>
'''


def generate_product_pages(root: Path, products: list[dict[str, Any]], share_images: dict[str, str]) -> int:
    pages_root = root / "produk"
    if pages_root.exists():
        shutil.rmtree(pages_root)
    pages_root.mkdir(parents=True, exist_ok=True)

    count = 0
    seen: set[str] = set()
    for product in products:
        if str(product.get("status") or "") != "Aktif":
            continue
        slug = str(product.get("slug") or "").strip()
        if not slug:
            print(f"[WARN] Produk {product.get('id', '?')} tidak memiliki slug; dilewati.")
            continue
        if slug in seen:
            raise RuntimeError(f"Slug duplikat ditemukan: {slug}")
        seen.add(slug)
        image_rel = share_images.get(slug, "assets/images/share/midori-default.jpg")
        dest = pages_root / slug / "index.html"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(product_page(product, image_rel, slug in share_images), encoding="utf-8")
        count += 1
    return count


def bump_site_version(root: Path) -> None:
    for filename in ("index.html", "katalog.html"):
        path = root / filename
        text = path.read_text(encoding="utf-8")
        text = re.sub(r'<meta name="midori-version" content="[^"]+">', f'<meta name="midori-version" content="{VERSION}">', text)
        text = re.sub(r'assets/css/style\.css\?v=[^"\']+', f'assets/css/style.css?v={VERSION}', text)
        text = re.sub(r'assets/data/catalog-data\.js\?v=[^"\']+', f'assets/data/catalog-data.js?v={VERSION}', text)
        text = re.sub(r'assets/data/homepage-config\.js\?v=[^"\']+', f'assets/data/homepage-config.js?v={VERSION}', text)
        text = re.sub(r'assets/js/app\.js\?v=[^"\']+', f'assets/js/app.js?v={VERSION}', text)
        path.write_text(text, encoding="utf-8")

    app = root / "assets/js/app.js"
    text = app.read_text(encoding="utf-8")
    text = re.sub(r'const APP_VERSION = "[^"]+";', f'const APP_VERSION = "{VERSION}";', text, count=1)
    app.write_text(text, encoding="utf-8")


def write_report(root: Path, source_used: str, products: list[dict[str, Any]], pages: int, images: int, mapped: int) -> None:
    active = sum(1 for p in products if str(p.get("status") or "") == "Aktif")
    report = {
        "version": VERSION,
        "catalog_source": source_used,
        "products_total": len(products),
        "products_active": active,
        "share_pages": pages,
        "share_images": images,
        "fallback_image_fields_updated": mapped,
    }
    (root / "tools/preview-generation-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


def main() -> int:
    args = parse_args()
    root = website_root(args)
    print(f"[INFO] Root: {root}")

    catalog, source_used = resolve_catalog(root, args.source)
    products = catalog.get("products", [])
    mapped, with_photo = map_local_images(root, catalog)
    print(f"[INFO] Source: {source_used}; produk: {len(products)}; foto lokal terdeteksi: {with_photo}")

    if args.write_fallback:
        write_fallback_catalog(root, catalog)
        print("[INFO] catalog-data.js diperbarui.")

    share_images = generate_share_images(root, products)
    pages = generate_product_pages(root, products, share_images)
    bump_site_version(root)
    (root / ".nojekyll").write_text("", encoding="utf-8")
    write_report(root, source_used, products, pages, len(share_images), mapped)

    print("[OK] Automatic Product Preview Generator selesai.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
