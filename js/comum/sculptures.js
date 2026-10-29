// Esculturas modeladas por artistas/escaneadas (Sketchfab, CC BY), no lugar das esfinges montadas com primitivas.
// buildings.js só marca onde cada uma fica (city.sculptures); aqui o modelo é carregado uma vez, endireitado,
// virado para +x (o "rosto" do quadro local), escalado pelo comprimento pedido e copiado em cada lugar.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { ver } from './util.js';

// rot: corrige a orientação de origem; yaw: gira para o rosto apontar para +x; layer: 0 = com reflexo e AO,
// 3 = fora do reflexo da água (muitas cópias pesariam no reflexo). Cada cidade registra os seus modelos.
const MODELS = {};
export function registerSculptures(dir, table) {
  for (const [name, def] of Object.entries(table)) MODELS[name] = { dir, rot: [0, 0, 0], yaw: 0, layer: 0, rough: 0.8, ...def };
}
export const sculptureDef = (name) => MODELS[name];

async function loadModel(L, name) {
  const def = MODELS[name];
  const g = await L.loadAsync(ver(def.dir + (def.file || name) + '.glb'));
  const inner = g.scene;
  inner.rotation.set(...def.rot);
  // peças que não entram (a vela e o cordame de um navio que virou naufrágio, o chão que veio no escaneamento)
  if (def.hide) { const out = []; inner.traverse((n) => { if (n.isMesh && def.hide.includes(n.name)) out.push(n); }); for (const n of out) n.removeFromParent(); }
  const turn = new THREE.Group(); turn.rotation.y = def.yaw; turn.add(inner);
  const norm = new THREE.Group(); norm.add(turn);
  norm.updateMatrixWorld(true);
  // pelos vértices (precise): a caixa aproximada de cada peça cresce quando o modelo é girado e a estátua
  // ficava flutuando acima do pedestal (a Partenos 1,2 m, a Promachos 0,5 m)
  const box = new THREE.Box3().setFromObject(norm, true);
  const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  // origem no chão, no centro da base; comprimento (eixo x) ou altura (fit 'y') = 1
  turn.position.set(-c.x, -box.min.y, -c.z);
  const k = 1 / (def.fit === 'y' ? size.y : def.fit === 'z' ? size.z : size.x);
  const unit = new THREE.Group(); unit.scale.setScalar(k); unit.add(norm);
  unit.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    o.layers.set(def.layer);
    const m = o.material; if (!def.keepMetal) { m.roughness = def.rough; m.metalness = def.metal ?? 0; } m.envMapIntensity = def.env ?? 0.6;
    if (def.tint) m.color.setRGB(...def.tint);
  });
  return unit;
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = {};
// um modelo que falhe ao carregar não derruba o jogo: aquela escultura só não aparece
const unitModel = (n) => (cache[n] ??= loadModel(loader, n).catch((e) => { console.warn('escultura', n, e); return null; }));

// uma cópia do modelo com o tamanho pedido (comprimento, ou altura se fit 'y'), olhando para +x
export async function sculptureInstance(name, size) {
  const u = await unitModel(name);
  if (!u) return new THREE.Group();
  const o = u.clone();
  o.scale.setScalar(size * u.scale.x);
  return o;
}

export async function placeSculptures(scene, list) {
  const names = [...new Set(list.map((s) => s.model))];
  const base = {};
  await Promise.all(names.map(async (n) => { base[n] = await unitModel(n); }));
  const placed = [];
  for (const s of list) {
    if (!base[s.model]) continue;
    const o = base[s.model].clone();
    o.scale.setScalar(s.length * base[s.model].scale.x);
    const holder = new THREE.Group();
    holder.position.set(s.x, s.y, s.z); holder.rotation.y = s.ry || 0;
    holder.add(o);
    holder.traverse((n) => { if (n.isMesh) n.layers.set(MODELS[s.model].layer); });
    scene.add(holder);
    placed.push({ s, holder });
  }
  return placed;
}

// o modelo normalizado (tamanho 1), ou null se não existir / não carregar
export const sculptureUnit = (name) => (MODELS[name] ? unitModel(name) : Promise.resolve(null));

// muitas cópias de um modelo numa só chamada de desenho por material (árvores): list = [{ x, y, z, ry, s }]
export function instancedFromUnit(unit, list, { shadow = true, layer = 3 } = {}) {
  const out = new THREE.Group();
  unit.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(unit.matrixWorld).invert();
  const dummy = new THREE.Object3D(), m = new THREE.Matrix4();
  unit.traverse((o) => {
    if (!o.isMesh) return;
    const local = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld).premultiply(new THREE.Matrix4().makeScale(unit.scale.x, unit.scale.y, unit.scale.z));
    const im = new THREE.InstancedMesh(o.geometry, o.material, list.length);
    list.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, p.ry || 0, 0); dummy.scale.setScalar(p.s || 1); dummy.updateMatrix();
      im.setMatrixAt(i, m.multiplyMatrices(dummy.matrix, local));
    });
    im.castShadow = shadow; im.receiveShadow = true; im.layers.set(layer);
    im.computeBoundingSphere();
    out.add(im);
  });
  return out;
}
