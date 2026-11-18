// Vila Rica (Ouro Preto), 1789 — inicialização e laço principal.
// Etapa 2 do plano (docs/PLANO-OURO-PRETO.md): o terreno e o mapa-base — o vale do ribeirão, os dois vales que descem
// do norte, a praça no espigão, as ruas em ladeira calçadas de pé de moleque, as pontes de pedra, os córregos, os
// morros quase pelados pela mineração, as lavras do Morro da Queimada e o Itacolomi no horizonte. Casas, igrejas,
// Etapas 3 e 4: casas, igrejas, interiores. Etapa 5 (gente.js): o povo da vila, com ofício, roupa de 1789 e voz.
// Os dias da Inconfidência vêm na Etapa 6.
import * as THREE from 'three';
import { openQuiz } from '../comum/quiz.js';
const FRAME = { n: 0 };
import { getTextures, setAniso, loadPBR } from './textures.js';
import { createPost } from '../comum/post.js';
import { upgradeSky } from '../comum/ceu.js';
import { warmUp, setLateWarm, modelsSettled } from '../comum/aquecer.js';
import { makeTravel } from '../comum/viagem.js';
import { skipHiddenMatrices, frameGate, distanceCull } from '../comum/desempenho.js';
import { detectQuality, applyQuality, saveQuality, slowWatch, qualityLabel, prFloor, PROFILE, LEVELS } from '../comum/qualidade.js';
import { makeWaterFX } from '../comum/waterfx.js';
import { isTouch, canTouch, setupTouch } from '../comum/touch.js';
import { buildCity } from './buildings.js';
import { saoFrancisco, statues } from './modelos.js';
import { buildTerrain, buildHorizon, pressTerrain, placeName, houseBand, streetAt, PLACES, STREAMS, BRIDGES, BOUNDS, polyDist } from './terrain.js';
import { buildNature } from './natureza.js';
import { buildBridges } from './pontes.js';
import { loadHumanModel } from '../comum/mixamo.js';
import { Player } from '../comum/player.js';
import { Gente, look } from './gente.js';
import { Dias } from './dias.js';
import { buildMina, MINA } from './mina.js';
import { Bateia } from './bateia.js';
import { Mount } from '../comum/montaria.js';
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
  try { renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }); } catch (e) { ui.fail(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, PROFILE[quality].pr));
  { const qb = document.querySelector('#pause [data-act=quality]'); if (qb) qb.textContent = `Gráficos: ${qualityLabel(quality)}`; }
  if (isTouch) {
    document.querySelector('#intro .controls').innerHTML = '<div><b>Joystick</b> (esquerda): mover</div><div><b>Arrastar</b> (direita): girar a câmera</div><div><b>Pinça</b>: zoom</div><div><b>Pular · Correr</b> (na direita)</div>';
    document.getElementById('load-tip').textContent = 'No celular, prefira o Wi-Fi: o primeiro acesso baixa bastante coisa. Jogue com o celular deitado.';
  }
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = quality !== 'minimo';
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
  setLateWarm(renderer, scene, camera);
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera; sc.left = -140; sc.right = 140; sc.top = 140; sc.bottom = -140; sc.near = 10; sc.far = 900;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  sun.shadow.camera.layers.enable(2);
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xd8e2ee, 0x8a7a62, 1);
  scene.add(hemi);

  const step = async (f, t) => { ui.progress(f, t); await nextFrame(); await nextFrame(); };
  await step(0.03, 'Assentando as pedras do calçamento...');
  const pbr = await loadPBR('assets/textures', (f) => ui.progress(0.03 + f * 0.17));
  const tex = getTextures(); tex.pbr = pbr; tex.quality = quality;
  await step(0.2, 'Chamando os moradores...');
  await loadHumanModel(null, tex, (f) => ui.progress(0.2 + f * 0.08));
  await step(0.3, 'Erguendo os morros e cavando o vale do ribeirão...');
  const world = buildTerrain(scene, tex);
  const horizon = buildHorizon(scene);
  await step(0.42, 'Fechando os arcos das pontes de pedra...');
  const bridges = buildBridges(scene, tex);
  await step(0.48, 'Levantando as casas das ladeiras, uma a uma...');
  const city = buildCity(scene, tex);
  saoFrancisco(scene, city.M, city);
  statues(scene, city.statues);
  { const n = pressTerrain(world.terrain, city.floors); pressTerrain(world.mid, []); console.info('casas:', city.houses.length, '· pisos:', city.floors.length, '· vértices do chão rebaixados:', n); }
  await step(0.6, 'Deixando a mata só nas grotas...');
  // (nada de árvore nas faixas das casas, nos largos nem nas pontes)
  const inHouse = (x, z, m) => city.houses.some((h) => { const dx = x - h.x, dz = z - h.z; if (Math.abs(dx) + Math.abs(dz) > h.w + h.d + m) return false; const c = Math.cos(h.ry), s = Math.sin(h.ry), lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.abs(lx) < h.w / 2 + m && Math.abs(lz) < h.d / 2 + m; });
  const avoid = (x, z, m) => houseBand(x, z, m) || inHouse(x, z, m) || bridges.some((b) => Math.hypot(x - b.x, z - b.z) < b.half + 4 + m);
  const nature = buildNature(scene, tex, quality, (x, z, m) => avoid(x, z, m) || (city.yards || []).some((r) => Math.hypot(x - r.x, z - r.z) < (r.w + r.d) / 2 + m), city.yardPlants);
  console.info('plantas:', nature.counts, '· pontes:', bridges.length);
  const fx = makeWaterFX(scene);
  const health = new Health({ onDeath: () => onDeath(), onHurt: () => player.hurt() });

  await step(0.82, 'Preparando o explorador...');
  const player = new Player(scene, camera);
  player.bounds = BOUNDS;
  player.makeTorch(tex.glow);
  const start = { x: 0, z: 24, f: 0 }; // na praça, de frente para o sul: a Câmara em obra e o Itacolomi lá longe
  player.place(start.x, start.z, start.f);
  player.events.swim = (p, f, sp, dt, t) => fx.swim(p, f, sp, dt, t);
  player.events.stopSwim = () => fx.stopSwim();
  player.events.handIn = (p, f, pw) => fx.handIn(p, f, pw);
  player.events.handOut = (p) => fx.handOut(p);
  player.events.kick = (p, f) => fx.kick(p, f);
  player.events.drip = (p) => fx.drip(p);
  player.events.ripple = (p, s) => fx.ripple(p, s);
  player.events.splash = (p, s = 1) => { fx.splash(p, s); audio.splash(); };
  player.events.step = (jump, run, built) => audio.step(jump, run, built || streetAt(player.pos.x, player.pos.z) ? 'stone' : 'earth'); // (no pé de moleque e nas pontes, o passo estala na pedra)
  player.events.wadeStep = (p, run) => { fx.ripple(p, run ? 1.1 : 0.8); fx.splash(p, run ? 0.22 : 0.14); audio.wade(run); };

  buildMina(scene, tex, city.M, city);
  await step(0.9, 'Acendendo as lamparinas...');
  const sky = new TimeOfDay({ scene, renderer, sunLight: sun, hemi, water: null, materials: city.M, torches: city.torches, glowTex: tex.glow, lightsDef: [] });
  sky.horizon = horizon; upgradeSky(sky, { cover: 0.55, haze: [30, 360, 0.9], leve: quality !== 'alto' }); sky.apply(sky.state);
  sky.bakeEnvironments();
  // as velas dos altares (as chamas, sempre acesas) e a luz de dentro das igrejas: duas luzes quentes que vão para a
  // igreja onde o explorador está (o número de luzes nunca muda: trocar a quantidade recompilaria todos os materiais)
  const candles = (() => { const g = new THREE.BufferGeometry(); g.setFromPoints(city.candles); const m = new THREE.PointsMaterial({ map: tex.glow, color: 0xffb860, size: 0.22, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p); return p; })();
  const inLights = [0, 1].map(() => { const l = new THREE.PointLight(0xffb468, 0, 30, 1.2); scene.add(l); return l; });
  const interiorLight = (dt, P) => {
    let best = null, bd = 45; for (const it of city.interiors) { const d = Math.hypot(P.x - it.at[0], P.z - it.at[1]); if (d < bd) { bd = d; best = it; } }
    const want = best ? 1 - Math.max(0, bd - 25) / 20 : 0;
    inLights.forEach((l, i) => { if (best) { const L = i ? best.light2 : best.light; l.position.set(L[0][0], L[1], L[0][1]); } l.intensity += ((want * (i ? 22 : 30)) - l.intensity) * Math.min(1, dt * 3); });
    candles.material.size = 0.2 + Math.sin(performance.now() * 0.013) * 0.015; // (a chama tremendo)
  };
  const quests = new Quests(ui, audio);
  setupWardrobe({ player, city: 'ouropreto', quests, objectives: OBJECTIVES, toast: (m, k, ms) => ui.toast(m, k, ms) });

  await step(0.93, 'Pondo a gente na rua...');
  const gente = new Gente(scene, city); gente.camera = camera; gente.viewR = PROFILE[quality].npcR; gente.shadowR = PROFILE[quality].npcShadow; gente.spawn(); gente.spawnTropa(); // (até onde a gente aparece e faz sombra: pelo nível de gráfico)

  const dias = new Dias({ scene, city, gente, sky, ui, audio, quests, glow: tex.glow }); quests.spots = city.spots; quests.minaBoca = city.minaBoca; dias.start();
  for (const [x, z, ry] of city.minaGente || []) { const lk = look('minerador'); lk.extras = ['almocafre']; gente.add('minerador', lk, x, z, ry, { y: MINA.y, mode: '@pegar', night: true, extra: { static: true } }); } // (os mineradores lá dentro da galeria)
  const bateia = new Bateia({ ui, audio, quests, toast: (m, k, ms) => ui.toast(m, k, ms) });
  const mount = new Mount(scene, 'mula', { toast: (m) => ui.toast(m) });
  // a galeria: entrar pela boca das lavras, sair pela luz do fim do primeiro lanço
  const naMina = () => player.pos.x > MINA.box[0] && player.pos.x < MINA.box[1] && player.pos.z > MINA.box[2] && player.pos.z < MINA.box[3];
  const bocaDe = () => { const b = city.minaBoca; return b && [b.x + Math.sin(b.face) * 1.6, b.z + Math.cos(b.face) * 1.6]; };
  const minaAcao = () => {
    if (naMina()) { const e = city.mina.entra; if (Math.hypot(player.pos.x - e[0], player.pos.z - e[1]) < 3) return { txt: 'Sair da galeria', fn: () => { const b = city.minaBoca; player.bounds = BOUNDS; player.place(b.x + Math.sin(b.face) * 2.6, b.z + Math.cos(b.face) * 2.6, b.face); } }; return null; }
    const p = bocaDe(); if (p && Math.hypot(player.pos.x - p[0], player.pos.z - p[1]) < 2.6 && mount.state !== 'riding') return { txt: 'Entrar na galeria (com a lamparina)', fn: () => { const e = city.mina.entra; player.bounds = MINA.box; player.place(e[0], e[1], e[2]); ui.toast('A galeria é baixa e molhada. A lamparina mostra os quadros de madeira que seguram o teto. Lá no fundo, o barulho do almocafre na pedra.', 'quest', 8000); } };
    return null; };
  const perto = () => dias.acao(player.pos) || minaAcao();

  await step(0.96, 'Desenhando o mapa da vila...');
  const P = PLACES, B0 = BRIDGES.find((b) => b.stream === 'funil');
  const mapJob = ui.buildMapBackground([
    ['Praça', P.praca.x, P.praca.z + 4], ['Palácio', P.palacio.x, P.palacio.z - 6], ['Pilar', P.pilar.x, P.pilar.z + 30], ['Rosário', P.rosario.x, P.rosario.z - 28], ['Contos', P.contos.x + 8, P.contos.z - 22],
    ['Carmo', P.carmo.x - 10, P.carmo.z + 30], ['São Francisco', P.saofrancisco.x + 30, P.saofrancisco.z - 36], ['Antônio Dias', P.antoniodias.x, P.antoniodias.z + 36], ['Santa Efigênia', P.efigenia.x, P.efigenia.z - 32],
    ['Morro da Queimada', P.queimada.x, P.queimada.z - 40], ['Ribeirão do Funil', -120, 214], ['Para o Rio', -740, 0], ['Para Mariana', 740, -70],
  ]);
  ui.renderObjectives(quests);
  ui.setTime('Tarde · Fevereiro de 1789');
  const post = await createPost(renderer, scene, camera);
  post.grade.uniforms.uWarm.value = 0.22; post.grade.uniforms.uSat.value = 1.04; // (o ar quente de Minas, a terra vermelha)
  camera.layers.enable(3); sun.shadow.camera.layers.enable(3);
  applyQuality(quality, { renderer, sun, post });
  scene.traverse((o) => { if ((o.isInstancedMesh && (o.material.alphaTest > 0 || o.count > 300) && o.count !== undefined) || o === sky.clouds) o.layers.set(3); });
  scene.traverse((o) => {
    if (o.isMesh && o.material && o.material.isMeshStandardMaterial && o.material.metalness < 0.5 && !o.material.userData.keepEnv) o.material.envMapIntensity = 0.55;
    if ((o.isSprite && o !== sky.moon && o !== sky.moonGlow) || (o.isMesh && o.material && o.material.transparent && !o.isSkinnedMesh && o.material.depthWrite === false)) o.layers.set(1);
  });
  // viagem rápida: pontos no mapa (M); clicou, o explorador vai até lá numa coluna de luz
  const travel = makeTravel({ scene, player, toast: (m) => ui.toast(m), points: [
    { name: 'Praça do Palácio', sub: 'o alto da vila, entre os dois bairros', x: 0, z: 24, lx: 0, lz: 80 },
    { name: 'Largo dos Contos', sub: 'a ponte de pedra e a Rua de São José', x: P.contos.x, z: P.contos.z, lx: B0 ? B0.x : P.contos.x - 40, lz: B0 ? B0.z : P.contos.z },
    { name: 'Matriz do Pilar', sub: 'o bairro do oeste, no fundo do vale', x: P.pilar.x + 14, z: P.pilar.z - 20, lx: P.pilar.x, lz: P.pilar.z },
    { name: 'São Francisco de Assis', sub: 'o Largo de Coimbra', x: P.coimbra.x, z: P.coimbra.z, lx: P.saofrancisco.x, lz: P.saofrancisco.z },
    { name: 'Matriz de Antônio Dias', sub: 'o bairro do leste', x: P.antoniodias.x - 10, z: P.antoniodias.z + 22, lx: P.antoniodias.x, lz: P.antoniodias.z },
    { name: 'Santa Efigênia', sub: 'o Alto da Cruz', x: P.efigenia.x, z: P.efigenia.z + 18, lx: 0, lz: 0 },
    { name: 'Morro da Queimada', sub: 'as lavras e as ruínas de 1720', x: P.queimada.x, z: P.queimada.z + 18, lx: P.queimada.x, lz: P.queimada.z - 60 },
    { name: 'Igreja do Rosário', sub: 'a irmandade dos homens pretos', x: P.rosario.x + 14, z: P.rosario.z, lx: P.rosario.x, lz: P.rosario.z },
  ], close: () => { mapOpen = ui.toggleBigMap(player, hints()); } });
  ui.onMapDrawn = (ctx, toPx) => travel.draw(ctx, toPx);
  ui.progress(1, 'Quase pronto...');
  await modelsSettled();
  await warmUp(renderer, scene, camera, () => post.render(0.016, 0, 0), (f, t) => ui.progressEnd(f, t)); await mapJob;
  const cull = distanceCull(scene, camera, renderer, player.rig.root); cull.set(PROFILE[quality].px);
  ui.progressEnd(1, 'Pronto!'); await nextFrame();
  ui.doneLoading();

  // ---------------- estado de jogo ----------------
  let started = false, paused = false, mapOpen = false;
  ui.showIntro(() => {
    started = true; health.show(true); health.render();
    if (Q.software) ui.toast('Seu navegador está sem aceleração de vídeo, por isso o jogo fica pesado. No Chrome: Configurações › Sistema › ligue "Usar aceleração de gráficos" e reinicie o navegador.', 'quest', 14000);
    if (isTouch) { setupTouch(player); ui.toggleJournal(); }
    else if (canTouch) addEventListener('touchstart', () => setupTouch(player), { once: true, passive: true });
    audio.start();
    if (quests.done.size === 0) ui.toast('A praça fica no alto do morro. Para um lado a Rua Direita desce ao Pilar; para o outro, a Rua do Ouvidor desce a São Francisco e a Antônio Dias.', 'quest', 8000);
  });

  // ---------------- teclado ----------------
  addEventListener('keydown', (e) => {
    if (!started || e.repeat || dias.cardOpen || bateia.open) return;
    if (e.code === 'Escape') { if (mapOpen) { mapOpen = ui.toggleBigMap(player, hints()); return; } togglePause(); return; }
    if (paused || ui.dialogOpen) return;
    switch (e.code) {
      case 'KeyE': { const ac = perto(); if (ac) { ac.fn(); break; } if (dias.sentado) break; const tg = gente.nearestInteractable(player.pos); if (tg) (tg.type === 'npc' ? conversa(tg.o) : falar(tg.o)); break; }
      case 'KeyB': { if (dias.sentado || mount.state === 'riding') break; let ok = false; for (const C of Object.values(STREAMS)) { const q = polyDist(C.pts, player.pos.x, player.pos.z); if (q.d < C.hw * 1.6 + 3) ok = true; /* (a água desenhada é mais larga que o eixo do leito) */ } if (ok) bateia.start(); else ui.toast('A bateia se usa na beira de um córrego: o ribeirão, lá embaixo, ou os córregos do Funil e de Antônio Dias.'); break; } // (catar ouro)
      case 'KeyH': { if (naMina()) { ui.toast('A mula não entra na galeria.'); break; } if (!dias.sentado) mount.key(player); if (mount.state === 'riding') quests.complete('mula'); break; } // (a mula do tropeiro)
      case 'KeyC': dias.next(); break; // (o próximo dia marcado)
      case 'KeyT': { const p = sky.next(); ui.setTime(dias.label()); ui.toast(p.msg); break; } // (a hora: manhã, tarde, noite)
      case 'KeyJ': ui.toggleJournal(); break;
      case 'KeyM': mapOpen = ui.toggleBigMap(player, hints()); break;
    }
  });
  // a fala curta de quem está por perto (cada um diz uma coisa da sua vida, sorteada entre as suas)
  const RUA = new Set(['homem', 'mulher', 'senhor', 'senhora', 'quitandeira', 'escravo', 'aguadeira', 'tropeiro', 'pedreiro', 'canteiro', 'dragao']);
  const falar = (o) => {
    o.talking = true; player.locked = true; ui.openDialog({ name: gente.titulo(o), title: '' }); audio.talk();
    o.fi = ((o.fi ?? Math.floor(Math.random() * o.lines.length)) + 1) % o.lines.length;
    const txt = gente.boato && RUA.has(o.kind) && Math.random() < 0.5 ? gente.boato[Math.floor(Math.random() * gente.boato.length)] : o.lines[o.fi]; // (metade das vezes, o assunto do dia)
    ui.say(txt, [{ label: '(Seguir caminho)', cb: () => { ui.closeDialog(); o.talking = false; player.locked = false; } }]);
  };
  // a conversa longa: os assuntos de cada pessoa, um por um
  const conversa = (k) => {
    const def = k.def; k.talking = true; player.locked = true; k.read = k.read || new Set();
    ui.openDialog({ name: def.name, title: def.title }); audio.talk();
    const close = () => { ui.closeDialog(); k.talking = false; player.locked = false; };
    const topic = (i, page) => { const tp = def.topics[i]; k.read.add(i); quests.complete(def.objective); const last = page >= tp.a.length - 1;
      ui.say(tp.a[page], [{ label: last ? 'Voltar às perguntas' : 'Continuar...', cb: () => (last ? menu(false) : topic(i, page + 1)) }]); };
    const menu = (first) => { const opts = def.topics.map((tp, i) => ({ label: tp.q, read: k.read.has(i), cb: () => topic(i, 0) }));
      opts.push({ label: 'Até logo.', cb: () => ui.say(def.bye, [{ label: '(Despedir-se)', cb: close }]) });
      ui.say(first ? (def.greetDay?.[dias.day] || def.greet) : ['O que mais quer saber?', 'Pergunte.', 'Mais alguma coisa?'][Math.floor(Math.random() * 3)], opts); };
    menu(true);
  };
  const pauseEl = document.getElementById('pause');
  document.getElementById('btn-quiz-end')?.addEventListener('click', () => { const en = document.getElementById('ending'); if (en) en.hidden = true; openQuiz('ouropreto', () => { if (en) en.hidden = false; }); });
  const togglePause = () => { paused = !paused; pauseEl.hidden = !paused; player.keys.clear(); };
  pauseEl.addEventListener('click', (e) => {
    const act = e.target.dataset?.act; if (!act) return;
    if (act === 'resume') togglePause();
    if (act === 'quiz') { pauseEl.hidden = true; openQuiz('ouropreto', () => { pauseEl.hidden = !paused; }); }
    if (act === 'sound') { audio.setEnabled(!audio.enabled); e.target.textContent = `Som: ${audio.enabled ? 'ligado' : 'desligado'}`; }
    if (act === 'music') { audio.setMusic(!audio.musicOn); e.target.textContent = `Música: ${audio.musicOn ? 'ligada' : 'desligada'}`; }
    if (act === 'quality') {
      quality = LEVELS[(LEVELS.indexOf(quality) + 1) % LEVELS.length]; saveQuality(quality, true);
      applyQuality(quality, { renderer, sun, post, actors: gente, cull });
      prMax = renderer.getPixelRatio(); prMin = prFloor(prMax);
      e.target.textContent = `Gráficos: ${qualityLabel(quality)}`;
    }
    if (act === 'reset') { if (confirm('Apagar o progresso e recomeçar a jornada?')) { quests.reset(); travel.reset(); location.reload(); } }
  });
  const hints = () => { const h = []; for (const o of OBJECTIVES) { if (quests.isDone(o.id)) continue; const hh = quests.hintFor(o); if (hh) h.push(hh); if (h.length >= 3) break; } return h; };

  // ---------------- vida ----------------
  const onDeath = () => {
    player.locked = true; player.collapse();
    faint('Você desmaiou... e acordou na praça, com um morador abanando seu rosto.', () => {
      player.diving = false; player.swimming = false; player.breath = 60;
      player.place(start.x, start.z, start.f); health.revive(70); player.rig.once = null; player.locked = false;
    });
  };

  window.__game = { city, gente, dias, cull, player, quests, sky, post, renderer, scene, camera, health, nature, world, bridges, tp: (x, z, f) => player.place(x, z, f) };

  // ---------------- laço ----------------
  const clock = new THREE.Clock();
  let t = 0, miniT = 0;
  let prMax = renderer.getPixelRatio(), prMin = prFloor(prMax);
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
    quality = LEVELS[i + 1]; saveQuality(quality); applyQuality(quality, { renderer, sun, post, actors: gente, cull });
    prMax = renderer.getPixelRatio(); prMin = prFloor(prMax);
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
    if (!idle) { adaptRes(raw); if (started && !ui.dialogOpen) slow(raw); }
    if (paused) { scene.updateMatrixWorld(); post.render(dt, sky.state.night, 0); return; }
    t += dt;
    player.night = sky.state.night;
    travel.update(dt, started && !paused);
    if (naMina()) player.night = 1; // (lá dentro é sempre noite: a lamparina acende)
    if (dias.sentado) dias.sentadoUpdate(dt, t, player); // (sentado na plateia da comédia)
    else if (mount.state === 'riding') mount.update(dt, t, player);
    else { if (started && !mapOpen) player.update(dt, t); else player.updateCamera(dt); mount.update(dt, t, player); }
    if (naMina()) { const f = city.mina.fim; if (Math.hypot(player.pos.x - f[0], player.pos.z - f[1]) < 3.5) quests.complete('mina'); } // (chegou à frente de trabalho)
    if (started) health.update(dt, player);
    quests.update(dt, t, player, camera);
    sky.update(dt, t, player.pos);
    nature.update(dt); nature.cull(camera, dt);
    interiorLight(dt, player.pos);
    gente.update(dt, t, player, sky.state.night); dias.update(dt, t, player);
    world.mat.userData.U.uTime.value = t;
    fx.update(dt);
    if (started) {
      { const ac = !ui.dialogOpen && perto(), tg = !ac && !ui.dialogOpen && !dias.sentado && gente.nearestInteractable(player.pos), parts = [];
        if (ac) parts.push(`<kbd>E</kbd> ${ac.txt}`); else if (tg) parts.push(`<kbd>E</kbd> Falar com ${tg.type === 'npc' ? gente.titulo(tg.o) : gente.titulo(tg.o).toLowerCase()}`);
        if (!naMina()) { if (mount.state === 'riding') parts.push('<kbd>Shift</kbd> Trotar · <kbd>H</kbd> Desmontar'); else if (mount.state !== 'none' && mount.pos.distanceTo(player.pos) < 3.2) parts.push('<kbd>H</kbd> Montar na mula'); }
        ui.prompt(parts.join(' &nbsp;·&nbsp; ')); }
      ui.setPlace(naMina() ? 'Galeria da mina — Morro da Queimada' : placeName(player.pos.x, player.pos.z, player.pos.y));
      miniT -= dt;
      if (miniT <= 0) { ui.drawMinimap(player, dias.key.filter((k) => !k.rig.root.userData.off).map((k) => ({ x: k.pos.x, z: k.pos.z, done: quests.isDone(k.def.objective) })), hints()); miniT = 0.1; }
      let nw = 0; for (const C of Object.values(STREAMS)) { const q = polyDist(C.pts, player.pos.x, player.pos.z); nw = Math.max(nw, Math.max(0, 1 - q.d / (C.hw > 2 ? 40 : 22))); }
      audio.update(dt, { nearWater: nw * 0.7, night: sky.state.night > 0.5, market: 0, sea: 0 });
      audio.windGain && (audio.windGain.gain.value = 0.05 + Math.min(0.12, Math.max(0, player.pos.y - 60) / 500)); // (venta mais no alto dos morros)
    }
    scene.updateMatrixWorld();
    cull.update();
    post.render(dt, sky.state.night, 0);
  }
  loop();
}

main().catch((e) => { console.error(e); ui.fail('Algo deu errado ao carregar Vila Rica: ' + e.message); });
