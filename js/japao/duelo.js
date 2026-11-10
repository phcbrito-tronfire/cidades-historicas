// Os duelos do dōjō (a sala de treino da residência). O mestre Kurosawa Jinnai, conversando, oferece ao viajante medir
// a espada com os da casa; quem aceita enfrenta quatro adversários em seguida — o aluno mais novo, o veterano, um rōnin
// de passagem e, por fim, o próprio mestre. Cada duelo começa e termina com a reverência (rei); quem não aguenta
// mais se ajoelha e se rende (nos dōjō de verdade se lutava com espada de madeira, o bokken, e não até a morte).
// Vencendo os quatro, o mestre entrega o menkyo kaiden, o diploma de "transmissão completa" da escola.
// Sem a armadura de samurai, o mestre empresta uma katana. Luta: F golpeia (emenda), Q apara com a lâmina, Espaço
// esquiva, G arremessa a katana (é preciso ir buscá-la: P), e sem ela, os punhos.
import * as THREE from 'three';
import { makeHumanoid, animateHumanoid, playOnce, hasClip, loadAnims } from '../comum/mixamo.js';
import { makeWeapon, HIT_AT, KT_LOCO } from '../comum/luta.js';
import { rr, rand, angleLerp, clamp } from '../comum/util.js';

const PRIZE_KEY = 'cidades-historicas:japao-premios';
export const PRIZES = {
  menkyo: { name: 'Menkyo kaiden — o diploma do mestre', era: 'Dōjō da residência · Edo, século XVIII', story: 'Nas escolas de esgrima (ryū), o aluno recebia aos poucos diplomas que davam acesso a técnicas mais secretas. O último, o menkyo kaiden ("licença de transmissão completa"), dizia que o mestre já tinha ensinado tudo: o aluno podia abrir o seu próprio dōjō. Era um rolo de papel escrito à mão, com a linhagem dos mestres da escola.' },
  bokken: { name: 'Bokken do dōjō', era: 'Dōjō da residência · a espada de madeira', story: 'O bokken, a espada de madeira de carvalho, era a arma do treino de todos os dias: tem o peso e a curva da katana, sem o fio. Miyamoto Musashi venceu o seu duelo mais famoso, contra Sasaki Kojirō em 1612, com um bokken que ele mesmo talhou de um remo.' },
};
const prizesGot = () => { try { return JSON.parse(localStorage.getItem(PRIZE_KEY) || '{}'); } catch (e) { return {}; } };

// os adversários, do mais fácil ao mais difícil
const RIVALS = [
  { name: 'Kenta, o aluno mais novo', look: { cloth: 0xe8e2d4, hakama: 0x22283a }, hp: 70, speed: 2.3, dmg: [6, 10], block: 0.15, dodge: 0.12, cd: [1.7, 2.8], say: 'Kenta, o aluno mais novo, se curva e ergue a espada. Ele é rápido, mas abre a guarda depois de golpear.' },
  { name: 'Tadashi, o veterano', look: { cloth: 0x3a4a5a, hakama: 0x2a2a30, beard: 'short' }, hp: 95, speed: 2.6, dmg: [8, 13], block: 0.32, dodge: 0.15, cd: [1.3, 2.3], say: 'Tadashi, o veterano, defende quase tudo. Espere ele atacar e responda.' },
  { name: 'Sasaki, o rōnin', look: { cloth: 0x4a3a2a, hakama: 0x3a3028, beard: 'short' }, hp: 115, speed: 3.1, dmg: [10, 15], block: 0.28, dodge: 0.35, cd: [0.9, 1.9], say: 'Um rōnin de passagem pede para lutar: Sasaki, sem senhor e sem medo. Ele salta para os lados.' },
  { name: 'Kurosawa, o mestre', look: { cloth: 0x1a1a22, hakama: 0x4a4a56, beard: 'full' }, hp: 150, speed: 3.0, dmg: [11, 17], block: 0.45, dodge: 0.3, cd: [0.8, 1.6], say: 'Por último, o próprio Kurosawa desce ao tatame. "Mostre o que aprendeu."' },
];
const CHAIN = ['kt_desce', 'kt_forte', 'kt_baixo', 'kt_giro'];

