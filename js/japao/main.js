// Japão, período Edo (c. 1790), aos pés do Monte Fuji — inicialização e laço principal.
// Etapa 2 do plano (docs/PLANO-JAPAO.md): a paisagem — o vale com o lago Kawaguchi, a vila, os arrozais, a floresta,
// o riacho e a cachoeira, e o Fuji para subir a pé até a cratera. Prédios, gente, eventos e estações vêm depois.
import * as THREE from 'three';
const FRAME = { n: 0 };
import { getTextures, setAniso, loadPBR } from './textures.js';
import { createPost } from '../comum/post.js';
import { warmUp } from '../comum/aquecer.js';
import { skipHiddenMatrices, frameGate, distanceCull } from '../comum/desempenho.js';
import { detectQuality, applyQuality, saveQuality, slowWatch, qualityLabel, PROFILE, LEVELS } from '../comum/qualidade.js';
import { makeWaterFX } from '../comum/waterfx.js';
import { makeWater } from '../comum/agua.js';
import { makeUnderwater } from '../comum/submerso.js';
import { isTouch, canTouch, setupTouch } from '../comum/touch.js';
import { pressTerrain, buildTerrain, buildHorizon, terrainHeight, inLake, polyDist, fujiH, fujiR, WATER_Y, BOUNDS, LAKE, STREET, SHRINE, RESIDENCE, TEMPLE, FIELDS, FUJI, STREAM, TRAIL, SNOW_Y } from './terrain.js';
import { buildNature } from './natureza.js';
import { buildCity } from './buildings.js';
import { loadHumanModel } from '../comum/mixamo.js';
import { Player } from '../comum/player.js';
import { Quests, OBJECTIVES } from './quests.js';
import { setupWardrobe } from '../comum/roupas.js';
import { TimeOfDay } from './sky.js';
import { UI } from './ui.js';
import { AudioFX } from './audio.js';
import { Health, faint } from '../comum/vida.js';
import { nextFrame } from '../comum/util.js';

const ui = new UI();
const audio = new AudioFX();

