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

// grade espacial (células de 8 m): cada consulta olha só as caixas e círculos da célula, e não os milhares da cidade
const CELL = 8, grid = new Map(), NONE = { b: [], c: [] };
let gridN = -1;
const key = (i, j) => i * 100003 + j;
function rebuild() {
  grid.clear(); gridN = boxes.length + circles.length;
  const put = (o, list, x0, x1, z0, z1) => {
    const i0 = Math.floor(x0 / CELL), i1 = Math.floor(x1 / CELL), j0 = Math.floor(z0 / CELL), j1 = Math.floor(z1 / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = key(i, j); let c = grid.get(k); if (!c) grid.set(k, (c = { b: [], c: [] })); c[list].push(o); }
  };
  const M = 1.3; // folga para o raio de quem se move (até 1,2 m)
  for (const b of boxes) put(b, 'b', b.minX - M, b.maxX + M, b.minZ - M, b.maxZ + M);
  for (const c of circles) put(c, 'c', c.x - c.r - M, c.x + c.r + M, c.z - c.r - M, c.z + c.r + M);
}
function cellAt(x, z) {
  if (gridN !== boxes.length + circles.length) rebuild();
  return grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || NONE;
}

export function groundAt(x, z, feetY) {
  let g = terrainFn(x, z);
  const lim = feetY + STEP, C = cellAt(x, z);
  for (const b of C.b) {
    if (!b.enabled || b.noFloor) continue;
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && b.top <= lim && b.top > g) g = b.top;
  }
  for (const c of C.c) {
    if (!c.enabled) continue;
    const dx = x - c.x, dz = z - c.z;
    if (dx * dx + dz * dz <= c.r * c.r && c.top <= lim && c.top > g) g = c.top;
  }
  return g;
}

export function blocked(x, z, feetY, r = 0.35, height = 1.75) {
  const lim = feetY + STEP;
  const head = feetY + height, C = cellAt(x, z);
  for (const b of C.b) {
    if (!b.enabled || b.top <= lim || b.bottom >= head) continue;
    if (x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) return true;
  }
  for (const c of C.c) {
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
  const C = cellAt(x, z);
  for (const b of C.b) {
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

// chão seco (ou cais/plataforma acima da água): quem anda a pé não entra no rio nem no mar
export function dryAt(x, z, feetY) {
  const w = waterFn(x, z);
  if (w < -50) return true;
  const g = groundAt(x, z, feetY ?? Math.max(terrainFn(x, z), w) + 1.6);
  return g > w - 0.3;
}
