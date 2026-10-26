// Pessoas de Mênfis sobre um manequim humano CC0 (Quaternius) com 46 animações.
// A roupa é "pintada" no corpo por região (deforma junto com a animação) e os
// acessórios (perucas, chapéus, saiotes, armas) ficam presos aos ossos.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rr, rand, pick } from '../comum/util.js';

let BASE = null;
let HEAD = null; // cabeça escaneada (Lee Perry-Smith, CC-BY 3.0)
const CLIPS = {};
let TEX = null;

export const SKINS = [0x8d5a3b, 0x7a4a2e, 0x9c6644, 0x6b3f26, 0xa8724c, 0x5e3720];

export async function loadHumanModel(url, tex, onProgress) {
  TEX = tex;
  const gltf = await new GLTFLoader().loadAsync(url, (e) => onProgress && e.total && onProgress(e.loaded / e.total));
  BASE = gltf.scene;
  // suaviza o manequim (ele vem com faces chapadas): junta vértices iguais e recalcula as normais
  BASE.traverse((n) => {
    if (!n.isSkinnedMesh) return;
    let g = n.geometry.clone();
    g.deleteAttribute('normal');
    if (g.attributes.uv) g.deleteAttribute('uv');
    g = mergeVertices(g, 1e-4);
    g.computeVertexNormals();
    n.geometry = g;
  });
  for (const c of gltf.animations) CLIPS[c.name] = c;
  try {
    const hg = await new GLTFLoader().loadAsync('assets/models/head/LeePerrySmith.glb');
    const tl = new THREE.TextureLoader();
    const [col, nor] = await Promise.all([tl.loadAsync('assets/models/head/Map-COL.jpg'), tl.loadAsync('assets/models/head/Infinite-Level_02_Tangent_SmoothUV.jpg')]);
    col.colorSpace = THREE.SRGBColorSpace; col.flipY = false; nor.flipY = false;
    hg.scene.traverse((n) => { if (n.isMesh && !HEAD) HEAD = { geo: n.geometry, col, nor }; });
    HEAD.geo.computeBoundingBox();
  } catch (e) { console.warn('cabeça realista indisponível', e); }
  calibrateLocomotion();
}

// mede a velocidade real de cada animação de passo pelo deslocamento do pé (evita o pé "patinando")
function calibrateLocomotion() {
  const probe = SkeletonUtils.clone(BASE);
  const mixer = new THREE.AnimationMixer(probe);
  const bones = {};
  probe.traverse((n) => { if (n.isBone) bones[n.name] = n; });
  const foot = bones['DEF-footL'] || bones['DEF-foot.L'];
  if (!foot) return;
  const v = new THREE.Vector3();
  for (const l of LOCO) {
    const clip = CLIPS[l.name]; if (!clip || l.speed === 0) continue;
    const a = mixer.clipAction(clip); a.play();
    let zmin = Infinity, zmax = -Infinity;
    for (let i = 0; i <= 40; i++) {
      a.time = (i / 40) * clip.duration; mixer.update(0); probe.updateMatrixWorld(true);
      foot.getWorldPosition(v); zmin = Math.min(zmin, v.z); zmax = Math.max(zmax, v.z);
    }
    a.stop();
    const measured = (2 * (zmax - zmin)) / clip.duration;
    if (measured > 0.5 && measured < 12) l.speed = measured;
  }
  LOCO.sort((p, q) => p.speed - q.speed);
  console.info('Velocidades medidas das animações:', LOCO.map((l) => l.name + ' ' + l.speed.toFixed(2) + ' m/s').join(', '));
}

