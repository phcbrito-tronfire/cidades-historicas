// As casas de Vila Rica: fileiras coladas umas nas outras, no alinhamento das ruas, cada uma no nível da sua porta —
// na ladeira elas descem em degraus, com os oitões aparecendo de uma para a outra e o embasamento de pedra crescendo
// onde a rua cai. Tipos (ver docs/PLANO-OURO-PRETO.md, "Casas"):
// - casa térrea de porta e janela (a mais comum);
// - sobrado de dois pisos: embaixo a loja ou o depósito, em cima a família, com as janelas de rótula ou as sacadas;
// - sobrado nobre: mais largo, cunhais e molduras de cantaria, sacadas (uma com grade de ferro), vidraças de guilhotina;
// - casinha de pau a pique na periferia e nas estradas (barro sem caiar, coberta de telha velha ou de capim).
// Todas fechadas por fora (paredes com espessura, oitões, beirais) e com o térreo de entrar: soalho, forro, a
// divisória da sala e a porta dos fundos fechada. A mobília entra na Etapa 4.
import * as THREE from 'three';
import { mulberry32 } from '../comum/util.js';
import { frame, roofGeo, janela, porta, sacada, cachorrada } from './kit.js';
import { terrainHeight, STREETS, STREAMS, PLACES, BRIDGES, BOUNDS, RESERVED, polyDist, pointAt, inPlace } from './terrain.js';

const rnd = mulberry32(1711);
const rr = (a, b) => a + rnd() * (b - a);
const pick = (o) => { let s = 0; for (const v of Object.values(o)) s += v; let r = rnd() * s; for (const [k, v] of Object.entries(o)) { r -= v; if (r <= 0) return k; } return Object.keys(o)[0]; };
const T = 0.4; // espessura das paredes de fora (as de pedra e adobe eram ainda mais grossas embaixo)

// o perfil da água (o mesmo do roofGeo do kit): t = 0 no beiral, 1 na cumeeira
const KICK = 0.22, prof = (t) => (t < KICK ? t * (0.55 / KICK) * 0.6 : 0.33 + (t - KICK) / (1 - KICK) * 0.67);
// a forma do oitão: o triângulo entre o alto da parede e o telhado (segue o contrafeito da água); yAt dá a altura
// da parte de baixo da telha acima do alto da parede
function gable(d, yAt) {
  const sh = new THREE.Shape(), n = 8; sh.moveTo(-d / 2, 0);
  for (let i = 0; i <= n; i++) { const z = -d / 2 + (d * i) / n; sh.lineTo(z, Math.max(0.01, yAt(z))); }
  sh.lineTo(d / 2, 0); sh.lineTo(-d / 2, 0);
  return sh;
}

