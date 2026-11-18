// As pontes de pedra de Vila Rica: a dos Contos (1744), na Rua de São José, sobre o córrego do Funil, e a de Antônio
// Dias (1755), sobre o córrego do mesmo nome — um arco só, de cantaria de quartzito, com os parapeitos baixos onde o
// povo se sentava. O tabuleiro segue a corcova da rua (o perfil vem do terreno), e os encontros entram no barranco:
// nada fica no ar. Dá para andar por cima e passar por baixo, dentro do córrego.
import * as THREE from 'three';
import { addRotBox } from '../comum/collision.js';
import { BRIDGES, STREETS, STREAMS, streetY, bedAt, polyDist } from './terrain.js';

export function buildBridges(scene, tex) {
  const P = tex.pbr, stone = P.pedra_clara || P.rock_wall_08;
  const mk = (rep, color = 0xd6c8ae) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.92 }); if (stone) { for (const [k, t] of [['map', stone.map], ['normalMap', stone.normalMap]]) { const c = t.clone(); c.repeat.set(rep, rep); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.needsUpdate = true; m[k] = c; } } return m; };
  const M = { wall: mk(0.5, 0xc4b498), cap: mk(0.9, 0xe0d4bc) }; // (cantaria de quartzito: cinza-amarelado, com a ferrugem do minério)
  const out = [];
  for (const B of BRIDGES) {
    const S = STREETS[B.street], C = STREAMS[B.stream];
    // o ângulo entre a rua e o córrego: quanto mais oblíquo, mais comprida a ponte
    const qc = polyDist(C.pts, B.x, B.z), a = C.pts[qc.seg], b = C.pts[qc.seg + 1], cl = Math.hypot(b[0] - a[0], b[1] - a[1]), cdx = (b[0] - a[0]) / cl, cdz = (b[1] - a[1]) / cl;
    const sin = Math.max(0.5, Math.abs(B.dx * cdz - B.dz * cdx));
    const half = (C.bank + 3.6) / sin, W = S.hw * 2 + 0.8, ry = Math.atan2(-B.dz, B.dx);
    const bed = bedAt(C, qc.s), deckAt = (u) => streetY(S, B.s + u) + 0.02;
    const span = (C.bank * 2 - 0.6) / sin, spring = bed + 0.35, crown = Math.min(spring + span * 0.42, deckAt(0) - 0.75), rise = Math.max(1.2, crown - spring);
    // a face da ponte: o perfil do tabuleiro em cima, a fundação embaixo e o arco vazado
    const shape = new THREE.Shape(), N = 24, foot = bed - 1.6;
    shape.moveTo(-half, foot);
    for (let i = 0; i <= N; i++) { const u = -half + (2 * half * i) / N; shape.lineTo(u, deckAt(u)); }
    shape.lineTo(half, foot); shape.lineTo(-half, foot);
    const hole = new THREE.Path(), hs = span / 2, R = (hs * hs + rise * rise) / (2 * rise), cy = spring + rise - R, a0 = Math.asin(hs / R); // (arco abatido: um pedaço de círculo)
    hole.moveTo(-hs, foot + 0.01); hole.lineTo(-hs, spring);
    for (let i = 0; i <= 20; i++) { const t = -a0 + (2 * a0 * i) / 20; hole.lineTo(Math.sin(t) * R, cy + Math.cos(t) * R); }
    hole.lineTo(hs, foot + 0.01); hole.lineTo(-hs, foot + 0.01);
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false, curveSegments: 1 });
    geo.translate(0, 0, -W / 2);
    const g = new THREE.Group(); g.position.set(B.x, 0, B.z); g.rotation.y = ry;
    const body = new THREE.Mesh(geo, M.wall); body.castShadow = body.receiveShadow = true; g.add(body);
    // as aduelas do arco: uma faixa de pedras mais claras contornando a boca, nas duas faces
    for (const sd of [-1, 1]) {
      const ring = new THREE.Shape(); const r1 = R + 0.42;
      for (let i = 0; i <= 20; i++) { const t = -a0 + (2 * a0 * i) / 20; const p = [Math.sin(t) * r1, cy + Math.cos(t) * r1]; if (i === 0) ring.moveTo(...p); else ring.lineTo(...p); }
      for (let i = 20; i >= 0; i--) { const t = -a0 + (2 * a0 * i) / 20; ring.lineTo(Math.sin(t) * R, cy + Math.cos(t) * R); }
      const rg = new THREE.ExtrudeGeometry(ring, { depth: 0.08, bevelEnabled: false }); rg.translate(0, 0, sd > 0 ? W / 2 - 0.02 : -W / 2 - 0.06);
      const rm = new THREE.Mesh(rg, M.cap); rm.castShadow = true; g.add(rm);
    }
    // os parapeitos: muretas de 0,85 m sobre o tabuleiro, com a capa de pedra por cima
    const ph = 0.85, pt = 0.4;
    for (const sd of [-1, 1]) {
      const sh = new THREE.Shape(); sh.moveTo(-half, deckAt(-half) - 0.3);
      for (let i = 0; i <= N; i++) { const u = -half + (2 * half * i) / N; sh.lineTo(u, deckAt(u) + ph); }
      for (let i = N; i >= 0; i--) { const u = -half + (2 * half * i) / N; sh.lineTo(u, deckAt(u) - 0.3); }
      const pg = new THREE.ExtrudeGeometry(sh, { depth: pt, bevelEnabled: false }); pg.translate(0, 0, sd > 0 ? W / 2 - pt : -W / 2);
      const pm = new THREE.Mesh(pg, M.wall); pm.castShadow = pm.receiveShadow = true; g.add(pm);
      const cap = new THREE.Shape(); cap.moveTo(-half - 0.05, deckAt(-half) + ph);
      for (let i = 0; i <= N; i++) { const u = -half - 0.05 + ((2 * half + 0.1) * i) / N; cap.lineTo(u, deckAt(Math.max(-half, Math.min(half, u))) + ph + 0.12); }
      for (let i = N; i >= 0; i--) { const u = -half - 0.05 + ((2 * half + 0.1) * i) / N; cap.lineTo(u, deckAt(Math.max(-half, Math.min(half, u))) + ph); }
      const cg = new THREE.ExtrudeGeometry(cap, { depth: pt + 0.12, bevelEnabled: false }); cg.translate(0, 0, sd > 0 ? W / 2 - pt - 0.06 : -W / 2 - 0.06);
      const cm = new THREE.Mesh(cg, M.cap); cm.castShadow = true; g.add(cm);
    }
    scene.add(g);
    // colisão: o tabuleiro em fatias de 0,6 m (cada uma na altura da rua), os parapeitos e os encontros maciços
    const c = Math.cos(ry), s = Math.sin(ry), at = (u, v) => [B.x + u * c + v * s, B.z - u * s + v * c];
    const n = Math.ceil((2 * half) / 0.6);
    for (let i = 0; i < n; i++) {
      const u = -half + (i + 0.5) * (2 * half / n), y = deckAt(u), [x, z] = at(u, 0);
      addRotBox(x, z, 2 * half / n + 0.05, W - 0.2, ry, y - 1.0, y, true);
      for (const sd of [-1, 1]) { const [px, pz] = at(u, sd * (W / 2 - pt / 2)); addRotBox(px, pz, 2 * half / n + 0.05, pt, ry, y - 0.2, y + ph + 0.1); }
    }
    for (const sd of [-1, 1]) { const u0 = sd * (hs + (half - hs) / 2), [x, z] = at(u0, 0); addRotBox(x, z, half - hs, W, ry, foot, deckAt(u0) - 1.0, true); }
    out.push({ ...B, group: g, half, W });
  }
  return out;
}
