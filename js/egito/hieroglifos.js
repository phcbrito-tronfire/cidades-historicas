// Hieróglifos de verdade nas paredes de Mênfis. Os signos vêm da fonte Noto Sans Egyptian Hieroglyphs (licença livre
// SIL OFL, em assets/fonts), escritos pelo código de Gardiner — a lista que os egiptólogos usam. Antes as paredes
// tinham símbolos inventados, repetidos sem sentido; agora cada parede diz uma coisa que se lia de fato em Mênfis:
//  · os dois nomes de Ramsés II nos cartuchos: Usermaatre-setepenre ("forte é a verdade de Rá, escolhido de Rá") e
//    Ramessu-meryamun ("Rá o gerou, amado de Amon"), com os títulos "o deus perfeito, senhor das Duas Terras" e
//    "filho de Rá";
//  · Ptah, o deus da cidade, com o seu título "senhor da verdade" (nb mAat) e a fala dos deuses ao rei, "dou-te vida,
//    estabilidade e domínio" (di anx Dd wAs);
//  · a fórmula de oferenda "uma oferenda que o rei dá" (Htp di nsw).
// As cenas seguem o cânone dos relevos dos templos: o rei de pé, à esquerda, oferecendo a Ptah, à direita, numa mesa de
// oferendas; os nomes em colunas verticais por cima de cada um, separadas por linhas, e o céu (pt) no alto.
const C = {
  A043: 0x13032, A045: 0x13035, A040: 0x1302D, C019: 0x13070, C020: 0x13071, C010: 0x13066,
  D021: 0x1308B, D036: 0x1309D, D046: 0x130A7, F012: 0x1310A, F031: 0x1311F, F034: 0x13123, F035: 0x13124,
  G005: 0x13143, G017: 0x13153, G039: 0x1316D, G043: 0x13171, H006: 0x13184, I009: 0x13191, I010: 0x13193,
  M017: 0x131CB, M023: 0x131D3, N001: 0x131EF, N005: 0x131F3, N016: 0x131FE, N017: 0x131FF, N028: 0x1320D,
  N035: 0x13216, O036: 0x13285, Q003: 0x132AA, R004: 0x132B5, R008: 0x132B9, R011: 0x132BD, S029: 0x132F4,
  S034: 0x132F9, S040: 0x13300, U007: 0x1333B, U021: 0x13349, V028: 0x1339B, V030: 0x1339F, W024: 0x133CC,
  X001: 0x133CF, X008: 0x133D9, Y005: 0x133E0, Z001: 0x133E4, M036: 0x131E5,
  A030: 0x13022, A023: 0x1301B, R002: 0x132B0, R003: 0x132B2, E023: 0x130ED,
};
// signos baixos e largos ocupam meia "casa" na coluna (como na escrita de verdade, empilhados dois a dois)
const FLAT = new Set(['N035', 'X001', 'V030', 'N016', 'N017', 'D046', 'S029', 'Q003', 'R004', 'D021', 'O036', 'V028', 'W024', 'N028', 'Y005', 'G043']);
const ch = (k) => String.fromCodePoint(C[k]);
export const FAMILY = 'Hieroglifos';

let ready = null, ok = false;
export const hieroOk = () => ok;
export function loadHieroFont(url) {
  ready ||= (async () => {
    try { const f = new FontFace(FAMILY, `url(${url})`); await f.load(); document.fonts.add(f); ok = true; return true; }
    catch (e) { console.warn('fonte dos hieróglifos não carregou', e); return false; }
  })();
  return ready;
}

