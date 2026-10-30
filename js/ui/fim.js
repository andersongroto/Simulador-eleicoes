/* Entre turnos, eliminação no 1º turno e tela final. */

function tabelaResultado(res, destaque) {
  var c = jogador(JOGO);
  return '<div class="tabela-caixa"><table class="tabela"><thead><tr><th>Candidato</th><th>Partido</th><th class="n">Votos</th><th class="n">% válidos</th></tr></thead><tbody>' +
    res.ordem.map(function (id) {
      var x = candPorId(JOGO, id);
      return '<tr' + (x.id === c.id ? ' class="voce"' : '') + '><td>' + nomeCand(x) + '</td><td>' + x.numero + ' · ' + esc(x.partido) + '</td><td class="n">' + fmtVotos(res.nac.votos[id]) + '</td><td class="n">' + fmtPct(res.pct[id], 2) + '</td></tr>';
    }).join('') +
    '<tr><td colspan="2" class="mudo">Brancos e nulos</td><td class="n mudo">' + fmtVotos(res.nac.brancos + res.nac.nulos) + '</td><td></td></tr>' +
    '<tr><td colspan="2" class="mudo">Abstenção</td><td class="n mudo">' + fmtVotos(res.nac.abstencao) + '</td><td class="n mudo">' + fmtPct(res.nac.abstencao / res.nac.aptos * 100) + ' dos aptos</td></tr>' +
    '</tbody></table></div>';
}

function mapaResultado(res) {
  return mapaSvg({
    acao: 'nada', titulo: 'Mapa do resultado',
    preencher: function (uf) {
      var u = res.uf[uf];
      var o = ordenarPor(u.votos, res.ids);
      var margem = (u.votos[o[0]] - u.votos[o[1]]) / u.validos * 100;
      return { cor: corId(o[0]), opacidade: Math.min(1, 0.4 + margem / 30) };
    }
  }) + '<div class="legenda">' + res.ids.filter(function (id) {
    return UFS_MAPA.some(function (uf) { return ordenarPor(res.uf[uf].votos, res.ids)[0] === id; });
  }).map(function (id) {
    var c = candPorId(JOGO, id);
    var n = UFS_MAPA.filter(function (uf) { return ordenarPor(res.uf[uf].votos, res.ids)[0] === id; }).length;
    return '<span class="it"><span class="sw" style="--cor:' + cor(c) + '"></span>' + esc(c.urna) + ': ' + n + ' UF' + (n > 1 ? 's' : '') + '</span>';
  }).join('') + '</div>';
}

/* ---------- Entre turnos (jogador no 2º turno) ---------- */
TELAS.entreturnos = function () {
  var c = jogador(JOGO), res = JOGO.resultado1;
  var rival = candPorId(JOGO, JOGO.finalistas[0] === c.id ? JOGO.finalistas[1] : JOGO.finalistas[0]);
  var elim = JOGO.candidatos.filter(function (x) { return x.eliminado; }).sort(function (a, b) { return res.pct[b.id] - res.pct[a.id]; });
  var cen = calcularIntencoes(JOGO, { ids: JOGO.finalistas, modo: 'cenario2' });
  var val = paraValidos(cen.nac, JOGO.finalistas);
  return '<header class="cabecalho-tela gutter"><div style="max-width:1180px;margin:0 auto"><div class="rotulo">' + fmtDataLonga(JOGO.cal, JOGO.cal.eleicao1 + 1) + '</div><h1>Rumo ao 2º turno</h1></div></header>' +
    '<main class="container gutter pilha-g"><div class="mesa mesa-plana">' +
    '<section class="pilha"><div class="cartao cartao-corpo pilha"><h2>Você contra ' + esc(rival.urna) + '</h2>' +
    '<p class="sec">Você terminou o 1º turno em ' + (res.ordem.indexOf(c.id) + 1) + 'º lugar, com ' + fmtPct(res.pct[c.id], 2) + ' dos votos válidos. ' + esc(rival.urna) + ' teve ' + fmtPct(res.pct[rival.id], 2) + '. O 2º turno será em ' + fmtDataLonga(JOGO.cal, JOGO.cal.eleicao2) + '.</p>' +
    '<div><div class="rotulo">Primeira simulação de 2º turno (votos válidos)</div>' + barrasIntencao(val, ordenarPor(val, JOGO.finalistas), { casas: 1, max: 100 }) + '</div></div>' +
    '<div class="cartao cartao-corpo pilha"><h3>Negocie os apoios dos derrotados</h3><p class="sec pequeno">Cada candidato eliminado decide se apoia você, seu adversário ou fica neutro. Pesam a afinidade ideológica, os ataques trocados na campanha e o que você oferece. Você tem uma conversa com cada um.</p>' +
    elim.map(function (x) {
      var dec = JOGO.apoios2[x.id];
      var ataques = (x.stats.ataquesRecebidos[c.id] || 0);
      var status = dec === undefined || dec === null ? '' : dec === 'neutro' ? '<b class="mudo">Fica neutro</b>' : dec === c.id ? '<b class="bom">Apoia você</b>' : '<b class="ruim">Apoia ' + esc(rival.urna) + '</b>';
      return '<div class="entre" style="border-bottom:1px solid var(--line);padding-bottom:10px"><div style="min-width:0;flex:1">' + nomeCand(x) + ' <span class="mudo">' + esc(x.partido) + ' · ' + fmtPct(res.pct[x.id], 1) + ' · ' + rotuloIdeologia(x.x) + '</span>' +
        (ataques >= 2 ? '<div class="pequeno ruim">Você atacou ' + esc(x.urna) + ' durante a campanha.</div>' : '') + '</div>' +
        (status || '<div class="linha-botoes"><button class="btn btn-peq" data-a="pedirApoio2" data-id="' + x.id + '" data-o="programa">Incorporar propostas</button><button class="btn btn-peq" data-a="pedirApoio2" data-id="' + x.id + '" data-o="cargos">Oferecer ministérios</button></div>') + '</div>';
    }).join('') + '</div>' +
    '<div><button class="btn btn-confirma btn-grande" data-a="comecar2">Começar a campanha do 2º turno</button></div></section>' +
    '<section class="cartao cartao-corpo pilha"><h3>Resultado do 1º turno</h3>' + tabelaResultado(res) + mapaResultado(res) + '</section>' +
    '</div></main>';
};

