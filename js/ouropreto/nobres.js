// Os interiores das duas casas de poder de Vila Rica em 1789:
// - a Casa dos Contos (1782–84), do contratador João Rodrigues de Macedo: o vestíbulo lajeado com a escadaria de pedra,
//   o escritório do contrato (a balança do ouro, o cofre de ferro, os livros), o depósito, a sala dos caixeiros, a
//   senzala no térreo dos fundos; em cima, o andar nobre (salão, sala de jantar, quarto). Debaixo da escada, o cubículo
//   — em junho de 1789 a casa vira prisão dos inconfidentes, e é ali que Cláudio Manuel da Costa é achado morto em 4 de
//   julho (o cubículo fica sóbrio: o catre, a bilha, o banquinho, a vela).
// - o Palácio dos Governadores: o vestíbulo com a escadaria de três lanços (um sobe, dois voltam), o corpo da guarda e
//   a sala das armas, a secretaria do governo; em cima, a sala do dossel (as armas reais sobre a cadeira vazia: o
//   governador representa a rainha), o gabinete com o mapa da capitania e a capela.
// Tudo no quadro (f) de cada prédio: x ao longo da fachada, z para a frente (a rua), y a partir do piso.
import * as THREE from 'three';
import { mulberry32 } from '../comum/util.js';
import { toTexture } from './textures.js';
import { interiorMaterials, colunaTorsa } from './interiores.js';

const R = mulberry32(1782);
const cv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
const V2 = THREE.Vector2;
const lathe = (pts, seg = 12) => new THREE.LatheGeometry(pts.map(([r, y]) => new V2(r, y)), seg);

