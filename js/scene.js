// Fixed sky scene + the shared frame loop every other module hooks into.
// Keyframes are sampled from the reference page as a function of p = scrollY / maxScroll.
(function () {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
  const linear = (e0, e1, x) => clamp((x - e0) / (e1 - e0));

  // Piecewise-linear lookup in an evenly spaced table covering p ∈ [0, 1].
  function sample(table, p) {
    const f = clamp(p) * (table.length - 1);
    const i = Math.min(table.length - 2, Math.floor(f));
    const t = f - i, a = table[i], b = table[i + 1];
    return Array.isArray(a) ? a.map((v, k) => lerp(v, b[k], t)) : lerp(a, b, t);
  }

  const listeners = [];
  const state = { y: 0, vh: innerHeight, vw: innerWidth, max: 1, p: 0, t: 0, dir: 0 };
  window.Scene = { reduceMotion, clamp, lerp, smooth, linear, sample, state, onFrame: (fn) => listeners.push(fn) };

  // ---- Sky gradient: 8 stops, 11 keyframes (p = 0, .1 … 1) ----
  const STOPS = [0, 18, 32, 42, 50, 62, 78, 100];
  const SKY = [
    [[79,63,124],[132,100,144],[174,127,152],[209,145,136],[236,159,124],[233,134,89],[157,70,62],[65,23,53]],
    [[98,76,131],[149,111,150],[193,137,144],[226,154,129],[239,154,112],[229,122,75],[136,55,60],[62,22,50]],
    [[120,91,139],[169,125,154],[214,147,134],[241,159,119],[235,139,95],[205,102,67],[119,48,58],[58,21,47]],
    [[143,108,148],[195,138,143],[237,160,124],[236,142,98],[229,122,75],[166,75,63],[100,39,56],[53,19,43]],
    [[170,125,153],[223,152,130],[237,145,102],[229,122,75],[191,93,66],[129,52,59],[77,29,54],[47,18,38]],
    [[204,142,139],[239,153,111],[229,122,75],[182,87,65],[138,57,60],[101,40,56],[61,22,50],[40,16,33]],
    [[240,161,123],[231,126,80],[174,81,64],[129,53,59],[106,42,57],[71,26,54],[52,19,43],[34,14,27]],
    [[233,133,88],[176,82,64],[120,48,58],[93,36,56],[70,25,54],[56,20,46],[43,16,35],[31,13,25]],
    [[183,87,65],[116,47,58],[79,30,54],[61,22,50],[55,20,45],[45,17,37],[34,14,27],[27,12,23]],
    [[115,46,58],[70,25,53],[56,20,45],[48,18,39],[42,16,34],[34,14,28],[30,12,24],[23,10,20]],
    [[65,23,53],[52,19,42],[42,16,34],[35,14,28],[33,13,27],[30,12,24],[25,11,21],[19,9,17]],
  ];
  // Sun [x vw, y vh, scale] every p = .025 up to .5 (then holds).
  const SUN = [[20,10,1],[22.03,9.52,1.01],[24.1,9.29,1.02],[26.2,9.3,1.03],[28.35,9.57,1.04],[30.54,10.08,1.05],[32.78,10.83,1.06],[35.05,11.84,1.08],[37.35,13.08,1.09],[39.7,14.58,1.1],[42.1,16.32,1.11],[44.53,18.32,1.12],[47,20.56,1.13],[49.51,23.03,1.14],[52.06,25.77,1.15],[54.66,28.75,1.15],[57.29,31.98,1.15],[59.97,35.45,1.15],[62.67,39.16,1.15],[65.43,43.13,1.15],[68,47,1.15]];
  // Moon [x vw, y vh, scale] every p = .025 from .5 to 1.
  const MOON = [[68,47,.85],[70.94,49.08,.86],[73.39,51.13,.87],[75.56,53.28,.88],[77.48,55.55,.89],[79.12,57.93,.9],[80.5,60.43,.92],[81.61,63.04,.93],[82.45,65.76,.94],[83.02,68.59,.95],[83.33,71.54,.96],[83.37,74.61,.97],[83.14,77.78,.98],[82.64,81.06,.99],[82,85.36,1],[82,95.4,1],[82,105.45,1],[82,115.5,1],[82,125.51,1],[82,135.56,1],[82,144,1]];
  // Horizon glow every p = .025 from .2 to .5.
  const GLOW = [0, .08, .15, .23, .3, .38, .45, .53, .59, .44, .29, .14, 0];

  const sky = document.querySelector(".sky");
  const glow = document.querySelector(".horizon-glow");
  const stars = document.querySelector(".stars");
  const sun = document.querySelector(".sun");
  const moon = document.querySelector(".moon");
  const clouds = document.querySelector(".clouds");
  const track = document.querySelector(".clouds-track");
  const dayLayer = document.querySelector(".cloud-day");
  const nightLayer = document.querySelector(".cloud-night");

  // ---- Stars ----
  for (let i = 0; i < 50; i++) {
    const s = document.createElement("i");
    const size = 1 + Math.random() * 1.6;
    s.style.cssText = `left:${(Math.random() * 100).toFixed(2)}%;top:${(Math.random() * 60).toFixed(2)}%;width:${size.toFixed(2)}px;height:${size.toFixed(2)}px;--dl:${(-Math.random() * 2.2).toFixed(2)}s`;
    stars.appendChild(s);
  }

  // ---- Clouds: painted to canvas once (day + moonlit palettes), tiled across three screens ----
  const SLOTS = [
    ["-8%", "5%", "clamp(11rem, 40vw, 40rem)", 1],
    ["31%", "0%", "clamp(7rem, 24vw, 24rem)", .8],
    ["55%", "20%", "clamp(10rem, 34vw, 34rem)", .95],
    ["82%", "3%", "clamp(6.5rem, 21vw, 21rem)", .75],
    ["10%", "50%", "clamp(8rem, 27vw, 27rem)", .7],
    ["42%", "62%", "clamp(5.5rem, 17vw, 17rem)", .55],
    ["74%", "56%", "clamp(7.5rem, 25vw, 25rem)", .65],
  ];
  function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
  function paintCloud(seed, lit, shade, rim) {
    const W = 480, H = 240;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    const r = rng(seed);
    const base = H * .66;
    // Long, low bank of soft puffs: a few taller ones in the middle, the rest trailing out.
    const n = 11 + Math.floor(r() * 5);
    const span = .66 + r() * .2, x0 = (1 - span) / 2;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const mid = Math.max(0, 1 - Math.abs(t - .5 + (r() - .5) * .2) * 2.1);
      const x = W * (x0 + t * span) + (r() - .5) * 18;
      const rad = H * (.09 + mid * mid * .17 + r() * .05);
      const y = base - rad * (.3 + r() * .25);
      const rg = g.createRadialGradient(x, y, 0, x, y, rad);
      rg.addColorStop(0, "rgba(0,0,0,.95)");
      rg.addColorStop(.45, "rgba(0,0,0,.8)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg;
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    // Soft, flattened underside.
    const bl = g.createLinearGradient(0, base - 14, 0, base + 8);
    bl.addColorStop(0, "rgba(0,0,0,1)");
    bl.addColorStop(1, "rgba(0,0,0,0)");
    g.globalCompositeOperation = "destination-in";
    g.fillStyle = bl;
    g.fillRect(0, 0, W, H);
    // Colour: lit top fading to a cool shaded belly.
    g.globalCompositeOperation = "source-in";
    const col = g.createLinearGradient(0, base - H * .32, 0, base + 4);
    col.addColorStop(0, rim);
    col.addColorStop(.35, lit);
    col.addColorStop(1, shade);
    g.fillStyle = col;
    g.fillRect(0, 0, W, H);
    // Fine grain so it reads painterly.
    g.globalCompositeOperation = "source-atop";
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = r() < .5 ? "rgba(255,255,255,.07)" : "rgba(40,20,60,.07)";
      g.fillRect(r() * W, r() * H, 1.5, 1.5);
    }
    return c.toDataURL("image/png");
  }
  function buildClouds() {
    const day = SLOTS.map((_, i) => paintCloud(11 + i * 7, "#f2dccf", "#b597ab", "#fff3e6"));
    const night = SLOTS.map((_, i) => paintCloud(11 + i * 7, "#8692bd", "#2d2a55", "#c3d1f2"));
    for (const [layer, imgs] of [[dayLayer, day], [nightLayer, night]]) {
      for (const offset of [0, -100, -200]) {
        const panel = document.createElement("div");
        panel.className = "cloud-panel";
        panel.style.left = offset + "vw";
        SLOTS.forEach(([l, t, w, o], i) => {
          const el = document.createElement("div");
          el.className = "cloud";
          el.style.cssText = `left:${l};top:${t};width:${w};opacity:${o};background-image:url(${imgs[i]})`;
          panel.appendChild(el);
        });
        layer.appendChild(panel);
      }
    }
  }
  buildClouds();
  if (reduceMotion) document.querySelector(".clouds-drift").style.animation = "none";

  // ---- Measurements ----
  // The sky timeline is anchored to sections, so the sun sets over the nest and the stars come out
  // over the tiles exactly as on the reference, even though our sections have different lengths.
  // Values are each section's start as a fraction of the reference page's scroll range.
  const ANCHORS = [["about", .155], ["projects", .3225], ["experience", .578], ["faq", .707], ["skills", .836], ["contact", .969]];
  let anchors = [[0, 0], [1, 1]];
  function measure() {
    state.vh = innerHeight;
    state.vw = innerWidth;
    state.max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    anchors = [[0, 0]];
    for (const [id, p] of ANCHORS) {
      const el = document.getElementById(id);
      const y = el ? Math.min(el.offsetTop, state.max - 1) : 0;
      if (y > anchors[anchors.length - 1][0]) anchors.push([y, p]);
    }
    anchors.push([state.max, 1]);
  }
  function timeline(y) {
    for (let i = 1; i < anchors.length; i++) {
      const [y1, p1] = anchors[i], [y0, p0] = anchors[i - 1];
      if (y <= y1) return lerp(p0, p1, clamp((y - y0) / (y1 - y0 || 1)));
    }
    return 1;
  }
  addEventListener("resize", measure);
  addEventListener("load", measure);
  new ResizeObserver(measure).observe(document.body);

  // ---- Per-frame sky ----
  let lastKey = "";
  function updateSky() {
    const p = timeline(state.y);
    state.p = p;
    const key = p.toFixed(5) + "|" + state.vw + "|" + state.vh;
    if (key === lastKey) return;
    lastKey = key;

    const f = p * 10, i = Math.min(9, Math.floor(f)), t = f - i;
    const stops = STOPS.map((s, k) => {
      const a = SKY[i][k], b = SKY[i + 1][k];
      return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))}) ${s}%`;
    });
    sky.style.background = `linear-gradient(${stops.join(",")})`;

    const [sx, sy, ss] = sample(SUN, Math.min(p, .5) / .5);
    sun.style.transform = `translate3d(${sx}vw, ${sy}vh, 0) translate(-50%, -50%) scale(${ss.toFixed(3)})`;
    sun.style.opacity = (1 - linear(.35, .5, p)).toFixed(3);

    const [mx, my, ms] = sample(MOON, Math.max(0, p - .5) / .5);
    moon.style.transform = `translate3d(${mx}vw, ${my}vh, 0) translate(-50%, -50%) scale(${ms.toFixed(3)})`;
    moon.style.opacity = linear(.35, .5, p).toFixed(3);

    glow.style.opacity = (p < .2 || p > .5 ? 0 : sample(GLOW, (p - .2) / .3)).toFixed(3);
    stars.style.opacity = linear(.55, .85, p).toFixed(3);

    const cloudOp = p < .55 ? lerp(.9, .72, p / .55) : p < .675 ? .72 : lerp(.72, 0, linear(.675, .775, p));
    clouds.style.opacity = cloudOp.toFixed(3);
    track.style.transform = `translate3d(${(36 * p).toFixed(3)}vw, 0, 0)`;
    dayLayer.style.opacity = (1 - linear(.15, .5, p)).toFixed(3);
    nightLayer.style.opacity = linear(.2, .55, p).toFixed(3);
  }

  // ---- Header: transparent at top, solid once scrolled; hides on the way down ----
  const header = document.querySelector(".site-header");
  let lastY = 0;
  function updateHeader() {
    const y = state.y, d = y - lastY;
    if (Math.abs(d) > 3) {
      header.classList.toggle("is-hidden", d > 0 && y > state.vh * .45);
      lastY = y;
    }
    header.classList.toggle("is-solid", y > 8);
  }

  // ---- Dot nav ----
  const dots = [...document.querySelectorAll(".dot-nav a")];
  const targets = dots.map((d) => document.querySelector(d.getAttribute("href")));
  function updateDots() {
    const mid = state.y + state.vh * .5;
    let idx = 0;
    targets.forEach((s, i) => { if (s && s.offsetTop <= mid) idx = i; });
    dots.forEach((d, i) => d.classList.toggle("is-active", i === idx));
  }

  // ---- Rise-in on scroll ----
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: .2 });
  Scene.observe = (el) => io.observe(el);
  document.querySelectorAll(".rise-io").forEach((el) => io.observe(el));

  // ---- Loop ----
  measure();
  function frame(now) {
    state.y = scrollY;
    state.t = now / 1000;
    updateSky();
    updateHeader();
    updateDots();
    for (const fn of listeners) fn(state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
