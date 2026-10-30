/* Institutos de pesquisa fictícios e geração das pesquisas publicadas. */

var INSTITUTOS = {
  datanacao: { nome: 'DataNação', amostra: 2556, margem: 2, metodo: 'entrevistas presenciais', vies: 0, indecisoExtra: 0 },
  pulso:     { nome: 'Pulso Pesquisas', amostra: 2000, margem: 2.2, metodo: 'entrevistas por telefone', vies: 0, indecisoExtra: 2 },
  vox:       { nome: 'Vox Brasilis', amostra: 3010, margem: 1.8, metodo: 'questionário online', vies: 0.9, indecisoExtra: -1 },
  census:    { nome: 'Instituto Census', amostra: 1204, margem: 2.8, metodo: 'entrevistas presenciais', vies: 0, indecisoExtra: 0 }
};

var UFS_PESQUISA_ESTADUAL = ['SP', 'MG', 'RJ', 'BA', 'PR', 'RS', 'PE', 'CE', 'PA', 'GO', 'SC', 'MA', 'AM', 'ES', 'DF', 'PB', 'MT'];

function pesquisasAgendadas(jogo, dia) {
  var cal = jogo.cal, dow = diaDaSemana(cal, dia), lista = [];
  if (dia < cal.eleicao1) {
    var tracking = dia >= cal.eleicao1 - 4;
    if (dow === 5 || (tracking && dia >= cal.eleicao1 - 3)) lista.push('datanacao');
    if (dow === 2 || dia === cal.eleicao1 - 1) lista.push('pulso');
    if ((dow === 1 && dia >= 6) || dia === cal.eleicao1 - 1) lista.push('vox');
    if (dow === 3 && dia >= 3) lista.push('census');
  } else if (dia > cal.eleicao1 && dia < cal.eleicao2) {
    var tr2 = dia >= cal.eleicao2 - 3;
    if (dia >= cal.eleicao1 + 4) {
      if (dow === 5 || tr2) lista.push('datanacao');
      if (dow === 2 || dia === cal.eleicao2 - 1) lista.push('pulso');
      if (dow === 1 || dia === cal.eleicao2 - 1) lista.push('vox');
      if (dow === 3) lista.push('census');
    }
  }
  return lista.filter(function (v, i, a) { return a.indexOf(v) === i; });
}

function codigoRegistro(jogo) {
  return 'BR-' + String(randInt(1000, 99999)).padStart(5, '0') + '/' + jogo.cal.ano;
}

/* Aplica erro amostral, viés da casa e arredonda como os institutos divulgam. */
function ruidoPesquisa(real, ids, inst, n) {
  var r = {}, tot = 0;
  ids.concat(['nenhum', 'indeciso']).forEach(function (k) {
    var p = real[k] || 0;
    var sd = Math.sqrt(Math.max(p, 0.5) * (100 - p) / n) * 1.1;
    var v = p + randn() * sd;
    if (k === 'indeciso') v += inst.indecisoExtra;
    r[k] = Math.max(0, v);
  });
  return r;
}

function arredondarPesquisa(r) {
  var o = {};
  for (var k in r) o[k] = Math.round(r[k]);
  return o;
}

function gerarPesquisa(jogo, instId, dia) {
  var inst = INSTITUTOS[instId];
  var ids = candidatosAtivos(jogo).map(function (c) { return c.id; });
  var base = jogo._cache || calcularIntencoes(jogo, { dia: dia, rej: true });
  if (!base.rej || !Object.keys(base.rej).length) base = calcularIntencoes(jogo, { dia: dia, rej: true });
  var segundoTurno = jogo.fase === 'campanha2';
  var pesq = {
    dia: dia, instituto: instId, nome: inst.nome, registro: codigoRegistro(jogo),
    amostra: inst.amostra, margem: inst.margem, metodo: inst.metodo, ids: ids, tipo: segundoTurno ? '2t' : '1t'
  };
  if (instId === 'census') {
    // pesquisas estaduais
    var ufs = embaralhar(UFS_PESQUISA_ESTADUAL).slice(0, 3);
    var jog = jogador(jogo);
    if (jog && jog.ativo && chance(0.35) && ufs.indexOf(jog.uf) < 0 && jog.uf !== 'ZZ') ufs[2] = jog.uf;
    pesq.tipo = segundoTurno ? '2t-uf' : 'uf';
    pesq.estados = {};
    ufs.forEach(function (uf) {
      var real = {};
      for (var k in base.uf[uf]) real[k] = base.uf[uf][k];
      pesq.estados[uf] = arredondarPesquisa(ruidoPesquisa(real, ids, inst, 1204));
    });
    return pesq;
  }
  var real = {};
  for (var k in base.nac) real[k] = base.nac[k];
  if (inst.vies) {
    ids.forEach(function (id) {
      var c = candPorId(jogo, id);
      if (c.x > 30) real[id] += inst.vies; else if (c.x < -30) real[id] -= inst.vies;
    });
  }
  pesq.res = arredondarPesquisa(ruidoPesquisa(real, ids, inst, inst.amostra));
  pesq.rej = {};
  ids.forEach(function (id) {
    pesq.rej[id] = Math.round(clamp(base.rej[id] + randn() * 1.5, 1, 90));
  });
  if (!segundoTurno) {
    // cenários de 2º turno: os dois primeiros entre si, e o jogador contra cada um deles
    var ordem = ordenarPor(real, ids);
    var pares = [[ordem[0], ordem[1]]];
    var jg = jogo.jogadorId;
    if (ids.indexOf(jg) >= 0 && ordem.indexOf(jg) > 1) { pares.push([ordem[0], jg]); pares.push([ordem[1], jg]); }
    else if (ordem.length > 2) pares.push([ordem[0], ordem[2]]);
    pesq.cenarios = pares.map(function (par) {
      var r2 = calcularIntencoes(jogo, { dia: dia, ids: par, modo: 'cenario2' });
      var rr = ruidoPesquisa(r2.nac, par, inst, inst.amostra);
      return { a: par[0], b: par[1], va: Math.round(rr[par[0]]), vb: Math.round(rr[par[1]]), bn: Math.round(rr.nenhum + rr.indeciso) };
    });
  }
  return pesq;
}

