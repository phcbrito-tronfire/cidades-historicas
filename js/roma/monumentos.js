// Mais Roma de Trajano: o aqueduto (Aqua Claudia) chegando do leste em arcos de tijolo até o Célio, as Termas de
// Trajano no Ópio (piscina, salões abobadados e o jardim do ginásio) e o Panteão em obras — o de Agripa queimou com
// um raio em 110; o novo, de cúpula de concreto, começou sob Trajano e só ficou pronto com Adriano, por volta de 125.
import * as THREE from 'three';
import { addBox, addCircle, addRotBox } from '../comum/collision.js';
import { terrainHeight } from './terrain.js';
import { rr } from '../comum/util.js';
import { getTextures } from './textures.js';

const V3 = THREE.Vector3;

// arco de tijolo: vão em arco pleno (largura w, altura h, espessura t) com o pilar à direita
function archShape(w, h, ow, oh) {
  const r = ow / 2, s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(-ow / 2, 0); s.lineTo(-ow / 2, oh - r); s.absarc(0, oh - r, r, Math.PI, 0, true); s.lineTo(ow / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
  return s;
}

export function buildMonuments(B, M, out) {
  const S = out.spots;
  // ---- aqueduto: do leste (borda do mapa) até o Célio, com o canal (specus) a altura constante
  {
    const pts = [[520, 330], [380, 300], [250, 255], [150, 215]], top = 30, span = 6.2;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / span), ry = Math.atan2(bx - ax, bz - az) + Math.PI / 2;
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, g = terrainHeight(x, z) - 0.5, h = top - g;
        if (h < 3) continue;
        const shape = archShape(span + 0.02, h, span * 0.62, Math.min(h - 2.5, h * 0.8));
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.6, bevelEnabled: false, curveSegments: 8 }); geo.translate(0, 0, -1.3);
        B.geo(geo, M.brick, x, g, z, { ry });
        addCircle(x + Math.sin(ry) * span / 2, z + Math.cos(ry) * span / 2, 1.2, g - 1, top);
      }
      // o canal no alto (com a água)
      const mx = (ax + bx) / 2, mz = (az + bz) / 2;
      B.box(M.travertine, 3, 1.4, L, mx, top, mz, { ry: ry - Math.PI / 2 });
      B.box(M.dark, 1.2, 0.05, L, mx, top + 1.36, mz, { ry: ry - Math.PI / 2 });
    }
    // a caixa d'água no fim (castellum) que distribui para as fontes e termas
    { const [x, z] = pts[pts.length - 1], g = terrainHeight(x, z) - 0.5; B.box(M.brick, 10, 31 - g, 10, x, g, z); addBox(x, z, 10, 10, g - 1, 31); }
    out.exclusions.push([140, 530, 200, 345]);
    S.aqueduct = new V3(250, terrainHeight(250, 262), 262);
  }
  // ---- Termas de Trajano: recinto com o prédio dos banhos (frigidário, tepidário, caldário), a natatio e o jardim
  {
    const x = 120, z = -175, y = terrainHeight(x, z) - 0.3, W = 120, D = 90;
    // muro do recinto com entrada ao sul
    for (const [w, d, dx, dz] of [[W, 2, 0, -D / 2], [2, D, -W / 2, 0], [2, D, W / 2, 0], [W / 2 - 8, 2, -W / 4 - 4, D / 2], [W / 2 - 8, 2, W / 4 + 4, D / 2]]) { B.box(M.brick, w, 7, d, x + dx, y, z + dz); addBox(x + dx, z + dz, w, d, y - 1, y + 7); }
    // piso do jardim (palestra) e a piscina grande, a céu aberto
    B.box(M.travertine2, W - 4, 0.4, D - 4, x, y - 0.2, z);
    B.box(M.marble, 46, 0.6, 22, x, y - 0.1, z + 18); B.box(M.water, 44, 0.05, 20, x, y + 0.45, z + 18);
    addBox(x, z + 18 - 11.5, 46, 1, y - 1, y + 0.6); addBox(x, z + 18 + 11.5, 46, 1, y - 1, y + 0.6); addBox(x - 23.5, z + 18, 1, 22, y - 1, y + 0.6); addBox(x + 23.5, z + 18, 1, 22, y - 1, y + 0.6);
    // o prédio dos banhos: salão alto com abóbada e as janelas, os dois blocos laterais e a cúpula do caldário
    // o prédio dos banhos, por dentro: no meio o frigidário (salão alto, piscina fria, colunas de granito, mosaico e
    // teto em caixotões), a oeste o caldário (piscina quente redonda e a boca da fornalha) e a leste o tepidário
    // (salão morno com bancos de mármore). Seis portas abertas para o jardim e uma passagem para cada ala.
    {
      const T = getTextures(), H = 18, t = 1.2, hx = x, hz = z - 22, W2 = 30, D2 = 13, F = hz + D2; // F = fachada (sul)
      const mosaic = new THREE.MeshStandardMaterial({ map: mosaicTex(), roughness: 0.6 }), ceil = new THREE.MeshStandardMaterial({ map: T.coffers, roughness: 0.8 });
      const wall = (mat, w, h, d, cx, cy, cz) => { B.box(mat, w, h, d, cx, cy, cz, { noGround: cy > y + 0.5 }); addBox(cx, cz, w, d, cy - 1, cy + h); };
      // fachada: seis portas de 2,4 × 4 m entre pilares, e a parede cheia por cima delas
      const doors = [0, 1, 2, 3, 4, 5].map((i) => hx - 18 + i * 7.2);
      let x0 = hx - W2; for (const dx of doors) { wall(M.plasterOchre, dx - 1.2 - x0, 4, t, (x0 + dx - 1.2) / 2, y, F - t / 2); x0 = dx + 1.2; } wall(M.plasterOchre, hx + W2 - x0, 4, t, (x0 + hx + W2) / 2, y, F - t / 2);
      B.box(M.plasterOchre, W2 * 2, H - 4, t, hx, y + 4, F - t / 2, { noGround: true }); addBox(hx, F - t / 2, W2 * 2, t, y + 4, y + H);
      for (const dx of doors) B.box(M.travertine, 2.8, 0.37, t + 0.1, dx, y + 3.98, F - t / 2, { noGround: true }); // vergas (2 cm abaixo da parede de cima: rentes, piscavam no alto de cada porta)
      wall(M.plasterOchre, W2 * 2, H, t, hx, y, hz - D2 + t / 2); // fundo
      // laterais do salão, com a passagem (3 × 5 m) para cada ala
      for (const s of [-1, 1]) { const wx = hx + s * (W2 - t / 2);
        wall(M.plasterOchre, t, H, 12, wx, y, hz - 7); wall(M.plasterOchre, t, H, 11, wx, y, hz + 7.5);
        B.box(M.plasterOchre, t, H - 5, 3, wx, y + 5, hz + 0.5, { noGround: true }); addBox(wx, hz + 0.5, t, 3, y + 5, y + H); }
      B.box(mosaic, W2 * 2 - t * 2, 0.12, D2 * 2 - t * 2, hx, y + 0.3, hz); // (registrada como piso: o chão do terreno fica por baixo)
      B.box(ceil, W2 * 2, 0.4, D2 * 2, hx, y + H - 0.4, hz, { noGround: true }); // teto em caixotões (por baixo da abóbada de telhas)
      // a piscina fria no meio do salão (borda de mármore: não se entra andando)
      { const pw = 20, pd = 7, pz = hz - 1.5;
        for (const [w, d, dx, dz] of [[pw, 0.5, 0, -pd / 2], [pw, 0.5, 0, pd / 2], [0.5, pd, -pw / 2, 0], [0.5, pd, pw / 2, 0]]) wall(M.marble, w, 0.75, d, hx + dx, y, pz + dz); // (0,75 m: com 0,6 o explorador subia na borda e andava sobre a água)
        B.box(M.water, pw - 0.5, 0.05, pd - 0.5, hx, y + 0.58, pz, { noGround: true }); }
      for (const cz of [hz + 7.5, hz - 9]) for (let i = 0; i < 7; i++) { const cx = hx - 24 + i * 8; B.geo(new THREE.CylinderGeometry(0.7, 0.8, H - 0.4, 14), M.granite, cx, y + (H - 0.4) / 2, cz, { uv: false }); addCircle(cx, cz, 0.8, y - 1, y + H); }
      out.lights.push({ pos: new V3(hx, y + 9, hz), color: 0xfff0d8, intensity: 9, dist: 40 });
      // as duas alas (22 × 30 m), ocas, com a cúpula por cima
      for (const s of [-1, 1]) {
        const cx = hx + s * 40, cz = z - 20, w = 22, d = 30, h = 12;
        wall(M.plasterOchre, t, h, d, cx + s * (w / 2 - t / 2), y, cz); // de fora
        wall(M.plasterOchre, w - t, h, t, cx - s * t / 2, y, cz + d / 2 - t / 2); wall(M.plasterOchre, w - t, h, t, cx - s * t / 2, y, cz - d / 2 + t / 2); // frente e fundo
        // o lado do salão: a parede de 13 m do salão grande já fecha o meio; nas pontas, o que sobra da ala
        wall(M.plasterOchre, t, h, 3.4, hx + s * (W2 - t / 2), y, hz + 14.7); // o trecho da ala que passa da fachada do salão
        B.box(mosaic, w - t * 2, 0.12, d - t * 2, cx, y + 0.3, cz); B.box(ceil, w, 0.4, d, cx, y + h - 0.4, cz, { noGround: true });
        out.lights.push({ pos: new V3(cx, y + 6, cz), color: s < 0 ? 0xffc890 : 0xffe6c0, intensity: 6, dist: 26 });
        if (s < 0) { // caldário: a piscina quente redonda e a boca da fornalha (o hipocausto aquecia o chão por baixo)
          B.geo(new THREE.CylinderGeometry(4.2, 4.2, 0.75, 28), M.marble, cx, y + 0.375, cz - 2); B.geo(new THREE.CylinderGeometry(3.8, 3.8, 0.05, 28), M.water, cx, y + 0.73, cz - 2); addCircle(cx, cz - 2, 4.2, y - 1, y + 0.75);
          B.box(M.brick, 3, 2.2, 1.2, cx - s * 0 - 8, y, cz + 12); B.box(new THREE.MeshBasicMaterial({ color: 0xff7a2a }), 1.6, 1.0, 0.1, cx - 8, y + 0.3, cz + 11.35); addBox(cx - 8, cz + 12, 3, 1.2, y - 1, y + 2.2);
        } else { // tepidário: bancos de mármore em volta
          for (const sz of [-1, 1]) { B.box(M.marble, 16, 0.45, 0.6, cx + 1, y, cz + sz * (d / 2 - t - 0.4)); addBox(cx + 1, cz + sz * (d / 2 - t - 0.4), 16, 0.6, y - 1, y + 0.45); }
          B.box(M.marble, 0.6, 0.45, 20, cx + s * (w / 2 - t - 0.4), y, cz); addBox(cx + s * (w / 2 - t - 0.4), cz, 0.6, 20, y - 1, y + 0.45);
        }
      }
      // os banhistas: conversando à beira da piscina fria, sentados no tepidário, no vapor do caldário
      out.bathPeople = [
        { kind: 'toga', x: hx - 6, z: hz + 3.2, ry: Math.PI, mode: 'talk', lines: ['Primeiro o tepidário, depois o caldário, e por fim um mergulho aqui no frio. É assim que se faz.', 'Aqui se fecham mais negócios do que no Fórum.'] },
        { kind: 'tunic', x: hx - 4.6, z: hz + 3.4, ry: Math.PI, mode: 'idle', lines: ['A entrada custa um quadrante: quase de graça. Até escravo vem às termas.'] },
        { kind: 'tunic', x: hx + 8, z: hz - 6.4, ry: 0, mode: 'talk', lines: ['Trajano mandou construir isto em cima da Domus Aurea de Nero. Dizem que os salões dele ainda estão aí embaixo.'] },
        { kind: 'toga', x: hx + 40 + 1, z: hz + 15.1, ry: Math.PI, mode: 'sit', lines: ['O segredo é não ter pressa: o corpo esquenta devagar aqui no tepidário.'] },
        { kind: 'tunic', x: hx + 40 - 4, z: hz - 11.1, ry: 0, mode: 'sit', lines: ['O chão é quente porque, por baixo, corre o ar da fornalha entre as pilhas de tijolo.'] },
        { kind: 'worker', x: hx - 48, z: hz + 12.4, ry: 0, mode: 'work', lines: ['Lenha, lenha e mais lenha. Se a fornalha apagar, o caldário esfria e o povo reclama.'] },
        { kind: 'tunic', x: hx - 40 + 4.6, z: z - 20 - 2, ry: -Math.PI / 2, mode: 'idle', lines: ['No caldário a gente sua e depois raspa a pele com o estrígil. Sai limpo como um bebê.'] },
      ];
    }
    const vault = new THREE.CylinderGeometry(13, 13, 60, 24, 1, false, 0, Math.PI); vault.rotateZ(Math.PI / 2); // meia-abóbada por cima do salão, eixo leste-oeste (girar também em x a deixava de lado, descendo por dentro do salão até 5 m do chão — a "linha vermelha")
    B.geo(vault, M.tiles, x, y + 18, z - 22);
    for (const s of [-1, 1]) { B.geo(new THREE.SphereGeometry(10, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.plaster, x + s * 40, y + 12, z - 20); }
    for (let i = 0; i < 8; i++) B.box(M.dark, 3, 5, 0.1, x - 26 + i * 7.4, y + 10, z - 8.95); // janelões
    out.exclusions.push([x - W / 2 - 4, x + W / 2 + 4, z - D / 2 - 4, z + D / 2 + 4]);
    S.thermae = new V3(x, y, z + D / 2 + 4);
    out.zones.termas = [x - W / 2, x + W / 2, z - D / 2, z + D / 2];
  }
  // ---- Panteão em obras, no Campo de Marte: rotunda, a cúpula pela metade com andaimes, guindaste e o pórtico
  {
    const x = -330, z = -250, y = terrainHeight(x, z) - 0.3, R = 22, H = 22;
    // a rotunda é oca: parede de 3 m de tijolo com a porta ao norte (para o pórtico), piso de mármore e, por dentro,
    // o canteiro da cúpula — o céu aparece pelo buraco que ainda falta fechar
    const dA = 0.16, t0 = Math.PI + dA, tL = Math.PI * 2 - dA * 2; // (no CylinderGeometry, θ = π aponta para -z: o norte)
    B.geo(new THREE.CylinderGeometry(R, R, H, 48, 1, true, t0, tL), M.brick, x, y + H / 2, z);
    B.geo(new THREE.CylinderGeometry(R - 3, R - 3, H, 48, 1, true, t0, tL), M.plaster, x, y + H / 2, z);
    for (const sd of [-1, 1]) { const a = Math.PI + sd * dA; B.box(M.brick, 0.3, H, 3.1, x + Math.sin(a) * (R - 1.5), y, z + Math.cos(a) * (R - 1.5), { noGround: true }); } // os lados da porta
    B.box(M.brick, 7.2, H - 9, 3.1, x, y + 9, z - R + 1.5, { noGround: true }); // em cima da porta (9 m de vão)
    B.geo(new THREE.CylinderGeometry(R - 3, R - 3, 0.4, 48), M.marble, x, y + 0.15, z); // o piso
    for (let i = 0; i < 48; i++) { // a colisão da parede, em gomos (menos na porta)
      const a = ((i + 0.5) / 48) * Math.PI * 2, ax = Math.sin(a), az = Math.cos(a);
      if (Math.abs(Math.atan2(ax, -az)) < dA) continue; // (vão livre de ~5,4 m)
      addRotBox(x + ax * (R - 1.5), z + az * (R - 1.5), 3.2, (R * Math.PI * 2) / 48 + 0.3, -Math.atan2(az, ax), y - 1, y + H, true);
    }
    // no meio, a torre de andaimes que segura o cimbramento da cúpula; pedras e a masseira; os operários
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { B.box(M.darkWood, 0.35, H + 4, 0.35, x + dx, y + 0.3, z + dz, { noGround: true }); addBox(x + dx, z + dz, 0.4, 0.4, y - 1, y + H + 4); }
    for (let lv = 1; lv <= 5; lv++) for (const sd of [-1, 1]) { B.box(M.wood, 6.4, 0.2, 0.25, x, y + lv * 4.4, z + sd * 3, { noGround: true }); B.box(M.wood, 0.25, 0.2, 6.4, x + sd * 3, y + lv * 4.4, z, { noGround: true }); }
    for (let k = 0; k < 4; k++) B.box(M.travertine2, 1.2, 0.6, 0.9, x - 8 + k * 1.4, y + 0.35, z + 9, { noGround: true });
    B.box(M.wood, 2.6, 0.9, 1.4, x + 9, y + 0.35, z + 7, { noGround: true });
    addBox(x - 5.9, z + 9, 5.4, 1, y - 1, y + 1); addBox(x + 9, z + 7, 2.6, 1.4, y - 1, y + 1.3);
    (out.bathPeople ||= []).push(
      { kind: 'worker', x: x + 9, z: z + 5.6, ry: 0, mode: 'work', lines: ['Cal, areia vulcânica de Putéolos e água: a argamassa que vira pedra. Lá no alto da cúpula vai pedra-pomes no lugar do tijolo, para pesar menos.'] },
      { kind: 'tunic', x: x - 5, z: z - 6, ry: Math.PI * 0.8, mode: 'talk', lines: ['O Panteão de Agripa queimou. O Imperador mandou fazer outro, redondo, com uma cúpula maior que qualquer outra. Dizem que no alto vai ficar um olho aberto para o céu.', 'Quando a cúpula fechar, caberia uma esfera inteira aqui dentro: a altura vai ser igual à largura.'] },
      { kind: 'worker', x: x + 2.2, z: z - 3.6, ry: Math.PI, mode: 'idle', lines: ['Cuidado com o andaime: amanhã sobem mais seis vigas para o cimbramento.'] });
    B.geo(new THREE.CylinderGeometry(R + 0.4, R + 0.4, 1, 48, 1, true), M.travertine, x, y + H, z);
    // a cúpula: anéis de concreto subindo (só a parte de baixo), o resto ainda em cimbramento de madeira
    for (let k = 0; k < 5; k++) { const a0 = (k / 10) * Math.PI / 2, a1 = ((k + 1) / 10) * Math.PI / 2; B.geo(new THREE.SphereGeometry(R, 48, 2, 0, Math.PI * 2, Math.PI / 2 - a1, a1 - a0), M.plaster, x, y + H, z); }
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; B.box(M.darkWood, 0.3, 14, 0.3, x + Math.cos(a) * (R - 6), y + H, z + Math.sin(a) * (R - 6), { rz: Math.cos(a) * 0.4, rx: -Math.sin(a) * 0.4 }); }
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; for (let lv = 0; lv < 5; lv++) B.box(M.wood, 0.2, 0.2, 5, x + Math.cos(a) * (R + 1.6), y + 4 + lv * 4.5, z + Math.sin(a) * (R + 1.6), { ry: -a }); B.box(M.darkWood, 0.25, H + 2, 0.25, x + Math.cos(a) * (R + 1.6), y, z + Math.sin(a) * (R + 1.6)); }
    // pórtico na frente (norte): 8 colunas de granito e o frontão
    const px = x, pz = z - R - 9;
    for (let i = 0; i < 8; i++) { const cx = px - 15 + i * (30 / 7); B.geo(new THREE.CylinderGeometry(0.75, 0.85, 14, 16), M.granite, cx, y + 7, pz - 5); addCircle(cx, pz - 5, 0.85, y - 1, y + 14); }
    B.box(M.marble, 33, 2, 14, px, y + 14, pz); B.box(M.tiles, 33, 0.4, 14, px, y + 16, pz);
    // guindaste de roda (movido por homens andando dentro da roda)
    B.box(M.darkWood, 0.4, 26, 0.4, x + R + 8, y, z + 6, { rz: -0.25 }); B.geo(new THREE.TorusGeometry(2.6, 0.2, 6, 20), M.darkWood, x + R + 10, y + 2.8, z + 6, { ry: Math.PI / 2 });

    out.exclusions.push([x - R - 14, x + R + 14, z - R - 26, z + R + 12]);
    S.pantheon = new V3(px, y, pz - 10);
  }
}

