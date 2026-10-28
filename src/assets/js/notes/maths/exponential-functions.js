// Charts for the note "Exponential functions" (Maths · Exponentials and logs).
// Uses the helpers note.js puts on window.HubNote.
(function () {
  const H = window.HubNote;
  if (!H) return;
  const { $, el, frame, curve, niceMax, tex, money, colour } = H;
  const has = (id) => !!document.getElementById(id);
  const tone = () => colour("--tone");
  const grey = () => colour("--note-grey");
  const card = () => colour("--hub-card");

  // ---------- Move the base ----------
  if (has("chart-base")) {
    const draw = () => {
      const a = parseFloat($("base").value);
      $("base-out").textContent = a.toFixed(1);
      const svg = $("chart-base"), W = 640, Ht = 340, pad = { l: 40, r: 16, t: 14, b: 30 };
      const s = frame(svg, W, Ht, pad, [-3, 3], [0, 8], [-3, -2, -1, 0, 1, 2, 3], [0, 2, 4, 6, 8]);
      const t = tone();
      curve(svg, s, (x) => Math.pow(2, x), [-3, 3], 8, grey(), 1.5, "4 5");
      el("line", { x1: pad.l, x2: W - pad.r, y1: s.sy(0) - 1, y2: s.sy(0) - 1, stroke: t, "stroke-width": 1.5, "stroke-dasharray": "2 6", opacity: 0.8 }, svg);
      el("text", { x: pad.l + 6, y: s.sy(0) - 8, fill: t }, svg).textContent = "asymptote y = 0";
      curve(svg, s, (x) => Math.pow(a, x), [-3, 3], 8, t, 3);
      el("circle", { cx: s.sx(0), cy: s.sy(1), r: 6, fill: t, stroke: card(), "stroke-width": 2 }, svg);
      el("text", { x: s.sx(0) + 10, y: s.sy(1) + 16, fill: t }, svg).textContent = "(0, 1)";
      const y2 = Math.pow(a, 2);
      if (y2 <= 8) el("circle", { cx: s.sx(2), cy: s.sy(y2), r: 4.5, fill: card(), stroke: t, "stroke-width": 2 }, svg);
      tex($("base-formula"), "y = " + a.toFixed(1) + "^{x}");
      $("base-state").textContent = a > 1 ? "Growth: increasing" : a < 1 ? "Decay: decreasing" : "Flat: y = 1";
      tex($("base-at2"), "x = 2 \\Rightarrow y = " + a.toFixed(1) + "^{2} = " + Math.round(y2 * 100) / 100);
    };
    $("base").addEventListener("input", draw);
    document.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => { $("base").value = b.dataset.a; draw(); }));
    H.charts(draw);
  }

  // ---------- Adding vs multiplying ----------
  if (has("chart-race")) {
    const draw = () => {
      const n = parseInt($("steps").value, 10);
      $("steps-out").textContent = n;
      const svg = $("chart-race"), W = 640, Ht = 300, pad = { l: 44, r: 16, t: 14, b: 30 };
      const yMax = niceMax(Math.max(2 ** n, 1 + 2 * n));
      svg.textContent = "";
      const sy = (y) => Ht - pad.b - (y / yMax) * (Ht - pad.t - pad.b);
      [0, yMax / 4, yMax / 2, (3 * yMax) / 4, yMax].forEach((y) => {
        el("line", { x1: pad.l, x2: W - pad.r, y1: sy(y), y2: sy(y), class: "grid" }, svg);
        el("text", { x: pad.l - 8, y: sy(y) + 4, "text-anchor": "end" }, svg).textContent = y;
      });
      const gw = (W - pad.l - pad.r) / (n + 1), bw = Math.min(26, gw * 0.32), t = tone(), g = grey();
      for (let i = 0; i <= n; i++) {
        const cx = pad.l + gw * i + gw / 2, add = 1 + 2 * i, mul = 2 ** i;
        el("rect", { x: cx - bw - 2, y: sy(add), width: bw, height: sy(0) - sy(add), rx: 3, fill: g }, svg);
        el("rect", { x: cx + 2, y: sy(mul), width: bw, height: sy(0) - sy(mul), rx: 3, fill: t }, svg);
        el("text", { x: cx, y: Ht - pad.b + 18, "text-anchor": "middle" }, svg).textContent = i;
      }
      el("line", { x1: pad.l, x2: W - pad.r, y1: sy(0), y2: sy(0), class: "axis" }, svg);
      const r = $("race-read"); r.textContent = "";
      const span = document.createElement("span"); r.appendChild(span);
      tex(span, "\\text{After } " + n + " \\text{ steps: } 1 + 2(" + n + ") = " + (1 + 2 * n) + " \\quad\\text{vs}\\quad 2^{" + n + "} = " + 2 ** n);
      const note = document.createElement("span"); note.className = "state";
      note.textContent = n < 3 ? "Adding is ahead" : "Doubling overtook at step 3";
      r.appendChild(note);
    };
    $("steps").addEventListener("input", draw);
    H.charts(draw);
  }

  // ---------- Trading: compound vs simple ----------
  if (has("chart-desk")) {
    const draw = () => {
      const r = parseInt($("rate").value, 10) / 100, T = parseInt($("years").value, 10);
      $("rate-out").textContent = Math.round(r * 100) + "%"; $("years-out").textContent = T;
      const comp = 1000 * Math.pow(1 + r, T), simp = 1000 * (1 + r * T);
      const raw = comp * 1.08, step = raw <= 4000 ? 1000 : raw <= 12000 ? 2000 : raw <= 30000 ? 5000 : raw <= 80000 ? 10000 : 50000;
      const yMax = Math.ceil(raw / step) * step;
      const yt = []; for (let y = 0; y <= yMax; y += step) yt.push(y);
      const xt = [], xs = T <= 10 ? 2 : T <= 20 ? 5 : 10; for (let x = 0; x <= T; x += xs) xt.push(x);
      const svg = $("chart-desk"), W = 640, Ht = 320, pad = { l: 64, r: 70, t: 14, b: 30 };
      const s = frame(svg, W, Ht, pad, [0, T], [0, yMax], xt, yt, (y) => "£" + (y >= 1000 ? y / 1000 + "k" : y));
      const t = tone(), g = grey();
      curve(svg, s, (x) => 1000 * (1 + r * x), [0, T], yMax, g, 2.5);
      curve(svg, s, (x) => 1000 * Math.pow(1 + r, x), [0, T], yMax, t, 3);
      el("circle", { cx: s.sx(T), cy: s.sy(comp), r: 5, fill: t }, svg);
      el("circle", { cx: s.sx(T), cy: s.sy(simp), r: 4, fill: g }, svg);
      el("text", { x: s.sx(T) + 8, y: s.sy(comp) + 4, fill: t }, svg).textContent = "£" + Math.round(comp / 100) / 10 + "k";
      el("text", { x: s.sx(T) + 8, y: s.sy(simp) + 4 }, svg).textContent = "£" + Math.round(simp / 100) / 10 + "k";
      el("text", { x: W - pad.r, y: Ht - 4, "text-anchor": "end" }, svg).textContent = "years";
      const out = $("desk-read"); out.textContent = "";
      const a = document.createElement("span"), b = document.createElement("span"); out.append(a, b);
      tex(a, "1000 \\times " + (1 + r).toFixed(2) + "^{" + T + "} = " + money(comp));
      tex(b, "\\text{simple: } 1000\\,(1 + " + r.toFixed(2) + " \\times " + T + ") = " + money(simp));
    };
    $("rate").addEventListener("input", draw); $("years").addEventListener("input", draw);
    H.charts(draw);
  }

  // ---------- Quant: EWMA weights ----------
  if (has("chart-ewma")) {
    const draw = () => {
      const lam = parseFloat($("lam").value);
      $("lam-out").textContent = lam.toFixed(2);
      const svg = $("chart-ewma"), W = 640, Ht = 240, pad = { l: 48, r: 12, t: 12, b: 30 }, N = 60;
      const w0 = 1 - lam, yMax = w0 <= 0.05 ? 0.05 : w0 <= 0.1 ? 0.1 : w0 <= 0.15 ? 0.15 : 0.2;
      svg.textContent = "";
      const sy = (y) => Ht - pad.b - (y / yMax) * (Ht - pad.t - pad.b);
      [0, yMax / 2, yMax].forEach((y) => {
        el("line", { x1: pad.l, x2: W - pad.r, y1: sy(y), y2: sy(y), class: "grid" }, svg);
        el("text", { x: pad.l - 8, y: sy(y) + 4, "text-anchor": "end" }, svg).textContent = Math.round(y * 1000) / 10 + "%";
      });
      const bw = (W - pad.l - pad.r) / N, t = tone();
      const half = Math.log(0.5) / Math.log(lam);
      for (let k = 0; k < N; k++) {
        const w = (1 - lam) * Math.pow(lam, k);
        el("rect", { x: pad.l + k * bw + 1, y: sy(w), width: Math.max(1, bw - 2), height: sy(0) - sy(w), rx: 1.5, fill: t, opacity: k <= half ? 1 : 0.45 }, svg);
      }
      [0, 10, 20, 30, 40, 50].forEach((k) => {
        el("text", { x: pad.l + k * bw + bw / 2, y: Ht - pad.b + 18, "text-anchor": "middle" }, svg).textContent = k;
      });
      el("text", { x: W - pad.r, y: Ht - 4, "text-anchor": "end" }, svg).textContent = "days ago";
      el("line", { x1: pad.l, x2: W - pad.r, y1: sy(0), y2: sy(0), class: "axis" }, svg);
      const out = $("ewma-read"); out.textContent = "";
      const a = document.createElement("span"), b = document.createElement("span"); out.append(a, b);
      tex(a, "\\text{Today's weight} = 1 - \\lambda = " + Math.round(w0 * 1000) / 10 + "\\%");
      tex(b, "\\text{Half-life} = \\frac{\\ln 0.5}{\\ln \\lambda} \\approx " + half.toFixed(1) + "\\text{ days}");
    };
    $("lam").addEventListener("input", draw);
    H.charts(draw);
  }

  // ---------- Fintech and Nigeria: inflation ----------
  if (has("chart-infl")) {
    const draw = () => {
      const p = parseInt($("infl").value, 10) / 100, T = 15;
      $("infl-out").textContent = Math.round(p * 100) + "%";
      const svg = $("chart-infl"), W = 640, Ht = 280, pad = { l: 56, r: 70, t: 14, b: 30 };
      const s = frame(svg, W, Ht, pad, [0, T], [0, 1000], [0, 3, 6, 9, 12, 15], [0, 250, 500, 750, 1000]);
      const t = tone(), g = grey();
      el("line", { x1: pad.l, x2: W - pad.r, y1: s.sy(500), y2: s.sy(500), stroke: g, "stroke-width": 1.2, "stroke-dasharray": "4 5" }, svg);
      el("text", { x: W - pad.r + 6, y: s.sy(500) + 4 }, svg).textContent = "half";
      curve(svg, s, (x) => 1000 * Math.pow(1 / 1.03, x), [0, T], 1000, g, 2);
      curve(svg, s, (x) => 1000 * Math.pow(1 / (1 + p), x), [0, T], 1000, t, 3);
      const end = 1000 * Math.pow(1 / (1 + p), T);
      el("circle", { cx: s.sx(T), cy: s.sy(end), r: 5, fill: t }, svg);
      el("text", { x: s.sx(T) + 8, y: s.sy(end) + 4, fill: t }, svg).textContent = Math.round(end);
      el("text", { x: s.sx(T) + 8, y: s.sy(1000 * Math.pow(1 / 1.03, T)) + 4 }, svg).textContent = "3%";
      el("text", { x: W - pad.r, y: Ht - 4, "text-anchor": "end" }, svg).textContent = "years";
      const halfT = Math.log(2) / Math.log(1 + p);
      const out = $("infl-read"); out.textContent = "";
      const a = document.createElement("span"), b = document.createElement("span"); out.append(a, b);
      tex(a, "\\text{After } 15 \\text{ years: } 1000 \\times \\left(\\tfrac{1}{" + (1 + p).toFixed(2) + "}\\right)^{15} \\approx " + Math.round(end));
      tex(b, "\\text{Buying power halves in about } " + halfT.toFixed(1) + "\\text{ years}");
    };
    $("infl").addEventListener("input", draw);
    H.charts(draw);
  }

  // ---------- Worked example sketches ----------
  if (has("chart-we1") && has("chart-we2")) {
    H.charts(() => {
      const t = tone(), g = grey(), pad = { l: 26, r: 10, t: 10, b: 24 };
      let svg = $("chart-we1");
      let s = frame(svg, 240, 200, pad, [-2, 2], [0, 6], [-2, -1, 0, 1, 2], [0, 2, 4, 6]);
      curve(svg, s, (x) => Math.pow(3, x), [-2, 2], 6, t, 2.5);
      curve(svg, s, (x) => Math.pow(1 / 3, x), [-2, 2], 6, g, 2.5);
      el("circle", { cx: s.sx(0), cy: s.sy(1), r: 4, fill: t }, svg);
      el("text", { x: s.sx(1.05), y: s.sy(3) - 8, fill: t }, svg).textContent = "3^x";
      el("text", { x: s.sx(-1.95), y: s.sy(3) - 8 }, svg).textContent = "(1/3)^x";
      svg = $("chart-we2");
      s = frame(svg, 240, 200, pad, [-3, 2], [0, 8], [-3, -2, -1, 0, 1, 2], [0, 2, 4, 6, 8]);
      el("line", { x1: pad.l, x2: 230, y1: s.sy(3), y2: s.sy(3), stroke: t, "stroke-width": 1.5, "stroke-dasharray": "4 5" }, svg);
      curve(svg, s, (x) => Math.pow(2, x), [-3, 2], 8, g, 1.5, "3 4");
      curve(svg, s, (x) => Math.pow(2, x) + 3, [-3, 2], 8, t, 2.5);
      el("circle", { cx: s.sx(0), cy: s.sy(4), r: 4, fill: t }, svg);
      el("text", { x: s.sx(0) + 8, y: s.sy(4) + 14, fill: t }, svg).textContent = "(0, 4)";
      el("text", { x: s.sx(-2.9), y: s.sy(3) - 6, fill: t }, svg).textContent = "y = 3";
    });
  }
})();