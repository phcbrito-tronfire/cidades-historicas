// Artefatos colecionáveis de Vila Rica (Etapa 8): o objeto girando com o brilho e a coluna de luz, a ficha histórica
// ao pegar e a coleção (tecla K). Progresso salvo no navegador. Os brilhos ficam na camada 1 (fora da passada da sombra
// de contato, onde um sprite vira quadrado preto).
import * as THREE from 'three';
import { ARTIFACTS } from './artifacts-data.js';
import { groundAt, blocked, terrainAt } from '../comum/collision.js';
import { PLACES } from './terrain.js';

const SAVE = 'cidades-historicas:ouropreto:artefatos';
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...o });
const GOLD = std(0xe8b84a, { metalness: 1, roughness: 0.28 }), WOOD = std(0x6b4a2e, { roughness: 0.8 }), DARK = std(0x3a2616, { roughness: 0.7 }), IRON = std(0x3a3634, { metalness: 0.7, roughness: 0.45 });
const BRASS = std(0xc8a050, { metalness: 0.85, roughness: 0.35 }), PAPER = std(0xece2c8, { roughness: 0.9 }), SOAP = std(0x8a9488, { roughness: 0.75 }), LEATHER = std(0x8a6a44, { roughness: 0.85 });
const canvasTex = (fn, w = 128, h = 128) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const escrita = (fundo = '#ece2c8', tinta = 'rgba(50,30,15,.75)') => canvasTex((x, w, h) => { x.fillStyle = fundo; x.fillRect(0, 0, w, h); x.strokeStyle = tinta; x.lineWidth = 1; for (let y = 14; y < h - 10; y += 7) { x.beginPath(); x.moveTo(12, y); let px = 12; while (px < w - 14) { px += 3 + Math.random() * 4; x.lineTo(px, y + (Math.random() - 0.5) * 2); } x.stroke(); } });

