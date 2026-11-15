import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { TV, fontsReady } from './tv.js';
import { Sheriff as Guide } from './sheriff.js';
import { renderPlain } from './plain.js';
import { channels, guides as guideNames } from './data.js';
import { createHouse } from './house.js';
import { audio } from './audio.js';
import { openBrowser, closeBrowser, placeBrowser } from './browser.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

// fast ray tests against the house, for walking and clicking
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree; THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree; THREE.Mesh.prototype.raycast = acceleratedRaycast;

const $ = id => document.getElementById(id);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const wait = s => new Promise(r => setTimeout(r, s * 1000));
const clamp = THREE.MathUtils.clamp;

// ---------- places (metres, y up; the TV wall is at z = +0.35) ----------
const TV_CENTER = V(-0.15, 1.66, 0.35), EYE = 1.62;
const SPOT = { table: V(0.0, 0.415, -0.52), ledge: V(0.8, 1.2, 0.2), remote: V(-0.42, 0.42, -0.98), nap: V(0.6, 0.86, -2.35) };
const SEAT = { eye: V(-0.15, 1.12, -1.95), stand: V(1.25, 0.15, -1.35) };

// ---------- renderer ----------
const canvas = $('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const TOUCH = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 1 || /[?&]touch=1/.test(location.search);
if (TOUCH) document.body.classList.add('touch');
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1.5 : 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.8;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, 0.03, 80);
camera.rotation.order = 'YXZ'; scene.add(camera);

const skyCanvas = document.createElement('canvas'); skyCanvas.width = 4; skyCanvas.height = 256;
const skyTex = new THREE.CanvasTexture(skyCanvas); skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = skyTex;
function paintSky(cols) {
  const g = skyCanvas.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  [0, 0.45, 0.62, 0.72, 1].forEach((o, i) => gr.addColorStop(o, '#' + cols[i].getHexString()));
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256); skyTex.needsUpdate = true;
}
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const hemi = new THREE.HemisphereLight(0x8fa0c8, 0x3a2e26, 0.3); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xff9e66, 1.1);
sun.target.position.set(0, 0.6, -2.2); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(TOUCH ? 1024 : 2048, TOUCH ? 1024 : 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -6, near: 1, far: 30 });
const lamps = [], stripMats = [];
const lamp = (x, y, z, i, c = 0xffd6a0, d = 9) => { const l = new THREE.PointLight(c, i, d, 1.8); l.position.set(x, y, z); l.userData.base = i; scene.add(l); lamps.push(l); return l; };
lamp(-0.6, 2.75, -0.95, 2.6); lamp(-0.6, 2.4, -4.6, 2.2); lamp(-0.6, 5.0, -3.8, 1.6); lamp(1.5, 2.3, -3.2, 1.0); lamp(1.4, 2.3, -6.6, 1.2);
const tvGlow = new THREE.PointLight(0xffffff, 0, 6, 1.8); tvGlow.position.set(-0.15, 1.6, -0.25); scene.add(tvGlow);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { samples: 4, type: THREE.HalfFloatType }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.22, 0.6, 1.0); composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- lighting moods ----------
const C = h => new THREE.Color(h);
const MOODS = {
  morning: { sky: ['#4f97e0', '#8fc4f2', '#cfe6f7', '#eef5f8', '#b9c7b0'], sun: '#fff2dd', sunI: 2.3, sunPos: [-7, 9, -1], hemiSky: '#cfe2ff', hemi: 0.8, lamps: 0.1, strip: 0.25, exp: 0.84, env: 0.5, say: 'Morning it is. Curtains open, coffee on.' },
  golden: { sky: ['#141b33', '#3b3a5c', '#c47a5a', '#f0b27a', '#2a2320'], sun: '#ff9e66', sunI: 1.1, sunPos: [-9, 4.2, -5.5], hemiSky: '#8fa0c8', hemi: 0.3, lamps: 1, strip: 1.6, exp: 0.8, env: 0.22, say: 'Golden hour. Chennai does a fine sunset.' },
  night: { sky: ['#03050c', '#070b18', '#0d1326', '#141a30', '#05060a'], sun: '#6f8cff', sunI: 0.22, sunPos: [-6, 8, -6], hemiSky: '#5a6ea8', hemi: 0.1, lamps: 1.25, strip: 2.4, exp: 0.86, env: 0.08, say: 'Night owl, are we? So is he.' },
  movie: { sky: ['#020204', '#030408', '#05060b', '#07080e', '#020203'], sun: '#6f8cff', sunI: 0.04, sunPos: [-6, 8, -6], hemiSky: '#404a70', hemi: 0.035, lamps: 0.09, strip: 0.2, exp: 0.92, env: 0.03, say: 'Movie night. Lights down, eyes on the screen.' },
};
const mood = { name: 'golden', sky: MOODS.golden.sky.map(C), sun: C(MOODS.golden.sun), sunPos: new THREE.Vector3(...MOODS.golden.sunPos), hemiSky: C(MOODS.golden.hemiSky), n: { sunI: 1.1, hemi: 0.3, lamps: 1, strip: 1.6, exp: 0.8, env: 0.22 } };
function applyMood() {
  paintSky(mood.sky); sun.color.copy(mood.sun); sun.intensity = mood.n.sunI; sun.position.copy(mood.sunPos);
  hemi.color.copy(mood.hemiSky); hemi.intensity = mood.n.hemi; lamps.forEach(l => { l.intensity = l.userData.base * mood.n.lamps; });
  stripMats.forEach(m => { m.emissiveIntensity = mood.n.strip; }); renderer.toneMappingExposure = mood.n.exp; scene.environmentIntensity = mood.n.env;
}
function setMood(name) {
  if (name === mood.name) return; const M = MOODS[name]; mood.name = name;
  const a = { sky: mood.sky.map(c => c.clone()), sun: mood.sun.clone(), sunPos: mood.sunPos.clone(), hemiSky: mood.hemiSky.clone(), n: { ...mood.n } };
  const b = { sky: M.sky.map(C), sun: C(M.sun), sunPos: new THREE.Vector3(...M.sunPos), hemiSky: C(M.hemiSky) };
  tween(1.5, k => {
    mood.sky.forEach((c, i) => c.lerpColors(a.sky[i], b.sky[i], k)); mood.sun.lerpColors(a.sun, b.sun, k); mood.sunPos.lerpVectors(a.sunPos, b.sunPos, k); mood.hemiSky.lerpColors(a.hemiSky, b.hemiSky, k);
    for (const key in mood.n) mood.n[key] = a.n[key] + (M[key] - a.n[key]) * k;
    applyMood();
  });
  document.querySelectorAll('#lights [data-mood]').forEach(b => b.classList.toggle('on', b.dataset.mood === name));
  audio.click(); guide().play('think', 1.6); say(M.say, { auto: true, hold: 2.5, id: 'mood-' + name });
}
applyMood();

// ---------- tweens ----------
const tweens = [];
function tween(dur, fn, e = ease) { return new Promise(res => tweens.push({ t: 0, dur, fn, e, res })); }

// ---------- state ----------
const state = { phase: 'boot', t: 0, hover: null, hasRemote: false, remoteIn: 'table', raise: 0, keyAt: -9, station: null, toured: false, freeT: 0, tireAt: 60 + Math.random() * 60, handed: false, busy: false, rpsAt: 140 + Math.random() * 60, henAt: 35 + Math.random() * 40 };
// the visitor: `pos` is the feet, `view` is what the camera uses when a scripted move owns it
const player = { pos: V(1.45, 0.15, -7.2), yaw: Math.PI, pitch: -0.3, mode: 'cine', stride: 0, bob: 0, vel: 0, view: null, fov: 58 };
const keys = new Set(), ptr = { x: 0, y: 0, sx: 0, sy: 0 }, stick = { x: 0, y: 0 };
const tv = new TV();
const sheriff = new Guide('sheriff'), ranger = new Guide('ranger');
let active = sheriff; const guide = () => active;
scene.add(sheriff.root, ranger.root); ranger.root.visible = false;
let remote, remoteParts = {}, marker, house, colliders = [];

