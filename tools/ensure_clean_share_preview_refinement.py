#!/usr/bin/env python3
"""mi.do.ri v4.12.3 — clean portrait share preview refinement.

Restores the clean sharp full-bleed portrait composition from v4.12.1 and
reduces the lower information overlay so the product photo remains more
dominant in WhatsApp previews. This guard is idempotent and safe to run on
v4.12.1, v4.12.2, or v4.12.3 generators.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GENERATOR = ROOT / "tools/generate_product_previews.py"
PROJECT_STATE = ROOT / "PROJECT-STATE.md"
CHANGELOG = ROOT / "CHANGELOG-v4.12.3.md"

SITE = "https://butikmidori.id"
NEW_VERSION = "4.12.3"

SAFE_FRAMING_BLOCK = """    # Build the normal 4:5 cover first.
    cover = ImageOps.fit(
        img,
        (width, height),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.46),
    ).convert("RGB")

    # Cross-platform safe framing:
    # Threads-style feed cards often center-crop a portrait OG image into a
    # wide landscape window. Moving the sharp hero down by ~9% keeps more of
    # the face / upper outfit inside that center crop. The newly exposed top
    # area is filled from the same photo with a soft blur, never a blank panel.
    # The small bottom loss sits underneath the existing cream information
    # panel, so the WhatsApp 4:5 composition remains visually balanced.
    safe_shift = 120
    feather = 84
    background = cover.filter(ImageFilter.GaussianBlur(radius=22))

    shifted = Image.new("RGB", (width, height), (247, 246, 241))
    shifted.paste(cover, (0, safe_shift))

    mask = Image.new("L", (width, height), 0)
    mask_draw = ImageDraw.Draw(mask)
    for y in range(safe_shift, min(height, safe_shift + feather)):
        progress = (y - safe_shift) / max(1, feather)
        mask_draw.line((0, y, width, y), fill=int(255 * progress))
    if safe_shift + feather < height:
        mask_draw.rectangle(
            (0, safe_shift + feather, width, height),
            fill=255,
        )

    canvas = Image.composite(shifted, background, mask).convert("RGBA")
"""

CLEAN_CANVAS_BLOCK = """    canvas = ImageOps.fit(
        img,
        (width, height),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.46),
    ).convert("RGBA")
"""

OLD_OVERLAY_BLOCK = """    # Soft transition into a lightly translucent Warm Cream information panel.
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
"""

NEW_OVERLAY_BLOCK = """    # Refined lower overlay: cleaner, shorter, and less intrusive for WhatsApp.
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

    if 'VERSION = "4.12.1"' in text:
        text = text.replace('VERSION = "4.12.1"', 'VERSION = "4.12.3"', 1)
        text = text.replace("mi.do.ri-preview-generator/4.12.1", "mi.do.ri-preview-generator/4.12.3")
    elif 'VERSION = "4.12.2"' in text:
        text = text.replace('VERSION = "4.12.2"', 'VERSION = "4.12.3"', 1)
        text = text.replace("mi.do.ri-preview-generator/4.12.2", "mi.do.ri-preview-generator/4.12.3")
    elif 'VERSION = "4.12.3"' in text:
        text = text.replace("mi.do.ri-preview-generator/4.12.1", "mi.do.ri-preview-generator/4.12.3")
        text = text.replace("mi.do.ri-preview-generator/4.12.2", "mi.do.ri-preview-generator/4.12.3")
    else:
        raise RuntimeError("Versi generator bukan v4.12.1/v4.12.2/v4.12.3; source terbaru tidak ditimpa.")

    if SAFE_FRAMING_BLOCK in text:
        text = text.replace(SAFE_FRAMING_BLOCK, CLEAN_CANVAS_BLOCK, 1)
    elif CLEAN_CANVAS_BLOCK not in text:
        raise RuntimeError("Blok komposisi portrait tidak dikenali; patch dibatalkan.")

    if NEW_OVERLAY_BLOCK not in text:
        if OLD_OVERLAY_BLOCK not in text:
            raise RuntimeError("Blok overlay portrait tidak dikenali; patch dibatalkan.")
        text = text.replace(OLD_OVERLAY_BLOCK, NEW_OVERLAY_BLOCK, 1)

    _write(GENERATOR, text)


