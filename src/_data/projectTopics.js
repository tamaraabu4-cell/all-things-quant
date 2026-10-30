// ==========================================================
// Project topics, worked out from projects.json and shelves.json
//
// Used by the projects page (one shelf per topic, showing its newest
// project) and by each topic's own page at /projects/<topic>/
// (src/projects/topic.njk), where projects are grouped by type.
//
// A topic only appears once it has a project. Projects are sorted
// newest first by their "date", written as "2026-10" or "2026-10-23".
// ==========================================================
import { readFileSync } from "node:fs";

// The order markets appear in the filters (anything else goes after, A to Z)
const MARKET_ORDER = ["Rates", "FX", "Gold", "Commodities", "Equities", "Credit", "Crypto", "Property", "Naira"];

// Each type of project ("kind" in projects.json) becomes a group on its topic page.
// Add a line here when you start a new type; without one, the group is just named "<kind>s".
const KINDS = {
  "Trade memo":      { plural: "Trade memos",      blurb: "Live trade ideas: the view, how it's structured, how much is at risk, and how it turned out." },
  "Backtest":        { plural: "Backtests",        blurb: "Trading rules tested on past data, with costs and a blind out-of-sample check." },
  "Research":        { plural: "Research",         blurb: "Questions about how a market behaves, answered with data before any trade." },
  "Event study":     { plural: "Event studies",    blurb: "What a market does in the minutes and days after a big announcement." },
  "Pricing model":   { plural: "Pricing models",   blurb: "Models that put a fair price on a product, and check how far to trust that price." },
  "Credit model":    { plural: "Credit models",    blurb: "Models of who might not pay back, and what that costs." },
  "Valuation model": { plural: "Valuation models", blurb: "What a business or asset is worth, built up from its cash flows." },
  "Property model":  { plural: "Property models",  blurb: "Buying, financing, letting and selling property, modelled year by year." },
  "Engine":          { plural: "Engines",          blurb: "The systems trading runs on, built from scratch and measured." },
  "Web app":         { plural: "Tools",            blurb: "Working tools that a desk or a business could use." },
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const slugify = (text = "") =>
  String(text).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const unique = (list) => list.filter((item, i) => list.indexOf(item) === i);
const rank = (m) => (MARKET_ORDER.indexOf(m) === -1 ? 99 : MARKET_ORDER.indexOf(m));
const marketList = (list) =>
  unique(list)
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((label) => ({ label, slug: slugify(label) }));

// "2026-10" -> "October 2026"
const monthYear = (date = "") => {
  const [year, month] = String(date).split("-");
  return year && month ? MONTHS[Number(month) - 1] + " " + year : year || "";
};

function buildProjectTopics(projects = [], shelves = []) {
  // Every project, tidied up and sorted newest first
  const all = projects
    .map((p, i) => ({
      ...p,
      markets: p.markets || [],
      tags: p.tags || [],
      tools: p.tools || [],
      marketSlugs: (p.markets || []).map(slugify).join(" "),
      when: monthYear(p.date),
      order: i,
    }))
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || a.order - b.order);

  // Warnings in the terminal, so a project never silently disappears or sorts oddly
  const known = shelves.map((s) => s.slug).concat(["simulations"]);
  all.forEach((p) => {
    if (known.indexOf(p.topic) === -1) console.warn(`[projects] "${p.title}" has topic "${p.topic}", which isn't in shelves.json.`);
    if (!p.date) console.warn(`[projects] "${p.title}" has no "date", so it's sorted last.`);
  });

  // Everything one topic's shelf and page need
  const describe = (topic, list) => {
    const kinds = unique(list.map((p) => p.kind || "Other"));
    return {
      ...topic,
      url: "/projects/" + topic.slug + "/",
      projects: list,
      count: list.length,
      latestWhen: list[0].when,
      markets: marketList(list.flatMap((p) => p.markets)),
      tools: unique(list.flatMap((p) => p.tools)),
      // Groups in the order of their newest project
      groups: kinds.map((kind) => {
        const items = list.filter((p) => (p.kind || "Other") === kind);
        const info = KINDS[kind] || {};
        return { name: info.plural || kind + "s", blurb: info.blurb || "", count: items.length, items };
      }),
    };
  };

  // One topic per hub topic that has a project, in the hub's order
  const shelvesWithProjects = shelves
    .map((s) => ({ shelf: s, list: all.filter((p) => p.topic === s.slug) }))
    .filter((x) => x.list.length)
    .map(({ shelf, list }) =>
      describe(
        { slug: shelf.slug, name: shelf.name, icon: shelf.icon, colour: shelf.colour || "", blurb: shelf.projectsBlurb || shelf.description || "" },
        list
      )
    );

  // Simulations: their own section on the projects page, and their own topic page
  const simList = all.filter((p) => p.topic === "simulations");
  const simulations = simList.length
    ? describe(
        { slug: "simulations", name: "Simulations", icon: "simulations", colour: "walnut",
          blurb: "Job simulations set by banks on Forage. The brief is theirs; the models and write-ups are mine." },
        simList
      )
    : null;

  // Every topic page, each pointing to the next one
  const pages = shelvesWithProjects.concat(simulations ? [simulations] : []);
  pages.forEach((t, i) => {
    const next = pages[(i + 1) % pages.length];
    t.next = pages.length > 1 ? { name: next.name, url: next.url } : null;
  });

  return {
    shelves: shelvesWithProjects,
    simulations,
    pages,
    topics: pages.map((t) => ({ slug: t.slug, name: t.name, colour: t.colour })),
    markets: marketList(all.flatMap((p) => p.markets)),
    tools: unique(all.flatMap((p) => p.tools)),
    total: all.length,
  };
}

export default function () {
  const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
  return buildProjectTopics(read("./projects.json"), read("./shelves.json"));
}
