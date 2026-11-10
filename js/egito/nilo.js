// Bichos do Nilo: crocodilos tomando sol nas margens (Sobek, o deus-crocodilo, era venerado em Mênfis, mas os de
// verdade matavam pescadores e lavadeiras) e peixes — tilápias e percas — passando no fundo do rio.
import { riverX, RIVER_HALF, terrainHeight, WATER_Y } from './terrain.js';
import { Crocodiles, SeaLife } from '../comum/fauna.js';
import { Fera, alvoFera } from '../comum/feras.js';
import * as THREE from 'three';
import { lerp, angleLerp } from '../comum/util.js';

const inRiver = (x, z, margin = 0) => Math.abs(x - riverX(z)) < RIVER_HALF + margin;

// lugar de cada crocodilo: na beira d'água (onde a margem começa a subir), olhando para o rio
function bankSpot(z, side) {
  const rx = riverX(z);
  for (let d = 18; d < RIVER_HALF + 12; d += 0.5) {
    const x = rx + side * d;
    if (terrainHeight(x, z) > WATER_Y - 0.45) return { x: rx + side * (d - 1.2), z, ry: side > 0 ? -Math.PI / 2 + (Math.random() - 0.5) * 0.8 : Math.PI / 2 + (Math.random() - 0.5) * 0.8 };
  }
  return null;
}

// Hipopótamos: passam o dia dentro do rio, andando no fundo com só as costas, as orelhas e os olhos de fora. De vez
// em quando escancaram a boca (o 'bocejo' que é aviso: estou aqui) e bufam. Quem nada perto demais leva uma investida
// — no Nilo o hipopótamo matava mais gente que o crocodilo, e os barqueiros tinham amuletos contra ele.
class Hippos {
  constructor(scene, o) { this.scene = scene; this.o = o; this.list = []; }
  async populate() {
    for (const h of this.o.homes) {
      const f = await Fera.criar('hipo', null, { size: 3.6 + Math.random() * 0.7 }); if (!f) return;
      f.swimming = false; this.scene.add(f.holder);
      this.list.push({ f, home: h, x: h.x, z: h.z, h: Math.random() * 6, v: 0, wx: h.x, wz: h.z, wait: Math.random() * 5, yawn: 3 + Math.random() * 10, cd: 0, st: 'wander', pos: new THREE.Vector3(h.x, 0, h.z) });
      const k = this.list[this.list.length - 1];
      alvoFera(k, 'hipo', { hp: 160, sons: this.o.sons, onHit: (k) => { k.st = 'charge'; k.angry = 20; } }); // (golpeado, investe — também em terra)
      k.respawn = () => { k.st = 'wander'; k.angry = 0; };
    }
  }
  update(dt, t, player) {
    const P = player.pos, W = WATER_Y;
    for (const k of this.list) {
      const f = k.f, dx = P.x - k.x, dz = P.z - k.z, d = Math.hypot(dx, dz);
      const vis = d < 160; f.holder.visible = vis; if (!vis) continue;
      if (k.tickAlvo(dt, d)) { k.pos.set(k.x, f.holder.position.y, k.z); continue; }
      if (k.angry > 0) k.angry -= dt;
      k.cd -= dt; k.yawn -= dt;
      const near = ((player.swimming || player.wading || inRiver(P.x, P.z, 4)) && d < 10) || k.angry > 0;
      let sp = 0, want = k.h;
      if (k.st === 'wander' && near && k.cd <= 0) { k.st = 'charge'; this.o.sons?.voz('hipo', k.pos, { quem: k, gap: 2 }); if (!this.warned) { this.warned = true; this.o.onWarn?.(); } }
      if (k.st === 'charge') { // investe e persegue também em terra (o hipopótamo corre mais que um homem andando; correndo, dá para fugir)
        const deep = W - terrainHeight(k.x, k.z) > f.height * 0.6;
        want = Math.atan2(dx, dz); sp = deep ? 3.4 : 6.0;
        if (k.recoil > 0) { k.recoil -= dt; want += Math.PI * 0.6 * (k.side || 1); sp = 1.5; }
        k.biteCd = (k.biteCd || 0) - dt;
        if (d < 3.2 && !f.busy && k.biteCd <= 0) { f.play('atk', { rate: 1.2 }); k.biteT = 0.45; k.biteCd = 2.4; } // (entre uma mordida e outra, um respiro: antes mordia três vezes seguidas)
        if (k.biteT > 0 && (k.biteT -= dt) <= 0 && d < 3.8) { this.o.onBite?.(k); k.recoil = 1.4; k.side = Math.random() < 0.5 ? 1 : -1; }
        if (d > 16) k.lost = (k.lost || 0) + dt; else k.lost = 0;
        if (k.lost > 2 || Math.hypot(k.x - k.home.x, k.z - k.home.z) > 45) { k.st = 'back'; k.cd = 8; k.lost = 0; k.angry = 0; }
      } else if (k.st === 'back') { const hx = k.home.x - k.x, hz = k.home.z - k.z; want = Math.atan2(hx, hz); sp = 1.2; if (Math.hypot(hx, hz) < 3) k.st = 'wander'; }
      else { // passeia devagar pelo fundo, perto de casa
        const wx = k.wx - k.x, wz = k.wz - k.z, wd = Math.hypot(wx, wz);
        if (wd < 1.2) { if ((k.wait -= dt) <= 0) { const a = Math.random() * 6.28, r = Math.random() * 10; const nx = k.home.x + Math.cos(a) * r, nz = k.home.z + Math.sin(a) * r; if (inRiver(nx, nz, -8) && W - terrainHeight(nx, nz) > 1.4) { k.wx = nx; k.wz = nz; } k.wait = 4 + Math.random() * 8; } }
        else { want = Math.atan2(wx, wz); sp = 0.6; }
        if (k.yawn <= 0 && !f.busy && d < 110) { k.yawn = 10 + Math.random() * 16; f.play('rugir'); this.o.sons?.voz('hipo', k.pos, { quem: k, gap: 3 }); }
      }
      k.h = angleLerp(k.h, want, Math.min(1, dt * 1.6));
      k.v = lerp(k.v, sp, Math.min(1, dt * (sp > k.v ? 1.2 : 2)));
      const nx = k.x + Math.sin(k.h) * k.v * dt, nz = k.z + Math.cos(k.h) * k.v * dt;
      if (inRiver(nx, nz, -4) || k.st !== 'wander') { k.x = nx; k.z = nz; } k.pos.set(k.x, f.holder.position.y || 0, k.z); // (passeando fica no rio; investindo ou voltando, sai para a margem)
      // dentro d'água: só o alto da cabeça e as costas de fora; no bocejo e na investida, a cabeça sobe
      const up = f.one && (f.one.k === 'rugir' || f.one.k === 'atk') ? 0.3 : 0;
      const y = Math.max(terrainHeight(k.x, k.z), W - f.height * (0.78 - up));
      f.holder.position.set(k.x, lerp(f.holder.position.y || y, y, Math.min(1, dt * 2)), k.z); f.holder.rotation.set(0, k.h, 0);
      f.update(dt, k.v);
    }
  }
}

