// Céu, nuvens e ar (o mesmo motor nas quatro cidades).
//  - o céu: azul fundo no alto, clareando até a cor da névoa no horizonte (o que está longe se funde com ele), com o
//    clarão em volta do sol e o disco do sol;
//  - as nuvens: cúmulos com volume (o lado do sol claro, o de lá na sombra), sumindo na névoa perto do horizonte;
//  - o ar: a névoa de TODOS os materiais ganha o clarão dourado do lado do sol e fica rente ao chão (o alto de uma
//    montanha ou de uma pirâmide aparece mais nítido do que o pé).
// A névoa é a do three.js (Fog, linear) com dois pedaços do shader trocados; os valores comuns (sol, cor do clarão)
// chegam a cada material por um uniform compartilhado, posto no onBuild — nenhum material do jogo precisou mudar.
import * as THREE from 'three';

export const ATMO = {
  sun: { value: new THREE.Vector3(0.3, 0.8, 0.5) }, // direção do sol (ou da lua), no mundo
  glow: { value: new THREE.Color(0, 0, 0) }, // cor do clarão em volta do sol (já com a força)
  k: { value: new THREE.Vector4(1, 30, 260, 0.85) }, // x: liga/desliga o clarão (debaixo d'água: 0) · y: altura em que a névoa começa a rarear · z: em quantos metros rareia · w: quanto rareia (0 = névoa igual em toda altura)
};

const C = THREE.ShaderChunk;
C.fog_pars_vertex = '#ifdef USE_FOG\n\tvarying float vFogDepth;\n\tvarying vec3 vFogRay;\n#endif';
// vFogRay: do olho até o ponto, no espaço do mundo (a rotação da câmera desfeita)
C.fog_vertex = '#ifdef USE_FOG\n\tvFogDepth = - mvPosition.z;\n\tvFogRay = vec3( dot( viewMatrix[ 0 ].xyz, mvPosition.xyz ), dot( viewMatrix[ 1 ].xyz, mvPosition.xyz ), dot( viewMatrix[ 2 ].xyz, mvPosition.xyz ) );\n#endif';
C.fog_pars_fragment = `#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	varying vec3 vFogRay;
	uniform vec3 uAtmoSun;
	uniform vec3 uAtmoGlow;
	uniform vec4 uAtmoK;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`;
C.fog_fragment = `#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	float atmoH = cameraPosition.y + vFogRay.y;
	fogFactor *= mix( 1.0, exp( - max( atmoH - uAtmoK.y, 0.0 ) / uAtmoK.z ), uAtmoK.w );
	float atmoS = max( dot( normalize( vFogRay ), uAtmoSun ), 0.0 );
	vec3 atmoCol = fogColor + uAtmoGlow * ( pow( atmoS, 6.0 ) * 0.35 + pow( atmoS, 40.0 ) * 0.9 ) * uAtmoK.x;
	gl_FragColor.rgb = mix( gl_FragColor.rgb, atmoCol, fogFactor );
#endif`;
// todo material, ao ser compilado, recebe os uniforms do ar (os mesmos objetos: mudou aqui, mudou em todos)
THREE.Material.prototype.onBuild = function (object, parameters) {
  const u = parameters && parameters.uniforms; if (!u) return;
  u.uAtmoSun = ATMO.sun; u.uAtmoGlow = ATMO.glow; u.uAtmoK = ATMO.k;
};

const NOISE = /* glsl */`
  float hsh(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hsh(i), hsh(i + vec2(1, 0)), f.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < OCT; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }`;

