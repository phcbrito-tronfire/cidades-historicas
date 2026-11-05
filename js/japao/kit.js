// Kit de arquitetura japonesa do período Edo, feito em código (sem modelos baixados): materiais e peças que todos os
// prédios usam — telhados de quatro águas com a curva côncava e as pontas levantadas (palha grossa nas casas de
// fazenda, telha cinza nos templos e na residência, casca de cipreste no santuário), pilares e vigas de madeira,
// paredes de reboco de barro ou de cal, shōji de papel (que se acendem à noite), grade koshi das fachadas,
// tatame, varanda engawa, portas de correr, lanternas de pedra e torii.
// Cada prédio monta-se num "quadro" local (x para a direita, z para a frente, y para cima) girado no mundo.
import * as THREE from 'three';
import { mat4 } from '../comum/batcher.js';
import { addRotBox, addCircle } from '../comum/collision.js';
import { pbrSet, toTexture } from './textures.js';
import { fbm, mulberry32 } from '../comum/util.js';
import { stillWater } from '../comum/aguaparada.js';

const V3 = THREE.Vector3;
const cv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
const R = mulberry32(17);

// ---------------- texturas desenhadas ----------------
function thatchTex() { // palha de susuki: fios claros e escuros, em camadas
  return toTexture(cv(256, 256, (x, W, H) => {
    x.fillStyle = '#8a7650'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 4200; i++) { const px = R() * W, py = R() * H, l = 6 + R() * 22, v = R(); x.strokeStyle = v < 0.35 ? 'rgba(60,46,28,0.55)' : v < 0.8 ? 'rgba(170,148,104,0.5)' : 'rgba(210,190,140,0.45)'; x.lineWidth = 1 + R(); x.beginPath(); x.moveTo(px, py); x.lineTo(px + (R() - 0.5) * 3, py + l); x.stroke(); }
    for (let y = 0; y < H; y += 32) { x.fillStyle = 'rgba(40,30,18,0.25)'; x.fillRect(0, y, W, 3); } // as camadas amarradas
  }));
}
function kawaraTex() { // telha cinza (kawara): canais e capas, fileiras
  return toTexture(cv(256, 256, (x, W, H) => {
    x.fillStyle = '#5a5c60'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 16; i++) { const g = x.createLinearGradient(i * 16, 0, i * 16 + 16, 0); g.addColorStop(0, '#3a3c40'); g.addColorStop(0.35, '#7a7c82'); g.addColorStop(0.6, '#6a6c70'); g.addColorStop(1, '#2e3034'); x.fillStyle = g; x.fillRect(i * 16, 0, 16, H); }
    for (let y = 0; y < H; y += 21) { x.fillStyle = 'rgba(20,20,24,0.45)'; x.fillRect(0, y, W, 2); }
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '0,0,0'},0.05)`; x.fillRect(R() * W, R() * H, 3, 3); }
  }));
}
function barkTex() { // casca de cipreste (hiwada): o telhado do santuário, castanho e fino
  return toTexture(cv(256, 256, (x, W, H) => { x.fillStyle = '#6a4a34'; x.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 3) { x.fillStyle = `rgba(${R() < 0.5 ? '40,26,16' : '140,100,70'},${0.2 + R() * 0.3})`; x.fillRect(0, y, W, 1 + R() * 2); } }));
}
function shojiTex() { // papel de arroz numa grade fina de madeira
  return toTexture(cv(128, 128, (x, W, H) => {
    x.fillStyle = '#efe8d6'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 300; i++) { x.fillStyle = 'rgba(180,160,120,0.06)'; x.fillRect(R() * W, R() * H, 6, 2); }
    x.fillStyle = '#5a4030'; for (let i = 0; i <= 4; i++) x.fillRect(i * (W / 4) - 1.5, 0, 3, H); for (let j = 0; j <= 6; j++) x.fillRect(0, j * (H / 6) - 1.5, W, 3);
  }));
}
function tatamiTex() { // tatame: palha de igusa em fiozinhos, com a borda de pano escuro
  return toTexture(cv(256, 128, (x, W, H) => {
    x.fillStyle = '#c8bf84'; x.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 2) { x.fillStyle = `rgba(${y % 4 ? '150,140,90' : '210,200,150'},0.5)`; x.fillRect(0, y, W, 1); }
    x.fillStyle = '#2a3a2c'; x.fillRect(0, 0, W, 7); x.fillRect(0, H - 7, W, 7);
  }));
}
function koshiTex() { // grade de ripas verticais da fachada das casas da rua (koshi), sobre o escuro de dentro
  return toTexture(cv(128, 128, (x, W, H) => { x.fillStyle = '#140e0a'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 16; i++) { x.fillStyle = '#6a4a32'; x.fillRect(i * 8, 0, 5, H); x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(i * 8, 0, 1, H); } x.fillStyle = '#5a3e2a'; x.fillRect(0, 0, W, 6); x.fillRect(0, H - 6, W, 6); }));
}
function namakoTex() { // parede namako dos armazéns: placas de telha cinza com as juntas brancas em diagonal
  return toTexture(cv(128, 128, (x, W, H) => { x.fillStyle = '#4a4c50'; x.fillRect(0, 0, W, H); x.strokeStyle = '#f0ece0'; x.lineWidth = 5;
    for (let i = -2; i < 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64 + 128, 128); x.stroke(); x.beginPath(); x.moveTo(i * 64 + 128, 0); x.lineTo(i * 64, 128); x.stroke(); } }));
}
function noren(color, mark) { // cortina de loja (noren) com o símbolo da casa
  return toTexture(cv(128, 96, (x, W, H) => { x.fillStyle = color; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(255,255,255,0.85)'; x.font = 'bold 44px serif'; x.textAlign = 'center'; x.fillText(mark, W / 2, 62);
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(W / 3 - 1, 18, 2, H); x.fillRect(2 * W / 3 - 1, 18, 2, H); }));
}
function banner(color, text) { // estandarte vertical (nobori) das confrarias e das lojas
  return toTexture(cv(64, 256, (x, W, H) => { x.fillStyle = color; x.fillRect(0, 0, W, H); x.fillStyle = '#f6f0e0'; x.font = 'bold 40px serif'; x.textAlign = 'center';
    [...text].forEach((ch, i) => x.fillText(ch, W / 2, 56 + i * 50)); x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(0, 0, 6, H); }));
}
function scrollTex() { // o pergaminho do tokonoma: o Fuji em tinta preta
  return toTexture(cv(64, 160, (x, W, H) => { x.fillStyle = '#efe6cc'; x.fillRect(0, 0, W, H); x.fillStyle = '#6a3a2a'; x.fillRect(0, 0, W, 10); x.fillRect(0, H - 10, W, 10);
    x.fillStyle = 'rgba(30,30,36,0.75)'; x.beginPath(); x.moveTo(8, 110); x.quadraticCurveTo(26, 60, 32, 52); x.quadraticCurveTo(38, 60, 56, 110); x.fill(); x.fillStyle = '#efe6cc'; x.beginPath(); x.moveTo(26, 62); x.lineTo(32, 52); x.lineTo(38, 62); x.lineTo(34, 66); x.lineTo(30, 63); x.fill();
    x.fillStyle = '#b03020'; x.beginPath(); x.arc(48, 30, 6, 0, 7); x.fill(); }));
}

// ---------------- materiais ----------------
export function createMaterials(tex) {
  const P = tex.pbr;
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
  const M = {};
  M.wood = std({ ...pbrSet(P.weathered_planks, 1), color: 0x9a7a5c }); M.wood.userData.uv = { s: 2 }; // madeira clara envelhecida (tábuas)
  M.darkWood = std({ ...pbrSet(P.madeira_clara, 1), color: 0x5a3e2c }); M.darkWood.userData.uv = { s: 2 }; // pilares e vigas escurecidos pela fumaça
  M.blackWood = std({ ...pbrSet(P.madeira_clara, 1), color: 0x2a201a, roughness: 0.7 }); M.blackWood.userData.uv = { s: 2 }; // madeira tratada (yakisugi) e laca preta
  M.cedar = std({ ...pbrSet(P.madeira_clara, 1), color: 0xc89a6a }); M.cedar.userData.uv = { s: 2 }; // cipreste novo (o santuário)
  M.vermilion = std({ color: 0xc23a22, roughness: 0.55 }); // laca vermelha (shu) dos torii e do santuário
  M.vermilionDark = std({ color: 0x7a2416, roughness: 0.6 });
  M.plaster = std({ ...pbrSet(P.cal_branca, 1), color: 0xf6f2e8, roughness: 0.9 }); M.plaster.userData.uv = { s: 3 }; // reboco de cal (shikkui)
  M.mud = std({ ...pbrSet(P.clay_plaster, 1), color: 0xc8a478, roughness: 0.95 }); M.mud.userData.uv = { s: 3 }; // reboco de barro das casas simples
  M.stone = std({ ...pbrSet(P.rock_wall_08, 1), color: 0xa8a49c }); M.stone.userData.uv = { s: 3 }; // muro de pedra (ishigaki) e escadarias
  M.stoneLight = std({ ...pbrSet(P.pedra_clara, 1), color: 0xc8c4b8 }); M.stoneLight.userData.uv = { s: 2 }; // lanternas e lajes
  M.lava = std({ ...pbrSet(P.rock_boulder_dry, 1), color: 0x5a4a46 }); M.lava.userData.uv = { s: 2 }; // pedra vulcânica (as cabanas da montanha)
  M.earthFloor = std({ ...pbrSet(P.dry_ground_rocks, 1), color: 0x8a7458, roughness: 1 }); M.earthFloor.userData.uv = { s: 3 }; // doma: o chão de terra batida da entrada
  M.thatch = std({ map: thatchTex(), roughness: 1 }); M.thatch.userData.uv = { s: 3 };
  M.kawara = std({ map: kawaraTex(), roughness: 0.6, metalness: 0.15 }); M.kawara.userData.uv = { s: 3.4 };
  M.bark = std({ map: barkTex(), roughness: 0.95 }); M.bark.userData.uv = { s: 2.5 };
  M.shoji = std({ map: shojiTex(), emissive: 0xffb060, emissiveIntensity: 0, roughness: 0.95 }); M.shoji.userData.uv = { s: 1.8 };
  M.window = M.shoji; // (o céu acende os shōji à noite)
  M.tatami = std({ map: tatamiTex(), roughness: 0.95 }); M.tatami.userData.uv = { s: 1.8, sv: 0.9 };
  M.koshi = std({ map: koshiTex(), roughness: 0.8 }); M.koshi.userData.uv = { s: 1.6 };
  M.namako = std({ map: namakoTex(), roughness: 0.6 }); M.namako.userData.uv = { s: 1.2 };
  M.fusuma = std({ color: 0xe8dcc0, roughness: 0.9 }); // portas de correr de papel grosso, pintadas
  M.straw = std({ color: 0xc8b070, roughness: 1 });
  M.netting = std({ map: toTexture(cv(64, 64, (x, W, H) => { x.fillStyle = '#5a5040'; x.fillRect(0, 0, W, H); x.strokeStyle = '#c8bca0'; x.lineWidth = 2; for (let i = 0; i < W; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 32, H); x.stroke(); x.beginPath(); x.moveTo(i + 32, 0); x.lineTo(i, H); x.stroke(); } })), side: THREE.DoubleSide, roughness: 1 }); M.netting.userData.uv = { s: 1 }; // a rede de pesca // corda de palha (shimenawa), tapetes, fardos
  M.paper = std({ color: 0xf6f2ea, roughness: 0.9 });
  M.dark = std({ color: 0x15100c, roughness: 1 });
  M.iron = std({ color: 0x2a2a2c, metalness: 0.6, roughness: 0.5 });
  M.bronze = std({ color: 0x6a5a3a, metalness: 0.8, roughness: 0.45 }); // sino e incensário (bronze escuro)
  M.gold = std({ color: 0xe8b84a, metalness: 1, roughness: 0.3 });
  M.water = stillWater(std({ color: 0x3f6e6e, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.88 }), { scale: 0.35, strength: 0.75 });
  M.moss = std({ map: toTexture(cv(128, 128, (x, W, H) => { x.fillStyle = '#3e5a30'; x.fillRect(0, 0, W, H); for (let i = 0; i < 1400; i++) { const v = R(); x.fillStyle = v < 0.45 ? 'rgba(20,34,16,0.6)' : v < 0.8 ? 'rgba(90,120,60,0.55)' : 'rgba(140,165,90,0.45)'; x.beginPath(); x.ellipse(R() * W, R() * H, 1.5 + R() * 3, 1 + R() * 2, R() * 3, 0, 7); x.fill(); } })), roughness: 1 }); M.moss.userData.uv = { s: 1.5 }; // folhagem (cercas vivas, copas podadas)
  M.cedarLeaf = std({ color: 0x8aa07a, map: M.moss.map, roughness: 1 }); // as copas dos cedros gigantes, verde-escuro
  M.gravel = std({ ...pbrSet(P.rocky_trail, 1), color: 0xc8c2b4, roughness: 1 }); M.gravel.userData.uv = { s: 2.5 }; // cascalho claro dos pátios de santuário e templo
  M.fire = new THREE.MeshBasicMaterial({ color: 0xffa040 });
  M.flame = new THREE.MeshBasicMaterial({ color: 0xffb050 });
  M.lantern = std({ color: 0xf2e6c8, emissive: 0xffa040, emissiveIntensity: 0.15, roughness: 0.9 }); // lanterna de papel (chōchin)
  M.redCloth = std({ color: 0xb0281e, roughness: 0.95 }); // o banco vermelho das casas de chá
  M.noren = [['#26344a', '宿'], ['#3a2a22', '茶'], ['#2a3a2a', '蕎'], ['#4a2a2a', '酒'], ['#2a3044', '米'], ['#3a3a3a', '湯']].map(([c, t]) => std({ map: noren(c, t), side: THREE.DoubleSide, roughness: 0.95 }));
  M.nobori = [['#f2ece0', '富士講'], ['#24305a', '富士山'], ['#a02a20', '浅間'], ['#2a4a30', '御師']].map(([c, t]) => std({ map: banner(c, t), side: THREE.DoubleSide, roughness: 0.95 }));
  M.nobori[0].map = (() => { const t = banner('#f2ece0', '富士講'); return t; })();
  M.scroll = std({ map: scrollTex(), roughness: 0.9 });
  return M;
}

// ---------------- telhados ----------------
// telhado de quatro águas (yosemune) com perfil côncavo e as quinas levantadas (sori): base no beiral (y = 0),
// largura W (x) e fundo D (z) já com o beiral; H = altura da cumeeira acima do beiral; thick = espessura.
// gable = true: duas águas (kirizuma), sem as águas dos lados. irimoya: as águas dos lados só até a metade e um
// frontão em cima (o telhado típico de templo e de casa de samurai).
export function roofGeo(W, D, H, { thick = 0.25, sori = 0.25, sag = 1.35, gable = false, irimoya = false, seg = 8 } = {}) {
  const a = W / 2, b = D / 2, rl = gable ? a : Math.max(0, a - b * (irimoya ? 0.55 : 1)); // meia cumeeira
  const pos = [], idx = [];
  const prof = (t) => Math.pow(t, sag); // côncavo: mais íngreme perto da cumeeira
  const face = (eA, eB, rA, rB, lift) => { // quadrilátero do beiral (eA..eB) até a cumeeira (rA..rB)
    const base = pos.length / 3;
    for (let j = 0; j <= seg; j++) for (let i = 0; i <= seg; i++) {
      const s = i / seg, t = j / seg;
      const ex = eA[0] + (eB[0] - eA[0]) * s, ez = eA[1] + (eB[1] - eA[1]) * s, rx = rA[0] + (rB[0] - rA[0]) * s, rz = rA[1] + (rB[1] - rA[1]) * s;
      const up = lift ? sori * Math.pow(Math.abs(2 * s - 1), 3) * (1 - t) : 0;
      pos.push(ex + (rx - ex) * t, H * prof(t) + up, ez + (rz - ez) * t);
    }
    for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) { const p = base + j * (seg + 1) + i; idx.push(p, p + seg + 1, p + 1, p + 1, p + seg + 1, p + seg + 2); }
  };
  face([-a, b], [a, b], [-rl, 0], [rl, 0], true); // frente
  face([a, -b], [-a, -b], [rl, 0], [-rl, 0], true); // fundo
  if (!gable) { face([a, b], [a, -b], [rl, 0], [rl, 0], true); face([-a, -b], [-a, b], [-rl, 0], [-rl, 0], true); } // lados
  const top = new THREE.BufferGeometry(); top.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); top.setIndex(idx); top.computeVertexNormals();
  // a espessura: a mesma superfície descida e virada para baixo, e a faixa do beiral
  const bot = top.clone(); bot.translate(0, -thick, 0); { const ix = bot.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 2]; ix[i + 2] = t; } bot.computeVertexNormals(); }
  const rim = []; const ring = gable ? [[-a, b], [a, b], [a, -b], [-a, -b]] : [[-a, b], [a, b], [a, -b], [-a, -b], [-a, b]];
  const upAt = (x, z) => { const s = Math.abs(x) / a, s2 = Math.abs(z) / b; return sori * Math.pow(Math.max(s, gable ? 0 : s2), 3); };
  const strips = gable ? [[[-a, b], [a, b]], [[a, -b], [-a, -b]]] : ring.slice(0, -1).map((p, i) => [p, ring[i + 1]]);
  for (const [[x0, z0], [x1, z1]] of strips) {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const s0 = i / n, s1 = (i + 1) / n, ax = x0 + (x1 - x0) * s0, az = z0 + (z1 - z0) * s0, bx = x0 + (x1 - x0) * s1, bz = z0 + (z1 - z0) * s1;
      const ya = upAt(ax, az), yb = upAt(bx, bz);
      rim.push(ax, ya, az, bx, yb, bz, bx, yb - thick, bz, ax, ya, az, bx, yb - thick, bz, ax, ya - thick, az);
    }
  }
  const rimG = new THREE.BufferGeometry(); rimG.setAttribute('position', new THREE.Float32BufferAttribute(rim, 3)); rimG.computeVertexNormals();
  const parts = [top.toNonIndexed(), bot.toNonIndexed(), rimG];
  if (gable || irimoya) { // os frontões (triângulos de madeira) nas pontas
    const gy = gable ? 0 : H * prof(0.7), gx = gable ? a : rl + 0.04; // (no irimoya: o frontão fica no alto, sobre as águas da frente e do fundo)
    for (const sd of [-1, 1]) {
      const g = new THREE.BufferGeometry(), x = sd * (gable ? gx - 0.05 : gx), hb = gable ? b : b * 0.3;
      g.setAttribute('position', new THREE.Float32BufferAttribute([x, gy, -hb, x, gy, hb, x, H, 0].concat(sd > 0 ? [] : []), 3)); if (sd < 0) g.index = null;
      const p = g.attributes.position; if (sd < 0) { const t = [p.getX(0), p.getY(0), p.getZ(0)]; p.setXYZ(0, p.getX(1), p.getY(1), p.getZ(1)); p.setXYZ(1, ...t); }
      g.computeVertexNormals(); parts.push(g);
    }
  }
  for (const g of parts) { if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); if (g.index) g.index = null; }
  return parts.map((g) => g.index ? g.toNonIndexed() : g);
}

// ---------------- o construtor de um prédio ----------------
// const b = frame(B, x, y, z, ry): b.box(...) e b.geo(...) em coordenadas locais; b.solid(...) põe colisão girada.
export function frame(B, x, y, z, ry = 0) {
  const F = mat4(x, y, z, 0, ry, 0), c = Math.cos(ry), s = Math.sin(ry);
  const W = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const f = {
    x, y, z, ry, F, W,
    box(mat, w, h, d, lx, ly, lz, o = {}) { B.box(mat, w, h, d, lx, ly, lz, { frame: F, ...o }); },
    geo(g, mat, lx, ly, lz, o = {}) { const parts = Array.isArray(g) ? g : [g]; for (const p of parts) B.geo(p, mat, lx, ly, lz, { frame: F, ...o }); },
    solid(lx, lz, w, d, y0, y1, fill = false) { const [wx, wz] = W(lx, lz); addRotBox(wx, wz, w, d, ry, y + y0, y + y1, fill); },
    post(mat, lx, lz, h, r = 0.12, y0 = 0) { B.box(mat, r * 2, h, r * 2, lx, y0, lz, { frame: F }); const [wx, wz] = W(lx, lz); addCircle(wx, wz, r + 0.02, y + y0 - 1, y + y0 + h); },
    roof(mat, W2, D2, H, ly, o = {}, lx = 0, lz = 0) { f.geo(roofGeo(W2, D2, H, o), mat, lx, ly, lz, { uv: mat.userData.uv }); },
    // parede de (x0,z0) a (x1,z1) com aberturas [[centro, largura, altura]]; acima da abertura, a verga
    wall(mat, x0, z0, x1, z1, h, t = 0.14, gaps = [], o = {}) {
      const L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L, alongX = Math.abs(ux) > Math.abs(uz);
      const seg = (a0, a1, yb, yh) => { if (a1 - a0 < 0.02) return; const m = (a0 + a1) / 2, cx = x0 + ux * m, cz = z0 + uz * m, l = a1 - a0;
        if (alongX) f.box(mat, l, yh - yb, t, cx, yb, cz, o); else f.box(mat, t, yh - yb, l, cx, yb, cz, o);
        if (yb < 1.6) f.solid(cx, cz, alongX ? l : t, alongX ? t : l, yb - 0.6, yh); };
      const y0 = o.y0 || 0; let a = 0;
      for (const [c, w, gh] of [...gaps].sort((p, q) => p[0] - q[0])) { seg(a, c - w / 2, y0, y0 + h); if (gh < h) seg(c - w / 2, c + w / 2, y0 + gh, y0 + h); a = c + w / 2; }
      seg(a, L, y0, y0 + h);
    },
  };
  return f;
}

// ---------------- peças soltas ----------------
// lanterna de pedra (tōrō): base, haste, câmara do fogo, chapéu e a joia no alto
export function toro(B, M, out, x, y, z, s = 1, lit = true) {
  B.box(M.stoneLight, 0.62 * s, 0.25 * s, 0.62 * s, x, y, z);
  B.geo(new THREE.CylinderGeometry(0.13 * s, 0.16 * s, 0.9 * s, 8), M.stoneLight, x, y + 0.7 * s, z, { uv: false });
  B.box(M.stoneLight, 0.5 * s, 0.12 * s, 0.5 * s, x, y + 1.15 * s, z);
  B.box(M.stoneLight, 0.36 * s, 0.34 * s, 0.36 * s, x, y + 1.27 * s, z); B.box(M.dark, 0.2 * s, 0.18 * s, 0.38 * s, x, y + 1.34 * s, z); B.box(M.dark, 0.38 * s, 0.18 * s, 0.2 * s, x, y + 1.34 * s, z);
  B.geo(new THREE.ConeGeometry(0.5 * s, 0.32 * s, 6), M.stoneLight, x, y + 1.77 * s, z, { uv: false });
  B.geo(new THREE.SphereGeometry(0.08 * s, 8, 6), M.stoneLight, x, y + 1.98 * s, z, { uv: false });
  addCircle(x, z, 0.36 * s, y - 1, y + 2 * s);
  if (lit) out.torches.push(new V3(x, y + 1.25 * s, z));
}
// torii: dois pilares, a viga de cima curva (kasagi) e a de baixo (nuki); myōjin (vermelho) ou shinmei (cedro)
export function torii(B, M, x, y, z, ry, w = 6, h = 6.4, kind = 'myojin') {
  const f = frame(B, x, y, z, ry), mat = kind === 'shinmei' ? M.cedar : M.vermilion, r = 0.22 * w / 6, s = w / 6; // (tudo na proporção da largura: o torii pequeno de Inari ficava com a viga e a placa do tamanho do grande)
  for (const sd of [-1, 1]) { f.geo(new THREE.CylinderGeometry(r * 0.88, r, h, 14), mat, sd * w / 2, h / 2, 0, { uv: false }); f.box(M.blackWood, r * 2.4, 0.5, r * 2.4, sd * w / 2, 0, 0); f.box(M.stone || M.blackWood, r * 2.6, 3.5, r * 2.6, sd * w / 2, -3.5, 0); f.solid(sd * w / 2, 0, r * 2.2, r * 2.2, -1, h); }
  f.box(mat, w + 1.0 * s, 0.32 * s, 0.34 * s, 0, h - 0.95 * s, 0); // nuki
  if (kind === 'myojin') { // kasagi curvo, preto em cima, com as pontas levantadas
    const k = roofGeo(w + 2.4 * s, 0.5 * s, -0.05 * s, { thick: 0.42 * s, sori: 0.45 * s, sag: 1, gable: true, seg: 10 });
    f.geo(k, M.blackWood, 0, h + 0.15 * s, 0, { uv: false });
    f.box(mat, w + 1.8 * s, 0.3 * s, 0.4 * s, 0, h - 0.25 * s, 0);
    f.box(mat, 0.3 * s, 0.6 * s, 0.18 * s, 0, h - 0.65 * s, 0); // a placa do meio (gakuzuka)
    f.box(M.blackWood, 0.9 * s, 1.1 * s, 0.12 * s, 0, h - 0.95 * s, 0.18 * s); f.box(M.gold, 0.6 * s, 0.8 * s, 0.02 * s, 0, h - 0.8 * s, 0.25 * s); // a placa com o nome
  } else f.box(mat, w + 1.6 * s, 0.36 * s, 0.42 * s, 0, h, 0);
}
// corda sagrada (shimenawa) com as tiras de papel (shide) em ziguezague
export function shimenawa(B, M, x0, y, z0, x1, z1, thick = 0.18) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(4, Math.round(L * 2));
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, sag = Math.sin(t * Math.PI) * L * 0.06; B.geo(new THREE.SphereGeometry(thick, 6, 4), M.straw, x0 + (x1 - x0) * t, y - sag, z0 + (z1 - z0) * t, { sx: 1 + L / n * 2.5, uv: false, ry: Math.atan2(-(z1 - z0), x1 - x0) }); }
  for (let k = 1; k < 4; k++) { const t = k / 4; B.box(M.paper, 0.12, 0.5, 0.02, x0 + (x1 - x0) * t, y - Math.sin(t * Math.PI) * L * 0.06 - 0.6, z0 + (z1 - z0) * t, { ry: Math.atan2(-(z1 - z0), x1 - x0), noGround: true }); }
}
// estandarte vertical num mastro
export function nobori(B, M, x, y, z, ry, k = 0) {
  B.geo(new THREE.CylinderGeometry(0.04, 0.05, 5.2, 6), M.darkWood, x, y + 2.6, z, { uv: false });
  B.box(M.nobori[k % M.nobori.length], 0.02, 3.4, 0.75, x + Math.sin(ry) * 0.42, y + 1.4, z + Math.cos(ry) * 0.42, { ry, uv: false, noGround: true }); B.box(M.darkWood, 0.04, 0.04, 0.85, x + Math.sin(ry) * 0.42, y + 4.8, z + Math.cos(ry) * 0.42, { ry, noGround: true }); // o pano preso no mastro e na travessa de cima
  addCircle(x, z, 0.08, y - 1, y + 5);
}
// lanterna de papel pendurada no beiral
export function chochin(B, M, out, x, y, z) {
  B.geo(new THREE.SphereGeometry(0.22, 10, 8), M.lantern, x, y, z, { sy: 1.35, uv: false });
  B.box(M.blackWood, 0.3, 0.05, 0.3, x, y + 0.27, z, { noGround: true }); B.box(M.blackWood, 0.3, 0.05, 0.3, x, y - 0.33, z, { noGround: true });
  out.torches.push(new V3(x, y - 0.1, z));
}

void fbm;
