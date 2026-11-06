// Artefatos colecionáveis: modelo 3D com brilho e coluna de luz, ficha histórica ao coletar
// e painel de coleção (tecla K). Progresso salvo no navegador.
import * as THREE from 'three';
import { ARTIFACTS } from './artifacts-data.js';
import { groundAt, blocked, terrainAt } from '../comum/collision.js';
import { getTextures } from './textures.js';
import { FIELDS, STREET } from './terrain.js';

const SAVE = 'cidades-historicas:japao:artefatos';
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...o });
const GOLD = std(0xffc64a, { metalness: 1, roughness: 0.25 });
const FAI = std(0x2f9fb0, { roughness: 0.25 }); // faiança azul-turquesa
const LAPIS = std(0x1f3f8c, { roughness: 0.3 });
const CARN = std(0xb4402a, { roughness: 0.35 });
const MARBLE = std(0xf2ead8, { roughness: 0.6 });
const WOOD = std(0x6b4a2e, { roughness: 0.8 });
const BRONZE = std(0xb87333, { metalness: 0.9, roughness: 0.25 });
const CLAY = std(0xb4623a, { roughness: 0.85 });
const ALAB = std(0xefe6d4, { roughness: 0.3 });
const GREEN = std(0x2f6a4a, { roughness: 0.3 });

