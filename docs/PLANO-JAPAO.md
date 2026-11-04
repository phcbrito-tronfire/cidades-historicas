# Japão — Aos Pés do Monte Fuji: relatório da Etapa 1

Resposta ao documento "Planejamento Cidades Históricas IV" (04/11/2026). Como o documento pede, aqui só há diagnóstico e plano; nada foi implementado ainda.

**Sobre as evidências.** O que está aqui vem de duas fontes: a leitura do código e os testes que fiz nas sessões de 01 a 04/11 (caminhadas simuladas, varreduras, imagens do jogo). Onde algo não foi verificado, isso está escrito. Nesta rodada não rodei nenhum teste novo no navegador, para não esquentar o PC.

---

## 1. Como o projeto está organizado

- **Tecnologia:** site estático com three.js r160 (via CDN), módulos ES, sem build. Roda local com `node serve.js` e é publicado no GitHub Pages a cada push na `main`. Antes de cada push, `node tools/versao.mjs` carimba a versão para furar o cache.
- **`js/comum/`** (24 arquivos, ~4.200 linhas), compartilhado pelas três cidades:
  - `player.js`: explorador, câmera, nado, montaria.
  - `collision.js`: caixas, círculos, `addRotBox`, `groundAt`.
  - `batcher.js`: junta a geometria por material e por quadra de 100 m.
  - `mixamo.js`, `roupas.js`, `vestir.js`: bonecos, animações, guarda-roupa.
  - `agua.js`, `waterfx.js`, `submerso.js`: água, reflexo, mergulho.
  - `fauna.js`, `animals.js`, `plateia.js`, `sculptures.js`: animais, plateia em cartões, modelos baixados.
  - `qualidade.js`, `desempenho.js`, `post.js`: três níveis de gráfico automáticos e pós-processamento.
- **Uma pasta por cidade:** `js/egito` (Mênfis, 18 arquivos), `js/atenas` (27) e `js/roma` (34). Cada cidade tem o próprio `main.js`, `terrain.js`, `sky.js`, `audio.js`, `ui.js`, `quests.js`, `items.js`, `artifacts.js`, `dialogues.js`, `npcs.js` e `textures.js`.
- **Assets:** 110 MB versionados no repositório (pacote git de 88 MB). Os 827 MB de `assets/mixamo` estão fora do git; só os `.glb` reduzidos são servidos.
- **Céu:** hoje são três estados fixos, manhã, tarde e noite, trocados com a tecla C. Cada troca de noite para manhã vira o "dia" dos eventos (festas, jogos). **Não existe um ciclo contínuo** com nascer do sol gradual.
- **Som:** todo gerado na hora com Web Audio (vento, mar, cigarras, lira). Não há nenhum arquivo de música.
- **Tamanho dos mapas:** Roma tem uns 1.270 × 1.400 m, com terreno de ~3,4 m por quadrado. Mênfis tem 820 × 820 m.

## 2. Inventário: o que já serve para o Japão

| Sistema | Como reaproveitar |
|---|---|
| Explorador, câmera, nado, colisão, escadas (STEP 0,45) | Direto |
| Batcher com `ground` e `onFloor` (nada flutua, terreno abaixo das lajes) | Direto. Só Roma usa hoje |
| `addRotBox` (prédios girados sem parede invisível) | Direto |
| Bonecos Mixamo, retint de roupa, `graftHead` | Direto. Faltam trajes japoneses: quimono, hakama, kasa, sandálias |
| Água com reflexo, lago nadável, barcos | Lago Kawaguchi e barcos de pesca |
| Eventos por dia (festas, jogos) e avisos só para quem assiste | Treino de samurai, arco (kyūdō), festival no santuário, partida dos peregrinos |
| Artefatos, objetivos, diálogos, fichas | Direto. A estrutura da ficha pedida (nome, período, função, curiosidade) já encaixa |
| Fauna (`fauna.js`, modelos Sketchfab) | Urso já existe. Faltam raposa, macaco, cervo-sika, tanuki e faisão |
| Três níveis de gráfico automáticos | Direto. O Japão vai precisar de LOD de floresta e montanha |

O que **não existe** e terá de ser criado: ciclo de dia contínuo, as quatro estações, neve por altitude, uma montanha de grande escala, florestas densas com custo controlado e trilha musical japonesa.

## 3. Problemas conhecidos nas três cidades

Gravidades: crítico (quebra o jogo), alto, médio, baixo.

