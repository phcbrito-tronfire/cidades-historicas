// Animais de Mênfis com formas orgânicas e pelagem: gato egípcio, burro, gado de chifres longos,
// íbis, crocodilo, hipopótamo e pato. Pernas com joelho e cauda curva para animação simples.
import * as THREE from 'three';
import { rand, pick, mulberry32 } from './util.js';

const texCache = new Map();
// pelagem: tom base + fios curtos + manchas opcionais (malhado, pintado)
function fur(base, dark, { spots = 0, stripes = 0, patches = 0, scales = false, seed = 1 } = {}) {
  const key = [base, dark, spots, stripes, patches, scales, seed].join('|');
  if (texCache.has(key)) return texCache.get(key);
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), r = mulberry32(seed);
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  if (scales) {
    for (let j = 0; j < S; j += 14) for (let i = 0; i < S; i += 16) {
      const ox = (j / 14) % 2 ? 8 : 0;
      x.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.2})`; x.beginPath(); x.ellipse(i + ox, j, 7.5, 6, 0, 0, 7); x.fill();
      x.fillStyle = `rgba(255,255,220,${0.05 + r() * 0.08})`; x.beginPath(); x.ellipse(i + ox - 2, j - 2, 4, 3, 0, 0, 7); x.fill();
    }
  }
  for (let i = 0; i < 2600; i++) { // fios
    const px = r() * S, py = r() * S, l = 3 + r() * 6;
    x.strokeStyle = r() < 0.5 ? `rgba(0,0,0,${0.06 + r() * 0.1})` : `rgba(255,255,255,${0.04 + r() * 0.08})`;
    x.lineWidth = 1; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 2, py + l); x.stroke();
  }
  x.fillStyle = dark;
  for (let i = 0; i < spots; i++) { x.globalAlpha = 0.6 + r() * 0.3; x.beginPath(); x.ellipse(r() * S, r() * S, 4 + r() * 6, 3 + r() * 5, r() * 3, 0, 7); x.fill(); }
  for (let i = 0; i < stripes; i++) { x.globalAlpha = 0.55; const y = (i + 0.5) * (S / stripes); x.fillRect(0, y, S, 6 + r() * 6); }
  for (let i = 0; i < patches; i++) { x.globalAlpha = 0.95; x.beginPath(); x.ellipse(r() * S, r() * S, 30 + r() * 50, 20 + r() * 40, r() * 3, 0, 7); x.fill(); }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}
const matCache = new Map();
const mat = (o) => { const k = JSON.stringify(Object.entries(o).map(([a, b]) => [a, b && b.uuid ? b.uuid : b])); if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ roughness: 0.85, ...o })); return matCache.get(k); };
const dark = () => mat({ color: 0x15100c, roughness: 0.3 });
const mesh = (geo, m, x = 0, y = 0, z = 0, parent, rot, sc) => {
  const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); if (rot) me.rotation.set(...rot); if (sc) me.scale.set(...sc);
  me.castShadow = true; if (parent) parent.add(me); return me;
};
const cap = (r, l, seg = 12) => new THREE.CapsuleGeometry(r, l, 5, seg);
const sph = (r, a = 16, b = 12) => new THREE.SphereGeometry(r, a, b);
const tube = (pts, r, seg = 16) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 8, false);

// quadrúpede genérico (frente em +z, pés no y = 0)
function quadruped(o) {
  const g = new THREE.Group();
  const M = o.mat;
  const by = o.legLen + o.r * 0.75;
  const body = new THREE.Group(); body.position.y = by; g.add(body);
  mesh(cap(o.r, o.len), M, 0, 0, 0, body, [Math.PI / 2, 0, 0], [1, 1, 0.95]);
  mesh(sph(o.r * 1.06), M, 0, o.r * 0.08, o.len * 0.45, body, null, [1, 1.05, 1]);   // peito
  mesh(sph(o.r * 1.02), M, 0, o.r * 0.06, -o.len * 0.45, body, null, [1.02, 1, 1]); // garupa
  if (o.belly) mesh(sph(o.r * 0.9), o.belly, 0, -o.r * 0.25, 0, body, null, [1, 0.8, o.len / o.r * 0.55]);
  // pescoço e cabeça
  const neck = new THREE.Group(); neck.position.set(0, o.r * 0.45, o.len * 0.5 + o.r * 0.35); neck.rotation.x = o.neckAngle; body.add(neck);
  mesh(cap(o.r * 0.42, o.neckLen), M, 0, o.neckLen / 2, 0, neck);
  if (o.mane) mesh(new THREE.BoxGeometry(o.r * 0.12, o.neckLen * 1.05, o.r * 0.25), o.mane, 0, o.neckLen / 2, -o.r * 0.38, neck);
  const head = new THREE.Group(); head.position.y = o.neckLen + o.r * 0.1; head.rotation.x = -o.neckAngle + 0.3; neck.add(head);
  mesh(sph(o.headR), M, 0, 0, 0, head, null, [0.85, 0.95, 1.05]);
  const sn = mesh(cap(o.headR * 0.55, o.snout), o.muzzle || M, 0, -o.headR * 0.25, o.headR * 0.55 + o.snout / 2, head, [Math.PI / 2 + 0.25, 0, 0]);
  void sn;
  mesh(sph(o.headR * 0.18, 8, 6), dark(), 0, -o.headR * 0.35, o.headR * 0.6 + o.snout + o.headR * 0.2, head); // focinho
  for (const s of [-1, 1]) {
    mesh(sph(o.headR * 0.12, 8, 6), dark(), s * o.headR * 0.62, o.headR * 0.25, o.headR * 0.55, head);
    const e = mesh(new THREE.ConeGeometry(o.earR, o.earLen, 8), o.earMat || M, s * o.headR * 0.55, o.headR * 0.75 + o.earLen * 0.35, -o.headR * 0.15, head, [0, 0, -s * o.earTilt]);
    e.scale.z = 0.45;
  }
  // pernas com joelho
  const legs = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const hip = new THREE.Group(); hip.position.set(sx * o.r * 0.55, -o.r * 0.2, sz * o.len * 0.42); body.add(hip);
    const up = o.legLen * 0.52, lo = o.legLen * 0.5;
    mesh(cap(o.legR, up), M, 0, -up / 2, 0, hip);
    const knee = new THREE.Group(); knee.position.y = -up; hip.add(knee);
    mesh(cap(o.legR * 0.72, lo), o.lower || M, 0, -lo / 2, 0, knee);
    mesh(new THREE.CylinderGeometry(o.legR * 0.8, o.legR * 0.95, o.legR * 0.9, 10), o.hoof || dark(), 0, -lo - o.r * 0.12, o.hoofFwd || 0, knee);
    legs.push({ hip, knee, front: sz > 0 });
  }
  // cauda
  const tail = new THREE.Group(); tail.position.set(0, o.r * 0.35, -o.len * 0.5 - o.r * 0.7); body.add(tail);
  mesh(tube(o.tailPts, o.tailR), o.tailMat || M, 0, 0, 0, tail);
  if (o.tuft) mesh(sph(o.tailR * 2.4, 8, 6), o.tuft, ...o.tailPts[o.tailPts.length - 1], tail, null, [1, 1.6, 1]);
  return { g, body, head, neck, legs, tail, neckBase: o.neckAngle };
}

export function makeAnimal(kind) {
  let a;
  switch (kind) {
    case 'cat': {
      const coat = pick([['#b8946a', '#5a4430'], ['#a89a86', '#3c3630'], ['#c9a46e', '#6a4a2c']]);
      const M = mat({ map: fur(coat[0], coat[1], { spots: 70, stripes: 0, seed: 3 }) });
      a = quadruped({ mat: M, len: 0.22, r: 0.075, legLen: 0.17, legR: 0.02, neckLen: 0.05, neckAngle: 0.5, headR: 0.058, snout: 0.02, earR: 0.022, earLen: 0.06, earTilt: 0.15,
        tailPts: [[0, 0, 0], [0, 0.05, -0.12], [0, 0.18, -0.22], [0, 0.3, -0.2]], tailR: 0.012, hoof: M });
      a.speed = 0.9;
    } break;
    case 'donkey': {
      const M = mat({ map: fur('#8a8278', '#4a4440', { seed: 5 }) });
      const muzzle = mat({ map: fur('#cfc6b8', '#8a8070', { seed: 6 }) });
      a = quadruped({ mat: M, belly: muzzle, muzzle, len: 0.72, r: 0.27, legLen: 0.6, legR: 0.055, neckLen: 0.42, neckAngle: 0.75, headR: 0.15, snout: 0.26,
        earR: 0.05, earLen: 0.3, earTilt: 0.18, mane: mat({ color: 0x2e2a26 }), tailPts: [[0, 0, 0], [0, -0.25, -0.08], [0, -0.5, -0.06]], tailR: 0.02, tuft: mat({ color: 0x2e2a26 }) });
      // cestos de carga
      for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.32, 12), mat({ color: 0xb79c5c, roughness: 1 }), s * 0.33, 0.05, 0, a.body);
      mesh(new THREE.BoxGeometry(0.62, 0.04, 0.5), mat({ color: 0x8a3a2a }), 0, 0.27, 0, a.body);
      a.speed = 1.1;
    } break;
    case 'cow': {
      const M = mat({ map: fur('#ece4d4', '#7a4a2a', { patches: 5, seed: rand() < 0.5 ? 7 : 8 }) });
      a = quadruped({ mat: M, len: 0.95, r: 0.36, legLen: 0.66, legR: 0.07, neckLen: 0.28, neckAngle: 0.45, headR: 0.19, snout: 0.22,
        earR: 0.06, earLen: 0.14, earTilt: 1.3, muzzle: mat({ color: 0xd8c0b0 }), tailPts: [[0, 0, 0], [0, -0.35, -0.05], [0, -0.7, -0.03]], tailR: 0.022, tuft: mat({ color: 0x3a2a20 }) });
      // chifres em lira, como os bois das pinturas egípcias
      const horn = mat({ color: 0xe8dcc0, roughness: 0.5 });
      for (const s of [-1, 1]) mesh(tube([[s * 0.08, 0.12, 0], [s * 0.3, 0.25, 0.02], [s * 0.36, 0.5, -0.02], [s * 0.28, 0.68, 0.0]], 0.028, 14), horn, 0, 0, 0, a.head);
      a.speed = 0.7;
    } break;
    case 'ibis': {
      const g = new THREE.Group();
      const white = mat({ map: fur('#f4f1ea', '#d8d2c6', { seed: 9 }) }), black = mat({ color: 0x141414, roughness: 0.5 });
      const body = new THREE.Group(); body.position.y = 0.44; g.add(body);
      mesh(sph(0.15), white, 0, 0, 0, body, null, [0.8, 0.8, 1.45]);
      mesh(new THREE.ConeGeometry(0.1, 0.2, 10), black, 0, 0.02, -0.25, body, [-Math.PI / 2 - 0.3, 0, 0], [1, 1, 0.5]); // penas da cauda
      for (const s of [-1, 1]) mesh(sph(0.1), white, s * 0.1, 0.02, -0.02, body, null, [0.35, 0.6, 1.4]); // asas
      mesh(tube([[0, 0.05, 0.18], [0, 0.2, 0.25], [0, 0.3, 0.22]], 0.025), black, 0, 0, 0, body); // pescoço preto
      const head = new THREE.Group(); head.position.set(0, 0.31, 0.24); body.add(head);
      mesh(sph(0.04), black, 0, 0, 0, head);
      mesh(tube([[0, 0, 0.03], [0, -0.04, 0.13], [0, -0.13, 0.24]], 0.009, 10), black, 0, 0, 0, head); // bico curvo
      const legs = [];
      for (const s of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(s * 0.04, -0.04, 0); body.add(hip); mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.4, 5), black, 0, -0.2, 0, hip); legs.push({ hip, knee: null }); }
      a = { g, body, head, legs, speed: 0.5 };
    } break;
    case 'croc': {
      const g = new THREE.Group();
      const sk = mat({ map: fur('#4f5734', '#23281a', { scales: true, seed: 11 }), roughness: 0.6 });
      const belly = mat({ color: 0xb8b090, roughness: 0.7 });
      const segs = [];
      const N = 14;
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const w = 0.32 * (1 - Math.pow(Math.abs(t - 0.28) / 0.72, 1.6) * 0.92) + 0.03;
        const s = new THREE.Group(); s.position.z = 0.55 - i * 0.24; g.add(s);
        mesh(sph(1, 14, 10), sk, 0, 0.13, 0, s, null, [w, w * 0.5, 0.2]);
        if (i > 1 && i < N - 1) for (const sx of i < 8 ? [-0.06, 0.06] : [0]) mesh(new THREE.ConeGeometry(0.025, 0.06, 4), sk, sx, 0.13 + w * 0.5, 0, s);
        segs.push(s);
      }
      mesh(sph(1, 12, 8), belly, 0, 0.08, -0.6, g, null, [0.25, 0.08, 0.9]);
      const head = new THREE.Group(); head.position.set(0, 0.13, 0.75); g.add(head);
      mesh(cap(0.12, 0.55), sk, 0, 0.02, 0.3, head, [Math.PI / 2, 0, 0], [1.25, 1, 0.5]);
      const jaw = new THREE.Group(); head.add(jaw);
      mesh(cap(0.11, 0.55), belly, 0, -0.05, 0.3, jaw, [Math.PI / 2, 0, 0], [1.15, 1, 0.35]);
      for (let i = 0; i < 8; i++) for (const s of [-1, 1]) mesh(new THREE.ConeGeometry(0.008, 0.03, 4), mat({ color: 0xf0e8d0 }), s * 0.1, -0.02, 0.05 + i * 0.07, head, [Math.PI, 0, 0]);
      for (const s of [-1, 1]) mesh(sph(0.035, 8, 6), mat({ color: 0xc8b040, roughness: 0.2 }), s * 0.09, 0.1, 0.02, head);
      const legs = [];
      for (const [x, z] of [[-1, 0.35], [1, 0.35], [-1, -0.75], [1, -0.75]]) {
        const hip = new THREE.Group(); hip.position.set(x * 0.25, 0.1, z); g.add(hip);
        mesh(cap(0.05, 0.22), sk, x * 0.12, -0.03, 0, hip, [0, 0, x * 1.2]);
        legs.push({ hip, knee: null });
      }
      a = { g, segs, head, jaw, legs, speed: 0.3 };
    } break;
    case 'hippo': {
      const g = new THREE.Group();
      const sk = mat({ map: fur('#7a6466', '#4a3a3c', { seed: 13 }), roughness: 0.45 });
      mesh(sph(1, 24, 16), sk, 0, 0, 0, g, null, [0.95, 0.75, 1.6]);
      const head = new THREE.Group(); head.position.set(0, 0.25, 1.55); g.add(head);
      mesh(sph(0.45, 20, 14), sk, 0, 0, 0, head, null, [1, 0.8, 1.1]);
      mesh(sph(0.42, 20, 14), mat({ map: fur('#a07a76', '#6a4a48', { seed: 14 }), roughness: 0.45 }), 0, -0.1, 0.45, head, null, [1.15, 0.75, 0.9]);
      for (const s of [-1, 1]) {
        mesh(sph(0.08, 10, 8), sk, s * 0.28, 0.38, -0.15, head, null, [1, 1.2, 0.7]);
        mesh(sph(0.055, 8, 6), dark(), s * 0.24, 0.27, 0.12, head);
        mesh(sph(0.04, 8, 6), dark(), s * 0.14, 0.12, 0.82, head);
      }
      a = { g, head, speed: 0 };
    } break;
    case 'duck': {
      const g = new THREE.Group();
      const brown = mat({ map: fur('#7a5a3a', '#3a2a1a', { stripes: 6, seed: 15 }) });
      mesh(sph(0.15), brown, 0, 0.05, 0, g, null, [0.8, 0.6, 1.3]);
      mesh(sph(0.07), mat({ color: 0x2a5a3a, metalness: 0.3, roughness: 0.3 }), 0, 0.17, 0.15, g);
      mesh(new THREE.BoxGeometry(0.04, 0.02, 0.07), mat({ color: 0xd9a23e }), 0, 0.16, 0.23, g);
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
    a.legs.forEach((l, i) => {
      const s = moving ? Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) : 0;
      l.hip.rotation.x = s * 0.45;
      if (l.knee) l.knee.rotation.x = moving ? Math.max(0, -s) * (l.front ? -0.6 : 0.6) : 0;
    });
  }
  if (a.tail) { a.tail.rotation.z = Math.sin(t * 2 + (a.ph || 0)) * 0.25; a.tail.rotation.x = Math.sin(t * 1.3) * 0.1; }
  if (a.neck && a.kind !== 'cat') a.neck.rotation.x = a.neckBase + (moving ? 0 : Math.max(0, Math.sin(t * 0.3 + (a.seed || 0))) ** 4 * 0.9); // pastando
  if (a.kind === 'croc') {
    a.jaw.rotation.x = Math.max(0, Math.sin(t * 0.25 + (a.seed || 0))) ** 8 * 0.5;
    a.segs.forEach((s, i) => { s.position.x = moving ? Math.sin(ph * 0.5 - i * 0.5) * 0.05 * (i / 4) : 0; });
    if (moving) a.legs.forEach((l, i) => { l.hip.rotation.y = Math.sin(ph + i * Math.PI / 2) * 0.5; });
  }
  if (a.kind === 'ibis' && !moving) a.head.position.y = 0.31 + Math.max(0, Math.sin(t * 0.8 + (a.seed || 0))) ** 6 * -0.28;
  if (a.kind === 'hippo') { a.g.position.y = -0.55 + Math.sin(t * 0.6 + (a.seed || 0)) * 0.12; a.head.rotation.x = Math.sin(t * 0.3) * 0.1; }
  if (a.kind === 'duck') a.g.position.y = Math.sin(t * 2 + (a.seed || 0)) * 0.02 - 0.03;
}
