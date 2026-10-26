// Texturas procedurais desenhadas em canvas (nada de arquivos externos)
import * as THREE from 'three';
import { fbm, vnoise, mulberry32, clamp } from '../comum/util.js';

let maxAniso = 8;
export function setAniso(n) { maxAniso = n; }

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h || w;
  return c;
}

function toTexture(canvas, { repeat = [1, 1], srgb = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = maxAniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// Preenche pixel a pixel com uma função (u, v) -> [r, g, b, a]
function pixels(size, fn, h) {
  const c = makeCanvas(size, h || size);
  const ctx = c.getContext('2d');
  const H = h || size;
  const img = ctx.createImageData(size, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < size; x++) {
      const p = fn(x, y);
      const i = (y * size + x) * 4;
      d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = p[3] === undefined ? 255 : p[3];
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function noiseFill(size, base, amp, scale = 8, oct = 4) {
  return pixels(size, (x, y) => {
    const n = fbm((x / size) * scale, (y / size) * scale, oct, scale) - 0.5;
    const g = (vnoise(x * 0.7, y * 0.7) - 0.5) * amp * 0.35;
    return [
      clamp(base[0] + n * amp + g, 0, 255),
      clamp(base[1] + n * amp + g, 0, 255),
      clamp(base[2] + n * amp * 0.9 + g, 0, 255),
    ];
  });
}

// Juntas de blocos de pedra
function drawBlocks(ctx, size, rowH, blockW, color, width = 1.5, alpha = 0.35) {
  const rnd = mulberry32(7);
  ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = width;
  for (let y = 0; y <= size; y += rowH) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
    const off = (y / rowH) % 2 ? blockW / 2 : 0;
    for (let x = off; x <= size; x += blockW * (0.8 + rnd() * 0.4)) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + rowH); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

const PAL = { blue: '#2c5d9c', red: '#a8392a', green: '#3d7f59', yellow: '#d9a23e', black: '#1d1712', white: '#efe6d2', turq: '#3aa3a0' };

// Hieróglifos estilizados
function glyph(ctx, kind, x, y, s, rnd) {
  ctx.save(); ctx.translate(x, y);
  ctx.lineWidth = Math.max(1, s * 0.09); ctx.strokeStyle = PAL.black;
  const fill = [PAL.blue, PAL.red, PAL.green, PAL.yellow, PAL.turq][Math.floor(rnd() * 5)];
  ctx.fillStyle = fill;
  switch (kind) {
    case 0: // sol (Rá)
      ctx.beginPath(); ctx.arc(0, 0, s * 0.32, 0, 7); ctx.fillStyle = PAL.red; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s * 0.07, 0, 7); ctx.fillStyle = PAL.black; ctx.fill(); break;
    case 1: // ankh
      ctx.beginPath(); ctx.ellipse(0, -s * 0.22, s * 0.14, s * 0.18, 0, 0, 7); ctx.stroke();
      ctx.fillRect(-s * 0.3, -s * 0.05, s * 0.6, s * 0.1); ctx.strokeRect(-s * 0.3, -s * 0.05, s * 0.6, s * 0.1);
      ctx.fillRect(-s * 0.05, 0, s * 0.1, s * 0.45); ctx.strokeRect(-s * 0.05, 0, s * 0.1, s * 0.45); break;
    case 2: // pássaro
      ctx.beginPath(); ctx.moveTo(-s * 0.35, s * 0.1); ctx.quadraticCurveTo(-s * 0.1, -s * 0.25, s * 0.2, -s * 0.15);
      ctx.lineTo(s * 0.38, -s * 0.2); ctx.lineTo(s * 0.22, -s * 0.05); ctx.quadraticCurveTo(s * 0.1, s * 0.25, -s * 0.35, s * 0.1);
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, s * 0.15); ctx.lineTo(-s * 0.05, s * 0.42); ctx.moveTo(s * 0.08, s * 0.14); ctx.lineTo(s * 0.1, s * 0.42); ctx.stroke(); break;
    case 3: // água (zigue-zague)
      ctx.strokeStyle = PAL.blue; ctx.lineWidth = s * 0.1; ctx.beginPath();
      for (let i = 0; i <= 6; i++) ctx.lineTo(-s * 0.4 + i * s * 0.133, i % 2 ? -s * 0.06 : s * 0.06);
      ctx.stroke(); break;
    case 4: // olho de Hórus
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.3, s * 0.13, 0, 0, 7); ctx.fillStyle = PAL.white; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s * 0.09, 0, 7); ctx.fillStyle = PAL.black; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s * 0.05, s * 0.12); ctx.lineTo(-s * 0.1, s * 0.38); ctx.moveTo(s * 0.12, s * 0.12); ctx.quadraticCurveTo(s * 0.3, s * 0.4, s * 0.1, s * 0.4); ctx.stroke(); break;
    case 5: // junco
      ctx.beginPath(); ctx.moveTo(0, s * 0.42); ctx.quadraticCurveTo(s * 0.18, 0, 0, -s * 0.42); ctx.quadraticCurveTo(-s * 0.1, 0, 0, s * 0.42); ctx.fillStyle = PAL.green; ctx.fill(); ctx.stroke(); break;
    case 6: // cesto
      ctx.beginPath(); ctx.arc(0, -s * 0.05, s * 0.3, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 7: // escaravelho
      ctx.beginPath(); ctx.ellipse(0, s * 0.05, s * 0.2, s * 0.28, 0, 0, 7); ctx.fillStyle = PAL.turq; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.38, -s * 0.1); ctx.lineTo(s * 0.38, -s * 0.1); ctx.moveTo(-s * 0.38, s * 0.2); ctx.lineTo(s * 0.38, s * 0.2); ctx.stroke(); break;
    default: // traço / cobra
      ctx.beginPath(); ctx.moveTo(-s * 0.4, s * 0.1);
      ctx.bezierCurveTo(-s * 0.1, -s * 0.3, s * 0.1, s * 0.3, s * 0.4, -s * 0.05); ctx.lineWidth = s * 0.12; ctx.strokeStyle = PAL.yellow; ctx.stroke();
  }
  ctx.restore();
}

