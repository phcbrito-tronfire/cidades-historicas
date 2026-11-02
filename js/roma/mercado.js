// Fórum Boário: o mercado antigo entre o Circo Máximo e o Tibre, perto do porto fluvial. Barracas de toldo listrado
// (frutas, pão, peixe do rio, ânforas de vinho e azeite, panos, cerâmica e lamparinas), um cercado com bois à venda
// e o templo redondo de Hércules Vencedor, o mais antigo de mármore que ainda está de pé em Roma.
import * as THREE from 'three';
import { addBox } from '../comum/collision.js';
import { terrainHeight } from './terrain.js';
import { roundTemple } from './forum.js';
import { rr, rand, pick } from '../comum/util.js';

const V3 = THREE.Vector3;
export const MARKET = { x: -418, z: 300, hw: 18, hd: 27 };

export function buildMarket(B, M, out) {
  const S = out.spots, K = MARKET, y = terrainHeight(K.x, K.z) - 0.1;
  B.box(M.travertine2, K.hw * 2 + 4, 0.4, K.hd * 2 + 4, K.x, y - 0.3, K.z);
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
  const G = {
    fruit: [std(0xc83a2a), std(0xe8a030), std(0x6a9a3a), std(0x5a2a5a)], bread: std(0xc8904a, { roughness: 0.9 }), fish: std(0x9aa8b0, { metalness: 0.3, roughness: 0.4 }),
    cloth: [std(0xa8392a), std(0x2a52a8), std(0xd8b45a), std(0x6a7a4a)], clay: std(0xb4623a, { roughness: 0.85 }), basket: std(0xb79c5c, { roughness: 1 }),
  };
  const TYPES = ['frutas', 'pao', 'peixe', 'anforas', 'panos', 'ceramica', 'frutas', 'pao', 'lamparinas', 'peixe'];
  out.marketStalls = [];
  // duas fileiras de barracas viradas para o corredor do meio
  for (let i = 0; i < 10; i++) {
    const side = i < 5 ? -1 : 1, x = K.x + side * 8, z = K.z - 20 + (i % 5) * 10, ry = side < 0 ? Math.PI / 2 : -Math.PI / 2, type = TYPES[i];
    const fx = -side; // a frente da barraca aponta para o corredor (x do centro)
    B.box(M.wood, 1.2, 0.95, 3.4, x + fx * 0.6, y, z); addBox(x + fx * 0.6, z, 1.2, 3.4, y - 1, y + 1);
    for (const dz of [-1.7, 1.7]) for (const dx of [-0.9, 1.3]) B.box(M.darkWood, 0.12, 2.6, 0.12, x + fx * dx, y, z + dz);
    B.box(M.awning[i % 3], 3.0, 0.05, 4.0, x + fx * 0.3, y + 2.55, z, { rz: fx * 0.18 });
    const top = y + 0.95, cx = x + fx * 0.6;
    if (type === 'frutas') for (let k = 0; k < 3; k++) { B.geo(new THREE.CylinderGeometry(0.32, 0.26, 0.22, 10), G.basket, cx, top + 0.11, z - 1.1 + k * 1.1); for (let f = 0; f < 6; f++) B.geo(new THREE.SphereGeometry(0.09, 7, 5), G.fruit[(k + i) % 4], cx + rr(-0.15, 0.15), top + 0.25 + rr(0, 0.06), z - 1.1 + k * 1.1 + rr(-0.15, 0.15)); }
    else if (type === 'pao') for (let k = 0; k < 7; k++) { const g = new THREE.CylinderGeometry(0.16, 0.17, 0.08, 10); B.geo(g, G.bread, cx + rr(-0.25, 0.25), top + 0.04, z - 1.4 + k * 0.45); }
    else if (type === 'peixe') for (let k = 0; k < 8; k++) { const g = new THREE.SphereGeometry(0.06, 6, 4); g.scale(4, 1, 1.4); B.geo(g, G.fish, cx + rr(-0.2, 0.2), top + 0.05, z - 1.4 + k * 0.38, { ry: rr(-0.3, 0.3) }); }
    else if (type === 'anforas') for (let k = 0; k < 6; k++) B.geo(new THREE.CylinderGeometry(0.17, 0.07, 0.75, 8), M.plasterRed, x + fx * (k < 3 ? -0.3 : 0.6), k < 3 ? y + 0.37 : top + 0.37, z - 1.2 + (k % 3) * 1.2);
    else if (type === 'panos') for (let k = 0; k < 5; k++) B.box(G.cloth[k % 4], 0.6, 0.12, 0.5, cx, top + k * 0.12, z - 0.8 + (k % 2) * 0.9);
    else if (type === 'ceramica') for (let k = 0; k < 6; k++) B.geo(new THREE.CylinderGeometry(0.14, 0.09, 0.28, 10), G.clay, cx + rr(-0.2, 0.2), top + 0.14, z - 1.3 + k * 0.5);
    else if (type === 'lamparinas') for (let k = 0; k < 10; k++) { const g = new THREE.SphereGeometry(0.07, 8, 5); g.scale(1, 0.45, 1.3); B.geo(g, G.clay, cx + rr(-0.25, 0.25), top + 0.03, z - 1.4 + k * 0.3); }
    out.marketStalls.push({ x: x - fx * 0.6, z, ry: side < 0 ? Math.PI / 2 : -Math.PI / 2, type });
  }
  // cercado do gado, no lado do rio
  const px = K.x - K.hw + 2, pz = K.z + K.hd - 9;
  for (const [w, d, dx, dz] of [[12, 0.15, 0, -5], [12, 0.15, 0, 5], [0.15, 10, -6, 0], [0.15, 10, 6, 0]]) { B.box(M.wood, w, 0.12, d, px + dx, y + 0.9, pz + dz); B.box(M.wood, w, 0.12, d, px + dx, y + 0.45, pz + dz); addBox(px + dx, pz + dz, w + 0.2, d + 0.2, y - 1, y + 1.1); }
  for (const [dx, dz] of [[-6, -5], [6, -5], [-6, 5], [6, 5], [0, -5], [0, 5]]) B.box(M.darkWood, 0.18, 1.1, 0.18, px + dx, y, pz + dz);
  out.marketPen = { x: px, z: pz, y };
  // templo redondo de Hércules Vencedor, junto ao mercado
  roundTemple(B, M, out, { id: 'hercules', x: K.x + 4, z: K.z - K.hd - 16, r: 5 });
  out.exclusions.push([K.x - K.hw - 6, K.x + K.hw + 6, K.z - K.hd - 26, K.z + K.hd + 6]);
  S.market = new V3(K.x, y, K.z);
  out.zones.mercado = [K.x - K.hw - 6, K.x + K.hw + 6, K.z - K.hd - 26, K.z + K.hd + 6];
  void pick; void rand;
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