class Rival {
  constructor(D, K) {
    this.D = D; this.K = K; this.name = K.name;
    this.r = makeHumanoid({ outfit: 'samurai', ...K.look, extras: [] }); D.scene.add(this.r.root);
    const w = makeWeapon('katana'), h = w.userData.hand; w.rotation.set(...h.rot); w.position.set(...h.pos); this.r.handR.add(w);
    this.r.locoSet = KT_LOCO; this.r.root.userData.cullFar = 120;
    this.pos = new THREE.Vector3(); this.h = 0; this.hp = K.hp; this.maxHp = K.hp; this.st = 'enter'; this.cd = rr(1.5, 2.5); this.rad = 0.45; this.side = rand() < 0.5 ? 1 : -1;
    this.blockT = 0; this.dodgeT = 0; this.stagger = 0; this.knock = 0; this.atk = null; this.v = 0;
  }
  get alive() { return this.st === 'fight'; }
  get aimY() { return this.pos.y + 1.25; }
  place() { this.r.root.position.copy(this.pos); this.r.root.rotation.y = this.h; }
  // o golpe do explorador: aparado, esquivado ou acertado
  hit(dmg, dir, how = {}) {
    if (this.st !== 'fight') return 'none';
    if (this.blockT > 0 && !how.thrown && !(how.heavy && rand() < 0.5)) { this.D.audio?.clang?.(); this.knock = 0.1; this.kdir = dir.clone(); return 'blocked'; }
    this.hp -= dmg; this.stagger = how.heavy ? 0.5 : 0.3; this.knock = 0.14; this.kdir = dir.clone(); this.atk = null;
    if (hasClip('gl_impacto')) playOnce(this.r, how.heavy && hasClip('gl_cabeca') ? 'gl_cabeca' : 'gl_impacto', how.heavy ? 0.55 : 0.4);
    if (this.hp <= 0) this.yieldNow();
    return 'hit';
  }
  yieldNow() { this.st = 'yield'; this.atk = null; this.r.once = null; playOnce(this.r, hasClip('ajoelhado') ? 'ajoelhado' : 'desmaiar', 999); this.D.onYield(this); }
  // o explorador vai golpear: às vezes apara, às vezes salta de lado
  react() {
    if (this.st !== 'fight' || this.atk || this.stagger > 0) return;
    const P = this.D.player.pos; if (Math.hypot(P.x - this.pos.x, P.z - this.pos.z) > 3.2) return;
    const r = rand();
    if (r < this.K.block) { this.blockT = 0.65; playOnce(this.r, hasClip('kt_defesa') ? 'kt_defesa' : 'kt_guarda', 0.65); }
    else if (r < this.K.block + this.K.dodge) { this.dodgeT = 0.3; this.ddir = this.h + (rand() < 0.5 ? 1 : -1) * Math.PI / 2; }
  }
  update(dt, t) {
    const D = this.D, P = D.player, me = this.pos;
    const dx = P.pos.x - me.x, dz = P.pos.z - me.z, d = Math.hypot(dx, dz) || 1, to = Math.atan2(dx, dz);
    let sp = 0, dir = to;
    if (this.st === 'yield' || this.st === 'gone') { animateHumanoid(this.r, dt, 0, 'idle', t); this.place(); return; }
    if (this.st === 'bow') { this.h = angleLerp(this.h, to, Math.min(1, dt * 4)); this.bowT -= dt; if (this.bowT <= 0) this.st = 'fight'; animateHumanoid(this.r, dt, 0, 'idle', t); this.place(); return; }
    if (this.st === 'enter') { sp = d > 4.2 ? 2.2 : 0; if (d <= 4.4) { this.st = 'bow'; this.bowT = 1.4; if (hasClip('kg_reverencia')) playOnce(this.r, 'kg_reverencia', 1.3); } }
    this.cd -= dt; this.blockT -= dt; this.dodgeT -= dt; this.stagger -= dt;
    if (this.knock > 0) { const k = Math.min(dt, this.knock); this.knock -= dt; me.x += this.kdir.x * 3 * k; me.z += this.kdir.z * 3 * k; }
    if (this.st === 'fight') {
      if (this.atk) { // o golpe em curso: acerta na fração certa do clipe
        const A = this.atk; A.t += dt; const f = A.t / A.full;
        if (A.hitI < A.hits.length && f >= A.hits[A.hitI]) { A.hitI++; if (d < 2.5 + (A.heavy ? 0.5 : 0) && Math.abs(((to - this.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 1.0) { const res = D.melee.receive(rr(this.K.dmg[0], this.K.dmg[1]) * (A.heavy ? 1.4 : 1), me, { heavy: A.heavy }); if (res === 'blocked') { this.stagger = 0.35; this.atk = null; } } }
        if (this.atk && A.t >= A.dur) this.atk = null;
        sp = A && f < 0.3 ? 1.6 : 0; dir = this.h;
      } else if (this.dodgeT > 0) { sp = 5; dir = this.ddir; }
      else if (this.stagger > 0) { sp = 0; }
      else if (d > 2.4) { sp = d > 4 ? this.K.speed : this.K.speed * 0.6; dir = to + this.side * 0.3; }
      else if (d < 1.5) { sp = 1.6; dir = to + Math.PI; }
      else { sp = 0.9; dir = to + this.side * Math.PI / 2; if (rand() < dt * 0.4) this.side = -this.side; } // rodeia, medindo a distância
      if (!this.atk && this.cd <= 0 && this.stagger <= 0 && this.dodgeT <= 0 && d < 3.4) this.attack(d > 2.8 && hasClip('kt_salto'));
    }
    if (!this.atk) this.h = angleLerp(this.h, this.st === 'fight' || this.st === 'enter' ? to : this.h, Math.min(1, dt * 7));
    me.x += Math.sin(dir) * sp * dt; me.z += Math.cos(dir) * sp * dt;
    { const ox = me.x - P.pos.x, oz = me.z - P.pos.z, od = Math.hypot(ox, oz); if (od < 1.0 && od > 1e-3) { me.x += (ox / od) * (1.0 - od); me.z += (oz / od) * (1.0 - od); } } // (não atravessa o explorador)
    D.clamp(me); this.place();
    animateHumanoid(this.r, dt, sp, sp > 0.3 ? 'walk' : 'idle', t);
  }
  attack(heavy) {
    const name = heavy ? 'kt_salto' : CHAIN[Math.floor(rand() * CHAIN.length)];
    const a = this.r.act(name); if (!a) { this.cd = 1; return; }
    const rate = heavy ? 1.05 : 1.1, full = a.getClip().duration / rate;
    this.atk = { t: 0, full, dur: full * 0.82, hits: HIT_AT[name] || [0.4], hitI: 0, heavy };
    playOnce(this.r, name, full * 0.82); a.timeScale = rate; this.D.audio?.swoosh?.();
    this.cd = rr(this.K.cd[0], this.K.cd[1]);
    this.h = Math.atan2(this.D.player.pos.x - this.pos.x, this.D.player.pos.z - this.pos.z);
  }
}

export class Duels {
  constructor(scene, { city, player, melee, health, ui, audio, toast, artifacts, actors, faint }) {
    Object.assign(this, { scene, city, player, melee, health, ui, audio, toast, artifacts, actors, faint });
    this.on = false; this.round = 0; this.rival = null; this.state = null;
    // os golpes de katana para os adversários (e para o explorador com a katana emprestada, sem a armadura)
    loadAnims(['kt_guarda', 'kt_andar', 'kt_correr', 'kt_desce', 'kt_forte', 'kt_baixo', 'kt_giro', 'kt_salto', 'kt_defesa', 'kg_reverencia']);
    const D = city.dojo; this.ok = !!D; if (!D) return;
    const f = D.f, c = f.W(0, 0), ux = f.W(1, 0), uz = f.W(0, 1);
    this.c = new THREE.Vector3(c[0], D.y + D.FL, c[1]); this.ax = new THREE.Vector2(ux[0] - c[0], ux[1] - c[1]); this.az = new THREE.Vector2(uz[0] - c[0], uz[1] - c[1]); this.hw = D.w / 2 - 0.8; this.hd = D.d / 2 - 0.8;
    // o canto de onde o Kurosawa (o mestre, NPC da cidade) assiste aos duelos, de frente para a sala
    { const [mx, mz] = f.W(1.6, -D.d / 2 + 1.2); this.masterPos = new THREE.Vector3(mx, D.y + D.FL, mz); this.masterRy = Math.atan2(this.az.x, this.az.y); }
    artifacts.prizes = () => { const g = prizesGot(); return Object.keys(PRIZES).filter((id) => g[id]).map((id) => PRIZES[id]); };
  }
  W(lx, lz) { return new THREE.Vector3(this.c.x + this.ax.x * lx + this.az.x * lz, this.c.y, this.c.z + this.ax.y * lx + this.az.y * lz); }
  // mantém alguém dentro do tatame
  clamp(p) {
    const rx = p.x - this.c.x, rz = p.z - this.c.z, lx = rx * this.ax.x + rz * this.ax.y, lz = rx * this.az.x + rz * this.az.y;
    const cx = clamp(lx, -this.hw, this.hw), cz = clamp(lz, -this.hd, this.hd); if (cx === lx && cz === lz) return;
    p.x = this.c.x + this.ax.x * cx + this.az.x * cz; p.z = this.c.z + this.ax.y * cx + this.az.y * cz;
  }
  get sensei() { return (this._s ??= this.actors?.key?.find((k) => k.def?.id === 'sensei')); }
  inDojo(p, m = 0.5) { const rx = p.x - this.c.x, rz = p.z - this.c.z, lx = rx * this.ax.x + rz * this.ax.y, lz = rx * this.az.x + rz * this.az.y; return Math.abs(lx) < this.hw + 0.8 + m && Math.abs(lz) < this.hd + 0.8 + m && Math.abs(p.y - this.c.y) < 2.5; }
  targets() { return this.rival && this.rival.alive ? [this.rival] : []; }
  onSwing() { this.rival?.react(); }
  say(m, ms = 4200) { this.toast(m, 'quest', ms); }

  talk() {
    const ui = this.ui, P = this.player; P.locked = true; ui.openDialog({ name: 'Kurosawa Jinnai', title: 'Mestre de esgrima (kenjutsu) do dōjō' }); this.audio?.talk?.();
    const close = () => { ui.closeDialog(); P.locked = false; };
    const g = prizesGot(), wins = g.duelos || 0;
    const lend = P.look !== 'japao' ? ' Você não traz espada de samurai: eu empresto uma das nossas.' : '';
    ui.say(`${wins ? `Você de novo. Já venceu ${wins} vez${wins > 1 ? 'es' : ''} a nossa casa — quer tentar outra?` : 'Um viajante no meu dōjō. Quer medir a sua espada com os da casa?'} São quatro duelos seguidos, cada um mais difícil; quem não aguenta se ajoelha e se rende. Quem vence os quatro recebe o diploma do mestre.${lend}`,
      [{ label: 'Quero duelar.', cb: () => { close(); this.start(); } }, { label: 'Como se luta?', cb: () => ui.say('F golpeia, e apertando de novo você emenda o próximo corte. Correndo, o golpe saltado. Q (segurando) apara com a lâmina. Espaço salta para o lado. G arremessa a katana — mas aí é preciso ir buscá-la (P), e até lá só restam os punhos.', [{ label: 'Quero duelar.', cb: () => { close(); this.start(); } }, { label: 'Ainda não.', cb: close }]) }, { label: 'Ainda não.', cb: close }]);
  }

  start() {
    const P = this.player, M = this.melee;
    this.on = true; this.round = 0; this.state = 'intro'; this.introT = 1.2; this.endT = 0;
    this.health.revive(100); M.clearGround(); M.reset(); M.equip('katana', null, true); M.lookSeen = null;
    for (const a of this.actors?.agents || []) if (this.inDojo(a.pos || a.rig.root.position)) a.rig.root.userData.off = true; // (os alunos saem do tatame)
    const S = this.sensei; if (S) { S.home ??= { p: S.rig.root.position.clone(), pos: S.pos.clone(), ry: S.ry }; S.rig.root.position.copy(this.masterPos); S.pos.copy(this.masterPos); S.ry = this.masterRy; } // (o mestre vai para o canto assistir)
    const s = this.W(-3.5, 0); P.place(s.x, s.z, Math.atan2(this.ax.x, this.ax.y)); P.updateCamera?.(1, true);
    this.say('Os alunos abrem espaço no tatame. Rei — a reverência, e o duelo começa.', 3500);
  }
  nextRound() {
    const K = RIVALS[this.round]; if (!K) return this.victory();
    if (this.rival) this.scene.remove(this.rival.r.root);
    const R = (this.rival = new Rival(this, K)); const p = this.W(5.2, 0); R.pos.copy(p); R.h = Math.atan2(-this.ax.x, -this.ax.y); R.place();
    this.state = 'fight'; this.say(K.say, 5000);
  }
  onYield(R) {
    this.audio?.chime?.(); this.state = 'between'; this.betweenT = 4;
    this.say(this.round < RIVALS.length - 1 ? `${R.name[0].toUpperCase() + R.name.slice(1)} se ajoelha e baixa a espada: ele se rende. Os dois se curvam.` : 'O mestre se ajoelha e baixa a espada. "Não tenho mais nada a lhe ensinar."', 5000);
    if (hasClip('kg_reverencia')) playOnce(this.player.rig, 'kg_reverencia', 1.4);
    this.health.hp = Math.min(100, this.health.hp + 30); this.health.render?.();
  }
  // o explorador caiu: o mestre encerra o duelo
  playerDown() {
    if (!this.on || this.state === 'lost') return !!this.on;
    this.state = 'lost'; const P = this.player; P.locked = true; P.collapse();
    this.say('Você cai no tatame. O mestre ergue a mão: o duelo acabou. "Treine mais e volte."', 5000);
    setTimeout(() => this.faint('Os alunos ajudam você a se levantar...', () => { this.finish(false); this.health.revive(45); P.locked = false; P.rig.once = null; }), 2400);
    return true;
  }
  victory() {
    this.state = 'won'; this.endT = 5; const g = prizesGot(); g.duelos = (g.duelos || 0) + 1; const award = [];
    if (!g.menkyo) award.push('menkyo'); if (g.duelos >= 2 && !g.bokken) award.push('bokken');
    for (const id of award) g[id] = true; try { localStorage.setItem(PRIZE_KEY, JSON.stringify(g)); } catch (e) { /* */ }
    this.pending = award;
    this.say(award.includes('menkyo') ? 'Você venceu os quatro! O mestre manda trazer o rolo do diploma.' : `Mais uma vitória sobre a casa (${g.duelos}).${award.length ? ' O mestre lhe dá um presente.' : ''}`, 6000);
  }
  finish(won) {
    const P = this.player, M = this.melee;
    if (this.rival) { this.scene.remove(this.rival.r.root); this.rival = null; }
    for (const a of this.actors?.agents || []) a.rig.root.userData.off = false;
    const S = this.sensei; if (S?.home) { S.rig.root.position.copy(S.home.p); S.pos.copy(S.home.pos); S.ry = S.home.ry; S.rig.root.userData.off = false; S.home = null; }
    M.clearGround(); M.reset(); M.equip(null, null, false); M.lookSeen = null;
    this.on = false; this.state = null;
    const s = this.W(0, 1.5); P.place(s.x, s.z, this.masterRy + Math.PI);
    if (won && this.pending?.length) { const list = this.pending; this.pending = null; list.forEach((id, i) => setTimeout(() => { const p = PRIZES[id]; this.artifacts.showInfo?.({ tag: 'Prêmio', name: p.name, era: p.era, story: p.story, foot: 'Os prêmios ficam na sua coleção (K).' }); }, 700 + i * 400)); }
  }

  update(dt, t) {
    if (!this.ok) return;
    const P = this.player;
    { const S = this.sensei; if (S) S.rig.root.userData.off = this.on && this.round === RIVALS.length - 1 && (this.state === 'fight' || this.state === 'between'); }
    if (!this.on) return;
    if (this.state !== 'lost') this.clamp(P.pos);
    if (this.state === 'intro') { this.introT -= dt; if (this.introT <= 0) this.nextRound(); }
    else if (this.state === 'between') { this.betweenT -= dt; if (this.betweenT <= 0) { this.round++; if (this.rival) { this.scene.remove(this.rival.r.root); this.rival = null; } this.nextRound(); } }
    else if (this.state === 'won') { this.endT -= dt; if (this.endT <= 0) this.finish(true); }
    this.rival?.update(dt, t);
  }
  hint() {
    if (this.on && this.rival && this.state === 'fight') return `${this.rival.name}: ${Math.max(0, Math.round((this.rival.hp / this.rival.maxHp) * 100))}% · duelo ${this.round + 1} de ${RIVALS.length}`;
    return '';
  }
}
