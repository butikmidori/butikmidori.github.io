# mi.do.ri v3.2.0

## Automatic Product Preview Generator

- Menambahkan `tools/generate_product_previews.py`.
- Menambahkan `UPDATE-PREVIEW.bat` untuk penggunaan lokal Windows.
- Menambahkan GitHub Actions `.github/workflows/update-product-preview.yml`.
- Workflow dapat dijalankan manual dan otomatis ketika foto pada `assets/images/products/` diubah.
- Generator dapat membaca katalog Google Sheets live melalui endpoint yang sudah dikonfigurasi di `assets/js/app.js`.
- Jika dijalankan lokal dengan mode `auto`, generator akan memakai fallback `catalog-data.js` jika koneksi live gagal.
- Generator otomatis memetakan foto berdasarkan ID produk, membuat social card 1200×630, membangun ulang halaman `produk/<slug>/index.html`, serta memperbarui fallback katalog.
- Versi web dinaikkan menjadi 3.2.0.
