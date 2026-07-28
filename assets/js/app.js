(async () => {
  "use strict";

  const APP_VERSION = "2.5.3";
  window.MIDORI_APP_VERSION = APP_VERSION;

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
  const products = catalog.products.filter(product => product.status === "Aktif");
  const brands = catalog.brands || [];

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
    searchInput: $("#searchInput"),
    brandFilter: $("#brandFilter"),
    categoryFilter: $("#categoryFilter"),
    segmentFilter: $("#segmentFilter"),
    conditionFilter: $("#conditionFilter"),
    availabilityFilter: $("#availabilityFilter"),
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
    heroProductImage: $("#heroProductImage")
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
    return type === "out" ? "Habis" : type === "limited" ? "Stok terbatas" : "Tersedia";
  }

  function productInitials(product) {
    const words = product.name.split(/\s+/).filter(Boolean);
    return (words[0]?.[0] || "M") + (words[1]?.[0] || "");
  }

  function placeholderClass(product) {
    return `placeholder-${(Number(product.brandCode || 0) % 5) + 1}`;
  }

  function imageMarkup(product, className = "") {
    const image = product.images?.find(Boolean);
    const placeholder = `<div class="product-placeholder ${placeholderClass(product)} ${className}" ${image ? "hidden" : ""}><span><strong>${escapeHtml(productInitials(product))}</strong><small>${escapeHtml(product.brand)}</small></span></div>`;
    if (!image) return placeholder;
    return `<img class="${className}" src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">${placeholder}`;
  }

  function productUrl(product) {
    const url = new URL("katalog.html", window.location.href);
    url.searchParams.set("produk", product.slug);
    url.hash = "katalog";
    return url.toString();
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

  function catalogUrl(parameters = {}) {
    const url = new URL("katalog.html", window.location.href);

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
    state.sort = params.get("urut") || "recommended";

    if (elements.searchInput) elements.searchInput.value = state.query;
    if (elements.brandFilter) elements.brandFilter.value = state.brand;
    if (elements.categoryFilter) elements.categoryFilter.value = state.category;
    if (elements.conditionFilter) elements.conditionFilter.value = state.condition;
    if (elements.segmentFilter) elements.segmentFilter.value = state.segment;
    if (elements.availabilityFilter) elements.availabilityFilter.value = state.availability;
    if (elements.sortSelect) elements.sortSelect.value = state.sort;
  }

  function syncCatalogUrl() {
    if (!IS_CATALOG_PAGE) return;

    const url = new URL(window.location.href);
    const productSlug = url.searchParams.get("produk");

    [
      "q", "brand", "kategori", "kelompok", "kondisi",
      "ukuran", "segmen", "stok", "urut"
    ].forEach(key => url.searchParams.delete(key));

    if (state.query) url.searchParams.set("q", state.query);
    if (state.brand) url.searchParams.set("brand", state.brand);
    if (state.category) url.searchParams.set("kategori", state.category);
    if (state.mainCategory) url.searchParams.set("kelompok", state.mainCategory);
    if (state.condition) url.searchParams.set("kondisi", state.condition);
    if (state.segment) url.searchParams.set("segmen", state.segment);
    if (state.availability) url.searchParams.set("stok", state.availability);
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
    if (!elements.heroProductImage) return;
    elements.heroProductImage.src = "assets/images/hero/hero-koleksi.webp";
    elements.heroProductImage.alt = "Koleksi utama mi.do.ri";
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
      promo ? `<span class="badge badge-discount" title="${escapeHtml(product.promoLabel || `Diskon ${promoPercent(product)}%`)}"><small>SALE</small><strong>-${promoPercent(product)}%</strong></span>` : "",
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
          ${imageMarkup(product, "product-image")}
          <div class="product-badges">${productBadges(product)}</div>
          ${availability === "limited" ? `<span class="badge badge-limited badge-stock-bottom-left">Stok terbatas</span>` : ""}
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

  function renderCuratedSections() {
    const regularProducts = products.filter(product => product.condition !== "Preloved" && product.brand !== "PRELOVED");
    const featured = selectDiverseProducts(regularProducts, 5);
    const preloved = products
      .filter(product => product.condition === "Preloved" || product.brand === "PRELOVED")
      .filter(product => productAvailability(product) !== "out")
      .sort((a, b) =>
        Number(Boolean(b.images?.find(Boolean))) - Number(Boolean(a.images?.find(Boolean))) ||
        b.totalStock - a.totalStock ||
        a.name.localeCompare(b.name, "id")
      )
      .slice(0, 5);

    if (elements.featuredGrid) {
      elements.featuredGrid.innerHTML = featured.map(renderProductCard).join("");
    }
    if (elements.prelovedGrid) {
      elements.prelovedGrid.innerHTML = preloved.length
        ? preloved.map(renderProductCard).join("")
        : '<div class="section-empty-note">Belum ada produk preloved aktif.</div>';
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
      state.availability
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

  function openProduct(product, updateUrl = true) {
    if (!product) return;
    const variants = availableVariants(product);
    const defaultVariant = variants.find(v => v.stock > 0) || variants[0];
    const availability = productAvailability(product);

    elements.modalContent.innerHTML = `
      <article class="modal-product">
        <div class="modal-gallery"><div class="modal-product-badges">${productBadges(product)}</div><div class="modal-main-image">${imageMarkup(product)}</div></div>
        <div class="modal-info">
          <p class="product-brand">${escapeHtml(product.brand)}</p>
          <h2 id="modalProductName">${escapeHtml(product.name)}</h2>
          <div class="modal-price${isPromoActive(product) ? " has-promo" : ""}" id="modalPrice">${defaultVariant ? variantPriceMarkup(product, defaultVariant) : productPriceMarkup(product)}</div>
          <div id="detailStockBadge" class="detail-stock-badge" hidden>
            Stok terbatas
          </div>
          <p class="modal-description">${escapeHtml(product.description || `Koleksi ${product.category.toLowerCase()} dari ${product.brand}. Pilih varian yang diinginkan untuk menanyakan ketersediaan.`)}</p>

          <label class="variant-label" for="variantSelect">Pilih warna dan ukuran</label>
          <select class="variant-select" id="variantSelect">
            ${variants.map(variant => `
              <option value="${escapeHtml(variant.sku)}" ${variant === defaultVariant ? "selected" : ""} ${variant.stock <= 0 ? "disabled" : ""}>
                ${escapeHtml(variant.color || "Tanpa warna")} · ${escapeHtml(variant.size || "Tanpa ukuran")} · ${variant.stock > 0 ? stockLabel(variant.stock <= 2 ? "limited" : "available") : "Habis"}
              </option>`).join("")}
          </select>

          <div class="variant-status">
            <span>Kode: <strong id="modalSku">${escapeHtml(defaultVariant?.sku || "-")}</strong></span>
            <span id="modalStock">${defaultVariant ? `${defaultVariant.stock} unit · ${stockLabel(defaultVariant.stock <= 0 ? "out" : defaultVariant.stock <= 2 ? "limited" : "available")}` : stockLabel(availability)}</span>
          </div>

          <div class="modal-specs">
            <div><span>Kategori</span><strong>${escapeHtml(product.category)}</strong></div>
            <div><span>Segmen</span><strong>${escapeHtml(product.segment)}</strong></div>
            <div><span>Warna</span><strong>${escapeHtml(product.colors.join(", ") || "-")}</strong></div>
            <div><span>Ukuran</span><strong>${escapeHtml(product.sizes.join(", ") || "-")}</strong></div>
          </div>

          <div class="modal-actions">
            <button class="button button-primary" id="modalAddCartBtn" type="button" ${!defaultVariant || defaultVariant.stock <= 0 ? "disabled" : ""}>Tambah ke pilihan</button>
            <a class="button button-wa" id="modalWhatsAppBtn" href="${whatsappProductUrl(product, defaultVariant)}" target="_blank" rel="noopener">Tanya via WhatsApp</a>
          </div>
        </div>
      </article>`;

    const variantSelect = $("#variantSelect");
    const addButton = $("#modalAddCartBtn");
    const waButton = $("#modalWhatsAppBtn");
    const selectedVariant = () => product.variants.find(v => v.sku === variantSelect.value);

    updateDetailStockBadge(defaultVariant);

    variantSelect?.addEventListener("change", () => {
      const variant = selectedVariant();
      updateDetailStockBadge(variant);
      if (!variant) return;
      $("#modalPrice").innerHTML = variantPriceMarkup(product, variant);
      $("#modalSku").textContent = variant.sku;
      $("#modalStock").textContent = `${variant.stock} unit · ${stockLabel(variant.stock <= 0 ? "out" : variant.stock <= 2 ? "limited" : "available")}`;
      addButton.disabled = variant.stock <= 0;
      waButton.href = whatsappProductUrl(product, variant);
    });

    addButton?.addEventListener("click", () => {
      const variant = selectedVariant();
      if (variant) addToCart(product, variant);
    });

    elements.modal.classList.add("open");
    elements.modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");

    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("produk", product.slug);
      history.replaceState({}, "", url);
    }
  }

  function closeProduct() {
    elements.modal.classList.remove("open");
    elements.modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    const url = new URL(window.location.href);
    url.searchParams.delete("produk");
    history.replaceState({}, "", url);
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
      image: product.images?.[0] || "",
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
      segment: "", condition: "", availability: "",
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
      }
    });

    elements.categoryNavToggle?.addEventListener("click", event => {
      event.stopPropagation();
      const open = elements.categoryNavDropdown.classList.toggle("open");
      elements.categoryNavToggle.setAttribute("aria-expanded", String(open));
    });

    $$("#mainNav a").forEach(link => link.addEventListener("click", () => {
      elements.mainNav.classList.remove("open");
      elements.navToggle?.setAttribute("aria-expanded", "false");
      elements.categoryNavDropdown?.classList.remove("open");
      elements.categoryNavToggle?.setAttribute("aria-expanded", "false");
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

    document.addEventListener("click", event => {
      if (
        elements.categoryNavDropdown &&
        !elements.categoryNavDropdown.contains(event.target)
      ) {
        elements.categoryNavDropdown.classList.remove("open");
        elements.categoryNavToggle?.setAttribute("aria-expanded", "false");
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
  badge.textContent = "Stok terbatas";
}
