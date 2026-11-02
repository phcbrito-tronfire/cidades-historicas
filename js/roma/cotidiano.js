// O dia a dia em volta dos monumentos: jumentos carregados, puxados pelo tropeiro, indo e vindo pelas ruas; bandos de
// pombos dando voltas sobre o Fórum e o Coliseu; quadrirremes da frota subindo e descendo o Tibre (vinham
// atracar no Campo de Marte); e os bois do cercado do Fórum Boário, ruminando à espera de comprador.
import * as THREE from 'three';
import { creature } from '../comum/fauna.js';
import { sculptureInstance } from '../comum/sculptures.js';
import { makeHumanoid, animateHumanoid } from '../comum/mixamo.js';
import { terrainHeight, TIBER, FORUM, waterLevelAt } from './terrain.js';
import { COL } from './coliseu.js';
import { rr, rand, lerp, angleLerp } from '../comum/util.js';

// caminho por pontos: posição e direção a uma distância s (vai e volta)
function polyline(pts) {
  const segs = []; let L = 0;
  for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az); segs.push({ ax, az, bx, bz, l, s0: L }); L += l; }
  return { L, at(s, o) { s = Math.max(0, Math.min(L, s)); const g = segs.find((q) => s <= q.s0 + q.l) || segs[segs.length - 1]; const t = (s - g.s0) / g.l; o.x = g.ax + (g.bx - g.ax) * t; o.z = g.az + (g.bz - g.az) * t; o.h = Math.atan2(g.bx - g.ax, g.bz - g.az); return o; } };
}

