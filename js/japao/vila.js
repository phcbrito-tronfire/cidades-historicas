// A vila dos oshi (inspirada em Kamiyoshida, Fujiyoshida): a rua larga que sobe do lago até o santuário, com um
// canal de pedra correndo na beira. Ao norte, lojas e hospedarias de dois andares (machiya) com a grade koshi e a
// cortina noren na porta; no meio, as casas dos oshi — portão, jardim, a casa grande de palha com o altar da
// confraria Fuji-kō e os quartos dos peregrinos; perto do santuário, casas de chá com banco vermelho e guarda-sol.
// Fora da rua: casas de fazenda (minka) de palha e armazéns brancos (kura). Todas as casas são abertas: doma
// (chão de terra com o fogão), salas de tatame com o irori (fogo no chão) e o tokonoma com o pergaminho.
import * as THREE from 'three';
import { addCircle, addBox } from '../comum/collision.js';
import { mulberry32 } from '../comum/util.js';
import { frame, toro, nobori, chochin } from './kit.js';
import { terrainHeight, STREET, FIELDS, RESIDENCE, polyDist, STREAM } from './terrain.js';

const V3 = THREE.Vector3;
const rnd = mulberry32(1792);
const rr = (a, b) => a + rnd() * (b - a);

// ---------------- a casa (um andar, palha ou telha) ----------------
// o: { x, z, ry, w, d, roof: 'thatch'|'kawara', doma: largura do chão de terra (à esquerda de quem entra),
//      front: 'koshi'|'shoji'|'open', engawa: varanda no fundo, kind: 'oshi'|'farm'|'inn'|'tea'|'shop', sign }
export function house(B, M, out, o) {
  const c0 = Math.cos(o.ry), s0 = Math.sin(o.ry); // assentada pelo canto mais baixo (com a soleira da porta): nenhuma porta fica alta demais para entrar
  const y = Math.min(...[[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0], [-0.6, 1.25]].map(([a, b]) => terrainHeight(o.x + a * o.w / 2 * c0 + b * o.d / 2 * s0, o.z - a * o.w / 2 * s0 + b * o.d / 2 * c0))) + 0.05;
  const f = frame(B, o.x, y, o.z, o.ry), w = o.w, d = o.d, hw = w / 2, hd = d / 2, H = o.h || 2.7, FL = 0.45, dm = o.doma ?? 3.4;
  const xd = -hw + dm; // divisa entre o chão de terra e o assoalho
  // alicerce de pedra e o chão
  f.box(M.stoneLight, w + 0.3, 0.3, d + 0.3, 0, -0.25, 0);
  f.box(M.earthFloor, dm, 0.08, d, -hw + dm / 2, 0.05, 0);
  f.solid(-hw + dm / 2, 0, dm, d, -1, 0.12, true); f.box(M.stoneLight, 2.2, 0.1, 0.8, -hw + dm / 2, 0, d / 2 + 0.4); f.solid(-hw + dm / 2, d / 2 + 0.4, 2.2, 0.8, -1, 0.1, true); // o chão firme da doma e a soleira de pedra (em terreno desigual o degrau não fica alto demais)
  f.box(M.wood, w - dm, FL - 0.06, d, xd + (w - dm) / 2, 0, 0); f.box(M.tatami, w - dm - 0.2, 0.06, d - 0.2, xd + (w - dm) / 2, FL - 0.06, 0);
  f.solid(xd + (w - dm) / 2, 0, w - dm, d, -1, FL, true);
  f.box(M.stoneLight, 0.9, 0.22, 0.5, xd - 0.7, 0.02, hd - 1.6); // a pedra de tirar as sandálias (kutsunugi-ishi)
  f.box(M.darkWood, 0.5, 0.26, d - 0.4, xd - 0.25, 0, 0); f.solid(xd - 0.25, 0, 0.5, d - 0.4, -1, 0.26, true); // o degrau de madeira (agarikamachi) da terra para o assoalho
  // pilares
  for (const px of [-hw, xd, hw]) for (const pz of [-hd, hd]) f.post(M.darkWood, px, pz, H, 0.13);
  for (let px = -hw + 1.8; px < hw - 0.5; px += 1.8) { f.box(M.darkWood, 0.2, H, 0.2, px, 0, -hd); f.box(M.darkWood, 0.2, H, 0.2, px, 0, hd); }
  f.box(M.darkWood, w + 0.2, 0.28, 0.28, 0, H - 0.2, hd); f.box(M.darkWood, w + 0.2, 0.28, 0.28, 0, H - 0.2, -hd); // vigas
  f.box(M.darkWood, 0.28, 0.28, d, -hw, H - 0.2, 0); f.box(M.darkWood, 0.28, 0.28, d, hw, H - 0.2, 0);
  f.box(M.darkWood, 0.3, 0.3, d, xd, H - 0.15, 0); // a viga grossa sobre a doma (umbari)
  // paredes: frente com a porta da doma; fundo com shōji (ou engawa); lados de reboco
  const wallMat = o.roof === 'thatch' ? M.mud : M.plaster;
  const doorC = -hw + dm / 2; // a porta, no meio da doma
  if (o.front === 'open') { // casa de chá e loja: a frente toda aberta (de dia), com as portas de correr empurradas
    f.wall(M.koshi, -hw, hd, doorC - 1.1, hd, H - 0.4, 0.1);
  } else {
    f.wall(wallMat, -hw, hd, xd, hd, H - 0.4, 0.12, [[dm / 2, 2.0, Math.min(H - 0.55, 2.3)]]); // a porta da doma (livre: ~2 m)
    const fm = o.front === 'shoji' ? M.shoji : M.koshi; f.wall(fm, xd, hd, hw, hd, H - 0.4, 0.08, o.kind === 'oshi' ? [[(hw - xd) / 2, 2.2, H - 0.4]] : []); // (a entrada do assoalho: shōji abertos, sem verga baixa)
    if (o.front === 'koshi') f.box(M.stoneLight, hw - xd, 0.4, 0.16, (xd + hw) / 2, 0, hd); // soco de pedra sob a grade (2 cm recuado dos esteios: rente, piscava contra eles)
  }
  f.wall(wallMat, -hw, -hd, hw, -hd, H - 0.4, 0.12, o.engawa ? [[(xd + hw) / 2 + hw, (hw - xd) - 0.6, H]] : [[w * 0.7, 1.8, H - 0.4]]); // (a porta dos fundos dá no assoalho: até a viga)
  if (o.engawa) { // o fundo do assoalho abre para o jardim: shōji de correr afastados e a varanda de tábuas
    f.box(M.shoji, (hw - xd) * 0.3, H - 0.9, 0.05, hw - 0.9, FL, -hd + 0.05); f.box(M.wood, hw - xd, 0.1, 1.1, (xd + hw) / 2, FL - 0.12, -hd - 0.55); f.solid((xd + hw) / 2, -hd - 0.55, hw - xd, 1.1, -1, FL - 0.02, true);
    for (const px of [xd, (xd + hw) / 2, hw]) f.post(M.darkWood, px, -hd - 1.05, FL, 0.06);
  }
  f.wall(wallMat, -hw, -hd, -hw, hd, H - 0.4, 0.12, [[d * 0.35, 1.0, 1.6]]);
  f.wall(wallMat, hw, -hd, hw, hd, H - 0.4, 0.12, [[d * 0.6, 1.4, 1.7]]);
  for (const sx of [-hw, hw]) f.box(M.darkWood, 0.04, 0.9, 1.0, sx * 1.004, 1.1, sx < 0 ? -hd + d * 0.35 : -hd + d * 0.6); // as gelosias das janelas
  // o lado de dentro: divisória de fusuma entre as duas salas, o irori, o tokonoma e o altar
  const xm = xd + (hw - xd) * 0.52;
  f.wall(M.fusuma, xm, -hd, xm, hd, 1.9, 0.06, [[d * 0.5, 1.8, 1.9]], { y0: FL }); // as portas de correr (fusuma)
  f.box(M.darkWood, 0.1, 0.08, d, xm, FL + 1.9, 0); // o kamoi, a verga das fusuma
  if (H - 0.34 - FL - 1.98 > 0.05) f.wall(M.koshi, xm, -hd, xm, hd, H - 0.34 - FL - 1.98, 0.04, [], { y0: FL + 1.98 }); // o ranma: a grade de madeira entre a verga e a viga (nas casas mais altas)
  { const ix = xd + (xm - xd) / 2, iz = 0.6; // irori: caixa de cinza no chão da sala, a corrente com o gancho e a chaleira
    f.box(M.darkWood, 1.3, 0.08, 1.3, ix, FL - 0.04, iz); f.box(M.dark, 1.05, 0.075, 1.05, ix, FL - 0.03, iz); f.box(M.fire, 0.4, 0.04, 0.3, ix, FL + 0.03, iz); /* (a cinza 5 mm acima da moldura e a brasa por cima dela: antes a brasa ficava no plano da moldura e piscava, e a cinza nem aparecia) */
    f.box(M.iron, 0.03, H - FL - 0.84, 0.03, ix, FL + 0.7, iz); f.box(M.darkWood, 0.14, 0.14, 2 * hd, ix, H - 0.14, 0); // (a corrente do gancho pende da viga que cruza a sala) f.geo(new THREE.SphereGeometry(0.2, 10, 6), M.iron, ix, FL + 0.62, iz, { sy: 0.8, uv: false });
    const [wx, wz] = f.W(ix, iz); out.torches.push(new V3(wx, y + FL + 0.1, wz)); out.hearths.push({ x: wx, y: y + FL, z: wz, ry: o.ry }); }
  { const tx = hw - 0.5; f.box(M.wood, 0.9, 0.12, 1.8, tx, FL, -hd + 1.6); f.box(M.scroll, 0.02, 1.2, 0.5, hw - 0.1, FL + 0.6, -hd + 1.6); f.geo(new THREE.CylinderGeometry(0.1, 0.12, 0.25, 10), M.stoneLight, tx, FL + 0.25, -hd + 1.2, { uv: false }); } // tokonoma: pergaminho e o vaso
  f.box(M.wood, 1.6, 0.06, 0.4, xm + 0.9, H - 0.7, -hd + 0.25); f.box(M.cedar, 0.5, 0.42, 0.3, xm + 0.9, H - 0.64, -hd + 0.25); // kamidana: o altar dos deuses na parede
  if (o.kind === 'oshi') { f.box(M.paper, 0.02, 0.7, 0.04, xm + 0.6, H - 0.95, -hd + 0.44); f.box(M.gold, 0.3, 0.05, 0.25, xm + 1.1, H - 0.62, -hd + 0.3); }
  // a doma: o fogão de barro (kamado) com as duas bocas, o pote d'água e as lenhas
  { const kx = -hw + 0.7, kz = -hd + 1.4; f.box(M.mud, 0.9, 0.75, 1.6, kx, 0, kz); for (const dz of [-0.4, 0.4]) { f.geo(new THREE.CylinderGeometry(0.26, 0.24, 0.12, 10), M.iron, kx, 0.8, kz + dz, { uv: false }); f.box(M.fire, 0.04, 0.2, 0.25, kx + 0.47, 0.15, kz + dz); }
    f.solid(kx, kz, 0.9, 1.6, -1, 0.75); f.geo(new THREE.CylinderGeometry(0.3, 0.26, 0.7, 12), M.darkWood, -hw + 0.6, 0.35, -hd + 3.0, { uv: false });
    for (let k = 0; k < 6; k++) f.geo(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 5), M.wood, -hw + 0.5, 0.06 + (k % 3) * 0.12, hd - 1.2 - Math.floor(k / 3) * 0.13, { rx: Math.PI / 2, uv: false }); }
  // o telhado (e um teto invisível que segura a câmera dentro de casa: sem ele ela entrava na palha)
  const rw = w + 1.8, rd = d + 1.8;
  if (o.roof !== 'none') f.solid(0, 0, w + 1.2, d + 1.2, H + 0.1, H + 2.5, true);
  if (o.roof === 'thatch') {
    // palha em irimoya: as águas grossas descem quase até o chão nos lados, e o frontão no alto solta a fumaça do irori
    const rh = rd * 0.5, rl = (rw + 0.4) - (rd + 0.4) * 0.55;
    f.roof(M.thatch, rw + 0.4, rd + 0.4, rh, H + 0.05, { thick: 0.75, sori: 0.06, sag: 1.12, seg: 6, irimoya: true });
    f.box(M.blackWood, rl + 0.6, 0.55, 0.9, 0, H + 0.05 + rh - 0.4, 0); // a cumeeira coberta (gushi), mais escura
    for (let i = -3; i <= 3; i++) f.box(M.blackWood, 0.18, 0.3, 1.15, i * rl / 7, H + rh - 0.08, 0);
  } else if (o.roof === 'kawara') {
    f.roof(M.kawara, rw, rd, rd * 0.34, H, { thick: 0.2, sori: 0.28, sag: 1.35, irimoya: o.irimoya !== false });
    f.box(M.kawara, Math.max(0.8, rw - rd) + 0.4, 0.38, 0.42, 0, H + rd * 0.34 - 0.2, 0);
    for (const sd of [-1, 1]) f.box(M.iron, 0.3, 0.55, 0.45, sd * (Math.max(0.8, rw - rd) / 2 + 0.2), H + rd * 0.34 - 0.2, 0); // onigawara nas pontas
  }
  const [cx, cz] = f.W(0, 0);
  out.houses.push({ x: cx, z: cz, ry: o.ry, w, d, y, floor: y + FL, kind: o.kind, door: f.W(doorC, hd + 1.2), inside: f.W(xd + (hw - xd) * 0.3, 0), room: f.W(xm + (hw - xm) * 0.4, 0.4) });
  return { f, y, H };
}

