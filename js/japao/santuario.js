// O santuário Sengen (inspirado no Kitaguchi Hongū Fuji Sengen-jinja, em Fujiyoshida): no fim da rua dos oshi, o
// grande torii vermelho; a alameda (sandō) de cedros gigantes com lanternas de pedra dos dois lados; o portão
// zuishinmon; a fonte de purificação (temizuya); o palco de kagura; o salão de oração (haiden), com a caixa de
// oferendas e a corda do sino; atrás, dentro da cerca, o santuário principal (honden) de laca vermelha e preta;
// e, nos fundos, o torii do começo da trilha Yoshida — daqui os peregrinos subiam o Fuji.
// Fatos: o santuário existe desde pelo menos o século XV; o honden atual é de 1615. Aqui é uma composição
// inspirada nele, não uma cópia fiel.
import * as THREE from 'three';
import { addCircle } from '../comum/collision.js';
import { frame, toro, torii, shimenawa, nobori, roofGeo } from './kit.js';
import { terrainHeight, SHRINE, LEVEL } from './terrain.js';

const V3 = THREE.Vector3;

// o salão (haiden/honden): assoalho alto sobre pilares, varanda com guarda-corpo, escada na frente, telhado irimoya
function hall(B, M, out, x, y, z, ry, w, d, fl, opts = {}) {
  const f = frame(B, x, y, z, ry), hw = w / 2, hd = d / 2, H = opts.h || 4.2;
  const post = opts.post || M.vermilion;
  for (let i = 0; i <= 3; i++) for (let j = 0; j <= 2; j++) { const px = -hw + (w * i) / 3, pz = -hd + (d * j) / 2; f.post(post, px, pz, fl + H, 0.17); }
  f.box(M.blackWood, w + 1.6, 0.14, d + 1.6, 0, fl - 0.14, 0); f.solid(0, 0, w + 1.6, d + 1.6, fl - 1.2, fl, true); // o assoalho com a varanda (en)
  f.box(M.cedar, w - 0.2, 0.06, d - 0.2, 0, fl, 0);
  for (const [lx, lz, lw, ld] of [[0, hd + 0.75, w + 1.6, 0.08], [0, -hd - 0.75, w + 1.6, 0.08], [hw + 0.75, 0, 0.08, d + 1.6], [-hw - 0.75, 0, 0.08, d + 1.6]]) { // guarda-corpo (menos no meio da frente)
    const balusters = (cx, cz, L, alongX) => { const n = Math.max(1, Math.round(L / 1.4)); for (let k = 0; k <= n; k++) { const t = -L / 2 + (L * k) / n; f.box(post, 0.08, 0.79, 0.08, alongX ? cx + t : cx, fl, alongX ? cz : cz + t); } }; // (os pilaretes que seguram a barra)
    if (lz > 0) { for (const sd of [-1, 1]) { const L = (w + 1.6) / 2 - 1.3, cx = sd * ((w + 1.6) / 4 + 0.65); f.box(post, L, 0.08, 0.08, cx, fl + 0.75, lz); balusters(cx, lz, L, true); f.solid(cx, lz, L, 0.1, fl, fl + 0.8); } continue; }
    f.box(post, lw, 0.08, ld, lx, fl + 0.75, lz); balusters(lx, lz, Math.max(lw, ld), lw > ld); f.solid(lx, lz, lw, ld + 0.02, fl, fl + 0.8);
  }
  // a escada da frente (largura 2,6 m) até o assoalho
  const n = Math.ceil(fl / 0.22), sh = fl / n;
  for (let i = 0; i < n; i++) { const lz = hd + 0.8 + (n - i) * 0.32; f.box(M.cedar, 2.6, sh * (i + 1), 0.34, 0, 0, lz); f.solid(0, lz, 2.6, 0.34, -1, sh * (i + 1), true); }
  for (const sd of [-1, 1]) f.box(post, 0.12, 0.9, n * 0.32 + 0.3, sd * 1.4, fl * 0.5, hd + 0.8 + n * 0.16 + 0.2, { rx: -Math.atan2(fl, n * 0.32) * 0.0 });
  // paredes: a frente de portas de grade (para ver dentro), os lados e o fundo de tábuas
  f.wall(M.koshi, -hw, hd, hw, hd, H - 0.6, 0.08, [[hw, 2.2, 2.3]], { y0: fl });
  f.wall(opts.wall || M.cedar, -hw, -hd, hw, -hd, H - 0.6, 0.1, [], { y0: fl }); f.wall(opts.wall || M.cedar, -hw, -hd, -hw, hd, H - 0.6, 0.1, [], { y0: fl }); f.wall(opts.wall || M.cedar, hw, -hd, hw, hd, H - 0.6, 0.1, [], { y0: fl });
  f.box(post, w + 0.3, 0.3, 0.3, 0, fl + H - 0.6, hd); f.box(M.gold, w + 0.3, 0.05, 0.32, 0, fl + H - 0.3, hd); // a viga e o friso dourado
  for (let i = 0; i < 9; i++) f.box(M.blackWood, 0.14, 0.4, 1.2, -hw + (w * (i + 0.5)) / 9, fl + H - 0.25, hd + 0.5); // os caibros aparentes do beiral
  const rw = w + 3.2, rd = d + 3.4;
  f.roof(opts.roof || M.bark, rw, rd, rd * 0.42, fl + H, { thick: 0.45, sori: 0.55, sag: 1.5, irimoya: true });
  f.box(M.blackWood, Math.max(1, rw - rd) + 1.4, 0.5, 0.6, 0, fl + H + rd * 0.42 - 0.3, 0);
  if (opts.chigi) for (const sd of [-1, 1]) { f.box(M.blackWood, 0.14, 1.6, 0.14, sd * (Math.max(1, rw - rd) / 2 + 0.7), fl + H + rd * 0.42, 0.3, { rx: 0.45 }); f.box(M.blackWood, 0.14, 1.6, 0.14, sd * (Math.max(1, rw - rd) / 2 + 0.7), fl + H + rd * 0.42, -0.3, { rx: -0.45 }); }
  // dentro: espelho sagrado e as oferendas (sake, arroz, sal) no altar
  f.box(M.blackWood, w * 0.5, 0.9, 1.0, 0, fl, -hd + 1.1); f.geo(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 20), M.gold, 0, fl + 1.35, -hd + 1.05, { rx: Math.PI / 2, uv: false }); f.box(M.blackWood, 0.3, 0.12, 0.3, 0, fl + 0.9, -hd + 1.05); f.box(M.gold, 0.06, 0.08, 0.06, 0, fl + 1.0, -hd + 1.05); // o espelho sagrado no suporte
  for (const dx of [-0.8, 0, 0.8]) f.geo(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 10), M.paper, dx, fl + 1.05, -hd + 1.4, { uv: false });
  return f;
}

