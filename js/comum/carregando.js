// A tela de carregamento: as curiosidades da cidade vão se revezando enquanto se espera, e na primeira visita um
// aviso diz por que demora mais. Quem espera vendo algo mudar não acha que travou.
const KEY = 'ch-carregou-' + (location.pathname.split('/').pop() || 'cidade');

export function startLoadingScreen(tips) {
  const tip = document.getElementById('load-tip');
  if (tip && tips.length) tip.textContent = tips[Math.floor(Math.random() * tips.length)];
  let first = true; try { first = !localStorage.getItem(KEY); } catch (e) { /* navegação privada */ }
  if (first && tip) {
    const note = document.createElement('p'); note.className = 'load-note';
    note.textContent = 'A primeira viagem demora mais, porque o navegador baixa e prepara tudo. Nas próximas, ele já terá quase tudo guardado.';
    tip.after(note);
  }
  let i = Math.floor(Math.random() * tips.length);
  const id = setInterval(() => {
    if (!tip || !tips.length) return;
    tip.classList.add('trocando');
    setTimeout(() => { i = (i + 1) % tips.length; tip.textContent = tips[i]; tip.classList.remove('trocando'); }, 400);
  }, 9000);
  return () => { clearInterval(id); try { localStorage.setItem(KEY, '1'); } catch (e) { /* */ } };
}