/* Percepção pública: média das últimas pesquisas nacionais (alimenta o voto útil). */
function atualizarPercepcao(jogo) {
  var nac = jogo.pesquisas.filter(function (p) { return p.res && (jogo.fase !== 'campanha2' ? p.tipo === '1t' : p.tipo === '2t'); }).slice(-3);
  if (!nac.length) return;
  var perc = {};
  candidatosAtivos(jogo).forEach(function (c) {
    var s = 0, n = 0;
    nac.forEach(function (p) { if (p.res[c.id] !== undefined) { s += p.res[c.id]; n++; } });
    perc[c.id] = n ? s / n : 3;
  });
  jogo.percepcao = perc;
}

/* Média ponderada das pesquisas recentes (agregador exibido na interface). */
function agregador(jogo, tipo) {
  var lista = jogo.pesquisas.filter(function (p) { return p.res && p.tipo === tipo; });
  if (!lista.length) return null;
  var ult = lista[lista.length - 1].dia;
  var rec = lista.filter(function (p) { return p.dia >= ult - 8; });
  var res = {}, tot = 0;
  rec.forEach(function (p) {
    var w = INSTITUTOS[p.instituto].amostra / 2000 * Math.pow(0.85, ult - p.dia);
    tot += w;
    for (var k in p.res) res[k] = (res[k] || 0) + p.res[k] * w;
  });
  for (var k2 in res) res[k2] /= tot;
  return res;
}

/* Pesquisa interna da campanha: sem viés, com margem menor, e por perfil de eleitor. */
function pesquisaInterna(jogo, escopo) {
  var base = calcularIntencoes(jogo, { seg: true, rej: true });
  var custo = escopo === 'nacional' ? 0.8 : 0.35;
  var c = jogador(jogo);
  gastar(c, custo);
  var ids = base.ids;
  var res = { escopo: escopo, dia: jogo.dia, ids: ids };
  if (escopo === 'nacional') {
    UFS.forEach(function (uf) { jogo.internas[uf] = jogo.dia; });
    res.nac = arredondarPesquisa(ruidoPesquisa(base.nac, ids, { indecisoExtra: 0 }, 6000));
    res.rej = {};
    ids.forEach(function (id) { res.rej[id] = Math.round(base.rej[id]); });
    // por perfil de eleitor (agregado nacional)
    res.seg = {};
    SEG_IDS.forEach(function (g) {
      var acc = {}, wt = 0;
      ESTADOS.forEach(function (e) {
        var w = e.eleitores * e.seg[g];
        wt += w;
        ids.forEach(function (id) { acc[id] = (acc[id] || 0) + base.seg[e.uf][g][id] * w; });
      });
      ids.forEach(function (id) { acc[id] = Math.round(acc[id] / wt * 100); });
      res.seg[g] = acc;
    });
  } else {
    jogo.internas[escopo] = jogo.dia;
    res.uf = arredondarPesquisa(ruidoPesquisa(base.uf[escopo], ids, { indecisoExtra: 0 }, 3000));
    res.seg = {};
    SEG_IDS.forEach(function (g) {
      var acc = {};
      ids.forEach(function (id) { acc[id] = Math.round(base.seg[escopo][g][id] * 100); });
      res.seg[g] = acc;
    });
  }
  jogo.ultimaInterna = res;
  return res;
}

/* Estimativa da campanha para o mapa: valores reais com ruído que diminui com pesquisas internas recentes. */
function estimativaUF(jogo, uf, id) {
  var base = jogo._cache;
  if (!base || !base.uf[uf]) return 0;
  var real = base.uf[uf][id] || 0;
  var ult = jogo.internas[uf];
  var idade = ult === undefined ? 30 : jogo.dia - ult;
  var sd = idade <= 3 ? 1 : idade <= 10 ? 2.5 : 4.5;
  var ruido = ruidoFixo(jogo.seed + ':' + uf + ':' + id + ':' + Math.floor(jogo.dia / 7)) * sd;
  return Math.max(0, real + ruido);
}