| # | Grav. | Onde | Problema | Evidência | Correção sugerida |
|---|---|---|---|---|---|
| 1 | Alto | Mênfis e Atenas | O gancho do chão (`B.ground` e `B.onFloor`) só está ligado em Roma (`js/roma/buildings.js:136`). Nas outras duas, prédios em declive podem flutuar e o piso pode brigar com o terreno. | Código. Não percorri as duas cidades depois disso. | Ligar o gancho nas duas e fazer uma varredura de flutuantes em cada uma |
| 2 | Alto | Todas | O gancho só vale para caixas (`Batcher.box`). Cilindros, esferas e peças em `B.geo` (colunas, cúpulas, pilhas) não descem até o chão. | `js/comum/batcher.js:65` | Varredura que mede a base de cada peça `geo` contra o terreno |
| 3 | Alto | Todas | Os níveis de gráfico nunca foram testados num PC fraco de verdade. | Pendência anotada desde 27/10 | Teste num PC com vídeo integrado (de um professor?) e registro do FPS |
| 4 | Médio | Todas | `sky`, `audio`, `ui`, `quests`, `items` e `artifacts` existem em três cópias de 100 a 300 linhas cada. Correção feita numa cópia não chega às outras. | Contagem de linhas por arquivo | O que for novo no Japão (ciclo e estações) vai em `comum/`. As cópias antigas ficam como estão, sem refatoração grande |
| 5 | Médio | Roma, Termas | Linha vermelha fina atravessando o frigidário. | Imagem do jogo de 04/11. Causa desconhecida | Investigar |
| 6 | Médio | Roma | As alas das Termas e o Panteão não foram vistos em imagem depois do terraço. | Só caminhada simulada | Conferir com imagem |
| 7 | Médio | Guarda-roupa | A gálea romana escurece o rosto visto de lado. | Imagem de 04/11 | Ajustar sombra e profundidade do elmo |
| 8 | Baixo | Guarda-roupa | O forro do calçado do deserto está claro demais. | Imagem de 04/11 | Retint |
| 9 | Não verificado | Todas | Vazamento de memória ao trocar de cidade, som que continua tocando, listeners duplicados. | Não testei | Teste de troca de cidade repetida, medindo memória |

O que foi corrigido de 01 a 04/11 e testado andando ficou fora da tabela: escada do farol, Portus, Coliseu, hipogeu, Termas, Mercados de Trajano e piso brigando em Roma.

## 4. Plano de correção (antes do Japão)

1. Ligar o gancho do chão em Mênfis e Atenas (itens 1 e 2) e varrer as três cidades atrás de peças flutuando.
2. Resolver os itens 5 a 8 de Roma e do guarda-roupa.
3. Rodar um teste curto de troca de cidade e memória (item 9).

**Para não esquentar o PC:** uma cidade por vez, no gráfico leve, e o servidor desligado no fim de cada uma.

## 5. Como encaixar o Japão sem quebrar as outras

- Arquivos novos em `japao.html` e `js/japao/`, seguindo o modelo de Roma, mais um card novo na tela de entrada.
- O que é novo e serve para todos vai em `comum/`:
  - `comum/ciclo.js`: o dia corre sozinho, com nascer do sol gradual. As outras cidades continuam com a tecla C até alguém pedir a troca.
  - `comum/estacoes.js`: a cor da folhagem por uniforme no shader, neve por altitude, arrozais por fase e roupa dos figurantes.
- Prédios em código, no estilo próprio do Japão (regra das cidades anteriores). Do Sketchfab, só animais, objetos de artefato (katana, armadura, cerâmica) e talvez estátuas (jizō, komainu).
- Nenhuma mudança em `player.js` ou `collision.js` sem testar de novo as três cidades.

## 6. Etapas, riscos e critérios de aceite

| Etapa | Entrega | Maior risco |
|---|---|---|
| 1. Auditoria e correções | Itens 1 a 9 acima | PC esquentando nos testes |
| 2. Geografia | Mapa-base com o Fuji, o lago, o rio, a vila e a trilha, navegável | Escala do Fuji (ver decisão A) |
| 3. Arquitetura | Vila (minka de palha, machiya), santuário Sengen com torii e escadaria, templo budista, residência do senhor, hospedarias de oshi, com interiores | Interiores de tatami e shōji leves e com colisão certa |
| 4. Vegetação e fauna | Cedros, pinheiros, bambuzal só nos vales, arrozais, 6 bichos | Custo da floresta densa (precisa de instâncias e LOD) |
| 5. Personagens e eventos | Samurais em serviço e treino, kyūdō, peregrinos Fuji-kō, monges, sacerdotes, agricultores | Trajes japoneses nos bonecos Mixamo |
| 6. Ciclo, estações e som | Dia contínuo, nascer do sol no Fuji, 4 estações, trilha | Música de qualidade sem arquivos (ver decisão C) |
| 7. Conteúdo educativo | Artefatos, fichas, Hasegawa Kakugyō, comida | Separar fato, interpretação e ficção em cada ficha |
| 8. Testes finais | Checklist da seção 18 do documento | Regressão nas três cidades |

## 7. Decisões que são suas

