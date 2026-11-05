// O arco longo japonês (yumi): 2,2 m, assimétrico — o punho fica a um terço de baixo, não no meio.
// Eixos locais: +y ao longo do arco (para cima), +x para o alvo (a "barriga" do arco aponta para lá);
// a origem é o punho. As pontas recuam para o lado de quem atira; a corda liga as pontas.
import * as THREE from 'three';

export const YUMI = { top: 1.43, bottom: -0.78, mid: 0.325, brace: 0.16 };
const half = (YUMI.top - YUMI.bottom) / 2;
export const tipX = (bend) => -bend * ((YUMI.top - YUMI.mid) ** 2 - YUMI.mid ** 2) / (half * half);

let GEO = null, MAT = null, GRIP = null, GRIPM = null;
function shared() {
  if (GEO) return;
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const y = YUMI.bottom + (i / 24) * (YUMI.top - YUMI.bottom);
    let x = -YUMI.brace * ((y - YUMI.mid) ** 2 - YUMI.mid ** 2) / (half * half);
    const e = Math.max(0, (Math.abs(y - YUMI.mid) - half * 0.86) / (half * 0.14)); x += e * e * 0.05; // as pontas viram de leve para a frente (a curva dupla do yumi)
    pts.push(new THREE.Vector3(x, y, 0));
  }
  GEO = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.012, 5, false);
  MAT = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.45 }); // bambu laqueado escuro
  GRIP = new THREE.CylinderGeometry(0.019, 0.019, 0.15, 6); GRIPM = new THREE.MeshStandardMaterial({ color: 0x8a2a1a, roughness: 0.8 }); // o punho de couro
}

// arco com corda ajustável: setDraw(nock) recebe o ponto da corda (local do arco) ou null (corda em repouso)
export function makeYumi() {
  shared();
  const g = new THREE.Group();
  const limb = new THREE.Mesh(GEO, MAT); limb.castShadow = true; g.add(limb);
  const grip = new THREE.Mesh(GRIP, GRIPM); grip.position.set(0, 0.04, 0); g.add(grip);
  const sp = new Float32Array(9), sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const string = new THREE.Line(sg, new THREE.LineBasicMaterial({ color: 0xf2ecd8 })); string.frustumCulled = false; g.add(string);
  g.userData.setDraw = (nock) => {
    const pull = nock ? Math.max(0, tipX(YUMI.brace) - nock.x) : 0; // quanto a corda saiu do repouso
    const bend = YUMI.brace + Math.min(0.24, pull * 0.3); limb.scale.x = bend / YUMI.brace;
    const tx = tipX(bend), n = nock || new THREE.Vector3(tx, 0.03, 0);
    sp.set([tx, YUMI.top - 0.02, 0, nock ? n.x : tx, n.y, n.z, tx, YUMI.bottom + 0.02, 0]); sg.attributes.position.needsUpdate = true;
  };
  g.userData.setDraw(null);
  return g;
}

// a flecha (ya): haste de bambu, penas escuras perto do encaixe; +y da ponta, origem no encaixe da corda
export function makeArrow() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.98, 4), new THREE.MeshStandardMaterial({ color: 0xc8b078, roughness: 0.7 })); shaft.position.y = 0.49; g.add(shaft);
  const fm = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.018, 0.13), fm); f.position.y = 0.1; f.rotation.y = (i / 3) * Math.PI; f.translateX(0.01); g.add(f); }
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.03, 4), new THREE.MeshStandardMaterial({ color: 0x8a8c90, metalness: 0.8, roughness: 0.3 })); tip.position.y = 0.995; g.add(tip);
  return g;
}
