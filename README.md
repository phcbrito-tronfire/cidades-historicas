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
- Esculturas e barcos: [Sketchfab](https://sketchfab.com), licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — ["Great Sphinx of Giza"](https://sketchfab.com/3d-models/47ee84fca9b44664a2ccb166a21e4c02) de afarokhyans, ["Egyptian-style sphinx statue"](https://sketchfab.com/3d-models/9003a8376d7444bfb435391333116ef7) de sofianasopoulou, ["Anubis"](https://sketchfab.com/3d-models/ccdb1d12838040d49d31091d25426631) de milan.varcholak, ["Anubis"](https://sketchfab.com/3d-models/5dff8f89fae54c229ac0641a9f57dba4) (deitado) de pankras, ["Egyptian Boat"](https://sketchfab.com/3d-models/e1fe51efcfaf4c0da17b9ccd505691f5) de anybody, ["PHARAOH’S CHAIR"](https://sketchfab.com/3d-models/a7316164ed2543aeb2b729195f166930) de rp02908, ["Egyptian Ship"](https://sketchfab.com/3d-models/aefb6d69d12c41eda806350f419cb81f) de frankestudios71, ["Egyptien antique ship"](https://sketchfab.com/3d-models/54dd11bb83fc479fa0c6c713629300d2) de pandrianoff e ["Fedora Hat"](https://sketchfab.com/3d-models/bff84a883a65460790e186bfb63f7581) de denj666; reduzidos e recoloridos para o jogo
- Motor 3D: [three.js](https://threejs.org) — MIT
- Conteúdo histórico (diálogos e fichas de artefatos): escrito para o projeto, com base em fatos do Novo Império egípcio; reconstruções com liberdades artísticas para a exploração.
