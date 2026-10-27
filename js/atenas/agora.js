// Ágora (praça do povo: mercado, tribunais, conselho), o Hefesteion no Colono Agoraios, a Pnyx (assembleia) e o
// Cerâmico (bairro dos oleiros, junto ao Dípilon). Disposição baseada nas escavações americanas da ágora.
import * as THREE from 'three';
import { doricTemple, ionicColumn, doricShaft, doricCapital } from './arquitetura.js';
import { ribbon, brazier } from './acropole.js';
import { addBox, addCircle } from '../comum/collision.js';
import { terrainHeight, AGORA, HEPH, BEMA, PNYX } from './terrain.js';
import { rr, rand, pick } from '../comum/util.js';

const V3 = THREE.Vector3;
import { PANATHENAIC } from './ruas.js';
export { PANATHENAIC };

export function buildAgora(B, M, out) {
  const S = out.spots, A = AGORA, Y = A.y;
  const ty = (x, z) => terrainHeight(x, z);
  ribbon(B, M.road, PANATHENAIC, 10);
  out.zones.agora = [A.x - A.hw, A.x + A.hw, A.z - A.hd, A.z + A.hd];
  out.exclusions.push([A.x - A.hw - 6, A.x + A.hw + 6, A.z - A.hd - 6, A.z + A.hd + 6]);
  S.agora = new V3(A.x, Y, A.z);

  // ---------------- Hefesteion (templo de Hefesto e Atena Ergane, dos ferreiros e artesãos), no alto do Colono
  const avail = out.available || new Set();
  if (avail.has('hefesteion')) {
    // plataforma do templo (o modelo fica em cima) com espaço na frente para a escada de entrada
    B.box(M.poros, 35, 1.4, 21, HEPH.x + 1.75, HEPH.y - 1.2, HEPH.z);
    addBox(HEPH.x + 1.75, HEPH.z, 35, 21, HEPH.y - 2, HEPH.y + 0.2);
    out.sculptures.push({ model: 'hefesteion', x: HEPH.x, y: HEPH.y, z: HEPH.z, ry: 0, length: 28 });
    out.hephModel = true; // a colisão (piso, colunas, paredes) é tirada do próprio modelo depois de carregado (main.js)
  } else {
    doricTemple(B, { M, x: HEPH.x, y: HEPH.y - 0.2, z: HEPH.z, ry: 0, nf: 6, ns: 13, col: 1.02, h: 5.71, ic: 2.58, steps: 3, stepH: 0.36, stepW: 0.5, found: 1.2, rich: true, cella: { w: 8.4, d: 20, door: 2.6, inner: 5 } });
    B.box(M.poros, 35, 1.4, 21, HEPH.x + 1.75, HEPH.y - 1.6, HEPH.z); addBox(HEPH.x + 1.75, HEPH.z, 35, 21, HEPH.y - 2.4, HEPH.y - 0.2);
  }
  S.hephaisteion = new V3(HEPH.x + 22, HEPH.y, HEPH.z);
  // escadaria do Colono até a praça
  // escadaria do Colono até a praça, colada na plataforma do templo: degraus de 0,3 m até encontrar o chão
  { const x0 = HEPH.x + 19.25; let y = HEPH.y - 0.2; for (let i = 0; i < 40; i++) { const x = x0 + 0.45 + i * 0.9, g = ty(x, HEPH.z); if (y - 0.3 < g + 0.05) break; y -= 0.3; B.box(M.poros, 0.95, y - g + 0.4, 9, x, g - 0.4, HEPH.z); addBox(x, HEPH.z, 0.95, 9, g - 2, y); } }
  out.zones.hefesteion = [HEPH.x - 24, HEPH.x + 22, HEPH.z - 18, HEPH.z + 18];
  out.exclusions.push([HEPH.x - 26, HEPH.x + 42, HEPH.z - 22, HEPH.z + 22]);
  // forjas de bronze ao pé do Colono (os ferreiros trabalhavam em volta do templo do seu deus)
  for (let i = 0; i < 3; i++) forge(B, M, out, HEPH.x + 30, ty(HEPH.x + 30, HEPH.z - 26 + i * 7) , HEPH.z - 26 + i * 7);
  S.forge = new V3(HEPH.x + 34, ty(HEPH.x + 34, HEPH.z - 19), HEPH.z - 19);

  // ---------------- as stoas: pórticos cobertos onde se conversava, negociava e se fazia justiça
  const stoa = (name, x, z, ry, ns, D, ic, depth, inner = true) => {
    const s = doricTemple(B, { M, x, y: Y - 0.1, z, ry, nf: 1, ns, col: D, h: D * 5.2, ic, steps: 2, stepH: 0.3, stepW: 0.45, stoa: true, depth, innerIonic: inner });
    out.stoas = out.stoas || []; out.stoas.push({ name, x, z, ry, L: s.L, depth });
    return s;
  };
  stoa('Stoa de Zeus Eleutério', A.x - 92, A.z - 30, Math.PI / 2, 13, 1.0, 3.0, 11);
  stoa('Stoa Real', A.x - 92, A.z - 60, Math.PI / 2, 8, 0.85, 2.6, 7.5, false);
  stoa('Stoa Pintada (Poikile)', A.x + 30, A.z - 92, 0, 17, 1.0, 2.9, 12.5);
  stoa('Stoa Sul', A.x + 2, A.z + 93, Math.PI, 20, 0.8, 3.2, 14);
  // painéis da Stoa Pintada: a batalha de Maratona, de Polignoto e Mícon (aqui, painéis coloridos na parede)
  for (let i = 0; i < 7; i++) B.box(M.awning[i % 3], 4.2, 2.6, 0.06, A.x + 30 - 18 + i * 6, Y + 1.8, A.z - 92 - 12.5 + 0.8);
  S.stoaPoikile = new V3(A.x + 30, Y, A.z - 92 + 3);
  S.stoaZeus = new V3(A.x - 92 + 3, Y, A.z - 30);

  // ---------------- Bouleutério (Conselho dos 500) e Tholos (onde os prítanes comiam e dormiam de plantão)
  {
    const x = A.x - 88, z = A.z + 28, y = ty(x, z);
    B.box(M.poros, 24, 0.5, 20, x, y - 0.3, z);
    for (const [w, d, dx, dz] of [[23, 0.9, 0, -9.5], [23, 0.9, 0, 9.5], [0.9, 20, -11.5, 0]]) { B.box(M.stoaWall, w, 8, d, x + dx, y + 0.2, z + dz); addBox(x + dx, z + dz, w, d, y, y + 8); }
    for (const dz of [-6.5, 6.5]) { B.box(M.stoaWall, 0.9, 8, 6, x + 11.5, y + 0.2, z + dz); addBox(x + 11.5, z + dz, 0.9, 6, y, y + 8); }
    for (let k = 0; k < 6; k++) { B.box(M.wood, 1, 0.45 + k * 0.4, 16, x - 8 + k * 1.1, y + 0.2, z); addBox(x - 8 + k * 1.1, z, 1, 16, y, y + 0.45 + k * 0.4); }
    B.box(M.ceiling, 23, 0.4, 20, x, y + 8.2, z);
    const rf = new THREE.ConeGeometry(17, 3, 4, 1, true); rf.rotateY(Math.PI / 4); rf.scale(1, 1, 0.85);
    B.geo(rf, M.tiles, x, y + 8.6 + 1.5, z, { uv: { s: 3 } });
    S.bouleuterion = new V3(x + 14, y, z);
  }
  {
    const x = A.x - 74, z = A.z + 58, y = ty(x, z), R = 9.2;
    B.geo(new THREE.CylinderGeometry(R + 0.6, R + 0.6, 0.5, 40), M.poros, x, y - 0.2, z);
    B.geo(new THREE.CylinderGeometry(R, R, 6.5, 40, 1, true), M.stoaWall, x, y + 3.5, z, { uv: { s: 4 } });
    addCircle(x, z, R, y, y + 6.5);
    const cone = new THREE.ConeGeometry(R + 0.9, 3.4, 40, 1, true); B.geo(cone, M.tiles, x, y + 6.75 + 1.7, z, { uv: { s: 2 } });
    S.tholos = new V3(x + R + 2, y, z);
  }
  // o marco de pedra "Eu sou o limite da ágora" e a casa do sapateiro Simão, onde Sócrates conversava
  {
    const x = A.x - 70, z = A.z + 82, y = ty(x, z);
    B.box(M.marble, 0.4, 1.1, 0.25, x, y, z); addBox(x, z, 0.4, 0.25, y, y + 1.1);
    S.horos = new V3(x, y, z);
    const hx = x - 12, hz = z + 10, hy = ty(hx, hz);
    smallHouse(B, M, hx, hy, hz, 9, 8, 0);
    S.simon = new V3(hx + 6, hy, hz - 1);
    // banco de pedra onde Sócrates se senta para conversar
    B.box(M.poros, 1.6, 0.46, 0.5, hx + 6, hy, hz - 0.72); addBox(hx + 6, hz - 0.72, 1.6, 0.42, hy, hy + 0.46);
    // banca do sapateiro: sandálias e couro
    B.box(M.wood, 2, 0.8, 0.8, hx + 5.2, hy, hz + 2.5); addBox(hx + 5.2, hz + 2.5, 2, 0.8, hy, hy + 0.8);
    out.stalls.push({ type: 'sandalias', x: hx + 5.2, y: hy + 0.8, z: hz + 2.5 });
  }
  // altar dos Doze Deuses (o "marco zero": as distâncias da Ática eram medidas a partir dele)
  {
    const x = A.x + 12, z = A.z - 68, y = ty(x, z);
    for (const [w, d, dx, dz] of [[9.5, 0.4, 0, -4.6], [9.5, 0.4, 0, 4.6], [0.4, 9.5, -4.6, 0], [0.4, 3.5, 4.6, -3]]) { B.box(M.marble, w, 1.1, d, x + dx, y, z + dz); addBox(x + dx, z + dz, w, d, y, y + 1.1); }
    B.box(M.marble, 2.6, 1.0, 1.8, x, y, z); addBox(x, z, 2.6, 1.8, y, y + 1);
    S.twelveGods = new V3(x + 6, y, z);
    out.torches.push(new V3(x, y + 1.3, z));
  }
  // fonte (casa de fonte do sudeste): bica com cabeças de leão sobre um tanque
  {
    const x = A.x + 92, z = A.z + 82, y = ty(x, z);
    B.box(M.poros, 14, 0.5, 8, x, y - 0.2, z);
    B.box(M.stoaWall, 14, 5, 0.8, x, y + 0.3, z + 3.6); B.box(M.stoaWall, 0.8, 5, 7.5, x - 6.6, y + 0.3, z); B.box(M.stoaWall, 0.8, 5, 7.5, x + 6.6, y + 0.3, z);
    for (const [w, d, dx, dz] of [[14, 0.8, 0, 3.6], [0.8, 7.5, -6.6, 0], [0.8, 7.5, 6.6, 0]]) addBox(x + dx, z + dz, w, d, y, y + 5.3);
    B.box(M.marble, 10, 0.8, 2.6, x, y + 0.3, z + 1.8); addBox(x, z + 1.8, 10, 2.6, y, y + 1.1);
    for (let i = 0; i < 4; i++) B.box(M.bronze, 0.3, 0.3, 0.4, x - 3.6 + i * 2.4, y + 2.2, z + 3.1);
    for (let i = 0; i < 4; i++) { B.geo(doricShaft(3.8, 0.3), M.colMarble, x - 4.5 + i * 3, y + 0.3, z - 3.3, { uv: { s: 1 } }); addCircle(x - 4.5 + i * 3, z - 3.3, 0.3, y, y + 4); }
    B.box(M.tiles, 15, 0.4, 9, x, y + 5.3, z);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 2.2), M.water); pool.rotation.x = -Math.PI / 2; pool.position.set(x, y + 0.95, z + 1.8);
    (out.extra ||= []).push(pool);
    S.fountain = new V3(x, y, z - 3);
    out.fountain = { x, y: y + 2.2, z: z + 3.0 };
  }
  // hermas: pilares com a cabeça de Hermes, protetores das ruas e das portas (muitas na "Stoa das Hermas")
  for (let i = 0; i < 9; i++) herm(B, M, out, A.x - 60 + i * 4.2, ty(A.x - 60 + i * 4.2, A.z - 84), A.z - 84);
  // estátuas: os Tiranicidas (Harmódio e Aristogíton, heróis da democracia) no meio da praça
  {
    const x = A.x + 8, z = A.z - 18, y = ty(x, z);
    B.box(M.marble, 4, 1.6, 2.4, x, y, z); addBox(x, z, 4, 2.4, y, y + 1.6);
    out.sculptures.push({ model: 'tiranicidas', x, y: y + 1.6, z, ry: Math.PI / 2, length: 2.1, optional: true });
    out.sculptures.push({ model: 'doryphoros', x: x - 1, y: y + 1.6, z: z - 0.5, ry: Math.PI / 2 + 0.3, length: 2.1, optional: true });
    out.sculptures.push({ model: 'zeus_bronze', x: x + 1.1, y: y + 1.6, z: z + 0.4, ry: Math.PI / 2 - 0.2, length: 2.1, optional: true });
    S.tyrannicides = new V3(x + 3, y, z);
  }
  // estátuas votivas de bronze e mármore em pedestais ao longo da Via Panatenaica e diante das stoas
  {
    const spots = [[A.x - 40, A.z - 60, 'discobolo'], [A.x - 20, A.z - 40, 'kore'], [A.x + 2, A.z - 8, 'zeus_bronze'], [A.x - 60, A.z - 80, 'doryphoros'], [A.x + 30, A.z - 78, 'kouros'],
      [A.x - 80, A.z - 10, 'zeus_bronze'], [A.x + 22, A.z + 80, 'doryphoros'], [A.x - 30, A.z + 76, 'kore'], [-214, -112, 'discobolo'], [-212, -60, 'doryphoros']];
    for (const [x, z, m] of spots) {
      const y = ty(x, z);
      B.box(M.colMarble, 1.5, 0.3, 1.5, x, y, z); B.box(M.colMarble, 1.1, 1.5, 1.1, x, y + 0.3, z); B.box(M.colMarble, 1.3, 0.2, 1.3, x, y + 1.8, z);
      addBox(x, z, 1.5, 1.5, y, y + 2);
      out.sculptures.push({ model: m, x, y: y + 2, z, ry: rand() * 6.3, length: m === 'discobolo' ? 1.8 : 2.05, optional: true });
    }
  }
  // mercado: tendas de linho com mercadorias (cada tipo num canto, como na ágora de verdade: "o peixe", "o queijo"...)
  const types = ['figos', 'azeitonas', 'peixe', 'pao', 'vinho', 'ceramica', 'azeite', 'queijo', 'flores', 'figos', 'peixe', 'pao'];
  let n = 0;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const x = A.x + 30 + i * 16 + rr(-2, 2), z = A.z - 40 + j * 22 + rr(-2, 2), y = ty(x, z);
    stall(B, M, x, y, z, rand() * 0.4 - 0.2, n);
    out.stalls.push({ type: types[n % types.length], x, y: y + 0.85, z: z - 0.6 });
    if (types[n % types.length] === 'vinho' || types[n % types.length] === 'azeite' || types[n % types.length] === 'ceramica') out.sculptures.push({ model: rand() < 0.5 ? 'anforas' : 'anfora_negra', x: x + 1.2, y, z: z + 0.8, ry: rand() * 6, length: rand() < 0.5 ? 0.8 : 0.6, optional: true });
    n++;
  }
  S.market = new V3(A.x + 54, Y, A.z - 18);
  out.zones.mercado = [A.x + 20, A.x + 100, A.z - 55, A.z + 30];
  // plátanos (plantados por Címon para dar sombra) em volta da praça
  out.trees = out.trees || [];
  for (let i = 0; i < 12; i++) { out.trees.push({ kind: 'platano', x: A.x - 70 + i * 13, z: A.z - 72 + rr(-2, 2) }); out.trees.push({ kind: 'platano', x: A.x - 70 + i * 13, z: A.z + 74 + rr(-2, 2) }); }
  for (let i = 0; i < 7; i++) out.trees.push({ kind: 'platano', x: A.x - 72 + rr(-1, 1), z: A.z - 50 + i * 16 });

  // ---------------- Pnyx: onde a assembleia (ekklesia) se reunia — milhares de cidadãos sentados na encosta
  {
    const x = BEMA.x, z = BEMA.z, y = ty(x, z);
    B.box(M.poros, 4.2, 1.6, 3.4, x, y - 0.2, z); addBox(x, z, 4.2, 3.4, y - 1, y + 1.4);
    // escada da bema: o degrau desenhado e o de colisão no mesmo lugar (antes estavam 0,6 m desencontrados)
    for (let i = 0; i < 4; i++) { const sz = z - 2 - 0.6 * (3 - i); B.box(M.poros, 1.6, 0.35 * (i + 1), 0.6, x, y - 0.2, sz); addBox(x, sz, 1.6, 0.6, y - 1, y - 0.2 + 0.35 * (i + 1)); }
    S.bema = new V3(x, y + 1.4, z);
    S.pnyx = new V3(x + 9, ty(x + 9, z - 12), z - 12);
    // muro de arrimo em arco que segura o aterro da assembleia
    for (let k = 0; k < 24; k++) {
      const a = -1.2 + (k / 23) * 2.4, r = 70, px = x + Math.sin(a + 0.64) * r, pz = z - Math.cos(a + 0.64) * r, py = ty(px, pz);
      B.box(M.wallStone, 9.6, 3.2, 1.4, px, py - 2.2, pz, { ry: -(a + 0.64) });
    }
    out.zones.pnyx = [x - 30, x + 70, z - 70, z + 12];
    out.exclusions.push([x - 32, x + 72, z - 72, z + 14]);
    void PNYX;
  }

  // ---------------- Cerâmico: oficinas de oleiros e fornos (a "argila da Ática" dava o vermelho dos vasos)
  {
    const cx = -432, cz = -376; // entre a Via Panatenaica e a muralha, perto do Dípilon
    for (let i = 0; i < 3; i++) {
      const x = cx + i * 22, z = cz + (i % 2) * 10, y = ty(x, z);
      smallHouse(B, M, x, y, z, 11, 9, 0.2 * i);
      kiln(B, M, out, x + 9, ty(x + 9, z - 7), z - 7);
      // vasos secando ao sol
      for (let k = 0; k < 8; k++) out.pots = (out.pots || []).concat([{ x: x - 4 + (k % 4) * 1.1, z: z - 7.5 - Math.floor(k / 4) * 1.1, y: ty(x - 4 + (k % 4) * 1.1, z - 7.5) }]);
      out.stalls.push({ type: 'ceramica', x: x - 2, y: y + 0.85, z: z - 5.2 });
      out.sculptures.push({ model: 'anforas', x: x + 3.5, y, z: z - 9.5, ry: rand() * 6, length: 0.85, optional: true });
      out.sculptures.push({ model: 'vaso', x: x - 1.2, y: y + 0.85, z: z - 5.2, ry: rand() * 6, length: 0.5, optional: true });
      B.box(M.wood, 3, 0.85, 1, x - 2, y, z - 5.2); addBox(x - 2, z - 5.2, 3, 1, y, y + 0.85);
    }
    S.potter = new V3(cx + 3, ty(cx + 3, cz - 8), cz - 8);
    out.zones.ceramico = [cx - 20, cx + 70, cz - 30, cz + 25];
    out.exclusions.push([cx - 14, cx + 62, cz - 20, cz + 16]);
  }
}

