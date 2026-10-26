// Pós-processamento: oclusão de ambiente (sombras de contato), bloom, correção de cor e vinheta
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uNight: { value: 0 }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uUnder: { value: 0 }, uUnderCol: { value: new THREE.Color(0.1, 0.45, 0.5) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uNight; uniform float uTime; uniform vec2 uRes; uniform float uUnder; uniform vec3 uUnderCol;
    varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main(){
      // debaixo d'água: a imagem ondula de leve
      vec2 uv = vUv + uUnder * vec2(sin(vUv.y * 38.0 + uTime * 2.1), cos(vUv.x * 31.0 + uTime * 1.7)) * 0.0022;
      vec3 c = texture2D(tDiffuse, uv).rgb;
      // contraste suave em curva S e saturação
      c = mix(c, c * c * (3.0 - 2.0 * c), 0.35);
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, mix(1.12, 0.9, uNight));
      // dia: sombras levemente azuladas, luzes douradas (look de cinema); noite: azul frio
      vec3 dayTint = mix(vec3(1.0, 0.97, 0.95), vec3(1.07, 1.0, 0.86), smoothstep(0.15, 0.75, l));
      vec3 nightTint = vec3(0.86, 0.94, 1.12);
      c *= mix(dayTint, nightTint, uNight);
      // debaixo d'água: verde-azulado, menos contraste, luz vinda de cima
      c = mix(c, c * uUnderCol * 2.2 + uUnderCol * 0.08 * (0.6 + vUv.y), uUnder * 0.85);
      // vinheta
      vec2 q = vUv - 0.5;
      c *= 1.0 - dot(q, q) * mix(mix(0.55, 0.85, uNight), 1.4, uUnder);
      // granulação muito leve
      c += (rnd(vUv * uRes) - 0.5) * 0.018;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export async function createPost(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  let ao = null;
  // a oclusão usa uma câmera que só vê a camada 0 (etiquetas, brilhos e partículas ficam na camada 1)
  const aoCam = camera.clone();
  camera.layers.enable(1); camera.layers.enable(2);
  try {
    const { GTAOPass } = await import('three/addons/postprocessing/GTAOPass.js');
    ao = new GTAOPass(scene, aoCam, size.x, size.y);
    ao.output = GTAOPass.OUTPUT.Default;
    ao.blendIntensity = 0.9;
    ao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.6, thickness: 1.2, scale: 1.0, samples: 12 });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    // a oclusão é suave por natureza: calcular em meia resolução não muda o resultado e corta o custo por pixel
    const aoSetSize = ao.setSize.bind(ao);
    ao.setSize = (w, h) => aoSetSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
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
    composer, ao, bloom, grade, resize,
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
    setQuality(q) {
      if (ao) ao.enabled = q === 'alto';
      bloom.enabled = true;
      resize();
    },
  };
}
