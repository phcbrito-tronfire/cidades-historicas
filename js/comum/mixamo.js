// Personagens realistas do Mixamo (Adobe): explorador "Josh" e moradores de Mênfis.
// O corpo dos modelos do Mixamo é só cabeça, mãos e pés: o resto é a roupa. Para os egípcios,
// as peças modernas são "repintadas" (camisa vira torso nu, bermuda/calça vira saiote de linho,
// tênis vira sandália) e recebem por cima saiotes, vestidos, perucas e coroas presos aos ossos.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { rr, rand, pick, ver } from './util.js';
import { mergeSiblings } from './merge.js';

const BASES = {};
export const _BASES = BASES; // (depuração)
const BODY_SPHERE = new THREE.Sphere(new THREE.Vector3(0, 0.95, 0), 1.5); // espaço do modelo (pose T, ~1,8 m de altura)
const CLIPS = {};
let TEX = null;
const DIR = 'assets/models/mixamo/';
export const SKINS = [0xb98a68, 0xa87652, 0xc39675, 0x9a6a48, 0xb07a58, 0x8e5f40];
// (o Joe, de terno, ficou de fora: sem o paletó o tronco dele é oco)
const MEN = ['bryce', 'brian'];
const WOMEN = ['kate', 'megan', 'elizabeth'];
const ANIMS = ['idle', 'andar', 'andar_f', 'trotar', 'correr', 'pular', 'caindo', 'aterrissar', 'nadar', 'boiar', 'conversar', 'pegar', 'espada', 'ajoelhado', 'sentado',
  'borda', 'salto_agua', 'golpe', 'desmaiar', 'beber']; // borda: "Pulling Up To A Ledge" (sair da água pelo cais); salto_agua: "Diving From A Run Pose"
// nomes antigos usados pelo resto do jogo → animações do Mixamo
const ALIAS = { Jump_Land: 'aterrissar', Sword_Attack: 'espada', PickUp_Table: 'pegar' };

export async function loadHumanModel(_unused, tex, onProgress) {
  TEX = tex;
  const L = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const names = ['explorador', ...MEN, ...WOMEN];
  let done = 0; const total = names.length + ANIMS.length + 1;
  const tick = () => onProgress && onProgress(++done / total);
  await Promise.all([
    loadHat(L).then(tick),
    loadHelmet(L),
    ...names.map(async (n) => { const g = await L.loadAsync(ver(DIR + n + '.glb')); BASES[n] = g.scene; tick(); }),
    ...ANIMS.map(async (n) => {
      const g = await L.loadAsync(ver(DIR + 'anim/' + n + '.glb'));
      const clip = g.animations[0];
      clip.name = n;
      // laços de locomoção: remove o deslocamento horizontal do quadril (o jogo é quem move)
      if (['andar', 'andar_f', 'trotar', 'correr', 'nadar', 'idle', 'conversar', 'boiar'].includes(n)) {
        for (const tr of clip.tracks) if (/Hips\.position$/.test(tr.name)) { const v = tr.values; const x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } }
      }
      // movimentos únicos em que o jogo move o corpo (subir na borda, mergulhar, cair): o quadril não sai do lugar
      // (na borda quase nem para cima: quem sobe é o explorador inteiro, até a altura do cais)
      if (['borda', 'salto_agua', 'desmaiar', 'golpe'].includes(n)) {
        for (const tr of clip.tracks) if (/Hips\.position$/.test(tr.name)) { const v = tr.values; const x0 = v[0], y0 = v[1], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; if (n === 'borda') v[i + 1] = y0 + (v[i + 1] - y0) * 0.15; } }
      }
      // escala, se a animação não serve para o próprio corpo, não vale mexer: os ossos não têm scale
      clip.tracks = clip.tracks.filter((tr) => !/\.scale$/.test(tr.name));
      CLIPS[n] = clip; tick();
    }),
  ]);
  // alguns modelos vêm com prefixo numerado nos ossos (mixamorig12Hips): padroniza para as animações encaixarem
  for (const b of Object.values(BASES)) b.traverse((o) => { o.name = o.name.replace(/^mixamorig\d+/, 'mixamorig'); if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  for (const c of Object.values(CLIPS)) for (const tr of c.tracks) tr.name = tr.name.replace(/^mixamorig\d+/, 'mixamorig');
  calibrateLocomotion();
}

// chapéu fedora modelado (Sketchfab, CC BY): mede a copa na base (altura 20–30% do chapéu) para encaixar na cabeça
let HAT = null;
async function loadHat(L) {
  try {
    const g = await L.loadAsync(ver('assets/models/estatuas/chapeu.glb'));
    const sc = g.scene; sc.updateMatrixWorld(true);
    const v = new THREE.Vector3(), pts = [];
    sc.traverse((o) => { if (o.isMesh) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) pts.push(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).clone()); o.castShadow = true; } });
    const b = new THREE.Box3().setFromPoints(pts), h = b.max.y - b.min.y;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const q of pts) { const f = (q.y - b.min.y) / h; if (f >= 0.2 && f < 0.35) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); } }
    // eixo comprido da copa = frente-trás da cabeça
    const alongX = x1 - x0 >= z1 - z0;
    HAT = { scene: sc, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, baseY: b.min.y + 0.2 * h, len: Math.max(x1 - x0, z1 - z0), wid: Math.min(x1 - x0, z1 - z0), alongX };
  } catch (e) { console.warn('chapéu', e); }
}

// elmo coríntio modelado (Sketchfab, se existir): mede a abertura para caber na cabeça
let HELM = null;
async function loadHelmet(L) {
  try {
    const g = await L.loadAsync(ver('assets/models/gregos/elmo.glb'));
    const sc = g.scene; sc.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(sc), sz = b.getSize(new THREE.Vector3());
    sc.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.material.metalness = Math.max(0.7, o.material.metalness || 0); o.material.color.multiply(new THREE.Color(0xd8a060)); } }); // bronze, não prata
    HELM = { scene: sc, cx: (b.min.x + b.max.x) / 2, cz: (b.min.z + b.max.z) / 2, y0: b.min.y + sz.y * 0.35, w: Math.min(sz.x, sz.z), yaw: 0 };
  } catch (e) { /* sem modelo: elmo feito de peças */ }
}

// ---------------------------------------------------------------------------
const matCache = new Map();
function m(color, o = {}) {
  const key = color + '|' + Object.entries(o).map(([k, v]) => k + (v && v.uuid ? v.uuid : v)).join(',');
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o }));
  return matCache.get(key);
}
export const gold = () => m(0xffc64a, { metalness: 1, roughness: 0.3 });
const bronze = () => m(0xb87333, { metalness: 0.9, roughness: 0.35 });
const part = (name) => name.replace(/^Ch\d+_+/, '').replace(/\d+$/, '');

// tecido de torno (saiote, vestido) com pregas verticais; prof = [raio, y] de cima para baixo, y=0 na cintura.
// Achatado na frente/atrás como um quadril de verdade, e um pouco mais aberto na frente, onde as coxas avançam.
const clothCache = new Map();
function clothGeometry(key, prof, pleats = 26, depth = 0.86) {
  if (clothCache.has(key)) return clothCache.get(key);
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 56);
  const p = g.attributes.position;
  const yEnd = prof[prof.length - 1][1];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = Math.min(1, Math.max(0, y / yEnd)); // 0 na cintura, 1 na barra
    const a = Math.atan2(z, x);
    const k = 1 + 0.028 * Math.sqrt(t) * Math.sin(a * pleats); // pregas crescem em direção à barra
    p.setX(i, x * k); p.setZ(i, z * k * depth + (z > 0 ? 0.02 * t : 0));
  }
  g.computeVertexNormals();
  clothCache.set(key, g);
  return g;
}
const GREEK = new Set(['chiton', 'himation', 'peplos', 'exomis', 'hoplite']);
const CHITON = [[0.16, 0.08], [0.175, 0], [0.195, -0.12], [0.212, -0.26], [0.225, -0.4], [0.235, -0.5]];
const LONGROBE = [[0.158, 0.07], [0.172, 0], [0.19, -0.14], [0.205, -0.34], [0.218, -0.6], [0.232, -0.82], [0.24, -0.92]];
const PEPLOS = [[0.152, 0.1], [0.165, 0], [0.19, -0.16], [0.208, -0.36], [0.222, -0.6], [0.236, -0.84], [0.244, -0.94]];