ACOES_UI.pedirApoio2 = function (d) {
  var dec = pedirApoioSegundoTurno(JOGO, d.id, d.o);
  var x = candPorId(JOGO, d.id);
  toast(dec === JOGO.jogadorId ? x.urna + ' declara apoio a você!' : dec === 'neutro' ? x.urna + ' prefere ficar neutro.' : x.urna + ' vai apoiar seu adversário.');
  atualizar();
};
ACOES_UI.comecar2 = function () {
  iniciarCampanha2(JOGO);
  salvarJogo(true);
  UI.aba = 'agenda'; UI.ufSel = null; UI.acaoSel = null;
  irPara('campanha');
  mostrarEventosPendentes();
};

/* ---------- Jogador eliminado ---------- */
TELAS.eliminado = function () {
  var c = jogador(JOGO), res = JOGO.resultado1;
  var pos = res.ordem.indexOf(c.id) + 1;
  var f = JOGO.finalistas.map(function (id) { return candPorId(JOGO, id); });
  return '<header class="cabecalho-tela gutter"><div style="max-width:1180px;margin:0 auto"><div class="rotulo">Fim da linha no 1º turno</div><h1>Você ficou em ' + pos + 'º lugar</h1></div></header>' +
    '<main class="container gutter pilha-g"><div class="mesa mesa-plana">' +
    '<section class="pilha"><div class="cartao cartao-corpo pilha"><h2>' + fmtPct(res.pct[c.id], 2) + ' dos votos válidos</h2>' +
    '<p class="sec">' + fmtVotos(res.nac.votos[c.id]) + ' brasileiros votaram em você. O 2º turno será entre ' + esc(f[0].urna) + ' e ' + esc(f[1].urna) + '. Seu apoio pode pesar: parte dos seus eleitores segue a sua orientação.</p>' +
    '<div class="opcoes-evento">' + f.map(function (x) {
      return '<button class="opcao-evento" data-a="apoiarFinalista" data-id="' + x.id + '"><b>Apoiar ' + esc(x.urna) + ' (' + esc(x.partido) + ')</b><span>' + rotuloIdeologia(x.x) + ' · ' + fmtPct(res.pct[x.id], 1) + ' no 1º turno</span></button>';
    }).join('') + '<button class="opcao-evento" data-a="apoiarFinalista" data-id="neutro"><b>Ficar neutro</b><span>Liberar seus eleitores.</span></button></div></div></section>' +
    '<section class="cartao cartao-corpo pilha"><h3>Resultado do 1º turno</h3>' + tabelaResultado(res) + mapaResultado(res) + '</section>' +
    '</div></main>';
};

ACOES_UI.apoiarFinalista = function (d) {
  JOGO.apoios2[JOGO.jogadorId] = d.id;
  simularSegundoTurnoAutomatico(JOGO);
  salvarJogo(true);
  irPara('vespera');
};

