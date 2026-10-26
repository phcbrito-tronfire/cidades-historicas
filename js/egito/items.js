// Objetos que o explorador pode pegar com P (e comer/usar com R)
import * as THREE from 'three';
import { gold } from '../comum/mixamo.js';
import { rr } from '../comum/util.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });
const bronze = std(0xb87333, { metalness: 0.9, roughness: 0.35 });

export const ITEM_TYPES = {
  khopesh: { name: 'Khopesh', food: false, desc: 'Espada curva de bronze, em forma de foice. Era arma de elite e símbolo de poder: o faraó aparece empunhando-a nos relevos dos templos.' },
  lanca: { name: 'Lança', food: false, desc: 'Lança de madeira com ponta de bronze — a arma mais comum da infantaria egípcia, usada junto com o escudo de couro.' },
  cerveja: { name: 'Jarro de cerveja', food: true, desc: 'Cerveja de cevada, grossa e nutritiva. Trabalhadores recebiam rações diárias de pão e cerveja como parte do pagamento.', eat: 'Você tomou um gole da cerveja morna e grossa. Tem gosto de pão!' },
  agua: { name: 'Jarro de água', food: true, desc: 'Jarro de barro poroso: a água evapora pelas paredes e mantém o interior fresco — a "geladeira" do antigo Egito.', eat: 'Água fresca do jarro de barro. Que alívio neste calor!' },
  pao: { name: 'Pão de emmer', food: true, desc: 'O trigo emmer era moído em pedra — e um pouco de areia sempre ia junto, desgastando os dentes dos egípcios.', eat: 'Pão quentinho... e crocante. Opa, um grãozinho de areia!' },
  figo: { name: 'Figos', food: true, desc: 'Figos, tâmaras e uvas eram as frutas do dia a dia. Os figos aparecem até em pinturas de túmulos, em cestos de oferenda.', eat: 'Figos maduros e doces como mel.' },
  roma: { name: 'Romã', food: true, desc: 'A romã chegou da Ásia poucos séculos antes e virou moda nos jardins dos nobres do Novo Império.', eat: 'As sementes vermelhas da romã estalam na boca. Delícia!' },
  tamaras: { name: 'Tâmaras', food: true, desc: 'Tâmaras das palmeiras do Nilo: comidas frescas ou secas, e usadas para adoçar bolos e cerveja.', eat: 'Tâmaras secas, puro açúcar. Energia para explorar!' },
  peixe: { name: 'Peixe seco', food: true, desc: 'Tilápias e bagres eram abertos, salgados e secos ao sol. Comida barata do povo — os sacerdotes evitavam certos peixes.', eat: 'Peixe seco e salgado... vai precisar de muita água depois.' },
  papiro: { name: 'Rolo de papiro', food: false, desc: 'Feito com o miolo do caule do papiro, em tiras cruzadas e prensadas. Os rolos eram colados em sequência e podiam ter vários metros.' },
  ankh: { name: 'Amuleto Ankh', food: false, desc: 'O ankh, "chave da vida", era o sinal da vida eterna. Os deuses o seguram junto ao nariz do faraó: o sopro da vida.' },
  lotus: { name: 'Flor de lótus azul', food: false, desc: 'O lótus azul fecha à noite e reabre ao amanhecer, por isso simbolizava o renascimento do sol. Seu perfume enfeitava os banquetes.' },
  sistro: { name: 'Sistro', food: false, desc: 'Chocalho sagrado de bronze, tocado por sacerdotisas nos rituais de Hathor e Ísis. Seu som acalmava os deuses.' },
  cebola: { name: 'Cebolas', food: true, desc: 'Cebola, alho e alho-poró estavam em toda mesa. Heródoto conta que os construtores das pirâmides comiam muitas cebolas.', eat: 'Você mordeu uma cebola crua. Os olhos lacrimejam... muito egípcio!' },
};

