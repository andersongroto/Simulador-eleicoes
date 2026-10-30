/* Painel das campanhas estaduais (governador, senador e deputados). */

function ehDeputadoJog() { var c = jogador(JOGO); return c.cargo === 'depfed' || c.cargo === 'depest'; }

function abasEst() {
  return [['agenda', 'Agenda'], ['pesquisas', ehDeputadoJog() ? 'Projeção' : 'Pesquisas'], ['apoios', 'Apoios'], ['estrategia', ehDeputadoJog() ? 'Programa' : 'TV e programa'],
    ['noticias', 'Notícias'], ['adversarios', ehDeputadoJog() ? 'Sua lista' : 'Adversários'], ['brasil', 'Brasil']];
}

function topoEst() {
  var c = jogador(JOGO);
  var t = turnoAtual(JOGO);
  var faixa = JOGO.config.ritmo === 'diario' ? fmtData(JOGO.cal, t[0]) : fmtDataCurta(JOGO.cal, t[0]) + ' a ' + fmtDataCurta(JOGO.cal, t[1]);
  var rodada = (JOGO.config.ritmo === 'diario' ? 'Dia ' : 'Semana ') + (JOGO.turnoIdx + 1) + ' de ' + JOGO.turnos.length;
  var en = Math.round(c.energia);
  var med = medidaJogador(JOGO);
  return '<header class="topo gutter">' +
    '<div class="cand"><span class="num">' + c.numero + '</span><div><div class="nome">' + esc(c.urna) + '</div><div class="partido">' + esc(nomeCargo(c.cargo, c.genero)) + ' · ' + esc(c.partido) + ' · ' + c.uf + '</div></div></div>' +
    '<div class="data"><span class="rotulo">' + (JOGO.fase === 'campanha2' ? '2º turno' : '1º turno') + ' · ' + rodada + '</span><span class="d">' + faixa + '</span><span class="pequeno" style="color:var(--urna-muted)">' + diasParaEleicao() + ' dias para a eleição</span></div>' +
    '<div class="metricas">' +
    '<div class="metrica"><span class="rotulo">' + (med.votos ? 'Votos (estim.)' : 'Pesquisas') + '</span><span class="v">' + med.fmt(med.valor) + '</span></div>' +
    '<div class="metrica"><span class="rotulo">Caixa</span><span class="v">' + fmtDinheiro(c.dinheiro) + '</span></div>' +
    '<div class="metrica"><span class="rotulo">Gasto / teto</span><span class="v">' + fmtNum(c.gasto, 2) + ' / ' + fmtNum(tetoDoCandidato(JOGO, c), 2) + ' mi</span></div>' +
    '<div class="metrica"><span class="rotulo">Energia ' + en + '%</span><div class="medidor' + (en < 25 ? ' critico' : en < 50 ? ' baixo' : '') + '"><i style="width:' + en + '%"></i></div></div>' +
    (c.tvShare ? '<div class="metrica"><span class="rotulo">TV</span><span class="v">' + fmtPct(c.tvShare * 100, 0) + ' do horário</span></div>' : '') +
    '<button class="btn btn-peq" data-a="menuJogo">Menu</button>' +
    '</div></header>';
}

/* ---------- Estado e zonas ---------- */

function estimativaZonaJog(z) {
  var c = jogador(JOGO);
  if (ehDeputadoJog()) return null;
  var cache = cacheEstadual(JOGO, c.uf, c.cargo);
  var ult = JOGO.internaEstDia;
  var sd = ult !== undefined && JOGO.dia - ult <= 7 ? 1 : 4;
  var out = {};
  cache.ids.forEach(function (id) { out[id] = Math.max(0, cache.zona[z][id] + ruidoFixo(JOGO.seed + ':' + z + ':' + id + ':' + Math.floor(JOGO.dia / 7)) * sd); });
  return out;
}

function cartaoZona(z) {
  var c = jogador(JOGO);
  var nomes = nomesZonas(c.uf);
  var cel = celulasEstado(c.uf);
  var peso = cel.zonaPeso[z];
  var segs = SEG_IDS.slice().sort(function (a, b) { return cel.zonaSeg[z][b] - cel.zonaSeg[z][a]; }).slice(0, 3);
  var est = estimativaZonaJog(z);
  var barras = '';
  if (est) {
    var ids = ordenarPor(est, Object.keys(est)).slice(0, 4);
    if (est[c.id] !== undefined && ids.indexOf(c.id) < 0) ids[3] = c.id;
    barras = barrasIntencao(est, ids, { casas: 0 });
  }
  return '<section class="painel cartao-corpo pilha zona-card">' +
    '<div class="entre"><div><span class="rotulo">' + (z === 'metro' ? 'Capital' : 'Interior') + '</span><h3>' + esc(nomes[z]) + '</h3></div><span class="tag">' + fmtPct(peso * 100, 0) + ' do eleitorado</span></div>' +
    '<div class="resumo-votos"><div class="it"><span class="rotulo">Sua presença</span><span class="v">' + Math.round(c.presenca[z]) + '/100</span></div>' +
    '<div class="it"><span class="rotulo">Te conhecem</span><span class="v">' + Math.round(c.recog[z]) + '%</span></div></div>' +
    (barras ? '<div><div class="rotulo">Estimativa da equipe</div>' + barras + '</div>' : '') +
    '<div class="pequeno sec">Perfis predominantes: ' + segs.map(function (g) { return SEGMENTOS[g].curto + ' ' + Math.round(cel.zonaSeg[z][g] / peso * 100) + '%'; }).join(' · ') + '</div>' +
    '<div class="linha-botoes">' +
    '<button class="btn btn-peq" data-a="prepAcao" data-t="comicio" data-zona="' + z + '">Comício</button>' +
    '<button class="btn btn-peq" data-a="prepAcao" data-t="corpo" data-zona="' + z + '">Corpo a corpo</button>' +
    '<button class="btn btn-peq" data-a="prepAcao" data-t="visita" data-zona="' + z + '">Visita a um público</button>' +
    '</div></section>';
}

