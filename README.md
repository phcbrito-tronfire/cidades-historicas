# Cidades Históricas

Viagem interativa no tempo: explore em 3D, no navegador, grandes cidades da história no auge do seu esplendor.
Converse com quem viveu lá, colete artefatos reais e descubra como era a vida, a comida e a fé de cada época.

### ▶ Jogar agora: https://phcbrito-tronfire.github.io/cidades-historicas/

Funciona no navegador do computador (Chrome ou Edge atualizados). O primeiro carregamento baixa uns 45 MB.

**Disponível:** Mênfis, Egito Antigo (c. 1250 a.C., 30º ano de Ramsés II).
**Em produção:** Roma, Atenas, Tenochtitlan, Babilônia, Cusco, Constantinopla e Chang'an.

## Como rodar

Precisa do [Node.js](https://nodejs.org). Na pasta do projeto:

```bash
node serve.js
```

Depois abra http://localhost:8123 no Chrome ou no Edge (computador).

## Controles (Mênfis)

| Tecla | Ação |
|---|---|
| Setas / WASD | mover (relativo à câmera) |
| Shift | correr / nadar forte |
| Ctrl | caminhar devagar |
| Espaço | pular |
| E | conversar |
| P / R | pegar-soltar / usar-comer objetos |
| C | manhã · tarde · noite |
| J / K / M | diário · coleção de artefatos · mapa |
| Mouse (arrastar) e roda | câmera e zoom |

## Publicar

Antes de cada envio ao GitHub, carimbe uma versão nova (faz o navegador de quem joga buscar os arquivos novos em vez de usar o cache):

```bash
node tools/versao.mjs
```

## Estrutura

- `index.html`, `css/home.css`, `js/home.js` — tela de entrada e escolha da cidade
- `egito.html`, `css/game.css`, `js/egito/` — Mênfis (Three.js r160 via CDN, sem etapa de build)
- `assets/textures/` — texturas fotográficas PBR
- `assets/models/` — personagens e animações
- `serve.js` — servidor local sem dependências

## Créditos e licenças

- Texturas: [Poly Haven](https://polyhaven.com) — CC0
- Personagens e animações: [Mixamo](https://www.mixamo.com) (Adobe) — explorador e moradores, com animações de captura de movimento; versões anteriores usaram a Universal Animation Library da [Quaternius](https://quaternius.com) (CC0)
- Cabeça escaneada "Infinite, 3D Head Scan" de Lee Perry-Smith (Infinite Realities), via repositório do three.js — [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)
- Esculturas e barcos: [Sketchfab](https://sketchfab.com), licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — ["Great Sphinx of Giza"](https://sketchfab.com/3d-models/47ee84fca9b44664a2ccb166a21e4c02) de afarokhyans, ["Egyptian-style sphinx statue"](https://sketchfab.com/3d-models/9003a8376d7444bfb435391333116ef7) de sofianasopoulou, ["Anubis"](https://sketchfab.com/3d-models/ccdb1d12838040d49d31091d25426631) de milan.varcholak, ["Anubis"](https://sketchfab.com/3d-models/5dff8f89fae54c229ac0641a9f57dba4) (deitado) de pankras, ["Egyptian Boat"](https://sketchfab.com/3d-models/e1fe51efcfaf4c0da17b9ccd505691f5) de anybody, ["PHARAOH’S CHAIR"](https://sketchfab.com/3d-models/a7316164ed2543aeb2b729195f166930) de rp02908, ["Egyptian Ship"](https://sketchfab.com/3d-models/aefb6d69d12c41eda806350f419cb81f) de frankestudios71, ["Egyptien antique ship"](https://sketchfab.com/3d-models/54dd11bb83fc479fa0c6c713629300d2) de pandrianoff, ["Mississippi Alligator (Animated, downloadable)"](https://sketchfab.com/3d-models/f0cc55fd5e4448e6bbd2ee65b2f1ea66) de andrey. (o crocodilo do Nilo, sem o cenário), ["Animated Realistic Donkey – 3D Animal Model"](https://sketchfab.com/3d-models/32ce1c2f276a4e27bb26b8bb99439bb7) de AnimalMesh3D e ["Fedora Hat"](https://sketchfab.com/3d-models/bff84a883a65460790e186bfb63f7581) de denj666; reduzidos e recoloridos para o jogo
- Atenas — modelos do Sketchfab, licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): ["Athena State Model_ Smoothed"](https://sketchfab.com/3d-models/d45809fef4554f9397a3360b8d9b9130) de jiayi.hou, ["Athena Promachos"](https://sketchfab.com/3d-models/5e758cdc4898461886b81a8b232dde74) de Avramidoum, ["Parthenon Sculptures East Pediment"](https://sketchfab.com/3d-models/805b4bec22c54c78bb6ef0124e8695b8) de artfletch, ["Trireme"](https://sketchfab.com/3d-models/819cbb5ad54646c191b1ed1f8ced9b5e) de agt14032013, ["Uluburun, Bronze Age Merchant - Stormworks"](https://sketchfab.com/3d-models/9208d2cc50214a4aad3c8fc137050292) de ThalesMML, ["Wooden Boat"](https://sketchfab.com/3d-models/627ba38e06aa4536b90706a8626c74d4) de donnichols, ["Fantasy Fishing Boat"](https://sketchfab.com/3d-models/bf7d68cb9db5469a9895064de1499d68) de E.A.Cornell, ["PBR Corinthian Helmet"](https://sketchfab.com/3d-models/793a3eb779454e8db5552ac934f20098) de timothyhsu, ["Old olive tree"](https://sketchfab.com/3d-models/6328df8a0f214143a880a72b86db2ab4) de greg-l, ["Cypress tree"](https://sketchfab.com/3d-models/249d8cb553a8469e9d645713f8e96ed1) de ElectroNick, ["Marble Kouros"](https://sketchfab.com/3d-models/b9ba76d670ec4e95b88e45d1e9f0a981) de moshecaine, ["Marble Statue of a Lion"](https://sketchfab.com/3d-models/d5131a4f3cad4e2ea93be4d0231072da) de cachgill, ["Greek Amphoras_Set 02"](https://sketchfab.com/3d-models/e114a15c0857459786e351d8a39f7036) de intervirtual, ["GREEK JAR"](https://sketchfab.com/3d-models/f8d95e9ae0324e69b257a5e50adeca0e) de Davide.Specchi; em domínio público (CC0): ["Doryphoros"](https://sketchfab.com/3d-models/5647b4e28f1a41b0a47774361dd69ab7) de smkmuseum, ["Zeus or Poseidon from the Artemision"](https://sketchfab.com/3d-models/d4876aa609304682945145debedfc77e) de smkmuseum, ["Discobolus"](https://sketchfab.com/3d-models/50f50abf45414ad8a658325df7a5fcb3) de smkmuseum, ["Kore dressed in chiton and cape"](https://sketchfab.com/3d-models/185f351f4d1249749b4c88b0d2c27511) de smkmuseum, ["1970.16 Neck Amphora"](https://sketchfab.com/3d-models/0bb2525bdd734bf69d5a7b2b051928ad) de clevelandart. Vida marinha (CC BY 4.0): ["School of Herring"](https://sketchfab.com/3d-models/9805dabc1d3f4cc1a09367fb5afad980) de radiator, ["Bream Fish ( Dorade Royale)"](https://sketchfab.com/3d-models/a3d0e1a597794a9bb74739a13cfc8b77) de BlueMesh, ["Game-Ready dolphin (Swimming)"](https://sketchfab.com/3d-models/b621ec8894734bc79c04338edff3cd0d) de Allie2k, ["Sea Turtle Lowpoly Animated"](https://sketchfab.com/3d-models/ea29d144296245c4bab3484575f2ffca) de kenchoo, ["jellyfish"](https://sketchfab.com/3d-models/d06a5a553fe641ab92f720527b2278f3) de yanix, ["Marine-Encrusted Amphora – Lefkada"](https://sketchfab.com/3d-models/4cf47b5d96b949f5bb1a12205676ed95) de iedu360.eu, ["Starfish"](https://sketchfab.com/3d-models/7f791ca21f494f548e9d6657d6c6507c) de Rigsters. Ruínas no fundo da baía (CC BY 4.0): ["Column drum, Ephesus"](https://sketchfab.com/3d-models/b331680caa9d4024a02509e9198547f6) de danielpett, ["Ionic Marble Column Fragment"](https://sketchfab.com/3d-models/362a1c36dde64c0eac57da4c051ccb81) de iedu360.eu, ["Ionic Capital"](https://sketchfab.com/3d-models/013efb95bcc74ddb8877be527a62b2b2) de GlobalDigitalHeritage e ["Kyrenia"](https://sketchfab.com/3d-models/0a943be6f61640009f348cfae32215a5) de agt14032013 (sem vela e mastro, como naufrágio). Montaria (CC BY 4.0): ["Horse"](https://sketchfab.com/3d-models/a6f860e43e364619bccb174a1ac7d0c9) de henry_7 (sem a sela e as ferraduras modernas). Reduzidos e ajustados para o jogo. Texturas novas (mármore, calcário, telhas, areia da praia) também do Poly Haven (CC0).
- Motor 3D: [three.js](https://threejs.org) — MIT
- Conteúdo histórico (diálogos e fichas de artefatos): escrito para o projeto, com base em fatos do Novo Império egípcio; reconstruções com liberdades artísticas para a exploração.
