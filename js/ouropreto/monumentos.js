// Os prédios grandes de Vila Rica em 1789, feitos em código (ver docs/PLANO-OURO-PRETO.md, "O que existia"):
// - as igrejas no tipo mineiro: nave e capela-mor de paredes grossas caiadas, cunhais e cimalhas de cantaria,
//   frontispício com a portada, as janelas do coro e o frontão de volutas, e as duas torres com as sineiras;
//   Matriz do Pilar, Matriz de Antônio Dias, Carmo (torres redondas) e Santa Efigênia, prontas;
// - a Igreja do Rosário dos Pretos, de planta elíptica, EM OBRA (frontispício de 1784; as paredes subindo);
// - o Palácio dos Governadores, que parece uma fortaleza: muralha com guaritas nas quinas e o portão;
// - a Casa de Câmara e Cadeia, EM OBRA desde 1785 (o térreo de cantaria subindo, andaimes e o guindaste de madeira);
// - a Casa dos Contos (1782–84) e a Casa da Ópera (1770) entram como casas grandes (casas.js);
// - o pelourinho junto da Câmara, os chafarizes dos Contos e de Antônio Dias, e os muros de arrimo dos adros.
import * as THREE from 'three';
import { stillWater } from '../comum/aguaparada.js';
import { addBox, addCircle } from '../comum/collision.js';
import { frame, roofGeo, moldura } from './kit.js';
import { casa } from './casas.js';
import { igrejaInterior, interiorMaterials, teatro } from './interiores.js';
import { contosInterior, palacioInterior } from './nobres.js';
import { terrainHeight, PLACES, STREETS, RESERVED, polyDist } from './terrain.js';

const V2 = THREE.Vector2;
const lathe = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([r, y]) => new V2(r, y)), seg);

// ---------------- os muros de arrimo dos adros ----------------
// O adro é um plano de borda firme cortado no morro. Onde o chão de fora cai, um bloco de alvenaria de pedra segura o
// aterro (com a mureta de parapeito quando a queda passa de 1 m); onde o morro sobe, um muro segura o barranco. Nas
// entradas das ruas, nada (a rua entra no adro).
export function adroWalls(B, M, out) {
  for (const [id, P] of Object.entries(PLACES)) {
    if (!P.adro) continue;
    const hw = P.w / 2, hd = P.d / 2, SEG = 2;
    const edges = [[[-hw, -hd], [hw, -hd], [0, -1]], [[hw, -hd], [hw, hd], [1, 0]], [[hw, hd], [-hw, hd], [0, 1]], [[-hw, hd], [-hw, -hd], [-1, 0]]];
    for (const [[ax, az], [bx, bz], [nx, nz]] of edges) {
      const L = Math.hypot(bx - ax, bz - az), n = Math.round(L / SEG);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, lx = ax + (bx - ax) * t, lz = az + (bz - az) * t, x = P.x + lx, z = P.z + lz;
        if (Object.values(STREETS).some((S) => polyDist(S.pts, x + nx * 1.5, z + nz * 1.5).d < S.hw + 1.2)) continue; // (a rua entra no adro)
        if ((id === 'palacio' && nz > 0) || (id === 'camara' && nz < 0)) continue; // (a frente do Palácio é a muralha; a da Câmara dá para a praça)
        if ((P.stairs || []).some((st) => Math.hypot(x - st.x, z - st.z) < st.w / 2 + 1.2)) continue; // (a boca da escadaria)
        const out1 = terrainHeight(x + nx * 2.6, z + nz * 2.6), seg = L / n, along = Math.abs(bx - ax) > Math.abs(bz - az);
        const w = along ? seg + 0.02 : 2.2, d = along ? 2.2 : seg + 0.02, cx = x + nx * 1.1, cz = z + nz * 1.1;
        if (out1 < P.y - 0.45) { // o aterro: bloco de pedra até o chão de fora
          const bot = Math.min(out1, terrainHeight(cx, cz)) - 0.4;
          B.box(M.pedra, w, P.y - bot, d, cx, bot, cz, { noGround: true });
          B.box(M.cantaria, along ? seg + 0.02 : 0.5, 0.12, along ? 0.5 : seg + 0.02, x + nx * 2.0, P.y - 0.02, z + nz * 2.0, { noGround: true }); // (a capa de cantaria na beira)
          addBox(cx, cz, w, d, bot, P.y);
          if (P.y - out1 > 1.0) { B.box(M.cal, along ? seg + 0.02 : 0.3, 0.8, along ? 0.3 : seg + 0.02, x + nx * 2.05, P.y + 0.1, z + nz * 2.05, { noGround: true }); B.box(M.cantaria, along ? seg + 0.02 : 0.4, 0.1, along ? 0.4 : seg + 0.02, x + nx * 2.05, P.y + 0.9, z + nz * 2.05, { noGround: true }); addBox(x + nx * 2.05, z + nz * 2.05, along ? seg : 0.3, along ? 0.3 : seg, P.y, P.y + 1.0); }
        } else if (out1 > P.y + 0.7) { // o corte: muro segurando o barranco
          const top = out1 + 0.15, wx = x + nx * 0.25, wz = z + nz * 0.25;
          B.box(M.pedra, along ? seg + 0.02 : 0.6, top - P.y + 0.3, along ? 0.6 : seg + 0.02, wx, P.y - 0.3, wz, { noGround: true });
          addBox(wx, wz, along ? seg : 0.6, along ? 0.6 : seg, P.y - 1, top);
        }
      }
    }
  }
}

// ---------------- escadaria de cantaria descendo de um adro até o largo de baixo, com as muretas dos lados ----------------
function escadaria(B, M, P, st) {
  const yTop = P.y, yBot = PLACES[st.to] ? PLACES[st.to].y : terrainHeight(st.x + st.dir[0] * 4, st.z + st.dir[1] * 4);
  const rise = yTop - yBot, n = Math.max(2, Math.round(rise / 0.17)), run = 0.36, ry = Math.atan2(st.dir[0], st.dir[1]);
  const f = frame(B, st.x, yTop, st.z, ry); // (quadro local: +z é a descida)
  let low = yBot; for (let k = 0; k <= n; k++) for (const sx of [-1, 0, 1]) low = Math.min(low, terrainHeight(...f.W(sx * (st.w / 2 + 0.6), run * k))); const dep = yTop - low + 0.3; // (os degraus descem até o chão mais baixo debaixo deles: nenhum fica no ar)
  for (let k = 0; k < n; k++) { const top = -(rise / n) * k, z = run * (k + 0.5); f.box(M.cantaria, st.w, top + dep, run + 0.02, 0, -dep, z, { noGround: true }); f.solid(0, z, st.w, run, -dep - 0.5, top, true); }
  for (const sx of [-1, 1]) { f.box(M.pedra, 0.6, dep + 0.9, run * n + 0.4, sx * (st.w / 2 + 0.3), -dep, run * n / 2, { noGround: true }); f.box(M.cantaria, 0.75, 0.12, run * n + 0.5, sx * (st.w / 2 + 0.3), 0.9, run * n / 2, { noGround: true }); f.solid(sx * (st.w / 2 + 0.3), run * n / 2, 0.6, run * n + 0.4, -rise - 1, 1.0); }
}