function blocoEstadoEst() {
  var c = jogador(JOGO);
  var e = ESTADO_POR_UF[c.uf];
  var pres = c.palanque ? candPorId(JOGO, c.palanque) : null;
  var cacheP = JOGO._cache;
  var presLinha = '';
  if (cacheP && cacheP.uf && cacheP.uf[c.uf] && cacheP.ids.length) {
    var ids = ordenarPor(cacheP.uf[c.uf], cacheP.ids).slice(0, 3);
    presLinha = '<div><div class="rotulo">Presidente ' + esc(prepUF(c.uf, 'em')) + ' (estimativa)</div>' + barrasIntencao(cacheP.uf[c.uf], ids, { casas: 0 }) + '</div>';
  }
  return '<section class="painel cartao-corpo pilha">' +
    '<div class="entre"><div><span class="rotulo">' + REGIOES[e.reg] + ' · ' + fmtNum(e.eleitores, 2) + ' mi de eleitores</span><h2>' + esc(e.nome) + '</h2></div>' +
    '<svg class="silhueta" id="silhueta" viewBox="' + MAPA_BRASIL.viewBox + '" role="img" aria-label="Mapa ' + esc(prepUF(c.uf, 'de')) + '"><path d="' + MAPA_BRASIL.ufs[c.uf].d + '" fill="' + (pres ? cor(pres) : 'var(--seq-3)') + '" fill-opacity="0.85"></path></svg></div>' +
    '<p class="pequeno sec">' + (pres ? 'Seu palanque presidencial: <b>' + esc(pres.urna) + '</b> (' + esc(pres.partido) + '). Eleitores dele tendem a votar em você.' : 'Você está neutro na eleição presidencial.') + (c.palanqueDissidente ? ' <span class="ruim">Dissidência do partido.</span>' : '') + '</p>' +
    presLinha + '</section>' + cartaoZona('metro') + cartaoZona('interior');
}

/* ---------- Agenda ---------- */

function abaAgendaEst() {
  var c = jogador(JOGO);
  var cats = [['rua', 'Nas ruas'], ['midia', 'Mídia'], ['politica', 'Política'], ['estrategia', 'Estratégia']];
  var lista = acoesDoCargo(c.cargo);
  var html = '<div class="entre"><h3>' + (JOGO.config.ritmo === 'diario' ? 'Agenda do dia' : 'Agenda da semana') + '</h3><span class="mudo pequeno">' + JOGO.agenda.length + ' de ' + slotsDoTurno(JOGO) + ' compromissos</span></div>';
  if (!c.ativo) return html + '<p class="sec">Sua disputa terminou. Acompanhe as demais campanhas até a eleição.</p>';
  cats.forEach(function (cat) {
    var acoes = lista.filter(function (k) { return ACOES_EST[k].cat === cat[0]; });
    if (!acoes.length) return;
    html += '<div class="grupo-acoes"><div class="rotulo">' + cat[1] + '</div><div class="grade-acoes">' + acoes.map(function (k) {
      return '<button class="acao-btn' + (UI.acaoSel === k ? ' sel' : '') + '" data-a="prepAcao" data-t="' + k + '"><b>' + ACOES_EST[k].nome + '</b><span>' + ACOES_EST[k].desc + '</span></button>';
    }).join('') + '</div></div>';
  });
  if (UI.acaoSel && ACOES_EST[UI.acaoSel]) html += formAcaoEst();
  return html;
}

function propostasDisponiveisEst(c) {
  var l = PROPOSTAS_EST.filter(function (p) { return p.cargos.indexOf(c.cargo) >= 0; });
  if (c.cargo === 'senador') l = l.concat(PROPOSTAS.filter(function (p) { return ['ir5mil', 'reeleicao', 'foro', 'filasus', 'penas', 'desmatamento', 'tecnico'].indexOf(p.id) >= 0; }));
  return l.filter(function (p) { return c.propostas.indexOf(p.id) < 0 && !JOGO.agenda.some(function (a) { return a.tipo === 'proposta' && a.p.id === p.id; }); });
}

