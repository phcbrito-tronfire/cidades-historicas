// Objetos de Atenas que o explorador pode pegar com P (e comer/usar com R)
import * as THREE from 'three';
import { rr } from '../comum/util.js';
import { getTextures } from './textures.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });
const bronze = std(0xb07a3a, { metalness: 0.9, roughness: 0.35 });
const clay = std(0xb4623a, { roughness: 0.8 });
let redFig = null;
const lathe = (pts, mat, seg = 16) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);

export const ITEM_TYPES = {
  figos: { name: 'Figos da Ática', food: true, desc: 'Os figos da Ática eram famosos. Uma lei antiga chegou a proibir sua exportação — daí, contam, a palavra "sicofanta" ("o que mostra o figo"), o delator.', eat: 'Figo maduro, doce como mel do Himeto.' },
  azeitonas: { name: 'Azeitonas', food: true, desc: 'Azeitonas curtidas na salmoura: comida de todo dia, junto com o pão de cevada.', eat: 'Salgadinhas e firmes. Agora dá sede...' },
  peixe: { name: 'Peixe fresco', food: true, desc: 'Anchovas e sardinhas do Falero. Peixe era o "opson" preferido dos atenienses, e os vendedores de peixe tinham fama de careiros.', eat: 'Peixe assado na brasa com um fio de azeite. Delicioso!' },
  pao: { name: 'Pão de trigo', food: true, desc: 'O pão de trigo era mais caro que a "maza", o bolo de cevada do povo. As padeiras vendiam na ágora.', eat: 'Pão macio, ainda morno do forno.' },
  queijo: { name: 'Queijo de cabra', food: true, desc: 'Queijo fresco de cabra ou ovelha, muitas vezes temperado com mel e ervas.', eat: 'Queijo branco e salgado com um pouco de mel. Que combinação!' },
  vinho: { name: 'Jarro de vinho', food: true, desc: 'Vinho tinto da Ática ou de Quios, sempre misturado com água numa cratera. Beber vinho puro era coisa de bárbaro (ou de Dioniso).', eat: 'Um gole de vinho misturado com água, à moda grega.' },
  azeite: { name: 'Lécito de azeite', food: false, desc: 'Vasinho de azeite: usado na comida, nas lamparinas, como perfume e para untar o corpo antes dos exercícios no ginásio.' },
  kylix: { name: 'Kylix de Cálias', food: false, desc: 'Taça rasa de vinho, de figuras vermelhas, usada nos simpósios. No fundo, um desenho que aparece quando se acaba de beber.' },
  lanca: { name: 'Lança (dory)', food: false, desc: 'A lança do hoplita: uns 2,5 m de freixo, ponta de ferro e, atrás, uma ponteira de bronze (o "matador de lagartos") que também servia de arma.' },
  lira: { name: 'Lira', food: false, desc: 'A lira de sete cordas, com a caixa feita de casco de tartaruga. Todo menino ateniense de boa família aprendia a tocá-la na escola.' },
  aulos: { name: 'Aulos', food: false, desc: 'Flauta dupla de palheta, de som forte. Acompanhava os sacrifícios, os coros do teatro e dava o ritmo dos remadores nas trirremes.' },
  estrigil: { name: 'Estrígil', food: false, desc: 'Raspador curvo de bronze. Depois dos exercícios, os atletas passavam azeite no corpo e raspavam o suor e a poeira com ele.' },
  flores: { name: 'Guirlanda de flores', food: false, desc: 'Coroa de flores e ramos (mirto, violetas, rosas) usada nos simpósios, nas festas e nos sacrifícios.' },
  sandalias: { name: 'Sandálias de couro', food: false, desc: 'Sandálias de couro feitas sob medida pelos sapateiros da ágora — como Simão, amigo de Sócrates. Muitos atenienses, porém, andavam descalços.' },
  ceramica: { name: 'Ânfora pequena', food: false, desc: 'Ânfora de figuras negras para guardar vinho, azeite ou grãos. Os oleiros do Cerâmico exportavam para todo o Mediterrâneo.' },
};

