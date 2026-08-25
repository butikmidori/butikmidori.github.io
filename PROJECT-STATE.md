# mi.do.ri — Project State

## Baseline
- Project baseline checkpoint: **v4.9.1 — Synced Project Baseline**
- Tanggal checkpoint: **2026-08-25**
- Frontend/runtime saat checkpoint: **v4.9.0**
- Repository canonical: `butikmidori/butikmidori.github.io`
- Branch canonical: `main`
- GitHub HEAD yang diaudit: `e3e7eb905fbe200e301818bfc218b7cb05949d62`
- Database live: **DATABASE KATALOG MI.DO.RI — LIVE**

> v4.9.1 adalah checkpoint sinkronisasi project, bukan redesign/UI release. Runtime web tetap v4.9.0 karena tidak ada perubahan frontend yang perlu dipaksakan hanya untuk housekeeping.

## Source of Truth

| Area | Source of truth | Aturan |
| --- | --- | --- |
| HTML, CSS, JavaScript, workflow | GitHub `main` | Jangan mengganti dengan ZIP baseline lama tanpa merge |
| Konfigurasi homepage | `assets/data/homepage-config.js` di GitHub | Aman diedit manual |
| Foto produk | `assets/images/products/**` di GitHub | Aman upload/ganti manual, lalu jalankan workflow |
| Metadata produk & referensi media | `PRODUK_MASTER` | Master informasi tingkat produk |
| SKU, harga, stok | `VARIAN_STOK` | **Master utama stok/harga/varian** |
| Identitas/status brand | `BRAND_MASTER` | Kolom ringkasan SKU/stok diperlakukan sebagai data turunan |
| Fallback katalog | `assets/data/catalog-data.js` | **Generated — jangan edit manual** |
| Halaman share produk | `produk/<slug>/index.html` | **Generated — jangan edit manual** |
| Social preview | `assets/images/share/**` | **Generated — jangan edit manual** |

## Kondisi Data Saat Checkpoint
- Produk aktif: **166**
- Varian/SKU aktif: **336**
- Brand: **22**
- Total stok dari `VARIAN_STOK`: **609**
- Generated product share pages: **166**
- Generated social share images: **133**
- Catalog source pada report generator: **live**

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
2. Web utama akan mencoba membaca data LIVE dari Apps Script saat runtime.
3. Setelah perubahan data yang perlu ikut ke fallback/share preview, jalankan:
   **GitHub → Actions → Update Product Previews → Run workflow**.
4. Tunggu commit otomatis selesai.
5. Hard refresh web.

### Jika mengubah foto produk di GitHub
1. Upload/ganti foto hanya di `assets/images/products/**`.
2. Push pada folder tersebut memang memicu workflow otomatis.
3. Tetap cek hasil workflow sampai selesai.
4. Jangan edit manual `assets/images/share/**` atau `produk/**`.

### Jika mengubah desain/kode
1. Mulai dari **GitHub `main` terbaru**, bukan ZIP v4.9.0 lama.
2. Pertahankan perubahan manual yang sudah ada di live repo.
3. Merge perubahan baru.
4. Validasi JS/Python/CSS.
5. Baru buat paket update dan baseline baru.

## File yang Aman Diedit Manual
- `assets/data/homepage-config.js`
- file sumber HTML/CSS/JS sesuai perubahan terencana
- `assets/images/products/**`
- data master di Google Sheets

## File Generated — Jangan Diedit Manual
- `assets/data/catalog-data.js`
- `produk/**`
- `assets/images/share/**`
- `tools/preview-generation-report.json`

## Catatan Foto PRD0005 & PRD0006
Kedua file berikut **ada di GitHub `main` pada saat audit** dan harus dipertahankan:
- `assets/images/products/prd0005-02.webp`
- `assets/images/products/prd0006-02.webp`

Nilai `fallback_image_fields_updated: 2` pada report generator **bukan indikator dua foto hilang**. Nilai itu hanya menunjukkan ada dua field image fallback yang diselaraskan oleh generator.

## Prinsip Baseline Berikutnya
Setiap release selanjutnya harus diturunkan dari state GitHub LIVE terbaru + database LIVE terbaru. Baseline lama hanya arsip/referensi dan tidak boleh dipakai untuk overwrite langsung.
