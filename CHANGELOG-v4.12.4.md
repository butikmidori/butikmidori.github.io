# CHANGELOG v4.12.4 — Photo-first Share Preview

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
