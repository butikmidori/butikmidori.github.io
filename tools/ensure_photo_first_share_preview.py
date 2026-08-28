#!/usr/bin/env python3
"""mi.do.ri v4.12.4 — photo-first product share preview.

Removes the lower information panel from product social share images so
WhatsApp's own link-card title/description is not duplicated inside the image.
The 4:5 photo remains full-bleed and carries only a small adaptive `mi.do.ri`
wordmark in the lower-right corner, without a badge or background panel.

This migration guard is idempotent and intentionally accepts only the known
v4.12.3/v4.12.4 generator shapes so newer manual changes are not overwritten.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GENERATOR = ROOT / "tools/generate_product_previews.py"
PROJECT_STATE = ROOT / "PROJECT-STATE.md"
CHANGELOG = ROOT / "CHANGELOG-v4.12.4.md"

SITE = "https://butikmidori.id"
NEW_VERSION = "4.12.4"

OLD_DECORATION_BLOCK = """    # Refined lower overlay: cleaner, shorter, and less intrusive for WhatsApp.
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    fade_start = 1040
    panel_start = 1120
    cream = (247, 246, 241)
    for y in range(fade_start, panel_start):
        progress = (y - fade_start) / max(1, panel_start - fade_start)
        alpha = int(206 * progress)
        overlay_draw.line((0, y, width, y), fill=(*cream, alpha))
    overlay_draw.rectangle((0, panel_start, width, height), fill=(*cream, 226))
    canvas = Image.alpha_composite(canvas, overlay)

    draw = ImageDraw.Draw(canvas)
    emerald = (15, 61, 52, 255)
    muted = (69, 91, 84, 255)
    gold = (200, 169, 106, 255)

    brand = " ".join(str(product.get("brand") or "mi.do.ri").split()).strip()
    name = " ".join(str(product.get("name") or "Produk mi.do.ri").split()).strip()

    left = 76
    right = width - 76
    max_text_width = right - left

    # Restrained gold hairline as the only decorative accent.
    draw.rounded_rectangle((left, 1148, left + 72, 1154), radius=3, fill=gold)

    brand_font = _share_font(24)
    name_font = _share_font(48)
    wordmark_font = _share_font(22)

    brand_label = _ellipsize_share_line(draw, brand.upper(), brand_font, max_text_width)
    draw.text((left, 1172), brand_label, font=brand_font, fill=muted)

    lines = _wrap_share_name(draw, name, name_font, max_text_width, max_lines=2)
    name_y = 1210
    line_gap = 5
    for line in lines:
        draw.text((left, name_y), line, font=name_font, fill=emerald)
        box = draw.textbbox((left, name_y), line, font=name_font)
        name_y = box[3] + line_gap

    wordmark = "mi.do.ri"
    wordmark_width = _share_text_width(draw, wordmark, wordmark_font)
    draw.text((right - wordmark_width, 1306), wordmark, font=wordmark_font, fill=emerald)
"""

NEW_DECORATION_BLOCK = """    # Photo-first branding: no panel, no duplicate product/brand copy.
    # WhatsApp already renders title + description below the OG image, so the
    # image itself stays editorial and carries only a small `mi.do.ri` wordmark.
    draw = ImageDraw.Draw(canvas)
    wordmark = "mi.do.ri"
    wordmark_font = _share_font(24)
    text_box = draw.textbbox((0, 0), wordmark, font=wordmark_font)
    text_width = max(0, text_box[2] - text_box[0])
    text_height = max(0, text_box[3] - text_box[1])

    margin_x = 44
    margin_y = 42
    text_x = width - margin_x - text_width - text_box[0]
    text_y = height - margin_y - text_height - text_box[1]

    # Pick wordmark color from the local photo brightness. This keeps the mark
    # readable without adding a badge, pill, gradient, or solid backing panel.
    sample_left = max(0, int(text_x) - 24)
    sample_top = max(0, int(text_y) - 18)
    sample_right = min(width, int(text_x) + text_width + 24)
    sample_bottom = min(height, int(text_y) + text_height + 18)
    sample = canvas.convert("RGB").crop(
        (sample_left, sample_top, sample_right, sample_bottom)
    ).convert("L")
    histogram = sample.histogram()
    pixel_count = max(1, sum(histogram))
    brightness = sum(level * count for level, count in enumerate(histogram)) / pixel_count

    if brightness >= 150:
        fill = (15, 61, 52, 238)      # Deep Emerald on light photography.
        stroke = (247, 246, 241, 96)  # Very light 1px edge, not a badge.
    else:
        fill = (247, 246, 241, 238)   # Warm Cream on dark photography.
        stroke = (15, 61, 52, 96)

    draw.text(
        (text_x, text_y),
        wordmark,
        font=wordmark_font,
        fill=fill,
        stroke_width=1,
        stroke_fill=stroke,
    )