// ---------------- texturas ----------------
function livrosTex() { // lombadas de livros encadernados em couro e pergaminho, em três prateleiras
  return toTexture(cv(256, 256, (x, W, H) => {
    x.fillStyle = '#2a1a10'; x.fillRect(0, 0, W, H);
    for (let r = 0; r < 3; r++) { const y0 = r * (H / 3) + 6, h0 = H / 3 - 12; let px = 4;
      while (px < W - 6) { const bw = 8 + R() * 12, bh = h0 * (0.72 + R() * 0.28), c = R(); x.fillStyle = c < 0.35 ? '#6a3a20' : c < 0.6 ? '#4a2a18' : c < 0.8 ? '#d8c8a0' : '#7a2a1a';
        x.fillRect(px, y0 + h0 - bh, bw - 1, bh); x.fillStyle = 'rgba(220,180,90,0.7)'; x.fillRect(px + 1, y0 + h0 - bh + bh * 0.18, bw - 3, 2); x.fillRect(px + 1, y0 + h0 - bh + bh * 0.7, bw - 3, 2);
        x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(px + bw - 2, y0 + h0 - bh, 1, bh); px += bw; }
      x.fillStyle = '#5a3a22'; x.fillRect(0, y0 + h0, W, 6); }
  }));
}
function mapaTex() { // a carta da capitania: pergaminho, rios em azul, serras em traço, vilas em vermelho, a rosa dos ventos
  return toTexture(cv(512, 384, (x, W, H) => {
    const g = x.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7); g.addColorStop(0, '#e8dcb8'); g.addColorStop(1, '#b89a68'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#6a4a2a'; x.lineWidth = 6; x.strokeRect(10, 10, W - 20, H - 20); x.lineWidth = 1.5; x.strokeRect(20, 20, W - 40, H - 40);
    x.strokeStyle = 'rgba(60,90,130,0.85)'; x.lineWidth = 2.2;
    for (let k = 0; k < 5; k++) { let px = 40 + R() * 80, py = 40 + R() * (H - 80); x.beginPath(); x.moveTo(px, py); for (let i = 0; i < 14; i++) { px += 22 + R() * 14; py += (R() - 0.45) * 30; x.lineTo(px, py); if (px > W - 50) break; } x.stroke(); }
    x.strokeStyle = 'rgba(90,60,30,0.7)'; x.lineWidth = 1.2;
    for (let k = 0; k < 40; k++) { const px = 40 + R() * (W - 80), py = 40 + R() * (H - 80); x.beginPath(); x.moveTo(px - 6, py + 4); x.lineTo(px, py - 5); x.lineTo(px + 6, py + 4); x.stroke(); }
    x.fillStyle = '#8a2a1a'; for (let k = 0; k < 9; k++) { const px = 60 + R() * (W - 120), py = 60 + R() * (H - 120); x.beginPath(); x.arc(px, py, 3.5, 0, 7); x.fill(); x.fillRect(px + 6, py - 2, 18 + R() * 16, 3); }
    x.save(); x.translate(W - 70, H - 70); x.fillStyle = 'rgba(80,50,25,0.85)'; for (let k = 0; k < 8; k++) { x.rotate(Math.PI / 4); x.beginPath(); x.moveTo(0, 0); x.lineTo(5, -6); x.lineTo(0, k % 2 ? -26 : -40); x.lineTo(-5, -6); x.fill(); } x.restore();
    x.fillStyle = 'rgba(70,40,20,0.9)'; x.fillRect(W / 2 - 90, 28, 180, 16); x.fillStyle = '#e8dcb8'; x.fillRect(W / 2 - 84, 32, 168, 8);
  }));
}
function armasTex() { // as armas reais de Portugal bordadas no pano do dossel: o escudo com a bordadura dos castelos, as cinco quinas, a coroa
  return toTexture(cv(256, 320, (x, W, H) => {
    x.fillStyle = '#7a1418'; x.fillRect(0, 0, W, H); for (let i = 0; i < W; i += 4) { x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(i, 0, 2, H); }
    const cx = W / 2, top = 96, sw = 150, sh = 170;
    const shield = (inset) => { x.beginPath(); x.moveTo(cx - sw / 2 + inset, top + inset); x.lineTo(cx + sw / 2 - inset, top + inset); x.lineTo(cx + sw / 2 - inset, top + sh * 0.62); x.quadraticCurveTo(cx + sw / 2 - inset, top + sh - inset, cx, top + sh - inset); x.quadraticCurveTo(cx - sw / 2 + inset, top + sh - inset, cx - sw / 2 + inset, top + sh * 0.62); x.closePath(); };
    x.fillStyle = '#d8a838'; shield(-6); x.fill(); x.fillStyle = '#b82020'; shield(0); x.fill(); x.fillStyle = '#f0ece0'; shield(20); x.fill();
    x.fillStyle = '#e8c050'; for (let k = 0; k < 7; k++) { const a = k / 6, px = k < 3 ? cx - sw / 2 + 10 : k < 5 ? cx + sw / 2 - 10 : cx + (k - 5.5) * 50, py = k < 3 ? top + 14 + a * 3 * 38 : k < 5 ? top + 14 + (k - 3) * 52 : top + sh - 22; x.fillRect(px - 6, py - 6, 12, 12); x.fillRect(px - 7, py - 9, 3, 3); x.fillRect(px - 1.5, py - 9, 3, 3); x.fillRect(px + 4, py - 9, 3, 3); }
    x.fillStyle = '#1e3a8a'; for (const [dx, dy] of [[0, -40], [-34, 0], [0, 0], [34, 0], [0, 40]]) { const qx = cx + dx, qy = top + sh / 2 - 6 + dy; x.beginPath(); x.moveTo(qx - 12, qy - 15); x.lineTo(qx + 12, qy - 15); x.lineTo(qx + 12, qy + 6); x.quadraticCurveTo(qx, qy + 18, qx - 12, qy + 6); x.closePath(); x.fill(); x.fillStyle = '#f0ece0'; for (const [ex, ey] of [[-6, -9], [6, -9], [0, -2], [-6, 5], [6, 5]]) { x.beginPath(); x.arc(qx + ex, qy + ey, 2, 0, 7); x.fill(); } x.fillStyle = '#1e3a8a'; }
    x.fillStyle = '#d8a838'; x.fillRect(cx - 50, top - 30, 100, 18); for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(cx - 40 + k * 20, top - 34, 8, Math.PI, 0); x.fill(); } x.fillRect(cx - 3, top - 62, 6, 22); x.fillRect(cx - 10, top - 54, 20, 5); // a coroa fechada com a cruz
    x.strokeStyle = '#d8a838'; x.lineWidth = 3; x.strokeRect(10, 10, W - 20, H - 20);
  }));
}
function tapeteTex() { // tapete de lã de pontos miúdos (do tipo de Arraiolos): barra de rosetas, miolo de losangos e o medalhão, cores de tinta vegetal, gasto
  return toTexture(cv(512, 512, (x, W, H) => {
    const ver = '#5e2219', anil = '#2c2a44', ocre = '#a8854a', creme = '#cdbb94', verde = '#4a5234';
    x.fillStyle = ver; x.fillRect(0, 0, W, H);
    x.fillStyle = anil; x.fillRect(0, 0, W, 46); x.fillRect(0, H - 46, W, 46); x.fillRect(0, 0, 46, H); x.fillRect(W - 46, 0, 46, H); // a barra
    x.strokeStyle = ocre; x.lineWidth = 3; x.strokeRect(8, 8, W - 16, H - 16); x.strokeRect(50, 50, W - 100, H - 100);
    const roseta = (cx, cy, r, c1, c2) => { x.fillStyle = c1; for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4; x.beginPath(); x.ellipse(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.42, r * 0.18, a, 0, 7); x.fill(); } x.fillStyle = c2; x.beginPath(); x.arc(cx, cy, r * 0.25, 0, 7); x.fill(); };
    for (let i = 23; i < W; i += 30) { roseta(i, 23, 11, creme, ver); roseta(i, H - 23, 11, creme, ver); roseta(23, i, 11, creme, ver); roseta(W - 23, i, 11, creme, ver); }
    // o miolo: a treliça de losangos pequenos
    for (let i = 70; i < W - 60; i += 28) for (let j = 70; j < H - 60; j += 28) { const c = ((i + j) / 28) % 2 ? anil : verde; x.fillStyle = c; x.beginPath(); x.moveTo(i, j - 7); x.lineTo(i + 7, j); x.lineTo(i, j + 7); x.lineTo(i - 7, j); x.fill(); x.fillStyle = ocre; x.fillRect(i - 1.5, j - 1.5, 3, 3); }
    // o medalhão do meio
    x.fillStyle = anil; x.beginPath(); x.moveTo(W / 2, H / 2 - 120); x.lineTo(W / 2 + 120, H / 2); x.lineTo(W / 2, H / 2 + 120); x.lineTo(W / 2 - 120, H / 2); x.fill();
    x.strokeStyle = ocre; x.lineWidth = 4; x.stroke(); x.fillStyle = ver; x.beginPath(); x.moveTo(W / 2, H / 2 - 80); x.lineTo(W / 2 + 80, H / 2); x.lineTo(W / 2, H / 2 + 80); x.lineTo(W / 2 - 80, H / 2); x.fill();
    roseta(W / 2, H / 2, 46, creme, anil); for (const [dx, dy] of [[0, -100], [100, 0], [0, 100], [-100, 0]]) roseta(W / 2 + dx, H / 2 + dy, 14, ocre, ver);
    // os pontos da lã e o gasto do uso (mais claro no meio, por onde se anda)
    const d = x.getImageData(0, 0, W, H), p = d.data; for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) { const i = (yy * W + xx) * 4, n = ((xx % 3 === 0 || yy % 3 === 0) ? -14 : 4) + (R() - 0.5) * 22, wear = Math.max(0, 1 - Math.hypot(xx - W / 2, yy - H / 2) / (W * 0.55)) * 18; for (let k = 0; k < 3; k++) p[i + k] = Math.max(0, Math.min(255, p[i + k] * 0.92 + n + wear)); } x.putImageData(d, 0, 0);
  }));
}
function paisagemTex() { // a paisagem a óleo, escurecida pelo verniz: céu com nuvens, serras em camadas, o rio, a ermida, as árvores
  return toTexture(cv(512, 384, (x, W, H) => {
    const g = x.createLinearGradient(0, 0, 0, H * 0.55); g.addColorStop(0, '#6a7c86'); g.addColorStop(0.7, '#c8b890'); g.addColorStop(1, '#d8c498'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let k = 0; k < 26; k++) { const cx = R() * W, cy = 20 + R() * H * 0.3, r = 20 + R() * 40; const gg = x.createRadialGradient(cx, cy, 2, cx, cy, r); gg.addColorStop(0, 'rgba(235,225,200,0.5)'); gg.addColorStop(1, 'rgba(235,225,200,0)'); x.fillStyle = gg; x.fillRect(cx - r, cy - r, 2 * r, 2 * r); }
    const serra = (base, amp, cor, seed) => { x.fillStyle = cor; x.beginPath(); x.moveTo(0, H); for (let px = 0; px <= W; px += 4) { const y = base - amp * (0.5 + 0.3 * Math.sin(px * 0.011 + seed) + 0.15 * Math.sin(px * 0.037 + seed * 2) + 0.05 * Math.sin(px * 0.13 + seed * 3)); x.lineTo(px, y); } x.lineTo(W, H); x.fill(); };
    serra(H * 0.5, 70, '#7a8a88', 1); serra(H * 0.58, 60, '#5a6a50', 4); serra(H * 0.7, 45, '#46502e', 7);
    x.fillStyle = 'rgba(190,200,190,0.55)'; x.beginPath(); x.moveTo(W * 0.2, H); x.quadraticCurveTo(W * 0.45, H * 0.78, W * 0.62, H * 0.74); x.quadraticCurveTo(W * 0.5, H * 0.82, W * 0.35, H); x.fill(); // o rio
    { const ex = W * 0.66, ey = H * 0.6; x.fillStyle = '#e4dcc4'; x.fillRect(ex, ey - 16, 22, 16); x.fillRect(ex + 16, ey - 28, 8, 12); x.fillStyle = '#8a4a32'; x.beginPath(); x.moveTo(ex - 3, ey - 16); x.lineTo(ex + 8, ey - 23); x.lineTo(ex + 19, ey - 16); x.fill(); } // a ermida no morro
    for (let k = 0; k < 70; k++) { const px = R() * W, py = H * (0.66 + R() * 0.3), r = 6 + R() * 14; x.fillStyle = 'rgba(28,36,20,0.85)'; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); x.fillStyle = 'rgba(90,100,50,0.5)'; x.beginPath(); x.arc(px - r * 0.3, py - r * 0.35, r * 0.5, 0, 7); x.fill(); }
    for (let k = 0; k < 3; k++) { const px = k < 2 ? 20 + k * 40 : W - 60; x.fillStyle = '#1a2014'; x.beginPath(); x.ellipse(px, H * 0.55, 30, 90, 0, 0, 7); x.fill(); } // (as árvores grandes da frente, em contraluz)
    const d = x.getImageData(0, 0, W, H), p = d.data; for (let i = 0; i < p.length; i += 4) { const n = (R() - 0.5) * 16; p[i] += n; p[i + 1] += n; p[i + 2] += n; } x.putImageData(d, 0, 0); // (a pincelada)
    const v = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7); v.addColorStop(0, 'rgba(60,36,10,0.15)'); v.addColorStop(1, 'rgba(30,18,6,0.7)'); x.fillStyle = v; x.fillRect(0, 0, W, H); // o verniz amarelado e escurecido nas beiras
  }));
}
function cartasTex() { // as cartas de jogar sobre a mesa (o voltarete, o jogo das casas ricas)
  return toTexture(cv(64, 64, (x, W, H) => { x.fillStyle = '#efe8d8'; x.fillRect(0, 0, W, H); x.strokeStyle = '#8a2a1a'; x.lineWidth = 3; x.strokeRect(4, 4, W - 8, H - 8); x.fillStyle = '#8a2a1a'; x.beginPath(); x.arc(W / 2, H / 2, 9, 0, 7); x.fill(); }));
}
function papelTex() { // a folha escrita (a letra corrida da escrituração) — para os livros abertos e os papéis
  return toTexture(cv(128, 128, (x, W, H) => { x.fillStyle = '#ece2c8'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(40,30,20,0.7)'; x.lineWidth = 1; for (let y = 14; y < H - 8; y += 7) { x.beginPath(); x.moveTo(10, y); let px = 10; while (px < W - 12) { px += 3 + R() * 4; x.lineTo(px, y + (R() - 0.5) * 2.5); } x.stroke(); } }));
}

function nobresMaterials(M) {
  if (M.livros) return M;
  interiorMaterials(M);
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
  M.livros = std({ map: livrosTex(), roughness: 0.8 }); M.livros.userData.uv = false;
  M.mapa = std({ map: mapaTex(), roughness: 0.9 }); M.mapa.userData.uv = false;
  M.armas = std({ map: armasTex(), roughness: 0.9 }); M.armas.userData.uv = false;
  M.tapete = std({ map: tapeteTex(), roughness: 1 }); M.tapete.userData.uv = false;
  M.paisagem = std({ map: paisagemTex(), roughness: 0.55 }); M.paisagem.userData.uv = false;
  M.cartas = std({ map: cartasTex(), roughness: 0.7 }); M.cartas.userData.uv = false;
  M.papel = std({ map: papelTex(), roughness: 0.9 }); M.papel.userData.uv = false;
  M.jacaranda = std({ color: 0x3a2014, roughness: 0.45 }); // (o jacarandá encerado dos móveis bons)
  M.palhinha = std({ color: 0xc8a868, roughness: 0.9 });
  M.espelho = std({ color: 0x9aa8b0, metalness: 1, roughness: 0.06 }); M.espelho.userData.keepEnv = true;
  M.prata = std({ color: 0xc8ccd0, metalness: 0.9, roughness: 0.25 }); M.prata.userData.keepEnv = true;
  M.louca = std({ color: 0xeef0f4, roughness: 0.3 }); // (a louça branca e azul da Índia, que chegava pelo Rio)
  M.chita = std({ color: 0xb8a078, roughness: 1 }); // (o pano de algodão grosso das roupas e das esteiras)
  M.esteira = std({ color: 0xa88a58, roughness: 1 });
  M.ferroVelho = std({ color: 0x3a3634, metalness: 0.6, roughness: 0.6 });
  M.couroLavrado = std({ color: 0x6a3a1e, roughness: 0.6 });
  M.verdeMesa = std({ color: 0x2a4a2e, roughness: 0.9 }); // (o pano verde da mesa de jogo e da secretaria)
  M.coberta = std({ color: 0xd8d0c0, roughness: 0.95 });
  M.damasco = std({ color: 0x8a1a1e, roughness: 0.75 });
  return M;
}

// ---------------- móveis (base no piso yb; peças só de caixas e tornos, sem chão: noGround) ----------------
const NG = { noGround: true };
// mesa: tampo e quatro pernas; along: o comprimento em x (true) ou em z
function mesa(f, M, x, z, yb, w, d, { h = 0.78, mat = M.jacaranda, pano = null } = {}) {
  f.box(mat, w, 0.06, d, x, yb + h - 0.06, z, NG); f.box(mat, w - 0.12, 0.1, d - 0.12, x, yb + h - 0.16, z, NG); // (o tampo e a saia com a gaveta)
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) f.geo(lathe([[0.035, 0], [0.05, 0.08], [0.03, 0.3], [0.045, 0.5], [0.04, h - 0.16], [0, h - 0.16]], 8), mat, x + a * (w / 2 - 0.08), yb, z + b * (d / 2 - 0.08), { uv: false });
  if (pano) f.box(pano, w + 0.02, 0.012, d + 0.02, x, yb + h, z, NG);
  f.solid(x, z, w, d, yb - 0.5, yb + h);
}
// cadeira de espaldar alto com assento e encosto de couro lavrado; olha para (dx, dz) (um dos quatro lados)
function cadeira(f, M, x, z, yb, dx, dz, { assento = M.couroLavrado, mat = M.jacaranda } = {}) {
  const bx = -dx * 0.21, bz = -dz * 0.21, alongX = dz !== 0; // (o encosto fica do lado de trás)
  f.box(mat, 0.48, 0.06, 0.46, x, yb + 0.44, z, NG); f.box(assento, 0.42, 0.03, 0.4, x, yb + 0.5, z, NG);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) f.box(mat, 0.05, 0.44, 0.05, x + a * 0.2, yb, z + b * 0.19, NG);
  f.box(mat, alongX ? 0.48 : 0.05, 0.62, alongX ? 0.05 : 0.48, x + bx, yb + 0.5, z + bz, NG); f.box(assento, alongX ? 0.38 : 0.03, 0.46, alongX ? 0.03 : 0.38, x + bx + dx * 0.03, yb + 0.58, z + bz + dz * 0.03, NG);
  f.box(mat, alongX ? 0.56 : 0.07, 0.07, alongX ? 0.07 : 0.56, x + bx, yb + 1.12, z + bz, NG); // (o remate do espaldar)
}
// banco corrido de tábua
function banco(f, M, x, z, yb, L, alongX, mat = M.madeira) {
  f.box(mat, alongX ? L : 0.32, 0.05, alongX ? 0.32 : L, x, yb + 0.42, z, NG);
  for (const s of [-1, 1]) f.box(mat, alongX ? 0.05 : 0.28, 0.42, alongX ? 0.28 : 0.05, x + (alongX ? s * (L / 2 - 0.15) : 0), yb, z + (alongX ? 0 : s * (L / 2 - 0.15)), NG);
  f.solid(x, z, alongX ? L : 0.34, alongX ? 0.34 : L, yb - 0.5, yb + 0.47);
}
// arca (baú) ou cofre: a caixa com as cintas de ferro e as fechaduras
function arca(f, M, x, z, yb, w, d, h, { cofre = false } = {}) {
  f.box(cofre ? M.madeiraEsc : M.jacaranda, w, h, d, x, yb, z, NG);
  const n = cofre ? 4 : 2; for (let k = 0; k < n; k++) { const t = (k + 0.5) / n - 0.5; if (w > d) f.box(M.ferroVelho, 0.06, h + 0.02, d + 0.02, x + t * w * 0.9, yb, z, NG); else f.box(M.ferroVelho, w + 0.02, h + 0.02, 0.06, x, yb, z + t * d * 0.9, NG); }
  if (cofre) for (const t of [-0.25, 0, 0.25]) f.box(M.ferro, w > d ? 0.08 : 0.04, 0.12, w > d ? 0.04 : 0.08, x + (w > d ? t * w : (d > w ? 0 : 0)) + (w > d ? 0 : w / 2), yb + h - 0.22, z + (w > d ? d / 2 : t * d), NG); // (as três fechaduras: três chaves, três homens)
  f.solid(x, z, w, d, yb - 0.5, yb + h);
}
// estante de livros encostada numa parede; fx/fz: para onde ela olha
function estante(f, M, x, z, yb, L, h, fx, fz) {
  const alongX = fz !== 0, dp = 0.38, cx = x - fx * 0, cz = z;
  f.box(M.jacaranda, alongX ? L : dp, h, alongX ? dp : L, cx, yb, cz, NG);
  f.box(M.livros, alongX ? L - 0.12 : 0.02, h - 0.3, alongX ? 0.02 : L - 0.12, cx + fx * (dp / 2 + 0.005), yb + 0.12, cz + fz * (dp / 2 + 0.005), NG);
  f.box(M.jacaranda, alongX ? L + 0.08 : dp + 0.06, 0.08, alongX ? dp + 0.06 : L + 0.08, cx, yb + h, cz, NG); // (a cornija)
  f.solid(cx, cz, alongX ? L : dp, alongX ? dp : L, yb - 0.5, yb + h);
}
// castiçal de prata (ou de latão) com a vela acesa
function castical(f, M, out, x, y, z, mat = M.prata) {
  f.geo(lathe([[0.07, 0], [0.06, 0.02], [0.02, 0.05], [0.015, 0.2], [0.035, 0.22], [0.02, 0.24], [0, 0.24]], 10), mat, x, y, z, { uv: false });
  f.geo(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 6), M.vela, x, y + 0.31, z, { uv: false });
  const [wx, wz] = f.W(x, z); out.candles.push(new THREE.Vector3(wx, f.y + y + 0.41, wz));
}
// quadro na parede (pintura, mapa ou espelho) com a moldura; fx/fz: para onde olha
function quadro(f, M, mat, x, y, z, w, h, fx, fz, moldura = M.ouroLiso) {
  const alongX = fz !== 0;
  f.box(moldura, alongX ? w + 0.14 : 0.05, h + 0.14, alongX ? 0.05 : w + 0.14, x, y - 0.07, z, NG);
  f.box(mat, alongX ? w : 0.012, h, alongX ? 0.012 : w, x + fx * 0.03, y, z + fz * 0.03, { ...NG, uv: false });
}
function barril(f, M, x, z, yb, h = 0.8) { f.geo(lathe([[0.26, 0], [0.31, h * 0.25], [0.33, h * 0.5], [0.31, h * 0.75], [0.26, h], [0, h]], 12), M.madeira, x, yb, z, { uv: false }); for (const t of [0.12, 0.88]) f.geo(new THREE.CylinderGeometry(0.29, 0.29, 0.04, 12, 1, true), M.ferroVelho, x, yb + h * t, z, { uv: false }); f.solid(x, z, 0.62, 0.62, yb - 0.5, yb + h); }
function saco(f, M, x, z, yb, s = 1) { f.geo(lathe([[0.2 * s, 0], [0.3 * s, 0.1 * s], [0.32 * s, 0.35 * s], [0.25 * s, 0.6 * s], [0.08 * s, 0.7 * s], [0, 0.72 * s]], 9), M.chita, x, yb, z, { uv: false }); }
function caixote(f, M, x, z, yb, w, h, d) { f.box(M.madeira, w, h, d, x, yb, z, NG); f.box(M.madeiraEsc, w + 0.01, 0.05, d + 0.01, x, yb + h * 0.5, z, NG); f.solid(x, z, w, d, yb - 0.5, yb + h); }
function pote(f, M, x, z, yb, s = 1) { f.geo(lathe([[0, 0], [0.18 * s, 0.05 * s], [0.25 * s, 0.3 * s], [0.16 * s, 0.55 * s], [0.12 * s, 0.62 * s], [0, 0.62 * s]], 10), M.barroPote, x, yb, z, { uv: false }); }
// catre: a cama simples de madeira com o colchão de palha (e a coberta)
function catre(f, M, x, z, yb, alongX, coberta = M.coberta) {
  const w = alongX ? 1.9 : 0.85, d = alongX ? 0.85 : 1.9;
  f.box(M.madeiraEsc, w, 0.36, d, x, yb, z, NG); f.box(M.palhaCatre, w - 0.08, 0.12, d - 0.08, x, yb + 0.36, z, NG); f.box(coberta, alongX ? w * 0.6 : w - 0.06, 0.04, alongX ? d - 0.06 : d * 0.6, x + (alongX ? w * 0.18 : 0), yb + 0.48, z + (alongX ? 0 : d * 0.18), NG);
  f.solid(x, z, w, d, yb - 0.5, yb + 0.5);
}
// espingardas de pederneira na estante de armas (encostadas na parede, coronha no chão)
function armeiro(f, M, x, z, yb, n, fx, fz) {
  const alongX = fz !== 0, L = n * 0.24 + 0.2;
  f.box(M.madeiraEsc, alongX ? L : 0.1, 0.08, alongX ? 0.1 : L, x + fx * 0.05, yb + 1.25, z + fz * 0.05, NG); f.box(M.madeiraEsc, alongX ? L : 0.25, 0.06, alongX ? 0.25 : L, x + fx * 0.12, yb + 0.06, z + fz * 0.12, NG);
  for (let k = 0; k < n; k++) { const t = -L / 2 + 0.2 + k * 0.24, px = x + (alongX ? t : fx * 0.14), pz = z + (alongX ? fz * 0.14 : t);
    f.box(M.madeira, 0.07, 0.5, 0.05, px, yb + 0.1, pz, NG); f.box(M.ferroVelho, 0.025, 1.0, 0.025, px, yb + 0.6, pz, NG); f.box(M.madeira, 0.045, 0.7, 0.04, px, yb + 0.55, pz + (alongX ? 0 : 0), NG); }
  f.solid(x + fx * 0.12, z + fz * 0.12, alongX ? L : 0.3, alongX ? 0.3 : L, yb - 0.5, yb + 1.4);
}
// balança de pesar ouro: a coluna, o travessão e os dois pratos de latão, e os pesos ao lado
function balanca(f, M, x, y, z) {
  f.box(M.jacaranda, 0.3, 0.04, 0.16, x, y, z, NG); f.box(M.ouroLiso, 0.02, 0.42, 0.02, x, y + 0.04, z, NG); f.box(M.ouroLiso, 0.42, 0.015, 0.015, x, y + 0.44, z, NG);
  for (const s of [-1, 1]) { f.box(M.ouroLiso, 0.004, 0.24, 0.004, x + s * 0.2, y + 0.2, z, NG); f.geo(new THREE.CylinderGeometry(0.08, 0.06, 0.02, 12), M.ouroLiso, x + s * 0.2, y + 0.19, z, { uv: false }); }
  for (let k = 0; k < 4; k++) f.geo(new THREE.CylinderGeometry(0.015 + k * 0.006, 0.015 + k * 0.006, 0.02 + k * 0.008, 8), M.ouroLiso, x + 0.22 + k * 0.05, y + 0.04 + (0.01 + k * 0.004), z + 0.12, { uv: false });
}
// livro (fechado ou aberto) e papéis
function livro(f, M, x, y, z, aberto = false) {
  if (aberto) { f.box(M.couroLavrado, 0.46, 0.02, 0.32, x, y, z, NG); f.box(M.papel, 0.44, 0.012, 0.3, x, y + 0.02, z, NG); }
  else f.box(R() < 0.5 ? M.couroLavrado : M.jacaranda, 0.24, 0.06, 0.32, x, y, z, NG);
}
function tinteiro(f, M, x, y, z) { f.geo(new THREE.CylinderGeometry(0.035, 0.04, 0.06, 8), M.prata, x, y + 0.03, z, { uv: false }); f.box(M.coberta, 0.01, 0.22, 0.01, x + 0.02, y + 0.06, z, { ...NG, rz: -0.35 }); }
// o lustre de velas: o aro dourado pendurado da corrente
function lustre(f, M, out, x, y, z, n = 8, r = 0.6) {
  f.geo(new THREE.TorusGeometry(r, 0.035, 5, 20), M.ouroLiso, x, y, z, { rx: Math.PI / 2, uv: false }); f.box(M.ferro, 0.025, 1.2, 0.025, x, y, z, NG); f.geo(lathe([[0, 0], [0.12, 0.05], [0.06, 0.25], [0, 0.3]], 8), M.ouroLiso, x, y - 0.22, z, { uv: false });
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; f.geo(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 6), M.vela, px, y + 0.09, pz, { uv: false }); const [wx, wz] = f.W(px, pz); out.candles.push(new THREE.Vector3(wx, f.y + y + 0.22, wz)); }
}
// balaustrada (corrimão sobre balaústres torneados) de (x0,z0) a (x1,z1), com o sólido que segura o explorador
function balaustrada(f, M, x0, z0, x1, z1, yb, mat = M.jacaranda) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(L / 0.16)), alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  for (let k = 0; k <= n; k++) { const t = k / n; f.geo(lathe([[0.035, 0], [0.05, 0.08], [0.025, 0.3], [0.055, 0.55], [0.025, 0.78], [0.035, 0.84], [0, 0.84]], 7), mat, x0 + (x1 - x0) * t, yb, z0 + (z1 - z0) * t, { uv: false }); }
  f.box(mat, alongX ? L + 0.1 : 0.1, 0.08, alongX ? 0.1 : L + 0.1, (x0 + x1) / 2, yb + 0.84, (z0 + z1) / 2, NG);
  f.solid((x0 + x1) / 2, (z0 + z1) / 2, alongX ? L : 0.14, alongX ? 0.14 : L, yb - 0.3, yb + 0.95);
}
// barrado: a faixa de baixo das paredes pintada (lambril de madeira ou o fingido de mármore)
function barrado(f, M, mat, x0, z0, x1, z1, yb, h = 0.9) { const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), L = Math.hypot(x1 - x0, z1 - z0); f.box(mat, alongX ? L : 0.04, h, alongX ? 0.04 : L, (x0 + x1) / 2, yb, (z0 + z1) / 2, NG); f.box(M.ouroLiso, alongX ? L : 0.05, 0.04, alongX ? 0.05 : L, (x0 + x1) / 2, yb + h, (z0 + z1) / 2, NG); }

