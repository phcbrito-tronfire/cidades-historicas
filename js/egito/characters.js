// Personagens humanos (montados com primitivas) e animais, com animação procedural
import * as THREE from 'three';
import { rr, rand, pick } from './util.js';

const matCache = new Map();
let TEX = null;
export function setCharTextures(t) { TEX = t; }
function m(color, o = {}) {
  const key = color + JSON.stringify(Object.keys(o)) + (o.map ? o.map.uuid : '') + (o.metalness || 0);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o }));
  return matCache.get(key);
}
export const gold = () => m(0xffc64a, { metalness: 1, roughness: 0.3 });
const bronze = () => m(0xb87333, { metalness: 0.9, roughness: 0.35 });

function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
  const me = new THREE.Mesh(geo, mat);
  me.position.set(x, y, z);
  me.castShadow = true;
  if (parent) parent.add(me);
  return me;
}
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);

export const SKINS = [0x8d5a3b, 0x7a4a2e, 0x9c6644, 0x6b3f26, 0xa8724c, 0x5e3720];

// ---------------------------------------------------------------------------
// Humanoide
// o = { skin, outfit, hair, height, collar, extras }
// outfits: kilt, longkilt, dress, explorer, pharaoh, priest, soldier, worker, child
// hair: short, long, bald, sidelock, nemes, khepresh, fedora, khat
// ---------------------------------------------------------------------------
export function makeHumanoid(o = {}) {
  const skinC = o.skin ?? pick(SKINS);
  const skin = m(skinC, { roughness: 0.6 });
  const linen = m(o.linen ?? 0xf1ead8, { roughness: 0.95 });
  const outfit = o.outfit || 'kilt';
  const root = new THREE.Group();
  const body = new THREE.Group();
  const HIP = 0.93;
  body.position.y = HIP;
  root.add(body);

  const isExp = outfit === 'explorer';
  const torsoMat = isExp ? m(0x5b3a22, { roughness: 0.7 }) : outfit === 'dress' ? linen : skin;
  const upperArmMat = isExp ? torsoMat : skin;
  const legMat = isExp ? m(0xa58e62, { roughness: 0.9 }) : skin;

  // quadril e tronco
  mesh(new THREE.BoxGeometry(0.32, 0.16, 0.2), isExp ? legMat : linen, 0, 0.03, 0, body);
  const chest = mesh(cap(0.16, 0.28), torsoMat, 0, 0.33, 0, body);
  chest.scale.set(1.22, 1, 0.72);
  if (isExp) {
    mesh(new THREE.BoxGeometry(0.2, 0.2, 0.05), m(0xd8cfb4), 0, 0.42, 0.105, body); // camisa
    mesh(new THREE.BoxGeometry(0.36, 0.05, 0.24), m(0x3a2414), 0, 0.09, 0, body); // cinto
    const strap = mesh(new THREE.BoxGeometry(0.05, 0.62, 0.02), m(0x4a2e18), 0, 0.3, 0.12, body); strap.rotation.z = 0.7;
    mesh(new THREE.BoxGeometry(0.2, 0.17, 0.08), m(0x6b4a2a), -0.2, 0.02, 0.06, body); // bolsa
    const whip = mesh(new THREE.TorusGeometry(0.07, 0.014, 6, 14), m(0x2a1a0e), 0.2, 0.0, 0.02, body); whip.rotation.y = Math.PI / 2;
  }
  const neck = mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 8), skin, 0, 0.6, 0, body);
  const head = new THREE.Group(); head.position.y = 0.72; body.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.115, 16, 12), skin, 0, 0, 0, head); skull.scale.set(0.92, 1.08, 1);
  mesh(new THREE.BoxGeometry(0.03, 0.05, 0.04), skin, 0, -0.01, 0.115, head);
  const eyeM = m(0x111111, { roughness: 0.3 });
  const kohl = !isExp;
  for (const s of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.016, 6, 5), eyeM, s * 0.04, 0.02, 0.1, head);
    if (kohl) { const k = mesh(new THREE.BoxGeometry(0.05, 0.007, 0.01), eyeM, s * 0.048, 0.03, 0.105, head); k.rotation.z = -s * 0.15; }
  }
  mesh(new THREE.BoxGeometry(0.05, 0.012, 0.01), m(0x5a2a1a), 0, -0.055, 0.105, head);

  // braços
  const mkArm = (s) => {
    const sh = new THREE.Group(); sh.position.set(s * 0.215, 0.49, 0); body.add(sh);
    mesh(cap(0.05, 0.2), upperArmMat, 0, -0.14, 0, sh);
    const el = new THREE.Group(); el.position.y = -0.29; sh.add(el);
    mesh(cap(0.044, 0.19), isExp ? torsoMat : skin, 0, -0.12, 0, el);
    const hand = new THREE.Group(); hand.position.y = -0.27; el.add(hand);
    mesh(new THREE.SphereGeometry(0.048, 8, 6), skin, 0, 0, 0, hand);
    sh.rotation.z = s * 0.08;
    return { sh, el, hand };
  };
  const armL = mkArm(-1), armR = mkArm(1);
  // pernas
  const bootM = m(0x2e1e12, { roughness: 0.6 });
  const mkLeg = (s) => {
    const hip = new THREE.Group(); hip.position.set(s * 0.095, 0, 0); body.add(hip);
    mesh(cap(0.068, 0.3), legMat, 0, -0.22, 0, hip);
    const knee = new THREE.Group(); knee.position.y = -0.45; hip.add(knee);
    mesh(cap(0.055, 0.3), isExp ? bootM : skin, 0, -0.2, 0, knee);
    const foot = mesh(new THREE.BoxGeometry(0.09, 0.05, 0.22), isExp ? bootM : m(0xb79c5c), 0, -0.44, 0.04, knee);
    if (!isExp && rand() < 0.5) foot.material = skin;
    return { hip, knee };
  };
  const legL = mkLeg(-1), legR = mkLeg(1);

  // roupas
  const kilt = (len = 0.42, rBot = 0.27, mat = linen) => {
    const k = mesh(new THREE.CylinderGeometry(0.19, rBot, len, 14), mat, 0, 0.08 - len / 2, 0, body);
    return k;
  };
  switch (outfit) {
    case 'kilt': kilt(); break;
    case 'worker': kilt(0.34, 0.24); break;
    case 'longkilt': kilt(0.82, 0.3); break;
    case 'priest': kilt(0.85, 0.3); {
      const lp = mesh(new THREE.BoxGeometry(0.36, 0.55, 0.26), m(0xffffff, { map: TEX.leopard }), 0.02, 0.3, 0, body); lp.rotation.z = 0.35;
    } break;
    case 'dress': {
      mesh(new THREE.CylinderGeometry(0.17, 0.27, 1.12, 14), linen, 0, -0.26, 0, body);
      for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.04, 0.2, 0.02), linen, s * 0.08, 0.42, 0.09, body);
    } break;
    case 'soldier': {
      kilt(0.4, 0.26);
      const apron = mesh(new THREE.BoxGeometry(0.16, 0.3, 0.02), m(0xffffff, { map: TEX.hide }), 0, -0.08, 0.2, body); apron.rotation.x = -0.1;
      mesh(new THREE.BoxGeometry(0.34, 0.25, 0.25), m(0xd8c8a0), 0, 0.33, 0, body); // corpete de linho acolchoado
    } break;
    case 'pharaoh': {
      kilt(0.45, 0.28);
      const ap = mesh(new THREE.BoxGeometry(0.14, 0.38, 0.02), gold(), 0, -0.1, 0.21, body); ap.rotation.x = -0.12;
      mesh(new THREE.BoxGeometry(0.36, 0.05, 0.24), gold(), 0, 0.09, 0, body);
      mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.75, 14, 1, true), m(0xf6f1e4, { transparent: true, opacity: 0.55, side: THREE.DoubleSide }), 0, -0.25, 0, body);
      for (const a of [armL, armR]) mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.04, 10), gold(), 0, -0.05, 0, a.el);
    } break;
    case 'child': kilt(0.18, 0.2); break;
  }
  if (o.collar !== null && outfit !== 'explorer') {
    const c = o.collar ?? (outfit === 'pharaoh' ? 'royal' : rand() < 0.6 ? pick([0x2c5d9c, 0x3aa3a0, 0xa8392a, 0xd9a23e]) : null);
    if (c) {
      const col = mesh(new THREE.CylinderGeometry(0.17, 0.235, 0.07, 18), c === 'royal' ? gold() : m(c), 0, 0.53, 0, body);
      if (c === 'royal') mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.035, 18), m(0x2c5d9c), 0, 0.5, 0, body);
      col.scale.z = 0.8;
    }
  }

  // cabeça
  const hair = o.hair || 'short';
  const black = m(0x15100c, { roughness: 0.9 });
  switch (hair) {
    case 'short': { const w = mesh(new THREE.SphereGeometry(0.128, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), black, 0, 0.01, -0.01, head); w.scale.set(1, 1.05, 1.05); } break;
    case 'long': {
      const w = mesh(new THREE.SphereGeometry(0.135, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), black, 0, 0.01, -0.01, head); w.scale.set(1.05, 1.1, 1.1);
      mesh(new THREE.BoxGeometry(0.26, 0.32, 0.12), black, 0, -0.14, -0.06, head);
      for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.06, 0.28, 0.06), black, s * 0.11, -0.14, 0.04, head);
      const band = mesh(new THREE.TorusGeometry(0.13, 0.012, 5, 18), gold(), 0, 0.05, 0, head); band.rotation.x = Math.PI / 2;
    } break;
    case 'sidelock': { const l = mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.22, 6), black, 0.105, -0.06, 0, head); l.rotation.z = 0.15; } break;
    case 'khat': { const w = mesh(new THREE.SphereGeometry(0.135, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), m(o.khat ?? 0xe8dcc0), 0, 0.01, -0.02, head); w.scale.set(1, 1.05, 1.15); mesh(new THREE.BoxGeometry(0.16, 0.16, 0.08), w.material, 0, -0.12, -0.1, head); } break;
    case 'nemes': case 'khepresh': {
      if (hair === 'nemes') {
        const n = mesh(new THREE.SphereGeometry(0.14, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), m(0xffffff, { map: TEX.nemes }), 0, 0.01, -0.01, head);
        n.scale.set(1.12, 1.15, 1.1);
        for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.07, 0.26, 0.04), n.material, s * 0.12, -0.15, 0.05, head);
        mesh(new THREE.BoxGeometry(0.15, 0.22, 0.08), n.material, 0, -0.14, -0.1, head);
      } else {
        const kh = mesh(new THREE.SphereGeometry(0.15, 16, 12), m(0x1f3f8c, { roughness: 0.35, metalness: 0.3 }), 0, 0.08, -0.03, head);
        kh.scale.set(1, 1.35, 1.15);
        for (let i = 0; i < 14; i++) { const a = rand() * Math.PI * 2, b = rand() * 1.2; mesh(new THREE.SphereGeometry(0.012, 5, 4), gold(), Math.cos(a) * 0.15 * Math.sin(b + 0.3), 0.1 + Math.cos(b) * 0.15, Math.sin(a) * 0.17 * Math.sin(b + 0.3) - 0.03, head); }
      }
      const ur = mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.07, 6), gold(), 0, 0.11, 0.13, head); ur.rotation.x = 0.3;
      mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.11, 6), m(0x2c5d9c), 0, -0.14, 0.09, head); // barba postiça
    } break;
    case 'fedora': {
      const felt = m(0x6b4a2e, { roughness: 0.85 });
      mesh(new THREE.SphereGeometry(0.122, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), m(0x4a2e18), 0, 0.0, -0.01, head);
      const crown = mesh(new THREE.CylinderGeometry(0.1, 0.122, 0.13, 16), felt, 0, 0.13, 0, head);
      crown.scale.z = 1.1;
      const dent = mesh(new THREE.BoxGeometry(0.03, 0.02, 0.16), m(0x5a3d24), 0, 0.2, 0, head);
      dent.visible = true;
      mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.014, 22), felt, 0, 0.075, 0, head).scale.z = 1.12;
      mesh(new THREE.CylinderGeometry(0.124, 0.124, 0.03, 16), m(0x2a1a0e), 0, 0.09, 0, head);
      // barba por fazer
      mesh(new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.35), m(0x4b3424, { transparent: true, opacity: 0.45 }), 0, -0.02, 0.02, head);
    } break;
    default: break; // careca
  }

  // acessórios
  const extras = o.extras || [];
  for (const e of extras) {
    if (e === 'spear') {
      const g = new THREE.Group();
      mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.0, 6), m(0x7a5a36), 0, 0.5, 0, g);
      mesh(new THREE.ConeGeometry(0.035, 0.18, 6), bronze(), 0, 1.58, 0, g);
      armR.hand.add(g);
    }
    if (e === 'shield') {
      const s = mesh(new THREE.BoxGeometry(0.4, 0.62, 0.03), m(0xffffff, { map: TEX.hide }), 0, -0.05, 0.08, armL.el);
      s.rotation.y = 0.2;
      mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 14, 1, false, 0, Math.PI), s.material, 0, 0.26, 0.08, armL.el).rotation.x = Math.PI / 2;
    }
    if (e === 'staff') { const st = mesh(new THREE.CylinderGeometry(0.014, 0.018, 1.7, 6), m(0x6b4a2e), 0, 0.35, 0, armR.hand); st.rotation.x = 0.1; }
    if (e === 'crook') {
      mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.4, 6), m(0x2c5d9c), 0, 0.1, 0, armR.hand);
      const hk = mesh(new THREE.TorusGeometry(0.05, 0.015, 5, 10, Math.PI), gold(), 0.05, 0.3, 0, armR.hand);
      hk.rotation.z = 0;
      mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.35, 6), gold(), 0, 0.08, 0, armL.hand);
    }
    if (e === 'scroll') { const sc = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), m(0xe9dcb4), 0, 0, 0.04, armL.hand); sc.rotation.z = Math.PI / 2; }
    if (e === 'basket') { mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.16, 10), m(0xb79c5c), 0, 0.2, 0, head); for (let i = 0; i < 5; i++) mesh(new THREE.SphereGeometry(0.06, 6, 5), pick([m(0xa82030), m(0xc88a48), m(0x6d9a3a)]), rr(-0.1, 0.1), 0.3, rr(-0.1, 0.1), head); }
    if (e === 'jar') { const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(0.03 + Math.sin(t * Math.PI) * 0.13, t * 0.34)); } mesh(new THREE.LatheGeometry(pts, 10), m(0xa4552f), 0, 0.12, 0, head); }
    if (e === 'khopesh') {
      const k = new THREE.Group();
      mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 6), m(0x3a2414), 0, 0, 0, k);
      const bl = mesh(new THREE.TorusGeometry(0.18, 0.018, 4, 12, Math.PI * 0.8), bronze(), 0.17, 0.2, 0, k); bl.rotation.z = 0.5; bl.scale.z = 0.4;
      mesh(new THREE.BoxGeometry(0.03, 0.18, 0.012), bronze(), 0, 0.16, 0, k);
      armR.hand.add(k); k.rotation.x = Math.PI / 2;
    }
  }

  const h = o.height || rr(1.62, 1.8);
  root.scale.setScalar(h / 1.8);

  const rig = { root, body, head, armL, armR, legL, legR, HIP, phase: rand() * 10, holding: false, talk: 0, pose: o.pose || null };
  return rig;
}

