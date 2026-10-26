// Mênfis, c. 1250 a.C. — inicialização e laço principal
import * as THREE from 'three';
const FRAME = { n: 0 };
import { getTextures, setAniso, loadPBR, buildPhotoComposites, labelTexture } from './textures.js';
import { createPost } from '../comum/post.js';
import { warmUp } from '../comum/aquecer.js';
import { makeWaterFX } from '../comum/waterfx.js';
import { makeUnderwater } from '../comum/submerso.js';
import { Artifacts } from './artifacts.js';
import { isTouch, canTouch, setupTouch } from '../comum/touch.js';
import { buildTerrain, buildVegetation, buildHorizon, riverX, LAKE, terrainHeight, WORLD } from './terrain.js';
import { buildCity } from './buildings.js';
import { setCharTextures } from './characters.js';
import { placeSculptures, sculptureInstance, registerSculptures } from '../comum/sculptures.js';
// esculturas e barcos modelados (Sketchfab, CC BY): ver sculptures.js
registerSculptures('assets/models/estatuas/', {
  esfinge_giza: { yaw: Math.PI / 2, rough: 0.88 },
  esfinge_avenida: { rot: [Math.PI, 0, Math.PI], yaw: Math.PI / 2, layer: 3 },
  // fit 'y': o tamanho pedido é a altura (estátuas em pé)
  anubis: { yaw: Math.PI / 2, rough: 0.45, fit: 'y', tint: [2.4, 2.25, 2.1], env: 1.2 }, // textura muito escura: clareia (granito preto, mas com o entalhe visível)
  barco: { yaw: Math.PI / 2, rough: 0.85 }, // barquinho de papiro com toldo
  trono: { yaw: Math.PI / 2, rough: 0.4, fit: 'y', keepMetal: true },
  navio: { yaw: Math.PI / 2 },
  navio2: { yaw: 0 },
  anubis_deitado: { rot: [Math.PI / 2, 0, 0], yaw: Math.PI, rough: 0.6, tint: [1.5, 1.45, 1.4] },
});
import { loadHumanModel, makeHumanoid, animateHumanoid, playOnce, makeStatue } from '../comum/mixamo.js';
import { Actors } from './npcs.js';
import { Player } from '../comum/player.js';
import { Quests, OBJECTIVES } from './quests.js';
import { TimeOfDay } from './sky.js';
import { Items } from './items.js';
import { UI } from './ui.js';
import { AudioFX } from './audio.js';
import { GUARD_LINES } from './dialogues.js';
import { buildNile } from './nilo.js';
import { Health, faint } from '../comum/vida.js';
import { nextFrame, pick, rr, rand } from '../comum/util.js';
import { groundAt, waterAt } from '../comum/collision.js';

const ui = new UI();
const audio = new AudioFX();

