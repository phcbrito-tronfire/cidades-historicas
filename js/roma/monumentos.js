// Mais Roma de Trajano: o aqueduto (Aqua Claudia) chegando do leste em arcos de tijolo até o Célio, as Termas de
// Trajano no Ópio (piscina, salões abobadados e o jardim do ginásio) e o Panteão em obras — o de Agripa queimou com
// um raio em 110; o novo, de cúpula de concreto, começou sob Trajano e só ficou pronto com Adriano, por volta de 125.
import * as THREE from 'three';
import { addBox, addCircle } from '../comum/collision.js';
import { terrainHeight } from './terrain.js';
import { rr } from '../comum/util.js';

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
    B.box(M.plasterOchre, 60, 18, 26, x, y, z - 22); addBox(x, z - 22, 60, 26, y - 1, y + 18);
    const vault = new THREE.CylinderGeometry(13, 13, 60, 24, 1, false, 0, Math.PI); vault.rotateZ(Math.PI / 2); vault.rotateX(Math.PI / 2);
    B.geo(vault, M.tiles, x, y + 18, z - 22);
    for (const s of [-1, 1]) { B.box(M.plasterOchre, 22, 12, 30, x + s * 40, y, z - 20); addBox(x + s * 40, z - 20, 22, 30, y - 1, y + 12); B.geo(new THREE.SphereGeometry(10, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.plaster, x + s * 40, y + 12, z - 20); }
    for (let i = 0; i < 8; i++) B.box(M.dark, 3, 5, 0.1, x - 26 + i * 7.4, y + 10, z - 8.95); // janelões
    for (let i = 0; i < 6; i++) B.box(M.dark, 2.4, 4, 0.1, x - 18 + i * 7.2, y, z - 8.95); // portas
    out.exclusions.push([x - W / 2 - 4, x + W / 2 + 4, z - D / 2 - 4, z + D / 2 + 4]);
    S.thermae = new V3(x, y, z + D / 2 + 4);
    out.zones.termas = [x - W / 2, x + W / 2, z - D / 2, z + D / 2];
  }
  // ---- Panteão em obras, no Campo de Marte: rotunda, a cúpula pela metade com andaimes, guindaste e o pórtico
  {
    const x = -330, z = -250, y = terrainHeight(x, z) - 0.3, R = 22, H = 22;
    B.geo(new THREE.CylinderGeometry(R, R, H, 48, 1, true), M.brick, x, y + H / 2, z);
    B.geo(new THREE.CylinderGeometry(R - 3, R - 3, H, 48, 1, true), M.plaster, x, y + H / 2, z);
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
    addCircle(x, z, R + 0.6, y - 1, y + H);
    out.exclusions.push([x - R - 14, x + R + 14, z - R - 26, z + R + 12]);
    S.pantheon = new V3(px, y, pz - 10);
  }
}