function build(type) {
  const g = new THREE.Group();
  const add = (o, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  const M = (geo, mat) => new THREE.Mesh(geo, mat);
  switch (type) {
    case 'figos': for (let i = 0; i < 5; i++) add(M(new THREE.SphereGeometry(0.04, 8, 6), std(0x5a2e5a)), rr(-0.06, 0.06), 0.04 + (i > 3 ? 0.05 : 0), rr(-0.06, 0.06)).scale.y = 1.2; break;
    case 'azeitonas': add(lathe([[0.04, 0], [0.11, 0.02], [0.12, 0.06], [0.1, 0.07]], clay)); for (let i = 0; i < 9; i++) add(M(new THREE.SphereGeometry(0.018, 6, 5), std(0x3a4a1e)), rr(-0.06, 0.06), 0.07, rr(-0.06, 0.06)).scale.z = 1.4; break;
    case 'peixe': add(M(new THREE.SphereGeometry(0.05, 8, 6), std(0xb8c4c8, { metalness: 0.4, roughness: 0.35 })), 0, 0.04, 0).scale.set(0.8, 0.6, 3.2); break;
    case 'pao': add(M(new THREE.SphereGeometry(0.1, 10, 8), std(0xc8904c)), 0, 0.05, 0).scale.set(1.2, 0.55, 1.2); break;
    case 'queijo': add(M(new THREE.CylinderGeometry(0.09, 0.1, 0.07, 14), std(0xf0e8d0, { roughness: 0.9 })), 0, 0.035, 0); break;
    case 'vinho': add(lathe([[0.03, 0], [0.12, 0.08], [0.13, 0.2], [0.06, 0.3], [0.04, 0.36], [0.06, 0.38]], std(0x16100c, { roughness: 0.3, side: THREE.DoubleSide }))); break;
    case 'azeite': add(lathe([[0.03, 0], [0.05, 0.02], [0.06, 0.12], [0.05, 0.16], [0.02, 0.18], [0.02, 0.24], [0.035, 0.26]], std(0xe8dcc0, { roughness: 0.5 }))); break;
    case 'kylix': {
      redFig ??= std(0xffffff, { map: getTextures().redFigure, roughness: 0.3, side: THREE.DoubleSide });
      add(lathe([[0.03, 0], [0.035, 0.05], [0.015, 0.06], [0.06, 0.07], [0.15, 0.1], [0.16, 0.11]], redFig, 24));
      for (const s of [-1, 1]) add(M(new THREE.TorusGeometry(0.03, 0.007, 5, 10, Math.PI), redFig), s * 0.17, 0.1, 0).rotation.set(Math.PI / 2, 0, s > 0 ? 0 : Math.PI);
    } break;
    case 'lanca': add(M(new THREE.CylinderGeometry(0.016, 0.016, 2.4, 6), std(0x8a6a44)), 0, 1.2, 0); add(M(new THREE.ConeGeometry(0.035, 0.22, 6), bronze), 0, 2.5, 0); add(M(new THREE.ConeGeometry(0.02, 0.12, 6), bronze), 0, -0.04, 0).rotation.x = Math.PI; break;
    case 'lira': {
      add(M(new THREE.SphereGeometry(0.1, 12, 8), std(0x6a4a2a, { roughness: 0.5 })), 0, 0.08, 0).scale.set(1, 1, 0.45);
      for (const s of [-1, 1]) add(M(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), std(0x8a6a44)), s * 0.08, 0.28, 0).rotation.z = -s * 0.25;
      add(M(new THREE.CylinderGeometry(0.01, 0.01, 0.22, 6), std(0x8a6a44)), 0, 0.42, 0).rotation.z = Math.PI / 2;
      for (let i = 0; i < 7; i++) add(M(new THREE.CylinderGeometry(0.0015, 0.0015, 0.3, 3), std(0xf0e8d0)), -0.045 + i * 0.015, 0.27, 0.03);
    } break;
    case 'aulos': for (const s of [-1, 1]) add(M(new THREE.CylinderGeometry(0.008, 0.012, 0.45, 6), std(0xd8c8a0)), s * 0.02, 0.22, 0).rotation.z = s * 0.08; break;
    case 'estrigil': add(M(new THREE.TorusGeometry(0.1, 0.012, 5, 14, Math.PI * 0.9), bronze), 0, 0.06, 0).rotation.x = Math.PI / 2; add(M(new THREE.BoxGeometry(0.02, 0.02, 0.12), bronze), 0.1, 0.06, -0.05); break;
    case 'flores': { const t = add(M(new THREE.TorusGeometry(0.1, 0.022, 6, 18), std(0x4a6a2a)), 0, 0.03, 0); t.rotation.x = Math.PI / 2; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; add(M(new THREE.SphereGeometry(0.02, 6, 5), std([0xe8c0d0, 0x8a5ab8, 0xf0e8d0][i % 3])), Math.cos(a) * 0.1, 0.05, Math.sin(a) * 0.1); } } break;
    case 'sandalias': for (const s of [-1, 1]) { add(M(new THREE.BoxGeometry(0.09, 0.012, 0.25), std(0x7a5230)), s * 0.06, 0.006, 0); add(M(new THREE.TorusGeometry(0.04, 0.006, 4, 10, Math.PI), std(0x7a5230)), s * 0.06, 0.012, 0.03); } break;
    case 'ceramica': {
      const T = getTextures(); const mat = std(0xffffff, { map: T.redFigure, roughness: 0.35, side: THREE.DoubleSide });
      add(lathe([[0.03, 0], [0.08, 0.04], [0.13, 0.16], [0.12, 0.3], [0.05, 0.4], [0.045, 0.48], [0.07, 0.5]], mat, 18));
      for (const s of [-1, 1]) add(M(new THREE.TorusGeometry(0.05, 0.01, 5, 10, Math.PI), mat), s * 0.09, 0.42, 0).rotation.set(0, Math.PI / 2, s > 0 ? -1.2 : 1.2);
    } break;
  }
  return g;
}