// Figura humana de perfil, estilo egípcio
function figure(ctx, x, y, h, rnd, deity = false) {
  ctx.save(); ctx.translate(x, y);
  const skin = rnd() < 0.5 ? '#9a4a2a' : '#c2714a';
  ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.black;
  // pernas
  ctx.fillStyle = skin;
  ctx.fillRect(-h * 0.06, -h * 0.42, h * 0.05, h * 0.42); ctx.fillRect(h * 0.05, -h * 0.42, h * 0.05, h * 0.42);
  // saiote
  ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.moveTo(-h * 0.1, -h * 0.58); ctx.lineTo(h * 0.14, -h * 0.58); ctx.lineTo(h * 0.18, -h * 0.38); ctx.lineTo(-h * 0.1, -h * 0.38); ctx.closePath(); ctx.fill(); ctx.stroke();
  // torso
  ctx.fillStyle = skin; ctx.beginPath(); ctx.moveTo(-h * 0.14, -h * 0.86); ctx.lineTo(h * 0.14, -h * 0.86); ctx.lineTo(h * 0.07, -h * 0.58); ctx.lineTo(-h * 0.07, -h * 0.58); ctx.closePath(); ctx.fill(); ctx.stroke();
  // colar
  ctx.fillStyle = PAL.blue; ctx.fillRect(-h * 0.12, -h * 0.86, h * 0.24, h * 0.04);
  // braço estendido
  ctx.strokeStyle = skin; ctx.lineWidth = h * 0.04; ctx.beginPath(); ctx.moveTo(h * 0.1, -h * 0.82); ctx.lineTo(h * 0.3, -h * 0.72); ctx.stroke();
  if (deity) { ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.black; glyph(ctx, 1, h * 0.34, -h * 0.7, h * 0.18, rnd); }
  // cabeça e peruca
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, -h * 0.93, h * 0.07, 0, 7); ctx.fill();
  ctx.fillStyle = deity ? PAL.blue : PAL.black; ctx.beginPath(); ctx.arc(-h * 0.02, -h * 0.95, h * 0.08, Math.PI * 0.6, Math.PI * 2.1); ctx.fill();
  if (deity) { ctx.fillStyle = PAL.red; ctx.beginPath(); ctx.arc(0, -h * 1.08, h * 0.05, 0, 7); ctx.fill(); }
  ctx.restore();
}

