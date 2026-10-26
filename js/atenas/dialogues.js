// Diálogos de Atenas em 432 a.C. (arcontado de Pitodoro): o Parthenon acaba de ficar pronto, os Propileus estão em
// obras e a tensão com Esparta e Corinto cresce (revolta de Potideia, decreto contra Mégara) — a guerra do
// Peloponeso começa no ano seguinte. Personagens reais: Heródoto, Sócrates, Mnésicles, Fídias, Ictino,
// Lisímaque (sacerdotisa, datas aproximadas), Sófocles, Aspásia, Formião e Péricles. Mírrina, Cálias, Dêmon e
// Glauco são pessoas comuns inventadas para mostrar o dia a dia.

export const NPCS = [
  {
    id: 'herodoto', name: 'Heródoto', title: 'Viajante e historiador de Halicarnasso', objective: 'herodoto',
    look: { outfit: 'himation', base: 'brian', cloth: 0xb89a6a, border: 0x5a3a1e, beard: 'full', hair: 'short', extras: ['staff', 'petasos'] },
    greet: 'Salve, estrangeiro! Somos dois, então: eu também não nasci aqui. Sou Heródoto, de Halicarnasso, na Cária. Você está na ágora de Atenas, no arcontado de Pitodoro — pelo seu calendário, 432 anos antes do nascimento do seu Cristo.',
    topics: [
      { q: 'Onde exatamente eu estou?', a: [
        'Na ágora: a praça onde os atenienses compram, vendem, discutem, julgam e votam. Lá em cima, sobre a rocha, fica a Acrópole, com o templo novo de Atena — o Parthenon, terminado agora mesmo, com as últimas esculturas dos frontões.',
        'A oeste fica a Pnyx, a colina da assembleia. Ao norte, o Cerâmico, bairro dos oleiros, e a porta do Dípilon. E se seguir pelas Longas Muralhas para o sul chega ao mar: o porto, as trirremes e a praia do Falero.'] },
      { q: 'O que é essa tal democracia?', a: [
        'Demokratia: o poder (kratos) do povo (demos). Há uns 75 anos Clístenes reorganizou a cidade, e hoje as grandes decisões são votadas na assembleia por qualquer cidadão — homem, adulto, filho de pai e mãe atenienses.',
        'O Conselho dos Quinhentos é sorteado todo ano, e a maior parte dos cargos também: acham que o sorteio é mais justo que a eleição. Só os dez estrategos, os generais, são eleitos. Péricles é reeleito estratego há mais de dez anos seguidos.',
        'Mas não se engane: mulheres, estrangeiros como eu (os metecos) e os escravos não votam. São talvez trinta ou quarenta mil cidadãos numa Ática com várias vezes isso de gente.'] },
      { q: 'E o que você faz aqui?', a: [
        'Investigo e escrevo — "historiê" quer dizer investigação. Quero contar as grandes façanhas de gregos e bárbaros e, sobretudo, por que lutaram entre si: as guerras contra os persas.',
        'Viajei muito para isso: Babilônia, a Cítia, a Fenícia... e o Egito! Subi o Nilo, vi as pirâmides de Gizé e conversei com os sacerdotes de Mênfis. Contaram-me que o rei Quéops fez o povo trabalhar vinte anos naquela pirâmide. Ah, se você visse aquilo...'] },
      { q: 'O que aconteceu com os persas?', a: [
        'Há 58 anos, em Maratona, os atenienses venceram um exército persa muito maior. Dez anos depois veio Xerxes com uma multidão imensa. Atenas foi evacuada e os persas queimaram a Acrópole inteira — os templos antigos, as estátuas, tudo.',
        'Mas a frota grega, comandada por Temístocles, esmagou os persas no estreito de Salamina — aquela ilha que você vê do porto. Por isso a cidade reconstrói agora os templos, mais belos do que nunca. E por isso o mar é tão importante para Atenas.'] },
      { q: 'O que posso fazer na cidade?', a: [
        'Aqui mesmo na ágora, procure Sócrates, perto da oficina do sapateiro Simão, a sudoeste. Prove os figos de Mírrina no mercado. Suba à Acrópole pelos Propileus e veja a Atena de ouro e marfim de Fídias.',
        'Assista ao ensaio de Sófocles no teatro, ao pé da Acrópole. Visite os oleiros do Cerâmico e o hoplita do Dípilon. Depois desça ao porto e à praia: o almirante Formião e o pescador Glauco conhecem o mar como ninguém.',
        'Dizem também que cinco corujas de prata — tetradracmas — se perderam pela cidade. E Péricles vai discursar na Pnyx: quem conhecer Atenas de verdade talvez consiga falar com ele. Seu diário (tecla J) guarda tudo.'] },
    ],
    bye: 'Vá bem! E anote o que vir: o que não se escreve, o tempo apaga.',
  },
  {
    id: 'socrates', name: 'Sócrates', title: 'Filho de Sofronisco, do demo de Alopeke', objective: 'socrates',
    look: { outfit: 'himation', base: 'bryce', cloth: 0x9a8e78, border: 0x6a5a40, beard: 'full', hair: 'bald', barefoot: true },
    greet: 'Ah, um rosto novo! Sente-se aqui na oficina do Simão. Sou Sócrates. Meu pai era escultor de pedra e minha mãe, parteira. Eu? Faço o trabalho dela, só que com as ideias: ajudo os outros a darem à luz o que já trazem dentro de si.',
    topics: [
      { q: 'Você é um sábio?', a: [
        'Eu? Não sei nada — e é só isso o que sei. Converso com os poetas, os políticos e os artesãos, e descubro que eles acham que sabem coisas que não sabem. Pelo menos eu sei que não sei.',
        'Por isso pergunto. Pergunte comigo: você sabe o que é a coragem?'] },
      { q: 'O que é a coragem?', a: [
        'Vamos ver. Você diria que corajoso é quem fica firme na fileira e não foge do inimigo? — Muitos dizem isso. Mas e o cavaleiro cita, que vence fugindo e voltando para atacar? Ele não é corajoso?',
        'E quem é corajoso diante da doença, da pobreza, do mar bravo? Esses não ficam numa fileira... Então a coragem não é "ficar parado". Talvez seja uma firmeza da alma — mas firmeza para tudo? A teimosia do tolo também é firmeza.',
        'Está vendo? Começamos certos e terminamos em dúvida. Ótimo! Agora sabemos o que não sabemos. É por aí que se começa a pensar.'] },
      { q: 'Por que você fica aqui na ágora?', a: [
        'Porque as árvores e o campo não me ensinam nada — as pessoas da cidade, sim. Não escrevo livros: a escrita não responde quando se pergunta a ela. Prefiro a conversa.',
        'E não cobro nada, ao contrário dos sofistas, como Protágoras, que cobram fortunas para ensinar a vencer discussões. Vencer não me interessa. Interessa-me descobrir a verdade, mesmo que eu perca.'] },
      { q: 'Você também vai à guerra?', a: [
        'Sou cidadão, e cidadão defende a cidade: sirvo como hoplita, com meu escudo e minha lança, como todos que podem pagar o próprio equipamento.',
        'Dizem que logo partiremos para Potideia, no norte, que se revoltou contra Atenas com o apoio de Corinto. Os tempos estão ficando difíceis. Por isso mesmo é preciso pensar bem antes de agir.'] },
      { q: 'Dizem que você ouve uma voz?', a: [
        'Ouço, desde criança: um sinal divino, um daimonion. Ele nunca me manda fazer nada; só me avisa quando vou fazer algo errado. Curioso, não? Talvez os deuses também prefiram perguntar a dar ordens.'] },
    ],
    bye: 'Vá, e não acredite em nada só porque um velho barbudo disse. Examine!',
  },
  {
    id: 'mirrina', name: 'Mírrina', title: 'Vende figos e azeitonas na ágora', objective: 'mirrina',
    look: { outfit: 'peplos', cloth: 0xc87a3a, border: 0x5a2a14, hair: 'up' },
    greet: 'Figos da Ática, os mais doces da Grécia! Azeitonas, queijo de cabra... Chegue, estrangeiro! Sou Mírrina. Prove um figo, vai — se gostar, leva uma dúzia por um óbolo.',
    topics: [
      { q: 'Como funciona o dinheiro aqui?', a: [
        'Moeda de prata das minas do Láurio! O óbolo é a menor — guardamos na boca para não perder, sabia? Seis óbolos fazem uma dracma, e uma dracma é o que um bom artesão ou um remador da frota ganha por dia.',
        'A moeda grande, a tetradracma, vale quatro dracmas: Atena de um lado, a coruja do outro. Por isso a chamam de "coruja". É aceita em todo o mar, do Egito à Sicília.'] },
      { q: 'O que os atenienses comem?', a: [
        'O de todo dia é maza, um bolo de cevada; pão de trigo é para quem pode. Com azeite, azeitonas, figos, queijo, lentilha, cebola, alho... O resto — peixe, carne — chamamos de "opson", o acompanhamento.',
        'Carne mesmo, quase só nos sacrifícios das festas, quando a cidade divide os bois sacrificados com o povo. E o vinho se bebe sempre misturado com água. Vinho puro? Isso é coisa de bárbaro!'] },
      { q: 'Mulheres trabalham na ágora?', a: [
        'As senhoras ricas quase não saem de casa; quem faz as compras é o marido ou o escravo. Mas mulher pobre trabalha, sim: vendemos pão, verduras, fitas, perfumes, somos amas de leite, tecelãs...',
        'E tem os fiscais da ágora, os agoranomos, de olho nas balanças. Se roubar no peso, leva multa! Os comediantes vivem rindo de nós, as vendedoras, mas sem nós a cidade não come.'] },
    ],
    bye: 'Volte amanhã! Os figos de amanhã vão estar ainda melhores.',
  },
  {
    id: 'mnesicles', name: 'Mnésicles', title: 'Arquiteto dos Propileus', objective: 'mnesicles',
    look: { outfit: 'chiton', cloth: 0xd8cfb8, border: 0x3a4f86, beard: 'short', hair: 'short', extras: ['scroll'] },
    greet: 'Cuidado com os blocos! Sou Mnésicles, o arquiteto desta entrada: os Propileus, a "porta da frente" da Acrópole. Começamos há cinco anos, e a cada mês o tesouro aperta mais...',
    topics: [
      { q: 'O que são os Propileus?', a: [
        'Um portão monumental: uma fachada dórica de seis colunas para quem sobe a rampa, uma passagem com colunas jônicas por dentro e uma parede com cinco portas. O vão do meio é mais largo para passarem os animais dos sacrifícios e os carros da procissão.',
        'Dos lados ficam as alas: a do norte é a Pinacoteca, uma sala com quadros pintados em painéis de madeira. A do sul... bem, essa vai ficar menor do que eu desenhei. Dizem que não haverá dinheiro, e a guerra está chegando.'] },
      { q: 'Como trazem tanto mármore?', a: [
        'O mármore vem do monte Pentélico, a uns dezesseis quilômetros daqui. Corta-se na pedreira com cunhas, e os blocos descem em carros puxados por bois — às vezes dezenas de juntas de bois para um bloco só.',
        'Está vendo essas "orelhas" nos blocos? São saliências para amarrar as cordas do guindaste. Depois que o bloco está no lugar, a gente as corta. E nada de argamassa: os blocos se encaixam e são presos com grampos de ferro envoltos em chumbo.'] },
      { q: 'Quem trabalha nas obras?', a: [
        'Cidadãos, metecos e escravos, lado a lado, e todos recebem mais ou menos a mesma coisa: uma dracma por dia. Pedreiros, carpinteiros, escultores, carreteiros, ferreiros... Péricles diz que as obras dão trabalho e salário a toda a cidade.',
        'Os inimigos dele dizem outra coisa: que ele enfeita Atenas "como uma mulher vaidosa" com o dinheiro dos aliados da Liga de Delos. Eu fico com as pedras. As pedras não fazem política.'] },
    ],
    bye: 'Passe pela porta do meio — e olhe para cima. As colunas foram feitas para quem sobe.',
  },
  {
    id: 'fidias', name: 'Fídias', title: 'Escultor, supervisor das obras de Péricles', objective: 'fidias',
    look: { outfit: 'himation', base: 'brian', cloth: 0xe8e0cc, border: 0x8e2c22, beard: 'full', hair: 'short' },
    greet: 'Entre devagar, deixe os olhos se acostumarem à penumbra... Eis a Atena Partenos, a Virgem. Sou Fídias. Fiz esta, a de bronze lá fora, e desenhei os mármores do templo inteiro.',
    topics: [
      { q: 'Do que a estátua é feita?', a: [
        'De ouro e marfim sobre uma estrutura de madeira — por isso a chamam de criselefantina. O rosto, os braços e os pés são de marfim; a roupa, o elmo e o escudo, de placas de ouro. Ela mede vinte e seis côvados, uns onze metros e meio.',
        'Na mão direita ela segura uma Vitória, uma Nike, quase do tamanho de um homem. Na esquerda, o escudo, com a luta contra as Amazonas por fora. A serpente ao lado é Erictônio, o rei-serpente de Atenas.'] },
      { q: 'Quanto ouro há nela?', a: [
        'Mais de quarenta talentos — mais de mil quilos de ouro, pelas medidas de vocês. É também uma reserva da cidade: em caso de necessidade, o ouro pode ser tirado e usado.',
        'Péricles me aconselhou a fazer as placas removíveis, para que pudessem ser pesadas. Ainda bem: há gente acusando o escultor de ter roubado ouro. Que pesem! Quanto a ter posto o meu rosto e o de Péricles na batalha do escudo... sobre isso eu prefiro não falar.'] },
      { q: 'E as esculturas do templo?', a: [
        'São 92 métopas em volta: deuses contra gigantes, gregos contra amazonas, lápitas contra centauros e a queda de Troia — a ordem vencendo o caos, como Atenas venceu os persas.',
        'Por dentro da colunata corre o friso: 160 metros com a procissão das Panateneias, cavaleiros, carros, músicos, as moças com o peplo da deusa e os próprios deuses assistindo. E nos frontões: a leste, o nascimento de Atena da cabeça de Zeus; a oeste, a disputa entre Atena e Poseidon pela Ática.'] },
      { q: 'Tudo isso é pintado?', a: [
        'Claro! O mármore nu fica cego ao sol. Pintamos os fundos de azul, as roupas de vermelho, verde e dourado, os olhos, os lábios. As armas das figuras são de bronze dourado, presas com pinos.',
        'Vocês, do futuro, verão tudo branco, desbotado. Lembre-se de que um dia isto teve cor — muita cor.'] },
    ],
    bye: 'Olhe-a mais uma vez antes de sair. Nenhuma pedra fala tão alto quanto o silêncio de uma deusa.',
  },
  {
    id: 'ictino', name: 'Ictino', title: 'Arquiteto do Parthenon', objective: 'ictino',
    look: { outfit: 'chiton', cloth: 0x6a7f9a, border: 0xe8e0cc, beard: 'short', hair: 'short', extras: ['staff'] },
    greet: 'Gosta do que vê? Eu e Calícrates desenhamos este templo, e em nove anos ele ficou de pé. Sou Ictino. Agora me diga: ele parece reto para você?',
    topics: [
      { q: 'O templo não é reto?', a: [
        'Quase nada aqui é reto — e é por isso que ele parece perfeito. O piso, o estilobata, sobe uns dez centímetros no meio dos lados compridos: uma linha reta tão longa pareceria afundar.',
        'As colunas se inclinam um pouco para dentro: se as prolongasse, se encontrariam lá no alto, a mais de dois quilômetros. E elas engordam levemente no meio, a êntase, como um músculo que segura um peso.'] },
      { q: 'E as colunas dos cantos?', a: [
        'Essas são mais grossas e mais próximas das vizinhas. Contra o céu claro, uma coluna isolada parece mais fina, então a reforçamos. São ajustes de poucos centímetros que os olhos sentem mas não veem.',
        'Cada tambor de coluna foi cortado na medida exata do seu lugar. Não há dois blocos iguais no Parthenon. Por isso nenhum templo antes dele ficou tão harmonioso.'] },
      { q: 'Quanto mede o templo?', a: [
        'Oito colunas na frente e dezessete nos lados, cada uma com mais de dez metros. O piso mede uns setenta metros por trinta. Tudo de mármore do Pentélico — até as telhas do telhado.',
        'Lá dentro há duas salas: a da deusa, a leste, com uma colunata de dois andares em volta da estátua; e a sala de trás, voltada para oeste, onde se guardam tesouros da cidade. É ela que dá o nome ao templo: o "parthenon", a sala das virgens.'] },
    ],
    bye: 'Quando voltar ao seu tempo, procure as curvas. Elas ainda estarão lá.',
  },
  {
    id: 'lisimaque', name: 'Lisímaque', title: 'Sacerdotisa de Atena Pólias', objective: 'lisimaque',
    look: { outfit: 'peplos', cloth: 0xf2ecdc, border: 0xb8862c, hair: 'veil', extras: ['diadem'] },
    greet: 'Paz, estrangeiro. Sou Lisímaque, sacerdotisa de Atena Pólias, a protetora da cidade. Você está diante do lugar mais antigo e sagrado de Atenas: a oliveira da deusa.',
    topics: [
      { q: 'Por que essa oliveira é sagrada?', a: [
        'No tempo dos primeiros reis, Atena e Poseidon disputaram a Ática. Poseidon bateu o tridente na rocha e fez brotar uma fonte — de água salgada. Atena tocou o chão e nasceu esta oliveira. Os deuses julgaram que o presente dela era mais útil: azeite, comida, luz.',
        'Quando os persas queimaram a Acrópole, a oliveira queimou junto. Mas no dia seguinte, quem subiu encontrou um broto novo, de um côvado de altura. Atenas renasceria — e renasceu.'] },
      { q: 'O que é o peplo da deusa?', a: [
        'Nas Panateneias, a festa de aniversário de Atena, a cidade leva em procissão um peplo novo para a estátua antiga da deusa, a de madeira de oliveira, que guardamos no templo velho. Nas Grandes Panateneias, a cada quatro anos, a festa é ainda maior, com jogos, corridas e concursos de música.',
        'Quem o tece são moças de boas famílias, durante nove meses. Nele bordam a vitória de Atena sobre os gigantes. É o maior presente que Atenas dá à sua deusa.'] },
      { q: 'Mulheres podem ser sacerdotisas?', a: [
        'Na religião, sim, e com honra! Meu cargo é vitalício e vem de uma família antiga, os Eteobútades. Muitas deusas são servidas por mulheres, e há festas só nossas, como as Tesmofórias, para Deméter.',
        'Fora dos templos... bem, as atenienses não votam nem fazem contratos sozinhas. Mas no culto da deusa protetora da cidade, é uma mulher quem fala por Atena.'] },
    ],
    bye: 'Que a deusa de olhos cinzentos ilumine seu caminho.',
  },
  {
    id: 'sofocles', name: 'Sófocles', title: 'Poeta trágico, ex-estratego', objective: 'sofocles',
    look: { outfit: 'himation', base: 'brian', cloth: 0x7a2e2a, border: 0xd9b45a, beard: 'full', hair: 'short', extras: ['scroll'] },
    greet: 'Silêncio, por favor, o coro está ensaiando! ...Ah, um visitante. Sou Sófocles. Já ganhei mais concursos de tragédia do que consigo contar — e até fui estratego, ao lado de Péricles, na guerra contra Samos.',
    topics: [
      { q: 'O que é uma tragédia?', a: [
        'Uma história dos heróis antigos, contada por atores mascarados e por um coro que canta e dança. O público vê um homem grande cair por um erro, por orgulho, pelo destino — e sai do teatro pensando sobre a própria vida.',
        'Na minha Antígona, uma moça enterra o irmão contra a ordem do rei, porque as leis dos deuses estão acima das leis dos homens. Até hoje discutem quem tinha razão. Ótimo: era essa a intenção.'] },
      { q: 'Como funcionam os festivais?', a: [
        'Na primavera, nas Grandes Dionisias, três poetas apresentam cada um três tragédias e um drama satírico. Um cidadão rico paga o coro — é a coregia, um dever e uma honra. No fim, juízes sorteados escolhem o vencedor.',
        'O teatro inteiro assiste: milhares de pessoas nesses bancos de madeira sobre a encosta. E é uma festa para Dioniso, o deus do vinho e das máscaras. Por isso o altar fica no meio da orquestra.'] },
      { q: 'O que você inventou no teatro?', a: [
        'Ésquilo pôs um segundo ator em cena; eu pus o terceiro, e as conversas ficaram mais ricas. Também aumentei o coro de doze para quinze cantores e passei a usar cenários pintados nessa parede de trás, a cena.',
        'As máscaras são de linho endurecido, com bocas grandes para a voz chegar ao último banco. Um ator troca de máscara e vira outra pessoa: rei, mendigo, rainha. Mulheres não atuam; os papéis femininos são feitos por homens.'] },
    ],
    bye: 'Volte nas Dionisias. E traga um lenço.',
  },
  {
    id: 'aspasia', name: 'Aspásia', title: 'De Mileto', objective: 'aspasia',
    look: { outfit: 'peplos', base: 'elizabeth', cloth: 0x3a5f8a, border: 0xe0c070, hair: 'up', extras: ['diadem'] },
    greet: 'Seja bem-vindo à nossa casa. Sou Aspásia, de Mileto. Péricles não está; ele passa os dias na ágora e na Pnyx. Mas aqui também se conversa — e às vezes melhor.',
    topics: [
      { q: 'Quem é você?', a: [
        'Uma estrangeira, uma meteca, nascida em Mileto, do outro lado do mar Egeu. Vivo com Péricles e temos um filho, que também se chama Péricles. Mas não posso ser esposa legítima: pela lei que o próprio Péricles propôs, só é cidadão quem tem pai e mãe atenienses.',
        'Os comediantes me chamam de tudo, porque falo em público e recebo homens em casa para conversar. Sócrates vem aqui discutir retórica. Dizem até que eu escrevo os discursos de Péricles... Deixe que digam.'] },
      { q: 'Como vivem as mulheres atenienses?', a: [
        'As esposas dos cidadãos vivem quase sempre dentro de casa, nos aposentos do fundo: cuidam da casa, dos filhos, dos escravos, tecem. Saem para as festas religiosas, para os funerais, para visitar parentes.',
        'Casam-se com uns catorze ou quinze anos, com homens de trinta, escolhidos pelo pai. Cada mulher tem sempre um homem responsável por ela: pai, marido, filho. Eu, estrangeira, tenho mais liberdade para falar — e pago por isso.'] },
      { q: 'O que é um simpósio?', a: [
        'É o banquete dos homens: deitados nos sofás do andrón, bebendo vinho misturado com água numa grande cratera, conversando, recitando poemas, ouvindo música de aulos e jogando o cótabo — atirar o resto do vinho da taça num alvo.',
        'Hoje à noite haverá um aqui. Se você trouxer uma boa taça do Cerâmico, ela será a primeira a correr de mão em mão.'] },
    ],
    bye: 'Volte sempre. Nesta casa, as perguntas são mais bem-vindas que os presentes.',
  },
  {
    id: 'calias', name: 'Cálias', title: 'Oleiro do Cerâmico', objective: 'calias',
    look: { outfit: 'exomis', cloth: 0x8a6a48, border: null, beard: 'short', hair: 'short', skin: 0xa87652 },
    greet: 'Mãos sujas de barro, desculpe! Sou Cálias, oleiro, filho de oleiro, neto de oleiro. Aqui no Cerâmico se fazem os vasos mais bonitos do mundo — pergunte a qualquer etrusco que os compra a peso de ouro.',
    topics: [
      { q: 'Como se fazem os vasos pretos e vermelhos?', a: [
        'O barro da Ática fica laranja no forno. Eu modelo no torno, e o pintor desenha as figuras com um engobe — o próprio barro, muito fino e diluído. Nas figuras vermelhas, ele pinta o fundo e deixa as figuras na cor do barro.',
        'O segredo está no forno: primeiro com muito ar, tudo fica vermelho; depois fechamos o respiro e pomos lenha verde, a fumaça escurece tudo; por fim abrimos de novo. O barro comum volta ao vermelho, mas o engobe fica preto e brilhante para sempre.'] },
      { q: 'Quem assina os vasos?', a: [
        'O oleiro escreve "epoiesen", fez; o pintor, "egrapsen", pintou. Às vezes escrevemos também o nome de um rapaz bonito da cidade com "kalos" — é elogio, como um poema.',
        'Os maiores vasos de prêmio são as ânforas das Panateneias: cheias do azeite das oliveiras sagradas, com Atena pintada à moda antiga, em figuras negras. O vencedor de uma corrida podia ganhar dezenas delas!'] },
      { q: 'Posso ajudar em alguma coisa?', a: [
        'Pode! Aspásia encomendou uma taça para o simpósio de hoje, na casa de Péricles, perto da ágora. É aquela kylix pintada em cima da bancada. Pegue-a (tecla P) com cuidado e leve até ela. Se quebrar, eu ponho seu rosto num vaso de comédia!'] },
    ],
    bye: 'Cuidado com o forno, está quente!',
  },
  {
    id: 'demon', name: 'Dêmon', title: 'Hoplita, de guarda no Dípilon', objective: 'demon',
    look: { outfit: 'hoplite', cloth: 0x9a2a1e, beard: 'short', hair: 'short', extras: ['spear', 'aspis', 'helmet'] },
    greet: 'Alto lá! ...Ah, um viajante. Pode passar. Sou Dêmon, do demo de Acarnas, hoplita. Esta é a porta do Dípilon, a maior de Atenas: por aqui sai a estrada para a Academia e entra a procissão das Panateneias.',
    topics: [
      { q: 'O que é um hoplita?', a: [
        'Um cidadão soldado de infantaria pesada — o nome vem de hopla, as armas. A principal é a aspis, o grande escudo redondo de madeira com bronze, quase um metro de largura. Mais a lança, a espada curta, o elmo coríntio e as grevas nas canelas.',
        'Cada um compra o próprio equipamento, por isso o hoplita não é pobre. Os pobres remam na frota — e hoje, sem os remadores, Atenas não é nada. Somos todos cidadãos defendendo a cidade.'] },
      { q: 'Como vocês lutam?', a: [
        'Em falange: fileiras cerradas, oito homens de profundidade, cada escudo protegendo metade do próprio corpo e metade do companheiro da esquerda. Ninguém pode fugir: abrir um buraco na linha é matar o amigo.',
        'Foi assim que vencemos os persas em Maratona. Meu avô estava lá. Ele contava que corremos para cima deles para fugir das flechas.'] },
      { q: 'Vai haver guerra?', a: [
        'Esparta tem medo de Atenas, e Corinto nos odeia. Potideia se revoltou; Péricles proibiu os megarenses de comerciar nos nossos portos. Eu aposto que no ano que vem a guerra começa.',
        'O plano de Péricles é ficar atrás das muralhas, trazer todo mundo do campo para dentro e lutar no mar, que é nosso. As Longas Muralhas levam até o porto: com elas, Atenas é uma ilha. Mas ver os espartanos queimando nossos olivais... isso vai doer.'] },
    ],
    bye: 'Siga em paz. E se ouvir as trombetas, corra para dentro dos muros!',
  },
  {
    id: 'formiao', name: 'Formião', title: 'Estratego e almirante', objective: 'formiao',
    look: { outfit: 'chiton', cloth: 0x2c4f8c, border: 0xe8e0cc, beard: 'full', hair: 'short', extras: ['helmet_up'] },
    greet: 'Gosta de navios? Então gostou da Páralos: a trirreme sagrada do Estado, a mais rápida da frota. Sou Formião, estratego deste ano. Logo devo levar homens para Potideia.',
    topics: [
      { q: 'Como é uma trirreme?', a: [
        'Uns trinta e sete metros de casco fino e leve, com 170 remadores em três fileiras de cada lado: os tranitas em cima, os zugitas no meio e os talamitas embaixo, quase com o nariz na água. Mais o comandante, o piloto, marinheiros e uns dez hoplitas.',
        'Na proa vai o esporão de bronze, na linha d\'água. A arma é o próprio navio: a trirreme acelera e fura o casco inimigo. Com bons remadores, passa de dezesseis quilômetros por hora.'] },
      { q: 'Quem são os remadores?', a: [
        'Em sua maioria cidadãos pobres, os tetas, e também metecos e estrangeiros contratados. Recebem salário: uma dracma por dia. Eles são a força da democracia — quem rema pela cidade quer votar na cidade.',
        'Um flautista dá o ritmo com o aulos, e o chefe dos remadores grita a cadência. Cento e setenta homens remando como um só: é preciso muito treino, e treinamos todo dia aqui no golfo.'] },
      { q: 'Por que o mar é tão importante?', a: [
        'Atenas tem mais de trezentas trirremes, a maior frota do mundo grego. Com ela lideramos a Liga de Delos: as cidades aliadas pagam tributo e nós as protegemos dos persas. O tesouro da Liga hoje fica aqui, na Acrópole.',
        'Pelo mar chega o trigo do mar Negro, que alimenta a cidade. Quem manda no mar não passa fome. Quer conhecer um navio de perto? Suba a bordo (tecla E) — é só não atrapalhar os marinheiros.'] },
    ],
    bye: 'Bons ventos! E respeite Poseidon quando estiver na água.',
  },
  {
    id: 'glauco', name: 'Glauco', title: 'Pescador do Falero', objective: 'glauco',
    look: { outfit: 'exomis', cloth: 0xa89a7a, border: null, beard: 'full', hair: 'short', extras: ['pilos'], skin: 0x9a6a48 },
    greet: 'Opa! Cuidado com a rede. Sou Glauco, pescador. Meu pai pescava aqui, no Falero, antes de existirem o Pireu e as muralhas. Esta praia era o porto de Atenas, sabia?',
    topics: [
      { q: 'Como vocês pescam?', a: [
        'Com rede, com anzol de bronze, com nassa de vime... Atum a gente espera passar: um vigia fica no alto da pedra e grita quando vê o cardume chegando. Aí é remar e cercar!',
        'Peixe bom vai para a ágora ainda vivo, em jarros com água. Enguia do lago Copais e atum são para os ricos. O povo come anchova, sardinha, peixe salgado.'] },
      { q: 'Posso andar de barco?', a: [
        'Pode pegar o meu barco a remo, ali na água rasa, ou o de vela, mais adiante. Chegue perto e aperte E para embarcar; as setas remam e viram, e E de novo para descer. Só não vá longe demais: o mar aberto é de Poseidon.',
        'Ah, e se gosta de mergulhar: há um velho barco afundado aqui na baía, com ânforas no fundo. Os mergulhadores de esponja dizem que ainda tem uma inteira por lá. É só nadar até lá e apertar Espaço para descer.'] },
      { q: 'Vocês temem o mar?', a: [
        'O mar dá e o mar toma. Antes de sair, a gente oferece um pouco de vinho a Poseidon e às Nereidas. No inverno ninguém navega: de novembro a março, os barcos dormem na areia.',
        'Os golfinhos são amigos dos pescadores: dizem que salvaram o poeta Árion, que caiu no mar. Quem mata golfinho tem azar para sempre.'] },
    ],
    bye: 'Boa pescaria — quer dizer, boa viagem!',
  },
  {
    id: 'pericles', name: 'Péricles', title: 'Estratego de Atenas, filho de Xantipo', objective: 'pericles',
    look: { outfit: 'himation', base: 'brian', cloth: 0xf0ead8, border: 0x7a2e2a, beard: 'full', hair: 'short', extras: ['helmet_up'] },
    greet: 'Então você é o estrangeiro de quem a ágora inteira fala: o que pergunta a todos e quer entender tudo. Sou Péricles. Em breve falarei ao povo daqui da tribuna. Pergunte enquanto o povo não chega.',
    locked: 'Péricles está concentrado no discurso que fará à assembleia. Volte quando conhecer melhor a cidade.',
    topics: [
      { q: 'Por que tantas obras na Acrópole?', a: [
        'Os persas queimaram nossos templos. Reconstruí-los é cumprir uma dívida com os deuses e mostrar ao mundo o que uma cidade livre é capaz de fazer. E as obras dão trabalho e salário a milhares de atenienses.',
        'Meus adversários dizem que uso o tesouro dos aliados da Liga de Delos. Eu respondo: os aliados pagam para serem protegidos, e nós os protegemos. O que sobra é nosso, e o empregamos em glória que vai durar para sempre.'] },
      { q: 'O que torna Atenas especial?', a: [
        'Nossa constituição não copia a dos vizinhos: nós é que somos exemplo. Chama-se democracia porque o governo está nas mãos de muitos, não de poucos. Diante da lei todos são iguais, e o que conta é o mérito, não a riqueza.',
        'Amamos a beleza sem extravagância e o saber sem moleza. Aqui, quem não se interessa pela política não é chamado de tranquilo, mas de inútil. Atenas é a escola da Grécia.'] },
      { q: 'Vai haver guerra com Esparta?', a: [
        'Creio que sim, e logo. Esparta teme o nosso crescimento. Não devemos ceder a cada exigência: quem cede numa coisa pequena será obrigado a ceder nas grandes.',
        'Mas lutaremos à nossa maneira: atrás das Longas Muralhas, com a frota no mar. Eles podem queimar nossos campos; não podem tocar o Pireu. O que temo não são os planos do inimigo, mas os nossos próprios erros.'] },
      { q: 'Como é ser líder numa democracia?', a: [
        'Não tenho trono nem coroa. Sou um dos dez estrategos, eleito a cada ano. Se o povo não me quiser, basta não me reeleger — ou me mandar ao ostracismo por dez anos, como fizeram com meu rival Tucídides, filho de Melésias.',
        'Meu único poder é a palavra: convencer a assembleia. Por isso me chamam de "Olímpico" — dizem que falo como se trovejasse. Ou talvez seja só por causa da cabeça comprida, que escondo sob o elmo!'] },
    ],
    bye: 'Vá, estrangeiro, e conte no seu tempo o que viu em Atenas. Os homens passam; a fama das cidades fica.',
  },
];

