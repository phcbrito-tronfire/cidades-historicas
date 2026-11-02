// O Fórum de Trajano (inaugurado em 112 d.C., projeto de Apolodoro de Damasco): a praça de mármore com pórticos,
// a Basílica Úlpia atravessada no fundo, o pátio com as duas bibliotecas (grega e latina) e, entre elas, a Coluna de
// Trajano — 30 m de mármore, com a faixa em espiral contando as guerras da Dácia e a estátua do imperador no alto.
// Ao lado, os Mercados de Trajano: o grande meio-círculo de tijolo, em andares, com as lojas em arco.
import * as THREE from 'three';
import { addBox, addCircle } from '../comum/collision.js';
import { roofHalf, pedimentGeo } from '../atenas/arquitetura.js';
import { basilica, arch, corinthian } from './forum.js';
import { TRAJAN } from './terrain.js';

const V3 = THREE.Vector3;
const Y = 8.6 - 0.2;

// vão de arcada para as lojas dos Mercados
export function bay(w, h, ow) {
  const oh = h * 0.72, r = ow / 2, s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(-ow / 2, 0); s.lineTo(-ow / 2, oh - r); s.absarc(0, oh - r, r, Math.PI, 0, true); s.lineTo(ow / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: false, curveSegments: 8 }); g.translate(0, 0, -0.45); return g;
}