def patch_project_state() -> None:
    if not PROJECT_STATE.exists():
        return

    text = PROJECT_STATE.read_text(encoding="utf-8")
    replacements = {
        "Project baseline checkpoint: **v4.12.2 — Cross-platform Share Safe Framing**": "Project baseline checkpoint: **v4.12.3 — Clean Portrait Share Preview Refinement**",
        "Project baseline checkpoint: **v4.12.1 — Portrait Product Share Preview**": "Project baseline checkpoint: **v4.12.3 — Clean Portrait Share Preview Refinement**",
        "Frontend/runtime saat checkpoint: **v4.12.2**": "Frontend/runtime saat checkpoint: **v4.12.3**",
        "Frontend/runtime saat checkpoint: **v4.12.1**": "Frontend/runtime saat checkpoint: **v4.12.3**",
        "Runtime/generator: **v4.12.2**": "Runtime/generator: **v4.12.3**",
        "Runtime/generator: **v4.12.1**": "Runtime/generator: **v4.12.3**",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    section = """## Clean Portrait Share Preview Refinement — v4.12.3
- Komposisi foto dikembalikan ke portrait clean full-bleed tanpa blur top fill.
- Social share image produk tetap **1080×1350 (4:5)**.
- Overlay bawah dipendekkan agar foto produk lebih dominan, khususnya pada preview WhatsApp.
- Isi share image tetap ringan: brand, nama produk, dan wordmark `mi.do.ri`.
- Tidak ada perubahan pada data Google Sheets LIVE, foto sumber, domain, DNS, HTTPS, canonical URL, sitemap, robots.txt, atau struktur katalog.

"""
    if "## Clean Portrait Share Preview Refinement — v4.12.3" not in text:
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
        """# CHANGELOG v4.12.3 — Clean Portrait Share Preview Refinement

Tanggal: 2026-08-26

## Perubahan
- Menghapus cross-platform safe framing v4.12.2 dan mengembalikan komposisi foto ke gaya clean portrait seperti v4.12.1.
- Mempertahankan output social share image produk pada portrait 4:5 ukuran 1080×1350.
- Mengurangi tinggi overlay bawah agar tidak terlalu menutupi foto produk di preview WhatsApp.
- Menyesuaikan posisi aksen, brand, nama produk, dan wordmark `mi.do.ri` agar tetap rapi pada overlay yang lebih pendek.

## Tidak Diubah
- Data Google Sheets LIVE.
- Foto sumber `assets/images/products/**`.
- SKU, varian, harga, dan stok.
- Domain, DNS, HTTPS, canonical URL, sitemap, robots.txt.
- Metadata Open Graph product-specific tetap 1080×1350.

## Catatan
Threads tetap dapat melakukan crop landscape sesuai kebijakan platformnya. Fokus refinement v4.12.3 adalah preview WhatsApp yang lebih bersih dan lebih dominan pada foto produk.
""",
        encoding="utf-8",
    )


def validate() -> None:
    text = GENERATOR.read_text(encoding="utf-8")
    checks = {
        "generator v4.12.3": 'VERSION = "4.12.3"' in text,
        "clean portrait restored": CLEAN_CANVAS_BLOCK in text,
        "safe framing removed": "safe_shift = 120" not in text and "GaussianBlur(radius=22)" not in text,
        "shorter overlay": "fade_start = 1040" in text and "panel_start = 1120" in text,
        "typography updated": "brand_font = _share_font(24)" in text and "name_font = _share_font(48)" in text,
        "wordmark lower right": 'draw.text((right - wordmark_width, 1306), wordmark, font=wordmark_font, fill=emerald)' in text,
        "portrait retained": "width, height = 1080, 1350" in text,
        "og dimensions retained": "og_width, og_height = (1080, 1350) if has_product_photo else (1200, 630)" in text,
        "seo retained": "def _product_schema(" in text and "def write_search_engine_files(" in text,
        "domain retained": f'SITE = "{SITE}"' in text,
    }
    failed = [name for name, ok in checks.items() if not ok]
    if failed:
        raise RuntimeError("Validasi v4.12.3 gagal: " + ", ".join(failed))


def main() -> None:
    patch_generator()
    patch_project_state()
    write_changelog()
    validate()
    print("[OK] mi.do.ri v4.12.3 Clean Portrait Share Preview Refinement siap; lanjutkan generator LIVE.")


if __name__ == "__main__":
    main()
