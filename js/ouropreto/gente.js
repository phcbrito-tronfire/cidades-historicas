// A gente de Vila Rica, fevereiro de 1789 (Etapa 5): quem sobe e desce as ladeiras (carregadores, moradores,
// senhoras de mantilha, padres, crianças, quitandeiras de tabuleiro na cabeça, dragões de patrulha); as escravizadas
// na fila dos chafarizes com o pote; as quitandeiras da praça e dos largos; a guarda do Palácio; os fiéis rezando
// ajoelhados nas igrejas; os canteiros no adro de São Francisco; os pedreiros da Câmara em obra; os mineradores nas
// lavras do Morro da Queimada, com o feitor; os faiscadores de bateia na beira do ribeirão e do Funil; a tropa de
// mulas que chega pelo Caminho do Rio até o Largo dos Contos; os cães e os gatos das ruas.
// De noite a vila esvazia: ficam os dragões.
import * as THREE from 'three';
import { makeHumanoid, animateHumanoid, rigDetail } from '../comum/mixamo.js';
import { makeAnimal, animateAnimal } from '../comum/animals.js';
import { creature } from '../comum/fauna.js';
import { groundAt, moveWithCollision, terrainAt, waterAt, blocked } from '../comum/collision.js';
import { STREETS, STREAMS, PLACES, terrainHeight, pointAt, streetAt } from './terrain.js';
import { rr, rand, pick, angleLerp } from '../comum/util.js';
import { FALAS, TITULOS, NOMES_H, NOMES_M, NACOES, nacao } from './falas.js';

const V3 = THREE.Vector3;
// a cor da gente de Vila Rica: portugueses do reino e da terra, pardos, africanos de muitas nações e crioulos
const CLARA = [0xe0bfa4, 0xd8b496, 0xcfa888, 0xd2aa86], PARDA = [0xb48662, 0xa87652, 0x9a6a48, 0xae7c58], ESCURA = [0x6e4630, 0x5e3a26, 0x4e301e, 0x7a5038, 0x664028];
const CRU = [0xd8ccb0, 0xcfc2a2, 0xe0d6bc], TERRA = [0x5a4a3a, 0x4a3e30, 0x6a5440, 0x3a3428, 0x5a5040], CHITA = [0x7a3a2a, 0x2a3a5a, 0x5a4a6a, 0x8a6a3a, 0x3a5a4a, 0x9a4a3a, 0x4a3a2a];
const SEDA = [0x2a2a3a, 0x3a1a2a, 0x1e2a3a, 0x4a2a3a, 0x2a3a2e], CASACA = [0x2a2a3a, 0x3a2a22, 0x2a3a2a, 0x5a2a24, 0x2e2a40, 0x4a3a2a];

function castsShadow(root, on) { if (root.userData.sh === on) return; root.userData.sh = on; root.traverse((o) => { if (o.isMesh) o.castShadow = on; }); }

