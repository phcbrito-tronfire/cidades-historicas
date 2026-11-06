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

// Modelos que chegam DEPOIS do aquecimento (peixes, golfinhos, tartarugas, barcos, estátuas baixadas): os shaders
// deles eram compilados na primeira vez que entravam em cena — e os bichos do mar só aparecem quando o explorador
// chega perto da água, então o jogo travava ~3 s na beira do mar, em todas as cidades. Agora cada modelo é compilado
// assim que carrega, em segundo plano (compileAsync: a placa compila sem parar o jogo), antes de ser usado.
let LATE = null;
export function setLateWarm(renderer, scene, camera) { LATE = { renderer, scene, camera }; }
export async function precompile(obj) {
  if (!LATE || !obj) return;
  try { await LATE.renderer.compileAsync(obj, LATE.camera, LATE.scene); } catch (e) { /* (sem compileAsync: compila no primeiro uso, como antes) */ }
}

// Modelos ainda chegando (registrados por sculptures.js e fauna.js): o carregamento espera todos antes do
// aquecimento, para os peixes, golfinhos e barcos também serem compilados atrás da tela de carregamento. Em várias
// placas (Direct3D pelo ANGLE) o compileAsync não adianta: o shader só é compilado de verdade no primeiro uso.
const loading = new Set();
export function track(p) { loading.add(p); const done = () => loading.delete(p); p.then(done, done); return p; }
export async function modelsSettled(maxMs = 20000) {
  const t0 = performance.now();
  while (performance.now() - t0 < maxMs) {
    if (loading.size) { await Promise.race([Promise.allSettled([...loading]), new Promise((r) => setTimeout(r, 500))]); continue; }
    await new Promise((r) => setTimeout(r, 60)); // (quem esperava um modelo pode ter pedido o próximo)
    if (!loading.size) return;
  }
}