function model(kind) {
  const g = new THREE.Group();
  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); if (s) m.scale.set(...s); m.castShadow = true; g.add(m); return m;
  };
  const lathe = (pts, mat, seg = 18) => add(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);
  const T = getTextures();
  const RF = std(0xffffff, { map: T.redFigure, roughness: 0.3, side: THREE.DoubleSide });
  const BF = std(0xc0683a, { roughness: 0.4, side: THREE.DoubleSide });
  const LAC = std(0x1a1210, { roughness: 0.25 }), RED = std(0xb8261e, { roughness: 0.5 }), SILK = std(0x2a3a6a, { roughness: 0.8 }), PAPER = std(0xf2ead6, { roughness: 0.9 }), BAMBOO = std(0xc8b070, { roughness: 0.7 }), COPPER = std(0xa8683a, { metalness: 0.8, roughness: 0.4 }), LAVA = std(0x5a3a32, { roughness: 1 });
  const canvasTex = (fn, w = 128, h = 128) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  switch (kind) {
    case 'katana': { // a katana deitada no suporte de madeira
      add(new THREE.BoxGeometry(0.62, 0.025, 0.03), LAC, 0, 0.06, 0, 0, 0, 0.05); add(new THREE.CylinderGeometry(0.055, 0.055, 0.01, 16), std(0x3a3228, { metalness: 0.7 }), -0.33, 0.07, 0, 0, 0, Math.PI / 2);
      add(new THREE.BoxGeometry(0.22, 0.03, 0.032), SILK, -0.45, 0.075, 0, 0, 0, 0.05); for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.012, 0.034, 0.036), std(0x14141a), -0.38 - i * 0.03, 0.075, 0, 0, 0, 0.6);
      add(new THREE.BoxGeometry(0.62, 0.02, 0.02), std(0x6a5a40), 0.05, 0.0, 0.1); } break;
    case 'yoroi': { const P = std(0x2a2a30, { roughness: 0.3, metalness: 0.3 });
      for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.13 - i * 0.005, 0.135 - i * 0.005, 0.06, 18, 1, true), P, 0, 0.18 + i * 0.065, 0, 0, 0, 0, [1, 1, 0.8]);
      for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(0.1, 0.04, 0.012), P, sd * 0.17, 0.42 - k * 0.045, 0, 0, 0, sd * 0.3);
      for (let k = 0; k < 5; k++) add(new THREE.BoxGeometry(0.05, 0.12, 0.012), P, -0.1 + k * 0.05, 0.1, 0.11);
      add(new THREE.SphereGeometry(0.09, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), P, 0, 0.5, 0); add(new THREE.BoxGeometry(0.2, 0.012, 0.15), P, 0, 0.5, 0.02); add(new THREE.ConeGeometry(0.05, 0.08, 3), std(0xd8a84a, { metalness: 0.9 }), 0, 0.6, 0.07);
      for (let i = 0; i < 8; i++) add(new THREE.BoxGeometry(0.003, 0.25, 0.005), RED, -0.1 + i * 0.03, 0.3, 0.11); } break;
    case 'ukiyoe': add(new THREE.BoxGeometry(0.24, 0.36, 0.006), std(0xffffff, { map: canvasTex((x, w, h) => { x.fillStyle = '#efe4c8'; x.fillRect(0, 0, w, h); x.fillStyle = '#c84a2a'; x.fillRect(20, 30, 90, 120); x.fillStyle = '#1a1a22'; x.beginPath(); x.arc(64, 40, 18, 0, 7); x.fill(); x.fillStyle = '#e8d0b0'; x.beginPath(); x.ellipse(64, 50, 12, 15, 0, 0, 7); x.fill(); x.strokeStyle = '#1a1a22'; x.lineWidth = 2; x.beginPath(); x.moveTo(56, 48); x.lineTo(62, 46); x.moveTo(66, 46); x.lineTo(72, 48); x.stroke(); x.fillStyle = '#2a4a6a'; for (let i = 0; i < 6; i++) x.fillRect(25 + i * 14, 80, 7, 60); x.fillStyle = '#1a1a22'; x.font = 'bold 14px serif'; x.fillText('勝川', 90, 182); }, 128, 192), roughness: 0.8 }), 0, 0.2, 0, -0.15); break;
    case 'chawan': lathe([[0.0, 0], [0.04, 0.0], [0.05, 0.02], [0.1, 0.05], [0.115, 0.12], [0.112, 0.125], [0.1, 0.06], [0.0, 0.03]], std(0x3a2a22, { roughness: 0.35 }), 20); add(new THREE.TorusGeometry(0.113, 0.006, 6, 20), std(0xa87a4a, { roughness: 0.3 }), 0, 0.122, 0, Math.PI / 2); break;
    case 'omamori': add(new THREE.BoxGeometry(0.09, 0.14, 0.02), std(0xb8261e, { roughness: 0.6 }), 0, 0.09, 0); add(new THREE.BoxGeometry(0.06, 0.05, 0.022), std(0xd8b04a, { metalness: 0.6 }), 0, 0.09, 0); add(new THREE.TorusGeometry(0.03, 0.004, 4, 10), std(0xf2ead6), 0, 0.17, 0); break;
    case 'juzu': for (let i = 0; i < 36; i++) { const an = (i / 36) * Math.PI * 2; add(new THREE.SphereGeometry(0.012, 6, 4), std(0x5a3a22, { roughness: 0.4 }), Math.cos(an) * 0.11, 0.015, Math.sin(an) * 0.08); } add(new THREE.ConeGeometry(0.02, 0.06, 6), std(0x8a2a5a), 0.11, 0.015, 0.08, 0, 0, Math.PI / 2); break;
    case 'zue': add(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), std(0xf0e6cc, { roughness: 0.8 }), 0, 0.03, 0, 0, 0, Math.PI / 2); for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.03, 0.005, 0.03), std(0x3a2010), -0.3 + i * 0.1, 0.051, 0); add(new THREE.SphereGeometry(0.02, 8, 6), std(0xc8a040, { metalness: 0.8 }), 0.42, 0.03, 0); break;
    case 'dochuki': add(new THREE.BoxGeometry(0.3, 0.008, 0.2), std(0xffffff, { map: canvasTex((x, w, h) => { x.fillStyle = '#efe4c8'; x.fillRect(0, 0, w, h); x.fillStyle = '#4a5a7a'; x.beginPath(); x.moveTo(20, 110); x.quadraticCurveTo(60, 30, 64, 20); x.quadraticCurveTo(70, 30, 108, 110); x.fill(); x.fillStyle = '#f4f4f8'; x.beginPath(); x.moveTo(52, 45); x.lineTo(64, 20); x.lineTo(76, 45); x.fill(); x.strokeStyle = '#b8261e'; x.lineWidth = 2; x.beginPath(); x.moveTo(64, 120); for (let k = 0; k < 8; k++) x.lineTo(56 + (k % 2) * 16, 110 - k * 10); x.stroke(); x.fillStyle = '#1a1a22'; x.font = '10px serif'; x.fillText('吉田口', 4, 12); }), roughness: 0.9 }), 0, 0.01, 0); break;
    case 'kuwa': add(new THREE.CylinderGeometry(0.014, 0.014, 0.6, 6), WOOD, 0, 0.02, 0, 0, 0, Math.PI / 2); add(new THREE.BoxGeometry(0.12, 0.012, 0.14), std(0x4a4a4c, { metalness: 0.6 }), 0.31, 0.03, 0.04, 0, 0, 0.3); add(new THREE.TorusGeometry(0.09, 0.008, 4, 12, Math.PI * 0.8), std(0x6a6a6e, { metalness: 0.7 }), -0.05, 0.02, 0.2, Math.PI / 2); add(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), WOOD, -0.15, 0.02, 0.2, 0, 0, Math.PI / 2); break;
    case 'chasen': { for (let i = 0; i < 16; i++) { const an = (i / 16) * Math.PI * 2; add(new THREE.CylinderGeometry(0.002, 0.003, 0.07, 3), BAMBOO, Math.cos(an) * 0.022, 0.05, Math.sin(an) * 0.022, Math.sin(an) * 0.25, 0, -Math.cos(an) * 0.25); }
      add(new THREE.CylinderGeometry(0.012, 0.014, 0.09, 8), BAMBOO, 0, 0.12, 0); add(new THREE.CylinderGeometry(0.045, 0.045, 0.07, 18), LAC, 0.12, 0.035, 0); add(new THREE.CylinderGeometry(0.046, 0.046, 0.012, 18), std(0xd8a84a, { metalness: 0.8 }), 0.12, 0.072, 0); } break;
    case 'coin': add(new THREE.CylinderGeometry(0.09, 0.09, 0.016, 28), COPPER, 0, 0.1, 0, Math.PI / 2 - 0.3); add(new THREE.BoxGeometry(0.035, 0.035, 0.03), std(0x15100c), 0, 0.1, 0, -0.3); for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(0.02, 0.025, 0.004), std(0x6a3a1a), Math.cos(k * Math.PI / 2) * 0.055, 0.1 + Math.sin(k * Math.PI / 2) * 0.052, 0.012); break;
    case 'inro': for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.1, 0.035, 0.035), LAC, 0, 0.03 + i * 0.037, 0); add(new THREE.BoxGeometry(0.06, 0.08, 0.002), std(0xd8a84a, { metalness: 0.9 }), 0, 0.09, 0.019); add(new THREE.CylinderGeometry(0.002, 0.002, 0.2, 3), RED, 0, 0.25, 0); add(new THREE.SphereGeometry(0.03, 10, 8), std(0xeee6d0, { roughness: 0.4 }), 0, 0.37, 0, 0, 0, 0, [1, 0.8, 1]); break;
    case 'ema': add(new THREE.BoxGeometry(0.22, 0.14, 0.012), std(0xffffff, { map: canvasTex((x, w, h) => { x.fillStyle = '#d8b88a'; x.fillRect(0, 0, w, h); x.fillStyle = '#4a5a7a'; x.beginPath(); x.moveTo(10, 90); x.quadraticCurveTo(55, 30, 64, 22); x.quadraticCurveTo(73, 30, 118, 90); x.fill(); x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(52, 38); x.lineTo(64, 22); x.lineTo(76, 38); x.fill(); x.fillStyle = '#b8261e'; x.beginPath(); x.arc(100, 24, 10, 0, 7); x.fill(); x.fillStyle = '#1a1a22'; x.font = '12px serif'; x.fillText('富士講', 8, 120); }), roughness: 0.8 }), 0, 0.16, 0); add(new THREE.TorusGeometry(0.03, 0.003, 4, 8, Math.PI), RED, 0, 0.24, 0); break;
    case 'lava': { const g2 = new THREE.DodecahedronGeometry(0.13, 1), p = g2.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.8 + ((i * 37) % 11) / 30; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k); } g2.computeVertexNormals(); add(g2, LAVA, 0, 0.1, 0); } break;
    case 'soroban': add(new THREE.BoxGeometry(0.36, 0.02, 0.14), WOOD, 0, 0.01, 0); add(new THREE.BoxGeometry(0.36, 0.024, 0.012), WOOD, 0, 0.022, 0.025); for (let i = 0; i < 9; i++) { add(new THREE.CylinderGeometry(0.003, 0.003, 0.13, 3), BAMBOO, -0.16 + i * 0.04, 0.03, 0, Math.PI / 2); for (let k = 0; k < 4; k++) add(new THREE.SphereGeometry(0.012, 6, 4), std(0x2a1a10, { roughness: 0.4 }), -0.16 + i * 0.04, 0.03, -0.045 + k * 0.022 + (k ? 0.012 : 0), 0, 0, 0, [1, 0.6, 1]); } break;
    case 'masu': { const C3 = std(0xd8b88a, { roughness: 0.8 }); add(new THREE.BoxGeometry(0.18, 0.012, 0.18), C3, 0, 0.006, 0); for (const [w, dd, x, z] of [[0.18, 0.012, 0, 0.084], [0.18, 0.012, 0, -0.084], [0.012, 0.18, 0.084, 0], [0.012, 0.18, -0.084, 0]]) add(new THREE.BoxGeometry(w, 0.1, dd), C3, x, 0.05, z);
      add(new THREE.BoxGeometry(0.16, 0.06, 0.16), std(0xf2efe6, { roughness: 1 }), 0, 0.06, 0); add(new THREE.BoxGeometry(0.2, 0.03, 0.14), PAPER, 0.24, 0.015, 0); add(new THREE.BoxGeometry(0.2, 0.004, 0.02), std(0x2a3a6a), 0.24, 0.032, -0.05); } break;
  }
  void MARBLE; void FAI; void LAPIS; void CARN; void ALAB; void GREEN; void RF; void BF; void GOLD; void CLAY; void BRONZE;
  return g;
}

