(() => {
  "use strict";

  const rootConfig = window.MIDORI_HOME_CONFIG || {};
  const sectionConfig = rootConfig.editorialEdit?.section || {};
  const cardsConfig = rootConfig.editorialEdits || {};
  const cardKeys = ["mixMatch", "specialMoment", "kids"];

  function text(value) {
    return String(value ?? "").trim();
  }

  function setText(node, value) {
    if (!node) return;
    const next = text(value);
    if (next) node.textContent = next;
  }

  function applySectionHeading() {
    const section = document.querySelector("#midori-edit");
    if (!section) return;

    const heading = section.querySelector(".editorial-heading");
    if (!heading) return;

    setText(heading.querySelector(".editorial-eyebrow"), sectionConfig.eyebrow);
    setText(heading.querySelector("h2"), sectionConfig.title);
    setText(heading.querySelector(":scope > p"), sectionConfig.description);
  }

  function list(value) {
    return Array.isArray(value)
      ? value.map(item => text(item)).filter(Boolean)
      : [];
  }

  function matchesFilter(product, filter) {
    if (!product || product.status !== "Aktif") return false;
    if (!filter || typeof filter !== "object") return true;

    if (filter.excludePreloved === true && product.condition === "Preloved") {
      return false;
    }

    const categories = list(filter.categories);
    if (categories.length && !categories.includes(text(product.category))) {
      return false;
    }

    const brands = list(filter.brands);
    if (brands.length && !brands.includes(text(product.brand))) {
      return false;
    }

    if (text(filter.segment) && text(product.segment) !== text(filter.segment)) {
      return false;
    }

    if (text(filter.condition) && text(product.condition) !== text(filter.condition)) {
      return false;
    }

    return true;
  }

  function countProducts(filter) {
    const products = Array.isArray(window.MIDORI_CATALOG?.products)
      ? window.MIDORI_CATALOG.products
      : [];
    return products.filter(product => matchesFilter(product, filter)).length;
  }

  function applyCard(card, key) {
    const config = cardsConfig[key];
    if (!card || !config) return;

    const copy = card.querySelector(".editorial-edit-copy");
    const media = card.querySelector(".editorial-edit-media");
    if (!copy) return;

    setText(copy.querySelector(":scope > span"), config.kicker);
    setText(copy.querySelector("h3"), config.title);
    setText(copy.querySelector("p"), config.description);

    const href = text(config.href);
    const title = text(config.title);

    if (media && href) {
      media.setAttribute("href", href);
      if (title) media.setAttribute("aria-label", `Jelajahi ${title}`);
    }

    const actions = copy.querySelector(".editorial-edit-actions");
    const collectionLink = actions?.querySelector("a");
    if (collectionLink) {
      if (href) collectionLink.setAttribute("href", href);

      const customLabel = text(config.collectionText);
      if (customLabel) {
        collectionLink.innerHTML = `${escapeHtml(customLabel)} <b>↗</b>`;
      } else if (config.filter && typeof config.filter === "object") {
        const count = countProducts(config.filter);
        collectionLink.innerHTML = `Jelajahi ${count.toLocaleString("id-ID")} produk <b>↗</b>`;
      }
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function applyCards() {
    const grid = document.querySelector("#editorialEditGrid");
    if (!grid) return false;

    const cards = [...grid.querySelectorAll(".editorial-edit-card")];
    if (!cards.length) return false;

    cardKeys.forEach((key, index) => applyCard(cards[index], key));
    return true;
  }

  function applyAll() {
    applySectionHeading();
    applyCards();
  }

  function start() {
    applyAll();

    const grid = document.querySelector("#editorialEditGrid");
    if (grid) {
      const observer = new MutationObserver(() => {
        applyCards();
      });
      observer.observe(grid, { childList: true });
    }

    window.addEventListener("load", applyAll, { once: true });
    [0, 250, 750, 1500].forEach(delay => window.setTimeout(applyAll, delay));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