// mode: idle | walk | run | air | swim | wade | talk | sit | work
export function animateHumanoid(r, dt, speed, mode, t) {
  const L = r.legL, R = r.legR, AL = r.armL, AR = r.armR;
  let amp = Math.min(1, speed / 4.5);
  if (mode === 'run') amp = 1.25;
  r.phase += dt * (mode === 'swim' ? 3.2 : 2.2 + speed * 1.25);
  const p = r.phase;
  r.body.rotation.set(0, 0, 0);
  r.body.position.y = r.HIP;
  r.body.position.z = 0;
  AL.sh.rotation.set(0, 0, -0.08); AR.sh.rotation.set(0, 0, 0.08);
  AL.el.rotation.set(0, 0, 0); AR.el.rotation.set(0, 0, 0);
  L.hip.rotation.set(0, 0, 0); R.hip.rotation.set(0, 0, 0);
  L.knee.rotation.set(0, 0, 0); R.knee.rotation.set(0, 0, 0);
  r.head.rotation.set(0, 0, 0);

  if (mode === 'swim') {
    r.body.rotation.x = 1.3;
    r.body.position.y = r.HIP - 0.25;
    const k = speed > 0.3 ? 1 : 0.35;
    AL.sh.rotation.x = -((p) % (Math.PI * 2)) * k + (1 - k) * Math.sin(p) * 0.6 - (1 - k) * 1.2;
    AR.sh.rotation.x = -((p + Math.PI) % (Math.PI * 2)) * k + (1 - k) * Math.sin(p + 2) * 0.6 - (1 - k) * 1.2;
    AL.el.rotation.x = -0.3; AR.el.rotation.x = -0.3;
    L.hip.rotation.x = Math.sin(p * 2.2) * 0.35; R.hip.rotation.x = -Math.sin(p * 2.2) * 0.35;
    L.knee.rotation.x = 0.25; R.knee.rotation.x = 0.25;
    r.head.rotation.x = -0.9;
    return;
  }
  if (mode === 'air') {
    L.hip.rotation.x = -0.7; L.knee.rotation.x = 1.0; R.hip.rotation.x = 0.25; R.knee.rotation.x = 0.5;
    AL.sh.rotation.x = -0.6; AR.sh.rotation.x = -0.9; AL.sh.rotation.z = -0.5; AR.sh.rotation.z = 0.5;
    if (r.holding) { AR.sh.rotation.x = -0.6; AR.el.rotation.x = -0.6; }
    return;
  }
  if (mode === 'sit') {
    L.hip.rotation.x = -1.5; R.hip.rotation.x = -1.5; L.knee.rotation.x = 1.5; R.knee.rotation.x = 1.5;
    r.body.position.y = r.HIP - 0.45;
    AL.sh.rotation.x = -0.6; AR.sh.rotation.x = -0.6; AL.el.rotation.x = -0.6; AR.el.rotation.x = -0.6;
    return;
  }
  if (mode === 'work') { // amassar pão, martelar, etc.
    r.body.rotation.x = 0.35;
    AL.sh.rotation.x = -1.0 + Math.sin(t * 4) * 0.3; AR.sh.rotation.x = -1.0 + Math.sin(t * 4 + 1) * 0.3;
    AL.el.rotation.x = -0.5; AR.el.rotation.x = -0.5;
    L.knee.rotation.x = 0.15; R.knee.rotation.x = 0.15;
    return;
  }
  if (mode === 'walk' || mode === 'run' || mode === 'wade') {
    const s = Math.sin(p);
    const a = amp * (mode === 'wade' ? 0.7 : 1);
    L.hip.rotation.x = -s * 0.55 * a; R.hip.rotation.x = s * 0.55 * a;
    L.knee.rotation.x = Math.max(0, Math.sin(p - 1.2)) * 0.9 * a + 0.05;
    R.knee.rotation.x = Math.max(0, Math.sin(p + Math.PI - 1.2)) * 0.9 * a + 0.05;
    AL.sh.rotation.x = s * 0.5 * a; AR.sh.rotation.x = -s * 0.5 * a;
    AL.el.rotation.x = -0.25 - a * 0.3; AR.el.rotation.x = -0.25 - a * 0.3;
    r.body.position.y = r.HIP + Math.abs(Math.cos(p)) * 0.045 * a - 0.02 * a;
    r.body.rotation.x = mode === 'run' ? 0.18 : 0.04 * a;
    r.body.rotation.y = s * 0.06 * a;
  } else {
    // parado / conversando
    const br = Math.sin(t * 1.6 + r.phase) * 0.012;
    r.body.position.y = r.HIP + br * 0.3;
    AL.sh.rotation.x = br; AR.sh.rotation.x = -br;
    if (mode === 'talk') {
      AR.sh.rotation.x = -0.5 + Math.sin(t * 2.2) * 0.25; AR.el.rotation.x = -0.7 + Math.sin(t * 3.1) * 0.2;
      r.head.rotation.x = Math.sin(t * 2.7) * 0.05;
    }
  }
  if (r.holding) { AR.sh.rotation.x = -0.55; AR.el.rotation.x = -0.75; AR.sh.rotation.z = 0.1; }
  if (r.pose === 'spear') { AR.sh.rotation.x = -0.15; AR.el.rotation.x = -0.9; }
  if (r.pose === 'royal') { AL.sh.rotation.x = -0.35; AL.el.rotation.x = -1.2; AR.sh.rotation.x = -0.35; AR.el.rotation.x = -1.2; AL.sh.rotation.z = 0.25; AR.sh.rotation.z = -0.25; }
  if (r.pose === 'carry') { AL.sh.rotation.set(-0.1, 0, -2.7); AL.el.rotation.x = -0.5; }
}

