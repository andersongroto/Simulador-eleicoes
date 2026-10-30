/* Resultado da eleição e simulação da apuração.
 * Os votos de cada UF são divididos em urbanos e rurais: as urnas das capitais e
 * grandes cidades são totalizadas antes, o interior (e o Norte, com urnas transmitidas
 * por satélite) depois. Por isso a liderança parcial pode virar ao longo da noite. */

function gerarErroEleicao(ids) {
  var erro = { nac: {}, uf: {} };
  ids.forEach(function (id) {
    erro.nac[id] = randn() * 0.06;
    erro.uf[id] = {};
    UFS.forEach(function (uf) { erro.uf[id][uf] = randn() * 0.05; });
  });
  return erro;
}

function calcularResultado(jogo, turno) {
  var ids = candidatosAtivos(jogo).map(function (c) { return c.id; });
  var dia = turno === 1 ? jogo.cal.eleicao1 : jogo.cal.eleicao2;
  var r = calcularIntencoes(jogo, { modo: turno === 1 ? 'urna' : 'segundo', erro: gerarErroEleicao(ids), seg: true, dia: dia });
  var res = { turno: turno, ids: ids, uf: {}, seg: r.seg, ordemUF: [] };
  var nac = { aptos: 0, comparecimento: 0, brancos: 0, nulos: 0, validos: 0, votos: {} };
  ids.forEach(function (id) { nac.votos[id] = 0; });
  var choque = randn() * 0.012;
  ESTADOS.forEach(function (e) {
    var aptos = Math.round(e.eleitores * 1e6 * (0.995 + rand() * 0.01));
    var turnout = e.uf === 'ZZ' ? 0.36 + randn() * 0.03 : clamp(0.80 + choque + randn() * 0.018 - (e.reg === 'N' ? 0.02 : 0), 0.68, 0.88);
    if (turno === 2) turnout -= 0.012;
    var comp = Math.round(aptos * turnout);
    var dist = r.uf[e.uf];
    var somaCand = 0;
    ids.forEach(function (id) { somaCand += dist[id]; });
    var bnPct = dist.nenhum / (dist.nenhum + somaCand);
    var bn = Math.round(comp * bnPct);
    var brancos = Math.round(bn * (0.34 + rand() * 0.06));
    var nulos = bn - brancos;
    var validos = comp - bn;
    var votos = {}, acum = 0;
    ids.forEach(function (id, i) {
      var v = i === ids.length - 1 ? validos - acum : Math.round(validos * dist[id] / somaCand);
      votos[id] = v; acum += v;
    });
    // divisão urbano/rural a partir dos perfis de eleitor
    var urbAdj = {}, mediaUrb = 0;
    SEG_IDS.forEach(function (g) { mediaUrb += e.seg[g] * SEGMENTOS[g].urbano; });
    SEG_IDS.forEach(function (g) { urbAdj[g] = clamp(SEGMENTOS[g].urbano * e.urb / mediaUrb, 0.02, 0.99); });
    var fracUrb = {};
    ids.forEach(function (id) {
      var u = 0, t = 0;
      SEG_IDS.forEach(function (g) {
        var v = e.seg[g] * r.seg[e.uf][g][id];
        u += v * urbAdj[g]; t += v;
      });
      fracUrb[id] = t > 0 ? u / t : e.urb;
    });
    res.uf[e.uf] = {
      aptos: aptos, comparecimento: comp, abstencao: aptos - comp, brancos: brancos, nulos: nulos, validos: validos,
      votos: votos, fracUrb: fracUrb, urb: e.urb,
      tempo: gerarTempoUF(e)
    };
    nac.aptos += aptos; nac.comparecimento += comp; nac.brancos += brancos; nac.nulos += nulos; nac.validos += validos;
    ids.forEach(function (id) { nac.votos[id] += votos[id]; });
  });
  nac.abstencao = nac.aptos - nac.comparecimento;
  res.nac = nac;
  res.ordem = ids.slice().sort(function (a, b) { return nac.votos[b] - nac.votos[a]; });
  res.pct = {};
  ids.forEach(function (id) { res.pct[id] = nac.votos[id] / nac.validos * 100; });
  // participação por segmento (para transferência de votos no 2º turno)
  var seg = {};
  ESTADOS.forEach(function (e) {
    seg[e.uf] = {};
    SEG_IDS.forEach(function (g) {
      seg[e.uf][g] = {};
      ids.forEach(function (id) { seg[e.uf][g][id] = r.seg[e.uf][g][id]; });
    });
  });
  res.seg = seg;
  return res;
}

