// As contas da corrida de bigas no Circo Máximo: a pista (raias em volta da spina), a física das parelhas
// (velocidade, fôlego dos cavalos, derrapagem nas metas, choques entre carros) e a condução dos aurigas.
// Nada de desenho aqui: o circo.js cuida dos carros, da câmera, do painel e das falas.
//
// A posição na pista é "u" (em voltas) e "r" (a distância da spina, a raia). Nas retas, mudar de raia só move o
// carro de lado; nas metas, a raia de dentro é mais curta — e por isso precisa ser feita mais devagar.

export const R0 = 14, RMIN = 7.5, RMAX = 21;
export const K = 23; // velocidade segura na meta: v = raiz(K·r)  (raia 7,5 ≈ 13,1 m/s · raia 12 ≈ 16,6 · raia 15 ≈ 18,6)
export const LEN = 4.2, WID = 2.2; // comprimento (carro com a parelha) e largura de uma biga, para os choques
export const AI_BASE = 16.3; // o ritmo dos aurigas da cidade nas retas (± a habilidade de cada um)
export const TOP = 16.4, WHIP = 19.2, WHIP_T = 1.5, WHIP_COST = 0.3, REGEN = 0.022; // o explorador: galope, chicote e fôlego

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rr = (a, b) => a + (b - a) * Math.random();

// pista em forma de estádio em volta da spina. As frações de cada trecho não dependem da raia (a reta é sempre
// a mesma reta, de uma meta à outra). Sentido anti-horário visto do alto, como em Roma: sai das baias (oeste)
// pelo lado do Aventino (sul, +z), vira na meta leste e volta pelo lado do Palatino; a spina fica à esquerda.
export function makeTrack(cx, cz, lh) {
  const P0 = 4 * lh + 2 * Math.PI * R0, fS = (2 * lh) / P0, fT = (Math.PI * R0) / P0;
  const seg = (u) => { const f = u - Math.floor(u); return f < fS ? 0 : f < fS + fT ? 1 : f < 2 * fS + fT ? 2 : 3; };
  return {
    P0, fS, fT,
    track(u, r, out) {
      if (u < 0) { out.x = cx - lh + u * P0; out.z = cz + r; out.h = Math.PI / 2; out.turn = 0; return out; } // saindo das baias, antes da linha
      let f = u - Math.floor(u);
      if (f < fS) { out.x = cx - lh + (f / fS) * 2 * lh; out.z = cz + r; out.h = Math.PI / 2; out.turn = 0; return out; }
      f -= fS;
      if (f < fT) { const a = Math.PI / 2 - (f / fT) * Math.PI; out.x = cx + lh + Math.cos(a) * r; out.z = cz + Math.sin(a) * r; out.h = Math.atan2(Math.sin(a), -Math.cos(a)); out.turn = 1; return out; }
      f -= fT;
      if (f < fS) { out.x = cx + lh - (f / fS) * 2 * lh; out.z = cz - r; out.h = -Math.PI / 2; out.turn = 0; return out; }
      f -= fS;
      const a = -Math.PI / 2 - (f / fT) * Math.PI; out.x = cx - lh + Math.cos(a) * r; out.z = cz + Math.sin(a) * r; out.h = Math.atan2(Math.sin(a), -Math.cos(a)); out.turn = 1; return out;
    },
    turn: (u) => u >= 0 && seg(u) % 2 === 1,
    // metros de pista por volta naquele ponto e naquela raia (nas metas, cresce com o raio)
    k(u, r) { return u >= 0 && seg(u) % 2 === 1 ? (P0 * r) / R0 : P0; },
    // metros até a próxima meta (0 dentro dela)
    toTurn(u) {
      if (u < 0) return (fS - u) * P0;
      const f = u - Math.floor(u);
      if (f < fS) return (fS - f) * P0;
      if (f < fS + fT) return 0;
      if (f < 2 * fS + fT) return (2 * fS + fT - f) * P0;
      return 0;
    },
    turnId: (u) => Math.floor(u * 2), // (cada meta tem o seu número: um aviso de derrapagem por meta)
  };
}

// um carro novo (os campos de condução; o circo.js põe os de desenho)
export function carState(c, i, u0) {
  Object.assign(c, { u: u0, r: 9 + i * 3, rT: 9 + i * 3, v: 0, rv: 0, target: 0, rate: 0.6, decel: 0, skill: rr(-0.6, 0.6),
    ph: Math.random() * 6, laneIn: rr(8, 10.5), stam: 1, whipT: 0, whipCd: 0, tired: false, crashT: 0, slip: 0, skidId: -1,
    hitCd: 0, done: false, place: 0, spin: 0, player: false });
  return c;
}

