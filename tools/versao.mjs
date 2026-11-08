// Carimba uma versão nova nas páginas das cidades antes de publicar, para o navegador nunca usar arquivos antigos
// do cache: o mapa de importação aponta cada módulo de js/<pasta> para "arquivo.js?v=<versão>".
// Os modelos 3D têm carimbo próprio (o resumo do conteúdo de assets/models, no &m= do util.js, que util.js lê da
// própria URL): publicar só código não obriga o aluno a baixar de novo os ~20 MB de modelos.
// Cada página ganha também a lista de módulos dela (modulepreload): o navegador pede tudo de uma vez, em vez de só
// descobrir o próximo arquivo depois de receber o anterior (eram ~5 s de espera antes de a barra sair do zero).
// Todas as páginas recebem o mapa de todas as pastas: os módulos de js/comum são os mesmos nas duas cidades.
// Uso: node tools/versao.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, dirname, posix } from 'node:path';

const v = new Date().toISOString().slice(0, 16).replace(/\D/g, '') + '-' + execSync('git rev-parse --short HEAD').toString().trim();

const hash = createHash('sha1');
const walk = (d) => { for (const f of readdirSync(d).sort()) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else { hash.update(p.replace(/\\/g, '/')); hash.update(readFileSync(p)); } } };
walk('assets/models');
const models = hash.digest('hex').slice(0, 10);

const THREE = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', ADDONS = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/';
const dirs = readdirSync('js').filter((d) => statSync('js/' + d).isDirectory()).sort();
const imports = { three: THREE, 'three/addons/': ADDONS };
for (const d of dirs) for (const f of readdirSync('js/' + d).filter((f) => f.endsWith('.js')).sort()) imports[`./js/${d}/${f}`] = `./js/${d}/${f}?v=${v}${d === 'comum' && f === 'util.js' ? '&m=' + models : ''}`;

// as dependências de um arquivo: import/export ... from '...', import '...' e import('three/addons/...') (o GTAO)
const DEPS = /\b(?:import|export)\s+[^'"();]*?from\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\bimport\(\s*['"](three\/addons\/[^'"]+)['"]\s*\)/g;
const depsOf = (src) => [...src.matchAll(DEPS)].map((m) => m[1] || m[2] || m[3]);
const remote = new Map(); // url → dependências (o three vem da CDN: lido uma vez só)
async function remoteDeps(url) {
  if (remote.has(url)) return remote.get(url);
  let deps = [];
  try { const r = await fetch(url); if (r.ok) deps = depsOf(await r.text()); } catch (e) { console.warn('sem acesso a', url); }
  remote.set(url, deps); return deps;
}
const toThree = (s, from) => (s === 'three' ? THREE : s.startsWith('three/addons/') ? ADDONS + s.slice(13) : s.startsWith('.') && from ? new URL(s, from).href : null);
async function preloads(entry) {
  const seen = new Set(), out = [];
  const visit = async (id, isRemote) => {
    if (seen.has(id)) return; seen.add(id);
    if (isRemote) {
      out.push(id);
      for (const s of await remoteDeps(id)) { const u = toThree(s, id); if (u) await visit(u, true); }
      return;
    }
    if (!existsSync(id)) return;
    const mapped = imports['./' + id]; if (mapped) out.push(mapped.slice(2));
    for (const s of depsOf(readFileSync(id, 'utf8'))) {
      if (s === 'three' || s.startsWith('three/addons/')) await visit(toThree(s), true);
      else if (s.startsWith('.')) await visit(posix.normalize(posix.join(dirname(id).replace(/\\/g, '/'), s)), false);
    }
  };
  await visit(entry, false);
  return out;
}

for (const page of ['egito.html', 'atenas.html', 'roma.html', 'japao.html']) {
  if (!existsSync(page)) continue;
  let html = readFileSync(page, 'utf8');
  html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/, `<script type="importmap">\n  ${JSON.stringify({ imports }, null, 2).replace(/\n/g, '\n  ')}\n  </script>`);
  html = html.replace(/<script type="module" src="js\/([a-z]+)\/main\.js[^"]*"><\/script>/, (_, d) => `<script type="module" src="js/${d}/main.js?v=${v}"></script>`);
  const city = page.replace('.html', ''), list = await preloads(`js/${city}/main.js`);
  const links = list.map((u) => `  <link rel="modulepreload" href="${u}">`).join('\n');
  html = html.replace(/\n?\s*<!-- modulepreload -->[\s\S]*?<!-- \/modulepreload -->/, '');
  html = html.replace(/(<script type="importmap">[\s\S]*?<\/script>)/, `$1\n  <!-- modulepreload -->\n${links}\n  <!-- /modulepreload -->`);
  writeFileSync(page, html);
  console.log(page, list.length, 'módulos');
}
console.log('versão', v, '· modelos', models);