// ---------------- andaime: paus roliços amarrados, as travessas e as tábuas ----------------
export function andaime(f, M, x0, x1, z, y0, y1, prof = 1.4) {
  const poles = []; for (let x = x0; x <= x1 + 0.01; x += 2.2) poles.push(x);
  for (const x of poles) for (const dz of [0, prof]) f.geo(new THREE.CylinderGeometry(0.06, 0.08, y1 - y0 + 1, 6), M.pau, x, y0 + (y1 - y0 + 1) / 2, z + dz, { uv: false });
  for (let y = y0 + 2; y <= y1; y += 2) {
    for (const dz of [0, prof]) f.geo(new THREE.CylinderGeometry(0.05, 0.05, x1 - x0, 5), M.pau, (x0 + x1) / 2, y, z + dz, { rz: Math.PI / 2, uv: false });
    for (const x of poles) f.geo(new THREE.CylinderGeometry(0.045, 0.045, prof + 0.3, 5), M.pau, x, y + 0.08, z + prof / 2, { rx: Math.PI / 2, uv: false });
    f.box(M.tabua, x1 - x0, 0.05, prof - 0.1, (x0 + x1) / 2, y + 0.13, z + prof / 2, { noGround: true });
  }
  for (let i = 0; i < poles.length - 1; i += 2) { const xa = poles[i], xb = poles[i + 1], L = Math.hypot(xb - xa, Math.min(4, y1 - y0)); f.geo(new THREE.CylinderGeometry(0.04, 0.04, L, 5), M.pau, (xa + xb) / 2, y0 + Math.min(4, y1 - y0) / 2 + 0.5, z - 0.08, { rz: -Math.atan2(Math.min(4, y1 - y0), xb - xa) + Math.PI / 2, uv: false }); } // (as diagonais que travam)
}

