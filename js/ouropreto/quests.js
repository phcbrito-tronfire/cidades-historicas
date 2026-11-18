// Objetivos da jornada em Vila Rica (Etapa 2: a paisagem — a praça, as ladeiras, as pontes, os córregos, os morros e
// o Itacolomi). Os personagens, as igrejas por dentro, os dias da Inconfidência e os artefatos entram nas próximas
// etapas, com os objetivos deles.
import { PLACES, STREETS, STREAMS, BRIDGES, inPlace, polyDist, streetAt, mineAt } from './terrain.js';

export const OBJECTIVES = [
  { id: 'praca', text: 'Chegue à praça do Palácio, no alto do morro entre os dois bairros' },
  { id: 'direita', text: 'Desça a Rua Direita até o Largo dos Contos' },
  { id: 'ponte_contos', text: 'Atravesse a ponte de pedra dos Contos' },
  { id: 'pilar', text: 'Chegue ao largo da matriz do Pilar, no fundo do vale a oeste' },
  { id: 'rosario', text: 'Suba ao largo da igreja do Rosário' },
  { id: 'carmo', text: 'Desça a ladeira até o adro do Carmo' },
  { id: 'coimbra', text: 'Desça a Rua do Ouvidor até o Largo de Coimbra' },
  { id: 'saofrancisco', text: 'Pise no adro de São Francisco de Assis' },
  { id: 'ponte_ad', text: 'Atravesse a ponte de Antônio Dias' },
  { id: 'antoniodias', text: 'Chegue à matriz de Antônio Dias, no vale a leste' },
  { id: 'efigenia', text: 'Suba a ladeira de Santa Efigênia até o Alto da Cruz' },
  { id: 'queimada', text: 'Suba ao Morro da Queimada, acima da vila' },
  { id: 'lavras', text: 'Ande pelas lavras, onde a água desmontou o morro atrás do ouro' },
  { id: 'ribeirao', text: 'Desça até a beira do ribeirão, no fundo do vale' },
  { id: 'itacolomi', text: 'Do alto, ache o pico do Itacolomi no horizonte, a sudoeste' },
  { id: 'estrada', text: 'Siga uma das estradas que saem da vila: a do Rio de Janeiro ou a de Mariana' },
  // (Etapa 6) as pessoas com conversa longa
  { id: 'c_aleijadinho', text: 'Converse com o mestre Antônio Francisco Lisboa, o Aleijadinho, no adro de São Francisco' },
  { id: 'c_tiradentes', text: 'Converse com o alferes Tiradentes na Rua Direita (até ele partir para o Rio)' },
  { id: 'c_gonzaga', text: 'Converse com Tomás Antônio Gonzaga, na Rua do Ouvidor' },
  { id: 'c_marilia', text: 'Visite Maria Doroteia, a Marília, perto da matriz de Antônio Dias' },
  { id: 'c_claudio', text: 'Converse com o poeta Cláudio Manuel da Costa, na Rua de São José' },
  { id: 'c_macedo', text: 'Converse com o contratador João Rodrigues de Macedo, na Casa dos Contos' },
  { id: 'c_juiz', text: 'Converse com o juiz da Irmandade do Rosário, na igreja em obra' },
  { id: 'c_faiscador', text: 'Converse com o faiscador forro na beira do ribeirão' },
  { id: 'c_quitandeira', text: 'Converse com Inácia, a quitandeira da praça' },
  { id: 'c_minerador', text: 'Converse com Gonçalo, minerador, nas lavras da Queimada' },
  { id: 'c_padre', text: 'Converse com o padre na porta da matriz do Pilar' },
  { id: 'c_dragao', text: 'Converse com o cabo dos dragões na guarda do Palácio' },
  { id: 'c_opera', text: 'Converse com o ensaiador na porta da Casa da Ópera' },
  { id: 'c_tropeiro', text: 'Converse com o tropeiro no Largo dos Contos' },
  // (Etapa 6) os acontecimentos dos dias (C passa o dia)
  { id: 'reuniao', text: 'Numa noite de março, ouça a conversa baixa à porta de uma casa da Rua de São José' },
  { id: 'teatro', text: 'Assista a uma noite de comédia na Casa da Ópera' },
  { id: 'bando', text: 'Ouça, na praça, o bando que suspende a derrama' },
  { id: 'procissao', text: 'Acompanhe uma procissão pelas ladeiras' },
  { id: 'prisao', text: 'Veja a prisão de Gonzaga, em 23 de maio' },
  { id: 'sinos', text: 'Em 4 de julho, vá à Casa dos Contos quando os sinos dobram' },
];
const SAVE = 'cidades-historicas:ouropreto:v1';