// as roupas de cada um (ver mixamo.js, o conjunto de Minas)
export function look(kind) {
  const P = rand();
  switch (kind) {
    case 'senhor': return { outfit: 'casaca', coat: pick(CASACA), vest: pick([0xc8b890, 0xd8c8a0, 0x8a2a2a, 0x2a3a5a, 0xe8dcc0]), vestPattern: rand() < 0.3 ? 'kasuri' : 'plain', legs: pick([0x2a2a3a, 0x3a3428, 0xc8b890]), stockings: pick([0xf0ece2, 0xe2dccc]), hair: rand() < 0.75 ? 'tricorne' : 'rabicho', skin: pick(CLARA), extras: rand() < 0.4 ? ['bengala'] : [] };
    case 'senhora': return { outfit: 'saia', skirt: pick(SEDA), top: pick([0x2a2228, 0x3a2a30, 0x2a2a34, 0xe8e0d0]), xale: pick([0x1a1416, 0x2a2228, 0x3a2a2e]), hair: 'mantilha', skin: pick(CLARA), collar: null };
    case 'mulher': return { outfit: 'saia', skirt: pick(CHITA), pattern: rand() < 0.4 ? 'shima' : 'plain', accent: pick(['#e8e0cc', '#2a2a3a']), top: pick(CRU), xale: rand() < 0.4 ? pick(CHITA) : null, apron: rand() < 0.4 ? 0xece4d4 : null, hair: P < 0.5 ? 'torco' : 'natural', headColor: pick([0xf2ece0, 0xc8402a, 0x2a4a8a, 0xe0c060]), skin: pick(rand() < 0.6 ? PARDA : ESCURA), barefoot: rand() < 0.35, collar: null };
    case 'escrava': return { outfit: 'saia', skirt: pick([...CRU, 0x5a6a8a, 0x6a5a4a]), top: pick(CRU), pano: rand() < 0.45 ? pick([0x2a3a6a, 0xa8402a, 0xe8dcc0]) : null, panoAccent: pick(['#e8dcc0', '#1a1a2a', '#c8a040']), apron: rand() < 0.3 ? 0xe8e0d0 : null, hair: 'torco', headColor: pick([0xf2ece0, 0xe8dcc0, 0xa8402a, 0x2a4a8a]), headPattern: rand() < 0.3 ? 'shima' : 'plain', skin: pick(ESCURA), barefoot: true, collar: null };
    case 'escravo': return { outfit: 'escravo', top: pick(CRU), bare: rand() < 0.15, legs: pick([...CRU, 0x8a7a60]), shorts: rand() < 0.5, barefoot: true, hair: pick(['natural', 'natural', 'barrete', 'palha', 'lenco']), hatColor: pick([0x8a2a20, 0x2a3a5a, 0xd8ccb0]), skin: pick(ESCURA) };
    case 'minerador': return { outfit: 'escravo', top: pick(CRU), bare: rand() < 0.5, legs: pick([0xb8ac90, 0x8a7a60, 0x7a6a50]), shorts: rand() < 0.6, barefoot: true, hair: pick(['natural', 'barrete', 'lenco']), hatColor: pick([0x8a2a20, 0x2a3a5a, 0x5a4a3a]), skin: pick(ESCURA) };
    case 'homem': return { outfit: 'colono', top: pick(CRU), legs: pick(TERRA), vest: rand() < 0.5 ? pick([0x5a3a22, 0x3a3428, 0x6a2a22, 0x2a3a4a]) : null, hair: pick(['chapeu', 'chapeu', 'tricorne', 'barrete', 'natural']), hatColor: pick([0x3a2a1e, 0x2a2420, 0x5a4a3a]), skin: pick(rand() < 0.5 ? CLARA : PARDA), barefoot: false };
    case 'faiscador': return { outfit: 'colono', top: pick(CRU), legs: pick([0x8a7a60, 0x6a5a48]), hair: pick(['palha', 'chapeu']), hatColor: 0x4a3a2a, skin: pick(rand() < 0.7 ? ESCURA : PARDA), barefoot: true, extras: ['bateia'] };
    case 'feitor': return { outfit: 'colono', top: pick(CRU), vest: 0x5a3a22, legs: 0x3a3428, boots: 0x2a1a10, hair: 'chapeu', hatColor: 0x2a2018, skin: pick(PARDA.concat(CLARA)), extras: ['chicote'] };
    case 'padre': return { outfit: 'padre', top: 0x161416, legs: 0x161416, hair: 'chapeu', hatColor: 0x0e0c0a, skin: pick(CLARA.concat(PARDA.slice(0, 2))), extras: ['livro'] };
    case 'dragao': return { outfit: 'dragao', coat: 0x1f2b52, vest: 0xc9a23a, facing: 0xc9a23a, legs: 0xd8c89a, boots: 0x16100c, hair: 'tricorne', trim: 0xd8b04a, skin: pick(CLARA.concat(PARDA)), extras: ['espingarda'] };
    case 'tropeiro': return { outfit: 'tropeiro', top: pick(CRU), vest: 0x5a3a22, legs: pick([0x4a3e30, 0x5a4a3a]), boots: 0x3a2414, hair: 'chapeu', hatColor: pick([0x5a4a3a, 0x4a3a2a]), skin: pick(PARDA.concat(CLARA)), extras: ['chicote'] };
    case 'canteiro': return rand() < 0.5 ? { ...look('escravo'), bare: false } : { outfit: 'colono', top: pick(CRU), legs: pick(TERRA), vest: 0x5a3a22, hair: pick(['barrete', 'lenco', 'natural']), hatColor: pick([0x8a2a20, 0xd8ccb0]), skin: pick(PARDA), barefoot: false };
    case 'crianca': return rand() < 0.5 ? { outfit: 'colono', top: pick(CRU), legs: pick(TERRA), hair: 'natural', skin: pick(rand() < 0.6 ? PARDA : ESCURA.concat(CLARA)), barefoot: true, height: rr(1.05, 1.3) } : { outfit: 'saia', skirt: pick(CHITA), top: pick(CRU), hair: 'natural', skin: pick(rand() < 0.6 ? PARDA : ESCURA.concat(CLARA)), barefoot: true, height: rr(1.05, 1.3), collar: null };
    default: return look('homem');
  }
}