// ---------------- a igreja mineira ----------------
// o: { x, z, ry, y (piso), nW, nL, cW, cL, Hn, Hc, torres: 'quadrada'|'redonda', tS, tH, cor (pintura da porta) }
// Quadro local: a fachada olha para +z; a nave vai para -z e a capela-mor fica atrás dela.
export function igreja(B, M, out, o) {
  const f = frame(B, o.x, o.y, o.z, o.ry), { nW, nL, cW, cL, Hn, Hc, tS, tH } = o, T = 1.0, zF = (nL + cL) / 2, zN = zF - nL, zC = zN - cL;
  const pt = M.paint[o.cor || 'madeira'];
  const W0 = f.W;
  // embasamento de pedra (do ponto mais baixo do chão até o piso) e o piso
  let low = Infinity; for (const [lx, lz] of [[-nW / 2 - tS, zF], [nW / 2 + tS, zF], [-nW / 2, zC], [nW / 2, zC], [0, zN], [-cW / 2 - 5, zC], [cW / 2 + 5, zC]]) low = Math.min(low, terrainHeight(...W0(lx, lz)));
  const base = (w, d, cx, cz) => { f.box(M.pedra, w, o.y - low + 0.4 - 0.14, d, cx, low - o.y - 0.4, cz, { noGround: true }); f.solid(cx, cz, w, d, low - o.y - 0.4, 0.0, true); }; // (o topo da pedra abaixo do soalho)
  base(nW + 2 * tS - 1.6, nL, 0, zF - nL / 2); base(cW, cL, 0, zN - cL / 2); base(5.5, cL - 1, (cW / 2 + 2.75) * (o.sacristia || 1), zN - cL / 2);
  out.press.push({ ...(() => { const [x, z] = W0(0, (zF + zC) / 2); return { x, z }; })(), w: nW + 2 * tS, d: nL + cL, ry: o.ry, top: o.y });
  // os degraus da frente (três degraus de cantaria largos, diante da portada)
  for (let k = 0; k < 3; k++) { f.box(M.cantaria, 6.5 - k * 0.6, 0.17 * (k + 1), 0.45, 0, -0.51, zF + 1.35 - k * 0.45); f.solid(0, zF + 1.35 - k * 0.45, 6.5 - k * 0.6, 0.45, -1, -0.51 + 0.17 * (k + 1), true); }
  f.box(M.cantaria, nW + 0.4, 0.45, 2.2, 0, -0.45, zF + 0.6); // (o patamar diante da porta)
  // ---- a nave: paredes grossas, janelas altas dos lados e a porta lateral
  const side = (sx) => f.wall(M.cal, sx * (nW / 2 - T / 2), zN, sx * (nW / 2 - T / 2), zF - tS + 0.5, Hn, T, [[nL * 0.32, 1.5, 2.6, Hn - 4.6], [nL * 0.62, 1.5, 2.6, Hn - 4.6], [nL * 0.82, 2.0, 3.6, 0]]);
  side(-1); side(1);
  for (const sx of [-1, 1]) for (const [zz, w, h, sill] of [[zN + nL * 0.32, 1.5, 2.6, Hn - 4.6], [zN + nL * 0.62, 1.5, 2.6, Hn - 4.6], [zN + nL * 0.82, 2.0, 3.6, 0]]) {
    const xf = sx * nW / 2;
    f.box(M.cantaria, 0.12, h + 0.3, 0.22, xf + sx * 0.05, sill - 0.15, zz - w / 2 - 0.11, { noGround: true }); f.box(M.cantaria, 0.12, h + 0.3, 0.22, xf + sx * 0.05, sill - 0.15, zz + w / 2 + 0.11, { noGround: true }); f.box(M.cantaria, 0.14, 0.3, w + 0.44, xf + sx * 0.06, sill + h, zz, { noGround: true });
    f.box(sill > 0 ? pt.shutter : pt.door, 0.06, h, w, xf - sx * 0.3, sill, zz, { noGround: true });
  }
  // ---- a capela-mor (mais estreita e mais baixa) e a sacristia ao lado
  for (const sx of [-1, 1]) f.wall(M.cal, sx * (cW / 2 - T / 2), zC, sx * (cW / 2 - T / 2), zN + 0.02, Hc, T, [[cL * 0.5, 1.2, 2.2, Hc - 4.2]]);
  f.wall(M.cal, -cW / 2, zC + T / 2, cW / 2, zC + T / 2, Hc, T);
  f.wall(M.cal, -nW / 2 + T, zN + T / 2, nW / 2 - T, zN + T / 2, Hn, T, [[nW / 2 - T, cW - 2 * T, Hc - 2.4, 0]]); // a parede do arco-cruzeiro, com o arco aberto para a capela-mor (por fora, o oitão da nave sobre a capela)
  { const ss = o.sacristia || 1, sx0 = ss * (cW / 2), sx1 = ss * (cW / 2 + 5.5); f.wall(M.cal, sx1 - ss * 0.35, zC + 0.5, sx1 - ss * 0.35, zN, 5.2, 0.7, [[cL * 0.4, 1.0, 1.3, 1.6]]); f.wall(M.cal, sx0, zC + 0.85, sx1, zC + 0.85, 5.2, 0.7); f.wall(M.cal, sx0, zN - 0.35, sx1, zN - 0.35, 5.2, 0.7);
    f.geo(roofGeo(cL - 0.2, 6.6, 2.4, { thick: 0.16 }), M.telhaVelha, (sx0 + sx1) / 2, 5.0, zN - cL / 2 + 0.2, { ry: Math.PI / 2, uv: false }); }
  // cunhais e cimalha de cantaria
  for (const [x, z, h] of [[-nW / 2, zN, Hn], [nW / 2, zN, Hn], [-cW / 2, zC, Hc], [cW / 2, zC, Hc]]) f.box(M.cantaria, 0.55, h, 0.55, x, 0, z, { noGround: true });
  for (const sx of [-1, 1]) { f.box(M.cantaria, 0.5, 0.45, nL - tS + 0.6, sx * (nW / 2 + 0.05), Hn - 0.45, zN + (nL - tS + 0.6) / 2, { noGround: true }); f.box(M.cantaria, 0.5, 0.4, cL, sx * (cW / 2 + 0.05), Hc - 0.4, zN - cL / 2, { noGround: true }); }
  // os telhados (a cumeeira ao longo da nave)
  const Hr = (nW / 2 + 0.9) * 0.62, Hrc = (cW / 2 + 0.8) * 0.62;
  f.geo(roofGeo(nL - tS + 0.6, nW + 1.8, Hr, { thick: 0.2 }), M.telha, 0, Hn + 0.05, zN + (nL - tS + 0.6) / 2, { ry: Math.PI / 2, uv: false });
  f.geo(roofGeo(cL + 0.6, cW + 1.6, Hrc, { thick: 0.2 }), M.telha, 0, Hc + 0.05, zN - cL / 2 - 0.1, { ry: Math.PI / 2, uv: false });
  // os oitões: o de trás da capela e o da nave sobre o telhado da capela
  const gab = (W2, H2) => { const s = new THREE.Shape(); s.moveTo(-W2 / 2, 0); s.lineTo(0, H2); s.lineTo(W2 / 2, 0); s.lineTo(-W2 / 2, 0); return s; };
  { const g = new THREE.ExtrudeGeometry(gab(cW, Hrc * 0.92), { depth: T, bevelEnabled: false }); f.geo(g, M.cal, 0, Hc, zC); }
  { const g = new THREE.ExtrudeGeometry(gab(nW, Hr * 0.92), { depth: T, bevelEnabled: false }); f.geo(g, M.cal, 0, Hn, zN); }
  // ---- o frontispício: a parede da frente, a portada, as janelas do coro, o óculo e o frontão de volutas
  const fz = zF - T / 2, coroY = Hn * 0.55;
  f.wall(M.cal, -nW / 2 + 0.3, fz, nW / 2 - 0.3, fz, Hn, T, [[nW / 2 - 0.3, 2.6, 5.0, 0]]);
  // a portada: moldura larga de cantaria, a verga com a cartela e o frontãozinho por cima (no Pilar e em Antônio Dias, de pedra-sabão)
  for (const sx of [-1, 1]) f.box(pt.door, 1.3, 5.0, 0.1, sx * 1.95, 0, zF - T - 0.08, { noGround: true }); // (as duas folhas da porta abertas, encostadas na parede de dentro: a igreja fica aberta de dia)
  igrejaInterior(f, M, out, { nW, nL, cW, cL, Hn, Hc, T, zF, zN, zC }, o);
  f.box(M.cantaria, 0.5, 5.6, 0.32, -1.55, 0, zF + 0.06, { noGround: true }); f.box(M.cantaria, 0.5, 5.6, 0.32, 1.55, 0, zF + 0.06, { noGround: true });
  f.box(M.cantaria, 3.6, 0.5, 0.36, 0, 5.1, zF + 0.08, { noGround: true });
  f.box(M.sabao, 1.4, 1.2, 0.2, 0, 5.6, zF + 0.12, { noGround: true }); // a cartela (o medalhão sobre a porta)
  { const s = new THREE.Shape(); s.moveTo(-2.0, 0); s.quadraticCurveTo(-1.2, 1.1, 0, 1.25); s.quadraticCurveTo(1.2, 1.1, 2.0, 0); s.lineTo(-2.0, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: false }); f.geo(g, M.cantaria, 0, 6.8, zF - 0.1); }
  // as janelas do coro (duas, com a sacadinha de balaústres) e o óculo no meio
  for (const sx of [-1, 1]) { const cx = sx * nW * 0.24; f.box(M.escuro, 1.3, 2.6, 0.1, cx, coroY + 1.6, zF - 0.02, { noGround: true }); moldura(f, M.cantaria, cx, coroY + 1.6, 1.3, 2.6, zF - 0.05, { larg: 0.24, verga: 0.3 }); f.box(pt.shutter, 1.3, 2.6, 0.06, cx, coroY + 1.6, zF - 0.16, { noGround: true });
    f.box(M.cantaria, 1.9, 0.16, 0.6, cx, coroY + 1.45, zF + 0.3, { noGround: true }); for (let k = 0; k < 7; k++) f.box(M.cantaria, 0.1, 0.8, 0.1, cx - 0.75 + k * 0.25, coroY + 1.61, zF + 0.52, { noGround: true }); f.box(M.cantaria, 1.9, 0.1, 0.16, cx, coroY + 2.41, zF + 0.52, { noGround: true }); }
  { const g = new THREE.TorusGeometry(0.75, 0.16, 6, 20); f.geo(g, M.cantaria, 0, Hn - 1.6, zF + 0.05, { uv: false }); f.geo(new THREE.CircleGeometry(0.72, 20), M.escuro, 0, Hn - 1.6, zF - 0.02, { uv: false }); }
  // a cimalha que corre a fachada e as torres, e as pilastras de cantaria
  f.box(M.cantaria, nW + 2 * tS - 1.2, 0.55, 0.6, 0, Hn - 0.55, zF + 0.1, { noGround: true });
  for (const sx of [-1, 1]) f.box(M.cantaria, 0.6, Hn - 0.55, 0.45, sx * (nW / 2 - 0.35), 0, zF + 0.05, { noGround: true });
  // o frontão: a parede sobe em curvas e contracurvas (as volutas) até o nicho e a cruz
  { const w = nW - 0.6, s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-w / 2, 0.6); s.bezierCurveTo(-w / 2 + 0.4, 2.2, -w * 0.22, 1.2, -w * 0.18, 3.4); s.bezierCurveTo(-w * 0.12, 4.6, -0.8, 4.3, -0.6, 5.0); s.lineTo(0.6, 5.0); s.bezierCurveTo(0.8, 4.3, w * 0.12, 4.6, w * 0.18, 3.4); s.bezierCurveTo(w * 0.22, 1.2, w / 2 - 0.4, 2.2, w / 2, 0.6); s.lineTo(w / 2, 0); s.lineTo(-w / 2, 0);
    f.geo(new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 10 }), M.cal, 0, Hn, zF - T);
    const edge = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.16, bevelSegments: 1, curveSegments: 10 }); f.geo(edge, M.cantaria, 0, Hn + 0.02, zF - 0.3); // (a moldura de cantaria: a mesma forma, um pouco maior, logo atrás da face caiada — aparece só a beirada)
    f.box(M.escuro, 0.9, 1.4, 0.2, 0, Hn + 2.3, zF + 0.1, { noGround: true }); f.box(M.sabao, 0.5, 1.0, 0.25, 0, Hn + 2.4, zF + 0.05, { noGround: true }); // o nicho com a imagem do orago, de pedra-sabão
    f.box(M.cantaria, 0.7, 0.6, 0.7, 0, Hn + 5.0, zF - T / 2, { noGround: true }); f.box(M.ferro, 0.12, 1.8, 0.12, 0, Hn + 5.6, zF - T / 2, { noGround: true }); f.box(M.ferro, 0.9, 0.12, 0.12, 0, Hn + 6.7, zF - T / 2, { noGround: true }); }
  // ---- as torres
  for (const sx of [-1, 1]) torre(f, M, o, sx * (nW / 2 + tS / 2 - 0.8), zF - tS / 2 + 0.3);
  const [dx, dz] = W0(0, zF + 2.6);
  out.churches.push({ id: o.id, x: o.x, z: o.z, ry: o.ry, y: o.y, door: [dx, dz] });
  return f;
}
function torre(f, M, o, cx, cz) {
  const { tS, tH, Hn } = o, bel = tH - 7.0; // a altura da sineira
  if (o.torres === 'redonda') {
    const r = tS / 2;
    f.geo(new THREE.CylinderGeometry(r, r, bel, 24), M.cal, cx, bel / 2, cz, { uv: { s: 3 } });
    f.geo(new THREE.CylinderGeometry(r + 0.18, r + 0.18, 0.5, 24), M.cantaria, cx, Hn - 0.25, cz, { uv: false });
    f.geo(new THREE.CylinderGeometry(r - 0.05, r - 0.05, 0.25, 24), M.cantaria, cx, bel + 0.12, cz, { uv: false }); f.geo(new THREE.CylinderGeometry(r - 0.05, r - 0.05, 0.2, 24), M.forro, cx, bel + 4.1, cz, { uv: false }); // (o piso e o teto da sineira, aberta entre os pilares)

    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; f.geo(new THREE.CylinderGeometry(0.32, 0.32, 4.2, 8), M.cantaria, cx + Math.cos(a) * (r - 0.15), bel + 2.1, cz + Math.sin(a) * (r - 0.15), { uv: false }); } // (os pilares entre os vãos dos sinos)
    f.geo(new THREE.CylinderGeometry(r + 0.25, r + 0.15, 0.55, 24), M.cantaria, cx, bel + 4.4, cz, { uv: false });
    f.geo(lathe([[0, 0], [r + 0.1, 0], [r * 0.95, 1.0], [r * 0.7, 2.0], [r * 0.3, 2.8], [0.22, 3.2], [0.0, 3.3]]), M.telhaVelha, cx, bel + 4.66, cz, { uv: false }); // a cúpula (coruchéu) de telha, assentada na cornija
  } else {
    f.box(M.cal, tS, bel, tS, cx, 0, cz);
    for (const [ex, ez] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) f.box(M.cantaria, 0.5, tH - 2.2, 0.5, cx + ex * (tS / 2 - 0.2), 0, cz + ez * (tS / 2 - 0.2), { noGround: true });
    f.box(M.cantaria, tS + 0.4, 0.45, tS + 0.4, cx, Hn - 0.45, cz, { noGround: true });
    // a sineira: quatro pilares de quina e os vãos de arco, o escuro dentro e o sino
    const pw = 0.85, ow = tS - 2 * pw; // (os pilares de quina e o vão de cada face)
    for (const [ex, ez] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) f.box(M.cal, pw, 4.0, pw, cx + ex * (tS / 2 - pw / 2), bel, cz + ez * (tS / 2 - pw / 2), { noGround: true });
    for (const [ax, az] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const px = cx + ax * (tS / 2 - 0.3), pz = cz + az * (tS / 2 - 0.3);
      f.box(M.cal, ax ? 0.6 : ow, 0.9, az ? 0.6 : ow, px, bel + 3.1, pz, { noGround: true }); // (o tímpano sobre o arco)
      f.geo(new THREE.TorusGeometry(ow / 2, 0.14, 5, 14, Math.PI), M.cantaria, px + ax * 0.32, bel + 3.1, pz + az * 0.32, { ry: ax ? Math.PI / 2 : 0, uv: false });
      f.box(M.cantaria, ax ? 0.5 : ow, 0.85, az ? 0.5 : ow, px, bel, pz, { noGround: true }); } // (o peitoril da sineira)
    f.box(M.cantaria, tS - 0.2, 0.2, tS - 0.2, cx, bel - 0.1, cz, { noGround: true }); f.box(M.forro, tS - 0.2, 0.15, tS - 0.2, cx, bel + 3.95, cz, { noGround: true }); // o piso e o teto da sineira
    f.box(M.cantaria, tS + 0.5, 0.5, tS + 0.5, cx, bel + 4.0, cz, { noGround: true });
    f.geo(lathe([[0, 0], [tS / 2 + 0.1, 0], [tS * 0.42, 0.8], [tS * 0.3, 1.7], [tS * 0.12, 2.9], [0.15, 3.6], [0, 3.7]], 4), M.telhaVelha, cx, bel + 4.5, cz, { ry: Math.PI / 4, uv: false }); // o coruchéu piramidal, de quatro faces curvas
  }
  { const sy = o.torres === 'redonda' ? tH + 0.95 : tH + 1.2; f.geo(new THREE.SphereGeometry(0.28, 10, 8), M.cantaria, cx, sy, cz, { uv: false }); f.box(M.ferro, 0.08, 1.3, 0.08, cx, sy + 0.2, cz, { noGround: true }); f.box(M.ferro, 0.6, 0.08, 0.08, cx, sy + 1.05, cz, { noGround: true }); } // (a esfera e a cruz de ferro no alto)
  { // o sino, pendurado na travessa — que vai de um pilar de quina ao oposto, na diagonal (presa nos dois)
    const by = bel + 1.7, L = o.torres === 'redonda' ? 2 * (tS / 2 - 0.15) : (tS - 0.85) * Math.SQRT2;
    f.geo(lathe([[0, 0], [0.48, 0.02], [0.4, 0.4], [0.3, 0.95], [0.12, 1.08], [0, 1.1]], 16), M.bronze, cx, by, cz, { uv: false });
    f.box(M.madeiraEsc, L, 0.25, 0.25, cx, by + 1.1, cz, { ry: Math.PI / 4, noGround: true }); }
  f.solid(cx, cz, tS, tS, -1, tH);
}

