// Céu, sol, lua, estrelas, neblina e iluminação para manhã / tarde / noite (tecla C)
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { lerp, mulberry32 } from '../comum/util.js';

const dirFrom = (elevDeg, azDeg) => {
  const e = THREE.MathUtils.degToRad(elevDeg), a = THREE.MathUtils.degToRad(azDeg);
  // azimute: 0 = norte (-z), 90 = leste (+x), 180 = sul (+z), 270 = oeste (-x)
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)).normalize();
};

export const PRESETS = {
  manha: {
    label: 'Manhã', msg: 'Amanhecer — Eos, a aurora de dedos róseos, surge sobre o monte Himeto.',
    sun: dirFrom(5, 95), turbidity: 6, rayleigh: 2.8, mie: 0.01, mieG: 0.88,
    fog: 0xd8b8b0, fogNear: 40, fogFar: 900, sunColor: 0xffa878, sunI: 2.4,
    hemiSky: 0xd8c0c8, hemiGround: 0x6a5a4c, hemiI: 0.85, exposure: 0.5,
    waterColor: 0x1a6f95, waterSun: 0xffc090, night: 0, torches: 0.15, windows: 0.2, stars: 0,
  },
  tarde: {
    label: 'Tarde', msg: 'Tarde — o sol de Hélio desce para o mar, sobre a ilha de Salamina.',
    sun: dirFrom(40, 235), turbidity: 2.6, rayleigh: 1.7, mie: 0.0035, mieG: 0.78,
    fog: 0xaec6dc, fogNear: 220, fogFar: 2200, sunColor: 0xfff0d8, sunI: 3.1,
    hemiSky: 0xcfe0f2, hemiGround: 0xb8a078, hemiI: 0.8, exposure: 0.54,
    waterColor: 0x0a74a8, waterSun: 0xfff6e0, night: 0, torches: 0, windows: 0, stars: 0,
  },
  noite: {
    label: 'Noite', msg: 'Noite — Selene atravessa o céu; nas casas, acendem-se as lamparinas de azeite.',
    sun: dirFrom(-12, 260), moon: dirFrom(40, 150), turbidity: 2, rayleigh: 0.4, mie: 0.002, mieG: 0.7,
    fog: 0x0d1626, fogNear: 80, fogFar: 700, sunColor: 0xa8bcff, sunI: 0.95,
    hemiSky: 0x3a4c80, hemiGround: 0x2a2420, hemiI: 0.75, exposure: 0.85,
    waterColor: 0x061824, waterSun: 0x56679a, night: 1, torches: 1, windows: 1.6, stars: 1,
  },
};
export const ORDER = ['manha', 'tarde', 'noite'];

function moonTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(118, 118, 10, 128, 128, 120);
  g.addColorStop(0, '#fffdf2'); g.addColorStop(0.85, '#e8e4d4'); g.addColorStop(1, '#cfc9b4');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(128, 128, 118, 0, 7); ctx.fill();
  const r = mulberry32(11);
  for (let i = 0; i < 26; i++) {
    const a = r() * 7, d = r() * 95, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d, s = 4 + r() * 18;
    ctx.fillStyle = `rgba(150,145,125,${0.25 + r() * 0.3})`; ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class TimeOfDay {
  constructor({ scene, renderer, sunLight, hemi, water, materials, torches, glowTex, lightsDef }) {
    this.scene = scene; this.renderer = renderer; this.sunLight = sunLight; this.hemi = hemi; this.water = water; this.M = materials;
    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    scene.add(this.sky);
    this.sunDir = new THREE.Vector3();
    this.current = 'tarde';
    this.from = null; this.to = null; this.t = 1;

    // cúpula noturna + estrelas
    const domeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
      uniforms: { uOpacity: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float uOpacity; varying vec3 vP; void main(){ float h = clamp(vP.y,0.0,1.0); vec3 c = mix(vec3(0.05,0.08,0.16), vec3(0.008,0.012,0.035), pow(h,0.5)); c += vec3(0.08,0.06,0.04)*pow(1.0-h,8.0); gl_FragColor = vec4(c, uOpacity); }',
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(4500, 32, 16), domeMat);
    this.dome.renderOrder = -1;
    scene.add(this.dome);

    // nuvens altas e esparsas (verão na Ática)
    this.cloudMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
      uniforms: { uTime: { value: 0 }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uLight: { value: new THREE.Color(1, 0.97, 0.9) }, uShade: { value: new THREE.Color(0.75, 0.72, 0.75) }, uOpacity: { value: 0.85 } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        uniform float uTime, uOpacity; uniform vec3 uSun, uLight, uShade; varying vec3 vD;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * n(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
        void main(){
          if (vD.y < 0.02) discard;
          vec2 uv = vD.xz / (vD.y + 0.12) * 1.6 + vec2(uTime * 0.004, uTime * 0.0015);
          float c = fbm(uv * 1.3);
          c = smoothstep(0.52, 0.78, c + n(uv * 7.0 + 3.0) * 0.08);
          vec2 stretch = vec2(uv.x * 0.6, uv.y * 3.0);
          c = max(c, smoothstep(0.62, 0.85, fbm(stretch * 0.9 + 9.0)) * 0.6); // cirros
          float lit = 0.6 + 0.4 * max(0.0, dot(normalize(vD), normalize(uSun)));
          vec3 col = mix(uShade, uLight, lit);
          float a = c * smoothstep(0.02, 0.2, vD.y) * uOpacity;
          gl_FragColor = vec4(col, a);
        }`,
    });
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(4300, 32, 16), this.cloudMat);
    this.clouds.renderOrder = -1;
    scene.add(this.clouds);

    const rnd = mulberry32(99);
    const mkStars = (n, size, band) => {
      const pos = [], col = [];
      for (let i = 0; i < n; i++) {
        let v;
        if (band) { // Via Láctea: faixa inclinada
          const a = rnd() * Math.PI * 2, off = (rnd() - 0.5) * 0.25;
          v = new THREE.Vector3(Math.cos(a), off, Math.sin(a)).applyAxisAngle(new THREE.Vector3(1, 0, 0.4).normalize(), 1.1);
        } else v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
        v.normalize();
        if (v.y < -0.05) v.y = -v.y;
        pos.push(v.x * 4000, v.y * 4000, v.z * 4000);
        const w = 0.7 + rnd() * 0.3; const tint = rnd();
        col.push(w * (tint > 0.8 ? 1 : 0.85), w * 0.9, w * (tint < 0.2 ? 0.75 : 1));
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const m = new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false });
      const p = new THREE.Points(g, m); p.renderOrder = 0; scene.add(p); return p;
    };
    this.stars = [mkStars(2200, 1.6, false), mkStars(450, 2.6, false), mkStars(3500, 1.1, true)];

    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture(), transparent: true, depthWrite: false, fog: false }));
    this.moon.scale.setScalar(170);
    this.moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x9fb0ff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.moonGlow.scale.setScalar(900);
    scene.add(this.moonGlow, this.moon);
    this.moonDir = PRESETS.noite.moon.clone();
    this.moon.position.copy(this.moonDir).multiplyScalar(3600);
    this.moonGlow.position.copy(this.moonDir).multiplyScalar(3700);

    // tochas: chama + brilho; luzes pontuais reutilizadas (as mais próximas do jogador)
    this.torches = torches;
    this.flameMat = new THREE.MeshBasicMaterial({ color: 0xffa23a, fog: true });
    this.flameMat2 = new THREE.MeshBasicMaterial({ color: 0xfff0a0 });
    this.glowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xff9a40, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.flames = new THREE.Group(); scene.add(this.flames);
    const fg = new THREE.ConeGeometry(0.16, 0.55, 7); fg.translate(0, 0.27, 0);
    const fg2 = new THREE.ConeGeometry(0.08, 0.32, 6); fg2.translate(0, 0.16, 0);
    // todas as chamas de uma vez (centenas de tochas = 3 desenhos, não centenas): cone de fora, cone de dentro e o
    // brilho (pontos com a textura de halo)
    const n = torches.length;
    this.flameI = [new THREE.InstancedMesh(fg, this.flameMat, n), new THREE.InstancedMesh(fg2, this.flameMat2, n)];
    for (const im of this.flameI) { im.frustumCulled = false; this.flames.add(im); }
    { const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3); torches.forEach((p, i) => pos.set([p.x, p.y + 0.3, p.z], i * 3)); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.glowPts = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color: 0xff9a40, size: 2.8, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      this.glowPts.layers.set(1); this.glowPts.frustumCulled = false; this.flames.add(this.glowPts); }
    this.flameSeed = torches.map((_, i) => i * 1.7);
    this._fm = new THREE.Matrix4();
    this.pool = [];
    for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xff9a48, 0, 20, 2); scene.add(l); this.pool.push(l); }
    this.interior = lightsDef.map((d) => { const l = new THREE.PointLight(d.color, d.intensity, d.dist, 2); l.position.copy(d.pos); l.userData.base = d.intensity; scene.add(l); return l; });

    this.state = this.snapshot(PRESETS.tarde);
    this.envs = {};
    this.apply(this.state);
  }

  // gera mapas de ambiente para cada horário (luz refletida dos metais e da água)
  bakeEnvironments() {
    const pm = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    for (const k of ['tarde']) {
      const st = this.snapshot(PRESETS[k]);
      if (k === 'noite') {
        const s = new THREE.Scene(); s.background = new THREE.Color(0x0a1022);
        this.envs[k] = pm.fromScene(s, 0.02).texture;
      } else {
        const sky = new Sky(); sky.scale.setScalar(1000);
        const u = sky.material.uniforms;
        u.turbidity.value = st.turbidity; u.rayleigh.value = st.rayleigh; u.mieCoefficient.value = st.mie; u.mieDirectionalG.value = st.mieG;
        u.sunPosition.value.copy(st.sun);
        envScene.add(sky);
        this.envs[k] = pm.fromScene(envScene).texture;
        envScene.remove(sky);
      }
    }
    pm.dispose();
    this.scene.environment = this.envs.tarde;
  }

  snapshot(p) {
    return {
      sun: p.sun.clone(), turbidity: p.turbidity, rayleigh: p.rayleigh, mie: p.mie, mieG: p.mieG,
      fog: new THREE.Color(p.fog), fogNear: p.fogNear, fogFar: p.fogFar, sunColor: new THREE.Color(p.sunColor), sunI: p.sunI,
      hemiSky: new THREE.Color(p.hemiSky), hemiGround: new THREE.Color(p.hemiGround), hemiI: p.hemiI, exposure: p.exposure,
      waterColor: new THREE.Color(p.waterColor), waterSun: new THREE.Color(p.waterSun), night: p.night, torches: p.torches, windows: p.windows, stars: p.stars,
    };
  }

  next() {
    const i = ORDER.indexOf(this.current);
    const k = ORDER[(i + 1) % ORDER.length];
    this.goTo(k);
    return PRESETS[k];
  }
  goTo(k) {
    this.from = this.snapshot(PRESETS[this.current]);
    if (this.t < 1 && this.state) this.from = this.cloneState(this.state);
    this.to = this.snapshot(PRESETS[k]);
    this.current = k; this.t = 0;
    // reflexos do ambiente: um mapa só (o da tarde), escurecido à noite. Trocar de mapa no meio da transição fazia
    // todos os materiais serem reavaliados no mesmo quadro — era o tranco da virada para a noite
    this.envMats = [];
    const seen = new Set();
    this.scene.traverse((o) => {
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) { if (m.envMapIntensity === undefined || seen.has(m)) continue; seen.add(m); if (m.userData.envBase === undefined) m.userData.envBase = m.envMapIntensity; this.envMats.push(m); }
    });
  }
  cloneState(s) { const o = {}; for (const k in s) o[k] = s[k].clone ? s[k].clone() : s[k]; return o; }

  mix(a, b, t) {
    const o = {};
    for (const k in a) {
      if (a[k].isColor) o[k] = a[k].clone().lerp(b[k], t);
      else if (a[k].isVector3) o[k] = a[k].clone().lerp(b[k], t).normalize();
      else o[k] = lerp(a[k], b[k], t);
    }
    return o;
  }

  apply(s) {
    const u = this.sky.material.uniforms;
    u.turbidity.value = s.turbidity; u.rayleigh.value = s.rayleigh; u.mieCoefficient.value = s.mie; u.mieDirectionalG.value = s.mieG;
    u.sunPosition.value.copy(s.sun);
    this.sunDir.copy(s.sun).lerp(this.moonDir, s.night).normalize(); // a luz passa do sol para a lua sem salto na sombra
    if (!this.scene.fog) this.scene.fog = new THREE.Fog(s.fog, s.fogNear, s.fogFar);
    this.scene.fog.color.copy(s.fog); this.scene.fog.near = s.fogNear; this.scene.fog.far = s.fogFar;
    this.sunLight.color.copy(s.sunColor); this.sunLight.intensity = s.sunI;
    this.hemi.color.copy(s.hemiSky); this.hemi.groundColor.copy(s.hemiGround); this.hemi.intensity = s.hemiI;
    this.renderer.toneMappingExposure = s.exposure;
    const wu = this.water.material.uniforms;
    wu.waterColor.value.copy(s.waterColor); wu.sunColor.value.copy(s.waterSun);
    // o turquesa do raso e o brilho próprio da água são coisa de dia: à noite o mar escurece junto com o céu
    if (wu.uShallow) {
      this._w0 ||= { sh: wu.uShallow.value.clone(), br: wu.uBright.value, ti: wu.uTint.value };
      const d = 1 - s.night * 0.88;
      wu.uShallow.value.copy(this._w0.sh).multiplyScalar(d); wu.uBright.value = this._w0.br * (1 - s.night); wu.uTint.value = this._w0.ti * (1 - s.night * 0.6);
    }
    wu.sunDirection.value.copy(this.sunDir);
    this.dome.material.uniforms.uOpacity.value = s.night;
    // nuvens: brancas de dia, rosadas no amanhecer, azuladas e tênues à noite
    const cu = this.cloudMat.uniforms;
    cu.uSun.value.copy(this.sunDir);
    cu.uLight.value.copy(s.sunColor).lerp(new THREE.Color(1, 1, 1), 0.45).multiplyScalar(1 - s.night * 0.75);
    cu.uShade.value.copy(s.hemiSky).multiplyScalar(0.85 - s.night * 0.6);
    cu.uOpacity.value = 0.8 - s.night * 0.55;
    if (this.horizon) this.horizon.userData.haze.value.copy(s.fog);
    for (const st of this.stars) st.material.opacity = s.stars;
    this.moon.material.opacity = s.night; this.moonGlow.material.opacity = s.night * 0.45;
    this.moon.visible = this.moonGlow.visible = s.night > 0.01;
    this.flames.visible = s.torches > 0.05;
    this.flameScale = s.torches;
    if (this.M.window) this.M.window.emissiveIntensity = s.windows;
    this.torchI = s.torches;
    for (const l of this.interior) l.intensity = l.userData.base * (0.45 + s.torches * 0.8);
    if (this.envMats) { const k = 1 - 0.85 * s.night; for (const m of this.envMats) m.envMapIntensity = m.userData.envBase * k; }
    this.state = s;
  }

  update(dt, t, playerPos) {
    this.cloudMat.uniforms.uTime.value = t;
    if (this.t < 1) {
      this.t = Math.min(1, this.t + dt / 2.5);
      const e = this.t * this.t * (3 - 2 * this.t);
      this.apply(this.mix(this.from, this.to, e));
    }
    // a luz direcional acompanha o jogador para a sombra ficar nítida
    const L = this.sunLight;
    const dir = this.sunDir;
    // centro da sombra arredondado em passos de 2 m (evita tremulação das bordas ao andar)
    const cx = Math.round(playerPos.x / 2) * 2, cz = Math.round(playerPos.z / 2) * 2;
    L.target.position.set(cx, playerPos.y, cz);
    L.position.set(cx, playerPos.y, cz).addScaledVector(dir, 320);
    L.target.updateMatrixWorld();

    // tochas tremulando
    if (this.flames.visible) {
      const m = this._fm, sc = this.flameScale;
      for (let i = 0; i < this.torches.length; i++) {
        const p = this.torches[i], sd = this.flameSeed[i], k = 0.85 + Math.sin(t * 13 + sd) * 0.08 + Math.sin(t * 23 + sd * 2) * 0.06;
        m.makeScale(sc, sc * k, sc).setPosition(p.x, p.y, p.z);
        this.flameI[0].setMatrixAt(i, m); this.flameI[1].setMatrixAt(i, m);
      }
      this.flameI[0].instanceMatrix.needsUpdate = this.flameI[1].instanceMatrix.needsUpdate = true;
      this.glowPts.material.opacity = Math.min(1, sc);
      // 4 luzes nas tochas mais próximas
      if (!this._lastSort || t - this._lastSort > 0.4) {
        this._lastSort = t;
        this._near = this.torches.map((p, i) => [p.distanceToSquared(playerPos), i]).sort((a, b) => a[0] - b[0]).slice(0, this.pool.length);
      }
      this.pool.forEach((l, j) => {
        const n = this._near && this._near[j];
        if (!n) { l.intensity = 0; return; }
        l.position.copy(this.torches[n[1]]).y += 0.5;
        l.intensity = 30 * this.torchI * (0.85 + Math.sin(t * 11 + j) * 0.15);
      });
    } else this.pool.forEach((l) => (l.intensity = 0));
  }
}
