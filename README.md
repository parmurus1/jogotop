# Bram e as Cinzas de Vaelgrath

Roguelite de cartas sobre luto e memória. Roda direto no navegador, sem instalar nada:
abra `index.html` (duplo clique) no Chrome, Edge, Firefox ou Safari, no computador ou no celular.

O progresso fica salvo no próprio navegador (memórias, finais, diário e a jornada em andamento).

## Estrutura

| Arquivo | O que faz |
| --- | --- |
| `index.html` | Página única; carrega os scripts na ordem. |
| `css/style.css` | Visual (pixel, VHS) e layout responsivo. |
| `js/util.js` | Aleatoriedade com semente, armazenamento, utilidades de DOM. |
| `js/sprites.js` | Toda a pixel art, desenhada como grades de caracteres. |
| `js/audio.js` | Música, ambiente e efeitos sonoros gerados em código (Web Audio). |
| `js/scene.js` | Cenários em canvas de baixa resolução, efeito de fita VHS e partículas. |
| `js/data/` | Conteúdo: cartas e combos, máscaras, relíquias e Ciclo+, inimigos (com falas e vozes), história, eventos e encontros na trilha. |
| `js/engine.js` | Motor de combate (sem interface): Saco de Almas, Fila, combos, inimigos. |
| `js/game.js` | Configurações, progresso permanente, jornada, mapa e salvamento. |
| `js/ui.js` | Componentes de interface: cartas, HUD, diálogos, modais, dicas. |
| `js/scenery.js` | Cenários únicos: arenas de combate de cada ato, arenas dos chefes, forja, barraca, toca da Dona Marga. |
| `js/cinema.js` | A cena de abertura e as cenas das memórias (filmagem caseira 4:3). |
| `js/lamp.js` | O Lampião como personagem: expressões, sinais ("!", "?", "♥") e reações. |
| `js/screens.js` | Telas gerais: título, abertura, mapa, troca de ato, finais, diário, opções. |
| `js/places.js` | Lugares do mapa como palco com balcão (Ysolde, Tobias, Perpétua, Dona Marga, fogueira), estranhezas, encontros na trilha, memórias e recompensas. |
| `js/battle.js` | Tela de combate (montar a Fila, prévia, animação dos eventos). |
| `js/tutorial.js` | Tutorial do menu inicial. |
| `js/dev.js` | Modo desenvolvedor (Opções → Modo desenvolvedor): cenas, memórias, falas, lutas e ferramentas. Só existe jogando no computador (arquivo aberto direto ou `localhost`); não vai para o site. |

## Como adicionar conteúdo

- **Carta nova:** uma entrada em `CARDS` (`js/data/cards.js`) com `suit`, `art`, `text`, `face` (números e símbolos) e `play(c)`.
  Se ela tiver raridade `comum` ou `rara`, já aparece em recompensas e na loja.
- **Inimigo novo:** uma entrada em `ENEMIES` (`js/data/enemies.js`) com `pattern` de intenções, e o id em `ENEMY_POOLS`.
- **Relíquia nova:** uma entrada em `RELICS` (`js/data/relics.js`) e o efeito onde ele acontece (combate em `engine.js`, fora dele em `game.js`/`places.js`).
- **Encontro na trilha:** uma entrada em `TRAILS` (`js/data/story.js`), com `acts` (em quais atos aparece) e as escolhas.
- **Falas de um inimigo:** `ENEMY_TALK` em `js/data/enemies.js` (voz, frase ao começar, ao apanhar e ao cair).
- **Sprite novo:** uma grade em `ART` (`js/sprites.js`); contorno e sombreamento são automáticos.

## Publicar online (Vercel)

O jogo é um site estático: não tem build nem dependências. Na Vercel:

1. Suba esta pasta para um repositório no GitHub (veja abaixo).
2. Na Vercel, **Add New → Project**, escolha o repositório e clique em **Deploy**.
   Deixe **Framework Preset** como *Other*, sem comando de build e com a pasta de saída em branco (a raiz).
3. Cada `git push` na branch principal publica uma versão nova sozinho.

`vercel.json` cuida dos cabeçalhos (as atualizações de `js/` e `css/` chegam na hora) e `.vercelignore`
deixa a versão antiga, o modo desenvolvedor e este README fora do site. O progresso de quem joga fica no navegador de cada pessoa.

### Primeiro envio para o GitHub

Crie um repositório vazio no GitHub e, nesta pasta:

```bash
git add .
git commit -m "Bram e as Cinzas de Vaelgrath"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

A versão anterior (Ecos da Mata v0.3) está guardada em `versao-antiga/`.
