# Plano — combate em Roma (e golpes do Japão revistos)

Pedido do Pedro (09/11/2026). **Feito em 10/11/2026: as quatro etapas, juntas** (`js/roma/luta.js`, `js/roma/arena.js`, `js/roma/circo.js`, `js/roma/corrida.js`). Pendente: socos e rolamento de verdade do Mixamo (precisa do login do Pedro no navegador do app); até lá, o soco usa a pancada com o punho da espada e o chute, e a esquiva, o agachar da aterrissagem. Tudo isso só se abre para quem **concluiu todos os objetivos de Roma e pegou todos os
artefatos**. Cada etapa é publicada e conferida antes da próxima.

## O que já existe e será aproveitado
- Vida, dano e desmaio do explorador (`comum/vida.js`); golpes de katana com F (Japão), corte de bambu e palha.
- Roupa de **legionário** como prêmio de Roma (gálea, lorica segmentata, gládio na bainha), mas sem golpes.
- No Coliseu: lutas de gladiadores com árbitro, defesa com escudo, esquiva, sangue, pedido de clemência e plateia
  (`roma/combate.js`); a caçada com feras (`roma/caca.js`); as bigas no Circo Máximo, com 7 voltas (`roma/circo.js`).

## Etapa 1 — base de combate (Japão e Roma)
- **Golpes revistos:** hoje cada golpe corta a animação em 80 a 85% e emenda o próximo na metade, por isso parecem
  "encurtados". Passam a ir até o fim do movimento, com a emenda mais tarde e uma transição suave.
- **Acerto de verdade:** a lâmina tem alcance e arco, e acerta quem estiver nele (gente, feras, bonecos de treino), com
  impacto, faísca e tremor de câmera, como já acontece no bambu.
- **Controles:** clique esquerdo (ou F) para golpear, clique direito (ou Q) para defender com o escudo ou a espada, e
  Espaço com a espada na mão para esquivar rolando. Botões na tela do celular.
- **Prêmio de Roma:** o legionário passa a lutar com **gládio e escudo (scutum)**. Ganha-se também uma segunda roupa,
  a de **gladiador mirmilão** (elmo de crista com viseira, manica no braço, escudo grande, gládio e grevas), que é
  a que o guarda do Coliseu exige.

## Etapa 2 — lutar no munus (dia dos gladiadores)
- Um **guarda do Coliseu**, na porta dos gladiadores (Porta Libitinensis/Sanavivaria), aparece só com tudo concluído e
  vestindo a roupa de gladiador. Ele pergunta se você quer lutar; "sim" leva você à arena.
- Você enfrenta adversários em sequência (trácio, retiário com rede e tridente, secutor), cada um com estilo próprio:
  ataca, defende, finta e cansa. Eles batem em você e você neles.
- **Perder:** você cai e pede clemência; a plateia decide, e na maioria das vezes você sai vivo (missio), como era de
  fato. Volta para a porta com a vida baixa.
- **Vencer:** o adversário pede clemência e o povo decide; você recebe o que os gladiadores ganhavam: a **folha de
  palmeira**, a **coroa** e uma bolsa de moedas. Depois de várias vitórias, a **rudis** (a espada de madeira da
  liberdade), que entra como artefato.

## Etapa 3 — a caçada (venatio, o dia seguinte)
- Com a roupa de **venator** (túnica, faixas nas pernas e lança de caça), você entra na arena contra as feras: leão,
  urso e touro. Elas avançam, rodeiam e investem; você esquiva e golpeia com a lança.
- Prêmio: a coroa do venator e um artefato da caçada.

## Etapa 4 — corrida de bigas no Circo Máximo
- Um **organizador**, junto das baias de largada (carceres), pergunta se você quer correr e por qual facção (Verdes,
  Azuis, Brancos ou Vermelhos).
- **3 voltas** contra 3 aurigas. Você guia os cavalos, a curva na meta pede freio, dá para fechar e ser fechado, e o
  chicote dá um impulso curto que cansa os cavalos.
- Os golfinhos da spina viram a cada volta. **Chegar em 1º** dá a palma, a coroa do auriga e um artefato.

## Perguntas em aberto (com o padrão que será usado se o Pedro não disser outra coisa)
- Morrer na arena: sair vivo pela clemência (padrão) ou morrer de verdade e recomeçar na porta?
- Mouse para golpear e defender, mantendo F e Q no teclado (padrão).
- Gladiador mirmilão como prêmio a mais, junto do legionário (padrão).

## Como ficou (10/11/2026)
- Teclas: F ou clique golpeia (emenda); correndo, o golpe forte. Q ou botão direito segura o escudo. Espaço esquiva. G arremessa a lança ou o gládio. P pega a arma do chão. No celular, botões Golpe, Escudo e Arremessar.
- Golpe forte pode arrancar a arma da mão (do explorador e dos adversários): luta-se no soco ou pega-se outra. Os adversários também vão buscar armas no chão.
- Munus: trácio → reciário → secutor e hoplômaco juntos. Quem apanha 3 vezes seguidas apara ou devolve na hora. De joelhos: E poupa, F golpe final; a plateia grita missio ou iugula. Prêmios: palma, bolsa; com 3 vitórias, a rudis.
- Venatio (refeita em 10/11): uma confusão só — o explorador desce no meio dos venatores (3 a 7, conforme os gráficos), e as feras sobem em três levas de quatro: leões e javalis → urso, tigre, touro e leão → elefante, rinoceronte, tigre e leão. Cada fera escolhe o caçador mais perto; rondam, rugem, investem, saltam e mordem com as animações do próprio modelo (as patas no ritmo da velocidade), e cada espécie tem a sua voz (gravações reais). Venatores feridos caem e se levantam depois. Prêmio: áureo de Trajano.
- Arremesso (G): vai no alvo que a câmera mira, no ponto onde ele vai estar, e corrige um pouco o rumo no voo (12 de 14 acertos no teste, de 8 a 22 m).
- Bigas: 3 voltas; ↑ soltar, ↓ segurar, ← → raia, Shift chicote, E desistir; derrapa e naufraga na meta se entrar rápido demais. 1º lugar: palma e coroa do auriga.
- Roupa nova: Gladiador (mirmilão), ganha com todos os objetivos E todos os artefatos de Roma. Os prêmios aparecem na coleção (K).