"""

OLD_DOC = """    The product image is full-bleed with no empty side panels. A restrained
    Warm Cream lower overlay carries only brand, product name, and mi.do.ri.
"""

NEW_DOC = """    The product image is full-bleed with no empty side panels. The image
    carries only a small adaptive mi.do.ri wordmark; product copy is left to
    the platform link card to avoid duplicated information in WhatsApp.
"""


def _write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def patch_generator() -> None:
    text = GENERATOR.read_text(encoding="utf-8")

    if f'SITE = "{SITE}"' not in text:
        raise RuntimeError("Custom domain butikmidori.id tidak ditemukan; patch dibatalkan.")
    if "def _product_schema(" not in text or "def write_search_engine_files(" not in text:
        raise RuntimeError("SEO foundation tidak terdeteksi; patch dibatalkan.")
    if "def make_product_card(src: Path, dest: Path, product: dict[str, Any]) -> None:" not in text:
        raise RuntimeError("Generator preview produk tidak terdeteksi.")

    if 'VERSION = "4.12.3"' in text:
        text = text.replace('VERSION = "4.12.3"', 'VERSION = "4.12.4"', 1)
        text = text.replace("mi.do.ri-preview-generator/4.12.3", "mi.do.ri-preview-generator/4.12.4")
    elif 'VERSION = "4.12.4"' in text:
        text = text.replace("mi.do.ri-preview-generator/4.12.3", "mi.do.ri-preview-generator/4.12.4")
    else:
        raise RuntimeError("Versi generator bukan v4.12.3/v4.12.4; source terbaru tidak ditimpa.")

    if OLD_DOC in text:
        text = text.replace(OLD_DOC, NEW_DOC, 1)
    elif NEW_DOC not in text:
        raise RuntimeError("Dokumentasi make_product_card tidak dikenali; patch dibatalkan.")

    if NEW_DECORATION_BLOCK not in text:
        if OLD_DECORATION_BLOCK not in text:
            raise RuntimeError("Blok share preview v4.12.3 tidak dikenali; patch dibatalkan.")
        text = text.replace(OLD_DECORATION_BLOCK, NEW_DECORATION_BLOCK, 1)

    _write(GENERATOR, text)


def patch_project_state() -> None:
    if not PROJECT_STATE.exists():
        return

    text = PROJECT_STATE.read_text(encoding="utf-8")
    replacements = {
        "Project baseline checkpoint: **v4.12.3 — Clean Portrait Share Preview Refinement**": "Project baseline checkpoint: **v4.12.4 — Photo-first Share Preview**",
        "Tanggal checkpoint: **2026-08-26**": "Tanggal checkpoint: **2026-08-28**",
        "Frontend/runtime saat checkpoint: **v4.12.3**": "Frontend/runtime saat checkpoint: **v4.12.4**",
        "Runtime/generator: **v4.12.3**": "Runtime/generator: **v4.12.4**",
        "Generated social share images: **133**": "Generated social share images: **134**",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    section = """## Photo-first Share Preview — v4.12.4
