// Roma, c. 117 d.C. (Trajano) — inicialização e laço principal. Primeira etapa: o relevo, o Tibre até o mar e o
// Coliseu inteiro explorável (arquibancada, arena, hipogeu); a gente, os eventos da arena e o resto da cidade vêm depois.
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
import { Artifacts } from './artifacts.js';
import { isTouch, canTouch, setupTouch } from '../comum/touch.js';
import { buildTerrain, buildHorizon, terrainHeight, coastC, inRiver, WATER_Y, BOUNDS, FORUM, CIRCUS, PALATINE, CAPITOL, NAUMACHIA, ISOLA } from './terrain.js';
import { COL, dOf } from './coliseu.js';
import { buildCity } from './buildings.js';
import { registerSculptures } from '../comum/sculptures.js';
import { loadHumanModel } from '../comum/mixamo.js';
import { Actors } from './npcs.js';
import { Player } from '../comum/player.js';
import { Quests, OBJECTIVES } from './quests.js';
import { TimeOfDay } from './sky.js';
import { Items } from './items.js';
import { UI } from './ui.js';
import { AudioFX } from './audio.js';
import { Boats } from './barcos.js';
import { buildSea } from './mar.js';
import { Health, faint } from '../comum/vida.js';
import { Mount } from '../comum/montaria.js';
import { nextFrame } from '../comum/util.js';