// ---------- world ----------
const NOCOLLIDE = /^(vidro|agua|porcelana|planta|luz)/;
function fixMaterials(root) {
  const cache = new Map();
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    const m = o.material, n = (m.name || '').trim();
    // the desk chair upstairs is where the visitor sits, so it goes
    if (/^Cylinder010/.test(o.name) || /^Cylinder010/.test(o.parent?.name || '')) { o.visible = false; return; }
    if (!NOCOLLIDE.test(n) && !/^Cube019/.test(o.name) && !/^Cube019/.test(o.parent?.name || '')) colliders.push(o);
    if (cache.has(m)) { o.material = cache.get(m); return; }
    let out = m;
    if (n === 'luz') { out = new THREE.MeshStandardMaterial({ color: 0xfff1dc, emissive: 0xffd9a6, emissiveIntensity: 1.6 }); stripMats.push(out); o.castShadow = false; }
    else if (n.startsWith('vidro') || n === 'agua') { out = new THREE.MeshPhysicalMaterial({ color: 0xcfe3ee, transparent: true, opacity: 0.1, roughness: 0.02, metalness: 0, envMapIntensity: 1.6, depthWrite: false }); o.castShadow = false; o.receiveShadow = false; }
    else if (n === 'plastico preto') out = new THREE.MeshStandardMaterial({ color: 0x08090a, roughness: 0.25 });
    else if (n.startsWith('metal')) out = new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.32, metalness: 0.9 });
    else if (n === 'porcelana') out = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.2 });
    else if (n === 'mdf branco') out = new THREE.MeshStandardMaterial({ color: 0xece8e0, roughness: 0.55 });
    else if (n === 'mdf cinza') out = new THREE.MeshStandardMaterial({ color: 0x4a4744, roughness: 0.6 });
    else if (n === 'piso') { m.roughness = 0.55; m.metalness = 0; }
    else if (n.startsWith('planta')) { m.alphaTest = 0.4; m.side = THREE.DoubleSide; m.transparent = false; }
    else if (!n || !m.map && m.color && m.color.r > 0.78 && m.color.g > 0.78) out = new THREE.MeshStandardMaterial({ color: 0xe6e1d8, roughness: 0.85 });
    if (out.isMeshStandardMaterial && out.map) out.map.anisotropy = 8;
    cache.set(m, out); o.material = out;
  });
}
const rc = new THREE.Raycaster(), DOWN = V(0, -1, 0); rc.firstHitOnly = true;
function cast(from, dir, far = 5) { rc.set(from, dir); rc.far = far; const h = rc.intersectObjects(colliders, false)[0]; return h ? h.point : null; }
// height of the first surface below (x, fromY, z), or null
function drop(x, z, fromY, maxDist = 6) { rc.set(V(x, fromY, z), DOWN); rc.far = maxDist; const h = rc.intersectObjects(colliders, false)[0]; return h ? h.point.y : null; }
function blocked(from, dir, far, heights) {
  for (const h of heights) { rc.set(V(from.x, from.y + h, from.z), dir); rc.far = far; if (rc.intersectObjects(colliders, false).length) return true; }
  return false;
}

function buildScreen() {
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.92, 0.03), new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.3 }));
  bezel.position.set(TV_CENTER.x, TV_CENTER.y, TV_CENTER.z - 0.018); scene.add(bezel);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.58, 0.889), new THREE.MeshBasicMaterial({ map: tv.texture, toneMapped: false, color: 0xe2e2e2 }));
  scr.position.set(TV_CENTER.x, TV_CENTER.y, TV_CENTER.z - 0.0345); scr.rotation.y = Math.PI; scene.add(scr);
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.2), new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.6 }));
  ledge.position.set(SPOT.ledge.x, SPOT.ledge.y - 0.015, 0.25); ledge.castShadow = true; ledge.receiveShadow = true; scene.add(ledge);
}
function iconTexture(draw) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.strokeStyle = g.fillStyle = '#e9eaec'; g.lineWidth = 10; g.lineCap = g.lineJoin = 'round'; draw(g);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function setupRemote(gltf) {
  remote = new THREE.Group(); remote.add(gltf.scene);
  const alu = new THREE.MeshStandardMaterial({ color: 0xd3d5d8, roughness: 0.34, metalness: 0.95 });
  const btn = () => new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.42, metalness: 0.1, emissive: 0x000000 });
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true;
    const isBtn = !['body', 'top', 'power_border'].includes(o.name);
    o.material = isBtn ? btn() : alu;
    if (o.name === 'top') o.material = new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.3 });
    if (isBtn) { remoteParts[o.name] = o; o.userData.rest = o.position.clone(); }
    if (o.name === 'power' || o.name === 'power_border') o.scale.set(1.5, 1, 1.5);
  });
  const icon = (x, z, size, draw) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: iconTexture(draw), transparent: true, depthWrite: false, toneMapped: false, opacity: 0.9 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.0074, z); remote.add(m);
  };
  const chev = (g, r) => { g.save(); g.translate(64, 64); g.rotate(r); g.beginPath(); g.moveTo(-16, 10); g.lineTo(0, -8); g.lineTo(16, 10); g.stroke(); g.restore(); };
  icon(-0.0083, -0.016, 0.0075, g => { g.beginPath(); g.moveTo(76, 30); g.lineTo(42, 64); g.lineTo(76, 98); g.stroke(); });
  icon(0.0083, -0.016, 0.0075, g => { g.beginPath(); g.roundRect(22, 32, 84, 54, 10); g.stroke(); g.beginPath(); g.moveTo(44, 106); g.lineTo(84, 106); g.stroke(); });
  icon(-0.0083, -0.0003, 0.0075, g => { g.beginPath(); g.moveTo(26, 34); g.lineTo(62, 64); g.lineTo(26, 94); g.closePath(); g.fill(); g.beginPath(); g.moveTo(80, 36); g.lineTo(80, 92); g.moveTo(102, 36); g.lineTo(102, 92); g.stroke(); });
  icon(-0.0083, 0.0168, 0.0075, g => { g.beginPath(); g.moveTo(24, 52); g.lineTo(44, 52); g.lineTo(68, 30); g.lineTo(68, 98); g.lineTo(44, 76); g.lineTo(24, 76); g.closePath(); g.fill(); g.beginPath(); g.moveTo(84, 48); g.lineTo(108, 80); g.moveTo(108, 48); g.lineTo(84, 80); g.stroke(); });
  icon(0.0083, 0.0035, 0.0065, g => { g.beginPath(); g.moveTo(64, 30); g.lineTo(64, 98); g.moveTo(30, 64); g.lineTo(98, 64); g.stroke(); });
  icon(0.0083, 0.0135, 0.0065, g => { g.beginPath(); g.moveTo(30, 64); g.lineTo(98, 64); g.stroke(); });
  icon(0.0131, -0.0596, 0.0052, g => { g.lineWidth = 14; g.beginPath(); g.arc(64, 68, 36, -Math.PI * 0.3, Math.PI * 1.3); g.stroke(); g.beginPath(); g.moveTo(64, 18); g.lineTo(64, 62); g.stroke(); });
  for (const [dx, dz, r] of [[0, -1, 0], [1, 0, Math.PI / 2], [0, 1, Math.PI], [-1, 0, -Math.PI / 2]]) icon(dx * 0.0128, -0.0404 + dz * 0.0128, 0.0052, g => chev(g, r));
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.003, 16), new THREE.MeshBasicMaterial({ visible: false }));
  pad.name = 'power'; pad.position.set(0.0131, 0.006, -0.0596); remote.add(pad); remoteParts.powerPad = pad;
  const pick = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.2), new THREE.MeshBasicMaterial({ visible: false })); pick.name = 'pick'; remote.add(pick); remoteParts.pick = pick;
  remote.position.copy(SPOT.remote); remote.rotation.y = Math.PI + 0.4; scene.add(remote);
  marker = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), new THREE.MeshBasicMaterial({ color: 0xf2c14e }));
  marker.rotation.x = Math.PI; marker.visible = false; scene.add(marker);
}

// ---------- loading ----------
const log = (s, add = '\n') => { $('bootlog').textContent += s + add; };
async function load() {
  const loader = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('/draco/'));
  const bar = p => { $('bootbar').style.width = p + '%'; };
  const get = async (label, url, a, b) => { log(label.padEnd(30, '.') + ' ', ''); const g = await loader.loadAsync(url, e => { if (e.total) bar(a + (b - a) * e.loaded / e.total); }); log('ok'); bar(b); return g; };
  const loft = await get('Opening the loft ', '/models/loft.glb', 4, 52);
  fixMaterials(loft.scene); scene.add(loft.scene); scene.updateMatrixWorld(true); applyMood();
  for (const m of colliders) if (!m.geometry.boundsTree) m.geometry.computeBoundsTree();
  const rem = await get('Finding the remote ', '/models/remote.glb', 52, 60);
  const mac = await get('Charging the laptop ', '/models/macbook.glb', 60, 66);
  const car = await get('Parking the Ertiga ', '/models/car.glb', 66, 88);
  const hen = await get('Letting the hen in ', '/models/hen.glb', 88, 92);
  setupRemote(rem); buildScreen();
  house = createHouse({ scene, showCard, guide, say, tween, drop, cast, openLaptop, openPiano, models: { macbook: mac.scene, car: car.scene, hen: hen.scene } });
  log('Waking the Sheriff '.padEnd(30, '.') + ' ', '');
  await Promise.race([Promise.all([document.fonts.ready, fontsReady]), wait(3)]);
  // start at the back hall if there is floor there
  const y0 = drop(1.45, -7.2, 1.2, 2); if (y0 === null || Math.abs(y0 - 0.15) > 0.3) player.pos.set(1.45, 0.15, -5.4); else player.pos.y = y0;
  sheriff.root.position.set(1.35, 0.15, player.pos.z + 2.3);
  renderer.compile(scene, camera); bar(100); log('ok');
  log('Dusk in Chennai. The sofa is free.');
  const b = $('enter'); b.disabled = false; b.textContent = 'Step inside'; b.focus();
}

