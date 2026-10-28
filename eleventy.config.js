import { HtmlBasePlugin } from "@11ty/eleventy";

export default function (eleventyConfig) {
  // Fixes links so they work at tamaraabu4-cell.github.io/heritage-edge/
  eleventyConfig.addPlugin(HtmlBasePlugin);

  // Copy these across exactly as they are
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/projects/*.py");
  eleventyConfig.addPassthroughCopy("src/study-guide");
  eleventyConfig.addPassthroughCopy("src/favicon.ico");

  // Dates for blog posts: "27 October 2026" on the page, "2026-10-27" inside the <time> tag
  eleventyConfig.addFilter("readableDate", (date) =>
    new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
  );
  eleventyConfig.addFilter("htmlDate", (date) => new Date(date).toISOString().slice(0, 10));

  // Knowledge Hub: turns the notes into a small list the vault home's script can read
  const LEVELS = { Foundations: 1, Core: 2, Advanced: 3 };
  eleventyConfig.addFilter("hubIndex", (notes = []) =>
    notes.map((note) => ({
      url: note.url,
      title: note.data.title,
      shelf: note.data.shelf,
      subtopic: note.data.subtopic || "",
      level: note.data.level || "",
      rank: LEVELS[note.data.level] || 9,
      order: note.data.order || 0,
      summary: note.data.summary || "",
      goals: note.data.goals || [],
    }))
  );
}

export const config = {
  dir: { input: "src", output: "_site" },
  templateFormats: ["njk", "md"],
  pathPrefix: "/",
};
