// O centro monumental de Roma em 117 d.C.: o Fórum Romano (Rostra, Cúria, as basílicas Emília e Júlia, os templos
// de Saturno, de Castor e Pólux, de Vesta e do Divino Júlio), o Arco de Tito na Via Sacra, o Templo de Vênus e Roma,
// o Colosso e a Meta Sudans junto ao Coliseu, o Templo de Júpiter no alto do Capitólio e o Circo Máximo.
// Prédios alinhados aos eixos (frente para ±x ou ±z): a colisão é feita de caixas.
import * as THREE from 'three';
import { mat4 } from '../comum/batcher.js';
import { addBox, addCircle } from '../comum/collision.js';
import { ionicColumn, pedimentGeo, roofHalf } from '../atenas/arquitetura.js';
import { sculptureInstance } from '../comum/sculptures.js';
import { terrainHeight, FORUM, CIRCUS, CAPITOL } from './terrain.js';
import { rr, rand } from '../comum/util.js';

const V3 = THREE.Vector3;
// ângulo de cada direção da fachada: frente para +x, -x, +z, -z
const FACE = { '+x': 0, '-x': Math.PI, '+z': -Math.PI / 2, '-z': Math.PI / 2 };

// coluna coríntia: fuste canelado (da jônica) e capitel em sino com folhas de acanto
const corinthCache = {};
function corinthian(h, r) {
  return (corinthCache[`${h}|${r}`] ??= (() => {
    const g = ionicColumn(h - r * 1.2, r).clone();
    const bell = new THREE.LatheGeometry([[r * 0.95, 0], [r * 1.0, r * 0.4], [r * 1.25, r * 0.9], [r * 1.5, r * 1.2]].map(([a, b]) => new THREE.Vector2(a, b)), 20); bell.translate(0, h - r * 1.2, 0);
    const ab = new THREE.BoxGeometry(r * 3.1, r * 0.2, r * 3.1); ab.translate(0, h - r * 0.1, 0);
    return [g, bell, ab];
  })());
}

