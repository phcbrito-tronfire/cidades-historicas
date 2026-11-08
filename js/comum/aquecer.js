// Aquecimento da GPU no carregamento: compila os shaders e sobe as texturas de TUDO (inclusive o que só aparece
// à noite — chamas, lua, tochas — ou longe da câmera), para nada travar na primeira vez que entra em cena.
// Era aqui que o carregamento parecia defeituoso: a página ficava parada no fim da barra por até um minuto. Agora os
// pedidos vão em lotes, a placa compila em paralelo (KHR_parallel_shader_compile) e a barra anda enquanto isso.
import * as THREE from 'three';
import { breath } from './util.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// O jogo sempre desenha num alvo intermediário (o pós-processamento), nunca direto na tela. Compilar sem esse alvo
// gerava uma segunda versão de cada programa (saída em sRGB) que nunca era usada: quase o dobro do trabalho.
const onTarget = (renderer, rt, fn) => { const prev = renderer.getRenderTarget(); renderer.setRenderTarget(rt); try { return fn(); } finally { renderer.setRenderTarget(prev); } };

// o mesmo material vira programas diferentes conforme o objeto que o usa (instâncias, ossos, cor por vértice...)
const variant = (o) => { const a = o.geometry?.attributes || {}; return `${+!!o.isInstancedMesh}${+!!o.instanceColor}${+!!o.isSkinnedMesh}${+!!o.isPoints}${+!!o.isLine}${+!!a.color}${+!!a.tangent}${+!!a.uv1}${+!!o.morphTargetInfluences}`; };

function texturesOf(materials) {
  const out = new Set();
  for (const m of materials) {
    for (const v of Object.values(m)) if (v && v.isTexture) out.add(v);
    if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture) out.add(u.value);
  }
  return out;
}

// frame(): desenha um quadro completo do jogo (pós-processamento incluído: oclusão de ambiente, sombras e brilho
// também têm shaders próprios por tipo de objeto). onProgress(0..1, texto): a tela de carregamento.
export async function warmUp(renderer, scene, camera, frame = null, onProgress = null) {
  const report = onProgress || (() => {});
  const hidden = [], culled = [], seen = new Set(), todo = [], materials = new Set(), lights = [];
  scene.traverse((o) => {
    if (!o.visible) { hidden.push(o); o.visible = true; }
    if (o.frustumCulled) { culled.push(o); o.frustumCulled = false; }
    if (o.isLight) lights.push(o);
    if (!o.material) return;
    const v = variant(o);
    for (const m of [].concat(o.material)) { materials.add(m); const k = m.uuid + v; if (!seen.has(k)) { seen.add(k); todo.push(o); } }
  });
  const mask = camera.layers.mask, auto = renderer.shadowMap.autoUpdate;
  camera.layers.enableAll();
  const rt = new THREE.WebGLRenderTarget(8, 8);

  // 1) pede a compilação em lotes (o "scene" de mentira só percorre o lote; a cena-alvo é a de verdade, mas sem percorrer
  // dezenas de milhares de objetos a cada lote só para achar as luzes)
  const target = Object.create(scene); target.traverseVisible = (cb) => { for (const l of lights) cb(l); };
  report(0, 'Preparando os gráficos para o seu computador...');
  let t0 = performance.now();
  for (let i = 0; i < todo.length; i += 24) {
    const end = Math.min(i + 24, todo.length);
    const batch = { traverse: (cb) => { for (let j = i; j < end; j++) cb(todo[j]); }, traverseVisible: () => {} };
    onTarget(renderer, rt, () => renderer.compile(batch, camera, target));
    if (performance.now() - t0 > 14) { report((end / todo.length) * 0.08); await breath(); t0 = performance.now(); }
  }

  // 2) espera a placa terminar, sem parar a página: é esta espera que antes congelava a tela
  const programs = renderer.info.programs;
  let last = -1, lastT = performance.now();
  for (;;) {
    let ready = 0; for (const p of programs) if (p.isReady()) ready++;
    if (ready !== last) { last = ready; lastT = performance.now(); report(0.08 + (ready / programs.length) * 0.62, `Preparando os gráficos (${ready} de ${programs.length})...`); }
    if (ready >= programs.length || performance.now() - lastT > 60000) break; // (sem novidade há 1 min: segue, e o que faltar compila no primeiro uso)
    await sleep(40);
  }

  // 3) sobe as texturas aos poucos (o quadro de verdade, depois, não tem mais o que subir)
  const texs = [...texturesOf(materials)];
  t0 = performance.now();
  for (let i = 0; i < texs.length; i++) {
    renderer.initTexture(texs[i]);
    if (performance.now() - t0 > 14) { report(0.7 + (i / texs.length) * 0.15, 'Preparando as texturas...'); await breath(); t0 = performance.now(); }
  }

  // 4) um quadro de verdade: sobe os buffers de geometria e os programas de sombra, oclusão e brilho
  // (um só: desenhar também num alvo minúsculo antes repetia a cena inteira, sem culling, à toa)
  report(0.88, 'Quase lá: montando a primeira imagem...');
  await sleep(30);
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  scene.updateMatrixWorld();
  if (frame) frame(); else onTarget(renderer, rt, () => renderer.render(scene, camera));
  rt.dispose();
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
export function setLateWarm(renderer, scene, camera) { LATE = { renderer, scene, camera, rt: new THREE.WebGLRenderTarget(4, 4) }; }
export async function precompile(obj) {
  if (!LATE || !obj) return;
  const { renderer, scene, camera, rt } = LATE;
  try { await onTarget(renderer, rt, () => renderer.compileAsync(obj, camera, scene)); } catch (e) { /* (sem compileAsync: compila no primeiro uso, como antes) */ }
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
