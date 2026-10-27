// Economia de processamento sem mudar nada na tela.
import * as THREE from 'three';

// A cena tem ~25 mil objetos, quase todos ossos de gente que está longe e escondida (visible = false). O three.js
// recalcula a matriz de todos a cada quadro mesmo assim; aqui o ramo escondido fica parado e, quando volta a
// aparecer, é recalculado inteiro antes de ser desenhado.
export function skipHiddenMatrices() {
  const P = THREE.Object3D.prototype;
  if (P._skipHidden) return;
  P._skipHidden = true;
  const orig = P.updateMatrixWorld;
  P.updateMatrixWorld = function (force) {
    if (!this.visible) { this._stale = true; return; }
    if (this._stale) { this._stale = false; force = true; }
    orig.call(this, force);
  };
}

// Limite de quadros: em monitores de 120/144 Hz o jogo desenhava 144 vezes por segundo (ventoinha no máximo) sem
// diferença visível. Acima de ~75 fps pula o quadro; com o jogo pausado ou atrás de uma tela, ~30 fps bastam.
export function frameGate() {
  let last = 0;
  return (now, idle) => {
    const min = idle ? 1000 / 31 : 1000 / 76;
    if (now - last < min) return false;
    last = now;
    return true;
  };
}

// Objetos pequenos e longe (vasos, bancas, tochas, pedras a mais de 100 m) quase não aparecem, mas cada um custa
// uma chamada de desenho ao processador. Nos gráficos leves, o que ficaria com menos de `px` pixels na tela deixa de
// ser desenhado (vai para uma camada que nenhuma câmera vê; o `visible` fica intacto, porque o jogo usa ele).
const HIDE = 1 << 30;
export function distanceCull(scene, camera, renderer, skip) {
  const list = [], c = new THREE.Vector3(), cam = new THREE.Vector3();
  scene.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || !o.geometry) return;
    for (let p = o; p; p = p.parent) if (p === skip) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const r = o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis();
    if (r < 8) list.push({ o, r, mask: o.layers.mask, hid: false });
  });
  let px = 0, k = 0;
  return {
    set(p) { px = p; if (!px) for (const e of list) if (e.hid) { e.o.layers.mask = e.mask; e.hid = false; } },
    update() {
      if (!px || ++k % 12) return;
      camera.getWorldPosition(cam);
      // distância em que um objeto de raio r fica com `px` pixels de altura
      const f = (renderer.domElement.height / 2) / Math.tan((camera.fov * Math.PI) / 360) * 2 / px;
      for (const e of list) {
        c.copy(e.o.geometry.boundingSphere.center).applyMatrix4(e.o.matrixWorld);
        const far = c.distanceToSquared(cam) > (e.r * f) ** 2;
        if (far !== e.hid) { e.hid = far; e.o.layers.mask = far ? HIDE : e.mask; }
      }
    },
  };
}