// ---------------------------------------------------------------------------
// material com roupa pintada por região do corpo (coordenadas da pose T)
// ---------------------------------------------------------------------------
const OUTFIT_GLSL = /* glsl */`
uniform vec3 uSkin, uTop, uBottom, uShoe, uBelt, uCollar, uTrim;
uniform vec4 uTopCfg;  // yMin, yMax, mangaX, ligado
uniform vec4 uBotCfg;  // yMin, yMax, pregas, ligado
uniform vec4 uMisc;    // alturaCalçado, cinto, colar, camisa aberta
uniform float uHideHead;
varying vec3 vBind;
float hsh(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
vec3 outfitColor(vec3 p){
  vec3 c = uSkin * (0.94 + 0.06 * hsh(floor(p * 140.0)));
  float ax = abs(p.x);
  bool arm = ax > 0.215 && p.y > 1.28;
  if (uBotCfg.w > 0.5 && !arm && p.y > uBotCfg.x && p.y < uBotCfg.y) {
    c = uBottom;
    if (uBotCfg.z > 0.5) c *= 0.9 + 0.1 * sin(atan(p.x, p.z) * 46.0);
    c *= 0.95 + 0.05 * hsh(floor(p * 300.0));
  }
  if (uTopCfg.w > 0.5) {
    bool torso = !arm && p.y > uTopCfg.x && p.y < uTopCfg.y;
    bool sleeve = arm && ax < uTopCfg.z;
    if (torso || sleeve) {
      c = uTop * (0.93 + 0.07 * hsh(floor(p * 220.0)));
      if (uMisc.w > 0.5 && torso && p.z > 0.0 && ax < 0.02 + (p.y - 1.22) * 0.13 && p.y > 1.22) c = uTrim;
    }
  }
  if (uMisc.y > 0.5 && !arm && p.y > 0.965 && p.y < 1.03) c = uBelt;
  if (uMisc.z > 0.5 && !arm && p.y > 1.36 && p.y < 1.5) {
    float b = fract(p.y * 45.0);
    c = mix(uCollar, uTrim, step(0.55, b));
  }
  if (p.y < uMisc.x) c = uShoe;
  return c;
}`;

function outfitMaterial(cfg) {
  const u = {
    uSkin: { value: new THREE.Color(cfg.skin) },
    uTop: { value: new THREE.Color(cfg.top ?? 0xffffff) },
    uBottom: { value: new THREE.Color(cfg.bottom ?? 0xf1ead8) },
    uShoe: { value: new THREE.Color(cfg.shoe ?? 0x6a4a2a) },
    uBelt: { value: new THREE.Color(cfg.belt ?? 0x6a4a2a) },
    uCollar: { value: new THREE.Color(cfg.collar ?? 0x2c5d9c) },
    uTrim: { value: new THREE.Color(cfg.trim ?? 0xd9a23e) },
    uTopCfg: { value: new THREE.Vector4(...(cfg.topCfg || [0, 0, 0, 0])) },
    uBotCfg: { value: new THREE.Vector4(...(cfg.botCfg || [0, 0, 0, 0])) },
    uMisc: { value: new THREE.Vector4(...(cfg.misc || [0, 0, 0, 0])) },
    uHideHead: { value: cfg.hideHead ? 1 : 0 },
  };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + OUTFIT_GLSL)
      .replace('#include <map_fragment>', '#include <map_fragment>\nif (uHideHead > 0.5 && vBind.y > 1.525 && abs(vBind.x) < 0.14) discard;\ndiffuseColor.rgb *= outfitColor(vBind);');
  };
  mat.customProgramCacheKey = () => 'outfit-v1';
  return mat;
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

// centro da cabeça na pose T e eixos
const HC = new THREE.Vector3(0, 1.675, 0.005);

