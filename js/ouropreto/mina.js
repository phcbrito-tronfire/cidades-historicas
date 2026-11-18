// A mina por dentro (Etapa 7): a galeria aberta no Morro da Queimada. A boca, escorada com madeira, fica no barranco
// das lavras; quem entra (E) desce para a galeria: estreita, baixa, molhada, escorada a cada dois metros com os
// quadros de madeira (duas esteios e o chapéu), as poças, a canoa de lavar, as lamparinas de sebo nas paredes e, no fim,
// a frente de trabalho, onde o veio de quartzo com o ouro aparece na rocha. Três mineradores trabalham lá dentro.
// A galeria é montada à parte, longe e abaixo da vila (o chão dela é só dela); a entrada e a saída levam o explorador.
import * as THREE from 'three';
import { Batcher } from '../comum/batcher.js';
import { frame } from './kit.js';
import { setTerrain, addCircle } from '../comum/collision.js';
import { groundHeight, terrainHeight, PLACES } from './terrain.js';

export const MINA = { x: 1650, z: 0, y: -60, box: [1600, 1720, -80, 40] }; // (onde a galeria fica montada)
const dentro = (x, z) => x > MINA.box[0] && x < MINA.box[1] && z > MINA.box[2] && z < MINA.box[3];
setTerrain((x, z) => (dentro(x, z) ? MINA.y : groundHeight(x, z))); // (o chão da galeria; fora dela, o de sempre)

