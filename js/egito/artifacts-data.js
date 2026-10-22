// 20 artefatos inspirados em objetos reais do Egito Antigo (acervos de museus de hoje).
// "where" diz em que lugar de Mênfis ele está escondido; "kind" escolhe o modelo 3D.
export const ARTIFACTS = [
  {
    id: 'escaravelho-coracao', kind: 'scarab', where: 'santuario',
    name: 'Escaravelho do coração', era: 'Novo Império · pedra verde',
    museum: 'Há exemplares no Museu Britânico, no Louvre e no Museu Egípcio do Cairo.',
    story: 'Era colocado sobre o peito da múmia. Na base trazia gravado o capítulo 30B do Livro dos Mortos, um pedido ao próprio coração: "não testemunhe contra mim" no julgamento diante de Osíris, quando ele seria pesado contra a pena de Maat.',
  },
  {
    id: 'estela-orelhas', kind: 'stela', where: 'patio',
    name: 'Estela das orelhas', era: 'Novo Império · calcário',
    museum: 'Encontradas aos montes em Mênfis, hoje em vários museus.',
    story: 'Ptah era chamado "aquele que ouve as preces". O povo, que não podia entrar no santuário, deixava junto ao templo pequenas estelas com orelhas esculpidas, para que o deus escutasse seus pedidos.',
  },
  {
    id: 'menat', kind: 'menat', where: 'hipostila',
    name: 'Colar menat', era: 'Novo Império · contas de faiança e bronze',
    museum: 'Há menats no Metropolitan Museum (Nova York) e no Louvre.',
    story: 'Um colar pesado de muitas fileiras de contas com um contrapeso nas costas. As sacerdotisas de Hathor o sacudiam como um chocalho durante os rituais, e o som trazia a bênção da deusa.',
  },
  {
    id: 'calice-lotus', kind: 'chalice', where: 'lago',
    name: 'Cálice de lótus azul', era: 'Novo Império · faiança azul',
    museum: 'O Metropolitan Museum e o Museu Britânico têm cálices assim.',
    story: 'Taças em forma de flor de lótus, com as pétalas desenhadas em relevo. O lótus azul se fecha à noite e reabre ao amanhecer, por isso lembrava o renascimento do sol todos os dias.',
  },
  {
    id: 'braceletes-ramses', kind: 'bracelets', where: 'trono',
    name: 'Braceletes de Ramsés II', era: '19ª dinastia · ouro e lápis-lazúli',
    museum: 'Achados em Tell Basta (Bubástis) em 1906; hoje no Museu Egípcio do Cairo.',
    story: 'Um par de braceletes de ouro com dois patos selvagens de cabeça virada, o corpo feito de uma única peça de lápis-lazúli. Trazem o nome de Ramsés II. Peças assim eram dadas a cortesãos como recompensa do rei.',
  },
  {
    id: 'peitoral-sithathor', kind: 'pectoral', where: 'deposito',
    name: 'Peitoral de Sit-Hathor-Iunet', era: '12ª dinastia · ouro, cornalina, lápis e turquesa',
    museum: 'Encontrado em Lahun em 1914; hoje no Metropolitan Museum.',
    story: 'Joia de uma princesa, filha do rei Senusret II. Mais de 370 pedrinhas foram cortadas e encaixadas uma a uma no ouro, formando falcões, o sol e o nome do rei. Já tinha mais de 600 anos na época de Ramsés.',
  },
  {
    id: 'tubo-kohl', kind: 'kohl', where: 'jardim',
    name: 'Tubo de kohl', era: '18ª dinastia · faiança azul',
    museum: 'Alguns trazem os nomes de Amenhotep III e da rainha Tiye; há exemplos no Louvre e no Met.',
    story: 'Guardava o kohl, pó escuro de galena moído com gordura, passado nos olhos com um palito. Homens e mulheres usavam: protegia do brilho do sol, espantava moscas e ajudava a evitar infecções.',
  },
  {
    id: 'colher-nadadora', kind: 'spoon', where: 'piscina',
    name: 'Colher cosmética da nadadora', era: 'Novo Império · madeira ou marfim',
    museum: 'O Louvre e o Metropolitan Museum têm colheres assim.',
    story: 'Uma moça nadando, de braços estendidos, segura um pato ou uma concha que é a tigelinha da colher. Servia para misturar perfumes e cremes. É uma das peças mais delicadas da arte egípcia do dia a dia.',
  },
  {
    id: 'espelho', kind: 'mirror', where: 'nofret',
    name: 'Espelho de bronze', era: 'Novo Império · bronze polido',
    museum: 'Há muitos no Museu do Cairo e no Museu Britânico.',
    story: 'Um disco de metal polido até brilhar, lembrando o sol. O cabo tinha forma de haste de papiro ou de uma figura da deusa Hathor. Ia junto para o túmulo, para a pessoa continuar bonita na outra vida.',
  },
  {
    id: 'senet', kind: 'senet', where: 'praca',
    name: 'Tabuleiro de senet', era: 'Novo Império · ébano e marfim',
    museum: 'Tutancâmon foi enterrado com vários; estão no Museu Egípcio do Cairo.',
    story: 'Jogo de 30 casas para dois jogadores, com peças em cone e em carretel. Com o tempo virou uma metáfora da viagem da alma: no Livro dos Mortos o morto aparece jogando senet contra um adversário invisível.',
  },
  {
    id: 'amuleto-bes', kind: 'bes', where: 'mercado',
    name: 'Amuleto de Bes', era: 'Novo Império · faiança',
    museum: 'Comum em quase todos os grandes museus.',
    story: 'Bes era um deus anão, de cara feia e língua de fora, que espantava cobras, escorpiões e maus espíritos. Protegia as casas, as crianças e as mães na hora do parto. Aparecia até em camas e espelhos.',
  },
  {
    id: 'paleta-escriba', kind: 'palette', where: 'avenida',
    name: 'Paleta de escriba', era: 'Novo Império · madeira',
    museum: 'O Met e o Museu Britânico têm paletas com o nome do dono gravado.',
    story: 'Uma régua de madeira com duas cavidades: uma para a tinta preta, de fuligem, e outra para a vermelha, de ocre. No meio, uma fenda guardava os pincéis de junco. O escriba carregava a paleta pendurada no ombro.',
  },
  {
    id: 'ostracon-gato', kind: 'ostracon', where: 'canteiro',
    name: 'Óstraco do gato e do rato', era: '19ª–20ª dinastia · calcário pintado',
    museum: 'Vários vêm da vila dos artesãos de Deir el-Medina; há exemplos no Museu de Brooklyn e no Cairo.',
    story: 'Lascas de calcário serviam de "papel de rascunho". Os artesãos desenhavam nelas cenas de humor: um gato servindo um rato elegante, gatos pastoreando gansos. Mundo de pernas para o ar, a mais antiga tirinha!',
  },
  {
    id: 'shabti-seti', kind: 'shabti', where: 'templo-vale',
    name: 'Shabti de Seti I', era: '19ª dinastia · faiança azul',
    museum: 'Centenas saíram do túmulo de Seti I (KV17); hoje estão em vários museus.',
    story: 'Seti I foi o pai de Ramsés II. Os shabtis eram estatuetas que "respondiam" no lugar do morto quando ele fosse chamado para trabalhar nos campos do além. Alguns túmulos tinham um para cada dia do ano.',
  },
  {
    id: 'vaso-canopico', kind: 'canopic', where: 'rainhas',
    name: 'Vaso canópico', era: 'Novo Império · alabastro (calcita)',
    museum: 'Há conjuntos completos no Louvre, no Met e no Cairo.',
    story: 'Na mumificação, fígado, pulmões, estômago e intestinos eram guardados em quatro vasos protegidos pelos filhos de Hórus: Imseti (homem), Hapi (babuíno), Duamutef (chacal) e Qebehsenuf (falcão). Só o coração ficava no corpo.',
  },
  {
    id: 'amuleto-djed', kind: 'djed', where: 'miquerinos',
    name: 'Amuleto djed', era: 'Novo Império · faiança',
    museum: 'Comum nos acervos egípcios do mundo inteiro.',
    story: 'O pilar djed representa a coluna vertebral de Osíris e significa "estabilidade". Na festa do levantamento do djed, o próprio rei erguia um grande pilar com cordas, simbolizando a vitória da ordem sobre o caos.',
  },
  {
    id: 'apoio-cabeca', kind: 'headrest', where: 'esfinge',
    name: 'Apoio de cabeça', era: 'Novo Império · madeira ou marfim',
    museum: 'Tutancâmon tinha vários, um deles de marfim, no Museu do Cairo.',
    story: 'Os egípcios dormiam com a cabeça apoiada nesta peça curva, mais fresca que um travesseiro e boa para não estragar o penteado. Nos túmulos, ela protegia a cabeça do morto, e alguns trazem o deus Bes gravado.',
  },
  {
    id: 'modelo-barco', kind: 'boat', where: 'cais',
    name: 'Modelo de barco funerário', era: '11ª dinastia · madeira pintada',
    museum: 'Os famosos modelos de Meketre estão no Metropolitan Museum e no Museu do Cairo.',
    story: 'Miniaturas com remadores, timoneiro e cabine eram colocadas nos túmulos para que o morto pudesse navegar no além, como fazia no Nilo. Os de Meketre, de 4 mil anos atrás, mostram até cozinheiros e cervejeiros.',
  },
  {
    id: 'tratado-kadesh', kind: 'tablet', where: 'quartel',
    name: 'Tábua do tratado de paz egípcio-hitita', era: '19ª dinastia · argila (escrita cuneiforme)',
    museum: 'A versão hitita foi achada em Hattusa e está nos Museus de Arqueologia de Istambul; uma réplica fica na sede da ONU.',
    story: 'Depois de Kadesh, Ramsés II e o rei hitita Hattusili III selaram a paz, no 21º ano do reinado. A versão egípcia foi gravada em templos; a hitita, em tábuas de argila em acádio, a língua da diplomacia. É o tratado de paz mais antigo conhecido.',
  },
  {
    id: 'olho-horus', kind: 'udjat', where: 'vilarejo',
    name: 'Amuleto do olho de Hórus (udjat)', era: 'Novo Império · faiança',
    museum: 'Um dos amuletos mais comuns em todos os museus.',
    story: 'Na lenda, Hórus perdeu o olho lutando contra Seth, e o deus Thot o curou. O olho "inteiro de novo" virou o maior símbolo de proteção e cura. Era usado por vivos e mortos, inclusive dentro das faixas das múmias.',
  },
];
