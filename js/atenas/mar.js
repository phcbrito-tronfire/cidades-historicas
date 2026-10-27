// O fundo da baía do Falero: pradarias de posidônia balançando, estrelas-do-mar, ouriços nas pedras do raso,
// ânforas perdidas e a carga de um navio que levava colunas de mármore do Pentélico (naufrágios assim existiram:
// os tambores de coluna e os capitéis iam desmontados no porão). E os bichos: cardumes, pargos, golfinhos,
// tartarugas e águas-vivas (estas queimam).
import * as THREE from 'three';
import { terrainHeight, coastPoint, WATER_Y } from './terrain.js';
import { SeaLife, scatterStatic, urchinGeometry } from '../comum/fauna.js';
import { mulberry32 } from '../comum/util.js';
import { addBox } from '../comum/collision.js';

const depthAt = (x, z) => WATER_Y - terrainHeight(x, z);

// um ponto de mar com a profundidade pedida, entre a praia e o largo
function seaSpot(R, a0, a1, o0, o1, d0, d1) {
  for (let i = 0; i < 40; i++) {
    const p = coastPoint(a0 + R() * (a1 - a0), o0 + R() * (o1 - o0)), d = depthAt(p.x, p.z);
    if (d >= d0 && d <= d1) return p;
  }
  return null;
}

