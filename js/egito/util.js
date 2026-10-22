// Utilidades matemáticas e ruído procedural (sem dependências)

// versão da publicação (tools/versao.mjs): vem no ?v= da URL deste módulo; ver(url) a acrescenta aos arquivos
// carregados à parte (modelos 3D), para o navegador não reaproveitar cópias antigas do cache
export const VERSION = new URL(import.meta.url).searchParams.get('v') || '';
export const ver = (url) => (VERSION ? url + (url.includes('?') ? '&' : '?') + 'v=' + VERSION : url);

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = mulberry32(1250);
export const rr = (a, b) => a + (b - a) * rand();
export const ri = (a, b) => Math.floor(rr(a, b + 1));
export const pick = (arr) => arr[Math.floor(rand() * arr.length)];
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
export function angleLerp(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function hash(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Ruído de valor 2D. period > 0 deixa o ruído repetível (texturas sem emenda)
export function vnoise(x, y, period = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  let x0 = xi, x1 = xi + 1, y0 = yi, y1 = yi + 1;
  if (period) {
    x0 = ((x0 % period) + period) % period; x1 = ((x1 % period) + period) % period;
    y0 = ((y0 % period) + period) % period; y1 = ((y1 % period) + period) % period;
  }
  const a = hash(x0, y0), b = hash(x1, y0), c = hash(x0, y1), d = hash(x1, y1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function fbm(x, y, oct = 4, period = 0) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x * f, y * f, period ? period * f : 0);
    n += a; a *= 0.5; f *= 2;
  }
  return s / n;
}

// próximo quadro (com reserva por tempo: abas em segundo plano pausam o requestAnimationFrame)
export const nextFrame = () => new Promise((r) => { let done = false; const f = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(f); setTimeout(f, 60); });