// ---------------------------------------------------------------------------
// Animais
// ---------------------------------------------------------------------------
function quad({ bodyR, bodyL, legH, legR, color, mat, neck, headSize, headLen, tail }) {
  const g = new THREE.Group();
  const M = mat || m(color, { roughness: 0.85 });
  const body = new THREE.Group(); body.position.y = legH + bodyR * 0.8; g.add(body);
  const torso = mesh(cap(bodyR, bodyL), M, 0, 0, 0, body); torso.rotation.x = Math.PI / 2;
  const legs = [];
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const piv = new THREE.Group(); piv.position.set(x * bodyR * 0.55, 0, z * bodyL * 0.45); body.add(piv);
    mesh(new THREE.CylinderGeometry(legR, legR * 0.8, legH + bodyR * 0.6, 6), M, 0, -(legH + bodyR * 0.6) / 2, 0, piv);
    legs.push(piv);
  }
  const neckG = new THREE.Group(); neckG.position.set(0, bodyR * 0.4, bodyL / 2 + bodyR * 0.5); body.add(neckG);
  if (neck) { const nk = mesh(new THREE.CylinderGeometry(headSize * 0.5, headSize * 0.7, neck, 7), M, 0, neck / 2, 0, neckG); nk.rotation.x = 0.5; nk.position.z = neck * 0.22; }
  const head = new THREE.Group(); head.position.set(0, neck ? neck * 0.9 : 0, neck ? neck * 0.5 : 0); neckG.add(head);
  const hd = mesh(new THREE.BoxGeometry(headSize, headSize, headLen), M, 0, 0, headLen * 0.35, head);
  hd.rotation.x = 0.35;
  let tailG = null;
  if (tail) {
    tailG = new THREE.Group(); tailG.position.set(0, bodyR * 0.3, -bodyL / 2 - bodyR * 0.8); body.add(tailG);
    mesh(new THREE.CylinderGeometry(0.02, 0.03, tail, 5), M, 0, -tail / 2, 0, tailG).rotation.x = 0.3;
  }
  return { g, body, legs, head, tail: tailG, M };
}