// ---------------- a Igreja do Rosário em obra (planta elíptica: as paredes curvas subindo, sem telhado) ----------------
export function rosarioObra(B, M, out, o) {
  const f = frame(B, o.x, o.y, o.z, o.ry), a = 8.5, b = 11, T = 0.9, N = 40;
  for (let i = 0; i < N; i++) {
    const t0 = (i / N) * Math.PI * 2, t1 = ((i + 1) / N) * Math.PI * 2, tm = (t0 + t1) / 2;
    if (Math.abs(Math.sin(tm) - 1) < 0.08 && Math.cos(tm) > -0.3 && Math.cos(tm) < 0.3) continue; // (a porta, na frente)
    const x0 = Math.cos(t0) * a, z0 = Math.sin(t0) * b, x1 = Math.cos(t1) * a, z1 = Math.sin(t1) * b, L = Math.hypot(x1 - x0, z1 - z0);
    const h = 4.2 + Math.sin(i * 1.7) * 0.9 + (Math.sin(tm) < -0.5 ? 1.6 : 0) + (i % 5 === 0 ? -0.8 : 0); // (as fiadas desencontradas: a obra sobe aos pedaços)
    f.box(M.pedra, L + 0.1, h, T, (x0 + x1) / 2, 0, (z0 + z1) / 2, { ry: -Math.atan2(z1 - z0, x1 - x0) });
    f.solid((x0 + x1) / 2, (z0 + z1) / 2, L, T, -1, h);
  }
  // o frontispício com as torres redondas começando (o risco de 1784), e os andaimes
  for (const sx of [-1, 1]) { f.geo(new THREE.CylinderGeometry(2.1, 2.1, 7.5, 20), M.pedra, sx * 6.2, 3.75, b + 0.4, { uv: { s: 2.5 } }); f.solid(sx * 6.2, b + 0.4, 4.2, 4.2, -1, 7.5); }
  andaime(f, M, -8.5, 8.5, b + 2.6, 0, 8);
  andaime(f, M, -5, 5, -b - 2.8, 0, 6);
  // as pedras cortadas esperando, a cal e a casinha de palha da obra
  for (let k = 0; k < 14; k++) { const j = k % 8, x = -10 + (j % 4) * 1.3, z = b + 6 + Math.floor(j / 4) * 0.9; f.box(M.cantaria, 1.0, 0.45, 0.6, x, k < 8 ? 0 : 0.45, z, { noGround: k >= 8 }); } // (oito embaixo, seis por cima, cada uma sobre outra)
  f.solid(-7.5, b + 6.9, 6.5, 3, -1, 0.9);
  obraRancho(f, M, 9, b + 6);
  out.churches.push({ id: 'rosario', x: o.x, z: o.z, ry: o.ry, y: o.y, obra: true });
}
// o rancho da obra: quatro esteios, a cobertura de capim e as ferramentas
function obraRancho(f, M, x, z) {
  for (const [dx, dz] of [[-1.8, -1.4], [1.8, -1.4], [-1.8, 1.4], [1.8, 1.4]]) f.post(M.pau, x + dx, z + dz, 2.4, 0.08);
  f.geo(roofGeo(4.4, 3.8, 1.3, { thick: 0.25 }), M.palha, x, 2.35, z, { uv: false });
  f.box(M.tabua, 2.2, 0.08, 0.8, x, 0.85, z - 0.8); f.box(M.pau, 0.1, 0.85, 0.1, x - 1, 0, z - 0.8); f.box(M.pau, 0.1, 0.85, 0.1, x + 1, 0, z - 0.8);
  f.geo(new THREE.CylinderGeometry(0.4, 0.35, 0.6, 12), M.madeiraEsc, x + 1.2, 0.3, z + 0.6, { uv: false }); f.box(M.cal, 0.7, 0.05, 0.7, x + 1.2, 0.6, z + 0.6, { noGround: true }); // (a cal na tina)
}

