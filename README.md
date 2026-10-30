# Palanque — simulador eleitoral brasileiro (versão 2.0)

Jogo de navegador em que você disputa uma eleição geral no Brasil. Escolha o cargo — **presidente, governador, senador, deputado federal ou deputado estadual** —, monte a chapa, negocie apoios, faça campanha, enfrente debates na TV, acompanhe as pesquisas e, no fim, assista à apuração de todos os cargos voto a voto, como na noite da eleição.

Todos os candidatos, partidos, governadores e institutos de pesquisa são **fictícios**, com perfis inspirados no cenário político brasileiro. Os candidatos das disputas estaduais são gerados automaticamente a cada partida.

## Como jogar

Abra o arquivo `index.html` no navegador. Não precisa instalar nada nem ter servidor.

Para publicar na internet, ative o GitHub Pages no repositório (Settings → Pages → branch principal, pasta raiz).

Se preferir um arquivo único para compartilhar, gere com:

```bash
node tools/gerar-arquivo-unico.js        # cria dist/palanque.html
```

## Novidades da 2.0

- **Cinco cargos jogáveis.** Na configuração você escolhe o cargo e, nas disputas estaduais, o estado da candidatura. Todas as eleições (presidente, 27 governos, Senado, Câmara e 27 assembleias) acontecem ao mesmo tempo, com candidatos controlados pela IA.
- **Campanha estadual.** O estado é dividido em capital/região metropolitana e interior, cada um com presença de campanha, reconhecimento e perfis de eleitor próprios. Ações específicas por cargo: corpo a corpo, rádios e TVs locais, visitas a públicos, ato com o presidenciável, dobradinha, negociação com prefeitos e setores.
- **Voto casado.** Eleitores de um presidenciável tendem a votar nos candidatos do palanque dele nos estados. Quem disputa um cargo estadual escolhe a qual presidenciável se aliar (ou fica neutro).
- **Palanques para quem disputa a Presidência.** Na pré-campanha, lance candidatos do seu partido a governador em estados-chave; durante a campanha, acompanhe os governadores aliados, faça comícios conjuntos e repasse recursos.
- **Deputados com as regras reais.** Quociente eleitoral, quociente partidário, exigência de votação mínima do candidato (10% do QE na distribuição inicial, 20% nas sobras), partidos com 80% do QE nas sobras, terceira fase entre todos os partidos, lista aberta e puxadores de voto. Seu concorrente direto é o colega de partido.
- **Senado.** Em 2026 são duas vagas por estado (cada eleitor vota em dois); em 2030, uma.
- **Apuração de todos os cargos**, em abas: presidente, governador, Senado, Câmara, Assembleia e mapa dos governos estaduais.
- **Novo Congresso.** A tela final mostra o hemiciclo da Câmara e do Senado, os partidos barrados pela cláusula de desempenho, o mapa dos governadores eleitos e o tamanho da base do novo presidente.

## O que tem no jogo

**Configuração**
- Cargo, estado da candidatura (para cargos estaduais), ritmo **semanal** (5 compromissos por semana) ou **diário** (2 compromissos por dia), três níveis de dificuldade e eleição em 2026 ou 2030.
- Para presidente, escolha um dos 8 pré-candidatos prontos ou **crie o seu**. Para os demais cargos, crie o candidato ou sorteie um perfil (idade mínima de cada cargo respeitada).

**Pré-campanha**
- Presidente: vice, coligação, palanques nos estados, marqueteiro e programa.
- Governador: vice, coligação, marqueteiro, presidenciável apoiado e programa.
- Senador: coligação, marqueteiro, presidenciável apoiado e programa.
- Deputados: dobradinha (com um candidato do partido a outro cargo), marqueteiro, presidenciável apoiado e programa.

