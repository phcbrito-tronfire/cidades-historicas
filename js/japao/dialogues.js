// Diálogos do Japão, c. 1790 (era Kansei, xogum Tokugawa Ienari; o conselheiro Matsudaira Sadanobu faz as Reformas
// Kansei). A vila é inventada, mas inspirada em Fujiyoshida, onde os oshi recebiam os peregrinos das confrarias
// Fuji-kō. Quem é quem:
// - PESSOA HISTÓRICA: Shiba Kōkan (1747–1818), pintor que pintou o Fuji à maneira ocidental — o encontro aqui é imaginado.
// - LEMBRADOS (já tinham morrido em 1790): Hasegawa Kakugyō (†1646), o fundador da tradição, e Jikigyō Miroku (†1733),
//   que jejuou até a morte no alto da trilha Yoshida.
// - Todos os outros são pessoas comuns inventadas, para mostrar o dia a dia (e isso está dito no jogo).

export const NPCS = [
  {
    id: 'oshi', name: 'Tanabe Gorōzaemon', title: 'Oshi, guia e hospedeiro de peregrinos', objective: 'oshi',
    look: { outfit: 'kimono', cloth: 0x3a3428, pattern: 'shima', accent: '#1a1610', haori: true, haoriColor: 0x1e1e24, obi: 0x2a2218, extras: ['fan'] },
    greet: 'Seja bem-vindo à minha casa, viajante. Sou Tanabe, oshi desta vila: recebo os peregrinos que vêm subir a montanha. Tire as sandálias e descanse um pouco.',
    topics: [
      { q: 'O que faz um oshi?', a: [
        'Um oshi é metade sacerdote, metade hospedeiro. As confrarias de Edo e das províncias têm sempre o mesmo oshi, de pai para filho: eu hospedo os membros, rezo por eles diante do altar e os levo até a trilha.',
        'No inverno eu é que viajo: vou visitar as confrarias, levo amuletos do santuário e combino a peregrinação do verão. Há oshi que cuidam de dezenas de confrarias.'] },
      { q: 'Quando os peregrinos sobem?', a: [
        'A montanha "abre" no começo do sexto mês, mais ou menos o nosso verão, e "fecha" no fim do sétimo, com a festa do fogo. Fora disso, há neve demais lá em cima.',
        'Eles chegam de Edo em uns três ou quatro dias de caminhada. Dormem aqui, purificam-se no santuário e saem antes do amanhecer, em fila, de branco.'] },
      { q: 'Por que todos se vestem de branco?', a: [
        'O branco é a cor da pureza e também a da morte: quem sobe a montanha sagrada morre para a vida comum e volta renascido. Muitos levam carimbos de cada estação nas costas da roupa.'] },
    ],
    bye: 'Que a montanha o receba bem. Rokkon shōjō!',
  },
  {
    id: 'sendatsu', name: 'Kihei', title: 'Sendatsu (líder) de uma confraria Fuji-kō de Edo', objective: 'sendatsu',
    look: { outfit: 'pilgrim', cloth: 0xf2efe6, extras: ['kasa_pilgrim', 'zue'] },
    greet: 'Ah, um estrangeiro! Sou Kihei, carpinteiro em Edo e líder da nossa confraria. Viemos em doze: juntamos dinheiro o ano inteiro para que ao menos estes subissem.',
    topics: [
      { q: 'O que é uma confraria Fuji-kō?', a: [
        'Um grupo de gente do mesmo bairro que venera o Fuji. Cada um põe umas moedas por mês e, no verão, sorteamos quem viaja. Quem não pode vir reza junto, de longe.',
        'Em Edo há tantas confrarias que se diz "oitocentas e oito". Alguns bairros até fizeram montinhos de terra e lava imitando o Fuji, os fujizuka, para quem não pode viajar subir um pouquinho.'] },
      { q: 'Quem começou essa tradição?', a: [
        'Hasegawa Kakugyō, um asceta que viveu há quase duzentos anos. Dizem que meditou numa caverna ao pé da montanha e subiu o Fuji mais de cem vezes. Ele morreu em 1646.',
        'E Jikigyō Miroku, um vendedor de óleo de Edo. Em 1733 ele jejuou até a morte numa pedra lá no alto da trilha, rezando por um mundo mais justo. Muitos de nós o seguimos.'] },
      { q: 'É perigoso subir?', a: [
        'O ar fica fino, o vento corta e o frio de madrugada é de inverno, mesmo no verão. Já vi gente desmaiar perto da oitava estação. Por isso vamos devagar, parando em cada cabana.',
        'Lá em cima esperamos o sol nascer: chamamos de goraikō, a chegada da luz de Buda. Ninguém esquece.'] },
    ],
    bye: 'Rokkon shōjō! Que os seis sentidos se purifiquem!',
  },
  {
    id: 'kannushi', name: 'Ōtomo Yoshitaka', title: 'Sacerdote xintoísta (kannushi) do santuário Sengen', objective: 'kannushi',
    look: { outfit: 'kannushi', cloth: 0xf6f2ea, hakama: 0x6a5a9a, extras: ['eboshi'] },
    greet: 'Bem-vindo ao santuário Sengen. Antes de chegar ao salão, lave as mãos e a boca na fonte: é assim que se purifica quem vai falar com os kami.',
    topics: [
      { q: 'Quem é venerado aqui?', a: [
        'Konohana-sakuya-hime, a princesa da flor de cerejeira, a deusa do Fuji. Os santuários Sengen ficam ao redor da montanha para acalmar o vulcão — a última erupção, em 1707, cobriu Edo de cinza.',
        'O xintoísmo tem kami em toda parte: na montanha, nos rios, nas árvores velhas. Aquele cedro enorme da alameda, com a corda sagrada, também é morada de um kami.'] },
      { q: 'Como se reza diante do salão?', a: [
        'Jogue uma moeda na caixa, toque o sino com a corda para chamar o kami, faça duas reverências, bata palmas duas vezes, faça o pedido em silêncio e mais uma reverência.'] },
      { q: 'O que é a festa do fogo?', a: [
        'No fim do sétimo mês, quando a montanha fecha, a vila acende tochas enormes de pinho, da altura de duas pessoas, ao longo de toda a rua. A noite fica dourada. É o agradecimento pelo verão sem desastres.'] },
      { q: 'Budismo e xintoísmo são inimigos?', a: [
        'De jeito nenhum. Hoje andam juntos: muitos acreditam que os kami são formas dos budas. O templo da colina e este santuário vivem lado a lado, e o povo frequenta os dois.'] },
    ],
    bye: 'Que a princesa da flor guarde o seu caminho.',
  },
  {
    id: 'monge', name: 'Monge Sōen', title: 'Monge zen do templo da colina', objective: 'monge',
    look: { outfit: 'monk', cloth: 0x1a1a1e, kesa: 0x7a5a2a },
    greet: 'Sente-se, se quiser. O silêncio também é uma resposta. Sou Sōen, do templo da escola Sōtō.',
    topics: [
      { q: 'O que é o zen?', a: [
        'É sentar. Só isso, e é o mais difícil: sentar de pernas cruzadas, costas retas, e deixar os pensamentos passarem como nuvens sobre o Fuji, sem segurar nenhum. Chamamos de zazen.',
        'Varrer o pátio, cozinhar o arroz, tocar o sino: tudo pode ser meditação, se feito com atenção inteira.'] },
      { q: 'Por que o templo guarda os nomes das pessoas?', a: [
        'Desde que o xogunato proibiu o cristianismo, cada família tem de estar registrada num templo budista. Eu anoto nascimentos, mortes e casamentos: sem o papel do templo, ninguém viaja nem se casa.',
        'É útil, mas também nos transforma em funcionários do governo. Às vezes penso que Buda não pediu isso.'] },
      { q: 'E os Jizō de babador vermelho?', a: [
        'Jizō protege as crianças, os viajantes e as almas dos pequenos que morreram cedo. As mães costuram os babadores e as toucas. Na trilha há muitos: os peregrinos deixam moedas e pedrinhas.'] },
    ],
    bye: 'Caminhe devagar. A montanha não vai fugir.',
  },
  {
    id: 'daikan', name: 'Iwase Danjō', title: 'Oficial do xogunato na residência (jin\'ya)', objective: 'daikan',
    look: { outfit: 'samurai', cloth: 0x2a2a36, hakama: 0x3a3a44, formal: true, extras: ['daisho'] },
    greet: 'Você está na residência do governo. Fale com respeito e sem pressa. Sou Iwase, encarregado das contas e da ordem nesta região.',
    topics: [
      { q: 'O que se faz aqui?', a: [
        'Cobramos o imposto, que se paga em arroz — o nengu. Cada aldeia deve uma parte da colheita, medida em koku, o arroz que um homem come num ano. Depois julgamos as brigas de terra e de água.',
        'Também cuidamos das estradas, dos postos de controle e da montanha: quem abre a temporada de subida e registra os peregrinos somos nós.'] },
      { q: 'Os samurais ainda guerreiam?', a: [
        'Há quase duzentos anos não há guerra no Japão. Nós, samurais, viramos administradores: escrevemos mais do que lutamos. Mas a espada continua na cintura e o treino continua no dōjō, todos os dias.',
        'Um samurai sem guerra precisa de disciplina, estudo e lealdade ao seu senhor. Isso é o que nos mantém samurais.'] },
      { q: 'O que são as Reformas Kansei?', a: [
        'O conselheiro Matsudaira Sadanobu, em Edo, quer pôr ordem nas finanças depois dos anos de fome. Manda guardar arroz para as crises, corta luxos, perdoa dívidas dos samurais com os comerciantes de arroz e vigia livros e gravuras "indecentes".',
        'Os mercadores reclamam. Mas a fome de Tenmei, há poucos anos, matou gente demais. Ninguém quer ver aquilo de novo.'] },
    ],
    bye: 'Siga as regras e ninguém o incomodará.',
  },
  {
    id: 'sensei', name: 'Kurosawa Jinnai', title: 'Mestre de esgrima (kenjutsu) do dōjō', objective: 'sensei',
    look: { outfit: 'samurai', cloth: 0xe8e2d4, hakama: 0x22283a, extras: ['bokken', 'daisho'], beard: 'short' },
    greet: 'Entre com uma reverência — sempre. Sou Kurosawa. Aqui os rapazes aprendem que a espada é a última coisa a usar.',
    topics: [
      { q: 'Por que treinam com espadas de madeira?', a: [
        'O bokken, de carvalho, deixa treinar golpes de verdade sem matar ninguém. Um golpe mal dado ainda quebra osso: por isso a disciplina vem antes da força.'] },
      { q: 'Como é uma katana?', a: [
        'O ferreiro dobra o aço dezenas de vezes e cobre a lâmina de barro antes de mergulhá-la na água: o fio fica duríssimo e o dorso, flexível. A linha ondulada que aparece no fio, o hamon, é a assinatura do ferreiro.',
        'Um samurai usa duas: a longa, katana, e a curta, wakizashi. Só os samurais podem usar as duas juntas: é sinal da classe.'] },
      { q: 'O que é o bushidō?', a: [
        'Hoje se fala muito disso: lealdade, coragem, honestidade, controle de si. Muito do que se escreve vem desta época de paz, quando os samurais tiveram tempo de pensar no que deviam ser.'] },
    ],
    bye: 'Volte para o treino da manhã, se tiver coragem de acordar cedo.',
  },
  {
    id: 'kyudo', name: 'Yoshida Heikurō', title: 'Mestre de arco (kyūdō)', objective: 'kyudo',
    look: { outfit: 'samurai', cloth: 0xf2efe6, hakama: 0x1a1a22, extras: ['yumi', 'katana'] },
    greet: 'Silêncio na raia, por favor. Ah, você veio ver o arco. Sou Yoshida.',
    topics: [
      { q: 'Por que o arco é tão comprido?', a: [
        'O yumi tem mais de dois metros e o punho fica abaixo do meio — assim se atirava a cavalo, nos tempos de guerra. É feito de bambu e madeira colados, e a corda é de cânhamo.'] },
      { q: 'Os samurais ainda usam arco?', a: [
        'Na guerra, a arma do samurai antigo era o arco, mais que a espada. Hoje atiramos por disciplina: oito movimentos, do pé firme até soltar a flecha. O alvo está a vinte e oito metros.',
        'Se a mente está agitada, a flecha erra. O arco mostra o que vai dentro da gente.'] },
    ],
    bye: 'Respire. Depois atire. Nessa ordem.',
  },
  {
    id: 'lavradora', name: 'Ume', title: 'Lavradora dos arrozais', objective: 'lavradora',
    look: { outfit: 'farmer', cloth: 0x2a3a5a, pattern: 'kasuri', accent: '#e8e4da', extras: ['kasa', 'hoe'], female: true },
    greet: 'Cuidado onde pisa, que a água do arrozal é para o arroz! Sou Ume. A família toda trabalha aqui, desde as crianças até a avó.',
    topics: [
      { q: 'Como se planta o arroz?', a: [
        'Na primavera, a semente brota num canteiro. Quando as mudas crescem, alagamos os tabuleiros e plantamos uma por uma, com água pelas canelas. No verão, arrancamos o mato e cuidamos da água.',
        'No outono, cortamos com a foice e penduramos os feixes em varais para secar. No inverno, a terra descansa e nós trançamos palha: sandálias, cordas e capas de chuva.'] },
      { q: 'O arroz é de vocês?', a: [
        'Uma boa parte vai para o imposto, para a residência do governo. O que sobra a gente come, vende ou troca. Aqui no pé da montanha o frio é forte e a terra é pobre: muitos vivem também da hospedagem dos peregrinos e do tecido.'] },
      { q: 'O que vocês comem?', a: [
        'Arroz, quando dá; muitas vezes misturado com cevada ou painço. Sopa de missô, legumes em conserva, tofu nos dias bons e peixe do lago. Carne quase ninguém come.'] },
    ],
    bye: 'Que a colheita seja boa para todos nós!',
  },
  {
    id: 'chaya', name: 'Ochiyo', title: 'Dona da casa de chá perto do santuário', objective: 'chaya',
    look: { outfit: 'kimono_f', cloth: 0x8a3a3a, pattern: 'koshi', accent: '#2a1a14', obi: 0x2a3a5a },
    greet: 'Sente-se, sente-se! Chá verde e um espetinho de dango? Depois de rezar, todo mundo tem fome. Sou Ochiyo.',
    topics: [
      { q: 'O que a senhora vende?', a: [
        'Chá verde, dango (bolinhos de arroz no espeto, com molho doce de soja), onigiri (bolinho de arroz com sal e uma conserva de ameixa dentro) e soba, macarrão de trigo-sarraceno, quente ou frio.',
        'O trigo-sarraceno cresce bem aqui no frio da montanha, onde o arroz sofre. Por isso o soba daqui é famoso.'] },
      { q: 'Como se toma o chá?', a: [
        'Aqui, simples: folha em infusão, na tigelinha. A cerimônia do chá, com o pó batido com o batedor de bambu, é coisa dos samurais e dos ricos, com regras para cada gesto.'] },
    ],
    bye: 'Volte quando descer da montanha, que eu guardo um dango para você!',
  },
  {
    id: 'pescador', name: 'Gonsuke', title: 'Pescador do lago Kawaguchi', objective: 'pescador',
    look: { outfit: 'farmer', cloth: 0x4a4a3a, pattern: 'plain', extras: ['tenugui'] },
    greet: 'Opa. O lago está calmo hoje: dá para ver o Fuji de cabeça para baixo na água. Sou Gonsuke, pescador.',
    topics: [
      { q: 'O que se pesca aqui?', a: [
        'Carpas, enguias, um peixinho miúdo que a gente seca. Pesco de barco de madeira, com rede, de manhã cedo, quando a névoa ainda está em cima da água.'] },
      { q: 'O lago é sagrado também?', a: [
        'Os Cinco Lagos do Fuji são lugares de purificação: há peregrinos que dão a volta neles, lavando-se em cada um. E dizem que quem vê o reflexo do Fuji perfeito, sem vento, tem sorte o ano inteiro.'] },
    ],
    bye: 'Se vir o reflexo perfeito, me conte!',
  },
  {
    id: 'ronin', name: 'Kanbei', title: 'Rōnin, samurai sem senhor', objective: 'ronin',
    look: { outfit: 'samurai', cloth: 0x4a4038, hakama: 0x5a524a, hair: 'ronin', beard: 'short', extras: ['katana', 'kasa'] },
    greet: 'Não me olhe assim, não sou bandido. Sou Kanbei. Já tive um senhor; agora tenho só esta espada e o caminho.',
    topics: [
      { q: 'O que é um rōnin?', a: [
        '"Homem-onda", que vai para lá e para cá. Um samurai cujo senhor morreu ou perdeu as terras. Sem senhor, não há salário em arroz: muitos viram professores de esgrima, guardas de comerciantes, escreventes.',
        'Alguns poucos viram bandidos. Por isso o povo desconfia, e o governo nos vigia.'] },
      { q: 'O senhor ainda é samurai?', a: [
        'Pela lei, sim: continuo usando as duas espadas. Na prática, ensino crianças a ler e a escrever em troca de arroz. A espada pesa mais quando não há a quem servir.'] },
    ],
    bye: 'Siga em paz. E não deixe o Fuji subir à cabeça.',
  },
  {
    id: 'oleiro', name: 'Tōbei', title: 'Artesão de cestos e de cerâmica', objective: 'oleiro',
    look: { outfit: 'kimono', cloth: 0x6a5a40, pattern: 'kasuri', accent: '#2a2218', extras: ['tenugui'] },
    greet: 'Pode olhar, pode pegar. Tigelas, potes de missô, cestos de bambu. Sou Tōbei, faço tudo com estas mãos.',
    topics: [
      { q: 'Como se faz uma tigela?', a: [
        'O barro é pisado, amassado e torneado no torno de pé. Seca à sombra, recebe o esmalte feito de cinza de madeira e vai ao forno de lenha, subindo pela encosta, por dias. Cada fornada sai um pouco diferente.'] },
      { q: 'E os cestos?', a: [
        'O bambu daqui do vale é bom: rachado em fitas finas, trançado molhado. Cestos para o arroz, peneiras, gaiolas de grilo para as crianças. O bambu cresce tão rápido que nunca falta.'] },
    ],
    bye: 'Leve um cestinho de lembrança, é baratinho!',
  },
  {
    id: 'cabaneiro', name: 'Sakichi', title: 'Dono da quinta estação da trilha', objective: 'cabaneiro',
    look: { outfit: 'farmer', cloth: 0x5a4a3a, pattern: 'plain', extras: ['tenugui'], legColor: 0x3a3028 },
    greet: 'Ufa, chegou! Aqui acaba a floresta e começa a pedra. Água quente, chá, um lugar no estrado? E o carimbo no cajado, claro.',
    topics: [
      { q: 'O que é esta cabana?', a: [
        'A trilha é dividida em dez "go", os décimos da subida. Em cada um há uma cabana como esta: o teto é preso com pedras por causa do vento. Vendo água, chá, sandálias de palha novas e carimbo.'] },
      { q: 'Até onde as mulheres podem subir?', a: [
        'Pelas regras de hoje, só até a pedra da segunda estação, a nyonin-tenba. Dizem que a montanha não gosta. Muitas sobem até lá e rezam de baixo. Há quem diga que um dia isso vai mudar.'] },
      { q: 'O que há lá em cima?', a: [
        'Mais acima, a pedra onde Jikigyō Miroku jejuou até morrer, em 1733. E no cume, a borda da cratera, o santuário de cima e o nascer do sol mais bonito do mundo.'] },
    ],
    bye: 'Devagar e sempre. A oitava estação é a mais difícil.',
  },
  {
    id: 'eremita', name: 'Velho Genzō', title: 'Eremita do cume', objective: 'eremita',
    look: { outfit: 'monk', cloth: 0x8a7a6a, kesa: 0x4a3a2a, beard: 'full', hairColor: 0xd8d4cc },
    greet: 'Ah, alguém subiu até aqui embaixo, no fundo da cratera! Sente-se perto do laguinho. Daqui de dentro não se vê o mundo, só o céu.',
    topics: [
      { q: 'O senhor mora aqui em cima?', a: [
        'Moro, e sou o único. Lá embaixo dizem que ninguém aguenta viver no cume — e quase sempre têm razão. No inverno a neve fecha a borda e eu passo meses sem ver ninguém. Só aqui no fundo da cratera o vento não entra.',
        'Os peregrinos não descem até aqui: sobem de noite, esperam o sol nascer na borda e dão a volta inteira da cratera, o ohachi-meguri, "a volta da tigela". A cratera parece mesmo uma tigela de arroz virada para o céu.'] },
      { q: 'Por que o senhor veio para cá?', a: [
        'Fui asceta da montanha. Kakugyō, que começou a devoção ao Fuji, rezou anos numa caverna ao pé do monte. Eu quis rezar mais perto do céu.',
        'A Oyuki, minha neta, sobe no verão e me ajuda com o jardim. Sem ela a cerejeira já tinha secado.'] },
      { q: 'Por que a cerejeira?', a: [
        'A deusa do Fuji é Konohana-sakuya-hime, a princesa da flor de cerejeira. Diz a lenda que ela vive no cume e que a cerejeira floresce e cai tão depressa quanto a vida. Aqui ela tem a sua árvore.'] },
    ],
    bye: 'Desça com cuidado. A volta é mais difícil para os joelhos do que a subida.',
  },
  {
    id: 'kokan', name: 'Shiba Kōkan', title: 'Pintor (pessoa histórica — encontro imaginado)', objective: 'kokan',
    look: { outfit: 'kimono', cloth: 0x2a2a30, pattern: 'plain', haori: true, haoriColor: 0x4a3a2a, extras: [] },
    greet: 'Não se mexa, por favor, você está na frente do meu Fuji! Ah, perdão. Sou Shiba Kōkan, pintor de Edo. Estou desenhando o reflexo da montanha no lago.',
    topics: [
      { q: 'Que tipo de pintura o senhor faz?', a: [
        'Pinto à maneira holandesa: com óleo, sombra e perspectiva, como nos livros que chegam em Nagasaki, o único porto aberto aos europeus. Os pintores daqui desenham com linhas; eu quero a luz e a distância.',
        'Também fiz gravuras em cobre, as primeiras do Japão, copiando técnicas dos livros holandeses. Gosto de saber como as coisas funcionam: estudo o telescópio, os mapas, o céu.'] },
      { q: 'E as gravuras ukiyo-e?', a: [
        'São as estampas do "mundo flutuante": atores de teatro, belas moças, paisagens, impressas em blocos de madeira, uma cor por bloco. Custam pouco e vendem como peixe fresco em Edo.',
        'Eu mesmo comecei desenhando ukiyo-e. Há poucos anos ainda ninguém fazia muitas paisagens do Fuji em gravura; aposto que ainda vão fazer séries inteiras dele.'] },
      { q: 'Por que pintar o Fuji?', a: [
        'Porque é a forma mais perfeita que conheço. Cada hora do dia ele muda: azul de manhã, vermelho no fim do verão, branco no inverno. Um pintor podia passar a vida só pintando o Fuji.'] },
    ],
    bye: 'Lembre-se: Shiba Kōkan pintou o Fuji antes de todo mundo!',
  },
];

