# mi.do.ri — Project State

## Baseline
- Project baseline checkpoint: **v4.12.0 — SEO Foundation & Indexable Product Pages**
- Tanggal checkpoint: **2026-08-26**
- Frontend/runtime saat checkpoint: **v4.12.0**
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
- Generated social share images: **133**
- Catalog source: **live**
- Runtime/generator: **v4.12.0**

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
