/* Painel principal da campanha: topo, mapa, abas, agenda e resumo das rodadas. */

var ABAS = [
  ['agenda', 'Agenda'], ['pesquisas', 'Pesquisas'], ['apoios', 'Apoios'],
  ['estrategia', 'TV e programa'], ['noticias', 'Notícias'], ['adversarios', 'Adversários']
];

var MODOS_MAPA = [['lider', 'Líder estimado'], ['voce', 'Sua intenção'], ['presenca', 'Sua presença'], ['eleitores', 'Eleitorado'], ['governadores', 'Governadores']];

function diasParaEleicao() {
  var alvo = JOGO.fase === 'campanha2' ? JOGO.cal.eleicao2 : JOGO.cal.eleicao1;
  return alvo - JOGO.dia;
}

function topoCampanha() {
  var c = jogador(JOGO);
  var t = turnoAtual(JOGO);
  var faixa = JOGO.config.ritmo === 'diario' ? fmtData(JOGO.cal, t[0]) : fmtDataCurta(JOGO.cal, t[0]) + ' a ' + fmtDataCurta(JOGO.cal, t[1]);
  var rodada = (JOGO.config.ritmo === 'diario' ? 'Dia ' : 'Semana ') + (JOGO.turnoIdx + 1) + ' de ' + JOGO.turnos.length;
  var en = Math.round(c.energia);
  var perc = JOGO.percepcao && JOGO.percepcao[c.id] !== undefined ? JOGO.percepcao[c.id] : null;
  return '<header class="topo gutter">' +
    '<div class="cand"><span class="num">' + c.numero + '</span><div><div class="nome">' + esc(c.urna) + '</div><div class="partido">' + esc(c.partido) + ' · ' + esc(c.coligacao.join(', ')) + '</div></div></div>' +
    '<div class="data"><span class="rotulo">' + (JOGO.fase === 'campanha2' ? '2º turno' : '1º turno') + ' · ' + rodada + '</span><span class="d">' + faixa + '</span><span class="pequeno" style="color:var(--urna-muted)">' + diasParaEleicao() + ' dias para a eleição</span></div>' +
    '<div class="metricas">' +
    '<div class="metrica"><span class="rotulo">Pesquisas</span><span class="v">' + (perc === null ? '—' : fmtNum(perc, 0) + '%') + '</span></div>' +
    '<div class="metrica"><span class="rotulo">Caixa</span><span class="v">' + fmtDinheiro(c.dinheiro) + '</span></div>' +
    '<div class="metrica"><span class="rotulo">Gasto / teto</span><span class="v">' + fmtNum(c.gasto, 0) + ' / ' + fmtNum(tetoAtual(JOGO), 0) + ' mi</span></div>' +
    '<div class="metrica"><span class="rotulo">Energia ' + en + '%</span><div class="medidor' + (en < 25 ? ' critico' : en < 50 ? ' baixo' : '') + '"><i style="width:' + en + '%"></i></div></div>' +
    '<div class="metrica"><span class="rotulo">TV/bloco</span><span class="v">' + fmtTempo(c.tvSeg || 0) + '</span></div>' +
    '<button class="btn btn-peq" data-a="menuJogo">Menu</button>' +
    '</div></header>';
}

/* ---------- Mapa ---------- */
function preencherMapa(uf) {
  var c = jogador(JOGO);
  var cache = JOGO._cache;
  var ids = cache.ids;
  if (UI.modoMapa === 'lider') {
    var est = {}; ids.forEach(function (id) { est[id] = estimativaUF(JOGO, uf, id); });
    var o = ordenarPor(est, ids);
    var margem = est[o[0]] - est[o[1]];
    return { cor: corId(o[0]), opacidade: 0.4 + Math.min(0.6, margem / 25) };
  }
  if (UI.modoMapa === 'voce') return { cor: corSequencial(estimativaUF(JOGO, uf, c.id), [5, 10, 20, 30, 40, 50]) };
  if (UI.modoMapa === 'presenca') return { cor: corSequencial(c.presenca[uf], [5, 15, 30, 45, 60, 75]) };
  if (UI.modoMapa === 'eleitores') return { cor: corSequencial(ESTADO_POR_UF[uf].eleitores, [1, 2, 3, 6, 9, 15]) };
  var g = JOGO.governadores[uf];
  if (g && g.apoio && candPorId(JOGO, g.apoio) && candPorId(JOGO, g.apoio).ativo) return { cor: corId(g.apoio), opacidade: 0.9 };
  return { cor: 'var(--mapa-vazio)' };
}

function dicaMapa(uf) {
  var e = ESTADO_POR_UF[uf], c = jogador(JOGO);
  var ids = JOGO._cache.ids;
  var est = {}; ids.forEach(function (id) { est[id] = estimativaUF(JOGO, uf, id); });
  var o = ordenarPor(est, ids).slice(0, 3);
  var g = JOGO.governadores[uf];
  return '<b>' + esc(e.nome) + '</b> · ' + fmtNum(e.eleitores, 1) + ' mi de eleitores<br>' +
    o.map(function (id) { return esc(candPorId(JOGO, id).urna) + ' ' + fmtNum(est[id], 0) + '%'; }).join(' · ') +
    '<br><span style="color:var(--urna-muted)">Sua presença: ' + Math.round(c.presenca[uf]) + ' · Gov.: ' + (g ? esc(g.partido) + (g.apoio ? ' → ' + esc(candPorId(JOGO, g.apoio).urna) : ' (neutro)') : '—') + '</span>';
}

function legendaMapa() {
  if (UI.modoMapa === 'lider' || UI.modoMapa === 'governadores') {
    var ids = JOGO._cache.ids;
    return '<div class="legenda">' + ids.map(function (id) { var c = candPorId(JOGO, id); return '<span class="it"><span class="sw" style="--cor:' + cor(c) + '"></span>' + esc(c.urna) + '</span>'; }).join('') +
      (UI.modoMapa === 'governadores' ? '<span class="it"><span class="sw" style="--cor:var(--mapa-vazio)"></span>Neutro</span>' : '<span class="it mudo">Cor mais forte = vantagem maior</span>') + '</div>';
  }
  if (UI.modoMapa === 'voce') return escalaHtml([5, 10, 20, 30, 40, 50], '%');
  if (UI.modoMapa === 'presenca') return escalaHtml([5, 15, 30, 45, 60, 75], '');
  return '<div class="escala"><span>Eleitorado (milhões)</span>' + escalaHtml([1, 2, 3, 6, 9, 15], ' mi').replace('<div class="escala">', '').replace(/<\/div>$/, '') + '</div>';
}

function blocoMapa() {
  var internaRecente = Object.keys(JOGO.internas).some(function (u) { return JOGO.dia - JOGO.internas[u] <= 7; });
  return '<section class="painel mapa-caixa pilha" id="caixa-mapa">' +
    '<div class="entre"><div class="modos-mapa">' + MODOS_MAPA.map(function (m) {
      return '<button class="chip' + (UI.modoMapa === m[0] ? ' ativo' : '') + '" data-a="modoMapa" data-v="' + m[0] + '">' + m[1] + '</button>';
    }).join('') + '</div></div>' +
    mapaSvg({ preencher: preencherMapa, sel: UI.ufSel, titulo: 'Mapa da campanha' }) +
    '<div class="dica-mapa" hidden></div>' +
    legendaMapa() +
    ((UI.modoMapa === 'lider' || UI.modoMapa === 'voce') ? '<p class="mudo pequeno">Estimativa da sua equipe' + (internaRecente ? ', calibrada pela pesquisa interna recente.' : '. Encomende pesquisas internas para números mais precisos.') + '</p>' : '') +
    '</section>' + (UI.ufSel ? painelEstado(UI.ufSel) : '<p class="mudo pequeno">Clique num estado para ver os detalhes e agendar ações nele.</p>');
}

