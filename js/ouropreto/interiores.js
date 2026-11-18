// Os interiores de Vila Rica (Etapa 4). O que havia em 1789, segundo os estudos do barroco mineiro:
// - nas igrejas, a TALHA DOURADA: madeira entalhada (cedro) coberta de folha de ouro — os retábulos (o altar-mor no fundo
//   da capela-mor, com o trono em degraus para a imagem do orago; os colaterais junto do arco-cruzeiro; os laterais da
//   nave), com as colunas torsas (salomônicas) do estilo joanino da primeira metade do século; os púlpitos com o
//   tapa-voz; o coro sobre a entrada; o forro de tábuas pintado (em gamela na nave, em berço na capela-mor); a grade de
//   comunhão; e o chão de tábuas sobre as sepulturas numeradas — os mortos eram enterrados dentro das igrejas, cada
//   irmandade cuidando das suas covas. Não havia bancos: o povo assistia de pé ou ajoelhado (as mulheres em esteiras).
// - nas casas, pouca mobília: a mesa com os bancos, a arca, o oratório da família, o catre com o colchão de palha, o
//   fogão de lenha na cozinha com as panelas de pedra-sabão e o pote d'água.
// - na Casa da Ópera, o palco com a boca de cena, a plateia e os camarotes em dois andares, iluminados por velas.
import * as THREE from 'three';
import { toTexture } from './textures.js';
import { mulberry32 } from '../comum/util.js';

const R = mulberry32(1733);
const cv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
const V2 = THREE.Vector2;
const lathe = (pts, seg = 16) => new THREE.LatheGeometry(pts.map(([r, y]) => new V2(r, y)), seg);

// ---------------- texturas ----------------
// a talha: folhas de acanto enroladas em C e em S, conchas e flores, em relevo (a cor e o relevo saem do mesmo desenho)
function talhaCanvas(gray) {
  // (folhas de acanto miúdas em volutas, entalhadas: cada folha com o lado iluminado, o lado na sombra e o fundo escuro
  //  e fundo entre elas — o desenho repete sem emenda)
  const R2 = mulberry32(17);
  return cv(512, 512, (x, W, H) => {
    x.fillStyle = gray ? '#303030' : '#7a5a1c'; x.fillRect(0, 0, W, H); // (o fundo escavado, também dourado, só mais na sombra)
    const tone = (v) => (gray ? 'rgb(' + v + ',' + v + ',' + v + ')' : 'rgb(' + Math.min(255, v * 0.85 + 62) + ',' + Math.min(255, v * 0.78 + 42) + ',' + Math.min(255, v * 0.36 + 8) + ')');
    const leaf = (cx, cy, a, L, wd) => { for (const [dx, dy] of [[0, 0], [W, 0], [-W, 0], [0, H], [0, -H]]) {
      x.save(); x.translate(cx + dx, cy + dy); x.rotate(a);
      x.fillStyle = tone(90); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(L * 0.5, -wd, L, 0); x.quadraticCurveTo(L * 0.5, wd, 0, 0); x.fill(); // a sombra
      x.fillStyle = tone(200); x.beginPath(); x.moveTo(0, -1); x.quadraticCurveTo(L * 0.5, -wd, L - 2, -1); x.quadraticCurveTo(L * 0.45, 0, 0, -1); x.fill(); // a borda iluminada
      x.strokeStyle = tone(60); x.lineWidth = 1; x.beginPath(); x.moveTo(2, 0); x.lineTo(L - 3, 0); x.stroke(); // a nervura
      for (let k = 1; k < 4; k++) { x.beginPath(); x.moveTo(L * k / 4, -wd * 0.7); x.lineTo(L * k / 4 + 3, -wd * 0.2); x.stroke(); } // (os recortes da folha)
      x.restore(); } };
    // volutas: cada uma uma fileira de folhas girando em espiral
    for (let i = 0; i < 95; i++) { const cx = R2() * W, cy = R2() * H, dir = R2() < 0.5 ? 1 : -1, r0 = 18 + R2() * 26, a0 = R2() * 6.28;
      for (let t = 0; t < 1; t += 0.07) { const a = a0 + dir * t * 5.2, r = r0 * (1 - t * 0.75); leaf(cx + Math.cos(a) * r, cy + Math.sin(a) * r, a + dir * 1.9, 20 + 16 * (1 - t), 7 + 4 * (1 - t)); } }
    // as flores e as contas (pérolas) entre as volutas
    for (let i = 0; i < 40; i++) { const cx = R2() * W, cy = R2() * H, r = 3 + R2() * 4; x.fillStyle = tone(230); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.fillStyle = tone(70); x.beginPath(); x.arc(cx + r * 0.4, cy + r * 0.4, r * 0.5, 0, 7); x.fill(); }
  });
}
function normalFrom(c) {
  const W = c.width, H = c.height, src = c.getContext('2d').getImageData(0, 0, W, H).data, out = cv(W, H, () => {}), ctx = out.getContext('2d'), img = ctx.createImageData(W, H), d = img.data;
  const h = (x, y) => src[(((y + H) % H) * W + ((x + W) % W)) * 4] / 255;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let nx = (h(x - 1, y) - h(x + 1, y)) * 3, ny = (h(x, y - 1) - h(x, y + 1)) * 3; const l = Math.hypot(nx, ny, 1); const i = (y * W + x) * 4; d[i] = (nx / l * 0.5 + 0.5) * 255; d[i + 1] = (ny / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255; }
  ctx.putImageData(img, 0, 0); return out;
}
// o chão: tábuas largas sobre as covas, cada tampa com o número (as sepulturas das irmandades)
function campasTex(foto) {
  return toTexture(cv(512, 512, (x, W, H) => {
    if (foto && foto.width) { x.drawImage(foto, 0, 0, W, H); x.fillStyle = 'rgba(70,46,28,0.25)'; x.fillRect(0, 0, W, H); }
    else { x.fillStyle = '#6a4a30'; x.fillRect(0, 0, W, H); }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const px = i * 128, py = j * 256; x.fillStyle = 'rgba(30,18,10,0.55)'; x.font = '600 16px Georgia'; x.textAlign = 'center'; x.fillText(String(1 + i + j * 4 + Math.floor(R() * 40) * 8), px + 64, py + 30); x.fillStyle = 'rgba(20,12,6,0.8)'; x.fillRect(px + 56, py + 212, 16, 5); } // (o número da cova e a argola de levantar a tampa)
    x.fillStyle = 'rgba(20,12,6,0.9)'; for (let i = 0; i <= 4; i++) x.fillRect(i * 128 - 2, 0, 4, H); x.fillRect(0, 254, W, 4); x.fillRect(0, 0, W, 2);
  }));
}
function campasTexVelha() {
  return toTexture(cv(256, 256, (x, W, H) => {
    x.fillStyle = '#6a4a30'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      const px = i * 64, py = j * 128; x.fillStyle = `rgb(${100 + R() * 25},${70 + R() * 18},${44 + R() * 12})`; x.fillRect(px + 2, py + 2, 60, 124);
      for (let k = 0; k < 6; k++) { x.fillStyle = 'rgba(30,18,10,0.25)'; x.fillRect(px + 2 + R() * 58, py + 2, 1, 124); }
      x.fillStyle = 'rgba(30,18,10,0.7)'; x.font = 'bold 15px Georgia'; x.textAlign = 'center'; x.fillText(String(1 + i + j * 4 + Math.floor(R() * 40) * 8), px + 32, py + 22); // (o número da cova)
      x.fillStyle = '#2a1a10'; x.fillRect(px + 26, py + 100, 12, 4); // (a argola de levantar a tampa)
    }
    x.fillStyle = '#2a1a10'; for (let i = 0; i <= 4; i++) x.fillRect(i * 64 - 2, 0, 4, H); x.fillRect(0, 126, W, 4); x.fillRect(0, 0, W, 2);
  }));
}
// o forro pintado: tábuas com caixotões e florões (pintura decorativa, sem figuras — as grandes pinturas de perspectiva
// do Ataíde são do século seguinte)
function forroTex(base, line, flor) {
  return toTexture(cv(256, 256, (x, W, H) => {
    x.fillStyle = base; x.fillRect(0, 0, W, H);
    for (let i = 0; i < W; i += 16) { x.fillStyle = 'rgba(0,0,0,0.06)'; x.fillRect(i, 0, 1, H); }
    x.strokeStyle = line; x.lineWidth = 5; x.strokeRect(10, 10, W - 20, H - 20); x.lineWidth = 2; x.strokeRect(22, 22, W - 44, H - 44);
    x.fillStyle = flor; for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.28; x.beginPath(); x.ellipse(W / 2 + Math.cos(a) * 22, H / 2 + Math.sin(a) * 22, 16, 7, a, 0, 7); x.fill(); }
    x.fillStyle = line; x.beginPath(); x.arc(W / 2, H / 2, 12, 0, 7); x.fill();
    for (const [cx, cy] of [[22, 22], [W - 22, 22], [22, H - 22], [W - 22, H - 22]]) { x.beginPath(); x.arc(cx, cy, 7, 0, 7); x.fill(); }
  }));
}
// tecidos: o veludo vermelho dos camarins e da cortina do palco, o damasco azul
function panoTex(c1, c2) { return toTexture(cv(64, 64, (x, W, H) => { x.fillStyle = c1; x.fillRect(0, 0, W, H); for (let i = 0; i < W; i += 8) { const g = x.createLinearGradient(i, 0, i + 8, 0); g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(0.5, c2); g.addColorStop(1, 'rgba(0,0,0,0.25)'); x.fillStyle = g; x.fillRect(i, 0, 8, H); } })); }

