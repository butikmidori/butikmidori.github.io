(async () => {
  "use strict";

  const APP_VERSION = "3.3.2";
  window.MIDORI_APP_VERSION = APP_VERSION;

  const SITE_ORIGIN = "https://butikmidori.github.io";
  const PRODUCT_PATH_PREFIX = "/produk/";
  let modalReturnUrl = null;

  const LIVE_CATALOG_URL = "https://script.google.com/macros/s/AKfycbxPJRajjNGt6VzSBEisLnO-dMp3RuyGaljk_uyXF_duR-_CLdeXZmIC_MVZSXfyCEmb/exec";
  const LIVE_CATALOG_TIMEOUT = 12000;

  let catalog;
  try {
    catalog = await loadCatalog();
  } catch (error) {
    console.error("Data katalog tidak dapat dimuat:", error);
    document.body.innerHTML = `<div style="max-width:720px;margin:80px auto;padding:32px;font-family:Arial,sans-serif;text-align:center"><h1 style="font-size:24px">Katalog belum dapat dimuat</h1><p style="line-height:1.6;color:#5d665f">Silakan muat ulang halaman beberapa saat lagi atau hubungi mi.do.ri melalui WhatsApp.</p><a href="https://wa.me/628117177667" style="display:inline-block;margin-top:12px;padding:12px 18px;border-radius:999px;background:#0b6f3c;color:white;text-decoration:none;font-weight:700">Chat WhatsApp</a></div>`;
    return;
  }

  if (!catalog || !Array.isArray(catalog.products)) {
    document.body.innerHTML = "<p style='padding:40px;font-family:sans-serif'>Data katalog tidak ditemukan.</p>";
    return;
  }


  async function loadCatalog() {
    const fallback = window.MIDORI_CATALOG;

    try {
      const liveCatalog = await loadCatalogJsonp();

      if (liveCatalog?.error) {
        throw new Error(liveCatalog.message || "Google Sheets API mengembalikan error.");
      }

      if (!liveCatalog || !Array.isArray(liveCatalog.products)) {
        throw new Error("Format data Google Sheets tidak valid.");
      }

      window.MIDORI_CATALOG = liveCatalog;
      window.MIDORI_CATALOG_SOURCE = "google-sheets";
      document.documentElement.dataset.catalogSource = "google-sheets";
      console.info(`mi.do.ri: katalog live dimuat (${liveCatalog.summary?.products || liveCatalog.products.length} produk).`);
      return liveCatalog;
    } catch (error) {
      console.warn("mi.do.ri: gagal mengambil data live, menggunakan data cadangan.", error);

      if (fallback && Array.isArray(fallback.products)) {
        window.MIDORI_CATALOG_SOURCE = "fallback";
        document.documentElement.dataset.catalogSource = "fallback";
        return fallback;
      }

      throw error;
    }
  }

  function loadCatalogJsonp() {
    return new Promise((resolve, reject) => {
      const callbackName = `MIDORI_receiveCatalog_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement("script");
      let settled = false;

      const cleanup = () => {
        clearTimeout(timer);
        script.remove();
        try {
          delete window[callbackName];
        } catch (_) {
          window[callbackName] = undefined;
        }
      };

      const finish = (handler, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        handler(value);
      };

      window[callbackName] = data => finish(resolve, data);

      script.async = true;
      script.src = `${LIVE_CATALOG_URL}?callback=${encodeURIComponent(callbackName)}&_=${Date.now()}`;
      script.onerror = () => finish(reject, new Error("Koneksi ke Google Sheets API gagal."));

      const timer = setTimeout(() => {
        finish(reject, new Error("Google Sheets API melewati batas waktu."));
      }, LIVE_CATALOG_TIMEOUT);

      document.head.appendChild(script);
    });
  }

  const store = catalog.store;
  const products = catalog.products
    .filter(product => product.status === "Aktif")
    .map(normalizeProductData);
  const brands = catalog.brands || [];

  function normalizeMediaValue(value) {
    return String(value || "").trim();
  }

  function pushMediaCandidate(target, value) {
    if (Array.isArray(value)) {
      value.forEach(item => pushMediaCandidate(target, item));
      return;
    }

    const normalized = normalizeMediaValue(value);
    if (!normalized) return;
    if (!target.includes(normalized)) target.push(normalized);
  }

  function normalizeProductData(product) {
    const normalized = { ...product };
    const images = [];

    [
      normalized.images,
      normalized.image,
      normalized.photo,
      normalized.foto,
      normalized.FOTO_UTAMA,
      normalized.FOTO_2,
      normalized.FOTO_3,
      normalized.foto_utama,
      normalized.foto_2,
      normalized.foto_3,
      normalized.fotoUtama,
      normalized.foto2,
      normalized.foto3,
      normalized.image1,
      normalized.image2,
      normalized.image3,
      normalized.IMAGE_1,
      normalized.IMAGE_2,
      normalized.IMAGE_3
    ].forEach(value => pushMediaCandidate(images, value));

    normalized.images = images;

    normalized.video = normalizeMediaValue(
      normalized.video ||
      normalized.URL_VIDEO ||
      normalized.url_video ||
      normalized.urlVideo ||
      normalized.videoUrl ||
      normalized.VIDEO_URL ||
      normalized.Video
    );

    return normalized;
  }

  const MAIN_CATEGORY_GROUPS = [
    {
      id: "hijab-khimar",
      label: "Hijab & Khimar",
      icon: "assets/images/categories/category-hijab-khimar.webp",
      categories: ["Hijab", "Bergo", "Khimar"]
    },
    {
      id: "dress-set",
      label: "Dress & Set",
      icon: "assets/images/categories/category-dress-set.webp",
      categories: ["Dress", "Set"]
    },
    {
      id: "atasan",
      label: "Atasan",
      icon: "assets/images/categories/category-atasan.webp",
      categories: ["Shirt", "Blouse", "Tunic"]
    },
    {
      id: "outerwear",
      label: "Outerwear",
      icon: "assets/images/categories/category-outerwear.webp",
      categories: ["Sweater", "Outer"]
    },
    {
      id: "bawahan",
      label: "Bawahan",
      icon: "assets/images/categories/category-bawahan.webp",
      categories: ["Pants", "Skirt", "Saroong", "Sarong", "Sarung"]
    },
    {
      id: "perlengkapan-ibadah",
      label: "Perlengkapan Ibadah",
      icon: "assets/images/categories/category-perlengkapan-ibadah.webp",
      categories: ["Mukena", "Sajadah"]
    },
    {
      id: "aksesori-pelengkap",
      label: "Aksesori & Pelengkap",
      icon: "assets/images/categories/category-aksesori-pelengkap.webp",
      categories: ["Aksesoris", "Accessories", "Manset", "Bag", "Shoes"]
    }
  ];

  function getMainCategoryGroup(groupId) {
    return MAIN_CATEGORY_GROUPS.find(group => group.id === groupId) || null;
  }

  function productMatchesMainCategory(product, groupId) {
    const group = getMainCategoryGroup(groupId);
    return Boolean(group && group.categories.includes(product.category));
  }

  function categoryInitials(label) {
    return label
      .split(/\s+|&/)
      .map(part => part.trim())
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join("");
  }

  const state = {
    query: "",
    brand: "",
    category: "",
    mainCategory: "",
    segment: "",
    condition: "",
    availability: "",
    sale: false,
    sort: "recommended",
    page: 1,
    perPage: 25,
    filtered: [],
    cart: loadCart()
  };

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const elements = {
    navToggle: $("#navToggle"),
    mainNav: $("#mainNav"),
    categoryNavDropdown: $("#categoryNavDropdown"),
    categoryNavToggle: $("#categoryNavToggle"),
    categoryNavMenu: $("#categoryNavMenu"),
    brandNavDropdown: $("#brandNavDropdown"),
    brandNavToggle: $("#brandNavToggle"),
    brandNavMenu: $("#brandNavMenu"),
    searchInput: $("#searchInput"),
    brandFilter: $("#brandFilter"),
    categoryFilter: $("#categoryFilter"),
    segmentFilter: $("#segmentFilter"),
    conditionFilter: $("#conditionFilter"),
    availabilityFilter: $("#availabilityFilter"),
    saleFilterChip: $("#saleFilterChip"),
    clearSaleFilter: $("#clearSaleFilter"),
    saleNavLink: $("#saleNavLink"),
    catalogNavLink: $("#catalogNavLink"),
    catalogEyebrow: $("#catalogEyebrow"),
    catalogTitle: $("#catalogTitle"),
    catalogDescription: $("#catalogDescription"),
    sortSelect: $("#sortSelect"),
    filtersPanel: $("#filtersPanel"),
    resetFiltersBtn: $("#resetFiltersBtn"),
    emptyResetBtn: $("#emptyResetBtn"),
    productGrid: $("#productGrid"),
    featuredGrid: $("#featuredGrid"),
    prelovedGrid: $("#prelovedGrid"),
    resultCount: $("#resultCount"),
    emptyState: $("#emptyState"),
    paginationWrap: $("#paginationWrap"),
    pageNumbers: $("#pageNumbers"),
    prevPageBtn: $("#prevPageBtn"),
    nextPageBtn: $("#nextPageBtn"),
    categoryGrid: $("#categoryGrid"),
    modal: $("#productModal"),
    modalContent: $("#productModalContent"),
    cartDrawer: $("#cartDrawer"),
    openCartBtn: $("#openCartBtn"),
    promoOpenCartBtn: $("#promoOpenCartBtn"),
    cartCount: $("#cartCount"),
    cartItems: $("#cartItems"),
    cartEmpty: $("#cartEmpty"),
    cartTotal: $("#cartTotal"),
    sendCartBtn: $("#sendCartBtn"),
    clearCartBtn: $("#clearCartBtn"),
    toast: $("#toast"),
    heroProductImage: $("#heroProductImage"),
    heroSlider: $("#heroSlider"),
    heroSliderTrack: $("#heroSliderTrack"),
    heroSliderPrev: $("#heroSliderPrev"),
    heroSliderNext: $("#heroSliderNext"),
    heroSliderDots: $("#heroSliderDots"),
    heroSliderStatus: $("#heroSliderStatus")
  };

  const IS_CATALOG_PAGE = Boolean(elements.productGrid);

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(value = "") {
    return String(value)
      .toLocaleLowerCase("id-ID")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  function formatPrice(product) {
    if (product.priceMin === product.priceMax) return formatCurrency(product.priceMin);
    return `${formatCurrency(product.priceMin)} – ${formatCurrency(product.priceMax)}`;
  }


  function parsePromoDate(value, endOfDay = false) {
    if (!value) return null;
    const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function promoPercent(product) {
    const value = Math.round(Number(product?.discountPercent || 0));
    return Math.min(100, Math.max(0, value));
  }

  function isPromoActive(product, now = new Date()) {
    if (!product || product.promoActive !== true || promoPercent(product) <= 0) return false;
    const start = parsePromoDate(product.promoStart, false);
    const end = parsePromoDate(product.promoEnd, true);
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  }

  function discountedPrice(value, product) {
    const price = Number(value || 0);
    if (!isPromoActive(product)) return price;
    return Math.round(price * (100 - promoPercent(product)) / 100);
  }

  function formatProductPriceText(product) {
    if (!isPromoActive(product)) return formatPrice(product);
    const min = discountedPrice(product.priceMin, product);
    const max = discountedPrice(product.priceMax, product);
    return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
  }

  function productPriceMarkup(product, compact = false) {
    if (!isPromoActive(product)) return `<span class="current-price">${formatPrice(product)}</span>`;
    return `<span class="original-price">${formatPrice(product)}</span><span class="discounted-price">${formatProductPriceText(product)}</span>${compact ? "" : `<span class="saving-note">Hemat ${promoPercent(product)}%</span>`}`;
  }

  function variantPriceMarkup(product, variant) {
    if (!variant) return productPriceMarkup(product);
    if (!isPromoActive(product)) return `<span class="current-price">${formatCurrency(variant.price)}</span>`;
    const finalPrice = discountedPrice(variant.price, product);
    return `<span class="original-price">${formatCurrency(variant.price)}</span><span class="discounted-price">${formatCurrency(finalPrice)}</span><span class="saving-note">Hemat ${formatCurrency(variant.price - finalPrice)}</span>`;
  }

  function whatsappPriceLines(product, variant = null) {
    const normal = variant ? Number(variant.price || 0) : Number(product.priceMin || 0);
    if (!isPromoActive(product)) return `Harga: ${variant ? formatCurrency(normal) : formatPrice(product)}`;
    const promo = variant ? discountedPrice(normal, product) : formatProductPriceText(product);
    return variant
      ? `Harga normal: ${formatCurrency(normal)}\nHarga promo: ${formatCurrency(promo)} (-${promoPercent(product)}%)`
      : `Harga normal: ${formatPrice(product)}\nHarga promo: ${promo} (-${promoPercent(product)}%)`;
  }

  function productAvailability(product) {
    const availableVariants = product.variants.filter(v => v.stock > 0 && v.status === "Aktif");
    if (!availableVariants.length) return "out";
    if (availableVariants.every(v => v.stock <= 2)) return "limited";
    return "available";
  }

  function stockLabel(type) {
    return type === "out" ? "Habis" : type === "limited" ? "Stok menipis" : "Tersedia";
  }

  function productInitials(product) {
    const words = product.name.split(/\s+/).filter(Boolean);
    return (words[0]?.[0] || "M") + (words[1]?.[0] || "");
  }

  function placeholderClass(product) {
    return `placeholder-${(Number(product.brandCode || 0) % 5) + 1}`;
  }

  function productImages(product) {
    return Array.isArray(product?.images)
      ? product.images.map(item => normalizeMediaValue(item)).filter(Boolean)
      : [];
  }

  function firstProductImage(product) {
    return productImages(product)[0] || "";
  }

  function productVideoUrl(product) {
    return normalizeMediaValue(product?.video);
  }

  function imageMarkup(product, className = "") {
    const image = firstProductImage(product);
    const placeholder = `<div class="product-placeholder ${placeholderClass(product)} ${className}" ${image ? "hidden" : ""}><span><strong>${escapeHtml(productInitials(product))}</strong><small>${escapeHtml(product.brand)}</small></span></div>`;
    if (!image) return placeholder;
    return `<img class="${className}" src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">${placeholder}`;
  }

  function parseYouTubeVideoId(url) {
    if (!url) return "";
    try {
      const parsed = new URL(url, window.location.origin);
      const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
      if (host === "youtu.be") {
        return parsed.pathname.split("/").filter(Boolean)[0] || "";
      }
      if (host.endsWith("youtube.com")) {
        if (parsed.searchParams.get("v")) return parsed.searchParams.get("v") || "";
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || "";
      }
    } catch (_) {
      return "";
    }
    return "";
  }

  function videoMediaItem(product) {
    const url = productVideoUrl(product);
    if (!url) return null;

    const youtubeId = parseYouTubeVideoId(url);
    if (youtubeId) {
      return {
        type: "video",
        provider: "youtube",
        url,
        embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?rel=0&modestbranding=1`,
        label: "Video produk"
      };
    }

    if (/\.(mp4|webm|ogg)(?:$|[?#])/i.test(url)) {
      return {
        type: "video",
        provider: "direct",
        url,
        embedUrl: url,
        label: "Video produk"
      };
    }

    return {
      type: "video",
      provider: "link",
      url,
      embedUrl: "",
      label: "Video produk"
    };
  }

  function productMediaItems(product) {
    const imageItems = productImages(product).map((src, index) => ({
      type: "image",
      src,
      alt: `${product.name}${index > 0 ? ` — foto ${index + 1}` : ""}`
    }));
    const videoItem = videoMediaItem(product);
    return videoItem ? [...imageItems, videoItem] : imageItems;
  }

  function renderModalMainMedia(item, product) {
    if (!item) return imageMarkup(product, "modal-main-media-image");

    if (item.type === "image") {
      const placeholder = `<div class="product-placeholder ${placeholderClass(product)} modal-main-media-image" hidden><span><strong>${escapeHtml(productInitials(product))}</strong><small>${escapeHtml(product.brand)}</small></span></div>`;
      return `<img class="modal-main-media-image" src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt || product.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">${placeholder}`;
    }

    if (item.provider === "youtube") {
      return `
        <div class="modal-main-media-video-wrap">
          <iframe class="modal-main-media-embed" src="${escapeHtml(item.embedUrl)}" title="${escapeHtml(product.name)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </div>
        <div class="modal-media-caption"><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Buka video di tab baru</a></div>`;
    }

    if (item.provider === "direct") {
      return `
        <div class="modal-main-media-video-wrap">
          <video class="modal-main-media-video" src="${escapeHtml(item.embedUrl)}" controls playsinline preload="metadata"></video>
        </div>
        <div class="modal-media-caption"><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Buka video di tab baru</a></div>`;
    }

    return `
      <div class="modal-media-link-fallback">
        <div class="modal-media-link-icon" aria-hidden="true">▶</div>
        <h3>Video produk tersedia</h3>
        <p>Klik tombol di bawah untuk menonton video produk ini.</p>
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Buka video</a>
      </div>`;
  }

  function renderModalMediaThumb(item, index, product, isActive = false) {
    if (item.type === "image") {
      return `
        <button type="button" class="modal-media-thumb${isActive ? " is-active" : ""}" data-media-index="${index}" aria-pressed="${isActive ? "true" : "false"}" aria-label="Lihat foto ${index + 1}">
          <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt || product.name)}" loading="lazy">
        </button>`;
    }

    return `
      <button type="button" class="modal-media-thumb modal-media-thumb-video${isActive ? " is-active" : ""}" data-media-index="${index}" aria-pressed="${isActive ? "true" : "false"}" aria-label="Lihat video produk">
        <span class="modal-media-thumb-video-icon" aria-hidden="true">▶</span>
        <span class="modal-media-thumb-video-label">Video</span>
      </button>`;
  }

  function renderModalMediaStrip(product, items) {
    if (!items || items.length <= 1) return "";
    return `<div class="modal-media-strip" role="tablist" aria-label="Galeri media produk">${items.map((item, index) => renderModalMediaThumb(item, index, product, index === 0)).join("")}</div>`;
  }

  function productUrl(product) {
    return `${SITE_ORIGIN}${PRODUCT_PATH_PREFIX}${encodeURIComponent(product.slug)}/`;
  }

  function productSharePath(product) {
    return `${PRODUCT_PATH_PREFIX}${encodeURIComponent(product.slug)}/`;
  }

  function urlWithoutProduct(urlLike = window.location.href) {
    const url = new URL(urlLike, window.location.origin);
    url.searchParams.delete("produk");
    if (url.pathname.startsWith(PRODUCT_PATH_PREFIX)) {
      url.pathname = IS_CATALOG_PAGE ? "/katalog.html" : "/";
      if (IS_CATALOG_PAGE) url.hash = "katalog";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function whatsappProductUrl(product, variant = null) {
    const chosen = variant || product.variants.find(v => v.stock > 0) || product.variants[0];
    const details = chosen
      ? `
Kode: ${chosen.sku}
Warna/Motif: ${chosen.color || "-"}
Ukuran: ${chosen.size || "-"}`
      : "";
    const promoLabel = isPromoActive(product) && product.promoLabel ? `
Promo: ${product.promoLabel}` : "";
    const message = `Halo mi.do.ri, saya tertarik dengan produk:

${product.name}
Brand: ${product.brand}${details}${promoLabel}
${whatsappPriceLines(product, chosen)}

Link katalog: ${productUrl(product)}

Apakah masih tersedia?`;
    return `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(message)}`;
  }

  async function copyText(value) {
    const text = String(value || "");
    if (!text) return false;

    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }

  async function copyProductLink(product, button = null) {
    try {
      const copied = await copyText(productUrl(product));
      if (!copied) throw new Error("Clipboard tidak tersedia");
      showToast("Link produk berhasil disalin.");

      if (button) {
        const label = button.querySelector("span");
        const original = label?.textContent || "Salin link produk";
        button.classList.add("is-copied");
        if (label) label.textContent = "Link disalin ✓";
        clearTimeout(button._copyResetTimer);
        button._copyResetTimer = setTimeout(() => {
          button.classList.remove("is-copied");
          if (label) label.textContent = original;
        }, 1800);
      }
    } catch (error) {
      console.warn("Gagal menyalin link produk:", error);
      showToast("Link belum bisa disalin. Coba salin dari address bar.");
    }
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => elements.toast.classList.remove("show"), 2300);
  }

  function fillSelect(select, values) {
    if (!select) return;
    values.forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  function setupFilters() {
    const activeBrands = [...new Set(products.map(p => p.brand))].sort((a, b) => a.localeCompare(b, "id"));
    const categories = [...new Set(products.map(p => p.category))].sort((a, b) => a.localeCompare(b, "id"));

    fillSelect(elements.brandFilter, activeBrands);
    fillSelect(elements.categoryFilter, categories);
  }

  function renderBrandNavigation() {
    if (!elements.brandNavMenu) return;

    const activeBrands = [...new Set(
      products
        .map(product => String(product.brand || "").trim())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "id-ID"));

    const allActive = !state.brand;
    const links = [
      `<a role="menuitem" class="${allActive ? "is-active" : ""}" href="katalog.html#katalog"${allActive ? ' aria-current="page"' : ""}>Semua Brand</a>`,
      ...activeBrands.map(brand => {
        const active = normalize(state.brand) === normalize(brand);
        return `<a role="menuitem" class="${active ? "is-active" : ""}" href="katalog.html?brand=${encodeURIComponent(brand)}#katalog"${active ? ' aria-current="page"' : ""}>${escapeHtml(brand)}</a>`;
      })
    ];

    elements.brandNavMenu.innerHTML = links.join("");
  }

  function catalogUrl(parameters = {}) {
    const url = new URL("/katalog.html", window.location.origin);

    Object.entries(parameters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });

    url.hash = "katalog";
    return url.toString();
  }

  function applyUrlFilters() {
    if (!IS_CATALOG_PAGE) return;

    const params = new URLSearchParams(window.location.search);
    const mainCategory = params.get("kelompok") || "";
    const detailCategory = params.get("kategori") || "";

    state.query = params.get("q") || "";
    state.brand = params.get("brand") || "";
    state.category = detailCategory;
    state.mainCategory = getMainCategoryGroup(mainCategory) ? mainCategory : "";
    state.condition = params.get("kondisi") || "";
    state.segment = params.get("segmen") || "";
    state.availability = params.get("stok") || "";
    state.sale = params.get("sale") === "1";
    state.sort = params.get("urut") || "recommended";

    if (elements.searchInput) elements.searchInput.value = state.query;
    if (elements.brandFilter) elements.brandFilter.value = state.brand;
    if (elements.categoryFilter) elements.categoryFilter.value = state.category;
    if (elements.conditionFilter) elements.conditionFilter.value = state.condition;
    if (elements.segmentFilter) elements.segmentFilter.value = state.segment;
    if (elements.availabilityFilter) elements.availabilityFilter.value = state.availability;
    if (elements.sortSelect) elements.sortSelect.value = state.sort;
    updateSaleView();
  }

  function updateSaleView() {
    if (!IS_CATALOG_PAGE) return;

    if (elements.saleFilterChip) {
      elements.saleFilterChip.hidden = !state.sale;
    }

    if (elements.saleNavLink && elements.catalogNavLink) {
      elements.saleNavLink.classList.toggle("active", state.sale);
      elements.catalogNavLink.classList.toggle("active", !state.sale);

      if (state.sale) {
        elements.saleNavLink.setAttribute("aria-current", "page");
        elements.catalogNavLink.removeAttribute("aria-current");
      } else {
        elements.catalogNavLink.setAttribute("aria-current", "page");
        elements.saleNavLink.removeAttribute("aria-current");
      }
    }

    if (elements.catalogEyebrow) {
      elements.catalogEyebrow.textContent = state.sale ? "SALE" : "Full catalog";
    }
    if (elements.catalogTitle) {
      elements.catalogTitle.textContent = state.sale ? "Produk SALE mi.do.ri" : "Seluruh koleksi mi.do.ri";
    }
    if (elements.catalogDescription) {
      elements.catalogDescription.textContent = state.sale
        ? "Menampilkan produk dengan promo yang sedang aktif. Kamu tetap bisa menyaring berdasarkan brand, kategori, segmen, dan stok."
        : "Cari berdasarkan nama produk, brand, kategori, warna, atau kode barang.";
    }
  }

  function syncCatalogUrl() {
    if (!IS_CATALOG_PAGE) return;

    const url = new URL(window.location.href);
    const productSlug = url.searchParams.get("produk");

    [
      "q", "brand", "kategori", "kelompok", "kondisi",
      "ukuran", "segmen", "stok", "sale", "urut"
    ].forEach(key => url.searchParams.delete(key));

    if (state.query) url.searchParams.set("q", state.query);
    if (state.brand) url.searchParams.set("brand", state.brand);
    if (state.category) url.searchParams.set("kategori", state.category);
    if (state.mainCategory) url.searchParams.set("kelompok", state.mainCategory);
    if (state.condition) url.searchParams.set("kondisi", state.condition);
    if (state.segment) url.searchParams.set("segmen", state.segment);
    if (state.availability) url.searchParams.set("stok", state.availability);
    if (state.sale) url.searchParams.set("sale", "1");
    if (state.sort && state.sort !== "recommended") {
      url.searchParams.set("urut", state.sort);
    }

    if (productSlug) url.searchParams.set("produk", productSlug);

    history.replaceState({}, "", url);
  }

  function renderSummary() {
    const values = {
      statProducts: catalog.summary.products.toLocaleString("id-ID"),
      statBrands: catalog.summary.brands.toLocaleString("id-ID")
    };
    Object.entries(values).forEach(([id, value]) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    });
    const currentYear = $("#currentYear");
    if (currentYear) currentYear.textContent = new Date().getFullYear();
  }

  function renderHero() {
    const slider = elements.heroSlider;
    const track = elements.heroSliderTrack;

    if (!slider || !track) {
      if (!elements.heroProductImage) return;
      elements.heroProductImage.src = "assets/images/hero/hero-koleksi.webp";
      elements.heroProductImage.alt = "Koleksi utama mi.do.ri";
      return;
    }

    const fallback = slider.querySelector(".hero-photo-fallback");
    let slides = [];
    let currentIndex = 0;
    let autoplayTimer = null;
    let dragStartX = null;
    let dragPointerId = null;

    const stopAutoplay = () => {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    };

    const startAutoplay = () => {
      stopAutoplay();
      if (slides.length <= 1 || document.hidden) return;
      autoplayTimer = window.setInterval(() => showSlide(currentIndex + 1), 6000);
    };

    const buildDots = () => {
      if (!elements.heroSliderDots) return;
      elements.heroSliderDots.innerHTML = slides.map((_, index) => `
        <button
          class="hero-slider-dot${index === currentIndex ? " is-active" : ""}"
          type="button"
          data-hero-slide-index="${index}"
          aria-label="Tampilkan foto ${index + 1}"
          aria-current="${index === currentIndex ? "true" : "false"}"
        ></button>
      `).join("");
    };

    const updateControls = () => {
      const hasMultipleSlides = slides.length > 1;
      if (elements.heroSliderPrev) elements.heroSliderPrev.hidden = !hasMultipleSlides;
      if (elements.heroSliderNext) elements.heroSliderNext.hidden = !hasMultipleSlides;
      if (elements.heroSliderDots) elements.heroSliderDots.hidden = !hasMultipleSlides;
    };

    const showSlide = (index, restart = false) => {
      if (!slides.length) return;

      currentIndex = (index + slides.length) % slides.length;
      track.style.transition = "";
      track.style.transform = `translate3d(-${currentIndex * 100}%, 0, 0)`;

      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === currentIndex;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", String(!active));
      });

      elements.heroSliderDots?.querySelectorAll(".hero-slider-dot").forEach((dot, dotIndex) => {
        const active = dotIndex === currentIndex;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-current", String(active));
      });

      if (elements.heroSliderStatus) {
        elements.heroSliderStatus.textContent = `Foto ${currentIndex + 1} dari ${slides.length}`;
      }

      if (restart) startAutoplay();
    };

    const refreshSlides = () => {
      slides = [...track.querySelectorAll(".hero-slide")];

      if (!slides.length) {
        if (fallback) fallback.hidden = false;
        if (elements.heroSliderPrev) elements.heroSliderPrev.hidden = true;
        if (elements.heroSliderNext) elements.heroSliderNext.hidden = true;
        if (elements.heroSliderDots) elements.heroSliderDots.hidden = true;
        stopAutoplay();
        return;
      }

      if (fallback) fallback.hidden = true;
      currentIndex = Math.min(currentIndex, slides.length - 1);
      buildDots();
      updateControls();
      showSlide(currentIndex);
      startAutoplay();
    };

    track.querySelectorAll(".hero-slide img").forEach(image => {
      image.draggable = false;
      const slide = image.closest(".hero-slide");
      const removeBrokenSlide = () => {
        slide?.remove();
        refreshSlides();
      };

      if (image.complete && image.naturalWidth === 0) {
        removeBrokenSlide();
      } else {
        image.addEventListener("error", removeBrokenSlide, { once: true });
      }
    });

    elements.heroSliderPrev?.addEventListener("click", () => showSlide(currentIndex - 1, true));
    elements.heroSliderNext?.addEventListener("click", () => showSlide(currentIndex + 1, true));

    elements.heroSliderDots?.addEventListener("click", event => {
      const button = event.target.closest("[data-hero-slide-index]");
      if (!button) return;
      showSlide(Number(button.dataset.heroSlideIndex), true);
    });

    slider.addEventListener("keydown", event => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showSlide(currentIndex - 1, true);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showSlide(currentIndex + 1, true);
      }
    });

    slider.addEventListener("pointerdown", event => {
      if (slides.length <= 1 || (event.pointerType === "mouse" && event.button !== 0)) return;
      dragStartX = event.clientX;
      dragPointerId = event.pointerId;
      stopAutoplay();
      slider.classList.add("is-dragging");
      slider.setPointerCapture?.(event.pointerId);
    });

    slider.addEventListener("pointermove", event => {
      if (dragStartX === null || event.pointerId !== dragPointerId) return;
      const delta = event.clientX - dragStartX;
      track.style.transition = "none";
      track.style.transform = `translate3d(calc(-${currentIndex * 100}% + ${delta}px), 0, 0)`;
    });

    const finishDrag = event => {
      if (dragStartX === null || event.pointerId !== dragPointerId) return;
      const delta = event.clientX - dragStartX;
      dragStartX = null;
      dragPointerId = null;
      slider.classList.remove("is-dragging");
      track.style.transition = "";

      if (Math.abs(delta) >= 45) {
        showSlide(currentIndex + (delta < 0 ? 1 : -1), true);
      } else {
        showSlide(currentIndex, true);
      }
    };

    slider.addEventListener("pointerup", finishDrag);
    slider.addEventListener("pointercancel", finishDrag);
    slider.addEventListener("mouseenter", stopAutoplay);
    slider.addEventListener("mouseleave", startAutoplay);
    slider.addEventListener("focusin", stopAutoplay);
    slider.addEventListener("focusout", startAutoplay);
    document.addEventListener("visibilitychange", () => document.hidden ? stopAutoplay() : startAutoplay());

    refreshSlides();
  }

  function setCatalogFilter(type, value) {
    if (!IS_CATALOG_PAGE) {
      const parameterMap = {
        category: "kategori",
        brand: "brand",
        condition: "kondisi"
      };
      window.location.href = catalogUrl({
        [parameterMap[type] || type]: value
      });
      return;
    }

    state[type] = value;

    if (type === "category") {
      state.mainCategory = "";
    }

    state.page = 1;

    const controlMap = {
      category: elements.categoryFilter,
      brand: elements.brandFilter,
      condition: elements.conditionFilter
    };

    if (controlMap[type]) {
      controlMap[type].value = value;
    }

    applyFilters();
    $("#katalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setMainCategoryFilter(groupId) {
    const group = getMainCategoryGroup(groupId);
    if (!group) return;

    if (!IS_CATALOG_PAGE) {
      window.location.href = catalogUrl({ kelompok: group.id });
      return;
    }

    state.mainCategory = group.id;
    state.category = "";
    state.page = 1;

    if (elements.categoryFilter) {
      elements.categoryFilter.value = "";
    }

    applyFilters();
    $("#katalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderCategories() {
    if (!elements.categoryGrid) return;

    elements.categoryGrid.innerHTML = MAIN_CATEGORY_GROUPS.map(group => {
      const groupProducts = products
        .filter(product => group.categories.includes(product.category))
        .sort((a, b) =>
          Number(Boolean(b.images?.find(Boolean))) -
            Number(Boolean(a.images?.find(Boolean))) ||
          b.totalStock - a.totalStock
        );

      const representative = groupProducts[0];
      const productCount = groupProducts.length;

      const visual = `
        <img
          class="category-icon-image"
          src="${escapeHtml(group.icon)}"
          alt="${escapeHtml(group.label)}"
          loading="lazy"
          decoding="async"
        >`;

      return `
        <button
          class="category-card"
          type="button"
          data-main-category="${escapeHtml(group.id)}"
          aria-label="Lihat kategori ${escapeHtml(group.label)}"
        >
          <span class="category-image">${visual}</span>
          <h3>${escapeHtml(group.label)}</h3>
          <p>${productCount.toLocaleString("id-ID")} produk</p>
        </button>`;
    }).join("");
  }

  function productBadges(product) {
    const availability = productAvailability(product);
    const promo = isPromoActive(product);
    return [
      promo ? `<span class="badge badge-discount" title="${escapeHtml(product.promoLabel || `Diskon ${promoPercent(product)}%`)}"><small>SALE</small><strong>${promoPercent(product)}%</strong></span>` : "",
      product.isNew ? `<span class="badge">Baru</span>` : "",
      product.condition === "Preloved" ? "" : "",
      availability === "out" ? `<span class="badge badge-out">Habis</span>` : ""
    ].join("");
  }

  function renderProductCard(product) {
    const availability = productAvailability(product);
    const info = [
      product.colors.length ? `${product.colors.length} warna` : "",
      product.sizes.length ? product.sizes.slice(0, 3).join(", ") : ""
    ].filter(Boolean).join(" · ");

    return `
      <article class="product-card">
        <div class="product-image-wrap">
          <button class="product-image-open" type="button" data-open-product="${product.id}" aria-label="Buka detail ${escapeHtml(product.name)}">
            ${imageMarkup(product, "product-image")}
          </button>
          <div class="product-badges">${productBadges(product)}</div>
          ${availability === "limited" ? `<span class="badge badge-limited badge-stock-bottom-left">Stok menipis</span>` : ""}
          ${product.condition === "Preloved" ? `<span class="badge badge-preloved badge-preloved-bottom-right">Preloved</span>` : ""}
          <button class="product-favorite" type="button" data-quick-add="${product.id}" aria-label="Tambah ${escapeHtml(product.name)} ke daftar pilihan">♡</button>
        </div>
        <div class="product-body">
          <p class="product-brand">${escapeHtml(product.brand)}</p>
          <h3 class="product-title">${escapeHtml(product.name)}</h3>
          <div class="product-rating">● <span>${stockLabel(availability)}</span></div>
          <div class="product-price${isPromoActive(product) ? " has-promo" : ""}">${productPriceMarkup(product, true)}</div>
          <p class="product-card-info" title="${escapeHtml(info)}">${escapeHtml(info)}</p>
          <div class="product-actions">
            <button class="button button-primary" type="button" data-open-product="${product.id}">Pilih produk</button>
            <a class="quick-wa" href="${whatsappProductUrl(product)}" target="_blank" rel="noopener" aria-label="Tanya ${escapeHtml(product.name)} via WhatsApp">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L0 24l6.5-1.7a11.8 11.8 0 0 0 5.6 1.4h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.1-1.2-6-3.5-8.4Z"></path></svg>
            </a>
          </div>
        </div>
      </article>`;
  }

  function selectDiverseProducts(candidates, limit, excludedIds = new Set()) {
    const sorted = candidates
      .filter(product => !excludedIds.has(product.id) && product.brand !== "BOX" && productAvailability(product) !== "out")
      .sort((a, b) =>
        Number(Boolean(b.images?.find(Boolean))) - Number(Boolean(a.images?.find(Boolean))) ||
        b.totalStock - a.totalStock ||
        a.brandCode - b.brandCode
      );

    const selected = [];
    const usedBrands = new Set();
    for (const product of sorted) {
      if (!usedBrands.has(product.brand)) {
        selected.push(product);
        usedBrands.add(product.brand);
      }
      if (selected.length === limit) return selected;
    }
    for (const product of sorted) {
      if (!selected.some(item => item.id === product.id)) selected.push(product);
      if (selected.length === limit) break;
    }
    return selected;
  }

  function curatedHomeOrder(product) {
    const order = Number(product.homeOrder);

    return Number.isFinite(order) && order > 0
      ? order
      : Number.MAX_SAFE_INTEGER;
  }

  function sortCuratedHomeProducts(a, b) {
    return curatedHomeOrder(a) - curatedHomeOrder(b)
      || Number(Boolean(b.images?.find(Boolean))) -
        Number(Boolean(a.images?.find(Boolean)))
      || b.totalStock - a.totalStock
      || a.name.localeCompare(b.name, "id");
  }

  function renderCuratedSections() {
    const selectedProducts = products
      .filter(product => product.isFeatured === true)
      .filter(product => productAvailability(product) !== "out");

    const featured = selectedProducts
      .filter(product =>
        product.condition !== "Preloved" &&
        product.brand !== "PRELOVED"
      )
      .sort(sortCuratedHomeProducts)
      .slice(0, 5);

    const preloved = selectedProducts
      .filter(product =>
        product.condition === "Preloved" ||
        product.brand === "PRELOVED"
      )
      .sort(sortCuratedHomeProducts)
      .slice(0, 5);

    if (elements.featuredGrid) {
      elements.featuredGrid.innerHTML = featured.length
        ? featured.map(renderProductCard).join("")
        : '<div class="section-empty-note">Belum ada Featured Product yang dipilih di Google Sheets.</div>';
    }

    if (elements.prelovedGrid) {
      elements.prelovedGrid.innerHTML = preloved.length
        ? preloved.map(renderProductCard).join("")
        : '<div class="section-empty-note">Belum ada produk Preloved yang dipilih di Google Sheets.</div>';
    }
  }

  function matchesSearch(product, query) {
    if (!query) return true;
    const haystack = [
      product.name,
      product.brand,
      product.category,
      product.segment,
      product.condition,
      ...product.colors,
      ...product.sizes,
      ...product.variants.flatMap(v => [v.sku, v.originalName, v.color, v.size])
    ].join(" ");
    return normalize(haystack).includes(query);
  }

  function applyFilters() {
    const query = normalize(state.query);
    let filtered = products.filter(product => {
      if (!matchesSearch(product, query)) return false;
      if (state.brand && product.brand !== state.brand) return false;
      if (state.category && product.category !== state.category) return false;
      if (
        state.mainCategory &&
        !productMatchesMainCategory(product, state.mainCategory)
      ) return false;
      if (state.segment && product.segment !== state.segment) return false;
      if (state.condition && product.condition !== state.condition) return false;
      if (state.availability && productAvailability(product) !== state.availability) return false;
      if (state.sale && !isPromoActive(product)) return false;
      return true;
    });

    filtered.sort((a, b) => {
      switch (state.sort) {
        case "name-asc": return a.name.localeCompare(b.name, "id");
        case "price-asc": return discountedPrice(a.priceMin, a) - discountedPrice(b.priceMin, b);
        case "price-desc": return discountedPrice(b.priceMax, b) - discountedPrice(a.priceMax, a);
        case "stock-desc": return b.totalStock - a.totalStock;
        default:
          return Number(Boolean(b.images?.find(Boolean))) - Number(Boolean(a.images?.find(Boolean)))
            || Number(b.isFeatured) - Number(a.isFeatured)
            || Number(b.isNew) - Number(a.isNew)
            || Number(productAvailability(a) === "out") - Number(productAvailability(b) === "out")
            || a.brandCode - b.brandCode
            || a.name.localeCompare(b.name, "id");
      }
    });

    state.filtered = filtered;
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.perPage));
    state.page = Math.min(state.page, totalPages);
    updateActiveFilterCount();
    updateSaleView();
    renderProducts();
    renderPagination();
    syncCatalogUrl();
  }

  function updateActiveFilterCount() {
    const count = [
      state.brand,
      state.category,
      state.mainCategory,
      state.segment,
      state.condition,
      state.availability,
      state.sale
    ].filter(Boolean).length;
    if (!elements.activeFilterCount) return;
    elements.activeFilterCount.textContent = count;
    elements.activeFilterCount.classList.toggle("visible", count > 0);
  }

  function renderProducts() {
    if (!elements.productGrid || !elements.resultCount || !elements.emptyState) return;
    elements.resultCount.textContent = state.filtered.length.toLocaleString("id-ID");
    const start = (state.page - 1) * state.perPage;
    const pageItems = state.filtered.slice(start, start + state.perPage);
    elements.productGrid.classList.toggle("hidden", !pageItems.length);
    elements.emptyState.classList.toggle("hidden", Boolean(pageItems.length));
    elements.productGrid.innerHTML = pageItems.map(renderProductCard).join("");
  }

  function renderPagination() {
    if (!elements.paginationWrap || !elements.pageNumbers || !elements.prevPageBtn || !elements.nextPageBtn) return;
    const totalPages = Math.ceil(state.filtered.length / state.perPage);
    elements.paginationWrap.classList.toggle("hidden", totalPages <= 1);
    if (totalPages <= 1) return;
    elements.prevPageBtn.disabled = state.page === 1;
    elements.nextPageBtn.disabled = state.page === totalPages;
    const visiblePages = [];
    const start = Math.max(1, state.page - 2);
    const end = Math.min(totalPages, state.page + 2);
    for (let page = start; page <= end; page++) visiblePages.push(page);
    elements.pageNumbers.innerHTML = visiblePages.map(page => `
      <button class="page-number ${page === state.page ? "active" : ""}" type="button" data-page="${page}" aria-label="Halaman ${page}">${page}</button>
    `).join("");
  }

  function setPage(page) {
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.perPage));
    state.page = Math.min(Math.max(1, page), totalPages);
    renderProducts();
    renderPagination();
    $("#katalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function findProduct(id) {
    return products.find(product => product.id === id);
  }

  function availableVariants(product) {
    return product.variants
      .filter(v => v.status === "Aktif")
      .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || (a.color || "").localeCompare(b.color || "", "id") || (a.size || "").localeCompare(b.size || "", "id"));
  }


  function detailLines(value) {
    if (Array.isArray(value)) {
      return value
        .map(item => String(item || "").trim())
        .filter(Boolean);
    }

    return String(value || "")
      .split(/\r?\n|[;•]+/)
      .map(item => item.replace(/^[-✓✔*]+\s*/, "").trim())
      .filter(Boolean);
  }

  function descriptionParagraphs(value) {
    return detailLines(value)
      .map(paragraph => `<p>${escapeHtml(paragraph)}</p>`)
      .join("");
  }

  function sizeDetailsMarkup(product) {
    const lines = detailLines(product.sizeDetails);

    if (!lines.length && Array.isArray(product.sizes) && product.sizes.length) {
      return `<div class="product-detail-value">${escapeHtml(product.sizes.join(", "))}</div>`;
    }

    return lines.map(line => {
      const separator = line.indexOf(":");

      if (separator > 0) {
        const label = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim();
        return `
          <div class="product-size-row">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value || "-")}</strong>
          </div>`;
      }

      return `<div class="product-size-row product-size-row-full"><strong>${escapeHtml(line)}</strong></div>`;
    }).join("");
  }

  function checklistMarkup(items, type) {
    const values = detailLines(items);
    if (!values.length) return "";

    return `
      <ul class="product-detail-list product-detail-list-${type}">
        ${values.map(item => `
          <li>
            <span class="product-detail-list-icon" aria-hidden="true">✓</span>
            <span>${escapeHtml(item)}</span>
          </li>`).join("")}
      </ul>`;
  }

  function renderProductDetailSections(product) {
    const description = String(product.description || "").trim();
    const material = String(product.material || "").trim();
    const hasSize = detailLines(product.sizeDetails).length > 0 ||
      (Array.isArray(product.sizes) && product.sizes.length > 0);
    const highlights = detailLines(product.highlights);
    const care = detailLines(product.careInstructions);

    const aboutSection = description
      ? `
        <section class="product-detail-section product-about-section">
          <h3>Tentang Produk</h3>
          <div class="product-about-copy">${descriptionParagraphs(description)}</div>
        </section>`
      : "";

    const specificationSection = material || hasSize
      ? `
        <section class="product-detail-section">
          <h3>Detail Produk</h3>
          <div class="product-detail-grid">
            ${hasSize ? `
              <div class="product-detail-card product-size-card">
                <h4>Ukuran</h4>
                <div class="product-size-list">${sizeDetailsMarkup(product)}</div>
              </div>` : ""}
            ${material ? `
              <div class="product-detail-card">
                <h4>Bahan</h4>
                <div class="product-detail-value">${escapeHtml(material)}</div>
              </div>` : ""}
          </div>
        </section>`
      : "";

    const highlightsSection = highlights.length
      ? `
        <section class="product-detail-section">
          <h3>Keunggulan</h3>
          ${checklistMarkup(highlights, "highlight")}
        </section>`
      : "";

    const careSection = care.length
      ? `
        <section class="product-detail-section">
          <h3>Perawatan</h3>
          ${checklistMarkup(care, "care")}
        </section>`
      : "";

    if (!aboutSection && !specificationSection && !highlightsSection && !careSection) {
      return "";
    }

    return `
      <div class="product-detail-content">
        ${aboutSection}
        ${specificationSection}
        ${highlightsSection}
        ${careSection}
      </div>`;
  }

  function openProduct(product, updateUrl = true) {
    if (!product) return;
    const variants = availableVariants(product);
    const defaultVariant = variants.find(v => v.stock > 0) || variants[0];
    const availability = productAvailability(product);

    elements.modalContent.innerHTML = `
      <article class="modal-product">
        <div class="modal-gallery">
          <div class="modal-product-badges">${productBadges(product)}</div>
          <div class="modal-main-image" id="modalMainMedia">${renderModalMainMedia(productMediaItems(product)[0], product)}</div>
          ${renderModalMediaStrip(product, productMediaItems(product))}
        </div>
        <div class="modal-info">
          <p class="product-brand">${escapeHtml(product.brand)}</p>
          <h2 id="modalProductName">${escapeHtml(product.name)}</h2>
          <div class="modal-price${isPromoActive(product) ? " has-promo" : ""}" id="modalPrice">${defaultVariant ? variantPriceMarkup(product, defaultVariant) : productPriceMarkup(product)}</div>
          <div id="detailStockBadge" class="detail-stock-badge" hidden>
            Stok menipis
          </div>
          <label class="variant-label" for="variantSelect">Pilih warna dan ukuran</label>
          <select class="variant-select" id="variantSelect">
            ${variants.map(variant => `
              <option value="${escapeHtml(variant.sku)}" ${variant === defaultVariant ? "selected" : ""} ${variant.stock <= 0 ? "disabled" : ""}>
                ${escapeHtml(variant.color || "Tanpa warna")} · ${escapeHtml(variant.size || "Tanpa ukuran")} · ${variant.stock > 0 ? stockLabel(variant.stock <= 2 ? "limited" : "available") : "Habis"}
              </option>`).join("")}
          </select>

          <div class="variant-status">
            <span>Kode: <strong id="modalSku">${escapeHtml(defaultVariant?.sku || "-")}</strong></span>
            <span id="modalStock">${defaultVariant ? stockLabel(defaultVariant.stock <= 0 ? "out" : defaultVariant.stock <= 2 ? "limited" : "available") : stockLabel(availability)}</span>
          </div>

          ${renderProductDetailSections(product)}

          <div class="modal-actions">
            <button class="button button-primary" id="modalAddCartBtn" type="button" ${!defaultVariant || defaultVariant.stock <= 0 ? "disabled" : ""}>Tambah ke pilihan</button>
            <a class="button button-wa" id="modalWhatsAppBtn" href="${whatsappProductUrl(product, defaultVariant)}" target="_blank" rel="noopener">Tanya via WhatsApp</a>
            <button class="button button-copy-link" id="modalCopyLinkBtn" type="button" aria-label="Salin link ${escapeHtml(product.name)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a1 1 0 0 1 0-1.4l4.2-4.2a3 3 0 0 1 4.2 4.2l-2.1 2.1a3 3 0 0 1-4.2 0 1 1 0 0 1 1.4-1.4 1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0-1.4-1.4L12 13.4a1 1 0 0 1-1.4 0Zm2.8-2.8a1 1 0 0 1 0 1.4l-4.2 4.2A3 3 0 0 1 5 12l2.1-2.1a3 3 0 0 1 4.2 0 1 1 0 0 1-1.4 1.4 1 1 0 0 0-1.4 0l-2.1 2.1a1 1 0 0 0 1.4 1.4l4.2-4.2a1 1 0 0 1 1.4 0Z"/></svg>
              <span>Salin link produk</span>
            </button>
          </div>
        </div>
      </article>`;

    const variantSelect = $("#variantSelect");
    const addButton = $("#modalAddCartBtn");
    const waButton = $("#modalWhatsAppBtn");
    const copyLinkButton = $("#modalCopyLinkBtn");
    const selectedVariant = () => product.variants.find(v => v.sku === variantSelect.value);
    const mediaItems = productMediaItems(product);
    const modalMainMedia = $("#modalMainMedia");
    const mediaThumbs = [...elements.modalContent.querySelectorAll("[data-media-index]")];

    function setActiveMedia(index) {
      const item = mediaItems[index];
      if (!item || !modalMainMedia) return;
      modalMainMedia.innerHTML = renderModalMainMedia(item, product);
      mediaThumbs.forEach((thumb, thumbIndex) => {
        const active = thumbIndex === index;
        thumb.classList.toggle("is-active", active);
        thumb.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    mediaThumbs.forEach(thumb => {
      thumb.addEventListener("click", () => {
        setActiveMedia(Number(thumb.dataset.mediaIndex || 0));
      });
    });

    updateDetailStockBadge(defaultVariant);

    variantSelect?.addEventListener("change", () => {
      const variant = selectedVariant();
      updateDetailStockBadge(variant);
      if (!variant) return;
      $("#modalPrice").innerHTML = variantPriceMarkup(product, variant);
      $("#modalSku").textContent = variant.sku;
      $("#modalStock").textContent = stockLabel(variant.stock <= 0 ? "out" : variant.stock <= 2 ? "limited" : "available");
      addButton.disabled = variant.stock <= 0;
      waButton.href = whatsappProductUrl(product, variant);
    });

    addButton?.addEventListener("click", () => {
      const variant = selectedVariant();
      if (variant) addToCart(product, variant);
    });

    copyLinkButton?.addEventListener("click", () => copyProductLink(product, copyLinkButton));

    elements.modal.classList.add("open");
    elements.modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");

    // Keep a clean, crawlable product URL in the address bar.
    // The matching static /produk/<slug>/ page contains the product-specific Open Graph metadata.
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.pathname.startsWith(PRODUCT_PATH_PREFIX)) {
      modalReturnUrl = urlWithoutProduct(currentUrl);
    }
    history.replaceState({}, "", productSharePath(product));
  }

  function closeProduct() {
    elements.modal.classList.remove("open");
    elements.modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");

    const fallbackUrl = IS_CATALOG_PAGE ? "/katalog.html#katalog" : "/";
    history.replaceState({}, "", modalReturnUrl || fallbackUrl);
    modalReturnUrl = null;
  }

  function loadCart() {
    try {
      const raw = localStorage.getItem("midori-cart-v3");
      const saved = raw ? JSON.parse(raw) : [];
      return saved.map(item => {
        const product = products.find(productItem => productItem.id === item.productId);
        const variant = product?.variants.find(variantItem => variantItem.sku === item.sku);
        if (!product || !variant) return item;
        return {
          ...item,
          originalPrice: variant.price,
          price: discountedPrice(variant.price, product),
          discountPercent: isPromoActive(product) ? promoPercent(product) : 0,
          promoLabel: isPromoActive(product) ? (product.promoLabel || "Promo") : ""
        };
      });
    } catch {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem("midori-cart-v3", JSON.stringify(state.cart));
    renderCart();
  }

  function addToCart(product, variant) {
    if (!variant || variant.stock <= 0) {
      showToast("Varian ini sedang habis.");
      return;
    }
    const existing = state.cart.find(item => item.sku === variant.sku);
    if (existing) {
      showToast("Produk ini sudah ada di daftar pilihan.");
      return;
    }
    state.cart.push({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      image: firstProductImage(product),
      placeholder: productInitials(product),
      placeholderClass: placeholderClass(product),
      sku: variant.sku,
      color: variant.color,
      size: variant.size,
      originalPrice: variant.price,
      price: discountedPrice(variant.price, product),
      discountPercent: isPromoActive(product) ? promoPercent(product) : 0,
      promoLabel: isPromoActive(product) ? (product.promoLabel || "Promo") : ""
    });
    saveCart();
    showToast("Produk ditambahkan ke daftar pilihan.");
  }

  function removeFromCart(sku) {
    state.cart = state.cart.filter(item => item.sku !== sku);
    saveCart();
  }

  function renderCart() {
    elements.cartCount.textContent = state.cart.length;
    elements.cartCount.style.display = state.cart.length ? "grid" : "none";
    elements.cartEmpty.classList.toggle("hidden", state.cart.length > 0);
    elements.cartItems.classList.toggle("hidden", state.cart.length === 0);
    elements.sendCartBtn.disabled = state.cart.length === 0;
    elements.clearCartBtn.disabled = state.cart.length === 0;

    elements.cartItems.innerHTML = state.cart.map(item => `
      <article class="cart-item">
        <div class="cart-thumb">
          ${item.image
            ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="product-placeholder ${escapeHtml(item.placeholderClass)}" hidden><span><strong>${escapeHtml(item.placeholder)}</strong><small>${escapeHtml(item.brand)}</small></span></div>`
            : `<div class="product-placeholder ${escapeHtml(item.placeholderClass)}"><span><strong>${escapeHtml(item.placeholder)}</strong><small>${escapeHtml(item.brand)}</small></span></div>`}
        </div>
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.brand)}</p>
          <p>${escapeHtml(item.color || "Tanpa warna")} · ${escapeHtml(item.size || "Tanpa ukuran")}</p>
          <p>SKU ${escapeHtml(item.sku)}</p>
          <div class="cart-item-price${item.discountPercent ? " has-promo" : ""}">${item.discountPercent && item.originalPrice ? `<span class="original-price">${formatCurrency(item.originalPrice)}</span><span class="discounted-price">${formatCurrency(item.price)}</span>` : `<span class="current-price">${formatCurrency(item.price)}</span>`}</div>
        </div>
        <button class="remove-cart-item" type="button" data-remove-sku="${escapeHtml(item.sku)}" aria-label="Hapus ${escapeHtml(item.name)}">×</button>
      </article>`).join("");

    const total = state.cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
    elements.cartTotal.textContent = formatCurrency(total);
  }

  function openCart() {
    renderCart();
    elements.cartDrawer.classList.add("open");
    elements.cartDrawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }

  function closeCart() {
    elements.cartDrawer.classList.remove("open");
    elements.cartDrawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  }

  function sendCartToWhatsApp() {
    if (!state.cart.length) return;
    const lines = state.cart.map((item, index) =>
      `${index + 1}. ${item.name}\n   Brand: ${item.brand}\n   Kode: ${item.sku}\n   Warna/Motif: ${item.color || "-"}\n   Ukuran: ${item.size || "-"}\n   ${item.discountPercent && item.originalPrice ? `Harga normal: ${formatCurrency(item.originalPrice)}\n   Harga promo: ${formatCurrency(item.price)} (-${item.discountPercent}%)` : `Harga: ${formatCurrency(item.price)}`}`
    );
    const total = state.cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const message = `Halo mi.do.ri, saya ingin menanyakan ketersediaan produk berikut:\n\n${lines.join("\n\n")}\n\nPerkiraan total: ${formatCurrency(total)}\n\nMohon konfirmasi stok dan cara pemesanannya. Terima kasih.`;
    window.open(`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  }

  function resetFilters() {
    Object.assign(state, {
      query: "", brand: "", category: "", mainCategory: "",
      segment: "", condition: "", availability: "", sale: false,
      sort: "recommended", page: 1
    });

    if (elements.searchInput) elements.searchInput.value = "";
    if (elements.brandFilter) elements.brandFilter.value = "";
    if (elements.categoryFilter) elements.categoryFilter.value = "";
    if (elements.segmentFilter) elements.segmentFilter.value = "";
    if (elements.conditionFilter) elements.conditionFilter.value = "";
    if (elements.availabilityFilter) elements.availabilityFilter.value = "";
    if (elements.sortSelect) elements.sortSelect.value = "recommended";

    applyFilters();
  }

  function handleProductAction(event) {
    const detailButton = event.target.closest("[data-open-product]");
    if (detailButton) {
      openProduct(findProduct(detailButton.dataset.openProduct));
      return;
    }
    const quickAdd = event.target.closest("[data-quick-add]");
    if (quickAdd) {
      const product = findProduct(quickAdd.dataset.quickAdd);
      const variant = product?.variants.find(v => v.stock > 0 && v.status === "Aktif");
      if (product && variant) addToCart(product, variant);
      else showToast("Produk ini sedang habis.");
    }
  }

  function bindEvents() {
    elements.navToggle?.addEventListener("click", () => {
      const open = elements.mainNav.classList.toggle("open");
      elements.navToggle.setAttribute("aria-expanded", String(open));

      if (!open) {
        elements.categoryNavDropdown?.classList.remove("open");
        elements.categoryNavToggle?.setAttribute("aria-expanded", "false");
        elements.brandNavDropdown?.classList.remove("open");
        elements.brandNavToggle?.setAttribute("aria-expanded", "false");
      }
    });

    elements.categoryNavToggle?.addEventListener("click", event => {
      event.stopPropagation();
      elements.brandNavDropdown?.classList.remove("open");
      elements.brandNavToggle?.setAttribute("aria-expanded", "false");
      const open = elements.categoryNavDropdown.classList.toggle("open");
      elements.categoryNavToggle.setAttribute("aria-expanded", String(open));
    });

    elements.brandNavToggle?.addEventListener("click", event => {
      event.stopPropagation();
      elements.categoryNavDropdown?.classList.remove("open");
      elements.categoryNavToggle?.setAttribute("aria-expanded", "false");
      const open = elements.brandNavDropdown.classList.toggle("open");
      elements.brandNavToggle.setAttribute("aria-expanded", String(open));
    });

    $$("#mainNav a").forEach(link => link.addEventListener("click", () => {
      elements.mainNav.classList.remove("open");
      elements.navToggle?.setAttribute("aria-expanded", "false");
      elements.categoryNavDropdown?.classList.remove("open");
      elements.categoryNavToggle?.setAttribute("aria-expanded", "false");
      elements.brandNavDropdown?.classList.remove("open");
      elements.brandNavToggle?.setAttribute("aria-expanded", "false");
    }));

    let searchTimer;
    elements.searchInput?.addEventListener("input", event => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.query = event.target.value;
        state.page = 1;
        applyFilters();
      }, 180);
    });

    [
      [elements.brandFilter, "brand"],
      [elements.categoryFilter, "category"],
      [elements.segmentFilter, "segment"],
      [elements.conditionFilter, "condition"],
      [elements.availabilityFilter, "availability"],
      [elements.sortSelect, "sort"]
    ].forEach(([element, key]) => {
      element?.addEventListener("change", event => {
        state[key] = event.target.value;

        if (key === "category") {
          state.mainCategory = "";
        }

        state.page = 1;
        applyFilters();
      });
    });

    elements.resetFiltersBtn?.addEventListener("click", resetFilters);
    elements.emptyResetBtn?.addEventListener("click", resetFilters);
    elements.clearSaleFilter?.addEventListener("click", () => {
      state.sale = false;
      state.page = 1;
      applyFilters();
    });

    document.addEventListener("click", event => {
      if (
        elements.categoryNavDropdown &&
        !elements.categoryNavDropdown.contains(event.target)
      ) {
        elements.categoryNavDropdown.classList.remove("open");
        elements.categoryNavToggle?.setAttribute("aria-expanded", "false");
      }

      if (
        elements.brandNavDropdown &&
        !elements.brandNavDropdown.contains(event.target)
      ) {
        elements.brandNavDropdown.classList.remove("open");
        elements.brandNavToggle?.setAttribute("aria-expanded", "false");
      }

      if (event.target.closest("[data-product-grid]")) handleProductAction(event);

      const mainCategory = event.target.closest("[data-main-category]");
      if (mainCategory) {
        setMainCategoryFilter(mainCategory.dataset.mainCategory);
      }

      const category = event.target.closest("[data-category]");
      if (category) {
        setCatalogFilter("category", category.dataset.category);
      }

      const brand = event.target.closest("[data-brand]");
      if (brand) setCatalogFilter("brand", brand.dataset.brand);

      const condition = event.target.closest("[data-condition]");
      if (condition) {
        event.preventDefault();
        setCatalogFilter("condition", condition.dataset.condition);
      }
    });

    elements.prevPageBtn?.addEventListener("click", () => setPage(state.page - 1));
    elements.nextPageBtn?.addEventListener("click", () => setPage(state.page + 1));
    elements.pageNumbers?.addEventListener("click", event => {
      const button = event.target.closest("[data-page]");
      if (button) setPage(Number(button.dataset.page));
    });

    $$('[data-close-modal]').forEach(button => button.addEventListener("click", closeProduct));
    elements.openCartBtn?.addEventListener("click", openCart);
    elements.promoOpenCartBtn?.addEventListener("click", openCart);
    $$('[data-close-cart]').forEach(button => button.addEventListener("click", closeCart));

    elements.cartItems?.addEventListener("click", event => {
      const removeButton = event.target.closest("[data-remove-sku]");
      if (removeButton) removeFromCart(removeButton.dataset.removeSku);
    });

    elements.sendCartBtn?.addEventListener("click", sendCartToWhatsApp);
    elements.clearCartBtn?.addEventListener("click", () => {
      if (!state.cart.length) return;
      state.cart = [];
      saveCart();
      showToast("Daftar pilihan dikosongkan.");
    });

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;

      elements.categoryNavDropdown?.classList.remove("open");
      elements.categoryNavToggle?.setAttribute("aria-expanded", "false");
      elements.brandNavDropdown?.classList.remove("open");
      elements.brandNavToggle?.setAttribute("aria-expanded", "false");

      if (elements.modal.classList.contains("open")) closeProduct();
      if (elements.cartDrawer.classList.contains("open")) closeCart();
    });
  }

  function openProductFromUrl() {
    const slug = new URL(window.location.href).searchParams.get("produk");
    if (!slug) return;
    const product = products.find(item => item.slug === slug);
    if (product) setTimeout(() => openProduct(product, false), 50);
  }

  try {
    setupFilters();
    applyUrlFilters();
    renderBrandNavigation();
    renderSummary();
    renderHero();
    renderCategories();
    renderCuratedSections();
    bindEvents();
    renderCart();
    applyFilters();
    openProductFromUrl();
    document.documentElement.dataset.midoriApp = APP_VERSION;
  } catch (error) {
    console.error(`mi.do.ri Webstore ${APP_VERSION} gagal dimuat:`, error);
    const catalogSection = document.querySelector("#katalog .container");
    if (catalogSection) {
      const notice = document.createElement("div");
      notice.className = "app-error-notice";
      notice.innerHTML = `<strong>Katalog gagal dimuat.</strong><span>${escapeHtml(error?.message || "Kesalahan JavaScript")}</span>`;
      catalogSection.prepend(notice);
    }
  }
})();


function updateDetailStockBadge(variant) {
  const badge = document.getElementById("detailStockBadge");
  if (!badge) return;

  const stock = Number(variant?.stock || 0);
  const isLimited = stock > 0 && stock <= 2;

  badge.hidden = !isLimited;
  badge.textContent = "Stok menipis";
}
