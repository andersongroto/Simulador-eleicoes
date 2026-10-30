# Palanque — simulador de eleição presidencial

Jogo de navegador em que você disputa a Presidência da República do Brasil: monta a chapa, negocia a coligação, faz campanha nos 27 estados, enfrenta sabatina e debates na TV, acompanha as pesquisas e, no fim, assiste à apuração voto a voto, como na noite da eleição.

Todos os candidatos, partidos, governadores e institutos de pesquisa são **fictícios**, com perfis inspirados no cenário político brasileiro.

## Como jogar

Abra o arquivo `index.html` no navegador. Não precisa instalar nada nem ter servidor.

Para publicar na internet, ative o GitHub Pages no repositório (Settings → Pages → branch principal, pasta raiz).

Se preferir um arquivo único para compartilhar, gere com:

```bash
node tools/gerar-arquivo-unico.js        # cria dist/palanque.html
```

## O que tem no jogo

**Configuração**
- Ritmo **semanal** (5 compromissos por semana, ~10 rodadas no total) ou **diário** (2 compromissos por dia, ~69 rodadas).
- Três níveis de dificuldade e eleição em 2026 ou 2030 (o calendário é calculado: 1º turno no primeiro domingo de outubro, 2º turno no último).
- Escolha um dos 8 pré-candidatos prontos ou **crie o seu**: nome, gênero, idade (mínimo de 35 anos, como manda a Constituição), estado de origem, partido, trajetória (ex-governador, juiz, militar, apresentador de TV, líder religioso, sindicalista…), posição ideológica e atributos.

**Pré-campanha**
- Escolha do vice (traz o partido dele para a coligação, se aceitar).
- Negociação com partidos: ideológicos olham afinidade, fisiológicos olham chances e cargos.
- Contratação do marqueteiro e definição de três bandeiras do programa.

**Campanha**
- Mapa do Brasil com estimativas por estado, presença de campanha, eleitorado e palanques de governadores.
- Ações: comícios, carreatas, visitas a públicos específicos (culto evangélico, periferia, associação comercial, feira agropecuária, universidade), entrevistas regionais, campanha digital, jantares de arrecadação, ataques a adversários, lançamento de propostas, preparação para debates, descanso.
- Apoios de governadores e de setores organizados (pastores, centrais sindicais, agronegócio, indústria, artistas, influenciadores, policiais, ambientalistas…).
- Horário eleitoral gratuito com tempo de TV calculado pela bancada da coligação; linha propositiva, de ataque ou de defesa e nível de investimento na produção.
- Dinheiro do fundo eleitoral com teto de gastos, energia do candidato (cansaço gera gafes) e desgaste da imagem.
- Eventos com decisão: fake news, operações da PF contra aliados, desastres naturais, vídeos antigos, crise no mercado, vice polêmico, doações suspeitas, convites para podcast, dossiês, queimadas, greves.
- Pesquisas de quatro institutos fictícios, com margem de erro e viés próprio, rejeição, simulações de 2º turno, pesquisas estaduais e um agregador. Pesquisas internas mostram os números por estado e por perfil de eleitor.
- Sabatina no telejornal e debates em quatro emissoras no 1º turno e duas no 2º, com perguntas de jornalistas, confrontos diretos, réplicas e considerações finais. Partidos sem bancada mínima podem ficar de fora.

**Eleição**
- Apuração animada a partir das 17h, com totalização por estado: capitais primeiro, interior e Norte depois, o que permite viradas ao longo da noite. Placar, mapa, plantão de notícias e aviso de "matematicamente decidido".
- 2º turno com negociação de apoio dos candidatos derrotados. Se você for eliminado, decide quem apoiar e acompanha o resultado.
- Tela final com conquistas, resultado por estado e histórico das pesquisas. O jogo salva automaticamente no navegador.

## Como o eleitorado é simulado

Cada UF tem o eleitorado do TSE e uma inclinação ideológica derivada do 2º turno de 2022. O eleitorado de cada estado é dividido em cinco perfis (evangélicos, classe popular, classe média urbana, agro/interior e jovens), cada um com prioridades de temas diferentes, e cada perfil em cinco faixas ideológicas.

A intenção de voto de cada célula vem de um modelo logit multinomial que soma: proximidade ideológica, credibilidade nos temas que o perfil valoriza, quanto o candidato é conhecido no estado, presença de campanha, apoio do governador e capilaridade da coligação, imagem e desgaste, carisma, reduto eleitoral, aprovação do governo (para o candidato da situação), polarização afetiva e voto útil, que cresce conforme a eleição se aproxima. Brancos, nulos e indecisos também são opções do modelo.

No dia da eleição entra um erro aleatório nacional e por estado, como acontece com as pesquisas de verdade.

## Estrutura

```
index.html            página do jogo
css/estilo.css        visual (tema claro e escuro)
js/dados/             mapa, estados, partidos, candidatos, apoios, propostas e textos
js/nucleo/            regras: modelo de votos, ações, IA, eventos, pesquisas, debates, apuração e turnos
js/ui/                telas
tools/                scripts de teste e calibração em Node
```

Scripts úteis (Node 18+):

```bash
node tools/calibrar.js                         # intenções iniciais por estado
node tools/simular.js 20 helena semanal normal # partidas automáticas para balanceamento
node tools/teste-ui.js capturas helena         # partida completa pela interface (requer Playwright)
```

## Créditos

- Mapa do Brasil: [svg-maps](https://github.com/VictorCazanave/svg-maps) de Victor Cazanave, licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Eleitorado por UF baseado nas estatísticas do TSE (2022).
