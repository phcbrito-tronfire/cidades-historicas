// Passos e cascos (Web Audio, gerados na hora, sem arquivos): baixinhos, só para o mundo não ficar mudo.
// O passo na terra é um baque abafado com o raspar da sola; no assoalho de madeira ou na laje, mais seco. O casco do
// cavalo é o "pocotó": um toque oco (a parede do casco) e um estalo curto; na terra, mais surdo; na água, um chape.
let NB = null;
function noise(ctx) {
  if (NB && NB.sampleRate === ctx.sampleRate) return NB;
  const len = Math.floor(ctx.sampleRate * 0.6); NB = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = NB.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return NB;
}
// um pedaço de ruído filtrado, com ataque rápido e queda exponencial
function hit(ctx, dest, t, type, f, q, dur, vol) {
  const s = ctx.createBufferSource(); s.buffer = noise(ctx);
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl).connect(g).connect(dest); s.start(t, Math.random() * 0.5, dur + 0.03);
}
// o corpo do toque: um tom grave que cai rápido
function knock(ctx, dest, t, f, dur, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.03);
}
const vary = () => 0.88 + Math.random() * 0.24;

// surface: 'earth' (terra, grama, cascalho) · 'wood' (assoalho, ponte, cais) · 'stone' (laje, calçada)
export function footstep(ctx, dest, { run = false, jump = false, surface = 'earth' } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + 0.005, k = run ? 1.45 : 1, r = vary();
  if (surface === 'wood') { knock(ctx, dest, t, 150 * r, 0.07, 0.055 * k); hit(ctx, dest, t, 'bandpass', 1100 * r, 1.6, 0.05, 0.03 * k); }
  else if (surface === 'stone') { hit(ctx, dest, t, 'lowpass', 700 * r, 0.7, 0.06, 0.05 * k); hit(ctx, dest, t, 'highpass', 2600 * r, 0.7, 0.035, 0.022 * k); }
  else { hit(ctx, dest, t, 'lowpass', 380 * r, 0.7, 0.1, 0.075 * k); hit(ctx, dest, t + 0.012, 'bandpass', 1700 * r, 0.8, run ? 0.07 : 0.1, 0.02 * k); } // (o baque e o raspar)
  if (jump) knock(ctx, dest, t, 95, 0.12, 0.07);
}
// andando com água pelas canelas
export function wadeStep(ctx, dest, { run = false } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + 0.005, r = vary(), k = run ? 1.4 : 1;
  hit(ctx, dest, t, 'bandpass', 800 * r, 0.9, 0.22, 0.05 * k); hit(ctx, dest, t + 0.03, 'bandpass', 1900 * r, 1.2, 0.14, 0.02 * k);
}
// um casco batendo no chão (vol já vem com a andadura e a distância)
export function hoof(ctx, dest, { vol = 1, surface = 'earth', wet = false } = {}) {
  if (!ctx || vol < 0.02) return;
  const t = ctx.currentTime + 0.005, r = vary();
  if (wet) { hit(ctx, dest, t, 'bandpass', 900 * r, 0.9, 0.2, 0.07 * vol); knock(ctx, dest, t, 120 * r, 0.08, 0.035 * vol); return; }
  if (surface === 'earth') { knock(ctx, dest, t, 175 * r, 0.085, 0.07 * vol); hit(ctx, dest, t, 'bandpass', 1150 * r, 1.6, 0.05, 0.035 * vol); hit(ctx, dest, t, 'lowpass', 450, 0.7, 0.08, 0.035 * vol); }
  else { knock(ctx, dest, t, 270 * r, 0.06, 0.06 * vol); hit(ctx, dest, t, 'bandpass', 2300 * r, 3, 0.035, 0.06 * vol); } // (na laje ou na madeira: o "pocotó" bem claro)
}
