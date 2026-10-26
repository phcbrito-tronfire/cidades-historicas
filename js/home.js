// Tela de entrada: céu animado e cartões das cidades
const CITIES = [
  { id: 'egito', name: 'Mênfis', era: 'Egito Antigo · c. 1250 a.C.', desc: 'O templo de Ptah, as pirâmides de Gizé, o Nilo e a corte de Ramsés II.', open: true, href: 'egito.html', art: 'egypt' },
  { id: 'roma', name: 'Roma', era: 'Império Romano · c. 117 d.C.', desc: 'O Fórum, o Coliseu e as termas no auge do império, sob Trajano.', art: 'rome' },
  { id: 'atenas', name: 'Atenas', era: 'Grécia Clássica · 432 a.C.', desc: 'O Parthenon recém-terminado, a ágora de Sócrates, o mar do Falero e as trirremes de Péricles.', open: true, href: 'atenas.html', art: 'athens' },
  { id: 'tenochtitlan', name: 'Tenochtitlan', era: 'Império Asteca · c. 1500', desc: 'A cidade sobre o lago Texcoco, com o Templo Mayor e os jardins flutuantes.', art: 'aztec' },
  { id: 'babilonia', name: 'Babilônia', era: 'Mesopotâmia · c. 570 a.C.', desc: 'A Porta de Ishtar, o zigurate Etemenanki e a corte de Nabucodonosor II.', art: 'babylon' },
  { id: 'cusco', name: 'Cusco', era: 'Império Inca · c. 1500', desc: 'O umbigo do mundo andino, o Coricancha dourado e a estrada para Machu Picchu.', art: 'inca' },
  { id: 'constantinopla', name: 'Constantinopla', era: 'Império Bizantino · c. 550 d.C.', desc: 'A recém-erguida Santa Sofia, o Hipódromo e a corte de Justiniano.', art: 'byzantium' },
  { id: 'changan', name: "Chang'an", era: 'Dinastia Tang · c. 750 d.C.', desc: 'A maior cidade do mundo, ponto final da Rota da Seda.', art: 'tang' },
];

const sky = (a, b, c) => `<defs><linearGradient id="g${a.slice(1)}${b.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="0.6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs><rect width="400" height="210" fill="url(#g${a.slice(1)}${b.slice(1)})"/>`;
const ART = {
  egypt: `${sky('#2a3d7a', '#f0a25a', '#ffd98a')}<circle cx="300" cy="120" r="34" fill="#fff1c2" opacity="0.9"/>
    <path d="M30 175 L120 70 L210 175Z" fill="#e9d6a8"/><path d="M120 70 L210 175 L140 175Z" fill="#c9ab72"/>
    <path d="M110 80 L120 70 L130 80Z" fill="#ffd34a"/>
    <path d="M190 175 L250 108 L310 175Z" fill="#ddc58e"/><path d="M250 108 L310 175 L265 175Z" fill="#b8955c"/>
    <path d="M295 175 L322 145 L350 175Z" fill="#d6bc84"/>
    <rect x="0" y="175" width="400" height="35" fill="#c9a35e"/><path d="M0 190 Q100 182 200 192 T400 188 V210 H0Z" fill="#1f6f72"/>
    <g fill="#2a3a18"><path d="M350 175 v-34 M350 141 l-14 6 M350 141 l14 6 M350 141 l-10 -8 M350 141 l10 -8" stroke="#3a4a1a" stroke-width="3"/></g>`,
  rome: `${sky('#3a5a8c', '#e8a878', '#f3d3a0')}<g fill="#cdb497"><path d="M70 180 V95 Q200 60 330 95 V180Z"/></g>
    <g fill="#8a6a50">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${88 + i * 34}" y="112" width="18" height="26" rx="9"/><rect x="${88 + i * 34}" y="146" width="18" height="30" rx="9"/>`).join('')}</g>
    <rect x="0" y="180" width="400" height="30" fill="#7a6a58"/>`,
  athens: `${sky('#2f6fb3', '#9cc8e8', '#e8f0e0')}<path d="M0 210 V160 Q120 120 200 130 T400 165 V210Z" fill="#9a8a64"/>
    <g fill="#f2ead8"><path d="M110 100 L200 75 L290 100Z"/><rect x="110" y="100" width="180" height="8"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${116 + i * 22}" y="108" width="10" height="34"/>`).join('')}<rect x="104" y="142" width="192" height="8"/></g>`,
  aztec: `${sky('#1e4a6a', '#e89a5a', '#f4c88a')}<rect x="0" y="170" width="400" height="40" fill="#2f7a78"/>
    <g fill="#b89a74"><path d="M110 170 L130 140 H270 L290 170Z"/><path d="M135 140 L150 115 H250 L265 140Z"/><path d="M155 115 L168 92 H232 L245 115Z"/></g>
    <rect x="172" y="70" width="24" height="22" fill="#2c5d9c"/><rect x="204" y="70" width="24" height="22" fill="#a8392a"/>
    <path d="M190 170 V95 H210 V170Z" fill="#8a6a4a"/>`,
  babylon: `${sky('#1d2a5a', '#d88a4a', '#f0c070')}<rect x="0" y="178" width="400" height="32" fill="#a8885a"/>
    <g fill="#2a5aa8"><rect x="120" y="80" width="160" height="100"/><rect x="110" y="70" width="40" height="110"/><rect x="250" y="70" width="40" height="110"/></g>
    <path d="M175 180 V125 Q200 100 225 125 V180Z" fill="#1a1208"/>
    <g fill="#e8c060">${[0, 1, 2, 3, 4].map((i) => `<rect x="${130 + i * 30}" y="95" width="16" height="10"/>`).join('')}</g>`,
  inca: `${sky('#3a6aa8', '#a8c8e0', '#e8e0c8')}<path d="M0 210 V120 L80 60 L150 110 L220 40 L300 100 L400 70 V210Z" fill="#4a6a3a"/>
    <g fill="#9a907a">${[0, 1, 2, 3].map((i) => `<rect x="${120 + i * 10}" y="${130 + i * 12}" width="${170 - i * 20}" height="10"/>`).join('')}</g>
    <path d="M0 210 V175 H400 V210Z" fill="#6a7a4a"/>`,
  byzantium: `${sky('#2a3a6a', '#c8806a', '#f0c8a0')}<rect x="0" y="178" width="400" height="32" fill="#6a5a4a"/>
    <path d="M120 178 V120 H280 V178Z" fill="#c89a7a"/><path d="M140 120 Q200 50 260 120Z" fill="#d8aa86"/>
    <path d="M100 178 V140 Q120 115 140 140 V178Z" fill="#b8886a"/><path d="M260 178 V140 Q280 115 300 140 V178Z" fill="#b8886a"/>
    <rect x="196" y="58" width="8" height="12" fill="#e8c060"/>`,
  tang: `${sky('#2a3a5a', '#d87a5a', '#f0b88a')}<rect x="0" y="180" width="400" height="30" fill="#5a4a3a"/>
    <g fill="#8a2a1e"><rect x="150" y="120" width="100" height="60"/><rect x="165" y="80" width="70" height="30"/></g>
    <g fill="#2a2218"><path d="M120 125 Q200 95 280 125 L270 118 Q200 92 130 118Z"/><path d="M140 85 Q200 58 260 85 L250 78 Q200 55 150 78Z"/></g>`,
};

