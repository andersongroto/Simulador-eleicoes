/* Véspera da eleição e apuração dos votos. */

TELAS.vespera = function () {
  var turno = JOGO.fase === 'apuracao1' ? 1 : 2;
  var c = jogador(JOGO);
  var tipo = turno === 1 ? '1t' : '2t';
  var agr = agregador(JOGO, tipo) || JOGO._cache.nac;
  var ids = ordenarPor(agr, candidatosAtivos(JOGO).map(function (x) { return x.id; }));
  var val = paraValidos(agr, ids);
  var dia = turno === 1 ? JOGO.cal.eleicao1 : JOGO.cal.eleicao2;
  return '<header class="cabecalho-tela gutter"><div style="max-width:1180px;margin:0 auto"><div class="rotulo">' + fmtDataLonga(JOGO.cal, dia) + '</div><h1>Dia da eleição · ' + turno + 'º turno</h1></div></header>' +
    '<main class="container gutter pilha-g"><div class="mesa mesa-plana">' +
    '<section class="cartao cartao-corpo pilha"><h2>As últimas pesquisas</h2><p class="sec">Média das pesquisas divulgadas até a véspera, em votos válidos (sem brancos, nulos e indecisos).</p>' +
    barrasIntencao(val, ids, { casas: 1 }) +
    '<p class="mudo pequeno">Pesquisas erram: a margem de erro vale para cada instituto, e eleitores decidem o voto na última hora.</p></section>' +
    '<section class="cartao cartao-corpo pilha"><h2>' + (c.ativo ? 'Seu dia' : 'O dia da eleição') + '</h2>' +
    (c.ativo ? '<p>Você vota cedo em ' + esc(ESTADO_POR_UF[c.uf].capital) + ', cercado de apoiadores e câmeras. Às 17h (horário de Brasília) as urnas fecham em todo o país e começa a totalização no TSE.</p>' : '<p>Às 17h (horário de Brasília) as urnas fecham em todo o país e começa a totalização no TSE.</p>') +
    '<p class="sec">As urnas das capitais e grandes cidades costumam ser totalizadas primeiro. O interior e as regiões mais distantes, onde a transmissão é via satélite, chegam depois. A liderança pode mudar ao longo da noite.</p>' +
    '<div><button class="btn btn-confirma btn-grande" data-a="iniciarApuracao">Acompanhar a apuração</button></div></section>' +
    '</div></main>';
};

var VELOCIDADES = [['0', 'Pausar'], ['2', '1×'], ['8', '4×'], ['30', '15×']];

