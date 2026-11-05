// O povo do pé do Fuji: os personagens com conversa, os moradores e mercadores da rua dos oshi, as filas de
// peregrinos de branco que sobem a trilha, os samurais de guarda na residência e treinando no dōjō e na raia de
// arco, os lavradores nos arrozais, os monges do templo, o sacerdote, os fregueses das casas de chá, os
// peregrinos em volta do fogo das casas dos oshi e os donos das cabanas da montanha.
import * as THREE from 'three';
import { makeHumanoid, animateHumanoid, playOnce, rigDetail } from '../comum/mixamo.js';
import { makeAnimal, animateAnimal, makeBird } from '../comum/animals.js';
import { creature } from '../comum/fauna.js';
import { NPCS, VILLAGER_LINES, PILGRIM_LINES, SAMURAI_LINES, FARMER_LINES, MONK_LINES, MERCHANT_LINES, CHILD_LINES, PRIEST_LINES } from './dialogues.js';
import { groundAt, moveWithCollision, terrainAt, waterAt } from '../comum/collision.js';
import { terrainHeight, STREET, FIELDS, LAKE, SHRINE, TRAIL, INARI, inLake, fujiH, forestAt, meadowAt, trailAt } from './terrain.js';
import { blocked } from '../comum/collision.js';
import { labelTexture, markerTexture } from './textures.js';
import { rr, rand, pick, angleLerp } from '../comum/util.js';
import { Kyudo, Suburi } from './treino.js';

const V3 = THREE.Vector3;
const SKINS = [0xd2aa86, 0xc8a07e, 0xbf9470, 0xd8b496, 0xb48662, 0xc49a78];
const COLS = [0x2a3a5a, 0x3a3428, 0x5a4a3a, 0x6a5a40, 0x2a3a2a, 0x4a3a4a, 0x2a2a30, 0x5a3a2a, 0x3a4a5a];
const FCOLS = [0x9a3a4a, 0x5a3a6a, 0x2a4a6a, 0x8a5a3a, 0x3a5a4a, 0xb86a4a, 0x6a2a3a];
const PATS = ['plain', 'shima', 'kasuri', 'koshi', 'plain', 'shima'];

function castsShadow(root, on) { if (root.userData.sh === on) return; root.userData.sh = on; root.traverse((o) => { if (o.isMesh) o.castShadow = on; }); }

