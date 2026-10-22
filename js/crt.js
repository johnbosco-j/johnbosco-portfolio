// About: a full-screen CRT framed by the tree. Timing matches the reference:
// cross-fade in over the end of the hero, hold, then lift away at 1.4× scroll speed.
(function () {
  const { clamp, lerp, linear, reduceMotion } = Scene;
  const about = document.getElementById("about");
  const crt = document.getElementById("crt");
  const textEl = document.getElementById("crt-text");
  const artEl = document.getElementById("crt-art");
  const srEl = document.getElementById("crt-sr");
  const noise = document.getElementById("crt-noise");
  const vig = document.getElementById("crt-vignette");
  const frame = document.querySelector(".treeframe");
  const fcv = document.getElementById("treeframe-canvas");
  const fctx = fcv.getContext("2d");

  function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
  function leaf(c, x, y, len, rot, fill) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.beginPath(); c.moveTo(-len, 0);
    c.quadraticCurveTo(0, -len * .42, len, 0);
    c.quadraticCurveTo(0, len * .42, -len, 0);
    c.fillStyle = fill; c.fill(); c.restore();
  }

  // ---------------------------------------------------------------- Tree frame
  // Canvas is 1.5 screens tall: the frame for the screen, then dark foliage with a leafy fringe below it.
  function drawFrame() {
    const W = innerWidth, H = innerHeight, TH = Math.round(H * 1.5);
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    fcv.width = Math.round(W * dpr); fcv.height = Math.round(TH * dpr);
    fcv.style.height = TH + "px";
    const c = fctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, TH);
    const r = rng(7);
    const black = "#020403";

    // Side shadow
    for (const side of [0, 1]) {
      const g = c.createLinearGradient(side ? W : 0, 0, side ? W * .9 : W * .1, 0);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.fillRect(side ? W * .9 : 0, 0, W * .1, H * 1.3);
    }
    // Trunk silhouettes at both edges
    const tw = Math.min(W * .2, 280) * (W < H ? .55 : 1);
    for (const side of [0, 1]) {
      c.beginPath();
      const x0 = side ? W + 10 : -10;
      c.moveTo(x0, -10);
      for (let y = -10; y <= H * 1.32; y += 26) {
        const k = tw * (.55 + .12 * Math.sin(y * .006 + side * 2) + .06 * Math.sin(y * .03 + side)) + (r() - .5) * 6;
        c.lineTo(side ? W - k : k, y);
      }
      c.lineTo(x0, H * 1.32);
      c.closePath();
      const g = c.createLinearGradient(side ? W : 0, 0, side ? W - tw : tw, 0);
      g.addColorStop(0, "#030202"); g.addColorStop(.7, "#0b0504"); g.addColorStop(1, "#160907");
      c.fillStyle = g; c.fill();
      c.save(); c.clip();
      c.strokeStyle = "rgba(34, 12, 9, .5)"; c.lineCap = "round";
      for (let i = 0; i < 40; i++) {
        let x = side ? W - r() * tw : r() * tw, y = r() * H * 1.3;
        c.lineWidth = .8 + r() * 1.8;
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 10; k++) { x += (r() - .5) * 3; y += 16; c.lineTo(x, y); }
        c.stroke();
      }
      c.restore();
    }
    // Top foliage hanging into the frame
    c.fillStyle = black; c.fillRect(0, 0, W, H * .03);
    for (let x = -20; x < W + 20; x += 6) {
      const sag = H * (.035 + .025 * Math.sin(x * .007) + .015 * Math.sin(x * .021 + 1));
      for (let j = 0; j < 2; j++) leaf(c, x + r() * 6, r() * sag, 8 + r() * 18, Math.PI / 2 + (r() - .5) * 1.6, j ? "#06100a" : black);
    }
    // Bottom: grassy spikes rising over the screen's lower edge, then solid dark below
    c.fillStyle = black;
    c.fillRect(0, H * .985, W, H * .35);
    for (let x = -10; x < W + 10; x += 3) {
      const h = H * (.02 + r() * .05) * (1 + .6 * Math.sin(x * .013));
      const w = 2 + r() * 4;
      c.beginPath();
      c.moveTo(x - w, H + 2);
      c.quadraticCurveTo(x + (r() - .5) * 6, H - h * .5, x + (r() - .5) * 10, H - h);
      c.quadraticCurveTo(x + w * .3, H - h * .4, x + w, H + 2);
      c.fillStyle = r() < .2 ? "#07120b" : black;
      c.fill();
    }
    // Leaf texture in the dark mass so it reads as foliage
    for (let i = 0; i < 500; i++) leaf(c, r() * W, H + r() * H * .3, 8 + r() * 22, r() * 6.3, r() < .5 ? "#030604" : "#040805");
    // Leafy fringe that reveals the sky and trunk below
    const edge = H * 1.3;
    for (let x = -20; x < W + 20; x += 4) {
      const sag = Math.sin(x * .004) * 16 + Math.sin(x * .017 + 2) * 7;
      for (let j = 0; j < 3; j++) {
        const y = edge + sag - 8 + r() * 40 * (j === 2 ? 1.5 : 1);
        leaf(c, x + r() * 5, y, 7 + r() * 20, Math.PI / 2 + (r() - .5) * 1.9, j === 2 ? "#08130c" : black);
      }
    }
    // Faint grain on the dark parts
    for (let i = 0; i < 2500; i++) {
      c.fillStyle = `rgba(${30 + r() * 30},${45 + r() * 30},${30 + r() * 20},${(.04 + r() * .06).toFixed(2)})`;
      c.fillRect(r() * W, r() * H * 1.4, 1.2, 1.2);
    }
  }

  // ---------------------------------------------------------------- CRT edge vignette (dithered)
  function drawVignette() {
    const s = innerWidth * innerHeight > 2.2e6 ? .75 : 1;
    const w = Math.max(2, Math.round(innerWidth * s)), h = Math.max(2, Math.round(innerHeight * s));
    vig.width = w; vig.height = h;
    const g = vig.getContext("2d");
    const img = g.createImageData(w, h);
    const d = img.data;
    const r = rng(3);
    for (let y = 0; y < h; y++) {
      const ny = (y / (h - 1)) * 2 - 1;
      for (let x = 0; x < w; x++) {
        const nx = (x / (w - 1)) * 2 - 1;
        const dist = Math.pow(Math.pow(Math.abs(nx), 3.2) + Math.pow(Math.abs(ny), 3.2), 1 / 3.2);
        const a = clamp((dist - .72) / .3);
        const dith = a > r() * .9 + .05 ? 1 : a * .35;
        const i = (y * w + x) * 4;
        d[i] = 2; d[i + 1] = 6; d[i + 2] = 4;
        d[i + 3] = Math.round(clamp(dith) * 255);
      }
    }
    g.putImageData(img, 0, 0);
  }

  function layout() { drawFrame(); drawVignette(); }
  layout();
  let rT;
  addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(layout, 150); });

  // ---------------------------------------------------------------- ASCII art
  // Built from a greyscale image: the "JB" monogram by default, or the photo set in PORTFOLIO.portrait.
  const RAMP = " .,:;i1tfLCG08@";
  const CW = 6, CH = 8; // character cell, matching the .6em × .8em glyph box in CSS
  function toAscii(draw, cols, rows, { contrast = false } = {}) {
    const cv = document.createElement("canvas");
    cv.width = cols * CW; cv.height = rows * CH;
    const g = cv.getContext("2d", { willReadFrequently: true });
    g.fillStyle = "#000"; g.fillRect(0, 0, cv.width, cv.height);
    draw(g, cv.width, cv.height);
    const data = g.getImageData(0, 0, cv.width, cv.height).data;
    const vals = [];
    for (let ry = 0; ry < rows; ry++) for (let rx = 0; rx < cols; rx++) {
      let sum = 0, n = 0;
      for (let yy = 0; yy < CH; yy += 2) for (let xx = 0; xx < CW; xx += 2) {
        const i = ((ry * CH + yy) * cv.width + rx * CW + xx) * 4;
        sum += data[i] * .299 + data[i + 1] * .587 + data[i + 2] * .114; n++;
      }
      vals.push(sum / (n * 255));
    }
    // Photos: stretch levels between the 4th and 99th percentile of the lit pixels.
    let lo = 0, hi = 1;
    if (contrast) {
      const lit = vals.filter((v) => v > .04).sort((a, b) => a - b);
      if (lit.length > 20) { lo = lit[Math.floor(lit.length * .04)]; hi = lit[Math.floor(lit.length * .99)]; }
    }
    const out = [];
    for (let ry = 0; ry < rows; ry++) {
      let html = "";
      for (let rx = 0; rx < cols; rx++) {
        let v = vals[ry * cols + rx];
        if (contrast) v = v < .04 ? 0 : Math.pow(clamp((v - lo) / (hi - lo || 1)), .9);
        const chr = RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))];
        html += v < .42 && chr !== " " ? `<span class="d">${chr}</span>` : chr;
      }
      out.push(`<span class="r">${html}</span>`);
    }
    artEl.style.setProperty("--cols", cols);
    artEl.style.setProperty("--rows", rows);
    artEl.innerHTML = out.join("");
    artRows = [...artEl.querySelectorAll(".r")];
    shownRows = -1;
  }
  function monogram() {
    toAscii((g, w, h) => {
      g.strokeStyle = "rgba(255,255,255,.3)";
      for (let i = 0; i < 3; i++) {
        g.lineWidth = 9 - i * 2.5;
        g.beginPath(); g.arc(w / 2, h * .98, h * (.6 + i * .17), Math.PI, 0); g.stroke();
      }
      g.fillStyle = "#fff";
      g.font = `700 ${h * 1.05}px "Space Grotesk", sans-serif`;
      g.textAlign = "center";
      g.fillText("JB", w / 2, h * .92);
      const sh = g.createLinearGradient(0, 0, w, h);
      sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.5)");
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = sh; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(0,0,0,.55)";
      for (let y = h * .45; y < h; y += CH * 4) g.fillRect(0, y, w, CH * .85);
    }, 60, 26);
  }
  // Portrait: cut the subject off a plain light backdrop, crop to head and shoulders,
  // then boost local contrast so features survive at character resolution.
  function preparePortrait(img) {
    const W = 360, H = Math.round(W * img.height / img.width);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, W, H);
    const px = g.getImageData(0, 0, W, H).data;
    const lum = new Float32Array(W * H), bgLike = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2];
      const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
      lum[i] = (r * .299 + gg * .587 + b * .114) / 255;
      bgLike[i] = mx > 170 && mx - mn < 34 ? 1 : 0; // light and unsaturated
    }
    // Flood-fill the backdrop inwards from the border.
    const bg = new Uint8Array(W * H), stack = [];
    const push = (i) => { if (!bg[i] && bgLike[i]) { bg[i] = 1; stack.push(i); } };
    for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
    while (stack.length) {
      const i = stack.pop(), x = i % W, y = (i / W) | 0;
      if (x > 0) push(i - 1); if (x < W - 1) push(i + 1);
      if (y > 0) push(i - W); if (y < H - 1) push(i + W);
    }
    // Find the head: the top of the figure, and its left/right edges over the first stretch of rows.
    let top = H;
    for (let y = 0; y < H && top === H; y++) { let n = 0; for (let x = 0; x < W; x++) n += bg[y * W + x] ? 0 : 1; if (n > W * .02) top = y; }
    if (top === H) top = 0;
    const lefts = [], rights = [];
    for (let y = top + 4; y < Math.min(H, top + W * .2); y++) {
      let l = -1, r = -1;
      for (let x = 0; x < W; x++) if (!bg[y * W + x]) { if (l < 0) l = x; r = x; }
      if (l >= 0) { lefts.push(l); rights.push(r); }
    }
    const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
    const headL = lefts.length ? med(lefts) : W * .3, headR = rights.length ? med(rights) : W * .7;
    const headCx = (headL + headR) / 2, headW = Math.max(W * .2, headR - headL);
    // Bust crop centred on the head; areas outside the photo count as backdrop.
    const cw = Math.round(headW * 2.15), ch = Math.round(cw * 1.08);
    const x0 = Math.round(headCx - cw / 2), y0 = Math.round(top - headW * .12);
    const at = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? y * W + x : -1);
    // Subject tones: stretch between percentiles of the figure inside the crop.
    const vals = [];
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const i = at(x + x0, y + y0); if (i >= 0 && !bg[i]) vals.push(lum[i]); }
    vals.sort((a, b) => a - b);
    const lo = vals[Math.floor(vals.length * .03)] || 0, hi = vals[Math.floor(vals.length * .995)] || 1;
    const R = 3;
    const blurAt = (x, y) => {
      let s = 0, n = 0;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx += 2) {
        const i = at(Math.min(W - 1, Math.max(0, x + dx)), Math.min(H - 1, Math.max(0, y + dy)));
        if (i >= 0) { s += lum[i]; n++; }
      }
      return n ? s / n : 0;
    };
    const out = g.createImageData(cw, ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const sx = x + x0, sy = y + y0, i = at(sx, sy), o = (y * cw + x) * 4;
      let v = 0;
      if (i >= 0 && !bg[i]) {
        v = clamp((lum[i] - lo) / (hi - lo || 1));
        // Sharpen only the lit areas (the face) so dark curls don't turn into noise.
        const lit = Scene.smooth(.2, .45, v);
        v = clamp(v + (lum[i] - blurAt(sx, sy)) * 1.8 * lit);
        // Darks settle into a calm silhouette; mid-tones and highlights carry the features.
        v = .14 + .86 * Scene.smooth(.05, .92, v);
        // Oval fade so the shoulders dissolve instead of being cut by the frame.
        const dx = (x - cw / 2) / (cw * .5), dy = (y - ch * .4) / (ch * .62);
        v *= 1 - Scene.smooth(.78, 1, Math.hypot(dx, dy));
      }
      out.data[o] = out.data[o + 1] = out.data[o + 2] = Math.round(v * 255);
      out.data[o + 3] = 255;
    }
    const res = document.createElement("canvas");
    res.width = cw; res.height = ch;
    res.getContext("2d").putImageData(out, 0, 0);
    return res;
  }
  function portrait(src) {
    const img = new Image();
    img.onload = () => {
      const prepared = preparePortrait(img);
      const cols = 64, rows = Math.max(24, Math.min(50, Math.round(cols * (prepared.height / prepared.width) * (CW / CH))));
      toAscii((g, w, h) => g.drawImage(prepared, 0, 0, w, h), cols, rows);
    };
    img.onerror = monogram;
    img.src = src;
  }
  let artRows = [], shownRows = -1;
  (document.fonts ? document.fonts.load('700 100px "Space Grotesk"') : Promise.resolve()).then(
    () => (PORTFOLIO.portrait ? portrait(PORTFOLIO.portrait) : monogram()),
    monogram
  );

  // ---------------------------------------------------------------- Terminal, revealed by scrolling
  const lines = PORTFOLIO.terminal;
  srEl.textContent = lines.map((l) => l.map((s) => s[0]).join("")).join("\n");
  const cursor = document.createElement("span");
  cursor.className = "crt-cursor";
  // Every segment is a span whose text is sliced to however far the reader has scrolled.
  // Blank lines count as a few "characters" so the reveal pauses between blocks.
  const segs = [];
  let total = 0;
  for (const line of lines) {
    const p = document.createElement("p");
    textEl.appendChild(p);
    if (!line.length) { segs.push({ p, span: null, text: "", start: total }); total += 6; continue; }
    for (const [text, tone] of line) {
      const span = document.createElement("span");
      span.className = "t-" + tone;
      p.appendChild(span);
      segs.push({ p, span, text, start: total });
      total += text.length;
    }
  }
  let shownChars = -1, revealed = 0;
  function reveal(k) {
    const n = Math.round(clamp(k) * total);
    if (n !== shownChars) {
      shownChars = n;
      let last = segs[0];
      for (const sg of segs) {
        if (!sg.span) { if (n >= sg.start) last = sg; continue; }
        const c = Math.max(0, Math.min(sg.text.length, n - sg.start));
        if (sg.span.textContent.length !== c) sg.span.textContent = sg.text.slice(0, c);
        if (n >= sg.start) last = sg;
      }
      // Cursor sits after the last revealed character.
      if (last.span) last.span.after(cursor); else last.p.appendChild(cursor);
    }
    // The art prints top to bottom a little ahead of the text.
    const rowsOn = Math.round(clamp(k * 1.15) * artRows.length);
    if (rowsOn !== shownRows) {
      shownRows = rowsOn;
      artRows.forEach((r, i) => r.classList.toggle("on", i < rowsOn));
    }
  }

  // ---------------------------------------------------------------- Static
  const nctx = noise.getContext("2d");
  noise.width = 160; noise.height = 100;
  const nimg = nctx.createImageData(160, 100);
  let nFrame = 0;
  function drawNoise() {
    const d = nimg.data;
    for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = v * .55; d[i + 1] = v; d[i + 2] = v * .7; d[i + 3] = 255; }
    nctx.putImageData(nimg, 0, 0);
  }

  // ---------------------------------------------------------------- Scroll choreography
  Scene.onFrame(({ y, vh }) => {
    const top = about.offsetTop, h = about.offsetHeight;
    const fade = linear(top - .666 * vh, top - .24 * vh, y);
    // The last screen of the section lifts the CRT away at 1.4× scroll speed.
    const exitStart = top + h - vh, exitEnd = top + h;
    const lift = -1.4 * vh * linear(exitStart, exitEnd, y);
    const visible = fade > 0 && y < exitEnd + .3 * vh;
    const vis = visible ? "visible" : "hidden";
    crt.style.visibility = vis;
    frame.style.visibility = vis;
    if (!visible) return;
    const op = fade.toFixed(3), tf = `translate3d(0, ${lift.toFixed(1)}px, 0)`;
    crt.style.opacity = op; crt.style.transform = tf;
    frame.style.opacity = op; frame.style.transform = tf;
    // Lines appear as you scroll down through the hold, finishing just before the lift.
    // Progress only ever moves forward: scrolling back up keeps what has been revealed.
    revealed = Math.max(revealed, reduceMotion ? 1 : linear(top - .2 * vh, exitStart - .15 * vh, y));
    reveal(revealed);
    if (!reduceMotion && (nFrame++ & 1) === 0) drawNoise();
  });
})();
