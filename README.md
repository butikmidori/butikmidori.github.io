# mi.do.ri Webstore — Versi 1

Web katalog statis untuk mi.do.ri Multibrand Muslim Fashion.

## Fitur

- Katalog 166 produk dan 332 varian dari database Kasir Pintar
- Pencarian produk, brand, kategori, ukuran, dan SKU
- Filter brand, kategori, ukuran, segmen, kondisi, dan stok
- Detail produk dan pilihan varian
- Daftar pilihan tersimpan di browser
- Pengiriman daftar produk ke WhatsApp dalam satu pesan
- Tautan Instagram, TikTok, WhatsApp, dan Google Maps
- Tampilan responsif untuk ponsel dan desktop
- Tidak menggunakan login dan pembayaran langsung

## Struktur

- `index.html` — halaman utama
- `assets/css/style.css` — tampilan
- `assets/js/app.js` — fitur katalog
- `assets/data/catalog-data.js` — data yang dibaca website
- `assets/images/logo-midori.png` — logo
- `data/Database_Katalog_mi.do.ri.xlsx` — database sumber

## Menjalankan secara lokal

Gunakan local server. Jangan hanya klik dua kali `index.html`.

Contoh menggunakan Python:

```bash
python -m http.server 8000
```

Lalu buka `http://localhost:8000`.

## Mengunggah ke GitHub Pages

1. Buat repository baru, misalnya `midori-webstore`.
2. Unggah seluruh isi folder ini, bukan folder pembungkusnya.
3. Buka **Settings → Pages**.
4. Pada **Build and deployment**, pilih **Deploy from a branch**.
5. Pilih branch `main` dan folder `/root`.
6. Simpan dan tunggu alamat GitHub Pages aktif.

## Memperbarui produk

Versi 1 membaca data dari `assets/data/catalog-data.js`. File Excel tetap disertakan sebagai database utama. Setelah Excel diperbarui, data JavaScript perlu dibuat ulang agar perubahan muncul di web.

Tahap pengembangan berikutnya dapat membuat proses sinkronisasi Excel/Google Sheets menjadi lebih otomatis.

## Identitas kontak

- WhatsApp: 0811.717.7667
- Instagram: @butikmidori
- TikTok: @butik.midori
- Alamat: Jl. Soekarno Hatta No.17, Girimaya, Kota Pangkalpinang
