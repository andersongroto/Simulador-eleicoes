/* Resultados de governador, Senado, Câmara e assembleias, e composição do novo Congresso. */

function gerarTempoUF(e) {
  var regAtraso = { N: 38, NE: 18, CO: 10, SE: 0, S: 0, EX: 0 }[e.reg];
  var tU = e.uf === 'ZZ' ? 190 : 52 + 11 * Math.log(1 + e.eleitores) + randn() * 8;
  var tR = e.uf === 'ZZ' ? 210 : tU + 24 + regAtraso + randn() * 7;
  return { tU: tU, tR: tR, wU: 16 + rand() * 4, wR: 20 + rand() * 6 };
}

function comparecimentoUF(jogo, uf, turno) {
  var r = turno === 2 && jogo.resultado2 ? jogo.resultado2 : jogo.resultado1;
  if (r && r.uf[uf]) return r.uf[uf].comparecimento * (turno === 2 && !jogo.resultado2 ? 0.985 : 1);
  return Math.round(ESTADO_POR_UF[uf].eleitores * 1e6 * 0.79);
}

function erroCands(ids, sd) { var e = {}; ids.forEach(function (id) { e[id] = randn() * sd; }); return e; }

function resultadoMajoritario(jogo, uf, cargo, turno, ids) {
  var r = intencoesEstadual(jogo, uf, cargo, { modo: turno === 2 ? 'segundo' : 'urna', ids: ids, erro: erroCands(ids || candsDisputa(jogo, uf, cargo).map(function (c) { return c.id; }), 0.08), dia: turno === 2 ? jogo.cal.eleicao2 : jogo.cal.eleicao1 });
  var cel = celulasEstado(uf);
  var comp = comparecimentoUF(jogo, uf, turno);
  var vagas = cargo === 'senador' ? disputa(jogo, uf, cargo).vagas : 1;
  var somaCand = soma(r.ids.map(function (id) { return r.total[id]; }));
  var bnPct = r.total.nenhum / (r.total.nenhum + somaCand);
  var bn = Math.round(comp * vagas * bnPct);
  var validos = comp * vagas - bn;
  var votos = {}, fracMetro = {}, pct = {};
  r.ids.forEach(function (id) {
    votos[id] = Math.round(validos * r.total[id] / somaCand);
    fracMetro[id] = r.total[id] > 0 ? r.zona.metro[id] * cel.zonaPeso.metro / r.total[id] : FRACAO_METRO[uf];
  });
  var tot = soma(r.ids.map(function (id) { return votos[id]; }));
  r.ids.forEach(function (id) { pct[id] = votos[id] / tot * 100; });
  var ordem = r.ids.slice().sort(function (a, b) { return votos[b] - votos[a]; });
  return { uf: uf, cargo: cargo, turno: turno, ids: r.ids, votos: votos, pct: pct, validos: tot, brancosNulos: bn, comparecimento: comp, fracMetro: fracMetro, ordem: ordem, seg: r.seg, vagas: vagas };
}