function model(kind) {
  const g = new THREE.Group();
  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); if (s) m.scale.set(...s); m.castShadow = true; g.add(m); return m; };
  const lathe = (pts, mat, seg = 20, y = 0) => add(new THREE.LatheGeometry(pts.map(([r, yy]) => new THREE.Vector2(r, yy)), seg), mat, 0, y);
  switch (kind) {
    case 'bateia': lathe([[0, 0], [0.02, 0], [0.16, 0.06], [0.18, 0.07], [0.18, 0.078], [0.165, 0.075], [0.02, 0.012], [0, 0.012]], WOOD, 24); add(new THREE.SphereGeometry(0.008, 6, 4), GOLD, 0.015, 0.016, 0.01); break;
    case 'barra': add(new THREE.BoxGeometry(0.22, 0.04, 0.07), GOLD, 0, 0.05, 0); for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(0.01, 0.01, 0.004, 10), std(0xb8862a, { metalness: 1, roughness: 0.4 }), -0.06 + i * 0.06, 0.072, 0); add(new THREE.BoxGeometry(0.16, 0.002, 0.1), PAPER, 0.02, 0.003, 0.09); break;
    case 'balanca': add(new THREE.BoxGeometry(0.2, 0.02, 0.1), WOOD, 0, 0.01, 0); add(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 6), BRASS, 0, 0.13, 0); add(new THREE.BoxGeometry(0.24, 0.008, 0.008), BRASS, 0, 0.24, 0);
      for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.002, 0.002, 0.1, 4), BRASS, s * 0.115, 0.19, 0); add(new THREE.CylinderGeometry(0.045, 0.035, 0.012, 14), BRASS, s * 0.115, 0.14, 0); }
      for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.008 + k * 0.004, 0.008 + k * 0.004, 0.012 + k * 0.006, 8), BRASS, 0.05 + k * 0.03, 0.02 + (0.006 + k * 0.003), 0.03); break;
    case 'almocafre': add(new THREE.CylinderGeometry(0.014, 0.016, 0.36, 6), WOOD, 0, 0.02, 0, 0, 0, Math.PI / 2); add(new THREE.ConeGeometry(0.05, 0.14, 4), IRON, 0.2, 0.05, 0.03, 0.9, 0, -0.3); break;
    case 'candeia': lathe([[0, 0], [0.05, 0.01], [0.06, 0.03], [0.055, 0.045], [0, 0.04]], IRON, 14, 0.05); add(new THREE.ConeGeometry(0.012, 0.06, 6), IRON, 0.06, 0.08, 0, 0, 0, -1.2); add(new THREE.TorusGeometry(0.03, 0.004, 4, 10, Math.PI * 1.4), IRON, -0.04, 0.12, 0, 0, Math.PI / 2, 0); add(new THREE.CylinderGeometry(0.003, 0.003, 0.18, 4), IRON, -0.05, 0.2, 0, 0, 0, 0.3); break;
    case 'santo': { lathe([[0, 0], [0.06, 0], [0.065, 0.02], [0.05, 0.1], [0.06, 0.16], [0.045, 0.2], [0.03, 0.22], [0, 0.22]], SOAP, 16); add(new THREE.SphereGeometry(0.03, 12, 10), SOAP, 0, 0.25, 0); add(new THREE.BoxGeometry(0.1, 0.03, 0.08), SOAP, 0, 0.015, 0); add(new THREE.TorusGeometry(0.035, 0.004, 4, 14), SOAP, 0, 0.27, -0.01, 0.2, 0, 0); } break; // (a imagem com o manto, a cabeça e o resplendor)
    case 'talha': { const T = std(0xffffff, { map: canvasTex((x, w, h) => { x.fillStyle = '#c89838'; x.fillRect(0, 0, w, h); x.strokeStyle = '#8a6018'; x.lineWidth = 3; for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 8 + Math.random() * 14, 0, 4); x.stroke(); } }), metalness: 0.8, roughness: 0.3 });
      add(new THREE.SphereGeometry(0.05, 12, 10), T, 0, 0.18, 0); lathe([[0, 0], [0.06, 0.0], [0.05, 0.08], [0.035, 0.14], [0, 0.15]], T, 14); for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.06, 10, 6, 0, Math.PI), T, s * 0.07, 0.14, -0.02, 0, s * 0.8, 0, [0.4, 1.2, 0.8]); } break; // (o anjinho de asas abertas)
    case 'oratorio': add(new THREE.BoxGeometry(0.16, 0.26, 0.08), std(0x3a5a4a, { roughness: 0.6 }), 0, 0.13, 0); add(new THREE.BoxGeometry(0.12, 0.2, 0.01), GOLD, 0, 0.14, 0.036); add(new THREE.CylinderGeometry(0.018, 0.024, 0.11, 8), std(0xe8dcc8), 0, 0.12, 0.03); add(new THREE.SphereGeometry(0.014, 8, 6), std(0xd8b090), 0, 0.185, 0.03);
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.075, 0.22, 0.008), std(0x3a5a4a), s * 0.11, 0.14, 0.06, 0, s * 0.9, 0); add(new THREE.ConeGeometry(0.1, 0.06, 4), std(0x3a5a4a), 0, 0.29, 0, 0, Math.PI / 4, 0); add(new THREE.BoxGeometry(0.008, 0.05, 0.008), GOLD, 0, 0.34, 0); add(new THREE.BoxGeometry(0.03, 0.008, 0.008), GOLD, 0, 0.35, 0); break;
    case 'liras': { const P = std(0xffffff, { map: escrita(), roughness: 0.9 }); for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.16, 0.002, 0.22), P, (i % 2) * 0.01, 0.005 + i * 0.003, (i % 2) * 0.008, 0, i * 0.08, 0); add(new THREE.CylinderGeometry(0.003, 0.002, 0.18, 4), std(0xf4f0e6), 0.12, 0.02, 0, 0, 0.4, 1.4); } break; // (as folhas copiadas e a pena)
    case 'devassa': { const P = std(0xffffff, { map: escrita('#e2d4b0'), roughness: 0.9 }); add(new THREE.BoxGeometry(0.2, 0.06, 0.28), std(0xd8c8a0), 0, 0.03, 0); add(new THREE.BoxGeometry(0.19, 0.002, 0.27), P, 0, 0.062, 0); add(new THREE.BoxGeometry(0.008, 0.064, 0.28), std(0x8a2a20), -0.1, 0.032, 0); } break; // (o maço costurado com a fita)
    case 'moeda': add(new THREE.CylinderGeometry(0.06, 0.06, 0.008, 28), GOLD, 0, 0.1, 0, Math.PI / 2 - 0.3); add(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 20), std(0xd8a838, { metalness: 1, roughness: 0.4 }), 0, 0.1, 0, Math.PI / 2 - 0.3); break;
    case 'bruaca': add(new THREE.BoxGeometry(0.22, 0.26, 0.14), LEATHER, 0, 0.13, 0); add(new THREE.BoxGeometry(0.23, 0.04, 0.15), std(0x6a4a2a), 0, 0.27, 0); for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.03, 0.006, 4, 10), std(0x5a3a22), s * 0.08, 0.3, 0); break;
    case 'exvoto': add(new THREE.BoxGeometry(0.24, 0.18, 0.012), std(0xffffff, { map: canvasTex((x, w, h) => { x.fillStyle = '#d8c8a0'; x.fillRect(0, 0, w, h); x.fillStyle = '#7a9ab8'; x.fillRect(0, 0, w, 52); x.fillStyle = '#e8d8a8'; x.beginPath(); x.arc(96, 22, 14, 0, 7); x.fill(); x.fillStyle = '#5a3a28'; x.fillRect(10, 52, w - 20, 40); x.fillStyle = '#2a1a10'; x.fillRect(46, 60, 8, 24); x.fillRect(66, 64, 22, 8);
      x.fillStyle = '#f2ecdc'; x.fillRect(0, 96, w, 32); x.strokeStyle = 'rgba(40,20,10,.8)'; for (let y = 104; y < 124; y += 6) { x.beginPath(); x.moveTo(8, y); x.lineTo(w - 8, y); x.stroke(); } }), roughness: 0.8 }), 0, 0.1, 0, -0.2); break; // (a cena do perigo, o santo no céu e a legenda)
    case 'rosario': for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; add(new THREE.SphereGeometry(0.009, 6, 4), std(0x8a8a86, { roughness: 0.4 }), Math.cos(a) * 0.09, 0.01, Math.sin(a) * 0.07); } add(new THREE.CylinderGeometry(0.015, 0.015, 0.004, 10), BRASS, 0, 0.012, 0.1, Math.PI / 2); add(new THREE.BoxGeometry(0.006, 0.04, 0.004), BRASS, 0, 0.012, 0.13, Math.PI / 2); break;
    case 'partitura': add(new THREE.BoxGeometry(0.2, 0.004, 0.27), std(0xffffff, { map: canvasTex((x, w, h) => { x.fillStyle = '#ece2c8'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(40,20,10,.7)'; for (let s = 0; s < 6; s++) for (let l = 0; l < 5; l++) { const y = 12 + s * 19 + l * 2.5; x.beginPath(); x.moveTo(8, y); x.lineTo(w - 8, y); x.stroke(); }
      x.fillStyle = 'rgba(30,15,5,.85)'; for (let s = 0; s < 6; s++) for (let k = 0; k < 9; k++) { x.beginPath(); x.ellipse(16 + k * 12, 12 + s * 19 + ((k * 7) % 5) * 1.6, 2.2, 1.5, -0.4, 0, 7); x.fill(); } }), roughness: 0.9 }), 0, 0.01, 0); break;
    case 'instrucao': add(new THREE.BoxGeometry(0.2, 0.003, 0.26), std(0xffffff, { map: escrita('#efe6cc', 'rgba(30,20,40,.75)'), roughness: 0.9 }), 0, 0.005, 0); add(new THREE.CylinderGeometry(0.022, 0.022, 0.008, 14), std(0x9a1a14, { roughness: 0.4 }), 0.05, 0.01, -0.09); break; // (o papel e o lacre vermelho)
    case 'carumbe': lathe([[0, 0], [0.04, 0], [0.14, 0.12], [0.15, 0.13], [0.14, 0.135], [0.03, 0.01], [0, 0.01]], std(0xa88a58, { roughness: 1 }), 18); for (let i = 0; i < 6; i++) add(new THREE.DodecahedronGeometry(0.025), std(0x7a6a5a, { roughness: 1 }), Math.cos(i) * 0.06, 0.06, Math.sin(i) * 0.06); break;
    case 'tabuleiro': add(new THREE.BoxGeometry(0.3, 0.02, 0.22), WOOD, 0, 0.01, 0); for (const [w, d, x, z] of [[0.3, 0.015, 0, 0.11], [0.3, 0.015, 0, -0.11], [0.015, 0.22, 0.15, 0], [0.015, 0.22, -0.15, 0]]) add(new THREE.BoxGeometry(w, 0.035, d), WOOD, x, 0.03, z);
      const cores = [0xc89a58, 0xe8d8a8, 0x8a5a2a, 0xd8a03a]; for (let i = 0; i < 6; i++) add(new THREE.SphereGeometry(0.025, 8, 5), std(cores[i % 4], { roughness: 0.8 }), -0.09 + (i % 3) * 0.09, 0.04, -0.05 + Math.floor(i / 3) * 0.1, 0, 0, 0, [1.2, 0.6, 1.2]); break;
    case 'panela': lathe([[0, 0], [0.09, 0], [0.11, 0.03], [0.115, 0.1], [0.105, 0.11], [0.0, 0.11]], SOAP, 20); add(new THREE.TorusGeometry(0.12, 0.005, 4, 18, Math.PI), IRON, 0, 0.11, 0, 0, 0, 0); break;
    case 'mapa': add(new THREE.BoxGeometry(0.3, 0.004, 0.22), std(0xffffff, { map: canvasTex((x, w, h) => { x.fillStyle = '#e8dcb8'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(60,90,130,.85)'; x.lineWidth = 1.6; for (let k = 0; k < 4; k++) { x.beginPath(); let px = 10, py = 20 + k * 25; x.moveTo(px, py); for (let i = 0; i < 9; i++) { px += 13; py += (Math.random() - 0.5) * 14; x.lineTo(px, py); } x.stroke(); }
      x.fillStyle = '#8a2a1a'; for (let k = 0; k < 7; k++) { x.beginPath(); x.arc(15 + Math.random() * 100, 15 + Math.random() * 95, 2.5, 0, 7); x.fill(); } x.strokeStyle = '#6a4a2a'; x.lineWidth = 3; x.strokeRect(3, 3, w - 6, h - 6); }), roughness: 0.9 }), 0, 0.005, 0); add(new THREE.CylinderGeometry(0.015, 0.015, 0.23, 8), PAPER, -0.15, 0.015, 0, Math.PI / 2, 0, 0); break;
  }
  void DARK;
  return g;
}
function glowTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,190,1)'); gr.addColorStop(0.3, 'rgba(255,210,120,0.5)'); gr.addColorStop(1, 'rgba(255,200,100,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
// um ponto livre perto do desejado (em espiral), no chão da altura y0 (ou no terreno)
function freeSpot(x, z, y0) {
  for (let r = 0; r < 8; r += 0.5) for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, gy = groundAt(px, pz, y0 ?? terrainAt(px, pz) + 1.6); if (!blocked(px, pz, gy, 0.45)) return new THREE.Vector3(px, gy, pz); }
  return new THREE.Vector3(x, groundAt(x, z, y0 ?? terrainAt(x, z) + 1.6), z);
}

