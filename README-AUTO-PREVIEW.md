# mi.do.ri v3.2.0 — Automatic Product Preview Generator

Tujuan fitur ini adalah agar file `produk/<slug>/index.html` dan gambar preview sosial tidak perlu dibuat manual setiap kali ada produk baru.

## Cara yang direkomendasikan: GitHub Actions

### Produk baru dengan foto
1. Tambahkan/rapikan produk di Google Sheets seperti biasa.
2. Siapkan foto produk di `assets/images/products/` dengan format nama berdasarkan ID produk, contoh:
   - `PRD0167-01.webp`
   - `PRD0167-02.webp`
3. Upload/commit foto ke GitHub.
4. Workflow **Update Product Previews** otomatis berjalan karena ada perubahan pada folder foto produk.
5. Workflow membaca katalog live, memperbarui fallback, membuat gambar share 1200×630, membuat `produk/<slug>/index.html`, lalu commit hasilnya ke repository.

### Produk baru tanpa upload foto baru / ingin refresh manual
1. Buka repository GitHub.
2. Pilih tab **Actions**.
3. Pilih **Update Product Previews**.
4. Klik **Run workflow**.
5. Generator akan membaca Google Sheets live dan memperbarui seluruh halaman preview.

## Cara lokal Windows (opsional)

Klik dua kali `UPDATE-PREVIEW.bat`.

Script akan mencoba memakai Python yang tersedia di komputer. Jika Pillow belum ada, batch mencoba memasangnya dari `tools/requirements-preview.txt`. Setelah selesai, commit/upload file hasil ke GitHub.

## Aturan nama foto produk

Generator mencari foto berdasarkan kolom `id` produk. Nama file boleh huruf besar atau kecil, tetapi pola awal harus:

`<ID PRODUK>-<nomor>.<ekstensi>`

Contoh untuk `PRD0167`:

- `prd0167-01.webp`
- `PRD0167-02.jpg`

Ekstensi yang didukung: `.webp`, `.jpg`, `.jpeg`, `.png`.

Foto pertama menurut urutan nama file dipakai sebagai social preview utama. Semua foto lokal yang cocok juga ditulis ke field `images` pada fallback `catalog-data.js`.

## File/folder yang dibuat otomatis

- `produk/<slug>/index.html`
- `assets/images/share/<slug>.jpg`
- `assets/images/share/midori-default.jpg`
- `assets/data/catalog-data.js` (jika memakai `--write-fallback`)
- `tools/preview-generation-report.json`

Folder `produk/` dan file JPG di `assets/images/share/` dianggap sebagai output generator; jangan edit file `index.html` produk satu per satu karena perubahan manual akan tertimpa saat generator berikutnya berjalan.

## Jika preview sosial masih menampilkan cache lama

Generator hanya memastikan metadata dan gambar di website sudah diperbarui. Platform sosial dapat menyimpan cache link-preview, sehingga perubahan tidak selalu terlihat seketika pada URL yang sebelumnya pernah dibagikan.
