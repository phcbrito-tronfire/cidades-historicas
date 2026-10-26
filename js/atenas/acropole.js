// Acrópole em 432 a.C.: o Parthenon recém-terminado (Ictino e Calícrates, esculturas de Fídias), os Propileus de
// Mnésicles ainda em obras, a Atena Promachos de bronze, o Antigo Templo de Atena Pólias com a oliveira sagrada,
// o grande altar e a muralha na beira do penhasco. Na encosta sul: o teatro de Dioniso e o Odeon de Péricles.
// (O Erecteion e o templo de Atena Nike ainda não existem: serão construídos a partir de 427–421 a.C.)
import * as THREE from 'three';
import { doricTemple, doricShaft, doricCapital, ionicColumn, pedimentGeo, roofHalf } from './arquitetura.js';
import { addBox, addCircle } from '../comum/collision.js';
import { terrainHeight, ACRO, THEATER } from './terrain.js';
import { distToStreets } from './ruas.js';
import { rr, rand, fbm as fbmR } from '../comum/util.js';

const V3 = THREE.Vector3;

export function buildAcropolis(B, M, out) {
  const S = out.spots;
  const top = (x, z) => terrainHeight(x, z);

  // ---------------- muralha na borda do planalto (o parapeito impede de cair do penhasco)
  {
    const rot = -0.08, c = Math.cos(rot), s = Math.sin(rot);
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const t = (i / 160) * Math.PI * 2, ct = Math.cos(t), st = Math.sin(t);
      const u = ACRO.a * 0.975 * Math.sign(ct) * Math.abs(ct) ** 0.5, v = ACRO.b * 0.975 * Math.sign(st) * Math.abs(st) ** 0.5;
      pts.push({ x: u * c - v * s, z: u * s + v * c, u, v });
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if ((a.u < -92 && Math.abs(a.v) < 34) || (b.u < -92 && Math.abs(b.v) < 34)) continue; // entrada oeste (Propileus)
      const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, len = Math.hypot(b.x - a.x, b.z - a.z) + 0.4, ry = -Math.atan2(b.z - a.z, b.x - a.x);
      const y0 = top(mx, mz);
      B.box(M.poros, len, 7.6, 2.4, mx, y0 - 6, mz, { ry });
      B.box(M.wallStone, len, 0.25, 2.7, mx, y0 + 1.6, mz, { ry }); // coroamento
      addBox(mx, mz, Math.abs(Math.cos(ry)) * len + Math.abs(Math.sin(ry)) * 2.4, Math.abs(Math.sin(ry)) * len + Math.abs(Math.cos(ry)) * 2.4, y0 - 12, y0 + 1.6);
    }
  }

  // ---------------- pedregulhos caídos do penhasco (e no Areópago): calcário cinza-mel, rachado
  {
    const rot = -0.08, cr = Math.cos(rot), sr = Math.sin(rot);
    const rockMat = M.rock;
    const base = new THREE.IcosahedronGeometry(1, 2);
    const shapes = [0, 1, 2].map((k) => { const g = base.clone(); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const n = 0.7 + fbmR(v.x * 1.6 + k * 3, v.y * 1.6 + v.z * 1.3) * 0.6; p.setXYZ(i, v.x * n, v.y * n * 0.75, v.z * n); } g.computeVertexNormals(); return g; });
    const put = (x, z, s) => { if (distToStreets(x, z) < 9) return; const y = terrainHeight(x, z); B.geo(shapes[Math.floor(rand() * 3)], rockMat, x, y - s * 0.35, z, { rx: rand() * 3, ry: rand() * 3, rz: rand() * 3, sx: s * rr(0.8, 1.4), sy: s, sz: s * rr(0.8, 1.3), uv: { s: 3 } }); if (s > 1.2) addCircle(x, z, s * 0.9, y - 2, y + s); };
    for (let i = 0; i < 260; i++) {
      const t = rand() * Math.PI * 2, ct = Math.cos(t), st = Math.sin(t);
      const r = rr(1.03, 1.42), u = ACRO.a * r * Math.sign(ct) * Math.abs(ct) ** 0.5, v = ACRO.b * r * Math.sign(st) * Math.abs(st) ** 0.5;
      if (u < -95 && Math.abs(v) < 45) continue; // rampa
      const x = u * cr - v * sr, z = u * sr + v * cr;
      if (Math.hypot(x - THEATER.x, z - THEATER.z) < THEATER.r1 + 4) continue;
      put(x, z, rr(0.5, 2.6) * (r < 1.15 ? 1.3 : 0.8));
    }
    for (let i = 0; i < 70; i++) { const a = rand() * 6.3, d = Math.sqrt(rand()), x = -152 + Math.cos(a) * 56 * d, z = -96 + Math.sin(a) * 28 * d; if (x < -192) continue; put(x, z, rr(0.6, 2.2)); } // (longe da Via Panatenaica)
  }

  // ---------------- Parthenon (69,5 × 30,9 m; 8 × 17 colunas de 10,4 m), frente para o leste
  const PX = 22, PZ = 12;
  const py = top(PX, PZ) - 0.35;
  const par = doricTemple(B, { M, x: PX, y: py, z: PZ, ry: 0, nf: 8, ns: 17, col: 1.9, h: 10.43, ic: 4.2, steps: 3, stepH: 0.55, stepW: 0.72, found: 1.8,
    cella: { w: 21.5, d: 56, door: 5, inner: 10 } });
  S.parthenon = new V3(PX, par.Y, PZ);
  // dentro: a Atena Partenos de Fídias (ouro e marfim, ~11,5 m com a base), de frente para a porta; diante dela, o
  // espelho d'água raso que mantinha o marfim úmido e refletia a luz da porta
  const AX = PX - 15;
  B.box(M.marble, 4.4, 1.2, 8.2, AX, par.Y, PZ);
  B.box(M.paintBlue, 4.5, 0.2, 8.3, AX, par.Y + 0.9, PZ);
  addBox(AX, PZ, 4.4, 8.2, par.Y - 1, par.Y + 1.2);
  out.sculptures.push({ model: 'partenos', x: AX, y: par.Y + 1.2, z: PZ, ry: 0, length: 10.2 });
  B.box(M.paintBlack ?? M.triglyph, 6, 0.05, 9, AX + 6.5, par.Y, PZ);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 8.6), M.water); pool.rotation.x = -Math.PI / 2; pool.position.set(AX + 6.5, par.Y + 0.07, PZ);
  (out.extra ||= []).push(pool);
  S.partenos = new V3(AX + 9.5, par.Y, PZ);
  S.parthenonDoor = new V3(PX + 28 + 6, par.Y, PZ);
  out.lights.push({ pos: new V3(AX + 4, par.Y + 6, PZ), color: 0xffd8a0, intensity: 260, dist: 26 });
  out.zones.parthenon = [PX - 36, PX + 36, PZ - 17, PZ + 17];
  out.zones.cella = [PX - 28, PX + 28, PZ - 10.7, PZ + 10.7];
  // esculturas dos frontões (Sketchfab, se carregarem) — leste: o nascimento de Atena
  out.sculptures.push({ model: 'frontao', x: PX + 34.0, y: par.Y + 10.43 + 1.42 + 1.48 + 0.57 + 0.15, z: PZ, ry: 0, length: 26, optional: true });
  // oeste: a disputa de Atena e Poseidon (usa o mesmo conjunto de figuras, virado para o oeste)
  out.sculptures.push({ model: 'frontao', x: PX - 34.0, y: par.Y + 10.43 + 1.42 + 1.48 + 0.57 + 0.15, z: PZ, ry: Math.PI, length: 26, optional: true });
  // tochas/braseiros na escada leste
  for (const dz of [-12, 12]) { brazier(B, M, out, PX + 38, top(PX + 38, PZ + dz), PZ + dz); }

  // ---------------- Antigo Templo de Atena Pólias (reconstruído em parte depois dos persas) e a oliveira sagrada
  const OX = -2, OZ = -27;
  const ot = doricTemple(B, { M, x: OX, y: top(OX, OZ) - 0.3, z: OZ, ry: 0, nf: 6, ns: 12, col: 1.5, h: 7.4, ic: 3.6, steps: 2, stepH: 0.45, stepW: 0.6,
    cella: { w: 12, d: 32, door: 3.6 } });
  S.oldTemple = new V3(OX + 22, ot.Y, OZ);
  out.sculptures.push({ model: 'atena_xoanon', x: OX - 10, y: ot.Y, z: OZ, ry: 0, length: 2.3, optional: true });
  // Pandroseion: recinto com a oliveira que Atena fez brotar na disputa com Poseidon
  const ox = -30, oz = -38, oy = top(ox, oz);
  for (const [w, d, x, z] of [[16, 0.6, ox, oz - 7], [16, 0.6, ox, oz + 7], [0.6, 14, ox - 8, oz], [0.6, 5, ox + 8, oz - 4.5]]) { B.box(M.marbleWall, w, 1.4, d, x, oy, z); addBox(x, z, w, d, oy, oy + 1.4); }
  out.sacredOlive = { x: ox, y: oy, z: oz, s: 1.2 };
  S.olive = new V3(ox + 4, oy, oz + 3);
  // marca do tridente de Poseidon na rocha (poço de água salgada) e o altar de Zeus Polieus
  B.box(M.poros, 2.2, 0.5, 2.2, OX + 9, top(OX + 9, OZ - 16), OZ - 16);
  // grande altar de Atena, a leste do Antigo Templo
  {
    const x = 34, z = -27, y = top(x, z);
    B.box(M.marble, 11, 0.4, 7, x, y, z); B.box(M.marble, 9.5, 1.3, 5.6, x, y + 0.4, z);
    B.box(M.poros, 4, 0.3, 2, x, y + 1.7, z);
    addBox(x, z, 9.5, 5.6, y, y + 1.7);
    out.torches.push(new V3(x, y + 2.2, z)); out.altarFire = new V3(x, y + 2, z);
    S.altar = new V3(x, y, z + 5);
  }

  // ---------------- Atena Promachos (bronze, ~9 m), de frente para quem entra pelos Propileus
  {
    const x = -70, z = -6, y = top(x, z);
    B.box(M.marble, 5, 0.5, 5, x, y, z); B.box(M.marble, 3.6, 2.4, 3.6, x, y + 0.5, z); B.box(M.marble, 4.2, 0.35, 4.2, x, y + 2.9, z);
    addBox(x, z, 4.4, 4.4, y, y + 3.3);
    out.sculptures.push({ model: 'promachos', x, y: y + 3.25, z, ry: Math.PI, length: 9 });
    S.promachos = new V3(x - 5, y, z);
  }

  // ---------------- Propileus (em obras): duas fachadas dóricas hexastilas, passagem com colunas jônicas,
  // a parede das cinco portas, a ala norte (Pinacoteca) e andaimes, guindaste e blocos com as alças de içar
  {
    const X0 = -126, X1 = -100, Y = ACRO.top - 2.2, Wd = 18.2;
    const ic = 3.6, D = 1.56, H = 8.8, r = D / 2;
    S.propylaea = new V3(X1 + 6, Y, 0);
    B.box(M.marble, X1 - X0 + 2, 0.6, Wd + 2, (X0 + X1) / 2, Y - 0.6, 0);
    const facade = (x, facing) => {
      for (const z of [-8.2, -5.3, -2.7, 2.7, 5.3, 8.2]) { // vão central mais largo (passagem dos animais do sacrifício)
        B.geo(doricShaft(H - 0.9, r), M.colMarble, x, Y, z, { uv: { s: 1.2 } });
        B.geo(doricCapital(r), M.colMarble, x, Y + H - 0.9, z, { uv: { s: 1.2 } });
        addCircle(x, z, r, Y - 1, Y + H);
      }
      B.box(M.marble, 2.2, 1.2, Wd + 1, x, Y + H, 0); // arquitrave
      B.box(M.marble, 2.0, 1.25, Wd + 0.8, x, Y + H + 1.2, 0); // friso
      for (let i = 0; i < 12; i++) B.box(M.triglyph, 0.12, 1.2, 0.72, x + facing * 1.02, Y + H + 1.22, -Wd / 2 + 0.8 + i * (Wd - 1.6) / 11);
      B.box(M.marble, 2.6, 0.45, Wd + 1.6, x, Y + H + 2.45, 0);
      B.geo(pedimentGeo(Wd + 1.6, 2.6, 2.2), M.marble, x, Y + H + 2.9, 0, { ry: Math.PI / 2, uv: { s: 2 } });
    };
    facade(X0, -1); facade(X1, 1);
    // paredes laterais e parede das portas (no meio, mais alta a leste)
    for (const sz of [-1, 1]) { B.box(M.marbleWall, X1 - X0, H + 1.2, 1.2, (X0 + X1) / 2, Y, sz * (Wd / 2 + 0.2)); addBox((X0 + X1) / 2, sz * (Wd / 2 + 0.2), X1 - X0, 1.2, Y - 1, Y + H + 1); }
    const xm = X1 - 6;
    const doors = [[-6.6, 1.8], [-3.4, 2.6], [0, 4.2], [3.4, 2.6], [6.6, 1.8]];
    let zPrev = -Wd / 2;
    for (const [zc, w] of doors) { const z0 = zc - w / 2; if (z0 > zPrev) { B.box(M.marbleWall, 1.6, H + 1, z0 - zPrev, xm, Y, (zPrev + z0) / 2); addBox(xm, (zPrev + z0) / 2, 1.6, z0 - zPrev, Y - 1, Y + H); } zPrev = zc + w / 2; B.box(M.marbleWall, 1.6, H + 1 - (w > 3 ? 7.4 : 5.2), w, xm, Y + (w > 3 ? 7.4 : 5.2), zc); }
    B.box(M.marbleWall, 1.6, H + 1, Wd / 2 - zPrev, xm, Y, (zPrev + Wd / 2) / 2); addBox(xm, (zPrev + Wd / 2) / 2, 1.6, Wd / 2 - zPrev, Y - 1, Y + H);
    // passagem: duas filas de três colunas jônicas
    for (let i = 0; i < 3; i++) for (const sz of [-1, 1]) { const x = X0 + 4 + i * 4.2, z = sz * 3.0; B.geo(ionicColumn(H + 1.2, 0.52), M.colMarble, x, Y, z, { uv: { s: 1 } }); addCircle(x, z, 0.55, Y - 1, Y + H); }
    B.box(M.ceiling, X1 - X0, 0.4, Wd, (X0 + X1) / 2, Y + H + 1.2, 0);
    // telhado
    for (const s of [-1, 1]) B.geo(roofHalf(X1 - X0 + 3, Wd / 2 + 0.8, 2.5, 0.3), M.roofTiles, (X0 + X1) / 2, Y + H + 2.9 + 2.5, 0, { ry: s > 0 ? 0 : Math.PI, uv: { s: 1.6 } });
    // ala norte (Pinacoteca, sala dos quadros): três colunas dóricas menores e uma sala atrás
    {
      const ax = X0 + 2, az = -Wd / 2 - 9, ay = top(ax, az);
      B.box(M.marble, 16, 0.6, 12, ax, ay - 0.6, az);
      for (let i = 0; i < 3; i++) { const x = ax - 5.5, z = az - 3.5 + i * 3.5; B.geo(doricShaft(5.1, 0.5), M.colMarble, x, ay, z, { uv: { s: 1 } }); B.geo(doricCapital(0.5), M.colMarble, x, ay + 5.1, z); addCircle(x, z, 0.5, ay - 1, ay + 6); }
      B.box(M.marbleWall, 10, 6.2, 0.9, ax + 1.5, ay, az - 5.6); B.box(M.marbleWall, 10, 6.2, 0.9, ax + 1.5, ay, az + 5.6); B.box(M.marbleWall, 0.9, 6.2, 12, ax + 6.6, ay, az);
      B.box(M.marbleWall, 0.9, 6.2, 4.5, ax - 3.4, ay, az - 3.6); B.box(M.marbleWall, 0.9, 6.2, 4.5, ax - 3.4, ay, az + 3.6);
      addBox(ax + 1.5, az - 5.6, 10, 0.9, ay - 1, ay + 6.2); addBox(ax + 1.5, az + 5.6, 10, 0.9, ay - 1, ay + 6.2); addBox(ax + 6.6, az, 0.9, 12, ay - 1, ay + 6.2);
      B.box(M.marble, 16, 1.1, 12.6, ax, ay + 6.2, az);
      for (const s of [-1, 1]) B.geo(roofHalf(16.5, 6.6, 1.8, 0.3), M.roofTiles, ax, ay + 7.3 + 1.8, az, { ry: s > 0 ? 0 : Math.PI, uv: { s: 1.6 } });
      // pinturas nas paredes (o nome vem daí): quadros em painéis de madeira
      for (let i = 0; i < 4; i++) B.box(M.awning[i % 3], 1.6, 1.2, 0.05, ax - 1 + i * 2.2, ay + 2.2, az - 5.1);
      S.pinakotheke = new V3(ax + 1.5, ay, az);
    }
    // ala sul (inacabada): só as paredes, com andaimes de madeira
    {
      const ax = X0 + 3, az = Wd / 2 + 6, ay = top(ax, az);
      B.box(M.marble, 10, 0.6, 7, ax, ay - 0.6, az);
      B.box(M.marbleWall, 6, 3.6, 0.9, ax + 1.5, ay, az + 3);
      for (let i = 0; i < 3; i++) { const x = ax - 3.5, z = az - 2 + i * 2.5; B.geo(doricShaft(i === 2 ? 2.4 : 5.1, 0.5), M.colMarble, x, ay, z, { uv: { s: 1 } }); addCircle(x, z, 0.5, ay - 1, ay + 5); }
      scaffold(B, M, ax + 1.5, ay, az + 4.4, 7, 6);
    }
    scaffold(B, M, X0 - 1.8, Y, -Wd / 2 - 1.2, 4, 12);
    crane(B, M, X0 - 10, top(X0 - 10, -16), -16, 16);
    for (let i = 0; i < 9; i++) { const x = X0 - 14 + rr(-6, 8), z = rr(-24, -14), y = top(x, z); marbleBlock(B, M, x, y, z); }
    // escadaria do pórtico leste até o planalto (o piso dos Propileus fica abaixo do alto da rocha)
    { const run = 0.4; let n = 1, target = Y; for (; n < 30; n++) { target = top(X1 + 1 + n * run, 0); if (target <= Y + n * 0.2) break; }
      const rise = (top(X1 + 1 + n * run, 0) - Y) / n;
      for (let i = 0; i < n; i++) { const x = X1 + 1.2 + i * run, yt = Y + rise * (i + 1); B.box(M.marble, run + 0.02, yt - Y + 0.6, 12, x, Y - 0.6, 0); addBox(x, 0, run, 12, Y - 2, yt); } }
    out.zones.propileus = [X0 - 4, X1 + 2, -Wd / 2 - 2, Wd / 2 + 2];
    S.mnesicles = new V3(X0 - 8, top(X0 - 8, -12), -12);
  }
  // rampa de subida: calçada de terra batida e pedras até a entrada
  ribbon(B, M.road, [[-250, 4], [-205, 2], [-170, -1], [-140, 0], [-124, 0]], 9);
  // estátuas votivas e estelas no planalto
  for (const [x, z, m, h] of [[-48, 18, 'kore', 2.1], [-40, -20, 'kouros', 2.2], [52, -30, 'kore', 2.0], [-20, 34, 'zeus_bronze', 2.2], [-58, -24, 'kore', 2.0], [68, 34, 'doryphoros', 2.1], [-30, 40, 'kore', 1.9]]) {
    const y = top(x, z); B.box(M.colMarble, 1.2, 1.4, 1.2, x, y, z); addBox(x, z, 1.2, 1.2, y, y + 1.4);
    out.sculptures.push({ model: m, x, y: y + 1.4, z, ry: rand() * 6, length: h, optional: true });
  }
  out.zones.acropole = [-ACRO.a, ACRO.a, -ACRO.b, ACRO.b];
  out.exclusions.push([-135, 135, -70, 70]);

  // ---------------- encosta sul: teatro de Dioniso (bancos de madeira sobre terraços de terra), cena, templo
  {
    const T = THEATER, step = (T.r1 - T.r0) / T.rows;
    S.theater = new V3(T.x, T.y, T.z);
    // orquestra: círculo de terra batida com o altar de Dioniso (thymele) no centro
    const orch = new THREE.CircleGeometry(T.r0, 48); orch.rotateX(-Math.PI / 2);
    B.geo(orch, M.earth, T.x, T.y + 0.04, T.z);
    B.box(M.marble, 1.2, 0.9, 1.2, T.x, T.y, T.z); addBox(T.x, T.z, 1.2, 1.2, T.y, T.y + 0.9);
    for (let k = 0; k < T.rows; k++) {
      const r0 = T.r0 + k * step, r1 = r0 + step, y = T.y + 0.6 + k * 0.42;
      const g = new THREE.RingGeometry(r0, r1, 56, 1, Math.PI / 2 - 1.15, 2.3); g.rotateX(-Math.PI / 2);
      // anel de terra (degrau) com face vertical
      B.geo(g, M.earth, T.x, y, T.z);
      const face = new THREE.CylinderGeometry(r0, r0, 0.42, 56, 1, true, Math.PI - 1.15, 2.3);
      B.geo(face, M.earth, T.x, y - 0.21, T.z, { uv: { s: 3 } });
      // banco de madeira (ikria) na frente de cada degrau, em blocos separados pelas escadas
      if (k % 1 === 0) for (let w = 0; w < 7; w++) {
        const a0 = -1.1 + w * (2.2 / 7) + 0.03, a1 = a0 + 2.2 / 7 - 0.06;
        const bg = new THREE.RingGeometry(r0 + 0.05, r0 + 0.45, 8, 1, Math.PI / 2 - a1, a1 - a0); bg.rotateX(-Math.PI / 2);
        B.geo(bg, M.wood, T.x, y + 0.35, T.z, { uv: { s: 1 } });
      }
    }
    // muros de arrimo dos lados da cávea e da parte de trás
    for (const s of [-1, 1]) {
      const a = s * 1.17, dx = Math.sin(a), dz = -Math.cos(a);
      for (let k = 0; k < T.rows; k += 2) { const r = T.r0 + (k + 1) * step, y = T.y + 0.6 + k * 0.42; B.box(M.wallStone, 0.9, k * 0.42 + 1.4, step * 2 + 0.2, T.x + dx * r, T.y - 0.6, T.z + dz * r, { ry: Math.PI - a }); addBox(T.x + dx * r, T.z + dz * r, 1.2, 1.2, y - 3, y + 1); }
    }
    // cena: barracão de madeira com três portas, pintado como um palácio (cenografia)
    const sx = T.x, sz = T.z + T.r0 + 4.5;
    B.box(M.wood, 22, 6.5, 4, sx, T.y, sz); addBox(sx, sz, 22, 4, T.y, T.y + 6.5);
    B.box(M.awning[1], 21.6, 4, 0.08, sx, T.y + 1.2, sz - 2.05);
    B.box(M.darkWood, 22.6, 0.4, 4.6, sx, T.y + 6.5, sz);
    for (const dx of [-6, 0, 6]) B.box(M.darkWood, 2.2, 3.4, 0.1, sx + dx, T.y, sz - 2.1);
    S.skene = new V3(sx, T.y, sz - 4);
    out.zones.teatro = [T.x - T.r1, T.x + T.r1, T.z - T.r1, T.z + T.r0 + 8];
    // templo de Dioniso Eleutério, atrás da cena
    doricTemple(B, { M, x: T.x + 4, y: terrainHeight(T.x + 4, T.z + 32) - 0.2, z: T.z + 32, ry: 0, nf: 4, ns: 6, col: 0.9, h: 5, ic: 2.4, steps: 2, stepH: 0.35, stepW: 0.45, cella: { w: 6.5, d: 9, door: 2.2 } });
  }
  // ---------------- Odeon de Péricles: sala quadrada cheia de colunas e telhado em pirâmide (dizem que imitava a
  // tenda de Xerxes, tomada dos persas). Usado para os concursos de música das Panateneias.
  {
    const x = 102, z = 106, y = terrainHeight(x, z) - 0.2, Sd = 58, Hh = 9;
    B.box(M.poros, Sd + 2, 0.8, Sd + 2, x, y - 0.6, z);
    for (const [w, d, dx, dz] of [[Sd, 1.2, 0, -Sd / 2], [Sd, 1.2, 0, Sd / 2], [1.2, Sd, -Sd / 2, 0], [1.2, Sd, Sd / 2, 0]]) {
      if (dz === Sd / 2) { // fachada sul com pórtico e portas
        for (const s of [-1, 1]) { B.box(M.plaster, Sd / 2 - 3, Hh, 1.2, x + s * (Sd / 4 + 1.5), y + 0.2, z + dz); addBox(x + s * (Sd / 4 + 1.5), z + dz, Sd / 2 - 3, 1.2, y, y + Hh); }
        B.box(M.plaster, 6, Hh - 4.5, 1.2, x, y + 4.7, z + dz);
      } else { B.box(M.plaster, w, Hh, d, x + dx, y + 0.2, z + dz); addBox(x + dx, z + dz, w, d, y, y + Hh); }
    }
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      const cx = x - Sd / 2 + 4 + i * ((Sd - 8) / 8), cz = z - Sd / 2 + 4 + j * ((Sd - 8) / 8);
      B.geo(ionicColumn(Hh, 0.42), M.colMarble, cx, y + 0.2, cz, { uv: { s: 1 } }); addCircle(cx, cz, 0.45, y, y + Hh);
    }
    B.box(M.ceiling, Sd, 0.4, Sd, x, y + Hh + 0.2, z);
    const roof = new THREE.ConeGeometry(Sd * 0.74, 13, 4, 1, true); roof.rotateY(Math.PI / 4);
    B.geo(roof, M.tiles, x, y + Hh + 0.6 + 6.5, z, { uv: { s: 3 } });
    S.odeon = new V3(x, y, z + Sd / 2 + 3);
    out.zones.odeon = [x - Sd / 2, x + Sd / 2, z - Sd / 2, z + Sd / 2];
  }
  out.exclusions.push([-35, 165, 50, 160]);
}