export class Quests {
  constructor(ui, audio) {
    this.ui = ui; this.audio = audio;
    this.done = new Set(); this.listeners = [];
    const P = PLACES, mid = (S) => S.pts[Math.floor(S.pts.length / 2)];
    const bc = BRIDGES.find((b) => b.stream === 'funil'), ba = BRIDGES.find((b) => b.stream === 'adias');
    this.hints = {
      praca: [P.praca.x, P.praca.z], direita: mid(STREETS.direita), ponte_contos: bc && [bc.x, bc.z], pilar: [P.pilar.x, P.pilar.z], rosario: [P.rosario.x, P.rosario.z],
      carmo: [P.carmo.x, P.carmo.z], coimbra: [P.coimbra.x, P.coimbra.z], saofrancisco: [P.saofrancisco.x, P.saofrancisco.z], ponte_ad: ba && [ba.x, ba.z], antoniodias: [P.antoniodias.x, P.antoniodias.z],
      efigenia: [P.efigenia.x, P.efigenia.z], queimada: [P.queimada.x, P.queimada.z], lavras: [170, -330], ribeirao: [0, 190], itacolomi: [P.queimada.x, P.queimada.z], estrada: STREETS.rio.pts[2],
    };
    this.load();
  }
  isDone(id) { return !id || this.done.has(id); }
  count() { return this.done.size; }
  hintFor(o) { const S = this.spots || {}; if (o.id.startsWith('c_')) { const id = { c_aleijadinho: 'aleijadinho', c_tiradentes: 'tiradentes', c_gonzaga: 'gonzaga', c_marilia: 'marilia', c_claudio: 'claudio', c_macedo: 'macedo', c_juiz: 'juiz', c_faiscador: 'faiscador_bento', c_quitandeira: 'quitandeira_inacia', c_minerador: 'minerador_goncalo', c_padre: 'vigario', c_dragao: 'cabo', c_opera: 'ensaiador', c_tropeiro: 'tropeiro_joaquim' }[o.id]; return S['npc_' + id] || null; }
    const E = { reuniao: S.npc_claudio, teatro: S.npc_ensaiador, bando: S.pelourinho, procissao: [-245, 26], prisao: S.npc_gonzaga, sinos: [-277, 14] }; return E[o.id] || this.hints[o.id] || null; }
  complete(id) {
    if (this.done.has(id) || !OBJECTIVES.find((x) => x.id === id)) return false;
    this.done.add(id);
    const o = OBJECTIVES.find((x) => x.id === id);
    this.ui.toast(`Objetivo concluído: ${o.text}`, 'quest');
    this.audio.chime(); this.save(); this.ui.renderObjectives(this);
    this.listeners.forEach((f) => f(id));
    return true;
  }
  update(dt, t, player, camera) {
    if ((this._t = (this._t || 0) + dt) < 0.25) return; this._t = 0;
    const p = player.pos, at = (id, m = 0) => inPlace(p.x, p.z, PLACES[id], m);
    for (const id of ['praca', 'pilar', 'rosario', 'carmo', 'coimbra', 'saofrancisco', 'antoniodias', 'efigenia', 'queimada']) if (at(id, -3)) this.complete(id);
    const st = streetAt(p.x, p.z);
    if (st?.S === STREETS.direita && st.s > STREETS.direita.len * 0.85) this.complete('direita');
    if (st && (st.S === STREETS.rio || st.S === STREETS.mariana) && st.s > 60 && st.s < st.S.len - 40) this.complete('estrada');
    for (const B of BRIDGES) if (Math.hypot(p.x - B.x, p.z - B.z) < 2.5) this.complete(B.stream === 'funil' ? 'ponte_contos' : 'ponte_ad');
    if (mineAt(p.x, p.z) > 0.6) this.complete('lavras');
    if (polyDist(STREAMS.ribeirao.pts, p.x, p.z).d < STREAMS.ribeirao.bank + 2) this.complete('ribeirao');
    // o Itacolomi: do alto (acima da praça), olhando para o sudoeste
    if (camera && p.y > PLACES.praca.y + 4) { const e = camera.matrixWorld.elements, fx = -e[8], fz = -e[10], a = Math.atan2(fx, -fz) * 180 / Math.PI; if (a < -130 || a > 176) this.complete('itacolomi'); }
  }
  save() { try { localStorage.setItem(SAVE, JSON.stringify({ done: [...this.done] })); } catch (e) { /* sem armazenamento */ } }
  load() { try { const d = JSON.parse(localStorage.getItem(SAVE) || 'null'); if (d) d.done.forEach((x) => this.done.add(x)); } catch (e) { /* */ } }
  reset() { try { localStorage.removeItem(SAVE); } catch (e) { /* */ } }
}
