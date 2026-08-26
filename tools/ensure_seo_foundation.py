#!/usr/bin/env python3
"""mi.do.ri v4.12.0 — SEO foundation migration guard.

Idempotently upgrades the v4.11.1 runtime/generator to v4.12.0. The script
modifies only SEO/indexability-related source files; generated product pages,
sitemap.xml, and robots.txt are then produced by the normal preview generator.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "assets/js/app.js"
INDEX = ROOT / "index.html"
CATALOG = ROOT / "katalog.html"
GENERATOR = ROOT / "tools/generate_product_previews.py"
PROJECT_STATE = ROOT / "PROJECT-STATE.md"
CHANGELOG = ROOT / "CHANGELOG-v4.12.0.md"

OLD_VERSION = "4.11.1"
NEW_VERSION = "4.12.0"
SITE = "https://butikmidori.id"


NEW_PRODUCT_PAGE_BLOCK = r"""def _plain_text(value: Any) -> str:
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
"""


SEARCH_FILES_BLOCK = r'''def write_search_engine_files(root: Path, products: list[dict[str, Any]]) -> None:
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
'''


def _write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def patch_app() -> None:
    text = APP.read_text(encoding="utf-8")
    if f'const APP_VERSION = "{OLD_VERSION}";' in text:
        text = text.replace(
            f'const APP_VERSION = "{OLD_VERSION}";',
            f'const APP_VERSION = "{NEW_VERSION}";',
            1,
        )
    elif f'const APP_VERSION = "{NEW_VERSION}";' not in text:
        raise RuntimeError("Versi assets/js/app.js bukan v4.11.1/v4.12.0; hentikan agar perubahan manual tidak tertimpa.")

    old_open = '''          <button class="product-image-open" type="button" data-open-product="${product.id}" aria-label="Buka detail ${escapeHtml(product.name)}">
            <span class="product-image-stack">
              ${imageMarkup(product, "product-image product-image-primary", primaryImage)}
              ${secondImage ? `<img class="product-image product-image-secondary" src="${escapeHtml(secondImage)}" alt="${escapeHtml(product.name)} — foto 2" loading="lazy" decoding="async">` : ""}
            </span>
          </button>'''
    new_open = '''          <a class="product-image-open" href="${productSharePath(product)}" data-open-product="${product.id}" aria-label="Buka detail ${escapeHtml(product.name)}">
            <span class="product-image-stack">
              ${imageMarkup(product, "product-image product-image-primary", primaryImage)}
              ${secondImage ? `<img class="product-image product-image-secondary" src="${escapeHtml(secondImage)}" alt="${escapeHtml(product.name)} — foto 2" loading="lazy" decoding="async">` : ""}
            </span>
          </a>'''
    if old_open in text:
        text = text.replace(old_open, new_open, 1)
    elif 'href="${productSharePath(product)}" data-open-product="${product.id}"' not in text:
        raise RuntimeError("Markup product card berubah dari baseline; crawlable product link tidak dipatch otomatis.")

    old_detail = '''    const detailButton = event.target.closest("[data-open-product]");
    if (detailButton) {
      if (elements.searchSuggestions) elements.searchSuggestions.hidden = true;'''
    new_detail = '''    const detailButton = event.target.closest("[data-open-product]");
    if (detailButton) {
      event.preventDefault();
      if (elements.searchSuggestions) elements.searchSuggestions.hidden = true;'''
    if old_detail in text:
        text = text.replace(old_detail, new_detail, 1)
    elif new_detail not in text:
        raise RuntimeError("Handler product card berubah dari baseline; navigasi modal tidak dipatch otomatis.")

    _write(APP, text)


def patch_html() -> None:
    for path in (INDEX, CATALOG):
        text = path.read_text(encoding="utf-8")
        text = text.replace('href="index.html#', 'href="/#')
        text = text.replace('href="index.html"', 'href="/"')
        text = text.replace(f'<meta name="midori-version" content="{OLD_VERSION}">', f'<meta name="midori-version" content="{NEW_VERSION}">')
        text = text.replace(f'?v={OLD_VERSION}', f'?v={NEW_VERSION}')
        _write(path, text)

    text = CATALOG.read_text(encoding="utf-8")
    old_title = '<title>mi.do.ri — Fashion Muslim Multibrand</title>'
    new_title = '<title>Katalog Fashion Muslim Multibrand | mi.do.ri</title>'
    if old_title in text:
        text = text.replace(old_title, new_title, 1)
    elif new_title not in text:
        raise RuntimeError("Title katalog berubah dari baseline; hentikan patch otomatis.")
    _write(CATALOG, text)


def patch_generator() -> None:
    text = GENERATOR.read_text(encoding="utf-8")

    if 'from datetime import date' not in text:
        text = text.replace('import argparse\n', 'import argparse\nfrom datetime import date\n', 1)

    if f'VERSION = "{OLD_VERSION}"' in text:
        text = text.replace(f'VERSION = "{OLD_VERSION}"', f'VERSION = "{NEW_VERSION}"', 1)
    elif f'VERSION = "{NEW_VERSION}"' not in text:
        raise RuntimeError("Versi generator bukan v4.11.1/v4.12.0; hentikan agar source terbaru tidak tertimpa.")
    text = text.replace(f'mi.do.ri-preview-generator/{OLD_VERSION}', f'mi.do.ri-preview-generator/{NEW_VERSION}')

    if 'def _product_schema(' not in text:
        pattern = r'def product_page\(product: dict\[str, Any\], image_rel: str, has_product_photo: bool\) -> str:\n.*?\n\ndef generate_product_pages'
        text, count = re.subn(
            pattern,
            lambda _match: NEW_PRODUCT_PAGE_BLOCK + '\n\ndef generate_product_pages',
            text,
            count=1,
            flags=re.DOTALL,
        )
        if count != 1:
            raise RuntimeError("Fungsi product_page baseline tidak ditemukan; patch SEO dibatalkan.")

    if 'def write_search_engine_files(' not in text:
        marker = '\n\ndef bump_site_version(root: Path) -> None:'
        if marker not in text:
            raise RuntimeError("Marker bump_site_version tidak ditemukan di generator.")
        text = text.replace(marker, '\n\n' + SEARCH_FILES_BLOCK + marker, 1)

    old_main = '''    share_images = generate_share_images(root, products)
    pages = generate_product_pages(root, products, share_images)
    bump_site_version(root)'''
    new_main = '''    share_images = generate_share_images(root, products)
    pages = generate_product_pages(root, products, share_images)
    write_search_engine_files(root, products)
    bump_site_version(root)'''
    if old_main in text:
        text = text.replace(old_main, new_main, 1)
    elif new_main not in text:
        raise RuntimeError("Main generator berubah dari baseline; sitemap/robots tidak dipasang otomatis.")

    _write(GENERATOR, text)


def patch_project_state() -> None:
    if not PROJECT_STATE.exists():
        return
    text = PROJECT_STATE.read_text(encoding="utf-8")
    text = text.replace(
        "Project baseline checkpoint: **v4.11.1 — Custom Domain Canonicalization**",
        "Project baseline checkpoint: **v4.12.0 — SEO Foundation & Indexable Product Pages**",
        1,
    )
    text = text.replace(
        "Frontend/runtime saat checkpoint: **v4.11.1**",
        "Frontend/runtime saat checkpoint: **v4.12.0**",
        1,
    )
    text = text.replace(
        "Runtime/generator: **v4.11.1**",
        "Runtime/generator: **v4.12.0**",
        1,
    )
    text = re.sub(
        r'- GitHub HEAD runtime yang diverifikasi: `[^`]+`',
        '- GitHub HEAD runtime: lihat branch `main` LIVE; GitHub tetap menjadi authority terbaru.',
        text,
        count=1,
    )

    section = '''## SEO Foundation — v4.12.0
- `produk/**` tetap generated, tetapi menjadi halaman produk statis yang indexable dan tidak lagi auto-redirect.
- Product card menyediakan crawlable `<a href="/produk/<slug>/">` sambil mempertahankan modal untuk klik normal saat JavaScript aktif.
- Halaman produk generated memakai deskripsi/detail LIVE yang tersedia dan menambahkan `Product` + `BreadcrumbList` JSON-LD.
- Generator membuat `sitemap.xml` dari homepage, katalog, dan seluruh produk aktif.
- Generator membuat `robots.txt` yang mengizinkan crawling dan menunjuk ke sitemap.
- Title katalog dibedakan dari homepage.
- Link internal eksplisit ke `index.html` dinormalisasi ke canonical homepage `/`.

'''
    if "## SEO Foundation — v4.12.0" not in text:
        marker = "## Aturan Update Aman"
        if marker in text:
            text = text.replace(marker, section + marker, 1)
        else:
            text = text.rstrip() + "\n\n" + section
    _write(PROJECT_STATE, text)


def write_changelog() -> None:
    if CHANGELOG.exists():
        return
    CHANGELOG.write_text(
        '''# CHANGELOG v4.12.0 — SEO Foundation & Indexable Product Pages

Tanggal: 2026-08-26

## Perubahan
- Mengubah generated `/produk/<slug>/` dari halaman transit/redirect menjadi halaman produk statis yang dapat diindeks.
- Menambahkan konten produk yang tersedia dari data LIVE: deskripsi, harga, status stok, bahan, ukuran, keunggulan, dan perawatan.
- Menambahkan structured data `Product` dan `BreadcrumbList` pada setiap halaman produk.
- Menambahkan link produk crawlable pada product card tanpa menghilangkan pengalaman modal saat JavaScript aktif.
- Generator otomatis membuat `sitemap.xml` untuk homepage, katalog, dan seluruh produk aktif.
- Generator otomatis membuat `robots.txt` dengan referensi sitemap.
- Membuat `<title>` katalog unik.
- Menormalkan internal link eksplisit `index.html` ke canonical homepage `/`.

## Tidak Diubah
- Domain/DNS/HTTPS/CNAME.
- Data Google Sheets dan source-of-truth katalog.
- Foto produk sumber di `assets/images/products/**`.
- Homepage editorial config.
- Struktur varian, harga, dan stok.
- Visual katalog/modal utama selain perubahan semantik link pada foto product card.

## Catatan
Produk tanpa foto lokal tetap menggunakan social preview fallback yang tersedia; tidak ada foto atau data produk yang ditebak.
''',
        encoding="utf-8",
    )


def validate() -> None:
    app = APP.read_text(encoding="utf-8")
    index = INDEX.read_text(encoding="utf-8")
    catalog = CATALOG.read_text(encoding="utf-8")
    generator = GENERATOR.read_text(encoding="utf-8")

    checks = {
        "APP_VERSION v4.12.0": f'const APP_VERSION = "{NEW_VERSION}";' in app,
        "crawlable product href": 'href="${productSharePath(product)}" data-open-product="${product.id}"' in app,
        "modal click preventDefault": 'const detailButton = event.target.closest("[data-open-product]");\n    if (detailButton) {\n      event.preventDefault();' in app,
        "generator v4.12.0": f'VERSION = "{NEW_VERSION}"' in generator,
        "Product JSON-LD generator": 'def _product_schema(' in generator,
        "no product auto redirect": 'window.location.replace({json.dumps(target)})' not in generator,
        "sitemap generator": 'def write_search_engine_files(' in generator and 'sitemap.xml' in generator,
        "robots generator": 'robots.txt' in generator,
        "unique catalog title": '<title>Katalog Fashion Muslim Multibrand | mi.do.ri</title>' in catalog,
        "homepage canonical retained": f'<link rel="canonical" href="{SITE}/">' in index,
        "catalog canonical retained": f'<link rel="canonical" href="{SITE}/katalog.html">' in catalog,
    }
    failed = [label for label, ok in checks.items() if not ok]
    if failed:
        raise RuntimeError("Validasi SEO gagal: " + ", ".join(failed))


def main() -> None:
    patch_app()
    patch_html()
    patch_generator()
    patch_project_state()
    write_changelog()
    validate()
    print("[OK] mi.do.ri v4.12.0 SEO Foundation siap; lanjutkan generator LIVE.")


if __name__ == "__main__":
    main()