function formAcaoEst() {
  var t = UI.acaoSel, f = UI.formAcao, c = jogador(JOGO), def = ACOES_EST[t];
  var nomes = nomesZonas(c.uf);
  var campos = '';
  var sel = function (k, opts) { return '<select id="fa-' + k + '" data-mudar="campoAcao" data-k="' + k + '">' + opts + '</select>'; };
  var opt = function (v, txt, atual) { return '<option value="' + v + '"' + (v === atual ? ' selected' : '') + '>' + esc(txt) + '</option>'; };
  if (['comicio', 'corpo', 'visita', 'radio'].indexOf(t) >= 0) {
    f.zona = ZONAS.indexOf(f.zona) >= 0 ? f.zona : 'metro';
    campos += '<div class="campo"><label for="fa-zona">Onde</label>' + sel('zona', ZONAS.map(function (z) { return opt(z, nomes[z], f.zona); }).join('')) + '</div>';
  }
  if (t === 'comicio') {
    f.tema = f.tema || c.bandeiras[0] || 'economia';
    campos += '<div class="campo"><label for="fa-tema">Tema do discurso</label>' + sel('tema', TEMA_IDS.map(function (k) { return opt(k, TEMAS[k].nome, f.tema); }).join('')) + '</div>';
  }
  if (t === 'visita') {
    f.seg = f.seg || 'popular';
    campos += '<div class="campo"><label for="fa-seg">Público</label>' + sel('seg', SEG_IDS.map(function (g) { return opt(g, NOMES_VISITA[g], f.seg); }).join('')) + '</div>';
  }
  if (t === 'digital') {
    f.tipo = f.tipo || 'impulsionar';
    var k = escalaCustoCargo(c.cargo, c.uf);
    campos += '<div class="campo"><label for="fa-tipo">Formato</label>' + sel('tipo', [['impulsionar', 'Impulsionar conteúdo (' + fmtDinheiro(1.2 * k) + ')'], ['live', 'Live com apoiadores (' + fmtDinheiro(0.05 * k) + ')'], ['viral', 'Apostar em conteúdo viral (' + fmtDinheiro(0.4 * k) + ', arriscado)']].map(function (o) { return opt(o[0], o[1], f.tipo); }).join('')) + '</div>';
  }
  if (t === 'ataque') {
    var adv = candsDisputa(JOGO, c.uf, c.cargo).filter(function (o) { return !o.jogador; });
    if (!f.alvo || !adv.some(function (o) { return o.id === f.alvo; })) f.alvo = adv.length ? adv[0].id : null;
    f.linha = f.linha || 'corrupcao';
    campos += '<div class="campo"><label for="fa-alvo">Alvo</label>' + sel('alvo', adv.map(function (o) { return opt(o.id, o.urna + ' (' + o.partido + ')', f.alvo); }).join('')) + '</div>';
    campos += '<div class="campo"><label for="fa-linha">Linha de ataque</label>' + sel('linha', Object.keys(LINHAS_ATAQUE).map(function (kk) { return opt(kk, LINHAS_ATAQUE[kk].nome, f.linha); }).join('')) + '</div>';
  }
  if (t === 'apoio') {
    var ops = APOIOS_EST.filter(function (a) { return (!a.cargos || a.cargos.indexOf(c.cargo) >= 0) && c.apoios.indexOf(a.id) < 0; });
    if (!f.alvo || !APOIO_EST_POR_ID[f.alvo] || c.apoios.indexOf(f.alvo) >= 0) f.alvo = ops.length ? ops[0].id : null;
    f.oferta = f.oferta || 'programa';
    campos += '<div class="campo"><label for="fa-alvo">Com quem negociar</label>' + sel('alvo', ops.map(function (a) {
      var ch = chanceApoioEst(JOGO, c, a.id, 'programa');
      return opt(a.id, a.nome + (ch > 0 ? ' · ' + Math.round(ch * 100) + '%' : ' · indisponível'), f.alvo);
    }).join('')) + '</div>';
    campos += '<div class="campo"><label for="fa-oferta">O que oferecer</label>' + sel('oferta', [['programa', 'Compromissos de campanha'], ['cargos', 'Espaço no mandato (mais chance, risco de crítica)']].map(function (o) { return opt(o[0], o[1], f.oferta); }).join('')) + '</div>';
    if (f.alvo) campos += '<p class="pequeno"><b>Chance estimada: ' + Math.round(chanceApoioEst(JOGO, c, f.alvo, f.oferta) * 100) + '%</b> · ' + esc(APOIO_EST_POR_ID[f.alvo].desc) + '</p>';
  }
  if (t === 'proposta') {
    var disp = propostasDisponiveisEst(c);
    if (!f.id || !disp.some(function (p) { return p.id === f.id; })) f.id = disp.length ? disp[0].id : null;
    campos += '<div class="campo"><label for="fa-id">Proposta</label>' + sel('id', disp.map(function (p) { return opt(p.id, p.nome, f.id); }).join('')) + '</div>';
    if (f.id) {
      var pr = PROPOSTA_EST_POR_ID[f.id] || PROPOSTA_POR_ID[f.id];
      var efs = [];
      for (var g in pr.seg) efs.push(SEGMENTOS[g].curto + (pr.seg[g] > 0 ? ' ▲' : ' ▼'));
      if (pr.zona) for (var z in pr.zona) efs.push(nomes[z] + ' ▲');
      campos += '<p class="pequeno sec">"' + esc(pr.texto) + '"<br>Efeito: ' + efs.join(' · ') + (Math.abs(pr.ideo - c.x) > 75 ? '<br><b class="ruim">Contradiz sua trajetória.</b>' : '') + '</p>';
    }
  }
  if (t === 'presidenciavel') {
    var pres = c.palanque ? candPorId(JOGO, c.palanque) : null;
    campos += '<p class="pequeno ' + (pres && pres.ativo ? 'sec' : 'ruim') + '">' + (pres && pres.ativo ? esc(pres.urna) + ' tem ' + fmtNum((JOGO._cache.uf[c.uf] || {})[pres.id] || 0, 0) + '% no estado (estimativa). A agenda depende da disponibilidade do presidenciável.' : 'Você não tem presidenciável ativo para trazer ao estado.') + '</p>';
  }
  if (t === 'dobrada') campos += '<p class="pequeno sec">' + (c.dobrada ? 'Agenda com ' + esc(c.dobrada.urna) + ' (' + esc(c.dobrada.cargoNome.toLowerCase()) + '), forte em ' + esc(nomes[c.dobrada.zona]) + '.' : 'Você não escolheu dobradinha na pré-campanha.') + '</p>';
  var p = paramsDoFormEst(t);
  var custo = def.custo(JOGO, c, p);
  var livres = slotsDoTurno(JOGO) - JOGO.agenda.length;
  var plan = custoPlanejado();
  var semDinheiro = custo + plan.dinheiro > c.dinheiro + 1e-9 || c.gasto + plan.dinheiro + custo > tetoDoCandidato(JOGO, c) + 1e-9;
  var invalido = (t === 'apoio' && (!f.alvo || chanceApoioEst(JOGO, c, f.alvo, f.oferta) <= 0)) || (t === 'proposta' && !f.id) || (t === 'ataque' && !f.alvo);
  return '<div class="form-acao"><div class="entre"><h4>' + def.nome + '</h4><button class="btn btn-ghost btn-peq" data-a="cancelarAcao">Cancelar</button></div>' +
    (campos ? '<div class="grade-campos">' + campos + '</div>' : '<p class="sec pequeno">' + def.desc + '</p>') +
    '<div class="custo-linha"><span>Custo: <b>' + fmtDinheiro(custo) + '</b></span><span>Energia: <b>' + (def.energia > 0 ? '−' : '+') + Math.round(Math.abs(def.energia) * escalaRitmo(JOGO)) + '</b></span></div>' +
    '<div class="linha-botoes"><button class="btn btn-confirma" data-a="addAcao"' + (livres <= 0 || semDinheiro || invalido ? ' disabled' : '') + '>Adicionar à agenda</button>' +
    (livres <= 0 ? '<span class="ruim pequeno">Agenda cheia.</span>' : semDinheiro ? '<span class="ruim pequeno">Sem caixa (ou teto de gastos) para esta ação.</span>' : '') + '</div></div>';
}

