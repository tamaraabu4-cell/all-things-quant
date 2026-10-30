import { HtmlBasePlugin } from "@11ty/eleventy";

export default function (eleventyConfig) {
  // Fixes links so they work at tamaraabu4-cell.github.io/heritage-edge/
  eleventyConfig.addPlugin(HtmlBasePlugin);

  // Copy these across exactly as they are
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/projects/*.py");
  eleventyConfig.addPassthroughCopy("src/favicon.ico");

  // Dates for blog posts: "27 October 2026" on the page, "2026-10-27" inside the <time> tag
  eleventyConfig.addFilter("readableDate", (date) =>
    new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
  );
  eleventyConfig.addFilter("htmlDate", (date) => new Date(date).toISOString().slice(0, 10));

  // ==========================================================
  // Knowledge Hub
  //
  // Each topic in _data/shelves.json has chapters, each chapter has
  // subtopics, and each note says which chapter and subtopic it's in:
  //
  //   shelf: markets
  //   chapter: rates-and-bonds      (the chapter's slug or its title)
  //   subtopic: Bond basics
  //   alsoIn: [valuation/time-value-of-money]   (optional: show it as a guest there too)
  // ==========================================================

  // "Rates and bonds" -> "rates-and-bonds"
  const slugify = (text = "") =>
    String(text).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const same = (a = "", b = "") => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

  // A topic's chapters, tidied up: every chapter gets a number and a slug,
  // and every subtopic becomes { name, planned: [...] } even if written as plain text
  function chaptersOf(shelf) {
    return (shelf.chapters || []).map((chapter, i) => ({
      num: i + 1,
      slug: chapter.slug || slugify(chapter.title),
      title: chapter.title,
      blurb: chapter.blurb || "",
      subtopics: (chapter.subtopics || []).map((sub) =>
        typeof sub === "string" ? { name: sub, planned: [] } : { name: sub.name, planned: sub.planned || [] }
      ),
    }));
  }

  function findChapter(chapters, value) {
    return chapters.findIndex((c) => same(c.slug, value) || same(c.title, value));
  }

  // Where a note sits in its topic, for learning order: [chapter, subtopic, order]
  function placeOf(note, shelves) {
    const shelf = shelves.find((s) => s.slug === note.data.shelf);
    const chapters = shelf ? chaptersOf(shelf) : [];
    const ci = findChapter(chapters, note.data.chapter);
    const si = ci === -1 ? -1 : chapters[ci].subtopics.findIndex((s) => same(s.name, note.data.subtopic));
    return {
      chapter: ci,
      chapterTitle: ci === -1 ? "" : chapters[ci].title,
      pos: [ci === -1 ? 99 : ci, si === -1 ? 99 : si, note.data.order || 0],
    };
  }

  // Turns the notes into a small list the hub's script can read
  eleventyConfig.addFilter("hubIndex", (notes = [], shelves = []) =>
    notes.map((note) => {
      const place = placeOf(note, shelves);
      return {
        url: note.url,
        title: note.data.title,
        shelf: note.data.shelf,
        chapterTitle: place.chapterTitle,
        subtopic: note.data.subtopic || "",
        pos: place.pos,
        summary: note.data.summary || "",
        goals: note.data.goals || [],
      };
    })
  );

  // Builds a topic home's path: chapters -> subtopics -> notes.
  // Each subtopic lists, in order: notes you've written, notes you've planned
  // (from shelves.json) and guests (notes from other topics that point here).
  // Writing a note with the same title as a planned one replaces the planned one.
  function buildPath(shelf, notes = [], shelves = []) {
    const chapters = chaptersOf(shelf).map((c) => ({
      ...c,
      subtopics: c.subtopics.map((s) => ({ name: s.name, planned: s.planned, items: [] })),
    }));
    const unsorted = { num: chapters.length + 1, slug: "not-sorted", title: "Not sorted yet", blurb: "Notes whose chapter doesn't match one in shelves.json.", subtopics: [] };

    const subtopicIn = (chapter, name, fallback) => {
      let sub = chapter.subtopics.find((s) => same(s.name, name));
      if (!sub) {
        sub = chapter.subtopics.find((s) => s.name === fallback);
        if (!sub) {
          sub = { name: fallback, planned: [], items: [] };
          chapter.subtopics.push(sub);
        }
      }
      return sub;
    };

    // 1. Notes written for this topic
    const own = notes.filter((n) => n.data.shelf === shelf.slug).sort((a, b) => (a.data.order || 0) - (b.data.order || 0));
    const writtenTitles = own.map((n) => String(n.data.title).toLowerCase());
    own.forEach((n) => {
      const ci = findChapter(chapters, n.data.chapter);
      const chapter = ci === -1 ? unsorted : chapters[ci];
      if (ci === -1) console.warn(`[hub] "${n.data.title}" has chapter "${n.data.chapter}", which isn't in ${shelf.slug}'s chapters.`);
      subtopicIn(chapter, n.data.subtopic, "Other").items.push({ kind: "written", title: n.data.title, url: n.url });
    });

    // 2. Planned notes, unless already written
    chapters.forEach((c) =>
      c.subtopics.forEach((s) =>
        s.planned
          .filter((title) => writtenTitles.indexOf(String(title).toLowerCase()) === -1)
          .forEach((title) => s.items.push({ kind: "planned", title }))
      )
    );

    // 3. Guests: notes from other topics with alsoIn: [this-topic/chapter] or [this-topic/chapter/Subtopic]
    notes.forEach((n) => {
      if (n.data.shelf === shelf.slug) return;
      (n.data.alsoIn || []).forEach((where) => {
        const [topic, chapterRef, subRef] = String(where).split("/");
        if (topic !== shelf.slug) return;
        const ci = findChapter(chapters, chapterRef);
        if (ci === -1) return;
        const home = shelves.find((s) => s.slug === n.data.shelf);
        subtopicIn(chapters[ci], subRef || "", "Also useful").items.push({
          kind: "guest", title: n.data.title, url: n.url, home: home ? home.name : n.data.shelf,
        });
      });
    });

    const all = unsorted.subtopics.length ? chapters.concat([unsorted]) : chapters;
    all.forEach((c) => {
      const items = [];
      c.subtopics.forEach((s) => s.items.forEach((i) => items.push(i)));
      c.planned = items.filter((i) => i.kind === "planned").length;
      c.written = items.filter((i) => i.kind === "written").length;
    });

    return {
      chapters: all,
      written: own.length,
      planned: all.reduce((sum, c) => sum + c.planned, 0),
    };
  }
  eleventyConfig.addFilter("topicPath", buildPath);

  // Everything a note page needs to know about where it sits:
  // its topic, its chapter, the chapter's notes in order, and what comes next.
  eleventyConfig.addFilter("noteContext", (data, url, notes = [], shelves = []) => {
    const shelf = shelves.find((s) => s.slug === data.shelf);
    if (!shelf) return null;
    const path = buildPath(shelf, notes, shelves);
    const chapter = path.chapters.find((c) => c.subtopics.some((s) => s.items.some((i) => i.url === url)));
    if (!chapter) return null;
    const items = [];
    chapter.subtopics.forEach((s) =>
      s.items.forEach((i) => { if (i.kind !== "guest") items.push({ kind: i.kind, title: i.title, url: i.url || "", subtopic: s.name }); })
    );
    const index = items.findIndex((i) => i.url === url);
    const theme = (slug) => {
      const t = shelves.find((s) => s.slug === slug);
      return t ? { name: t.name, url: "/hub/" + t.slug + "/", colour: t.colour || "" } : null;
    };
    return {
      shelf: { name: shelf.name, slug: shelf.slug, colour: shelf.colour || "", url: "/hub/" + shelf.slug + "/" },
      chapter: { num: chapter.num, title: chapter.title, slug: chapter.slug },
      subtopic: data.subtopic || "",
      items,
      index,
      total: items.length,
      next: items[index + 1] || null,
      themes: (data.themes || []).map(theme).filter(Boolean),
    };
  });


  // Everything a project page needs (layouts/project.njk): its entry in
  // projects.json (found by the page's URL), its topic and colour, up to
  // three projects to suggest (same topic first, then same market), and the next one.
  eleventyConfig.addFilter("projectContext", (url, projects = [], shelves = []) => {
    const topicOf = (p) => {
      if (p.topic === "simulations") return { name: "Simulations", colour: "walnut", url: "/projects/simulations/" };
      const shelf = shelves.find((s) => s.slug === p.topic);
      return shelf
        ? { name: shelf.name, colour: shelf.colour || "", url: "/projects/" + shelf.slug + "/" }
        : { name: "Projects", colour: "", url: "/projects/projects.html" };
    };
    const i = projects.findIndex((p) => p.url === url);
    if (i === -1) {
      console.warn(`[projects] ${url} isn't in _data/projects.json, so its page has no topic or four steps.`);
      return null;
    }
    const project = projects[i];
    const mine = project.markets || [];
    const shared = (q) => (q.markets || []).find((m) => mine.indexOf(m) !== -1);
    const rank = (q) => (q.topic === project.topic ? 0 : shared(q) ? 1 : 2);
    const more = projects
      .map((q, j) => ({ q, j }))
      .filter((x) => x.j !== i)
      .sort((a, b) => rank(a.q) - rank(b.q) || a.j - b.j)
      .slice(0, 3)
      .map(({ q }) => {
        const t = topicOf(q);
        const why = q.topic === project.topic ? "Also in " + t.name : shared(q) ? "Also trades " + shared(q) : t.name;
        return { title: q.title, url: q.url, colour: t.colour, why, where: [q.kind].concat(q.markets || []).filter(Boolean).join(" · ") };
      });
    const next = projects.length > 1 ? projects[(i + 1) % projects.length] : null;
    return { project, topic: topicOf(project), more, next: next ? { title: next.title, url: next.url } : null };
  });

  // {% psec 1, "Title", "The question it answers", "Short rail title" %} ... {% endpsec %}
  // → a numbered section on a project page. The 4th argument is optional.
  eleventyConfig.addPairedShortcode("psec", (content, num, title, question = "", short = "") => {
    const n = String(num).padStart(2, "0");
    return `<section class="psec" id="s${num}" data-psec data-title="${short || title}">
  <div class="psec-head">
    <span class="psec-num">${n}</span>
    <h2 id="s${num}-title">${title}</h2>${question ? `<p class="psec-q">${question}</p>` : ""}
  </div>
  <div class="project-page psec-body">
${content}
  </div>
</section>`;
  });

  // ---------- Shortcodes for writing notes ----------
  // {% sec 1, "Title", "The question it answers" %} ... {% endsec %}  → a numbered note section
  // Add a 4th, shorter title if the heading is too long for the contents rail:
  // {% sec 4, "How does this link to trading, real estate, quant and fintech?", "…", "How it links to the plan" %}
  eleventyConfig.addPairedShortcode("sec", (content, num, title, question = "", short = "") => {
    const n = String(num).padStart(2, "0");
    return `<section class="sec" id="s${num}" data-sec data-title="${short || title}">
  <div class="sec-head">
    <div class="sec-top"><span class="sec-num">${n}</span><button class="add-note" type="button" data-note-for="s${num}" aria-label="Add a note to this section"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>Note</button></div>
    <h2 id="s${num}-title">${title}</h2>${question ? `<p class="sec-q">${question}</p>` : ""}
  </div>
${content}
</section>`;
  });
  // {% gl "asymptote" %}asymptote{% endgl %}  → a glossary word with a dotted underline and a pop-up
  eleventyConfig.addPairedShortcode("gl", (content, key) =>
    `<span class="gl" data-g="${key || String(content).toLowerCase()}" tabindex="0">${content}</span>`
  );
}

export const config = {
  dir: { input: "src", output: "_site" },
  templateFormats: ["njk", "md"],
  pathPrefix: "/",
};