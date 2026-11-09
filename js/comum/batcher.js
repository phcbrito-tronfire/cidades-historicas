// Batcher: junta geometrias estáticas por material e por quadra do mapa (poucas draw calls, recorte por visão)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { fbm } from './util.js';
import { QS } from './qualidade.js';

// Variação de tom nas superfícies (paredes, pisos, telhados): uma textura de 3 m repetida numa parede de 40 m parece
// papel de parede. Aqui a cor de cada ponto é multiplicada por manchas largas e suaves tiradas da posição no mundo
// (até uns 20% para mais ou para menos, em três escalas: ~11 m, ~3 m e ~70 cm), como a pedra e o reboco de verdade, que nunca têm
// o mesmo tom de ponta a ponta. Vale para os materiais das construções (os do Batcher), nos gráficos alto e leve.
{
  const C = THREE.ShaderChunk;
  C.map_pars_fragment += `
#ifdef MACRO_VAR
	float mvHash( vec3 p ) { p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
	float mvNoise( vec3 x ) { vec3 i = floor( x ), f = fract( x ); f = f * f * ( 3.0 - 2.0 * f );
		return mix( mix( mix( mvHash( i ), mvHash( i + vec3( 1, 0, 0 ) ), f.x ), mix( mvHash( i + vec3( 0, 1, 0 ) ), mvHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
			mix( mix( mvHash( i + vec3( 0, 0, 1 ) ), mvHash( i + vec3( 1, 0, 1 ) ), f.x ), mix( mvHash( i + vec3( 0, 1, 1 ) ), mvHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z ); }
#endif`;
  C.map_fragment += `
#if defined( MACRO_VAR ) && defined( USE_FOG )
	{
		vec3 mvW = cameraPosition + vFogRay;
		float mv = mvNoise( mvW * 0.09 ) * 0.5 + mvNoise( mvW * 0.37 + 7.3 ) * 0.3 + mvNoise( mvW * 1.4 + 3.1 ) * 0.2;
		diffuseColor.rgb *= 0.76 + 0.48 * mv;
	}
#endif`;
}

const V3 = THREE.Vector3, Q = THREE.Quaternion, E = THREE.Euler;
export function mat4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, order = 'XYZ') {
  return new THREE.Matrix4().compose(new V3(x, y, z), new Q().setFromEuler(new E(rx, ry, rz, order)), new V3(sx, sy, sz));
}

