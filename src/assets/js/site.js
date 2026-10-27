const root = document.documentElement;
const deviceDark = window.matchMedia("(prefers-color-scheme: dark)");

// Follow the device live: if it switches mode while the page is open, so does the site
deviceDark.addEventListener("change", (event) => {
  let chosen = null;
  try { chosen = sessionStorage.getItem("theme"); } catch (e) {}
  if (!chosen) root.setAttribute("data-theme", event.matches ? "dark" : "light");
});

// Toggle button: switch mode for this visit only
const themeToggle = document.querySelector("[data-theme-toggle]");

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { sessionStorage.setItem("theme", next); } catch (e) {}
  });
}