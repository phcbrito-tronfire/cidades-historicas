// O treino da residência, feito por cima da pose parada (o Mixamo não tem kyūdō nem kenjutsu):
// - Kyudo: o arqueiro de lado para o alvo segue a sequência do tiro japonês — o arco erguido acima da cabeça
//   (uchiokoshi), a abertura descendo (hikiwake), a espera na tensão máxima (kai), a soltura (hanare) com a mão
//   direita abrindo para trás, a pausa depois do tiro (zanshin) e o arco abaixado. A flecha só sai na soltura.
// - Suburi: o aluno de bokken com as duas mãos na empunhadura, em guarda (chūdan), ergue a espada acima da
//   cabeça e corta para a frente, na altura da cabeça do parceiro (men), e volta para a guarda.
// Os braços vão por IK de dois ossos até pontos do arco e da espada, então as mãos não soltam o que seguram.
import * as THREE from 'three';
import { armIK, bendSpine } from '../comum/mixamo.js';
import { makeYumi, makeArrow, tipX, YUMI } from '../comum/yumi.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ss = (k) => k * k * (3 - 2 * k);
const UP = V(0, 1, 0), _w = new THREE.Vector3(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), Y = V(0, 1, 0);

function shoulders(r) { // os ombros no espaço local do boneco (+x = esquerda dele, +z = frente)
  r.root.updateMatrixWorld(true);
  const p = (n) => r.root.worldToLocal(r.bones[n].getWorldPosition(new THREE.Vector3()));
  return { L: p('LeftArm'), R: p('RightArm') };
}
function reach(r, side, local, from, pole) { // a mão (o punho) até um ponto local; o pulso fica um pouco antes
  const B = r.bones, sh = B[side + 'Arm'], el = B[side + 'ForeArm'], wr = B[side + 'Hand']; if (!sh || !el || !wr) return;
  const wristL = local.clone().addScaledVector(from.clone().sub(local).normalize(), 0.07);
  armIK(sh, el, wr, r.root.localToWorld(wristL), pole.clone().applyQuaternion(r.root.quaternion));
}
const lerpV = (a, b, k) => a.clone().lerp(b, k);

export class Kyudo {
  constructor(rig, phase = 0) {
    this.r = rig; this.t = phase; this.len = 12;
    this.bow = makeYumi(); rig.root.add(this.bow);
    this.arrow = makeArrow(); rig.root.add(this.arrow);
    this.active = false; this.k = 0; // k: 0 = parado com o arco abaixado, 1 = no ciclo do tiro
  }
  keys() {
    if (this.K) return this.K;
    const { L, R } = shoulders(this.r);
    const rest = V(L.x + 0.1, L.y - 0.55, 0.3), restN = rest.clone().add(V(tipX(YUMI.brace), 0.03, -0.02));
    const raise = V(L.x + 0.15, L.y + 0.4, 0.28), daisan = V(L.x + 0.45, L.y + 0.28, 0.16), kai = V(L.x + 0.58, L.y + 0.13, 0.1);
    const hip = V(R.x - 0.06, R.y - 0.62, 0.12);
    // [tempo, punho do arco, mão direita, cabeça virada, flecha na corda]
    this.K = [
      [0, rest, restN, 0.25, true], [2.2, rest, restN, 0.25, true],
      [3.2, raise, raise.clone().add(V(-0.18, 0, -0.03)), 1.15, true], [3.8, raise, raise.clone().add(V(-0.18, 0, -0.03)), 1.15, true],
      [5.0, daisan, V(R.x + 0.2, R.y + 0.36, 0.16), 1.2, true], [6.2, kai, V(R.x + 0.05, R.y + 0.15, 0.13), 1.25, true],
      [7.8, kai.clone().add(V(0.01, 0, 0)), V(R.x + 0.04, R.y + 0.15, 0.13), 1.25, false],
      [7.9, kai.clone().add(V(0.03, -0.01, 0)), V(R.x - 0.3, R.y + 0.13, -0.02), 1.25, false],
      [9.3, kai.clone().add(V(0.03, -0.01, 0)), V(R.x - 0.3, R.y + 0.1, -0.02), 1.2, false],
      [10.6, rest, hip, 0.3, false], [12, rest, restN, 0.25, true],
    ];
    this.rest = { G: rest, N: restN };
    return this.K;
  }
  step(dt, active) {
    this.active = active; const K = this.keys();
    this.k += ((active ? 1 : 0) - this.k) * Math.min(1, dt * 3);
    if (!active && this.t < 0.3) return; // (fora do treino: espera com a flecha na corda)
    const before = this.t; this.t += dt;
    if (before < 7.8 && this.t >= 7.8) this.fire = true;
    if (this.t >= this.len) this.t = active ? -Math.random() * 3 : 0; // (uma pausa antes do próximo tiro)
  }
  apply() {
    const K = this.keys(), r = this.r, t = Math.max(0, this.t);
    let i = 0; while (i < K.length - 2 && t >= K[i + 1][0]) i++;
    const a = K[i], b = K[i + 1], k = ss(Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))));
    let G = lerpV(a[1], b[1], k), N = lerpV(a[2], b[2], k), head = a[3] + (b[3] - a[3]) * k; const held = a[4];
    const sh = shoulders(r);
    // a cabeça olha o alvo (à esquerda) desde que o arco sobe
    if (r.bones.Neck) bendSpine(r.bones.Neck, UP, head * 0.45); if (r.bones.Head) bendSpine(r.bones.Head, UP, head * 0.45);
    const draw = Math.min(1, Math.max(0, (G.x - N.x - 0.25) / 0.55));
    reach(r, 'Left', G, sh.L, V(0, -1, -0.5));
    reach(r, 'Right', N, sh.R, V(-0.35, -1, -0.2).lerp(V(-1, 0.35, -0.5), draw));
    this.bow.position.copy(G); this.bow.userData.setDraw(held ? N.clone().sub(G) : null);
    this.arrow.visible = held;
    if (held) { const dir = G.clone().sub(N).normalize(); this.arrow.position.copy(N); this.arrow.quaternion.setFromUnitVectors(Y, dir); }
    if (this.fire) { this.fire = false; const from = r.root.localToWorld(N.clone()); const dir = V(1, 0.02, 0).applyQuaternion(r.root.quaternion); this.onRelease?.(from, dir); }
  }
}

