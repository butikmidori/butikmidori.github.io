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
from datetime import date
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

SITE = "https://butikmidori.id"
VERSION = "4.12.0"
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
            "User-Agent": "mi.do.ri-preview-generator/4.12.0",
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


def _plain_text(value: Any) -> str:
    return " ".join(str(value or "").split()).strip()


def _detail_items(value: Any) -> list[str]:
    if isinstance(value, list):
        return [_plain_text(item) for item in value if _plain_text(item)]
    return [
        _plain_text(item)
        for item in re.split(r"\r?\n|[;•]+", str(value or ""))
        if _plain_text(item)
    ]


def _meta_description(product: dict[str, Any], name: str, brand: str) -> str:
    fallback = f"Cek detail, harga, dan ketersediaan {name} dari {brand} di mi.do.ri."
    text = _plain_text(product.get("description")) or fallback
    if len(text) <= 160:
        return text
    clipped = text[:157].rsplit(" ", 1)[0].rstrip(" ,.;:-")
    return f"{clipped}…"


def _promo_percent(product: dict[str, Any]) -> int:
    if product.get("promoActive") is not True:
        return 0
    try:
        value = max(0, min(100, int(round(float(product.get("discountPercent") or 0)))))
    except (TypeError, ValueError):
        return 0
    if value <= 0:
        return 0

    today = date.today().isoformat()
    start = _plain_text(product.get("promoStart"))
    end = _plain_text(product.get("promoEnd"))
    if start and today < start:
        return 0
    if end and today > end:
        return 0
    return value


def _effective_price(product: dict[str, Any], value: Any) -> int:
    try:
        price = int(round(float(value or 0)))
    except (TypeError, ValueError):
        return 0
    percent = _promo_percent(product)
    return int(round(price * (100 - percent) / 100)) if percent else price


def _rupiah(value: int) -> str:
    return "Rp" + f"{int(value):,}".replace(",", ".")


def _public_image_url(value: str) -> str:
    value = str(value or "").strip()
    if not value:
        return ""
    if value.startswith(("http://", "https://")):
        return value
    rel = value.lstrip("/")
    return f"{SITE}/{urllib.parse.quote(rel, safe='/-_.~')}"


def _display_image_src(value: str) -> str:
    value = str(value or "").strip()
    if not value:
        return ""
    if value.startswith(("http://", "https://")):
        return value
    return "/" + value.lstrip("/")


def _product_schema(product: dict[str, Any], share_url: str, image_urls: list[str], description: str) -> dict[str, Any]:
    name = _plain_text(product.get("name")) or "Produk mi.do.ri"
    brand = _plain_text(product.get("brand")) or "mi.do.ri"
    product_id = _plain_text(product.get("id"))
    condition = "https://schema.org/UsedCondition" if _plain_text(product.get("condition")).lower() == "preloved" else "https://schema.org/NewCondition"

    offers: list[dict[str, Any]] = []
    for variant in product.get("variants") or []:
        if _plain_text(variant.get("status")) != "Aktif":
            continue
        price = _effective_price(product, variant.get("price"))
        if price <= 0:
            continue
        stock = int(variant.get("stock") or 0)
        label_bits = [
            _plain_text(variant.get("color")),
            _plain_text(variant.get("size")),
        ]
        offer: dict[str, Any] = {
            "@type": "Offer",
            "priceCurrency": "IDR",
            "price": str(price),
            "availability": "https://schema.org/InStock" if stock > 0 else "https://schema.org/OutOfStock",
            "itemCondition": condition,
            "url": share_url,
        }
        sku = _plain_text(variant.get("sku"))
        if sku:
            offer["sku"] = sku
        label = " · ".join(bit for bit in label_bits if bit and bit not in {"Tanpa warna", "Tanpa ukuran"})
        if label:
            offer["name"] = f"{name} — {label}"
        offers.append(offer)

    schema: dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": name,
        "description": description,
        "url": share_url,
        "brand": {"@type": "Brand", "name": brand},
        "itemCondition": condition,
    }
    if product_id:
        schema["productID"] = product_id
    category = _plain_text(product.get("category"))
    if category:
        schema["category"] = category
    if image_urls:
        schema["image"] = image_urls
    if offers:
        schema["offers"] = offers
    else:
        low = _effective_price(product, product.get("priceMin"))
        high = _effective_price(product, product.get("priceMax")) or low
        if low > 0:
            schema["offers"] = {
                "@type": "AggregateOffer",
                "priceCurrency": "IDR",
                "lowPrice": str(min(low, high)),
                "highPrice": str(max(low, high)),
                "offerCount": "1",
                "url": share_url,
            }

    properties = []
    material = _plain_text(product.get("material"))
    if material:
        properties.append({"@type": "PropertyValue", "name": "Bahan", "value": material})
    sizes = [_plain_text(item) for item in (product.get("sizes") or []) if _plain_text(item)]
    if sizes:
        properties.append({"@type": "PropertyValue", "name": "Ukuran", "value": ", ".join(sizes)})
    colors = [_plain_text(item) for item in (product.get("colors") or []) if _plain_text(item)]
    if colors:
        properties.append({"@type": "PropertyValue", "name": "Warna", "value": ", ".join(colors)})
    if properties:
        schema["additionalProperty"] = properties
    return schema


