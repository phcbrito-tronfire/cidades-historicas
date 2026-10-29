// Objetivos da jornada e escaravelhos dourados
import * as THREE from 'three';
import { riverX } from './terrain.js';

export const OBJECTIVES = [
  { id: 'nebamun', text: 'Fale com Nebamun, o escriba, na avenida das esfinges', hint: [64, 4] },
  { id: 'templo', text: 'Entre no pátio do Templo de Ptah', hint: [-20, 0] },
  { id: 'khaemwaset', text: 'Converse com o sumo sacerdote Khaemwaset', hint: [-18, 5] },
  { id: 'merit', text: 'Prove o pão de Merit no mercado', hint: [60, 52] },
  { id: 'djehuty', text: 'Descubra com o mercador Djehuty como se compra sem moedas', hint: [72, 66] },
  { id: 'nilo', text: 'Nade nas águas do Nilo', hint: [118, 0] },
  { id: 'ipi', text: 'Ouça o pescador Ipi no cais', hint: null },
  { id: 'tiy', text: 'Atravesse o Nilo e visite a lavradora Tiy na margem leste', hint: null },
  { id: 'piramides', text: 'Chegue ao planalto das Pirâmides de Gizé', hint: [-190, 0] },
  { id: 'hori', text: 'Fale com o capataz Hori, no canteiro perto da Esfinge', hint: null },
  { id: 'cerveja', text: 'Leve um jarro de cerveja do mercado até Hori', hint: null },
  { id: 'mahu', text: 'Visite o quartel e fale com o chefe de tropa Mahu', hint: null },
  { id: 'nofret', text: 'Conheça Nofret e seus gatos, no bairro norte', hint: null },
  { id: 'merneptah', text: 'Encontre o príncipe Merneptah no quartel', hint: null },
  { id: 'isetnofret', text: 'Seja recebido pela rainha Isetnofret no jardim do palácio', hint: [36, -121] },
  { id: 'rahotep', text: 'Conheça Rahotep, o vizir do Norte, diante da porta do palácio', hint: [66, -128] },
  { id: 'tia', text: 'Encontre a princesa Tia, irmã do faraó, a caminho da necrópole', hint: [-165, -62] },
  { id: 'escaravelhos', text: 'Encontre os 5 escaravelhos dourados', count: 5 },
  { id: 'artefatos', text: 'Encontre os 26 artefatos do Egito Antigo', count: 26 },
  { id: 'farao', text: 'Seja recebido pelo faraó Ramsés II no palácio, ao sul', hint: [30, -132] },
];
export const PHARAOH_REQ = 8;
const SAVE = 'cidades-historicas:egito:v1';

export class Quests {
  constructor(scene, city, gold, glowTex, ui, audio) {
    this.ui = ui; this.audio = audio;
    this.done = new Set();
    this.scarabsFound = new Set();
    this.listeners = [];
    const S = city.spots;
    this.hints = { ipi: [S.ipi.x, S.ipi.z], tiy: [S.tiy.x, S.tiy.z], hori: [S.hori.x, S.hori.z], cerveja: [S.hori.x, S.hori.z], mahu: [S.quartel.x, S.quartel.z], merneptah: [S.quartel.x + 5, S.quartel.z + 3], nofret: [S.nofret.x, S.nofret.z] };
    this.zones = city.zones;
    // escaravelhos
    const spots = [
      S.santuario.clone().add(new THREE.Vector3(0, 0.35, 0)),
      S.sphinx.clone().add(new THREE.Vector3(-0.5, 0.35, 0)),
      S.pier.clone().add(new THREE.Vector3(0.5, 0.35, 0)),
      S.farm.clone().add(new THREE.Vector3(4, 0.4, -5)),
      S.palaceGarden.clone().add(new THREE.Vector3(0, 0.4, 0)),
    ];
    const body = new THREE.SphereGeometry(0.16, 14, 10); body.scale(1, 0.55, 1.35);
    const head = new THREE.SphereGeometry(0.08, 10, 8); head.scale(1.2, 0.6, 0.8); head.translate(0, 0, 0.24);
    const wingLine = new THREE.BoxGeometry(0.012, 0.03, 0.34); wingLine.translate(0, 0.07, -0.02);
    const blue = new THREE.MeshStandardMaterial({ color: 0x2c5d9c, roughness: 0.3, metalness: 0.4 });
    this.scarabs = spots.map((p, i) => {
      const g = new THREE.Group(); g.position.copy(p);
      g.add(new THREE.Mesh(body, gold), new THREE.Mesh(head, gold), new THREE.Mesh(wingLine, blue));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd36a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.setScalar(1.6); g.add(glow);
      const light = null;
      scene.add(g);
      return { g, i, base: p.y, light };
    });
    this.load();
  }