export async function buildNile(scene, city, { onBite, onWarn, onHippo, onHippoWarn, sons }) {
  // margem leste (a de lá, longe da cidade) e as pontas da margem oeste, longe dos cais e de onde se lava roupa
  const homes = [];
  for (const z of [-340, -230, -120, 10, 130, 250, 345]) { const h = bankSpot(z, 1); if (h) homes.push(h); }
  for (const z of [-330, 335]) { if (Math.abs(z - city.pierZ) < 60 || Math.abs(z - city.pier2Z) < 60) continue; const h = bankSpot(z, -1); if (h) homes.push(h); }
  const crocs = new Crocodiles(scene, { waterY: WATER_Y, floorAt: terrainHeight, inRiver, homes, onBite, onWarn, sons });
  crocs.populate();
  // hipopótamos no meio do rio, onde é fundo (longe dos cais)
  const hHomes = []; for (const z of [-70, 60, 190]) { for (const off of [12, 0, -12]) { const x = riverX(z) + off; if (WATER_Y - terrainHeight(x, z) > 1.8) { hHomes.push({ x, z }); break; } } }
  const hippos = new Hippos(scene, { homes: hHomes, sons, onBite: onHippo, onWarn: onHippoWarn }); hippos.populate();
  const fish = new SeaLife(scene, {
    waterY: WATER_Y, floorAt: terrainHeight,
    seaPoint: (r) => { for (let i = 0; i < 30; i++) { const z = (r() - 0.5) * 700, x = riverX(z) + (r() - 0.5) * 50; if (WATER_Y - terrainHeight(x, z) > 2) return { x, z }; } return null; },
  });
  fish.populate([['pargo', 9, 0.4, 'fish']]);
  return { crocs, hippos, update(dt, t, player) { crocs.update(dt, t, player); hippos.update(dt, t, player); fish.update(dt, t, player); } };
}