const OUTFITS = {
  explorer: (s) => ({ top: 0x5b3a22, bottom: 0xa58e62, shoe: 0x2e1e12, belt: 0x2a1a0e, trim: 0xd8cfb4, topCfg: [0.95, 1.53, 0.775, 1], botCfg: [0.0, 1.0, 0, 1], misc: [0.34, 1, 0, 1], skin: s }),
  kilt: (s, o) => ({ bottom: o.linen ?? 0xf1ead8, botCfg: [0.56, 1.03, 1, 1], misc: [0.04, rand() < 0.4 ? 1 : 0, o.collar ? 1 : 0, 0], collar: o.collar, belt: 0xb79c5c, shoe: 0xb79c5c, skin: s }),
  worker: (s, o) => ({ bottom: o.linen ?? 0xe8dcc0, botCfg: [0.62, 1.02, 0, 1], misc: [0, 0, 0, 0], skin: s }),
  longkilt: (s, o) => ({ bottom: o.linen ?? 0xf1ead8, botCfg: [0.14, 1.04, 1, 1], misc: [0.04, 1, o.collar ? 1 : 0, 0], collar: o.collar, belt: 0xd9a23e, shoe: 0xb79c5c, skin: s }),
  priest: (s, o) => ({ bottom: 0xf6f1e4, botCfg: [0.12, 1.06, 1, 1], misc: [0.04, 0, o.collar ? 1 : 0, 0], collar: o.collar, shoe: 0xc8b07a, skin: s }),
  dress: (s, o) => ({ bottom: o.linen ?? 0xf1ead8, botCfg: [0.1, 1.33, 1, 1], misc: [0.04, 0, o.collar ? 1 : 0, 0], collar: o.collar, trim: 0xd9a23e, shoe: 0xb79c5c, skin: s }),
  soldier: (s) => ({ top: 0xd8c8a0, topCfg: [1.0, 1.46, 0, 1], bottom: 0xefe6d2, botCfg: [0.6, 1.03, 1, 1], misc: [0.05, 1, 0, 0], belt: 0x6a4a2a, shoe: 0x8a6a3a, skin: s }),
  pharaoh: (s) => ({ bottom: 0xf6f1e4, botCfg: [0.5, 1.04, 1, 1], misc: [0.05, 1, 1, 0], belt: 0xffc64a, collar: 0xffc64a, trim: 0x2c5d9c, shoe: 0xd9a23e, skin: s }),
  child: (s) => ({ bottom: 0xf1ead8, botCfg: [0.78, 1.02, 0, 1], misc: [0, 0, 0, 0], skin: s }),
};

