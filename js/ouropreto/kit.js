// Kit da arquitetura de Vila Rica (século XVIII), feito em código. O que vale para 1789, segundo os estudos de
// arquitetura mineira (Sylvio de Vasconcellos, "Vila Rica"; trabalhos do IFMG Ouro Preto) — ver docs/PLANO-OURO-PRETO.md:
// - paredes grossas caiadas de branco (pedra embaixo; em cima, pau a pique ou adobe), sobre um embasamento de pedra
//   que vence o desnível da ladeira;
// - cunhais (as quinas) e cimalhas de madeira pintada; de cantaria só nas casas ricas;
// - janelas de verga reta com rótulas (treliça de madeira) ou folhas cegas; guilhotina com vidro só nas casas ricas;
// - sacadas de madeira com balaústres; grade de ferro só nas fachadas nobres;
// - telha capa e canal, beiral de cachorros (as pontas das vigas à vista) ou beira-seveira nas casas simples;
// - portas almofadadas de duas folhas, pintadas: almagre, verde, azul, ocre (cores comedidas, nada das de hoje).
// Cada prédio se monta num "quadro" local (x ao longo da fachada, z para a frente, y para cima), girado no mundo.
import * as THREE from 'three';
import { mat4 } from '../comum/batcher.js';
import { addRotBox, addCircle } from '../comum/collision.js';
import { pbrSet, toTexture } from './textures.js';
import { mulberry32 } from '../comum/util.js';

const cv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
const R = mulberry32(1789);

