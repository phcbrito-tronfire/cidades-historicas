// A katana do explorador-samurai (roupa ganha ao concluir o Japão): lâmina curva de aço com o fio claro (hamon),
// habaki dourado, tsuba de ferro, cabo com a amarração em losangos (tsuka-ito) sobre a pele de arraia branca, e a
// bainha laqueada de preto. Também a wakizashi (a curta) e o rastro de luz dos golpes.
// Eixo local: +y = ao longo da lâmina, a partir da tsuba (y = 0); o cabo fica em -y; o fio olha para +z.
import * as THREE from 'three';

const cache = {};
function tex(key, draw, w = 64, h = 256) {
  if (cache[key]) return cache[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return (cache[key] = t);
}
// tsuka-ito: a fita de seda escura cruzada em losangos, com a pele de arraia branca aparecendo nos vãos
const wrapTex = () => tex('ito', (x, w, h) => {
  x.fillStyle = '#e8e2d2'; x.fillRect(0, 0, w, h); // samegawa
  for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(160,150,130,${Math.random() * 0.4})`; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.5, 0, 7); x.fill(); }
  x.strokeStyle = '#151820'; x.lineWidth = 13; const step = 32;
  for (let y = -h; y < h * 2; y += step) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y + step); x.stroke(); x.beginPath(); x.moveTo(0, y + step); x.lineTo(w, y); x.stroke(); }
});
// lâmina: aço polido, o fio mais claro e a linha ondulada do hamon
const bladeTex = () => tex('hamon', (x, w, h) => {
  const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#8f969c'); g.addColorStop(0.55, '#c9cfd4'); g.addColorStop(1, '#f2f4f6');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = 'rgba(255,255,255,0.55)'; x.beginPath(); x.moveTo(w, 0);
  for (let y = 0; y <= h; y += 8) x.lineTo(w * (0.66 + Math.sin(y * 0.11) * 0.06 + Math.sin(y * 0.031) * 0.04), y);
  x.lineTo(w, h); x.closePath(); x.fill();
});

// a lâmina curva (shinogi-zukuri): seção de cinco lados — fio, as duas arestas da shinogi e as duas da costa (mune)
function bladeGeometry(L, sori) {
  const N = 26, pos = [], uv = [], idx = [];
  const at = (t) => { const y = t * L, z = -sori * t * t; return { y, z, w: 0.031 - 0.008 * t, th: 0.0074 - 0.0022 * t }; };
  for (let i = 0; i <= N; i++) {
    const t = i / N, c = at(t), tip = t > 0.92 ? (t - 0.92) / 0.08 : 0; // a ponta (kissaki) se fecha
    const w = c.w * (1 - tip * 0.92), th = c.th * (1 - tip * 0.9), zc = c.z + tip * c.w * 0.2;
    const sec = [[0, w / 2], [th / 2, -w / 2 + w * 0.32], [th * 0.36, -w / 2], [-th * 0.36, -w / 2], [-th / 2, -w / 2 + w * 0.32]];
    sec.forEach(([x, z], k) => { pos.push(x, c.y, zc + z); uv.push(k === 0 ? 1 : k === 1 || k === 4 ? 0.62 : 0.1, t * 4); });
  }
  for (let i = 0; i < N; i++) for (let k = 0; k < 5; k++) { const a = i * 5 + k, b = i * 5 + ((k + 1) % 5), c = a + 5, d = b + 5; idx.push(a, b, d, a, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;
}
const curveAlong = (L, sori, y0 = 0) => new THREE.CatmullRomCurve3([0, 0.25, 0.5, 0.75, 1].map((t) => new THREE.Vector3(0, y0 + t * L, -sori * t * t)));

// a espada inteira (lâmina + guarnições) e a bainha separada
export function swordParts({ L = 0.72, handle = 0.27, sori = 0.022, short = false } = {}) {
  const steel = new THREE.MeshStandardMaterial({ map: bladeTex(), metalness: 0.92, roughness: 0.16 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2622, metalness: 0.7, roughness: 0.45 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc89a44, metalness: 0.9, roughness: 0.3 });
  const wrap = new THREE.MeshStandardMaterial({ map: wrapTex(), roughness: 0.8 }); wrap.map.repeat.set(1, short ? 2 : 3);
  const lacquer = new THREE.MeshStandardMaterial({ color: 0x0d0b0c, roughness: 0.22, metalness: 0.15 });
  const sword = new THREE.Group(), add = (geo, mat, y = 0) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = true; sword.add(m); return m; };
  add(bladeGeometry(L, sori), steel, 0.012);
  add(new THREE.BoxGeometry(0.012, 0.03, 0.036), gold, 0.015); // habaki
  { const ts = add(new THREE.CylinderGeometry(short ? 0.032 : 0.04, short ? 0.032 : 0.04, 0.007, 24), iron, 0); ts.scale.z = 0.86; } // tsuba
  add(new THREE.CylinderGeometry(0.016, 0.016, 0.008, 14), gold, -0.006); // seppa e fuchi
  { const tk = add(new THREE.CylinderGeometry(0.0145, 0.0158, handle, 14), wrap, -handle / 2 - 0.01); tk.scale.z = 0.78; } // tsuka
  add(new THREE.CylinderGeometry(0.0152, 0.0135, 0.018, 14), iron, -handle - 0.018).scale.z = 0.78; // kashira
  const saya = new THREE.Group();
  { const tube = new THREE.Mesh(new THREE.TubeGeometry(curveAlong(L + 0.035, sori, -0.005), 20, 0.0175, 10), lacquer); tube.scale.x = 0.62; tube.castShadow = true; saya.add(tube); }
  { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.0185, 0.0185, 0.03, 12), new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.5 })); r.scale.x = 0.66; r.position.y = 0.01; saya.add(r); } // koiguchi
  { const k = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), iron); k.scale.set(0.62, 1.2, 1); k.position.set(0, L + 0.03, -sori); saya.add(k); } // kojiri
  { const s = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0045, 6, 14), new THREE.MeshStandardMaterial({ color: 0x2a3a6a, roughness: 0.9 })); s.rotation.x = Math.PI / 2; s.scale.x = 0.7; s.position.y = 0.09; saya.add(s); } // kurikata e o sageo
  const tip = new THREE.Object3D(); tip.position.set(0, L, -sori); sword.add(tip);
  const mid = new THREE.Object3D(); mid.position.set(0, L * 0.35, -sori * 0.12); sword.add(mid);
  return { sword, saya, tip, mid };
}

// rastro do golpe: uma fita de luz entre o meio e a ponta da lâmina, que some depressa
export function makeTrail(scene) {
  const N = 14, pos = new Float32Array(N * 2 * 3), col = new Float32Array(N * 2 * 3), idx = [];
  for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.layers.set(1); mesh.visible = false; scene.add(mesh);
  const pts = []; const A = new THREE.Vector3(), B = new THREE.Vector3();
  return {
    // tipObj/midObj: os pontos da lâmina; on: está golpeando agora
    update(tipObj, midObj, on) {
      if (on && tipObj) { tipObj.getWorldPosition(A); midObj.getWorldPosition(B); pts.unshift([A.clone(), B.clone(), 1]); }
      for (const p of pts) p[2] -= 0.16;
      while (pts.length > N || (pts.length && pts[pts.length - 1][2] <= 0)) pts.pop();
      mesh.visible = pts.length > 1; if (!mesh.visible) return;
      for (let i = 0; i < N; i++) { const p = pts[Math.min(i, pts.length - 1)], k = Math.max(0, p[2]) * (1 - i / N);
        pos.set([p[0].x, p[0].y, p[0].z, p[1].x, p[1].y, p[1].z], i * 6); col.set([0.9 * k, 0.95 * k, 1.0 * k, 0.15 * k, 0.17 * k, 0.2 * k], i * 6); }
      g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.computeBoundingSphere();
    },
  };
}
