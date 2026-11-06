// Teste de computador fraco (ferramenta de desenvolvimento, não faz parte do jogo).
// Como rodar: numa pasta à parte, 'npm i puppeteer-core@23', copiar este arquivo para lá e, com o servidor local
// ligado (node serve.js, porta 8123): node fraco.mjs integrado egito atenas roma japao
// Perfis: semplaca (desenho por software, CPU 4x), integrado (placa real, CPU 4x, começa no leve),
// integradomin (idem, começando no mínimo), muitofraco (software, CPU 6x). Resultados: fraco_<perfil>.json e imagens.
// Emula um computador fraco: Edge controlado (sem janela), processador desacelerado e, no perfil "sem placa",
// a imagem desenhada por software (SwiftShader). Mede carregamento, quadros por segundo e o nível de gráfico que o
// jogo escolhe/desce sozinho. Uso: node fraco.mjs <perfil> <cidade...>
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const [profile = 'semplaca', ...cities] = process.argv.slice(2);
const P = {
  semplaca: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], cpu: 4, quality: null },
  integrado: { args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], cpu: 4, quality: 'leve' },
  integradomin: { args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], cpu: 4, quality: 'minimo' },
  muitofraco: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], cpu: 6, quality: null },
}[profile];
const SHOTS = process.env.SHOTS || '.';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--mute-audio', '--window-size=1366,768', '--autoplay-policy=user-gesture-required', ...P.args], defaultViewport: { width: 1366, height: 768 } });
const out = [];
for (const city of cities.length ? cities : ['egito', 'atenas', 'roma', 'japao']) {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  const cdp = await page.createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: P.cpu });
  await page.goto('http://localhost:8123/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate((q) => { localStorage.clear(); if (q) localStorage.setItem('ch-graficos', q); }, P.quality);
  const t0 = Date.now();
  await page.goto(`http://localhost:8123/${city}.html`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  try { await page.waitForFunction(() => document.querySelector('#intro:not([hidden])') || document.querySelector('#fallback:not([hidden])'), { timeout: 300000, polling: 1000 }); } catch (e) { out.push({ city, profile, erro: 'não carregou em 5 min' }); await page.close(); continue; }
  const loadS = (Date.now() - t0) / 1000;
  const fallback = await page.evaluate(() => document.querySelector('#fallback:not([hidden])')?.textContent?.trim().slice(0, 200));
  const gpu = await page.evaluate(() => { const c = document.createElement('canvas'), gl = c.getContext('webgl2'); const e = gl?.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER); });
  await page.evaluate(() => { AudioContext.prototype.resume = async () => {}; [...document.querySelectorAll('button')].find((b) => /explorar/.test(b.textContent))?.click(); });
  const fps = async (secs) => page.evaluate((secs) => new Promise((res) => { let n = 0, worst = 0, last = performance.now(); const t0 = last; const f = (now) => { n++; worst = Math.max(worst, now - last); last = now; if (now - t0 < secs * 1000) requestAnimationFrame(f); else res({ fps: +(n / ((now - t0) / 1000)).toFixed(1), piorQuadroMs: Math.round(worst) }); }; requestAnimationFrame(f); }), secs);
  await new Promise((r) => setTimeout(r, 8000)); // aquece (shaders, primeiro quadro) e deixa o vigia de lentidão agir
  const a = await fps(12);
  const q1 = await page.evaluate(() => localStorage.getItem('ch-graficos'));
  // um lugar movimentado de cada cidade
  const spot = { egito: [45, 0, -Math.PI / 2], roma: [9, -31, Math.PI], atenas: [-243, -250, 2.67], japao: null }[city];
  let b = null;
  if (spot) { await page.evaluate((s) => window.__game?.tp(s[0], s[1], s[2]), spot); await new Promise((r) => setTimeout(r, 6000)); b = await fps(12); }
  const q2 = await page.evaluate(() => localStorage.getItem('ch-graficos'));
  await page.screenshot({ path: `${SHOTS}/fraco_${profile}_${city}.jpg`, type: 'jpeg', quality: 70 });
  out.push({ city, profile, gpu, carregouEm: loadS + ' s', fallback, nivelInicio: q1, inicio: a, movimentado: b, nivelFinal: q2, erros: [...new Set(errors)].slice(0, 4) });
  console.log(JSON.stringify(out[out.length - 1]));
  await page.close();
}
await browser.close();
fs.writeFileSync(`${SHOTS}/fraco_${profile}.json`, JSON.stringify(out, null, 1));