function painelEstado(uf) {
  var e = ESTADO_POR_UF[uf], c = jogador(JOGO), g = JOGO.governadores[uf];
  var ids = JOGO._cache.ids;
  var est = {}; ids.forEach(function (id) { est[id] = estimativaUF(JOGO, uf, id); });
  var ord = ordenarPor(est, ids).slice(0, 5);
  var segs = SEG_IDS.slice().sort(function (a, b) { return e.seg[b] - e.seg[a]; });
  var chGov = g && g.apoio !== c.id ? chanceApoio(JOGO, c, 'gov:' + uf, 'programa') : 0;
  return '<section class="painel cartao-corpo pilha">' +
    '<div class="entre"><div><span class="rotulo">' + REGIOES[e.reg] + ' · capital ' + esc(e.capital) + '</span><h2>' + esc(e.nome) + '</h2></div><button class="btn btn-ghost btn-peq" data-a="selUF" data-v="">Fechar</button></div>' +
    '<div class="resumo-votos"><div class="it"><span class="rotulo">Eleitores</span><span class="v">' + fmtNum(e.eleitores, 2) + ' mi</span></div>' +
    '<div class="it"><span class="rotulo">Peso no país</span><span class="v">' + fmtPct(e.eleitores / TOTAL_ELEITORES * 100) + '</span></div>' +
    '<div class="it"><span class="rotulo">Sua presença</span><span class="v">' + Math.round(c.presenca[uf]) + '/100</span></div>' +
    '<div class="it"><span class="rotulo">Te conhecem</span><span class="v">' + Math.round(c.recog[uf]) + '%</span></div></div>' +
    '<div><div class="rotulo">Estimativa de intenção de voto</div>' + barrasIntencao(est, ord, { casas: 0 }) + '</div>' +
    '<div class="pequeno sec"><b>Perfil do eleitorado:</b> ' + segs.map(function (s) { return SEGMENTOS[s].curto + ' ' + Math.round(e.seg[s] * 100) + '%'; }).join(' · ') + '</div>' +
    (g ? '<div class="pequeno"><b>Governador(a):</b> ' + esc(g.nome) + ' (' + g.partido + '), aprovação de ' + g.aprov + '%. ' + (g.apoio ? 'Apoia ' + esc(candPorId(JOGO, g.apoio).urna) + '.' : 'Neutro(a).') + '</div>' : '') +
    '<div class="linha-botoes">' +
    '<button class="btn btn-peq" data-a="prepAcao" data-t="comicio" data-uf="' + uf + '">Comício</button>' +
    '<button class="btn btn-peq" data-a="prepAcao" data-t="carreata" data-uf="' + uf + '">Carreata</button>' +
    '<button class="btn btn-peq" data-a="prepAcao" data-t="visita" data-uf="' + uf + '">Visita a um público</button>' +
    (g && g.apoio !== c.id ? '<button class="btn btn-peq" data-a="prepAcao" data-t="apoio" data-alvo="gov:' + uf + '">Apoio do governador · ' + Math.round(chGov * 100) + '%</button>' : '') +
    '<button class="btn btn-peq" data-a="pesquisaInterna" data-v="' + uf + '"' + (podePagar(JOGO, c, 0.35) ? '' : ' disabled') + '>Pesquisa interna (R$ 350 mil)</button>' +
    '</div></section>';
}

ACOES_UI.modoMapa = function (d) { UI.modoMapa = d.v; atualizar(); };
ACOES_UI.selUF = function (d) { UI.ufSel = d.v || null; if (d.v && UI.formAcao) UI.formAcao.uf = d.v; atualizar(); };

/* ---------- Agenda ---------- */
function custoPlanejado() {
  var c = jogador(JOGO);
  var localOrig = c.local, t = 0, en = c.energia;
  var esc2 = escalaRitmo(JOGO);
  JOGO.agenda.forEach(function (a) {
    var custo = ACOES[a.tipo].custo(JOGO, c, a.p);
    t += custo;
    if (a.p.uf && (a.tipo === 'comicio' || a.tipo === 'carreata' || a.tipo === 'visita')) c.local = a.p.uf;
    en -= ACOES[a.tipo].energia * esc2;
  });
  c.local = localOrig;
  var dias = turnoAtual(JOGO)[1] - turnoAtual(JOGO)[0] + 1;
  en = Math.min(100, Math.max(0, en + 5 * dias));
  return { dinheiro: t, energiaFinal: en };
}

function abaAgenda() {
  var c = jogador(JOGO);
  var cats = [['rua', 'Nas ruas'], ['midia', 'Mídia'], ['politica', 'Política'], ['estrategia', 'Estratégia']];
  var html = '<div class="entre"><h3>' + (JOGO.config.ritmo === 'diario' ? 'Agenda do dia' : 'Agenda da semana') + '</h3><span class="mudo pequeno">' + JOGO.agenda.length + ' de ' + slotsDoTurno(JOGO) + ' compromissos</span></div>';
  if (c.repouso) html += '<p class="ruim pequeno">Recomendação médica: agenda reduzida nesta rodada.</p>';
  cats.forEach(function (cat) {
    var acoes = Object.keys(ACOES).filter(function (k) { return ACOES[k].cat === cat[0]; });
    html += '<div class="grupo-acoes"><div class="rotulo">' + cat[1] + '</div><div class="grade-acoes">' + acoes.map(function (k) {
      return '<button class="acao-btn' + (UI.acaoSel === k ? ' sel' : '') + '" data-a="prepAcao" data-t="' + k + '"><b>' + ACOES[k].nome + '</b><span>' + ACOES[k].desc + '</span></button>';
    }).join('') + '</div></div>';
  });
  if (UI.acaoSel) html += formAcao();
  return html;
}

function opcoesUF(sel) {
  return UFS_MAPA.slice().sort(function (a, b) { return ESTADO_POR_UF[b].eleitores - ESTADO_POR_UF[a].eleitores; }).map(function (u) {
    return '<option value="' + u + '"' + (u === sel ? ' selected' : '') + '>' + ESTADO_POR_UF[u].nome + ' (' + fmtNum(ESTADO_POR_UF[u].eleitores, 1) + ' mi)</option>';
  }).join('');
}

