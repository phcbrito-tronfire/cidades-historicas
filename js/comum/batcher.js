// Batcher: junta geometrias estáticas por material e por quadra do mapa (poucas draw calls, recorte por visão)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { fbm } from './util.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion, E = THREE.Euler;
export function mat4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, order = 'XYZ') {
  return new THREE.Matrix4().compose(new V3(x, y, z), new Q().setFromEuler(new E(rx, ry, rz, order)), new V3(sx, sy, sz));
}

export function worldUV(g, { s = 4, sv, y0 = 0 }) {
  sv = sv || s;
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = x / s; v = z / s; }
    else if (ax >= az) { u = z / s; v = (y - y0) / sv; }
    else { u = x / s; v = (y - y0) / sv; }
    uv[i * 2] = u; uv[i * 2 + 1] = v;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

const CELL = 100; // tamanho da quadra (m): menor = recorte mais fino, porém mais desenhos (sombra cobre 280 m)
export class Batcher {
  constructor() { this.groups = new Map(); }
  add(geo, mat, matrix, uv) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(matrix);
    if (this.jitter) { // paredes de adobe irregulares: desloca pela posição (sem abrir frestas)
      const p = g.attributes.position, j = this.jitter;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        p.setXYZ(i, x + (fbm(x * 0.45 + 3, y * 0.6 + z * 0.45, 2) - 0.5) * j, y + (fbm(x * 0.3, z * 0.3, 2) - 0.5) * j * 0.6, z + (fbm(z * 0.45 + 9, y * 0.6 + x * 0.45, 2) - 0.5) * j);
      }
      g.computeVertexNormals();
    }
    const opt = uv === false ? null : (uv || mat.userData.uv);
    if (opt) worldUV(g, opt);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    // agrupa por material E por quadra do mapa: cada quadra vira uma malha própria, que a câmera (e as sombras e o
    // reflexo do Nilo) pode descartar quando está fora de vista — antes, a cidade inteira era desenhada sempre
    g.computeBoundingBox();
    const c = g.boundingBox.getCenter(new THREE.Vector3());
    const key = Math.floor(c.x / CELL) + ',' + Math.floor(c.z / CELL);
    if (!this.groups.has(mat)) this.groups.set(mat, new Map());
    const cells = this.groups.get(mat);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(g);
  }
  // y = base da peça
  box(mat, w, h, d, x, y, z, o = {}) {
    // order YXZ: primeiro gira (ry) e depois inclina no eixo da própria peça (telhados de casas giradas)
    const m = mat4(x, y + h / 2, z, o.rx || 0, o.ry || 0, o.rz || 0, 1, 1, 1, o.order || (this.yxz && o.ry && (o.rx || o.rz) ? 'YXZ' : 'XYZ'));
    this.add(new THREE.BoxGeometry(w, h, d), mat, o.frame ? o.frame.clone().multiply(m) : m, o.uv);
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
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = !mat.userData.noShadow;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false; // estático
      scene.add(mesh);
    }
    this.groups.clear();
  }
}