// ---------- dialogue ----------
const dlg = { el: $('dialog'), text: $('dialogText'), full: '', shown: 0, resolve: null, auto: false, token: 0, cps: 34 };
function say(line, { auto = false, hold = 4.2, id = null, who = active } = {}) {
  dlg.token++; const my = dlg.token;
  if (dlg.resolve) { const r = dlg.resolve; dlg.resolve = null; r(); }
  // on a phone there is no keyboard to talk about
  if (TOUCH) line = line.replace(/:? ?W, A, S, D/g, ' with the stick').replace('Press E to sit down', 'Tap Play to sit down').replace(/Press E to sit, then/, 'Tap Sit, then').replace('Press E to sit', 'Tap Sit').replace(/Keys A through K, and the/, 'The');
  audio.stopVoice();
  dlg.full = line; dlg.shown = 0; dlg.auto = auto; dlg.cps = 34; dlg.text.textContent = ''; dlg.who = who;
  $('plateName').textContent = guideNames[who.style].name;
  dlg.el.hidden = false; dlg.el.classList.toggle('auto', auto); dlg.el.classList.toggle('ranger', who.style === 'ranger'); who.talking = true;
  let closeIn = (line.length / 34 + hold) * 1000;
  // a recorded voice, when one exists, sets the pace of the text
  if (id) audio.voice(who.style, id).then(dur => { if (dur && dlg.token === my) { dlg.cps = Math.max(12, line.length / dur); dlg.voiced = true; } });
  return new Promise(res => {
    dlg.resolve = res; dlg.voiced = false;
    if (auto) setTimeout(function check() { if (dlg.token !== my) return; if (audio.analyser) return setTimeout(check, 400); closeDialog(); }, closeIn);
  });
}
function closeDialog() { dlg.el.hidden = true; if (dlg.who) dlg.who.talking = false; if (dlg.resolve) { const r = dlg.resolve; dlg.resolve = null; r(); } }
function advance() {
  if (dlg.el.hidden || dlg.auto) return false;
  if (dlg.shown < dlg.full.length) { dlg.shown = dlg.full.length; dlg.text.textContent = dlg.full; if (!dlg.voiced) dlg.who.talking = false; return true; }
  audio.stopVoice(); dlg.who.talking = false;
  const r = dlg.resolve; dlg.resolve = null; dlg.el.hidden = true; if (r) r(); return true;
}
let storyId = 0;
async function lines(arr, my = storyId) { for (const l of arr) { if (my !== storyId) return; if (typeof l === 'function') l(); else await say(l[1], { id: l[0] }); } }
function objective(s, soft = false) { const o = $('objective'); o.hidden = !s; o.textContent = s || ''; o.classList.toggle('soft', soft); }