function formAcao() {
  var t = UI.acaoSel, f = UI.formAcao, c = jogador(JOGO), def = ACOES[t];
  var campos = '';
  var sel = function (k, opts) { return '<select id="fa-' + k + '" data-mudar="campoAcao" data-k="' + k + '">' + opts + '</select>'; };
  if (t === 'comicio' || t === 'carreata' || t === 'visita') {
    f.uf = f.uf || UI.ufSel || c.uf;
    campos += '<div class="campo"><label for="fa-uf">Estado</label>' + sel('uf', opcoesUF(f.uf)) + '</div>';
  }
  if (t === 'comicio') {
    f.tema = f.tema || c.bandeiras[0] || 'economia';
    campos += '<div class="campo"><label for="fa-tema">Tema do discurso</label>' + sel('tema', TEMA_IDS.map(function (k) { return '<option value="' + k + '"' + (k === f.tema ? ' selected' : '') + '>' + TEMAS[k].nome + '</option>'; }).join('')) + '</div>';
  }
  if (t === 'visita') {
    f.seg = f.seg || 'popular';
    campos += '<div class="campo"><label for="fa-seg">Público</label>' + sel('seg', SEG_IDS.map(function (g) { return '<option value="' + g + '"' + (g === f.seg ? ' selected' : '') + '>' + NOMES_VISITA[g] + '</option>'; }).join('')) + '</div>';
  }
  if (t === 'entrevista' || t === 'arrecadar') {
    f.reg = f.reg || 'SE';
    campos += '<div class="campo"><label for="fa-reg">Região</label>' + sel('reg', ['N', 'NE', 'CO', 'SE', 'S'].map(function (r) { return '<option value="' + r + '"' + (r === f.reg ? ' selected' : '') + '>' + REGIOES[r] + '</option>'; }).join('')) + '</div>';
  }
  if (t === 'digital') {
    f.tipo = f.tipo || 'impulsionar';
    campos += '<div class="campo"><label for="fa-tipo">Formato</label>' + sel('tipo', [['impulsionar', 'Impulsionar conteúdo (R$ 1,2 mi)'], ['live', 'Live com apoiadores (R$ 50 mil)'], ['viral', 'Apostar em conteúdo viral (R$ 400 mil, arriscado)']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === f.tipo ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('')) + '</div>';
  }
  if (t === 'ataque') {
    var adv = candidatosAtivos(JOGO).filter(function (o) { return !o.jogador; });
    if (!f.alvo || !candPorId(JOGO, f.alvo) || !candPorId(JOGO, f.alvo).ativo) f.alvo = adv[0].id;
    f.linha = f.linha || 'corrupcao';
    campos += '<div class="campo"><label for="fa-alvo">Alvo</label>' + sel('alvo', adv.map(function (o) { return '<option value="' + o.id + '"' + (o.id === f.alvo ? ' selected' : '') + '>' + esc(o.urna) + ' (' + o.partido + ')</option>'; }).join('')) + '</div>';
    campos += '<div class="campo"><label for="fa-linha">Linha de ataque</label>' + sel('linha', Object.keys(LINHAS_ATAQUE).map(function (k) { return '<option value="' + k + '"' + (k === f.linha ? ' selected' : '') + '>' + LINHAS_ATAQUE[k].nome + '</option>'; }).join('')) + '</div>';
    var alvo = candPorId(JOGO, f.alvo);
    var vul = { corrupcao: alvo.attr.integridade < 60, incompetencia: alvo.attr.gestao < 55, radicalismo: Math.abs(alvo.x) > 55, promessas: (alvo.stats.fiscal || 0) > 3 };
    campos += '<p class="pequeno sec">Pontos vulneráveis de ' + esc(alvo.urna) + ': ' + (Object.keys(vul).filter(function (k) { return vul[k]; }).map(function (k) { return LINHAS_ATAQUE[k].nome.toLowerCase(); }).join(', ') || 'nenhum evidente') + '.</p>';
  }
  if (t === 'apoio') {
    var opcoes = [];
    APOIOS.forEach(function (a) {
      var ch = chanceApoio(JOGO, c, a.id, 'programa');
      if (jogo_apoioDe(a.id) === c.id) return;
      opcoes.push(['' + a.id, a.nome + (ch > 0 ? ' · ' + Math.round(ch * 100) + '%' : ' · indisponível')]);
    });
    Object.keys(JOGO.governadores).forEach(function (uf) {
      var g = JOGO.governadores[uf];
      if (g.apoio === c.id) return;
      opcoes.push(['gov:' + uf, 'Governador(a) ' + uf + ' · ' + g.nome + ' (' + g.partido + ') · ' + Math.round(chanceApoio(JOGO, c, 'gov:' + uf, 'programa') * 100) + '%']);
    });
    if (!f.alvo || !opcoes.some(function (o) { return o[0] === f.alvo; })) f.alvo = opcoes.length ? opcoes[0][0] : null;
    f.oferta = f.oferta || 'programa';
    campos += '<div class="campo"><label for="fa-alvo">Com quem negociar</label>' + sel('alvo', opcoes.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === f.alvo ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('')) + '</div>';
    campos += '<div class="campo"><label for="fa-oferta">O que oferecer</label>' + sel('oferta', [['programa', 'Compromissos no programa de governo'], ['cargos', 'Espaço no futuro governo (mais chance, risco de crítica)']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === f.oferta ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('')) + '</div>';
    if (f.alvo) {
      var chf = chanceApoio(JOGO, c, f.alvo, f.oferta);
      campos += '<p class="pequeno"><b>Chance estimada: ' + Math.round(chf * 100) + '%</b>' + (f.alvo.indexOf('gov:') !== 0 ? ' · ' + esc(APOIO_POR_ID[f.alvo].desc) : '') + '</p>';
    }
  }
  if (t === 'proposta') {
    var disp = PROPOSTAS.filter(function (p) { return c.propostas.indexOf(p.id) < 0 && !JOGO.agenda.some(function (a) { return a.tipo === 'proposta' && a.p.id === p.id; }); });
    if (!f.id || !disp.some(function (p) { return p.id === f.id; })) f.id = disp.length ? disp[0].id : null;
    campos += '<div class="campo"><label for="fa-id">Proposta</label>' + sel('id', disp.map(function (p) { return '<option value="' + p.id + '"' + (p.id === f.id ? ' selected' : '') + '>' + esc(p.nome) + '</option>'; }).join('')) + '</div>';
    if (f.id) {
      var pr = PROPOSTA_POR_ID[f.id];
      var dist = Math.abs(pr.ideo - c.x);
      var efs = [];
      for (var g in pr.seg) efs.push(SEGMENTOS[g].curto + (pr.seg[g] > 0 ? ' ▲' : ' ▼'));
      campos += '<p class="pequeno sec">"' + esc(pr.texto) + '"<br>Efeito: ' + efs.join(' · ') + ' · ' + TEMAS[pr.tema].curto + ' ▲' +
        (dist > 75 ? '<br><b class="ruim">Contradiz sua trajetória: adversários vão acusar oportunismo.</b>' : dist > 45 ? '<br><span class="ruim">Um pouco distante do seu perfil: efeito reduzido.</span>' : '') + '</p>';
    }
  }
  var p = paramsDoForm(t);
  var custo = def.custo(JOGO, c, p);
  var slotsLivres = slotsDoTurno(JOGO) - JOGO.agenda.length;
  var plan = custoPlanejado();
  var semDinheiro = custo + plan.dinheiro > c.dinheiro + 1e-9 || c.gasto + plan.dinheiro + custo > tetoAtual(JOGO) + 1e-9;
  var invalido = (t === 'apoio' && (!f.alvo || chanceApoio(JOGO, c, f.alvo, f.oferta) <= 0)) || (t === 'proposta' && !f.id);
  return '<div class="form-acao"><div class="entre"><h4>' + def.nome + '</h4><button class="btn btn-ghost btn-peq" data-a="cancelarAcao">Cancelar</button></div>' +
    (campos ? '<div class="grade-campos">' + campos + '</div>' : '<p class="sec pequeno">' + def.desc + '</p>') +
    '<div class="custo-linha"><span>Custo: <b>' + fmtDinheiro(custo) + '</b></span><span>Energia: <b>' + (def.energia > 0 ? '−' : '+') + Math.round(Math.abs(def.energia) * escalaRitmo(JOGO)) + '</b></span></div>' +
    '<div class="linha-botoes"><button class="btn btn-confirma" data-a="addAcao"' + (slotsLivres <= 0 || semDinheiro || invalido ? ' disabled' : '') + '>Adicionar à agenda</button>' +
    (slotsLivres <= 0 ? '<span class="ruim pequeno">Agenda cheia.</span>' : semDinheiro ? '<span class="ruim pequeno">Sem caixa (ou teto de gastos) para esta ação.</span>' : '') + '</div></div>';
}

function jogo_apoioDe(id) { return JOGO.apoios[id]; }

function paramsDoForm(t) {
  var f = UI.formAcao;
  switch (t) {
    case 'comicio': return { uf: f.uf, tema: f.tema };
    case 'carreata': return { uf: f.uf };
    case 'visita': return { uf: f.uf, seg: f.seg };
    case 'entrevista': case 'arrecadar': return { reg: f.reg };
    case 'digital': return { tipo: f.tipo };
    case 'ataque': return { alvo: f.alvo, linha: f.linha };
    case 'apoio': return { alvo: f.alvo || 'pastores', oferta: f.oferta };
    case 'proposta': return { id: f.id };
    default: return {};
  }
}

ACOES_UI.prepAcao = function (d) {
  UI.acaoSel = d.t;
  UI.formAcao = UI.formAcao || {};
  if (d.uf) { UI.formAcao.uf = d.uf; UI.ufSel = d.uf; }
  if (d.alvo) UI.formAcao.alvo = d.alvo;
  if (d.id) UI.formAcao.id = d.id;
  if (d.t === 'apoio' && !d.alvo && UI.formAcao.alvo && UI.formAcao.alvo.indexOf('gov:') !== 0 && !APOIO_POR_ID[UI.formAcao.alvo]) UI.formAcao.alvo = null;
  if (d.t === 'ataque' && UI.formAcao.alvo && !candPorId(JOGO, UI.formAcao.alvo)) UI.formAcao.alvo = null;
  if ((d.t === 'apoio' || d.t === 'ataque') && !d.alvo && UI.formAcao.alvo) {
    var ehCand = !!candPorId(JOGO, UI.formAcao.alvo);
    if ((d.t === 'apoio' && ehCand) || (d.t === 'ataque' && !ehCand)) UI.formAcao.alvo = null;
  }
  UI.aba = 'agenda';
  atualizar();
  var fa = document.querySelector('.form-acao');
  if (fa && fa.scrollIntoView) fa.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};
ACOES_UI.campoAcao = function (d, el) { UI.formAcao[d.k] = el.value; atualizar(); };
ACOES_UI.cancelarAcao = function () { UI.acaoSel = null; atualizar(); };
ACOES_UI.addAcao = function () {
  var t = UI.acaoSel;
  if (JOGO.agenda.length >= slotsDoTurno(JOGO)) return;
  JOGO.agenda.push({ tipo: t, p: paramsDoForm(t) });
  if (t === 'proposta' || t === 'apoio' || t === 'preparar' || t === 'descanso') UI.acaoSel = null;
  atualizar();
};
ACOES_UI.remAcao = function (d) { JOGO.agenda.splice(+d.i, 1); atualizar(); };
ACOES_UI.sugerirAgenda = function () {
  var livres = slotsDoTurno(JOGO) - JOGO.agenda.length;
  if (livres <= 0) return;
  var sug = iaEscolherAcoes(JOGO, jogador(JOGO), livres);
  sug.forEach(function (a) { JOGO.agenda.push({ tipo: a.tipo, p: a.p }); });
  toast('A coordenação de campanha preencheu ' + livres + ' compromisso(s). Revise antes de confirmar.');
  atualizar();
};
ACOES_UI.limparAgenda = function () { JOGO.agenda = []; atualizar(); };

function docaAgenda() {
  var n = slotsDoTurno(JOGO);
  var t = turnoAtual(JOGO);
  var dias = diasDasAcoes(Math.max(JOGO.agenda.length, 1), t[0], t[1]);
  var slots = [];
  for (var i = 0; i < n; i++) {
    var a = JOGO.agenda[i];
    if (a) {
      var rot = ACOES[a.tipo].rotulo(a.p, JOGO);
      slots.push('<div class="slot cheio"><span class="dia">' + (JOGO.config.ritmo === 'diario' ? (i === 0 ? 'Manhã' : 'Tarde e noite') : fmtData(JOGO.cal, dias[i])) + '</span><span class="tit">' + esc(rot) + '</span><button class="x" data-a="remAcao" data-i="' + i + '" aria-label="Remover">×</button></div>');
    } else {
      slots.push('<div class="slot"><span class="dia">Livre</span><span>Escolha uma ação</span></div>');
    }
  }
  var plan = custoPlanejado();
  var txt = JOGO.config.ritmo === 'diario' ? 'Encerrar o dia' : 'Encerrar a semana';
  return '<div class="doca gutter"><div class="doca-interna">' +
    '<div class="slots">' + slots.join('') + '</div>' +
    '<div class="resumo-agenda"><span>Custo previsto: <b>' + fmtDinheiro(plan.dinheiro) + '</b></span><span>Energia ao fim: <b>' + Math.round(plan.energiaFinal) + '%</b></span></div>' +
    '<div class="linha-botoes"><button class="btn btn-branco btn-peq" data-a="sugerirAgenda" title="Preencher os espaços livres com sugestões">Sugestão</button>' +
    (JOGO.agenda.length ? '<button class="btn btn-corrige btn-peq" data-a="limparAgenda">Corrige</button>' : '') +
    '<button class="btn btn-confirma" data-a="avancar">Confirma<span class="so-largo">&nbsp;· ' + txt + '</span></button></div>' +
    '</div></div>';
}

/* ---------- Pesquisas ---------- */
function serieDePesquisas(tipo) {
  var lista = JOGO.pesquisas.filter(function (p) { return p.res && p.tipo === tipo; });
  var porDia = {};
  lista.forEach(function (p) { (porDia[p.dia] = porDia[p.dia] || []).push(p); });
  var dias = Object.keys(porDia).map(Number).sort(function (a, b) { return a - b; });
  var ids = JOGO._cache.ids.slice();
  // inclui quem saiu da disputa, para não sumir do histórico
  lista.forEach(function (p) { p.ids.forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); }); });
  return ids.map(function (id) {
    var c = candPorId(JOGO, id);
    return {
      id: id, nome: c.urna, cor: cor(c),
      pontos: dias.map(function (d) {
        var ps = porDia[d].filter(function (p) { return p.res[id] !== undefined; });
        if (!ps.length) return null;
        return { x: d, y: soma(ps.map(function (p) { return p.res[id]; })) / ps.length };
      }).filter(Boolean)
    };
  });
}