export function buildMina(scene, tex, M, out) {
  const B = new Batcher(); B.yxz = true;
  const P = tex.pbr || {}, rk = P.rock_face_03 || P.rock_wall_08 || {};
  const rocha = new THREE.MeshStandardMaterial({ map: rk.map || null, normalMap: rk.normalMap || null, color: 0x7a6a5a, roughness: 0.95 }); rocha.userData.uv = { s: 1.6 };
  const barro = new THREE.MeshStandardMaterial({ ...(P.barro_ocre ? { map: P.barro_ocre.map, normalMap: P.barro_ocre.normalMap } : {}), color: 0x6a4a32, roughness: 0.9 }); barro.userData.uv = { s: 1.4 };
  const madeira = M.madeiraEsc || new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.9 });
  const agua = new THREE.MeshStandardMaterial({ color: 0x2a2a22, roughness: 0.08, metalness: 0.2 });
  const quartzo = new THREE.MeshStandardMaterial({ color: 0xb8b0a0, roughness: 0.55, map: rk.map || null }), ouro = new THREE.MeshStandardMaterial({ color: 0xe8b84a, metalness: 0.9, roughness: 0.3, emissive: 0x3a2808, emissiveIntensity: 0.6 });
  const W = 1.9, H = 2.05, y = MINA.y;
  // o traçado: entra reto, dobra para o veio, desce um pouco e termina na frente de trabalho
  const pts = [[0, 0], [0, -12], [5, -19], [5, -30], [-1, -38], [-1, -46]].map(([a, b]) => [MINA.x + a, MINA.z + b]);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), f = frame(B, (ax + bx) / 2, y, (az + bz) / 2, ry), e = L + W;
    const t0 = i > 0 ? W * 0.75 : -W / 2, t1 = i < pts.length - 2 ? W * 0.75 : -W / 2, wl = L - t0 - t1, wc = (t0 - t1) / 2; // (as paredes param antes das curvas: ali fica a câmara da dobra)
    f.box(barro, W + 0.3, 0.3, e, 0, -0.3, 0); // o chão de barro
    for (const s of [-1, 1]) { f.box(rocha, 0.6, H + 0.2, wl, s * (W / 2 + 0.3), -0.1, wc); f.solid(s * (W / 2 + 0.3), wc, 0.6, wl, -1, H + 1, true); } // as paredes
    f.box(rocha, W + 1.2, 0.6, e, 0, H, 0); f.solid(0, 0, W + 1.2, e, H, H + 2, true); // o teto (a câmera fica dentro)
    for (let k = 0.6; k < L - 0.3; k += 2.1) { const z = -L / 2 + k; for (const s of [-1, 1]) f.box(madeira, 0.16, H - 0.05, 0.18, s * (W / 2 - 0.08), 0, z); f.box(madeira, W, 0.18, 0.2, 0, H - 0.2, z); } // os quadros de madeira
    if (i % 2 === 1) f.box(agua, 0.9, 0.02, 1.4, 0.3, 0.005, 0.5); // uma poça
  }
  for (let j = 1; j < pts.length - 1; j++) { const [jx, jz] = pts[j], d1 = Math.atan2(pts[j - 1][0] - jx, pts[j - 1][1] - jz), d2 = Math.atan2(pts[j + 1][0] - jx, pts[j + 1][1] - jz), f = frame(B, jx, y, jz, 0), R = W / 2 + 0.55;
    const dist = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; if (dist(a, d1) < 0.62 || dist(a, d2) < 0.62) continue; const x = Math.sin(a) * R, z = Math.cos(a) * R; f.box(rocha, 1.0, H + 0.2, 0.6, x, -0.1, z, { ry: a }); const [wx, wz] = f.W(x, z); addCircle(wx, wz, 0.42, y - 1, y + H + 1); }
    f.box(barro, W + 1.6, 0.3, W + 1.6, 0, -0.3, 0); f.box(rocha, W + 2.2, 0.6, W + 2.2, 0, H, 0); f.solid(0, 0, W + 2.2, W + 2.2, H, H + 2, true); } // (a câmara da dobra)
  // a boca (por onde se sai): a luz do dia lá no fim do primeiro lanço
  { const f = frame(B, MINA.x, y, MINA.z + W / 2 + 0.6, 0); f.box(new THREE.MeshBasicMaterial({ color: 0xd8dcd0 }), W, H, 0.1, 0, 0, 0); f.solid(0, 0, W + 1, 0.4, -1, H + 1, true); for (const s of [-1, 1]) f.box(madeira, 0.2, H, 0.22, s * (W / 2 - 0.1), 0, -0.2); f.box(madeira, W + 0.2, 0.22, 0.24, 0, H - 0.2, -0.2); }
  // a frente de trabalho: a rocha com o veio de quartzo e as pintas de ouro, o carumbé de cascalho, a canoa
  const [ex, ez] = pts[pts.length - 1], [px2, pz2] = pts[pts.length - 2], ery = Math.atan2(ex - px2, ez - pz2);
  { const f = frame(B, ex, y, ez, ery); f.box(rocha, W + 1.2, H + 0.2, 0.8, 0, -0.1, W / 2 + 0.4); f.solid(0, W / 2 + 0.4, W + 1.2, 0.8, -1, H + 1, true);
    for (let k = 0; k < 7; k++) f.box(quartzo, 0.34, 0.16 + (k % 3) * 0.04, 0.07, -W / 2 + 0.2 + k * 0.27, 0.86 + k * 0.045 + Math.sin(k * 1.7) * 0.05, W / 2 - 0.03, { rz: 0.18 + Math.sin(k) * 0.1 }); // (o veio de quartzo: lascas brancas encardidas, na diagonal) for (let k = 0; k < 14; k++) f.box(ouro, 0.03, 0.03, 0.03, -W / 2 + 0.15 + k * 0.12, 0.98 + Math.sin(k * 2.3) * 0.1, W / 2 - 0.06);
    f.box(madeira, 0.6, 0.12, 2.4, -0.4, 0, -1.6); for (const s of [-1, 1]) f.box(madeira, 0.06, 0.18, 2.4, -0.4 + s * 0.28, 0.12, -1.6); f.box(agua, 0.46, 0.02, 2.3, -0.4, 0.2, -1.6); // a canoa de lavar
    f.geo(new THREE.CylinderGeometry(0.24, 0.17, 0.32, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xa88a58, roughness: 1, side: THREE.DoubleSide }), 0.55, 0.16, -0.5, { uv: false }); }
  B.build(scene);
  // as lamparinas de sebo nas paredes (os pontos de luz; as duas luzes de dentro vêm para cá quando o explorador entra)
  const lamps = [];
  for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], t = 0.5, x = ax + (bx - ax) * t, z = az + (bz - az) * t, ry = Math.atan2(bx - ax, bz - az), side = i % 2 ? 1 : -1; lamps.push(new THREE.Vector3(x + Math.cos(ry) * side * (W / 2 - 0.15), y + 1.55, z - Math.sin(ry) * side * (W / 2 - 0.15))); }
  out.candles.push(...lamps);
  out.interiors.push({ id: 'mina', at: [pts[2][0], pts[2][1]], y, light: [[pts[1][0], pts[1][1]], y + 1.6], light2: [[ex, ez], y + 1.6] });
  // os mineradores lá dentro (postos pela gente da vila) e a boca de fora, no barranco das lavras
  out.minaGente = [[ex - Math.sin(ery) * 0.9, ez - Math.cos(ery) * 0.9, ery], [pts[3][0] + 0.4, pts[3][1] + 2, Math.PI], [pts[2][0] - 0.25, pts[2][1] - 0.5, 0.4]]; // (no meio da câmara da dobra, longe da parede)
  out.mina = { entra: [MINA.x, MINA.z - 0.6, Math.PI], fim: [ex, ez], y };
  // a boca de fora: num lugar das lavras onde o morro sobe (o barranco)
  const Q = PLACES.queimada; let best = null;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) for (const d of [16, 20, 24]) { const x = Q.x + Math.cos(a) * d, z = Q.z + Math.sin(a) * d, h0 = terrainHeight(x, z), fx = (Q.x - x) / d, fz = (Q.z - z) / d, h1 = terrainHeight(x - fx * 6, z - fz * 6); const rise = h1 - h0; if (!best || rise > best.rise) best = { x, z, y: h0, face: Math.atan2(fx, fz), rise }; }
  out.minaBoca = best;
  // (a boca: o rombo escorado, cavado num barranco de terra, com o cascalho tirado ao lado — fica lá todos os dias)
  { const { x, z, y: by, face } = best, g = new THREE.Group(), terra = new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 1 });
    const hole = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.8, 0.9), new THREE.MeshBasicMaterial({ color: 0x050403 })); hole.position.set(0, 0.85, -0.38); g.add(hole);
    for (const sx of [-0.85, 0.85]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.1, 0.2), madeira); p.position.set(sx, 0.9, 0.08); g.add(p); } const v = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.22, 0.24), madeira); v.position.set(0, 1.95, 0.08); g.add(v);
    const morro = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), terra); morro.scale.set(3.6, 2.6, 3.4); morro.position.set(0, -0.15, -3.1); g.add(morro);
    const monte = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), terra); monte.scale.set(1.4, 0.5, 1); monte.position.set(1.8, -0.1, 1.2); g.add(monte);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.position.set(x, by - 0.1, z); g.rotation.y = face; scene.add(g);
    const fx = Math.sin(face), fz = Math.cos(face), cx = x - fx * 3.1, cz = z - fz * 3.1; addCircle(cx, cz, 3.2, by - 1, by + 2.4); } // (o barranco é sólido)
  return { lamps };
}