// templo romano: pódio alto com escadaria só na frente, pórtico de colunas, cela fechada, frontão e telhado de telhas
// o = { x, z, face, w (largura), d (profundidade), h (coluna), podium, cols (na frente), deep (fileiras do pórtico), name }
function temple(B, M, out, o) {
  const y = Math.max(terrainHeight(o.x, o.z), terrainHeight(o.x + 3, o.z + 3)) - 0.2, ry = FACE[o.face];
  const F = mat4(o.x, y, o.z, 0, ry, 0), box = (mat, w, h, d, x, yy, z, ex = {}) => B.box(mat, w, h, d, x, yy, z, { frame: F, ...ex });
  const W = o.w, D = o.d, P = o.podium, H = o.h, r = H / 20, cols = o.cols, ic = (W - r * 3) / (cols - 1);
  // pódio (concreto revestido de mármore) e escadaria na frente (+x local)
  box(M.marbleWall, D, P, W, 0, 0, 0);
  box(M.travertine, D + 1.2, 9, W + 1.2, 0, -9, 0); // alicerce até o chão (em encosta o pódio não fica no ar)
  box(M.marble, D + 0.3, 0.35, W + 0.3, 0, P - 0.35, 0);
  const nSt = Math.ceil(P / 0.3), run = 0.38;
  for (let i = 0; i < nSt; i++) box(M.marble, run, (i + 1) * (P / nSt), W * 0.75, D / 2 + run * (nSt - i - 0.5), 0, 0);
  // colunas: o pórtico na frente (deep fileiras) e meias colunas nas laterais da cela
  const front = D / 2 - r * 2, deep = o.deep ?? 2;
  const colGeo = corinthian(H, r);
  for (let k = 0; k < deep; k++) for (let i = 0; i < cols; i++) {
    if (k > 0 && i > 0 && i < cols - 1) continue;
    const lx = front - k * ic, lz = -W / 2 + r * 1.5 + i * ic;
    for (const g of colGeo) B.geo(g, M.colMarble, 0, 0, 0, { frame: F.clone().multiply(mat4(lx, P, lz)), uv: false });
  }
  const cellaL = D - deep * ic - r * 2;
  box(o.cellaMat || M.marbleWall, cellaL, H, W - r * 3, -D / 2 + cellaL / 2 + r, P, 0);
  box(M.dark, 0.1, H * 0.62, W * 0.22, -D / 2 + cellaL + r + 0.06, P, 0); // porta (bronze escuro)
  // entablamento, frontão e telhado
  box(M.marble, D, H * 0.16, W, 0, P + H, 0);
  const pg = pedimentGeo(W, W * 0.2, 0.9);
  B.geo(pg, M.marble, 0, 0, 0, { frame: F.clone().multiply(mat4(D / 2 - 0.4, P + H * 1.16, 0, 0, Math.PI / 2, 0)) });
  B.geo(pg, M.marble, 0, 0, 0, { frame: F.clone().multiply(mat4(-D / 2 + 0.4, P + H * 1.16, 0, 0, Math.PI / 2, 0)) });
  for (const s of [-1, 1]) B.geo(roofHalf(D + 0.6, W / 2 + 0.4, W * 0.2), M.tiles, 0, 0, 0, { frame: F.clone().multiply(mat4(0, P + H * 1.16 + W * 0.2, 0, 0, s > 0 ? 0 : Math.PI, 0)) });
  // colisão: o pódio (topo andável pela escada), a cela e as colunas
  const swap = o.face === '+z' || o.face === '-z', ax = swap ? W : D, az = swap ? D : W;
  addBox(o.x, o.z, ax, az, y - 1, y + P);
  const sgn = o.face === '-x' || o.face === '+z' ? -1 : 1;
  for (let i = 0; i < nSt; i++) { const lx = D / 2 + run * (nSt - i - 0.5), top = y + (i + 1) * (P / nSt); if (swap) addBox(o.x, o.z - sgn * lx, W * 0.75, run, y - 1, top); else addBox(o.x + sgn * lx, o.z, run, W * 0.75, y - 1, top); }
  const cx = -D / 2 + cellaL / 2 + r;
  if (swap) addBox(o.x, o.z - sgn * cx, W - r * 3, cellaL, y + P - 0.5, y + P + H); else addBox(o.x + sgn * cx, o.z, cellaL, W - r * 3, y + P - 0.5, y + P + H);
  out.exclusions.push([o.x - ax / 2 - 8, o.x + ax / 2 + 8, o.z - az / 2 - 8, o.z + az / 2 + 8]);
  out.spots[o.id] = new V3(o.x + (swap ? 0 : sgn * (D / 2 + nSt * run + 2)), y, o.z - (swap ? sgn * (D / 2 + nSt * run + 2) : 0));
}

// basílica: grande salão de colunas com telhado de duas águas e arcadas de dois andares na fachada comprida
function basilica(B, M, out, o) {
  const y = terrainHeight(o.x, o.z) - 0.2, L = o.L, W = o.W, H = 9;
  B.box(M.marble, L + 2, 0.8, W + 2, o.x, y, o.z);
  for (let lv = 0; lv < 2; lv++) for (let i = 0; i <= Math.floor(L / 5); i++) for (const s of [-1, 1]) {
    const x = o.x - L / 2 + i * (L / Math.floor(L / 5)), z = o.z + s * (W / 2 - 0.6);
    B.box(M.travertine, 1.3, H * 0.62, 1.3, x, y + 0.8 + lv * H * 0.7, z);
    if (lv === 0) addBox(x, z, 1.3, 1.3, y - 1, y + 0.8 + H * 1.4);
  }
  for (let lv = 0; lv < 2; lv++) for (const s of [-1, 1]) B.box(M.travertine, L, H * 0.1, 1.4, o.x, y + 0.8 + lv * H * 0.7 + H * 0.62, o.z + s * (W / 2 - 0.6));
  B.box(M.marbleWall, L - 6, H * 1.55, W - 9, o.x, y + 0.8, o.z); // nave central, mais alta
  for (const s of [-1, 1]) B.geo(roofHalf(L + 1, W / 2 + 0.5, 3.4), M.tiles, o.x, y + 0.8 + H * 1.42 + 3.4, o.z, { ry: s > 0 ? 0 : Math.PI }); // cumeeira ao longo do comprimento
  addBox(o.x, o.z, L - 6, W - 9, y - 1, y + 0.8 + H * 1.55);
  addBox(o.x, o.z, L + 2, W + 2, y - 1, y + 0.8);
  out.exclusions.push([o.x - L / 2 - 6, o.x + L / 2 + 6, o.z - W / 2 - 6, o.z + W / 2 + 6]);
}