// ---------------- loja ou hospedaria de dois andares (machiya), com o telhado de duas águas paralelo à rua ----------------
export function machiya(B, M, out, o) {
  const { f, y, H } = house(B, M, out, { ...o, roof: 'none', h: 3.0, front: o.front || 'koshi' });
  const w = o.w, d = o.d, hw = w / 2, hd = d / 2, H2 = 2.1;
  // o segundo andar, mais baixo (zushi-nikai): janelas mushiko (fendas no reboco) na frente
  f.box(M.wood, w + 0.1, 0.18, d + 0.1, 0, H, 0);
  f.solid(0, 0, w + 0.4, d + 0.4, H + 0.05, H + H2 + 1.2, true); // (o forro do térreo segura a câmera)
  f.wall(M.plaster, -hw, hd - 0.4, hw, hd - 0.4, H2, 0.14, [], { y0: H + 0.18 }); f.wall(M.plaster, -hw, -hd, hw, -hd, H2, 0.14, [], { y0: H + 0.18 });
  f.wall(M.plaster, -hw, -hd, -hw, hd - 0.4, H2, 0.14, [], { y0: H + 0.18 }); f.wall(M.plaster, hw, -hd, hw, hd - 0.4, H2, 0.14, [], { y0: H + 0.18 });
  for (let k = 0; k < 3; k++) { const cx = -hw + w * (k + 0.5) / 3; f.box(M.dark, 1.4, 0.7, 0.05, cx, H + 0.9, hd - 0.31); for (let s = 0; s < 6; s++) f.box(M.plaster, 0.08, 0.7, 0.07, cx - 0.6 + s * 0.24, H + 0.9, hd - 0.29); }
  // o beiral de telha sobre a frente do térreo (hisashi) e o telhado de cima
  f.geo(roofOneSide(w + 1.2, 1.3, 0.55), M.kawara, 0, H + 0.05, hd + 0.2, { uv: M.kawara.userData.uv });
  f.roof(M.kawara, w + 1.4, d + 1.4, (d + 1.4) * 0.3, H + H2 + 0.15, { thick: 0.2, sori: 0.1, sag: 1.1, gable: true });
  f.box(M.kawara, w + 1.5, 0.4, 0.42, 0, H + H2 + 0.15 + (d + 1.4) * 0.3 - 0.22, 0);
  for (const sd of [-1, 1]) f.box(M.plaster, 0.16, 2.2, 0.9, sd * (hw + 0.1), H + 0.2, hd - 0.4); // udatsu: a parede corta-fogo entre vizinhos
  // a cortina na porta e a lanterna
  const doorC = -hw + (o.doma ?? 3.4) / 2;
  f.box(M.noren[o.sign ?? 0], 1.9, 0.75, 0.02, doorC, 2.05, hd + 0.12, { noGround: true });
  { const [lx, lz] = f.W(doorC + 1.4, hd + 0.5); chochin(B, M, out, lx, y + 2.4, lz); f.box(M.blackWood, 0.03, 0.32, 0.03, doorC + 1.4, 2.7, hd + 0.5, { noGround: true }); f.box(M.blackWood, 0.05, 0.05, 0.66, doorC + 1.4, 2.98, hd + 0.2, { noGround: true }); } // (o cordão e o braço até a parede)
  return { f, y };
}
function roofOneSide(W, D, H) { // água única (o beiral de cima da porta)
  const g = new THREE.BufferGeometry(), a = W / 2;
  const t = 0.15, p = [-a, H, -D / 2, a, 0, D / 2, a, H, -D / 2, -a, H, -D / 2, -a, 0, D / 2, a, 0, D / 2, // em cima
    -a, H - t, -D / 2, a, H - t, -D / 2, a, -t, D / 2, -a, H - t, -D / 2, a, -t, D / 2, -a, -t, D / 2, // embaixo
    -a, 0, D / 2, -a, -t, D / 2, a, -t, D / 2, -a, 0, D / 2, a, -t, D / 2, a, 0, D / 2]; // a beirada
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.length / 3 * 2), 2)); return g;
}

