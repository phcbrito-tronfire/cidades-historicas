// Aquecimento da GPU no carregamento: compila os shaders e sobe as texturas de TUDO (inclusive o que só aparece
// à noite — chamas, lua, tochas — ou longe da câmera), para nada travar na primeira vez que entra em cena.
import * as THREE from 'three';

// frame(): desenha um quadro completo do jogo (pós-processamento incluído: oclusão de ambiente, sombras e brilho
// também têm shaders próprios por tipo de objeto)
export function warmUp(renderer, scene, camera, frame = null) {
  const hidden = [], culled = [];
  scene.traverse((o) => {
    if (!o.visible) { hidden.push(o); o.visible = true; }
    if (o.frustumCulled) { culled.push(o); o.frustumCulled = false; }
  });
  const mask = camera.layers.mask;
  camera.layers.enableAll();
  renderer.compile(scene, camera);
  // um quadro de verdade num alvo minúsculo: sobe texturas e buffers de geometria que o compile não sobe
  const rt = new THREE.WebGLRenderTarget(8, 8), prev = renderer.getRenderTarget(), auto = renderer.shadowMap.autoUpdate;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.setRenderTarget(rt); renderer.render(scene, camera);
  renderer.setRenderTarget(prev); rt.dispose();
  if (frame) { renderer.shadowMap.needsUpdate = true; scene.updateMatrixWorld(); frame(); }
  renderer.shadowMap.autoUpdate = auto;
  camera.layers.mask = mask;
  for (const o of hidden) o.visible = false;
  for (const o of culled) o.frustumCulled = true;
}
