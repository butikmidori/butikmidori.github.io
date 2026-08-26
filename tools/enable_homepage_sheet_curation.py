#!/usr/bin/env python3
# mi.do.ri v4.11.0 — enable spreadsheet-driven homepage curation.
# Idempotent migration against the current v4.10.0 source.

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "assets/js/app.js"
GENERATOR = ROOT / "tools/generate_product_previews.py"
INDEX = ROOT / "index.html"
CATALOG = ROOT / "katalog.html"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 source pattern, found {count}")
    return text.replace(old, new, 1)


def find_function_span(text: str, signature: str) -> tuple[int, int]:
    start = text.find(signature)
    if start < 0:
        raise RuntimeError(f"Function signature not found: {signature}")

    brace = text.find("{", start)
    if brace < 0:
        raise RuntimeError(f"Opening brace not found: {signature}")

    i = brace
    depth = 0
    quote = None
    escape = False
    line_comment = False
    block_comment = False
    template = False

    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""

        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue

        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue

        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = None
            i += 1
            continue

        if template:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == "`":
                template = False
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return start, i + 1
            i += 1
            continue

        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch in ("'", '"'):
            quote = ch
            i += 1
            continue
        if ch == "`":
            template = True
            i += 1
            continue

        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return start, i + 1
        i += 1

    raise RuntimeError(f"Closing brace not found: {signature}")


def replace_function(text: str, signature: str, replacement: str) -> str:
    if replacement.strip() in text:
        return text
    start, end = find_function_span(text, signature)
    return text[:start] + replacement.rstrip() + text[end:]


