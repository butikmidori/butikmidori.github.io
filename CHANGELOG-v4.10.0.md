# CHANGELOG v4.10.0

## Six Product Photos
Tanggal: 2026-08-25
Tipe rilis: **minor**

Rilis ini memperluas dukungan media produk dari maksimal 3 foto menjadi maksimal 6 foto per produk, tanpa mengubah ownership source-of-truth katalog.

### Added
- dukungan `FOTO_4`, `FOTO_5`, dan `FOTO_6` pada `PRODUK_MASTER`;
- dukungan maksimal 6 foto pada runtime katalog;
- dukungan maksimal 6 foto pada generator fallback/share preview;
- `tools/enable_six_product_photos.py` sebagai migration helper idempotent;
- merge media live + fallback agar foto produk lokal di GitHub tetap tersedia saat runtime.

### Changed
- `assets/js/app.js` menjadi **v4.10.0**;
- `tools/generate_product_previews.py` menjadi **v4.10.0**;
- normalisasi media mengenali `FOTO_UTAMA` sampai `FOTO_6` beserta alias penamaan yang didukung;
- array gambar runtime dan generator dibatasi maksimal 6 item;
- mapping foto lokal `assets/images/products/**` dibatasi maksimal 6 foto per produk;
- workflow `.github/workflows/update-product-preview.yml` menjalankan migration helper sebelum generator dan menyertakan source generator pada commit otomatis bila berubah.

### Google Sheets LIVE
Struktur media `PRODUK_MASTER` sekarang:

`FOTO_UTAMA` → `FOTO_2` → `FOTO_3` → `FOTO_4` → `FOTO_5` → `FOTO_6` → `URL_VIDEO`

Produk tidak wajib memiliki 6 foto. Slot kosong diabaikan; jumlah foto efektif dapat 1–6 sesuai media yang tersedia.

### Verified
Uji end-to-end dilakukan pada **PRD0163 — KAMILA WARDROBE / Della Set** dengan enam file:
- `assets/images/products/prd0163-01.webp`
- `assets/images/products/prd0163-02.webp`
- `assets/images/products/prd0163-03.webp`
- `assets/images/products/prd0163-04.webp`
- `assets/images/products/prd0163-05.webp`
- `assets/images/products/prd0163-06.webp`

Setelah workflow dijalankan ulang:
- fallback `assets/data/catalog-data.js` memuat keenam foto PRD0163;
- halaman share produk Della Set tergenerate sebagai v4.10.0;
- report generator menggunakan source `live`;
- produk aktif: 166;
- varian/SKU aktif: 336;
- brand: 22;
- total stok: 609;
- generated product share pages: 166;
- generated social share images: 133.

Runtime/data state diverifikasi pada commit:
`22de8fe728c01cad63af30149c79498cefa3b38a`

### Preserved
- pembagian source-of-truth GitHub vs Google Sheets;
- homepage editorial config yang sudah ada;
- ownership generated files;
- data SKU/harga/stok tetap berasal dari `VARIAN_STOK`;
- produk dengan 1–3 foto tetap bekerja tanpa migrasi media paksa.

### Generated files — tetap jangan diedit manual
- `assets/data/catalog-data.js`
- `produk/**`
- `assets/images/share/**`
- `tools/preview-generation-report.json`

### Catatan verifikasi
Source Apps Script yang melayani katalog LIVE belum diaudit secara source-level untuk memastikan payload mentahnya mengekspos `FOTO_4`–`FOTO_6` secara langsung. Jalur yang sudah diverifikasi adalah foto produk lokal GitHub + data LIVE + generator/fallback merge, termasuk uji enam foto PRD0163.

Jika kelak `FOTO_4`–`FOTO_6` diisi dengan URL eksternal tanpa file lokal GitHub, jalur tersebut perlu diuji tersendiri.