async function main() {
  // ---------------- renderizador ----------------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) { ui.fail(); return; }
  // no celular: qualidade leve automática (a placa de vídeo é bem mais fraca)
  let quality = isTouch ? 'leve' : 'alto';
  renderer.setPixelRatio(isTouch ? Math.min(devicePixelRatio, 1) : Math.min(devicePixelRatio, 1.5));
  if (isTouch) {
    document.querySelector('#intro .controls').innerHTML = '<div><b>Joystick</b> (esquerda): mover</div><div><b>Arrastar</b> (direita): girar a câmera</div><div><b>Pinça</b>: zoom</div><div><b>Pular · Correr</b></div><div><b>Falar · Pegar · Usar</b></div><div><b>Clima · Diário · Artefatos · Mapa · Menu</b> (no topo)</div>';
    const qb = document.querySelector('#pause [data-act=quality]'); if (qb) qb.textContent = 'Gráficos: leve';
  }
  if (isTouch) document.getElementById('load-tip').textContent = 'No celular, prefira o Wi-Fi: o primeiro acesso baixa cerca de 45 MB. Jogue com o celular deitado.';
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // a sombra do sol é calculada uma vez por quadro (antes, o reflexo do Nilo e a oclusão refaziam o mapa a cada render)
  renderer.shadowMap.autoUpdate = false;
  document.getElementById('game').appendChild(renderer.domElement);
  setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  const scene = new THREE.Scene();
  // as matrizes da cena são atualizadas uma vez por quadro, no laço (o reflexo do Nilo e a oclusão renderizam a cena
  // de novo e, com a atualização automática, recalculavam ~9 mil objetos a cada passada)
  scene.matrixWorldAutoUpdate = false;
  // o esqueleto de cada personagem também é calculado uma vez por quadro, não em cada passada
  const skelUpdate = THREE.Skeleton.prototype.update;
  THREE.Skeleton.prototype.update = function () { if (this._frame === FRAME.n) return; this._frame = FRAME.n; skelUpdate.call(this); };
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.15, 20000);
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096); // sombras nítidas num raio bem maior
  const sc = sun.shadow.camera; sc.left = -140; sc.right = 140; sc.top = 140; sc.bottom = -140; sc.near = 10; sc.far = 700;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  sun.shadow.camera.layers.enable(2); // personagens projetam sombra
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x9c7a52, 1);
  scene.add(hemi);

  const step = async (f, t) => { ui.progress(f, t); await nextFrame(); await nextFrame(); };

  // ---------------- mundo ----------------
  await step(0.03, 'Trazendo pedras, areia e linho de verdade...');
  let pbr = null;
  try { pbr = await loadPBR('assets/textures', (f) => ui.progress(0.03 + f * 0.12)); }
  catch (e) { console.warn('Texturas fotográficas indisponíveis, usando as procedurais', e); }
  const tex = getTextures(!!pbr);
  tex.pbr = pbr;
  if (pbr) buildPhotoComposites(tex, pbr);
  setCharTextures(tex);
  await step(0.15, 'Despertando o povo de Mênfis...');
  await loadHumanModel('assets/models/humano.glb', tex, (f) => ui.progress(0.15 + f * 0.05));
  await step(0.18, 'Escavando o leito do Nilo...');
  const world = buildTerrain(scene, tex);
  // reflexo do Nilo: com o jogador longe do rio (> 90 m) ele é refeito em quadros alternados — de longe o reflexo é
  // uma faixa fina no horizonte e a diferença não se vê; perto do rio, todo quadro
  { const w = world.water, rb = w.onBeforeRender; w.onBeforeRender = function (...a) { if (FRAME.far && FRAME.n % 2) return; rb.apply(this, a); }; }
  const horizon = buildHorizon(scene, tex);
  await step(0.35, 'Erguendo o templo de Ptah e as pirâmides de Gizé...');
  const city = buildCity(scene, tex);
  if (city.pool) { city.pool.children.forEach((m) => (m.material = world.calmWater)); scene.add(city.pool); }
  await step(0.55, 'Plantando palmeiras, papiros e campos de cevada...');
  buildVegetation(scene, tex, city.exclusions);
  await placeSculptures(scene, city.sculptures);
  for (const st of city.statues) { const o = makeStatue({ h: st.h, painted: st.painted }); o.position.set(st.x, st.y, st.z); o.rotation.y = st.ry; scene.add(o); }
  const flags = makeFlags(scene, city.flags);
  const boats = makeBoats(scene, city);
  const health = new Health({ onDeath: () => onDeath() });
  const nile = await buildNile(scene, city, {
    onWarn: () => ui.toast('Um crocodilo! Saia da água — e fique longe da margem.', 'quest', 5000),
    onBite: () => { health.damage(24); audio.splash(); ui.toast('O crocodilo mordeu! Fuja para longe do rio.'); },
  });

  await step(0.68, 'Chamando o povo de Mênfis...');
  const actors = new Actors(scene, city);
  actors.camera = camera;
  actors.spawnKeyNPCs();
  actors.spawnAmbient();
  actors.spawnAnimals();
  const items = new Items(scene, tex.glow);
  spawnItems(items, city);

  await step(0.8, 'Preparando o explorador...');
  const player = new Player(scene, camera);
  player.bounds = [-WORLD, WORLD, -WORLD, WORLD];
  player.makeTorch(tex.glow);
  player.place(84, 0, -Math.PI / 2);
  const fx = makeWaterFX(scene);
  player.events.swim = (p, f, sp, dt, t) => fx.swim(p, f, sp, dt, t);
  player.events.stopSwim = () => fx.stopSwim();
  player.events.handIn = (p, f, pw) => fx.handIn(p, f, pw);
  player.events.handOut = (p) => fx.handOut(p);
  player.events.kick = (p, f) => fx.kick(p, f);
  player.events.drip = (p) => fx.drip(p);
  player.events.ripple = (p, s) => fx.ripple(p, s);
  player.events.splash = (p, s = 1) => { fx.splash(p, s); audio.splash(); };
  player.events.step = (jump, run) => audio.step(jump, run);

  await step(0.88, 'Acendendo as tochas e afinando as harpas...');
  const sky = new TimeOfDay({ scene, renderer, sunLight: sun, hemi, water: world.water, materials: city.M, torches: city.torches, glowTex: tex.glow, lightsDef: city.lights });
  sky.horizon = horizon; sky.apply(sky.state);
  sky.bakeEnvironments();
  const quests = new Quests(scene, city, city.M.gold, tex.glow, ui, audio);
  if (quests.pharaohUnlocked()) actors.openGate(true);
  quests.listeners.push(() => { if (quests.pharaohUnlocked() && !actors.gateOpen) actors.openGate(true); });
  const artifacts = new Artifacts(scene, city, ui, audio, () => quests.complete('artefatos'));
  quests.artifactCount = artifacts.count;
  // placas sobre as portas das casas visitáveis
  const seenHouses = new Set();
  for (const h of city.visitHouses) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(h.name, 'Pode entrar'), transparent: true, depthWrite: false }));
    sp.scale.set(3.2, 0.8, 1); sp.position.copy(h.door).add(new THREE.Vector3(0, 3.9, 0)); sp.layers.set(1); scene.add(sp); h.sign = sp;
  }

  await step(0.95, 'Desenhando o mapa da cidade...');
  ui.buildMapBackground();
  ui.renderObjectives(quests);
  ui.setTime('Tarde');
  const post = await createPost(renderer, scene, camera);
  // mergulho no Nilo: água barrenta, enxerga-se pouco
  const underwater = makeUnderwater(scene, world.water, { color: 0x2f4a32, near: 0.3, far: 9 });
  post.grade.uniforms.uUnderCol.value.setRGB(0.22, 0.36, 0.2);
  if (isTouch) { post.setQuality('leve'); sun.shadow.mapSize.set(2048, 2048); const sc2 = sun.shadow.camera; sc2.left = -70; sc2.right = 70; sc2.top = 70; sc2.bottom = -70; sc2.updateProjectionMatrix(); }
  // camada 3: aparece na tela e projeta sombra, mas fica fora do reflexo do Nilo e da oclusão (desempenho)
  camera.layers.enable(3); sun.shadow.camera.layers.enable(3);
  scene.traverse((o) => { if ((o.isInstancedMesh && (o.material.alphaTest > 0 || o.material.flatShading || o.count > 300) && o.count !== undefined) || o === sky.clouds) o.layers.set(3); });
  // objetos "flutuantes" fora da oclusão de ambiente; reflexo do céu mais suave nos materiais foscos
  scene.traverse((o) => {
    if (o.isMesh && o.material && o.material.isMeshStandardMaterial && o.material.metalness < 0.5 && !o.material.userData.keepEnv) o.material.envMapIntensity = 0.55;
    if ((o.isSprite && o !== sky.moon && o !== sky.moonGlow) || (o.isMesh && o.material && o.material.transparent && !o.isSkinnedMesh && o.material.depthWrite === false)) o.layers.set(1);
  });
  warmUp(renderer, scene, camera, () => post.render(0.016, 0, 0)); // compila e sobe tudo agora (inclusive o que só aparece à noite): nada trava depois
  await step(1, 'Pronto!');
  ui.doneLoading();

  // ---------------- estado de jogo ----------------
  let started = false, paused = false, mapOpen = false, ended = quests.isDone('farao');
  const seenItems = new Set();

  ui.showIntro(() => {
    started = true; health.show(true); health.render();
    if (isTouch) { setupTouch(player); ui.toggleJournal(); }
    else if (canTouch) addEventListener('touchstart', () => setupTouch(player), { once: true, passive: true });
    audio.start();
    if (quests.done.size === 0) ui.toast('Fale com Nebamun, o escriba, logo à frente na avenida.', 'quest', 6000);
  });

  // ---------------- conversas ----------------
  const conversation = (k) => {
    const def = k.def;
    k.talking = true; player.locked = true;
    k.read = k.read || new Set();
    ui.openDialog(def);
    audio.talk();
    const close = () => {
      ui.closeDialog(); k.talking = false; player.locked = false;
      if (def.id === 'ramses' && k.read.size > 0) {
        quests.complete('farao');
        if (!ended) { ended = true; setTimeout(showEnding, 900); }
      }
    };
    const bye = () => ui.say(def.bye, [{ label: '(Despedir-se)', cb: close }]);
    const topic = (i, page) => {
      const tp = def.topics[i];
      k.read.add(i);
      if (def.objective && def.objective !== 'farao') quests.complete(def.objective);
      const last = page >= tp.a.length - 1;
      ui.say(tp.a[page], [{ label: last ? 'Voltar às perguntas' : 'Continuar...', cb: () => (last ? menu(false) : topic(i, page + 1)) }]);
    };
    const menu = (first) => {
      const opts = def.topics.map((tp, i) => ({ label: tp.q, read: k.read.has(i), cb: () => topic(i, 0) }));
      if (def.id === 'hori' && player.holding?.type === 'cerveja' && !quests.isDone('cerveja')) {
        opts.unshift({
          label: 'Entregar o jarro de cerveja de Merit', special: true, cb: () => {
            items.remove(player.holding); player.holding = null; ui.setHand(null);
            quests.complete('cerveja');
            ui.say('Cerveja da Merit?! Que os deuses o abençoem, viajante! Ei, turma, pausa para a cerveja! ...Sabia que é assim que pagamos os trabalhadores? Pão, cerveja e cebola. Esta você ganhou por conta própria.', [{ label: 'Voltar às perguntas', cb: () => menu(false) }]);
          },
        });
      }
      opts.push({ label: 'Até logo.', cb: bye });
      let text = first ? def.greet : pick(['O que mais você quer saber?', 'Pergunte, viajante.', 'Mais alguma curiosidade?']);
      if (first && def.id === 'ramses' && player.holding?.type === 'khopesh') text = 'Um estrangeiro armado diante do rei?! ...Bem, ao menos é uma bela khopesh. ' + text;
      if (first && def.id === 'merit' && player.holding?.food) text = 'Já está comendo, é? Então prove também o meu pão! ' + text;
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
  const NAMES = { villager: ['Morador de Mênfis', 'Moradora de Mênfis'], soldier: ['Soldado'], worker: ['Operário'], farmer: ['Lavrador'], child: ['Criança'] };
  const talkTo = (target) => {
    const o = target.o;
    if (target.type === 'npc') return conversation(o);
    if (target.type === 'guard') {
      const open = quests.pharaohUnlocked();
      if (open && !actors.gateOpen) actors.openGate(true);
      return quickLine(o, 'Guarda do palácio', 'Sherden da guarda real', open ? GUARD_LINES.open : `${GUARD_LINES.locked} (${quests.count()}/8 objetivos)`);
    }
    const title = NAMES[target.type] ? NAMES[target.type][o.rig && target.type === 'villager' ? (rand() < 0.5 ? 0 : 1) : 0] : 'Morador';
    quickLine(o, title, '', pick(o.lines || ['...']));
  };

  // ---------------- itens ----------------
  const pickOrDrop = () => {
    const near = items.nearest(player.pos);
    if (player.holding && !near) {
      const it = player.holding; const f = player.frontPoint(0.8);
      const wl = waterAt(f.x, f.z), g = groundAt(f.x, f.z, player.pos.y + 0.3);
      if (wl > g) { ui.toast('Melhor não deixar isso cair no rio!'); return; }
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
      const healed = health.eat(it.type);
      ui.toast(it.eat + (healed ? ` (+${healed} de vida)` : ''));
      // a comida volta à banca depois de um tempo
      const h = it.home; if (h) setTimeout(() => items.spawn(it.type, h.x, h.y, h.z, rand() * 6), 90000);
      return;
    }
    switch (it.type) {
      case 'khopesh': case 'lanca': player.swingT = 0.45; audio.swoosh(); break;
      case 'sistro': audio.sistrum(); ui.toast('Tchk-tchk-tchk! O som sagrado do sistro ecoa.'); break;
      case 'lotus': ui.toast('Você sente o perfume doce do lótus azul.'); break;
      default: ui.itemCard(it);
    }
  };

  // ---------------- teclado ----------------
  addEventListener('keydown', (e) => {
    if (!started || e.repeat) return;
    if (!ui.dialogOpen && !paused && artifacts.key(e)) return;
    if (e.code === 'Escape') { if (mapOpen) { mapOpen = ui.toggleBigMap(player, hints(), city.pyramids); return; } togglePause(); return; }
    if (paused || ui.dialogOpen) return;
    switch (e.code) {
      case 'KeyE': { const t = actors.nearestInteractable(player.pos); if (t) talkTo(t); break; }
      case 'KeyP': pickOrDrop(); break;
      case 'KeyR': useItem(); break;
      case 'KeyC': { const p = sky.next(); ui.setTime(p.label); ui.toast(p.msg); break; }
      case 'KeyJ': ui.toggleJournal(); break;
      case 'KeyM': mapOpen = ui.toggleBigMap(player, hints(), city.pyramids); break;
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
      prMax = renderer.getPixelRatio(); prMin = Math.max(0.6, prMax * 0.7); // a resolução adaptativa passa a valer para o novo nível
      e.target.textContent = `Gráficos: ${quality}`;
    }
    if (act === 'reset') { if (confirm('Apagar o progresso e recomeçar a jornada?')) { quests.reset(); location.reload(); } }
  });

  function showEnding() {
    const n = quests.done.size;
    document.getElementById('end-text').textContent =
      `O faraó Ramsés II recebeu você em sua sala do trono. Você caminhou por Mênfis no 30º ano de seu reinado, conversou com escribas, sacerdotes, soldados e lavradores, e concluiu ${n} de ${OBJECTIVES.length} objetivos, encontrando ${quests.scarabsFound.size} de 5 escaravelhos dourados. ` +
      'A cidade continua aberta para você — e novas cidades históricas estão a caminho.';
    document.getElementById('ending').hidden = false;
    audio.chime();
  }
  document.getElementById('btn-continue').onclick = () => (document.getElementById('ending').hidden = true);

  const hints = () => {
    const h = [];
    for (const o of OBJECTIVES) {
      if (quests.isDone(o.id)) continue;
      if ((o.id === 'farao' || o.id === 'isetnofret') && !quests.pharaohUnlocked()) continue;
      const hh = quests.hintFor(o); if (hh) h.push(hh);
      if (h.length >= 3) break;
    }
    return h;
  };

  // ---------------- nome do lugar ----------------
  const placeName = () => {
    const p = player.pos, x = p.x, z = p.z;
    const inR = (a) => x > a[0] && x < a[1] && z > a[2] && z < a[3];
    const dR = x - riverX(z);
    if (player.swimming && Math.abs(dR) < 46) return 'Rio Nilo';
    for (const h of city.visitHouses) if (inR(h.rect)) return h.name;
    if (inR([-84, -66, -9, 9])) return 'Santuário de Ptah';
    if (inR([-67, -41, -21, 21])) return 'Sala Hipostila';
    if (inR([-41, -3, -21, 21])) return 'Pátio do Templo de Ptah';
    if (inR([LAKE.x0 - 2, LAKE.x1 + 2, LAKE.z0 - 2, LAKE.z1 + 2])) return 'Lago Sagrado';
    if (inR([-3, 118, -9, 9])) return 'Avenida das Esfinges';
    if (inR(city.zones.trono)) return 'Sala do Trono';
    if (inR(city.zones.palacio)) return 'Palácio Real';
    if (inR(city.zones.quartel)) return 'Quartel da Divisão de Ptah';
    if (inR(city.zones.mercado)) return 'Mercado';
    if (inR(city.zones.cais)) return 'Cais do Nilo';
    if (dR > 40) return 'Margem Leste — Campos de Tiy';
    if (Math.abs(dR) < 46) return 'Margem do Nilo';
    if (Math.hypot(x + 155, z - 22) < 30) return 'A Grande Esfinge';
    if (x < -175) return 'Planalto de Gizé';
    if (Math.hypot(x - city.spots.nofret.x, z - city.spots.nofret.z) < 14) return 'Praça de Nofret';
    if (z > 25) return 'Bairro Norte';
    if (z < -30) return 'Bairro Sul';
    return 'Mênfis';
  };

  // atalho de depuração (console): __game.tp(x, z)
  const onDeath = () => {
    player.locked = true;
    faint('Você desmaiou... e acordou de volta diante do templo de Ptah.', () => {
      player.diving = false; player.swimming = false; player.breath = 30;
      player.place(84, 0, -Math.PI / 2); health.revive(70); nile.crocs.reset(); player.locked = false;
    });
  };

  window.__game = { player, quests, sky, actors, items, post, renderer, scene, camera, artifacts, health, nile, tp: (x, z, f) => player.place(x, z, f) };

  // ---------------- laço ----------------
  const clock = new THREE.Clock();
  let t = 0, miniT = 0;
  const keyNpcDots = () => actors.key.map((k) => ({ x: k.pos.x, z: k.pos.z, done: quests.isDone(k.def.objective) }));
  // resolução adaptativa: só baixa a resolução interna se o quadro passar de ~24 ms por um tempo (e volta quando sobra
  // folga). Em máquina que aguenta, fica sempre na resolução máxima.
  let prMax = renderer.getPixelRatio(), prMin = Math.max(0.75, prMax * 0.7);
  let frameAvg = 16, adaptT = 0;
  const adaptRes = (raw) => {
    if (document.hidden || raw > 0.25) return; // aba em segundo plano ou travada por outro motivo
    frameAvg += (raw * 1000 - frameAvg) * 0.05;
    adaptT += raw;
    if (adaptT < 2) return;
    adaptT = 0;
    const pr = renderer.getPixelRatio();
    let next = pr;
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
    FRAME.far = Math.abs(player.pos.x - riverX(player.pos.z)) > 90 + 46;
    adaptRes(raw);
    if (paused) { scene.updateMatrixWorld(); post.render(dt, sky.state.night); return; }
    t += dt;
    player.night = sky.state.night;
    if (started && !mapOpen && !artifacts.open) player.update(dt, t); else player.updateCamera(dt);
    if (started) {
      for (const h of city.visitHouses) {
        const r = h.rect, pp = player.pos;
        h.sign.visible = (pp.x - h.door.x) ** 2 + (pp.z - h.door.z) ** 2 < 40 * 40;
        if (!seenHouses.has(h.name) && pp.x > r[0] + 0.6 && pp.x < r[1] - 0.6 && pp.z > r[2] + 0.6 && pp.z < r[3] - 0.6 && pp.y < h.door.y + 2) {
          seenHouses.add(h.name);
          artifacts.showInfo({ tag: h.tag, name: h.name, era: 'Mênfis, Novo Império', story: h.text, foot: 'Explore os cômodos: entrada, sala principal, quarto e cozinha. A escada leva ao terraço.' });
        }
      }
    }
    if (started) { artifacts.update(dt, t, player); if (quests.artifactCount !== artifacts.count) { quests.artifactCount = artifacts.count; ui.renderObjectives(quests); } }
    actors.update(dt, t, player, quests, sky.state.night);
    nile.update(dt, t, player);
    if (started) health.update(dt, player);
    items.update(t, player.pos);
    quests.update(dt, t, player);
    sky.update(dt, t, player.pos);
    world.water.material.uniforms.time.value += dt * 0.6;
    { const u = world.water.material.uniforms.uSwim.value; u.set(player.pos.x, 0, player.pos.z, player.swimming ? Math.min(1, u.w + dt * 2) : Math.max(0, u.w - dt * 2)); }
    fx.update(dt);
    flags.update(t);
    boats.update(dt, t);
    for (const a of city.animated) a.update(t);

    if (started) {
      // dicas de interação
      const tgt = !ui.dialogOpen && actors.nearestInteractable(player.pos);
      const it = !ui.dialogOpen && !player.swimming && items.nearest(player.pos);
      const parts = [];
      if (tgt) {
        const nm = tgt.type === 'npc' ? tgt.o.def.name : tgt.type === 'guard' ? 'o guarda' : tgt.type === 'soldier' ? 'o soldado' : tgt.type === 'child' ? 'a criança' : 'o morador';
        parts.push(`<kbd>E</kbd> Falar com ${nm}`);
      }
      if (it) parts.push(`<kbd>P</kbd> Pegar ${it.name}`);
      ui.prompt(parts.join(' &nbsp;·&nbsp; '));
      ui.setPlace(placeName());
      miniT -= dt;
      if (miniT <= 0) { ui.drawMinimap(player, keyNpcDots(), hints(), city.pyramids); miniT = 0.1; }
      const dR = Math.abs(player.pos.x - riverX(player.pos.z));
      const m = city.zones.mercado;
      const dm = Math.max(0, Math.max(m[0] - player.pos.x, player.pos.x - m[1], m[2] - player.pos.z, player.pos.z - m[3]));
      audio.update(dt, { nearWater: Math.max(0, Math.min(1, 1 - (dR - 36) / 40)), night: sky.state.night > 0.5, market: Math.max(0, 1 - dm / 30) });
    }
    const under = underwater.update(dt, camera, player);
    scene.updateMatrixWorld(); // uma vez por quadro (a cena não se atualiza sozinha a cada render; ver acima)
    post.render(dt, sky.state.night, under);
  }
  loop();
}

// ---------------------------------------------------------------------------
function spawnItems(items, city) {
  const map = { bread: 'pao', fruit: ['figo', 'roma', 'tamaras'], fish: 'peixe', onion: 'cebola', pottery: 'agua', beer: 'cerveja' };
  for (const s of city.stalls) {
    let tp = map[s.type];
    if (!tp) continue;
    const list = Array.isArray(tp) ? tp : [tp];
    list.forEach((type, i) => items.spawn(type, s.x - 0.9 + i * 0.9 + rr(-0.1, 0.1), s.y + 0.9, s.z - 0.15, rand() * 6));
  }
  // banca de Merit: cerveja garantida
  items.spawn('cerveja', 59.0, terrainHeight(59, 50) + 0.9, 49.85);
  items.spawn('cerveja', 61.0, terrainHeight(61, 50) + 0.9, 49.85);
  const Q = city.spots.quartel;
  items.spawn('khopesh', Q.x + 1.2, 1.95, Q.z - 8.5, 0);
  items.spawn('khopesh', Q.x + 2.8, 1.95, Q.z - 8.5, 0);
  items.spawn('lanca', Q.x + 5.2, groundAt(Q.x + 5.2, Q.z - 7.6, 2.5), Q.z - 7.6, Math.PI / 2);
  items.spawn('lotus', -22.7, 1.2 + 1.1, -0.45, 0);
  items.spawn('sistro', -21.4, 1.2 + 1.1, 0.5, 0);
  items.spawn('papiro', 66.2, 1.15, 5.4, 0.3);
  const N = city.spots.nofret;
  items.spawn('ankh', N.x + 2.5, groundAt(N.x + 2.5, N.z - 1.5, 2.5), N.z - 1.5, 0);
  const F = city.spots.farm;
  items.spawn('tamaras', F.x + 3.5, groundAt(F.x + 3.5, F.z, 2.5) + 0.05, F.z, 0);
  items.spawn('agua', city.spots.tiy.x + 3, groundAt(city.spots.tiy.x + 3, city.spots.tiy.z - 3, 2.5), city.spots.tiy.z - 3, 0);
  items.spawn('peixe', city.spots.pier.x - 6, 1.25, city.spots.pier.z + 1.6, 1);
}

function makeFlags(scene, defs) {
  const list = defs.map((d) => {
    const g = new THREE.PlaneGeometry(3.4, 0.9, 14, 1);
    g.translate(1.7, 0, 0);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: d.color, side: THREE.DoubleSide, roughness: 0.9 }));
    m.position.set(d.x, d.y, d.z);
    m.castShadow = true;
    scene.add(m);
    return { m, base: g.attributes.position.array.slice(), seed: d.z };
  });
  return {
    update(t) {
      for (const f of list) {
        const p = f.m.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = f.base[i * 3];
          p.setZ(i, Math.sin(x * 1.8 - t * 5 + f.seed) * 0.12 * x);
          p.setY(i, f.base[i * 3 + 1] - x * 0.06);
        }
        p.needsUpdate = true;
      }
    },
  };
}