// arco do triunfo: um vão em arco pleno, colunas encostadas e o ático com a inscrição
function arch(B, M, out, o) {
  const y = terrainHeight(o.x, o.z) - 0.2, w = o.w, h = o.h, d = o.d, ow = w * 0.4, oh = h * 0.62;
  const s = new THREE.Shape(); const r = ow / 2;
  s.moveTo(-w / 2, 0); s.lineTo(-ow / 2, 0); s.lineTo(-ow / 2, oh - r); s.absarc(0, oh - r, r, Math.PI, 0, true); s.lineTo(ow / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 12 }); g.translate(0, 0, -d / 2);
  B.geo(g, M.marbleWall, o.x, y, o.z, { ry: o.ry || 0 });
  B.box(M.marble, w + 0.6, h * 0.3, d + 0.6, o.x, y + h, o.z, { ry: o.ry || 0 }); // ático
  B.box(M.dark, w * 0.6, h * 0.16, 0.05, o.x + Math.sin(o.ry || 0) * (d / 2 + 0.32), y + h + h * 0.07, o.z + Math.cos(o.ry || 0) * (d / 2 + 0.32), { ry: o.ry || 0 }); // inscrição
  for (const sd of [-1, 1]) for (const fr of [-1, 1]) { const cx = o.x + Math.cos(o.ry || 0) * sd * (w / 2 - 1.1) + Math.sin(o.ry || 0) * fr * (d / 2 + 0.3), cz = o.z - Math.sin(o.ry || 0) * sd * (w / 2 - 1.1) + Math.cos(o.ry || 0) * fr * (d / 2 + 0.3); for (const cg of corinthian(h * 0.88, 0.3)) B.geo(cg, M.colMarble, cx, y, cz, { uv: false }); }
  // colisão: os dois pilares (o vão fica livre)
  const ax = Math.abs(Math.cos(o.ry || 0)) > 0.5;
  for (const sd of [-1, 1]) { const off = (w + ow) / 4; if (ax) addBox(o.x + sd * off, o.z, (w - ow) / 2, d, y - 1, y + h * 1.3); else addBox(o.x, o.z + sd * off, d, (w - ow) / 2, y - 1, y + h * 1.3); }
  out.spots[o.id] = new V3(o.x, y, o.z);
}

// templo redondo (Vesta): pódio circular, anel de colunas e telhado cônico
function roundTemple(B, M, out, o) {
  const y = terrainHeight(o.x, o.z) - 0.2, R = o.r, P = 2.2, H = 7.5;
  B.geo(new THREE.CylinderGeometry(R + 1, R + 1.2, P, 32), M.marbleWall, o.x, y + P / 2, o.z);
  B.geo(new THREE.CylinderGeometry(R - 1.2, R - 1.2, H, 28), M.marbleWall, o.x, y + P + H / 2, o.z);
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; for (const g of corinthian(H, 0.32)) B.geo(g, M.colMarble, o.x + Math.cos(a) * R, y + P, o.z + Math.sin(a) * R, { uv: false }); }
  B.geo(new THREE.CylinderGeometry(R + 0.5, R + 0.5, 0.8, 32), M.marble, o.x, y + P + H + 0.4, o.z);
  B.geo(new THREE.ConeGeometry(R + 0.8, 3.4, 32, 1, true), M.bronze, o.x, y + P + H + 0.8 + 1.7, o.z, { uv: false });
  addCircle(o.x, o.z, R + 1, y - 1, y + P + H);
  out.spots[o.id] = new V3(o.x + R + 3, y, o.z);
}

