// Fórum Boário: a praça do mercado entre o Circo Máximo e o Tibre, junto ao porto fluvial. Tudo no chão e com acesso:
// o cais de travertino na beira do rio (com escadas até a água, frades de amarrar barcos e ânforas descarregadas), a
// fonte no meio da praça, as barracas de toldo listrado em duas fileiras, o templo de Portuno no pódio (o deus dos
// portos), o templo redondo de Hércules Vencedor na margem (o mais antigo de mármore de Roma que ainda está de pé),
// o arco de quatro faces na entrada norte, a fileira de lojas com pórtico no lado leste e o cercado dos bois
// (o Forum Boarium era, antes de tudo, a feira de gado).
import * as THREE from 'three';
import { addBox, addCircle } from '../comum/collision.js';
import { mat4 } from '../comum/batcher.js';
import { terrainHeight, FB, TIBER } from './terrain.js';
import { temple, roundTemple } from './forum.js';
import { roofHalf, pedimentGeo } from '../atenas/arquitetura.js';
import { rr } from '../comum/util.js';

const V3 = THREE.Vector3;
export const MARKET = { x: (FB.x0 + FB.x1) / 2, z: (FB.z0 + FB.z1) / 2, hw: (FB.x1 - FB.x0) / 2, hd: (FB.z1 - FB.z0) / 2 };

// linha do cais: o trecho do Tibre que passa ao lado, afastado FB.quay metros do eixo do rio para o lado da cidade
const [A, Bp] = [TIBER[5], TIBER[6]];
const QL = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]), QU = [(Bp[0] - A[0]) / QL, (Bp[1] - A[1]) / QL], QN = [QU[1], -QU[0]]; // QN aponta para a cidade
const QRY = Math.atan2(-QU[1], QU[0]); // o +x local do cais corre ao longo do rio; o +z local aponta para a água
export const quayAt = (t, off = 0) => ({ x: A[0] + QU[0] * t + QN[0] * (FB.quay + off), z: A[1] + QU[1] * t + QN[1] * (FB.quay + off) });

