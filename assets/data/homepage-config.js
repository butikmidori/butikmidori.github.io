/*
 * mi.do.ri — Homepage Configuration
 *
 * File ini khusus untuk mengatur produk/gambar cover di section
 * "The mi.do.ri Edit" tanpa perlu mengubah app.js.
 *
 * Cara ganti produk:
 * 1. Buka detail produk di website.
 * 2. Ambil slug dari URL setelah /produk/.
 *    Contoh: /produk/senja-asha-dress-kids/
 *    slug = "senja-asha-dress-kids"
 * 3. Ganti nilai `product` pada card yang diinginkan.
 *
 * `coverImage` bersifat opsional:
 * - kosong ("")  -> memakai FOTO_UTAMA produk secara otomatis.
 * - isi path      -> memakai gambar khusus sebagai cover card.
 *   Contoh: "assets/images/editorial/cover-padu-padan.webp"
 *
 * Jika slug tidak ditemukan, produk nonaktif/habis, atau gambar tidak tersedia,
 * website otomatis kembali ke pilihan produk default sehingga card tidak kosong.
 */
window.MIDORI_HOME_CONFIG = {
  editorialEdits: {
    mixMatch: {
      product: "puru-kambera-classy-cardigan-kids-s-m",
      coverImage: ""
    },

    specialMoment: {
      product: "senja-asha-dress-kids",
      coverImage: ""
    },

    kids: {
      product: "senja-asha-koko-kids",
      coverImage: ""
    }
  }
};