  isDone(id) { return !id || this.done.has(id); }
  count() { return [...this.done].filter((d) => d !== 'farao' && d !== 'escaravelhos' && d !== 'artefatos').length; }
  pharaohUnlocked() { return this.count() >= PHARAOH_REQ; }

  complete(id) {
    if (this.done.has(id)) return false;
    this.done.add(id);
    const o = OBJECTIVES.find((x) => x.id === id);
    this.ui.toast(`Objetivo concluído: ${o.text}`, 'quest');
    this.audio.chime();
    this.save();
    this.ui.renderObjectives(this);
    this.listeners.forEach((f) => f(id));
    if (id !== 'farao' && this.pharaohUnlocked() && !this._unlockedMsg) {
      this._unlockedMsg = true;
      setTimeout(() => this.ui.toast('Toda Mênfis fala de você... O faraó Ramsés II aceita recebê-lo no palácio!', 'royal'), 2500);
    }
    return true;
  }

  update(dt, t, player) {
    const p = player.pos;
    const inZ = (z) => p.x > z[0] && p.x < z[1] && p.z > z[2] && p.z < z[3];
    if (!this.done.has('templo') && inZ([-41, -3, -19, 19]) && p.y > 1) this.complete('templo');
    if (!this.done.has('piramides') && p.x < -178) this.complete('piramides');
    if (!this.done.has('nilo') && player.swimming && Math.abs(p.x - riverX(p.z)) < 40) this.complete('nilo');
    for (const s of this.scarabs) {
      if (this.scarabsFound.has(s.i)) continue;
      s.g.rotation.y = t * 1.5;
      s.g.position.y = s.base + Math.sin(t * 2 + s.i) * 0.08;
      if (s.g.position.distanceToSquared(p.clone().add(new THREE.Vector3(0, 0.5, 0))) < 1.8 * 1.8) this.takeScarab(s);
    }
  }

  takeScarab(s) {
    this.scarabsFound.add(s.i);
    s.g.visible = false;
    const n = this.scarabsFound.size;
    this.audio.coin();
    this.ui.toast(`Escaravelho dourado encontrado! (${n}/5) — Khepri, o sol que renasce, traz sorte.`, 'scarab');
    if (n >= 5) this.complete('escaravelhos'); else { this.save(); this.ui.renderObjectives(this); }
  }

  save() {
    try { localStorage.setItem(SAVE, JSON.stringify({ done: [...this.done], scarabs: [...this.scarabsFound] })); } catch (e) { /* sem armazenamento */ }
  }
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE) || 'null');
      if (!d) return;
      d.done.forEach((x) => this.done.add(x));
      d.scarabs.forEach((i) => { this.scarabsFound.add(i); this.scarabs[i].g.visible = false; });
      if (this.pharaohUnlocked()) this._unlockedMsg = true;
    } catch (e) { /* ignora */ }
  }
  reset() {
    try { localStorage.removeItem(SAVE); } catch (e) { /* */ }
  }
  hintFor(o) { return o.hint || this.hints[o.id] || null; }
}