export function interiorMaterials(M) {
  if (M.ouro) return M;
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
  const tc = talhaCanvas(false), tg = talhaCanvas(true);
  const map = toTexture(tc), nor = toTexture(normalFrom(tg), { srgb: false });
  M.ouro = std({ map, normalMap: nor, normalScale: new V2(1.8, 1.8), color: 0xfff2d0, metalness: 0.7, roughness: 0.36, emissive: 0x5a4414, emissiveIntensity: 0.45, emissiveMap: map }); M.ouro.userData.uv = { s: 1.3 }; M.ouro.userData.keepEnv = true; // (a talha brilha um pouco por si: a luz das velas e das janelas no ouro)
  M.ouroLiso = std({ color: 0xe8c068, metalness: 0.9, roughness: 0.3, emissive: 0x3a2a0a, emissiveIntensity: 0.5 }); M.ouroLiso.userData.keepEnv = true;
  M.campas = std({ map: campasTex(M.soalho?.map?.image), normalMap: M.soalho?.normalMap || null, roughness: 0.82 }); M.campas.userData.uv = { s: 3.6 };
  M.forroNave = std({ map: forroTex('#e8e2d0', '#5a7a8a', '#b88a4a'), roughness: 0.9 }); M.forroNave.userData.uv = { s: 3 };
  M.forroCapela = std({ map: forroTex('#d8e0e6', '#8a3a2a', '#c8a050'), roughness: 0.9 }); M.forroCapela.userData.uv = { s: 2.2 };
  M.marmoreado = std({ color: 0x8a3a30, roughness: 0.5 });
  M.lambril = std({ map: toTexture(cv(128, 128, (x, W, H) => { x.fillStyle = '#5a6e60'; x.fillRect(0, 0, W, H); x.strokeStyle = '#c8a860'; x.lineWidth = 3; x.strokeRect(8, 10, W - 16, H - 20); x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 2; x.strokeRect(14, 16, W - 28, H - 32); x.fillStyle = 'rgba(255,255,255,0.06)'; for (let i = 0; i < W; i += 6) x.fillRect(i, 0, 1, H); })), roughness: 0.7 }); M.lambril.userData.uv = { s: 1.6 }; // (verde-acinzentado com filete dourado, nos painéis) // (a pintura imitando mármore vermelho dos frontais e dos fundos)
  M.azulCamarim = std({ map: toTexture(cv(128, 128, (x, W, H) => { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a3e78'); g.addColorStop(1, '#3a5290'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.fillStyle = '#e0c070'; for (let k = 0; k < 9; k++) { const cx = (k % 3) * 43 + 21 + (Math.floor(k / 3) % 2) * 20, cy = Math.floor(k / 3) * 43 + 21; x.beginPath(); for (let j = 0; j < 10; j++) { const a = j * Math.PI / 5 - Math.PI / 2, r = j % 2 ? 2.4 : 6; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.fill(); } })), roughness: 0.8 }); M.azulCamarim.userData.uv = { s: 0.9 };
  M.veludo = std({ map: panoTex('#7a1a1a', 'rgba(255,120,120,0.18)'), roughness: 0.95 }); M.veludo.userData.uv = { s: 1.5 };
  M.toalha = std({ color: 0xf2eee4, roughness: 0.95 });
  M.cenario = std({ map: toTexture(cv(512, 256, (x, W, H) => { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#7a9ab8'); g.addColorStop(0.6, '#d8c8a0'); g.addColorStop(1, '#8a7050'); x.fillStyle = g; x.fillRect(0, 0, W, H); const vx = W / 2, vy = H * 0.55; x.strokeStyle = 'rgba(60,40,20,0.5)'; x.lineWidth = 2; for (let i = 0; i <= 10; i++) { x.beginPath(); x.moveTo(i * W / 10, H); x.lineTo(vx, vy); x.stroke(); } for (let k = 0; k < 5; k++) { const sc = 1 - k * 0.18, cw = 40 * sc, chh = 150 * sc; for (const sd of [-1, 1]) { const px = vx + sd * (W * 0.42 * sc), py = vy + (H - vy) * sc * 0.9; x.fillStyle = k % 2 ? '#e8dcc0' : '#d8c8a8'; x.fillRect(px - cw / 2, py - chh, cw, chh); x.fillStyle = 'rgba(90,60,30,0.35)'; x.fillRect(px - cw / 2, py - chh, cw * 0.25, chh); x.fillStyle = '#c8b088'; x.fillRect(px - cw * 0.7, py - chh - 10 * sc, cw * 1.4, 10 * sc); } } x.fillStyle = '#e0d4b8'; x.beginPath(); x.arc(vx, vy - 20, 46, Math.PI, 0); x.fill(); x.fillStyle = '#7a9ab8'; x.beginPath(); x.arc(vx, vy - 20, 34, Math.PI, 0); x.fill(); x.fillRect(vx - 34, vy - 20, 68, 30); })), roughness: 0.95 }); M.cenario.userData.uv = false;
  M.pele = std({ color: 0xd8a888, roughness: 0.6 });
  M.peleEsc = std({ color: 0x6a4030, roughness: 0.6 }); // (as imagens de santos pretos: Santa Efigênia, São Benedito, Santo Antônio de Categeró)
  M.mantoAzul = std({ color: 0x2a4a8a, roughness: 0.55 }); M.mantoVermelho = std({ color: 0x9a2a26, roughness: 0.55 }); M.mantoMarrom = std({ color: 0x5a3a24, roughness: 0.6 }); M.mantoBranco = std({ color: 0xe8e0d0, roughness: 0.6 }); M.mantoPreto = std({ color: 0x1e1a1a, roughness: 0.6 });
  M.vela = std({ color: 0xf4ecd8, roughness: 0.6 });
  M.palhaCatre = std({ color: 0xb8a070, roughness: 1 });
  M.barroPote = std({ color: 0xa0603a, roughness: 0.85 });
  M.couro = std({ color: 0x5a3420, roughness: 0.8 });
  return M;
}

// ---------------- coluna torsa (salomônica): o fuste torcido em espiral ----------------
export function colunaTorsa(h, r) {
  const g = new THREE.CylinderGeometry(r, r, h, 14, 28), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + 0.22 * Math.cos(2 * a - (y / h) * Math.PI * 7); p.setX(i, x * k); p.setZ(i, z * k); }
  g.translate(0, h / 2, 0); g.computeVertexNormals(); return g;
}

// ---------------- imagem de santo (de madeira policromada, no estilo das imagens de roca e de vestir) ----------------
// cores: [manto, túnica, pele]; coroa: coroa de prata dourada (Nossa Senhora) ou resplendor
export function imagem(f, M, x, y, z, s = 1, { manto = M.mantoAzul, tunica = M.mantoVermelho, pele = M.pele, coroa = true, ry = 0 } = {}) {
  const b = (g, m, yy, o = {}) => f.geo(g, m, x, y + yy * s, z, { uv: false, ry, s, ...o });
  b(lathe([[0, 0], [0.34, 0], [0.32, 0.25], [0.24, 0.9], [0.2, 1.25], [0.15, 1.38], [0, 1.42]]), tunica, 0);
  b(lathe([[0, 0.05], [0.37, 0.05], [0.35, 0.3], [0.27, 0.95], [0.22, 1.28], [0.17, 1.4], [0, 1.42]], 18), manto, 0, { sz: s * 0.9 }); // (o manto, um pouco aberto na frente)
  b(new THREE.SphereGeometry(0.13, 12, 10), pele, 1.55);
  if (coroa) b(lathe([[0.08, 0], [0.11, 0.02], [0.12, 0.14], [0.09, 0.12], [0, 0.18]], 10), M.ouroLiso, 1.62);
  else b(new THREE.TorusGeometry(0.2, 0.015, 4, 20), M.ouroLiso, 1.58);
}

// ---------------- o retábulo (quadro local: encostado na parede em z = 0, olhando para +z) ----------------
// w, h: largura e altura; mor: o altar-mor (com o trono em degraus); santo: as cores da imagem
export function retabulo(f, M, out, x, y, z, ry, w, h, { mor = false, santo = {} } = {}) {
  const c = Math.cos(ry), s = Math.sin(ry);
  // (as peças vão no quadro do prédio, em volta de (x, z) e giradas de ry)
  const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const box = (m, bw, bh, bd, lx, ly, lz, o = {}) => { const [px, pz] = P(lx, lz); f.box(m, bw, bh, bd, px, y + ly, pz, { noGround: true, ...o, ry: ry + (o.ry || 0) }); };
  const geo = (g, m, lx, ly, lz, o = {}) => { const [px, pz] = P(lx, lz); f.geo(g, m, px, y + ly, pz, { uv: m.userData.uv || false, ...o, ry: ry + (o.ry || 0) }); };
  const world = (lx, ly, lz) => { const [px, pz] = P(lx, lz), [wx, wz] = f.W(px, pz); return new THREE.Vector3(wx, f.y + y + ly, wz); };
  const hw = w / 2, base = 1.05;
  // o fundo marmoreado, o banco (a base) e a mesa do altar com a toalha e o frontal
  box(M.marmoreado, w - 0.2, h - 0.4, 0.12, 0, 0.2, 0.06);
  for (const sx of [-1, 1]) box(M.ouro, 0.08, h - 0.2, 0.85, sx * (hw - 0.04), 0, 0.425); // (as ilhargas: os lados fechados de talha, sem fresta para o fundo)
  box(M.ouro, w, base, 0.7, 0, 0, 0.35);
  box(M.ouro, w * 0.55, 1.0, 0.9, 0, 0, 1.1); box(M.marmoreado, w * 0.5, 0.75, 0.04, 0, 0.12, 1.56); box(M.toalha, w * 0.58, 0.04, 0.95, 0, 1.0, 1.1);
  box(M.toalha, w * 0.58, 0.3, 0.02, 0, 0.72, 1.575); // (a renda da toalha caindo na frente)
  // o sacrário no meio da mesa, e os castiçais com as velas
  box(M.ouro, 0.5, 0.65, 0.4, 0, base + 0.04, 0.55); geo(lathe([[0, 0], [0.12, 0], [0.04, 0.2], [0.06, 0.3], [0, 0.34]], 8), M.ouroLiso, 0, base + 0.69, 0.55);
  for (const sx of [-1, -0.55, 0.55, 1]) { const lx = sx * w * 0.22; geo(lathe([[0.09, 0], [0.04, 0.05], [0.025, 0.4], [0.06, 0.42], [0, 0.44]], 8), M.ouroLiso, lx, 1.04, 0.95); geo(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 6), M.vela, lx, 1.48 + 0.16, 0.95); out.candles.push(world(lx, 1.86, 0.95)); }
  // as colunas torsas (quatro), com a base e o capitel
  const ch = h - base - 2.4;
  for (const cx of [-hw + 0.3, -hw + 0.85, hw - 0.85, hw - 0.3]) { geo(new THREE.CylinderGeometry(0.2, 0.22, 0.35, 10), M.ouro, cx, base + 0.17, 0.42); geo(colunaTorsa(ch, 0.15), M.ouro, cx, base + 0.35, 0.42); box(M.ouro, 0.44, 0.3, 0.44, cx, base + 0.35 + ch, 0.42); }
  // a cornija sobre as colunas e o camarim no meio (o nicho fundo, azul, com a imagem)
  box(M.ouro, w + 0.2, 0.35, 0.95, 0, base + 0.65 + ch, 0.45);
  const nw = w - 2.3, nh = ch - 0.2;
  box(M.azulCamarim, nw, nh, 0.1, 0, base + 0.4, 0.14);
  const spot = (ly, lz, hh) => { const p = world(0, ly, lz); out.statues.push({ x: p.x, y: p.y, z: p.z, ry: f.ry + ry, h: hh, key: santo.key }); };
  if (mor) { const n = 5, st = Math.min(0.32, nh * 0.055); for (let k = 0; k < n; k++) { box(M.ouro, nw * (0.82 - k * 0.12), st, 0.75 - k * 0.1, 0, base + 0.4 + k * st, 0.55); box(M.ouroLiso, nw * (0.82 - k * 0.12) + 0.04, 0.05, 0.77 - k * 0.1, 0, base + 0.4 + (k + 1) * st - 0.04, 0.55); } // (o trono em degraus, com a beirada lisa de cada degrau)
    let top = base + 0.4 + n * st; if (santo.pilar) { geo(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 12), M.ouro, 0, top + 0.35, 0.55); box(M.ouroLiso, 0.42, 0.08, 0.42, 0, top + 0.7, 0.55); top += 0.78; } // (no Pilar, a imagem em cima da coluna)
    spot(top, 0.55, Math.min(1.75, nh - (top - base - 0.4) - 0.25)); }
  else { box(M.ouro, nw * 0.6, 0.25, 0.5, 0, base + 0.4, 0.4); spot(base + 0.65, 0.4, Math.min(1.5, nh - 0.5)); }
  // o coroamento: o arco sobre o camarim, as volutas dos lados e a cartela com a coroa no alto
  geo(new THREE.TorusGeometry(nw / 2 + 0.2, 0.2, 8, 24, Math.PI), M.ouroLiso, 0, base + 1.0 + ch, 0.5);
  for (const sx of [-1, 1]) { geo(new THREE.TorusGeometry(0.42, 0.13, 8, 18, Math.PI * 1.3), M.ouroLiso, sx * (hw - 0.55), base + 1.25 + ch, 0.45, { rz: sx > 0 ? 0.2 : Math.PI - 1.15 }); geo(new THREE.SphereGeometry(0.22, 10, 8), M.ouroLiso, sx * (hw - 0.3), base + 1.0 + ch, 0.5); }
  box(M.ouro, 0.9, 0.9, 0.2, 0, base + 1.4 + ch + nw / 2, 0.45); geo(lathe([[0.25, 0], [0.3, 0.1], [0.26, 0.35], [0, 0.45]], 10), M.ouroLiso, 0, base + 2.25 + ch + nw / 2, 0.45);
  { const [px, pz] = P(0, 0.75), side = Math.abs(s) > 0.5; f.solid(px, pz, side ? 1.6 : w, side ? w : 1.6, y - 0.5, y + base + 0.1); }
}

// ---------------- púlpito: a bacia entalhada sobre a mísula, a escadinha e o tapa-voz em cima ----------------
function pulpito(f, M, x, y, z, ry) {
  const c = Math.cos(ry), s = Math.sin(ry), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const geo = (g, m, lx, ly, lz, o = {}) => { const [px, pz] = P(lx, lz); f.geo(g, m, px, y + ly, pz, { ry, uv: m.userData.uv || false, ...o }); };
  // a mísula entalhada, a bacia de madeira escura com os painéis dourados, o tapa-voz com o lambrequim
  geo(lathe([[0, 0], [0.08, 0.02], [0.18, 0.35], [0.36, 0.8], [0.5, 1.15], [0.52, 1.3], [0, 1.3]], 16), M.ouro, 0, 1.3, 0.6);
  geo(lathe([[0, 0], [0.55, 0], [0.6, 0.06], [0.56, 0.14], [0.56, 0.92], [0.62, 0.98], [0.62, 1.1], [0, 1.1]], 16), M.ouro, 0, 2.6, 0.6);
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k / 4) * Math.PI; geo(new THREE.BoxGeometry(0.3, 0.52, 0.03), M.marmoreado, Math.sin(a) * 0.565, 3.12, 0.6 + Math.cos(a) * 0.565, { ry: ry + a }); geo(new THREE.BoxGeometry(0.36, 0.05, 0.04), M.ouroLiso, Math.sin(a) * 0.57, 3.4, 0.6 + Math.cos(a) * 0.57, { ry: ry + a }); geo(new THREE.BoxGeometry(0.36, 0.05, 0.04), M.ouroLiso, Math.sin(a) * 0.57, 2.84, 0.6 + Math.cos(a) * 0.57, { ry: ry + a }); } // (as almofadas da bacia, com o filete em volta)
  geo(new THREE.SphereGeometry(0.1, 10, 8), M.ouroLiso, 0, 1.25, 0.6); // (a pinha na ponta da mísula)
  geo(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 16), M.ouroLiso, 0, 3.66, 0.6); // (o corrimão)
  geo(lathe([[0, 0], [0.72, 0], [0.74, 0.12], [0.6, 0.35], [0.35, 0.6], [0.12, 0.85], [0.05, 1.05], [0, 1.1]], 16), M.ouro, 0, 5.4, 0.6); // o tapa-voz
  geo(new THREE.CylinderGeometry(0.75, 0.75, 0.22, 16, 1, true), M.ouro, 0, 5.29, 0.6); // (o lambrequim, a franja entalhada da beira)
  { const [px, pz] = P(0, 0.06); f.box(M.marmoreado, 1.1, 2.6, 0.06, px, y + 2.7, pz, { ry, noGround: true }); }
}

// ---------------- o interior de uma igreja (chamado de dentro de igreja(), no quadro dela) ----------------
// d: { nW, nL, cW, cL, Hn, Hc, T, zF, zN, zC }; o: as opções da igreja (o orago e as cores)
export function igrejaInterior(f, M, out, d, o) {
  interiorMaterials(M);
  const { nW, cW, Hn, Hc, T, zF, zN, zC } = d, iw = nW - 2 * T, ciw = cW - 2 * T;
  // o chão: as campas na nave; a capela-mor três degraus acima
  f.box(M.campas, iw, 0.12, zF - T - zN - T / 2, 0, -0.12, (zF - T + zN + T / 2) / 2 + 0.25, { noGround: true });
  const cy = 0.5;
  f.box(M.soalho, ciw, cy + 0.12, zN - zC - T, 0, -0.12, (zN + zC + T) / 2, { noGround: true }); f.solid(0, (zN + zC + T) / 2, ciw, zN - zC - T, -1, cy, true);
  for (let k = 0; k < 3; k++) { f.box(M.cantaria, ciw, (cy / 3) * (k + 1), 0.35, 0, 0, zN + T / 2 + 0.55 - k * 0.35, { noGround: true }); f.solid(0, zN + T / 2 + 0.55 - k * 0.35, ciw, 0.35, -1, (cy / 3) * (k + 1), true); }
  // a grade de comunhão (balaústres torneados, com a passagem no meio)
  for (let x = -ciw / 2 + 0.2; x < ciw / 2 - 0.1; x += 0.22) if (Math.abs(x) > 0.7) { f.geo(lathe([[0.05, 0], [0.07, 0.1], [0.04, 0.3], [0.08, 0.55], [0.04, 0.85], [0.06, 0.9], [0, 0.92]], 8), M.madeiraEsc, x, 0, zN + T / 2 + 1.0, { uv: false }); }
  for (const sx of [-1, 1]) { f.box(M.madeiraEsc, ciw / 2 - 0.7, 0.08, 0.16, sx * (ciw / 4 + 0.35), 0.92, zN + T / 2 + 1.0, { noGround: true }); f.solid(sx * (ciw / 4 + 0.35), zN + T / 2 + 1.0, ciw / 2 - 0.7, 0.2, -1, 1.0); }
  // o arco-cruzeiro todo emoldurado de talha
  const ah = Hc - 2.4; for (const sx of [-1, 1]) f.box(M.ouro, 0.5, ah, 0.25, sx * (ciw / 2 + 0.25), 0, zN + T + 0.06, { noGround: true });
  f.geo(new THREE.TorusGeometry(ciw / 2 + 0.25, 0.25, 8, 28, Math.PI), M.ouroLiso, 0, ah, zN + T + 0.06, { uv: false });
  // os retábulos: o altar-mor no fundo da capela-mor, os dois colaterais junto do arco, dois laterais na nave
  const sm = o.santos || {};
  retabulo(f, M, out, 0, cy, zC + T, 0, ciw - 0.6, Hc - 1.6, { mor: true, santo: sm.mor || {} });
  for (const sx of [-1, 1]) retabulo(f, M, out, sx * (ciw / 2 + 0.5 + (iw / 2 - ciw / 2 - 1.0) / 2), 0, zN + T + 0.02, 0, iw / 2 - ciw / 2 - 1.0, Hn - 4.5, /* (encostado na pilastra do arco) */ { santo: (sm.col || [])[sx > 0 ? 1 : 0] || {} });
  for (const sx of [-1, 1]) retabulo(f, M, out, sx * (iw / 2), 0, zN + (zF - zN) * 0.45, -sx * Math.PI / 2, 3.2, Hn - 5.5, { santo: (sm.lat || [])[sx > 0 ? 1 : 0] || {} });
  // o lambril: o barrado de madeira pintada na parte de baixo das paredes da nave (protegia o reboco)
  { const dz = zN + (zF - zN) * 0.82, segs = [[zN + T + 0.05, dz - 1.15], [dz + 1.15, zF - T - 0.05]]; // (com o vão da porta lateral)
    for (const sx of [-1, 1]) for (const [a, b] of segs) { const L = b - a; if (L < 0.2) continue; f.box(M.lambril, 0.06, 1.6, L, sx * (iw / 2 - 0.03), 0, (a + b) / 2, { noGround: true }); f.box(M.ouroLiso, 0.08, 0.06, L, sx * (iw / 2 - 0.04), 1.6, (a + b) / 2, { noGround: true }); } }
  for (const sx of [-1, 1]) { const L = iw / 2 - 1.4; f.box(M.lambril, L, 1.6, 0.06, sx * (iw / 2 - L / 2), 0, zF - T - 0.03, { noGround: true }); }
  // os púlpitos, um de cada lado, perto do arco
  for (const sx of [-1, 1]) pulpito(f, M, sx * (iw / 2), 0, zN + (zF - zN) * 0.22, -sx * Math.PI / 2);
  // o coro sobre a entrada: o soalho apoiado em duas colunas e a balaustrada
  const coroZ = zF - T - 2.6, cyH = 5.4;
  f.box(M.soalho, iw, 0.25, 5.2, 0, cyH, coroZ, { noGround: true });
  for (const sx of [-1, 1]) { f.geo(new THREE.CylinderGeometry(0.22, 0.26, cyH, 12), M.madeiraEsc, sx * iw * 0.28, cyH / 2, coroZ - 2.5, { uv: false }); f.solid(sx * iw * 0.28, coroZ - 2.5, 0.5, 0.5, -1, cyH); }
  for (let x = -iw / 2 + 0.2; x < iw / 2 - 0.1; x += 0.2) f.geo(lathe([[0.04, 0], [0.06, 0.08], [0.035, 0.3], [0.07, 0.5], [0.035, 0.85], [0, 0.88]], 6), M.ouro, x, cyH + 0.25, coroZ - 2.55, { uv: false });
  f.box(M.ouro, iw, 0.1, 0.18, 0, cyH + 1.12, coroZ - 2.55, { noGround: true });
  // os forros: em gamela na nave (o meio chato e as abas inclinadas), em berço na capela-mor
  const zm = (zF - T + zN + T) / 2, Ln = zF - T - zN - T, fy = Hn - 0.35, ab = 1.8, flat = iw - 2 * ab;
  f.box(M.forroNave, flat, 0.08, Ln, 0, fy, zm, { noGround: true });
  for (const sx of [-1, 1]) f.box(M.forroNave, Math.hypot(ab, 1.4) + 0.06, 0.08, Ln, sx * (flat / 2 + ab / 2), fy - 0.7, zm, { rz: sx * Math.atan2(1.4, ab), noGround: true });
  f.box(M.ouro, iw, 0.3, 0.3, 0, fy - 1.55, zF - T - 0.15, { noGround: true }); for (const sx of [-1, 1]) f.box(M.ouro, 0.25, 0.3, Ln, sx * (iw / 2 - 0.12), fy - 1.55, zm, { noGround: true }); // (a cimalha dourada onde o forro encontra a parede)
  const Rb = ciw / 2, by = Hc - 0.25 - Rb;
  { const g = new THREE.CylinderGeometry(Rb, Rb, zN - zC - T, 18, 1, true, Math.PI / 2, Math.PI); g.rotateX(Math.PI / 2); f.geo(g, M.forroCapela, 0, by, (zN + zC + T) / 2, { uv: { s: 2.2 } }); } // (a abóbada: a metade de cima do cilindro deitado; o Batcher põe o avesso, que é a face de dentro)
  // a câmera não sai pelo forro
  f.solid(0, zm, iw, Ln, fy + 0.1, Hn + 6, true); f.solid(0, (zN + zC + T) / 2, ciw, zN - zC - T, Hc - 0.25, Hc + 5, true);
  // uma lâmpada de prata pendurada na capela-mor (a lamparina do Santíssimo, sempre acesa)
  f.geo(lathe([[0, 0], [0.2, 0.05], [0.3, 0.25], [0.18, 0.4], [0, 0.45]], 10), M.ouroLiso, 0, Hc - 3.2, zN - (zN - zC) * 0.35, { uv: false });
  f.box(M.ferro, 0.02, 2.4, 0.02, 0, Hc - 2.75, zN - (zN - zC) * 0.35, { noGround: true });
  { const [a, b] = f.W(0, zN - (zN - zC) * 0.35); out.candles.push(new THREE.Vector3(a, f.y + Hc - 3.15, b)); }
  out.interiors.push({ id: o.id, at: f.W(0, (zF + zC) / 2), y: f.y, light: [f.W(0, zC + T + 2), f.y + Hc - 3], light2: [f.W(0, zm), f.y + Hn - 3] });
}

// ---------------- a mobília de uma casa aberta (no quadro da casa: a fachada em z = zf, o piso em y = 0) ----------------
// g: { hw, hd, T, zf, zp (a divisória), dcx (a porta da rua), back (x da porta dos fundos), poor, rich, rnd }
export function mobilia(f, M, g) {
  interiorMaterials(M);
  const { hw, hd, T, zf, zp, dcx, back, poor, rnd } = g, side = dcx > 0 ? -1 : 1; // (os móveis do lado oposto à porta: o caminho fica livre)
  const ix0 = -hw + T, ix1 = hw - T, iz0 = -hd + T, iz1 = zf - T;
  const solid = (x, z, w, d, h) => f.solid(x, z, w, d, -0.5, h);
  if (poor) { // a casinha: chão de terra, a esteira, a trempe de pedras com a panela, o pote d'água
    f.box(M.palhaCatre, 1.8, 0.03, 0.9, side * (hw - T - 1.0), 0.0, iz0 + 0.7, { noGround: true });
    for (let k = 0; k < 3; k++) { const a = k * 2.1; f.geo(new THREE.DodecahedronGeometry(0.12, 0), M.pedra, -side * (hw - T - 0.7) + Math.cos(a) * 0.18, 0.08, iz0 + 0.8 + Math.sin(a) * 0.18, { uv: false }); }
    f.geo(lathe([[0, 0], [0.16, 0.02], [0.2, 0.14], [0.17, 0.2], [0, 0.2]], 10), M.sabao, -side * (hw - T - 0.7), 0.16, iz0 + 0.8, { uv: false });
    f.geo(lathe([[0, 0], [0.18, 0.05], [0.25, 0.3], [0.15, 0.55], [0.12, 0.62], [0, 0.62]], 10), M.barroPote, side * (hw - T - 0.4), 0, iz1 - 0.5, { uv: false });
    return;
  }
  // a sala da frente: a mesa com dois bancos, a arca encostada, o oratório da família na parede da divisória
  const tx = side * (hw - T - 1.3), tz = (zp + iz1) / 2;
  f.box(M.madeiraEsc, 0.8, 0.06, 1.5, tx, 0.74, tz, { noGround: true }); for (const [a, b] of [[-0.32, -0.65], [0.32, -0.65], [-0.32, 0.65], [0.32, 0.65]]) f.box(M.madeiraEsc, 0.07, 0.74, 0.07, tx + a, 0, tz + b, { noGround: true });
  solid(tx, tz, 0.8, 1.5, 0.8);
  for (const s2 of [-1, 1]) { f.box(M.madeira, 0.3, 0.05, 1.4, tx + s2 * 0.62, 0.42, tz, { noGround: true }); for (const b of [-0.6, 0.6]) f.box(M.madeira, 0.24, 0.42, 0.05, tx + s2 * 0.62, 0, tz + b, { noGround: true }); }
  if (rnd() < 0.8) { const ax = side * (hw - T - 0.35), az = zp + 0.6; f.box(M.madeiraEsc, 0.55, 0.6, 1.0, ax, 0, az + 0.5, { noGround: true }); f.box(M.ferro, 0.57, 0.04, 1.02, ax, 0.45, az + 0.5, { noGround: true }); solid(ax, az + 0.5, 0.55, 1.0, 0.6); } // a arca
  { const ox = -side * 0.9, oz = zp + 0.08, pt = M.paint.verde; f.box(M.madeiraEsc, 0.66, 0.9, 0.34, ox, 1.4, oz + 0.17, { noGround: true }); for (const s2 of [-1, 1]) f.box(pt.shutter, 0.3, 0.74, 0.03, ox + s2 * 0.155, 1.48, oz + 0.355, { noGround: true }); // o oratório, com as portinhas pintadas fechadas
    f.box(M.madeiraEsc, 0.74, 0.08, 0.4, ox, 2.3, oz + 0.18, { noGround: true }); f.box(M.ouroLiso, 0.04, 0.3, 0.04, ox, 2.38, oz + 0.18, { noGround: true }); f.box(M.ouroLiso, 0.18, 0.04, 0.04, ox, 2.56, oz + 0.18, { noGround: true }); f.box(M.madeiraEsc, 0.5, 0.06, 0.26, ox, 1.32, oz + 0.13, { noGround: true }); } // (a peanha que o segura na parede e a cruzinha no alto)
  // o fundo: o catre com o colchão de palha e a coberta, o fogão de lenha com as panelas, o pote d'água
  const bx = side * (hw - T - 0.55), bz = iz0 + 1.1;
  f.box(M.madeiraEsc, 0.95, 0.38, 1.95, bx, 0, bz, { noGround: true }); f.box(M.palhaCatre, 0.88, 0.12, 1.85, bx, 0.38, bz, { noGround: true }); f.box(M.mantoVermelho, 0.9, 0.04, 1.1, bx, 0.5, bz - 0.35, { noGround: true });
  const kx = -side * (hw - T - 0.5), kz = iz0 + 0.95; if (Math.abs(kx - back) > 1.3) { // (o fogão não tapa a porta dos fundos)
    f.box(M.calVelha, 0.75, 0.8, 1.6, kx, 0, kz, { noGround: true }); f.box(M.ferro, 0.65, 0.04, 1.45, kx, 0.8, kz, { noGround: true }); solid(kx, kz, 0.75, 1.6, 0.85);
    for (const dz of [-0.4, 0.35]) f.geo(lathe([[0, 0], [0.17, 0.02], [0.2, 0.15], [0.18, 0.22], [0, 0.22]], 10), M.sabao, kx, 0.84, kz + dz, { uv: false }); // as panelas de pedra-sabão
    f.box(M.escuro, 0.5, 0.35, 0.05, kx + side * 0.36, 0.2, kz, { ry: Math.PI / 2, noGround: true }); f.box(M.fire, 0.25, 0.1, 0.04, kx + side * 0.385, 0.25, kz, { ry: Math.PI / 2, noGround: true }); // (a boca do fogo, com a brasa)
  }
  f.geo(lathe([[0, 0], [0.2, 0.05], [0.28, 0.35], [0.17, 0.62], [0.14, 0.7], [0, 0.7]], 12), M.barroPote, -side * 0.3, 0, iz0 + 0.45, { uv: false }); // a talha d'água de barro
}

// ---------------- a Casa da Ópera por dentro: o palco, a boca de cena com o pano, a plateia, os camarotes ----------------
// (a casa de espetáculos aberta em 1770 pelo contratador João de Sousa Lisboa; ali se faziam comédias, óperas e entremezes
//  com atores da terra — muitos deles mulatos —, e a gente de posse alugava os camarotes)
export function teatro(f, M, out, g) {
  interiorMaterials(M);
  const { hw, hd, T, zf, top } = g, iw = 2 * (hw - T), z0 = -hd + T, sd = 6.2, ph = 1.1;
  // o palco: o tablado no fundo, a ribalta e o pano de fundo pintado
  f.box(M.madeira, iw, ph, sd, 0, 0, z0 + sd / 2, { noGround: true }); f.solid(0, z0 + sd / 2, iw, sd, -0.5, ph, true);
  f.box(M.madeiraEsc, iw, 0.12, 0.25, 0, ph, z0 + sd - 0.12, { noGround: true });
  f.box(M.cenario, iw - 0.2, top - ph - 0.4, 0.06, 0, ph, z0 + 0.1, { noGround: true }); // o pano de fundo pintado: um pátio de palácio em perspectiva (o cenário de sempre das comédias e óperas)
  for (const s2 of [-1, 1]) for (let k = 0; k < 3; k++) f.box(M.cenario, 0.06, top - ph - 0.6, 1.2, s2 * (iw / 2 - 0.6 - k * 0.5), ph, z0 + 1.2 + k * 1.6, { noGround: true }); // (os bastidores laterais, pintados também)
  // a boca de cena: a moldura pintada e dourada, o pano vermelho preso dos lados e a bambolina em cima
  const bw = iw - 2.4, bh = Math.min(5.2, top - ph - 0.6), bz = z0 + sd;
  for (const s of [-1, 1]) { f.box(M.marmoreado, 1.2, top - 0.2, 0.3, s * (bw / 2 + 0.6), 0, bz, { noGround: true }); f.solid(s * (bw / 2 + 0.6), bz, 1.2, 0.3, -0.5, top); f.box(M.veludo, 0.9, bh, 0.1, s * (bw / 2 - 0.4), ph, bz - 0.25, { noGround: true }); }
  f.box(M.marmoreado, bw, top - ph - bh - 0.2, 0.3, 0, ph + bh, bz, { noGround: true }); f.box(M.veludo, bw, 0.8, 0.12, 0, ph + bh - 0.75, bz - 0.25, { noGround: true });
  f.box(M.ouro, bw + 0.4, 0.3, 0.36, 0, ph + bh, bz + 0.02, { noGround: true }); for (const s of [-1, 1]) f.box(M.ouro, 0.3, bh, 0.36, s * (bw / 2 + 0.1), ph, bz + 0.02, { noGround: true });
  // a plateia: bancos corridos de tábua
  for (let z = bz + 2.2; z < zf - T - 2.6; z += 1.1) for (const s of [-1, 1]) { const x = s * (iw / 4 + 0.15); f.box(M.madeira, iw / 2 - 1.6, 0.05, 0.32, x, 0.44, z, { noGround: true }); for (const b of [-1, 1]) f.box(M.madeira, 0.05, 0.44, 0.3, x + b * (iw / 4 - 1.0), 0, z, { noGround: true }); f.solid(x, z, iw / 2 - 1.6, 0.35, -0.5, 0.48); for (const k of [-1.1, 0, 1.1]) { const [wx, wz] = f.W(x + k, z - 0.06); (out.spots.operaSeats ||= []).push([wx, f.y + 0.48, wz, f.ry + Math.PI]); } } // (os lugares da plateia: as noites de comédia, dias.js)
  { const st = []; for (const k of [-1.3, 1.3]) { const [wx, wz] = f.W(k, z0 + sd - 1.6); st.push([wx, f.y + ph, wz, f.ry]); } out.spots.operaStage = st; } // (onde ficam os atores)
  // os camarotes: dois andares de cada lado, com o parapeito pintado e as divisórias
  for (const s of [-1, 1]) for (const [cy, k] of [[2.3, 0], [4.4, 1]]) {
    if (cy + 2 > top) continue;
    const x = s * (hw - T - 0.85), L = zf - T - 1.2 - (bz + 1.0), zc = bz + 1.0 + L / 2;
    f.box(M.madeira, 1.7, 0.15, L, x, cy, zc, { noGround: true });
    f.box(k ? M.azulCamarim : M.marmoreado, 0.08, 0.95, L, x - s * 0.85, cy + 0.15, zc, { noGround: true }); f.box(M.ouro, 0.12, 0.1, L, x - s * 0.85, cy + 1.08, zc, { noGround: true });
    for (let z = bz + 1.0; z <= zf - T - 1.2 + 0.01; z += 1.7) f.box(M.madeiraEsc, 1.7, 1.9, 0.06, x, cy + 0.15, z, { noGround: true });
    if (!k) for (let z = bz + 1.0; z <= zf - T - 1.2 + 0.01; z += 3.4) { f.geo(new THREE.CylinderGeometry(0.09, 0.09, cy, 8), M.madeiraEsc, x - s * 0.8, cy / 2, z, { uv: false }); f.solid(x - s * 0.8, z, 0.2, 0.2, -0.5, cy); }
  }
  // os lustres de velas pendurados sobre a plateia
  for (const z of [bz + 3.5, (bz + zf) / 2 + 1.5]) { const ly = top - 1.6; f.geo(new THREE.TorusGeometry(0.55, 0.04, 4, 16), M.ouroLiso, 0, ly, z, { rx: Math.PI / 2, uv: false }); f.box(M.ferro, 0.03, 1.4, 0.03, 0, ly, z, { noGround: true });
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, x = Math.cos(a) * 0.55, zz = z + Math.sin(a) * 0.55; f.geo(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6), M.vela, x, ly + 0.1, zz, { uv: false }); const [wx, wz] = f.W(x, zz); out.candles.push(new THREE.Vector3(wx, f.y + ly + 0.24, wz)); } }
  out.interiors.push({ id: 'opera', at: f.W(0, 0), y: f.y, light: [f.W(0, bz - 2), f.y + 3.5], light2: [f.W(0, (bz + zf) / 2), f.y + top - 0.4] }); // (a luz alta, perto do forro: embaixo dela a plateia estourava de branco)
}