export function makeAnimal(kind) {
  let a;
  switch (kind) {
    case 'cat': {
      const col = pick([0xb08a5a, 0x8a7a68, 0xc49a62, 0x3a3230]);
      a = quad({ bodyR: 0.07, bodyL: 0.22, legH: 0.14, legR: 0.02, color: col, neck: 0.06, headSize: 0.11, headLen: 0.1, tail: 0.28 });
      for (const s of [-1, 1]) mesh(new THREE.ConeGeometry(0.025, 0.06, 4), a.M, s * 0.035, 0.07, 0.03, a.head);
      a.tail.rotation.x = -2.2;
      a.speed = 0.9; a.scale = 1;
    } break;
    case 'donkey': {
      a = quad({ bodyR: 0.27, bodyL: 0.65, legH: 0.55, legR: 0.055, color: 0x8b8178, neck: 0.4, headSize: 0.2, headLen: 0.45, tail: 0.45 });
      for (const s of [-1, 1]) { const e = mesh(new THREE.ConeGeometry(0.04, 0.3, 4), a.M, s * 0.07, 0.22, 0.02, a.head); e.rotation.z = -s * 0.2; }
      mesh(new THREE.BoxGeometry(0.6, 0.3, 0.7), m(0xb79c5c), 0, 0.25, 0, a.body); // carga
      a.speed = 1.1;
    } break;
    case 'cow': {
      a = quad({ bodyR: 0.36, bodyL: 0.85, legH: 0.6, legR: 0.07, mat: m(0xffffff, { map: TEX.hide }), neck: 0.3, headSize: 0.26, headLen: 0.46, tail: 0.7 });
      for (const s of [-1, 1]) { const h = mesh(new THREE.TorusGeometry(0.22, 0.03, 5, 12, Math.PI * 0.75), m(0xe8dcc0), s * 0.18, 0.28, 0.05, a.head); h.rotation.set(0, s > 0 ? 0 : Math.PI, 0.4); }
      a.speed = 0.7;
    } break;
    case 'ibis': {
      const g = new THREE.Group();
      const white = m(0xf2efe6), black = m(0x151515);
      const body = new THREE.Group(); body.position.y = 0.42; g.add(body);
      mesh(new THREE.SphereGeometry(0.14, 10, 8), white, 0, 0, 0, body).scale.set(0.8, 0.8, 1.5);
      mesh(new THREE.SphereGeometry(0.08, 8, 6), black, 0, 0.02, -0.2, body).scale.set(0.7, 0.5, 1.4);
      const neck = mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.3, 6), black, 0, 0.16, 0.2, body); neck.rotation.x = 0.6;
      const head = new THREE.Group(); head.position.set(0, 0.28, 0.3); body.add(head);
      mesh(new THREE.SphereGeometry(0.04, 8, 6), black, 0, 0, 0, head);
      const bk = mesh(new THREE.CylinderGeometry(0.008, 0.016, 0.25, 5), black, 0, -0.06, 0.1, head); bk.rotation.x = 2.2;
      const legs = [];
      for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(s * 0.04, -0.02, 0); body.add(piv); mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.42, 4), black, 0, -0.21, 0, piv); legs.push(piv); }
      a = { g, body, legs, head, speed: 0.5 };
    } break;
    case 'croc': {
      const g = new THREE.Group();
      const skinM = m(0x4a5232, { roughness: 0.7 });
      const segs = [];
      let z = 0;
      for (let i = 0; i < 9; i++) {
        const w = 0.55 - Math.abs(i - 2) * 0.05 - (i > 3 ? (i - 3) * 0.04 : 0);
        const s = new THREE.Group(); s.position.z = z; g.add(s);
        mesh(new THREE.BoxGeometry(Math.max(0.1, w), 0.22 - i * 0.012, 0.4), skinM, 0, 0.12, 0, s);
        if (i < 7) mesh(new THREE.BoxGeometry(0.06, 0.05, 0.3), skinM, 0, 0.25, 0, s);
        segs.push(s); z -= 0.38;
      }
      const head = new THREE.Group(); head.position.set(0, 0.12, 0.25); g.add(head);
      mesh(new THREE.BoxGeometry(0.34, 0.12, 0.8), skinM, 0, 0.04, 0.4, head);
      const jaw = new THREE.Group(); jaw.position.set(0, -0.02, 0); head.add(jaw);
      mesh(new THREE.BoxGeometry(0.32, 0.07, 0.78), m(0x6a6a48), 0, -0.03, 0.4, jaw);
      for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.04, 6, 5), m(0xc8b040), s * 0.12, 0.12, 0.1, head);
      const legs = [];
      for (const [x, zz] of [[-1, -0.2], [1, -0.2], [-1, -1.3], [1, -1.3]]) { const l = mesh(new THREE.BoxGeometry(0.12, 0.1, 0.3), skinM, x * 0.32, 0.05, zz, g); l.rotation.y = x * 0.6; legs.push(l); }
      a = { g, segs, head, jaw, legs, speed: 0.3 };
    } break;
    case 'hippo': {
      const g = new THREE.Group();
      const hm = m(0x6e5a5a, { roughness: 0.5 });
      mesh(new THREE.SphereGeometry(1, 14, 10), hm, 0, 0, 0, g).scale.set(0.9, 0.7, 1.6);
      const head = new THREE.Group(); head.position.set(0, 0.2, 1.6); g.add(head);
      mesh(new THREE.BoxGeometry(0.9, 0.6, 0.9), hm, 0, 0, 0, head);
      for (const s of [-1, 1]) { mesh(new THREE.SphereGeometry(0.08, 6, 5), hm, s * 0.3, 0.38, -0.2, head); mesh(new THREE.SphereGeometry(0.06, 6, 5), m(0x111111), s * 0.25, 0.3, 0.05, head); }
      a = { g, head, speed: 0 };
    } break;
    case 'duck': {
      const g = new THREE.Group();
      mesh(new THREE.SphereGeometry(0.15, 8, 6), m(0x7a5a3a), 0, 0.05, 0, g).scale.set(0.8, 0.6, 1.3);
      mesh(new THREE.SphereGeometry(0.07, 8, 6), m(0x2a5a3a, { metalness: 0.3 }), 0, 0.17, 0.15, g);
      mesh(new THREE.BoxGeometry(0.04, 0.02, 0.07), m(0xd9a23e), 0, 0.16, 0.23, g);
      a = { g, speed: 0.4 };
    } break;
  }
  a.kind = kind;
  a.g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return a;
}