async function main() {
  let renderer;
  const Q = detectQuality();
  let quality = Q.level;
  try { renderer = new THREE.WebGLRenderer({ antialias: PROFILE[quality].aa, powerPreference: 'high-performance' }); } catch (e) { ui.fail(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, PROFILE[quality].pr));
  { const qb = document.querySelector('#pause [data-act=quality]'); if (qb) qb.textContent = `Gráficos: ${qualityLabel(quality)}`; }
  if (isTouch) {
    document.querySelector('#intro .controls').innerHTML = '<div><b>Joystick</b> (esquerda): mover</div><div><b>Arrastar</b> (direita): girar a câmera</div><div><b>Pinça</b>: zoom</div><div><b>Pular · Correr</b> (na direita)</div>';
    document.getElementById('load-tip').textContent = 'No celular, prefira o Wi-Fi: o primeiro acesso baixa bastante coisa. Jogue com o celular deitado.';
  }
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PROFILE[quality].soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  document.getElementById('game').appendChild(renderer.domElement);
  setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  const scene = new THREE.Scene();
  skipHiddenMatrices();
  scene.matrixWorldAutoUpdate = false;
  const skelUpdate = THREE.Skeleton.prototype.update;
  THREE.Skeleton.prototype.update = function () { if (this._frame === FRAME.n) return; this._frame = FRAME.n; skelUpdate.call(this); };
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.15, 24000);
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera; sc.left = -140; sc.right = 140; sc.top = 140; sc.bottom = -140; sc.near = 10; sc.far = 900;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  sun.shadow.camera.layers.enable(2);
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xd8e6f4, 0x8a9870, 1);
  scene.add(hemi);

  const step = async (f, t) => { ui.progress(f, t); await nextFrame(); await nextFrame(); };
  await step(0.03, 'Juntando as pedras da trilha de peregrinação...');
  const pbr = await loadPBR('assets/textures', (f) => ui.progress(0.03 + f * 0.17));
  const tex = getTextures(); tex.pbr = pbr; tex.quality = quality;
  await step(0.2, 'Chamando os peregrinos...');
  await loadHumanModel(null, tex, (f) => ui.progress(0.2 + f * 0.08));
  await step(0.3, 'Erguendo o Fuji, camada por camada de cinza...');
  const world = buildTerrain(scene, tex);
  // o lago Kawaguchi: água parada e escura, que espelha a montanha
  const water = makeWater({
    width: 900, height: 520, x: LAKE.x, z: LAKE.z, y: WATER_Y, normals: tex.waterNormals, waterColor: 0x1d5f6e, shallowColor: 0x5f9a8a, tint: 0.35, tintDepth: 8, reflect: 0.62, bright: 0.42,
    clarity: 3, foam: 0.2, farDepth: 12, distortion: 1.2, size: 2.2, box: [LAKE.x - 450, LAKE.z - 260, LAKE.x + 450, LAKE.z + 260], res: [300, 180],
    depthAt: (x, z) => WATER_Y - terrainHeight(x, z),
  });
  scene.add(water);
  { const rb = water.onBeforeRender; water.onBeforeRender = function (...a) { const ev = PROFILE[quality].reflEvery; if (FRAME.n % (FRAME.far ? ev + 1 : ev)) return; rb.apply(this, a); }; }
  const horizon = buildHorizon(scene, tex);
  await step(0.45, 'Erguendo as casas dos oshi e o santuário Sengen...');
  const city = buildCity(scene, tex);
  { const n = pressTerrain(world.terrain, city.floors); console.info('lajes de piso:', city.floors.length, '· vértices do chão rebaixados:', n); }
  await step(0.6, 'Plantando os cedros da alameda do santuário...');
  // (depois dos prédios: nenhuma árvore nasce dentro de casa nem nos pátios)
  const avoid = (x, z, m) => city.houses.some((h) => { const c = Math.cos(h.ry), s = Math.sin(h.ry), dx = x - h.x, dz = z - h.z, u = dx * c - dz * s, v = dx * s + dz * c; return Math.abs(u) < h.w / 2 + 1 + m && Math.abs(v) < h.d / 2 + 1 + m; })
    || Object.values(city.zones).some((q) => x > q[0] - m && x < q[1] + m && z > q[2] - m && z < q[3] + m);
  const nature = buildNature(scene, tex, quality, avoid);
  console.info('árvores:', nature.counts, '· casas:', city.houses.length);
  const fx = makeWaterFX(scene);
  const health = new Health({ onDeath: () => onDeath(), onHurt: () => player.hurt() });

  await step(0.82, 'Preparando o explorador...');
  const player = new Player(scene, camera);
  player.bounds = BOUNDS;
  player.makeTorch(tex.glow);
  const start = city.spots.start;
  player.place(start.x, start.z, 0); // de frente para o sul: o Fuji inteiro no fim da rua
  player.events.swim = (p, f, sp, dt, t) => fx.swim(p, f, sp, dt, t);
  player.events.stopSwim = () => fx.stopSwim();
  player.events.handIn = (p, f, pw) => fx.handIn(p, f, pw);
  player.events.handOut = (p) => fx.handOut(p);
  player.events.kick = (p, f) => fx.kick(p, f);
  player.events.drip = (p) => fx.drip(p);
  player.events.ripple = (p, s) => fx.ripple(p, s);
  player.events.splash = (p, s = 1) => { fx.splash(p, s); audio.splash(); };
  player.events.step = (jump, run) => audio.step(jump, run);

  await step(0.9, 'Acendendo as lanternas...');
  const sky = new TimeOfDay({ scene, renderer, sunLight: sun, hemi, water, materials: city.M, torches: city.torches, glowTex: tex.glow, lightsDef: city.lights });
  sky.horizon = horizon; sky.apply(sky.state);
  sky.bakeEnvironments();
  const quests = new Quests(scene, city, tex.glow, ui, audio);
  setupWardrobe({ player, city: 'japao', quests, objectives: OBJECTIVES, toast: (m, k, ms) => ui.toast(m, k, ms) });

  await step(0.96, 'Desenhando o mapa da região...');
  ui.buildMapBackground([
    ['Lago Kawaguchi', LAKE.x, LAKE.z], ['Vila dos oshi', STREET.x + 30, (STREET.z0 + STREET.z1) / 2], ['Santuário Sengen', SHRINE.x + 60, SHRINE.z], ['Residência do senhor', RESIDENCE.x, RESIDENCE.z - 50],
    ['Templo', TEMPLE.x, TEMPLE.z - 50], ['Arrozais', (FIELDS.x0 + FIELDS.x1) / 2, (FIELDS.z0 + FIELDS.z1) / 2], ['Cachoeira', 400, 200], ['Trilha Yoshida', 140, 1000], ['Monte Fuji', FUJI.x, FUJI.z - 160],
  ]);
  ui.renderObjectives(quests);
  ui.setTime('Tarde');
  const post = await createPost(renderer, scene, camera);
  const underwater = makeUnderwater(scene, water, { color: 0x24606a, near: 0.6, far: 22 });
  post.grade.uniforms.uUnderCol.value.setRGB(0.16, 0.42, 0.44);
  post.grade.uniforms.uWarm.value = 0.15; post.grade.uniforms.uSat.value = 1.08; // verdes úmidos, sem o dourado do Mediterrâneo
  camera.layers.enable(3); sun.shadow.camera.layers.enable(3);
  applyQuality(quality, { renderer, sun, post, actors: null });
  scene.traverse((o) => { if ((o.isInstancedMesh && (o.material.alphaTest > 0 || o.count > 300) && o.count !== undefined) || o === sky.clouds) o.layers.set(3); });
  scene.traverse((o) => {
    if (o.isMesh && o.material && o.material.isMeshStandardMaterial && o.material.metalness < 0.5 && !o.material.userData.keepEnv) o.material.envMapIntensity = 0.55;
    if ((o.isSprite && o !== sky.moon && o !== sky.moonGlow) || (o.isMesh && o.material && o.material.transparent && !o.isSkinnedMesh && o.material.depthWrite === false)) o.layers.set(1);
  });
  water.layers.set(1);
  warmUp(renderer, scene, camera, () => post.render(0.016, 0, 0));
  const cull = distanceCull(scene, camera, renderer, player.rig.root); cull.set(PROFILE[quality].px);
  await step(1, 'Pronto!');
  ui.doneLoading();

  // ---------------- estado de jogo ----------------
  let started = false, paused = false, mapOpen = false;
  ui.showIntro(() => {
    started = true; health.show(true); health.render();
    if (Q.software) ui.toast('Seu navegador está sem aceleração de vídeo, por isso o jogo fica pesado. No Chrome: Configurações › Sistema › ligue "Usar aceleração de gráficos" e reinicie o navegador.', 'quest', 14000);
    if (isTouch) { setupTouch(player); ui.toggleJournal(); }
    else if (canTouch) addEventListener('touchstart', () => setupTouch(player), { once: true, passive: true });
    audio.start();
    if (quests.done.size === 0) ui.toast('No fim da rua, o Fuji. A trilha dos peregrinos começa no santuário, no pé da montanha.', 'quest', 6500);
  });

  // ---------------- teclado ----------------
  addEventListener('keydown', (e) => {
    if (!started || e.repeat) return;
    if (e.code === 'Escape') { if (mapOpen) { mapOpen = ui.toggleBigMap(player, hints()); return; } togglePause(); return; }
    if (paused || ui.dialogOpen) return;
    switch (e.code) {
      case 'KeyC': { const p = sky.next(); ui.setTime(p.label); ui.toast(p.msg); break; }
      case 'KeyJ': ui.toggleJournal(); break;
      case 'KeyM': mapOpen = ui.toggleBigMap(player, hints()); break;
    }
  });
  const pauseEl = document.getElementById('pause');
  const togglePause = () => { paused = !paused; pauseEl.hidden = !paused; player.keys.clear(); };
  pauseEl.addEventListener('click', (e) => {
    const act = e.target.dataset?.act; if (!act) return;
    if (act === 'resume') togglePause();
    if (act === 'sound') { audio.setEnabled(!audio.enabled); e.target.textContent = `Som: ${audio.enabled ? 'ligado' : 'desligado'}`; }
    if (act === 'music') { audio.setMusic(!audio.musicOn); e.target.textContent = `Música: ${audio.musicOn ? 'ligada' : 'desligada'}`; }
    if (act === 'quality') {
      quality = LEVELS[(LEVELS.indexOf(quality) + 1) % LEVELS.length]; saveQuality(quality);
      applyQuality(quality, { renderer, sun, post, actors: null, cull });
      prMax = renderer.getPixelRatio(); prMin = Math.max(0.5, prMax * 0.7);
      e.target.textContent = `Gráficos: ${qualityLabel(quality)}`;
    }
    if (act === 'reset') { if (confirm('Apagar o progresso e recomeçar a jornada?')) { quests.reset(); location.reload(); } }
  });
  const hints = () => { const h = []; for (const o of OBJECTIVES) { if (quests.isDone(o.id)) continue; const hh = quests.hintFor(o); if (hh) h.push(hh); if (h.length >= 3) break; } return h; };

  // ---------------- nome do lugar ----------------
  const placeName = () => {
    const p = player.pos, x = p.x, z = p.z, fu = fujiH(x, z);
    if (player.swimming) return 'Lago Kawaguchi';
    if (fujiR(x, z) < FUJI.crater + 20 && p.y > FUJI.H - 30) return 'Cume do Fuji — a cratera';
    if (polyDist(TRAIL, x, z).d < 8 && z > 140) return fu > 330 ? 'Trilha Yoshida — acima das árvores' : 'Trilha Yoshida';
    if (fu > 330) return 'Encosta do Fuji';
    if (Math.abs(x - SHRINE.x) < SHRINE.w / 2 && Math.abs(z - SHRINE.z) < SHRINE.d / 2) return 'Santuário Sengen (Kitaguchi Hongū)';
    if (Math.abs(x - STREET.x) < 40 && z > STREET.z0 && z < STREET.z1) return 'Vila dos oshi — a rua dos peregrinos';
    if (inLake(x, z, 30)) return 'Margem do lago Kawaguchi';
    if (Math.abs(x - RESIDENCE.x) < RESIDENCE.w / 2 + 10 && Math.abs(z - RESIDENCE.z) < RESIDENCE.d / 2 + 10) return 'Residência do senhor';
    if (Math.hypot(x - TEMPLE.x, z - TEMPLE.z) < TEMPLE.r) return 'Colina do templo';
    if (x > FIELDS.x0 && x < FIELDS.x1 && z > FIELDS.z0 && z < FIELDS.z1) return 'Arrozais';
    if (Math.hypot(x - 368, z - 205) < 40) return 'Cachoeira do riacho';
    if (polyDist(STREAM, x, z).d < 10) return 'Margem do riacho';
    if (fu > 20) return 'Floresta do pé do Fuji';
    return 'Pé do Monte Fuji';
  };

  // ---------------- vida ----------------
  const onDeath = () => {
    player.locked = true; player.collapse();
    faint('Você desmaiou... e acordou na vila, numa hospedaria de peregrinos.', () => {
      player.diving = false; player.swimming = false; player.breath = 60;
      player.place(start.x, start.z, 0); health.revive(70); player.rig.once = null; player.locked = false;
    });
  };

  window.__game = { player, quests, sky, post, renderer, scene, camera, city, health, nature, world, tp: (x, z, f) => player.place(x, z, f) };

  // ---------------- laço ----------------
  const clock = new THREE.Clock();
  let t = 0, miniT = 0;
  let prMax = renderer.getPixelRatio(), prMin = Math.max(0.5, prMax * 0.7);
  let frameAvg = 16, adaptT = 0;
  const adaptRes = (raw) => {
    if (document.hidden || raw > 0.25) return;
    frameAvg += (raw * 1000 - frameAvg) * 0.05;
    adaptT += raw; if (adaptT < 2) return; adaptT = 0;
    const pr = renderer.getPixelRatio(); let next = pr;
    if (frameAvg > 24 && pr > prMin) next = Math.max(prMin, pr - 0.1);
    else if (frameAvg < 15 && pr < prMax) next = Math.min(prMax, pr + 0.1);
    if (next !== pr) { renderer.setPixelRatio(next); post.resize(); }
  };
  const slow = slowWatch(() => {
    const i = LEVELS.indexOf(quality); if (i >= LEVELS.length - 1) return;
    quality = LEVELS[i + 1]; saveQuality(quality); applyQuality(quality, { renderer, sun, post, actors: null, cull });
    prMax = renderer.getPixelRatio(); prMin = Math.max(0.5, prMax * 0.7);
    const qb = document.querySelector('#pause [data-act=quality]'); if (qb) qb.textContent = `Gráficos: ${qualityLabel(quality)}`;
    ui.toast(`O jogo estava pesado neste computador: gráficos no modo ${qualityLabel(quality)}. Dá para trocar no menu (Esc).`, 'quest', 7000);
  });
  const gate = frameGate();
  function loop(now = performance.now()) {
    requestAnimationFrame(loop);
    const idle = !started || paused || mapOpen;
    if (!gate(now, idle)) return;
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    renderer.shadowMap.needsUpdate = true;
    FRAME.n++;
    FRAME.far = !inLake(player.pos.x, player.pos.z, 200);
    if (!idle) { adaptRes(raw); if (started && !ui.dialogOpen) slow(raw); }
    if (paused) { scene.updateMatrixWorld(); post.render(dt, sky.state.night, underwater.amount); return; }
    t += dt;
    player.night = sky.state.night;
    if (started && !mapOpen) player.update(dt, t); else player.updateCamera(dt);
    if (started) health.update(dt, player);
    quests.update(dt, t, player);
    sky.update(dt, t, player.pos);
    nature.update(dt);
    water.material.uniforms.time.value += dt * 0.4;
    { const u = water.material.uniforms.uSwim.value; u.set(player.pos.x, 0, player.pos.z, player.swimming ? Math.min(1, u.w + dt * 2) : Math.max(0, u.w - dt * 2)); }
    world.mat.userData.U.uTime.value = t;
    fx.update(dt);
    if (started) {
      ui.prompt('');
      ui.setPlace(placeName());
      miniT -= dt;
      if (miniT <= 0) { ui.drawMinimap(player, [], hints()); miniT = 0.1; }
      const sd = polyDist(STREAM, player.pos.x, player.pos.z).d, fall = Math.hypot(player.pos.x - 368, player.pos.z - 205);
      audio.update(dt, { nearWater: Math.max(Math.max(0, 1 - sd / 30) * 0.6, Math.max(0, 1 - fall / 70)), night: sky.state.night > 0.5, market: 0, sea: 0 });
      audio.windGain && (audio.windGain.gain.value = 0.2 + Math.min(0.5, Math.max(0, player.pos.y - 200) / 900)); // mais vento no alto da montanha
    }
    const under = underwater.update(dt, camera, player);
    scene.updateMatrixWorld();
    cull.update();
    post.render(dt, sky.state.night, under);
  }
  loop();
}

main().catch((e) => { console.error(e); ui.fail('Algo deu errado ao carregar o Japão: ' + e.message); });
