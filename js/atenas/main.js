// Atenas, 432 a.C. — inicialização e laço principal
import * as THREE from 'three';
const FRAME = { n: 0 };
import { getTextures, setAniso, loadPBR, labelTexture } from './textures.js';
import { createPost } from '../comum/post.js';
import { warmUp } from '../comum/aquecer.js';
import { makeWaterFX } from '../comum/waterfx.js';
import { makeWater } from '../comum/agua.js';
import { makeUnderwater } from '../comum/submerso.js';
import { Artifacts } from './artifacts.js';
import { isTouch, canTouch, setupTouch } from '../comum/touch.js';
import { buildTerrain, buildHorizon, terrainHeight, coastC, WATER_Y, BOUNDS, AGORA } from './terrain.js';
import { buildCity } from './buildings.js';
import { buildVegetation } from './vegetacao.js';
import { placeSculptures, registerSculptures } from '../comum/sculptures.js';
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
import { nextFrame, pick, rr, rand, ver } from '../comum/util.js';
import { groundAt, waterAt, addBox } from '../comum/collision.js';
import { collideModel } from '../comum/pisomodelo.js';
import { HEPH } from './terrain.js';

// modelos do Sketchfab (CC BY / CC0, créditos no menu): o que não existir simplesmente não aparece (ou vira peça feita aqui)
const DIR = 'assets/models/gregos/';
const MODEL_TABLE = {
  partenos: { yaw: -Math.PI / 2, fit: 'y', rough: 0.35, keepMetal: true, env: 1.4 },
  promachos: { rot: [0.17, 0, 0], yaw: Math.PI / 2, fit: 'y', // o escaneamento veio inclinado ~10° (base e corpo): endireitado
    rough: 0.4, tint: [0.6, 0.42, 0.26], metal: 0.85, env: 1.2 },
  frontao: { yaw: Math.PI / 2, fit: 'z', rough: 0.6, tint: [3.4, 3.3, 3.1] }, // fileira de figuras ao longo do frontão, de frente para o leste
  kore: { yaw: Math.PI / 2, fit: 'y', rough: 0.55 }, kouros: { yaw: Math.PI / 2, fit: 'y', rough: 0.55 },
  doryphoros: { yaw: Math.PI / 2, fit: 'y', rough: 0.4, tint: [0.7, 0.5, 0.33], metal: 0.8 },
  zeus_bronze: { yaw: Math.PI / 2, fit: 'y', rough: 0.4, tint: [0.62, 0.46, 0.3], metal: 0.8 },
  discobolo: { yaw: Math.PI / 2, fit: 'y', rough: 0.4, tint: [0.7, 0.5, 0.33], metal: 0.8 },
  trirreme: { yaw: Math.PI, rough: 0.7 }, mercante: { yaw: 0, rough: 0.8 }, barco_remo: { yaw: Math.PI / 2, rough: 0.85 }, barco_pesca: { yaw: -Math.PI / 2, rough: 0.85 }, // proa (esporão/olho, ponta fina) sempre em +x: a trirreme vem de popa para +x e os dois barcos pequenos deitados no eixo z
  leao: { yaw: Math.PI / 2, rough: 0.7 },
  kouros: { yaw: Math.PI / 2, fit: 'y', rough: 0.55 },
  anforas: { fit: 'y', rough: 0.4, keepMetal: true }, anfora_negra: { fit: 'y', rough: 0.35 }, vaso: { fit: 'y', rough: 0.4 },
  oliveira: { fit: 'y', rough: 0.85, layer: 3 }, cipreste: { fit: 'y', rough: 0.85, layer: 3 },
};
const ui = new UI();
const audio = new AudioFX();

// quais modelos existem de fato (uma consulta leve antes de montar a cidade)
async function probeModels() {
  const names = Object.keys(MODEL_TABLE), ok = new Set();
  await Promise.all(names.map(async (n) => { try { const r = await fetch(ver(DIR + n + '.glb'), { method: 'HEAD' }); if (r.ok) ok.add(n); } catch (e) { /* */ } }));
  const table = {}; for (const n of ok) table[n] = MODEL_TABLE[n];
  registerSculptures(DIR, table);
  return ok;
}

