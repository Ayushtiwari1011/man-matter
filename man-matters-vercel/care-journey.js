"use strict";
const cjOld = {
  render,
  reply,
  action,
  typedReply,
  showOnboard,
  renderMessage,
  renderSettings,
};
let cjTimer,
  cjPhoto = null,
  cjMilestoneDay = null;
const cjName = () => S.displayName || "Manish";
function cjSaveRender() {
  persist();
  render();
}
function cjMessage(text, actions = [], extra = {}) {
  return addMessage("bot", text, actions, {
    stage: S.stage,
    assessmentVersion: S.assessmentVersion,
    ...extra,
  });
}
function cjDailyActions() {
  return [
    { id: "j-yes", label: "Yes" },
    { id: "j-now", label: "Taking right now" },
    { id: "j-later", label: "Remind me in 15 minutes" },
    { id: "j-no", label: "No" },
  ];
}
function cjShowPhone() {
  document
    .getElementById("whatsapp-demo")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function cjRoutineSetup() {
  showModal(
    "Make MY CARE yours",
    `Your order is ready, ${esc(cjName())}. Set up your care profile.`,
    `<form id="cj-setup" class="guided-setup"><div class="care-ready-summary"><div><small>PROFILE</small><strong>${esc(cjName())}</strong>Fictional demo account</div><div><small>PRODUCT</small><strong>Hair Gummies · 60 count</strong>Stage ${S.stage} example · one saved plan</div></div><div class="field"><label for="cj-start">Start date</label><input id="cj-start" type="date" value="${S.start}" required></div><div class="field"><label for="cj-time">When would you like a reminder? · IST</label><input id="cj-time" type="time" value="${S.time}" required></div><div class="field"><label for="cj-goal">What would you like to focus on?</label><select id="cj-goal"><option>Build a consistent hair-care routine</option><option>Keep track of progress and questions</option><option>Stay connected with the care team</option></select></div><div class="preview-line"><strong>Demo routine:</strong> 1 gummy after a meal · 60-day tracking calendar.<br>Illustrative schedule only. Live directions would come from the verified product label or clinician; the calendar does not promise results.</div><label class="check"><input type="checkbox" id="cj-optin" ${S.optIn ? "checked" : ""}><span>I choose WhatsApp care reminders and Day 15 / Day 30 progress check-ins. I can stop anytime.<br><small class="muted">Optional, separate from marketing and simulated inside this browser.</small></span></label><button type="submit" class="btn primary full" style="margin-top:16px">Save my care profile →</button></form>`,
  );
  document.getElementById("cj-setup").onsubmit = (e) => {
    e.preventDefault();
    if (!e.currentTarget.reportValidity()) return;
    S.start = document.getElementById("cj-start").value;
    S.time = document.getElementById("cj-time").value;
    S.clock = S.time;
    S.optIn = document.getElementById("cj-optin").checked;
    S.goal = document.getElementById("cj-goal").value;
    S.onboarded = true;
    S.active = false;
    S.journeyPhase = "ready";
    S.messages = [];
    S.logs = {};
    S.checkins = [];
    S.photos = [];
    S.day = 1;
    eventLog(
      "profile",
      "Start date, reminder time and optional WhatsApp preference saved",
    );
    closeModal();
    cjSaveRender();
    cjReady();
  };
}
function cjReady() {
  showModal(
    "Your profile is ready. Shall we start?",
    `A little care, every day, ${esc(cjName())}.`,
    `<div class="care-ready-summary"><div><small>YOUR REMINDER</small><strong>${S.time} IST</strong>At your chosen time</div><div><small>YOUR CHECK-INS</small><strong>Day 15 & Day 30</strong>Photos, updates and care support</div></div><p style="margin-top:20px">${S.optIn ? "See your first WhatsApp message arrive, then fast-forward the conversation to Day 15 and Day 30." : "WhatsApp is off. Start the website calendar, or turn on simulated reminders to experience the WhatsApp journey."}</p>`,
    `<button class="btn" data-close>Not yet</button><button class="btn primary" id="cj-start-now">${S.optIn ? "Yes, start the process" : "Start website calendar"}</button>${S.optIn ? "" : '<button class="btn soft" id="cj-enable">Enable WhatsApp demo & start</button>'}`,
  );
  document.getElementById("cj-start-now").onclick = () => {
    closeModal();
    cjStart();
  };
  document.getElementById("cj-enable")?.addEventListener("click", () => {
    S.optIn = true;
    eventLog("consent", "WhatsApp demo opted in");
    closeModal();
    cjStart();
  });
}
function cjStart() {
  S.active = true;
  S.journeyPhase = "day1";
  S.day = 1;
  S.clock = S.time;
  S.tab = "overview";
  S.messages = [
    {
      id: uid(),
      role: "system",
      text: "Personalised demonstration · no real WhatsApp messages are sent",
      day: 1,
      time: S.time,
    },
  ];
  if (S.optIn) {
    cjMessage(
      `${cjName()}, your first small step starts here 🌱\nDid you take your first gummies?`,
      cjDailyActions(),
      { eventDay: 1, tag: "guided-day-1" },
    );
    S.notification = true;
  } else {
    addMessage("system", "WhatsApp is off. Your website calendar is ready.");
    S.notification = false;
  }
  eventLog("journey", "Day 1 reminder at saved time " + S.time);
  cjSaveRender();
  if (S.optIn) cjShowPhone();
}
function cjRecordDaily(st) {
  S.logs[S.day] = {
    status: st,
    source: "WhatsApp",
    loggedAtDay: S.day,
    time: S.clock,
  };
  S.lastSync = `Day ${S.day} · ${labelStatus(st)} · synced from WhatsApp`;
  S.pendingNudge = null;
  eventLog("sync", S.lastSync);
  pulseDay = S.day;
}
function cjCanAdvance() {
  return (
    S.guided &&
    S.active &&
    S.optIn &&
    !S.remindersPaused &&
    !S.concerns.some((c) => c.status === "open")
  );
}
function cjAdvanceAfterReply() {
  if (S.day !== 1) return;
  S.journeyPhase = "day1-done";
  persist();
  clearTimeout(cjTimer);
  cjTimer = setTimeout(() => {
    if (cjCanAdvance() && S.journeyPhase === "day1-done") cjAdvance(15);
  }, 1800);
}
const cjPrompts = [
  (n) => `${n}, a small moment for yourself 🌱 Have you taken today’s gummy?`,
  (n) => `Checking in, ${n}. How did your routine go today?`,
  (n) => `${n}, your daily care companion here. Ready for today’s check-in?`,
  (n) => `One little habit at a time, ${n}. Did you take your gummy today?`,
  (n) => `A gentle nudge, ${n} ☀️ Has today’s gummy made it into your routine?`,
  (n) => `${n}, let’s keep your calendar honest. What’s today’s update?`,
  (n) => `You set the pace, ${n}. Have you checked in with your routine today?`,
];
function cjPlus15(time) {
  const mins = Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) + 15;
  return {
    time:
      String(Math.floor((mins % 1440) / 60)).padStart(2, "0") +
      ":" +
      String(mins % 60).padStart(2, "0"),
    crosses: mins >= 1440,
  };
}
function cjSeedUntil(target) {
  const oldDay = S.day,
    oldClock = S.clock;
  for (let d = 2; d < target; d++) {
    if (d === 15 || S.messages.some((m) => m.tag === "seed-day-" + d)) continue;
    S.day = d;
    S.clock = S.time;
    const skipped = [5, 11, 21, 27].includes(d),
      later = [7, 18, 24].includes(d);
    cjMessage(cjPrompts[(d - 1) % cjPrompts.length](cjName()), [], {
      tag: "seed-day-" + d,
      sample: true,
    });
    if (skipped) {
      addMessage("user", "No, skipping today.", [], { sample: true });
      S.logs[d] ??= {
        status: "skipped",
        source: "Illustrative demo history",
        loggedAtDay: d,
        time: S.time,
      };
    } else if (later) {
      addMessage("user", "Remind me in 15 minutes.", [], { sample: true });
      const time = cjPlus15(S.time).time;
      cjMessage(`Your requested follow-up, ${cjName()}. Did you take it?`, [], {
        time,
        sample: true,
      });
      addMessage("user", "Yes, taken now. Thanks!", [], { time, sample: true });
      S.logs[d] ??= {
        status: "completed",
        source: "Illustrative demo history",
        loggedAtDay: d,
        time,
      };
    } else {
      addMessage(
        "user",
        [
          "Yes, done for today!",
          "Taken after my meal.",
          "Yes, checked in ✅",
          "Done. One step at a time.",
        ][d % 4],
        [],
        { sample: true },
      );
      S.logs[d] ??= {
        status: "completed",
        source: "Illustrative demo history",
        loggedAtDay: d,
        time: S.time,
      };
    }
  }
  S.day = oldDay;
  S.clock = oldClock;
  S.sampleHistory = true;
}
function cjAdvance(target) {
  if (!S.active || !S.onboarded) {
    cjRoutineSetup();
    return;
  }
  if (!cjCanAdvance()) {
    toast(
      "WhatsApp is off or paused. Your website history is still available.",
    );
    return;
  }
  if (target < S.day) {
    cjScrollDay(target);
    return;
  }
  clearTimeout(cjTimer);
  cjSeedUntil(target);
  S.day = target;
  S.clock = S.time;
  S.month = 0;
  S.notification = false;
  S.journeyPhase = "day" + target;
  if (!S.messages.some((m) => m.tag === "guided-milestone-" + target)) {
    const text =
      target === 15
        ? `${cjName()}, it’s Day 15 — two weeks of showing up for your care 🌿\nLet’s check your progress. How has your routine felt? Send a message, add a scalp photo, or speak with a doctor.`
        : `A month of little steps, ${cjName()} ✨\nIt’s Day 30. Let’s look back together. How are you feeling, and is there anything you’d like the care team to know?`;
    cjMessage(
      text,
      [
        { id: "j-draft", label: "Draft a message" },
        { id: "j-photo", label: "Take a photo" },
        { id: "j-doctor", label: "Consult a doctor" },
        { id: "j-website", label: "Go to website" },
      ],
      { tag: "guided-milestone-" + target, eventDay: target },
    );
  }
  S.lastSync = `Day ${target} check-in received · earlier replies kept in your calendar`;
  eventLog(
    "clock",
    "Presentation advanced to Day " +
      target +
      "; intermediate replies labelled as sample history",
  );
  cjSaveRender();
  cjShowPhone();
}
function cjScrollDay(day) {
  S.notification = false;
  persist();
  render();
  document
    .querySelector(`[data-chat-day="${day}"]`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function cjFinishMilestone(kind, text) {
  const d = cjMilestoneDay || S.day;
  cjMilestoneDay = null;
  const msg = S.messages.find((m) => m.tag === "guided-milestone-" + d);
  if (msg) msg.resolved = true;
  if (kind === "website") {
    addMessage("user", "Go to website");
    S.tab = "progress";
  }
  S.checkins.push({
    id: uid(),
    day: d,
    feeling:
      kind === "photo"
        ? "Photo shared"
        : kind === "doctor"
          ? "Consultation requested"
          : kind === "website"
            ? "Website visited"
            : "Progress update",
    note: text,
    source: "WhatsApp",
  });
  S.lastSync = `Day ${d} · ${kind === "doctor" ? "Consultation" : kind === "photo" ? "Photo and check-in" : "Progress check-in"} synced from WhatsApp`;
  eventLog("checkin", S.lastSync);
  cjMessage(
    `${cjName()}, your update is saved in MY CARE. You can revisit it anytime.`,
  );
  closeModal();
  S.journeyPhase = d === 30 ? "complete" : "day15-done";
  cjSaveRender();
  if (d === 15) {
    clearTimeout(cjTimer);
    cjTimer = setTimeout(() => {
      if (cjCanAdvance() && S.journeyPhase === "day15-done") cjAdvance(30);
    }, 2000);
  } else {
    cjMessage(
      `That’s your 30-day demo, ${cjName()}. Your conversation, photos and calendar stay together. Scroll back through the chat or explore your MY CARE tabs.`,
      [
        { id: "j-view-calendar", label: "View my calendar" },
        { id: "j-view-progress", label: "View my progress" },
      ],
      { tag: "guided-complete" },
    );
    cjSaveRender();
  }
}
function cjConcern(text) {
  if (
    /\b(unwell|rash|nausea|side effects?|dizz\w*|itch\w*|pain)\b/i.test(text) &&
    !/\b(no|without)\s+(side effects?|pain|itch\w*|rash)\b/i.test(text)
  ) {
    S.concerns.unshift({ id: uid(), day: S.day, text, status: "open" });
    S.remindersPaused = true;
    S.pendingNudge = null;
    cjMessage(
      "Your concern is saved as reported. Routine nudges are paused. Please discuss it with a qualified clinician; this demo is not monitored.",
    );
  }
}
function cjDraft() {
  cjMilestoneDay = S.day;
  showModal(
    `Day ${S.day} · Your progress message`,
    "Your words will be kept in the chat and on the website.",
    `<form id="cj-message-form"><label for="cj-progress-text">What would you like to share?</label><textarea id="cj-progress-text" class="journey-milestone-input" maxlength="500" required placeholder="For example: I’m finding the routine easier. I’d like to discuss my progress."></textarea><label class="check"><input type="checkbox" id="cj-intake">I also confirm I took today’s scheduled gummy.</label><p class="small muted">A progress message alone does not confirm a dose.</p><button type="submit" class="btn primary full" style="margin-top:15px">Send demo message & sync</button></form>`,
  );
  document.getElementById("cj-message-form").onsubmit = (e) => {
    e.preventDefault();
    const input = document.getElementById("cj-progress-text"),
      text = input.value.trim();
    if (!text) {
      input.setCustomValidity("Write a short demo update.");
      input.reportValidity();
      return;
    }
    if (document.getElementById("cj-intake").checked)
      cjRecordDaily("completed");
    addMessage("user", text);
    cjConcern(text);
    cjFinishMilestone("message", text);
  };
  document.getElementById("cj-progress-text").oninput = (e) =>
    e.target.setCustomValidity("");
}
function cjPhotoForm() {
  cjMilestoneDay = S.day;
  cjPhoto = null;
  showModal(
    `Day ${S.day} · A photo check-in`,
    "Use a sample illustration or choose a local photo. Photos are optional.",
    `<div id="cj-photo-preview"></div><button class="btn soft full" id="cj-sample">Use a sample scalp illustration</button><div class="field"><label for="cj-photo-file">Take a photo or choose an image</label><input type="file" id="cj-photo-file" accept="image/jpeg,image/png,image/webp" capture="environment"><small>Up to 1 MB. Stored only in this browser; no image analysis.</small></div><label class="check"><input type="checkbox" id="cj-photo-consent">I choose to save this image in my local demo profile.</label><div id="cj-photo-error" class="error-text" role="alert"></div>`,
    '<button class="btn" data-close>Cancel</button><button class="btn primary" id="cj-photo-save">Share photo & sync</button>',
  );
  const preview = () => {
    document.getElementById("cj-photo-preview").innerHTML =
      `<img class="guided-upload-preview" src="${esc(cjPhoto.data)}" alt="${cjPhoto.sample ? "Sample scalp illustration" : "Local photo preview"}">`;
  };
  document.getElementById("cj-sample").onclick = () => {
    cjPhoto = { data: sampleImage(), sample: true };
    preview();
  };
  document.getElementById("cj-photo-file").onchange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
      f.size > 1048576
    ) {
      cjPhoto = null;
      document.getElementById("cj-photo-error").textContent =
        "Choose a JPG, PNG or WebP no larger than 1 MB.";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (!document.getElementById("cj-photo-preview")) return;
      cjPhoto = { data: reader.result, sample: false };
      preview();
    };
    reader.readAsDataURL(f);
  };
  document.getElementById("cj-photo-save").onclick = () => {
    if (!cjPhoto || !document.getElementById("cj-photo-consent").checked) {
      document.getElementById("cj-photo-error").textContent =
        "Choose an image and confirm local storage first.";
      return;
    }
    const image = cjPhoto;
    S.photos.push({ id: uid(), day: S.day, ...image });
    addMessage("user", "Here is my optional progress photo.", [], {
      image: image.data,
    });
    S.tab = "progress";
    cjFinishMilestone(
      "photo",
      "Optional scalp photo added. No medical interpretation was made.",
    );
  };
}
function cjDoctor() {
  cjMilestoneDay = S.day;
  showModal(
    "A doctor, when you need one",
    "Choose a free simulated consultation. No actual call is booked.",
    `<form id="cj-booking"><div class="field"><label for="cj-slot">Available demo slots · IST</label><select id="cj-slot"><option>Tomorrow · 10:00</option><option>Tomorrow · 16:30</option><option>In 2 days · 11:00</option></select></div><div class="field"><label for="cj-reason">What would you like to discuss?</label><select id="cj-reason"><option>My progress and routine</option><option>A concern or possible side effect</option><option>Product suitability</option></select></div><label class="check"><input type="checkbox" id="cj-share">Include my demo check-ins and photos in this simulated consultation.</label><p class="small muted">For severe or urgent symptoms, seek immediate medical help. This demo is not monitored.</p><button class="btn primary full" type="submit">Confirm free demo consultation</button></form>`,
  );
  document.getElementById("cj-booking").onsubmit = (e) => {
    e.preventDefault();
    const slot = document.getElementById("cj-slot").value,
      reason = document.getElementById("cj-reason").value;
    S.appointment = {
      slot,
      reason,
      status: "booked",
      shareHistory: document.getElementById("cj-share").checked,
    };
    addMessage(
      "user",
      "I’d like to consult a doctor about " + reason.toLowerCase() + ".",
    );
    S.tab = "care";
    cjFinishMilestone(
      "doctor",
      "Demo consultation: " + slot + " IST · " + reason,
    );
  };
}
reply = function (id, mid) {
  if (!S.guided || !id.startsWith("j-")) return cjOld.reply(id, mid);
  const msg = S.messages.find((m) => m.id === mid);
  if (!msg || msg.resolved || syncPending) return;
  if (msg.eventDay && msg.eventDay !== S.day) {
    toast(
      "That message is from an earlier day. Edit the dated calendar entry if needed.",
    );
    return;
  }
  S.notification = false;
  if (["j-draft", "j-photo", "j-doctor"].includes(id)) {
    if (id === "j-draft") cjDraft();
    if (id === "j-photo") cjPhotoForm();
    if (id === "j-doctor") cjDoctor();
    return;
  }
  if (id === "j-website") {
    cjMilestoneDay = S.day;
    cjFinishMilestone(
      "website",
      "Opened MY CARE to review progress. No dose was inferred.",
    );
    document
      .getElementById("care-content")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (id === "j-view-calendar" || id === "j-view-progress") {
    navigate(id === "j-view-calendar" ? "calendar" : "progress");
    return;
  }
  msg.resolved = true;
  addMessage("user", msg.actions?.find((a) => a.id === id)?.label || id);
  if (id === "j-yes" || id === "j-confirm") {
    cjRecordDaily("completed");
    cjMessage(
      `First step, done, ${cjName()} ✅ Your calendar is updated. Your Day 15 check-in is next.`,
    );
    cjSaveRender();
    cjAdvanceAfterReply();
  } else if (id === "j-no") {
    cjRecordDaily("skipped");
    cjMessage(
      `Thanks for being honest, ${cjName()}. Today is marked skipped, with no extra dose suggested. Your Day 15 check-in is next.`,
    );
    cjSaveRender();
    cjAdvanceAfterReply();
  } else if (id === "j-now") {
    cjRecordDaily("not_yet");
    cjMessage(
      `Take your time, ${cjName()}. Tap below once you have taken it so your calendar stays accurate.`,
      [
        { id: "j-confirm", label: "Done, I have taken it" },
        { id: "j-no", label: "Skip today" },
      ],
      { eventDay: S.day },
    );
    cjSaveRender();
  } else if (id === "j-later") {
    cjRecordDaily("not_yet");
    const next = cjPlus15(S.clock);
    S.pendingNudge = { day: S.day, ...next };
    cjMessage(
      `Of course, ${cjName()}. One gentle reminder is set for ${next.time} IST${next.crosses ? " on the next calendar day, for this same scheduled routine" : ""}.`,
      [{ id: "j-fast15", label: "Fast-forward 15 minutes" }],
      { eventDay: S.day },
    );
    cjSaveRender();
  } else if (id === "j-fast15") {
    if (!S.optIn || S.remindersPaused) {
      toast("Reminders are off or paused.");
      return;
    }
    S.clock = S.pendingNudge?.time || S.time;
    S.pendingNudge = null;
    cjMessage(
      `${cjName()}, here’s the follow-up you asked for. Did you take your scheduled gummy?`,
      [
        { id: "j-yes", label: "Yes" },
        { id: "j-no", label: "No" },
      ],
      { eventDay: S.day },
    );
    cjSaveRender();
  }
};
renderMessage = function (m) {
  let html = cjOld.renderMessage(m);
  if (S.guided && m.sample)
    html = html.replace(
      '<span class="stamp">',
      '<small class="sample-mark">Illustrative demo history</small><span class="stamp">',
    );
  if (S.guided) {
    const i = S.messages.indexOf(m);
    if (i === 0 || S.messages[i - 1]?.day !== m.day)
      html =
        `<div class="chat-day-divider" data-chat-day="${m.day}"><span>Day ${m.day} · ${dateLabel(m.day)}</span></div>` +
        html;
  }
  return html;
};
renderSettings = function () {
  let html = cjOld.renderSettings();
  if (S.guided)
    html = html.replace(
      "No real names, phone numbers, payments or medical records are required. Everything stays in this browser.",
      "Use fictional details only. The demo first name is saved in this browser; contact and address fields stay in this tab session. Nothing is sent to WhatsApp or a delivery service.",
    );
  return html;
};
render = function () {
  cjOld.render();
  if (!S.guided) return;
  const name = cjName(),
    acc = document.querySelector(".account-copy");
  if (acc)
    acc.innerHTML = `<strong>${esc(name)}</strong><br><span class="muted">Demo care profile</span>`;
  const avatar = document.querySelector(".account .avatar");
  if (avatar) avatar.textContent = name.slice(0, 2).toUpperCase();
  const title = document.querySelector(".title-row h1");
  if (title)
    title.textContent =
      S.journeyPhase === "complete"
        ? `30 days of care, ${name}.`
        : `A little care, ${name}. Every day.`;
  const bar = document.querySelector(".demo-label small");
  if (bar)
    bar.textContent =
      "One continuous conversation. Intermediate days use labelled sample history.";
  const controls = document.querySelector(".channel-controls");
  if (controls) {
    controls.insertAdjacentHTML(
      "afterbegin",
      `<div class="journey-chat-controls"><button data-cj-jump="1">Day 1</button><button data-cj-jump="15">Day 15</button><button data-cj-jump="30">Day 30</button><button data-cj-bottom>Latest message ↓</button></div><p class="chat-jump-hint">Earlier replies are kept. Day 2–14 and 16–29 use fictional sample replies.</p>`,
    );
    controls.querySelectorAll("[data-cj-jump]").forEach(
      (b) =>
        (b.onclick = () => {
          const d = Number(b.dataset.cjJump);
          if (d <= S.day) cjScrollDay(d);
          else cjAdvance(d);
        }),
    );
    controls.querySelector("[data-cj-bottom]").onclick = () => {
      const c = document.getElementById("chat-body");
      if (c) c.scrollTop = c.scrollHeight;
    };
  }
  const content = document.getElementById("care-content");
  if (content) {
    if (S.journeyPhase === "ready")
      content.insertAdjacentHTML(
        "afterbegin",
        '<div class="journey-phase-note"><strong>Your profile is ready.</strong><br><button class="btn primary" id="cj-ready-button">Start the process →</button></div>',
      );
    if (S.journeyPhase === "setup")
      content.insertAdjacentHTML(
        "afterbegin",
        '<div class="journey-phase-note"><strong>Let’s set up your account.</strong><br><button class="btn primary" id="cj-setup-button">Set up MY CARE →</button></div>',
      );
    if (S.journeyPhase === "complete")
      content.insertAdjacentHTML(
        "afterbegin",
        '<div class="journey-phase-note"><strong>Your 30-day demo is complete.</strong><br>Scroll the full WhatsApp chat or explore your calendar and Progress. Your replies remain alongside labelled sample days.</div>',
      );
  }
  document
    .getElementById("cj-ready-button")
    ?.addEventListener("click", cjReady);
  document
    .getElementById("cj-setup-button")
    ?.addEventListener("click", cjRoutineSetup);
};
showOnboard = function () {
  return S.guided ? cjRoutineSetup() : cjOld.showOnboard();
};
action = function (name) {
  if (!S.guided) return cjOld.action(name);
  if (name === "send-nudge") {
    const pending = [...S.messages]
      .reverse()
      .find(
        (m) =>
          !m.resolved &&
          m.eventDay === S.day &&
          m.actions?.some((a) => a.id === "j-fast15"),
      );
    if (pending) reply("j-fast15", pending.id);
    return;
  }
  if (name === "day15") {
    cjAdvance(15);
    return;
  }
  if (name === "day30") {
    cjAdvance(30);
    return;
  }
  if (name === "today") {
    cjScrollDay(1);
    return;
  }
  if (name === "walkthrough") {
    if (!S.onboarded) cjRoutineSetup();
    else if (!S.active) cjReady();
    else {
      S.notification = false;
      cjSaveRender();
      cjShowPhone();
    }
    return;
  }
  if (name === "send-reminder") {
    if (!S.onboarded) {
      cjRoutineSetup();
      return;
    }
    if (!S.active) {
      cjReady();
      return;
    }
    if (!canMessage()) return;
    if (S.day === 1) {
      S.notification = true;
      cjSaveRender();
      return;
    }
    if (S.messages.some((m) => m.tag === "guided-milestone-" + S.day)) {
      S.notification = false;
      cjSaveRender();
      return;
    }
  }
  if (name === "milestone") {
    cjAdvance(S.day >= 30 ? 30 : 15);
    return;
  }
  if (name === "reset") clearTimeout(cjTimer);
  return cjOld.action(name);
};
typedReply = function (text) {
  if (!S.guided) return cjOld.typedReply(text);
  const t = text.trim().toLowerCase();
  if (/^stop\b/.test(t)) {
    clearTimeout(cjTimer);
    return cjOld.typedReply(text);
  }
  const pending = [...S.messages]
    .reverse()
    .find(
      (m) =>
        !m.resolved &&
        m.eventDay === S.day &&
        m.actions?.some((a) => a.id.startsWith("j-")),
    );
  if (pending && S.day === 1) {
    const id = /^(yes|done|taken)[.! ]*$/.test(t)
      ? pending.actions.some((a) => a.id === "j-confirm")
        ? "j-confirm"
        : "j-yes"
      : /^(no|skip)[.! ]*$/.test(t)
        ? "j-no"
        : /remind|later/.test(t)
          ? "j-later"
          : null;
    if (id && pending.actions.some((a) => a.id === id)) {
      reply(id, pending.id);
      return;
    }
  }
  if (pending && [15, 30].includes(S.day)) {
    cjMilestoneDay = S.day;
    addMessage("user", text);
    cjConcern(text);
    cjFinishMilestone("message", text);
    return;
  }
  return cjOld.typedReply(text);
};
if (S.guided) {
  render();
  if (S.journeyPhase === "setup") cjRoutineSetup();
  else if (S.journeyPhase === "ready") cjReady();
}