// ---------------- o Palácio dos Governadores (o que se vê de fora: a muralha com guaritas e o casarão de pedra) ----------------
export function palacio(B, M, out) {
  const P = PLACES.palacio, f = frame(B, P.x, P.y, P.z, 0), wd = 40, dd = 16, H = 9.5, zb = -P.d / 2 + dd / 2 + 2;
  // o casarão: dois pisos de cantaria, janelas de verga reta, a portada no meio, telhado de quatro águas
  const U = 4.6, wxs = [0, 1, 2, 3, 5, 6, 7, 8].map((i) => -wd / 2 + 2.4 + i * (wd - 4.8) / 8); // (o andar nobre a 4,6 m; as janelas, sem a do meio)
  f.wall(M.cantaria, -wd / 2, zb + dd / 2 - 0.4, wd / 2, zb + dd / 2 - 0.4, U, 0.8, [[wd / 2, 2.6, 4.2, 0], ...wxs.map((c) => [c + wd / 2, 1.2, 1.7, 1.4])]);
  f.wall(M.cantaria, -wd / 2, zb + dd / 2 - 0.4, wd / 2, zb + dd / 2 - 0.4, H - U, 0.8, wxs.map((c) => [c + wd / 2, 1.2, 2.3, 0.8]), { y0: U });
  f.wall(M.cantaria, -wd / 2, zb - dd / 2 + 0.4, wd / 2, zb - dd / 2 + 0.4, H, 0.8);
  for (const sx of [-1, 1]) f.wall(M.cantaria, sx * (wd / 2 - 0.4), zb - dd / 2 + 0.8, sx * (wd / 2 - 0.4), zb + dd / 2 - 0.8, H, 0.8);
  const pt = M.paint.verde, zf = zb + dd / 2;
  for (let i = 0; i < 9; i++) { const cx = -wd / 2 + 2.4 + i * (wd - 4.8) / 8; if (i === 4) continue;
    moldura(f, M.cantaria, cx, 1.4, 1.2, 1.7, zf - 0.04, { larg: 0.22 }); for (let k = 0; k < 5; k++) f.box(M.ferro, 0.04, 1.7, 0.04, cx - 0.48 + k * 0.24, 1.4, zf + 0.06, { noGround: true });
    moldura(f, M.cantaria, cx, 5.4, 1.2, 2.3, zf - 0.04, { larg: 0.22 });
    for (const [y0, h] of [[1.4, 1.7], [5.4, 2.3]]) { // (a vidraça no vão e as duas folhas de madeira abertas para dentro, encostadas no reboco)
      f.box(M.glass, 1.2, h, 0.03, cx, y0, zf - 0.3, { noGround: true }); f.box(pt.wood, 1.2, 0.05, 0.05, cx, y0 + h / 2, zf - 0.3, { noGround: true }); f.box(pt.wood, 0.05, h, 0.05, cx, y0, zf - 0.3, { noGround: true });
      for (const s of [-1, 1]) f.box(pt.shutter, 0.06, h, 0.6, cx + s * 0.57, y0, zf - 0.84 - 0.3, { noGround: true });
      f.box(M.madeira, 1.3, 0.05, 0.4, cx, y0 - 0.05, zf - 0.7, { noGround: true }); } }
  for (const s of [-1, 1]) { f.box(M.cantaria, 0.6, 4.2, 0.5, s * 1.6, 0, zf + 0.15, { noGround: true }); f.box(pt.door, 0.08, 4.2, 1.3, s * 1.25, 0, zf - 0.8 - 0.67, { noGround: true }); } f.box(M.cantaria, 3.8, 2.0, 0.5, 0, 4.2, zf + 0.15, { noGround: true }); // (a portada saliente de cantaria e as folhas da porta abertas para dentro)
  f.box(M.cantaria, 2.7, 0.08, 1.2, 0, -0.06, zf - 0.3, { noGround: true }); // (a soleira)
  f.box(M.sabao, 1.6, 1.4, 0.3, 0, 4.6, zf + 0.42, { noGround: true }); // (a pedra com as armas reais sobre a porta)
  f.box(M.cantaria, wd + 0.6, 0.5, dd + 0.6, 0, H - 0.5, zb, { noGround: true });
  f.geo(roofGeo(wd + 1.4, dd + 1.6, 4.6, { hip: true, thick: 0.2 }), M.telha, 0, H, zb, { uv: false });
  f.solid(0, zb, wd, dd, H - 0.5, H + 6, true);
  f.box(M.pedra, wd, 0.6, dd, 0, -0.6, zb);
  // a muralha da frente com as guaritas nas quinas e o portão de entrada
  const mz = P.d / 2 - 0.6, mx = P.w / 2 - 0.6, mh = 3.4;
  f.wall(M.pedra, -mx, mz, mx, mz, mh, 1.2, [[mx, 4.0, 3.4, 0]]);
  for (const sx of [-1, 1]) f.wall(M.pedra, sx * mx, -P.d / 2 + 1, sx * mx, mz, mh, 1.2);
  f.box(M.cantaria, 2 * mx + 1.4, 0.3, 1.5, 0, mh, mz, { noGround: true });
  for (const sx of [-1, 1]) f.box(M.cantaria, 1.5, 0.3, P.d - 1.6, sx * mx, mh, (mz - P.d / 2 + 1) / 2, { noGround: true });
  for (const sx of [-1, 1]) { f.box(M.cantaria, 0.9, 4.8, 1.6, sx * 2.5, 0, mz, { noGround: true }); f.geo(new THREE.SphereGeometry(0.45, 10, 8), M.cantaria, sx * 2.5, 5.2, mz, { uv: false }); } // os pilares do portão
  for (const [gx, gz] of [[-mx, mz], [mx, mz], [-mx, -P.d / 2 + 1], [mx, -P.d / 2 + 1]]) { // as guaritas: torreões redondos em balanço sobre as quinas
    f.geo(lathe([[0, 0], [0.4, 0], [1.1, 1.2], [1.1, 3.6], [1.2, 3.7], [0, 3.7]], 16), M.cantaria, gx, mh - 1.2, gz, { uv: false });
    f.box(M.escuro, 0.3, 0.9, 0.3, gx + Math.sign(gx) * 0.9, mh + 0.9, gz + Math.sign(gz) * 0.45, { noGround: true });
    f.geo(lathe([[0, 0], [1.35, 0], [0.9, 0.8], [0.15, 1.9], [0, 2.1]], 16), M.telhaVelha, gx, mh + 2.5, gz, { uv: false });
  }
  { const yP = (z) => (PLACES.praca.y + (PLACES.praca.sz || 0) * (z - PLACES.praca.z)) - P.y; const z0 = mz + 0.6, z1 = P.d / 2 + 6.5, n = Math.max(3, Math.round(-yP(P.z + z1) / 0.18)), run = (z1 - z0) / n, rise = -yP(P.z + z1) / n;
    for (let k = 0; k < n; k++) { const top = -rise * (k + 1) + rise, zz = z0 + run * (k + 0.5); f.box(M.cantaria, 7.5, top - (-rise * n - 0.6), run + 0.02, 0, -rise * n - 0.6, zz); f.solid(0, zz, 7.5, run, -rise * n - 1, top, true); }
    for (const sx of [-1, 1]) for (let k = 0; k < n; k++) { const top = -rise * (k + 1) + rise + 0.9, zz = z0 + run * (k + 0.5); f.box(M.pedra, 0.6, top - (-rise * n - 0.6), run + 0.02, sx * 4.05, -rise * n - 0.6, zz); f.solid(sx * 4.05, zz, 0.6, run, -rise * n - 1, top); } } // (o guarda-corpo em degraus, acompanhando a escada)
  out.spots.palacio = f.W(0, mz + 3);
  palacioInterior(f, M, out, { wd, dd, H, zb });
}

