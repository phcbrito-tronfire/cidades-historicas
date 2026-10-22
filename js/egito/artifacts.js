// Artefatos colecionáveis: modelo 3D com brilho e coluna de luz, ficha histórica ao coletar
// e painel de coleção (tecla K). Progresso salvo no navegador.
import * as THREE from 'three';
import { ARTIFACTS } from './artifacts-data.js';
import { groundAt, blocked, terrainAt } from './collision.js';
import { riverX, LAKE } from './terrain.js';

const SAVE = 'cidades-historicas:egito:artefatos:v1';
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...o });
const GOLD = std(0xffc64a, { metalness: 1, roughness: 0.25 });
const FAI = std(0x2f9fb0, { roughness: 0.25 }); // faiança azul-turquesa
const LAPIS = std(0x1f3f8c, { roughness: 0.3 });
const CARN = std(0xb4402a, { roughness: 0.35 });
const STONE = std(0xd9cdb4, { roughness: 0.9 });
const WOOD = std(0x6b4a2e, { roughness: 0.8 });
const BRONZE = std(0xb87333, { metalness: 0.9, roughness: 0.25 });
const CLAY = std(0xa8865c, { roughness: 1 });
const ALAB = std(0xefe6d4, { roughness: 0.3 });
const GREEN = std(0x2f6a4a, { roughness: 0.3 });

