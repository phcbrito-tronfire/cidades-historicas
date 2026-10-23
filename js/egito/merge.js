// Junta peças rígidas que andam juntas: irmãs (mesmo pai) com o mesmo material viram uma malha só.
// Um personagem ou animal montado com dezenas de pecinhas (tiras da sandália, partes do chapéu, colares...) passa a
// custar poucos desenhos por quadro — e isso se repete na sombra e no reflexo. O visual não muda: cada peça mantém
// a posição relativa ao pai (osso ou articulação), que continua se movendo como antes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEEP = ['position', 'normal', 'uv'];

function prep(mesh) {
  let g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  for (const k of Object.keys(g.attributes)) if (!KEEP.includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  // atributos compactados (modelos com meshopt) ou intercalados viram Float32 comuns, para poderem ser juntados
  for (const k of KEEP) {
    const a = g.attributes[k];
    if (!a.isInterleavedBufferAttribute && !a.normalized && a.array instanceof Float32Array) continue;
    const out = new Float32Array(a.count * a.itemSize), get = ['getX', 'getY', 'getZ', 'getW'];
    for (let i = 0; i < a.count; i++) for (let j = 0; j < a.itemSize; j++) out[i * a.itemSize + j] = a[get[j]](i);
    g.setAttribute(k, new THREE.BufferAttribute(out, a.itemSize));
  }
  g.morphAttributes = {};
  mesh.updateMatrix();
  g.applyMatrix4(mesh.matrix);
  return g;
}

// noMerge: objetos referenciados por código (que giram, somem ou trocam de material sozinhos) ficam de fora
export function mergeSiblings(root) {
  const parents = [];
  root.traverse((o) => { if (o.children.length > 1) parents.push(o); });
  let saved = 0;
  for (const parent of parents) {
    const groups = new Map();
    for (const c of parent.children) {
      if (!c.isMesh || c.isSkinnedMesh || c.isInstancedMesh || c.children.length || c.userData.noMerge || !c.visible || Array.isArray(c.material)) continue;
      const key = c.material.uuid + '|' + c.castShadow + c.receiveShadow + '|' + c.layers.mask + '|' + c.renderOrder + '|' + JSON.stringify(c.userData);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      let geo;
      try { geo = mergeGeometries(list.map(prep)); } catch { geo = null; }
      if (!geo) continue;
      geo.computeBoundingSphere();
      const a = list[0];
      const m = new THREE.Mesh(geo, a.material);
      m.castShadow = a.castShadow; m.receiveShadow = a.receiveShadow; m.layers.mask = a.layers.mask;
      m.renderOrder = a.renderOrder; m.userData = { ...a.userData };
      for (const c of list) parent.remove(c);
      parent.add(m);
      saved += list.length - 1;
    }
  }
  return saved;
}

// marca como noMerge tudo o que um objeto de retorno referencia (ex.: { body, head, legs: [{ hip, knee }] })
export function keepRefs(refs) {
  const mark = (v) => { if (v && v.isObject3D) v.userData.noMerge = true; };
  for (const v of Object.values(refs)) {
    if (Array.isArray(v)) v.forEach((e) => (e && e.isObject3D ? mark(e) : e && typeof e === 'object' && Object.values(e).forEach(mark)));
    else mark(v);
  }
}
