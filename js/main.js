// Startup: hand-off from the intro to the live page, and the edge-to-edge hero title.
(function () {
  const body = document.body;
  const title = document.querySelector(".hero-title");

  // Fit the title so its widest line spans the content width exactly.
  function fitTitle() {
    const box = title.closest(".hero-inner");
    const cs = getComputedStyle(box);
    const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    title.style.fontSize = "100px";
    title.style.width = "max-content";
    const w = title.getBoundingClientRect().width;
    title.style.width = "";
    title.style.fontSize = Math.min(520, (100 * avail) / w * .995).toFixed(2) + "px";
  }
  fitTitle();
  addEventListener("resize", fitTitle);
  if (document.fonts) document.fonts.ready.then(fitTitle);

  let started = false;
  function start() {
    if (started) return;
    started = true;
    body.classList.remove("is-intro");
    requestAnimationFrame(() => body.classList.add("is-live"));
    const target = location.hash && document.querySelector(location.hash);
    if (target) setTimeout(() => target.scrollIntoView(), 60);
  }
  if (window.__siteStarted || !document.getElementById("intro")) start();
  else addEventListener("site:start", start);

  // Smooth in-page navigation without CSS scroll-behavior (which would also smooth programmatic scrolls).
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const el = document.querySelector(a.getAttribute("href"));
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: Scene.reduceMotion ? "auto" : "smooth" });
    history.replaceState(null, "", a.getAttribute("href"));
  });
})();