// barba: pega os triângulos do rosto (queixo, mandíbula, bochechas e bigode) na pose T e os empurra para fora
// pela normal, mais grossa no queixo e sumindo nas bordas (sem degrau entre a barba e a pele)
const beardCache = new Map();
function beardGeometry(meshes, rootInv, head, kind) {
  const body = meshes.find((me) => /Body/.test(me.name)); if (!body) return null;
  const key = body.geometry.uuid + kind; if (beardCache.has(key)) return beardCache.get(key);
  const pa = body.geometry.attributes.position, na = body.geometry.attributes.normal, idx = body.geometry.index;
  const toModel = new THREE.Matrix4().multiplyMatrices(rootInv, body.matrixWorld), nm = new THREE.Matrix3().getNormalMatrix(toModel);
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const full = kind === 'full', T = full ? 0.024 : 0.013, drop = full ? 0.03 : 0.01;
  const P = [], W = [];
  for (let i = 0; i < pa.count; i++) {
    v.fromBufferAttribute(pa, i); body.applyBoneTransform(i, v); v.applyMatrix4(toModel);
    const x = v.x - head.x, y = v.y - head.y, z = v.z - head.z, ax = Math.abs(x);
    const top = 0.022 + 0.055 * sm(0.03, 0.075, ax);
    let w = sm(-0.092, -0.06, y) * (1 - sm(top - 0.012, top, y)) * sm(-0.035, 0.005, z) * (1 - sm(0.085, 0.1, ax));
    if (z > 0.1 && ax < 0.03 && Math.abs(y - 0.004) < 0.011) w *= sm(0.018, 0.03, ax); // boca livre
    P.push(v.clone()); W.push(w);
  }
  const outP = [], outUV = [];
  const tri = idx ? idx.array : [...Array(pa.count).keys()];
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t], b = tri[t + 1], c = tri[t + 2];
    if (W[a] <= 0.001 && W[b] <= 0.001 && W[c] <= 0.001) continue;
    for (const i of [a, b, c]) {
      n.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
      const p = P[i].clone(), w = W[i], y = p.y - head.y;
      const curl = 0.75 + 0.5 * Math.sin(p.x * 230) * Math.sin(p.y * 190); // cachos
      p.addScaledVector(n, T * w * curl);
      p.y -= drop * w * sm(-0.01, -0.06, y);
      outP.push(p.x - head.x, p.y - head.y, p.z - head.z);
      outUV.push(p.x * 9, p.y * 9);
    }
  }
  if (!outP.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(outP, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(outUV, 2));
  g.computeVertexNormals();
  g.translate(head.x, head.y, head.z);
  beardCache.set(key, g);
  return g;
}
let _beardTex = null;
function beardTex() {
  if (_beardTex) return _beardTex;
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.fillStyle = '#7a7a7a'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) { const px = Math.random() * S, py = Math.random() * S; x.strokeStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.25)'; x.lineWidth = 1.2; x.beginPath(); x.arc(px, py, 2 + Math.random() * 3, 0, Math.PI * (0.8 + Math.random())); x.stroke(); }
  _beardTex = new THREE.CanvasTexture(c); _beardTex.wrapS = _beardTex.wrapT = THREE.RepeatWrapping; _beardTex.colorSpace = THREE.SRGBColorSpace;
  return _beardTex;
}
// emblema do escudo (cada hoplita escolhia o seu): coruja, Górgona, escorpião, raio...
const aspisCache = {};
function aspisTex(device = 'owl') {
  if (aspisCache[device]) return aspisCache[device];
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const g = x.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S / 2); g.addColorStop(0, '#d8a050'); g.addColorStop(1, '#8a5a24');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.fillStyle = '#1a120c'; x.strokeStyle = '#1a120c'; x.lineWidth = 6;
  if (device === 'owl') { x.beginPath(); x.ellipse(128, 140, 38, 52, 0, 0, 7); x.fill(); x.fillStyle = '#d8a050'; for (const s of [-1, 1]) { x.beginPath(); x.arc(128 + s * 16, 118, 11, 0, 7); x.fill(); } x.fillStyle = '#1a120c'; for (const s of [-1, 1]) { x.beginPath(); x.arc(128 + s * 16, 118, 5, 0, 7); x.fill(); } }
  else if (device === 'gorgon') { x.beginPath(); x.arc(128, 128, 40, 0, 7); x.fill(); for (let i = 0; i < 12; i++) { const a = (i / 12) * 7; x.beginPath(); x.moveTo(128 + Math.cos(a) * 40, 128 + Math.sin(a) * 40); x.quadraticCurveTo(128 + Math.cos(a + 0.3) * 62, 128 + Math.sin(a + 0.3) * 62, 128 + Math.cos(a) * 75, 128 + Math.sin(a) * 75); x.stroke(); } }
  else if (device === 'bolt') { x.beginPath(); x.moveTo(140, 50); x.lineTo(100, 135); x.lineTo(130, 135); x.lineTo(112, 206); x.lineTo(160, 110); x.lineTo(130, 110); x.closePath(); x.fill(); }
  else { x.beginPath(); x.moveTo(128, 60); x.lineTo(150, 130); x.lineTo(128, 200); x.lineTo(106, 130); x.closePath(); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (aspisCache[device] = t);
}

const KILT = [[0.158, 0.07], [0.172, 0], [0.19, -0.12], [0.205, -0.26], [0.213, -0.4], [0.218, -0.48]];
const LONGKILT = [[0.158, 0.07], [0.172, 0], [0.19, -0.14], [0.205, -0.34], [0.215, -0.6], [0.225, -0.82]];
const DRESS = [[0.15, 0.1], [0.163, 0], [0.185, -0.16], [0.2, -0.36], [0.212, -0.6], [0.226, -0.84], [0.232, -0.94]];

// escudo: retângulo com topo em arco, extrudado e levemente curvo; UV de 0 a 1 em toda a face
const shieldCache = new Map();
function shieldGeometry(hw, h, depth) {
  const key = hw + '|' + h + '|' + depth;
  if (shieldCache.has(key)) return shieldCache.get(key);
  const sh = new THREE.Shape();
  sh.moveTo(-hw, 0); sh.lineTo(hw, 0); sh.lineTo(hw, h - hw); sh.absarc(0, h - hw, hw, 0, Math.PI, false); sh.lineTo(-hw, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 14 });
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    uv.setXY(i, (x + hw) / (2 * hw), y / h);
    p.setZ(i, p.getZ(i) - (x * x) * 1.6); // curva para acompanhar as costas
  }
  g.computeVertexNormals();
  shieldCache.set(key, g);
  return g;
}

// faixas pintadas das joias reais: ouro, lápis-lazúli (azul), cornalina (vermelho) e turquesa
const stripeCache = {};
function stripeTex(kind) {
  if (stripeCache[kind]) return stripeCache[kind];
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const bands = kind === 'collar' ? ['#e9b949', '#1f4fa8', '#e9b949', '#b8402c', '#e9b949', '#2f9a8a', '#e9b949', '#1f4fa8', '#e9b949']
    : kind === 'band' ? ['#e9b949', '#1f4fa8', '#e9b949', '#b8402c', '#e9b949']
    : kind === 'vulture' ? ['#e9b949', '#1f4fa8', '#e9b949', '#1f4fa8', '#e9b949', '#b8402c', '#e9b949', '#1f4fa8', '#e9b949', '#1f4fa8', '#e9b949']
    : kind === 'plume' ? ['#f4efe2', '#1f4fa8', '#f4efe2', '#b8402c', '#f4efe2', '#1f4fa8', '#f4efe2', '#b8402c', '#f4efe2'] : null;
  if (bands) { // faixas horizontais (anéis no cilindro), com contas
    const h = 256 / bands.length;
    bands.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * h, 64, h); if (col !== '#e9b949') for (let x = 0; x < 64; x += 8) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 1, i * h + 1, 5, h - 2); } });
  } else { // avental: pregas verticais de ouro e azul
    for (let x = 0; x < 64; x += 8) { g.fillStyle = (x / 8) % 2 ? '#1f4fa8' : '#e9b949'; g.fillRect(x, 0, 8, 256); }
    g.fillStyle = '#b8402c'; g.fillRect(0, 0, 64, 18);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (stripeCache[kind] = t);
}

function meshAt(geo, mat, x, y, z, rot) {
  const me = new THREE.Mesh(geo, mat); me.position.set(x, y, z); if (rot) me.rotation.set(...rot); me.castShadow = true; return me;
}

