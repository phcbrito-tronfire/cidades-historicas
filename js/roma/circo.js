// Corrida de bigas no Circo Máximo: quatro carros (Verdes, Azuis, Brancos e Vermelhos — as "facções" pelas quais
// Roma inteira torcia) dão sete voltas em volta da spina, contra o sentido do relógio, rasgando as curvas nas metas.
// Na spina, sete golfinhos de bronze viram a cada volta, para a plateia saber quanto falta. No fim, o vencedor dá a
// volta da vitória e, depois de um intervalo, os carros se alinham de novo nas baias de largada (carceres).
// Junto das baias fica o organizador: a quem Roma já conhece, ele confia a biga de uma facção para três voltas
// contra os aurigas da casa (as contas da pista, das parelhas e dos choques ficam em corrida.js).
import * as THREE from 'three';
import { creature } from '../comum/fauna.js';
import { makeHumanoid, animateHumanoid } from '../comum/mixamo.js';
import { addCircle } from '../comum/collision.js';
import { CIRCUS, terrainHeight } from './terrain.js';
import { rand, lerp, clamp, angleLerp } from '../comum/util.js';
import { makeTrack, carState, driveAI, drivePlayer, stepCar, collide, K, RMAX } from './corrida.js';

const TEAMS = [{ name: 'Verdes', c: 0x2a8a3a, css: '#2a8a3a' }, { name: 'Azuis', c: 0x2a52a8, css: '#2a52a8' }, { name: 'Brancos', c: 0xeeeae0, css: '#eeeae0' }, { name: 'Vermelhos', c: 0xb02a20, css: '#b02a20' }];
const LAPS = 7, LAPS_PLAYER = 3, LH = CIRCUS.hw - 46; // meia-reta: de uma meta à outra
const U0 = -0.056; // a largada: os carros parados diante das baias, antes da linha branca
const ORG = { x: CIRCUS.x - CIRCUS.hw + 19, z: CIRCUS.z + 25 }; // o organizador, ao lado das baias (fora do caminho dos carros)
const ORDINAL = ['', '1º', '2º', '3º', '4º'];