export class Items {
  constructor(scene, glowTex) {
    this.scene = scene; this.list = [];
    this.sparkMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffe9a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  }
  spawn(type, x, y, z, ry = 0) {
    const mesh = build(type);
    mesh.position.set(x, y, z); mesh.rotation.y = ry;
    if (type === 'lanca') { mesh.rotation.z = Math.PI / 2 - 0.05; mesh.position.y += 0.03; }
    const spark = new THREE.Sprite(this.sparkMat); spark.scale.setScalar(0.5); spark.position.y = 0.35; spark.layers.set(1);
    mesh.add(spark);
    this.scene.add(mesh);
    const it = { type, mesh, spark, held: false, home: new THREE.Vector3(x, y, z), ...ITEM_TYPES[type] };
    this.list.push(it);
    return it;
  }
  nearest(pos, maxD = 2.2) {
    let best = null, bd = maxD * maxD;
    for (const it of this.list) {
      if (it.held) continue;
      const p = it.mesh.position; const d = (p.x - pos.x) ** 2 + (p.z - pos.z) ** 2 + ((p.y - pos.y - 0.5) * 0.5) ** 2;
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }
  attach(it, hand) {
    it.held = true; it.spark.visible = false;
    hand.add(it.mesh);
    it.mesh.position.set(0.06, -0.08, 0); it.mesh.rotation.set(0, 0, 0);
    if (it.type === 'lanca') it.mesh.position.set(0.03, -1.1, 0);
    else if (it.type === 'vinho' || it.type === 'ceramica') it.mesh.position.set(0.05, -0.36, 0);
    it.mesh.scale.setScalar(1);
  }
  drop(it, x, y, z, ry) {
    it.held = false; it.spark.visible = true;
    this.scene.add(it.mesh); it.mesh.scale.setScalar(1);
    it.mesh.position.set(x, y, z); it.mesh.rotation.set(0, ry, 0);
    if (it.type === 'lanca') { it.mesh.rotation.z = Math.PI / 2 - 0.05; it.mesh.position.y += 0.03; }
  }
  remove(it) { it.mesh.parent?.remove(it.mesh); this.list = this.list.filter((i) => i !== it); }
  update(t, playerPos) {
    for (const it of this.list) {
      if (it.held) continue;
      const d2 = (it.mesh.position.x - playerPos.x) ** 2 + (it.mesh.position.z - playerPos.z) ** 2;
      it.spark.visible = d2 < 100;
      it.spark.material.opacity = 0.5 + Math.sin(t * 3 + it.home.x) * 0.3;
    }
  }
}
