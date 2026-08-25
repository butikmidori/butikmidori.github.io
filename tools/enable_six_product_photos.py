#!/usr/bin/env python3
"""mi.do.ri v4.10.0 migration: enable up to six product photos.

Idempotent source migration executed by GitHub Actions before the normal preview
generator. Generated catalog/pages/share images remain generator-owned.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "assets/js/app.js"
GENERATOR = ROOT / "tools/generate_product_previews.py"
VERSION = "4.10.0"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise RuntimeError(
            f"Pola sumber tidak ditemukan untuk {label}; hentikan agar tidak menebak source terbaru."
        )
    return text.replace(old, new, 1)


def patch_app() -> None:
    text = APP.read_text(encoding="utf-8")
    text = replace_once(
        text,
        'const APP_VERSION = "4.9.0";',
        f'const APP_VERSION = "{VERSION}";',
        "APP_VERSION",
    )

    loader_anchor = '''

  async function loadCatalog() {
    const fallback = window.MIDORI_CATALOG;
'''
    loader_replacement = '''

  function mergeFallbackProductMedia(liveCatalog, fallbackCatalog) {
    if (!Array.isArray(liveCatalog?.products) || !Array.isArray(fallbackCatalog?.products)) return;

    const fallbackById = new Map(fallbackCatalog.products.map(product => [String(product.id || ""), product]));
    const fallbackBySlug = new Map(fallbackCatalog.products.map(product => [String(product.slug || ""), product]));

    liveCatalog.products = liveCatalog.products.map(product => {
      const fallbackProduct = fallbackById.get(String(product.id || ""))
        || fallbackBySlug.get(String(product.slug || ""));
      const mergedImages = [];
      pushMediaCandidate(mergedImages, product.images);
      pushMediaCandidate(mergedImages, fallbackProduct?.images);
      return { ...product, images: mergedImages.slice(0, 6) };
    });
  }

  async function loadCatalog() {
    const fallback = window.MIDORI_CATALOG;
'''
    text = replace_once(text, loader_anchor, loader_replacement, "fallback media merge")
    text = replace_once(
        text,
        '      window.MIDORI_CATALOG = liveCatalog;',
        '      mergeFallbackProductMedia(liveCatalog, fallback);\n      window.MIDORI_CATALOG = liveCatalog;',
        "merge fallback ke katalog live",
    )

    old_media = '''      normalized.FOTO_UTAMA,
      normalized.FOTO_2,
      normalized.FOTO_3,
      normalized.foto_utama,
      normalized.foto_2,
      normalized.foto_3,
      normalized.fotoUtama,
      normalized.foto2,
      normalized.foto3,
      normalized.image1,
      normalized.image2,
      normalized.image3,
      normalized.IMAGE_1,
      normalized.IMAGE_2,
      normalized.IMAGE_3'''
    new_media = '''      normalized.FOTO_UTAMA,
      normalized.FOTO_2,
      normalized.FOTO_3,
      normalized.FOTO_4,
      normalized.FOTO_5,
      normalized.FOTO_6,
      normalized.foto_utama,
      normalized.foto_2,
      normalized.foto_3,
      normalized.foto_4,
      normalized.foto_5,
      normalized.foto_6,
      normalized.fotoUtama,
      normalized.foto2,
      normalized.foto3,
      normalized.foto4,
      normalized.foto5,
      normalized.foto6,
      normalized.image1,
      normalized.image2,
      normalized.image3,
      normalized.image4,
      normalized.image5,
      normalized.image6,
      normalized.IMAGE_1,
      normalized.IMAGE_2,
      normalized.IMAGE_3,
      normalized.IMAGE_4,
      normalized.IMAGE_5,
      normalized.IMAGE_6'''
    text = replace_once(text, old_media, new_media, "normalisasi media app.js")
    text = replace_once(
        text,
        "    normalized.images = images;",
        "    normalized.images = images.slice(0, 6);",
        "batas enam foto app.js",
    )
    APP.write_text(text, encoding="utf-8")


def patch_generator() -> None:
    text = GENERATOR.read_text(encoding="utf-8")
    text = replace_once(
        text,
        'VERSION = "4.9.0"',
        f'VERSION = "{VERSION}"',
        "generator VERSION",
    )
    text = text.replace(
        '"User-Agent": "mi.do.ri-preview-generator/4.8.2"',
        f'"User-Agent": "mi.do.ri-preview-generator/{VERSION}"',
    )

    old_media = '''            "images", "image", "photo", "foto",
            "FOTO_UTAMA", "FOTO_2", "FOTO_3",
            "foto_utama", "foto_2", "foto_3",
            "fotoUtama", "foto2", "foto3",
            "image1", "image2", "image3",
            "IMAGE_1", "IMAGE_2", "IMAGE_3",'''
    new_media = '''            "images", "image", "photo", "foto",
            "FOTO_UTAMA", "FOTO_2", "FOTO_3", "FOTO_4", "FOTO_5", "FOTO_6",
            "foto_utama", "foto_2", "foto_3", "foto_4", "foto_5", "foto_6",
            "fotoUtama", "foto2", "foto3", "foto4", "foto5", "foto6",
            "image1", "image2", "image3", "image4", "image5", "image6",
            "IMAGE_1", "IMAGE_2", "IMAGE_3", "IMAGE_4", "IMAGE_5", "IMAGE_6",'''
    text = replace_once(text, old_media, new_media, "normalisasi media generator")
    text = replace_once(
        text,
        '        product["images"] = images',
        '        product["images"] = images[:6]',
        "batas enam foto generator",
    )
    text = replace_once(
        text,
        '            rels = [p.relative_to(root).as_posix() for p in candidates]',
        '            rels = [p.relative_to(root).as_posix() for p in candidates][:6]',
        "batas enam foto lokal",
    )
    GENERATOR.write_text(text, encoding="utf-8")


def main() -> None:
    patch_app()
    patch_generator()
    print(f"[OK] Source mi.do.ri disiapkan untuk maksimal 6 foto produk — v{VERSION}")


if __name__ == "__main__":
    main()
