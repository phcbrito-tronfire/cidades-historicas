// As pessoas com conversa longa de Vila Rica, 1789 (Etapa 6). Quem é quem:
// - PESSOAS HISTÓRICAS: Antônio Francisco Lisboa, o Aleijadinho; Tomás Antônio Gonzaga; Maria Doroteia Joaquina de
//   Seixas; Cláudio Manuel da Costa; Joaquim José da Silva Xavier, o Tiradentes; João Rodrigues de Macedo. O que dizem
//   segue o que se sabe deles; as conversas em si são imaginadas.
// - GENTE COMUM, inventada para mostrar o dia a dia: o juiz da Irmandade do Rosário, o faiscador forro, a quitandeira,
//   o minerador, o vigário do Pilar, o cabo dos dragões, o ensaiador da Casa da Ópera e o tropeiro.
// Lenda é dita como lenda ("contam", "dizem"); o que vem depois de 1789 ninguém sabe ainda.
// days: os dias (1 a 14) em que a pessoa está na vila; greetDay: o que ela diz primeiro em certos dias.
export const NPCS = [
  {
    id: 'aleijadinho', name: 'Antônio Francisco Lisboa', title: 'Mestre entalhador e riscador — o Aleijadinho', objective: 'c_aleijadinho', where: 'saofrancisco',
    look: { outfit: 'colono', top: 0x5a4a3a, legs: 0x3a3428, vest: 0x2a2420, hair: 'chapeu', hatColor: 0x1e1814, skin: 0x8a5a3a, barefoot: false },
    greet: 'Hum. Vossa mercê veio ver a obra ou veio ver o doente? Se for a obra, chegue mais. Sou Antônio Francisco. O povo me chama de outra coisa, eu sei.',
    topics: [
      { q: 'O que o senhor faz nesta igreja?', a: [
        'A Ordem Terceira de São Francisco me encomendou o risco da fachada e da portada. A portada de pedra-sabão, com as armas de Portugal e os emblemas da Ordem, e o medalhão lá no alto, com São Francisco recebendo as chagas, saíram das minhas mãos e das dos meus oficiais.',
        'Agora estou riscando a capela-mor: o retábulo, o altar, tudo. A Ordem paga aos poucos, então a obra anda no passo do dinheiro. As torres ainda vão subir — por isso o andaime.'] },
      { q: 'Quem trabalha com o senhor?', a: [
        'O Maurício, o Agostinho, o Januário. São meus escravos e são entalhadores dos bons. O Maurício talha quase tão bem quanto eu, e às vezes melhor.',
        'Quando a mão não obedece, é ele quem me ajuda a firmar o ferro. Não gosto que me vejam assim. Por isso trabalho cedo, debaixo do toldo, e ando coberto.'] },
      { q: 'Que doença é essa?', a: [
        'Começou faz uns dez anos. Primeiro os dedos, depois os pés, e a dor. Os físicos dão nomes diferentes; nenhum dá cura.',
        'Deus tirou de um lado e deixou do outro: o olho e o juízo continuam bons. Enquanto eu enxergar a pedra, trabalho.'] },
      { q: 'Onde o senhor aprendeu o ofício?', a: [
        'Com meu pai, Manuel Francisco Lisboa, mestre de obras vindo de Lisboa. Minha mãe, Isabel, era escrava dele. Ele me deu a liberdade no batismo.',
        'Aprendi desenho também com o abridor de cunhos da Casa de Fundição. O resto foi olhar: estampas que vinham de Portugal, igrejas, e muita pedra estragada até acertar.'] },
    ],
    bye: 'Vá com Deus. E não repare: trabalho melhor quando ninguém está olhando.',
  },
  {
    id: 'gonzaga', name: 'Tomás Antônio Gonzaga', title: 'Desembargador nomeado para a Bahia, antigo ouvidor de Vila Rica', objective: 'c_gonzaga', where: 'gonzaga', days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    look: { outfit: 'casaca', coat: 0x1e2430, vest: 0xe8dcc0, legs: 0x1e2430, stockings: 0xf0ece2, hair: 'rabicho', hairColor: 0x3a3028, skin: 0xe0bfa4, extras: ['bengala'] },
    greet: 'Bom dia. Tomás Antônio Gonzaga, às suas ordens. Até o ano passado fui ouvidor desta comarca; agora espero os papéis para tomar posse na Relação da Bahia.',
    greetDay: { 10: 'Fale baixo, por favor. Dizem que prenderam o alferes no Rio. Não sei de mais nada, e é melhor assim.' },
    topics: [
      { q: 'O que faz um ouvidor?', a: [
        'É o juiz do rei na comarca: julga as causas, corrige os juízes da terra, fiscaliza a Câmara. Muito papel e pouco agradecimento.',
        'Agora fui nomeado desembargador na Bahia. Era para eu já ter partido, mas tenho um motivo para ficar mais um pouco.'] },
      { q: 'O senhor é poeta?', a: [
        'Faço uns versos. Entre os amigos eu sou Dirceu, um pastor, e ela é Marília. São liras de amor; correm de mão em mão, copiadas.',
        'Há também umas cartas que zombam do antigo governador, as Cartas Chilenas. Correm em cópias, sem nome. Dizem que são minhas. Eu não digo nada.'] },
      { q: 'Quem é Marília?', a: [
        'Maria Doroteia. Mora perto da matriz de Antônio Dias. É muito moça, e eu já não sou. O casamento está marcado para o fim de maio.',
        'Se for ver a casa dela, vá pela Rua de Antônio Dias. E não conte que fui eu que mandei.'] },
      { q: 'E a derrama?', a: [
        'Um homem de leis não comenta na rua o que se diz nas salas. Digo só isto: cobrar de uma vez o ouro atrasado de anos, de quem já não tem, é acender um fogo.',
        'O povo está cansado. E quem está cansado fala demais.'] },
    ],
    bye: 'Passe bem. E se encontrar o alferes Silva Xavier, peça-lhe, por caridade, que fale mais baixo.',
  },
  {
    id: 'marilia', name: 'Maria Doroteia Joaquina de Seixas', title: 'Noiva de Gonzaga — a Marília das liras', objective: 'c_marilia', where: 'marilia',
    look: { outfit: 'saia', skirt: 0x3a2a3a, top: 0x3a2a3a, hair: 'mantilha', skin: 0xe0c4ac },
    greet: 'Ah… boa tarde. Sou Maria Doroteia. Se procura o Doutor Gonzaga, ele mora na Rua do Ouvidor, não aqui.',
    greetDay: { 11: 'Levaram-no hoje cedo. Os soldados entraram na casa dele antes do sol. Faltavam poucos dias para o casamento.', 12: 'Não sei onde ele está. Ninguém me diz nada. Rezo.', 13: 'Morreu o Doutor Cláudio, na prisão. Disseram que foi ele mesmo. Eu não sei em que acreditar.', 14: 'Dizem que vão levá-los todos para o Rio. Espero. É o que me resta.' },
    topics: [
      { q: 'A senhora é a Marília dos versos?', a: [
        'É como ele me chama nos versos. Fico vermelha quando alguém lê em voz alta na rua. Mas guardo cada folha.',
        'Ele escreve que vamos envelhecer juntos, numa casinha com um jardim. Os poetas exageram. Eu me contento com a casinha.'] },
      { q: 'Como é a vida de uma moça em Vila Rica?', a: [
        'De casa para a igreja, da igreja para casa. Na rua, de mantilha e acompanhada. Escrever cartas, bordar, tocar um pouco de cravo.',
        'Moça não fala de governo. Mas escuta. E ultimamente se escuta muita coisa.'] },
      { q: 'Quando é o casamento?', a: [
        'No fim de maio, se Deus quiser e os papéis da Bahia deixarem. Ele tem pressa de partir; eu tenho pressa de ir junto.'] },
    ],
    bye: 'Vá com Deus. Se passar pela igreja, acenda uma vela por nós.',
  },
  {
    id: 'claudio', name: 'Cláudio Manuel da Costa', title: 'Advogado e poeta', objective: 'c_claudio', where: 'claudio', days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    look: { outfit: 'casaca', coat: 0x2a2228, vest: 0x5a4a3a, legs: 0x2a2228, stockings: 0xe2dccc, hair: 'rabicho', hairColor: 0x8a8480, skin: 0xd8b496, extras: ['bengala'] },
    greet: 'Entre, entre. Cláudio Manuel da Costa, advogado — e, nas horas que sobram, poeta. Já passei dos sessenta; as horas que sobram são poucas.',
    greetDay: { 10: 'Queimei uns papéis ontem à noite. Cartas velhas, versos. Um homem da minha idade tem o direito de arrumar a gaveta.', 11: 'Prenderam o Gonzaga. Eu sou o próximo, sei disso. Ainda assim, sente-se.' },
    topics: [
      { q: 'O senhor estudou onde?', a: [
        'Em Coimbra, como quase todos os que sabem latim por aqui. Voltei para Minas e fiquei. Fui secretário do governo da capitania, advoguei para meia vila.',
        'Na academia dos poetas, a Arcádia, me deram o nome de Glauceste Satúrnio. Pastores e ninfas, à moda de Roma — escritos no meio das lavras.'] },
      { q: 'Que poesia o senhor escreve?', a: [
        'Sonetos, sobretudo. E um poema comprido sobre a fundação desta vila, que chamei de "Vila Rica": os paulistas, as minas, as guerras dos emboabas.',
        'Nunca imprimi quase nada. Aqui não há tipografia; o que se imprime vai a Lisboa e volta, quando volta.'] },
      { q: 'O que o senhor acha da derrama?', a: [
        'Acho que o rei tem direito ao quinto e que a terra já não tem o ouro. As duas coisas são verdade ao mesmo tempo, e é aí que mora o perigo.',
        'Reúnem-se homens nesta casa para ler e conversar. Ler não é crime. Ainda.'] },
    ],
    bye: 'Volte quando quiser. Se eu não estiver, estarei rezando — ou escrevendo, que é o mesmo.',
  },
  {
    id: 'tiradentes', name: 'Joaquim José da Silva Xavier', title: 'Alferes do Regimento de Cavalaria — o Tiradentes', objective: 'c_tiradentes', where: 'venda', days: [1, 2, 3],
    look: { outfit: 'dragao', coat: 0x1f2b52, vest: 0xc9a23a, facing: 0xc9a23a, legs: 0xd8c89a, boots: 0x16100c, hair: 'tricorne', trim: 0xd8b04a, skin: 0xd2aa86, beard: 'full', beardColor: 0x6a4a30 },
    greet: 'Salve! Joaquim José, alferes do Regimento de Cavalaria. Me chamam de Tiradentes, porque também arranco dente e ponho dente novo. Sente aí, que eu pago a aguardente!',
    topics: [
      { q: 'Por que o chamam de Tiradentes?', a: [
        'Aprendi com o meu padrinho a tratar da boca: arranco o dente podre e faço dente de osso que até parece de verdade. Já fui tropeiro, minerador, mascate. Agora sou soldado.',
        'Alferes há anos, e nada de promoção. Outros, mais novos e com padrinho, passam na frente. É assim nesta terra.'] },
      { q: 'O que o senhor acha da derrama?', a: [
        'Acho um roubo! O ouro some do chão e o rei manda cobrar como se ainda corresse nos córregos. Esta terra é a mais rica do mundo e vive na miséria.',
        'Os ingleses da América do Norte se livraram do rei deles. Vi o livro com as leis deles. Se lá deu certo, por que aqui não daria?'] },
      { q: 'O senhor viaja muito?', a: [
        'Subo e desço o Caminho Novo para o Rio como quem vai à esquina. Tenho um projeto de levar água encanada para o Rio, e de moinhos — os vice-reis não escutam.',
        'Vou para lá de novo em março. Até lá, quem quiser conversar me acha aqui. Falo com todo mundo — é o meu defeito, dizem.'] },
    ],
    bye: 'Até mais ver! E não se assuste com o que eu falo: cachorro que late não morde. (Ri alto.)',
  },
  {
    id: 'macedo', name: 'João Rodrigues de Macedo', title: 'Contratador — dono da casa dos Contos', objective: 'c_macedo', where: 'contos', days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    look: { outfit: 'casaca', coat: 0x3a2a22, vest: 0xd8c8a0, vestPattern: 'kasuri', legs: 0x3a2a22, stockings: 0xf0ece2, hair: 'rabicho', hairColor: 0x6a6460, skin: 0xd8b496 },
    greet: 'Seja bem-vindo à minha casa. João Rodrigues de Macedo. Se vem tratar de contrato, sente-se; se vem cobrar, a fila é grande e começa no rei.',
    topics: [
      { q: 'O que faz um contratador?', a: [
        'O rei não cobra os impostos ele mesmo: arrenda a cobrança. Eu arrematei o contrato das entradas — o imposto de tudo o que entra na capitania — e o dos dízimos.',
        'Pago ao rei um valor certo e cobro do povo, com os meus homens nos registros das estradas. Se a cobrança rende mais, ganho. Se rende menos, devo. E hoje devo muito.'] },
      { q: 'Esta casa é sua?', a: [
        'Mandei fazer faz poucos anos. Três andares, cantaria, vidraça. Embaixo, o escritório e o depósito; em cima, a família. É a casa mais nova da vila.',
        'Aqui vem gente de todo tipo: tropeiro, padre, doutor, oficial. Conversa-se muito à mesa desta casa.'] },
      { q: 'E a balança de ouro, ali?', a: [
        'O ouro em pó corre como dinheiro: compra-se pão com uma pitada, paga-se dívida em oitavas. Por isso a balança: ninguém confia no olho.',
        'O ouro em pó devia ir todo à Casa de Fundição, para tirar o quinto e virar barra com o selo. Devia.'] },
    ],
    bye: 'Passe bem. E esqueça o que viu na minha mesa.',
  },
  {
    id: 'juiz', name: 'Domingos Pereira', title: 'Juiz da Irmandade de Nossa Senhora do Rosário dos Pretos', objective: 'c_juiz', where: 'rosario',
    look: { outfit: 'casaca', coat: 0x2a2228, vest: 0xc8402a, legs: 0x2a2228, stockings: 0xe8e0d0, hair: 'natural', skin: 0x5e3a26, extras: ['bengala'] },
    greetDay: { 9: 'Morreu um irmão nosso na lavra da Queimada. A irmandade vai buscar o corpo, pagar a cova, a vela e a missa. É para isso que a gente existe.', 7: 'Viu o que fizeram com o Antônio no pelourinho? A irmandade vai cuidar das costas dele. A justiça do rei, para nós, é isso.' },
    greet: 'Salve Maria. Sou Domingos Pereira, forro, juiz da Irmandade do Rosário dos Pretos este ano. A igreja ainda está em obra, como vê. Com o nosso dinheiro, pedra por pedra.',
    topics: [
      { q: 'O que é a irmandade?', a: [
        'É a nossa casa. Brancos têm as deles, pardos as deles, e nós, pretos, temos a do Rosário. Cada irmão paga a sua entrada e o seu anual.',
        'Com esse dinheiro a irmandade enterra os irmãos com missa e vela — ninguém aqui vai para a vala sem nome —, cuida dos doentes e ajuda a comprar a alforria de quem está perto de conseguir.'] },
      { q: 'O que é a coroação do rei e da rainha?', a: [
        'Na festa do Rosário a irmandade coroa um rei e uma rainha. Saem pela vila com corte, bandeira, tambor e canto. É a nossa festa, a nossa memória de lá.',
        'Os mais velhos contam de um rei do Congo que veio escravo, comprou a liberdade do filho e depois a de outros. É história que se conta; papel não tem. Mas a gente conta.'] },
      { q: 'E essa conversa de liberdade na vila?', a: [
        'Os doutores andam falando em liberdade, em república, nos ingleses da América. Escuto calado quando sirvo à mesa deles.',
        'É a liberdade deles: de não pagar o quinto ao rei. Da nossa ninguém fala. Quase todos têm escravos em casa e nas lavras, e vão continuar tendo.'] },
    ],
    bye: 'Vá com Deus e com a Senhora do Rosário. Se quiser ajudar a obra, a caixa fica na porta.',
  },
  {
    id: 'faiscador_bento', name: 'Bento', title: 'Faiscador forro', objective: 'c_faiscador', where: 'ribeirao',
    look: { outfit: 'colono', top: 0xd8ccb0, legs: 0x6a5a48, hair: 'palha', skin: 0x5e3a26, barefoot: true, extras: ['bateia'] },
    greet: 'Ô de casa! Não, de córrego. (Ri.) Sou Bento, faiscador. Forro, graças a Deus e a esta bateia.',
    topics: [
      { q: 'Como se acha ouro no córrego?', a: [
        'Pega o cascalho do fundo, onde a água corre mais devagar. Põe na bateia com água e vai girando, girando. A areia e a terra saem pela beira; o ouro, que pesa mais, fica no fundo, brilhando.',
        'Antigamente se via pepita do tamanho de um grão de milho. Hoje é pó, fininho. Um dia bom dá uma oitava. Um dia ruim dá fome.'] },
      { q: 'Como o senhor ficou livre?', a: [
        'Meu senhor me deixava faiscar no domingo e no dia santo. O que eu achava era meu. Fui guardando, oitava por oitava. Levei onze anos.',
        'Paguei o preço que ele pediu, em ouro pesado na balança. Tenho a carta de alforria guardada num canudo de lata, aqui, junto ao peito.'] },
      { q: 'O que são os quilombos?', a: [
        'É onde vivem os que fugiram: no alto das serras, no meio do mato, longe das estradas. Plantam roça, caçam, fazem a vida deles. Tem quilombo pequeno, de dez pessoas, e já teve grande, de mil.',
        'O capitão do mato vive de caçar fugido: o senhor paga a tomadia por cabeça. Quando pegam, é açoite no pelourinho, ferro no pescoço, às vezes marca a fogo. E mesmo assim tem quem fuja. Isso diz tudo.'] },
      { q: 'E o quinto do rei?', a: [
        'O ouro em pó tem de ir à Casa de Fundição, virar barra e pagar o quinto. Com a minha pitadinha? Ir lá custa mais do que ela vale.',
        'Quem é pego com ouro fora da lei perde tudo e ainda vai preso. Então a gente compra pão, cachaça e fumo com pó mesmo, numa pitada. Todo mundo faz.'] },
    ],
    bye: 'Vá em paz. Se o rio te der um brilho, não conta pra ninguém.',
  },
  {
    id: 'quitandeira_inacia', name: 'Inácia', title: 'Quitandeira forra', objective: 'c_quitandeira', where: 'praca',
    look: { outfit: 'saia', skirt: 0x7a3a2a, pattern: 'shima', accent: '#e8e0cc', top: 0xece4d4, apron: 0xece4d4, pano: 0x2a3a6a, panoAccent: '#e8dcc0', hair: 'torco', headColor: 0xf2ece0, skin: 0x4e301e, barefoot: false, extras: ['tabuleiro'] },
    greet: 'Bom dia, meu senhor! Inácia, quitandeira, forra e de sapato no pé, como vê. Quer um pé de moleque? Fresquinho, de ontem.',
    greetDay: { 7: 'Tá todo mundo cochichando. Diz que tem traidor no meio dos doutores. Eu vendo meu bolo e fico de olho aberto.', 13: 'Sabe do doutor Cláudio? Dizem que se enforcou na cela. Dizem. Ninguém viu. E quem viu não fala.' },
    topics: [
      { q: 'O que a senhora vende?', a: [
        'Pé de moleque, cocada, bolo de fubá, angu com couve, pastel. E fruta: banana, laranja, jabuticaba quando é tempo. Faço tudo de madrugada.',
        'Freguês certo é o mineiro que sai da lavra com fome, o tropeiro que chega, o soldado da guarda. E o povo da praça.'] },
      { q: 'Como a senhora ficou livre?', a: [
        'Fui quitandeira de ganho: vendia para a minha senhora e ela ficava com quase tudo. O que sobrava eu guardava. Paguei a alforria em quatro anos, em prestações.',
        'Agora a venda é minha. Ainda pago o aluguel do tabuleiro na praça para a Câmara. Liberdade também tem imposto.'] },
      { q: 'Por que tantas quitandeiras são mulheres pretas?', a: [
        'Porque é o que nos deixaram fazer, e a gente fez bem. Quase todo o comércio miúdo desta vila passa pelas nossas mãos.',
        'A Câmara não gosta: proíbe tabuleiro nas lavras, diz que a gente compra ouro escondido dos escravos, que esconde fugido. Mas sem nós ninguém come.'] },
    ],
    bye: 'Volte amanhã, que eu faço cocada de leite!',
  },
  {
    id: 'minerador_goncalo', name: 'Gonçalo', title: 'Minerador escravizado, de nação mina', objective: 'c_minerador', where: 'queimada',
    look: { outfit: 'escravo', top: 0xb8ac90, legs: 0x8a7a60, shorts: true, barefoot: true, hair: 'barrete', hatColor: 0x8a2a20, skin: 0x4e301e, extras: ['almocafre'] },
    greet: 'Meu nome é Gonçalo. Lá na minha terra era outro; aqui me deram este no batismo. Sou de nação mina, da Costa da Mina.',
    greetDay: { 9: 'Desabou a galeria de baixo. Era o Caetano, de nação angola. Tinha mulher e um menino. Hoje ninguém canta no terreiro.' },
    topics: [
      { q: 'Como se tira ouro deste morro?', a: [
        'De três jeitos. Desmonte: a água desce pela canoa e derruba a terra do barranco. Talho aberto: cava-se o morro por cima. E a galeria, a mina de verdade, que entra no morro como toca de tatu.',
        'Depois lava-se o cascalho nas canoas forradas de couro: o ouro fica preso no pelo. Muito do que se sabe de minerar aqui veio com a gente da Costa da Mina, que já tirava ouro lá.'] },
      { q: 'E a galeria?', a: [
        'Escura, abafada, molhada. Vai-se de lamparina, de joelho. O teto é escorado com madeira, quando tem madeira.',
        'Quando desaba, desaba de uma vez. Já perdi três companheiros. A irmandade do Rosário é que paga o enterro, senão nem isso.'] },
      { q: 'O senhor tem domingo?', a: [
        'Domingo e dia santo, missa. À tarde, uns faiscam para si, outros plantam roça, outros dançam no terreiro. É quando a gente volta a ser gente.',
        'O que eu achar pra mim, guardo. Um dia compro a carta. Ou morro antes — aqui ninguém chega velho.'] },
    ],
    bye: 'Vá. O feitor está olhando, e não é para vossa mercê.',
  },
  {
    id: 'vigario', name: 'Padre Manuel', title: 'Coadjutor da matriz de Nossa Senhora do Pilar', objective: 'c_padre', where: 'pilar',
    look: { outfit: 'padre', top: 0x161416, legs: 0x161416, hair: 'chapeu', hatColor: 0x0e0c0a, skin: 0xd8b496, extras: ['livro'] },
    greet: 'Louvado seja Nosso Senhor Jesus Cristo. Sou o padre Manuel, coadjutor desta matriz. Entre, veja a casa de Deus — e o ouro que os homens deram a ela.',
    topics: [
      { q: 'Por que tanto ouro na igreja?', a: [
        'Os mineiros dão a Deus o que tiram da terra, e cada irmandade quer o seu altar mais bonito que o do vizinho. Dizem que nesta talha foram centenas de quilos de ouro. Ninguém pesou.',
        'Há quem diga que é vaidade. Eu digo que o povo daqui não tem palácio: a igreja é o palácio do povo.'] },
      { q: 'Quem está enterrado embaixo do soalho?', a: [
        'Os irmãos das irmandades, debaixo daquelas tábuas numeradas. Cada um no lugar que pagou: perto do altar custa mais.',
        'Os escravos que não têm irmandade vão para o adro ou para o cemitério de fora. Por isso as irmandades de pretos são tão importantes para eles.'] },
      { q: 'O que é a Semana Santa aqui?', a: [
        'É a festa maior. Procissões de noite, à luz de vela, com as matracas no lugar dos sinos — que ficam mudos de quinta a sábado.',
        'O Senhor dos Passos sai pelas ladeiras, e o povo inteiro vai atrás: senhor, escravo, soldado, quitandeira. É o único dia em que todos andam juntos.'] },
    ],
    bye: 'Vá em paz, e que Nossa Senhora do Pilar o acompanhe pelas ladeiras.',
  },
  {
    id: 'cabo', name: 'Cabo Antônio Ribeiro', title: 'Cabo do Regimento de Cavalaria de Minas', objective: 'c_dragao', where: 'palacio',
    look: { outfit: 'dragao', coat: 0x1f2b52, vest: 0xc9a23a, facing: 0xc9a23a, legs: 0xd8c89a, boots: 0x16100c, hair: 'tricorne', trim: 0xd8b04a, skin: 0xb48662, extras: ['espingarda'] },
    greet: 'Alto lá. Cabo Antônio Ribeiro, da guarda do Palácio. O senhor governador não recebe sem audiência marcada. Mas conversar pode.',
    greetDay: { 7: 'Dobraram a guarda. Ordem do governador. Não me pergunte por quê, que eu também não sei.', 12: 'Devassa aberta. Estamos revistando casas. Se o senhor tem papel suspeito, queime antes que a gente chegue — não, esquece que eu disse isso.' },
    topics: [
      { q: 'O que fazem os dragões?', a: [
        'Somos a tropa paga do rei nas Minas, de cavalaria. Guardamos o Palácio, os registros das estradas, escoltamos o ouro do quinto até o Rio, perseguimos contrabandista e quilombo.',
        'A farda é azul com as vistas amarelas. Bonita. O soldo é que atrasa.'] },
      { q: 'Conhece o alferes Silva Xavier?', a: [
        'O Tiradentes? É do nosso regimento. Homem de coragem, sabe tudo das estradas. E fala, fala. Na tropa todo mundo gosta dele e ninguém concorda com ele.',
        'Está há anos de alferes. Nunca subiu. Isso amarga um homem.'] },
      { q: 'Quem é o governador?', a: [
        'O Visconde de Barbacena, Luís Antônio Furtado de Mendonça. Chegou no ano passado com ordem de pôr as contas do quinto em dia.',
        'Passa boa parte do tempo na fazenda de Cachoeira do Campo, fora da vila. Quando está aqui, a guarda redobra.'] },
    ],
    bye: 'Siga. E não junte gente aqui na frente.',
  },
  {
    id: 'ensaiador', name: 'Francisco Xavier', title: 'Ensaiador e ator da Casa da Ópera', objective: 'c_opera', where: 'opera',
    look: { outfit: 'casaca', coat: 0x5a2a24, vest: 0xe0c060, legs: 0x2a2228, stockings: 0xf0ece2, hair: 'rabicho', skin: 0xa87652 },
    greet: 'Ah, um espectador! Francisco Xavier, ator e ensaiador desta Casa da Ópera. Faço galã, faço velho, faço o que faltar. Hoje faço o diabo — numa comédia, entenda.',
    topics: [
      { q: 'Que casa é esta?', a: [
        'A Casa da Ópera de Vila Rica, aberta em setenta. Mandou fazer o coronel João de Souza Lisboa, que também arrematou contratos. Plateia de bancos, dois andares de camarotes, palco com cenário pintado.',
        'Dizem que é dos teatros mais antigos destas Américas. Eu digo que é o mais bonito — e o mais frio, no inverno.'] },
      { q: 'O que se apresenta aqui?', a: [
        'Comédias e óperas. Muito Metastasio, o italiano; Molière traduzido; entremezes portugueses. A música é da terra: os músicos são quase todos pardos, como eu, e tocam também nas igrejas.',
        'De manhã cantam a missa, de noite a ópera. O mesmo violino.'] },
      { q: 'Quem assiste?', a: [
        'Os camarotes são das famílias de posses, alugados por temporada. A plateia é de quem paga a entrada: oficiais, comerciantes, estudantes.',
        'Em dia de aniversário do rei ou do governador há récita de gala, com a sala iluminada de velas. Cheira a sebo a noite inteira.'] },
    ],
    bye: 'Venha à noite! Prometo não esquecer o texto. Muito.',
  },
  {
    id: 'tropeiro_joaquim', name: 'Joaquim Paulista', title: 'Tropeiro, dono de tropa', objective: 'c_tropeiro', where: 'contos_largo',
    look: { outfit: 'tropeiro', top: 0xd8ccb0, vest: 0x5a3a22, legs: 0x4a3e30, boots: 0x3a2414, hair: 'chapeu', hatColor: 0x5a4a3a, skin: 0xb48662, extras: ['chicote'] },
    greet: 'Opa, bom dia! Joaquim, tropeiro, paulista de Sorocaba. Cheguei do Rio com as mulas. Se quiser sal, ferro ou um vinho do Porto, fala comigo.',
    topics: [
      { q: 'Como é a viagem do Rio até aqui?', a: [
        'Pelo Caminho Novo: uns vinte dias, se não chover. Serra do Mar, rios para vadear, atoleiro, onça. E os registros, onde o fiscal do contratador conta tudo e cobra a entrada.',
        'No Registro do Paraibuna abrem até as bruacas. Ouro descendo sem guia de quinto vira processo.'] },
      { q: 'O que as mulas carregam?', a: [
        'Subindo: sal, ferro, ferramenta, tecido, vinho, azeite, louça, até escravo novo vindo do Valongo. Descendo: ouro, pouco e escondido, e couro, toucinho, queijo.',
        'Cada mula leva umas oito arrobas na cangalha. Uma tropa boa tem dez lotes de sete mulas, cada lote com o seu tocador.'] },
      { q: 'Por que a mula da frente tem sino?', a: [
        'É a madrinha. Leva o cincerro no pescoço e o penacho na testa. As outras seguem o som, de dia e de noite, sem precisar de mão.',
        'Mula é melhor que cavalo nesta serra: pisa firme, aguenta peso e não se assusta à toa.'] },
    ],
    bye: 'Boa viagem, que a minha é longa. Daqui a uma semana estou descendo de novo.',
  },
];