/* ---------- Fim ---------- */
TELAS.fim = function () {
  var c = jogador(JOGO);
  var venceu = JOGO.vencedor === c.id;
  var v = candPorId(JOGO, JOGO.vencedor);
  var resF = JOGO.resultado2 || JOGO.resultado1;
  var series = serieDePesquisas('1t').filter(function (s) { return s.pontos.length; });
  var graf = '';
  if (series.length) {
    var yMax = 0; series.forEach(function (s) { s.pontos.forEach(function (p) { yMax = Math.max(yMax, p.y); }); });
    var ticks = []; for (var d = 0; d <= JOGO.cal.eleicao1; d += 7) ticks.push({ x: d, rotulo: fmtDataCurta(JOGO.cal, d) });
    graf = graficoLinhas({ series: series, xMin: 0, xMax: JOGO.cal.eleicao1, yMax: yMax + 5, ticksX: ticks, titulo: 'Pesquisas do 1º turno', fmtX: function (x) { return fmtData(JOGO.cal, x); } });
  }
  var estados = Object.keys(c.stats.estados).length;
  var debMed = c.stats.debates.length ? soma(c.stats.debates.map(function (x) { return x.media; })) / c.stats.debates.length : null;
  var titulo = venceu ? (c.genero === 'F' ? 'Presidenta eleita' : 'Presidente eleito') : 'Fim da campanha';
  return '<header class="cabecalho-tela gutter" style="' + (venceu ? 'background:var(--confirma)' : '') + '"><div style="max-width:1180px;margin:0 auto"><div class="rotulo" style="' + (venceu ? 'color:#e4f5ea' : '') + '">' + fmtDataLonga(JOGO.cal, JOGO.resultado2 ? JOGO.cal.eleicao2 : JOGO.cal.eleicao1) + '</div><h1>' + titulo + '</h1>' +
    '<p style="margin-top:8px;font-size:1.1rem">' + (venceu ? esc(c.nome) + ' toma posse em 1º de janeiro de ' + (JOGO.cal.ano + 1) + ' como presidente da República.' : esc(v.nome) + ' (' + esc(v.partido) + ') foi ' + eleitoA(v) + ' presidente da República.') + '</p></div></header>' +
    '<main class="container gutter pilha-g">' +
    (JOGO.conquistas.length ? '<section class="pilha"><h2>Conquistas</h2><div class="trofeus">' + JOGO.conquistas.map(function (q) { return '<div class="trofeu"><b>' + esc(q.nome) + '</b><span class="sec pequeno">' + esc(q.desc) + '</span></div>'; }).join('') + '</div></section>' : '') +
    '<div class="mesa mesa-plana">' +
    '<section class="cartao cartao-corpo pilha"><h3>' + (JOGO.resultado2 ? 'Resultado do 2º turno' : 'Resultado do 1º turno') + '</h3>' + tabelaResultado(resF) + mapaResultado(resF) + '</section>' +
    '<section class="pilha">' +
    (JOGO.resultado2 ? '<div class="cartao cartao-corpo pilha"><h3>1º turno</h3>' + tabelaResultado(JOGO.resultado1) + '</div>' : '') +
    '<div class="cartao cartao-corpo pilha"><h3>Sua campanha em números</h3><div class="resumo-votos">' +
    '<div class="it"><span class="rotulo">Comícios</span><span class="v">' + c.stats.comicios + '</span></div>' +
    '<div class="it"><span class="rotulo">Estados visitados</span><span class="v">' + estados + ' de 27</span></div>' +
    '<div class="it"><span class="rotulo">Apoios conquistados</span><span class="v">' + c.stats.apoiosGanhos + '</span></div>' +
    '<div class="it"><span class="rotulo">Propostas</span><span class="v">' + c.stats.propostas + '</span></div>' +
    '<div class="it"><span class="rotulo">Ataques</span><span class="v">' + c.stats.ataques + '</span></div>' +
    '<div class="it"><span class="rotulo">Nota média em debates</span><span class="v">' + (debMed === null ? '—' : fmtNum(debMed, 1)) + '</span></div>' +
    '<div class="it"><span class="rotulo">Arrecadado</span><span class="v">' + fmtDinheiro(c.arrecadado) + '</span></div>' +
    '<div class="it"><span class="rotulo">Gasto total</span><span class="v">' + fmtDinheiro(c.gasto) + '</span></div>' +
    '</div></div>' +
    '<div class="cartao cartao-corpo pilha"><h3>Pesquisas do 1º turno</h3>' + graf + '</div>' +
    '</section></div>' +
    '<div class="linha-botoes"><button class="btn btn-confirma btn-grande" data-a="novaPartida">Nova campanha</button><button class="btn btn-grande" data-a="voltarInicioFim">Tela inicial</button></div>' +
    '</main>';
};
TELAS.fim_depois = function () { ligarGraficos(); };

ACOES_UI.novaPartida = function () { apagarJogo(); JOGO = null; irPara('config'); };
ACOES_UI.voltarInicioFim = function () { apagarJogo(); JOGO = null; irPara('inicio'); };