// ---------------- a Casa de Câmara e Cadeia em obra ----------------
export function camaraObra(B, M, out) {
  const P = PLACES.camara, f = frame(B, P.x, P.y, P.z, Math.PI), w = 28, d = 18, zf = -P.d / 2 + 4 + d / 2; // (de frente para a praça: ry = π, a fachada olha para o norte)
  const zc = zf - d / 2, T = 1.1;
  // o térreo de cantaria: as paredes já na altura das vergas, umas fiadas mais altas que outras; os vãos de arco
  const hFront = (i) => 4.6 + ((i * 7) % 3) * 0.55;
  for (let i = 0; i < 7; i++) {
    const x0 = -w / 2 + i * w / 7, x1 = x0 + w / 7, h = hFront(i);
    const cx = (x0 + x1) / 2;
    f.box(M.cantaria, (x1 - x0) * 0.32, h, T, x0 + (x1 - x0) * 0.16, 0, zf - T / 2); f.box(M.cantaria, (x1 - x0) * 0.32, h, T, x1 - (x1 - x0) * 0.16, 0, zf - T / 2);
    if (i !== 3) f.box(M.cantaria, (x1 - x0) * 0.36, 1.0, T, cx, 0, zf - T / 2); // (o peitoril das janelas da cadeia)
    f.box(M.cantaria, (x1 - x0) * 0.36, Math.max(0.2, h - 3.6), T, cx, 3.6, zf - T / 2, { noGround: true });
    f.solid(x0 + (x1 - x0) * 0.16, zf - T / 2, (x1 - x0) * 0.32, T, -1, h); f.solid(x1 - (x1 - x0) * 0.16, zf - T / 2, (x1 - x0) * 0.32, T, -1, h); if (i !== 3) f.solid(cx, zf - T / 2, (x1 - x0) * 0.36, T, -1, 1.0);
  }
  for (const sx of [-1, 1]) { f.box(M.cantaria, T, 3.4, d - 2 * T, sx * (w / 2 - T / 2), 0, zc); f.solid(sx * (w / 2 - T / 2), zc, T, d - 2 * T, -1, 3.4); }
  f.box(M.pedra, w, 1.6, T, 0, 0, zc - d / 2 + T / 2); f.solid(0, zc - d / 2 + T / 2, w, T, -1, 1.6); // (os fundos ainda nos alicerces)
  f.box(M.pedra, w, 0.5, d, 0, -0.5, zc);
  andaime(f, M, -w / 2 - 0.6, w / 2 + 0.6, zf + 0.4, 0, 6.5, 1.5);
  // a cábrea: o guindaste de madeira (duas pernas em A, a lança e a corda com o bloco de pedra)
  { const gx = w / 2 + 4, gz = zf + 2; f.geo(new THREE.CylinderGeometry(0.12, 0.15, 9, 6), M.pau, gx - 1.2, 4.3, gz, { rz: 0.15, uv: false }); f.geo(new THREE.CylinderGeometry(0.12, 0.15, 9, 6), M.pau, gx + 1.2, 4.3, gz, { rz: -0.15, uv: false });
    f.geo(new THREE.CylinderGeometry(0.09, 0.11, 8, 6), M.pau, gx - 2.5, 7.2, gz, { rz: 1.1, uv: false }); f.box(M.corda, 0.03, 4.2, 0.03, gx - 5.8, 4.4, gz, { noGround: true }); f.box(M.cantaria, 0.9, 0.5, 0.6, gx - 5.8, 3.9, gz, { noGround: true });
    f.geo(new THREE.CylinderGeometry(0.5, 0.5, 1.6, 10), M.madeiraEsc, gx, 0.8, gz + 1.6, { rz: Math.PI / 2, uv: false }); f.solid(gx, gz, 3, 1, -1, 3); }
  for (let k = 0; k < 18; k++) { const x = -w / 2 + 1 + (k % 6) * 1.25, z = zf + 6 + Math.floor(k / 6) * 0.85; f.box(M.cantaria, 1.1, 0.5, 0.65, x, Math.floor(k / 12) * 0.5, z); }
  f.solid(-w / 2 + 4, zf + 6.9, 8, 3, -1, 1);
  obraRancho(f, M, w / 2 - 3, zf + 8);
  out.spots.camara = f.W(0, zf + 4);
}