export function buildShrine(B, M, out) {
  const S = SHRINE, Y = LEVEL.shrine, cx = S.x, z0 = S.z - S.d / 2; // a entrada (norte) e o pátio vão subindo para o sul
  // o chão de cascalho do recinto e a alameda
  B.box(M.gravel, 7, 0.08, S.d - 4, cx, Y + 0.02, S.z);
  // o grande torii na entrada, de frente para a rua
  torii(B, M, cx, terrainHeight(cx, z0 + 4), z0 + 4, 0, 8.5, 9, 'myojin');
  // os cedros gigantes da alameda (alguns com 30 m e mais de mil anos: o maior tem a corda sagrada em volta)
  const cedar = (x, z, s) => { const y = terrainHeight(x, z) - 0.3; B.geo(new THREE.CylinderGeometry(0.5 * s, 0.95 * s, 30 * s, 10), M.darkWood, x, y + 15 * s, z, { uv: false });
    for (let k = 0; k < 6; k++) B.geo(new THREE.ConeGeometry((4.2 - k * 0.55) * s, 7 * s, 10, 1), M.cedarLeaf, x + Math.sin(k * 2.4) * 0.4, y + (13 + k * 3.6) * s, z + Math.cos(k * 2.4) * 0.4, { uv: false });
    addCircle(x, z, 0.95 * s, y - 1, y + 8); };
  for (let z = z0 + 10; z < z0 + 50; z += 7) for (const sd of [-1, 1]) cedar(cx + sd * (6.5 + (z % 3)), z, 0.85 + ((z * 7) % 5) * 0.05);
  { const tx = cx - 11, tz = z0 + 44; cedar(tx, tz, 1.25); const y = terrainHeight(tx, tz); shimenawa(B, M, tx - 1.3, y + 2.6, tz + 0.4, tx + 1.3, tz + 0.4, 0.16); out.spots.taroSugi = new V3(tx + 2, y, tz + 2); } // o "Fuji Tarō-sugi", o cedro-avô
  // as lanternas de pedra, aos pares
  for (let z = z0 + 9; z < z0 + 52; z += 5.5) for (const sd of [-1, 1]) toro(B, M, out, cx + sd * 4.2, terrainHeight(cx + sd * 4.2, z), z, 1.15, z % 11 < 5.5);
  // o portão zuishinmon (os guardiões ficam nas laterais, atrás da grade)
  { const gz = z0 + 56, f = frame(B, cx, Y, gz, 0);
    for (const px of [-4.6, -1.6, 1.6, 4.6]) for (const pz of [-1.4, 1.4]) f.post(M.vermilion, px, pz, 4.6, 0.2);
    for (const sd of [-1, 1]) { f.wall(M.koshi, sd * 4.6, -1.4, sd * 1.6, -1.4, 3.4, 0.1); f.wall(M.vermilionDark, sd * 4.6, 1.4, sd * 1.6, 1.4, 3.4, 0.1); f.box(M.vermilionDark, 1.2, 2.4, 1.0, sd * 3.1, 0.3, 0); f.box(M.gold, 0.7, 0.5, 0.5, sd * 3.1, 2.6, 0); } // os dois guardiões (zuishin), entrevistos pela grade
    f.box(M.vermilion, 10, 0.4, 3.4, 0, 4.4, 0); f.roof(M.bark, 12.5, 6.4, 2.9, 4.8, { thick: 0.4, sori: 0.6, sag: 1.5, irimoya: true });
    f.box(M.blackWood, 1.6, 0.9, 0.12, 0, 3.6, 1.6); f.box(M.gold, 1.2, 0.6, 0.02, 0, 3.75, 1.67); }
  // a fonte de purificação (temizuya): bacia de pedra com a água correndo e as conchas de bambu
  { const tx = cx + 9, tz = z0 + 64, f = frame(B, tx, Y, tz, -Math.PI / 2);
    for (const px of [-1.4, 1.4]) for (const pz of [-1.1, 1.1]) f.post(M.cedar, px, pz, 2.8, 0.1);
    f.box(M.stone, 2.2, 0.75, 1.0, 0, 0, 0); f.box(M.water, 1.9, 0.04, 0.75, 0, 0.72, 0, { noGround: true }); f.solid(0, 0, 2.2, 1.0, -1, 0.8);
    for (let i = 0; i < 4; i++) f.box(M.straw, 0.05, 0.05, 0.4, -0.6 + i * 0.4, 0.8, 0.45);
    f.roof(M.bark, 4.2, 3.6, 1.2, 2.8, { thick: 0.25, sori: 0.4, irimoya: true }); out.spots.temizuya = new V3(...(() => { const [a, b] = f.W(0, 1.6); return [a, Y, b]; })()); }
  // o palco de kagura (as danças sagradas), aberto dos quatro lados
  { const kz = z0 + 70, kx = cx - 10, f = frame(B, kx, Y, kz, Math.PI / 2);
    for (const px of [-3, 0, 3]) for (const pz of [-2.5, 2.5]) f.post(M.vermilion, px, pz, 4.2, 0.14);
    f.box(M.cedar, 6.4, 1.0, 5.4, 0, 0, 0); f.solid(0, 0, 6.4, 5.4, -1, 1.0, true);
    for (let i = 0; i < 3; i++) { f.box(M.stoneLight, 1.6, 0.33 * (i + 1), 0.4, 0, 0, 2.9 + (2 - i) * 0.4); f.solid(0, 2.9 + (2 - i) * 0.4, 1.6, 0.4, -1, 0.33 * (i + 1), true); }
    f.roof(M.bark, 8.6, 7.4, 2.4, 4.2, { thick: 0.35, sori: 0.5, irimoya: true }); out.spots.kagura = new V3(kx, Y + 1.0, kz); }
  // o salão de oração (haiden) e, atrás, dentro da cerca de madeira, o santuário principal (honden)
  const hz = z0 + 84;
  const f1 = hall(B, M, out, cx, Y, hz, Math.PI, 12, 8, 1.3, { h: 4.4, chigi: false }); // (de frente para o norte, para quem chega pela alameda)
  { const [bx, bz] = f1.W(0, 4.9); B.box(M.blackWood, 2.0, 0.9, 0.9, bx, Y + 1.3, bz); B.box(M.dark, 1.6, 0.06, 0.5, bx, Y + 2.2, bz, { noGround: true }); // a caixa de oferendas
    shimenawa(B, M, cx - 4.4, Y + 1.3 + 4.0, hz - 4.3, cx + 4.4, hz - 4.3, 0.22);
    B.geo(new THREE.CylinderGeometry(0.04, 0.04, 3.2, 6), M.straw, cx, Y + 1.3 + 2.2, hz - 4.5, { uv: false }); B.geo(new THREE.SphereGeometry(0.22, 10, 8), M.gold, cx, Y + 1.3 + 3.9, hz - 4.5, { uv: false }); // a corda do sino (suzu)
    out.spots.haiden = new V3(cx, Y, hz - 8); }
  { const nz = hz + 14; hall(B, M, out, cx, Y + 0.6, nz, Math.PI, 7, 6, 1.6, { h: 3.6, chigi: true, wall: M.vermilion, roof: M.bark });
    const f = frame(B, cx, Y, nz, Math.PI); // a cerca (tamagaki), com o portãozinho fechado
    for (const [a, b, c, d] of [[-7, 5, -1.4, 5], [1.4, 5, 7, 5], [-7, -6, 7, -6], [-7, -6, -7, 5], [7, -6, 7, 5]]) f.wall(M.vermilion, a, b, c, d, 1.5, 0.08);
    for (let i = -6; i <= 6; i += 1.2) { f.box(M.blackWood, 0.09, 1.7, 0.09, i, 0, 5); f.box(M.blackWood, 0.09, 1.7, 0.09, i, 0, -6); }
    out.spots.honden = new V3(cx, Y, nz); }
  // os estandartes dos peregrinos e os balcões dos amuletos
  for (const [dx, dz, k] of [[-5.5, 50, 0], [5.5, 50, 1], [-5.5, 74, 2], [5.5, 74, 3]]) nobori(B, M, cx + dx, Y, z0 + dz, Math.PI / 2, k);
  { const f = frame(B, cx + 11, Y, z0 + 82, -Math.PI / 2); // o balcão dos amuletos (juyosho): telhadinho, mesa com amuletos
    for (const px of [-2.2, 2.2]) for (const pz of [-1.2, 1.2]) f.post(M.cedar, px, pz, 2.6, 0.09);
    f.box(M.cedar, 4.2, 0.9, 0.8, 0, 0, 0.8); f.solid(0, 0.8, 4.2, 0.8, -1, 0.9);
    for (let i = 0; i < 7; i++) f.box(i % 2 ? M.redCloth : M.paper, 0.18, 0.28, 0.04, -1.6 + i * 0.5, 0.95, 0.8);
    f.roof(M.bark, 5.6, 3.8, 1.1, 2.6, { thick: 0.22, sori: 0.4, irimoya: true }); out.spots.omamori = new V3(...(() => { const [a, b] = f.W(0, 2.2); return [a, Y, b]; })()); }
  { const f = frame(B, cx - 11, Y, z0 + 82, Math.PI / 2); for (const px of [-1.5, 1.5]) f.post(M.cedar, px, 0, 2, 0.06); f.box(M.cedar, 3.2, 0.08, 0.1, 0, 1.4, 0); f.box(M.cedar, 3.2, 0.08, 0.1, 0, 1.9, 0);
    for (let i = 0; i < 9; i++) f.box(M.wood, 0.22, 0.16, 0.02, -1.3 + (i % 5) * 0.6, 1.25 + Math.floor(i / 5) * 0.5, 0.07); f.roof(M.bark, 3.8, 0.9, 0.3, 2.1, { thick: 0.08, sori: 0.1, gable: true }); } // as tabuinhas de pedidos (ema)
  // nos fundos, o torii do começo da trilha (Yoshida-guchi) e a placa
  { const tz = S.z + S.d / 2 - 4, ty = terrainHeight(cx, tz); torii(B, M, cx, ty, tz, 0, 5.2, 6, 'myojin');
    B.box(M.cedar, 0.16, 2.2, 0.16, cx + 3.6, ty, tz + 1); B.box(M.cedar, 0.7, 1.6, 0.08, cx + 3.6, ty + 1.0, tz + 1.08, { noGround: true }); B.box(M.dark, 0.5, 1.3, 0.02, cx + 3.6, ty + 1.15, tz + 1.13, { noGround: true });
    out.spots.trailhead = new V3(cx, ty, tz + 4); }
  out.zones.shrine = [S.x - S.w / 2, S.x + S.w / 2, S.z - S.d / 2, S.z + S.d / 2];
  out.lights.push({ pos: new V3(cx, Y + 3, hz - 6), color: 0xffb070, intensity: 6, dist: 22, night: true });
  void roofGeo;
}
