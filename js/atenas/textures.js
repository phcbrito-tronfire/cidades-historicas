// Texturas de Atenas: fotos PBR (Poly Haven, CC0) e desenhos em canvas — meandro grego, bordas dos tecidos,
// cerâmica de figuras vermelhas, telhas pintadas, água, brilho e etiquetas.
import * as THREE from 'three';
import { fbm, vnoise, mulberry32, clamp } from '../comum/util.js';

let maxAniso = 8;
export function setAniso(n) { maxAniso = n; }

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
export function toTexture(canvas, { repeat = [1, 1], srgb = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = maxAniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}
function pixels(size, fn, h) {
  const c = makeCanvas(size, h || size), ctx = c.getContext('2d'), H = h || size;
  const img = ctx.createImageData(size, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < size; x++) {
    const [r, g, b, a = 255] = fn(x, y); const i = (y * size + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// meandro (a "grega"): faixa de gregas numa linha de altura h a partir de y
export function meander(ctx, x0, y, w, h, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, h / 7); ctx.lineCap = 'square';
  const s = h; // um módulo por altura
  for (let x = x0; x < x0 + w; x += s) {
    const a = x + s * 0.12, b = x + s * 0.88, t = y + h * 0.12, m = y + h * 0.5, bt = y + h * 0.88;
    ctx.beginPath(); ctx.moveTo(a, bt); ctx.lineTo(a, t); ctx.lineTo(b, t); ctx.lineTo(b, bt - h * 0.22);
    ctx.lineTo(x + s * 0.36, bt - h * 0.22); ctx.lineTo(x + s * 0.36, m - h * 0.06); ctx.lineTo(x + s * 0.64, m - h * 0.06); ctx.stroke();
  }
  ctx.restore();
}

const cache = {};
export function getTextures() {
  if (cache.ready) return cache;
  // Mapa de normais da água (repetível)
  {
    const S = 256, hgt = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      hgt[y * S + x] = fbm(u * 8, v * 8, 5, 8) + 0.25 * Math.sin((u * 6 + v * 4) * Math.PI * 2) + 0.15 * Math.sin((u * -3 + v * 9) * Math.PI * 2);
    }
    const c = pixels(S, (x, y) => {
      const l = hgt[y * S + ((x - 1 + S) % S)], r = hgt[y * S + ((x + 1) % S)], t = hgt[((y - 1 + S) % S) * S + x], b = hgt[((y + 1) % S) * S + x];
      let nx = (l - r) * 4, ny = (t - b) * 4, nz = 1; const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
      return [(nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, (nz * 0.5 + 0.5) * 255];
    });
    cache.waterNormals = toTexture(c, { srgb: false });
  }
  // brilho radial (chamas, lua, moedas)
  {
    const c = makeCanvas(128), ctx = c.getContext('2d'), g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,240,200,0.6)'); g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); cache.glow = toTexture(c);
  }
  // tecidos: fundo liso com barra de meandro (quíton, himátion, peplo) — uma por cor
  cache.cloth = (base, border, { band = true } = {}) => {
    const key = 'cl' + base + border + band; if (cache[key]) return cache[key];
    const S = 256, c = makeCanvas(S), ctx = c.getContext('2d');
    ctx.fillStyle = base; ctx.fillRect(0, 0, S, S);
    const n = pixels(S, (x, y) => { const v = 128 + (vnoise(x * 0.9, y * 0.12) - 0.5) * 50 + (vnoise(x * 3, y * 3) - 0.5) * 20; return [v, v, v]; });
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.35; ctx.drawImage(n, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (band && border) { // barra no alto do desenho = v=1 = bainha das saias de torno (o perfil vai da cintura à barra)
      ctx.fillStyle = border; ctx.fillRect(0, 0, S, 30);
      meander(ctx, 0, 4, S, 22, base);
      ctx.fillRect(0, 36, S, 4);
    }
    return (cache[key] = toTexture(c));
  };
  // pele de leopardo e couro (compatibilidade com o vestuário egípcio do módulo de personagens)
  cache.hide = toTexture(pixels(128, (x, y) => (fbm(x / 128 * 5, y / 128 * 5, 4, 5) > 0.55 ? [90, 52, 30] : [232, 222, 206])));
  cache.leopard = cache.hide; cache.nemes = cache.hide;
  // cerâmica de figuras vermelhas: fundo preto brilhante, faixa de figuras cor de barro e meandros
  {
    const W = 512, H = 256, c = makeCanvas(W, H), ctx = c.getContext('2d'), r = mulberry32(7);
    ctx.fillStyle = '#16100c'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c0683a';
    ctx.fillRect(0, 40, W, 3); ctx.fillRect(0, 196, W, 3);
    meander(ctx, 0, 204, W, 20, '#c0683a');
    for (let i = 0; i < 6; i++) { // figuras estilizadas: cabeça, tronco, manto e lança
      const x = 30 + i * 82, s = 0.9 + r() * 0.2;
      ctx.beginPath(); ctx.arc(x, 70, 10 * s, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 14 * s, 85); ctx.lineTo(x + 14 * s, 85); ctx.lineTo(x + 22 * s, 188); ctx.lineTo(x - 22 * s, 188); ctx.fill();
      if (i % 2) { ctx.fillRect(x + 20, 55, 3, 135); } else { ctx.beginPath(); ctx.arc(x - 24, 120, 18, 0, 7); ctx.fill(); }
    }
    ctx.strokeStyle = '#16100c'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const x = 30 + i * 82; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x - 10 + k * 5, 100); ctx.lineTo(x - 16 + k * 8, 185); ctx.stroke(); } }
    cache.redFigure = toTexture(c);
  }
  // reboco caiado com barrado de cor (casas e stoas por dentro)
  cache.stucco = (top, band) => {
    const key = 'st' + top + band; if (cache[key]) return cache[key];
    const S = 512, c = pixels(S, (x, y) => { const n = fbm(x / 64, y / 64, 4) * 30 + vnoise(x * 0.7, y * 0.7) * 10; const v = clamp(208 + n - 20, 0, 255); return [v, v * 0.97, v * 0.9]; });
    const ctx = c.getContext('2d');
    if (band) { ctx.fillStyle = band; ctx.globalAlpha = 0.9; ctx.fillRect(0, S - 150, S, 150); ctx.globalAlpha = 1; ctx.fillStyle = top || '#2c2a28'; ctx.fillRect(0, S - 156, S, 6); }
    return (cache[key] = toTexture(c));
  };
  // forro de caixotões: quadrados azuis com uma estrela dourada, molduras vermelhas e verdes
  {
    const S = 256, c = makeCanvas(S), x = c.getContext('2d');
    x.fillStyle = '#6a2a1e'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const px = i * 64, py = j * 64;
      x.fillStyle = '#2f5a3a'; x.fillRect(px + 4, py + 4, 56, 56);
      x.fillStyle = '#1c2f6a'; x.fillRect(px + 9, py + 9, 46, 46);
      x.fillStyle = '#d8a838'; x.beginPath(); for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, r = k % 2 ? 5 : 13; x.lineTo(px + 32 + Math.cos(a) * r, py + 32 + Math.sin(a) * r); } x.fill();
    }
    cache.coffers = toTexture(c);
  }
  // mármore liso com veios suaves (colunas: sem as juntas de bloco da foto)
  cache.plainMarble = toTexture(pixels(512, (x, y) => { const n = fbm(x / 90, y / 40, 4, 0) * 0.6 + fbm(x / 20, y / 12, 2) * 0.25; const vein = Math.pow(Math.max(0, 1 - Math.abs(Math.sin((x * 0.02 + y * 0.05 + n * 6)))), 18) * 0.25; const v = 236 + (n - 0.5) * 18 - vein * 60; return [v, v * 0.985, v * 0.955]; }));
  cache.ready = true;
  return cache;
}