function band(ctx, y, h, w, rnd) {
  const cols = [PAL.blue, PAL.red, PAL.green, PAL.yellow];
  const bw = h * 0.6;
  for (let x = 0; x < w; x += bw) {
    ctx.fillStyle = cols[Math.floor(x / bw) % 4]; ctx.fillRect(x, y, bw * 0.8, h);
  }
  ctx.fillStyle = PAL.black; ctx.fillRect(0, y - 2, w, 2); ctx.fillRect(0, y + h, w, 2);
}

const cache = {};

export function getTextures(photo = false) {
  if (cache.ready) return cache;

  // Detalhe de areia (multiplicado pelas cores de vértice do terreno)
  cache.sandDetail = toTexture(pixels(512, (x, y) => {
    const n = fbm((x / 512) * 16, (y / 512) * 16, 4, 16);
    const ripple = Math.sin((x * 0.05 + fbm(x / 64, y / 64, 2, 8) * 6)) * 0.03;
    const g = vnoise(x * 1.3, y * 1.3) * 0.12;
    const v = clamp(0.82 + n * 0.22 + ripple + g - 0.06, 0, 1) * 255;
    return [v, v * 0.98, v * 0.95];
  }), { repeat: [1, 1] });

  if (!photo) {
  // Calcário branco de Tura (revestimento das pirâmides)
  {
    const c = noiseFill(512, [224, 210, 182], 30, 6);
    drawBlocks(c.getContext('2d'), 512, 32, 96, '#7a6844', 1.4, 0.45);
    cache.limestone = toTexture(c);
  }
  // Arenito em blocos
  {
    const c = noiseFill(512, [204, 168, 118], 40, 8);
    drawBlocks(c.getContext('2d'), 512, 64, 128, '#5a4228', 2, 0.45);
    cache.sandstone = toTexture(c);
  }
  // Parede com relevos pintados
  {
    const S = 512;
    const c = noiseFill(S, [214, 182, 132], 34, 8);
    const ctx = c.getContext('2d');
    drawBlocks(ctx, S, 64, 128, '#5a4228', 1, 0.2);
    const rnd = mulberry32(42);
    band(ctx, 8, 18, S, rnd);
    // dois registros com figuras e colunas de hieróglifos
    for (let r = 0; r < 2; r++) {
      const top = 40 + r * 220, bottom = top + 200;
      ctx.fillStyle = PAL.black; ctx.fillRect(0, bottom, S, 3);
      let x = 20;
      while (x < S - 40) {
        if (rnd() < 0.45) {
          figure(ctx, x + 30, bottom - 4, 170, rnd, rnd() < 0.3); x += 80;
        } else {
          for (let i = 0; i < 5; i++) glyph(ctx, Math.floor(rnd() * 9), x + 16, top + 20 + i * 36, 30, rnd);
          ctx.fillStyle = PAL.black; ctx.globalAlpha = 0.5; ctx.fillRect(x + 34, top + 4, 1.5, 190); ctx.globalAlpha = 1;
          x += 36;
        }
      }
    }
    band(ctx, S - 26, 18, S, rnd);
    cache.relief = toTexture(c);
  }
  // Coluna papiriforme pintada
  {
    const W = 256, H = 512;
    const c = makeCanvas(W, H); const ctx = c.getContext('2d');
    const base = noiseFill(W, [212, 178, 128], 30, 6);
    ctx.drawImage(base, 0, 0, W, H);
    const rnd = mulberry32(9);
    const cols = [PAL.blue, PAL.red, PAL.green, PAL.yellow];
    for (let i = 0; i < 4; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(0, 8 + i * 9, W, 6); }
    // cartuchos
    for (let k = 0; k < 2; k++) {
      const cx = 64 + k * 128;
      ctx.strokeStyle = PAL.black; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(cx - 26, 80, 52, 200, 24); ctx.stroke();
      for (let i = 0; i < 5; i++) glyph(ctx, Math.floor(rnd() * 9), cx, 105 + i * 38, 30, rnd);
    }
    for (let k = 0; k < 6; k++) figure(ctx, 20 + k * 44, 420, 110, rnd, rnd() < 0.4);
    // pétalas na base
    for (let x = 0; x < W; x += 22) {
      ctx.fillStyle = PAL.green; ctx.beginPath(); ctx.moveTo(x, H); ctx.quadraticCurveTo(x + 11, H - 60, x + 22, H); ctx.fill();
      ctx.strokeStyle = PAL.black; ctx.lineWidth = 1; ctx.stroke();
    }
    cache.column = toTexture(c);
  }
  // Reboco de barro (casas)
  cache.mud = toTexture(pixels(512, (x, y) => {
    const n = fbm((x / 512) * 6, (y / 512) * 6, 5, 6);
    const brickY = y % 32 < 2, brickX = ((x + (Math.floor(y / 32) % 2) * 32) % 64) < 2;
    const chip = fbm(x / 512 * 4 + 9, y / 512 * 4, 3, 4) > 0.62;
    let r = 192 + (n - 0.5) * 50, g = 158 + (n - 0.5) * 44, b = 112 + (n - 0.5) * 36;
    if (chip) { r -= 28; g -= 30; b -= 26; if (brickY || brickX) { r -= 30; g -= 28; b -= 22; } }
    return [r, g, b];
  }));
  // Cal branca
  cache.white = toTexture(noiseFill(512, [214, 202, 178], 26, 5, 5));
  // Parede do palácio: cal com friso colorido no alto
  {
    const S = 512;
    const c = noiseFill(S, [234, 226, 208], 18, 5);
    const ctx = c.getContext('2d');
    const rnd = mulberry32(3);
    band(ctx, 20, 26, S, rnd);
    // friso khekher
    for (let x = 0; x < S; x += 16) {
      ctx.fillStyle = [PAL.red, PAL.blue, PAL.green][Math.floor(x / 16) % 3];
      ctx.beginPath(); ctx.moveTo(x + 2, 70); ctx.lineTo(x + 2, 52); ctx.arc(x + 8, 52, 6, Math.PI, 0); ctx.lineTo(x + 14, 70); ctx.fill();
    }
    // lótus na base
    ctx.fillStyle = '#c8b79a'; ctx.fillRect(0, S - 60, S, 60);
    for (let x = 8; x < S; x += 40) {
      ctx.fillStyle = PAL.blue; ctx.beginPath(); ctx.moveTo(x, S - 64); ctx.lineTo(x + 12, S - 100); ctx.lineTo(x + 24, S - 64); ctx.fill();
      ctx.fillStyle = PAL.green; ctx.fillRect(x + 11, S - 64, 2, 40);
    }
    cache.palaceWall = toTexture(c);
  }
  // Madeira
  cache.wood = toTexture(pixels(256, (x, y) => {
    const n = fbm(x / 256 * 2, y / 256 * 24, 4, 2);
    const plank = (x % 64) < 2 ? 0.6 : 1;
    const v = (0.65 + n * 0.5) * plank;
    return [120 * v, 82 * v, 50 * v];
  }));
  // Toldos de linho listrado
  cache.awnings = [['#efe6d2', '#a8392a'], ['#efe6d2', '#2c5d9c'], ['#d9a23e', '#3d7f59'], ['#efe6d2', '#d9a23e']].map(([a, b]) => {
    const c = makeCanvas(128); const ctx = c.getContext('2d');
    for (let x = 0; x < 128; x += 16) { ctx.fillStyle = (x / 16) % 2 ? b : a; ctx.fillRect(x, 0, 16, 128); }
    const n = noiseFill(128, [128, 128, 128], 30, 4);
    ctx.globalAlpha = 0.18; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(n, 0, 0); ctx.globalAlpha = 1;
    return toTexture(c);
  });
  } // fim das texturas substituídas pelas fotos
  // Nemes (listras azul e ouro)
  {
    const c = makeCanvas(64, 256); const ctx = c.getContext('2d');
    for (let y = 0; y < 256; y += 16) { ctx.fillStyle = (y / 16) % 2 ? '#1f3f8c' : '#e3b23c'; ctx.fillRect(0, y, 64, 16); }
    cache.nemes = toTexture(c);
  }
  // Pele de leopardo
  {
    const c = noiseFill(256, [214, 160, 70], 30, 4); const ctx = c.getContext('2d');
    const rnd = mulberry32(5);
    for (let i = 0; i < 90; i++) {
      const x = rnd() * 256, y = rnd() * 256, r = 5 + rnd() * 5;
      ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r, rnd() * 2, rnd() * 2 + 4.5); ctx.stroke();
    }
    cache.leopard = toTexture(c);
  }
  // Couro malhado (escudos e gado)
  cache.hide = toTexture(pixels(256, (x, y) => {
    const n = fbm(x / 256 * 5, y / 256 * 5, 4, 5);
    return n > 0.55 ? [90, 52, 30] : [232, 222, 206];
  }));
  // Folha de palmeira (com alfa): folíolos largos, em forma de lança, com variação de cor
  {
    const W = 128, H = 512;
    const c = makeCanvas(W, H); const ctx = c.getContext('2d');
    ctx.strokeStyle = '#7a6a34'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    for (let y = 8; y < H; y += 7) {
      const len = (W / 2 - 3) * Math.sin((y / H) * Math.PI * 0.95 + 0.12);
      const g = 95 + Math.floor(Math.random() * 45), dry = Math.random() < 0.12;
      ctx.fillStyle = dry ? 'rgb(150,128,62)' : `rgb(${58 + g * 0.25},${g},38)`;
      for (const s of [-1, 1]) {
        const ex = W / 2 + s * len, ey = y + 26;
        ctx.beginPath(); ctx.moveTo(W / 2, y); ctx.quadraticCurveTo(W / 2 + s * len * 0.5, y + 4, ex, ey);
        ctx.quadraticCurveTo(W / 2 + s * len * 0.5, y + 13, W / 2, y + 7); ctx.fill();
      }
    }
    cache.frond = toTexture(c);
  }
  // Casca da palmeira
  cache.bark = toTexture(pixels(128, (x, y) => {
    const d = ((x + (Math.floor(y / 12) % 2) * 8) % 16) / 16;
    const s = (y % 12) / 12;
    const v = 0.55 + 0.3 * Math.min(d, 1 - d) * 2 * (0.5 + s * 0.5) + (vnoise(x, y) - 0.5) * 0.15;
    return [130 * v, 98 * v, 66 * v];
  }), { repeat: [2, 6] });
  // Trigo / capim
  {
    const c = makeCanvas(64, 128); const ctx = c.getContext('2d');
    for (let i = 0; i < 26; i++) {
      const x = 4 + Math.random() * 56; const top = 10 + Math.random() * 40;
      ctx.strokeStyle = `hsl(${48 + Math.random() * 30},${50 + Math.random() * 20}%,${40 + Math.random() * 20}%)`; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x, 128); ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 10, 70, x + (Math.random() - 0.5) * 8, top); ctx.stroke();
      ctx.fillStyle = '#d9b860'; ctx.beginPath(); ctx.ellipse(x, top, 2.2, 7, 0, 0, 7); ctx.fill();
    }
    cache.wheat = toTexture(c);
  }

  // Mapa de normais da água (repetível) para o shader do Nilo
  {
    const S = 256;
    const hgt = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      hgt[y * S + x] = fbm(u * 8, v * 8, 5, 8) * 1.0 +
        0.25 * Math.sin((u * 6 + v * 4) * Math.PI * 2) + 0.15 * Math.sin((u * -3 + v * 9) * Math.PI * 2);
    }
    const c = pixels(S, (x, y) => {
      const l = hgt[y * S + ((x - 1 + S) % S)], r = hgt[y * S + ((x + 1) % S)];
      const t = hgt[((y - 1 + S) % S) * S + x], b = hgt[((y + 1) % S) * S + x];
      let nx = (l - r) * 4, ny = (t - b) * 4, nz = 1;
      const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
      return [(nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, (nz * 0.5 + 0.5) * 255];
    });
    cache.waterNormals = toTexture(c, { srgb: false });
  }

  // Brilho radial (chamas, lua, escaravelhos)
  {
    const c = makeCanvas(128); const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,240,200,0.6)'); g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    cache.glow = toTexture(c);
  }

  cache.ready = true;
  return cache;
}