// ---------------- o pelourinho (coluna de pedra sobre degraus, com os braços de ferro e as argolas) ----------------
export function pelourinho(B, M, out, x, z) {
  const y = terrainHeight(x, z), f = frame(B, x, y, z, 0.3);
  for (let k = 0; k < 3; k++) f.box(M.cantaria, 3.2 - k * 0.8, 0.3, 3.2 - k * 0.8, 0, k * 0.3, 0);
  f.solid(0, 0, 3.2, 3.2, -1, 0.3); f.solid(0, 0, 2.4, 2.4, -1, 0.6); f.solid(0, 0, 1.6, 1.6, -1, 0.9);
  f.geo(new THREE.CylinderGeometry(0.28, 0.34, 4.6, 8), M.cantaria, 0, 0.9 + 2.3, 0, { uv: false });
  f.geo(new THREE.CylinderGeometry(0.42, 0.32, 0.4, 8), M.cantaria, 0, 5.7, 0, { uv: false });
  f.geo(lathe([[0, 0], [0.35, 0], [0.42, 0.3], [0.2, 0.8], [0, 1.1]], 8), M.cantaria, 0, 5.9, 0, { uv: false });
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { f.box(M.ferro, 0.06, 0.06, 0.9, Math.sin(a) * 0.6, 5.2, Math.cos(a) * 0.6, { ry: a, noGround: true }); f.geo(new THREE.TorusGeometry(0.1, 0.02, 4, 10), M.ferro, Math.sin(a) * 1.0, 5.05, Math.cos(a) * 1.0, { uv: false }); }
  addCircle(x, z, 0.4, y, y + 6);
  out.spots.pelourinho = [x, z];
}

