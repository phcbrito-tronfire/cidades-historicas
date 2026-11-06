// As quatro estações (tecla T; também passam sozinhas a cada quatro dias). Não é só trocar a cor do chão:
// - primavera: cerejeiras em flor e pétalas no ar, arrozais alagados com as mudas, neve só no alto do Fuji;
// - verão: tudo verde-escuro, o arroz alto, cigarras, o Fuji quase sem neve, pancadas de chuva em alguns dias;
// - outono: bordos vermelhos, faias douradas, folhas caindo, arroz maduro e os varais de secar, grilos à noite;
// - inverno: as folhosas sem folhas, neve no vale, nos telhados e no Fuji inteiro, arrozais secos, flocos no ar,
//   o povo de capa (no pé do Fuji, a ~800 m de altitude, a neve no vale é normal no inverno).
// As mudanças são graduais (~3 s), sem trocar malhas de repente.
import * as THREE from 'three';

export const SEASONS = ['primavera', 'verao', 'outono', 'inverno'];
export const SEASON_LABEL = { primavera: 'Primavera', verao: 'Verão', outono: 'Outono', inverno: 'Inverno' };
const MSG = {
  primavera: 'Primavera: as cerejeiras florescem e os arrozais viram espelhos. É a época de plantar as mudas, uma por uma, com a água pelas canelas.',
  verao: 'Verão: o arroz cresce alto e verde, as cigarras não param, e a montanha abre para os peregrinos. À tarde, às vezes, cai uma pancada de chuva.',
  outono: 'Outono: os bordos ficam vermelhos e as faias, douradas. É a colheita: o arroz é cortado e pendurado nos varais para secar.',
  inverno: 'Inverno: neve no vale, nos telhados e em toda a montanha. A terra descansa; nas casas, o povo trança palha perto do irori.',
};
const P = { // valores de cada estação (os números mudam aos poucos)
  primavera: { snowY: 540, lowSnow: 0, roofSnow: 0, grass: [0.86, 1.06, 0.72], warm: 0.15, sat: 1.1, particles: 'petal', insects: 0.2, crickets: 0.3 },
  verao: { snowY: 735, lowSnow: 0, roofSnow: 0, grass: [0.74, 1.0, 0.62], warm: 0.2, sat: 1.12, particles: 'none', insects: 1, crickets: 0.6 },
  outono: { snowY: 690, lowSnow: 0, roofSnow: 0, grass: [1.1, 0.98, 0.62], warm: 0.32, sat: 1.08, particles: 'leaf', insects: 0.1, crickets: 1 },
  inverno: { snowY: 120, lowSnow: 0.72, roofSnow: 1, grass: [0.92, 0.9, 0.78], warm: 0, sat: 0.82, particles: 'snow', insects: 0, crickets: 0 },
};

