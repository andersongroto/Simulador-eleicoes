/* Calendário eleitoral. O dia 0 é 16 de agosto, início oficial da campanha.
 * 1º turno: primeiro domingo de outubro. 2º turno: último domingo de outubro. */

var DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
var DIAS_SEMANA_LONGO = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
var MESES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function dataUTC(ano, mes, dia) { return new Date(Date.UTC(ano, mes, dia)); }
function difDias(a, b) { return Math.round((b - a) / 86400000); }

function montarCalendario(ano) {
  var inicio = dataUTC(ano, 7, 16);
  var d1 = dataUTC(ano, 9, 1);
  while (d1.getUTCDay() !== 0) d1 = new Date(d1.getTime() + 86400000);
  var d2 = dataUTC(ano, 9, 31);
  while (d2.getUTCDay() !== 0) d2 = new Date(d2.getTime() - 86400000);
  var e1 = difDias(inicio, d1), e2 = difDias(inicio, d2);
  var cal = {
    ano: ano,
    inicioMs: inicio.getTime(),
    eleicao1: e1,
    eleicao2: e2,
    hgpe1: [e1 - 37, e1 - 3],          // propaganda no rádio e TV (1º turno)
    hgpe2: [e1 + 5, e2 - 2],           // propaganda do 2º turno
    sabatina: e1 - 40,                 // entrevista no telejornal de maior audiência
    fundo2: e1 - 19,                   // segunda parcela do fundo eleitoral
    debates1: [
      { dia: e1 - 35, emissora: 'Rede Horizonte', audiencia: 9 },
      { dia: e1 - 21, emissora: 'TV Cultura Brasil', audiencia: 5 },
      { dia: e1 - 10, emissora: 'Rede Aurora', audiencia: 8 },
      { dia: e1 - 3, emissora: 'TV Nacional', audiencia: 22 }
    ],
    debates2: [
      { dia: e2 - 9, emissora: 'Rede Horizonte', audiencia: 12 },
      { dia: e2 - 2, emissora: 'TV Nacional', audiencia: 28 }
    ]
  };
  return cal;
}

function dataDoDia(cal, dia) { return new Date(cal.inicioMs + dia * 86400000); }
function diaDaSemana(cal, dia) { return dataDoDia(cal, dia).getUTCDay(); }
function fmtData(cal, dia) {
  var d = dataDoDia(cal, dia);
  return DIAS_SEMANA[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + MESES[d.getUTCMonth()];
}
function fmtDataCurta(cal, dia) {
  var d = dataDoDia(cal, dia);
  return ('0' + d.getUTCDate()).slice(-2) + '/' + ('0' + (d.getUTCMonth() + 1)).slice(-2);
}
function fmtDataLonga(cal, dia) {
  var d = dataDoDia(cal, dia);
  return DIAS_SEMANA_LONGO[d.getUTCDay()] + ', ' + d.getUTCDate() + ' de ' + MESES_LONGO[d.getUTCMonth()] + ' de ' + d.getUTCFullYear();
}

/* Divide a campanha de um turno em turnos de jogo (semanas ou dias). */
function montarTurnos(inicio, fimExclusivo, ritmo) {
  var turnos = [];
  if (ritmo === 'diario') {
    for (var d = inicio; d < fimExclusivo; d++) turnos.push([d, d]);
  } else {
    for (var s = inicio; s < fimExclusivo; s += 7) turnos.push([s, Math.min(s + 6, fimExclusivo - 1)]);
  }
  return turnos;
}

function emHGPE(cal, dia) {
  return (dia >= cal.hgpe1[0] && dia <= cal.hgpe1[1]) || (dia >= cal.hgpe2[0] && dia <= cal.hgpe2[1]);
}