async function main() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); } catch (e) { ui.fail(); return; }
  let quality = isTouch ? 'leve' : 'alto';
  renderer.setPixelRatio(isTouch ? Math.min(devicePixelRatio, 1) : Math.min(devicePixelRatio, 1.5));
  if (isTouch) {
    document.querySelector('#intro .controls').innerHTML = '<div><b>Joystick</b> (esquerda): mover</div><div><b>Arrastar</b> (direita): girar a câmera</div><div><b>Pinça</b>: zoom</div><div><b>Pular · Correr</b> (na água: mergulhar)</div><div><b>Falar/Embarcar · Pegar · Usar</b></div><div><b>Clima · Diário · Artefatos · Mapa · Menu</b> (no topo)</div>';
    const qb = document.querySelector('#pause [data-act=quality]'); if (qb) qb.textContent = 'Gráficos: leve';
    document.getElementById('load-tip').textContent = 'No celular, prefira o Wi-Fi: o primeiro acesso baixa bastante coisa. Jogue com o celular deitado.';
  }
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  document.getElementById('game').appendChild(renderer.domElement);
  setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  const scene = new THREE.Scene();
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

  await step(0.03, 'Trazendo mármore do Pentélico e areia do Falero...');
  const pbr = await loadPBR('assets/textures', (f) => ui.progress(0.03 + f * 0.12));
  const tex = getTextures(); tex.pbr = pbr;
  const avail = await probeModels();
  await step(0.15, 'Chamando os atenienses para a ágora...');
  await loadHumanModel(null, tex, (f) => ui.progress(0.15 + f * 0.07));
  await step(0.22, 'Erguendo a Acrópole sobre a rocha...');
  const world = buildTerrain(scene, tex);
  // mar Egeu: transparente no raso (vê-se a areia do fundo, as pedras, o naufrágio e quem nada)
  const water = makeWater({
    width: 7000, height: 7000, x: -150, z: 180, y: WATER_Y, normals: tex.waterNormals, waterColor: 0x0a74a8, shallowColor: 0x48d8cc, tint: 0.32, tintDepth: 16, reflect: 0.45, bright: 0.55,
    clarity: 7, foam: 0.95, farDepth: 30, distortion: 3.0, size: 1.4, box: [-860, -540, 560, 920], res: [640, 660],
    depthAt: (x, z) => WATER_Y - terrainHeight(x, z),
  });
  scene.add(water);
  { const rb = water.onBeforeRender; water.onBeforeRender = function (...a) { if (FRAME.far && FRAME.n % 2) return; rb.apply(this, a); }; }
  const horizon = buildHorizon(scene, tex);
  await step(0.38, 'Construindo a ágora, as stoas e as casas...');
  const city = buildCity(scene, tex, avail);
  await step(0.55, 'Plantando oliveiras e ciprestes...');
  await buildVegetation(scene, tex, city);
  const placed = await placeSculptures(scene, city.sculptures.filter((s) => avail.has(s.model)));
  scatterProps(scene, city);
  const fx = makeWaterFX(scene);
  const boats = new Boats(scene, city, fx, tex.glow);
  // montaria (H): cavalo — a cavalaria (hippeis) e os cavaleiros ricos de Atenas
  const mount = new Mount(scene, 'cavalo', { toast: (m) => ui.toast(m) });
  const health = new Health({ onDeath: () => onDeath(), onHurt: () => player.hurt() });
  const sea = await buildSea(scene, tex, { onSting: () => { health.damage(12); ui.toast('Ai! Uma água-viva — queima como fogo. Cuidado com elas.'); } });

  await step(0.68, 'Reunindo o povo de Atenas...');
  const actors = new Actors(scene, city);
  actors.camera = camera;
  actors.spawnKeyNPCs(); actors.spawnAmbient(); actors.spawnAnimals();
  const items = new Items(scene, tex.glow);
  spawnItems(items, city);

  await step(0.82, 'Preparando o explorador...');
  const player = new Player(scene, camera);
  player.bounds = BOUNDS;
  player.makeTorch(tex.glow);
  const start = city.spots.npc_herodoto || city.spots.agora;
  player.place(start.x - 8, start.z + 14, Math.PI * 0.85);
  player.events.swim = (p, f, sp, dt, t) => fx.swim(p, f, sp, dt, t);
  player.events.stopSwim = () => fx.stopSwim();
  player.events.handIn = (p, f, pw) => fx.handIn(p, f, pw);
  player.events.handOut = (p) => fx.handOut(p);
  player.events.kick = (p, f) => fx.kick(p, f);
  player.events.drip = (p) => fx.drip(p);
  player.events.ripple = (p, s) => fx.ripple(p, s);
  player.events.splash = (p, s = 1) => { fx.splash(p, s); audio.splash(); };
  player.events.step = (jump, run) => audio.step(jump, run);

  await step(0.9, 'Acendendo as lamparinas de azeite...');
  const sky = new TimeOfDay({ scene, renderer, sunLight: sun, hemi, water, materials: city.M, torches: city.torches, glowTex: tex.glow, lightsDef: city.lights });
  sky.horizon = horizon; sky.apply(sky.state);
  sky.bakeEnvironments();
  const quests = new Quests(scene, city, tex.glow, ui, audio);
  const artifacts = new Artifacts(scene, city, ui, audio, () => quests.complete('artefatos'));
  artifacts.onFound = (def) => { if (def.id === 'naufragio') quests.complete('naufragio'); };
  quests.artifactCount = artifacts.count;
  for (const h of city.visitHouses) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(h.name, 'Pode entrar'), transparent: true, depthWrite: false }));
    sp.scale.set(3.2, 0.8, 1); sp.position.copy(h.door).add(new THREE.Vector3(0, 3.9, 0)); sp.layers.set(1); scene.add(sp); h.sign = sp;
  }
  const seenHouses = new Set();

  await step(0.96, 'Desenhando o mapa da Ática...');
  const S = city.spots;
  ui.buildMapBackground([
    ['Acrópole', 0, -2], ['Parthenon', 22, 30], ['Ágora', AGORA.x, AGORA.z], ['Hefesteion', -392, -230], ['Pnyx', -340, 70], ['Areópago', -152, -116],
    ['Teatro de Dioniso', 22, 150], ['Odeon', 102, 150], ['Cerâmico', -425, -350], ['Dípilon', -480, -405], ['Porto', S.quay.x, S.quay.z + 30], ['Praia do Falero', S.fisher.x + 60, S.fisher.z + 40],
    ['Longas Muralhas', -420, 250], ['Golfo Sarônico', -150, 760], ['Psitália', -622, 452], ['Salamina', -738, 640],
  ]);
  ui.renderObjectives(quests);
  ui.setTime('Tarde');
  const post = await createPost(renderer, scene, camera);
  const underwater = makeUnderwater(scene, water, { color: 0x2a9fb4, near: 0.5, far: 48 });
  post.grade.uniforms.uUnderCol.value.setRGB(0.16, 0.62, 0.72);
  if (isTouch) { post.setQuality('leve'); sun.shadow.mapSize.set(2048, 2048); const s2 = sun.shadow.camera; s2.left = -70; s2.right = 70; s2.top = 70; s2.bottom = -70; s2.updateProjectionMatrix(); }
  camera.layers.enable(3); sun.shadow.camera.layers.enable(3);
  scene.traverse((o) => { if ((o.isInstancedMesh && (o.material.alphaTest > 0 || o.count > 300) && o.count !== undefined) || o === sky.clouds) o.layers.set(3); });
  scene.traverse((o) => {
    if (o.isMesh && o.material && o.material.isMeshStandardMaterial && o.material.metalness < 0.5 && !o.material.userData.keepEnv) o.material.envMapIntensity = 0.55;
    if ((o.isSprite && o !== sky.moon && o !== sky.moonGlow) || (o.isMesh && o.material && o.material.transparent && !o.isSkinnedMesh && o.material.depthWrite === false)) o.layers.set(1);
  });
  water.layers.set(1);
  warmUp(renderer, scene, camera, () => post.render(0.016, 0, 0)); // compila e sobe tudo agora (inclusive o que só aparece à noite): nada trava depois
  await step(1, 'Pronto!');
  ui.doneLoading();

  // ---------------- estado de jogo ----------------
  let started = false, paused = false, mapOpen = false, ended = quests.isDone('pericles');
  const seenItems = new Set();
  ui.showIntro(() => {
    started = true; health.show(true); health.render();
    if (isTouch) { setupTouch(player); ui.toggleJournal(); }
    else if (canTouch) addEventListener('touchstart', () => setupTouch(player), { once: true, passive: true });
    audio.start();
    if (quests.done.size === 0) ui.toast('Fale com Heródoto, o viajante, junto ao Altar dos Doze Deuses, logo à frente.', 'quest', 6500);
  });

  // ---------------- conversas ----------------
  const conversation = (k) => {
    const def = k.def;
    if (def.id === 'pericles' && !quests.finalUnlocked()) return quickLine(k, def.name, def.title, `${def.locked} (${quests.count()}/10 objetivos)`);
    k.talking = true; player.locked = true;
    k.read = k.read || new Set();
    ui.openDialog(def);
    audio.talk();
    const close = () => {
      ui.closeDialog(); k.talking = false; player.locked = false;
      if (def.id === 'pericles' && k.read.size > 0) { quests.complete('pericles'); if (!ended) { ended = true; setTimeout(showEnding, 900); } }
    };
    const bye = () => ui.say(def.bye, [{ label: '(Despedir-se)', cb: close }]);
    const topic = (i, page) => {
      const tp = def.topics[i];
      k.read.add(i);
      if (def.objective && def.objective !== 'pericles') quests.complete(def.objective);
      const last = page >= tp.a.length - 1;
      ui.say(tp.a[page], [{ label: last ? 'Voltar às perguntas' : 'Continuar...', cb: () => (last ? menu(false) : topic(i, page + 1)) }]);
    };
    const menu = (first) => {
      const opts = def.topics.map((tp, i) => ({ label: tp.q, read: k.read.has(i), cb: () => topic(i, 0) }));
      if (def.id === 'aspasia' && player.holding?.type === 'kylix' && !quests.isDone('kylix')) {
        opts.unshift({ label: 'Entregar a kylix de Cálias', special: true, cb: () => {
          items.remove(player.holding); player.holding = null; ui.setHand(null);
          quests.complete('kylix');
          ui.say('Que beleza! Olhe o fundo: um rapaz tocando aulos. Cálias se superou. Hoje à noite ela vai passar de mão em mão no simpósio — e vou dizer a todos que foi um viajante do futuro quem a trouxe.', [{ label: 'Voltar às perguntas', cb: () => menu(false) }]);
        } });
      }
      if (def.id === 'glauco' || def.id === 'formiao') opts.push({ label: def.id === 'glauco' ? 'Onde está o seu barco?' : 'Posso subir na Páralos?', cb: () => ui.say(def.id === 'glauco' ? 'Logo ali, na água rasa. Chegue perto dele e aperte E para embarcar; seta para cima rema, para baixo dá ré, e as laterais viram o leme. E de novo para descer.' : 'Pode! Chegue perto do casco, aqui no cais, e aperte E. Com as setas você leva a Páralos pela baía — os 170 remadores obedecem. E para descer quando quiser.', [{ label: 'Voltar às perguntas', cb: () => menu(false) }]) });
      opts.push({ label: 'Até logo.', cb: bye });
      let text = first ? def.greet : pick(['O que mais você quer saber?', 'Pergunte, estrangeiro.', 'Mais alguma curiosidade?']);
      if (first && def.id === 'mirrina' && player.holding?.food) text = 'Já comendo, é? Então prove também os meus figos! ' + text;
      if (first && def.id === 'demon' && player.holding?.type === 'lanca') text = 'Ei, essa lança é da guarda! ...Tudo bem, segure com cuidado. ' + text;
      ui.say(text, opts);
    };
    menu(true);
  };
  const quickLine = (o, name, title, text) => {
    o.talking = true; player.locked = true;
    ui.openDialog({ name, title });
    audio.talk();
    ui.say(text, [{ label: '(Seguir caminho)', cb: () => { ui.closeDialog(); o.talking = false; player.locked = false; } }]);
  };
  const NAMES = { villager: ['Ateniense', 'Ateniense'], soldier: ['Hoplita'], worker: ['Trabalhador'], sailor: ['Marinheiro'], child: ['Criança'] };
  const talkTo = (target) => {
    const o = target.o;
    if (target.type === 'npc') return conversation(o);
    const title = NAMES[target.type] ? NAMES[target.type][0] : 'Ateniense';
    quickLine(o, title, '', pick(o.lines || ['...']));
  };

  // ---------------- barcos ----------------
  const boardOrLeave = () => {
    if (boats.riding) {
      boats.leave(player, S.quay); ui.toast('Você desembarcou.'); return true;
    }
    const b = boats.nearestBoardable(player.pos);
    if (!b) return false;
    boats.board(player, b);
    if (b.model === 'trirreme') { quests.complete('trirreme'); ui.toast('A bordo da Páralos! ↑ remar · ↓ ré · ← → leme · E: descer', 'quest', 6000); audio.aulos(); }
    else { quests.complete('barco'); ui.toast('↑ remar · ↓ frear e ré · ← → leme · mouse: olhar em volta · E: descer', '', 5000); }
    return true;
  };

  // ---------------- itens ----------------
  const pickOrDrop = () => {
    if (boats.riding) return;
    const near = items.nearest(player.pos);
    if (player.holding && !near) {
      const it = player.holding, f = player.frontPoint(0.8);
      const wl = waterAt(f.x, f.z), g = groundAt(f.x, f.z, player.pos.y + 0.3);
      if (wl > g) { ui.toast('Melhor não deixar isso cair no mar!'); return; }
      items.drop(it, f.x, g, f.z, player.facing);
      player.holding = null; ui.setHand(null); audio.drop();
      return;
    }
    if (!near) return;
    if (player.swimming) { ui.toast('Saia da água para pegar objetos.'); return; }
    if (player.holding) { const it = player.holding; items.drop(it, player.pos.x, player.pos.y, player.pos.z, player.facing); }
    items.attach(near, player.rig.armR.hand);
    player.holding = near; ui.setHand(near); audio.pickup(); player.pickT = 1;
    if (!seenItems.has(near.type)) { seenItems.add(near.type); ui.itemCard(near); }
  };
  const useItem = () => {
    const it = player.holding; if (!it) return;
    if (it.food) {
      items.remove(it); player.holding = null; ui.setHand(null); audio.pickup();
      const healed = health.eat(it.type); player.drink();
      ui.toast(it.eat + (healed ? ` (+${healed} de vida)` : ''));
      // a barraca repõe a comida depois de um tempo
      const h = it.home; if (h) setTimeout(() => items.spawn(it.type, h.x, h.y, h.z, rand() * 6), 90000);
      if (it.type === 'figos') quests.complete('mirrina');
      return;
    }
    switch (it.type) {
      case 'lanca': player.swingT = 0.45; audio.swoosh(); break;
      case 'lira': audio.lyre(); ui.toast('Você dedilha as sete cordas da lira. Apolo aprovaria!'); break;
      case 'aulos': audio.aulos(); ui.toast('O som agudo do aulos ecoa — é assim que se marca o ritmo dos remadores.'); break;
      case 'flores': ui.toast('Você põe a guirlanda na cabeça, como num simpósio.'); break;
      default: ui.itemCard(it);
    }
  };

  // ---------------- teclado ----------------
  addEventListener('keydown', (e) => {
    if (!started || e.repeat) return;
    if (!ui.dialogOpen && !paused && artifacts.key(e)) return;
    if (e.code === 'Escape') { if (mapOpen) { mapOpen = ui.toggleBigMap(player, hints()); return; } togglePause(); return; }
    if (paused || ui.dialogOpen) return;
    switch (e.code) {
      case 'KeyE': { if (boats.riding) { boardOrLeave(); break; } const t = actors.nearestInteractable(player.pos); if (t) talkTo(t); else boardOrLeave(); break; }
      case 'KeyP': pickOrDrop(); break;
      case 'KeyR': useItem(); break;
      case 'KeyC': { const p = sky.next(); ui.setTime(p.label); ui.toast(p.msg); break; }
      case 'KeyJ': ui.toggleJournal(); break;
      case 'KeyH': if (!boats.riding) mount.key(player); break;
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
      quality = quality === 'alto' ? 'leve' : 'alto';
      renderer.setPixelRatio(quality === 'alto' ? Math.min(devicePixelRatio, 1.5) : Math.min(devicePixelRatio, 1) * 0.8);
      sun.shadow.mapSize.set(quality === 'alto' ? 4096 : 2048, quality === 'alto' ? 4096 : 2048);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      post.setQuality(quality);
      prMax = renderer.getPixelRatio(); prMin = Math.max(0.6, prMax * 0.7);
      e.target.textContent = `Gráficos: ${quality}`;
    }
    if (act === 'reset') { if (confirm('Apagar o progresso e recomeçar a jornada?')) { quests.reset(); location.reload(); } }
  });

  function showEnding() {
    const n = quests.done.size;
    document.getElementById('end-text').textContent =
      `Péricles ouviu você na Pnyx, diante de milhares de cidadãos. Você caminhou pela Atenas do Parthenon recém-terminado, conversou com filósofos, artistas, sacerdotisas, soldados e pescadores, e concluiu ${n} de ${OBJECTIVES.length} objetivos, encontrando ${quests.scarabsFound.size} de 5 corujas de prata. ` +
      'A cidade continua aberta para você — e novas cidades históricas estão a caminho.';
    document.getElementById('ending').hidden = false;
    audio.chime();
  }
  document.getElementById('btn-continue').onclick = () => (document.getElementById('ending').hidden = true);
  const hints = () => {
    const h = [];
    // reta final dos artefatos: os que faltam (até 5) aparecem no mapa e no minimapa, os mais perto primeiro
    if (!quests.isDone('artefatos')) {
      const left = artifacts.items.filter((a) => a.g.visible);
      if (left.length <= 5) {
        const p = player.pos, d = (a) => (a.g.position.x - p.x) ** 2 + (a.g.position.z - p.z) ** 2;
        for (const a of left.sort((u, v) => d(u) - d(v)).slice(0, 2)) h.push([a.g.position.x, a.g.position.z]);
      }
    }
    for (const o of OBJECTIVES) {
      if (quests.isDone(o.id)) continue;
      if (o.id === 'pericles' && !quests.finalUnlocked()) continue;
      const hh = quests.hintFor(o); if (hh) h.push(hh);
      if (h.length >= 3) break;
    }
    return h;
  };

  // ---------------- nome do lugar ----------------
  const Z = city.zones;
  const placeName = () => {
    const p = player.pos, x = p.x, z = p.z;
    const inR = (a) => a && x > a[0] && x < a[1] && z > a[2] && z < a[3];
    if (boats.riding) return boats.riding.model === 'trirreme' ? 'A bordo da trirreme Páralos' : 'De barco na baía do Falero';
    if (inR(Z.psitalia) && !player.swimming) return 'Ilha de Psitália';
    if (inR(Z.salamina) && !player.swimming) return 'Salamina — cabo de Cinosura';
    if (player.diving) return 'Fundo da baía do Falero';
    if (player.swimming) return coastC(x, z) > 200 ? 'Golfo Sarônico' : 'Baía do Falero';
    for (const h of city.visitHouses) if (inR(h.rect)) return h.name;
    if (inR(Z.cella)) return 'Parthenon — sala da deusa';
    if (inR(Z.parthenon)) return 'Parthenon';
    if (inR(Z.propileus)) return 'Propileus';
    if (inR(Z.acropole) && p.y > 45) return 'Acrópole';
    if (inR(Z.teatro)) return 'Teatro de Dioniso';
    if (inR(Z.odeon)) return 'Odeon de Péricles';
    if (inR(Z.hefesteion)) return 'Hefesteion';
    if (inR(Z.mercado)) return 'Ágora — mercado';
    if (inR(Z.agora)) return 'Ágora';
    if (inR(Z.pnyx)) return 'Pnyx';
    if (inR(Z.ceramico)) return 'Cerâmico — bairro dos oleiros';
    if (inR(Z.cemiterio)) return 'Cemitério do Cerâmico';
    if (inR(Z.porto)) return 'Porto';
    if (inR(Z.praia)) return 'Praia do Falero';
    if (Math.hypot(x + 152, z + 96) < 50) return 'Areópago';
    if (Math.hypot(x + 175, z - 185) < 70) return 'Colina das Musas';
    if (coastC(x, z) > -80) return 'Litoral da Ática';
    return 'Atenas';
  };

  // ---------------- vida ----------------
  const onDeath = () => {
    player.locked = true; player.collapse(); boats.riding && boats.leave(player, S.quay);
    faint('Você desmaiou... e acordou de volta na ágora, com a cabeça doendo.', () => {
      player.diving = false; player.swimming = false; player.breath = 60;
      player.place(start.x - 8, start.z + 14, Math.PI * 0.85); health.revive(70); player.rig.once = null; player.locked = false;
    });
  };
  let siteSeen = false, urchinCd = 0;
  const lifeUpdate = (dt) => {
    health.update(dt, player);
    // ouriço: pisar descalço dói
    urchinCd -= dt;
    if (urchinCd <= 0 && player.wading && !player.swimming) {
      for (const u of sea.urchins) if ((u.x - player.pos.x) ** 2 + (u.z - player.pos.z) ** 2 < 0.4 * 0.4) { urchinCd = 1.5; health.damage(6); ui.toast('Ai! Pisou num ouriço-do-mar.'); break; }
    }
    if (!siteSeen && sea.site && player.diving && (player.pos.x - sea.site.x) ** 2 + (player.pos.z - sea.site.z) ** 2 < 14 * 14) {
      siteSeen = true;
      artifacts.showInfo({ tag: 'Naufrágio', name: 'A carga de colunas', era: 'Baía do Falero', story: 'Tambores de coluna e capitéis de mármore espalhados no fundo, entre ânforas e as costelas de um casco apodrecido. Um navio de carga afundou aqui levando as peças desmontadas de um templo — as colunas viajavam assim, em tambores, e eram montadas no lugar. Naufrágios com cargas de mármore foram encontrados em vários pontos do Mediterrâneo.', foot: 'Volte à tona antes que o fôlego acabe.' });
    }
  };

  window.__game = { mount, player, quests, sky, actors, items, post, renderer, scene, camera, artifacts, boats, city, health, sea, tp: (x, z, f) => player.place(x, z, f) };

  // ---------------- laço ----------------
  const clock = new THREE.Clock();
  let t = 0, miniT = 0;
  const keyNpcDots = () => actors.key.map((k) => ({ x: k.pos.x, z: k.pos.z, done: quests.isDone(k.def.objective) }));
  let prMax = renderer.getPixelRatio(), prMin = Math.max(0.75, prMax * 0.7);
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
  function loop() {
    requestAnimationFrame(loop);
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    renderer.shadowMap.needsUpdate = true;
    FRAME.n++;
    FRAME.far = coastC(player.pos.x, player.pos.z) < -260;
    adaptRes(raw);
    if (paused) { scene.updateMatrixWorld(); post.render(dt, sky.state.night, underwater.amount); return; }
    t += dt;
    player.night = sky.state.night;
    boats.night = sky.state.night;
    boats.update(dt, t, player);
    if (boats.riding) { /* o barco já posicionou o explorador */ }
    else if (mount.state === 'riding') mount.update(dt, t, player);
    else { if (started && !mapOpen && !artifacts.open) player.update(dt, t); else player.updateCamera(dt); mount.update(dt, t, player); }
    if (started) {
      for (const h of city.visitHouses) {
        const r = h.rect, pp = player.pos;
        h.sign.visible = (pp.x - h.door.x) ** 2 + (pp.z - h.door.z) ** 2 < 40 * 40;
        if (!seenHouses.has(h.name) && pp.x > r[0] + 0.6 && pp.x < r[1] - 0.6 && pp.z > r[2] + 0.6 && pp.z < r[3] - 0.6 && pp.y < h.y + 2) {
          seenHouses.add(h.name);
          artifacts.showInfo({ tag: h.tag, name: h.name, era: 'Atenas, 432 a.C.', story: h.text, foot: 'Explore os cômodos em volta do pátio.' });
        }
      }
      artifacts.update(dt, t, player);
      if (quests.artifactCount !== artifacts.count) { quests.artifactCount = artifacts.count; ui.renderObjectives(quests); }
    }
    actors.update(dt, t, player, quests, sky.state.night);
    sea.update(dt, t, player);
    if (started) lifeUpdate(dt);
    items.update(t, player.pos);
    quests.update(dt, t, player);
    sky.update(dt, t, player.pos);
    water.material.uniforms.time.value += dt * 0.6;
    { const u = water.material.uniforms.uSwim.value; u.set(player.pos.x, 0, player.pos.z, player.swimming ? Math.min(1, u.w + dt * 2) : Math.max(0, u.w - dt * 2)); }
    world.mat.userData.U.uTime.value = t;
    fx.update(dt);
    if (started) {
      const tgt = !ui.dialogOpen && !boats.riding && actors.nearestInteractable(player.pos);
      const it = !ui.dialogOpen && !player.swimming && !boats.riding && items.nearest(player.pos);
      const bt = !ui.dialogOpen && !tgt && !boats.riding && boats.nearestBoardable(player.pos);
      const parts = [];
      if (tgt) {
        const nm = tgt.type === 'npc' ? tgt.o.def.name : tgt.type === 'soldier' ? 'o hoplita' : tgt.type === 'child' ? 'a criança' : tgt.type === 'sailor' ? 'o marinheiro' : 'o ateniense';
        parts.push(`<kbd>E</kbd> Falar com ${nm}`);
      }
      if (bt) parts.push(`<kbd>E</kbd> Embarcar ${bt.model === 'trirreme' ? 'na trirreme ' + (bt.name || '') : 'no ' + (bt.name || 'barco')}`);
      if (boats.riding) parts.push('<kbd>↑</kbd> Remar · <kbd>↓</kbd> Ré · <kbd>←→</kbd> Leme · <kbd>E</kbd> Descer');
      if (it) parts.push(`<kbd>P</kbd> Pegar ${it.name}`);
      if (mount.state === 'riding') parts.push('<kbd>Shift</kbd> Galopar · <kbd>H</kbd> Desmontar');
      else if (mount.state !== 'none' && mount.pos.distanceTo(player.pos) < 3.2) parts.push('<kbd>H</kbd> Montar no cavalo');
      ui.prompt(parts.join(' &nbsp;·&nbsp; '));
      ui.setPlace(placeName());
      miniT -= dt;
      if (miniT <= 0) { ui.drawMinimap(player, keyNpcDots(), hints()); miniT = 0.1; }
      const cc = coastC(player.pos.x, player.pos.z), m = Z.mercado;
      const dm = Math.max(0, Math.max(m[0] - player.pos.x, player.pos.x - m[1], m[2] - player.pos.z, player.pos.z - m[3]));
      audio.update(dt, { nearWater: 0, night: sky.state.night > 0.5, market: Math.max(0, 1 - dm / 30), sea: Math.max(0, Math.min(1, 1 - -cc / 90)) });
    }
    const under = underwater.update(dt, camera, player);
    scene.updateMatrixWorld();
    post.render(dt, sky.state.night, under);
  }
  loop();
}

