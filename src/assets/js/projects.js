// ==========================================================
// Heritage Edge: the projects page filter
//
// Topic and market combine: Quant + FX shows only Quant projects
// that trade FX. Shelves with nothing left in them are hidden,
// and a message offers to clear the filters if nothing matches.
// ==========================================================
(function () {
  const filter = document.querySelector("[data-filter]");
  if (!filter) return;
  filter.hidden = false; // only show the filter once it can work

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
    let shown = 0;
    projects.forEach((project) => {
      const markets = (project.dataset.markets || "").split(" ");
      const topicFits = chosen.topic === "all" || project.dataset.topic === chosen.topic;
      const marketFits = chosen.market === "all" || markets.indexOf(chosen.market) !== -1;
      project.hidden = !(topicFits && marketFits);
      if (!project.hidden) shown += 1;
    });

    shelves.forEach((shelf) => {
      shelf.hidden = !shelf.querySelector("[data-project]:not([hidden])");
    });

    press("data-topic", chosen.topic);
    press("data-market", chosen.market);
    count.textContent = shown === total ? "All " + total + " projects" : "Showing " + shown + " of " + total;
    clearTop.disabled = chosen.topic === "all" && chosen.market === "all";
    if (empty) empty.hidden = shown !== 0;
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