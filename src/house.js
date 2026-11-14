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
    mac.traverse(o => { if (o.isMesh && o.material?.name === 'Material.003') o.material = std(0xb6b8bd, { metalness: 0.85, roughness: 0.32 }); });
    const scrT = canvasTex(1280, 832, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2b1055'); gr.addColorStop(0.5, '#7597de'); gr.addColorStop(1, '#f4a28c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(20,20,24,0.6)'; g.fillRect(0, 0, w, 34); g.fillStyle = '#fff'; g.font = "600 18px 'Geist', sans-serif"; g.fillText('Riven Browser   File   View   History', 20, 23);
      g.fillStyle = 'rgba(18,18,22,0.92)'; g.beginPath(); g.roundRect(150, 90, 980, 610, 18); g.fill(); g.fillStyle = '#2a2a31'; g.beginPath(); g.roundRect(150, 90, 980, 54, [18, 18, 0, 0]); g.fill();
      ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(180 + i * 24, 117, 8, 0, 7); g.fill(); });
      g.fillStyle = '#17171b'; g.beginPath(); g.roundRect(290, 102, 700, 30, 15); g.fill(); g.fillStyle = '#9aa0aa'; g.font = "400 16px 'Geist', sans-serif"; g.fillText('johnbosco.vercel.app', 310, 123);
      g.fillStyle = '#f5f5f7'; g.font = "700 76px 'Bricolage Grotesque', sans-serif"; g.fillText('Johnbosco J', 210, 330); g.fillStyle = '#b9bcc4'; g.font = "400 30px 'Geist', sans-serif"; g.fillText('Click to sit down and browse his live sites', 214, 386);
      g.fillStyle = '#e8c98a'; g.beginPath(); g.roundRect(214, 430, 250, 62, 31); g.fill(); g.fillStyle = '#1a1309'; g.font = "600 24px 'Geist', sans-serif"; g.fillText('Open the browser', 244, 469);
    });
    const tilt = 0.375, scr = new THREE.Mesh(new THREE.PlaneGeometry(0.336, 0.218), new THREE.MeshBasicMaterial({ map: scrT, toneMapped: false, color: 0xd8d8d8 }));
    scr.position.set(0, 0.128, -0.158); scr.rotation.x = -tilt; mac.add(scr); laptop.screen = scr; laptop.mac = mac;
    const glow = new THREE.PointLight(0x9db4ff, 0.6, 1.5, 2); glow.position.set(0.9, deskY + 0.25, -3.78); scene.add(glow);
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

  // ---------- patio: the Ertiga ----------
  // The car lives in a rig so its lamps travel with it. It has about two metres of patio to
  // roll along, so "driving" is forward to the gate and back again until someone says stop.
  const car = { on: false, driving: false, rig: new THREE.Group(), v: 0, dir: 1, wheels: [], ZMIN: -4.15, ZMAX: -2.45 };
  {
    const c = models.car, floor = drop(-4.12, -3.4, 1.5) ?? 0.1; c.rotation.y = Math.PI; car.rig.add(c); car.rig.position.set(-4.14, floor - 0.1, -3.55); shadow(c); scene.add(car.rig); car.floor = floor;
    c.traverse(o => { if (o.isMesh && /glass/i.test(o.material.name)) { o.material.transparent = true; o.material.opacity = 0.35; o.material.depthWrite = false; o.castShadow = false; } });
    const lampM = new THREE.MeshBasicMaterial({ color: 0xfff3cf, transparent: true, opacity: 0, toneMapped: false }), beams = [];
    for (const sd of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), lampM); l.scale.set(1.5, 0.7, 0.4); l.position.set(sd * 0.62, 0.76, 2.2); car.rig.add(l); const b = new THREE.SpotLight(0xfff0c8, 0, 7, 0.55, 0.6, 1.4); b.position.copy(l.position); b.target.position.set(sd * 0.62, 0, 6.5); car.rig.add(b, b.target); beams.push(b); }
    const tailM = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0, toneMapped: false });
    for (const sd of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), tailM); l.scale.set(1.2, 1.4, 0.3); l.position.set(sd * 0.66, 0.95, -1.97); car.rig.add(l); }
    car.lights = on => { if (car.on === on) return; car.on = on; audio.click(); tween(0.5, k => { const v = on ? k : 1 - k; lampM.opacity = v; tailM.opacity = v * 0.9; beams.forEach(b => { b.intensity = 14 * v; }); }); };
    car.start = () => { if (car.driving) return; car.lights(true); car.driving = true; audio.engine(); };
    car.stop = () => { if (!car.driving) return; car.driving = false; audio.click(); };
    // world position of a seat: the Ertiga is right-hand drive, so the driver sits on the right
    car.seat = (who, out = new THREE.Vector3()) => out.copy(who === 'driver' ? V(-0.34, 1.03, 1.1) : who === 'bonnet' ? V(0, 0.98, 1.55) : V(0.34, 1.2, 0.3)).add(car.rig.position);
    const d = offClock.find(o => o.title === 'Driving');
    add(c, 'The Ertiga: use the key fob', () => { car.lights(!car.on); if (car.on) audio.horn(); showCard({ eyebrow: 'Off the clock', title: d.title, sub: 'Suzuki Ertiga', body: d.body + ' Use the key fob at the bottom right: get in, let your guide drive, and get out whenever you like.' }); });
    let hum = 0;
    updaters.push((dt, t) => {
      const want = car.driving ? 0.85 * car.dir : 0; car.v += (want - car.v) * Math.min(1, dt * 1.6);
      if (Math.abs(car.v) > 0.002) {
        const p = car.rig.position; p.z += car.v * dt;
        if (p.z > car.ZMAX && car.dir > 0) { car.dir = -1; } if (p.z < car.ZMIN && car.dir < 0) { car.dir = 1; }
        p.z = Math.max(car.ZMIN - 0.05, Math.min(car.ZMAX + 0.05, p.z));
        for (const w of car.wheels) w.rotation.x += car.v * dt / 0.31;
      }
      if (car.driving) { hum -= dt; if (hum <= 0) { hum = 0.22; if (audio.ok()) { audio.tone({ freq: 58 + Math.abs(car.v) * 26, dur: 0.3, type: 'sawtooth', vol: 0.03 }); if (car.dir < 0 && Math.floor(t * 1.6) % 2 === 0) audio.tone({ freq: 1150, dur: 0.12, type: 'square', vol: 0.012 }); } } }
      c.position.y = car.driving || car.on ? Math.sin(t * 38) * 0.0012 : 0;
    });
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
    patio: { name: 'Patio', at: V(-4.1, 0.1, -1.6), r: 2.6, stand: [V(-4.15, 0.1, 0.3), 0], guide: V(-3.35, 0.1, -0.6), gesture: 'pointL', hint: 'Use the key fob, bottom right', line: ['patio', 'And out back, his other love: driving. The key fob is yours. Hop in and I\'ll take the wheel.'] },
  };
  return { stations, clickables, piano, hen, car, laptop, update: (dt, t) => updaters.forEach(u => u(dt, t)) };
}