function graficoPesquisas() {
  var tipo = JOGO.fase === 'campanha2' ? '2t' : '1t';
  var series = serieDePesquisas(tipo).filter(function (s) { return s.pontos.length; });
  if (!series.length) return '<p class="mudo">Ainda não há pesquisas publicadas.</p>';
  var xMin = tipo === '2t' ? JOGO.cal.eleicao1 + 1 : 0;
  var xMax = tipo === '2t' ? JOGO.cal.eleicao2 : JOGO.cal.eleicao1;
  var yMax = 0;
  series.forEach(function (s) { s.pontos.forEach(function (p) { yMax = Math.max(yMax, p.y); }); });
  var ticks = [];
  for (var d = xMin; d <= xMax; d += (tipo === '2t' ? 5 : 7)) ticks.push({ x: d, rotulo: fmtDataCurta(JOGO.cal, d) });
  var marcos = (tipo === '2t' ? JOGO.cal.debates2 : JOGO.cal.debates1).map(function (db) { return { x: db.dia, rotulo: 'Debate' }; });
  return graficoLinhas({ series: series, xMin: xMin, xMax: xMax, yMax: yMax + 5, ticksX: ticks, marcos: marcos, titulo: 'Evolução das pesquisas', fmtX: function (x) { return fmtData(JOGO.cal, x); } });
}

