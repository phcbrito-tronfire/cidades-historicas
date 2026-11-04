// As roupas do explorador: o traje de sempre (jaqueta de couro, chapéu, bolsa a tiracolo, coldre e chicote), duas
// variações de campo e de deserto, e as três roupas conquistadas ao terminar uma cidade (nobre egípcio, hoplita
// grego, legionário romano). Tudo o que encosta no corpo é moldado sobre ele (vestir.js) e se dobra com ele.
import * as THREE from 'three';
import { makeFitter, leatherTex, clothTex, metalTex } from './vestir.js';

export const LOOKS = {
  explorer: { name: 'Explorador', desc: 'Jaqueta de couro, chapéu de feltro, bolsa de lona a tiracolo, coldre e chicote.', base: 'explorador', hair: 'fedora' },
  campo: { name: 'Explorador de campo', desc: 'Camisa henley azul-petróleo, calça cáqui, coldre de ombro e relógio de pulso.', base: 'brian' },
  deserto: { name: 'Explorador do deserto', desc: 'Camisa henley creme, coldre de ombro, munhequeira de couro e calça de lona.', base: 'brian' },
  egito: { name: 'Nobre egípcio', desc: 'Peruca de tranças, túnica de linho fino, saiote plissado com faixa, colar largo de contas, braceletes e sandálias de papiro.', base: 'bryce', sandals: true, unlock: 'egito' },
  grecia: { name: 'Hoplita ateniense', desc: 'Elmo coríntio de bronze, couraça com os músculos batidos no metal, saiote de tiras de couro, quíton vermelho, grevas e o escudo redondo.', base: 'bryce', sandals: true, unlock: 'atenas', extras: ['helmet', 'aspis'] },
  roma: { name: 'Legionário romano', desc: 'Gálea de ferro, couraça de placas (lorica segmentata), lenço de lã, túnica vermelha, cinturão com avental de tiras, gládio na bainha e cáligas.', base: 'bryce', sandals: true, unlock: 'roma' },
};
export const LOOK_ORDER = ['explorer', 'campo', 'deserto', 'egito', 'grecia', 'roma'];

