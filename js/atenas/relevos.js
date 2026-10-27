// Relevos e pinturas dos templos, desenhados em canvas: métopas (lápitas contra centauros), o friso da procissão
// das Panateneias (cavaleiros, carregadores de jarros, novilhas do sacrifício), molduras pintadas (óvalo-e-dardo e
// meandro), antefixas de palmeta do beiral e o piso de lajes. Cada relevo tem um mapa de altura convertido em mapa
// de normais, para as figuras pegarem luz e sombra de verdade. Cores da policromia: fundo azul, figuras cor de
// mármore, detalhes em vermelho e ouro.
import * as THREE from 'three';
import { mulberry32 } from '../comum/util.js';

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };

// mapa de altura (canvas em tons de cinza) → mapa de normais
function normalFrom(hc, strength = 3) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = canvas(w, h), ctx = out.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const H = (x, y) => src[(Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let nx = (H(x - 1, y) - H(x + 1, y)) * strength, ny = (H(x, y + 1) - H(x, y - 1)) * strength, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * w + x) * 4; d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

// ---- figuras (desenhadas como silhuetas cheias; o mesmo desenho serve para a cor e para a altura)
function human(g, x, base, hgt, R, { lean = 0, armUp = 0, step = 0.4, cloak = true, jar = false, shield = false } = {}) {
  const u = hgt / 8; // módulo: a cabeça
  g.save(); g.translate(x, base); g.rotate(lean);
  g.beginPath(); g.ellipse(0, -7.3 * u, 0.55 * u, 0.65 * u, 0, 0, 7); g.fill(); // cabeça
  g.beginPath(); g.moveTo(-1.1 * u, -6.4 * u); g.lineTo(1.1 * u, -6.4 * u); g.lineTo(0.8 * u, -3.6 * u); g.lineTo(-0.8 * u, -3.6 * u); g.fill(); // tronco
  if (cloak) { g.beginPath(); g.moveTo(-1.2 * u, -6.2 * u); g.quadraticCurveTo(-1.9 * u, -3 * u, -1.4 * u, -1.6 * u); g.lineTo(1.2 * u, -1.8 * u); g.quadraticCurveTo(1.4 * u, -4 * u, 1.1 * u, -6.2 * u); g.fill(); }
  g.lineCap = 'round';
  const limb = (x0, y0, x1, y1, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  limb(-0.4 * u, -3.7 * u, -(0.6 + step) * u, -0.1 * u, 0.6 * u); limb(0.4 * u, -3.7 * u, (0.6 + step) * u, -0.1 * u, 0.6 * u); // pernas
  limb(-1 * u, -6 * u, -1.8 * u, (-4.2 - armUp * 2.4) * u, 0.45 * u); limb(1 * u, -6 * u, (1.6 + armUp * 0.4) * u, (-4 - armUp * 3) * u, 0.45 * u); // braços
  if (jar) { g.beginPath(); g.ellipse(1.6 * u, -8.2 * u, 0.7 * u, 0.9 * u, 0, 0, 7); g.fill(); } // hídria no ombro
  if (shield) { g.beginPath(); g.arc(-1.6 * u, -4.8 * u, 1.3 * u, 0, 7); g.fill(); }
  g.restore();
  void R;
}
function horse(g, x, base, hgt, dir, R, rider = true) {
  const u = hgt / 6;
  g.save(); g.translate(x, base); g.scale(dir, 1);
  const rear = R() * 0.4;
  g.beginPath(); g.ellipse(0, -3.3 * u, 2.4 * u, 1.05 * u, -rear * 0.4, 0, 7); g.fill(); // corpo
  g.beginPath(); g.moveTo(1.8 * u, -3.8 * u); g.lineTo(3.2 * u, (-5.6 - rear) * u); g.lineTo(3.9 * u, (-5.4 - rear) * u); g.lineTo(2.6 * u, -3.2 * u); g.fill(); // pescoço
  g.beginPath(); g.ellipse(3.9 * u, (-5.5 - rear) * u, 0.9 * u, 0.42 * u, 0.5, 0, 7); g.fill(); // cabeça
  g.lineCap = 'round'; g.lineWidth = 0.42 * u;
  const leg = (x0, kx, ky, x1) => { g.beginPath(); g.moveTo(x0, -2.8 * u); g.lineTo(kx, ky); g.lineTo(x1, 0); g.stroke(); };
  leg(1.6 * u, (2.4 + rear * 2) * u, (-1.6 - rear * 2) * u, (2.9 + rear * 1.5) * u); leg(1.3 * u, 1.6 * u, -1.4 * u, 1.2 * u);
  leg(-1.7 * u, -2.3 * u, -1.5 * u, -1.9 * u); leg(-1.4 * u, -1.0 * u, -1.5 * u, -1.5 * u);
  g.lineWidth = 0.5 * u; g.beginPath(); g.moveTo(-2.3 * u, -3.6 * u); g.quadraticCurveTo(-3.4 * u, -3.2 * u, -3.2 * u, -1.8 * u); g.stroke(); // cauda
  if (rider) human(g, 0.2 * u, -3.9 * u, 4.6 * u, R, { step: 0.9, armUp: 0.3, cloak: true });
  g.restore();
}
function centaur(g, x, base, hgt, dir, R) {
  const u = hgt / 6;
  g.save(); g.translate(x, base); g.scale(dir, 1);
  horse(g, 0, 0, hgt, 1, R, false);
  human(g, 2.6 * u, -3.6 * u, 4.8 * u, R, { lean: -0.25, armUp: 1, step: 0, cloak: false });
  g.restore();
}
function cow(g, x, base, hgt, dir) {
  const u = hgt / 5;
  g.save(); g.translate(x, base); g.scale(dir, 1);
  g.beginPath(); g.ellipse(0, -2.6 * u, 2.4 * u, 1.1 * u, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(2.6 * u, -2.6 * u, 0.8 * u, 0.6 * u, 0.3, 0, 7); g.fill();
  g.lineWidth = 0.45 * u; g.lineCap = 'round';
  for (const lx of [-1.6, -1.1, 1.2, 1.7]) { g.beginPath(); g.moveTo(lx * u, -2 * u); g.lineTo(lx * u, 0); g.stroke(); }
  g.restore();
}

// desenha a mesma cena duas vezes: cor (figuras cor de mármore sobre fundo azul) e altura (branco = relevo alto)
function relief(w, h, bg, fig, draw, seed) {
  const col = canvas(w, h), hc = canvas(w, h), cg = col.getContext('2d'), hg = hc.getContext('2d');
  cg.fillStyle = bg; cg.fillRect(0, 0, w, h);
  hg.fillStyle = '#000'; hg.fillRect(0, 0, w, h);
  // relevo: as figuras em camadas desfocadas (bordas arredondadas, meio mais alto)
  for (const [blur, val] of [[5, 90], [2.5, 170], [0.8, 235]]) {
    hg.save(); hg.filter = `blur(${blur}px)`; hg.fillStyle = hg.strokeStyle = `rgb(${val},${val},${val})`; draw(hg, mulberry32(seed)); hg.restore();
  }
  cg.fillStyle = cg.strokeStyle = fig; draw(cg, mulberry32(seed));
  // sombra de contato e leve sujeira do mármore
  const n = normalFrom(hc, 4);
  return { map: tex(col), normalMap: tex(n, false) };
}

let CACHE = null;
export function templeTextures() {
  if (CACHE) return CACHE;
  const out = {};
  // métopas: lápitas contra centauros (três cenas)
  out.metopes = [1, 2, 3].map((k) => relief(256, 256, '#2a4f9a', '#efe4cf', (g, R) => {
    g.lineJoin = 'round';
    const flip = k % 2 ? 1 : -1;
    centaur(g, 128 - flip * 40, 238, 150, flip, R);
    human(g, 128 + flip * 52, 238, 150, R, { lean: flip * 0.25, armUp: k === 2 ? 1 : 0.6, step: 0.8, shield: k !== 3 });
  }, 90 + k * 17));
  // friso das Panateneias: cavaleiros, carregadores de hídrias e novilhas, em fila para o oeste
  out.frieze = [1, 2].map((k) => relief(1024, 128, '#2c4f96', '#f1e7d2', (g, R) => {
    let x = 40;
    while (x < 1000) {
      const t = R();
      if (k === 1 || t < 0.45) { horse(g, x, 122, 92, 1, R, true); x += 120 + R() * 30; }
      else if (t < 0.75) { human(g, x, 122, 100, R, { jar: true, step: 0.5 }); x += 46; }
      else { cow(g, x + 20, 122, 70, 1); human(g, x + 70, 122, 100, R, { armUp: 0.5 }); x += 120; }
    }
  }, 300 + k * 31));
  // moldura pintada: óvalo-e-dardo sobre meandro (azul, vermelho, ouro)
  {
    const c = canvas(512, 64), g = c.getContext('2d');
    g.fillStyle = '#1f3a7a'; g.fillRect(0, 0, 512, 64);
    for (let x = 0; x < 512; x += 32) {
      g.fillStyle = '#b3352a'; g.beginPath(); g.ellipse(x + 16, 16, 11, 13, 0, 0, 7); g.fill();
      g.fillStyle = '#f2e6cf'; g.beginPath(); g.ellipse(x + 16, 16, 7, 9, 0, 0, 7); g.fill();
      g.fillStyle = '#e8b84a'; g.beginPath(); g.moveTo(x, 4); g.lineTo(x + 3, 26); g.lineTo(x - 3, 26); g.fill();
    }
    g.fillStyle = '#e8b84a'; g.fillRect(0, 32, 512, 3);
    g.strokeStyle = '#e8b84a'; g.lineWidth = 3;
    for (let x = 0; x < 512; x += 28) { g.beginPath(); g.moveTo(x + 3, 60); g.lineTo(x + 3, 40); g.lineTo(x + 24, 40); g.lineTo(x + 24, 55); g.lineTo(x + 10, 55); g.lineTo(x + 10, 47); g.lineTo(x + 17, 47); g.stroke(); }
    out.molding = tex(c);
  }
  // antefixa: palmeta pintada (com recorte transparente)
  {
    const c = canvas(128, 160), g = c.getContext('2d');
    g.translate(64, 150);
    for (let i = -4; i <= 4; i++) { g.save(); g.rotate(i * 0.3); g.fillStyle = i % 2 ? '#b3352a' : '#f2e6cf'; g.beginPath(); g.ellipse(0, -80, 11, 58, 0, 0, 7); g.fill(); g.restore(); }
    g.fillStyle = '#1f3a7a'; g.beginPath(); g.arc(0, -20, 20, 0, 7); g.fill();
    g.fillStyle = '#e8b84a'; g.beginPath(); g.arc(0, -20, 9, 0, 7); g.fill();
    out.antefix = tex(c);
  }
  // piso de lajes de mármore (juntas e veios), com relevo leve nas juntas
  {
    const col = canvas(512, 512), hc = canvas(512, 512), g = col.getContext('2d'), h = hc.getContext('2d'), R = mulberry32(7);
    h.fillStyle = '#fff'; h.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const v = 228 + Math.floor(R() * 20);
      g.fillStyle = `rgb(${v},${v - 4},${v - 12})`; g.fillRect(x * 128, y * 128, 128, 128);
      g.strokeStyle = `rgba(150,140,120,${0.15 + R() * 0.2})`; g.lineWidth = 1;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x * 128 + R() * 128, y * 128); g.bezierCurveTo(x * 128 + R() * 128, y * 128 + 40, x * 128 + R() * 128, y * 128 + 90, x * 128 + R() * 128, y * 128 + 128); g.stroke(); }
    }
    g.strokeStyle = '#8a8070'; g.lineWidth = 2; h.strokeStyle = '#000'; h.lineWidth = 4;
    for (let i = 0; i <= 512; i += 128) { for (const c2 of [g, h]) { c2.beginPath(); c2.moveTo(i, 0); c2.lineTo(i, 512); c2.moveTo(0, i); c2.lineTo(512, i); c2.stroke(); } }
    out.slabs = { map: tex(col), normalMap: tex(normalFrom(hc, 2), false) };
  }
  CACHE = out;
  return out;
}
