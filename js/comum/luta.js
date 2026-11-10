// Luta em Roma: o explorador vestido de legionário ou de gladiador golpeia com o que tiver na mão — gládio, lança ou os
// punhos —, ergue o escudo, esquiva, arremessa a arma e pega outra do chão. Um golpe forte pode arrancar a espada da
// mão (ela voa e cai na areia): aí se luta no soco até recuperar uma arma. Fora da arena não há em quem bater (o povo
// de Roma não é alvo); na arena, quem dá os alvos é arena.js.
//   F ou clique — golpe (apertando de novo durante o golpe, emenda o próximo) · correndo, o golpe forte
//   Q ou botão direito (segurar) — defesa: o escudo na frente (com espada só, apara metade; no soco, a guarda)
//   Espaço — esquiva (com a arma na mão; sem ela, o pulo de sempre) · G — arremessa a lança ou o gládio · P — pega a arma do chão
import * as THREE from 'three';
import { playOnce, hasClip, loadAnims } from './mixamo.js';
import { groundAt } from './collision.js';
import { rand, rr, clamp } from './util.js';
import { swordParts } from './katana.js';

// golpes do pacote "Sword And Shield" do Mixamo (já usados pelos gladiadores do Coliseu) e, quando chegarem, os de soco
const BASE_CLIPS = ['gl_guarda', 'gl_lado', 'gl_alto', 'gl_baixo', 'gl_desce', 'gl_combo', 'gl_forte', 'gl_cabo', 'gl_chute', 'gl_bloqueio', 'gl_impacto', 'gl_cabeca', 'gl_morte_f', 'gl_morte_t', 'gl_vitoria'];
const EXTRA_CLIPS = ['kt_defesa', 'kg_reverencia', 'so_guarda', 'so_jab', 'so_direto', 'so_gancho', 'so_uppercut', 'so_soco_forte', 'es_rola', 'es_esquiva', 'gl_defesa', 'gl_saca', 'lanca'];
// em que fração do clipe o golpe chega (mais de um número: uma sequência de golpes no mesmo clipe)
// a katana (Japão): os cortes do Mixamo de katana; o golpe acerta no meio da janela do corte
export const KT_CUT = { kt_desce: [0.18, 0.5], kt_forte: [0.25, 0.55], kt_baixo: [0.3, 0.55], kt_giro: [0.25, 0.65], kt_salto: [0.35, 0.65] };
export const KT_LOCO = { idle: 'kt_guarda', andar: 'kt_andar', andar_f: 'kt_andar', trotar: 'kt_correr', correr: 'kt_correr' };
export const HIT_AT = { kt_desce: [0.33], kt_forte: [0.4], kt_baixo: [0.42], kt_giro: [0.36, 0.56], kt_salto: [0.5], gl_alto: [0.42], gl_baixo: [0.4], gl_desce: [0.48], gl_combo: [0.2, 0.47, 0.74], gl_forte: [0.45], gl_cabo: [0.45], gl_chute: [0.38], espada: [0.45], so_jab: [0.55], so_direto: [0.48], so_gancho: [0.5], so_uppercut: [0.4], so_soco_forte: [0.28, 0.4, 0.52, 0.62], lanca: [0.24] }; /* (a estocada: o braço já está todo esticado aos 24%) */ // (medido: o quadro em que a mão vai mais longe à frente)
// ritmo de cada clipe (a estocada do Mixamo é lenta para a lança: acelerada; o resto, um pouco mais rápido que o original)
const CLIP_RATE = { kt_desce: 1.3, kt_forte: 1.25, kt_baixo: 1.3, kt_giro: 1.2, kt_salto: 1.15, lanca: 1.6, so_soco_forte: 1.25, so_uppercut: 1.2 };
// onde o golpe termina (fração do clipe): a estocada recolhe o braço aos 55%; o resto é só a volta ao parado
const CLIP_END = { lanca: 0.6, kt_desce: 0.78, kt_forte: 0.8, kt_baixo: 0.78, kt_giro: 0.85, kt_salto: 0.85 }; /* (a katana: o golpe termina quando a lâmina volta à guarda; a volta inteira deixava o combate travado) */
export const WEAPONS = {
  gladio: { name: 'o gládio', reach: 1.85, arc: 1.0, dmg: [13, 19], chain: ['gl_alto', 'gl_desce', 'gl_baixo', 'gl_combo'], heavy: 'gl_forte', thrown: 24 },
  lanca: { name: 'a lança', reach: 2.6, arc: 0.7, dmg: [14, 20], chain: ['lanca', 'lanca', 'lanca'], rates: [1.6, 1.95, 1.75], heavy: 'lanca', heavyRate: 1.3, thrown: 34 }, /* (só estocadas: golpe de espada com lança apontava a ponta para o céu) */
  katana: { name: 'a katana', reach: 2.15, arc: 1.2, dmg: [16, 24], chain: ['kt_desce', 'kt_forte', 'kt_baixo', 'kt_giro'], heavy: 'kt_salto', thrown: 28 },
  khopesh: { name: 'a khopesh', reach: 1.95, arc: 1.15, dmg: [14, 20], chain: ['gl_alto', 'gl_desce', 'gl_baixo', 'gl_combo'], heavy: 'gl_forte', thrown: 22 }, /* (a espada curva de bronze do Egito: o gancho corta de cima para baixo) */
  punhos: { name: 'os punhos', reach: 1.3, arc: 0.9, dmg: [5, 8], chain: ['so_jab', 'so_direto', 'so_gancho', 'so_uppercut'], heavy: 'so_soco_forte' },
};
const RATE = 1.15; // (os golpes um pouco mais rápidos que o original: lutando, o jogador não pode esperar)
const V = () => new THREE.Vector3();

