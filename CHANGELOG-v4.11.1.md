# CHANGELOG v4.11.1 — Custom Domain Canonicalization

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
