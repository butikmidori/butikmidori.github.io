# CHANGELOG v4.12.1 — Portrait Product Share Preview

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