**Campanha**
- Presidente: mapa do Brasil com estimativas por estado, presença de campanha, eleitorado e palanques; comícios, carreatas, visitas a públicos específicos, entrevistas regionais, campanha digital, arrecadação, ataques, propostas, preparação para debates e descanso.
- Cargos estaduais: painel do estado com capital e interior, projeção da disputa (para deputados, a lista do partido e a projeção de cadeiras), adversários e a eleição presidencial no estado.
- Apoios de governadores, prefeitos e setores organizados (pastores, centrais sindicais, agronegócio, indústria, artistas, influenciadores, policiais, ambientalistas…).
- Horário eleitoral gratuito com tempo de TV calculado pela bancada da coligação; linha propositiva, de ataque ou de defesa.
- Dinheiro do fundo eleitoral com teto de gastos por cargo, energia do candidato (cansaço gera gafes) e desgaste da imagem.
- Eventos com decisão: fake news, operações da PF, desastres naturais, vídeos antigos, crise no mercado, doações suspeitas, convites para podcast, dossiês, greves e, para deputados, disputas dentro da lista do partido.
- Pesquisas de institutos fictícios, com margem de erro e viés próprio, rejeição e simulações de 2º turno, nacionais e estaduais.
- Sabatina e debates na TV para presidente, governador e Senado, no 1º e no 2º turno.

**Eleição**
- Apuração animada a partir das 17h, com totalização por estado: capitais primeiro, interior e Norte depois, o que permite viradas ao longo da noite.
- 2º turno para presidente e governador. Se você for eliminado, decide quem apoiar; se já estiver eleito ou derrotado, pode acompanhar o resto da noite.
- Tela final com conquistas, seu resultado, o novo Congresso, os governadores eleitos e o histórico das pesquisas. O jogo salva automaticamente no navegador.

## Como o eleitorado é simulado

Cada UF tem o eleitorado do TSE e uma inclinação ideológica derivada do 2º turno de 2022. O eleitorado de cada estado é dividido em cinco perfis (evangélicos, classe popular, classe média urbana, agro/interior e jovens), cada um com prioridades de temas diferentes, e cada perfil em cinco faixas ideológicas.

A intenção de voto de cada célula vem de um modelo logit multinomial que soma: proximidade ideológica, credibilidade nos temas que o perfil valoriza, quanto o candidato é conhecido, presença de campanha, apoios e capilaridade da coligação, imagem e desgaste, carisma, reduto eleitoral, aprovação do governo (para candidatos da situação), polarização afetiva e voto útil, que cresce conforme a eleição se aproxima. Brancos, nulos e indecisos também são opções do modelo.

Nas disputas estaduais o mesmo modelo é aplicado separadamente à capital e ao interior, com um termo de voto casado que usa a intenção de voto presidencial de cada perfil. Para deputados, primeiro se calcula o voto de cada partido no estado (calibrado pelas bancadas atuais) e depois a divisão desses votos dentro da lista; os seus votos dependem do seu reconhecimento, presença, apoios e perfil.

No dia da eleição entra um erro aleatório nacional e por estado, como acontece com as pesquisas de verdade.

## Estrutura

```
index.html            página do jogo
css/estilo.css        visual (tema claro e escuro)
js/dados/             mapa, estados, partidos, candidatos, cargos, nomes, apoios, propostas e textos
js/nucleo/            regras: modelo de votos, ações, IA, eventos, pesquisas, debates, apuração, turnos,
                      disputas estaduais, sistema proporcional e resultados
js/ui/                telas
tools/                scripts de teste e calibração em Node
```

Scripts úteis (Node 18+):

```bash
node tools/calibrar.js                                  # intenções iniciais por estado
node tools/simular.js 20 helena semanal normal          # partidas automáticas (presidente)
node tools/simular.js 10 depfed semanal normal BA       # cargo: governador, senador, depfed ou depest + UF
node tools/diag-estados.js                              # resumo das disputas estaduais de uma partida
node tools/teste-ui.js capturas helena                  # partida completa pela interface (requer Playwright)
node tools/teste-ui.js capturas governador diario PE    # idem, para um cargo estadual
```

## Créditos

- Mapa do Brasil: [svg-maps](https://github.com/VictorCazanave/svg-maps) de Victor Cazanave, licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Eleitorado por UF baseado nas estatísticas do TSE (2022). Vagas da Câmara e das assembleias pela distribuição em vigor.