function forge(B, M, out, x, y, z) {
  B.box(M.mudbrick, 2.2, 1.0, 1.6, x, y, z); addBox(x, z, 2.2, 1.6, y, y + 1);
  B.box(M.mudbrick, 0.9, 2.6, 0.9, x + 0.6, y + 1, z - 0.3); // chaminé
  B.box(M.bronze, 0.5, 0.3, 0.3, x - 0.5, y + 1, z + 0.4); // bigorna
  for (const s of [-1, 1]) B.box(M.wood, 0.1, 2.4, 0.1, x + s * 1.6, y, z + 1.5);
  B.box(M.awning[0], 3.6, 0.05, 2.6, x, y + 2.4, z + 0.8);
  out.torches.push(new V3(x, y + 1.15, z));
}
function kiln(B, M, out, x, y, z) {
  const d = new THREE.SphereGeometry(1.6, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); d.scale(1, 1.25, 1);
  B.geo(d, M.mudbrick, x, y + 0.4, z, { uv: { s: 1.5 } });
  B.geo(new THREE.CylinderGeometry(1.7, 1.8, 0.5, 18), M.mudbrick, x, y + 0.15, z);
  addCircle(x, z, 1.7, y, y + 2.4);
  out.torches.push(new V3(x + 1.6, y + 0.5, z));
}
function herm(B, M, out, x, y, z) {
  B.box(M.marble, 0.38, 1.35, 0.32, x, y, z); B.box(M.marble, 0.5, 0.12, 0.42, x, y + 1.35, z);
  const h = new THREE.SphereGeometry(0.17, 12, 10); h.scale(0.9, 1.15, 1); B.geo(h, M.marble, x, y + 1.62, z);
  const beard = new THREE.ConeGeometry(0.11, 0.22, 10); beard.rotateX(Math.PI); B.geo(beard, M.marble, x, y + 1.46, z + 0.07);
  addBox(x, z, 0.45, 0.4, y, y + 1.8);
}
// casa simples de um ou dois cômodos com telhado de uma água (oficinas, casa de Simão)
export function smallHouse(B, M, x, y, z, w, d, ry) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const wall = (lw, ld, lx, lz, h = 3.4) => { const [px, pz] = P(lx, lz); B.box(M.socle, lw, 0.7, ld, px, y - 0.3, pz, { ry }); B.box(M.plasterOchre, lw, h - 0.4, ld, px, y + 0.4, pz, { ry }); addBox(px, pz, Math.abs(c) * lw + Math.abs(s) * ld, Math.abs(s) * lw + Math.abs(c) * ld, y, y + h); };
  wall(w, 0.5, 0, -d / 2); wall(0.5, d, -w / 2, 0); wall(0.5, d, w / 2, 0);
  wall(w / 2 - 1, 0.5, -w / 4 - 0.5, d / 2); wall(w / 2 - 1, 0.5, w / 4 + 0.5, d / 2);
  const [rx, rz] = P(0, 0);
  B.box(M.tiles, w + 1, 0.25, d + 1, rx, y + 3.4, rz, { ry, rx: 0.12 });
}
function stall(B, M, x, y, z, ry, n) {
  const c = Math.cos(ry), s = Math.sin(ry);
  for (const [lx, lz] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) B.box(M.wood, 0.1, 2.3, 0.1, x + lx * c + lz * s, y, z - lx * s + lz * c);
  B.box(M.awning[n % 3], 3.8, 0.05, 3.0, x, y + 2.3, z, { ry, rx: 0.1 });
  B.box(M.wood, 3.0, 0.85, 1.0, x, y, z - 0.6 * c, { ry });
  addBox(x, z - 0.6, 3.0, 1.0, y, y + 0.85);
}