// ---------------- o portão do oshi (kabuki-mon) e o jardim ----------------
function oshiGate(B, M, out, x, y, z, ry, k) {
  const f = frame(B, x, y, z, ry);
  for (const sd of [-1, 1]) f.post(M.darkWood, sd * 1.5, 0, 3.0, 0.16);
  f.box(M.darkWood, 3.6, 0.3, 0.3, 0, 2.7, 0); f.box(M.darkWood, 3.3, 0.22, 0.22, 0, 2.2, 0);
  f.roof(M.thatch, 4.6, 1.9, 0.9, 3.0, { thick: 0.35, sori: 0.05, gable: true, seg: 4 });
  f.box(M.blackWood, 0.8, 0.5, 0.06, 0, 2.35, 0.14); f.box(M.gold, 0.6, 0.3, 0.02, 0, 2.45, 0.18); // a placa com o nome da casa
  for (const sd of [-1, 1]) { f.box(M.moss, 5.5, 1.05, 0.8, sd * 4.6, 0, 0); f.box(M.moss, 5.3, 0.25, 0.65, sd * 4.6, 1.05, 0); f.solid(sd * 4.6, 0, 5.5, 0.9, -1, 1.3); } // a cerca viva (ikegaki)
  { const [a, b] = f.W(-2.2, 0.7); nobori(B, M, a, y, b, ry + Math.PI / 2, k); } { const [a, b] = f.W(2.2, 0.7); nobori(B, M, a, y, b, ry + Math.PI / 2, k + 1); }
}
function gardenPine(B, M, x, y, z, s = 1) { // pinheiro podado do jardim (niwaki): tronco torto e "nuvens" de folhagem
  B.geo(new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 2.6 * s, 7), M.darkWood, x, y + 1.3 * s, z, { rz: 0.25, uv: false });
  for (const [dx, dy, dz, r] of [[0.5, 2.6, 0, 0.9], [-0.6, 2.1, 0.3, 0.7], [0.2, 3.1, -0.4, 0.6], [1.0, 1.9, 0.5, 0.55]]) B.geo(new THREE.SphereGeometry(r * s, 9, 6), M.moss, x + dx * s, y + dy * s, z + dz * s, { sy: 0.45, uv: false });
  addCircle(x, z, 0.25 * s, y - 1, y + 3);
}

