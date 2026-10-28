// ==========================================================
// Heritage Edge: the Knowledge Hub vault home
//
// The page is built by Eleventy; this file fills in the parts
// that depend on what you've read: the three cards at the top
// and the last three notes opened on each shelf.
//
// Reading progress is kept in this browser for now. Once the
// passcode lock is in, only the `store` below changes, so it is
// saved on Cloudflare and your laptop and phone match.
// ==========================================================

(function () {
  const dataEl = document.getElementById("hub-data");
  if (!dataEl) return;

  const { shelves, notes } = JSON.parse(dataEl.textContent);
  const DAY = 24 * 60 * 60 * 1000;
  const REVISIT_DAYS = [7, 30, 90];   // a done note comes back after 1 week, 1 month, 3 months
  const GOALS = { trading: "Trading", realestate: "Real estate", fintech: "Nigeria fintech" };

  // ---------- where progress is kept ----------
  // One record per note, keyed by the note's address:
  //   { opened: time, done: time, reviews: 0-3, reviewed: time, where: "Section 4 of 6", read: 0.66 }
  const store = {
    key: "he-hub-progress",
    async load() {
      try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { return {}; }
    },
    async save(progress) {
      try { localStorage.setItem(this.key, JSON.stringify(progress)); } catch (e) {}
    },
  };
  window.HubStore = store;   // note pages will use this to record opens and "Mark as done"

  // ---------- small helpers ----------
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function link(note, className) {
    const a = el("a", className, note.title);
    a.href = note.url;
    return a;
  }

  function shelfName(slug) {
    const shelf = shelves.find((s) => s.slug === slug);
    return shelf ? shelf.name : "";
  }

  function startOfDay(time) {
    const d = new Date(time);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function whenText(time) {
    const days = Math.floor((startOfDay(Date.now()) - startOfDay(time)) / DAY);
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return days + " days ago";
    if (days < 14) return "Last week";
    if (days < 60) return Math.floor(days / 7) + " weeks ago";
    return new Date(time).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  // Learning order: Foundations, then Core, then Advanced; inside a level,
  // the subtopic order in shelves.json, then each note's own `order`.
  function orderKey(note) {
    const shelf = shelves.find((s) => s.slug === note.shelf);
    const i = shelf && shelf.subtopics ? shelf.subtopics.indexOf(note.subtopic) : -1;
    return [note.rank, i === -1 ? 99 : i, note.order];
  }

  function inLearningOrder(list) {
    return list.slice().sort((a, b) => {
      const x = orderKey(a), y = orderKey(b);
      for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i];
      return 0;
    });
  }

  // When a finished note is next due back (or null once it has had all its revisits)
  function dueAt(p) {
    if (!p || !p.done) return null;
    const step = p.reviews || 0;
    if (step >= REVISIT_DAYS.length) return null;
    return startOfDay(p.reviewed || p.done) + REVISIT_DAYS[step] * DAY;
  }

  // ---------- fill the page ----------
  store.load().then((progress) => {
    const get = (note) => progress[note.url] || {};
    const opened = notes.filter((n) => get(n).opened).sort((a, b) => get(b).opened - get(a).opened);

    // Continue reading: the most recently opened note that isn't done yet
    const current = opened.find((n) => !get(n).done) || null;

    // Up next: in each topic you've opened (most recent first), the first unfinished note.
    // Nothing opened yet? The first note on each open shelf.
    const activeShelves = [];
    opened.forEach((n) => { if (activeShelves.indexOf(n.shelf) === -1) activeShelves.push(n.shelf); });
    const startShelves = activeShelves.length
      ? activeShelves
      : shelves.filter((s) => s.open).map((s) => s.slug);
    const upNext = [];
    startShelves.forEach((slug) => {
      const next = inLearningOrder(notes.filter((n) => n.shelf === slug))
        .find((n) => !get(n).done && n !== current);
      if (next && upNext.length < 3) upNext.push(next);
    });

    fillContinue(current, upNext[0], get);
    fillUpNext(current ? upNext : upNext.slice(1));
    fillRevisit(notes, get);
    fillShelves(get);
    setUpPlanFilter();
  });

  function fillContinue(current, fallback, get) {
    const card = document.querySelector('[data-card="continue"]');
    const body = card.querySelector("[data-body]");
    const note = current || fallback;
    if (!note) return;   // no notes yet: keep the empty message

    card.querySelector("[data-label]").textContent = current ? "Continue reading" : "Start next";
    body.textContent = "";
    const a = el("a", "continue-link");
    a.href = note.url;
    a.append(el("span", "continue-title", note.title));

    const p = current ? get(current) : {};
    const where = p.where ? " · " + p.where : current ? "" : " · " + note.level;
    a.append(el("span", "continue-where", shelfName(note.shelf) + where));

    if (current && p.read) {
      const bar = el("span", "continue-bar");
      const fill = el("span");
      fill.style.width = Math.round(p.read * 100) + "%";
      bar.append(fill);
      a.append(bar);
    }
    body.append(a);
  }

  function fillUpNext(list) {
    const body = document.querySelector('[data-card="next"] [data-body]');
    if (!list.length) {
      body.append(el("li", "hub-card-empty", "Nothing queued yet."));
      return;
    }
    list.forEach((note) => {
      const li = el("li");
      li.append(link(note), el("span", "hub-card-meta", shelfName(note.shelf)));
      body.append(li);
    });
  }

  function fillRevisit(all, get) {
    const card = document.querySelector('[data-card="revisit"]');
    const body = card.querySelector("[data-body]");
    const today = startOfDay(Date.now());
    const soon = all
      .map((n) => ({ note: n, due: dueAt(get(n)) }))
      .filter((x) => x.due !== null && x.due <= today + 7 * DAY)
      .sort((a, b) => a.due - b.due)
      .slice(0, 3);

    if (soon.length) {
      soon.forEach(({ note, due }) => {
        const li = el("li");
        const isDue = due <= today;
        const label = isDue ? "due today" : "due " + new Date(due).toLocaleDateString("en-GB", { weekday: "long" });
        li.append(link(note), el("span", "hub-card-meta" + (isDue ? " is-due" : ""), label));
        body.append(li);
      });
      return;
    }

    // Nothing due this week: show what you finished most recently instead
    const finished = all.filter((n) => get(n).done).sort((a, b) => get(b).done - get(a).done).slice(0, 2);
    if (finished.length) {
      card.querySelector("[data-label]").textContent = "Recently finished";
      finished.forEach((note) => {
        const li = el("li");
        li.append(link(note), el("span", "hub-card-meta", whenText(get(note).done)));
        body.append(li);
      });
    } else {
      body.append(el("li", "hub-card-empty", "Nothing to revisit yet."));
    }
  }

  function fillShelves(get) {
    document.querySelectorAll("[data-shelf]").forEach((card) => {
      const slug = card.getAttribute("data-shelf");
      const mine = notes.filter((n) => n.shelf === slug);
      const done = mine.filter((n) => get(n).done).length;
      const list = card.querySelector("[data-list]");

      card.querySelector("[data-count]").textContent = mine.length
        ? done + " of " + mine.length + " done"
        : "No notes yet";
      card.querySelector("[data-bar]").style.width = mine.length ? Math.round((done / mine.length) * 100) + "%" : "0";

      if (!mine.length) {
        list.append(el("li", "shelf-empty", "Nothing written yet."));
        return;
      }

      const recent = mine.filter((n) => get(n).opened).sort((a, b) => get(b).opened - get(a).opened).slice(0, 3);
      if (!recent.length) {
        const first = inLearningOrder(mine)[0];
        const li = el("li", "shelf-start hub-note");
        li.setAttribute("data-goals", (first.goals || []).join(" "));
        li.append(el("span", "shelf-start-label", "Start here"), link(first, "hub-note-title"));
        if (first.summary) li.append(el("span", "hub-note-summary", first.summary));
        list.append(li);
        return;
      }

      recent.forEach((note) => {
        const li = el("li", "hub-note");
        li.setAttribute("data-goals", (note.goals || []).join(" "));
        const top = el("div", "hub-note-top");
        top.append(link(note, "hub-note-title"), el("span", "hub-note-when", whenText(get(note).opened)));
        li.append(top);
        if (note.summary) li.append(el("span", "hub-note-summary", note.summary));
        const tags = el("div", "hub-note-tags");
        (note.goals || []).forEach((g) => {
          if (GOALS[g]) tags.append(el("span", "goal-tag goal-" + g, GOALS[g]));
        });
        li.append(tags);
        list.append(li);
      });
    });
  }

  // ---------- life plan filter ----------
  function setUpPlanFilter() {
    const buttons = document.querySelectorAll(".plan-step");
    const note = document.querySelector("[data-plan-note]");

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const goal = button.getAttribute("data-goal");
        buttons.forEach((b) => b.setAttribute("aria-pressed", b === button ? "true" : "false"));

        const shown = document.querySelectorAll(".hub-note[data-goals]");
        let matched = 0;
        shown.forEach((item) => {
          const fits = goal === "all" || item.getAttribute("data-goals").split(" ").indexOf(goal) !== -1;
          item.classList.toggle("is-faded", !fits);
          if (fits) matched++;
        });

        note.textContent = goal === "all"
          ? "Tap a step to fade out notes that don't serve it."
          : matched + " of " + shown.length + " notes on show serve " + GOALS[goal].toLowerCase() + ".";
      });
    });
  }
})();