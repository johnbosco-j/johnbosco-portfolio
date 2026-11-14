// The guide: an original toy-cowboy sheriff, built from primitives and animated procedurally.
// To use a rigged model instead, export it to GLB and swap this class's mesh for the loaded scene;
// the story only relies on the public methods (say-state, gesture, hopTo, faceTo, update).
import * as THREE from 'three';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0, ...o });
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

export class Sheriff {
  constructor(style = 'sheriff') {
    this.style = style; this.voice = -1; this.asleep = false;
    this.root = new THREE.Group();
    this.rig = new THREE.Group(); // squash & stretch container
    this.root.add(this.rig);
    this.gesture = 'idle'; this.gestureUntil = 0; this.talking = false;
    this.t = 0; this.yaw = 0; this.targetYaw = 0; this.hop = null; this.blink = 0; this.nextBlink = 2;
    this.build();
    this.root.scale.setScalar(0.46);
    this.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  }

  build() {
    const R = this.style === 'ranger';
    const M = {
      skin: mat(R ? 0xd9a07a : 0xe2a579), shirt: mat(R ? 0xf1f2f4 : 0x3e6f9e, R ? { roughness: 0.35 } : {}), vest: mat(R ? 0x16a3a0 : 0x5a3a26, { side: THREE.DoubleSide, roughness: R ? 0.4 : 0.85 }),
      pants: mat(R ? 0xe9eaee : 0x6b6253, R ? { roughness: 0.35 } : {}), boot: mat(R ? 0xf08a24 : 0x3a2418, { roughness: 0.5 }), hat: mat(0xc9a36a, { roughness: 0.9 }),
      band: mat(0x3a2418), gold: mat(0xf2c14e, { metalness: 0.9, roughness: 0.25, emissive: 0x4a3300 }),
      kerchief: mat(0x1f8a84), hair: mat(0x3b271a), white: mat(0xffffff, { roughness: 0.3 }), dark: mat(0x16110d, { roughness: 0.4 }),
    };
    const cap = (r, len, m) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), m);
    const sph = (r, m) => new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), m);
    const J = this.j = {};

    J.hips = new THREE.Group(); J.hips.position.y = 0.44; this.rig.add(J.hips);

    // legs
    for (const s of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(0.065 * s, 0, 0);
      const thigh = cap(0.056, 0.25, M.pants); thigh.position.y = -0.17; leg.add(thigh);
      const boot = cap(0.055, 0.1, M.boot); boot.position.y = -0.36; leg.add(boot);
      const toe = sph(0.058, M.boot); toe.scale.set(1, 0.62, 1.7); toe.position.set(0, -0.415, 0.045); leg.add(toe);
      J.hips.add(leg); J[s < 0 ? 'legR' : 'legL'] = leg;
    }

    // torso
    J.torso = new THREE.Group(); J.hips.add(J.torso);
    const chest = cap(0.105, 0.2, M.shirt); chest.position.y = 0.19; chest.scale.z = 0.82; J.torso.add(chest);
    const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.122, 0.27, 24, 1, true, 0.42, Math.PI * 2 - 0.84), M.vest);
    vest.position.y = 0.2; vest.scale.z = 0.84; J.torso.add(vest);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.045, 24), M.boot); belt.position.y = 0.035; belt.scale.z = 0.84; J.torso.add(belt);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.02), M.gold); buckle.position.set(0, 0.035, 0.094); J.torso.add(buckle);
    // star badge
    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.016 : 0.038, a = (i / 10) * Math.PI * 2 + Math.PI / 2; star[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    const badge = new THREE.Mesh(new THREE.ExtrudeGeometry(star, { depth: 0.008, bevelEnabled: false }), M.gold);
    badge.position.set(0.066, 0.26, 0.088); badge.rotation.y = 0.5; J.torso.add(badge);
    // kerchief
    const ker = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.026, 10, 22), M.kerchief); ker.rotation.x = Math.PI / 2; ker.position.y = 0.375; J.torso.add(ker);
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.085, 4), M.kerchief); knot.position.set(0, 0.33, 0.075); knot.rotation.set(Math.PI, Math.PI / 4, 0); J.torso.add(knot);

    // arms
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(0.135 * s, 0.33, 0);
      const up = cap(0.04, 0.12, M.shirt); up.position.y = -0.09; sh.add(up);
      const el = new THREE.Group(); el.position.y = -0.185; sh.add(el);
      const fore = cap(0.036, 0.11, M.shirt); fore.position.y = -0.08; el.add(fore);
      const hand = sph(0.045, M.skin); hand.position.y = -0.18; el.add(hand);
      J.torso.add(sh);
      J[s < 0 ? 'armR' : 'armL'] = sh; J[s < 0 ? 'elbowR' : 'elbowL'] = el;
    }

    // head
    J.head = new THREE.Group(); J.head.position.y = 0.41; J.torso.add(J.head);
    const skull = sph(0.118, M.skin); skull.scale.set(0.95, 1.12, 0.96); skull.position.y = 0.12; J.head.add(skull);
    const jaw = sph(0.085, M.skin); jaw.scale.set(1, 0.8, 0.95); jaw.position.set(0, 0.045, 0.02); J.head.add(jaw);
    for (const s of [-1, 1]) {
      const ear = sph(0.03, M.skin); ear.scale.z = 0.5; ear.position.set(0.112 * s, 0.11, 0); J.head.add(ear);
      const eye = sph(0.027, M.white); eye.position.set(0.043 * s, 0.145, 0.094); eye.scale.z = 0.6; J.head.add(eye);
      const pupil = sph(0.013, M.dark); pupil.position.set(0.043 * s, 0.145, 0.111); J.head.add(pupil);
      const lid = sph(0.029, M.skin); lid.position.copy(eye.position); lid.scale.set(1, 0.05, 0.7); J.head.add(lid);
      const brow = cap(0.008, 0.04, M.hair); brow.rotation.z = Math.PI / 2 - 0.16 * s; brow.position.set(0.045 * s, 0.186, 0.1); J.head.add(brow);
      if (!R) { const tash = cap(0.014, 0.05, M.hair); tash.rotation.z = Math.PI / 2 - 0.45 * s; tash.position.set(0.034 * s, 0.058, 0.108); J.head.add(tash); }
      J[s < 0 ? 'lidR' : 'lidL'] = lid; J[s < 0 ? 'browR' : 'browL'] = brow;
    }
    const nose = sph(0.022, M.skin); nose.scale.set(0.9, 1.1, 1.2); nose.position.set(0, 0.098, 0.116); J.head.add(nose);
    J.mouth = sph(0.024, M.dark); J.mouth.scale.set(1.3, 0.25, 0.4); J.mouth.position.set(0, 0.03, 0.094); J.head.add(J.mouth);
    const side = new THREE.Mesh(new THREE.SphereGeometry(0.121, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), M.hair);
    side.scale.set(0.97, 1.0, 0.99); side.position.set(0, 0.125, -0.012); side.rotation.x = -0.35; J.head.add(side);

    // hat
    J.hat = new THREE.Group(); J.hat.position.set(0, 0.2, 0); J.hat.rotation.x = -0.1; J.head.add(J.hat);
    const P = [[0, 0.15], [0.06, 0.158], [0.098, 0.135], [0.11, 0.03], [0.118, 0.0], [0.19, 0.006], [0.235, 0.03], [0.25, 0.062]].map(p => new THREE.Vector2(p[0], p[1]));
    if (!R) {
      const hatM = new THREE.Mesh(new THREE.LatheGeometry(P, 36), M.hat); hatM.material.side = THREE.DoubleSide; hatM.scale.z = 0.9; J.hat.add(hatM);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.118, 0.03, 30, 1, true), M.band); band.position.y = 0.02; band.scale.z = 0.9; J.hat.add(band);
    } else {
      // space ranger kit: bubble helmet, collar ring, chest console, backpack with fins
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.175, 28, 20), new THREE.MeshPhysicalMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.2, roughness: 0.03, metalness: 0, envMapIntensity: 2, depthWrite: false }));
      dome.position.y = 0.13; J.head.add(dome); this.dome = dome;
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.03, 12, 28), M.vest); collar.rotation.x = Math.PI / 2; collar.position.y = 0.0; J.head.add(collar);
      const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.085, 0.03), mat(0x23262b, { roughness: 0.3 })); consoleBox.position.set(0, 0.23, 0.094); J.torso.add(consoleBox);
      [0xe5484d, 0x30a46c, 0x3e63dd].forEach((c, i) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 12), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.2 })); b.rotation.x = Math.PI / 2; b.position.set(-0.036 + i * 0.036, 0.235, 0.112); J.torso.add(b); });
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.07), M.shirt); pack.position.set(0, 0.22, -0.11); J.torso.add(pack);
      for (const s of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.012), M.vest); fin.position.set(0.14 * s, 0.26, -0.12); fin.rotation.z = 0.35 * s; J.torso.add(fin); }
      this.jet = new THREE.PointLight(0xff9a3a, 0, 1.2, 2); this.jet.position.set(0, 0.08, -0.14); J.torso.add(this.jet);
    }
  }

  get headWorld() { return this.j.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.07, 0)); }

  play(name, seconds = 1.6) { this.gesture = name; this.gestureUntil = this.t + seconds; }
  faceTo(p) { const d = p.clone().sub(this.root.position); this.targetYaw = Math.atan2(d.x, d.z); }

  hopTo(target, { height = 0.28, duration = 0.62, delay = 0 } = {}) {
    return new Promise(res => {
      this.hop = { from: this.root.position.clone(), to: target.clone(), height, duration, t: -delay, res };
      const d = target.clone().sub(this.root.position); if (d.lengthSq() > 1e-4) this.targetYaw = Math.atan2(d.x, d.z);
    });
  }
  async hopPath(points, opt) { for (const p of points) await this.hopTo(p, opt); }

  update(dt, lookTarget) {
    this.t += dt; const t = this.t, J = this.j;
    if (this.gesture !== 'idle' && t > this.gestureUntil) this.gesture = 'idle';
    let squash = 1;

    if (this.hop) {
      const h = this.hop; h.t += dt;
      if (h.t < 0) { squash = 1 - 0.18 * (1 + h.t / 0.15 > 0 ? Math.min(1, 1 + h.t / 0.15) : 0); }
      else {
        const k = Math.min(1, h.t / h.duration);
        this.root.position.lerpVectors(h.from, h.to, k);
        this.root.position.y += Math.sin(k * Math.PI) * h.height;
        squash = 1 + 0.16 * Math.sin(k * Math.PI);
        if (k >= 1) { this.root.position.copy(h.to); this.landAt = t; const r = h.res; this.hop = null; r(); }
      }
    } else if (lookTarget && !this.asleep) this.faceTo(lookTarget);
    if (this.landAt !== undefined) { const k = (t - this.landAt) / 0.28; if (k < 1) squash = 1 - 0.2 * Math.sin(k * Math.PI); }
    this.rig.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));

    let dy = this.targetYaw - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.yaw += dy * (1 - Math.exp(-9 * dt)); this.root.rotation.y = this.yaw;

    // pose targets
    const g = this.gesture, air = !!this.hop && this.hop.t > 0;
    const breathe = Math.sin(t * 2.1) * 0.012;
    const T = {
      torsoX: breathe, torsoZ: Math.sin(t * 0.9) * 0.025, headX: Math.sin(t * 0.7) * 0.04, headY: Math.sin(t * 0.45) * 0.12, headZ: 0,
      aLx: 0, aLz: 0.16, eL: 0.12, aRx: 0, aRz: -0.16, eR: 0.12, legL: 0, legR: 0, hat: -0.1, mouth: 0.25, hipsY: 0.44 + breathe * 0.4,
    };
    if (this.talking) {
      T.headX += Math.sin(t * 7.3) * 0.05; T.headZ = Math.sin(t * 3.1) * 0.06;
      // lip sync: follow the recorded voice when there is one, otherwise a syllable-ish flap
      T.mouth = this.voice >= 0 ? 0.25 + this.voice * 2.1 : 0.35 + Math.abs(Math.sin(t * 11) * Math.sin(t * 4.3)) * 1.5;
      T.aLx = -0.5 + Math.sin(t * 3.2) * 0.25; T.eL = 1.0 + Math.sin(t * 4.1) * 0.3; T.aLz = 0.3;
      T.aRz = -0.22; T.eR = 0.3;
    }
    if (g === 'wave') { T.aRz = -2.55 + Math.sin(t * 9) * 0.28; T.eR = 0.5 + Math.sin(t * 9 + 1) * 0.35; T.headZ = -0.14; T.mouth = 1.1; }
    if (g === 'pointL') { T.aLz = 1.35; T.aLx = -0.25; T.eL = 0.05; T.headY = 0.5; T.torsoZ = -0.06; }
    if (g === 'pointR') { T.aRz = -1.35; T.aRx = -0.25; T.eR = 0.05; T.headY = -0.5; T.torsoZ = 0.06; }
    if (g === 'thumb') { T.aRz = -1.1; T.aRx = 0.9; T.eR = 1.9; T.headY = -0.35; T.torsoX = -0.05; }
    if (g === 'tip') { T.aRz = -0.9; T.aRx = -1.75; T.eR = 2.05; T.hat = 0.22; T.headX = 0.22; }
    if (g === 'cheer') { const b = Math.abs(Math.sin(t * 8)); T.aLz = 2.6; T.aRz = -2.6; T.eL = T.eR = 0.3; T.hipsY += b * 0.05; T.mouth = 1.6; T.headX = -0.15; }
    if (g === 'think') { T.aRz = -0.5; T.aRx = -1.3; T.eR = 2.2; T.headZ = 0.16; T.headX = -0.08; }
    if (g === 'yawn') { T.aLz = 2.3; T.aRz = -2.3; T.eL = T.eR = 0.9; T.headX = -0.45; T.mouth = 2.4; T.torsoX = -0.12; }
    if (this.asleep && !air) { T.legL = T.legR = -1.5; T.hipsY = 0.075; T.headX = 0.55 + Math.sin(t * 1.2) * 0.04; T.headY = 0; T.torsoX = 0.16 + Math.sin(t * 1.2) * 0.03; T.aLz = 0.1; T.aRz = -0.1; T.eL = T.eR = 0.5; T.hat = 0.5; T.mouth = 0.5 + Math.sin(t * 1.2) * 0.3; }
    if (air) { T.legL = -0.7; T.legR = 0.5; T.aLz = 1.0; T.aRz = -1.0; T.torsoX = 0.12; }

    const k = 12;
    J.torso.rotation.x = damp(J.torso.rotation.x, T.torsoX, k, dt); J.torso.rotation.z = damp(J.torso.rotation.z, T.torsoZ, k, dt);
    J.head.rotation.x = damp(J.head.rotation.x, T.headX, k, dt); J.head.rotation.y = damp(J.head.rotation.y, T.headY, 6, dt); J.head.rotation.z = damp(J.head.rotation.z, T.headZ, k, dt);
    J.armL.rotation.x = damp(J.armL.rotation.x, T.aLx, k, dt); J.armL.rotation.z = damp(J.armL.rotation.z, T.aLz, k, dt);
    J.armR.rotation.x = damp(J.armR.rotation.x, T.aRx, k, dt); J.armR.rotation.z = damp(J.armR.rotation.z, T.aRz, k, dt);
    J.elbowL.rotation.x = damp(J.elbowL.rotation.x, -T.eL, k, dt); J.elbowR.rotation.x = damp(J.elbowR.rotation.x, -T.eR, k, dt);
    J.legL.rotation.x = damp(J.legL.rotation.x, T.legL, k, dt); J.legR.rotation.x = damp(J.legR.rotation.x, T.legR, k, dt);
    J.hat.rotation.x = damp(J.hat.rotation.x, T.hat, k, dt);
    J.hips.position.y = damp(J.hips.position.y, T.hipsY, k, dt);
    J.mouth.scale.y = damp(J.mouth.scale.y, T.mouth, 30, dt);

    // blink
    if (t > this.nextBlink) { this.blink = 0.14; this.nextBlink = t + 1.8 + Math.random() * 3.5; }
    this.blink = Math.max(0, this.blink - dt);
    const lid = this.blink > 0 || this.asleep ? 1 : 0.05;
    if (this.jet) this.jet.intensity = air ? 2.5 : 0;
    J.lidL.scale.y = J.lidR.scale.y = damp(J.lidL.scale.y, lid, 40, dt);
  }
}