export function buildForum(B, M, out) {
  const S = out.spots, F = FORUM;
  // praça do Fórum: lajes de travertino
  for (let x = F.x - F.hw + 8; x < F.x + F.hw - 8; x += 12) for (let z = F.z - F.hd + 8; z < F.z + F.hd - 8; z += 12) B.box(M.travertine2, 12.05, 0.3, 12.05, x + 6, terrainHeight(x + 6, z + 6) - 0.22, z + 6);
  // Rostra: a tribuna dos oradores, enfeitada com os esporões (rostra) de navios capturados
  { const x = F.x - F.hw + 22, z = F.z - 4, y = terrainHeight(x, z) - 0.2; B.box(M.marbleWall, 10, 3.2, 24, x, y, z); for (let i = 0; i < 6; i++) B.box(M.bronze, 1.4, 0.6, 0.5, x + 5.2, y + 1.6, z - 9 + i * 3.6); addBox(x, z, 10, 24, y - 1, y + 3.2); for (let i = 0; i < 8; i++) B.box(M.marble, 0.42, (i + 1) * 0.4, 6, x - 5.2 - 0.42 * (8 - i - 0.5), y, z); S.rostra = new V3(x, y + 3.2, z); }
  // Cúria Júlia (o Senado): caixa alta de tijolo rebocado, portas de bronze e frontão
  { const x = F.x - F.hw + 34, z = F.z - F.hd - 14, y = terrainHeight(x, z) - 0.2; B.box(M.plaster, 18, 21, 26, x, y, z); B.box(M.dark, 0.1, 6, 3.6, x + 9.05, y + 0.6, z); B.geo(pedimentGeo(26, 4, 1), M.plaster, x + 8.6, y + 21, z, { ry: Math.PI / 2 }); for (let i = 0; i < 6; i++) B.box(M.marble, 0.35, (i + 1) * 0.12, 7, x + 9.2 + 0.35 * (6 - i - 0.5), y, z); addBox(x, z, 18, 26, y - 1, y + 21); out.exclusions.push([x - 14, x + 14, z - 18, z + 18]); S.curia = new V3(x + 12, y, z); }
  basilica(B, M, out, { x: F.x + 8, z: F.z - F.hd - 16, L: 88, W: 26 }); // Basílica Emília (norte)
  basilica(B, M, out, { x: F.x - 6, z: F.z + F.hd + 18, L: 92, W: 30 }); // Basílica Júlia (sul)
  temple(B, M, out, { id: 'saturno', x: F.x - F.hw + 6, z: F.z + F.hd + 8, face: '+x', w: 14, d: 24, h: 11, podium: 5, cols: 6 });
  temple(B, M, out, { id: 'castores', x: F.x + 58, z: F.z + F.hd + 10, face: '-z', w: 16, d: 28, h: 12.5, podium: 6.5, cols: 8 });
  temple(B, M, out, { id: 'cesar', x: F.x + F.hw - 22, z: F.z - 2, face: '-x', w: 13, d: 20, h: 9.5, podium: 3.6, cols: 6 });
  roundTemple(B, M, out, { id: 'vesta', x: F.x + F.hw - 8, z: F.z + F.hd + 14, r: 6 });
  S.forum = new V3(F.x, F.y, F.z);
  // Arco de Tito, na Via Sacra entre o Fórum e o Coliseu (celebra a tomada de Jerusalém, 70 d.C.)
  arch(B, M, out, { id: 'arcoTito', x: -112, z: -6, w: 13.5, h: 11, d: 4.6, ry: Math.PI / 2 });
  // Templo de Vênus e Roma (de Adriano: começa a ser erguido logo depois de 117 — aqui, já de pé, ao norte da Via Sacra)
  temple(B, M, out, { id: 'venusRoma', x: -132, z: -64, face: '+z', w: 30, d: 54, h: 15, podium: 3, cols: 10, deep: 2 });
  // Templo de Júpiter Ótimo Máximo, no alto do Capitólio, o maior templo da cidade
  temple(B, M, out, { id: 'jupiter', x: CAPITOL.x + 4, z: CAPITOL.z, face: '+x', w: 34, d: 42, h: 16, podium: 4, cols: 6, deep: 3 });
  // Meta Sudans: a fonte cônica entre o Coliseu e o Arco de Tito
  { const x = -86, z = 6, y = terrainHeight(x, z) - 0.2; B.geo(new THREE.CylinderGeometry(8, 8, 0.8, 32), M.marbleWall, x, y + 0.4, z); B.geo(new THREE.CylinderGeometry(7.4, 7.4, 0.2, 32), M.water || M.marble, x, y + 0.75, z); B.geo(new THREE.ConeGeometry(2.2, 12, 20), M.brick, x, y + 6.4, z); addCircle(x, z, 8, y - 1, y + 1); S.metaSudans = new V3(x + 10, y, z); }
  // Circo Máximo: a pista de areia, a spina no meio com o obelisco e as metas, arquibancadas nos lados
  {
    const C = CIRCUS, y = terrainHeight(C.x, C.z) - 0.15;
    B.box(M.sand, C.hw * 2 - 30, 0.3, C.hd * 2 - 14, C.x, y - 0.1, C.z);
    B.box(M.marbleWall, C.hw * 2 - 90, 1.4, 4, C.x, y, C.z); addBox(C.x, C.z, C.hw * 2 - 90, 4, y - 1, y + 1.4);
    B.geo(new THREE.CylinderGeometry(0.2, 1.4, 22, 4), M.granite || M.brick, C.x, y + 12.4, C.z, { ry: Math.PI / 4 }); // obelisco de Ramsés II (trazido por Augusto)
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) B.geo(new THREE.ConeGeometry(0.8, 5, 12), M.bronze, C.x + s * (C.hw - 46), y + 3.9, C.z - 1.4 + i * 1.4);
    for (const s of [-1, 1]) for (let k = 0; k < 6; k++) {
      const z = C.z + s * (C.hd - 4 + k * 1.6), yy = y + k * 1.1;
      B.box(M.travertine, C.hw * 2 - 20, 1.1, 1.6, C.x, yy, z); addBox(C.x, z, C.hw * 2 - 20, 1.6, yy - 1, yy + 1.1);
    }
    out.exclusions.push([C.x - C.hw - 10, C.x + C.hw + 10, C.z - C.hd - 14, C.z + C.hd + 14]);
    S.circus = new V3(C.x, y, C.z);
  }
}

