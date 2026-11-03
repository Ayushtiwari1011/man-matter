"use strict";
/* ── MY CARE App Core ──
   Provides the WhatsApp phone demo, message system, state management,
   and rendering that care-journey.js hooks into. */

const CARE_KEY = "mm-care-part2-v1";
let S, pulseDay = null, syncPending = false;

function careDefaults() {
  return {
    version: 1, day: 1,
    start: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
    time: "20:00", clock: "20:00",
    stage: 1, assessmentVersion: 1,
    tab: "overview", month: 0,
    optIn: false, remindersPaused: false,
    appInstalled: true, orderStatus: "delivered",
    active: false, onboarded: false,
    frequency: 15, logs: {}, messages: [], checkins: [], photos: [],
    concerns: [], appointment: null, review: null,
    notification: false, sampleHistory: false,
    pendingNudge: null, lastSync: null, eventLog: [],
    payment: false, storeOrderId: null,
    guided: true, displayName: "Manish", journeyPhase: "setup",
    goal: ""
  };
}

try {
  const saved = JSON.parse(localStorage.getItem(CARE_KEY));
  S = (saved && saved.version === 1) ? saved : careDefaults();
} catch (e) { S = careDefaults(); }

function persist() {
  try { localStorage.setItem(CARE_KEY, JSON.stringify(S)); } catch (e) {}
}

function uid() {
  return "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
}

function dateLabel(day) {
  if (!S.start) return "Day " + day;
  const d = new Date(S.start);
  d.setDate(d.getDate() + day - 1);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function labelStatus(st) {
  return st === "completed" ? "Taken" : st === "skipped" ? "Skipped" : "Pending";
}

function sampleImage() {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 160"><circle cx="70" cy="80" r="50" fill="#e1baa0"/><text x="70" y="85" text-anchor="middle" font-size="12" fill="#3b332d">Sample</text></svg>'
  );
}

function eventLog(type, text) {
  S.eventLog.push({ type, text, at: new Date().toISOString(), day: S.day });
}

function canMessage() {
  if (!S.active || !S.optIn) {
    toast("WhatsApp is off or the journey hasn't started.");
    return false;
  }
  return true;
}

function addMessage(role, text, actions, extra) {
  const msg = {
    id: uid(), role, text,
    actions: actions || [],
    day: S.day, time: S.clock,
    resolved: false,
    ...(extra || {})
  };
  S.messages.push(msg);
  return msg;
}