// ---------- info card ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function showCard({ eyebrow, title, sub, body, tags, link, linkLabel }) {
  const el = $('card');
  el.innerHTML = `<button class="x" aria-label="Close">✕</button>${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}<h3>${esc(title)}</h3>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}<p>${esc(body)}</p>${tags ? `<div class="tags">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}${link ? `<a class="btn" href="${esc(link)}" target="_blank" rel="noopener">${esc(linkLabel || 'Open')} ↗</a>` : ''}`;
  el.querySelector('.x').onclick = hideCard; el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
}
function hideCard() { $('card').hidden = true; }

// ---------- moving the visitor ----------
// scripted walking: same bob and footsteps as free walking, along a list of points
async function walkPath(points, { speed = 1.25, face = null } = {}) {
  player.mode = 'cine'; player.view = null;
  for (const p of points) {
    const from = player.pos.clone(), dist = from.distanceTo(p), yawTo = Math.atan2(-(p.x - from.x), -(p.z - from.z)), y0 = player.yaw;
    let dy = yawTo - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    let last = 0;
    await tween(dist / speed, k => {
      player.pos.lerpVectors(from, p, k); player.yaw = y0 + dy * Math.min(1, k * 2.2); player.pitch *= 0.95;
      stepBob((k - last) * dist, speed); last = k;
    }, k => k);
  }
  if (face !== null) { const y0 = player.yaw; let dy = face - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); await tween(0.5, k => { player.yaw = y0 + dy * k; }); }
  player.vel = 0;
}
function stepBob(dist, speed) {
  const before = Math.floor(player.stride * 2); player.stride += dist / 1.35; player.vel = speed;
  if (Math.floor(player.stride * 2) !== before) audio.step(player.pos.y > 2.5 ? false : false);
}
const eyeOf = () => V(player.pos.x, player.pos.y + EYE, player.pos.z);
async function sitDown() {
  if (player.mode === 'sit' || state.busy) return;
  state.busy = true; objective(''); hideCard();
  if (player.pos.distanceTo(SEAT.stand) > 0.5) await walkPath([SEAT.stand], { face: Math.PI });
  const a = eyeOf(), y0 = player.yaw, p0 = player.pitch; let dy = Math.PI - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  player.mode = 'cine'; player.view = { pos: a.clone(), yaw: y0, pitch: p0 };
  // sidle in front of the cushions, then lower onto the seat
  const mid = V(SEAT.eye.x, a.y, SEAT.eye.z + 0.5);
  await tween(1.1, k => { player.view.pos.lerpVectors(a, mid, k); player.view.pos.y += Math.abs(Math.sin(k * Math.PI * 2)) * 0.03; player.view.yaw = y0 + dy * k; });
  audio.step(true);
  await tween(1.0, k => { player.view.pos.lerpVectors(mid, SEAT.eye, k); player.view.pitch = -0.32 * Math.sin(k * Math.PI) + 0.12 * k; });
  audio.burst && audio.ok() && audio.burst({ dur: 0.18, type: 'lowpass', freq: 240, vol: 0.14 });
  player.mode = 'sit'; player.yaw = Math.PI; player.pitch = 0.12; player.view = null; state.busy = false;
  if (state.hasRemote && state.phase === 'free') objective(tv.isOn ? '' : 'Press P or use the remote to switch the TV on', true);
  $('help').textContent = 'Arrows + Enter: TV · move the mouse to the remote · W A S D: get up';
}
async function standUp() {
  if (player.mode !== 'sit' || state.busy) return;
  state.busy = true; putRemoteBack();
  const a = SEAT.eye.clone(), mid = V(SEAT.eye.x, SEAT.stand.y + EYE, SEAT.eye.z + 0.5), b = V(SEAT.stand.x, SEAT.stand.y + EYE, SEAT.stand.z);
  player.mode = 'cine'; player.view = { pos: a.clone(), yaw: player.yaw, pitch: player.pitch };
  const p0 = player.pitch;
  await tween(0.8, k => { player.view.pos.lerpVectors(a, mid, k); player.view.pitch = p0 * (1 - k) - 0.25 * Math.sin(k * Math.PI); });
  audio.step(true);
  await tween(0.9, k => { player.view.pos.lerpVectors(mid, b, k); player.view.pos.y += Math.abs(Math.sin(k * Math.PI * 2)) * 0.03; });
  player.pos.copy(SEAT.stand); player.pitch = 0; player.view = null; player.mode = 'walk'; state.busy = false;
  $('help').textContent = 'W A S D: walk · drag: look · Shift: brisk · E: use';
}
function freeWalk(dt) {
  let f = 0, s = 0;
  if (keys.has('w') || keys.has('arrowup')) f += 1; if (keys.has('s') || keys.has('arrowdown')) f -= 1;
  if (keys.has('d')) s += 1; if (keys.has('a')) s -= 1;
  f -= stick.y; s += stick.x;
  if (keys.has('arrowleft')) player.yaw += dt * 1.9; if (keys.has('arrowright')) player.yaw -= dt * 1.9;
  if (Math.abs(f) < 0.08 && Math.abs(s) < 0.08) { player.vel *= Math.pow(0.001, dt); return; }
  const speed = keys.has('shift') || Math.hypot(stick.x, stick.y) > 0.92 ? 2.3 : 1.45, sin = Math.sin(player.yaw), cos = Math.cos(player.yaw), n = Math.max(1, Math.hypot(f, s));
  let dx = (-sin * f + cos * s) / n * speed * dt, dz = (-cos * f - sin * s) / n * speed * dt;
  const H = [0.55, 1.1, 1.55], R = 0.3;
  const tryMove = (mx, mz) => {
    const len = Math.hypot(mx, mz); if (len < 1e-5) return false;
    const dir = V(mx / len, 0, mz / len);
    if (blocked(player.pos, dir, R + len, H)) return false;
    for (const a of [0.7, -0.7]) { const d2 = V(dir.x * Math.cos(a) - dir.z * Math.sin(a), 0, dir.x * Math.sin(a) + dir.z * Math.cos(a)); if (blocked(player.pos, d2, R * 0.8, [1.1])) return false; }
    const nx = player.pos.x + mx, nz = player.pos.z + mz, gy = drop(nx, nz, player.pos.y + 0.62, 1.7);
    // the car is solid too
    if (house && player.pos.y < 1) { const cp = house.car.rig.position, R2 = 0.62, d1 = Math.hypot(nx - cp.x, nz - cp.z); if (d1 < R2 && d1 < Math.hypot(player.pos.x - cp.x, player.pos.z - cp.z)) return false; }
    if (gy === null || gy - player.pos.y > 0.27) return false;
    player.pos.x = nx; player.pos.z = nz; player.groundY = gy; stepBob(len, speed); return true;
  };
  if (!tryMove(dx, dz)) if (!tryMove(dx, 0)) tryMove(0, dz);
}

// ---------- remote ----------
function handPose() {
  const narrow = camera.aspect < 1.15, k = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.tan(THREE.MathUtils.degToRad(27.5));
  const pos = narrow ? V(0, -0.2 * k, -0.5) : V(Math.min(0.34, 0.2 * camera.aspect) * k, -0.16 * k, -0.5);
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 - 0.42, narrow ? 0 : -0.22, narrow ? 0 : -0.06, 'YXZ'));
  return { pos, quat, scale: (narrow ? 1.25 : 1.45) * k };
}
function pickUp() {
  if (state.remoteIn !== 'table' || player.mode !== 'sit') return;
  state.remoteIn = 'moving'; state.hasRemote = true; marker.visible = false; audio.click(); state.keyAt = state.t;
  camera.attach(remote);
  const p0 = remote.position.clone(), q0 = remote.quaternion.clone(), s0 = remote.scale.x;
  tween(0.8, k => { const h = handPose(); remote.position.lerpVectors(p0, h.pos, k); remote.position.y += Math.sin(k * Math.PI) * 0.06; remote.quaternion.slerpQuaternions(q0, h.quat, k); remote.scale.setScalar(s0 + (h.scale - s0) * k); })
    .then(() => { state.remoteIn = 'hand'; state.raise = 1; });
  if (pickedResolve) { pickedResolve(); pickedResolve = null; }
}
function putRemoteBack() {
  if (state.remoteIn !== 'hand') return;
  state.remoteIn = 'moving'; scene.attach(remote);
  const p0 = remote.position.clone(), q0 = remote.quaternion.clone(), s0 = remote.scale.x, q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI + 0.4, 0));
  tween(0.7, k => { remote.position.lerpVectors(p0, SPOT.remote, k); remote.position.y += Math.sin(k * Math.PI) * 0.1; remote.quaternion.slerpQuaternions(q0, q1, k); remote.scale.setScalar(s0 + (1 - s0) * k); }).then(() => { state.remoteIn = 'table'; });
}
function press(name, action) {
  if (player.mode !== 'sit') return;
  if (state.remoteIn === 'table') { if (!state.hasRemote) return; pickUp(); }
  state.keyAt = state.t;
  const m = remoteParts[name]; if (m) m.userData.pressed = state.t;
  if (action === 'power') { if (state.phase === 'power' || state.phase === 'free') tv.power(); return; }
  if (action === 'mute') { toggleSound(); return; }
  if (action === 'hint' && tv.isOn && tv.screen === 'music') { audio.click(); tv.lastInput = tv.now; tv.input('play'); return; }
  if (action === 'hint') { audio.click(); const id = tv.isOn ? tv.screen : null; if (id && remarks[id]) say(remarks[id][0], { auto: true, id: 'tv-' + id }); return; }
  if (action === 'lean+' || action === 'lean-') { audio.click(); state.zoom = clamp((state.zoom || 0) + (action === 'lean+' ? -5 : 5), -10, 14); return; }
  if (!tv.isOn) return;
  (action === 'ok' ? audio.select : action === 'back' || action === 'home' ? audio.click : audio.move).call(audio);
  tv.input(action);
}

// ---------- story ----------
let pickedResolve, powerResolve;
async function story() {
  const my = ++storyId; state.phase = 'intro';
  await wait(0.8); if (my !== storyId) return;
  sheriff.play('wave', 2.2);
  await lines([
    ['intro-1', 'Howdy, partner! You made it. Welcome to Johnbosco\'s place.'],
    () => sheriff.play('think', 2.5),
    ['intro-2', 'He\'s out building something at Riven. Again. So the tour falls to me.'],
    () => sheriff.play('pointL', 1.8),
    ['intro-3', 'Follow me. Best seat in the house is just through here. Mind the hen.'],
  ], my);
  if (my !== storyId) return;
  audio.hop(); sheriff.hopPath([V(1.4, 0.15, -4.4), V(1.4, 0.15, -3.0)], { height: 0.3, duration: 0.5 });
  await walkPath([V(1.45, 0.15, -4.4)]); if (my !== storyId) return;
  audio.hop(); sheriff.hopPath([V(0.95, 0.15, -2.0), SPOT.table], { height: 0.4, duration: 0.6 });
  await walkPath([V(1.42, 0.15, -2.7), SEAT.stand], { face: Math.PI - 0.5 }); if (my !== storyId) return;
  sheriff.play('thumb', 2.4);
  await lines([
    ['intro-4', 'Everything worth knowing about the fella is on that TV behind me.'],
    ['intro-5', 'What he builds, where he\'s worked, what he\'s won. Go on, take a seat.'],
  ], my);
  if (my !== storyId) return;
  await sitDown(); if (my !== storyId) return;
  state.phase = 'pickup'; marker.visible = true; sheriff.play('pointL', 3);
  const p0 = player.pitch, y0 = player.yaw; tween(1.0, k => { player.pitch = p0 + (-0.6 - p0) * k; player.yaw = y0 + 0.18 * k; });
  objective('Click the remote on the table');
  say('See that remote on the table? Go on, pick it up.', { auto: true, hold: 60, id: 'intro-6' });
  await new Promise(r => pickedResolve = r); if (my !== storyId) return;
  objective('Press the power button, top right of the remote');
  const p1 = player.pitch, y1 = player.yaw; tween(1.0, k => { player.pitch = p1 + (0.16 - p1) * k; player.yaw = y1 + (Math.PI - y1) * k; });
  sheriff.play('thumb', 2);
  say('Attaboy. Now hit the power button, top right corner.', { auto: true, hold: 60, id: 'intro-7' });
  state.phase = 'power';
  await new Promise(r => powerResolve = r);
}
function beginFree() {
  state.phase = 'free'; $('skipIntro').hidden = true; $('help').hidden = false; revealDock();
  $('help').textContent = 'Arrows + Enter: TV · move the mouse to the remote · W A S D: get up and explore';
}
async function onPower(on) {
  if (on) {
    audio.power(); objective(''); closeDialog();
    if (powerResolve) { powerResolve(); powerResolve = null; }
    if (state.phase !== 'free') beginFree();
    active.play('cheer', 1.2);
    if (player.mode === 'sit') { await wait(0.5); audio.hop(); active.hopPath([V(0.6, 0.78, -0.1), SPOT.ledge], { height: 0.42, duration: 0.6 }); }
  } else if (player.mode === 'sit') {
    active.hopPath([V(0.6, 0.78, -0.1), SPOT.table], { height: 0.35, duration: 0.55 });
    say('Had enough? Press power again whenever you like. Or get up and have a wander: W, A, S, D.', { auto: true, id: 'tv-off' });
  }
}
const remarks = {
  home: ['That there is Riven TV, the launcher he built. Left and right to pick an app, middle button to open it. When you\'re done, get up and explore: W, A, S, D.', 'pointL'],
  about: ['Third-year CSE at LICET, Chennai. Builds clear software, and a company to ship it. His words, not mine.', 'think'],
  riven: ['Riven is his studio. Their own products, plus websites and AI systems for clients.', 'pointL'],
  projects: ['Twelve of \'em. Press the middle button on any one for the full story.', 'pointL'],
  experience: ['Founder, Google Student Ambassador, workshop trainer. The boy keeps busy.', 'think'],
  awards: ['Two first prizes at IIT Madras in a single month. That earns a tip of the hat.', 'tip'],
  offclock: ['Open roads, and a keyboard at Sunday Mass. And a first prize for acting, of all things.', 'cheer'],
  contact: ['Here\'s where you reach him. Press the middle button and I\'ll get the door for you.', 'tip'],
  settings: ['Those are the real Riven TV settings. Try a different background or a new pair of fonts.', 'think'],
};
const remarked = new Set();
function onScreen(id) {
  tvGlow.color.set(channels.find(c => c.id === id)?.accent || '#fff1dc');
  if (remarked.has(id) || !remarks[id]) return;
  remarked.add(id);
  const [line, g] = remarks[id]; active.play(g, 2.4); say(line, { auto: true, id: 'tv-' + id });
  if (!state.toured && channels.filter(c => remarks[c.id]).every(c => remarked.has(c.id))) {
    state.toured = true;
    setTimeout(() => { active.play('tip', 2.6); say('That\'s every channel, partner. The rest of the house is yours to explore.', { auto: true, hold: 5, id: 'tv-done' }); }, 9000);
  }
}
tv.on('power', onPower); tv.on('screen', onScreen);
tv.on('open', url => { audio.select(); window.open(url, '_blank', 'noopener'); });

function skipIntro() {
  if (state.phase === 'free' || !house) return;
  storyId++; dlg.token++; closeDialog(); objective(''); tweens.length = 0; state.busy = false;
  sheriff.hop = null; sheriff.root.position.copy(SPOT.table);
  player.mode = 'sit'; player.view = null; player.yaw = Math.PI; player.pitch = 0.14; player.pos.copy(SEAT.stand);
  state.hasRemote = true; marker.visible = false; pickedResolve = null;
  if (state.remoteIn === 'table') { camera.attach(remote); const h = handPose(); remote.position.copy(h.pos); remote.quaternion.copy(h.quat); remote.scale.setScalar(h.scale); state.remoteIn = 'hand'; state.keyAt = state.t; }
  beginFree();
  if (!tv.isOn) tv.power();
}

// when the sheriff runs out of puff, the ranger takes over
async function handOver() {
  state.handed = true; const was = dlg.token;
  sheriff.play('yawn', 2.4); audio.yawn();
  await say('Whew. I\'ve been talking since sunup, partner. These boots need a rest.', { auto: true, hold: 1.6, id: 'tired-1' });
  sheriff.play('wave', 1.6);
  await say('Buzz! You\'re up. Show our guest the rest of the place.', { auto: true, hold: 1.4, id: 'tired-2' });
  audio.hop(); const napY = drop(SPOT.nap.x, SPOT.nap.z, 1.6, 1.5) ?? SPOT.nap.y;
  sheriff.hopTo(V(SPOT.nap.x, napY, SPOT.nap.z), { height: 0.6, duration: 0.9 }).then(() => { sheriff.asleep = true; sheriff.targetYaw = Math.PI; });
  const tgt = guideTarget(ranger);
  ranger.root.position.set(tgt.x + 0.4, tgt.y + 3.2, tgt.z - 0.6); ranger.root.visible = true; active = ranger; audio.whoosh();
  await ranger.hopTo(tgt, { height: 0.2, duration: 1.3 });
  ranger.play('wave', 2);
  say('Ranger on duty. I\'ve got the tour from here. Lead the way and I\'ll keep up.', { auto: true, hold: 3, id: 'takeover-1', who: ranger });
}
// where the active guide should be standing right now
function guideTarget(g) {
  if (player.mode === 'sit' || player.view) return tv.isOn ? SPOT.ledge : SPOT.table;
  if (player.mode === 'laptop' || player.mode === 'piano') return house.stations.keys.guide;
  if (state.station) return house.stations[state.station].guide;
  const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  for (const [f, s] of [[1.35, 0.6], [1.2, -0.6], [0.9, 0.9], [0.9, -0.9], [-0.6, 0.8]]) {
    const x = player.pos.x - sin * f + cos * s, z = player.pos.z - cos * f - sin * s, y = drop(x, z, player.pos.y + 0.7, 1.4);
    if (y !== null && Math.abs(y - player.pos.y) < 0.5) return V(x, y, z);
  }
  return g.root.position;
}
let followAcc = 0;
function updateGuides(dt) {
  followAcc += dt;
  const inCar = house && (house.car.driving || player.mode === 'car') && !active.asleep;
  if (inCar && !active.hop) { if (active.root.position.distanceTo(house.car.seat('driver')) > 0.5 && !state.guideBoarded) { state.guideBoarded = true; active.hopTo(house.car.seat('driver'), { height: 0.7, duration: 0.7 }).then(() => { state.guideSeated = true; }); } else if (state.guideSeated) { house.car.seat(player.mode === 'car' && state.carView === 'in' ? 'driverIn' : 'driver', active.root.position); active.targetYaw = house.car.heading; } }
  if (!inCar) state.guideBoarded = state.guideSeated = false;
  // inside the car the guide is sized to the cabin; everywhere else, normal size
  { const gs = inCar && state.guideSeated && player.mode === 'car' && state.carView === 'in' ? 0.2 : 0.46, s = active.root.scale.x; active.root.scale.setScalar(s + (gs - s) * Math.min(1, dt * 7)); }
  if (followAcc > 0.3 && state.phase === 'free' && !active.hop && !active.asleep && !inCar) {
    followAcc = 0; const tgt = guideTarget(active), d = active.root.position.distanceTo(tgt);
    if (d > 0.75) { active.hopTo(tgt, { height: clamp(d * 0.22, 0.16, 1.4), duration: clamp(d * 0.2, 0.34, 1.1) }); if (d < 6) audio.hop(); }
  }
  const lvl = audio.level();
  for (const g of [sheriff, ranger]) { g.voice = g === dlg.who ? lvl : -1; g.update(dt, g === active && !state.guideSeated ? camera.position : null); }
  if (ranger.dome) ranger.dome.visible = ranger.root.visible;
}
// which activity is the visitor standing at?
function updateStation() {
  if (!house || state.phase !== 'free' || player.mode !== 'walk') { if (house) fob.hidden = !(player.mode === 'car' || (player.mode === 'cine' && state.station === 'patio')); return; }
  let best = null, bd = 1e9;
  for (const [id, st] of Object.entries(house.stations)) { if (Math.abs(st.at.y - player.pos.y) > 1.2) continue; const d = Math.hypot(st.at.x - player.pos.x, st.at.z - player.pos.z); if (d < st.r && d < bd) { bd = d; best = id; } }
  if (best === state.station) return;
  state.station = best; fob.hidden = best !== 'patio'; if (best === 'patio') drawFob();
  document.querySelectorAll('#dock [data-station]').forEach(b => b.classList.toggle('on', b.dataset.station === best));
  if (!best) { objective(''); return; }
  const st = house.stations[best]; objective(TOUCH ? (USE_LABEL[best] ? '' : st.hint.replace('Click', 'Tap')) : st.hint, true);
  if (!visited.has(best)) { visited.add(best); if (st.gesture) setTimeout(() => active.play(st.gesture, 2.4), 500); say(st.line[1], { auto: true, hold: 4, id: 'at-' + st.line[0] }); }
}
const visited = new Set();

// ---------- the hen ----------
function updateHen(dt, t) {
  const h = house.hen, p = h.root.position;
  if (h.pester) {
    // every so often she comes over to make a nuisance of herself
    const q = h.pester, sit = player.mode === 'sit', sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
    const tgt = sit ? V(-0.32, 0.415, -1.02) : V(player.pos.x - sin * 0.85, player.pos.y, player.pos.z - cos * 0.85), d = V(tgt.x - p.x, 0, tgt.z - p.z), len = d.length();
    if (q.phase === 'run') {
      if (len > 0.12) { d.normalize(); p.addScaledVector(d, Math.min(len, 2.1 * dt)); p.y += (tgt.y - p.y) * Math.min(1, dt * 5); h.root.rotation.y = Math.atan2(d.x, d.z) + Math.PI; h.model.rotation.z = Math.sin(t * 22) * 0.12; }
      else { q.phase = 'annoy'; q.t = 0; q.n = 0; if (!state.henSeen) { state.henSeen = true; active.play('wave', 1.6); say('Shoo! Don\'t mind her. She does that to everybody.', { auto: true, hold: 2.5, id: 'hen-shoo' }); } }
    } else {
      q.t += dt; p.y = tgt.y; h.root.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z) + Math.PI;
      if (q.t > q.n * 0.85) { q.n++; audio.cluck(); h.jump = 0.5; }
      if (q.t > 3.4) { h.pester = null; h.target = null; h.wait = 0.3; if (sit) p.set(-1.2, 0.15, -0.6); }
    }
    if (h.jump > 0) { h.jump -= dt; h.model.position.y = Math.sin((0.5 - h.jump) / 0.5 * Math.PI) * (sit ? 1.4 : 3.2); } else h.model.position.y = 0;
    return;
  }
  if (h.jump > 0) { h.jump -= dt; h.model.position.y = Math.sin((0.5 - h.jump) / 0.5 * Math.PI) * 1.2; }
  if (h.wait > 0) { h.wait -= dt; h.model.rotation.x = h.wait > 0.4 && Math.sin(t * 9) > 0.55 ? 0.5 : 0; return; }
  if (!h.target) {
    for (let i = 0; i < 6 && !h.target; i++) {
      const x = -2.6 + Math.random() * 4.4, z = -6.6 + Math.random() * 6.1, d = V(x - p.x, 0, z - p.z), len = d.length(); if (len < 0.6) continue;
      const y = drop(x, z, 0.6, 0.7); if (y === null || Math.abs(y - 0.15) > 0.06) continue;
      if (!blocked(V(p.x, 0.15, p.z), d.normalize(), len + 0.25, [0.12, 0.3])) h.target = V(x, 0.15, z);
    }
    if (!h.target) { h.wait = 1; return; }
  }
  const d = V(h.target.x - p.x, 0, h.target.z - p.z), len = d.length();
  if (len < 0.06) { h.target = null; h.wait = 1.2 + Math.random() * 3.5; return; }
  d.normalize(); p.addScaledVector(d, Math.min(len, 0.5 * dt));
  const yaw = Math.atan2(d.x, d.z) + Math.PI; let dy = yaw - h.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); h.root.rotation.y += dy * Math.min(1, dt * 6);
  h.model.rotation.x = 0; h.model.rotation.z = Math.sin(t * 14) * 0.09; p.y = 0.15 + Math.abs(Math.sin(t * 14)) * 0.012;
}

// ---------- laptop ----------
function openLaptop(laptop) {
  if (player.mode !== 'walk' || state.busy) return;
  state.busy = true; hideCard(); objective('');
  const S = laptop.screen.getWorldPosition(new THREE.Vector3()), N = laptop.screen.getWorldDirection(new THREE.Vector3()), to = S.clone().addScaledVector(N, 0.36);
  const from = eyeOf(), q0 = camera.quaternion.clone(), m = new THREE.Matrix4().lookAt(to, S, V(0, 1, 0)), q1 = new THREE.Quaternion().setFromRotationMatrix(m);
  document.body.classList.add('focus'); player.mode = 'laptop'; player.lap = { pos: from.clone(), quat: q0.clone(), screen: laptop.screen };
  tween(1.1, k => { player.lap.pos.lerpVectors(from, to, k); player.lap.quat.slerpQuaternions(q0, q1, k); }).then(() => { state.busy = false; openBrowser(screenRect(), closeLaptop); $('help').textContent = 'Esc: close the laptop'; });
}
function screenRect() {
  const s = player.lap.screen, w = 0.336 / 2, h = 0.218 / 2, pts = [[-w, h], [w, -h]].map(([x, y]) => { const p = s.localToWorld(V(x, y, 0)).project(camera); return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight]; });
  return { left: pts[0][0], top: pts[0][1], width: pts[1][0] - pts[0][0], height: pts[1][1] - pts[0][1] };
}
function closeLaptop() {
  if (!player.lap || state.busy) return; if (player.mode === 'laptop') closeBrowser(); document.body.classList.remove('focus');
  const from = player.lap.pos.clone(), q0 = player.lap.quat.clone(), to = eyeOf(), q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ'));
  state.busy = true; objective('');
  tween(0.8, k => { player.lap.pos.lerpVectors(from, to, k); player.lap.quat.slerpQuaternions(q0, q1, k); }).then(() => { player.mode = 'walk'; player.lap = null; state.busy = false; state.station = null; $('help').textContent = HELP_WALK; });
}
const HELP_WALK = TOUCH ? 'Stick: walk · drag: look' : 'W A S D: walk · drag: look · Shift: brisk · E: use';
// sit at the keyboard: the camera looks down the keys and the computer keyboard plays them
function openPiano() {
  if (player.mode !== 'walk' || state.busy) return;
  state.busy = true; hideCard();
  const g = house.piano.group.position, to = V(g.x + 0.5, g.y + 0.5, g.z), at = V(g.x + 0.04, g.y + 0.06, g.z);
  const from = eyeOf(), q0 = camera.quaternion.clone(), q1 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(to, at, V(0, 1, 0)));
  player.mode = 'piano'; player.lap = { pos: from.clone(), quat: q0.clone() };
  tween(1.0, k => { player.lap.pos.lerpVectors(from, to, k); player.lap.quat.slerpQuaternions(q0, q1, k); }).then(() => { state.busy = false; });
  objective('A S D F G H J K L ; white keys · W E T Y U O P sharps · Z / X octave · Esc to stand', true);
  $('help').textContent = 'All 61 keys are clickable · voice buttons change the sound';
}
const PIANO_KEYS = { q: -1, a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ';': 16, "'": 17 };
function pianoKey(k) {
  const P = house.piano;
  if (k === 'z' || k === 'x') { P.octave = clamp(P.octave + (k === 'x' ? 1 : -1), -2, 2); audio.click(); P.redraw(); return true; }
  if (!(k in PIANO_KEYS)) return false;
  P.play(P.bySemi.get(clamp(24 + 12 * P.octave + PIANO_KEYS[k], 0, 60))); return true;
}

// ---------- the car ----------
const fob = document.createElement('div'); fob.id = 'fob'; fob.hidden = true; document.body.appendChild(fob);
function drawFob() {
  const c = house.car, riding = player.mode === 'car';
  fob.innerHTML = `<b>Ertiga <i id="fobSpeed"></i></b><span>${riding ? (c.driving ? 'On the road. Your guide has the wheel.' : 'Parked. You are both inside.') : 'Parked on the patio.'}</span>
    <div>${riding
      ? `<button data-a="door" class="main">Get out</button><button data-a="drive">${c.driving ? 'Stop' : 'Go'}</button><button data-a="view">${state.carView === 'in' ? 'Outside view' : 'Inside view'}</button><button data-a="lights">${c.on ? 'Lights off' : 'Lights on'}</button><button data-a="horn">Horn</button>`
      : `<button data-a="go" class="main">Drive</button><button data-a="lights">${c.on ? 'Lights off' : 'Lights on'}</button><button data-a="horn">Horn</button>`}</div>`;
  fob.querySelectorAll('button').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'lights') c.lights(!c.on); if (a === 'horn') c.horn(); if (a === 'door') exitCar(); if (a === 'go') driveCar();
    if (a === 'drive') { if (c.driving) c.stop(); else c.start(); }
    if (a === 'view') { state.carView = state.carView === 'in' ? 'out' : 'in'; audio.click(); player.yaw = state.carView === 'in' ? -0.35 : 0; }
    drawFob();
  });
}
// Drive: both of you get in, the engine starts, and off you go
async function driveCar() {
  if (player.mode !== 'walk' || state.busy) return;
  await enterCar(); if (player.mode !== 'car') return;
  active.play('cheer', 1.2); house.car.start(); drawFob();
  if (!state.droveOnce) { state.droveOnce = true; say('Buckle up, partner. Short road, but I drive it with style.', { auto: true, hold: 3, id: 'car-go' }); }
}
async function enterCar() {
  if (player.mode !== 'walk' || state.busy) return;
  state.busy = true; hideCard(); objective(''); audio.click();
  state.carView = 'in'; const a = eyeOf(), y0 = player.yaw, p0 = player.pitch; let dy = house.car.heading + Math.PI - 0.35 - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  player.mode = 'cine'; player.view = { pos: a.clone(), yaw: y0, pitch: p0 };
  // walk to the door, duck in
  await tween(1.3, k => { player.view.pos.lerpVectors(a, house.car.seat('inside'), k); player.view.pos.y += Math.sin(k * Math.PI) * 0.05; player.view.yaw = y0 + dy * k; player.view.pitch = p0 + (-0.04 - p0) * k - Math.sin(k * Math.PI) * 0.18; });
  if (audio.ok()) audio.burst({ dur: 0.12, type: 'lowpass', freq: 300, vol: 0.3 });
  player.mode = 'car'; player.view = null; player.yaw = -0.35; player.pitch = 0; state.busy = false; drawFob();
  $('help').textContent = 'Drag to look around · the key fob stops, changes view or lets you out';
}
async function exitCar() {
  if (player.mode !== 'car' || state.busy) return;
  state.busy = true; house.car.stop(); if (audio.ok()) audio.burst({ dur: 0.12, type: 'lowpass', freq: 300, vol: 0.3 });
  const st = house.stations.patio.stand[0], a = house.car.seat(state.carView === 'in' ? 'inside' : 'passenger'), b = V(st.x, st.y + EYE, st.z), y0 = house.car.heading + Math.PI + player.yaw; let dy = 0 - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  player.mode = 'cine'; player.view = { pos: a.clone(), yaw: y0, pitch: -0.3 };
  await tween(1.1, k => { player.view.pos.lerpVectors(a, b, k); player.view.yaw = y0 + dy * k; player.view.pitch = -0.3 * (1 - k); });
  player.pos.copy(st); player.yaw = 0; player.pitch = 0; player.view = null; player.mode = 'walk'; state.busy = false; drawFob(); $('help').textContent = HELP_WALK;
}

// ---------- rock, paper, scissors ----------
const rps = document.createElement('div'); rps.id = 'rps'; rps.hidden = true; document.body.appendChild(rps);
function offerRps() {
  if (!rps.hidden || state.busy || !['walk', 'sit'].includes(player.mode)) return;
  const name = guideNames[active.style].name; active.play('wave', 2);
  say('Fancy a quick round of rock, paper, scissors? Best of three. No hard feelings either way.', { auto: true, hold: 5, id: 'rps-offer' });
  rps.innerHTML = `<p class="eyebrow">${esc(name)} wants a game</p><h3>Rock, paper, scissors?</h3><div class="row"><button class="main" data-a="y">Play</button><button data-a="n">Not now</button></div>`;
  rps.hidden = false;
  rps.querySelector('[data-a=n]').onclick = () => { rps.hidden = true; audio.click(); say('Suit yourself, partner. The offer stands: just click on me.', { auto: true, hold: 2.5, id: 'rps-no' }); };
  rps.querySelector('[data-a=y]').onclick = () => playRps(name);
}
function playRps(name) {
  let me = 0, them = 0; const M = ['Rock', 'Paper', 'Scissors'], G = ['✊', '✋', '✌️'];
  const draw = msg => {
    rps.innerHTML = `<p class="eyebrow">Best of three · You ${me} — ${them} ${esc(name)}</p><h3>${msg}</h3><div class="row">${M.map((m, i) => `<button data-i="${i}"><span>${G[i]}</span>${m}</button>`).join('')}</div>`;
    rps.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const a = +b.dataset.i, c = Math.floor(Math.random() * 3), r = (a - c + 3) % 3; audio.select();
      if (r === 1) { me++; active.play('think', 1.4); } else if (r === 2) { them++; active.play('cheer', 1.4); } else active.play('tip', 1);
      const res = `${G[a]} against ${G[c]}: ` + (r === 0 ? 'a draw' : r === 1 ? 'your round' : `${name}'s round`);
      if (me === 2 || them === 2) {
        rps.innerHTML = `<p class="eyebrow">Final · You ${me} — ${them} ${esc(name)}</p><h3>${me > them ? 'You win.' : `${esc(name)} wins.`}</h3><p>${res}.</p>`;
        if (me > them) { audio.chime(); say('Well, I\'ll be. Beaten fair and square. Don\'t tell Johnbosco.', { auto: true, hold: 3, id: 'rps-lose' }); } else say('Ha! Still got it. Rematch any time: just click on me.', { auto: true, hold: 3, id: 'rps-win' });
        setTimeout(() => { rps.hidden = true; }, 3200);
      } else draw(res + '. Again:');
    });
  };
  draw('Pick your move');
}