function logistica(t, t50, w) { return 1 / (1 + Math.exp(-(t - t50) / w)); }
function progressoCurva(t, t50, w) {
  if (t <= 0) return 0;
  var l0 = logistica(0, t50, w);
  var p = (logistica(t, t50, w) - l0) / (1 - l0);
  if (t >= t50 + 7 * w) return 1;
  return clamp(p, 0, 1);
}

var FIM_APURACAO = 330; // minutos após as 17h

/* Estado parcial da apuração no minuto t (0 = 17h, horário de Brasília). */
function apuracaoParcial(res, t) {
  var ids = res.ids;
  var nac = { comparecimento: 0, validos: 0, brancos: 0, nulos: 0, votos: {}, contado: 0 };
  ids.forEach(function (id) { nac.votos[id] = 0; });
  var porUF = {};
  UFS.forEach(function (uf) {
    var u = res.uf[uf], tm = u.tempo;
    var pU = t >= FIM_APURACAO ? 1 : progressoCurva(t, tm.tU, tm.wU);
    var pR = t >= FIM_APURACAO ? 1 : progressoCurva(t, tm.tR, tm.wR);
    var o = { votos: {}, validos: 0, comp: 0 };
    ids.forEach(function (id) {
      var v = u.votos[id];
      var vu = v * u.fracUrb[id], vr = v - vu;
      var c = vu * pU + vr * pR;
      o.votos[id] = c; o.validos += c;
    });
    var bnU = (u.brancos + u.nulos) * u.urb;
    var bnC = bnU * pU + (u.brancos + u.nulos - bnU) * pR;
    var compU = u.comparecimento * u.urb;
    o.comp = compU * pU + (u.comparecimento - compU) * pR;
    o.pct = o.comp / u.comparecimento * 100;
    o.bn = bnC;
    porUF[uf] = o;
    nac.comparecimento += o.comp;
    nac.validos += o.validos;
    nac.brancos += bnC * (u.brancos / Math.max(1, u.brancos + u.nulos));
    nac.nulos += bnC * (u.nulos / Math.max(1, u.brancos + u.nulos));
    ids.forEach(function (id) { nac.votos[id] += o.votos[id]; });
  });
  nac.pctApurado = nac.comparecimento / res.nac.comparecimento * 100;
  nac.ordem = ids.slice().sort(function (a, b) { return nac.votos[b] - nac.votos[a]; });
  nac.pct = {};
  ids.forEach(function (id) { nac.pct[id] = nac.validos > 0 ? nac.votos[id] / nac.validos * 100 : 0; });
  nac.restante = res.nac.validos - nac.validos;
  nac.situacao = situacaoMatematica(res, nac);
  return { nac: nac, uf: porUF };
}

/* Define quando o resultado está matematicamente decidido. */
function situacaoMatematica(res, nac) {
  var o = nac.ordem, rest = Math.max(0, nac.restante) * 1.02;
  var totalMin = nac.validos + rest;
  if (nac.validos <= 0) return null;
  var lider = nac.votos[o[0]];
  if (lider > totalMin / 2) return { tipo: 'eleito', id: o[0] };
  if (res.turno === 1 && o.length > 2) {
    var ninguem = o.every(function (id) { return nac.votos[id] + rest <= totalMin / 2; });
    var segundoGarantido = nac.votos[o[1]] > nac.votos[o[2]] + rest;
    if (ninguem && segundoGarantido) return { tipo: 'segundoTurno', ids: [o[0], o[1]] };
  }
  return null;
}