// along: (caixas) nas paredes a textura corre AO LONGO da parede. Sem isso ela é projetada pelo eixo x ou z do mapa, e
// num prédio girado saía esticada (até 41% a 45 graus: tijolos e blocos mais largos do que nos prédios retos)
export function worldUV(g, { s = 4, sv, y0 = 0 }, along = false) {
  sv = sv || s;
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const nx = n.getX(i), nz = n.getZ(i);
    const ax = Math.abs(nx), ay = Math.abs(n.getY(i)), az = Math.abs(nz);
    let u, v;
    if (ay >= ax && ay >= az) { u = x / s; v = z / s; }
    else if (along && ax > 0.02 && az > 0.02) { // parede fora dos eixos: mede ao longo dela (com o mesmo sentido das paredes retas)
      const l = Math.hypot(nx, nz), k = (ax >= az ? Math.sign(nx) : -Math.sign(nz)) / l;
      u = (-nz * k * x + nx * k * z) / s; v = (y - y0) / sv;
    }
    else if (ax >= az) { u = z / s; v = (y - y0) / sv; }
    else { u = x / s; v = (y - y0) / sv; }
    uv[i * 2] = u; uv[i * 2 + 1] = v;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// ?scan=1 na URL: guarda a caixa de cada peça e a linha do código que a criou (varredura de peças flutuando)
const SCAN = typeof location !== 'undefined' && /[?&]scan=1/.test(location.search);
if (SCAN) globalThis.__pieces = [];
// Peças abertas (um plano, um vaso de torno sem tampa, um arco sem a face de baixo): o jogo só desenha a frente de cada
// face, então por dentro ou por trás se via através delas — as "paredes abertas". Toda peça com alguma borda solta
// ganha aqui o avesso (as mesmas faces viradas ao contrário). As formas que já são fechadas (caixas, esferas, cilindros
// com tampa) nem são examinadas; o resultado fica guardado por geometria (muitas são reaproveitadas milhares de vezes).
const CLOSED = new Set(['BoxGeometry', 'RoundedBoxGeometry', 'IcosahedronGeometry', 'OctahedronGeometry', 'DodecahedronGeometry', 'TetrahedronGeometry', 'CapsuleGeometry']);
const openCache = new WeakMap();
function isOpen(geo) {
  const t = geo.type, p = geo.parameters || {};
  if (CLOSED.has(t)) return false;
  if ((t === 'CylinderGeometry' || t === 'ConeGeometry') && !p.openEnded && (p.thetaLength === undefined || p.thetaLength >= Math.PI * 2 - 1e-4)) return false;
  if (t === 'SphereGeometry' && (p.phiLength === undefined || p.phiLength >= Math.PI * 2 - 1e-4) && (p.thetaLength === undefined || (p.thetaStart || 0) + p.thetaLength >= Math.PI - 1e-4) && !(p.thetaStart > 1e-4)) return false;
  if (t === 'TorusGeometry' && (p.arc === undefined || p.arc >= Math.PI * 2 - 1e-4)) return false;
  let r = openCache.get(geo); if (r !== undefined) return r;
  const pos = geo.attributes.position, idx = geo.index, n = idx ? idx.count : pos.count;
  const ids = new Map(), vid = new Int32Array(pos.count), edges = new Map();
  for (let i = 0; i < pos.count; i++) { const k = Math.round(pos.getX(i) * 2000) + ',' + Math.round(pos.getY(i) * 2000) + ',' + Math.round(pos.getZ(i) * 2000); let v = ids.get(k); if (v === undefined) { v = ids.size; ids.set(k, v); } vid[i] = v; }
  const V = ids.size;
  for (let i = 0; i + 2 < n; i += 3) {
    const a = vid[idx ? idx.getX(i) : i], b = vid[idx ? idx.getX(i + 1) : i + 1], c = vid[idx ? idx.getX(i + 2) : i + 2];
    if (a === b || b === c || a === c) continue; // triângulo sem área (o polo de um torno)
    for (const [u, w] of [[a, b], [b, c], [c, a]]) { const k = u < w ? u * V + w : w * V + u; edges.set(k, (edges.get(k) || 0) + 1); }
  }
  r = false; for (const c of edges.values()) if (c === 1) { r = true; break; }
  openCache.set(geo, r); return r;
}
// junta à geometria (já sem índice, com posição, normal e uv) as mesmas faces pelo avesso
function addBack(g) {
  const out = {}; const n = g.attributes.position.count;
  for (const k of Object.keys(g.attributes)) {
    const at = g.attributes[k], sz = at.itemSize, src = at.array, dst = new Float32Array(src.length * 2); dst.set(src);
    const sign = k === 'normal' ? -1 : 1;
    for (let i = 0; i + 2 < n; i += 3) for (let j = 0; j < 3; j++) { const from = (i + [0, 2, 1][j]) * sz, to = (n + i + j) * sz; for (let c = 0; c < sz; c++) dst[to + c] = src[from + c] * sign; }
    out[k] = new THREE.BufferAttribute(dst, sz);
  }
  for (const k of Object.keys(out)) g.setAttribute(k, out[k]);
}
function flipWinding(g) {
  const n = g.attributes.position.count;
  for (const k of Object.keys(g.attributes)) { const at = g.attributes[k], sz = at.itemSize, arr = at.array; for (let i = 0; i + 2 < n; i += 3) for (let c = 0; c < sz; c++) { const u = (i + 1) * sz + c, w = (i + 2) * sz + c, t = arr[u]; arr[u] = arr[w]; arr[w] = t; } }
}
export const BACKS = { pieces: 0, tris: 0 }; // (para conferir: quantas peças ganharam avesso)
const CELL = 100; // tamanho da quadra (m): menor = recorte mais fino, porém mais desenhos (sombra cobre 280 m)
const o_noBack = (B, mat) => B.noBack || mat.side !== THREE.FrontSide || mat.transparent || mat.userData.noBack;
export class Batcher {
  constructor() { this.groups = new Map(); }
  add(geo, mat, matrix, uv, along = false) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(matrix);
    if (matrix.determinant() < 0) flipWinding(g); // peça espelhada (escala negativa): sem isto ela sai virada do avesso
    if (this.jitter) { // paredes de adobe irregulares: desloca pela posição (sem abrir frestas)
      const p = g.attributes.position, j = this.jitter;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        p.setXYZ(i, x + (fbm(x * 0.45 + 3, y * 0.6 + z * 0.45, 2) - 0.5) * j, y + (fbm(x * 0.3, z * 0.3, 2) - 0.5) * j * 0.6, z + (fbm(z * 0.45 + 9, y * 0.6 + x * 0.45, 2) - 0.5) * j);
      }
      g.computeVertexNormals();
    }
    const opt = uv === false ? null : (uv || mat.userData.uv);
    if (opt) worldUV(g, opt, along);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!o_noBack(this, mat) && isOpen(geo)) { addBack(g); BACKS.pieces++; BACKS.tris += g.attributes.position.count / 6; }
    // agrupa por material E por quadra do mapa: cada quadra vira uma malha própria, que a câmera (e as sombras e o
    // reflexo do Nilo) pode descartar quando está fora de vista — antes, a cidade inteira era desenhada sempre
    g.computeBoundingBox();
    if (SCAN) { const fr = (new Error().stack || '').split('\n').filter((l) => /\.js/.test(l) && !/batcher\.js/.test(l)).slice(0, 4).map((l) => ((m) => (m ? m[1] + ':' + m[2] : '?'))(l.match(/(js\/[^?)]+\.js)(?:\?[^:)]*)?:(\d+)/))); globalThis.__pieces.push({ b: g.boundingBox.clone(), src: fr.join(' < '), m: mat.uuid, mn: mat.name || (mat.color ? '#' + mat.color.getHexString() : '?') }); }
    const c = g.boundingBox.getCenter(new THREE.Vector3());
    const key = Math.floor(c.x / CELL) + ',' + Math.floor(c.z / CELL);
    if (!this.groups.has(mat)) this.groups.set(mat, new Map());
    const cells = this.groups.get(mat);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(g);
  }
  // Peça pousada sobre outra (a parede sobre o rodapé de pedra, a almofada sobre o sofá): essa NÃO desce até o chão.
  // Antes descia, atravessando a peça de baixo com a mesma largura: as duas ficavam no mesmo plano e piscavam (o
  // reboco brigando com a pedra do rodapé, a almofada com a madeira). noteTop guarda o topo de cada caixa; restsOn
  // diz se a base de uma caixa nova coincide com o topo de alguma que cobre o centro dela.
  noteTop(cs, top) {
    const xs = cs.map((p) => p.x), zs = cs.map((p) => p.z);
    const r = { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs), top };
    this.tops ||= new Map();
    for (let i = Math.floor(r.x0 / 4); i <= Math.floor(r.x1 / 4); i++) for (let j = Math.floor(r.z0 / 4); j <= Math.floor(r.z1 / 4); j++) { const k = i * 100003 + j; let l = this.tops.get(k); if (!l) this.tops.set(k, (l = [])); l.push(r); }
  }
  restsOn(cs, bot) {
    if (!this.tops) return false;
    const x = cs[4].x, z = cs[4].z, l = this.tops.get(Math.floor(x / 4) * 100003 + Math.floor(z / 4)); if (!l) return false;
    for (const r of l) if (Math.abs(r.top - bot) < 0.03 && x > r.x0 - 0.05 && x < r.x1 + 0.05 && z > r.z0 - 0.05 && z < r.z1 + 0.05) return true;
    return false;
  }
  // y = base da peça
  box(mat, w, h, d, x, y, z, o = {}) {
    // order YXZ: primeiro gira (ry) e depois inclina no eixo da própria peça (telhados de casas giradas)
    let m = mat4(x, y + h / 2, z, o.rx || 0, o.ry || 0, o.rz || 0, 1, 1, 1, o.order || (this.yxz && o.ry && (o.rx || o.rz) ? 'YXZ' : 'XYZ'));
    let M = o.frame ? o.frame.clone().multiply(m) : m;
    // (ground) peça apoiada no chão: nos quatro cantos a base não pode ficar no ar (em declive, o lado de baixo
    // flutuava) — ela desce até o ponto mais baixo do terreno; e lajes de piso avisam (onFloor) para o terreno
    // não atravessá-las (a briga de texturas entre o calçamento e o chão)
    if (this.ground && !o.rx && !o.rz && !o.noGround) {
      const e = M.elements; if (Math.abs(e[1]) < 1e-3 && Math.abs(e[9]) < 1e-3) { // só giro em y
        const P = (lx, lz) => new V3(lx, -h / 2, lz).applyMatrix4(M), cs = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(-w / 2, d / 2), P(w / 2, d / 2), P(0, 0)];
        const h0 = h, bot = cs[4].y, ts = cs.map((p) => this.ground(p.x, p.z)), lo = Math.min(...ts), hi = Math.max(...ts);
        if (bot - hi < 0.6 && bot - lo > 0.05 && bot - lo < 4 && !this.restsOn(cs, bot)) { // encosta no chão em algum ponto e sobra vão em outro (e não está pousada sobre outra peça)
          const ext = bot - lo + 0.25; h += ext; y -= ext;
          m = mat4(x, y + h / 2, z, 0, o.ry || 0, 0); M = o.frame ? o.frame.clone().multiply(m) : m;
        }
        this.noteTop(cs, bot + h0);
        if (this.onFloor && h0 <= 0.6 && w * d >= 3 && Math.abs(bot - ts[4]) < 0.7) this.onFloor({ x: cs[4].x, z: cs[4].z, w, d, ry: Math.atan2(-e[2], e[0]), top: bot + h0 });
      }
    }
    this.add(new THREE.BoxGeometry(w, h, d), mat, M, o.uv, true);
  }
  // parede de adobe: levemente inclinada para dentro no topo e irregular
  adobe(mat, w, h, d, x, y, z, o = {}) {
    const g = new THREE.BoxGeometry(w, h, d, Math.max(2, Math.ceil(w / 2)), Math.max(2, Math.ceil(h / 1.8)), Math.max(2, Math.ceil(d / 2)));
    const p = g.attributes.position, k = o.batter ?? 0.035;
    for (let i = 0; i < p.count; i++) {
      const t = (p.getY(i) + h / 2) / h;
      const s = 1 - k * t;
      p.setX(i, p.getX(i) * s); p.setZ(i, p.getZ(i) * s);
      // cantos arredondados pelo desgaste
      const cx = Math.abs(p.getX(i)) / (w / 2), cz = Math.abs(p.getZ(i)) / (d / 2);
      if (cx > 0.98 && cz > 0.98) { p.setX(i, p.getX(i) * 0.985); p.setZ(i, p.getZ(i) * 0.985); }
    }
    g.computeVertexNormals();
    const m = mat4(x, y + h / 2, z, 0, o.ry || 0, 0);
    const prev = this.jitter; this.jitter = o.jitter ?? 0.16;
    this.add(g, mat, o.frame ? o.frame.clone().multiply(m) : m, o.uv);
    this.jitter = prev;
  }
  // caixa com quinas arredondadas
  rbox(mat, w, h, d, x, y, z, o = {}) {
    const r = Math.min(o.r ?? 0.12, w / 2.2, h / 2.2, d / 2.2);
    const m = mat4(x, y + h / 2, z, o.rx || 0, o.ry || 0, o.rz || 0);
    const g = new RoundedBoxGeometry(w, h, d, o.seg ?? 2, r);
    const prev = this.jitter; if (o.jitter) this.jitter = o.jitter;
    this.add(g, mat, o.frame ? o.frame.clone().multiply(m) : m, o.uv);
    this.jitter = prev;
  }
  geo(geo, mat, x, y, z, o = {}) {
    const m = mat4(x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, o.sx || o.s || 1, o.sy || o.s || 1, o.sz || o.s || 1);
    this.add(geo, mat, o.frame ? o.frame.clone().multiply(m) : m, o.uv);
  }
  build(scene) {
    for (const [mat, cells] of this.groups) for (const list of cells.values()) {
      const merged = mergeGeometries(list);
      merged.computeBoundingSphere();
      if (QS.level !== 'minimo' && mat.isMeshStandardMaterial && !mat.userData.noMacro && !(mat.defines && 'MACRO_VAR' in mat.defines)) { mat.defines = { ...(mat.defines || {}), MACRO_VAR: '' }; mat.needsUpdate = true; }
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = !mat.userData.noShadow;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false; // estático
      scene.add(mesh);
    }
    this.groups.clear();
  }
}