// ---------------------------------------------------------------------------
// Texturas fotográficas PBR (Poly Haven, CC0) em assets/textures/<id>/{diff,nor,rough}.jpg
// ---------------------------------------------------------------------------
export const PBR_IDS = ['sandstone_blocks_08', 'white_sandstone_blocks_02', 'rough_plaster_brick', 'clay_plaster',
  'white_plaster_rough_01', 'weathered_planks', 'rough_linen', 'rock_boulder_dry', 'aerial_sand', 'dry_ground_01', 'brown_mud_dry'];

export async function loadPBR(base, onProgress) {
  const loader = new THREE.TextureLoader();
  const out = {};
  let done = 0;
  const total = PBR_IDS.length * 3;
  await Promise.all(PBR_IDS.flatMap((id) => {
    out[id] = {};
    return [['diff', 'map'], ['nor', 'normalMap'], ['rough', 'roughnessMap']].map(([f, key]) =>
      loader.loadAsync(`${base}/${id}/${f}.jpg`).then((t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = maxAniso;
        if (key === 'map') t.colorSpace = THREE.SRGBColorSpace;
        out[id][key] = t;
        onProgress && onProgress(++done / total);
      }));
  }));
  return out;
}

// clona um conjunto PBR com outra repetição
export function pbrSet(set, repeat = 1, extra = {}) {
  const o = {};
  for (const k of ['map', 'normalMap', 'roughnessMap']) {
    if (!set[k]) continue;
    const t = set[k].clone();
    if (Array.isArray(repeat)) t.repeat.set(repeat[0], repeat[1]); else t.repeat.set(repeat, repeat);
    t.needsUpdate = true; o[k] = t;
  }
  return { ...o, ...extra };
}

