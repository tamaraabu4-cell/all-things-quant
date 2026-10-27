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
}

export const config = {
  dir: { input: "src", output: "_site" },
  templateFormats: ["njk", "md"],
  pathPrefix: "/",
};