// ---------------- casa de chá (chaya) ----------------
function chaya(B, M, out, o) {
  const { f, y } = house(B, M, out, { ...o, roof: 'thatch', front: 'open', w: o.w, d: o.d, kind: 'tea', doma: o.w * 0.55 });
  const hd = o.d / 2;
  for (const dx of [-o.w * 0.25, o.w * 0.2]) { f.box(M.wood, 1.8, 0.4, 0.6, dx, 0.05, hd + 1.0); f.box(M.redCloth, 1.84, 0.06, 0.7, dx, 0.45, hd + 1.0); /* (o banco antes do pano: o pano, posto primeiro, descia até o chão por dentro do banco e piscava nas pontas) */ f.solid(dx, hd + 1.0, 1.8, 0.7, -1, 0.5); // bancos vermelhos
    out.seats.push({ ...(([a, b]) => ({ x: a, z: b }))(f.W(dx - 0.4, hd + 1.05)), y: y + 0.5, ry: o.ry }); } // (de frente para a rua)
  { const [ux, uz] = f.W(o.w * 0.48, hd + 1.4); B.geo(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 5), M.darkWood, ux, y + 1.3, uz, { uv: false }); B.geo(new THREE.ConeGeometry(1.4, 0.5, 18, 1, true), M.redCloth, ux, y + 2.55, uz, { uv: false }); addCircle(ux, uz, 0.05, y - 1, y + 2.4); } // o guarda-sol (nodate-gasa)
  f.box(M.noren[1], 1.8, 0.7, 0.02, -o.w / 2 + o.w * 0.27, 2.0, hd + 0.1, { noGround: true });
}

