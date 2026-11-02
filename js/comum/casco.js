// Tampa invisível na linha d'água, no formato do casco: não pinta nada, só grava profundidade depois dos objetos
// opacos. Como a água é transparente e vem depois, ela não é desenhada dentro do barco — o mar não "entra" no casco.
import * as THREE from 'three';

const maskMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true });

// o = modelo do barco já no tamanho certo, olhando para +x; y = altura da tampa no quadro do barco
export function hullMask(o, y = 0.06, k = 0.9) {
  const box = new THREE.Box3().setFromObject(o), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const L = size.x * k, B = size.z * k * 0.92, n = 24, s = new THREE.Shape();
  // contorno em "lente": largo no meio, afinando na proa e na popa
  for (let i = 0; i <= n; i++) { const t = i / n, x = -L / 2 + L * t, w = (B / 2) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * t - 1), 2.4)), 0.55); if (i === 0) s.moveTo(x, w); else s.lineTo(x, w); }
  for (let i = n; i >= 0; i--) { const t = i / n, x = -L / 2 + L * t, w = (B / 2) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * t - 1), 2.4)), 0.55); s.lineTo(x, -w); }
  const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, maskMat); m.position.set(c.x, y, c.z); m.renderOrder = 2; m.frustumCulled = false; m.name = 'tampa-casco';
  return m;
}
