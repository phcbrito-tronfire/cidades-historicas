// O templo budista no alto da colina a leste (um templo de bairro da escola Sōtō Zen, como havia em toda vila):
// a escadaria de pedra, o portão (sanmon), o salão principal (hondō) com a imagem guardada num oratório dourado,
// a torre do sino (shōrō) com o grande sino de bronze e a tora de bater, o incensário, a fileira de Jizō de babador
// vermelho (o protetor das crianças e dos viajantes), o cemitério com as lápides de pedra e a casa dos monges.
// No período Edo todo mundo tinha de estar registrado num templo budista (o sistema danka): era também cartório.
import * as THREE from 'three';
import { addCircle, addBox } from '../comum/collision.js';
import { frame, toro, nobori } from './kit.js';
import { house } from './vila.js';
import { terrainHeight, TEMPLE, LEVEL } from './terrain.js';

const V3 = THREE.Vector3;

export function buildTemple(B, M, out) {
  const T = TEMPLE, Y = LEVEL.temple, cx = T.x, cz = T.z, top = T.r * 0.5; // o alto plano tem ~31 m de raio
  // o piso de cascalho e a escadaria que sobe do lado oeste (de frente para a vila)
  B.box(M.gravel, top * 1.6, 0.1, top * 1.6, cx, Y + 0.01, cz);
  { const x0 = cx - top + 2, run = 46, steps = Math.ceil(run / 0.6);
    for (let i = 0; i < steps; i++) { const x = x0 - i * 0.6, yb = terrainHeight(x, cz), yt = Math.max(yb + 0.05, Y - i * (Y - terrainHeight(x0 - run, cz)) / steps);
      B.box(M.stone, 0.62, Math.max(0.2, yt - yb + 0.3), 3.4, x, yb - 0.3, cz); addBox(x, cz, 0.62, 3.4, yb - 1, Math.max(yb, yt)); }
    for (let i = 0; i < steps; i += 8) for (const sd of [-1, 1]) { const x = x0 - i * 0.6; toro(B, M, out, x, terrainHeight(x, cz + sd * 2.6), cz + sd * 2.6, 0.75, false); }
    out.spots.templeStairs = new V3(x0 - run - 3, terrainHeight(x0 - run - 3, cz), cz);
  }
  // o portão (sanmon) no alto da escada
  { const f = frame(B, cx - top + 5, Y, cz, Math.PI / 2);
    for (const px of [-2.8, 2.8]) for (const pz of [-1.2, 1.2]) f.post(M.darkWood, px, pz, 4.2, 0.18);
    f.box(M.darkWood, 7, 0.35, 3, 0, 3.9, 0); f.roof(M.kawara, 8.6, 5.2, 2.0, 4.3, { thick: 0.22, sori: 0.35, irimoya: true });
    for (const sd of [-1, 1]) { f.wall(M.plaster, sd * 2.8, -1.2, sd * 4.2, -1.2, 2.6, 0.2); } }
  // o salão principal (hondō)
  { const hx = cx + 8, f = frame(B, hx, Y, cz, -Math.PI / 2), w = 14, d = 12, hw = w / 2, hd = d / 2, fl = 0.9, H = 4.4;
    f.box(M.stone, w + 3, 0.5, d + 3, 0, -0.1, 0); f.box(M.wood, w + 1.8, fl - 0.4, d + 1.8, 0, 0.4, 0); f.solid(0, 0, w + 1.8, d + 1.8, -1, fl, true);
    for (let i = 0; i < 4; i++) { f.box(M.stone, 4, 0.22 * (i + 1), 0.4, 0, 0, hd + 0.9 + (3 - i) * 0.4); f.solid(0, hd + 0.9 + (3 - i) * 0.4, 4, 0.4, -1, 0.22 * (i + 1), true); }
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 3; j++) { const px = -hw + (w * i) / 4, pz = -hd + (d * j) / 3; if (Math.abs(pz) < hd && Math.abs(px) < hw && i > 0 && i < 4 && j > 0 && j < 3) continue; if (j === 3 && Math.abs(px) < 2.2) continue; f.post(M.darkWood, px, pz, fl + H, 0.18); }
    f.box(M.tatami, w - 0.4, 0.05, d * 0.55, 0, fl, hd - d * 0.3); f.box(M.blackWood, w - 0.4, 0.05, d * 0.42, 0, fl + 0.01, -hd + d * 0.22); // a nave de tatame e o santuário de madeira escura
    f.wall(M.shoji, -hw, hd, hw, hd, H - 0.4, 0.08, [[hw, 4.2, H - 0.4]], { y0: fl }); // a frente: shōji abertos no meio
    f.wall(M.plaster, -hw, -hd, hw, -hd, H - 0.4, 0.14, [], { y0: fl }); f.wall(M.plaster, -hw, -hd, -hw, hd, H - 0.4, 0.14, [[d * 0.7, 1.2, 2]], { y0: fl }); f.wall(M.plaster, hw, -hd, hw, hd, H - 0.4, 0.14, [[d * 0.7, 1.2, 2]], { y0: fl });
    // o altar: plataforma, o oratório (zushi) dourado com as portas entreabertas, a auréola e as velas
    f.box(M.blackWood, 6, 1.0, 2.4, 0, fl, -hd + 1.6); f.solid(0, -hd + 1.6, 6, 2.4, fl - 1, fl + 1);
    f.box(M.blackWood, 2.0, 2.4, 1.4, 0, fl + 1.0, -hd + 1.4); f.box(M.gold, 1.7, 2.0, 0.05, 0, fl + 1.2, -hd + 2.11);
    for (const sd of [-1, 1]) f.box(M.gold, 0.85, 2.0, 0.05, sd * 1.25, fl + 1.2, -hd + 2.5, { ry: sd * 0.9 });
    f.geo(new THREE.CircleGeometry(0.75, 24), M.gold, 0, fl + 2.6, -hd + 2.15, { uv: false });
    for (const sd of [-1, 1]) { f.geo(new THREE.CylinderGeometry(0.05, 0.07, 0.9, 8), M.bronze, sd * 2.2, fl + 1.45, -hd + 2.3, { uv: false }); f.box(M.flame, 0.04, 0.1, 0.04, sd * 2.2, fl + 1.92, -hd + 2.3); const [a, b] = f.W(sd * 2.2, -hd + 2.3); out.torches.push(new V3(a, Y + fl + 1.95, b)); }
    f.geo(new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.bronze, 1.6, fl + 0.02, -hd + 3.4, { rx: Math.PI, uv: false }); // o gongo de bacia (kin)
    f.geo(new THREE.CylinderGeometry(0.38, 0.42, 0.55, 14), M.redCloth, -1.6, fl + 0.28, -hd + 3.4, { uv: false }); // o tambor de peixe (mokugyo) no almofadão
    f.box(M.darkWood, w + 0.3, 0.32, 0.32, 0, fl + H - 0.4, hd);
    f.roof(M.kawara, w + 4.2, d + 4.2, (d + 4.2) * 0.42, fl + H, { thick: 0.25, sori: 0.45, sag: 1.45, irimoya: true });
    f.box(M.kawara, w - d + 1.6, 0.5, 0.5, 0, fl + H + (d + 4.2) * 0.42 - 0.25, 0); for (const sd of [-1, 1]) f.box(M.iron, 0.45, 0.8, 0.55, sd * ((w - d) / 2 + 0.9), fl + H + (d + 4.2) * 0.42 - 0.25, 0);
    out.spots.hondo = new V3(...(() => { const [a, b] = f.W(0, hd - 1.5); return [a, Y + fl, b]; })());
    out.lights.push({ pos: new V3(...(() => { const [a, b] = f.W(0, -hd + 3); return [a, Y + fl + 2.4, b]; })()), color: 0xffb060, intensity: 5, dist: 14 });
  }
  // o incensário de bronze na frente do salão
  { const ix = cx - 4, y = Y; B.box(M.stone, 1.4, 0.5, 1.4, ix, y, cz); B.geo(new THREE.CylinderGeometry(0.6, 0.45, 0.6, 14), M.bronze, ix, y + 0.8, cz, { uv: false }); B.geo(new THREE.ConeGeometry(0.75, 0.6, 6), M.bronze, ix, y + 1.9, cz, { uv: false });
    for (const sd of [-1, 1]) B.box(M.bronze, 0.08, 0.7, 0.08, ix + sd * 0.45, y + 1.1, cz); addCircle(ix, cz, 0.8, y - 1, y + 2.2); out.spots.incense = new V3(ix - 1.5, y, cz); }
  // a torre do sino (shōrō): o sino de bronze pendurado e a tora de bater
  { const bx = cx - 12, bz = cz - 18, f = frame(B, bx, Y, bz, 0);
    f.box(M.stone, 5.2, 0.7, 5.2, 0, -0.1, 0); f.solid(0, 0, 5.2, 5.2, -1, 0.6, true); f.box(M.stone, 1.6, 0.4, 0.7, 0, -0.1, 2.95); f.solid(0, 2.95, 1.6, 0.7, -1, 0.3, true); // o degrau
    for (const px of [-1.8, 1.8]) for (const pz of [-1.8, 1.8]) f.post(M.darkWood, px, pz, 5.2, 0.16, 0.6);
    f.box(M.darkWood, 4, 0.3, 0.3, 0, 5.1, 0);
    const bell = new THREE.LatheGeometry([[0, 1.6], [0.35, 1.58], [0.55, 1.4], [0.62, 0.6], [0.72, 0.05], [0.7, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 20);
    f.geo(bell, M.bronze, 0, 3.1, 0, { uv: false }); f.box(M.bronze, 0.2, 0.4, 0.2, 0, 4.7, 0);
    f.geo(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 8), M.wood, 1.25, 3.7, 0, { rz: Math.PI / 2, uv: false }); f.box(M.straw, 0.03, 1.4, 0.03, 1.6, 3.8, 0);
    f.roof(M.kawara, 6.4, 6.4, 2.2, 5.4, { thick: 0.22, sori: 0.45, sag: 1.5 });
    out.spots.bell = new V3(bx + 2.6, Y + 0.6, bz); }
  // a fileira de Jizō: pedrinhas em forma de monge, com babador e touca vermelhos
  for (let i = 0; i < 6; i++) { const x = cx - top + 9 + i * 1.1, z = cz + 13, y = Y;
    B.box(M.stoneLight, 0.6, 0.3, 0.5, x, y, z); B.geo(new THREE.CylinderGeometry(0.17, 0.22, 0.65, 10), M.stoneLight, x, y + 0.62, z, { uv: false }); B.geo(new THREE.SphereGeometry(0.16, 10, 8), M.stoneLight, x, y + 1.1, z, { uv: false });
    B.geo(new THREE.ConeGeometry(0.25, 0.3, 10, 1, true), M.redCloth, x, y + 0.82, z, { rx: Math.PI, uv: false }); B.geo(new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.redCloth, x, y + 1.15, z, { uv: false });
    addCircle(x, z, 0.3, y - 1, y + 1.3); }
  out.spots.jizo = new V3(cx - top + 11.5, Y, cz + 11.5);
  // o cemitério atrás do salão: lápides de pedra empilhadas (o pedestal, o corpo e o "chapéu") e as tábuas sotoba
  for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) { const x = cx + 20 + j * 3.1, z = cz - 15 + i * 2.6, y = terrainHeight(x, z), h = 0.9 + ((i * 7 + j * 3) % 4) * 0.12;
    B.box(M.stone, 0.9, 0.35, 0.9, x, y, z); B.box(M.stoneLight, 0.5, h, 0.42, x, y + 0.35, z); B.box(M.stone, 0.7, 0.12, 0.6, x, y + 0.35 + h, z);
    for (let s = 0; s < 3; s++) B.box(M.wood, 0.12, 1.5, 0.02, x - 0.25 + s * 0.2, y + 0.3, z - 0.42);
    addCircle(x, z, 0.5, y - 1, y + 1.4); }
  // a casa dos monges (kuri), de palha, ao lado
  house(B, M, out, { x: cx - 4, z: cz + 20, ry: Math.PI, w: 13, d: 9, roof: 'thatch', front: 'shoji', engawa: false, kind: 'farm', doma: 4.2 });
  nobori(B, M, cx - top + 6, Y, cz + 4, Math.PI / 2, 2);
  out.zones.temple = [cx - top - 4, cx + top + 4, cz - top - 4, cz + top + 4];
}