// ---------- dock ----------
const ICON = {
  sofa: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>', shelf: '<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M12 13v5M8 21h8M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/>',
  kitchen: '<path d="M5 3h14v16l-4 2H5z"/><path d="M9 8h6M9 12h6"/>', studio: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M2 19h20"/>',
  keys: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v14M13 5v14M18 5v14M8 5v8M13 5v8"/>', patio: '<path d="M3 15l2-6h10l4 3 2 1v3z"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/>',
  morning: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>', golden: '<path d="M4 17h16M7 17a5 5 0 0 1 10 0M12 5v3M5 10l2 1.5M19 10l-2 1.5M2 21h20"/>',
  night: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>', movie: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5l5 2.5-5 2.5z"/>',
};
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
function revealDock() {
  const el = $('lights'); if (!el.hidden) return;
  el.innerHTML = Object.keys(MOODS).map(m => `<button data-mood="${m}" class="${m === mood.name ? 'on' : ''}" title="${m[0].toUpperCase() + m.slice(1)} light" aria-label="${m} light">${svg(m)}</button>`).join('');
  el.querySelectorAll('[data-mood]').forEach(b => b.onclick = () => setMood(b.dataset.mood));
  el.hidden = false;
}
// shortcut: a quick blink and you are standing at that spot (walking there works too)
async function goStation(id) {
  if (!house || state.busy || state.phase !== 'free') return;
  if (player.mode === 'laptop') closeBrowser(); document.body.classList.remove('focus');
  state.busy = true; hideCard(); audio.select(); const fade = $('fade'); fade.classList.add('on'); await wait(0.28);
  if (player.mode === 'sit') putRemoteBack();
  const [pos, yaw] = house.stations[id].stand; player.pos.copy(pos); const gy = drop(pos.x, pos.z, pos.y + 0.7, 1.5); if (gy !== null) player.pos.y = gy;
  player.yaw = yaw; player.pitch = id === 'studio' || id === 'keys' ? -0.5 : 0; player.mode = 'walk'; player.view = null; player.lap = null;
  $('help').textContent = HELP_WALK;
  active.hop = null; if (!active.asleep) active.root.position.copy(house.stations[id].guide);
  fade.classList.remove('on'); state.busy = false;
}