export class Races {
  constructor(scene, { crowdGeo, crowdMat, quality, toast, excite }) {
    this.scene = scene; this.toast = toast; this.excite = excite;
    this.T = makeTrack(CIRCUS.x, CIRCUS.z, LH);
    this.group = new THREE.Group(); this.group.visible = false; scene.add(this.group);
    const C = CIRCUS, y0 = terrainHeight(C.x, C.z) - 0.15; this.y = y0 + 0.05;
    // os carros: caixa de madeira com o parapeito na cor da facção, duas rodas e o timão até a parelha
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.8 }), iron = new THREE.MeshStandardMaterial({ color: 0x4a4a4e, metalness: 0.6, roughness: 0.5 });
    const nh = quality === 'minimo' ? 1 : 2;
    this.cars = TEAMS.map((tm, i) => {
      const g = new THREE.Group(), col = new THREE.MeshStandardMaterial({ color: tm.c, roughness: 0.6 });
      const floor = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.8), wood); floor.position.y = 0.55; g.add(floor);
      const front = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.8, 12, 1, true, -Math.PI / 2, Math.PI), col); front.material.side = THREE.DoubleSide; front.scale.z = 0.6; front.position.set(0, 0.95, 0.1); g.add(front);
      const wheels = [];
      for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 6, 16), iron); w.rotation.y = Math.PI / 2; w.position.set(s * 0.58, 0.48, -0.05); const sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.86, 0.04), wood); w.add(sp); const sp2 = sp.clone(); sp2.rotation.z = Math.PI / 2; w.add(sp2); g.add(w); wheels.push(w); }
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 6), wood); axle.rotation.z = Math.PI / 2; axle.position.set(0, 0.48, -0.05); g.add(axle);
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.6), wood); pole.position.set(0, 0.75, 1.6); pole.rotation.x = -0.12; g.add(pole);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      // o auriga: túnica curta na cor da equipe, de pé no carro, inclinado para a frente
      const rig = makeHumanoid({ outfit: 'chiton', cloth: tm.c, border: null, beard: rand() < 0.5 ? 'short' : null });
      rig.root.position.set(0, 0.58, -0.05); rig.root.rotation.x = 0.12; g.add(rig.root);
      this.group.add(g);
      const car = carState({ team: tm, idx: i, g, wheels, rig, horses: [], p: {}, h: undefined, roll: 0 }, i, U0);
      for (let k = 0; k < nh; k++) creature('cavalo', 2.45, { still: true }).then((c) => {
        if (!c) return;
        const a = c.clips.find((cl) => /gallop/i.test(cl.name)) || c.clips[0]; const act = c.mixer.clipAction(a); act.play(); act.time = rand();
        c.holder.position.set(nh === 1 ? 0 : (k ? 0.6 : -0.6), 0, 2.6); g.add(c.holder);
        c.holder.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        car.horses.push({ ...c, act });
      });
      return car;
    });
    // os golfinhos de bronze (contam as voltas) num pórtico em cima da spina, perto da meta leste
    this.dolphins = [];
    { const bronze = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.9, roughness: 0.3 }), x0 = C.x + LH - 30;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 0.3), bronze); bar.position.set(x0, y0 + 5.4, C.z); scene.add(bar);
      for (const s of [-1, 1]) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 4, 8), bronze); col.position.set(x0 + s * 7, y0 + 3.4, C.z); scene.add(col); }
      for (let i = 0; i < LAPS; i++) {
        const d = new THREE.Group(); d.position.set(x0 - 6 + i * 2, y0 + 5.55, C.z);
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.7, 4, 8), bronze); body.rotation.z = Math.PI / 2; body.position.y = 0.45; d.add(body);
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.3, 4), bronze); tail.position.set(-0.6, 0.55, 0); tail.rotation.z = Math.PI / 2; d.add(tail);
        scene.add(d); this.dolphins.push(d);
      }
    }
    // a plateia nas arquibancadas dos dois lados (as mesmas figurinhas instanciadas do Coliseu)
    const fill = quality === 'alto' ? 0.55 : quality === 'leve' ? 0.35 : 0.18, seats = [];
    for (const s of [-1, 1]) for (let k = 0; k < 6; k++) {
      const z = C.z + s * (C.hd - 4 + k * 1.6), yy = y0 + (k + 1) * 1.1;
      for (let x = C.x - C.hw + 12; x < C.x + C.hw - 12; x += 0.7) if (rand() < fill) seats.push([x + (rand() - 0.5) * 0.2, yy, z + (rand() - 0.5) * 0.3, s]);
    }
    const im = new THREE.InstancedMesh(crowdGeo, crowdMat, seats.length), d3 = new THREE.Object3D(), cc = new THREE.Color();
    const tunics = [0xefe8d8, 0xe4dccb, 0xb0402c, 0xc8a050, 0x6a7a4a, 0x3a5a8a, 0x9a8a70, 0x2a8a3a, 0x2a52a8];
    seats.forEach(([x, yy, z, s], i) => { d3.position.set(x, yy, z); d3.rotation.set(0, s > 0 ? 0 : Math.PI, 0); d3.scale.setScalar(0.9 + rand() * 0.18); d3.updateMatrix(); im.setMatrixAt(i, d3.matrix); im.setColorAt(i, cc.set(tunics[Math.floor(rand() * tunics.length)])); });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; im.visible = false;
    scene.add(im); this.crowd = im;
    // o organizador das corridas: toga com a faixa púrpura, de pé na areia ao lado das baias, de olho na largada
    { const oy = terrainHeight(ORG.x, ORG.z);
      const rig = makeHumanoid({ outfit: 'himation', cloth: 0xf4efe2, border: 0x6a1a4a, beard: 'short', hairColor: 0x5a4a3a });
      rig.root.position.set(ORG.x, oy, ORG.z); rig.root.rotation.y = Math.atan2(26, -13); scene.add(rig.root);
      rig.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      addCircle(ORG.x, ORG.z, 0.35, oy - 1, oy + 1.8);
      this.org = { rig, y: oy, ry: rig.root.rotation.y, talking: false };
    }
    this.night = 0; this.driving = false; this.pr = null; this.laps = LAPS; this.fin = 0;
    this.onPlayerFinish = null; this.onWin = null;
    this.state = 'start'; this.timer = 6; this.lead = 0; this.resetRace();
  }

  // nas baias de largada, lado a lado, todos parados (as raias de cada facção saem no sorteio)
  resetRace() {
    const lanes = [9, 12, 15, 18].sort(() => rand() - 0.5);
    this.cars.forEach((c, i) => { const keep = { player: c.player }; carState(c, i, U0); c.r = c.rT = lanes[i]; c.player = keep.player; c.lead = false; c.h = undefined; });
    this.fin = 0; this.state = 'start'; this.timer = 8; this.dolphins.forEach((d) => { d.rotation.z = 0; });
  }

  // ---------------- o organizador ----------------
  nearOrganizer(pos) {
    if (this.pr || this.night >= 0.5) return false;
    return Math.hypot(pos.x - ORG.x, pos.z - ORG.z) < 3 && Math.abs(pos.y - this.org.y) < 2.5;
  }

  talk({ ui, audio, player, eligible, night }) {
    if (this.pr) return;
    this.audio = audio;
    const o = this.org, close = () => { ui.closeDialog(); player.locked = false; o.talking = false; };
    o.talking = true; player.locked = true;
    ui.openDialog({ name: 'Organizador das corridas', title: 'Circo Máximo' }); audio?.talk?.();
    if (night) { ui.say('Por hoje as corridas acabaram: os cavalos já foram para as cocheiras. Volte amanhã, com o sol.', [{ label: '(Seguir caminho)', cb: close }]); return; }
    if (eligible && player.riding) { ui.say('Desça do seu cavalo e deixe-o com os cavalariços: na pista, quem puxa a biga é a parelha da facção.', [{ label: '(Seguir caminho)', cb: close }]); return; }
    if (!eligible) {
      ui.say('As facções não entregam uma biga a qualquer um que aparece na areia: um carro, dois cavalos e meia Roma torcendo. ' +
        'Elas só confiam em quem a cidade já conhece. Ande por Roma, faça o que tem de ser feito e encontre o que ainda está perdido por aí — quando o seu nome correr pelas ruas, volte aqui.',
      [{ label: '(Seguir caminho)', cb: close }]);
      return;
    }
    const dot = (css) => `<span style="display:inline-block;width:0.8em;height:0.8em;border-radius:50%;background:${css};border:1px solid #4a2e12;margin-right:7px;vertical-align:-1px"></span>`;
    const choose = (text) => ui.say(text, [
      ...TEAMS.map((tm, i) => ({ label: `${dot(tm.css)}Correr pelos ${tm.name}`, cb: () => { close(); this.startPlayerRace(player, i, audio); } })),
      { label: 'Como é a corrida?', cb: () => choose('São três voltas em volta da spina, contra os aurigas da casa. Nas retas, solte os cavalos. Antes das metas, segure as rédeas: ' +
        'a raia de dentro é a mais curta, mas é a que pede mais calma — quem entra rápido demais derrapa para fora, e quem exagera roda de lado e para na areia. Aqui chamam isso de naufrágio. ' +
        'O chicote dá um arranque, mas cansa a parelha; cavalo sem fôlego não obedece. Os golfinhos da spina contam as voltas. Ganha quem cruzar primeiro a linha branca depois da terceira.') },
      { label: 'Agora não', cb: close },
    ]);
    choose('Eu sei quem você é: metade de Roma já me falou de você. Hoje cada facção tem uma biga sobrando, e a parelha está descansada. ' +
      'Três voltas contra os aurigas da casa. Por qual cor você corre?');
  }

  // ---------------- a corrida com o explorador ----------------
  startPlayerRace(player, teamIndex, audio) {
    if (this.pr) return false;
    if (audio) this.audio = audio;
    const car = this.cars[teamIndex];
    this.laps = LAPS_PLAYER;
    this.cars.forEach((c) => { c.player = false; c.rig.root.visible = true; });
    car.player = true;
    this.resetRace();
    this.timer = 5.2; // "Às baias!", e então 3, 2, 1
    car.rig.root.visible = false; // o explorador sobe no lugar do auriga
    this.pr = { car, team: car.team, place: 0, endT: 0, prevE: player.keys.has('KeyE'), prevW: false, toastT: {}, hoofT: 0, hoofI: 0, count: 99, lean: 0, yawRate: 0, hPrev: undefined };
    this.driving = true;
    player.boardCam(0.26); player.camYawW = Math.PI / 2 + Math.PI;
    const lane = [...this.cars].sort((a, b) => a.r - b.r).indexOf(car) + 1;
    this.toast(`Sorteio das baias: os ${car.team.name} largam pela ${lane}ª raia${lane === 1 ? ', colados na spina' : lane === 4 ? ', a mais de fora' : ''}.`, '', 5000);
    this.hud(true);
    return true;
  }

  // desce da biga (desistência ou fim) e volta a pé
  leaveRace(player, quit) {
    const pr = this.pr; if (!pr) return;
    const c = pr.car;
    this.driving = false; this.pr = null;
    player.leaveCam(); player.rig.model.rotation.set(0, 0, 0); player.speed = 0;
    c.rig.root.visible = true; c.player = false;
    this.hud(false);
    if (quit) {
      // ao lado da pista, por fora da raia mais aberta; o carro segue com um auriga da facção
      const q = this.T.track(c.u, RMAX + 3.5, {});
      if (c.u < 0.02) player.place(ORG.x + 2.4, ORG.z - 0.8, -Math.PI / 2 - 0.3); else player.place(q.x, q.z, q.h + Math.PI / 2); // (ainda nas baias: volta para junto do organizador)
      this.toast('Você puxa as rédeas e desce da biga. Um auriga dos ' + c.team.name + ' toma o seu lugar.', '', 4500);
      player.speed = 0;
      c.v = Math.min(c.v, 4);
    } else {
      this.laps = LAPS; this.resetRace(); this.timer = 20;
      player.place(ORG.x + 2.4, ORG.z - 0.8, -Math.PI / 2 - 0.3); // (de frente para o organizador e as baias)
    }
  }

  // aviso (com intervalo mínimo por tipo, para não encher a tela)
  say(kind, text, gap = 4, cls = '', ms = 3500) {
    const pr = this.pr; if (!pr) return;
    const now = performance.now() / 1000;
    if ((pr.toastT[kind] ?? -99) + gap > now) return;
    pr.toastT[kind] = now; this.toast(text, cls, ms);
  }

  // o que acontece na pista (derrapagens, naufrágios, choques, chicote)
  event(type, a, b) {
    const pr = this.pr; if (!pr) return;
    const me = pr.car;
    if (type === 'whip' && a === me) this.audio?.swoosh?.();
    else if (type === 'tired' && a === me) this.say('tired', 'Os cavalos estão sem fôlego: o chicote não adianta agora. Deixe a parelha respirar.', 5);
    else if (type === 'skid' && a === me) this.say('skid', 'A biga derrapa na meta! Segure os cavalos ou abra a raia.', 2.5);
    else if (type === 'crash') {
      if (a === me) { this.toast('Naufrágio! A biga roda de lado na meta e para na areia. A plateia vai ao delírio.', 'quest', 4500); this.excite?.(); }
      else this.say('crash' + a.idx, `Naufrágio dos ${a.team.name} na meta!`, 6);
    } else if (type === 'recover' && a === me) this.say('recover', 'Os cavalos voltam a puxar. A corrida ainda não acabou!', 3);
    else if (type === 'bump' && (a === me || b === me)) { const o = a === me ? b : a; this.say('bump', `As rodas raspam na biga dos ${o.team.name}!`, 4); }
    else if (type === 'ram') {
      if (a === me) this.say('ram', `Você bate na traseira dos ${b.team.name} e perde o embalo.`, 4);
      else if (b === me) this.say('ram', `Os ${a.team.name} batem na sua traseira!`, 4);
    }
  }

  // ---------------- painel da corrida ----------------
  hud(on) {
    if (!this.hudEl) {
      const host = document.getElementById('hud') || document.body;
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;left:22px;bottom:46px;width:372px;padding:10px 18px 9px;border-radius:12px;background:var(--panel,rgba(20,14,8,.78));border:1px solid var(--gold,#e8b84a);text-shadow:0 1px 3px #000;text-align:center;pointer-events:none;';
      el.innerHTML = `<div data-k="head" style="font-family:'Cinzel',serif;font-weight:700;font-size:1.15rem;color:var(--gold-2,#ffd98a);letter-spacing:.04em"></div>
        <div style="display:flex;gap:14px;align-items:center;margin:7px 0 3px;font-size:.92rem">
          <span style="width:62px;text-align:right;opacity:.85">Fôlego</span>
          <div style="flex:1;height:9px;border-radius:5px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.15);overflow:hidden"><div data-k="stam" style="height:100%;width:100%;background:#8ac06a"></div></div>
        </div>
        <div style="display:flex;gap:14px;align-items:center;margin:3px 0 5px;font-size:.92rem">
          <span style="width:62px;text-align:right;opacity:.85">Galope</span>
          <div style="flex:1;position:relative;height:9px;border-radius:5px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.15)"><div data-k="spd" style="height:100%;width:0;border-radius:5px;background:var(--gold,#e8b84a)"></div><div data-k="safe" style="position:absolute;top:-4px;width:3px;height:17px;background:#fff;box-shadow:0 0 4px #000;display:none"></div></div>
        </div>
        <div data-k="warn" style="min-height:1.25em;font-size:.95rem;color:#ffb38a"></div>
        <div style="font-size:.85rem;opacity:.85;margin-top:3px"><kbd>↑</kbd> soltar · <kbd>↓</kbd> segurar · <kbd>←</kbd><kbd>→</kbd> raia · <kbd>Shift</kbd> chicote · <kbd>E</kbd> desistir</div>`;
      const big = document.createElement('div');
      big.style.cssText = "position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);font-family:'Cinzel',serif;font-weight:700;font-size:4.2rem;color:var(--gold-2,#ffd98a);text-shadow:0 2px 12px #000,0 0 3px #000;pointer-events:none;white-space:nowrap;";
      host.appendChild(el); host.appendChild(big);
      this.hudEl = el; this.bigEl = big; this.hudK = {};
      el.querySelectorAll('[data-k]').forEach((n) => { this.hudK[n.dataset.k] = n; });
    }
    this.hudEl.hidden = !on; this.bigEl.hidden = !on; this.bigEl.textContent = '';
  }

  hudUpdate(pr) {
    const c = pr.car, H = this.hudK, set = (n, v) => { if (n.textContent !== v) n.textContent = v; };
    const order = this.order(), pos = order.indexOf(c) + 1;
    const lap = Math.min(this.laps, Math.floor(Math.max(0, c.u)) + 1);
    set(H.head, c.done ? `Chegada: ${ORDINAL[c.place]} lugar` : `${c.team.name} · Volta ${lap}/${this.laps} · ${ORDINAL[pos]} lugar`);
    H.stam.style.width = `${Math.round(c.stam * 100)}%`;
    H.stam.style.background = c.tired ? '#c8603a' : c.stam < 0.35 ? '#d8b04a' : '#8ac06a';
    const VMAX = 20, d = this.T.toTurn(c.u), inT = this.T.turn(c.u), vs = Math.sqrt(K * c.r), near = inT || d < 70;
    H.spd.style.width = `${Math.round(clamp(c.v / VMAX, 0, 1) * 100)}%`;
    const over = near && c.v > vs + 0.3;
    H.spd.style.background = over ? '#d8583a' : c.whipT > 0 ? '#ffd98a' : 'var(--gold,#e8b84a)';
    H.safe.style.display = near && !c.done ? 'block' : 'none';
    H.safe.style.left = `${Math.round(clamp(vs / VMAX, 0, 1) * 100)}%`;
    let w = '';
    if (this.state === 'start') w = 'Aguarde o pano branco...';
    else if (c.done) w = '';
    else if (c.crashT > 0) w = 'A biga parou de lado...';
    else if (over) w = inT ? 'Rápido demais para esta raia!' : 'Meta à frente: segure os cavalos!';
    else if (near) w = inT ? 'Na meta' : 'Meta à frente';
    else if (c.tired) w = 'Parelha cansada';
    set(H.warn, w);
  }

  order() { return [...this.cars].sort((a, b) => (a.done && b.done ? a.place - b.place : a.done ? -1 : b.done ? 1 : b.u - a.u)); }

  // ---------------- quadro a quadro ----------------
  update(dt, t, player, night) {
    this.night = night;
    const C = CIRCUS, p = player.pos, pr = this.pr, T = this.T;
    const near = !!pr || (Math.hypot(p.x - C.x, p.z - C.z) < 360 && night < 0.5);
    this.group.visible = near; this.crowd.visible = near;
    // o organizador: só de dia; vira-se para quem conversa com ele
    { const o = this.org, show = night < 0.5 && Math.hypot(p.x - ORG.x, p.z - ORG.z) < 260;
      o.rig.root.visible = show;
      if (show) {
        const ry = o.talking ? Math.atan2(p.x - ORG.x, p.z - ORG.z) : o.ry;
        o.rig.root.rotation.y = angleLerp(o.rig.root.rotation.y, ry, Math.min(1, dt * 4));
        animateHumanoid(o.rig, dt, 0, o.talking ? 'talk' : 'idle', t);
      } }
    if (!near) return;
    const inside = !!pr || (Math.abs(p.x - C.x) < C.hw + 25 && Math.abs(p.z - C.z) < C.hd + 25);
    const ev = (type, a, b) => this.event(type, a, b);
    // a largada (com o explorador: "Às baias!", 3, 2, 1 e o pano branco)
    if (this.state === 'start') {
      this.timer -= dt;
      if (pr) {
        const n = this.timer > 3 ? 4 : Math.ceil(this.timer);
        if (n !== pr.count) { pr.count = n; this.bigEl.textContent = n === 4 ? 'Às baias!' : n > 0 ? String(n) : ''; if (n > 0 && n < 4) this.audio?.talk?.(); }
      }
      if (this.timer <= 0) {
        this.state = 'run';
        if (pr) { this.bigEl.textContent = 'Cai o pano branco!'; pr.goT = 1.4; this.toast('Cai o pano branco! Os portões das baias se abrem.', 'quest', 3000); this.excite?.(); }
        else if (inside) this.toast('Cai o pano branco: começa a corrida no Circo Máximo!');
      }
    }
    if (pr && pr.goT > 0) { pr.goT -= dt; if (pr.goT <= 0) this.bigEl.textContent = ''; }
    // o explorador: teclas (o E e o chicote valem no aperto, não enquanto seguros)
    let inp = null;
    if (pr) {
      const k = player.keys, eDown = k.has('KeyE'), wDown = k.has('ShiftLeft') || k.has('ShiftRight');
      inp = { up: k.has('ArrowUp') || k.has('KeyW'), down: k.has('ArrowDown') || k.has('KeyS'), left: k.has('ArrowLeft') || k.has('KeyA'), right: k.has('ArrowRight') || k.has('KeyD'), whip: wDown && !pr.prevW };
      const quit = eDown && !pr.prevE && !pr.car.done;
      pr.prevE = eDown; pr.prevW = wDown;
      if (quit) { this.leaveRace(player, true); return this.update(0, t, player, night); }
    }
    // condução e movimento
    if (this.state === 'run') {
      for (const c of this.cars) { if (c.player) drivePlayer(c, inp, dt, ev); else driveAI(c, this.cars, T, dt, t, this.laps, pr?.car); }
      for (const c of this.cars) stepCar(c, T, dt, ev);
      collide(this.cars, T, ev);
    } else if (this.state === 'end') {
      for (const c of this.cars) { c.target = c.lead ? 6 : 3; c.rate = c.target > c.v ? 0.6 : 1.5; c.decel = 0; c.rv = 0; stepCar(c, T, dt); }
    }
    // a chegada
    if (this.state === 'run') {
      for (const c of this.cars) {
        if (c.done || c.u < this.laps) continue;
        c.done = true; c.place = ++this.fin; if (c.place === 1) c.lead = true;
        if (!pr) {
          // corrida sem o explorador: quando o primeiro cruza a linha, todos tiram o pé e o vencedor dá a volta da vitória
          this.state = 'end'; this.timer = 26; this.excite?.();
          if (inside) this.onWin?.();
          if (inside) this.toast(`Vitória dos ${c.team.name}! O auriga recebe a palma e a coroa.`, 'quest', 6000);
          break;
        }
        if (c === pr.car) {
          pr.place = c.place; pr.endT = 4.5; this.excite?.();
          if (c.place === 1) this.toast(`Vitória! O povo grita o nome dos ${c.team.name} e você recebe a palma do vencedor.`, 'quest', 6500);
          else this.toast(`Você chega em ${ORDINAL[c.place]} lugar. ${c.place === 2 ? 'Por pouco! A plateia aplaude a corrida.' : 'A plateia aplaude assim mesmo: não é fácil enfrentar os aurigas da casa.'}`, 'quest', 6000);
          this.onPlayerFinish?.(c.place);
        } else if (c.place === 1) this.toast(`Os ${c.team.name} cruzam a linha primeiro!`, '', 3500);
      }
    } else if (this.state === 'end') { this.timer -= dt; if (this.timer <= 0) { this.laps = LAPS; this.resetRace(); } }
    // os carros na pista
    for (const c of this.cars) {
      const q = T.track(c.u, c.r, c.p);
      c.g.position.set(q.x, this.y, q.z);
      // o carro aponta um pouco para o lado em que muda de raia (para fora = para a direita do auriga); no naufrágio, roda de lado
      const hT = q.h - Math.atan2(c.rv || 0, Math.max(c.v, 3)) * 0.8 + c.spin;
      c.h = c.h === undefined ? hT : angleLerp(c.h, hT, Math.min(1, dt * 6));
      c.g.rotation.y = c.h;
      c.roll = lerp(c.roll, (q.turn ? 0.06 * clamp(c.v / 15, 0, 1) : 0) + (c.crashT > 0 ? 0.14 : 0), Math.min(1, dt * 5));
      c.g.rotation.z = c.roll; // o carro inclina para fora na curva
      for (const w of c.wheels) w.rotation.x += (c.v * dt) / 0.45;
      for (const hz of c.horses) { hz.act.timeScale = c.v < 1.5 ? 0.15 : clamp(c.v / 12, 0.6, 1.5); hz.mixer.update(dt); }
      if (!c.player) { c.rig.root.rotation.z = lerp(c.rig.root.rotation.z, q.turn ? -0.12 : 0, Math.min(1, dt * 4)); animateHumanoid(c.rig, dt, 0, 'idle', t); }
    }
    // golfinhos: um vira a cada volta completada pelo primeiro
    const lead = this.order()[0], laps = Math.min(this.laps, Math.floor(Math.max(0, lead.u)));
    this.dolphins.forEach((d, i) => { d.rotation.z = lerp(d.rotation.z, i < laps ? -1.2 : 0, Math.min(1, dt * 3)); });
    if (pr) this.drive(dt, t, player, pr);
  }

  // o explorador de pé na biga: posição, inclinação nas metas, câmera atrás e acima, cascos, painel
  drive(dt, t, player, pr) {
    const c = pr.car, h = c.g.rotation.y, sh = Math.sin(h), ch = Math.cos(h);
    const pos = new THREE.Vector3(c.g.position.x - sh * 0.05, this.y + 0.58, c.g.position.z - ch * 0.05);
    // a câmera mira um pouco à frente da parelha (e mais à frente quanto mais rápido, para não ficar para trás)
    const lead = 1.5 + c.v / 6, cam = { x: pos.x + sh * lead, y: pos.y + 1.7, z: pos.z + ch * lead, dist: 6.2 };
    if (pr.hPrev !== undefined && dt > 0) pr.yawRate = lerp(pr.yawRate, Math.atan2(Math.sin(h - pr.hPrev), Math.cos(h - pr.hPrev)) / dt, Math.min(1, dt * 4));
    pr.hPrev = h;
    player.ride(dt, t, pos, h, 'idle', c.v, cam, h + pr.yawRate * 0.36); // (a câmera se antecipa à curva)
    // de pé, curvado para a frente, inclinando o corpo para dentro da meta (a spina fica à esquerda)
    pr.lean = lerp(pr.lean, c.p.turn && c.crashT <= 0 ? 0.17 * clamp(c.v / 14, 0, 1) : 0, Math.min(1, dt * 4));
    player.rig.model.rotation.set(0.1, 0, -pr.lean);
    // cascos na areia: três batidas e uma pausa, no ritmo do galope
    if (c.v > 2 && this.audio?.hoof) {
      pr.hoofT -= dt * (0.5 + c.v / 10);
      if (pr.hoofT <= 0) { this.audio.hoof({ vol: 0.35 * clamp(c.v / 14, 0.3, 1) }); pr.hoofI = (pr.hoofI + 1) % 4; pr.hoofT += pr.hoofI === 3 ? 0.22 : 0.06; }
    }
    this.hudUpdate(pr);
    // depois da chegada: alguns segundos de volta lenta, e o explorador desce perto do organizador
    if (c.done) { pr.endT -= dt; if (pr.endT <= 0) this.leaveRace(player, false); }
  }
}