/* Resultado proporcional de uma casa num estado. */
function resultadoProporcional(jogo, uf, casa, swingNac) {
  var vagas = casa === 'depfed' ? VAGAS_FED[uf] : vagasEstaduais(uf);
  var erro = {};
  PARTIDOS.forEach(function (p) { erro[p.sigla] = randn() * 0.07 + (swingNac[p.sigla] || 0); });
  var j = jogador(jogo);
  var minhaLista = j && j.escopo === 'estadual' && j.cargo === casa && j.uf === uf;
  var pess = minhaLista ? participacaoPessoal(jogo, j) : null;
  var prop = intencoesProporcional(jogo, uf, casa, { erro: erro, pessoal: pess });
  var comp = comparecimentoUF(jogo, uf, 1);
  var cel = celulasEstado(uf);
  var bn = Math.round(comp * prop.total.nenhum);
  var votos = {}, listas = {}, fracMetro = {};
  var dados = jogo.est.ufs[uf].prop;
  var meusVotos = 0;
  PARTIDOS.forEach(function (p) {
    var v = Math.round(comp * prop.total[p.sigla]);
    votos[p.sigla] = v;
    fracMetro[p.sigla] = prop.total[p.sigla] > 0 ? prop.zona.metro[p.sigla] * cel.zonaPeso.metro / prop.total[p.sigla] : FRACAO_METRO[uf];
    var nominal = v * (1 - PARAM_P.LEGENDA);
    var lista;
    if (minhaLista && p.sigla === j.partido) {
      cel.forEach(function (cc) { meusVotos += cc.w * comp * prop.zona[cc.z][p.sigla] * pess[cc.z + cc.g] * (1 - PARAM_P.LEGENDA); });
      meusVotos = Math.round(Math.min(meusVotos, nominal * 0.95));
      var outros = jogo.est.ufs[uf].lista || [];
      var somaP = soma(outros.map(function (o) { return o.peso * Math.exp(randn() * 0.15); })) || 1;
      lista = outros.map(function (o) { return { nome: o.nome, urna: o.urna, numero: o.numero, votos: Math.round((nominal - meusVotos) * o.peso / somaP), traj: o.trajetoria }; });
      lista.push({ nome: j.nome, urna: j.urna, numero: j.numero, votos: meusVotos, jogador: true });
    } else {
      var n = tamanhoLista(p, vagas);
      lista = pesosLista(n, dados.puxador[p.sigla][casa] > 0).map(function (w) { return { votos: Math.round(nominal * w) }; });
    }
    lista.sort(function (a, b) { return b.votos - a.votos; });
    listas[p.sigla] = lista;
  });
  var dist = distribuirCadeiras(votos, listas, vagas);
  var eleitos = dist.eleitos.map(function (el) {
    var cd = el.cand;
    if (!cd.urna) {
      var traj = escolher(TRAJ_POR_CARGO[casa]);
      var pe = gerarPessoa(traj);
      cd.nome = pe.nome; cd.urna = pe.urna; cd.numero = numeroCandidato(jogo, casa, el.sigla, uf);
    }
    return { sigla: el.sigla, nome: cd.nome, urna: cd.urna, numero: cd.numero, votos: cd.votos, via: el.via, jogador: !!cd.jogador };
  });
  var res = { uf: uf, casa: casa, vagas: vagas, votos: votos, validos: dist.validos, brancosNulos: bn, comparecimento: comp, qe: dist.qe,
    cadeiras: dist.cadeiras, eleitos: eleitos, fracMetro: fracMetro };
  if (minhaLista) {
    var lp = listas[j.partido];
    var pos = lp.findIndex(function (x) { return x.jogador; }) + 1;
    var el = eleitos.filter(function (x) { return x.jogador; })[0];
    res.jogador = { votos: meusVotos, posicaoLista: pos, cadeirasPartido: dist.cadeiras[j.partido] || 0, eleito: !!el, via: el ? el.via : null,
      atingiu10: meusVotos >= 0.1 * dist.qe, lista: lp.slice(0, Math.max(10, (dist.cadeiras[j.partido] || 0) + 4)).map(function (x) { return { urna: x.urna || '—', votos: x.votos, jogador: !!x.jogador }; }) };
  }
  return res;
}

function calcularResultadosEstaduais(jogo, turno) {
  if (turno === 1) {
    var res = { gov: {}, sen: {}, depfed: {}, depest: {}, camara: {}, senado: {}, assembleias: {} };
    var swing = {};
    PARTIDOS.forEach(function (p) { swing[p.sigla] = randn() * 0.04; });
    UFS_MAPA.forEach(function (uf) {
      res.gov[uf] = resultadoMajoritario(jogo, uf, 'governador', 1);
      res.sen[uf] = resultadoMajoritario(jogo, uf, 'senador', 1);
      res.depfed[uf] = resultadoProporcional(jogo, uf, 'depfed', swing);
      res.depest[uf] = resultadoProporcional(jogo, uf, 'depest', swing);
    });
    PARTIDOS.forEach(function (p) { res.camara[p.sigla] = 0; res.senado[p.sigla] = jogo.est.senadoContinua[p.sigla] || 0; });
    UFS_MAPA.forEach(function (uf) {
      for (var s in res.depfed[uf].cadeiras) res.camara[s] += res.depfed[uf].cadeiras[s];
      var r = res.sen[uf];
      r.ordem.slice(0, r.vagas).forEach(function (id) { res.senado[jogo.est.cands[id].partido]++; });
      res.assembleias[uf] = res.depest[uf].cadeiras;
    });
    res.clausula = clausulaDesempenho(res);
    jogo.resEst1 = res;
    return res;
  }
  var res2 = { gov: {} };
  (jogo.govSegundo || []).forEach(function (uf) {
    res2.gov[uf] = resultadoMajoritario(jogo, uf, 'governador', 2, candsDisputa(jogo, uf, 'governador').map(function (c) { return c.id; }));
  });
  jogo.resEst2 = res2;
  return res2;
}

/* Cláusula de desempenho (2026 em diante): 2,5% dos votos para a Câmara em 9 UFs com 1,5% em cada,
 * ou 13 deputados federais eleitos em 9 UFs. */
function clausulaDesempenho(res) {
  var tot = 0, porP = {}, ufsP = {}, ufsDep = {};
  PARTIDOS.forEach(function (p) { porP[p.sigla] = 0; ufsP[p.sigla] = 0; ufsDep[p.sigla] = 0; });
  UFS_MAPA.forEach(function (uf) {
    var r = res.depfed[uf];
    PARTIDOS.forEach(function (p) {
      porP[p.sigla] += r.votos[p.sigla];
      if (r.votos[p.sigla] / r.validos >= 0.015) ufsP[p.sigla]++;
      if ((r.cadeiras[p.sigla] || 0) > 0) ufsDep[p.sigla]++;
    });
    tot += r.validos;
  });
  var out = {};
  PARTIDOS.forEach(function (p) {
    var pct = porP[p.sigla] / tot * 100;
    out[p.sigla] = { pct: pct, passou: (pct >= 2.5 && ufsP[p.sigla] >= 9) || (res.camara[p.sigla] >= 13 && ufsDep[p.sigla] >= 9) };
  });
  return out;
}

