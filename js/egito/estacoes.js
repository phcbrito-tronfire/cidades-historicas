// As três estações do Egito (o ano egípcio tinha 12 meses de 30 dias, em três estações de quatro meses, todas
// marcadas pelo Nilo):
//   Akhet  — a cheia (de julho a outubro): o rio sobe, vermelho de lodo, e cobre os campos; as aldeias viram ilhas e
//            os camponeses vão trabalhar nas obras do faraó.
//   Peret  — a germinação (de novembro a fevereiro): a água baixa e deixa a terra negra (Kemet); semeia-se a cevada, o
//            trigo-emer e o linho, e os campos ficam verdes.
//   Shemu  — a colheita (de março a junho): o trigo amarela, é ceifado com a foice, amarrado em feixes e levado à eira;
//            o rio fica no ponto mais baixo e o escriba conta os sacos para o imposto.
// O tempo corre sozinho (uma estação a cada 5 minutos de jogo) e salta um mês a cada manhã (C passa o tempo). O ponto
// do ano fica guardado no navegador.
import * as THREE from 'three';
import { riverX, RIVER_HALF, terrainHeight, setFlood, WATER_Y } from './terrain.js';
import { stillWater } from '../comum/aguaparada.js';
import { smoothstep, lerp, clamp, mulberry32 } from '../comum/util.js';

export const SEASONS = [
  { id: 'akhet', name: 'Akhet — a cheia', short: 'Akhet, a cheia', story: 'O Nilo sobe, vermelho do lodo trazido das montanhas da Etiópia, e cobre os campos por quatro meses. As aldeias, em cima de montes de terra, viram ilhas; sem lavoura, os camponeses são chamados para as obras do faraó. Quando a água baixa, deixa a camada de lodo negro que faz a terra do Egito tão fértil.' },
  { id: 'peret', name: 'Peret — a germinação', short: 'Peret, a germinação', story: 'A água baixa e a terra aparece negra e molhada — os egípcios chamavam o seu país de Kemet, "a terra negra". Os camponeses aram com bois, jogam as sementes de cevada, trigo-emer e linho, e soltam as ovelhas para enterrá-las com as patas. Em poucas semanas, os campos ficam verdes.' },
  { id: 'shemu', name: 'Shemu — a colheita', short: 'Shemu, a colheita', story: 'O trigo amarela e chega a hora da colheita: os homens cortam as espigas com foices de madeira com dentes de sílex, as mulheres juntam e amarram os feixes, e os burros os levam para a eira, onde os bois pisam o grão. O escriba mede tudo: uma parte vai para os celeiros do templo e do faraó, como imposto.' },
];
const SEASON_SEC = 300; // (uma estação a cada 5 minutos de jogo)
const KEY = 'cidades-historicas:egito-ano';

export class Seasons {
  constructor(scene, { wheat, water, toast, info }) {
    Object.assign(this, { scene, wheat, water, toast, info });
    let y = 1.55; try { const v = parseFloat(localStorage.getItem(KEY)); if (Number.isFinite(v)) y = v; } catch (e) { /* */ }
    this.Y = ((y % 3) + 3) % 3; this.last = Math.floor(this.Y); this.saveT = 0; this.upT = 0; this.lastSig = '';
    // as bases do trigo (lugar, giro e tamanho de cada tufo) e a ordem da colheita: lote por lote, a partir da fazenda
    const pts = wheat.userData.pts, M = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    const plots = [...new Set(pts.map((o) => o.plot))]; const R = mulberry32(7); const rank = new Map(plots.map((pl) => [pl, R()]));
    this.base = pts.map((o, i) => { wheat.getMatrixAt(i, M); M.decompose(p, q, sc); return { p: p.clone(), q: q.clone(), s: sc.clone(), plot: o.plot, ripe: o.ripe, cut: rank.get(o.plot), j: R() }; });
    this.col = new THREE.Color(); this.mat = new THREE.Matrix4();
    // feixes de trigo amarrados, deixados nos lotes já ceifados
    const sheafG = new THREE.CylinderGeometry(0.16, 0.22, 0.75, 7, 1); sheafG.translate(0, 0.375, 0);
    const band = new THREE.CylinderGeometry(0.17, 0.17, 0.06, 7, 1); band.translate(0, 0.42, 0);
    this.sheafPts = []; const nS = 700;
    for (let i = 0; i < nS * 3 && this.sheafPts.length < nS; i++) { const b = this.base[Math.floor(R() * this.base.length)]; this.sheafPts.push({ x: b.p.x + (R() - 0.5) * 2, z: b.p.z + (R() - 0.5) * 2, cut: b.cut, ry: R() * 6, tilt: (R() - 0.5) * 0.5 }); }
    this.sheaves = new THREE.InstancedMesh(sheafG, new THREE.MeshStandardMaterial({ color: 0xc9a85a, roughness: 0.95, map: wheat.material.map || null }), this.sheafPts.length);
    this.sheafTie = new THREE.InstancedMesh(band, new THREE.MeshStandardMaterial({ color: 0x7a5a30, roughness: 0.9 }), this.sheafPts.length);
    for (const m of [this.sheaves, this.sheafTie]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }
    // a água da cheia sobre os campos da margem leste: barrenta, avermelhada, com ondinhas
    const verts = [], idx = []; const D = [RIVER_HALF - 8, 60, 100, 152], NZ = 111;
    for (let i = 0; i <= NZ; i++) { const z = -330 + (660 * i) / NZ; for (const d of D) verts.push(riverX(z) + d, 0, z); if (i < NZ) for (let j = 0; j < D.length - 1; j++) { const a = i * D.length + j, b = a + D.length; idx.push(a, b, a + 1, a + 1, b, b + 1); } } /* (nessa ordem a face fica para cima) */
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setIndex(idx); g.computeVertexNormals();
    const fm = new THREE.MeshStandardMaterial({ color: 0x5a3c26, roughness: 0.05, metalness: 0, envMapIntensity: 0.6 }); fm.userData.keepEnv = true; stillWater(fm, { scale: 0.5, strength: 0.6 });
    this.flood = new THREE.Mesh(g, fm); this.flood.receiveShadow = true; this.flood.visible = false; scene.add(this.flood);
    this.nileCol = water?.material?.uniforms?.waterColor?.value?.clone(); this.nileSh = water?.material?.uniforms?.uShallow?.value?.clone();
    this.apply(true);
  }
  get season() { return SEASONS[Math.floor(this.Y) % 3]; }
  get p() { return this.Y - Math.floor(this.Y); }
  label() { return this.season.short; }
  // C passa o tempo: cada manhã nova é um mês a mais
  newDay() { this.Y = (this.Y + 0.25) % 3; this.save(); }
  save() { try { localStorage.setItem(KEY, this.Y.toFixed(3)); } catch (e) { /* */ } }

