// Interface: carregamento, HUD, diário, diálogos, cartão de item, minimapa e mapa grande
import { OBJECTIVES, FINAL_REQ } from './quests.js';
import { terrainHeight, WATER_Y } from './terrain.js';
import { boxes } from '../comum/collision.js';

// mapa: 2 m por pixel, cobrindo x de -820 a 540 e z de -490 a 870
const MX0 = -820, MZ0 = -490, MS = 2, MP = 680;

const $ = (s) => document.querySelector(s);

const TIPS = [
  'O Parthenon levou só nove anos para ser construído (447–438 a.C.); as esculturas ficaram prontas em 432 a.C.',
  'Os templos gregos não eram brancos: frisos, frontões e estátuas eram pintados de azul, vermelho e dourado.',
  'Na assembleia (ekklesia), qualquer cidadão podia falar — mas mulheres, estrangeiros e escravos não votavam.',
  'Uma trirreme tinha 170 remadores em três fileiras, e muitos eram cidadãos pobres pagos pela cidade.',
  'A dracma de prata ateniense trazia Atena de um lado e a coruja do outro: o "dinheiro com coruja".',
  'As oliveiras eram sagradas para Atena: quem cortasse uma podia ser julgado e exilado.',
]

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
    // mostra os próximos objetivos pendentes; Péricles sempre aparece no fim
    const pending = OBJECTIVES.filter((o) => !q.isDone(o.id) && o.id !== 'pericles');
    const show = pending.slice(0, 5);
    if (!q.isDone('pericles')) show.push(OBJECTIVES.find((o) => o.id === 'pericles'));
    for (const o of show) {
      const li = document.createElement('li');
      let text = o.text;
      if (o.id === 'corujas') text += ` (${q.scarabsFound.size}/5)`;
      if (o.id === 'artefatos') text += ` (${q.artifactCount || 0}/20)`;
      if (o.id === 'pericles' && !q.finalUnlocked()) { text += ` — conclua ${FINAL_REQ} objetivos (${q.count()}/${FINAL_REQ})`; li.className = 'locked'; }
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
  buildMapBackground(labels) {
    const S = MP, c = document.createElement('canvas'); c.width = c.height = S;
    const ctx = c.getContext('2d'), img = ctx.createImageData(S, S);
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const x = MX0 + px * MS, z = MZ0 + py * MS, h = terrainHeight(x, z);
      let r, g, b;
      if (h < WATER_Y - 0.05) { const dep = Math.min(1, -h / 14); r = 60 - dep * 30; g = 140 - dep * 50; b = 170 - dep * 30; }
      else if (h < 2.2) { r = 226; g = 208; b = 160; }
      else { const k = Math.min(1, Math.max(0, (h - 8) / 45)); r = 196 - k * 40; g = 178 - k * 30; b = 128 - k * 30; }
      const i = (py * S + px) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    ctx.fillStyle = 'rgba(80,50,25,0.8)';
    for (const bx of boxes) {
      const gy = terrainHeight((bx.minX + bx.maxX) / 2, (bx.minZ + bx.maxZ) / 2);
      if (bx.top - gy < 1.6 || bx.bottom > gy + 3) continue;
      ctx.fillRect((bx.minX - MX0) / MS, (bx.minZ - MZ0) / MS, Math.max(1, (bx.maxX - bx.minX) / MS), Math.max(1, (bx.maxZ - bx.minZ) / MS));
    }
    this.mapBg = c; this.labels = labels || [];
  }
  drawMinimap(player, npcs, hints) {
    const cv = $('#minimap'), ctx = cv.getContext('2d');
    const W = cv.width, scale = 1.1, view = W / scale; // metros visíveis
    ctx.clearRect(0, 0, W, W);
    const px = player.pos.x, pz = player.pos.z;
    ctx.drawImage(this.mapBg, (px - MX0 - view / 2) / MS, (pz - MZ0 - view / 2) / MS, view / MS, view / MS, 0, 0, W, W);
    const toPx = (x, z) => [(x - px) * scale + W / 2, (z - pz) * scale + W / 2];
    for (const h of hints) {
      const [x, y] = toPx(h[0], h[1]); const cx = Math.max(10, Math.min(W - 10, x)), cy = Math.max(10, Math.min(W - 10, y));
      ctx.fillStyle = '#ffcc33'; ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill(); ctx.stroke();
    }
    for (const n of npcs) { const [x, y] = toPx(n.x, n.z); if (x < 0 || y < 0 || x > W || y > W) continue; ctx.fillStyle = n.done ? '#d8c8a0' : '#ffd36a'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(W / 2, W / 2); ctx.rotate(-player.facing + Math.PI);
    ctx.fillStyle = '#c0392b'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 3); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  toggleBigMap(player, hints) {
    const el = $('#bigmap'); el.hidden = !el.hidden;
    if (el.hidden) return false;
    const cv = $('#bigmap-canvas'), ctx = cv.getContext('2d'), W = cv.width, k = W / MP;
    ctx.drawImage(this.mapBg, 0, 0, MP, MP, 0, 0, W, W);
    const toPx = (x, z) => [((x - MX0) / MS) * k, ((z - MZ0) / MS) * k];
    ctx.font = '600 14px Cinzel, Georgia, serif'; ctx.textAlign = 'center';
    for (const [t, x, z] of this.labels) { const [lx, ly] = toPx(x, z); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,245,220,0.85)'; ctx.strokeText(t, lx, ly); ctx.fillStyle = '#3a2410'; ctx.fillText(t, lx, ly); }
    for (const h of hints) { const [x, y] = toPx(h[0], h[1]); ctx.fillStyle = '#ffcc33'; ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); ctx.stroke(); }
    const [x, y] = toPx(player.pos.x, player.pos.z);
    ctx.save(); ctx.translate(x, y); ctx.rotate(-player.facing + Math.PI);
    ctx.fillStyle = '#c0392b'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, 9); ctx.lineTo(0, 4); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    return true;
  }
}
