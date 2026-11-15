// The television: a 2D canvas UI rendered onto the wall TV as a texture.
import * as THREE from 'three';
import { profile, riven, projects, experience, awards, offClock, languages, contact, channels, music } from './data.js';
import { audio } from './audio.js';

const W = 1600, H = 900, K = W / 960; // Riven TV is laid out on a 960x540 dp canvas
const INK = '#F5F5F7', DIM = 'rgba(245,245,247,0.68)', FAINT = 'rgba(245,245,247,0.40)', BG = '#08080A', PANEL = 'rgba(255,255,255,0.075)', LINE = 'rgba(255,255,255,0.12)', ONINK = '#0A0A0A';
// type pairings shipped with Riven TV (Customize > Look > Fonts)
const TYPEFACES = [
  { label: 'Bricolage Grotesque + Geist', display: 'Bricolage Grotesque', text: 'Geist' },
  { label: 'Instrument Serif + Geist', display: 'Instrument Serif', text: 'Geist', serif: true },
  { label: 'Unbounded + Space Grotesk', display: 'Unbounded', text: 'Space Grotesk' },
  { label: 'Geist', display: 'Geist', text: 'Geist' },
];
const BACKDROPS = [
  { label: 'Follows focused app', colors: null }, { label: 'Graphite', colors: ['#78787F', '#26262C'] }, { label: 'Aurora', colors: ['#1EC8A5', '#5B4BFF'] },
  { label: 'Dusk', colors: ['#FF646E', '#783CFF'] }, { label: 'Ocean', colors: ['#0EA5E9', '#14288C'] }, { label: 'Ember', colors: ['#FF8A00', '#E52E71'] },
  { label: 'Night sky', colors: ['#3A5BC7', '#0B1433'], night: true }, { label: 'Pure black', colors: ['#000000', '#000000'] },
];
let HEAD = "'Bricolage Grotesque', 'Geist', system-ui, sans-serif", BODY = "'Geist', system-ui, sans-serif";
const TABS = [['Home', 'home'], ['Apps', 'projects'], ['Settings', 'settings']];
const fontFiles = { 'Bricolage Grotesque': ['font_bricolage.ttf', '200 800'], Geist: ['font_geist.ttf', '100 900'], 'Instrument Serif': ['font_instrumentserif.ttf', '400'], Unbounded: ['font_unbounded.ttf', '200 900'], 'Space Grotesk': ['font_spacegrotesk.ttf', '300 700'] };
export const fontsReady = Promise.all(Object.entries(fontFiles).map(([name, [file, weight]]) => new FontFace(name, `url(/fonts/${file})`, { weight }).load().then(f => document.fonts.add(f)).catch(() => {})));
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
const STARS = Array.from({ length: 120 }, (_, i) => { const r = n => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); }; return [r(1), r(2) * 0.75, 0.4 + r(3) * 1.1, r(4) * 6.28]; });