// ================= a Casa dos Contos =================
// g: o que casa() devolveu (f, hw, hd, T, zf, H1, H2)
export function contosInterior(f, M, out, g) {
  nobresMaterials(M);
  const { hw, hd, T, H1, H2 } = g, ix = hw - T, iz = hd - T; // (o vão de dentro: |x| < ix, |z| < iz)
  const U = H1 - 0.16, C = H1 + H2 - 0.3; // o piso do andar nobre e o forro dele
  const PX = 3.27; // as paredes do vestíbulo (entre as janelas da fachada)
  // ---- a escadaria de pedra: 18 degraus subindo para os fundos, do meio do vestíbulo até o andar nobre
  const N = 18, rise = U / N, run = 0.42, z0 = -0.5, SW = 2.4, zTop = z0 - N * run, CELL = 11; // (do degrau 11 em diante, embaixo é o cubículo)
  for (let j = 0; j < N; j++) {
    const top = (j + 1) * rise, zc = z0 - run * (j + 0.5);
    if (j < CELL) { f.box(M.cantaria, SW, top, run + 0.01, 0, 0, zc, NG); f.solid(0, zc, SW, run, -1, top, true); }
    else { f.box(M.cantaria, SW, 0.3, run + 0.01, 0, top - 0.3, zc, NG); f.solid(0, zc, SW, run, top - 0.3, top, true); }
    f.box(M.cantaria, SW + 0.04, 0.04, 0.06, 0, top - 0.02, zc + run / 2 - 0.03, NG); // (o focinho do degrau)
    for (const s of [-1, 1]) { f.geo(lathe([[0.03, 0], [0.045, 0.06], [0.022, 0.28], [0.048, 0.52], [0.022, 0.78], [0, 0.82]], 7), M.jacaranda, s * (SW / 2 - 0.06), top, zc, { uv: false }); }
  }
  for (const s of [-1, 1]) { const L = Math.hypot(N * run, U); f.box(M.jacaranda, 0.08, 0.07, L, s * (SW / 2 - 0.06), (U / 2) + 0.82 - 0.035, z0 - N * run / 2, { ...NG, rx: Math.atan2(U, N * run) }); } // (o corrimão inclinado)
  f.geo(lathe([[0.1, 0], [0.12, 0.1], [0.08, 0.9], [0.1, 1.0], [0.14, 1.05], [0, 1.1]], 10), M.jacaranda, -SW / 2 + 0.06, 0, z0 + 0.1, { uv: false }); f.geo(lathe([[0.1, 0], [0.12, 0.1], [0.08, 0.9], [0.1, 1.0], [0.14, 1.05], [0, 1.1]], 10), M.jacaranda, SW / 2 - 0.06, 0, z0 + 0.1, { uv: false }); // (os pilaretes do pé da escada)
  // ---- o cubículo debaixo da escada: paredes acompanhando o degrau de cima, a porta de grade no lado, o catre
  { const cz0 = z0 - CELL * run, cz1 = zTop, xi = SW / 2 - 0.08, dz0 = z0 - 12 * run, dz1 = z0 - 14 * run; // (a porta ocupa os degraus 12 e 13)
    for (let j = CELL; j < N; j++) { const under = (j + 1) * rise - 0.3, za = z0 - run * j, zb = za - run, zc = (za + zb) / 2;
      f.box(M.cal, 0.14, under, run + 0.01, -xi, 0, zc, NG); f.solid(-xi, zc, 0.14, run, -0.5, under);
      if (j === 12 || j === 13) { f.box(M.cal, 0.14, under - 1.9, run + 0.01, xi, 1.9, zc, NG); continue; }
      f.box(M.cal, 0.14, under, run + 0.01, xi, 0, zc, NG); f.solid(xi, zc, 0.14, run, -0.5, under); }
    f.box(M.cal, SW - 0.02, (N * rise) - 0.3, 0.14, 0, 0, cz1 + 0.07, NG); f.solid(0, cz1 + 0.07, SW, 0.14, -0.5, U - 0.3);
    f.box(M.chaoTerra, SW - 0.3, 0.02, cz0 - cz1 - 0.1, 0, 0, (cz0 + cz1) / 2, NG);
    // a porta de grade, aberta e encostada do lado de fora (a moldura, as barras)
    const dzc = (dz0 + dz1) / 2, dw = dz0 - dz1; f.box(M.madeiraEsc, 0.08, 0.1, dw + 0.12, xi, 1.86, dzc, NG); for (const e of [dz0, dz1]) f.box(M.madeiraEsc, 0.16, 1.9, 0.08, xi, 0, e, NG);
    const lz = dz1 - dw / 2 - 0.02; f.box(M.madeiraEsc, 0.05, 1.8, 0.06, xi + 0.12, 0.04, lz - dw / 2 + 0.03, NG); f.box(M.madeiraEsc, 0.05, 1.8, 0.06, xi + 0.12, 0.04, lz + dw / 2 - 0.03, NG); for (const yy of [0.1, 0.9, 1.75]) f.box(M.madeiraEsc, 0.05, 0.08, dw, xi + 0.12, yy, lz, NG); for (let k = 1; k < 5; k++) f.box(M.ferroVelho, 0.03, 1.7, 0.03, xi + 0.12, 0.08, lz - dw / 2 + k * dw / 5, NG);
    f.solid(xi + 0.12, lz, 0.1, dw, -0.5, 1.9);
    catre(f, M, -0.55, (cz0 + cz1) / 2 - 0.2, 0, false, M.chita);
    pote(f, M, 0.75, cz1 + 0.35, 0, 0.8); // a bilha d'água
    f.box(M.madeira, 0.32, 0.38, 0.32, -0.6, 0, cz0 - 0.4, NG); f.solid(-0.6, cz0 - 0.4, 0.32, 0.32, -0.5, 0.38); castical(f, M, out, -0.6, 0.38, cz0 - 0.4, M.ferroVelho); // o banquinho com a vela
  }
  // ---- o piso de cima, aberto sobre a escada, com o vigamento à vista por baixo
  const hole = [-1.3, 1.3, zTop, z0 + 0.1];
  const slab = (x0, x1, za, zb) => { const w = x1 - x0, d = zb - za; if (w < 0.05 || d < 0.05) return; f.box(M.soalho, w, 0.14, d, (x0 + x1) / 2, U - 0.14, (za + zb) / 2, NG); f.solid((x0 + x1) / 2, (za + zb) / 2, w, d, U - 0.34, U, true); };
  slab(-ix, hole[0], -iz, iz); slab(hole[1], ix, -iz, iz); slab(hole[0], hole[1], hole[3], iz); slab(hole[0], hole[1], -iz, hole[2]);
  for (let x = -ix + 0.4; x < ix; x += 0.8) { if (x > hole[0] - 0.1 && x < hole[1] + 0.1) { f.box(M.madeiraEsc, 0.12, 0.18, iz - hole[3], x, U - 0.32, (hole[3] + iz) / 2, NG); f.box(M.madeiraEsc, 0.12, 0.18, hole[2] + iz, x, U - 0.32, (-iz + hole[2]) / 2, NG); } else f.box(M.madeiraEsc, 0.12, 0.18, 2 * iz, x, U - 0.32, 0, NG); } // (os barrotes)
  f.solid(0, 0, 2 * hw + 0.6, 2 * hd + 0.6, C, C + 4, true); // (o forro do andar nobre: a câmera não sobe)
  // a balaustrada em volta do vão da escada
  for (const s of [-1, 1]) balaustrada(f, M, s * 1.3, hole[2] + 0.05, s * 1.3, hole[3], U);
  balaustrada(f, M, -1.3, hole[3], 1.3, hole[3], U);
  // ---- o reboco caiado da parede dos fundos, por dentro (com a porta do quintal e a janela do térreo)
  f.wall(M.cal, -ix, -iz + 0.02, ix, -iz + 0.02, U - 0.34, 0.03, [[-hw + 2 * hw * 0.3 + ix, 0.9, 2.1, 0], [-hw + 2 * hw * 0.72 + ix, 0.85, 1.2, 1.0]], { noSolid: true });
  f.wall(M.cal, -ix, -iz + 0.02, ix, -iz + 0.02, C - U, 0.03, [], { y0: U, noSolid: true });
  // ---- o térreo: as paredes do vestíbulo e das salas
  const h0 = U - 0.34, wallG = (x0, z0_, x1, z1, gaps) => f.wall(M.cal, x0, z0_, x1, z1, h0, 0.2, gaps);
  for (const s of [-1, 1]) wallG(s * PX, -iz, s * PX, iz, [[iz + 6, 1.1, 2.3, 0], [iz - 3, 1.1, 2.3, 0]]); // (portas: a sala da frente e a de trás)
  for (const s of [-1, 1]) f.wall(M.cal, s * PX, 0, s * ix, 0, h0, 0.2, [[1.2, 1.0, 2.2, 0]]); // (frente e fundos de cada lado se comunicam)
  // os pisos: lajedo no vestíbulo e no escritório, chão de terra batida na senzala
  f.box(M.lajedo, 2 * PX - 0.2, 0.03, 2 * iz, 0, 0, 0, NG);
  f.box(M.lajedo, ix - PX - 0.1, 0.03, iz - 0.1, -(ix + PX) / 2, 0, iz / 2, NG);
  f.box(M.chaoTerra, ix - PX - 0.1, 0.03, iz - 0.1, (ix + PX) / 2, 0, -iz / 2, NG);
  // o escritório do contrato (frente, à esquerda): a escrivaninha, a balança do ouro, o cofre, os livros
  { const cx = -(ix + PX) / 2;
    mesa(f, M, cx, 6.2, 0, 1.9, 0.95, { pano: M.verdeMesa }); cadeira(f, M, cx, 5.3, 0, 0, 1); cadeira(f, M, cx - 0.5, 7.15, 0, 0, -1); cadeira(f, M, cx + 0.5, 7.15, 0, 0, -1);
    livro(f, M, cx - 0.4, 0.79, 6.15, true); livro(f, M, cx + 0.55, 0.79, 6.0); livro(f, M, cx + 0.55, 0.85, 6.0); tinteiro(f, M, cx + 0.1, 0.79, 5.95); f.box(M.papel, 0.3, 0.005, 0.22, cx + 0.2, 0.79, 6.35, NG);
    castical(f, M, out, cx - 0.8, 0.79, 6.5); castical(f, M, out, cx + 0.85, 0.79, 6.5);
    // o balcão onde se pesava o ouro em pó trazido para o contrato, com a balança
    f.box(M.jacaranda, 0.7, 1.0, 3.2, -PX - 1.3, 0, 3.8, NG); f.box(M.jacaranda, 0.8, 0.06, 3.3, -PX - 1.3, 1.0, 3.8, NG); f.solid(-PX - 1.3, 3.8, 0.7, 3.2, -0.5, 1.06); balanca(f, M, -PX - 1.3, 1.06, 3.5); for (const dz of [-1.05, 0, 1.05]) { f.box(M.madeiraEsc, 0.03, 0.62, 0.86, -PX - 0.93, 0.2, 3.8 + dz, NG); f.box(M.jacaranda, 0.05, 0.5, 0.74, -PX - 0.93, 0.26, 3.8 + dz, NG); } f.box(M.couroLavrado, 0.22, 0.04, 0.16, -PX - 1.3, 1.06, 4.3, NG);
    arca(f, M, -ix + 0.4, 2.65, 0, 0.62, 1.1, 0.7, { cofre: true }); // o cofre de três chaves
    estante(f, M, cx, 0.32, 0, 3.2, 2.5, 0, 1); // os livros do contrato
    banco(f, M, -PX - 0.3, 9.4, 0, 1.6, false);
    quadro(f, M, M.mapa, -ix + 0.03, 1.5, 7.95, 1.0, 0.8, 1, 0, M.jacaranda); // (a carta da comarca, entre as janelas)
  }
  // o depósito (fundos, à esquerda): barris, sacos de sal e farinha, caixotes, rolos de fumo
  { const cx = -(ix + PX) / 2; for (let k = 0; k < 4; k++) barril(f, M, -ix + 0.5, -iz + 0.6 + k * 0.7, 0);
    for (let k = 0; k < 6; k++) saco(f, M, cx - 1.6 + (k % 3) * 0.6, -iz + 0.55 + Math.floor(k / 3) * 0.5, 0, 1); f.solid(cx - 1.0, -iz + 0.8, 1.8, 1.1, -0.5, 0.7);
    caixote(f, M, cx + 0.6, -iz + 0.6, 0, 1.0, 0.6, 0.8); caixote(f, M, cx + 0.6, -iz + 0.6, 0.6, 0.8, 0.5, 0.7);
    for (let k = 0; k < 3; k++) f.geo(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 10), M.madeiraEsc, -PX - 0.6, 0.16 + k * 0.3, -5 + (k % 2) * 0.05, { rx: Math.PI / 2, uv: false }); f.solid(-PX - 0.6, -5, 0.4, 0.95, -0.5, 0.95); // (os rolos de fumo de corda)
  }
  // a sala dos caixeiros e da guarda (frente, à direita): a mesa comprida, os livros, as espingardas
  { const cx = (ix + PX) / 2;
    mesa(f, M, cx, 5.0, 0, 3.4, 0.9, { mat: M.madeira }); for (const dx of [-1.2, 0, 1.2]) { banco(f, M, cx + dx, 4.2, 0, 1.0, true); } livro(f, M, cx - 1.0, 0.79, 5.1, true); livro(f, M, cx + 0.5, 0.79, 5.0, true); tinteiro(f, M, cx - 0.3, 0.79, 4.85); tinteiro(f, M, cx + 1.1, 0.79, 4.85);
    armeiro(f, M, ix - 0.05, 7.95, 0, 5, -1, 0);
    arca(f, M, cx, iz - 0.4, 0, 1.2, 0.55, 0.6);
    estante(f, M, PX + 0.3, 1.9, 0, 2.2, 2.2, 1, 0);
  }
  // a senzala (fundos, à direita): as esteiras no chão, as cobertas, os potes, a roupa no varal — o lugar dos escravizados da casa
  { for (let k = 0; k < 6; k++) { const ez = -iz + 0.7 + k * 1.15; f.box(M.esteira, 1.8, 0.02, 0.85, ix - 1.0, 0.03, ez, NG); if (k % 2 === 0) f.geo(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8), M.chita, ix - 0.25, 0.13, ez, { rx: Math.PI / 2, uv: false }); }
    pote(f, M, PX + 0.6, -iz + 0.5, 0); pote(f, M, PX + 1.2, -iz + 0.45, 0, 0.8); f.geo(new THREE.SphereGeometry(0.1, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.madeira, PX + 0.9, 0.1, -iz + 1.0, { uv: false }); // (os potes e a cuia)
    f.box(M.ferroVelho, 0.02, 0.02, iz - 4.5, PX + 0.4, 1.9, (-iz - 4.5) / 2, NG); f.box(M.madeira, 0.07, 1.95, 0.07, PX + 0.4, 0, -4.5, NG); // (o varal: da parede do fundo até o pau fincado no chão) for (let k = 0; k < 4; k++) f.box(k % 2 ? M.chita : M.coberta, 0.03, 0.7, 0.5, PX + 0.4, 1.2, -7.9 + k * 0.9, NG); // (a roupa pendurada)
    banco(f, M, (ix + PX) / 2, -1.2, 0, 1.6, true);
  }
  // ---- o andar nobre: paredes, forros, barrados
  const h1 = C - U, wallU = (x0, z0_, x1, z1, gaps) => f.wall(M.cal, x0, z0_, x1, z1, h1, 0.2, gaps, { y0: U });
  for (const s of [-1, 1]) wallU(s * PX, -iz, s * PX, 0, [[1.3, 1.0, 2.3, 0]]); // (do vestíbulo de cima para a sala de jantar e o quarto)
  wallU(-ix, 0, ix, 0, [[ix - 2.3, 1.2, 2.5, 0], [ix + 2.3, 1.2, 2.5, 0], [ix - 7.5, 1.2, 2.5, 0], [ix + 7.5, 1.2, 2.5, 0]]); // (o salão: as portas dos corredores e as das salas)
  f.box(M.forroNave, 2 * ix, 0.08, iz, 0, C - 0.12, iz / 2, NG); // o forro pintado do salão
  f.box(M.forro, 2 * ix, 0.08, iz, 0, C - 0.12, -iz / 2, NG);
  for (const s of [-1, 1]) barrado(f, M, M.lambril, s * (ix - 0.02), 0.15, s * (ix - 0.02), iz - 0.05, U);
    // o salão (a frente): o canapé e as cadeiras, a mesa de jogo, o cravo, a cômoda com o espelho, o oratório aberto, o tapete, o lustre
  { f.box(M.tapete, 6.4, 0.012, 4.2, 0, U, 5.6, NG);
    // o canapé de palhinha encostado na parede do fundo do salão, com as cadeiras dos lados
    const kz = 0.55, kx = -4.9; f.box(M.jacaranda, 2.0, 0.08, 0.62, kx, U + 0.4, kz, NG); f.box(M.palhinha, 1.9, 0.03, 0.56, kx, U + 0.48, kz, NG); f.box(M.jacaranda, 2.0, 0.66, 0.06, kx, U + 0.48, kz - 0.28, NG); f.box(M.palhinha, 1.86, 0.5, 0.02, kx, U + 0.56, kz - 0.24, NG); for (const s of [-1, 1]) { f.box(M.jacaranda, 0.06, 0.3, 0.6, kx + s * 0.97, U + 0.48, kz, NG); for (const b of [-0.25, 0.25]) f.box(M.jacaranda, 0.06, 0.4, 0.06, kx + s * 0.9, U, kz + b, NG); } f.solid(kx, kz, 2.0, 0.62, U - 0.3, U + 0.5);
    for (const s of [-1, 1]) cadeira(f, M, kx + s * 1.65, 0.55, U, 0, 1);
    // a mesa de jogo com o pano verde, as cartas e as quatro cadeiras
    mesa(f, M, -5.5, 5.5, U, 1.0, 1.0, { pano: M.verdeMesa }); cadeira(f, M, -5.5, 4.75, U, 0, 1); cadeira(f, M, -5.5, 6.25, U, 0, -1); cadeira(f, M, -6.25, 5.5, U, 1, 0); cadeira(f, M, -4.75, 5.5, U, -1, 0);
    for (let k = 0; k < 5; k++) f.box(M.cartas, 0.06, 0.004, 0.09, -5.6 + k * 0.05, U + 0.79, 5.4 + (k % 2) * 0.03, { ...NG, ry: k * 0.3 }); castical(f, M, out, -5.85, U + 0.79, 5.85); castical(f, M, out, -5.15, U + 0.79, 5.15);
    // o cravo (o instrumento de teclado das casas ricas e das festas)
    f.box(M.jacaranda, 0.95, 0.24, 2.0, 6.2, U + 0.72, 5.5, NG); f.box(M.madeiraEsc, 0.95, 0.03, 2.0, 6.2, U + 0.96, 5.5, NG); for (const [a, b] of [[-0.4, -0.9], [0.4, -0.9], [-0.4, 0.9], [0.4, 0.9]]) f.geo(lathe([[0.04, 0], [0.05, 0.1], [0.03, 0.4], [0.045, 0.72], [0, 0.72]], 8), M.jacaranda, 6.2 + a, U, 5.5 + b, { uv: false });
    f.box(M.louca, 0.82, 0.03, 0.16, 6.2, U + 0.82, 6.42, NG); f.box(M.escuro, 0.82, 0.015, 0.05, 6.2, U + 0.85, 6.4, NG); f.box(M.jacaranda, 0.9, 0.5, 0.03, 6.2, U + 0.96, 6.35, { ...NG, rx: -0.5 }); f.solid(6.2, 5.5, 0.95, 2.0, U - 0.3, U + 0.97);
    cadeira(f, M, 6.2, 7.0, U, 0, -1);
    // a cômoda com o espelho (na parede do lado, entre as janelas)
    f.box(M.jacaranda, 0.55, 0.88, 1.3, -ix + 0.3, U, 2.65, NG); f.box(M.jacaranda, 0.6, 0.05, 1.36, -ix + 0.3, U + 0.88, 2.65, NG); for (const yy of [0.2, 0.48, 0.72]) f.box(M.ouroLiso, 0.02, 0.03, 0.12, -ix + 0.58, U + yy, 2.65, NG); f.solid(-ix + 0.3, 2.65, 0.55, 1.3, U - 0.3, U + 0.93);
    quadro(f, M, M.espelho, -ix + 0.03, U + 1.2, 2.65, 0.9, 1.1, 1, 0); castical(f, M, out, -ix + 0.3, U + 0.93, 2.15); castical(f, M, out, -ix + 0.3, U + 0.93, 3.15);
    // o oratório aberto da família, na parede oposta: o armário dourado por dentro, Santo Antônio, as velas
    { const ox = ix - 0.25, oz = 2.65; f.box(M.jacaranda, 0.45, 0.06, 0.8, ox, U + 1.0, oz, NG); f.box(M.jacaranda, 0.4, 1.3, 0.85, ox, U + 1.06, oz, NG); f.box(M.ouro, 0.02, 1.16, 0.72, ox - 0.19, U + 1.12, oz, NG); f.box(M.azulCamarim, 0.02, 0.9, 0.5, ox - 0.17, U + 1.2, oz, NG);
      f.box(M.jacaranda, 0.48, 0.12, 0.9, ox, U + 2.36, oz, NG); f.geo(lathe([[0.18, 0], [0.2, 0.06], [0.08, 0.2], [0.03, 0.32], [0, 0.34]], 10), M.ouroLiso, ox, U + 2.48, oz, { uv: false });
      for (const s of [-1, 1]) f.box(M.ouro, 0.42, 1.2, 0.03, ox - 0.4, U + 1.1, oz + s * 0.44, NG); // (as portinhas abertas, douradas por dentro)
      f.box(M.jacaranda, 0.3, 0.9, 0.5, ox, U + 0.06, oz, NG); f.solid(ox, oz, 0.45, 0.9, U - 0.3, U + 2.5);
      const [wx, wz] = f.W(ox - 0.06, oz); out.statues.push({ x: wx, y: f.y + U + 1.07, z: wz, ry: f.ry - Math.PI / 2, h: 0.6, key: 'antonio' });
      castical(f, M, out, ox - 0.12, U + 1.07, oz - 0.3, M.ouroLiso); castical(f, M, out, ox - 0.12, U + 1.07, oz + 0.3, M.ouroLiso); }
    quadro(f, M, M.paisagem, 0, U + 1.6, 0.14, 1.6, 1.2, 0, 1); // a paisagem a óleo na parede do fundo, entre as portas
    lustre(f, M, out, 0, C - 1.15, 5.6, 8, 0.6);
    for (const s of [-1, 1]) cadeira(f, M, s * 9.5, 9.6, U, 0, -1);
  }
  // a sala de jantar (fundos, à esquerda): a mesa comprida com a toalha e a louça, as cadeiras, o aparador
  { const cx = -(ix + PX) / 2, cz = -5.3;
    mesa(f, M, cx, cz, U, 1.2, 3.4, { pano: M.toalha });
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) cadeira(f, M, cx + s * 0.9, cz - 1.1 + k * 1.1, U, -s, 0);
    cadeira(f, M, cx, cz - 2.1, U, 0, 1); cadeira(f, M, cx, cz + 2.1, U, 0, -1);
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) f.geo(new THREE.CylinderGeometry(0.12, 0.09, 0.02, 14), M.louca, cx + s * 0.38, U + 0.8, cz - 1.2 + k * 0.8, { uv: false });
    f.geo(lathe([[0, 0], [0.08, 0.01], [0.1, 0.12], [0.06, 0.24], [0.07, 0.3], [0, 0.3]], 10), M.prata, cx, U + 0.8, cz, { uv: false }); castical(f, M, out, cx, U + 0.8, cz - 1.0); castical(f, M, out, cx, U + 0.8, cz + 1.0);
    f.box(M.jacaranda, 0.5, 0.9, 2.0, -ix + 0.27, U, cz, NG); f.box(M.jacaranda, 0.56, 0.05, 2.06, -ix + 0.27, U + 0.9, cz, NG); f.solid(-ix + 0.27, cz, 0.5, 2.0, U - 0.3, U + 0.95);
    for (let k = 0; k < 5; k++) f.geo(new THREE.CylinderGeometry(0.13, 0.1, 0.02, 14), M.louca, -ix + 0.27, U + 0.95 + k * 0.022, cz - 0.6, { uv: false });
    f.geo(lathe([[0, 0], [0.07, 0.01], [0.09, 0.14], [0.05, 0.26], [0.06, 0.3], [0, 0.3]], 10), M.louca, -ix + 0.27, U + 0.95, cz + 0.5, { uv: false });
    quadro(f, M, M.paisagem, cx, U + 1.5, -iz + 0.03, 1.4, 1.0, 0, 1);
  }
  // o quarto (fundos, à direita): a cama de dossel, o baú, o lavatório com a bacia e o jarro
  { const bx = (ix + PX) / 2 + 0.6, bz = -iz + 1.15, bw = 1.6, bd = 2.1;
    f.box(M.jacaranda, bw, 0.45, bd, bx, U, bz, NG); f.box(M.coberta, bw - 0.08, 0.2, bd - 0.1, bx, U + 0.45, bz + 0.02, NG); f.box(M.damasco, bw - 0.04, 0.05, bd * 0.6, bx, U + 0.66, bz + bd * 0.18, NG); f.box(M.coberta, bw - 0.4, 0.14, 0.4, bx, U + 0.65, bz - bd / 2 + 0.3, NG);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) f.geo(lathe([[0.05, 0], [0.06, 0.1], [0.035, 0.6], [0.05, 1.0], [0.03, 1.7], [0.04, 2.2], [0, 2.25]], 8), M.jacaranda, bx + a * (bw / 2 - 0.04), U, bz + b * (bd / 2 - 0.04), { uv: false });
    f.box(M.jacaranda, bw + 0.1, 0.18, bd + 0.1, bx, U + 2.2, bz, NG); f.box(M.jacaranda, bw, 1.0, 0.05, bx, U + 0.45, bz - bd / 2 + 0.03, NG);
    for (const s of [-1, 1]) f.box(M.damasco, 0.03, 1.6, 0.5, bx + s * (bw / 2 + 0.03), U + 0.6, bz - bd / 2 + 0.3, NG); f.box(M.damasco, bw + 0.12, 0.3, 0.03, bx, U + 1.95, bz + bd / 2 + 0.05, NG); // (o cortinado do dossel, preso nas colunas)
    f.solid(bx, bz, bw, bd, U - 0.3, U + 0.7);
    arca(f, M, bx, bz + bd / 2 + 0.45, U, 1.2, 0.5, 0.5);
    { const lx = ix - 0.3, lz = -3.0; f.box(M.jacaranda, 0.5, 0.8, 0.5, lx, U, lz, NG); f.geo(new THREE.CylinderGeometry(0.2, 0.12, 0.08, 14), M.louca, lx, U + 0.84, lz, { uv: false }); f.geo(lathe([[0, 0], [0.06, 0.01], [0.08, 0.12], [0.04, 0.26], [0.06, 0.3], [0, 0.3]], 10), M.louca, lx, U + 0.84, lz + 0.12, { uv: false }); f.solid(lx, lz, 0.5, 0.5, U - 0.3, U + 0.85); }
    cadeira(f, M, PX + 0.6, -6.0, U, 1, 0); castical(f, M, out, ix - 0.45, U + 0.84, -3.15);
    { const ox = PX + 0.15, oz = -2.4; f.box(M.jacaranda, 0.3, 0.7, 0.55, ox, U + 1.1, oz, NG); f.box(M.ouro, 0.02, 0.6, 0.45, ox + 0.15, U + 1.15, oz, NG); f.box(M.ouroLiso, 0.03, 0.26, 0.03, ox + 0.17, U + 1.3, oz, NG); f.box(M.ouroLiso, 0.03, 0.03, 0.14, ox + 0.17, U + 1.48, oz, NG); } // (o oratorinho do quarto, com a cruz)
  }
  // o vestíbulo de cima: dois tamboretes e a arca encostados
  arca(f, M, -2.3, -iz + 0.35, U, 1.1, 0.5, 0.55); for (const s of [-1, 1]) cadeira(f, M, s * (PX - 0.35), -5, U, -s, 0);
  out.interiors.push({ id: 'contos', at: f.W(0, 0), y: f.y, light: [f.W(-1, 4.5), f.y + 2.6], light2: [f.W(0, 5), f.y + U + 2.3] });
  out.spots.contosCela = f.W(0, z0 - 14.5 * run); out.spots.contosEscritorio = f.W(-(ix + PX) / 2, 6.2); out.spots.contosSalao = f.W(0, 5.5);
}