export class Seasons {
  constructor(scene, { terrainU, nature, paddies, roofU, post, actors, audio, toast }) {
    Object.assign(this, { scene, terrainU, nature, paddies, roofU, post, actors, audio, toast });
    this.i = 0; this.cur = { ...P.primavera, grass: [...P.primavera.grass] }; this.from = null; this.k = 1; this.seen = new Set(['primavera']); this.dayCount = 0; this.rain = 0;
    // partículas em volta de quem joga: pétalas, folhas, chuva ou neve (uma nuvem de pontos que acompanha a câmera)
    const N = 1400, pos = new Float32Array(N * 3); this.vel = new Float32Array(N * 3); this.N = N;
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 60; pos[i * 3 + 1] = Math.random() * 25; pos[i * 3 + 2] = (Math.random() - 0.5) * 60; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.pmat = new THREE.PointsMaterial({ size: 0.14, color: 0xffd0dc, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
    this.points = new THREE.Points(g, this.pmat); this.points.frustumCulled = false; scene.add(this.points);
    this.apply(true);
  }
  get name() { return SEASONS[this.i]; }
  label() { return SEASON_LABEL[this.name]; }
  next() { this.set((this.i + 1) % 4); return this.name; }
  set(i, instant = false) {
    this.i = i; this.from = { ...this.cur, grass: [...this.cur.grass] }; this.k = instant ? 1 : 0; this.seen.add(this.name);
    this.paddies?.setSeason(this.name); this.actors?.setSeason?.(this.name);
    if (this.audio) this.audio.season = this.name;
    this.treeT = instant ? 0 : 1.4; // (as copas trocam no meio da transição)
    if (instant) this.nature?.setSeason(this.name);
    this.toast?.(MSG[this.name], '', 8000);
    this.rainDay = this.name === 'verao' && Math.random() < 0.6;
    this.onSeason?.(this.name); // (o bambu cortado cresce de novo)
  }
  onDay() { this.dayCount++; if (this.dayCount % 4 === 0) this.next(); this.rainDay = this.name === 'verao' && Math.random() < 0.5; }
  apply() {
    const c = this.cur, U = this.terrainU;
    if (U) { U.uSnow.value = c.snowY; U.uLowSnow && (U.uLowSnow.value = c.lowSnow); U.uGrass && U.uGrass.value.set(...c.grass); if (U.uOasis) U.uOasis.value.w = c.roofSnow; } // (no inverno até o jardim da cratera fica branco)
    if (this.roofU) this.roofU.value = c.roofSnow;
    if (this.post) { this.post.grade.uniforms.uWarm.value = c.warm; this.post.grade.uniforms.uSat.value = c.sat; }
  }
  update(dt, t, cam, afternoon) {
    if (this.k < 1) {
      this.k = Math.min(1, this.k + dt / 3); const to = P[this.name], f = this.from, e = this.k * this.k * (3 - 2 * this.k);
      for (const key of ['snowY', 'lowSnow', 'roofSnow', 'warm', 'sat']) this.cur[key] = f[key] + (to[key] - f[key]) * e;
      for (let j = 0; j < 3; j++) this.cur.grass[j] = f.grass[j] + (to.grass[j] - f.grass[j]) * e;
      this.apply();
    }
    if (this.treeT > 0) { this.treeT -= dt; if (this.treeT <= 0) this.nature?.setSeason(this.name); }
    // as partículas
    const kind = this.rainDay && afternoon ? 'rain' : P[this.name].particles, pm = this.pmat;
    const want = kind === 'none' ? 0 : kind === 'rain' ? 0.55 : 0.9; pm.opacity += (want - pm.opacity) * Math.min(1, dt * 1.5);
    this.points.visible = pm.opacity > 0.02;
    if (!this.points.visible) return;
    if (kind !== this.pkind) { this.pkind = kind; pm.color.setHex(kind === 'petal' ? 0xffc8d8 : kind === 'leaf' ? 0xd86a2a : kind === 'snow' ? 0xffffff : 0xa8c0d8); pm.size = kind === 'rain' ? 0.06 : kind === 'snow' ? 0.12 : 0.16; }
    const p = this.points.geometry.attributes.position, a = p.array, cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
    const fall = kind === 'rain' ? 14 : kind === 'snow' ? 1.1 : kind === 'leaf' ? 1.4 : 0.8;
    for (let i = 0; i < this.N; i++) {
      let x = a[i * 3], y = a[i * 3 + 1], z = a[i * 3 + 2];
      y -= fall * dt * (0.7 + (i % 7) * 0.08); x += Math.sin(t * 1.3 + i) * dt * (kind === 'rain' ? 0.5 : 1.2); z += Math.cos(t * 0.9 + i * 1.7) * dt * (kind === 'rain' ? 0.3 : 0.9);
      if (y < cy - 6 || Math.abs(x - cx) > 30 || Math.abs(z - cz) > 30) { x = cx + (Math.random() - 0.5) * 60; z = cz + (Math.random() - 0.5) * 60; y = cy + 8 + Math.random() * 14; }
      a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
    }
    p.needsUpdate = true;
    // a quantidade de partículas fica menor fora das árvores floridas? (primavera: perto das cerejeiras seria o ideal — aqui, por toda parte, de leve)
  }
}

// neve nos telhados: as águas viradas para cima ficam brancas conforme a estação (um só valor para todos)
export function roofSnow(materials) {
  const U = { value: 0 };
  for (const m of materials) {
    if (!m) continue;
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      prev?.(sh, r);
      sh.uniforms.uRoofSnow = U;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vUpN;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvUpN = normalize(mat3(modelMatrix) * objectNormal).y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uRoofSnow;\nvarying float vUpN;')
        .replace('#include <map_fragment>', '#include <map_fragment>\nfloat rsn = uRoofSnow * smoothstep(0.35, 0.7, vUpN);\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 0.98), rsn * 0.92);');
    };
    m.needsUpdate = true;
  }
  return U;
}
