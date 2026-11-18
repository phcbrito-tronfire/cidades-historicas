// "Perguntas sobre a cidade": oito perguntas de múltipla escolha por cidade, sobre o que o aluno viu e ouviu andando
// por ela (artefatos, conversas, lugares). Cada resposta mostra uma explicação curta, certa ou errada; no fim, o
// resultado e a melhor marca até ali (guardada no navegador). Abre pelo menu de pausa (Esc) e no fim da jornada.
// As alternativas aparecem em ordem embaralhada a cada vez.

const Q = {
  egito: [
    { q: 'Como se chamava a estação da cheia do Nilo, quando a água cobria os campos?', a: ['Akhet', 'Peret', 'Shemu', 'Kemet'], c: 0, e: 'Akhet era a cheia (de julho a outubro). Depois vinham Peret, quando se plantava, e Shemu, a colheita.' },
    { q: 'Os egípcios chamavam o seu país de Kemet. O que quer dizer?', a: ['A terra negra', 'O rio sagrado', 'A casa do faraó', 'O deserto vermelho'], c: 0, e: '"A terra negra": o lodo escuro que a cheia deixava nos campos era o que tornava a terra tão fértil.' },
    { q: 'Para que servia o shaduf, a vara com um balde numa ponta e um peso na outra?', a: ['Para tirar água do rio e dos canais e regar os campos', 'Para pescar no Nilo', 'Para erguer os blocos das pirâmides', 'Para medir a altura da cheia'], c: 0, e: 'O peso ajudava a erguer o balde cheio. Com ele, um homem regava as hortas o ano todo, mesmo longe da cheia.' },
    { q: 'Quem reinava no Egito por volta de 1250 a.C., a época de Mênfis no jogo?', a: ['Ramsés II', 'Tutancâmon', 'Cleópatra', 'Quéops'], c: 0, e: 'Ramsés II reinou por 66 anos (1279–1213 a.C.). Quéops, o das pirâmides, viveu mais de mil anos antes dele.' },
    { q: 'Que deus tinha cabeça de crocodilo?', a: ['Sobek', 'Ptah', 'Anúbis', 'Hórus'], c: 0, e: 'Sobek, senhor das águas. Os egípcios o adoravam justamente porque temiam os crocodilos do rio.' },
    { q: 'Ptah, o deus do grande templo de Mênfis, era o deus de quem?', a: ['Dos artesãos e da criação', 'Dos mortos', 'Da guerra', 'Do sol'], c: 0, e: 'Ptah criava o mundo com o coração e a palavra, e protegia escultores, pedreiros e ourives.' },
    { q: 'O que era a khopesh?', a: ['Uma espada curva de bronze', 'Um escudo de couro de boi', 'Um barco de papiro', 'Um tipo de pão'], c: 0, e: 'A lâmina em gancho, de bronze, era a arma típica do exército egípcio do Novo Império.' },
    { q: 'Quem construiu as pirâmides de Gizé, pelo que os arqueólogos encontraram?', a: ['Trabalhadores egípcios organizados em turmas, com comida e alojamento', 'Escravos estrangeiros acorrentados', 'Os soldados de Ramsés II', 'Ninguém sabe nada sobre isso'], c: 0, e: 'Perto das pirâmides acharam a vila dos trabalhadores, suas padarias e túmulos: eram equipes egípcias, que se revezavam.' },
  ],
  atenas: [
    { q: 'Como se chamava a assembleia em que os cidadãos de Atenas votavam as leis?', a: ['Eclésia', 'Senado', 'Ágora', 'Areópago'], c: 0, e: 'A eclésia (ekklesia) se reunia na colina da Pnyx; milhares de cidadãos votavam com a mão levantada.' },
    { q: 'Quem podia votar na assembleia de Atenas?', a: ['Os homens adultos filhos de pai e mãe atenienses', 'Todos os moradores da cidade', 'Homens e mulheres atenienses', 'Só os ricos'], c: 0, e: 'Mulheres, escravos e estrangeiros (os metecos) ficavam de fora: a democracia ateniense era de uma minoria.' },
    { q: 'A quem era dedicado o Partenon?', a: ['A Atena', 'A Zeus', 'A Apolo', 'A Péricles'], c: 0, e: 'Atena Pártenos, a protetora da cidade. A grande estátua de ouro e marfim, de Fídias, ficava lá dentro.' },
    { q: 'O que era o ostracismo?', a: ['Uma votação para exilar alguém por dez anos, escrevendo o nome num caco de cerâmica', 'Uma prova de atletismo', 'Um imposto sobre o azeite', 'A festa de Dionísio'], c: 0, e: 'O nome era riscado num óstraco (caco de pote). Quem tivesse mais votos saía da cidade por dez anos, sem perder os bens.' },
    { q: 'O que acontecia na ágora?', a: ['Mercado, tribunais, conselho e conversa: era o centro da vida da cidade', 'Só as corridas de cavalo', 'Só os sacrifícios no templo', 'Era o porto dos navios'], c: 0, e: 'Na ágora se comprava, se julgava, se reunia o conselho — e Sócrates conversava com quem passasse.' },
    { q: 'O que era uma trirreme?', a: ['Um navio de guerra com três fileiras de remadores', 'Um carro de três cavalos', 'Um templo de três colunas', 'Uma moeda de prata'], c: 0, e: 'Cerca de 170 remadores, muitos deles cidadãos pobres. A frota fez de Atenas uma potência do mar.' },
    { q: 'Como lutava o hoplita, o soldado grego?', a: ['Em fileiras cerradas (a falange), com escudo redondo e lança', 'A cavalo, com arco e flecha', 'Sozinho, com duas espadas', 'Em carros de guerra'], c: 0, e: 'Cada escudo protegia também o vizinho: na falange, ninguém podia fugir sem abrir um buraco na linha.' },
    { q: 'Em 432 a.C., quem era o político mais influente de Atenas?', a: ['Péricles', 'Alexandre, o Grande', 'Sócrates', 'Sólon'], c: 0, e: 'Péricles, eleito estratego ano após ano, comandou as obras da Acrópole. Sólon viveu cem anos antes; Alexandre, cem depois.' },
  ],
  roma: [
    { q: 'Quem era o imperador de Roma em 117 d.C.?', a: ['Trajano', 'Júlio César', 'Nero', 'Constantino'], c: 0, e: 'Trajano, o imperador em que o império chegou ao maior tamanho. Morreu justamente em agosto de 117.' },
    { q: 'Como os romanos chamavam o Coliseu?', a: ['Anfiteatro Flávio', 'Circo Máximo', 'Panteão', 'Fórum'], c: 0, e: 'Foi construído pelos imperadores da família Flávia (Vespasiano, Tito e Domiciano). "Coliseu" veio depois, talvez da estátua colossal ao lado.' },
    { q: 'O que era a venatio?', a: ['A caçada às feras na arena', 'A corrida de bigas', 'O banho nas termas', 'A batalha naval'], c: 0, e: 'Leões, tigres, ursos e até elefantes eram trazidos de todo o império para as caçadas da manhã.' },
    { q: 'Quando a plateia gritava "Missio!", o que pedia?', a: ['Que o gladiador vencido fosse poupado', 'Que a luta recomeçasse', 'Que soltassem as feras', 'Que o imperador falasse'], c: 0, e: 'Gladiadores custavam caro para treinar: a maioria dos vencidos saía viva da arena.' },
    { q: 'O que significava receber a rudis, a espada de madeira?', a: ['A liberdade: o gladiador deixava de lutar', 'Que ele seria castigado', 'Que era um aprendiz', 'Que ganhara uma corrida'], c: 0, e: 'Era o prêmio máximo de um gladiador. Alguns libertos continuavam no ofício como treinadores ou árbitros.' },
    { q: 'Para que serviam os aquedutos?', a: ['Para trazer água de longe até as fontes, as termas e as casas', 'Para defender a cidade', 'Para levar os navios até o Tibre', 'Para guardar o trigo'], c: 0, e: 'A água descia por gravidade por dezenas de quilômetros, quase sempre em canais subterrâneos e, perto da cidade, sobre arcos.' },
    { q: 'Onde aconteciam as corridas de bigas?', a: ['No Circo Máximo', 'No Coliseu', 'No Fórum de Trajano', 'Nas termas'], c: 0, e: 'O Circo Máximo cabia cerca de 150 mil pessoas, torcendo pelas facções: Verdes, Azuis, Brancos e Vermelhos.' },
    { q: 'Onde morava a maior parte do povo de Roma?', a: ['Nas insulae, prédios de apartamentos de vários andares', 'Em casas com jardim (domus)', 'Em tendas fora das muralhas', 'Nos templos'], c: 0, e: 'Embaixo ficavam as lojas; quanto mais alto o andar, mais pobre o morador — e maior o risco de incêndio.' },
  ],
  japao: [
    { q: 'Por volta de 1790, quem governava o Japão de fato?', a: ['O xogum Tokugawa, de Edo', 'O imperador, de Quioto', 'Os comerciantes de Osaka', 'Os monges budistas'], c: 0, e: 'O imperador era venerado em Quioto, mas quem governava era o xogum Tokugawa, de Edo (a atual Tóquio).' },
    { q: 'Como os camponeses pagavam o imposto ao seu senhor?', a: ['Em arroz', 'Em moedas de ouro', 'Em seda', 'Em dias de trabalho na guerra'], c: 0, e: 'O imposto (nengu) era uma parte da colheita. A riqueza de um senhor era medida em koku, a quantidade de arroz para uma pessoa por um ano.' },
    { q: 'O que marca a entrada de um santuário xintoísta?', a: ['O torii, o portal de dois pilares e duas vigas', 'Um pagode de cinco andares', 'Uma estátua de Buda', 'Um sino de bronze'], c: 0, e: 'Passar pelo torii é deixar o mundo comum e entrar no espaço dos kami, os espíritos.' },
    { q: 'Por que tantos peregrinos subiam o Monte Fuji?', a: ['Porque a montanha era sagrada, morada da deusa Konohana-sakuya-hime', 'Para procurar ouro', 'Para fugir dos impostos', 'Para vigiar o mar'], c: 0, e: 'As confrarias de peregrinos (Fuji-kō) subiam vestidas de branco, de cabana em cabana, até a cratera.' },
    { q: 'Em 1790 fazia quase 200 anos que não havia guerra no Japão. O que faziam os samurais?', a: ['Viraram administradores e funcionários, mas seguiam treinando a espada', 'Viraram camponeses', 'Foram proibidos de usar espadas', 'Partiram para conquistar a China'], c: 0, e: 'Escreviam mais do que lutavam, mas a espada continuava na cintura e o treino no dōjō, todos os dias.' },
    { q: 'O que era o kyūdō?', a: ['O caminho do arco: o tiro com o arco japonês', 'A cerimônia do chá', 'Um tipo de luta sem armas', 'A arte de dobrar papel'], c: 0, e: 'Um arco longo e assimétrico, puxado numa sequência fixa de movimentos. Acertar importa, mas a forma importa mais.' },
    { q: 'Quando foi a última erupção do Monte Fuji?', a: ['Em 1707, a erupção Hōei', 'Em 1790, no tempo do jogo', 'Há mais de mil anos', 'Ele nunca entrou em erupção'], c: 0, e: 'Em dezembro de 1707 choveu cinza até em Edo, a 100 km. O vulcão está quieto desde então.' },
    { q: 'O que era o menkyo kaiden numa escola de esgrima?', a: ['O diploma de "transmissão completa": o aluno aprendeu tudo do mestre', 'O primeiro dia de treino', 'A espada de madeira dos iniciantes', 'Uma multa por faltar ao treino'], c: 0, e: 'Era um rolo escrito à mão, com a linhagem dos mestres. Quem o recebia podia abrir o seu próprio dōjō.' },
  ],
};
const NAME = { egito: 'Mênfis', atenas: 'Atenas', roma: 'Roma', japao: 'o Japão' };
const KEY = 'cidades-historicas:quiz';
const best = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// abre o quiz da cidade; onClose é chamado ao fechar
export function openQuiz(city, onClose) {
  const list = Q[city]; if (!list) return;
  let el = document.getElementById('quiz');
  if (!el) { el = document.createElement('div'); el.id = 'quiz'; document.body.appendChild(el); }
  el.hidden = false;
  let i = 0, score = 0;
  const close = () => { el.hidden = true; el.innerHTML = ''; onClose?.(); };
  const shuffle = (q) => { const o = q.a.map((t, k) => ({ t, ok: k === q.c })); for (let k = o.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [o[k], o[j]] = [o[j], o[k]]; } return o; };
  const show = () => {
    const q = list[i], opts = shuffle(q);
    el.innerHTML = `<div class="scroll"><div class="eyebrow">Perguntas sobre ${NAME[city]} · ${i + 1} de ${list.length}</div><h3 class="quiz-q">${esc(q.q)}</h3><div class="quiz-opts">${opts.map((o, k) => `<button class="ghost-btn quiz-opt" data-k="${k}">${esc(o.t)}</button>`).join('')}</div><p class="quiz-ex" hidden></p><div class="quiz-nav"><button class="gold-btn quiz-next" hidden>${i + 1 < list.length ? 'Próxima' : 'Ver o resultado'}</button><button class="ghost-btn quiz-out">Sair</button></div></div>`;
    el.querySelector('.quiz-out').onclick = close;
    el.querySelectorAll('.quiz-opt').forEach((b) => (b.onclick = () => {
      if (el.querySelector('.quiz-opt.certa, .quiz-opt.errada')) return;
      const o = opts[+b.dataset.k]; if (o.ok) score++;
      el.querySelectorAll('.quiz-opt').forEach((x) => { const ox = opts[+x.dataset.k]; if (ox.ok) x.classList.add('certa'); else if (x === b) x.classList.add('errada'); x.disabled = true; });
      const ex = el.querySelector('.quiz-ex'); ex.hidden = false; ex.innerHTML = `<b>${o.ok ? 'Isso mesmo.' : 'Não foi bem assim.'}</b> ${esc(q.e)}`;
      const nx = el.querySelector('.quiz-next'); nx.hidden = false; nx.focus();
    }));
    el.querySelector('.quiz-next').onclick = () => { i++; if (i < list.length) show(); else result(); };
  };
  const result = () => {
    const B = best(), prev = B[city] || 0; if (score > prev) { B[city] = score; try { localStorage.setItem(KEY, JSON.stringify(B)); } catch (e) { /* */ } }
    const msg = score === list.length ? 'Acertou todas. Você prestou atenção em cada canto da cidade.' : score >= list.length * 0.6 ? 'Bom resultado. As que faltaram estão por aí, nos artefatos e nas conversas.' : 'Vale explorar mais: as respostas estão nos artefatos (K) e nas conversas com o povo da cidade.';
    el.innerHTML = `<div class="scroll small"><div class="eyebrow">Perguntas sobre ${NAME[city]}</div><h2>${score} de ${list.length}</h2><p>${msg}</p>${prev ? `<p style="opacity:.75;font-size:1rem">Sua melhor marca até agora: ${Math.max(prev, score)} de ${list.length}.</p>` : ''}<button class="gold-btn quiz-again">Responder de novo</button><button class="ghost-btn quiz-out">Voltar</button></div>`;
    el.querySelector('.quiz-again').onclick = () => { i = 0; score = 0; show(); };
    el.querySelector('.quiz-out').onclick = close;
  };
  show();
}