- Product-specific social share image tetap **1080×1350 (4:5)** dengan foto clean full-bleed.
- Panel/overlay bawah, nama brand, nama produk, dan aksen dekoratif dihapus dari gambar agar tidak menduplikasi judul/deskripsi link card WhatsApp.
- Identitas visual pada gambar hanya wordmark kecil `mi.do.ri` di kanan bawah, **tanpa badge/pill/background panel**.
- Warna wordmark menyesuaikan terang/gelap area foto secara otomatis: Deep Emerald pada area terang, Warm Cream pada area gelap.
- Metadata Open Graph tetap memuat judul, brand, deskripsi, canonical URL, dan dimensi 1080×1350 sehingga informasi produk tetap tampil pada link card platform.
- Tidak ada perubahan pada data Google Sheets LIVE, foto sumber, SKU/varian/harga/stok, domain, DNS, HTTPS, canonical URL, sitemap, robots.txt, atau struktur katalog.
- Crop akhir pada Threads/platform lain tetap mengikuti kebijakan masing-masing platform.

"""
    if "## Photo-first Share Preview — v4.12.4" not in text:
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
        """# CHANGELOG v4.12.4 — Photo-first Share Preview

Tanggal: 2026-08-28

## Perubahan
- Menghapus panel/overlay informasi dari product-specific social share image.
- Menghapus brand dan nama produk dari dalam gambar agar tidak tampil ganda dengan title/description link card WhatsApp.
- Mempertahankan foto portrait full-bleed 4:5 ukuran 1080×1350.
- Menyisakan wordmark kecil `mi.do.ri` di kanan bawah tanpa badge atau background panel.
- Wordmark memakai adaptive contrast: Deep Emerald pada area foto terang dan Warm Cream pada area foto gelap, dengan edge 1px yang sangat ringan untuk keterbacaan.

## Tetap Dipertahankan
- Open Graph product-specific 1080×1350.
- Canonical product pages, Product JSON-LD, BreadcrumbList, sitemap.xml, dan robots.txt.
- Data katalog bersumber dari Google Sheets LIVE.
- Foto sumber tetap dari `assets/images/products/**`.

## Tidak Diubah
- SKU, varian, harga, stok, dan struktur database.
- Domain `butikmidori.id`, DNS, HTTPS, dan konfigurasi hosting GitHub Pages.
- Perilaku crop link preview oleh Threads/platform lain.

## Catatan
Fokus v4.12.4 adalah membuat preview WhatsApp terasa lebih bersih: foto menjadi visual utama, sementara nama produk dan keterangannya diserahkan ke link card WhatsApp agar tidak terjadi informasi ganda.
""",
        encoding="utf-8",
    )


def validate() -> None:
    text = GENERATOR.read_text(encoding="utf-8")
    checks = {
        "generator v4.12.4": 'VERSION = "4.12.4"' in text,
        "photo-first block": NEW_DECORATION_BLOCK in text,
        "old overlay removed": "fade_start = 1040" not in text and "panel_start = 1120" not in text,
        "duplicate brand/name removed": "brand_label = _ellipsize_share_line" not in text and "name_y = 1210" not in text,
        "no badge/panel": "overlay_draw.rectangle" not in text,
        "wordmark adaptive": "brightness >= 150" in text and "stroke_width=1" in text,
        "portrait retained": "width, height = 1080, 1350" in text,
        "og dimensions retained": "og_width, og_height = (1080, 1350) if has_product_photo else (1200, 630)" in text,
        "seo retained": "def _product_schema(" in text and "def write_search_engine_files(" in text,
        "domain retained": f'SITE = "{SITE}"' in text,
    }
    failed = [name for name, ok in checks.items() if not ok]
    if failed:
        raise RuntimeError("Validasi v4.12.4 gagal: " + ", ".join(failed))


def main() -> None:
    patch_generator()
    patch_project_state()
    write_changelog()
    validate()
    print("[OK] mi.do.ri v4.12.4 Photo-first Share Preview siap; lanjutkan generator LIVE.")


if __name__ == "__main__":
    main()
