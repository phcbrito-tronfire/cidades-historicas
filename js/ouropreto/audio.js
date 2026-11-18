// Som ambiente de Vila Rica gerado na hora (Web Audio): vento das serras, a água dos córregos, cigarras de dia, grilos
// à noite, pássaros, os sinos das igrejas de vez em quando e, bem baixinho no fundo, uma viola de dez cordas tocando
// solta, em terças (o jeito mineiro de pontear) — nada de melodia pronta: frases curtas e pausas longas
import { footstep, wadeStep, hoof } from '../comum/passos.js';
export class AudioFX {
  constructor() { this.ctx = null; this.enabled = true; this.musicOn = true; }

  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(ctx.destination);
    const noise = (type) => {
      const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
      }
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s;
    };
    // vento
    const wind = noise('brown'), wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 500;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0.07;
    wind.connect(wf).connect(this.windGain).connect(this.master);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 0.035; lfo.connect(lg).connect(this.windGain.gain); lfo.start();
    // água
    const water = noise('white'), bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 900; bf.Q.value = 0.6;
    this.waterGain = ctx.createGain(); this.waterGain.gain.value = 0;
    water.connect(bf).connect(this.waterGain).connect(this.master);
    // grilos (noite)
    this.cricketGain = ctx.createGain(); this.cricketGain.gain.value = 0; this.cricketGain.connect(this.master);
    const cr = ctx.createOscillator(); cr.frequency.value = 4400; const crA = ctx.createGain(); crA.gain.value = 0;
    const crL = ctx.createOscillator(); crL.type = 'square'; crL.frequency.value = 14; const crLg = ctx.createGain(); crLg.gain.value = 0.04;
    crL.connect(crLg).connect(crA.gain); cr.connect(crA).connect(this.cricketGain); cr.start(); crL.start();
    // multidão do mercado
    const crowd = noise('white'), cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 450; cf.Q.value = 1.4;
    this.crowdGain = ctx.createGain(); this.crowdGain.gain.value = 0;
    crowd.connect(cf).connect(this.crowdGain).connect(this.master);
    // ondas quebrando na praia: ruído grave que sobe e desce a cada ~7 s
    const surf = noise('brown'), sf = ctx.createBiquadFilter(); sf.type = 'lowpass'; sf.frequency.value = 700;
    this.surfGain = ctx.createGain(); this.surfGain.gain.value = 0;
    const swell = ctx.createGain(); swell.gain.value = 0.5;
    const sl = ctx.createOscillator(), slg = ctx.createGain(); sl.frequency.value = 0.14; slg.gain.value = 0.45; sl.connect(slg).connect(swell.gain); sl.start();
    surf.connect(sf).connect(swell).connect(this.surfGain).connect(this.master);
    // cigarras do verão ático (de dia)
    this.cicadaGain = ctx.createGain(); this.cicadaGain.gain.value = 0; this.cicadaGain.connect(this.master);
    const ci = noise('white'), cbf = ctx.createBiquadFilter(); cbf.type = 'bandpass'; cbf.frequency.value = 5200; cbf.Q.value = 8;
    const cam = ctx.createGain(); cam.gain.value = 0.5; const cl = ctx.createOscillator(); cl.type = 'square'; cl.frequency.value = 38; const clg = ctx.createGain(); clg.gain.value = 0.5; cl.connect(clg).connect(cam.gain); cl.start();
    ci.connect(cbf).connect(cam).connect(this.cicadaGain);
    this.musicGain = ctx.createGain(); this.musicGain.gain.value = 0.2; this.musicGain.connect(this.master);
    this.nextNote = ctx.currentTime + 2; this.nextBird = ctx.currentTime + 3;
  }

  setEnabled(on) { this.enabled = on; if (this.master) this.master.gain.value = on ? 0.8 : 0; }
  setMusic(on) { this.musicOn = on; if (this.musicGain) this.musicGain.gain.value = on ? 0.2 : 0; }

  // viola: corda de aço dobrada (cada par afinado junto, um pouco desencontrado — o brilho característico), ataque de
  // dedo e o corpo de madeira que segura o som
  pluck(freq, time, vol = 0.5) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = freq; o2.type = 'sawtooth'; o2.frequency.value = freq * 1.004;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(freq * 9, time); lp.frequency.exponentialRampToValueAtTime(freq * 2.6, time + 0.9); lp.Q.value = 0.9;
    g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(vol, time + 0.004); g.gain.exponentialRampToValueAtTime(vol * 0.35, time + 0.3); g.gain.exponentialRampToValueAtTime(0.001, time + 2.6);
    const g2 = ctx.createGain(); g2.gain.value = 0.6;
    o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g); g.connect(this.musicGain);
    o.start(time); o2.start(time); o.stop(time + 2.7); o2.stop(time + 2.7);
  }
  // sino de igreja, de longe: a nota grave, os parciais desafinados do bronze e o zumbido que fica
  bell(vol = 0.05, f = 196) {
    if (!this.ctx) return; const ctx = this.ctx, now = ctx.currentTime;
    for (const [m, a, d] of [[0.5, 0.5, 6], [1, 1, 4.5], [1.19, 0.5, 3], [1.5, 0.35, 2.4], [2, 0.3, 2], [2.66, 0.15, 1.4]]) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f * m;
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(vol * a, now + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, now + d);
      o.connect(g).connect(this.master); o.start(now); o.stop(now + d + 0.1);
    }
  }

  update(dt, { nearWater, night, market, sea = 0 }) {
    if (!this.ctx) return;
    const ctx = this.ctx, now = ctx.currentTime;
    const k = Math.min(1, dt * 2);
    this.waterGain.gain.value += ((nearWater ? 0.12 * nearWater : 0) - this.waterGain.gain.value) * k;
    const SI = [0.8, 0.7]; // (fevereiro: verão das chuvas em Minas, cigarras de dia e grilos à noite)
    this.cricketGain.gain.value += ((night ? 0.05 * SI[1] : 0) - this.cricketGain.gain.value) * k;
    this.crowdGain.gain.value += ((market ? 0.09 * market : 0) - this.crowdGain.gain.value) * k;
    this.surfGain.gain.value += (0.22 * sea - this.surfGain.gain.value) * k;
    this.cicadaGain.gain.value += ((night ? 0 : 0.016 * (1 - sea) * SI[0]) - this.cicadaGain.gain.value) * k;
    this.windGain.gain.value = Math.max(0.02, this.windGain.gain.value);
    if (this.musicOn && now > this.nextNote) {
      // ré maior com a sétima abaixada às vezes (o modo das modas de viola); cada nota sai com a terça de cima junto
      const scale = [293.7, 329.6, 370, 392, 440, 493.9, 523.3, 587.3, 659.3, 740];
      let k = 1 + Math.floor(Math.random() * 5); const n = Math.random() < 0.3 ? 2 : Math.random() < 0.7 ? 3 : 4;
      for (let i = 0; i < n; i++) { const t0 = now + i * (0.36 + Math.random() * 0.18), a = scale[Math.max(0, Math.min(scale.length - 3, k))], b = scale[Math.max(0, Math.min(scale.length - 1, k + 2))];
        this.pluck(a, t0, 0.22); this.pluck(b, t0 + 0.012, 0.16); k -= Math.random() < 0.65 ? 1 : -1; }
      this.nextNote = now + 2.6 + Math.random() * 3;
      if (Math.random() < 0.2) this.nextNote += 4 + Math.random() * 4; // as pausas longas são metade da música
    }
    // os sinos: de tempos em tempos uma igreja toca (três a cinco badaladas, longe)
    if (now > (this.nextBell ??= now + 25)) { const f = [196, 220, 174.6, 233.1][Math.floor(Math.random() * 4)], n = 3 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) setTimeout(() => this.bell(night ? 0.03 : 0.045, f), i * 2200); this.nextBell = now + 70 + Math.random() * 80; }
    if (!night && now > this.nextBird && sea > 0.3 && Math.random() < 0.5) { // gaivota: grito que desce
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth';
      const f = 1500 + Math.random() * 500;
      o.frequency.setValueAtTime(f, now); o.frequency.exponentialRampToValueAtTime(f * 0.55, now + 0.35);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 3;
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.025, now + 0.04); g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      o.connect(bp).connect(g).connect(this.master); o.start(now); o.stop(now + 0.45);
      this.nextBird = now + 2 + Math.random() * 6;
    } else if (!night && now > this.nextBird) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      const f = 2200 + Math.random() * 1800;
      o.frequency.setValueAtTime(f, now); o.frequency.exponentialRampToValueAtTime(f * 1.4, now + 0.08); o.frequency.exponentialRampToValueAtTime(f * 0.9, now + 0.16);
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.03, now + 0.02); g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      o.connect(g).connect(this.master); o.start(now); o.stop(now + 0.25);
      this.nextBird = now + 1 + Math.random() * 6;
    }
  }

  tone(freqs, dur = 0.6, type = 'sine', vol = 0.18) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    freqs.forEach((f, i) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = f;
      const t0 = now + i * 0.09;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g).connect(this.master); o.start(t0); o.stop(t0 + dur + 0.05);
    });
  }
  chime() { this.tone([587, 740, 880, 1175], 1.2, 'triangle', 0.16); }
  coin() { this.tone([1320, 1760, 2093], 0.5, 'sine', 0.14); }
  pickup() { this.tone([440, 660], 0.18, 'triangle', 0.12); }
  drop() { this.tone([330, 220], 0.2, 'triangle', 0.1); }
  talk() { this.tone([392], 0.12, 'triangle', 0.07); }
  swoosh() { this.burst(0.25, 1800, 0.18); }
  ring(freqs, dur, vol, type = 'sine') { if (!this.ctx) return; const now = this.ctx.currentTime; for (const f of freqs) { const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.0008, now + dur); o.connect(g).connect(this.master); o.start(now); o.stop(now + dur + 0.05); } }
  clang() { this.burst(0.03, 9000, 0.3); this.ring([2380, 3170, 4410, 5960], 0.7, 0.05); }
  fall() { this.burst(0.45, 360, 0.4); this.burst(1.1, 2800, 0.07); }
  splash() { this.burst(0.7, 700, 0.35); }
  step(jump, run, surface) { footstep(this.ctx, this.master, { jump, run, surface }); } // (surface: 'stone' no pé de moleque e nas pontes, 'earth' no resto)
  wade(run) { wadeStep(this.ctx, this.master, { run }); }
  hoof(o) { hoof(this.ctx, this.master, { ...o, surface: o.surface === 'hard' ? 'wood' : 'earth' }); }
  burst(dur, freq, vol) {
    if (!this.ctx) return;
    const ctx = this.ctx, now = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(this.master); s.start(now);
  }
}
