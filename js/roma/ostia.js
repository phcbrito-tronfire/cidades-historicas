// Óstia, o porto de Roma, na foz do Tibre (na realidade a ~25 km; aqui, encurtado): cais de pedra na beira do mar,
// os horrea (armazéns de trigo, que vinha do Egito e da África para alimentar um milhão de pessoas), o farol, navios
// navios atracados, a quadrirreme de patrulha passando ao largo e um barco a remo para quem quiser sair pelo mar.
import * as THREE from 'three';
import { addBox, addCircle } from '../comum/collision.js';
import { terrainHeight, coastPoint, coastC } from './terrain.js';
import { rr, rand } from '../comum/util.js';
import { insula } from './insulae.js';

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
  // horrea: os armazéns de dois andares, de tijolo, com o portal no meio e as lojas em arco (como os Horrea
  // Epagathiana, que ainda estão de pé em Óstia)
  for (let i = 0; i < 4; i++) {
    const a = 5 + i * 28, p = coastPoint(a, -30), ry = tang(a) + Math.PI / 2;
    insula(B, M, out, { x: p.x, z: p.z, w: 24, d: 15, ry, floors: 2, portico: i % 2 === 0, balcony: false, wall: i % 2 ? M.brick : M.brickY });
    out.exclusions.push([p.x - 16, p.x + 16, p.z - 16, p.z + 16]);
  }
  // ânforas empilhadas e fardos no cais
  for (let i = 0; i < 40; i++) { const a = rr(0, 90), p = coastPoint(a, rr(-12, -6)); B.geo(new THREE.CylinderGeometry(0.16, 0.08, 0.8, 8), M.plasterRed, p.x, terrainHeight(p.x, p.z) + 0.4, p.z, { rz: rand() < 0.4 ? Math.PI / 2 : 0, ry: rand() * 6 }); }
  // farol (como o de Portus, de Cláudio): base quadrada com nichos em arco, segundo andar recuado e a lanterna
  // redonda com o braseiro. Uma escada de pedra contorna a base até o terraço, de onde se vê o porto e o mar.
  {
    const p = coastPoint(-25, 40), x = p.x, z = p.z, L0 = 1.0, H1 = 13, H2 = 21, H3 = 26;
    B.box(M.travertine2, 16, L0 + 2, 16, x, -2, z); addBox(x, z, 16, 16, -3, L0); // plataforma no mar
    B.box(M.travertine, 10, H1 - L0, 10, x, L0, z); addBox(x, z, 10, 10, -3, H1);
    const bayG = (w, h) => { const ow = w * 0.5, oh = h * 0.7, r = ow / 2, sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(-ow / 2, 0); sh.lineTo(-ow / 2, oh - r); sh.absarc(0, oh - r, r, Math.PI, 0, true); sh.lineTo(ow / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h); sh.lineTo(-w / 2, h); sh.lineTo(-w / 2, 0); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false, curveSegments: 8 }); g.translate(0, 0, -0.2); return g; };
    const nich = bayG(10 / 3, 5), win = bayG(7 / 3, 4);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, fx = Math.sin(a), fz = Math.cos(a);
      for (let i = 0; i < 3; i++) { const u = -10 / 3 + i * 10 / 3, wx = x + fx * 5.2 + Math.cos(a) * u, wz = z + fz * 5.2 - Math.sin(a) * u;
        B.geo(nich, M.travertine, wx, H1 - 5.5, wz, { ry: a }); B.box(M.dark, 1.5, 2.6, 0.05, wx - fx * 0.15, H1 - 5.5, wz - fz * 0.15, { ry: a }); }
      for (let i = 0; i < 3; i++) { const u = -7 / 3 + i * 7 / 3, wx = x + fx * 3.7 + Math.cos(a) * u, wz = z + fz * 3.7 - Math.sin(a) * u;
        B.geo(win, M.travertine, wx, H2 - 4.5, wz, { ry: a }); B.box(M.dark, 1.0, 2.2, 0.05, wx - fx * 0.15, H2 - 4.5, wz - fz * 0.15, { ry: a }); } }
    B.box(M.marble, 11, 0.5, 11, x, H1 - 0.5, z); // cornija do primeiro andar
    // segundo andar oco: paredes de 0,8 m, a porta virada para o sul (para o terraço da escada de fora) e, por dentro,
    // a escada em quatro lances junto às paredes até o alto (o mirante, em volta da lanterna)
    { const T = 0.8, hw = 3.5, h = H2 - H1;
      for (const [cx, cz, w, d] of [[hw - T / 2, 0, T, 7], [-hw + T / 2, 0, T, 7], [0, -hw + T / 2, 7, T]]) { B.box(M.travertine, w, h, d, x + cx, H1, z + cz); addBox(x + cx, z + cz, w, d, H1 - 1, H2); }
      for (const sx of [-1, 1]) { const w = (7 - 1.8) / 2; B.box(M.travertine, w, h, T, x + sx * (0.9 + w / 2), H1, z + hw - T / 2); addBox(x + sx * (0.9 + w / 2), z + hw - T / 2, w, T, H1 - 1, H2); }
      B.box(M.travertine, 1.8, h - 2.8, T, x, H1 + 2.8, z + hw - T / 2); // verga da porta
      const inn = hw - T, c = inn - 0.6, nS = 8, rise = h / (nS * 4), run = (2 * c) / nS;
      // quatro lances, um por parede, com um patamar quadrado em cada canto (sem degraus desencontrados nas quinas)
      const cor = [[c, c], [c, -c], [-c, -c], [-c, c]], land = 1.2, runL = 2 * c - land, stepL = runL / nS;
      for (let k = 0; k < 4; k++) {
        const [ax, az] = cor[k], [bx, bz] = cor[(k + 1) % 4], ux = Math.sign(bx - ax), uz = Math.sign(bz - az), alongX = ux !== 0;
        for (let i = 0; i < nS; i++) {
          const d0 = land / 2 + (i + 0.5) * stepL, sx2 = ax + ux * d0, sz2 = az + uz * d0, top = H1 + rise * (k * nS + i + 1);
          const w = alongX ? stepL + 0.02 : land, d = alongX ? land : stepL + 0.02;
          B.box(M.travertine2, w, 0.25, d, x + sx2, top - 0.25, z + sz2); addBox(x + sx2, z + sz2, w, d, top - 0.3, top);
        }
        const top = H1 + rise * (k + 1) * nS; B.box(M.travertine2, land, 0.25, land, x + bx, top - 0.25, z + bz); addBox(x + bx, z + bz, land, land, top - 0.3, top); // patamar
      }
      // o piso do mirante, com o vão da escada no canto sudeste, e a mureta em volta
      // o vão da escada em L, sobre os dois últimos lances (paredes oeste e sul), com guarda-corpo na borda
      B.box(M.marble, 5, 0.3, 5, x + 1, H2 - 0.3, z - 1); addBox(x + 1, z - 1, 5, 5, H2 - 0.3, H2);
      B.box(M.travertine2, 2.7, 0.9, 0.12, x - 0.15, H2, z + 1.5); addBox(x - 0.15, z + 1.5, 2.7, 0.2, H2 - 0.2, H2 + 0.9);
      B.box(M.travertine2, 0.12, 0.9, 5, x - 1.5, H2, z - 1); addBox(x - 1.5, z - 1, 0.2, 5, H2 - 0.2, H2 + 0.9);
      for (const [cx, cz, w, d] of [[0, 3.65, 7.6, 0.3], [0, -3.65, 7.6, 0.3], [3.65, 0, 0.3, 7.6], [-3.65, 0, 0.3, 7.6]]) { B.box(M.marble, w, 1.0, d, x + cx, H2, z + cz); addBox(x + cx, z + cz, w, d, H2 - 0.5, H2 + 1.1); }
      B.box(M.marble, 7.8, 0.4, 7.8, x, H2 - 0.75, z); // cornija
      out.lights.push({ pos: new V3(x, H1 + 3, z), color: 0xffb060, intensity: 6, dist: 14 }); // luz quente da escada
    }
    // a lanterna: anel de colunas, telhado cônico e o braseiro aceso
    B.geo(new THREE.CylinderGeometry(1.25, 1.35, H3 - H2, 16), M.travertine2, x, (H2 + H3) / 2, z); addCircle(x, z, 1.4, H2 - 0.1, H3); // (começa um pouco acima do piso: quem sobe o último lance passa rente ao tambor)
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; B.geo(new THREE.CylinderGeometry(0.16, 0.18, H3 - H2, 8), M.marble, x + Math.cos(a) * 1.5, (H2 + H3) / 2, z + Math.sin(a) * 1.5); }
    B.geo(new THREE.ConeGeometry(2.0, 1.6, 16), M.bronze, x, H3 + 0.8, z);
    B.geo(new THREE.CylinderGeometry(0.9, 0.5, 0.8, 12), M.bronze, x, H3 + 2.6, z);
    for (const [dx, dz] of [[0, 0], [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) out.torches.push(new V3(x + dx, H3 + 3.2, z + dz)); // o fogo do braseiro
    out.lights.push({ pos: new V3(x, H3 + 3.6, z), color: 0xffa040, intensity: 90, dist: 260, night: true }); // ilumina o porto e o mar à noite
    // a escada em volta da base (4 lances, um por lado) e a mureta do terraço
    const ring = 5.75, steps = 10, rise = (H1 - L0) / (steps * 4);
    for (let k = 0; k < 4; k++) for (let i = 0; i < steps; i++) {
      const n = k * steps + i + 1, top = L0 + rise * n, t = -5 + (i + 0.5);
      const [sx, sz] = [[t, ring], [ring, -t], [-t, -ring], [-ring, t]][k];
      B.box(M.travertine2, k % 2 ? 1.5 : 1.0, top - L0 + 0.02, k % 2 ? 1.0 : 1.5, x + sx, L0, z + sz);
      addBox(x + sx, z + sz, k % 2 ? 1.5 : 1.0, k % 2 ? 1.0 : 1.5, -3, top);
    }
    for (const [mx, mz, w, d] of [[0, 4.95, 10, 0.3], [4.95, 0, 0.3, 10], [0, -4.95, 10, 0.3]]) { B.box(M.travertine, w, 0.9, d, x + mx, H1, z + mz); addBox(x + mx, z + mz, w, d, H1 - 1, H1 + 0.9); }
    // quebra-mar ligando o farol ao cais
    const q = coastPoint(-17, 0);
    const nq = 8; for (let k = 1; k < nq; k++) { const t = k / nq, bx = q.x + (x - q.x) * t, bz = q.z + (z - q.z) * t; B.box(M.travertine2, 6, 2, 6, bx, -1.2, bz); addBox(bx, bz, 6, 6, -2, 0.8); }
    S.lighthouse = new V3(x, L0, z + 8);
    S.lighthouseTop = new V3(x - 3.5, H1, z); S.lighthouseView = new V3(x + 2.8, H2, z - 1);
  }
  // navios: a quadrirreme de patrulha ao largo e o barco a remo para o jogador (os grandes ficam no Portus)
  out.boats.push({ model: 'quadrirreme', route: { a0: -320, a1: 140, off: 130 }, len: 30, speed: 2.4, name: 'Fortuna' }); // a quadrirreme de patrulha ao largo
  { const p = coastPoint(96, 22); out.boats.push({ model: 'barco_remo', x: p.x, z: p.z, y: 0, ry: tang(96), len: 4.2, board: true, pilot: true, name: 'barco a remo' }); S.rowboat = new V3(p.x, 0, p.z); }
  const qq = coastPoint(45, -8); S.quay = new V3(qq.x, terrainHeight(qq.x, qq.z), qq.z);
  out.zones.ostia = [qq.x - 120, qq.x + 120, qq.z - 120, qq.z + 120];
  S.ostia = S.quay;
  void coastC; void addCircle;
}
