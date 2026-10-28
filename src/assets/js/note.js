// ==========================================================
// Heritage Edge — Knowledge Hub note pages
//
// Runs on every note (layouts/note.njk). It handles:
//   1. progress: opened, where you got to, done, revisits
//   2. the contents rail and the phone contents
//   3. glossary pop-ups
//   4. Check yourself, and "Mark as done" (locked until every answer is right)
//   5. the finishing animation
//   6. My notes (the journal panel)
//   7. HubNote: small chart helpers for a note's own script
//      (assets/js/notes/<note>.js, listed under noteScripts in the note)
//
// Everything is saved in this browser for now.
// ==========================================================
(function () {
  const $ = (id) => document.getElementById(id);
  const page = document.querySelector(".note-page");
  const dataEl = $("note-data");
  if (!page || !dataEl) return;

  const data = JSON.parse(dataEl.textContent);
  const QUIZ = data.quiz || [];
  const URL_KEY = data.url;
  const DAY = 24 * 60 * 60 * 1000;
  const REVISIT_DAYS = [7, 30, 90];   // same as hub.js
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const read = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} };

  const mathOn = () => window.MathJax && typeof MathJax.typesetPromise === "function";
  function typeset(nodes) {
    if (!mathOn()) return Promise.resolve();
    try { MathJax.typesetClear(nodes); } catch (e) {}
    return MathJax.typesetPromise(nodes).catch(() => {});
  }
  // A colour from the page, so charts follow the topic and light/dark mode
  const colour = (name) => getComputedStyle(page).getPropertyValue(name).trim();

  // ==========================================================
  // 1. Progress: { opened, done, reviews, reviewed, where, read } per note
  // ==========================================================
  const PROGRESS_KEY = "he-hub-progress";
  let progress = read(PROGRESS_KEY, {});
  const mine = () => progress[URL_KEY] || (progress[URL_KEY] = {});
  const saveProgress = () => write(PROGRESS_KEY, progress);
  const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  function dueAt(p) {
    if (!p || !p.done) return null;
    const step = p.reviews || 0;
    if (step >= REVISIT_DAYS.length) return null;
    return startOfDay(p.reviewed || p.done) + REVISIT_DAYS[step] * DAY;
  }
  (function recordOpen() {
    const p = mine(), now = Date.now(), due = dueAt(p);
    if (due !== null && now >= due) { p.reviews = (p.reviews || 0) + 1; p.reviewed = now; }   // this visit counts as the revisit
    p.opened = now;
    saveProgress();
  })();
  let done = !!mine().done;

  // Notes in the rail you've already finished
  document.querySelectorAll("[data-progress]").forEach((a) => {
    const p = progress[a.getAttribute("data-progress")];
    if (p && p.done) a.classList.add("is-done");
  });
  const currentLink = document.querySelector(".rail-note.current");

  // ==========================================================
  // 2. Contents: built from the sections on the page
  // ==========================================================
  const secs = Array.from(document.querySelectorAll(".note-main [data-sec]"));
  const reading = secs.filter((s) => !s.hasAttribute("data-check"));   // sections that aren't Check yourself
  const SECNAME = {};
  reading.forEach((s) => {
    const num = s.querySelector(".sec-num");
    SECNAME[s.id] = (num ? num.textContent.trim() + " " : "") + (s.dataset.title || s.querySelector("h2").textContent.trim());
  });

  const toc = $("toc"), tocMobile = $("toc-mobile"), links = [];
  secs.forEach((s) => {
    const isCheck = s.hasAttribute("data-check");
    const title = s.dataset.title || s.querySelector("h2").textContent.trim();
    const num = isCheck ? "✓" : (s.querySelector(".sec-num") || { textContent: "" }).textContent.trim();
    if (toc) {
      const li = document.createElement("li");
      if (isCheck) li.className = "check-item";
      const a = document.createElement("a");
      a.href = "#" + s.id;
      a.innerHTML = '<span class="n"></span><span class="t"></span><span class="here">Now</span>' + (isCheck ? '<span class="score" id="rail-score"></span>' : "");
      a.querySelector(".n").textContent = num;
      a.querySelector(".t").textContent = title;
      li.appendChild(a); toc.appendChild(li); links.push(a);
    }
    if (tocMobile) {
      const li = document.createElement("li"), a = document.createElement("a");
      a.href = "#" + s.id; a.textContent = title;
      a.addEventListener("click", () => { const d = tocMobile.closest("details"); if (d) d.open = false; });
      li.appendChild(a); tocMobile.appendChild(li);
    }
  });

  let currentSec = reading[0] ? reading[0].id : "";
  let lastSaved = "";
  function track() {
    let idx = 0;
    secs.forEach((s, i) => { if (s.getBoundingClientRect().top < window.innerHeight * 0.35) idx = i; });
    const allRight = allRightNow();
    links.forEach((a, i) => {
      const li = a.parentElement, isCheck = li.classList.contains("check-item");
      li.classList.toggle("passed", isCheck ? allRight : (done || i < idx));
      if (isCheck) li.classList.toggle("pending", !allRight);
      li.classList.toggle("on", i === idx);
      if (i === idx) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
    });
    const sec = secs[idx];
    if (sec && SECNAME[sec.id]) currentSec = sec.id;
    const onCheck = sec && sec.hasAttribute("data-check");
    const where = onCheck ? "Check yourself" : "Section " + (Math.min(idx, reading.length - 1) + 1) + " of " + reading.length;
    if ($("rail-where")) $("rail-where").textContent = done ? "Finished" : where;
    if ($("rail-bar")) $("rail-bar").style.width = done ? "100%" : Math.round(((idx + 1) / Math.max(1, secs.length)) * 100) + "%";

    // Save where you got to, for "Continue reading" on the hub
    if (where !== lastSaved && secs.length) {
      lastSaved = where;
      const p = mine();
      p.where = where;
      p.read = Math.max(p.read || 0, Math.round(((idx + 1) / secs.length) * 100) / 100);
      saveProgress();
    }
  }
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { ticking = false; track(); });
  }, { passive: true });
  window.addEventListener("resize", track);

  // 3. Glossary pop-ups: words marked with {% gl %}
  //    Hover: shows, and goes when the mouse moves away.
  //    Click (or tap): stays open until you press the collapse
  //    button, click anywhere else, or press Esc.
  // ==========================================================
  const GLOSSARY = {};
  try {
    (JSON.parse($("glossary-data").textContent) || []).forEach((g) => {
      GLOSSARY[String(g.term).toLowerCase()] = g;
      if (g.short) GLOSSARY[String(g.short).toLowerCase()] = g;
    });
  } catch (e) {}
  const pop = document.createElement("div");
  pop.className = "gl-pop"; pop.hidden = true; pop.id = "gloss-pop"; pop.setAttribute("role", "tooltip");
  document.body.appendChild(pop);
  let popFor = null, pinned = false, quiet = false;
  function place(t) {
    const r = t.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    let left = r.left + window.scrollX + r.width / 2 - w / 2;
    left = Math.max(window.scrollX + 16, Math.min(left, window.scrollX + document.documentElement.clientWidth - w - 16));
    let top = r.bottom + window.scrollY + 8;
    if (r.bottom + h + 16 > window.innerHeight) top = r.top + window.scrollY - h - 8;
    pop.style.left = left + "px"; pop.style.top = top + "px";
  }
  function showPop(t, pin) {
    const g = GLOSSARY[String(t.dataset.g).toLowerCase()];
    if (!g) return;
    if (popFor && popFor !== t) popFor.removeAttribute("aria-describedby");
    pinned = !!pin;
    pop.textContent = "";
    const head = document.createElement("div"); head.className = "gl-pop-head";
    const name = document.createElement("strong");
    name.textContent = g.term + (g.short && g.short.length > 1 ? " (" + g.short + ")" : "");
    head.appendChild(name);
    if (pinned) {
      const close = document.createElement("button");
      close.type = "button"; close.className = "gl-pop-close"; close.setAttribute("aria-label", "Close definition");
      close.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14h6v6"></path><path d="M20 10h-6V4"></path><path d="M14 10l7-7"></path><path d="M3 21l7-7"></path></svg>';
      close.addEventListener("click", (e) => { e.stopPropagation(); const back = popFor; hidePop(); if (back) { quiet = true; back.focus({ preventScroll: true }); quiet = false; } });
      head.appendChild(close);
    }
    const plain = document.createElement("span"); plain.textContent = g.plain;
    pop.append(head, plain);
    if (g.desk) { const d = document.createElement("span"); d.className = "desk"; d.textContent = "“" + g.desk + "”"; pop.appendChild(d); }
    pop.classList.toggle("pinned", pinned);
    pop.setAttribute("role", pinned ? "dialog" : "tooltip");
    pop.hidden = false; popFor = t; t.setAttribute("aria-describedby", "gloss-pop");
    place(t);
  }
  function hidePop() {
    pop.hidden = true; pinned = false; pop.classList.remove("pinned");
    if (popFor) popFor.removeAttribute("aria-describedby");
    popFor = null;
  }
  document.querySelectorAll(".gl").forEach((t) => {
    if (!GLOSSARY[String(t.dataset.g).toLowerCase()]) { t.classList.remove("gl"); return; }   // not in glossary.json: plain text
    t.addEventListener("mouseenter", () => { if (!pinned) showPop(t); });
    t.addEventListener("mouseleave", () => { if (!pinned) hidePop(); });
    t.addEventListener("focus", () => { if (!pinned && !quiet) showPop(t); });
    t.addEventListener("blur", () => { if (!pinned) hidePop(); });
    t.addEventListener("click", (e) => {
      e.stopPropagation();
      if (pinned && popFor === t) hidePop(); else showPop(t, true);
    });
    t.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (pinned && popFor === t) hidePop(); else showPop(t, true); }
    });
  });
  pop.addEventListener("click", (e) => e.stopPropagation());   // clicking inside the box keeps it open
  document.addEventListener("click", () => { if (popFor) hidePop(); });
  window.addEventListener("scroll", () => { if (popFor) place(popFor); }, { passive: true });

  // ==========================================================
  // 4. Check yourself + Mark as done
  // ==========================================================
  const QUIZ_KEY = "he-quiz:" + URL_KEY;
  const rightAnswers = new Set(read(QUIZ_KEY, []).filter((i) => i < QUIZ.length));
  function allRightNow() { return rightAnswers.size >= QUIZ.length; }

  function quizUpdate() {
    const n = rightAnswers.size, total = QUIZ.length;
    if ($("rail-score")) $("rail-score").textContent = n + "/" + total;
    if ($("quiz-status")) $("quiz-status").textContent = n === total ? "All " + total + " right." : n + " of " + total + " right so far.";
    write(QUIZ_KEY, Array.from(rightAnswers));
    track();
    paintGate();
  }
  function buildQuiz() {
    const box = $("quiz");
    if (!box) return;
    QUIZ.forEach((item, i) => {
      const q = document.createElement("div"); q.className = "q";
      q.innerHTML = '<p class="q-text">' + (i + 1) + ". " + item.q + '</p><div class="opts"></div><p class="fb" hidden></p>';
      const opts = q.querySelector(".opts"), fb = q.querySelector(".fb");
      (item.opts || []).forEach((o, j) => {
        const b = document.createElement("button"); b.type = "button"; b.innerHTML = o;
        if (rightAnswers.has(i) && j === item.right) b.classList.add("right");
        b.addEventListener("click", () => {
          opts.querySelectorAll("button").forEach((x) => x.classList.remove("right", "wrong"));
          const ok = j === item.right;
          b.classList.add(ok ? "right" : "wrong");
          if (ok) rightAnswers.add(i); else rightAnswers.delete(i);
          fb.hidden = false;
          fb.innerHTML = (ok ? "Right. " : "Not quite. ") + (item.why || "");
          typeset([fb]);
          quizUpdate();
        });
        opts.appendChild(b);
      });
      box.appendChild(q);
    });
  }

  const doneBtns = Array.from(document.querySelectorAll("[data-done]"));
  const hints = ["hint-rail", "hint-bottom"].map($).filter(Boolean);
  function paintDone() {
    doneBtns.forEach((b) => { b.textContent = done ? "Done ✓" : "Mark as done"; b.classList.toggle("done", done); });
    if (currentLink) currentLink.classList.toggle("is-done", done);
  }
  function paintGate() {
    doneBtns.forEach((b) => b.classList.toggle("waiting", !done && !allRightNow()));
    if (allRightNow()) hints.forEach((h) => { h.hidden = true; });
  }
  function explainGate(btn) {
    const left = QUIZ.length - rightAnswers.size;
    const msg = "Get " + (left === QUIZ.length ? "all " + QUIZ.length : left + " more") + " Check yourself question" + (left === 1 ? "" : "s") + ' right first. <a href="#check">Go to the questions</a>';
    hints.forEach((h) => { h.innerHTML = msg; h.hidden = false; });
    btn.classList.remove("shake"); void btn.offsetWidth; btn.classList.add("shake");
  }
  doneBtns.forEach((b) => b.addEventListener("click", (e) => {
    if (!done && !allRightNow()) { explainGate(e.currentTarget); return; }
    done = !done;
    const p = mine();
    if (done) { p.done = Date.now(); p.read = 1; delete p.reviews; delete p.reviewed; }
    else { delete p.done; delete p.reviews; delete p.reviewed; }
    saveProgress();
    paintDone(); paintGate(); track();
    if (done) celebrate(e.currentTarget); else hideComplete();
  }));

  // ==========================================================
  // 5. Finishing a note: a burst from the button, then a card
  // ==========================================================
  function burst(from) {
    if (calm) return;
    const r = from.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const colours = [colour("--tone"), colour("--tone"), colour("--accent")];
    document.querySelectorAll(".note-meta .theme-link").forEach((t) => colours.push(getComputedStyle(t).getPropertyValue("--tone").trim()));
    for (let i = 0; i < 26; i++) {
      const sp = document.createElement("span");
      sp.className = "spark";
      sp.style.left = cx + "px"; sp.style.top = cy + "px";
      sp.style.background = colours[i % colours.length];
      if (i % 3 === 0) sp.style.borderRadius = "50%";
      document.body.appendChild(sp);
      const angle = (Math.PI * 2 * i) / 26 + Math.random() * 0.4, dist = 70 + Math.random() * 90;
      const dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist - 30;
      const anim = sp.animate([
        { transform: "translate(-50%, -50%) scale(1) rotate(0deg)", opacity: 1 },
        { transform: "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px)) scale(0.9) rotate(" + (Math.random() * 360) + "deg)", opacity: 1, offset: 0.7 },
        { transform: "translate(calc(-50% + " + dx * 1.1 + "px), calc(-50% + " + (dy + 40) + "px)) scale(0.4)", opacity: 0 }
      ], { duration: 900 + Math.random() * 300, easing: "cubic-bezier(.15,.8,.3,1)" });
      anim.onfinish = () => sp.remove();
    }
  }
  let completeTimer = null;
  function celebrate(btn) {
    burst(btn);
    const box = $("complete");
    if (!box) return;
    box.hidden = false; document.body.classList.add("celebrating");
    const card = box.querySelector(".complete-card"); card.style.animation = "none"; void card.offsetWidth; card.style.animation = "";
    box.querySelectorAll(".tick-ring, .tick-mark").forEach((n) => { n.style.animation = "none"; void n.getBoundingClientRect(); n.style.animation = ""; });
    // How much of the chapter is now done
    const all = data.chapterNotes || [];
    const finished = all.filter((n) => n.url && progress[n.url] && progress[n.url].done).length;
    if ($("cp-text")) $("cp-text").textContent = finished + " of " + all.length + " in " + data.chapterTitle;
    const fill = $("cp-fill");
    if (fill) {
      fill.style.width = "0";
      requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = (all.length ? (finished / all.length) * 100 : 100) + "%"; }));
    }
    clearTimeout(completeTimer);
    completeTimer = setTimeout(hideComplete, 9000);
  }
  function hideComplete() {
    if ($("complete")) $("complete").hidden = true;
    document.body.classList.remove("celebrating");
    clearTimeout(completeTimer);
  }
  if ($("complete-close")) $("complete-close").addEventListener("click", hideComplete);

  // ==========================================================
  // 6. My notes: notes, working and rules for this note
  // ==========================================================
  const J_KEY = "he-journal:" + URL_KEY;
  const HINTS = {
    note: "Write as normal and use the maths buttons, or put maths between dollar signs: <code>$2^{x}$</code>.",
    working: "One line of working per line, all maths. Lines starting with <code>=</code> line up underneath each other.",
    rule: "A rule you want to remember. It also goes in the box at the top of this panel."
  };
  const KIND = { note: "Note", working: "Working", rule: "Rule" };
  let entries = read(J_KEY, []);
  let editing = null, pendingDelete = null, filter = "all", filterSec = currentSec;
  const saveJ = () => write(J_KEY, entries);

  // Fill "Linked to" with this note's sections
  const jSec = $("j-sec");
  reading.forEach((s) => { const o = document.createElement("option"); o.value = s.id; o.textContent = SECNAME[s.id]; jSec.appendChild(o); });

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function toHtml(text, kind) {
    if (kind === "working") {
      const rows = text.split("\n").map((l) => l.trim().replace(/^\$+|\$+$/g, "")).filter(Boolean).map((l) => {
        if (/^(=|\\approx|<|>|\\le|\\ge)/.test(l)) return "&" + l;
        const m = l.match(/=|\\approx/);
        return m ? l.slice(0, m.index) + "&" + l.slice(m.index) : l;
      });
      return rows.length ? "<div>\\[\\begin{aligned}" + esc(rows.join(" \\\\ ")) + "\\end{aligned}\\]</div>" : "";
    }
    const h = esc(text)
      .replace(/\$\$([\s\S]+?)\$\$/g, (m, x) => "\\[" + x + "\\]")
      .replace(/\$([^$\n]+?)\$/g, (m, x) => "\\(" + x + "\\)")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    return h.split(/\n{2,}/).map((p) => "<p>" + p.replace(/\n/g, "<br>") + "</p>").join("");
  }
  const fmtDate = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  function renderJ() {
    const list = $("j-list"); list.textContent = "";
    const rules = entries.filter((e) => e.kind === "rule");
    $("j-rules").hidden = !rules.length;
    $("j-rules-list").innerHTML = rules.map((r, i) => '<div><span class="n">' + (i + 1) + "</span><div>" + toHtml(r.text, "rule") + "</div></div>").join("");
    const shown = entries.filter((e) => filter === "all" || e.section === filterSec);
    if (!entries.length) list.innerHTML = '<p class="empty">Nothing here yet. Add a note, a line of working or a rule above.</p>';
    else if (!shown.length) list.innerHTML = '<p class="empty">No notes linked to this section yet.</p>';
    shown.slice().sort((a, b) => (b.edited || b.created) - (a.edited || a.created)).forEach((e) => {
      const card = document.createElement("article");
      card.className = "entry " + e.kind;
      card.innerHTML =
        '<div class="entry-top"><span class="entry-kind">' + KIND[e.kind] + '</span><span class="entry-date">' + (e.edited ? "Edited " + fmtDate(e.edited) : fmtDate(e.created)) + "</span></div>" +
        '<div class="entry-body">' + toHtml(e.text, e.kind) + "</div>" +
        (e.section && SECNAME[e.section] ? '<button type="button" class="entry-sec" data-go="' + e.section + '">Linked to ' + esc(SECNAME[e.section]) + " ›</button>" : "") +
        '<div class="entry-actions"><button type="button" data-act="edit">Edit</button><button type="button" data-act="del">Delete</button></div>';
      card.querySelector('[data-act="edit"]').addEventListener("click", () => startEdit(e.id));
      const go = card.querySelector("[data-go]");
      if (go) go.addEventListener("click", () => {
        const target = $(go.dataset.go);
        if (window.innerWidth <= 700) closeNotes();
        target.scrollIntoView({ block: "start" });
        target.classList.remove("flash"); void target.offsetWidth; target.classList.add("flash");
      });
      const del = card.querySelector('[data-act="del"]');
      if (pendingDelete === e.id) { del.textContent = "Yes, delete"; del.classList.add("confirm"); }
      del.addEventListener("click", () => {
        if (pendingDelete === e.id) {
          entries = entries.filter((x) => x.id !== e.id); pendingDelete = null;
          if (editing === e.id) resetForm();
          saveJ(); renderJ();
        } else { pendingDelete = e.id; renderJ(); }
      });
      list.appendChild(card);
    });
    const n = entries.length;
    if ($("rail-count")) $("rail-count").textContent = n ? "(" + n + ")" : "";
    $("fab-count").textContent = n ? n : "";
    $("drawer-count").textContent = n + (n === 1 ? " entry" : " entries");
    $("f-here").textContent = SECNAME[filterSec] ? "This section (" + SECNAME[filterSec].replace(/^\d+ /, "") + ")" : "Whole note";
    typeset([list, $("j-rules-list")]);
  }

  const kindNow = () => document.querySelector('input[name="kind"]:checked').value;
  let pvTimer = null;
  function updatePreview() {
    clearTimeout(pvTimer);
    pvTimer = setTimeout(() => {
      const t = $("j-text").value.trim(), pv = $("j-preview");
      pv.innerHTML = t ? toHtml(t, kindNow()) : '<span class="muted">Your entry will appear here as you type.</span>';
      typeset([pv]);
    }, 250);
  }
  function resetForm() {
    editing = null; $("j-text").value = ""; $("j-save").textContent = "Add to my notes"; $("j-cancel").hidden = true; $("j-error").hidden = true;
    updatePreview();
  }
  function startEdit(id) {
    const e = entries.find((x) => x.id === id); if (!e) return;
    editing = id;
    document.querySelector('input[name="kind"][value="' + e.kind + '"]').checked = true;
    $("j-hint").innerHTML = HINTS[e.kind];
    jSec.value = e.section || "";
    $("j-text").value = e.text; $("j-save").textContent = "Save changes"; $("j-cancel").hidden = false;
    updatePreview();
    $("j-form").scrollIntoView({ block: "nearest" }); $("j-text").focus();
  }

  let lastTrigger = null;
  const isOpen = () => document.body.classList.contains("notes-open");
  function openNotes(sec, trigger) {
    lastTrigger = trigger || document.activeElement;
    hideComplete();
    document.body.classList.add("notes-open");
    $("drawer").setAttribute("aria-hidden", "false");
    $("notes-fab").setAttribute("aria-expanded", "true");
    if (!editing) jSec.value = sec !== undefined ? sec : currentSec;
    filterSec = jSec.value;
    renderJ();
    setTimeout(() => $("j-text").focus(), 260);
  }
  function closeNotes() {
    document.body.classList.remove("notes-open");
    $("drawer").setAttribute("aria-hidden", "true");
    $("notes-fab").setAttribute("aria-expanded", "false");
    if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
  }
  $("notes-fab").addEventListener("click", (e) => openNotes(undefined, e.currentTarget));
  if ($("rail-notes")) $("rail-notes").addEventListener("click", (e) => (isOpen() ? closeNotes() : openNotes(undefined, e.currentTarget)));
  $("drawer-close").addEventListener("click", closeNotes);
  document.querySelectorAll("[data-note-for]").forEach((b) => b.addEventListener("click", () => openNotes(b.dataset.noteFor, b)));
  document.addEventListener("keydown", (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if (e.key === "Escape") { hidePop(); if (isOpen()) closeNotes(); }
    else if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "n") { e.preventDefault(); isOpen() ? closeNotes() : openNotes(); }
  });
  jSec.addEventListener("change", () => { filterSec = jSec.value; renderJ(); });
  document.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => {
    filter = b.dataset.f;
    document.querySelectorAll("[data-f]").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    renderJ();
  }));
  $("j-hint").innerHTML = HINTS.note;
  $("j-text").addEventListener("input", () => { $("j-error").hidden = true; updatePreview(); });
  document.querySelectorAll('input[name="kind"]').forEach((r) => r.addEventListener("change", () => { $("j-hint").innerHTML = HINTS[kindNow()]; updatePreview(); }));
  $("j-cancel").addEventListener("click", resetForm);
  $("j-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const t = $("j-text").value.trim();
    if (!t) { $("j-error").hidden = false; $("j-text").focus(); return; }
    if (editing) {
      const e = entries.find((x) => x.id === editing);
      if (e) { e.text = t; e.kind = kindNow(); e.section = jSec.value; e.edited = Date.now(); }
    } else {
      entries.push({ id: "n" + Date.now(), kind: kindNow(), section: jSec.value, text: t, created: Date.now() });
    }
    saveJ(); resetForm(); renderJ();
  });

  // Maths buttons: wrap in $...$ when you're not already inside maths, and select the
  // placeholder letter so you can type straight over it
  function insideMaths(text, pos) {
    if (kindNow() === "working") return true;
    const before = text.slice(0, pos).replace(/\\\$/g, "");
    return (before.match(/\$/g) || []).length % 2 === 1;
  }
  document.querySelectorAll("[data-tpl]").forEach((b) => b.addEventListener("click", () => {
    const ta = $("j-text"), st = ta.selectionStart, en = ta.selectionEnd;
    let tpl = b.dataset.tpl;
    const chosen = ta.value.slice(st, en);
    if (chosen) tpl = tpl.replace(/\[[a-z]\]/, chosen);
    if (!insideMaths(ta.value, st)) tpl = "$" + tpl + "$";
    const first = tpl.search(/\[[a-z]\]/);
    const clean = tpl.replace(/\[([a-z])\]/g, "$1");
    ta.value = ta.value.slice(0, st) + clean + ta.value.slice(en);
    ta.focus();
    if (first !== -1) {
      const at = st + tpl.slice(0, first).replace(/\[([a-z])\]/g, "$1").length;
      ta.setSelectionRange(at, at + 1);
    } else {
      ta.setSelectionRange(st + clean.length, st + clean.length);
    }
    updatePreview();
  }));

  // ==========================================================
  // 7. HubNote: chart helpers for a note's own script
  //    HubNote.charts(function draw() { ... }) runs now, again once the maths
  //    has loaded, and again whenever light/dark mode changes.
  // ==========================================================
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  // Gridlines, labels and axes. Returns { sx, sy } to turn numbers into positions.
  function frame(svg, w, h, pad, xr, yr, xt, yt, fmtY) {
    svg.textContent = "";
    const sx = (x) => pad.l + ((x - xr[0]) / (xr[1] - xr[0])) * (w - pad.l - pad.r);
    const sy = (y) => h - pad.b - ((y - yr[0]) / (yr[1] - yr[0])) * (h - pad.t - pad.b);
    yt.forEach((y) => {
      el("line", { x1: pad.l, x2: w - pad.r, y1: sy(y), y2: sy(y), class: "grid" }, svg);
      el("text", { x: pad.l - 8, y: sy(y) + 4, "text-anchor": "end" }, svg).textContent = fmtY ? fmtY(y) : y;
    });
    xt.forEach((x) => {
      el("line", { x1: sx(x), x2: sx(x), y1: pad.t, y2: h - pad.b, class: "grid" }, svg);
      el("text", { x: sx(x), y: h - pad.b + 18, "text-anchor": "middle" }, svg).textContent = x;
    });
    if (yr[0] <= 0 && yr[1] >= 0) el("line", { x1: pad.l, x2: w - pad.r, y1: sy(0), y2: sy(0), class: "axis" }, svg);
    if (xr[0] <= 0 && xr[1] >= 0) el("line", { x1: sx(0), x2: sx(0), y1: pad.t, y2: h - pad.b, class: "axis" }, svg);
    return { sx, sy };
  }
  // A smooth line for y = f(x); breaks where it goes off the top
  function curve(svg, s, f, xr, yMax, stroke, width, dash) {
    let d = "", pen = false;
    for (let i = 0; i <= 240; i++) {
      const x = xr[0] + (i / 240) * (xr[1] - xr[0]), y = f(x);
      if (y > yMax || !isFinite(y)) { pen = false; continue; }
      d += (pen ? "L" : "M") + s.sx(x).toFixed(1) + " " + s.sy(y).toFixed(1);
      pen = true;
    }
    return el("path", { d, fill: "none", stroke, "stroke-width": width, "stroke-linecap": "round", "stroke-dasharray": dash || "none" }, svg);
  }
  function niceMax(v) {
    const steps = [4, 8, 10, 20, 40, 80, 100, 160, 300, 400, 800, 1000, 1600, 2000, 4000, 5000, 8000, 10000, 20000, 40000, 50000, 80000, 100000];
    return steps.find((s) => s >= v) || v;
  }
  // Put LaTeX into an element (plain text if the maths hasn't loaded)
  function tex(node, src) {
    if (window.MathJax && typeof MathJax.tex2svg === "function") { node.textContent = ""; node.appendChild(MathJax.tex2svg(src, { display: false })); }
    else node.textContent = src.replace(/\\text\{([^}]*)\}/g, "$1").replace(/\\[a-zA-Z]+/g, " ").replace(/[{}]/g, "");
  }
  const money = (v, sym) => "\\text{" + (sym || "£") + "}" + Math.round(v).toLocaleString("en-GB").replace(/,/g, "{,}");

  const drawers = [];
  function drawAll() { drawers.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } }); }
  window.HubNote = {
    $, el, frame, curve, niceMax, tex, money, colour, typeset,
    charts(fn) { drawers.push(fn); try { fn(); } catch (e) { console.error(e); } },
  };
  document.addEventListener("themechange", () => requestAnimationFrame(drawAll));

  // ---------- start ----------
  renderJ();
  buildQuiz();
  quizUpdate();
  paintDone();
  paintGate();
  track();
  // Once MathJax has finished the page, redraw anything that uses live maths
  if (window.MathJax && MathJax.startup && MathJax.startup.promise) {
    MathJax.startup.promise.then(() => { drawAll(); renderJ(); typeset([$("quiz"), $("complete")].filter(Boolean)); });
  }
})();