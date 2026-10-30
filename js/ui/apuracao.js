/* Véspera da eleição e apuração dos votos. */

TELAS.vespera = function () {
  var turno = JOGO.fase === 'apuracao1' ? 1 : 2;
  var c = jogador(JOGO);
  var dia = turno === 1 ? JOGO.cal.eleicao1 : JOGO.cal.eleicao2;
  var pres = '';
  if (!JOGO.presDecidido && candidatosAtivos(JOGO).length) {
    var agr = agregador(JOGO, turno === 1 ? '1t' : '2t') || JOGO._cache.nac;
    var ids = ordenarPor(agr, candidatosAtivos(JOGO).map(function (x) { return x.id; }));
    var val = paraValidos(agr, ids);
    pres = '<section class="cartao cartao-corpo pilha"><h2>Presidente: últimas pesquisas</h2><p class="sec">Média das pesquisas até a véspera, em votos válidos.</p>' +
      barrasIntencao(val, ids, { casas: 1 }) + '<p class="mudo pequeno">Pesquisas erram: a margem de erro vale para cada instituto, e eleitores decidem o voto na última hora.</p></section>';
  } else if (JOGO.vencedor) {
    pres = '<section class="cartao cartao-corpo pilha"><h2>Presidente</h2><p>' + esc(candPorId(JOGO, JOGO.vencedor).nome) + ' já foi ' + eleitoA(candPorId(JOGO, JOGO.vencedor)) + ' no 1º turno. Hoje há 2º turno para governador em ' + (JOGO.govSegundo || []).length + ' estados.</p></section>';
  }
  var minha = '';
  if (c.escopo === 'estadual' && c.ativo && (c.cargo === 'governador' || c.cargo === 'senador')) {
    var ult = ultimaPesquisaEst(JOGO, c.uf, c.cargo);
    if (ult) {
      var ids2 = ordenarPor(ult.res, ult.ids.filter(function (id) { return JOGO.est.cands[id].ativo; }));
      minha = '<div><div class="rotulo">Sua disputa: última pesquisa (' + esc(ult.nome) + ')</div>' + barrasIntencao(ult.res, ids2, { extras: [['Branco/nulo', ult.res.nenhum], ['Não sabe', ult.res.indeciso]] }) + '</div>';
    }
  } else if (c.escopo === 'estadual' && c.ativo) {
    var pr = projecaoDeputado(JOGO);
    minha = '<div class="resumo-votos"><div class="it"><span class="rotulo">Seus votos (projeção)</span><span class="v">' + fmtVotos(pr.meus) + '</span></div><div class="it"><span class="rotulo">Posição na lista</span><span class="v">' + pr.rank + 'º</span></div><div class="it"><span class="rotulo">Cadeiras do partido</span><span class="v">' + fmtNum(pr.cadeirasEstimadas, 1) + '</span></div></div>';
  }
  return '<header class="cabecalho-tela gutter"><div style="max-width:1180px;margin:0 auto"><div class="rotulo">' + fmtDataLonga(JOGO.cal, dia) + '</div><h1>Dia da eleição · ' + turno + 'º turno</h1></div></header>' +
    '<main class="container gutter pilha-g"><div class="mesa mesa-plana">' + (pres || '<div></div>') +
    '<section class="cartao cartao-corpo pilha"><h2>' + (c.ativo ? 'Seu dia' : 'A noite da apuração') + '</h2>' +
    (c.ativo ? '<p>Você vota cedo em ' + esc(ESTADO_POR_UF[c.uf].capital) + ', cercad' + oa(c) + ' de apoiadores e câmeras.</p>' : '') + minha +
    '<p class="sec">Às 17h (horário de Brasília) as urnas fecham em todo o país e começa a totalização. As urnas das capitais costumam chegar primeiro; o interior e as regiões mais distantes, depois. A liderança pode mudar ao longo da noite.</p>' +
    '<div><button class="btn btn-confirma btn-grande" data-a="iniciarApuracao">Acompanhar a apuração</button></div></section>' +
    '</div></main>';
};

var VELOCIDADES = [['0', 'Pausar'], ['2', '1×'], ['8', '4×'], ['30', '15×']];

ACOES_UI.iniciarApuracao = function () {
  var turno = JOGO.fase === 'apuracao1' ? 1 : 2;
  var feito = turno === 1 ? !!JOGO.resultado1 : (!!JOGO.resultado2 || !!JOGO.resEst2);
  if (!feito) realizarEleicao(JOGO);
  salvarJogo(true);
  var c = jogador(JOGO);
  var res = turno === 1 ? JOGO.resultado1 : JOGO.resultado2;
  var aba = 'presidente', uf = c.escopo === 'estadual' ? c.uf : 'SP';
  if (c.escopo === 'estadual') aba = { governador: 'governador', senador: 'senado', depfed: 'camara', depest: 'assembleia' }[c.cargo];
  if (turno === 2 && !res) { aba = 'governador'; if ((JOGO.govSegundo || []).indexOf(uf) < 0) uf = JOGO.govSegundo[0]; }
  if (turno === 2 && aba !== 'presidente' && aba !== 'governador') aba = res ? 'presidente' : 'governador';
  if (turno === 2 && aba === 'governador' && (JOGO.govSegundo || []).indexOf(uf) < 0) uf = JOGO.govSegundo[0] || uf;
  UI.apur = { turno: turno, res: res, t: 0, vel: 8, aba: aba, uf: uf, ticker: [], marcos: {}, marcosJog: {}, lider: null, fim: false, situacao: null, ufsFim: {} };
  irPara('apuracao');
  iniciarRelogioApuracao();
};