function abaPesquisas() {
  var c = jogador(JOGO);
  var tipo = JOGO.fase === 'campanha2' ? '2t' : '1t';
  var nac = JOGO.pesquisas.filter(function (p) { return p.res && p.tipo === tipo; });
  var ult = nac[nac.length - 1];
  var agr = agregador(JOGO, tipo);
  var html = '<div class="entre"><h3>Média das pesquisas</h3><span class="rotulo">Agregador ponderado</span></div>';
  if (agr) {
    var idsA = ordenarPor(agr, ult.ids.filter(function (id) { return candPorId(JOGO, id).ativo; }));
    html += barrasIntencao(agr, idsA, { casas: 1, extras: [['Branco/nulo', agr.nenhum || 0], ['Não sabe', agr.indeciso || 0]] });
  }
  html += '<div class="divisor"></div><h3>Evolução</h3>' + graficoPesquisas();
  if (ult) {
    var ids = ordenarPor(ult.res, ult.ids.filter(function (id) { return candPorId(JOGO, id).ativo; }));
    html += '<div class="divisor"></div><div class="entre"><h3>Última pesquisa: ' + esc(ult.nome) + '</h3><span class="mudo pequeno">' + fmtData(JOGO.cal, ult.dia) + '</span></div>' +
      '<p class="mudo pequeno">' + fmtNum(ult.amostra) + ' ' + esc(ult.metodo) + ' · margem de erro de ' + fmtNum(ult.margem, 1) + ' ponto(s) · registro ' + esc(ult.registro) + '</p>' +
      barrasIntencao(ult.res, ids, { extras: [['Branco/nulo', ult.res.nenhum], ['Não sabe', ult.res.indeciso]] });
    html += '<div class="divisor"></div><h4>Rejeição ("não votaria de jeito nenhum")</h4>' + barrasIntencao(ult.rej, ordenarPor(ult.rej, ids), { max: 100 });
    if (ult.cenarios && ult.cenarios.length) {
      html += '<div class="divisor"></div><h4>Simulações de 2º turno</h4><div class="tabela-caixa"><table class="tabela"><tbody>' + ult.cenarios.map(function (s) {
        var a = candPorId(JOGO, s.a), b = candPorId(JOGO, s.b);
        return '<tr' + (a.jogador || b.jogador ? ' class="voce"' : '') + '><td>' + nomeCand(a) + '</td><td class="n">' + s.va + '%</td><td class="mudo">×</td><td class="n">' + s.vb + '%</td><td>' + nomeCand(b) + '</td><td class="n mudo">BN/NS ' + s.bn + '%</td></tr>';
      }).join('') + '</tbody></table></div>';
    }
  }
  var est = JOGO.pesquisas.filter(function (p) { return p.estados; }).slice(-2).reverse();
  if (est.length) {
    html += '<div class="divisor"></div><h4>Pesquisas estaduais (Instituto Census)</h4>';
    est.forEach(function (p) {
      Object.keys(p.estados).forEach(function (uf) {
        var r = p.estados[uf], ids2 = ordenarPor(r, p.ids.filter(function (id) { return candPorId(JOGO, id).ativo; })).slice(0, 4);
        html += '<div class="pequeno"><b>' + ESTADO_POR_UF[uf].nome + '</b> <span class="mudo">(' + fmtData(JOGO.cal, p.dia) + ')</span>: ' + ids2.map(function (id) { return esc(candPorId(JOGO, id).urna) + ' ' + r[id] + '%'; }).join(' · ') + '</div>';
      });
    });
  }
  html += '<div class="divisor"></div><div class="entre"><h3>Pesquisa interna</h3><button class="btn btn-peq" data-a="pesquisaInterna" data-v="nacional"' + (podePagar(JOGO, c, 0.8) ? '' : ' disabled') + '>Encomendar nacional (R$ 800 mil)</button></div>' +
    '<p class="mudo pequeno">Sem viés de instituto, com recorte por perfil de eleitor e estimativas precisas no mapa por uma semana. Para um estado específico, use o painel do estado no mapa (R$ 350 mil).</p>';
  if (JOGO.ultimaInterna) html += internaHtml(JOGO.ultimaInterna);
  html += '<div class="divisor"></div><h4>Todas as pesquisas</h4>' + tabelaPesquisas(nac.slice(-12).reverse());
  return html;
}

function tabelaPesquisas(lista) {
  if (!lista.length) return '';
  var ids = lista[0].ids.filter(function (id) { return candPorId(JOGO, id).ativo; });
  ids = ordenarPor(lista[0].res, ids).slice(0, 5);
  return '<div class="tabela-caixa"><table class="tabela"><thead><tr><th>Data</th><th>Instituto</th>' + ids.map(function (id) { return '<th class="n">' + esc(candPorId(JOGO, id).urna) + '</th>'; }).join('') + '<th class="n">BN</th><th class="n">NS</th></tr></thead><tbody>' +
    lista.map(function (p) {
      return '<tr><td>' + fmtDataCurta(JOGO.cal, p.dia) + '</td><td>' + esc(p.nome) + '</td>' + ids.map(function (id) { return '<td class="n">' + (p.res[id] !== undefined ? p.res[id] + '%' : '—') + '</td>'; }).join('') + '<td class="n">' + p.res.nenhum + '%</td><td class="n">' + p.res.indeciso + '%</td></tr>';
    }).join('') + '</tbody></table></div>';
}

