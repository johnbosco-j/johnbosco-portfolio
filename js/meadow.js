// Skills: a moonlit meadow of wind-blown grass with ants marching a trail, each carrying a skill.
(function () {
  const { clamp, lerp, reduceMotion } = Scene;
  const meadow = document.getElementById("skills");
  const back = document.getElementById("grass-back");
  const front = document.getElementById("grass-front");
  const antsEl = document.getElementById("ants");
  const card = document.getElementById("ant-card");
  const bctx = back.getContext("2d");
  const fctx = front.getContext("2d");
  const skills = PORTFOLIO.skills;

  function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
  const mix = (a, b, t) => `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
  const ROOT = [8, 26, 32], MID = [40, 108, 94], TIP = [152, 214, 188], HAZE = [46, 42, 78];
  const scrim = document.getElementById("meadow-scrim");
  const BUCKETS = 14;

  let W = 0, H = 0, sizeK = 1;
  let layers = { back: [], front: [] }, grads = { back: [], front: [] };
  let flies = [];

  const trailY = (x) => H * .57 + Math.sin(x * .0042 + .6) * H * .05 + Math.sin(x * .011 + 2) * H * .016;
  const trailSlope = (x) => H * .05 * .0042 * Math.cos(x * .0042 + .6) + H * .016 * .011 * Math.cos(x * .011 + 2);
  const rowY = (depth) => H * .06 + depth * H * .98;
  const rowH = (depth) => lerp(20, 165, depth) * sizeK;

  // Two tones per depth band (lit and shadowed blades) so the carpet has texture.
  function makeGrad(ctx, b, dark) {
    const depth = (b + .5) / BUCKETS;
    const y = rowY(depth);
    const g = ctx.createLinearGradient(0, y, 0, y - rowH(depth) * 1.05);
    const haze = Math.pow(1 - depth, 2.2) * .62;
    const k = dark ? .62 : 1;
    const shade = (c) => c.map((v) => v * k);
    g.addColorStop(0, mix(shade(ROOT), HAZE, haze));
    g.addColorStop(.5, mix(shade(MID), HAZE, haze));
    g.addColorStop(1, mix(shade(TIP), HAZE, haze * .7));
    return g;
  }

  // Glow sprites for fireflies (warm) and dew glints (cool).
  function glowSprite(core, mid) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, core);
    rg.addColorStop(.14, mid);
    rg.addColorStop(.42, mid.replace(/[\d.]+\)$/, ".22)"));
    rg.addColorStop(1, mid.replace(/[\d.]+\)$/, "0)"));
    g.fillStyle = rg;
    g.fillRect(0, 0, 64, 64);
    return c;
  }
  const sprite = glowSprite("rgba(255,248,220,1)", "rgba(255,230,160,.9)");
  const spriteBlue = glowSprite("rgba(230,250,255,1)", "rgba(159,233,255,.8)");

  function build() {
    W = back.clientWidth;
    H = back.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(devicePixelRatio || 1, W < 700 ? 1.5 : 1.25);
    for (const c of [back, front]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sizeK = clamp(H / 560, .7, 1.35);

    const r = rng(3);
    layers = { back: [], front: [] };
    for (let b = 0; b < BUCKETS * 2; b++) { layers.back.push([]); layers.front.push([]); }
    const count = Math.min(7000, Math.round(W * (W < 700 ? 3.4 : 3.8)));
    for (let i = 0; i < count; i++) {
      const x = -20 + r() * (W + 40);
      const depth = Math.pow(r(), .85);
      const y = rowY(depth);
      const tr = trailY(x);
      if (Math.abs(y - tr) < 14 * sizeK && r() < .9) continue; // part the grass along the trail
      let h = rowH(depth) * (.55 + r() * .7);
      const isFront = y > tr + 3;
      // Grass just in front of the trail stays low so the ants and their tags stay visible.
      if (isFront) h = Math.min(h, (y - tr) * .85 + 12 * sizeK);
      const blade = { x, y, h, w: lerp(3, 12, depth) * (.65 + r() * .6), lean: (r() - .5) * .9, ph: r() * Math.PI * 2, k: .7 + r() * .6 };
      const b = Math.min(BUCKETS - 1, Math.floor(depth * BUCKETS)) * 2 + (r() < .42 ? 0 : 1);
      layers[isFront ? "front" : "back"][b].push(blade);
    }
    grads.back = layers.back.map((_, i) => makeGrad(bctx, i >> 1, i % 2 === 0));
    grads.front = layers.front.map((_, i) => makeGrad(fctx, i >> 1, i % 2 === 0));

    flies = [];
    for (let i = 0; i < (W < 700 ? 28 : 50); i++) {
      flies.push({ x: r() * W, y: H * (.02 + r() * .9), ax: 20 + r() * 50, ay: 10 + r() * 30, sp: .15 + r() * .35, ph: r() * 10, s: 12 + r() * 30, front: r() < .3, blue: r() < .3 });
    }
    placeAnts();
    if (reduceMotion || !active) draw(0);
  }

  // Pointer pushes the grass aside.
  const ptr = { x: -999, y: -999, tx: -999, ty: -999, on: 0 };
  meadow.addEventListener("pointermove", (e) => {
    const b = back.getBoundingClientRect();
    ptr.tx = e.clientX - b.left;
    ptr.ty = e.clientY - b.top;
    if (ptr.x < -900) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
    ptr.on = 1;
  });
  meadow.addEventListener("pointerleave", () => { ptr.on = 0; });
  let ptrK = 0;

  function drawLayer(ctx, buckets, gs, t, name) {
    ctx.clearRect(0, 0, W, H);
    if (name === "back") {
      // Ground under the blades so no sky shows through.
      const g = ctx.createLinearGradient(0, rowY(0), 0, H);
      g.addColorStop(0, mix(MID, HAZE, .5));
      g.addColorStop(.35, mix(ROOT, HAZE, .3));
      g.addColorStop(1, mix(ROOT, [0, 0, 0], .3));
      ctx.fillStyle = g;
      ctx.fillRect(0, rowY(0) - 2, W, H);
      // Dirt trail the ants walk along.
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += 16) { const y = trailY(x) + 2; x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(24, 22, 38, .85)";
      ctx.lineWidth = 24 * sizeK;
      ctx.stroke();
      ctx.strokeStyle = "rgba(80, 72, 96, .25)";
      ctx.lineWidth = 8 * sizeK;
      ctx.stroke();
    }
    const R = 140 * sizeK, R2 = R * R;
    const gust = Math.sin(t * .23) * .08;
    for (let b = 0; b < buckets.length; b++) {
      const list = buckets[b];
      if (!list.length) continue;
      ctx.beginPath();
      for (let i = 0; i < list.length; i++) {
        const bl = list[i];
        let bend = bl.lean + Math.sin(t * 1.2 + bl.x * .005 + bl.ph) * .12 * bl.k + Math.sin(t * .42 + bl.x * .0016) * .14 + gust;
        if (ptrK > .01) {
          const dx = bl.x - ptr.x, dy = bl.y - bl.h * .6 - ptr.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2) { const f = 1 - Math.sqrt(d2) / R; bend += (dx > 0 ? 1 : -1) * f * f * 1.1 * ptrK; }
        }
        const s = Math.sin(bend), c = Math.cos(bend);
        const tx = bl.x + s * bl.h, ty = bl.y - c * bl.h;
        const cx = bl.x + Math.sin(bend * .4) * bl.h * .42, cy = bl.y - bl.h * .62;
        ctx.moveTo(bl.x - bl.w / 2, bl.y);
        ctx.quadraticCurveTo(cx - bl.w * .25, cy, tx, ty);
        ctx.quadraticCurveTo(cx + bl.w * .25, cy, bl.x + bl.w / 2, bl.y);
        ctx.closePath();
      }
      ctx.fillStyle = gs[b];
      ctx.fill();
    }
    for (const fl of flies) {
      if (fl.front !== (name === "front")) continue;
      const a = .25 + .75 * Math.max(0, Math.sin(t * 1.8 + fl.ph * 3));
      ctx.globalAlpha = a;
      const x = fl.x + Math.sin(t * fl.sp + fl.ph) * fl.ax, y = fl.y + Math.cos(t * fl.sp * 1.3 + fl.ph) * fl.ay;
      ctx.drawImage(fl.blue ? spriteBlue : sprite, x - fl.s / 2, y - fl.s / 2, fl.s, fl.s);
    }
    ctx.globalAlpha = 1;
  }
  function draw(t) {
    ptr.x += (ptr.tx - ptr.x) * .18;
    ptr.y += (ptr.ty - ptr.y) * .18;
    ptrK += ((ptr.on ? 1 : 0) - ptrK) * .08;
    drawLayer(bctx, layers.back, grads.back, t, "back");
    drawLayer(fctx, layers.front, grads.front, t, "front");
  }

  // ---------------------------------------------------------------- Ants
  const ANT = `<svg viewBox="0 0 68 43" aria-hidden="true">
    <g class="legs-b" stroke="#7f8fb5" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M33 27 L26 39M37 28 L38 41M41 27 L49 38"/></g>
    <ellipse cx="20" cy="24" rx="13" ry="9" fill="#1c1630" stroke="#cfe2ff" stroke-opacity=".6" stroke-width="1.2"/>
    <ellipse cx="16" cy="21" rx="5" ry="3.2" fill="#ffd27a" opacity=".8"/>
    <ellipse cx="37" cy="24.5" rx="7" ry="5" fill="#1c1630" stroke="#cfe2ff" stroke-opacity=".55" stroke-width="1.2"/>
    <g class="legs-a" stroke="#cfe2ff" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M34 27 L22 38M37 28 L35 41M40 27 L46 39"/></g>
    <circle cx="50" cy="21" r="7" fill="#1c1630" stroke="#cfe2ff" stroke-opacity=".65" stroke-width="1.2"/>
    <circle cx="53" cy="19" r="1.5" fill="#cfe2ff"/>
    <path d="M53 15 Q57 5 64 6M51 14 Q52 4 58 2" stroke="#cfe2ff" stroke-opacity=".75" stroke-width="1.3" fill="none" stroke-linecap="round"/>
  </svg>`;
  const ants = skills.map(([name, cat], i) => {
    const btn = document.createElement("button");
    btn.className = "ant";
    btn.type = "button";
    btn.setAttribute("aria-label", `${name}, ${cat}. Show details`);
    btn.style.setProperty("--lift", (i % 3 === 1 ? 22 : i % 3 === 2 ? 10 : 2) + "px");
    btn.innerHTML = `<span class="ant-glow"></span><span class="ant-tag">${name}</span>${ANT}`;
    btn.addEventListener("click", (e) => { e.stopPropagation(); catchAnt(i); });
    antsEl.appendChild(btn);
    return { el: btn, svg: btn.querySelector("svg"), x: 0, y: 0 };
  });

  let clock = 0, paused = false;
  function placeAnts() {
    const L = Math.max(W + 240, ants.length * 88), gap = L / ants.length;
    ants.forEach((a, i) => {
      const u = (((i * gap + clock) % L) + L) % L;
      const x = u - 120;
      const y = trailY(x) - 4;
      a.x = x; a.y = y;
      a.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      a.svg.style.setProperty("--rot", (Math.atan(trailSlope(x)) * 180 / Math.PI).toFixed(2) + "deg");
    });
  }

  let caught = -1;
  function catchAnt(i) {
    if (caught === i) { release(); return; }
    if (caught >= 0) ants[caught].el.classList.remove("is-caught");
    caught = i;
    paused = true;
    const a = ants[i];
    const [name, cat, used] = skills[i];
    a.el.classList.add("is-caught");
    meadow.classList.add("is-paused", "has-card");
    document.getElementById("ant-card-cat").textContent = cat;
    document.getElementById("ant-card-title").textContent = name;
    document.getElementById("ant-card-body").textContent = "Used in " + used;
    card.hidden = false;
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const mw = meadow.clientWidth;
    card.style.left = (mw - cw) / 2 + "px";
    card.style.top = Math.max(16, antsEl.offsetTop + a.y - 70 - ch) + "px";
    card.querySelector(".close-btn").focus({ preventScroll: true });
  }
  function release() {
    if (caught < 0) return;
    ants[caught].el.classList.remove("is-caught");
    ants[caught].el.focus({ preventScroll: true });
    caught = -1;
    paused = false;
    card.hidden = true;
    meadow.classList.remove("is-paused", "has-card");
  }
  card.querySelector(".close-btn").addEventListener("click", release);
  card.addEventListener("click", (e) => e.stopPropagation());
  scrim.addEventListener("click", release);
  document.addEventListener("click", () => release());
  addEventListener("keydown", (e) => { if (e.key === "Escape") release(); });

  // ---------------------------------------------------------------- Loop
  let active = false;
  new IntersectionObserver(([e]) => { active = e.isIntersecting; }, { rootMargin: "100px" }).observe(meadow);
  let lastT = 0;
  Scene.onFrame(({ t }) => {
    const dt = Math.min(.05, t - lastT || 0);
    lastT = t;
    if (!active || reduceMotion) return;
    if (!paused) clock += dt * 24;
    placeAnts();
    draw(t);
  });

  build();
  let rt;
  new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(build, 120); }).observe(meadow);
})();