// ---- tingir a textura original do modelo mantendo o relevo: cor nova × (brilho do texel ÷ brilho médio da peça)
const lumCache = new WeakMap();
function texPixels(tex) {
  if (lumCache.has(tex)) return lumCache.get(tex);
  const img = tex.image, S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, S, S); const d = x.getImageData(0, 0, S, S).data;
  const out = { S, d }; lumCache.set(tex, out); return out;
}
const lin = (c) => Math.pow(c / 255, 2.2);
function meanLum(mesh) {
  const tex = mesh.material.map, uv = mesh.geometry.attributes.uv; if (!tex || !uv || !tex.image) return 0.3;
  const { S, d } = texPixels(tex); let s = 0, n = 0;
  for (let i = 0; i < uv.count; i += 3) {
    const u = uv.getX(i) - Math.floor(uv.getX(i)), v = uv.getY(i) - Math.floor(uv.getY(i));
    const px = Math.min(S - 1, Math.floor(u * S)), py = Math.min(S - 1, Math.floor((tex.flipY ? 1 - v : v) * S)), k = (py * S + px) * 4;
    s += 0.2126 * lin(d[k]) + 0.7152 * lin(d[k + 1]) + 0.0722 * lin(d[k + 2]); n++;
  }
  return n ? Math.max(0.01, s / n) : 0.3;
}
export function retint(mesh, color, { rough = 0.8, metal = 0, detail = 0.9, grain = null, grainScale = 6, sheen = 0, lo = 0.3, hi = 2.0 } = {}) {
  const src = mesh.material, mat = src.clone();
  mat.color.set(color); mat.roughness = rough; mat.metalness = metal; mat.side = THREE.FrontSide; mat.transparent = false; mat.opacity = 1;
  if (mat.metalnessMap && metal === 0) mat.metalnessMap = null; // o "metal" da textura do Mixamo embranquecia a roupa sob as tochas
  const uMean = { value: meanLum(mesh) }, uDetail = { value: detail }, uGrain = { value: grain }, uGS = { value: grainScale };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uMean, uDetail, uGrain, uGS });
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uMean, uDetail, uGS;${grain ? '\nuniform sampler2D uGrain;' : ''}`)
      .replace('#include <map_fragment>', `#ifdef USE_MAP
  vec4 texel0 = texture2D( map, vMapUv );
  float lum0 = dot( texel0.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
  diffuseColor.rgb *= mix( 1.0, clamp( lum0 / uMean, ${lo.toFixed(2)}, ${hi.toFixed(2)} ), uDetail );${grain ? `
  vec3 gr = texture2D( uGrain, vMapUv * uGS ).rgb; diffuseColor.rgb *= gr / max( 0.05, dot( gr, vec3( 0.333 ) ) ) * 0.5 + 0.5;` : ''}
#endif`);
    if (sheen) sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = clamp( roughnessFactor - ${sheen.toFixed(2)} * smoothstep( 0.6, 1.3, lum0 / uMean ), 0.15, 1.0 );`);
  };
  mat.customProgramCacheKey = () => 'retint' + (grain ? 'g' : '') + (sheen ? 's' : '') + lo + hi;
  mesh.material = mat;
  return mat;
}

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });
// muda a base de um grupo rígido (construído em x = lado, y = cima, z = para fora do corpo) para o ponto da superfície
function placeOn(geo, at, up = new THREE.Vector3(0, 1, 0), roll = 0) {
  // nas peças penduradas (bolsa, coldre) a frente fica na horizontal; com outro "cima" (relógio) vale a normal inteira
  const n = up.y > 0.99 ? at.n.clone().setY(0).normalize() : at.n.clone().addScaledVector(up, -at.n.dot(up)).normalize(), side = new THREE.Vector3().crossVectors(up, n).normalize(), u = new THREE.Vector3().crossVectors(n, side).normalize();
  const m = new THREE.Matrix4().makeBasis(side, u, n);
  if (roll) m.multiply(new THREE.Matrix4().makeRotationZ(roll));
  m.setPosition(at.p); geo.applyMatrix4(m); return geo;
}
const merge = (parts) => { const out = []; for (const [g, mx] of parts) { const q = (g.index ? g.toNonIndexed() : g.clone()); q.applyMatrix4(mx); for (const k of Object.keys(q.attributes)) if (!['position', 'normal', 'uv'].includes(k)) q.deleteAttribute(k); out.push(q); } return out; };
const T = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const one = (parts) => mergeGeometries(merge(parts));
// caixa de cantos arredondados (bolsa, coldre)
function roundBox(w, h, d, r = 0.012, seg = 3) {
  const sh = new THREE.Shape(), x = w / 2 - r, y = h / 2 - r;
  sh.moveTo(-x, -h / 2); sh.lineTo(x, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -y); sh.lineTo(w / 2, y); sh.quadraticCurveTo(w / 2, h / 2, x, h / 2);
  sh.lineTo(-x, h / 2); sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, y); sh.lineTo(-w / 2, -y); sh.quadraticCurveTo(-w / 2, -h / 2, -x, -h / 2);
  const g = new THREE.ExtrudeGeometry(sh, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.6, bevelSegments: seg, curveSegments: seg });
  g.translate(0, 0, -(d - 2 * r) / 2); g.computeBoundingBox();
  // UV pela frente (a textura de lona/couro não estica nas bordas)
  const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) * 4, p.getY(i) * 4);
  return g;
}

// ---------------------------------------------------------------------------
// Transplante da cabeça: o corpo do explorador (Josh) não tem tronco nem braços por baixo do paletó; as outras roupas
// usam um corpo inteiro (Brian, Bryce) com a cabeça, o cabelo e os cílios dele, presos ao esqueleto novo.
// Os vértices do rosto guardam as "boneInverses" do Josh: no osso da cabeça do corpo novo, o rosto fica igualzinho.
const HEADW = (w) => (w.Head || 0) + (w.Neck || 0) + (w.HeadTop_End || 0) + (w.LeftEye || 0) + (w.RightEye || 0);
function weightsOf(me) {
  const g = me.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, names = me.skeleton.bones.map((b) => b.name.replace(/^mixamorig\d*:?/, ''));
  const out = []; for (let i = 0; i < si.count; i++) { const w = {}; for (let k = 0; k < 4; k++) { const x = sw.getComponent(i, k); if (x > 0) w[names[si.getComponent(i, k)]] = (w[names[si.getComponent(i, k)]] || 0) + x; } out.push(w); }
  return out;
}
function keepTris(geo, keep) {
  const idx = geo.index ? geo.index.array : [...Array(geo.attributes.position.count).keys()], out = [];
  for (let t = 0; t < idx.length; t += 3) if (keep(idx[t], idx[t + 1], idx[t + 2])) out.push(idx[t], idx[t + 1], idx[t + 2]);
  const g = geo.clone(); g.setIndex(out); return g;
}
// cor média de um pedaço da textura (vértices escolhidos), em linear
function meanColor(me, pick) {
  const tex = me.material.map, uv = me.geometry.attributes.uv; if (!tex || !uv) return null;
  const { S, d } = texPixels(tex), c = [0, 0, 0]; let n = 0;
  for (let i = 0; i < uv.count; i++) { if (!pick(i)) continue; const u = uv.getX(i) - Math.floor(uv.getX(i)), v = uv.getY(i) - Math.floor(uv.getY(i)), k = (Math.min(S - 1, Math.floor((tex.flipY ? 1 - v : v) * S)) * S + Math.min(S - 1, Math.floor(u * S))) * 4; c[0] += lin(d[k]); c[1] += lin(d[k + 1]); c[2] += lin(d[k + 2]); n++; }
  return n ? c.map((x) => x / n) : null;
}
export function graftHead(model, meshes, bones, donorRoot) {
  donorRoot.updateMatrixWorld(true);
  const donor = []; donorRoot.traverse((n) => { if (n.isSkinnedMesh && /Body|Hair|Eyelash/.test(n.name)) donor.push(n); });
  const tBody = meshes.find((me) => /Body/.test(me.name)), dBody = donor.find((me) => /Body/.test(me.name));
  // o corpo novo perde a cabeça e o pescoço; o cabelo e os cílios dele somem
  for (const me of meshes) if (/Hair|Eyelash/.test(me.name)) me.visible = false;
  if (tBody) { const W = weightsOf(tBody); tBody.geometry = keepTris(tBody.geometry, (a, b, c) => Math.max(HEADW(W[a]), HEADW(W[b]), HEADW(W[c])) < 0.5); }
  // a pele do corpo novo na cor do rosto do explorador
  if (tBody && dBody) {
    const WD = weightsOf(dBody), WT = weightsOf(tBody);
    const face = meanColor(dBody, (i) => (WD[i].Head || 0) > 0.9), arm = meanColor(tBody, (i) => (WT[i].LeftForeArm || 0) + (WT[i].RightForeArm || 0) > 0.8);
    const c = tBody.material.clone(); c.metalness = 0; c.metalnessMap = null; c.roughness = 0.66;
    if (face && arm) c.color.setRGB(...face.map((x, k) => Math.min(1.6, Math.max(0.6, x / Math.max(0.01, arm[k])))));
    tBody.material = c;
  }
  for (const d of donor) {
    const W = weightsOf(d);
    const geo = /Body/.test(d.name) ? keepTris(d.geometry, (a, b, c) => Math.max(HEADW(W[a]), HEADW(W[b]), HEADW(W[c])) >= 0.12) : d.geometry; // (o pescoço dele desce até por dentro da gola)
    const mat = d.material.clone();
    if (/Body/.test(d.name)) { mat.metalness = 0; mat.metalnessMap = null; mat.roughness = 0.66; }
    if (/Hair/.test(d.name)) { mat.metalness = 0; mat.roughness = 0.75; mat.color.set(0x8a6a52); mat.opacity = 1; mat.transparent = false; mat.alphaTest = 0.45; mat.side = THREE.DoubleSide; }
    const bs = d.skeleton.bones.map((b) => bones[b.name.replace(/^mixamorig\d*:?/, '')] || bones.Head);
    const sm = new THREE.SkinnedMesh(geo, mat); sm.name = 'Graft_' + d.name.replace(/^Ch\d+_+/, ''); sm.castShadow = true; sm.receiveShadow = true;
    (tBody?.parent || model).add(sm); sm.bind(new THREE.Skeleton(bs, d.skeleton.boneInverses.map((m) => m.clone())), d.bindMatrix.clone());
    meshes.push(sm);
  }
}

// ctx vem de makeHumanoid: { meshes, rootInv, bones, bonePos, hips, chest, neckY, part }
// o explorador é moreno (pardo): o tom vai por cima da textura de pele do Mixamo, que é clara, no rosto e no corpo
export const SKIN = 0xd6a27a;
export function dress(ctx, lookId) {
  const out = lookId === 'explorer' ? dressExplorer(ctx) : lookId === 'campo' || lookId === 'deserto' ? dressDrake(ctx, lookId === 'deserto') : lookId === 'egito' || lookId === 'grecia' || lookId === 'roma' ? dressAncient(ctx, lookId) : [];
  const tone = new THREE.Color(SKIN), done = new Set();
  for (const me of ctx.meshes) { if (!/Body/.test(me.name) || done.has(me.material)) continue; const c = me.material.clone(); c.color.multiply(tone); me.material = c; done.add(c); }
  return out;
}

// ---------------------------------------------------------------------------
// ferramentas comuns: molde com as malhas do corpo, referência = a que tem mais ossos
function fitterFor(ctx, re) {
  const ms = ctx.meshes.filter((me) => me.visible !== false && re.test(me.name));
  const ref = ms.reduce((a, b) => (b.skeleton.bones.length > a.skeleton.bones.length ? b : a), ms[0]);
  return makeFitter({ meshes: ms, rootInv: ctx.rootInv, ref });
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
// anel em volta de um eixo (pulso, coxa): centro c, eixo ax, raio de partida r
const ring = (c, ax, r = 0.12, n = 10) => { const a = ax.clone().normalize(), u = Math.abs(a.y) > 0.9 ? V3(1, 0, 0) : V3(0, 1, 0), p = new THREE.Vector3().crossVectors(a, u).normalize(), q = new THREE.Vector3().crossVectors(a, p); return [...Array(n).keys()].map((i) => { const t = (i / n) * Math.PI * 2; return { p: c.clone().addScaledVector(p, Math.cos(t) * r).addScaledVector(q, Math.sin(t) * r), c: c.clone() }; }); };
// volta na cintura (cinto): uma volta horizontal a 0,5 m do eixo
const waist = (y, cx = 0, cz = 0, drop = 0) => [...Array(12).keys()].map((i) => { const a = (i / 12) * Math.PI * 2, yy = y - drop * Math.max(0, -Math.sin(a)); return { p: V3(cx + Math.sin(a) * 0.5, yy, cz + Math.cos(a) * 0.5), c: V3(cx, yy, cz) }; });
function buckle(fit, mat, at, w = 0.05, h = 0.04) {
  const fr = new THREE.Shape(); fr.moveTo(-w / 2, -h / 2); fr.lineTo(w / 2, -h / 2); fr.lineTo(w / 2, h / 2); fr.lineTo(-w / 2, h / 2); fr.lineTo(-w / 2, -h / 2);
  const hole = new THREE.Path(); hole.moveTo(-w / 2 + 0.007, -h / 2 + 0.007); hole.lineTo(-w / 2 + 0.007, h / 2 - 0.007); hole.lineTo(w / 2 - 0.007, h / 2 - 0.007); hole.lineTo(w / 2 - 0.007, -h / 2 + 0.007); fr.holes.push(hole);
  fit.solid(mat, placeOn(new THREE.ExtrudeGeometry(fr, { depth: 0.004, bevelEnabled: false }).translate(0, 0, 0.006), at), at);
}

// camisa para dentro da calça: corta a barra abaixo de yCut e aperta o tecido em volta do eixo do quadril logo acima
// (as malhas vêm quantizadas: a posição "crua" é levada à pose T, mexida e trazida de volta pela mesma transformação)
function tuck(me, rootInv, yCut, yBlend, k, cx, cz) {
  const g = me.geometry.clone(), pa = g.attributes.position, sk = me.skeleton, si = g.attributes.skinIndex;
  const toModel = new THREE.Matrix4().multiplyMatrices(rootInv, me.matrixWorld), v = new THREE.Vector3(), yv = [];
  const bi = si.getComponent(0, 0), A = new THREE.Matrix4().multiplyMatrices(rootInv, sk.bones[bi].matrixWorld).multiply(sk.boneInverses[bi]).multiply(me.bindMatrix), Ai = A.clone().invert();
  for (let i = 0; i < pa.count; i++) {
    v.fromBufferAttribute(pa, i); me.applyBoneTransform(i, v); v.applyMatrix4(toModel); yv.push(v.y);
    if (v.y > yCut + yBlend) continue;
    const t = 1 - Math.min(1, Math.max(0, (v.y - yCut) / yBlend)), s = 1 - (1 - k) * t * t * (3 - 2 * t);
    v.x = cx + (v.x - cx) * s; v.z = cz + (v.z - cz) * s; v.applyMatrix4(Ai); pa.setXYZ(i, v.x, v.y, v.z);
  }
  void yv; g.computeVertexNormals(); me.geometry = g; // (a barra não é cortada: a borda serrilhada aparecia como rasgos; apertada, ela some dentro da calça)
}

// Nathan Drake (Uncharted 4 e 3): henley, cinto, coldre de ombro (vazio de arma à mostra), relógio; no deserto, lenço
function dressDrake(ctx, desert) {
  const { meshes, bonePos, hips } = ctx;
  const byPart = (re) => meshes.find((me) => re.test(me.name) && !/Graft/.test(me.name));
  const shirt = byPart(/Shirt/), pants = byPart(/Pants/), shoes = byPart(/Sneakers|Shoes/);
  if (shirt) retint(shirt, desert ? 0xcdbf9e : 0x2c5560, { rough: 0.95, detail: 0.55, lo: 0.82, hi: 1.2, grain: clothTex('#8a8a8a', { weave: 0.12 }), grainScale: 9 });
  if (pants) retint(pants, desert ? 0x6e6248 : 0x9a7650, { rough: 0.92, detail: 0.9, grain: clothTex('#8a8a8a', { weave: 0.1 }), grainScale: 8 });
  if (shoes) retint(shoes, 0x3a2a1e, { rough: 0.6, detail: 0.6, lo: 0.6, hi: 1.05 }); // (sem o limite, o forro branco do tênis brilhava como meia)
  // o alto do braço e o ombro do corpo têm uma faixa escura na textura, que aparecia abaixo da manga curta: ficam no tom do antebraço
  { const body = meshes.find((me) => /_Body$/.test(me.name) && !/Graft/.test(me.name));
    if (body) { const W = weightsOf(body); let best = -1, bw = 0; for (let i = 0; i < W.length; i++) { const w = W[i].LeftForeArm || 0; if (w > bw) { bw = w; best = i; } }
      if (best >= 0) { const g = body.geometry.clone(), u = g.attributes.uv, u0 = u.getX(best), v0 = u.getY(best);
        for (let i = 0; i < W.length; i++) if ((W[i].LeftArm || 0) + (W[i].RightArm || 0) + (W[i].Spine2 || 0) > 0.3) u.setXY(i, u0, v0);
        u.needsUpdate = true; body.geometry = g; } } }
  const by = hips.y; // cinto: logo abaixo do cós da calça, com a camisa para dentro
  if (shirt) tuck(shirt, ctx.rootInv, by + 0.01, 0.1, 0.84, hips.x, hips.z);
  const fit = fitterFor(ctx, /Shirt|Pants|Body/), fitP = fitterFor(ctx, /Pants/);
  const leather = M(0xffffff, { map: leatherTex(desert ? '#5a3820' : '#4a2c18'), roughness: 0.6 });
  const dark = M(0xffffff, { map: leatherTex('#2a1a10'), roughness: 0.55 });
  const steel = M(0x9a9a98, { metalness: 0.9, roughness: 0.35 }), brass = M(0xb89048, { metalness: 0.9, roughness: 0.35 });
  const neck = bonePos('Neck'), ch = bonePos('Spine2'), hy = hips.y, LA = bonePos('LeftArm'), RA = bonePos('RightArm');
  // cinto de couro na cintura da calça, com fivela
  fitP.band(dark, waist(by), { w: 0.038, th: 0.006, off: 0.004, n: 72, closed: true });
  const bk = fitP.anchor(V3(0, by, 0.5), V3(0, by, 0)); if (bk) buckle(fitP, desert ? brass : steel, bk);
  // botões da henley
  for (let i = 0; i < 3; i++) { const at = fit.anchor(V3(0, neck.y - 0.075 - i * 0.04, 0.5), V3(0, neck.y - 0.075 - i * 0.04, 0)); if (at) fit.solid(M(0x2a2420, { roughness: 0.5 }), placeOn(new THREE.CylinderGeometry(0.0065, 0.0065, 0.004, 10).rotateX(Math.PI / 2).translate(0, 0, 0.003), at), at); }
  // o coldre de ombro: uma alça em volta de cada ombro, unidas por uma argola nas costas
  const back = V3(0, ch.y + 0.02, -0.5), ringAt = fit.anchor(back, V3(0, ch.y + 0.02, 0));
  for (const s of [1, -1]) {
    const sx = (neck.x + (s > 0 ? LA.x : RA.x)) / 2 + s * 0.015;
    fit.band(leather, [
      { p: V3(s * 0.02, ch.y + 0.02, -0.5), c: V3(s * 0.02, ch.y + 0.02, 0) },
      { p: V3(s * 0.11, ch.y + 0.1, -0.5), c: V3(s * 0.08, ch.y + 0.1, 0) },
      { p: V3(sx, neck.y + 0.3, -0.03), c: V3(sx, neck.y - 0.12, -0.02) },
      { p: V3(s * 0.15, ch.y + 0.06, 0.5), c: V3(s * 0.1, ch.y + 0.06, 0) },
      { p: V3(s * 0.2, ch.y - 0.1, 0.42), c: V3(s * 0.1, ch.y - 0.1, 0) },
      { p: V3(s * 0.17, ch.y - 0.14, 0.0), c: V3(0, ch.y - 0.14, 0) }, // (de dentro do vão do braço: de fora, o raio batia no braço e a alça o enlaçava)
      { p: V3(s * 0.2, ch.y - 0.12, -0.42), c: V3(s * 0.08, ch.y - 0.12, 0) },
      { p: V3(s * 0.03, ch.y - 0.02, -0.5), c: V3(s * 0.03, ch.y - 0.02, 0) },
    ], { w: 0.034, th: 0.005, off: 0.004, n: 60 });
    // debaixo do braço: o coldre (esquerdo) e o porta-carregadores (direito)
    const at = fit.anchor(V3(s * 0.17, ch.y - 0.16, 0.02), V3(0, ch.y - 0.16, 0.02)); // no flanco, não no braço
    if (at) {
      if (s > 0) { fit.solid(leather, placeOn(one([[roundBox(0.11, 0.16, 0.045, 0.014), T(0, 0, 0.024)]]), at, undefined, 0.5), at); fit.solid(M(0x2a2a2c, { metalness: 0.7, roughness: 0.45 }), placeOn(one([[roundBox(0.03, 0.07, 0.028, 0.008), T(0.05, 0.07, 0.024, 0, 0, -1.0)]]), at, undefined, 0.5), at); }
      else fit.solid(leather, placeOn(one([[roundBox(0.06, 0.1, 0.05, 0.012), T(-0.018, 0, 0.026)], [roundBox(0.06, 0.1, 0.05, 0.012), T(0.045, 0, 0.026)]]), at, undefined, -0.3), at);
    }
  }
  if (ringAt) fit.solid(steel, placeOn(new THREE.TorusGeometry(0.018, 0.004, 6, 14).translate(0, 0, 0.008), ringAt), ringAt);
  // relógio no pulso esquerdo; no deserto, munhequeira de couro no direito
  const wrist = (side) => { const a = bonePos(side + 'ForeArm'), b = bonePos(side + 'Hand'); return { c: a.clone().lerp(b, 0.88), ax: b.clone().sub(a) }; };
  { const w = wrist('Left'); fit.band(dark, ring(w.c, w.ax, 0.09), { w: 0.02, th: 0.004, off: 0.002, n: 32, closed: true });
    const at = fit.anchor(w.c.clone().add(V3(0, 0.12, 0)), w.c); if (at) { fit.solid(steel, placeOn(new THREE.CylinderGeometry(0.017, 0.017, 0.008, 18).rotateX(Math.PI / 2).translate(0, 0, 0.006), at, w.ax.clone().normalize()), at); fit.solid(M(0x1a1c20, { roughness: 0.2, metalness: 0.3 }), placeOn(new THREE.CircleGeometry(0.0145, 18).translate(0, 0, 0.0105), at, w.ax.clone().normalize()), at); } }
  if (desert) { const w = wrist('Right'); fit.band(leather, ring(w.c.clone().lerp(bonePos('RightForeArm'), 0.05), w.ax, 0.09), { w: 0.05, th: 0.005, off: 0.003, n: 32, closed: true }); }
  return [...fit.finish(), ...fitP.finish()];
}

function dressExplorer(ctx) {
  const { meshes, rootInv, bonePos, hips } = ctx;
  const byPart = (re) => meshes.find((me) => re.test(me.name));
  // a roupa do próprio modelo, tingida por cima da textura (as dobras, costuras e bolsos continuam lá)
  const suit = byPart(/Suit/), pants = byPart(/Pants/), shirt = byPart(/Shirt/), belt = byPart(/Belt/), shoes = byPart(/Shoes/), body = byPart(/Body/);
  if (suit) retint(suit, 0x47291a, { rough: 0.74, detail: 0.7, grain: leatherTex('#7a7a7a', false), grainScale: 5, sheen: 0.14 }); // jaqueta de couro marrom-escuro
  if (shirt) retint(shirt, 0xcbb68a, { rough: 0.92, detail: 0.8 }); // camisa cáqui clara
  if (pants) retint(pants, 0x7c6f58, { rough: 0.92, detail: 0.85, grain: clothTex('#8a8a8a', { weave: 0.08 }), grainScale: 8 }); // calça de sarja cáqui-acinzentada
  if (belt) retint(belt, 0x3a2414, { rough: 0.6, detail: 0.7 });
  if (shoes) retint(shoes, 0x40291a, { rough: 0.55, detail: 0.85, sheen: 0.2 }); // botas de couro
  if (body) { const c = body.material.clone(); c.metalness = 0; c.metalnessMap = null; c.roughness = 0.7; body.material = c; }
  for (const h of meshes.filter((me) => /Hair/.test(me.name))) { const c = h.material.clone(); c.metalness = 0; c.roughness = 0.75; c.color.set(0x8a6a52); c.opacity = 1; c.transparent = false; c.alphaTest = 0.45; c.side = THREE.DoubleSide; h.material = c; } // (no arquivo os fios vinham com opacidade zero: só aparecia o couro cabeludo preto) // cabelo castanho, sem o brilho de plástico

  // molde: jaqueta + calça (o cinto e a fivela ficam por cima)
  const ref = suit || meshes[0];
  const fit = makeFitter({ meshes: [suit, pants].filter(Boolean), rootInv, ref });
  const L = bonePos('LeftArm'), R = bonePos('RightArm'), neck = bonePos('Neck'), ch = bonePos('Spine2'), hy = hips.y;
  const leather = M(0xffffff, { map: leatherTex('#4a2c18'), roughness: 0.6 });
  const darkLeather = M(0xffffff, { map: leatherTex('#2e1c10'), roughness: 0.55 });
  const canvas = M(0xffffff, { map: clothTex('#8f8462', { weave: 0.1 }), roughness: 0.95 });
  const brass = M(0xc8a050, { metalness: 0.9, roughness: 0.35 });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // a alça da bolsa: do quadril esquerdo, pela frente, sobe ao ombro direito e desce pelas costas
  const sx = (neck.x + R.x) / 2;
  fit.band(canvas, [
    { p: V(0.32, hy + 0.0, 0.2), c: V(0.08, hy, 0) },
    { p: V(0.12, ch.y - 0.12, 0.45), c: V(0.03, ch.y - 0.12, 0) },
    { p: V(-0.06, ch.y + 0.1, 0.45), c: V(-0.06, ch.y + 0.1, 0) },
    { p: V(sx, neck.y + 0.3, 0.02), c: V(sx, neck.y - 0.12, 0.0) },
    { p: V(-0.06, ch.y + 0.1, -0.45), c: V(-0.06, ch.y + 0.1, 0) },
    { p: V(0.12, ch.y - 0.12, -0.45), c: V(0.03, ch.y - 0.12, 0) },
    { p: V(0.32, hy + 0.0, -0.2), c: V(0.08, hy, 0) },
  ], { w: 0.042, th: 0.004, off: 0.003, n: 70 });
  // cinturão do coldre, mais baixo do lado direito
  const belt2 = []; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, y = hy - 0.035 - 0.025 * Math.max(0, -Math.sin(a)); belt2.push({ p: V(Math.sin(a) * 0.5, y, Math.cos(a) * 0.5), c: V(0, y, 0.0) }); }
  fit.band(darkLeather, belt2, { w: 0.04, th: 0.006, off: 0.006, n: 72, closed: true });
  // bolsa de lona no quadril esquerdo, sobre as pontas da alça
  const bagAt = fit.anchor(V(0.5, hy - 0.06, 0.0), V(0, hy - 0.06, 0.0));
  if (bagAt) {
    const g = one([[roundBox(0.25, 0.21, 0.07, 0.014), T(0, 0, 0.035)], [roundBox(0.255, 0.1, 0.075, 0.01), T(0, 0.06, 0.04)]]);
    const HIP = { w: { Hips: 1 } };
    fit.solid(canvas, placeOn(g, bagAt), bagAt, HIP);
    const st = one([[new THREE.BoxGeometry(0.022, 0.13, 0.004), T(-0.06, 0.035, 0.08)], [new THREE.BoxGeometry(0.022, 0.13, 0.004), T(0.06, 0.035, 0.08)]]);
    fit.solid(leather, placeOn(st, bagAt), bagAt, HIP);
    const bk = one([[new THREE.TorusGeometry(0.011, 0.003, 4, 10), T(-0.06, -0.025, 0.083)], [new THREE.TorusGeometry(0.011, 0.003, 4, 10), T(0.06, -0.025, 0.083)]]);
    fit.solid(brass, placeOn(bk, bagAt), bagAt, HIP);
  }
  // coldre no quadril direito, pendurado no cinturão (aba fechada, a coronha de madeira aparecendo)
  const hol = fit.anchor(V(-0.5, hy - 0.12, 0.04), V(0, hy - 0.12, 0.04));
  if (hol) {
    // bolsa do coldre: mais larga em cima, ponta arredondada embaixo, achatada contra a coxa
    const sh = new THREE.Shape(); sh.moveTo(-0.042, 0.1); sh.lineTo(0.042, 0.1); sh.lineTo(0.03, -0.07); sh.quadraticCurveTo(0.026, -0.105, 0, -0.105); sh.quadraticCurveTo(-0.026, -0.105, -0.03, -0.07); sh.lineTo(-0.042, 0.1);
    const pouch = new THREE.ExtrudeGeometry(sh, { depth: 0.026, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 3, curveSegments: 6 });
    { const p = pouch.attributes.position, uv = pouch.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 5 + 0.5, p.getY(i) * 5); }
    fit.solid(leather, placeOn(one([[pouch, T(0, 0, 0.008)]]), hol, undefined, 0.1), hol, { w: { Hips: 0.7, RightUpLeg: 0.3 } });
    // a coronha do revólver saindo da boca do coldre, inclinada para trás
    fit.solid(M(0x3a2418, { roughness: 0.5 }), placeOn(one([[roundBox(0.024, 0.075, 0.03, 0.009), T(0.012, 0.13, 0.024, 0, 0, -0.45)]]), hol, undefined, 0.1), hol, { w: { Hips: 0.7, RightUpLeg: 0.3 } });
    fit.solid(M(0x2a2a2c, { metalness: 0.8, roughness: 0.4 }), placeOn(one([[new THREE.CylinderGeometry(0.014, 0.014, 0.03, 10), T(-0.004, 0.1, 0.024)]]), hol, undefined, 0.1), hol, { w: { Hips: 0.7, RightUpLeg: 0.3 } }); // o tambor
    fit.solid(darkLeather, placeOn(new THREE.BoxGeometry(0.03, 0.06, 0.005).translate(0, 0.12, 0.002), hol, undefined, 0.1), hol, { w: { Hips: 0.7, RightUpLeg: 0.3 } }); // presilha no cinto
  }
  // amarra do coldre na coxa
  { const a0 = bonePos('RightUpLeg'), a1 = bonePos('RightLeg'), k = 0.3, tc = a0.clone().lerp(a1, k); // centro da coxa nessa altura (raios curtos: não alcançam a outra perna)
    fit.band(darkLeather, [0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i / 8) * Math.PI * 2; return { p: V(tc.x + Math.sin(a) * 0.14, tc.y, tc.z + Math.cos(a) * 0.14), c: V(tc.x, tc.y, tc.z) }; }), { w: 0.018, th: 0.004, off: 0.003, n: 40, closed: true }); }
  // chicote enrolado atrás do coldre, preso no cinturão: voltas justas, uma sobre a outra, e o cabo atravessado
  const wh = fit.anchor(V(-0.42, hy - 0.05, -0.3), V(0, hy - 0.05, 0));
  if (wh) {
    const parts = []; for (let i = 0; i < 6; i++) { const r = 0.068 - (i % 3) * 0.003; parts.push([new THREE.TorusGeometry(r, 0.0085, 6, 26), T(0.003 * Math.sin(i * 2.1), -0.003 * Math.cos(i * 1.7), 0.01 + i * 0.0095, 0, 0, i * 0.7)]); }
    fit.solid(darkLeather, placeOn(one(parts), wh), wh, { w: { Hips: 1 } });
    fit.solid(leather, placeOn(one([[new THREE.CylinderGeometry(0.011, 0.014, 0.22, 8), T(0.0, -0.02, 0.04, 0, 0, 0.9)], [new THREE.SphereGeometry(0.016, 8, 6), T(0.085, -0.075, 0.04)]]), wh), wh, { w: { Hips: 1 } }); // cabo, atravessado nas voltas
    fit.solid(darkLeather, placeOn(new THREE.BoxGeometry(0.022, 0.09, 0.005).translate(0, 0.06, 0.004), wh), wh, { w: { Hips: 1 } }); // tira que prende no cinto
  }
  return fit.finish();
}

// ---------------------------------------------------------------------------
// As roupas conquistadas: corpo do Bryce (pernas e braços inteiros), cabeça do explorador
function dressAncient(ctx, id) {
  const { meshes, bonePos, hips } = ctx;
  const byPart = (re) => meshes.find((me) => re.test(me.name) && !/Graft/.test(me.name));
  const shirt = byPart(/Shirt/), shorts = byPart(/Shorts|Pants/), shoes = byPart(/Sneakers|Shoes/);
  if (shoes) shoes.visible = false; // sandálias (feitas em mixamo.js)
  const neck = bonePos('Neck'), ch = bonePos('Spine2'), hy = hips.y, head = bonePos('Head');
  const out = [];
  const wool = (c) => M(0xffffff, { map: clothTex(c, { weave: 0.12 }), roughness: 0.95, side: THREE.DoubleSide });
  const goldM = M(0xe0b04a, { metalness: 0.95, roughness: 0.28 });
  const ringAt = (fit, mat, bone, child, t, w, r = 0.11) => { const a = bonePos(bone), b = bonePos(child); fit.band(mat, ring(a.clone().lerp(b, t), b.clone().sub(a), r), { w, th: 0.005, off: 0.003, n: 28, closed: true }); };
  if (id === 'egito') {
    // túnica de linho fino plissado (as mangas curtas da camisa viram as do linho), saiote longo plissado
    const pleat = clothTex('#bcbcbc', { weave: 0.05 });
    if (shirt) retint(shirt, 0xeadfc8, { rough: 0.95, detail: 0.35, lo: 0.85, hi: 1.1, grain: pleat, grainScale: 14 });
    if (shorts) retint(shorts, 0xf0e6d2, { rough: 0.95, detail: 0.3, lo: 0.85, hi: 1.1 });
    const linen = M(0xffffff, { map: canvasPleats('#f2e9d6'), roughness: 0.95, side: THREE.DoubleSide });
    if (ctx.cloth) ctx.cloth(ctx.clothGeometry('nobre', ctx.PROF.LONGKILT, 60), linen, -0.03, 0.8);
    const fit = fitterFor(ctx, /Shirt|Shorts|Body|Graft_Body/);
    // faixa vermelha e azul na cintura, com a ponta do nó caindo na frente
    const sash = M(0xffffff, { map: clothTex('#a8402c', { weave: 0.08, stripes: [[0.0, 0.22, '#1f4fa8'], [0.78, 1.0, '#1f4fa8']] }), roughness: 0.85 });
    fit.band(sash, waist(hy + 0.04), { w: 0.05, th: 0.006, off: 0.012, n: 60, closed: true });
    fit.band(sash, [{ p: V3(0.02, hy + 0.03, 0.5), c: V3(0.02, hy + 0.03, 0) }, { p: V3(0.03, hy - 0.08, 0.5), c: V3(0.02, hy - 0.08, 0) }, { p: V3(0.035, hy - 0.2, 0.5), c: V3(0.02, hy - 0.2, 0) }], { w: 0.045, th: 0.004, off: 0.035, n: 10 });
    // colar largo (wesekh): fileiras de contas de ouro, lápis-lazúli, cornalina e turquesa, sobre os ombros e o peito
    const collar = M(0xffffff, { map: ctx.stripeTex('collar'), metalness: 0.55, roughness: 0.4, side: THREE.DoubleSide });
    fit.shell(collar, { y0: ch.y + 0.02, y1: neck.y - 0.005, rows: 10, cols: 56, off: 0.008, r0: 0.3, cx: neck.x, cz: neck.z, bump: (a, y, s) => 0.004 * (1 - s) });
    // braceletes no alto do braço e nos pulsos
    for (const s of ['Left', 'Right']) { ringAt(fit, goldM, s + 'Arm', s + 'ForeArm', 0.3, 0.035); ringAt(fit, collar, s + 'ForeArm', s + 'Hand', 0.85, 0.04); }
    out.push(...fit.finish());
    // peruca de tranças até a nuca, com a testa e o rosto livres; o cabelo moderno fica por baixo
    for (const me of meshes) if (/Graft_Hair/.test(me.name)) me.visible = false;
    const fitH = fitterFor(ctx, /Graft_Body/);
    const wig = M(0xffffff, { map: wigTex(), roughness: 0.75, side: THREE.DoubleSide });
    const top = ctx.headFit().top, brow = top - 0.075; // a peruca começa na testa, acima das sobrancelhas
    fitH.shell(wig, { y0: head.y + 0.03, y1: top + 0.01, rows: 22, cols: 48, off: 0.026, hang: { rows: 5, depth: 0.12, flare: 0.012 }, r0: 0.2, cx: head.x, cz: head.z + 0.01, uvScale: [6, 1], top: { from: 0.75, angle: 1.35, y: head.y + 0.04 }, mask: (a, y) => !(Math.abs(a) < 1.05 && y < brow) });
    fitH.band(goldM, ring(V3(head.x, brow + 0.012, head.z + 0.005), V3(0, 1, 0), 0.2, 16), { w: 0.016, th: 0.004, off: 0.022, n: 40, closed: true }); // diadema
    out.push(...fitH.finish());
  }
  if (id === 'grecia') {
    const red = 0x8a2a1e;
    if (shirt) retint(shirt, red, { rough: 0.95, detail: 0.6, lo: 0.7, hi: 1.25, grain: clothTex('#8a8a8a', { weave: 0.12 }), grainScale: 9 });
    if (shorts) retint(shorts, red, { rough: 0.95, detail: 0.6, lo: 0.7, hi: 1.25 });
    if (ctx.cloth) ctx.cloth(ctx.clothGeometry('quiton', ctx.PROF.CHITON, 40), wool('#8a2a1e'), -0.04, 0.85);
    if (ctx.cloth) ctx.cloth(ctx.clothGeometry('pteryges2', [[0.178, 0.07], [0.19, 0], [0.208, -0.1], [0.216, -0.2]], 16), M(0xffffff, { map: strapsTex('#6a4428', '#d8b060'), roughness: 0.7, side: THREE.DoubleSide, alphaTest: 0.5 }), -0.02, 0.6);
    const fit = fitterFor(ctx, /Shirt|Shorts|Body/);
    const bronze = M(0xffffff, { map: metalTex('#b98a46'), metalness: 0.85, roughness: 0.32 });
    // couraça anatômica: peito, abdômen, costas; segue o tronco e tem os músculos em relevo
    const pec = (a, y) => { const f = Math.cos(a); if (f < 0) return 0; const yy = y - (ch.y + 0.07); return 0.016 * Math.exp(-(((Math.abs(a) - 0.42) / 0.3) ** 2) - (yy / 0.06) ** 2) * f; };
    const abs = (a, y) => { if (Math.cos(a) < 0.3) return 0; let b = 0; for (const yy of [ch.y - 0.05, ch.y - 0.12, ch.y - 0.19]) for (const sa of [-0.2, 0.2]) b += 0.008 * Math.exp(-(((a - sa) / 0.13) ** 2) - ((y - yy) / 0.028) ** 2); return b; };
    const blades = (a, y) => (Math.cos(a) < -0.3 ? 0.01 * Math.exp(-(((Math.abs(a) - 2.75) / 0.25) ** 2) - ((y - (ch.y + 0.06)) / 0.07) ** 2) : 0);
    fit.shell(bronze, { y0: hy + 0.05, y1: neck.y - 0.015, rows: 34, cols: 64, off: 0.02, r0: 0.34, cx: hips.x, cz: hips.z, bump: (a, y) => pec(a, y) + abs(a, y) + blades(a, y), uvScale: [3, 2], mask: (a, y) => !(y > ch.y + 0.03 && Math.abs(Math.sin(a)) > 0.72) }); // (cavas dos braços)
    for (const sd of [1, -1]) { const x = sd * 0.12; fit.band(bronze, [{ p: V3(x, ch.y + 0.07, 0.5), c: V3(x * 0.7, ch.y + 0.07, 0) }, { p: V3(x, neck.y + 0.3, 0), c: V3(x, neck.y - 0.15, 0) }, { p: V3(x, ch.y + 0.07, -0.5), c: V3(x * 0.7, ch.y + 0.07, 0) }], { w: 0.075, th: 0.005, off: 0.022, n: 24 }); } // placas dos ombros
    fit.band(bronze, waist(hy + 0.055), { w: 0.025, th: 0.008, off: 0.024, n: 64, closed: true }); // borda dobrada da couraça
    // grevas de bronze, do joelho ao tornozelo
    for (const s of ['Left', 'Right']) { const k = bonePos(s + 'Leg'), f = bonePos(s + 'Foot'), ax = k.clone().sub(f), len = ax.length() - 0.1;
      const g = new THREE.CylinderGeometry(0.062, 0.05, len, 22, 6, true, -1.35, 2.7); // aberta atrás (presa por tiras)
      { const q = g.attributes.position; for (let i = 0; i < q.count; i++) { const yy = q.getY(i) / len + 0.5, z = q.getZ(i); q.setZ(i, z + 0.012 * Math.sin(yy * Math.PI) * Math.max(0, z / 0.06)); } g.computeVertexNormals(); } // a barriga da panturrilha
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), ax.clone().normalize())); const mid = f.clone().lerp(k, 0.5 + 0.02); g.translate(mid.x, mid.y + 0.01, mid.z + 0.012);
      fit.solid(M(0xffe2b0, { map: metalTex('#b98a46'), metalness: 0.55, roughness: 0.38, side: THREE.DoubleSide }), g, null, { w: { [s + 'Leg']: 1 } }); }
    out.push(...fit.finish());
  }
  if (id === 'roma') {
    const red = 0x9a2a1e;
    if (shirt) retint(shirt, red, { rough: 0.95, detail: 0.6, lo: 0.7, hi: 1.25, grain: clothTex('#8a8a8a', { weave: 0.12 }), grainScale: 9 });
    if (shorts) retint(shorts, red, { rough: 0.95, detail: 0.6, lo: 0.7, hi: 1.25 });
    if (ctx.cloth) ctx.cloth(ctx.clothGeometry('tunica', ctx.PROF.KILT, 40), wool('#9a2a1e'), -0.04, 0.85);
    const fit = fitterFor(ctx, /Shirt|Shorts|Body/);
    const iron = M(0xffffff, { map: metalTex('#9aa0a4'), metalness: 0.85, roughness: 0.38 });
    const brass = M(0xc8a050, { metalness: 0.9, roughness: 0.32 });
    // lorica segmentata: cintas de ferro sobrepostas em volta do tronco, placas do peito e das costas, ombreiras
    const nb = 6, y0 = hy + 0.09, y1 = ch.y + 0.03, bh = (y1 - y0) / nb;
    for (let i = 0; i < nb; i++) fit.shell(iron, { y0: y0 + i * bh - 0.004, y1: y0 + (i + 1) * bh + 0.006, rows: 3, cols: 56, off: 0.016 + (nb - i) * 0.0025, r0: 0.34, cx: hips.x, cz: hips.z, bump: (a, y, s) => 0.007 * (1 - s), uvScale: [4, 0.3] }); // (a borda de baixo de cada cinta sobressai: as placas se sobrepõem)
    fit.shell(iron, { y0: ch.y + 0.03, y1: neck.y - 0.02, rows: 10, cols: 56, off: 0.02, r0: 0.34, cx: hips.x, cz: hips.z, uvScale: [4, 1], mask: (a) => Math.abs(Math.sin(a)) < 0.7 });
    for (const s of [1, -1]) for (let k = 0; k < 4; k++) { // ombreiras: lâminas curvas uma sobre a outra, do pescoço para o braço
      const x = s * (0.09 + k * 0.04);
      fit.band(iron, [{ p: V3(x, ch.y + 0.08, 0.5), c: V3(x * 0.6, ch.y + 0.08, 0) }, { p: V3(x, neck.y + 0.3, 0.0), c: V3(x, neck.y - 0.15, 0) }, { p: V3(x, ch.y + 0.08, -0.5), c: V3(x * 0.6, ch.y + 0.08, 0) }], { w: 0.05, th: 0.004, off: 0.022 + (3 - k) * 0.003, n: 24 });
    }
    // cinturão (cingulum) com placas de latão e o avental de tiras com tachas
    fit.band(M(0xffffff, { map: leatherTex('#3a2414'), roughness: 0.6 }), waist(hy + 0.03), { w: 0.045, th: 0.006, off: 0.03, n: 64, closed: true });
    for (let i = -3; i <= 3; i++) { const a = i * 0.32, at = fit.anchor(V3(Math.sin(a) * 0.5, hy + 0.03, Math.cos(a) * 0.5), V3(0, hy + 0.03, 0)); if (at) fit.solid(brass, placeOn(new THREE.BoxGeometry(0.04, 0.036, 0.004).translate(0, 0, 0.038), at), at); }
    const apron = M(0xffffff, { map: leatherTex('#3a2414', false), roughness: 0.6 });
    for (const x of [-0.045, -0.015, 0.015, 0.045]) { const at = fit.anchor(V3(x, hy + 0.0, 0.5), V3(x, hy, 0)); if (!at) continue;
      fit.solid(apron, placeOn(new THREE.BoxGeometry(0.018, 0.2, 0.004).translate(0, -0.1, 0.05), at), { ...at, w: { Hips: 1 } });
      for (let k = 0; k < 4; k++) fit.solid(brass, placeOn(new THREE.CylinderGeometry(0.006, 0.006, 0.004, 8).rotateX(Math.PI / 2).translate(0, -0.03 - k * 0.045, 0.053), at), { ...at, w: { Hips: 1 } }); }
    // o gládio na bainha, do lado direito
    const gl = fit.anchor(V3(-0.5, hy - 0.02, 0.02), V3(0, hy - 0.02, 0.02));
    if (gl) { const Z = 0.05, HIP = { w: { Hips: 1 } }; // (por fora da túnica, que abre em saia; preso só ao quadril, não balança com a coxa)
      const sc = one([[roundBox(0.055, 0.5, 0.022, 0.008), T(0, -0.2, Z, 0, 0, 0.12)], [new THREE.CylinderGeometry(0.016, 0.018, 0.1, 10), T(-0.032, 0.1, Z, 0, 0, 0.12)], [new THREE.SphereGeometry(0.024, 10, 8), T(-0.038, 0.16, Z)]]);
      fit.solid(M(0xffffff, { map: leatherTex('#5a2a1a', false), roughness: 0.55 }), placeOn(sc, gl), gl, HIP);
      fit.solid(brass, placeOn(one([[new THREE.BoxGeometry(0.06, 0.02, 0.026), T(0, 0.04, Z, 0, 0, 0.12)], [new THREE.BoxGeometry(0.06, 0.02, 0.026), T(0.025, -0.42, Z, 0, 0, 0.12)]]), gl), gl, HIP); }
    out.push(...fit.finish());
    // lenço de lã (focale) no pescoço, por baixo das placas
    const fitN = fitterFor(ctx, /Shirt|Graft_Body/);
    fitN.shell(M(0xffffff, { map: clothTex('#e6dcc6', { weave: 0.14 }), roughness: 1, side: THREE.DoubleSide }), { y0: neck.y - 0.03, y1: neck.y + 0.045, rows: 8, cols: 40, off: 0.02, r0: 0.12, cx: neck.x, cz: neck.z + 0.01, bump: (a, y, s) => 0.01 * Math.sin(s * Math.PI) + 0.004 * Math.sin(a * 6 + s * 7) });
    out.push(...fitN.finish());
    ctx.gear('galea', { depth: 0.125, gap: 0.006, tilt: 0.02 });
  }
  return out;
}
// texturas das roupas antigas
function canvasPleats(base) { // linho plissado: pregas finas na vertical (u dá a volta no saiote)
  if (_rt.has('pl' + base)) return _rt.get('pl' + base); const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, S, S); for (let i = 0; i < S; i += 4) { const g = x.createLinearGradient(i, 0, i + 4, 0); g.addColorStop(0, 'rgba(0,0,0,0.16)'); g.addColorStop(0.5, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.16)'); x.fillStyle = g; x.fillRect(i, 0, 4, S); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); _rt.set('pl' + base, t); return t;
}
const _rt = new Map();
function wigTex() { // tranças: faixas verticais escuras com brilho e as voltas das tranças
  if (_rt.has('wig')) return _rt.get('wig'); const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.fillStyle = '#120c08'; x.fillRect(0, 0, S, S); for (let i = 0; i < S; i += 6) { const g = x.createLinearGradient(i, 0, i + 6, 0); g.addColorStop(0, '#0a0604'); g.addColorStop(0.5, '#3a2a1e'); g.addColorStop(1, '#0a0604'); x.fillStyle = g; x.fillRect(i, 0, 6, S); }
  for (let y = 0; y < S; y += 8) { x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, y, S, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; _rt.set('wig', t); return t;
}
function strapsTex(leather, edge) { // tiras de couro (ptéryges) com franja e borda clara, separadas
  if (_rt.has('st' + leather)) return _rt.get('st' + leather); const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.clearRect(0, 0, S, S); for (let i = 0; i < 8; i++) { const x0 = i * 16 + 1; x.fillStyle = leather; x.fillRect(x0, 0, 14, S - 10); x.fillStyle = edge; x.fillRect(x0, S - 22, 14, 4); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(x0, 0, 2, S - 10); for (let k = 0; k < 7; k++) { x.fillStyle = edge; x.fillRect(x0 + k * 2, S - 10, 1, 9); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; _rt.set('st' + leather, t); return t;
}

// ---------------------------------------------------------------------------
// O guarda-roupa: as roupas de explorador valem desde o começo; a de cada cidade é ganha ao concluir todos os
// objetivos dela e fica para sempre (vale nas outras cidades também). V abre o guarda-roupa (ou o botão na pausa).
const KEY = 'cidades-historicas:roupas', WEAR = 'cidades-historicas:roupa';
const CITY_NAME = { egito: 'Mênfis', atenas: 'Atenas', roma: 'Roma' };
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } } };
export const isUnlocked = (id) => { const L = LOOKS[id]; return !!L && (!L.unlock || store.get(KEY, []).includes(id)); };
export function wornLook() { const id = store.get(WEAR, 'explorer'); return isUnlocked(id) ? id : 'explorer'; }
function unlock(id) { const s = store.get(KEY, []); if (s.includes(id)) return false; s.push(id); store.set(KEY, s); return true; }

export function setupWardrobe({ player, city, quests, objectives, toast }) {
  const prize = LOOK_ORDER.find((id) => LOOKS[id].unlock === city);
  const check = () => {
    if (!prize || isUnlocked(prize)) return;
    if (objectives.every((o) => quests.done.has(o.id)) && unlock(prize)) {
      setTimeout(() => toast(`Você concluiu todos os objetivos de ${CITY_NAME[city]} e ganhou uma roupa nova: ${LOOKS[prize].name}! Aperte V para vestir.`, 'royal', 9000), 2600);
    }
  };
  quests.listeners.push(check); check();
  // a ajuda das teclas e os créditos ganham a linha das roupas
  const keys = document.getElementById('keys'); if (keys && !/V roupas/.test(keys.textContent)) keys.textContent = keys.textContent.replace(' · M mapa', ' · V roupas · M mapa');
  const cr = document.getElementById('credits'); if (cr && !/Emiliano/.test(cr.textContent)) cr.insertAdjacentHTML('beforeend', ' · roupas do explorador: chapéu "Hat" de Emiliano.Herrera.Galindo, gálea "Roman Legionnaire Helmet" de AlbertoGalindo3D (Sketchfab, CC BY 4.0).');
  // a janela
  const box = document.createElement('div'); box.id = 'wardrobe'; box.hidden = true;
  box.style.cssText = 'position:fixed;inset:0;z-index:45;display:grid;place-items:center;background:rgba(8,5,2,.55);backdrop-filter:blur(3px);padding:16px';
  box.innerHTML = '<div class="scroll small" style="max-width:560px;width:100%;max-height:88vh;overflow:auto"><h2>Roupas do explorador</h2><div id="wr-list"></div><button class="gold-btn" id="wr-close">Voltar</button></div>';
  document.body.appendChild(box);
  const list = box.querySelector('#wr-list');
  const render = () => {
    const worn = player.look || 'explorer';
    list.innerHTML = LOOK_ORDER.map((id) => {
      const L = LOOKS[id], ok = isUnlocked(id), on = id === worn;
      const hint = ok ? L.desc : `Conclua todos os objetivos de ${CITY_NAME[L.unlock]} para ganhar esta roupa.`;
      return `<button data-look="${id}" class="ghost-btn" ${ok ? '' : 'disabled'} style="text-align:left;font-family:inherit;letter-spacing:0;${on ? 'outline:2px solid #e8b84a;' : ''}${ok ? '' : 'opacity:.55;cursor:default;'}"><b style="font-family:'Cinzel',serif">${ok ? '' : '🔒 '}${L.name}${on ? ' · vestindo' : ''}</b><br><span style="font-size:.92rem;font-weight:500">${hint}</span></button>`;
    }).join('');
  };
  const open = () => { render(); box.hidden = false; player.locked = true; };
  const close = () => { box.hidden = true; player.locked = false; };
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-look]'); if (!b || b.disabled) return;
    const id = b.dataset.look; if (id === player.look) return close();
    player.setLook(id); store.set(WEAR, id); close(); toast(`Você vestiu: ${LOOKS[id].name}.`);
  });
  box.querySelector('#wr-close').addEventListener('click', close);
  const pause = document.querySelector('#pause .scroll');
  if (pause) { const btn = document.createElement('button'); btn.className = 'ghost-btn'; btn.textContent = 'Roupas do explorador (V)'; btn.addEventListener('click', () => { document.getElementById('pause').hidden = true; open(); }); pause.querySelector('[data-act="resume"]')?.after(btn); }
  addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && !box.hidden) { e.stopImmediatePropagation(); close(); return; }
    if (e.code !== 'KeyV' || e.repeat || /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) return;
    if (!box.hidden) close(); else if (!player.locked) open();
  }, true);
  return { open, close, check };
}
