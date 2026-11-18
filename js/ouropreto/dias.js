// Os dias de Vila Rica (Etapa 6): C passa para o próximo dia marcado — de fevereiro a julho de 1789, em 14 dias. Em
// cada um o que muda está na rua: gente, soldados, sinos, portas, procissões. Os avisos de acontecimento só aparecem
// para quem está no lugar. Depois do 14, o cartão de 1792, e os dias recomeçam.
// Aqui também ficam as pessoas com conversa longa (personagens.js): cada uma no seu lugar, nos dias em que está na vila.
import * as THREE from 'three';
import { makeHumanoid, animateHumanoid, playOnce } from '../comum/mixamo.js';
import { creature } from '../comum/fauna.js';
import { groundAt, terrainAt, waterAt } from '../comum/collision.js';
import { STREETS, STREAMS, PLACES, pointAt, streetAt, terrainHeight } from './terrain.js';
import { labelTexture, markerTexture } from './textures.js';
import { look } from './gente.js';
import { NPCS } from './personagens.js';
import { rr, rand, pick, angleLerp } from '../comum/util.js';

const V3 = THREE.Vector3;
export const DIAS = [
  { n: 1, fase: 'tarde', data: 'Fevereiro de 1789', nome: 'Um dia comum', desc: 'A vida de sempre: as tropas chegando, as quitandeiras na praça, o trabalho nas lavras. Na boca de todos, a derrama — a cobrança, de uma vez, do ouro do quinto que falta. Na Rua Direita, um alferes fala alto demais.' },
  { n: 2, fase: 'manha', data: 'Quarta-feira de Cinzas, 1789', nome: 'Quarta-feira de Cinzas', desc: 'Começa a Quaresma. As igrejas enchem cedo para a imposição das cinzas. No adro de São Francisco, o mestre Antônio Francisco já trabalha antes do sol.' },
  { n: 3, fase: 'tarde', data: 'Fevereiro de 1789', nome: 'Chega a tropa', desc: 'Uma tropa de mulas sobe do Rio de Janeiro pelo Caminho Novo, com sal, ferro, tecido e vinho. Entra na vila pela estrada do Rio e descarrega no Largo dos Contos.' },
  { n: 4, fase: 'manha', data: 'Começo de março de 1789', nome: 'O alferes parte para o Rio', desc: 'O alferes Joaquim José da Silva Xavier, o Tiradentes, desce para o Rio de Janeiro, levando o cavalo pela rédea. A tropa volta com ele pela estrada.' },
  { n: 5, fase: 'noite', data: 'Março de 1789', nome: 'Noite de comédia — e de conversa baixa', desc: 'Noite de récita na Casa da Ópera, ao lado do Carmo. Numa casa da Rua de São José, homens de posses conversam até tarde, de janela fechada. Quem passa junto à porta ouve pedaços.' },
  { n: 6, fase: 'manha', data: 'Meados de março de 1789', nome: 'O bando: a derrama suspensa', desc: 'Na praça, ao som do tambor, um oficial lê o bando do governador, o Visconde de Barbacena: a derrama está suspensa. O povo respira aliviado. Os que conspiravam perdem o pretexto — e começam a ter medo.' },
  { n: 7, fase: 'tarde', data: 'Fim de março de 1789', nome: 'Boatos', desc: 'Corre que houve uma denúncia. Um dos conjurados, Joaquim Silvério dos Reis, teria contado tudo ao governador. Há mais dragões nas ruas, e as conversas param quando um soldado passa.' },
  { n: 8, fase: 'noite', data: 'Semana Santa, abril de 1789', nome: 'Semana Santa', desc: 'Procissão à luz de velas: os irmãos de opa, a cruz com o sudário roxo, as matracas no lugar dos sinos, que ficam mudos. Senhores, escravos, soldados e quitandeiras andam juntos pelas ladeiras.' },
  { n: 9, fase: 'manha', data: 'Abril de 1789', nome: 'Dia de lavra', desc: 'Dia de trabalho pesado no Morro da Queimada: o desmonte com água, o cascalho lavado nas canoas, as galerias. Mais gente nas lavras, e o feitor de olho.' },
  { n: 10, fase: 'tarde', data: 'Meados de maio de 1789', nome: 'A notícia do Rio', desc: 'Chega a notícia: o alferes Silva Xavier foi preso no Rio de Janeiro. Nos quintais, à tardinha, sobe fumaça de papel queimado. Ninguém quer guardar carta nenhuma.' },
  { n: 11, fase: 'manha', data: '23 de maio de 1789', nome: 'A prisão de Gonzaga', desc: 'Antes do sol, os dragões entram na casa do Doutor Tomás Antônio Gonzaga, na Rua do Ouvidor, poucos dias antes do casamento dele com Maria Doroteia. Levam-no preso pela rua, e a vila sai às portas para ver.' },
  { n: 12, fase: 'tarde', data: 'Junho de 1789', nome: 'A devassa', desc: 'A devassa está aberta: casas revistadas, papéis apreendidos, gente chamada a depor. A Casa dos Contos virou prisão, com guarda à porta. E a procissão de Corpus Christi passa no meio de tudo, com o pálio e a custódia.' },
  { n: 13, fase: 'manha', data: '4 de julho de 1789', nome: 'A morte de Cláudio', desc: 'Cláudio Manuel da Costa é achado morto no cubículo debaixo da escada da Casa dos Contos. A versão oficial diz que ele se matou; o povo murmura outra coisa. Os sinos dobram.' },
  { n: 14, fase: 'tarde', data: 'Outubro de 1789', nome: 'A festa do Rosário — e a vila com medo', desc: 'Os presos foram levados para o Rio, e fala-se baixo na vila. Mas outubro é mês de Nossa Senhora do Rosário: no adro da igreja em obra, a irmandade dos pretos coroa o seu rei e a sua rainha, com a bandeira, os tambores, o canto e a roda de dança. É a festa que nem o medo cancela.' },
];
const FIM = { tag: 'Depois de 1789', name: 'A sentença', era: 'Rio de Janeiro, abril de 1792', story: 'A devassa durou três anos. Em abril de 1792 saiu a sentença: os principais conjurados foram condenados à morte; a rainha Dona Maria I trocou a pena de quase todos por degredo na África. Só o alferes Joaquim José da Silva Xavier, o Tiradentes — o único que assumiu tudo —, foi enforcado no Rio de Janeiro, em 21 de abril de 1792. Tomás Antônio Gonzaga foi degredado para Moçambique, e Maria Doroteia nunca se casou.', foot: 'Aperte C para recomeçar os dias, desde fevereiro de 1789.' };
const SAVE = 'cidades-historicas:ouropreto:dia';

// as falas da rua que mudam com o tempo (somadas às de sempre, em metade das conversas)
const BOATOS = {
  derrama: ['Dizem que a derrama sai este mês. Vão cobrar de cada um o ouro que falta para as cem arrobas.', 'Meu compadre diz que, se lançarem a derrama, o povo se levanta. Eu digo que o povo paga e reclama, como sempre.'],
  alivio: ['Suspenderam a derrama! Leram na praça, com tambor e tudo. Graças a Deus!', 'Suspenderam por ora. "Por ora", disse o oficial. Rei não esquece dívida.'],
  traicao: ['Corre que um dos doutores entregou os outros ao governador. Silvério, dizem o nome.', 'Viu quantos dragões na rua? Isso não é por causa de contrabando, não.'],
  medo: ['Prenderam o alferes no Rio. Quem falou com ele que se cuide.', 'Ontem queimaram papel em meio quintal da vila. Eu queimei uma carta de amor, por via das dúvidas.'],
  devassa: ['Revistaram a casa do vizinho. Levaram até os livros de reza.', 'Estão chamando gente para depor na devassa. Quem não sabe de nada é quem mais treme.'],
  claudio: ['Morreu o Doutor Cláudio na prisão. Dizem que se enforcou com uma liga. Dizem.', 'Um homem daquela idade, daquele juízo, tirar a própria vida? Cada um acredita no que quiser.'],
  depois: ['Levaram todos para o Rio. Agora é esperar a sentença.', 'A vila está quieta demais. Até a quitandeira fala baixo.'],
};
const BOATO_DO_DIA = (d) => (d <= 5 ? 'derrama' : d === 6 ? 'alivio' : d <= 9 ? 'traicao' : d <= 11 ? 'medo' : d === 12 ? 'devassa' : d === 13 ? 'claudio' : 'depois');