export const VILLAGER_LINES = [
  'Os peregrinos de Edo chegaram ontem. A vila inteira cheira a arroz cozido e a incenso.',
  'Dizem que este ano a neve demorou a sair do cume. Os velhos dizem que isso é bom para a colheita.',
  'Meu filho foi trabalhar de carregador na trilha. Ganha mais em um verão do que eu na lavoura.',
  'Cuidado com as moedas: com a reforma do conselheiro, tudo ficou mais caro e mais vigiado.',
  'Já foi ao santuário? O cedro grande tem mais de mil anos, dizem.',
  'De manhã o Fuji fica rosado. Quem acorda cedo vê.',
];
export const PILGRIM_LINES = [
  'Rokkon shōjō! Rokkon shōjō!',
  'Juntamos moedas o ano inteiro para vir. Minha mãe não pôde, então eu subo por ela.',
  'Amanhã saímos antes do galo cantar. O oshi diz que é para ver o sol nascer lá do cume.',
  'Veja o carimbo nas costas da minha roupa: um de cada montanha que já subi.',
];
export const SAMURAI_LINES = [
  'Ande pelo lado da rua. A residência não é lugar de curiosos.',
  'Paz há quase dois séculos. Mas o guarda nunca dorme.',
  'Hoje tenho de conferir o arroz do imposto de três aldeias. A espada é mais leve que os livros de contas.',
];
export const FARMER_LINES = [
  'Água pelas canelas o dia inteiro. Mas é o arroz que paga o imposto.',
  'Se chover pouco este mês, as mudas sofrem. Se chover muito, apodrecem. A gente reza dos dois jeitos.',
  'A palha do arroz vira sandália, corda e capa de chuva. Nada se perde.',
];
export const MONK_LINES = ['...', 'Varrer as folhas também é meditar.', 'O sino toca cento e oito vezes na noite de Ano-Novo: uma para cada desejo que nos prende.'];
export const MERCHANT_LINES = [
  'Sandálias de palha novas! Ninguém sobe a montanha com a mesma sandália.',
  'Amuletos, incenso, cajados! Tudo para a subida!',
  'Saquê do vale, missô da casa, conservas de nabo! Prove!',
  'Os oshi mandam os peregrinos para cá. Por isso o preço é justo... quase sempre.',
];
export const CHILD_LINES = ['Pega-pega! Você é o oni!', 'Meu pai disse que eu vou subir a montanha quando fizer quinze anos.', 'Já viu a raposa do bosque? Dizem que é mensageira de Inari!'];
export const PRIEST_LINES = ['Purifique as mãos na fonte antes de rezar.', 'Duas reverências, duas palmas, uma reverência.'];
