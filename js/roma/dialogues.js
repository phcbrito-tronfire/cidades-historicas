// Diálogos de Atenas em 432 a.C. (arcontado de Pitodoro): o Parthenon acaba de ficar pronto, os Propileus estão em
// obras e a tensão com Esparta e Corinto cresce (revolta de Potideia, decreto contra Mégara) — a guerra do
// Peloponeso começa no ano seguinte. Personagens reais: Heródoto, Sócrates, Mnésicles, Fídias, Ictino,
// Lisímaque (sacerdotisa, datas aproximadas), Sófocles, Aspásia, Formião e Péricles. Mírrina, Cálias, Dêmon e
// Glauco são pessoas comuns inventadas para mostrar o dia a dia.

export const NPCS = [
  {
    id: 'apolodoro', name: 'Apolodoro de Damasco', title: 'Arquiteto do imperador Trajano', objective: 'apolodoro',
    look: { outfit: 'himation', base: 'brian', cloth: 0xd8c8a0, border: 0x5a3a1e, beard: 'full', hair: 'short', extras: ['scroll'] },
    greet: 'Ave, viajante! Sou Apolodoro, de Damasco, na Síria. Construo para o imperador Trajano: a ponte sobre o Danúbio, as termas no Ópio, o novo Fórum com a coluna. Você parece alguém que olha os prédios com atenção.',
    topics: [
      { q: 'O que o senhor construiu em Roma?', a: [
        'O Fórum de Trajano: a maior praça da cidade, com a Basílica Úlpia, duas bibliotecas — uma grega, uma latina — e a coluna de 30 metros, toda esculpida em espiral com a guerra da Dácia.',
        'E as Termas de Trajano, sobre as ruínas da Casa Dourada de Nero. E os Mercados: um prédio de lojas em vários andares, encostado no morro, como uma colmeia.'] },
      { q: 'Como os romanos constroem tão grande?', a: [
        'O segredo é o concreto: cal, a areia vulcânica de Putéoli e pedaços de pedra. Endurece até debaixo da água. Com ele fazemos abóbadas e cúpulas que nenhum grego ousaria.',
        'Por fora revestimos de tijolo ou de mármore, para ficar bonito. Mas por dentro é concreto — por isso os prédios ficam de pé por séculos.'] },
      { q: 'E o Coliseu, quem fez?', a: [
        'Começou com Vespasiano, sobre o lago do palácio de Nero, e Tito inaugurou em 80, com cem dias de jogos. Domiciano completou: o último andar e o hipogeu, debaixo da arena.',
        'São 80 arcos de entrada numerados: cada pessoa recebe uma téssera com o número da porta e do setor. Em poucos minutos 50 mil pessoas entram ou saem. Organização romana!'] },
    ],
    bye: 'Vale! E repare nas abóbadas quando entrar no Coliseu.',
  },
  {
    id: 'tacito', name: 'Públio Cornélio Tácito', title: 'Senador e historiador', objective: 'tacito',
    look: { outfit: 'himation', cloth: 0xf4efe2, border: 0x6a1a4a, beard: null, hair: 'short', hairColor: 0x8a8a82, extras: ['scroll'] },
    greet: 'Salve. Tácito. Fui cônsul, governei a Ásia, e agora escrevo a história de Roma — o que é bem mais perigoso. A Cúria, onde o Senado se reúne, é logo ali.',
    topics: [
      { q: 'Onde está o imperador Trajano?', a: [
        'Longe: no Oriente, em guerra contra os partos. Já tomou a Mesopotâmia e chegou ao golfo Pérsico. Nunca Roma foi tão grande — da Britânia ao Eufrates.',
        'Mas dizem que ele está doente. Se morrer, o sucessor deve ser Adriano, seu parente, governador da Síria. O Senado espera notícias todos os dias.'] },
      { q: 'O que o senhor escreve?', a: [
        'Os Anais e as Histórias: os imperadores desde Tibério. Tento escrever "sine ira et studio" — sem raiva e sem paixão. Nem sempre consigo, com um Nero no meio.',
        'Também escrevi sobre os germanos, povos livres do outro lado do Reno, e sobre meu sogro Agrícola, que governou a Britânia.'] },
      { q: 'O Senado ainda manda em Roma?', a: [
        'Manda menos do que finge. Desde Augusto, quem decide é o imperador; o Senado aconselha, julga, governa algumas províncias e dá prestígio.',
        'Com um bom príncipe, como Trajano, isso funciona. Com um tirano, como Domiciano, cada palavra no Senado podia custar a vida. Eu vi.'] },
    ],
    bye: 'Vá em paz. E desconfie dos historiadores — inclusive de mim.',
  },
  {
    id: 'cornelia', name: 'Cornélia', title: 'Virgem vestal', objective: 'cornelia',
    look: { outfit: 'peplos', cloth: 0xf6f2ea, border: 0xd8b45a, hair: 'veil', veilColor: 0xf6f2ea },
    greet: 'A paz de Vesta esteja com você. Sou Cornélia, uma das seis vestais. Aqui dentro, no templo redondo, guardamos o fogo sagrado de Roma.',
    topics: [
      { q: 'Por que o fogo é tão importante?', a: [
        'O fogo de Vesta é o coração da cidade: enquanto ele queimar, Roma está protegida. Se apagar, é um sinal terrível — e a vestal responsável é castigada.',
        'Uma vez por ano, no primeiro dia de março, o fogo é renovado: acendido de novo esfregando madeira, como faziam os antigos.'] },
      { q: 'Como é a vida de uma vestal?', a: [
        'Fui escolhida menina, entre as filhas de boas famílias. Servimos trinta anos: dez aprendendo, dez servindo, dez ensinando. Depois podemos sair e até casar.',
        'Temos privilégios que nenhuma outra mulher tem: lugar de honra no Coliseu, guardamos testamentos importantes, e se cruzarmos com um condenado, ele é perdoado.'] },
    ],
    bye: 'Que Vesta guarde a sua casa.',
  },
  {
    id: 'domicio', name: 'Caio Domício', title: 'Lanista, dono de uma escola de gladiadores', objective: 'domicio',
    look: { outfit: 'chiton', cloth: 0x8a3a28, border: 0xd8b45a, beard: 'full', hair: 'short', extras: [] },
    greet: 'Ei, você! Quer ver gladiadores de verdade? Os meus são os melhores de Roma — treinados na minha escola, perto do Ludus Magnus. Sou Caio Domício, lanista.',
    topics: [
      { q: 'Os gladiadores lutam até a morte?', a: [
        'Nem sempre! Um gladiador bom custa caro: anos de treino, comida, médico. Se um perde lutando bem, a plateia pede "missio" e o organizador o deixa viver.',
        'Muitos lutam poucas vezes por ano e sobrevivem a dezenas de combates. Os melhores ganham fama, dinheiro e, um dia, a espada de madeira — o rudis, que é a liberdade.'] },
      { q: 'Que tipos de gladiadores existem?', a: [
        'O mirmilão: escudo grande, gládio e o elmo com o peixe. O trácio: escudinho e a espada curva, a sica. O reciário: só a rede e o tridente, quase sem armadura. O secutor, que caça o reciário.',
        'Combinamos sempre tipos diferentes, para a luta ficar equilibrada e bonita: o pesado contra o ágil.'] },
      { q: 'Quem são os gladiadores?', a: [
        'Prisioneiros de guerra, escravos, condenados... e também homens livres, que se vendem para a escola por dinheiro e glória. Até alguns nobres lutaram, para escândalo das famílias.'] },
    ],
    bye: 'Volte nos dias de jogos! E aposte no mirmilão.',
  },
  {
    id: 'vero', name: 'Vero', title: 'Gladiador mirmilão', objective: 'vero',
    look: { outfit: 'worker', beard: 'short', extras: ['murmillo', 'scutum', 'gladius', 'manica'], shieldColor: 0x9a2a1e },
    greet: 'Shhh... aqui embaixo a gente espera a vez. Ouviu a plateia lá em cima? Sou Vero, mirmilão. Daqui a pouco subo pelo elevador para a arena.',
    topics: [
      { q: 'O que é este lugar?', a: [
        'O hipogeu: os porões da arena. Corredores, jaulas das feras, depósitos de cenários e os elevadores: guinchos de madeira que levantam uma jaula até um alçapão no chão da arena.',
        'Quando abre o alçapão, um leão "brota" da areia na frente da plateia. Trabalham aqui centenas de escravos, puxando cordas no escuro.'] },
      { q: 'Você tem medo?', a: [
        'Antes de cada luta, todo mundo tem. Mas a gente treina todo dia, come bem — cevada e feijão, por isso nos chamam de "comedores de cevada" — e confia no mestre.',
        'Já lutei nove vezes. Se ganhar mais algumas, quem sabe recebo o rudis e fico livre. Aí abro minha própria escola!'] },
    ],
    bye: 'Torça por mim lá de cima!',
  },
  {
    id: 'lucio', name: 'Lúcio Petrônio', title: 'Centurião da guarda', objective: 'lucio',
    look: { outfit: 'chiton', cloth: 0xa82a20, border: null, beard: 'short', extras: ['lorica', 'galea', 'rudis'], crest: 0xe8e0d0 },
    greet: 'Alto, cidadão! Ah, um viajante. Sou Lúcio Petrônio, centurião. Minha centúria está de serviço aqui no Coliseu hoje.',
    topics: [
      { q: 'Como é a legião romana?', a: [
        'Uma legião tem uns cinco mil homens, em dez coortes. Cada coorte tem seis centúrias de oitenta — "centúria" vem de cem, mas na prática são oitenta. Eu comando uma delas.',
        'Formamos em fileiras, escudo colado com escudo. Na "tartaruga", os da frente erguem o escudo à frente e os de trás, por cima da cabeça: nenhuma flecha passa.'] },
      { q: 'E esse bastão?', a: [
        'É a vitis, a vara de videira: o símbolo do centurião. Serve para comandar... e para corrigir soldado preguiçoso. E a crista do meu capacete é atravessada: assim os homens me acham no meio da batalha.'] },
    ],
    bye: 'Siga em frente, e não arrume confusão na fila dos jogos!',
  },
];