// ---------------------------------------------------------------------------
// Hefesteion modelado: piso, colunas e paredes tirados da forma do modelo; os degraus do crepidoma são altos demais
// para andar (como nos templos de verdade), então na frente leste há uma escada de degraus baixos até o estilobata
async function templeCollision(scene, city, placed) {
  const h = placed.find((p) => p.s.model === 'hefesteion');
  if (!h) return;
  try {
    const base = HEPH.y + 0.2;
    const col = await collideModel(h.holder, { y0: HEPH.y, cell: 0.5, scanH: 3.4 });
    const b = col.box, front = b.max.x;
    // altura do estilobata: o piso logo depois da primeira fila de colunas, no meio da fachada
    let top = NaN;
    for (let d = 2; d < 6 && Number.isNaN(top); d += 0.5) { const f = col.floorAt(front - d, HEPH.z); if (f > base + 0.3) top = f; }
    if (Number.isNaN(top)) top = base + 1.6;
    const n = Math.max(3, Math.ceil((top - base) / 0.2)), rise = (top - base) / n, run = 0.38, W = 5;
    const mat = new THREE.MeshStandardMaterial({ map: getTextures().plainMarble, color: 0xfff6ea, roughness: 0.55 });
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const x = front - 0.2 + (n - i) * run - run / 2, y = base + rise * (i + 1);
      const m = new THREE.Mesh(new THREE.BoxGeometry(run + 0.02, y - base + 0.05, W), mat);
      m.position.set(x, base + (y - base) / 2 - 0.025, HEPH.z); m.castShadow = true; m.receiveShadow = true; g.add(m);
      addBox(x, HEPH.z, run, W, base - 1, y);
    }
    // a última faixa entra um pouco no estilobata (sem degrau entre a escada e o piso do templo)
    addBox(front - 0.6, HEPH.z, 1.2, W, base - 1, top);
    scene.add(g);
    console.info('Hefesteion: colisão com', col.boxes, 'caixas; estilobata a', (top - base).toFixed(2), 'm');
  } catch (e) { console.warn('colisão do Hefesteion', e); }
}

