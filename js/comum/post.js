// Pós-processamento: cena com antisserrilhado (MSAA), oclusão de ambiente (sombras de contato), bloom, correção de
// cor, nitidez e vinheta
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// A cena. O "antialias" do navegador não vale aqui (ele só alisa o que vai direto para a tela, e o jogo desenha
// primeiro numa imagem intermediária): as bordas de colunas, telhados e cordas ficavam serrilhadas e tremendo. Nos
// gráficos altos a cena é desenhada numa imagem com 4 amostras por pixel (MSAA) e copiada para o compositor; nos
// outros níveis vai direto, e quem alisa é o FXAA do passe final.
class ScenePass extends Pass {
  constructor(scene, camera) {
    super();
    this.scene = scene; this.camera = camera; this.needsSwap = false; this.samples = 0;
    this.rt = null; this.w = 1; this.h = 1;
    this.copy = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { t: { value: null } }, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }',
    }));
  }
  setSamples(n) {
    if (n === this.samples) return; this.samples = n;
    if (this.rt) { this.rt.dispose(); this.rt = null; }
    if (n > 0) this.rt = new THREE.WebGLRenderTarget(this.w, this.h, { type: THREE.HalfFloatType, samples: n });
  }
  setSize(w, h) { this.w = w; this.h = h; if (this.rt) this.rt.setSize(w, h); }
  render(renderer, writeBuffer, readBuffer) {
    const target = this.rt || readBuffer;
    renderer.setRenderTarget(target); renderer.clear(); renderer.render(this.scene, this.camera);
    if (this.rt) { this.copy.material.uniforms.t.value = this.rt.texture; renderer.setRenderTarget(readBuffer); this.copy.render(renderer); }
  }
  dispose() { if (this.rt) this.rt.dispose(); this.copy.dispose(); }
}

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uNight: { value: 0 }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uUnder: { value: 0 }, uUnderCol: { value: new THREE.Color(0.1, 0.45, 0.5) }, uWarm: { value: 1 }, uSat: { value: 1.12 },
    uFxaa: { value: 0 }, uSharp: { value: 0.35 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uNight; uniform float uTime; uniform vec2 uRes; uniform float uUnder; uniform vec3 uUnderCol; uniform float uWarm; uniform float uSat; uniform float uFxaa; uniform float uSharp;
    varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
    // FXAA (alisa as bordas na imagem pronta): para os níveis sem MSAA
    vec3 fxaa(vec2 uv, vec2 px, vec3 m){
      vec3 nw = texture2D(tDiffuse, uv + vec2(-1.0, -1.0) * px).rgb, ne = texture2D(tDiffuse, uv + vec2(1.0, -1.0) * px).rgb;
      vec3 sw = texture2D(tDiffuse, uv + vec2(-1.0, 1.0) * px).rgb, se = texture2D(tDiffuse, uv + vec2(1.0, 1.0) * px).rgb;
      float lnw = luma(nw), lne = luma(ne), lsw = luma(sw), lse = luma(se), lm = luma(m);
      float lmin = min(lm, min(min(lnw, lne), min(lsw, lse))), lmax = max(lm, max(max(lnw, lne), max(lsw, lse)));
      if (lmax - lmin < max(0.04, lmax * 0.12)) return m;
      vec2 dir = vec2(-((lnw + lne) - (lsw + lse)), (lnw + lsw) - (lne + lse));
      float red = max((lnw + lne + lsw + lse) * 0.03125, 0.0078125);
      dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + red), vec2(-8.0), vec2(8.0)) * px;
      vec3 a = 0.5 * (texture2D(tDiffuse, uv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tDiffuse, uv + dir * (2.0 / 3.0 - 0.5)).rgb);
      vec3 b = a * 0.5 + 0.25 * (texture2D(tDiffuse, uv - dir * 0.5).rgb + texture2D(tDiffuse, uv + dir * 0.5).rgb);
      float lb = luma(b);
      return (lb < lmin || lb > lmax) ? a : b;
    }
    void main(){
      // debaixo d'água: a imagem ondula de leve
      vec2 uv = vUv + uUnder * vec2(sin(vUv.y * 38.0 + uTime * 2.1), cos(vUv.x * 31.0 + uTime * 1.7)) * 0.0022;
      vec2 px = 1.0 / uRes;
      vec3 c = texture2D(tDiffuse, uv).rgb;
      if (uFxaa > 0.5) c = fxaa(uv, px, c);
      // nitidez: realça o detalhe fino das texturas (pedra, tijolo, tecido), limitada pelos vizinhos para não criar halo
      if (uSharp > 0.0) {
        vec3 n = texture2D(tDiffuse, uv + vec2(0.0, -px.y)).rgb, s = texture2D(tDiffuse, uv + vec2(0.0, px.y)).rgb;
        vec3 w = texture2D(tDiffuse, uv + vec2(-px.x, 0.0)).rgb, e = texture2D(tDiffuse, uv + vec2(px.x, 0.0)).rgb;
        vec3 mn = min(c, min(min(n, s), min(w, e))), mx = max(c, max(max(n, s), max(w, e)));
        vec3 sh = c + (c - (n + s + w + e) * 0.25) * uSharp * (1.0 - uUnder);
        c = clamp(sh, mn, mx);
      }
      // contraste suave em curva S e saturação
      c = mix(c, c * c * (3.0 - 2.0 * c), 0.42);
      float l = luma(c);
      c = mix(vec3(l), c, mix(uSat, 0.9, uNight));
      // dia: sombras levemente azuladas, luzes douradas (look de cinema); noite: azul frio
      vec3 dayTint = mix(vec3(1.0), mix(vec3(1.0, 0.97, 0.95), vec3(1.07, 1.0, 0.86), smoothstep(0.15, 0.75, l)), uWarm);
      vec3 nightTint = vec3(0.86, 0.94, 1.12);
      c *= mix(dayTint, nightTint, uNight);
      // debaixo d'água: verde-azulado, menos contraste, luz vinda de cima
      c = mix(c, c * uUnderCol * 2.2 + uUnderCol * 0.08 * (0.6 + vUv.y), uUnder * 0.85);
      // vinheta
      vec2 q = vUv - 0.5;
      c *= 1.0 - dot(q, q) * mix(mix(0.5, 0.85, uNight), 1.4, uUnder);
      // granulação muito leve
      c += (rnd(vUv * uRes) - 0.5) * 0.014;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export async function createPost(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  const scenePass = new ScenePass(scene, camera);
  composer.addPass(scenePass);
  let ao = null;
  // a oclusão usa uma câmera que só vê a camada 0 (etiquetas, brilhos e partículas ficam na camada 1)
  const aoCam = camera.clone();
  camera.layers.enable(1); camera.layers.enable(2);
  try {
    const { GTAOPass } = await import('three/addons/postprocessing/GTAOPass.js');
    ao = new GTAOPass(scene, aoCam, size.x, size.y);
    ao.output = GTAOPass.OUTPUT.Default;
    ao.blendIntensity = 1.0;
    // raio de 1,5 m: além da sombra de contato (o pé da parede, a quina), escurece um pouco os vãos — portas, arcos,
    // o fundo dos pórticos —, que é o que dá peso às construções
    ao.updateGtaoMaterial({ radius: 1.5, distanceExponent: 1.4, thickness: 1.4, scale: 1.15, samples: 12 });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    // a oclusão é suave por natureza: calcular em meia resolução não muda o resultado e corta o custo por pixel
    const aoSetSize = ao.setSize.bind(ao);
    ao.setSize = (w, h) => aoSetSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
    // o GTAO esconde pontos e linhas varrendo a cena inteira duas vezes por quadro (~25 mil objetos, ~10 ms):
    // guarda a lista deles e só a refaz de vez em quando
    let pl = null, plFrame = 0;
    ao.overrideVisibility = () => {
      if (!pl || ++plFrame % 300 === 0) { pl = []; scene.traverse((o) => { if (o.isPoints || o.isLine) pl.push(o); }); }
      for (const o of pl) { o._aoVis = o.visible; o.visible = false; }
    };
    ao.restoreVisibility = () => { for (const o of pl) o.visible = o._aoVis; };
    composer.addPass(ao);
  } catch (e) { console.warn('GTAO indisponível', e); }
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.28, 0.55, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

  const resize = () => {
    const s = renderer.getSize(new THREE.Vector2());
    const pr = renderer.getPixelRatio();
    composer.setPixelRatio(pr);
    composer.setSize(s.x, s.y);
    grade.uniforms.uRes.value.set(s.x * pr, s.y * pr);
  };
  addEventListener('resize', resize);
  resize();

  let t = 0;
  return {
    composer, ao, bloom, grade, resize, scenePass,
    render(dt, night, under = 0) {
      grade.uniforms.uUnder.value = under;
      t += dt;
      aoCam.copy(camera); aoCam.layers.set(0);
      grade.uniforms.uNight.value = night;
      grade.uniforms.uTime.value = t % 10;
      bloom.strength = 0.22 + night * 0.45;
      bloom.threshold = night > 0.5 ? 0.7 : 0.92;
      composer.render(dt);
    },
    // antisserrilhado: msaa = amostras por pixel da cena (0 = sem; aí entra o FXAA no passe final)
    setAA(msaa) {
      const max = renderer.capabilities.maxSamples || 0;
      const n = renderer.capabilities.isWebGL2 ? Math.min(msaa, max) : 0;
      scenePass.setSamples(n);
      grade.uniforms.uFxaa.value = n > 0 ? 0 : 1;
      grade.uniforms.uSharp.value = n > 0 ? 0.4 : 0.22;
      resize();
    },
    setQuality(q) {
      if (ao) ao.enabled = q === 'alto';
      bloom.enabled = true;
      resize();
    },
  };
}
