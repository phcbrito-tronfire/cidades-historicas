// Personagens realistas do Mixamo (Adobe): explorador "Josh" e moradores de Mênfis.
// O corpo dos modelos do Mixamo é só cabeça, mãos e pés: o resto é a roupa. Para os egípcios,
// as peças modernas são "repintadas" (camisa vira torso nu, bermuda/calça vira saiote de linho,
// tênis vira sandália) e recebem por cima saiotes, vestidos, perucas e coroas presos aos ossos.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { rr, rand, pick } from './util.js';

const BASES = {};
const CLIPS = {};
let TEX = null;
const DIR = 'assets/models/mixamo/';
export const SKINS = [0xb98a68, 0xa87652, 0xc39675, 0x9a6a48, 0xb07a58, 0x8e5f40];
// (o Joe, de terno, ficou de fora: sem o paletó o tronco dele é oco)
const MEN = ['bryce', 'brian'];
const WOMEN = ['kate', 'megan', 'elizabeth'];
const ANIMS = ['idle', 'andar', 'andar_f', 'trotar', 'correr', 'pular', 'caindo', 'aterrissar', 'nadar', 'boiar', 'conversar', 'pegar', 'espada', 'ajoelhado', 'sentado'];
// nomes antigos usados pelo resto do jogo → animações do Mixamo
const ALIAS = { Jump_Land: 'aterrissar', Sword_Attack: 'espada', PickUp_Table: 'pegar' };