function paramsDoFormEst(t) {
  var f = UI.formAcao;
  switch (t) {
    case 'comicio': return { zona: f.zona || 'metro', tema: f.tema };
    case 'corpo': case 'radio': return { zona: f.zona || 'metro' };
    case 'visita': return { zona: f.zona || 'metro', seg: f.seg || 'popular' };
    case 'digital': return { tipo: f.tipo || 'impulsionar' };
    case 'ataque': return { alvo: f.alvo, linha: f.linha || 'corrupcao' };
    case 'apoio': return { alvo: f.alvo, oferta: f.oferta || 'programa' };
    case 'proposta': return { id: f.id };
    default: return {};
  }
}

/* ---------- Pesquisas e projeção ---------- */

function abaPesquisasEst() {
  var c = jogador(JOGO);
  if (ehDeputadoJog()) return abaProjecaoDep();
  var turno = JOGO.fase === 'campanha2' ? 2 : 1;
  var lista = JOGO.est.pesqEst.filter(function (p) { return p.uf === c.uf && p.cargo === c.cargo && p.turno === turno; });
  var ult = lista[lista.length - 1];
  var html = '';
  if (ult) {
    var ids = ordenarPor(ult.res, ult.ids.filter(function (id) { return JOGO.est.cands[id].ativo; }));
    html += '<div class="entre"><h3>' + esc(ult.nome) + ' · ' + nomeCargo(c.cargo, 'M').replace('Senador', 'Senado').replace('Governador', 'Governo') + '</h3><span class="mudo pequeno">' + fmtData(JOGO.cal, ult.dia) + '</span></div>' +
      (c.cargo === 'senador' && JOGO.est.vagasSen === 2 ? '<p class="mudo pequeno">Duas vagas: cada eleitor vota em dois nomes. Percentuais sobre o total de votos válidos.</p>' : '') +
      barrasIntencao(ult.res, ids, { extras: [['Branco/nulo', ult.res.nenhum], ['Não sabe', ult.res.indeciso]] });
    var porDia = {};
    lista.forEach(function (p) { (porDia[p.dia] = porDia[p.dia] || []).push(p); });
    var dias = Object.keys(porDia).map(Number).sort(function (a, b) { return a - b; });
    var series = ids.map(function (id) {
      var cc = JOGO.est.cands[id];
      return { id: id, nome: cc.urna, cor: cor(cc), pontos: dias.map(function (d) { var ps = porDia[d]; return { x: d, y: soma(ps.map(function (p) { return p.res[id] || 0; })) / ps.length }; }) };
    });
    var xMin = turno === 2 ? JOGO.cal.eleicao1 + 1 : 0, xMax = turno === 2 ? JOGO.cal.eleicao2 : JOGO.cal.eleicao1;
    var yMax = 0; series.forEach(function (s) { s.pontos.forEach(function (p) { yMax = Math.max(yMax, p.y); }); });
    var ticks = []; for (var d = xMin; d <= xMax; d += turno === 2 ? 5 : 7) ticks.push({ x: d, rotulo: fmtDataCurta(JOGO.cal, d) });
    var marcos = debatesEstaduais(JOGO, c.cargo, c.uf).filter(function (db) { return db.dia >= xMin && db.dia <= xMax; }).map(function (db) { return { x: db.dia, rotulo: 'Debate' }; });
    if (dias.length >= 2) html += '<div class="divisor"></div><h3>Evolução</h3>' + graficoLinhas({ series: series, xMin: xMin, xMax: xMax, yMax: yMax + 5, ticksX: ticks, marcos: marcos, titulo: 'Evolução das pesquisas', fmtX: function (x) { return fmtData(JOGO.cal, x); } });
  } else html += '<p class="mudo">A primeira pesquisa estadual sai na quarta-feira.</p>';
  var custo = escalaCustoCargo(c.cargo, c.uf) * 0.35;
  html += '<div class="divisor"></div><div class="entre"><h3>Pesquisa interna</h3><button class="btn btn-peq" data-a="internaEst"' + (podePagarC(JOGO, c, custo) ? '' : ' disabled') + '>Encomendar (' + fmtDinheiro(custo) + ')</button></div>' +
    '<p class="mudo pequeno">Mostra a intenção de voto por região do estado e por perfil de eleitor, sem viés, e deixa as estimativas da equipe mais precisas por uma semana.</p>';
  if (JOGO.ultimaInternaEst) html += internaEstHtml(JOGO.ultimaInternaEst);
  return html;
}