// braseiro de bronze sobre tripé (aceso à noite)
export function brazier(B, M, out, x, y, z) {
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; B.box(M.bronze, 0.06, 1.1, 0.06, x + Math.cos(a) * 0.25, y, z + Math.sin(a) * 0.25, { rz: Math.cos(a) * 0.15, rx: -Math.sin(a) * 0.15 }); }
  const bowl = new THREE.CylinderGeometry(0.42, 0.22, 0.25, 14, 1, true);
  B.geo(bowl, M.bronze, x, y + 1.15, z, { uv: false });
  out.torches.push(new V3(x, y + 1.35, z));
}
// andaime de madeira encostado numa parede
function scaffold(B, M, x, y, z, w, h) {
  for (let i = 0; i <= Math.ceil(w / 2); i++) for (const dz of [0, 1.2]) B.box(M.wood, 0.14, h, 0.14, x - w / 2 + i * 2, y, z + dz);
  for (let k = 2; k < h; k += 2.2) B.box(M.wood, w, 0.08, 1.5, x, y + k, z + 0.6);
  for (let i = 0; i < Math.ceil(w / 2); i++) B.box(M.wood, 0.08, 0.08, 2.8, x - w / 2 + 1 + i * 2, y + h / 2, z + 0.6, { rx: 0.9 });
}
// guindaste de madeira com polia (as pedras eram içadas por cordas presas nas "orelhas" dos blocos)
function crane(B, M, x, y, z, h) {
  B.box(M.wood, 0.3, h, 0.3, x - 1.2, y, z, { rz: 0.08 });
  B.box(M.wood, 0.3, h, 0.3, x + 1.2, y, z, { rz: -0.08 });
  B.box(M.wood, 0.22, 7, 0.22, x, y + h - 1.5, z + 2.5, { rx: 1.1 });
  B.box(M.darkWood, 0.03, h - 3, 0.03, x, y + 3, z + 5.6);
  B.box(M.marble, 1.6, 0.9, 1.0, x, y + 2.1, z + 5.6);
  addBox(x, z, 3, 1, y, y + h);
}
// bloco de mármore recém-chegado das pedreiras do Pentélico, com as saliências para as cordas
function marbleBlock(B, M, x, y, z) {
  const w = rr(1.2, 2.2), h = rr(0.6, 1.0), d = rr(0.8, 1.3), ry = rr(0, 3);
  B.box(M.marble, w, h, d, x, y, z, { ry });
  for (const s of [-1, 1]) B.box(M.marble, 0.25, 0.25, 0.3, x + Math.cos(ry) * s * (w / 2 + 0.1), y + h / 2 - 0.12, z - Math.sin(ry) * s * (w / 2 + 0.1), { ry });
  addBox(x, z, w, w, y, y + h);
}
// faixa (rua, calçada) que acompanha o terreno, por uma lista de pontos [x, z], largura w
export function ribbon(B, mat, pts, w, lift = 0.06) {
  const pos = [], idx = [];
  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 2.5)); for (let k = 0; k < n; k++) dense.push([ax + (bx - ax) * (k / n), az + (bz - az) * (k / n)]); }
  dense.push(pts[pts.length - 1]);
  for (let i = 0; i < dense.length; i++) {
    const p = dense[i], q = dense[Math.min(i + 1, dense.length - 1)], o = dense[Math.max(i - 1, 0)];
    let tx = q[0] - o[0], tz = q[1] - o[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    const nx = -tz * w / 2, nz = tx * w / 2;
    for (const s of [1, -1]) { const x = p[0] + nx * s, z = p[1] + nz * s; pos.push(x, terrainHeight(x, z) + lift, z); }
    if (i < dense.length - 1) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  B.geo(g, mat, 0, 0, 0);
}