function card(c) {
  const el = document.createElement(c.open ? 'a' : 'div');
  el.className = `card ${c.open ? 'open' : 'locked'}`;
  if (c.open) el.href = c.href;
  el.innerHTML = `
    <div class="art"><svg viewBox="0 0 400 210" preserveAspectRatio="xMidYMid slice">${ART[c.art]}</svg>${c.open ? '' : '<div class="badge">Em produção</div>'}</div>
    <div class="body">
      <div class="era">${c.era}</div>
      <h3>${c.name}</h3>
      <p>${c.desc}</p>
      ${c.open ? '<span class="go">Explorar →</span>' : '<div class="soon">Em breve</div>'}
    </div>`;
  return el;
}
const grid = document.getElementById('grid');
CITIES.forEach((c) => grid.appendChild(card(c)));

// céu: do anoitecer ao dourado, estrelas e poeira dourada flutuando
const cv = document.getElementById('sky');
const ctx = cv.getContext('2d');
let W, H, stars, dust;
function resize() {
  W = cv.width = innerWidth * Math.min(devicePixelRatio, 2);
  H = cv.height = innerHeight * Math.min(devicePixelRatio, 2);
  stars = Array.from({ length: 220 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.6, r: Math.random() * 1.4 + 0.3, p: Math.random() * 6 }));
  dust = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2.2 + 0.5, vx: (Math.random() - 0.3) * 0.25, vy: -Math.random() * 0.25 - 0.05, a: Math.random() }));
}
resize();
addEventListener('resize', resize);
function frame(t) {
  const s = scrollY / Math.max(1, innerHeight);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b0d22');
  g.addColorStop(0.45, '#2a1838');
  g.addColorStop(0.75, `rgba(${170 - s * 60},${80 - s * 30},${40},1)`);
  g.addColorStop(1, '#e8a050');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // sol nascendo atrás do horizonte
  const sg = ctx.createRadialGradient(W * 0.5, H * 1.02, 10, W * 0.5, H * 1.02, H * 0.7);
  sg.addColorStop(0, 'rgba(255,230,160,0.85)'); sg.addColorStop(0.3, 'rgba(255,170,80,0.35)'); sg.addColorStop(1, 'rgba(255,150,60,0)');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
  for (const st of stars) {
    ctx.globalAlpha = (0.4 + Math.sin(t / 900 + st.p) * 0.35) * (1 - st.y / (H * 0.6));
    ctx.fillStyle = '#fff6e0'; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 7); ctx.fill();
  }
  for (const d of dust) {
    d.x += d.vx; d.y += d.vy; if (d.y < -10) { d.y = H + 10; d.x = Math.random() * W; } if (d.x > W + 10) d.x = -10;
    ctx.globalAlpha = 0.25 + Math.sin(t / 700 + d.a * 6) * 0.2;
    ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