export class Artifacts {
  constructor(scene, city, ui, audio, onAll) {
    this.ui = ui; this.audio = audio; this.onAll = onAll; this.found = new Set();
    try { JSON.parse(localStorage.getItem(SAVE) || '[]').forEach((i) => this.found.add(i)); } catch (e) { /* sem armazenamento */ }
    const S = city.spots || {}, ch = (id) => (city.churches || []).find((q) => q.id === id), dentro = (id, d) => { const c = ch(id); const ix = -Math.sin(c.ry), iz = -Math.cos(c.ry); return [c.door[0] + ix * d, c.door[1] + iz * d, c.y + 0.4]; };
    const contos = city.houses.find((h) => Math.hypot(h.x + 277, h.z - 14) < 2), npc = (id, dx = 1.4, dz = 0.8) => { const p = S['npc_' + id]; return p ? [p[0] + dx, p[1] + dz] : [0, 0]; };
    const D = S.palacioDossel, PY = PLACES.palacio.y, B = city.minaBoca;
    const casa = city.houses.filter((h) => h.open && h.kind !== 'casebre').sort((a, b) => Math.hypot(a.x + 360, a.z - 60) - Math.hypot(b.x + 360, b.z - 60))[0];
    const W = {
      ribeirao: npc('faiscador_bento', 2, -1), contos_mesa: [S.contosEscritorio[0] + 0.4, S.contosEscritorio[1] + 1.2, contos.y + 0.4], contos_balcao: [contos.x - 3.4, contos.z + 5.4, contos.y + 0.4],
      queimada: [PLACES.queimada.x + 10, PLACES.queimada.z + 8], mina: [city.mina.fim[0] - 0.6, city.mina.fim[1] + 1.4, city.mina.y + 0.3], canteiro: npc('aleijadinho', -1.2, 1.6),
      pilar_dentro: dentro('pilar', 13), contos_salao: [S.contosSalao[0] + 2.5, S.contosSalao[1] + 1.5, contos.y + 3.6], gonzaga: npc('gonzaga', 1.6, 1.6),
      secretaria: [D[0] - 7.9, D[1] + 3.2, PY + 0.4], venda: npc('tiradentes', 1.8, 1.4), contos_largo: npc('tropeiro_joaquim', 1.5, -1.2), efigenia_dentro: dentro('efigenia', 11),
      rosario: npc('juiz', 1.6, -1.4), carmo_dentro: dentro('carmo', 9), gabinete: [S.palacioGabinete[0] + 1.6, S.palacioGabinete[1] + 2.2, PY + 4.9], gabinete2: [S.palacioGabinete[0] - 1.8, S.palacioGabinete[1] - 2.6, PY + 4.9],
      galeria_boca: B ? [B.x + Math.sin(B.face) * 3.4 + Math.cos(B.face) * 2, B.z + Math.cos(B.face) * 3.4 - Math.sin(B.face) * 2] : [0, 0], praca: npc('quitandeira_inacia', 1.6, 1.2), casa: casa ? [casa.inside[0], casa.inside[1], casa.y + 0.4] : [0, 0],
    };
    const gt = glowTex();
    this.glowMat = new THREE.SpriteMaterial({ map: gt, color: 0xffe2a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const beamGeo = new THREE.CylinderGeometry(0.04, 0.25, 7, 10, 1, true); beamGeo.translate(0, 3.5, 0);
    this.beamMat = new THREE.MeshBasicMaterial({ color: 0xffd88a, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.beamHi = this.beamMat.clone(); this.beamHi.opacity = 0.4; this.beamHi.color.set(0xffc850);
    const DENTRO = new Set(['contos_mesa', 'contos_balcao', 'contos_salao', 'secretaria', 'gabinete', 'gabinete2', 'pilar_dentro', 'efigenia_dentro', 'carmo_dentro', 'casa', 'mina']);
    this.items = ARTIFACTS.map((def) => {
      const w = W[def.where] || [0, 0], p = freeSpot(w[0], w[1], w[2]);
      const g = new THREE.Group(); g.position.copy(p);
      const m = model(def.kind); m.scale.setScalar(2.2); m.position.y = 0.25; g.add(m);
      const glow = new THREE.Sprite(this.glowMat); glow.scale.setScalar(1.6); glow.position.y = 0.55; g.add(glow);
      const beam = new THREE.Mesh(beamGeo, this.beamMat); g.add(beam); let top = null;
      if (DENTRO.has(def.where) && def.where !== 'mina') { beam.scale.set(1.8, 2.8, 1.8); beam.material = this.beamHi; top = new THREE.Sprite(this.glowMat); top.scale.setScalar(4); top.position.y = 16; g.add(top); } // (de dentro de um prédio, a luz passa do telhado: da rua se vê de onde ela sai)
      g.traverse((o) => { if (o.isSprite || o === beam) o.layers.set(1); });
      scene.add(g);
      const it = { def, g, m, beam, glow, top, base: p.y }; if (this.found.has(def.id)) g.visible = false; return it;
    });
    this.buildUI();
  }
  get count() { return this.found.size; }
  buildUI() {
    const css = document.createElement('style');
    css.textContent = `#art-card{position:fixed;inset:0;z-index:38;display:grid;place-items:center;background:rgba(8,5,2,.55);backdrop-filter:blur(3px);padding:16px}
      #art-card .box{width:min(720px,100%);color:#1d140c;border-radius:12px;padding:26px 30px;background:radial-gradient(ellipse at 20% 0%,#f8eed6,#efe0bd 55%,#e2cc9c);border:1px solid #b8914c;box-shadow:0 30px 80px rgba(0,0,0,.6);max-height:92vh;overflow:auto}
      #art-card .tag{font-family:Cinzel,serif;letter-spacing:.3em;text-transform:uppercase;font-size:.78rem;color:#8a5a14}
      #art-card h2{font-family:Cinzel,serif;font-size:1.9rem;margin:.2em 0 .1em;color:#3a2410}
      #art-card .era{font-style:italic;font-size:1.15rem;color:#6a4a20}
      #art-card p{font-size:1.25rem;line-height:1.45;margin:.8em 0}
      #art-card .mus{font-size:1.05rem;color:#5a4020;border-top:1px solid rgba(120,80,30,.3);padding-top:.6em}
      #art-card button,#art-col button{margin-top:1rem;padding:.75rem 1.4rem;border-radius:8px;border:1px solid #8a5a14;background:linear-gradient(180deg,#ffe39a,#e8b84a 60%,#b8832a);font-family:Cinzel,serif;font-weight:700;cursor:pointer}
      #art-col{position:fixed;inset:0;z-index:37;display:grid;place-items:center;background:rgba(8,5,2,.6);backdrop-filter:blur(3px);padding:16px}
      #art-col .box{width:min(960px,100%);max-height:90vh;overflow:auto;border-radius:12px;padding:22px;background:radial-gradient(ellipse at 20% 0%,#f8eed6,#efe0bd 55%,#e2cc9c);border:1px solid #b8914c;color:#1d140c}
      #art-col h2{font-family:Cinzel,serif;margin:0 0 .6em;color:#3a2410}
      #art-col .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
      #art-col .it{padding:10px 12px;border-radius:8px;border:1px solid rgba(120,80,30,.35);background:rgba(255,255,255,.35);cursor:pointer;font-size:1.05rem}
      #art-col .it b{font-family:Cinzel,serif;display:block;color:#3a2410}
      #art-col .it.no{opacity:.45;cursor:default}
      #art-count{position:absolute;top:70px;left:22px;font-size:1.05rem;text-shadow:0 1px 4px #000;color:#ffd98a}`;
    document.head.appendChild(css);
    this.card = document.createElement('div'); this.card.id = 'art-card'; this.card.hidden = true;
    this.card.innerHTML = '<div class="box"><div class="tag">Artefato descoberto</div><h2></h2><div class="era"></div><p class="st"></p><div class="mus"></div><button>Guardar na coleção (Enter)</button></div>';
    this.card.querySelector('button').onclick = () => this.closeCard(); document.body.appendChild(this.card);
    this.col = document.createElement('div'); this.col.id = 'art-col'; this.col.hidden = true; document.body.appendChild(this.col);
    this.counter = document.createElement('div'); this.counter.id = 'art-count'; document.getElementById('hud').appendChild(this.counter); this.updateCounter();
  }
  updateCounter() { this.counter.textContent = `Artefatos: ${this.found.size}/${ARTIFACTS.length}  ·  K coleção`; }
  get open() { return !this.card.hidden || !this.col.hidden; }
  showCard(def, fresh) { const c = this.card; c.querySelector('.tag').textContent = fresh ? `Artefato descoberto · ${this.found.size}/${ARTIFACTS.length}` : 'Coleção'; c.querySelector('h2').textContent = def.name; c.querySelector('.era').textContent = def.era; c.querySelector('.st').textContent = def.story; c.querySelector('.mus').textContent = def.museum; c.querySelector('button').textContent = fresh ? 'Guardar na coleção (Enter)' : 'Fechar (Enter)'; c.hidden = false; }
  closeCard() { this.card.hidden = true; }
  toggleCollection() {
    if (!this.col.hidden) { this.col.hidden = true; return; }
    const cells = ARTIFACTS.map((d, i) => (this.found.has(d.id) ? `<div class="it" data-i="${i}"><b>${d.name}</b>${d.era}</div>` : '<div class="it no"><b>???</b>Ainda não encontrado</div>')).join('');
    this.col.innerHTML = `<div class="box"><h2>Coleção de artefatos — ${this.found.size}/${ARTIFACTS.length}</h2><div class="grid">${cells}</div><button>Fechar (K)</button></div>`;
    this.col.querySelector('button').onclick = () => (this.col.hidden = true);
    this.col.querySelectorAll('.it[data-i]').forEach((el) => (el.onclick = () => { this.col.hidden = true; this.showCard(ARTIFACTS[+el.dataset.i], false); }));
    this.col.hidden = false;
  }
  key(e) {
    if (!this.card.hidden && (e.code === 'Enter' || e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Space')) { this.closeCard(); return true; }
    if (e.code === 'KeyK') { this.toggleCollection(); return true; }
    if (!this.col.hidden && e.code === 'Escape') { this.col.hidden = true; return true; }
    return false;
  }
  update(dt, t, player) {
    const p = player.pos;
    for (const it of this.items) {
      if (!it.g.visible) continue;
      const d2 = (it.g.position.x - p.x) ** 2 + (it.g.position.z - p.z) ** 2;
      it.beam.visible = d2 < 60 * 60 && d2 > 4; if (it.top) it.top.visible = d2 < 90 * 90 && d2 > 64;
      it.m.rotation.y = t * 0.8; it.m.position.y = 0.25 + Math.sin(t * 2 + it.base) * 0.05; it.glow.material.opacity = 0.6 + Math.sin(t * 3) * 0.25;
      if (d2 < 1.7 * 1.7 && Math.abs(it.g.position.y - p.y) < 2 && !player.swimming) {
        it.g.visible = false; this.found.add(it.def.id); try { localStorage.setItem(SAVE, JSON.stringify([...this.found])); } catch (e) { /* */ }
        this.audio.chime(); this.updateCounter(); this.showCard(it.def, true); if (this.found.size === ARTIFACTS.length) this.onAll?.();
      }
    }
  }
}