// mosaico de pedrinhas em preto e branco, com a borda de ondas (como os das termas de Óstia)
let MOS = null;
function mosaicTex() {
  if (MOS) return MOS;
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.fillStyle = '#ece4d2'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)'; x.fillRect(Math.random() * S, Math.random() * S, 6, 6); }
  x.strokeStyle = '#2a2622'; x.lineWidth = 10; x.strokeRect(24, 24, S - 48, S - 48);
  x.fillStyle = '#2a2622'; for (let k = 0; k < 8; k++) { x.beginPath(); x.arc(64 + k * 54, 64, 18, Math.PI, 0); x.fill(); x.beginPath(); x.arc(64 + k * 54, S - 64, 18, 0, Math.PI); x.fill(); }
  x.beginPath(); x.arc(S / 2, S / 2, 90, 0, 7); x.lineWidth = 8; x.stroke(); x.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; x.moveTo(S / 2, S / 2); x.lineTo(S / 2 + Math.cos(a) * 90, S / 2 + Math.sin(a) * 90); } x.lineWidth = 4; x.stroke();
  MOS = new THREE.CanvasTexture(c); MOS.wrapS = MOS.wrapT = THREE.RepeatWrapping; MOS.repeat.set(6, 3); MOS.colorSpace = THREE.SRGBColorSpace; return MOS;
}