// ---------------- armazém de paredes brancas (kura) ----------------
export function kura(B, M, out, x, z, ry, w = 5, d = 4) {
  const y = terrainHeight(x, z) + 0.05, f = frame(B, x, y, z, ry), H = 4.6;
  f.box(M.stone, w + 0.4, 0.5, d + 0.4, 0, -0.3, 0);
  f.box(M.namako, w + 0.04, 1.4, d + 0.04, 0, 0.2, 0); f.box(M.plaster, w, H - 1.4, d, 0, 1.6, 0); f.solid(0, 0, w, d, -1, H);
  f.box(M.blackWood, 1.3, 1.9, 0.2, 0, 0.2, d / 2 + 0.05); f.box(M.plaster, 1.6, 0.25, 0.4, 0, 2.2, d / 2 + 0.1); // a porta grossa e a sobreporta
  f.box(M.dark, 0.6, 0.5, 0.05, 0, 3.4, d / 2 + 0.02);
  f.roof(M.kawara, w + 1.2, d + 1.2, (d + 1.2) * 0.34, H + 0.3, { thick: 0.22, sori: 0.12, gable: true });
  f.box(M.kawara, w + 1.3, 0.35, 0.4, 0, H + 0.3 + (d + 1.2) * 0.34 - 0.2, 0);
}

