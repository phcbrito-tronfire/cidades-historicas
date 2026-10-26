// Colisão tirada da forma de um modelo 3D (templo baixado): varre a planta em células, acha o piso de cada uma
// com um raio de cima para baixo e as colunas/paredes com raios horizontais na altura do peito. Junta as células
// vizinhas iguais em caixas maiores (poucas caixas = colisão rápida). Usa three-mesh-bvh para os raios serem rápidos.
import * as THREE from 'three';
import { addBox } from './collision.js';

let bvh = null;
async function loadBVH() {
  if (bvh) return bvh;
  bvh = await import('https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.7.3/build/index.module.js');
  return bvh;
}

// root: o objeto já posicionado na cena; y0: altura da base; cell: tamanho da célula (m)
// devolve { floorAt(x, z) } para quem quiser saber a altura do piso (ex.: escada de entrada)
export async function collideModel(root, { y0, cell = 0.5, scanH = 3.2, chest = 1.0 } = {}) {
  const B = await loadBVH();
  root.updateMatrixWorld(true);
  const meshes = [], saved = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.geometry.boundsTree) o.geometry.boundsTree = new B.MeshBVH(o.geometry);
    o.raycast = B.acceleratedRaycast;
    saved.push([o.material, o.material.side]); o.material.side = THREE.DoubleSide;
    meshes.push(o);
  });
  const ray = new THREE.Raycaster(); ray.firstHitOnly = true;
  const box = new THREE.Box3().setFromObject(root);
  const nx = Math.ceil((box.max.x - box.min.x) / cell), nz = Math.ceil((box.max.z - box.min.z) / cell);
  const floor = new Float32Array(nx * nz).fill(NaN), solid = new Uint8Array(nx * nz);
  const down = new THREE.Vector3(0, -1, 0), o = new THREE.Vector3(), dirs = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = box.min.x + (i + 0.5) * cell, z = box.min.z + (j + 0.5) * cell;
    o.set(x, y0 + scanH, z); ray.set(o, down); ray.far = scanH + 1;
    const hit = ray.intersectObjects(meshes, false)[0];
    if (!hit) continue;
    const h = hit.point.y;
    floor[j * nx + i] = h;
    o.set(x, h + chest, z); ray.far = cell * 0.6;
    for (const d of dirs) { ray.set(o, d); if (ray.intersectObjects(meshes, false).length) { solid[j * nx + i] = 1; break; } }
  }
  for (const [m, s] of saved) m.side = s;
  // junta em faixas ao longo de x
  let n = 0;
  for (let j = 0; j < nz; j++) {
    let i = 0;
    while (i < nx) {
      const k = j * nx + i, h = floor[k];
      if (Number.isNaN(h)) { i++; continue; }
      const s = solid[k];
      let e = i + 1;
      while (e < nx && !Number.isNaN(floor[j * nx + e]) && solid[j * nx + e] === s && Math.abs(floor[j * nx + e] - h) < 0.04) e++;
      const w = (e - i) * cell, cx = box.min.x + i * cell + w / 2, cz = box.min.z + (j + 0.5) * cell;
      if (s) addBox(cx, cz, w, cell, y0 - 1, h + 9);
      else addBox(cx, cz, w, cell, y0 - 1, h);
      n++; i = e;
    }
  }
  const floorAt = (x, z) => { const i = Math.floor((x - box.min.x) / cell), j = Math.floor((z - box.min.z) / cell); if (i < 0 || j < 0 || i >= nx || j >= nz) return NaN; return floor[j * nx + i]; };
  return { boxes: n, floorAt, box };
}