export class Daily {
  constructor(scene, city, { quality }) {
    this.scene = scene; this.walkers = []; this.flocks = []; this.barges = []; this.oxen = [];
    // ---- jumentos com o tropeiro: na rua do Fórum ao Coliseu e no Fórum Boário
    const routes = [
      polyline([[-COL.A - 8, -6], [-110, -12], [FORUM.x + FORUM.hw, FORUM.z + 2]]),
      polyline([[-COL.A - 8, -2], [-110, -8], [FORUM.x + FORUM.hw, FORUM.z + 6]]),
      polyline([[-380, 320], [-418, 318], [-450, 300], [-430, 250]]),
    ];
    const nDonkey = quality === 'minimo' ? 2 : 3;
    for (let i = 0; i < nDonkey; i++) {
      const route = routes[i];
      const w = { route, s: rr(0, route.L), dir: rand() < 0.5 ? 1 : -1, v: 1.2, wait: 0, p: {}, h: 0, d: null, acts: null };
      w.man = makeHumanoid({ outfit: 'chiton', cloth: [0x9a8a70, 0x8a6a3a, 0xb0a080][i], border: null, beard: 'short' });
      scene.add(w.man.root);
      creature('jumento', 1.85, { still: true }).then((c) => {
        if (!c) return;
        const a = c.clips.find((cl) => /walk/i.test(cl.name)) || c.clips[0], ai = c.clips.find((cl) => /idle/i.test(cl.name)) || a;
        w.walk = c.mixer.clipAction(a); w.idle = c.mixer.clipAction(ai); w.walk.play(); w.idle.play(); w.idle.setEffectiveWeight(0);
        // a carga: dois cestos de vime e um fardo por cima
        const basket = new THREE.MeshStandardMaterial({ color: 0xb79c5c, roughness: 1 }), sack = new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 1 });
        for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.4, 10), basket); b.position.set(s * 0.32, 0.85, -0.05); c.holder.add(b); }
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.5), sack); f.position.set(0, 1.12, -0.05); c.holder.add(f);
        c.holder.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        scene.add(c.holder); w.d = c;
      });
      this.walkers.push(w);
    }
    // ---- pombos: dois bandos (instanciados) voando em círculos largos
    const wing = new THREE.BufferGeometry();
    wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, -0.22, 0, -0.02, 0, 0, -0.12, 0, 0, 0.12, 0.22, 0, -0.02, 0, 0, -0.12], 3)); wing.computeVertexNormals();
    const bm = new THREE.MeshStandardMaterial({ color: 0x8a8e96, roughness: 0.9, side: THREE.DoubleSide });
    for (const [cx, cz, r, y] of [[FORUM.x, FORUM.z, 60, 26], [0, 0, 80, 58]]) {
      const n = quality === 'minimo' ? 14 : 28, im = new THREE.InstancedMesh(wing, bm, n); im.frustumCulled = false;
      scene.add(im); this.flocks.push({ im, cx, cz, r, y, n, off: [...Array(n)].map(() => [rr(-8, 8), rr(-3, 3), rr(-8, 8), rand() * 6]) });
    }
    // ---- barcaças no Tibre: um trecho do rio perto da cidade, cada uma num lado, subindo ou descendo devagar
    this.river = polyline(TIBER.slice(3, 8));
    for (let i = 0; i < 2; i++) sculptureInstance('quadrirreme', 22).then((o) => { // (o mercante grego de Atenas não entra em Roma)
      if (!o.children.length) return;
      const g = new THREE.Group(); o.rotation.y = -Math.PI / 2; g.add(o); scene.add(g); // o modelo olha para +x: vira para +z
      this.barges.push({ g, s: rr(0.2, 0.8) * this.river.L, dir: i ? 1 : -1, side: i ? 11 : -11, p: {} });
    });
    // ---- bois no cercado do mercado
    const pen = city.marketPen;
    if (pen) for (let i = 0; i < 3; i++) creature('touro', 2.5, { still: true }).then((c) => {
      if (!c) return;
      const ai = c.clips.find((cl) => /idle/i.test(cl.name)) || c.clips[0], act = c.mixer.clipAction(ai); act.play(); act.time = rand() * 3; act.timeScale = 0.6;
      c.holder.position.set(pen.x - 3 + i * 3, pen.y, pen.z + rr(-2.5, 2.5)); c.holder.rotation.y = rand() * 6;
      // um boi de pelo mais claro, como os bois brancos dos sacrifícios
      if (i === 1) c.holder.traverse((o) => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.color.multiplyScalar(1.8); } });
      scene.add(c.holder); this.oxen.push(c);
    });
    this.d3 = new THREE.Object3D();
  }

  update(dt, t, player) {
    const p = player.pos;
    for (const w of this.walkers) {
      const q0 = w.route.at(w.s, w.p), near = Math.hypot(q0.x - p.x, q0.z - p.z) < 160;
      w.man.root.visible = near; if (w.d) w.d.holder.visible = near;
      if (!near) continue;
      if (w.wait > 0) { w.wait -= dt; } else {
        w.s += w.dir * w.v * dt;
        if (w.s <= 0 || w.s >= w.route.L) { w.dir *= -1; w.wait = rr(4, 9); }
        else if (rand() < dt * 0.02) w.wait = rr(3, 6); // para um pouco (conversa, descarrega)
      }
      const moving = w.wait <= 0, q = w.route.at(w.s, w.p), h = q.h + (w.dir < 0 ? Math.PI : 0);
      w.h = angleLerp(w.h, h, Math.min(1, dt * 4));
      const sx = Math.sin(w.h), cz = Math.cos(w.h), rx = cz, rz = -sx; // direita
      const dx = q.x, dz = q.z;
      if (w.d) {
        w.d.holder.position.set(dx, terrainHeight(dx, dz), dz); w.d.holder.rotation.y = w.h;
        w.walk.setEffectiveWeight(moving ? 1 : 0); w.idle.setEffectiveWeight(moving ? 0 : 1); w.d.mixer.update(dt);
      }
      // o tropeiro anda ao lado da cabeça do jumento, segurando o cabresto
      const mx = dx + sx * 0.9 + rx * 0.75, mz = dz + cz * 0.9 + rz * 0.75;
      w.man.root.position.set(mx, terrainHeight(mx, mz), mz); w.man.root.rotation.y = w.h;
      animateHumanoid(w.man, dt, moving ? w.v : 0, moving ? 'walk' : 'idle', t);
    }
    // pombos: cada um num círculo com fase própria, batendo as asas (achata e abre)
    for (const f of this.flocks) {
      const vis = Math.hypot(f.cx - p.x, f.cz - p.z) < 320; f.im.visible = vis; if (!vis) continue;
      const a0 = t * 0.18;
      for (let i = 0; i < f.n; i++) {
        const [ox, oy, oz, ph] = f.off[i], a = a0 + i * 0.05;
        const x = f.cx + Math.cos(a) * (f.r + ox) + Math.sin(t * 0.4 + ph) * 6, z = f.cz + Math.sin(a) * (f.r + oz), y = f.y + oy + Math.sin(t * 0.7 + ph) * 3;
        this.d3.position.set(x, y, z); this.d3.rotation.set(0, Math.atan2(-Math.sin(a), Math.cos(a)), 0);
        const flap = Math.sin(t * 14 + ph * 3); this.d3.scale.set(1.6, 1.6, 1.6); this.d3.rotation.z = flap * 0.5;
        this.d3.updateMatrix(); f.im.setMatrixAt(i, this.d3.matrix);
      }
      f.im.instanceMatrix.needsUpdate = true;
    }
    // barcaças: andam pelo rio, viram na ponta do trecho, balançam de leve
    for (const b of this.barges) {
      b.s += b.dir * 1.6 * dt;
      if (b.s <= 0 || b.s >= this.river.L) { b.dir *= -1; b.side *= -1; b.s = Math.max(0, Math.min(this.river.L, b.s)); }
      const q = this.river.at(b.s, b.p), h = q.h + (b.dir < 0 ? Math.PI : 0);
      const x = q.x + Math.cos(q.h) * b.side, z = q.z - Math.sin(q.h) * b.side;
      b.h = b.h === undefined ? h : angleLerp(b.h, h, Math.min(1, dt * 0.5));
      b.g.position.set(x, waterLevelAt(x, z) - 1.0 + Math.sin(t * 0.9 + b.side) * 0.05, z); b.g.rotation.set(Math.sin(t * 0.7) * 0.015, b.h, Math.sin(t * 0.8 + 1) * 0.02);
      b.g.visible = Math.hypot(x - p.x, z - p.z) < 600;
    }
    for (const c of this.oxen) { const near = Math.hypot(c.holder.position.x - p.x, c.holder.position.z - p.z) < 140; c.holder.visible = near; if (near) c.mixer.update(dt); }
    void lerp;
  }
}
