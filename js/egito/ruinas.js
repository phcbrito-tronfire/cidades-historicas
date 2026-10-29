// Ruínas no meio do Nilo: numa ilhota de areia, o que sobrou de um santuário de Hapi (o deus da cheia) do Médio
// Império, uns 600 anos mais velho que a Mênfis de Ramsés. Uma cheia muito alta derrubou as colunas de papiro; ficaram
// tocos de pé, tambores caídos, um capitel tombado, a capela de granito sem teto e, na ponta oeste, o nilômetro —
// a escada que desce para dentro do rio, com as marcas de côvado na parede, onde os sacerdotes mediam a cheia.
// No fundo do rio, ao lado da ilha, o casco de um barco de carga que afundou com os jarros.
import * as THREE from 'three';
import { Batcher } from '../comum/batcher.js';
import { addBox, addCircle } from '../comum/collision.js';
import { rr, rand } from '../comum/util.js';
import { riverX, terrainHeight, ISLE } from './terrain.js';
import { lobed, jar } from './buildings.js';

const V3 = THREE.Vector3;

export function buildNileRuins(scene, city) {
  const B = new Batcher();
  // 600 anos de sol e de cheias: a pintura das colunas quase sumiu
  const faded = (m) => { const c = m.clone(); c.color = new THREE.Color(0xb3a48c); c.roughness = 0.95; return c; };
  const M = { ...city.M, colShaft: faded(city.M.colShaft), colBands: faded(city.M.colBands), colCap: faded(city.M.colCap) };
  const ix = riverX(ISLE.z) + ISLE.dx, iz = ISLE.z, g0 = ISLE.top;
  const S = city.spots, Z = city.zones;
  const ground = (x, z) => Math.max(terrainHeight(x, z), g0 - 0.25);

  // plataforma de blocos de calcário, desalinhada pela água (alguns blocos afundaram, outros levantaram)
  for (let i = -3; i <= 3; i++) for (let j = -5; j <= 5; j++) {
    if (rand() < 0.16) continue; // bloco que a cheia levou
    const x = ix + i * 1.4, z = iz + j * 1.4, sink = rr(-0.12, 0.06), y = ground(x, z) - 0.2 + sink;
    B.box(M.limestone, 1.36, 0.5, 1.36, x, y, z, { ry: rr(-0.05, 0.05), rx: rr(-0.03, 0.03), rz: rr(-0.03, 0.03) });
    addBox(x, z, 1.36, 1.36, y - 1, y + 0.5);
  }
  const top = g0 + 0.3 + 0.02; // piso da plataforma

  // colunas de papiro (feixe de hastes): duas fileiras de três; de pé só ficaram tocos de alturas diferentes
  const R = 0.62;
  const shaft = (h) => lobed(new THREE.CylinderGeometry(R, R * 0.93, h, 48, 3, false), 0.1);
  const stand = [[-3, -5, 4.6, true], [-3, 0, 2.3], [-3, 5, 0.9], [3, -5, 3.4], [3, 0, 0], [3, 5, 1.6]];
  for (const [dx, dz, h, cap] of stand) {
    const x = ix + dx, z = iz + dz;
    B.geo(new THREE.CylinderGeometry(R * 1.2, R * 1.28, 0.32, 24), M.sandstone, x, top + 0.16, z); // base
    if (h > 0) {
      B.geo(shaft(h), M.colShaft, x, top + 0.32 + h / 2, z, { uv: false });
      if (cap) { // a única que ainda tem as amarras e o capitel fechado
        B.geo(lobed(new THREE.CylinderGeometry(R * 1.02, R * 1.02, 0.4, 48, 1, true), 0.08), M.colBands, x, top + 0.32 + h + 0.2, z, { uv: false });
        const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(R * (1 + 0.42 * Math.sin(t * Math.PI * 0.95) - 0.25 * t), t * 1.2)); }
        B.geo(lobed(new THREE.LatheGeometry(pts, 48), 0.14), M.colCap, x, top + 0.72 + h, z, { uv: false });
      } else { // topo quebrado: lascas
        for (let k = 0; k < 4; k++) B.box(M.sandstone, rr(0.3, 0.6), rr(0.1, 0.3), rr(0.3, 0.6), x + rr(-0.3, 0.3), top + 0.32 + h - 0.05, z + rr(-0.3, 0.3), { ry: rr(0, 3), rx: rr(-0.3, 0.3) });
      }
    }
    addCircle(x, z, R * 1.2, top - 1, top + 0.32 + Math.max(0.3, h) + (cap ? 1.6 : 0));
  }
  // tambores caídos: duas colunas que tombaram para leste, ainda em fila, e uma que rolou até a água
  const drum = (x, y, z, ry, len, tilt = 0) => {
    B.geo(shaft(len), M.colShaft, x, y + R * 0.92, z, { rz: Math.PI / 2 + tilt, ry, uv: false });
    const c = Math.cos(ry), s = Math.sin(ry);
    for (let k = -1; k <= 1; k++) addCircle(x + c * k * len * 0.33, z - s * k * len * 0.33, R * 0.9, y - 0.5, y + R * 1.8);
  };
  for (const [sx, sz, ry] of [[3.6, 0.3, 0.12], [3.4, 5.4, -0.2]]) {
    let x = ix + sx + 1.6, z = iz + sz;
    for (let k = 0; k < 3; k++) {
      const len = rr(1.3, 1.7);
      drum(x, ground(x, z) - 0.15, z, ry + rr(-0.15, 0.15), len, rr(-0.04, 0.04));
      x += len + rr(0.25, 0.6); z += rr(-0.4, 0.4);
    }
  }
  { const x = ix + 10.5, z = iz - 9; drum(x, terrainHeight(x, z) - 0.4, z, 0.7, 1.6, 0.1); } // meio dentro d'água
  // capitel tombado de lado, no chão entre as colunas
  {
    const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(R * (1 + 0.42 * Math.sin(t * Math.PI * 0.95) - 0.25 * t), t * 1.2)); }
    const x = ix + 0.4, z = iz - 2.6;
    B.geo(lobed(new THREE.LatheGeometry(pts, 48), 0.14), M.colCap, x, top + R * 1.2, z, { rz: Math.PI / 2, ry: 0.5, uv: false });
    addCircle(x, z, 0.9, top - 0.5, top + 1.4);
  }
  // arquitrave caída, atravessada sobre dois tambores
  B.box(M.sandstone, 0.9, 0.8, 5.4, ix + 1.2, top, iz + 2.6, { ry: 0.35, rz: 0.09 }); addBox(ix + 1.2, iz + 2.6, 1.6, 4.6, top - 1, top + 0.9);

  // capela (naos) de granito sem teto, com a porta virada para o sul e a mesa de oferendas dentro
  {
    const cx = ix, cz = iz + 9.5, w = 3.2, d = 3.6, h = 2.2, t = 0.4;
    B.box(M.granite, w, h, t, cx, top, cz + d / 2); addBox(cx, cz + d / 2, w, t, top - 1, top + h);
    for (const s of [-1, 1]) { B.box(M.granite, t, h * (s > 0 ? 1 : 0.7), d, cx + s * w / 2, top, cz); addBox(cx + s * w / 2, cz, t, d, top - 1, top + h); }
    for (const s of [-1, 1]) { B.box(M.granite, (w - 1.2) / 2, h, t, cx + s * (w / 4 + 0.3), top, cz - d / 2); addBox(cx + s * (w / 4 + 0.3), cz - d / 2, (w - 1.2) / 2, t, top - 1, top + h); }
    B.box(M.granite, 1.6, 0.3, 0.5, cx + 1.4, top, cz - d / 2 - 0.9, { ry: 0.4, rz: 0.2 }); // pedaço do lintel no chão
    B.box(M.relief, 1.2, 0.7, 0.8, cx, top, cz + 0.6); addBox(cx, cz + 0.6, 1.2, 0.8, top - 1, top + 0.7); // mesa de oferendas
    jar(B, M, cx - 0.4, top + 0.7, cz + 0.6, 0.45); jar(B, M, cx + 0.35, top + 0.7, cz + 0.5, 0.4);
    S.hapiShrine = new V3(cx, top, cz);
  }
  // estela caída com relevo (Hapi, barrigudo, com plantas de papiro e lótus na cabeça)
  B.box(M.relief, 1.4, 0.25, 2.2, ix - 5, top - 0.05, iz + 3, { ry: -0.3, rx: 0.06 }); addBox(ix - 5, iz + 3, 1.6, 2.2, top - 1, top + 0.25);

  // nilômetro: escada que desce da ponta oeste da ilha para dentro do rio, entre dois muros; no muro norte, as marcas
  // de côvado (≈ 52 cm cada) — pela altura da água no auge da cheia se calculava o imposto do ano
  {
    const x0 = ix - 7.5, z = iz - 1, n = 16, run = 0.55, rise = 0.28, W = 2.2;
    for (let k = 0; k < n; k++) {
      const x = x0 - k * run, y = top - (k + 1) * rise;
      B.box(M.limestone, run + 0.02, 0.4, W, x, y - 0.4 + 0.02, z); addBox(x, z, run, W, y - 1.5, y + 0.02);
    }
    const len = n * run + 1, mid = x0 - (n * run) / 2 + 0.3;
    for (const s of [-1, 1]) {
      B.box(M.limestone, len, top + 4.2, 0.45, mid, -4, z + s * (W / 2 + 0.22)); addBox(mid, z + s * (W / 2 + 0.22), len, 0.45, -5, top + 0.2);
    }
    for (let c = 0; c < 9; c++) { // marcas de côvado, com números em traços
      const y = top - 0.2 - c * 0.52;
      B.box(M.dark, len * 0.9, 0.03, 0.02, mid, y, z + W / 2 - 0.005, { uv: false });
      for (let q = 0; q <= c % 4; q++) B.box(M.dark, 0.03, 0.14, 0.02, x0 - 0.3 - q * 0.08, y + 0.04, z + W / 2 - 0.005, { uv: false });
    }
    S.nilometer = new V3(x0, top, z);
  }

  // barco de carga afundado no leito, a leste da ilha: quilha, cavernas e o costado meio enterrado, jarros espalhados
  {
    const wx = ix + 17, wz = iz + 4, ry = 0.5, c = Math.cos(ry), s = Math.sin(ry), L = 9;
    const at = (u, w) => [wx + c * u + s * w, wz - s * u + c * w];
    const floor = (u, w) => { const [x, z] = at(u, w); return terrainHeight(x, z); };
    const [kx, kz] = at(0, 0);
    B.box(M.wood, L, 0.25, 0.3, kx, floor(0, 0) - 0.05, kz, { ry, rz: 0.04 }); // quilha
    for (let k = 0; k < 9; k++) { // cavernas (as costelas do casco), quebradas a alturas diferentes
      const u = -L / 2 + 0.6 + k * ((L - 1.2) / 8), hgt = rr(0.4, 1.1);
      for (const sd of [-1, 1]) {
        if (rand() < 0.2) continue;
        const [x, z] = at(u, sd * 0.9);
        B.box(M.wood, 0.16, hgt, 0.16, x, floor(u, sd * 0.9) - 0.1, z, { ry, rx: sd * 0.45 });
      }
    }
    for (const sd of [-1, 1]) for (let p = 0; p < 2; p++) { // tábuas do costado
      const [x, z] = at(rr(-1, 1), sd * (0.75 + p * 0.25));
      B.box(M.wood, L * rr(0.5, 0.8), 0.05, 0.3, x, floor(0, sd) + 0.15 + p * 0.25, z, { ry, rx: sd * 0.9 });
    }
    for (let i = 0; i < 14; i++) { // a carga: jarros de vinho e de óleo, alguns deitados
      const u = rr(-L / 2, L / 2), w = rr(-2.5, 2.5), [x, z] = at(u, w);
      jar(B, M, x, floor(u, w) - 0.1, z, rr(0.5, 0.8));
    }
    S.nileWreck = new V3(kx, floor(0, 0), kz);
    S.nileWreckAnchor = (() => { const [x, z] = at(L / 2 + 2.2, 1); return new V3(x, terrainHeight(x, z), z); })();
  }
  B.build(scene);
  Z.ilha = [ix - ISLE.a, ix + ISLE.a, iz - ISLE.b, iz + ISLE.b];
  return {
    seen: false,
    // primeira vez na ilha: cartão contando o que é o lugar
    update(player, showInfo) {
      if (this.seen) return;
      const p = player.pos, z = Z.ilha;
      if (p.x > z[0] + 2 && p.x < z[1] - 2 && p.z > z[2] + 4 && p.z < z[3] - 4 && !player.swimming) {
        this.seen = true;
        showInfo({ tag: 'Ruínas', name: 'Santuário de Hapi', era: 'Médio Império · ~1850 a.C.', story: 'Uma capela para Hapi, o deus da cheia do Nilo, construída seiscentos anos antes de Ramsés. Uma cheia muito alta derrubou as colunas de papiro e o santuário foi abandonado. Na ponta oeste sobrou o nilômetro: a escada desce para dentro do rio, e as marcas de côvado na parede mostravam quanto a água subia — cheia boa, colheita boa; cheia alta demais, casas e templos levados. E dizem os pescadores que, ao lado da ilha, um barco de carga afundou com tudo o que levava…', foot: 'Desça a escada do nilômetro e mergulhe (segure o Espaço) para ver o barco no fundo.' });
      }
    },
  };
}