export async function loadHumanModel(_unused, tex, onProgress) {
  TEX = tex;
  const L = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const names = ['explorador', ...MEN, ...WOMEN];
  let done = 0; const total = names.length + ANIMS.length;
  const tick = () => onProgress && onProgress(++done / total);
  await Promise.all([
    ...names.map(async (n) => { const g = await L.loadAsync(DIR + n + '.glb'); BASES[n] = g.scene; tick(); }),
    ...ANIMS.map(async (n) => {
      const g = await L.loadAsync(DIR + 'anim/' + n + '.glb');
      const clip = g.animations[0];
      clip.name = n;
      // laços de locomoção: remove o deslocamento horizontal do quadril (o jogo é quem move)
      if (['andar', 'andar_f', 'trotar', 'correr', 'nadar', 'idle', 'conversar', 'boiar'].includes(n)) {
        for (const tr of clip.tracks) if (/Hips\.position$/.test(tr.name)) { const v = tr.values; const x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } }
      }
      // escala, se a animação não serve para o próprio corpo, não vale mexer: os ossos não têm scale
      clip.tracks = clip.tracks.filter((tr) => !/\.scale$/.test(tr.name));
      CLIPS[n] = clip; tick();
    }),
  ]);
  // alguns modelos vêm com prefixo numerado nos ossos (mixamorig12Hips): padroniza para as animações encaixarem
  for (const b of Object.values(BASES)) b.traverse((o) => { o.name = o.name.replace(/^mixamorig\d+/, 'mixamorig'); if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  for (const c of Object.values(CLIPS)) for (const tr of c.tracks) tr.name = tr.name.replace(/^mixamorig\d+/, 'mixamorig');
  calibrateLocomotion();
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

// vestido: perfil de torno (justo na cintura, solto nas pernas, barra levemente aberta) com pregas verticais
let dressGeo = null;
function dressGeometry() {
  if (dressGeo) return dressGeo;
  const prof = [[0.152, 0.09], [0.165, 0], [0.188, -0.18], [0.212, -0.42], [0.238, -0.66], [0.27, -0.9], [0.282, -0.96]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 48);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = Math.min(1, Math.max(0, -y / 0.9)); // pregas crescem em direção à barra
    const k = 1 + 0.03 * t * Math.sin(Math.atan2(z, x) * 26);
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return (dressGeo = g);
}

function meshAt(geo, mat, x, y, z, rot) {
  const me = new THREE.Mesh(geo, mat); me.position.set(x, y, z); if (rot) me.rotation.set(...rot); me.castShadow = true; return me;
}

export function makeHumanoid(o = {}) {
  const outfit = o.outfit || 'kilt';
  const isExp = outfit === 'explorer';
  const female = outfit === 'dress';
  const baseName = isExp ? 'explorador' : o.base || (outfit === 'priest' ? 'brian' : female ? pick(WOMEN) : pick(['bryce', 'bryce', 'brian']));
  const root = new THREE.Group();
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
  const fold = (mat, color, rough = 0.95) => { const c = mat.clone(); c.map = null; c.color.set(color); c.roughness = rough; c.metalness = 0; c.side = THREE.DoubleSide; c.transparent = false; c.opacity = 1; c.alphaTest = 0; return c; };
  for (const me of meshes) {
    const p = part(me.name);
    const mat = me.material;
    if (isExp) { // visual de aventureiro: jaqueta de couro marrom e calça cáqui (estilo Indiana Jones / Nathan Drake)
      if (/Suit/.test(p)) me.material = fold(mat, 0x6e4528, 0.62);
      if (/Pants/.test(p)) me.material = fold(mat, 0x8f7a54, 0.9);
      if (/Shoes/.test(p)) me.material = fold(mat, 0x3a2616, 0.7);
      continue;
    }
    if (/Body/.test(p)) { const c = mat.clone(); c.color.set(skin); c.side = THREE.DoubleSide; me.material = c; continue; }
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
    if (/Shoes|Sneakers|Heels/.test(p)) { me.material = fold(mat, outfit === 'pharaoh' ? 0xd9a23e : 0x8a6a42, 0.8); continue; }
  }

  // prende um objeto a um osso, a partir de posição/rotação no espaço do modelo (pose T)
  const attach = (bone, obj, pos, rot = [0, 0, 0], scale = [1, 1, 1]) => {
    const b = bones[bone]; if (!b) return obj;
    const want = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
    const local = new THREE.Matrix4().multiplyMatrices(rootInv, b.matrixWorld).invert().multiply(want);
    local.decompose(obj.position, obj.quaternion, obj.scale);
    obj.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.frustumCulled = false; } });
    b.add(obj);
    return obj;
  };
  const hp = bonePos('Head');
  const HC = new THREE.Vector3(0, (hp.y + headTop) / 2 + 0.01, hp.z + 0.01); // centro do crânio
  const headPart = (geo, mat, off, rot, sc) => attach('Head', new THREE.Mesh(geo, mat), HC.clone().add(new THREE.Vector3(...off)), rot, sc);
  const R = (headTop - HC.y) * 1.02; // "raio" do crânio
  const cap = (mat, sc = [1, 1, 1], off = [0, 0.015, -0.01], cut = 0.52) =>
    headPart(new THREE.SphereGeometry(1, 22, 14, 0, Math.PI * 2, 0, Math.PI * cut), mat, off, [0, 0, 0], [R * 0.86 * sc[0], R * 1.02 * sc[1], R * 1.02 * sc[2]]);

  const hair = o.hair || (isExp ? 'fedora' : 'short');
  const black = m(0x15100c, { roughness: 0.85 });
  switch (hair) {
    case 'short': cap(black, [1.06, 1, 1.06]); break;
    case 'long':
      cap(black, [1.12, 1.06, 1.1], [0, 0.015, -0.015], 0.6);
      headPart(new THREE.BoxGeometry(R * 1.75, R * 2.2, R * 0.8), black, [0, -R * 1.05, -R * 0.55]);
      for (const s of [-1, 1]) headPart(new THREE.BoxGeometry(R * 0.42, R * 2.0, R * 0.42), black, [s * R * 0.82, -R * 1.1, R * 0.3]);
      headPart(new THREE.TorusGeometry(R * 0.92, R * 0.06, 5, 22), gold(), [0, R * 0.45, -0.005], [Math.PI / 2, 0, 0], [1, 1.12, 1]);
      break;
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
      const felt = m(0x6b4a2e, { roughness: 0.85 });
      const y0 = headTop - HC.y; // topo da cabeça em relação ao centro
      headPart(new THREE.CylinderGeometry(R * 0.86, R * 1.02, R * 0.95, 22), felt, [0, y0 - R * 0.15, -0.01], [-0.06, 0, 0], [1, 1, 1.12]);
      headPart(new THREE.CylinderGeometry(R * 1.72, R * 1.78, 0.012, 28), felt, [0, y0 - R * 0.6, 0.0], [-0.06, 0, 0], [1, 1, 1.1]);
      headPart(new THREE.CylinderGeometry(R * 1.04, R * 1.04, R * 0.24, 22), m(0x2a1a0e), [0, y0 - R * 0.5, -0.01], [-0.06, 0, 0], [1, 1, 1.12]);
      headPart(new THREE.BoxGeometry(R * 0.3, R * 0.16, R * 1.4), m(0x5a3d24), [0, y0 + R * 0.3, -0.01]); // vinco da copa
    } break;
    default: break; // careca (sacerdotes)
  }

  // ---- saiotes, vestidos e detalhes presos ao quadril e ao peito
  const hips = bonePos('Hips');
  const hipsPart = (geo, mat, dy, rot, sc) => attach('Hips', new THREE.Mesh(geo, mat), new THREE.Vector3(0, hips.y + dy, hips.z + 0.01), rot, sc);
  const linenM = m(linen, { roughness: 0.95, side: THREE.DoubleSide });
  switch (outfit) {
    case 'kilt': case 'soldier': case 'pharaoh': hipsPart(new THREE.CylinderGeometry(0.18, 0.3, 0.58, 24, 1, true), linenM, -0.2); break;
    case 'worker': hipsPart(new THREE.CylinderGeometry(0.175, 0.29, 0.5, 22, 1, true), linenM, -0.16); break;
    case 'longkilt': case 'priest': hipsPart(new THREE.CylinderGeometry(0.175, 0.3, 0.86, 22, 1, true), linenM, -0.35); break;
    case 'dress': { // kalasíris: linho plissado justo na cintura, solto nas pernas, com faixa colorida
      hipsPart(dressGeometry(), linenM, -0.04, [0, 0, 0], [1, 1, 0.86]);
      hipsPart(new THREE.CylinderGeometry(0.158, 0.162, 0.045, 28, 1, true), m(o.sash ?? 0xa8402c, { roughness: 0.8, side: THREE.DoubleSide }), 0.06, [0, 0, 0], [1, 1, 0.86]);
    } break;
  }
  if (outfit === 'pharaoh') {
    hipsPart(new THREE.BoxGeometry(0.13, 0.36, 0.015), gold(), -0.16, [-0.1, 0, 0]).position.z += 0;
  }
  const chest = bones.Spine2 ? bonePos('Spine2') : hips.clone().add(new THREE.Vector3(0, 0.35, 0));
  const neckY = bones.Neck ? bonePos('Neck').y : chest.y + 0.15;
  if (outfit === 'soldier') attach('Hips', new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.015), m(0xffffff, { map: TEX.hide })), new THREE.Vector3(0, hips.y - 0.16, hips.z + 0.24), [-0.15, 0, 0]);
  if (outfit === 'priest') attach('Spine2', new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.5, 0.27), m(0xffffff, { map: TEX.leopard, roughness: 0.9 })), new THREE.Vector3(0.02, chest.y - 0.05, chest.z), [0, 0, 0.35]);
  const collar = o.collar === 'royal' || outfit === 'pharaoh' ? 'royal' : o.collar;
  if (collar && !isExp) {
    const c = attach('Spine2', new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.175, 0.1, 28, 1, true), collar === 'royal' ? m(0xffc64a, { metalness: 1, roughness: 0.3, side: THREE.DoubleSide }) : m(collar, { side: THREE.DoubleSide, roughness: 0.5 })), new THREE.Vector3(0, neckY - 0.02, chest.z - 0.005), [0.08, 0, 0], [1.12, 1, 0.78]);
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

  // ---- mãos (o +y do objeto aponta para o ombro, como no sistema anterior)
  const handR = new THREE.Group(); const handL = new THREE.Group();
  if (bones.RightHand) attach('RightHand', handR, bonePos('RightHand').add(new THREE.Vector3(-0.07, -0.01, 0.02)), [0, 0, -Math.PI / 2]);
  if (bones.LeftHand) attach('LeftHand', handL, bonePos('LeftHand').add(new THREE.Vector3(0.07, -0.01, 0.02)), [0, 0, Math.PI / 2]);
  for (const e of o.extras || []) {
    if (e === 'spear') { const g = new THREE.Group(); g.add(meshAt(new THREE.CylinderGeometry(0.014, 0.014, 2.0, 6), m(0x7a5a36), 0, 0.55, 0)); g.add(meshAt(new THREE.ConeGeometry(0.03, 0.17, 6), bronze(), 0, 1.62, 0)); handR.add(g); }
    if (e === 'shield') { const sh = meshAt(new THREE.BoxGeometry(0.38, 0.58, 0.03), m(0xffffff, { map: TEX.hide }), 0.0, 0.05, 0.07); sh.add(meshAt(new THREE.CylinderGeometry(0.19, 0.19, 0.03, 14, 1, false, 0, Math.PI), sh.material, 0, 0.29, 0, [Math.PI / 2, 0, 0])); handL.add(sh); }
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

  // camada 2: aparece na tela e nas sombras, fora do reflexo do Nilo e da oclusão (desempenho)
  root.traverse((n) => n.layers.set(2));
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  const act = (name) => {
    name = ALIAS[name] || name;
    if (!actions[name]) { const c = CLIPS[name]; if (!c) return null; actions[name] = mixer.clipAction(c); }
    return actions[name];
  };
  return { root, model, mixer, act, handR, handL, armR: { hand: handR }, bones, holding: false, pose: o.pose || null, walkClip: female ? 'andar_f' : 'andar', once: null };
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
const MODE_CLIP = { air: 'caindo', swim: 'nadar', swimIdle: 'boiar', talk: 'conversar', work: 'ajoelhado', sit: 'sentado', guard: 'idle', torch: 'idle', dance: 'idle', push: 'idle' };

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
    else if (!isOnce) a.timeScale = n === 'nadar' ? Math.max(0.6, Math.min(1.6, Math.abs(speed) / 2.6)) : 1;
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