export class Actors {
  constructor(scene, city) {
    this.viewR = 60; this.scene = scene; this.city = city;
    this.key = []; this.agents = []; this.animals = []; this.flocks = [];
    this.camera = null; this._fr = new THREE.Frustum(); this._pv = new THREE.Matrix4(); this._s = new THREE.Sphere(); this.pp = new V3();
    this.markerTex = markerTexture('!'); this.t = 0;
  }
  addHuman(look, x, z, ry = 0, y) {
    const rig = makeHumanoid({ skin: pick(SKINS), ...look });
    const pos = new V3(x, y ?? groundAt(x, z, Math.max(terrainAt(x, z), waterAt(x, z)) + 1.6), z);
    rig.root.position.copy(pos); rig.root.rotation.y = ry; this.scene.add(rig.root);
    return { rig, pos };
  }
  look(kind) {
    const c = pick(COLS), p = pick(PATS);
    switch (kind) {
      case 'woman': return { outfit: 'kimono_f', cloth: pick(FCOLS), pattern: pick(['kasuri', 'koshi', 'plain', 'shima', 'wave']), accent: pick(['#f2e6d0', '#1a1a22', '#d8b04a']), obi: pick([0xd8b04a, 0x2a3a5a, 0x8a2a2a, 0x3a2a22]) };
      case 'merchant': return { outfit: 'merchant', cloth: c, pattern: p, haoriColor: pick([0x2a2a30, 0x3a2a22, 0x2a3040]) };
      case 'samurai': return { outfit: 'samurai', cloth: pick([0x2a2a36, 0x3a3428, 0x2a3a4a]), hakama: pick([0x4a4a56, 0x3a3440, 0x5a524a]), extras: ['daisho'] };
      case 'guard': return { outfit: 'samurai', cloth: 0x2a2a36, hakama: 0x3a3a44, extras: ['daisho', 'yari'] };
      case 'trainee': return { outfit: 'samurai', cloth: 0xe8e2d4, hakama: 0x22283a, extras: [] }; // (o bokken vem do treino, nas duas mãos)
      case 'archer': return { outfit: 'samurai', cloth: 0xf2efe6, hakama: 0x1a1a22, extras: [] }; // (o arco vem do treino, na mão esquerda)
      case 'farmer': return { outfit: 'farmer', cloth: pick([0x2a3a5a, 0x3a4a5a, 0x4a4a3a]), pattern: pick(['kasuri', 'plain']), accent: '#e8e4da', extras: rand() < 0.6 ? ['kasa'] : ['tenugui'], female: rand() < 0.4 };
      case 'pilgrim': return { outfit: 'pilgrim', cloth: 0xf2efe6, extras: ['kasa_pilgrim', 'zue'] };
      case 'monk': return { outfit: 'monk', cloth: 0x1a1a1e, kesa: pick([0x7a5a2a, 0x5a4a3a]) };
      case 'priest': return { outfit: 'kannushi', cloth: 0xf6f2ea, hakama: 0x8aa0c8, extras: ['eboshi'] };
      case 'child': return { outfit: rand() < 0.5 ? 'kimono_f' : 'kimono', cloth: pick([...FCOLS, ...COLS]), pattern: pick(['kasuri', 'koshi', 'plain']), accent: '#f2e6d0', height: rr(1.0, 1.25), hair: rand() < 0.5 ? 'chonmage' : undefined };
      default: return { outfit: 'kimono', cloth: c, pattern: p, accent: pick(['#1a1a22', '#e8e4da']), extras: rand() < 0.25 ? ['tenugui'] : [] };
    }
  }
  // ---- os personagens com conversa
  spawnKey() {
    const C = this.city, S = C.spots, W = (h, lx, lz) => { const c = Math.cos(h.ry), s = Math.sin(h.ry); return [h.x + lx * c + lz * s, h.z - lx * s + lz * c]; };
    const tea = C.houses.filter((h) => h.kind === 'tea'), shops = C.houses.filter((h) => h.kind === 'shop'), osh = C.oshi[2];
    // as margens: anda da terra em direção ao meio do lago até o chão chegar à água, e volta 3 m (pé no seco)
    const edge = (x0, z0, dx, dz) => { let x = x0, z = z0; for (let i = 0; i < 400 && terrainHeight(x, z) > 0.35; i++) { x += dx; z += dz; } return [x - dx * 8, z - dz * 8]; };
    const shore = edge(LAKE.x + LAKE.a + 60, LAKE.z + 30, -0.5, 0), north = edge(LAKE.x - 60, LAKE.z - LAKE.b - 80, 0, 0.5);
    const P = {
      oshi: [osh.gate[0] + Math.sin(osh.ry) * 2.2, osh.gate[1] + Math.cos(osh.ry) * 2.2, osh.ry], sendatsu: [SHRINE.x + 3.5, SHRINE.z - SHRINE.d / 2 + 12, Math.PI],
      kannushi: [S.haiden.x - 2.5, S.haiden.z + 1, Math.PI], monge: [S.hondo.x, S.hondo.z, Math.PI / 2], daikan: [S.audience.x, S.audience.z, Math.PI / 2],
      sensei: [S.dojo.x, S.dojo.z + 2, Math.PI], kyudo: [S.range.x, S.range.z, Math.PI / 2], lavradora: [FIELDS.x0 + 10, (FIELDS.z0 + FIELDS.z1) / 2, -Math.PI / 2],
      chaya: [...W(tea[1], -tea[1].w * 0.1, tea[1].d / 2 + 1.8), tea[1].ry], pescador: [shore[0], shore[1], -Math.PI / 2], ronin: [...W(tea[3] || tea[0], tea[0].w * 0.2 - 0.4, tea[0].d / 2 + 1.0), (tea[3] || tea[0]).ry + Math.PI],
      eremita: S.hermit ? [S.hermit.x, S.hermit.z, Math.atan2(4.8, 2.2)] : [undefined], oleiro: [...W(shops[4], -shops[4].w / 2 + 1.7, shops[4].d / 2 + 0.8), shops[4].ry], cabaneiro: [C.stations[3].door[0], C.stations[3].door[1], C.stations[3].ry], kokan: [north[0], north[1], Math.atan2(0, 1) + Math.PI],
    };
    for (const def of NPCS) {
      const [x, z, ry] = P[def.id]; if (x === undefined) continue;
      const h = this.addHuman({ ...def.look }, x, z, ry);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(def.name, def.title), transparent: true, depthWrite: false }));
      label.scale.set(2.6, 0.65, 1); label.position.y = 2.35; label.renderOrder = 5; h.rig.root.add(label);
      const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.markerTex, transparent: true, depthWrite: false }));
      marker.scale.setScalar(0.8); marker.position.y = 2.95; h.rig.root.add(marker);
      const mode = def.id === 'ronin' ? 'sit' : def.id === 'lavradora' ? 'work' : 'idle';
      if (mode === 'sit' && h.rig.skirt) h.rig.skirt.visible = false;
      this.key.push({ def, ...h, ry, label, marker, talking: false, kind: 'npc', mode });
      S['npc_' + def.id] = new V3(x, h.pos.y, z);
    }
    // o cavalete do pintor, de frente para o lago e o Fuji
    { const k = this.key.find((q) => q.def.id === 'kokan'); if (k) { const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.9 });
      for (const [dx, rz] of [[-0.3, 0.12], [0.3, -0.12]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 5), wood); l.position.set(dx, 0.82, 0); l.rotation.z = rz; g.add(l); }
      const cv = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.02), new THREE.MeshStandardMaterial({ map: fujiCanvas(), roughness: 0.8 })); cv.position.set(0, 1.25, 0.04); cv.rotation.x = -0.15; g.add(cv);
      g.position.set(k.pos.x + Math.sin(k.ry) * 0.9, k.pos.y, k.pos.z + Math.cos(k.ry) * 0.9); g.rotation.y = k.ry + Math.PI; this.scene.add(g); } }
  }
  // ---- a gente da cidade
  spawnTown() {
    const C = this.city, S = STREET, add = (kind, x, z, ry, o = {}) => { const h = this.addHuman(o.look || this.look(kind), x, z, ry, o.y); const a = { ...h, kind: o.as || kind, ry, lines: o.lines || VILLAGER_LINES, mode: o.mode || 'idle', ...o.extra }; if (a.mode === 'sit' && h.rig.skirt) h.rig.skirt.visible = false; this.agents.push(a); return a; };
    const walker = (kind, region, n, o = {}) => { for (let i = 0; i < n; i++) { const x = rr(region[0], region[1]), z = rr(region[2], region[3]); add(kind, x, z, rand() * 6, { ...o, extra: { region, speed: o.speed ?? rr(0.9, 1.35), wait: rr(0, 4), run: o.run } }); } };
    const street = [S.x - S.hw + 0.8, S.x + S.hw - 0.8, S.z0 + 10, S.z1 + 40];
    walker('man', street, 9); walker('woman', street, 7); walker('merchant', street, 3, { lines: MERCHANT_LINES }); walker('child', street, 4, { lines: CHILD_LINES, speed: 2.6, run: true, as: 'child' });
    walker('samurai', street, 2, { lines: SAMURAI_LINES, speed: 1.1, as: 'samurai' });
    // os peregrinos: filas de branco, do santuário até o cume e de volta (cada fila com o seu ritmo)
    const up = TRAIL.map(([x, z]) => new V3(x, 0, z)), route = [new V3(S.x, 0, S.z1 - 20), new V3(SHRINE.x, 0, SHRINE.z - 30), new V3(SHRINE.x - 9, 0, SHRINE.z + 40), ...up, ...[...up].reverse(), new V3(SHRINE.x - 9, 0, SHRINE.z + 40), new V3(SHRINE.x, 0, SHRINE.z - 30), new V3(S.x, 0, -150)];
    for (let g = 0; g < 7; g++) { const start = Math.floor((g / 7) * route.length);
      for (let i = 0; i < 4; i++) { const p = route[start], lk = this.look('pilgrim'); if (i % 2 === 0) lk.extras = [...lk.extras, 'chochin']; const a = add('pilgrim', p.x + rr(-2, 2), p.z - i * 2.2, 0, { look: lk, lines: PILGRIM_LINES, as: 'pilgrim', extra: { route: route.map((q) => q.clone().add(new V3(((i % 2) - 0.5) * 1.4, 0, 0))), ri: start, speed: 1.05 + g * 0.05, wait: i * 1.6 } }); void a; } }
    // os carregadores (gōriki), que subiam com a bagagem dos peregrinos e a lenha das cabanas
    for (let i = 0; i < 4; i++) { const st = Math.floor(rand() * route.length * 0.4) + 3, lk = this.look('farmer'); lk.extras = ['basket_back', 'tenugui']; lk.female = false; add('farmer', route[st].x + 1.5, route[st].z, 0, { look: lk, lines: ['Trinta quilos nas costas, sobe e desce, todo dia. O peregrino reza; eu carrego.', 'O segredo é o passo curto. Quem corre aqui embaixo para lá em cima.'], as: 'farmer', extra: { route: route.map((q) => q.clone().add(new V3(-1.2, 0, 0))), ri: st, speed: 0.95 } }); }
    // as aldeias: gente andando entre as casas; os pescadores no píer; as colhedoras de chá; o moleiro; quem reza em Inari
    for (const H of C.hamlets || []) { const reg = [H.x - H.r, H.x + H.r, H.z - H.r, H.z + H.r]; walker('man', reg, 2); walker('woman', reg, 2); walker('child', reg, 1, { lines: CHILD_LINES, speed: 2.4, run: true, as: 'child' }); }
    if (C.pier) for (let i = 0; i < 2; i++) add('farmer', C.pier.x + 3 + i * 3, C.pier.z + (i ? 0.6 : -0.6), Math.PI / 2, { mode: i ? 'work' : 'idle', lines: ['O lago dá carpa e enguia. E de manhã, com névoa, dá até medo de tão bonito.', 'A rede tem de secar todo dia, senão apodrece.'], as: 'farmer', y: C.pier.y, extra: { static: true } });
    if (C.spots.tea) for (let i = 0; i < 4; i++) { const lk = this.look('farmer'); lk.female = true; lk.extras = ['kasa', 'basket_back']; add('farmer', C.spots.tea.x - 20 + i * 12, C.spots.tea.z + 10 + (i % 2) * 6.4, rand() * 6, { look: lk, mode: 'work', lines: ['Só as folhas novas, as três de cima. As outras ficam para a planta crescer.', 'O chá daqui vai para a residência e para as casas de chá da rua.'], as: 'farmer', extra: { static: true, field: true } }); }
    if (C.spots.mill) add('farmer', C.spots.mill.x, C.spots.mill.z, 0, { mode: 'idle', lines: ['A roda gira dia e noite, e a mó lá dentro mói o arroz e o trigo-sarraceno do soba.'], as: 'farmer', extra: { static: true } });
    if (C.spots.oyuki) { const H = C.spots.oyuki; add('woman', H.x, H.z, Math.atan2(3.1, -3.6), { mode: 'work', lines: ['Sou Oyuki. Cuido da cerejeira e do laguinho com o vovô Genzō. A água vem da neve derretida da borda.', 'Aqui no fundo da cratera o vento não entra. É o jardim mais alto do Japão... pelo menos neste jogo!'], extra: { static: true } }); }
    if (C.spots.inari) add('woman', C.spots.inari.x, C.spots.inari.z, 0, { mode: 'talk', lines: ['Inari cuida do arroz e dos negócios. Quem tem um pedido atendido doa um torii novo — por isso o caminho não para de crescer.'], extra: { static: true } });
    walker('man', [-190, -110, -40, 10], 2, { speed: 0.8 }); // gente passeando no bambuzal
    // em Umagaeshi: o cavalariço e os cavalos amarrados, esperando os peregrinos descerem
    if (C.umagaeshi) { const U = C.umagaeshi; add('farmer', U.x, U.z, U.ry, { lines: ['Daqui para cima, só a pé. O cavalo espera, e eu também.', 'Antigamente diziam que a montanha era sagrada demais para o cavalo pisar.'], as: 'farmer', extra: { static: true } });
      for (let k = 0; k < 2; k++) creature('cavalo', 2.2, { tint: [0.8, 0.6, 0.45] }).then((c) => { if (!c) return; const x = U.x + Math.sin(U.ry) * (2 + k * 3) + Math.cos(U.ry) * 2, z = U.z + Math.cos(U.ry) * (2 + k * 3) - Math.sin(U.ry) * 2; c.holder.position.set(x, terrainHeight(x, z), z); c.holder.rotation.y = U.ry + Math.PI / 2; c.holder.traverse((o) => { if (o.isMesh) o.castShadow = true; }); this.scene.add(c.holder); }); }
    // os guardas no portão da residência, os samurais da raia e do dōjō
    for (const g of C.guards) add('guard', g.x, g.z, g.ry, { lines: SAMURAI_LINES, mode: 'guard', as: 'samurai', extra: { static: true } });
    if (C.dojo) { const d = C.dojo.f; for (const [lx, lz] of [[-3, -1.5], [-1, -1.5], [1, -1.5], [3, -1.5], [-2, 1.2], [2, 1.2]]) { const [x, z] = d.W(lx, lz); const a = add('trainee', x, z, d.ry + (lz < 0 ? 0 : Math.PI), { lines: ['Hai!', 'Mais um golpe e eu caio...', 'O mestre vê tudo, até o que a gente pensa.'], mode: 'guard', as: 'samurai', y: C.dojo.y + C.dojo.FL, extra: { static: true } }); const tr = new Suburi(a.rig, rr(0, 2.5)); a.trainer = tr; a.rig.post = () => tr.apply(); } }
    if (C.range) { const [fx, fz] = C.range.from; for (let i = 0; i < 2; i++) { const a = add('archer', fx + (i ? 2.2 : -2.2) * Math.cos(C.range.f.ry), fz - (i ? 2.2 : -2.2) * Math.sin(C.range.f.ry), C.range.f.ry - Math.PI / 2, { lines: ['Shh. Respire antes de atirar.', 'O alvo é pequeno, a distância é grande, e o vento não ajuda.'], mode: 'idle', as: 'samurai', y: C.range.y, extra: { static: true, archer: true } }); const tr = new Kyudo(a.rig, i ? 0 : 6); tr.onRelease = (from, dir) => this.onArrow?.(from, dir); a.trainer = tr; a.rig.post = () => tr.apply(); } }
    // os lavradores nos arrozais: abaixados no barro, cada um no seu tabuleiro
    { const P = (C.paddies?.plots || []).slice().sort(() => rand() - 0.5); for (let i = 0; i < 20 && P.length; i++) { const p = P[i % P.length], x = p.cx + rr(-14, 14), z = p.cz + rr(-9, 9); const lk = this.look('farmer'); if (i % 3 === 0) { lk.female = true; lk.extras = ['kasa']; } add('farmer', x, z, rand() * 6, { look: lk, lines: FARMER_LINES, mode: rand() < 0.8 ? 'work' : 'idle', as: 'farmer', y: p.y + 0.03, extra: { static: true, field: true } }); } } // (dentro da água, cada um no seu tabuleiro)
    walker('farmer', [FIELDS.x0, FIELDS.x1, FIELDS.z0, FIELDS.z1], 4, { lines: FARMER_LINES, as: 'farmer', speed: 0.9 });
    // o templo, o santuário
    if (C.spots.hondo) { add('monk', C.spots.incense.x - 3, C.spots.incense.z + 6, 1.2, { lines: MONK_LINES, mode: 'work', as: 'monk', extra: { static: true } }); walker('monk', [C.spots.incense.x - 12, C.spots.incense.x + 4, C.spots.incense.z - 10, C.spots.incense.z + 10], 1, { lines: MONK_LINES, as: 'monk', speed: 0.7 }); }
    if (C.spots.temizuya) add('priest', C.spots.temizuya.x, C.spots.temizuya.z + 1.5, Math.PI, { lines: PRIEST_LINES, as: 'priest', extra: { static: true } });
    walker('woman', [SHRINE.x - 5, SHRINE.x + 5, SHRINE.z - 50, SHRINE.z + 20], 3); walker('man', [SHRINE.x - 5, SHRINE.x + 5, SHRINE.z - 50, SHRINE.z + 20], 2);
    // fregueses sentados nas casas de chá; peregrinos em volta do fogo dentro das casas dos oshi; mercadores nas portas
    for (const s of C.seats) add(rand() < 0.5 ? 'pilgrim' : rand() < 0.5 ? 'woman' : 'man', s.x, s.z, s.ry, { mode: 'sit', lines: rand() < 0.5 ? PILGRIM_LINES : VILLAGER_LINES, y: s.y - 0.46, extra: { static: true } }); // (a pose sentada já traz o quadril a ~0,5 m: o boneco fica no chão e o quadril pousa no banco)
    for (const h of C.hearths.filter((q, i) => i % 2 === 0).slice(0, 12)) { for (const k of [0, 1]) { const a = (k ? 1 : -1) * 1.0 + h.ry, x = h.x + Math.sin(a) * 1.15, z = h.z + Math.cos(a) * 1.15; add('pilgrim', x, z, a + Math.PI, { mode: 'work', lines: PILGRIM_LINES, as: 'pilgrim', y: h.y, extra: { static: true } }); } }
    for (const h of C.houses.filter((q) => q.kind === 'shop').slice(0, 10)) { const [x, z] = h.door; add('merchant', x, z, h.ry, { mode: rand() < 0.5 ? 'talk' : 'idle', lines: MERCHANT_LINES, extra: { static: true } }); }
    // os donos das cabanas da montanha
    for (const st of C.stations) { if (st.n === 5) continue; add('farmer', st.bench[0], st.bench[1], st.ry, { mode: 'sit', lines: ['Água quente, chá, sandália nova! E o carimbo no cajado.', 'Daqui para cima o vento muda de humor a cada hora.'], as: 'farmer', y: st.y, extra: { static: true } }); }
  }

  // ---- os bichos: cães e gatos na vila, bois de tração nos arrozais, patos no lago, bandos de corvos e de
  // milhafres no céu e, raro, um urso-negro na floresta alta (longe da trilha). Raposa, cervo-sika, macaco, tanuki e
  // faisão ficam para quando houver modelos 3D de verdade deles (o Pedro baixa do Sketchfab).
  spawnAnimals() {
    const add = (kind, x, z, o = {}) => { const a = makeAnimal(kind); const y = o.y ?? groundAt(x, z, terrainAt(x, z) + 1.6); a.g.position.set(x, y, z); a.g.rotation.y = rand() * 6; if (o.scale) a.g.scale.setScalar(o.scale); a.seed = rand() * 10; this.scene.add(a.g);
      const q = { a, pos: a.g.position, home: new V3(x, y, z), radius: o.radius ?? 8, speed: a.speed * (o.speedMul || 1), wait: rr(0, 5), static: o.static, water: o.water }; this.animals.push(q); return q; };
    const S = STREET;
    for (let i = 0; i < 5; i++) add('dog', S.x + rr(-5, 5), rr(S.z0 + 20, S.z1), { radius: 14, scale: 0.85 });
    for (let i = 0; i < 5; i++) add('cat', S.x + rr(-6, 6), rr(S.z0 + 20, S.z1), { radius: 6 });
    for (let i = 0; i < 3; i++) add('ox', FIELDS.x0 - 12 + rr(-3, 3), rr(FIELDS.z0 + 30, FIELDS.z1 - 30), { radius: 5, scale: 0.9 });
    for (let i = 0; i < 10; i++) { const a = rand() * 6.28, d = Math.sqrt(rand()) * 0.75, x = LAKE.x + Math.cos(a) * LAKE.a * d, z = LAKE.z + Math.sin(a) * LAKE.b * d; if (inLake(x, z, -10)) add('duck', x, z, { y: 0.02, radius: 18, water: true }); }
    for (let k = 0; k < 6; k++) { const crow = k < 4, c = crow ? new V3(rr(-150, 300), rr(35, 60), rr(-500, 60)) : new V3(rr(-200, 300), rr(120, 220), rr(200, 900)), birds = [];
      for (let i = 0; i < (crow ? 7 : 2); i++) { const b = makeBird(crow ? 0x141414 : 0x5a4030); b.off = new V3(rr(-8, 8), rr(-3, 3), rr(-8, 8)); b.ph = rand() * 6; b.g.scale.setScalar(crow ? 1.3 : 2.6); this.scene.add(b.g); birds.push(b); }
      this.flocks.push({ center: c, r: rr(30, 90), w: rr(0.04, 0.09) * (rand() < 0.5 ? -1 : 1), birds, ph: rand() * 6, glide: !crow }); }
    // o urso-negro: anda devagar num circuito da floresta alta, longe da trilha
    creature('urso', 1.7, { tint: [0.32, 0.3, 0.3] }).then((c) => { if (!c) return; const pts = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28; let x = 360 + Math.cos(a) * 140, z = 760 + Math.sin(a) * 120; pts.push(new V3(x, 0, z)); }
      c.holder.traverse((o) => { if (o.isMesh) o.castShadow = true; }); this.scene.add(c.holder); this.bear = { c, pts, i: 0, pos: pts[0].clone() }; });
    this.spawnWild();
  }
  // ---- os bichos de verdade (modelos do Sketchfab): cervos-sika nas clareiras da floresta, a raposa deitada junto
  // ao santuário de Inari (a mensageira do deus do arroz), um bando de macacos-japoneses na mata da trilha e faisões
  // no capim do campo. Cada um anda devagar pela sua área, para, come, descansa.
  spawnWild() {
    const W = (this.wild = []);
    const free = (x, z) => !blocked(x, z, terrainAt(x, z), 0.6, 1.5) && waterAt(x, z) < terrainAt(x, z) - 0.2;
    const spotNear = (cx, cz, r, ok = () => true) => { for (let i = 0; i < 40; i++) { const x = cx + rr(-r, r), z = cz + rr(-r, r); if (free(x, z) && ok(x, z)) return [x, z]; } return null; };
    const put = (name, size, at, o) => { if (!at) return; creature(name, size, { still: true, tint: o.tint }).then((c) => { if (!c) return;
      const acts = {}; for (const cl of c.clips) acts[cl.name.replace(/^.*\|/, '')] = c.mixer.clipAction(cl);
      const [x, z] = at, pos = new V3(x, groundAt(x, z, terrainAt(x, z) + 1), z);
      c.holder.position.copy(pos); c.holder.rotation.y = rand() * 6.28; c.holder.visible = false; this.scene.add(c.holder);
      if (o.smooth) c.holder.traverse((m) => { const t = m.material?.map; if (t) { t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; } }); // (a textura de pixel do macaco, suavizada)
      const w = { c, acts, pos, home: pos.clone(), cur: null, wait: rr(1, 6), target: null, ...o }; this.playWild(w, o.idle[0]); W.push(w); }); };
    // cervos: dois grupos pequenos, em clareiras de capim na floresta entre a vila e a montanha
    const deer = { radius: 22, speed: 1.0, walk: 'Walk', idle: ['Stand_Eating_01', 'Stand_Breathing_01', 'Stand_Eating_01'], tint: [1.05, 0.82, 0.66] };
    for (const [cx, cz] of [[-330, 180], [470, 120]]) { const c = spotNear(cx, cz, 60, (x, z) => meadowAt(x, z)) || spotNear(cx, cz, 40); if (!c) continue; for (let k = 0; k < 3; k++) put('cervo', k ? 1.15 : 1.3, spotNear(c[0], c[1], 8), deer); }
    // a raposa: deitada ao lado do caminho, no fim do túnel de torii de Inari; acorda devagar, olha e volta a deitar
    { const [ex, ez] = INARI[INARI.length - 1], [px, pz] = INARI[INARI.length - 2], dx = ex - px, dz = ez - pz, l = Math.hypot(dx, dz) || 1;
      const at = spotNear(ex - dz / l * 5 - dx / l * 3, ez + dx / l * 5 - dz / l * 3, 3); put('raposa', 0.95, at, { radius: 0, speed: 0, idle: ['Waking Up'], slow: 0.55 }); }
    // macacos-japoneses: um bando na mata ao lado do começo da trilha
    { const p = trailAt(0.07), c = spotNear(p.x + p.dz * 30, p.z - p.dx * 30, 12); const mk = { radius: 14, speed: 0.8, walk: 'Walking', idle: ['Sitting', 'Idling', 'Sitting'], tint: [0.92, 0.8, 0.68], smooth: true };
      if (c) for (let k = 0; k < 5; k++) put('macaco', k ? rr(0.5, 0.65) : 0.75, spotNear(c[0], c[1], 6), mk); }
    // faisões: no capim do campo a leste dos arrozais (ficam no lugar, ciscando)
    { const fs = { radius: 0, speed: 0, idle: ['Take 001'] }; for (const [cx, cz] of [[330, -380], [420, -470], [300, -300]]) put('faisao', 1.0, spotNear(cx, cz, 25), fs); }
  }
  playWild(w, name) {
    const a = w.acts[name] || Object.values(w.acts)[0]; if (!a || w.cur === a) return;
    a.reset(); a.timeScale = name === w.walk ? 1 : w.slow || 1; a.time = Math.random() * a.getClip().duration; a.play();
    if (w.cur) a.crossFadeFrom(w.cur, 0.4, false); w.cur = a;
  }
  updateWild(dt, pp) {
    for (const w of this.wild || []) {
      const dx0 = w.pos.x - pp.x, dz0 = w.pos.z - pp.z, d2 = dx0 * dx0 + dz0 * dz0, vis = d2 < 110 * 110;
      w.c.holder.visible = vis; if (!vis) continue;
      if (w.speed > 0) {
        if (w.wait > 0) { w.wait -= dt; if (w.wait <= 0) { const a = rand() * 6.28, r = rr(4, w.radius); const x = w.home.x + Math.cos(a) * r, z = w.home.z + Math.sin(a) * r; if (!blocked(x, z, terrainAt(x, z), 0.5, 1.2) && waterAt(x, z) < terrainAt(x, z) - 0.2) { w.target = new V3(x, 0, z); this.playWild(w, w.walk); } else w.wait = 1; } }
        else if (w.target) { const dx = w.target.x - w.pos.x, dz = w.target.z - w.pos.z, d = Math.hypot(dx, dz);
          if (d < 0.5) { w.target = null; w.wait = rr(4, 14); this.playWild(w, pick(w.idle)); }
          else { const sp = w.speed * dt, ox = w.pos.x, oz = w.pos.z; moveWithCollision(w.pos, dx / d * sp, dz / d * sp, 0.4, 1.2);
            if (Math.hypot(w.pos.x - ox, w.pos.z - oz) < sp * 0.3) { w.target = null; w.wait = rr(2, 6); this.playWild(w, pick(w.idle)); }
            w.pos.y = groundAt(w.pos.x, w.pos.z, w.pos.y + 0.4); w.c.holder.rotation.y = angleLerp(w.c.holder.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 3)); } }
        // (fogem um pouco de quem chega correndo perto)
        if (d2 < 7 * 7 && !w.fleeing) { const l = Math.sqrt(d2) || 1; w.target = new V3(w.pos.x + dx0 / l * 12, 0, w.pos.z + dz0 / l * 12); w.wait = 0; w.fleeing = true; this.playWild(w, w.walk); } else if (d2 > 14 * 14) w.fleeing = false;
        w.c.holder.position.copy(w.pos);
      }
      if (d2 < 60 * 60 || (this.t * 10 | 0) % 3 === 0) w.c.mixer.update(d2 < 60 * 60 ? dt : dt * 3); // (longe, a animação anda em passos maiores)
    }
  }
  updateAnimals(dt, t, pp, night) {
    const near = (p, r) => (p.x - pp.x) ** 2 + (p.z - pp.z) ** 2 < r * r;
    for (const o of this.animals) {
      const vis = near(o.pos, this.viewR); o.a.g.visible = vis; if (!vis) continue; castsShadow(o.a.g, near(o.pos, 25));
      let moving = false;
      if (o.wait > 0) o.wait -= dt;
      else { if (!o.target) { for (let i = 0; i < 6; i++) { const c = new V3(o.home.x + rr(-o.radius, o.radius), 0, o.home.z + rr(-o.radius, o.radius)); if (o.water ? inLake(c.x, c.z, -8) : terrainHeight(c.x, c.z) > 0.5) { o.target = c; break; } } if (!o.target) o.wait = 2; }
        if (o.target) { const dx = o.target.x - o.pos.x, dz = o.target.z - o.pos.z, d = Math.hypot(dx, dz);
          if (d < 0.3) { o.target = null; o.wait = rr(2, 10); }
          else { const sp = o.speed * dt, ox = o.pos.x, oz = o.pos.z; if (o.water) { o.pos.x += dx / d * sp; o.pos.z += dz / d * sp; } else { moveWithCollision(o.pos, dx / d * sp, dz / d * sp, 0.2, 0.6); if (Math.hypot(o.pos.x - ox, o.pos.z - oz) < sp * 0.3) { o.target = null; o.wait = 1; } o.pos.y = groundAt(o.pos.x, o.pos.z, o.pos.y + 0.3); }
            o.a.g.rotation.y = angleLerp(o.a.g.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 4)); moving = true; } } }
      animateAnimal(o.a, dt, moving, t);
    }
    for (const fl of this.flocks) { fl.ph += dt * fl.w; const cx = fl.center.x + Math.cos(fl.ph) * fl.r, cz = fl.center.z + Math.sin(fl.ph) * fl.r, hd = Math.atan2(-Math.sin(fl.ph) * Math.sign(fl.w), Math.cos(fl.ph) * Math.sign(fl.w));
      for (const b of fl.birds) { b.g.position.set(cx + b.off.x, fl.center.y + b.off.y + Math.sin(t + b.ph) * 1.5, cz + b.off.z); b.g.rotation.y = hd; const flap = fl.glide ? Math.sin(t * 1.2 + b.ph) * 0.08 : Math.sin(t * 7 + b.ph) * 0.5; b.wl.rotation.z = flap; b.wr.rotation.z = -flap; b.g.visible = night < 0.5; } }
    const B = this.bear; if (B) { const vis = near(B.pos, 120); B.c.holder.visible = vis; if (vis) { const tg = B.pts[B.i], dx = tg.x - B.pos.x, dz = tg.z - B.pos.z, d = Math.hypot(dx, dz); if (d < 2) B.i = (B.i + 1) % B.pts.length; else { B.pos.x += dx / d * dt * 0.9; B.pos.z += dz / d * dt * 0.9; }
      B.pos.y = terrainHeight(B.pos.x, B.pos.z); B.c.holder.position.copy(B.pos); B.c.holder.rotation.y = angleLerp(B.c.holder.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 2)); B.c.mixer?.update(dt * 0.6);
      if (near(B.pos, 30) && !this.bearSeen) { this.bearSeen = true; this.onBear?.(); } } }
  }
  // a estação: no inverno os arrozais ficam vazios (a terra descansa) e quem anda na rua usa capa de algodão acolchoado
  setSeason(s) {
    const winter = s === 'inverno';
    for (const a of this.agents) {
      if (a.field) a.rig.root.userData.off = winter;
      if (a.static || a.route) continue;
      if (!a.cloak && winter) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.27, 0.62, 16, 1, true), new THREE.MeshStandardMaterial({ color: pick([0x2a2a34, 0x3a2e26, 0x2e3a3a]), roughness: 0.95, side: THREE.DoubleSide })); m.position.y = 1.12; m.scale.z = 0.82; a.rig.root.add(m); a.cloak = m; }
      if (a.cloak) a.cloak.visible = winter;
    }
  }
  nearestInteractable(p, max = 2.8) {
    let best = null, bd = max * max;
    const test = (o, type) => { const d = (o.pos.x - p.x) ** 2 + (o.pos.z - p.z) ** 2; if (d < bd && Math.abs(o.pos.y - p.y) < 2) { bd = d; best = { type, o }; } };
    for (const k of this.key) test(k, 'npc');
    for (const a of this.agents) test(a, a.kind);
    return best;
  }
  anim(rig, dt, speed, mode, t) {
    rig._acc = (rig._acc || 0) + dt;
    const p = rig.root.position, d2 = (p.x - this.pp.x) ** 2 + (p.z - this.pp.z) ** 2;
    castsShadow(rig.root, d2 < (this.shadowR ?? 40) ** 2); rigDetail(rig, d2); // (sombra só de quem está perto; cílios só bem de perto)
    let every = 0;
    if (this.camera) { this._s.center.set(p.x, p.y + 0.95, p.z); this._s.radius = 1.6; const seen = this._fr.intersectsSphere(this._s); every = !seen ? 1 / 8 : d2 < 25 * 25 ? 0 : d2 < 45 * 45 ? 1 / 30 : 1 / 15; }
    if (rig._acc < every) return;
    animateHumanoid(rig, rig._acc, speed, mode, t); rig._acc = 0; rig.post?.();
  }
  update(dt, t, player, quests, nightFactor) {
    this.t = t; const pp = player.pos; this.pp = pp;
    this.updateAnimals(dt, t, pp, nightFactor); this.updateWild(dt, pp);
    if (this.camera) { this._pv.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse); this._fr.setFromProjectionMatrix(this._pv); }
    const near = (o, r) => (o.pos.x - pp.x) ** 2 + (o.pos.z - pp.z) ** 2 < r * r;
    const face = (o, target, k) => { if (!target) return; const ang = Math.atan2(target.x - o.pos.x, target.z - o.pos.z); o.rig.root.rotation.y = angleLerp(o.rig.root.rotation.y, ang, Math.min(1, dt * k)); };
    for (const k of this.key) {
      const vis = near(k, this.viewR + 15); k.rig.root.visible = vis; if (!vis) continue;
      const close = near(k, 5), seated = (k.mode === 'sit' || k.mode === 'work') && !k.talking;
      if (k.talking || (close && !seated)) face(k, pp, 5); else k.rig.root.rotation.y = angleLerp(k.rig.root.rotation.y, k.ry, dt * 2);
      this.anim(k.rig, dt, 0, k.talking ? 'talk' : k.mode, t);
      k.label.visible = near(k, 20);
      k.marker.visible = !quests.isDone(k.def.objective) && near(k, 60); k.marker.position.y = 2.95 + Math.sin(t * 3) * 0.08;
    }
    for (const a of this.agents) {
      const vis = near(a, this.viewR) && !a.rig.root.userData.off; a.rig.root.visible = vis; if (!vis) continue;
      if (a.talking) { a.trainer?.step(dt, false); face(a, pp, 6); this.anim(a.rig, dt, 0, 'talk', t); continue; }
      if (a.static) {
        if (a.ry !== undefined && a.mode !== 'work') a.rig.root.rotation.y = angleLerp(a.rig.root.rotation.y, a.ry, dt * 2);
        a.trainer?.step(dt, nightFactor < 0.5); // o treino (kyūdō e suburi), cada um no seu ritmo
        this.anim(a.rig, dt, 0, a.mode, t); continue;
      }
      if (a.wait > 0) { a.wait -= dt; this.anim(a.rig, dt, 0, 'idle', t); continue; }
      if (!a.target) {
        if (a.route) { a.target = a.route[a.ri]; a.ri = (a.ri + 1) % a.route.length; }
        else { for (let i = 0; i < 8; i++) { const c = new V3(rr(a.region[0], a.region[1]), 0, rr(a.region[2], a.region[3])); if (waterAt(c.x, c.z) < terrainAt(c.x, c.z) - 0.2) { a.target = c; break; } } if (!a.target) { a.wait = 2; continue; } }
        a.stuck = 0;
      }
      const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z, dist = Math.hypot(dx, dz);
      if (dist < 0.8) { a.target = null; a.wait = a.route ? rr(0, 0.6) : rr(2, 9); continue; }
      const sp = a.speed * dt, ox = a.pos.x, oz = a.pos.z;
      moveWithCollision(a.pos, (dx / dist) * sp, (dz / dist) * sp, 0.3, 1.7);
      if (Math.hypot(a.pos.x - ox, a.pos.z - oz) < sp * 0.3) { a.stuck = (a.stuck || 0) + dt; if (a.stuck > 1.2) { if (a.route) { a.pos.x += dx / dist * 0.8; a.pos.z += dz / dist * 0.8; } a.target = null; a.wait = 0.3; } } // (nas filas, quem empaca dá um passo de lado e segue)
      a.pos.y = groundAt(a.pos.x, a.pos.z, a.pos.y + 0.45);
      a.rig.root.position.copy(a.pos); face(a, a.target, 5);
      this.anim(a.rig, dt, a.speed, a.run ? 'run' : 'walk', t);
    }
  }
}