export async function buildSea(scene, tex, { onSting }) {
  const R = mulberry32(4242);
  let grass = null;
  // ---------------- posidônia (capim marinho, endêmico do Mediterrâneo) ----------------
  {
    const blades = [];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.PlaneGeometry(0.06, 0.9, 1, 4); g.translate(0, 0.45, 0);
      const p = g.attributes.position; for (let j = 0; j < p.count; j++) { const y = p.getY(j); p.setZ(j, y * y * 0.25); }
      g.rotateY((i / 5) * Math.PI + R() * 0.4); g.scale(1, 0.7 + R() * 0.6, 1); blades.push(g);
    }
    const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
    const tuft = mergeGeometries(blades);
    const mat = new THREE.MeshStandardMaterial({ color: 0x3f6a32, roughness: 0.8, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = mat.userData.uTime = { value: 0 };
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 ip = instanceMatrix[3];
        float sw = sin(uTime * 1.3 + ip.x * 0.35 + ip.z * 0.21) * 0.22 + sin(uTime * 2.7 + ip.x) * 0.05;
        transformed.x += sw * position.y * position.y; transformed.z += sw * 0.6 * position.y * position.y;`);
    };
    const pts = [];
    for (let i = 0; i < 3000 && pts.length < 3200; i++) {
      // em manchas (as pradarias crescem em tapetes, com clareiras de areia)
      const c = seaSpot(R, -100, 320, 18, 150, 2.2, 14); if (!c) continue;
      for (let j = 0; j < 10; j++) { const x = c.x + (R() - 0.5) * 7, z = c.z + (R() - 0.5) * 7; if (depthAt(x, z) > 1.8) pts.push([x, z]); }
    }
    const im = new THREE.InstancedMesh(tuft, mat, pts.length), d = new THREE.Object3D();
    pts.forEach(([x, z], i) => { d.position.set(x, terrainHeight(x, z) - 0.05, z); d.rotation.y = R() * 6.3; d.scale.set(1.2 + R() * 0.8, 1 + R() * 0.9, 1.2 + R() * 0.8); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    im.computeBoundingSphere(); im.receiveShadow = true; scene.add(im);
    grass = mat;
  }
  // ---------------- estrelas-do-mar, ânforas e ouriços ----------------
  const stars = []; for (let i = 0; i < 70; i++) { const p = seaSpot(R, -100, 320, 10, 140, 1.2, 12); if (p) stars.push({ x: p.x, y: terrainHeight(p.x, p.z) + 0.01, z: p.z, ry: R() * 6.3, s: 0.22 + R() * 0.14 }); }
  scatterStatic(scene, 'estrela', stars);
  const urchinPts = [];
  {
    const geo = urchinGeometry(), mat = new THREE.MeshStandardMaterial({ color: 0x3a1838, roughness: 0.7 });
    for (let i = 0; i < 110; i++) { const p = seaSpot(R, -140, 300, 2, 60, 0.35, 4); if (p) urchinPts.push(p); }
    const im = new THREE.InstancedMesh(geo, mat, urchinPts.length), d = new THREE.Object3D();
    urchinPts.forEach((p, i) => { d.position.set(p.x, terrainHeight(p.x, p.z) + 0.02, p.z); d.rotation.set(0, R() * 6, 0); d.scale.setScalar(0.8 + R() * 0.6); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    im.computeBoundingSphere(); scene.add(im);
  }
  // ---------------- recifes: blocos de calcário no fundo, cobertos de limo, com esponjas e anêmonas coloridas ----
  {
    const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const k = 0.75 + Math.sin(v.x * 3.1 + v.z * 2.3) * 0.12 + Math.cos(v.y * 4.2) * 0.1; p.setXYZ(i, v.x * k, v.y * k * 0.7, v.z * k); }
    g.computeVertexNormals();
    const rset = tex.pbr?.rock_face_03 || {};
    const rock = new THREE.MeshStandardMaterial({ map: rset.map || null, normalMap: rset.normalMap || null, color: 0x8a8f72, roughness: 0.95 });
    const pts = [];
    for (let i = 0; i < 70; i++) { // manchas de recife
      const c = seaSpot(R, -40, 260, 6, 120, 1.6, 16); if (!c) continue;
      const n = 4 + Math.floor(R() * 9);
      for (let j = 0; j < n; j++) { const x = c.x + (R() - 0.5) * 9, z = c.z + (R() - 0.5) * 9; if (depthAt(x, z) > 1.2) pts.push([x, z, 0.4 + R() * R() * 2.2]); }
    }
    const im = new THREE.InstancedMesh(g, rock, pts.length), d = new THREE.Object3D();
    pts.forEach(([x, z, sc], i) => { d.position.set(x, terrainHeight(x, z) + sc * 0.15, z); d.rotation.set(R() * 0.6, R() * 6.3, R() * 0.6); d.scale.set(sc * (0.8 + R() * 0.5), sc, sc * (0.8 + R() * 0.5)); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    im.computeBoundingSphere(); im.receiveShadow = true; im.castShadow = true; scene.add(im);
    // esponjas e anêmonas (pontinhos de cor sobre as pedras)
    const sg = new THREE.SphereGeometry(0.12, 7, 5), cols = [0xe8a23a, 0xc8482e, 0xd86ab0, 0xe8d24a, 0x6ab0d8];
    for (const [ci, col] of cols.entries()) {
      const sel = pts.filter((_, i) => i % cols.length === ci);
      const sm = new THREE.InstancedMesh(sg, new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 }), sel.length * 2);
      let k = 0; for (const [x, z, sc] of sel) for (let q = 0; q < 2; q++) { d.position.set(x + (R() - 0.5) * sc, terrainHeight(x, z) + sc * 0.55, z + (R() - 0.5) * sc); d.rotation.set(0, 0, 0); d.scale.set(1 + R(), 0.6 + R() * 0.8, 1 + R()); d.updateMatrix(); sm.setMatrixAt(k++, d.matrix); }
      sm.count = k; sm.computeBoundingSphere(); scene.add(sm);
    }
  }
  // ---------------- a carga de colunas ----------------
  let site = null;
  for (let off = 38; off < 90 && !site; off += 4) for (let a = 110; a < 200 && !site; a += 6) { const p = coastPoint(a, off), dd = depthAt(p.x, p.z); if (dd > 4.5 && dd < 9) site = p; }
  const amph = [];
  if (site) {
    const marble = new THREE.MeshStandardMaterial({ map: tex.plainMarble || null, color: 0xc8d0bc, roughness: 0.9 });
    const algae = new THREE.MeshStandardMaterial({ color: 0x5a6a3a, roughness: 1 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x2a2218, roughness: 1 });
    const g = new THREE.Group();
    const y0 = (x, z) => terrainHeight(site.x + x, site.z + z);
    const drum = new THREE.CylinderGeometry(0.82, 0.82, 1.3, 20);
    for (let i = 0; i < 9; i++) {
      const x = (R() - 0.5) * 14, z = (R() - 0.5) * 8, lying = R() < 0.7;
      const m = new THREE.Mesh(drum, marble);
      m.position.set(site.x + x, y0(x, z) + (lying ? 0.7 : 0.6), site.z + z);
      if (lying) m.rotation.set(0, R() * 3, Math.PI / 2); else m.rotation.y = R() * 3;
      g.add(m);
      addBox(site.x + x, site.z + z, 1.6, 1.6, y0(x, z) - 1, y0(x, z) + 1.3);
    }
    // dois capitéis dóricos (equino + ábaco), um deles virado
    for (let i = 0; i < 2; i++) {
      const cap = new THREE.Group();
      const ech = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.8, 0.45, 20), marble); ech.position.y = 0.22;
      const ab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.32, 2.2), marble); ab.position.y = 0.6;
      cap.add(ech, ab);
      const x = i ? 6 : -5, z = i ? -3 : 2.5;
      cap.position.set(site.x + x, y0(x, z) + (i ? 0.75 : 0), site.z + z); if (i) cap.rotation.set(Math.PI, 0.5, 0.15);
      g.add(cap);
    }
    // costelas do casco apodrecido, meio enterradas
    for (let i = 0; i < 7; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.09, 4, 10, Math.PI * 0.7), wood);
      const x = -6 + i * 2;
      rib.position.set(site.x + x, y0(x, 0) - 0.6, site.z); rib.rotation.set(0, Math.PI / 2, Math.PI * 0.15 + 0.1); g.add(rib);
    }
    // limo e algas nas pedras
    for (let i = 0; i < 26; i++) { const x = (R() - 0.5) * 16, z = (R() - 0.5) * 10; const b = new THREE.Mesh(new THREE.SphereGeometry(0.25 + R() * 0.35, 6, 4), algae); b.position.set(site.x + x, y0(x, z), site.z + z); b.scale.y = 0.4; g.add(b); }
    g.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
    scene.add(g);
    for (let i = 0; i < 18; i++) { const x = (R() - 0.5) * 18, z = (R() - 0.5) * 12; amph.push({ x: site.x + x, y: y0(x, z) - 0.15, z: site.z + z, rx: (R() - 0.5) * 2.4, ry: R() * 6.3, rz: Math.PI / 2 + (R() - 0.5) * 0.6, s: 0.8 + R() * 0.25 }); }
  }
  for (let i = 0; i < 14; i++) { const p = seaSpot(R, -60, 300, 30, 150, 3, 14); if (p) amph.push({ x: p.x, y: terrainHeight(p.x, p.z) - 0.1, z: p.z, rx: (R() - 0.5) * 2, ry: R() * 6.3, rz: Math.PI / 2, s: 0.8 + R() * 0.3 }); }
  scatterStatic(scene, 'anfora_mar', amph);

  // ---------------- bichos ----------------
  const life = new SeaLife(scene, {
    waterY: WATER_Y, floorAt: terrainHeight, onSting,
    seaPoint: (r, kind) => kind === 'dolphin' ? seaSpot(r, -100, 320, 90, 260, 8, 99)
      : kind === 'jelly' ? seaSpot(r, -60, 320, 25, 150, 3, 30)
      : kind === 'turtle' ? seaSpot(r, -60, 300, 20, 110, 2.5, 20)
      // peixes: a maior parte na baía do Falero, onde se nada e mergulha (o resto espalhado pelo golfo)
      : r() < 0.7 ? seaSpot(r, 20, 190, 8, 75, 1.8, 14) : seaSpot(r, -100, 320, 15, 150, 2.5, 25),
  });
  life.populate([['cardume', 14, 4, 'school'], ['pargo', 26, 0.55, 'fish'], ['golfinho', 4, 2.3, 'dolphin'], ['tartaruga', 5, 1.1, 'turtle'], ['aguaviva', 12, 0.45, 'jelly']]);

  return {
    life, site, urchins: urchinPts,
    update(dt, t, player) { if (grass?.userData.uTime) grass.userData.uTime.value = t; life.update(dt, t, player); },
  };
}