// ---------------- chafariz de parede (o espaldar de cantaria com as volutas e a cruz, a carranca, o tanque) ----------------
export function chafariz(B, M, out, x, z, ry, nome) {
  const y = terrainHeight(x, z) + 0.05, f = frame(B, x, y, z, ry);
  f.box(M.pedra, 5.2, 3.4, 1.0, 0, 0, -0.5); f.solid(0, -0.5, 5.2, 1.0, -1, 3.4);
  f.box(M.cantaria, 4.4, 2.6, 0.3, 0, 0.4, 0.12, { noGround: true });
  for (const sx of [-1, 1]) f.box(M.cantaria, 0.5, 3.2, 0.45, sx * 2.05, 0, 0.18);
  f.box(M.cantaria, 4.8, 0.35, 0.55, 0, 3.0, 0.15, { noGround: true });
  { const s = new THREE.Shape(); s.moveTo(-2.2, 0); s.bezierCurveTo(-1.6, 0.9, -0.8, 0.4, -0.5, 1.4); s.lineTo(0.5, 1.4); s.bezierCurveTo(0.8, 0.4, 1.6, 0.9, 2.2, 0); s.lineTo(-2.2, 0); f.geo(new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: false }), M.cantaria, 0, 3.35, -0.1); }
  f.box(M.ferro, 0.08, 0.9, 0.08, 0, 4.75, 0.1, { noGround: true }); f.box(M.ferro, 0.5, 0.08, 0.08, 0, 5.35, 0.1, { noGround: true });
  f.box(M.sabao, 1.3, 0.8, 0.12, 0, 2.15, 0.33, { noGround: true }); // (a pedra com a data, de pedra-sabão)
  f.geo(new THREE.SphereGeometry(0.28, 10, 8), M.sabao, 0, 1.45, 0.42, { sz: 0.7, uv: false }); f.geo(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), M.ferro, 0, 1.38, 0.68, { rx: Math.PI / 2, uv: false }); // a carranca e a bica
  f.geo(new THREE.CylinderGeometry(0.035, 0.03, 0.75, 6), M.jato, 0, 0.98, 0.86, { uv: false }); // o fio d'água caindo no tanque
  // o tanque: paredes de cantaria e a água parada com ondinhas
  f.box(M.cantaria, 3.6, 0.75, 0.25, 0, 0, 1.75); f.box(M.cantaria, 0.25, 0.75, 1.5, -1.68, 0, 1.0); f.box(M.cantaria, 0.25, 0.75, 1.5, 1.68, 0, 1.0); f.box(M.cantaria, 3.1, 0.15, 1.3, 0, 0, 0.95);
  f.box(M.agua, 3.1, 0.02, 1.25, 0, 0.6, 0.97, { noGround: true });
  f.solid(0, 1.0, 3.6, 1.6, -1, 0.75);
  out.fountains.push({ x, z, ry, nome, y });
}

// ---------------- tudo ----------------
export function buildMonuments(B, M, out) {
  const P = PLACES;
  M.pau = new THREE.MeshStandardMaterial({ color: 0x7a6650, roughness: 1 }); // os paus roliços dos andaimes
  M.tabua = M.madeira;
  M.corda = new THREE.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 1 });
  M.sabao = new THREE.MeshStandardMaterial({ color: 0x8a8a78, roughness: 0.7 }); // a pedra-sabão (cinza-esverdeada)
  M.bronze = new THREE.MeshStandardMaterial({ color: 0x6a5a3a, metalness: 0.8, roughness: 0.45 });
  M.jato = new THREE.MeshStandardMaterial({ color: 0xd8e4e4, roughness: 0.1, transparent: true, opacity: 0.6, depthWrite: false });
  M.agua = stillWater(new THREE.MeshStandardMaterial({ color: 0x3a4a40, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.9 }), { scale: 0.35, strength: 0.8 });
  out.churches = []; out.fountains = []; out.candles = []; out.interiors = []; out.statues = [];
  interiorMaterials(M);
  adroWalls(B, M, out);
  for (const Pq of Object.values(P)) for (const st of Pq.stairs || []) escadaria(B, M, Pq, st);
  // as matrizes, o Carmo e Santa Efigênia (prontas)
  const S = (key, extra = {}) => ({ key, ...extra }); // (as imagens: estátuas de madeira policromada escaneadas, ver modelos.js)
  igreja(B, M, out, { santos: { mor: S('rosario', { pilar: true }), col: [S('antonio'), S('paulo')], lat: [S('roque'), S('fpaula')] }, id: 'pilar', x: P.pilar.x - 4, z: P.pilar.z, ry: Math.PI / 2, y: P.pilar.y + 0.5, nW: 13, nL: 26, cW: 9, cL: 12, Hn: 12.5, Hc: 10.5, torres: 'quadrada', tS: 4.4, tH: 24, cor: 'madeira', sacristia: 1 });
  igreja(B, M, out, { santos: { mor: S('inmaculada'), col: [S('pedro_alc'), S('antonio')], lat: [S('paulo'), S('roque')] }, id: 'antoniodias', x: P.antoniodias.x + 6, z: P.antoniodias.z, ry: -Math.PI / 2, y: P.antoniodias.y + 0.5, nW: 13, nL: 25, cW: 9, cL: 12, Hn: 12.5, Hc: 10.5, torres: 'quadrada', tS: 4.4, tH: 23.5, cor: 'verde', sacristia: -1 });
  igreja(B, M, out, { santos: { mor: S('rosario'), col: [S('fpaula'), S('pedro_alc')], lat: [S('antonio'), S('paulo')] }, id: 'carmo', x: P.carmo.x, z: P.carmo.z + 4, ry: Math.PI, y: P.carmo.y + 0.5, nW: 11.5, nL: 22, cW: 8, cL: 10, Hn: 11.5, Hc: 9.5, torres: 'redonda', tS: 4.0, tH: 21.5, cor: 'madeira', sacristia: 1 });
  igreja(B, M, out, { santos: { mor: S('rosario'), col: [S('benedito'), S('antonio')], lat: [S('roque'), S('pedro_alc')] }, id: 'efigenia', x: P.efigenia.x, z: P.efigenia.z - 4, ry: 0, y: P.efigenia.y + 0.5, nW: 11, nL: 21, cW: 7.5, cL: 9.5, Hn: 11, Hc: 9, torres: 'quadrada', tS: 4.0, tH: 20.5, cor: 'almagre', sacristia: -1 });
  rosarioObra(B, M, out, { x: P.rosario.x - 3, z: P.rosario.z, ry: Math.PI / 2, y: P.rosario.y + 0.05 });
  palacio(B, M, out);
  camaraObra(B, M, out);
  pelourinho(B, M, out, -8, 40);
  // a Casa dos Contos (três pisos sobre o córrego, cantaria, vidraças) e a Casa da Ópera (sobrado simples, comprido)
  for (const R of RESERVED) {
    if (R.id === 'contos') { const g = casa(B, M, out, { x: R.x, z: R.z, ry: R.ry, w: R.w, d: R.d, kind: 'nobre', floors: 3, paint: 'verde', open: true, upX: 1, sacadas: true, sideWin: [-1, 1], custom: true, doorMid: true }); contosInterior(g.f, M, out, g); }
    if (R.id === 'opera') { const g = casa(B, M, out, { x: R.x, z: R.z, ry: R.ry, w: R.w, d: R.d, kind: 'sobrado', paint: 'almagre', open: true, upX: -1, sacadas: true, hall: true, yard: false }); teatro(g.f, M, out, g); }
  }
  chafariz(B, M, out, -246, 12.5, 0, 'Chafariz dos Contos');
  chafariz(B, M, out, 352, 40, Math.PI / 2 + 0.2, 'Chafariz de Antônio Dias');
}