// ---- as armas (as mesmas formas das dos gladiadores do Coliseu, em mixamo.js)
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
const at = (geo, m, x, y, z, r) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); if (r) me.rotation.set(...r); me.castShadow = true; return me; };
// couro de boi malhado (o forro dos escudos egípcios): fundo claro com manchas castanhas e pretas
let COW = null;
function cowhide() {
  if (COW) return COW; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#e8dcc4'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 9; i++) { x.fillStyle = i % 3 ? '#6a4024' : '#241812'; x.beginPath(); const cx = Math.random() * 128, cy = Math.random() * 128; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, r = 10 + Math.random() * 16; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.3); } x.fill(); }
  COW = new THREE.CanvasTexture(c); COW.colorSpace = THREE.SRGBColorSpace; return COW;
}
export function makeWeapon(kind, color = 0xa8261e) {
  const g = new THREE.Group(); g.userData.kind = kind;
  if (kind === 'gladio') {
    const steel = mat(0xd8dde2, { metalness: 0.95, roughness: 0.2 });
    g.add(at(new THREE.CylinderGeometry(0.016, 0.016, 0.11, 8), mat(0x3a2414), 0, 0, 0));
    g.add(at(new THREE.BoxGeometry(0.07, 0.02, 0.03), mat(0xc9a040, { metalness: 0.8 }), 0, 0.06, 0));
    g.add(at(new THREE.SphereGeometry(0.022, 8, 6), mat(0xc9a040, { metalness: 0.8 }), 0, -0.06, 0));
    g.add(at(new THREE.BoxGeometry(0.05, 0.5, 0.008), steel, 0, 0.32, 0));
    g.add(at(new THREE.ConeGeometry(0.025, 0.07, 4), steel, 0, 0.6, 0, [0, Math.PI / 4, 0]));
    g.userData.hand = { rot: [Math.PI * 0.45, 0, 0], pos: [0, 0, 0] }; g.userData.len = 0.66;
  } else if (kind === 'lanca') {
    g.add(at(new THREE.CylinderGeometry(0.014, 0.016, 2.0, 6), mat(0x7a5a36), 0, 0.55, 0));
    g.add(at(new THREE.ConeGeometry(0.03, 0.2, 6), mat(0xc8cdd2, { metalness: 0.9, roughness: 0.3 }), 0, 1.64, 0));
    g.userData.hand = { rot: [Math.PI * 0.45, 0, 0], pos: [0, 0, 0] }; g.userData.len = 1.75;
    // duas pegadas: a de carregar (a ponta para cima e para a frente) e a da estocada (medida no clipe: na extensão do braço,
    // a lança aponta para a frente, um pouco para baixo, com a ponta a 2,5 m à frente na altura do peito)
    g.userData.qCarry = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI * 0.45, 0, 0));
    g.userData.qThrust = new THREE.Quaternion().setFromEuler(new THREE.Euler(2.253, -0.827, -0.412));
  } else if (kind === 'katana') { // a katana (a mesma da armadura de samurai), para arremessar, deixar no chão ou emprestar
    const { sword } = swordParts(); g.add(sword);
    g.userData.hand = { rot: [Math.PI * 0.45, 0, 0], pos: [0, 0, 0] }; g.userData.len = 1.0;
  } else if (kind === 'khopesh') { // a khopesh: cabo de madeira com pomo, haste reta de bronze e a lâmina em gancho (meia-lua)
    const bronze = mat(0xb9793c, { metalness: 0.9, roughness: 0.3 }), wood = mat(0x4a2c16);
    g.add(at(new THREE.CylinderGeometry(0.017, 0.019, 0.13, 8), wood, 0, 0, 0));
    g.add(at(new THREE.SphereGeometry(0.024, 8, 6), bronze, 0, -0.075, 0));
    g.add(at(new THREE.BoxGeometry(0.03, 0.2, 0.012), bronze, 0, 0.16, 0));
    const hook = new THREE.TorusGeometry(0.15, 0.022, 6, 22, 2.4); hook.scale(1, 1, 0.32); hook.rotateZ(0.74); hook.translate(0.14, 0.27, 0);
    g.add(at(hook, bronze, 0, 0, 0));
    g.userData.hand = { rot: [Math.PI * 0.45, 0, 0], pos: [0, 0, 0] }; g.userData.len = 0.5;
  } else if (kind === 'escudo_eg') { // o escudo egípcio: alto, de topo redondo, armação de madeira forrada de couro de boi malhado
    const sh = new THREE.Shape(); const W = 0.25, H0 = -0.42, H1 = 0.22; sh.moveTo(-W, H0); sh.lineTo(W, H0); sh.lineTo(W, H1); sh.absarc(0, H1, W, 0, Math.PI, false); sh.lineTo(-W, H0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.012, bevelSegments: 1, curveSegments: 16 }); geo.translate(0, 0, 0.005);
    const uv = geo.attributes.uv, ps = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (ps.getX(i) + W) / (2 * W), (ps.getY(i) - H0) / (H1 + W - H0));
    const face = new THREE.Mesh(geo, [mat(0xffffff, { map: cowhide(), roughness: 0.85 }), mat(0x5a3a1e, { roughness: 0.8 })]); face.castShadow = true; g.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(W, 0.012, 6, 16, Math.PI), mat(0x5a3a1e)); rim.position.set(0, H1, 0.04); g.add(rim);
    g.userData.hand = { rot: [0, Math.PI / 2, 0], pos: [0.02, 0.05, 0.1] };
  } else if (kind === 'escudo') { // o scutum: curvo, retangular, com o umbo de bronze e as faixas
    const w = 0.66, hgt = 1.05;
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, hgt, 18, 1, true, -w / 1.24, w / 0.62), mat(color, { side: THREE.DoubleSide })); face.position.z = -0.6; face.castShadow = true; g.add(face);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xc9a040, { metalness: 0.9, roughness: 0.3 })); boss.rotation.x = Math.PI / 2; boss.position.z = 0.02; g.add(boss);
    for (const y of [-0.3, 0.3]) g.add(at(new THREE.BoxGeometry(0.5, 0.025, 0.02), mat(0xd8b45a, { metalness: 0.8, roughness: 0.35 }), 0, y, 0.02));
    g.userData.hand = { rot: [0, Math.PI / 2, 0], pos: [0.02, 0.05, 0.1] };
  }
  return g;
}
// deitada no chão (para pegar), girada ao acaso
function lying(kind, color) {
  const w = makeWeapon(kind, color), g = new THREE.Group(); g.add(w);
  if (kind === 'escudo_eg') { w.rotation.set(-Math.PI / 2, 0, 0); w.position.y = 0.05; }
  else if (kind === 'escudo') { w.rotation.set(-Math.PI / 2, 0, 0); w.position.y = 0.62; } // (de face para cima, apoiado na curva)
  else { w.rotation.set(0, 0, Math.PI / 2); w.position.y = 0.03; }
  g.rotation.y = rand() * Math.PI * 2; g.userData.kind = kind; return g;
}

