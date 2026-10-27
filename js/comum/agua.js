// Água com reflexo (Water do three.js) que também deixa ver o que está embaixo: quanto mais rasa e quanto mais de
// cima se olha, mais transparente — aparecem o fundo de areia, as pedras e o corpo de quem nada. Na beira, a
// espuma das ondinhas que chegam à areia. A profundidade vem de um mapa (metros de água em cada ponto), calculado
// uma vez a partir do terreno.
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { QS } from './qualidade.js';

// depthAt(x, z) = metros de água (negativo ou 0 em terra); box = [x0, z0, x1, z1] da área com mapa (fora dela: fundo)
function depthTexture(depthAt, box, res) {
  const [x0, z0, x1, z1] = box;
  const [rx, rz] = Array.isArray(res) ? res : [res, res];
  const data = new Uint8Array(rx * rz);
  for (let j = 0; j < rz; j++) for (let i = 0; i < rx; i++) {
    const x = x0 + ((i + 0.5) / rx) * (x1 - x0), z = z0 + ((j + 0.5) / rz) * (z1 - z0);
    data[j * rx + i] = Math.max(0, Math.min(255, Math.round(depthAt(x, z) * 10))); // 0,1 m por nível, até 25,5 m
  }
  const t = new THREE.DataTexture(data, rx, rz, THREE.RedFormat, THREE.UnsignedByteType);
  t.magFilter = t.minFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}

export function makeWater(o) {
  const geo = new THREE.PlaneGeometry(o.width, o.height, 1, 1);
  const water = new Water(geo, {
    textureWidth: o.reflectRes || QS.refl, textureHeight: o.reflectRes || QS.refl,
    waterNormals: o.normals, sunDirection: new THREE.Vector3(0.5, 0.6, 0.4).normalize(),
    sunColor: 0xfff2d8, waterColor: o.waterColor ?? 0x14605f, distortionScale: o.distortion ?? 2.6, fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(o.x, o.y || 0, o.z);
  water.material.uniforms.size.value = o.size ?? 2.2;
  const box = o.box;
  const U = {
    tDepth: { value: depthTexture(o.depthAt, box, o.res || 512) },
    uBox: { value: new THREE.Vector4(box[0], box[1], box[2] - box[0], box[3] - box[1]) },
    uFar: { value: o.farDepth ?? 30 },
    uClarity: { value: o.clarity ?? 1.2 }, // metros de água até ~63% de opacidade (Nilo barrento ~1; Egeu ~5)
    uShallow: { value: new THREE.Color(o.shallowColor ?? 0x3f8f7a) },
    // mar do Caribe/Egeu: a água tinge um pouco até o fundo visto pela transparência (o raso fica turquesa, não só "vidro")
    uTint: { value: o.tint ?? 0 }, uTintDepth: { value: o.tintDepth ?? 9 },
    // quanto o céu se reflete (1 = normal) e quanto a cor própria da água brilha (0 = só onde o sol bate)
    uRefl: { value: o.reflect ?? 1 }, uBright: { value: o.bright ?? 0 },
    uFoam: { value: o.foam ?? 0.6 },
    uSwim: { value: new THREE.Vector4(0, -1000, 0, 0) }, // onde o explorador nada (x, y, z, força): a água fica mais clara em volta
  };
  Object.assign(water.material.uniforms, U);
  water.material.transparent = true;
  water.material.fragmentShader = water.material.fragmentShader
    .replace('uniform vec3 waterColor;', `uniform vec3 waterColor;
      uniform sampler2D tDepth; uniform vec4 uBox; uniform float uFar, uClarity, uFoam, uTint, uTintDepth, uRefl, uBright; uniform vec3 uShallow; uniform vec4 uSwim;
      float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hsh(i), hsh(i + vec2(1, 0)), f.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), f.x), f.y); }`)
    .replace('gl_FragColor = vec4( outgoingLight, alpha );', `
      vec2 duv = (worldPosition.xz - uBox.xy) / uBox.zw;
      float inBox = step(0.0, duv.x) * step(duv.x, 1.0) * step(0.0, duv.y) * step(duv.y, 1.0);
      float depth = mix(uFar, texture2D(tDepth, clamp(duv, 0.0, 1.0)).r * 25.5, inBox);
      // caminho da luz dentro da água: raso e visto de cima = transparente; fundo ou rasante = opaco (e reflete mais)
      float path = depth / max(0.18, eyeDirection.y);
      float clear = 1.0 - exp(-path / uClarity);
      // perto de quem nada a água se abre um pouco (dá para ver o corpo e as pernas batendo)
      float dS = length(worldPosition.xz - uSwim.xz);
      clear *= 1.0 - uSwim.w * 0.22 * (1.0 - smoothstep(0.5, 1.8, dS));
      vec3 body = mix(uShallow, waterColor, smoothstep(0.5, uTintDepth, depth));
      clear = max(clear, uTint * smoothstep(0.05, 0.8, depth));
      float refl = reflectance * uRefl;
      vec3 surf = mix((sunColor * diffuseLight * 0.3 + (uBright + max(0.0, dot(surfaceNormal, eyeDirection))) * body) * getShadowMask(),
                      (vec3(0.1) + reflectionSample * 0.9 + reflectionSample * specularLight), refl);
      float a = clamp(clear + refl * (1.0 - clear), 0.0, 1.0);
      // espuma da beira: uma faixa irregular na linha d'água e ondinhas que chegam à areia
      float n = vn(worldPosition.xz * 0.35 + time * 0.05) * 0.6 + vn(worldPosition.xz * 1.7 - time * 0.11) * 0.4;
      float shore = 1.0 - smoothstep(0.0, 0.45 + n * 0.35, depth);
      float waves = smoothstep(0.82, 0.98, sin(depth * 3.2 - time * 1.4 + n * 3.0)) * (1.0 - smoothstep(0.2, 2.4, depth)) * smoothstep(0.35, 0.75, n);
      float foam = clamp((shore * smoothstep(0.25, 0.6, n) + waves * 0.85) * uFoam, 0.0, 1.0) * inBox;
      surf = mix(surf, vec3(0.92, 0.96, 0.97) * (0.55 + 0.45 * diffuseLight.r), foam);
      a = max(a, foam * 0.95);
      gl_FragColor = vec4(surf + specularLight * 0.15, a * alpha);`);
  water.layers.set(1); // fora da oclusão de ambiente e do próprio reflexo
  return water;
}
