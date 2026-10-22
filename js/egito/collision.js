// Colisão simples: caixas alinhadas aos eixos, círculos e pirâmides.
// O topo das caixas também serve de chão (degraus, cais, plataformas).

export const STEP = 0.45;
export const boxes = [];
export const circles = [];
const pyramids = [];
let terrainFn = () => 0;
let waterFn = () => -100;

export function setTerrain(fn) { terrainFn = fn; }
export function setWater(fn) { waterFn = fn; }
export function terrainAt(x, z) { return terrainFn(x, z); }
export function waterAt(x, z) { return waterFn(x, z); }

// cx, cz = centro; w = largura em x; d = profundidade em z; bottom/top em altura absoluta
export function addBox(cx, cz, w, d, bottom, top, opts = {}) {
  const b = { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, bottom, top, enabled: true, ...opts };
  boxes.push(b);
  return b;
}
export function addCircle(x, z, r, bottom, top) {
  const c = { x, z, r, bottom, top, enabled: true };
  circles.push(c);
  return c;
}
export function addPyramid(x, z, half, h, baseY) { pyramids.push({ x, z, half, h, baseY }); }

export function groundAt(x, z, feetY) {
  let g = terrainFn(x, z);
  const lim = feetY + STEP;
  for (const b of boxes) {
    if (!b.enabled || b.noFloor) continue;
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && b.top <= lim && b.top > g) g = b.top;
  }
  for (const c of circles) {
    if (!c.enabled) continue;
    const dx = x - c.x, dz = z - c.z;
    if (dx * dx + dz * dz <= c.r * c.r && c.top <= lim && c.top > g) g = c.top;
  }
  return g;
}

export function blocked(x, z, feetY, r = 0.35, height = 1.75) {
  const lim = feetY + STEP;
  const head = feetY + height;
  for (const b of boxes) {
    if (!b.enabled || b.top <= lim || b.bottom >= head) continue;
    if (x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) return true;
  }
  for (const c of circles) {
    if (!c.enabled || c.top <= lim || c.bottom >= head) continue;
    const dx = x - c.x, dz = z - c.z, rr = c.r + r;
    if (dx * dx + dz * dz < rr * rr) return true;
  }
  for (const p of pyramids) {
    const m = Math.max(Math.abs(x - p.x), Math.abs(z - p.z)) - r;
    if (m < p.half) {
      const ph = p.baseY + p.h * (1 - Math.max(0, m) / p.half);
      if (ph > feetY + 0.6) return true;
    }
  }
  return false;
}

// Ponto dentro de algo sólido (usado para a câmera não atravessar paredes)
export function solidAt(x, y, z) {
  if (y < terrainFn(x, z) + 0.2) return true;
  for (const b of boxes) {
    if (!b.enabled || b.camPass) continue;
    if (y > b.bottom && y < b.top && x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true;
  }
  for (const p of pyramids) {
    const m = Math.max(Math.abs(x - p.x), Math.abs(z - p.z));
    if (m < p.half && y < p.baseY + p.h * (1 - m / p.half)) return true;
  }
  return false;
}

// Move com deslizamento nas paredes
export function moveWithCollision(pos, dx, dz, r, height) {
  const nx = pos.x + dx, nz = pos.z + dz;
  if (!blocked(nx, nz, pos.y, r, height)) { pos.x = nx; pos.z = nz; return true; }
  if (!blocked(nx, pos.z, pos.y, r, height)) { pos.x = nx; return false; }
  if (!blocked(pos.x, nz, pos.y, r, height)) { pos.z = nz; return false; }
  return false;
}
