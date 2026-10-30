/* ==========================================================
   Heritage Edge site search (Pagefind)
   - Opens from the nav's Search box, or by pressing "/".
   - Searches the public index (/pagefind/). The Knowledge Hub has its
     own index (/hub/_pagefind/) behind the passcode lock; it is merged
     in only when the hub is unlocked, so private notes never show to
     anyone else.
   - Results are grouped by section, with the matching words highlighted
     and a link straight to the part of the page they appear in.
   ========================================================== */
(function () {
  var pop = document.getElementById("site-search");
  if (!pop) return;

  var input = document.getElementById("search-input");
  var tabsBar = pop.querySelector(".search-tabs");
  var tabs = Array.prototype.slice.call(pop.querySelectorAll("[data-tab]"));
  var views = {};
  Array.prototype.forEach.call(pop.querySelectorAll("[data-view]"), function (v) { views[v.dataset.view] = v; });
  var groupsBox = pop.querySelector(".search-groups");
  var countLine = pop.querySelector(".search-count");
  var noneTitle = pop.querySelector(".search-none-title");

  var pagefind = null;        // the Pagefind module, loaded on first open
  var hubOpen = false;        // true once the hub's index has been merged in
  var lastFocus = null;
  var current = { query: "", sections: emptySections(), tab: "all" };
  var active = -1;            // which result the arrow keys are on

  // Where a page lives, from its address
  var SECTIONS = [
    { key: "projects", name: "Projects", test: function (u) { return u.indexOf("/projects/") === 0; } },
    { key: "notes", name: "Knowledge Hub", test: function (u) { return u.indexOf("/hub/") === 0; } },
    { key: "blog", name: "Blog", test: function (u) { return u.indexOf("/blog/") === 0; } },
    { key: "about", name: "About", test: function (u) { return u.indexOf("/about/") === 0; } },
    { key: "home", name: "Home", test: function () { return true; } }
  ];
  // Topic colours for the dots (the same names as shelves.json)
  var TONES = { Simulations: "#8b6d55", Trading: "#1f6b52", Quant: "#5555b8", Macro: "#6b7526", Maths: "#7a4d96",
    Markets: "#a8481f", Valuation: "#9a7215", Probability: "#16747b", "Real Estate": "#8a3440", "Fintech and Nigeria": "#2e4a78" };

  function emptySections() { return { projects: [], notes: [], blog: [], about: [], home: [] }; }

  function show(name, on) { if (views[name]) views[name].hidden = !on; }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- Loading Pagefind ---------- */
  function loadPagefind() {
    if (pagefind) return Promise.resolve(pagefind);
    return import("/pagefind/pagefind.js").then(function (mod) {
      pagefind = mod;
      return pagefind.options({ excerptLength: 22 });
    }).then(function () {
      pagefind.init();
      return mergeHub();
    }).then(function () { return pagefind; });
  }

  // The hub's index only loads if the hub is unlocked. When it's locked, the
  // lock sends the request to the passcode page instead, so we check first.
  function mergeHub() {
    return fetch("/hub/_pagefind/pagefind-entry.json", { redirect: "manual", credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok || res.type === "opaqueredirect") return;
        return pagefind.mergeIndex("/hub/_pagefind/").then(function () { hubOpen = true; });
      })
      .catch(function () { hubOpen = false; });
  }

  /* ---------- Opening and closing ---------- */
  function open() {
    if (!pop.hidden) return;
    lastFocus = document.activeElement;
    pop.hidden = false;
    document.documentElement.classList.add("search-is-open");
    input.focus();
    input.select();
    loadPagefind().catch(function () { show("empty", false); show("error", true); });
    if (input.value.trim()) run(input.value);
  }
  function close() {
    if (pop.hidden) return;
    pop.hidden = true;
    document.documentElement.classList.remove("search-is-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-search-open]")) { e.preventDefault(); open(); }
    else if (e.target.closest("[data-search-close]")) { close(); }
  });

  document.addEventListener("keydown", function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if (e.key === "/" && !typing && pop.hidden) { e.preventDefault(); open(); return; }
    if (pop.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter" && document.activeElement === input) {
      var links = resultLinks();
      if (links.length) { e.preventDefault(); (links[active] || links[0]).click(); }
    } else if (e.key === "Tab") { trapFocus(e); }
  });

  function trapFocus(e) {
    var focusable = Array.prototype.filter.call(
      pop.querySelectorAll("input, button, a[href]"),
      function (el) { return el.offsetParent !== null; });
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Searching ---------- */
  var runId = 0;
  input.addEventListener("input", function () { run(input.value); });

  Array.prototype.forEach.call(pop.querySelectorAll("[data-q]"), function (chip) {
    chip.addEventListener("click", function () { input.value = chip.dataset.q; input.focus(); run(chip.dataset.q); });
  });

  tabs.forEach(function (t) {
    t.addEventListener("click", function () { current.tab = t.dataset.tab; render(); });
  });

  function run(raw) {
    var query = raw.trim();
    var id = ++runId;
    current.query = query;
    if (!query) { current.sections = emptySections(); render(); return; }
    loadPagefind().then(function (pf) {
      return pf.debouncedSearch(query, {}, 180);
    }).then(function (search) {
      if (!search || id !== runId) return;              // a newer search has started
      return Promise.all(search.results.slice(0, 12).map(function (r) { return r.data(); }));
    }).then(function (pages) {
      if (!pages || id !== runId) return;
      var sections = emptySections();
      pages.forEach(function (p) {
        var url = p.url.replace(/^https?:\/\/[^/]+/, "");
        var section = SECTIONS.filter(function (s) { return s.test(url); })[0];
        sections[section.key].push(toRow(p, section));
      });
      current.sections = sections;
      render();
    }).catch(function () { show("empty", false); show("results", false); show("error", true); });
  }

  // One page → one result, linked to the part of the page where the words appear
  function toRow(p, section) {
    var sub = (p.sub_results || []).filter(function (s) { return s.url && s.url.indexOf("#") !== -1; })[0];
    var title = (p.meta && p.meta.title) || "Untitled";
    var topic = p.meta && p.meta.topic;
    var crumbs = [section.name];
    if (topic) crumbs.push(topic);
    if (sub && sub.title && sub.title !== title) crumbs.push(sub.title);
    return {
      url: sub ? sub.url : p.url,
      title: title,
      path: crumbs.join(" › "),
      excerpt: sub ? sub.excerpt : p.excerpt,
      tone: TONES[topic] || ""
    };
  }

  /* ---------- Showing the results ---------- */
  function render() {
    var q = current.query;
    var s = current.sections;
    var tab = current.tab;
    show("error", false);

    if (!q) {
      tabsBar.hidden = true;
      show("empty", true); show("results", false); show("none", false); show("locked", false);
      active = -1;
      return;
    }
    show("empty", false);
    tabsBar.hidden = false;

    var counts = { projects: s.projects.length, notes: s.notes.length, blog: s.blog.length, about: s.about.length };
    counts.all = counts.projects + counts.notes + counts.blog + counts.about + s.home.length;
    tabs.forEach(function (t) {
      var key = t.dataset.tab;
      t.setAttribute("aria-selected", key === tab ? "true" : "false");
      t.querySelector(".n").textContent = key === "notes" && !hubOpen ? "" : counts[key];
    });

    var order = tab === "all" ? ["projects", "notes", "blog", "about", "home"] : [tab];
    var names = { projects: "Projects", notes: "Knowledge Hub", blog: "Blog", about: "About", home: "Home" };
    var html = "";
    var shown = 0;
    order.forEach(function (key) {
      var rows = s[key];
      if (!rows.length) return;
      shown += rows.length;
      html += '<div class="search-group"><p class="search-label">' + names[key] + "</p>";
      rows.forEach(function (r) {
        html += '<a class="search-result" href="' + escapeHtml(r.url) + '">' +
          '<span class="search-dot"' + (r.tone ? ' style="background:' + r.tone + '"' : "") + ' aria-hidden="true"></span>' +
          '<span class="search-text"><span class="search-title">' + escapeHtml(r.title) + "</span>" +
          '<span class="search-path">' + escapeHtml(r.path) + "</span>" +
          '<span class="search-excerpt">' + (r.excerpt || "") + "</span></span></a>";     // Pagefind's excerpt: plain text plus <mark>
      });
      html += "</div>";
    });
    groupsBox.innerHTML = html;
    countLine.textContent = shown + (shown === 1 ? " result" : " results");

    var lockedTab = tab === "notes" && !hubOpen;
    show("results", shown > 0);
    show("none", shown === 0 && !lockedTab);
    noneTitle.textContent = 'No matches for "' + q + '"';
    show("locked", !hubOpen && (tab === "all" || tab === "notes"));

    active = -1;
    highlight();
  }

  function resultLinks() { return Array.prototype.slice.call(groupsBox.querySelectorAll(".search-result")); }
  function move(step) {
    var links = resultLinks();
    if (!links.length) return;
    active = (active + step + links.length) % links.length;
    highlight();
    links[active].scrollIntoView({ block: "nearest" });
  }
  function highlight() {
    resultLinks().forEach(function (a, i) { a.classList.toggle("is-active", i === active); });
  }
})();
