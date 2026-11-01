// Óstia, o porto de Roma, na foz do Tibre (na realidade a ~25 km; aqui, encurtado): cais de pedra na beira do mar,
// os horrea (armazéns de trigo, que vinha do Egito e da África para alimentar um milhão de pessoas), o farol, navios
// mercantes atracados, uma galera de guerra passando ao largo e um barco a remo para quem quiser sair pelo mar.
import * as THREE from 'three';
import { addBox, addCircle } from '../comum/collision.js';
import { terrainHeight, coastPoint, coastC } from './terrain.js';
import { rr, rand } from '../comum/util.js';

const V3 = THREE.Vector3;

export function buildOstia(B, M, out) {
  const S = out.spots;
  // ao longo da costa: tangente e normal (para o mar)
  const tang = (a) => { const p = coastPoint(a - 1), q = coastPoint(a + 1); return Math.atan2(q.x - p.x, q.z - p.z); };
  // cais de pedra: blocos na beira, a sudeste da foz (Óstia ficava na margem esquerda)
  for (let a = -10; a <= 100; a += 6) {
    const p = coastPoint(a, 16), ry = tang(a), y = 0;
    B.box(M.travertine2, 6.4, 4.5, 8, p.x, -3.5, p.z, { ry }); // muralha do cais, já na água funda
    addBox(p.x, p.z, 7, 7, -4, 1.0);
    if (Math.round(a) % 18 === 0) { B.geo(new THREE.CylinderGeometry(0.25, 0.3, 0.8, 8), M.darkWood, p.x, 1.0 + 0.4, p.z); } // poste de amarração
    void y;
  }
  // três píeres de madeira ligando a praia ao cais
  for (const a of [5, 48, 92]) for (let o = -4; o < 14; o += 3) { const p = coastPoint(a, o); B.box(M.wood, 3.2, 0.3, 3.2, p.x, 0.65, p.z, { ry: tang(a) }); B.geo(new THREE.CylinderGeometry(0.15, 0.15, 3, 6), M.darkWood, p.x, -0.8, p.z); addBox(p.x, p.z, 3.2, 3.2, -2, 0.95); }
  // horrea: armazéns compridos de tijolo com pátio, em fila atrás do cais
  for (let i = 0; i < 4; i++) {
    const a = 5 + i * 28, p = coastPoint(a, -30), y = terrainHeight(p.x, p.z) - 0.3, ry = tang(a);
    B.box(M.brick, 22, 7, 14, p.x, y, p.z, { ry });
    B.geo(new THREE.ConeGeometry(14, 2.4, 4, 1, true).rotateY(Math.PI / 4).scale(1.1, 1, 0.72), M.tiles, p.x, y + 7 + 1.2, p.z, { ry, uv: { s: 2 } });
    for (let k = 0; k < 4; k++) B.box(M.dark, 2.4, 3.2, 0.1, p.x + Math.sin(ry) * (-8 + k * 5.4) + Math.cos(ry) * 7.05, y, p.z + Math.cos(ry) * (-8 + k * 5.4) - Math.sin(ry) * 7.05, { ry });
    addBox(p.x, p.z, 16, 16, y - 1, y + 7);
    out.exclusions.push([p.x - 16, p.x + 16, p.z - 16, p.z + 16]);
  }
  // ânforas empilhadas e fardos no cais
  for (let i = 0; i < 40; i++) { const a = rr(0, 90), p = coastPoint(a, rr(-12, -6)); B.geo(new THREE.CylinderGeometry(0.16, 0.08, 0.8, 8), M.plasterRed, p.x, terrainHeight(p.x, p.z) + 0.4, p.z, { rz: rand() < 0.4 ? Math.PI / 2 : 0, ry: rand() * 6 }); }
  // farol: torre de três andares no fim do quebra-mar, com o fogo no alto à noite
  {
    const p = coastPoint(-25, 40), y = -1;
    B.box(M.travertine, 12, 3, 12, p.x, y, p.z);
    for (const [w, h, y0] of [[9, 12, 2], [7, 9, 14], [5, 7, 23]]) B.box(M.travertine, w, h, w, p.x, y0, p.z);
    out.torches.push(new V3(p.x, 31, p.z));
    addBox(p.x, p.z, 12, 12, -6, 32);
    // quebra-mar ligando o farol ao cais
    const q = coastPoint(-17, 0);
    const n = 8; for (let k = 1; k < n; k++) { const t = k / n, x = q.x + (p.x - q.x) * t, z = q.z + (p.z - q.z) * t; B.box(M.travertine2, 6, 2, 6, x, -1.2, z); addBox(x, z, 6, 6, -2, 0.8); }
    S.lighthouse = new V3(p.x, 2, p.z);
  }
  // navios: mercantes atracados, uma galera de guerra passando, o barco a remo para o jogador
  for (let i = 0; i < 3; i++) { const a = 12 + i * 30, p = coastPoint(a, 27), ry = tang(a) - Math.PI / 2; out.boats.push({ model: 'mercante', x: p.x, z: p.z, ry, len: 19, moored: true }); }
  out.boats.push({ model: 'trirreme', route: { a0: -300, a1: 120, off: 120 }, len: 30, speed: 2.4, name: 'Concórdia' });
  { const p = coastPoint(96, 22); out.boats.push({ model: 'barco_remo', x: p.x, z: p.z, y: 0, ry: tang(96), len: 4.2, board: true, pilot: true, name: 'barco a remo' }); S.rowboat = new V3(p.x, 0, p.z); }
  const qq = coastPoint(45, -8); S.quay = new V3(qq.x, terrainHeight(qq.x, qq.z), qq.z);
  out.zones.ostia = [qq.x - 120, qq.x + 120, qq.z - 120, qq.z + 120];
  S.ostia = S.quay;
  void coastC; void addCircle;
}