export class Dias {
  constructor({ scene, city, gente, sky, ui, audio, quests, glow }) {
    Object.assign(this, { scene, city, gente, sky, ui, audio, quests, glow });
    this.day = Math.max(1, Math.min(14, +localStorage.getItem(SAVE) || 1)); this.ev = []; this.t = 0; this.notes = new Set();
    this.buildCard(); this.spawnKey();
  }
  // ---------------- o cartão do dia ----------------
  buildCard() {
    const css = document.createElement('style');
    css.textContent = `#dia-card{position:fixed;inset:0;z-index:38;display:grid;place-items:center;background:rgba(8,5,2,.55);backdrop-filter:blur(3px);padding:16px}
      #dia-card .box{width:min(720px,100%);color:#1d140c;border-radius:12px;padding:26px 30px;background:radial-gradient(ellipse at 20% 0%,#f8eed6,#efe0bd 55%,#e2cc9c);border:1px solid #b8914c;box-shadow:0 30px 80px rgba(0,0,0,.6)}
      #dia-card .tag{font-family:Cinzel,serif;letter-spacing:.3em;text-transform:uppercase;font-size:.78rem;color:#8a5a14}
      #dia-card h2{font-family:Cinzel,serif;font-size:1.9rem;margin:.2em 0 .1em;color:#3a2410}
      #dia-card .era{font-style:italic;font-size:1.15rem;color:#6a4a20}
      #dia-card p{font-size:1.25rem;line-height:1.45;margin:.8em 0}
      #dia-card .mus{font-size:1.05rem;color:#5a4020;border-top:1px solid rgba(120,80,30,.3);padding-top:.6em}
      #dia-card button{margin-top:1rem;padding:.75rem 1.4rem;border-radius:8px;border:1px solid #8a5a14;background:linear-gradient(180deg,#ffe39a,#e8b84a 60%,#b8832a);font-family:Cinzel,serif;font-weight:700;cursor:pointer}`;
    document.head.appendChild(css);
    const c = (this.card = document.createElement('div')); c.id = 'dia-card'; c.hidden = true;
    c.innerHTML = '<div class="box"><div class="tag"></div><h2></h2><div class="era"></div><p class="st"></p><div class="mus"></div><button>Continuar (Enter)</button></div>';
    c.querySelector('button').onclick = () => this.closeCard(); document.body.appendChild(c);
    addEventListener('keydown', (e) => { if (!c.hidden && (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape')) { e.preventDefault(); e.stopImmediatePropagation(); this.closeCard(); } }, true);
  }
  get cardOpen() { return !this.card.hidden; }
  showCard({ tag, name, era, story, foot }) { const c = this.card; c.querySelector('.tag').textContent = tag; c.querySelector('h2').textContent = name; c.querySelector('.era').textContent = era; c.querySelector('.st').textContent = story; c.querySelector('.mus').textContent = foot || ''; c.hidden = false; }
  closeCard() { this.card.hidden = true; }
  get info() { return DIAS[this.day - 1]; }
  label() { return `${this.sky.current === 'manha' ? 'Manhã' : this.sky.current === 'tarde' ? 'Tarde' : 'Noite'} · ${this.info.data}`; }

  // ---------------- passar o dia ----------------
  start() { this.go(this.day, false); }
  next() {
    if (this.day === 14 && !this.fimVisto) { this.fimVisto = true; this.showCard(FIM); return; }
    this.fimVisto = false; this.go(this.day === 14 ? 1 : this.day + 1, true);
  }
  go(n, card) {
    this.day = n; try { localStorage.setItem(SAVE, String(n)); } catch (e) { /* (sem armazenamento: começa do dia 1) */ }
    const D = this.info; this.sky.goTo(D.fase); this.ui.setTime(this.label());
    this.gente.day = n; this.gente.boato = BOATOS[BOATO_DO_DIA(n)];
    this.clearEvents(); this.notes.clear(); this.buildEvents(n);
    for (const k of this.key) { const on = !k.def.days || k.def.days.includes(n); k.rig.root.userData.off = !on; }
    if (card) this.showCard({ tag: `Vila Rica — dia ${n} de 14`, name: D.nome, era: D.data, story: D.desc, foot: 'Aperte C para o próximo dia marcado e T para mudar a hora. Os acontecimentos acontecem em lugares da vila: vá até lá para ver.' });
  }
  // aviso de acontecimento: só para quem está no lugar (uma vez por dia)
  note(id, x, z, r, text, objective) { if (this.notes.has(id) || !this.pp || Math.hypot(this.pp.x - x, this.pp.z - z) > r) return false; this.notes.add(id); if (text) this.ui.toast(text, 'quest', 8000); if (objective) this.quests.complete(objective); return true; }

  // ---------------- as pessoas com conversa longa ----------------
  houseNear(x, z, f = () => true) { let best = null, bd = Infinity; for (const h of this.city.houses) { if (!h.open || h.kind === 'casebre' || !f(h)) continue; const d = Math.hypot(h.x - x, h.z - z); if (d < bd) { bd = d; best = h; } } return best; }
  where(id) {
    const C = this.city, S = C.spots || {}, P = PLACES, ch = (cid) => (C.churches || []).find((q) => q.id === cid);
    const doorOf = (h, side = 0) => [h.door[0] + Math.cos(h.ry) * side, h.door[1] - Math.sin(h.ry) * side, h.ry];
    switch (id) {
      case 'saofrancisco': { const c = ch('saofrancisco'); let ox = c.door[0] - c.x, oz = c.door[1] - c.z; const l = Math.hypot(ox, oz) || 1; ox /= l; oz /= l; return [c.door[0] + ox * 5.2 - oz * 2.2, c.door[1] + oz * 5.2 + ox * 2.2, Math.atan2(ox, oz)]; }
      case 'gonzaga': { const L = STREETS.claudio, p = pointAt(L.pts, L.len * 0.55); this.casaGonzaga = this.houseNear(p.x, p.z); return doorOf(this.casaGonzaga, 0.9); }
      case 'marilia': { this.casaMarilia = this.houseNear(352, 78); return doorOf(this.casaMarilia, 0.9); }
      case 'claudio': { this.casaClaudio = this.houseNear(-330, 50); return doorOf(this.casaClaudio, 0.9); }
      case 'venda': { this.venda = this.houseNear(-112, 16); return doorOf(this.venda, 1.0); }
      case 'contos': { const e = S.contosEscritorio, h = this.houseNear(-277, 14, () => true); return [e[0] + 1.5, e[1] - 1.1, Math.PI, h ? h.y : undefined]; }
      case 'rosario': return [P.rosario.x + 6, P.rosario.z - P.rosario.d / 2 + 6, Math.PI];
      case 'ribeirao': { const R = STREAMS.ribeirao; for (let k = 0; k < 60; k++) { const p = pointAt(R.pts, 790 + 10 + k * 2), l = Math.hypot(p.dx, p.dz) || 1, nx = -p.dz / l, nz = p.dx / l; for (let o = R.hw + 0.4; o < R.hw + 6; o += 0.3) { const x = p.x - nx * o, z = p.z - nz * o, g = groundAt(x, z, terrainAt(x, z) + 0.5); if (!streetAt(x, z) && this.waterAt(x, z) < g + 0.15) return [x, z, Math.atan2(nx, nz)]; } } return [0, 180, 0]; }
      case 'praca': { const pl = S.pelourinho || [-8, 40]; return [pl[0] + 4, pl[1] - 4, -0.6]; }
      case 'queimada': return [P.queimada.x - 6, P.queimada.z + 4, Math.PI * 0.8];
      case 'pilar': { const c = ch('pilar'), ix = -Math.sin(c.ry), iz = -Math.cos(c.ry); return [c.door[0] - ix * 2.4 - iz * 2.2, c.door[1] - iz * 2.4 + ix * 2.2, Math.atan2(-ix, -iz)]; }
      case 'palacio': return [S.palacio[0] + 5, S.palacio[1] - 1.2, 0.3];
      case 'opera': { const h = this.houseNear(-100, 121.5); return doorOf(h, 1.4); }
      case 'contos_largo': return [P.contos.x + 3, P.contos.z - 4, -1.2];
    }
    return [0, 0, 0];
  }
  spawnKey() {
    const G = this.gente; this.key = G.key = [];
    this.waterAt = waterAt;
    const mtex = markerTexture('!');
    for (const def of NPCS) {
      const [x, z, ry, y] = this.where(def.where);
      const h = G.addHuman({ ...def.look }, x, z, ry, y);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(def.name, def.title), transparent: true, depthWrite: false })); label.scale.set(2.8, 0.7, 1); label.position.y = 2.35; label.renderOrder = 5; h.rig.root.add(label);
      const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: mtex, transparent: true, depthWrite: false })); marker.scale.setScalar(0.8); marker.position.y = 2.95; h.rig.root.add(marker);
      this.key.push({ def, ...h, ry, label, marker, talking: false, kind: 'npc', mode: def.id === 'minerador_goncalo' || def.id === 'faiscador_bento' ? '@pegar' : 'idle' });
      (this.city.spots ||= {})['npc_' + def.id] = [x, z];
    }
  }

  // ---------------- os acontecimentos de cada dia ----------------
  rig(kind, lk, x, z, ry, y) { const r = makeHumanoid(lk || look(kind)); const p = new V3(x, y ?? groundAt(x, z, terrainAt(x, z) + 1.6), z); r.root.position.copy(p); r.root.rotation.y = ry; this.scene.add(r.root); const e = { r, pos: p, ry, mode: 'idle' }; this.ev.push(e); return e; }
  mesh(obj) { this.scene.add(obj); this.ev.push({ obj }); return obj; }
  clearEvents() { this.levantar(); this.tiraVela(); this.festa = null; this.pelo = null; this.capitao = null; this.galeria = null; for (const e of this.ev) { if (e.r) this.scene.remove(e.r.root); if (e.obj) this.scene.remove(e.obj); if (e.c) this.scene.remove(e.c.holder); } this.ev = []; this.proc = null; this.escolta = null; this.partida = null; this.bando = null; this.dobre = null; this.fogos = null; }
  // um caminho (polilinha de pontos [x,z]) com a posição de quem está a s metros dele
  path(pts) { const P = pts.map(([x, z]) => new V3(x, 0, z)), cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + P[i].distanceTo(P[i - 1])); return { P, cum, L: cum[cum.length - 1] }; }
  at(pa, s) { s = Math.max(0, Math.min(pa.L, s)); let i = 1; while (i < pa.cum.length - 1 && pa.cum[i] < s) i++; const a = pa.P[i - 1], b = pa.P[i], t = (s - pa.cum[i - 1]) / (pa.cum[i] - pa.cum[i - 1] || 1); return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, h: Math.atan2(b.x - a.x, b.z - a.z) }; }
  yAt(x, z) { const st = streetAt(x, z); return st ? groundAt(x, z, st.y + 0.45) : groundAt(x, z, terrainAt(x, z) + 1.6); }
  // a chama: um ponto de luz como as velas dos altares (um sprite comum virava um quadrado preto na passada da sombra de contato)
  flame(size = 0.3, color = 0xffb860) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ map: this.glow, color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); p.frustumCulled = false; return p; }
  vela(r, hand = 'L') { const s = this.flame(0.28); s.position.set(0, 0.25, 0.05); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0xf4ecd8, roughness: 0.6 })); c.position.y = 0.08; (hand === 'L' ? r.handL : r.handR).add(c, s); }

  buildEvents(n) {
    const C = this.city, S = C.spots || {}, P = PLACES;
    // a guarda dobrada da devassa em diante: mais dragões (os de gente.js com 'when')
    // ---- dia 4: o alferes leva o cavalo pela rédea, descendo a Rua Direita e a de São José até a estrada do Rio
    if (n === 4) {
      const pa = this.path([...STREETS.direita.pts, ...STREETS.saojose.pts, ...STREETS.rosario.pts, ...STREETS.rio.pts]);
      const def = NPCS.find((q) => q.id === 'tiradentes'), t = this.rig('dragao', { ...def.look }, pa.P[0].x, pa.P[0].z, 0); this.partida = { pa, s: 0, t, horse: null };
      creature('cavalo', 2.3, { still: true, tint: [0.75, 0.55, 0.42] }).then((c) => { if (!c || !this.partida) return; const w = c.clips.find((q) => /walk/i.test(q.name)) || c.clips[0]; c.mixer.clipAction(w).play(); c.holder.traverse((o) => { if (o.isMesh) o.castShadow = true; }); this.scene.add(c.holder); this.ev.push({ c }); this.partida.horse = c; });
      if (this.gente.tropa) { this.gente.tropa.s = this.gente.tropa.L - 2; this.gente.tropa.dir = -1; this.gente.tropa.wait = 25; }
    }
    if (n === 3 && this.gente.tropa) { this.gente.tropa.s = 2; this.gente.tropa.dir = 1; this.gente.tropa.wait = 0; } // (a tropa entra na vila)
    // ---- dia 5: a reunião ouvida à porta (Rua de São José) e a noite de comédia na Casa da Ópera
    if (n === 5) {
      this.reuniao = { h: this.casaClaudio, i: -1, t: 0 };
      const all = S.operaSeats || [], idx = all.map((_, i) => i).sort(() => rand() - 0.5).slice(0, 18); this.ocupados = new Set(idx); // (os lugares que sobram ficam para o explorador)
      for (const [x, y, z, ry] of idx.map((i) => all[i])) { const k = pick(['senhor', 'senhor', 'senhora', 'homem', 'senhora']); const e = this.rig(k, null, x, z, ry, y - 0.46); e.mode = 'sit'; if (e.r.skirt) e.r.skirt.visible = false; }
      for (const [x, y, z, ry] of S.operaStage || []) { const e = this.rig('ator', { outfit: 'casaca', coat: pick([0x8a2a2a, 0x2a3a6a]), vest: 0xe0c060, legs: 0x2a2228, stockings: 0xf0ece2, hair: 'rabicho', skin: 0xa87652 }, x, z, ry, y); e.mode = 'talk'; }
    }
    // ---- dia 6: o bando na praça — o tambor, o oficial lendo, o povo em volta
    if (n === 6) {
      const pl = S.pelourinho || [-8, 40], cx = pl[0] + 2, cz = pl[1] - 10;
      const of = this.rig('dragao', { ...look('dragao'), extras: [] }, cx, cz, Math.PI); of.mode = 'talk';
      const tb = this.rig('dragao', { ...look('dragao'), extras: [] }, cx - 1.4, cz + 0.4, Math.PI);
      const drum = new THREE.Group(), red = new THREE.MeshStandardMaterial({ color: 0x8a2a20, roughness: 0.7 }), wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.8 });
      drum.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 16), red)); for (const s of [-1, 1]) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.035, 16), wood); ring.position.y = s * 0.15; drum.add(ring); }
      drum.position.set(0, 0.85, 0.28); drum.rotation.x = 0.25; tb.r.root.add(drum);
      for (let i = 0; i < 16; i++) { const a = Math.PI + (i / 15 - 0.5) * 2.4, d = rr(4, 8), x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d; const e = this.rig(pick(['homem', 'homem', 'mulher', 'escravo', 'senhor', 'escrava', 'quitandeira']), null, x, z, Math.atan2(cx - x, cz - z)); e.mode = rand() < 0.3 ? 'talk' : 'idle'; }
      this.bando = { x: cx, z: cz, i: -1, t: 0 };
    }
    // ---- as cenas da escravidão: o capitão do mato (3), o pelourinho (7 e 12), o tronco, a gargalheira e a galeria (9)
    if (n === 3) this.capitaoDoMato();
    if (n === 7 || n === 12) this.pelourinho();
    if (n === 9) this.lavra();
    if (n === 14) this.festaRosario();
    // ---- dia 8 e dia 12: as procissões
    if (n === 8 || n === 12) this.procissao(n === 8);
    // ---- dia 10: papel queimando nos quintais
    if (n === 10) { const Y = (C.yards || []).slice().sort(() => rand() - 0.5).slice(0, 6); this.fogos = [];
      for (const r of Y) { const x = r.x, z = r.z, y = terrainHeight(x, z), g = new THREE.Group(); const fire = this.flame(1.1, 0xff8a3a); fire.position.y = 0.35; g.add(fire);
        { const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(new Array(15).fill(0), 3)); const sm = new THREE.Points(sg, new THREE.PointsMaterial({ map: this.glow, color: 0x8a8480, size: 1.6, transparent: true, opacity: 0.4, depthWrite: false })); sm.frustumCulled = false; sm.userData.fumo = true; g.add(sm); } // (a fumaça: cinco tufos subindo)
        const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.06, 10), new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 1 })); ash.position.y = 0.03; g.add(ash);
        g.position.set(x, y, z); this.mesh(g); this.fogos.push(g); } }
    // ---- dia 11: Gonzaga levado preso pela Rua do Ouvidor até o Palácio, entre os dragões; gente nas portas
    if (n === 11 && this.casaGonzaga) {
      const h = this.casaGonzaga, L = STREETS.claudio.pts, q = (() => { let bi = 0, bd = Infinity; L.forEach((p, i) => { const d = Math.hypot(p[0] - h.door[0], p[1] - h.door[1]); if (d < bd) { bd = d; bi = i; } }); return bi; })();
      const pa = this.path([h.door, ...L.slice(0, q + 1).reverse(), [P.praca.x + 4, P.praca.z + 10], [P.praca.x + 2, P.praca.z - 30], [S.palacio[0], S.palacio[1] + 1]]);
      const def = NPCS.find((x) => x.id === 'gonzaga'), g = this.rig('gonzaga', { ...def.look, extras: [] }, h.door[0], h.door[1], 0);
      const guards = [0, 1, 2, 3].map(() => this.rig('dragao', null, h.door[0], h.door[1], 0));
      this.escolta = { pa, s: 0, g, guards, wait: 4 };
      for (let i = 0; i < 8; i++) { const hh = this.houseNear(h.door[0] + rr(-30, 30), h.door[1] + rr(-30, 30)); if (!hh) continue; const e = this.rig(pick(['mulher', 'homem', 'senhora', 'escrava', 'crianca']), null, hh.door[0], hh.door[1], hh.ry); e.mode = rand() < 0.5 ? 'talk' : 'idle'; }
    }
    // ---- dias 12 a 14: a Casa dos Contos, prisão; dia 13, o povo na frente e o dobre dos sinos
    if (n >= 12) { const h = this.houseNear(-277, 14); if (h) { for (const sd of [-1, 1]) { const e = this.rig('dragao', null, h.door[0] + Math.cos(h.ry) * sd * 1.6, h.door[1] - Math.sin(h.ry) * sd * 1.6, h.ry); e.mode = 'guard'; }
      if (n === 13) { for (let i = 0; i < 12; i++) { const a = h.ry + rr(-0.9, 0.9), d = rr(5, 10), x = h.door[0] + Math.sin(a) * d, z = h.door[1] + Math.cos(a) * d; const e = this.rig(pick(['homem', 'mulher', 'senhora', 'escravo', 'escrava', 'senhor', 'quitandeira']), null, x, z, Math.atan2(h.door[0] - x, h.door[1] - z)); e.mode = rand() < 0.5 ? 'talk' : 'idle'; } this.dobre = { x: h.door[0], z: h.door[1], t: 0 }; } }
      if (n === 12 && this.casaClaudio) { const hh = this.casaClaudio; for (const sd of [-1, 1]) { const e = this.rig('dragao', null, hh.door[0] + Math.cos(hh.ry) * sd * 1.3, hh.door[1] - Math.sin(hh.ry) * sd * 1.3, hh.ry + Math.PI); e.mode = sd > 0 ? 'talk' : 'idle'; } } } // (a casa de Cláudio, revistada)
  }
  // ---------------- as atividades ----------------
  // a peça da noite (dia 5): um entremez, a comédia curta que se encenava entre as óperas
  static PECA = ['(O pano sobe. Entra o velho Dom Pança, avarento, contando moedas.) — Uma, duas, três oitavas… e o rato ainda me come o queijo!',
    '(Entra o criado Lobato.) — Patrão, o alfaiate quer o pagamento da casaca. — Diz-lhe que a casaca ainda não está velha o bastante para ser paga!',
    '— E o padeiro, patrão? — O padeiro que espere. Pão bom é pão que cresce devagar.',
    '(Entra a sobrinha, Florinda.) — Titio, quero casar! — Com quem, menina? — Com quem tiver dote, titio, que é o que o senhor mais ama.',
    '(A plateia ri. Nos camarotes, os leques abanam.)',
    '— Lobato, esconde o meu baú, que vem visita! — Já escondi, patrão: debaixo da sua cama. — É o primeiro lugar onde procuram, animal!',
    '(O pano desce. Aplausos, assobios e risadas na plateia.)'];
  get assentos() { return (this.city.spots?.operaSeats || []).filter((s, i) => !this.ocupados?.has(i)); }
  // o que dá para fazer aqui (para o aviso na tela e para o E)
  acao(pp) {
    if (this.sentado) return { txt: 'Levantar-se', fn: () => this.levantar() };
    if (this.day === 5) { const s = this.assentos.find((q) => Math.hypot(q[0] - pp.x, q[2] - pp.z) < 1.8 && Math.abs(q[1] - pp.y) < 1.5); if (s) return { txt: 'Sentar na plateia', fn: () => this.sentar(s) }; }
    if (this.proc && !this.velaP) { const m = this.proc.m.find((e) => e.r.root.visible && Math.hypot(e.pos.x - pp.x, e.pos.z - pp.z) < 3.5); if (m) return { txt: 'Pegar uma vela e seguir a procissão', fn: () => this.daVela() }; }
    return null;
  }
  sentar(s) { this.sentado = { s, i: -1, t: 2 }; this.player.locked = true; this.player.boardCam(0.12); this.quests.complete('teatro'); }
  levantar() { if (!this.sentado) return; const [x, y, z, ry] = this.sentado.s; this.sentado = null; this.player.leaveCam(); this.player.locked = false; this.player.place(x + Math.sin(ry) * 0.9, z + Math.cos(ry) * 0.9, ry); }
  // sentado: o explorador fica no banco, a peça corre (uma fala a cada seis segundos)
  sentadoUpdate(dt, t, player) {
    const S = this.sentado, [x, y, z, ry] = S.s; player.ride(dt, t, new V3(x, y - 0.46, z), ry, 'sit', 0, null, ry);
    S.t -= dt; if (S.t <= 0 && S.i < Dias.PECA.length - 1) { S.i++; S.t = 6.5; this.ui.toast(Dias.PECA[S.i], 'quest', 6500); if (S.i === Dias.PECA.length - 1) for (let k = 0; k < 30; k++) setTimeout(() => this.audio.burst(0.04, 1800 + Math.random() * 2000, 0.08), k * 60 + Math.random() * 400); }
  }
  daVela() { const r = this.player.rig, c = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0xf4ecd8, roughness: 0.6 })), f = this.flame(0.28); c.position.y = 0.08; f.position.set(0, 0.25, 0.05); r.handR.add(c, f); this.velaP = [c, f]; this.quests.complete('vela');
    this.ui.toast(this.proc.santa ? 'Um irmão de opa roxa acende uma vela na dele e passa a você. Siga devagar, no passo da procissão.' : 'Um irmão de opa vermelha lhe dá uma vela acesa. A procissão segue para o Carmo.', 'quest', 7000); }
  tiraVela() { if (this.velaP) { for (const o of this.velaP) o.parent?.remove(o); this.velaP = null; } }

  // a festa do Rosário (dia 14): o rei e a rainha coroados debaixo do guarda-sol, a corte, a bandeira, os tambores e a
  // roda de dança (o congado) girando em volta; o povo olhando
  festaRosario() {
    const P = PLACES.rosario, cx = P.x + 2, cz = P.z - P.d / 2 + 5, gold = new THREE.MeshStandardMaterial({ color: 0xe0b04a, metalness: 0.85, roughness: 0.3 });
    const coroa = (e) => { const head = e.r.bones?.Head; if (!head) return; e.r.root.updateMatrixWorld(true); const ws = new V3(); head.getWorldScale(ws); const k = 1 / ws.x, g = new THREE.Group();
      const aro = new THREE.Mesh(new THREE.CylinderGeometry(0.105 * k, 0.095 * k, 0.07 * k, 16, 1, true), gold); g.add(aro); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, p = new THREE.Mesh(new THREE.ConeGeometry(0.018 * k, 0.07 * k, 4), gold); p.position.set(Math.cos(a) * 0.1 * k, 0.06 * k, Math.sin(a) * 0.1 * k); g.add(p); }
      const cruz = new THREE.Mesh(new THREE.BoxGeometry(0.012 * k, 0.07 * k, 0.012 * k), gold); cruz.position.y = 0.11 * k; g.add(cruz); g.position.y = 0.19 * k; head.add(g); };
    const rei = this.rig('rei', { outfit: 'casaca', coat: 0x8a1a1e, vest: 0xe0c060, legs: 0xf0ece2, stockings: 0xf0ece2, hair: 'natural', skin: 0x4e301e, extras: ['bengala'] }, cx - 0.6, cz, Math.PI); coroa(rei);
    const rainha = this.rig('rainha', { outfit: 'saia', skirt: 0x2a3a8a, top: 0xf2ece0, pano: 0xe0c060, panoAccent: '#8a1a1e', hair: 'torco', headColor: 0xf2ece0, skin: 0x4e301e }, cx + 0.6, cz, Math.PI); coroa(rainha);
    // o guarda-sol vermelho por cima deles, numa vara segurada por um pajem
    { const pj = this.rig('pajem', { outfit: 'colono', top: 0xf2ece0, legs: 0x8a1a1e, hair: 'natural', skin: 0x5e3a26, barefoot: false }, cx, cz + 1.0, Math.PI); void pj;
      const g = new THREE.Group(), vara = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.6, 6), new THREE.MeshStandardMaterial({ color: 0x5a3a22 })); vara.position.y = 1.3; g.add(vara);
      const sol = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.45, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xa82a22, roughness: 0.8, side: THREE.DoubleSide })); sol.position.y = 2.55; g.add(sol);
      const franja = new THREE.Mesh(new THREE.CylinderGeometry(1.26, 1.26, 0.12, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xe0c060, roughness: 0.7, side: THREE.DoubleSide })); franja.position.y = 2.3; g.add(franja);
      g.position.set(cx, this.yAt(cx, cz + 0.4), cz + 0.4); this.mesh(g); }
    // a bandeira da irmandade e os tambores
    { const e = this.rig('bandeira', { outfit: 'colono', top: 0xf2ece0, legs: 0x2a3a6a, hair: 'natural', skin: 0x5e3a26 }, cx - 3.2, cz - 1.5, Math.PI); const g = new THREE.Group(), vara = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.8, 6), new THREE.MeshStandardMaterial({ color: 0x5a3a22 })); vara.position.y = 1.4; g.add(vara);
      const pano = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), new THREE.MeshStandardMaterial({ map: this.bandeiraTex(), side: THREE.DoubleSide, roughness: 0.9 })); pano.position.set(0.47, 2.4, 0); g.add(pano); g.position.set(cx - 3.0, this.yAt(cx - 3, cz - 1.5), cz - 1.5); this.mesh(g); void e; }
    this.tambores = [];
    for (let i = 0; i < 3; i++) { const x = cx + 3 + i * 0.9, z = cz - 1.2 - (i % 2) * 0.5, e = this.rig('tamborzeiro', { outfit: 'colono', top: 0xf2ece0, legs: 0xf2ece0, hair: 'natural', skin: pick([0x4e301e, 0x5e3a26]), barefoot: true }, x, z, Math.PI * 0.9);
      const d = new THREE.Group(), pele = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.6, 14), new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.7 })); d.add(pele); d.position.set(0, 0.7, 0.3); d.rotation.x = 0.35; e.r.root.add(d); this.tambores.push(e); }
    // a roda: o congado, de branco com as fitas, girando em volta do rei e da rainha
    const roda = []; for (let i = 0; i < 12; i++) { const e = this.rig('congado', { outfit: i % 2 ? 'colono' : 'saia', top: 0xf2ece0, legs: 0xf2ece0, skirt: 0xf2ece0, pano: i % 3 ? 0x2a4a8a : 0xa82a22, hair: i % 2 ? 'natural' : 'torco', headColor: 0xf2ece0, skin: pick([0x4e301e, 0x5e3a26, 0x6e4630]), barefoot: true }, cx, cz, 0); e.moving = true; roda.push(e); }
    for (let i = 0; i < 14; i++) { const a = rr(-1.4, 1.4) + Math.PI, d = rr(8, 12), x = cx + Math.sin(a) * d, z = cz - 2 + Math.cos(a) * d; const e = this.rig(pick(['homem', 'mulher', 'escrava', 'escravo', 'crianca', 'senhor', 'quitandeira']), null, x, z, Math.atan2(cx - x, cz - z)); e.mode = rand() < 0.3 ? 'talk' : 'idle'; }
    this.festa = { cx, cz, roda, t: 0 };
  }
  bandeiraTex() { const c = document.createElement('canvas'); c.width = 128; c.height = 100; const x = c.getContext('2d'); x.fillStyle = '#f2ece0'; x.fillRect(0, 0, 128, 100); x.fillStyle = '#2a4a8a'; x.fillRect(0, 0, 128, 14); x.fillRect(0, 86, 128, 14);
    x.fillStyle = '#c8a040'; x.beginPath(); x.arc(64, 50, 22, 0, 7); x.fill(); x.fillStyle = '#2a4a8a'; x.beginPath(); x.moveTo(64, 30); x.lineTo(76, 70); x.lineTo(52, 70); x.fill(); x.fillStyle = '#e8d8c0'; x.beginPath(); x.arc(64, 36, 6, 0, 7); x.fill(); // (Nossa Senhora do Rosário, à moda dos estandartes)
    x.strokeStyle = '#8a1a1e'; x.lineWidth = 2; for (let i = 0; i < 18; i++) { x.beginPath(); x.arc(64 + Math.cos(i / 18 * 6.28) * 30, 50 + Math.sin(i / 18 * 6.28) * 30, 1.5, 0, 7); x.stroke(); } // (as contas do rosário em volta)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

  // ---------------- as cenas da escravidão ----------------
  // o pelourinho (dias 7 e 12): a justiça da vila manda açoitar um homem que tinha fugido, à vista do povo. O oficial lê
  // a sentença; o açoite; depois os companheiros o desamarram e o levam. Uma quitandeira, ao lado, explica.
  pelourinho() {
    const S = this.city.spots || {}, pl = S.pelourinho || [-8, 40], [px, pz] = pl, side = (a, d) => [px + Math.sin(a) * d, pz + Math.cos(a) * d];
    const [hx, hz] = side(0.3, 0.75), h = this.rig('escravo', { outfit: 'escravo', bare: true, legs: 0xb8ac90, shorts: true, barefoot: true, hair: 'natural', skin: 0x4e301e }, hx, hz, Math.atan2(px - hx, pz - hz)); // (de frente para a coluna)
    const [ax, az] = side(0.3 + 0.9, 1.9), algoz = this.rig('escravo', { outfit: 'escravo', top: 0xb8ac90, legs: 0x6a5a48, barefoot: true, hair: 'barrete', hatColor: 0x2a2420, skin: 0x5e3a26, extras: ['chicote'] }, ax, az, Math.atan2(hx - ax, hz - az)); // (o algoz: quase sempre outro escravizado, obrigado pela justiça)
    const [ox, oz] = side(-1.2, 5.5), oficial = this.rig('oficial', { outfit: 'casaca', coat: 0x1e1e24, vest: 0x2a2a30, legs: 0x1e1e24, stockings: 0xe2dccc, hair: 'tricorne', skin: 0xd8b496, extras: ['livro'] }, ox, oz, Math.atan2(px - ox, pz - oz)); oficial.mode = 'talk';
    for (const a of [-2.2, 2.0]) { const [x, z] = side(a, 4.2); const e = this.rig('dragao', null, x, z, Math.atan2(px - x, pz - z)); e.mode = 'guard'; }
    for (let i = 0; i < 9; i++) { const a = 2.6 + (i / 8) * 2.2, d = rr(8, 13), [x, z] = side(a, d); const e = this.rig(pick(['homem', 'mulher', 'escravo', 'escrava', 'senhor', 'mulher']), null, x, z, Math.atan2(px - x, pz - z) + (rand() < 0.3 ? Math.PI * 0.6 : 0)); e.mode = rand() < 0.3 ? 'talk' : 'idle'; } // (uns olham, outros viram o rosto)
    const comp = [0, 1].map((k) => { const [x, z] = side(4.4 + k * 0.3, 14); return this.rig('escravo', null, x, z, 0); });
    // a corda das mãos à argola do pelourinho
    const corda = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5), new THREE.MeshStandardMaterial({ color: 0x8a7a50, roughness: 1 })); this.mesh(corda);
    const [qx, qz] = side(0.3, 1.6); this.pelo = { h, algoz, oficial, comp, corda, px, pz, fase: 'espera', t: 0, n: 0, sai: { x: qx, z: qz } };
  }
  // o capitão do mato (dia 3): traz pela estrada do Rio, amarrado pelas mãos, um homem que tinha fugido para os matos
  capitaoDoMato() {
    const S = STREETS, pa = this.path([...S.rio.pts.slice().reverse(), ...S.rosario.pts.slice().reverse(), ...S.saojose.pts.slice().reverse(), [-245, 26], ...S.direita.pts.slice().reverse(), [-4, 30], [PLACES.camara.x, PLACES.camara.z - 6]]);
    const cap = this.rig('capitao', { outfit: 'colono', top: 0xc8b890, vest: 0x5a3a22, legs: 0x4a3e30, boots: 0x2a1a10, hair: 'chapeu', hatColor: 0x3a2a1e, skin: 0xa87652, extras: ['espingarda'] }, pa.P[0].x, pa.P[0].z, 0);
    const preso = this.rig('escravo', { outfit: 'escravo', top: 0x9a8c70, legs: 0x7a6a50, shorts: true, barefoot: true, hair: 'natural', skin: 0x4e301e }, pa.P[0].x, pa.P[0].z, 0);
    const corda = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1, 5), new THREE.MeshStandardMaterial({ color: 0x8a7a50, roughness: 1 })); this.mesh(corda);
    this.capitao = { pa, s: 40, cap, preso, corda };
  }
  // dia 9, na lavra: o tronco (as pernas presas entre duas vigas), a gargalheira de ferro, e o desabamento da galeria
  lavra() {
    const Q = PLACES.queimada, wood = new THREE.MeshStandardMaterial({ color: 0x5a3e26, roughness: 0.9 }), iron = new THREE.MeshStandardMaterial({ color: 0x3a3634, metalness: 0.6, roughness: 0.55 });
    // o tronco: duas vigas grossas com os furos, cravadas no chão; o homem sentado com os tornozelos presos
    { const x = Q.x - 14, z = Q.z + 12, y = terrainHeight(x, z), g = new THREE.Group(); for (const dy of [0.12, 0.34]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 0.26), wood); b.position.y = dy; g.add(b); } for (const sx of [-1.15, 1.15]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.3), wood); p.position.set(sx, 0.2, 0); g.add(p); } const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), iron); pin.position.set(1.0, 0.45, 0); g.add(pin);
      g.position.set(x, y, z); this.mesh(g); const e = this.rig('escravo', { outfit: 'escravo', bare: true, legs: 0x8a7a60, shorts: true, barefoot: true, hair: 'natural', skin: 0x4e301e }, x, z - 0.95, 0, y - 0.46); e.mode = 'sit'; this.tronco = { x, z }; }
    // a gargalheira: a argola de ferro no pescoço de quem tentou fugir, trabalhando com os outros
    { const x = Q.x + 8, z = Q.z - 6, e = this.rig('escravo', { outfit: 'escravo', top: 0xb8ac90, legs: 0x8a7a60, shorts: true, barefoot: true, hair: 'natural', skin: 0x5e3a26 }, x, z, 2.2); e.mode = '@pegar';
      const neck = e.r.bones?.Neck; if (neck) { e.r.root.updateMatrixWorld(true); const ws = new V3(); neck.getWorldScale(ws); const k = 1 / ws.x; // (a escala do osso no mundo: o tamanho da argola é medido em metros)
        const col = new THREE.Mesh(new THREE.TorusGeometry(0.068 * k, 0.012 * k, 6, 20), iron); col.rotation.x = Math.PI / 2; col.position.y = 0.035 * k; neck.add(col); const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.006 * k, 0.006 * k, 0.11 * k, 5), iron); hook.position.set(0, 0.07 * k, -0.08 * k); hook.rotation.x = 0.4; neck.add(hook); } } // (a argola de ferro e a haste que sobe atrás)
    // a galeria: a boca permanente das lavras (mina.js)
    { const Bc = this.city.minaBoca; if (Bc) { const { x, z, y, face } = Bc;
      this.galeria = { x, z, y, face, fase: 'espera', t: 0, levam: null }; } }
  }
  // a rede: o corpo enrolado no pano branco, pendurado no varal que dois carregam no ombro
  rede() { const g = new THREE.Group(), pano = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 1 }); const vara = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.2, 6), new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 })); vara.rotation.x = Math.PI / 2; vara.position.y = 1.5; g.add(vara);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.9, 12, 1, false, Math.PI / 2, Math.PI), pano); r.rotation.x = Math.PI / 2; r.position.y = 1.18; g.add(r); const corpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 1.3, 4, 8), pano); corpo.rotation.x = Math.PI / 2; corpo.position.y = 1.12; g.add(corpo);
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4), pano); c.position.set(0, 1.32, s * 1.0); g.add(c); } return this.mesh(g); }

  // a procissão: a cruz alçada, as lanternas, os irmãos de opa com as velas, a cruz com o sudário (Semana Santa) ou o
  // pálio com o padre e a custódia (Corpus Christi), e o povo atrás; sobe da Rua de São José para a praça e entra no Carmo
  procissao(santa) {
    const S = STREETS, pa = this.path([...S.saojose.pts.slice().reverse(), [-245, 26], ...S.direita.pts.slice().reverse(), [-4, 30], ...S.carmo.pts]);
    const m = [], opa = santa ? 0x4a2a5a : 0xa82a2a, wood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.7 }), gold = new THREE.MeshStandardMaterial({ color: 0xe0b04a, metalness: 0.9, roughness: 0.3 });
    const add = (kind, lk, off, o = {}) => { const e = this.rig(kind, lk, pa.P[0].x, pa.P[0].z, 0); e.off = off; e.side = o.side || 0; if (o.vela) this.vela(e.r); m.push(e); return e; };
    const cruz = add('irmao', { ...look('homem'), coat: undefined, top: opa, hair: 'natural' }, 0); { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 6), wood)); const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), gold); b.position.y = 1.0; g.add(b); const v = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), gold); v.position.y = 1.05; g.add(v); g.position.y = 0.4; cruz.r.handR.add(g); }
    for (let i = 0; i < 10; i++) add('irmao', { outfit: 'padre', top: opa, legs: 0x2a2228, hair: 'natural', skin: pick([0xd8b496, 0xa87652, 0x6e4630]) }, 3 + Math.floor(i / 2) * 1.8, { side: i % 2 ? 0.9 : -0.9, vela: true });
    // o andor (Semana Santa: a cruz com o sudário roxo) ou o pálio com o padre e a custódia (Corpus Christi)
    const oc = 3 + 5 * 1.8 + 1.5, bearers = [];
    for (const [sx, sz] of [[-0.6, -0.9], [0.6, -0.9], [-0.6, 0.9], [0.6, 0.9]]) bearers.push(add('irmao', { outfit: 'padre', top: opa, legs: 0x2a2228, hair: 'natural', skin: pick([0xd8b496, 0xa87652, 0x6e4630]) }, oc + sz, { side: sx }));
    const andor = new THREE.Group();
    if (santa) { const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 1.4), wood); base.position.y = 1.05; andor.add(base); const cr = new THREE.Group(); cr.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.9, 0.1), wood)); const tr = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.1), wood); tr.position.y = 0.45; cr.add(tr); const sud = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.02), new THREE.MeshStandardMaterial({ color: 0x5a2a6a, roughness: 0.9, side: THREE.DoubleSide })); sud.position.set(0, 0.12, 0.06); cr.add(sud); cr.position.y = 2.05; andor.add(cr); }
    else { const pano = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 2.0), new THREE.MeshStandardMaterial({ color: 0xe8dcb0, roughness: 0.8 })); pano.position.y = 2.35; andor.add(pano); for (const [sx, sz] of [[-0.7, -0.95], [0.7, -0.95], [-0.7, 0.95], [0.7, 0.95]]) { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.35, 6), gold); v.position.set(sx, 1.18, sz); andor.add(v); } }
    this.mesh(andor);
    if (!santa) { const pd = add('padre', { ...look('padre'), extras: [] }, oc); const cu = new THREE.Group(); cu.add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.3, 8), gold)); const sun = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 16), gold); sun.position.y = 0.25; cu.add(sun); cu.position.set(0, 0.12, 0.05); pd.r.handR.add(cu); }
    for (let i = 0; i < 12; i++) { const k = pick(['senhora', 'senhora', 'mulher', 'homem', 'senhor', 'escrava', 'escravo', 'crianca']); add(k, null, oc + 3 + Math.floor(i / 2) * 1.5, { side: i % 2 ? 0.8 : -0.8, vela: santa }); }
    this.proc = { pa, s: pa.L * 0.35, m, andor, oc, santa, t: 0 }; // (quando o dia começa ela já vem pela Rua Direita)
  }

  update(dt, t, player) {
    this.t += dt; const pp = (this.pp = player.pos); this.player = player;
    // as pessoas com conversa longa: olham para quem chega, a etiqueta de perto, o "!" enquanto não conversou
    const G = this.gente, near = (o, r) => (o.pos.x - pp.x) ** 2 + (o.pos.z - pp.z) ** 2 < r * r;
    for (const k of this.key) {
      const vis = near(k, G.viewR + 15) && !k.rig.root.userData.off; k.rig.root.visible = vis; if (!vis) continue;
      if (k.talking || near(k, 5)) k.rig.root.rotation.y = angleLerp(k.rig.root.rotation.y, Math.atan2(pp.x - k.pos.x, pp.z - k.pos.z), Math.min(1, dt * 5)); else k.rig.root.rotation.y = angleLerp(k.rig.root.rotation.y, k.ry, dt * 2);
      G.anim(k.rig, dt, 0, k.talking ? 'talk' : near(k, 5) ? 'idle' : k.mode, t);
      k.label.visible = near(k, 20); k.marker.visible = !this.quests.isDone(k.def.objective) && near(k, 60); k.marker.position.y = 2.95 + Math.sin(t * 3) * 0.08;
    }
    // os figurantes dos acontecimentos
    for (const e of this.ev) if (e.r && !e.moving) { const vis = near(e, 70); e.r.root.visible = vis; if (vis) G.anim(e.r, dt, 0, e.mode, t); }
    const n = this.day;
    // dia 4: a partida do alferes
    if (this.partida) { const T = this.partida; if (near(T.t, 90) || T.s > 0) T.s = Math.min(T.pa.L, T.s + dt * 1.25); const p = this.at(T.pa, T.s), y = this.yAt(p.x, p.z); T.t.pos.set(p.x, y, p.z); T.t.moving = true; T.t.r.root.visible = near(T.t, 80) && T.s < T.pa.L; T.t.r.root.position.copy(T.t.pos); T.t.r.root.rotation.y = angleLerp(T.t.r.root.rotation.y, p.h, Math.min(1, dt * 4)); if (T.t.r.root.visible) G.anim(T.t.r, dt, 1.25, 'walk', t);
      if (T.horse) { const q = this.at(T.pa, T.s - 2.6); T.horse.holder.position.set(q.x, this.yAt(q.x, q.z), q.z); T.horse.holder.rotation.y = q.h; T.horse.holder.visible = T.t.r.root.visible; if (T.horse.holder.visible) T.horse.mixer.update(dt * 0.7); }
      this.note('partida', p.x, p.z, 25, 'O alferes Silva Xavier desce para o Rio de Janeiro, levando o cavalo pela rédea.', null); }
    // dia 5: a reunião (o que se ouve junto à porta) e a comédia
    if (n === 5 && this.reuniao?.h) { const R = this.reuniao, h = R.h, d = Math.hypot(pp.x - h.door[0], pp.z - h.door[1]);
      const FRASES = ['(Vozes baixas atrás da porta fechada.) — …e quando lançarem a derrama, o povo vai para a rua…', '— …a senha vai ser "tal dia é o batizado"…', '— Fale baixo, homem! As paredes desta vila têm ouvidos.', '— …uma república, como a dos ingleses da América… a capital em São João del-Rei…', '— E os escravos? — (Silêncio. Alguém muda de assunto.)'];
      if (d < 4.5) { R.t -= dt; if (R.t <= 0 && R.i < FRASES.length - 1) { R.i++; R.t = 6; this.ui.toast(FRASES[R.i], 'quest', 6000); if (R.i === 2) this.quests.complete('reuniao'); } } }
    if (n === 5 && (this.city.spots?.operaStage || [])[0]) { const s = this.city.spots.operaStage[0]; this.note('teatro', s[0], s[2], 16, 'Noite de comédia na Casa da Ópera: a plateia de bancos, as famílias nos camarotes, os atores à luz das velas da ribalta.', 'teatro'); }
    // dia 6: o bando — o tambor rufa, o oficial lê
    if (this.bando) { const B = this.bando, d = Math.hypot(pp.x - B.x, pp.z - B.z);
      const LEITURA = ['(O tambor rufa. O oficial desenrola o papel.)', '— Faço saber a todos os moradores desta Vila Rica e seu termo que o Ilustríssimo e Excelentíssimo Senhor Visconde de Barbacena, Governador e Capitão-General desta Capitania…', '— …houve por bem suspender o lançamento da derrama, até nova ordem de Sua Majestade…', '— E para que chegue à notícia de todos, mandou lançar o presente bando. (O tambor rufa de novo. O povo murmura, aliviado.)'];
      if (d < 26) { B.t -= dt; if (B.t <= 0 && B.i < LEITURA.length - 1) { B.i++; B.t = 7; this.ui.toast(LEITURA[B.i], 'quest', 7000); if (B.i === 0 || B.i === 3) for (let k = 0; k < 14; k++) setTimeout(() => this.audio.burst(0.06, 180, 0.22), k * 70); if (B.i === 2) this.quests.complete('bando'); } } }
    // dias 8 e 12: a procissão
    if (this.proc) { const Q = this.proc, lead = this.at(Q.pa, Q.s);
      Q.s += dt * 0.8; if (Q.s > Q.pa.L + Q.oc + 25) Q.s = -2; // (anda devagar o dia inteiro, de São José ao Carmo; quando entra no Carmo, recomeça lá de baixo)
      for (const e of Q.m) { const s = Q.s - e.off, on = s > 0 && s < Q.pa.L, p = this.at(Q.pa, s), lx = Math.cos(p.h), lz = -Math.sin(p.h); e.moving = true; const x = p.x + lx * e.side, z = p.z + lz * e.side; e.pos.set(x, this.yAt(x, z), z);
        e.r.root.visible = on && near(e, 70); if (!e.r.root.visible) continue; e.r.root.position.copy(e.pos); e.r.root.rotation.y = angleLerp(e.r.root.rotation.y, p.h, Math.min(1, dt * 4)); G.anim(e.r, dt, 0.8, 'walk', t); }
      { const s = Q.s - Q.oc, p = this.at(Q.pa, s); Q.andor.position.set(p.x, this.yAt(p.x, p.z), p.z); Q.andor.rotation.y = p.h; Q.andor.visible = s > 0 && s < Q.pa.L && Math.hypot(pp.x - p.x, pp.z - p.z) < 70; }
      if (Q.santa && Math.hypot(pp.x - lead.x, pp.z - lead.z) < 40) { Q.t -= dt; if (Q.t <= 0) { Q.t = 3.2; for (let k = 0; k < 8; k++) setTimeout(() => this.audio.burst(0.03, 1400, 0.12), k * 55); } } // (a matraca)
      this.note('procissao' + n, lead.x, lead.z, 30, Q.santa ? 'A procissão da Semana Santa: as velas, as opas roxas, a cruz com o sudário. As matracas batem no lugar dos sinos.' : 'A procissão de Corpus Christi: o padre leva a custódia debaixo do pálio, e os irmãos de opa vermelha abrem o caminho.', 'procissao'); }
    // dia 10: o fogo e a fumaça subindo dos quintais
    if (this.fogos) for (const g of this.fogos) { g.children[0].material.size = 1.0 + Math.sin(t * 9 + g.position.x) * 0.2; const sm = g.children.find((c) => c.userData.fumo), a = sm.geometry.attributes.position; for (let k = 0; k < 5; k++) { const f = (t * 0.25 + k / 5) % 1; a.setXYZ(k, Math.sin(t + k) * 0.3 * f, 0.6 + f * 4, Math.cos(t * 0.7 + k) * 0.3 * f); } a.needsUpdate = true; }
    if (n === 10 && this.fogos?.length) { const g = this.fogos.find((q) => Math.hypot(pp.x - q.position.x, pp.z - q.position.z) < 25); if (g) this.note('papeis', g.position.x, g.position.z, 25, 'Num quintal, alguém queima papéis: cartas, versos, contas. Ninguém quer guardar nada que possa servir à devassa.', null); }
    // dia 11: a escolta
    if (this.escolta) { const E = this.escolta, h = this.casaGonzaga; if (Math.hypot(pp.x - h.door[0], pp.z - h.door[1]) < 70 || E.s > 0) { if (E.wait > 0) E.wait -= dt; else E.s = Math.min(E.pa.L + 4, E.s + dt * 1.0); }
      const put = (e, s, side) => { const p = this.at(E.pa, s), x = p.x + Math.cos(p.h) * side, z = p.z - Math.sin(p.h) * side; e.pos.set(x, this.yAt(x, z), z); e.moving = true; e.r.root.visible = s < E.pa.L && near(e, 80); if (!e.r.root.visible) return; e.r.root.position.copy(e.pos); e.r.root.rotation.y = angleLerp(e.r.root.rotation.y, p.h, Math.min(1, dt * 4)); G.anim(e.r, dt, E.wait > 0 || E.s >= E.pa.L ? 0 : 1, E.wait > 0 ? 'idle' : 'walk', t); };
      put(E.g, E.s, 0); put(E.guards[0], E.s + 1.6, -0.6); put(E.guards[1], E.s + 1.6, 0.6); put(E.guards[2], E.s - 1.6, -0.6); put(E.guards[3], E.s - 1.6, 0.6);
      this.note('prisao', E.g.pos.x, E.g.pos.z, 30, 'Os dragões levam preso o Doutor Tomás Antônio Gonzaga pela Rua do Ouvidor. A vila assiste das portas, calada.', 'prisao'); }
    // o pelourinho: começa quando o explorador chega à praça; ele pode ficar ou ir embora
    if (this.pelo) { const P = this.pelo, d = Math.hypot(pp.x - P.px, pp.z - P.pz); P.h.moving = P.algoz.moving = true;
      const show = (e) => { e.r.root.visible = near(e, 70); if (e.r.root.visible) { e.r.root.position.copy(e.pos); } return e.r.root.visible; };
      if (P.fase === 'espera' && d < 32) { P.fase = 'leitura'; P.t = 0; this.ui.toast('Na praça, junto ao pelourinho, o oficial de justiça lê a sentença: o escravo Antônio, de nação benguela, preso depois de fugir, é condenado a açoites no pelourinho, à vista do povo.', 'quest', 10000); }
      P.t += dt;
      if (P.fase === 'leitura' && P.t > 11) { P.fase = 'acoite'; P.t = 0; P.n = 0; }
      if (P.fase === 'acoite') { if (P.t > 1.9) { P.t = 0; P.n++; playOnce(P.algoz.r, 'golpe', 0.9); if (d < 70) setTimeout(() => this.audio.burst(0.05, 5200, Math.max(0.05, 0.32 - d / 250)), 380); } if (P.n >= 12) { P.fase = 'solta'; P.t = 0; this.ui.toast('Os companheiros desamarram o homem e o levam pelos braços. A quitandeira ao lado diz baixo: "Fugiu, pegaram, açoitaram na frente de todo mundo, para servir de exemplo. O senhor ainda paga a despesa da justiça e recebe ele de volta."', 'quest', 12000); } }
      // a corda: das mãos (à altura do peito, junto da coluna) até a argola de ferro
      { const a = new V3(P.h.pos.x + (P.px - P.h.pos.x) * 0.4, P.h.pos.y + 1.55, P.h.pos.z + (P.pz - P.h.pos.z) * 0.4), b = new V3(P.px, P.h.pos.y + 4.9, P.pz), L = a.distanceTo(b); P.corda.visible = P.fase !== 'solta' && near(P.h, 70); P.corda.position.copy(a).add(b).multiplyScalar(0.5); P.corda.scale.set(1, L, 1); P.corda.quaternion.setFromUnitVectors(new V3(0, 1, 0), b.clone().sub(a).normalize()); }
      if (P.fase === 'solta') { // os dois companheiros vêm, e os três saem devagar para a Rua Direita
        const tgt = P.t < 7 ? new V3(P.h.pos.x, 0, P.h.pos.z) : new V3(P.px - 40, 0, P.pz - 30);
        P.comp.forEach((c, k) => { c.moving = true; const dx = tgt.x + (k ? 0.7 : -0.7) - c.pos.x, dz = tgt.z - c.pos.z, l = Math.hypot(dx, dz); if (l > 0.9) { c.pos.x += dx / l * dt * (P.t < 7 ? 1.2 : 0.55); c.pos.z += dz / l * dt * (P.t < 7 ? 1.2 : 0.55); c.pos.y = this.yAt(c.pos.x, c.pos.z); c.r.root.rotation.y = Math.atan2(dx, dz); } if (show(c)) G.anim(c.r, dt, l > 0.9 ? 0.7 : 0, l > 0.9 ? 'walk' : 'idle', t); });
        if (P.t > 7) { const c0 = P.comp[0].pos, c1 = P.comp[1].pos; P.h.pos.set((c0.x + c1.x) / 2, this.yAt((c0.x + c1.x) / 2, (c0.z + c1.z) / 2), (c0.z + c1.z) / 2); P.h.r.root.rotation.y = P.comp[0].r.root.rotation.y; if (show(P.h)) G.anim(P.h.r, dt, 0.55, 'walk', t); }
        else if (show(P.h)) G.anim(P.h.r, dt, 0, 'idle', t);
      } else { if (show(P.h)) G.anim(P.h.r, dt, 0, 'idle', t); P.comp.forEach((c) => { c.moving = true; c.r.root.visible = false; }); }
      if (show(P.algoz)) G.anim(P.algoz.r, dt, 0, 'idle', t); }
    // o capitão do mato e o homem amarrado, entrando na vila
    if (this.capitao) { const K = this.capitao; K.s = Math.min(K.pa.L, K.s + dt * 0.9);
      const put = (e, s) => { const p = this.at(K.pa, s); e.pos.set(p.x, this.yAt(p.x, p.z), p.z); e.moving = true; e.r.root.visible = near(e, 70) && K.s < K.pa.L; if (!e.r.root.visible) return; e.r.root.position.copy(e.pos); e.r.root.rotation.y = angleLerp(e.r.root.rotation.y, p.h, Math.min(1, dt * 4)); G.anim(e.r, dt, 0.9, 'walk', t); };
      put(K.cap, K.s); put(K.preso, K.s - 2.4);
      { const a = K.cap.pos.clone().add(new V3(0, 0.95, 0)), b = K.preso.pos.clone().add(new V3(0, 1.0, 0)), L = a.distanceTo(b); K.corda.visible = K.cap.r.root.visible; K.corda.position.copy(a).add(b).multiplyScalar(0.5); K.corda.scale.set(1, L, 1); K.corda.quaternion.setFromUnitVectors(new V3(0, 1, 0), b.clone().sub(a).normalize()); }
      this.note('capitao', K.cap.pos.x, K.cap.pos.z, 28, 'Pela estrada vem um capitão do mato trazendo, amarrado pelas mãos, um homem que tinha fugido para os matos. Vai entregá-lo na cadeia e cobrar do senhor a tomadia, a recompensa. (O faiscador Bento, na beira do ribeirão, sabe o que são os quilombos.)', null); }
    // a lavra (dia 9): o tronco, a gargalheira e, quando o explorador está perto, o estrondo na galeria
    if (this.tronco) this.note('tronco', this.tronco.x, this.tronco.z, 22, 'Num canto da lavra, um homem está preso no tronco, sentado no chão com as pernas entre as duas vigas, de castigo. Mais adiante, outro trabalha com a gargalheira de ferro no pescoço: a marca de quem tentou fugir. O feitor olha os dois.', null);
    if (this.galeria) { const Gl = this.galeria, d = Math.hypot(pp.x - Gl.x, pp.z - Gl.z); Gl.t += dt;
      if (Gl.fase === 'espera' && d < 40) { Gl.fase = 'estrondo'; Gl.t = 0; this.audio.burst(1.4, 120, 0.5); this.audio.fall(); this.ui.toast('Um estrondo surdo vem da galeria. Poeira na boca da mina. Gritos lá dentro, e os companheiros correm com as lamparinas.', 'quest', 9000); }
      if (Gl.fase === 'estrondo' && Gl.t > 14) { Gl.fase = 'levam'; Gl.t = 0; const fx = Math.sin(Gl.face), fz = Math.cos(Gl.face); const m = [0, 1, 2, 3].map((k) => this.rig('minerador', null, Gl.x + fx * 1.2, Gl.z + fz * 1.2, Gl.face)); Gl.levam = { m, rede: this.rede(), s: 0, pa: this.path([[Gl.x + fx * 1.5, Gl.z + fz * 1.5], [PLACES.queimada.x, PLACES.queimada.z], ...STREETS.queimada.pts.slice().reverse()]) };
        this.ui.toast('Tiram um homem de dentro, morto pelo desabamento. Levam o corpo numa rede, pela ladeira abaixo. É a Irmandade do Rosário que vai pagar a missa e o enterro.', 'quest', 11000); }
      if (Gl.levam) { const Lv = Gl.levam; Lv.s = Math.min(Lv.pa.L, Lv.s + dt * 0.7); const p = this.at(Lv.pa, Lv.s), fx = Math.sin(p.h), fz = Math.cos(p.h);
        Lv.m.forEach((e, k) => { const off = k < 2 ? (k ? 1.25 : -1.25) : 0, s = k < 2 ? Lv.s : Lv.s - 3 - k * 1.2, q = this.at(Lv.pa, s), x = q.x + (k < 2 ? 0 : (k === 2 ? 0.6 : -0.6) * Math.cos(q.h)), z = q.z - (k < 2 ? 0 : (k === 2 ? 0.6 : -0.6) * Math.sin(q.h)); e.moving = true; e.pos.set(x + (k < 2 ? fx * off : 0), 0, z + (k < 2 ? fz * off : 0)); e.pos.y = this.yAt(e.pos.x, e.pos.z); e.r.root.visible = near(e, 70) && Lv.s < Lv.pa.L; if (!e.r.root.visible) return; e.r.root.position.copy(e.pos); e.r.root.rotation.y = q.h; G.anim(e.r, dt, 0.7, 'walk', t); });
        Lv.rede.position.set(p.x, this.yAt(p.x, p.z), p.z); Lv.rede.rotation.y = p.h; Lv.rede.visible = Lv.m[0].r.root.visible; } }
    // dia 14: a festa do Rosário
    if (this.festa) { const F = this.festa; F.t += dt; const d = Math.hypot(pp.x - F.cx, pp.z - F.cz);
      F.roda.forEach((e, i) => { const a = F.t * 0.32 + (i / F.roda.length) * Math.PI * 2, x = F.cx + Math.cos(a) * 4.2, z = F.cz - 0.5 + Math.sin(a) * 3.4; e.pos.set(x, this.yAt(x, z), z); e.r.root.visible = near(e, 70); if (!e.r.root.visible) return; e.r.root.position.copy(e.pos); e.r.root.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a)) + Math.PI; G.anim(e.r, dt, 0.9, 'walk', t); });
      if (d < 45) { F.b = (F.b || 0) - dt; if (F.b <= 0) { F.b = 0.42; const k = Math.floor(F.t / 0.42) % 4; this.audio.burst(0.07, k === 0 ? 110 : 170, Math.max(0.04, 0.24 - d / 220)); } }
      this.note('festa', F.cx, F.cz, 30, 'No adro do Rosário, a irmandade coroou o rei e a rainha: debaixo do guarda-sol vermelho, com a bandeira de Nossa Senhora e os tambores, a roda do congado gira e canta. É a festa dos pretos da vila — escravizados e forros juntos.', 'festa_rosario'); }
    // dia 13: o dobre de finados, lento
    if (this.dobre) { const D = this.dobre; D.t -= dt; if (D.t <= 0) { D.t = 4.5; const d = Math.hypot(pp.x - D.x, pp.z - D.z); this.audio.bell(Math.max(0.02, 0.09 - d / 4000), 147); }
      this.note('sinos', D.x, D.z, 30, 'Diante da Casa dos Contos, o povo se junta em silêncio. Os sinos dobram por Cláudio Manuel da Costa.', 'sinos'); }
  }
}