// ================= o Palácio dos Governadores =================
// d: { wd, dd, H, zb } do casarão (paredes de 0,8 m de cantaria)
export function palacioInterior(f, M, out, d) {
  nobresMaterials(M);
  const { wd, dd, H, zb } = d, X = wd / 2 - 0.8, Z0 = zb - dd / 2 + 0.8, Z1 = zb + dd / 2 - 0.8; // (o vão de dentro)
  const U = 4.6, C = H - 0.9, PX = 5.6, QX = 11.0; // o andar nobre, o forro, as paredes do vestíbulo e das alas
  const Z = (lz) => zb + lz;
  // ---- o chão do térreo: lajedo; e o reboco caiado por dentro das paredes de pedra
  f.box(M.lajedo, 2 * X, 0.05, Z1 - Z0, 0, -0.03, zb, NG); f.solid(0, zb, 2 * X, Z1 - Z0, -1, 0.02, true);
  out.press.push({ ...(() => { const [x, z] = f.W(0, zb); return { x, z }; })(), w: wd - 0.4, d: dd - 0.4, ry: 0, top: f.y });
  const wx = (i) => -wd / 2 + 2.4 + i * (wd - 4.8) / 8, WIN = [0, 1, 2, 3, 5, 6, 7, 8].map(wx);
  const reb = (yb, h, gaps) => f.wall(M.cal, -X, Z1 - 0.02, X, Z1 - 0.02, h, 0.04, gaps, { y0: yb, noSolid: true });
  reb(0, U, [[X, 2.6, 4.2, 0], ...WIN.map((c) => [c + X, 1.2, 1.7, 1.4])]); reb(U, C - U, WIN.map((c) => [c + X, 1.2, 2.3, 0.8]));
  f.wall(M.cal, -X, Z0 + 0.02, X, Z0 + 0.02, C, 0.04, [], { noSolid: true }); for (const s of [-1, 1]) f.wall(M.cal, s * (X - 0.02), Z0, s * (X - 0.02), Z1, C, 0.04, [], { noSolid: true });
  // ---- a escadaria: o lanço do meio sobe para os fundos até o patamar; dali dois lanços voltam para a frente, um de cada lado
  const n = 12, rise = U / (2 * n), run = 0.42, za = Z(2.5), zl = za - n * run; // (zl: a frente do patamar)
  for (let j = 0; j < n; j++) { const top = (j + 1) * rise, zc = za - run * (j + 0.5); f.box(M.cantaria, 2.6, top, run + 0.01, 0, 0, zc, NG); f.solid(0, zc, 2.6, run, -1, top, true); f.box(M.cantaria, 2.64, 0.04, 0.06, 0, top - 0.02, zc + run / 2 - 0.03, NG); }
  f.box(M.cantaria, 2 * (PX - 0.15), n * rise, zl - Z0, 0, 0, (zl + Z0) / 2, NG); f.solid(0, (zl + Z0) / 2, 2 * (PX - 0.15), zl - Z0, -1, n * rise, true); // o patamar
  for (const s of [-1, 1]) for (let j = 0; j < n; j++) { const top = n * rise + (j + 1) * rise, zc = zl + run * (j + 0.5), xc = s * (1.5 + PX - 0.15) / 2, sw = PX - 0.15 - 1.5; f.box(M.cantaria, sw, top, run + 0.01, xc, 0, zc, NG); f.solid(xc, zc, sw, run, -1, top, true); f.box(M.cantaria, sw + 0.04, 0.04, 0.06, xc, top - 0.02, zc - run / 2 + 0.03, NG);
    // (o parapeito de pedra entre o lanço do meio e os dos lados, acompanhando os degraus)
    f.box(M.cantaria, 0.2, top + 0.95 - (zc > za ? 0 : 0), run + 0.01, s * 1.4, 0, zc, NG); f.solid(s * 1.4, zc, 0.2, run, -1, top + 0.95); }
  quadro(f, M, M.armas, 0, n * rise + 1.3, Z0 + 0.03, 1.6, 2.0, 0, 1, M.ouroLiso); // as armas reais no fundo do patamar, onde quem sobe dá de cara
  for (const s of [-1, 1]) { f.geo(lathe([[0.14, 0], [0.16, 0.12], [0.11, 1.0], [0.15, 1.1], [0.2, 1.16], [0, 1.2]], 10), M.cantaria, s * 1.18, 0, za + 0.05, { uv: false }); }
  // ---- o piso de cima, aberto sobre a escada, e o forro
  const hx = PX - 0.15, hz1 = za + 0.05;
  const slab = (x0, x1, z0, z1) => { const w = x1 - x0, dd2 = z1 - z0; if (w < 0.05 || dd2 < 0.05) return; f.box(M.soalho, w, 0.2, dd2, (x0 + x1) / 2, U - 0.2, (z0 + z1) / 2, NG); f.solid((x0 + x1) / 2, (z0 + z1) / 2, w, dd2, U - 0.4, U, true); };
  slab(-X, -hx, Z0, Z1); slab(hx, X, Z0, Z1); slab(-hx, hx, hz1, Z1);
  for (let x = -X + 0.5; x < X; x += 1.0) { if (Math.abs(x) < hx + 0.1) { f.box(M.madeiraEsc, 0.16, 0.24, Z1 - hz1, x, U - 0.44, (hz1 + Z1) / 2, NG); } else f.box(M.madeiraEsc, 0.16, 0.24, Z1 - Z0, x, U - 0.44, zb, NG); }
  f.box(M.forroNave, 2 * PX, 0.08, Z1 - Z0, 0, C, zb, NG); f.box(M.forroCapela, X - PX, 0.08, Z1 - Z0, (X + PX) / 2, C, zb, NG); f.box(M.forro, X - PX, 0.08, Z1 - Z0, -(X + PX) / 2, C, zb, NG);
  f.solid(0, zb, wd + 0.6, dd + 0.6, C + 0.05, H + 6, true);
  balaustrada(f, M, -1.3, hz1, 1.3, hz1, U, M.cantaria);
  // ---- as paredes de dentro (térreo e andar nobre)
  const g0 = (x) => f.wall(M.cal, x, Z0, x, Z1, U - 0.4, 0.3, [[Z1 - Z0 - 2.2, 1.6, 2.8, 0]]);
  g0(-PX); g0(PX); f.wall(M.cal, -QX, Z0, -QX, Z1, U - 0.4, 0.3, [[(Z1 - Z0) / 2, 1.3, 2.6, 0]]); f.wall(M.cal, QX, Z0, QX, Z1, U - 0.4, 0.3, [[(Z1 - Z0) / 2, 1.3, 2.6, 0]]);
  const g1 = (x, gaps) => f.wall(M.cal, x, Z0, x, Z1, C - U, 0.3, gaps, { y0: U });
  g1(-PX, [[Z1 - Z0 - 2.0, 1.6, 3.0, 0]]); g1(PX, [[Z1 - Z0 - 2.0, 2.2, 3.2, 0]]); g1(-QX, [[(Z1 - Z0) / 2, 1.4, 2.8, 0]]);
  // ---- térreo, à esquerda de dentro: o corpo da guarda (a tarimba dos soldados, as armas, o tambor, a mesa do cabo)
  { const cx = -(PX + QX) / 2;
    f.box(M.madeira, QX - PX - 0.6, 0.5, 1.9, cx, 0, Z0 + 1.0, NG); f.box(M.palhaCatre, QX - PX - 0.7, 0.08, 1.8, cx, 0.5, Z0 + 1.0, NG); f.solid(cx, Z0 + 1.0, QX - PX - 0.6, 1.9, -0.5, 0.58); // a tarimba (o estrado comprido onde a guarda dormia)
    for (let k = 0; k < 4; k++) f.box(k % 2 ? M.chita : M.coberta, 0.8, 0.06, 0.5, cx - 1.8 + k * 1.2, 0.58, Z0 + 0.5, NG);
    armeiro(f, M, -PX - 0.2, zb + 1.0, 0, 8, -1, 0); armeiro(f, M, -QX + 0.2, zb - 2.3, 0, 6, 1, 0);
    mesa(f, M, cx, Z1 - 2.5, 0, 1.4, 0.8, { mat: M.madeira }); banco(f, M, cx, Z1 - 3.25, 0, 1.4, true); castical(f, M, out, cx + 0.4, 0.79, Z1 - 2.5, M.ferroVelho); livro(f, M, cx - 0.2, 0.79, Z1 - 2.5, true);
    f.geo(new THREE.CylinderGeometry(0.24, 0.24, 0.42, 14), M.damasco, cx + 1.8, 0.21, Z1 - 1.0, { uv: false }); for (const s of [-1, 1]) f.geo(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 14), M.madeira, cx + 1.8, 0.21 + s * 0.2, Z1 - 1.0, { uv: false }); // o tambor
    f.box(M.madeiraEsc, 0.06, 0.1, 2.6, -QX + 0.18, 1.78, zb + 3.4, NG); // (a régua dos cabides na parede)
    for (let k = 0; k < 4; k++) { const z = zb + 2.5 + k * 0.6, wx0 = -QX + 0.15; f.box(M.madeiraEsc, 0.16, 0.04, 0.04, wx0 + 0.08, 1.82, z, NG);
      f.geo(new THREE.CylinderGeometry(0.15, 0.2, 0.98, 12), k % 2 ? M.mantoAzul : M.mantoMarrom, wx0 + 0.12, 1.3, z, { sx: 0.4, uv: false }); f.geo(new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), k % 2 ? M.mantoAzul : M.mantoMarrom, wx0 + 0.12, 1.79, z, { sx: 0.4, sy: 0.35, uv: false }); // (o capote: os ombros e a roda)
      if (k % 2) { f.box(M.ouroLiso, 0.02, 0.5, 0.05, wx0 + 0.21, 1.25, z, NG); } // (a vista amarela da farda azul dos Dragões)
      f.geo(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 3), M.escuro, wx0 + 0.2, 1.9, z, { uv: false }); f.geo(new THREE.CylinderGeometry(0.09, 0.11, 0.1, 10), M.escuro, wx0 + 0.2, 1.97, z, { uv: false }); } // (o chapéu de três bicos)
  }
  // ---- térreo, ponta esquerda: a sala das armas e da munição (barris de pólvora, as balas, as lanças, as espadas)
  { const cx = -(QX + X) / 2;
    for (let k = 0; k < 5; k++) barril(f, M, -X + 0.5, Z0 + 0.6 + k * 0.7, 0, 0.7);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4 - i; j++) for (let k = 0; k < 4 - i; k++) f.geo(new THREE.SphereGeometry(0.06, 8, 6), M.ferroVelho, cx + (j - (3 - i) / 2) * 0.13, 0.06 + i * 0.1, Z1 - 1.2 + (k - (3 - i) / 2) * 0.13, { uv: false }); // (a pilha das balas)
    for (let k = 0; k < 8; k++) f.box(M.madeira, 0.035, 2.6, 0.035, -QX - 0.12, 0.05, Z0 + 1.0 + k * 0.22, NG); f.box(M.madeiraEsc, 0.1, 0.06, 1.9, -QX - 0.1, 1.8, Z0 + 1.77, NG); for (let k = 0; k < 8; k++) f.geo(new THREE.ConeGeometry(0.03, 0.22, 4), M.ferro, -QX - 0.12, 2.76, Z0 + 1.0 + k * 0.22, { uv: false }); // as lanças
    armeiro(f, M, cx, Z0 + 0.15, 0, 9, 0, 1); for (let k = 0; k < 5; k++) { f.box(M.ferro, 0.03, 0.85, 0.008, cx - 1.0 + k * 0.5, 1.65, Z1 - 0.045, NG); f.box(M.ouroLiso, 0.14, 0.03, 0.03, cx - 1.0 + k * 0.5, 2.5, Z1 - 0.055, NG); f.box(M.couro, 0.035, 0.14, 0.03, cx - 1.0 + k * 0.5, 2.53, Z1 - 0.055, NG); } // (as espadas penduradas)
    caixote(f, M, cx + 1.6, zb, 0, 1.0, 0.6, 0.7); caixote(f, M, cx + 1.6, zb, 0.6, 0.8, 0.5, 0.6);
  }
  // ---- térreo, à direita de dentro: a secretaria do governo (as mesas dos oficiais, os papéis, as estantes, as arcas)
  { const cx = (PX + QX) / 2;
    f.box(M.soalho, QX - PX - 0.3, 0.04, Z1 - Z0 - 0.1, cx, 0.02, zb, NG);
    for (const [mx, mz] of [[cx - 1.4, zb + 1.5], [cx + 1.4, zb + 1.5], [cx, zb - 1.5]]) { mesa(f, M, mx, mz, 0.06, 1.5, 0.85, { pano: M.verdeMesa }); cadeira(f, M, mx, mz - 0.75, 0.06, 0, 1); livro(f, M, mx - 0.3, 0.85, mz, true); tinteiro(f, M, mx + 0.4, 0.85, mz - 0.15); f.box(M.papel, 0.32, 0.01, 0.24, mx + 0.25, 0.85, mz + 0.15, NG); castical(f, M, out, mx + 0.6, 0.85, mz + 0.25); }
    estante(f, M, QX - 0.4, zb - 3.8, 0.06, 3.0, 2.8, -1, 0); estante(f, M, cx, Z0 + 0.35, 0.06, 4.0, 2.8, 0, 1);
    for (let k = 0; k < 3; k++) arca(f, M, PX + 0.55, Z0 + 1.4 + k * 1.3, 0.06, 0.6, 1.1, 0.6);
    quadro(f, M, M.mapa, PX + 0.18, 1.9, zb + 1.5, 1.6, 1.2, 1, 0, M.jacaranda);
  }
  // ---- térreo, ponta direita: a sala de espera das audiências (os bancos encostados, o oficial da porta)
  { const cx = (QX + X) / 2; for (const s of [-1, 1]) banco(f, M, cx + s * 2.5, zb, 0, 3.0, false); banco(f, M, cx, Z0 + 0.4, 0, 3.0, true); mesa(f, M, cx, Z1 - 1.5, 0, 1.2, 0.7); cadeira(f, M, cx, Z1 - 2.2, 0, 0, 1); quadro(f, M, M.paisagem, X - 0.03, 2.2, zb, 1.6, 1.1, -1, 0); }
  // ---- andar nobre, à direita: a sala do dossel — o pano vermelho com as armas reais e a cadeira sobre o estrado
  { const ex = X - 1.4;
    f.box(M.tapete, 9.0, 0.012, 6.0, (PX + X) / 2 + 0.6, U, zb, NG);
    f.box(M.damasco, 2.2, 0.3, 4.4, ex, U, zb, NG); f.box(M.ouroLiso, 2.24, 0.04, 4.44, ex, U + 0.3, zb, NG); f.solid(ex, zb, 2.2, 4.4, U - 0.3, U + 0.32); // o estrado
    f.box(M.armas, 0.03, 2.8, 2.2, X - 0.1, U + 0.9, zb, { ...NG, uv: false }); f.box(M.damasco, 0.04, 3.2, 3.6, X - 0.06, U + 0.3, zb, NG); // o espaldar do dossel
    f.box(M.damasco, 2.0, 0.12, 3.6, X - 1.0, C - 0.5, zb, NG); f.box(M.ouroLiso, 2.04, 0.05, 3.64, X - 1.0, C - 0.55, zb, NG); for (let k = 0; k < 18; k++) f.box(M.damasco, 0.02, 0.32, 0.18, X - 2.0, C - 0.85, zb - 1.7 + k * 0.2, NG); // o sobrecéu com a sanefa franjada
    { const cx = ex + 0.2, y = U + 0.32; f.box(M.ouroLiso, 0.7, 0.08, 0.7, cx, y + 0.45, zb, NG); f.box(M.damasco, 0.62, 0.06, 0.62, cx, y + 0.53, zb, NG); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) f.box(M.ouroLiso, 0.06, 0.45, 0.06, cx + a * 0.3, y, zb + b * 0.3, NG); f.box(M.ouroLiso, 0.08, 1.3, 0.7, cx + 0.32, y + 0.5, zb, NG); f.box(M.damasco, 0.03, 1.05, 0.56, cx + 0.27, y + 0.62, zb, NG); f.geo(lathe([[0.12, 0], [0.14, 0.05], [0.05, 0.18], [0, 0.22]], 8), M.ouroLiso, cx + 0.32, y + 1.8, zb, { uv: false }); f.solid(cx, zb, 0.75, 0.75, y - 0.3, y + 1.3); } // (a cadeira de espaldar, vazia: é a cadeira do rei)
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) cadeira(f, M, PX + 2.2 + k * 2.0, zb + s * 4.5, U, 0, -s);
    for (const s of [-1, 1]) { f.box(M.jacaranda, 0.6, 0.85, 1.4, ex - 0.2, U, zb + s * 4.2, NG); f.solid(ex - 0.2, zb + s * 4.2, 0.6, 1.4, U - 0.3, U + 0.9); castical(f, M, out, ex - 0.2, U + 0.85, zb + s * 4.2 - 0.35); castical(f, M, out, ex - 0.2, U + 0.85, zb + s * 4.2 + 0.35); }
    for (const z of [zb - 2.6, zb + 2.6]) lustre(f, M, out, (PX + X) / 2, C - 1.15, z, 10, 0.7);
    quadro(f, M, M.paisagem, (PX + X) / 2 - 1.5, U + 1.9, Z0 + 0.03, 2.0, 1.4, 0, 1); quadro(f, M, M.paisagem, (PX + X) / 2 + 2.5, U + 1.9, Z0 + 0.03, 2.0, 1.4, 0, 1);
    barrado(f, M, M.marmoreado, PX + 0.2, Z0 + 0.03, X - 0.05, Z0 + 0.03, U, 1.0);
  }
  // ---- andar nobre, à esquerda de dentro: o gabinete do governador (a secretária, o mapa da capitania, os livros)
  { const cx = -(PX + QX) / 2;
    f.box(M.tapete, 3.4, 0.012, 2.6, cx, U, zb + 0.3, NG);
    mesa(f, M, cx, zb + 0.3, U, 2.0, 1.0, { pano: M.verdeMesa }); cadeira(f, M, cx, zb - 0.55, U, 0, 1); cadeira(f, M, cx - 0.5, zb + 1.2, U, 0, -1); cadeira(f, M, cx + 0.5, zb + 1.2, U, 0, -1);
    livro(f, M, cx - 0.5, U + 0.79, zb + 0.3, true); f.box(M.papel, 0.3, 0.01, 0.22, cx + 0.1, U + 0.79, zb + 0.45, NG); f.box(M.papel, 0.3, 0.01, 0.22, cx + 0.15, U + 0.8, zb + 0.4, { ...NG, ry: 0.3 }); tinteiro(f, M, cx + 0.5, U + 0.79, zb + 0.1); f.box(M.damasco, 0.06, 0.03, 0.06, cx + 0.35, U + 0.79, zb + 0.5, NG); // (o lacre)
    castical(f, M, out, cx - 0.85, U + 0.79, zb + 0.6); castical(f, M, out, cx + 0.85, U + 0.79, zb + 0.6);
    quadro(f, M, M.mapa, cx, U + 1.3, Z0 + 0.03, 3.2, 2.4, 0, 1, M.jacaranda); // a carta da capitania de Minas
    estante(f, M, -PX - 0.4, zb - 1.5, U, 3.6, 2.8, -1, 0); arca(f, M, -QX + 0.5, zb + 2.5, U, 0.6, 1.2, 0.65, { cofre: true });
  }
  // ---- andar nobre, ponta esquerda: a capela do palácio (o retábulo, os bancos, as velas)
  { f.box(M.tapete, 2.0, 0.012, 4.0, -X + 2.2, U, zb, NG);
    { const ax = -X; // (encostado na parede do fundo da capela, olhando para +x)
      f.box(M.ouro, 0.6, 0.9, 3.0, ax + 0.3, U, zb, NG); f.solid(ax + 0.3, zb, 0.6, 3.0, U - 0.3, U + 0.9); // o banco (a base) do retábulo
      f.box(M.ouro, 0.8, 1.0, 1.9, ax + 1.0, U, zb, NG); f.box(M.marmoreado, 0.03, 0.74, 1.7, ax + 1.41, U + 0.12, zb, NG); f.box(M.toalha, 0.86, 0.04, 2.0, ax + 1.0, U + 1.0, zb, NG); f.box(M.toalha, 0.02, 0.28, 2.0, ax + 1.43, U + 0.74, zb, NG); f.solid(ax + 1.0, zb, 0.8, 1.9, U - 0.3, U + 1.04); // a mesa do altar, o frontal e a toalha
      f.box(M.marmoreado, 0.08, 3.0, 3.0, ax + 0.04, U + 0.9, zb, NG); f.box(M.azulCamarim, 0.04, 1.6, 1.3, ax + 0.1, U + 1.0, zb, NG); // o fundo e o nicho
      for (const s of [-1, 1]) for (const dz of [0.85, 1.3]) { const z = zb + s * dz; f.geo(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 10), M.ouro, ax + 0.32, U + 1.01, z, { uv: M.ouro.userData.uv }); f.geo(colunaTorsa(1.55, 0.1), M.ouro, ax + 0.32, U + 1.12, z, { uv: M.ouro.userData.uv }); f.box(M.ouro, 0.3, 0.2, 0.3, ax + 0.32, U + 2.67, z, NG); }
      f.box(M.ouro, 0.6, 0.28, 3.2, ax + 0.32, U + 2.87, zb, NG); f.box(M.ouroLiso, 0.66, 0.05, 3.26, ax + 0.32, U + 3.15, zb, NG); // a cornija
      f.geo(new THREE.TorusGeometry(0.62, 0.11, 8, 20, Math.PI), M.ouroLiso, ax + 0.3, U + 3.18, zb, { ry: Math.PI / 2, uv: false }); f.box(M.ouro, 0.12, 0.5, 0.9, ax + 0.18, U + 3.18, zb, NG); // o arco do coroamento e a tarja
      for (const s of [-1, 1]) f.geo(new THREE.TorusGeometry(0.22, 0.07, 6, 12, Math.PI * 1.3), M.ouroLiso, ax + 0.3, U + 3.38, zb + s * 1.1, { ry: Math.PI / 2, rz: s > 0 ? 0.2 : Math.PI - 1.15, uv: false }); // (as volutas)
      f.geo(lathe([[0.18, 0], [0.2, 0.06], [0.12, 0.12], [0.16, 0.2], [0.04, 0.32], [0, 0.34]], 10), M.ouroLiso, ax + 0.3, U + 0.9, zb, { uv: false }); // a peanha da imagem
      const [wx2, wz2] = f.W(ax + 0.32, zb); out.statues.push({ x: wx2, y: f.y + U + 1.24, z: wz2, ry: f.ry + Math.PI / 2, h: 1.2, key: 'inmaculada' });
      for (const dz of [-0.75, -0.4, 0.4, 0.75]) castical(f, M, out, ax + 0.85, U + 1.04, zb + dz, M.ouroLiso);
      f.box(M.ouro, 0.03, 0.34, 0.44, ax + 0.72, U + 1.04, zb, NG); } // (a sacra no meio da mesa)
    for (let k = 0; k < 3; k++) banco(f, M, -X + 4.2 + k * 1.3, zb, U, 3.2, false, M.jacaranda);
    barrado(f, M, M.lambril, -QX - 0.17, Z0 + 0.1, -QX - 0.17, zb - 0.75, U, 1.2); barrado(f, M, M.lambril, -QX - 0.17, zb + 0.75, -QX - 0.17, Z1 - 0.1, U, 1.2); barrado(f, M, M.lambril, -X + 0.05, Z1 - 0.05, -QX - 0.2, Z1 - 0.05, U, 0.75); barrado(f, M, M.lambril, -X + 0.05, Z0 + 0.05, -QX - 0.2, Z0 + 0.05, U, 1.2);
    lustre(f, M, out, -(X + QX) / 2, C - 1.2, zb, 6, 0.45);
  }
  // ---- o vestíbulo de cima: os bancos encostados e as lanternas
  for (const s of [-1, 1]) banco(f, M, s * 2.5, Z1 - 0.4, U, 1.8, true, M.jacaranda);
  for (const s of [-1, 1]) for (const zz of [Z(3.6), Z(6.2)]) { const [a, b] = f.W(s * (PX - 0.3), zz); out.candles.push(new THREE.Vector3(a, f.y + 2.45, b)); f.box(M.ferro, 0.14, 0.32, 0.14, s * (PX - 0.3), 2.2, zz, NG); f.box(M.ferro, 0.12, 0.03, 0.03, s * (PX - 0.22), 2.36, zz, NG); } // (as lanternas de ferro na parede do vestíbulo)
  out.interiors.push({ id: 'palacio', at: f.W(0, zb), y: f.y, light: [f.W(0, zb + 4), f.y + 3.0], light2: [f.W(0, zb), f.y + U + 3.0] });
  out.spots.palacioDossel = f.W(X - 3, zb); out.spots.palacioGabinete = f.W(-(PX + QX) / 2, zb); out.spots.palacioGuarda = f.W(-(PX + QX) / 2, zb + 2);
}
