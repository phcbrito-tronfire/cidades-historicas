// As falas curtas da gente de Vila Rica (E para falar), em fevereiro de 1789: cada um fala do seu ofício e da sua
// vida, na própria voz. Quem é escravizado tem nome e nação (ou é crioulo, nascido aqui). Nada aqui fala do jogo:
// o que é história difícil é dito por quem viveu.
// {n}: o nome; {nac}: a nação ("de nação mina", "nascido aqui mesmo, em Vila Rica")
export const NOMES_H = ['Antônio', 'Joaquim', 'Manuel', 'Francisco', 'Domingos', 'Inácio', 'Caetano', 'Bento', 'Benedito', 'Sebastião', 'Gonçalo', 'Pedro', 'Miguel', 'Félix', 'Tomé', 'Luís', 'Matias'];
export const NOMES_M = ['Maria', 'Ana', 'Quitéria', 'Rosa', 'Inácia', 'Teresa', 'Luísa', 'Francisca', 'Antônia', 'Joana', 'Josefa', 'Catarina', 'Benedita', 'Isabel', 'Margarida', 'Felícia'];
export const NACOES = ['mina', 'angola', 'benguela', 'congo', 'cabinda', 'moçambique', 'crioulo', 'crioulo'];
export const nacao = (k, fem) => (k === 'crioulo' ? (fem ? 'nascida' : 'nascido') + ' aqui mesmo, em Vila Rica' : 'de nação ' + k);