export function makeHumanoid(o = {}) {
  if (!BASE) throw new Error('modelo humano não carregado');
  const outfit = o.outfit || 'kilt';
  const skin = o.skin ?? pick(SKINS);
  const root = new THREE.Group();
  const model = SkeletonUtils.clone(BASE);
  root.add(model);
  const cfg = (OUTFITS[outfit] || OUTFITS.kilt)(skin, o);
  const real = !!(o.realHead && HEAD);
  cfg.hideHead = real;
  const mat = outfitMaterial(cfg);
  const bones = {};
  model.traverse((n) => {
    if (n.isSkinnedMesh) { n.material = mat; n.castShadow = true; n.receiveShadow = true; n.frustumCulled = false; }
    if (n.isBone) bones[n.name] = n;
  });
  model.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(model.matrixWorld).invert();

  // prende um objeto a um osso usando coordenadas da pose T
  const attach = (boneName, obj, pos, rot = [0, 0, 0], scale = [1, 1, 1]) => {
    const bone = bones[boneName] || bones[boneName.replace(/\./g, '')]; // o carregador remove os pontos dos nomes
    const want = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
    const boneM = new THREE.Matrix4().multiplyMatrices(rootInv, bone.matrixWorld);
    const local = boneM.invert().multiply(want);
    local.decompose(obj.position, obj.quaternion, obj.scale);
    obj.traverse((c) => { if (c.isMesh) c.castShadow = true; });
    bone.add(obj);
    return obj;
  };
  const headPart = (geo, mat, off, rot, scale) => attach('DEF-head', new THREE.Mesh(geo, mat), HC.clone().add(new THREE.Vector3(...off)), rot, scale);

  // rosto realista escaneado (só no explorador)
  if (real) {
    const hm = new THREE.MeshStandardMaterial({ map: HEAD.col, normalMap: HEAD.nor, roughness: 0.58, color: o.headTint ?? 0xf2d2b8 });
    const k = o.headScale ?? 0.034;
    const g = cutBust(HEAD.geo, HEAD_CUT);
    const off = o.headOffset ?? [0, 0, 0];
    // topo da cabeça na altura do topo da cabeça do manequim
    attach('DEF-head', new THREE.Mesh(g, hm), new THREE.Vector3(off[0], 1.835 + off[1], 0.0 + off[2]), o.headRot ?? HEAD_ROT, [k, k, k]);
  }
  // rosto
  const eyeW = m(0xece6da, { roughness: 0.3 }), iris = m(0x1a120c, { roughness: 0.2 });
  const dark = m(0x15100c, { roughness: 0.9 });
  const skinM = m(skin, { roughness: 0.6 });
  if (!real) for (const s of [-1, 1]) {
    headPart(new THREE.SphereGeometry(0.014, 10, 8), eyeW, [s * 0.034, 0.022, 0.098], [0, 0, 0], [1, 0.75, 0.6]);
    headPart(new THREE.SphereGeometry(0.008, 8, 6), iris, [s * 0.034, 0.022, 0.106]);
    headPart(new THREE.BoxGeometry(0.034, 0.006, 0.012), dark, [s * 0.036, 0.042, 0.1], [0, 0, -s * 0.12]);
    if (outfit !== 'explorer') headPart(new THREE.BoxGeometry(0.03, 0.004, 0.01), dark, [s * 0.04, 0.019, 0.104], [0, 0, s * 0.1]); // kohl
    headPart(new THREE.SphereGeometry(0.022, 8, 6), skinM, [s * 0.088, 0.005, -0.005], [0, 0, 0], [0.45, 1, 0.8]); // orelhas
  }
  if (!real) headPart(new THREE.ConeGeometry(0.016, 0.045, 4), skinM, [0, -0.005, 0.112], [-1.35, Math.PI / 4, 0], [1, 1, 0.8]); // nariz
  if (!real) headPart(new THREE.SphereGeometry(0.02, 10, 6), m(0x6a3426, { roughness: 0.5 }), [0, -0.048, 0.1], [0, 0, 0], [1.2, 0.35, 0.5]); // lábios

  // cabeça: cabelo, perucas, coroas e chapéus
  const hair = o.hair || 'short';
  const black = m(0x15100c, { roughness: 0.85 });
  const cap = (mat, sc = [1, 1, 1], off = [0, 0.035, -0.022], cut = 0.5) =>
    headPart(new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, Math.PI * cut), mat, off, [0, 0, 0], [0.104 * sc[0], 0.14 * sc[1], 0.124 * sc[2]]);
  switch (hair) {
    case 'short': cap(black, [1.04, 1.02, 1.05]); break;
    case 'long':
      cap(black, [1.12, 1.08, 1.1], [0, 0.02, -0.015], 0.62);
      headPart(new THREE.BoxGeometry(0.21, 0.27, 0.09), black, [0, -0.12, -0.07]);
      for (const s of [-1, 1]) headPart(new THREE.BoxGeometry(0.05, 0.24, 0.05), black, [s * 0.095, -0.13, 0.04]);
      headPart(new THREE.TorusGeometry(0.108, 0.008, 5, 22), gold(), [0, 0.06, -0.005], [Math.PI / 2, 0, 0], [1, 1.15, 1]);
      break;
    case 'sidelock': headPart(new THREE.CylinderGeometry(0.016, 0.024, 0.2, 6), black, [0.095, -0.07, 0.0], [0, 0, 0.15]); break;
    case 'khat': {
      const cl = m(o.khat ?? 0xe8dcc0, { roughness: 0.95 });
      cap(cl, [1.12, 1.05, 1.15], [0, 0.02, -0.02], 0.62);
      headPart(new THREE.BoxGeometry(0.15, 0.16, 0.07), cl, [0, -0.12, -0.1], [0.25, 0, 0]);
    } break;
    case 'nemes': case 'khepresh': {
      if (hair === 'nemes') {
        const nm = m(0xffffff, { map: TEX.nemes, roughness: 0.55 });
        cap(nm, [1.22, 1.12, 1.15], [0, 0.03, -0.01], 0.62);
        for (const s of [-1, 1]) headPart(new THREE.BoxGeometry(0.06, 0.24, 0.035), nm, [s * 0.11, -0.15, 0.045]);
        headPart(new THREE.BoxGeometry(0.14, 0.22, 0.07), nm, [0, -0.15, -0.11]);
      } else {
        const kh = m(0x1f3f8c, { roughness: 0.35, metalness: 0.3 });
        headPart(new THREE.SphereGeometry(1, 18, 14), kh, [0, 0.08, -0.03], [0.15, 0, 0], [0.13, 0.19, 0.16]);
      }
      headPart(new THREE.CylinderGeometry(0.011, 0.018, 0.065, 6), gold(), [0, 0.12, 0.118], [0.35, 0, 0]); // ureu
      headPart(new THREE.CylinderGeometry(0.017, 0.011, 0.1, 6), m(0x2c5d9c), [0, -0.12, 0.085], [0.2, 0, 0]); // barba postiça
    } break;
    case 'fedora': {
      const felt = m(0x6b4a2e, { roughness: 0.85 });
      cap(m(0x4a2e18), [1.02, 0.9, 1.02]);
      headPart(new THREE.CylinderGeometry(0.098, 0.118, 0.12, 20), felt, [0, 0.135, -0.005], [-0.06, 0, 0], [1, 1, 1.12]);
      headPart(new THREE.CylinderGeometry(0.235, 0.24, 0.012, 26), felt, [0, 0.082, 0.0], [-0.06, 0, 0], [1, 1, 1.1]);
      headPart(new THREE.CylinderGeometry(0.12, 0.12, 0.028, 20), m(0x2a1a0e), [0, 0.1, -0.005], [-0.06, 0, 0], [1, 1, 1.12]);
      headPart(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, Math.PI * 0.68, Math.PI * 0.27), m(0x4b3424, { transparent: true, opacity: 0.3 }), [0, -0.02, 0.012], [0, 0, 0], [0.95, 1.1, 1.05]);
    } break;
    default: break; // careca
  }

  // saiotes e vestidos (peças rígidas presas ao quadril, para dar volume)
  const hipsPart = (geo, mat, pos, rot, sc) => attach('DEF-hips', new THREE.Mesh(geo, mat), new THREE.Vector3(...pos), rot, sc);
  const linenM = m(o.linen ?? 0xf1ead8, { roughness: 0.95, side: THREE.DoubleSide });
  switch (outfit) {
    case 'kilt': case 'soldier': hipsPart(new THREE.CylinderGeometry(0.168, 0.235, 0.42, 18, 1, true), linenM, [0, 0.81, 0.005]); break;
    case 'worker': case 'child': hipsPart(new THREE.CylinderGeometry(0.165, 0.215, 0.34, 16, 1, true), linenM, [0, 0.84, 0.005]); break;
    case 'longkilt': case 'priest': hipsPart(new THREE.CylinderGeometry(0.168, 0.29, 0.86, 18, 1, true), linenM, [0, 0.6, 0.0]); break;
    case 'dress': hipsPart(new THREE.CylinderGeometry(0.16, 0.3, 0.92, 20, 1, true), linenM, [0, 0.58, 0.0]); break;
    case 'pharaoh':
      hipsPart(new THREE.CylinderGeometry(0.17, 0.25, 0.5, 18, 1, true), m(0xf6f1e4, { transparent: true, opacity: 0.75, side: THREE.DoubleSide }), [0, 0.77, 0]);
      hipsPart(new THREE.BoxGeometry(0.13, 0.36, 0.015), gold(), [0, 0.82, 0.165], [-0.1, 0, 0]);
      break;
  }
  if (outfit === 'soldier') hipsPart(new THREE.BoxGeometry(0.15, 0.3, 0.015), m(0xffffff, { map: TEX.hide }), [0, 0.82, 0.24], [-0.15, 0, 0]);
  if (outfit === 'priest') attach('DEF-spine.003', new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.25), m(0xffffff, { map: TEX.leopard, roughness: 0.9 })), new THREE.Vector3(0.02, 1.22, 0.0), [0, 0, 0.35]);
  if (outfit === 'pharaoh') attach('DEF-spine.003', new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 0.06, 22), gold()), new THREE.Vector3(0, 1.46, 0.0), [0, 0, 0], [1, 1, 0.75]);

  // objetos nas mãos (o eixo +y do objeto aponta para o ombro: na pose normal fica "em pé")
  const handR = new THREE.Group();
  attach('DEF-hand.R', handR, new THREE.Vector3(-0.83, 1.42, 0.0), [0, 0, -Math.PI / 2]);
  const handL = new THREE.Group();
  attach('DEF-hand.L', handL, new THREE.Vector3(0.83, 1.42, 0.0), [0, 0, Math.PI / 2]);
  const extras = o.extras || [];
  for (const e of extras) {
    if (e === 'spear') {
      const g = new THREE.Group();
      g.add(meshAt(new THREE.CylinderGeometry(0.014, 0.014, 2.0, 6), m(0x7a5a36), 0, 0.55, 0));
      g.add(meshAt(new THREE.ConeGeometry(0.03, 0.17, 6), bronze(), 0, 1.62, 0));
      handR.add(g);
    }
    if (e === 'shield') {
      const sh = meshAt(new THREE.BoxGeometry(0.38, 0.58, 0.03), m(0xffffff, { map: TEX.hide }), 0.0, 0.05, 0.07);
      sh.add(meshAt(new THREE.CylinderGeometry(0.19, 0.19, 0.03, 14, 1, false, 0, Math.PI), sh.material, 0, 0.29, 0, [Math.PI / 2, 0, 0]));
      handL.add(sh);
    }
    if (e === 'staff') handR.add(meshAt(new THREE.CylinderGeometry(0.013, 0.017, 1.7, 6), m(0x6b4a2e), 0, 0.3, 0));
    if (e === 'crook') {
      handR.add(meshAt(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), m(0x2c5d9c), 0, 0.12, 0));
      handR.add(meshAt(new THREE.TorusGeometry(0.05, 0.014, 5, 10, Math.PI), gold(), 0.05, 0.32, 0));
      handL.add(meshAt(new THREE.CylinderGeometry(0.013, 0.013, 0.35, 6), gold(), 0, 0.1, 0));
    }
    if (e === 'scroll') handL.add(meshAt(new THREE.CylinderGeometry(0.028, 0.028, 0.2, 8), m(0xe9dcb4), 0, 0.0, 0.04, [0, 0, Math.PI / 2]));
    if (e === 'basket') {
      headPart(new THREE.CylinderGeometry(0.19, 0.14, 0.15, 12), m(0xb79c5c, { roughness: 1 }), [0, 0.2, 0]);
      for (let i = 0; i < 5; i++) headPart(new THREE.SphereGeometry(0.055, 7, 5), pick([m(0xa82030), m(0xc88a48), m(0x6d9a3a)]), [rr(-0.09, 0.09), 0.29, rr(-0.09, 0.09)]);
    }
    if (e === 'jar') {
      const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(0.03 + Math.sin(t * Math.PI) * 0.12, t * 0.32)); }
      headPart(new THREE.LatheGeometry(pts, 12), m(0xa4552f), [0, 0.13, 0]);
    }
    if (e === 'khopesh') {
      const k = new THREE.Group();
      k.add(meshAt(new THREE.CylinderGeometry(0.017, 0.017, 0.14, 6), m(0x3a2414), 0, 0.02, 0));
      const bl = meshAt(new THREE.TorusGeometry(0.18, 0.016, 4, 12, Math.PI * 0.8), bronze(), 0.16, 0.25, 0); bl.rotation.z = 0.5; bl.scale.z = 0.4; k.add(bl);
      k.add(meshAt(new THREE.BoxGeometry(0.028, 0.18, 0.012), bronze(), 0, 0.17, 0));
      handR.add(k);
    }
  }

  const h = o.height || rr(1.6, 1.8);
  root.scale.setScalar(h / 1.83);
  // camada 2: aparece na tela e nas sombras, mas fica fora do reflexo do rio e da oclusão (economia)
  root.traverse((n) => n.layers.set(2));

  // animações
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  const act = (name) => {
    if (!actions[name]) { const c = CLIPS[name]; if (!c) return null; actions[name] = mixer.clipAction(c); }
    return actions[name];
  };
  const rig = { root, model, mixer, act, cur: null, curName: '', handR, handL, holding: false, pose: o.pose || null, phase: rand() * 10, once: null, armR: { hand: handR }, bones };
  return rig;
}