// ---------------------------------------------------------------------------
// Texturas fotográficas PBR em assets/textures/<id>/{diff,nor,rough}.jpg
// ---------------------------------------------------------------------------
export const PBR_IDS = ['marble_01', 'rock_face_03', 'clay_roof_tiles_02', 'aerial_beach_01', 'damp_beach_sand', 'dry_ground_rocks',
  'sparse_grass', 'rocky_trail', 'rock_wall_08', 'seaworn_stone_tiles', 'white_plaster_rough_01', 'clay_plaster', 'rough_plaster_brick', 'weathered_planks', 'rough_linen', 'cal_branca', 'barro_ocre', 'pedra_clara', 'madeira_clara'];

export async function loadPBR(base, onProgress) {
  const loader = new THREE.TextureLoader();
  const out = {}; let done = 0; const total = PBR_IDS.length * 3;
  await Promise.all(PBR_IDS.flatMap((id) => {
    out[id] = {};
    return [['diff', 'map'], ['nor', 'normalMap'], ['rough', 'roughnessMap']].map(([f, key]) =>
      loader.loadAsync(`${base}/${id}/${f}.jpg`).then((t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso;
        if (key === 'map') t.colorSpace = THREE.SRGBColorSpace;
        out[id][key] = t; onProgress && onProgress(++done / total);
      }));
  }));
  return out;
}

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

// Etiqueta de nome flutuante e marcador "!"
export function labelTexture(name, title, sub) {
  const c = makeCanvas(512, 128), ctx = c.getContext('2d');
  ctx.font = '600 50px Cinzel, Georgia, serif'; ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffd87a'; ctx.fillText(name, 256, 58);
  if (title) { ctx.font = 'italic 32px Georgia, serif'; ctx.fillStyle = '#f3e6c8'; ctx.fillText(title, 256, 102); }
  void sub;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function markerTexture(char = '!') {
  const c = makeCanvas(128), ctx = c.getContext('2d');
  ctx.font = 'bold 100px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 12; ctx.fillStyle = '#ffcc33'; ctx.fillText(char, 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