// ---------------- a vila inteira ----------------
export function buildVillage(B, M, out) {
  const S = STREET, ex = S.hw; // a rua vai de x = 34,5 a 45,5
  // o canal de pedra no lado leste da rua, com pontes de laje em cada entrada
  { const cx = S.x + ex + 0.9;
    for (let z = S.z0; z < S.z1 + 50; z += 6) { const z1 = Math.min(z + 6, S.z1 + 50), zc = (z + z1) / 2, yb = terrainHeight(cx, zc);
      B.box(M.stone, 0.4, 0.9, z1 - z, cx - 0.65, yb - 0.75, zc); B.box(M.stone, 0.4, 0.9, z1 - z, cx + 0.65, yb - 0.75, zc); B.box(M.stone, 1.3, 0.2, z1 - z, cx, yb - 0.85, zc, { noGround: true }); B.box(M.water, 0.9, 0.04, z1 - z, cx, yb - 0.4, zc, { noGround: true });
      addBox(cx, zc, 0.9, z1 - z, yb - 1, yb - 0.3); }
    out.channel = { x: cx };
  }
  const lots = []; // [lado, z, frente, tipo]
  // ao norte: as machiya (lojas e hospedarias), coladas umas nas outras
  for (const side of [-1, 1]) {
    let z = S.z0 + 8;
    while (z < -300) { const w = rr(9, 11.5); lots.push({ side, z: z + w / 2, w, kind: 'machiya' }); z += w + 0.4; }
    z = -292;
    while (z < -70) { const w = 24; lots.push({ side, z: z + w / 2, w, kind: 'oshi' }); z += w + 2; }
    z = -62;
    while (z < S.z1 - 6) { const w = rr(9, 11); lots.push({ side, z: z + w / 2, w, kind: rnd() < 0.6 ? 'chaya' : 'machiya' }); z += w + 1.5; }
  }
  let k = 0;
  for (const L of lots) {
    const ry = L.side < 0 ? Math.PI / 2 : -Math.PI / 2, edge = S.x + L.side * (ex + (L.side > 0 ? 2.2 : 0.6)); // a casa olha para a rua
    if (L.kind === 'machiya') {
      const d = rr(11, 14), x = edge + L.side * (d / 2 + 0.6);
      machiya(B, M, out, { x, z: L.z, ry, w: L.w - 0.6, d, kind: k % 3 === 0 ? 'inn' : 'shop', sign: k % M.noren.length, front: k % 3 === 0 ? 'shoji' : 'koshi' });
    } else if (L.kind === 'chaya') {
      const d = 7.5, x = edge + L.side * (d / 2 + 2.2);
      chaya(B, M, out, { x, z: L.z, ry, w: L.w - 1, d });
    } else { // a casa do oshi: portão na rua, caminho de pedras, jardim e a casa grande de palha, recuada
      const gx = edge + L.side * 0.6, gy = terrainHeight(gx, L.z);
      oshiGate(B, M, out, gx, gy, L.z, ry, k);
      const d = 13, w = 17, x = edge + L.side * (13 + d / 2);
      house(B, M, out, { x, z: L.z, ry, w, d, roof: 'thatch', front: 'shoji', engawa: true, kind: 'oshi', doma: 4.2 });
      for (let i = 1; i <= 5; i++) { const px = edge + L.side * (1.6 + i * 2.0), py = terrainHeight(px, L.z); B.box(M.stoneLight, 0.9, 0.42, 0.7, px, py - 0.3, L.z + (i % 2 ? 0.3 : -0.3)); } // o caminho de pedras (enterradas)
      gardenPine(B, M, edge + L.side * 7, terrainHeight(edge + L.side * 7, L.z - 6), L.z - 6, rr(0.9, 1.2));
      { const dr = out.houses[out.houses.length - 1]?.door, sz = dr && dr[1] > L.z ? -1 : 1; /* a lanterna do jardim fica do lado oposto à porta: antes ela ficava no caminho do portão até a porta e o explorador travava nela */
        toro(B, M, out, edge + L.side * 9.5, terrainHeight(edge + L.side * 9.5, L.z + sz * 3.5), L.z + sz * 3.5, 0.9); }
      kura(B, M, out, x + L.side * 2, L.z + (k % 2 ? 1 : -1) * (w / 2 + 3.6), ry, 4.6, 3.6);
      out.oshi.push({ x, z: L.z, ry, gate: [gx + L.side * 1.4, L.z], garden: [edge + L.side * 5, L.z + 3] });
    }
    k++;
  }
  // lanternas de pedra ao longo da rua, nas duas beiras
  for (let z = S.z0 + 20; z < S.z1; z += 34) for (const sd of [-1, 1]) { const x = S.x + sd * (ex + (sd > 0 ? 1.9 : 0.5)); toro(B, M, out, x, terrainHeight(x, z), z, 0.85); }
  // casas de fazenda espalhadas pelos campos, cada uma com seu armazém
  const farms = [[FIELDS.x0 - 28, -380, 0.3], [120, -272, Math.PI], [510, -470, -1.2], [305, -266, 0.1], [-110, -420, 0.6], [-140, -130, 1.8], [-60, -560, 2.6], [200, -250, -0.4]];
  for (const [x, z, ry] of farms) {
    if (polyDist(STREAM, x, z).d < 16) continue;
    { const hs = [[-8, -6], [8, -6], [-8, 6], [8, 6]].map(([a, b]) => terrainHeight(x + a, z + b)); if (Math.max(...hs) - Math.min(...hs) > 1.6) continue; } // (nada de casa em barranco)
    house(B, M, out, { x, z, ry, w: 14, d: 10, roof: 'thatch', front: 'shoji', kind: 'farm', doma: 5 });
    kura(B, M, out, x + Math.cos(ry) * 11, z - Math.sin(ry) * 11, ry, 4.2, 3.4);
    out.farms.push({ x, z, ry });
  }
  void RESIDENCE;
}