export function makeHumanoid(o = {}) {
  const outfit = o.outfit || 'kilt';
  const isExp = outfit === 'explorer';
  const greek = GREEK.has(outfit);
  const female = outfit === 'dress' || outfit === 'peplos';
  // roupas gregas curtas usam o Bryce (de bermuda: as pernas do modelo já são pele); as longas, qualquer um
  const baseName = isExp ? 'explorador' : o.base || (outfit === 'priest' ? 'brian' : female ? pick(WOMEN) : greek && outfit !== 'himation' ? 'bryce' : pick(['bryce', 'bryce', 'brian']));
  const root = new THREE.Group();
  // escondido (longe do jogador) = fora do cálculo de matrizes: ~70 ossos e as peças presas a eles
  root.updateMatrixWorld = function (force) { if (this.visible) THREE.Object3D.prototype.updateMatrixWorld.call(this, force); };
  const model = SkeletonUtils.clone(BASES[baseName]);
  root.add(model);
  model.updateMatrixWorld(true);
  const bones = {};
  let headTop = 1.75;
  const meshes = [];
  model.traverse((n) => {
    if (n.isBone) bones[n.name.replace(/^mixamorig\d*:?/, '')] = n;
    if (n.isSkinnedMesh) meshes.push(n);
  });
  const rootInv = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const bonePos = (b) => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(rootInv, bones[b].matrixWorld));
  if (bones.HeadTop_End) headTop = bonePos('HeadTop_End').y; // topo do crânio (o osso do Mixamo)

  // ---- repinta as peças para os egípcios
  const skin = o.skin ?? pick(SKINS);
  const linen = o.linen ?? 0xf1ead8;
  // tom médio da textura de pele do Mixamo (linear): peças repintadas de "pele" ficam iguais aos braços
  const SKIN_TINT = new THREE.Color().setRGB(0.62, 0.42, 0.36);
  const clothColor = o.cloth ?? 0xe8e0cc;
  const hairStyle = o.hair || (isExp ? 'fedora' : greek ? (female ? 'up' : baseName === 'bryce' ? 'natural' : 'short') : 'short');
  const fold = (mat, color, rough = 0.95) => { const c = mat.clone(); c.map = null; c.color.set(color); c.roughness = rough; c.metalness = 0; c.side = THREE.DoubleSide; c.transparent = false; c.opacity = 1; c.alphaTest = 0; return c; };
  // pele: o material do Mixamo vem como metal (metalness 1), o que embranquece o rosto sob luz pontual (tochas)
  const skinMat = (mat) => { const c = mat.clone(); c.metalness = 0; c.roughness = 0.62; return c; };
  for (const me of meshes) {
    const p = part(me.name);
    const mat = me.material;
    if (isExp) { // visual de aventureiro: jaqueta de couro marrom e calça cáqui (estilo Indiana Jones / Nathan Drake)
      if (/Suit/.test(p)) me.material = fold(mat, 0x6e4528, 0.62);
      if (/Pants/.test(p)) me.material = fold(mat, 0x8f7a54, 0.9);
      if (/Shoes/.test(p)) me.material = fold(mat, 0x3a2616, 0.7);
      if (/Body/.test(p)) me.material = skinMat(mat);
      continue;
    }
    if (/Body/.test(p)) { const c = skinMat(mat); c.color.set(skin); c.side = THREE.DoubleSide; me.material = c; continue; }
    if (greek) {
      if (/Hair/.test(p)) { // cabelo natural do modelo, escurecido (só nos homens; as mulheres usam o penteado preso)
        const keep = hairStyle === 'natural';
        me.visible = keep;
        if (keep) { const c = mat.clone(); c.color.set(o.hairColor ?? 0x4a3426); c.metalness = 0; c.roughness = 0.8; me.material = c; }
        continue;
      }
      if (/Eyelash/.test(p)) continue;
      if (/Suit|Tie|Belt/.test(p)) { me.visible = false; continue; }
      if (/Shirt|Tops/.test(p)) { me.material = o.bareChest ? fold(mat, new THREE.Color(skin).multiply(SKIN_TINT), 0.6) : fold(mat, o.chitonColor ?? clothColor); continue; }
      if (/Pants|Shorts|Bottoms/.test(p)) { me.material = /Shorts/.test(p) || female || outfit === 'himation' ? fold(mat, o.chitonColor ?? clothColor) : fold(mat, new THREE.Color(skin).multiply(SKIN_TINT), 0.6); continue; }
      if (/Shoes|Sneakers|Heels/.test(p)) { me.visible = false; continue; }
      continue;
    }
    if (/Hair/.test(p)) { me.visible = !!o.keepHair; continue; }
    if (/Eyelash/.test(p)) continue;
    if (/Suit|Tie|Belt/.test(p)) { me.visible = false; continue; }
    if (/Shirt|Tops/.test(p)) {
      if (female) me.material = fold(mat, linen);
      else if (outfit === 'soldier') me.material = fold(mat, 0xd8c8a0);
      else me.material = fold(mat, new THREE.Color(skin).multiply(SKIN_TINT), 0.6); // torso nu, no mesmo tom da pele texturizada
      continue;
    }
    if (/Pants|Shorts|Bottoms/.test(p)) { me.material = fold(mat, linen, 0.95); continue; }
    if (/Shoes|Sneakers|Heels/.test(p)) { me.visible = false; continue; } // trocados por pés com sandália (abaixo)
  }

  // prende um objeto a um osso, a partir de posição/rotação no espaço do modelo (pose T)
  const attach = (bone, obj, pos, rot = [0, 0, 0], scale = [1, 1, 1]) => {
    const b = bones[bone]; if (!b) return obj;
    const want = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
    const local = new THREE.Matrix4().multiplyMatrices(rootInv, b.matrixWorld).invert().multiply(want);
    local.decompose(obj.position, obj.quaternion, obj.scale);
    obj.traverse((c) => { if (c.isMesh) c.castShadow = true; });
    b.add(obj);
    return obj;
  };
  const hp = bonePos('Head');
  const HC = new THREE.Vector3(0, (hp.y + headTop) / 2 + 0.01, hp.z + 0.01); // centro do crânio
  const headPart = (geo, mat, off, rot, sc) => attach('Head', new THREE.Mesh(geo, mat), HC.clone().add(new THREE.Vector3(...off)), rot, sc);
  const R = (headTop - HC.y) * 1.02; // "raio" do crânio
  const cap = (mat, sc = [1, 1, 1], off = [0, 0.015, -0.01], cut = 0.52) =>
    headPart(new THREE.SphereGeometry(1, 22, 14, 0, Math.PI * 2, 0, Math.PI * cut), mat, off, [0, 0, 0], [R * 0.86 * sc[0], R * 1.02 * sc[1], R * 1.02 * sc[2]]);

  // contorno real da cabeça (rosto + cabelo) na pose T, numa faixa 'below' abaixo do topo: largura, profundidade e centro
  const headFit = (below) => {
    const hb = bonePos('Head'), v = new THREE.Vector3();
    const pts = [];
    for (const me of meshes) {
      if (!/Body|Hair/.test(me.name) || !me.visible) continue;
      const pa = me.geometry.attributes.position;
      const toModel = new THREE.Matrix4().multiplyMatrices(rootInv, me.matrixWorld);
      for (let i = 0; i < pa.count; i++) {
        v.fromBufferAttribute(pa, i); me.applyBoneTransform(i, v); v.applyMatrix4(toModel);
        if (v.y > hb.y - 0.02 && Math.abs(v.x - hb.x) < 0.16 && Math.abs(v.z - hb.z) < 0.17) pts.push(v.clone());
      }
    }
    const top = pts.reduce((t, q) => Math.max(t, q.y), -Infinity);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const q of pts) if (q.y > top - below - 0.025 && q.y < top - below + 0.025) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); }
    return { top, rx: (x1 - x0) / 2, rz: (z1 - z0) / 2, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
  };
  const hair = hairStyle;
  const black = m(0x15100c, { roughness: 0.85 });
  switch (hair) {
    case 'short': cap(black, [1.06, 1, 1.06]); break;
    case 'long':
      cap(black, [1.12, 1.06, 1.1], [0, 0.015, -0.015], 0.6);
      headPart(new THREE.BoxGeometry(R * 1.75, R * 2.2, R * 0.8), black, [0, -R * 1.05, -R * 0.55]);
      for (const s of [-1, 1]) headPart(new THREE.BoxGeometry(R * 0.42, R * 2.0, R * 0.42), black, [s * R * 0.82, -R * 1.1, R * 0.3]);
      headPart(new THREE.TorusGeometry(R * 0.92, R * 0.06, 5, 22), gold(), [0, R * 0.45, -0.005], [Math.PI / 2, 0, 0], [1, 1.12, 1]);
      break;
    case 'queen': { // peruca longa, coroa de abutre (asas de ouro caindo pelos lados), módio com duas plumas e ureu
      cap(black, [1.12, 1.06, 1.1], [0, 0.015, -0.015], 0.6);
      headPart(new THREE.BoxGeometry(R * 1.75, R * 2.2, R * 0.8), black, [0, -R * 1.05, -R * 0.55]);
      for (const s of [-1, 1]) headPart(new THREE.BoxGeometry(R * 0.42, R * 2.0, R * 0.42), black, [s * R * 0.82, -R * 1.1, R * 0.3]);
      const vg = m(0xffffff, { map: stripeTex('vulture'), metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide });
      cap(vg, [1.17, 1.1, 1.15], [0, 0.02, -0.015], 0.42);
      for (const s of [-1, 1]) headPart(new THREE.BoxGeometry(R * 0.08, R * 1.3, R * 1.5), vg, [s * R * 1.0, -R * 0.35, -R * 0.15], [0, 0, s * 0.08]);
      headPart(new THREE.CylinderGeometry(R * 0.55, R * 0.5, R * 0.45, 20), gold(), [0, R * 1.05, -R * 0.05]); // módio
      for (const s of [-1, 1]) headPart(new THREE.BoxGeometry(R * 0.5, R * 2.8, R * 0.04), m(0xffffff, { map: stripeTex('plume'), roughness: 0.6, side: THREE.DoubleSide }), [s * R * 0.26, R * 2.55, -R * 0.05], [0, 0, -s * 0.06]);
      headPart(new THREE.CylinderGeometry(0.011, 0.018, 0.065, 6), gold(), [0, R * 0.85, R * 0.98], [0.35, 0, 0]); // ureu
      headPart(new THREE.SphereGeometry(0.018, 8, 6), gold(), [0, R * 0.62, R * 1.02]); // cabeça do abutre
    } break;
    case 'sidelock': headPart(new THREE.CylinderGeometry(0.014, 0.02, 0.18, 6), black, [R * 0.82, -R * 0.55, 0], [0, 0, 0.15]); break;
    case 'khat': {
      const cl = m(o.khat ?? 0xe8dcc0, { roughness: 0.95 });
      cap(cl, [1.14, 1.06, 1.16], [0, 0.015, -0.02], 0.6);
      headPart(new THREE.BoxGeometry(R * 1.2, R * 1.4, R * 0.55), cl, [0, -R * 1.0, -R * 0.85], [0.25, 0, 0]);
    } break;
    case 'nemes': case 'khepresh': {
      if (hair === 'nemes') {
        const nm = m(0xffffff, { map: TEX.nemes, roughness: 0.55 });
        cap(nm, [1.24, 1.12, 1.16], [0, 0.02, -0.01], 0.62);
        for (const s of [-1, 1]) headPart(new THREE.BoxGeometry(R * 0.5, R * 2.0, R * 0.28), nm, [s * R * 0.95, -R * 1.25, R * 0.35]);
        headPart(new THREE.BoxGeometry(R * 1.2, R * 1.8, R * 0.55), nm, [0, -R * 1.2, -R * 0.9]);
      } else headPart(new THREE.SphereGeometry(1, 18, 14), m(0x1f3f8c, { roughness: 0.35, metalness: 0.3 }), [0, R * 0.6, -R * 0.2], [0.15, 0, 0], [R * 1.1, R * 1.6, R * 1.35]);
      headPart(new THREE.CylinderGeometry(0.011, 0.018, 0.065, 6), gold(), [0, R * 0.95, R * 0.95], [0.35, 0, 0]);
      headPart(new THREE.CylinderGeometry(0.016, 0.011, 0.09, 6), m(0x2c5d9c), [0, -R * 1.05, R * 0.75], [0.2, 0, 0]);
    } break;
    case 'fedora': {
      // chapéu feito na medida da cabeça: mede os vértices reais de rosto e cabelo (pose T) na altura da fita
      const fit = headFit(0.115);
      if (HAT) { // chapéu modelado, escalado para a copa abraçar a cabeça com 1 cm de folga
        const sL = (fit.rz * 2 + 0.02) / HAT.len, sW = (fit.rx * 2 + 0.02) / HAT.wid, sH = (sL + sW) / 2;
        const inner = HAT.scene.clone(); inner.position.set(-HAT.cx, -HAT.baseY, -HAT.cz);
        const scaler = new THREE.Group(); scaler.add(inner);
        if (HAT.alongX) scaler.scale.set(sL, sH, sW); else scaler.scale.set(sW, sH, sL);
        const hat = new THREE.Group(); hat.add(scaler);
        attach('Head', hat, new THREE.Vector3(fit.cx, fit.top - 0.085, fit.cz), [0.04, HAT.alongX ? Math.PI / 2 : 0, 0]); // base da copa 8,5 cm abaixo do topo: aba na testa, olhos livres
        break;
      }
      const felt = m(0x6b4a2e, { roughness: 0.85 });
      const band = m(0x2a1a0e, { roughness: 0.7 });
      const rx = fit.rx + 0.01, rz = fit.rz + 0.01, yB = fit.top - 0.115, hC = fit.top + 0.02 - yB; // fita logo acima das sobrancelhas
      const hat = new THREE.Group();
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(rx * 0.92, rx, hC, 36), felt); crown.position.y = hC / 2; crown.scale.z = rz / rx;
      const dent = new THREE.Mesh(new THREE.BoxGeometry(rx * 0.22, 0.02, rz * 1.2), m(0x5a3d24, { roughness: 0.85 })); dent.position.y = hC - 0.006; // vinco da copa
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(rx * 1.015, rx * 1.02, 0.03, 36, 1, true), band); ribbon.position.y = 0.022; ribbon.scale.z = rz / rx;
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(rx * 1.75, rx * 1.8, 0.012, 40), felt); brim.position.y = 0.004; brim.scale.z = rz / rx;
      hat.add(crown, dent, ribbon, brim);
      attach('Head', hat, new THREE.Vector3(fit.cx, yB, fit.cz), [0.04, 0, 0]); // aba levemente baixa na frente
    } break;
    case 'up': { // cabelo preso num coque, com fita (mulheres gregas)
      const hc = m(o.hairColor ?? 0x2a1c14, { roughness: 0.85 });
      cap(hc, [1.1, 1.04, 1.1], [0, 0.015, -0.015], 0.58);
      headPart(new THREE.SphereGeometry(R * 0.5, 14, 10), hc, [0, R * 0.2, -R * 1.0]);
      headPart(new THREE.TorusGeometry(R * 0.9, R * 0.05, 5, 22), m(o.ribbon ?? 0x8e2c22, { roughness: 0.7 }), [0, R * 0.42, -0.01], [Math.PI / 2 - 0.12, 0, 0], [1, 1.14, 1]);
    } break;
    case 'veil': { // véu de linho sobre o cabelo preso (sacerdotisas e senhoras na rua)
      const hc = m(o.hairColor ?? 0x2a1c14, { roughness: 0.85 });
      cap(hc, [1.1, 1.04, 1.1], [0, 0.015, -0.015], 0.58);
      const vm = m(o.veilColor ?? 0xf2ecdc, { roughness: 0.95, side: THREE.DoubleSide });
      cap(vm, [1.2, 1.12, 1.2], [0, 0.02, -0.03], 0.55);
      headPart(new THREE.CylinderGeometry(R * 1.05, R * 1.5, R * 2.4, 22, 1, true, Math.PI * 0.55, Math.PI * 0.9), vm, [0, -R * 0.9, -R * 0.25]);
    } break;
    case 'natural': case 'bald': break;
    default: break; // careca (sacerdotes)
  }

  if (o.beard) {
    const g = beardGeometry(meshes, rootInv, bonePos('Head'), o.beard);
    if (g) { const bm = m(o.beardColor ?? o.hairColor ?? 0x3a2a1e, { map: beardTex(), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }); attach('Head', new THREE.Mesh(g, bm), new THREE.Vector3(0, 0, 0)); }
  }

  // ---- saiotes, vestidos e detalhes presos ao quadril e ao peito
  const hips = bonePos('Hips');
  const hipsPart = (geo, mat, dy, rot, sc) => attach('Hips', new THREE.Mesh(geo, mat), new THREE.Vector3(0, hips.y + dy, hips.z + 0.01), rot, sc);
  const linenM = m(linen, { roughness: 0.95, side: THREE.DoubleSide });
  // tecido que veste o quadril e acompanha as coxas: malha com pele (skin) no mesmo esqueleto do corpo.
  // Cada vértice segue o quadril na cintura e, descendo, cada vez mais a coxa do seu lado (no meio, as duas).
  // o tecido usa o esqueleto de uma malha que tenha os ossos do quadril e das coxas (no Brian, o corpo só tem cabeça e mãos)
  const hasLegs = (me) => ['Hips', 'LeftUpLeg', 'RightUpLeg'].every((n) => me.skeleton.bones.some((b) => b.name.replace(/^mixamorig\d*:?/, '') === n));
  const ref = meshes.find((me) => /Body/.test(me.name) && hasLegs(me)) || meshes.find(hasLegs) || meshes.find((me) => /Body/.test(me.name)) || meshes[0];
  const skel = ref.skeleton;
  const bi = (n) => skel.bones.findIndex((b) => b.name.replace(/^mixamorig\d*:?/, '') === n);
  const iH = bi('Hips'), iL = bi('LeftUpLeg'), iR = bi('RightUpLeg');
  const xL = bones.LeftUpLeg ? Math.sign(bonePos('LeftUpLeg').x - hips.x) || 1 : 1;
  // as malhas vêm quantizadas e a desquantização mora nas boneInverses: na pose T, um vértice cru v vai para
  // (osso do quadril no modelo) × boneInverse × bindMatrix × v. A inversa disso leva o tecido para o espaço cru.
  const toRef = iH >= 0 ? new THREE.Matrix4().multiplyMatrices(rootInv, skel.bones[iH].matrixWorld).multiply(skel.boneInverses[iH]).multiply(ref.bindMatrix).invert() : new THREE.Matrix4();
  const cloth = (geo, mat, dy, follow = 0.85) => {
    const g = geo.clone();
    g.translate(hips.x, hips.y + dy, hips.z + 0.01);
    const p = g.attributes.position, n = p.count;
    const yTop = hips.y + dy;
    g.computeBoundingBox();
    const span = yTop - g.boundingBox.min.y;
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const t = THREE.MathUtils.clamp((yTop - p.getY(i)) / span, 0, 1);
      const s = THREE.MathUtils.clamp(((p.getX(i) - hips.x) * xL) / 0.11, -1, 1); // +1 lado esquerdo
      const leg = follow * THREE.MathUtils.smoothstep(t, 0.05, 1);
      const wL = leg * (0.5 + 0.5 * s), wR = leg * (0.5 - 0.5 * s);
      si.set([iH, iL, iR, iH], i * 4); sw.set([1 - wL - wR, wL, wR, 0], i * 4);
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    g.applyMatrix4(toRef);
    const sm = new THREE.SkinnedMesh(g, mat);
    sm.castShadow = true; sm.receiveShadow = true;
    sm.position.copy(ref.position); sm.quaternion.copy(ref.quaternion); sm.scale.copy(ref.scale);
    ref.parent.add(sm);
    sm.bind(skel, ref.bindMatrix);
    return sm;
  };
  const useCloth = iH >= 0 && iL >= 0 && iR >= 0;
  let skirt = null; // saiote de tecido (sentado, some: o linho justo nas coxas dobra melhor com as pernas)
  // cinto de linho dobrado com a ponta do nó caindo na frente (shendyt)
  const belt = () => {
    hipsPart(new THREE.CylinderGeometry(0.163, 0.168, 0.05, 32, 1, true), linenM, 0.035, [0, 0, 0], [1, 1, 0.88]);
    hipsPart(new THREE.BoxGeometry(0.05, 0.13, 0.012), linenM, -0.03, [-0.12, 0, 0]).position.z += 0.15;
  };
  // tecido grego: textura com a barra (meandro) na bainha
  const hex = (c) => '#' + new THREE.Color(c).getHexString();
  const clothMat = TEX && TEX.cloth ? m(0xffffff, { map: TEX.cloth(hex(clothColor), o.border == null ? null : hex(o.border)), roughness: 0.95, side: THREE.DoubleSide }) : m(clothColor, { roughness: 0.95, side: THREE.DoubleSide });
  const plainCloth = m(clothColor, { roughness: 0.95, side: THREE.DoubleSide });
  const cord = (y, color = 0x6a4a2a) => hipsPart(new THREE.TorusGeometry(0.168, 0.008, 5, 28), m(color, { roughness: 0.8 }), y, [Math.PI / 2, 0, 0], [1, 0.86, 1]);
  switch (outfit) {
    case 'chiton': case 'hoplite':
      if (useCloth) skirt = cloth(clothGeometry('chiton', CHITON, 30), clothMat, -0.04, 0.85); cord(0.05); break;
    case 'exomis':
      if (useCloth) cloth(clothGeometry('exomis', CHITON.slice(0, 5), 22), plainCloth, -0.04); cord(0.05, 0x5a4030); break;
    case 'himation': {
      if (useCloth) skirt = cloth(clothGeometry('himation', LONGROBE, 34), clothMat, -0.04, 0.72);
      // o manto passa pelo ombro esquerdo e atravessa o peito em diagonal
      const ch = bones.Spine2 ? bonePos('Spine2') : hips.clone().add(new THREE.Vector3(0, 0.35, 0));
      attach('Spine2', new THREE.Mesh(new THREE.CylinderGeometry(0.172, 0.2, 0.46, 36, 1, true), clothMat), new THREE.Vector3(0, ch.y - 0.1, ch.z + 0.005), [0, 0, -0.42 * xL], [1, 1, 0.8]);
    } break;
    case 'peplos': {
      if (useCloth) cloth(clothGeometry('peplos', PEPLOS, 36), clothMat, -0.04, 0.78);
      // dobra de cima do peplo (apoptygma), caindo até a cintura, e o cinto
      const ch = bones.Spine2 ? bonePos('Spine2') : hips.clone().add(new THREE.Vector3(0, 0.35, 0));
      attach('Spine1', new THREE.Mesh(new THREE.CylinderGeometry(0.158, 0.182, 0.17, 32, 1, true), plainCloth), new THREE.Vector3(0, hips.y + 0.17, hips.z + 0.015), [0, 0, 0], [1, 1, 0.8]);
      cord(0.08, o.border ?? 0x8e2c22);
      void ch;
    } break;
    case 'kilt': case 'soldier': case 'pharaoh':
      if (useCloth) { skirt = cloth(clothGeometry('kilt', KILT), linenM, -0.04); belt(); } else hipsPart(new THREE.CylinderGeometry(0.18, 0.24, 0.5, 24, 1, true), linenM, -0.2);
      break;
    case 'worker':
      if (useCloth) cloth(clothGeometry('worker', KILT.slice(0, 5), 20), linenM, -0.04); else hipsPart(new THREE.CylinderGeometry(0.175, 0.23, 0.42, 22, 1, true), linenM, -0.16);
      break;
    case 'longkilt': case 'priest':
      if (useCloth) { cloth(clothGeometry('longkilt', LONGKILT, 30), linenM, -0.04, 0.8); belt(); } else hipsPart(new THREE.CylinderGeometry(0.175, 0.26, 0.86, 22, 1, true), linenM, -0.35);
      break;
    case 'dress': { // kalasíris: linho plissado justo na cintura, solto nas pernas, com faixa colorida
      if (useCloth) cloth(clothGeometry('dress', DRESS, 34), linenM, -0.04, 0.8); else hipsPart(clothGeometry('dress', DRESS, 34), linenM, -0.04);
      hipsPart(new THREE.CylinderGeometry(0.158, 0.162, 0.045, 28, 1, true), m(o.sash ?? 0xa8402c, { roughness: 0.8, side: THREE.DoubleSide }), 0.06, [0, 0, 0], [1, 1, 0.86]);
    } break;
  }
  let tail = null; // cauda de touro cerimonial (some quando o rei está sentado)
  if (outfit === 'pharaoh') {
    // avental de ouro plissado na frente do saiote, cauda de touro cerimonial atrás e braceletes
    const apron = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, 0.38, 3, 1, true, -Math.PI / 6, Math.PI / 3), m(0xffffff, { map: stripeTex('apron'), metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide }));
    attach('Hips', apron, new THREE.Vector3(0, hips.y - 0.22, hips.z + 0.075), [0.1, 0, 0], [1.3, 1, 1.3]);
    tail = attach('Hips', new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.55, 6), m(0x6b4a2a, { roughness: 0.9 })), new THREE.Vector3(0, hips.y - 0.32, hips.z - 0.17), [-0.08, 0, 0]);
    for (const side of ['Left', 'Right']) {
      const fa = bones[side + 'ForeArm'], hand = bones[side + 'Hand'];
      if (!fa || !hand) continue;
      const a = bonePos(side + 'ForeArm'), b = bonePos(side + 'Hand');
      const dir = b.clone().sub(a).normalize();
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.034, 0.05, 16, 1, true), m(0xffffff, { map: stripeTex('band'), metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }));
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const e = new THREE.Euler().setFromQuaternion(q);
      attach(side + 'ForeArm', band, a.clone().lerp(b, 0.78), [e.x, e.y, e.z]);
      attach(side + 'Arm', band.clone(), bonePos(side + 'Arm').lerp(a, 0.35), [e.x, e.y, e.z], [1.35, 1, 1.35]);
    }
  }
  const chest = bones.Spine2 ? bonePos('Spine2') : hips.clone().add(new THREE.Vector3(0, 0.35, 0));
  const neckY = bones.Neck ? bonePos('Neck').y : chest.y + 0.15;
  if (outfit === 'soldier') attach('Hips', new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.015), m(0xffffff, { map: TEX.hide })), new THREE.Vector3(0, hips.y - 0.16, hips.z + 0.24), [-0.15, 0, 0]);
  // pele de leopardo do sacerdote: envolve o tronco em diagonal, junto ao corpo (antes era uma placa que o cajado atravessava)
  if (outfit === 'priest') attach('Spine2', new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.19, 0.42, 36, 1, true), m(0xffffff, { map: TEX.leopard, roughness: 0.9, side: THREE.DoubleSide })), new THREE.Vector3(0, chest.y - 0.1, chest.z + 0.005), [0, 0, 0.22], [1, 1, 0.78]);
  const collar = o.collar === 'royal' || outfit === 'pharaoh' ? 'royal' : o.collar ?? (female && !greek ? pick([0x2f7f8a, 0xa8402c, 0x3a5fa8, 0xc9963a]) : undefined); // mulheres: colar largo de contas por cima da gola da blusa do modelo
  if (collar && !isExp) {
    const c = attach('Spine2', new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.175, 0.1, 28, 1, true), collar === 'royal' ? m(0xffffff, { map: stripeTex('collar'), metalness: 0.75, roughness: 0.32, side: THREE.DoubleSide }) : m(collar, { side: THREE.DoubleSide, roughness: 0.5 })), new THREE.Vector3(0, neckY - 0.02, chest.z - 0.005), [0.08, 0, 0], [1.12, 1, 0.78]);
    void c;
  }
  if (isExp) { // bolsa a tiracolo, alça e chicote
    // bolsa de couro junto ao quadril direito, um pouco para trás (sem alça atravessando o corpo)
    const bag = new THREE.Group();
    bag.add(meshAt(new THREE.BoxGeometry(0.07, 0.2, 0.24), m(0x6b4a2a, { roughness: 0.8 }), 0, 0, 0));
    bag.add(meshAt(new THREE.BoxGeometry(0.075, 0.08, 0.245), m(0x5a3d22, { roughness: 0.8 }), 0.002, 0.065, 0));
    attach('Hips', bag, new THREE.Vector3(-0.2, hips.y - 0.1, hips.z - 0.03));
    const whip = attach('Hips', new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.014, 6, 16), m(0x2a1a0e)), new THREE.Vector3(0.2, hips.y - 0.04, hips.z + 0.02), [0, Math.PI / 2, 0]);
    void whip;
  }

  // ---- pés descalços com sandália de couro (no lugar dos tênis do Mixamo, que escondem pés só esboçados)
  if (!isExp) {
    const skinFlat = m(new THREE.Color(skin).multiply(SKIN_TINT).getHex(), { roughness: 0.6 });
    const sandal = m(outfit === 'pharaoh' ? 0xd9a23e : 0x8a6a42, { roughness: outfit === 'pharaoh' ? 0.35 : 0.85, metalness: outfit === 'pharaoh' ? 0.8 : 0 });
    for (const side of ['Left', 'Right']) {
      if (!bones[side + 'Foot']) continue;
      const ank = bonePos(side + 'Foot');
      const toe = bones[side + 'Toe_End'] ? bonePos(side + 'Toe_End') : bones[side + 'ToeBase'] ? bonePos(side + 'ToeBase').add(new THREE.Vector3(0, 0, 0.06)) : ank.clone().add(new THREE.Vector3(0, 0, 0.2));
      const heelZ = ank.z - 0.05, toeZ = toe.z - 0.005, L = toeZ - heelZ, cx = (ank.x + toe.x) / 2;
      const g = new THREE.Group();
      // dorso do pé: elipsoide achatado, mais largo nos dedos; tornozelo liga a perna ao pé
      const footG = new THREE.SphereGeometry(1, 18, 12);
      const fp = footG.attributes.position;
      for (let i = 0; i < fp.count; i++) {
        const z = fp.getZ(i), y = fp.getY(i);
        const t = (z + 1) / 2; // 0 calcanhar, 1 dedos
        fp.setX(i, fp.getX(i) * (0.033 + 0.02 * Math.sqrt(t)) * (t > 0.85 ? 1 - (t - 0.85) * 1.2 : 1));
        fp.setY(i, Math.max(y, -0.35) * (0.068 - 0.046 * t));
        fp.setZ(i, z * L / 2);
      }
      footG.computeVertexNormals();
      g.add(meshAt(footG, skinFlat, cx, 0.03, heelZ + L / 2));
      g.add(meshAt(new THREE.CylinderGeometry(0.026, 0.046, Math.max(0.07, ank.y + 0.03), 16), skinFlat, ank.x, Math.max(0.07, ank.y + 0.03) / 2 + 0.015, ank.z - 0.015, [0, 0, 0]));
      // sola, tira sobre o peito do pé e tira do calcanhar
      g.add(meshAt(new THREE.BoxGeometry(0.1, 0.012, L + 0.025), sandal, cx, 0.006, heelZ + L / 2));
      g.add(meshAt(new THREE.TorusGeometry(0.043, 0.007, 5, 16, Math.PI), sandal, cx, 0.012, heelZ + L * 0.62, [0, 0, 0]));
      g.add(meshAt(new THREE.TorusGeometry(0.04, 0.006, 5, 14, Math.PI), sandal, cx, 0.02, ank.z - 0.02, [0, 0, 0]));
      g.traverse((n) => { if (n.material === skinFlat) n.userData.skinPart = true; });
      attach(side + 'Foot', g, new THREE.Vector3(0, 0, 0));
    }
  }

  // ---- mãos (o +y do objeto aponta para o ombro, como no sistema anterior)
  const handR = new THREE.Group(); const handL = new THREE.Group();
  if (bones.RightHand) attach('RightHand', handR, bonePos('RightHand').add(new THREE.Vector3(-0.07, -0.01, 0.02)), [0, 0, -Math.PI / 2]);
  if (bones.LeftHand) attach('LeftHand', handL, bonePos('LeftHand').add(new THREE.Vector3(0.07, -0.01, 0.02)), [0, 0, Math.PI / 2]);
  const bronzeG = m(0x8a5a2c, { metalness: 0.85, roughness: 0.42 });
  const headFitOnce = (() => { let f = null; return () => (f ??= headFit(0.115)); })();
  const helmet = (up) => {
    const fit = headFitOnce();
    const g = new THREE.Group();
    if (HELM) { // elmo coríntio modelado: escala pela cabeça
      const inner = HELM.scene.clone(); inner.position.set(-HELM.cx, -HELM.y0, -HELM.cz);
      const k = ((fit.rx * 2 + 0.05) / HELM.w); const sc = new THREE.Group(); sc.scale.setScalar(k); sc.add(inner); sc.rotation.y = HELM.yaw; g.add(sc);
    } else {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), bronzeG); shell.scale.set(fit.rx + 0.025, 0.16, fit.rz + 0.03); g.add(shell);
      for (const sd of [-1, 1]) { const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.13, 0.12), bronzeG); cheek.position.set(sd * (fit.rx + 0.005), -0.08, 0.06); cheek.rotation.y = -sd * 0.3; g.add(cheek); }
      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.08, 0.02), bronzeG); nose.position.set(0, -0.03, fit.rz + 0.03); g.add(nose);
      const nape = new THREE.Mesh(new THREE.CylinderGeometry(fit.rx + 0.03, fit.rx + 0.045, 0.09, 22, 1, true, Math.PI * 0.6, Math.PI * 0.8), bronzeG); nape.position.y = -0.06; g.add(nape);
    }
    // crista de crina de cavalo
    if (!HELM) { const crest = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.09, fit.rz * 2.3), m(o.crest ?? 0x8e2c22, { roughness: 0.95 })); crest.position.set(0, 0.2, -0.01); g.add(crest); } // o modelo já tem a crista
    if (up) attach('Head', g, new THREE.Vector3(fit.cx, fit.top + 0.01, fit.cz - 0.02), [-0.55, 0, 0]); // empurrado para o alto da cabeça (como nos bustos de Péricles)
    else attach('Head', g, new THREE.Vector3(fit.cx, fit.top - 0.1, fit.cz), [0.02, 0, 0]);
  };
  for (const e of o.extras || []) {
    if (e === 'helmet') helmet(false);
    if (e === 'helmet_up') helmet(true);
    if (e === 'petasos' || e === 'pilos' || e === 'diadem') {
      const fit = headFitOnce(), hat = new THREE.Group();
      if (e === 'petasos') { // chapéu de viagem de feltro, aba larga
        const felt = m(0x8a6a44, { roughness: 0.9 });
        const crown = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), felt); crown.scale.set(fit.rx + 0.012, 0.07, fit.rz + 0.012); hat.add(crown);
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(fit.rx * 2.3, fit.rx * 2.35, 0.012, 32), felt); brim.scale.z = fit.rz / fit.rx; hat.add(brim);
        attach('Head', hat, new THREE.Vector3(fit.cx, fit.top - 0.075, fit.cz), [0.06, 0, 0]);
      } else if (e === 'pilos') { // gorro cônico de feltro (marinheiros, trabalhadores)
        const cone = new THREE.Mesh(new THREE.ConeGeometry(fit.rx + 0.015, 0.17, 20), m(0x9a7a52, { roughness: 0.95 })); cone.position.y = 0.06; cone.scale.z = fit.rz / fit.rx; hat.add(cone);
        attach('Head', hat, new THREE.Vector3(fit.cx, fit.top - 0.07, fit.cz), [0, 0, 0]);
      } else { // diadema de ouro
        const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 5, 28), gold()); band.scale.set(fit.rx + 0.006, fit.rz + 0.006, 0.18); band.rotation.x = Math.PI / 2; hat.add(band);
        attach('Head', hat, new THREE.Vector3(fit.cx, fit.top - 0.06, fit.cz), [-0.12, 0, 0]);
      }
    }
    if (e === 'aspis') { // escudo redondo de hoplita (aspis), levado às costas
      const sh = new THREE.Group();
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.06, 32), m(0xffffff, { map: aspisTex(o.device), metalness: 0.75, roughness: 0.35 }));
      face.rotation.x = Math.PI / 2; sh.add(face);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.405, 0.022, 6, 32), bronzeG); sh.add(rim);
      const back = new THREE.Mesh(new THREE.CircleGeometry(0.4, 28), m(0x6a4a2e, { roughness: 0.8 })); back.position.z = -0.015; back.rotation.y = Math.PI; sh.add(back);
      attach('Spine2', sh, new THREE.Vector3(0.03, chest.y - 0.12, chest.z - 0.2), [0.1, Math.PI, 0.05]);
    }
    if (e === 'cuirass') { // couraça de bronze (ou de linho endurecido) e as tiras de couro (ptéryges)
      attach('Spine2', new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.158, 0.44, 28, 1, true), bronzeG), new THREE.Vector3(0, chest.y - 0.08, chest.z + 0.005), [0, 0, 0], [1, 1, 0.8]);
      attach('Spine2', new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 6, 20, Math.PI), bronzeG), new THREE.Vector3(0, neckY - 0.03, chest.z), [Math.PI / 2, 0, 0], [1.3, 1, 1]);
      if (useCloth) cloth(clothGeometry('pteryges', [[0.172, 0.06], [0.185, 0], [0.205, -0.1], [0.214, -0.2]], 14), m(0x7a5230, { roughness: 0.8, side: THREE.DoubleSide }), -0.02, 0.6);
      for (const side of ['Left', 'Right']) { // grevas
        if (!bones[side + 'Leg'] || !bones[side + 'Foot']) continue;
        const a = bonePos(side + 'Leg'), b = bonePos(side + 'Foot'), dir = b.clone().sub(a).normalize();
        const e2 = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
        attach(side + 'Leg', new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.05, 0.3, 16, 1, true), bronzeG), a.clone().lerp(b, 0.5), [e2.x, e2.y, e2.z], [1, 1, 0.9]);
      }
    }
    if (e === 'lyre') handL.add(meshAt(new THREE.TorusGeometry(0.1, 0.012, 5, 14, Math.PI), m(0x8a6a44), 0, 0.12, 0.05));

    if (e === 'spear') { const g = new THREE.Group(); g.add(meshAt(new THREE.CylinderGeometry(0.014, 0.014, 2.0, 6), m(0x7a5a36), 0, 0.55, 0)); g.add(meshAt(new THREE.ConeGeometry(0.03, 0.17, 6), bronze(), 0, 1.62, 0)); handR.add(g); }
    if (e === 'shield') { // escudo egípcio de couro de boi, topo arredondado e aro de madeira, levado às costas
      const sh = new THREE.Group();
      sh.add(meshAt(shieldGeometry(0.2, 0.6, 0.018), m(0xd9b48a, { map: TEX.hide, roughness: 0.85 }), 0, 0, 0.004));
      sh.add(meshAt(shieldGeometry(0.218, 0.625, 0.012), m(0x6a4526, { roughness: 0.7 }), 0, -0.012, -0.006));
      sh.add(meshAt(new THREE.SphereGeometry(0.03, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), bronze(), 0, 0.33, 0.012, [Math.PI / 2, 0, 0]));
      attach('Spine2', sh, new THREE.Vector3(0.03, chest.y - 0.36, chest.z - 0.17), [0.12, Math.PI, 0.1]);
    }
    if (e === 'staff') handR.add(meshAt(new THREE.CylinderGeometry(0.013, 0.017, 1.7, 6), m(0x6b4a2e), 0, 0.3, 0));
    if (e === 'crook') { handR.add(meshAt(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), m(0x2c5d9c), 0, 0.12, 0)); handR.add(meshAt(new THREE.TorusGeometry(0.05, 0.014, 5, 10, Math.PI), gold(), 0.05, 0.32, 0)); handL.add(meshAt(new THREE.CylinderGeometry(0.013, 0.013, 0.35, 6), gold(), 0, 0.1, 0)); }
    if (e === 'scroll') handL.add(meshAt(new THREE.CylinderGeometry(0.028, 0.028, 0.2, 8), m(0xe9dcb4), 0, 0.0, 0.04, [0, 0, Math.PI / 2]));
    if (e === 'basket') { headPart(new THREE.CylinderGeometry(0.19, 0.14, 0.15, 12), m(0xb79c5c, { roughness: 1 }), [0, R * 1.4, 0]); for (let i = 0; i < 5; i++) headPart(new THREE.SphereGeometry(0.055, 7, 5), pick([m(0xa82030), m(0xc88a48), m(0x6d9a3a)]), [rr(-0.09, 0.09), R * 1.4 + 0.09, rr(-0.09, 0.09)]); }
    if (e === 'jar') { const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(0.03 + Math.sin(t * Math.PI) * 0.12, t * 0.32)); } headPart(new THREE.LatheGeometry(pts, 12), m(0xa4552f), [0, R * 1.0, 0]); }
    if (e === 'khopesh') { const k = new THREE.Group(); k.add(meshAt(new THREE.CylinderGeometry(0.017, 0.017, 0.14, 6), m(0x3a2414), 0, 0.02, 0)); const bl = meshAt(new THREE.TorusGeometry(0.18, 0.016, 4, 12, Math.PI * 0.8), bronze(), 0.16, 0.25, 0); bl.rotation.z = 0.5; bl.scale.z = 0.4; k.add(bl); handR.add(k); }
  }

  const h = o.height || (female ? rr(1.58, 1.7) : rr(1.66, 1.8));
  const natural = headTop;
  root.scale.setScalar(h / natural);

  // recorte por visão: as malhas com pele ganham uma esfera fixa que cobre o corpo em qualquer pose (em pé, nadando,
  // sentado); fora da câmera (ou da caixa de sombra) o personagem não é desenhado nem tem o esqueleto recalculado
  model.traverse((n) => { if (n.isSkinnedMesh) { n.frustumCulled = true; n.boundingSphere = BODY_SPHERE; } });
  // camada 2: aparece na tela e nas sombras, fora do reflexo do Nilo e da oclusão (desempenho)
  root.traverse((n) => n.layers.set(2));
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  const act = (name) => {
    name = ALIAS[name] || name;
    if (!actions[name]) { const c = CLIPS[name]; if (!c) return null; actions[name] = mixer.clipAction(c); }
    return actions[name];
  };
  // junta as peças rígidas presas a cada osso (sandálias, chapéu, colares, saiote rígido...) por material
  if (tail) tail.userData.noMerge = true;
  mergeSiblings(model);
  return { root, model, mixer, act, handR, handL, armR: { hand: handR }, bones, tail, skirt, holding: false, pose: o.pose || null, walkClip: female ? 'andar_f' : 'andar', once: null };
}

