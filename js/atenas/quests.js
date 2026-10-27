// Objetivos da jornada em Atenas e as 5 "corujas" (tetradracmas de prata) escondidas pela cidade
import * as THREE from 'three';
import { waterAt } from '../comum/collision.js';

export const OBJECTIVES = [
  { id: 'herodoto', text: 'Fale com Heródoto, o viajante de Halicarnasso, na ágora', hint: null },
  { id: 'socrates', text: 'Converse com Sócrates junto à oficina do sapateiro Simão', hint: null },
  { id: 'mirrina', text: 'Prove os figos de Mírrina no mercado da ágora', hint: null },
  { id: 'acropole', text: 'Suba à Acrópole pelos Propileus', hint: [-140, 0] },
  { id: 'mnesicles', text: 'Converse com o arquiteto Mnésicles no canteiro dos Propileus', hint: null },
  { id: 'partenos', text: 'Entre no Parthenon e veja a Atena Partenos', hint: [20, 12] },
  { id: 'fidias', text: 'Fale com Fídias, o escultor da deusa', hint: null },
  { id: 'ictino', text: 'Descubra com Ictino os segredos do Parthenon', hint: null },
  { id: 'lisimaque', text: 'Visite a sacerdotisa Lisímaque junto à oliveira sagrada', hint: null },
  { id: 'sofocles', text: 'Assista ao ensaio de Sófocles no teatro de Dioniso', hint: null },
  { id: 'aspasia', text: 'Seja recebida(o) por Aspásia em sua casa', hint: null },
  { id: 'calias', text: 'Visite o oleiro Cálias no Cerâmico', hint: null },
  { id: 'kylix', text: 'Leve a taça (kylix) de Cálias para o simpósio na casa de Aspásia', hint: null },
  { id: 'demon', text: 'Fale com o hoplita Dêmon na porta do Dípilon', hint: null },
  { id: 'pnyx', text: 'Suba à Pnyx, onde a assembleia do povo se reúne', hint: null },
  { id: 'formiao', text: 'Conheça o almirante Formião no porto', hint: null },
  { id: 'trirreme', text: 'Embarque na trirreme Páralos', hint: null },
  { id: 'glauco', text: 'Conheça o pescador Glauco na praia do Falero', hint: null },
  { id: 'mar', text: 'Nade no mar do Falero', hint: null },
  { id: 'barco', text: 'Saia ao mar num barco (E para embarcar)', hint: null },
  { id: 'naufragio', text: 'Mergulhe (Espaço na água) e ache a ânfora do naufrágio', hint: null },
  { id: 'psitalia', text: 'Navegue até a ilha de Psitália, onde Aristides venceu os persas', hint: null },
  { id: 'salamina', text: 'Visite o troféu da vitória no cabo de Salamina', hint: null },
  { id: 'corujas', text: 'Encontre as 5 corujas de prata (tetradracmas)', count: 5 },
  { id: 'artefatos', text: 'Encontre os 22 artefatos da Grécia Antiga', count: 22 },
  { id: 'pericles', text: 'Ouça Péricles na Pnyx', hint: null },
];
export const FINAL_REQ = 10;
const SAVE = 'cidades-historicas:atenas:v1';
const NOT_COUNTED = new Set(['pericles', 'corujas', 'artefatos']);

