// Uma centúria da guarda marchando em formação pela rua em volta do Coliseu: 4 fileiras de 6 legionários (gálea,
// lorica segmentata, scutum vermelho e gládio), o porta-estandarte (signifer) na frente e o centurião ao lado.
// Passo sincronizado (todos com o mesmo pé), e de vez em quando a centúria para, dá meia-volta à direita e segue.
import * as THREE from 'three';
import { makeHumanoid, animateHumanoid } from '../comum/mixamo.js';
import { COL } from './coliseu.js';
import { terrainHeight } from './terrain.js';
import { pick, rr } from '../comum/util.js';

const RA = COL.A + 12, RB = COL.B + 12; // a rua em volta do Coliseu (elipse)
const at = (s) => { const th = s / ((RA + RB) / 2); return { x: RA * Math.cos(th), z: RB * Math.sin(th), tx: -RA * Math.sin(th), tz: RB * Math.cos(th) }; };

export class Legion {
  constructor(scene) {
    this.men = []; this.s = 40; this.halt = 0; this.phase = 0;
    const skins = [0xc8a07e, 0xb48662, 0xa87a58, 0xd2aa8a];
    const add = (role, row, col) => {
      const look = { outfit: 'chiton', cloth: 0xa82a20, border: null, skin: pick(skins), beard: Math.random() < 0.4 ? 'short' : null, extras: ['lorica', 'galea', 'scutum', 'gladius'], shieldColor: 0xa8261e };
      if (role === 'signifer') look.extras = ['lorica', 'galea'];
      if (role === 'centurio') { look.extras = ['lorica', 'galea', 'rudis']; look.crest = 0xe8e0d0; }
      const r = makeHumanoid(look); scene.add(r.root);
      if (role === 'signifer') { // o estandarte: haste com discos (phalerae), a mão aberta no alto e a franja
        const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xd8a83a, metalness: 0.9, roughness: 0.3 });
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.6, 6), new THREE.MeshStandardMaterial({ color: 0x5a3a20 }))).position.y = 0.9;
        for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 14), gold); d.rotation.x = Math.PI / 2; d.position.y = 0.6 + i * 0.22; g.add(d); }
        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.02), gold); hand.position.y = 2.25; g.add(hand);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshStandardMaterial({ color: 0xa82a20, side: THREE.DoubleSide })); flag.position.set(0, 1.85, 0.0); g.add(flag);
        r.handR.add(g);
      }
      this.men.push({ r, role, row, col });
    };
    add('signifer', -1.4, 0); add('centurio', 0, 3.6);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 6; col++) add('miles', row, col - 2.5);
  }
  update(dt, t, player) {
    const p = player.pos, near = Math.hypot(p.x, p.z) < 260;
    for (const m of this.men) m.r.root.visible = near;
    if (!near) return;
    // marcha a ~1,3 m/s; a cada volta e meia, uma parada de alguns segundos
    if (this.halt > 0) this.halt -= dt; else { this.s += dt * 1.3; if (Math.random() < dt * 0.012) this.halt = rr(4, 8); }
    const moving = this.halt <= 0;
    if (moving) this.phase = (this.phase + dt * 1.3 / 1.5) % 1; // um passo a cada ~0,75 m, todos juntos
    for (const m of this.men) {
      const q = at(this.s - (m.row + 1) * 1.7), L = Math.hypot(q.tx, q.tz), nx = -q.tz / L, nz = q.tx / L;
      const x = q.x + nx * m.col * 1.25, z = q.z + nz * m.col * 1.25;
      m.r.root.position.set(x, terrainHeight(x, z), z);
      m.r.root.rotation.y = Math.atan2(q.tx, q.tz);
      m.r.locoPhase = this.phase;
      animateHumanoid(m.r, dt, moving ? 1.3 : 0, moving ? 'walk' : 'idle', t);
    }
  }
}