  update(dt) {
    this.Y = (this.Y + dt / SEASON_SEC) % 3;
    if ((this.saveT += dt) > 10) { this.saveT = 0; this.save(); }
    const k = Math.floor(this.Y);
    if (k !== this.last) { this.last = k; const S = this.season; this.toast?.(`Começa ${S.short} no Egito.`, 'quest', 5000); this.info?.({ tag: 'Estação', name: S.name, era: 'Mênfis, Novo Império · o calendário do Nilo', story: S.story, foot: 'As estações mudam com o tempo (C passa o tempo: cada manhã é um mês).' }); }
    if ((this.upT -= dt) <= 0) { this.upT = 0.5; this.apply(); }
  }

  // o estado de cada coisa conforme o ponto do ano
  apply(force = false) {
    const k = Math.floor(this.Y) % 3, p = this.p;
    // a cheia: sobe no começo de Akhet, fica, e baixa no fim
    let fl = -100;
    if (k === 0) fl = lerp(0.45, 1.3, smoothstep(0.0, 0.25, p)) - smoothstep(0.75, 1.0, p) * 0.85;
    setFlood(fl > 0.5 ? fl : -100);
    this.flood.visible = fl > 0.5; if (this.flood.visible) this.flood.position.y = fl;
    // o Nilo fica avermelhado de lodo na cheia
    const red = k === 0 ? Math.sin(Math.PI * clamp(p * 1.1, 0, 1)) : 0;
    const U = this.water?.material?.uniforms;
    if (U?.waterColor && this.nileCol) { U.waterColor.value.copy(this.nileCol).lerp(new THREE.Color(0x4a2e1c), red * 0.75); if (U.uShallow && this.nileSh) U.uShallow.value.copy(this.nileSh).lerp(new THREE.Color(0x7a5236), red * 0.7); }
    // o trigo e os feixes (só quando algo mudou de verdade, para não refazer 9 mil matrizes à toa)
    const sig = `${k}:${Math.round(p * 120)}`; if (!force && sig === this.lastSig) return; this.lastSig = sig;
    const W = this.wheat, green0 = new THREE.Color(0xa8d24a), green1 = new THREE.Color(0x6e9a32), gold = new THREE.Color(0xffffff), straw = new THREE.Color(0x8a7a50);
    const sc = new THREE.Vector3();
    for (let i = 0; i < this.base.length; i++) {
      const b = this.base[i]; let h = 1, c = this.col;
      if (k === 0) h = 0; // debaixo da água / ainda não semeado
      else if (k === 1) { const g = smoothstep(0.05 + b.j * 0.08, 0.85, p); h = lerp(0.0, 1, g); c.copy(green0).lerp(green1, g); if (p < 0.06 + b.j * 0.08) h = 0; }
      else { // amarela (os lotes de cevada antes) e é ceifado lote por lote
        const ripeT = smoothstep(b.ripe ? -0.1 : 0.05, b.ripe ? 0.2 : 0.35, p); c.copy(green1).lerp(gold, ripeT);
        if (p > 0.38 + b.cut * 0.5) { h = 0.13; c.copy(straw); } // (a palha que sobra depois da foice)
        if (p > 0.95) h = 0.08;
      }
      sc.copy(b.s).multiply(new THREE.Vector3(1, Math.max(0.0001, h), 1)); if (h <= 0) sc.setScalar(0.0001);
      this.mat.compose(b.p, b.q, sc); W.setMatrixAt(i, this.mat); W.setColorAt(i, c);
    }
    W.instanceMatrix.needsUpdate = true; if (W.instanceColor) W.instanceColor.needsUpdate = true;
    // feixes: aparecem quando o lote é ceifado e somem no fim da colheita (levados para a eira)
    const m = new THREE.Matrix4(), e = new THREE.Euler(), qq = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3(0.0001, 0.0001, 0.0001), pos = new THREE.Vector3();
    this.sheafPts.forEach((s, i) => {
      const on = k === 2 && p > 0.4 + s.cut * 0.5 && p < 0.93;
      pos.set(s.x, terrainHeight(s.x, s.z) - 0.04, s.z); e.set(s.tilt * 0.3, s.ry, s.tilt); qq.setFromEuler(e);
      m.compose(pos, qq, on ? one : zero); this.sheaves.setMatrixAt(i, m); this.sheafTie.setMatrixAt(i, m);
    });
    this.sheaves.instanceMatrix.needsUpdate = true; this.sheafTie.instanceMatrix.needsUpdate = true;
  }
}