// ---------------------------------------------------------------------------
// Animação: mistura por pesos, locomoção sincronizada (ver humans.js para o histórico)
// ---------------------------------------------------------------------------
const LOCO = [
  { name: 'idle', speed: 0 },
  { name: 'andar', speed: 1.4 },
  { name: 'trotar', speed: 3.4 },
  { name: 'correr', speed: 6.5 },
];
const LOCO_MODES = new Set(['idle', 'walk', 'run', 'wade']);
const MODE_CLIP = { air: 'caindo', swim: 'nadar', dive: 'nadar', swimIdle: 'boiar', talk: 'conversar', work: 'ajoelhado', sit: 'sentado', guard: 'idle', torch: 'idle', dance: 'idle', push: 'idle' };

function calibrateLocomotion() {
  const probe = SkeletonUtils.clone(BASES.explorador);
  const mixer = new THREE.AnimationMixer(probe);
  let foot = null; probe.traverse((n) => { if (n.isBone && /LeftFoot$/.test(n.name)) foot = n; });
  if (!foot) return;
  const v = new THREE.Vector3();
  for (const l of LOCO) {
    const clip = CLIPS[l.name]; if (!clip || l.speed === 0) continue;
    const a = mixer.clipAction(clip); a.play();
    let zmin = Infinity, zmax = -Infinity;
    for (let i = 0; i <= 40; i++) { a.time = (i / 40) * clip.duration; mixer.update(0); probe.updateMatrixWorld(true); foot.getWorldPosition(v); zmin = Math.min(zmin, v.z); zmax = Math.max(zmax, v.z); }
    a.stop();
    const measured = (2 * (zmax - zmin)) / clip.duration;
    if (measured > 0.5 && measured < 12) l.speed = measured;
  }
  LOCO.sort((p, q) => p.speed - q.speed);
  console.info('Velocidades medidas (Mixamo):', LOCO.map((l) => l.name + ' ' + l.speed.toFixed(2)).join(', '));
}

