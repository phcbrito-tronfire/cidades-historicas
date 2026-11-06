// O porto (inspirado no Pireu de Hipódamo: cais de pedra, galpões das trirremes, o empório) e a praia do Falero.
// Os barcos em si são modelos (main.js); aqui ficam o cais, os galpões, as cabanas, as redes e onde cada barco fica.
import * as THREE from 'three';
import { addBox, addRotBox } from '../comum/collision.js';
import { terrainHeight, coastPoint, along, SLIPS } from './terrain.js';
import { rr, rand } from '../comum/util.js';
import { doricTemple } from './arquitetura.js';

const V3 = THREE.Vector3;
// ângulo da costa num ponto (para alinhar cais e barcos): +x local = ao longo da costa (para leste)
const tangent = (a) => { const p = coastPoint(a - 2), q = coastPoint(a + 2); return Math.atan2(-(q.z - p.z), q.x - p.x); };

export function buildHarbor(B, M, out) {
  const S = out.spots;
  // ---------------- cais de pedra (along -345 a -150): plataforma 14 m terra adentro, parede vertical na água
  const QY = 1.5;
  for (let a = -300; a < -150; a += 6) {
    const p = coastPoint(a + 3, -7), ry = tangent(a + 3);
    B.box(M.quay, 6.2, QY + 4.6, 14.4, p.x, -4.6, p.z, { ry });
    addRotBox(p.x, p.z, 6.2, 14.4, ry, -5, QY, true); // (a caixa reta em volta virava piso invisível sobre a água)
    // cabeços de amarração
    if (Math.round(a) % 18 === 0) { const q = coastPoint(a + 3, -1.2); B.box(M.poros, 0.5, 0.7, 0.5, q.x, QY, q.z); addBox(q.x, q.z, 0.5, 0.5, QY, QY + 0.7); }
  }
  S.quay = (() => { const p = coastPoint(-230, -4); return new V3(p.x, QY, p.z); })();
  out.zones.porto = (() => { const a = coastPoint(-350, -60), b = coastPoint(-150, 20); return [Math.min(a.x, b.x), Math.max(a.x, b.x), Math.min(a.z, b.z), Math.max(a.z, b.z)]; })();
  // escada de pedra para descer à água
  { const p = coastPoint(-212, -1), ry = tangent(-212); for (let i = 0; i < 5; i++) { const q = coastPoint(-212, -1 + i * 0.9); B.box(M.quay, 3, QY - i * 0.35, 0.9, q.x, 0, q.z, { ry }); addBox(q.x, q.z, 3, 1, -1, QY - i * 0.35); } void p; }

  // ---------------- galpões das trirremes (neosoikoi, como os escavados em Zea e Muníquia, no Pireu): cada um é uma
  // rampa de pedra inclinada que entra no mar, com um trilho de madeira no meio por onde o casco deslizava, duas
  // fileiras de colunas sobre muretas e um telhado de duas águas, fechado no fundo. A trirreme ficava inteira lá dentro,
  // de popa para a terra, sem mastro, vela e remos (guardados nos armazéns de apetrechos): fora d'água o casco leve de
  // pinho não encharcava nem pegava o verme do mar. (Antes: navio de vela armada atravessando um telhado chato e com o
  // casco enterrado na areia.)
  const SL = 0.06, rampY = (off) => 0.96 + (-14 - off) * SL; // a rampa acompanha o declive da praia e entra no mar
  const OB = -44, OF = 3, LEN = OF - OB, MID = (OB + OF) / 2, HW = 4.5, EAVE = 8.1, RISE = 2.6, th = Math.atan(SL);
  const kR = RISE / HW, hw2 = HW + 0.5, al = Math.atan(kR), rm = new THREE.Matrix4();
  const gable = (() => { const sh = new THREE.Shape(); sh.moveTo(-hw2, -1.2); sh.lineTo(hw2, -1.2); sh.lineTo(hw2, EAVE - kR * 0.5); sh.lineTo(0, EAVE + RISE); sh.lineTo(-hw2, EAVE - kR * 0.5); sh.closePath();
    return new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false }); })();
  const shedBox = [1e9, -1e9, 1e9, -1e9];
  for (let k = 0; k < 5; k++) {
    const a = -348 + k * 10, c0 = coastPoint(a, MID), c1 = coastPoint(a, MID + 1), phi = Math.atan2(c1.x - c0.x, c1.z - c0.z);
    const Fr = new THREE.Matrix4().makeTranslation(c0.x, rampY(MID), c0.z).multiply(rm.makeRotationY(phi)).multiply(rm.makeRotationX(th)); // +z local = para o mar, descendo
    const at = (u, v, w) => new V3(u, v, w).applyMatrix4(Fr);
    const fb = (mat, w, h, d, x, y, z, o = {}) => B.box(mat, w, h, d, x, y, z, { frame: Fr, ...o });
    for (const [u, w] of [[-7, -LEN / 2 - 2], [7, -LEN / 2 - 2], [-7, LEN / 2], [7, LEN / 2]]) { const p = at(u, 0, w); shedBox[0] = Math.min(shedBox[0], p.x); shedBox[1] = Math.max(shedBox[1], p.x); shedBox[2] = Math.min(shedBox[2], p.z); shedBox[3] = Math.max(shedBox[3], p.z); }
    // a rampa (o bloco desce até o fundo do mar na boca), o trilho do casco e os dormentes engraxados
    fb(M.quay, 7.9, 5, LEN, 0, -5, 0);
    fb(M.darkWood, 0.7, 0.12, LEN - 1, 0, 0, 0);
    for (let w = -LEN / 2 + 1.5; w < LEN / 2 - 1; w += 2.5) fb(M.wood, 3.2, 0.2, 0.3, 0, 0, w);
    // muretas das colunas, colunas, vigas e o telhado (entre o casco e as colunas fica uma faixa da rampa para andar)
    for (const sd of [-1, 1]) {
      fb(M.poros, 1.0, 5.35, LEN, sd * HW, -5, 0);
      for (let w = -LEN / 2 + 1.5; w <= LEN / 2 - 1; w += 4) {
        const b = at(sd * HW, 0.35, w), t = at(sd * HW, EAVE - 0.5, w);
        B.box(M.poros, 0.62, t.y - b.y, 0.62, b.x, b.y, b.z, { ry: phi, noGround: true });
        addBox(b.x, b.z, 0.62, 0.62, b.y - 1, t.y);
      }
      fb(M.darkWood, 0.7, 0.5, LEN + 0.4, sd * HW, EAVE - 0.5, 0.2); // viga sobre as colunas
      const vLine = EAVE + RISE - kR * hw2 / 2; // meio da água do telhado (a face de baixo apoiada na viga)
      fb(M.tiles, hw2 / Math.cos(al) + 0.06, 0.22, LEN + 1, sd * hw2 / 2, vLine + 0.11 / Math.cos(al) - 0.11, 0.3, { rz: -sd * al });
    }
    fb(M.tiles, 0.55, 0.22, LEN + 1, 0, EAVE + RISE + 0.06, 0.3); // cumeeira
    fb(M.darkWood, 2 * HW, 0.4, 0.4, 0, EAVE - 0.4, LEN / 2 + 0.2); // linha (tirante) na boca do galpão
    B.geo(gable, M.poros, 0, 0, -LEN / 2 - 0.6, { frame: Fr }); // parede do fundo, com a empena
    // piso para andar (rampa e muretas) e o chão de terra rebaixado por baixo
    SLIPS.push({ m: Fr.clone().invert(), hw: HW + 0.5, half: LEN / 2, hRamp: 0.12, hSide: 0.35, side: HW - 0.5, th });
    for (let w = -LEN / 2; w < LEN / 2; w += 2) { const p = at(0, 0, w + 1), lo = at(0, 0, w + 2); if (B.onFloor) B.onFloor({ x: p.x, z: p.z, w: 2 * hw2, d: 2, ry: phi, top: lo.y }); }
    addRotBox(at(0, 0, -LEN / 2 - 0.3).x, at(0, 0, -LEN / 2 - 0.3).z, 2 * hw2, 0.6, phi, rampY(OB) - 1.2, rampY(OB) + EAVE); // parede do fundo
    // a trirreme: casco apoiado no trilho, a proa para o mar (num galpão a rampa fica vazia, para se ver como era)
    if (k !== 2) {
      const c = at(0, 0.26, -LEN / 2 + 23); // centro do casco (32 m: da popa, a 7 m do fundo, à proa, sobre a água)
      out.boats.push({ model: 'trirreme', x: c.x, z: c.z, y: c.y, ry: phi - Math.PI / 2, tilt: -th, len: 32, docked: true, shed: true });
      addRotBox(c.x, c.z, 4.6, 28, phi, c.y - 1, c.y + 3.2); // o casco (ninguém atravessa o navio)
    }
  }
  out.exclusions.push(shedBox); // (nada de mato e árvore nascendo nas rampas)
  // empório: armazém comprido atrás do cais (grãos do mar Negro, vinho, azeite, madeira)
  {
    const p = coastPoint(-255, -40), ry = tangent(-255);
    doricTemple(B, { M, x: p.x, y: terrainHeight(p.x, p.z) - 0.1, z: p.z, ry: ry + Math.PI, nf: 1, ns: 16, col: 0.8, h: 4.2, ic: 3.4, steps: 1, stepH: 0.35, stepW: 0.4, stoa: true, depth: 12, innerIonic: false });
    S.emporion = new V3(p.x, terrainHeight(p.x, p.z), p.z);
    // ânforas empilhadas e fardos
    for (let i = 0; i < 26; i++) { const q = coastPoint(-275 + i * 1.6, -24 + (i % 3) * 1.2); out.amphorae = (out.amphorae || []).concat([{ x: q.x, z: q.z, y: QY }]); }
  }
  // túmulo de Temístocles, na ponta do promontório (o criador da frota)
  { const p = coastPoint(-395, -8), y = terrainHeight(p.x, p.z); B.box(M.marble, 3.4, 1.2, 2.2, p.x, y, p.z); B.box(M.marble, 2.4, 1.4, 1.4, p.x, y + 1.2, p.z); addBox(p.x, p.z, 3.4, 2.2, y, y + 2.6); S.themistocles = new V3(p.x + 3, y, p.z); }
  // navios no porto
  { const p = coastPoint(-228, 12); out.boats.push({ model: 'trirreme', x: p.x, z: p.z, y: 0, ry: tangent(-228), len: 36, moored: true, board: true, name: 'Páralos' }); S.trireme = new V3(p.x, 0, p.z); }
  { const p = coastPoint(-182, 11); out.boats.push({ model: 'mercante', x: p.x, z: p.z, y: 0, ry: tangent(-182), len: 18, moored: true }); }
  // trirreme navegando ao largo (treino dos remadores) e outra entrando no porto
  out.boats.push({ model: 'trirreme', len: 36, route: { a0: -380, a1: 300, off: 120 }, speed: 4.2 });
  out.boats.push({ model: 'mercante', len: 18, route: { a0: 300, a1: -380, off: 200 }, speed: 2.4 });

  // ---------------- praia do Falero: barcos na areia, redes estendidas, cabanas e os pescadores
  for (let i = 0; i < 7; i++) {
    const a = -40 + i * 34 + rr(-4, 4), p = coastPoint(a, -9 - rr(0, 6));
    const model = rand() < 0.5 ? 'barco_remo' : 'barco_pesca';
    out.boats.push({ model, x: p.x, z: p.z, y: terrainHeight(p.x, p.z) + 0.15, ry: tangent(a) + Math.PI / 2 + rr(-0.4, 0.4), len: model === 'barco_remo' ? 4.2 : 6.5, beached: true });
  }
  // redes secando em varas
  for (let i = 0; i < 4; i++) {
    const a = 0 + i * 52, p = coastPoint(a, -24), y = terrainHeight(p.x, p.z), ry = tangent(a);
    for (const s of [-1, 1]) { B.box(M.wood, 0.1, 2.2, 0.1, p.x + Math.cos(ry) * s * 2, y, p.z - Math.sin(ry) * s * 2); }
    out.nets = (out.nets || []).concat([{ x: p.x, y: y + 1.2, z: p.z, ry }]);
  }
  // cabanas dos pescadores (pedra, junco e barro)
  for (let i = 0; i < 5; i++) {
    const a = 20 + i * 48 + rr(-6, 6), p = coastPoint(a, -46 - rr(0, 8)), y = terrainHeight(p.x, p.z), ry = tangent(a);
    hut(B, M, p.x, y, p.z, ry);
  }
  // barcos na água rasa (podem ser pilotados)
  { const p = coastPoint(52, 17); out.boats.push({ model: 'barco_remo', x: p.x, z: p.z, y: 0, ry: tangent(52) + 0.3, len: 4.2, board: true, pilot: true, name: 'barco a remo de Glauco' }); S.rowboat = new V3(p.x, 0, p.z); }
  { const p = coastPoint(96, 22); out.boats.push({ model: 'barco_pesca', x: p.x, z: p.z, y: 0, ry: tangent(96) - 0.4, len: 8, board: true, pilot: true, name: 'barco de pesca à vela' }); }
  { const p = coastPoint(40, -14); S.fisher = new V3(p.x, terrainHeight(p.x, p.z), p.z); }
  // naufrágio no fundo da baía: o costado de um navio mercante com as cavernas à mostra e ânforas espalhadas
  {
    const p = coastPoint(130, 62), y = terrainHeight(p.x, p.z), ry = tangent(130) + 0.5;
    for (let i = 0; i < 9; i++) { const t = -4 + i, c = Math.cos(ry), s2 = Math.sin(ry); B.box(M.darkWood, 0.18, 1.1 - Math.abs(t) * 0.08, 3.4 - Math.abs(t) * 0.25, p.x + c * t * 1.1, y - 0.2, p.z - s2 * t * 1.1, { ry, rz: 0.35 }); }
    for (let i = 0; i < 4; i++) B.box(M.darkWood, 9.5 - i, 0.12, 0.22, p.x, y + 0.15 + i * 0.25, p.z, { ry, rx: 0.4 });
    out.wreckAmphorae = [];
    for (let i = 0; i < 14; i++) { const a2 = rand() * 6.3, d = rr(0.5, 5); out.wreckAmphorae.push({ x: p.x + Math.cos(a2) * d, z: p.z + Math.sin(a2) * d, y: terrainHeight(p.x + Math.cos(a2) * d, p.z + Math.sin(a2) * d) + 0.15, rx: rr(1.2, 1.7), ry: rand() * 6 }); }
    S.wreck = new V3(p.x, y, p.z);
  }
  out.zones.praia = (() => { const a = coastPoint(-60, -60), b = coastPoint(280, 30); return [Math.min(a.x, b.x), Math.max(a.x, b.x), Math.min(a.z, b.z), Math.max(a.z, b.z)]; })();
  out.beach = { a0: -60, a1: 280 };
  void along;
}

function hut(B, M, x, y, z, ry) {
  B.box(M.socle, 4.6, 1.1, 3.8, x, y - 0.4, z, { ry });
  B.box(M.mudbrick, 4.4, 1.6, 3.6, x, y + 0.7, z, { ry });
  B.box(M.wood, 5.2, 0.35, 4.4, x, y + 2.3, z, { ry, rx: 0.08 });
  addBox(x, z, 4.6, 4.6, y, y + 2.5);
}
