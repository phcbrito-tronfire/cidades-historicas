// Diálogos dos NPCs principais. Conteúdo histórico revisado:
// Mênfis no 30º ano de Ramsés II (c. 1250 a.C.), Novo Império, 19ª dinastia.

export const NPCS = [
  {
    id: 'nebamun', name: 'Nebamun', title: 'Escriba do templo', objective: 'nebamun',
    look: { outfit: 'longkilt', hair: 'short', extras: ['scroll'], skin: 0x9c6644 },
    greet: 'Que Rá ilumine seus passos, estrangeiro! Sou Nebamun, escriba do Templo de Ptah. Você está em Mênfis — Men-nefer, "a beleza duradoura" —, a cidade mais antiga das Duas Terras. Estamos no 30º ano do reinado de Ramsés II. Pelo seu calendário, por volta de 1250 a.C.',
    topics: [
      { q: 'Onde exatamente eu estou?', a: [
        'Mênfis fica onde o vale do Nilo se abre no Delta — a fronteira entre o Alto e o Baixo Egito. A tradição diz que o rei Menés a fundou ao unir as Duas Terras, há mais de 1.800 anos.',
        'A oeste, no planalto do deserto, ficam as pirâmides dos reis antigos. A leste corre o Nilo. Atrás de mim está o grande Templo de Ptah, nosso deus protetor, e ao sul fica o palácio do faraó.'] },
      { q: 'O que faz um escriba?', a: [
        'Escrevo, conto e registro: colheitas, impostos, oferendas do templo, cartas do rei. Passei uns dez anos na escola copiando textos para dominar centenas de sinais.',
        'Pouquíssimos egípcios sabem ler — talvez um em cada cem. Por isso os pais dizem aos filhos: "Seja escriba! Seus braços não carregarão peso e você comandará os outros."'] },
      { q: 'Como vocês escrevem?', a: [
        'Os hieróglifos são as "palavras do deus": usamos nas paredes dos templos e túmulos. No dia a dia escrevemos o hierático, uma letra cursiva e rápida.',
        'Escrevo com um pincel de junco mastigado na ponta e tinta preta de fuligem. A tinta vermelha, de ocre, marca títulos e datas. O papiro é feito da planta que cresce na beira do rio.'] },
      { q: 'Como vocês contam o tempo?', a: [
        'Nosso ano tem 365 dias: doze meses de 30 dias e mais cinco dias de festa no fim, os aniversários dos deuses.',
        'São três estações de quatro meses: Akhet, a cheia; Peret, a semeadura; e Shemu, a colheita. O ano novo começa quando a estrela Sopdet — que vocês chamam de Sírius — volta a surgir antes do sol, anunciando a cheia.'] },
      { q: 'O que posso fazer na cidade?', a: [
        'Explore! Entre no templo atrás de mim e procure o sumo sacerdote Khaemwaset, filho do próprio faraó. No mercado, perto do cais, prove o pão de Merit e regateie com o mercador Djehuty.',
        'Se tiver coragem, nade no Nilo e atravesse até os campos da margem leste. As pirâmides ficam no planalto, a oeste. E dizem que cinco escaravelhos de ouro, amuletos de sorte, se perderam pela cidade...',
        'Quem conhecer bem Mênfis talvez seja recebido pelo faraó, no palácio ao sul. Seu diário (tecla J) vai guardar os objetivos.'] },
    ],
    bye: 'Vá em paz, e que Thot, senhor da escrita, guie sua memória.',
  },
  {
    id: 'khaemwaset', name: 'Khaemwaset', title: 'Sumo sacerdote de Ptah', objective: 'khaemwaset',
    look: { outfit: 'priest', hair: 'sidelock', extras: ['staff'], skin: 0x8d5a3b, collar: 0xd9a23e },
    greet: 'Paz, viajante. Sou Khaemwaset, sumo sacerdote de Ptah e quarto filho do rei Ramsés. Você está na casa do deus que criou o mundo pelo coração e pela língua: ele pensou, falou — e tudo passou a existir.',
    topics: [
      { q: 'Quem é Ptah?', a: [
        'Ptah é o criador, padroeiro dos artesãos, escultores e construtores. Nós o representamos envolto como uma múmia, com um capuz azul justo e segurando um cetro que une vida, estabilidade e poder.',
        'Ele forma a tríade de Mênfis com a leoa Sekhmet, sua esposa, e com Nefertem, o deus do lótus. Aqui no templo também vive o touro Ápis, a alma viva de Ptah. Eu mandei abrir uma galeria em Saqqara para sepultar os touros Ápis com honra.'] },
      { q: 'Como é a religião de vocês?', a: [
        'Temos muitos deuses, mas tudo gira em torno de Maat: a ordem, a verdade e a justiça do universo. O faraó é quem mantém Maat na terra, entre os deuses e os homens.',
        'O templo é a casa do deus, não um lugar de reunião. O povo fica no pátio; só os sacerdotes entram no santuário. Em casa, as famílias rezam a deuses protetores como Bes e Taweret. Nas festas, a estátua do deus sai em procissão e todos podem vê-la.'] },
      { q: 'Como é o dia a dia no templo?', a: [
        'Ao amanhecer quebramos o selo do santuário, cantamos hinos, lavamos, vestimos e perfumamos a estátua do deus. Depois oferecemos pão, carne, cerveja e flores.',
        'Os sacerdotes se banham no lago sagrado várias vezes ao dia, raspam todo o corpo e só vestem linho e sandálias de papiro. As oferendas, depois que o deus "se alimenta", vão para a mesa dos sacerdotes.'] },
      { q: 'E a vida após a morte?', a: [
        'Cada pessoa tem um ka, a força vital, e um ba, a alma que voa. O corpo precisa ser preservado para que eles o reencontrem — por isso a mumificação: 70 dias, com natrão para secar o corpo.',
        'Os órgãos vão para os vasos canopos; só o coração fica no corpo. No julgamento, diante de Osíris, o coração é pesado contra a pena de Maat. Se for mais pesado, a devoradora Ammit o engole. Se for leve, a pessoa segue para os Campos de Juncos.'] },
      { q: 'O senhor cuida das pirâmides?', a: [
        'Cuido! Para nós elas já são antiguidades: têm mais de 1.200 anos. Muitos monumentos dos reis antigos estão cobertos de areia ou danificados.',
        'Mando limpar e restaurar, e gravo neles o nome do rei que os construiu, para que ninguém o esqueça. Meu capataz Hori está lá agora. Vocês, do futuro, talvez me chamassem de... o primeiro egiptólogo.'] },
    ],
    bye: 'Que Ptah molde bons caminhos para você.',
  },
  {
    id: 'nebet', name: 'Nebet', title: 'Cantora de Ptah',
    look: { outfit: 'dress', hair: 'long', skin: 0xa8724c, collar: 0x3aa3a0 },
    greet: 'Ouviu os sistros? Sou Nebet, cantora do templo. Minha voz acompanha os rituais de Ptah todas as manhãs.',
    topics: [
      { q: 'Como é a música no templo?', a: [
        'Cantamos hinos ao deus com harpas, flautas, tambores e sistros — o chocalho sagrado de Hathor. Batemos palmas no ritmo. Dizem que a música acalma os deuses e afasta o mal.'] },
      { q: 'Mulheres trabalham no templo?', a: [
        'Muitas! Somos cantoras, dançarinas e sacerdotisas de deusas como Hathor e Neith. Em Tebas, a mais alta delas é a "Esposa do Deus" de Amon, cargo de enorme poder.',
        'E fora do templo, uma egípcia pode ter terras, fazer contratos, testemunhar no tribunal e pedir o divórcio. Poucas mulheres do mundo têm esses direitos.'] },
    ],
    bye: 'Que Hathor encha seus dias de música.',
  },
  {
    id: 'merit', name: 'Merit', title: 'Padeira e cervejeira', objective: 'merit',
    look: { outfit: 'dress', hair: 'long', skin: 0x7a4a2e, linen: 0xe8dcc0 },
    greet: 'Ei, ei! Pão quentinho, cerveja fresca! Sou Merit. Prove este pão de emmer, acabou de sair do forno de barro. Só mastigue com cuidado: sempre vem um pouco de areia da pedra de moer!',
    topics: [
      { q: 'O que o povo come?', a: [
        'Pão e cerveja todo dia — os trabalhadores até recebem o salário assim! Junto vêm cebola, alho, alho-poró, lentilhas, grão-de-bico, favas, alface e pepino.',
        'Frutas: tâmaras, figos, uvas, romãs e melancias. Peixe seco é comida barata do povo, e aves do pântano também. Carne de boi é luxo: só em festas e oferendas. Para adoçar, mel ou tâmaras.'] },
      { q: 'Como se faz a cerveja?', a: [
        'Assamos pães de cevada só por fora, esfarelamos na água e deixamos fermentar em potes. Depois coamos. Fica grossa, nutritiva e com pouco álcool — até as crianças bebem, é mais segura que a água do canal.',
        'Conta a lenda que a deusa leoa Sekhmet só parou de destruir a humanidade quando bebeu cerveja tingida de vermelho, achando que era sangue. Dormiu e acordou como a doce Hathor!'] },
      { q: 'E os ricos, comem o quê?', a: [
        'Banquetes! Boi, gazela, gansos assados, bolos de mel, vinho do Delta e dos oásis. As jarras de vinho têm rótulo com ano, vinhedo e o nome do vinhateiro — igual vinho bom do seu tempo, não?',
        'Nas festas há músicos e dançarinas, e os convidados usam guirlandas de flores e perfumes. Tudo servido por criados, em mesas baixas.'] },
      { q: 'Posso levar uma cerveja?', a: [
        'Claro! Pegue um jarro aqui na banca (tecla P). Aliás, se for às pirâmides, leve para o capataz Hori — os homens dele trabalham no sol o dia inteiro e ficariam felizes!'] },
    ],
    bye: 'Volte quando quiser — o forno nunca apaga!',
  },
  {
    id: 'djehuty', name: 'Djehuty', title: 'Mercador', objective: 'djehuty',
    look: { outfit: 'longkilt', hair: 'short', skin: 0x9c6644, collar: 0x2c5d9c },
    greet: 'Bem-vindo à minha banca! Linho fino do Delta, potes, incenso de Punt... Sou Djehuty. Tudo aqui tem seu preço em deben.',
    topics: [
      { q: 'Vocês não usam moedas?', a: [
        'Moedas? Não existem! Trocamos produtos. Para comparar valores usamos o deben, um peso de uns 90 gramas de cobre, e também medidas de grãos.',
        'Um par de sandálias vale um ou dois debens. Uma cama, uns vinte. Uma boa vaca, de trinta a cinquenta. Você paga com o que tiver — linho, grão, óleo, potes — desde que a soma em debens feche.'] },
      { q: 'De onde vêm as mercadorias?', a: [
        'De toda parte! Cedro do Líbano para barcos e caixões; incenso, mirra, ébano e peles de leopardo da terra de Punt; ouro e marfim da Núbia; lápis-lazúli de montanhas tão distantes que ninguém sabe ao certo.',
        'E nós vendemos grãos, linho e papiro para o mundo inteiro. Sem o Egito, metade dos reinos passaria fome.'] },
      { q: 'Por que não vejo camelos?', a: [
        'Camelos? Bicho raro do deserto, quase ninguém usa! Carregamos tudo em burros e, principalmente, em barcos pelo Nilo.',
        'O rio corre para o norte e o vento sopra do norte. Para descer, basta a correnteza; para subir, abrimos a vela. Até na escrita, "ir para o sul" se escreve com um barco de vela aberta!'] },
      { q: 'O que vocês vestem?', a: [
        'Linho, sempre. Os homens usam o saiote, as mulheres vestidos justos. Quanto mais fino o linho, mais rico você é: o linho real é quase transparente.',
        'Lã? Quase nunca — é considerada impura para entrar no templo e ser enterrada com os mortos.'] },
    ],
    bye: 'Bons negócios, viajante! E desconfie de quem pesa o cobre com a mão no prato.',
  },
  {
    id: 'henut', name: 'Henut', title: 'Vendedora de frutas',
    look: { outfit: 'dress', hair: 'long', skin: 0x8d5a3b, linen: 0xf1ead8 },
    greet: 'Figos! Tâmaras! Romãs do jardim do templo! Sou Henut. Pegue uma e prove, viajante — se gostar, volte com os amigos.',
    topics: [
      { q: 'Que frutas vocês têm?', a: [
        'Tâmaras, figos, figos de sicômoro — a árvore sagrada de Hathor —, uvas, melancias, alfarroba e o fruto da palmeira-dum. A romã é novidade dos jardins dos nobres.',
        'Laranja, limão, banana? Nunca ouvi falar! Isso deve ser coisa da sua terra.'] },
      { q: 'E os temperos?', a: [
        'Coentro, cominho, endro, feno-grego, mostarda e sal. O mel é caro: as abelhas são criadas em potes de barro e os apicultores tiram os favos com fumaça.',
        'Dizem que, às vezes, chegam ao palácio grãos de pimenta de terras muito, muito distantes. Coisa de rei!'] },
    ],
    bye: 'Leve uma tâmara para o caminho!',
  },
  {
    id: 'ipi', name: 'Ipi', title: 'Pescador', objective: 'ipi',
    look: { outfit: 'worker', hair: 'khat', skin: 0x6b3f26, collar: null },
    greet: 'Ô de terra! Sou Ipi, pescador. Meu barco é de feixes de papiro amarrados — leve como uma pena. Quer saber do rio? Ninguém conhece Hapi como eu.',
    topics: [
      { q: 'O que o Nilo significa para vocês?', a: [
        'O rio é a vida. Sem ele, só haveria deserto. Chamamos nossa terra de Kemet, a "Terra Negra", por causa do lodo escuro e fértil que a cheia deixa. O deserto é Deshret, a "Terra Vermelha".',
        'Não chove quase nunca. Toda a água que bebemos, que rega os campos e que leva os barcos vem dele.'] },
      { q: 'Como é a cheia?', a: [
        'Todo ano, no verão, o rio sobe e cobre os campos por meses. É o deus Hapi trazendo a fartura. Quando a água baixa, fica o lodo novo, pronto para semear.',
        'Os sacerdotes medem o nível nos nilômetros, escadas de pedra com marcas. Cheia baixa é fome; cheia alta demais destrói as aldeias. E os impostos do ano são calculados por essa medida!'] },
      { q: 'O rio é perigoso?', a: [
        'Muito! Os crocodilos de Sobek se escondem nos juncos. Mas o pior é o hipopótamo: parece calmo, mas vira barcos e morde. Mata mais gente que o crocodilo.',
        'Por isso levamos amuletos e recitamos encantamentos. E a deusa Taweret, que tem forma de hipopótamo, protege as mulheres na hora do parto.'] },
      { q: 'Como vocês pescam?', a: [
        'Com redes de arrasto puxadas entre dois barcos, com anzóis de cobre, armadilhas de vime e arpões. Tilápia, perca do Nilo, bagre...',
        'O que sobra a gente abre, salga e seca ao sol. Peixe seco é barato e dura muito — comida de trabalhador.'] },
    ],
    bye: 'Se for nadar, fique longe dos juncos!',
  },
  {
    id: 'tiy', name: 'Tiy', title: 'Lavradora da margem leste', objective: 'tiy',
    look: { outfit: 'dress', hair: 'khat', khat: 0xd9cfb4, skin: 0x7a4a2e, linen: 0xe2d6bc },
    greet: 'Você atravessou o rio?! Ou é muito corajoso, ou muito maluco. Sou Tiy. Estas terras pertencem ao templo, e minha família as cultiva.',
    topics: [
      { q: 'O que vocês plantam?', a: [
        'Trigo emmer e cevada, para o pão e a cerveja. Linho, para as roupas. Lentilhas, favas, cebolas e alho na horta.',
        'Quando a cheia baixa, espalhamos as sementes e soltamos as ovelhas e porcos para pisarem e enterrarem tudo. Na colheita, cortamos com foices de madeira com dentes de sílex.'] },
      { q: 'O que é aquela máquina no canal?', a: [
        'É o shaduf! Uma vara comprida com um contrapeso de barro numa ponta e um balde na outra. Com ele, uma pessoa tira água do canal para a horta o dia inteiro, sem quebrar as costas.'] },
      { q: 'Vocês pagam impostos?', a: [
        'E como! Os escribas vêm medir os campos com cordas e calcular a colheita. Uma parte dos grãos vai para o templo e para o faraó.',
        'Quem não paga pode levar bastonadas... E durante a cheia, quando não há trabalho no campo, os homens são chamados para as obras do rei.'] },
      { q: 'Como é a vida da família?', a: [
        'Casamos cedo e queremos muitos filhos — eles ajudam no campo e cuidam dos pais na velhice.',
        'E aqui a mulher tem seus direitos: esta terra que eu herdei da minha mãe é minha. Posso vendê-la, deixá-la para quem eu quiser e até me divorciar levando meus bens.'] },
    ],
    bye: 'Cuidado na volta — e se vir um crocodilo, nade mais rápido!',
  },
  {
    id: 'hori', name: 'Hori', title: 'Capataz da restauração', objective: 'hori',
    look: { outfit: 'worker', hair: 'short', extras: ['staff'], skin: 0x6b3f26 },
    greet: 'Olá, forasteiro. Sou Hori, chefe de turma. O príncipe Khaemwaset nos mandou tirar a areia e restaurar estes monumentos. Grandiosos, não? E pensar que já têm mais de mil anos!',
    topics: [
      { q: 'Quem construiu as pirâmides?', a: [
        'A maior é de Khufu — vocês o chamam de Quéops —, com quase 150 metros e mais de dois milhões de blocos. A do meio é de Khafre, Quéfren: parece mais alta porque está num terreno mais alto. A menor é de Menkaure, Miquerinos, com a base revestida de granito vermelho de Assuã.',
        'Viu como brilham? Ainda têm o revestimento de calcário branco e polido, trazido das pedreiras de Tura, do outro lado do rio.'] },
      { q: 'Foram escravos que construíram?', a: [
        'Escravos? Não! Eram trabalhadores egípcios, pagos com pão, cerveja, cebolas e roupas. As turmas tinham nomes como "Amigos de Khufu" e competiam entre si.',
        'Eles moravam numa vila ao sul das pirâmides, com padarias e cervejarias, e os chefes foram enterrados ali perto, com honra. Muitos camponeses vinham trabalhar durante a cheia, quando os campos estavam alagados.'] },
      { q: 'Como levantaram as pedras?', a: [
        'Com rampas de tijolo de barro e pedra, trenós de madeira, alavancas e muita gente puxando cordas. Na frente do trenó jogamos água na areia: ela fica firme e o bloco desliza melhor.',
        'O granito vinha de barco de Assuã, a quase mil quilômetros, e chegava por canais até o pé do planalto. Os lados da grande pirâmide apontam quase perfeitamente para o norte, sul, leste e oeste.'] },
      { q: 'E a Esfinge?', a: [
        'O grande leão com rosto de rei guarda o caminho de Khafre. Foi esculpido na própria rocha do planalto.',
        'A areia do deserto vive tentando enterrá-la. Há uns 150 anos, o rei Tutmés IV a desenterrou depois de um sonho e deixou uma estela entre as patas contando a história. Vá ver!'] },
    ],
    bye: 'Agora, se me der licença, esta areia não vai se tirar sozinha.',
  },
  {
    id: 'nofret', name: 'Nofret', title: 'Dona de casa', objective: 'nofret',
    look: { outfit: 'dress', hair: 'long', skin: 0x9c6644, collar: 0xa8392a },
    greet: 'Psiu, cuidado para não pisar na Miu! Sou Nofret. Estes são meus gatos — enquanto eles estiverem aqui, Bastet protege a nossa casa.',
    topics: [
      { q: 'Os gatos são sagrados?', a: [
        'São protegidos pela deusa Bastet! E úteis: caçam os ratos dos celeiros e até as cobras. Sabia que nossa palavra para gato é "miu"? Por causa do miado, claro.',
        'Matar um gato, mesmo sem querer, é crime gravíssimo. Quando o gato da casa morre, a família toda raspa as sobrancelhas em luto.'] },
      { q: 'Como são as casas?', a: [
        'De tijolos de barro do Nilo secos ao sol, rebocados e às vezes caiados de branco. As paredes grossas e as janelas pequenas e altas mantêm o frescor.',
        'No terraço secamos os grãos e dormimos nas noites quentes. Algumas casas têm um apanhador de vento no teto, que joga a brisa do norte para dentro. Na entrada, um pequeno altar para os ancestrais e para Bes, que espanta os maus espíritos.'] },
      { q: 'Beleza e higiene', a: [
        'Banho todo dia, com natrão no lugar do sabão. Pintamos os olhos com kohl — homens e mulheres! Ele embeleza, protege do sol forte e afasta as moscas e infecções.',
        'Muitos raspam a cabeça para evitar piolhos e usam perucas de cabelo humano nas festas. Perfumes de óleos e flores, espelhos de cobre polido... e pinças, navalhas, pentes.'] },
      { q: 'Como vocês se divertem?', a: [
        'Jogando senet! Um tabuleiro de 30 casas, jogado há séculos — dizem que a rainha Nefertari adorava. Também há o mehen, em forma de serpente enrolada.',
        'As crianças brincam com bonecos, bolas de couro, piões e jogos de luta. E nas grandes festas a cidade inteira canta e dança nas ruas.'] },
      { q: 'E as crianças?', a: [
        'Até a puberdade andam quase sem roupa e com a cabeça raspada, só com uma trança de lado — a "mecha da juventude".',
        'Os meninos aprendem o ofício do pai; as meninas, o da mãe. Só alguns poucos meninos vão à escola de escribas.'] },
    ],
    bye: 'Diga tchau, Miu! ...Ela não liga. Gatos.',
  },
  {
    id: 'mahu', name: 'Mahu', title: 'Chefe de tropa', objective: 'mahu',
    look: { outfit: 'soldier', hair: 'khat', khat: 0x2c5d9c, extras: ['spear', 'shield'], skin: 0x6b3f26, pose: 'spear' },
    greet: 'Alto lá! Ah, um viajante... Sou Mahu, chefe de tropa da divisão de Ptah. Sim, nossas divisões têm nomes de deuses: Amon, Rá, Ptah e Seth.',
    topics: [
      { q: 'Como é o exército?', a: [
        'A infantaria luta com lança, escudo de couro, machado e a khopesh, nossa espada curva. Os arqueiros usam o arco composto, que atira longe. A elite são os carros de guerra.',
        'Também temos estrangeiros: núbios, que são arqueiros temíveis, e os sherden, guerreiros do mar com elmos de chifres, que hoje formam a guarda do rei.'] },
      { q: 'Fale dos carros de guerra.', a: [
        'Leves, de madeira e couro, com rodas de seis raios e dois cavalos. Vão dois homens: o cocheiro e o arqueiro. Aprendemos a usá-los com os hicsos, que invadiram o Delta séculos atrás.',
        'Cavalo é caro e de prestígio: só os ricos e os oficiais têm. Viu o carro aqui no quartel?'] },
      { q: 'Você lutou em Kadesh?', a: [
        'Lutei! Ano 5 do rei, contra os hititas de Muwatalli. Fomos enganados por espiões e o acampamento do rei foi atacado de surpresa por milhares de carros inimigos.',
        'O faraó lutou com sua guarda até chegarem os reforços. No fim ninguém tomou a cidade... mas o rei mandou gravar a vitória em todos os templos. Pergunte a ele, se for recebido!'] },
      { q: 'Quem cuida da ordem na cidade?', a: [
        'Os Medjay. Eram guerreiros núbios do deserto e hoje são a nossa polícia: patrulham as ruas, o deserto e as necrópoles, caçando ladrões de túmulos.',
        'Os castigos? Bastonadas, trabalho forçado nas pedreiras... e, para crimes graves, cortar o nariz e as orelhas. Então comporte-se, viajante!'] },
      { q: 'Posso pegar uma arma?', a: [
        'Pode pegar uma khopesh ali no armeiro (tecla P) para sentir o peso. É bronze puro. Mas devolva, hein? Não quero ter que explicar ao comandante.'] },
    ],
    bye: 'Siga em frente — e mantenha a khopesh longe dos civis.',
  },
  {
    id: 'merneptah', name: 'Merneptah', title: 'Príncipe e general', objective: 'merneptah',
    look: { outfit: 'soldier', hair: 'short', extras: ['khopesh'], skin: 0x9c6644, collar: 'royal', height: 1.8 },
    greet: 'Você deve ser o estrangeiro que meu irmão Khaemwaset mencionou. Sou Merneptah, décimo terceiro filho do rei e da rainha Isetnofret. Comando tropas do exército do meu pai.',
    topics: [
      { q: 'Um príncipe no quartel?', a: [
        'Os filhos do rei servem onde ele manda. Meus irmãos mais velhos seguiram para o templo, para a administração, para o exército. Eu aprendi a liderar homens, cuidar dos carros de guerra e das fortalezas.',
        'Temos tantos irmãos que só os deuses sabem qual de nós um dia vestirá a coroa. Eu sirvo, e isso me basta.'] },
      { q: 'Quem ameaça o Egito hoje?', a: [
        'Com os hititas há paz desde o tratado. O perigo agora vem do oeste: tribos líbias que tentam se fixar no Delta, e povos do mar que atacam a costa em barcos.',
        'Meu pai mandou erguer uma linha de fortalezas no oeste do Delta e na costa para vigiar as rotas do deserto. Os soldados que você vê aqui revezam nessas guarnições.'] },
      { q: 'O que é o Festival Sed?', a: [
        'Este é o 30º ano do reinado: o ano do primeiro Festival Sed do meu pai, o jubileu que renova as forças do rei. Foi meu irmão Khaemwaset quem o proclamou por todo o Egito.',
        'Na cerimônia, o rei corre um percurso ritual diante dos deuses para provar que ainda tem vigor para governar. Estátuas de deuses vêm de todo o país. Mênfis inteira está em festa por isso.'] },
      { q: 'Como se treina um soldado?', a: [
        'Desde jovem: corrida, luta, arco e lança. Os melhores vão para os carros de guerra, onde cocheiro e arqueiro precisam agir como um só.',
        'Disciplina é tudo. Em Kadesh, a divisão que fugiu em pânico quase custou a vida do rei. Nunca mais.'] },
    ],
    bye: 'Que Montu, o deus da guerra, guarde seus passos — e que você nunca precise dele.',
  },
  {
    id: 'isetnofret', name: 'Isetnofret', title: 'Grande Esposa Real', objective: 'isetnofret',
    look: { outfit: 'dress', hair: 'queen', skin: 0xa8724c, collar: 'royal', linen: 0xfbf6ea, sash: 0xb8402c, height: 1.68 },
    greet: 'Aproxime-se, viajante. Sou Isetnofret, Grande Esposa Real do Senhor das Duas Terras. Meus filhos falaram de você.',
    topics: [
      { q: 'Qual é o papel da rainha?', a: [
        'A Grande Esposa Real participa dos rituais ao lado do rei, como a deusa ao lado do deus. Sem ela, a ordem do mundo fica incompleta.',
        'Também cuido de terras, oficinas de tecelagem e de toda a casa das mulheres do palácio, onde se fazem os linhos mais finos do Egito.'] },
      { q: 'Fale dos seus filhos.', a: [
        'Khaemwaset, o sábio, serve a Ptah aqui em Mênfis. Merneptah comanda soldados. Ramsés, meu primogênito, é hoje o herdeiro do trono. E minha filha Bintanath brilha na corte.',
        'Uma mãe não escolhe o preferido... mas confesso que Khaemwaset, com seus livros antigos e suas pirâmides restauradas, me enche de orgulho.'] },
      { q: 'E a rainha Nefertari?', a: [
        'Nefertari foi a primeira Grande Esposa do rei, e ele a amou como poucos homens amam. Partiu para o Ocidente há alguns anos, e o rei mandou fazer para ela um túmulo digno de uma deusa.',
        'Hoje cabe a mim estar ao lado dele. É uma honra e um peso.'] },
      { q: 'Como se vestem as damas da corte?', a: [
        'Linho tão fino que deixa ver a pele, plissado em dobras miúdas. Perucas longas trançadas, perfumadas com óleos. Colares largos de ouro e faiança, braceletes, brincos.',
        'Nas festas, flores de lótus no cabelo e muito kohl nos olhos. A beleza também é uma forma de honrar os deuses.'] },
    ],
    bye: 'Vá com Ísis, viajante. E não demore no jardim: o sol do meio-dia não perdoa ninguém.',
  },
  {
    id: 'rahotep', name: 'Rahotep', title: 'Vizir do Norte', objective: 'rahotep',
    look: { outfit: 'longkilt', hair: 'short', extras: ['scroll', 'staff'], skin: 0x9c6644, collar: 0xd9a23e, height: 1.76 },
    greet: 'Fale depressa, estrangeiro: hoje há trinta casos esperando o vizir. Sou Rahotep, vizir do Norte. Do Delta até Mênfis, a justiça, os impostos e os celeiros do rei passam por estas mãos.',
    topics: [
      { q: 'O que faz um vizir?', a: [
        'O rei tem dois vizires: um em Tebas, para o Sul, e eu aqui, para o Norte. Toda manhã eu presto contas ao Senhor das Duas Terras e ouço o tesoureiro. Depois, sento no meu salão e julgo.',
        'Abro as cartas dos governadores, mando medir as terras depois da cheia, conto o gado e o grão de cada aldeia. Se o Nilo sobe pouco, sou eu quem abre os celeiros para o povo não passar fome.'] },
      { q: 'Como se julga um caso?', a: [
        'Diante de mim fica estendido o manto com os quarenta rolos da lei. Ouço os dois lados; o escriba anota tudo. Um vizir deve tratar igual o homem que conhece e o que não conhece — é o que o rei diz no dia em que nos nomeia.',
        'A deusa Maat, a Verdade e a Justiça, vai no meu peito, num pingente de ouro. Quem mente diante do vizir mente diante dela. E o castigo vai das bastonadas ao trabalho nas pedreiras.'] },
      { q: 'E os impostos?', a: [
        'Ninguém paga em moedas: paga-se em grão, gado, linho, mel, trabalho. Depois da cheia, os escribas medem cada campo e calculam quanto cada um deve ao celeiro do rei e ao templo.',
        'Na época da cheia, quando não há o que plantar, os homens trabalham para o rei: cavam canais, puxam blocos, erguem templos. Em troca, recebem pão, cerveja e cebolas.'] },
    ],
    bye: 'Vá em paz. E se alguém o enganar no mercado, venha ao salão do vizir.',
  },
  {
    id: 'tia', name: 'Tia', title: 'Princesa, irmã do faraó', objective: 'tia',
    look: { outfit: 'dress', hair: 'queen', skin: 0xa8724c, collar: 'royal', linen: 0xfbf6ea, sash: 0x2c5d9c, height: 1.64 },
    greet: 'Viajante! Você me encontrou longe do palácio: venho ver o andamento do meu túmulo, ali em Sacara, ao lado da antiga pirâmide de Djoser. Sou Tia, filha de Seti e irmã do rei.',
    topics: [
      { q: 'Um túmulo, tão cedo?', a: [
        'Um egípcio passa a vida preparando a eternidade. Meu marido, que também se chama Tia e é supervisor do tesouro do rei, e eu mandamos construir um túmulo como um pequeno templo, com pátio, colunas e uma capela com pirâmide em cima.',
        'Nas paredes, os escultores entalham nossa vida: banquetes, a festa do barco de Sokar, nós dois diante de Osíris. Lá dentro ficarão as estátuas que vão receber as oferendas quando partirmos.'] },
      { q: 'Como era crescer com o rei?', a: [
        'Nosso pai, Seti, era um general que virou rei, filho de outro soldado, o primeiro Ramsés. Meu irmão foi educado para o trono desde menino: aos dez anos já era capitão do exército.',
        'Ele sempre foi assim, cheio de força e de vontade. Hoje enche o Egito de estátuas com o nome dele — às vezes apaga o nome dos reis antigos e põe o seu. Mas ninguém, depois dele, vai esquecê-lo.'] },
      { q: 'O que é Sacara?', a: [
        'É a cidade dos mortos de Mênfis, no deserto do oeste, onde o sol se põe. Ali está a primeira pirâmide do mundo, a de degraus, que Imhotep construiu para o rei Djoser mil e quatrocentos anos atrás.',
        'Meu sobrinho Khaemwaset anda restaurando as pirâmides antigas e gravando nelas o nome dos reis que as fizeram. Ele diz que um nome lembrado é uma vida que continua.'] },
    ],
    bye: 'Que Ptah o guarde em Mênfis, e que Osíris o receba só daqui a muitos anos.',
  },
  {
    id: 'ramses', name: 'Ramsés II', title: 'Senhor das Duas Terras', objective: 'farao',
    look: { outfit: 'pharaoh', hair: 'nemes', extras: ['crook'], skin: 0x9c6644, height: 1.82, pose: 'royal' },
    greet: 'Então você é o viajante de quem toda Mênfis fala. Eu sou Usermaatre Setepenre, Ramsés, Amado de Amon, Senhor das Duas Terras e filho de Rá. Fale: o rei o escuta.',
    topics: [
      { q: 'O que é ser faraó?', a: [
        'O rei é Hórus vivo na terra. Minha tarefa é manter Maat — a ordem do mundo —, servir aos deuses, proteger as fronteiras e garantir que o Nilo e as colheitas sejam fartos.',
        '"Faraó" vem de per-aa, a "Casa Grande": o palácio. Hoje o povo chama o rei pelo nome da casa onde ele mora. Governo com vizires, sacerdotes, generais e um exército de escribas.'] },
      { q: 'Conte sobre a batalha de Kadesh.', a: [
        'No meu quinto ano marchei contra os hititas de Muwatalli. Dois espiões nos enganaram e fui cercado por milhares de carros de guerra.',
        'Lutei como Montu, o deus da guerra, ao lado da minha guarda, até chegarem os reforços. Mandei gravar essa história em todos os grandes templos, de Abidos a Abu Simbel. Alguns dizem que não foi bem uma vitória... mas quem escreve nas paredes sou eu.'] },
      { q: 'E a paz com os hititas?', a: [
        'No meu 21º ano assinei a paz com o rei hitita Hattusili. Prometemos não atacar um ao outro e nos ajudar contra inimigos. É o tratado de paz mais antigo que seu mundo conhece.',
        'Foi gravado em hieróglifos em Karnak e em tábuas de argila na capital deles. Agora fala-se até de um casamento com uma princesa hitita, para selar a amizade.'] },
      { q: 'Quais foram suas grandes obras?', a: [
        'Os templos de Abu Simbel, cavados na rocha da Núbia — um deles para a rainha Nefertari. O Ramesseum em Tebas, minha casa de milhões de anos. Uma nova capital no Delta, Pi-Ramsés.',
        'E aqui em Mênfis, os colossos de granito na entrada do templo de Ptah. Gostou deles? Fizeram justiça ao meu perfil.'] },
      { q: 'E sua família?', a: [
        'Minha amada Nefertari, "aquela por quem o sol brilha", já partiu para o Ocidente. Fiz para ela um túmulo no Vale das Rainhas, com as pinturas mais belas da terra.',
        'Tenho mais de cem filhos e filhas. Khaemwaset, que você conheceu no templo, é um dos mais sábios. Dizem que vou viver mais que muitos deles... os deuses sabem.'] },
    ],
    bye: 'Vá, viajante. Conte no seu tempo o que viu em Mênfis — enquanto o meu nome for lembrado, eu viverei.',
  },
];