export class Quests {
  constructor(scene, city, glowTex, ui, audio) {
    this.ui = ui; this.audio = audio;
    this.done = new Set();
    this.scarabsFound = new Set(); // (nome herdado: as corujas)
    this.listeners = [];
    const S = city.spots;
    this.zones = city.zones; this.city = city; this.spots = city.spots;
    this.hints = {};
    const H = (id, v) => { if (v) this.hints[id] = [v.x, v.z]; };
    H('herodoto', S.npc_herodoto); H('socrates', S.simon); H('mirrina', S.market); H('mnesicles', S.mnesicles); H('fidias', S.partenos); H('ictino', S.parthenonDoor);
    H('lisimaque', S.olive); H('sofocles', S.theater); H('aspasia', S.casa_pericles); H('calias', S.potter); H('kylix', S.casa_pericles); H('demon', S.dipylon);
    H('pnyx', S.pnyx); H('formiao', S.quay); H('trirreme', S.trireme); H('glauco', S.fisher); H('mar', S.rowboat); H('barco', S.rowboat); H('naufragio', S.wreck); H('pericles', S.bema); H('psitalia', S.pan); H('salamina', S.tropaion);
    // corujas de prata: moeda com Atena de um lado e a coruja do outro
    const spots = [S.owl1, S.owl2, S.owl3, S.owl4, S.owl5].filter(Boolean);
    const coin = new THREE.CylinderGeometry(0.16, 0.16, 0.035, 24); coin.rotateX(Math.PI / 2);
    const silver = new THREE.MeshStandardMaterial({ color: 0xe6e8ea, metalness: 1, roughness: 0.25 });
    const face = new THREE.MeshStandardMaterial({ color: 0xbfc4c8, metalness: 1, roughness: 0.4 });
    this.scarabs = spots.map((p, i) => {
      const g = new THREE.Group(); g.position.copy(p); g.position.y += 0.6;
      g.add(new THREE.Mesh(coin, silver));
      const owl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), face); owl.scale.set(0.8, 1.1, 0.25); owl.position.z = 0.02; g.add(owl);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xdfefff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.setScalar(1.5); glow.layers.set(1); g.add(glow);
      scene.add(g);
      return { g, i, base: g.position.y };
    });
    this.load();
  }

  isDone(id) { return !id || this.done.has(id); }
  count() { return [...this.done].filter((d) => !NOT_COUNTED.has(d)).length; }
  finalUnlocked() { return this.count() >= FINAL_REQ; }

  complete(id) {
    if (this.done.has(id) || !OBJECTIVES.find((x) => x.id === id)) return false;
    this.done.add(id);
    const o = OBJECTIVES.find((x) => x.id === id);
    this.ui.toast(`Objetivo concluído: ${o.text}`, 'quest');
    this.audio.chime();
    this.save();
    this.ui.renderObjectives(this);
    this.listeners.forEach((f) => f(id));
    if (id !== 'pericles' && this.finalUnlocked() && !this._unlockedMsg) {
      this._unlockedMsg = true;
      setTimeout(() => this.ui.toast('A ágora inteira já fala do estrangeiro curioso... Péricles vai discursar na Pnyx e quer conhecê-lo!', 'royal'), 2500);
    }
    return true;
  }

  update(dt, t, player) {
    const p = player.pos, Z = this.zones;
    const inZ = (z) => z && p.x > z[0] && p.x < z[1] && p.z > z[2] && p.z < z[3];
    if (!this.done.has('acropole') && inZ(Z.acropole) && p.y > 50) this.complete('acropole');
    if (!this.done.has('partenos') && inZ(Z.cella) && p.y > 55) this.complete('partenos');
    if (!this.done.has('pnyx') && inZ(Z.pnyx) && p.y > 20) this.complete('pnyx');
    if (!this.done.has('mar') && player.swimming && waterAt(p.x, p.z) > -1 && !inZ(Z.porto)) this.complete('mar');
    // ilhas: vale pisar em terra firme (não só passar nadando ou de barco por perto)
    const ashore = !player.swimming && player.onGround && p.y > 1;
    if (!this.done.has('psitalia') && ashore && inZ(Z.psitalia)) this.complete('psitalia');
    if (!this.done.has('salamina') && ashore && this.spots?.tropaion && (p.x - this.spots.tropaion.x) ** 2 + (p.z - this.spots.tropaion.z) ** 2 < 15 * 15) this.complete('salamina');
    for (const s of this.scarabs) {
      if (this.scarabsFound.has(s.i)) continue;
      s.g.rotation.y = t * 1.5;
      s.g.position.y = s.base + Math.sin(t * 2 + s.i) * 0.08;
      const dx = s.g.position.x - p.x, dy = s.g.position.y - (p.y + 0.6), dz = s.g.position.z - p.z;
      if (dx * dx + dy * dy + dz * dz < 1.8 * 1.8) this.takeScarab(s);
    }
  }

  takeScarab(s) {
    this.scarabsFound.add(s.i);
    s.g.visible = false;
    const n = this.scarabsFound.size;
    this.audio.coin();
    this.ui.toast(`Coruja de prata encontrada! (${n}/5) — uma tetradracma, quatro dracmas: uns quatro dias de trabalho de um remador.`, 'scarab');
    if (n >= 5) this.complete('corujas'); else { this.save(); this.ui.renderObjectives(this); }
  }

  save() { try { localStorage.setItem(SAVE, JSON.stringify({ done: [...this.done], owls: [...this.scarabsFound] })); } catch (e) { /* sem armazenamento */ } }
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE) || 'null');
      if (!d) return;
      d.done.forEach((x) => this.done.add(x));
      (d.owls || []).forEach((i) => { this.scarabsFound.add(i); if (this.scarabs[i]) this.scarabs[i].g.visible = false; });
      if (this.finalUnlocked()) this._unlockedMsg = true;
    } catch (e) { /* ignora */ }
  }
  reset() { try { localStorage.removeItem(SAVE); localStorage.removeItem(SAVE + ':artefatos'); } catch (e) { /* */ } }
  hintFor(o) { return o.hint || this.hints[o.id] || null; }
}
