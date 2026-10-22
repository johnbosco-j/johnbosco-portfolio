// Projects: tree trunk, branch and a woven nest whose eggs crack open into project cards.
(function () {
  const projects = PORTFOLIO.projects;
  const trunk = document.getElementById("trunk");
  const branch = document.getElementById("branch");
  const nest = document.querySelector(".nest");
  const back = document.getElementById("nest-back");
  const front = document.getElementById("nest-front");
  const eggsEl = document.getElementById("eggs");
  const card = document.getElementById("egg-card");
  const hint = document.getElementById("nest-hint");
  const f = (n) => n.toFixed(1);
  function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

  // ---------------------------------------------------------------- Trunk
  function drawTrunk() {
    const w = trunk.clientWidth, h = trunk.clientHeight;
    if (!w || !h) return;
    const r = rng(5);
    const edgeX = (y) => w * .82 + Math.sin(y * .009) * w * .05 + Math.sin(y * .037 + 2) * w * .03;
    const pts = [];
    for (let y = -20; y <= h + 40; y += 22) pts.push([edgeX(y) + (r() - .5) * 4, y]);
    let edge = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      edge += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f(mx)} ${f(my)}`;
    }
    const body = `M-30 -20 L${edge.slice(1)} L-30 ${h + 40} Z`;
    let furrows = "";
    for (let i = 0, n = Math.round(w / 5); i < n; i++) {
      let x = r() * w * .78 + 2, y = r() * h;
      const len = 60 + r() * 380;
      let d = `M${f(x)} ${f(y)}`;
      for (let k = 0; k < len; k += 16) { x += (r() - .5) * 3.2; y += 16; d += ` L${f(x)} ${f(y)}`; }
      const dark = r() < .7;
      furrows += `<path d="${d}" stroke="${dark ? "#260a10" : "#7a3430"}" stroke-width="${f(dark ? 1.2 + r() * 2.6 : .8 + r() * .8)}" stroke-opacity="${dark ? .9 : .5}" fill="none" stroke-linecap="round"/>`;
    }
    let knots = "";
    for (let y = 160 + r() * 120; y < h; y += 240 + r() * 220) {
      const x = w * (.25 + r() * .35), rx = 5 + r() * 5, ry = rx * 1.45;
      knots += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="#2e0d0c" stroke="#1d0709" stroke-width="2"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx * .45)}" ry="${f(ry * .45)}" fill="none" stroke="#1d0709" stroke-width="1.3"/>`;
    }
    let moss = "";
    for (let y = 70 + r() * 60; y < h; y += 110 + r() * 150) {
      const x = edgeX(y) - 2, rx = 5 + r() * 5, ry = 12 + r() * 14;
      moss += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="#4f6b3a"/><ellipse cx="${f(x + rx * .3)}" cy="${f(y - ry * .2)}" rx="${f(rx * .5)}" ry="${f(ry * .55)}" fill="#7c9c4a" opacity=".55"/>`;
    }
    let twigs = "";
    for (let y = 220 + r() * 160; y < h - 80; y += 300 + r() * 260) {
      const x = edgeX(y), up = r() < .5;
      twigs += `<path d="M${f(x - 3)} ${f(y)} q 8 ${up ? -5 : 2} 16 ${up ? -14 : -6}" stroke="#4d1713" stroke-width="2.4" stroke-linecap="round" fill="none"/>
        <path d="M${f(x + 13)} ${f(y - (up ? 12 : 5))} q 8 -7 3 -14 q -8 4 -3 14Z" fill="#4f7a5a"/>`;
    }
    trunk.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs><linearGradient id="bark" x1="0" x2="1"><stop offset="0" stop-color="#2e0c0b"/><stop offset=".55" stop-color="#4d1713"/><stop offset=".88" stop-color="#682622"/><stop offset="1" stop-color="#7a3430"/></linearGradient>
      <clipPath id="trunk-clip"><path d="${body}"/></clipPath></defs>
      <path d="${body}" fill="url(#bark)"/>
      <g clip-path="url(#trunk-clip)">${furrows}${knots}</g>
      ${moss}${twigs}
      <path d="${edge}" fill="none" stroke="#e0a07c" stroke-opacity=".4" stroke-width="1.6"/>
    </svg>`;
  }

  // ---------------------------------------------------------------- Branch
  function drawBranch() {
    const w = branch.clientWidth;
    if (!w) return;
    const stage = branch.parentElement;
    const belly = nest.offsetTop + nest.offsetHeight * .7;
    branch.style.top = f(belly - 52) + "px";
    const r = rng(9);
    // Main limb: thick at the trunk, thinning past the nest.
    const top = `M0 30 C ${f(w * .3)} 34 ${f(w * .6)} 46 ${f(w)} 60`;
    const bot = `L ${f(w)} 74 C ${f(w * .6)} 74 ${f(w * .3)} 82 0 90 Z`;
    // Lower fork with needle sprigs.
    const fx = w * .58;
    const fork = `M${f(fx)} 64 C ${f(fx + 50)} 80 ${f(fx + 110)} 100 ${f(fx + 190)} 108`;
    const sprig = (x, y, rot, s) => {
      let needles = "";
      for (let i = 0; i < 9; i++) {
        const t = i / 8 * 40;
        needles += `M${f(t)} 0 l ${f(8 * s)} ${f(-9 * s)} M${f(t)} 0 l ${f(8 * s)} ${f(9 * s)} `;
      }
      return `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${s})" stroke="#2f6b6e" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M0 0 L44 0 ${needles}"/></g>`;
    };
    let grain = "";
    for (let i = 0; i < 18; i++) {
      const x = r() * w * .95, len = 30 + r() * 110;
      grain += `<path d="M${f(x)} ${f(46 + r() * 26)} q ${f(len / 2)} ${f(1 + r() * 3)} ${f(len)} ${f(3 + r() * 3)}" stroke="#260a10" stroke-opacity=".55" stroke-width="1.3" fill="none"/>`;
    }
    branch.innerHTML = `<svg viewBox="0 0 ${f(w)} 150" preserveAspectRatio="none">
      <defs><linearGradient id="br" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d3530"/><stop offset=".4" stop-color="#561d19"/><stop offset="1" stop-color="#3a110f"/></linearGradient></defs>
      <path d="${fork}" stroke="#46161a" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path d="${top} ${bot}" fill="url(#br)"/>
      ${grain}
      <path d="${top}" stroke="#e0a07c" stroke-opacity=".28" stroke-width="1.4" fill="none"/>
      ${sprig(fx + 170, 106, 10, 1.05)}${sprig(fx + 130, 98, -22, .85)}${sprig(w * .9, 66, -8, .9)}
    </svg>`;
  }

  // ---------------------------------------------------------------- Nest (viewBox 576 × 300)
  function drawNest() {
    const r = rng(21);
    const straws = ["#f3dcb8", "#e8c9a0", "#dcb68a", "#cfa275", "#bf9066", "#f7e8cc", "#a97a54"];
    const cx = 288, cy = 122, RX = 236, RY = 62;
    const pick = (list) => list[Math.floor(r() * list.length)];
    const straw = (x1, y1, x2, y2, bend, color, width, op) => {
      const mx = (x1 + x2) / 2 + (r() - .5) * bend, my = (y1 + y2) / 2 + (r() - .5) * bend;
      return `<path d="M${f(x1)} ${f(y1)} Q${f(mx)} ${f(my)} ${f(x2)} ${f(y2)}" stroke="${color}" stroke-width="${f(width)}" stroke-opacity="${op.toFixed(2)}" fill="none" stroke-linecap="round"/>`;
    };
    const rim = (t, k = 1) => [cx + Math.cos(t) * RX * k, cy + Math.sin(t) * RY * k];

    let b = `<defs><radialGradient id="hollow" cx=".5" cy=".62" r=".62"><stop offset="0" stop-color="#4a2040"/><stop offset=".7" stop-color="#6e3352"/><stop offset="1" stop-color="#93526a"/></radialGradient></defs>
      <ellipse cx="${cx}" cy="${cy}" rx="${RX - 8}" ry="${RY - 4}" fill="url(#hollow)"/>
      <path d="M${cx - RX + 4} ${cy} A ${RX - 4} ${RY - 2} 0 0 1 ${cx + RX - 4} ${cy}" stroke="#c39467" stroke-width="15" fill="none" stroke-linecap="round"/>`;
    for (let i = 0; i < 220; i++) {
      const t = Math.PI + r() * Math.PI, dt = .1 + r() * .32, k = .93 + r() * .14;
      const [x1, y1] = rim(t, k), [x2, y2] = rim(t + dt, k + (r() - .5) * .08);
      b += straw(x1, y1 - r() * 7, x2, y2 - r() * 7, 14, pick(straws), 1 + r() * 2.4, .65 + r() * .35);
    }
    back.innerHTML = b;

    const bowl = `M${cx - RX} ${cy} A ${RX} ${RY} 0 0 0 ${cx + RX} ${cy} C ${cx + RX} ${cy + 64} ${cx + 140} ${cy + 118} ${cx} ${cy + 120} C ${cx - 140} ${cy + 118} ${cx - RX} ${cy + 64} ${cx - RX} ${cy} Z`;
    let fr = `<defs>
      <linearGradient id="bowl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6c79c"/><stop offset=".55" stop-color="#c79a6b"/><stop offset="1" stop-color="#94643f"/></linearGradient>
      <clipPath id="bowl-clip"><path d="${bowl}"/></clipPath></defs>
      <ellipse cx="${cx}" cy="${cy + 122}" rx="200" ry="12" fill="#1a0a12" opacity=".3"/>
      <path d="${bowl}" fill="url(#bowl)"/><g clip-path="url(#bowl-clip)">`;
    for (let i = 0; i < 420; i++) {
      const t = r() * Math.PI, lvl = r();
      const x0 = cx + Math.cos(t) * (RX - lvl * 46), y0 = cy + Math.sin(t) * (RY + lvl * 74);
      const ang = (r() - .5) * .8 + Math.cos(t) * .45, len = 30 + r() * 80;
      fr += straw(x0, y0, x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len * .32, 18, pick(lvl > .7 ? straws.slice(3) : straws), 1 + r() * 2.6, .5 + r() * .5);
    }
    fr += `<path d="${bowl}" fill="none" stroke="#5a3424" stroke-opacity=".3" stroke-width="16"/></g>
      <path d="M${cx - RX + 2} ${cy} A ${RX - 2} ${RY} 0 0 0 ${cx + RX - 2} ${cy}" stroke="#dcb688" stroke-width="18" fill="none" stroke-linecap="round"/>`;
    for (let i = 0; i < 260; i++) {
      const t = r() * Math.PI, dt = .08 + r() * .3, k = .95 + r() * .1;
      const [x1, y1] = rim(t, k), [x2, y2] = rim(t + dt, k + (r() - .5) * .08);
      fr += straw(x1, y1 + r() * 8 - 2, x2, y2 + r() * 8 - 2, 12, pick(straws), 1.2 + r() * 2.8, .7 + r() * .3);
    }
    for (let i = 0; i < 40; i++) {
      const t = r() * Math.PI * 2, [x1, y1] = rim(t, 1);
      const out = 14 + r() * 34;
      fr += straw(x1, y1, x1 + Math.cos(t) * out, y1 + Math.sin(t) * out * .5 - 4, 12, pick(straws.slice(0, 3)), .8 + r() * 1.2, .8);
    }
    front.innerHTML = fr;
  }

  // ---------------------------------------------------------------- Eggs (viewBox 110 × 150)
  // [centre-x %, tilt, bottom %, width %, depth]
  const layout = [[28, -8, 31, 16.5, 2], [39, -3, 35, 15.5, 1], [50, 2, 31, 16.5, 2], [61, 4, 35, 15.5, 1], [72, 8, 31, 16.5, 2]];
  const SHELL = "M55 4 C84 4 106 56 106 92 C106 124 84 146 55 146 C26 146 4 124 4 92 C4 56 26 4 55 4Z";
  const ZIG = "M0 72 L12 62 L22 74 L34 60 L46 72 L58 58 L70 72 L82 60 L94 72 L110 62";
  function eggSVG(i) {
    const id = "egg" + i;
    return `<svg viewBox="0 0 110 150" aria-hidden="true">
      <defs>
        <radialGradient id="${id}s" cx=".38" cy=".34" r=".8"><stop offset="0" stop-color="#f9dcaa"/><stop offset=".6" stop-color="#f1c58b"/><stop offset="1" stop-color="#ddaa72"/></radialGradient>
        <radialGradient id="${id}l" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7d6"/><stop offset=".45" stop-color="#ffd98a" stop-opacity=".85"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient>
        <clipPath id="${id}b"><path d="${ZIG} L110 160 L0 160Z"/></clipPath>
        <clipPath id="${id}t"><path d="${ZIG} L110 -6 L0 -6Z"/></clipPath>
        <clipPath id="${id}c"><path d="${SHELL}"/></clipPath>
      </defs>
      <ellipse class="egg-glow" cx="55" cy="66" rx="62" ry="56" fill="url(#${id}l)"/>
      <g clip-path="url(#${id}b)">
        <path d="${SHELL}" fill="url(#${id}s)"/>
        <g clip-path="url(#${id}c)"><ellipse cx="96" cy="100" rx="30" ry="60" fill="#d39c64" opacity=".35"/></g>
        <path class="egg-glow" d="M8 76 Q55 92 102 76 L102 84 Q55 100 8 84Z" fill="#fff1c8" opacity=".75"/>
      </g>
      <g class="egg-top"><g clip-path="url(#${id}t)">
        <path d="${SHELL}" fill="url(#${id}s)"/>
        <g clip-path="url(#${id}c)"><ellipse cx="96" cy="70" rx="28" ry="56" fill="#d39c64" opacity=".3"/></g>
      </g></g>
      <path class="egg-crack" d="M6 70 L12 62 L22 74 L34 60 L46 72 L58 58 L70 72 L82 60 L94 72 L104 66" fill="none" stroke="#8a5a3a" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>`;
  }
  const eggs = projects.slice(0, 5).map((p, i) => {
    const [x, rot, bottom, width, z] = layout[i];
    const btn = document.createElement("button");
    btn.className = "egg";
    btn.type = "button";
    btn.style.cssText = `left:${x}%;bottom:${bottom}%;width:${width}%;z-index:${z};--r:${rot}deg`;
    btn.setAttribute("aria-label", `Open project ${i + 1} of ${projects.length}: ${p.name}`);
    btn.innerHTML = eggSVG(i) + `<span class="egg-label">${p.name}</span>`;
    btn.addEventListener("click", (e) => { e.stopPropagation(); openEgg(i); });
    eggsEl.appendChild(btn);
    return btn;
  });

  // ---------------------------------------------------------------- Card
  const $ = (id) => document.getElementById(id);
  let current = -1;
  function placeCard() {
    card.style.top = f(nest.offsetTop + nest.offsetHeight * .86) + "px";
  }
  function openEgg(i) {
    const p = projects[i], egg = eggs[i];
    if (current === i && !card.hidden) { closeCard(); return; }
    current = i;
    hint.classList.add("is-hidden");
    const show = () => {
      egg.classList.remove("is-cracking");
      egg.classList.add("is-open");
      $("egg-card-count").textContent = `Project ${i + 1} of ${projects.length}`;
      $("egg-card-title").textContent = p.name;
      $("egg-card-tag").textContent = `${p.tag} · ${p.status}`;
      $("egg-card-body").textContent = p.body;
      $("egg-card-points").innerHTML = p.points.map((t) => `<li>${t}</li>`).join("");
      $("egg-card-stack").innerHTML = p.stack.map((s) => `<span>${s}</span>`).join("");
      $("egg-card-links").innerHTML = p.links.map(([label, href]) => `<a href="${href}" target="_blank" rel="noopener">${label} ↗</a>`).join("");
      placeCard();
      card.hidden = false;
      const cb = card.getBoundingClientRect(), eb = egg.getBoundingClientRect();
      card.style.setProperty("--notch", f(Math.min(cb.width - 24, Math.max(24, eb.left + eb.width / 2 - cb.left))) + "px");
      card.querySelector(".close-btn").focus({ preventScroll: true });
    };
    if (egg.classList.contains("is-open") || Scene.reduceMotion) { show(); return; }
    card.hidden = true;
    egg.classList.add("is-cracking");
    setTimeout(show, 330);
  }
  function closeCard() {
    card.hidden = true;
    if (current >= 0) eggs[current].focus({ preventScroll: true });
    current = -1;
  }
  card.querySelector(".close-btn").addEventListener("click", closeCard);
  card.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", () => { if (!card.hidden) closeCard(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !card.hidden) closeCard(); });

  drawNest();
  function layoutAll() { drawTrunk(); drawBranch(); if (!card.hidden) placeCard(); }
  layoutAll();
  let t;
  new ResizeObserver(() => { clearTimeout(t); t = setTimeout(layoutAll, 120); }).observe(document.getElementById("projects"));
})();