// textos (sequência de signos; '|' quebra em outro grupo)
export const TXT = {
  prenome: ['N005', 'F012', 'C010', 'N005', 'U021', 'N035'],          // Wsr-mAat-Ra stp-n-Ra
  nome: ['N005', 'F031', 'S029', 'S029', 'M017', 'Y005', 'N035', 'U007'], // Ra-ms-sw mry-Imn
  deusPerfeito: ['R008', 'F035', 'V030', 'N016', 'N016'],                // nTr nfr nb tAwy
  filhoDeRa: ['G039', 'N005'],                                           // sA Ra
  ptah: ['Q003', 'X001', 'V028', 'C019'],                                // PtH
  senhorVerdade: ['V030', 'H006', 'X001'],                               // nb mAat
  vidaDominio: ['X008', 'S034', 'R011', 'S040'],                         // di anx Dd wAs
  oferenda: ['M023', 'X001', 'R004', 'X001', 'Q003', 'X008'],           // Htp di nsw
  senhorAparicoes: ['V030', 'N028', 'D036', 'Z001'],                     // nb xaw
};


// O signo pintado: a fonte traz só o contorno, em linha fina; aqui o desenho é preenchido de tinta por dentro e o
// contorno engrossado, como nos relevos pintados (as áreas fechadas do desenho viram cor; o resto fica transparente)
const CACHE = new Map();
export function glyphImg(key, size, fill, line = '#2a1a0e') {
  const id = key + size + fill + line; if (CACHE.has(id)) return CACHE.get(id);
  const S = Math.ceil(size * 1.5), c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.font = `${size}px ${FAMILY}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#000'; x.strokeStyle = '#000';
  x.lineWidth = Math.max(1, size * 0.018); x.fillText(ch(key), S / 2, S / 2); x.strokeText(ch(key), S / 2, S / 2); // (o traço fecha as frestinhas do contorno)
  const img = x.getImageData(0, 0, S, S), d = img.data, N = S * S, out = new Uint8Array(N), line8 = new Uint8Array(N);
  for (let i = 0; i < N; i++) line8[i] = d[i * 4 + 3] > 90 ? 1 : 0;
  const q = []; const push = (i) => { if (!out[i] && !line8[i]) { out[i] = 1; q.push(i); } };
  for (let i = 0; i < S; i++) { push(i); push(N - 1 - i); push(i * S); push(i * S + S - 1); }
  while (q.length) { const i = q.pop(), px = i % S; if (px > 0) push(i - 1); if (px < S - 1) push(i + 1); if (i >= S) push(i - S); if (i < N - S) push(i + S); }
  const fc = parseInt(fill.slice(1), 16), lc = parseInt(line.slice(1), 16);
  for (let i = 0; i < N; i++) {
    const a = d[i * 4 + 3];
    if (line8[i] || (a > 20 && !out[i])) { d[i * 4] = lc >> 16; d[i * 4 + 1] = (lc >> 8) & 255; d[i * 4 + 2] = lc & 255; d[i * 4 + 3] = Math.max(a, 200); }
    else if (!out[i]) { d[i * 4] = fc >> 16; d[i * 4 + 1] = (fc >> 8) & 255; d[i * 4 + 2] = fc & 255; d[i * 4 + 3] = 255; }
    else d[i * 4 + 3] = 0;
  }
  x.putImageData(img, 0, 0); CACHE.set(id, c); return c;
}
// desenha o signo centrado em (x, y); mirror vira para o outro lado; shadow: a sombra do relevo escavado
function put(p, key, x, y, size, fill, { mirror = false, shadow = false, line } = {}) {
  const g = glyphImg(key, size, fill, line), S = g.width;
  p.save(); p.translate(x, y); if (mirror) p.scale(-1, 1);
  if (shadow) { p.shadowColor = 'rgba(40,24,10,0.5)'; p.shadowOffsetX = size * 0.012; p.shadowOffsetY = size * 0.015; p.shadowBlur = size * 0.012; }
  p.drawImage(g, -S / 2, -S / 2); p.restore();
}

// uma coluna de signos de cima para baixo (os baixos e largos empilhados dois a dois); devolve onde terminou
export function column(p, keys, x, y, size, color) {
  let yy = y;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (FLAT.has(k) && FLAT.has(keys[i + 1]) && k !== 'N016') { put(p, k, x, yy + size * 0.2, size * 0.7, color); put(p, keys[i + 1], x, yy + size * 0.58, size * 0.7, color); yy += size * 0.86; i++; continue; }
    const h = FLAT.has(k) ? 0.55 : 1; put(p, k, x, yy + (size * h) / 2, size, color); yy += size * h + size * 0.1;
  }
  return yy;
}
// cartucho vertical: o anel de corda com o nó (shen) embaixo
export function cartouche(p, keys, x, y, size, color, ring = '#2b1c10') {
  const y1 = column(p, keys, x, y + size * 0.4, size * 0.84, color);
  p.save(); p.strokeStyle = ring; p.lineWidth = Math.max(1.5, size * 0.1);
  p.beginPath(); p.roundRect(x - size * 0.62, y, size * 1.24, y1 - y + size * 0.2, size * 0.6); p.stroke();
  p.beginPath(); p.moveTo(x - size * 0.6, y1 + size * 0.38); p.lineTo(x + size * 0.6, y1 + size * 0.38); p.stroke();
  p.restore(); return y1 + size * 0.45;
}
function divider(p, x, y0, y1) { p.save(); p.fillStyle = 'rgba(40,26,14,0.6)'; p.fillRect(x - 0.6, y0, 1.2, y1 - y0); p.restore(); }
const BLUE = '#2c5d9c', GREEN = '#3d7f59', RED = '#a8492a', OCHRE = '#c98a3a', SKIN = '#9a4a28', WHITE = '#efe6d2', GOLD = '#d9a23e';

// Parede de templo (espaço 512 x 512): o céu (pt) no alto, duas cenas do rei diante de Ptah e a fórmula no rodapé
export function templeWall(p) {
  for (let x = 0; x < 512; x += 30) put(p, 'N001', x + 15, 40, 26, BLUE); // o céu
  const scene = (top, bottom, god, king, offer) => {
    // o rei à esquerda, virado para o deus; Ptah à direita; a mesa de oferendas entre os dois
    put(p, king, 124, bottom - 66, 132, SKIN, { mirror: true, shadow: true });
    put(p, god, 392, bottom - 70, 138, GREEN, { shadow: true });
    put(p, offer, 258, bottom - 46, 88, OCHRE, { shadow: true });
    // os nomes do rei acima dele: "o deus perfeito, senhor das Duas Terras", os dois cartuchos, "filho de Rá"
    const tz = top + 4, bz = top + 88;
    column(p, TXT.deusPerfeito, 36, tz, 15, BLUE); divider(p, 50, top, bz);
    cartouche(p, TXT.prenome, 68, tz, 15, BLUE); cartouche(p, TXT.nome, 102, tz, 14, BLUE);
    column(p, TXT.filhoDeRa, 134, tz, 15, BLUE); divider(p, 148, top, bz);
    column(p, TXT.senhorAparicoes, 166, tz, 15, GREEN); divider(p, 182, top, bz);
    // Ptah, senhor da verdade; e a fala do deus: "dou-te vida, estabilidade e domínio"
    column(p, TXT.ptah, 478, tz, 15, GREEN); divider(p, 462, top, bz);
    column(p, TXT.senhorVerdade, 446, tz, 15, BLUE); divider(p, 430, top, bz);
    column(p, TXT.vidaDominio, 330, tz, 15, RED); divider(p, 314, top, bz); divider(p, 346, top, bz);
    p.save(); p.fillStyle = '#2b1c10'; p.fillRect(0, bottom, 512, 3); p.restore(); // a linha de chão da cena
  };
  scene(58, 268, 'C019', 'A030', 'R002');
  scene(276, 484, 'C020', 'A023', 'R003');
  // faixa da oferenda no rodapé: "uma oferenda que o rei dá" e "vida, estabilidade, domínio"
  let x = 10; for (let k = 0; x < 490; k++) { for (const sgn of k % 2 ? TXT.vidaDominio : TXT.oferenda) { const f = FLAT.has(sgn); put(p, sgn, x + 7, 499, f ? 13 : 15, k % 2 ? RED : BLUE); x += f ? 13 : 16; } x += 10; }
}

// Parede do palácio: faixa com o protocolo do rei ("o deus perfeito, senhor das Duas Terras, senhor das aparições"),
// o nome no cartucho deitado e "dou-te vida, estabilidade e domínio"
export function palaceBand(p, y, w, size) {
  let x = 10;
  const seq = [...TXT.deusPerfeito, ...TXT.senhorAparicoes];
  while (x < w - size * 4) {
    for (const s of seq) { const f = FLAT.has(s); put(p, s, x + size * 0.5, y, f ? size * 0.8 : size, BLUE); x += size * (f ? 0.82 : 1.05); }
    const cw = size * 6.6; p.save(); p.strokeStyle = '#2b1c10'; p.lineWidth = 2; p.beginPath(); p.roundRect(x, y - size * 0.66, cw, size * 1.32, size * 0.62); p.stroke(); p.restore();
    let xx = x + size * 0.75; for (const s of TXT.prenome) { const f = FLAT.has(s); put(p, s, xx, y, size * (f ? 0.72 : 0.86), RED); xx += size * (f ? 0.76 : 0.98); }
    x += cw + size * 0.5;
    for (const s of TXT.vidaDominio) { put(p, s, x + size * 0.5, y, size, GREEN); x += size * 1.05; }
    x += size * 0.8;
  }
}

// Estela do Sonho de Tutmés IV (entre as patas da Esfinge, c. 1401 a.C.): no alto, sob o disco alado, o rei
// oferecendo à Esfinge deitada num pedestal, em duas cenas espelhadas; embaixo, as linhas do texto (aqui o começo,
// com os nomes do rei e a palavra "Esfinge", repetidos como as linhas da estela)
export function dreamStela(W = 512, H = 768) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const p = c.getContext('2d');
  p.fillStyle = '#8f5a4a'; p.fillRect(0, 0, W, H); // granito vermelho
  for (let i = 0; i < 9000; i++) { p.fillStyle = Math.random() < 0.5 ? 'rgba(30,20,20,0.35)' : 'rgba(230,200,190,0.25)'; p.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  p.save(); p.beginPath(); p.moveTo(0, 120); p.quadraticCurveTo(W / 2, -40, W, 120); p.lineTo(W, H); p.lineTo(0, H); p.clip();
  const ink = '#2a1a14', lite = '#e8d2b8';
  // disco alado
  p.fillStyle = '#c0392b'; p.beginPath(); p.arc(W / 2, 70, 22, 0, 7); p.fill();
  p.fillStyle = 'rgba(232,210,184,0.85)'; for (const sd of [-1, 1]) for (let i = 0; i < 12; i++) p.fillRect(W / 2 + sd * (26 + i * 12) - (sd < 0 ? 10 : 0), 62 + i * 1.5, 10, 18 - i);
  // as duas cenas: a Esfinge no pedestal e o rei oferecendo, espelhadas a partir do meio
  for (const sd of [-1, 1]) {
    put(p, 'E023', W / 2 + sd * 70, 200, 96, lite, { mirror: sd > 0, line: ink });
    p.fillStyle = lite; p.fillRect(W / 2 + sd * 70 - 50, 226, 100, 10);
    put(p, 'A030', W / 2 + sd * 190, 205, 92, lite, { mirror: sd < 0, line: ink });
    cartouche(p, TXT.prenome, W / 2 + sd * 140, 110, 14, lite, ink);
  }
  p.fillStyle = ink; p.fillRect(30, 262, W - 60, 3);
  // linhas de texto
  const lines = [[...TXT.deusPerfeito, ...TXT.filhoDeRa, ...TXT.vidaDominio], [...TXT.oferenda, ...TXT.senhorAparicoes, ...TXT.ptah], [...TXT.senhorVerdade, ...TXT.deusPerfeito, ...TXT.vidaDominio]];
  for (let r = 0; r < 13; r++) { let x = 40; const y = 292 + r * 34; for (const s of lines[r % 3]) { if (x > W - 50) break; const f = FLAT.has(s); put(p, s, x, y, f ? 20 : 24, lite, { line: ink }); x += f ? 20 : 26; } }
  p.restore();
  const t = c; return t;
}
