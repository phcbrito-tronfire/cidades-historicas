// Níveis de gráfico. O jogo foi feito num notebook com placa de vídeo dedicada, mas a maioria dos alunos joga em
// computadores com vídeo integrado (Intel/AMD no processador) ou no Chrome sem aceleração. Na primeira visita o nível
// é escolhido pela placa de vídeo; depois, se o jogo ficar lento, ele desce sozinho. A escolha fica guardada.
//   alto   — tudo ligado (placa dedicada)
//   leve   — sem oclusão de ambiente e sem brilho, sombra menor, resolução 1x, reflexo da água mais espaçado,
//            gente e objetos pequenos de longe somem antes (vídeo integrado, celular)
//   minimo — sombra pequena só em volta do jogador e resolução reduzida (navegador sem aceleração de vídeo)
import { isTouch } from './touch.js';

const KEY = 'ch-graficos';
export const LEVELS = ['alto', 'leve', 'minimo'];
export const PROFILE = {
  alto: { pr: 1.5, aa: true, shadow: 4096, shadowR: 140, soft: true, ao: true, bloom: true, refl: 512, reflEvery: 2, npcR: 60, px: 0 },
  leve: { pr: 1, aa: false, shadow: 2048, shadowR: 80, soft: false, ao: false, bloom: false, refl: 256, reflEvery: 4, npcR: 40, px: 10 },
  minimo: { pr: 0.7, aa: false, shadow: 512, shadowR: 45, soft: false, ao: false, bloom: false, refl: 128, reflEvery: 6, npcR: 30, px: 18 },
};

// nome da placa de vídeo (num contexto descartável, antes de criar o do jogo)
function gpuName() {
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return String(name || '');
  } catch (e) { return ''; }
}

// resolução do reflexo da água (lida pelo agua.js na hora de criar o mar e o Nilo)
export const QS = { refl: 512 };

export function detectQuality() {
  const gpu = gpuName();
  const software = /swiftshader|llvmpipe|softpipe|basic render|software/i.test(gpu);
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* navegação privada */ }
  if (saved && PROFILE[saved]) { QS.refl = PROFILE[saved].refl; return { level: saved, gpu, software, saved: true }; }
  let level;
  if (software) level = 'minimo';
  else if (isTouch) level = 'leve';
  else if (/nvidia|geforce|rtx|gtx|quadro|radeon (rx|pro)|apple m\d/i.test(gpu) && !/intel/i.test(gpu)) level = 'alto';
  else level = 'leve'; // Intel UHD/Iris, Radeon integrada, ou placa desconhecida
  if (level === 'alto' && navigator.deviceMemory && navigator.deviceMemory <= 4) level = 'leve';
  QS.refl = PROFILE[level].refl;
  return { level, gpu, software, saved: false };
}

export function saveQuality(level) { try { localStorage.setItem(KEY, level); } catch (e) { /* sem armazenamento */ } }
export const qualityLabel = (l) => ({ alto: 'alto', leve: 'leve', minimo: 'mínimo' }[l] || l);

// aplica um nível com o jogo rodando (o antialias e o tipo de sombra só mudam ao recarregar)
export function applyQuality(level, { renderer, sun, post, actors, cull }) {
  const P = PROFILE[level];
  renderer.setPixelRatio(Math.min(devicePixelRatio, P.pr));
  // a sombra nunca é desligada: isso obrigaria a recompilar todos os materiais (o jogo congelaria por segundos);
  // no mínimo ela só fica pequena e perto do jogador
  const c = sun.shadow.camera;
  if (sun.shadow.mapSize.x !== P.shadow) { sun.shadow.mapSize.set(P.shadow, P.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  c.left = -P.shadowR; c.right = P.shadowR; c.top = P.shadowR; c.bottom = -P.shadowR; c.updateProjectionMatrix();
  if (post) { if (post.ao) post.ao.enabled = P.ao; post.bloom.enabled = P.bloom; post.resize(); }
  if (actors) actors.viewR = P.npcR;
  if (cull) cull.set(P.px); // objetos pequenos e longe deixam de ser desenhados
  return P;
}

// vigia de lentidão: nos primeiros segundos de jogo mede o tempo médio do quadro; se passar do limite, desce um nível
export function slowWatch(onSlow) {
  let acc = 0, n = 0, warm = 2, big = 0;
  return (raw) => {
    // um quadro de mais de meio segundo sozinho é a aba voltando do segundo plano; vários seguidos é um computador
    // que não aguenta (ex.: navegador sem aceleração de vídeo)
    if (window.__noSlow) return; // testes no painel do app, que roda a ~1,5 fps
    if (raw > 0.5) { if (++big >= 3) { big = 0; onSlow(raw * 1000); } return; }
    big = 0;
    if (warm > 0) { warm -= raw; return; } // o começo sempre tem algum tranco
    acc += raw; n++;
    if (acc >= 4) { const ms = (acc / n) * 1000; acc = 0; n = 0; if (ms > 32) onSlow(ms); }
  };
}