function locoTargets(speed, walkName) {
  const s = Math.abs(speed);
  const T = {};
  for (let i = 0; i < LOCO.length - 1; i++) {
    const a = LOCO[i], b = LOCO[i + 1];
    if (s < b.speed || i === LOCO.length - 2) {
      const f = Math.min(1, Math.max(0, (s - a.speed) / (b.speed - a.speed)));
      const na = a.name === 'andar' ? walkName : a.name, nb = b.name === 'andar' ? walkName : b.name;
      T[na] = 1 - f; T[nb] = f;
      break;
    }
  }
  return T;
}

export function playOnce(r, name, duration) {
  name = ALIAS[name] || name;
  const a = r.act(name); if (!a) return;
  a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = 1; a.enabled = true; a.play();
  r.once = { name, t: duration ?? a.getClip().duration * 0.9 };
}

export function animateHumanoid(r, dt, speed, mode, t) {
  if (r.statue) return;
  r.w = r.w || {};
  let T; let fade = 6;
  if (r.once) { r.once.t -= dt; if (r.once.t <= 0) r.once = null; }
  if (r.once) { T = { [r.once.name]: 1 }; fade = 10; }
  else if (LOCO_MODES.has(mode)) T = locoTargets(mode === 'idle' ? 0 : speed, r.walkClip);
  else { let mm = mode; if (mode === 'swim' && Math.abs(speed) < 0.3) mm = 'swimIdle'; T = { [MODE_CLIP[mm] || 'idle']: 1 }; fade = mode === 'air' ? 9 : 5; }
  const names = new Set([...Object.keys(r.w), ...Object.keys(T)]);
  let sum = 0;
  for (const n of names) {
    const cur = r.w[n] || 0, tgt = T[n] || 0, step = dt * fade;
    const v = tgt > cur ? Math.min(tgt, cur + step) : Math.max(tgt, cur - step);
    if (v <= 0.0001 && tgt === 0) { delete r.w[n]; const a = r.act(n); if (a) { a.stop(); a.enabled = false; } }
    else { r.w[n] = v; sum += v; }
  }
  const walkAlias = (n) => (n === r.walkClip ? 'andar' : n);
  const moving = LOCO.slice(1).filter((l) => r.w[l.name === 'andar' ? r.walkClip : l.name]);
  if (moving.length) {
    let stride = 0, wsum = 0;
    for (const l of moving) { const nm = l.name === 'andar' ? r.walkClip : l.name; const d = r.act(nm).getClip().duration; stride += r.w[nm] * l.speed * d; wsum += r.w[nm]; }
    stride /= wsum || 1;
    r.locoPhase = ((r.locoPhase ?? Math.random()) + (dt * speed) / Math.max(0.3, stride) + 10) % 1;
  }
  for (const n in r.w) {
    const a = r.act(n); if (!a) continue;
    const isOnce = r.once && r.once.name === n;
    if (!a.isScheduled() && !isOnce) { a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.play(); }
    a.enabled = true;
    a.setEffectiveWeight(r.w[n] / (sum || 1));
    const loco = LOCO.find((l) => l.name === walkAlias(n) && l.speed > 0);
    if (loco && !isOnce) { a.timeScale = 0; a.time = r.locoPhase * a.getClip().duration; }
    else if (!isOnce) a.timeScale = n === 'nadar' ? Math.max(0.6, Math.min(3, Math.abs(speed) * 0.8)) : 1; // ritmo da braçada acompanha a velocidade (~1,1 m por braçada)
  }
  r.mixer.update(dt);
}