// o Colosso: estátua de bronze de ~30 m (era Nero, virou o deus Sol), em pedestal ao lado do Coliseu
export async function placeColossus(scene) {
  const x = -88, z = -42, y = terrainHeight(x, z) - 0.2; // entre o Coliseu e o Templo de Vênus e Roma
  const ped = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 12), new THREE.MeshStandardMaterial({ color: 0xd8ccb4, roughness: 0.8 }));
  ped.position.set(x, y + 3, z); ped.castShadow = true; ped.receiveShadow = true; scene.add(ped); addBox(x, z, 12, 12, y - 1, y + 6);
  const o = await sculptureInstance('doryphoros', 30); if (!o.children.length) return;
  const h = new THREE.Group(); h.position.set(x, y + 6, z); h.rotation.y = Math.PI * 0.6; h.add(o); scene.add(h);
  // coroa de raios do Sol
  const crown = new THREE.Group(); const gold = new THREE.MeshStandardMaterial({ color: 0xd8a83a, metalness: 0.9, roughness: 0.3 });
  for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.ConeGeometry(0.35, 3.2, 6), gold); const a = -0.9 + i * 0.3; r.position.set(Math.sin(a) * 1.3, 1.6, Math.cos(a) * 1.3 - 0.3); r.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5); crown.add(r); }
  crown.position.set(x, y + 6 + 28.6, z); scene.add(crown);
}