export class Melee {
  constructor(scene, player, { health, audio, toast, blood } = {}) {
    Object.assign(this, { scene, player, health, audio, toast, blood });
    this.right = null; this.left = null; // o que está em cada mão: 'gladio' | 'lanca' | null e 'escudo' | null
    this.forced = null; // a arena manda (armas dadas e sempre na mão)
    this.drawn = false; this.clip = null; this.t = 0; this.dur = 0; this.hits = []; this.hitI = 0; this.queued = false; this.combo = -1;
    this.block = false; this.blockHeld = false; this.dodgeT = 0; this.invuln = 0; this.idle = 0; this.stun = 0;
    this.targets = () => []; // a arena dá os alvos: { pos, rad, alive, hit(dmg, dir, how) }
    this.ground = []; // armas no chão: { g, kind, color }
    this.flying = []; // armas arremessadas, em voo
    this.tvel = new WeakMap(); // velocidade de cada alvo (a mira do arremesso vai na frente dele)
    this.meshes = { right: null, left: null, model: null };
    this.shieldColor = 0xa8261e;
    loadAnims(BASE_CLIPS);
    // os clipes que podem ainda não existir (socos, rolamento): só os que estão no servidor
    Promise.all(EXTRA_CLIPS.map(async (n) => { try { const r = await fetch(`assets/models/mixamo/anim/${n}.glb`, { method: 'HEAD' }); return r.ok ? n : null; } catch (e) { return null; } })).then((ok) => loadAnims(ok.filter(Boolean)));
    this.bind();
  }

  // a luta vale com a roupa de legionário ou de gladiador (ou quando a arena entrega as armas)
  get active() { const p = this.player; return !!this.forced || p.look === 'roma' || p.look === 'gladiador' || p.look === 'egito' || p.look === 'japao'; }
  get weapon() { return WEAPONS[this.right || 'punhos']; }