export const GUARD_LINES = {
  locked: 'Alto! O palácio do Senhor das Duas Terras não é lugar para curiosos. Conheça primeiro a cidade: converse com o povo, veja os templos. Quem conhece Mênfis talvez seja recebido pelo rei.',
  open: 'O faraó ouviu falar de você, viajante. Pode entrar na sala do trono — e curve-se diante do Senhor das Duas Terras.',
};

export const VILLAGER_LINES = [
  'Que Ptah abençoe seu trabalho!',
  'A cheia deste ano foi boa: vai ter pão em todas as mesas.',
  'Já viu o touro Ápis? Ele tem uma mancha branca em forma de triângulo na testa.',
  'Cuidado ao nadar perto dos juncos: é lá que os crocodilos se escondem.',
  'Meu filho entrou na escola de escribas. Que orgulho!',
  'Amanhã tem festa: o templo vai distribuir pão e cerveja.',
  'Que chapéu estranho... de que terra você vem?',
  'Estou levando esta jarra para os trabalhadores do templo.',
  'Contra o mau-olhado, nada melhor que um amuleto do olho de Hórus.',
  'Os barcos com cedro do Líbano chegaram ontem ao cais.',
  'Nas noites quentes eu durmo no terraço. Bem mais fresco!',
  'O cobre anda caro nesta estação...',
  'Ouvi dizer que o faraó tem mais de cem filhos!',
  'Lave as mãos antes de comer, viajante. Até os deuses gostam de limpeza.',
  'Com esse sol, passe kohl nos olhos.',
  'Dizem que o escaravelho Khepri empurra o sol pelo céu, como uma bola de esterco.',
  'Meu avô ajudou a erguer os colossos do rei.',
  'O papiro está barato hoje no mercado.',
  'Vai à festa de Ptah? Vão tirar a estátua do deus em procissão!',
  'Meu marido foi chamado para as obras do rei durante a cheia.',
];

export const SOLDIER_LINES = [
  'Circulando, viajante. Estamos de patrulha.',
  'A divisão de Ptah não dorme.',
  'Viu algum ladrão de túmulos por aí? Os Medjay pagam bem pela informação.',
  'Sol forte hoje... e esse escudo de couro pesa.',
];

export const WORKER_LINES = [
  'Ufa! Mais um bloco e paramos para a cerveja.',
  'Somos da turma "Vigorosos de Khaemwaset"!',
  'Joga água na areia na frente do trenó, que ele desliza!',
  'Já fui à pedreira de Tura buscar calcário. Viagem longa de barco.',
];

export const FARMER_LINES = [
  'A cevada está quase boa para a colheita.',
  'O escriba do templo vem medir o campo amanhã... tomara que seja justo.',
  'Esse lodo do Nilo é ouro preto, viajante.',
];

export const CHILD_LINES = [
  'Pega! Pega! Ninguém me alcança!',
  'Você é um deus estrangeiro?',
  'Minha mãe disse que eu não posso nadar no rio sozinho...',
];