function model(kind) {
  const g = new THREE.Group();
  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); if (s) m.scale.set(...s); m.castShadow = true; g.add(m); return m;
  };
  switch (kind) {
    case 'scarab': add(new THREE.SphereGeometry(0.1, 16, 12), GREEN, 0, 0.06, 0, 0, 0, 0, [1, 0.55, 1.35]); add(new THREE.SphereGeometry(0.05, 12, 8), GREEN, 0, 0.06, 0.13, 0, 0, 0, [1.3, 0.6, 0.8]); add(new THREE.BoxGeometry(0.006, 0.02, 0.2), GOLD, 0, 0.11, 0); break;
    case 'stela': add(new THREE.BoxGeometry(0.3, 0.35, 0.06), STONE, 0, 0.17, 0); add(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 20, 1, false, 0, Math.PI), STONE, 0, 0.35, 0, Math.PI / 2, 0, Math.PI / 2);
      for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.035, 0.012, 6, 12, Math.PI * 1.4), STONE, s * 0.07, 0.24, 0.035, 0, 0, s > 0 ? -0.8 : 3.9); break;
    case 'menat': add(new THREE.TorusGeometry(0.13, 0.025, 8, 24), FAI, 0, 0.16, 0, Math.PI / 2.4); add(new THREE.CylinderGeometry(0.035, 0.07, 0.18, 12), BRONZE, 0, 0.05, -0.14, -0.4); break;
    case 'chalice': { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(t < 0.3 ? 0.04 + t * 0.1 : 0.03 + Math.pow((t - 0.3) / 0.7, 0.7) * 0.11, t * 0.3)); } add(new THREE.LatheGeometry(pts, 20), std(0x3a7fc0, { roughness: 0.2, side: THREE.DoubleSide })); add(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16), std(0x3a7fc0), 0, 0.01, 0); } break;
    case 'bracelets': for (const s of [-1, 1]) { add(new THREE.TorusGeometry(0.07, 0.022, 10, 24), GOLD, s * 0.08, 0.03, 0, Math.PI / 2); add(new THREE.SphereGeometry(0.03, 10, 8), LAPIS, s * 0.08, 0.05, 0.07, 0, 0, 0, [1.4, 0.8, 1]); } break;
    case 'pectoral': add(new THREE.BoxGeometry(0.22, 0.17, 0.02), GOLD, 0, 0.12, 0); for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(0.025, 0.08, 0.01), [CARN, LAPIS, FAI][i % 3], -0.08 + i * 0.04, 0.12, 0.012); add(new THREE.CylinderGeometry(0.025, 0.025, 0.012, 14), CARN, 0, 0.19, 0.012, Math.PI / 2); break;
    case 'kohl': add(new THREE.CylinderGeometry(0.025, 0.03, 0.16, 14), FAI, 0, 0.08, 0); add(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 6), WOOD, 0.01, 0.12, 0, 0, 0, 0.1); break;
    case 'spoon': add(new THREE.CapsuleGeometry(0.018, 0.14, 4, 8), WOOD, 0, 0.03, -0.05, Math.PI / 2); add(new THREE.SphereGeometry(0.06, 12, 8), WOOD, 0, 0.03, 0.08, 0, 0, 0, [1, 0.35, 1.3]); break;
    case 'mirror': add(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 24), BRONZE, 0, 0.26, 0, Math.PI / 2); add(new THREE.CylinderGeometry(0.014, 0.018, 0.16, 8), WOOD, 0, 0.09, 0); break;
    case 'senet': add(new THREE.BoxGeometry(0.42, 0.06, 0.14), WOOD, 0, 0.03, 0); for (let i = 0; i < 10; i++) for (let j = 0; j < 3; j++) add(new THREE.BoxGeometry(0.036, 0.004, 0.036), (i + j) % 2 ? ALAB : WOOD, -0.18 + i * 0.04, 0.062, -0.04 + j * 0.04); for (let i = 0; i < 4; i++) add(new THREE.ConeGeometry(0.012, 0.03, 8), i % 2 ? FAI : CARN, -0.1 + i * 0.07, 0.08, 0); break;
    case 'bes': add(new THREE.CapsuleGeometry(0.045, 0.06, 4, 10), FAI, 0, 0.09, 0); add(new THREE.SphereGeometry(0.045, 12, 10), FAI, 0, 0.18, 0); add(new THREE.CylinderGeometry(0.05, 0.03, 0.06, 10), FAI, 0, 0.24, 0); break;
    case 'palette': add(new THREE.BoxGeometry(0.06, 0.012, 0.32), WOOD, 0, 0.01, 0); add(new THREE.CylinderGeometry(0.012, 0.012, 0.005, 10), std(0x111111), 0, 0.018, 0.12); add(new THREE.CylinderGeometry(0.012, 0.012, 0.005, 10), CARN, 0, 0.018, 0.09); break;
    case 'ostracon': { const s = new THREE.CylinderGeometry(0.13, 0.15, 0.025, 7); add(s, std(0xe9dfc8, { roughness: 1 }), 0, 0.015, 0, 0, 0.3); add(new THREE.SphereGeometry(0.025, 8, 6), std(0x2a2220), -0.03, 0.03, 0.01, 0, 0, 0, [1, 0.2, 1.4]); add(new THREE.SphereGeometry(0.018, 8, 6), CARN, 0.04, 0.03, -0.02, 0, 0, 0, [1, 0.2, 1]); } break;
    case 'shabti': add(new THREE.CapsuleGeometry(0.035, 0.14, 4, 10), FAI, 0, 0.12, 0); add(new THREE.SphereGeometry(0.04, 10, 8, 0, Math.PI * 2, 0, Math.PI / 1.6), LAPIS, 0, 0.21, -0.005); break;
    case 'canopic': { const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.05 + Math.sin(t * Math.PI * 0.9) * 0.05, t * 0.22)); } add(new THREE.LatheGeometry(pts, 18), ALAB); add(new THREE.SphereGeometry(0.06, 12, 10), ALAB, 0, 0.27, 0, 0, 0, 0, [0.9, 1.05, 1]); add(new THREE.BoxGeometry(0.07, 0.07, 0.04), LAPIS, 0, 0.27, -0.035); } break;
    case 'djed': add(new THREE.CylinderGeometry(0.03, 0.04, 0.24, 10), FAI, 0, 0.12, 0); for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 14), FAI, 0, 0.17 + i * 0.022, 0); break;
    case 'headrest': add(new THREE.BoxGeometry(0.16, 0.02, 0.07), WOOD, 0, 0.01, 0); add(new THREE.CylinderGeometry(0.02, 0.03, 0.12, 8), WOOD, 0, 0.08, 0); add(new THREE.TorusGeometry(0.09, 0.02, 6, 16, Math.PI), WOOD, 0, 0.23, 0, 0, 0, Math.PI); break;
    case 'boat': { const h = new THREE.SphereGeometry(0.1, 14, 8); add(h, std(0xc9a46a), 0, 0.05, 0, 0, 0, 0, [3, 0.5, 0.8]); for (let i = 0; i < 4; i++) add(new THREE.CapsuleGeometry(0.012, 0.03, 3, 6), std(0xa0603a), -0.15 + i * 0.1, 0.11, 0); add(new THREE.BoxGeometry(0.08, 0.06, 0.08), std(0xefe6d2), 0.12, 0.12, 0); } break;
    case 'tablet': add(new THREE.BoxGeometry(0.2, 0.26, 0.04), CLAY, 0, 0.13, 0, -0.2); for (let i = 0; i < 8; i++) add(new THREE.BoxGeometry(0.16, 0.006, 0.006), std(0x6a4a2a), 0, 0.05 + i * 0.026, 0.024, -0.2); break;
    case 'udjat': add(new THREE.SphereGeometry(0.08, 14, 10), FAI, 0, 0.1, 0, 0, 0, 0, [1.4, 0.65, 0.3]); add(new THREE.SphereGeometry(0.03, 10, 8), LAPIS, 0, 0.1, 0.02); add(new THREE.BoxGeometry(0.02, 0.08, 0.02), FAI, -0.03, 0.03, 0, 0, 0, 0.3); break;
  }
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
    const S = city.spots, N = S.nofret, Q = S.quartel, H = S.hori;
    const W = {
      santuario: [-78, -4.5, 3], patio: [-30, 17.4, 3], hipostila: [-56, -7.5, 3], lago: [(LAKE.x0 + LAKE.x1) / 2 + 6, LAKE.z1 + 2.2, 3],
      trono: [-4.5, -137, 3], deposito: [-8, -151, 3], jardim: [36, -112, 3], piscina: [28, -141, 3],
      nofret: [N.x - 6, N.z + 6, 50], praca: [N.x + 5, N.z + 4, 50], mercado: [66, 44, 50], avenida: [40, -3.2, 3],
      canteiro: [H.x - 8, H.z + 10, 50], 'templo-vale': [-154, 48, 50], rainhas: [-183, -86, 50], miquerinos: [-200, 152, 50],
      esfinge: [-178, 13, 50], cais: [S.pier.x - 2, S.pier.z + 1.2, 3], quartel: [Q.x - 7, Q.z + 2, 50], vilarejo: [riverX(-118) + 50, -118, 50],
    };
    const gt = glowTex();
    this.glowMat = new THREE.SpriteMaterial({ map: gt, color: 0xffe2a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const beamGeo = new THREE.CylinderGeometry(0.04, 0.25, 7, 10, 1, true); beamGeo.translate(0, 3.5, 0);
    this.beamMat = new THREE.MeshBasicMaterial({ color: 0xffd88a, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.items = ARTIFACTS.map((def) => {
      const w = W[def.where] || [0, 0, 50];
      const p = freeSpot(w[0], w[1], w[2]);
      const g = new THREE.Group(); g.position.copy(p);
      const m = model(def.kind); m.scale.setScalar(2.2); m.position.y = 0.25; g.add(m);
      const glow = new THREE.Sprite(this.glowMat); glow.scale.setScalar(1.6); glow.position.y = 0.55; g.add(glow);
      const beam = new THREE.Mesh(beamGeo, this.beamMat); g.add(beam);
      g.traverse((o) => { if (o.isSprite || o === beam) o.layers.set(1); });
      scene.add(g);
      const it = { def, g, m, beam, glow, base: p.y };
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
    this.card.hidden = false;
  }
  closeCard() { this.card.hidden = true; }
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
      it.beam.visible = d2 < 60 * 60 && d2 > 4;
      it.m.rotation.y = t * 0.8;
      it.m.position.y = 0.25 + Math.sin(t * 2 + it.base) * 0.05;
      it.glow.material.opacity = 0.6 + Math.sin(t * 3) * 0.25;
      if (d2 < 1.7 * 1.7 && Math.abs(it.g.position.y - p.y) < 2 && !player.swimming) {
        it.g.visible = false;
        this.found.add(it.def.id);
        try { localStorage.setItem(SAVE, JSON.stringify([...this.found])); } catch (e) { /* */ }
        this.audio.chime();
        this.updateCounter();
        this.showCard(it.def, true);
        if (this.found.size === ARTIFACTS.length) this.onAll?.();
      }
    }
  }
}