// Estátua: corpo congelado em pé, em granito escuro (ou pintado), com ouro
export function makeStatue({ h = 8 } = {}) {
  // estátua de calcário pintada, como as egípcias: pele ocre avermelhada, saiote branco, nemes e ouro
  const rig = makeHumanoid({ outfit: 'pharaoh', hair: 'nemes', extras: ['crook'], height: h, base: 'bryce', collar: 'royal' });
  const paint = (c, r = 0.88) => new THREE.MeshStandardMaterial({ color: c, roughness: r, side: THREE.DoubleSide });
  const skinP = paint(0x9c5536), white = paint(0xf0e8d6), goldP = gold();
  rig.root.traverse((n) => {
    if (!n.isMesh) return;
    n.layers.set(2);
    if (n.userData.skinPart) { n.material = skinP; return; }
    if (!n.isSkinnedMesh) { if (n.material && n.material.transparent) n.material = white; return; }
    const p = part(n.name);
    if (/Body|Shirt|Tops/.test(p)) n.material = skinP;
    else if (/Pants|Shorts|Bottoms/.test(p)) n.material = white;
    else if (/Shoes|Sneakers|Heels/.test(p)) n.material = skinP; // estátuas egípcias são descalças
  });
  const a = rig.act('idle'); a.play(); rig.mixer.update(0.3);
  rig.root.updateMatrixWorld(true);
  rig.statue = true;
  return rig.root;
}

