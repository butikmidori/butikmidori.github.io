# mi.do.ri — Project State

## Baseline
- Project baseline checkpoint: **v4.10.0 — Six Product Photos**
- Tanggal checkpoint: **2026-08-25**
- Frontend/runtime saat checkpoint: **v4.10.0**
- Repository canonical: `butikmidori/butikmidori.github.io`
- Branch canonical: `main`
- GitHub HEAD yang diverifikasi sebelum dokumentasi checkpoint: `22de8fe728c01cad63af30149c79498cefa3b38a`
- Database live: **DATABASE KATALOG MI.DO.RI — LIVE**

> v4.10.0 adalah minor release yang menambah dukungan media produk dari maksimal 3 foto menjadi maksimal 6 foto per produk. Pembagian source-of-truth GitHub dan Google Sheets tidak berubah.

## Source of Truth

| Area | Source of truth | Aturan |
| --- | --- | --- |
| HTML, CSS, JavaScript, workflow | GitHub `main` | Selalu mulai dari `main` terbaru; jangan overwrite dari ZIP baseline lama |
| Konfigurasi homepage | `assets/data/homepage-config.js` di GitHub | Aman diedit manual |
| Foto produk | `assets/images/products/**` di GitHub | Aman upload/ganti manual; setelah itu cek/jalankan workflow |
| Metadata produk & referensi media | `PRODUK_MASTER` | Master informasi tingkat produk dan referensi foto |
| SKU, varian, harga, stok | `VARIAN_STOK` | **Master utama SKU/harga/stok/varian** |
| Identitas/status brand | `BRAND_MASTER` | Kolom ringkasan SKU/stok diperlakukan sebagai data turunan |
| Fallback katalog | `assets/data/catalog-data.js` | **Generated — jangan edit manual** |
| Halaman share produk | `produk/<slug>/index.html` | **Generated — jangan edit manual** |
| Social preview | `assets/images/share/**` | **Generated — jangan edit manual** |
| Report generator | `tools/preview-generation-report.json` | **Generated — jangan edit manual** |

## Kondisi Data Saat Checkpoint
- Produk aktif: **166**
- Varian/SKU aktif: **336**
- Brand: **22**
- Total stok dari `VARIAN_STOK`: **609**
- Generated product share pages: **166**
- Generated social share images: **133**
- Catalog source pada report generator: **live**

## Media Produk — v4.10.0

Struktur media pada `PRODUK_MASTER`:

`FOTO_UTAMA` → `FOTO_2` → `FOTO_3` → `FOTO_4` → `FOTO_5` → `FOTO_6` → `URL_VIDEO`

Aturan:
- setiap produk boleh memiliki **1–6 foto**;
- produk tidak wajib memiliki semua 6 foto;
- slot kosong diabaikan, tanpa placeholder kosong;
- runtime dan generator membatasi array gambar maksimal 6 item;
- foto lokal produk tetap disimpan di `assets/images/products/**`;
- urutan foto mengikuti urutan referensi media produk.

### Verifikasi end-to-end
Produk uji: **PRD0163 — KAMILA WARDROBE / Della Set**.

Enam foto yang diverifikasi:
- `assets/images/products/prd0163-01.webp`
- `assets/images/products/prd0163-02.webp`
- `assets/images/products/prd0163-03.webp`
- `assets/images/products/prd0163-04.webp`
- `assets/images/products/prd0163-05.webp`
- `assets/images/products/prd0163-06.webp`

Hasil:
- `PRODUK_MASTER` memuat referensi FOTO_1–FOTO_6 untuk PRD0163;
- fallback `assets/data/catalog-data.js` memuat keenam gambar;
- product share page Della Set tergenerate sebagai v4.10.0;
- workflow selesai dan commit otomatis masuk ke `main`.

## Homepage Editorial Control — Manual State yang Harus Dipertahankan

```js
window.MIDORI_HOME_CONFIG = {
  editorialEdits: {
    mixMatch: {
      product: "puru-kambera-arine-blazer",
      coverImage: ""
    },

    specialMoment: {
      product: "anindyascarf-rafea-dress",
      coverImage: ""
    },

    kids: {
      product: "heart-troops-niaz-koko-kids",
      coverImage: ""
    }
  }
};
```

## Aturan Update yang Aman

### Jika mengubah Google Sheets
1. Edit `PRODUK_MASTER`, `VARIAN_STOK`, atau `BRAND_MASTER` sesuai fungsinya.
2. Untuk foto, isi referensi media secara berurutan pada `FOTO_UTAMA` sampai maksimal `FOTO_6`.
3. Web utama akan mencoba membaca data LIVE dari Apps Script saat runtime.
4. Setelah perubahan yang perlu ikut ke fallback/share preview, jalankan:
   **GitHub → Actions → Update Product Previews → Run workflow**.
5. Pastikan workflow hijau dan commit otomatis selesai.
6. Hard refresh web bila perlu.

### Jika mengubah foto produk di GitHub
1. Upload/ganti foto hanya di `assets/images/products/**`.
2. Gunakan pola nama konsisten `<ID_PRODUK>-01` sampai maksimal `-06` jika relevan.
3. Push pada folder tersebut memicu workflow otomatis.
4. Jika referensi media di Sheets juga berubah, pastikan Sheets selesai diperbarui lalu jalankan workflow lagi agar fallback mengambil kondisi terbaru.
5. Jangan edit manual `assets/images/share/**`, `produk/**`, atau `catalog-data.js`.

### Jika mengubah desain/kode
1. Mulai dari **GitHub `main` terbaru**.
2. Pertahankan perubahan manual yang sudah ada di live repo.
3. Jangan memakai ZIP baseline lama sebagai sumber utama.
4. Merge perubahan baru hanya pada file source yang relevan.
5. Validasi JS/Python/CSS sesuai file yang disentuh.
6. Baru siapkan package update bila diperlukan.

## File yang Aman Diedit Manual
- `assets/data/homepage-config.js`
- file sumber HTML/CSS/JS sesuai perubahan terencana
- `assets/images/products/**`
- data master di Google Sheets
- dokumentasi project seperti `PROJECT-STATE.md` dan `CHANGELOG-*.md`

## File Generated — Jangan Diedit Manual
- `assets/data/catalog-data.js`
- `produk/**`
- `assets/images/share/**`
- `tools/preview-generation-report.json`

## Catatan Foto PRD0005 & PRD0006
Kedua file berikut telah diverifikasi ada di GitHub dan harus dipertahankan:
- `assets/images/products/prd0005-02.webp`
- `assets/images/products/prd0006-02.webp`

Nilai `fallback_image_fields_updated: 2` pada report generator **bukan indikator dua foto hilang**. Nilai itu menunjukkan field image fallback yang diselaraskan generator.

## Catatan Apps Script
Source Apps Script yang melayani katalog LIVE belum diaudit secara source-level untuk memastikan payload mentahnya mengekspos `FOTO_4`–`FOTO_6` secara langsung.

Jalur yang **sudah diverifikasi** pada v4.10.0:
Google Sheets LIVE + foto lokal GitHub + generator/fallback merge → katalog dengan maksimal 6 foto.

Jika kelak `FOTO_4`–`FOTO_6` diisi memakai URL eksternal tanpa file lokal di GitHub, jalur tersebut perlu diuji tersendiri sebelum dianggap terverifikasi.

## Prinsip Baseline Berikutnya
Setiap release selanjutnya harus diturunkan dari **GitHub `main` LIVE terbaru + database LIVE terbaru**. Baseline/archive lama hanya referensi dan tidak boleh dipakai untuk overwrite langsung.