export function buildTrajan(B, M, out) {
  const S = out.spots, T = TRAJAN, cx = T.x;
  const zS = T.z + T.hd - 2, zN = -178; // a praça vai do arco de entrada (sul) até a basílica (norte)
  // ---- a praça: lajes de mármore branco
  for (let x = cx - 44; x < cx + 44; x += 11) for (let z = zN; z < zS; z += 11) B.box(M.marble, 11.05, 0.3, 11.05, x + 5.5, Y, z + 5.5); // 10 cm acima do chão (sem briga de profundidade)
  // ---- pórticos dos lados leste e oeste: colunas coríntias de mármore colorido e o telhado
  for (const s of [-1, 1]) {
    const xc = cx + s * 40;
    for (let z = zN + 3; z < zS - 2; z += 4.6) { for (const g of corinthian(9, 0.42)) B.geo(g, M.colMarble, xc, Y + 0.2, z, { uv: false }); addCircle(xc, z, 0.5, Y - 1, Y + 9); }
    B.box(M.marble, 1.6, 1.4, zS - zN, xc, Y + 9.2, (zN + zS) / 2); // entablamento
    B.box(M.marbleWall, 1.0, 10.6, zS - zN, xc + s * 6, Y, (zN + zS) / 2); addBox(xc + s * 6, (zN + zS) / 2, 1.0, zS - zN, Y - 1, Y + 10.6); // parede do fundo
    B.geo(roofHalf(zS - zN, 3.4, 1.2), M.tiles, xc + s * 3, Y + 10.6 + 1.2, (zN + zS) / 2, { ry: s > 0 ? -Math.PI / 2 : Math.PI / 2 });
  }
  // ---- a estátua de Trajano no meio da praça (pedestal; a estátua de bronze vem do modelo)
  { const z = (zN + zS) / 2 + 6; B.box(M.marbleWall, 4, 4.2, 6.5, cx, Y, z); B.box(M.marble, 4.6, 0.4, 7.1, cx, Y + 4.2, z); addBox(cx, z, 4.2, 6.7, Y - 1, Y + 4.6); out.trajanStatues = [new V3(cx, Y + 4.6, z)]; }
  // ---- arco de entrada, do lado do Fórum Romano
  arch(B, M, out, { id: 'arcoTrajano', x: cx, z: zS + 2, w: 15, h: 12, d: 4.4, ry: 0 });
  // ---- Basílica Úlpia: a maior de Roma, atravessada no fundo da praça
  basilica(B, M, out, { x: cx, z: zN - 13, L: 96, W: 26 });
  // ---- o pátio da coluna, com as duas bibliotecas (grega e latina) de frente uma para a outra
  const zc = zN - 13 - 13 - 14;
  for (const s of [-1, 1]) {
    const bx = cx + s * 15;
    B.box(M.brick, 12, 13, 20, bx, Y, zc); B.box(M.marbleWall, 0.3, 11, 16, bx - s * 6.05, Y, zc);
    for (let i = 0; i < 4; i++) { for (const g of corinthian(8, 0.36)) B.geo(g, M.colMarble, bx - s * 7.2, Y, zc - 6 + i * 4, { uv: false }); addCircle(bx - s * 7.2, zc - 6 + i * 4, 0.45, Y - 1, Y + 8); }
    B.box(M.marble, 2.4, 1, 18, bx - s * 6.6, Y + 8, zc);
    B.geo(pedimentGeo(20, 3, 12.4), M.tiles, bx, Y + 13, zc, { ry: Math.PI / 2 });
    addBox(bx, zc, 12, 20, Y - 1, Y + 13);
  }
  B.box(M.marble, 18, 0.3, 22, cx, Y - 0.1, zc); // piso do pátio
  // ---- a Coluna de Trajano: pedestal com a porta, fuste com a faixa em espiral (23 voltas), capitel e a estátua
  {
    const r = 1.85, H0 = 5.4, H = 26.6, x = cx, z = zc;
    B.box(M.marbleWall, 5.6, H0, 5.6, x, Y, z); B.box(M.marble, 6.0, 0.5, 6.0, x, Y, z); B.box(M.marble, 6.0, 0.6, 6.0, x, Y + H0 - 0.6, z);
    B.box(M.dark, 1.1, 2.2, 0.05, x, Y + 0.5, z + 2.83); // a porta da escada em caracol (185 degraus por dentro)
    for (const g of [new THREE.TorusGeometry(r + 0.15, 0.22, 8, 32)]) { g.rotateX(Math.PI / 2); B.geo(g, M.marble, x, Y + H0 + 0.2, z); } // coroa de louros da base
    B.geo(new THREE.CylinderGeometry(r * 0.94, r, H, 32), M.marble, x, Y + H0 + H / 2, z);
    // a faixa em espiral: dois frisos em hélice (as bordas da faixa de relevos)
    const pts = [], turns = 23, nP = turns * 22;
    for (let k = 0; k <= nP; k++) { const t = k / nP, a = t * turns * Math.PI * 2, rr = r * (1 - 0.06 * t) + 0.03; pts.push(new V3(Math.cos(a) * rr, t * H, Math.sin(a) * rr)); }
    const helix = new THREE.CatmullRomCurve3(pts), tube = new THREE.TubeGeometry(helix, nP, 0.07, 4, false);
    B.geo(tube, M.travertine, x, Y + H0, z, { uv: false });
    // os relevos: um "ruído" de figuras sugerido por pequenas saliências entre os frisos
    const relief = new THREE.TubeGeometry(helix, nP, 0.16, 3, false); relief.scale(1, 1, 1); relief.translate(0, H / turns / 2, 0);
    B.geo(relief, M.marbleWall, x, Y + H0, z, { uv: false });
    for (const g of corinthian(2.2, r * 0.8).slice(1)) B.geo(g, M.marble, x, Y + H0 + H - 2.2 + 0.3, z, { uv: false }); // capitel (dórico, aqui o ábaco)
    B.box(M.marble, 4.4, 0.8, 4.4, x, Y + H0 + H, z);
    B.geo(new THREE.CylinderGeometry(1.0, 1.2, 1.6, 16), M.marbleWall, x, Y + H0 + H + 0.8 + 0.8, z);
    addCircle(x, z, 3.2, Y - 1, Y + H0 + H);
    out.trajanStatues.push(new V3(x, Y + H0 + H + 2.4, z));
    S.trajanColumn = new V3(x, Y, z + 6);
  }
  // ---- Mercados de Trajano: meio-círculo de tijolo em três andares, aberto para a praça (lado leste)
  {
    const mx = cx + 52, mz = (zN + zS) / 2 - 4, R0 = 30;
    for (let lv = 0; lv < 3; lv++) {
      const R = R0 + lv * 5, h = 5, n = Math.round((Math.PI * R) / 4.4), w = (Math.PI * R) / n, geo = bay(w + 0.02, h, w * 0.55);
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i + 0.5) * (Math.PI / n), x = mx + Math.cos(a) * R, z = mz + Math.sin(a) * R;
        B.geo(geo, M.brick, x, Y + lv * h, z, { ry: -a - Math.PI / 2 });
        B.box(M.dark, w * 0.55, h * 0.6, 0.05, x + Math.cos(a) * 0.5, Y + lv * h, z + Math.sin(a) * 0.5, { ry: -a + Math.PI / 2 }); // fundo das lojas
        if (lv === 0) addCircle(x, z, 1.5, Y - 1, Y + 15);
      }
      B.geo(new THREE.CylinderGeometry(R + 0.6, R + 0.6, 0.4, 48, 1, true, 0, Math.PI), M.travertine, mx, Y + lv * h + h, mz);
    }
    B.geo(new THREE.CylinderGeometry(R0 + 0.5, R0 + 0.5, 0.3, 48, 1, false, 0, Math.PI), M.travertine2, mx, Y + 0.15, mz); // o chão calçado do hemiciclo
    // o terraço de cima com a cobertura de telhas, e o muro de fundo
    B.geo(new THREE.CylinderGeometry(R0 + 13, R0 + 13, 16, 48, 1, true, 0, Math.PI), M.brickY, mx, Y + 8, mz);
    out.exclusions.push([mx - 6, mx + R0 + 18, mz - R0 - 18, mz + R0 + 18]);
    S.trajanMarkets = new V3(mx + 6, Y, mz);
  }
  out.exclusions.push([T.x - T.hw - 4, T.x + T.hw + 4, T.z - T.hd - 4, T.z + T.hd + 4]);
  out.zones.trajano = [T.x - T.hw, T.x + T.hw + 50, T.z - T.hd, T.z + T.hd];
  S.trajan = new V3(cx, Y, (zN + zS) / 2);
}
