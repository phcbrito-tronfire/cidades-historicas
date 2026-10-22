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
- Motor 3D: [three.js](https://threejs.org) — MIT
- Conteúdo histórico (diálogos e fichas de artefatos): escrito para o projeto, com base em fatos do Novo Império egípcio; reconstruções com liberdades artísticas para a exploração.
