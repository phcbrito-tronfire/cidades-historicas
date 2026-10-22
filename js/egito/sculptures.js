// Esculturas modeladas por artistas/escaneadas (Sketchfab, CC BY), no lugar das esfinges montadas com primitivas.
// buildings.js só marca onde cada uma fica (city.sculptures); aqui o modelo é carregado uma vez, endireitado,
// virado para +x (o "rosto" do quadro local), escalado pelo comprimento pedido e copiado em cada lugar.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const DIR = 'assets/models/estatuas/';
// rot: corrige a orientação de origem; yaw: gira para o rosto apontar para +x; layer: 0 = com reflexo e AO,
// 3 = fora do reflexo do Nilo (as muitas esfinges da avenida pesariam no reflexo)
const MODELS = {
  esfinge_giza: { rot: [0, 0, 0], yaw: Math.PI / 2, layer: 0, rough: 0.88 },
  esfinge_avenida: { rot: [Math.PI, 0, Math.PI], yaw: Math.PI / 2, layer: 3, rough: 0.8 },
  // fit 'y': o tamanho pedido é a altura (estátuas em pé)
  anubis: { rot: [0, 0, 0], yaw: Math.PI / 2, layer: 0, rough: 0.45, fit: 'y', tint: [2.4, 2.25, 2.1], env: 1.2 }, // textura muito escura: clareia (granito preto, mas com o entalhe visível)
  barco: { rot: [0, 0, 0], yaw: Math.PI / 2, layer: 0, rough: 0.85 }, // barquinho de papiro com toldo
  anubis_deitado: { rot: [Math.PI / 2, 0, 0], yaw: Math.PI, layer: 0, rough: 0.6, tint: [1.5, 1.45, 1.4] },
};

async function loadModel(L, name) {
  const def = MODELS[name];
  const g = await L.loadAsync(DIR + name + '.glb');
  const inner = g.scene;
  inner.rotation.set(...def.rot);
  const turn = new THREE.Group(); turn.rotation.y = def.yaw; turn.add(inner);
  const norm = new THREE.Group(); norm.add(turn);
  norm.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(norm);
  const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  // origem no chão, no centro da base; comprimento (eixo x) ou altura (fit 'y') = 1
  turn.position.set(-c.x, -box.min.y, -c.z);
  const k = 1 / (def.fit === 'y' ? size.y : size.x);
  const unit = new THREE.Group(); unit.scale.setScalar(k); unit.add(norm);
  unit.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    o.layers.set(def.layer);
    const m = o.material; m.roughness = def.rough; m.metalness = 0; m.envMapIntensity = def.env ?? 0.6;
    if (def.tint) m.color.setRGB(...def.tint);
  });
  return unit;
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = {};
const unitModel = (n) => (cache[n] ??= loadModel(loader, n));

// uma cópia do modelo com o tamanho pedido (comprimento, ou altura se fit 'y'), olhando para +x
export async function sculptureInstance(name, size) {
  const u = await unitModel(name);
  const o = u.clone();
  o.scale.setScalar(size * u.scale.x);
  return o;
}

export async function placeSculptures(scene, list) {
  const names = [...new Set(list.map((s) => s.model))];
  const base = {};
  await Promise.all(names.map(async (n) => { base[n] = await unitModel(n); }));
  for (const s of list) {
    const o = base[s.model].clone();
    o.scale.setScalar(s.length * base[s.model].scale.x);
    const holder = new THREE.Group();
    holder.position.set(s.x, s.y, s.z); holder.rotation.y = s.ry || 0;
    holder.add(o);
    holder.traverse((n) => { if (n.isMesh) n.layers.set(MODELS[s.model].layer); });
    scene.add(holder);
  }
}
