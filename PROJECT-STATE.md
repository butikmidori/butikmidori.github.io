# mi.do.ri — Project State

## Baseline
- Project baseline checkpoint: **v4.12.4 — Photo-first Share Preview**
- Tanggal checkpoint: **2026-08-28**
- Frontend/runtime saat checkpoint: **v4.12.4**
- Repository canonical: `butikmidori/butikmidori.github.io`
- Branch canonical: `main`
- GitHub HEAD runtime: lihat branch `main` LIVE; GitHub tetap menjadi authority terbaru.
- Database live: **DATABASE KATALOG MI.DO.RI — LIVE**

> v4.11.0 menambahkan kontrol editorial homepage langsung dari `PRODUK_MASTER` untuk section **Brand pilihan** dan **Second Chapter / Preloved**, tanpa mengubah source of truth SKU, harga, stok, atau media produk.

## Source of Truth
- HTML/CSS/JavaScript/workflow: GitHub `main`
- Homepage editorial statis: `assets/data/homepage-config.js`
- Brand pilihan + Second Chapter: `PRODUK_MASTER`
- Foto produk: `assets/images/products/**`
- Metadata produk & referensi media: `PRODUK_MASTER`
- SKU/varian/harga/stok: `VARIAN_STOK`
- Identitas/status brand: `BRAND_MASTER`
- Generated: `assets/data/catalog-data.js`, `produk/**`, `assets/images/share/**`, `tools/preview-generation-report.json`

## Kondisi Data Saat Checkpoint
- Produk aktif: **166**
- Varian/SKU aktif: **336**
- Brand: **22**
- Total stok: **609**
- Generated product share pages: **166**
- Generated social share images: **134**
- Catalog source: **live**
- Runtime/generator: **v4.12.4**

## Media Produk
`FOTO_UTAMA` → `FOTO_2` → `FOTO_3` → `FOTO_4` → `FOTO_5` → `FOTO_6` → `URL_VIDEO`

Setiap produk boleh memiliki 1–6 foto. Slot kosong diabaikan. Verifikasi enam foto tetap menggunakan PRD0163 — Della Set.

## Homepage Curation — v4.11.0
Kolom di `PRODUK_MASTER`:
- `URUTAN_BRAND_BERANDA` = 1–4
- `FOTO_BRAND_BERANDA` = 1–6
- `URUTAN_PRELOVED_BERANDA` = 1–4
- `FOTO_PRELOVED_BERANDA` = 1–6

Aturan:
- Brand pilihan membaca produk yang diberi `URUTAN_BRAND_BERANDA`.
- Nama brand mengikuti kolom `BRAND`.
- Second Chapter membaca produk Preloved yang diberi `URUTAN_PRELOVED_BERANDA`.
- Foto terpilih kosong → fallback ke `FOTO_UTAMA`.
- Produk habis/nonaktif tidak dipaksa tampil.
- `PRODUK_PILIHAN` + `URUTAN_BERANDA` tetap khusus **Pilihan buat kamu**.

### Pengaman Google Sheets
- dropdown urutan: 1–4
- dropdown foto: 1–6
- warning merah: nomor urutan dipakai lebih dari sekali pada section yang sama
- warning kuning: nomor foto menunjuk slot media yang kosong
- header AK–AN memiliki note penggunaan

Warning hanya visual dan tidak mengubah data otomatis.

## Apps Script LIVE
Apps Script v4.11.0 mengirim:
- `brandHomeOrder`
- `brandHomeImage`
- `prelovedHomeOrder`
- `prelovedHomeImage`

Workflow **Update Product Previews #59** berhasil dengan source `live` dan membuat commit:
`3d8ef283a180cd4d69de28f6ff70fd7cb7ca1b36`

Jalur Google Sheets LIVE → Apps Script LIVE → runtime/generator → fallback katalog sudah terverifikasi.

## Homepage Editorial Config yang Tetap Dipertahankan
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


## Custom Domain — v4.11.1
- Domain publik/canonical: `https://butikmidori.id`
- GitHub Pages tetap menjadi hosting.
- `CNAME` tetap `butikmidori.id`.
- `www.butikmidori.id` tetap boleh menunjuk ke `butikmidori.github.io` sebagai target teknis DNS GitHub Pages.
- `assets/js/app.js` memakai domain baru untuk link produk/WhatsApp/copy link.
- `index.html` dan `katalog.html` memakai domain baru untuk canonical, Open Graph, dan Twitter image.
- `tools/generate_product_previews.py` memakai domain baru sehingga seluruh `produk/**` generated ikut canonical ke domain baru.
- Domain lama `butikmidori.github.io` tidak lagi dipakai sebagai URL publik/canonical di source runtime/generator.

