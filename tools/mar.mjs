// Mede travamentos perto da água: acha a água mais perto do início, põe o explorador em terra a ~30 m, anda para
// dentro d'água (setas de verdade), nada, mergulha. Grava a duração de cada quadro e um perfil de CPU.
// Uso: node mar.mjs <cidade> [cpu]   (cpu = fator de lentidão, padrão 1)
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const [city = 'atenas', cpuArg = '1', prof = '1'] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--mute-audio', '--window-size=1366,768', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], defaultViewport: { width: 1366, height: 768 } });
const page = await browser.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
const cdp = await page.createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +cpuArg });
await page.goto('http://localhost:8123/index.html'); await page.evaluate((q) => { localStorage.clear(); if (q) localStorage.setItem('ch-graficos', q); }, process.env.Q || null);
await page.goto(`http://localhost:8123/${city}.html`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.querySelector('#intro:not([hidden])'), { timeout: 300000, polling: 1000 });
await page.evaluate(() => { AudioContext.prototype.resume = async () => {}; [...document.querySelectorAll('button')].find((b) => /explorar/.test(b.textContent))?.click(); });
await new Promise((r) => setTimeout(r, 6000));
// acha água funda perto do início
const plan = await page.evaluate(async () => {
  const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /comum\/collision\.js/.test(n));
  const C = await import(url); const g = window.__game, P = g.player.pos;
  let best = null;
  for (let r = 10; r < 900 && !best; r += 10) for (let a = 0; a < 6.283; a += 0.1) {
    const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
    if (C.waterAt(x, z) - C.terrainAt(x, z) > 4) { best = { x, z, a }; break; }
  }
  if (!best) return null;
  // volta pela mesma linha até a beira (água rasa), e mais 8 m de praia se estiver livre
  let lx = best.x, lz = best.z;
  for (let k = 0; k < 600; k++) { lx -= Math.cos(best.a) * 0.5; lz -= Math.sin(best.a) * 0.5; if (C.waterAt(lx, lz) - C.terrainAt(lx, lz) < 0.2) break; }
  for (let k = 0; k < 8; k++) { const nx = lx - Math.cos(best.a), nz = lz - Math.sin(best.a); if (C.blocked(nx, nz, C.terrainAt(nx, nz))) break; lx = nx; lz = nz; }
  const yaw = Math.atan2(best.x - lx, best.z - lz);
  g.tp(lx, lz, yaw);
  return { land: [lx, lz], water: [best.x, best.z] };
});
console.log(city, JSON.stringify(plan));
await new Promise((r) => setTimeout(r, 4000));
// liga a gravação de quadros
await page.evaluate(() => { window.__ft = []; window.__p0 = new Set(window.__game.renderer.info.programs.map((p) => p.id)); let last = performance.now(); const f = (now) => { { const P = window.__game.renderer.info.programs; if (P.length !== (window.__pl || 0)) { (window.__pt = window.__pt || []).push([now, P.filter((p) => !window.__p0.has(p.id) && !(window.__pseen || (window.__pseen = new Set())).has(p.id)).map((p) => (window.__pseen.add(p.id), p.id))]); window.__pl = P.length; } } window.__ft.push([now, now - last, window.__game.player.swimming ? 1 : 0, window.__game.player.diving ? 1 : 0, window.__game.renderer.info.programs.length]); last = now; requestAnimationFrame(f); }; requestAnimationFrame(f); });
if (prof === '1') { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); }
// câmera atrás do explorador olhando para a água: anda reto (setas) por 14 s, nada, mergulha 5 s, sobe, nada mais
await page.keyboard.down('ArrowUp');
await new Promise((r) => setTimeout(r, 14000));
await page.keyboard.down('Space'); await new Promise((r) => setTimeout(r, 5000)); await page.keyboard.up('Space');
await new Promise((r) => setTimeout(r, 5000));
await page.keyboard.up('ArrowUp');
let profile = null; if (prof === '1') profile = (await cdp.send('Profiler.stop')).profile;
const ft = await page.evaluate(() => window.__ft);
const progs = await page.evaluate(() => { const g = window.__game, R = g.renderer, out = []; const newP = R.info.programs.filter((p) => !window.__p0.has(p.id)); const seen = new Map(); g.scene.traverse((o) => { if (!o.material) return; for (const m of [].concat(o.material, o.customDepthMaterial || [])) { const pr = R.properties.get(m); for (const p of newP) { if (pr.currentProgram === p || (pr.programs && [...pr.programs.values()].includes(p))) { const path = []; let q = o; for (let k = 0; k < 4 && q; k++) { path.push(q.name || q.type); q = q.parent; } const key = p.id + ':' + m.type + ':' + (m.name || '') + ' @ ' + path.join('<') + (m.onBeforeCompile && m.onBeforeCompile.toString().length > 30 ? ' [obc]' : '') + (m.isShaderMaterial ? ' [shader]' : ''); seen.set(key, 1); } } } }); return [...seen.keys()].slice(0, 60).concat(newP.map((p) => 'prog ' + p.id + ' ' + p.name + ' len' + p.cacheKey.length)); });
const t00 = ft[0][0]; const comp = []; for (let i = 1; i < ft.length; i++) if (ft[i][4] !== ft[i - 1][4]) comp.push([+((ft[i][0] - t00) / 1000).toFixed(2), ft[i][4] - ft[i - 1][4], Math.round(ft[i][1]), ft[i][2], ft[i][3]]);
console.log('compilações', JSON.stringify(comp)); console.log('ids por tempo', JSON.stringify(await page.evaluate(() => (window.__pt || []).map(([t, ids]) => [+((t - window.__ft[0][0]) / 1000).toFixed(2), ids])))); fs.writeFileSync('progs_'+city+'.json', JSON.stringify(await page.evaluate(() => window.__game.renderer.info.programs.map((p) => ({ id: p.id, name: p.name, key: p.cacheKey })))));
const t0 = ft[0][0], spikes = ft.filter((f) => f[1] > 50).map((f) => [+((f[0] - t0) / 1000).toFixed(2), Math.round(f[1]), f[2], f[3]]);
const avg = ft.reduce((s, f) => s + f[1], 0) / ft.length;
console.log(JSON.stringify({ city, frames: ft.length, avgMs: +avg.toFixed(1), spikes: spikes.slice(0, 40), nSpikes: spikes.length, errors }));
await page.screenshot({ path: `mar_${city}.jpg`, type: 'jpeg', quality: 60 });
if (profile) {
  // tempo próprio por função (amostras), as 25 maiores
  const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dts = profile.timeDeltas; profile.samples.forEach((id, i) => { const n = byId.get(id), cf = n.callFrame; const k = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop().split('?')[0]}:${cf.lineNumber + 1}`; self.set(k, (self.get(k) || 0) + (dts[i] || 0)); });
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${(v / 1000).toFixed(0)}ms ${k}`);
  console.log(top.join('\n'));
  fs.writeFileSync(`mar_${city}.cpuprofile`, JSON.stringify(profile));
}
await browser.close();