// recorte do busto escaneado: mantém cabeça e pescoço, e posiciona o topo da cabeça na origem
export let HEAD_CUT = -1.2;
export let HEAD_ROT = [0, -Math.PI / 2, 0];
const cutCache = new Map();
function cutBust(src, cutY) {
  const key = cutY;
  if (cutCache.has(key)) return cutCache.get(key);
  const g0 = src.index ? src.toNonIndexed() : src.clone();
  const p = g0.attributes.position;
  const keep = [];
  for (let i = 0; i < p.count; i += 3) if (p.getY(i) > cutY && p.getY(i + 1) > cutY && p.getY(i + 2) > cutY) keep.push(i);
  const out = new THREE.BufferGeometry();
  for (const name of Object.keys(g0.attributes)) {
    const a = g0.attributes[name], n = a.itemSize;
    const arr = new Float32Array(keep.length * 3 * n);
    keep.forEach((i, k) => { for (let j = 0; j < 3; j++) for (let c = 0; c < n; c++) arr[(k * 3 + j) * n + c] = a.array[(i + j) * n + c]; });
    out.setAttribute(name, new THREE.BufferAttribute(arr, n));
  }
  out.computeBoundingBox();
  const bb = out.boundingBox, c = bb.getCenter(new THREE.Vector3());
  out.translate(-c.x, -bb.max.y, -c.z);
  cutCache.set(key, out);
  return out;
}