ACOES_UI.internaEst = function () {
  var c = jogador(JOGO);
  var custo = escalaCustoCargo(c.cargo, c.uf) * 0.35;
  if (!podePagarC(JOGO, c, custo)) return;
  gastar(c, custo);
  var r = intencoesEstadual(JOGO, c.uf, c.cargo, {});
  JOGO.ultimaInternaEst = { dia: JOGO.dia, ids: r.ids, total: r.total, zona: r.zona, seg: r.seg };
  JOGO.internaEstDia = JOGO.dia;
  toast('Pesquisa interna concluída.');
  atualizar();
};

function internaEstHtml(r) {
  var c = jogador(JOGO);
  var ids = ordenarPor(r.total, r.ids.filter(function (id) { return JOGO.est.cands[id] && JOGO.est.cands[id].ativo; })).slice(0, 5);
  var nomes = nomesZonas(c.uf);
  return '<div class="pilha"><div class="rotulo">Interna de ' + fmtData(JOGO.cal, r.dia) + '</div><div class="tabela-caixa"><table class="tabela"><thead><tr><th>Recorte</th>' +
    ids.map(function (id) { return '<th class="n">' + esc(JOGO.est.cands[id].urna) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    '<tr class="voce"><td>Total</td>' + ids.map(function (id) { return '<td class="n">' + Math.round(r.total[id]) + '%</td>'; }).join('') + '</tr>' +
    ZONAS.map(function (z) { return '<tr><td>' + esc(nomes[z]) + '</td>' + ids.map(function (id) { return '<td class="n">' + Math.round(r.zona[z][id]) + '%</td>'; }).join('') + '</tr>'; }).join('') +
    SEG_IDS.map(function (g) { return '<tr><td>' + SEGMENTOS[g].nome + '</td>' + ids.map(function (id) { return '<td class="n">' + Math.round(r.seg[g][id]) + '%</td>'; }).join('') + '</tr>'; }).join('') +
    '</tbody></table></div></div>';
}

function abaProjecaoDep() {
  var c = jogador(JOGO);
  var pr = projecaoDeputado(JOGO);
  var vagas = c.cargo === 'depfed' ? VAGAS_FED[c.uf] : vagasEstaduais(c.uf);
  var casa = c.cargo === 'depfed' ? 'Câmara dos Deputados' : 'Assembleia Legislativa';
  var sh = {};
  PARTIDOS.forEach(function (p) { sh[p.sigla] = pr.partidos[p.sigla] / (1 - pr.partidos.nenhum) * 100; });
  var top = Object.keys(sh).sort(function (a, b) { return sh[b] - sh[a]; }).slice(0, 8);
  var cadeirasP = Math.floor(pr.cadeirasEstimadas + 0.35);
  var situacao = pr.rank <= cadeirasP ? '<b class="bom">Dentro das vagas projetadas</b>' : pr.rank <= cadeirasP + 2 ? '<b>Na briga pela última vaga</b>' : '<b class="ruim">Fora das vagas projetadas</b>';
  return '<div class="entre"><h3>Projeção da equipe</h3><span class="mudo pequeno">' + esc(casa) + ' · ' + vagas + ' vagas em ' + c.uf + '</span></div>' +
    '<div class="resumo-votos">' +
    '<div class="it"><span class="rotulo">Seus votos</span><span class="v">' + fmtVotos(pr.meus) + '</span></div>' +
    '<div class="it"><span class="rotulo">Posição na lista</span><span class="v">' + pr.rank + 'º</span></div>' +
    '<div class="it"><span class="rotulo">Cadeiras do ' + esc(c.partido) + '</span><span class="v">' + fmtNum(pr.cadeirasEstimadas, 1) + '</span></div>' +
    '<div class="it"><span class="rotulo">Quociente eleitoral</span><span class="v">' + fmtVotos(pr.qe) + '</span></div></div>' +
    '<p class="pequeno">' + situacao + '. Para disputar as sobras, o candidato precisa de pelo menos 20% do quociente (' + fmtVotos(pr.qe * 0.2) + ' votos); para entrar pelo quociente do partido, 10% (' + fmtVotos(pr.qe * 0.1) + ').</p>' +
    '<div class="divisor"></div><h4>Votos para ' + (c.cargo === 'depfed' ? 'deputado federal' : 'deputado estadual') + ' por partido (estimativa)</h4>' +
    '<div class="barras">' + top.map(function (s) {
      var p = PARTIDO_POR_SIGLA[s];
      return '<div class="barra-linha' + (s === c.partido ? ' voce' : '') + '" style="--cor:' + corIdeologia(p.ideo) + '"><div class="nm"><span class="pt"></span>' + s + '</div><div class="trilho"><div class="ench" style="width:' + (sh[s] / sh[top[0]] * 100).toFixed(1) + '%"></div></div><div class="val">' + fmtNum(sh[s], 1) + '%</div></div>';
    }).join('') + '</div><p class="mudo pequeno">Cores pelo campo ideológico do partido, da esquerda (vermelho) à direita (azul).</p>';
}

/* ---------- Apoios ---------- */

function abaApoiosEst() {
  var c = jogador(JOGO);
  var ap = JOGO.est.ufs[c.uf].apoios[chaveApoiosEst(c)] || {};
  var html = '<p class="sec pequeno">Negociar um apoio ocupa um compromisso da agenda. Prefeitos e o governador valem pela máquina e pelos cabos eleitorais; setores organizados, pelo eleitorado que mobilizam.</p><div class="pilha" style="gap:8px">';
  APOIOS_EST.forEach(function (a) {
    if (a.cargos && a.cargos.indexOf(c.cargo) < 0) return;
    var dono = ap[a.id] ? JOGO.est.cands[ap[a.id]] : null;
    var ch = chanceApoioEst(JOGO, c, a.id, 'programa');
    var efs = [];
    if (a.efeito.zona) for (var z in a.efeito.zona) efs.push(nomesZonas(c.uf)[z] + ' ▲');
    if (a.efeito.seg) for (var g in a.efeito.seg) efs.push(SEGMENTOS[g].curto + (a.efeito.seg[g] > 0 ? ' ▲' : ' ▼'));
    if (a.efeito.cred) for (var t in a.efeito.cred) efs.push(TEMAS[t].curto + ' ▲');
    var nome = a.id === 'prefCapital' ? a.nome + ': ' + JOGO.est.ufs[c.uf].prefeito.nome + ' (' + JOGO.est.ufs[c.uf].prefeito.partido + ')' : a.id === 'governadorAtual' ? a.nome + ': ' + JOGO.governadores[c.uf].nome + ' (' + JOGO.governadores[c.uf].partido + ')' : a.nome;
    var meu = c.apoios.indexOf(a.id) >= 0;
    html += '<div class="entre" style="border-bottom:1px solid var(--line);padding-bottom:8px;align-items:flex-start"><div style="min-width:0;flex:1"><b>' + esc(nome) + '</b><div class="pequeno sec">' + esc(a.desc) + '</div><div class="pequeno mudo">' + efs.join(' · ') + '</div></div>' +
      '<div style="text-align:right">' + (meu ? '<b class="bom pequeno">Apoia você</b>' : (dono ? '<div class="pequeno">Apoia ' + nomeCand(dono) + '</div>' : '<div class="pequeno mudo">Sem candidato</div>') +
      (ch > 0 ? '<button class="btn btn-peq" data-a="prepAcao" data-t="apoio" data-alvo="' + a.id + '">Negociar · ' + Math.round(ch * 100) + '%</button>' : '<div class="pequeno ruim">Indisponível</div>')) + '</div></div>';
  });
  return html + '</div>';
}

/* ---------- TV e programa ---------- */

function abaEstrategiaEst() {
  var c = jogador(JOGO);
  var html = '';
  if (!ehDeputadoJog()) {
    var hg = JOGO.fase === 'campanha2' ? JOGO.cal.hgpe2 : JOGO.cal.hgpe1;
    html += '<div class="entre"><h3>Horário eleitoral</h3><span class="tag">' + fmtPct((c.tvShare || 0) * 100, 0) + ' do tempo</span></div>' +
      '<p class="sec pequeno">' + (JOGO.dia < hg[0] ? 'Começa em ' + fmtData(JOGO.cal, hg[0]) + '.' : JOGO.dia <= hg[1] ? 'No ar até ' + fmtData(JOGO.cal, hg[1]) + '.' : 'A propaganda deste turno terminou.') + ' O tempo depende da bancada dos partidos da coligação.</p>';
    var estr = [['positiva', 'Propositiva', 'Reforça a credibilidade num tema.'], ['ataque', 'Ataque', 'Desconstrói um adversário.'], ['defesa', 'Defesa', 'Reduz o desgaste.']];
    html += '<div class="opcoes-grandes" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' + estr.map(function (e) {
      return '<button class="opcao' + (c.tv.estrategia === e[0] ? ' sel' : '') + '" data-a="tvEstr" data-v="' + e[0] + '"><h4>' + e[1] + '</h4><span class="sec pequeno">' + e[2] + '</span></button>';
    }).join('') + '</div><div class="grade-campos">';
    if (c.tv.estrategia === 'positiva') html += '<div class="campo"><label for="tv-tema">Tema</label><select id="tv-tema" data-mudar="tvCampo" data-k="tema">' + TEMA_IDS.map(function (t) { return '<option value="' + t + '"' + (c.tv.tema === t ? ' selected' : '') + '>' + TEMAS[t].nome + '</option>'; }).join('') + '</select></div>';
    if (c.tv.estrategia === 'ataque') {
      var adv = candsDisputa(JOGO, c.uf, c.cargo).filter(function (o) { return !o.jogador; });
      if (adv.length && (!c.tv.alvo || !adv.some(function (o) { return o.id === c.tv.alvo; }))) c.tv.alvo = adv[0].id;
      html += '<div class="campo"><label for="tv-alvo">Alvo</label><select id="tv-alvo" data-mudar="tvCampo" data-k="alvo">' + adv.map(function (o) { return '<option value="' + o.id + '"' + (c.tv.alvo === o.id ? ' selected' : '') + '>' + esc(o.urna) + '</option>'; }).join('') + '</select></div>';
    }
    var k = escalaCustoCargo(c.cargo, c.uf);
    html += '<div class="campo"><label for="tv-inv">Produção</label><select id="tv-inv" data-mudar="tvCampo" data-k="invest">' + [1, 2, 3].map(function (i) { return '<option value="' + i + '"' + ((c.tv.invest || 2) === i ? ' selected' : '') + '>' + INVEST_TV[i].nome + ' · ' + fmtDinheiro(INVEST_TV[i].custo * k) + '/dia</option>'; }).join('') + '</select></div></div><div class="divisor"></div>';
  } else {
    html += '<p class="sec pequeno">No horário eleitoral dos deputados, o tempo do partido é dividido entre dezenas de candidatos: sua campanha depende da rua, das redes e dos apoios.</p>';
  }
  html += '<h3>Programa</h3><p class="pequeno"><b>Bandeiras:</b> ' + (c.bandeiras.map(function (t) { return TEMAS[t].nome; }).join(' · ') || '—') + '</p>' +
    '<p class="pequeno"><b>Propostas anunciadas:</b> ' + (c.propostas.map(function (id) { return esc((PROPOSTA_EST_POR_ID[id] || PROPOSTA_POR_ID[id]).nome); }).join(' · ') || 'nenhuma ainda') + '</p>' +
    '<button class="btn btn-peq" data-a="prepAcao" data-t="proposta" style="justify-self:start">Lançar nova proposta</button>' +
    '<div class="divisor"></div><h3>Sua imagem</h3>' +
    '<div class="resumo-votos"><div class="it"><span class="rotulo">Momento</span><span class="v ' + (c.imagem >= 0 ? 'bom' : 'ruim') + '">' + (c.imagem >= 0.05 ? 'Em alta' : c.imagem <= -0.05 ? 'Em baixa' : 'Estável') + '</span></div>' +
    '<div class="it"><span class="rotulo">Desgaste</span><span class="v ' + (c.desgaste > 15 ? 'ruim' : '') + '">' + (c.desgaste > 25 ? 'Alto' : c.desgaste > 10 ? 'Moderado' : 'Baixo') + '</span></div>' +
    (!ehDeputadoJog() ? '<div class="it"><span class="rotulo">Preparo p/ debate</span><span class="v">' + Math.round(c.preparo) + '/60</span></div>' : '') + '</div>' +
    '<h4>Credibilidade por tema</h4><div class="atributos">' + TEMA_IDS.map(function (t) {
      return '<div class="atributo" style="grid-template-columns:110px 1fr 26px"><span class="mudo">' + TEMAS[t].curto + '</span><div class="trilho"><div class="enchimento" style="width:' + c.cred[t] + '%"></div></div><span class="tnum">' + Math.round(c.cred[t]) + '</span></div>';
    }).join('') + '</div><h4>Atributos</h4>' + atributosHtml(c.attr);
  return html;
}

/* ---------- Adversários e lista ---------- */

function abaAdversariosEst() {
  var c = jogador(JOGO);
  if (ehDeputadoJog()) {
    var pr = projecaoDeputado(JOGO);
    var todos = pr.outros.map(function (o, i) { return { nome: o.nome, votos: o.votos, perfil: JOGO.est.ufs[c.uf].lista[i] }; });
    todos.push({ nome: c.urna + ' (você)', votos: pr.meus, voce: true });
    todos.sort(function (a, b) { return b.votos - a.votos; });
    var cad = Math.floor(pr.cadeirasEstimadas + 0.35);
    return '<div class="entre"><h3>Lista do ' + esc(c.partido) + ' em ' + c.uf + '</h3><span class="mudo pequeno">Projeção: ' + cad + ' cadeira' + (cad === 1 ? '' : 's') + '</span></div>' +
      '<p class="sec pequeno">Na lista aberta, seus concorrentes diretos são os colegas de partido. A linha marca as vagas que o partido deve conquistar.</p>' +
      '<div class="tabela-caixa"><table class="tabela"><thead><tr><th class="n">#</th><th>Candidato</th><th>Perfil</th><th class="n">Votos (estim.)</th></tr></thead><tbody>' +
      linhasLista(todos, cad) + '</tbody></table></div>';
  }
  var d = disputa(JOGO, c.uf, c.cargo), perc = d.percepcao || {};
  var cs = candsDisputa(JOGO, c.uf, c.cargo).slice().sort(function (a, b) { return (perc[b.id] || 0) - (perc[a.id] || 0); });
  return '<div class="pilha">' + cs.map(function (o) {
    var pres = o.palanque ? candPorId(JOGO, o.palanque) : null;
    return '<div class="painel cartao-corpo pilha" style="gap:6px;border-left:5px solid ' + cor(o) + '"><div class="entre"><div><b style="font-family:var(--font-display);font-stretch:75%;font-size:1.25rem;text-transform:uppercase">' + esc(o.urna) + '</b> <span class="mudo">' + o.numero + ' · ' + esc(o.partido) + (o.jogador ? ' · você' : '') + '</span></div>' +
      '<span class="tag">' + fmtNum(perc[o.id] || 0, 0) + '% nas pesquisas</span></div>' +
      '<div class="pequeno sec">' + esc(o.bio) + '</div>' +
      '<div class="pequeno">' + rotuloIdeologia(o.x) + ' · Coligação: ' + esc(o.coligacao.join(', ')) + ' · Presidente: ' + (pres ? esc(pres.urna) : 'neutro') + (o.incumbente ? ' · <b>tenta a reeleição</b>' : o.apoioGov ? ' · apoiado pelo governador' : '') + '</div>' +
      (!o.jogador ? '<div class="linha-botoes"><button class="btn btn-peq" data-a="prepAcao" data-t="ataque" data-alvo="' + o.id + '">Atacar</button></div>' : '') + '</div>';
  }).join('') + '</div>';
}

/* ---------- Brasil: presidente e outras disputas ---------- */

function abaBrasil() {
  var html = '';
  var agr = agregador(JOGO, JOGO.fase === 'campanha2' ? '2t' : '1t');
  if (agr && JOGO._cache.ids.length) {
    var ids = ordenarPor(agr, JOGO._cache.ids);
    html += '<h3>Corrida presidencial</h3>' + barrasIntencao(agr, ids, { casas: 1 }) + '<div class="divisor"></div>';
  } else if (JOGO.presDecidido && JOGO.vencedor) {
    html += '<p><b>' + esc(candPorId(JOGO, JOGO.vencedor).urna) + '</b> foi ' + eleitoA(candPorId(JOGO, JOGO.vencedor)) + ' presidente no 1º turno.</p><div class="divisor"></div>';
  }
  html += '<h3>Governo dos estados</h3>' + tabelaGovernos();
  return html;
}

function tabelaGovernos() {
  var turno = JOGO.fase === 'campanha2' ? 2 : 1;
  return '<div class="tabela-caixa"><table class="tabela"><thead><tr><th>UF</th><th>Lidera</th><th class="n">%</th><th>2º</th><th class="n">%</th><th>Presidente</th></tr></thead><tbody>' +
    UFS_MAPA.slice().sort(function (a, b) { return ESTADO_POR_UF[b].eleitores - ESTADO_POR_UF[a].eleitores; }).map(function (uf) {
      var p = ultimaPesquisaEst(JOGO, uf, 'governador');
      if (turno === 2 && JOGO.govSegundo.indexOf(uf) < 0) {
        var r = JOGO.resEst1.gov[uf], v = JOGO.est.cands[r.ordem[0]];
        return '<tr><td>' + uf + '</td><td colspan="4">' + nomeCand(v) + ' <span class="mudo">(' + v.partido + ') ' + eleitoA(v) + ' no 1º turno</span></td><td>' + (v.palanque ? esc(candPorId(JOGO, v.palanque).urna) : '—') + '</td></tr>';
      }
      if (!p) return '';
      var ids = ordenarPor(p.res, p.ids);
      var a = JOGO.est.cands[ids[0]], b = JOGO.est.cands[ids[1]];
      return '<tr' + (a.jogador || (b && b.jogador) ? ' class="voce"' : '') + '><td>' + uf + '</td><td>' + nomeCand(a) + ' <span class="mudo">' + a.partido + '</span></td><td class="n">' + p.res[a.id] + '%</td>' +
        '<td>' + (b ? nomeCand(b) + ' <span class="mudo">' + b.partido + '</span>' : '') + '</td><td class="n">' + (b ? p.res[b.id] + '%' : '') + '</td><td class="pequeno">' + (a.palanque && candPorId(JOGO, a.palanque) ? esc(candPorId(JOGO, a.palanque).urna) : '—') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

/* Cor pelo campo ideológico (escala divergente vermelho ↔ cinza ↔ azul). */
function corIdeologia(x) {
  if (x <= -45) return 'var(--div-e2)';
  if (x <= -12) return 'var(--div-e1)';
  if (x < 12) return 'var(--div-0)';
  if (x < 45) return 'var(--div-d1)';
  return 'var(--div-d2)';
}

/* ---------- Tela ---------- */

TELAS.campanhaEst = function () {
  var abas = abasEst();
  if (!abas.some(function (a) { return a[0] === UI.aba; })) UI.aba = 'agenda';
  var conteudo = { agenda: abaAgendaEst, pesquisas: abaPesquisasEst, apoios: abaApoiosEst, estrategia: abaEstrategiaEst, noticias: abaNoticias, adversarios: abaAdversariosEst, brasil: abaBrasil }[UI.aba]();
  return topoEst() +
    '<main class="mesa gutter"><div class="col-mapa">' + blocoEstadoEst() + '</div>' +
    '<div class="col-acoes"><section class="painel"><nav class="abas" role="tablist">' + abas.map(function (a) {
      return '<button class="aba' + (UI.aba === a[0] ? ' ativa' : '') + '" role="tab" aria-selected="' + (UI.aba === a[0]) + '" data-a="aba" data-v="' + a[0] + '">' + a[1] + '</button>';
    }).join('') + '</nav><div class="conteudo-aba">' + conteudo + '</div></section></div></main>' +
    docaAgenda();
};
TELAS.campanhaEst_depois = function () {
  ligarGraficos();
  ajustarSilhueta();
};

function ajustarSilhueta() {
  var svg = document.getElementById('silhueta');
  if (!svg) return;
  try {
    var b = svg.querySelector('path').getBBox();
    var pad = Math.max(b.width, b.height) * 0.06;
    svg.setAttribute('viewBox', (b.x - pad) + ' ' + (b.y - pad) + ' ' + (b.width + 2 * pad) + ' ' + (b.height + 2 * pad));
  } catch (e) { /* sem layout (ex.: aba oculta) */ }
}

/* Linhas da lista do partido: as primeiras posições e, se preciso, a do jogador. */
function linhasLista(todos, cad) {
  var lim = Math.max(12, cad + 3);
  var pos = todos.findIndex(function (o) { return o.voce; });
  var linha = function (o, i) {
    var lin = i === cad - 1 ? ' style="border-bottom:2px solid var(--confirma)"' : '';
    return '<tr' + (o.voce ? ' class="voce"' : '') + lin + '><td class="n">' + (i + 1) + '</td><td>' + esc(o.nome) + '</td><td class="pequeno mudo">' + (o.perfil ? esc((TRAJ_ESTADUAIS[o.perfil.trajetoria] || {}).nome || '') + (o.perfil.puxador ? ' · puxador de votos' : '') : '') + '</td><td class="n">' + fmtVotos(o.votos) + '</td></tr>';
  };
  var html = todos.slice(0, lim).map(linha).join('');
  if (pos >= lim) html += '<tr><td colspan="4" class="mudo pequeno">…</td></tr>' + linha(todos[pos], pos);
  return html;
}