## SEO Foundation — v4.12.0
- `produk/**` tetap generated, tetapi menjadi halaman produk statis yang indexable dan tidak lagi auto-redirect.
- Product card menyediakan crawlable `<a href="/produk/<slug>/">` sambil mempertahankan modal untuk klik normal saat JavaScript aktif.
- Halaman produk generated memakai deskripsi/detail LIVE yang tersedia dan menambahkan `Product` + `BreadcrumbList` JSON-LD.
- Generator membuat `sitemap.xml` dari homepage, katalog, dan seluruh produk aktif.
- Generator membuat `robots.txt` yang mengizinkan crawling dan menunjuk ke sitemap.
- Title katalog dibedakan dari homepage.
- Link internal eksplisit ke `index.html` dinormalisasi ke canonical homepage `/`.

## Product Share Preview — v4.12.1
- Product-specific social share image memakai portrait **4:5 (1080×1350)**.
- Foto produk dibuat full-bleed dengan crop cover terpusat; tidak ada panel kosong kiri/kanan.
- Branding dibuat ringan: brand, nama produk, dan wordmark kecil `mi.do.ri`.
- Overlay bawah memakai Warm Cream transparan dengan aksen Muted Gold; foto tetap menjadi visual utama.
- Harga, diskon, badge stok, dan elemen promo tidak dimasukkan ke share image.
- Metadata Open Graph memakai dimensi 1080×1350 bila share image produk tersedia.
- Produk tanpa foto lokal tetap memakai fallback social image yang ada; tidak ada foto yang ditebak.
- `assets/images/share/**` tetap generated dan diregenerasi oleh workflow.

## Cross-platform Share Safe Framing — v4.12.2
- Format product-specific social preview tetap **portrait 4:5 (1080×1350)**.
- Foto tetap full-bleed; tidak ada ruang kosong kiri/kanan.
- Sharp hero digeser turun ringan sekitar 9% untuk memberi safe area yang lebih baik saat platform seperti Threads melakukan center-crop landscape.
- Area atas yang terbuka diisi dari foto yang sama dengan blur lembut, bukan warna/panel kosong.
- Transisi sharp image dibuat feathered agar tidak muncul garis sambungan keras.
- Overlay Warm Cream, brand, nama produk, wordmark `mi.do.ri`, dan metadata Open Graph 1080×1350 tetap dipertahankan.
- Tidak ada perubahan pada foto sumber, data Google Sheets, katalog, canonical URL, sitemap, robots.txt, DNS, atau HTTPS.
- Hasil final tetap dapat berbeda antar-platform karena crop preview ditentukan oleh platform.

## Clean Portrait Share Preview Refinement — v4.12.3
- Komposisi foto dikembalikan ke portrait clean full-bleed tanpa blur top fill.
- Social share image produk tetap **1080×1350 (4:5)**.
- Overlay bawah dipendekkan agar foto produk lebih dominan, khususnya pada preview WhatsApp.
- Isi share image tetap ringan: brand, nama produk, dan wordmark `mi.do.ri`.
- Tidak ada perubahan pada data Google Sheets LIVE, foto sumber, domain, DNS, HTTPS, canonical URL, sitemap, robots.txt, atau struktur katalog.

## Photo-first Share Preview — v4.12.4
- Product-specific social share image tetap **1080×1350 (4:5)** dengan foto clean full-bleed.
- Panel/overlay bawah, nama brand, nama produk, dan aksen dekoratif dihapus dari gambar agar tidak menduplikasi judul/deskripsi link card WhatsApp.
- Identitas visual pada gambar hanya wordmark kecil `mi.do.ri` di kanan bawah, **tanpa badge/pill/background panel**.
- Warna wordmark menyesuaikan terang/gelap area foto secara otomatis: Deep Emerald pada area terang, Warm Cream pada area gelap.
- Metadata Open Graph tetap memuat judul, brand, deskripsi, canonical URL, dan dimensi 1080×1350 sehingga informasi produk tetap tampil pada link card platform.
- Tidak ada perubahan pada data Google Sheets LIVE, foto sumber, SKU/varian/harga/stok, domain, DNS, HTTPS, canonical URL, sitemap, robots.txt, atau struktur katalog.
- Crop akhir pada Threads/platform lain tetap mengikuti kebijakan masing-masing platform.

## Aturan Update Aman
1. Mulai selalu dari GitHub `main` dan Sheets LIVE terbaru.
2. Untuk pilihan homepage, edit `PRODUK_MASTER`, cek warning, lalu jalankan `Update Product Previews` bila fallback/share perlu diselaraskan.
3. Untuk foto produk, upload ke `assets/images/products/**`, lalu update referensi di Sheets bila perlu.
4. Jangan edit manual generated files.
5. `VARIAN_STOK` tetap source of truth SKU, varian, harga, dan stok.

## Catatan
`assets/images/products/prd0005-02.webp` dan `assets/images/products/prd0006-02.webp` tetap harus dipertahankan.

## Prinsip Baseline Berikutnya
Setiap release berikutnya harus diturunkan dari GitHub `main` LIVE terbaru + database LIVE terbaru.