function meshAt(geo, mat, x, y, z, rot) {
  const me = new THREE.Mesh(geo, mat); me.position.set(x, y, z); if (rot) me.rotation.set(...rot); me.castShadow = true; return me;
}


// ---------------------------------------------------------------------------
// Animação: mistura por pesos (sem trocas bruscas)
// Locomoção = "árvore de mistura" 1D: parado → andar → trotar → correr, com os
// ciclos de passo sincronizados (o pé nunca "pula" na transição).
// ---------------------------------------------------------------------------
const LOCO = [
  { name: 'Idle_Loop', speed: 0 },
  { name: 'Walk_Loop', speed: 1.35 },
  { name: 'Jog_Fwd_Loop', speed: 3.6 },
  { name: 'Sprint_Loop', speed: 6.5 },
];
const LOCO_MODES = new Set(['idle', 'walk', 'run', 'wade']);
const MODE_CLIP = {
  air: 'Jump_Loop', swim: 'Swim_Fwd_Loop', swimIdle: 'Swim_Idle_Loop', talk: 'Idle_Talking_Loop', work: 'Fixing_Kneeling',
  sit: 'Sitting_Idle_Loop', guard: 'Sword_Idle', torch: 'Idle_Torch_Loop', dance: 'Dance_Loop', push: 'Push_Loop',
};

