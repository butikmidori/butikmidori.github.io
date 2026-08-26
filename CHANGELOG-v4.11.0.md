# CHANGELOG v4.11.0

## Homepage Curation via Google Sheets
Tanggal: 2026-08-26
Tipe rilis: **minor**

Rilis ini memindahkan kontrol editorial untuk **Brand pilihan** dan **Second Chapter / Preloved** ke `PRODUK_MASTER`.

### Added
- `URUTAN_BRAND_BERANDA` — 1–4
- `FOTO_BRAND_BERANDA` — 1–6
- `URUTAN_PRELOVED_BERANDA` — 1–4
- `FOTO_PRELOVED_BERANDA` — 1–6
- runtime untuk pemilihan produk/foto Brand pilihan
- runtime untuk pemilihan produk/foto Second Chapter
- fallback ke `FOTO_UTAMA`
- `tools/enable_homepage_sheet_curation.py`
- Apps Script mapping untuk empat field homepage baru

### Preserved
- `PRODUK_PILIHAN` + `URUTAN_BERANDA` tetap mengatur **Pilihan buat kamu**
- `homepage-config.js` tetap mengatur editorial edits manual
- `VARIAN_STOK` tetap source of truth SKU/harga/stok
- dukungan maksimal 6 foto dari v4.10.0 tetap dipertahankan
- generated files tetap tidak diedit manual

### Google Sheets Safeguards
- dropdown urutan 1–4
- dropdown foto 1–6
- warning merah untuk urutan ganda
- warning kuning untuk pilihan foto yang slotnya kosong
- note pada header AK–AN

### Verified
Workflow `Update Product Previews` run **#59**: success.

Commit runtime:
`3d8ef283a180cd4d69de28f6ff70fd7cb7ca1b36`

Report generator:
- version: 4.11.0
- catalog source: live
- products active: 166
- share pages: 166
- share images: 133

Fallback katalog telah membawa:
- `brandHomeOrder`
- `brandHomeImage`
- `prelovedHomeOrder`
- `prelovedHomeImage`

Uji manual pada homepage berhasil: pilihan dari Sheets terbaca di website.

### Generated files — jangan diedit manual
- `assets/data/catalog-data.js`
- `produk/**`
- `assets/images/share/**`
- `tools/preview-generation-report.json`
