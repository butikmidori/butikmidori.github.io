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
      kicker: "01 · Gampang Dipadu",
      title: "Biar Gampang Mix & Match",
      description: "Luaran cantik yang siap bikin koleksi bajumu di lemari jadi tampil beda.",
      href: "katalog.html?kelompok=outerwear#katalog",
      collectionText: ""
    },

    specialMoment: {
      product: "anindyascarf-rafea-dress",
      coverImage: "",
      kicker: "02 · Momen spesial",
      title: "Untuk Hari Istimewamu",
      description: "Pilihan elegan yang pas banget buat kondangan atau acara kumpul keluarga.",
      href: "katalog.html?kelompok=dress-set#katalog",
      collectionText: ""
    },

    kids: {
      product: "heart-troops-niaz-koko-kids",
      coverImage: "",
      kicker: "03 · Si kecil",
      title: "Gaya Gemas Si Kecil.",
      description: "Koleksi super nyaman yang bikin waktu mainnya makin seru tanpa rewel.",
      href: "katalog.html?segmen=Anak#katalog",
      collectionText: ""
    }
  },

  visualPolish: {
    minFreshProducts: 2
  }
};

/*
 * Presentation bridge.
 * app.js tetap menangani data produk, fallback, jumlah produk, dan quick view.
 * Bagian kecil ini menerapkan copy/link dari konfigurasi di atas setelah
 * card editorial selesai dirender. Dengan begitu perubahan editorial tetap
 * cukup dilakukan di satu file ini.
 */
(() => {
  "use strict";

  const keys = ["mixMatch", "specialMoment", "kids"];
  const polishStyleId = "midori-home-visual-polish";

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

  function installVisualPolishStyles() {
    if (document.getElementById(polishStyleId)) return;

    const style = document.createElement("style");
    style.id = polishStyleId;
    style.textContent = `
      /* mi.do.ri homepage visual polish — readability + editorial rhythm */
      body[data-page="home"] .editorial-category-section .category-card h3 {
        margin-top: 13px;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.35;
      }
      body[data-page="home"] .editorial-category-section .category-card p {
        margin-top: 4px;
        color: #68766F;
        font-size: 12px;
        line-height: 1.4;
      }
      body[data-page="home"] .editorial-edit-copy > span,
      body[data-page="home"] .brand-discovery-index {
        font-size: 11px;
      }
      body[data-page="home"] .editorial-edit-actions a,
      body[data-page="home"] .editorial-edit-actions button,
      body[data-page="home"] .brand-discovery-copy p,
      body[data-page="home"] .campaign-stage-meta {
        font-size: 12px;
      }
      body[data-page="home"] .brand-discovery-copy > span {
        font-size: 11px;
      }
      body[data-page="home"] .brand-discovery-copy p {
        line-height: 1.5;
      }

      /* Fresh should look intentional when only a few products are marked BARU. */
      @media (min-width: 981px) {
        body[data-page="home"] .fresh-section.fresh-count-2 .home-product-grid {
          width: min(100%, 620px);
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        body[data-page="home"] .fresh-section.fresh-count-3 .home-product-grid {
          width: min(100%, 920px);
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      /* Slightly tighter transition around navigation / campaign sections. */
      body[data-page="home"] .editorial-category-section {
        padding-top: 54px;
        padding-bottom: 46px;
      }
      body[data-page="home"] .campaign-stage {
        padding-top: 42px;
        padding-bottom: 52px;
      }
      body[data-page="home"] .brand-discovery-section {
        padding-top: 62px;
        padding-bottom: 60px;
      }
      body[data-page="home"] .continue-section {
        padding-top: 58px;
        padding-bottom: 58px;
      }

      @media (max-width: 780px) {
        body[data-page="home"] .editorial-category-section,
        body[data-page="home"] .campaign-stage,
        body[data-page="home"] .brand-discovery-section,
        body[data-page="home"] .continue-section {
          padding-block: 44px;
        }
        body[data-page="home"] .editorial-category-section .category-card h3 {
          font-size: 13px;
        }
        body[data-page="home"] .editorial-category-section .category-card p,
        body[data-page="home"] .brand-discovery-copy p {
          font-size: 11px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function applyFreshDensity() {
    const section = document.querySelector("#fresh");
    const grid = document.querySelector("#freshGrid");
    if (!section || !grid) return;

    const cards = [...grid.querySelectorAll(".product-card")];
    const minimum = Math.max(1, Number(window.MIDORI_HOME_CONFIG?.visualPolish?.minFreshProducts) || 2);

    section.classList.remove("fresh-count-2", "fresh-count-3", "fresh-count-4");

    if (cards.length > 0 && cards.length < minimum) {
      section.hidden = true;
      section.dataset.polishHidden = "low-count";
      return;
    }

    if (section.dataset.polishHidden === "low-count" && cards.length >= minimum) {
      section.hidden = false;
      delete section.dataset.polishHidden;
    }

    if (cards.length >= 2) {
      section.classList.add(`fresh-count-${Math.min(cards.length, 4)}`);
    }
  }

  function applyAll() {
    applyEditorialConfig();
    applyFreshDensity();
  }

  function start() {
    installVisualPolishStyles();
    applyAll();

    const editorialGrid = document.querySelector("#editorialEditGrid");
    const freshGrid = document.querySelector("#freshGrid");
    let scheduled = false;

    const scheduleApply = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        applyAll();
      });
    };

    const observer = new MutationObserver(scheduleApply);
    if (editorialGrid) observer.observe(editorialGrid, { childList: true, subtree: true });
    if (freshGrid) observer.observe(freshGrid, { childList: true, subtree: true });

    window.addEventListener("load", scheduleApply, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