// modelos do Sketchfab já usados em Atenas (o naufrágio no mar de Óstia)
registerSculptures('assets/models/gregos/', {
  tambor: { fit: 'y', rough: 0.85, tint: [0.82, 0.9, 0.8] }, coluna_jonica: { fit: 'y', rough: 0.85, tint: [0.84, 0.92, 0.82] },
  capitel_jonico: { rough: 0.85, tint: [0.82, 0.9, 0.8] },
  kyrenia: { rough: 0.95, tint: [0.36, 0.4, 0.3], hide: ['Object_2', 'Object_3', 'Object_4', 'Object_5', 'Object_12', 'Object_13'] },
});
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
    document.querySelector('#intro .controls').innerHTML = '<div><b>Joystick</b> (esquerda): mover</div><div><b>Arrastar</b> (direita): girar a câmera</div><div><b>Pinça</b>: zoom</div><div><b>Pular · Correr</b> (na água: mergulhar)</div><div><b>Clima · Diário · Mapa · Menu</b> (no topo)</div>';
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
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.15, 20000);
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera; sc.left = -140; sc.right = 140; sc.top = 140; sc.bottom = -140; sc.near = 10; sc.far = 700;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  sun.shadow.camera.layers.enable(2);
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xd8e6f4, 0xb8a078, 1);
  scene.add(hemi);

  const step = async (f, t) => { ui.progress(f, t); await nextFrame(); await nextFrame(); };
  await step(0.03, 'Cortando travertino nas pedreiras de Tívoli...');
  const pbr = await loadPBR('assets/textures', (f) => ui.progress(0.03 + f * 0.15));
  const tex = getTextures(); tex.pbr = pbr;
  await step(0.18, 'Chamando o povo de Roma...');
  await loadHumanModel(null, tex, (f) => ui.progress(0.18 + f * 0.07));
  await step(0.26, 'Moldando as sete colinas e o Tibre...');
  const world = buildTerrain(scene, tex);
  // o Tibre e o mar Tirreno: um plano d'água só (o rio é mais barrento perto da cidade, o mar mais azul)
  const water = makeWater({
    width: 7000, height: 7000, x: -350, z: 250, y: WATER_Y, normals: tex.waterNormals, waterColor: 0x1b6a8a, shallowColor: 0x6fb8a4, tint: 0.3, tintDepth: 12, reflect: 0.5, bright: 0.45,
    clarity: 4, foam: 0.8, farDepth: 26, distortion: 3.0, size: 1.4, box: [-1260, -640, 600, 1140], res: [620, 590],
    depthAt: (x, z) => WATER_Y - terrainHeight(x, z),
  });
  scene.add(water);
  { const rb = water.onBeforeRender; water.onBeforeRender = function (...a) { const ev = PROFILE[quality].reflEvery; if (FRAME.n % (FRAME.far ? ev + 1 : ev)) return; rb.apply(this, a); }; }
  const horizon = buildHorizon(scene, tex);
  await step(0.42, 'Erguendo o Anfiteatro Flávio, arco por arco...');
  const city = buildCity(scene, tex);
  const fx = makeWaterFX(scene);
  const boats = new Boats(scene, city, fx, tex.glow);
  // montaria (H): cavalo — o da cavalaria romana (sem estribos, que ainda não existiam)
  const mount = new Mount(scene, 'cavalo', { toast: (m) => ui.toast(m) });
  const health = new Health({ onDeath: () => onDeath(), onHurt: () => player.hurt() });
  const sea = await buildSea(scene, tex, { onSting: () => { health.damage(12); ui.toast('Ai! Uma água-viva — queima como fogo.'); } });

  await step(0.68, 'Abrindo os portões do Coliseu...');
  const actors = new Actors(scene, city);
  actors.camera = camera;
  const items = new Items(scene, tex.glow);

  await step(0.82, 'Preparando o explorador...');
  const player = new Player(scene, camera);
  player.bounds = BOUNDS;
  player.makeTorch(tex.glow);
  const start = city.spots.start;
  player.place(start.x, start.z, Math.PI / 2);
  player.events.swim = (p, f, sp, dt, t) => fx.swim(p, f, sp, dt, t);
  player.events.stopSwim = () => fx.stopSwim();
  player.events.handIn = (p, f, pw) => fx.handIn(p, f, pw);
  player.events.handOut = (p) => fx.handOut(p);
  player.events.kick = (p, f) => fx.kick(p, f);
  player.events.drip = (p) => fx.drip(p);
  player.events.ripple = (p, s) => fx.ripple(p, s);
  player.events.splash = (p, s = 1) => { fx.splash(p, s); audio.splash(); };
  player.events.step = (jump, run) => audio.step(jump, run);

  await step(0.9, 'Acendendo as tochas do ambulacro...');
  const sky = new TimeOfDay({ scene, renderer, sunLight: sun, hemi, water, materials: city.M, torches: city.torches, glowTex: tex.glow, lightsDef: city.lights });
  sky.horizon = horizon; sky.apply(sky.state);
  sky.bakeEnvironments();
  const quests = new Quests(scene, city, tex.glow, ui, audio);
  const artifacts = new Artifacts(scene, city, ui, audio, () => {});

  await step(0.96, 'Desenhando o mapa de Roma...');
  ui.buildMapBackground([
    ['Coliseu', 0, -COL.B - 10], ['Fórum Romano', FORUM.x, FORUM.z], ['Palatino', PALATINE.x, PALATINE.z], ['Capitólio', CAPITOL.x, CAPITOL.z],
    ['Circo Máximo', CIRCUS.x, CIRCUS.z], ['Tibre', -600, -150], ['Ilha Tiberina', ISOLA.x - 40, ISOLA.z], ['Naumaquia de Trajano', NAUMACHIA.x, NAUMACHIA.z - 75],
    ['Campo de Marte', -420, -330], ['Aventino', -330, 400], ['Célio', 95, 205], ['Esquilino', 330, -40], ['Mar Tirreno', -1050, 1000], ['Óstia', -930, 830],
  ]);
  ui.renderObjectives(quests);
  ui.setTime('Tarde');
  const post = await createPost(renderer, scene, camera);
  const underwater = makeUnderwater(scene, water, { color: 0x2a8a8a, near: 0.8, far: 30 });
  post.grade.uniforms.uUnderCol.value.setRGB(0.18, 0.55, 0.55);
  camera.layers.enable(3); sun.shadow.camera.layers.enable(3);
  applyQuality(quality, { renderer, sun, post, actors });
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
    if (quests.done.size === 0) ui.toast('À sua frente, o Coliseu. Entre por qualquer um dos arcos do térreo.', 'quest', 6500);
  });

  // ---------------- teclado ----------------
  addEventListener('keydown', (e) => {
    if (!started || e.repeat) return;
    if (!ui.dialogOpen && !paused && artifacts.key(e)) return;
    if (e.code === 'Escape') { if (mapOpen) { mapOpen = ui.toggleBigMap(player, hints()); return; } togglePause(); return; }
    if (paused || ui.dialogOpen) return;
    switch (e.code) {
      case 'KeyC': { const p = sky.next(); ui.setTime(p.label); ui.toast(p.msg); break; }
      case 'KeyJ': ui.toggleJournal(); break;
      case 'KeyH': mount.key(player); break;
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
      applyQuality(quality, { renderer, sun, post, actors, cull });
      prMax = renderer.getPixelRatio(); prMin = Math.max(0.5, prMax * 0.7);
      e.target.textContent = `Gráficos: ${qualityLabel(quality)}`;
    }
    if (act === 'reset') { if (confirm('Apagar o progresso e recomeçar a jornada?')) { quests.reset(); location.reload(); } }
  });
  const hints = () => { const h = []; for (const o of OBJECTIVES) { if (quests.isDone(o.id)) continue; const hh = quests.hintFor(o); if (hh) h.push(hh); if (h.length >= 3) break; } return h; };

  // ---------------- nome do lugar ----------------
  const placeName = () => {
    const p = player.pos, x = p.x, z = p.z, d = dOf(x, z), Y = COL.y;
    if (d < COL.D + COL.amb + COL.wall) {
      if (d < 0) return p.y < Y - 1.5 ? 'Coliseu — hipogeu' : 'Coliseu — arena';
      if (d < COL.podium && p.y > Y + 2) return 'Coliseu — pódio dos senadores';
      if (d < COL.D && p.y > Y + 2) return 'Coliseu — arquibancada';
      return 'Coliseu — ambulacro';
    }
    if (player.swimming) return coastC(x, z) > 0 ? 'Mar Tirreno' : 'Rio Tibre';
    if (inRiver(x, z, 20)) return 'Margem do Tibre';
    if (Math.abs(x - FORUM.x) < FORUM.hw && Math.abs(z - FORUM.z) < FORUM.hd) return 'Fórum Romano';
    if (Math.abs(x - CIRCUS.x) < CIRCUS.hw && Math.abs(z - CIRCUS.z) < CIRCUS.hd) return 'Circo Máximo';
    if (Math.hypot(x - PALATINE.x, z - PALATINE.z) < 110) return 'Palatino';
    if (Math.hypot(x - CAPITOL.x, z - CAPITOL.z) < 70) return 'Capitólio';
    if (coastC(x, z) > -150) return 'Litoral de Óstia';
    return 'Roma';
  };

  // ---------------- vida ----------------
  const onDeath = () => {
    player.locked = true; player.collapse();
    faint('Você desmaiou... e acordou junto ao Coliseu, com a cabeça doendo.', () => {
      player.diving = false; player.swimming = false; player.breath = 60;
      player.place(start.x, start.z, Math.PI / 2); health.revive(70); player.rig.once = null; player.locked = false;
    });
  };

  window.__game = { mount, player, quests, sky, actors, items, post, renderer, scene, camera, artifacts, boats, city, health, sea, tp: (x, z, f) => player.place(x, z, f) };

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
    quality = LEVELS[i + 1]; saveQuality(quality); applyQuality(quality, { renderer, sun, post, actors, cull });
    prMax = renderer.getPixelRatio(); prMin = Math.max(0.5, prMax * 0.7);
    const qb = document.querySelector('#pause [data-act=quality]'); if (qb) qb.textContent = `Gráficos: ${qualityLabel(quality)}`;
    ui.toast(`O jogo estava pesado neste computador: gráficos no modo ${qualityLabel(quality)}. Dá para trocar no menu (Esc).`, 'quest', 7000);
  });
  const gate = frameGate();
  function loop(now = performance.now()) {
    requestAnimationFrame(loop);
    const idle = !started || paused || mapOpen || artifacts.open;
    if (!gate(now, idle)) return;
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    renderer.shadowMap.needsUpdate = true;
    FRAME.n++;
    FRAME.far = !inRiver(player.pos.x, player.pos.z, 120) && coastC(player.pos.x, player.pos.z) < -260;
    if (!idle) { adaptRes(raw); if (started && !ui.dialogOpen) slow(raw); }
    if (paused) { scene.updateMatrixWorld(); post.render(dt, sky.state.night, underwater.amount); return; }
    t += dt;
    player.night = sky.state.night;
    if (mount.state === 'riding') mount.update(dt, t, player);
    else { if (started && !mapOpen && !artifacts.open) player.update(dt, t); else player.updateCamera(dt); mount.update(dt, t, player); }
    if (started) artifacts.update(dt, t, player);
    actors.update(dt, t, player, quests, sky.state.night);
    sea.update(dt, t, player);
    if (started) health.update(dt, player);
    items.update(t, player.pos);
    quests.update(dt, t, player);
    sky.update(dt, t, player.pos);
    water.material.uniforms.time.value += dt * 0.6;
    { const u = water.material.uniforms.uSwim.value; u.set(player.pos.x, 0, player.pos.z, player.swimming ? Math.min(1, u.w + dt * 2) : Math.max(0, u.w - dt * 2)); }
    world.mat.userData.U.uTime.value = t;
    fx.update(dt);
    if (started) {
      const parts = [];
      if (mount.state === 'riding') parts.push('<kbd>Shift</kbd> Galopar · <kbd>H</kbd> Desmontar');
      else if (mount.state !== 'none' && mount.pos.distanceTo(player.pos) < 3.2) parts.push('<kbd>H</kbd> Montar no cavalo');
      ui.prompt(parts.join(' &nbsp;·&nbsp; '));
      ui.setPlace(placeName());
      miniT -= dt;
      if (miniT <= 0) { ui.drawMinimap(player, [], hints()); miniT = 0.1; }
      const cc = coastC(player.pos.x, player.pos.z);
      audio.update(dt, { nearWater: 0, night: sky.state.night > 0.5, market: 0, sea: Math.max(0, Math.min(1, 1 - -cc / 90)) });
    }
    const under = underwater.update(dt, camera, player);
    scene.updateMatrixWorld();
    cull.update();
    post.render(dt, sky.state.night, under);
  }
  loop();
}

main().catch((e) => { console.error(e); ui.fail('Algo deu errado ao carregar Roma: ' + e.message); });
