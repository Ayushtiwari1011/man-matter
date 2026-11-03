"use strict";
const $ = (id) => document.getElementById(id);
const E = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (n) => "₹" + Number(n).toLocaleString("en-IN");
const ICONS = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  cart: '<path d="M2 3h3l3 13h11l3-9H6"/><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>',
  user: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="9" r="3"/><path d="M5 20c1-7 13-7 14 0"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
  shield:
    '<path d="m12 2 9 4v7c0 5-9 9-9 9s-9-4-9-9V6l9-4Z"/><path d="m8 11 3 3 5-5"/>',
  arrow: '<path d="M3 12h18m-7-7 7 7-7 7"/>',
  back: '<path d="M21 12H3m7-7-7 7 7 7"/>',
  chat: '<path d="M21 11a9 9 0 0 1-9 9H5l-4 2 2-6a9 9 0 1 1 18-5Z"/><path d="M7 11h.1m5 0h.1m5 0h.1"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="17" rx="3"/><path d="M7 2v6m10-6v6M3 11h18"/>',
  heart: '<path d="M12 21 3 12a6 6 0 0 1 9-8 6 6 0 0 1 9 8Z"/>',
  close: '<path d="m5 5 14 14M5 19 19 5"/>',
  filter: '<path d="M3 6h18M6 12h12M9 18h6"/>',
};
const icon = (n, s = 20) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ICONS.check}</svg>`;
function defaults() {
  return {
    version: 2,
    user: null,
    category: "all",
    concern: "all",
    stage: "all",
    price: "all",
    sort: "recommended",
    cart: [],
    lastCategory: "hair",
    coupon: false,
    payment: "prepaid",
    orders: [],
    reviews: [],
    assessment: {
      answers: Array(6).fill(null),
      step: 0,
      photo: null,
      photoConsent: false,
      result: null,
      version: 0,
    },
    rx: { status: "none", slot: null },
    promo: true,
    undo: null,
  };
}
let W,
  storageOK = true;
try {
  const saved = JSON.parse(localStorage.getItem("mm-storefront-v2"));
  W = saved?.version === 2 ? saved : defaults();
} catch (e) {
  W = defaults();
  storageOK = false;
}
let toastTimer,
  modalFocus,
  selectedStars = 0,
  selectedSlot = "",
  photoDraft = null,
  searchDraft = "";
const product = (id) => PRODUCTS.find((p) => p.id === id);
function variant(p, id) {
  return (
    p.variants?.find((v) => v.id === id) ||
    p.variants?.[0] || {
      id: "standard",
      name: "Standard",
      price: p.price,
      mrp: p.mrp,
      amount: p.amount,
      short: p.amount,
    }
  );
}
function save() {
  try {
    localStorage.setItem("mm-storefront-v2", JSON.stringify(W));
  } catch (e) {
    storageOK = false;
  }
}
function route() {
  const [path, query = ""] = (location.hash.slice(1) || "shop").split("?");
  return { path, q: new URLSearchParams(query) };
}
function url(path, params = {}) {
  const s = new URLSearchParams(params).toString();
  return "#" + path + (s ? "?" + s : "");
}
function go(path, params = {}) {
  const next = url(path, params);
  if (location.hash === next) render();
  else location.hash = next;
}
function say(text, undo = false) {
  clearTimeout(toastTimer);
  $("toast-root").innerHTML =
    `<div class="toast"><span>${E(text)}</span>${undo ? '<button data-act="undo">Undo</button>' : ""}</div>`;
  $("live").textContent = text;
  toastTimer = setTimeout(() => {
    $("toast-root").innerHTML = "";
  }, 6000);
}
function modal(title, body, actions = "", wide = false) {
  modalFocus = document.activeElement;
  $("modal-root").innerHTML =
    `<div class="modal-overlay" id="modal-overlay"><section class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="modal-head"><h2 id="dialog-title">${E(title)}</h2><button class="icon-button" data-act="close" aria-label="Close dialog">${icon("close", 17)}</button></div><div class="modal-body">${body}</div>${actions ? `<div class="modal-actions">${actions}</div>` : ""}</section></div>`;
  document.querySelector(".modal button")?.focus();
}
function closeModal() {
  $("modal-root").innerHTML = "";
  photoDraft = null;
  modalFocus?.focus?.();
}
function totals() {
  let subtotal = 0,
    mrp = 0,
    count = 0;
  W.cart.forEach((i) => {
    const p = product(i.id);
    if (!p) return;
    const v = variant(p, i.variant);
    subtotal += v.price * i.qty;
    mrp += v.mrp * i.qty;
    count += i.qty;
  });
  const eligible = subtotal >= 1499 && W.payment === "prepaid";
  const discount =
    W.coupon && eligible ? Math.min(150, Math.round(subtotal * 0.1)) : 0;
  return {
    subtotal,
    mrp,
    count,
    eligible,
    discount,
    fee: count ? 9 : 0,
    total: subtotal - discount + (count ? 9 : 0),
    saving: mrp - subtotal + discount,
  };
}
function ranked(query) {
  const raw = query.trim().toLowerCase(),
    q = raw.replace(/\bminoxdil\b/g, "minoxidil"),
    tokens = q.split(/\s+/).filter(Boolean);
  if (!q) return [];
  return PRODUCTS.map((p) => {
    const title = p.name.toLowerCase(),
      aliases = (p.aliases || []).join(" ").toLowerCase(),
      terms = title + " " + aliases + " " + p.category + " " + p.concern;
    let score =
      title === q
        ? 1000
        : title.startsWith(q)
          ? 700
          : title.includes(q)
            ? 500
            : 0;
    const all = tokens.every((t) => terms.includes(t));
    if (all) score += 300;
    for (const t of tokens) {
      if (title.includes(t)) score += 40;
      if (aliases.includes(t)) score += 25;
    }
    if (tokens.includes("beard") && p.category !== "beard") score = 0;
    if (tokens.includes("hair") && p.category !== "hair") score = 0;
    return { p, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}
function priceMatch(n) {
  return (
    W.price === "all" ||
    (W.price === "under500"
      ? n < 500
      : W.price === "500to999"
        ? n >= 500 && n <= 999
        : n >= 1000)
  );
}
function listingVariant(p) {
  return p.variants?.find((v) => priceMatch(v.price)) || variant(p);
}
function filtered() {
  let list = PRODUCTS.filter(
    (p) =>
      (W.category === "all" || p.category === W.category) &&
      (W.concern === "all" || p.concern === W.concern) &&
      (W.stage === "all" || p.stage === W.stage) &&
      (p.variants
        ? p.variants.some((v) => priceMatch(v.price))
        : priceMatch(p.price)),
  );
  if (W.sort === "price-asc")
    list.sort((a, b) => listingVariant(a).price - listingVariant(b).price);
  if (W.sort === "price-desc")
    list.sort((a, b) => listingVariant(b).price - listingVariant(a).price);
  if (W.sort === "rating") list.sort((a, b) => b.rating - a.rating);
  return list;
}
function relevantProducts() {
  const cats = [
    ...new Set(W.cart.map((i) => product(i.id)?.category).filter(Boolean)),
  ];
  if (!cats.length) cats.push(W.lastCategory || "hair");
  return PRODUCTS.filter(
    (p) =>
      cats.includes(p.category) && !p.rx && !W.cart.some((i) => i.id === p.id),
  ).slice(0, 3);
}
function eligibleReview(id) {
  return (
    !!W.user &&
    W.orders.some(
      (o) =>
        o.owner === W.user &&
        o.status === "delivered" &&
        o.items.some((i) => i.id === id),
    )
  );
}
function art(p, v = variant(p), large = false) {
  const brown = p.category === "nutrition",
    ink = brown ? "#32271f" : "#173a64",
    base = brown ? "#e6d5bd" : "#eff4f7",
    title =
      p.id === "stage1-kit"
        ? "HAIR CARE"
        : p.id === "hair-gummies"
          ? "HAIR GUMMIES"
          : p.id === "shilajit"
            ? "SHILAJIT"
            : p.id === "beard-oil"
              ? "BEARD OIL"
              : p.id === "minoxifin"
                ? "HAIR TREATMENT"
                : p.id === "magnesium-oil"
                  ? "MAGNESIUM"
                  : "SCALP CARE";
  let shape =
    p.kind === "jar"
      ? `<ellipse cx="110" cy="195" rx="68" ry="11" fill="#000" opacity=".07"/><rect x="55" y="60" width="110" height="135" rx="18" fill="${ink}"/><rect x="53" y="42" width="114" height="36" rx="8" fill="#fff" stroke="#d8d6d2"/><path d="M61 49h97m-97 6h97" stroke="#e6e5e1"/><rect x="58" y="90" width="104" height="85" fill="${base}"/><text x="110" y="116" text-anchor="middle" font-size="10" font-weight="700" fill="${ink}">man. matters</text><text x="110" y="137" text-anchor="middle" font-size="12" font-weight="800" fill="${ink}">${title}</text><text x="110" y="155" text-anchor="middle" font-size="7" fill="${ink}">${E(v.short || "GUMMIES")}</text>`
      : p.kind === "box" || p.kind === "kit"
        ? `<ellipse cx="110" cy="205" rx="59" ry="8" fill="#000" opacity=".07"/><path d="m63 35 103 4v160l-103-6Z" fill="${base}" stroke="#cfdae4"/><path d="m166 39 11 11v152l-11-3Z" fill="#b4c6d8"/><path d="m63 92 103 3v104l-103-6Z" fill="${ink}"/><text x="78" y="59" font-size="14" fill="${ink}" font-weight="800">man.</text><text x="78" y="72" font-size="14" fill="${ink}" font-weight="800">matters</text><text x="114" y="122" text-anchor="middle" font-size="12" font-weight="800" fill="white">${title.split(" ")[0]}</text><text x="114" y="138" text-anchor="middle" font-size="12" font-weight="800" fill="white">${title.split(" ").slice(1).join(" ")}</text><text x="114" y="166" text-anchor="middle" font-size="7" fill="#d8e3ef">${p.kind === "kit" ? "DEMO PACK OPTION" : E(v.amount)}</text>${p.kind === "kit" ? '<rect x="30" y="122" width="35" height="76" rx="5" fill="#c29455"/><rect x="37" y="101" width="20" height="28" rx="3" fill="#28323a"/><rect x="34" y="146" width="27" height="29" fill="#f1f5f7"/><text x="47" y="158" text-anchor="middle" font-size="5" fill="#173a64">SERUM</text>' : ""}`
        : `<ellipse cx="110" cy="207" rx="49" ry="8" fill="#000" opacity=".07"/><rect x="74" y="75" width="72" height="126" rx="13" fill="${p.kind === "dropper" ? "#be965e" : "#f7f9fb"}" stroke="#d2dae1"/><rect x="88" y="42" width="44" height="48" rx="6" fill="${p.kind === "dropper" ? "#26343b" : "#d9e3ed"}"/><rect x="78" y="112" width="64" height="66" fill="${ink}"/><text x="110" y="131" text-anchor="middle" font-size="7" fill="white" font-weight="700">man. matters</text><text x="110" y="150" text-anchor="middle" font-size="7" fill="white" font-weight="700">${title}</text><text x="110" y="163" text-anchor="middle" font-size="5" fill="#dce7f2">${E(p.amount?.split(" · ")[0] || "DEMO")}</text>`;
  return `<svg viewBox="0 0 220 230" role="img" aria-label="${E(p.name)} illustrative packaging"><title>${E(p.name)} · illustrative packaging</title>${shape}</svg>`;
}
function scalp(index = 0) {
  return `<svg viewBox="0 0 140 160" role="img" aria-label="Hairline illustration ${index + 1}"><path d="M42 140v-23h56v23" fill="#d5aa8d"/><ellipse cx="70" cy="77" rx="44" ry="57" fill="#e1baa0"/><path d="M26 77c-9-70 88-82 88-4l-10-29-18-9-18 9-25-9Z" fill="#3b332d"/><path d="${["M34 45Q70 26 106 45", "M34 45 50 67Q70 27 90 67L106 45", "M34 45 50 86 69 45 91 86 106 45", "M34 45 48 98 70 73 94 98 106 45"][index]}" fill="#e1baa0"/><path d="M46 83h11m26 0h11" stroke="#5a4436" stroke-width="3" stroke-linecap="round"/><path d="M59 114q11 5 23-1" stroke="#aa7e67" fill="none"/><path d="M48 140h44l21 15H28Z" fill="#244d76"/></svg>`;
}
function header() {
  const r = route(),
    count = totals().count;
  return `${W.promo ? '<div class="promo">A connected shopping and care experience · Independent assignment prototype<button data-act="dismiss-promo" aria-label="Dismiss banner">×</button></div>' : ""}<header class="nav-shell"><div class="wrap nav"><a class="brand" href="#shop" aria-label="Man Matters prototype home">man.<span>matters</span></a><nav class="navlinks" aria-label="Main navigation"><a href="#shop" class="${r.path === "shop" ? "active" : ""}">All products</a><a href="#assessment" class="${r.path === "assessment" ? "active" : ""}">Hair assessment</a><a href="#reports">Honest reports</a><a href="care.html">My Care</a><a href="#fixes" class="${r.path === "fixes" ? "active" : ""}">Website fixes <span class="pill">15</span></a></nav><div class="nav-actions"><a class="icon-button" href="#search" aria-label="Search products">${icon("search")}</a><button class="icon-button" data-act="account" aria-label="${W.user ? "Demo account and orders" : "Sign in to the demo account"}">${icon("user")}</button><a class="icon-button" href="#cart" aria-label="Cart, ${count} items">${icon("cart")}${count ? `<span class="cart-count">${count}</span>` : ""}</a></div></div></header><div class="prototypebar"><div class="wrap"><span><i class="proto-dot"></i>UPDATED PROTOTYPE · Website fixes + WhatsApp care</span><div class="proto-links"><a href="#fixes" class="proto-fixes-badge"><span class="fixes-count">15</span> Website Fixes</a><a href="care.html" class="btn-try-care">Try MY CARE →</a><button class="proto-restart" data-act="restart-tour" style="display:none">↻ Restart</button></div></div></div>`;
}
function footer() {
  return `<footer class="footer" id="site-footer"><div class="wrap"><div class="links"><div><span class="footer-brand">man. matters</span><span>Thoughtful care. Every step.</span><small>Independent placement concept</small></div><div><strong>Discover</strong><a href="#shop">All products</a><a href="#assessment">Hair assessment</a><a href="#search">Search</a></div><div><strong>Your care</strong><a href="care.html">My Care & WhatsApp demo</a><a href="#orders">My orders</a><a href="#support">Get support</a></div><div><strong>Transparency</strong><a href="#reports">Batch reports</a><a href="#fixes">Website fixes</a><button class="text-btn" data-act="privacy" style="text-align:left;padding:0">Privacy & demo notes</button></div></div><div class="footer-bottom"><span>© 2020–${new Date().getFullYear()} Mosaic Wellness · Brand reference for this independent prototype.</span><span>Fictional records, illustrative packaging and demo prices. No real transactions.</span></div></div></footer>`;
}
function filters() {
  const radios = (key, items) =>
    items
      .map(
        ([v, l]) =>
          `<label class="radio-row"><input type="radio" name="${key}" value="${v}" data-filter="${key}" ${W[key] === v ? "checked" : ""}>${l}</label>`,
      )
      .join("");
  return `<aside class="filters" aria-label="Product filters"><div class="row between"><strong>${icon("filter", 17)} Filters</strong><button class="text-btn" data-act="clear-filters">Clear</button></div><fieldset><legend>Category</legend>${radios(
    "category",
    [
      ["all", "All categories"],
      ["hair", "Hair care"],
      ["beard", "Beard care"],
      ["nutrition", "Nutrition"],
    ],
  )}</fieldset><fieldset><legend>Concern</legend><select aria-label="Filter by concern" data-filter="concern">${[
    ["all", "All concerns"],
    ["hairfall", "Hair fall / thinning"],
    ["dandruff", "Scalp / dandruff"],
    ["beard", "Beard care"],
    ["wellness", "Wellness"],
  ]
    .map(
      ([v, l]) =>
        `<option value="${v}" ${W.concern === v ? "selected" : ""}>${l}</option>`,
    )
    .join(
      "",
    )}</select></fieldset><fieldset><legend>Assessment fit</legend><select aria-label="Filter by stage" data-filter="stage">${[
    ["all", "All stage labels"],
    ["1", "Stage 1 example"],
    ["review", "Clinician review"],
  ]
    .map(
      ([v, l]) =>
        `<option value="${v}" ${W.stage === v ? "selected" : ""}>${l}</option>`,
    )
    .join("")}</select></fieldset><fieldset><legend>Price</legend>${radios(
    "price",
    [
      ["all", "Any price"],
      ["under500", "Under ₹500"],
      ["500to999", "₹500–₹999"],
      ["1000plus", "₹1,000 or more"],
    ],
  )}</fieldset></aside>`;
}
function productCard(p) {
  const v = route().path === "shop" ? listingVariant(p) : variant(p);
  return `<article class="product-card ${p.category}"><a href="${url("product", { id: p.id, v: v.id })}" class="product-art">${art(p)}</a><div class="product-info"><div><span class="pill ${p.rx ? "amber" : ""}">${p.rx ? "Clinician review required" : p.stage === "1" ? "Stage 1 · demo fit" : p.category === "nutrition" ? "Nutrition" : "Daily care"}</span></div><a href="${url("product", { id: p.id, v: v.id })}"><h3>${E(p.name)}</h3></a><p>${E(p.desc)}</p><div class="rating">★ <b>${p.rating}</b> <span class="muted">· illustrative rating</span></div><div><span class="price">${p.variants && W.price === "all" ? "<small>From </small>" : ""}${money(v.price)}</span><span class="mrp">${money(v.mrp)}</span></div><a class="btn ${p.rx ? "" : "primary"}" href="${url("product", { id: p.id, v: v.id })}">${p.rx ? "View review requirements" : p.variants ? "Choose & compare options" : "View product"} ${icon("arrow", 13)}</a></div></article>`;
}
function shopPage() {
  const list = filtered();
  return `<div class="wrap"><section class="hero"><div><div class="eyebrow">Your needs. A clearer next step.</div><h1 style="margin-top:11px">Find the right care<br>for your routine.</h1><p>Explore products, understand your options and keep your care going after checkout.</p><div class="row flex-wrap"><a class="btn primary" href="#assessment">Take the hair assessment ${icon("arrow", 16)}</a><a class="btn" href="#fixes">See the 15 website fixes</a></div></div><div class="hero-art" aria-label="Illustrative hair-care packaging"><div class="mini-box">man.<br>matters<em>SCALP<br>CARE</em></div><div class="mini-box">man.<br>matters<em>HAIR<br>GUMMIES</em></div><div class="mini-box">man.<br>matters<em>DAILY<br>ROUTINE</em></div><div class="hero-art-caption">Illustrative packaging · independent prototype</div></div></section><div class="feature-strip"><a href="#fixes">${icon("shield", 23)}<span><strong>Website issues, visibly addressed</strong><small>Compare the original issue and try the fix</small></span></a><a href="#reports">${icon("check", 23)}<span><strong>Clearer product information</strong><small>Options, safety and batch-report access</small></span></a><a href="care.html">${icon("chat", 23)}<span><strong>Care that follows through</strong><small>WhatsApp replies → website calendar</small></span></a></div><div class="row between" style="margin-bottom:22px"><h2>Explore all products</h2><a href="#search" class="text-btn">${icon("search", 15)} Search the catalogue</a></div><section class="layout">${filters()}<div><div class="catalog-top"><div><strong>${list.length} product${list.length === 1 ? "" : "s"}</strong><br><small class="muted">Matching your filters · demo catalogue</small></div><select data-filter="sort" aria-label="Sort products">${[
    ["recommended", "Recommended"],
    ["price-asc", "Price: low to high"],
    ["price-desc", "Price: high to low"],
    ["rating", "Highest rated"],
  ]
    .map(
      ([v, l]) =>
        `<option value="${v}" ${W.sort === v ? "selected" : ""}>${l}</option>`,
    )
    .join(
      "",
    )}</select></div>${list.length ? `<div class="product-grid">${list.map(productCard).join("")}</div>` : `<div class="empty"><h3>No products match these filters</h3><p>Try a wider price range or clear the selected filters.</p><button class="btn primary" data-act="clear-filters">Clear filters</button></div>`}</div></section></div>`;
}
function searchPage(q) {
  const found = ranked(q),
    typo = /\bminoxdil\b/i.test(q);
  return `<section class="wrap search-page"><div class="eyebrow">Find your care</div><h1 style="margin:10px 0 22px">What are you looking for?</h1><div class="search-wrap"><form class="search-form" id="search-form"><input id="search-input" type="search" autocomplete="off" value="${E(q)}" placeholder="Try “beard oil” or “hair gummies”" aria-label="Search products"><button class="btn primary" type="submit">Search</button></form><div id="search-suggestions"></div></div><p class="small">Popular: <a href="${url("search", { q: "beard oil" })}">beard oil</a> · <a href="${url("search", { q: "hair gummies" })}">hair gummies</a> · <a href="${url("search", { q: "minoxdil" })}">try a typo</a></p><div class="search-results">${q ? `${typo ? '<div class="result-note">Showing matches for <strong>minoxidil</strong>. Your original query was “minoxdil”.</div>' : ""}<h2 style="font-size:23px;margin-bottom:20px">${found.length} result${found.length === 1 ? "" : "s"} for “${E(q)}”</h2>${found.length ? `<div class="product-grid">${found.map(productCard).join("")}</div>` : `<div class="empty">${icon("search", 35)}<h2 style="margin-top:15px">No products found</h2><p>We couldn’t find a match for “${E(q)}”. Check the spelling, try a simpler term, or browse by category.</p><div class="row flex-wrap" style="justify-content:center"><a class="btn primary" href="${url("search", { q: "hair" })}">Explore hair care</a><a class="btn" href="#shop">Browse all products</a></div></div>`}` : `<div class="callout"><strong>Search by product or concern</strong><p>Suggestions update as you type. Press Enter or Search for the full results page.</p></div>`}</div></section>`;
}
function searchSuggestions(query) {
  const box = $("search-suggestions");
  if (!box) return;
  if (!query.trim()) {
    box.innerHTML = "";
    return;
  }
  const list = ranked(query).slice(0, 4);
  box.innerHTML = `<div class="suggestions"><div class="suggestion-label">${list.length ? "Matching products" : "No matching products"}</div>${list.length ? list.map((p) => `<a href="${url("product", { id: p.id })}">${art(p)}<span>${E(p.name)}<small class="muted" style="display:block">${p.category === "beard" ? "Beard care" : p.category === "hair" ? "Hair care" : "Nutrition"}</small></span></a>`).join("") : `<p style="padding:5px 12px;font-size:12px">Try “beard oil” or “hair gummies”. Previous results have been cleared.</p>`}<a href="${url("search", { q: query })}" style="border-top:1px solid var(--line);font-size:12px">See full results for “${E(query)}” ${icon("arrow", 14)}</a></div>`;
}
function variantCompare(p) {
  if (!p.variants) return "";
  return `<table class="detail-table"><thead><tr><th>Option</th><th>What changes</th><th>Price</th></tr></thead><tbody>${p.variants.map((v) => `<tr><td>${v.name}</td><td>${v.amount}</td><td>${money(v.price)}</td></tr>`).join("")}</tbody></table><p class="notice">Illustrative catalogue configuration for this prototype. Pack contents and formulation values need verified company data before production.</p>`;
}
function reviewsBlock(p) {
  const all = [
      ...DEMO_REVIEWS.filter((r) => r.product === p.id),
      ...W.reviews.filter((r) => r.product === p.id),
    ],
    ok = eligibleReview(p.id);
  return `<div class="row between flex-wrap"><div><h3>Customer reviews</h3><p class="small">${all.length} sample review${all.length === 1 ? "" : "s"} · positive and critical feedback</p></div><button class="btn compact" data-act="write-review" data-id="${p.id}">${ok ? "Write / edit your review" : "Check review eligibility"}</button></div><div class="callout ${ok ? "green" : ""}" style="margin-top:15px"><strong>${ok ? "Matching delivered purchase found" : W.user ? "No delivered purchase for this product" : "Sign in to verify your purchase"}</strong><p>${ok ? "You can share an honest review, including a low rating." : "A review is tied to the signed-in customer, this product and a delivered order. Browsing a product alone does not unlock the form."}</p></div>${all.map((r) => `<article class="review"><div class="row between"><strong class="small">${E(r.author || "Demo member")}</strong><span class="pill green">Verified demo purchase</span></div><div class="stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div><h3>${E(r.title || "Your product experience")}</h3><p>${E(r.text)}</p><small class="muted">Fictional demo review · not a live customer testimonial</small></article>`).join("") || "<p>No sample reviews for this product yet. Purchase verification still applies.</p>"}`;
}
function productPage(params) {
  const p = product(params.get("id")) || PRODUCTS[0],
    v = variant(p, params.get("v")),
    section = params.get("section") || "details",
    photo = params.get("image") || "pack";
  const gate = p.rx && W.rx.status !== "approved_demo";
  const mainArt =
    photo === "pack"
      ? art(p, v, true)
      : photo === "compare"
        ? `<div style="padding:10px"><h2>${p.variants ? "What’s different?" : "What’s in your pack?"}</h2>${p.variants ? variantCompare(p) : `<p>${E(p.name)} · ${E(v.amount)}</p><p class="notice">Illustrative packaging. Consult the verified pack label for ingredients and directions.</p>`}</div>`
        : `<div style="padding:15px;text-align:left"><span class="eyebrow">Clear before checkout</span><h2 style="margin:12px 0">Know your next step.</h2><p>${p.rx ? "A clinician review is required in this demo before this product can enter your cart." : "Follow the verified pack label or a clinician’s instructions. Your tracker records your routine; it does not prescribe one."}</p><a class="btn" href="#support">Ask a question</a></div>`;
  let tabContent = "";
  if (section === "reviews") tabContent = reviewsBlock(p);
  else if (section === "quality")
    tabContent = `<h3>Check the report for your batch</h3><p>Use the batch printed on the pack to see whether a corresponding report is available.</p><a class="btn" href="${url("reports", { product: p.id })}">Find a batch report</a><p class="notice" style="margin-top:16px">A missing or unrecognised batch gets a support route. This demo does not issue lab certificates or make safety claims.</p>`;
  else if (section === "safety")
    tabContent = `<h3>${p.rx ? "Medicine: clinician review required" : "Use and suitability"}</h3><p>${p.rx ? "This is the review-required product example from your audit. Do not start or change a medicine based on this prototype. Review with a qualified clinician is required in the demonstrated purchase flow." : "Check the verified label for ingredients, allergens, sugar content and directions. Ask a qualified clinician if you have a health condition, take other medicines or are unsure about suitability."}</p><ul class="list"><li>Instructions must come from the verified label or clinician plan.</li><li>Report a concern directly; do not rely on public reviews for medical decisions.</li><li>Benefits and timelines vary. The interface makes no regrowth guarantee.</li></ul><div class="row flex-wrap"><button class="btn" data-act="health-concern">Report a concern</button><a class="btn" href="${p.rx ? "#clinic" : "care.html#care"}">Talk to a clinician</a></div>`;
  else
    tabContent = `<h3>Understand your choice</h3><p>${E(p.desc)}</p>${p.variants ? variantCompare(p) : `<table class="detail-table"><tr><th>Pack</th><td>${E(v.amount)}</td></tr><tr><th>Category</th><td>${E(p.category)}</td></tr><tr><th>Care access</th><td>${p.category === "hair" ? "Optional website routine tracker and demo consultation" : "Order help and product questions"}</td></tr></table>`}<p class="notice">Demo prices and illustrative product data. This is not an actual offer, prescription or claim of product effectiveness.</p>`;
  return `<div class="wrap with-sticky"><div class="bread"><a href="#shop">All products</a> / ${p.category} / ${E(p.name)}</div><section class="pdp"><div class="gallery"><div class="main-product-art ${p.category}">${mainArt}<p class="notice">Illustrative packaging · ${E(v.name)} · ${E(v.amount || "demo pack")}</p></div><div class="gallery-thumbs">${[
    ["pack", "Product view"],
    ["compare", p.variants ? "Compare options" : "Pack details"],
    ["routine", "Use & support"],
  ]
    .map(
      ([k, l]) =>
        `<button data-act="product-image" data-image="${k}" class="${photo === k ? "selected" : ""}">${l}</button>`,
    )
    .join(
      "",
    )}</div></div><div><span class="eyebrow">${p.category === "hair" ? "Your hair-care routine" : p.category === "beard" ? "Care for your beard" : "Everyday wellness"}</span><h1>${E(p.name)}${p.variants ? " · " + E(v.name) : ""}</h1><p class="small">${E(p.desc)}</p><div class="row flex-wrap"><span class="price">${money(v.price)}</span><span class="mrp" style="margin:0">${money(v.mrp)}</span><span class="pill">${Math.round(((v.mrp - v.price) / v.mrp) * 100)}% demo saving</span></div><p class="small">Tax included in demo price · ₹9 handling shown in cart</p><div class="row flex-wrap"><span class="rating">★ <b>${p.rating}</b> · illustrative rating</span><a class="text-btn" href="${url("product", { id: p.id, v: v.id, section: "reviews" })}">Read sample reviews</a></div>${p.variants ? `<label class="field-label">Choose your option</label><div class="choices">${p.variants.map((x) => `<button class="choice ${v.id === x.id ? "active" : ""}" data-act="variant" data-variant="${x.id}">${E(x.name)}<small>${E(x.short)} · ${money(x.price)}</small></button>`).join("")}</div><p class="notice" style="margin-top:10px">${E(v.amount)}. Details, imagery and cart update from this selected option.</p>` : ""}${p.stage === "1" ? '<div class="callout green spacer"><strong>Stage 1 example</strong><p>This label is consistent with the demonstration assessment. It is not a clinical diagnosis or a prescription.</p></div>' : ""}${p.rx ? `<div class="callout amber spacer"><strong>${gate ? "Clinician review comes first" : "Demo clinician approval recorded"}</strong><p>${gate ? "This product cannot be added through product cards, search or the cart until the simulated review is complete." : "This approval is fictional and only unlocks this prototype. It is not a real prescription."}</p></div>` : ""}<div class="pdp-actions"><button class="btn ${gate ? "primary" : "black"}" data-act="${gate ? "request-review" : "add"}" data-id="${p.id}" data-variant="${v.id}">${gate ? "Request clinician review" : "Add to cart"}</button>${gate ? "" : `<button class="btn primary" data-act="buy" data-id="${p.id}" data-variant="${v.id}">Buy now</button>`}</div><div class="row between small"><span>${icon("shield", 15)} Verified-purchase review checks</span><a href="#support">Order help</a></div><div class="tabs" role="tablist" aria-label="Product information">${[
    ["details", "Details"],
    ["safety", "Use & safety"],
    ["quality", "Quality & reports"],
    ["reviews", "Reviews"],
  ]
    .map(
      ([k, l]) =>
        `<button role="tab" aria-selected="${section === k}" data-act="product-section" data-section="${k}" class="${section === k ? "active" : ""}">${l}</button>`,
    )
    .join(
      "",
    )}</div><section class="tab-content">${tabContent}</section></div></section><section class="section"><div class="callout"><strong>Need a clearer picture before you choose?</strong><p>Compare pack options, check the batch-report flow or speak with the care team. A progress tracker records consistency; it cannot guarantee a result.</p></div></section></div><div class="sticky-buy"><div class="wrap"><strong>${E(p.name)} · ${E(v.name)}</strong><span class="price">${money(v.price)}</span><button class="btn primary" data-act="${gate ? "request-review" : "add"}" data-id="${p.id}" data-variant="${v.id}">${gate ? "Request clinician review" : "Add to cart"}</button><a class="btn" href="#cart">View cart</a></div></div>`;
}
function cartRows() {
  return W.cart
    .map((i) => {
      const p = product(i.id),
        v = variant(p, i.variant);
      return `<article class="cart-line"><a class="cart-art" href="${url("product", { id: p.id, v: v.id })}">${art(p, v)}</a><div><h3 style="font-size:15px">${E(p.name)}</h3><p class="small">${E(v.name)} · ${E(v.amount || "demo pack")}</p>${p.rx ? '<span class="pill amber">Demo clinician approval required</span>' : ""}<button class="text-btn" data-act="remove" data-key="${i.key}" style="display:block;font-size:11px">Remove</button></div><div class="cart-price"><div class="qty"><button data-act="quantity" data-key="${i.key}" data-delta="-1" aria-label="Reduce ${E(p.name)} quantity">−</button><span>${i.qty}</span><button data-act="quantity" data-key="${i.key}" data-delta="1" aria-label="Increase ${E(p.name)} quantity" ${i.qty >= 5 ? "disabled" : ""}>+</button></div><div class="notice">${i.qty === 5 ? "Maximum 5 per order" : "Max 5 per order"}</div><div><span class="price">${money(v.price * i.qty)}</span></div><small class="muted">${money(v.price)} each</small></div></article>`;
    })
    .join("");
}
function summary(checkout = false) {
  const t = totals();
  return `<aside class="card summary"><h2 style="font-size:21px">Order summary</h2><div class="line"><span>Items at list price</span><span>${money(t.mrp)}</span></div><div class="line"><span>Item savings</span><span class="discount">−${money(t.mrp - t.subtotal)}</span></div><div class="line"><span>Subtotal (${t.count} items)</span><strong>${money(t.subtotal)}</strong></div><div class="line"><span>Coupon ${t.discount ? "SAVE10" : ""}</span><span class="discount">${t.discount ? "−" + money(t.discount) : "Not applied"}</span></div><div class="line"><span>Handling</span><span>${money(t.fee)}</span></div><div class="line"><span>Delivery · demo</span><span>₹0</span></div><div class="line total"><span>Order total</span><span>${money(t.total)}</span></div><p class="small discount">You save ${money(t.saving)} in this demo.</p>${checkout ? '<button class="btn primary full" data-act="place-order">Place demo order</button><p class="notice" style="margin-top:12px">No payment details needed. This does not charge money or place a real order.</p>' : `<a class="btn primary full" href="#checkout">Continue to checkout ${icon("arrow", 15)}</a><p class="notice" style="margin-top:12px">All charges are visible before you continue.</p>`}</aside>`;
}
function couponBlock() {
  const t = totals(),
    remaining = Math.max(0, 1499 - t.subtotal);
  return `<div class="card"><div class="row between flex-wrap"><h3>${t.discount ? "SAVE10 applied" : remaining ? `Add ${money(remaining)} to reach the offer minimum` : W.payment !== "prepaid" ? "Choose prepaid to use SAVE10" : "SAVE10 is available"}</h3><span class="pill">${t.discount ? "Saving " + money(t.discount) : "Up to ₹150 off"}</span></div><p class="small">10% off eligible prepaid orders of ₹1,499 or more, capped at ₹150. No login is required to apply the demo offer.</p><div class="progress-track"><span style="width:${Math.min(100, (t.subtotal / 1499) * 100)}%"></span></div><div class="row between flex-wrap"><span class="small">${money(t.subtotal)} of ₹1,499 minimum</span><button class="btn compact ${t.discount ? "" : "primary"}" data-act="${t.discount ? "remove-coupon" : "apply-coupon"}" ${!t.eligible && !t.discount ? "disabled" : ""}>${t.discount ? "Remove coupon" : "Apply SAVE10"}</button></div><p class="notice" style="margin-top:10px">The order total changes only after the coupon is applied. Eligibility is checked again if your cart or payment method changes.</p></div>`;
}
function cartPage() {
  if (!W.cart.length)
    return `<div class="wrap section"><div class="heading"><h1>Your cart</h1></div><div class="empty">${icon("cart", 38)}<h2 style="margin-top:15px">Your cart is empty</h2><p>Continue your wellness journey. Find the care that fits your needs, or restore the item you just removed.</p><div class="row flex-wrap" style="justify-content:center"><button class="btn primary" data-act="continue-shopping">Continue shopping</button>${W.undo ? '<button class="btn" data-act="undo">Restore removed item</button>' : ""}</div></div><section class="section"><h3 style="margin-bottom:17px">Explore ${W.lastCategory === "hair" ? "hair care" : W.lastCategory === "beard" ? "beard care" : "your category"}</h3><div class="product-grid">${relevantProducts().map(productCard).join("")}</div></section></div>`;
  return `<div class="wrap section"><div class="heading row between"><div><h1>Your cart</h1><p>${totals().count} items · review your options and total</p></div><a href="#shop" class="text-btn">Continue shopping</a></div><div class="cart-layout"><div class="stack"><div class="card">${cartRows()}</div><div class="card"><div class="row between flex-wrap"><h3>Payment preference</h3><span class="pill">Demo only</span></div><label class="radio-row"><input type="radio" name="pay" value="prepaid" data-payment ${W.payment === "prepaid" ? "checked" : ""}>Prepaid · eligible for SAVE10</label><label class="radio-row"><input type="radio" name="pay" value="cod" data-payment ${W.payment === "cod" ? "checked" : ""}>Pay on delivery · coupon does not apply</label></div>${couponBlock()}<div class="card"><h3>Relevant to your cart</h3><p class="small">Recommendations follow the categories you chose. Nothing is added automatically.</p><div class="recommendations" style="margin-top:17px">${
    relevantProducts()
      .map(
        (p) =>
          `<div class="mini">${art(p)}<div style="flex:1"><strong class="small">${E(p.name)}</strong><p>${money(p.price)}</p></div><a class="btn" href="${url("product", { id: p.id })}">View</a></div>`,
      )
      .join("") ||
    '<p class="small">You have already explored the matching products.</p>'
  }</div></div></div>${summary()}</div></div>`;
}
function checkoutPage() {
  if (!W.cart.length) return cartPage();
  return `<div class="wrap section"><div class="heading"><a class="back" href="#cart">← Back to cart</a><h1 style="margin-top:12px">A clear checkout.</h1><p>Try the full flow with fictional details. No real order is placed.</p></div><div class="cart-layout"><div class="stack"><div class="card"><div class="stepper"><span class="done">1 · Cart</span><span class="done">2 · Checkout</span><span>3 · Your care</span></div><h3>Demo delivery details</h3><p class="small">No personal name, phone number or street address is collected.</p><div class="field"><label for="checkout-location">Delivery location</label><select id="checkout-location"><option>Demo address · Kolkata 700025</option><option>Demo address · Bengaluru 560001</option></select></div><div class="callout"><strong>Guest checkout is available</strong><p>A fictional demo account and order history are created after purchase. Real customer identity verification is not connected.</p></div></div><div class="card"><h3>Your items</h3>${cartRows()}</div><div class="card"><h3>Stay connected, if you choose</h3><label class="check"><input type="checkbox" id="checkout-care-consent" ${W.checkoutConsent ? "checked" : ""}>I choose WhatsApp care reminders and progress check-ins. I can opt out at any time.</label><p class="notice">Care messages are optional and separate from marketing. In the prototype, the WhatsApp conversation is simulated inside the browser.</p><div class="field"><label for="checkout-payment">Payment preference</label><select id="checkout-payment" data-payment><option value="prepaid" ${W.payment === "prepaid" ? "selected" : ""}>Prepaid · simulated</option><option value="cod" ${W.payment === "cod" ? "selected" : ""}>Pay on delivery · simulated</option></select></div><button class="text-btn" data-act="payment-failure">Try a payment-failure state</button><div class="errors" id="checkout-error"></div></div>${couponBlock()}</div>${summary(true)}</div></div>`;
}
function addToCart(id, vid, buy = false) {
  const p = product(id);
  if (!p) return false;
  if (p.rx && W.rx.status !== "approved_demo") {
    modal(
      "A clinician review is required",
      "<p>This medicine example cannot enter the cart until the demo review is complete. Choosing a product does not count as clinical approval.</p>",
      '<button class="btn" data-act="close">Back</button><a class="btn primary" href="#clinic" data-act="close-link">Request a review</a>',
    );
    return false;
  }
  const v = variant(p, vid),
    key = p.id + ":" + v.id,
    old = W.cart.find((i) => i.key === key);
  if (old?.qty >= 5) {
    say("Maximum 5 of this option per order.");
    return false;
  }
  if (old) old.qty++;
  else W.cart.push({ key, id: p.id, variant: v.id, qty: 1 });
  W.lastCategory = p.category;
  save();
  if (buy) go("cart");
  else {
    render();
    say(E(p.name) + " added to your cart.");
  }
  return true;
}
function changeQuantity(key, delta) {
  const i = W.cart.find((x) => x.key === key);
  if (!i) return;
  if (i.qty + delta < 1) {
    removeItem(key);
    return;
  }
  if (i.qty + delta > 5) {
    say("Maximum 5 per order.");
    return;
  }
  i.qty += delta;
  if (!totals().eligible) W.coupon = false;
  save();
  render();
}
function removeItem(key) {
  const pos = W.cart.findIndex((i) => i.key === key);
  if (pos < 0) return;
  W.undo = { item: { ...W.cart[pos] }, position: pos };
  W.lastCategory = product(W.cart[pos].id).category;
  W.cart.splice(pos, 1);
  if (!totals().eligible) W.coupon = false;
  save();
  render();
  say("Item removed. You can undo this change.", true);
}
function undoRemove() {
  if (!W.undo) {
    say("There is no removed item to restore.");
    return;
  }
  const { item, position } = W.undo,
    existing = W.cart.find((i) => i.key === item.key);
  if (existing) existing.qty = Math.min(5, existing.qty + item.qty);
  else W.cart.splice(Math.min(position, W.cart.length), 0, item);
  W.undo = null;
  save();
  render();
  say("Item restored to your cart.");
}
function placeOrder() {
  if (!W.cart.length) return;
  if (
    W.cart.some((i) => product(i.id)?.rx && W.rx.status !== "approved_demo")
  ) {
    say("A medicine in this cart needs a clinician review.");
    go("clinic");
    return;
  }
  const t = totals(),
    o = {
      id: "DEMO-" + Date.now().toString(36).toUpperCase(),
      owner: W.user || "demo-member",
      status: "placed",
      items: W.cart.map((i) => ({ ...i })),
      total: t.total,
      coupon: t.discount,
      consent: !!$("checkout-care-consent")?.checked,
      location: $("checkout-location")?.value || "Demo delivery location",
      created: new Date().toISOString(),
    };
  W.user = o.owner;
  W.orders.unshift(o);
  W.cart = [];
  W.undo = null;
  W.coupon = false;
  W.checkoutConsent = false;
  save();
  go("confirmation", { order: o.id });
}
function orderById(id) {
  return W.orders.find((o) => o.id === id && o.owner === W.user);
}
function confirmationPage(id) {
  const o = orderById(id);
  if (!o) return ordersPage();
  const hasCare = o.items.some((i) =>
    ["hair-gummies", "stage1-kit"].includes(i.id),
  );
  return `<div class="wrap"><section class="card outcome"><div class="success-disc">${icon("check", 34)}</div><span class="eyebrow">Demo order confirmed</span><h1 style="margin:12px 0">Your next step is care.</h1><p>${E(o.id)} · ${money(o.total)} · ${o.status === "delivered" ? "Delivered in demo" : "Waiting for simulated delivery"}</p><div class="callout" style="text-align:left;margin:25px 0"><strong>WhatsApp care messages: ${o.consent ? "opted in" : "not enabled"}</strong><p>${o.consent ? "You can change this preference in My Care." : "Your care calendar works without WhatsApp. Opt in later only if you want reminders."}</p></div><div class="row flex-wrap" style="justify-content:center">${o.status !== "delivered" ? `<button class="btn primary" data-act="deliver-order" data-order="${o.id}">Simulate delivery</button>` : hasCare ? `<button class="btn primary" data-act="open-care-order" data-order="${o.id}">Start my care calendar ${icon("arrow", 15)}</button>` : `<a class="btn primary" href="#support">Get help with this product</a>`}<a class="btn" href="#orders">View my orders</a></div><p class="notice" style="margin-top:20px">${hasCare ? "The hair-gummies care routine starts after delivery and your chosen start date." : "The detailed care calendar in this prototype demonstrates the hair-gummies journey."} No payment, shipment or message has been sent.</p></section></div>`;
}
function ordersPage() {
  const orders = W.orders.filter((o) => o.owner === W.user);
  return `<div class="wrap section"><div class="heading"><h1>Your demo orders</h1><p>Delivery status controls product-review eligibility.</p></div>${
    !W.user
      ? `<div class="empty"><h2>Sign in to see your demo orders</h2><p>Use the fictional buyer account. No personal information is needed.</p><button class="btn primary" data-act="login">Try demo sign-in</button></div>`
      : orders.length
        ? `<div class="stack">${orders
            .map(
              (o) =>
                `<div class="card"><div class="row between flex-wrap"><div><h3>${E(o.id)}</h3><p class="small">${money(o.total)} · ${o.fixture ? "Illustrative existing purchase" : "Order created in this demo"}</p></div><span class="pill ${o.status === "delivered" ? "green" : "amber"}">${o.status === "delivered" ? "Delivered" : "Order placed"}</span></div>${o.items
                  .map((i) => {
                    const p = product(i.id),
                      v = variant(p, i.variant);
                    return `<div class="cart-line"><div class="cart-art">${art(p, v)}</div><div><strong>${E(p.name)}</strong><p class="small">${E(v.name)} · quantity ${i.qty}</p><button class="text-btn" data-act="write-review" data-id="${p.id}">${o.status === "delivered" ? "Write / edit a review" : "Review unlocks after delivery"}</button></div><a href="${url("product", { id: p.id, v: v.id })}" class="btn compact">View product</a></div>`;
                  })
                  .join(
                    "",
                  )}<div class="row flex-wrap">${o.status !== "delivered" ? `<button class="btn primary" data-act="deliver-order" data-order="${o.id}">Simulate delivery</button>` : o.items.some((i) => ["hair-gummies", "stage1-kit"].includes(i.id)) ? `<button class="btn primary" data-act="open-care-order" data-order="${o.id}">Open care calendar</button>` : ""}<a class="btn" href="#support">Order help</a></div></div>`,
            )
            .join("")}</div>`
        : `<div class="empty"><h2>No orders yet</h2><p>Explore the products and complete a demo purchase.</p><a class="btn primary" href="#shop">Continue shopping</a></div>`
  }</div>`;
}
function openCareOrder(id) {
  const o = orderById(id);
  if (!o || o.status !== "delivered") {
    say("Complete the demo delivery first.");
    return;
  }
  let old;
  try {
    old = JSON.parse(localStorage.getItem("mm-care-part2-v1") || "null");
  } catch (e) {
    old = null;
  }
  if (old?.storeOrderId !== o.id) {
    const a = W.assessment.result;
    const state = {
      version: 1,
      day: 1,
      start: "2026-11-02",
      time: "20:00",
      clock: "20:00",
      stage: a?.stage || 1,
      assessmentVersion: W.assessment.version || 1,
      tab: "overview",
      month: 0,
      optIn: o.consent,
      remindersPaused: false,
      appInstalled: true,
      orderStatus: "delivered",
      active: false,
      onboarded: false,
      frequency: 15,
      logs: {},
      messages: [],
      checkins: [],
      photos: [],
      concerns: [],
      appointment: null,
      review: null,
      notification: false,
      sampleHistory: false,
      pendingNudge: null,
      lastSync: null,
      eventLog: [],
      payment: true,
      storeOrderId: o.id,
    };
    try {
      localStorage.setItem("mm-care-part2-v1", JSON.stringify(state));
    } catch (e) {
      say(
        "Browser storage is unavailable. The standalone care demo will open.",
      );
    }
  }
  location.href = "care.html#overview";
}
function showLogin() {
  modal(
    "Use a fictional demo account",
    '<p>Continue as <strong>Demo buyer</strong> to test purchase verification. This sample account includes one delivered Hair Gummies order and no purchase of Shilajit Gummies.</p><div class="callout"><strong>No real sign-in or OTP is required.</strong><p>The account is a demonstration fixture, not identity verification for a live shop.</p></div>',
    '<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="confirm-login">Continue as Demo buyer</button>',
  );
}
function confirmLogin() {
  W.user = "demo-member";
  if (!W.orders.some((o) => o.id === "DEMO-VERIFIED-001"))
    W.orders.push({
      id: "DEMO-VERIFIED-001",
      owner: "demo-member",
      status: "delivered",
      items: [
        {
          key: "hair-gummies:standard",
          id: "hair-gummies",
          variant: "standard",
          qty: 1,
        },
      ],
      total: 858,
      consent: true,
      fixture: true,
    });
  save();
  closeModal();
  render();
  say(
    "Demo buyer signed in. One delivered Hair Gummies purchase is available.",
  );
}
function showReview(id) {
  const p = product(id);
  if (!p) return;
  if (!W.user) {
    showLogin();
    return;
  }
  if (!eligibleReview(id)) {
    modal(
      "A matching delivered purchase is required",
      `<p>You have no delivered order for <strong>${E(p.name)}</strong> in this demo account. The form stays locked.</p><p>Have an order question? Support is available before and after delivery.</p>`,
      '<button class="btn" data-act="close">Close</button><a class="btn primary" href="#orders" data-act="close-link">View orders</a>',
    );
    return;
  }
  const current = W.reviews.find((r) => r.product === id && r.owner === W.user);
  selectedStars = current?.rating || 0;
  modal(
    current ? "Edit your review" : "Review your purchased product",
    `<span class="pill green">Verified demo purchase · ${E(p.name)}</span><div class="star-pick" role="group" aria-label="Choose a rating">${[1, 2, 3, 4, 5].map((n) => `<button data-act="review-star" data-rating="${n}" aria-label="${n} stars" class="${n <= selectedStars ? "on" : ""}">★</button>`).join("")}</div><div class="field"><label for="review-title">Review title</label><input id="review-title" value="${E(current?.title || "")}" maxlength="80" placeholder="Use a fictional example"></div><div class="field"><label for="review-body">Your experience</label><textarea id="review-body" maxlength="500" placeholder="Critical feedback is welcome.">${E(current?.text || "")}</textarea></div><p class="notice">One editable review per purchased product. Ratings do not affect eligibility.</p><div class="errors" id="review-error"></div>`,
    `<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="submit-review" data-id="${id}">Publish demo review</button>`,
  );
}
function submitReview(id) {
  if (!eligibleReview(id)) {
    closeModal();
    say("Purchase eligibility changed. Review not published.");
    return;
  }
  const text = $("review-body").value.trim(),
    title = $("review-title").value.trim();
  if (!selectedStars || !text) {
    $("review-error").textContent =
      "Choose a rating and write your sample review.";
    return;
  }
  const review = {
    product: id,
    owner: W.user,
    rating: selectedStars,
    title: title || "My experience",
    text,
    author: "Demo member",
    verified: true,
  };
  const old = W.reviews.findIndex(
    (r) => r.product === id && r.owner === W.user,
  );
  if (old >= 0) W.reviews[old] = review;
  else W.reviews.push(review);
  save();
  closeModal();
  go("product", { id, section: "reviews" });
  say("Your review is visible. Critical feedback is preserved.");
}
function assessmentPage(params) {
  const raw = params.get("step"),
    step =
      raw === null
        ? W.assessment.step
        : Math.max(0, Math.min(6, Number(raw) || 0));
  W.assessment.step = step;
  save();
  const q = QUESTIONS[step],
    chosen = W.assessment.answers[step];
  return `<div class="wrap"><section class="test-page"><div class="test-top"><a href="#shop" class="brand" style="font-size:22px">man.<span>matters</span></a><button class="text-btn" data-act="exit-test">Exit & save</button></div><div class="row between"><span class="eyebrow">Question ${step + 1} of 7</span><small class="muted">Saved on this browser</small></div><div class="progress-track" aria-label="${step + 1} of 7 steps complete"><span style="width:${((step + 1) / 7) * 100}%"></span></div><h1 style="margin-top:27px">${q.title}</h1><p class="sub">${q.help}</p>${q.type === "photo" ? `<div class="card"><div class="row flex-wrap"><button class="btn soft" data-act="test-sample-photo">Use sample illustration</button><button class="text-btn" data-act="test-remove-photo">Remove saved photo</button></div><div class="field"><label for="test-photo-file">Or choose a local image</label><input id="test-photo-file" type="file" accept="image/png,image/jpeg,image/webp"><p class="notice">PNG, JPG or WebP · up to 1 MB · local storage only</p></div><div id="test-photo-preview">${W.assessment.photo ? `<img class="sample-img" src="${E(W.assessment.photo)}" alt="Saved local assessment reference">` : ""}</div><label class="check"><input type="checkbox" id="test-photo-consent" ${W.assessment.photoConsent ? "checked" : ""}>I choose to save this image in this browser for the demo assessment.</label><button class="btn compact" data-act="save-test-photo">Save selected photo</button><p class="notice">No image is sent to a clinician or analysed automatically. You can continue without a photo.</p><div class="errors" id="photo-error"></div></div>` : `<div class="test-options ${q.type === "patterns" ? "patterns" : ""}" role="radiogroup" aria-label="${E(q.title)}">${q.options.map((opt, i) => `<button class="test-option ${chosen === i ? "selected" : ""}" role="radio" aria-checked="${chosen === i}" data-act="test-answer" data-answer="${i}">${q.type === "patterns" ? scalp(i) : ""}<span>${opt}</span><span class="radio" aria-hidden="true"></span></button>`).join("")}</div>`}<div class="test-bottom"><button class="btn" data-act="test-back" ${step === 0 ? "disabled" : ""}>${icon("back", 15)} Back</button><button class="btn primary" data-act="test-next" ${step < 6 && chosen === null ? "disabled" : ""}>${step === 6 ? "See my result" : "Continue"} ${icon("arrow", 15)}</button></div>${step === 6 ? '<button class="text-btn" data-act="skip-photo" style="display:block;margin:15px auto">Skip photo & see result</button>' : ""}<p class="notice" style="margin-top:18px">No login is needed to see your result. Your answers stay saved when you go back, exit or resume.</p></section></div>`;
}
function finishAssessment() {
  const missing = W.assessment.answers.findIndex((x) => x === null);
  if (missing >= 0) {
    say("Complete the unanswered question before viewing the result.");
    go("assessment", { step: missing });
    return false;
  }
  const under = W.assessment.answers[1] === 0,
    complex = W.assessment.answers[0] >= 2;
  W.assessment.version++;
  W.assessment.result = {
    stage: under || complex ? null : 1,
    under18: under,
    needsReview: under || complex,
    version: W.assessment.version,
    at: new Date().toISOString(),
  };
  save();
  go("result");
  return true;
}
function resultPage() {
  const a = W.assessment.result;
  if (!a)
    return `<div class="wrap section"><div class="empty"><h2>Your saved assessment is ready to resume</h2><p>Your previous answers are still on this browser.</p><a class="btn primary" href="#assessment">Continue assessment</a></div></div>`;
  if (a.needsReview)
    return `<div class="wrap section"><div class="report"><div class="report-inner"><span class="eyebrow">Your assessment summary</span><h1 style="font-size:29px;margin:12px 0">${a.under18 ? "Let’s start with appropriate support." : "A clinician can help you understand the next step."}</h1><p>${a.under18 ? "This prototype does not recommend a treatment or routine to someone under 18. Please involve a parent or guardian and a qualified clinician." : "Your answers call for individual review in this prototype. No stage, diagnosis or medicine is automatically assigned."}</p><div class="row flex-wrap spacer"><a class="btn primary" href="#clinic">View the consultation demo</a><a class="btn" href="${url("assessment", { step: 0 })}">Review my answers</a></div></div></div></div>`;
  return `<div class="wrap section"><div class="report"><div class="report-inner"><span class="eyebrow">Assessment report · demonstration result</span><div class="row" style="margin:15px 0"><div style="width:80px">${scalp(1)}</div><div><h1 style="font-size:31px">Hair-care example <span class="stage-badge">Stage ${a.stage}</span></h1><p>Saved assessment #DEMO-ASSESSMENT · version ${a.version}</p></div></div><div class="callout green"><strong>One result across every next step</strong><p>Your recommended kit, cart label and WhatsApp message use this same Stage ${a.stage} record.</p></div><p class="notice" style="margin-top:15px">This is a provisional demo classification, not a diagnosis. No regrowth percentage, guaranteed result or fixed treatment timeline is inferred from your answers or photo.</p></div></div><div class="two-col spacer"><div class="card"><span class="eyebrow">A consistent next step</span><h2 style="margin:10px 0">Stage 1 Hair Care Kit</h2><p>Compare the Essential and Extended demo pack options before choosing.</p><a class="btn primary spacer" href="${url("product", { id: "stage1-kit" })}">Explore the matching kit</a></div><div class="card"><span class="eyebrow">See the fix in action</span><h2 style="margin:10px 0">Your WhatsApp preview</h2><p>Watch a conflicting Stage 2 promotion get blocked before it reaches the customer.</p><button class="btn spacer" data-act="stage-preview">Preview the correct message</button></div></div><div class="row flex-wrap spacer"><a class="btn" href="${url("assessment", { step: 0 })}">Edit my answers</a><button class="btn soft" data-act="save-result">Save to demo account</button><a class="text-btn" href="#clinic">Talk to a clinician</a></div><p class="notice">Your result is already visible. Sign-in is optional, and does not unlock a different result.</p></div>`;
}
function stagePreview() {
  const a = W.assessment.result;
  if (!a?.stage) {
    modal(
      "Load the Stage 1 comparison example?",
      "<p>This presenter control loads a clearly labelled Stage 1 assessment example so you can test the reported Stage 1 / Stage 2 mismatch.</p>",
      '<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="load-stage-demo">Load Stage 1 example</button>',
    );
    return;
  }
  modal(
    "Same assessment. Same message.",
    `<div class="two-col"><div><div class="callout green"><strong>Website result: Stage ${a.stage}</strong><p>Assessment version ${a.version} · matching Stage ${a.stage} kit</p></div><div class="blocked spacer"><strong>Stale Stage 2 promotion blocked</strong><p style="font-size:12px">The campaign stage does not match the saved assessment. It is not sent.</p></div><p class="notice spacer">The message is generated from the saved record, not from the last product viewed or an outdated promotion.</p></div><div class="phone"><div class="phone-head"><strong>Man Matters Care</strong><small>Simulated WhatsApp message</small></div><div class="chat"><div class="bubble">Hi there, your <strong>Stage ${a.stage}</strong> example assessment is saved. Your recommended options use the same result. View your plan, or ask a clinician about any questions.<time>20:00 · demo</time><a class="btn" href="${url("product", { id: "stage1-kit" })}" data-act="close-link">View my Stage ${a.stage} options</a></div></div></div></div>`,
    '<button class="btn" data-act="close">Close</button><a class="btn primary" href="care.html">Try daily reminders & Day 15</a>',
    true,
  );
}
function clinicPage() {
  const approved = W.rx.status === "approved_demo",
    pending = W.rx.status === "pending";
  return `<div class="wrap section"><div class="heading"><span class="eyebrow">Product guidance</span><h1 style="margin-top:10px">A clinician step, before checkout.</h1><p>The medicine example from your audit cannot be purchased directly. This screen demonstrates the review process.</p></div><div class="two-col"><div class="card"><h2>Request a review</h2><p class="small">All appointments and approvals on this screen are fictional.</p><div class="field"><label for="clinic-topic">What would you like to discuss?</label><select id="clinic-topic"><option>Suitability of the medicine example</option><option>My hair assessment and next steps</option><option>A concern about using a product</option></select></div><div class="field"><label for="clinic-context">Context for the review</label><select id="clinic-context"><option>I would like to understand the options</option><option>I have questions about another medicine</option><option>I have a concern I want to discuss</option></select></div><p class="small muted">Choose a simulated slot · IST</p><div class="slot-grid">${["Tomorrow · 10:00", "Tomorrow · 16:30", "In 2 days · 11:00", "In 2 days · 17:00"].map((s) => `<button class="btn compact clinic-slot ${selectedSlot === s ? "selected" : ""}" data-act="clinic-slot" data-slot="${s}">${s}</button>`).join("")}</div><label class="check"><input type="checkbox" id="clinic-consent">I choose to include my demo assessment answers in this simulated review.</label><button class="btn primary full" data-act="request-clinic" style="margin-top:8px">Request demo clinician review</button><div class="errors" id="clinic-error"></div></div><div class="stack"><div class="card"><span class="pill ${approved ? "green" : pending ? "amber" : ""}">${approved ? "Approved · simulation" : pending ? "Awaiting review · simulation" : "Review not requested"}</span><h2 style="margin:15px 0">${approved ? "Demo review recorded" : pending ? "Your request is saved" : "The purchase gate is active"}</h2><p>${approved ? "The presenter has simulated a clinician decision. This is not a prescription or evidence that a real person assessed suitability." : pending ? `Demo slot: ${E(W.rx.slot)}. The product remains blocked until a clinician decision is simulated.` : "Reading the information or ticking a box does not approve the medicine."}</p><a class="btn spacer" href="${url("product", { id: "minoxifin", section: "safety" })}">Return to product</a></div><div class="callout amber"><strong>For assignment demonstration only</strong><p>In a real service, only an authorised clinician and validated prescription process could supply this decision.</p>${pending ? '<button class="btn compact" data-act="simulate-approval" style="margin-top:14px">Presenter: simulate clinician approval</button>' : ""}</div></div></div></div>`;
}
function fixesPage() {
  return `<div class="wrap"><section class="fix-intro"><span class="eyebrow" style="color:#bed6f1">Your website audit, made interactive</span><h1 style="margin:12px 0">The changes you should be able to see.</h1><p>13 issues from your audit + 2 issues you added. Every card links to a working corrected flow in this prototype.</p><div class="row flex-wrap spacer"><a class="btn" href="#shop">Explore the corrected website</a><a class="btn" href="care.html">Then try WhatsApp care →</a></div><p class="notice" style="color:#bfd0e1;margin-top:17px">“Original issue” summarises your supplied audit and screenshots. It is not a claim that the live website still behaves this way today.</p></section><section class="fix-grid">${FIXES.map((f) => `<article class="fix-card" id="fix-${f.id}"><div class="fix-head"><span class="fix-number">#${f.id}</span><div><span class="eyebrow" style="font-size:9px">${f.area}</span><h3 style="margin-top:5px">${f.title}</h3></div></div><div class="fix-body"><div class="comparison"><div class="before"><strong>Original issue</strong>${f.before}</div><div class="after"><strong>Updated experience</strong>${f.after}</div></div><button class="btn primary compact" data-act="try-fix" data-fix="${f.id}">${f.cta} ${icon("arrow", 13)}</button><div class="reference">${f.source}</div></div></article>`).join("")}</section><section class="section"><h2>What the review screenshots also raised</h2><p>These are customer-reported experiences, not verified medical findings. They inform support and transparency features.</p><div class="two-col spacer"><div class="card"><h3>Batch-report access and missing units</h3><p>Test a found, unavailable or unrecognised batch. Missing items can be recorded as an order-support request.</p><div class="row flex-wrap"><a class="btn compact" href="#reports">Try batch lookup</a><a class="btn compact" href="#support">Report missing units</a></div></div><div class="card"><h3>Concerns, uncertain results and expectations</h3><p>Report a health concern, access a consultation and see progress without guaranteed outcomes. Negative reviews remain visible.</p><div class="row flex-wrap"><button class="btn compact" data-act="health-concern">Try concern reporting</button><a class="btn compact" href="care.html#progress">See the progress timeline</a></div></div></div><div class="callout spacer"><strong>Prototype scope</strong><p>This updates the assignment prototype, not manmatters.com. Payments, prescriptions, reviews, lab lookup, consultations and WhatsApp are simulated. No customer's identity or screenshot containing personal data is published.</p></div></section></div>`;
}
function tryFix(id) {
  const f = FIXES.find((x) => x.id === id);
  if (!f) return;
  if (f.route === "stage-demo") {
    stagePreview();
    return;
  }
  if (f.route === "footer") {
    go("footer");
    return;
  }
  if (f.route.startsWith("cart-")) {
    modal(
      "Load this cart example?",
      `<p>This replaces the local demo cart with the scenario for <strong>${E(f.title)}</strong>. Your saved care history and assessment are kept.</p>`,
      `<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="load-cart-demo" data-scenario="${f.route}">Load example</button>`,
    );
    return;
  }
  go(f.route, f.params || {});
}
function loadCartDemo(scenario) {
  W.cart = [
    {
      id: "hair-gummies",
      variant: "standard",
      key: "hair-gummies:standard",
      qty:
        scenario === "cart-max-demo"
          ? 5
          : scenario === "cart-coupon-demo"
            ? 2
            : 1,
    },
  ];
  W.lastCategory = "hair";
  W.payment = "prepaid";
  W.coupon = false;
  W.undo = null;
  save();
  closeModal();
  go("cart");
  say(
    scenario === "cart-empty-demo"
      ? "Choose Remove or − to empty the cart, then try Undo."
      : "Demo cart loaded. You can change it freely.",
  );
}
function reportsPage(params) {
  return `<div class="wrap section"><div class="heading"><span class="eyebrow">Honest reports</span><h1 style="margin-top:10px">Find the report for your batch.</h1><p>A batch lookup should explain what happened, including when a report cannot be found.</p></div><div class="two-col"><div class="card"><div class="field"><label for="batch-product">Product</label><select id="batch-product">${PRODUCTS.map((p) => `<option value="${p.id}" ${params.get("product") === p.id ? "selected" : ""}>${E(p.name)}</option>`).join("")}</select></div><div class="field"><label for="batch-code">Batch number</label><input id="batch-code" placeholder="Try DEMO-OK" maxlength="40" autocomplete="off"></div><button class="btn primary" data-act="lookup-batch">Find report</button><div class="errors" id="batch-error"></div><div id="batch-result"></div></div><div class="stack"><div class="callout"><strong>Try all three states</strong><p><b>DEMO-OK</b> — sample record available<br><b>DEMO-PENDING</b> — batch recognised, report unavailable<br><b>Any other code</b> — batch not found</p></div><div class="card"><h3>Transparency without false reassurance</h3><p class="small">A missing result does not prove a product is fake or unsafe. The customer gets a clear status and a way to request help.</p><p class="notice">This lookup uses fictional fixtures. The downloadable record is clearly labelled as a demonstration, with no invented laboratory results, certificate or safety approval.</p></div></div></div></div>`;
}
function lookupBatch() {
  const code = $("batch-code").value.trim().toUpperCase(),
    p = product($("batch-product").value);
  if (!code) {
    $("batch-error").textContent =
      "Enter the batch number printed on your pack.";
    return;
  }
  $("batch-error").textContent = "";
  const status =
    code === "DEMO-OK"
      ? "available"
      : code === "DEMO-PENDING"
        ? "pending"
        : "missing";
  $("batch-result").innerHTML =
    `<div class="callout ${status === "available" ? "green" : "amber"} spacer"><strong>${status === "available" ? "Sample record found" : status === "pending" ? "Batch recognised · report unavailable" : "We could not match this batch"}</strong><p>${E(p.name)} · ${E(code)}</p><p>${status === "available" ? "You can inspect and download the demonstration record. This is not a lab certificate." : status === "pending" ? "The sample batch exists, but its report is not ready. You can request support without re-entering the issue." : "Check the printed code and selected product. If it still does not match, the support flow keeps this context."}</p><div class="row flex-wrap spacer">${status === "available" ? `<button class="btn compact" data-act="sample-report" data-code="${E(code)}" data-product="${p.id}">View sample record</button>` : ""}<button class="btn compact" data-act="batch-support" data-code="${E(code)}" data-product="${p.id}">Get batch-report help</button></div></div>`;
}
function supportPage() {
  return `<div class="wrap section"><div class="heading"><span class="eyebrow">Support that stays accessible</span><h1 style="margin-top:10px">What can we help with?</h1><p>Order problems and health concerns have separate routes. No real support request is sent.</p></div><div class="two-col"><div class="card"><h2>Your order question</h2><div class="field"><label for="support-order">Demo order</label><select id="support-order">${
    W.orders
      .filter((o) => o.owner === W.user)
      .map((o) => `<option>${E(o.id)}</option>`)
      .join("") || "<option>DEMO-EXAMPLE · fictional support case</option>"
  }</select></div><div class="field"><label for="support-type">What went wrong?</label><select id="support-type"><option>Missing units or items</option><option>Batch report unavailable</option><option>Delivery question</option><option>Return or refund question</option><option>Product information question</option></select></div><div class="field"><label for="support-note">Details</label><textarea id="support-note" maxlength="500" placeholder="For example: the sample pack says 60 units; I counted fewer. Use fictional details."></textarea></div><button class="btn primary" data-act="submit-support">Create demo support request</button><div class="errors" id="support-error"></div></div><div class="stack"><div class="card"><span class="pill amber">Health concerns</span><h2 style="margin:15px 0">Tell the care team.</h2><p>Record your concern in your own words. Routine nudges pause while you seek help; the demo does not determine the cause or change a dose.</p><button class="btn spacer" data-act="health-concern">Share a concern</button><p class="notice" style="margin-top:15px">For urgent or severe symptoms, seek immediate medical help. This prototype is not monitored.</p></div><div class="card"><h3>Return and refund information</h3><p class="small">Before buying, customers should be able to see eligibility, time limits and exclusions. The actual company policy was not supplied with the audit.</p><button class="text-btn" data-act="return-info">See the proposed information layout →</button></div>${
    (W.tickets || []).length
      ? `<div class="card"><h3>Requests saved in this demo</h3>${W.tickets
          .slice(0, 3)
          .map(
            (t) =>
              `<div style="padding-top:15px"><strong class="small">${E(t.type)}</strong><p class="notice">${E(t.id)} · Recorded locally<br>${E(t.note)}</p></div>`,
          )
          .join("")}</div>`
      : ""
  }</div></div></div>`;
}
function healthConcern() {
  modal(
    "Share a concern with the care team",
    '<p>Use a fictional example. The record preserves what was reported without claiming the product caused it.</p><div class="field"><label for="health-note">What would you like to share?</label><textarea id="health-note" maxlength="500" placeholder="For example: I am feeling unwell and would like to speak with a clinician."></textarea></div><div class="callout amber"><strong>This is not a monitored medical service.</strong><p>For urgent or severe symptoms, seek immediate medical help. A demo booking is not an emergency service.</p></div><div class="errors" id="health-error"></div>',
    '<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="save-health">Save concern & get help</button>',
  );
}
function saveHealth() {
  const note = $("health-note").value.trim();
  if (!note) {
    $("health-error").textContent = "Add a short fictional description.";
    return;
  }
  W.tickets ??= [];
  W.tickets.unshift({
    id: "DEMO-CARE-" + Date.now().toString(36),
    type: "Health concern",
    note,
  });
  try {
    const s = JSON.parse(localStorage.getItem("mm-care-part2-v1") || "null");
    if (s?.version === 1) {
      s.concerns.push({
        id: "concern-" + Date.now(),
        day: s.day,
        text: note,
        status: "open",
      });
      s.pendingNudge = null;
      s.tab = "care";
      s.lastSync = "Concern saved from the website · routine nudges paused";
      localStorage.setItem("mm-care-part2-v1", JSON.stringify(s));
    }
  } catch (e) {}
  save();
  modal(
    "Your concern is recorded",
    '<div class="callout green"><strong>Saved as reported</strong><p>No cause has been inferred and no dose has been changed. Existing care reminders are paused in this browser when a care profile is present.</p></div><p>You can now open the consultation demonstration.</p>',
    '<button class="btn" data-act="close">Close</button><a class="btn primary" href="care.html#care">Open the care team</a>',
  );
}
function handleAction(a, b) {
  const r = route(),
    id = b.dataset.id;
  switch (a) {
    case "close":
      closeModal();
      break;
    case "close-link":
      closeModal();
      break;
    case "dismiss-promo":
      W.promo = false;
      save();
      render();
      break;
    case "account":
      if (W.user)
        modal(
          "Demo member",
          "<p>This is a fictional account. You can see your orders or switch to a guest view to test review restrictions.</p>",
          '<button class="btn" data-act="logout">Switch to guest</button><a class="btn primary" href="#orders" data-act="close-link">My orders</a>',
        );
      else showLogin();
      break;
    case "login":
      showLogin();
      break;
    case "confirm-login":
      confirmLogin();
      break;
    case "logout":
      W.user = null;
      save();
      closeModal();
      render();
      say("Guest view active. Product reviews are locked.");
      break;
    case "clear-filters":
      Object.assign(W, {
        category: "all",
        concern: "all",
        stage: "all",
        price: "all",
        sort: "recommended",
      });
      save();
      render();
      break;
    case "variant":
      go("product", {
        id: r.q.get("id"),
        v: b.dataset.variant,
        section: r.q.get("section") || "details",
      });
      break;
    case "product-image":
      go("product", {
        id: r.q.get("id"),
        v: r.q.get("v") || "",
        section: r.q.get("section") || "details",
        image: b.dataset.image,
      });
      break;
    case "product-section":
      go("product", {
        id: r.q.get("id"),
        v: r.q.get("v") || "",
        section: b.dataset.section,
      });
      break;
    case "request-review":
      go("clinic");
      break;
    case "add":
      addToCart(id, b.dataset.variant);
      break;
    case "buy":
      addToCart(id, b.dataset.variant, true);
      break;
    case "remove":
      removeItem(b.dataset.key);
      break;
    case "quantity":
      changeQuantity(b.dataset.key, Number(b.dataset.delta));
      break;
    case "undo":
      undoRemove();
      break;
    case "continue-shopping":
      W.category = W.lastCategory || "hair";
      W.price = "all";
      W.stage = "all";
      W.concern = "all";
      save();
      go("shop");
      break;
    case "apply-coupon":
      if (totals().eligible) {
        W.coupon = true;
        save();
        render();
        say("SAVE10 applied. Your order total now includes the discount.");
      } else say("SAVE10 needs a prepaid subtotal of at least ₹1,499.");
      break;
    case "remove-coupon":
      W.coupon = false;
      save();
      render();
      break;
    case "payment-failure":
      $("checkout-error").textContent =
        "Demo payment failed. No order was created and your cart is preserved. Try Place demo order to simulate success.";
      break;
    case "place-order":
      placeOrder();
      break;
    case "deliver-order":
      {
        const o = orderById(b.dataset.order);
        if (o) {
          o.status = "delivered";
          save();
          go("confirmation", { order: o.id });
        }
      }
      break;
    case "open-care-order":
      openCareOrder(b.dataset.order);
      break;
    case "write-review":
      showReview(id);
      break;
    case "review-star":
      selectedStars = Number(b.dataset.rating);
      document
        .querySelectorAll('[data-act="review-star"]')
        .forEach((x) =>
          x.classList.toggle("on", Number(x.dataset.rating) <= selectedStars),
        );
      break;
    case "submit-review":
      submitReview(id);
      break;
    case "test-answer":
      W.assessment.answers[W.assessment.step] = Number(b.dataset.answer);
      W.assessment.result = null;
      save();
      render();
      break;
    case "test-next":
      if (W.assessment.step === 6) finishAssessment();
      else if (W.assessment.answers[W.assessment.step] !== null)
        go("assessment", { step: W.assessment.step + 1 });
      break;
    case "test-back":
      if (W.assessment.step > 0)
        go("assessment", { step: W.assessment.step - 1 });
      break;
    case "exit-test":
      save();
      modal(
        "Your answers are saved",
        "<p>You can leave now and resume from the same question. Browser Back also returns to the previous question without clearing answers.</p>",
        '<button class="btn" data-act="close">Keep going</button><a class="btn primary" href="#shop" data-act="close-link">Exit assessment</a>',
      );
      break;
    case "test-sample-photo":
      photoDraft =
        "data:image/svg+xml;charset=utf-8," + encodeURIComponent(scalp(1));
      $("test-photo-preview").innerHTML =
        `<img class="sample-img" alt="Sample hairline illustration" src="${E(photoDraft)}"><p class="notice">Illustration only · no real person or clinical analysis</p>`;
      break;
    case "save-test-photo":
      if (!photoDraft && !W.assessment.photo) {
        $("photo-error").textContent = "Choose a sample or local image first.";
        break;
      }
      if (!$("test-photo-consent").checked) {
        $("photo-error").textContent =
          "Confirm your choice before storing this image.";
        break;
      }
      W.assessment.photo = photoDraft || W.assessment.photo;
      W.assessment.photoConsent = true;
      save();
      photoDraft = null;
      render();
      say("Local photo reference saved. No image analysis was performed.");
      break;
    case "test-remove-photo":
      W.assessment.photo = null;
      W.assessment.photoConsent = false;
      photoDraft = null;
      save();
      render();
      say("Assessment photo removed from this browser.");
      break;
    case "skip-photo":
      W.assessment.photo = null;
      W.assessment.photoConsent = false;
      photoDraft = null;
      save();
      finishAssessment();
      break;
    case "save-result":
      if (W.user) say("Your result is already saved in this demo account.");
      else showLogin();
      break;
    case "stage-preview":
      stagePreview();
      break;
    case "load-stage-demo":
      W.assessment = {
        answers: [1, 2, 0, 1, 4, 3],
        step: 6,
        photo: null,
        photoConsent: false,
        version: (W.assessment.version || 0) + 1,
        result: null,
      };
      W.assessment.result = {
        stage: 1,
        under18: false,
        needsReview: false,
        version: W.assessment.version,
        example: true,
      };
      save();
      closeModal();
      go("result");
      stagePreview();
      break;
    case "try-fix":
      tryFix(b.dataset.fix);
      break;
    case "load-cart-demo":
      loadCartDemo(b.dataset.scenario);
      break;
    case "clinic-slot":
      selectedSlot = b.dataset.slot;
      document
        .querySelectorAll(".clinic-slot")
        .forEach((x) =>
          x.classList.toggle("selected", x.dataset.slot === selectedSlot),
        );
      break;
    case "request-clinic":
      if (!selectedSlot) {
        $("clinic-error").textContent = "Choose a simulated slot.";
        break;
      }
      W.rx = {
        status: "pending",
        slot: selectedSlot,
        share: !!$("clinic-consent").checked,
        topic: $("clinic-topic").value,
        context: $("clinic-context").value,
      };
      save();
      render();
      say("Demo review requested. The medicine is still blocked.");
      break;
    case "simulate-approval":
      if (W.rx.status === "pending") {
        W.rx.status = "approved_demo";
        save();
        render();
        say(
          "Presenter simulation: approval recorded. This is not a real prescription.",
        );
      }
      break;
    case "lookup-batch":
      lookupBatch();
      break;
    case "sample-report":
      {
        const p = product(b.dataset.product);
        modal(
          "Demonstration batch record",
          `<span class="pill amber">Sample only · not a lab certificate</span><table class="detail-table"><tr><th>Product</th><td>${E(p.name)}</td></tr><tr><th>Batch</th><td>${E(b.dataset.code)}</td></tr><tr><th>Record status</th><td>Demo reference available</td></tr><tr><th>Laboratory results</th><td>Not supplied · no results invented</td></tr></table><p class="notice">Production must link the actual batch to a validated report with its laboratory, date, methods and results.</p>`,
          `<button class="btn" data-act="close">Close</button><button class="btn primary" data-act="download-report" data-product="${p.id}">Download sample record</button>`,
        );
      }
      break;
    case "download-report":
      {
        const p = product(b.dataset.product),
          blob = new Blob(
            [
              "DEMONSTRATION RECORD — NOT A LAB CERTIFICATE\\nProduct: " +
                p.name +
                "\\nBatch: DEMO-OK\\nThis is a UI prototype fixture. No laboratory results or product safety approval are asserted.",
            ],
            { type: "text/plain" },
          ),
          link = document.createElement("a"),
          src = URL.createObjectURL(blob);
        link.href = src;
        link.download = "DEMO_batch_record.txt";
        link.click();
        setTimeout(() => URL.revokeObjectURL(src), 1000);
      }
      break;
    case "batch-support":
      W.tickets ??= [];
      W.tickets.unshift({
        id: "DEMO-HELP-" + Date.now().toString(36),
        type: "Batch report unavailable",
        note: product(b.dataset.product).name + " · batch " + b.dataset.code,
      });
      save();
      go("support");
      say("Product and batch context saved in a demo support request.");
      break;
    case "submit-support":
      {
        const note = $("support-note").value.trim();
        if (!note) {
          $("support-error").textContent =
            "Add a short fictional description so the team knows what to review.";
          break;
        }
        W.tickets ??= [];
        const ticket = {
          id: "DEMO-HELP-" + Date.now().toString(36).toUpperCase(),
          type: $("support-type").value,
          note,
          order: $("support-order").value,
        };
        W.tickets.unshift(ticket);
        save();
        render();
        modal(
          "Demo request recorded",
          `<div class="callout green"><strong>${E(ticket.type)}</strong><p>${E(ticket.id)} · ${E(ticket.order)}</p></div><p>Your issue is saved locally, including the original details. No real ticket, replacement or refund has been issued.</p>`,
          '<button class="btn primary" data-act="close">Done</button>',
        );
      }
      break;
    case "health-concern":
      healthConcern();
      break;
    case "save-health":
      saveHealth();
      break;
    case "return-info":
      modal(
        "Proposed return-information layout",
        '<p>This prototype demonstrates making the information visible before payment. It does not create or override the company’s actual return policy.</p><table class="detail-table"><tr><th>Eligibility</th><td>Show which products and conditions qualify.</td></tr><tr><th>Time window</th><td>Display the verified policy’s actual deadline.</td></tr><tr><th>Opened products</th><td>Explain any exclusions before purchase.</td></tr><tr><th>Damaged or missing units</th><td>Provide an order-linked support route.</td></tr><tr><th>Request status</th><td>Show received, under review and resolved states.</td></tr></table>',
        '<button class="btn primary" data-act="close">Understood</button>',
      );
      break;
    case "privacy":
      modal(
        "Privacy & prototype notes",
        "<p>This is an independent assignment prototype. Brand references are used to demonstrate the proposed experience; it is not the live Man Matters service.</p><p>Demo orders, account details, reviews and care logs are stored in this browser. Optional images remain local. No real payments, messages, medical decisions or laboratory reports are connected.</p><p>No customer names, phone numbers, addresses or screenshots containing personal information are reproduced in the app.</p><p>Health and quality complaints in the supplied screenshots are treated as customer reports, not proof of causation or verified product findings.</p>",
        '<button class="btn primary" data-act="close">Close</button>',
        true,
      );
      break;
  }
}
function render() {
  const r = route();
  let content = "";
  if (r.path === "shop") content = shopPage();
  else if (r.path === "search") content = searchPage(r.q.get("q") || "");
  else if (r.path === "product") content = productPage(r.q);
  else if (r.path === "cart") content = cartPage();
  else if (r.path === "checkout") content = checkoutPage();
  else if (r.path === "assessment") content = assessmentPage(r.q);
  else if (r.path === "result") content = resultPage();
  else if (r.path === "clinic") content = clinicPage();
  else if (r.path === "reports") content = reportsPage(r.q);
  else if (r.path === "support") content = supportPage();
  else if (r.path === "orders") content = ordersPage();
  else if (r.path === "confirmation")
    content = confirmationPage(r.q.get("order"));
  else if (r.path === "fixes") content = fixesPage();
  else if (r.path === "footer")
    content = `<div class="wrap section"><div class="heading"><span class="eyebrow">Audit #3 · Site details</span><h1 style="margin-top:12px">The footer stays current.</h1><p>The year below is generated from the current date: <strong>${new Date().getFullYear()}</strong>. There is no hard-coded 2025 end year.</p><a class="btn" href="#fixes">Back to website fixes</a></div></div>`;
  else content = shopPage();
  $("app").innerHTML =
    header() +
    `<main>${!storageOK ? '<div class="wrap"><div class="callout amber spacer">Browser storage is unavailable. This demo works for the current session, but changes may not survive a refresh.</div></div>' : ""}${content}</main>` +
    footer();
  document.title =
    (r.path === "fixes"
      ? "15 Website UX Fixes"
      : r.path === "product"
        ? product(r.q.get("id"))?.name || "Product"
        : r.path === "cart"
          ? "Your Cart"
          : "Man Matters") + " · Assignment Prototype";
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (b) {
    if (b.tagName !== "A") e.preventDefault();
    handleAction(b.dataset.act, b);
  } else if (e.target.id === "modal-overlay") closeModal();
});
document.addEventListener("submit", (e) => {
  if (e.target.id === "search-form") {
    e.preventDefault();
    go("search", { q: $("search-input").value.trim() });
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "search-input") searchSuggestions(e.target.value);
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "checkout-care-consent") {
    W.checkoutConsent = t.checked;
    save();
  }
  if (t.dataset.filter) {
    W[t.dataset.filter] = t.value;
    save();
    render();
  }
  if (t.hasAttribute("data-payment")) {
    const consent = $("checkout-care-consent")?.checked;
    W.payment = t.value;
    if (!totals().eligible) W.coupon = false;
    save();
    render();
    if ($("checkout-care-consent"))
      $("checkout-care-consent").checked = !!consent;
  }
  if (t.id === "test-photo-file") {
    const f = t.files?.[0];
    if (!f) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
      f.size > 1048576
    ) {
      $("photo-error").textContent =
        "Choose a PNG, JPG or WebP file no larger than 1 MB.";
      photoDraft = null;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (!$("test-photo-preview")) return;
      photoDraft = reader.result;
      $("test-photo-preview").innerHTML =
        `<img class="sample-img" src="${E(photoDraft)}" alt="Local image preview">`;
      $("photo-error").textContent = "";
    };
    reader.readAsDataURL(f);
  }
});
document.addEventListener("keydown", (e) => {
  const m = document.querySelector(".modal");
  if (!m) return;
  if (e.key === "Escape") closeModal();
  if (e.key === "Tab") {
    const nodes = [
      ...m.querySelectorAll(
        "button:not([disabled]),a[href],input,select,textarea",
      ),
    ];
    const first = nodes[0],
      last = nodes.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      last?.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first?.focus();
      e.preventDefault();
    }
  }
});
window.addEventListener("hashchange", () => {
  closeModal();
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
});
if (
  ["overview", "calendar", "progress", "care", "settings"].includes(
    route().path,
  )
)
  location.replace("care.html" + location.hash);
else render();
window.MM = {
  totals,
  ranked,
  filtered,
  relevantProducts,
  eligibleReview,
  addToCart,
  changeQuantity,
  removeItem,
  undoRemove,
  finishAssessment,
  PRODUCTS,
  FIXES,
};