function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,240,190,1)'); gr.addColorStop(0.3, 'rgba(255,210,120,0.5)'); gr.addColorStop(1, 'rgba(255,200,100,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// encontra um ponto livre perto do desejado (em espiral)
function freeSpot(x, z, y0 = 50) {
  for (let r = 0; r < 12; r += 0.6) for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
    const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    const gy = groundAt(px, pz, y0 >= 50 ? terrainAt(px, pz) + 1.6 : y0);
    if (!blocked(px, pz, gy, 0.5)) return new THREE.Vector3(px, gy, pz);
  }
  return new THREE.Vector3(x, groundAt(x, z, y0 >= 50 ? terrainAt(x, z) + 1.6 : y0), z);
}

export class Artifacts {
  constructor(scene, city, ui, audio, onAll) {
    this.ui = ui; this.audio = audio; this.onAll = onAll;
    this.found = new Set();
    try { JSON.parse(localStorage.getItem(SAVE) || '[]').forEach((i) => this.found.add(i)); } catch (e) { /* sem armazenamento */ }
    const S = city.spots, at = (v, dx = 0, dz = 0, y0 = 50) => (v ? [v.x + dx, v.z + dz, y0] : [0, 0, 50]);
    const lift = (v, dx, dz) => (v ? [v.x + dx, v.z + dz, v.y + 1] : [0, 0, 50]);
    const house = (kind, i = 0) => city.houses.filter((h) => h.kind === kind)[i];
    const inside = (h) => (h ? [h.room[0], h.room[1], h.floor + 0.5] : [0, 0, 50]);
    const W = {
      dojo: S.dojo ? [S.dojo.x + 3, S.dojo.z - 2, S.dojo.y + 0.5] : [0, 0, 50], audience: S.audience ? [S.audience.x + 1, S.audience.z + 2, S.audience.y + 0.5] : [0, 0, 50],
      printshop: inside(house('shop', 6)), potter: at(S.npc_oleiro, 1.2, 0.8), omamori: at(S.omamori, 0, 0.5), hondo: S.hondo ? [S.hondo.x, S.hondo.z, S.hondo.y + 0.5] : [0, 0, 50],
      station5: city.stations[3] ? [city.stations[3].bench[0] + 1, city.stations[3].bench[1], 50] : [0, 0, 50], oshiroom: inside(house('oshi', 4)),
      fields: [FIELDS.x0 - 2.5, (FIELDS.z0 + FIELDS.z1) / 2 + 12, 50], teahouse: at(S.npc_chaya, 1.5, 1.2), street: [STREET.x + 2, -205, 50], inn: inside(house('inn', 2)),
      emarack: at(S.omamori, -22, 0), summit: S.okumiya ? [S.okumiya.x - 4, S.okumiya.z - 2, 50] : [0, 0, 50], office: inside(house('lord', 0)),
      kura: S.garden ? [S.garden.x - 10, S.garden.z + 6, 50] : [0, 0, 50],
    };

    const gt = glowTex();
    this.glowMat = new THREE.SpriteMaterial({ map: gt, color: 0xffe2a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const beamGeo = new THREE.CylinderGeometry(0.04, 0.25, 7, 10, 1, true); beamGeo.translate(0, 3.5, 0);
    this.beamMat = new THREE.MeshBasicMaterial({ color: 0xffd88a, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.beamHi = this.beamMat.clone(); this.beamHi.opacity = 0.4; this.beamHi.color.set(0xffc850); // (a luz que sai de dentro das casas: mais forte, para se ver de dia)
    this.items = ARTIFACTS.map((def) => {
      const w = W[def.where] || [0, 0, 50];
      const p = w[2] === 'fundo' ? new THREE.Vector3(w[0], terrainAt(w[0], w[1]) + 0.1, w[1]) : freeSpot(w[0], w[1], w[2]);
      const g = new THREE.Group(); g.position.copy(p);
      const m = model(def.kind); m.scale.setScalar(2.2); m.position.y = 0.25; g.add(m);
      const glow = new THREE.Sprite(this.glowMat); glow.scale.setScalar(1.6); glow.position.y = 0.55; g.add(glow);
      const beam = new THREE.Mesh(beamGeo, this.beamMat); g.add(beam); let top = null;
      // dentro de casa a coluna de luz sobe até passar do telhado: da rua se vê de qual casa ela sai (antes ficava escondida)
      if (['oshiroom', 'inn', 'printshop', 'office'].includes(def.where)) {
        beam.scale.set(1.8, 2.8, 1.8); beam.material = this.beamHi;
        top = new THREE.Sprite(this.glowMat); top.scale.setScalar(4); top.position.y = 15; g.add(top); /* um brilho acima do telhado */
      }
      g.traverse((o) => { if (o.isSprite || o === beam) o.layers.set(1); });
      scene.add(g);
      const it = { def, g, m, beam, glow, top, base: p.y };
      if (this.found.has(def.id)) g.visible = false;
      return it;
    });
    this.buildUI();
  }

  get count() { return this.found.size; }

  buildUI() {
    const css = document.createElement('style');
    css.textContent = `
      #art-card{position:fixed;inset:0;z-index:38;display:grid;place-items:center;background:rgba(8,5,2,.55);backdrop-filter:blur(3px);padding:16px}
      #art-card .box{width:min(720px,100%);color:#1d140c;border-radius:12px;padding:26px 30px;background:radial-gradient(ellipse at 20% 0%,#f8eed6,#efe0bd 55%,#e2cc9c);border:1px solid #b8914c;box-shadow:0 30px 80px rgba(0,0,0,.6)}
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
    this.card.querySelector('button').onclick = () => this.closeCard();
    document.body.appendChild(this.card);
    this.col = document.createElement('div'); this.col.id = 'art-col'; this.col.hidden = true;
    document.body.appendChild(this.col);
    const hud = document.getElementById('hud');
    this.counter = document.createElement('div'); this.counter.id = 'art-count'; hud.appendChild(this.counter);
    this.updateCounter();
  }
  updateCounter() { this.counter.textContent = `Artefatos: ${this.found.size}/${ARTIFACTS.length}  ·  K coleção`; }
  get open() { return !this.card.hidden || !this.col.hidden; }

  showCard(def, fresh) {
    this.card.querySelector('.tag').textContent = fresh ? `Artefato descoberto · ${this.found.size}/${ARTIFACTS.length}` : 'Coleção';
    this.card.querySelector('h2').textContent = def.name;
    this.card.querySelector('.era').textContent = def.era;
    this.card.querySelector('.st').textContent = def.story;
    this.card.querySelector('.mus').textContent = def.museum;
    this.card.querySelector('button').textContent = fresh ? 'Guardar na coleção (Enter)' : 'Fechar (Enter)';
    this.card.hidden = false;
  }
  closeCard() { this.card.hidden = true; }
  // ficha genérica (ex.: ao entrar numa casa visitável)
  showInfo({ tag, name, era, story, foot }) {
    this.card.querySelector('.tag').textContent = tag;
    this.card.querySelector('h2').textContent = name;
    this.card.querySelector('.era').textContent = era || '';
    this.card.querySelector('.st').textContent = story;
    this.card.querySelector('.mus').textContent = foot || '';
    this.card.querySelector('button').textContent = 'Continuar (Enter)';
    this.card.hidden = false;
  }
  toggleCollection() {
    if (!this.col.hidden) { this.col.hidden = true; return; }
    const cells = ARTIFACTS.map((d, i) => this.found.has(d.id)
      ? `<div class="it" data-i="${i}"><b>${d.name}</b>${d.era}</div>`
      : `<div class="it no"><b>???</b>Ainda não encontrado</div>`).join('');
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
      it.m.rotation.y = t * 0.8;
      it.m.position.y = 0.25 + Math.sin(t * 2 + it.base) * 0.05;
      it.glow.material.opacity = 0.6 + Math.sin(t * 3) * 0.25;
      if (d2 < 1.7 * 1.7 && Math.abs(it.g.position.y - p.y) < 2 && (!player.swimming || (it.def.underwater && player.diving))) {
        it.g.visible = false;
        this.found.add(it.def.id);
        try { localStorage.setItem(SAVE, JSON.stringify([...this.found])); } catch (e) { /* */ }
        this.audio.chime();
        this.updateCounter();
        this.showCard(it.def, true);
        if (this.found.size === ARTIFACTS.length) this.onAll?.();
        this.onFound?.(it.def);
      }
    }
  }
}