// ---------------- uma casa ----------------
// o: { x, z, ry, w, d, kind: 'terrea'|'sobrado'|'nobre'|'casebre', paint, open, upX (+1/-1: para que lado a rua sobe) }
export function casa(B, M, out, o) {
  const w = o.w, d = o.d, hw = w / 2, hd = d / 2, c0 = Math.cos(o.ry), s0 = Math.sin(o.ry);
  const W0 = (lx, lz) => [o.x + lx * c0 + lz * s0, o.z - lx * s0 + lz * c0];
  // o nível do piso: a rua diante da fachada no ponto mais alto, mais a soleira
  const street = (lx) => terrainHeight(...W0(lx, hd + (o.frontS || 0.7))); // (frontS: onde medir o chão da frente — na praça, já dentro dela)
  let top = -Infinity; for (let lx = -hw; lx <= hw + 0.01; lx += w / 6) top = Math.max(top, street(lx));
  const y = top + 0.14;
  let low = Infinity; for (let a = -1; a <= 1.001; a += 0.25) for (let b = -1; b <= 1.001; b += 0.25) low = Math.min(low, terrainHeight(...W0(a * hw, b * hd))); low -= 0.15; // (o chão medido numa grade fina: o embasamento desce até o ponto mais baixo)
  const f = frame(B, o.x, y, o.z, o.ry);
  const kind = o.kind, pt = M.paint[o.paint], rich = kind === 'nobre', poor = kind === 'casebre';
  const H1 = poor ? 2.7 : kind === 'terrea' ? 3.4 : 3.5, H2 = rich ? 3.3 : 3.0, two = kind === 'sobrado' || rich;
  const nF = o.floors || (two ? 2 : 1), Htop = H1 + (nF - 1) * H2; // (a Casa dos Contos tem três pisos)
  const wallM = poor ? (o.caiado ? M.calVelha : M.barro) : o.velha ? M.calVelha : M.cal;
  const zf = hd; // a face de fora da fachada
  // embasamento de pedra: do ponto mais baixo do chão até o piso (vence o desnível da ladeira)
  if (low < -0.02 + y) f.box(M.pedra, w, y - low + 0.35, d, 0, low - y - 0.35, 0);
  else f.box(M.pedra, w, 0.4, d, 0, -0.4, 0);
  // piso, forro e o que segura a câmera
  const iw = w - 2 * T, id = d - 2 * T;
  f.box(poor ? M.chaoTerra : M.soalho, iw, 0.12, id, 0, -0.12, 0, { noGround: true });
  f.solid(0, 0, iw, id, -1.2, 0, true);
  out.press.push({ x: o.x, z: o.z, w: w - 0.2, d: d - 0.2, ry: o.ry, top: y });
  f.box(two ? M.madeira : M.forro, iw, 0.14, id, 0, H1 - 0.3, 0, { noGround: true }); // o forro (no sobrado, o soalho de cima)
  f.solid(0, 0, w + 0.6, d + 0.6, H1 - 0.2, Htop + 3.5, true);
  // ---- a fachada: os vãos
  const nb = Math.max(2, Math.floor((w - 0.6) / (rich ? 2.1 : 1.85))), bx = (i) => -hw + (i + 0.5) * w / nb;
  // a porta fica no vão onde a rua chega mais perto do piso (o lado de cima da ladeira); a segunda porta (a da loja)
  // só onde a rua também está perto — senão ali embaixo vira a portinha do porão, aberta no embasamento
  const gapAt = (lx) => y - street(lx);
  let doorI = 0; for (let i = 1; i < nb; i++) if (gapAt(bx(i)) < gapAt(bx(doorI))) doorI = i;
  let lojaI = -1; if (two && nb >= 3 && !rich) { const cand = doorI === 0 ? nb - 1 : 0; if (gapAt(bx(cand)) < 0.6) lojaI = cand; }
  const cant = rich ? M.cantaria : null;
  const g1 = [], win1 = [];
  for (let i = 0; i < nb; i++) {
    if (i === doorI || i === lojaI) { const dw = rich ? 1.3 : poor ? 0.95 : 1.15, dh = poor ? 2.05 : rich ? 2.7 : 2.45; g1.push([bx(i) + hw, dw, dh, 0]); win1.push(['porta', bx(i), dw, dh, i === doorI ? o.open : false]); }
    else { const ww = poor ? 0.75 : 0.95, wh = poor ? 0.95 : 1.35, sill = poor ? 1.0 : 0.95; g1.push([bx(i) + hw, ww, wh, sill]); win1.push([rich ? 'vidro' : rnd() < 0.6 ? 'rotula' : 'cega', bx(i), ww, wh, sill]); }
  }
  f.wall(wallM, -hw, zf - T / 2, hw, zf - T / 2, H1, T, g1.map(([c, ww, h, s]) => [c, ww, h, s]));
  for (const [k, cx, ww, h, s] of win1) {
    if (k === 'porta') porta(f, M, pt, cx, 0, ww, h, zf, T, { open: s, cant });
    else janela(f, M, pt, k, cx, s, ww, h, zf, T, { cant });
  }
  for (let fl = 1; fl < nF; fl++) {
    const Hb = H1 + (fl - 1) * H2; // (a base deste piso)
    const g2 = [], win2 = [];
    for (let i = 0; i < nb; i++) {
      const sac = rich ? Math.abs(i - (nb - 1) / 2) < nb / 6 + 0.01 && fl === 1 : o.sacadas && (i % 2 === 0 || nb === 2); // (no nobre, as sacadas só no meio do andar nobre; no sobrado, alternadas)
      if (sac) { g2.push([bx(i) + hw, 1.0, 2.25, 0]); win2.push(['sacada', bx(i), 1.0, 2.25, 0, rich && i === Math.floor(nb / 2)]); }
      else { g2.push([bx(i) + hw, 0.95, 1.4, 0.95]); win2.push([rich ? 'vidro' : rnd() < 0.7 ? 'rotula' : 'cega', bx(i), 0.95, 1.4, 0.95]); }
    }
    f.wall(wallM, -hw, zf - T / 2, hw, zf - T / 2, H2, T, g2, { y0: Hb });
    for (const [k, cx, ww, h, s, ferro] of win2) {
      if (k === 'sacada') { janela(f, M, pt, rich ? 'vidro' : 'cega', cx, Hb + 0.02, ww, h, zf, T, { cant }); sacada(f, M, pt, cx, Hb + 0.02, ww + 0.5, zf, { ferro }); }
      else janela(f, M, pt, k, cx, Hb + s, ww, h, zf, T, { cant });
    }
    // a faixa entre os pisos (no nobre, de cantaria)
    f.box(cant || pt.wood, w, 0.14, 0.1, 0, Hb - 0.08, zf + 0.03, { noGround: true });
    if (fl > 1) f.box(M.madeira, w - 2 * T, 0.14, d - 2 * T, 0, Hb - 0.3, 0, { noGround: true });
  }
  // ---- as outras paredes: os fundos com a porta do quintal e uma janela (fechadas), os lados cegos
  const bk = M.paint.madeira;
  f.wall(M.calVelha, -hw, -zf + T / 2, hw, -zf + T / 2, Htop, T, [[w * 0.3, 0.9, 2.1, 0], [w * 0.72, 0.85, 1.2, 1.0]]);
  f.box(bk.door, 0.9, 2.1, 0.07, -hw + w * 0.3, 0, -zf + 0.16, { noGround: true }); f.box(bk.shutter, 0.85, 1.2, 0.06, -hw + w * 0.72, 1.0, -zf + 0.16, { noGround: true });
  for (const [cx, ww, hh, y0] of [[-hw + w * 0.3, 0.9, 2.1, 0], [-hw + w * 0.72, 0.85, 1.2, 1.0]]) { f.box(bk.wood, ww + 0.24, 0.12, 0.08, cx, y0 + hh, -zf - 0.03, { noGround: true }); for (const sx of [-1, 1]) f.box(bk.wood, 0.12, hh, 0.08, cx + sx * (ww / 2 + 0.06), y0, -zf - 0.03, { noGround: true }); }
  for (const sx of [-1, 1]) {
    if (!(o.sideWin || []).includes(sx)) { f.wall(wallM, sx * (hw - T / 2), -hd + T, sx * (hw - T / 2), hd - T, Htop, T); continue; }
    // a parede do lado com janelas em cada piso, vistas por um quadro girado (a face de fora vira o +z dele)
    const nw = Math.max(2, Math.floor((d - 2) / 2.3)), zs = (k) => -hd + T + (k + 0.5) * (d - 2 * T) / nw, fs = frame(B, W0(sx * hw, 0)[0], y, W0(sx * hw, 0)[1], o.ry + sx * Math.PI / 2);
    for (let fl = 0; fl < nF; fl++) {
      const yb = fl === 0 ? 0 : H1 + (fl - 1) * H2, hh = fl === 0 ? H1 : H2;
      f.wall(wallM, sx * (hw - T / 2), -hd + T, sx * (hw - T / 2), hd - T, hh, T, Array.from({ length: nw }, (_, k) => [zs(k) + hd - T, 0.95, 1.4, 0.95]), { y0: yb });
      for (let k = 0; k < nw; k++) janela(fs, M, pt, rich ? 'vidro' : 'rotula', -sx * zs(k), yb + 0.95, 0.95, 1.4, 0, T, { cant });
    }
  }
  // ---- a divisória: a sala da frente (onde se recebe) e a alcova e a cozinha do fundo
  if (d > 6.5) { const zp = zf - Math.min(4.6, d * 0.45); f.wall(M.cal, -hw + T, zp, hw - T, zp, H1 - 0.3, 0.16, [[(w - 2 * T) * 0.5, 0.9, 2.15, 0]]); }
  // ---- cunhais, cimalha e beiral
  const quina = cant || pt.wood;
  if (!poor) for (const sx of [-1, 1]) { f.box(quina, 0.28, Htop, 0.1, sx * (hw - 0.14), 0, zf + 0.04, { noGround: true }); f.box(quina, 0.1, Htop, 0.28, sx * (hw - 0.04), 0, zf - 0.1, { noGround: true }); }
  // o telhado passa rente ao alto da parede (o beiral avança e desce além dela)
  const D = d + (poor ? 1.0 : 1.5), Hr = (D / 2) * (poor ? 0.62 : 0.52), tW = (D / 2 - d / 2) / (D / 2), roofY = Htop + 0.05 - Hr * prof(tW), thick = poor && !o.telha ? 0.3 : 0.14;
  const yRoof = (z) => roofY + Hr * prof(Math.max(0, (D / 2 - Math.abs(z)) / (D / 2))); // (a face de cima da telha)
  if (rich || kind === 'sobrado') { const cy = yRoof(zf + 0.7) - thick - 0.15; f.box(quina, w + 0.04, 0.24, 0.24, 0, Htop - 0.3, zf + 0.06, { noGround: true }); cachorrada(f, pt.wood, -hw, hw, cy, zf, 0.7); cachorrada(f, M.madeiraEsc, -hw, hw, cy, -zf - 0.65, 0.7); }
  else if (!poor) for (const [dz, hh] of [[0.16, 0.1], [0.3, 0.09], [0.44, 0.08]]) { const yb = yRoof(zf + dz) - thick - hh - 0.02; f.box(M.telhaVelha, w, hh, dz, 0, yb, zf + dz / 2, { noGround: true, uv: { s: 1 } }); f.box(M.cal, w, 0.03, dz, 0, yb - 0.03, zf + dz / 2, { noGround: true }); } // beira-seveira: três fiadas de telha embutidas na massa, em degraus sob o beiral
  // ---- o telhado de duas águas (cumeeira paralela à rua) e os oitões
  f.geo(roofGeo(w + 0.06, D, Hr, { thick }), poor && !o.telha ? M.palha : o.velha || poor ? M.telhaVelha : M.telha, 0, roofY, 0, { uv: false });
  { const sh = gable(d, (z) => yRoof(z) - thick - 0.02 - Htop); for (const sx of [-1, 1]) { const g = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(sx > 0 ? hw - T : -hw, 0, 0); f.geo(g, wallM, 0, Htop, 0); } }
  f.box(o.velha || poor ? M.telhaVelha : M.telha, w + 0.1, 0.16, 0.34, 0, roofY + Hr - 0.1, 0, { noGround: true, uv: { s: 1 } }); // a cumeeira (as telhas de capa emboçadas)
  // ---- os degraus de cada porta (uma escadinha de pedra, se a rua cai) e as portinhas de porão no embasamento
  for (const [k, cx, ww] of win1) {
    const gap = gapAt(cx);
    if (k === 'porta' && gap > 0.2) { const n = Math.min(4, Math.ceil(gap / 0.22)), sh = gap / n; for (let j = 0; j < n; j++) { const dz = 0.3 * (n - j); f.box(M.cantaria, ww + 0.5, sh * (j + 1) + 0.3, 0.32, cx, -gap - 0.3, zf + dz - 0.16); f.solid(cx, zf + dz - 0.16, ww + 0.5, 0.32, -gap - 0.6, -gap + sh * (j + 1), true); } }
    else if (k !== 'porta' && gap > 1.75 && !poor) { const ph = Math.min(1.9, gap - 0.25); f.box(M.paint.madeira.door, 0.85, ph, 0.08, cx, -gap + 0.02, zf - 0.05, { noGround: true }); f.box(M.cantaria, 1.1, 0.14, 0.12, cx, -gap + ph, zf + 0.02, { noGround: true }); }
  }
  const dcx = bx(doorI);
  const [cx, cz] = W0(0, 0), [dx, dz] = W0(dcx, zf + 1.2), [ix, iz] = W0(0, zf - 2.2);
  out.houses.push({ x: cx, z: cz, ry: o.ry, w, d, y, kind, open: o.open, door: [dx, dz], inside: [ix, iz], top: y + Htop + Hr });
}

