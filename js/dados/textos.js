/* Textos usados nos debates, sabatinas e manchetes. */

var JORNALISTAS = ['Renata Albuquerque', 'Marcos Uchoa Lima', 'Patrícia Gomes', 'Eduardo Lacerda', 'Carla Vilhena', 'Rodrigo Sasaki'];

var PERGUNTAS_TEMA = {
  economia: [
    'O preço da comida subiu mais que a inflação nos últimos anos. O que {o} {cand} fará, de forma concreta, para baixar o custo do supermercado?',
    'Quatro em cada dez trabalhadores estão na informalidade. Como gerar empregos com carteira assinada sem aumentar o rombo nas contas públicas?',
    'Os juros no Brasil estão entre os mais altos do mundo. Qual será a relação do seu governo com o Banco Central?'
  ],
  social: [
    'Mais de 20 milhões de famílias dependem do Bolsa Família. O programa será mantido, ampliado ou reformulado?',
    'O Brasil voltou a registrar fome em milhões de lares. Qual é a sua meta para tirar o país do Mapa da Fome?'
  ],
  seguranca: [
    'Facções criminosas dominam territórios em várias capitais. O que o governo federal pode fazer que os estados não fazem?',
    'O Brasil tem mais de 40 mil homicídios por ano. Qual é a sua meta de redução e como pretende alcançá-la?'
  ],
  saude: [
    'Milhões de brasileiros esperam meses por uma cirurgia no SUS. Como zerar essas filas?',
    'Faltam médicos no interior e nas periferias. Qual é a sua solução?'
  ],
  educacao: [
    'O Brasil fica nas últimas posições do PISA. O que muda na educação básica no seu governo?',
    'Metade dos jovens não conclui o ensino médio na idade certa. Como manter esses jovens na escola?'
  ],
  corrupcao: [
    'Escândalos de corrupção atingiram todos os grandes partidos. Por que o eleitor deveria confiar no seu?',
    'As emendas parlamentares secretas consomem bilhões do orçamento. {Osenhor} vai acabar com elas?'
  ],
  costumes: [
    'A pauta de costumes divide as famílias brasileiras. Qual é a sua posição sobre aborto e drogas?',
    'Qual é o papel da religião nas decisões de um presidente da República?'
  ],
  ambiente: [
    'O desmatamento na Amazônia virou tema internacional. Como conciliar o agronegócio com a preservação?',
    'Enchentes e secas extremas se tornaram frequentes. Qual é o seu plano para adaptar as cidades à crise climática?'
  ]
};

var ABORDAGENS = {
  proposta: { nome: 'Apresentar uma proposta concreta', desc: 'Pesa gestão e credibilidade no tema.' },
  emocao: { nome: 'Contar uma história pessoal', desc: 'Pesa carisma. Resultado mais variável.' },
  ataque: { nome: 'Usar a resposta para atacar um adversário', desc: 'Pode ferir o rival ou voltar contra você.' },
  desviar: { nome: 'Desviar para a sua bandeira', desc: 'Seguro, mas rende pouco.' }
};

var FALAS_PROPOSTA = {
  economia: ['Vamos zerar os impostos federais da cesta básica e renegociar as dívidas das famílias.', 'Meu plano tem três pontos: crédito barato para pequenas empresas, obras de infraestrutura e juros menores com responsabilidade.'],
  social: ['Nenhuma família vai ficar sem o benefício. Vamos ligar o Bolsa Família a cursos e emprego.', 'Vamos criar a Rede Nacional de Cozinhas Solidárias em todos os municípios com fome.'],
  seguranca: ['Vou criar uma força-tarefa federal permanente para asfixiar o dinheiro das facções.', 'Integração das polícias, inteligência e presídios federais de segurança máxima nas fronteiras.'],
  saude: ['Mutirão nacional: em dois anos, nenhuma cirurgia eletiva vai esperar mais de três meses.', 'Vamos levar especialistas ao interior com telemedicina e policlínicas regionais.'],
  educacao: ['Escola em tempo integral para todos os alunos do ensino médio até o fim do mandato.', 'Bolsa para o estudante que concluir o ensino médio, depositada numa poupança.'],
  corrupcao: ['Vou acabar com as emendas secretas no primeiro mês de governo e dar autonomia total à PF.', 'Transparência em tempo real de cada centavo gasto pelo governo federal.'],
  costumes: ['Vou respeitar a fé de cada brasileiro e governar para todos, sem perseguição a ninguém.', 'A família é a base da sociedade e o Estado deve protegê-la.'],
  ambiente: ['Desmatamento ilegal zero com satélite, polícia e crédito para quem produz preservando.', 'Vamos transformar o Nordeste na maior potência de energia limpa do planeta.']
};