**A. Escala do Fuji.** O real tem 3.776 m. Um mapa caminhável inteiro nessa escala não roda no navegador.
- **Minha recomendação:** comprimir a montanha mais ou menos 1:5, com o cume a uns 750 m e uma base de 3 a 4 km. O mapa jogável cobre o pé norte (vila, lago, campos, santuário) e uma fatia da montanha onde sobe a trilha Yoshida até o cume. A trilha tem estações de descanso e a vegetação muda com a altura. Subindo andando, dá de 8 a 10 minutos.
- O resto do cone fica visível, mas é fechado por campos de lava que ninguém atravessa. A compressão vai documentada, como pede o documento.

**B. "Mapa compacto" × região grande.** Na revisão de Roma você pediu mapa compacto e sem vazios. O documento pede vila, campos, lago, floresta, residência e montanha.
- **Minha recomendação:** o vale denso, de uns 1,2 × 1,2 km como Roma, mais a trilha da montanha como um corredor que sobe. A montanha não vira um mapa enorme e vazio.

**C. Trilha sonora.** Hoje tudo é sintetizado na hora. Shakuhachi e koto sintetizados soam artificiais. Há duas saídas:
- (1) Gravações de instrumentos reais com licença livre (CC0 ou CC BY), em notas e frases curtas que o jogo combina sozinho, sem copiar nenhuma música. Isso traz arquivos novos para baixar, de 2 a 5 MB.
- (2) Continuar só com síntese.
- Minha recomendação é a (1).

**D. Estações.** Cada estação muda folhagem, flores, neve, arrozais, roupas e atividades. Isso é muito trabalho em cima de cada coisa feita.
- **Minha recomendação:** construir tudo já pensando nas quatro, mas acabar primeiro primavera e outono (as mais marcantes), depois verão e inverno.
- Para trocar: um seletor de estação, e a estação também avança sozinha a cada certo número de dias do jogo.

## 8. Coisas a confirmar

- As imagens do documento ilustrado são só links. O Word baixa da internet ao abrir, e não estão dentro do arquivo. Se quiser que eu as veja, preciso abrir os links ou que você mande as imagens.
- Ghost of Tsushima e Ghost of Yōtei: entram só como referência de clima. Não copio nada desses jogos.

---

## Decisões do Pedro (04/11/2026)

- **Ordem:** primeiro corrigir as três cidades até ficarem redondas (seções 3 e 4). Só depois começa o Japão.
- **Céu:** continua manhã, tarde e noite na tecla C, inclusive no Japão. Sem ciclo contínuo.
- **Música:** nada de frases nem trilha elaborada. Só um instrumental leve de fundo, típico do Japão, sem pesar.
- **Estações:** as quatro são obrigatórias.
- **Fuji:** aprovada a compressão de ~1:5, com cume a ~750 m, a trilha Yoshida numa fatia da montanha e o resto do cone ao fundo. Vale compacto de ~1,2 km.

## Etapa 2 — entregue (04/11/2026, commit d9712ed)
Mapa-base navegável: o Fuji (1:5, cume 780 m acima do vale, cratera), o lago Kawaguchi, a rua da vila, os planos da residência, do templo e dos arrozais, o riacho com a cachoeira e a trilha Yoshida até a cratera. A subida foi testada a pé, sem travar: 5 min correndo e uns 10 andando. Há também uma primeira floresta: cedros, pinheiros, folhosas, abetos e bambuzal.

## O que o Pedro pediu para não esquecer (04/11) — tudo com qualidade máxima
- **Vila e casas:** minka de palha, machiya, casas dos oshi com hospedaria, lojas, oficinas e cozinhas, com interiores mobiliados e acessíveis.
- **Pessoas com rotina:** moradores, peregrinos Fuji-kō, mercadores, artesãos, agricultores, monges e sacerdotes.
- **Samurais:** guarda, patrulha, treino de katana, yari e kyūdō, e a residência do senhor.
- **Personagens históricos:** Hasegawa Kakugyō, o fundador da tradição Fuji-kō (historicamente morreu em 1646, então entra como lenda contada pelos oshi ou estátua, não vivo em 1790), Jikigyō Miroku (o asceta do Fuji, morreu em 1733, entra como memória) e um oshi da vila. Cada um precisa ficar claro: histórico, fictício ou representação.
- **Objetivos:** os de cada prédio, personagem e evento.
- **Montaria:** um cavalo japonês (dosanko ou kiso: pequeno, robusto) com sela de estilo japonês.
- **Artefatos:** katana, armadura, ukiyo-e (Hokusai é posterior: as 36 Vistas são de c. 1830; usar um mestre da época, como Shiba Kōkan ou Kitao Shigemasa), cerâmica, amuleto, mapa, ferramenta agrícola e utensílio de chá.