function skyMaterial() {
  return new THREE.ShaderMaterial({
    name: 'ceu', side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      // (os cinco primeiros são os do Sky do three.js: o sky.js de cada cidade continua escrevendo neles)
      sunPosition: { value: new THREE.Vector3(0, 1, 0) }, turbidity: { value: 2 }, rayleigh: { value: 1 }, mieCoefficient: { value: 0.005 }, mieDirectionalG: { value: 0.8 },
      uZenith: { value: new THREE.Color(0.1, 0.25, 0.6) }, uHorizon: { value: new THREE.Color(0.7, 0.8, 0.9) }, uGlow: { value: new THREE.Color(1, 0.9, 0.7) },
      uDisc: { value: 0 }, uFall: { value: 3.2 }, uAtmoSun: ATMO.sun,
    },
    vertexShader: 'varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: /* glsl */`
      uniform vec3 sunPosition, uZenith, uHorizon, uGlow, uAtmoSun; uniform float uDisc, uFall; varying vec3 vW;
      void main(){
        vec3 d = normalize(vW - cameraPosition), s = normalize(sunPosition);
        float t = pow(1.0 - clamp(d.y, 0.0, 1.0), uFall);
        vec3 col = mix(uZenith, uHorizon, t);
        float c = max(dot(d, uAtmoSun), 0.0);
        // o mesmo clarão da névoa (no horizonte os dois se encontram sem emenda), mais fraco no alto do céu
        col += uGlow * (pow(c, 6.0) * 0.35 + pow(c, 40.0) * 0.9) * mix(0.3, 1.0, t);
        col += uGlow * smoothstep(0.99962, 0.99988, dot(d, s)) * uDisc;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

function cloudMaterial(oct) {
  return new THREE.ShaderMaterial({
    name: 'nuvens', side: THREE.BackSide, transparent: true, depthWrite: false, fog: false, defines: { OCT: oct },
    uniforms: {
      uTime: { value: 0 }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uLight: { value: new THREE.Color(1, 1, 1) }, uShade: { value: new THREE.Color(0.7, 0.75, 0.8) }, uOpacity: { value: 0.85 },
      uCover: { value: 0.45 }, uHorizon: { value: new THREE.Color(0.7, 0.8, 0.9) }, uBright: { value: 1.5 },
    },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform float uTime, uOpacity, uCover, uBright; uniform vec3 uSun, uLight, uShade, uHorizon; varying vec3 vD;
      ${NOISE}
      void main(){
        vec3 d = normalize(vD);
        if (d.y < 0.012) discard;
        vec2 uv = d.xz / (d.y + 0.11) * 0.85 + vec2(uTime * 0.005, uTime * 0.0018);
        vec2 w = vec2(fbm(uv * 0.55 + 3.7), fbm(uv * 0.55 + 11.3)) - 0.5;
        float c = fbm(uv + w * 1.1);
        float lo = 1.0 - uCover;
        float a = smoothstep(lo, lo + 0.2, c);
        // cirros finos e esticados, bem altos
        float ci = smoothstep(0.6, 0.9, fbm(vec2(uv.x * 0.35 + 21.0, uv.y * 1.9) + w * 0.4)) * 0.35 * smoothstep(0.2, 0.6, uCover + 0.25);
        // luz: onde a nuvem rareia para o lado do sol é a borda iluminada; onde engrossa, a sombra dela mesma
        vec2 sd = normalize(uSun.xz + vec2(1e-4)) * 0.16 * (1.0 - 0.6 * clamp(uSun.y, 0.0, 1.0));
        float c2 = fbm(uv + sd + w * 1.1);
        float lit = clamp(0.62 + (c - c2) * 3.2, 0.0, 1.0);
        lit = mix(1.0, lit, smoothstep(0.1, 0.8, a));
        vec3 col = mix(uShade * 0.92, uLight * uBright, lit);
        float sunward = pow(max(dot(d, normalize(uSun)), 0.0), 9.0);
        col += uLight * sunward * 0.55 * (1.0 - a * 0.5);
        float al = max(a, ci);
        col = mix(uLight * uBright * 0.92, col, smoothstep(0.0, 0.5, a));
        float hz = smoothstep(0.012, 0.26, d.y);
        col = mix(uHorizon, col, hz * 0.9 + 0.1);
        gl_FragColor = vec4(col, al * hz * uOpacity);
      }`,
  });
}

const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Troca o céu e as nuvens de um TimeOfDay (o sky.js da cidade) pelos daqui e liga o ar. opts:
//   zenith: cor do alto do céu ao meio do dia · cover: quanto de nuvem (0 a 1) · haze: [altura, escala, quanto] da névoa
//   rente ao chão · glow: força do clarão do sol · leve: nuvens com menos detalhe (gráficos leves)
export function upgradeSky(sky, opts = {}) {
  const zenDay = new THREE.Color().setRGB(...(opts.zenith || [0.105, 0.255, 0.56]));
  const zenDawn = new THREE.Color().setRGB(0.2, 0.25, 0.42), zenNight = new THREE.Color().setRGB(0.01, 0.014, 0.035);
  const cover = opts.cover ?? 0.42, glowK = opts.glow ?? 0.55;
  const hz = opts.haze || [30, 260, 0.85];
  ATMO.k.value.set(1, hz[0], hz[1], hz[2]);

  const old = sky.sky.material; sky.sky.material = skyMaterial(); old.dispose();
  const oldC = sky.cloudMat; sky.cloudMat = sky.clouds.material = cloudMaterial(opts.leve ? 3 : 5); oldC.dispose();
  sky.cloudMat.uniforms.uCover.value = cover;
  if (opts.cloudBright) sky.cloudMat.uniforms.uBright.value = opts.cloudBright;

  const U = sky.sky.material.uniforms, CU = sky.cloudMat.uniforms, tmp = new THREE.Color();
  const apply = sky.apply.bind(sky);
  sky.apply = (s) => {
    apply(s);
    const e = s.sun.y, day = smooth(e, 0.02, 0.45) * (1 - s.night);
    // alto do céu: azul fundo de dia, arroxeado no amanhecer; o pó no ar (turbidez) o deixa mais pálido
    U.uZenith.value.copy(zenDawn).lerp(zenDay, day).lerp(s.fog, Math.min(0.25, Math.max(0, (s.turbidity - 3) / 40))).lerp(zenNight, s.night);
    U.uHorizon.value.copy(s.fog);
    U.uFall.value = 2.4 + day * 0.9; // de dia o azul desce mais perto do horizonte; no amanhecer a faixa clara é larga
    // clarão: a cor da luz do sol, forte com o sol baixo (amanhecer), discreto ao meio-dia, quase nada sob a lua
    const g = glowK * (1.25 - day * 0.55) * (1 - s.night * 0.93);
    tmp.copy(s.sunColor).multiplyScalar(g);
    U.uGlow.value.copy(tmp); ATMO.glow.value.copy(tmp);
    U.uDisc.value = 26 * (1 - s.night);
    ATMO.sun.value.copy(sky.sunDir);
    CU.uHorizon.value.copy(s.fog);
  };
  return sky;
}

// debaixo d'água não há clarão do sol na névoa (k = 0..1, quanto a câmera está submersa)
export function atmoUnderwater(k) { ATMO.k.value.x = 1 - k; }
