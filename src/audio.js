// Sound. Everything has a synthesised default, and every sound can be replaced by a real
// recording: drop a file in public/audio/ with the name listed in FILES and it is used instead.
//   public/audio/music/*.mp3          background songs listed in data.js; shuffled, 2.5% volume
//   public/audio/typewriter.mp3       one key strike (pitch is varied per letter)
//   public/audio/footstep.mp3         one step
//   public/audio/voice/<guide>/<lineId>.mp3   a spoken line; drives the guide's lip sync
import { music as TRACKS } from './data.js';

const FILES = { typewriter: 'typewriter.mp3', footstep: 'footstep.mp3', bell: 'bell.mp3' };

export const audio = {
  on: true, ctx: null, buffers: {}, analyser: null, voiceEl: null, voiceLevel: 0, known: new Map(),
  // the jukebox: shuffled playlist with fades, quiet by default
  music: { tracks: [], order: [], at: -1, el: null, vol: 0.025, duck: 1, paused: false, ready: false },

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 1 : 0; this.master.connect(this.ctx.destination);
    const n = this.ctx.sampleRate * 1.5, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.noise = b;
    for (const [k, f] of Object.entries(FILES)) this.load(k, `/audio/${f}`);
    this.startMusic();
    // be quiet when the tab is not being looked at
    document.addEventListener('visibilitychange', () => { const M = this.music; if (!M.el) return; if (document.hidden) M.el.pause(); else if (!M.paused) M.el.play().catch(() => {}); });
  },
  // public/audio/manifest.json lists the optional files that are really there, so nothing is requested blind
  async exists(url) {
    this.listed ||= fetch('/audio/manifest.json').then(r => r.ok ? r.json() : { files: [] }).then(j => new Set((j.files || []).map(f => '/audio/' + f))).catch(() => new Set());
    return (await this.listed).has(url);
  },
  async load(key, url) {
    if (!(await this.exists(url))) return;
    try { this.buffers[key] = await this.ctx.decodeAudioData(await (await fetch(url)).arrayBuffer()); } catch { /* keep the synth */ }
  },
  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 1 : 0; if (this.voiceEl) this.voiceEl.muted = !v; },
  async startMusic() {
    const M = this.music;
    for (const t of TRACKS) if (await this.exists(`/audio/music/${t.file}`)) M.tracks.push(t);
    if (!M.tracks.length) return;
    M.ready = true; this.shuffle(); this.playAt(0);
    // one timer handles every fade: in at the start, out before the end, and for pause, skip and ducking
    setInterval(() => {
      const el = M.el; if (!el) return;
      const left = (el.duration || 1e9) - el.currentTime, edge = Math.min(1, el.currentTime / 3, left / 3.5);
      const want = (this.on && !M.paused && !M.leaving ? M.vol : 0) * Math.max(0, edge) * M.duck;
      el.volume = Math.max(0, Math.min(1, el.volume + Math.sign(want - el.volume) * Math.min(Math.abs(want - el.volume), Math.max(0.001, M.vol * 0.035))));
      if (M.paused && el.volume < 0.004 && !el.paused) el.pause();
      if (M.leaving && el.volume < 0.004) { M.leaving = false; this.playAt(M.nextAt); }
    }, 50);
  },
  shuffle() { const M = this.music, last = M.order[M.at]; M.order = M.tracks.map((_, i) => i).sort(() => Math.random() - 0.5); if (M.order.length > 1 && M.order[0] === last) M.order.push(M.order.shift()); },
  playAt(i) {
    const M = this.music; if (!M.ready) return;
    if (i >= M.order.length) { this.shuffle(); i = 0; } if (i < 0) i = M.order.length - 1;
    M.at = i; if (M.el) { M.el.pause(); M.el.onended = null; }
    const el = M.el = new Audio(`/audio/music/${M.tracks[M.order[i]].file}`); el.volume = 0; el.onended = () => this.playAt(M.at + 1);
    if (!M.paused) el.play().catch(() => {});
  },
  // fade the current song out, then start another
  skip(dir = 1) { const M = this.music; if (!M.ready) return; M.paused = false; M.nextAt = M.at + dir; M.leaving = true; },
  pick(trackIndex) { const M = this.music; if (!M.ready) return; let i = M.order.indexOf(trackIndex); if (i < 0) return; if (i === M.at && !M.paused) return; M.paused = false; M.nextAt = i; M.leaving = true; },
  toggleMusic() { const M = this.music; if (!M.ready) return; M.paused = !M.paused; if (!M.paused) M.el.play().catch(() => {}); },
  nowPlaying() { const M = this.music; if (!M.ready || !M.el) return null; return { index: M.order[M.at], ...M.tracks[M.order[M.at]], time: M.el.currentTime, duration: M.el.duration || 0, paused: M.paused }; },

  sample(key, vol = 1, rate = 1) {
    const b = this.buffers[key]; if (!b) return false;
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); s.buffer = b; s.playbackRate.value = rate; g.gain.value = vol; s.connect(g).connect(this.master); s.start(); return true;
  },
  // a burst of filtered noise: the building block for clacks, steps and thumps
  burst({ dur = 0.05, type = 'bandpass', freq = 1500, q = 1, vol = 0.2, attack = 0.001, at = 0 }) {
    const a = this.ctx, t = a.currentTime + at, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  },
  tone({ freq = 440, dur = 0.2, type = 'sine', vol = 0.1, slide = 0, at = 0, attack = 0.004 }) {
    const a = this.ctx, t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.03);
  },
  ok() { return this.on && this.ctx; },

  // a mechanical typewriter key: type-bar slap, a duller body thunk, and a little platen ring
  type() {
    if (!this.ok()) return; const r = 0.92 + Math.random() * 0.18;
    if (this.sample('typewriter', 0.5, r)) return;
    this.burst({ dur: 0.022, freq: 3400 * r, q: 1.4, vol: 0.2 }); this.burst({ dur: 0.05, type: 'lowpass', freq: 520 * r, vol: 0.26, at: 0.004 });
    this.tone({ freq: 1750 * r, dur: 0.03, type: 'triangle', vol: 0.012, at: 0.002 });
  },
  bell() { if (!this.ok()) return; if (this.sample('bell', 0.4)) return; this.tone({ freq: 2093, dur: 0.9, vol: 0.05 }); this.tone({ freq: 4186, dur: 0.5, vol: 0.02 }); },
  // heel then toe on a hard floor
  step(soft = false) {
    if (!this.ok()) return; const r = 0.9 + Math.random() * 0.2;
    if (this.sample('footstep', soft ? 0.25 : 0.45, r)) return;
    this.burst({ dur: 0.07, type: 'lowpass', freq: (soft ? 260 : 420) * r, vol: soft ? 0.2 : 0.34 }); this.tone({ freq: 74 * r, dur: 0.09, vol: soft ? 0.08 : 0.16, slide: 0.6 });
    this.burst({ dur: 0.035, freq: 1900 * r, q: 0.8, vol: soft ? 0.015 : 0.05, at: 0.055 });
  },
  hop() { if (this.ok()) { this.burst({ dur: 0.05, type: 'lowpass', freq: 600, vol: 0.12 }); this.tone({ freq: 190, dur: 0.07, vol: 0.05, slide: 0.7 }); } },
  click() { if (this.ok()) { this.burst({ dur: 0.012, freq: 2600, q: 2, vol: 0.14 }); this.tone({ freq: 1100, dur: 0.02, type: 'triangle', vol: 0.02 }); } },
  move() { if (this.ok()) this.tone({ freq: 560, dur: 0.05, type: 'triangle', vol: 0.035 }); },
  select() { if (this.ok()) { this.tone({ freq: 660, dur: 0.08, type: 'triangle', vol: 0.05 }); this.tone({ freq: 990, dur: 0.12, type: 'triangle', vol: 0.05, at: 0.06 }); } },
  power() { if (this.ok()) { this.tone({ freq: 160, dur: 0.55, vol: 0.08, slide: 3.5 }); this.tone({ freq: 784, dur: 0.4, type: 'triangle', vol: 0.05, at: 0.38 }); } },
  chime() { if (this.ok()) [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, dur: 0.5, type: 'triangle', vol: 0.045, at: i * 0.07 })); },
  cluck() { if (this.ok()) for (let i = 0; i < 3; i++) this.tone({ freq: 620 + Math.random() * 200, dur: 0.06, type: 'square', vol: 0.03, slide: 1.5, at: i * 0.11 }); },
  yawn() { if (this.ok()) this.tone({ freq: 300, dur: 1.1, type: 'sine', vol: 0.05, slide: 0.45 }); },
  whoosh() { if (this.ok()) this.burst({ dur: 0.7, freq: 900, q: 0.6, vol: 0.12, attack: 0.3 }); },
  engine() { if (this.ok()) { for (let i = 0; i < 5; i++) this.tone({ freq: 55, dur: 0.12, type: 'sawtooth', vol: 0.06, at: i * 0.13 }); this.tone({ freq: 62, dur: 2.2, type: 'sawtooth', vol: 0.05, slide: 1.25, at: 0.65 }); this.burst({ dur: 2.2, type: 'lowpass', freq: 180, vol: 0.12, at: 0.65, attack: 0.2 }); } },
  horn() { if (this.ok()) { this.tone({ freq: 420, dur: 0.45, type: 'square', vol: 0.04 }); this.tone({ freq: 520, dur: 0.45, type: 'square', vol: 0.04 }); } },

  // keyboard voices: additive synthesis with a hammer transient and a two-stage decay
  note(freq, voice = 'piano') {
    if (!this.ok()) return; const a = this.ctx, t = a.currentTime, out = a.createGain(), lp = a.createBiquadFilter();
    lp.type = 'lowpass'; out.connect(lp).connect(this.master);
    const V = {
      piano: { parts: [1, 0.55, 0.3, 0.18, 0.1, 0.07, 0.04, 0.03], inh: 0.0004, a: 0.004, d1: 0.35, lvl: 0.35, d2: 2.6, cut: [6500, 1400], vol: 0.2, hammer: 0.1, wave: 'sine' },
      epiano: { parts: [1, 0.12, 0.3, 0.04, 0.1], inh: 0, a: 0.003, d1: 0.5, lvl: 0.4, d2: 2.2, cut: [3800, 1200], vol: 0.22, hammer: 0.03, wave: 'sine', trem: 5 },
      organ: { parts: [1, 0.8, 0.5, 0.6, 0, 0.3, 0, 0.25], inh: 0, a: 0.02, d1: 0.1, lvl: 0.95, d2: 0.9, cut: [5200, 4200], vol: 0.11, hammer: 0, wave: 'sine', sustain: 0.6 },
      strings: { parts: [1, 0.5, 0.35, 0.22, 0.15, 0.1], inh: 0, a: 0.16, d1: 0.3, lvl: 0.85, d2: 1.5, cut: [3200, 2200], vol: 0.09, hammer: 0, wave: 'sawtooth', detune: 6, sustain: 0.5 },
    }[voice] || null;
    if (!V) return;
    const hold = V.sustain || 0, end = t + V.a + V.d1 + hold + V.d2;
    out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(V.vol, t + V.a); out.gain.exponentialRampToValueAtTime(V.vol * V.lvl, t + V.a + V.d1);
    out.gain.setValueAtTime(V.vol * V.lvl, t + V.a + V.d1 + hold); out.gain.exponentialRampToValueAtTime(0.0001, end);
    lp.frequency.setValueAtTime(Math.min(12000, V.cut[0] + freq * 2), t); lp.frequency.exponentialRampToValueAtTime(V.cut[1] + freq, t + V.a + V.d1 + 0.4);
    V.parts.forEach((amp, i) => {
      if (!amp) return; const n = i + 1, f = freq * n * Math.sqrt(1 + V.inh * n * n); if (f > 14000) return;
      for (const det of V.detune ? [-V.detune, V.detune] : [0]) {
        const o = a.createOscillator(), g = a.createGain(); o.type = V.wave; o.frequency.value = f; o.detune.value = det;
        g.gain.setValueAtTime(amp / (V.detune ? 2 : 1), t); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, amp * Math.pow(0.5, i)), t + V.a + V.d1 + 0.5);
        o.connect(g).connect(out); o.start(t); o.stop(end + 0.05);
      }
    });
    if (V.trem) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = V.trem; lg.gain.value = V.vol * 0.25; l.connect(lg).connect(out.gain); l.start(t); l.stop(end); }
    if (V.hammer) this.burst({ dur: 0.03, freq: Math.min(5000, freq * 6), q: 0.7, vol: V.hammer });
  },

  // a recorded line for a guide, if one exists; resolves to its duration (or null)
  async voice(guide, id) {
    const url = `/audio/voice/${guide}/${id}.mp3`;
    if (!this.ctx || !(await this.exists(url))) return null;
    this.stopVoice();
    const el = this.voiceEl = new Audio(url); el.muted = !this.on; el.crossOrigin = 'anonymous';
    try {
      const src = this.ctx.createMediaElementSource(el); this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 256; this.bins = new Uint8Array(128);
      src.connect(this.analyser); this.analyser.connect(this.master);
      await new Promise((res, rej) => { el.onloadedmetadata = res; el.onerror = rej; });
      this.music.duck = 0.45;
      el.onended = () => { this.analyser = null; this.music.duck = 1; };
      await el.play(); return el.duration;
    } catch { this.analyser = null; return null; }
  },
  stopVoice() { if (this.voiceEl) { this.voiceEl.pause(); this.voiceEl = null; } this.analyser = null; this.music.duck = 1; },
  // 0..1 loudness of the playing voice, for lip sync
  level() {
    if (!this.analyser) return -1;
    this.analyser.getByteTimeDomainData(this.bins); let s = 0; for (const v of this.bins) s += (v - 128) * (v - 128);
    return Math.min(1, Math.sqrt(s / this.bins.length) / 38);
  },
};