  bind() {
    const canvasDown = { t: 0, x: 0, y: 0 };
    addEventListener('keydown', (e) => {
      if (!this.active || e.repeat || this.player.locked) return;
      if (e.code === 'KeyF') this.request();
      if (e.code === 'KeyQ') this.blockHeld = true;
      if (e.code === 'KeyG') this.throwReq = true;
      if (e.code === 'KeyP') this.pickReq = true;
    });
    addEventListener('keyup', (e) => { if (e.code === 'KeyQ') this.blockHeld = false; });
    addEventListener('mousedown', (e) => {
      if (e.target.tagName !== 'CANVAS' || !this.active) return;
      if (e.button === 2) this.blockHeld = true;
      if (e.button === 0) { canvasDown.t = performance.now(); canvasDown.x = e.clientX; canvasDown.y = e.clientY; }
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 2) this.blockHeld = false;
      // clique curto e parado = golpe (arrastar continua girando a câmera)
      if (e.button === 0 && this.active && e.target.tagName === 'CANVAS' && performance.now() - canvasDown.t < 260 && Math.hypot(e.clientX - canvasDown.x, e.clientY - canvasDown.y) < 6 && !this.player.locked) this.request();
    });
    addEventListener('blur', () => { this.blockHeld = false; });
  }
  request() { this.queued = true; }

  // a arena entrega um conjunto de armas (ou devolve o controle à roupa, com null)
  equip(right, left, forced = true) { this.forced = forced ? { right, left } : null; this.right = right; this.left = left; this.drawn = !!forced; this.dress(); }
  // zera tudo o que é do momento da luta (fim da arena, desmaio): nada de golpe, empurrão ou atordoamento pendurado
  reset() {
    const P = this.player;
    this.clip = null; this.queued = false; this.block = false; this.blockHeld = false; this.stun = 0; this.invuln = 0; this.rolling = 0; this.drawDelay = 0; this.throwReq = false; this.pickReq = false;
    P.push = null; P.hitStop = 0; P.shake = 0; P.rig.once = null; P.speed = 0;
  }
  // as armas que a roupa traz
  defaults() { const L = this.player.look; if (this.forced) return; if (L === 'egito') { this.right = 'khopesh'; this.left = 'escudo_eg'; return; } if (L === 'japao') { this.right = 'katana'; this.left = null; return; } this.right = 'gladio'; this.left = 'escudo'; this.shieldColor = L === 'gladiador' ? 0x9a2a1e : 0xa8261e; }

  // as peças nas mãos do corpo atual (o corpo muda ao trocar de roupa)
  dress() {
    const P = this.player, M = this.meshes, r = P.rig;
    if (M.model !== r.model) { M.right?.parent?.remove(M.right); M.left?.parent?.remove(M.left); M.model = r.model; M.right = M.left = null; M.rk = M.lk = null; }
    const want = (side, kind, hand) => {
      const key = side === 'right' ? 'rk' : 'lk';
      const show = this.drawn && kind;
      if (M[key] !== (show ? kind : null)) {
        if (M[side]) { M[side].parent?.remove(M[side]); M[side] = null; }
        if (show) { const w = makeWeapon(kind, this.shieldColor); const h = w.userData.hand; w.rotation.set(...h.rot); w.position.set(...h.pos); hand.add(w); M[side] = w; }
        M[key] = show ? kind : null;
      }
    };
    const KP = P.look === 'japao' && P.katParts?.();
    if (KP) { // a katana da própria armadura: na mão (desembainhada), na cintura (embainhada) ou em lugar nenhum (arremessada)
      if (M.right && M.rk !== 'katana-armadura') { M.right.parent?.remove(M.right); M.right = null; }
      KP.hand.visible = this.drawn && this.right === 'katana'; KP.sheathed.visible = !this.drawn && this.right === 'katana'; M.rk = 'katana-armadura'; this.kp = KP;
    } else { this.kp = null; want('right', this.right, r.handR); }
    want('left', this.left, r.handL);
    this.stance();
  }
  // a postura de guarda (agachado, a arma à frente) só na arena ou logo depois de lutar; fora disso, de pé, relaxado
  // (antes o gladiador andava sempre curvado em guarda, e parecia estar levando um golpe)
  stance() {
    const r = this.player.rig, guard = this.drawn && (!!this.forced || performance.now() - (this.lastAct || 0) < 6000);
    if (this.right === 'katana') { const on = this.drawn && hasClip('kt_guarda'); if ((r.locoSet === KT_LOCO) !== on) r.locoSet = on ? KT_LOCO : null; return; }
    const want = guard ? (this.right ? 'gl_guarda' : hasClip('so_guarda') ? 'so_guarda' : 'gl_guarda') : null;
    if ((r.locoSet?.idle || null) !== want) r.locoSet = want ? { idle: want } : null;
  }

  // ---- a cada quadro, antes do explorador (main.js): liga o controle do explorador quando a luta vale
  // no celular: uma fileira de botões de luta acima dos outros (golpe, escudo segurando, arremesso)
  touchButtons(on) {
    const root = document.getElementById('touch'); if (!root) return;
    if (!this.tb) {
      const d = document.createElement('div'); this.tb = d;
      d.style.cssText = 'position:absolute;right:3vw;bottom:calc(4vh + 150px);display:flex;gap:10px;pointer-events:auto';
      const key = (code, type) => dispatchEvent(new KeyboardEvent(type, { code }));
      for (const [label, code, hold] of [['Golpe', 'KeyF'], ['Escudo', 'KeyQ', true], ['Arremessar', 'KeyG']]) {
        const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'width:auto;padding:0 12px;height:54px;border-radius:12px';
        b.addEventListener('touchstart', (e) => { e.preventDefault(); key(code, 'keydown'); if (!hold) key(code, 'keyup'); }, { passive: false });
        if (hold) for (const ev of ['touchend', 'touchcancel']) b.addEventListener(ev, (e) => { e.preventDefault(); key(code, 'keyup'); }, { passive: false });
        d.appendChild(b);
      }
      root.appendChild(d);
    }
    this.tb.style.display = on ? 'flex' : 'none';
  }
  tick() {
    const P = this.player, on = this.active && !P.swimming && !P.riding;
    this.touchButtons(on);
    if (on && this.lookSeen !== P.look) { this.lookSeen = P.look; if (!this.forced) this.defaults(); this.drawn = this.right !== 'katana' || !!this.forced; this.dress(); }
    if (on && this.right === 'katana' && this.drawn && !this.forced && !this.clip && !this.block && performance.now() - (this.lastAct || 0) > 9000) { this.drawn = false; this.dress(); } // (samurai parado: embainha) /* (legionário e gladiador andam sempre com as armas na mão) */
    if (!on) { if (P.combat === this) { P.combat = null; this.drawn = false; this.clip = null; this.dress(); } this.lookSeen = null; return; }
    P.combat = this;
    // o corpo foi refeito (troca de roupa, modelo que terminou de carregar): as armas voltam para a mão nova
    { const r = P.rig, Me = this.meshes; if (Me.model !== r.model || (Me.right && Me.rk !== 'katana-armadura' && Me.right.parent !== r.handR) || (Me.left && Me.left.parent !== r.handL) || (Me.rk === 'katana-armadura' && this.kp && this.kp !== P.katParts?.())) { if (Me.model === r.model) Me.model = null; this.dress(); } }
    this.space = this.drawn && P.onGround ? () => this.dodge() : null;
    this.moveScale = this.clip ? (this.hitI >= this.hits.length ? 0.6 : this.heavy ? 0.5 : 0.32) : this.block ? 0.45 : this.stun > 0 ? 0.15 : undefined;
  }

  // ---- dentro do update do explorador (depois do movimento, antes da animação)
  update(dt, speed, t) {
    const P = this.player;
    // caído (desmaio, derrota na arena): a luta não mexe no corpo; o golpe em curso some sem apagar a queda
    if (P.locked || this.health?.dead) { this.clip = null; this.queued = false; this.block = false; this.drawDelay = 0; this.updateFlying(dt); return; }
    if (this.stun > 0) this.stun -= dt;
    if (this.rolling > 0) { this.rolling -= dt; this.queued = false; }
    if (this.invuln > 0) this.invuln -= dt;
    // a defesa: segurando Q ou o botão direito
    if (this.blockHeld && this.clip && this.hitI >= this.hits.length) { this.clip = null; P.rig.once = null; } // (o fim do golpe se cancela no escudo)
    const blk = this.blockHeld && !this.clip && P.onGround && this.stun <= 0;
    if (blk) this.lastAct = performance.now();
    if (blk && !this.drawn) { this.drawn = true; this.dress(); }
    if (blk !== this.block) { this.block = blk; if (!blk && P.rig.once && /gl_defesa|gl_bloqueio|so_guarda|kt_defesa/.test(P.rig.once.name)) P.rig.once = null; }
    if (this.block) this.holdPose();
    // arremessar e pegar
    if (this.throwReq) { this.throwReq = false; if (!this.clip && this.right && this.stun <= 0) this.throwIt(); }
    if (this.pickReq) { this.pickReq = false; this.pickUp(); }
    // o golpe
    if (this.clip) {
      this.t += dt; const f = this.t / this.full;
      const hk = this.hits[this.hitI];
      if (hk !== undefined && f >= hk) { this.hitI++; this.strikeLands(); }
      if (this.queued && this.hitI >= this.hits.length && f > Math.max(0.5, this.hits[this.hits.length - 1] + 0.1)) { this.queued = false; this.next(); }
      else if (this.t >= this.dur) { if (P.rig.once?.name === this.clip) P.rig.once = null; this.clip = null; }
    } else if (this.drawDelay > 0) { this.drawDelay -= dt; if (this.drawDelay <= 0) this.next(this.heavyNext); }
    else if (this.queued && this.stun <= 0 && !(this.rolling > 0)) {
      this.queued = false;
      if (!this.drawn) { this.drawn = true; this.dress(); if (hasClip('gl_saca') && (this.right === 'gladio' || this.right === 'khopesh')) { playOnce(P.rig, 'gl_saca', 0.42); this.drawDelay = 0.3; this.heavyNext = speed > 5.5; this.combo = -1; } }
      if (!(this.drawDelay > 0)) { this.combo = -1; this.next(speed > 5.5); }
    }
    if (this.right === 'katana' && P.trail) { const kp = this.kp, cut = KT_CUT[this.clip], f = this.clip ? this.t / this.full : 0, cutting = !!cut && f > cut[0] && f < cut[1]; P.trail.update(kp?.tip, kp?.mid, cutting && !!kp); if (cutting && kp) P.events?.cut?.(this.clip, this.swingN, kp); }
    this.updateFlying(dt);
    this.stance();
    // a lança gira na mão: pegada de estocada no golpe e parado em guarda; de carregar andando, parado e no escudo
    const Wm = this.meshes.right;
    if (Wm?.userData.qThrust) { const thrust = (this.clip === 'lanca') || (P.rig.locoSet?.idle === 'gl_guarda' && speed < 0.4 && !this.block && !this.clip); Wm.quaternion.slerp(thrust ? Wm.userData.qThrust : Wm.userData.qCarry, Math.min(1, dt * 16)); }
  }

  holdPose() { // escudo erguido (ou a guarda dos punhos), parado no quadro certo enquanto se segura a tecla
    const r = this.player.rig, clip = this.right === 'katana' && hasClip('kt_defesa') ? 'kt_defesa' : hasClip('gl_defesa') ? 'gl_defesa' : this.right || this.left ? 'gl_bloqueio' : hasClip('so_guarda') ? 'so_guarda' : 'gl_bloqueio';
    if (!r.once || r.once.name !== clip) { playOnce(r, clip, 0.3); const a = r.act(clip); if (a && clip === 'gl_bloqueio') { a.time = a.getClip().duration * 0.22; a.timeScale = 0; } else if (a) a.setLoop(THREE.LoopRepeat, Infinity); }
    if (r.once) r.once.t = 0.3;
  }

  // o próximo golpe da sequência (ou o forte, correndo)
  next(heavy = false) {
    const W = this.weapon, P = this.player;
    let name = null;
    if (heavy && hasClip(W.heavy)) name = W.heavy;
    else { for (let k = 0; k < W.chain.length; k++) { this.combo = (this.combo + 1) % W.chain.length; if (hasClip(W.chain[this.combo])) { name = W.chain[this.combo]; break; } } }
    if (!name) name = this.right ? 'espada' : hasClip('gl_cabo') ? 'gl_cabo' : 'golpe';
    const a = P.rig.act(name); if (!a) return;
    // mira suave: vira para o adversário mais perto à frente
    const tg = this.nearestTarget(4.5, 1.4); if (tg) P.facing = Math.atan2(tg.pos.x - P.pos.x, tg.pos.z - P.pos.z);
    const isHeavy = heavy && name === W.heavy;
    const rate = isHeavy && W.heavyRate ? W.heavyRate : (!isHeavy && W.rates ? W.rates[this.combo] : 0) || CLIP_RATE[name] || RATE;
    this.clip = name; this.t = 0; this.full = a.getClip().duration / rate; this.dur = this.full * (CLIP_END[name] || 0.94); this.hits = HIT_AT[name] || [0.45]; this.hitI = 0; this.idle = 0; this.heavy = isHeavy;
    playOnce(P.rig, name, this.dur); a.timeScale = rate;
    this.swingAt = this.lastAct = performance.now(); this.swingN = (this.swingN || 0) + 1; this.onSwing?.(this);
    if (this.right) this.audio?.swoosh?.();
    if (name !== 'gl_chute') P.lunge(this.heavy ? 3.2 : 2.0, 0.18);
  }

  nearestTarget(maxD, arc) {
    const P = this.player, fx = Math.sin(P.facing), fz = Math.cos(P.facing); let best = null, bd = 1e9;
    for (const T of this.targets()) {
      if (!T.alive) continue;
      const dx = T.pos.x - P.pos.x, dz = T.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d > maxD + (T.rad ?? 0.5)) continue;
      const ang = Math.acos(clamp((dx * fx + dz * fz) / Math.max(d, 1e-3), -1, 1)); if (ang > arc && d > 1.1) continue;
      if (d < bd) { bd = d; best = T; }
    }
    return best;
  }

  // o golpe chega: acerta quem está no alcance e no arco da arma
  strikeLands() {
    const P = this.player, W = this.weapon, fx = Math.sin(P.facing), fz = Math.cos(P.facing);
    const reach = W.reach * (this.heavy ? 1.15 : 1) + (this.clip === 'gl_chute' ? -0.1 : 0);
    let any = false;
    for (const T of this.targets()) {
      if (!T.alive) continue;
      const dx = T.pos.x - P.pos.x, dz = T.pos.z - P.pos.z, d = Math.hypot(dx, dz);
      if (d > reach + (T.rad ?? 0.5)) continue;
      const ang = Math.acos(clamp((dx * fx + dz * fz) / Math.max(d, 1e-3), -1, 1)); if (ang > W.arc && d > 0.9) continue;
      const dmg = rr(W.dmg[0], W.dmg[1]) * (this.heavy ? 1.5 : 1) * (this.clip === 'gl_chute' ? 0.6 : 1);
      const res = T.hit(dmg, new THREE.Vector3(dx, 0, dz).normalize(), { heavy: this.heavy, kick: this.clip === 'gl_chute', weapon: this.right || 'punhos', from: P.pos });
      any = true;
      if (res === 'blocked') { P.hitStop = 0.06; P.shake = 0.05; this.audio?.clang?.(); }
      else { P.hitStop = this.heavy ? 0.11 : 0.07; P.shake = this.heavy ? 0.12 : 0.07; this.audio?.hit?.(); }
    }
    if (!any && this.right) { /* golpe no ar */ }
  }

  // esquiva: um salto curto para o lado (ou para trás), sem levar golpe no meio
  dodge() {
    const P = this.player; if (this.dodgeT > performance.now() || this.stun > 0 || (this.clip && this.hitI < this.hits.length)) return;
    if (this.clip) { this.clip = null; P.rig.once = null; } // (o fim do golpe se cancela na esquiva)
    this.dodgeT = performance.now() + 650; this.invuln = 0.42; this.lastAct = performance.now();
    let f = (P.key('ArrowUp', 'KeyW') ? 1 : 0) - (P.key('ArrowDown', 'KeyS') ? 1 : 0), s = (P.key('ArrowRight', 'KeyD') ? 1 : 0) - (P.key('ArrowLeft', 'KeyA') ? 1 : 0);
    if (!f && !s) f = -1; // parado: recua
    const fwX = -Math.sin(P.camYawW), fwZ = -Math.cos(P.camYawW);
    let dx = fwX * f - fwZ * s, dz = fwZ * f + fwX * s; const n = Math.hypot(dx, dz) || 1; dx /= n; dz /= n;
    const roll = hasClip('es_rola') && f > 0;
    if (roll) { // rolamento para a frente: ~4 m, sem levar golpe no meio do giro
      this.invuln = 0.75; this.dodgeT = performance.now() + 1250; P.lunge(3.8, 1.05, dx, dz);
      playOnce(P.rig, 'es_rola', 1.15); const a = P.rig.act('es_rola'); if (a) a.timeScale = 2.06;
    } else { // de lado ou para trás: o passo rápido de esquiva
      P.lunge(6.5, 0.28, dx, dz);
      const clip = hasClip('es_esquiva') ? 'es_esquiva' : 'aterrissar'; playOnce(P.rig, clip, clip === 'aterrissar' ? 0.42 : 0.62); const a = P.rig.act(clip); if (a && clip === 'es_esquiva') a.timeScale = 2.2;
    }
    this.rolling = roll ? 1.05 : 0;
    this.events?.dodge?.();
  }

  // ---- levar um golpe (a arena chama): devolve 'dodged' | 'blocked' | 'hit'
  receive(dmg, from, { heavy = false, unblockable = false, knock = 1 } = {}) {
    const P = this.player;
    if (this.invuln > 0 || this.health?.dead || P.locked) return 'dodged';
    const dx = from.x - P.pos.x, dz = from.z - P.pos.z, d = Math.hypot(dx, dz) || 1;
    const front = (dx * Math.sin(P.facing) + dz * Math.cos(P.facing)) / d > 0.3;
    if (this.block && front && !unblockable) {
      if (this.left === 'escudo' || this.left === 'escudo_eg') { playOnce(P.rig, 'gl_bloqueio', 0.32); P.lunge(-1.6 * knock, 0.12, dx / d, dz / d); this.audio?.clang?.(); P.shake = 0.05; if (heavy && rand() < 0.12) this.lose('left', from); return 'blocked'; }
      if (this.right === 'katana') { this.audio?.clang?.(); P.lunge(-1.4 * knock, 0.12, dx / d, dz / d); P.shake = 0.05; this.lastAct = performance.now(); const rest = Math.round(dmg * (heavy ? 0.2 : 0.1)); if (rest > 0) this.health?.damage(rest); return 'blocked'; } // (a katana apara o golpe: lâmina contra lâmina)
      dmg *= this.right ? 0.45 : 0.6; // (apara com a espada, ou a guarda dos punhos: tira só parte)
    }
    this.health?.damage(Math.round(dmg));
    if (this.health?.dead || P.locked) { this.clip = null; this.queued = false; return 'hit'; } // (o golpe que derruba: fica a queda, sem o tranco por cima)
    this.clip = null; this.queued = false; this.stun = heavy ? 0.45 : 0.25;
    playOnce(P.rig, heavy && hasClip('gl_cabeca') ? 'gl_cabeca' : hasClip('gl_impacto') ? 'gl_impacto' : 'golpe', heavy ? 0.6 : 0.42);
    P.lunge(-(heavy ? 3.4 : 2.0) * knock, 0.16, dx / d, dz / d); P.shake = heavy ? 0.14 : 0.08;
    this.blood?.spray(P.pos.clone().setY(P.pos.y + 1.2), new THREE.Vector3(-dx / d, 0, -dz / d), heavy ? 18 : 10);
    // o golpe forte pode arrancar a arma da mão
    if (heavy && this.right && rand() < 0.3) this.lose('right', from);
    return 'hit';
  }

  // a arma voa da mão e cai na areia, a uns metros
  lose(side, from) {
    const kind = this[side]; if (!kind) return;
    this[side] = null; this.dress();
    const P = this.player, a = Math.atan2(P.pos.x - from.x, P.pos.z - from.z) + rr(-0.9, 0.9), dist = rr(2.5, 5);
    this.drop(kind, P.pos.x + Math.sin(a) * dist, P.pos.z + Math.cos(a) * dist, P.pos.y + 1.3);
    this.toast?.(side === 'right' ? `O golpe arranca ${WEAPONS[kind].name} da sua mão! Pegue de volta (P) ou lute no soco.` : 'O golpe arranca o escudo do seu braço!', 'quest', 4500);
  }
  // deixa uma arma no chão (cai do alto, com um quique)
  drop(kind, x, z, fromY = null, color = this.shieldColor) {
    const g = lying(kind, color), y = groundAt(x, z, (fromY ?? 30) + 1);
    g.position.set(x, fromY ?? y, z); this.scene.add(g);
    const it = { g, kind, color, y, vy: fromY != null ? 2.5 : 0, spin: fromY != null ? rr(4, 9) : 0 }; this.ground.push(it); return it;
  }
  clearGround() { for (const it of this.ground) this.scene.remove(it.g); this.ground = []; for (const f of this.flying) this.scene.remove(f.g); this.flying = []; }
  nearestGround(p, r = 1.8) { let best = null, bd = r; for (const it of this.ground) { if (it.vy) continue; const d = Math.hypot(it.g.position.x - p.x, it.g.position.z - p.z); if (d < bd) { bd = d; best = it; } } return best; }

  pickUp() {
    const P = this.player, it = this.nearestGround(P.pos); if (!it) return false;
    this.ground.splice(this.ground.indexOf(it), 1); this.scene.remove(it.g);
    const side = /^escudo/.test(it.kind) ? 'left' : 'right';
    if (this[side]) this.drop(this[side], P.pos.x + Math.sin(P.facing + 2.4) * 0.8, P.pos.z + Math.cos(P.facing + 2.4) * 0.8); // (troca: a que estava na mão fica no chão)
    if (it.kind === 'escudo') this.shieldColor = it.color;
    this[side] = it.kind; this.drawn = true; this.dress();
    playOnce(P.rig, 'pegar', 0.55);
    this.toast?.(`Você pegou ${/^escudo/.test(it.kind) ? 'o escudo' : WEAPONS[it.kind].name}.`, '', 2200);
    return true;
  }

  // arremesso: a lança (ou o gládio) voa para o alvo que a câmera está mirando (ou, sem câmera apontada, o mais perto
  // à frente). Mira no ponto onde o alvo VAI estar quando a arma chegar (as feras e os gladiadores não param quieto: a
  // mira no lugar de agora errava quase sempre), e no voo a arma corrige um pouco o rumo, como quem acerta a mão.
  aimTarget() {
    const P = this.player, cf = { x: -Math.sin(P.camYawW), z: -Math.cos(P.camYawW) }; let best = null, bs = 1e9;
    for (const T of this.targets()) {
      if (!T.alive) continue;
      const dx = T.pos.x - P.pos.x, dz = T.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d > 32 || d < 0.3) continue;
      const ang = Math.acos(clamp((dx * cf.x + dz * cf.z) / d, -1, 1)); if (ang > 0.55) continue;
      const s = ang * 14 + d; if (s < bs) { bs = s; best = T; }
    }
    return best || this.nearestTarget(28, 0.6);
  }
  throwIt() {
    const P = this.player, kind = this.right;
    const tg = this.aimTarget();
    if (tg) P.facing = Math.atan2(tg.pos.x - P.pos.x, tg.pos.z - P.pos.z);
    else if (Math.abs(((P.camYawW + Math.PI - P.facing) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI) < 1.6) P.facing = P.camYawW + Math.PI; // (sem alvo: para onde a câmera olha)
    const clip = hasClip('gl_alto') ? 'gl_alto' : 'espada';
    playOnce(P.rig, clip, 0.55); { const a = P.rig.act(clip); if (a) a.timeScale = 1.6; }
    this.right = null; this.dress();
    const g = makeWeapon(kind); g.rotation.set(Math.PI / 2, 0, 0); // (a ponta para a frente)
    const holder = new THREE.Group(); holder.add(g); this.scene.add(holder);
    const from = P.pos.clone().add(new THREE.Vector3(Math.sin(P.facing) * 0.6, 1.6, Math.cos(P.facing) * 0.6));
    const sp = kind === 'lanca' ? 26 : 20;
    let to;
    if (tg) { // onde o alvo vai estar (duas voltas: o tempo de voo depende do ponto, e o ponto do tempo)
      const vel = this.tvel.get(tg)?.v || new THREE.Vector3(); to = tg.pos.clone().setY(tg.aimY ?? tg.pos.y + 1.0);
      for (let k = 0; k < 3; k++) { const tt = from.distanceTo(to) / sp; to = tg.pos.clone().addScaledVector(vel, Math.min(tt, 1.2)).setY(tg.aimY ?? tg.pos.y + 1.0); }
    } else to = from.clone().add(new THREE.Vector3(Math.sin(P.facing) * 22, -0.4, Math.cos(P.facing) * 22));
    const d = from.distanceTo(to), tt = Math.max(0.12, d / sp);
    const v = to.clone().sub(from).divideScalar(tt); v.y += 0.5 * 9.8 * tt; // (cai um pouco: sobe antes)
    holder.position.copy(from); holder.lookAt(from.clone().add(v));
    this.flying.push({ g: holder, kind, v, life: 3, target: tg, spin: kind === 'gladio' || kind === 'khopesh' ? 18 : kind === 'katana' ? 15 : 0, prev: from.clone() });
    this.audio?.swoosh?.();
  }
  updateFlying(dt) {
    // a velocidade de cada alvo (para a mira na frente dele)
    if (dt > 0) for (const T of this.targets()) { const r = this.tvel.get(T); if (!r) { this.tvel.set(T, { p: T.pos.clone(), v: new THREE.Vector3() }); continue; } const nv = T.pos.clone().sub(r.p).divideScalar(dt); if (nv.lengthSq() < 400) r.v.lerp(nv, Math.min(1, dt * 8)); r.p.copy(T.pos); }
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i], g = f.g; f.life -= dt;
      // no voo, a arma corrige o rumo para o alvo (pouco: quem mirou errado ainda erra)
      const T0 = f.target;
      if (T0?.alive) { const aim = T0.pos.clone().setY(T0.aimY ?? T0.pos.y + 1); const to = aim.sub(g.position); const dist = to.length(); if (dist > 0.8) { const spd = f.v.length(); const want = to.normalize().multiplyScalar(spd); want.y += 9.8 * Math.min(0.5, dist / spd) * 0.5; f.v.lerp(want, Math.min(1, dt * 3.5)); } }
      f.v.y -= 9.8 * dt; f.prev.copy(g.position); g.position.addScaledVector(f.v, dt);
      g.lookAt(g.position.clone().add(f.v)); if (f.spin) g.children[0].rotation.x += f.spin * dt;
      // acerta quem estiver no caminho (o trecho inteiro do quadro, não só o ponto: a lança é rápida)
      let done = false;
      for (const T of this.targets()) {
        if (!T.alive) continue;
        const c = new THREE.Vector3(T.pos.x, T.aimY ?? T.pos.y + 1, T.pos.z), seg = g.position.clone().sub(f.prev), L2 = seg.lengthSq();
        const u = L2 > 1e-6 ? clamp(c.clone().sub(f.prev).dot(seg) / L2, 0, 1) : 1, q = f.prev.clone().addScaledVector(seg, u);
        const hx = Math.hypot(c.x - q.x, c.z - q.z), dy = c.y - q.y;
        if (hx < (T.rad ?? 0.5) + 0.4 && Math.abs(dy) < 1.15) { g.position.copy(q); T.hit(WEAPONS[f.kind].thrown * rr(0.85, 1.15), f.v.clone().setY(0).normalize(), { heavy: true, thrown: true, weapon: f.kind, from: q.clone() }); done = true; this.player.hitStop = 0.08; break; }
      }
      const gy = groundAt(g.position.x, g.position.z, g.position.y + 0.5);
      if (done || g.position.y <= gy + 0.05 || f.life <= 0) { this.scene.remove(g); this.flying.splice(i, 1); this.drop(f.kind, g.position.x, g.position.z, Math.max(gy, g.position.y)); }
    }
    // as armas caindo no chão
    for (const it of this.ground) {
      if (!it.vy && it.g.position.y <= it.y + 0.001) continue;
      it.vy -= 9.8 * dt; it.g.position.y += it.vy * dt; it.g.rotation.y += it.spin * dt;
      if (it.g.position.y <= it.y) { it.g.position.y = it.y; if (Math.abs(it.vy) > 2) { it.vy = -it.vy * 0.3; it.spin *= 0.4; } else { it.vy = 0; it.spin = 0; } }
    }
  }

  // a dica das teclas (main.js junta na linha de baixo)
  hint() {
    if (!this.active || this.player.locked) return '';
    const P = this.player, it = this.nearestGround(P.pos);
    const parts = [`<kbd>F</kbd> Golpe (${this.right ? WEAPONS[this.right].name.replace(/^o |^a /, '') : 'soco'})`, `<kbd>Q</kbd> ${this.left ? 'Escudo' : 'Defesa'}`];
    if (this.drawn) parts.push('<kbd>Espaço</kbd> Esquiva');
    if (this.right && (this.forced || this.ground.length)) parts.push('<kbd>G</kbd> Arremessar');
    if (it) parts.unshift(`<kbd>P</kbd> Pegar ${/^escudo/.test(it.kind) ? 'o escudo' : WEAPONS[it.kind].name}`);
    return parts.join(' &nbsp;·&nbsp; ');
  }
}