// ---------- input ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function aim(e) { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); ray.far = 50; }
function hitRemote(e) {
  if (!remote || player.mode !== 'sit') return null;
  aim(e);
  if (state.remoteIn === 'table') { const h = ray.intersectObject(remoteParts.pick, false)[0]; return h ? { name: 'pick' } : null; }
  if (state.remoteIn !== 'hand' || state.raise < 0.6) return null;
  const h = ray.intersectObjects(Object.values(remoteParts).filter(o => o.name !== 'pick'), false)[0]; if (!h) return null;
  const name = h.object.name, local = remote.worldToLocal(h.point.clone());
  if (name === 'ring') { const dx = local.x, dz = local.z + 0.0404; return { name, action: Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : (dz < 0 ? 'up' : 'down') }; }
  if (name === 'vol') return { name, action: local.z < 0.0085 ? 'lean+' : 'lean-' };
  return { name, action: { ok: 'ok', back: 'back', home: 'home', play: 'hint', voice: 'hint', mute: 'mute', power: 'power' }[name] };
}
function hitHouse(e) {
  if (!house || state.busy || state.phase !== 'free' || !['walk', 'piano'].includes(player.mode)) return null;
  aim(e); ray.far = 3.4;
  const h = ray.intersectObjects(house.clickables, true)[0]; if (!h) return null;
  // not through walls
  rc.set(ray.ray.origin, ray.ray.direction); rc.far = h.distance - 0.12; if (rc.intersectObjects(colliders, false).length) return null;
  return h.object.userData.click || null;
}
const drag = { on: false, x: 0, y: 0, moved: 0 };
canvas.addEventListener('pointermove', e => {
  ptr.x = (e.clientX / innerWidth) * 2 - 1; ptr.y = (e.clientY / innerHeight) * 2 - 1;
  if (drag.on) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 6 && ['walk', 'sit', 'car'].includes(player.mode) && !state.busy && state.phase !== 'intro') {
      player.yaw += dx * 0.0034; player.pitch = clamp(player.pitch + dy * 0.0028, -1.1, 1.0);
      if (player.mode === 'sit') player.yaw = clamp(player.yaw, Math.PI - 1.2, Math.PI + 1.2); if (player.mode === 'car') player.yaw = clamp(player.yaw, -2.4, 2.4);
      canvas.style.cursor = 'grabbing'; $('tip').hidden = true; return;
    }
  }
  const h = hitRemote(e), hh = h ? null : hitHouse(e), tip = $('tip');
  state.hover = h && (h.name !== 'pick' || state.phase === 'pickup' || state.hasRemote) ? h.name : null;
  canvas.style.cursor = state.hover || hh ? 'pointer' : (state.phase === 'free' ? 'grab' : 'default');
  tip.hidden = !hh; if (hh) { tip.textContent = hh.label; tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; }
});
canvas.addEventListener('pointerdown', e => {
  audio.init();
  const h = hitRemote(e);
  if (h?.name === 'pick') { if (state.phase === 'pickup' || state.hasRemote) pickUp(); else advance(); return; }
  if (h) { press(h.name, h.action); return; }
  drag.on = true; drag.x = e.clientX; drag.y = e.clientY; drag.moved = 0; canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointerup', e => {
  if (!drag.on) return; drag.on = false;
  if (drag.moved > 6) return;
  const hh = hitHouse(e); if (hh) { hh.onClick(); return; }
  if (advance()) return;
  if (state.phase === 'free' && ['walk', 'sit'].includes(player.mode)) {
    aim(e); ray.far = 5; const g = ray.intersectObjects([sheriff.root, ranger.root], true)[0];
    if (g) { let o = g.object; while (o.parent && o !== sheriff.root && o !== ranger.root) o = o.parent; if (o === sheriff.root && sheriff.asleep) { audio.yawn(); say('Zzz… five more minutes, partner…', { auto: true, hold: 1.5, who: sheriff, id: 'asleep' }); } else if (o === active.root) offerRps(); }
  }
});
$('dialog').addEventListener('click', advance);
// the space bar pauses the music when the Music app is open
// what E (or the Use button) does where you are standing
function useAction() {
  if (player.mode !== 'walk' || state.phase !== 'free') return;
  if (state.station === 'sofa') sitDown(); else if (state.station === 'studio') openLaptop(house.laptop); else if (state.station === 'keys') openPiano(); else if (state.station === 'patio') driveCar();
}
const USE_LABEL = { sofa: 'Sit', studio: 'Laptop', keys: 'Play', patio: 'Drive' };
const TVKEYS = { arrowleft: ['ring', 'left'], arrowright: ['ring', 'right'], arrowup: ['ring', 'up'], arrowdown: ['ring', 'down'], enter: ['ok', 'ok'], ' ': ['ok', 'ok'], escape: ['back', 'back'], backspace: ['back', 'back'], h: ['home', 'home'], p: ['power', 'power'], m: ['mute', 'mute'] };
addEventListener('keydown', e => {
  if (state.phase === 'boot' || !$('plain').hidden || e.metaKey || e.ctrlKey) return;
  const k = e.key.toLowerCase();
  if (player.mode === 'laptop') { if (k === 'escape') closeLaptop(); return; }
  if (player.mode === 'piano') { if (k === 'escape') closeLaptop(); else if (!e.repeat && pianoKey(k)) e.preventDefault(); return; }
  if (player.mode === 'car') { if (k === 'escape') exitCar(); return; }
  if ((k === ' ' || k === 'enter') && advance()) { e.preventDefault(); return; }
  if (k === 'escape' && !$('card').hidden) { hideCard(); return; }
  if (player.mode === 'sit' && !state.busy) {
    if (state.phase === 'free' && 'wasd'.includes(k) && k.length === 1) { standUp(); return; }
    if (TVKEYS[k]) { e.preventDefault(); if (state.hasRemote) press(...TVKEYS[k]); return; }
    if (/^[1-8]$/.test(k) && tv.isOn && tv.screen !== 'boot') { audio.select(); state.keyAt = state.t; tv.lastInput = tv.now; tv.go(channels[+k - 1].id); }
    return;
  }
  if (player.mode !== 'walk' || state.phase !== 'free') return;
  if (k === 'e') { useAction(); return; }
  if (['w', 'a', 's', 'd', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys.add(k); e.preventDefault(); }
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
// ---------- touch controls ----------
{
  const pad = $('stick'), knob = pad.firstElementChild; let id = null, cx = 0, cy = 0;
  const set = e => { const r = 46, dx = clamp((e.clientX - cx) / r, -1, 1), dy = clamp((e.clientY - cy) / r, -1, 1), m = Math.max(1, Math.hypot(dx, dy)); stick.x = dx / m; stick.y = dy / m; knob.style.transform = `translate(${stick.x * r}px, ${stick.y * r}px)`; };
  pad.addEventListener('pointerdown', e => { audio.init(); id = e.pointerId; const b = pad.getBoundingClientRect(); cx = b.left + b.width / 2; cy = b.top + b.height / 2; pad.setPointerCapture(id); set(e); if (player.mode === 'sit' && state.phase === 'free') standUp(); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === id) set(e); });
  const end = e => { if (e.pointerId !== id) return; id = null; stick.x = stick.y = 0; knob.style.transform = ''; };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  $('btnUse').onclick = () => { audio.init(); useAction(); };
  $('btnBack').onclick = () => { if (player.mode === 'sit') standUp(); else if (player.lap) closeLaptop(); else if (player.mode === 'car') exitCar(); };
}
let touchAcc = 0;
function updateTouchUI(dt) {
  touchAcc += dt; if (touchAcc < 0.2) return; touchAcc = 0;
  const free = state.phase === 'free' && !state.busy, walk = free && player.mode === 'walk', use = walk && USE_LABEL[state.station];
  $('stick').hidden = !(walk || (free && player.mode === 'sit')); $('btnUse').hidden = !use; if (use) $('btnUse').textContent = use;
  const back = free && (player.mode === 'sit' || player.mode === 'piano' || player.mode === 'car'); $('btnBack').hidden = !back;
  if (back) $('btnBack').textContent = player.mode === 'sit' ? 'Stand up' : player.mode === 'car' ? 'Get out' : 'Done';
  const sp = document.getElementById('fobSpeed'); if (sp && house) sp.textContent = house.car.v > 0.05 ? `${Math.round(house.car.v * 30)} km/h` : '';
}
function toggleSound() { audio.setOn(!audio.on); const b = $('soundBtn'); b.textContent = audio.on ? 'Sound on' : 'Sound off'; b.setAttribute('aria-pressed', audio.on); audio.click(); }
$('soundBtn').onclick = toggleSound;
$('skipIntro').onclick = skipIntro;
$('plainBtn').onclick = () => { renderPlain($('plain'), () => { $('plain').hidden = true; }); $('plain').hidden = false; };
$('enter').onclick = () => {
  audio.init(); $('boot').classList.add('gone'); $('hud').hidden = false; audio.select();
  setTimeout(() => $('boot').remove(), 1000);
  story();
};

// ---------- loop ----------
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h); bloom.resolution.set(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  $('rotate').hidden = !(w < h && state.phase !== 'boot');
  if (player.mode === 'laptop' && !state.busy) placeBrowser(screenRect());
}
addEventListener('resize', resize); resize();

const clock = new THREE.Clock(); let tvAcc = 0, typeAcc = 0;
function frame() { tick(Math.min(clock.getDelta(), 0.05)); requestAnimationFrame(frame); }
function tick(dt) {
  state.t += dt; const t = state.t;
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(tw.e(k));
    if (k >= 1) { tweens.splice(i, 1); tw.res(); }
  }
  if (player.mode === 'walk' && !state.busy && state.phase === 'free') {
    freeWalk(dt);
    if (player.groundY !== undefined) player.pos.y += (player.groundY - player.pos.y) * Math.min(1, dt * 14);
  }
  // ---- camera ----
  ptr.sx += (ptr.x - ptr.sx) * Math.min(1, dt * 4); ptr.sy += (ptr.y - ptr.sy) * Math.min(1, dt * 4);
  let fov = 58;
  if (player.lap) { camera.position.copy(player.lap.pos); camera.quaternion.copy(player.lap.quat); fov = player.mode === 'piano' ? 60 : 46; }
  else if (player.mode === 'car') {
    const inside = state.carView === 'in', c = house.car; c.seat(inside ? 'inside' : 'passenger', camera.position);
    // a little body roll and road buzz sells the motion
    const lean = inside ? Math.sin(t * 2.1) * 0.006 * c.v : 0;
    camera.position.y += inside ? Math.sin(t * 31) * 0.0012 * c.v : 0;
    camera.rotation.set((inside ? -0.04 : -0.3) + player.pitch - ptr.sy * 0.02, c.heading + Math.PI + player.yaw - ptr.sx * 0.03, lean); fov = inside ? 72 : 64;
  }
  else {
    const sit = player.mode === 'sit', v = player.view, par = sit ? 0.035 : 0.05;
    const moving = player.vel > 0.2 ? 1 : 0; player.bob += ((moving) - player.bob) * Math.min(1, dt * 8);
    const ph = player.stride * Math.PI * 2, by = Math.sin(ph * 2) * 0.028 * player.bob, bx = Math.sin(ph) * 0.016 * player.bob;
    if (v) camera.position.copy(v.pos);
    else if (sit) camera.position.copy(SEAT.eye).setY(SEAT.eye.y + Math.sin(t * 1.2) * 0.004);
    else camera.position.set(player.pos.x + Math.cos(player.yaw) * bx, player.pos.y + EYE + by, player.pos.z - Math.sin(player.yaw) * bx);
    camera.rotation.set((v ? v.pitch : player.pitch) - ptr.sy * par * 0.6, (v ? v.yaw : player.yaw) - ptr.sx * par, Math.sin(ph) * 0.006 * player.bob);
    if (sit && tv.isOn) fov = clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(24)) / Math.min(1.78, camera.aspect) * 1.78)) - 12 + (state.zoom || 0), 26, 80);
  }
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }

  if (house) {
    if (state.phase === 'free') {
      state.freeT += dt;
      const calm = dlg.el.hidden && !state.busy && ['walk', 'sit'].includes(player.mode);
      if (!state.handed && state.freeT > state.tireAt && calm) handOver();
      else if (state.freeT > state.rpsAt && calm && rps.hidden) { state.rpsAt = state.freeT + 240 + Math.random() * 120; offerRps(); }
      else if (state.freeT > state.henAt && !house.hen.pester && player.pos.y < 1 && ['walk', 'sit'].includes(player.mode)) { state.henAt = state.freeT + 50 + Math.random() * 60; house.hen.pester = { phase: 'run', t: 0 }; }
    }
    updateStation(); house.update(dt, t); updateHen(dt, t);
    // the car waits, and honks, rather than run anyone over
    { const n = house.car.nose(), inWay = player.mode === 'walk' && player.pos.y < 1 && Math.hypot(n.x - player.pos.x, n.z - player.pos.z) < 0.95; house.car.update(dt, t, inWay); if (inWay && house.car.driving && !state.carWarned) { state.carWarned = true; say('Whoa there! Mind the road, partner. I\'ll wait.', { auto: true, hold: 2, id: 'car-wait' }); } }
  }
  updateGuides(dt); updateTouchUI(dt);

  // typewriter
  if (!dlg.el.hidden && dlg.shown < dlg.full.length) {
    typeAcc += dt * dlg.cps; const n = Math.floor(typeAcc);
    if (n > 0) {
      typeAcc -= n; const before = dlg.shown; dlg.shown = Math.min(dlg.full.length, dlg.shown + n); dlg.text.textContent = dlg.full.slice(0, dlg.shown);
      if (!dlg.voiced && Math.floor(dlg.shown / 2) !== Math.floor(before / 2) && dlg.full[dlg.shown - 1] !== ' ') audio.type();
      if (dlg.shown >= dlg.full.length && !dlg.voiced) dlg.who.talking = false;
    }
  }
  // tv
  tvAcc += dt; if (tvAcc > 1 / 30) { tvAcc = 0; if (tv.isOn || tv.dirtyOff !== true) { tv.draw(t); tv.dirtyOff = !tv.isOn; } }
  tvGlow.intensity += ((tv.isOn ? 2.6 : 0) - tvGlow.intensity) * Math.min(1, dt * 3);

  // remote: rests low in the hand and comes up when you reach for it
  const want = player.mode === 'sit' && state.remoteIn === 'hand' && (TOUCH || (ptr.x > 0.3 && ptr.y > 0.05) || t - state.keyAt < 3.2 || state.phase === 'power') ? 1 : 0;
  state.raise += (want - state.raise) * Math.min(1, dt * 7);
  for (const m of Object.values(remoteParts)) {
    if (!m.userData.rest) continue;
    const since = t - (m.userData.pressed ?? -9), d = since < 0.16 ? Math.sin((since / 0.16) * Math.PI) * 0.0012 : 0;
    m.position.y = m.userData.rest.y - d;
    m.material.emissive.setHex(state.hover === m.name ? 0x3a3f48 : 0x000000);
  }
  if (remote && state.remoteIn === 'hand') { const h = handPose(); remote.position.set(h.pos.x + Math.sin(t * 1.1) * 0.003, h.pos.y + Math.sin(t * 1.7) * 0.004 - (1 - state.raise) * 0.3 * h.scale / 1.45, h.pos.z); remote.quaternion.copy(h.quat); remote.scale.setScalar(h.scale); }
  if (marker?.visible) { marker.position.set(SPOT.remote.x, SPOT.remote.y + 0.16 + Math.sin(t * 4) * 0.025, SPOT.remote.z); marker.rotation.y = t * 2; }

  composer.render();
}
frame();
load().catch(err => { console.error(err); log('\nCould not load the 3D scene. Use “Skip the 3D” to read everything as a page.'); });

// test hooks
window.__portfolio = { openPiano, pianoKey, enterCar, exitCar, offerRps, closeLaptop, tick, run: sec => { for (let i = 0; i < sec * 30; i++) tick(1 / 30); }, state, player, tv, sheriff, ranger, skipIntro, press, camera, goStation, setMood, sitDown, standUp, handOver, keys, audio, get house() { return house; }, get active() { return active; } };