// alguém naquela raia, ao lado ou logo à frente/atrás? (para não jogar o carro em cima de outro)
function laneFree(c, cars, T, r, tight = false) {
  if (r < RMIN || r > RMAX) return false;
  const lo = Math.min(c.r, r) - WID * 0.9, hi = Math.max(c.r, r) + WID * 0.9;
  for (const o of cars) {
    if (o === c || o.done) continue;
    const ds = (o.u - c.u) * T.k(c.u, c.r);
    if ((tight ? Math.abs(ds) < LEN * 0.75 : ds > -LEN - 2 && ds < LEN + 5) && o.r > lo && o.r < hi && Math.abs(o.r - c.r) > 0.3) return false;
  }
  return true;
}

// auriga da cidade: quer correr no ritmo dele, freia antes das metas (com margem), procura a raia de dentro nas
// curvas e, com alguém mais lento à frente, abre para ultrapassar se houver espaço (o explorador conta como carro)
export function driveAI(c, cars, T, dt, t, laps, human) {
  if (c.done) { c.target = c.lead ? 6 : 3.5; c.rate = 0.5; c.decel = 0; c.rT = RMAX; const r0 = c.r; c.r += (c.rT - c.r) * Math.min(1, dt * 0.5); c.rv = (c.r - r0) / Math.max(dt, 1e-4); return; } // passou a chegada: volta da vitória por fora
  if (c.crashT > 0) { c.target = 0; c.decel = 9; return; }
  const k = T.k(c.u, c.r), inT = T.turn(c.u), d = T.toTurn(c.u);
  let base = AI_BASE + c.skill + Math.sin(t * 0.3 + c.ph) * 0.7;
  if (c.u > laps - 0.42) base += 0.9; // a última reta: os aurigas soltam tudo
  if (human && !human.done) { const gap = (human.u - c.u) * T.P0; if (gap > 25) base += Math.min(1.1, (gap - 25) / 45); } // ninguém desiste: quem ficou para trás aperta o passo
  const care = 0.97 + c.skill * 0.02;
  let want = base;
  if (inT) want = Math.min(want, Math.sqrt(K * c.r) * care);
  else { const vs = Math.sqrt(K * Math.min(c.r, Math.max(c.rT, c.laneIn))) * care; want = Math.min(want, Math.sqrt(vs * vs + 2 * 3.2 * Math.max(0, d - 8))); }
  // quem vai logo à frente na mesma raia
  let ahead = null, gap = 1e9;
  for (const o of cars) {
    if (o === c || o.done) continue;
    const ds = (o.u - c.u) * k;
    if (ds > 0 && (ds < 12 || (ds < 32 && o.v < c.v - 4)) && Math.abs(o.r - c.r) < WID + 0.5 && ds < gap) { gap = ds; ahead = o; } // (um carro parado na pista é visto de longe)
  }
  if (ahead && ahead.v < want - 0.1) {
    const opts = [ahead.r - 3.1, ahead.r + 3.1];
    if (!(inT || d < 45)) opts.sort((a, b) => Math.abs(a - c.r) - Math.abs(b - c.r));
    opts.push(ahead.r + 5.6, ahead.r - 5.6); // (e, se a raia ao lado estiver ocupada, uma mais longe)
    const stuck = c.v < 4 && gap < LEN + 3; // (parado atrás de alguém: só quem está bem ao lado impede de sair)
    const pick = opts.find((r) => laneFree(c, cars, T, r, stuck));
    if (pick !== undefined) c.rT = pick;
    else want = Math.min(want, ahead.v + (gap > LEN + 2 ? 0.4 : -0.3)); // sem espaço: fica na cola
  } else if (inT || d < 60) c.rT = c.laneIn;
  else if (Math.random() < dt * 0.2) c.rT = rr(8, 15);
  if (Math.abs(c.rT - c.r) > 0.3 && !laneFree(c, cars, T, c.rT, c.v < 4)) c.rT = c.r; // alguém do lado: segura a raia
  if (inT && Math.random() < dt * 0.5) c.laneIn = rr(8, 10.5);
  c.target = want; c.rate = want > c.v ? 0.7 : 1.6; c.decel = 0;
  const r0 = c.r; c.r += clamp((clamp(c.rT, RMIN, RMAX) - c.r) * Math.min(1, dt * 0.9), -dt * 4, dt * 4); c.rv = (c.r - r0) / Math.max(dt, 1e-4);
}