export const GUARD_LINES = {};
export const VILLAGER_LINES = [
  'Amanhã tem jogos no Coliseu! Dizem que vêm leões da África.',
  'O pão é de graça para os cidadãos: o imperador distribui o trigo todo mês. Pão e circo, como dizem.',
  'Trajano conquistou a Dácia e trouxe tanto ouro que pagou cem dias de jogos!',
  'Moro numa ínsula de cinco andares. Lá em cima é barato, mas se pega fogo...',
  'Vou às termas depois do trabalho: banho quente, banho frio, e uma boa conversa.',
  'Cuidado com os carroceiros à noite: de dia as carroças são proibidas no centro.',
  'Já foi ao Circo Máximo? Cabem mais de 150 mil pessoas! Eu torço pelos Verdes.',
];
export const SOLDIER_LINES = [
  'Vinte anos de serviço na legião, e no fim um pedaço de terra. É o trato.',
  'Marchamos trinta quilômetros por dia com tudo nas costas: armas, panela, estacas para o acampamento.',
  'O escudo se chama scutum. Na formação da tartaruga, ninguém passa uma flecha.',
];
export const WORKER_LINES = [
  'Estou levando tijolos para as obras do Fórum de Trajano. Que construtor é aquele Apolodoro!',
  'Concreto romano: cal, areia vulcânica de Putéoli e pedra. Dura para sempre.',
];
export const FARMER_LINES = [
  'As oliveiras levam anos para dar azeite. Quem planta uma oliveira planta para os netos.',
  'O vinho deste ano vai ser bom: choveu na hora certa.',
];
export const SAILOR_LINES = [
  'Remar numa trirreme? Seis horas de esforço e a bunda em carne viva. Mas a frota é a glória de Atenas!',
  'Do Pireu sai navio para o Egito, para a Sicília, para o mar Negro. O trigo de lá alimenta metade da cidade.',
  'Quer saber se vai chover? Olhe o Himeto: se tiver nuvem no topo, prepare o manto.',
  'Os fenícios são os melhores marinheiros do mundo, depois de nós, claro.',
];
export const CHILD_LINES = [
  'Quer jogar nozes? A gente arruma em pirâmide e tenta derrubar com outra noz!',
  'Meu pedagogo me leva à escola de manhã cedinho. Se eu errar a conta, o mestre bate com a vara!',
  'Quando crescer vou ser gladiador! Ou auriga dos Verdes, no Circo Máximo.',
];
export const PRIEST_LINES = [
  'As vestais guardam o fogo sagrado no templo redondo de Vesta. Se ele apagar, é desgraça para Roma.',
  'No Capitólio, o templo de Júpiter Ótimo Máximo: é lá que o general vitorioso termina o triunfo.',
];
