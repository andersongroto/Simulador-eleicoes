/* Partidos fictícios, com perfis inspirados no sistema partidário brasileiro.
 * ideo: posição ideológica (-100 … +100)
 * bancada: deputados federais (define tempo de TV e acesso a debates)
 * fundo: R$ milhões que o partido destina a uma candidatura presidencial própria
 * forca: capilaridade por região (prefeitos, vereadores, máquina partidária), 0 a 1
 * fisio: fisiologismo — quanto o partido negocia por espaço/viabilidade em vez de afinidade
 * pauta: tema que o partido cobra no programa de governo */
var PARTIDOS = [
  { sigla: 'FPT', nome: 'Frente Popular Trabalhista', numero: 14, ideo: -52, bancada: 70, fundo: 92, fisio: 0.2, pauta: 'social',
    forca: { N: 0.5, NE: 0.9, CO: 0.3, SE: 0.5, S: 0.35, EX: 0.4 } },
  { sigla: 'PCN', nome: 'Partido Conservador Nacional', numero: 21, ideo: 66, bancada: 92, fundo: 96, fisio: 0.35, pauta: 'seguranca',
    forca: { N: 0.6, NE: 0.3, CO: 0.8, SE: 0.6, S: 0.7, EX: 0.4 } },
  { sigla: 'MDN', nome: 'Movimento Democrático Nacional', numero: 16, ideo: 10, bancada: 45, fundo: 72, fisio: 0.8, pauta: 'saude',
    forca: { N: 0.6, NE: 0.6, CO: 0.5, SE: 0.5, S: 0.6, EX: 0.2 } },
  { sigla: 'PSN', nome: 'Partido Social Nacional', numero: 56, ideo: 20, bancada: 45, fundo: 66, fisio: 0.85, pauta: 'economia',
    forca: { N: 0.5, NE: 0.5, CO: 0.5, SE: 0.6, S: 0.55, EX: 0.2 } },
  { sigla: 'UNI', nome: 'União Nacional', numero: 46, ideo: 35, bancada: 58, fundo: 100, fisio: 0.8, pauta: 'economia',
    forca: { N: 0.6, NE: 0.55, CO: 0.6, SE: 0.4, S: 0.3, EX: 0.2 } },
  { sigla: 'PPR', nome: 'Partido Progressista Republicano', numero: 19, ideo: 45, bancada: 48, fundo: 60, fisio: 0.85, pauta: 'economia',
    forca: { N: 0.5, NE: 0.5, CO: 0.6, SE: 0.4, S: 0.6, EX: 0.1 } },
  { sigla: 'RNV', nome: 'Renovação Nacional', numero: 28, ideo: 50, bancada: 42, fundo: 52, fisio: 0.6, pauta: 'costumes',
    forca: { N: 0.5, NE: 0.4, CO: 0.4, SE: 0.6, S: 0.3, EX: 0.2 } },
  { sigla: 'PSDN', nome: 'Partido da Social Democracia Nacional', numero: 48, ideo: 15, bancada: 14, fundo: 36, fisio: 0.5, pauta: 'educacao',
    forca: { N: 0.2, NE: 0.2, CO: 0.4, SE: 0.5, S: 0.4, EX: 0.3 } },
  { sigla: 'PSR', nome: 'Partido Socialista Renovador', numero: 41, ideo: -30, bancada: 15, fundo: 40, fisio: 0.5, pauta: 'educacao',
    forca: { N: 0.3, NE: 0.6, CO: 0.2, SE: 0.3, S: 0.2, EX: 0.2 } },
  { sigla: 'PTD', nome: 'Partido Trabalhista Democrático', numero: 17, ideo: -30, bancada: 18, fundo: 38, fisio: 0.5, pauta: 'economia',
    forca: { N: 0.3, NE: 0.5, CO: 0.2, SE: 0.3, S: 0.4, EX: 0.2 } },
  { sigla: 'PLS', nome: 'Partido Liberdade e Socialismo', numero: 51, ideo: -80, bancada: 13, fundo: 26, fisio: 0.05, pauta: 'ambiente',
    forca: { N: 0.2, NE: 0.2, CO: 0.1, SE: 0.4, S: 0.3, EX: 0.4 } },
  { sigla: 'AVANÇA', nome: 'Partido Avança', numero: 31, ideo: 55, bancada: 5, fundo: 18, fisio: 0.05, pauta: 'economia',
    forca: { N: 0.1, NE: 0.1, CO: 0.2, SE: 0.4, S: 0.4, EX: 0.4 } },
  { sigla: 'PEB', nome: 'Partido Ecológico Brasileiro', numero: 42, ideo: -25, bancada: 6, fundo: 15, fisio: 0.4, pauta: 'ambiente',
    forca: { N: 0.2, NE: 0.1, CO: 0.1, SE: 0.2, S: 0.2, EX: 0.3 } },
  { sigla: 'MPT', nome: 'Movimento Pátria', numero: 38, ideo: 85, bancada: 3, fundo: 9, fisio: 0.1, pauta: 'seguranca',
    forca: { N: 0.2, NE: 0.1, CO: 0.3, SE: 0.2, S: 0.2, EX: 0.2 } },
  { sigla: 'PCR', nome: 'Partido Comunista Revolucionário', numero: 66, ideo: -92, bancada: 0, fundo: 4, fisio: 0.0, pauta: 'social',
    forca: { N: 0.05, NE: 0.05, CO: 0.05, SE: 0.1, S: 0.05, EX: 0.1 } },
  { sigla: 'SDB', nome: 'Solidariedade Democrática Brasileira', numero: 72, ideo: 0, bancada: 5, fundo: 18, fisio: 0.9, pauta: 'economia',
    forca: { N: 0.2, NE: 0.3, CO: 0.2, SE: 0.3, S: 0.2, EX: 0.1 } },
  { sigla: 'PRC', nome: 'Partido da Reconstrução', numero: 26, ideo: 25, bancada: 8, fundo: 20, fisio: 0.9, pauta: 'seguranca',
    forca: { N: 0.3, NE: 0.3, CO: 0.3, SE: 0.2, S: 0.2, EX: 0.1 } }
];

var PARTIDO_POR_SIGLA = {};
PARTIDOS.forEach(function (p) { PARTIDO_POR_SIGLA[p.sigla] = p; });

/* Rótulo ideológico usado pela imprensa. */
function rotuloIdeologia(x) {
  if (x <= -70) return 'Extrema-esquerda';
  if (x <= -35) return 'Esquerda';
  if (x <= -12) return 'Centro-esquerda';
  if (x < 12) return 'Centro';
  if (x < 35) return 'Centro-direita';
  if (x < 70) return 'Direita';
  return 'Extrema-direita';
}
