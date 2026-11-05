// A Ilha Tiberina como era: as margens revestidas de travertino em forma de navio, com a proa pontuda rio abaixo
// (lembrando o barco que trouxe a serpente de Esculápio de Epidauro, em 291 a.C.), o obelisco no meio fazendo de
// mastro, o templo de Esculápio — deus da medicina; a ilha é hospital até hoje — e as duas pontes de pedra que a
// ligam às margens: a Ponte Fabrício (62 a.C., ainda de pé) e a Ponte Céstio.
import * as THREE from 'three';
import { addBox, addCircle } from '../comum/collision.js';
import { temple } from './forum.js';
import { bay } from './trajano.js';
import { ISOLA, terrainHeight } from './terrain.js';
import { lerp } from '../comum/util.js';

const V3 = THREE.Vector3;

export function buildTiberina(B, M, out) {
  const I = ISOLA, c = Math.cos(I.rot), s = Math.sin(I.rot);
  // quadro da ilha: u atravessa o rio, v vai rio abaixo (para o sul)
  const W = (u, v) => ({ x: I.x + u * c - v * s, z: I.z + u * s + v * c });
  const ryV = Math.atan2(-s, c); // um box com o comprimento em z, girado para seguir v
  const top = 2.7, bot = -2.4;
  // contorno: elipse rio acima e, rio abaixo, os lados afinando até a ponta da proa
  const outline = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2, v0 = Math.sin(a) * I.b, u0 = Math.cos(a) * I.a;
    let u = u0, v = v0;
    if (v0 > I.b * 0.25) { const t = (v0 - I.b * 0.25) / (I.b * 0.75); u = u0 * (1 - t * 0.85); v = v0 + t * 9; }
    outline.push([u * 1.02, v * 1.02]);
  }
  const heads = [[-(I.a + 0.5), -4], [I.a + 0.5, 6]]; // onde as pontes encostam na ilha
  for (let i = 0; i < outline.length - 1; i++) {
    const [u0, v0] = outline[i], [u1, v1] = outline[i + 1], p = W((u0 + u1) / 2, (v0 + v1) / 2), q0 = W(u0, v0), q1 = W(u1, v1);
    const L = Math.hypot(q1.x - q0.x, q1.z - q0.z), ry = Math.atan2(q1.x - q0.x, q1.z - q0.z);
    B.box(M.travertine, 1.4, top - bot, L + 0.1, p.x, bot, p.z, { ry });
    if (!heads.some(([hu, hv]) => Math.hypot((u0 + u1) / 2 - hu, (v0 + v1) / 2 - hv) < 3.6)) addCircle(p.x, p.z, 0.8, bot - 1, top);
  }
  // a proa: a quilha de pedra na ponta e o bastão de Esculápio (com a serpente) esculpido no costado
  { const p = W(0, I.b + 8.5); B.geo(new THREE.ConeGeometry(1.2, 3.2, 4), M.travertine, p.x, top + 0.2, p.z, { rx: Math.PI / 2, ry: ryV + Math.PI }); }
  for (const sd of [-1, 1]) { const p = W(sd * (I.a * 0.55 + 0.75), I.b * 0.72); B.box(M.marble, 0.15, 2.0, 0.35, p.x, 0.2, p.z, { ry: ryV }); B.geo(new THREE.TorusGeometry(0.3, 0.06, 5, 12), M.marble, p.x + sd * 0.1, 1.4, p.z, { ry: ryV + Math.PI / 2 }); }
  // o piso: lajes de travertino em cima da ilha
  { const sh = new THREE.Shape(outline.map(([u, v]) => { const p = W(u, v); return new THREE.Vector2(p.x - I.x, -(p.z - I.z)); }));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
    B.geo(g, M.travertine2, I.x, top - 0.3, I.z);
    // o chão andável: caixas de 2 m em toda a ilha, na altura do piso (o relevo por baixo é só um morro, e quem
    // andava para a beira afundava debaixo das lajes)
    const inside = (u, v) => { let c = false; for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) { const [ui, vi] = outline[i], [uj, vj] = outline[j]; if ((vi > v) !== (vj > v) && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) c = !c; } return c; };
    for (let u = -I.a - 1; u <= I.a + 1; u += 2) for (let v = -I.b - 1; v <= I.b + 10; v += 2) if (inside(u, v)) { const p = W(u, v); addBox(p.x, p.z, 3, 3, top - 3, top); } /* (3 m: com a ilha girada, caixas menores deixavam frestas entre si) */ }
  // o obelisco (o mastro do navio) no meio
  { const p = W(0, 4); B.box(M.marbleWall, 2.6, 1.6, 2.6, p.x, top, p.z, { ry: ryV }); B.geo(new THREE.CylinderGeometry(0.42, 0.7, 12, 4), M.granite, p.x, top + 1.6 + 6, p.z, { ry: Math.PI / 4 + ryV }); B.geo(new THREE.ConeGeometry(0.42, 0.9, 4), M.gold, p.x, top + 1.6 + 12.45, p.z, { ry: Math.PI / 4 + ryV }); addCircle(p.x, p.z, 1.5, top - 1, top + 14); }
  // o templo de Esculápio, rio acima
  { const p = W(0, -18); temple(B, M, out, { id: 'esculapio', x: p.x, z: p.z, face: '-z', w: 10, d: 14, h: 6.5, podium: 1.4, cols: 4, deep: 1 }); }
  // as duas pontes: de cada lado, um tabuleiro de pedra com dois arcos, subindo um pouco no meio
  for (const sd of [-1, 1]) {
    // a ponte vai até o alto da margem (antes parava a 46 m do centro da ilha: uma ponta caía na água e a outra no
    // meio do barranco, e não dava para atravessar). A ponta fica onde o chão chega à altura da margem
    const v = sd < 0 ? -4 : 6, u0 = sd * (I.a + 0.5);
    let u1 = 46; { const hAt = (u) => { const q = W(sd * u, v); return terrainHeight(q.x, q.z); }; let hi = -99; for (let u = I.a + 2; u < 140; u++) hi = Math.max(hi, hAt(u)); for (let u = I.a + 2; u < 140; u++) if (hAt(u) >= hi - 0.4) { u1 = u + 1.5; break; } }
    u1 *= sd;
    const p0 = W(u0, v), p1 = W(u1, v), h0 = top, h1 = Math.max(terrainHeight(p1.x, p1.z), 1.5);
    const ry = Math.atan2(p1.x - p0.x, p1.z - p0.z), L = Math.hypot(p1.x - p0.x, p1.z - p0.z), n = Math.ceil(L / 2.4);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, x = lerp(p0.x, p1.x, t), z = lerp(p0.z, p1.z, t), y = lerp(h0, h1, t) + Math.sin(t * Math.PI) * 1.2;
      B.box(M.travertine2, 6, 0.5, L / n + 0.08, x, y - 0.5, z, { ry });
      for (const e of [-1, 1]) B.box(M.travertine, 0.4, 0.9, L / n + 0.08, x + Math.cos(ry) * e * 2.9, y, z - Math.sin(ry) * e * 2.9, { ry }); // parapeitos
      addBox(x, z, 2.8, 2.8, y - 3, y); // o chão do tabuleiro (andável)
      for (const e of [-1, 1]) addCircle(x + Math.cos(ry) * e * 3.1, z - Math.sin(ry) * e * 3.1, 0.35, y - 1, y + 0.9);
    }
    // os dois arcos por baixo, com o pilar no meio
    for (const t of [0.3, 0.72]) {
      const x = lerp(p0.x, p1.x, t), z = lerp(p0.z, p1.z, t), y = lerp(h0, h1, t) + Math.sin(t * Math.PI) * 1.2 - 0.5;
      for (const e of [-1, 1]) B.geo(bay(L * 0.42, y + 3, L * 0.3), M.travertine, x + Math.cos(ry) * e * 2.6, -3, z - Math.sin(ry) * e * 2.6, { ry: ry - Math.PI / 2 });
    }
  }
  out.spots.tiberina = new V3(W(0, 10).x, top, W(0, 10).z);
  out.zones.tiberina = [I.x - 50, I.x + 50, I.z - 50, I.z + 50];
}
