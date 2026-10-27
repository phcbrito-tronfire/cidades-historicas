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
