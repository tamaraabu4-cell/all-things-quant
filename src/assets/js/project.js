// ==========================================================
// Heritage Edge: project pages
//
// Builds the contents rail (and the phone's Contents drop-down) from
// the page's {% psec %} sections, marks the section being read,
// and fills the progress bar at the bottom of the rail.
// ==========================================================
(function () {
  const sections = Array.from(document.querySelectorAll("[data-psec]"));
  if (!sections.length) return;

  const toc = document.getElementById("pj-toc");
  const tocMobile = document.getElementById("pj-toc-mobile");
  const bar = document.getElementById("pj-bar");
  const where = document.getElementById("pj-where");

  // One rail entry per section: number, short title, and a "Here" marker
  const entries = sections.map((section, i) => {
    const title = section.dataset.title || section.querySelector("h2").textContent;

    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = "#" + section.id;
    link.innerHTML = '<span class="n"></span><span class="t"></span><span class="here">Here</span>';
    link.querySelector(".n").textContent = String(i + 1).padStart(2, "0");
    link.querySelector(".t").textContent = title;
    li.appendChild(link);
    if (toc) toc.appendChild(li);

    if (tocMobile) {
      const item = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#" + section.id;
      a.textContent = title;
      item.appendChild(a);
      tocMobile.appendChild(item);
    }
    return li;
  });

  // Close the phone's Contents drop-down after picking a section
  if (tocMobile) {
    tocMobile.addEventListener("click", (event) => {
      if (event.target.closest("a")) tocMobile.closest("details").open = false;
    });
  }

  // The section being read is the last one whose top has passed 30% of the screen
  function update() {
    const line = window.innerHeight * 0.3;
    let current = 0;
    sections.forEach((section, i) => {
      if (section.getBoundingClientRect().top - line <= 0) current = i;
    });
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (atBottom) current = sections.length - 1;

    entries.forEach((li, i) => {
      li.classList.toggle("on", i === current);
      li.classList.toggle("passed", i < current);
    });
    if (bar) bar.style.width = ((current + 1) / sections.length) * 100 + "%";
    if (where) where.textContent = "Section " + (current + 1) + " of " + sections.length;
  }

  let queued = false;
  window.addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
