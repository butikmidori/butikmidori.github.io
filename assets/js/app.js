(async () => {
  "use strict";

  const APP_VERSION = "4.8.2";
  window.MIDORI_APP_VERSION = APP_VERSION;

  const SITE_ORIGIN = "https://butikmidori.github.io";
  const PRODUCT_PATH_PREFIX = "/produk/";
  let modalReturnUrl = null;
  let modalInteractionController = null;

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
      label: "Luaran",
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
    newOnly: false,
    sort: "recommended",
    page: 1,
    perPage: 24,
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
    searchJump: $(".search-jump"),
    globalSearch: $("#globalSearch"),
    globalSearchInput: $("#globalSearchInput"),
    globalSearchResults: $("#globalSearchResults"),
    globalSearchFooter: $("#globalSearchFooter"),
    globalSearchForm: $("#globalSearchForm"),
    globalSearchViewAll: $("#globalSearchViewAll"),
    brandFilter: $("#brandFilter"),
    categoryFilter: $("#categoryFilter"),
    segmentFilter: $("#segmentFilter"),
    conditionFilter: $("#conditionFilter"),
    availabilityFilter: $("#availabilityFilter"),
    saleFilterChip: $("#saleFilterChip"),
    clearSaleFilter: $("#clearSaleFilter"),
    activeFilterCount: $("#activeFilterCount"),
    activeFilterChips: $("#activeFilterChips"),
    filterToggleBtn: $("#filterToggleBtn"),
    filterCloseBtn: $("#filterCloseBtn"),
    filterDrawer: $("#filterDrawer"),
    filterShowResultsBtn: $("#filterShowResultsBtn"),
    filterResultCount: $("#filterResultCount"),
    searchSuggestions: $("#searchSuggestions"),
    loadMoreBtn: $("#loadMoreBtn"),
    catalogProgress: $("#catalogProgress"),
    catalogIntroProducts: $("#catalogIntroProducts"),
    catalogIntroBrands: $("#catalogIntroBrands"),
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
    editorialEditGrid: $("#editorialEditGrid"),
    freshSection: $("#fresh"),
    freshGrid: $("#freshGrid"),
    brandDiscoveryGrid: $("#brandDiscoveryGrid"),
    continueSection: $("#continueExploring"),
    continueGrid: $("#continueGrid"),
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
    cartFooter: $("#cartFooter"),
    cartSelectionCount: $("#cartSelectionCount"),
    cartFooterMeta: $("#cartFooterMeta"),
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
    heroSliderStatus: $("#heroSliderStatus"),
    heroCopy: $("#heroCopy"),
    heroKickerText: $("#heroKickerText"),
    heroTitle: $("#heroTitle"),
    heroDescription: $("#heroDescription"),
    heroPrimaryLink: $("#heroPrimaryLink"),
    heroMediaLink: $("#heroMediaLink"),
    heroMediaLinkLabel: $("#heroMediaLinkLabel"),
    statBrandsHero: $("#statBrandsHero"),
    statProductsHero: $("#statProductsHero")
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

  function renderModalMainMedia(item, product, playVideo = false) {
    if (!item) return imageMarkup(product, "modal-main-media-image");

    if (item.type === "image") {
      const placeholder = `<div class="product-placeholder ${placeholderClass(product)} modal-main-media-image" hidden><span><strong>${escapeHtml(productInitials(product))}</strong><small>${escapeHtml(product.brand)}</small></span></div>`;
      return `<img class="modal-main-media-image" src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt || product.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">${placeholder}`;
    }

    if (!playVideo && item.type === "video") {
      const poster = firstProductImage(product);
      const providerLabel = item.provider === "youtube" ? "YouTube" : item.provider === "direct" ? "Video produk" : "Video eksternal";
      const posterVisual = poster
        ? `<img class="modal-video-poster-image" src="${escapeHtml(poster)}" alt="${escapeHtml(product.name)} — pratinjau video" loading="lazy">`
        : `<div class="modal-video-poster-placeholder ${placeholderClass(product)}"><strong>${escapeHtml(productInitials(product))}</strong><small>${escapeHtml(product.brand)}</small></div>`;
      const playControl = item.provider === "link"
        ? `<a class="modal-video-play" href="${escapeHtml(item.url)}" target="_blank" rel="noopener"><span class="modal-video-play-icon" aria-hidden="true">▶</span><span><strong>Tonton video produk</strong><small>${providerLabel}</small></span></a>`
        : `<button class="modal-video-play" type="button" data-play-video><span class="modal-video-play-icon" aria-hidden="true">▶</span><span><strong>Tonton video produk</strong><small>${providerLabel}</small></span></button>`;
      return `
        <div class="modal-video-poster">
          ${posterVisual}
          <span class="modal-video-poster-shade" aria-hidden="true"></span>
          ${playControl}
          <a class="modal-video-external" href="${escapeHtml(item.url)}" target="_blank" rel="noopener" aria-label="Buka video di tab baru">Buka ↗</a>
        </div>`;
    }

    if (item.provider === "youtube") {
      const separator = item.embedUrl.includes("?") ? "&" : "?";
      return `
        <div class="modal-main-media-video-wrap">
          <iframe class="modal-main-media-embed" src="${escapeHtml(item.embedUrl + separator + 'autoplay=1')}" title="${escapeHtml(product.name)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </div>
        <div class="modal-media-caption"><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Buka video ↗</a></div>`;
    }

    if (item.provider === "direct") {
      return `
        <div class="modal-main-media-video-wrap">
          <video class="modal-main-media-video" src="${escapeHtml(item.embedUrl)}" controls autoplay playsinline preload="metadata"></video>
        </div>
        <div class="modal-media-caption"><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Buka video ↗</a></div>`;
    }

    return `
      <div class="modal-media-link-fallback">
        <div class="modal-media-link-icon" aria-hidden="true">▶</div>
        <h3>Video produk</h3>
        <p>Video produk tersedia melalui sumber eksternal.</p>
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Tonton video ↗</a>
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
    const variantBits = chosen
      ? [chosen.color && chosen.color !== "Tanpa warna" ? chosen.color : "", chosen.size && chosen.size !== "Tanpa ukuran" ? `Ukuran ${chosen.size}` : ""].filter(Boolean)
      : [];
    const currentPrice = chosen ? discountedPrice(Number(chosen.price || 0), product) : Number(product.priceMin || 0);
    const isLimited = chosen ? Number(chosen.stock || 0) > 0 && Number(chosen.stock || 0) <= 2 : productAvailability(product) === "limited";
    const isPreloved = String(product.condition || "").toLowerCase() === "preloved";
    const intro = isPreloved
      ? `Halo mi.do.ri 👋\nSaya tertarik dengan produk Preloved ini:`
      : `Halo mi.do.ri 👋\nSaya tertarik dengan produk ini:`;
    const contextQuestion = isPreloved
      ? "Boleh dibantu cek kondisi dan ketersediaannya?"
      : isLimited
        ? "Boleh dibantu cek apakah varian ini masih tersedia?"
        : "Boleh dibantu cek stoknya?";
    const variantLine = variantBits.length ? `\n${variantBits.join(" · ")}` : "";
    const codeLine = chosen?.sku ? `\nKode: ${chosen.sku}` : "";
    const message = `${intro}\n\n${product.name} — ${product.brand}${variantLine}\n${formatCurrency(currentPrice)}${codeLine}\n\n${contextQuestion}\n\nLink produk:\n${productUrl(product)}`;
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

    const newQuickFilter = document.querySelector('[data-quick-filter="new"]');
    if (newQuickFilter) newQuickFilter.hidden = !products.some(product => product.isNew === true);
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
      `<a role="menuitem" class="nav-brand-all${allActive ? " is-active" : ""}" href="katalog.html#katalog"${allActive ? ' aria-current="page"' : ""}>Semua brand <span aria-hidden="true">↗</span></a>`,
      ...activeBrands.map(brand => {
        const active = normalize(state.brand) === normalize(brand);
        return `<a role="menuitem" data-brand-nav-item data-brand-search="${escapeHtml(normalize(brand))}" class="${active ? "is-active" : ""}" href="katalog.html?brand=${encodeURIComponent(brand)}#katalog"${active ? ' aria-current="page"' : ""}>${escapeHtml(brand)}</a>`;
      })
    ];

    elements.brandNavMenu.innerHTML = `
      <div class="nav-brand-search-shell">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m20 20-4.2-4.2"></path></svg>
        <input type="search" inputmode="search" autocomplete="off" data-brand-nav-search aria-label="Cari brand" placeholder="Cari brand...">
      </div>
      <div class="nav-brand-links">${links.join("")}</div>
      <p class="nav-brand-empty" data-brand-nav-empty hidden>Brand tidak ditemukan.</p>`;
  }

  function filterBrandNavigation(query) {
    if (!elements.brandNavMenu) return;
    const term = normalize(query || "");
    const items = [...elements.brandNavMenu.querySelectorAll("[data-brand-nav-item]")];
    let visible = 0;
    items.forEach(item => {
      const match = !term || String(item.dataset.brandSearch || "").includes(term);
      item.hidden = !match;
      if (match) visible += 1;
    });
    const empty = elements.brandNavMenu.querySelector("[data-brand-nav-empty]");
    if (empty) empty.hidden = visible > 0 || !term;
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
    state.newOnly = params.get("baru") === "1";
    state.sort = params.get("urut") || "recommended";

    if (elements.searchInput) elements.searchInput.value = state.query;
    if (elements.brandFilter) elements.brandFilter.value = state.brand;
    if (elements.categoryFilter) elements.categoryFilter.value = state.category;
    if (elements.conditionFilter) elements.conditionFilter.value = state.condition;
    if (elements.segmentFilter) elements.segmentFilter.value = state.segment;
    if (elements.availabilityFilter) elements.availabilityFilter.value = state.availability;
    if (elements.sortSelect) elements.sortSelect.value = state.sort;
    updateCatalogContext();
  }

  function updateCatalogContext() {
    if (!IS_CATALOG_PAGE) return;

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

    const mainGroup = state.mainCategory ? getMainCategoryGroup(state.mainCategory) : null;
    let eyebrow = "Katalog lengkap";
    let title = "Seluruh koleksi mi.do.ri";
    let description = "Semua produk aktif dari brand pilihan mi.do.ri.";

    if (state.query) {
      eyebrow = "Hasil pencarian";
      title = `Hasil untuk “${state.query}”`;
      description = `${state.filtered.length.toLocaleString("id-ID")} produk yang paling sesuai dengan pencarianmu.`;
    } else if (state.brand) {
      eyebrow = "Pilihan brand";
      title = state.brand;
      description = `${state.filtered.length.toLocaleString("id-ID")} produk dari ${state.brand} tersedia di mi.do.ri.`;
    } else if (state.condition === "Preloved") {
      eyebrow = "Second Chapter";
      title = "Preloved untuk cerita berikutnya.";
      description = `${state.filtered.length.toLocaleString("id-ID")} produk Preloved siap melanjutkan cerita berikutnya.`;
    } else if (state.sale) {
      eyebrow = "Promo saat ini";
      title = "Pilihan SALE";
      description = `${state.filtered.length.toLocaleString("id-ID")} produk dengan promo yang sedang aktif.`;
    } else if (state.newOnly) {
      eyebrow = "Koleksi terbaru";
      title = "Baru di mi.do.ri";
      description = `${state.filtered.length.toLocaleString("id-ID")} produk terbaru di mi.do.ri.`;
    } else if (mainGroup) {
      eyebrow = "Pilihan kategori";
      title = `Pilihan ${mainGroup.label}`;
      description = `${state.filtered.length.toLocaleString("id-ID")} produk dalam pilihan ${mainGroup.label}.`;
    } else if (state.category) {
      eyebrow = "Pilihan kategori";
      title = `Pilihan ${state.category}`;
      description = `${state.filtered.length.toLocaleString("id-ID")} produk dalam kategori ${state.category}.`;
    } else if (state.segment) {
      eyebrow = "Untukmu";
      title = state.segment === "Anak" ? "Pilihan untuk Si Kecil" : "Pilihan Dewasa";
      description = `${state.filtered.length.toLocaleString("id-ID")} produk untuk segmen ${state.segment.toLowerCase()}.`;
    }

    if (elements.catalogEyebrow) elements.catalogEyebrow.textContent = eyebrow;
    if (elements.catalogTitle) elements.catalogTitle.textContent = title;
    if (elements.catalogDescription) elements.catalogDescription.textContent = description;

    document.querySelectorAll("[data-quick-filter]").forEach(button => {
      const type = button.dataset.quickFilter;
      const active =
        (type === "new" && state.newOnly) ||
        (type === "sale" && state.sale) ||
        (type === "preloved" && state.condition === "Preloved") ||
        (type === "available" && state.availability === "available");
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function syncCatalogUrl() {
    if (!IS_CATALOG_PAGE) return;

    const url = new URL(window.location.href);
    const productSlug = url.searchParams.get("produk");

    [
      "q", "brand", "kategori", "kelompok", "kondisi",
      "ukuran", "segmen", "stok", "sale", "baru", "urut"
    ].forEach(key => url.searchParams.delete(key));

    if (state.query) url.searchParams.set("q", state.query);
    if (state.brand) url.searchParams.set("brand", state.brand);
    if (state.category) url.searchParams.set("kategori", state.category);
    if (state.mainCategory) url.searchParams.set("kelompok", state.mainCategory);
    if (state.condition) url.searchParams.set("kondisi", state.condition);
    if (state.segment) url.searchParams.set("segmen", state.segment);
    if (state.availability) url.searchParams.set("stok", state.availability);
    if (state.sale) url.searchParams.set("sale", "1");
    if (state.newOnly) url.searchParams.set("baru", "1");
    if (state.sort && state.sort !== "recommended") {
      url.searchParams.set("urut", state.sort);
    }

    if (productSlug) url.searchParams.set("produk", productSlug);

    history.replaceState({}, "", url);
  }

  function renderSummary() {
    const values = {
      statProducts: catalog.summary.products.toLocaleString("id-ID"),
      statBrands: catalog.summary.brands.toLocaleString("id-ID"),
      statProductsHero: catalog.summary.products.toLocaleString("id-ID"),
      statBrandsHero: catalog.summary.brands.toLocaleString("id-ID"),
      catalogIntroProducts: catalog.summary.products.toLocaleString("id-ID"),
      catalogIntroBrands: catalog.summary.brands.toLocaleString("id-ID")
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

    const updateHeroEditorial = slide => {
      if (!slide) return;
      const kicker = slide.dataset.kicker || "The mi.do.ri Edit";
      const title = slide.dataset.title || "Meet the new you.";
      const copy = slide.dataset.copy || "Fashion muslim pilihan dari berbagai brand.";
      const link = slide.dataset.link || "katalog.html#katalog";
      const linkLabel = slide.dataset.linkLabel || "Lihat pilihan";

      if (elements.heroKickerText) elements.heroKickerText.textContent = kicker;
      if (elements.heroTitle) elements.heroTitle.textContent = title;
      if (elements.heroDescription) elements.heroDescription.textContent = copy;
      if (elements.heroPrimaryLink) {
        elements.heroPrimaryLink.href = link;
        elements.heroPrimaryLink.firstChild.textContent = `${linkLabel} `;
      }
      if (elements.heroMediaLink) elements.heroMediaLink.href = link;
      if (elements.heroMediaLinkLabel) elements.heroMediaLinkLabel.textContent = linkLabel;

      if (elements.heroCopy) {
        elements.heroCopy.classList.remove("is-swapping");
        void elements.heroCopy.offsetWidth;
        elements.heroCopy.classList.add("is-swapping");
      }
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

      updateHeroEditorial(slides[currentIndex]);

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

  function renderProductCard(product, options = {}) {
    const availability = productAvailability(product);
    const isHomeCard = options.home === true;
    const isCatalogCard = IS_CATALOG_PAGE && !isHomeCard;
    const images = productImages(product);
    const secondImage = images[1] || "";
    const info = [
      product.colors.length ? `${product.colors.length} warna` : "",
      product.sizes.length ? product.sizes.slice(0, 3).join(", ") : ""
    ].filter(Boolean).join(" · ");

    return `
      <article class="product-card${isHomeCard ? " product-card-home" : ""}${isCatalogCard ? " product-card-catalog" : ""}" data-open-product="${product.id}" role="link" tabindex="0" aria-label="Buka detail ${escapeHtml(product.name)}">
        <div class="product-image-wrap">
          <button class="product-image-open" type="button" data-open-product="${product.id}" aria-label="Buka detail ${escapeHtml(product.name)}">
            <span class="product-image-stack">
              ${imageMarkup(product, "product-image product-image-primary")}
              ${secondImage ? `<img class="product-image product-image-secondary" src="${escapeHtml(secondImage)}" alt="${escapeHtml(product.name)} — foto 2" loading="lazy" decoding="async">` : ""}
            </span>
          </button>
          <div class="product-badges">${productBadges(product)}</div>
          ${availability === "limited" ? `<span class="badge badge-limited badge-stock-bottom-left">Stok menipis</span>` : ""}
          ${product.condition === "Preloved" ? `<span class="badge badge-preloved badge-preloved-bottom-right">Preloved</span>` : ""}
          <button class="product-favorite" type="button" data-quick-add="${product.id}" aria-label="Tambah ${escapeHtml(product.name)} ke daftar pilihan"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"></path></svg></button>
        </div>
        <div class="product-body">
          <p class="product-brand">${escapeHtml(product.brand)}</p>
          <h3 class="product-title">${escapeHtml(product.name)}</h3>
          ${isCatalogCard ? "" : `<div class="product-rating">● <span>${stockLabel(availability)}</span></div>`}
          <div class="product-price${isPromoActive(product) ? " has-promo" : ""}">${productPriceMarkup(product, true)}</div>
          <p class="product-card-info" title="${escapeHtml(info)}">${escapeHtml(info)}</p>
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

    let featured = selectedProducts
      .filter(product =>
        product.condition !== "Preloved" &&
        product.brand !== "PRELOVED"
      )
      .sort(sortCuratedHomeProducts)
      .slice(0, 4);

    let preloved = selectedProducts
      .filter(product =>
        product.condition === "Preloved" ||
        product.brand === "PRELOVED"
      )
      .sort(sortCuratedHomeProducts)
      .slice(0, 4);

    // Keep the homepage useful when the live source is unavailable or
    // Featured flags have not been curated yet. Explicit Featured choices
    // always win; these are graceful fallbacks only.
    if (!featured.length) {
      featured = selectDiverseProducts(
        products.filter(product => product.condition !== "Preloved" && product.brand !== "PRELOVED"),
        4
      );
    }

    if (!preloved.length) {
      preloved = products
        .filter(product => product.condition === "Preloved" || product.brand === "PRELOVED")
        .filter(product => productAvailability(product) !== "out")
        .sort((a, b) => Number(Boolean(b.images?.find(Boolean))) - Number(Boolean(a.images?.find(Boolean))) || b.totalStock - a.totalStock)
        .slice(0, 4);
    }

    if (elements.featuredGrid) {
      elements.featuredGrid.innerHTML = featured.length
        ? featured.map(product => renderProductCard(product, { home: true })).join("")
        : '<div class="section-empty-note">Belum ada produk pilihan yang ditandai di Google Sheets.</div>';
    }

    if (elements.prelovedGrid) {
      elements.prelovedGrid.innerHTML = preloved.length
        ? preloved.map(product => renderProductCard(product, { home: true })).join("")
        : '<div class="section-empty-note">Belum ada produk Preloved yang dipilih di Google Sheets.</div>';
    }
  }

  function homeProductCandidates(predicate) {
    return products
      .filter(product => productAvailability(product) !== "out")
      .filter(product => product.brand !== "BOX")
      .filter(predicate)
      .sort((a, b) =>
        Number(Boolean(b.images?.find(Boolean))) - Number(Boolean(a.images?.find(Boolean))) ||
        Number(b.isFeatured === true) - Number(a.isFeatured === true) ||
        b.totalStock - a.totalStock ||
        a.name.localeCompare(b.name, "id")
      );
  }

  function representativeProduct(predicate) {
    return homeProductCandidates(predicate).find(product => firstProductImage(product)) || null;
  }

  function renderEditorialEdits() {
    if (!elements.editorialEditGrid) return;

    const edits = [
      {
        kicker: "01 · Padu padan",
        title: "Gampang Dipadu",
        description: "Luaran dan rajut yang tinggal dipadukan dengan yang sudah ada di lemari.",
        href: "katalog.html?kelompok=outerwear#katalog",
        predicate: product => product.condition !== "Preloved" && ["Outer", "Sweater"].includes(product.category)
      },
      {
        kicker: "02 · Momen spesial",
        title: "Buat Hari Spesial",
        description: "Dress dan set buat kondangan, acara keluarga, atau saat ingin tampil sedikit lebih istimewa.",
        href: "katalog.html?kelompok=dress-set#katalog",
        predicate: product => product.condition !== "Preloved" && ["Dress", "Set"].includes(product.category)
      },
      {
        kicker: "03 · Si kecil",
        title: "Buat Si Kecil",
        description: "Dari yang santai sampai yang rapi, pilih yang paling cocok buat mereka.",
        href: "katalog.html?segmen=Anak#katalog",
        predicate: product => product.condition !== "Preloved" && product.segment === "Anak"
      }
    ];

    elements.editorialEditGrid.innerHTML = edits.map((edit, index) => {
      const candidates = homeProductCandidates(edit.predicate);
      const representative = candidates.find(product => firstProductImage(product));
      const image = representative ? firstProductImage(representative) : "";
      const count = candidates.length;

      return `
        <article class="editorial-edit-card editorial-edit-card-${index + 1}" data-reveal-item style="--reveal-delay:${index * 80}ms">
          <a class="editorial-edit-media" href="${escapeHtml(edit.href)}" aria-label="Jelajahi ${escapeHtml(edit.title)}">
            ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(representative.name)}" loading="lazy" decoding="async">` : '<span class="editorial-edit-placeholder"></span>'}
          </a>
          <div class="editorial-edit-copy">
            <span>${escapeHtml(edit.kicker)}</span>
            <h3>${escapeHtml(edit.title)}</h3>
            <p>${escapeHtml(edit.description)}</p>
            <div class="editorial-edit-actions">
              <a href="${escapeHtml(edit.href)}">Jelajahi ${count.toLocaleString("id-ID")} produk <b>↗</b></a>
              ${representative ? `<button type="button" data-open-product="${escapeHtml(representative.id)}">Lihat cepat · ${escapeHtml(representative.name)}</button>` : ""}
            </div>
          </div>
        </article>`;
    }).join("");
  }

  function renderFreshProducts() {
    if (!elements.freshSection || !elements.freshGrid) return;
    const fresh = products
      .filter(product => product.isNew === true)
      .filter(product => product.condition !== "Preloved")
      .filter(product => productAvailability(product) !== "out")
      .sort(sortCuratedHomeProducts)
      .slice(0, 4);

    if (!fresh.length) {
      elements.freshSection.hidden = true;
      return;
    }

    elements.freshGrid.innerHTML = fresh.map(product => renderProductCard(product, { home: true })).join("");
    elements.freshSection.hidden = false;
  }

  function renderBrandDiscovery() {
    if (!elements.brandDiscoveryGrid) return;

    const brandMap = new Map();
    products.forEach(product => {
      if (!product.brand || ["PRELOVED", "BOX"].includes(product.brand)) return;
      if (product.condition === "Preloved" || productAvailability(product) === "out") return;
      if (!brandMap.has(product.brand)) brandMap.set(product.brand, []);
      brandMap.get(product.brand).push(product);
    });

    const brandStories = [...brandMap.entries()]
      .map(([brand, items]) => {
        const representative = items
          .filter(product => firstProductImage(product))
          .sort((a, b) =>
            Number(b.isFeatured === true) - Number(a.isFeatured === true) ||
            b.totalStock - a.totalStock
          )[0];
        return { brand, items, representative };
      })
      .filter(story => story.representative)
      .sort((a, b) => b.items.length - a.items.length || a.brand.localeCompare(b.brand, "id"))
      .slice(0, 4);

    if (!brandStories.length) {
      elements.brandDiscoveryGrid.innerHTML = '<div class="section-empty-note">Jelajah brand akan tampil saat foto produk tersedia.</div>';
      return;
    }

    elements.brandDiscoveryGrid.innerHTML = brandStories.map((story, index) => `
      <a class="brand-discovery-card" href="${catalogUrl({ brand: story.brand })}" data-reveal-item style="--reveal-delay:${index * 70}ms">
        <span class="brand-discovery-index">0${index + 1}</span>
        <div class="brand-discovery-media">
          <img src="${escapeHtml(firstProductImage(story.representative))}" alt="${escapeHtml(story.representative.name)}" loading="lazy" decoding="async">
        </div>
        <div class="brand-discovery-copy">
          <span>${story.items.length.toLocaleString("id-ID")} produk</span>
          <h3>${escapeHtml(story.brand)}</h3>
          <p>Lihat brand <b>↗</b></p>
        </div>
      </a>`).join("");
  }

  const RECENTLY_VIEWED_KEY = "midori-recently-viewed-v1";

  function getRecentlyViewedIds() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (_) {
      return [];
    }
  }

  function rememberRecentlyViewed(product) {
    if (!product?.id) return;
    const ids = getRecentlyViewedIds().filter(id => id !== product.id);
    ids.unshift(product.id);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(ids.slice(0, 8)));
    renderRecentlyViewed();
  }

  function renderRecentlyViewed() {
    if (!elements.continueSection || !elements.continueGrid) return;
    const recent = getRecentlyViewedIds()
      .map(id => findProduct(id))
      .filter(Boolean)
      .filter(product => productAvailability(product) !== "out")
      .slice(0, 4);

    if (!recent.length) {
      elements.continueSection.hidden = true;
      return;
    }

    elements.continueGrid.innerHTML = recent.map(product => renderProductCard(product, { home: true })).join("");
    elements.continueSection.hidden = false;
  }

  function setupRevealMotion() {
    const targets = [...document.querySelectorAll("[data-reveal], [data-reveal-item]")];
    if (!targets.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      targets.forEach(target => target.classList.add("is-revealed"));
      return;
    }

    document.documentElement.classList.add("reveal-ready");
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    targets.forEach(target => observer.observe(target));
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
      if (state.mainCategory && !productMatchesMainCategory(product, state.mainCategory)) return false;
      if (state.segment && product.segment !== state.segment) return false;
      if (state.condition && product.condition !== state.condition) return false;
      if (state.availability && productAvailability(product) !== state.availability) return false;
      if (state.sale && !isPromoActive(product)) return false;
      if (state.newOnly && !product.isNew) return false;
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
    const maxBatch = Math.max(1, Math.ceil(filtered.length / state.perPage));
    state.page = Math.min(state.page, maxBatch);
    updateActiveFilterCount();
    renderActiveFilterChips();
    updateCatalogContext();
    renderProducts();
    renderPagination();
    if (elements.filterResultCount) elements.filterResultCount.textContent = filtered.length.toLocaleString("id-ID");
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
      state.sale,
      state.newOnly
    ].filter(Boolean).length;
    if (!elements.activeFilterCount) return;
    elements.activeFilterCount.textContent = count;
    elements.activeFilterCount.classList.toggle("visible", count > 0);
  }

  function renderActiveFilterChips() {
    if (!elements.activeFilterChips) return;
    const chips = [];
    if (state.query) chips.push(["query", `Search: ${state.query}`]);
    if (state.brand) chips.push(["brand", state.brand]);
    if (state.mainCategory) chips.push(["mainCategory", getMainCategoryGroup(state.mainCategory)?.label || state.mainCategory]);
    if (state.category) chips.push(["category", state.category]);
    if (state.segment) chips.push(["segment", state.segment]);
    if (state.condition) chips.push(["condition", state.condition === "Preloved" ? "Preloved" : state.condition]);
    if (state.availability) chips.push(["availability", stockLabel(state.availability)]);
    if (state.sale) chips.push(["sale", "SALE"]);
    if (state.newOnly) chips.push(["newOnly", "Baru"]);

    elements.activeFilterChips.innerHTML = chips.map(([key, label]) => `
      <button type="button" class="active-filter-chip" data-clear-filter="${key}">
        <span>${escapeHtml(label)}</span><i aria-hidden="true">×</i>
      </button>`).join("");
    elements.activeFilterChips.classList.toggle("has-filters", chips.length > 0);
  }

  function renderProducts() {
    if (!elements.productGrid || !elements.resultCount || !elements.emptyState) return;
    elements.resultCount.textContent = state.filtered.length.toLocaleString("id-ID");
    const visibleCount = Math.min(state.filtered.length, state.page * state.perPage);
    const pageItems = state.filtered.slice(0, visibleCount);
    elements.productGrid.classList.toggle("hidden", !pageItems.length);
    elements.emptyState.classList.toggle("hidden", Boolean(pageItems.length));
    elements.productGrid.innerHTML = pageItems.map(product => renderProductCard(product)).join("");
  }

  function renderPagination() {
    if (!elements.paginationWrap) return;
    const shown = Math.min(state.filtered.length, state.page * state.perPage);
    const total = state.filtered.length;
    if (elements.catalogProgress) {
      elements.catalogProgress.textContent = `Menampilkan ${shown.toLocaleString("id-ID")} dari ${total.toLocaleString("id-ID")} produk`;
    }
    if (elements.loadMoreBtn) {
      const hasMore = shown < total;
      elements.loadMoreBtn.hidden = !hasMore;
      elements.loadMoreBtn.disabled = !hasMore;
    }
    elements.paginationWrap.classList.toggle("hidden", total === 0);
  }

  function loadMoreProducts() {
    if (state.page * state.perPage >= state.filtered.length) return;
    state.page += 1;
    renderProducts();
    renderPagination();
  }

  function openFilters() {
    if (!elements.filterDrawer) return;
    elements.filterDrawer.classList.add("open");
    elements.filterDrawer.setAttribute("aria-hidden", "false");
    elements.filterToggleBtn?.setAttribute("aria-expanded", "true");
    document.body.classList.add("no-scroll");
  }

  function closeFilters() {
    if (!elements.filterDrawer) return;
    elements.filterDrawer.classList.remove("open");
    elements.filterDrawer.setAttribute("aria-hidden", "true");
    elements.filterToggleBtn?.setAttribute("aria-expanded", "false");
    if (!elements.modal?.classList.contains("open") && !elements.cartDrawer?.classList.contains("open")) {
      document.body.classList.remove("no-scroll");
    }
  }

  function toggleQuickFilter(type) {
    if (type === "new") state.newOnly = !state.newOnly;
    if (type === "sale") state.sale = !state.sale;
    if (type === "preloved") state.condition = state.condition === "Preloved" ? "" : "Preloved";
    if (type === "available") state.availability = state.availability === "available" ? "" : "available";

    if (elements.conditionFilter) elements.conditionFilter.value = state.condition;
    if (elements.availabilityFilter) elements.availabilityFilter.value = state.availability;
    state.page = 1;
    applyFilters();
  }

  function clearFilterKey(key) {
    const resetMap = {
      query: () => { state.query = ""; if (elements.searchInput) elements.searchInput.value = ""; },
      brand: () => { state.brand = ""; if (elements.brandFilter) elements.brandFilter.value = ""; },
      mainCategory: () => { state.mainCategory = ""; },
      category: () => { state.category = ""; if (elements.categoryFilter) elements.categoryFilter.value = ""; },
      segment: () => { state.segment = ""; if (elements.segmentFilter) elements.segmentFilter.value = ""; },
      condition: () => { state.condition = ""; if (elements.conditionFilter) elements.conditionFilter.value = ""; },
      availability: () => { state.availability = ""; if (elements.availabilityFilter) elements.availabilityFilter.value = ""; },
      sale: () => { state.sale = false; },
      newOnly: () => { state.newOnly = false; }
    };
    resetMap[key]?.();
    state.page = 1;
    applyFilters();
  }

  function getSearchSuggestionMatches(value, limits = {}) {
    const raw = String(value || "").trim();
    const query = normalize(raw);
    const productLimit = Number(limits.products || 4);
    const brandLimit = Number(limits.brands || 3);
    const categoryLimit = Number(limits.categories || 3);

    if (!query || query.length < 2) {
      return { raw, query, productMatches: [], brandMatches: [], categoryMatches: [] };
    }

    const productMatches = products.filter(product => matchesSearch(product, query)).slice(0, productLimit);
    const brandMatches = [...new Set(products.map(product => product.brand).filter(Boolean))]
      .filter(brand => normalize(brand).includes(query))
      .slice(0, brandLimit);
    const categoryMatches = [...new Set(products.map(product => product.category).filter(Boolean))]
      .filter(category => normalize(category).includes(query))
      .slice(0, categoryLimit);

    return { raw, query, productMatches, brandMatches, categoryMatches };
  }

  function renderSearchSuggestionGroups(matches, mode = "catalog") {
    const groups = [];
    const isGlobal = mode === "global";
    const productAttr = isGlobal ? "data-global-open-product" : "data-open-product";
    const brandAttr = isGlobal ? "data-global-brand" : "data-suggest-brand";
    const categoryAttr = isGlobal ? "data-global-category" : "data-suggest-category";
    const extraClass = isGlobal ? " global-search-suggestion-group" : "";

    if (matches.productMatches.length) {
      groups.push(`<div class="search-suggestion-group${extraClass}"><span>Produk</span>${matches.productMatches.map(product => `
        <button type="button" ${productAttr}="${escapeHtml(product.id)}"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.brand)}</small></button>`).join("")}</div>`);
    }
    if (matches.brandMatches.length) {
      groups.push(`<div class="search-suggestion-group${extraClass}"><span>Brand</span>${matches.brandMatches.map(brand => `
        <button type="button" ${brandAttr}="${escapeHtml(brand)}"><strong>${escapeHtml(brand)}</strong></button>`).join("")}</div>`);
    }
    if (matches.categoryMatches.length) {
      groups.push(`<div class="search-suggestion-group${extraClass}"><span>Kategori</span>${matches.categoryMatches.map(category => `
        <button type="button" ${categoryAttr}="${escapeHtml(category)}"><strong>${escapeHtml(category)}</strong></button>`).join("")}</div>`);
    }

    return groups.join("");
  }

  function renderSearchSuggestions(value) {
    if (!elements.searchSuggestions) return;
    const matches = getSearchSuggestionMatches(value);
    if (!matches.query || matches.query.length < 2) {
      elements.searchSuggestions.hidden = true;
      elements.searchSuggestions.innerHTML = "";
      return;
    }

    const markup = renderSearchSuggestionGroups(matches, "catalog");
    elements.searchSuggestions.innerHTML = markup || `<div class="search-suggestion-empty">Tekan Enter untuk mencari “${escapeHtml(matches.raw)}”</div>`;
    elements.searchSuggestions.hidden = false;
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

  function productDetailSectionMarkup(title, content, extraClass = "") {
    if (!content) return "";
    return `
      <section class="product-detail-section product-detail-accordion ${extraClass}" data-detail-accordion>
        <button class="product-detail-toggle" type="button" aria-expanded="true">
          <span>${escapeHtml(title)}</span>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5"></path></svg>
        </button>
        <div class="product-detail-panel">${content}</div>
      </section>`;
  }

  function renderProductDetailSections(product) {
    const description = String(product.description || "").trim();
    const material = String(product.material || "").trim();
    const hasSize = detailLines(product.sizeDetails).length > 0 ||
      (Array.isArray(product.sizes) && product.sizes.length > 0);
    const highlights = detailLines(product.highlights);
    const care = detailLines(product.careInstructions);

    const aboutSection = description
      ? productDetailSectionMarkup(
          "Tentang Produk",
          `<div class="product-about-copy">${descriptionParagraphs(description)}</div>`,
          "product-about-section"
        )
      : "";

    const specificationContent = material || hasSize
      ? `<div class="product-detail-grid">
          ${material ? `
            <div class="product-detail-card product-material-card">
              <h4>Bahan</h4>
              <div class="product-detail-value">${escapeHtml(material)}</div>
            </div>` : ""}
          ${hasSize ? `
            <div class="product-detail-card product-size-card">
              <h4>Ukuran</h4>
              <div class="product-size-list">${sizeDetailsMarkup(product)}</div>
            </div>` : ""}
        </div>`
      : "";

    const specificationSection = specificationContent
      ? productDetailSectionMarkup("Ukuran & Bahan", specificationContent, "product-specification-section")
      : "";

    const highlightsSection = highlights.length
      ? productDetailSectionMarkup("Keunggulan", checklistMarkup(highlights, "highlight"), "product-highlights-section")
      : "";

    const careSection = care.length
      ? productDetailSectionMarkup("Perawatan", checklistMarkup(care, "care"), "product-care-section")
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

  function productStoryLabel(product) {
    if (product.condition === "Preloved") return "SECOND CHAPTER";
    if (isPromoActive(product)) return "PILIHAN SALE";
    if (product.isNew) return "BARU DATANG";
    if (product.isFeatured) return "PILIHAN";
    return "";
  }

  function variantChoiceLabel(variant) {
    if (!variant) return "Pilih varian";
    return [variant.color || "Tanpa warna", variant.size || "Tanpa ukuran"].join(" · ");
  }

  function variantStateLabel(variant) {
    if (!variant) return "Tidak tersedia";
    if (variant.stock <= 0) return "Habis";
    return stockLabel(variant.stock <= 2 ? "limited" : "available");
  }

  function renderVariantPicker(variants, defaultVariant) {
    const nativeOptions = variants.map(variant => `
      <option value="${escapeHtml(variant.sku)}" ${variant === defaultVariant ? "selected" : ""} ${variant.stock <= 0 ? "disabled" : ""}>
        ${escapeHtml(variantChoiceLabel(variant))} · ${escapeHtml(variantStateLabel(variant))}
      </option>`).join("");

    const customOptions = variants.map(variant => {
      const selected = variant === defaultVariant;
      const disabled = variant.stock <= 0;
      return `
        <button class="variant-picker-option${selected ? " is-selected" : ""}${disabled ? " is-disabled" : ""}" type="button" role="option" data-variant-option="${escapeHtml(variant.sku)}" aria-selected="${selected ? "true" : "false"}" ${disabled ? "disabled" : ""}>
          <span class="variant-picker-option-copy">
            <strong>${escapeHtml(variant.color || "Tanpa warna")}</strong>
            <small>${escapeHtml(variant.size || "Tanpa ukuran")}</small>
          </span>
          <em>${escapeHtml(variantStateLabel(variant))}</em>
        </button>`;
    }).join("");

    return `
      <select class="variant-select variant-select-native" id="variantSelect" tabindex="-1" aria-hidden="true">${nativeOptions}</select>
      <div class="variant-picker" id="variantPicker">
        <button class="variant-picker-trigger" id="variantPickerTrigger" type="button" aria-haspopup="listbox" aria-expanded="false">
          <span class="variant-picker-choice">
            <strong id="variantPickerValue">${escapeHtml(variantChoiceLabel(defaultVariant))}</strong>
            <small id="variantPickerState">${escapeHtml(variantStateLabel(defaultVariant))}</small>
          </span>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5"></path></svg>
        </button>
        <button class="variant-picker-sheet-backdrop" id="variantPickerBackdrop" type="button" aria-label="Tutup pilihan warna dan ukuran" hidden></button>
        <div class="variant-picker-menu" id="variantPickerMenu" role="listbox" aria-label="Pilihan warna dan ukuran" hidden>
          <div class="variant-picker-sheet-header" id="variantPickerSheetHeader">
            <span class="variant-picker-sheet-grab" aria-hidden="true"></span>
            <div><small>PILIH VARIAN</small><strong>Warna & ukuran</strong></div>
            <button class="variant-picker-sheet-close" id="variantPickerSheetClose" type="button" aria-label="Tutup">×</button>
          </div>
          <div class="variant-picker-sheet-options">${customOptions}</div>
        </div>
      </div>`;
  }

  function openProduct(product, updateUrl = true) {
    if (!product) return;
    rememberRecentlyViewed(product);
    modalInteractionController?.abort();
    modalInteractionController = new AbortController();
    const interactionSignal = modalInteractionController.signal;

    const variants = availableVariants(product);
    const defaultVariant = variants.find(v => v.stock > 0) || variants[0];
    const availability = productAvailability(product);
    const mediaItemsForProduct = productMediaItems(product);
    const storyLabel = productStoryLabel(product);
    const titleLength = String(product.name || "").length;
    const titleClass = titleLength > 32 ? " is-long" : titleLength > 20 ? " is-medium" : "";
    const whatsappIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L0 24l6.5-1.7a11.8 11.8 0 0 0 5.6 1.4h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.1-1.2-6-3.5-8.4ZM12.2 21.7h-.1c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-3.9 1 1-3.8-.2-.4a9.8 9.8 0 1 1 8.7 4.8Zm5.4-7.3c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.6l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9 0 1.7 1.2 3.3 1.4 3.5.2.2 2.4 3.7 5.9 5.2.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3Z"></path></svg>`;

    elements.modalContent.innerHTML = `
      <article class="modal-product modal-product-v42">
        <div class="modal-gallery">
          <div class="modal-product-badges">${productBadges(product)}</div>
          <div class="modal-main-image" id="modalMainMedia">${renderModalMainMedia(mediaItemsForProduct[0], product)}</div>
          ${renderModalMediaStrip(product, mediaItemsForProduct)}
        </div>
        <div class="modal-info">
          <div class="modal-heading-row">
            <div class="modal-heading-copy">
              <div class="modal-product-context">
                ${storyLabel ? `<span class="product-story-label">${escapeHtml(storyLabel)}</span>` : ""}
                <p class="product-brand">${escapeHtml(product.brand)}</p>
              </div>
              <h2 id="modalProductName" class="${titleClass.trim()}">${escapeHtml(product.name)}</h2>
            </div>
            <button class="modal-share-button" id="modalShareButton" type="button" aria-label="Salin link ${escapeHtml(product.name)}" title="Salin link produk">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a3 3 0 1 0-2.83-4A3 3 0 0 0 15 5c0 .2.02.4.06.58L8.91 9.1A3 3 0 1 0 9 14.83l6.08 3.47A3 3 0 1 0 16 16.55l-6.07-3.47a3.06 3.06 0 0 0 0-2.15l6.11-3.5c.53.36 1.17.57 1.86.57Z"></path></svg>
              <span class="sr-only">Salin link produk</span>
            </button>
          </div>
          <div class="modal-price${isPromoActive(product) ? " has-promo" : ""}" id="modalPrice">${defaultVariant ? variantPriceMarkup(product, defaultVariant) : productPriceMarkup(product)}</div>
          <div id="detailStockBadge" class="detail-stock-badge" hidden>Stok menipis</div>

          <div class="variant-picker-block">
            <span class="variant-label">Pilih warna dan ukuran</span>
            ${renderVariantPicker(variants, defaultVariant)}
          </div>

          <div class="modal-mobile-cta" aria-label="Aksi produk">
            <button class="button button-primary" type="button" data-modal-add-cart ${!defaultVariant || defaultVariant.stock <= 0 ? "disabled" : ""}>Tambah ke pilihan</button>
            <a class="button button-wa button-wa-luxury" data-modal-whatsapp href="${whatsappProductUrl(product, defaultVariant)}" target="_blank" rel="noopener">${whatsappIcon}<span>Tanya di WhatsApp</span></a>
          </div>

          ${renderProductDetailSections(product)}

          <div class="modal-actions modal-actions-desktop">
            <button class="button button-primary" type="button" data-modal-add-cart ${!defaultVariant || defaultVariant.stock <= 0 ? "disabled" : ""}>Tambah ke pilihan</button>
            <a class="button button-wa button-wa-luxury" data-modal-whatsapp href="${whatsappProductUrl(product, defaultVariant)}" target="_blank" rel="noopener">${whatsappIcon}<span>Tanya di WhatsApp</span></a>
          </div>
        </div>
      </article>`;

    const variantSelect = $("#variantSelect");
    const variantPicker = $("#variantPicker");
    const variantPickerTrigger = $("#variantPickerTrigger");
    const variantPickerMenu = $("#variantPickerMenu");
    const variantPickerBackdrop = $("#variantPickerBackdrop");
    const variantPickerSheetHeader = $("#variantPickerSheetHeader");
    const variantPickerSheetClose = $("#variantPickerSheetClose");
    const variantPickerValue = $("#variantPickerValue");
    const variantPickerState = $("#variantPickerState");
    const variantOptions = [...elements.modalContent.querySelectorAll("[data-variant-option]")];
    const addButtons = [...elements.modalContent.querySelectorAll("[data-modal-add-cart]")];
    const waButtons = [...elements.modalContent.querySelectorAll("[data-modal-whatsapp]")];
    const shareButton = $("#modalShareButton");
    const selectedVariant = () => product.variants.find(v => v.sku === variantSelect?.value);
    const mediaItems = mediaItemsForProduct;
    const modalMainMedia = $("#modalMainMedia");
    const mediaThumbs = [...elements.modalContent.querySelectorAll("[data-media-index]")];
    const detailAccordions = [...elements.modalContent.querySelectorAll("[data-detail-accordion]")];

    function setActionState(variant) {
      addButtons.forEach(button => { button.disabled = !variant || variant.stock <= 0; });
      waButtons.forEach(link => { link.href = whatsappProductUrl(product, variant); });
    }

    const mobileVariantSheet = () => window.matchMedia("(max-width: 700px)").matches;

    function closeVariantPicker({ focus = false } = {}) {
      if (!variantPickerMenu || !variantPickerTrigger) return;
      variantPickerMenu.hidden = true;
      if (variantPickerBackdrop) variantPickerBackdrop.hidden = true;
      variantPicker.classList.remove("is-open");
      document.body.classList.remove("variant-sheet-open");
      variantPickerTrigger.setAttribute("aria-expanded", "false");
      if (focus) variantPickerTrigger.focus();
    }

    function openVariantPicker({ focusOption = false } = {}) {
      if (!variantPickerMenu || !variantPickerTrigger) return;
      variantPickerMenu.hidden = false;
      variantPicker.classList.add("is-open");
      variantPickerTrigger.setAttribute("aria-expanded", "true");

      if (mobileVariantSheet()) {
        if (variantPickerBackdrop) variantPickerBackdrop.hidden = false;
        document.body.classList.add("variant-sheet-open");
        window.setTimeout(() => {
          const selected = variantOptions.find(option => option.classList.contains("is-selected") && !option.disabled)
            || variantOptions.find(option => !option.disabled);
          selected?.scrollIntoView({ block: "nearest" });
        }, 40);
        return;
      }

      if (focusOption) {
        const selected = variantOptions.find(option => option.classList.contains("is-selected") && !option.disabled)
          || variantOptions.find(option => !option.disabled);
        selected?.focus();
      }
    }

    function syncVariantPicker(variant) {
      if (!variant) return;
      if (variantPickerValue) variantPickerValue.textContent = variantChoiceLabel(variant);
      if (variantPickerState) variantPickerState.textContent = variantStateLabel(variant);
      variantOptions.forEach(option => {
        const selected = option.dataset.variantOption === variant.sku;
        option.classList.toggle("is-selected", selected);
        option.setAttribute("aria-selected", selected ? "true" : "false");
      });
    }

    variantPickerTrigger?.addEventListener("click", () => {
      if (variantPickerMenu?.hidden) openVariantPicker();
      else closeVariantPicker();
    }, { signal: interactionSignal });

    variantPickerTrigger?.addEventListener("keydown", event => {
      if (["ArrowDown", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openVariantPicker({ focusOption: true });
      }
    }, { signal: interactionSignal });

    variantPickerBackdrop?.addEventListener("click", () => closeVariantPicker({ focus: true }), { signal: interactionSignal });
    variantPickerSheetClose?.addEventListener("click", () => closeVariantPicker({ focus: true }), { signal: interactionSignal });

    let variantSheetTouchStart = null;
    variantPickerSheetHeader?.addEventListener("touchstart", event => {
      if (!mobileVariantSheet() || !event.touches?.length) return;
      variantSheetTouchStart = event.touches[0].clientY;
    }, { signal: interactionSignal, passive: true });
    variantPickerSheetHeader?.addEventListener("touchend", event => {
      if (variantSheetTouchStart == null || !mobileVariantSheet()) return;
      const endY = event.changedTouches?.[0]?.clientY ?? variantSheetTouchStart;
      if (endY - variantSheetTouchStart > 72) closeVariantPicker({ focus: true });
      variantSheetTouchStart = null;
    }, { signal: interactionSignal, passive: true });

    variantOptions.forEach(option => {
      option.addEventListener("click", () => {
        if (option.disabled || !variantSelect) return;
        variantSelect.value = option.dataset.variantOption;
        variantSelect.dispatchEvent(new Event("change", { bubbles: true }));
        closeVariantPicker({ focus: true });
      }, { signal: interactionSignal });
    });

    variantPickerMenu?.addEventListener("keydown", event => {
      const enabledOptions = variantOptions.filter(option => !option.disabled);
      const currentIndex = enabledOptions.indexOf(document.activeElement);
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeVariantPicker({ focus: true });
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = Math.max(0, Math.min(enabledOptions.length - 1, currentIndex + direction));
        enabledOptions[nextIndex]?.focus();
      }
    }, { signal: interactionSignal });

    elements.modal.addEventListener("click", event => {
      if (variantPicker && !variantPicker.contains(event.target)) closeVariantPicker();
    }, { signal: interactionSignal });

    function configureDetailAccordions() {
      const compact = window.matchMedia("(max-width: 700px)").matches;
      detailAccordions.forEach(section => {
        const button = section.querySelector(".product-detail-toggle");
        if (!button) return;
        const expanded = !compact;
        section.classList.toggle("is-open", expanded);
        button.setAttribute("aria-expanded", expanded ? "true" : "false");
        button.addEventListener("click", () => {
          if (!window.matchMedia("(max-width: 700px)").matches) return;
          const next = !section.classList.contains("is-open");
          section.classList.toggle("is-open", next);
          button.setAttribute("aria-expanded", next ? "true" : "false");
        }, { signal: interactionSignal });
      });
    }

    function bindMainMediaActions(item) {
      const playButton = modalMainMedia?.querySelector("[data-play-video]");
      playButton?.addEventListener("click", () => {
        if (!modalMainMedia || !item) return;
        modalMainMedia.innerHTML = renderModalMainMedia(item, product, true);
      }, { signal: interactionSignal });
    }

    function setActiveMedia(index) {
      const item = mediaItems[index];
      if (!item || !modalMainMedia) return;
      modalMainMedia.innerHTML = renderModalMainMedia(item, product);
      bindMainMediaActions(item);
      mediaThumbs.forEach((thumb, thumbIndex) => {
        const active = thumbIndex === index;
        thumb.classList.toggle("is-active", active);
        thumb.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    mediaThumbs.forEach(thumb => {
      thumb.addEventListener("click", () => {
        setActiveMedia(Number(thumb.dataset.mediaIndex || 0));
      }, { signal: interactionSignal });
    });

    bindMainMediaActions(mediaItems[0]);
    configureDetailAccordions();
    updateDetailStockBadge(defaultVariant);
    setActionState(defaultVariant);
    syncVariantPicker(defaultVariant);

    variantSelect?.addEventListener("change", () => {
      const variant = selectedVariant();
      updateDetailStockBadge(variant);
      if (!variant) return;
      $("#modalPrice").innerHTML = variantPriceMarkup(product, variant);
      syncVariantPicker(variant);
      setActionState(variant);
    }, { signal: interactionSignal });

    addButtons.forEach(button => {
      button.addEventListener("click", () => {
        const variant = selectedVariant();
        if (variant) addToCart(product, variant);
      }, { signal: interactionSignal });
    });

    shareButton?.addEventListener("click", () => copyProductLink(product, shareButton), { signal: interactionSignal });

    elements.modal.classList.add("open");
    elements.modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");

    const currentUrl = new URL(window.location.href);
    if (!currentUrl.pathname.startsWith(PRODUCT_PATH_PREFIX)) {
      modalReturnUrl = urlWithoutProduct(currentUrl);
    }
    history.replaceState({}, "", productSharePath(product));
  }

  function closeProduct() {
    modalInteractionController?.abort();
    modalInteractionController = null;
    elements.modal.classList.remove("open");
    elements.modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll", "variant-sheet-open");

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
          brand: product.brand,
          condition: product.condition || item.condition || "Baru",
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
      condition: product.condition || "Baru",
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
    const count = state.cart.length;
    const pieceLabel = `${count} produk`;

    elements.cartCount.textContent = count;
    elements.cartCount.style.display = count ? "grid" : "none";
    elements.cartEmpty.classList.toggle("hidden", count > 0);
    elements.cartItems.classList.toggle("hidden", count === 0);
    if (elements.cartFooter) elements.cartFooter.hidden = count === 0;
    if (elements.cartSelectionCount) elements.cartSelectionCount.textContent = pieceLabel;
    if (elements.cartFooterMeta) elements.cartFooterMeta.textContent = `Estimasi pilihan · ${pieceLabel}`;
    if (elements.sendCartBtn) elements.sendCartBtn.disabled = count === 0;
    if (elements.clearCartBtn) elements.clearCartBtn.disabled = count === 0;

    elements.cartItems.innerHTML = state.cart.map(item => {
      const variantBits = [
        item.color && item.color !== "Tanpa warna" ? item.color : "",
        item.size && item.size !== "Tanpa ukuran" ? item.size : ""
      ].filter(Boolean);
      const variantLine = variantBits.length ? variantBits.join(" · ") : "Varian terpilih";
      return `
      <article class="cart-item">
        <div class="cart-thumb">
          ${item.image
            ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="product-placeholder ${escapeHtml(item.placeholderClass)}" hidden><span><strong>${escapeHtml(item.placeholder)}</strong><small>${escapeHtml(item.brand)}</small></span></div>`
            : `<div class="product-placeholder ${escapeHtml(item.placeholderClass)}"><span><strong>${escapeHtml(item.placeholder)}</strong><small>${escapeHtml(item.brand)}</small></span></div>`}
        </div>
        <div class="cart-item-copy">
          <span class="cart-item-brand">${escapeHtml(item.brand)}</span>
          <h3>${escapeHtml(item.name)}</h3>
          <p class="cart-item-variant">${escapeHtml(variantLine)}</p>
          <div class="cart-item-price${item.discountPercent ? " has-promo" : ""}">${item.discountPercent && item.originalPrice ? `<span class="original-price">${formatCurrency(item.originalPrice)}</span><span class="discounted-price">${formatCurrency(item.price)}</span>` : `<span class="current-price">${formatCurrency(item.price)}</span>`}</div>
        </div>
        <button class="remove-cart-item" type="button" data-remove-sku="${escapeHtml(item.sku)}" aria-label="Hapus ${escapeHtml(item.name)}">×</button>
      </article>`;
    }).join("");

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
    const count = state.cart.length;
    const lines = state.cart.map((item, index) => {
      const variantBits = [
        item.color && item.color !== "Tanpa warna" ? item.color : "",
        item.size && item.size !== "Tanpa ukuran" ? `Ukuran ${item.size}` : ""
      ].filter(Boolean);
      const variantLine = variantBits.length ? `\n${variantBits.join(" · ")}` : "";
      return `${index + 1}. ${item.name} — ${item.brand}${variantLine}\n${formatCurrency(item.price)}\nKode: ${item.sku}`;
    });
    const total = state.cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const hasPreloved = state.cart.some(item => String(item.condition || "").toLowerCase() === "preloved");
    const closing = hasPreloved
      ? "Boleh dibantu cek stok, kondisi Preloved, dan cara memesannya? Terima kasih."
      : "Boleh dibantu cek stok dan cara memesannya? Terima kasih.";
    const message = `Halo mi.do.ri 👋\nSaya ingin dibantu cek ${count} pilihan ini:\n\n${lines.join("\n\n")}\n\nEstimasi pilihan: ${formatCurrency(total)}\n\n${closing}`;
    window.open(`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  }

  function resetFilters() {
    Object.assign(state, {
      query: "", brand: "", category: "", mainCategory: "",
      segment: "", condition: "", availability: "", sale: false, newOnly: false,
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
    const quickAdd = event.target.closest("[data-quick-add]");
    if (quickAdd) {
      event.preventDefault();
      event.stopPropagation();
      const product = findProduct(quickAdd.dataset.quickAdd);
      const variant = product?.variants.find(v => v.stock > 0 && v.status === "Aktif");
      if (product && variant) addToCart(product, variant);
      else showToast("Produk ini sedang habis.");
      return;
    }

    const detailButton = event.target.closest("[data-open-product]");
    if (detailButton) {
      if (elements.searchSuggestions) elements.searchSuggestions.hidden = true;
      openProduct(findProduct(detailButton.dataset.openProduct));
    }
  }

  function globalSearchCatalogUrl(query = "") {
    const url = new URL("katalog.html", window.location.href);
    if (query.trim()) url.searchParams.set("q", query.trim());
    url.searchParams.set("focus", "search");
    url.hash = "katalog";
    return `${url.pathname.split("/").pop()}${url.search}${url.hash}`;
  }

  function globalSearchProductPrice(product) {
    const variant = product.variants?.find(v => v.status === "Aktif" && v.stock > 0) || product.variants?.find(v => v.status === "Aktif") || product.variants?.[0];
    const price = effectivePrice(product, variant);
    return price ? currency(price) : "Lihat detail";
  }

  function globalSearchProductThumb(product) {
    const image = firstProductImage(product);
    if (image) return `<img src="${escapeHtml(image)}" alt="" loading="lazy">`;
    return `<span class="global-search-result-placeholder">${escapeHtml(productInitials(product))}</span>`;
  }

  function renderGlobalSearch(value = "") {
    if (!elements.globalSearchResults) return;
    const matches = getSearchSuggestionMatches(value, { products: 4, brands: 3, categories: 3 });

    if (!matches.query || matches.query.length < 2) {
      elements.globalSearchResults.innerHTML = `
        <div class="global-search-intro">
          <p>Mulai dengan nama produk, brand, kategori, atau warna yang kamu suka.</p>
          <div class="global-search-quicklinks">
            <a href="katalog.html?sale=1#katalog">SALE</a>
            <a href="katalog.html?kondisi=Preloved#katalog">Preloved</a>
            <a href="katalog.html#katalog">Lihat semua koleksi</a>
          </div>
        </div>`;
      if (elements.globalSearchFooter) elements.globalSearchFooter.hidden = true;
      return;
    }

    const markup = renderSearchSuggestionGroups(matches, "global");
    elements.globalSearchResults.innerHTML = markup
      ? `<div class="global-search-unified-suggestions">${markup}</div>`
      : `<div class="search-suggestion-empty global-search-empty-compact">Belum ada yang pas. Coba kata lain.</div>`;

    if (elements.globalSearchFooter) {
      elements.globalSearchFooter.hidden = false;
      if (elements.globalSearchViewAll) {
        elements.globalSearchViewAll.innerHTML = `Lihat semua hasil untuk “${escapeHtml(matches.raw)}” <span>↗</span>`;
      }
    }
  }

  function openGlobalSearch(initialValue = "") {
    if (!elements.globalSearch) {
      window.location.href = globalSearchCatalogUrl(initialValue);
      return;
    }
    elements.categoryNavDropdown?.classList.remove("open");
    elements.brandNavDropdown?.classList.remove("open");
    elements.globalSearch.classList.add("open");
    elements.globalSearch.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    if (elements.globalSearchInput) {
      elements.globalSearchInput.value = initialValue;
      renderGlobalSearch(initialValue);
      window.setTimeout(() => elements.globalSearchInput.focus(), 60);
    }
  }

  function closeGlobalSearch({ restoreFocus = false } = {}) {
    if (!elements.globalSearch) return;
    elements.globalSearch.classList.remove("open");
    elements.globalSearch.setAttribute("aria-hidden", "true");
    if (!elements.modal?.classList.contains("open") && !elements.cartDrawer?.classList.contains("open") && !elements.filterDrawer?.classList.contains("open")) {
      document.body.classList.remove("no-scroll");
    }
    if (restoreFocus) elements.searchJump?.focus();
  }

  function submitGlobalSearch() {
    const query = elements.globalSearchInput?.value.trim() || "";
    window.location.href = globalSearchCatalogUrl(query);
  }

  function focusCatalogSearch({ cleanUrl = false } = {}) {
    if (!IS_CATALOG_PAGE || !elements.searchInput) return;

    const searchBox = elements.searchInput.closest(".search-box");
    searchBox?.scrollIntoView({ behavior: "smooth", block: "center" });

    window.setTimeout(() => {
      elements.searchInput.focus({ preventScroll: true });
      const valueLength = elements.searchInput.value.length;
      try {
        elements.searchInput.setSelectionRange(valueLength, valueLength);
      } catch (_) {}
    }, 260);

    if (cleanUrl) {
      const url = new URL(window.location.href);
      if (url.searchParams.get("focus") === "search") {
        url.searchParams.delete("focus");
        history.replaceState({}, "", `${url.pathname}${url.search}${url.hash || "#katalog"}`);
      }
    }
  }

  function focusSearchFromUrl() {
    if (!IS_CATALOG_PAGE) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("focus") === "search") {
      focusCatalogSearch({ cleanUrl: true });
    }
  }

  function resetNavigationState() {
    elements.mainNav?.classList.remove("open");
    elements.navToggle?.setAttribute("aria-expanded", "false");
    elements.categoryNavDropdown?.classList.remove("open");
    elements.categoryNavToggle?.setAttribute("aria-expanded", "false");
    elements.brandNavDropdown?.classList.remove("open");
    elements.brandNavToggle?.setAttribute("aria-expanded", "false");
  }

  function bindNavigationViewportGuard() {
    if (!window.matchMedia) return;
    const tabletNavQuery = window.matchMedia("(max-width: 900px)");
    let wasTablet = tabletNavQuery.matches;

    const handleViewportChange = event => {
      const isTablet = typeof event?.matches === "boolean" ? event.matches : tabletNavQuery.matches;
      if (isTablet !== wasTablet) {
        resetNavigationState();
        wasTablet = isTablet;
      }
    };

    if (typeof tabletNavQuery.addEventListener === "function") {
      tabletNavQuery.addEventListener("change", handleViewportChange);
    } else if (typeof tabletNavQuery.addListener === "function") {
      tabletNavQuery.addListener(handleViewportChange);
    }
  }

  function bindEvents() {
    elements.searchJump?.addEventListener("click", event => {
      event.preventDefault();
      openGlobalSearch(IS_CATALOG_PAGE ? (elements.searchInput?.value || state.query || "") : "");
    });

    elements.globalSearchInput?.addEventListener("input", event => renderGlobalSearch(event.target.value));
    elements.globalSearchForm?.addEventListener("submit", event => {
      event.preventDefault();
      submitGlobalSearch();
    });
    elements.globalSearchViewAll?.addEventListener("click", submitGlobalSearch);
    elements.globalSearch?.addEventListener("click", event => {
      if (event.target.closest("[data-close-global-search]")) {
        closeGlobalSearch({ restoreFocus: true });
        return;
      }
      const productButton = event.target.closest("[data-global-open-product]");
      if (productButton) {
        const product = findProduct(productButton.dataset.globalOpenProduct);
        closeGlobalSearch();
        if (product) openProduct(product);
        return;
      }
      const brandButton = event.target.closest("[data-global-brand]");
      if (brandButton) {
        window.location.href = `katalog.html?brand=${encodeURIComponent(brandButton.dataset.globalBrand)}#katalog`;
        return;
      }
      const categoryButton = event.target.closest("[data-global-category]");
      if (categoryButton) {
        window.location.href = `katalog.html?kategori=${encodeURIComponent(categoryButton.dataset.globalCategory)}#katalog`;
      }
    });

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

    elements.brandNavMenu?.addEventListener("input", event => {
      const input = event.target.closest("[data-brand-nav-search]");
      if (!input) return;
      filterBrandNavigation(input.value);
    });

    elements.brandNavMenu?.addEventListener("click", event => {
      if (event.target.closest("[data-brand-nav-search]")) event.stopPropagation();
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
      const value = event.target.value;
      renderSearchSuggestions(value);
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.query = value;
        state.page = 1;
        applyFilters();
      }, 180);
    });

    elements.searchInput?.addEventListener("focus", event => renderSearchSuggestions(event.target.value));
    elements.searchInput?.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        elements.searchSuggestions && (elements.searchSuggestions.hidden = true);
      }
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
    elements.filterToggleBtn?.addEventListener("click", openFilters);
    elements.filterCloseBtn?.addEventListener("click", closeFilters);
    elements.filterShowResultsBtn?.addEventListener("click", closeFilters);
    document.querySelectorAll("[data-close-filters]").forEach(node => node.addEventListener("click", closeFilters));
    elements.loadMoreBtn?.addEventListener("click", loadMoreProducts);
    document.querySelectorAll("[data-quick-filter]").forEach(button => {
      button.addEventListener("click", () => toggleQuickFilter(button.dataset.quickFilter));
    });
    elements.clearSaleFilter?.addEventListener("click", () => clearFilterKey("sale"));

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

      if (event.target.closest("[data-open-product], [data-quick-add]")) handleProductAction(event);

      const clearChip = event.target.closest("[data-clear-filter]");
      if (clearChip) {
        clearFilterKey(clearChip.dataset.clearFilter);
        return;
      }

      const suggestBrand = event.target.closest("[data-suggest-brand]");
      if (suggestBrand) {
        state.brand = suggestBrand.dataset.suggestBrand;
        if (elements.brandFilter) elements.brandFilter.value = state.brand;
        state.query = "";
        if (elements.searchInput) elements.searchInput.value = "";
        state.page = 1;
        elements.searchSuggestions && (elements.searchSuggestions.hidden = true);
        applyFilters();
        return;
      }

      const suggestCategory = event.target.closest("[data-suggest-category]");
      if (suggestCategory) {
        state.category = suggestCategory.dataset.suggestCategory;
        state.mainCategory = "";
        if (elements.categoryFilter) elements.categoryFilter.value = state.category;
        state.query = "";
        if (elements.searchInput) elements.searchInput.value = "";
        state.page = 1;
        elements.searchSuggestions && (elements.searchSuggestions.hidden = true);
        applyFilters();
        return;
      }

      if (elements.searchSuggestions && !event.target.closest(".catalog-search-shell")) {
        elements.searchSuggestions.hidden = true;
      }

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
      if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        openGlobalSearch(IS_CATALOG_PAGE ? (elements.searchInput?.value || state.query || "") : "");
        return;
      }

      if ((event.key === "Enter" || event.key === " ") && event.target?.matches?.(".product-card[data-open-product]")) {
        event.preventDefault();
        openProduct(findProduct(event.target.dataset.openProduct));
        return;
      }

      if (event.key !== "Escape") return;

      elements.categoryNavDropdown?.classList.remove("open");
      elements.categoryNavToggle?.setAttribute("aria-expanded", "false");
      elements.brandNavDropdown?.classList.remove("open");
      elements.brandNavToggle?.setAttribute("aria-expanded", "false");
      if (elements.searchSuggestions) elements.searchSuggestions.hidden = true;
      if (elements.globalSearch?.classList.contains("open")) closeGlobalSearch({ restoreFocus: true });
      if (elements.filterDrawer?.classList.contains("open")) closeFilters();
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
    renderEditorialEdits();
    renderCategories();
    renderCuratedSections();
    renderFreshProducts();
    renderBrandDiscovery();
    renderRecentlyViewed();
    bindNavigationViewportGuard();
    bindEvents();
    renderCart();
    applyFilters();
    openProductFromUrl();
    focusSearchFromUrl();
    setupRevealMotion();
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
