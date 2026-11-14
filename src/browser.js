// The studio laptop's browser: a real, working browser window laid over the laptop screen.
// It only opens the sites listed in data.js; GitHub cannot be embedded, so that tab is
// rendered from GitHub's public API instead.
import { sites, projects } from './data.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let el, current = 0, onCloseCb = null, repoCache = null;

export function placeBrowser(r) {
  if (!el) return;
  // keep the window readable even when the laptop screen is small on a phone
  const w = Math.max(r.width, Math.min(innerWidth - 16, 340)), h = Math.max(r.height, 240);
  Object.assign(el.style, { left: Math.max(8, r.left - (w - r.width) / 2) + 'px', top: Math.max(8, r.top - (h - r.height) / 2) + 'px', width: w + 'px', height: h + 'px' });
}
export function closeBrowser() { if (el) { el.remove(); el = null; } }

export function openBrowser(rect, onClose) {
  closeBrowser(); onCloseCb = onClose;
  el = document.createElement('div'); el.id = 'browser';
  el.innerHTML = `<div class="bar"><span class="dots"><i data-close title="Close the laptop"></i><i></i><i></i></span>
      <div class="addr"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><span id="bAddr"></span></div>
      <a id="bOpen" target="_blank" rel="noopener" title="Open in a new tab">↗</a><button data-close class="shut">Close laptop</button></div>
    <div class="marks">${sites.map((s, i) => `<button data-i="${i}">${esc(s.name)}</button>`).join('')}</div>
    <div class="page" id="bPage"></div>`;
  document.body.appendChild(el); placeBrowser(rect);
  el.querySelectorAll('[data-close]').forEach(b => b.onclick = () => onCloseCb && onCloseCb());
  el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => go(+b.dataset.i));
  go(current);
}

function go(i) {
  current = i; const s = sites[i], page = el.querySelector('#bPage');
  el.querySelectorAll('[data-i]').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
  el.querySelector('#bAddr').textContent = s.url.replace(/^https?:\/\//, '').replace(/\/$/, ''); el.querySelector('#bOpen').href = s.url;
  if (s.github) return github(s, page);
  if (s.frame === false) { page.innerHTML = `<div class="note"><h4>${esc(s.name)}</h4><p>${esc(s.note)}</p><a class="btn" href="${esc(s.url)}" target="_blank" rel="noopener">Open ${esc(s.url.replace(/^https?:\/\//, ''))} ↗</a></div>`; return; }
  page.innerHTML = `<div class="loading">Loading ${esc(s.name)}…</div><iframe title="${esc(s.name)}" src="${esc(s.url)}" loading="eager" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe>`;
  const f = page.querySelector('iframe'); f.onload = () => page.querySelector('.loading')?.remove();
}

async function github(s, page) {
  page.innerHTML = `<div class="loading">Fetching repositories…</div>`;
  if (!repoCache) {
    try {
      const r = await fetch(`https://api.github.com/users/${s.github}/repos?per_page=100&sort=updated`);
      if (!r.ok) throw new Error(r.status);
      repoCache = (await r.json()).filter(x => !x.fork).map(x => ({ name: x.name, desc: x.description, lang: x.language, url: x.html_url, home: x.homepage, stars: x.stargazers_count, when: x.pushed_at }));
    } catch {
      // offline or rate-limited: fall back to the projects we already know are public
      repoCache = projects.filter(p => p.link).map(p => ({ name: p.link.split('/').pop(), desc: p.line, lang: p.stack[0], url: p.link }));
    }
  }
  if (!el || sites[current] !== s) return;
  page.innerHTML = `<div class="gh"><header><b>${esc(s.github)}</b><span>${repoCache.length} public repositories</span><a href="${esc(s.url)}" target="_blank" rel="noopener">View on GitHub ↗</a></header>
    <div class="repos">${repoCache.map(r => `<a class="repo" href="${esc(r.url)}" target="_blank" rel="noopener"><b>${esc(r.name)}</b><p>${esc(r.desc || 'No description yet.')}</p><span>${r.lang ? `<i></i>${esc(r.lang)}` : ''}${r.home ? ' · live site' : ''}${r.when ? ' · updated ' + new Date(r.when).toLocaleDateString([], { month: 'short', year: 'numeric' }) : ''}</span></a>`).join('')}</div></div>`;
}
