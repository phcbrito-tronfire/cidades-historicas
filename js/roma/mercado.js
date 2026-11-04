// Fórum Boário: o mercado antigo entre o Circo Máximo e o Tibre, junto ao porto fluvial. O bairro vem de um modelo
// ("Rome River Side", de Shahriar Shahrabi, CC BY): o cais sobre o rio, a fonte, as barracas de toldo listrado, o templo
// redondo de Hércules Vencedor (o mais antigo de mármore que ainda está de pé em Roma) e o templo alto no terraço.
// Aqui ficam o paredão do cais sob a água, o cercado do gado ao lado e os vendedores.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { addBox } from '../comum/collision.js';
import { mat4 } from '../comum/batcher.js';
import { collideModel } from '../comum/pisomodelo.js';
import { terrainHeight, BOARIO, boarioWorld } from './terrain.js';
import { rr, rand } from '../comum/util.js';

const V3 = THREE.Vector3;
const BW = (u, v) => boarioWorld(u, v);
// planta do modelo vista de cima (vista ortográfica: 800 px = 1,1 unidade) -> metros no sistema do modelo
const PX = (px, py) => [(-0.02 + (px - 400) * 0.001375) * BOARIO.s, (-0.15 + (py - 400) * 0.001375) * BOARIO.s];
// as barracas do modelo, com o que cada uma vende
const STALLS = [[476, 638, 'frutas'], [572, 638, 'panos'], [545, 530, 'peixe'], [418, 568, 'pao'], [327, 573, 'ceramica'], [296, 484, 'anforas'],
  [196, 650, 'lamparinas'], [240, 650, 'frutas'], [535, 102, 'pao'], [300, 105, 'peixe'], [705, 588, 'anforas']];
const FOUNTAIN = PX(383, 490), HERCULES = PX(220, 315);
// caixa envolvente do bairro no mundo (para o mapa, a zona e as exclusões)
const corners = [[BOARIO.fx0, BOARIO.z0], [BOARIO.x1, BOARIO.z0], [BOARIO.fx0, BOARIO.z1], [BOARIO.x1, BOARIO.z1]].map(([u, v]) => BW(u, v));
const AX0 = Math.min(...corners.map((c) => c.x)), AX1 = Math.max(...corners.map((c) => c.x)), AZ0 = Math.min(...corners.map((c) => c.z)), AZ1 = Math.max(...corners.map((c) => c.z));
const C0 = BW(...FOUNTAIN);
export const MARKET = { x: C0.x, z: C0.z, hw: (AX1 - AX0) / 2, hd: (AZ1 - AZ0) / 2 };

export function buildMarket(B, M, out) {
  const S = out.spots, F = mat4(BOARIO.x, 0, BOARIO.z, 0, BOARIO.ry, 0);
  // paredão do cais debaixo d'água (o modelo acaba logo abaixo da linha d'água)
  B.box(M.travertine2, BOARIO.x1 - BOARIO.x0, 6.2, 1.6, (BOARIO.x0 + BOARIO.x1) / 2, -6, BOARIO.z1 - 0.7, { frame: F });
  // cercado do gado, ao lado do bairro rio acima (o Forum Boarium era, antes de tudo, a feira de bois)
  const pc = BW(-47, 4), px = pc.x, pz = pc.z, y = terrainHeight(px, pz);
  for (const [w, d, dx, dz] of [[12, 0.15, 0, -5], [12, 0.15, 0, 5], [0.15, 10, -6, 0], [0.15, 10, 6, 0]]) { B.box(M.wood, w, 0.12, d, px + dx, y + 0.9, pz + dz); B.box(M.wood, w, 0.12, d, px + dx, y + 0.45, pz + dz); addBox(px + dx, pz + dz, w + 0.2, d + 0.2, y - 1, y + 1.1); }
  for (const [dx, dz] of [[-6, -5], [6, -5], [-6, 5], [6, 5], [0, -5], [0, 5]]) B.box(M.darkWood, 0.18, 1.1, 0.18, px + dx, y, pz + dz);
  out.marketPen = { x: px, z: pz, y };
  out.exclusions.push([AX0 - 4, AX1 + 4, AZ0 - 4, AZ1 + 4]);
  out.zones.mercado = [AX0, AX1, AZ0, AZ1];
  S.market = new V3(C0.x, BOARIO.floor + 0.05, C0.z);
  { const h = BW(...HERCULES); S.hercules = new V3(h.x, BOARIO.floor, h.z); }
  out.marketStalls = []; out.boarioPeople = [];
}

// carrega o modelo, troca o material sem luz (iluminação já pintada) por um que reage ao sol e à noite, tira a colisão da
// forma dele e acha, perto de cada barraca, um lugar livre para o vendedor (e alguns para o povo em volta da fonte)
export async function placeBoario(scene, city, quality) {
  try {
    const file = quality === 'alto' ? 'boario.glb' : 'boario_leve.glb';
    const g = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('assets/models/roma/' + file);
    const root = g.scene, mats = new Map();
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals(); // o arquivo vem sem normais (o modelo era sem luz)
      const m0 = o.material;
      if (!mats.has(m0)) { if (m0.map) m0.map.anisotropy = 8; mats.set(m0, new THREE.MeshStandardMaterial({ map: m0.map, color: 0xffffff, roughness: 0.88, metalness: 0 })); }
      o.material = mats.get(m0); o.castShadow = true; o.receiveShadow = true;
    });
    const holder = new THREE.Group(); holder.position.set(BOARIO.x, BOARIO.y0, BOARIO.z); holder.rotation.y = BOARIO.ry; holder.scale.setScalar(BOARIO.s);
    holder.add(root); scene.add(holder);
    const col = await collideModel(holder, { y0: BOARIO.y0 - 0.3, cell: 0.5, scanH: 9, chest: 1.0, top: BOARIO.y0 + 30 });
    city.boarioCol = col;
    const plaza = BOARIO.floor + 0.05;
    const free = (x, z, tol = 0.35) => { const f = col.floorAt(x, z); return !Number.isNaN(f) && Math.abs(f - plaza) < tol && !col.solidAt(x, z) && !col.solidAt(x + 0.5, z) && !col.solidAt(x - 0.5, z) && !col.solidAt(x, z + 0.5) && !col.solidAt(x, z - 0.5); };
    const fw = BW(...FOUNTAIN);
    for (const [px, py, type] of STALLS) {
      const c = BW(...PX(px, py));
      let best = null;
      for (let r = 1; r <= 4 && !best; r += 0.5) for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r; if (free(x, z)) { best = { x, z }; break; } }
      if (!best) continue;
      city.marketStalls.push({ x: best.x, z: best.z, ry: Math.atan2(fw.x - best.x, fw.z - best.z), type });
    }
    for (let i = 0; i < 80 && city.boarioPeople.length < 10; i++) { const a = rand() * 6.28, r = rr(5, 16), x = fw.x + Math.cos(a) * r, z = fw.z + Math.sin(a) * r; if (free(x, z, 0.2)) city.boarioPeople.push({ x, z, ry: Math.atan2(fw.x - x, fw.z - z) }); }
    console.info('Fórum Boário:', col.boxes, 'caixas de colisão,', city.marketStalls.length, 'vendedores');
  } catch (e) { console.warn('Fórum Boário (modelo)', e); }
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