function build(type) {
  const g = new THREE.Group();
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  switch (type) {
    case 'khopesh': {
      add(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 6), std(0x3a2414), 0, 0.08, 0);
      add(new THREE.BoxGeometry(0.035, 0.22, 0.012), bronze, 0, 0.27, 0);
      const bl = add(new THREE.TorusGeometry(0.2, 0.022, 4, 14, Math.PI * 0.85), bronze, 0.19, 0.38, 0);
      bl.rotation.z = 0.35; bl.scale.z = 0.45;
    } break;
    case 'lanca': add(new THREE.CylinderGeometry(0.016, 0.016, 1.9, 6), std(0x7a5a36), 0, 0.95, 0); add(new THREE.ConeGeometry(0.035, 0.18, 6), bronze, 0, 1.98, 0); break;
    case 'cerveja': case 'agua': {
      const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.03 + Math.sin(t * Math.PI) * 0.14 + (t > 0.85 ? 0.03 : 0), t * 0.42)); }
      add(new THREE.LatheGeometry(pts, 12), std(type === 'agua' ? 0xc7a37a : 0xa4552f, { side: THREE.DoubleSide }));
      if (type === 'cerveja') add(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), std(0x8a8a6a), 0, 0.43, 0);
    } break;
    case 'pao': add(new THREE.SphereGeometry(0.1, 10, 8), std(0xc88a48), 0, 0.06, 0).scale.set(1.3, 0.6, 1); break;
    case 'figo': for (let i = 0; i < 4; i++) add(new THREE.SphereGeometry(0.045, 8, 6), std(0x4d2a62), rr(-0.05, 0.05), 0.04 + (i > 2 ? 0.05 : 0), rr(-0.05, 0.05)); break;
    case 'roma': add(new THREE.SphereGeometry(0.075, 10, 8), std(0xa82030, { roughness: 0.4 }), 0, 0.075, 0); add(new THREE.ConeGeometry(0.025, 0.04, 6), std(0x7a1a20), 0, 0.16, 0); break;
    case 'tamaras': add(new THREE.CylinderGeometry(0.12, 0.09, 0.08, 10), std(0xb79c5c), 0, 0.04, 0); for (let i = 0; i < 7; i++) add(new THREE.SphereGeometry(0.028, 6, 5), std(0x6b2d12), rr(-0.07, 0.07), 0.09, rr(-0.07, 0.07)).scale.y = 1.5; break;
    case 'peixe': add(new THREE.SphereGeometry(0.06, 8, 6), std(0x9aa6a8, { metalness: 0.3, roughness: 0.4 }), 0, 0.05, 0).scale.set(1, 0.6, 3.2); add(new THREE.ConeGeometry(0.06, 0.08, 4), std(0x8a9698), 0, 0.05, -0.22).rotation.x = Math.PI / 2; break;
    case 'papiro': add(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 10), std(0xe9dcb4), 0, 0.035, 0).rotation.z = Math.PI / 2; break;
    case 'ankh': {
      const mat = gold();
      add(new THREE.TorusGeometry(0.045, 0.014, 6, 14), mat, 0, 0.2, 0).scale.y = 1.3;
      add(new THREE.BoxGeometry(0.14, 0.025, 0.025), mat, 0, 0.13, 0);
      add(new THREE.BoxGeometry(0.025, 0.13, 0.025), mat, 0, 0.065, 0);
    } break;
    case 'lotus': {
      add(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4), std(0x3d7f59), 0, 0.15, 0);
      for (let i = 0; i < 8; i++) { const p = add(new THREE.ConeGeometry(0.025, 0.1, 4), std(0x6a8ed8), Math.cos(i) * 0.03, 0.33, Math.sin(i) * 0.03); p.rotation.set(Math.sin(i) * 0.5, 0, Math.cos(i) * 0.5); }
    } break;
    case 'sistro': {
      add(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 6), bronze, 0, 0.08, 0);
      add(new THREE.TorusGeometry(0.06, 0.01, 5, 12, Math.PI), bronze, 0, 0.18, 0).rotation.z = 0;
      add(new THREE.BoxGeometry(0.12, 0.01, 0.01), bronze, 0, 0.2, 0);
    } break;
    case 'cebola': for (let i = 0; i < 3; i++) add(new THREE.SphereGeometry(0.05, 8, 6), std(0xe7d6b4), i * 0.07 - 0.07, 0.05, 0); break;
  }
  return g;
}

export class Items {
  constructor(scene, glowTex) {
    this.scene = scene;
    this.list = [];
    this.sparkMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffe9a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  }
  spawn(type, x, y, z, ry = 0) {
    const mesh = build(type);
    mesh.position.set(x, y, z); mesh.rotation.y = ry;
    if (type === 'khopesh' || type === 'lanca') mesh.rotation.z = Math.PI / 2 - 0.05, mesh.position.y += 0.03;
    const spark = new THREE.Sprite(this.sparkMat); spark.scale.setScalar(0.5); spark.position.y = 0.35;
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
    // na mão: +y aponta para o ombro, +x é a palma, +z é para a frente
    it.mesh.position.set(0.06, -0.08, 0);
    it.mesh.rotation.set(0, 0, 0);
    if (it.type === 'khopesh') it.mesh.rotation.set(Math.PI / 2 - 0.5, 0, 0), it.mesh.position.set(0.03, -0.07, 0);
    else if (it.type === 'lanca') it.mesh.position.set(0.03, -0.9, 0);
    else if (it.type === 'cerveja' || it.type === 'agua') it.mesh.position.set(0.05, -0.36, 0);
    it.mesh.scale.setScalar(1);
  }
  drop(it, x, y, z, ry) {
    it.held = false; it.spark.visible = true;
    this.scene.add(it.mesh);
    it.mesh.scale.setScalar(1);
    it.mesh.position.set(x, y, z); it.mesh.rotation.set(0, ry, 0);
    if (it.type === 'khopesh' || it.type === 'lanca') it.mesh.rotation.z = Math.PI / 2 - 0.05, it.mesh.position.y += 0.03;
  }
  remove(it) {
    it.mesh.parent?.remove(it.mesh);
    this.list = this.list.filter((i) => i !== it);
  }
  update(t, playerPos) {
    for (const it of this.list) {
      if (it.held) continue;
      const d2 = (it.mesh.position.x - playerPos.x) ** 2 + (it.mesh.position.z - playerPos.z) ** 2;
      it.spark.visible = d2 < 100;
      it.spark.material.opacity = 0.5 + Math.sin(t * 3 + it.home.x) * 0.3;
    }
  }
}