function internaHtml(r) {
  var ids = r.ids.filter(function (id) { return candPorId(JOGO, id).ativo; });
  var base = r.nac || r.uf;
  ids = ordenarPor(base, ids);
  var top = ids.slice(0, 5);
  return '<div class="pilha"><div class="rotulo">' + (r.escopo === 'nacional' ? 'Nacional' : ESTADO_POR_UF[r.escopo].nome) + ' · ' + fmtData(JOGO.cal, r.dia) + '</div>' +
    barrasIntencao(base, ids, { extras: [['Branco/nulo', base.nenhum], ['Não sabe', base.indeciso]] }) +
    '<div class="tabela-caixa"><table class="tabela"><thead><tr><th>Perfil</th>' + top.map(function (id) { return '<th class="n">' + esc(candPorId(JOGO, id).urna) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    SEG_IDS.map(function (g) {
      return '<tr><td>' + SEGMENTOS[g].nome + '</td>' + top.map(function (id) { return '<td class="n">' + r.seg[g][id] + '%</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table></div></div>';
}

ACOES_UI.pesquisaInterna = function (d) {
  var c = jogador(JOGO);
  var custo = d.v === 'nacional' ? 0.8 : 0.35;
  if (!podePagar(JOGO, c, custo)) { toast('Sem caixa para encomendar a pesquisa.'); return; }
  pesquisaInterna(JOGO, d.v);
  UI.aba = 'pesquisas';
  toast('Pesquisa interna concluída.');
  atualizar();
};

/* ---------- Apoios ---------- */
function abaApoios() {
  var c = jogador(JOGO);
  var html = '<p class="sec pequeno">Negociar um apoio ocupa um compromisso da agenda. A chance depende da sua afinidade ideológica, da sua posição nas pesquisas e da sua articulação. Oferecer espaço no governo aumenta a chance, mas pode render críticas.</p>';
  html += '<h3>Setores organizados</h3><div class="pilha" style="gap:8px">' + APOIOS.map(function (a) {
    var dono = JOGO.apoios[a.id] ? candPorId(JOGO, JOGO.apoios[a.id]) : null;
    var ch = chanceApoio(JOGO, c, a.id, 'programa');
    var efs = [];
    if (a.efeito.seg) for (var g in a.efeito.seg) efs.push(SEGMENTOS[g].curto + (a.efeito.seg[g] > 0 ? ' ▲' : ' ▼'));
    if (a.efeito.cred) for (var t in a.efeito.cred) efs.push(TEMAS[t].curto + (a.efeito.cred[t] > 0 ? ' ▲' : ' ▼'));
    if (a.efeito.dinheiro) efs.push('+' + fmtDinheiro(a.efeito.dinheiro));
    var motivo = '';
    if (!dono || dono.id !== c.id) {
      if (a.req.ideoMin !== undefined && c.x < a.req.ideoMin) motivo = 'Exige candidato mais à direita.';
      else if (a.req.ideoMax !== undefined && c.x > a.req.ideoMax) motivo = 'Exige candidato mais à esquerda.';
      else if (a.req.viab !== undefined && ((JOGO.percepcao && JOGO.percepcao[c.id]) || 0) < a.req.viab) motivo = 'Só negocia com quem tem ' + a.req.viab + '% ou mais.';
    }
    return '<div class="entre" style="border-bottom:1px solid var(--line);padding-bottom:8px;align-items:flex-start"><div style="min-width:0;flex:1"><b>' + esc(a.nome) + '</b><div class="pequeno sec">' + esc(a.desc) + '</div><div class="pequeno mudo">' + efs.join(' · ') + '</div></div>' +
      '<div style="text-align:right">' + (dono ? '<div class="pequeno">' + (dono.id === c.id ? '<b class="bom">Apoia você</b>' : 'Apoia ' + nomeCand(dono)) + '</div>' : '<div class="pequeno mudo">Sem candidato</div>') +
      (dono && dono.id === c.id ? '' : motivo ? '<div class="pequeno ruim">' + motivo + '</div>' : '<button class="btn btn-peq" data-a="prepAcao" data-t="apoio" data-alvo="' + a.id + '">Negociar · ' + Math.round(ch * 100) + '%</button>') + '</div></div>';
  }).join('') + '</div>';
  html += '<div class="divisor"></div><h3>Governadores</h3><div class="tabela-caixa"><table class="tabela"><thead><tr><th>UF</th><th>Governador(a)</th><th class="n">Aprov.</th><th>Apoia</th><th></th></tr></thead><tbody>' +
    Object.keys(JOGO.governadores).sort(function (a, b) { return ESTADO_POR_UF[b].eleitores - ESTADO_POR_UF[a].eleitores; }).map(function (uf) {
      var g = JOGO.governadores[uf];
      var ap = g.apoio ? candPorId(JOGO, g.apoio) : null;
      var ch = g.apoio === c.id ? 0 : chanceApoio(JOGO, c, 'gov:' + uf, 'programa');
      return '<tr' + (g.apoio === c.id ? ' class="voce"' : '') + '><td>' + uf + '</td><td>' + esc(g.nome) + ' <span class="mudo">(' + g.partido + ')</span></td><td class="n">' + g.aprov + '%</td><td>' + (ap ? nomeCand(ap) : '<span class="mudo">Neutro</span>') + '</td>' +
        '<td>' + (g.apoio === c.id ? '' : '<button class="btn btn-peq" data-a="prepAcao" data-t="apoio" data-alvo="gov:' + uf + '">' + Math.round(ch * 100) + '%</button>') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  return html;
}

/* ---------- TV e programa ---------- */
function abaEstrategia() {
  var c = jogador(JOGO);
  var cal = JOGO.cal;
  var hg = JOGO.fase === 'campanha2' ? cal.hgpe2 : cal.hgpe1;
  var html = '<div class="entre"><h3>Horário eleitoral gratuito</h3><span class="tag">' + fmtTempo(c.tvSeg || 0) + ' por bloco</span></div>';
  html += '<p class="sec pequeno">' + (JOGO.dia < hg[0] ? 'Começa em ' + fmtData(cal, hg[0]) + '. Defina desde já a linha do programa.' : JOGO.dia <= hg[1] ? 'No ar até ' + fmtData(cal, hg[1]) + '. A linha escolhida vale para toda a rodada.' : 'A propaganda deste turno já terminou.') + '</p>';
  var estr = [['positiva', 'Propositiva', 'Mostra propostas e reforça a credibilidade num tema.'], ['ataque', 'Ataque', 'Desconstrói um adversário. Desgasta o alvo e um pouco você.'], ['defesa', 'Defesa', 'Responde a ataques e reduz o desgaste da sua imagem.']];
  html += '<div class="opcoes-grandes" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' + estr.map(function (e) {
    return '<button class="opcao' + (c.tv.estrategia === e[0] ? ' sel' : '') + '" data-a="tvEstr" data-v="' + e[0] + '"><h4>' + e[1] + '</h4><span class="sec pequeno">' + e[2] + '</span></button>';
  }).join('') + '</div><div class="grade-campos">';
  if (c.tv.estrategia === 'positiva') html += '<div class="campo"><label for="tv-tema">Tema do programa</label><select id="tv-tema" data-mudar="tvCampo" data-k="tema">' + TEMA_IDS.map(function (t) { return '<option value="' + t + '"' + (c.tv.tema === t ? ' selected' : '') + '>' + TEMAS[t].nome + '</option>'; }).join('') + '</select></div>';
  if (c.tv.estrategia === 'ataque') {
    var adv = candidatosAtivos(JOGO).filter(function (o) { return !o.jogador; });
    if (!c.tv.alvo || !candPorId(JOGO, c.tv.alvo).ativo) c.tv.alvo = adv[0].id;
    html += '<div class="campo"><label for="tv-alvo">Alvo</label><select id="tv-alvo" data-mudar="tvCampo" data-k="alvo">' + adv.map(function (o) { return '<option value="' + o.id + '"' + (c.tv.alvo === o.id ? ' selected' : '') + '>' + esc(o.urna) + '</option>'; }).join('') + '</select></div>';
  }
  html += '<div class="campo"><label for="tv-inv">Produção</label><select id="tv-inv" data-mudar="tvCampo" data-k="invest">' + [1, 2, 3].map(function (k) { return '<option value="' + k + '"' + ((c.tv.invest || 2) === k ? ' selected' : '') + '>' + INVEST_TV[k].nome + ' · ' + fmtDinheiro(INVEST_TV[k].custo) + '/dia</option>'; }).join('') + '</select></div></div>';
  html += '<div class="divisor"></div><h3>Programa de governo</h3>';
  html += '<p class="pequeno"><b>Bandeiras:</b> ' + (c.bandeiras.map(function (t) { return TEMAS[t].nome; }).join(' · ') || '—') + '</p>';
  html += '<p class="pequeno"><b>Propostas anunciadas:</b> ' + (c.propostas.map(function (id) { return esc(PROPOSTA_POR_ID[id].nome); }).join(' · ') || 'nenhuma ainda') + '</p>';
  html += '<button class="btn btn-peq" data-a="prepAcao" data-t="proposta" style="justify-self:start">Lançar nova proposta</button>';
  html += '<div class="divisor"></div><h3>Sua imagem</h3>';
  html += '<div class="resumo-votos"><div class="it"><span class="rotulo">Momento</span><span class="v ' + (c.imagem >= 0 ? 'bom' : 'ruim') + '">' + (c.imagem >= 0.05 ? 'Em alta' : c.imagem <= -0.05 ? 'Em baixa' : 'Estável') + '</span></div>' +
    '<div class="it"><span class="rotulo">Desgaste</span><span class="v ' + (c.desgaste > 15 ? 'ruim' : '') + '">' + (c.desgaste > 25 ? 'Alto' : c.desgaste > 10 ? 'Moderado' : 'Baixo') + '</span></div>' +
    '<div class="it"><span class="rotulo">Conhecimento</span><span class="v">' + Math.round(UFS.reduce(function (t, u) { return t + c.recog[u] * ESTADO_POR_UF[u].eleitores; }, 0) / TOTAL_ELEITORES) + '%</span></div>' +
    '<div class="it"><span class="rotulo">Preparo p/ debate</span><span class="v">' + Math.round(c.preparo) + '/60</span></div></div>';
  html += '<h4>Credibilidade por tema</h4><div class="atributos">' + TEMA_IDS.map(function (t) {
    return '<div class="atributo" style="grid-template-columns:110px 1fr 26px"><span class="mudo">' + TEMAS[t].curto + '</span><div class="trilho"><div class="enchimento" style="width:' + c.cred[t] + '%"></div></div><span class="tnum">' + Math.round(c.cred[t]) + '</span></div>';
  }).join('') + '</div>';
  html += '<h4>Atributos</h4>' + atributosHtml(c.attr);
  return html;
}

ACOES_UI.tvEstr = function (d) { var c = jogador(JOGO); c.tv.estrategia = d.v; atualizar(); };
ACOES_UI.tvCampo = function (d, el) { var c = jogador(JOGO); c.tv[d.k] = d.k === 'invest' ? +el.value : el.value; atualizar(); };

/* ---------- Notícias e adversários ---------- */
var SELOS = { bom: ['bom', 'Positivo'], ruim: ['ruim', 'Negativo'], escandalo: ['ruim', 'Escândalo'], gafe: ['ruim', 'Gafe'], pesquisa: ['', 'Pesquisa'], debate: ['', 'Debate'], marco: ['', 'Calendário'], evento: ['', 'Plantão'], coligacao: ['', 'Alianças'], ataque: ['ruim', 'Ataque'], 'economia-bom': ['bom', 'Economia'], 'economia-ruim': ['ruim', 'Economia'], 'adv-bom': ['', 'Adversário'], 'adv-ruim': ['', 'Adversário'], campanha: ['', 'Campanha'], apoio2: ['', '2º turno'] };

function listaNoticias(lista) {
  return '<div class="noticias">' + lista.map(function (n) {
    var s = SELOS[n.tipo] || ['', 'Notícia'];
    return '<article class="noticia"><div class="meta"><span>' + fmtData(JOGO.cal, n.dia) + '</span><span class="selo ' + s[0] + '">' + s[1] + '</span>' + (n.cand && candPorId(JOGO, n.cand) ? '<span>' + nomeCand(candPorId(JOGO, n.cand)) + '</span>' : '') + '</div>' +
      '<div class="manchete">' + esc(n.titulo) + '</div>' + (n.texto ? '<div class="txt">' + esc(n.texto) + '</div>' : '') + '</article>';
  }).join('') + '</div>';
}

function abaNoticias() {
  return '<h3>Noticiário</h3>' + listaNoticias(JOGO.noticias.slice(-40).reverse());
}

function abaAdversarios() {
  var perc = JOGO.percepcao || {};
  var ult = JOGO.pesquisas.filter(function (p) { return p.rej; }).slice(-1)[0];
  var cs = candidatosAtivos(JOGO).slice().sort(function (a, b) { return (perc[b.id] || 0) - (perc[a.id] || 0); });
  return '<div class="pilha">' + cs.map(function (c) {
    var desg = c.desgaste > 25 ? 'muito desgastado' : c.desgaste > 12 ? 'desgastado' : 'imagem preservada';
    return '<div class="painel cartao-corpo pilha" style="gap:6px;border-left:5px solid ' + cor(c) + '"><div class="entre"><div><b style="font-family:var(--font-display);font-stretch:75%;font-size:1.25rem;text-transform:uppercase">' + esc(c.urna) + '</b> <span class="mudo">' + c.numero + ' · ' + esc(c.partido) + (c.jogador ? ' · você' : '') + '</span></div>' +
      '<span class="tag">' + fmtNum(perc[c.id] || 0, 0) + '% nas pesquisas' + (ult && ult.rej[c.id] !== undefined ? ' · rejeição ' + ult.rej[c.id] + '%' : '') + '</span></div>' +
      '<div class="pequeno sec">' + esc(c.bio) + '</div>' +
      '<div class="pequeno">' + rotuloIdeologia(c.x) + ' · Coligação: ' + esc(c.coligacao.join(', ')) + ' · TV: ' + fmtTempo(c.tvSeg || 0) + ' · ' + desg + '</div>' +
      (c.apoios.length ? '<div class="pequeno mudo">Apoios: ' + c.apoios.map(function (a) { return esc(APOIO_POR_ID[a].curto); }).join(', ') + '</div>' : '') +
      (!c.jogador ? '<div class="linha-botoes"><button class="btn btn-peq" data-a="prepAcao" data-t="ataque" data-alvo="' + c.id + '">Atacar</button></div>' : '') + '</div>';
  }).join('') + '</div>';
}

/* ---------- Tela ---------- */
TELAS.campanha = function () {
  var conteudo = { agenda: abaAgenda, pesquisas: abaPesquisas, apoios: abaApoios, estrategia: abaEstrategia, noticias: abaNoticias, adversarios: abaAdversarios }[UI.aba]();
  return topoCampanha() +
    '<main class="mesa gutter"><div class="col-mapa">' + blocoMapa() + '</div>' +
    '<div class="col-acoes"><section class="painel"><nav class="abas" role="tablist">' + ABAS.map(function (a) {
      return '<button class="aba' + (UI.aba === a[0] ? ' ativa' : '') + '" role="tab" aria-selected="' + (UI.aba === a[0]) + '" data-a="aba" data-v="' + a[0] + '">' + a[1] + '</button>';
    }).join('') + '</nav><div class="conteudo-aba">' + conteudo + '</div></section></div></main>' +
    docaAgenda();
};
TELAS.campanha_depois = function () {
  ligarGraficos();
  ligarDicasMapa(document.getElementById('caixa-mapa'), dicaMapa);
};
ACOES_UI.aba = function (d) { UI.aba = d.v; atualizar(); };

/* ---------- Menu ---------- */
ACOES_UI.menuJogo = function () {
  abrirModal('<div class="modal-topo"><h2>Menu</h2></div><div class="modal-corpo pilha">' +
    '<button class="btn" data-a="salvarMenu">Salvar campanha</button>' +
    '<button class="btn" data-a="comoJogar">Como jogar</button>' +
    '<button class="btn" data-a="sairInicio">Sair para a tela inicial</button>' +
    '<p class="mudo pequeno">O jogo salva automaticamente ao fim de cada rodada, neste navegador.</p>' +
    '</div><div class="modal-rodape"><button class="btn btn-confirma" data-a="fecharModal">Voltar ao jogo</button></div>');
};
ACOES_UI.salvarMenu = function () { salvarJogo(); fecharModal(); };
ACOES_UI.sairInicio = function () { salvarJogo(true); fecharModal(); JOGO = null; irPara('inicio'); };

/* ---------- Avanço da rodada ---------- */
ACOES_UI.avancar = function () {
  var livres = slotsDoTurno(JOGO) - JOGO.agenda.length;
  if (livres > 0 && !UI.confirmouVazio) {
    abrirModal('<div class="modal-topo"><h3>Agenda incompleta</h3></div><div class="modal-corpo"><p>Você ainda tem ' + livres + ' compromisso(s) livre(s). Seus adversários vão usar todo o tempo deles.</p></div>' +
      '<div class="modal-rodape"><button class="btn" data-a="fecharModal">Voltar e completar</button><button class="btn" data-a="sugerirEFechar">Usar sugestão da coordenação</button><button class="btn btn-confirma" data-a="avancarMesmo">Avançar assim</button></div>');
    return;
  }
  UI.confirmouVazio = false;
  UI.acaoSel = null;
  continuarRodada();
};
ACOES_UI.sugerirEFechar = function () { fecharModal(); ACOES_UI.sugerirAgenda(); };
ACOES_UI.avancarMesmo = function () { fecharModal(); UI.confirmouVazio = true; ACOES_UI.avancar(); };

function continuarRodada() {
  var r = processarTurno(JOGO);
  if (r.tipo === 'sabatina') { UI.sab = montarSabatina(JOGO); irPara('sabatina'); return; }
  if (r.tipo === 'debate') { irPara('debate'); return; }
  // fim da rodada
  var t = turnoAtual(JOGO);
  var resumo = montarResumoRodada(t);
  var proximo = encerrarTurno(JOGO);
  salvarJogo(true);
  if (proximo === 'eleicao') { irPara('vespera'); abrirModal(resumo, { largo: true, fechavel: false }); return; }
  irPara('campanha');
  abrirModal(resumo, { largo: true, fechavel: false });
}

function montarResumoRodada(t) {
  var c = jogador(JOGO);
  var ini = JOGO.resumoInicio || { noticias: 0, pesquisas: 0, percepcao: {} };
  var minhas = (JOGO.resultadosTurno || []).filter(function (r) { return r.tipo === 'acao'; });
  var pesq = JOGO.pesquisas.slice(ini.pesquisas).filter(function (p) { return p.res; });
  var antes = ini.percepcao[c.id], depois = JOGO.percepcao[c.id];
  var delta = antes !== undefined ? depois - antes : 0;
  var noticias = JOGO.noticias.slice(ini.noticias).filter(function (n) { return n.tipo !== 'pesquisa'; }).slice(-8).reverse();
  var titulo = JOGO.config.ritmo === 'diario' ? 'Balanço do dia · ' + fmtData(JOGO.cal, t[0]) : 'Balanço da semana · ' + fmtDataCurta(JOGO.cal, t[0]) + ' a ' + fmtDataCurta(JOGO.cal, t[1]);
  var gasto = ini.dinheiro !== undefined ? ini.dinheiro - c.dinheiro : 0;
  var html = '<div class="modal-topo"><span class="rotulo">' + (JOGO.fase === 'campanha2' ? '2º turno' : '1º turno') + '</span><h2>' + titulo + '</h2></div><div class="modal-corpo pilha">';
  html += '<div class="resumo-votos"><div class="it"><span class="rotulo">Média nas pesquisas</span><span class="v">' + fmtNum(depois || 0, 1) + '% <span class="' + (delta >= 0 ? 'bom' : 'ruim') + '">(' + fmtSinal(delta) + ')</span></span></div>' +
    '<div class="it"><span class="rotulo">Caixa</span><span class="v">' + fmtDinheiro(c.dinheiro) + ' <span class="mudo">(' + (gasto >= 0 ? '−' : '+') + fmtDinheiro(Math.abs(gasto)) + ')</span></span></div>' +
    '<div class="it"><span class="rotulo">Energia</span><span class="v">' + Math.round(c.energia) + '%</span></div></div>';
  if (minhas.length) html += '<div><h4>Sua agenda</h4><ul class="pequeno" style="margin:6px 0 0;padding-left:18px">' + minhas.map(function (m) {
    return '<li class="' + (m.res.tipo === 'bom' ? 'bom' : m.res.tipo === 'ruim' ? 'ruim' : '') + '">' + esc(m.res.texto) + '</li>';
  }).join('') + '</ul></div>';
  if (pesq.length) {
    html += '<div><h4>Pesquisas divulgadas</h4>' + tabelaPesquisas(pesq.slice().reverse()) + '</div>';
  }
  (JOGO.resultadosTurno || []).filter(function (r) { return r.tipo === 'debate'; }).forEach(function (r) {
    html += '<p class="pequeno"><b>Debate na ' + esc(r.sessao.emissora) + '</b> (você não participou): ' + esc(candPorId(JOGO, r.res.vencedor).urna) + ' venceu para ' + r.res.quemVenceu[r.res.vencedor] + '% dos espectadores.</p>';
  });
  if (noticias.length) html += '<div><h4>Manchetes</h4>' + listaNoticias(noticias) + '</div>';
  html += '</div><div class="modal-rodape"><button class="btn btn-confirma" data-a="fecharResumo">Planejar a próxima rodada</button></div>';
  return html;
}

ACOES_UI.fecharResumo = function () { fecharModal(); mostrarEventosPendentes(); };
ACOES_UI.fecharModalEventos = function () { fecharModal(); mostrarEventosPendentes(); };

/* ---------- Eventos com decisão ---------- */
function mostrarEventosPendentes() {
  if (!JOGO || !JOGO.pendentes || !JOGO.pendentes.length) return;
  var ev = JOGO.pendentes[0];
  var ops = opcoesDisponiveis(JOGO, ev);
  abrirModal('<div class="modal-topo"><span class="plantao">Plantão da campanha</span><h2>' + esc(ev.titulo) + '</h2></div>' +
    '<div class="modal-corpo pilha"><p>' + esc(ev.texto) + '</p><div class="rotulo">Como você reage?</div><div class="opcoes-evento">' +
    ops.map(function (o, i) { return '<button class="opcao-evento" data-a="decidirEvento" data-i="' + i + '"' + (o.ok ? '' : ' disabled') + '><b>' + esc(o.rotulo) + '</b><span>' + esc(o.desc) + '</span></button>'; }).join('') +
    '</div></div>', { fechavel: false });
}

ACOES_UI.decidirEvento = function (d) {
  var ev = JOGO.pendentes.shift();
  var txt = resolverEvento(JOGO, ev, +d.i);
  atualizarCache(JOGO);
  salvarJogo(true);
  abrirModal('<div class="modal-topo"><span class="rotulo">Desdobramento</span><h3>' + esc(ev.titulo) + '</h3></div><div class="modal-corpo"><p>' + esc(txt) + '</p></div>' +
    '<div class="modal-rodape"><button class="btn btn-confirma" data-a="fecharModalEventos">Continuar</button></div>', { fechavel: false });
  atualizar();
};
