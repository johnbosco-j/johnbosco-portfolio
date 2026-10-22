// Footer: underground cross-section. Tunnels link the grass, the contact capsule, the socials and an egg chamber.
(function () {
  const footer = document.getElementById("contact");
  const svg = document.getElementById("soil-art");
  const edge = document.getElementById("soil-edge");
  const inner = document.getElementById("soil-inner");
  const cta = document.getElementById("soil-cta");
  const socials = document.getElementById("socials");
  const slot = document.getElementById("chamber-slot");
  const f = (n) => n.toFixed(1);
  function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

  const ANT = `<symbol id="soil-ant" viewBox="0 0 68 43">
    <g stroke="#cfe2ff" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M33 27 L26 39M37 28 L38 41M41 27 L49 38M34 27 L22 38M40 27 L46 39">
      <animateTransform attributeName="transform" type="translate" values="0 0;0 -1.5;0 0" dur=".3s" repeatCount="indefinite"/></path></g>
    <ellipse cx="20" cy="24" rx="13" ry="9" fill="#1c1630" stroke="#e6efff" stroke-width="2"/>
    <ellipse cx="37" cy="24.5" rx="7" ry="5" fill="#1c1630" stroke="#e6efff" stroke-width="2"/>
    <circle cx="50" cy="21" r="7" fill="#1c1630" stroke="#e6efff" stroke-width="2"/>
    <path d="M53 15 Q57 5 64 6M51 14 Q52 4 58 2" stroke="#e6efff" stroke-width="2" fill="none" stroke-linecap="round"/>
  </symbol>`;

  function wave(y0, W, amp, seed) {
    const r = rng(seed);
    let d = `M-20 ${f(y0)}`;
    for (let x = 0; x <= W + 40; x += 34) d += ` L${x} ${f(y0 + Math.sin(x * .011 + seed) * amp + (r() - .5) * amp * .8)}`;
    return d;
  }
  function stone(x, y, s, r) {
    const pts = [];
    const n = 6 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * .3;
      pts.push([x + Math.cos(a) * s * (.8 + r() * .35), y + Math.sin(a) * s * .62 * (.8 + r() * .35)]);
    }
    const poly = pts.map((p) => p.map(f).join(",")).join(" ");
    const top = [pts[n - 1], pts[0], [x + s * .1, y - s * .05], pts[Math.floor(n * .6)]].map((p) => p.map(f).join(",")).join(" ");
    return `<polygon points="${poly}" fill="#5f5a66"/><polygon points="${top}" fill="#8a8492" opacity=".8"/><polygon points="${pts.slice(0, 3).map((p) => p.map(f).join(",")).join(" ")} ${f(x)},${f(y)}" fill="#37323d" opacity=".7"/>`;
  }
  const tunnel = (d, id) => `<path d="${d}" stroke="#6a4a32" stroke-opacity=".6" stroke-width="31" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path id="${id}" d="${d}" stroke="#140c0a" stroke-width="24" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" stroke="#2c1b14" stroke-opacity=".75" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

  function drawEdge() {
    const W = footer.clientWidth;
    edge.setAttribute("viewBox", `0 0 ${W} 96`);
    const r = rng(4);
    const pts = [];
    for (let x = 0; x <= W + 24; x += 24) pts.push(`${x} ${f(70 + Math.sin(x * .02) * 3 + (r() - .5) * 4)}`);
    const line = "M" + pts.join(" L");
    let ticks = "";
    for (let x = 4; x < W; x += 7 + r() * 6) ticks += `<path d="M${f(x)} ${f(72 + r() * 2)} l ${f((r() - .5) * 3)} ${f(4 + r() * 7)}" stroke="#63b79a" stroke-opacity=".75" stroke-width="1.2" stroke-linecap="round"/>`;
    edge.innerHTML = `<path d="${line} L${W + 24} 96 L0 96 Z" fill="var(--soil-top)"/><path d="${line}" fill="none" stroke="#0b1d17" stroke-width="5"/>${ticks}`;
  }

  function build() {
    const W = footer.clientWidth;
    const bedrock = footer.querySelector(".bedrock");
    const H = footer.clientHeight - bedrock.offsetHeight + 30;
    if (!W || !H) return;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.style.height = H + "px";
    const r = rng(17);
    const F = footer.getBoundingClientRect();
    const rel = (el) => { const b = el.getBoundingClientRect(); return { l: b.left - F.left, t: b.top - F.top, w: b.width, h: b.height, cx: b.left - F.left + b.width / 2, cy: b.top - F.top + b.height / 2 }; };
    const c = rel(cta);
    const icons = [...socials.querySelectorAll("a")].map(rel);
    const rows = [];
    icons.forEach((p) => { const row = rows.find((rw) => Math.abs(rw[0].cy - p.cy) < 8); row ? row.push(p) : rows.push([p]); });
    const cx = c.cx, cBot = c.t + c.h;
    const firstRowY = rows[0][0].cy, lastRowY = rows[rows.length - 1][0].cy;
    const s = rel(slot);
    const chamber = { x: cx + Math.min(40, W * .05), y: s.t + s.h * .62 };

    let out = `<defs>${ANT}
      <pattern id="fleck" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="6" cy="7" r="1.1" fill="#806044" opacity=".55"/><circle cx="19" cy="19" r=".9" fill="#806044" opacity=".4"/></pattern>
      <radialGradient id="egg-s" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e3d6be"/></radialGradient></defs>`;
    // Strata
    const layers = [[.3, "#3c2a20"], [.55, "#30211c"], [.78, "#251819"]];
    layers.forEach(([k, col], i) => {
      const d = wave(H * k, W, 10, 3 + i * 5);
      out += `<path d="${d} L${W + 40} ${H} L-20 ${H} Z" fill="${col}"/>`;
      out += `<path d="${d}" fill="none" stroke="#806044" stroke-opacity=".55" stroke-width="2" stroke-dasharray="1.5 7" stroke-linecap="round"/>`;
    });
    out += `<rect width="${W}" height="${H}" fill="url(#fleck)"/>`;
    // Bedrock lip with half-buried stones
    const lip = wave(H - 26, W, 8, 21);
    out += `<path d="${lip} L${W + 40} ${H + 2} L-20 ${H + 2} Z" fill="#19131a"/>`;
    out += `<path d="${lip}" fill="none" stroke="#806044" stroke-opacity=".5" stroke-width="2" stroke-dasharray="1.5 7" stroke-linecap="round"/>`;

    // Roots hanging from the surface on both sides
    const roots = [];
    function root(x, y, ang, len, w, depth) {
      let d = `M${f(x)} ${f(y)}`;
      for (let i = 0, n = Math.ceil(len / 12); i < n; i++) {
        ang = Math.min(Math.PI * .8, Math.max(Math.PI * .2, ang + (r() - .5) * .35));
        x += Math.cos(ang) * 12; y += Math.sin(ang) * 12;
        d += ` L${f(x)} ${f(y)}`;
        if (depth < 2 && r() < .14) root(x, y, ang + (r() < .5 ? -1 : 1) * (.5 + r() * .5), len * (.35 + r() * .2), w * .6, depth + 1);
      }
      roots.push(`<path d="${d}" stroke="#8c6b4c" stroke-width="${f(w)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    const narrow = W < 640;
    (narrow ? [.1, .9] : [.05, .26, .74, .95]).forEach((k) => root(W * k + (r() - .5) * 20, 0, Math.PI / 2 + (r() - .5) * .3, Math.min(c.t * .8, 200) * (.7 + r() * .4), 2.4, 0));
    out += roots.join("");

    // Stones, kept clear of the capsule, socials and tunnels
    for (let i = 0, placed = 0; i < 90 && placed < (narrow ? 6 : 13); i++) {
      const x = r() * W, y = 30 + r() * (H - 40);
      if (x > c.l - 40 && x < c.l + c.w + 40 && y > c.t - 40 && y < cBot + 40) continue;
      if (Math.abs(x - cx) < 70) continue;
      if (y > firstRowY - 60 && y < lastRowY + 60 && Math.abs(x - cx) < 260) continue;
      out += stone(x, y, 9 + r() * 14, r);
      placed++;
    }
    for (let i = 0; i < (narrow ? 3 : 5); i++) out += stone(W * (.08 + r() * .84), H - 22 + r() * 8, 14 + r() * 10, r);

    // Tunnels
    const T = [];
    T.push(`M${f(cx)} -6 C ${f(cx + 26)} ${f(c.t * .22)} ${f(cx - 70)} ${f(c.t * .42)} ${f(cx - 24)} ${f(c.t * .62)} S ${f(cx + 10)} ${f(c.t * .86)} ${f(cx + 4)} ${f(c.t + 12)}`);
    T.push(`M${f(cx)} ${f(cBot - 10)} C ${f(cx - 30)} ${f(cBot + (firstRowY - cBot) * .35)} ${f(cx + 36)} ${f(cBot + (firstRowY - cBot) * .65)} ${f(cx)} ${f(firstRowY)}`);
    rows.forEach((row) => { if (row.length > 1) T.push(`M${f(row[0].cx)} ${f(row[0].cy)} L${f(row[row.length - 1].cx)} ${f(row[0].cy)}`); });
    if (rows.length > 1) T.push(`M${f(cx)} ${f(firstRowY)} L${f(cx)} ${f(lastRowY)}`);
    T.push(`M${f(cx)} ${f(lastRowY)} C ${f(cx - 40)} ${f(lastRowY + 50)} ${f(chamber.x + 40)} ${f(chamber.y - 60)} ${f(chamber.x)} ${f(chamber.y - 16)}`);
    T.forEach((d, i) => { out += tunnel(d, "tn" + i); });
    // Egg chamber
    out += `<ellipse cx="${f(chamber.x)}" cy="${f(chamber.y)}" rx="44" ry="26" fill="#6a4a32" opacity=".7"/>
      <ellipse cx="${f(chamber.x)}" cy="${f(chamber.y)}" rx="38" ry="21" fill="#140c0a"/>
      <ellipse cx="${f(chamber.x)}" cy="${f(chamber.y - 5)}" rx="26" ry="10" fill="#2c1b14" opacity=".7"/>`;
    for (let k = 0; k < 5; k++) {
      const ex = chamber.x - 19 + k * 9.5, ey = chamber.y + 7 - (k % 2) * 4;
      out += `<ellipse cx="${f(ex)}" cy="${f(ey)}" rx="5.4" ry="4" fill="url(#egg-s)" transform="rotate(${f((r() - .5) * 40)} ${f(ex)} ${f(ey)})"/>`;
    }
    svg.innerHTML = out;

    if (Scene.reduceMotion) return;
    let ants = "";
    [0, 1, T.length - 1].forEach((ti, k) => {
      const path = svg.querySelector("#tn" + ti);
      if (!path) return;
      const len = path.getTotalLength(), dur = Math.max(5, len / 30);
      const rev = k === 1;
      ants += `<g><use href="#soil-ant" x="-14" y="-10" width="28" height="18"/>
        <animateMotion dur="${f(dur)}s" begin="${f(-dur * r())}s" repeatCount="indefinite" rotate="${rev ? "auto-reverse" : "auto"}" ${rev ? 'keyPoints="1;0" keyTimes="0;1" calcMode="linear"' : ""}><mpath href="#tn${ti}"/></animateMotion></g>`;
    });
    svg.insertAdjacentHTML("beforeend", ants);
  }

  let t;
  const schedule = () => { clearTimeout(t); t = setTimeout(() => { drawEdge(); build(); }, 150); };
  new ResizeObserver(schedule).observe(footer);
  if (document.fonts) document.fonts.ready.then(schedule);
  drawEdge();
  build();
})();
