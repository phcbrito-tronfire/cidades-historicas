// Interface: carregamento, HUD, diário, diálogos, cartão de item, minimapa e mapa grande
import { OBJECTIVES, PHARAOH_REQ } from './quests.js';
import { terrainHeight, riverX, LAKE } from './terrain.js';
import { boxes } from './collision.js';

const $ = (s) => document.querySelector(s);

const TIPS = [
  'O Nilo corre para o norte. Por isso o Alto Egito fica ao sul e o Baixo Egito, ao norte.',
  'Em 1250 a.C. as pirâmides de Gizé já tinham mais de 1.200 anos.',
  'Os egípcios chamavam sua terra de Kemet, a "Terra Negra", por causa do lodo fértil do Nilo.',
  'Pão e cerveja eram a base da dieta — e do salário — dos trabalhadores.',
  'Os gatos eram protegidos pela deusa Bastet. Em egípcio, gato se dizia "miu".',
  'Ramsés II reinou por 66 anos e teve mais de cem filhos.',
];

export class UI {
  constructor() {
    this.toastsEl = $('#toasts');
    $('#load-tip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
    this.journalOpen = true;
    this.dialogState = null;
    this.mapBg = null;
    addEventListener('keydown', (e) => this.dialogKeys(e));
  }

  progress(frac, text) { $('#load-fill').style.width = `${Math.round(frac * 100)}%`; if (text) $('#load-step').textContent = text; }
  doneLoading() { $('#loading').hidden = true; }
  showIntro(onStart) {
    $('#intro').hidden = false;
    $('#btn-start').onclick = () => { $('#intro').hidden = true; $('#hud').hidden = false; onStart(); };
  }
  fail(msg) { $('#loading').hidden = true; $('#fallback').hidden = false; if (msg) $('#fallback-text').textContent = msg; }

  toast(text, kind = '', ms = 4200) {
    const el = document.createElement('div');
    el.className = `toast ${kind}`; el.textContent = text;
    this.toastsEl.appendChild(el);
    while (this.toastsEl.children.length > 4) this.toastsEl.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 600); }, ms);
  }

  prompt(html) {
    const el = $('#prompt');
    if (!html) { el.hidden = true; return; }
    if (el.innerHTML !== html) el.innerHTML = html;
    el.hidden = false;
  }
  setPlace(name) { const el = $('#loc-place'); if (el.textContent !== name) el.textContent = name; }
  setTime(label) { $('#loc-time').textContent = label; }
  setHand(item) {
    const el = $('#hand');
    if (!item) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `Na mão: <b>${item.name}</b> · <kbd>P</kbd> soltar${item.food ? ' · <kbd>R</kbd> comer' : ' · <kbd>R</kbd> usar'}`;
  }
  itemCard(item) {
    const el = $('#itemcard');
    el.querySelector('.ic-name').textContent = item.name;
    el.querySelector('.ic-desc').textContent = item.desc;
    el.hidden = false;
    clearTimeout(this._icT);
    this._icT = setTimeout(() => (el.hidden = true), 7000);
  }

  toggleJournal() { this.journalOpen = !this.journalOpen; $('#journal').hidden = !this.journalOpen; }
  renderObjectives(q) {
    const ul = $('#j-list');
    ul.innerHTML = '';
    const n = OBJECTIVES.filter((o) => q.isDone(o.id)).length;
    // mostra os próximos objetivos pendentes; o faraó sempre aparece no fim
    const pending = OBJECTIVES.filter((o) => !q.isDone(o.id) && o.id !== 'farao');
    const show = pending.slice(0, 5);
    if (!q.isDone('farao')) show.push(OBJECTIVES.find((o) => o.id === 'farao'));
    for (const o of show) {
      const li = document.createElement('li');
      let text = o.text;
      if (o.id === 'escaravelhos') text += ` (${q.scarabsFound.size}/5)`;
      if (o.id === 'artefatos') text += ` (${q.artifactCount || 0}/20)`;
      if (o.id === 'farao' && !q.pharaohUnlocked()) { text += ` — conclua ${PHARAOH_REQ} objetivos (${q.count()}/${PHARAOH_REQ})`; li.className = 'locked'; }
      li.textContent = text;
      ul.appendChild(li);
    }
    if (pending.length > 5) { const li = document.createElement('li'); li.className = 'locked'; li.textContent = `...e mais ${pending.length - 5} objetivos`; ul.appendChild(li); }
    if (!show.length) { const li = document.createElement('li'); li.className = 'done'; li.textContent = 'Todos os objetivos concluídos!'; ul.appendChild(li); }
    $('#j-count').textContent = `${n}/${OBJECTIVES.length}`;
  }

  // ---------------- diálogo ----------------
  get dialogOpen() { return !!this.dialogState; }
  openDialog({ name, title }) {
    $('#dialog').hidden = false;
    $('#d-name').textContent = name; $('#d-title').textContent = title || '';
    this.dialogState = { typing: null };
  }
  closeDialog() { $('#dialog').hidden = true; clearInterval(this.dialogState?.typing); this.dialogState = null; }
  say(text, options) {
    const st = this.dialogState; if (!st) return;
    clearInterval(st.typing);
    const el = $('#d-text');
    const box = $('#d-options');
    box.innerHTML = '';
    let i = 0;
    st.full = text; st.options = options;
    const showOptions = () => {
      box.innerHTML = '';
      options.forEach((o, idx) => {
        const b = document.createElement('button');
        b.innerHTML = `<span class="n">${idx + 1}.</span>${o.label}`;
        if (o.read) b.classList.add('read');
        if (o.special) b.classList.add('special');
        b.onclick = () => o.cb();
        box.appendChild(b);
      });
    };
    st.finish = () => { clearInterval(st.typing); st.typing = null; el.textContent = text; showOptions(); };
    el.textContent = '';
    st.typing = setInterval(() => {
      i += 2;
      el.textContent = text.slice(0, i);
      if (i >= text.length) st.finish();
    }, 14);
  }
  dialogKeys(e) {
    const st = this.dialogState; if (!st) return;
    if (st.typing && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE')) { st.finish(); e.preventDefault(); return; }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= (st.options?.length || 0) && !st.typing) { st.options[n - 1].cb(); e.preventDefault(); return; }
    if ((e.code === 'Space' || e.code === 'Enter') && !st.typing && st.options?.length === 1) { st.options[0].cb(); e.preventDefault(); }
    if (e.code === 'Escape') { const last = st.options?.[st.options.length - 1]; if (last) last.cb(); e.preventDefault(); e.stopImmediatePropagation(); }
  }

  // ---------------- mapas ----------------
  buildMapBackground() {
    const S = 800, step = 2;
    const c = document.createElement('canvas'); c.width = c.height = S;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S);
    for (let py = 0; py < S; py += step) {
      for (let px = 0; px < S; px += step) {
        const x = px - 400, z = py - 400;
        const h = terrainHeight(x, z);
        const d = x - riverX(z);
        let r, g, b;
        const inLake = x > LAKE.x0 && x < LAKE.x1 && z > LAKE.z0 && z < LAKE.z1;
        if (h < -0.05 || inLake) { r = 40; g = 110; b = 130; }
        else if (d > 48 && d < 150) { r = 120; g = 150; b = 70; }
        else if (d < 0 && d > -75) { r = 150; g = 140; b = 95; }
        else { const k = Math.min(1, Math.max(0, (h - 1) / 12)); r = 214 - k * 30; g = 184 - k * 30; b = 132 - k * 30; }
        for (let yy = 0; yy < step; yy++) for (let xx = 0; xx < step; xx++) {
          const i = ((py + yy) * S + px + xx) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    ctx.fillStyle = 'rgba(80,50,25,0.85)';
    for (const bx of boxes) {
      if (bx.top - terrainHeight((bx.minX + bx.maxX) / 2, (bx.minZ + bx.maxZ) / 2) < 1.6 || bx.bottom > 3) continue;
      ctx.fillRect(bx.minX + 400, bx.minZ + 400, Math.max(1, bx.maxX - bx.minX), Math.max(1, bx.maxZ - bx.minZ));
    }
    this.mapBg = c;
  }
  drawPyramids(ctx, pyr, toPx, scale) {
    for (const p of [pyr.khufu, pyr.khafre, pyr.menk]) {
      const [x, y] = toPx(p.x, p.z), h = p.half * scale;
      ctx.fillStyle = '#f2e6c8'; ctx.strokeStyle = '#7a5a30'; ctx.lineWidth = 1;
      ctx.fillRect(x - h, y - h, h * 2, h * 2); ctx.strokeRect(x - h, y - h, h * 2, h * 2);
      ctx.beginPath(); ctx.moveTo(x - h, y - h); ctx.lineTo(x + h, y + h); ctx.moveTo(x + h, y - h); ctx.lineTo(x - h, y + h); ctx.stroke();
    }
  }
  drawMinimap(player, npcs, hints, pyr) {
    const cv = $('#minimap'); const ctx = cv.getContext('2d');
    const W = cv.width, scale = 1.25, view = W / scale;
    ctx.clearRect(0, 0, W, W);
    const px = player.pos.x, pz = player.pos.z;
    ctx.drawImage(this.mapBg, px + 400 - view / 2, pz + 400 - view / 2, view, view, 0, 0, W, W);
    const toPx = (x, z) => [(x - px) * scale + W / 2, (z - pz) * scale + W / 2];
    this.drawPyramids(ctx, pyr, toPx, scale);
    for (const h of hints) {
      const [x, y] = toPx(h[0], h[1]);
      const cx = Math.max(10, Math.min(W - 10, x)), cy = Math.max(10, Math.min(W - 10, y));
      ctx.fillStyle = '#ffcc33'; ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill(); ctx.stroke();
    }
    for (const n of npcs) {
      const [x, y] = toPx(n.x, n.z);
      if (x < 0 || y < 0 || x > W || y > W) continue;
      ctx.fillStyle = n.done ? '#d8c8a0' : '#ffd36a'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
    }
    // jogador
    ctx.save(); ctx.translate(W / 2, W / 2); ctx.rotate(-player.facing + Math.PI);
    ctx.fillStyle = '#c0392b'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 3); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  toggleBigMap(player, hints, pyr) {
    const el = $('#bigmap');
    el.hidden = !el.hidden;
    if (el.hidden) return false;
    const cv = $('#bigmap-canvas'); const ctx = cv.getContext('2d');
    const W = cv.width, scale = W / 800;
    ctx.drawImage(this.mapBg, 0, 0, 800, 800, 0, 0, W, W);
    const toPx = (x, z) => [(x + 400) * scale, (z + 400) * scale];
    this.drawPyramids(ctx, pyr, toPx, scale);
    const labels = [
      ['Templo de Ptah', -40, -26], ['Mercado', 66, 22], ['Cais', 128, 34], ['Palácio Real', 20, -168], ['Quartel', 66, -108],
      ['Pirâmides de Gizé', -250, 200], ['Esfinge', -158, 8], ['Rio Nilo', 160, -250], ['Campos de Tiy', 235, -45], ['Bairro Norte', -40, 150], ['Bairro Sul', -60, -200], ['Lago Sagrado', -32, -70], ['Canteiro de Hori', -185, -28],
    ];
    ctx.font = '600 15px Cinzel, Georgia, serif'; ctx.textAlign = 'center';
    for (const [t, x, z] of labels) { const [lx, ly] = toPx(x, z); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,245,220,0.85)'; ctx.strokeText(t, lx, ly); ctx.fillStyle = '#3a2410'; ctx.fillText(t, lx, ly); }
    for (const h of hints) { const [x, y] = toPx(h[0], h[1]); ctx.fillStyle = '#ffcc33'; ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); ctx.stroke(); }
    const [x, y] = toPx(player.pos.x, player.pos.z);
    ctx.save(); ctx.translate(x, y); ctx.rotate(-player.facing + Math.PI);
    ctx.fillStyle = '#c0392b'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, 9); ctx.lineTo(0, 4); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    return true;
  }
}