function spawnItems(items, city) {
  const S = city.spots;
  for (const s of city.stalls) {
    const list = { figos: ['figos', 'figos'], azeitonas: ['azeitonas', 'queijo'], peixe: ['peixe', 'peixe'], pao: ['pao', 'pao'], vinho: ['vinho'], ceramica: ['ceramica'], azeite: ['azeite', 'azeite'], queijo: ['queijo'], flores: ['flores'], sandalias: ['sandalias'] }[s.type];
    if (!list) continue;
    list.forEach((type, i) => items.spawn(type, s.x - 0.6 + i * 1.0 + rr(-0.1, 0.1), s.y + 0.02, s.z, rand() * 6));
  }
  const at = (v, dx = 0, dz = 0) => [v.x + dx, groundAt(v.x + dx, v.z + dz, v.y + 1.5), v.z + dz];
  if (S.potter) items.spawn('kylix', ...at(S.potter, 1.2, 2.9));
  if (S.dipylon) items.spawn('lanca', ...at(S.dipylon, 9, 10), Math.PI / 2);
  if (S.odeon) items.spawn('lira', ...at(S.odeon, 2, -4));
  if (S.skene) items.spawn('aulos', ...at(S.skene, 3, 1));
  if (S.casa_pericles) items.spawn('vinho', ...at(S.casa_pericles, 3, 3));
  if (S.fountain) items.spawn('azeite', ...at(S.fountain, -3, -1));
  if (S.cemetery) items.spawn('estrigil', ...at(S.cemetery, 8, 8));
}