// o explorador conduz: inp = { up, down, left, right, whip } (whip: o chicote, só no aperto da tecla)
export function drivePlayer(c, inp, dt, ev) {
  c.stam = Math.min(1, c.stam + REGEN * dt);
  c.whipCd -= dt; c.whipT -= dt;
  if (c.tired && c.stam > 0.35) c.tired = false;
  if (c.done) { c.target = c.lead ? 6 : 3; c.rate = 0.6; c.decel = 0; c.rv = (RMAX - c.r) * 0.5; c.r += c.rv * dt; return; } // depois da chegada, ao passo, por fora
  if (c.crashT > 0) { c.target = 0; c.decel = 9; c.rv *= Math.max(0, 1 - dt * 4); return; }
  if (inp.whip && c.whipCd <= 0) {
    c.whipCd = 0.5;
    if (c.stam > 0.05) { c.whipT = WHIP_T; c.stam = Math.max(0, c.stam - WHIP_COST); if (c.stam < 0.12) c.tired = true; ev?.('whip', c); }
    else ev?.('tired', c);
  }
  const top = TOP * (c.tired ? 0.87 : 1);
  c.decel = 0;
  if (inp.down) { c.target = 0; c.decel = 8; }
  else if (c.whipT > 0) { c.target = WHIP * (c.tired ? 0.92 : 1); c.rate = 1.6; }
  else if (inp.up) { c.target = top; c.rate = c.v > top ? 0.9 : 0.55; }
  else { c.target = Math.min(top, 10); c.rate = 0.3; } // sem ser tocados, os cavalos seguem num trote largo
  // ← → : para dentro / para fora (a spina fica à esquerda). Devagar, o carro não desliza de lado tão rápido
  const steer = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), lat = Math.min(5, 0.35 * c.v + 0.6) * steer;
  c.rv += (lat - c.rv) * Math.min(1, dt * 6);
  c.r += c.rv * dt;
}

// movimento: velocidade, derrapagem nas metas, naufrágio (o carro roda e para), avanço na pista
export function stepCar(c, T, dt, ev) {
  c.hitCd -= dt;
  if (c.crashT > 0) {
    c.crashT -= dt;
    c.v = Math.max(0, c.v - 7 * dt); c.r = Math.min(RMAX + 0.8, c.r + c.v * 0.25 * dt);
    c.spin = Math.min(1.15, c.spin + dt * 2.2);
    if (c.crashT <= 0) { c.crashT = 0; ev?.('recover', c); }
  } else {
    if (c.decel) c.v = Math.max(c.target, c.v - c.decel * dt);
    else c.v += (c.target - c.v) * Math.min(1, c.rate * dt);
    c.spin = Math.max(0, c.spin - dt * 1.6);
    if (T.turn(c.u) && !c.done) {
      const e = c.v - Math.sqrt(K * c.r);
      if (e > 0.3) { // rápido demais para a raia: o carro escorrega para fora e perde velocidade
        c.r += e * 1.5 * dt; c.v -= e * 1.0 * dt; c.slip += (e - 0.3) * dt;
        const id = T.turnId(c.u); if (c.skidId !== id && e > 0.8) { c.skidId = id; ev?.('skid', c, e); }
        if (e > 4.2 || c.slip > 1.25) { c.crashT = 3.2; c.slip = 0; c.whipT = 0; ev?.('crash', c); }
      } else c.slip = Math.max(0, c.slip - dt * 0.6);
    } else c.slip = Math.max(0, c.slip - dt);
    c.v = Math.max(0, c.v);
    c.r = clamp(c.r, RMIN, RMAX);
  }
  c.u += (c.v * dt) / T.k(c.u, c.r);
}

// choques entre carros: lado a lado, as rodas se tocam e os dois se afastam; um atrás do outro, quem vem atrás
// bate na traseira e perde velocidade. Os que já cruzaram a chegada (por fora, devagar) só se chocam entre si.
export function collide(cars, T, ev) {
  for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
    const a = cars[i], b = cars[j];
    if (a.done !== b.done) continue;
    const k = T.k((a.u + b.u) / 2, (a.r + b.r) / 2), ds = (b.u - a.u) * k, dr = b.r - a.r;
    if (Math.abs(ds) >= LEN || Math.abs(dr) >= WID) continue;
    const ready = a.hitCd <= 0 && b.hitCd <= 0;
    if (Math.abs(ds) < LEN * 0.6) {
      const s = dr === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dr), push = (WID - Math.abs(dr)) / 2 + 0.06;
      a.r -= s * push; b.r += s * push;
      for (const [p, q] of [[a, b], [b, a]]) { // encostado na borda, o outro é que vai
        if (p.r < RMIN) { q.r += RMIN - p.r; p.r = RMIN; }
        if (p.r > RMAX) { q.r -= p.r - RMAX; p.r = RMAX; }
      }
      a.rv = -s * 1.5; b.rv = s * 1.5;
      if (!a.player) a.rT = a.r; if (!b.player) b.rT = b.r;
      if (ready) { a.v *= 0.94; b.v *= 0.94; a.hitCd = b.hitCd = 0.7; ev?.('bump', a, b); }
    } else {
      const back = ds > 0 ? a : b, front = back === a ? b : a, rel = back.v - front.v;
      back.u = front.u - LEN / k;
      if (rel > 0) {
        back.v = Math.max(0, front.v - Math.min(1.6, rel * 0.35));
        if (ready && rel > 2) { back.hitCd = front.hitCd = 0.7; front.v += Math.min(0.6, rel * 0.1); ev?.('ram', back, front); }
      }
    }
  }
}
