#!/usr/bin/env python3
"""mi.do.ri v4.11.1 — canonicalize public URLs to https://butikmidori.id.

Idempotent migration intended to run in GitHub Actions before the normal
product preview generator. Generated product pages remain generator-owned.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "assets/js/app.js"
INDEX = ROOT / "index.html"
CATALOG = ROOT / "katalog.html"
GENERATOR = ROOT / "tools/generate_product_previews.py"
PROJECT_STATE = ROOT / "PROJECT-STATE.md"
CHANGELOG = ROOT / "CHANGELOG-v4.11.1.md"

OLD_ORIGIN = "https://butikmidori.github.io"
NEW_ORIGIN = "https://butikmidori.id"
OLD_VERSION = "4.11.0"
NEW_VERSION = "4.11.1"


def replace_all(path: Path, old: str, new: str) -> bool:
    text = path.read_text(encoding="utf-8")
    if old not in text:
        return False
    path.write_text(text.replace(old, new), encoding="utf-8")
    return True


def patch_runtime_files() -> None:
    for path in (APP, INDEX, CATALOG, GENERATOR):
        replace_all(path, OLD_ORIGIN, NEW_ORIGIN)

    replace_all(
        APP,
        f'const APP_VERSION = "{OLD_VERSION}";',
        f'const APP_VERSION = "{NEW_VERSION}";',
    )

    for path in (INDEX, CATALOG):
        replace_all(
            path,
            f'<meta name="midori-version" content="{OLD_VERSION}">',
            f'<meta name="midori-version" content="{NEW_VERSION}">',
        )
        replace_all(path, f"?v={OLD_VERSION}", f"?v={NEW_VERSION}")

    replace_all(
        GENERATOR,
        f'VERSION = "{OLD_VERSION}"',
        f'VERSION = "{NEW_VERSION}"',
    )
    replace_all(
        GENERATOR,
        f"mi.do.ri-preview-generator/{OLD_VERSION}",
        f"mi.do.ri-preview-generator/{NEW_VERSION}",
    )


def patch_project_state() -> None:
    if not PROJECT_STATE.exists():
        return

    text = PROJECT_STATE.read_text(encoding="utf-8")
    text = text.replace(
        "Project baseline checkpoint: **v4.11.0 — Homepage Curation via Google Sheets**",
        "Project baseline checkpoint: **v4.11.1 — Custom Domain Canonicalization**",
        1,
    )
    text = text.replace(
        "Frontend/runtime saat checkpoint: **v4.11.0**",
        "Frontend/runtime saat checkpoint: **v4.11.1**",
        1,
    )
    text = text.replace(
        "Runtime/generator: **v4.11.0**",
        "Runtime/generator: **v4.11.1**",
        1,
    )

    section = """
## Custom Domain — v4.11.1
- Domain publik/canonical: `https://butikmidori.id`
- GitHub Pages tetap menjadi hosting.
- `CNAME` tetap `butikmidori.id`.
- `www.butikmidori.id` tetap boleh menunjuk ke `butikmidori.github.io` sebagai target teknis DNS GitHub Pages.
- `assets/js/app.js` memakai domain baru untuk link produk/WhatsApp/copy link.
- `index.html` dan `katalog.html` memakai domain baru untuk canonical, Open Graph, dan Twitter image.
- `tools/generate_product_previews.py` memakai domain baru sehingga seluruh `produk/**` generated ikut canonical ke domain baru.
- Domain lama `butikmidori.github.io` tidak lagi dipakai sebagai URL publik/canonical di source runtime/generator.

"""
    if "## Custom Domain — v4.11.1" not in text:
        marker = "## Aturan Update Aman"
        if marker in text:
            text = text.replace(marker, section + marker, 1)
        else:
            text = text.rstrip() + "\n\n" + section

    PROJECT_STATE.write_text(text, encoding="utf-8")


def write_changelog() -> None:
    if CHANGELOG.exists():
        return

    CHANGELOG.write_text(
        """# CHANGELOG v4.11.1 — Custom Domain Canonicalization

Tanggal: 2026-08-26

## Perubahan
- Domain publik/canonical dipindahkan dari `https://butikmidori.github.io` ke `https://butikmidori.id`.
- `assets/js/app.js`: link produk, copy link, dan link produk di WhatsApp memakai domain baru.
- `index.html`: canonical, Open Graph, dan Twitter image memakai domain baru.
- `katalog.html`: canonical, Open Graph, dan Twitter image memakai domain baru.
- `tools/generate_product_previews.py`: halaman share produk dan social preview URL memakai domain baru.
- Workflow `Update Product Previews` dibersihkan dari migration step lama yang sudah selesai diterapkan pada v4.10/v4.11 agar workflow tidak gagal pada runtime terbaru.
- Seluruh `produk/**` tetap generated dan harus diregenerasi melalui workflow.

## Tidak Diubah
- Data katalog Google Sheets.
- `CNAME`.
- DNS.
- Foto produk.
- Homepage editorial config.
- CSS/desain.
""",
        encoding="utf-8",
    )


def validate() -> None:
    for path in (APP, INDEX, CATALOG, GENERATOR):
        text = path.read_text(encoding="utf-8")
        if OLD_ORIGIN in text:
            raise RuntimeError(
                f"Domain lama masih ditemukan di {path.relative_to(ROOT)}"
            )

    app = APP.read_text(encoding="utf-8")
    generator = GENERATOR.read_text(encoding="utf-8")

    if f'const SITE_ORIGIN = "{NEW_ORIGIN}";' not in app:
        raise RuntimeError("SITE_ORIGIN custom domain tidak ditemukan di app.js")

    if f'SITE = "{NEW_ORIGIN}"' not in generator:
        raise RuntimeError("SITE custom domain tidak ditemukan di generator")

    if f'const APP_VERSION = "{NEW_VERSION}";' not in app:
        raise RuntimeError("APP_VERSION v4.11.1 tidak ditemukan")

    if f'VERSION = "{NEW_VERSION}"' not in generator:
        raise RuntimeError("Generator VERSION v4.11.1 tidak ditemukan")


def main() -> None:
    patch_runtime_files()
    patch_project_state()
    write_changelog()
    validate()
    print("[OK] mi.do.ri v4.11.1 custom domain canonicalization siap.")


if __name__ == "__main__":
    main()
