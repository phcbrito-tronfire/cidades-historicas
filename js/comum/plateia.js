// Plateia de gente de verdade: na hora de carregar, o boneco humano do jogo (o mesmo dos personagens) é fotografado
// sentado e de pé, em várias roupas e cores, de frente e de costas, num "álbum" de imagens. Cada espectador é um
// cartão com uma dessas fotos, no tamanho certo de uma pessoa: milhares deles custam quase nada. Quem olha de trás
// vê as costas; quando a plateia se empolga, parte dela se levanta e pula.
import * as THREE from 'three';
import { makeHumanoid, animateHumanoid } from './mixamo.js';

const TW = 128, TH = 192, W = 1.1, H = 1.65, SEAT = 0.47; // tamanho do cartão (m) e a altura do assento no cartão
const COLS = 8;

// roupas: cada uma com três cores; para cada (roupa, cor): sentado/de pé × frente/costas = 4 fotos
const LOOKS = [
  (c) => ({ outfit: 'chiton', cloth: c, border: null, beard: 'short', base: 'bryce' }),
  (c) => ({ outfit: 'himation', cloth: c, border: c === 0xf4efe2 ? 0x6a1a4a : null, beard: null, base: 'brian' }),
  (c) => ({ outfit: 'peplos', cloth: c, border: 0xd8b45a, hair: 'veil', veilColor: 0xf2ecdc }),
  (c) => ({ outfit: 'peplos', cloth: c, border: null, hair: 'up' }),
];
const COLORS = [[0xb0402c, 0x3a5a8a, 0xd8c8a0], [0xf4efe2, 0xefe8d8, 0xe4dccb], [0x8e2c22, 0x6a7a4a, 0xc8a050], [0x2c4f8c, 0xd8b45a, 0x9a8a70]];

export function makeCrowd(renderer) {
  const n = LOOKS.length * 3 * 4, rows = Math.ceil(n / COLS);
  const rt = new THREE.WebGLRenderTarget(TW * COLS, TH * rows, { samples: 4 });
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xfff4e6, 0x8a7a6a, 2.6));
  const sun = new THREE.DirectionalLight(0xffffff, 3.2); sun.position.set(0.6, 2.2, 2.4); sc.add(sun);
  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 0.1, 10); cam.position.set(0, H / 2, 4); cam.lookAt(0, H / 2, 0); cam.layers.enable(2); // os bonecos ficam na camada 2
  const prevRT = renderer.getRenderTarget(), prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha(), prevAuto = renderer.autoClear;
  const prevTone = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.autoClear = false;
  let tile = 0;
  LOOKS.forEach((lk, li) => COLORS[li].forEach((c) => {
    const rig = makeHumanoid(lk(c)); sc.add(rig.root);
    for (const pose of ['sit', 'idle']) {
      for (let k = 0; k < 6; k++) animateHumanoid(rig, 0.4, 0, pose, k * 0.4);
      // sentado: o quadril do boneco fica na altura do assento do cartão; de pé: os pés no chão do degrau de baixo
      if (rig.skirt) rig.skirt.scale.y = pose === 'sit' ? 0.42 : 1; // sentado, a saia de pano dobra no colo (senão vira um disco em volta dos joelhos)
      for (const back of [0, 1]) {
        rig.root.rotation.y = back ? Math.PI : 0; rig.root.updateMatrixWorld(true);
        const cx = tile % COLS, cy = Math.floor(tile / COLS);
        // numa textura, valem o viewport e o recorte da própria textura (e só são lidos no setRenderTarget)
        rt.viewport.set(cx * TW, cy * TH, TW, TH); rt.scissor.set(cx * TW, cy * TH, TW, TH); rt.scissorTest = true;
        renderer.setRenderTarget(rt); renderer.info.reset(); renderer.render(sc, cam); tile++; // info.reset: força o esqueleto a ser recalculado a cada foto
      }
    }
    sc.remove(rig.root);
  }));
  rt.viewport.set(0, 0, rt.width, rt.height); rt.scissorTest = false; renderer.setRenderTarget(prevRT); renderer.setClearColor(prevClear, prevAlpha); renderer.autoClear = prevAuto; renderer.toneMapping = prevTone;

  // o cartão: a origem fica no assento; olha para -z (para onde a pessoa está virada)
  const geo = new THREE.PlaneGeometry(W, H); geo.translate(0, H / 2 - SEAT, 0); geo.rotateY(Math.PI);
  const uTime = { value: 0 }, uExcite = { value: 0 };
  const mat = new THREE.MeshLambertMaterial({ map: rt.texture, alphaTest: 0.5, side: THREE.DoubleSide }); mat.color.setScalar(1.35);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime; sh.uniforms.uExcite = uExcite; sh.uniforms.uGrid = { value: new THREE.Vector2(COLS, rows) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
uniform float uTime, uExcite; uniform vec2 uGrid;`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>
  float cid = float(gl_InstanceID);
  float h1 = fract(sin(cid * 12.9898) * 43758.5453), h2 = fract(sin(cid * 78.233) * 12345.678);
  float variant = floor(h1 * ${(LOOKS.length * 3).toFixed(1)});
  float stand = step(1.0 - uExcite * 0.85, h2);
  vec3 fwdW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * vec3(0.0, 0.0, -1.0));
  vec3 posW = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float backV = step(dot(cameraPosition - posW, fwdW), 0.0);
  float tl = variant * 4.0 + stand * 2.0 + backV;
  vec2 cell = vec2(mod(tl, uGrid.x), floor(tl / uGrid.x));
  vMapUv = (cell + uv) / uGrid;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  { float cid2 = float(gl_InstanceID), ph = cid2 * 1.731, st = step(1.0 - uExcite * 0.85, fract(sin(cid2 * 78.233) * 12345.678));
    transformed.y += sin(uTime * 2.0 + ph) * 0.01 + st * (${(SEAT - 0.02).toFixed(2)} + uExcite * 0.18 * max(0.0, sin(uTime * 9.0 + ph))); }`);
    // o cartão gira em torno do eixo vertical para a câmera (nunca é visto de lado); a luz vem como se ele olhasse para cima
    sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);')
      .replace('#include <project_vertex>', `
  vec4 ipW = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec3 toCam = cameraPosition - ipW.xyz; toCam.y = 0.0; toCam = normalize(toCam + vec3(1e-4, 0.0, 0.0));
  vec3 rightW = vec3(toCam.z, 0.0, -toCam.x);
  float scl = length(instanceMatrix[0].xyz);
  vec3 wpos = ipW.xyz + (rightW * -transformed.x + vec3(0.0, transformed.y, 0.0)) * scl;
  vec4 mvPosition = viewMatrix * vec4(wpos, 1.0);
  gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '');
  };
  mat.userData.rt = rt;
  return { geometry: geo, material: mat, uTime, uExcite, texture: rt.texture };
}