// a tela do pintor: o Fuji ao estilo ocidental, com céu, montanha, reflexo
function fujiCanvas() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 96; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 60); g.addColorStop(0, '#7a9ac0'); g.addColorStop(1, '#e8d8c0'); x.fillStyle = g; x.fillRect(0, 0, 128, 60);
  x.fillStyle = '#4a5a7a'; x.beginPath(); x.moveTo(10, 60); x.quadraticCurveTo(55, 30, 62, 18); x.lineTo(70, 18); x.quadraticCurveTo(76, 30, 118, 60); x.fill();
  x.fillStyle = '#f4f4f8'; x.beginPath(); x.moveTo(52, 30); x.lineTo(62, 18); x.lineTo(70, 18); x.lineTo(80, 30); x.lineTo(70, 26); x.lineTo(64, 31); x.lineTo(58, 27); x.fill();
  x.fillStyle = '#3a5a5a'; x.fillRect(0, 60, 128, 36); x.globalAlpha = 0.5; x.fillStyle = '#5a6a8a'; x.beginPath(); x.moveTo(10, 60); x.quadraticCurveTo(55, 85, 64, 92); x.quadraticCurveTo(76, 85, 118, 60); x.fill(); x.globalAlpha = 1;
  x.fillStyle = '#2a3a2a'; x.fillRect(0, 56, 128, 5);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
void terrainHeight;
