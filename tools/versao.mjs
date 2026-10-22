// Carimba uma versão nova em egito.html antes de publicar, para o navegador nunca usar arquivos antigos
// do cache: o mapa de importação aponta cada módulo de js/egito para "arquivo.js?v=<versão>", e os modelos
// 3D recebem o mesmo ?v= (util.js lê a versão da própria URL do módulo).
// Uso: node tools/versao.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const v = new Date().toISOString().slice(0, 16).replace(/\D/g, '') + '-' + execSync('git rev-parse --short HEAD').toString().trim();
const mods = readdirSync('js/egito').filter((f) => f.endsWith('.js')).sort();
const imports = {
  three: 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/',
  ...Object.fromEntries(mods.map((f) => [`./js/egito/${f}`, `./js/egito/${f}?v=${v}`])),
};
let html = readFileSync('egito.html', 'utf8');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/, `<script type="importmap">\n  ${JSON.stringify({ imports }, null, 2).replace(/\n/g, '\n  ')}\n  </script>`);
html = html.replace(/<script type="module" src="js\/egito\/main\.js[^"]*"><\/script>/, `<script type="module" src="js/egito/main.js?v=${v}"></script>`);
writeFileSync('egito.html', html);
console.log('versão', v);