export class Suburi {
  constructor(rig, phase = 0) {
    this.r = rig; this.t = -phase; this.mode = 'drill';
    const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x9a7448, roughness: 0.65 });
    const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.018, 0.78, 7), wood); blade.position.y = 0.43; blade.scale.z = 0.7; g.add(blade); // a "lâmina" de carvalho, achatada
    const tsuka = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.27, 7), wood); tsuka.position.y = -0.095; g.add(tsuka); // a empunhadura
    const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 12), new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.6 })); tsuba.position.y = 0.045; g.add(tsuba);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.sword = g; rig.root.add(g);
    this.H = null; this.D = null; this.hold = 1;
  }
  keys() {
    if (this.P) return this.P;
    const { L, R } = shoulders(this.r), y = (L.y + R.y) / 2, x = (L.x + R.x) / 2;
    this.P = {
      kamae: [V(x, y - 0.42, 0.34), V(0, 0.5, 0.87).normalize()],
      raise: [V(x, y + 0.24, 0.1), V(0, 0.72, -0.69).normalize()],
      men: [V(x, y - 0.1, 0.5), V(0, 0.06, 1).normalize()],
      rest: [V(R.x - 0.03, R.y - 0.62, 0.16), V(0, -0.5, 0.87).normalize()],
    };
    return this.P;
  }
  step(dt, active) {
    this.dt = dt; this.mode = active ? 'drill' : 'rest';
    if (active) { this.t += dt; if (this.t > this.cycle()) this.t = -(0.6 + Math.random() * 1.2); }
  }
  cycle() { return 1.6; } // erguer 0,55 s, segurar 0,1, cortar 0,16, segurar 0,3, voltar 0,5
  apply() {
    const P = this.keys(), r = this.r; let H, D, lean = 0;
    if (this.mode === 'rest') [H, D] = P.rest;
    else {
      const t = Math.max(0, this.t), seg = (a, b, k) => [lerpV(a[0], b[0], k), lerpV(a[1], b[1], k).normalize()];
      if (t < 0.55) [H, D] = seg(P.kamae, P.raise, ss(t / 0.55));
      else if (t < 0.65) [H, D] = P.raise;
      else if (t < 0.81) { const k = (t - 0.65) / 0.16; [H, D] = seg(P.raise, P.men, k * k); lean = k; }
      else if (t < 1.1) { [H, D] = P.men; lean = 1; }
      else { const k = ss(Math.min(1, (t - 1.1) / 0.5)); [H, D] = seg(P.men, P.kamae, k); lean = 1 - k; }
    }
    // segue o alvo bem de perto (no corte quase sem atraso; ao parar o treino, desce a espada com calma)
    const f = Math.min(1, (this.dt || 0.016) * (this.mode === 'rest' ? 6 : 40));
    if (!this.H) { this.H = H.clone(); this.D = D.clone(); } else { this.H.lerp(H, f); this.D.lerp(D, f).normalize(); }
    const two = this.mode !== 'rest'; this.hold += ((two ? 1 : 0) - this.hold) * f;
    H = this.H; D = this.D;
    if (lean && r.bones.Spine) bendSpine(r.bones.Spine, V(1, 0, 0).applyQuaternion(r.root.quaternion), lean * 0.12);
    const sh = shoulders(r);
    this.sword.position.copy(H); this.sword.quaternion.setFromUnitVectors(Y, D);
    reach(r, 'Right', H.clone().addScaledVector(D, 0.0), sh.R, V(-0.7, -1, -0.2));
    if (this.hold > 0.5) reach(r, 'Left', H.clone().addScaledVector(D, -0.19), sh.L, V(0.7, -1, -0.2));
  }
}
void _w; void _p; void _q;
