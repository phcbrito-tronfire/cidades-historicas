// Água parada (tanques, fontes, laguinhos, impluvium, canais): ondinhas pequenas que se mexem devagar, tiradas da
// posição no mundo (não depende das coordenadas de textura da peça) — toda água do jogo tem que parecer água.
import * as THREE from 'three';

// ondinhas pequenas e irregulares (mapa de normais feito em canvas)
export function rippleNormals() {
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), img = x.createImageData(N, N);
  const w = (2 * Math.PI) / N, h = (i, j) => Math.sin(i * w * 5 + Math.sin(j * w * 3) * 2) * 0.5 + Math.sin(j * w * 6 + Math.sin(i * w * 2) * 2.4) * 0.5 + Math.sin((i + j) * w * 16) * 0.18; // (frequências inteiras: a textura emenda sem costura)
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const dx = h(i + 1, j) - h(i - 1, j), dy = h(i, j + 1) - h(i, j - 1), k = (j * N + i) * 4; img.data[k] = 128 + dx * 60; img.data[k + 1] = 128 + dy * 60; img.data[k + 2] = 255; img.data[k + 3] = 255; }
  x.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// o relógio das ondinhas (um só para todas as águas)
const T = { value: 0 };
let running = false;
function run() {
  if (running) return; running = true; let last = performance.now();
  const f = (now) => { T.value += Math.min(0.1, (now - last) / 1000); last = now; requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
let RIP = null;

// põe as ondinhas num material de água (scale: quantas ondinhas por metro; strength: quanto mexem o reflexo)
export function stillWater(mat, { scale = 0.45, strength = 0.55 } = {}) {
  run(); RIP ??= rippleNormals();
  const U = { uRip: { value: RIP }, uRT: T, uRS: { value: scale }, uRK: { value: strength } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWXZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vWXZ; uniform sampler2D uRip; uniform float uRT, uRS, uRK; float gRip = 0.0;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec2 q = vWXZ * uRS;
          vec2 n = (texture2D(uRip, q + vec2(uRT * 0.021, uRT * 0.013)).xy * 2.0 - 1.0) + (texture2D(uRip, q * 1.7 + vec2(0.37 - uRT * 0.017, uRT * 0.023)).xy * 2.0 - 1.0);
          normal = normalize(normal + (viewMatrix * vec4(n.x, 0.0, n.y, 0.0)).xyz * uRK); gRip = n.x * 0.6 + n.y * 0.4; }`)
      // (as cristas das ondinhas um pouco mais claras e os vales mais escuros: lê-se água mesmo com o céu liso)
      .replace('#include <opaque_fragment>', 'outgoingLight *= 1.0 + gRip * 0.28; outgoingLight += vec3(0.1) * smoothstep(0.3, 0.9, gRip);\n#include <opaque_fragment>');
  };
  mat.needsUpdate = true;
  return mat;
}
