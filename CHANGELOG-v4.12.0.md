# CHANGELOG v4.12.0 — SEO Foundation & Indexable Product Pages

Tanggal: 2026-08-26

## Perubahan
- Mengubah generated `/produk/<slug>/` dari halaman transit/redirect menjadi halaman produk statis yang dapat diindeks.
- Menambahkan konten produk yang tersedia dari data LIVE: deskripsi, harga, status stok, bahan, ukuran, keunggulan, dan perawatan.
- Menambahkan structured data `Product` dan `BreadcrumbList` pada setiap halaman produk.
- Menambahkan link produk crawlable pada product card tanpa menghilangkan pengalaman modal saat JavaScript aktif.
- Generator otomatis membuat `sitemap.xml` untuk homepage, katalog, dan seluruh produk aktif.
- Generator otomatis membuat `robots.txt` dengan referensi sitemap.
- Membuat `<title>` katalog unik.
- Menormalkan internal link eksplisit `index.html` ke canonical homepage `/`.

## Tidak Diubah
- Domain/DNS/HTTPS/CNAME.
- Data Google Sheets dan source-of-truth katalog.
- Foto produk sumber di `assets/images/products/**`.
- Homepage editorial config.
- Struktur varian, harga, dan stok.
- Visual katalog/modal utama selain perubahan semantik link pada foto product card.

## Catatan
Produk tanpa foto lokal tetap menggunakan social preview fallback yang tersedia; tidak ada foto atau data produk yang ditebak.
