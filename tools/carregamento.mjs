// Mede o carregamento como o aluno vê na PRIMEIRA visita (ferramenta de desenvolvimento, não faz parte do jogo).
// Cada cidade abre num navegador novo, com cache e shaders zerados, placa de vídeo real e internet limitada.
// Como rodar: numa pasta à parte, 'npm i puppeteer-core@23' e copiar este arquivo para lá; depois
//   node carregamento.mjs <endereço> <mbps> <cpu> <cidade...>
//   ex.: node carregamento.mjs https://phcbrito-tronfire.github.io/cidades-historicas 20 1 egito atenas roma japao
// Com NIVEL=leve no ambiente, abre já nesse nível de gráficos (o de um computador com vídeo integrado).
// Com "--2" no fim, abre a mesma cidade de novo no mesmo navegador (segunda visita, com cache).
// Resultado: segundos até a tela de entrada, tempo por etapa, travamentos, programas de shader e bytes baixados.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const argv = process.argv.slice(2), twice = argv.includes('--2'), a = argv.filter((x) => x !== '--2');
const [base = 'http://localhost:8123', mbps = '20', cpu = '1', ...cities] = a;

const PROBE = () => {
  const m = (window.__m = { steps: [], long: [], gl: {} });
  addEventListener('DOMContentLoaded', () => {
    const add = () => m.steps.push([Math.round(performance.now()), document.getElementById('load-fill')?.style.width, document.getElementById('load-step')?.textContent]);
    const s = document.getElementById('load-step'); if (s) new MutationObserver(add).observe(s, { childList: true, characterData: true, subtree: true });
    const f = document.getElementById('load-fill'); if (f) new MutationObserver(add).observe(f, { attributes: true });
    add();
  });
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) m.long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch (e) { /* */ }
  const P = WebGL2RenderingContext.prototype;
  for (const n of ['linkProgram', 'getProgramInfoLog', 'getShaderInfoLog', 'getProgramParameter', 'texSubImage2D', 'texImage2D', 'bufferData']) {
    const o = P[n], st = (m.gl[n] = { n: 0, ms: 0 });
    P[n] = function (...args) { const t = performance.now(), r = o.apply(this, args); st.n++; st.ms += performance.now() - t; return r; };
  }
};

async function visit(browser, city, label) {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: +cpu });
  await cdp.send('Network.enable');
  if (+mbps > 0) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: (+mbps * 1e6) / 8, uploadThroughput: 2e6 / 8 });
  await page.evaluateOnNewDocument(PROBE);
  if (process.env.NIVEL) await page.evaluateOnNewDocument((q) => { localStorage.setItem('ch-graficos', q); }, process.env.NIVEL);
  await page.goto(`${base}/${city}.html`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  try { await page.waitForFunction(() => document.querySelector('#intro:not([hidden])') || document.querySelector('#fallback:not([hidden])'), { timeout: 420000, polling: 500 }); } catch (e) { errors.push('não carregou em 7 min'); }
  const r = await page.evaluate(() => {
    const m = window.__m, seen = new Set(), g = window.__game, cat = (u) => (u.includes('assets/textures') ? 'texturas' : u.includes('.glb') ? 'modelos' : u.includes('jsdelivr') ? 'three' : u.includes('/js/') ? 'js' : 'outros');
    const by = {}; for (const e of performance.getEntriesByType('resource')) { const c = cat(e.name), b = (by[c] ??= { n: 0, mb: 0, fim: 0 }); b.n++; b.mb += e.transferSize / 1048576; b.fim = Math.max(b.fim, e.responseEnd / 1000); }
    for (const b of Object.values(by)) { b.mb = +b.mb.toFixed(1); b.fim = +b.fim.toFixed(1); }
    const steps = m.steps.filter((s) => s[2] && !seen.has(s[2]) && seen.add(s[2])).map((s) => [+(s[0] / 1000).toFixed(1), s[1], s[2]]);
    return {
      total: +(performance.now() / 1000).toFixed(1), steps,
      travas: m.long.filter((l) => l[1] > 400).map((l) => [+(l[0] / 1000).toFixed(1), +(l[1] / 1000).toFixed(1)]),
      gl: Object.fromEntries(Object.entries(m.gl).map(([k, v]) => [k, [v.n, Math.round(v.ms)]])),
      programas: g?.renderer?.info?.programs?.length, baixado: by, nivel: localStorage.getItem('ch-graficos'), fallback: document.querySelector('#fallback:not([hidden])')?.textContent?.trim().slice(0, 120),
    };
  });
  await page.close();
  return { city, label, ...r, errors };
}

const out = [];
for (const city of cities.length ? cities : ['egito', 'atenas', 'roma', 'japao']) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ch-carga-'));
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', userDataDir: dir, args: ['--mute-audio', '--window-size=1366,768', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=user-gesture-required'], defaultViewport: { width: 1366, height: 768 } });
  const first = await visit(browser, city, '1ª visita'); out.push(first); console.log(JSON.stringify(first));
  if (twice) { const second = await visit(browser, city, '2ª visita'); out.push(second); console.log(JSON.stringify(second)); }
  await browser.close();
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* */ }
}
fs.writeFileSync('carregamento.json', JSON.stringify(out, null, 1));
console.log('\nRESUMO'); for (const o of out) console.log(`${o.city} ${o.label}: ${o.total} s · ${o.programas} programas · ${Object.values(o.baixado).reduce((s, b) => s + b.mb, 0).toFixed(1)} MB · maior trava ${Math.max(0, ...o.travas.map((t) => t[1]))} s${o.errors.length ? ' · ERROS: ' + o.errors.join(' | ') : ''}`);
