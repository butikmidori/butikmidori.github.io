#!/usr/bin/env python3
"""mi.do.ri v4.12.1 — portrait 4:5 product share preview migration.

This idempotent guard upgrades the v4.12.0 product preview generator to
v4.12.1. It changes only generated social-preview behavior and matching
Open Graph dimensions. Product/catalog data remain sourced from LIVE Sheets.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GENERATOR = ROOT / "tools/generate_product_previews.py"
PROJECT_STATE = ROOT / "PROJECT-STATE.md"
CHANGELOG = ROOT / "CHANGELOG-v4.12.1.md"

OLD_VERSION = "4.12.0"
NEW_VERSION = "4.12.1"
SITE = "https://butikmidori.id"

NEW_SHARE_CARD_BLOCK = r'''def _share_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Load a stable system font without adding font files to the repository."""
    candidates = (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
        "DejaVuSans.ttf",
    )
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # pragma: no cover - compatibility fallback
        return ImageFont.load_default()


def _share_text_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> int:
    box = draw.textbbox((0, 0), text, font=font)
    return max(0, box[2] - box[0])


def _ellipsize_share_line(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    max_width: int,
) -> str:
    if _share_text_width(draw, text, font) <= max_width:
        return text
    suffix = "…"
    trimmed = text.rstrip()
    while trimmed and _share_text_width(draw, trimmed + suffix, font) > max_width:
        trimmed = trimmed[:-1].rstrip()
    return (trimmed + suffix) if trimmed else suffix


def _wrap_share_name(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    max_width: int,
    max_lines: int = 2,
) -> list[str]:
    words = str(text or "").split()
    if not words:
        return ["Produk mi.do.ri"]

    lines: list[str] = []
    current = ""
    consumed = 0
    for word in words:
        trial = word if not current else f"{current} {word}"
        if not current or _share_text_width(draw, trial, font) <= max_width:
            current = trial
            consumed += 1
            continue
        lines.append(current)
        current = word
        consumed += 1
        if len(lines) == max_lines - 1:
            remainder = " ".join([current] + words[consumed:])
            lines.append(_ellipsize_share_line(draw, remainder, font, max_width))
            return lines[:max_lines]

    if current:
        lines.append(_ellipsize_share_line(draw, current, font, max_width))
    return lines[:max_lines]