let careToastTimer;
function toast(message) {
  const el = document.getElementById("care-toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(careToastTimer);
  careToastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

let careModalFocus;
function showModal(title, subtitle, body, actions) {
  careModalFocus = document.activeElement;
  const root = document.getElementById("care-modal-root");
  if (!root) return;
  root.innerHTML = `<div class="cm-overlay" id="cm-overlay">
    <section class="cm-modal" role="dialog" aria-modal="true">
      <div class="cm-head"><h2>${esc(title)}</h2><button class="cm-close" data-close aria-label="Close">×</button></div>
      ${subtitle ? `<p class="cm-sub">${subtitle}</p>` : ""}
      <div class="cm-body">${body}</div>
      ${actions ? `<div class="cm-actions">${actions}</div>` : ""}
    </section></div>`;
  root.querySelector("button")?.focus();
  root.querySelector("#cm-overlay")?.addEventListener("click", e => {
    if (e.target.id === "cm-overlay") closeModal();
  });
  root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
}

function closeModal() {
  const root = document.getElementById("care-modal-root");
  if (root) root.innerHTML = "";
  careModalFocus?.focus?.();
}

/* ── Navigate between MY CARE tabs ── */
function navigate(tab) {
  S.tab = tab;
  persist();
  render();
}

/* ── WhatsApp Phone Rendering ── */
function renderPhone() {
  if (!S.active || !S.messages.length) {
    return `<div class="wa-phone" id="whatsapp-demo">
      <div class="wa-header"><span class="wa-dot"></span> Man Matters Care <small>Demo</small></div>
      <div class="wa-body wa-empty">
        <p>Your WhatsApp care conversation will appear here once you start the journey.</p>
        <button class="btn primary" id="wa-start-btn">Start MY CARE Journey →</button>
      </div>
    </div>`;
  }

  const msgs = S.messages.map((m, i) => renderMessage(m)).join("");
  const inputArea = S.active ? `<div class="wa-input">
    <input type="text" id="wa-type" placeholder="Type a message…" autocomplete="off">
    <button id="wa-send" class="wa-send-btn">▶</button>
  </div>` : "";

  return `<div class="wa-phone" id="whatsapp-demo">
    <div class="wa-header">
      <span class="wa-dot"></span> Man Matters Care
      <small>Demo · Day ${S.day}</small>
      ${S.notification ? '<span class="wa-notif">1</span>' : ""}
    </div>
    <div class="wa-body" id="chat-body">${msgs}</div>
    ${inputArea}
  </div>`;
}

function renderMessage(m) {
  const isBot = m.role === "bot";
  const isSystem = m.role === "system";
  const photo = m.image ? `<img class="wa-photo" src="${esc(m.image)}" alt="Progress photo">` : "";
  const actions = (m.actions && m.actions.length && !m.resolved)
    ? `<div class="wa-actions">${m.actions.map(a =>
        `<button class="wa-action" data-reply-id="${a.id}" data-msg-id="${m.id}">${esc(a.label)}</button>`
      ).join("")}</div>` : "";
  const sample = m.sample ? '<small class="wa-sample">Illustrative demo history</small>' : "";

  if (isSystem) {
    return `<div class="wa-system">${esc(m.text)}</div>`;
  }
  return `<div class="wa-msg ${isBot ? "wa-bot" : "wa-user"}">
    ${sample}${photo}<span class="wa-text">${esc(m.text).replace(/\n/g, "<br>")}</span>
    <span class="wa-stamp">Day ${m.day} · ${m.time || S.time}</span>
    ${actions}
  </div>`;
}

/* ── Overridable action hooks (care-journey.js replaces these) ── */
function reply(id, mid) {
  // Default no-op; care-journey.js overrides
}

function action(name) {
  if (name === "reset") {
    S = careDefaults();
    persist();
    render();
    toast("MY CARE reset.");
  }
}

function typedReply(text) {
  if (!text.trim()) return;
  addMessage("user", text.trim());
  persist();
  render();
  const chat = document.getElementById("chat-body");
  if (chat) chat.scrollTop = chat.scrollHeight;
}

function showOnboard() {
  // Default; care-journey.js overrides
  toast("Set up your care profile to begin.");
}

function renderSettings() {
  return `<div class="care-settings">
    <h3>Care Settings</h3>
    <p class="muted">No real names, phone numbers, payments or medical records are required. Everything stays in this browser.</p>
    <div class="settings-grid">
      <label><span>WhatsApp reminders</span>
        <input type="checkbox" id="set-optin" ${S.optIn ? "checked" : ""}></label>
      <label><span>Reminder time</span>
        <input type="time" id="set-time" value="${S.time}"></label>
    </div>
    <button class="btn compact" id="save-settings">Save settings</button>
    <button class="btn compact danger" data-care-action="reset">Reset all data</button>
  </div>`;
}

/* ── Main render ── */
function render() {
  const app = document.getElementById("care-app");
  if (!app) return;

  // Build tabs
  const tabs = ["overview", "calendar", "progress", "care", "settings"];
  const tabLabels = { overview: "Overview", calendar: "Calendar", progress: "Progress", care: "Care Team", settings: "Settings" };

  const tabBar = `<div class="care-tabs" role="tablist">
    ${tabs.map(t => `<button class="care-tab ${S.tab === t ? "active" : ""}" data-care-tab="${t}" role="tab" aria-selected="${S.tab === t}">${tabLabels[t]}</button>`).join("")}
  </div>`;

  let content = "";
  if (S.tab === "settings") {
    content = renderSettings();
  } else if (S.tab === "calendar") {
    content = renderCalendar();
  } else if (S.tab === "progress") {
    content = renderProgress();
  } else if (S.tab === "care") {
    content = renderCareTeam();
  } else {
    content = renderOverview();
  }

  app.innerHTML = `
    <div class="care-layout">
      <div class="care-main" id="care-content">
        <div class="care-top">
          <div>
            <p class="care-eyebrow">MY CARE</p>
            <h1 class="care-title">A little care, ${esc(S.displayName || "Manish")}. Every day.</h1>
          </div>
          <div class="account">
            <span class="avatar">${(S.displayName || "MA").slice(0, 2).toUpperCase()}</span>
            <span class="account-copy"><strong>${esc(S.displayName || "Manish")}</strong><br><span class="muted">Demo care profile</span></span>
          </div>
        </div>
        <div class="demo-label"><i class="proto-dot"></i> <small>Interactive demo · all data stays in this browser</small></div>
        ${tabBar}
        <div class="care-panel">${content}</div>
        <div class="channel-controls"></div>
      </div>
      <div class="care-phone-col">
        ${renderPhone()}
      </div>
    </div>`;

  // Bind events after render
  bindCareEvents();
}

function renderOverview() {
  const dayNum = S.day || 1;
  const streak = Object.values(S.logs).filter(l => l.status === "completed").length;
  const dosesTaken = streak;
  const progress = Math.round((dayNum / 30) * 100);

  return `
    <div class="care-stats">
      <div class="care-stat"><span>JOURNEY</span><strong>Day ${dayNum}<small>/30</small></strong>
        <div class="care-progress-track"><i style="width:${progress}%"></i></div></div>
      <div class="care-stat"><span>STREAK</span><strong>${streak} days 🔥</strong></div>
      <div class="care-stat"><span>DOSES</span><strong>${dosesTaken}</strong></div>
      <div class="care-stat"><span>REMINDER</span><strong>${S.time} IST</strong></div>
    </div>
    ${S.lastSync ? `<div class="care-sync"><span class="sync-dot"></span> ${esc(S.lastSync)}</div>` : ""}
    ${!S.onboarded ? `<div class="care-cta-card">
      <h3>Ready to begin?</h3>
      <p>Set up your care profile, choose your reminder time, and start your WhatsApp journey.</p>
      <button class="btn primary" data-care-action="walkthrough">Start MY CARE →</button>
    </div>` : ""}
    ${S.checkins.length ? `<div class="care-checkins">
      <h3>Your check-ins</h3>
      ${S.checkins.map(c => `<div class="checkin-item"><span class="check">✓</span> Day ${c.day} · ${esc(c.feeling)}</div>`).join("")}
    </div>` : ""}`;
}

function renderCalendar() {
  let cells = "";
  for (let d = 1; d <= 30; d++) {
    const log = S.logs[d];
    const cls = log ? (log.status === "completed" ? "done" : "skipped") : (d === S.day ? "current" : "");
    cells += `<span class="cal-cell ${cls}">${d}</span>`;
  }
  return `<h3>Your 30-day calendar</h3>
    <div class="care-calendar">${cells}</div>
    <div class="cal-legend">
      <span><i class="legend-done"></i> Completed</span>
      <span><i class="legend-skip"></i> Skipped</span>
      <span><i class="legend-today"></i> Today</span>
      <span><i class="legend-empty"></i> Upcoming</span>
    </div>`;
}

function renderProgress() {
  const completed = Object.values(S.logs).filter(l => l.status === "completed").length;
  const skipped = Object.values(S.logs).filter(l => l.status === "skipped").length;
  const photos = S.photos || [];

  return `<h3>Your progress</h3>
    <div class="care-stats">
      <div class="care-stat"><span>COMPLETED</span><strong>${completed}</strong></div>
      <div class="care-stat"><span>SKIPPED</span><strong>${skipped}</strong></div>
      <div class="care-stat"><span>PHOTOS</span><strong>${photos.length}</strong></div>
    </div>
    ${photos.length ? `<div class="progress-photos">${photos.map(p =>
      `<div class="progress-photo"><img src="${esc(p.data)}" alt="Day ${p.day} photo"><small>Day ${p.day}</small></div>`
    ).join("")}</div>` : ""}
    ${S.checkins.length ? `<div class="progress-checkins">
      <h3>Check-in history</h3>
      ${S.checkins.map(c => `<div class="checkin-row">
        <strong>Day ${c.day}</strong> · ${esc(c.feeling)}
        ${c.note ? `<p class="muted">${esc(c.note)}</p>` : ""}
      </div>`).join("")}
    </div>` : "<p class='muted'>Complete a Day 15 or Day 30 check-in to see progress here.</p>"}`;
}

function renderCareTeam() {
  const appt = S.appointment;
  return `<h3>Your care team</h3>
    <div class="care-doctor">
      <div class="doctor-icon">✚</div>
      <div>
        <p class="care-eyebrow">COMPLIMENTARY CONSULTATION</p>
        <h4>Your care team is here for you.</h4>
        <p class="muted">A check-in helps you discuss your routine, progress and questions. This demo does not provide medical advice.</p>
        ${appt ? `<div class="appt-card"><strong>${esc(appt.slot)} IST</strong><br><span class="muted">${esc(appt.reason)} · ${appt.status}</span></div>` : ""}
      </div>
    </div>
    ${S.concerns.length ? `<div class="concerns-list">
      <h4>Reported concerns</h4>
      ${S.concerns.map(c => `<div class="concern-item ${c.status}">
        <strong>Day ${c.day}</strong> · ${esc(c.text)} <span class="pill">${c.status}</span>
      </div>`).join("")}
    </div>` : ""}`;
}

/* ── Event Binding ── */
function bindCareEvents() {
  // Tab clicks
  document.querySelectorAll("[data-care-tab]").forEach(btn => {
    btn.addEventListener("click", () => navigate(btn.dataset.careTab));
  });

  // Action buttons
  document.querySelectorAll("[data-care-action]").forEach(btn => {
    btn.addEventListener("click", () => action(btn.dataset.careAction));
  });

  // WhatsApp reply buttons
  document.querySelectorAll("[data-reply-id]").forEach(btn => {
    btn.addEventListener("click", () => reply(btn.dataset.replyId, btn.dataset.msgId));
  });

  // WhatsApp start button
  const startBtn = document.getElementById("wa-start-btn");
  if (startBtn) startBtn.addEventListener("click", () => showOnboard());

  // WhatsApp type + send
  const sendBtn = document.getElementById("wa-send");
  const typeInput = document.getElementById("wa-type");
  if (sendBtn && typeInput) {
    sendBtn.addEventListener("click", () => {
      typedReply(typeInput.value);
      typeInput.value = "";
    });
    typeInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        typedReply(typeInput.value);
        typeInput.value = "";
      }
    });
  }

  // Settings save
  const saveBtn = document.getElementById("save-settings");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const optIn = document.getElementById("set-optin");
      const time = document.getElementById("set-time");
      if (optIn) S.optIn = optIn.checked;
      if (time && time.value) S.time = time.value;
      persist();
      toast("Settings saved.");
      render();
    });
  }

  // Scroll chat to bottom
  const chat = document.getElementById("chat-body");
  if (chat) chat.scrollTop = chat.scrollHeight;
}

/* ── Init ── */
document.addEventListener("DOMContentLoaded", () => {
  render();
});