// ---------------------------------------------------------------------------
// Cabeça humana esculpida (malha estática do modelo realista, só cabeça e pescoço)
// usada como rosto de pedra das esfinges. Origem: base do pescoço; altura ~0,3 m.
// ---------------------------------------------------------------------------
const headCache = {};
export function stoneHeadGeometry(base = 'brian') {
  if (headCache[base]) return headCache[base];
  const sc = BASES[base]; sc.updateMatrixWorld(true);
  let body = null, neck = null;
  sc.traverse((n) => { if (n.isSkinnedMesh && /Body/.test(part(n.name))) body = n; if (n.isBone && /Neck$/.test(n.name)) neck = n; });
  const ny = new THREE.Vector3().setFromMatrixPosition(neck.matrixWorld).y - 0.03;
  // as posições vêm comprimidas; a posição real sai do esqueleto em repouso (pose T)
  body.skeleton.update();
  const src = body.geometry, cnt = src.attributes.position.count;
  const real = new Float32Array(cnt * 3), v = new THREE.Vector3();
  for (let i = 0; i < cnt; i++) { v.fromBufferAttribute(src.attributes.position, i); body.applyBoneTransform(i, v); v.applyMatrix4(body.matrixWorld); real.set([v.x, v.y, v.z], i * 3); }
  const g1 = new THREE.BufferGeometry(); g1.setAttribute('position', new THREE.BufferAttribute(real, 3));
  if (src.attributes.uv) g1.setAttribute('uv', src.attributes.uv);
  if (src.index) g1.setIndex(src.index);
  const g0 = g1.index ? g1.toNonIndexed() : g1;
  const p = g0.attributes.position;
  const keep = [];
  for (let i = 0; i < p.count; i += 3) {
    let ok = true;
    for (let j = 0; j < 3; j++) if (p.getY(i + j) < ny || Math.abs(p.getX(i + j)) > 0.16) ok = false;
    if (ok) keep.push(i);
  }
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'uv']) {
    const a = g0.attributes[name]; if (!a) continue;
    const n = a.itemSize, arr = new Float32Array(keep.length * 3 * n);
    keep.forEach((i, k) => { for (let j = 0; j < 3; j++) for (let c = 0; c < n; c++) arr[(k * 3 + j) * n + c] = c === 0 ? a.getX(i + j) : c === 1 ? a.getY(i + j) : a.getZ(i + j); });
    out.setAttribute(name, new THREE.BufferAttribute(arr, n));
  }
  out.computeBoundingBox();
  const bb = out.boundingBox, c = bb.getCenter(new THREE.Vector3());
  out.translate(-c.x, -bb.min.y, -c.z);
  out.computeVertexNormals();
  out.computeBoundingBox();
  headCache[base] = out;
  return out;
}

