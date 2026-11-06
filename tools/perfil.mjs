import fs from 'fs';
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const byId = new Map(p.nodes.map((n) => [n.id, n])), parent = new Map();
for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);
const name = (n) => `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop().split('?')[0]}:${n.callFrame.lineNumber + 1}`;
// janelas sem (idle) com mais de 300 ms
let t = 0, run = [], runT0 = 0, wins = [];
p.samples.forEach((id, i) => { const dt = p.timeDeltas[i] || 0; t += dt; const n = byId.get(id); const idle = /\(idle\)|\(garbage/.test(n.callFrame.functionName) && n.callFrame.functionName === '(idle)';
  if (!idle) { if (!run.length) runT0 = t; run.push([id, dt]); } else { const T = run.reduce((s, r) => s + r[1], 0); if (T > 300000) wins.push({ t0: runT0 / 1e6, ms: T / 1000, run }); run = []; } });
for (const w of wins) {
  const agg = new Map();
  for (const [id, dt] of w.run) { // pilha resumida: 4 níveis acima da folha, só arquivos do jogo/three
    let n = byId.get(id), chain = []; let k = 0; while (n && k < 14) { chain.push(name(n)); n = byId.get(parent.get(n.id)); k++; }
    const key = chain.filter((c) => !/^\(root\)|^\(program\)/.test(c)).slice(0, 7).join(' < ');
    agg.set(key, (agg.get(key) || 0) + dt);
  }
  console.log(`\n== janela em ${w.t0.toFixed(2)} s: ${w.ms.toFixed(0)} ms ocupada`);
  console.log([...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${(v / 1000).toFixed(0)}ms ${k}`).join('\n'));
}
