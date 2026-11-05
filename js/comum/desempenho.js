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
  // peças pesadas e longe: bosques de árvores modeladas (cada uma com milhares de triângulos) e esculturas baixadas —
  // a 400–800 m quase não aparecem, mas iam inteiras para a placa de vídeo
  let big = [];
  const scanBig = () => { const old = new Map(big.map((e) => [e.o, e])); big = []; scene.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || !o.geometry) return;
    for (let p = o; p; p = p.parent) if (p === skip) return;
    const g = o.geometry, tri = (g.index ? g.index.count : g.attributes.position.count) / 3;
    if (o.isInstancedMesh ? tri >= 400 : tri >= 15000 && ((rr) => rr >= 8 && rr < 40)((g.boundingSphere || (g.computeBoundingSphere(), g.boundingSphere)).radius * o.matrixWorld.getMaxScaleOnAxis())) big.push(old.get(o) || { o, mask: o.layers.mask, hid: false, inst: o.isInstancedMesh });
  }); };
  scanBig(); // (e de novo de tempos em tempos: os modelos baixados chegam depois)
  let bigFar = [650, 600];
  let px = 0, k = 0;
  const rigs = rigCull(scene, camera, skip);
  return {
    set(p) { px = p; rigs.far = p >= 18 ? 55 : p > 0 ? 75 : 110; bigFar = p >= 18 ? [230, 210] : p > 0 ? [330, 300] : [650, 600]; if (!px) for (const e of list) if (e.hid) { e.o.layers.mask = e.mask; e.hid = false; } },
    update() {
      rigs.update();
      if (++k % 12) return;
      if (k % 720 === 0) scanBig();
      camera.getWorldPosition(cam);
      for (const e of big) {
        const o = e.o, bs = o.isInstancedMesh ? (o.boundingSphere || (o.computeBoundingSphere(), o.boundingSphere)) : o.geometry.boundingSphere; if (!bs) continue;
        c.copy(bs.center).applyMatrix4(o.matrixWorld); const R = bs.radius * o.matrixWorld.getMaxScaleOnAxis(), lim = (e.inst ? bigFar[0] : bigFar[1]) + R;
        const far = c.distanceToSquared(cam) > lim * lim; if (far !== e.hid) { e.hid = far; o.layers.mask = far ? HIDE : e.mask; }
      }
      if (!px) return;
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

// Gente longe ou fora da vista: os bonecos (malhas com esqueleto) não têm o tamanho animado conhecido, então são
// desenhados mesmo fora da tela — e cada um tem ~45 mil triângulos. A plateia e os lutadores do Coliseu, o circo e a
// gente do dia a dia de toda a cidade iam para a placa de vídeo o tempo todo. Aqui: longe (far) ou fora da vista e a
// mais de 20 m, o boneco sai da camada da câmera (o visible fica intacto: quem controla cada um continua mandando).
function rigCull(scene, camera, skip) {
  const W = new THREE.Vector3(), cam = new THREE.Vector3(), fr = new THREE.Frustum(), pv = new THREE.Matrix4(), sph = new THREE.Sphere();
  let list = null, k = 0;
  // cada boneco é escondido inteiro: a malha com esqueleto e tudo o que vai preso aos ossos (véu, capacete, escudo,
  // espada, chapéu) — antes só a malha sumia, e o véu e o capacete ficavam boiando no ar
  const setHid = (e, hide) => { e.hid = hide; for (const m of e.meshes) { m.userData.cullMask ??= m.layers.mask; m.layers.mask = hide ? HIDE : m.userData.cullMask; } };
  const R = {
    far: 110,
    update() {
      if (++k % 6) return;
      if (!list || k % 600 === 0) {
        const old = new Map((list || []).map((e) => [e.o, e])), units = new Set(); list = [];
        scene.traverse((o) => { if (!o.isSkinnedMesh) return; let unit = o, far = 0;
          for (let p = o; p; p = p.parent) { if (p === skip) return; if (p.userData?.rig) unit = p; if (!far && p.userData?.cullFar) far = p.userData.cullFar; }
          if (units.has(unit)) return; units.add(unit);
          const meshes = []; unit.traverse((m) => { if (m.isMesh || m.isLine || m.isPoints) meshes.push(m); });
          const e = old.get(unit) || { o: unit, hid: false }; e.meshes = meshes; e.far = far; if (e.hid) setHid(e, true); list.push(e); });
      }
      camera.getWorldPosition(cam); pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); fr.setFromProjectionMatrix(pv);
      const f2 = R.far * R.far;
      for (const e of list) {
        if (!e.o.parent) continue;
        e.o.getWorldPosition(W); const d2 = W.distanceToSquared(cam);
        const hide = d2 > (e.far ? e.far * e.far : f2) || (d2 > 400 && !fr.intersectsSphere(sph.set(W.setY(W.y + 1), 3)));
        if (hide !== e.hid) setHid(e, hide);
      }
    },
  };
  return R;
}
