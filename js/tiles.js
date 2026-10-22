// Experience + wins tiles (delivered by an eagle fly-by) and the FAQ accordion.
(function () {
  const reduce = Scene.reduceMotion;
  const section = document.getElementById("experience");
  const flyby = section.querySelector(".flyby");

  const arrow = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style="position:absolute;right:16px;top:14px;opacity:.45"><path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  function tile(item) {
    const li = document.createElement("li");
    li.className = "tile";
    const inner = document.createElement(item.href ? "a" : "div");
    if (item.href) { inner.href = item.href; inner.target = "_blank"; inner.rel = "noopener"; }
    inner.style.position = "relative";
    inner.innerHTML = `${item.href ? arrow : ""}<p class="tile-date">${item.date}</p><h3 class="tile-title">${item.title}</h3><p class="tile-role">${item.role}</p><p class="tile-body">${item.body}</p>`;
    li.appendChild(inner);
    return li;
  }
  const grids = [
    [document.getElementById("experience-tiles"), PORTFOLIO.experience],
    [document.getElementById("win-tiles"), PORTFOLIO.wins],
  ].map(([ul, items]) => { items.forEach((it) => ul.appendChild(tile(it))); return ul; });

  // ---- Eagle (side view, flying right) ----
  const EAGLE = `<svg viewBox="0 0 220 130" aria-hidden="true">
    <g class="wing-down"><path d="M96 66 C80 84 58 104 30 112 C52 98 66 86 76 70Z" fill="#24160e"/></g>
    <path d="M30 68 L4 58 L10 66 L2 74 L12 76 L6 84 L32 76Z" fill="#f4f1ea"/>
    <path d="M28 70 C50 56 98 52 132 58 C142 60 146 66 140 72 C110 82 62 84 28 76Z" fill="#3b2418"/>
    <path d="M128 56 C134 46 150 44 158 50 C162 54 160 60 154 62 L140 68 C134 66 130 62 128 56Z" fill="#f6f3ec"/>
    <path d="M156 52 C164 50 170 53 170 57 C166 56 162 57 158 60Z" fill="#f6b93b"/>
    <circle cx="151" cy="52" r="1.6" fill="#1b120c"/>
    <path d="M96 78 L92 88 M104 78 L102 89" stroke="#f6b93b" stroke-width="3" stroke-linecap="round"/>
    <g class="wing-up"><path d="M82 64 C78 40 70 20 52 4 C62 6 70 10 76 14 C76 6 78 2 82 0 C86 8 90 12 92 18 C94 10 98 6 102 4 C104 14 106 22 106 30 C110 26 114 24 118 24 C116 38 110 52 104 62Z" fill="#2e1c12"/>
      <path d="M86 58 C86 44 82 30 74 18" stroke="#4a2e1d" stroke-width="2" fill="none"/></g>
  </svg>`;
  const FEATHER = `<svg viewBox="0 0 26 12" aria-hidden="true"><path d="M1 6 C6 0 18 0 25 5 C18 9 7 11 1 6Z" fill="#fbf6ee"/><path d="M1 6 L25 5" stroke="#d9cfc2" stroke-width=".8"/></svg>`;

  function deliver(grid) {
    const items = [...grid.children];
    if (reduce) { items.forEach((t) => t.classList.add("is-landed")); return; }
    const sb = section.getBoundingClientRect(), gb = grid.getBoundingClientRect();
    const top = gb.top - sb.top - gb.height * .15;
    const eagle = document.createElement("div");
    eagle.className = "eagle";
    eagle.innerHTML = EAGLE;
    flyby.appendChild(eagle);
    const W = section.clientWidth;
    const path = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      path.push({ transform: `translate(${(-0.2 * W + t * 1.4 * W).toFixed(0)}px, ${(top + Math.sin(t * Math.PI * 1.4) * gb.height * .25).toFixed(0)}px) rotate(${(Math.cos(t * Math.PI * 1.4) * -6).toFixed(1)}deg)` });
    }
    eagle.animate(path, { duration: 2600, easing: "cubic-bezier(.35,.1,.5,.95)", fill: "forwards" }).finished.then(() => eagle.remove());
    // Tiles are picked up in the eagle's wake, row by row.
    items.forEach((t, i) => {
      const b = t.getBoundingClientRect();
      const at = ((b.left + b.width / 2 - sb.left) / W + .2) / 1.4 * 2600 * .9 + Math.floor(i / 3) * 120;
      setTimeout(() => t.classList.add("is-held"), Math.max(0, at - 250));
      setTimeout(() => { t.classList.remove("is-held"); t.classList.add("is-landed"); }, at + 350);
    });
    // Feathers drift in from the sides.
    for (let i = 0; i < 7; i++) {
      const fe = document.createElement("div");
      fe.className = "feather";
      fe.innerHTML = FEATHER;
      flyby.appendChild(fe);
      const fromLeft = i % 2 === 0;
      const y0 = top + Math.random() * gb.height, y1 = y0 + 40 + Math.random() * 120;
      const x0 = fromLeft ? -40 : W + 40, x1 = W * (fromLeft ? .15 + Math.random() * .3 : .55 + Math.random() * .3);
      fe.animate([
        { transform: `translate(${x0}px, ${y0}px) rotate(${fromLeft ? -20 : 200}deg)`, opacity: 0 },
        { transform: `translate(${(x0 + x1) / 2}px, ${y0 - 30}px) rotate(${fromLeft ? 40 : 140}deg)`, opacity: 1, offset: .4 },
        { transform: `translate(${x1}px, ${y1}px) rotate(${fromLeft ? 110 : 70}deg)`, opacity: 0 },
      ], { duration: 1800 + Math.random() * 900, delay: 400 + i * 160, easing: "ease-out", fill: "both" }).finished.then(() => fe.remove());
    }
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); deliver(e.target); } });
  }, { threshold: .08 });
  grids.forEach((g) => io.observe(g));

  // ---- FAQ ----
  const list = document.getElementById("faq-list");
  PORTFOLIO.faq.forEach(([q, a]) => {
    const d = document.createElement("details");
    d.className = "faq-item";
    d.innerHTML = `<summary><span>${q}</span><span class="plus" aria-hidden="true">+</span></summary><div class="faq-body"><div><p>${a}</p></div></div>`;
    d.querySelector("summary").addEventListener("click", (e) => {
      e.preventDefault();
      if (d.open) {
        d.classList.remove("is-open");
        setTimeout(() => { if (!d.classList.contains("is-open")) d.open = false; }, reduce ? 0 : 360);
      } else {
        d.open = true;
        requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("is-open")));
      }
    });
    list.appendChild(d);
  });
})();