// ---------------- as fileiras ao longo das ruas ----------------
// densidade e tipos por rua: o miolo (Rua Direita, São José, Ouvidor, Ópera, Carmo) é de sobrados; as ladeiras de
// fora, de casas térreas; nas estradas, casinhas soltas
const STREET_MIX = {
  direita: { dens: 1, mix: { sobrado: 5, nobre: 1.5, terrea: 2.5 } },
  saojose: { dens: 1, mix: { sobrado: 4, nobre: 1, terrea: 3 } },
  claudio: { dens: 1, mix: { sobrado: 5, nobre: 1.5, terrea: 2 } },
  opera: { dens: 0.95, mix: { sobrado: 3, nobre: 0.8, terrea: 4 } },
  carmo: { dens: 1, mix: { sobrado: 3, nobre: 1, terrea: 2 } },
  antoniodias: { dens: 0.95, mix: { sobrado: 3, nobre: 0.6, terrea: 5 } },
  rosario: { dens: 0.85, mix: { sobrado: 1, terrea: 6, casebre: 1 } },
  efigenia: { dens: 0.8, mix: { sobrado: 0.8, terrea: 6, casebre: 2 } },
  rio: { dens: 0.3, mix: { terrea: 2, casebre: 4 } },
  mariana: { dens: 0.3, mix: { terrea: 2, casebre: 4 } },
  queimada: { dens: 0.35, mix: { casebre: 5, terrea: 1 } },
};

