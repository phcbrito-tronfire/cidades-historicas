// Objetivos da jornada no Japão (primeira etapa: a paisagem — o lago, a vila, a floresta e a subida do Fuji).
// Os personagens, os prédios e os artefatos entram nas próximas etapas, com os objetivos deles.
import { waterAt } from '../comum/collision.js';
import { FUJI, LAKE, STREET, SHRINE, TEMPLE, RESIDENCE, FIELDS, SNOW_Y, fujiH, fujiR, inLake } from './terrain.js';

export const OBJECTIVES = [
  { id: 'vila', text: 'Ande pela rua dos oshi, a rua das hospedarias dos peregrinos' },
  { id: 'lago', text: 'Chegue à margem do lago Kawaguchi' },
  { id: 'nadar', text: 'Nade no lago' },
  { id: 'arrozal', text: 'Passe pelos arrozais a nordeste da vila' },
  { id: 'residencia', text: 'Suba ao terraço da residência do senhor, de frente para o lago' },
  { id: 'templo', text: 'Suba a colina do templo budista, a leste' },
  { id: 'santuario', text: 'Chegue ao santuário Sengen, onde começa a trilha' },
  { id: 'cachoeira', text: 'Encontre a cachoeira do riacho, dentro da floresta' },
  { id: 'arvores', text: 'Suba até onde a floresta acaba e começa a pedra vulcânica' },
  { id: 'neve', text: 'Pise na neve do alto do Fuji' },
  { id: 'cume', text: 'Chegue à borda da cratera do Fuji' },
];
export const FINAL_REQ = 99;
const SAVE = 'cidades-historicas:japao:v1';

export class Quests {
  constructor(scene, city, glowTex, ui, audio) {
    this.ui = ui; this.audio = audio; this.city = city;
    this.done = new Set(); this.listeners = [];
    this.hints = {
      vila: [STREET.x, (STREET.z0 + STREET.z1) / 2], lago: [LAKE.x + LAKE.a * 0.7, LAKE.z + 40], nadar: [LAKE.x, LAKE.z], arrozal: [(FIELDS.x0 + FIELDS.x1) / 2, (FIELDS.z0 + FIELDS.z1) / 2],
      residencia: [RESIDENCE.x, RESIDENCE.z], templo: [TEMPLE.x, TEMPLE.z], santuario: [SHRINE.x, SHRINE.z], cachoeira: [368, 200], arvores: [60, 1540], neve: [60, 1930], cume: [FUJI.x, FUJI.z - FUJI.crater],
    };
    this.seenEvents = new Set();
    this.load();
  }
  isDone(id) { return !id || this.done.has(id); }
  count() { return this.done.size; }
  finalUnlocked() { return false; }
  hintFor(o) { return this.hints[o.id] || null; }
  complete(id) {
    if (this.done.has(id) || !OBJECTIVES.find((x) => x.id === id)) return false;
    this.done.add(id);
    const o = OBJECTIVES.find((x) => x.id === id);
    this.ui.toast(`Objetivo concluído: ${o.text}`, 'quest');
    this.audio.chime(); this.save(); this.ui.renderObjectives(this);
    this.listeners.forEach((f) => f(id));
    return true;
  }
  update(dt, t, player) {
    const p = player.pos, near = (x, z, r) => Math.hypot(p.x - x, p.z - z) < r;
    if (Math.abs(p.x - STREET.x) < STREET.hw + 4 && p.z > STREET.z0 + 40 && p.z < STREET.z1 - 40) this.complete('vila');
    if (inLake(p.x, p.z, 14) && !inLake(p.x, p.z, -4) && !player.swimming) this.complete('lago');
    if (player.swimming && waterAt(p.x, p.z) > -1) this.complete('nadar');
    if (p.x > FIELDS.x0 + 20 && p.x < FIELDS.x1 - 20 && p.z > FIELDS.z0 + 20 && p.z < FIELDS.z1 - 20) this.complete('arrozal');
    if (Math.abs(p.x - RESIDENCE.x) < RESIDENCE.w / 2 && Math.abs(p.z - RESIDENCE.z) < RESIDENCE.d / 2) this.complete('residencia');
    if (near(TEMPLE.x, TEMPLE.z, TEMPLE.r * 0.5)) this.complete('templo');
    if (Math.abs(p.x - SHRINE.x) < SHRINE.w / 2 && Math.abs(p.z - SHRINE.z) < SHRINE.d / 2) this.complete('santuario');
    if (near(368, 200, 22)) this.complete('cachoeira');
    if (fujiH(p.x, p.z) > 360) this.complete('arvores');
    if (p.y > SNOW_Y + 25) this.complete('neve');
    if (fujiR(p.x, p.z) < FUJI.crater + 12 && p.y > FUJI.H - 15) this.complete('cume');
  }
  save() { try { localStorage.setItem(SAVE, JSON.stringify({ done: [...this.done] })); } catch (e) { /* sem armazenamento */ } }
  load() { try { const d = JSON.parse(localStorage.getItem(SAVE) || 'null'); if (d) d.done.forEach((x) => this.done.add(x)); } catch (e) { /* */ } }
  reset() { try { localStorage.removeItem(SAVE); } catch (e) { /* */ } }
}
