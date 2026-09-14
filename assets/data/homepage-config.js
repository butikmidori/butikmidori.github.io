/*
 * mi.do.ri — Homepage Configuration
 *
 * File ini menjadi pusat pengaturan section "The mi.do.ri Edit".
 * Produk, foto cover, heading section, copy tiap card, dan link/filter
 * bisa diubah dari sini tanpa menyentuh assets/js/app.js.
 *
 * Produk:
 * - isi `product` dengan slug produk setelah /produk/ pada URL.
 * - contoh: /produk/senja-asha-dress-kids/ -> "senja-asha-dress-kids"
 *
 * Cover:
 * - `coverImage: ""` memakai FOTO_UTAMA produk secara otomatis.
 * - isi path bila ingin cover khusus, misalnya:
 *   "assets/images/editorial/cover-padu-padan.webp"
 *
 * Link/filter:
 * - `href` menerima URL katalog + query filter yang diinginkan.
 * - `collectionText` opsional. Kosongkan agar jumlah produk bawaan tetap tampil.
 *   Isi teks sendiri bila href/filter diubah supaya CTA tidak menampilkan jumlah lama.
 *
 * Jika slug produk tidak ditemukan, nonaktif/habis, atau gambar tidak tersedia,
 * app.js tetap memakai fallback aman yang sudah ada.
 */
window.MIDORI_HOME_CONFIG = {
  editorialSection: {
    eyebrow: "The mi.do.ri Edit",
    title: "Lagi cari yang seperti apa?",
    description: "Coba mulai dari gaya atau momen yang paling pas buat kamu."
  },

  editorialEdits: {
    mixMatch: {
      product: "puru-kambera-arine-blazer",
      coverImage: "",
      kicker: "01 · Padu padan",
      title: "Gampang Dipadu",
      description: "Luaran dan rajut yang tinggal dipadukan dengan yang sudah ada di lemari.",
      href: "katalog.html?kelompok=outerwear#katalog",
      collectionText: ""
    },

    specialMoment: {
      product: "anindyascarf-rafea-dress",
      coverImage: "",
      kicker: "02 · Momen spesial",
      title: "Buat Hari Spesial",
      description: "Dress dan set buat kondangan, acara keluarga, atau saat ingin tampil sedikit lebih istimewa.",
      href: "katalog.html?kelompok=dress-set#katalog",
      collectionText: ""
    },

    kids: {
      product: "heart-troops-niaz-koko-kids",
      coverImage: "",
      kicker: "03 · Si kecil",
      title: "Yang lucu-lucu buat si kecil.",
      description: "Nyaman dipakai, gampang disukai.",
      href: "katalog.html?segmen=Anak#katalog",
      collectionText: ""
    }
  }
};

/*
 * Presentation bridge.
 * app.js tetap menangani data produk, fallback, jumlah produk, dan quick view.
 * Bagian kecil ini hanya menerapkan copy/link dari konfigurasi di atas setelah
 * card editorial selesai dirender. Dengan begitu perubahan editorial tetap
 * cukup dilakukan di satu file ini.
 */
(() => {
  "use strict";

  const keys = ["mixMatch", "specialMoment", "kids"];

  function setText(element, value) {
    if (!element || typeof value !== "string" || element.textContent === value) return;
    element.textContent = value;
  }

  function applyEditorialConfig() {
    const config = window.MIDORI_HOME_CONFIG || {};
    const section = config.editorialSection || {};
    const heading = document.querySelector("#midori-edit .editorial-heading");

    if (heading) {
      setText(heading.querySelector(".editorial-eyebrow"), section.eyebrow);
      setText(heading.querySelector("h2"), section.title);
      setText(heading.querySelector(":scope > p"), section.description);
    }

    const cards = document.querySelectorAll("#editorialEditGrid .editorial-edit-card");
    cards.forEach((card, index) => {
      const key = keys[index];
      const item = config.editorialEdits?.[key];
      if (!item) return;

      const mediaLink = card.querySelector(".editorial-edit-media");
      const copy = card.querySelector(".editorial-edit-copy");
      const collectionLink = card.querySelector(".editorial-edit-actions a");

      setText(copy?.querySelector("span"), item.kicker);
      setText(copy?.querySelector("h3"), item.title);
      setText(copy?.querySelector("p"), item.description);

      if (typeof item.href === "string" && item.href) {
        if (mediaLink && mediaLink.getAttribute("href") !== item.href) {
          mediaLink.setAttribute("href", item.href);
        }
        if (collectionLink && collectionLink.getAttribute("href") !== item.href) {
          collectionLink.setAttribute("href", item.href);
        }
      }

      if (mediaLink && typeof item.title === "string" && item.title) {
        const ariaLabel = `Jelajahi ${item.title}`;
        if (mediaLink.getAttribute("aria-label") !== ariaLabel) {
          mediaLink.setAttribute("aria-label", ariaLabel);
        }
      }

      if (collectionLink && typeof item.collectionText === "string" && item.collectionText.trim()) {
        const label = item.collectionText.trim();
        const currentText = collectionLink.textContent.replace(/\s*↗\s*$/, "").trim();
        if (currentText !== label) {
          collectionLink.innerHTML = `${label} <b>↗</b>`;
        }
      }
    });
  }

  function start() {
    applyEditorialConfig();
    const grid = document.querySelector("#editorialEditGrid");
    if (!grid) return;

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        applyEditorialConfig();
      });
    });

    observer.observe(grid, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
