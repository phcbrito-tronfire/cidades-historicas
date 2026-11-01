// Objetivos da jornada em Roma (primeira etapa: o Coliseu). Os personagens, os eventos da arena e o resto da
// cidade entram nas próximas etapas.
import { waterAt } from '../comum/collision.js';
import { COL, dOf } from './coliseu.js';

export const OBJECTIVES = [
  { id: 'coliseu', text: 'Entre no Coliseu por um dos 80 arcos' },
  { id: 'arena', text: 'Pise na areia da arena' },
  { id: 'hipogeu', text: 'Desça ao hipogeu, debaixo da arena' },
  { id: 'podio', text: 'Suba ao pódio, onde se sentavam os senadores' },
  { id: 'summa', text: 'Chegue à última fileira da arquibancada' },
  { id: 'tibre', text: 'Nade no rio Tibre' },
];
export const FINAL_REQ = 99;
const SAVE = 'cidades-historicas:roma:v1';

export class Quests {
  constructor(scene, city, glowTex, ui, audio) {
    this.ui = ui; this.audio = audio; this.city = city;
    this.done = new Set(); this.listeners = []; this.scarabsFound = new Set(); this.scarabs = [];
    const S = city.spots;
    this.hints = {};
    const H = (id, v) => { if (v) this.hints[id] = [v.x, v.z]; };
    H('coliseu', S.colGateW); H('arena', S.colArena); H('hipogeu', S.hypogeumStair); H('podio', S.podium); H('summa', S.topRow);
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
    const p = player.pos, d = dOf(p.x, p.z), Y = COL.y;
    if (d < COL.D + COL.amb && d > -0.5) this.complete('coliseu');
    if (d < -0.5 && p.y > Y - 0.6 && !player.swimming) this.complete('arena');
    if (d < -0.5 && p.y < Y - COL.hyp + 1) this.complete('hipogeu');
    if (d > 0 && d < COL.podium && p.y > Y + COL.podiumH - 0.3) this.complete('podio');
    if (d > COL.D - 2 && d < COL.D && p.y > Y + COL.podiumH + COL.rise * (COL.rows - 2)) this.complete('summa');
    if (player.swimming && waterAt(p.x, p.z) > -1) this.complete('tibre');
  }
  save() { try { localStorage.setItem(SAVE, JSON.stringify({ done: [...this.done] })); } catch (e) { /* sem armazenamento */ } }
  load() { try { const d = JSON.parse(localStorage.getItem(SAVE) || 'null'); if (d) d.done.forEach((x) => this.done.add(x)); } catch (e) { /* */ } }
  reset() { try { localStorage.removeItem(SAVE); localStorage.removeItem(SAVE + ':artefatos'); } catch (e) { /* */ } }
}
