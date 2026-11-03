// Objetivos da jornada em Roma: o Coliseu e os jogos, os personagens, e a cidade inteira — o Fórum e o Capitólio,
// o Circo, o mercado, os bairros, a domus, o porto de Trajano, o mar e o rio.
import { waterAt } from '../comum/collision.js';
import { COL, dOf } from './coliseu.js';
import { CAPITOL, DOMUS, ISOLA } from './terrain.js';
import { DISTRICTS } from './insulae.js';

export const OBJECTIVES = [
  { id: 'coliseu', text: 'Entre no Coliseu por um dos 80 arcos' },
  { id: 'arena', text: 'Pise na areia da arena' },
  { id: 'hipogeu', text: 'Desça ao hipogeu, debaixo da arena' },
  { id: 'podio', text: 'Suba ao pódio, onde se sentavam os senadores' },
  { id: 'summa', text: 'Chegue à última fileira da arquibancada' },
  { id: 'tibre', text: 'Nade no rio Tibre' },
  { id: 'apolodoro', text: 'Converse com Apolodoro de Damasco, o arquiteto de Trajano, no Fórum' },
  { id: 'tacito', text: 'Ouça o historiador Tácito junto à Cúria do Senado' },
  { id: 'cornelia', text: 'Conheça a vestal Cornélia no templo de Vesta' },
  { id: 'domicio', text: 'Fale com o lanista na entrada oeste do Coliseu' },
  { id: 'vero', text: 'Encontre o gladiador Vero esperando no hipogeu' },
  { id: 'lucio', text: 'Fale com o centurião na entrada leste do Coliseu' },
  { id: 'jogos', text: 'Assista a três programas diferentes dos jogos (aperte C para passar os dias)' },
  { id: 'rostra', text: 'Suba à Rostra, a tribuna dos oradores enfeitada com esporões de navios' },
  { id: 'capitolio', text: 'Suba o Clivo Capitolino até o Templo de Júpiter' },
  { id: 'trajano', text: 'Veja a Coluna de Trajano e os Mercados, no Fórum de Trajano' },
  { id: 'circo', text: 'Veja a chegada de uma corrida de bigas no Circo Máximo' },
  { id: 'mercado', text: 'Passeie pelo mercado do Fórum Boário' },
  { id: 'subura', text: 'Ande pelas ruas da Subura, o bairro mais populoso de Roma' },
  { id: 'domus', text: 'Entre na domus do Aventino, a casa de uma família rica' },
  { id: 'termas', text: 'Visite as Termas de Trajano' },
  { id: 'panteao', text: 'Veja o novo Panteão sendo construído no Campo de Marte' },
  { id: 'aqueduto', text: 'Chegue ao aqueduto que traz a água para a cidade' },
  { id: 'tiberina', text: 'Atravesse até a Ilha Tiberina, a ilha em forma de navio' },
  { id: 'farol', text: 'Suba por dentro do farol de Óstia até o mirante e veja o porto, o mar e Roma' },
  { id: 'portus', text: 'Conheça o Portus, o porto hexagonal de Trajano' },
  { id: 'quadrirreme', text: 'Comande a quadrirreme Concórdia (embarque no Portus e aperte as setas)' },
  { id: 'cavalo', text: 'Monte o cavalo da cavalaria (aperte H)' },
  { id: 'naufragio', text: 'Mergulhe até o navio romano afundado diante de Óstia' },
  { id: 'artefatos', text: 'Encontre os 23 artefatos da Roma Antiga', count: 23 },
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
    for (const id of ['apolodoro', 'tacito', 'cornelia', 'domicio', 'vero', 'lucio']) H(id, S['npc_' + id]);
    this.seenEvents = new Set();
    H('coliseu', S.colGateW); H('arena', S.colArena); H('hipogeu', S.hypogeumStair); H('podio', S.podium); H('summa', S.topRow);
    H('rostra', S.rostra); H('trajano', S.trajanColumn); H('capitolio', S.clivus); H('circo', S.circus); H('mercado', S.market); H('domus', S.domus); H('termas', S.thermae); H('panteao', S.pantheon);
    H('aqueduto', S.aqueduct); H('portus', S.portus); H('farol', S.lighthouse); H('quadrirreme', S.quadrireme); H('subura', { x: -50, z: -210 }); H('tiberina', { x: ISOLA.x, z: ISOLA.z });
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
    // a cidade
    const S = this.city.spots, Z = this.city.zones, inZ = (z) => z && p.x > z[0] && p.x < z[1] && p.z > z[2] && p.z < z[3], near = (v, r) => v && Math.hypot(p.x - v.x, p.z - v.z) < r;
    if (near(S.rostra, 6) && p.y > S.rostra.y - 0.3) this.complete('rostra');
    if (Math.hypot((p.x - CAPITOL.x) / CAPITOL.rx, (p.z - CAPITOL.z) / CAPITOL.rz) < 0.9 && p.y > CAPITOL.top - 1) this.complete('capitolio');
    if (inZ(Z.mercado)) this.complete('mercado');
    if (near(S.trajanColumn, 16)) this.complete('trajano');
    { const D = DISTRICTS[0]; if (p.x > D.x0 && p.x < D.x1 && p.z > D.z0 && p.z < D.z1) this.complete('subura'); }
    if (Math.abs(p.x - DOMUS.x) < DOMUS.hw - 4 && Math.abs(p.z - DOMUS.z) < DOMUS.hd - 4) this.complete('domus');
    if (inZ(Z.termas)) this.complete('termas');
    if (near(S.pantheon, 45)) this.complete('panteao');
    if (near(S.aqueduct, 40)) this.complete('aqueduto');
    if (Math.hypot(p.x - ISOLA.x, p.z - ISOLA.z) < 30 && !player.swimming) this.complete('tiberina');
    if (inZ(Z.portus)) this.complete('portus');
    if (near(S.lighthouseView, 5) && p.y > S.lighthouseView.y - 0.5) this.complete('farol');
    const R = this.refs || {};
    if (R.boats?.riding?.model === 'quadrirreme' && Math.abs(R.boats.riding.v) > 0.5) this.complete('quadrirreme');
    if (R.mount?.state === 'riding') this.complete('cavalo');
    if (R.sea?.site && player.diving && Math.hypot(p.x - R.sea.site.x, p.z - R.sea.site.z) < 16) this.complete('naufragio');
  }
  save() { try { localStorage.setItem(SAVE, JSON.stringify({ done: [...this.done] })); } catch (e) { /* sem armazenamento */ } }
  load() { try { const d = JSON.parse(localStorage.getItem(SAVE) || 'null'); if (d) d.done.forEach((x) => this.done.add(x)); } catch (e) { /* */ } }
  reset() { try { localStorage.removeItem(SAVE); localStorage.removeItem('cidades-historicas:roma:artefatos'); } catch (e) { /* */ } }
}