ACOES_UI.iniciarApuracao = function () {
  var existente = JOGO.fase === 'apuracao1' ? JOGO.resultado1 : JOGO.resultado2;
  var res = existente || realizarEleicao(JOGO);
  salvarJogo(true);
  UI.apur = { res: res, t: 0, vel: 8, ticker: [], marcos: {}, lider: null, fim: false, situacao: null, ufsFim: {} };
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

function faixaResultado() {
  var a = UI.apur, res = a.res, c = jogador(JOGO);
  var nome = function (id) { return candPorId(JOGO, id).urna; };
  var o = res.ordem;
  var txt, cls;
  if (res.turno === 1 && res.pct[o[0]] > 50) {
    txt = nome(o[0]) + ' ' + eleitoA(candPorId(JOGO, o[0])) + ' no 1º turno com ' + fmtPct(res.pct[o[0]], 2);
    cls = o[0] === c.id ? '' : 'derrota';
  } else if (res.turno === 1) {
    txt = '2º turno: ' + nome(o[0]) + ' × ' + nome(o[1]);
    cls = (o[0] === c.id || o[1] === c.id) ? 'segundo' : 'derrota';
  } else {
    txt = nome(o[0]) + ' ' + eleitoA(candPorId(JOGO, o[0])) + ' presidente com ' + fmtPct(res.pct[o[0]], 2);
    cls = o[0] === c.id ? '' : 'derrota';
  }
  return '<div class="faixa-resultado ' + cls + '"><span>' + esc(txt) + '</span><button class="btn btn-branco" data-a="posApuracao">Continuar</button></div>';
}

TELAS.apuracao = function () {
  var a = UI.apur;
  var parcial = apuracaoParcial(a.res, a.t);
  return '<div class="apuracao"><header class="apur-topo gutter"><div class="apur-topo-grade">' +
    '<div><div class="rotulo" style="color:var(--urna-muted)">Apuração · Presidente · ' + a.res.turno + 'º turno</div><div class="relogio" id="ap-relogio">' + horaApuracao(a.t) + '</div></div>' +
    '<div class="secoes"><span class="rotulo" style="color:var(--urna-muted)">Seções totalizadas</span><span class="big" id="ap-pct">' + fmtPct(parcial.nac.pctApurado, 2) + '</span><div class="trilho"><i id="ap-barra" style="width:' + parcial.nac.pctApurado + '%"></i></div></div>' +
    '<div class="velocidades">' + VELOCIDADES.map(function (v) { return '<button class="chip' + (String(a.vel) === v[0] ? ' ativo' : '') + '" data-a="velApur" data-v="' + v[0] + '">' + v[1] + '</button>'; }).join('') +
    '<button class="chip" data-a="fimApur">Ir para o fim</button></div></div></header>' +
    '<main class="apur-grade gutter"><div class="pilha"><div id="ap-faixa">' + (a.fim ? faixaResultado() : '') + '</div><div class="placar" id="ap-placar">' + placarHtml(parcial) + '</div>' +
    '<section class="painel cartao-corpo" id="ap-resumo">' + resumoVotosHtml(parcial) + '</section>' +
    '<section class="painel cartao-corpo pilha"><h3>Plantão da apuração</h3><div class="ticker" id="ap-ticker"></div></section></div>' +
    '<div class="pilha"><section class="painel mapa-caixa pilha" id="ap-mapa">' + mapaSvg({ preencher: preencherMapaApuracao(parcial), acao: 'nada', titulo: 'Mapa da apuração' }) + '<div class="dica-mapa" hidden></div>' +
    '<div class="legenda">' + a.res.ids.map(function (id) { var c = candPorId(JOGO, id); return '<span class="it"><span class="sw" style="--cor:' + cor(c) + '"></span>' + esc(c.urna) + '</span>'; }).join('') + '<span class="it mudo">Mais forte = maior vantagem e mais urnas apuradas</span></div></section>' +
    '<section class="painel cartao-corpo pilha"><h3>Por estado</h3><div id="ap-tabela">' + tabelaUFApuracao(parcial) + '</div></section></div></main></div>';
};
TELAS.apuracao_depois = function () {
  atualizarTicker();
  ligarDicasMapa(document.getElementById('ap-mapa'), function (uf) {
    var p = apuracaoParcial(UI.apur.res, UI.apur.t).uf[uf];
    var o = ordenarPor(p.votos, UI.apur.res.ids).slice(0, 3);
    return '<b>' + esc(ESTADO_POR_UF[uf].nome) + '</b> · ' + fmtPct(p.pct, 1) + ' apurado<br>' + (p.validos > 0 ? o.map(function (id) { return esc(candPorId(JOGO, id).urna) + ' ' + fmtPct(p.votos[id] / p.validos * 100); }).join(' · ') : 'Aguardando urnas');
  });
};

function atualizarTicker() {
  var el = document.getElementById('ap-ticker');
  if (!el) return;
  el.innerHTML = UI.apur.ticker.length ? UI.apur.ticker.map(function (i) { return '<div class="it"><b>' + i.h + '</b><span>' + esc(i.txt) + '</span></div>'; }).join('') : '<p class="mudo pequeno">As urnas fecham às 17h. Aguardando os primeiros boletins.</p>';
}

function atualizarApuracao() {
  var a = UI.apur;
  var parcial = apuracaoParcial(a.res, a.t);
  var nTicker = a.ticker.length;
  verificarMarcos(parcial);
  var set = function (id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; };
  set('ap-relogio', horaApuracao(a.t));
  set('ap-pct', fmtPct(parcial.nac.pctApurado, 2));
  var barra = document.getElementById('ap-barra'); if (barra) barra.style.width = parcial.nac.pctApurado + '%';
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
  if (a.ticker.length !== nTicker) atualizarTicker();
  if (a.t >= FIM_APURACAO && !a.fim) {
    a.fim = true;
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
  var turno = UI.apur.res.turno;
  UI.apur = null;
  if (turno === 1) {
    var f = resolverPrimeiroTurno(JOGO);
    salvarJogo(true);
    irPara(f === 'fim' ? 'fim' : f);
  } else {
    resolverSegundoTurno(JOGO);
    salvarJogo(true);
    irPara('fim');
  }
};
