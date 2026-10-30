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

/* ---------- Disputas estaduais: tabelas e Congresso ---------- */

function tabelaMajEst(r, titulo) {
  var c = jogador(JOGO);
  return '<h4>' + esc(titulo) + '</h4><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Candidato</th><th>Partido</th><th class="n">Votos</th><th class="n">%</th></tr></thead><tbody>' +
    r.ordem.map(function (id, i) {
      var o = JOGO.est.cands[id];
      var el = r.cargo === 'senador' ? i < r.vagas : (i === 0 && (r.turno === 2 || r.pct[id] > 50));
      return '<tr' + (o.id === c.id ? ' class="voce"' : '') + '><td>' + nomeCand(o) + (el ? ' <b class="bom pequeno">eleit' + oa(o) + '</b>' : '') + '</td><td>' + o.numero + ' · ' + esc(o.partido) + '</td><td class="n">' + fmtVotos(r.votos[id]) + '</td><td class="n">' + fmtPct(r.pct[id], 2) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

/* Hemiciclo: cadeiras dispostas em semicírculo, partidos da esquerda para a direita. */
function hemiciclo(cad, linhas, titulo) {
  var n = soma(Object.keys(cad).map(function (k) { return cad[k]; }));
  var W = 400, cx = 200, cy = 205, r0 = 70, r1 = 195;
  var raios = [];
  for (var i = 0; i < linhas; i++) raios.push(r0 + (r1 - r0) * i / Math.max(1, linhas - 1));
  var totR = soma(raios);
  var porLinha = raios.map(function (r) { return Math.max(1, Math.round(n * r / totR)); });
  porLinha[linhas - 1] += n - soma(porLinha);
  var pontos = [];
  raios.forEach(function (r, li) {
    var k = porLinha[li];
    for (var j = 0; j < k; j++) {
      var ang = Math.PI * (1 - (k === 1 ? 0.5 : j / (k - 1)));
      pontos.push({ x: cx + r * Math.cos(ang), y: cy - r * Math.sin(ang), ang: ang });
    }
  });
  pontos.sort(function (a, b) { return b.ang - a.ang; });
  var ord = Object.keys(cad).filter(function (s) { return cad[s] > 0; }).sort(function (a, b) { return PARTIDO_POR_SIGLA[a].ideo - PARTIDO_POR_SIGLA[b].ideo; });
  var rr = Math.min(6.5, (r1 - r0) / linhas * 0.42);
  var k2 = 0, circ = [];
  ord.forEach(function (s) {
    for (var q = 0; q < cad[s]; q++) {
      var pt = pontos[k2++];
      if (pt) circ.push('<circle cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) + '" r="' + rr.toFixed(1) + '" fill="' + corIdeologia(PARTIDO_POR_SIGLA[s].ideo) + '"><title>' + s + ': ' + cad[s] + '</title></circle>');
    }
  });
  return '<svg class="hemiciclo" viewBox="0 0 ' + W + ' 215" role="img" aria-label="' + esc(titulo) + '">' + circ.join('') +
    '<text x="200" y="196" text-anchor="middle" style="font: 700 22px var(--font-display); fill: var(--ink)">' + n + '</text></svg>';
}

function tabelaBancadas(cad, clausula) {
  var ord = Object.keys(cad).filter(function (s) { return cad[s] > 0 || (clausula && clausula[s].pct > 0.5); }).sort(function (a, b) { return cad[b] - cad[a]; });
  return '<div class="tabela-caixa"><table class="tabela"><thead><tr><th>Partido</th><th>Campo</th><th class="n">Cadeiras</th>' + (clausula ? '<th class="n">Votos</th><th>Cláusula</th>' : '') + '</tr></thead><tbody>' +
    ord.map(function (s) {
      var p = PARTIDO_POR_SIGLA[s];
      return '<tr><td><span class="pt" style="--cor:' + corIdeologia(p.ideo) + '"></span>' + s + '</td><td class="pequeno mudo">' + rotuloIdeologia(p.ideo) + '</td><td class="n">' + cad[s] + '</td>' +
        (clausula ? '<td class="n">' + fmtPct(clausula[s].pct, 1) + '</td><td class="pequeno ' + (clausula[s].passou ? '' : 'ruim') + '">' + (clausula[s].passou ? 'Superou' : 'Não superou') + '</td>' : '') + '</tr>';
    }).join('') + '</tbody></table></div>';
}

function secaoCongresso() {
  var r = JOGO.resEst1;
  if (!r) return '';
  var base = baseDoPresidente(JOGO);
  var v = JOGO.vencedor ? candPorId(JOGO, JOGO.vencedor) : null;
  return '<section class="pilha"><h2>O novo Congresso</h2><div class="mesa mesa-plana">' +
    '<div class="cartao cartao-corpo pilha"><h3>Câmara dos Deputados</h3>' + hemiciclo(r.camara, 9, 'Composição da Câmara') + tabelaBancadas(r.camara, r.clausula) +
    '<p class="mudo pequeno">Cores pelo campo ideológico: esquerda em vermelho, centro em cinza, direita em azul. A cláusula de desempenho exige 2,5% dos votos em 9 estados ou 13 deputados; quem não supera perde fundo partidário e tempo de TV.</p></div>' +
    '<div class="pilha"><div class="cartao cartao-corpo pilha"><h3>Senado Federal</h3>' + hemiciclo(r.senado, 4, 'Composição do Senado') + tabelaBancadas(r.senado) + '</div>' +
    (base && v ? '<div class="cartao cartao-corpo pilha"><h3>Governabilidade de ' + esc(v.urna) + '</h3><p class="sec pequeno">Base provável: coligação e partidos que costumam aderir ao governo (' + esc(base.partidos.join(', ')) + ').</p>' +
      '<div class="resumo-votos"><div class="it"><span class="rotulo">Câmara</span><span class="v ' + (base.camara >= 257 ? 'bom' : 'ruim') + '">' + base.camara + ' de 513</span></div>' +
      '<div class="it"><span class="rotulo">Senado</span><span class="v ' + (base.senado >= 41 ? 'bom' : 'ruim') + '">' + base.senado + ' de 81</span></div>' +
      '<div class="it"><span class="rotulo">Emendas constitucionais</span><span class="v">' + (base.camara >= 308 && base.senado >= 49 ? 'Tem 3/5' : 'Sem 3/5') + '</span></div></div></div>' : '') +
    '</div></div></section>';
}

function secaoGovernadores() {
  if (!JOGO.resEst1) return '';
  var final = function (uf) { return (JOGO.resEst2 && JOGO.resEst2.gov[uf]) || JOGO.resEst1.gov[uf]; };
  var mapa = mapaSvg({
    acao: 'nada', titulo: 'Governadores eleitos', preencher: function (uf) {
      var v = JOGO.est.cands[final(uf).ordem[0]];
      var pal = v.palanque && candPorId(JOGO, v.palanque);
      return { cor: pal ? cor(pal) : 'var(--div-0)', opacidade: 0.9 };
    }
  });
  var cont = {};
  UFS_MAPA.forEach(function (uf) { var v = JOGO.est.cands[final(uf).ordem[0]]; var k = v.palanque || 'neutro'; cont[k] = (cont[k] || 0) + 1; });
  return '<section class="pilha"><h2>Governadores eleitos</h2><div class="mesa mesa-plana"><div class="cartao cartao-corpo pilha">' + mapa +
    '<div class="legenda">' + Object.keys(cont).map(function (k) { var x = candPorId(JOGO, k); return '<span class="it"><span class="sw" style="--cor:' + (x ? cor(x) : 'var(--div-0)') + '"></span>' + (x ? 'Aliados de ' + esc(x.urna) : 'Neutros') + ': ' + cont[k] + '</span>'; }).join('') + '</div></div>' +
    '<div class="cartao cartao-corpo"><div class="tabela-caixa"><table class="tabela"><thead><tr><th>UF</th><th>Eleito(a)</th><th>Partido</th><th class="n">%</th><th>Turno</th></tr></thead><tbody>' +
    UFS_MAPA.map(function (uf) {
      var r = final(uf), v = JOGO.est.cands[r.ordem[0]];
      var pal = v.palanque && candPorId(JOGO, v.palanque);
      return '<tr' + (v.jogador ? ' class="voce"' : '') + '><td>' + uf + '</td><td><span class="pt" style="--cor:' + (pal ? cor(pal) : 'var(--div-0)') + '"></span>' + esc(v.urna) + (v.incumbente ? ' <span class="mudo pequeno">reeleit' + oa(v) + '</span>' : '') + '</td><td>' + v.partido + '</td><td class="n">' + fmtNum(r.pct[v.id], 1) + '</td><td>' + (JOGO.resEst2 && JOGO.resEst2.gov[uf] ? '2º' : '1º') + '</td></tr>';
    }).join('') + '</tbody></table></div></div></div></section>';
}

/* Resultado do jogador na própria disputa (cartão). */
function cartaoResultadoJogador() {
  var c = jogador(JOGO);
  if (c.escopo !== 'estadual') {
    var resF = JOGO.resultado2 || JOGO.resultado1;
    return '<section class="cartao cartao-corpo pilha"><h3>' + (JOGO.resultado2 ? 'Resultado do 2º turno' : 'Resultado do 1º turno') + '</h3>' + tabelaResultado(resF) + mapaResultado(resF) +
      (JOGO.resultado2 ? '<h4>1º turno</h4>' + tabelaResultado(JOGO.resultado1) : '') + '</section>';
  }
  if (c.cargo === 'governador') {
    var r1 = JOGO.resEst1.gov[c.uf], r2 = JOGO.resEst2 && JOGO.resEst2.gov[c.uf];
    return '<section class="cartao cartao-corpo pilha"><h3>Governo ' + esc(prepUF(c.uf, 'de')) + '</h3>' + (r2 ? tabelaMajEst(r2, '2º turno') : '') + tabelaMajEst(r1, '1º turno') + '</section>';
  }
  if (c.cargo === 'senador') return '<section class="cartao cartao-corpo pilha"><h3>Senado · ' + esc(ESTADO_POR_UF[c.uf].nome) + '</h3>' + tabelaMajEst(JOGO.resEst1.sen[c.uf], (JOGO.resEst1.sen[c.uf].vagas === 2 ? 'Duas vagas' : 'Uma vaga')) + '</section>';
  var rp = JOGO.resEst1[c.cargo][c.uf], jr = rp.jogador;
  var cadOrd = Object.keys(rp.cadeiras).filter(function (s) { return rp.cadeiras[s] > 0; }).sort(function (a, b) { return rp.cadeiras[b] - rp.cadeiras[a]; });
  return '<section class="cartao cartao-corpo pilha"><h3>' + (c.cargo === 'depfed' ? 'Câmara' : 'Assembleia') + ' · ' + esc(ESTADO_POR_UF[c.uf].nome) + '</h3>' +
    '<div class="resumo-votos"><div class="it"><span class="rotulo">Seus votos</span><span class="v">' + fmtVotos(jr.votos) + '</span></div>' +
    '<div class="it"><span class="rotulo">Posição na lista</span><span class="v">' + jr.posicaoLista + 'º</span></div>' +
    '<div class="it"><span class="rotulo">Cadeiras do ' + esc(c.partido) + '</span><span class="v">' + jr.cadeirasPartido + '</span></div>' +
    '<div class="it"><span class="rotulo">Quociente eleitoral</span><span class="v">' + fmtVotos(rp.qe) + '</span></div></div>' +
    '<p>' + (jr.eleito ? '<b class="bom">' + maiuscula(eleitoA(c)) + (jr.via === 'quociente' ? ' pelo quociente partidário.' : ' na distribuição das sobras.') + '</b>' : '<b class="ruim">Não ' + eleitoA(c) + '.</b> ' + (jr.posicaoLista > jr.cadeirasPartido ? 'O partido fez ' + jr.cadeirasPartido + ' cadeira(s) e você ficou em ' + jr.posicaoLista + 'º na lista: é ' + (c.genero === 'F' ? 'suplente.' : 'suplente.') : '')) + '</p>' +
    '<h4>Lista do ' + esc(c.partido) + '</h4><div class="tabela-caixa"><table class="tabela"><tbody>' + jr.lista.map(function (x, i) {
      return '<tr' + (x.jogador ? ' class="voce"' : '') + (i === jr.cadeirasPartido - 1 ? ' style="border-bottom:2px solid var(--confirma)"' : '') + '><td class="n">' + (i + 1) + '</td><td>' + esc(x.urna) + '</td><td class="n">' + fmtVotos(x.votos) + '</td></tr>';
    }).join('') + '</tbody></table></div>' +
    '<h4>Cadeiras por partido no estado</h4>' + barrasPartidos(rp.cadeiras, [c.partido]) + '</section>';
}

function tituloFim() {
  var c = jogador(JOGO), venceu = JOGO.venceuJogador;
  if (!venceu) return 'Fim da campanha';
  if (JOGO.cargo === 'presidente') return c.genero === 'F' ? 'Presidenta eleita' : 'Presidente eleito';
  return nomeCargo(JOGO.cargo, c.genero) + (c.genero === 'F' ? ' eleita' : ' eleito');
}

/* ---------- Depois do 1º turno: acompanhar o restante da eleição ---------- */
TELAS.acompanhar = function () {
  var c = jogador(JOGO);
  var v = JOGO.vencedor ? candPorId(JOGO, JOGO.vencedor) : null;
  var fins = JOGO.finalistas && JOGO.finalistas.length === 2 ? JOGO.finalistas.map(function (id) { return candPorId(JOGO, id).urna; }) : null;
  return '<header class="cabecalho-tela gutter"><div style="max-width:1180px;margin:0 auto"><div class="rotulo">Resultado do 1º turno</div><h1>' + esc(tituloParcial()) + '</h1></div></header>' +
    '<main class="container gutter pilha-g"><div class="mesa mesa-plana">' + cartaoResultadoJogador() +
    '<section class="cartao cartao-corpo pilha"><h3>O que vem agora</h3>' +
    '<p>' + (v ? esc(v.nome) + ' foi ' + eleitoA(v) + ' presidente no 1º turno.' : 'Presidente: 2º turno entre ' + esc(fins.join(' e ')) + '.') + '</p>' +
    '<p>Governador: 2º turno em ' + JOGO.govSegundo.length + ' estado(s)' + (JOGO.govSegundo.length ? ' (' + JOGO.govSegundo.join(', ') + ')' : '') + '.</p>' +
    '<p class="sec">A campanha continua sem você na disputa. Acompanhe o 2º turno e veja como fica o país.</p>' +
    '<div><button class="btn btn-confirma btn-grande" data-a="acompanharSegundo">Acompanhar o 2º turno</button></div></section></div>' +
    secaoCongresso() + '</main>';
};
TELAS.acompanhar_depois = function () {};
function tituloParcial() {
  var c = jogador(JOGO);
  var rj = resultadoJogador(JOGO);
  if (JOGO.cargo === 'presidente') return c.id === JOGO.vencedor ? (c.genero === 'F' ? 'Presidenta eleita no 1º turno' : 'Presidente eleito no 1º turno') : 'Fim da linha no 1º turno';
  if (rj.venceu) return nomeCargo(JOGO.cargo, c.genero) + (c.genero === 'F' ? ' eleita' : ' eleito');
  return 'Não foi desta vez';
}
ACOES_UI.acompanharSegundo = function () {
  simularSegundoTurnoAutomatico(JOGO);
  salvarJogo(true);
  irPara('vespera');
};

/* ---------- 2º turno de governador com o jogador ---------- */
TELAS.entreturnosGov = function () {
  var c = jogador(JOGO), r = JOGO.resEst1.gov[c.uf];
  var fins = candsDisputa(JOGO, c.uf, 'governador');
  var rival = fins.filter(function (o) { return o.id !== c.id; })[0];
  var elim = candsDisputa(JOGO, c.uf, 'governador', true).filter(function (o) { return o.eliminado; }).sort(function (a, b) { return r.pct[b.id] - r.pct[a.id]; });
  JOGO.apoiosGov2 = JOGO.apoiosGov2 || {};
  var cen = intencoesEstadual(JOGO, c.uf, 'governador', { modo: 'segundo' });
  var val = paraValidos(cen.total, cen.ids);
  return '<header class="cabecalho-tela gutter"><div style="max-width:1180px;margin:0 auto"><div class="rotulo">' + fmtDataLonga(JOGO.cal, JOGO.cal.eleicao1 + 1) + '</div><h1>2º turno ' + esc(prepUF(c.uf, 'em')) + '</h1></div></header>' +
    '<main class="container gutter pilha-g"><div class="mesa mesa-plana"><section class="pilha"><div class="cartao cartao-corpo pilha"><h2>Você contra ' + esc(rival.urna) + '</h2>' +
    '<p class="sec">Você teve ' + fmtPct(r.pct[c.id], 2) + ' dos votos válidos; ' + esc(rival.urna) + ' teve ' + fmtPct(r.pct[rival.id], 2) + '.</p>' +
    '<div><div class="rotulo">Primeira simulação de 2º turno</div>' + barrasIntencao(val, ordenarPor(val, cen.ids), { casas: 1, max: 100 }) + '</div></div>' +
    '<div class="cartao cartao-corpo pilha"><h3>Negocie os apoios dos derrotados</h3>' +
    elim.map(function (x) {
      var dec = JOGO.apoiosGov2[x.id];
      var status = dec === undefined || dec === null ? '' : dec === 'neutro' ? '<b class="mudo">Fica neutro</b>' : dec === c.id ? '<b class="bom">Apoia você</b>' : '<b class="ruim">Apoia ' + esc(rival.urna) + '</b>';
      return '<div class="entre" style="border-bottom:1px solid var(--line);padding-bottom:10px"><div style="min-width:0;flex:1">' + nomeCand(x) + ' <span class="mudo">' + esc(x.partido) + ' · ' + fmtPct(r.pct[x.id], 1) + '</span></div>' +
        (status || '<div class="linha-botoes"><button class="btn btn-peq" data-a="pedirApoioGov" data-id="' + x.id + '" data-o="programa">Incorporar propostas</button><button class="btn btn-peq" data-a="pedirApoioGov" data-id="' + x.id + '" data-o="cargos">Oferecer secretarias</button></div>') + '</div>';
    }).join('') + '</div><div><button class="btn btn-confirma btn-grande" data-a="comecar2">Começar a campanha do 2º turno</button></div></section>' +
    '<section class="cartao cartao-corpo pilha">' + tabelaMajEst(r, '1º turno') + '</section></div></main>';
};
ACOES_UI.pedirApoioGov = function (d) {
  var x = JOGO.est.cands[d.id];
  var dec = decidirApoioGov(JOGO, x.uf, x, d.o);
  JOGO.apoiosGov2[d.id] = dec;
  toast(dec === JOGO.jogadorId ? x.urna + ' declara apoio a você!' : dec === 'neutro' ? x.urna + ' prefere ficar neutro.' : x.urna + ' vai apoiar seu adversário.');
  atualizar();
};

/* ---------- Fim ---------- */
TELAS.fim = function () {
  var c = jogador(JOGO);
  var venceu = JOGO.venceuJogador;
  var v = JOGO.vencedor ? candPorId(JOGO, JOGO.vencedor) : null;
  var estados = Object.keys(c.stats.estados).length;
  var debMed = c.stats.debates.length ? soma(c.stats.debates.map(function (x) { return x.media; })) / c.stats.debates.length : null;
  var series = serieDePesquisas('1t').filter(function (s) { return s.pontos.length; });
  var graf = '';
  if (series.length) {
    var yMax = 0; series.forEach(function (s) { s.pontos.forEach(function (p) { yMax = Math.max(yMax, p.y); }); });
    var ticks = []; for (var d = 0; d <= JOGO.cal.eleicao1; d += 7) ticks.push({ x: d, rotulo: fmtDataCurta(JOGO.cal, d) });
    graf = graficoLinhas({ series: series, xMin: 0, xMax: JOGO.cal.eleicao1, yMax: yMax + 5, ticksX: ticks, titulo: 'Pesquisas presidenciais do 1º turno', fmtX: function (x) { return fmtData(JOGO.cal, x); } });
  }
  var sub;
  if (JOGO.cargo === 'presidente') sub = venceu ? esc(c.nome) + ' toma posse em 1º de janeiro de ' + (JOGO.cal.ano + 1) + ' como presidente da República.' : esc(v.nome) + ' (' + esc(v.partido) + ') foi ' + eleitoA(v) + ' presidente da República.';
  else sub = (venceu ? esc(c.nome) + ' foi ' + eleitoA(c) + ' ' + nomeCargo(JOGO.cargo, c.genero).toLowerCase() + ' ' + esc(prepUF(c.uf, 'por')) + '.' : esc(c.nome) + ' não foi ' + eleitoA(c) + ' desta vez.') + (v ? ' ' + esc(v.urna) + ' (' + esc(v.partido) + ') é ' + (v.genero === 'F' ? 'a nova presidenta' : 'o novo presidente') + '.' : '');
  var presBloco = JOGO.cargo !== 'presidente' && JOGO.resultado1 ? '<section class="cartao cartao-corpo pilha"><h3>Presidente da República</h3>' + tabelaResultado(JOGO.resultado2 || JOGO.resultado1) + mapaResultado(JOGO.resultado2 || JOGO.resultado1) + '</section>' : '';
  return '<header class="cabecalho-tela gutter" style="' + (venceu ? 'background:var(--confirma)' : '') + '"><div style="max-width:1180px;margin:0 auto"><div class="rotulo" style="' + (venceu ? 'color:#e4f5ea' : '') + '">' + fmtDataLonga(JOGO.cal, JOGO.resultado2 || JOGO.resEst2 ? JOGO.cal.eleicao2 : JOGO.cal.eleicao1) + '</div><h1>' + esc(tituloFim()) + '</h1>' +
    '<p style="margin-top:8px;font-size:1.1rem">' + sub + '</p></div></header>' +
    '<main class="container gutter pilha-g">' +
    (JOGO.conquistas.length ? '<section class="pilha"><h2>Conquistas</h2><div class="trofeus">' + JOGO.conquistas.map(function (q) { return '<div class="trofeu"><b>' + esc(q.nome) + '</b><span class="sec pequeno">' + esc(q.desc) + '</span></div>'; }).join('') + '</div></section>' : '') +
    '<div class="mesa mesa-plana">' + cartaoResultadoJogador() +
    '<section class="pilha">' + presBloco +
    '<div class="cartao cartao-corpo pilha"><h3>Sua campanha em números</h3><div class="resumo-votos">' +
    '<div class="it"><span class="rotulo">Comícios</span><span class="v">' + c.stats.comicios + '</span></div>' +
    (c.escopo !== 'estadual' ? '<div class="it"><span class="rotulo">Estados visitados</span><span class="v">' + estados + ' de 27</span></div>' : '') +
    '<div class="it"><span class="rotulo">Apoios conquistados</span><span class="v">' + c.stats.apoiosGanhos + '</span></div>' +
    '<div class="it"><span class="rotulo">Propostas</span><span class="v">' + c.stats.propostas + '</span></div>' +
    '<div class="it"><span class="rotulo">Ataques</span><span class="v">' + c.stats.ataques + '</span></div>' +
    '<div class="it"><span class="rotulo">Nota média em debates</span><span class="v">' + (debMed === null ? '—' : fmtNum(debMed, 1)) + '</span></div>' +
    '<div class="it"><span class="rotulo">Arrecadado</span><span class="v">' + fmtDinheiro(c.arrecadado) + '</span></div>' +
    '<div class="it"><span class="rotulo">Gasto total</span><span class="v">' + fmtDinheiro(c.gasto) + '</span></div>' +
    '</div></div>' +
    (graf ? '<div class="cartao cartao-corpo pilha"><h3>Pesquisas presidenciais do 1º turno</h3>' + graf + '</div>' : '') +
    '</section></div>' + secaoCongresso() + secaoGovernadores() +
    '<div class="linha-botoes"><button class="btn btn-confirma btn-grande" data-a="novaPartida">Nova campanha</button><button class="btn btn-grande" data-a="voltarInicioFim">Tela inicial</button></div>' +
    '</main>';
};
TELAS.fim_depois = function () { ligarGraficos(); };

ACOES_UI.novaPartida = function () { apagarJogo(); JOGO = null; irPara('config'); };
ACOES_UI.voltarInicioFim = function () { apagarJogo(); JOGO = null; irPara('inicio'); };