function iniciarRelogioApuracao() {
  pararRelogioApuracao();
  UI.apur.timer = setInterval(function () {
    var a = UI.apur;
    if (!a || a.fim || UI.tela !== 'apuracao') { pararRelogioApuracao(); return; }
    if (!a.vel) return;
    a.t = Math.min(FIM_APURACAO, a.t + a.vel * 0.25);
    atualizarApuracao();
  }, 250);
}
function pararRelogioApuracao() { if (UI.apur && UI.apur.timer) { clearInterval(UI.apur.timer); UI.apur.timer = null; } }

function horaApuracao(t) {
  var m = 17 * 60 + Math.floor(t);
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

function registrarTicker(txt) {
  UI.apur.ticker.unshift({ h: horaApuracao(UI.apur.t), txt: txt });
}

function verificarMarcos(parcial) {
  var a = UI.apur, n = parcial.nac, res = a.res;
  var nome = function (id) { return candPorId(JOGO, id).urna; };
  if (n.pctApurado > 0.05 && !a.marcos.inicio) { a.marcos.inicio = true; registrarTicker('Primeiras urnas totalizadas. ' + nome(n.ordem[0]) + ' sai na frente.'); }
  var dez = Math.floor(n.pctApurado / 10);
  if (dez >= 1 && dez <= 9 && !a.marcos['p' + dez]) {
    a.marcos['p' + dez] = true;
    registrarTicker('Com ' + dez * 10 + '% das seções totalizadas: ' + nome(n.ordem[0]) + ' ' + fmtPct(n.pct[n.ordem[0]], 2) + ', ' + nome(n.ordem[1]) + ' ' + fmtPct(n.pct[n.ordem[1]], 2) + '.');
  }
  if (a.lider && a.lider !== n.ordem[0] && n.pctApurado > 3) registrarTicker('Virada! ' + nome(n.ordem[0]) + ' passa ' + nome(a.lider) + ' na apuração.');
  a.lider = n.ordem[0];
  ['SP', 'MG', 'RJ', 'BA', 'RS', 'PR', 'PE', 'CE'].forEach(function (uf) {
    if (!a.ufsFim[uf] && parcial.uf[uf].pct >= 99.99) {
      a.ufsFim[uf] = true;
      var o = ordenarPor(parcial.uf[uf].votos, res.ids);
      registrarTicker(ESTADO_POR_UF[uf].nome + ': apuração concluída. ' + nome(o[0]) + ' vence com ' + fmtPct(parcial.uf[uf].votos[o[0]] / parcial.uf[uf].validos * 100) + '.');
    }
  });
  if (n.situacao && !a.situacao) {
    a.situacao = n.situacao;
    if (n.situacao.tipo === 'eleito') registrarTicker('Matematicamente decidido: ' + nome(n.situacao.id) + ' está ' + eleitoA(candPorId(JOGO, n.situacao.id)) + ' ' + (res.turno === 1 ? 'no 1º turno.' : 'presidente da República.'));
    else registrarTicker('Matematicamente decidido: haverá 2º turno entre ' + nome(n.situacao.ids[0]) + ' e ' + nome(n.situacao.ids[1]) + '.');
  }
}

function placarHtml(parcial) {
  var n = parcial.nac, res = UI.apur.res;
  var max = Math.max(50, n.pct[n.ordem[0]] || 0);
  return n.ordem.map(function (id, i) {
    var c = candPorId(JOGO, id);
    return '<div class="placar-linha' + (c.jogador ? ' voce' : '') + '" style="--cor:' + cor(c) + '"><div class="numc">' + c.numero + '</div>' +
      '<div class="info"><div class="nm">' + esc(c.urna) + (c.jogador ? ' <span class="mudo pequeno" style="font-stretch:100%;text-transform:none">(você)</span>' : '') + '</div><div class="pequeno mudo">' + esc(c.partido) + ' · ' + esc(c.nome) + '</div>' +
      '<div class="trilho"><div class="ench" style="width:' + ((n.pct[id] || 0) / max * 100).toFixed(2) + '%"></div></div></div>' +
      '<div><div class="pc">' + fmtNum(n.pct[id] || 0, 2) + '%</div><div class="vt">' + fmtVotos(n.votos[id]) + ' votos</div></div></div>';
  }).join('');
}

function resumoVotosHtml(parcial) {
  var n = parcial.nac, res = UI.apur.res;
  var comp = n.comparecimento;
  return '<div class="resumo-votos">' +
    '<div class="it"><span class="rotulo">Comparecimento</span><span class="v">' + fmtVotos(comp) + '</span></div>' +
    '<div class="it"><span class="rotulo">Válidos</span><span class="v">' + fmtVotos(n.validos) + '</span></div>' +
    '<div class="it"><span class="rotulo">Brancos</span><span class="v">' + fmtVotos(n.brancos) + ' <span class="mudo">(' + fmtPct(comp ? n.brancos / comp * 100 : 0, 2) + ')</span></span></div>' +
    '<div class="it"><span class="rotulo">Nulos</span><span class="v">' + fmtVotos(n.nulos) + ' <span class="mudo">(' + fmtPct(comp ? n.nulos / comp * 100 : 0, 2) + ')</span></span></div>' +
    '<div class="it"><span class="rotulo">Abstenção (final)</span><span class="v">' + (n.pctApurado >= 99.99 ? fmtPct(res.nac.abstencao / res.nac.aptos * 100, 2) : '—') + '</span></div>' +
    '</div>';
}

function tabelaUFApuracao(parcial) {
  var res = UI.apur.res, c = jogador(JOGO);
  return '<div class="tabela-caixa"><table class="tabela"><thead><tr><th>UF</th><th class="n">Apurado</th><th>Líder</th><th class="n">%</th>' + (c.ativo || res.ids.indexOf(c.id) >= 0 ? '<th class="n">Você</th>' : '') + '</tr></thead><tbody>' +
    UFS.slice().sort(function (a, b) { return ESTADO_POR_UF[b].eleitores - ESTADO_POR_UF[a].eleitores; }).map(function (uf) {
      var p = parcial.uf[uf];
      var o = ordenarPor(p.votos, res.ids);
      var lc = candPorId(JOGO, o[0]);
      return '<tr><td>' + uf + '</td><td class="n">' + fmtPct(p.pct, 1) + '</td><td>' + (p.validos > 0 ? nomeCand(lc) : '—') + '</td><td class="n">' + (p.validos > 0 ? fmtPct(p.votos[o[0]] / p.validos * 100) : '—') + '</td>' +
        (res.ids.indexOf(c.id) >= 0 ? '<td class="n">' + (p.validos > 0 ? fmtPct(p.votos[c.id] / p.validos * 100) : '—') + '</td>' : '') + '</tr>';
    }).join('') + '</tbody></table></div>';
}

function preencherMapaApuracao(parcial) {
  var res = UI.apur.res;
  return function (uf) {
    var p = parcial.uf[uf];
    if (!p || p.validos <= 0) return { cor: 'var(--mapa-vazio)' };
    var o = ordenarPor(p.votos, res.ids);
    var margem = (p.votos[o[0]] - p.votos[o[1]]) / p.validos * 100;
    return { cor: corId(o[0]), opacidade: Math.min(1, 0.35 + margem / 30) * (0.45 + 0.55 * p.pct / 100) };
  };
}

/* ---------- Disputas estaduais na apuração ---------- */

function tempoUF(uf) {
  var a = UI.apur;
  if (a.turno === 1) return JOGO.resultado1.uf[uf].tempo;
  return JOGO.resultado2 ? JOGO.resultado2.uf[uf].tempo : JOGO.tempo2[uf];
}
function progZonas(uf, t) {
  if (t >= FIM_APURACAO) return { pU: 1, pR: 1 };
  var tm = tempoUF(uf);
  return { pU: progressoCurva(t, tm.tU, tm.wU), pR: progressoCurva(t, tm.tR, tm.wR) };
}
function parcialMaj(r, t) {
  var p = progZonas(r.uf, t), vot = {}, val = 0;
  r.ids.forEach(function (id) { var f = r.fracMetro[id]; var v = r.votos[id] * (f * p.pU + (1 - f) * p.pR); vot[id] = v; val += v; });
  var m = FRACAO_METRO[r.uf];
  var pct = {};
  r.ids.forEach(function (id) { pct[id] = val > 0 ? vot[id] / val * 100 : 0; });
  return { votos: vot, validos: val, pct: pct, ordem: r.ids.slice().sort(function (x, y) { return vot[y] - vot[x]; }), pctApurado: t >= FIM_APURACAO ? 100 : (m * p.pU + (1 - m) * p.pR) * 100 };
}
function parcialProp(r, t) {
  var p = progZonas(r.uf, t), vot = {}, val = 0;
  for (var s in r.votos) { var f = r.fracMetro[s]; vot[s] = r.votos[s] * (f * p.pU + (1 - f) * p.pR); val += vot[s]; }
  var m = FRACAO_METRO[r.uf];
  var pctA = t >= FIM_APURACAO ? 100 : (m * p.pU + (1 - m) * p.pR) * 100;
  var cad;
  if (pctA >= 99.99) cad = r.cadeiras;
  else {
    cad = {};
    var sig = Object.keys(vot), qe = val / r.vagas, rest = r.vagas;
    sig.forEach(function (x) { cad[x] = qe > 0 ? Math.floor(vot[x] / qe) : 0; rest -= cad[x]; });
    while (rest > 0 && val > 0) {
      var b = null, bv = -1;
      sig.forEach(function (x) { if (vot[x] < 0.8 * qe && sig.some(function (y) { return vot[y] >= 0.8 * qe && cad[y] > 0; })) return; var mm = vot[x] / (cad[x] + 1); if (mm > bv) { bv = mm; b = x; } });
      if (!b) break;
      cad[b]++; rest--;
    }
  }
  return { votos: vot, validos: val, pctApurado: pctA, cadeiras: cad, final: pctA >= 99.99 };
}

function resMajAtual(cargo, uf) {
  var a = UI.apur;
  if (cargo === 'governador') return a.turno === 2 ? JOGO.resEst2.gov[uf] : JOGO.resEst1.gov[uf];
  return JOGO.resEst1.sen[uf];
}

function placarEst(r, par, cargo) {
  var c = jogador(JOGO);
  var vagas = cargo === 'senador' ? r.vagas : 1;
  var max = Math.max(50, par.pct[par.ordem[0]] || 0);
  return par.ordem.map(function (id, i) {
    var o = JOGO.est.cands[id];
    var marca = par.pctApurado >= 99.99 ? (cargo === 'senador' ? (i < vagas ? ' · eleit' + oa(o) : '') : (r.turno === 2 || r.pct[r.ordem[0]] > 50 ? (i === 0 ? ' · eleit' + oa(o) : '') : (i < 2 ? ' · 2º turno' : ''))) : '';
    return '<div class="placar-linha' + (o.jogador ? ' voce' : '') + '" style="--cor:' + cor(o) + '"><div class="numc">' + o.numero + '</div>' +
      '<div class="info"><div class="nm">' + esc(o.urna) + (o.jogador ? ' <span class="mudo pequeno" style="font-stretch:100%;text-transform:none">(você)</span>' : '') + '</div><div class="pequeno mudo">' + esc(o.partido) + marca + '</div>' +
      '<div class="trilho"><div class="ench" style="width:' + ((par.pct[id] || 0) / max * 100).toFixed(2) + '%"></div></div></div>' +
      '<div><div class="pc">' + fmtNum(par.pct[id] || 0, 2) + '%</div><div class="vt">' + fmtVotos(par.votos[id]) + ' votos</div></div></div>';
  }).join('');
}

function seletorUF(lista) {
  var a = UI.apur;
  return '<div class="campo" style="max-width:320px"><label for="ap-uf">Estado</label><select id="ap-uf" data-mudar="apurUF">' + lista.map(function (u) {
    return '<option value="' + u + '"' + (u === a.uf ? ' selected' : '') + '>' + ESTADO_POR_UF[u].nome + '</option>';
  }).join('') + '</select></div>';
}
ACOES_UI.apurUF = function (d, el) { UI.apur.uf = el.value; renderAbaApuracao(); };

function conteudoMaj(cargo) {
  var a = UI.apur;
  var r = resMajAtual(cargo, a.uf);
  var par = parcialMaj(r, a.t);
  return '<div class="entre"><h3>' + (cargo === 'governador' ? 'Governo ' + esc(prepUF(a.uf, 'de')) : 'Senado · ' + esc(ESTADO_POR_UF[a.uf].nome)) + '</h3><span class="tag">' + fmtPct(par.pctApurado, 2) + ' apurado</span></div>' +
    (cargo === 'senador' ? '<p class="mudo pequeno">' + (r.vagas === 2 ? 'Duas vagas: os dois mais votados são eleitos.' : 'Uma vaga: o mais votado é eleito.') + '</p>' : '') +
    '<div class="placar">' + placarEst(r, par, cargo) + '</div>';
}

function conteudoProp(casa) {
  var a = UI.apur;
  var r = JOGO.resEst1[casa][a.uf];
  var par = parcialProp(r, a.t);
  var c = jogador(JOGO);
  var sig = Object.keys(par.votos).filter(function (s) { return par.votos[s] > 0; }).sort(function (x, y) { return par.votos[y] - par.votos[x]; });
  var max = par.votos[sig[0]] || 1;
  var html = '<div class="entre"><h3>' + (casa === 'depfed' ? 'Câmara · ' : 'Assembleia · ') + esc(ESTADO_POR_UF[a.uf].nome) + '</h3><span class="tag">' + fmtPct(par.pctApurado, 2) + ' apurado · ' + r.vagas + ' vagas</span></div>' +
    '<p class="mudo pequeno">' + (par.final ? 'Resultado final. Quociente eleitoral: ' + fmtVotos(r.qe) + ' votos.' : 'Cadeiras projetadas com os votos já apurados.') + '</p>' +
    '<div class="barras">' + sig.map(function (s) {
      var p = PARTIDO_POR_SIGLA[s];
      return '<div class="barra-linha' + (c.partido === s && c.escopo === 'estadual' ? ' voce' : '') + '" style="--cor:' + corIdeologia(p.ideo) + '"><div class="nm"><span class="pt"></span>' + s + '</div><div class="trilho"><div class="ench" style="width:' + (par.votos[s] / max * 100).toFixed(1) + '%"></div></div><div class="val">' + (par.cadeiras[s] || 0) + '</div></div>';
    }).join('') + '</div><p class="mudo pequeno">Barra: votos do partido. Número: cadeiras ' + (par.final ? 'conquistadas' : 'projetadas') + '.</p>';
  if (r.jogador && c.uf === a.uf) {
    var m = FRACAO_METRO[a.uf], pz = progZonas(a.uf, a.t);
    var meus = r.jogador.votos * (m * pz.pU + (1 - m) * pz.pR);
    html += '<div class="painel cartao-corpo"><b>Você: ' + fmtVotos(meus) + ' votos</b>' + (par.final ? ' · ' + (r.jogador.eleito ? '<span class="bom">' + eleitoA(c) + (r.jogador.via === 'quociente' ? ' pelo quociente do partido' : ' nas sobras') + '</span>' : '<span class="ruim">não ' + eleitoA(c) + ' · ' + r.jogador.posicaoLista + 'º na lista do ' + esc(c.partido) + ', que fez ' + r.jogador.cadeirasPartido + ' cadeira(s)</span>') : '') + '</div>';
  }
  if (par.final) {
    html += '<h4>Eleitos</h4><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Nome</th><th>Partido</th><th class="n">Votos</th><th>Vaga</th></tr></thead><tbody>' +
      r.eleitos.slice().sort(function (x, y) { return y.votos - x.votos; }).map(function (e) {
        return '<tr' + (e.jogador ? ' class="voce"' : '') + '><td>' + esc(e.urna) + '</td><td>' + e.sigla + '</td><td class="n">' + fmtVotos(e.votos) + '</td><td class="pequeno mudo">' + (e.via === 'quociente' ? 'Quociente' : e.via === 'media' ? 'Sobras' : 'Sobras (todos)') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  if (casa === 'depfed') {
    var nac = {};
    PARTIDOS.forEach(function (p) { nac[p.sigla] = 0; });
    UFS_MAPA.forEach(function (uf) { var pp = parcialProp(JOGO.resEst1.depfed[uf], a.t); for (var s2 in pp.cadeiras) nac[s2] += pp.cadeiras[s2]; });
    html += '<div class="divisor"></div><h4>Câmara dos Deputados · ' + (a.t >= FIM_APURACAO ? 'composição final' : 'projeção nacional') + '</h4>' + barrasPartidos(nac, null);
  }
  return html;
}

function liderGovernoUF(uf) {
  var a = UI.apur;
  var r = a.turno === 2 && JOGO.resEst2.gov[uf] ? JOGO.resEst2.gov[uf] : JOGO.resEst1.gov[uf];
  var par = (a.turno === 2 && !JOGO.resEst2.gov[uf]) ? { ordem: r.ordem, pctApurado: 100, pct: r.pct } : parcialMaj(r, a.t);
  return { r: r, par: par, lider: par.validos === 0 ? null : JOGO.est.cands[par.ordem[0]] };
}

function conteudoGovernos() {
  var a = UI.apur;
  var mapa = mapaSvg({
    acao: 'nada', titulo: 'Governadores', preencher: function (uf) {
      var g = liderGovernoUF(uf);
      if (!g.lider) return { cor: 'var(--mapa-vazio)' };
      var pal = g.lider.palanque && candPorId(JOGO, g.lider.palanque);
      return { cor: pal ? cor(pal) : 'var(--div-0)', opacidade: 0.45 + 0.55 * g.par.pctApurado / 100 };
    }
  });
  var presIds = JOGO.candidatos.map(function (x) { return x.id; });
  return '<h3>Governadores por palanque presidencial</h3>' + mapa +
    '<div class="legenda">' + JOGO.candidatos.filter(function (x) { return JOGO.resultado1.ids.indexOf(x.id) >= 0; }).slice(0, 8).map(function (x) { return '<span class="it"><span class="sw" style="--cor:' + cor(x) + '"></span>Aliado de ' + esc(x.urna) + '</span>'; }).join('') + '<span class="it"><span class="sw" style="--cor:var(--div-0)"></span>Neutro</span></div>' +
    '<div class="tabela-caixa"><table class="tabela"><thead><tr><th>UF</th><th>Lidera</th><th>Partido</th><th class="n">%</th><th>Situação</th></tr></thead><tbody>' +
    UFS_MAPA.map(function (uf) {
      var g = liderGovernoUF(uf);
      if (!g.lider) return '<tr><td>' + uf + '</td><td colspan="4" class="mudo">Aguardando urnas</td></tr>';
      var sit = g.par.pctApurado >= 99.99 ? (a.turno === 1 && g.r.pct[g.r.ordem[0]] <= 50 ? '2º turno' : eleitoA(g.lider)) : 'Apurando';
      return '<tr' + (g.lider.jogador ? ' class="voce"' : '') + '><td>' + uf + '</td><td>' + nomeCand(g.lider) + '</td><td>' + g.lider.partido + '</td><td class="n">' + fmtNum(g.par.pct[g.lider.id] || 0, 1) + '</td><td class="pequeno">' + sit + '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

function abasApuracao() {
  var a = UI.apur, l = [];
  if (a.res) l.push(['presidente', 'Presidente']);
  l.push(['governador', 'Governador']);
  if (a.turno === 1) { l.push(['senado', 'Senado']); l.push(['camara', 'Câmara']); l.push(['assembleia', 'Assembleias']); }
  l.push(['governos', 'Mapa dos governos']);
  return l;
}

function conteudoAbaApuracao() {
  var a = UI.apur;
  if (a.aba === 'presidente') {
    var parcial = apuracaoParcial(a.res, a.t);
    return '<div class="apur-grade" style="padding:0"><div class="pilha"><div class="placar" id="ap-placar">' + placarHtml(parcial) + '</div><section class="painel cartao-corpo" id="ap-resumo">' + resumoVotosHtml(parcial) + '</section></div>' +
      '<div class="pilha"><section class="painel mapa-caixa pilha" id="ap-mapa">' + mapaSvg({ preencher: preencherMapaApuracao(parcial), acao: 'nada', titulo: 'Mapa da apuração' }) + '<div class="dica-mapa" hidden></div>' +
      '<div class="legenda">' + a.res.ids.map(function (id) { var c = candPorId(JOGO, id); return '<span class="it"><span class="sw" style="--cor:' + cor(c) + '"></span>' + esc(c.urna) + '</span>'; }).join('') + '</div></section>' +
      '<section class="painel cartao-corpo pilha"><h3>Por estado</h3><div id="ap-tabela">' + tabelaUFApuracao(parcial) + '</div></section></div></div>';
  }
  var lista = a.turno === 2 ? JOGO.govSegundo : UFS_MAPA;
  if (lista.indexOf(a.uf) < 0) a.uf = lista[0];
  var caixa = function (sel, html) { return '<section class="painel cartao-corpo pilha">' + sel + '<div id="ap-dyn" class="pilha">' + html + '</div></section>'; };
  if (a.aba === 'governador') return caixa(seletorUF(lista), conteudoMaj('governador'));
  if (a.aba === 'senado') return caixa(seletorUF(UFS_MAPA), conteudoMaj('senador'));
  if (a.aba === 'camara') return caixa(seletorUF(UFS_MAPA), conteudoProp('depfed'));
  if (a.aba === 'assembleia') return caixa(seletorUF(UFS_MAPA), conteudoProp('depest'));
  return caixa('', conteudoGovernos());
}

function renderAbaApuracao() {
  var el = document.getElementById('ap-conteudo');
  if (!el) return;
  el.innerHTML = conteudoAbaApuracao();
  var abas = document.querySelectorAll('.abas-apur .chip');
  for (var i = 0; i < abas.length; i++) abas[i].classList.toggle('ativo', abas[i].getAttribute('data-v') === UI.apur.aba);
  if (UI.apur.aba === 'presidente') ligarDicasMapa(document.getElementById('ap-mapa'), function (uf) {
    var p = apuracaoParcial(UI.apur.res, UI.apur.t).uf[uf];
    var o = ordenarPor(p.votos, UI.apur.res.ids).slice(0, 3);
    return '<b>' + esc(ESTADO_POR_UF[uf].nome) + '</b> · ' + fmtPct(p.pct, 1) + ' apurado<br>' + (p.validos > 0 ? o.map(function (id) { return esc(candPorId(JOGO, id).urna) + ' ' + fmtPct(p.votos[id] / p.validos * 100); }).join(' · ') : 'Aguardando urnas');
  });
}
ACOES_UI.abaApur = function (d) { UI.apur.aba = d.v; renderAbaApuracao(); };

function pctGeralApuracao() {
  var a = UI.apur;
  if (a.res) return apuracaoParcial(a.res, a.t).nac.pctApurado;
  var tot = 0, ap = 0;
  (JOGO.govSegundo || []).forEach(function (uf) { var r = JOGO.resEst2.gov[uf]; var p = parcialMaj(r, a.t); tot += r.comparecimento; ap += r.comparecimento * p.pctApurado / 100; });
  return tot ? ap / tot * 100 : 100;
}

/* Marcos da disputa do jogador no plantão. */
function verificarMarcosJogador() {
  var a = UI.apur, c = jogador(JOGO);
  if (c.escopo !== 'estadual') return;
  var txt = null, chave = null, pctA = 0;
  if (c.cargo === 'governador' || c.cargo === 'senador') {
    if (a.turno === 2 && !(JOGO.resEst2 && JOGO.resEst2.gov[c.uf] && JOGO.resEst2.gov[c.uf].ids.indexOf(c.id) >= 0)) return;
    var r = resMajAtual(c.cargo, c.uf);
    if (!r || r.ids.indexOf(c.id) < 0) return;
    var par = parcialMaj(r, a.t);
    pctA = par.pctApurado;
    var pos = par.ordem.indexOf(c.id) + 1;
    txt = prepUF(c.uf, 'em').replace(/^./, function (l) { return l.toUpperCase(); }) + ', com ' + Math.floor(pctA) + '% apurado, você tem ' + fmtPct(par.pct[c.id], 1) + ' e está em ' + pos + 'º lugar.';
  } else {
    var rp = JOGO.resEst1[c.cargo][c.uf];
    var pp = parcialProp(rp, a.t);
    pctA = pp.pctApurado;
    var m = FRACAO_METRO[c.uf], pz = progZonas(c.uf, a.t);
    txt = 'Com ' + Math.floor(pctA) + '% apurado em ' + c.uf + ', você soma ' + fmtVotos(rp.jogador.votos * (m * pz.pU + (1 - m) * pz.pR)) + ' votos; o ' + c.partido + ' projeta ' + (pp.cadeiras[c.partido] || 0) + ' cadeira(s).';
  }
  [25, 50, 75].forEach(function (q) {
    if (pctA >= q && !a.marcosJog[q]) { a.marcosJog[q] = true; registrarTicker(txt); }
  });
}

function textoResultadoJogador() {
  var c = jogador(JOGO), a = UI.apur;
  if (c.escopo !== 'estadual') return '';
  if (c.cargo === 'governador' || c.cargo === 'senador') {
    var r = resMajAtual(c.cargo, c.uf);
    if (!r || r.ids.indexOf(c.id) < 0) return '';
    var pos = r.ordem.indexOf(c.id);
    if (c.cargo === 'senador') return pos < r.vagas ? 'Você está ' + eleitoA(c) + ' ' + nomeCargo('senador', c.genero).toLowerCase() + '!' : 'Você ficou em ' + (pos + 1) + 'º e não foi ' + eleitoA(c) + '.';
    if (a.turno === 2 || r.pct[r.ordem[0]] > 50) return pos === 0 ? 'Você está ' + eleitoA(c) + ' ' + nomeCargo('governador', c.genero).toLowerCase() + '!' : 'Você não foi ' + eleitoA(c) + '.';
    return pos < 2 ? 'Você vai ao 2º turno!' : 'Você ficou em ' + (pos + 1) + 'º e está fora do 2º turno.';
  }
  var rp = JOGO.resEst1[c.cargo][c.uf].jogador;
  return rp.eleito ? 'Você está ' + eleitoA(c) + ' com ' + fmtVotos(rp.votos) + ' votos!' : 'Você teve ' + fmtVotos(rp.votos) + ' votos e não foi ' + eleitoA(c) + '.';
}

function faixaResultado() {
  var a = UI.apur, c = jogador(JOGO);
  var nome = function (id) { return candPorId(JOGO, id).urna; };
  var txt = '', cls = '';
  var res = a.res;
  if (res) {
    var o = res.ordem;
    if (res.turno === 1 && res.pct[o[0]] > 50) { txt = nome(o[0]) + ' ' + eleitoA(candPorId(JOGO, o[0])) + ' presidente no 1º turno'; cls = o[0] === c.id ? '' : 'derrota'; }
    else if (res.turno === 1) { txt = 'Presidente: 2º turno entre ' + nome(o[0]) + ' e ' + nome(o[1]); cls = (o[0] === c.id || o[1] === c.id) ? 'segundo' : 'derrota'; }
    else { txt = nome(o[0]) + ' ' + eleitoA(candPorId(JOGO, o[0])) + ' presidente com ' + fmtPct(res.pct[o[0]], 2); cls = o[0] === c.id ? '' : 'derrota'; }
  } else txt = '2º turno nos estados concluído';
  var meu = textoResultadoJogador();
  if (c.escopo === 'estadual') cls = /eleit|2º turno!/.test(meu) && !/não foi/.test(meu) ? (/2º turno!/.test(meu) ? 'segundo' : '') : 'derrota';
  return '<div class="faixa-resultado ' + cls + '"><span>' + esc(meu || txt) + (meu ? '<br><span style="font-size:1rem;opacity:0.85">' + esc(txt) + '</span>' : '') + '</span><button class="btn btn-branco" data-a="posApuracao">Continuar</button></div>';
}

TELAS.apuracao = function () {
  var a = UI.apur;
  var pct = pctGeralApuracao();
  return '<div class="apuracao"><header class="apur-topo gutter"><div class="apur-topo-grade">' +
    '<div><div class="rotulo" style="color:var(--urna-muted)">Apuração · ' + a.turno + 'º turno</div><div class="relogio" id="ap-relogio">' + horaApuracao(a.t) + '</div></div>' +
    '<div class="secoes"><span class="rotulo" style="color:var(--urna-muted)">Seções totalizadas</span><span class="big" id="ap-pct">' + fmtPct(pct, 2) + '</span><div class="trilho"><i id="ap-barra" style="width:' + pct + '%"></i></div></div>' +
    '<div class="velocidades">' + VELOCIDADES.map(function (v) { return '<button class="chip' + (String(a.vel) === v[0] ? ' ativo' : '') + '" data-a="velApur" data-v="' + v[0] + '">' + v[1] + '</button>'; }).join('') +
    '<button class="chip" data-a="fimApur">Ir para o fim</button></div></div></header>' +
    '<main class="gutter" style="max-width:1400px;margin:0 auto;padding-block:16px 40px"><div class="pilha">' +
    '<div id="ap-faixa">' + (a.fim ? faixaResultado() : '') + '</div>' +
    '<nav class="abas-apur">' + abasApuracao().map(function (x) { return '<button class="chip' + (a.aba === x[0] ? ' ativo' : '') + '" data-a="abaApur" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</nav>' +
    '<div id="ap-conteudo">' + conteudoAbaApuracao() + '</div>' +
    '<section class="painel cartao-corpo pilha"><h3>Plantão da apuração</h3><div class="ticker" id="ap-ticker"></div></section>' +
    '</div></main></div>';
};
TELAS.apuracao_depois = function () { atualizarTicker(); renderAbaApuracao(); };

function atualizarTicker() {
  var el = document.getElementById('ap-ticker');
  if (!el) return;
  el.innerHTML = UI.apur.ticker.length ? UI.apur.ticker.map(function (i) { return '<div class="it"><b>' + i.h + '</b><span>' + esc(i.txt) + '</span></div>'; }).join('') : '<p class="mudo pequeno">As urnas fecham às 17h. Aguardando os primeiros boletins.</p>';
}

function atualizarApuracao() {
  var a = UI.apur;
  var nTicker = a.ticker.length;
  var parcial = a.res ? apuracaoParcial(a.res, a.t) : null;
  if (parcial) verificarMarcos(parcial);
  verificarMarcosJogador();
  var set = function (id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; };
  var pct = pctGeralApuracao();
  set('ap-relogio', horaApuracao(a.t));
  set('ap-pct', fmtPct(pct, 2));
  var barra = document.getElementById('ap-barra'); if (barra) barra.style.width = pct + '%';
  if (a.aba === 'presidente' && parcial) {
    set('ap-placar', placarHtml(parcial));
    set('ap-resumo', resumoVotosHtml(parcial));
    if (Math.floor(a.t) % 3 === 0 || a.t >= FIM_APURACAO) set('ap-tabela', tabelaUFApuracao(parcial));
    var preencher = preencherMapaApuracao(parcial);
    var paths = document.querySelectorAll('#ap-mapa path');
    for (var i = 0; i < paths.length; i++) {
      var f = preencher(paths[i].getAttribute('data-uf'));
      paths[i].setAttribute('fill', f.cor);
      paths[i].setAttribute('fill-opacity', f.opacidade === undefined ? 1 : f.opacidade);
    }
  } else if (a.aba !== 'presidente') {
    if (a.aba === 'governos' && Math.floor(a.t * 4) % 4 !== 0 && a.t < FIM_APURACAO) { /* mapa dos governos atualiza 1x por minuto simulado */ }
    else set('ap-dyn', a.aba === 'governador' ? conteudoMaj('governador') : a.aba === 'senado' ? conteudoMaj('senador') : a.aba === 'camara' ? conteudoProp('depfed') : a.aba === 'assembleia' ? conteudoProp('depest') : conteudoGovernos());
  }
  if (a.ticker.length !== nTicker) atualizarTicker();
  if (a.t >= FIM_APURACAO && !a.fim) {
    a.fim = true;
    var meu = textoResultadoJogador();
    if (meu) registrarTicker(meu);
    registrarTicker('Apuração concluída: 100% das seções totalizadas.');
    atualizarTicker();
    set('ap-faixa', faixaResultado());
    pararRelogioApuracao();
  }
}

ACOES_UI.velApur = function (d) {
  UI.apur.vel = +d.v;
  var chips = document.querySelectorAll('.velocidades .chip[data-a="velApur"]');
  for (var i = 0; i < chips.length; i++) chips[i].classList.toggle('ativo', chips[i].getAttribute('data-v') === d.v);
};
ACOES_UI.fimApur = function () {
  UI.apur.t = FIM_APURACAO;
  atualizarApuracao();
};

ACOES_UI.posApuracao = function () {
  pararRelogioApuracao();
  var turno = UI.apur.turno;
  UI.apur = null;
  if (turno === 1) {
    var f = resolverPrimeiroTurno(JOGO);
    salvarJogo(true);
    irPara(f);
  } else {
    resolverSegundoTurno(JOGO);
    salvarJogo(true);
    irPara('fim');
  }
};
