// "Skip the 3D": the same content as an ordinary, readable page.
import { profile, riven, projects, experience, awards, offClock, languages, contact } from './data.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function renderPlain(el, onClose) {
  el.innerHTML = `<div class="wrap">
    <button class="chip close" id="plainClose">Back to the loft</button>
    <img src="/og.jpg" alt="Johnbosco J" style="width:100%;max-height:300px;object-fit:cover;border-radius:18px;margin-top:20px" />
    <h1>${esc(profile.name)}</h1>
    <p>${esc(profile.tagline)}</p>
    <p class="meta">${profile.roles.map(esc).join(' · ')} · ${esc(profile.location)}</p>
    <p><a href="/JohnboscoJ-Resume.pdf" download>Download the résumé (PDF)</a></p>
    <h2>About</h2>
    ${profile.about.map(p => `<p>${esc(p)}</p>`).join('')}
    <div class="tags">${profile.skills.map(s => `<span>${esc(s)}</span>`).join('')}</div>
    <h2>Riven</h2>
    <p>${esc(riven.sub)} ${esc(riven.body)}</p>
    <ul>${riven.products.map(p => `<li><b>${esc(p.name)}</b>: ${esc(p.line)}</li>`).join('')}</ul>
    <h2>Projects</h2>
    ${projects.map(p => `<article><h3>${esc(p.name)}</h3><div class="meta">${esc(p.tag)} · ${esc(p.when)} · ${esc(p.role)}</div><p>${esc(p.body)}</p>
      <div class="tags">${p.stack.map(s => `<span>${esc(s)}</span>`).join('')}</div>${p.link ? `<p><a href="${esc(p.link)}" target="_blank" rel="noopener">View on GitHub</a></p>` : ''}</article>`).join('')}
    <h2>Experience</h2>
    ${experience.map(e => `<article><h3>${esc(e.title)}, ${esc(e.org)}</h3><div class="meta">${esc(e.when)} · ${esc(e.where)}</div><ul>${e.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></article>`).join('')}
    <h2>Honors & awards</h2>
    ${awards.map(a => `<article><h3>${esc(a.place)} · ${esc(a.title)}</h3><div class="meta">${esc(a.by)} · ${esc(a.when)}</div><p>${esc(a.body)}</p></article>`).join('')}
    <h2>Off the clock</h2>
    ${offClock.map(o => `<article><h3>${esc(o.title)}</h3><p>${esc(o.body)}</p></article>`).join('')}
    <p class="meta">Languages: ${languages.map(l => `${esc(l.name)} (${esc(l.level)})`).join(', ')}</p>
    <h2>Contact</h2>
    <ul>${contact.map(c => `<li>${esc(c.label)}: <a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.value)}</a></li>`).join('')}</ul>
    <h2>Credits</h2>
    <p class="meta">Car: based on <a href="https://sketchfab.com/3d-models/2022-suzuki-ertiga-4f14afac3ac44ec4a2fb153e18452f8b" target="_blank" rel="noopener">2022 Suzuki Ertiga</a> by <a href="https://sketchfab.com/BHP3D" target="_blank" rel="noopener">BHP3D</a>, licensed under <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC-BY-4.0</a>. TV interface modelled on Riven TV.</p>
  </div>`;
  el.querySelector('#plainClose').onclick = onClose;
  el.scrollTop = 0;
}
