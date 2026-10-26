import { HtmlBasePlugin } from "@11ty/eleventy";

export default function (eleventyConfig) {
  // Fixes links so they work at tamaraabu4-cell.github.io/heritage-edge/
  eleventyConfig.addPlugin(HtmlBasePlugin);

  // Copy these folders across exactly as they are
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/projects");
  eleventyConfig.addPassthroughCopy("src/study-guide");
  eleventyConfig.addPassthroughCopy("src/blog");
}

export const config = {
  dir: { input: "src", output: "_site" },
  templateFormats: ["njk", "md"],
  pathPrefix: "/heritage-edge/",
};