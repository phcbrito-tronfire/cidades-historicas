// A voz das feras: gravações de verdade (Wikimedia Commons — domínio público, e um grunhido de porco CC BY 3.0),
// recortadas em trechos curtos. O som vem do lugar do bicho: mais baixo de longe, para o lado de onde ele está, e cada
// vez com um tom um pouco diferente, para dois rugidos seguidos não soarem iguais.
import { ver } from './util.js';

const DIR = 'assets/sons/feras/';
// arquivos de cada voz e o tom (o leopardo usa o tigre mais agudo; o javali, o grunhido mais grave)
const VOZ = {
  leao: { f: 'leao', n: 4 }, tigre: { f: 'tigre', n: 4 }, urso: { f: 'urso', n: 4 }, touro: { f: 'touro', n: 4 },
  elefante: { f: 'elefante', n: 3 }, rino: { f: 'rino', n: 4 }, hipo: { f: 'hipo', n: 4 }, crocodilo: { f: 'croc', n: 4 },
  javali: { f: 'javali', n: 1, rate: 0.82 },
};
const bufs = {}; // promessas de AudioBuffer por arquivo

export class SonsFeras {
  // audio: o AudioFX da cidade (precisa de .ctx e .master quando o som já começou); ouvinte: () => ({ pos, yaw })
  constructor(audio, ouvinte) { this.audio = audio; this.ouvinte = ouvinte; this.last = {}; }
  load(file) {
    const ctx = this.audio?.ctx; if (!ctx) return null;
    return (bufs[file] ??= fetch(ver(DIR + file + '.mp3')).then((r) => r.arrayBuffer()).then((b) => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no))).catch(() => null));
  }
  // toca a voz da fera em pos; vol 0..1; quem: chave para não repetir a mesma fera em menos de 'gap' s
  async voz(kind, pos, { vol = 1, quem = null, gap = 0.8, rate = 1 } = {}) {
    const V = VOZ[kind]; const A = this.audio; if (!V || !A?.ctx || !A.master || A.enabled === false) return;
    const now = A.ctx.currentTime; if (quem && this.last[quem] > now - gap) return; if (quem) this.last[quem] = now;
    const L = this.ouvinte(); const dx = pos.x - L.pos.x, dz = pos.z - L.pos.z, d = Math.hypot(dx, dz);
    const g = vol * Math.min(1, 9 / (d + 3)) * (d > 140 ? 0 : 1); if (g < 0.02) return;
    const b = await this.load(`${V.f}_${1 + Math.floor(Math.random() * V.n)}`); if (!b) return;
    const ctx = A.ctx, src = ctx.createBufferSource(); src.buffer = b; src.playbackRate.value = (V.rate || 1) * rate * (0.93 + Math.random() * 0.14);
    const gain = ctx.createGain(); gain.gain.value = g * 0.9;
    let node = src.connect(gain);
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); const rx = Math.cos(L.yaw), rz = -Math.sin(L.yaw); p.pan.value = Math.max(-0.85, Math.min(0.85, (dx * rx + dz * rz) / Math.max(4, d))); node = node.connect(p); }
    // de longe, o som chega mais abafado
    if (d > 25) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(700, 6000 - d * 40); node = node.connect(lp); }
    node.connect(A.master); src.start();
  }
}