def make_product_card(src: Path, dest: Path, product: dict[str, Any]) -> None:
    """Create an editorial 1080x1350 (4:5) product share image.

    The product image is full-bleed with no empty side panels. A restrained
    Warm Cream lower overlay carries only brand, product name, and mi.do.ri.
    """
    width, height = 1080, 1350
    img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    canvas = ImageOps.fit(
        img,
        (width, height),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.46),
    ).convert("RGBA")

    # Soft transition into a lightly translucent Warm Cream information panel.
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    fade_start = 900
    panel_start = 1008
    cream = (247, 246, 241)
    for y in range(fade_start, panel_start):
        progress = (y - fade_start) / max(1, panel_start - fade_start)
        alpha = int(218 * progress)
        overlay_draw.line((0, y, width, y), fill=(*cream, alpha))
    overlay_draw.rectangle((0, panel_start, width, height), fill=(*cream, 232))
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
    draw.rounded_rectangle((left, 1048, left + 82, 1054), radius=3, fill=gold)

    brand_font = _share_font(27)
    name_font = _share_font(54)
    wordmark_font = _share_font(25)

    brand_label = _ellipsize_share_line(draw, brand.upper(), brand_font, max_text_width)
    draw.text((left, 1078), brand_label, font=brand_font, fill=muted)

    lines = _wrap_share_name(draw, name, name_font, max_text_width, max_lines=2)
    name_y = 1124
    line_gap = 7
    for line in lines:
        draw.text((left, name_y), line, font=name_font, fill=emerald)
        box = draw.textbbox((left, name_y), line, font=name_font)
        name_y = box[3] + line_gap

    wordmark = "mi.do.ri"
    wordmark_width = _share_text_width(draw, wordmark, wordmark_font)
    draw.text((right - wordmark_width, 1290), wordmark, font=wordmark_font, fill=emerald)

    canvas.convert("RGB").save(
        dest,
        "JPEG",
        quality=92,
        optimize=True,
        progressive=True,
        subsampling=0,
    )'''


def _write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def patch_generator() -> None:
    text = GENERATOR.read_text(encoding="utf-8")

    if f'SITE = "{SITE}"' not in text:
        raise RuntimeError("Custom domain butikmidori.id tidak ditemukan di generator; patch dihentikan.")
    if "def _product_schema(" not in text or "def write_search_engine_files(" not in text:
        raise RuntimeError("SEO Foundation v4.12.0 tidak terdeteksi; patch dihentikan.")

    if f'VERSION = "{OLD_VERSION}"' in text:
        text = text.replace(f'VERSION = "{OLD_VERSION}"', f'VERSION = "{NEW_VERSION}"', 1)
    elif f'VERSION = "{NEW_VERSION}"' not in text:
        raise RuntimeError("Versi generator bukan v4.12.0/v4.12.1; source terbaru tidak ditimpa.")

    text = text.replace(
        f"mi.do.ri-preview-generator/{OLD_VERSION}",
        f"mi.do.ri-preview-generator/{NEW_VERSION}",
    )

    old_import = "from PIL import Image, ImageFilter, ImageOps"
    new_import = "from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps"
    if old_import in text:
        text = text.replace(old_import, new_import, 1)
    elif "ImageDraw" not in text or "ImageFont" not in text:
        raise RuntimeError("Import Pillow generator berubah dari baseline; patch dihentikan.")

    if "def make_product_card(src: Path, dest: Path, product: dict[str, Any]) -> None:" not in text:
        pattern = (
            r"def make_product_card\(src: Path, dest: Path\) -> None:\n"
            r".*?\n\n"
            r"def local_image_for_product"
        )
        text, count = re.subn(
            pattern,
            lambda _m: NEW_SHARE_CARD_BLOCK + "\n\n\ndef local_image_for_product",
            text,
            count=1,
            flags=re.DOTALL,
        )
        if count != 1:
            raise RuntimeError("Fungsi make_product_card v4.12.0 tidak ditemukan; patch dihentikan.")

    if "make_product_card(image, dest, product)" not in text:
        old_call = "make_product_card(image, dest)"
        if old_call not in text:
            raise RuntimeError("Pemanggilan make_product_card baseline tidak ditemukan.")
        text = text.replace(old_call, "make_product_card(image, dest, product)", 1)

    dimension_marker = '    social_image_url = f"{SITE}/{image_rel}"\n'
    dimension_block = (
        dimension_marker
        + "    og_width, og_height = (1080, 1350) if has_product_photo else (1200, 630)\n"
    )
    if "og_width, og_height = (1080, 1350) if has_product_photo else (1200, 630)" not in text:
        if dimension_marker not in text:
            raise RuntimeError("Marker social_image_url tidak ditemukan di product_page.")
        text = text.replace(dimension_marker, dimension_block, 1)

    old_meta = (
        '  <meta property="og:image:width" content="1200">\n'
        '  <meta property="og:image:height" content="630">'
    )
    new_meta = (
        '  <meta property="og:image:width" content="{og_width}">\n'
        '  <meta property="og:image:height" content="{og_height}">'
    )
    if old_meta in text:
        text = text.replace(old_meta, new_meta, 1)
    elif new_meta not in text:
        raise RuntimeError("Metadata ukuran og:image berubah dari baseline; patch dihentikan.")

    _write(GENERATOR, text)


def patch_project_state() -> None:
    if not PROJECT_STATE.exists():
        return

    text = PROJECT_STATE.read_text(encoding="utf-8")
    text = text.replace(
        "Project baseline checkpoint: **v4.12.0 — SEO Foundation & Indexable Product Pages**",
        "Project baseline checkpoint: **v4.12.1 — Portrait Product Share Preview**",
        1,
    )
    text = text.replace(
        "Frontend/runtime saat checkpoint: **v4.12.0**",
        "Frontend/runtime saat checkpoint: **v4.12.1**",
        1,
    )
    text = text.replace(
        "Runtime/generator: **v4.12.0**",
        "Runtime/generator: **v4.12.1**",
        1,
    )

    section = """## Product Share Preview — v4.12.1
- Product-specific social share image memakai portrait **4:5 (1080×1350)**.
- Foto produk dibuat full-bleed dengan crop cover terpusat; tidak ada panel kosong kiri/kanan.
- Branding dibuat ringan: brand, nama produk, dan wordmark kecil `mi.do.ri`.
- Overlay bawah memakai Warm Cream transparan dengan aksen Muted Gold; foto tetap menjadi visual utama.
- Harga, diskon, badge stok, dan elemen promo tidak dimasukkan ke share image.
- Metadata Open Graph memakai dimensi 1080×1350 bila share image produk tersedia.
- Produk tanpa foto lokal tetap memakai fallback social image yang ada; tidak ada foto yang ditebak.
- `assets/images/share/**` tetap generated dan diregenerasi oleh workflow.

"""
    if "## Product Share Preview — v4.12.1" not in text:
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
        """# CHANGELOG v4.12.1 — Portrait Product Share Preview

Tanggal: 2026-08-26

## Perubahan
- Mengubah product-specific social share image dari landscape 1200×630 menjadi portrait 4:5 1080×1350.
- Menghapus ruang kosong kiri/kanan pada share image produk dengan full-bleed cover crop.
- Menambahkan branding ringan: brand, nama produk, wordmark `mi.do.ri`, overlay Warm Cream, dan aksen Muted Gold.
- Menyesuaikan `og:image:width` dan `og:image:height` pada halaman produk generated menjadi 1080×1350 jika share image produk tersedia.
- Mempertahankan fallback 1200×630 untuk produk yang belum memiliki foto lokal yang dapat digenerate.

## Tidak Diubah
- Data Google Sheets LIVE.
- Struktur produk, SKU, varian, harga, dan stok.
- Foto sumber `assets/images/products/**`.
- Domain, DNS, HTTPS, canonical URL, sitemap, dan robots.txt.
- UX katalog/modal dan halaman produk selain metadata ukuran social image.

## Catatan
Tampilan akhir link preview tetap ditentukan masing-masing platform. Generator sekarang menyediakan source image portrait 4:5 yang lebih sesuai untuk produk fashion.
""",
        encoding="utf-8",
    )


def validate() -> None:
    generator = GENERATOR.read_text(encoding="utf-8")
    checks = {
        "generator v4.12.1": f'VERSION = "{NEW_VERSION}"' in generator,
        "portrait generator signature": "def make_product_card(src: Path, dest: Path, product: dict[str, Any]) -> None:" in generator,
        "1080x1350 canvas": "width, height = 1080, 1350" in generator,
        "full-bleed cover": "ImageOps.fit(" in generator,
        "brand/name source": 'product.get("brand")' in generator and 'product.get("name")' in generator,
        "new card call": "make_product_card(image, dest, product)" in generator,
        "Open Graph portrait dimensions": "og_width, og_height = (1080, 1350) if has_product_photo else (1200, 630)" in generator,
        "OG dynamic width": 'content="{og_width}"' in generator,
        "OG dynamic height": 'content="{og_height}"' in generator,
        "SEO retained": "def _product_schema(" in generator and "def write_search_engine_files(" in generator,
        "custom domain retained": f'SITE = "{SITE}"' in generator,
    }
    failed = [label for label, ok in checks.items() if not ok]
    if failed:
        raise RuntimeError("Validasi v4.12.1 gagal: " + ", ".join(failed))


def main() -> None:
    patch_generator()
    patch_project_state()
    write_changelog()
    validate()
    print("[OK] mi.do.ri v4.12.1 Portrait Product Share Preview siap; lanjutkan generator LIVE.")


if __name__ == "__main__":
    main()
