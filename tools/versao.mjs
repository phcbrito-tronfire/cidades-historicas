// Carimba uma versão nova nas páginas das cidades antes de publicar, para o navegador nunca usar arquivos antigos
// do cache: o mapa de importação aponta cada módulo de js/<pasta> para "arquivo.js?v=<versão>", e os modelos
// 3D recebem o mesmo ?v= (util.js lê a versão da própria URL do módulo).
// Todas as páginas recebem o mapa de todas as pastas: os módulos de js/comum são os mesmos nas duas cidades.
// Uso: node tools/versao.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';

const v = new Date().toISOString().slice(0, 16).replace(/\D/g, '') + '-' + execSync('git rev-parse --short HEAD').toString().trim();
const dirs = readdirSync('js').filter((d) => statSync('js/' + d).isDirectory()).sort();
const imports = {
  three: 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/',
};
for (const d of dirs) for (const f of readdirSync('js/' + d).filter((f) => f.endsWith('.js')).sort()) imports[`./js/${d}/${f}`] = `./js/${d}/${f}?v=${v}`;
for (const page of ['egito.html', 'atenas.html']) {
  if (!existsSync(page)) continue;
  let html = readFileSync(page, 'utf8');
  html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/, `<script type="importmap">\n  ${JSON.stringify({ imports }, null, 2).replace(/\n/g, '\n  ')}\n  </script>`);
  html = html.replace(/<script type="module" src="js\/([a-z]+)\/main\.js[^"]*"><\/script>/, (_, d) => `<script type="module" src="js/${d}/main.js?v=${v}"></script>`);
  writeFileSync(page, html);
}
console.log('versão', v);
