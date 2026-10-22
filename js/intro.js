// Intro: flight over a sunlit sea of clouds; click dives through them into the site.
// Uses assets/intro.mp4 when present (e.g. a Google Flow render); otherwise renders the clouds live in WebGL.
(function () {
  const intro = document.getElementById("intro");
  const canvas = document.getElementById("intro-canvas");
  const bar = intro.querySelector(".intro-bar span");
  const status = intro.querySelector(".intro-status");
  const white = intro.querySelector(".intro-white");
  const skip = intro.querySelector(".intro-skip");

  let finished = false, running = true;
  function finish(fast) {
    if (finished) return;
    finished = true;
    window.__siteStarted = true;
    intro.classList.add("is-gone");
    window.dispatchEvent(new Event("site:start"));
    setTimeout(() => { intro.remove(); running = false; }, fast ? 500 : 900);
  }

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  // Deep links and reduced-motion visitors go straight to the page.
  if (Scene.reduceMotion || location.hash) { finish(true); return; }

  // ---- Optional pre-rendered video ----
  let video = null;
  const v = PORTFOLIO.introVideo && document.createElement("video");
  if (v) {
    v.className = "intro-video";
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.preload = "auto";
    v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
    v.addEventListener("loadeddata", () => {
      if (finished) return;
      intro.insertBefore(v, canvas.nextSibling);
      v.play().catch(() => {});
      requestAnimationFrame(() => { v.classList.add("is-on"); video = v; });
    }, { once: true });
    v.src = PORTFOLIO.introVideo;
  }

  // ---- Live WebGL clouds ----
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
  const vert = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  const frag = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uDive;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y); }