// ---------------- texturas desenhadas (em tons claros: a cor vem do material, a tinta de cada casa) ----------------
// rótula: treliça de ripas finas em diagonal, com a moldura, sobre o escuro de dentro da casa
function rotulaTex() {
  return toTexture(cv(128, 192, (x, W, H) => {
    x.fillStyle = '#14100c'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#d8d0c4'; x.lineWidth = 3.2;
    for (let i = -H; i < W + H; i += 13) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + H * 0.62, H); x.stroke(); x.beginPath(); x.moveTo(i + H * 0.62, 0); x.lineTo(i, H); x.stroke(); }
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 1; for (let i = -H; i < W + H; i += 13) { x.beginPath(); x.moveTo(i + 2, 0); x.lineTo(i + 2 + H * 0.62, H); x.stroke(); }
    x.fillStyle = '#e0d8cc'; x.fillRect(0, 0, W, 9); x.fillRect(0, H - 9, W, 9); x.fillRect(0, 0, 9, H); x.fillRect(W - 9, 0, 9, H); x.fillRect(W / 2 - 3, 0, 6, H); // (a moldura e o mainel das duas folhas)
  }));
}
// porta de duas folhas almofadadas (seis almofadas em cada folha), com a fresta do meio
function doorTex() {
  return toTexture(cv(128, 256, (x, W, H) => {
    x.fillStyle = '#d6cec2'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '0,0,0'},0.04)`; x.fillRect(R() * W, R() * H, 2, 12); }
    for (const fx of [0, W / 2]) for (let r = 0; r < 3; r++) { const px = fx + 10, py = 12 + r * (H - 24) / 3, pw = W / 2 - 20, ph = (H - 24) / 3 - 12;
      x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(px, py, pw, ph); x.fillStyle = '#e6ded2'; x.fillRect(px + 4, py + 4, pw - 8, ph - 8);
      x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(px, py, pw, 2); x.fillRect(px, py, 2, ph); }
    x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(W / 2 - 1.5, 0, 3, H);
    x.fillStyle = '#2a2420'; x.fillRect(W / 2 - 14, H * 0.52, 5, 10); x.fillRect(W / 2 + 9, H * 0.52, 5, 10); // (as argolas de ferro)
  }));
}
// folha cega de janela: tábuas com duas almofadas
function shutterTex() {
  return toTexture(cv(128, 160, (x, W, H) => {
    x.fillStyle = '#d6cec2'; x.fillRect(0, 0, W, H);
    for (const fx of [0, W / 2]) for (let r = 0; r < 2; r++) { const px = fx + 9, py = 10 + r * (H - 20) / 2, pw = W / 2 - 18, ph = (H - 20) / 2 - 10;
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(px, py, pw, ph); x.fillStyle = '#e4dccf'; x.fillRect(px + 4, py + 4, pw - 8, ph - 8); }
    x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(W / 2 - 1.5, 0, 3, H);
  }));
}
// vidraça de guilhotina: duas folhas de seis vidrinhos (vidro grosso, esverdeado, com o reflexo do céu)
function glassTex() {
  return toTexture(cv(96, 160, (x, W, H) => {
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#3a4a4c'); g.addColorStop(0.5, '#1a2224'); g.addColorStop(1, '#2a3436'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) { const cx = (i % 3) * W / 3, cy = Math.floor(i / 3) * H / 4; x.fillStyle = `rgba(200,220,220,${0.05 + R() * 0.1})`; x.fillRect(cx + 4, cy + 4, W / 3 - 8, H / 8); }
    x.fillStyle = '#e8e0d4'; for (let i = 0; i <= 3; i++) x.fillRect(i * W / 3 - 3, 0, 6, H); for (let j = 0; j <= 4; j++) x.fillRect(0, j * H / 4 - 3, W, 6);
    x.fillRect(0, H / 2 - 5, W, 10); // (o encontro das duas folhas)
  }));
}
// forro de tábuas (o teto das salas) e o soalho
function boardsTex(base, line) {
  return toTexture(cv(128, 128, (x, W, H) => { x.fillStyle = base; x.fillRect(0, 0, W, H); for (let i = 0; i < W; i += 16) { x.fillStyle = line; x.fillRect(i, 0, 2, H); for (let k = 0; k < 6; k++) { x.fillStyle = `rgba(0,0,0,${0.04 + R() * 0.06})`; x.fillRect(i + 2 + R() * 12, R() * H, 1, 10 + R() * 30); } } }));
}

export const PAINT = { almagre: 0x6a3a2e, verde: 0x3c4a3a, azul: 0x3a4658, ocre: 0x9a7c48, madeira: 0x5a4434, cinza: 0x5e5a54 }; // (tintas de terra e de planta, desbotadas pelo sol: nada das cores fortes de hoje)

export function createMaterials(tex) {
  const P = tex.pbr;
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0, ...o });
  const M = {};
  M.cal = std({ ...pbrSet(P.cal_branca, 1), color: 0xf4efe4, roughness: 0.95 }); M.cal.userData.uv = { s: 3 }; // a caiação
  M.calVelha = std({ ...pbrSet(P.white_plaster_rough_01, 1), color: 0xe9dfcc, roughness: 0.95 }); M.calVelha.userData.uv = { s: 3 }; // a cal mais suja, das casas mais velhas e dos fundos
  M.barro = std({ ...pbrSet(P.barro_ocre, 1), color: 0xb08868, roughness: 1 }); M.barro.userData.uv = { s: 2.5 }; // o pau a pique sem caiar das casinhas da periferia
  M.pedra = std({ ...pbrSet(P.rock_wall_08, 1), color: 0xd2c4aa }); M.pedra.userData.uv = { s: 2.5 }; // a alvenaria de pedra (embasamento, muros de arrimo)
  M.cantaria = std({ ...pbrSet(P.pedra_clara, 1), color: 0xcfc2a6 }); M.cantaria.userData.uv = { s: 1.6 }; // a cantaria de quartzito (cunhais e molduras das casas ricas, portadas)
  M.telha = std({ map: P.clay_roof_tiles_02.map, normalMap: P.clay_roof_tiles_02.normalMap, color: 0xd2b8a4, roughness: 0.9 }); // telha capa e canal (a geometria do telhado já leva o UV certo)
  M.telhaVelha = std({ map: P.clay_roof_tiles_02.map, normalMap: P.clay_roof_tiles_02.normalMap, color: 0x9a8a7a, roughness: 0.95 }); // a telha escurecida pelo tempo e pelo limo
  M.madeira = std({ ...pbrSet(P.weathered_planks, 1), color: 0x8a6e52 }); M.madeira.userData.uv = { s: 2 };
  M.lajedo = std({ ...pbrSet(P.monastery_stone_floor, 1), color: 0xd8ccb8 }); M.lajedo.userData.uv = { s: 3 }; // o lajeado de pedra (patamares, sacristias, a loja da Casa dos Contos)
  M.madeiraEsc = std({ ...pbrSet(P.madeira_clara, 1), color: 0x4a3426 }); M.madeiraEsc.userData.uv = { s: 2 };
  M.soalho = std({ ...pbrSet(P.weathered_planks, 1), color: 0xc09a78, roughness: 0.85 }); M.soalho.userData.uv = { s: 2.2 }; // o soalho de tábuas largas, gasto
  M.forro = std({ map: boardsTex('#e2dccf', 'rgba(60,50,40,0.35)'), roughness: 0.9 }); M.forro.userData.uv = { s: 2.4 }; // o forro caiado de tábuas
  M.chaoTerra = std({ ...pbrSet(P.dry_ground_rocks, 1), color: 0x8a6a54, roughness: 1 }); M.chaoTerra.userData.uv = { s: 3 }; // chão de terra batida (cozinhas, casebres)
  M.escuro = std({ color: 0x0e0b08, roughness: 1 }); // o fundo escuro de dentro (atrás das rótulas)
  M.ferro = std({ color: 0x1e1c1a, metalness: 0.55, roughness: 0.55 });
  M.palha = std({ map: toTexture(cv(256, 256, (x, W, H) => { x.fillStyle = '#7a6a48'; x.fillRect(0, 0, W, H); for (let i = 0; i < 5200; i++) { const px = R() * W, py = R() * H, l = 8 + R() * 26, v = R(); x.strokeStyle = v < 0.3 ? 'rgba(52,42,26,0.6)' : v < 0.8 ? 'rgba(160,140,96,0.55)' : 'rgba(205,186,132,0.5)'; x.lineWidth = 1 + R() * 1.2; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (R() - 0.5) * 4, py + l); x.stroke(); } for (let y = 0; y < H; y += 32) { x.fillStyle = 'rgba(40,30,16,0.3)'; x.fillRect(0, y, W, 3); } })), roughness: 1 }); // o capim seco das cobertas (sapé), em camadas amarradas
  // pintura das esquadrias: cada cor tem a porta, a folha cega, a rótula e o madeirame (cunhal, cimalha, cachorro)
  const rot = rotulaTex(), door = doorTex(), shut = shutterTex();
  M.paint = {};
  for (const [k, c] of Object.entries(PAINT)) {
    M.paint[k] = {
      wood: std({ color: c, roughness: 0.75 }),
      door: std({ map: door, color: c, roughness: 0.75 }),
      shutter: std({ map: shut, color: c, roughness: 0.75 }),
      rotula: std({ map: rot, color: new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.25), roughness: 0.8 }),
    };
    M.paint[k].wood.userData.uv = { s: 1.5 };
  }
  M.glass = std({ map: glassTex(), roughness: 0.25, metalness: 0.3, emissive: 0xffb060, emissiveIntensity: 0 });
  M.window = M.glass; // (o céu acende as vidraças à noite)
  M.fire = new THREE.MeshBasicMaterial({ color: 0xffa040 });
  return M;
}

// ---------------- telhado de duas águas (ou de quatro), com o UV da telha descendo a água ----------------
// W: comprimento ao longo da cumeeira (x), D: largura de beiral a beiral (z), H: altura da cumeeira acima do beiral,
// kick: o contrafeito (a água "quebra" perto do beiral e fica mais deitada, como nas casas mineiras), hip: quatro águas
export function roofGeo(W, D, H, { thick = 0.16, kick = 0.22, hip = false, tile = 3.6 } = {}) {
  const a = W / 2, b = D / 2, rl = hip ? Math.max(0.1, a - b) : a;
  const prof = (t) => (t < kick ? t * (0.55 / kick) * 0.6 : 0.33 + (t - kick) / (1 - kick) * 0.67); // (o beiral mais deitado: 1/3 da altura no 1º quinto da água)
  const pos = [], uv = [], idx = [];
  const face = (eA, eB, rA, rB, slopeLen) => {
    const n = 6, base = pos.length / 3;
    for (let j = 0; j <= n; j++) for (let i = 0; i <= 1; i++) {
      const t = j / n, s = i; const ex = eA[0] + (eB[0] - eA[0]) * s, ez = eA[1] + (eB[1] - eA[1]) * s, rx = rA[0] + (rB[0] - rA[0]) * s, rz = rA[1] + (rB[1] - rA[1]) * s;
      const px = ex + (rx - ex) * t, pz = ez + (rz - ez) * t; pos.push(px, H * prof(t), pz);
      const along = Math.abs(eB[0] - eA[0]) > Math.abs(eB[1] - eA[1]) ? px : pz; uv.push(along / tile, (t * slopeLen) / tile);
    }
    for (let j = 0; j < n; j++) { const p = base + j * 2; idx.push(p, p + 2, p + 1, p + 1, p + 2, p + 3); }
  };
  const sl = Math.hypot(b, H);
  face([-a, b], [a, b], [-rl, 0], [rl, 0], sl); // frente
  face([a, -b], [-a, -b], [rl, 0], [-rl, 0], sl); // fundo
  if (hip) { const sl2 = Math.hypot(a - rl, H); face([a, b], [a, -b], [rl, 0], [rl, 0], sl2); face([-a, -b], [-a, b], [-rl, 0], [-rl, 0], sl2); }
  const top = new THREE.BufferGeometry(); top.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); top.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); top.setIndex(idx);
  top.computeVertexNormals();
  if (top.attributes.normal.getY(0) < 0) { const ix = top.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } top.computeVertexNormals(); } // (a face de fora para cima)
  const bot = top.clone(); bot.translate(0, -thick, 0); { const ix = bot.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 2]; ix[i + 2] = t; } bot.computeVertexNormals(); }
  return [top.toNonIndexed(), bot.toNonIndexed()];
}
// o oitão: o triângulo de parede que fecha a ponta do telhado de duas águas (do beiral à cumeeira)
export function gableGeo(D, H, kick = 0.22) {
  const b = D / 2, prof = (t) => (t < kick ? t * (0.55 / kick) * 0.6 : 0.33 + (t - kick) / (1 - kick) * 0.67);
  const sh = new THREE.Shape(); sh.moveTo(-b, 0); for (let i = 1; i <= 6; i++) { const t = i / 6; sh.lineTo(-b + b * t, H * prof(t)); } for (let i = 5; i >= 0; i--) { const t = i / 6; sh.lineTo(b - b * t, H * prof(t)); } sh.lineTo(-b, 0);
  return sh;
}

// ---------------- o construtor de um prédio ----------------
// const f = frame(B, x, y, z, ry): f.box(...) e f.geo(...) em coordenadas locais; f.solid(...) põe colisão girada.
export function frame(B, x, y, z, ry = 0) {
  const F = mat4(x, y, z, 0, ry, 0), c = Math.cos(ry), s = Math.sin(ry);
  const W = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const f = {
    x, y, z, ry, F, W,
    box(mat, w, h, d, lx, ly, lz, o = {}) { B.box(mat, w, h, d, lx, ly, lz, { frame: F, ...o }); },
    geo(g, mat, lx, ly, lz, o = {}) { const parts = Array.isArray(g) ? g : [g]; for (const p of parts) B.geo(p, mat, lx, ly, lz, { frame: F, ...o }); },
    solid(lx, lz, w, d, y0, y1, fill = false) { const [wx, wz] = W(lx, lz); addRotBox(wx, wz, w, d, ry, y + y0, y + y1, fill); },
    post(mat, lx, lz, h, r = 0.12, y0 = 0) { B.box(mat, r * 2, h, r * 2, lx, y0, lz, { frame: F }); const [wx, wz] = W(lx, lz); addCircle(wx, wz, r + 0.02, y + y0 - 1, y + y0 + h); },
    // parede de (x0,z0) a (x1,z1) com aberturas [[centro, largura, altura, peitoril]]; acima de cada abertura, a verga
    wall(mat, x0, z0, x1, z1, h, t = 0.4, gaps = [], o = {}) {
      const L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L, alongX = Math.abs(ux) > Math.abs(uz);
      const y0 = o.y0 || 0;
      const seg = (a0, a1, yb, yh) => { if (a1 - a0 < 0.02 || yh - yb < 0.02) return; const m = (a0 + a1) / 2, cx = x0 + ux * m, cz = z0 + uz * m, l = a1 - a0;
        if (alongX) f.box(mat, l, yh - yb, t, cx, yb, cz, { ...o, noGround: yb > y0 + 0.01 || o.noGround }); else f.box(mat, t, yh - yb, l, cx, yb, cz, { ...o, noGround: yb > y0 + 0.01 || o.noGround });
        if (yb < y0 + 1.9 && !o.noSolid) f.solid(cx, cz, alongX ? l : t, alongX ? t : l, yb - 0.6, yh); };
      let a = 0;
      for (const [cc, w, gh, sill = 0] of [...gaps].sort((p, q) => p[0] - q[0])) { seg(a, cc - w / 2, y0, y0 + h); if (sill > 0) seg(cc - w / 2, cc + w / 2, y0, y0 + sill); if (sill + gh < h) seg(cc - w / 2, cc + w / 2, y0 + sill + gh, y0 + h); a = cc + w / 2; }
      seg(a, L, y0, y0 + h);
    },
  };
  return f;
}

// ---------------- esquadrias na fachada (z = zf é a face de fora da parede; t a espessura) ----------------
// moldura de madeira pintada (ou de cantaria) em volta da abertura: ombreiras, verga e o peitoril saliente
export function moldura(f, mat, cx, y0, w, h, zf, { sill = true, verga = 0.16, larg = 0.14 } = {}) {
  f.box(mat, larg, h + verga, 0.08, cx - w / 2 - larg / 2, y0, zf + 0.03, { noGround: true });
  f.box(mat, larg, h + verga, 0.08, cx + w / 2 + larg / 2, y0, zf + 0.03, { noGround: true });
  f.box(mat, w + larg * 2 + 0.06, verga, 0.12, cx, y0 + h, zf + 0.05, { noGround: true }); // a verga, mais saliente
  if (sill) f.box(mat, w + larg * 2 + 0.12, 0.08, 0.2, cx, y0 - 0.08, zf + 0.06, { noGround: true }); // o peitoril
}
// janela: kind 'rotula' | 'cega' | 'vidro' (guilhotina) | 'aberta' (folhas abertas para dentro: vê-se o escuro)
export function janela(f, M, pt, kind, cx, y0, w, h, zf, t, { cant = null } = {}) {
  const fr = cant || pt.wood;
  moldura(f, fr, cx, y0, w, h, zf);
  const zin = zf - 0.12; // (a folha fica recuada no vão, não rente à fachada)
  if (kind === 'rotula') f.box(pt.rotula, w, h, 0.05, cx, y0, zin, { noGround: true });
  else if (kind === 'cega') f.box(pt.shutter, w, h, 0.05, cx, y0, zin, { noGround: true });
  else if (kind === 'vidro') { f.box(M.glass, w, h, 0.04, cx, y0, zin, { noGround: true }); f.box(pt.shutter, 0.06, h, w / 2, cx - w / 2 + 0.05, y0, zin - w / 4 - 0.02, { noGround: true }); f.box(pt.shutter, 0.06, h, w / 2, cx + w / 2 - 0.05, y0, zin - w / 4 - 0.02, { noGround: true }); }
  else { f.box(M.escuro, w, h, 0.04, cx, y0, zf - t + 0.04, { noGround: true }); }
  // o vão: o fundo da parede (a espessura) caiado, para não ver o vazio por dentro
  f.box(M.cal, 0.04, h, t - 0.14, cx - w / 2 + 0.02, y0, zf - (t - 0.14) / 2 - 0.12, { noGround: true }); f.box(M.cal, 0.04, h, t - 0.14, cx + w / 2 - 0.02, y0, zf - (t - 0.14) / 2 - 0.12, { noGround: true });
}
// porta de duas folhas: fechada, ou aberta (as folhas encostadas na parede de dentro e o vão livre)
export function porta(f, M, pt, cx, y0, w, h, zf, t, { open = false, cant = null } = {}) {
  moldura(f, cant || pt.wood, cx, y0, w, h, zf, { sill: false, larg: cant ? 0.2 : 0.14, verga: cant ? 0.24 : 0.16 });
  f.box(cant || M.pedra, w + 0.1, 0.06, t + 0.3, cx, y0 - 0.04, zf - t / 2 + 0.15, { noGround: true }); // a soleira de pedra
  if (!open) { f.box(pt.door, w, h, 0.07, cx, y0, zf - 0.14, { noGround: true }); return; }
  // folhas abertas, encostadas na parede de dentro
  f.box(pt.door, 0.07, h, w / 2, cx - w / 2 + 0.05, y0, zf - t - w / 4 - 0.02, { noGround: true });
  f.box(pt.door, 0.07, h, w / 2, cx + w / 2 - 0.05, y0, zf - t - w / 4 - 0.02, { noGround: true });
}
// sacada: o balcão de tábuas sobre cachorros, com o guarda-corpo de balaústres torneados (ou grade de ferro)
export function sacada(f, M, pt, cx, y0, w, zf, { ferro = false, prof = 0.6 } = {}) {
  f.box(pt.wood, w, 0.1, prof, cx, y0 - 0.1, zf + prof / 2, { noGround: true });
  for (let k = 0; k < 3; k++) { const x = cx - w / 2 + 0.2 + k * (w - 0.4) / 2; f.box(pt.wood, 0.12, 0.16, prof, x, y0 - 0.26, zf + prof / 2, { noGround: true }); } // os cachorros que seguram o balcão
  const top = y0 + 0.95, z = zf + prof - 0.04;
  f.box(pt.wood, w, 0.07, 0.1, cx, top, z, { noGround: true }); // o corrimão
  f.box(pt.wood, 0.08, 0.95, prof, cx - w / 2 + 0.04, y0, zf + prof / 2, { noGround: true }); f.box(pt.wood, 0.08, 0.95, prof, cx + w / 2 - 0.04, y0, zf + prof / 2, { noGround: true });
  if (ferro) { for (let x = cx - w / 2 + 0.12; x < cx + w / 2 - 0.08; x += 0.12) f.box(M.ferro, 0.02, 0.95, 0.02, x, y0, z, { noGround: true }); f.box(M.ferro, w - 0.1, 0.03, 0.03, cx, y0 + 0.12, z, { noGround: true }); }
  else for (let x = cx - w / 2 + 0.16; x < cx + w / 2 - 0.1; x += 0.15) { f.box(pt.wood, 0.055, 0.86, 0.055, x, y0, z, { noGround: true }); f.box(pt.wood, 0.085, 0.22, 0.085, x, y0 + 0.32, z, { noGround: true }); } // (o balaústre com o bojo no meio)
}
// verga em arco (canga): uma faixa curva de madeira ou de cantaria coroando o vão (nas casas da segunda metade do século)
export function arco(f, mat, cx, y, w, zf, rise = 0.24, th = 0.13) {
  const hs = w / 2, R = (hs * hs + rise * rise) / (2 * rise), a0 = Math.asin(hs / R), cy = rise - R, s = new THREE.Shape(), n = 10;
  for (let i = 0; i <= n; i++) { const t = -a0 + (2 * a0 * i) / n, p = [Math.sin(t) * (R + th), cy + Math.cos(t) * (R + th)]; if (i === 0) s.moveTo(p[0], p[1]); else s.lineTo(p[0], p[1]); }
  for (let i = n; i >= 0; i--) { const t = -a0 + (2 * a0 * i) / n; s.lineTo(Math.sin(t) * R, cy + Math.cos(t) * R); }
  f.geo(new THREE.ExtrudeGeometry(s, { depth: 0.09, bevelEnabled: false }), mat, cx, y - 0.02, zf - 0.02, { uv: false });
}
// beiral de cachorros: as pontas das vigas do telhado à vista sob a beira, de 60 em 60 cm
export function cachorrada(f, mat, x0, x1, y, zf, prof = 0.7) {
  for (let x = x0 + 0.25; x <= x1 - 0.2; x += 0.6) f.box(mat, 0.1, 0.14, prof, x, y, zf + prof / 2 - 0.05, { noGround: true });
  f.box(mat, x1 - x0, 0.05, prof + 0.05, (x0 + x1) / 2, y + 0.14, zf + prof / 2 - 0.05, { noGround: true }); // o guarda-pó (as tábuas sobre os cachorros)
}
