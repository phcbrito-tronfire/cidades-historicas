// O porto (inspirado no Pireu de Hipódamo: cais de pedra, galpões das trirremes, o empório) e a praia do Falero.
// Os barcos em si são modelos (main.js); aqui ficam o cais, os galpões, as cabanas, as redes e onde cada barco fica.
import * as THREE from 'three';
import { addBox } from '../comum/collision.js';
import { terrainHeight, coastPoint, along } from './terrain.js';
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
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    addBox(p.x, p.z, c * 6.2 + s * 14.4, s * 6.2 + c * 14.4, -5, QY);
    // cabeços de amarração
    if (Math.round(a) % 18 === 0) { const q = coastPoint(a + 3, -1.2); B.box(M.poros, 0.5, 0.7, 0.5, q.x, QY, q.z); addBox(q.x, q.z, 0.5, 0.5, QY, QY + 0.7); }
  }
  S.quay = (() => { const p = coastPoint(-230, -4); return new V3(p.x, QY, p.z); })();
  out.zones.porto = (() => { const a = coastPoint(-350, -60), b = coastPoint(-150, 20); return [Math.min(a.x, b.x), Math.max(a.x, b.x), Math.min(a.z, b.z), Math.max(a.z, b.z)]; })();
  // escada de pedra para descer à água
  { const p = coastPoint(-212, -1), ry = tangent(-212); for (let i = 0; i < 5; i++) { const q = coastPoint(-212, -1 + i * 0.9); B.box(M.quay, 3, QY - i * 0.35, 0.9, q.x, 0, q.z, { ry }); addBox(q.x, q.z, 3, 1, -1, QY - i * 0.35); } void p; }

  // ---------------- galpões das trirremes (neosoikoi): rampas cobertas que descem até a água
  for (let k = 0; k < 6; k++) {
    const a = -342 + k * 7.5, t = tangent(a);
    const p0 = coastPoint(a, -26), p1 = coastPoint(a, 4);
    const mx = (p0.x + p1.x) / 2, mz = (p0.z + p1.z) / 2, y0 = Math.max(0.2, terrainHeight(p0.x, p0.z));
    const tx = Math.cos(t), tz = -Math.sin(t); // ao longo da costa
    // duas fileiras de pilares de pedra e o telhado de telhas
    for (let i = 0; i < 6; i++) for (const sd of [-1, 1]) {
      const u = i / 5, cx = p0.x + (p1.x - p0.x) * u + tx * sd * 3.4, cz = p0.z + (p1.z - p0.z) * u + tz * sd * 3.4;
      const cy = Math.max(-0.5, terrainHeight(cx, cz));
      B.box(M.poros, 0.6, y0 + 6 - cy, 0.6, cx, cy, cz);
      addBox(cx, cz, 0.6, 0.6, cy - 1, y0 + 6);
    }
    B.box(M.tiles, 7.6, 0.3, 32, mx, y0 + 6, mz, { ry: t });
    // rampa de madeira por onde o casco desliza para a água
    B.box(M.wood, 3, 0.3, 31, mx, Math.min(y0, 0.4) - 0.9, mz, { ry: t, rx: -0.06 });
    if (k % 2 === 0) out.boats.push({ model: 'trirreme', x: mx, z: mz, y: 0.4, ry: t - Math.PI / 2, len: 34, docked: true, shed: true });
  }
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