export function buildHouses(B, M, out) {
  const rects = [];
  const reserved = RESERVED.map((r) => ({ ...r, w: r.w + 3, d: r.d + 3 }));
  const corners = (r, m = 0) => { const c = Math.cos(r.ry), s = Math.sin(r.ry), hw = r.w / 2 + m, hd = r.d / 2 + m; return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd], [0, 0], [0, hd], [0, -hd], [hw, 0], [-hw, 0]].map(([u, v]) => [r.x + u * c + v * s, r.z - u * s + v * c]); };
  const inside = (r, x, z, m = 0) => { const c = Math.cos(r.ry), s = Math.sin(r.ry), dx = x - r.x, dz = z - r.z, u = dx * c - dz * s, v = dx * s + dz * c; return Math.abs(u) < r.w / 2 + m && Math.abs(v) < r.d / 2 + m; };
  const ok = (r, own) => {
    const pts = corners(r);
    for (const [x, z] of pts) {
      if (x < BOUNDS[0] + 4 || x > BOUNDS[1] - 4 || z < BOUNDS[2] + 4 || z > BOUNDS[3] - 4) return false;
      for (const [k, S] of Object.entries(STREETS)) { const q = polyDist(S.pts, x, z); if (q.d < S.hw + (k === own ? 0.1 : 0.6)) return false; }
      for (const C of Object.values(STREAMS)) if (polyDist(C.pts, x, z).d < C.bank + 2) return false;
      for (const Pq of Object.values(PLACES)) if (inPlace(x, z, Pq, 1.5)) return false;
      for (const Bq of BRIDGES) if (Math.hypot(x - Bq.x, z - Bq.z) < 15) return false;
    }
    for (const q of reserved) if (pts.some(([x, z]) => inside(q, x, z)) || corners(q).some(([x, z]) => inside(r, x, z))) return false;
    for (const q of rects) { if (Math.hypot(q.x - r.x, q.z - r.z) > (q.w + q.d + r.w + r.d) / 2) continue; if (pts.some(([x, z]) => inside(q, x, z, -0.02)) || corners(q).some(([x, z]) => inside(r, x, z, -0.02))) return false; }
    // o terreno debaixo não pode cair demais (casa sobre um barranco de 5 m não existe: ali fica o quintal)
    const hs = pts.map(([x, z]) => terrainHeight(x, z)); if (Math.max(...hs) - Math.min(...hs) > 6.5) return false;
    return true;
  };
  const paints = { almagre: 3, verde: 2.5, azul: 1.5, ocre: 1.2, madeira: 2.5, cinza: 0.6 };
  // as ruas e os dois lados compridos da praça (os casarões olhando para ela, como o Conjunto Alpoim)
  const P = PLACES.praca, lines = Object.entries(STREETS).map(([sid, S]) => [sid, S, [-1, 1], S.hw + 0.25]);
  lines.push(['praca', { pts: [[P.x - P.w / 2, P.z - P.d / 2 + 4], [P.x - P.w / 2, P.z + P.d / 2 - 2]], hw: 0, len: P.d - 6, frontS: 2.6 }, [1], 1.8]);
  lines.push(['praca', { pts: [[P.x + P.w / 2, P.z - P.d / 2 + 4], [P.x + P.w / 2, P.z + P.d / 2 - 2]], hw: 0, len: P.d - 6, frontS: 2.6 }, [-1], 1.8]);
  STREET_MIX.praca = { dens: 1, mix: { sobrado: 4, nobre: 2 } };
  for (const [sid, S, sides, off0] of lines) {
    const cfg = STREET_MIX[sid]; if (!cfg) continue;
    for (const side of sides) {
      let s = 3 + rnd() * 3;
      while (s < S.len - 4) {
        const kind = pick(cfg.mix), w = kind === 'nobre' ? rr(9, 11.5) : kind === 'sobrado' ? rr(6, 8.5) : kind === 'casebre' ? rr(4, 5.2) : rr(5, 7.5);
        const d = kind === 'casebre' ? rr(4.5, 5.8) : rr(8.5, 12);
        if (rnd() > cfg.dens) { s += w; continue; }
        const p = pointAt(S.pts, s + w / 2), nx = -p.dz * side, nz = p.dx * side; // a normal para o lado da fileira
        const off = off0 + (kind === 'casebre' ? rr(1, 4) : 0) + d / 2;
        const r = { x: p.x + nx * off, z: p.z + nz * off, w, d, ry: Math.atan2(-nx, -nz) };
        if (!ok(r, sid)) { s += 2; continue; }
        // para que lado (no x local da casa) a rua sobe
        const c = Math.cos(r.ry), sn = Math.sin(r.ry), ya = terrainHeight(r.x - c * w / 2 - nx * (d / 2 + 0.7), r.z + sn * w / 2 - nz * (d / 2 + 0.7)), yb = terrainHeight(r.x + c * w / 2 - nx * (d / 2 + 0.7), r.z - sn * w / 2 - nz * (d / 2 + 0.7));
        casa(B, M, out, { ...r, frontS: S.frontS, kind, paint: pick(paints), open: rnd() < 0.45, upX: yb > ya ? 1 : -1, velha: rnd() < 0.3, sacadas: rnd() < 0.55, caiado: rnd() < 0.4, telha: rnd() < 0.55 });
        rects.push(r);
        s += w + (rnd() < 0.08 ? rr(1.5, 3) : 0.02); // (de vez em quando um beco entre as casas)
      }
    }
  }
  return rects;
}
