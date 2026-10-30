/* ==========================================================
   Heritage Edge homepage motion
   1. The live candlestick chart behind the hero
   2. Sections that animate once when they scroll into view
   Both switch off for anyone who has "reduce motion" turned on.
   ========================================================== */

// Tell the CSS that JavaScript is running, so hidden-until-visible styles only apply when they can be revealed
document.documentElement.classList.add("js-motion");

(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- 1. Live candlestick chart ----------
     The prices are made up: a random walk that moves like a market, not real data. */
  function startHeroChart() {
    var canvas = document.querySelector("[data-hero-chart]");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");

    var SECONDS_PER_CANDLE = 1.6;   // how long each new candle takes to form
    var TICKS_PER_CANDLE = 10;      // price moves inside each candle
    var CANDLES_ACROSS = 40;        // on a wide screen; fewer on phones

    var width = 0, height = 0, ratio = 1, slot = 30;
    var price = 0, velocity = 0, middle = null;
    var candles = [], current = null;
    var offset = 0, candleTime = 0, tickTime = 0;
    var colours = {};
    var running = false, onScreen = true, frame = null, lastTime = 0;

    function randomNormal() {
      var u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    function nextPrice() {
      velocity = 0.9 * velocity + 0.22 * randomNormal();
      price += velocity - 0.006 * price;
      return price;
    }
    function makeCandle() {
      var open = price, high = open, low = open;
      for (var i = 0; i < TICKS_PER_CANDLE; i++) {
        var p = nextPrice();
        high = Math.max(high, p);
        low = Math.min(low, p);
      }
      return { o: open, h: high, l: low, c: price };
    }
    function readColours() {
      var style = getComputedStyle(canvas);
      colours.up = style.getPropertyValue("--candle-up").trim() || "#047857";
      colours.down = style.getPropertyValue("--candle-down").trim() || "#7a2e3a";
    }
    function resize() {
      ratio = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      slot = Math.max(18, width / CANDLES_ACROSS);
      var needed = Math.floor((width * 0.92) / slot);
      while (candles.length < needed) candles.push(makeCandle());
      if (candles.length > needed) candles = candles.slice(candles.length - needed);
      if (!current) current = { o: price, h: price, l: price, c: price };
      draw();
    }

    function draw() {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      var all = candles.concat([current]);

      // Keep the chart centred, drifting slowly so it never jumps
      var target = 0;
      for (var i = 0; i < all.length; i++) target += all[i].c;
      target /= all.length;
      middle = middle === null ? target : middle + (target - middle) * 0.04;
      var scale = height / 80;
      function y(p) { return Math.max(height * 0.05, Math.min(height * 0.95, height * 0.57 - (p - middle) * scale)); }

      var body = Math.max(4, slot * 0.64);
      for (var j = 0; j < all.length; j++) {
        var c = all[j];
        var x = j * slot + slot / 2 - offset;
        var colour = c.c >= c.o ? colours.up : colours.down;
        ctx.strokeStyle = colour;
        ctx.fillStyle = colour;
        ctx.lineWidth = 2;
        ctx.beginPath();                       // wick
        ctx.moveTo(x, y(c.h));
        ctx.lineTo(x, y(c.l));
        ctx.stroke();
        var top = y(Math.max(c.o, c.c));       // body
        var bottom = y(Math.min(c.o, c.c));
        ctx.fillRect(x - body / 2, top, body, Math.max(2, bottom - top));
      }

      // Dashed line from the latest price to the right edge
      var lastX = all.length * slot - offset;
      ctx.strokeStyle = colours.down;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(lastX, y(current.c));
      ctx.lineTo(width, y(current.c));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function step(now) {
      var seconds = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      tickTime += seconds;
      candleTime += seconds;
      offset += (slot / SECONDS_PER_CANDLE) * seconds;

      while (tickTime >= SECONDS_PER_CANDLE / TICKS_PER_CANDLE) {
        tickTime -= SECONDS_PER_CANDLE / TICKS_PER_CANDLE;
        var p = nextPrice();
        current.c = p;
        current.h = Math.max(current.h, p);
        current.l = Math.min(current.l, p);
      }
      if (candleTime >= SECONDS_PER_CANDLE) {   // candle finished: it joins the history, the oldest scrolls off
        candleTime -= SECONDS_PER_CANDLE;
        offset -= slot;
        candles = candles.slice(1).concat([current]);
        current = { o: price, h: price, l: price, c: price };
      }
      draw();
      frame = requestAnimationFrame(step);
    }

    function play() {
      if (running || reduceMotion.matches || !onScreen || document.hidden) return;
      running = true;
      lastTime = performance.now();
      frame = requestAnimationFrame(step);
    }
    function pause() {
      running = false;
      if (frame) cancelAnimationFrame(frame);
    }

    readColours();
    resize();
    play();

    // Pause when the hero is scrolled away or the tab is hidden, so it costs nothing in the background
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        onScreen ? play() : pause();
      }).observe(canvas);
    }
    document.addEventListener("visibilitychange", function () { document.hidden ? pause() : play(); });
    reduceMotion.addEventListener("change", function () { reduceMotion.matches ? pause() : play(); });
    document.addEventListener("themechange", function () { readColours(); draw(); });
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });
  }

  /* ---------- 2. Animate once on scroll ----------
     Anything marked data-reveal gets the class "is-visible" the first time it comes into view. */
  function startReveals() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          watcher.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });
    items.forEach(function (el) { watcher.observe(el); });
  }

  function start() { startHeroChart(); startReveals(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();