export const FALAS = {
  homem: [
    'Diz que vem derrama. Se o governador mandar cobrar o que falta do quinto, vão tirar de cada casa até inteirar as cem arrobas.',
    'O ouro já não é o do tempo do meu pai. Hoje se cava mais fundo e se acha menos.',
    'Sou carapina. Telhado, porta, janela de rótula: meia Vila Rica tem tábua que passou pela minha plaina.',
    'Sal, ferro, pano, vinho: tudo vem do Rio no lombo de mula, e tudo chega caro.',
    'Pilar ou Antônio Dias? Aqui cada bairro tem a sua matriz, e briga por ela.',
    'Se quiser falar do governo, fale baixo. Parede aqui tem ouvido.',
  ],
  senhor: [
    'Os contratos rendem, mas o rei quer sempre mais. E quem cobra é que fica malvisto.',
    'Meu filho estuda em Coimbra. Volta doutor, se Deus quiser — e com ideias novas na cabeça, que é o que me preocupa.',
    'A lavra da família ainda dá, com o trabalho de trinta escravos. Mas cada ano o veio fica mais fundo e a conta mais curta.',
    'Hoje tem comédia na Casa da Ópera. Os camarotes são das famílias; a plateia é de quem pagar.',
    'Os livros de fora chegam escondidos no meio das cargas. Lê-se muito nesta vila, mais do que o governo gostaria.',
  ],
  senhora: [
    'Vou à missa. Moça de família só sai assim, de mantilha, e acompanhada.',
    'As irmandades disputam quem faz a festa mais bonita. A do Carmo não perde para ninguém.',
    'A seda vem de Lisboa, a renda vem de Flandres, e o preço vem de todo lado.',
    'Em casa de gente de bem, quem vai ao chafariz são as escravas. Senhora não carrega pote.',
  ],
  mulher: [
    'Sou costureira. Faço camisa e saia para fora; o pano, a freguesa traz.',
    'Comprei minha alforria aos poucos, em prestações. O papel eu guardo dentro do oratório.',
    'Na irmandade a gente se ajuda: no enterro, na doença, na alforria de um irmão.',
    'Lavo roupa no córrego desde que clareia. A água é fria, a pedra é dura, mas paga o pão.',
    'Meu marido é forro como eu. Temos uma casinha de pau a pique lá no alto. É pouco, mas é nosso.',
  ],
  escravo: [
    'Me chamo {n}, {nac}. Carrego o que mandam: da tropa para a loja, da loja para a casa.',
    'Aqui pouca gente pergunta o meu nome. Mas eu tenho nome: {n}.',
    'Meu senhor me aluga para quem paga. O jornal vai para ele; um vintém, às vezes, fica comigo.',
    'Junto o que posso. Um dia compro a minha carta de alforria — custa mais que uma casa pequena.',
    'De noite a gente canta na língua de lá, baixinho, para não esquecer.',
  ],
  aguadeira: [
    'Sou {n}, {nac}. Venho ao chafariz três, quatro vezes por dia. A casa da minha senhora gasta muita água.',
    'No chafariz a gente conversa. É onde se fica sabendo de tudo o que acontece na vila.',
    'Pote cheio pesa mais que menino. O segredo é a rodilha bem feita e o pescoço firme.',
    'A água desce da serra por cano de pedra. Quando seca, a fila vai até a esquina.',
  ],
  quitandeira: [
    'Bolo de fubá, cocada, pé de moleque, angu! Quem vai?',
    'Sou {n}, quitandeira. Vendo para a minha senhora e fico com uma parte. É com ela que vou juntando para a alforria.',
    'A Câmara proíbe tabuleiro nas lavras. Dizem que a gente troca quitute por ouro escondido.',
    'Freguês bom é tropeiro: chega com fome e com dinheiro.',
    'Comprei a minha liberdade vendendo nesta praça. Agora a venda é minha, e o tabuleiro também.',
  ],
  minerador: [
    'Sou {n}, {nac}. Desde menino na lavra. Este morro é todo furado, por dentro e por fora.',
    'A água desce pela canoa e leva a terra; o ouro, que pesa mais, fica. É assim que se lava o cascalho.',
    'Galeria funda mata. O teto cai, a água sobe, o ar falta. Quase todo mês alguém não volta.',
    'O feitor conta as horas. A gente conta os dias até domingo, que é dia de missa e de descanso.',
    'Esconder ouro? Pergunta perigosa. Quem é pego vai para o tronco.',
  ],
  feitor: [
    'Não pare, não. A lavra não espera.',
    'Sou pago para vigiar. O que eu acho não interessa a ninguém.',
    'O senhor quer tantas oitavas por semana. Se não sai, quem leva a culpa sou eu.',
  ],
  faiscador: [
    'Sou faiscador. Trabalho por conta própria: a bateia, o córrego e a paciência.',
    'Gira a bateia, a areia sai pela beira e o ouro fica no fundo. Um brilho por dia já é dia bom.',
    'Comprei minha liberdade com o ouro deste córrego. Levei onze anos.',
    'Ouro em pó tem de ir à Casa de Fundição, para tirar o quinto do rei. Quem é pego com pó fora de lá perde tudo.',
  ],
  dragao: [
    'Regimento de Cavalaria de Minas. Estamos aqui para guardar o caminho do ouro.',
    'Circule. Nada de ajuntamento na porta do Palácio.',
    'Patrulha na estrada, guarda nos registros, escolta do quinto até o Rio. Soldado aqui não para.',
    'Tem alferes do regimento que vive mais no caminho do Rio do que no quartel.',
  ],
  padre: [
    'Deus o abençoe. A missa da irmandade é às oito.',
    'Cada irmandade tem a sua igreja: os brancos no Carmo, os pretos no Rosário, os pardos em São José. Até no céu esta vila marca lugar.',
    'A talha do altar custou mais ouro do que muita gente vê na vida inteira. Mas é para Deus.',
    'Rezo pelos vivos e enterro os mortos. Nesta terra, de nenhum dos dois serviços falta.',
  ],
  fiel: [
    '(Rezando baixinho.)',
    'Psiu. Estou rezando pelo meu marido, que desceu para o Rio com a tropa.',
    'Prometi uma vela a Nossa Senhora se meu filho sarasse. Sarou. Vim pagar.',
    'Aqui embaixo do soalho estão os irmãos da irmandade. Um dia eu também.',
  ],
  canteiro: [
    'Pedra-sabão: mole na hora de cortar, dura com o tempo. Por isso dá para entalhar assim.',
    'O risco da portada é do mestre Antônio Francisco. Quem bate o cinzel o dia inteiro somos nós.',
    'Oficial e escravo trabalham lado a lado. A diferença é quem recebe o jornal no fim da semana.',
    'A Ordem Terceira paga a obra aos poucos. Quando o dinheiro acaba, a torre espera.',
  ],
  pedreiro: [
    'A Câmara nova vai ser a mais bonita das Minas. E a cadeia embaixo, a mais segura.',
    'Cada pedra sobe nas costas. O andaime balança, mas este mês ainda não caiu ninguém.',
    'Começaram em oitenta e cinco. Do jeito que vai, meus netos é que vão ver pronta.',
  ],
  tropeiro: [
    'Vinte dias do Rio até aqui, pelo Caminho Novo. Serra, rio, atoleiro e registro de fiscal.',
    'Trago sal, ferro, vinho, azeite e pano. Volto com ouro? Volto com o que a lei deixa.',
    'A madrinha da tropa vai na frente, com o cincerro. As outras seguem o som.',
    'Mula é melhor que cavalo nesta serra: pisa firme e não reclama.',
  ],
  crianca: [
    'Lá no Morro da Queimada tem buraco de mina por todo lado. Minha mãe não deixa eu ir.',
    'Quando o sino de Antônio Dias toca, o do Pilar responde. Parece que estão brigando!',
    'Dizem que o mestre Aleijadinho só passa na rua de madrugada, todo coberto. Eu nunca vi.',
    'Eu sei rezar o terço inteiro. Foi minha avó que ensinou.',
  ],
};
// o nome que aparece na caixa da conversa (quando a pessoa não diz o próprio)
export const TITULOS = {
  homem: 'Morador', senhor: 'Homem de posses', senhora: 'Senhora', mulher: 'Moradora', escravo: 'Carregador', aguadeira: 'No chafariz', quitandeira: 'Quitandeira',
  minerador: 'Minerador', feitor: 'Feitor', faiscador: 'Faiscador', dragao: 'Dragão', padre: 'Padre', fiel: 'Na igreja', canteiro: 'Canteiro', pedreiro: 'Pedreiro', tropeiro: 'Tropeiro', crianca: 'Criança',
};
