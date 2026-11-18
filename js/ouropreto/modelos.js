// Os monumentos de Vila Rica que vêm de modelos 3D de verdade (fotogrametria, Sketchfab, CC BY — créditos no README):
// - a Igreja de São Francisco de Assis ("Igreja São Francisco de Assis 2.0", de Celso.Constancio): recortada só na
//   igreja e com as torres cortadas na altura de 1789 — o telhado foi posto em 1788 e as torres, redesenhadas em
//   1787, ainda subiam (a alvenaria só terminou em 1794). Por isso, andaimes em volta delas e o alto ainda aberto,
//   tapado com o assoalho de trabalho dos pedreiros.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { ver } from '../comum/util.js';
import { track } from '../comum/aquecer.js';
import { addRotBox } from '../comum/collision.js';
import { Batcher } from '../comum/batcher.js';
import { frame } from './kit.js';
import { andaime } from './monumentos.js';
import { PLACES, terrainHeight } from './terrain.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

// no modelo: a fachada olha para -z, o eixo da nave corre para +z, o pé das paredes (depois do recorte) em y = 1121,1, o meio da
// fachada em x = 6 (as torres em x = -1,2 e 13,2, raio ~3 m), a frente em z = -8,5 e os fundos em z = 50
const SF = { cx: 6, front: -8.5, back: 50, x0: -6.5, x1: 18.2, floor: 1121.1, cut: 1135.5, towers: [[-1.2, -4.6], [13.2, -4.6]] };

export function saoFrancisco(scene, M, out) {
  const P = PLACES.saofrancisco, ry = Math.PI / 2; // (a fachada olha para o oeste, para o Largo de Coimbra)
  const fx = P.x - P.w / 2 + 4; // a fachada a 4 m da beira do adro
  const c = Math.cos(ry), s = Math.sin(ry);
  // modelo (mx, mz) → mundo: gira e põe o meio da fachada em (fx, P.z)
  const toW = (mx, mz) => { const dx = mx - SF.cx, dz = mz - SF.front; return [fx + dx * c + dz * s, P.z - dx * s + dz * c]; };
  const y0 = P.y - 0.08 - SF.floor; // (o pé das paredes logo abaixo do chão do adro: nada fica no ar)
  // o embasamento de pedra debaixo da igreja (onde o chão cai além do adro) e o que se fez em 1789 em volta
  const B = new Batcher(); B.ground = terrainHeight;
  const [cx, cz] = toW((SF.x0 + SF.x1) / 2, (SF.front + SF.back) / 2), L = SF.back - SF.front, Wd = SF.x1 - SF.x0;
  const f = frame(B, cx, P.y, cz, ry + Math.PI); // (quadro local: x ao longo da largura, z ao longo da nave)
  let low = Infinity; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0], [0, 1], [0, -1]]) low = Math.min(low, terrainHeight(...f.W(a * Wd / 2, b * L / 2)));
  if (low < P.y - 0.2) f.box(M.pedra, Wd - 0.4, P.y - low + 0.2, L - 0.4, 0, low - P.y - 0.5, 0, { noGround: true }); // (fica por baixo do adro: só aparece onde o chão cai)
  out.floors.push({ x: cx, z: cz, w: Wd, d: L, ry, top: P.y });
  // colisão: o corpo da igreja e as torres
  addRotBox(cx, cz, Wd - 0.4, L - 4, ry, P.y - 1, P.y + 14);
  // as torres em obra: o assoalho de trabalho tapando o alto, as pedras esperando, os andaimes em volta
  for (const [tx, tz] of SF.towers) {
    const [wx, wz] = toW(tx, tz), ft = frame(B, wx, y0 + SF.cut, wz, ry);
    ft.geo(new THREE.CylinderGeometry(2.95, 2.95, 0.35, 24), M.pedra, 0, -0.32, 0, { uv: false });
    ft.box(M.tabua, 3.6, 0.06, 1.0, 0, 0.03, 0.4, { noGround: true });
    for (let k = 0; k < 5; k++) ft.box(M.cantaria, 0.8, 0.4, 0.5, -1.2 + k * 0.6, 0.03, -0.9, { noGround: true });
  }
  { const [ax, az] = toW(SF.cx, SF.front), fa = frame(B, ax, P.y, az, ry); andaime(fa, M, -11, 11, -1.9, 0.1, SF.cut - SF.floor + 2.4, 1.4); } // (o andaime corre a fachada inteira: o frontispício ainda em obra)
  B.build(scene);
  // o modelo
  const g = new THREE.Group(); g.rotation.y = ry; g.position.set(...(() => { const [ox, oz] = toW(0, 0); return [ox, y0, oz]; })());
  scene.add(g);
  const job = track(loader.loadAsync(ver('assets/models/ouropreto/sao_francisco.glb')).then((gl) => {
    gl.scene.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.material.side = THREE.DoubleSide; o.material.roughness = 0.9; o.material.metalness = 0; } });
    g.add(gl.scene); g.updateMatrixWorld(true);
  }));
  out.churches.push({ id: 'saofrancisco', x: cx, z: cz, ry, y: P.y, door: toW(SF.cx, SF.front - 3), obra: true });
  return job;
}