export function buildMarket(B, M, out) {
  const S = out.spots, y = FB.y;
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
  const G = {
    fruit: [std(0xc83a2a), std(0xe8a030), std(0x6a9a3a), std(0x5a2a5a)], bread: std(0xc8904a, { roughness: 0.9 }), fish: std(0x9aa8b0, { metalness: 0.3, roughness: 0.4 }),
    cloth: [std(0xa8392a), std(0x2a52a8), std(0xd8b45a), std(0x6a7a4a)], clay: std(0xb4623a, { roughness: 0.85 }), basket: std(0xb79c5c, { roughness: 1 }),
  };
  // ---- a praça: lajes de travertino (a beira até o cais fica no calçamento do chão)
  for (let x = FB.x0; x < FB.x1 - 0.1; x += 12) for (let z = FB.z0; z < FB.z1 - 0.1; z += 12) {
    const w = Math.min(12, FB.x1 - x), d = Math.min(12, FB.z1 - z);
    B.box(M.travertine2, w + 0.05, 0.3, d + 0.05, x + w / 2, y - 0.22, z + d / 2);
  }
  // ---- o cais: paredão de travertino do leito até a praça, ao longo da margem
  const t0 = (FB.z0 - 6 - A[1] - QN[1] * FB.quay) / QU[1], t1 = (FB.z1 + 6 - A[1] - QN[1] * FB.quay) / QU[1], tm = (t0 + t1) / 2, len = t1 - t0;
  const qc = quayAt(tm), F = mat4(qc.x, 0, qc.z, 0, QRY, 0);
  B.box(M.travertine, len, y + 6, 1.6, 0, -6, 0.8, { frame: F });
  B.box(M.marble, len, 0.25, 1.9, 0, y - 0.05, 0.75, { frame: F }); // a borda (capeamento) do cais
  // escadas até a água, em dois pontos: cada degrau é uma faixa de 4 m saindo do cais para o rio
  for (const lx of [-len * 0.28, len * 0.22]) {
    const n = Math.ceil((y - 0.25) / 0.3), rise = (y - 0.25) / n;
    for (let i = 0; i < n; i++) {
      const top = y - rise * (i + 1), lz = 1.6 + i * 0.42 + 0.21;
      B.box(M.travertine2, 4, top + 5, 0.44, lx, -5, lz, { frame: F });
      // colisão: células de 0,5 m sobre o degrau girado
      for (let a = -1.75; a <= 1.76; a += 0.5) { const p = quayAt(tm + lx + a, -lz); addBox(p.x, p.z, 0.5, 0.5, -6, top); }
    }
    // patamar na água, para subir de volta nadando
    const lz = 1.6 + n * 0.42 + 0.9; B.box(M.travertine2, 5, 5.2, 1.8, lx, -5, lz, { frame: F });
    for (let a = -2.25; a <= 2.26; a += 0.5) for (const dz of [-0.6, 0, 0.6]) { const p = quayAt(tm + lx + a, -(lz + dz)); addBox(p.x, p.z, 0.5, 0.5, -6, 0.2); }
    // ânforas descarregadas e caixotes junto da escada
    for (let k = 0; k < 6; k++) { const p = quayAt(tm + lx + 3.2 + (k % 3) * 0.5, 1.2 + Math.floor(k / 3) * 0.5); B.geo(new THREE.CylinderGeometry(0.2, 0.08, 0.85, 9), M.terracotta, p.x, y + 0.42, p.z); }
    { const p = quayAt(tm + lx - 3.4, 1.6); B.box(M.wood, 1, 0.8, 1, p.x, y, p.z, { ry: QRY }); B.box(M.darkWood, 0.8, 0.6, 0.8, p.x + 0.1, y + 0.8, p.z, { ry: QRY + 0.3 }); addCircle(p.x, p.z, 0.7, y - 1, y + 1.4); }
  }
  // frades de pedra para amarrar os barcos
  for (let lx = -len / 2 + 4; lx < len / 2 - 2; lx += 9) { const p = quayAt(tm + lx, 0.6); B.geo(new THREE.CylinderGeometry(0.22, 0.28, 0.7, 10), M.travertine, p.x, y + 0.35, p.z); addCircle(p.x, p.z, 0.3, y - 1, y + 0.7); }
  // ---- a fonte no meio da praça: tanque octogonal, água e a coluna com a bacia
  { const x = MARKET.x - 2, z = MARKET.z + 2;
    B.geo(new THREE.CylinderGeometry(4.3, 4.5, 0.75, 8), M.travertine, x, y + 0.375, z);
    B.geo(new THREE.CylinderGeometry(3.95, 3.95, 0.06, 8), M.water, x, y + 0.62, z);
    B.geo(new THREE.CylinderGeometry(0.55, 0.7, 1.8, 12), M.marble, x, y + 0.9 + 0.5, z);
    B.geo(new THREE.CylinderGeometry(1.3, 0.5, 0.35, 16), M.marble, x, y + 2.35, z);
    B.geo(new THREE.CylinderGeometry(1.18, 1.18, 0.04, 16), M.water, x, y + 2.5, z);
    addCircle(x, z, 4.5, y - 1, y + 0.75);
    S.fountain = new V3(x, y, z); }
  // ---- barracas: duas fileiras viradas para o corredor do meio (a fonte no meio do corredor)
  const TYPES = ['frutas', 'pao', 'peixe', 'anforas', 'panos', 'ceramica', 'frutas', 'pao', 'lamparinas', 'peixe'];
  const ZS = [-17, -9, 12, 20, 28].map((d) => MARKET.z + d);
  out.marketStalls = [];
  for (let i = 0; i < 10; i++) {
    const side = i < 5 ? -1 : 1, x = MARKET.x - 2 + side * 9, z = ZS[i % 5], type = TYPES[i];
    const fx = -side; // a frente da barraca aponta para o corredor
    B.box(M.wood, 1.2, 0.95, 3.4, x + fx * 0.6, y, z); addBox(x + fx * 0.6, z, 1.2, 3.4, y - 1, y + 1);
    for (const dz of [-1.7, 1.7]) for (const dx of [-0.9, 1.3]) B.box(M.darkWood, 0.12, 2.6, 0.12, x + fx * dx, y, z + dz);
    B.box(M.awning[i % 4], 3.0, 0.05, 4.0, x + fx * 0.3, y + 2.55, z, { rz: fx * 0.18 });
    const top = y + 0.95, cx = x + fx * 0.6;
    if (type === 'frutas') for (let k = 0; k < 3; k++) { B.geo(new THREE.CylinderGeometry(0.32, 0.26, 0.22, 10), G.basket, cx, top + 0.11, z - 1.1 + k * 1.1); for (let f = 0; f < 6; f++) B.geo(new THREE.SphereGeometry(0.09, 7, 5), G.fruit[(k + i) % 4], cx + rr(-0.15, 0.15), top + 0.25 + rr(0, 0.06), z - 1.1 + k * 1.1 + rr(-0.15, 0.15)); }
    else if (type === 'pao') for (let k = 0; k < 7; k++) B.geo(new THREE.CylinderGeometry(0.16, 0.17, 0.08, 10), G.bread, cx + rr(-0.25, 0.25), top + 0.04, z - 1.4 + k * 0.45);
    else if (type === 'peixe') for (let k = 0; k < 8; k++) { const g = new THREE.SphereGeometry(0.06, 6, 4); g.scale(4, 1, 1.4); B.geo(g, G.fish, cx + rr(-0.2, 0.2), top + 0.05, z - 1.4 + k * 0.38, { ry: rr(-0.3, 0.3) }); }
    else if (type === 'anforas') for (let k = 0; k < 6; k++) B.geo(new THREE.CylinderGeometry(0.17, 0.07, 0.75, 8), M.plasterRed, x + fx * (k < 3 ? -0.3 : 0.6), k < 3 ? y + 0.37 : top + 0.37, z - 1.2 + (k % 3) * 1.2);
    else if (type === 'panos') for (let k = 0; k < 5; k++) B.box(G.cloth[k % 4], 0.6, 0.12, 0.5, cx, top + k * 0.12, z - 0.8 + (k % 2) * 0.9);
    else if (type === 'ceramica') for (let k = 0; k < 6; k++) B.geo(new THREE.CylinderGeometry(0.14, 0.09, 0.28, 10), G.clay, cx + rr(-0.2, 0.2), top + 0.14, z - 1.3 + k * 0.5);
    else if (type === 'lamparinas') for (let k = 0; k < 10; k++) { const g = new THREE.SphereGeometry(0.07, 8, 5); g.scale(1, 0.45, 1.3); B.geo(g, G.clay, cx + rr(-0.25, 0.25), top + 0.03, z - 1.4 + k * 0.3); }
    out.marketStalls.push({ x: x - fx * 0.6, z, ry: side < 0 ? Math.PI / 2 : -Math.PI / 2, type });
  }
  // ---- templo de Portuno: jônico, quatro colunas na frente, num pódio alto, de frente para a praça
  temple(B, M, out, { id: 'portuno', x: MARKET.x - 12, z: FB.z0 + 10, face: '+z', w: 11, d: 17, h: 7.5, podium: 2.4, cols: 4, deep: 2 });
  // ---- templo redondo de Hércules Vencedor, na margem entre a praça e o cais
  { const p = quayAt((FB.z1 - 22 - A[1] - QN[1] * FB.quay) / QU[1], 13); roundTemple(B, M, out, { id: 'hercules', x: p.x, z: p.z, r: 5 }); }
  // ---- arco de quatro faces (Jano) na entrada norte da praça
  { const x = MARKET.x - 2, z = FB.z1 - 2.5, H = 6.4, P = 2.4, o = 3.3;
    for (const [dx, dz] of [[-o, -o], [o, -o], [-o, o], [o, o]]) { B.box(M.marbleWall, P, H, P, x + dx, y, z + dz); addBox(x + dx, z + dz, P, P, y - 1, y + H); }
    B.box(M.marbleWall, o * 2 + P, 2.6, o * 2 + P, x, y + H, z);
    B.box(M.marble, o * 2 + P + 0.5, 0.35, o * 2 + P + 0.5, x, y + H + 2.6, z);
    out.torches.push(new V3(x - o - 1.4, y + 2.8, z), new V3(x + o + 1.4, y + 2.8, z)); }
  // ---- lojas com pórtico no lado leste: cinco prédios de tijolo rebocado, cada um de uma cor e altura (térreo de lojas,
  // sobrado com janelas de veneziana), telhado de duas águas, e um pórtico de colunas correndo na frente de todos
  { const xb = FB.x1 + 1, D = 9, z0 = FB.z0 + 2, z1 = FB.z1 - 2, L = z1 - z0, zc = (z0 + z1) / 2;
    const WALL = [M.plasterOchre, M.plasterRed, M.plaster, M.plasterOchre, M.brickPl], HS = [8.2, 10.8, 7.4, 11.6, 9];
    const segs = [17, 15, 14, 18, 16], k = L / segs.reduce((q, v) => q + v, 0);
    let z = z0;
    segs.forEach((sl, i) => {
      const l = sl * k, c = z + l / 2, H = HS[i], W = WALL[i], x = xb + D / 2, rise = 2.2;
      B.box(W, D, H, l, x, y - 0.3, c); addBox(x, c, D, l, y - 1, y + H);
      B.box(M.brickPl, D + 0.06, 1.0, l + 0.06, x, y - 0.3, c); // barrado de tijolo à mostra
      B.box(M.travertine, D + 0.4, 0.3, l + 0.1, x, y + H - 0.3, c); // cornija
      for (const sd of [1, -1]) B.geo(roofHalf(l + 0.4, D / 2 + 0.6, rise), M.tiles, 0, 0, 0, { frame: mat4(x, y + H + rise, c, 0, sd * Math.PI / 2, 0) });
      for (const ze of [c - l / 2 + 0.05, c + l / 2 - 0.05]) B.geo(pedimentGeo(D + 0.4, rise, 0.3), W, x, y + H, ze);
      // portas das lojas no térreo e janelas do sobrado (nos dois lados do prédio)
      for (let q = c - l / 2 + 2.4; q < c + l / 2 - 1.5; q += 4.2) {
        B.box(M.dark, 0.08, 2.9, 2.4, xb - 0.04, y, q); B.box(M.wood, 0.1, 0.25, 2.8, xb - 0.08, y + 2.9, q);
        for (let f = 0; f < (H > 9 ? 2 : 1); f++) for (const xs of [xb - 0.06, xb + D + 0.06]) { B.box(M.dark, 0.06, 1.1, 0.8, xs, y + 4.6 + f * 3, q); B.box(M.shutter, 0.08, 1.1, 0.5, xs, y + 4.6 + f * 3, q - 0.65); B.box(M.shutter, 0.08, 1.1, 0.5, xs, y + 4.6 + f * 3, q + 0.65); }
        B.box(M.dark, 0.06, 1.0, 0.7, xb + D + 0.06, y + 1.6, q); // janelinha dos fundos
      }
      if (i % 2 === 0) { B.box(M.darkWood, 1.4, 0.15, l * 0.6, xb - 0.7, y + 7.2, c); B.box(M.darkWood, 0.08, 0.9, l * 0.6, xb - 1.35, y + 7.3, c); } // sacada de madeira
      z += l;
    });
    for (let q = z0 + 0.3; q <= z1; q += 4.2) { B.geo(new THREE.CylinderGeometry(0.28, 0.32, 3.6, 12), M.colMarble, xb - 3, y + 1.8, q, { uv: false }); addCircle(xb - 3, q, 0.34, y - 1, y + 3.6); }
    B.box(M.travertine, 3.6, 0.45, L + 0.6, xb - 1.6, y + 3.6, zc); // a arquitrave do pórtico
    B.box(M.tiles, 4.2, 0.22, L + 1, xb - 1.5, y + 4.0, zc, { rz: 0.28 }); // telhadinho do pórtico
    for (let q = z0 + 6; q < z1 - 4; q += 13) B.box(M.awning[Math.round(q) % 4], 1.6, 0.04, 2.6, xb - 3.9, y + 3.0, q, { rz: 0.3 }); // toldos entre as colunas
  }
  // ---- cercado dos bois, num canto da praça
  const px = MARKET.x + 12, pz = FB.z0 + 9;
  for (const [w, d, dx, dz] of [[12, 0.15, 0, -5], [12, 0.15, 0, 5], [0.15, 10, -6, 0], [0.15, 10, 6, 0]]) { B.box(M.wood, w, 0.12, d, px + dx, y + 0.9, pz + dz); B.box(M.wood, w, 0.12, d, px + dx, y + 0.45, pz + dz); addBox(px + dx, pz + dz, w + 0.2, d + 0.2, y - 1, y + 1.1); }
  for (const [dx, dz] of [[-6, -5], [6, -5], [-6, 5], [6, 5], [0, -5], [0, 5]]) B.box(M.darkWood, 0.18, 1.1, 0.18, px + dx, y, pz + dz);
  B.box(M.wood, 2.4, 0.4, 0.6, px, y, pz + 3.5); // cocho
  out.marketPen = { x: px, z: pz, y };
  // ---- vasos com loureiros nas bordas da praça
  for (const [x, z] of [[FB.x0 + 1, FB.z0 + 22], [FB.x0 + 1, FB.z0 + 44], [FB.x0 + 1, FB.z1 - 14], [FB.x1 - 6, FB.z1 - 6], [FB.x0 + 6, FB.z1 - 6]]) {
    B.geo(new THREE.CylinderGeometry(0.55, 0.42, 0.75, 12), M.terracotta, x, y + 0.37, z);
    const g = new THREE.IcosahedronGeometry(0.9, 1); g.scale(1, 1.25, 1); B.geo(g, M.plant, x, y + 1.6, z);
    addCircle(x, z, 0.6, y - 1, y + 1.2);
  }
  out.exclusions.push([FB.x0 - 30, FB.x1 + 12, FB.z0 - 8, FB.z1 + 8]);
  out.zones.mercado = [FB.x0 - 22, FB.x1 + 9, FB.z0 - 4, FB.z1 + 4];
  S.market = new V3(MARKET.x - 2, y, MARKET.z - 6);
}

// falas dos vendedores, por barraca
export const VENDOR_LINES = {
  frutas: ['Figos de Túsculo, maçãs, uvas! Tudo fresco, colhido ontem!', 'Romãs da África, docinhas. Leve duas e pague uma... quase.'],
  pao: ['Pão quentinho, do forno do Aventino! Com o selo do padeiro.', 'O trigo vem do Egito, mas a mão que amassa é romana!'],
  peixe: ['Peixe do Tibre, pescado hoje cedo junto da ilha!', 'Quer garum? O melhor molho de peixe, vindo da Hispânia.'],
  anforas: ['Vinho de Falerno, o preferido dos senadores! E o azeite da Bética.', 'Ânfora cheia, ânfora vazia... a vazia eu compro de volta, viu?'],
  panos: ['Lã de Tarento, linho do Egito! E esta púrpura... só se você for muito rico.', 'Para a toga branca de festa, este aqui é o tecido.'],
  ceramica: ['Pratos vermelhos da Gália, brilhantes como espelho!', 'Panela de barro boa é a que não racha no fogo. Esta é.'],
  lamparinas: ['Lamparinas com gladiadores, com deuses, com o que você quiser!', 'Uma lucerna para a ínsula: lá dentro é escuro até de dia.'],
};
