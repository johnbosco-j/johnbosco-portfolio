// The house: everything the visitor can walk up to and use.
import * as THREE from 'three';
import { awards, contact, projects, offClock, riven, languages } from './data.js';
import { audio } from './audio.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function wrapText(g, str, x, y, maxW, lh) {
  let line = ''; for (const w of str.split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; } else line = t; }
  if (line) g.fillText(line, x, y); return y + lh;
}
const label = (text, w, h, px, color = '#d8dade', bg = null) => canvasTex(w, h, g => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } g.fillStyle = color; g.font = `600 ${px}px 'Geist', 'Inter', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 1); });

export function createHouse({ scene, showCard, guide, say, tween, models, drop, cast, openLaptop, openPiano }) {
  const clickables = [], updaters = [];
  const add = (object, hint, onClick) => { object.traverse(o => { o.userData.click = { label: hint, onClick }; }); clickables.push(object); };
  const shadow = g => g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const hopSpin = obj => { const y0 = obj.position.y, r0 = obj.rotation.y; tween(0.7, k => { obj.position.y = y0 + Math.sin(k * Math.PI) * 0.05; obj.rotation.y = r0 + k * Math.PI * 2; }); };
  const deskY = drop(0.62, -3.7, 4.4) ?? 3.72;

  // ---------- trophy shelf (niches in the stair wall) ----------
  {
    const metals = { '1st': 0xf2c14e, '2nd': 0xcfd4da, 'Top 7': 0xc98a52, '5th': 0xc98a52 };
    // kept well inside each niche so nothing hides behind the stair stringer
    const spots = [[1.39, -3.24], [1.39, -3.46], [1.39, -3.68], [0.67, -2.98], [0.67, -3.24], [0.67, -3.5], [0.67, -3.76]];
    awards.forEach((a, i) => {
      const g = new THREE.Group(), m = std(metals[a.place], { metalness: 1, roughness: 0.25, emissive: metals[a.place], emissiveIntensity: 0.12 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.022, 0.075), std(0x2a1c14, { roughness: 0.4 })); base.position.y = 0.011; g.add(base);
      if (a.place === '1st' || a.place === '2nd') {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.016, 0.06, 12), m); stem.position.y = 0.052; g.add(stem);
        const P = [[0.012, 0], [0.03, 0.02], [0.044, 0.06], [0.05, 0.11], [0.046, 0.112], [0.04, 0.065], [0.026, 0.028], [0, 0.02]].map(p => new THREE.Vector2(p[0], p[1]));
        const cup = new THREE.Mesh(new THREE.LatheGeometry(P, 24), m); cup.material.side = THREE.DoubleSide; cup.position.y = 0.08; g.add(cup);
        for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 8, 16, Math.PI), m); h.position.set(0, 0.145, 0.05 * s); h.rotation.set(0, Math.PI / 2, -Math.PI / 2 * s); g.add(h); }
      } else {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.07, 8), m); post.position.y = 0.055; g.add(post);
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.008, 28), m); disc.rotation.z = Math.PI / 2; disc.position.y = 0.13; g.add(disc);
      }
      const y = drop(2.14, spots[i][1], spots[i][0] + 0.2, 0.45) ?? spots[i][0];
      g.position.set(2.14, y, spots[i][1]); g.scale.setScalar(1.2); shadow(g); scene.add(g);
      add(g, a.title, () => {
        hopSpin(g); audio.chime(); guide().play(a.place === '1st' ? 'tip' : 'cheer', 1.6);
        showCard({ eyebrow: `${a.place === '1st' ? 'First prize' : a.place + ' place'} · ${a.when}`, title: a.title, sub: a.by, body: a.body });
      });
    });
    const glow = new THREE.PointLight(0xffd9a0, 0.3, 2.4, 2); glow.position.set(1.1, 1.35, -3.4); scene.add(glow);
  }

  // ---------- fridge door ----------
  {
    const Z = -5.488, papers = ['#ffe38a', '#b8f0c8', '#ffc2b8', '#bfe0ff'];
    const pin = (m, color = 0xd9483b, y = 0.098) => { const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.01, 16), std(color, { roughness: 0.3 })); mag.rotation.x = Math.PI / 2; mag.position.set(0, y, 0.006); m.add(mag); };
    const paper = (x, y, w, h, rot, tex) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })); m.position.set(x, y, Z); m.rotation.z = rot; scene.add(m); return m; };
    const nudge = m => { tween(0.35, k => { m.position.z = Z + Math.sin(k * Math.PI) * 0.03; }); audio.click(); };
    // contact notes
    contact.forEach((c, i) => {
      const m = paper(0.19 + (i % 2) * 0.25, 1.72 - Math.floor(i / 2) * 0.25, 0.21, 0.21, (i % 2 ? -1 : 1) * 0.05, canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = papers[i]; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, h - 26, w, 26);
        g.fillStyle = '#3a3122'; g.font = "700 44px 'Space Grotesk', sans-serif"; g.fillText(c.label, 22, 96);
        g.font = "600 25px 'Inter', sans-serif"; wrapText(g, c.value.replace('linkedin.com/', 'linkedin.com/ ').replace('@', ' @').replace('github.com/', 'github.com/ '), 22, 142, 216, 32);
        g.font = "500 20px 'Inter', sans-serif"; g.fillStyle = 'rgba(58,49,34,0.6)'; g.fillText('click to open', 22, 222);
      }));
      pin(m, 0xd9483b, 0.09);
      add(m, c.label, () => { nudge(m); guide().play('tip', 1.6); showCard({ eyebrow: 'Say howdy', title: c.label, body: 'Open to work · on-site or hybrid, Chennai.', link: c.url, linkLabel: c.value }); });
    });
    // Sous: ask what's for dinner
    const sous = projects.find(p => p.name === 'Sous'), dinners = ['Lemon rice and potato fry', 'Dosa with tomato chutney', 'Kerala-style egg curry and appam', 'Paneer butter masala and jeera rice', 'Vegetable stew with idiyappam', 'Curd rice, because it was a long day'];
    let di = -1; const sousC = document.createElement('canvas'); sousC.width = sousC.height = 256; const sousT = new THREE.CanvasTexture(sousC); sousT.colorSpace = THREE.SRGBColorSpace;
    const drawSous = () => { const g = sousC.getContext('2d'); g.fillStyle = '#fff6e6'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#a3452c'; g.font = "600 21px 'Space Grotesk', sans-serif"; g.fillText(di < 0 ? 'WHAT\'S FOR DINNER?' : 'SOUS SUGGESTS', 20, 66); g.fillStyle = '#3a3122'; g.font = "700 34px 'Space Grotesk', sans-serif"; wrapText(g, di < 0 ? 'Ask Sous' : dinners[di], 20, 110, 216, 38); g.font = "500 19px 'Inter', sans-serif"; g.fillStyle = 'rgba(58,49,34,0.6)'; g.fillText(di < 0 ? 'click to ask' : 'click for another idea', 20, 232); sousT.needsUpdate = true; };
    drawSous(); const sm = paper(0.19, 1.2, 0.21, 0.21, 0.04, sousT); pin(sm, 0x2f7d5b, 0.09);
    add(sm, 'Ask Sous what\'s for dinner', () => { nudge(sm); di = (di + 1) % dinners.length; drawSous(); audio.select(); showCard({ eyebrow: `${sous.tag} · ${sous.when}`, title: sous.name, sub: `Tonight: ${dinners[di]}.`, body: sous.body + ' (The suggestions on this card are a playful stand-in, not the real agent.)', tags: sous.stack, link: sous.link, linkLabel: 'Open on GitHub' }); });
    // "now building" checklist: tick things off
    const todo = [['Riven TV', true], ['WallLoop', true], ['Nijam', true], ['Clareo', false], ['This portfolio', false]];
    const todoC = document.createElement('canvas'); todoC.width = 256; todoC.height = 320; const todoT = new THREE.CanvasTexture(todoC); todoT.colorSpace = THREE.SRGBColorSpace;
    const drawTodo = () => { const g = todoC.getContext('2d'); g.fillStyle = '#f7f7f2'; g.fillRect(0, 0, 256, 320); g.fillStyle = '#1d4ed8'; g.font = "700 26px 'Space Grotesk', sans-serif"; g.fillText('Shipping list', 20, 48); g.strokeStyle = '#cfd4dc'; g.lineWidth = 1; g.beginPath(); g.moveTo(20, 62); g.lineTo(236, 62); g.stroke(); todo.forEach(([n, d], i) => { const y = 100 + i * 44; g.strokeStyle = '#3a3122'; g.lineWidth = 3; g.strokeRect(22, y - 20, 24, 24); if (d) { g.strokeStyle = '#16a34a'; g.lineWidth = 5; g.beginPath(); g.moveTo(26, y - 8); g.lineTo(33, y); g.lineTo(46, y - 20); g.stroke(); } g.fillStyle = d ? '#8a8f98' : '#22262d'; g.font = "600 24px 'Inter', sans-serif"; g.fillText(n, 60, y); if (d) { g.strokeStyle = '#8a8f98'; g.lineWidth = 2; g.beginPath(); g.moveTo(58, y - 8); g.lineTo(62 + g.measureText(n).width, y - 8); g.stroke(); } }); todoT.needsUpdate = true; };
    drawTodo(); const tm = paper(0.45, 1.16, 0.22, 0.275, -0.03, todoT); pin(tm, 0x3e63dd, 0.122);
    add(tm, 'Tick something off', () => { nudge(tm); const i = todo.findIndex(t => !t[1]); if (i >= 0) { todo[i][1] = true; audio.select(); guide().play('cheer', 1.2); } else { todo.forEach((t, k) => { if (k > 2) t[1] = false; }); audio.click(); } drawTodo(); });
    // language magnets
    const hello = { Tamil: 'Vanakkam', Malayalam: 'Namaskaram', English: 'Hello', Kannada: 'Namaskara' };
    languages.forEach((l, i) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 28), [std(0x22262d), new THREE.MeshStandardMaterial({ map: label(l.name, 128, 128, 26, '#fff', ['#b4451f', '#1f6f5b', '#27408b', '#7a3e9d'][i]), roughness: 0.4 }), std(0x22262d)]);
      m.rotation.x = Math.PI / 2; m.position.set(0.13 + i * 0.125, 1.95, Z + 0.004); scene.add(m);
      add(m, `Say hello in ${l.name}`, () => { tween(0.4, k => { m.rotation.y = k * Math.PI * 2; }); audio.select(); guide().play('wave', 1.4); say(`${hello[l.name]}! That's hello in ${l.name}. He speaks it at ${l.level.toLowerCase()} level.`, { auto: true, hold: 3 }); });
    });
  }

  // ---------- studio desk: the MacBook and the 8086 trainer kit ----------
  const laptop = {};
  {
    const mac = models.macbook; mac.position.set(0.6, deskY, -3.78); mac.rotation.y = Math.PI / 2; shadow(mac); scene.add(mac);
    const alu = std(0x9a9ca1, { metalness: 0.9, roughness: 0.36 }), black = std(0x0b0b0d, { roughness: 0.55 }), glassM = std(0x050506, { roughness: 0.12 });
    mac.traverse(o => { if (!o.isMesh) return; const n = o.material?.name || ''; o.material = n === 'Material.003' || n === 'Material.010' ? alu : /00[67]$/.test(n) ? glassM : black; });
    const scrT = canvasTex(1280, 832, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2b1055'); gr.addColorStop(0.5, '#7597de'); gr.addColorStop(1, '#f4a28c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(20,20,24,0.6)'; g.fillRect(0, 0, w, 34); g.fillStyle = '#fff'; g.font = "600 18px 'Geist', sans-serif"; g.fillText('Riven Browser   File   View   History', 20, 23);
      g.fillStyle = 'rgba(18,18,22,0.92)'; g.beginPath(); g.roundRect(150, 90, 980, 610, 18); g.fill(); g.fillStyle = '#2a2a31'; g.beginPath(); g.roundRect(150, 90, 980, 54, [18, 18, 0, 0]); g.fill();
      ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(180 + i * 24, 117, 8, 0, 7); g.fill(); });
      g.fillStyle = '#17171b'; g.beginPath(); g.roundRect(290, 102, 700, 30, 15); g.fill(); g.fillStyle = '#9aa0aa'; g.font = "400 16px 'Geist', sans-serif"; g.fillText('johnbosco.vercel.app', 310, 123);
      g.fillStyle = '#f5f5f7'; g.font = "700 76px 'Bricolage Grotesque', sans-serif"; g.fillText('Johnbosco J', 210, 330); g.fillStyle = '#b9bcc4'; g.font = "400 30px 'Geist', sans-serif"; g.fillText('Click to sit down and browse his live sites', 214, 386);
      g.fillStyle = '#e8c98a'; g.beginPath(); g.roundRect(214, 430, 250, 62, 31); g.fill(); g.fillStyle = '#1a1309'; g.font = "600 24px 'Geist', sans-serif"; g.fillText('Open the browser', 244, 469);
    });
    const tilt = 0.375, scr = new THREE.Mesh(new THREE.PlaneGeometry(0.336, 0.218), new THREE.MeshBasicMaterial({ map: scrT, toneMapped: false, color: 0xb8b8b8 }));
    scr.position.set(0, 0.128, -0.158); scr.rotation.x = -tilt; mac.add(scr); laptop.screen = scr; laptop.mac = mac;
    const glow = new THREE.PointLight(0xcfd8ff, 0.18, 1.1, 2); glow.position.set(0.82, deskY + 0.2, -3.78); scene.add(glow);
    add(mac, 'Use the laptop', () => { audio.select(); openLaptop(laptop); });

    const kit = new THREE.Group(); const ledMats = [];
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.008, 0.19), std(0x1f6b4a, { roughness: 0.5 })); pcb.position.y = 0.012; kit.add(pcb);
    for (const [x, z] of [[-0.115, -0.08], [0.115, -0.08], [-0.115, 0.08], [0.115, 0.08]]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.012, 8), std(0x999999)); f.position.set(x, 0.004, z); kit.add(f); }
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.03), std(0x121214, { roughness: 0.35 })); chip.position.set(-0.05, 0.022, -0.02); kit.add(chip);
    const chipL = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.02), new THREE.MeshBasicMaterial({ map: label('8086', 128, 28, 20, '#cfd3da'), transparent: true })); chipL.rotation.x = -Math.PI / 2; chipL.position.set(-0.05, 0.0285, -0.02); kit.add(chipL);
    const chip2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.024), std(0x121214)); chip2.position.set(-0.075, 0.021, 0.03); kit.add(chip2);
    for (let i = 0; i < 6; i++) { const m = new THREE.MeshStandardMaterial({ color: 0x2a0806, emissive: 0xff2a1a, emissiveIntensity: 1.6 }); ledMats.push(m); const d = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.03), m); d.position.set(-0.105 + i * 0.025, 0.022, -0.068); kit.add(d); }
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.01, 0.017), std(c === 4 ? 0xd9483b : 0xe9e4d8, { roughness: 0.4 })); k.position.set(0.025 + c * 0.021, 0.021, -0.04 + r * 0.021); kit.add(k); }
    kit.position.set(0.64, deskY, -3.3); kit.rotation.y = Math.PI / 2 - 0.25; shadow(kit); scene.add(kit);
    const p8 = projects.find(p => p.name === '8086 Trainer'); let flashUntil = 0;
    add(kit, 'Run the 8086 trainer kit', () => {
      flashUntil = performance.now() + 1600; if (audio.ok()) for (let i = 0; i < 6; i++) audio.tone({ freq: 500 + i * 120, dur: 0.05, type: 'square', vol: 0.03, at: i * 0.07 });
      showCard({ eyebrow: `${p8.tag} · ${p8.when}`, title: '8086 Trainer Emulator', sub: 'Software engineers should get their hands on hardware at least once.', body: p8.body, tags: p8.stack, link: p8.link, linkLabel: 'Open on GitHub' });
    });
    updaters.push((dt, t) => { const fl = performance.now() < flashUntil; ledMats.forEach((m, i) => { m.emissiveIntensity = fl ? (Math.sin(t * 30 + i * 1.7) > 0 ? 3 : 0.1) : 1.2 + Math.sin(t * 2 + i) * 0.3; }); });
  }

  // ---------- arranger keyboard, modelled on a 61-key PSR-SX900 ----------
  const piano = { keys: [], white: [], voice: 'piano', octave: 0, play: null };
  {
    const g = new THREE.Group(), body = std(0x1b1c1f, { roughness: 0.42, metalness: 0.15 }), panelM = std(0x232428, { roughness: 0.5 }), btn = std(0x3a3c42, { roughness: 0.45 });
    const WKW = 0.0232, NW = 36, KEYW = NW * WKW, LEN = 1.0, x0 = -KEYW / 2 + 0.03;
    const base = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.062, 0.42), body); base.position.set(0, 0.031, 0); g.add(base);
    const riser = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.07, 0.25), body); riser.position.set(0, 0.075, -0.085); g.add(riser);
    const panel = new THREE.Group(); panel.position.set(0, 0.112, -0.085); panel.rotation.x = 0.16; g.add(panel);
    panel.add(new THREE.Mesh(new THREE.BoxGeometry(LEN - 0.01, 0.006, 0.245), panelM));
    for (const s of [-1, 1]) { const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.1, 0.42), std(0x0f0f11, { roughness: 0.3 })); cheek.position.set(s * (LEN / 2 + 0.008), 0.05, 0); g.add(cheek); }
    const felt = new THREE.Mesh(new THREE.BoxGeometry(KEYW + 0.012, 0.004, 0.012), std(0x7a1220)); felt.position.set(x0 + KEYW / 2 - WKW / 2, 0.064, 0.052); g.add(felt);
    const P = (mesh, x, z, y = 0.004) => { mesh.position.set(x, y, z); panel.add(mesh); return mesh; };
    const flat = (tex, w, h, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })); m.rotation.x = -Math.PI / 2; return P(m, x, z, 0.0036); };
    // speakers
    const grill = canvasTex(256, 256, (c, w) => { c.fillStyle = '#0c0c0e'; c.fillRect(0, 0, w, w); c.fillStyle = '#2b2d31'; for (let y = 10; y < w; y += 14) for (let x = 10 + ((y / 14) % 2) * 7; x < w; x += 14) { if (Math.hypot(x - 128, y - 128) < 118) { c.beginPath(); c.arc(x, y, 3.2, 0, 7); c.fill(); } } });
    for (const s of [-1, 1]) {
      P(new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.006, 40), std(0x0c0c0e, { roughness: 0.8 })), s * 0.41, -0.035);
      const gr = new THREE.Mesh(new THREE.CircleGeometry(0.055, 40), new THREE.MeshStandardMaterial({ map: grill, roughness: 0.7 })); gr.rotation.x = -Math.PI / 2; P(gr, s * 0.41, -0.035, 0.0072);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.003, 8, 40), std(0x55585f, { metalness: 0.8, roughness: 0.3 })); ring.rotation.x = Math.PI / 2; P(ring, s * 0.41, -0.035, 0.007);
    }
    // touch screen
    const lcdC = document.createElement('canvas'); lcdC.width = 512; lcdC.height = 300; const lcdT = new THREE.CanvasTexture(lcdC); lcdT.colorSpace = THREE.SRGBColorSpace;
    P(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.008, 0.125), std(0x08080a, { roughness: 0.2 })), 0.0, -0.045, 0.006);
    const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.184, 0.108), new THREE.MeshBasicMaterial({ map: lcdT, toneMapped: false, color: 0xdddddd })); lcd.rotation.x = -Math.PI / 2; P(lcd, 0, -0.045, 0.0105);
    const levels = new Array(24).fill(0); let lastNote = '—';
    const VOICES = [['piano', 'Concert Grand', 'PIANO'], ['epiano', 'Suitcase E.Piano', 'E.PIANO'], ['organ', 'Jazz Organ', 'ORGAN'], ['strings', 'Studio Strings', 'STRINGS']];
    const drawLcd = () => {
      const c = lcdC.getContext('2d'), v = VOICES.find(v => v[0] === piano.voice);
      const gr = c.createLinearGradient(0, 0, 0, 300); gr.addColorStop(0, '#0d1b3a'); gr.addColorStop(1, '#060a16'); c.fillStyle = gr; c.fillRect(0, 0, 512, 300);
      c.fillStyle = '#12254f'; c.fillRect(0, 0, 512, 38); c.fillStyle = '#9fc0ff'; c.font = "600 19px 'Geist', sans-serif"; c.textAlign = 'left'; c.fillText('PSR-SX900', 14, 26); c.textAlign = 'right'; c.fillText(`OCTAVE ${piano.octave >= 0 ? '+' : ''}${piano.octave}   TEMPO 92`, 498, 26);
      c.textAlign = 'left'; c.fillStyle = '#6f8fd6'; c.font = "600 15px 'Geist', sans-serif"; c.fillText('MAIN · RIGHT 1', 16, 70);
      c.fillStyle = '#ffffff'; c.font = "700 40px 'Bricolage Grotesque', 'Geist', sans-serif"; c.fillText(v[1], 14, 112);
      c.fillStyle = '#ffd166'; c.font = "700 54px 'Geist', sans-serif"; c.textAlign = 'right'; c.fillText(lastNote, 498, 116); c.textAlign = 'left';
      levels.forEach((l, i) => { const h = 8 + l * 120; c.fillStyle = `hsl(${200 - l * 150} 90% ${45 + l * 20}%)`; c.fillRect(16 + i * 20, 280 - h, 14, h); });
      lcdT.needsUpdate = true;
    };
    drawLcd();
    // voice buttons (these four work), data dial, sliders, knobs, style and registration rows
    const voiceBtns = [];
    VOICES.forEach((v, i) => {
      const m = new THREE.MeshStandardMaterial({ color: 0x3a3c42, roughness: 0.4, emissive: 0xffa53a, emissiveIntensity: i === 0 ? 1.4 : 0 });
      const b = P(new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.008, 0.02), m), 0.155 + (i % 2) * 0.044, -0.085 + Math.floor(i / 2) * 0.034, 0.007); voiceBtns.push(m);
      flat(label(v[2], 128, 32, 20), 0.036, 0.009, b.position.x, b.position.z - 0.0165);
      add(b, `${v[1]} voice`, () => { piano.voice = v[0]; voiceBtns.forEach((mm, k) => { mm.emissiveIntensity = k === i ? 1.4 : 0; }); audio.click(); drawLcd(); setTimeout(() => piano.play(piano.bySemi.get(24)), 90); });
    });
    for (let r = 0; r < 2; r++) for (let c2 = 0; c2 < 4; c2++) P(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.006, 0.013), btn), 0.262 + c2 * 0.026, -0.085 + r * 0.03, 0.006);
    const dial = P(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.014, 40), std(0x2c2e33, { metalness: 0.5, roughness: 0.3 })), 0.3, 0.025, 0.01);
    add(dial, 'Data dial: change octave', () => { piano.octave = piano.octave >= 2 ? -2 : piano.octave + 1; audio.click(); tween(0.25, k => { dial.rotation.y = k * 1.2; }); drawLcd(); });
    for (let i = 0; i < 8; i++) { const m = new THREE.MeshStandardMaterial({ color: 0x3a3c42, emissive: 0xff2a2a, emissiveIntensity: i === 0 ? 1.2 : 0.05 }); P(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.006, 0.012), m), -0.086 + i * 0.0245, 0.062, 0.006); }
    flat(label('REGISTRATION MEMORY', 256, 24, 16, '#8b9099'), 0.11, 0.008, 0.0, 0.082);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { const m = new THREE.MeshStandardMaterial({ color: 0x3a3c42, emissive: r ? 0x2aff7a : 0xffa53a, emissiveIntensity: (r === 0 && i === 2) || (r === 1 && i === 0) ? 1.1 : 0.04 }); P(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.006, 0.013), m), -0.31 + i * 0.03, 0.0 + r * 0.03, 0.006); }
    flat(label('STYLE CONTROL', 256, 24, 16, '#8b9099'), 0.1, 0.008, -0.235, -0.02);
    for (let i = 0; i < 2; i++) { P(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.002, 0.07), std(0x08080a)), -0.31 + i * 0.03, -0.07, 0.004); P(new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.012, 0.01), std(0xcfd2d8, { metalness: 0.6, roughness: 0.3 })), -0.31 + i * 0.03, -0.085 + i * 0.025, 0.009); }
    for (let i = 0; i < 2; i++) P(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.016, 20), std(0x2c2e33, { metalness: 0.4, roughness: 0.35 })), -0.235 + i * 0.034, -0.075, 0.011);
    flat(label('YAMAHA', 256, 40, 30, '#e9eaee'), 0.07, 0.011, -0.4, 0.085); flat(label('PSR-SX900', 256, 40, 26, '#c8a45a'), 0.07, 0.011, 0.4, 0.085);
    // joystick left of the keys
    const joy = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.03, 16), std(0x0c0c0e)); joy.position.set(-LEN / 2 + 0.035, 0.078, 0.11); g.add(joy);
    const joyCap = new THREE.Mesh(new THREE.SphereGeometry(0.013, 16, 12), std(0x0c0c0e, { roughness: 0.3 })); joyCap.position.set(-LEN / 2 + 0.035, 0.096, 0.11); g.add(joyCap);
    // 61 keys, C2 to C7
    const names = ['C', 'D', 'E', 'F', 'G', 'A', 'B'], semis = [0, 2, 4, 5, 7, 9, 11];
    const mk = (mesh, semi, name) => { const k = { mesh, semi, name, y: mesh.position.y, at: -9 }; piano.keys.push(k); g.add(mesh); add(mesh, name, () => piano.play(k)); return k; };
    for (let i = 0; i < NW; i++) {
      const oct = Math.floor(i / 7), m = new THREE.Mesh(new THREE.BoxGeometry(WKW - 0.0012, 0.014, 0.145), std(0xf6f4ee, { roughness: 0.28, emissive: 0x000000 })); m.position.set(x0 + i * WKW, 0.069, 0.13);
      piano.white.push(mk(m, oct * 12 + semis[i % 7], names[i % 7] + (oct + 2)));
      if ([0, 1, 3, 4, 5].includes(i % 7) && i < NW - 1) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.0125, 0.012, 0.092), std(0x0c0c0e, { roughness: 0.3, emissive: 0x000000 })); b.position.set(x0 + i * WKW + WKW / 2, 0.081, 0.104); mk(b, oct * 12 + semis[i % 7] + 1, names[i % 7] + '♯' + (oct + 2)); }
    }
    g.position.set(0.61, deskY, -4.56); g.rotation.y = Math.PI / 2; shadow(g); scene.add(g);
    piano.bySemi = new Map(piano.keys.map(k => [k.semi, k])); piano.group = g; piano.redraw = () => drawLcd();
    add(riser, 'Sit down and play (E)', () => openPiano());
    piano.play = k => {
      if (!k) return; k.at = performance.now() / 1000; lastNote = k.name;
      audio.note(65.406 * Math.pow(2, k.semi / 12), piano.voice);
      k.mesh.material.emissive.setHex(0xff8a3a); levels[Math.min(23, Math.floor(k.semi / 61 * 24))] = 1; guide().play('cheer', 0.7); drawLcd();
    };
    let dirty = false;
    updaters.push(dt => {
      const now = performance.now() / 1000; let live = false;
      for (const k of piano.keys) { const d = now - k.at; k.mesh.position.y = k.y - (d < 0.18 ? Math.sin((d / 0.18) * Math.PI) * 0.006 : 0); if (d > 0.3 && d < 0.6) k.mesh.material.emissive.setHex(0x000000); }
      for (let i = 0; i < 24; i++) if (levels[i] > 0.01) { levels[i] *= Math.pow(0.08, dt); live = true; } else levels[i] = 0;
      if (live || dirty) { drawLcd(); dirty = live; }
    });
  }

  // ---------- patio: the Ertiga, scaled down to a ride-on toy ----------
  // Small enough for the guide to ride on the roof and to lap the patio properly.
  const car = { on: false, driving: false, rig: new THREE.Group(), v: 0, a: Math.PI / 2, heading: 0, SCALE: 0.36, R: 0.62, held: false };
  {
    const c = models.car, floor = drop(-4.12, -3.4, 1.5) ?? 0.1; c.rotation.y = Math.PI; car.rig.add(c); car.rig.scale.setScalar(car.SCALE); shadow(c); scene.add(car.rig); car.floor = floor;
    c.traverse(o => { if (o.isMesh && /glass/i.test(o.material.name)) { o.material.transparent = true; o.material.opacity = 0.35; o.material.depthWrite = false; o.castShadow = false; } });
    // put the lamps where the model's nose and tail really are
    const bb = new THREE.Box3().setFromObject(c), sz = bb.getSize(new THREE.Vector3()); car.size = sz.clone().multiplyScalar(car.SCALE);
    c.position.y = -bb.min.y;
    const headM = new THREE.MeshBasicMaterial({ color: 0xfff3cf, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
    const tailM = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }), beams = [];
    for (const sd of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), headM); h.scale.set(1.9, 0.9, 0.35); h.position.set(sd * sz.x * 0.33, sz.y * 0.43, bb.max.z - 0.06); car.rig.add(h);
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), tailM); t.scale.set(0.9, 2.2, 0.25); t.position.set(sd * sz.x * 0.4, sz.y * 0.6, bb.min.z + 0.1); car.rig.add(t);
      const b = new THREE.SpotLight(0xfff0c8, 0, 4.5, 0.5, 0.7, 1.6); b.position.set(sd * sz.x * 0.33, sz.y * 0.43, bb.max.z); b.target.position.set(sd * sz.x * 0.33, 0, bb.max.z + 7); car.rig.add(b, b.target); beams.push(b);
    }
    const C = V(-4.12, floor, -2.95), RX = 0.6, RZ = 2.25;
    const place = () => { const p = car.rig.position; p.set(C.x + Math.cos(car.a) * RX, floor, C.z + Math.sin(car.a) * RZ); const dx = -Math.sin(car.a) * RX, dz = Math.cos(car.a) * RZ; car.heading = Math.atan2(dx, dz); car.rig.rotation.y = car.heading; };
    place();
    car.lights = on => { if (car.on === on) return; car.on = on; audio.click(); const a0 = headM.opacity; tween(0.45, k => { const v = a0 + ((on ? 1 : 0) - a0) * k; headM.opacity = v; tailM.opacity = v * 0.85; beams.forEach(b => { b.intensity = 5 * v; }); }); };
    car.start = () => { if (car.driving) return; car.lights(true); car.driving = true; audio.engine(); };
    car.stop = () => { if (!car.driving) return; car.driving = false; audio.click(); };
    // where the guide rides, and where the ride-along camera sits (just behind and above)
    // seats, in the car's own (unscaled) space. Right-hand drive: the driver is on the right.
    const SEATS = { driver: V(0, sz.y - 0.02, -0.15), driverIn: V(-0.34, 0.5, 0.42), inside: V(0.33, 1.1, 0.22), passenger: V(0, sz.y + 1.75, -4.6) };
    car.seat = (who, out = new THREE.Vector3()) => car.rig.localToWorld(out.copy(SEATS[who] || SEATS.passenger));
    car.horn = () => audio.horn();
    const d = offClock.find(o => o.title === 'Driving');
    add(c, 'The Ertiga: press Drive on the key fob', () => { car.lights(!car.on); if (car.on) audio.horn(); showCard({ eyebrow: 'Off the clock', title: d.title, sub: 'A pint-sized Suzuki Ertiga', body: d.body + ' Press Drive on the key fob: you both climb in, your guide takes the wheel, and you can stop or get out whenever you like.' }); });
    let hum = 0;
    // `blockedBy(pos)` lets main.js say when the visitor is standing in the way
    car.update = (dt, t, inWay) => {
      if (car.driving && inWay && !car.held) { car.held = true; audio.horn(); } if (!inWay) car.held = false;
      const want = car.driving && !inWay ? 1.25 : 0; car.v += (want - car.v) * Math.min(1, dt * (want ? 1.4 : 5));
      if (car.v > 0.003) { car.a += car.v * dt / Math.hypot(Math.sin(car.a) * RX, Math.cos(car.a) * RZ); place(); }
      if (car.driving && !inWay) { hum -= dt; if (hum <= 0) { hum = 0.2; if (audio.ok()) audio.tone({ freq: 70 + car.v * 30, dur: 0.26, type: 'sawtooth', vol: 0.022 }); } }
      c.position.y = -bb.min.y + (car.v > 0.05 ? Math.sin(t * 40) * 0.004 : 0); c.rotation.z = car.v > 0.05 ? Math.sin(t * 3) * 0.012 : 0;
    };
    // nose position, for "is someone in front of me"
    car.nose = (out = new THREE.Vector3()) => car.rig.localToWorld(out.set(0, 0.3, sz.z * 0.5 + 0.9));
  }

  // ---------- on the walls: the resume and the autograph ----------
  {
    const loader = new THREE.TextureLoader();
    const wall = cast(V(1.38, 1.55, -0.6), V(0, 0, 1), 3);
    if (wall) {
      const fr = new THREE.Group(); fr.position.set(1.38, 1.6, wall.z - 0.012); fr.rotation.y = Math.PI; scene.add(fr);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.022), std(0x1a1512, { roughness: 0.4 })); fr.add(frame);
      const t = loader.load('/resume-1.jpg'); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      const page = new THREE.Mesh(new THREE.PlaneGeometry(0.47, 0.665), new THREE.MeshBasicMaterial({ map: t, color: 0xcfcfcf, toneMapped: false })); page.position.z = 0.0125; fr.add(page);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.045), new THREE.MeshBasicMaterial({ map: label('RÉSUMÉ · CLICK TO DOWNLOAD', 512, 76, 28, '#1a1309', '#e8c98a'), toneMapped: false })); plate.position.set(0, -0.41, 0.004); fr.add(plate);
      const spot = new THREE.SpotLight(0xfff1d6, 1.6, 2.2, 0.5, 0.7, 1.5); spot.position.set(1.38, 2.45, wall.z - 0.55); spot.target = frame; scene.add(spot); shadow(frame);
      add(fr, 'Download his résumé (PDF)', () => {
        audio.select(); guide().play('tip', 1.6);
        const a = document.createElement('a'); a.href = '/JohnboscoJ-Resume.pdf'; a.download = 'JohnboscoJ-Resume.pdf'; document.body.appendChild(a); a.click(); a.remove();
        showCard({ eyebrow: 'One page', title: 'Résumé', sub: 'Full-Stack Developer · AI/ML Engineer · Founder, Riven', body: 'The download has started. Pre-final year CSE at LICET, sole developer of the department ERP, founder of Riven, and looking for Summer 2027 full-stack and AI/ML internships.', link: '/JohnboscoJ-Resume.pdf', linkLabel: 'Open the PDF' });
      });
    }
    // the portrait: very big, on the living-room wall beside the TV. Drop the photo at public/photo.jpg.
    const pw = cast(V(-2.12, 2.0, -0.9), V(0, 0, 1), 3);
    if (pw) {
      const PW = 1.24, PH = 2.2, fr = new THREE.Group(); fr.position.set(-2.12, 2.08, pw.z - 0.03); fr.rotation.y = Math.PI; scene.add(fr);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.1, PH + 0.1, 0.05), std(0x14110f, { roughness: 0.4 })); fr.add(frame); shadow(frame);
      const mat = new THREE.MeshBasicMaterial({ color: 0xbdbdbd, toneMapped: false });
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), mat); pic.position.z = 0.027; fr.add(pic);
      mat.map = canvasTex(360, 640, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3b3a5c'); gr.addColorStop(1, '#c47a5a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = "700 34px 'Space Grotesk', sans-serif"; g.fillText('Johnbosco J', w / 2, h / 2 - 10); g.font = "400 17px 'Inter', sans-serif"; g.fillText('Founder, Riven', w / 2, h / 2 + 24); });
      loader.load('/photo.jpg', t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; const ia = t.image.width / t.image.height, fa = PW / PH; if (ia > fa) { t.repeat.x = fa / ia; t.offset.x = (1 - t.repeat.x) / 2; } else { t.repeat.y = ia / fa; t.offset.y = (1 - t.repeat.y) / 2; } mat.map = t; mat.needsUpdate = true; }, undefined, () => {});
      const sp = new THREE.SpotLight(0xfff1d6, 2.2, 4.5, 0.6, 0.8, 1.4); sp.position.set(-2.12, 3.7, pw.z - 1.3); sp.target = frame; scene.add(sp);
      add(fr, 'The man himself', () => { audio.chime(); guide().play('tip', 1.8); say('That\'s him. Johnbosco J: builds clear software, and a company to ship it.', { auto: true, hold: 3 }); });
    }
    // a wall clock that keeps real time
    const cw = cast(V(1.38, 2.55, -0.6), V(0, 0, 1), 3);
    if (cw) {
      const ck = new THREE.Group(); ck.position.set(1.38, 2.55, cw.z - 0.02); ck.rotation.y = Math.PI; scene.add(ck);
      ck.add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.025, 48).rotateX(Math.PI / 2), std(0x15110e, { roughness: 0.4 })));
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.155, 48), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, g => { g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#1a1512'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.lineWidth = i % 3 ? 3 : 7; g.beginPath(); g.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); g.lineTo(128 + Math.sin(a) * 116, 128 - Math.cos(a) * 116); g.stroke(); } }), roughness: 0.6 })); face.position.z = 0.013; ck.add(face);
      const hand = (len, w, col) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.004).translate(0, len / 2 - 0.012, 0), std(col)); m.position.z = 0.018; ck.add(m); return m; };
      const hh = hand(0.085, 0.012, 0x15110e), mh = hand(0.125, 0.008, 0x15110e), sh = hand(0.135, 0.003, 0xc8372d);
      updaters.push(() => { const n = new Date(), s = n.getSeconds() + n.getMilliseconds() / 1000, m = n.getMinutes() + s / 60, h = n.getHours() % 12 + m / 60; sh.rotation.z = -s / 60 * Math.PI * 2; mh.rotation.z = -m / 60 * Math.PI * 2; hh.rotation.z = -h / 12 * Math.PI * 2; });
    }
    // the autograph, as a neon sign high on the TV wall
    const high = cast(V(-0.15, 3.75, -1.2), V(0, 0, 1), 4);
    if (high) {
      const img = new Image(); img.onload = () => {
        const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, cv.width, cv.height), px = d.data;
        for (let i = 0; i < px.length; i += 4) { const ink = (255 - (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11)) * px[i + 3] / 255; px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = ink; }
        g.putImageData(d, 0, 0);
        const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
        const W = 2.7, H = W * img.height / img.width, grp = new THREE.Group(); grp.position.set(-0.15, 3.8, high.z - 0.06); grp.rotation.y = Math.PI; scene.add(grp);
        const board = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, H + 0.22, 0.03), std(0x15110e, { roughness: 0.55 })); board.position.z = -0.03; grp.add(board);
        const tube = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: t, transparent: true, color: new THREE.Color(2.2, 1.7, 1.05), toneMapped: false, depthWrite: false })); grp.add(tube);
        const halo = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.04, H * 1.25), new THREE.MeshBasicMaterial({ map: t, transparent: true, color: 0xffa24a, opacity: 0.35, toneMapped: false, depthWrite: false })); halo.position.z = -0.012; grp.add(halo);
        const glow = new THREE.PointLight(0xffb86a, 2.2, 5, 1.8); glow.position.set(-0.15, 3.8, high.z - 0.5); scene.add(glow);
        updaters.push((dt, tt) => { const f = 0.93 + Math.sin(tt * 2.3) * 0.04 + (Math.sin(tt * 37) > 0.985 ? -0.3 : 0); tube.material.color.setRGB(2.2 * f, 1.7 * f, 1.05 * f); glow.intensity = 2.2 * f; });
        add(grp, 'His autograph', () => { audio.chime(); guide().play('tip', 1.8); say('Signed by the man himself. He had it made in neon so nobody could miss it.', { auto: true, hold: 3 }); });
      };
      img.src = '/signature.png';
    }
  }

  // ---------- lived-in details ----------
  {
    const on = (x, z, from, max = 1.2) => drop(x, z, from, max);
    const put = (mesh, x, y, z, ry = 0) => { if (y === null) return null; mesh.position.set(x, y, z); mesh.rotation.y = ry; shadow(mesh); scene.add(mesh); return mesh; };
    const book = (w, h, d, col) => { const g = new THREE.Group(); const cover = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(col, { roughness: 0.75 })); cover.position.y = h / 2; g.add(cover); const pages = new THREE.Mesh(new THREE.BoxGeometry(w - 0.006, h - 0.006, d - 0.004), std(0xf1ece0)); pages.position.set(0.004, h / 2, 0); g.add(pages); return g; };
    const stack = (x, z, from, cols, ry = 0) => { let y = on(x, z, from); if (y === null) return; cols.forEach((c, i) => { const h = 0.022 + (i % 2) * 0.008, b = book(0.2 - i * 0.012, h, 0.145 - i * 0.008, c); put(b, x, y, z, ry + (i - 1) * 0.12); y += h; }); return y; };
    const mug = (x, z, from, col = 0xf2efe8) => { const y = on(x, z, from); if (y === null) return; const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.034, 0.085, 24, 1, true), std(col, { roughness: 0.35, side: THREE.DoubleSide })); body.position.y = 0.0425; g.add(body); const base = new THREE.Mesh(new THREE.CircleGeometry(0.034, 24).rotateX(-Math.PI / 2), std(col)); base.position.y = 0.003; g.add(base); const tea = new THREE.Mesh(new THREE.CircleGeometry(0.035, 24).rotateX(-Math.PI / 2), std(0x5a3418, { roughness: 0.2 })); tea.position.y = 0.07; g.add(tea); const h = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.006, 8, 16, Math.PI), std(col, { roughness: 0.35 })); h.position.set(0.04, 0.045, 0); h.rotation.z = -Math.PI / 2; g.add(h); put(g, x, y, z, Math.random() * 6); };
    // coffee table: a few books, a mug on a coaster, a tray with the car key
    stack(-0.72, -0.5, 0.9, [0x27408b, 0xb4451f, 0xe8e2d2]);
    mug(-0.2, -0.3, 0.9, 0xe9e4d8);
    { const y = on(0.0, -1.0, 0.9); const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.014, 32), std(0x1a1512, { roughness: 0.35 })); if (put(tray, 0.0, y === null ? null : y + 0.007, -1.0)) { const key = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 0.06), std(0x0d0d0f, { roughness: 0.3 })); put(key, 0.02, y + 0.02, -1.0, 0.5); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.002, 6, 16).rotateX(Math.PI / 2), std(0xbfc3c9, { metalness: 0.9, roughness: 0.3 })); put(ring, -0.03, y + 0.017, -0.97); } }
    // TV console: a row of books, a small speaker
    { const y = on(-1.05, 0.5, 1.15); if (y !== null && y > 0.4) { [0xb4451f, 0x1f6f5b, 0x27408b, 0xe8c98a, 0x4a4744, 0x7a3e9d].forEach((c, i) => { const b = book(0.15, 0.2 + (i % 3) * 0.018, 0.028 + (i % 2) * 0.008, c); b.rotation.z = 0; put(b, -1.2 + i * 0.04, y, 0.52, Math.PI / 2); }); const spk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.12), std(0x111214, { roughness: 0.6 })); put(spk, 0.55, y + 0.1, 0.52); const cone = new THREE.Mesh(new THREE.CircleGeometry(0.04, 24), std(0x2b2d31)); cone.position.set(0.55, y + 0.1, 0.459); cone.rotation.y = Math.PI; scene.add(cone); } }
    // kitchen island: fruit bowl and two mugs; counter: kettle
    { const y = on(-0.25, -4.12, 1.6); if (y !== null) { const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 28, 14, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), std(0xe9e4d8, { roughness: 0.3, side: THREE.DoubleSide })); put(bowl, -0.25, y + 0.15, -4.12); [[0, 0xe0a100], [0.07, 0xc8372d], [-0.06, 0xe57f17], [0.02, 0x7fae2e]].forEach(([dx, c], i) => { const f = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), std(c, { roughness: 0.45 })); put(f, -0.25 + dx, y + 0.075 + (i === 3 ? 0.04 : 0), -4.12 + (i - 1.5) * 0.045); }); } }
    mug(-1.45, -3.95, 1.6, 0x27408b); mug(-1.3, -4.05, 1.6, 0xe9e4d8);
    { const y = on(-1.3, -5.82, 1.5); if (y !== null && y > 0.6) { const k = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.19, 24), std(0xcfd2d8, { metalness: 0.9, roughness: 0.25 })); b.position.y = 0.095; k.add(b); const lid = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0x15110e)); lid.position.y = 0.19; lid.scale.y = 0.45; k.add(lid); const hd = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.011, 8, 16, Math.PI), std(0x15110e)); hd.position.set(0.085, 0.11, 0); hd.rotation.z = -Math.PI / 2; k.add(hd); put(k, -1.3, y, -5.82, 0.6); } }
    // studio desk: mug, notebook and pen, a desk lamp, and a set list on the keyboard's music rest
    mug(0.52, -3.02, 4.4, 0x15110e);
    { const y = on(0.7, -3.54, 4.4); if (y !== null) { const nb = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.1), std(0x1f6f5b, { roughness: 0.7 })); put(nb, 0.72, y + 0.006, -3.545, Math.PI / 2 + 0.1); const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.13, 8).rotateZ(Math.PI / 2), std(0xe8c98a, { metalness: 0.8, roughness: 0.3 })); put(pen, 0.72, y + 0.017, -3.545, 0.4); } }
    { const y = on(0.44, -3.02, 4.4); if (y !== null) { const L = new THREE.Group(); const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.015, 24), std(0x15110e)); base.position.y = 0.0075; L.add(base); const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 8), std(0xbfc3c9, { metalness: 0.9, roughness: 0.3 })); arm.position.y = 0.18; L.add(arm); const shade = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.09, 24, 1, true), std(0x15110e, { side: THREE.DoubleSide })); shade.position.set(0.05, 0.36, 0); shade.rotation.z = -0.5; L.add(shade); const bulb = new THREE.PointLight(0xffd9a0, 0.28, 1.2, 2); bulb.position.set(0.07, 0.31, 0); L.add(bulb); put(L, 0.44, y, -3.02, -0.4); } }
    { const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.21), new THREE.MeshStandardMaterial({ map: canvasTex(600, 420, (g, w, h) => { g.fillStyle = '#f7f4ec'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1512'; g.font = "700 30px 'Space Grotesk', sans-serif"; g.fillText('Sunday Mass · set list', 28, 50); g.strokeStyle = '#1a1512'; g.lineWidth = 1.5; for (let s = 0; s < 3; s++) for (let l = 0; l < 5; l++) { const y = 96 + s * 104 + l * 11; g.beginPath(); g.moveTo(28, y); g.lineTo(w - 28, y); g.stroke(); } for (let i = 0; i < 46; i++) { const s = Math.floor(i / 16), x = 60 + (i % 16) * 33, y = 96 + s * 104 + ((i * 7) % 9) * 5.5; g.beginPath(); g.ellipse(x, y, 7, 5, -0.4, 0, 7); g.fill(); g.fillRect(x + 6, y - 30, 1.8, 30); } }), roughness: 0.9, side: THREE.DoubleSide })); sheet.position.set(0.415, deskY + 0.26, -4.56); sheet.rotation.set(0, Math.PI / 2, 0); sheet.rotateX(-0.28); scene.add(sheet); const rest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.03), std(0x15110e)); rest.position.set(0.42, deskY + 0.152, -4.56); rest.rotation.y = Math.PI / 2; scene.add(rest); }
    // a doormat in the back hall
    { const y = on(1.45, -6.75, 0.8); if (y !== null) { const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshStandardMaterial({ map: canvasTex(400, 250, (g, w, h) => { g.fillStyle = '#6b5136'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3a2b1c'; g.lineWidth = 10; g.strokeRect(12, 12, w - 24, h - 24); g.fillStyle = '#1a1309'; g.font = "700 76px 'Space Grotesk', sans-serif"; g.textAlign = 'center'; g.fillText('HOWDY', w / 2, h / 2 + 26); }), roughness: 1 })); mat.rotation.x = -Math.PI / 2; mat.rotation.z = Math.PI; mat.position.set(1.45, y + 0.006, -6.75); mat.receiveShadow = true; scene.add(mat); } }
  }

  // ---------- the hen ----------
  const hen = { root: new THREE.Group(), target: null, wait: 2, jump: 0 };
  {
    const m = models.hen; m.scale.setScalar(0.14); hen.root.add(m); shadow(hen.root); hen.root.position.set(-1.6, 0.15, -3.0); scene.add(hen.root); hen.model = m;
    add(hen.root, 'Say hello to the hen', () => { audio.cluck(); hen.jump = 0.5; hen.wait = 0; say('That hen has the run of the place. Don\'t ask me who let her in.', { auto: true, hold: 3 }); });
  }

  // where things are: `at` is what you walk up to, `stand` is where a shortcut puts you
  const stations = {
    sofa: { name: 'Sofa & TV', at: V(-0.15, 0.15, -1.75), r: 1.25, stand: [V(0.55, 0.15, -1.2), 2.6], guide: V(0, 0.415, -0.52), hint: 'Press E to sit down', line: ['sofa', 'Best seat in the house. Press E to sit, then the remote is yours.'] },
    shelf: { name: 'Trophy shelf', at: V(1.9, 0.15, -3.4), r: 1.35, stand: [V(1.05, 0.15, -3.4), -Math.PI / 2], guide: V(1.72, 0.15, -2.55), gesture: 'pointL', hint: 'Click a trophy', line: ['shelf', 'The trophy shelf. Click any one of \'em and I\'ll tell you how he earned it.'] },
    kitchen: { name: 'Fridge door', at: V(0.4, 0.15, -5.3), r: 1.1, stand: [V(0.42, 0.15, -4.82), 0], guide: V(-0.3, drop(-0.3, -5.78, 1.5) ?? 0.95, -5.78), gesture: 'pointR', hint: 'Click a note, a magnet or the checklist', line: ['kitchen', 'Everything on this fridge does something. Notes reach him, the checklist ticks, and Sous will plan your dinner.'] },
    studio: { name: 'Studio desk', at: V(0.62, 3.0, -3.6), r: 1.0, stand: [V(1.28, 3.0, -3.62), Math.PI / 2], guide: V(0.5, deskY, -4.02), gesture: 'pointL', hint: 'Click the laptop or the trainer kit', line: ['studio', 'Up here is where the work happens. Sit at the laptop and browse his live sites, or run the 8086 trainer kit.'] },
    keys: { name: 'Keyboard', at: V(0.62, 3.0, -4.6), r: 0.75, stand: [V(1.3, 3.0, -4.56), Math.PI / 2], guide: V(0.42, deskY + 0.13, -4.0), gesture: 'cheer', hint: 'Press E to sit down and play', line: ['keys', 'He plays keyboard for Sunday Mass. Press E to sit down. All sixty-one keys work, and your own keyboard plays it too.'] },
    patio: { name: 'Patio', at: V(-4.1, 0.1, -1.6), r: 2.6, stand: [V(-4.15, 0.1, 0.3), 0], guide: V(-3.35, 0.1, -0.6), gesture: 'pointL', hint: 'Press E or the key fob to go for a drive', line: ['patio', 'And out back, his other love: driving. Press Drive and we\'ll both climb in. I\'ll take the wheel.'] },
  };
  return { stations, clickables, piano, hen, car, laptop, update: (dt, t) => updaters.forEach(u => u(dt, t)) };
}