const mat2 R = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p, int oct){ float v = 0., a = .5; for (int i = 0; i < 7; i++){ if (i >= oct) break; v += a * noise(p); p = R * p + vec2(1.7, 9.2); a *= .5; } return v; }
float shape(vec2 xz){ return .55 + fbm(xz * .05 + 3.1, 2) * .9; }
// Coarse height for marching, full detail for the surface we actually shade.
float Hm(vec2 xz){ return pow(fbm(xz * .16, 3), 1.7) * 3.2 * shape(xz); }
float H(vec2 xz){ return pow(fbm(xz * .16, 5), 1.7) * 3.2 * shape(xz); }
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  float dv = smoothstep(0., 1., uDive);
  float camY = mix(2.35, .35, dv);
  float pitch = mix(.1, .5, dv);
  vec3 ro = vec3(sin(uTime * .07) * 1.5, camY, uTime * 1.35 + dv * 6.);
  vec3 fw = normalize(vec3(0., -pitch, 1.));
  vec3 rt = normalize(cross(vec3(0., 1., 0.), fw));
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(fw * 1.55 + uv.x * rt + uv.y * up);
  vec3 sunDir = normalize(vec3(.62, .2, 1.));

  vec3 zen = vec3(.40, .30, .37), hor = vec3(.93, .71, .61), haze = vec3(.66, .55, .64);
  vec3 col = mix(hor, zen, smoothstep(-.02, .55, rd.y));
  float s = max(dot(rd, sunDir), 0.);
  col += vec3(1., .97, .9) * smoothstep(.9985, .9995, s) * 1.6;
  col += vec3(1., .85, .65) * pow(s, 18.) * .55 + vec3(1., .7, .55) * pow(s, 4.) * .12;

  float t = .1, lastT = .1, hitT = -1., best = 1e9, bestT = 0.;
  for (int i = 0; i < 128; i++){
    vec3 p = ro + rd * t;
    float d = p.y - Hm(p.xz);
    float k = d / (t * .012 + .012);
    if (k < best){ best = k; bestT = t; }
    if (d < .003 * t){ hitT = t; break; }
    lastT = t;
    t += max(d * .42, .015 + t * .004);
    if (t > 75.) break;
  }
  if (hitT > 0.){
    float lo = lastT, hi = hitT;
    for (int i = 0; i < 6; i++){
      float m = .5 * (lo + hi);
      vec3 q = ro + rd * m;
      if (q.y - H(q.xz) < 0.) hi = m; else lo = m;
    }
    hitT = hi;
  }
  float cov = hitT > 0. ? 1. : 1. - smoothstep(0., 1., best);
  if (cov > 0.){
    float tt = hitT > 0. ? hitT : bestT;
    vec3 p = ro + rd * tt;
    float e = .07 + tt * .003;
    vec3 n = normalize(vec3(H(p.xz - vec2(e, 0.)) - H(p.xz + vec2(e, 0.)), 2. * e, H(p.xz - vec2(0., e)) - H(p.xz + vec2(0., e))));
    float ndl = dot(n, sunDir);
    float dif = clamp(ndl * .55 + .5, 0., 1.);
    vec3 lit = vec3(.97, .89, .88), shade = vec3(.47, .39, .55), sky = vec3(.62, .55, .70);
    vec3 c = mix(shade, lit, dif);
    c += sky * .12 * clamp(n.y, 0., 1.);
    // Valleys sit in shadow, crests catch the light.
    float ao = smoothstep(-.1, 2.6, p.y);
    c *= .72 + .32 * ao;
    // Light scattering through thin, sun-facing edges.
    float rim = pow(1. - clamp(dot(n, -rd), 0., 1.), 3.);
    c += rim * vec3(1., .84, .74) * (.12 + .25 * pow(s, 3.));
    c += vec3(1., .82, .68) * pow(s, 6.) * .22 * ao;
    c += vec3(1., .8, .72) * (1. - cov) * .1;
    float fog = 1. - exp(-tt * .042);
    c = mix(c, mix(haze, hor, .35), fog);
    col = mix(col, c, cov);
  }
  col = mix(col, vec3(.35, .28, .43), smoothstep(-.12, -.62, rd.y) * .75 * (1. - dv));
  col = mix(col, vec3(.92, .86, .85), smoothstep(.55, 1., uDive));
  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.) - .5) * .008;
  gl_FragColor = vec4(col, 1.);
}`;

  let draw = null;
  if (gl) {
    try {
      const sh = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const uRes = gl.getUniformLocation(prog, "uRes"), uTime = gl.getUniformLocation(prog, "uTime"), uDive = gl.getUniformLocation(prog, "uDive");
      draw = (time, dive) => {
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, time);
        gl.uniform1f(uDive, dive);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
    } catch (err) {
      console.warn("Intro shader unavailable", err);
    }
  }
  if (!draw) canvas.style.display = "none";

  // Render near native resolution within a pixel budget, then adapt to the GPU.
  let scale = Math.min(devicePixelRatio || 1, Math.sqrt(1.6e6 / (innerWidth * innerHeight)));
  function resize() {
    canvas.width = Math.max(2, Math.round(innerWidth * scale));
    canvas.height = Math.max(2, Math.round(innerHeight * scale));
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  addEventListener("resize", resize);

  let dive = 0, diveStart = 0;
  const t0 = performance.now();
  let last = t0, acc = 0, frames = 0;
  function loop(now) {
    if (!running) return;
    const dt = now - last; last = now;
    if (diveStart) {
      const k = Math.min(1, (now - diveStart) / 1700);
      dive = k * k * (3 - 2 * k);
      white.style.opacity = Scene.smooth(.55, 1, k).toFixed(3);
      if (video) video.style.transform = `scale(${(1 + dive * .9).toFixed(3)}) translateY(${(dive * 6).toFixed(2)}%)`;
      if (k >= 1) finish(false);
    }
    if (video) {
      canvas.style.display = "none";
    } else if (draw) {
      draw((now - t0) / 1000, dive);
      // Every 30 frames, step resolution down if frames are slow.
      acc += dt; frames++;
      if (frames === 30) {
        if (acc / frames > 24 && scale > .45) { scale = Math.max(.45, scale * .82); resize(); }
        acc = 0; frames = 0;
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Loader bar: wait for fonts and a minimum beat, then invite a click.
  let ready = false, queued = false;
  const minBeat = new Promise((r) => setTimeout(r, 1900));
  const t1 = performance.now();
  (function fill() {
    if (ready) return;
    bar.style.transform = `scaleX(${Math.min(.92, (performance.now() - t1) / 2100)})`;
    requestAnimationFrame(fill);
  })();
  Promise.all([document.fonts ? document.fonts.ready : Promise.resolve(), minBeat]).then(() => {
    ready = true;
    bar.style.transition = "transform .4s ease";
    bar.style.transform = "scaleX(1)";
    setTimeout(() => {
      intro.classList.add("is-ready");
      status.textContent = "CLICK TO CONTINUE";
      if (queued) startDive();
    }, 350);
  });

  function startDive() {
    if (diveStart || finished) return;
    if (!ready) { queued = true; return; }
    if (!draw && !video) { finish(true); return; }
    diveStart = performance.now();
    intro.querySelector(".intro-loader").style.opacity = "0";
  }
  intro.addEventListener("click", (e) => { if (!skip.contains(e.target)) startDive(); });
  addEventListener("keydown", (e) => { if (!finished && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); startDive(); } });
  addEventListener("wheel", () => startDive(), { passive: true });
  addEventListener("touchmove", () => startDive(), { passive: true });
  skip.addEventListener("click", (e) => { e.stopPropagation(); finish(true); });
})();
