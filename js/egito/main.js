// Mênfis, c. 1250 a.C. — inicialização e laço principal
import * as THREE from 'three';
import { getTextures, setAniso, loadPBR, buildPhotoComposites, labelTexture } from './textures.js';
import { createPost } from './post.js';
import { makeWaterFX } from './waterfx.js';
import { Artifacts } from './artifacts.js';
import { isTouch, canTouch, setupTouch } from './touch.js';
import { buildTerrain, buildVegetation, buildHorizon, riverX, LAKE, terrainHeight } from './terrain.js';
import { buildCity, hullGeometry } from './buildings.js';
import { setCharTextures } from './characters.js';
import { loadHumanModel, makeHumanoid, animateHumanoid, playOnce, makeStatue } from './mixamo.js';
import { Actors } from './npcs.js';
import { Player } from './player.js';
import { Quests, OBJECTIVES } from './quests.js';
import { TimeOfDay } from './sky.js';
import { Items } from './items.js';
import { UI } from './ui.js';
import { AudioFX } from './audio.js';
import { GUARD_LINES } from './dialogues.js';
import { nextFrame, pick, rr, rand } from './util.js';
import { groundAt, waterAt } from './collision.js';

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
  document.getElementById('game').appendChild(renderer.domElement);
  setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  const scene = new THREE.Scene();
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
  const horizon = buildHorizon(scene, tex);
  await step(0.35, 'Erguendo o templo de Ptah e as pirâmides de Gizé...');
  const city = buildCity(scene, tex);
  if (city.pool) { city.pool.children.forEach((m) => (m.material = world.calmWater)); scene.add(city.pool); }
  await step(0.55, 'Plantando palmeiras, papiros e campos de cevada...');
  buildVegetation(scene, tex, city.exclusions);
  for (const st of city.statues) { const o = makeStatue({ h: st.h, painted: st.painted }); o.position.set(st.x, st.y, st.z); o.rotation.y = st.ry; scene.add(o); }
  const flags = makeFlags(scene, city.flags);
  const boats = makeBoats(scene, city);

  await step(0.68, 'Chamando o povo de Mênfis...');
  const actors = new Actors(scene, city);
  actors.spawnKeyNPCs();
  actors.spawnAmbient();
  actors.spawnAnimals();
  const items = new Items(scene, tex.glow);
  spawnItems(items, city);

  await step(0.8, 'Preparando o explorador...');
  const player = new Player(scene, camera);
  player.place(84, 0, -Math.PI / 2);
  const fx = makeWaterFX(scene);
  player.events.swim = (p, f, sp, dt, t) => fx.swim(p, f, sp, dt, t);
  player.events.stopSwim = () => fx.stopSwim();
  player.events.ripple = (p, s) => fx.ripple(p, s);
  player.events.splash = (p) => { fx.splash(p); audio.splash(); };
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
  if (isTouch) { post.setQuality('leve'); sun.shadow.mapSize.set(2048, 2048); const sc2 = sun.shadow.camera; sc2.left = -70; sc2.right = 70; sc2.top = 70; sc2.bottom = -70; sc2.updateProjectionMatrix(); }
  // camada 3: aparece na tela e projeta sombra, mas fica fora do reflexo do Nilo e da oclusão (desempenho)
  camera.layers.enable(3); sun.shadow.camera.layers.enable(3);
  scene.traverse((o) => { if ((o.isInstancedMesh && (o.material.alphaTest > 0 || o.material.flatShading || o.count > 300) && o.count !== undefined) || o === sky.clouds) o.layers.set(3); });
  // objetos "flutuantes" fora da oclusão de ambiente; reflexo do céu mais suave nos materiais foscos
  scene.traverse((o) => {
    if (o.isMesh && o.material && o.material.isMeshStandardMaterial && o.material.metalness < 0.5 && !o.material.userData.keepEnv) o.material.envMapIntensity = 0.55;
    if ((o.isSprite && o !== sky.moon && o !== sky.moonGlow) || (o.isMesh && o.material && o.material.transparent && !o.isSkinnedMesh && o.material.depthWrite === false)) o.layers.set(1);
  });
  renderer.compile(scene, camera);
  await step(1, 'Pronto!');
  ui.doneLoading();

  // ---------------- estado de jogo ----------------
  let started = false, paused = false, mapOpen = false, ended = quests.isDone('farao');
  const seenItems = new Set();

  ui.showIntro(() => {
    started = true;
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
      ui.toast(it.eat);
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
  window.__game = { player, quests, sky, actors, items, post, renderer, scene, camera, artifacts, tp: (x, z, f) => player.place(x, z, f) };

  // ---------------- laço ----------------
  const clock = new THREE.Clock();
  let t = 0, miniT = 0;
  const keyNpcDots = () => actors.key.map((k) => ({ x: k.pos.x, z: k.pos.z, done: quests.isDone(k.def.objective) }));
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (paused) { post.render(dt, sky.state.night); return; }
    t += dt;
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
    items.update(t, player.pos);
    quests.update(dt, t, player);
    sky.update(dt, t, player.pos);
    world.water.material.uniforms.time.value += dt * 0.6;
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
    post.render(dt, sky.state.night);
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
  const M = city.M;
  const reed = new THREE.MeshStandardMaterial({ color: 0xc2a462, roughness: 0.95 });
  const painted = new THREE.MeshStandardMaterial({ map: M.wood.map, color: 0xd9c49a, roughness: 0.8 });
  const sailM = new THREE.MeshStandardMaterial({ color: 0xf1ead8, roughness: 0.95, side: THREE.DoubleSide });
  const boats = [];
  const skiff = (x, z, ry) => {
    const g = new THREE.Group();
    const h = new THREE.Mesh(hullGeometry(5, 1.2, 0.45, 1.6), reed); h.castShadow = true; g.add(h);
    for (let i = -2; i <= 2; i++) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 4, 10, Math.PI), M.rope); b.position.x = i * 0.9; b.rotation.y = Math.PI / 2; b.position.y = 0.1; g.add(b); }
    g.position.set(x, 0.05, z); g.rotation.y = ry; scene.add(g);
    boats.push({ g, bob: rand() * 6, y: 0.05 });
    return g;
  };
  const ship = (x, z, ry, sailUp, crew) => {
    const g = new THREE.Group();
    const h = new THREE.Mesh(hullGeometry(15, 3.8, 1.3, 1.1), painted); h.castShadow = true; h.receiveShadow = true; g.add(h);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(12, 0.15, 2.6), M.wood); deck.position.y = 0.6; g.add(deck);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3, 1.3, 2), M.white); cabin.position.set(-3.2, 1.3, 0); g.add(cabin);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.12, 2.3), M.awnings[1]); roof.position.set(-3.2, 2.0, 0); g.add(roof);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 9, 8), M.wood); mast.position.set(1.5, 5, 0); g.add(mast);
    const yardTop = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 8, 6), M.wood); yardTop.rotation.x = Math.PI / 2; g.add(yardTop);
    if (sailUp) {
      yardTop.position.set(1.5, 9.2, 0);
      const yardBot = yardTop.clone(); yardBot.position.y = 3; g.add(yardBot);
      const sg = new THREE.PlaneGeometry(7.6, 6.2, 8, 6); const sp = sg.attributes.position;
      for (let i = 0; i < sp.count; i++) { const u = sp.getX(i) / 3.8, v = sp.getY(i) / 3.1; sp.setZ(i, (1 - u * u) * (1 - v * v * 0.5) * 0.9); }
      sg.computeVertexNormals();
      const sail = new THREE.Mesh(sg, sailM); sail.rotation.y = Math.PI / 2; sail.position.set(1.7, 6.1, 0); sail.castShadow = true; g.add(sail);
    } else {
      yardTop.position.set(1.5, 4.2, 0);
      const furled = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 7.6, 8), sailM); furled.rotation.x = Math.PI / 2; furled.position.set(1.5, 4.0, 0); g.add(furled);
    }
    for (const s of [-1, 1]) { const oar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4), M.wood); oar.position.set(-6.4, 1, s * 1.1); oar.rotation.set(0.5 * s, 0, 0); g.add(oar); }
    const oars = [];
    if (!sailUp) for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {
      const piv = new THREE.Group(); piv.position.set(-1 + i * 1.6, 0.9, s * 1.6); g.add(piv);
      const o = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 3.2), M.wood); o.position.z = s * 1.4; o.rotation.x = s * 0.4; piv.add(o);
      oars.push({ piv, s });
    }
    const people = [];
    for (let i = 0; i < crew; i++) {
      const r = makeHumanoid({ outfit: 'worker', hair: pick(['short', 'khat', 'bald']), collar: null });
      r.root.position.set(-1 + i * 1.6, 0.68, (i % 2 ? -0.6 : 0.6)); r.root.rotation.y = Math.PI / 2 * (i % 2 ? 1 : -1);
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
