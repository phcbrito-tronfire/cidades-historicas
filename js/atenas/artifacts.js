// Artefatos colecionáveis: modelo 3D com brilho e coluna de luz, ficha histórica ao coletar
// e painel de coleção (tecla K). Progresso salvo no navegador.
import * as THREE from 'three';
import { ARTIFACTS } from './artifacts-data.js';
import { groundAt, blocked, terrainAt } from '../comum/collision.js';
import { getTextures } from './textures.js';

const SAVE = 'cidades-historicas:atenas:v1:artefatos';
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
  switch (kind) {
    case 'ostracon': { const s = new THREE.CylinderGeometry(0.13, 0.15, 0.025, 7); add(s, CLAY, 0, 0.015, 0, 0, 0.3); add(new THREE.BoxGeometry(0.16, 0.004, 0.02), std(0x2a2220), 0, 0.03, 0); } break;
    case 'amphora': lathe([[0.04, 0], [0.06, 0.04], [0.16, 0.18], [0.17, 0.3], [0.12, 0.45], [0.06, 0.52], [0.055, 0.6], [0.08, 0.62]], std(0x16100c, { roughness: 0.25 })); add(new THREE.CylinderGeometry(0.172, 0.172, 0.14, 18, 1, true), BF, 0, 0.27, 0); for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.06, 0.012, 5, 10, Math.PI), std(0x16100c), s * 0.1, 0.52, 0, 0, Math.PI / 2, s > 0 ? -1.3 : 1.3); break;
    case 'kylix': lathe([[0.04, 0], [0.045, 0.05], [0.02, 0.06], [0.08, 0.07], [0.19, 0.11], [0.2, 0.12]], RF, 24); break;
    case 'helmet': { const sh = add(new THREE.SphereGeometry(0.13, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), BRONZE, 0, 0.14, 0); sh.scale.set(1, 1.25, 1.1); for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.13, 0.1), BRONZE, s * 0.12, 0.06, 0.05, 0, -s * 0.3, 0); add(new THREE.BoxGeometry(0.03, 0.06, 0.25), std(0x8e2c22, { roughness: 1 }), 0, 0.33, 0); } break;
    case 'strigil': add(new THREE.TorusGeometry(0.11, 0.014, 5, 14, Math.PI * 0.9), BRONZE, 0, 0.06, 0, Math.PI / 2); lathe([[0.01, 0.0], [0.06, 0.04], [0.065, 0.08], [0.02, 0.12], [0.02, 0.15], [0.035, 0.16]], std(0x16100c, { roughness: 0.3 })); break;
    case 'mask': { const f = add(new THREE.SphereGeometry(0.14, 18, 14, 0, Math.PI), std(0xe8dcc0, { roughness: 0.8, side: THREE.DoubleSide }), 0, 0.16, 0, 0, 0, 0, [1, 1.3, 0.6]); f.rotation.y = -Math.PI / 2; add(new THREE.TorusGeometry(0.045, 0.012, 6, 14), std(0x2a1a10), 0, 0.12, 0.08, 0, 0, 0, [1, 0.6, 1]); for (const s of [-1, 1]) add(new THREE.CircleGeometry(0.022, 10), std(0x111111), s * 0.05, 0.21, 0.085); } break;
    case 'lyre': add(new THREE.SphereGeometry(0.11, 12, 8), std(0x6a4a2a, { roughness: 0.5 }), 0, 0.09, 0, 0, 0, 0, [1, 1, 0.45]); for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 6), WOOD, s * 0.08, 0.3, 0, 0, 0, -s * 0.25); add(new THREE.CylinderGeometry(0.01, 0.01, 0.24, 6), WOOD, 0, 0.45, 0, 0, 0, Math.PI / 2); break;
    case 'mirror': add(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 24), BRONZE, 0, 0.34, 0, Math.PI / 2); add(new THREE.CapsuleGeometry(0.02, 0.14, 4, 8), BRONZE, 0, 0.15, 0); add(new THREE.CylinderGeometry(0.05, 0.06, 0.03, 12), BRONZE, 0, 0.015, 0); break;
    case 'loomweights': for (let i = 0; i < 5; i++) add(new THREE.CylinderGeometry(0.025, 0.045, 0.09, 4), CLAY, -0.1 + i * 0.05, 0.045, 0, 0, Math.PI / 4); break;
    case 'knucklebones': for (let i = 0; i < 5; i++) add(new THREE.CapsuleGeometry(0.018, 0.02, 3, 6), std(0xeae0c8, { roughness: 0.6 }), Math.cos(i * 1.3) * 0.07, 0.02, Math.sin(i * 1.3) * 0.07, Math.PI / 2, i, 0); break;
    case 'lamp': { const b = add(new THREE.SphereGeometry(0.07, 14, 8), std(0x16100c, { roughness: 0.25 }), 0, 0.04, 0); b.scale.set(1, 0.5, 1); add(new THREE.CylinderGeometry(0.018, 0.024, 0.08, 8), std(0x16100c), 0, 0.04, 0.08, Math.PI / 2); } break;
    case 'waterclock': lathe([[0.03, 0], [0.12, 0.03], [0.13, 0.2], [0.11, 0.26], [0.12, 0.27]], CLAY); add(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6), BRONZE, 0.0, 0.02, 0.13, Math.PI / 2); break;
    case 'lekythos': lathe([[0.03, 0], [0.06, 0.03], [0.07, 0.25], [0.05, 0.28], [0.02, 0.3], [0.02, 0.36], [0.035, 0.38]], std(0xf2ecdc, { roughness: 0.5 })); break;
    case 'stele': add(new THREE.BoxGeometry(0.26, 0.42, 0.05), MARBLE, 0, 0.21, 0); add(new THREE.BoxGeometry(0.3, 0.06, 0.07), MARBLE, 0, 0.44, 0); add(new THREE.BoxGeometry(0.18, 0.25, 0.02), std(0xe0d6c0), 0, 0.2, 0.03); break;
    case 'ram': { add(new THREE.ConeGeometry(0.1, 0.45, 4), BRONZE, 0, 0.1, 0, 0, Math.PI / 4, -Math.PI / 2, [1, 1, 0.6]); for (const y of [0.04, 0.1, 0.16]) add(new THREE.BoxGeometry(0.3, 0.012, 0.18), BRONZE, -0.05, y, 0); } break;
    case 'anchor': add(new THREE.BoxGeometry(0.05, 0.4, 0.05), WOOD, 0, 0.22, 0); add(new THREE.BoxGeometry(0.34, 0.05, 0.06), std(0x6a6a6e, { metalness: 0.6, roughness: 0.5 }), 0, 0.38, 0); add(new THREE.TorusGeometry(0.12, 0.02, 5, 12, Math.PI), WOOD, 0, 0.1, 0, 0, 0, Math.PI); break;
    case 'amphora_t': lathe([[0.0, 0], [0.03, 0.06], [0.11, 0.22], [0.13, 0.38], [0.1, 0.5], [0.07, 0.54], [0.06, 0.62], [0.075, 0.64]], CLAY); for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.05, 0.012, 5, 10, Math.PI), CLAY, s * 0.08, 0.56, 0, 0, Math.PI / 2, s > 0 ? -1.3 : 1.3); break;
    case 'pinax': add(new THREE.BoxGeometry(0.34, 0.24, 0.02), WOOD, 0, 0.14, 0, -0.2); add(new THREE.BoxGeometry(0.3, 0.2, 0.005), std(0xffffff, { map: T.redFigure }), 0, 0.145, 0.012, -0.2); break;
    case 'chisel': for (let i = 0; i < 3; i++) { add(new THREE.CylinderGeometry(0.008, 0.012, 0.2, 6), std(0x5a5a5e, { metalness: 0.7, roughness: 0.5 }), -0.05 + i * 0.05, 0.012, 0, Math.PI / 2, i * 0.3, 0); } add(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 10), WOOD, 0.1, 0.05, 0.05, 0, 0, Math.PI / 2); break;
    case 'arrowheads': for (let i = 0; i < 3; i++) { add(new THREE.ConeGeometry(0.03, 0.1, 3), BRONZE, -0.08 + i * 0.08, 0.06, 0, 0, i * 0.6, Math.PI / 2); add(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 5), BRONZE, -0.08 + i * 0.08, 0.06, 0.1, Math.PI / 2, 0, 0); } break;
    case 'shield': add(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 24), BRONZE, 0, 0.24, 0, Math.PI / 2 - 0.25, 0, 0); add(new THREE.TorusGeometry(0.2, 0.015, 6, 24), BRONZE, 0, 0.24, 0.02, -0.25, 0, 0); break;
    case 'spindle': add(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 5), WOOD, 0, 0.15, 0); add(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 10), CLAY, 0, 0.05, 0); add(new THREE.SphereGeometry(0.05, 10, 8), std(0xe8e0d0, { roughness: 1 }), 0, 0.3, 0, 0, 0, 0, [1, 1.4, 1]); break;
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
    const S = city.spots, at = (v, dx = 0, dz = 0, y0 = 50) => (v ? [v.x + dx, v.z + dz, y0] : [0, 0, 50]);
    const W = {
      agora: at(S.stoaPoikile, -8, 3), odeon: at(S.odeon, 4, -6), odeon2: at(S.odeon, -14, -12), ceramico: at(S.potter, 14, 3), dipilon: at(S.dipylon, 4, 8),
      dipilon2: at(S.dipylon, -16, -14), teatro: at(S.skene, -7, 2), casa: at(S.casa_pericles, 3.5, 3.5), casa2: at(S.casa_pericles, -4, 4), bairro: [-150, 180, 50],
      tholos: at(S.tholos, 3, 2), stoa: at(S.horos, 6, -4), cemiterio: at(S.cemetery, 4, 2), cemiterio2: at(S.cemetery, -10, 6), porto: at(S.quay, -40, -10),
      psitalia: at(S.pan, -3, 3), salamina: at(S.ajax, -1.5, 0),
      praia: at(S.fisher, 12, -6), naufragio: at(S.wreck, 1.5, 0, 'fundo'), pinacoteca: at(S.pinakotheke, 0, 0), parthenon: at(S.parthenon, -40, 22), oliveira: at(S.olive, -3, 2),
    };

    const gt = glowTex();
    this.glowMat = new THREE.SpriteMaterial({ map: gt, color: 0xffe2a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const beamGeo = new THREE.CylinderGeometry(0.04, 0.25, 7, 10, 1, true); beamGeo.translate(0, 3.5, 0);
    this.beamMat = new THREE.MeshBasicMaterial({ color: 0xffd88a, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.items = ARTIFACTS.map((def) => {
      const w = W[def.where] || [0, 0, 50];
      const p = w[2] === 'fundo' ? new THREE.Vector3(w[0], terrainAt(w[0], w[1]) + 0.1, w[1]) : freeSpot(w[0], w[1], w[2]);
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
      it.beam.visible = d2 < 60 * 60 && d2 > 4;
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