/* Base provável do presidente eleito: coligação + partidos fisiológicos que aderem ao governo. */
function baseDoPresidente(jogo) {
  var v = candPorId(jogo, jogo.vencedor);
  if (!v || !jogo.resEst1) return null;
  var r = jogo.resEst1;
  var base = PARTIDOS.filter(function (p) { return v.coligacao.indexOf(p.sigla) >= 0 || p.sigla === v.partido || (p.fisio >= 0.6 && Math.abs(p.ideo - v.x) < 85); }).map(function (p) { return p.sigla; });
  var cam = soma(base.map(function (s) { return r.camara[s] || 0; }));
  var sen = soma(base.map(function (s) { return r.senado[s] || 0; }));
  return { partidos: base, camara: cam, senado: sen };
}

/* Após o 1º turno: define os 2º turnos estaduais e encerra as disputas decididas. */
function resolverEstaduaisPrimeiroTurno(jogo) {
  var r = jogo.resEst1;
  jogo.govSegundo = [];
  jogo.est.transf = {};
  UFS_MAPA.forEach(function (uf) {
    var g = r.gov[uf];
    var cands = candsDisputa(jogo, uf, 'governador', true);
    if (g.pct[g.ordem[0]] > 50) {
      cands.forEach(function (c) { c.ativo = false; c.eleito = c.id === g.ordem[0]; });
    } else {
      jogo.govSegundo.push(uf);
      var fin = [g.ordem[0], g.ordem[1]];
      jogo.est.transf[uf] = {};
      fin.forEach(function (id) { jogo.est.transf[uf][id] = []; });
      cands.forEach(function (c) { if (fin.indexOf(c.id) < 0) { c.ativo = false; c.eliminado = true; } });
    }
    candsDisputa(jogo, uf, 'senador', true).forEach(function (c) {
      c.ativo = false;
      c.eleito = r.sen[uf].ordem.slice(0, r.sen[uf].vagas).indexOf(c.id) >= 0;
    });
  });
}

/* Apoios dos eliminados nas disputas de governador. ofertas: { elimId: 'programa'|'cargos' } do jogador. */
function decidirApoioGov(jogo, uf, elim, ofertaJogador) {
  var fins = candsDisputa(jogo, uf, 'governador').map(function (c) { return c.id; });
  var scores = fins.map(function (fid) {
    var f = jogo.est.cands[fid];
    var s = 1 - Math.abs(f.x - elim.x) / 80 - (elim.stats.ataquesRecebidos[fid] || 0) * 0.06;
    if (f.palanque && f.palanque === elim.palanque) s += 0.25;
    if (f.jogador && ofertaJogador) s += ofertaJogador === 'cargos' ? 0.18 : 0.12;
    return s + randn() * 0.12;
  });
  var mx = Math.max.apply(null, scores);
  if (mx < 0.15) return 'neutro';
  if (Math.abs(scores[0] - scores[1]) < 0.06 && chance(0.4)) return 'neutro';
  return fins[scores.indexOf(mx)];
}

function fecharApoiosGovSegundoTurno(jogo) {
  jogo.apoiosGov2 = jogo.apoiosGov2 || {};
  (jogo.govSegundo || []).forEach(function (uf) {
    candsDisputa(jogo, uf, 'governador', true).forEach(function (c) {
      if (!c.eliminado) return;
      var dec = jogo.apoiosGov2[c.id];
      if (dec === undefined || dec === null) dec = jogo.apoiosGov2[c.id] = decidirApoioGov(jogo, uf, c, null);
      if (dec && dec !== 'neutro' && jogo.est.transf[uf][dec]) jogo.est.transf[uf][dec].push(c.id);
    });
    var fins = candsDisputa(jogo, uf, 'governador');
    fins.forEach(function (c) {
      c.tvShare = 0.5;
      c.dinheiro += tetoCargo('governador', uf, 1) * 0.35 * (c.jogador ? DIFICULDADES[jogo.config.dificuldade].dinheiro : 1);
      c.energia = Math.max(c.energia, 75);
      c.preparo = 0;
      ZONAS.forEach(function (z) { c.presenca[z] *= 0.6; });
    });
    var d = disputa(jogo, uf, 'governador');
    var r = intencoesEstadual(jogo, uf, 'governador', { modo: 'segundo' });
    d.percepcao = {};
    r.ids.forEach(function (id) { d.percepcao[id] = r.total[id]; });
  });
  invalidarCacheEstadual(jogo);
}
