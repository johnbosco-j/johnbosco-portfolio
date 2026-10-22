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

  // ---------------------------------------------------------------- ASCII monogram
  const COLS = 60, ROWS = 26;
  function buildArt() {
    const cw = 6, ch = 8;
    const cv = document.createElement("canvas");
    cv.width = COLS * cw; cv.height = ROWS * ch;
    const g = cv.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, cv.width, cv.height);
    g.strokeStyle = "rgba(255,255,255,.3)";
    for (let i = 0; i < 3; i++) {
      g.lineWidth = 9 - i * 2.5;
      g.beginPath(); g.arc(cv.width / 2, cv.height * .98, cv.height * (.6 + i * .17), Math.PI, 0); g.stroke();
    }
    g.fillStyle = "#fff";
    g.font = `700 ${cv.height * 1.05}px "Space Grotesk", sans-serif`;
    g.textAlign = "center";
    g.fillText("JB", cv.width / 2, cv.height * .92);
    const sh = g.createLinearGradient(0, 0, cv.width, cv.height);
    sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.5)");
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = sh; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = "rgba(0,0,0,.55)";
    for (let y = cv.height * .45; y < cv.height; y += ch * 4) g.fillRect(0, y, cv.width, ch * .85);
    const data = g.getImageData(0, 0, cv.width, cv.height).data;
    const ramp = " .,:;i1tfLCG08@";
    const rows = [];
    for (let ry = 0; ry < ROWS; ry++) {
      let html = "";
      for (let rx = 0; rx < COLS; rx++) {
        let sum = 0, n = 0;
        for (let yy = 0; yy < ch; yy += 2) for (let xx = 0; xx < cw; xx += 2) { sum += data[((ry * ch + yy) * cv.width + rx * cw + xx) * 4]; n++; }
        const v = sum / (n * 255);
        const chr = ramp[Math.min(ramp.length - 1, Math.floor(v * ramp.length))];
        html += v < .42 && chr !== " " ? `<span class="d">${chr}</span>` : chr;
      }
      rows.push(`<span class="r">${html}</span>`);
    }
    artEl.innerHTML = rows.join("");
  }
  (document.fonts ? document.fonts.load('700 100px "Space Grotesk"') : Promise.resolve()).then(buildArt, buildArt);

  // ---------------------------------------------------------------- Typing
  const lines = PORTFOLIO.terminal;
  srEl.textContent = lines.map((l) => l.map((s) => s[0]).join("")).join("\n");
  const cursor = document.createElement("span");
  cursor.className = "crt-cursor";
  let typed = false;
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  async function type() {
    typed = true;
    const rows = [...artEl.querySelectorAll(".r")];
    rows.forEach((row, i) => setTimeout(() => row.classList.add("on"), reduceMotion ? 0 : 150 + i * 55));
    for (const line of lines) {
      const p = document.createElement("p");
      textEl.appendChild(p);
      p.appendChild(cursor);
      for (const [text, tone] of line) {
        const span = document.createElement("span");
        span.className = "t-" + tone;
        p.insertBefore(span, cursor);
        if (reduceMotion) { span.textContent = text; continue; }
        for (const chr of text) { span.textContent += chr; await wait(chr === " " ? 10 : 24); }
      }
      if (!reduceMotion) await wait(line.length && line[0][0].startsWith(">") ? 320 : 80);
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
    const exitStart = top + .3 * vh, exitEnd = top + h;
    const lift = -1.4 * vh * linear(exitStart, exitEnd, y) * ((exitEnd - exitStart) / vh);
    const visible = fade > 0 && y < exitEnd + .3 * vh;
    const vis = visible ? "visible" : "hidden";
    crt.style.visibility = vis;
    frame.style.visibility = vis;
    if (!visible) return;
    const op = fade.toFixed(3), tf = `translate3d(0, ${lift.toFixed(1)}px, 0)`;
    crt.style.opacity = op; crt.style.transform = tf;
    frame.style.opacity = op; frame.style.transform = tf;
    if (!typed && fade > .6) type();
    if (!reduceMotion && (nFrame++ & 1) === 0) drawNoise();
  });
})();