// pinturas egípcias aplicadas sobre a foto da pedra / reboco
function photoCanvas(img, S, tiles) {
  const c = makeCanvas(S); const ctx = c.getContext('2d');
  const step = S / tiles;
  for (let y = 0; y < tiles; y++) for (let x = 0; x < tiles; x++) ctx.drawImage(img, x * step, y * step, step, step);
  return c;
}
function grainOver(ctx, img, S, tiles, alpha) {
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = alpha;
  const step = S / tiles;
  for (let y = 0; y < tiles; y++) for (let x = 0; x < tiles; x++) ctx.drawImage(img, x * step, y * step, step, step);
  ctx.restore();
}

export function buildPhotoComposites(tex, pbr) {
  const stone = pbr.sandstone_blocks_08.map.image;
  const plaster = pbr.white_plaster_rough_01.map.image;
  const linen = pbr.rough_linen.map.image;
  // relevos pintados sobre arenito (2048 = 3x3 ladrilhos de pedra)
  {
    const S = 2048, T = 3;
    const c = photoCanvas(stone, S, T); const ctx = c.getContext('2d');
    const paint = makeCanvas(S); const p = paint.getContext('2d');
    p.scale(S / 512, S / 512);
    const rnd = mulberry32(42);
    band(p, 8, 18, 512, rnd);
    for (let r = 0; r < 2; r++) {
      const top = 40 + r * 220, bottom = top + 200;
      p.fillStyle = PAL.black; p.fillRect(0, bottom, 512, 2);
      let x = 20;
      while (x < 512 - 40) {
        if (rnd() < 0.45) { figure(p, x + 30, bottom - 4, 170, rnd, rnd() < 0.3); x += 80; }
        else { for (let i = 0; i < 5; i++) glyph(p, Math.floor(rnd() * 9), x + 16, top + 20 + i * 36, 30, rnd); x += 36; }
      }
    }
    band(p, 512 - 26, 18, 512, rnd);
    ctx.globalAlpha = 0.8; ctx.drawImage(paint, 0, 0); ctx.globalAlpha = 1;
    grainOver(ctx, stone, S, T, 0.35);
    tex.relief = toTexture(c);
    tex.reliefTiles = T;
  }
  // coluna papiriforme
  {
    const W = 1024, H = 2048;
    const c = makeCanvas(W, H); const ctx = c.getContext('2d');
    for (let y = 0; y < 4; y++) for (let x = 0; x < 2; x++) ctx.drawImage(stone, x * 512, y * 512, 512, 512);
    const paint = makeCanvas(W, H); const p = paint.getContext('2d'); p.scale(4, 4);
    const rnd = mulberry32(9);
    const cols = [PAL.blue, PAL.red, PAL.green, PAL.yellow];
    for (let i = 0; i < 4; i++) { p.fillStyle = cols[i]; p.fillRect(0, 8 + i * 9, 256, 6); }
    for (let k = 0; k < 2; k++) {
      const cx = 64 + k * 128;
      p.strokeStyle = PAL.black; p.lineWidth = 3; p.beginPath(); p.roundRect(cx - 26, 80, 52, 200, 24); p.stroke();
      for (let i = 0; i < 5; i++) glyph(p, Math.floor(rnd() * 9), cx, 105 + i * 38, 30, rnd);
    }
    for (let k = 0; k < 6; k++) figure(p, 20 + k * 44, 420, 110, rnd, rnd() < 0.4);
    for (let x = 0; x < 256; x += 22) { p.fillStyle = PAL.green; p.beginPath(); p.moveTo(x, 512); p.quadraticCurveTo(x + 11, 452, x + 22, 512); p.fill(); }
    ctx.globalAlpha = 0.82; ctx.drawImage(paint, 0, 0); ctx.globalAlpha = 1;
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.3;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 2; x++) ctx.drawImage(stone, x * 512, y * 512, 512, 512);
    ctx.restore();
    tex.column = toTexture(c);
  }
  // parede do palácio: reboco caiado + friso
  {
    const S = 1024;
    const c = photoCanvas(plaster, S, 2); const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(240,228,200,0.25)'; ctx.fillRect(0, 0, S, S);
    const paint = makeCanvas(S); const p = paint.getContext('2d'); p.scale(2, 2);
    const rnd = mulberry32(3);
    band(p, 20, 26, 512, rnd);
    for (let x = 0; x < 512; x += 16) {
      p.fillStyle = [PAL.red, PAL.blue, PAL.green][Math.floor(x / 16) % 3];
      p.beginPath(); p.moveTo(x + 2, 70); p.lineTo(x + 2, 52); p.arc(x + 8, 52, 6, Math.PI, 0); p.lineTo(x + 14, 70); p.fill();
    }
    p.fillStyle = 'rgba(160,130,90,0.55)'; p.fillRect(0, 512 - 60, 512, 60);
    for (let x = 8; x < 512; x += 40) {
      p.fillStyle = PAL.blue; p.beginPath(); p.moveTo(x, 512 - 64); p.lineTo(x + 12, 512 - 100); p.lineTo(x + 24, 512 - 64); p.fill();
      p.fillStyle = PAL.green; p.fillRect(x + 11, 512 - 64, 2, 40);
    }
    ctx.globalAlpha = 0.85; ctx.drawImage(paint, 0, 0); ctx.globalAlpha = 1;
    grainOver(ctx, plaster, S, 2, 0.3);
    tex.palaceWall = toTexture(c);
  }
  // toldos de linho listrado
  tex.awnings = [['#efe6d2', '#a8392a'], ['#efe6d2', '#2c5d9c'], ['#d9a23e', '#3d7f59'], ['#efe6d2', '#d9a23e']].map(([a, b]) => {
    const S = 512; const c = photoCanvas(linen, S, 1); const ctx = c.getContext('2d');
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    for (let x = 0; x < S; x += 64) { ctx.fillStyle = (x / 64) % 2 ? b : a; ctx.fillRect(x, 0, 64, S); }
    ctx.restore();
    return toTexture(c);
  });
}

// Etiqueta de nome flutuante
export function labelTexture(name, title) {
  const c = makeCanvas(512, 128); const ctx = c.getContext('2d');
  ctx.font = '600 50px Cinzel, Georgia, serif'; ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffd87a'; ctx.fillText(name, 256, 58);
  if (title) { ctx.font = 'italic 32px Georgia, serif'; ctx.fillStyle = '#f3e6c8'; ctx.fillText(title, 256, 102); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function markerTexture(char = '!') {
  const c = makeCanvas(128); const ctx = c.getContext('2d');
  ctx.font = 'bold 100px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 12;
  ctx.fillStyle = '#ffcc33'; ctx.fillText(char, 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