def _list_markup(title: str, items: list[str]) -> str:
    if not items:
        return ""
    return (
        f'<section class="product-detail-section"><h2>{html.escape(title)}</h2><ul>'
        + "".join(f"<li>{html.escape(item)}</li>" for item in items)
        + "</ul></section>"
    )


def product_page(product: dict[str, Any], image_rel: str, has_product_photo: bool) -> str:
    slug = _plain_text(product.get("slug"))
    name = _plain_text(product.get("name")) or "Produk mi.do.ri"
    brand = _plain_text(product.get("brand")) or "mi.do.ri"
    product_id = _plain_text(product.get("id"))
    share_url = f"{SITE}/produk/{urllib.parse.quote(slug)}/"
    social_image_url = f"{SITE}/{image_rel}"
    target = f"/katalog.html?produk={urllib.parse.quote(slug)}#katalog"

    description = _plain_text(product.get("description"))
    fallback_description = f"Cek detail, harga, dan ketersediaan {name} dari {brand} di mi.do.ri."
    body_description = description or fallback_description
    meta_description = _meta_description(product, name, brand)

    product_images = [
        str(item).strip()
        for item in (product.get("images") or [])
        if str(item or "").strip()
    ][:6]
    image_urls = [_public_image_url(item) for item in product_images if _public_image_url(item)]
    if not image_urls:
        image_urls = [social_image_url]
    display_image = _display_image_src(product_images[0]) if product_images else f"/{image_rel}"

    active_variants = [
        variant for variant in (product.get("variants") or [])
        if _plain_text(variant.get("status")) == "Aktif"
    ]
    prices = [
        _effective_price(product, variant.get("price"))
        for variant in active_variants
        if _effective_price(product, variant.get("price")) > 0
    ]
    if not prices:
        for key in ("priceMin", "priceMax"):
            value = _effective_price(product, product.get(key))
            if value > 0:
                prices.append(value)
    if prices:
        low_price, high_price = min(prices), max(prices)
        price_text = _rupiah(low_price) if low_price == high_price else f"{_rupiah(low_price)} – {_rupiah(high_price)}"
    else:
        price_text = "Tanya harga"

    any_stock = any(int(variant.get("stock") or 0) > 0 for variant in active_variants)
    stock_text = "Tersedia" if any_stock else "Stok habis"
    condition_text = _plain_text(product.get("condition")) or "Baru"

    material = _plain_text(product.get("material"))
    size_details = _detail_items(product.get("sizeDetails"))
    if not size_details:
        size_details = [_plain_text(item) for item in (product.get("sizes") or []) if _plain_text(item)]
    highlights = _detail_items(product.get("highlights"))
    care = _detail_items(product.get("careInstructions"))

    structured_product = _product_schema(product, share_url, image_urls, body_description)
    breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Beranda", "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": "Katalog", "item": f"{SITE}/katalog.html"},
            {"@type": "ListItem", "position": 3, "name": name, "item": share_url},
        ],
    }

    material_markup = (
        f'<section class="product-detail-section"><h2>Bahan</h2><p>{html.escape(material)}</p></section>'
        if material else ""
    )
    size_markup = _list_markup("Ukuran", size_details)
    highlight_markup = _list_markup("Keunggulan", highlights)
    care_markup = _list_markup("Perawatan", care)
    product_id_markup = f'<span class="product-code">{html.escape(product_id)}</span>' if product_id else ""
    condition_badge = '<span class="product-badge">Preloved</span>' if condition_text.lower() == "preloved" else ""

    return f'''<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0F3D34">
  <meta name="midori-version" content="{VERSION}">
  <title>{html.escape(name)} — {html.escape(brand)} | mi.do.ri</title>
  <meta name="description" content="{html.escape(meta_description, quote=True)}">
  <meta property="og:locale" content="id_ID">
  <meta property="og:site_name" content="mi.do.ri">
  <meta property="og:type" content="product">
  <meta property="og:title" content="{html.escape(name + ' — ' + brand, quote=True)}">
  <meta property="og:description" content="{html.escape(meta_description, quote=True)}">
  <meta property="og:url" content="{share_url}">
  <meta property="og:image" content="{social_image_url}">
  <meta property="og:image:secure_url" content="{social_image_url}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{html.escape(name + ' — ' + brand, quote=True)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{html.escape(name + ' — ' + brand, quote=True)}">
  <meta name="twitter:description" content="{html.escape(meta_description, quote=True)}">
  <meta name="twitter:image" content="{social_image_url}">
  <link rel="canonical" href="{share_url}">
  <link rel="icon" type="image/png" href="/assets/images/brand/favicon-midori.png">
  <link rel="apple-touch-icon" href="/assets/images/brand/favicon-midori.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
  <script type="application/ld+json">{json.dumps(structured_product, ensure_ascii=False, separators=(',', ':'))}</script>
  <script type="application/ld+json">{json.dumps(breadcrumb, ensure_ascii=False, separators=(',', ':'))}</script>
  <style>
    *{{box-sizing:border-box}}html{{background:#F7F6F1}}body{{margin:0;color:#17221f;background:#F7F6F1;font-family:"Jost",system-ui,sans-serif;-webkit-font-smoothing:antialiased}}
    a{{color:inherit;text-decoration:none}}img{{max-width:100%}}.site-header{{border-bottom:1px solid rgba(15,61,52,.10);background:rgba(247,246,241,.96)}}.header-inner{{width:min(calc(100% - 40px),1160px);min-height:76px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:24px}}.brand{{width:118px;display:block}}.header-link{{font-size:14px;color:#134E43}}
    .page{{width:min(calc(100% - 40px),1160px);margin:0 auto;padding:30px 0 72px}}.breadcrumb{{display:flex;gap:9px;align-items:center;margin:0 0 26px;color:#6c756f;font-size:13px}}.breadcrumb a:hover{{color:#0F3D34}}
    .product-layout{{display:grid;grid-template-columns:minmax(0,.92fr) minmax(360px,1.08fr);gap:clamp(34px,6vw,82px);align-items:start}}.product-media{{position:sticky;top:24px;padding:18px;border:1px solid rgba(15,61,52,.08);border-radius:28px;background:#fff}}.product-media img{{display:block;width:100%;aspect-ratio:4/5;object-fit:contain;border-radius:18px;background:#F1F1EC}}
    .product-copy{{padding:10px 0}}.eyebrow{{margin:0 0 8px;color:#134E43;font-size:12px;letter-spacing:.12em;text-transform:uppercase}}h1{{margin:0;font-size:clamp(34px,4.5vw,58px);font-weight:400;line-height:1.04;letter-spacing:-.035em}}.product-meta{{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:16px 0 0}}.product-code,.product-badge,.stock{{display:inline-flex;align-items:center;min-height:28px;padding:4px 9px;border-radius:999px;font-size:12px}}.product-code{{color:#68716c;background:#eeeee8}}.product-badge{{color:#fff;background:#0F3D34}}.stock{{color:#0F3D34;background:#E6F0E9}}.price{{margin:24px 0 0;font-size:25px;font-weight:500}}.lead{{margin:22px 0 0;color:#55615c;font-size:16px;line-height:1.8}}
    .actions{{display:flex;flex-wrap:wrap;gap:10px;margin:28px 0 34px}}.button{{min-height:48px;display:inline-flex;align-items:center;justify-content:center;padding:0 20px;border-radius:999px;font-size:14px;font-weight:500}}.button-primary{{color:#fff;background:#0F3D34}}.button-secondary{{border:1px solid rgba(15,61,52,.18);background:#fff}}
    .details{{border-top:1px solid rgba(15,61,52,.12)}}.product-detail-section{{padding:20px 0;border-bottom:1px solid rgba(15,61,52,.10)}}.product-detail-section h2{{margin:0 0 9px;font-size:14px;font-weight:500}}.product-detail-section p,.product-detail-section ul{{margin:0;color:#59645f;font-size:14px;line-height:1.75}}.product-detail-section ul{{padding-left:18px}}
    @media(max-width:760px){{.header-inner,.page{{width:min(calc(100% - 28px),1160px)}}.header-inner{{min-height:68px}}.product-layout{{grid-template-columns:1fr;gap:26px}}.product-media{{position:static;padding:12px;border-radius:22px}}.product-copy{{padding:0}}h1{{font-size:36px}}.actions{{display:grid;grid-template-columns:1fr}}.button{{width:100%}}}}
  </style>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/" aria-label="mi.do.ri Beranda"><img src="/assets/images/brand/logo-midori-primary.png" alt="mi.do.ri"></a>
      <a class="header-link" href="/katalog.html">Katalog</a>
    </div>
  </header>
  <main class="page">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Beranda</a><span>/</span><a href="/katalog.html">Katalog</a><span>/</span><span>{html.escape(name)}</span></nav>
    <article class="product-layout">
      <div class="product-media"><img src="{html.escape(display_image, quote=True)}" alt="{html.escape(name + ' — ' + brand, quote=True)}"></div>
      <div class="product-copy">
        <p class="eyebrow">{html.escape(brand)}</p>
        <h1>{html.escape(name)}</h1>
        <div class="product-meta">{product_id_markup}{condition_badge}<span class="stock">{stock_text}</span></div>
        <p class="price">{html.escape(price_text)}</p>
        <p class="lead">{html.escape(body_description)}</p>
        <div class="actions"><a class="button button-primary" href="{html.escape(target, quote=True)}">Lihat detail &amp; pilih varian</a><a class="button button-secondary" href="/katalog.html">Kembali ke katalog</a></div>
        <div class="details">{material_markup}{size_markup}{highlight_markup}{care_markup}</div>
      </div>
    </article>
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


def write_search_engine_files(root: Path, products: list[dict[str, Any]]) -> None:
    urls = [f"{SITE}/", f"{SITE}/katalog.html"]
    for product in products:
        if str(product.get("status") or "") != "Aktif":
            continue
        slug = str(product.get("slug") or "").strip()
        if slug:
            urls.append(f"{SITE}/produk/{urllib.parse.quote(slug)}/")

    sitemap_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    sitemap_lines.extend(
        f"  <url><loc>{html.escape(url, quote=False)}</loc></url>" for url in urls
    )
    sitemap_lines.append("</urlset>")
    (root / "sitemap.xml").write_text("\n".join(sitemap_lines) + "\n", encoding="utf-8")

    robots = f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n"
    (root / "robots.txt").write_text(robots, encoding="utf-8")


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
    write_search_engine_files(root, products)
    bump_site_version(root)
    (root / ".nojekyll").write_text("", encoding="utf-8")
    write_report(root, source_used, products, pages, len(share_images), mapped)

    print("[OK] Automatic Product Preview Generator selesai.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