export class Gente {
  constructor(scene, city) {
    this.scene = scene; this.city = city; this.viewR = 50; this.agents = []; this.animals = []; this.props = new THREE.Group(); scene.add(this.props);
    this.day = 1; this.key = []; this.boato = null; this.camera = null; this._fr = new THREE.Frustum(); this._pv = new THREE.Matrix4(); this._s = new THREE.Sphere(); this.pp = new V3(); this.t = 0; this.night = 0;
  }
  addHuman(lk, x, z, ry = 0, y) {
    const rig = makeHumanoid(lk);
    const pos = new V3(x, y ?? groundAt(x, z, Math.max(terrainAt(x, z), waterAt(x, z)) + 1.6), z);
    rig.root.position.copy(pos); rig.root.rotation.y = ry; this.scene.add(rig.root);
    return { rig, pos };
  }
  // fala: as linhas de cada tipo, com o nome e a nação de quem é escravizado
  falas(kind, female) {
    const nome = pick(female ? NOMES_M : NOMES_H), nac = pick(NACOES);
    return (FALAS[kind] || FALAS.homem).map((s) => s.replace('{n}', nome).replace('{nac}', nacao(nac, female)));
  }
  add(as, lk, x, z, ry, o = {}) {
    const st = o.extra && o.extra.route ? streetAt(x, z) : null; // (quem anda pela rua nasce em cima dela: na ponte, no tabuleiro, não no leito do córrego)
    const h = this.addHuman(lk, x, z, ry, o.y ?? (st ? groundAt(x, z, st.y + 0.45) : undefined));
    const a = { ...h, kind: as, ry, mode: o.mode || 'idle', lines: o.lines || this.falas(as, lk.outfit === 'saia'), night: !!o.night, ...o.extra };
    if (a.mode === 'sit' && h.rig.skirt) h.rig.skirt.visible = false;
    this.agents.push(a); return a;
  }
  // uma rua como caminho: pontos a cada 5 m, deslocados para um lado da calçada (off)
  route(id, off) { const S = STREETS[id], pts = []; for (let s = 1; s < S.len - 1; s += 5) { const p = pointAt(S.pts, s), l = Math.hypot(p.dx, p.dz) || 1; // (ponto encostado numa casa ou escada: vem para o meio da rua; se nem ali dá, fica de fora)
    for (const k of [1, 0.4, 0]) { const x = p.x - (p.dz / l) * off * k, z = p.z + (p.dx / l) * off * k; if (!blocked(x, z, groundAt(x, z, terrainAt(x, z) + 1.6), 0.4, 1.7)) { pts.push(new V3(x, 0, z)); break; } } } return pts; }