function locoTargets(speed) {
  const s = Math.abs(speed);
  const T = {};
  for (let i = 0; i < LOCO.length - 1; i++) {
    const a = LOCO[i], b = LOCO[i + 1];
    if (s < b.speed || i === LOCO.length - 2) {
      const f = Math.min(1, Math.max(0, (s - a.speed) / (b.speed - a.speed)));
      T[a.name] = 1 - f; T[b.name] = f;
      break;
    }
  }
  return T;
}

// ação única (pegar objeto, golpe, aterrissagem...) e depois volta ao normal
export function playOnce(r, name, duration) {
  const a = r.act(name); if (!a) return;
  a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = 1; a.enabled = true; a.play();
  r.once = { name, t: duration ?? a.getClip().duration * 0.9 };
}

export function animateHumanoid(r, dt, speed, mode, t) {
  r.w = r.w || {};
  let T;
  let fade = 7;
  if (r.once) {
    r.once.t -= dt;
    if (r.once.t <= 0) r.once = null;
  }
  if (r.once) { T = { [r.once.name]: 1 }; fade = 12; }
  else if (LOCO_MODES.has(mode)) T = locoTargets(mode === 'idle' ? 0 : speed);
  else {
    let m = mode;
    if (mode === 'swim' && Math.abs(speed) < 0.3) m = 'swimIdle';
    T = { [MODE_CLIP[m] || 'Idle_Loop']: 1 };
    fade = mode === 'air' ? 10 : 6;
  }

  // aproxima os pesos atuais dos pesos-alvo
  const names = new Set([...Object.keys(r.w), ...Object.keys(T)]);
  let sum = 0;
  for (const n of names) {
    const cur = r.w[n] || 0, tgt = T[n] || 0;
    const step = dt * fade;
    const v = tgt > cur ? Math.min(tgt, cur + step) : Math.max(tgt, cur - step);
    if (v <= 0.0001 && tgt === 0) {
      delete r.w[n];
      const a = r.act(n); if (a) { a.stop(); a.enabled = false; }
    } else { r.w[n] = v; sum += v; }
  }
  // fase compartilhada dos ciclos de passo
  const moving = LOCO.slice(1).filter((l) => r.w[l.name]);
  if (moving.length) {
    let stride = 0, wsum = 0;
    for (const l of moving) { const d = r.act(l.name).getClip().duration; stride += r.w[l.name] * l.speed * d; wsum += r.w[l.name]; }
    stride /= wsum || 1;
    r.locoPhase = ((r.locoPhase ?? Math.random()) + (dt * speed) / Math.max(0.3, stride) + 10) % 1;
  }
  for (const n in r.w) {
    const a = r.act(n); if (!a) continue;
    if (!a.isScheduled() && !(r.once && r.once.name === n)) { a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.play(); }
    a.enabled = true;
    a.setEffectiveWeight(r.w[n] / (sum || 1));
    const loco = LOCO.find((l) => l.name === n && l.speed > 0);
    if (loco && !(r.once && r.once.name === n)) { a.timeScale = 0; a.time = r.locoPhase * a.getClip().duration; }
    else if (!(r.once && r.once.name === n)) a.timeScale = n === 'Swim_Fwd_Loop' ? Math.max(0.7, Math.min(2.3, Math.abs(speed) / 2.0)) : 1;
  }
  r.mixer.update(dt);
}

// ---------------------------------------------------------------------------
// Estátua: o mesmo corpo, congelado numa pose, em granito escuro com ouro (ou pintado)
// ---------------------------------------------------------------------------
export function makeStatue({ h = 8, painted = false, stoneMap = null, stoneNormal = null } = {}) {
  const rig = makeHumanoid({ outfit: 'pharaoh', hair: 'nemes', extras: ['crook'], height: h, skin: 0x9c6644, collar: 'royal' });
  const stone = new THREE.MeshStandardMaterial({ color: painted ? 0xe8d8bc : 0x3b3632, roughness: painted ? 0.85 : 0.42, metalness: 0, map: stoneMap, normalMap: stoneNormal });
  const g = gold();
  rig.root.traverse((n) => {
    if (!n.isMesh) return;
    n.layers.set(2);
    if (n.material === g) return;
    if (painted && !n.isSkinnedMesh) return; // estátua pintada mantém as cores do nemes e do saiote
    n.material = stone;
  });
  // pose fixa: de pé, braços junto ao corpo
  const a = rig.act('Idle_Loop'); a.play(); rig.mixer.update(0.2);
  rig.root.updateMatrixWorld(true);
  rig.statue = true;
  return rig.root;
}