export const GUARD_LINES = {};
export const VILLAGER_LINES = [
  'Você não é daqui, é? Pelo sotaque, parece bárbaro... sem ofensa! "Bárbaro" é só quem não fala grego.',
  'Hoje tem assembleia na Pnyx. Os arqueiros citas passam com uma corda tingida de vermelho: quem chegar atrasado e sujo de tinta paga multa!',
  'Já subiu para ver a deusa nova? Dizem que tem mais ouro que o tesouro do rei persa.',
  'Meu filho rema na frota. Uma dracma por dia! No meu tempo, os pobres não tinham nem voz na assembleia.',
  'Os figos de Mírrina são bons, mas o pão da Tebana, perto da fonte, é melhor.',
  'Os comediantes vivem zombando de Péricles. Chamam-no de "cabeça de cebola". Ha!',
  'Cuidado ao passar perto das hermas: Hermes protege as ruas e as portas.',
  'Vou à fonte buscar água: aqui em casa não tem poço. É lá que as mulheres se encontram para conversar.',
  'Os espartanos? Comem um caldo preto de sangue de porco e vinagre. Que gente!',
  'A coruja é a ave de Atena. Levar corujas para Atenas é como levar areia para a praia.',
];
export const SOLDIER_LINES = [
  'Os cidadãos servem dos dezoito aos sessenta anos. Os mais velhos guardam as muralhas.',
  'O escudo é a parte mais importante: quem perde a lança é desastrado; quem perde o escudo é covarde.',
  'Treinamos no ginásio da Academia, fora dos muros. Nus, como os atletas.',
  'Dizem que os coríntios estão mandando homens para Potideia. Isso vai acabar mal.',
];
export const WORKER_LINES = [
  'Mais um bloco para os Propileus! Uma dracma por dia e as costas destruídas.',
  'O mármore do Pentélico brilha com o sol: tem cristais pequenininhos que refletem a luz.',
  'Cuidado com o guindaste! Se a corda escapa, ninguém sobra para contar.',
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
  'Quer jogar astrágalos? São ossinhos de carneiro: você joga e vê de que lado caem!',
  'Meu pedagogo é escravo e me leva todo dia à escola. Lá aprendo letras, a lira e Homero de cor.',
  'Dizem que no alto da Acrópole mora uma serpente sagrada. A sacerdotisa dá bolos de mel para ela!',
];
export const PRIEST_LINES = [
  'Os sacrifícios de bois são feitos no grande altar de Atena. A fumaça sobe para os deuses; a carne fica para o povo.',
  'Lave as mãos na bacia de água lustral antes de entrar no recinto sagrado.',
];