var FALAS_EMOCAO = [
  'Eu sei o que é ver a geladeira vazia. Minha mãe criou cinco filhos sozinha.',
  'Ontem conheci a dona Maria, em Juazeiro, que espera há dois anos por uma cirurgia. É por ela que estou aqui.',
  'Meu pai foi caminhoneiro a vida inteira. Eu aprendi o valor do trabalho em casa.',
  'Quando perdi um amigo para a violência, prometi que faria alguma coisa. Este é o meu compromisso.'
];

var FALAS_DESVIO = [
  'Antes de responder, quero dizer que o meu governo vai ter um foco: {bandeira}.',
  'Essa pergunta é importante, mas o que o brasileiro quer mesmo saber é sobre {bandeira}.'
];

var FALAS_ATAQUE = {
  corrupcao: ['{alvo} fala em ética, mas os aliados dele estão todos na mira da Polícia Federal.', 'O partido de {alvo} protagonizou os maiores escândalos dos últimos anos.'],
  incompetencia: ['{alvo} nunca administrou nem uma padaria e quer governar o Brasil?', 'Quando {alvo} teve a chance de governar, os números pioraram em todas as áreas.'],
  radicalismo: ['{alvo} representa o atraso e o extremismo. O Brasil não aguenta mais ódio.', 'As ideias de {alvo} assustam o investidor, a família e o trabalhador.'],
  promessas: ['{alvo} promete tudo para todos, mas não diz de onde vem o dinheiro.', 'Essa conta de {alvo} não fecha. É promessa de campanha que vira imposto depois.']
};

var CONSIDERACOES = {
  esperanca: { nome: 'Esperança', desc: 'Tom otimista, de futuro.', fala: 'O Brasil tem jeito. No domingo, você pode escolher o caminho da esperança.' },
  indignacao: { nome: 'Indignação', desc: 'Contra tudo o que está aí. Rende mais para a oposição.', fala: 'Chega de tanta injustiça. Está na hora de mudar de verdade.' },
  uniao: { nome: 'União nacional', desc: 'Apelo ao eleitor moderado.', fala: 'Eu quero ser presidente de todos os brasileiros, dos que votam em mim e dos que não votam.' },
  firmeza: { nome: 'Firmeza e autoridade', desc: 'Liderança forte. Agrada conservadores.', fala: 'O Brasil precisa de pulso firme e de quem não tem medo de enfrentar os problemas.' }
};

var RESPOSTAS_CONFRONTO = {
  dados: { nome: 'Responder com dados e propostas', desc: 'Pesa oratória e credibilidade no tema.' },
  devolver: { nome: 'Devolver o ataque', desc: 'Inverte a acusação. Arriscado.' },
  emocao: { nome: 'Responder com emoção', desc: 'Pesa carisma.' },
  desviar: { nome: 'Desconversar', desc: 'Seguro, mas a plateia percebe.' }
};

var REPLICAS = {
  rebater: { nome: 'Rebater com firmeza', desc: 'Contra-argumenta ponto a ponto.' },
  ironia: { nome: 'Usar ironia', desc: 'Pode render a frase da noite ou soar arrogante.' },
  proposta: { nome: 'Voltar à proposta', desc: 'Mostra serenidade.' }
};

var TOMS_PERGUNTA = {
  provocar: { nome: 'Pergunta provocativa', desc: 'Expõe uma fraqueza do rival. Mais risco, mais impacto.' },
  propositiva: { nome: 'Pergunta propositiva', desc: 'Mostra seu domínio do tema.' }
};

var NOTAS_DEBATE = [
  { min: 80, rotulo: 'Excelente', pontos: 4 },
  { min: 63, rotulo: 'Boa', pontos: 2.5 },
  { min: 47, rotulo: 'Regular', pontos: 1 },
  { min: 32, rotulo: 'Fraca', pontos: -0.5 },
  { min: -999, rotulo: 'Desastrosa', pontos: -2.5 }
];

var SABATINA_PERGUNTAS = {
  fraqueza: 'Seu ponto fraco, segundo as pesquisas, é {tema}. Por que o eleitor deveria acreditar que agora será diferente?',
  aliados: 'Sua coligação inclui políticos investigados. Como {osenhor} explica essas alianças?',
  extremo: 'Seus adversários dizem que suas ideias são radicais demais. {Osenhor} governaria para quem não votou em {osenhor}?',
  dinheiro: 'Suas propostas custam bilhões. De onde virá o dinheiro, sem aumentar impostos?',
  experiencia: 'Críticos dizem que lhe falta experiência para governar um país do tamanho do Brasil. O que responde?',
  governo: 'O governo atual tem {aprov}% de aprovação. {Osenhor} defende o que foi feito nos últimos quatro anos?'
};

var SABATINA_OPCOES = {
  direto: { nome: 'Responder com franqueza', desc: 'Reconhece limites e mostra o plano. Pesa integridade e gestão.' },
  evasivo: { nome: 'Responder de forma evasiva', desc: 'Evita o confronto. O apresentador pode insistir.' },
  contra: { nome: 'Questionar a imprensa', desc: 'Inflama a base, mas pode soar autoritário.' }
};
