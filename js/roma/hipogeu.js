// O hipogeu em dia de jogos: os bastidores debaixo da arena. No corredor central, o arsenal (armamentarium) com os
// gládios, escudos, lanças e elmos em prateleiras; um gladiador afiando a espada na mó, outros esperando no banco,
// um treinando no poste (palus) e o médico enfaixando um ferido. Nos corredores dos lados, as feras nas jaulas sobre
// os elevadores, os cabrestantes que içavam as jaulas até os alçapões, feno, água e braseiros acesos.
import * as THREE from 'three';
import { addBox, addCircle } from '../comum/collision.js';
import { amphoraPile } from './anfora.js';

const V3 = THREE.Vector3;
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });

export function buildHypogeumLife(B, M, out, y0) {
  const steel = std(0xb8bcc0, { metalness: 0.85, roughness: 0.35 }), red = std(0x9a2a1e, { roughness: 0.8 }), blue = std(0x2a4a8a, { roughness: 0.8 });
  const coal = new THREE.MeshBasicMaterial({ color: 0xff7a2a }), hay = std(0xd8b860, { roughness: 1 }), linen = std(0xefe6d2, { roughness: 0.95 });
  const people = out.hypoPeople = [], beasts = out.hypoBeasts = [];
  const cyl = (r0, r1, h, mat, x, y, z, o = {}) => B.geo(new THREE.CylinderGeometry(r0, r1, h, o.seg || 10), mat, x, y, z, { uv: false, ...o });

  // ---- o arsenal: três estantes junto ao muro sul do corredor central
  [-17, -12, -7].forEach((x, k) => {
    const z = -3.75, H = 2.1;
    for (const dx of [-1.2, 1.2]) B.box(M.darkWood, 0.12, H, 0.3, x + dx, y0, z);
    for (const yy of [0.7, 1.35, 2.0]) B.box(M.darkWood, 2.5, 0.08, 0.3, x, y0 + yy, z);
    addBox(x, z, 2.6, 0.5, y0 - 1, y0 + H);
    if (k === 1) { // escudos pendurados: dois retangulares (murmilo) e dois redondos (trácio)
      for (const [dx, mat] of [[-0.75, red], [0, blue], [0.75, red]]) { B.box(mat, 0.6, 0.95, 0.06, x + dx, y0 + 0.75, z + 0.18); cyl(0.09, 0.09, 0.05, M.bronze, x + dx, y0 + 1.22, z + 0.22, { rx: Math.PI / 2 }); }
    } else { // gládios e sicas presos pela empunhadura, de ponta para baixo
      for (let i = 0; i < 6; i++) { const sx = x - 1.0 + i * 0.4; B.box(steel, 0.05, 0.55, 0.012, sx, y0 + 0.75, z + 0.17); B.box(M.bronze, 0.14, 0.03, 0.04, sx, y0 + 1.3, z + 0.17); B.box(M.darkWood, 0.035, 0.12, 0.035, sx, y0 + 1.33, z + 0.17); }
      for (let i = 0; i < 4; i++) B.geo(new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.bronze, x - 0.9 + i * 0.6, y0 + 2.08, z + 0.05, { uv: false }); // elmos na prateleira de cima
    }
    for (let i = 0; i < 3; i++) cyl(0.02, 0.02, 2.4, M.darkWood, x + 1.45 + i * 0.12, y0 + 1.15, z + 0.12, { rz: 0.18 }); // lanças encostadas
  });
  // ---- a mó de afiar, com o gladiador ajoelhado passando o gládio
  { const x = -9.5, z = -1.6;
    for (const dz of [-0.3, 0.3]) B.box(M.darkWood, 0.12, 0.9, 0.12, x, y0, z + dz);
    cyl(0.42, 0.42, 0.14, M.travertine2, x, y0 + 0.75, z, { rx: Math.PI / 2, seg: 18 });
    cyl(0.03, 0.03, 0.8, M.darkWood, x, y0 + 0.75, z, { rx: Math.PI / 2 });
    B.box(M.wood, 0.5, 0.35, 0.4, x - 0.2, y0, z + 0.6); // o balde d'água
    addBox(x, z, 0.9, 1.0, y0 - 1, y0 + 1.2);
    people.push({ kind: 'murmillo', x: x + 0.9, z, ry: -Math.PI / 2, mode: 'work', lines: ['O fio tem de cortar a corda do reciário de uma vez só. Senão, ele me prende na rede.', 'Hoje eu entro no terceiro par. Se a plateia gostar, talvez eu ganhe a espada de madeira.'] }); }
  // ---- o banco dos que esperam a vez, no muro norte
  { const x0 = -21, x1 = -13, z = 3.55;
    B.box(M.wood, x1 - x0, 0.08, 0.5, (x0 + x1) / 2, y0 + 0.45, z); for (const x of [x0 + 0.4, (x0 + x1) / 2, x1 - 0.4]) B.box(M.darkWood, 0.1, 0.45, 0.4, x, y0, z);
    addBox((x0 + x1) / 2, z, x1 - x0, 0.5, y0 - 1, y0 + 0.5);
    people.push({ kind: 'thraex', x: -19.5, z: z - 0.05, ry: Math.PI, mode: 'sit', lines: ['Ouve? Lá em cima a plateia está gritando. Deve ser a caçada.', 'Sou da Trácia de verdade. A maioria aqui só usa o capacete.'] });
    people.push({ kind: 'retiarius', x: -15.5, z: z - 0.05, ry: Math.PI, mode: 'sit', lines: ['O reciário luta quase nu: rede, tridente e um punhal. Tem de ser rápido.', 'Meu lanista diz que eu valho mais vivo do que morto. Tomara que a plateia concorde.'] });
    people.push({ kind: 'secutor', x: -17.5, z: 2.4, ry: Math.PI, mode: 'idle', lines: ['O secutor tem o capacete liso e redondo: a rede escorrega. Mas dentro dele mal se respira.'] }); }
  // ---- o poste de treino (palus), com marcas de golpes
  { const x = 0.5, z = 1.8; cyl(0.17, 0.2, 1.9, M.darkWood, x, y0 + 0.95, z, { seg: 8 }); addCircle(x, z, 0.25, y0 - 1, y0 + 1.9);
    people.push({ kind: 'hoplomachus', x: x - 1.1, z, ry: Math.PI / 2, mode: 'guard', lines: ['Golpe, defesa, golpe. Mil vezes por dia no poste, para o corpo lembrar sozinho.'] }); }
  // ---- o médico e o ferido (Galeno cuidou de gladiadores em Pérgamo antes de vir para Roma)
  { const x = 9.5, z = 2.6; B.box(M.wood, 2.0, 0.8, 0.8, x, y0, z); B.box(linen, 1.9, 0.05, 0.75, x, y0 + 0.8, z); for (let i = 0; i < 4; i++) cyl(0.05, 0.04, 0.12, M.terracotta, x - 0.7 + i * 0.22, y0 + 0.9, z - 0.22);
    addBox(x, z, 2.0, 0.8, y0 - 1, y0 + 0.9);
    people.push({ kind: 'medico', x, z: z - 0.9, ry: 0, mode: 'work', lines: ['Vinho no corte, depois mel, depois o linho bem apertado. Ele volta a lutar no mês que vem.', 'Aqui embaixo aprende-se mais sobre o corpo do que em qualquer livro.'] }); }
  // ---- água, ânforas e braseiros acesos (é escuro debaixo do tablado)
  B.box(M.travertine2, 2.2, 0.6, 0.7, -24.5, y0, 2.8); B.box(M.water, 2.0, 0.04, 0.5, -24.5, y0 + 0.55, 2.8); addBox(-24.5, 2.8, 2.2, 0.7, y0 - 1, y0 + 0.6);
  amphoraPile(B, M.terracotta, -24.5, y0, -2.9, 0, 4, 2);
  for (const [x, z] of [[-14, 0], [-3, -1.2], [6, 0.5], [14, -2.4]]) {
    for (let k = 0; k < 3; k++) { const a = k * 2.09; cyl(0.025, 0.025, 1.0, M.bronze, x + Math.cos(a) * 0.22, y0 + 0.5, z + Math.sin(a) * 0.22, { rx: Math.sin(a) * 0.2, rz: -Math.cos(a) * 0.2, seg: 5 }); }
    cyl(0.35, 0.2, 0.2, M.bronze, x, y0 + 1.05, z, { seg: 14 }); B.geo(new THREE.SphereGeometry(0.28, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), coal, x, y0 + 1.1, z, { uv: false });
    addCircle(x, z, 0.4, y0 - 1, y0 + 1.2); out.torches.push(new V3(x, y0 + 1.35, z));
  }
  out.lights.push({ pos: new V3(-12, y0 + 3, 0), color: 0xffa050, intensity: 7, dist: 22 }, { pos: new V3(8, y0 + 3, 0), color: 0xffa050, intensity: 7, dist: 22 }); // a luz dos braseiros
  // ---- as jaulas das feras sobre os elevadores (as grades de madeira) e os cabrestantes ao lado
  const cage = (x, z, beast) => {
    const s = 0.85, H = 1.8;
    for (const [dx, dz] of [[-s, -s], [s, -s], [-s, s], [s, s]]) B.box(M.darkWood, 0.12, H, 0.12, x + dx, y0 + 0.46, z + dz);
    B.box(M.darkWood, s * 2 + 0.12, 0.1, s * 2 + 0.12, x, y0 + 0.46 + H, z);
    for (let i = -3; i <= 3; i++) for (const sd of [-1, 1]) { cyl(0.025, 0.025, H, M.darkWood, x + i * 0.24, y0 + 0.46 + H / 2, z + sd * s, { seg: 5 }); cyl(0.025, 0.025, H, M.darkWood, x + sd * s, y0 + 0.46 + H / 2, z + i * 0.24, { seg: 5 }); }
    addBox(x, z, s * 2 + 0.2, s * 2 + 0.2, y0 - 1, y0 + 0.46 + H);
    if (beast) beasts.push({ kind: beast, x, y: y0 + 0.52, z, ry: Math.random() * 6 });
  };
  cage(-8, 6.45, 'leao'); cage(6, -6.45, 'leao'); cage(-14, 10.8, 'urso'); // (só onde há fera: a jaula fecha quase todo o corredor)
  for (const [x, z] of [[-10.6, 6.45], [3.4, -6.45], [-16.6, 10.8]]) { // cabrestante: tambor deitado, com as barras para empurrar
    cyl(0.32, 0.32, 1.2, M.darkWood, x, y0 + 0.9, z, { rx: Math.PI / 2, seg: 12 }); for (const dz of [-0.62, 0.62]) B.box(M.darkWood, 0.15, 1.2, 0.15, x, y0, z + dz);
    for (let k = 0; k < 4; k++) B.box(M.darkWood, 1.6, 0.06, 0.06, x, y0 + 0.9, z, { rz: k * Math.PI / 4 });
    addBox(x, z, 0.8, 1.4, y0 - 1, y0 + 1.3);
  }
  for (const [x, z] of [[12.5, 8.2], [-2, 12.3], [-24, -10.6]]) { B.box(hay, 1.1, 0.5, 0.7, x, y0, z); B.box(hay, 1.1, 0.5, 0.7, x + 0.15, y0 + 0.5, z + 0.05, { ry: 0.3 }); addBox(x, z, 1.2, 0.8, y0 - 1, y0 + 1.0); }
  people.push({ kind: 'worker', x: -9.4, z: 7.6, ry: Math.PI / 2, mode: 'idle', lines: ['Quando o lanista der o sinal, a gente gira o cabrestante e o leão sobe direto para a areia.', 'Dez homens em cada cabrestante. O alçapão abre lá em cima e a fera aparece do nada.'] });
  people.push({ kind: 'worker', x: 4.8, z: -7.8, ry: -Math.PI / 2, mode: 'work', lines: ['Não chegue perto da grade. Esse aí não come desde ontem: é para ficar bravo na caçada.'] });
}