export class TV {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = W; this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    this.screen = 'off';
    this.focus = { home: 0, projects: 0, experience: 0, awards: 0, contact: 0, settings: 0, music: 0 };
    this.zone = 'main'; this.settings = { backdrop: 0, typeface: 0 }; this.lastInput = 0; this.sub = null;
    this.detail = false;
    this.changedAt = 0; this.bootAt = 0; this.now = 0;
    this.listeners = { screen: [], open: [], power: [] };
    this.visited = new Set();
    this.draw(0);
  }
  on(evt, fn) { this.listeners[evt].push(fn); }
  emit(evt, v) { this.listeners[evt].forEach(f => f(v)); }
  get isOn() { return this.screen !== 'off'; }
  get accent() {
    const c = channels.find(c => c.id === this.screen);
    return c ? c.accent : '#e8e4d8';
  }

  go(screen, zone = 'main') {
    this.screen = screen; this.detail = false; this.sub = null; this.zone = zone; this.changedAt = this.now;
    if (screen !== 'off' && screen !== 'boot') { this.visited.add(screen); this.emit('screen', screen); }
  }
  power() {
    if (this.screen === 'off') { this.screen = 'boot'; this.bootAt = this.now; this.lastInput = this.now; this.emit('power', true); }
    else { this.screen = 'off'; this.detail = false; this.emit('power', false); }
  }
  get tab() { const i = TABS.findIndex(t => t[1] === this.screen); return i < 0 ? 0 : i; }
  setTypeface(i) { this.settings.typeface = i; const t = TYPEFACES[i]; HEAD = `'${t.display}', 'Geist', system-ui, sans-serif`; BODY = `'${t.text}', system-ui, sans-serif`; }

  input(a) {
    if (a === 'power') return this.power();
    if (this.screen === 'off' || this.screen === 'boot') return;
    this.lastInput = this.now;
    if (this.screen === 'saver') { this.screen = this.before || 'home'; this.changedAt = this.now; return; }
    if (a === 'home') return this.go('home');
    const f = this.focus, s = this.screen;
    const clamp = (v, n) => Math.max(0, Math.min(n - 1, v));
    // the Home / Apps / Settings pills at the top
    if (this.zone === 'tabs') {
      if (a === 'left' && this.tab > 0) this.go(TABS[this.tab - 1][1], 'tabs');
      if (a === 'right' && this.tab < 2) this.go(TABS[this.tab + 1][1], 'tabs');
      if (a === 'down' || a === 'ok') this.zone = 'main';
      if (a === 'back') this.go('home');
      return;
    }
    if (s === 'home') {
      if (a === 'left') f.home = clamp(f.home - 1, channels.length);
      if (a === 'right') f.home = clamp(f.home + 1, channels.length);
      if (a === 'up') this.zone = 'tabs';
      if (a === 'ok') this.go(channels[f.home].id);
      return;
    }
    if (a === 'back') { if (this.detail || this.sub) { this.detail = false; this.sub = null; this.changedAt = this.now; } else this.go('home'); return; }
    if (s === 'settings') {
      if (this.sub) return;
      const rows = this.settingsRows();
      if (a === 'up') { if (f.settings === 0) this.zone = 'tabs'; else f.settings--; }
      if (a === 'down') f.settings = clamp(f.settings + 1, rows.length);
      const r = rows[f.settings];
      if ((a === 'left' || a === 'right') && r.choice) r.choice(a === 'right' ? 1 : -1);
      if (a === 'ok') r.choice ? r.choice(1) : r.action();
      return;
    }
    if (s === 'projects') {
      if (this.detail) {
        if (a === 'ok' && projects[f.projects].link) this.emit('open', projects[f.projects].link);
        if (a === 'left') { f.projects = clamp(f.projects - 1, projects.length); this.changedAt = this.now; }
        if (a === 'right') { f.projects = clamp(f.projects + 1, projects.length); this.changedAt = this.now; }
        return;
      }
      const col = f.projects % 4, row = Math.floor(f.projects / 4);
      if (a === 'left' && col > 0) f.projects--;
      if (a === 'right' && col < 3) f.projects++;
      if (a === 'up') { if (row > 0) f.projects -= 4; else this.zone = 'tabs'; }
      if (a === 'down' && row < 2) f.projects += 4;
      if (a === 'ok') { this.detail = true; this.changedAt = this.now; }
      return;
    }
    if (s === 'music') {
      if (a === 'up') f.music = clamp(f.music - 1, music.length);
      if (a === 'down') f.music = clamp(f.music + 1, music.length);
      if (a === 'ok') audio.pick(f.music);
      if (a === 'right') audio.skip(1);
      if (a === 'left') audio.skip(-1);
      if (a === 'play') audio.toggleMusic();
      return;
    }
    if (s === 'experience' || s === 'awards' || s === 'contact') {
      const n = s === 'experience' ? experience.length : s === 'awards' ? awards.length : contact.length;
      if (a === 'up') f[s] = clamp(f[s] - 1, n);
      if (a === 'down') f[s] = clamp(f[s] + 1, n);
      if (a === 'ok' && s === 'contact') this.emit('open', contact[f.contact].url);
      return;
    }
    // about / riven / offclock: left & right hop between channels
    const i = channels.findIndex(c => c.id === s);
    if (a === 'left' && i > 0) this.go(channels[i - 1].id);
    if (a === 'right' && i < channels.length - 1) this.go(channels[i + 1].id);
  }
  settingsRows() {
    const S = this.settings, cyc = (v, n, d) => (v + d + n) % n;
    return [
      { label: 'Background', value: BACKDROPS[S.backdrop].label, blurb: 'Seven backgrounds, including one that follows the focused app.', choice: d => { S.backdrop = cyc(S.backdrop, BACKDROPS.length, d); } },
      { label: 'Fonts', value: TYPEFACES[S.typeface].label, blurb: 'Type pairings from Google Fonts: a display face for the clock and titles, a text face for the rest.', choice: d => this.setTypeface(cyc(S.typeface, TYPEFACES.length, d)) },
      { label: 'Screensaver', value: 'Preview now', blurb: 'Riven Ambient: Aurora. Starts by itself when the remote has been idle.', action: () => { this.before = 'settings'; this.screen = 'saver'; this.changedAt = this.now; } },
      { label: 'About this TV', value: 'Johnbosco J', blurb: 'Who built all this.', action: () => this.go('about') },
      { label: 'About Riven', value: '', blurb: 'The launcher this screen is modelled on.', action: () => { this.sub = 'aboutRiven'; this.changedAt = this.now; } },
    ];
  }

  // ---------- drawing helpers ----------
  rr(x, y, w, h, r, fill, stroke, lw = 2) {
    const c = this.ctx; c.beginPath(); c.roundRect(x, y, w, h, r);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
  }
  text(str, x, y, font, color, align = 'left') {
    const c = this.ctx; c.font = font; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'alphabetic';
    c.fillText(str, x, y);
  }
  wrap(str, x, y, maxW, lh, font, color, maxLines = 99) {
    const c = this.ctx; c.font = font; c.fillStyle = color; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    const words = str.split(' '); let line = '', n = 0;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (c.measureText(test).width > maxW && line) {
        n++;
        if (n === maxLines) { c.fillText(line.replace(/[ ,.;:]+$/, '') + '…', x, y); return y + lh; }
        c.fillText(line, x, y); y += lh; line = words[i];
      } else line = test;
    }
    if (line) { c.fillText(line, x, y); y += lh; }
    return y;
  }
  chips(list, x, y, maxW, color) {
    const c = this.ctx; c.font = `500 23px ${BODY}`;
    let cx = x, cy = y;
    for (const s of list) {
      const w = c.measureText(s).width + 32;
      if (cx + w > x + maxW) { cx = x; cy += 50; }
      this.rr(cx, cy, w, 38, 19, 'rgba(255,255,255,0.05)', LINE, 1.5);
      this.text(s, cx + 16, cy + 26, `500 23px ${BODY}`, color || DIM);
      cx += w + 10;
    }
    return cy + 50;
  }
  title(str, sub) {
    this.ctx.letterSpacing = '-0.04em'; this.text(str, 80, 204, `600 80px ${HEAD}`, INK); this.ctx.letterSpacing = '0px';
    if (sub) this.text(sub, 82, 244, `400 28px ${BODY}`, DIM);
  }
  // dp-space helpers: everything inside is drawn on Riven's 960x540 canvas
  dp(fn) { const c = this.ctx; c.save(); c.scale(K, K); fn(c); c.restore(); }
  glass(x, y, w, h, r, fill = PANEL) {
    const c = this.ctx; this.rr(x, y, w, h, r, fill);
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,0.26)'); g.addColorStop(1, 'rgba(255,255,255,0.06)');
    c.beginPath(); c.roundRect(x, y, w, h, r); c.strokeStyle = g; c.lineWidth = 0.75; c.stroke();
  }
  track(str, x, y, font, color, em = 0, align = 'left') { const c = this.ctx; c.letterSpacing = `${em}em`; this.text(str, x, y, font, color, align); c.letterSpacing = '0px'; }
  tabs() {
    const c = this.ctx; this.glass(387, 28, 186, 31, 15.5);
    const xs = [[391, 54], [447, 54], [503, 66]];
    TABS.forEach(([label], i) => {
      const [x, w] = xs[i], sel = i === this.tab, foc = sel && this.zone === 'tabs';
      if (sel) this.rr(x, 32, w, 23, 11.5, foc ? INK : 'rgba(255,255,255,0.16)');
      this.text(label, x + w / 2, 47, `${sel ? 600 : 500} 9px ${BODY}`, foc ? ONINK : sel ? INK : DIM, 'center');
    });
  }
  footer(keys) {
    const c = this.ctx; c.save(); c.translate(51, 508); c.rotate(Math.PI / 4); c.strokeStyle = DIM; c.lineWidth = 1; c.strokeRect(-2.2, -2.2, 4.4, 4.4); c.restore();
    this.text('Riven · made by', 59, 511, `400 7.5px ${BODY}`, FAINT); this.text('Johnbosco J', 59 + c.measureText('Riven · made by ').width, 511, `600 7.5px ${BODY}`, DIM);
    let x = 912;
    for (const [k, label] of [...keys].reverse()) {
      c.font = `400 7.5px ${BODY}`; const lw = c.measureText(label).width; x -= lw; this.text(label, x, 511, `400 7.5px ${BODY}`, FAINT);
      c.font = `600 6px ${BODY}`; const kw = c.measureText(k).width + 8; x -= kw + 5;
      this.rr(x, 502.5, kw, 12, 3, 'rgba(255,255,255,0.06)', LINE, 0.6); this.text(k, x + kw / 2, 510.6, `600 6px ${BODY}`, DIM, 'center'); x -= 14;
    }
  }
  chrome(hint) {
    this.dp(() => {
      this.tabs();
      const ch = channels.find(ch => ch.id === this.screen);
      if (ch) this.track(ch.name.toUpperCase(), 48, 47, `500 7.5px ${BODY}`, DIM, 0.3);
      const d = new Date(); this.text(d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/ ?[AP]M/i, ''), 912, 50, `200 22px ${HEAD}`, INK, 'right');
      const keys = []; if (/◉/.test(hint || '')) keys.push(['OK', /GitHub/.test(hint) ? 'Open on GitHub' : /story/.test(hint) ? 'Full story' : 'Open']);
      keys.push(['BACK', this.detail ? 'All apps' : 'Home']); this.footer(keys);
    });
  }
  backdrop(focusColor) {
    const c = this.ctx, t = this.now, B = BACKDROPS[this.settings.backdrop];
    const c1 = B.colors ? B.colors[0] : (focusColor || this.accent), c2 = B.colors ? B.colors[1] : null;
    c.globalAlpha = 1; c.fillStyle = BG; c.fillRect(0, 0, W, H);
    const d = (Math.sin(t * 0.21) + 1) / 2, dx = W * (0.02 - 0.04 * d);
    const glow = (col, a, cx, cy, r) => { const g = c.createRadialGradient(cx + dx, cy, 0, cx + dx, cy, r * (1.06 + 0.05 * d)); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(0, 0, W, H); };
    glow(c1, 0.55, W * 0.74, H * 0.12, W * 0.62);
    if (c2) glow(c2, 0.5, W * 0.12, H * 1.05, W * 0.55); else { c.save(); c.globalAlpha = 0.35; glow(c1, 0.5, W * 0.12, H * 1.05, W * 0.55); c.restore(); }
    glow(c1, 0.14, W * 0.45, H * 0.35, W * 0.4);
    const fl = c.createLinearGradient(0, 0, 0, H); fl.addColorStop(0, 'rgba(8,8,8,0.15)'); fl.addColorStop(0.45, 'rgba(8,8,8,0.35)'); fl.addColorStop(1, 'rgba(8,8,8,0.92)'); c.fillStyle = fl; c.fillRect(0, 0, W, H);
    if (B.night) {
      for (const st of STARS) { const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(st[3] + t * 0.7)); c.fillStyle = `rgba(255,255,255,${a * 0.8})`; c.beginPath(); c.arc(st[0] * W, st[1] * H, st[2] * K, 0, 7); c.fill(); }
      const mx = W * 0.84, my = H * 0.38, mr = W * 0.028; c.save(); c.beginPath(); c.rect(0, 0, W, H); c.arc(mx + mr * 0.42 + mr * 0.92, my - mr * 0.18 + mr * 0.92, mr * 0.92, 0, 7, true); c.clip('evenodd'); c.fillStyle = '#F2F4FF'; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill(); c.restore();
    }
  }
  // project artwork: a generated cover so every card has its own colour and monogram
  cover(x, y, w, h, i, r = 14) {
    const c = this.ctx, hue = (i * 47 + 205) % 360, name = projects[i].name;
    c.save(); c.beginPath(); c.roundRect(x, y, w, h, r); c.clip();
    const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, `hsl(${hue} 68% 46%)`); g.addColorStop(1, `hsl(${(hue + 48) % 360} 70% 20%)`);
    c.fillStyle = g; c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.13)'; c.lineWidth = 2;
    for (let k = 1; k < 7; k++) { c.beginPath(); c.arc(x + w * 0.86, y + h * 1.05, k * h * 0.26, 0, Math.PI * 2); c.stroke(); }
    c.font = `700 ${Math.round(h * 1.15)}px ${HEAD}`; c.fillStyle = 'rgba(255,255,255,0.2)'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillText(name[0], x + w * 0.05, y + h * 1.02);
    c.restore();
  }
  // focus highlight that glides between items instead of jumping
  ring(group, x, y, w, h, r = 18) {
    const f = this.fr ||= {}, c = this.ctx;
    if (f.group !== group) Object.assign(f, { group, x, y, w, h });
    const k = 0.34; f.x += (x - f.x) * k; f.y += (y - f.y) * k; f.w += (w - f.w) * k; f.h += (h - f.h) * k;
    c.save(); c.shadowColor = this.accent; c.shadowBlur = 34; this.rr(f.x, f.y, f.w, f.h, r, 'rgba(255,255,255,0.045)', this.accent, 4); c.restore();
  }
  glyph(id, x, y, col) {
    const c = this.ctx; c.save(); c.translate(x, y); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 3.5; c.lineCap = c.lineJoin = 'round'; c.beginPath();
    if (id === 'about') { c.arc(0, -8, 8, 0, 7); c.moveTo(-14, 16); c.quadraticCurveTo(0, -4, 14, 16); }
    if (id === 'riven') { c.roundRect(-14, -14, 28, 28, 7); c.moveTo(-5, -5); c.lineTo(5, -5); c.lineTo(5, 5); c.lineTo(-5, 5); c.closePath(); }
    if (id === 'projects') { for (const [a, b] of [[-14, -14], [3, -14], [-14, 3], [3, 3]]) c.roundRect(a, b, 11, 11, 3); }
    if (id === 'experience') { c.roundRect(-15, -8, 30, 22, 4); c.moveTo(-6, -8); c.lineTo(-6, -14); c.lineTo(6, -14); c.lineTo(6, -8); }
    if (id === 'awards') { for (let i = 0; i < 10; i++) { const r = i % 2 ? 7 : 16, a = (i / 10) * Math.PI * 2 - Math.PI / 2; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); }
    if (id === 'offclock') { c.arc(-8, 10, 5, 0, 7); c.moveTo(-3, 10); c.lineTo(-3, -14); c.lineTo(12, -17); c.lineTo(12, 6); c.moveTo(17, 6); c.arc(12, 6, 5, 0, 7); }
    if (id === 'music') { c.arc(-7, 9, 5, 0, 7); c.moveTo(-2, 9); c.lineTo(-2, -13); c.lineTo(12, -16); c.lineTo(12, 5); c.moveTo(17, 5); c.arc(12, 5, 5, 0, 7); }
    if (id === 'contact') { c.roundRect(-16, -11, 32, 22, 4); c.moveTo(-16, -9); c.lineTo(0, 3); c.lineTo(16, -9); }
    c.stroke(); c.restore();
  }

  // ---------- screens ----------
  draw(t) {
    this.now = t;
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
    if (this.screen === 'off') { c.fillStyle = '#030304'; c.fillRect(0, 0, W, H); this.texture.needsUpdate = true; return; }
    if (this.screen === 'boot') { this.drawBoot(t - this.bootAt); this.texture.needsUpdate = true; return; }
    if (this.screen !== 'saver' && t - this.lastInput > 75) { this.before = this.screen; this.screen = 'saver'; }
    if (this.screen === 'saver') { this.draw_saver(); this.texture.needsUpdate = true; return; }
    this.backdrop(this.screen === 'home' ? channels[this.focus.home].accent : null);
    const k = Math.min(1, (t - this.changedAt) / 0.28), e = 1 - Math.pow(1 - k, 3);
    c.save(); c.globalAlpha = e; c.translate(0, (1 - e) * 18);
    this['draw_' + this.screen]();
    c.restore();
    this.texture.needsUpdate = true;
  }

  drawBoot(t) {
    const c = this.ctx;
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    const a = Math.min(1, t / 0.6), s = 0.92 + 0.08 * (1 - Math.pow(1 - a, 3));
    c.save(); c.globalAlpha = a * (t > 1.9 ? Math.max(0, 1 - (t - 1.9) / 0.4) : 1);
    c.translate(W / 2, H / 2); c.scale(s, s);
    c.save(); c.translate(0, -60); c.rotate(Math.PI / 4); c.strokeStyle = INK; c.lineWidth = 5; c.strokeRect(-22, -22, 44, 44); c.restore();
    c.letterSpacing = '0.4em'; this.text('RIVEN', 12, 40, `500 40px ${HEAD}`, INK, 'center'); c.letterSpacing = '0px';
    if (t > 0.7) { c.globalAlpha *= Math.min(1, (t - 0.7) / 0.5); c.letterSpacing = '0.3em'; this.text('MADE BY JOHNBOSCO J', 6, 84, `400 15px ${BODY}`, DIM, 'center'); c.letterSpacing = '0px'; }
    c.restore();
    if (t > 2.3) this.go('home');
  }
  banner(x, y, w, h, ch, r = 8) {
    // an app banner in the app's own colour, the way Riven shows every app
    const c = this.ctx; c.save(); c.beginPath(); c.roundRect(x, y, w, h, r); c.clip();
    const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, ch.accent); g.addColorStop(1, rgba(ch.accent, 0.62)); c.fillStyle = '#101013'; c.fillRect(x, y, w, h); c.fillStyle = g; c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(255,255,255,0.16)'; c.beginPath(); c.arc(x + w * 0.9, y + h * 0.1, h * 0.75, 0, 7); c.fill();
    c.save(); c.translate(x + w * 0.2, y + h * 0.5); c.scale(h / 66, h / 66); this.glyph(ch.id, 0, 0, ONINK); c.restore();
    this.wrap(ch.name, x + w * 0.37, y + h * 0.5 + (ch.name.length > 10 ? -2 : 4.5), w * 0.6, h * 0.24, `700 ${h * 0.215}px ${HEAD}`, ONINK, 2);
    c.restore();
  }
  header() {
    const d = new Date(), hr = d.getHours();
    const greet = hr < 5 ? 'Late night' : hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    this.text(`${greet}, partner`, 48, 36, `500 10px ${BODY}`, DIM);
    this.track(d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/ ?[AP]M/i, ''), 46, 84, `200 46px ${HEAD}`, INK, -0.04);
    this.text(d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }), 48, 104, `400 10px ${BODY}`, DIM);
    this.track(`${profile.stats[0].value} CONTRIBUTIONS · ${profile.stats[1].value} REPOSITORIES · ${this.visited.size ? [...this.visited].filter(v => channels.some(c => c.id === v)).length : 0}/${channels.length} WATCHED`, 48, 119, `400 7.5px ${BODY}`, FAINT, 0.04);
    let x = 912; const c = this.ctx;
    for (const label of ['Settings', profile.location.split(',')[0], 'Open to work']) {
      c.font = `500 8.5px ${BODY}`; const w = c.measureText(label).width + 34; x -= w;
      this.glass(x, 66, w, 26, 13); c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.arc(x + 14, 79, 3.6, 0, 7); c.stroke();
      this.text(label, x + 24, 82, `500 8.5px ${BODY}`, INK); x -= 8;
    }
  }
  draw_home() {
    this.dp(c => {
      const f = this.focus.home, ch = channels[f], inDock = this.zone === 'main';
      this.header(); this.tabs();
      // shelf: the focused app's name in large type
      this.track(ch.blurb.toUpperCase(), 48, 176, `500 7.5px ${BODY}`, DIM, 0.3);
      this.track(ch.name, 46, 232, `600 50px ${HEAD}`, INK, TYPEFACES[this.settings.typeface].serif ? -0.015 : -0.04);
      this.text('Press OK to open · arrows to browse · up for Apps and Settings', 48, 262, `400 10px ${BODY}`, DIM);
      // frosted dock
      this.glass(40, 286, 880, 142, 24, 'rgba(255,255,255,0.06)');
      const n = channels.length, gap = 12, tw = Math.min(108, (848 - (n - 1) * gap) / n), th = tw * 0.565, x0 = 40 + (880 - (n * tw + (n - 1) * gap)) / 2, y0 = 312 + (61 - th) / 2;
      const tx = i => x0 + i * (tw + gap);
      const F = this.fr ||= {}; if (F.group !== 'dock') Object.assign(F, { group: 'dock', x: tx(f) });
      F.x += (tx(f) - F.x) * 0.3;
      channels.forEach((a, i) => {
        const near = Math.max(0, 1 - Math.abs(tx(i) - F.x) / (tw + gap)), s = 1 + 0.14 * near * (inDock ? 1 : 0.4), w = tw * s, h = th * s;
        c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 14 * near; c.shadowOffsetY = 5 * near;
        this.banner(tx(i) - (w - tw) / 2, y0 - (h - th) / 2 - 5 * near, w, h, a, 9 * s); c.restore();
      });
      // one glass highlight that springs from tile to tile
      const s = 1.14, w = tw * s, h = th * s, hx = F.x - (w - tw) / 2, hy = y0 - (h - th) / 2 - 5;
      if (inDock) { c.beginPath(); c.roundRect(hx - 6, hy - 6, w + 12, h + 12, 17); c.strokeStyle = 'rgba(255,255,255,0.10)'; c.lineWidth = 6; c.stroke(); c.beginPath(); c.roundRect(hx, hy, w, h, 11); c.strokeStyle = 'rgba(255,255,255,0.92)'; c.lineWidth = 2; c.stroke(); }
      this.text(ch.name, hx + 6, 404, `600 8.5px ${BODY}`, INK);
      this.footer([['OK', 'Open'], ['1-8', 'Jump to app'], ['BACK', 'Home']]);
    });
  }
  draw_settings() {
    if (this.sub === 'aboutRiven') return this.dp(() => {
      this.tabs();
      this.track('Riven', 48, 190, `600 28px ${HEAD}`, INK, -0.03);
      this.text('Designed & built by', 48, 222, `400 12px ${BODY}`, DIM); this.text('Johnbosco J', 48 + this.ctx.measureText('Designed & built by ').width, 222, `600 12px ${BODY}`, INK);
      this.text('Made by Riven', 48, 242, `400 9px ${BODY}`, DIM);
      this.track('ANDROID TV LAUNCHER · FREE · OPEN SOURCE · NO ADS', 48, 268, `400 7px ${BODY}`, FAINT, 0.3);
      this.wrap('A calm, fast home screen for Android TV 8+ and Google TV. No ads, no sponsored rows. Your apps in full colour, a frosted dock, and Riven\'s own screens for Wi-Fi, Bluetooth, sound and the rest. What you are looking at is modelled on it.', 48, 306, 520, 16, `400 10.5px ${BODY}`, DIM);
      this.footer([['BACK', 'Settings']]);
    });
    this.dp(c => {
      this.tabs();
      this.track('Settings', 48, 108, `600 28px ${HEAD}`, INK, -0.03);
      this.text('Make it yours.', 48, 126, `400 10px ${BODY}`, DIM);
      const rows = this.settingsRows(), f = this.focus.settings, active = this.zone === 'main';
      rows.forEach((r, i) => {
        const y = 150 + i * 44, on = i === f && active;
        this.glass(48, y, 470, 38, 12, on ? INK : 'rgba(255,255,255,0.05)');
        this.text(r.label, 64, y + 23, `500 10.5px ${BODY}`, on ? ONINK : INK);
        if (r.value) { this.text((r.choice && on ? '◀  ' : '') + r.value + (r.choice && on ? '  ▶' : ''), 504, y + 23, `400 9.5px ${BODY}`, on ? 'rgba(10,10,10,0.6)' : DIM, 'right'); }
      });
      const r = rows[f]; this.glass(548, 150, 364, 214, 18);
      this.track(r.label.toUpperCase(), 568, 178, `500 7.5px ${BODY}`, DIM, 0.3);
      this.wrap(r.blurb, 568, 200, 324, 15, `400 10px ${BODY}`, INK);
      if (r.label === 'Background') BACKDROPS.forEach((b, i) => { const x = 568 + (i % 4) * 82, y = 250 + Math.floor(i / 4) * 52, g = c.createLinearGradient(x, y, x + 72, y + 40); g.addColorStop(0, b.colors ? b.colors[0] : this.accent); g.addColorStop(1, b.colors ? b.colors[1] : '#101014'); this.rr(x, y, 72, 40, 8, g, i === this.settings.backdrop ? INK : LINE, i === this.settings.backdrop ? 2 : 0.75); });
      if (r.label === 'Fonts') { this.track('Aa', 568, 300, `600 62px ${HEAD}`, INK, -0.04); this.text('The quick brown fox', 668, 280, `400 12px ${BODY}`, DIM); this.text(TYPEFACES[this.settings.typeface].label, 668, 300, `500 9px ${BODY}`, FAINT); }
      if (r.label === 'About this TV') { this.track(profile.name, 568, 286, `600 30px ${HEAD}`, INK, -0.03); this.wrap(profile.roles.join(' · '), 568, 308, 324, 14, `400 9px ${BODY}`, DIM); }
      this.footer([['OK', r.choice ? 'Change' : 'Open'], ['BACK', 'Home']]);
    });
  }
  draw_saver() {
    const c = this.ctx, t = this.now, a = (Math.sin(t / 5.4) + 1) / 2, b = (Math.sin(t / 6.5 + 1) + 1) / 2, d = (Math.sin(t / 7.5 + 2) + 1) / 2;
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    const blob = (col, cx, cy, r) => { const g = c.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, rgba(col, 0.75)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(0, 0, W, H); };
    blob('#5B4BFF', W * (0.12 + 0.2 * a), H * (0.05 + 0.2 * a), W * 0.52); blob('#13C4A3', W * (0.88 - 0.22 * b), H * (0.45 - 0.15 * b), W * 0.5); blob('#FF4D8D', W * (0.5 + 0.2 * d), H * (1.05 - 0.18 * d), W * 0.45);
    this.dp(() => {
      const now = new Date(), wx = Math.sin(t / 20) * 30, wy = Math.cos(t / 23) * 20;
      this.text(now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/ ?[AP]M/i, ''), 510 + wx, 470 + wy, `400 96px 'Instrument Serif', serif`, INK);
      this.text(now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }), 510 + wx, 508 + wy, `400 14px ${BODY}`, 'rgba(245,245,247,0.8)');
      this.track('RIVEN', 912, 498, `500 7.5px ${BODY}`, DIM, 0.4, 'right'); this.track('MADE BY JOHNBOSCO J', 912, 510, `400 6px ${BODY}`, FAINT, 0.3, 'right');
    });
  }

  draw_about() {
    this.chrome('◀ ▶  Next channel      ‹  Home');
    this.title('About', profile.location);
    let y = 310;
    for (const p of profile.about) y = this.wrap(p, 82, y, 800, 42, `400 28px ${BODY}`, '#d5d7da') + 18;
    this.text('SKILLS', 82, y + 18, `600 22px ${BODY}`, this.accent);
    this.chips(profile.skills, 82, y + 38, 820);
    profile.stats.forEach((s, i) => {
      const x = 960 + (i % 2) * 290, yy = 150 + Math.floor(i / 2) * 250;
      this.rr(x, yy, 270, 230, 20, PANEL, LINE, 1.5);
      this.text(s.value, x + 26, yy + 112, `700 86px ${HEAD}`, this.accent);
      this.wrap(s.label, x + 26, yy + 156, 220, 28, `400 22px ${BODY}`, DIM, 2);
    });
    this.rr(960, 650, 560, 130, 20, PANEL, LINE, 1.5);
    this.text('LANGUAGES', 986, 692, `600 22px ${BODY}`, this.accent);
    this.wrap(languages.map(l => l.name).join('  ·  '), 986, 742, 520, 34, `500 28px ${BODY}`, INK, 1);
  }

  draw_riven() {
    this.chrome('◀ ▶  Next channel      ‹  Home');
    this.title(riven.headline, 'Founded September 2026 · Chennai');
    let y = this.wrap(riven.sub, 82, 320, 640, 46, `500 34px ${HEAD}`, INK) + 14;
    y = this.wrap(riven.body, 82, y, 640, 38, `400 25px ${BODY}`, '#c9ccd1') + 22;
    this.rr(82, y - 8, 640, 4, 2, this.accent + '66');
    this.wrap(riven.site, 82, y + 44, 640, 34, `400 22px ${BODY}`, DIM);
    this.text('PRODUCTS', 800, 172, `600 22px ${BODY}`, this.accent);
    riven.products.forEach((p, i) => {
      const yy = 196 + i * 152;
      this.rr(800, yy, 720, 136, 18, PANEL, LINE, 1.5);
      this.rr(800, yy + 26, 5, 84, 2, this.accent);
      this.text(p.name, 830, yy + 52, `600 34px ${HEAD}`, INK);
      this.wrap(p.line, 830, yy + 88, 660, 30, `400 22px ${BODY}`, DIM, 2);
    });
  }

  draw_projects() {
    if (this.detail) return this.drawProjectDetail();
    this.chrome('▲ ▼ ◀ ▶  Move      ◉  Full story      ‹  Home');
    const cw = 340, chh = 218, g = 20, x0 = (W - (4 * cw + 3 * g)) / 2, y0 = 122, f = this.focus.projects;
    projects.forEach((p, i) => {
      const on = i === f, x = x0 + (i % 4) * (cw + g), y = y0 + Math.floor(i / 4) * (chh + g);
      this.rr(x, y, cw, chh, 18, on ? '#1b1f26' : PANEL, LINE, 1.5);
      this.cover(x + 10, y + 10, cw - 20, 74, i, 11);
      this.wrap(p.tag.toUpperCase(), x + 22, y + 116, cw - 44, 22, `600 17px ${BODY}`, on ? this.accent : FAINT, 1);
      this.text(p.name, x + 22, y + 160, `700 38px ${HEAD}`, INK);
      this.wrap(p.line, x + 22, y + 194, cw - 44, 26, `400 21px ${BODY}`, DIM, 1);
    });
    this.ring('projects', x0 + (f % 4) * (cw + g), y0 + Math.floor(f / 4) * (chh + g), cw, chh);
  }
  drawProjectDetail() {
    const i = this.focus.projects, p = projects[i];
    this.chrome(`◀ ▶  Previous / next      ${p.link ? '◉  Open on GitHub      ' : ''}‹  All projects`);
    this.text(p.tag.toUpperCase(), 82, 176, `600 22px ${BODY}`, this.accent);
    this.text(p.name, 76, 276, `700 104px ${HEAD}`, INK);
    this.text(p.line, 82, 332, `500 34px ${HEAD}`, '#d5d7da');
    let y = this.wrap(p.body, 82, 410, 900, 42, `400 28px ${BODY}`, '#c9ccd1') + 16;
    this.chips(p.stack, 82, y, 900);
    this.rr(1060, 136, 460, 420, 22, PANEL, LINE, 1.5);
    this.cover(1074, 150, 432, 170, i, 14);
    this.text('WHEN', 1090, 366, `600 18px ${BODY}`, FAINT); this.text(p.when, 1090, 402, `500 28px ${HEAD}`, INK);
    this.text('ROLE', 1090, 452, `600 18px ${BODY}`, FAINT); this.wrap(p.role, 1090, 488, 400, 34, `500 26px ${HEAD}`, INK, 2);
    this.text(`${i + 1} / ${projects.length}`, 1490, 366, `500 20px ${BODY}`, FAINT, 'right');
    if (p.link) {
      this.ctx.save(); this.ctx.shadowColor = this.accent; this.ctx.shadowBlur = 30; this.rr(1060, 580, 460, 86, 22, this.accent); this.ctx.restore();
      this.text('◉  Open on GitHub', 1290, 634, `600 28px ${HEAD}`, '#0c0e11', 'center');
    } else {
      this.rr(1060, 580, 460, 86, 22, null, LINE, 1.5);
      this.text('Private repository', 1290, 634, `500 26px ${HEAD}`, FAINT, 'center');
    }
  }

  drawList(items, focus, render, detail) {
    const rowH = Math.min(96, 640 / items.length);
    items.forEach((it, i) => {
      const on = i === focus, y = 130 + i * rowH;
      if (on) this.ring('list:' + this.screen, 70, y, 600, rowH - 8, 14);
      render(it, 94, y, on, rowH);
    });
    this.rr(710, 130, 810, 650, 22, PANEL, LINE, 1.5);
    detail(items[focus], 750, 190);
  }
  draw_experience() {
    this.chrome('▲ ▼  Move      ‹  Home');
    this.drawList(experience, this.focus.experience, (e, x, y, on, h) => {
      this.wrap(e.title, x, y + h * 0.42, 560, 30, `600 26px ${HEAD}`, on ? INK : '#c9ccd1', 1);
      this.wrap(`${e.org}  ·  ${e.when}`, x, y + h * 0.42 + 30, 560, 24, `400 21px ${BODY}`, on ? this.accent : FAINT, 1);
    }, (e, x, y) => {
      this.text(e.when.toUpperCase(), x, y, `600 22px ${BODY}`, this.accent);
      let yy = this.wrap(e.title, x, y + 62, 730, 56, `700 50px ${HEAD}`, INK, 2);
      this.text(e.org, x, yy + 4, `500 30px ${HEAD}`, '#d5d7da');
      this.text(e.where, x, yy + 42, `400 22px ${BODY}`, FAINT);
      yy += 100;
      for (const p of e.points) {
        this.rr(x, yy - 16, 10, 10, 5, this.accent);
        yy = this.wrap(p, x + 30, yy, 700, 36, `400 25px ${BODY}`, '#c9ccd1') + 18;
      }
    });
  }
  draw_awards() {
    this.chrome('▲ ▼  Move      ‹  Home');
    this.drawList(awards, this.focus.awards, (a, x, y, on, h) => {
      this.rr(x, y + h * 0.5 - 30, 78, 46, 12, on ? this.accent : 'rgba(255,255,255,0.06)');
      this.text(a.place, x + 39, y + h * 0.5 + 3, `700 22px ${HEAD}`, on ? '#0c0e11' : DIM, 'center');
      this.wrap(a.title, x + 98, y + h * 0.42, 450, 28, `600 24px ${HEAD}`, on ? INK : '#c9ccd1', 1);
      this.wrap(`${a.by}  ·  ${a.when}`, x + 98, y + h * 0.42 + 28, 450, 24, `400 20px ${BODY}`, FAINT, 1);
    }, (a, x, y) => {
      this.text(a.place === '1st' ? 'FIRST PRIZE' : a.place.toUpperCase() + ' PLACE', x, y, `600 22px ${BODY}`, this.accent);
      let yy = this.wrap(a.title, x, y + 66, 730, 58, `700 52px ${HEAD}`, INK, 3);
      this.text(a.by, x, yy + 4, `500 28px ${HEAD}`, '#d5d7da');
      this.text(a.when, x, yy + 42, `400 22px ${BODY}`, FAINT);
      this.wrap(a.body, x, yy + 110, 730, 40, `400 27px ${BODY}`, '#c9ccd1');
    });
  }

  draw_offclock() {
    this.chrome('◀ ▶  Next channel      ‹  Home');
    this.title('Off the Clock', 'Machines, music and the odd stage');
    offClock.forEach((o, i) => {
      const x = 80 + (i % 2) * 470, y = 290 + Math.floor(i / 2) * 250;
      this.rr(x, y, 450, 230, 20, PANEL, LINE, 1.5);
      this.rr(x + 28, y + 30, 44, 6, 3, this.accent);
      this.text(o.title, x + 28, y + 88, `700 38px ${HEAD}`, INK);
      this.wrap(o.body, x + 28, y + 128, 396, 30, `400 21px ${BODY}`, DIM, 3);
    });
    this.rr(1050, 150, 470, 630, 20, PANEL, LINE, 1.5);
    this.text('LANGUAGES', 1082, 204, `600 22px ${BODY}`, this.accent);
    languages.forEach((l, i) => {
      const y = 280 + i * 124;
      this.text(l.name, 1082, y, `700 44px ${HEAD}`, INK);
      this.text(l.level, 1082, y + 36, `400 22px ${BODY}`, DIM);
    });
  }

  draw_music() {
    this.dp(c => {
      this.tabs(); const np = audio.nowPlaying(), f = this.focus.music, fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
      this.track('MUSIC', 48, 47, `500 7.5px ${BODY}`, DIM, 0.3);
      this.track(np ? np.title : 'Nothing playing', 46, 150, `600 40px ${HEAD}`, INK, -0.03);
      this.text(np ? np.by : 'Add songs to public/audio/music and list them in data.js', 48, 174, `400 11px ${BODY}`, DIM);
      if (np) {
        this.rr(48, 196, 420, 4, 2, 'rgba(255,255,255,0.14)'); this.rr(48, 196, 420 * (np.duration ? np.time / np.duration : 0), 4, 2, INK);
        this.text(fmt(np.time), 48, 216, `400 8.5px ${BODY}`, FAINT); this.text(np.duration ? fmt(np.duration) : '', 468, 216, `400 8.5px ${BODY}`, FAINT, 'right');
        this.text(np.paused ? 'Paused' : 'Playing at 20% volume · shuffles when a song ends', 48, 240, `400 9px ${BODY}`, FAINT);
        // little equaliser
        for (let i = 0; i < 18; i++) { const h = np.paused ? 3 : 4 + Math.abs(Math.sin(this.now * (2.2 + i * 0.37) + i)) * 26; this.rr(48 + i * 9, 300 - h, 5, h, 2, this.accent); }
      }
      this.glass(520, 120, 392, 44 * music.length + 20, 18);
      music.forEach((m, i) => {
        const y = 130 + i * 44, on = i === f, live = np && np.index === i;
        if (on) this.rr(530, y, 372, 38, 12, INK);
        this.text(live ? (np.paused ? '❙❙' : '▶') : String(i + 1), 548, y + 23, `500 10px ${BODY}`, on ? ONINK : live ? this.accent : FAINT);
        this.wrap(m.title, 572, y + 17, 310, 12, `600 10.5px ${BODY}`, on ? ONINK : INK, 1);
        this.wrap(m.by, 572, y + 30, 310, 11, `400 8px ${BODY}`, on ? 'rgba(10,10,10,0.6)' : FAINT, 1);
      });
      this.footer([['OK', 'Play this'], ['◀ ▶', 'Previous / next'], ['▶❙❙', 'Pause'], ['BACK', 'Home']]);
    });
  }

  draw_contact() {
    this.chrome('▲ ▼  Move      ◉  Open      ‹  Home');
    this.title('Say howdy.', 'Open to work · On-site or hybrid, Chennai');
    contact.forEach((ct, i) => {
      const on = i === this.focus.contact, y = 300 + i * 118;
      this.rr(80, y, 940, 100, 18, on ? '#1d2128' : PANEL, on ? this.accent : LINE, on ? 4 : 1.5);
      this.text(ct.label.toUpperCase(), 112, y + 60, `600 22px ${BODY}`, on ? this.accent : FAINT);
      this.text(ct.value, 290, y + 64, `600 34px ${HEAD}`, on ? INK : '#c9ccd1');
      if (on) this.text('◉  Open', 990, y + 62, `600 22px ${BODY}`, this.accent, 'right');
    });
    this.rr(1080, 300, 440, 454, 20, PANEL, LINE, 1.5);
    this.text('THE SHORT VERSION', 1110, 352, `600 22px ${BODY}`, this.accent);
    this.wrap('Full-stack developer and AI/ML engineer. Founder of Riven. Building intelligent products and scalable solutions.', 1110, 404, 380, 40, `400 27px ${BODY}`, '#d5d7da');
  }
}