def patch_app() -> None:
    text = APP.read_text(encoding="utf-8")

    if 'const APP_VERSION = "4.11.0";' not in text:
        text = replace_once(
            text,
            'const APP_VERSION = "4.10.0";',
            'const APP_VERSION = "4.11.0";',
            "app version",
        )

    normalize_old = '''    normalized.video = normalizeMediaValue(
      normalized.video ||
      normalized.URL_VIDEO ||
      normalized.url_video ||
      normalized.urlVideo ||
      normalized.videoUrl ||
      normalized.VIDEO_URL ||
      normalized.Video
    );

    return normalized;'''

    normalize_new = '''    normalized.video = normalizeMediaValue(
      normalized.video ||
      normalized.URL_VIDEO ||
      normalized.url_video ||
      normalized.urlVideo ||
      normalized.videoUrl ||
      normalized.VIDEO_URL ||
      normalized.Video
    );

    normalized.brandHomeOrder = homepageOrderValue(
      normalized.brandHomeOrder ??
      normalized.URUTAN_BRAND_BERANDA ??
      normalized.urutan_brand_beranda
    );
    normalized.brandHomeImage = homepageImageValue(
      normalized.brandHomeImage ??
      normalized.FOTO_BRAND_BERANDA ??
      normalized.foto_brand_beranda
    );
    normalized.prelovedHomeOrder = homepageOrderValue(
      normalized.prelovedHomeOrder ??
      normalized.URUTAN_PRELOVED_BERANDA ??
      normalized.urutan_preloved_beranda
    );
    normalized.prelovedHomeImage = homepageImageValue(
      normalized.prelovedHomeImage ??
      normalized.FOTO_PRELOVED_BERANDA ??
      normalized.foto_preloved_beranda
    );

    return normalized;'''

    if "normalized.brandHomeOrder = homepageOrderValue(" not in text:
        text = replace_once(text, normalize_old, normalize_new, "homepage normalization")

    image_markup_old = '''  function imageMarkup(product, className = "") {
    const image = firstProductImage(product);
    const placeholder = `<div class="product-placeholder ${placeholderClass(product)} ${className}" ${image ? "hidden" : ""}><span><strong>${escapeHtml(productInitials(product))}</strong><small>${escapeHtml(product.brand)}</small></span></div>`;
    if (!image) return placeholder;
    return `<img class="${className}" src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">${placeholder}`;
  }'''

    image_markup_new = '''  function imageMarkup(product, className = "", imageOverride = "") {
    const image = normalizeMediaValue(imageOverride) || firstProductImage(product);
    const placeholder = `<div class="product-placeholder ${placeholderClass(product)} ${className}" ${image ? "hidden" : ""}><span><strong>${escapeHtml(productInitials(product))}</strong><small>${escapeHtml(product.brand)}</small></span></div>`;
    if (!image) return placeholder;
    return `<img class="${className}" src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">${placeholder}`;
  }'''

    if 'function imageMarkup(product, className = "", imageOverride = "")' not in text:
        text = replace_once(text, image_markup_old, image_markup_new, "image markup override")

    helper_anchor = '  function renderProductCard(product, options = {}) {'
    helpers = '''  function homepageOrderValue(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 1 && number <= 4 ? number : 0;
  }

  function homepageImageValue(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 1 && number <= 6 ? number : 0;
  }

  function homepageProductImage(product, imageNumber) {
    const images = productImages(product);
    const selected = homepageImageValue(imageNumber);
    return (selected ? images[selected - 1] : "") || images[0] || "";
  }

  function homepageSlots(manualProducts, orderField, fallbackProducts) {
    const slots = Array(4).fill(null);
    const usedIds = new Set();

    [...manualProducts]
      .sort((a, b) =>
        homepageOrderValue(a[orderField]) - homepageOrderValue(b[orderField]) ||
        Number(Boolean(firstProductImage(b))) - Number(Boolean(firstProductImage(a))) ||
        b.totalStock - a.totalStock ||
        a.name.localeCompare(b.name, "id")
      )
      .forEach(product => {
        const order = homepageOrderValue(product[orderField]);
        if (!order || slots[order - 1]) return;
        slots[order - 1] = product;
        usedIds.add(product.id);
      });

    fallbackProducts.forEach(product => {
      if (usedIds.has(product.id)) return;
      const emptyIndex = slots.findIndex(item => !item);
      if (emptyIndex < 0) return;
      slots[emptyIndex] = product;
      usedIds.add(product.id);
    });

    return slots.filter(Boolean).slice(0, 4);
  }

'''
    if "function homepageOrderValue(value)" not in text:
        if text.count(helper_anchor) != 1:
            raise RuntimeError("renderProductCard anchor not unique")
        text = text.replace(helper_anchor, helpers + helper_anchor, 1)

    card_old = '''    const images = productImages(product);
    const secondImage = images[1] || "";'''
    card_new = '''    const images = productImages(product);
    const primaryImage = homepageProductImage(product, options.imageIndex);
    const secondImage = images.find(image => image && image !== primaryImage) || "";'''
    if "const primaryImage = homepageProductImage(product, options.imageIndex);" not in text:
        text = replace_once(text, card_old, card_new, "product card preferred image")

    primary_old = '${imageMarkup(product, "product-image product-image-primary")}'
    primary_new = '${imageMarkup(product, "product-image product-image-primary", primaryImage)}'
    if primary_new not in text:
        text = replace_once(text, primary_old, primary_new, "product card primary image")

    curated = '''  function renderCuratedSections() {
    const selectedProducts = products
      .filter(product => product.isFeatured === true)
      .filter(product => productAvailability(product) !== "out");

    const featured = selectedProducts
      .filter(product =>
        product.condition !== "Preloved" &&
        product.brand !== "PRELOVED"
      )
      .sort(sortCuratedHomeProducts)
      .slice(0, 4);

    const allPreloved = products
      .filter(product =>
        product.condition === "Preloved" ||
        product.brand === "PRELOVED"
      )
      .filter(product => productAvailability(product) !== "out")
      .sort((a, b) =>
        Number(Boolean(b.images?.find(Boolean))) -
          Number(Boolean(a.images?.find(Boolean))) ||
        b.totalStock - a.totalStock ||
        a.name.localeCompare(b.name, "id")
      );

    const manualPreloved = allPreloved
      .filter(product => homepageOrderValue(product.prelovedHomeOrder));

    let preloved;

    if (manualPreloved.length) {
      preloved = homepageSlots(
        manualPreloved,
        "prelovedHomeOrder",
        allPreloved
      );
    } else {
      preloved = selectedProducts
        .filter(product =>
          product.condition === "Preloved" ||
          product.brand === "PRELOVED"
        )
        .sort(sortCuratedHomeProducts)
        .slice(0, 4);

      if (!preloved.length) {
        preloved = allPreloved.slice(0, 4);
      }
    }

    if (elements.featuredGrid) {
      elements.featuredGrid.innerHTML = featured.length
        ? featured.map(product => renderProductCard(product, { home: true })).join("")
        : '<div class="section-empty-note">Belum ada produk pilihan yang ditandai di Google Sheets.</div>';
    }

    if (elements.prelovedGrid) {
      elements.prelovedGrid.innerHTML = preloved.length
        ? preloved.map(product => renderProductCard(product, {
            home: true,
            imageIndex: product.prelovedHomeImage
          })).join("")
        : '<div class="section-empty-note">Belum ada produk Preloved yang dipilih di Google Sheets.</div>';
    }
  }'''
    text = replace_function(text, "  function renderCuratedSections() {", curated)

    brand = '''  function renderBrandDiscovery() {
    if (!elements.brandDiscoveryGrid) return;

    const brandMap = new Map();
    products.forEach(product => {
      if (!product.brand || ["PRELOVED", "BOX"].includes(product.brand)) return;
      if (product.condition === "Preloved" || productAvailability(product) === "out") return;
      if (!brandMap.has(product.brand)) brandMap.set(product.brand, []);
      brandMap.get(product.brand).push(product);
    });

    const autoStories = [...brandMap.entries()]
      .map(([brandName, items]) => {
        const representative = items
          .filter(product => firstProductImage(product))
          .sort((a, b) =>
            Number(b.isFeatured === true) - Number(a.isFeatured === true) ||
            b.totalStock - a.totalStock ||
            a.name.localeCompare(b.name, "id")
          )[0];

        return {
          brand: brandName,
          items,
          representative,
          image: representative ? firstProductImage(representative) : ""
        };
      })
      .filter(story => story.representative)
      .sort((a, b) =>
        b.items.length - a.items.length ||
        a.brand.localeCompare(b.brand, "id")
      );

    const manualCandidates = products
      .filter(product =>
        homepageOrderValue(product.brandHomeOrder) &&
        product.brand &&
        !["PRELOVED", "BOX"].includes(product.brand) &&
        product.condition !== "Preloved" &&
        productAvailability(product) !== "out" &&
        firstProductImage(product)
      )
      .sort((a, b) =>
        homepageOrderValue(a.brandHomeOrder) -
          homepageOrderValue(b.brandHomeOrder) ||
        b.totalStock - a.totalStock ||
        a.name.localeCompare(b.name, "id")
      );

    const slots = Array(4).fill(null);
    const usedBrands = new Set();

    manualCandidates.forEach(product => {
      const order = homepageOrderValue(product.brandHomeOrder);
      if (!order || slots[order - 1] || usedBrands.has(product.brand)) return;

      slots[order - 1] = {
        brand: product.brand,
        items: brandMap.get(product.brand) || [product],
        representative: product,
        image: homepageProductImage(product, product.brandHomeImage)
      };
      usedBrands.add(product.brand);
    });

    autoStories.forEach(story => {
      if (usedBrands.has(story.brand)) return;
      const emptyIndex = slots.findIndex(item => !item);
      if (emptyIndex < 0) return;
      slots[emptyIndex] = story;
      usedBrands.add(story.brand);
    });

    const brandStories = slots.filter(Boolean).slice(0, 4);

    if (!brandStories.length) {
      elements.brandDiscoveryGrid.innerHTML = '<div class="section-empty-note">Jelajah brand akan tampil saat foto produk tersedia.</div>';
      return;
    }

    elements.brandDiscoveryGrid.innerHTML = brandStories.map((story, index) => `
      <a class="brand-discovery-card" href="${catalogUrl({ brand: story.brand })}" data-reveal-item style="--reveal-delay:${index * 70}ms">
        <span class="brand-discovery-index">0${index + 1}</span>
        <div class="brand-discovery-media">
          <img src="${escapeHtml(story.image || firstProductImage(story.representative))}" alt="${escapeHtml(story.representative.name)}" loading="lazy" decoding="async">
        </div>
        <div class="brand-discovery-copy">
          <span>${story.items.length.toLocaleString("id-ID")} produk</span>
          <h3>${escapeHtml(story.brand)}</h3>
          <p>Lihat brand <b>↗</b></p>
        </div>
      </a>`).join("");
  }'''
    text = replace_function(text, "  function renderBrandDiscovery() {", brand)

    APP.write_text(text, encoding="utf-8")


def patch_generator() -> None:
    text = GENERATOR.read_text(encoding="utf-8")
    if 'VERSION = "4.11.0"' not in text:
        text = replace_once(
            text,
            'VERSION = "4.10.0"',
            'VERSION = "4.11.0"',
            "generator version",
        )
    text = text.replace(
        '"User-Agent": "mi.do.ri-preview-generator/4.10.0"',
        '"User-Agent": "mi.do.ri-preview-generator/4.11.0"',
    )
    GENERATOR.write_text(text, encoding="utf-8")


def patch_html(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    text = text.replace('content="4.10.0"', 'content="4.11.0"')
    text = text.replace('?v=4.10.0', '?v=4.11.0')
    path.write_text(text, encoding="utf-8")


def main() -> None:
    patch_app()
    patch_generator()
    patch_html(INDEX)
    patch_html(CATALOG)
    print("mi.do.ri homepage spreadsheet curation enabled (v4.11.0).")


if __name__ == "__main__":
    main()
