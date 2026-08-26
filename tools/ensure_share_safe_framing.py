#!/usr/bin/env python3
"""mi.do.ri v4.12.2 — cross-platform safe framing for product share previews.

This idempotent guard upgrades the v4.12.1 portrait share generator to v4.12.2.
The 4:5 output, branding, SEO metadata, product data, and source photos are
retained. Only the internal photo framing is adjusted so center landscape crops
(such as Threads feed cards) have a better chance of retaining face/upper-body
detail while WhatsApp still receives the portrait 4:5 asset.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GENERATOR = ROOT / "tools/generate_product_previews.py"
PROJECT_STATE = ROOT / "PROJECT-STATE.md"
CHANGELOG = ROOT / "CHANGELOG-v4.12.2.md"

OLD_VERSION = "4.12.1"
NEW_VERSION = "4.12.2"
SITE = "https://butikmidori.id"

OLD_CANVAS_BLOCK = """    canvas = ImageOps.fit(
        img,
        (width, height),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.46),
    ).convert("RGBA")
"""

NEW_CANVAS_BLOCK = """    # Build the normal 4:5 cover first.
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


def _write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def patch_generator() -> None:
    text = GENERATOR.read_text(encoding="utf-8")

    if f'SITE = "{SITE}"' not in text:
        raise RuntimeError("Custom domain butikmidori.id tidak ditemukan; patch dihentikan.")
    if "def _product_schema(" not in text or "def write_search_engine_files(" not in text:
        raise RuntimeError("SEO Foundation tidak terdeteksi; patch dihentikan.")
    if "def make_product_card(src: Path, dest: Path, product: dict[str, Any]) -> None:" not in text:
        raise RuntimeError("Portrait share generator v4.12.1 tidak terdeteksi.")

    if f'VERSION = "{OLD_VERSION}"' in text:
        text = text.replace(
            f'VERSION = "{OLD_VERSION}"',
            f'VERSION = "{NEW_VERSION}"',
            1,
        )
    elif f'VERSION = "{NEW_VERSION}"' not in text:
        raise RuntimeError(
            "Versi generator bukan v4.12.1/v4.12.2; source terbaru tidak ditimpa."
        )

    text = text.replace(
        f"mi.do.ri-preview-generator/{OLD_VERSION}",
        f"mi.do.ri-preview-generator/{NEW_VERSION}",
    )

    if "safe_shift = 120" not in text:
        if OLD_CANVAS_BLOCK not in text:
            raise RuntimeError(
                "Blok framing portrait v4.12.1 berubah dari baseline; patch dibatalkan."
            )
        text = text.replace(OLD_CANVAS_BLOCK, NEW_CANVAS_BLOCK, 1)

    _write(GENERATOR, text)


def patch_project_state() -> None:
    if not PROJECT_STATE.exists():
        return

    text = PROJECT_STATE.read_text(encoding="utf-8")
    text = text.replace(
        "Project baseline checkpoint: **v4.12.1 — Portrait Product Share Preview**",
        "Project baseline checkpoint: **v4.12.2 — Cross-platform Share Safe Framing**",
        1,
    )
    text = text.replace(
        "Frontend/runtime saat checkpoint: **v4.12.1**",
        "Frontend/runtime saat checkpoint: **v4.12.2**",
        1,
    )
    text = text.replace(
        "Runtime/generator: **v4.12.1**",
        "Runtime/generator: **v4.12.2**",
        1,
    )

    section = """## Cross-platform Share Safe Framing — v4.12.2
- Format product-specific social preview tetap **portrait 4:5 (1080×1350)**.
- Foto tetap full-bleed; tidak ada ruang kosong kiri/kanan.
- Sharp hero digeser turun ringan sekitar 9% untuk memberi safe area yang lebih baik saat platform seperti Threads melakukan center-crop landscape.
- Area atas yang terbuka diisi dari foto yang sama dengan blur lembut, bukan warna/panel kosong.
- Transisi sharp image dibuat feathered agar tidak muncul garis sambungan keras.
- Overlay Warm Cream, brand, nama produk, wordmark `mi.do.ri`, dan metadata Open Graph 1080×1350 tetap dipertahankan.
- Tidak ada perubahan pada foto sumber, data Google Sheets, katalog, canonical URL, sitemap, robots.txt, DNS, atau HTTPS.
- Hasil final tetap dapat berbeda antar-platform karena crop preview ditentukan oleh platform.

"""
    if "## Cross-platform Share Safe Framing — v4.12.2" not in text:
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
        """# CHANGELOG v4.12.2 — Cross-platform Share Safe Framing

Tanggal: 2026-08-26

## Perubahan
- Mempertahankan social share image produk pada portrait 4:5 1080×1350.
- Menambahkan safe framing ringan untuk mengurangi risiko wajah/upper outfit terpotong saat platform melakukan center-crop landscape.
- Sharp hero digeser turun 120 px; area top fill menggunakan foto yang sama dengan blur lembut dan feathered transition.
- Mempertahankan full-bleed image, overlay Warm Cream, Muted Gold, brand, nama produk, dan wordmark mi.do.ri.

## Tidak Diubah
- Data Google Sheets LIVE.
- Foto sumber assets/images/products/**.
- SKU, varian, harga, dan stok.
- Domain, DNS, HTTPS, canonical URL, sitemap, robots.txt.
- Struktur halaman produk dan UX katalog/modal.
- Dimensi Open Graph tetap 1080×1350 untuk product-specific share images.

## Catatan
Ini adalah framing kompromi lintas-platform. Threads dan platform lain tetap dapat menentukan crop preview sendiri.
""",
        encoding="utf-8",
    )


def validate() -> None:
    generator = GENERATOR.read_text(encoding="utf-8")
    checks = {
        "generator v4.12.2": f'VERSION = "{NEW_VERSION}"' in generator,
        "safe shift": "safe_shift = 120" in generator,
        "blur fill": "GaussianBlur(radius=22)" in generator,
        "feather mask": 'mask = Image.new("L", (width, height), 0)' in generator,
        "portrait retained": "width, height = 1080, 1350" in generator,
        "branding retained": 'wordmark = "mi.do.ri"' in generator,
        "OG portrait retained": "og_width, og_height = (1080, 1350) if has_product_photo else (1200, 630)" in generator,
        "SEO retained": "def _product_schema(" in generator and "def write_search_engine_files(" in generator,
        "domain retained": f'SITE = "{SITE}"' in generator,
    }
    failed = [label for label, ok in checks.items() if not ok]
    if failed:
        raise RuntimeError("Validasi v4.12.2 gagal: " + ", ".join(failed))


def main() -> None:
    patch_generator()
    patch_project_state()
    write_changelog()
    validate()
    print("[OK] mi.do.ri v4.12.2 Cross-platform Share Safe Framing siap; lanjutkan generator LIVE.")


if __name__ == "__main__":
    main()