  spawn() {
    const C = this.city, S = C.spots || {};
    // ---- quem anda pelas ruas, indo e voltando pela ladeira
    const QUEM = [['homem', 5], ['escravo', 5], ['mulher', 3], ['escrava', 3], ['senhor', 1], ['senhora', 1], ['crianca', 2], ['quitandeira', 1], ['padre', 0.4]];
    const tot = QUEM.reduce((s, q) => s + q[1], 0), sorteia = () => { let r = rand() * tot; for (const [k, w] of QUEM) { r -= w; if (r <= 0) return k; } return 'homem'; };
    const RUAS = { direita: 6, saojose: 4, rosario: 2, opera: 4, carmo: 2, claudio: 3, antoniodias: 5, efigenia: 3, rio: 1, mariana: 1 };
    for (const [id, n] of Object.entries(RUAS)) for (let i = 0; i < n; i++) {
      const k = sorteia(), off = rr(-(STREETS[id].hw - 0.9), STREETS[id].hw - 0.9), rt = this.route(id, off), ri = Math.floor(rand() * rt.length), p = rt[ri];
      let lk = look(k === 'quitandeira' ? 'escrava' : k), as = k;
      if (k === 'escravo') lk.extras = [pick(['saco_costas', 'feixe', 'saco_costas', 'pote'])];
      if (k === 'escrava') { lk.extras = [pick(['pote', 'trouxa', 'pote'])]; as = lk.extras[0] === 'pote' ? 'aguadeira' : 'escravo'; }
      if (k === 'quitandeira') { lk.extras = ['tabuleiro']; lk.apron = 0xece4d4; }
      this.add(as, lk, p.x, p.z, 0, { extra: { route: rt, ri, dir: rand() < 0.5 ? 1 : -1, speed: k === 'crianca' ? rr(2.2, 2.8) : rr(0.85, 1.25), run: k === 'crianca', wait: rr(0, 3) } });
    }
    // os mineradores descendo e subindo o caminho da Queimada, de almocafre na mão
    for (let i = 0; i < 3; i++) { const rt = this.route('queimada', rr(-1.2, 1.2)), ri = Math.floor(rand() * rt.length), lk = look('minerador'); lk.extras = ['almocafre']; this.add('minerador', lk, rt[ri].x, rt[ri].z, 0, { extra: { route: rt, ri, dir: 1, speed: rr(0.85, 1.05), wait: rr(0, 4) } }); }
    // a guarda dobrada depois dos boatos de denúncia (do dia 7 em diante): mais dragões de patrulha nas ruas
    for (const [id, n] of [['direita', 2], ['saojose', 1], ['claudio', 1], ['antoniodias', 1], ['opera', 1]]) for (let i = 0; i < n; i++) { const rt = this.route(id, i ? -0.8 : 0.8), ri = Math.floor(rand() * rt.length); this.add('dragao', look('dragao'), rt[ri].x, rt[ri].z, 0, { night: true, extra: { route: rt, ri, dir: 1, speed: 1.0, wait: 0, when: (d) => d >= 7 } }); }
    // os dragões de patrulha (também de noite)
    for (const [id, n] of [['direita', 2], ['claudio', 1]]) for (let i = 0; i < n; i++) { const rt = this.route(id, i ? 0.8 : -0.8), ri = Math.floor(rand() * rt.length); this.add('dragao', look('dragao'), rt[ri].x, rt[ri].z, 0, { night: true, extra: { route: rt, ri, dir: 1, speed: 1.0, wait: 0 } }); }

    // ---- a fila dos chafarizes: as escravizadas com o pote, a primeira enchendo
    for (const F of C.fountains || []) { const c = Math.cos(F.ry), s = Math.sin(F.ry), W = (lx, lz) => [F.x + lx * c + lz * s, F.z - lx * s + lz * c];
      [[0, 2.25], [-1.3, 3.3], [1.1, 3.7], [-0.3, 4.9]].forEach(([lx, lz], i) => { const lk = look(i === 3 && rand() < 0.5 ? 'escravo' : 'escrava'); if (i > 0) lk.extras = ['pote']; const [x, z] = W(lx, lz); this.add(lk.outfit === 'saia' ? 'aguadeira' : 'escravo', lk, x, z, F.ry + Math.PI + rr(-0.3, 0.3), { mode: i === 1 ? 'talk' : 'idle', extra: { static: true } }); }); }

    // ---- a praça: as quitandeiras perto do pelourinho, as rodas de conversa, a guarda no portão do Palácio
    const praca = PLACES.praca;
    for (const [x, z] of [[-15, 30], [-3, 24], [7, 33]]) { const lk = look(rand() < 0.6 ? 'escrava' : 'mulher'); lk.extras = ['tabuleiro']; lk.apron = 0xece4d4; this.add('quitandeira', lk, praca.x + x, praca.z + z, rand() * 6, { mode: rand() < 0.5 ? 'talk' : 'idle', extra: { static: true } }); }
    const roda = (cx, cz, kinds) => kinds.forEach((k, i) => { const a = (i / kinds.length) * Math.PI * 2 + rand(), x = cx + Math.sin(a) * 0.9, z = cz + Math.cos(a) * 0.9; this.add(k, look(k), x, z, a + Math.PI, { mode: i % 2 ? 'talk' : 'idle', extra: { static: true } }); });
    roda(praca.x + 12, praca.z + 8, ['senhor', 'senhor', 'homem']); roda(praca.x - 12, praca.z - 14, ['homem', 'mulher']); roda(praca.x + 6, praca.z - 32, ['padre', 'senhora', 'senhora']);
    if (S.palacio) for (const sd of [-1, 1]) this.add('dragao', look('dragao'), S.palacio[0] + sd * 2.6, S.palacio[1] - 1.2, 0, { mode: 'guard', night: true, extra: { static: true } });
    if (S.palacioGuarda) for (const sd of [-1, 1]) this.add('dragao', look('dragao'), S.palacioGuarda[0] + sd * 1.4, S.palacioGuarda[1] + 1.5, sd * 1.2, { mode: sd > 0 ? 'talk' : 'idle', night: true, extra: { static: true } });

    // ---- as igrejas: os fiéis ajoelhados na nave; o padre e as senhoras na porta das matrizes
    for (const ch of C.churches || []) { if (ch.obra || !ch.door) continue; const ix = -Math.sin(ch.ry), iz = -Math.cos(ch.ry), lx = -iz, lz = ix;
      for (let i = 0; i < 3; i++) { const d = rr(7, 13), l = (i % 2 ? 1 : -1) * rr(1.2, 3.0), x = ch.door[0] + ix * d + lx * l, z = ch.door[1] + iz * d + lz * l, lk = look(pick(['senhora', 'mulher', 'escrava', 'homem'])); this.add('fiel', lk, x, z, Math.atan2(ix, iz), { mode: 'idle', y: ch.y, extra: { static: true } }); }
      for (let i = 0; i < 6; i++) { const d = rr(6, 14), l = (i % 2 ? 1 : -1) * rr(0.6, 3.2), x = ch.door[0] + ix * d + lx * l, z = ch.door[1] + iz * d + lz * l; this.add('fiel', look(pick(['senhora', 'mulher', 'escrava', 'homem', 'senhora'])), x, z, Math.atan2(ix, iz), { mode: 'idle', y: ch.y, extra: { static: true, when: (dd) => dd === 2 || dd === 8 } }); } // (Quarta-feira de Cinzas e Semana Santa: a igreja cheia)
      if (ch.id === 'pilar' || ch.id === 'antoniodias') { const x = ch.door[0] - ix * 1.5, z = ch.door[1] - iz * 1.5; this.add('padre', look('padre'), x, z, Math.atan2(-ix, -iz), { mode: 'talk', extra: { static: true } }); for (const sd of [-1, 1]) this.add('senhora', look('senhora'), x - ix * 1.4 + lx * sd * 0.8, z - iz * 1.4 + lz * sd * 0.8, Math.atan2(ix, iz), { extra: { static: true } }); }
    }

    // ---- o canteiro de São Francisco: os blocos de pedra-sabão sendo lavrados no adro, diante da fachada em obra
    { const ch = (C.churches || []).find((q) => q.id === 'saofrancisco');
      if (ch && ch.door) { let ox = ch.door[0] - ch.x, oz = ch.door[1] - ch.z; const l = Math.hypot(ox, oz) || 1; ox /= l; oz /= l; const lx = -oz, lz = ox;
        const at = (d, s) => [ch.door[0] + ox * d + lx * s, ch.door[1] + oz * d + lz * s];
        for (const [d, s] of [[5, -6], [6.5, -3.5], [5.5, 4], [7, 7]]) { const [x, z] = at(d, s); this.block(x, z, Math.atan2(ox, oz), 0.7, 0.55, 0.5); const [wx, wz] = at(d + 0.75, s); this.add('canteiro', look('canteiro'), wx, wz, Math.atan2(-ox, -oz), { mode: '@pegar', extra: { static: true } }); }
        for (const [d, s] of [[9, -1], [8.5, 2]]) { const [x, z] = at(d, s); this.add('canteiro', look('canteiro'), x, z, rand() * 6, { mode: 'talk', extra: { static: true } }); }
        for (const [d, s] of [[10.5, -7], [11, -5.8], [10.6, -6.4]]) { const [x, z] = at(d, s); this.block(x, z, rand(), 0.9, 0.45, 0.6); } } } // (a pilha de blocos esperando)

    // ---- a Câmara em obra: os pedreiros aparelhando pedra junto da pilha e os que levam pedra até o andaime
    { const P = PLACES.camara, W = (lx, lz) => [P.x - lx, P.z - lz]; // (o quadro da obra é girado de π)
      for (const [lx, lz] of [[-7.5, 3.2], [-10, 3.1], [-12.5, 3.2]]) { const [x, z] = W(lx, lz); this.add('pedreiro', look(rand() < 0.6 ? 'escravo' : 'canteiro'), x, z, Math.PI, { mode: '@pegar', extra: { static: true } }); }
      for (let i = 0; i < 2; i++) { const a = W(-9 + i * 2, 3.0), b = W(-4 + i * 6, 0.7), lk = look('escravo'); lk.extras = ['pedra']; this.add('pedreiro', lk, a[0], a[1], 0, { extra: { route: [new V3(a[0], 0, a[1]), new V3(b[0], 0, b[1])], ri: i, dir: 1, speed: 0.75, wait: rr(1, 5), pause: 3 } }); } }

    // ---- as lavras do Morro da Queimada: o trabalho de lavar o cascalho, o feitor olhando
    { const Q = PLACES.queimada;
      for (let i = 0; i < 9; i++) { const x = Q.x + rr(-24, 24), z = Q.z + rr(-20, 20), lk = look('minerador'); if (i % 3 === 0) lk.extras = ['bateia']; this.add('minerador', lk, x, z, rand() * 6, { mode: i % 3 === 2 ? 'idle' : '@pegar', extra: { static: true } }); }
      for (let i = 0; i < 3; i++) { const x0 = Q.x + rr(-20, 20), z0 = Q.z + rr(-16, 16), lk = look('minerador'); lk.extras = [i ? 'saco_costas' : 'almocafre']; this.add('minerador', lk, x0, z0, 0, { extra: { route: [new V3(x0, 0, z0), new V3(x0 + rr(-12, 12), 0, z0 + rr(-10, 10))], ri: 0, dir: 1, speed: 0.8, wait: rr(0, 4), pause: 4 } }); }
      this.add('feitor', look('feitor'), Q.x + 2, Q.z + 4, Math.PI, { mode: 'guard', extra: { static: true } }); }

    // ---- os faiscadores: de bateia, ajoelhados na beira do ribeirão e do Funil
    for (const [id, a, b, n] of [['ribeirao', -260, 320, 6], ['funil', -60, 130, 2]]) { const C2 = STREAMS[id], L = C2.pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - C2.pts[i - 1][0], p[1] - C2.pts[i - 1][1]) : 0), 0);
      let made = 0; for (let k = 0; k < 400 && made < n; k++) { const p = pointAt(C2.pts, rand() * L); if ((id === 'ribeirao' ? p.x : p.z) < a || (id === 'ribeirao' ? p.x : p.z) > b) continue; const l = Math.hypot(p.dx, p.dz) || 1, nx = -p.dz / l, nz = p.dx / l, sd = rand() < 0.5 ? 1 : -1; let x = 0, z = 0, ok = false; for (let o = C2.hw + 0.35; o < C2.hw + 6 && !ok; o += 0.3) { x = p.x + nx * sd * o; z = p.z + nz * sd * o; const g = groundAt(x, z, terrainAt(x, z) + 0.5); ok = waterAt(x, z) < g + 0.22; } if (!ok) continue; // (na beira, com a água no máximo pela canela)
        if (streetAt(x, z)) continue; this.add('faiscador', look('faiscador'), x, z, Math.atan2(-nx * sd, -nz * sd), { mode: '@pegar', extra: { static: true } }); made++; } }

    // ---- as quitandeiras dos largos e os moradores na porta de casa
    for (const [pid, n] of [['contos', 2], ['coimbra', 1], ['antoniodias', 1]]) { const P = PLACES[pid]; for (let i = 0; i < n; i++) { const lk = look(rand() < 0.6 ? 'escrava' : 'mulher'); lk.extras = ['tabuleiro']; lk.apron = 0xece4d4; this.add('quitandeira', lk, P.x + rr(-P.w * 0.3, P.w * 0.3), P.z + rr(-P.d * 0.3, P.d * 0.3), rand() * 6, { mode: rand() < 0.5 ? 'talk' : 'idle', extra: { static: true } }); } }
    { const H = (C.houses || []).filter((h) => h.open && h.kind !== 'casebre'); for (let i = 0; i < 9 && H.length; i++) { const h = H[Math.floor((i + 0.5) / 9 * H.length)], k = pick(['homem', 'mulher', 'senhora', 'homem', 'mulher']); this.add(k, look(k), h.door[0], h.door[1], h.ry, { mode: rand() < 0.5 ? 'talk' : 'idle', extra: { static: true } }); } }

    // ---- os bichos da rua
    const bicho = (kind, x, z, o = {}) => { const a = makeAnimal(kind); const y = groundAt(x, z, terrainAt(x, z) + 1.6); a.g.position.set(x, y, z); a.g.rotation.y = rand() * 6; if (o.scale) a.g.scale.setScalar(o.scale); a.seed = rand() * 10; this.scene.add(a.g); this.animals.push({ a, pos: a.g.position, home: new V3(x, y, z), radius: o.radius ?? 8, speed: a.speed * (o.speedMul || 1), wait: rr(0, 5) }); };
    for (let i = 0; i < 6; i++) { const id = pick(Object.keys(RUAS)), rt = this.route(id, rr(-1.5, 1.5)), p = rt[Math.floor(rand() * rt.length)]; bicho('dog', p.x, p.z, { radius: 10, scale: 0.8 }); }
    for (let i = 0; i < 4; i++) { const id = pick(['direita', 'saojose', 'antoniodias', 'opera']), rt = this.route(id, rr(-2, 2)), p = rt[Math.floor(rand() * rt.length)]; bicho('cat', p.x, p.z, { radius: 5 }); }
  }
  // um bloco de pedra no chão (do canteiro e da obra), assentado no terreno
  block(x, z, ry, w, h, d) {
    const M = this.city.M, y = terrainHeight(x, z), m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.sabao || M.cantaria);
    m.position.set(x, y + h / 2 - 0.04, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; this.props.add(m);
  }

  // ---- a tropa: a madrinha com o cincerro na frente e as mulas cargueiras em fila, pelo Caminho do Rio até o Largo dos
  // Contos; descarrega, descansa e volta. Cada mula leva a cangalha com as duas bruacas de couro e a carga por cima.
  async spawnTropa() {
    const P = [...STREETS.rio.pts.slice().reverse(), ...STREETS.rosario.pts.slice().reverse(), ...STREETS.saojose.pts.slice().reverse(), [PLACES.contos.x - 6, PLACES.contos.z]];
    const pts = P.map(([x, z]) => new V3(x, 0, z)), cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const T = (this.tropa = { pts, cum, L: cum[cum.length - 1], s: 30, dir: 1, wait: 0, mules: [], men: [] });
    const leather = new THREE.MeshStandardMaterial({ color: 0x4a2e1a, roughness: 0.75 }), wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 0.9 }), sack = new THREE.MeshStandardMaterial({ color: 0xc8b890, roughness: 1 }), bell = new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.8, roughness: 0.35 });
    for (let k = 0; k < 7; k++) {
      const c = await creature('jumento', 2.05, { still: true, tint: k === 0 ? [1.25, 1.0, 0.8] : pick([[1.15, 0.88, 0.68], [0.9, 0.75, 0.62], [1.2, 1.0, 0.85]]) }); if (!c) return;
      const clip = c.clips.find((q) => /walk/i.test(q.name)) || c.clips[0], idle = c.clips.find((q) => /idle|stand/i.test(q.name));
      const aw = c.mixer.clipAction(clip); aw.play(); const ai = idle ? c.mixer.clipAction(idle) : null; if (ai) { ai.play(); ai.setEffectiveWeight(0); }
      c.holder.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      // a cangalha (o arção de madeira sobre a manta), as bruacas dos lados e a carga amarrada por cima
      const g = new THREE.Group(), by = 1.02, mk = (geo, mat, p, r) => { const me = new THREE.Mesh(geo, mat); me.position.set(...p); if (r) me.rotation.set(...r); return me; };
      g.add(mk(new THREE.BoxGeometry(0.5, 0.05, 0.62), new THREE.MeshStandardMaterial({ color: pick([0x3a5a7a, 0x7a2a22, 0x5a4a2a]), roughness: 1 }), [0, by, 0]));
      for (const sz of [-1, 1]) g.add(mk(new THREE.TorusGeometry(0.2, 0.035, 5, 10, Math.PI), wood, [0, by + 0.02, sz * 0.22]));
      if (k > 0) { for (const sx of [-1, 1]) g.add(mk(new THREE.BoxGeometry(0.2, 0.42, 0.55), leather, [sx * 0.33, by - 0.22, 0])); g.add(mk(new THREE.CylinderGeometry(0.17, 0.17, 0.62, 10), sack, [0, by + 0.2, 0], [Math.PI / 2, 0, 0])); }
      else { g.add(mk(new THREE.ConeGeometry(0.06, 0.12, 10, 1, true), bell, [0, by - 0.35, 0.72])); for (let i = 0; i < 5; i++) g.add(mk(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshStandardMaterial({ color: [0xc8402a, 0xe0c060, 0x2a4a8a][i % 3] }), [-0.08 + i * 0.04, by + 0.33, 0.62])); } // (a madrinha: o cincerro no pescoço e o penacho de lã colorida na testa)
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); c.holder.add(g);
      this.scene.add(c.holder); T.mules.push({ c, aw, ai, pos: new V3(), h: 0 });
    }
    for (const k of [0, 1]) { const h = this.add('tropeiro', look('tropeiro'), pts[0].x, pts[0].z, 0, { extra: { static: true, tropa: true } }); T.men.push(h); }
  }
  tropaAt(s) { const T = this.tropa, L = T.L; s = Math.max(0, Math.min(L, s)); let i = 1; while (i < T.cum.length - 1 && T.cum[i] < s) i++; const a = T.pts[i - 1], b = T.pts[i], t = (s - T.cum[i - 1]) / (T.cum[i] - T.cum[i - 1] || 1); return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, h: Math.atan2(b.x - a.x, b.z - a.z) }; }
  updateTropa(dt, pp) {
    const T = this.tropa; if (!T || !T.mules.length) return;
    const far = Math.hypot(pp.x - this.tropaAt(T.s).x, pp.z - this.tropaAt(T.s).z) > 140, off = this.night > 0.55;
    let moving = !off && T.wait <= 0;
    if (off || T.wait > 0) T.wait -= dt;
    if (moving) { T.s += T.dir * 1.15 * dt; if (T.s >= T.L - 1 || T.s <= 1) { T.s = Math.max(1, Math.min(T.L - 1, T.s)); T.dir = -T.dir; T.wait = 55; moving = false; } }
    const place = (o, s, hFix) => { const p = this.tropaAt(s), st = streetAt(p.x, p.z), y = st ? st.y : terrainHeight(p.x, p.z); o.pos.set(p.x, y, p.z); o.h = angleLerp(o.h, T.dir > 0 ? p.h : p.h + Math.PI, Math.min(1, dt * 3)); return hFix; };
    T.mules.forEach((m, k) => { place(m, T.s - T.dir * (k * 3.0 + 1.5)); m.c.holder.visible = !off && !far; if (!m.c.holder.visible) return; m.c.holder.position.copy(m.pos); m.c.holder.rotation.y = m.h;
      m.aw.setEffectiveWeight(moving ? 1 : 0); if (m.ai) m.ai.setEffectiveWeight(moving ? 0 : 1); m.aw.timeScale = 0.75; m.c.mixer.update(dt); });
    T.men.forEach((a, k) => { const s = k === 0 ? T.s + T.dir * 2.6 : T.s - T.dir * (T.mules.length * 3.0 + 1.8), p = this.tropaAt(s), st = streetAt(p.x + 0.9, p.z), y = st ? st.y : terrainHeight(p.x, p.z);
      a.pos.set(p.x + Math.cos(p.h) * 0.9, y, p.z - Math.sin(p.h) * 0.9); a.rig.root.position.copy(a.pos); a.rig.root.rotation.y = T.dir > 0 ? p.h : p.h + Math.PI; a.tropaMoving = moving; a.hidden = off; });
  }

  nearestInteractable(p, max = 2.8) {
    let best = null, bd = max * max;
    for (const k of this.key) { if (!k.rig.root.visible) continue; const d = (k.pos.x - p.x) ** 2 + (k.pos.z - p.z) ** 2; if (d < bd && Math.abs(k.pos.y - p.y) < 2) { bd = d; best = { type: 'npc', o: k }; } }
    for (const a of this.agents) { if (!a.rig.root.visible) continue; const d = (a.pos.x - p.x) ** 2 + (a.pos.z - p.z) ** 2; if (d < bd && Math.abs(a.pos.y - p.y) < 2) { bd = d; best = { type: a.kind, o: a }; } }
    return best;
  }
  titulo(o) { return o.def ? o.def.name : TITULOS[o.kind] || 'Morador'; }
  anim(rig, dt, speed, mode, t) {
    rig._acc = (rig._acc || 0) + dt;
    const p = rig.root.position, d2 = (p.x - this.pp.x) ** 2 + (p.z - this.pp.z) ** 2;
    castsShadow(rig.root, d2 < (this.shadowR ?? 22) ** 2); rigDetail(rig, d2);
    let every = 0;
    if (this.camera) { this._s.center.set(p.x, p.y + 0.95, p.z); this._s.radius = 1.6; const seen = this._fr.intersectsSphere(this._s); every = !seen ? 1 / 8 : d2 < 25 * 25 ? 0 : d2 < 45 * 45 ? 1 / 30 : 1 / 15; }
    if (rig._acc < every) return;
    animateHumanoid(rig, rig._acc, speed, mode, t); rig._acc = 0;
  }
  updateAnimals(dt, t, pp) {
    const near = (p, r) => (p.x - pp.x) ** 2 + (p.z - pp.z) ** 2 < r * r;
    for (const o of this.animals) {
      const vis = near(o.pos, this.viewR) && this.night < 0.7; o.a.g.visible = vis; if (!vis) continue; castsShadow(o.a.g, near(o.pos, 25));
      let moving = false;
      if (o.wait > 0) o.wait -= dt;
      else { if (!o.target) { o.target = new V3(o.home.x + rr(-o.radius, o.radius), 0, o.home.z + rr(-o.radius, o.radius)); }
        const dx = o.target.x - o.pos.x, dz = o.target.z - o.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.3) { o.target = null; o.wait = rr(2, 10); }
        else { const sp = o.speed * dt, ox = o.pos.x, oz = o.pos.z; moveWithCollision(o.pos, dx / d * sp, dz / d * sp, 0.2, 0.6); if (Math.hypot(o.pos.x - ox, o.pos.z - oz) < sp * 0.3) { o.target = null; o.wait = 1; } o.pos.y = groundAt(o.pos.x, o.pos.z, o.pos.y + 0.3); o.a.g.rotation.y = angleLerp(o.a.g.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 4)); moving = true; } }
      animateAnimal(o.a, dt, moving, t);
    }
  }
  walk(a, dt) {
    if (a.wait > 0) { a.wait -= dt; return false; }
    if (!a.target) { a.ri += a.dir; if (a.ri >= a.route.length || a.ri < 0) { a.dir = -a.dir; a.ri += 2 * a.dir; a.ri = Math.max(0, Math.min(a.route.length - 1, a.ri)); if (a.pause) a.wait = a.pause; } a.target = a.route[a.ri]; a.stuck = 0; }
    const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z, dist = Math.hypot(dx, dz);
    if (dist < 0.7) { a.target = null; if (a.pause && (a.ri === 0 || a.ri === a.route.length - 1)) a.wait = a.pause; return false; }
    const sp = a.speed * dt, ox = a.pos.x, oz = a.pos.z;
    moveWithCollision(a.pos, (dx / dist) * sp, (dz / dist) * sp, 0.3, 1.7);
    if (Math.hypot(a.pos.x - ox, a.pos.z - oz) < sp * 0.3) { a.stuck = (a.stuck || 0) + dt; if (a.stuck > 1.5) { a.dir = -a.dir; a.target = null; a.wait = rr(0.5, 2); } } // (quem empaca dá meia-volta)
    a.pos.y = groundAt(a.pos.x, a.pos.z, a.pos.y + 0.45);
    a.rig.root.position.copy(a.pos); return true;
  }
  update(dt, t, player, night) {
    this.t = t; this.night = night; const pp = player.pos; this.pp = pp;
    this.updateAnimals(dt, t, pp); this.updateTropa(dt, pp);
    if (this.camera) { this._pv.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse); this._fr.setFromProjectionMatrix(this._pv); }
    const near = (o, r) => (o.pos.x - pp.x) ** 2 + (o.pos.z - pp.z) ** 2 < r * r;
    const face = (o, target, k) => { if (!target) return; const ang = Math.atan2(target.x - o.pos.x, target.z - o.pos.z); o.rig.root.rotation.y = angleLerp(o.rig.root.rotation.y, ang, Math.min(1, dt * k)); };
    const dark = night > 0.55;
    for (const a of this.agents) {
      let vis = near(a, this.viewR) && !(dark && !a.night) && !a.hidden && (!a.when || a.when(this.day));
      if (vis && this.camera && !near(a, 6)) { this._s.center.set(a.pos.x, a.pos.y + 0.95, a.pos.z); this._s.radius = 1.3; vis = this._fr.intersectsSphere(this._s); } // (fora da tela não se desenha nem se calcula o esqueleto)
      a.rig.root.visible = vis; if (!vis) { if (!a.static && !a.tropa && !a.talking) { a._w = (a._w || 0) + dt; if (a._w > 0.25) { this.walk(a, a._w); a._w = 0; } } continue; } // (fora da tela, o passo é dado de quatro em quatro quadros)
      if (a.talking) { face(a, pp, 6); this.anim(a.rig, dt, 0, 'talk', t); continue; }
      if (a.tropa) { this.anim(a.rig, dt, a.tropaMoving ? 1.15 : 0, a.tropaMoving ? 'walk' : 'idle', t); continue; }
      if (a.static) { if (a.mode !== 'work' && a.mode !== '@pegar') a.rig.root.rotation.y = angleLerp(a.rig.root.rotation.y, a.ry, dt * 2); this.anim(a.rig, dt, 0, a.mode, t); continue; }
      const moving = this.walk(a, dt); if (moving) face(a, a.target, 5);
      this.anim(a.rig, dt, moving ? a.speed : 0, moving ? (a.run ? 'run' : 'walk') : 'idle', t);
    }
  }
}
