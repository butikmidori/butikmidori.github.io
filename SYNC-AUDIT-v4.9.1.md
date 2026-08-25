# mi.do.ri — Sync Audit v4.9.1

## Ringkasan
Audit membandingkan state GitHub LIVE dengan snapshot **DATABASE KATALOG MI.DO.RI — LIVE** yang digunakan untuk checkpoint ini.

### GitHub
- Repository: `butikmidori/butikmidori.github.io`
- Branch: `main`
- HEAD: `e3e7eb905fbe200e301818bfc218b7cb05949d62`
- Runtime web: v4.9.0
- Report generator LIVE: 166 produk aktif, 166 share pages, 133 share images

### Database
- 166 produk aktif
- 336 varian aktif
- 22 brand
- Total stok `VARIAN_STOK`: 609

Angka inti database sesuai dengan summary katalog fallback yang berada di GitHub pada saat audit.

## Audit BRAND_MASTER
Kolom ringkasan pada `BRAND_MASTER` tidak selalu sama dengan agregasi aktual `VARIAN_STOK`.

| Brand | SKU BRAND_MASTER | SKU aktual | Stok BRAND_MASTER | Stok aktual |
| --- | ---: | ---: | ---: | ---: |
| DOA | — | — | 34 | 32 |
| HEART TROOPS | — | — | 94 | 91 |
| NABNIB | — | — | 19 | 18 |
| NO BRAND | — | — | 54 | 48 |
| ANINDYASCARF | 40 | 43 | 42 | 41 |
| PRELOVED | — | — | 15 | 13 |
| KAMILA WARDROBE | 15 | 16 | 15 | 13 |

**Keputusan baseline:** `VARIAN_STOK` tetap dipakai sebagai sumber kebenaran untuk SKU/harga/stok. Kolom ringkasan `BRAND_MASTER` dianggap turunan sampai mekanisme formula/refresh-nya dirapikan.

Tidak ada nilai stok yang diubah otomatis dalam checkpoint ini karena data LIVE website saat ini sudah menggunakan agregasi aktual.

## Audit Jumlah Varian Produk
Ditemukan dua perbedaan yang perlu dipantau, bukan otomatis dianggap error:
- `PRD0134` / `anindyascarf-ishwari-dress-anak`: `JUMLAH_VARIAN` produk = 1, terdapat 2 row varian aktif; salah satunya stok 0.
- `PRD0161` / `preloved-ameena-tunik-outer-by-wordbies`: `JUMLAH_VARIAN` produk = 1, terdapat 2 row varian aktif; salah satunya stok 0.

Kemungkinan `JUMLAH_VARIAN` dimaksudkan menghitung varian yang masih memiliki stok. Karena itu tidak dilakukan koreksi otomatis.

## Audit Media
- `prd0005-02.webp`: **ada di GitHub LIVE**
- `prd0006-02.webp`: **ada di GitHub LIVE**
- Kedua referensi tersebut dipertahankan.
- Tidak dilakukan penghapusan/cleanup pada kedua foto.

Ada beberapa nama media yang tidak selalu identik dengan pola ID produk (mis. prefix 5 digit atau nomor file berbeda). Karena referensi spreadsheet dapat tetap valid dan generator mempertahankan path yang sudah ditentukan, nama-nama tersebut **tidak dinormalisasi otomatis** pada checkpoint ini.

## Perubahan yang Diterapkan pada v4.9.1
- Menetapkan GitHub `main` LIVE sebagai baseline kode/media.
- Menetapkan pembagian source-of-truth database.
- Mendokumentasikan current homepage manual configuration.
- Mendokumentasikan generated vs manual files.
- Mendokumentasikan audit mismatch tanpa mengubah data yang berisiko.
- Tidak ada perubahan desain, layout, copy, atau behavior website.
