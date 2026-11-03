"use strict";
// All contact, OTP, payment and order steps are local demonstrations.
const JKEY = "mm-journey-v3";
const jDefault = () => ({
  version: 3,
  clicks: 0,
  invited: false,
  active: false,
  step: "identity",
  verified: false,
  profile: {
    name: "Manish",
    phone: "9999999999",
    address: "Flat 12, Demo Residency",
    city: "Kolkata",
    pin: "700025",
  },
  orderId: null,
});
let J;
try {
  J = JSON.parse(sessionStorage.getItem(JKEY));
  if (J?.version !== 3) J = jDefault();
} catch (e) {
  J = jDefault();
}
const jSave = () => {
  try {
    sessionStorage.setItem(JKEY, JSON.stringify(J));
  } catch (e) {}
};
const jOriginal = {
  render,
  header,
  shopPage,
  summary,
  checkoutPage,
  confirmationPage,
  handleAction,
  art,
  route,
};
let jTour = -1,
  jTourTimer,
  jInviteTimer,
  jPurchaseBusy = false;
route = () => {
  const r = jOriginal.route();
  if (!location.hash) r.path = "home";
  return r;
};
header = function () {
  return `${W.promo ? '<div class="promo brand-promo">Your routine, connected. Meet MY CARE <button data-act="dismiss-promo" aria-label="Dismiss banner">×</button></div>' : ""}<header class="nav-shell"><div class="wrap nav"><a class="brand real-brand" href="#home" aria-label="Man Matters prototype home"><img src="assets/logo.png" alt="man matters"></a><nav class="navlinks" aria-label="Main navigation"><button class="nav-text" data-act="account">${W.user ? "My account" : "Login"}</button><a href="#home">Home</a><details class="choose-menu"><summary>Choose Product ▾</summary><div><button data-j-category="hair">Hair Regrowth</button><button data-j-category="beard">Beard Care</button><button data-j-category="nutrition">Health & Fitness</button></div></details><a href="#shop">All Products</a><a href="#reports">Honest Reports</a><a href="#assessment">Hair Assessment</a></nav><div class="nav-actions"><a class="icon-button" href="#search" aria-label="Search products">${icon("search", 24)}</a><a class="icon-button" href="care.html" aria-label="My Care profile">${icon("user", 24)}</a><a class="icon-button" href="#cart" aria-label="Cart, ${totals().count} items">${icon("cart", 24)}${totals().count ? `<span class="cart-count">${totals().count}</span>` : ""}</a></div></div></header><div class="prototypebar"><div class="wrap"><span><i class="proto-dot"></i>PART 2 · AYUSH TIWARI · Independent prototype</span><div class="proto-links"><a href="#fixes" class="proto-fixes-badge"><span class="fixes-count">15</span> Website Fixes</a><button class="btn-try-care" data-j-action="invite">Try MY CARE →</button><a href="care.html" class="proto-secondary">My Care</a><button class="proto-restart" data-j-action="restart">↻ Restart</button></div></div></div>`;
};
function jHome() {
  return `<div class="brand-home"><h1>Science-Backed Men's Hair, Skin & Wellness Solutions</h1><a class="brand-hero" href="#assessment"><img src="assets/hero-hair.jpg" alt="Man Matters hair assessment — take the hair test"></a><div class="brand-dots"><span class="selected"></span><span></span><span></span></div><div class="home-section"><div class="row between"><h2>Explore By Concerns</h2><a href="#shop">View all products →</a></div><div class="concern-grid">${[
    ["hair", "Hair Care"],
    ["beard", "Beard Care"],
    ["nutrition", "Health & Fitness"],
  ]
    .map(
      ([id, label]) =>
        `<button data-j-category="${id}"><img src="assets/${id}.png" alt="${label}" loading="lazy"><strong>${label} ${icon("arrow", 16)}</strong></button>`,
    )
    .join(
      "",
    )}</div></div><div class="care-teaser"><div><span class="eyebrow">Introducing MY CARE</span><h2>Good care doesn't end at checkout.</h2><p>A gentle WhatsApp check-in. A calendar that stays up to date.<br>Your care team, whenever you need them.</p><button class="btn primary" data-j-action="invite">Experience the journey ${icon("arrow", 16)}</button></div><div class="teaser-message"><small>Man Matters Care · Demo</small><p>Manish, a little care goes a long way. Did you take your gummies today?</p><span>Yes, taken</span><span>Remind me later</span></div></div><div class="home-section"><h2>Care, with clarity.</h2><div class="home-benefits"><a href="#fixes"><strong>15 improvements you can try</strong><p>Search, assessment, checkout and verified reviews.</p></a><a href="#reports"><strong>Honest reports</strong><p>A clear path to batch information and order support.</p></a><a href="care.html"><strong>Your care, in one place</strong><p>Your routine, progress and consultations.</p></a></div></div><p class="brand-credit">Brand imagery is a visual reference for this independent assignment. Prices, messages and results are illustrative.</p></div>`;
}
shopPage = function () {
  return jOriginal
    .shopPage()
    .replace(
      /<section class="hero">[\s\S]*?<\/section>/,
      '<div class="heading"><h1>All Products</h1><p>Find the care that fits your routine.</p></div>',
    );
};
art = function (p, v = variant(p), large = false) {
  if (p.id === "hair-gummies")
    return `<img class="brand-product-photo" src="assets/gummies.jpg" alt="Man Matters Hair Gummies, 60-count pack">`;
  return jOriginal.art(p, v, large);
};
summary = function (checkout = false) {
  let html = jOriginal.summary(checkout);
  if (J.active && !checkout)
    html = html.replace(
      /<a class="btn primary full" href="#checkout">[\s\S]*?<\/a>/,
      '<a class="btn primary full" href="#checkout">BUY NOW ' +
        icon("arrow", 15) +
        "</a>",
    );
  return html;
};
function jInvitation() {
  if (jTour >= 0) return;
  J.invited = true;
  jSave();
  modal(
    "Let’s order a hair-fall gummy and see MY CARE",
    `<div class="journey-invite"><div class="invite-pack">${art(product("hair-gummies"))}</div><p>From choosing your product to your first reminder, then Day 15 and Day 30. See your WhatsApp replies update your care profile.</p></div><p class="notice">A fully interactive demo. No real order or WhatsApp message is sent.</p>`,
    `<button class="btn primary full" data-j-action="direct">Okay, let’s get started ${icon("arrow", 16)}</button><button class="btn full" data-j-action="tour">Give me a tour of changes you made on the website and then order gummy</button>`,
  );
  document.querySelector(".modal-actions")?.classList.add("journey-choice");
}
function jCart() {
  jTour = -1;
  clearTimeout(jTourTimer);
  $("tour-root").innerHTML = "";
  document.querySelector("#app")?.removeAttribute("inert");
  closeModal();
  J.active = true;
  J.invited = true;
  J.step = "identity";
  J.verified = false;
  J.orderId = null;
  jSave();
  W.cart = [
    {
      key: "hair-gummies:standard",
      id: "hair-gummies",
      variant: "standard",
      qty: 1,
    },
  ];
  W.lastCategory = "hair";
  W.coupon = false;
  save();
  go("cart");
}
const jSteps = [
  {
    path: "shop",
    target: ".filters",
    ids: ["04"],
    title: "Find your fit, faster",
    text: "Category, concern, stage and price filters work together. Sorting and the live product count make results clear.",
  },
  {
    path: "search",
    params: { q: "beard oil" },
    target: ".search-results",
    ids: ["06", "07"],
    title: "Search should understand what you mean",
    text: "Beard oil ranks as beard care. New queries clear stale results, Enter opens full results, and unknown searches have a useful empty state.",
  },
  {
    path: "product",
    params: { id: "stage1-kit" },
    target: ".choices",
    ids: ["05"],
    title: "One product. Clearly different packs.",
    text: "Essential and Extended options explain what changes. Selected contents, price and cart item stay aligned.",
  },
  {
    path: "assessment",
    params: { step: 0 },
    target: ".test-page",
    ids: ["01", "13"],
    title: "A test that remembers you",
    text: "Question 1 of 7 is visible from the start. Back, Exit & save and resume preserve answers. Later questions include Not sure, under 18 and scalp symptoms.",
  },
  {
    path: "assessment",
    params: { step: 6 },
    target: ".test-page .card",
    ids: ["12"],
    title: "A photo step you can actually use",
    text: "Add a sample or local photo with explicit consent. You can skip it, and no diagnosis is inferred from the image.",
  },
  {
    path: "product",
    params: { id: "minoxifin", section: "safety" },
    target: ".pdp-actions",
    ids: ["02"],
    title: "Clinician review before a medicine purchase",
    text: "The medicine example stays behind a review step. Clicking a product or ticking a checkbox is not clinical approval.",
  },
  {
    path: "result",
    target: ".report",
    ids: ["14"],
    title: "Stage 1 stays Stage 1",
    text: "The saved assessment version drives the website, matching plan and WhatsApp message. An outdated Stage 2 promotion is blocked.",
  },
  {
    path: "product",
    params: { id: "hair-gummies", section: "reviews" },
    target: ".tab-content",
    ids: ["15"],
    title: "Reviews from matching purchases",
    text: "The form checks the signed-in account, this product and a delivered order. Negative feedback is welcome and stays visible.",
  },
  {
    path: "cart",
    target: ".cart-layout",
    ids: ["09", "10", "11"],
    title: "A checkout with no surprises",
    text: "Relevant hair-care suggestions, a visible five-item limit, explicit coupon eligibility and a total that changes only when savings are applied.",
  },
  {
    path: "cart",
    empty: true,
    target: ".empty",
    ids: ["08"],
    title: "An empty cart still has a next step",
    text: "Clear copy, Continue shopping and Undo help people recover. Removing an item no longer feels like a dead end.",
  },
  {
    path: "footer",
    target: "#site-footer",
    ids: ["03"],
    title: "Small details earn trust",
    text: "The copyright year updates automatically. All 15 fixes are available on the Website fixes page. Now let’s order your gummy and try MY CARE.",
  },
];
function jTourGo(index) {
  if (index >= jSteps.length) {
    jCart();
    return;
  }
  document
    .querySelectorAll(".tour-card button")
    .forEach((b) => (b.disabled = true));
  jTour = Math.max(0, index);
  J.invited = true;
  J.active = true;
  jSave();
  closeModal();
  const st = jSteps[jTour];
  if (st.path === "result" && !W.assessment.result) {
    W.assessment.result = {
      stage: 1,
      version: 1,
      needsReview: false,
      demo: true,
    };
    W.assessment.version = 1;
  }
  if (st.path === "cart") {
    W.cart = st.empty
      ? []
      : [
          {
            key: "hair-gummies:standard",
            id: "hair-gummies",
            variant: "standard",
            qty: 2,
          },
        ];
    W.lastCategory = "hair";
    W.coupon = false;
  }
  save();
  go(st.path, st.params || {});
  clearTimeout(jTourTimer);
  jTourTimer = setTimeout(jPositionTour, 120);
}
function jPositionTour() {
  if (jTour < 0) return;
  const st = jSteps[jTour],
    target =
      document.querySelector(st.target) || document.querySelector("main");
  if (!target) return;
  target.scrollIntoView({ block: "center", behavior: "instant" });
  const r = target.getBoundingClientRect(),
    vw = innerWidth,
    vh = innerHeight,
    x = Math.max(8, r.left - 7),
    y = Math.max(8, r.top - 7),
    w = Math.min(vw - x - 8, r.width + 14),
    h = Math.min(vh - y - 8, r.height + 14),
    cw = Math.min(360, vw - 32);
  let left, top;
  if (x + w + cw + 30 < vw) {
    left = x + w + 20;
    top = Math.max(16, Math.min(y, vh - 300));
  } else {
    left = Math.max(16, Math.min(vw - cw - 16, x + w - cw));
    top =
      y + h + 280 < vh ? y + h + 16 : Math.max(16, Math.min(vh - 300, y - 280));
  }
  if (r.width > vw * 0.8) left = vw - cw - 20;
  $("tour-root").innerHTML =
    `<div class="tour-blocker"></div><div class="tour-spot" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div><section class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" style="left:${left}px;top:${top}px;width:${cw}px"><div class="row between"><span class="eyebrow">WEBSITE TOUR · ${jTour + 1} / ${jSteps.length}</span><button class="text-btn" data-j-action="skip-tour" aria-label="Finish tour and open cart">Skip →</button></div><div class="tour-tags">${st.ids.map((id) => `<span>Fix #${E(id)}</span>`).join("")}</div><h2 id="tour-title">${st.title}</h2><p>${st.text}</p><div class="row between"><button class="btn compact" data-j-action="tour-back" ${jTour === 0 ? "disabled" : ""}>Back</button><button class="btn primary compact" data-j-action="tour-next">${jTour === jSteps.length - 1 ? "Order gummy →" : "Next →"}</button></div></section>`;
  $("app").setAttribute("inert", "");
  document.querySelector('[data-j-action="tour-next"]').focus();
}
function jCheckout() {
  const p = J.profile,
    step = J.step;
  return `<div class="wrap section"><div class="heading"><a href="#cart" class="back">← Back to cart</a><h1 style="margin-top:12px">A few details. Then your care begins.</h1><p>Use fictional details. Nothing is sent to WhatsApp or a delivery service.</p></div><div class="cart-layout"><section class="card"><div class="stepper">${["Contact", "Verify", "Address", "Review"].map((l, i) => `<span class="${i <= ["identity", "otp", "address", "review"].indexOf(step) ? "done" : ""}">${i + 1} · ${l}</span>`).join("")}</div>${step === "identity" ? `<h2>Who are we caring for?</h2><form id="j-contact" class="journey-form"><div class="field"><label for="j-name">Your name · fictional demo</label><input id="j-name" value="${E(p.name)}" maxlength="40" required autocomplete="off"></div><div class="field"><label for="j-phone">WhatsApp number · fictional demo</label><div class="phone-input"><span>+91</span><input id="j-phone" type="tel" inputmode="numeric" value="${E(p.phone)}" pattern="[6-9][0-9]{9}" maxlength="10" required autocomplete="off"></div><small class="muted">Example: 9999999999. No SMS or WhatsApp message is sent.</small></div><button class="btn primary full" type="submit">Get demo OTP →</button></form>` : step === "otp" ? `<h2>Verify your demo number</h2><p>Simulated verification for +91 ${E(p.phone)}.</p><div class="callout"><strong>Demo OTP: 123456</strong><p>No code was sent. Enter this code to continue.</p></div><form id="j-otp" class="journey-form"><div class="field"><label for="j-code">6-digit code</label><input id="j-code" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="123456" required autocomplete="off"></div><div class="errors" id="j-error" role="alert"></div><button class="btn primary full" type="submit">Verify & continue</button></form><button class="text-btn" data-j-action="edit-contact">Change name or number</button>` : step === "address" ? `<h2>Where should your demo order go?</h2><form id="j-address" class="journey-form"><div class="field"><label for="j-address-line">Address · fictional demo</label><textarea id="j-address-line" maxlength="180" required>${E(p.address)}</textarea></div><div class="two-col"><div class="field"><label for="j-city">City</label><input id="j-city" maxlength="60" value="${E(p.city)}" required></div><div class="field"><label for="j-pin">PINCODE</label><input id="j-pin" inputmode="numeric" pattern="[1-9][0-9]{5}" maxlength="6" value="${E(p.pin)}" required></div></div><button class="btn primary full" type="submit">Continue to review →</button></form>` : `<h2>Ready for your next step?</h2><div class="callout green spacer"><strong>${E(p.name)} · Demo number verified</strong><p>+91 ${E(p.phone)}<br>${E(p.address)}, ${E(p.city)} ${E(p.pin)}</p><button class="text-btn" data-j-action="edit-address">Edit address</button></div><div class="spacer">${cartRows()}</div><div class="callout spacer"><strong>No payment details needed</strong><p>BUY NOW simulates payment, order confirmation and delivery. You’ll then set up MY CARE and choose your reminder time.</p></div><div class="row flex-wrap spacer"><button class="btn primary" data-j-action="purchase">BUY NOW · ${money(totals().total)}</button><button class="text-btn" data-j-action="payment-failure">Try a failed payment</button></div><div id="j-error" class="errors" role="alert"></div>`}</section>${jOriginal.summary().replace(/<a class="btn primary full" href="#checkout">[\s\S]*?<\/a>/, '<div class="callout"><strong>MY CARE is included</strong><p>Choose your reminders after the demo delivery.</p></div>')}</div></div>`;
}
checkoutPage = function () {
  return J.active && W.cart.length ? jCheckout() : jOriginal.checkoutPage();
};
function jPurchase() {
  if (jPurchaseBusy || !J.verified || !W.cart.length || !J.profile.pin) return;
  if (
    W.cart.some((i) => product(i.id)?.rx && W.rx.status !== "approved_demo")
  ) {
    say("A medicine in this cart needs clinician review.");
    go("clinic");
    return;
  }
  jPurchaseBusy = true;
  const t = totals(),
    id = "DEMO-" + Date.now().toString(36).toUpperCase(),
    o = {
      id,
      owner: W.user || "guided-demo-member",
      status: "placed",
      items: W.cart.map((i) => ({ ...i })),
      total: t.total,
      coupon: t.discount,
      consent: false,
      location: "Fictional demo address",
      created: new Date().toISOString(),
      guided: true,
    };
  W.user = o.owner;
  W.orders.unshift(o);
  W.cart = [];
  W.coupon = false;
  W.undo = null;
  J.orderId = id;
  jSave();
  save();
  go("confirmation", { order: id });
  setTimeout(() => {
    const order = orderById(id);
    if (order) {
      order.status = "delivered";
      save();
      if (route().path === "confirmation") render();
    }
    jPurchaseBusy = false;
  }, 1700);
}
confirmationPage = function (id) {
  const o = orderById(id);
  if (!o?.guided) return jOriginal.confirmationPage(id);
  const delivered = o.status === "delivered";
  return `<div class="wrap"><section class="card outcome"><div class="success-disc">${icon("check", 32)}</div><span class="eyebrow">DEMO PURCHASE</span><h1 style="margin:12px 0">${delivered ? "Delivered. Let’s make care personal." : "Your order is confirmed."}</h1><p>Thanks, ${E(J.profile.name)}. ${E(o.id)} · ${money(o.total)}</p><div class="delivery-steps"><div class="done">✓<strong>Payment simulated</strong></div><div class="done">✓<strong>Order confirmed</strong></div><div class="${delivered ? "done" : "waiting"}">${delivered ? "✓" : "…"}<strong>Demo delivery</strong></div></div><p>${delivered ? "Choose a start date, reminder time and check-in preferences." : "Fast-forwarding the delivery for this presentation…"}</p><button class="btn primary" data-j-action="setup" ${delivered ? "" : "disabled"}>Set up my account & MY CARE →</button><p class="notice spacer">No charge, parcel or real account has been created.</p></section></div>`;
};
function jOpenCare() {
  const o = orderById(J.orderId);
  if (!o || o.status !== "delivered") return;
  const state = {
    version: 1,
    day: 1,
    start: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
    time: "20:00",
    clock: "20:00",
    stage: W.assessment.result?.stage || 1,
    assessmentVersion: W.assessment.version || 1,
    tab: "overview",
    month: 0,
    optIn: false,
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
    guided: true,
    displayName: J.profile.name,
    journeyPhase: "setup",
  };
  try {
    localStorage.setItem("mm-care-part2-v1", JSON.stringify(state));
  } catch (e) {
    say("Enable browser storage to continue the connected demo.");
    return;
  }
  location.href = "care.html#overview";
}
render = function () {
  if (route().path === "home") {
    $("app").innerHTML = header() + `<main>${jHome()}</main>` + footer();
    document.title = "Man Matters · Part 2 · Ayush Tiwari";
  } else jOriginal.render();
  if (jTour >= 0) {
    clearTimeout(jTourTimer);
    jTourTimer = setTimeout(jPositionTour, 80);
  }
};
handleAction = function (a, b) {
  if (a === "buy" && b.dataset.id === "hair-gummies") {
    J.active = true;
    J.invited = true;
    J.step = "identity";
    J.verified = false;
    jSave();
  }
  return jOriginal.handleAction(a, b);
};
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-j-action]"),
    category = e.target.closest("[data-j-category]");
  if (category) {
    W.category = category.dataset.jCategory;
    W.concern = "all";
    W.stage = "all";
    W.price = "all";
    save();
    go("shop");
    return;
  }
  if (!b) return;
  e.preventDefault();
  switch (b.dataset.jAction) {
    case "invite":
      jInvitation();
      break;
    case "restart":
      clearTimeout(jInviteTimer);
      J = jDefault();
      jSave();
      go("home");
      say(
        "Welcome guide reset. Explore the store: the invitation appears after five clicks.",
      );
      break;
    case "direct":
      jCart();
      break;
    case "tour":
      jTourGo(0);
      break;
    case "tour-next":
      jTourGo(jTour + 1);
      break;
    case "tour-back":
      jTourGo(jTour - 1);
      break;
    case "skip-tour":
      jCart();
      break;
    case "edit-contact":
      J.step = "identity";
      J.verified = false;
      jSave();
      render();
      break;
    case "edit-address":
      J.step = "address";
      jSave();
      render();
      break;
    case "purchase":
      jPurchase();
      break;
    case "setup":
      jOpenCare();
      break;
    case "payment-failure":
      $("j-error").textContent =
        "Demo payment failed. Your cart is kept and no order was created. Try BUY NOW again.";
      break;
  }
});
document.addEventListener("submit", (e) => {
  const f = e.target;
  if (!["j-contact", "j-otp", "j-address"].includes(f.id)) return;
  e.preventDefault();
  if (!f.reportValidity()) return;
  if (f.id === "j-contact") {
    const name = $("j-name").value.trim();
    if (!name) {
      $("j-name").setCustomValidity("Enter a fictional first name.");
      $("j-name").reportValidity();
      return;
    }
    J.profile.name = name;
    J.profile.phone = $("j-phone").value.trim();
    J.verified = false;
    J.step = "otp";
  } else if (f.id === "j-otp") {
    if ($("j-code").value !== "123456") {
      $("j-error").textContent =
        "That code does not match. Use the demo OTP 123456.";
      return;
    }
    J.verified = true;
    J.step = "address";
  } else {
    J.profile.address = $("j-address-line").value.trim();
    J.profile.city = $("j-city").value.trim();
    J.profile.pin = $("j-pin").value;
    J.step = "review";
  }
  jSave();
  render();
});
document.addEventListener("input", (e) => {
  if (e.target.id === "j-name") e.target.setCustomValidity("");
});
document.addEventListener(
  "click",
  (e) => {
    if (
      J.invited ||
      jTour >= 0 ||
      !e.target.closest("#app") ||
      !e.target.closest("a,button,summary,input,select") ||
      e.target.closest("[data-j-action]")
    )
      return;
    J.clicks++;
    if (J.clicks >= 5) {
      J.invited = true;
      clearTimeout(jInviteTimer);
      jInviteTimer = setTimeout(jInvitation, 350);
    }
    jSave();
  },
  true,
);
document.addEventListener("keydown", (e) => {
  if (jTour < 0) return;
  if (e.key === "Escape") {
    e.preventDefault();
    jCart();
  }
  if (e.key === "Tab") {
    const bs = [
        ...document.querySelectorAll(".tour-card button:not([disabled])"),
      ],
      first = bs[0],
      last = bs.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
});
window.addEventListener("resize", () => {
  if (jTour >= 0) {
    clearTimeout(jTourTimer);
    jTourTimer = setTimeout(jPositionTour, 150);
  }
});
render();