// Cavaleiro: o Mixamo não tem animação de montaria, então parte da pose sentada e refaz as pernas por cima:
// quadril assentado no lombo, coxas abertas abraçando o animal e as canelas penduradas ao lado da barriga.
// seat = ponto do lombo (mundo); fwd = frente do animal (mundo, horizontal); width = meia-largura da barriga
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qw = new THREE.Quaternion();
function aimBone(bone, child, dir) {
  bone.getWorldPosition(_a); child.getWorldPosition(_b);
  const cur = _b.sub(_a).normalize();
  _q.setFromUnitVectors(cur, dir);
  bone.getWorldQuaternion(_qw); _qw.premultiply(_q);
  bone.parent.getWorldQuaternion(_qp);
  bone.quaternion.copy(_qp.invert().multiply(_qw));
  bone.updateMatrixWorld(true);
}
export function ridePose(r, seat, fwd, width = 0.3, shinBack = 0.22) {
  const B = r.bones; if (!B.Hips || !B.LeftUpLeg) return;
  r.root.updateMatrixWorld(true);
  // quadril em cima do lombo
  const hp = B.Hips.getWorldPosition(new THREE.Vector3());
  r.root.position.x += seat.x - hp.x; r.root.position.z += seat.z - hp.z; r.root.position.y += seat.y + 0.1 - hp.y;
  r.root.updateMatrixWorld(true);
  const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3().crossVectors(up, fwd).normalize(); // esquerda do animal
  for (const s of ['Left', 'Right']) {
    const th = B[s + 'UpLeg'], kn = B[s + 'Leg'], ft = B[s + 'Foot']; if (!th || !kn || !ft) continue;
    const sg = Math.sign(th.getWorldPosition(new THREE.Vector3()).sub(B.Hips.getWorldPosition(new THREE.Vector3())).dot(side)) || (s === 'Left' ? 1 : -1);
    const out = side.clone().multiplyScalar(sg);
    // coxa: para fora e um pouco para a frente, descendo pela curva do lombo
    aimBone(th, kn, out.clone().multiplyScalar(0.62 + width).add(fwd.clone().multiplyScalar(0.42)).addScaledVector(up, -0.62).normalize());
    // canela: pendurada junto à barriga, o pé um pouco para trás (no jumento, baixo, o joelho dobra mais)
    aimBone(kn, ft, out.clone().multiplyScalar(0.08).add(fwd.clone().multiplyScalar(-shinBack)).addScaledVector(up, -1).normalize());
    // pé quase horizontal, ponta para a frente
    const toe = B[s + 'ToeBase'];
    if (toe) aimBone(ft, toe, fwd.clone().multiplyScalar(0.9).addScaledVector(up, -0.45).addScaledVector(out, 0.1).normalize());
  }
}