function makeBoats(scene, city) {
  const boats = [];
  const skiff = (x, z, ry) => {
    const g = new THREE.Group();
    // barquinho de papiro modelado (sculptures.js); chega assim que o modelo carregar
    sculptureInstance('barco', 5).then((o) => { o.position.y = -0.18; g.add(o); });
    g.position.set(x, 0.05, z); g.rotation.y = ry; scene.add(g);
    boats.push({ g, bob: rand() * 6, y: 0.05 });
    return g;
  };
  const ship = (x, z, ry, sailUp, crew) => {
    const g = new THREE.Group();
    // calado: o casco do navio a remo é alto, então afunda ~1 m (carregado); DECK = convés de cada modelo
    const SINK = sailUp ? -0.55 : -1.05, DECK = sailUp ? 0.43 : 2.78 + SINK + 0.35;
    // navio modelado (sculptures.js): à vela, o de casco de madeira e vela de linho; a remo, o de vela listrada e remos
    sculptureInstance(sailUp ? 'navio' : 'navio2', 15).then((o) => { o.position.y = SINK; g.add(o); });
    const oars = [];
    const people = [];
    for (let i = 0; i < crew; i++) {
      const r = makeHumanoid({ outfit: 'worker', hair: pick(['short', 'khat', 'bald']), collar: null });
      r.root.position.set(-1 + i * 1.6, DECK, (i % 2 ? -0.6 : 0.6)); r.root.rotation.y = Math.PI / 2 * (i % 2 ? 1 : -1);
      g.add(r.root); people.push(r);
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.position.set(x, 0.1, z); g.rotation.y = ry; scene.add(g);
    return { g, oars, people, bob: rand() * 6, y: 0.1 };
  };
  // atracados
  const pz = city.pierZ, p2 = city.pier2Z;
  skiff(riverX(pz) - 28, pz - 4.2, 0.05);
  skiff(riverX(pz) - 33, pz + 4.2, -0.1);
  const cargo = ship(riverX(p2) - 30, p2 + 6, 0, false, 2); boats.push(cargo);
  // amarra do navio de carga ao cais
  {
    const a = new THREE.Vector3(riverX(p2) - 33, 1.15, p2 + 1.9), b = new THREE.Vector3(riverX(p2) - 34, 2.0, p2 + 3.6);
    const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -0.35, 0)), b), 12, 0.025, 5), new THREE.MeshStandardMaterial({ color: 0x8a7350, roughness: 1 }));
    scene.add(rope);
  }
  // navegando
  const sailing = [];
  const s1 = ship(0, -150, 0, true, 3); s1.dir = 1; s1.off = 12; s1.speed = 3.2; sailing.push(s1);
  const s2 = ship(0, 200, 0, false, 4); s2.dir = -1; s2.off = -6; s2.speed = 2.2; sailing.push(s2);
  const sk = skiff(0, 60, 0); const s3 = { g: sk, dir: -1, off: 20, speed: 1.4, oars: [], people: [], bob: 1, y: 0.05 }; sailing.push(s3);
  boats.push(...sailing);
  return {
    update(dt, t) {
      for (const b of boats) {
        b.g.position.y = b.y + Math.sin(t * 1.2 + b.bob) * 0.06;
        b.g.rotation.z = Math.sin(t * 0.9 + b.bob) * 0.015;
        if (b.oars) b.oars.forEach((o) => { o.piv.rotation.y = Math.sin(t * 1.6) * 0.5 * o.s; });
        if (b.people) b.people.forEach((p) => animateHumanoid(p, dt, 0, b.oars?.length ? 'sit' : 'idle', t));
      }
      for (const s of sailing) {
        let z = s.g.position.z + s.dir * s.speed * dt;
        if (z > 420) z = -420; if (z < -420) z = 420;
        const x = riverX(z) + s.off;
        const ahead = riverX(z + s.dir * 2) + s.off;
        s.g.position.set(x, s.g.position.y, z);
        s.g.rotation.y = Math.atan2(-s.dir * 2, ahead - x); // proa (+x do casco) na direção do movimento
      }
    },
  };
}

main().catch((e) => { console.error(e); ui.fail('Algo deu errado ao carregar Mênfis: ' + e.message); });
void terrainHeight;