export function animateAnimal(a, dt, moving, t) {
  const ph = (a.ph = (a.ph || rand() * 10) + dt * (moving ? 7 : 0));
  if (a.legs && a.kind !== 'croc') {
    a.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.5 : 0; });
  }
  if (a.tail) a.tail.rotation.z = Math.sin(t * 2 + (a.ph || 0)) * 0.3;
  if (a.kind === 'croc') {
    a.jaw.rotation.x = Math.max(0, Math.sin(t * 0.25 + (a.seed || 0))) ** 8 * 0.6;
    if (moving) a.segs.forEach((s, i) => { s.position.x = Math.sin(ph * 0.5 - i * 0.6) * 0.08 * i * 0.3; });
  }
  if (a.kind === 'ibis' && !moving) a.head.position.y = 0.28 + Math.max(0, Math.sin(t * 0.8 + (a.seed || 0))) ** 6 * -0.25;
  if (a.kind === 'hippo') { a.g.position.y = -0.55 + Math.sin(t * 0.6 + (a.seed || 0)) * 0.12; a.head.rotation.x = Math.sin(t * 0.3) * 0.1; }
  if (a.kind === 'duck') a.g.position.y = Math.sin(t * 2 + (a.seed || 0)) * 0.02 - 0.03;
}

// Bando de pássaros (V simples batendo asas)
export function makeBird() {
  const g = new THREE.Group();
  const M = m(0x2a241e, { side: THREE.DoubleSide });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.15, 0, 0, -0.15, 0.6, 0, 0], 3));
  geo.computeVertexNormals();
  const wl = new THREE.Mesh(geo, M), wr = new THREE.Mesh(geo, M);
  wr.scale.x = -1;
  g.add(wl, wr);
  mesh(new THREE.SphereGeometry(0.08, 6, 4), M, 0, 0, 0, g).scale.set(0.7, 0.7, 2.2);
  return { g, wl, wr };
}