// objetos espalhados: ânforas (porto e naufrágio), vasos secando no Cerâmico e redes dos pescadores
function scatterProps(scene, city) {
  const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(new THREE.Vector2(u < 0.08 ? u * 1.2 : 0.06 + Math.sin(u * Math.PI * 0.95) * 0.17 - (u > 0.85 ? 0.08 : 0), u * 0.75)); }
  const amph = new THREE.LatheGeometry(pts, 12);
  const clay = new THREE.MeshStandardMaterial({ color: 0xb4623a, roughness: 0.85 });
  const place = (list, rot) => {
    if (!list || !list.length) return;
    const im = new THREE.InstancedMesh(amph, clay, list.length), d = new THREE.Object3D();
    list.forEach((p, i) => { d.position.set(p.x, p.y, p.z); d.rotation.set(rot ? p.rx || 0 : 0, p.ry || rand() * 6, 0); d.scale.setScalar(rr(0.9, 1.15)); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im);
  };
  place(city.amphorae); place(city.pots); place(city.wreckAmphorae, true);
  // redes de pesca estendidas
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.strokeStyle = 'rgba(90,70,45,0.95)'; x.lineWidth = 2; for (let i = 0; i <= 128; i += 10) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 8, 128); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(128, i + 6); x.stroke(); }
  const nt = new THREE.CanvasTexture(c); nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(3, 2);
  const nm = new THREE.MeshStandardMaterial({ map: nt, alphaTest: 0.3, transparent: false, side: THREE.DoubleSide, roughness: 1 });
  for (const n of city.nets || []) { const g = new THREE.PlaneGeometry(4, 1.6, 8, 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 0.8) * 0.15 - Math.abs(p.getX(i)) * 0.0); const m = new THREE.Mesh(g, nm); m.position.set(n.x, n.y, n.z); m.rotation.y = n.ry; m.castShadow = true; scene.add(m); }
}

main().catch((e) => { console.error(e); ui.fail('Algo deu errado ao carregar Atenas: ' + e.message); });
