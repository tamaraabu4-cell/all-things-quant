// ==========================================================
// Heritage Edge: the projects page filter (also used on topic pages)
//
// Topic and market combine: Quant + FX shows only Quant projects
// that trade FX. Shelves with nothing left in them are hidden,
// and a message offers to clear the filters if nothing matches.
//
// On the projects page (data-latest-only), each shelf shows just its
// newest project until a filter is chosen; then every match shows.
// ==========================================================
(function () {
  const filter = document.querySelector("[data-filter]");
  if (!filter) return;
  filter.hidden = false; // only show the filter once it can work

  const latestOnly = filter.hasAttribute("data-latest-only");
  const projects = Array.from(document.querySelectorAll("[data-project]"));
  const shelves = Array.from(document.querySelectorAll("[data-shelf]"));
  const count = filter.querySelector("[data-count]");
  const clearTop = filter.querySelector("[data-clear]");
  const empty = document.querySelector("[data-empty]");
  const total = projects.length;
  const chosen = { topic: "all", market: "all" };

  function press(attr, value) {
    filter.querySelectorAll("[" + attr + "]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.getAttribute(attr) === value));
    });
  }

  function apply() {
    const filtering = chosen.topic !== "all" || chosen.market !== "all";
    let matches = 0;
    projects.forEach((project) => {
      const markets = (project.dataset.markets || "").split(" ");
      const topicFits = chosen.topic === "all" || project.dataset.topic === chosen.topic;
      const marketFits = chosen.market === "all" || markets.indexOf(chosen.market) !== -1;
      const fits = topicFits && marketFits;
      if (fits) matches += 1;
      // With no filter, the projects page shows only each topic's newest project
      project.hidden = !fits || (latestOnly && !filtering && !project.hasAttribute("data-latest"));
    });

    shelves.forEach((shelf) => {
      shelf.hidden = !shelf.querySelector("[data-project]:not([hidden])");
    });

    press("data-topic", chosen.topic);
    press("data-market", chosen.market);
    count.textContent = filtering ? "Showing " + matches + " of " + total : "All " + total + " projects";
    clearTop.disabled = !filtering;
    if (empty) empty.hidden = matches !== 0;
  }

  filter.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.hasAttribute("data-topic")) chosen.topic = button.getAttribute("data-topic");
    else if (button.hasAttribute("data-market")) chosen.market = button.getAttribute("data-market");
    else return;
    apply();
  });

  document.querySelectorAll("[data-clear]").forEach((button) => {
    button.addEventListener("click", () => {
      chosen.topic = "all";
      chosen.market = "all";
      apply();
    });
  });

  apply();
})();
