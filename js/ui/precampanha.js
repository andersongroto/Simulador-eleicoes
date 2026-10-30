/* Pré-campanha: convenção partidária, vice, coligação, marqueteiro e programa. */

var ETAPAS_POR_CARGO = {
  presidente: ['vice', 'coligacao', 'palanques', 'marqueteiro', 'programa'],
  governador: ['vice', 'coligacao', 'marqueteiro', 'palanque', 'programa'],
  senador: ['coligacao', 'marqueteiro', 'palanque', 'programa'],
  depfed: ['dobrada', 'marqueteiro', 'palanque', 'programa'],
  depest: ['dobrada', 'marqueteiro', 'palanque', 'programa']
};
var NOMES_ETAPA = { vice: 'Vice', coligacao: 'Coligação', palanques: 'Palanques', marqueteiro: 'Marqueteiro', palanque: 'Presidenciável', programa: 'Programa', dobrada: 'Dobradinha' };
var MAX_NEGOCIACOES = 3;
var MAX_LANCAMENTOS = 4;

function etapasPre() { return ETAPAS_POR_CARGO[JOGO.cargo || 'presidente']; }
function proximaEtapa(atual) { var l = etapasPre(); return l[Math.min(l.length - 1, l.indexOf(atual) + 1)]; }
function irEtapa(e) { JOGO.etapaPre = e; salvarJogo(true); atualizar(); window.scrollTo(0, 0); }

function nivelRisco(r) { return r >= 0.3 ? 'alto' : (r >= 0.15 ? 'médio' : 'baixo'); }

function resumoChapa(c) {
  var ids = candidatosAtivos(JOGO).map(function (x) { return x.id; });
  var tv = calcularTempoTV(JOGO, ids, false)[c.id];
  var fundo = fundoColigacao(c) * (DIFICULDADES[JOGO.config.dificuldade].dinheiro);
  var gov = Object.keys(JOGO.governadores).filter(function (uf) { return c.coligacao.indexOf(JOGO.governadores[uf].partido) >= 0; });
  return '<div class="cartao cartao-corpo pilha">' +
    '<div class="entre"><h3>Sua chapa</h3><span class="santinho-num" style="font-size:1.5rem">' + c.numero + '</span></div>' +
    '<div><b>' + esc(c.nome) + '</b> <span class="mudo">(' + esc(c.partido) + ')</span>' + (c.vice ? '<br><span class="sec">Vice: ' + esc(VICES[c.vice].nome) + ' (' + VICES[c.vice].partido + ')</span>' : '') + '</div>' +
    '<div class="lado">' + c.coligacao.map(function (s) { return '<span class="tag">' + s + '</span>'; }).join('') + '</div>' +
    '<div class="resumo-votos">' +
    '<div class="it"><span class="rotulo">Deputados</span><span class="v">' + bancadaColigacao(c) + '</span></div>' +
    '<div class="it"><span class="rotulo">TV por bloco (estim.)</span><span class="v">' + fmtTempo(tv) + '</span></div>' +
    '<div class="it"><span class="rotulo">Fundo eleitoral</span><span class="v">' + fmtDinheiro(fundo) + '</span></div>' +
    '<div class="it"><span class="rotulo">Governadores aliados</span><span class="v">' + gov.length + '</span></div>' +
    '</div></div>';
}

function fmtTempo(seg) {
  seg = Math.round(seg);
  var m = Math.floor(seg / 60), s = seg % 60;
  return m + 'min' + String(s).padStart(2, '0') + 's';
}

function pesquisaPre() {
  var r = JOGO._cache || atualizarCache(JOGO);
  var ids = ordenarPor(r.nac, r.ids);
  return '<div class="cartao cartao-corpo pilha"><div class="entre"><h3>Pesquisa de pré-campanha</h3><span class="rotulo">Intenção de voto estimulada</span></div>' +
    barrasIntencao(r.nac, ids, { extras: [['Branco/nulo', r.nac.nenhum], ['Não sabe', r.nac.indeciso]] }) + '</div>';
}

TELAS.pre = function () {
  var c = jogador(JOGO);
  var est = ehEstadual();
  var etapa = JOGO.etapaPre || etapasPre()[0];
  var passo = 2 + etapasPre().indexOf(etapa);
  var titulos = {
    vice: est ? 'Convenção: escolha o vice-governador' : 'Convenção: escolha o vice', coligacao: 'Negocie a coligação',
    palanques: 'Monte seus palanques nos estados', marqueteiro: 'Contrate o marqueteiro', palanque: 'Quem você apoia para presidente?',
    programa: 'Defina as bandeiras do programa', dobrada: 'Escolha sua dobradinha'
  };
  var corpo = {
    vice: est ? preViceGov : preVice, coligacao: est ? preColigacaoEst : preColigacao, palanques: prePalanques,
    marqueteiro: est ? preMarqEst : preMarqueteiro, palanque: prePalanque, programa: prePrograma, dobrada: preDobrada
  }[etapa]();
  var msgs = (UI.pre.msgs || []).slice(-4).map(function (m) {
    return '<div class="noticia"><div class="meta"><span class="selo ' + (m.ok ? 'bom' : 'ruim') + '">' + (m.ok ? 'Acordo fechado' : 'Sem acordo') + '</span></div><div class="txt">' + esc(m.texto) + '</div></div>';
  }).join('');
  var passos = ['Configuração', 'Candidato'].concat(etapasPre().map(function (e) { return NOMES_ETAPA[e]; }));
  var rot = 'Pré-campanha · julho de ' + JOGO.cal.ano + (est ? ' · ' + nomeCargo(c.cargo, c.genero) + ' (' + c.uf + ')' : '');
  return cabecalhoTela(rot, titulos[etapa], passo, passos) +
    '<main class="container gutter"><div class="mesa mesa-larga">' +
    '<div class="pilha-g">' + corpo + '</div>' +
    '<aside class="pilha" style="align-content:start">' + (est ? resumoChapaEst(c) : resumoChapa(c)) + (msgs ? '<div class="cartao cartao-corpo"><div class="rotulo">Negociações</div><div class="noticias">' + msgs + '</div></div>' : '') + (est ? pesquisaPreEst(c) : pesquisaPre()) + '</aside>' +
    '</div></main>';
};

function preVice() {
  var c = jogador(JOGO);
  var lista = vicesDisponiveis(JOGO);
  var tent = c.tentativasVice || 0;
  return '<p class="sec">O vice ajuda no estado de origem e junto a perfis de eleitor. Se for de outro partido, a legenda dele entra na sua coligação, desde que aceite. Você tem até 3 convites.</p>' +
    '<div class="opcoes-grandes">' + lista.map(function (id) {
      var v = VICES[id];
      var fora = v.partido !== c.partido && c.coligacao.indexOf(v.partido) < 0;
      var ch = fora ? chancePartido(JOGO, c, v.partido, 'vice') : 1;
      var efs = [];
      for (var t in v.cred) efs.push(TEMAS[t].curto + ' +' + v.cred[t]);
      for (var g in v.segAff) efs.push(SEGMENTOS[g].curto + ' ' + (v.segAff[g] > 0 ? '▲' : '▼'));
      return '<button class="opcao" data-a="preVice" data-id="' + id + '"' + (tent >= 3 ? ' disabled' : '') + '><h3>' + esc(v.nome) + '</h3>' +
        '<div class="lado"><span class="tag">' + v.partido + '</span><span class="tag">' + v.uf + '</span><span class="tag">' + rotuloIdeologia(v.x) + '</span></div>' +
        '<span class="sec pequeno">' + esc(v.perfil) + '</span>' +
        '<span class="pequeno">' + esc(efs.join(' · ') || 'Sem efeitos especiais') + '</span>' +
        '<span class="pequeno mudo">Risco de polêmica: ' + nivelRisco(v.risco) + (fora ? ' · Traz o ' + v.partido + ' (chance ~' + Math.round(ch * 100) + '%)' : '') + '</span></button>';
    }).join('') + '</div>' +
    (tent >= 3 ? '<p class="ruim">Sem mais convites possíveis. A chapa sairá com um vice do seu próprio partido.</p><div><button class="btn btn-confirma" data-a="preViceProprio">Seguir com vice do partido</button></div>' : '');
}

ACOES_UI.preVice = function (d) {
  var r = escolherVice(JOGO, d.id);
  UI.pre.msgs.push({ ok: r.ok, texto: r.texto });
  if (r.ok) { JOGO.etapaPre = proximaEtapa('vice'); atualizarCache(JOGO); }
  else {
    var c = jogador(JOGO);
    c.tentativasVice = (c.tentativasVice || 0) + 1;
  }
  salvarJogo(true);
  atualizar();
};
ACOES_UI.preViceProprio = function () {
  var c = jogador(JOGO);
  c.vice = null;
  irEtapa(proximaEtapa('vice'));
};

function preColigacao() {
  var c = jogador(JOGO);
  var restantes = MAX_NEGOCIACOES - (JOGO.negociacoesPre || 0);
  var lista = partidosNegociaveis(JOGO).sort(function (a, b) { return b.bancada - a.bancada; });
  return '<p class="sec">Cada partido aliado soma tempo de TV (pela bancada), dinheiro do fundo eleitoral e palanques com governadores e prefeitos. Partidos ideológicos olham afinidade; os fisiológicos olham suas chances e o espaço no governo. Tirar um partido de outra chapa é difícil.</p>' +
    '<div class="entre"><span class="tag">Rodadas de negociação restantes: ' + restantes + '</span><button class="btn btn-confirma" data-a="preAvancar">Fechar coligação</button></div>' +
    '<div class="tabela-caixa"><table class="tabela"><thead><tr><th>Partido</th><th>Perfil</th><th class="n">Deputados</th><th class="n">Fundo</th><th>Situação</th><th>Proposta</th></tr></thead><tbody>' +
    lista.map(function (p) {
      var dono = JOGO.partidos[p.sigla] ? candPorId(JOGO, JOGO.partidos[p.sigla]) : null;
      var chC = chancePartido(JOGO, c, p.sigla, 'cargos'), chP = chancePartido(JOGO, c, p.sigla, 'pauta');
      var dis = restantes <= 0 ? ' disabled' : '';
      return '<tr><td><b>' + p.sigla + '</b><br><span class="mudo pequeno">' + esc(p.nome) + '</span></td>' +
        '<td class="pequeno">' + rotuloIdeologia(p.ideo) + '<br><span class="mudo">' + (p.fisio > 0.6 ? 'Fisiológico' : (p.fisio < 0.25 ? 'Ideológico' : 'Pragmático')) + '</span></td>' +
        '<td class="n">' + p.bancada + '</td><td class="n">' + fmtDinheiro(p.fundo * 0.3) + '</td>' +
        '<td class="pequeno">' + (dono ? 'Apoia ' + esc(dono.urna) : 'Livre') + '</td>' +
        '<td><div class="pilha" style="gap:6px"><button class="btn btn-peq" data-a="preNegociar" data-s="' + p.sigla + '" data-o="cargos"' + dis + '>Cargos no governo · ' + Math.round(chC * 100) + '%</button>' +
        '<button class="btn btn-peq" data-a="preNegociar" data-s="' + p.sigla + '" data-o="pauta"' + dis + '>Pauta: ' + TEMAS[p.pauta].curto + ' · ' + Math.round(chP * 100) + '%</button></div></td></tr>';
    }).join('') + '</tbody></table></div>';
}

ACOES_UI.preNegociar = function (d) {
  if ((JOGO.negociacoesPre || 0) >= MAX_NEGOCIACOES) return;
  var r = negociarPartido(JOGO, d.s, d.o);
  UI.pre.msgs.push({ ok: r.ok, texto: r.texto });
  atualizarCache(JOGO);
  salvarJogo(true);
  atualizar();
};
ACOES_UI.preAvancar = function () { irEtapa(proximaEtapa(JOGO.etapaPre)); };

function preMarqueteiro() {
  var c = jogador(JOGO);
  var caixa = fundoColigacao(c) * DIFICULDADES[JOGO.config.dificuldade].dinheiro * 0.7 + (c.dinheiroExtra || 0);
  return '<p class="sec">O marqueteiro define a qualidade do seu programa de TV, das redes sociais e da preparação para debates. O contrato sai da primeira parcela do fundo (' + fmtDinheiro(caixa) + ').</p>' +
    '<div class="opcoes-grandes">' + MARQUETEIROS.map(function (m) {
      var pode = m.custo <= caixa * 0.6;
      return '<button class="opcao' + (c.marqueteiro === m.id ? ' sel' : '') + '" data-a="preMarq" data-id="' + m.id + '"' + (pode ? '' : ' disabled') + '><h3>' + esc(m.nome) + '</h3>' +
        '<span class="sec pequeno">' + esc(m.chefe) + ' · ' + esc(m.desc) + '</span>' +
        '<span class="pequeno">TV ×' + fmtNum(m.tv, 2) + ' · Redes ×' + fmtNum(m.digital, 2) + ' · Debates +' + m.debate + '</span>' +
        '<b>' + fmtDinheiro(m.custo) + '</b>' + (pode ? '' : '<span class="ruim pequeno">Fora do orçamento</span>') + '</button>';
    }).join('') + '</div>';
}

ACOES_UI.preMarq = function (d) {
  contratarMarqueteiro(JOGO, d.id);
  irEtapa(proximaEtapa('marqueteiro'));
};

function prePrograma() {
  var c = jogador(JOGO);
  var sel = UI.pre.bandeiras || [];
  return '<p class="sec">Escolha três bandeiras. Elas ganham credibilidade e orientam o seu programa de TV. Pense nos perfis de eleitor que você quer conquistar.</p>' +
    '<div class="opcoes-grandes" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">' + TEMA_IDS.map(function (t) {
      var quem = SEG_IDS.filter(function (g) { return SEGMENTOS[g].pesos[t] >= 0.15; }).map(function (g) { return SEGMENTOS[g].curto; });
      return '<button class="opcao' + (sel.indexOf(t) >= 0 ? ' sel' : '') + '" data-a="preBandeira" data-t="' + t + '"><h4>' + TEMAS[t].nome + '</h4>' +
        '<span class="pequeno">Sua credibilidade: <b>' + Math.round(c.cred[t]) + '</b></span>' +
        '<span class="pequeno mudo">Mais valorizado por: ' + (quem.join(', ') || 'todos, em menor grau') + '</span></button>';
    }).join('') + '</div>' +
    '<div class="linha-botoes"><button class="btn btn-confirma btn-grande" data-a="preIniciar"' + (sel.length === 3 ? '' : ' disabled') + '>Registrar candidatura no TSE</button><span class="mudo pequeno">' + sel.length + ' de 3 bandeiras escolhidas</span></div>';
}

ACOES_UI.preBandeira = function (d) {
  var sel = UI.pre.bandeiras = UI.pre.bandeiras || [];
  var i = sel.indexOf(d.t);
  if (i >= 0) sel.splice(i, 1);
  else if (sel.length < 3) sel.push(d.t);
  atualizar();
};

ACOES_UI.preIniciar = function () {
  var c = jogador(JOGO);
  var est = ehEstadual();
  if (!c.marqueteiro) contratarMarqueteiro(JOGO, est ? 'proprio' : 'propria');
  definirProgramaJogador(JOGO, UI.pre.bandeiras);
  iniciarCampanha(JOGO);
  UI.aba = 'agenda';
  salvarJogo(true);
  irPara('campanha');
  abrirModal('<div class="modal-topo"><span class="rotulo">' + fmtDataLonga(JOGO.cal, 0) + '</span><h2>A campanha começou</h2></div><div class="modal-corpo pilha">' +
    '<p>Sua candidatura foi registrada. Até ' + fmtDataLonga(JOGO.cal, JOGO.cal.eleicao1) + ' você terá ' + JOGO.turnos.length + ' rodadas para convencer o eleitorado.</p>' +
    (est ? '<p class="sec">Monte a agenda escolhendo ações na aba <b>Agenda</b> ou nos cartões da capital e do interior. Quando terminar, aperte <b>Confirma</b> para executar a rodada.</p>'
      : '<p class="sec">Monte a agenda escolhendo ações na aba <b>Agenda</b> ou clicando nos estados do mapa. Quando terminar, aperte <b>Confirma</b> para executar a rodada.</p>') +
    '<p class="sec">' + (est ? (c.tvShare ? 'Tempo de TV: <b>' + fmtPct(c.tvShare * 100, 0) + ' do horário</b> · ' : '') : 'Tempo de TV por bloco: <b>' + fmtTempo(c.tvSeg) + '</b> · ') + 'Caixa: <b>' + fmtDinheiro(c.dinheiro) + '</b> · Teto de gastos: ' + fmtDinheiro(tetoDoCandidato(JOGO, c)) + '</p>' +
    '</div><div class="modal-rodape"><button class="btn btn-confirma" data-a="fecharModalEventos">Começar</button></div>');
};


/* ---------- Pré-campanha das disputas estaduais ---------- */

function resumoChapaEst(c) {
  var vagas = c.cargo === 'depfed' ? VAGAS_FED[c.uf] : c.cargo === 'depest' ? vagasEstaduais(c.uf) : null;
  var pres = c.palanque ? candPorId(JOGO, c.palanque) : null;
  return '<div class="cartao cartao-corpo pilha">' +
    '<div class="entre"><h3>Sua candidatura</h3><span class="santinho-num" style="font-size:1.5rem">' + c.numero + '</span></div>' +
    '<div><b>' + esc(c.nome) + '</b> <span class="mudo">(' + esc(c.partido) + ')</span><br><span class="sec">' + nomeCargo(c.cargo, c.genero) + ' · ' + esc(ESTADO_POR_UF[c.uf].nome) + '</span>' +
    (c.viceGov ? '<br><span class="sec">Vice: ' + esc(c.viceGov.nome) + ' (' + c.viceGov.partido + ')</span>' : '') +
    (c.dobrada ? '<br><span class="sec">Dobradinha: ' + esc(c.dobrada.urna) + ' (' + c.dobrada.cargoNome.toLowerCase() + ')</span>' : '') + '</div>' +
    (vagas ? '' : '<div class="lado">' + c.coligacao.map(function (s) { return '<span class="tag">' + s + '</span>'; }).join('') + '</div>') +
    '<div class="resumo-votos">' +
    (vagas ? '<div class="it"><span class="rotulo">Vagas em disputa</span><span class="v">' + vagas + '</span></div>' : '<div class="it"><span class="rotulo">Partidos aliados</span><span class="v">' + c.coligacao.length + '</span></div>') +
    '<div class="it"><span class="rotulo">Fundo do partido</span><span class="v">' + fmtDinheiro(fundoEstadual(c) * DIFICULDADES[JOGO.config.dificuldade].dinheiro) + '</span></div>' +
    '<div class="it"><span class="rotulo">Teto de gastos</span><span class="v">' + fmtDinheiro(tetoCargo(c.cargo, c.uf, 1)) + '</span></div>' +
    '<div class="it"><span class="rotulo">Presidenciável</span><span class="v">' + (pres ? esc(pres.urna) : 'Neutro') + '</span></div>' +
    '</div></div>';
}

function pesquisaPreEst(c) {
  if (c.cargo === 'depfed' || c.cargo === 'depest') {
    var pr = projecaoDeputado(JOGO);
    return '<div class="cartao cartao-corpo pilha"><h3>Cenário da lista</h3>' +
      '<p class="sec pequeno">Na eleição proporcional, primeiro os votos do partido definem quantas cadeiras ele conquista; depois os mais votados da lista ficam com as vagas.</p>' +
      '<div class="resumo-votos"><div class="it"><span class="rotulo">Cadeiras do ' + c.partido + ' (estim.)</span><span class="v">' + fmtNum(pr.cadeirasEstimadas, 1) + '</span></div>' +
      '<div class="it"><span class="rotulo">Quociente eleitoral (estim.)</span><span class="v">' + fmtVotos(pr.qe) + '</span></div>' +
      '<div class="it"><span class="rotulo">Seus votos hoje</span><span class="v">' + fmtVotos(pr.meus) + '</span></div>' +
      '<div class="it"><span class="rotulo">Posição na lista</span><span class="v">' + pr.rank + 'º</span></div></div></div>';
  }
  var r = intencoesEstadual(JOGO, c.uf, c.cargo, {});
  var ids = ordenarPor(r.total, r.ids);
  return '<div class="cartao cartao-corpo pilha"><div class="entre"><h3>Pesquisa de pré-campanha</h3><span class="rotulo">' + esc(ESTADO_POR_UF[c.uf].nome) + '</span></div>' +
    barrasEst(r.total, ids, { extras: [['Branco/nulo', r.total.nenhum], ['Não sabe', r.total.indeciso]] }) + '</div>';
}

/* Barras de intenção para candidatos estaduais (cores próprias de cada disputa). */
function barrasEst(dist, ids, opts) {
  return barrasIntencao(dist, ids, opts);
}

function preViceGov() {
  var c = jogador(JOGO);
  var lista = opcoesViceGov(JOGO);
  var tent = c.tentativasVice || 0;
  return '<p class="sec">O vice reforça sua chapa numa região do estado e junto a um perfil de eleitor. Se for de outro partido, a legenda entra na coligação, se aceitar.</p>' +
    '<div class="opcoes-grandes">' + lista.map(function (v, i) {
      var fora = v.partido !== c.partido && c.coligacao.indexOf(v.partido) < 0;
      var ch = fora ? chancePartidoEst(JOGO, c, v.partido, 'vice') : 1;
      return '<button class="opcao" data-a="preViceGov" data-i="' + i + '"' + (tent >= 3 ? ' disabled' : '') + '><h3>' + esc(v.nome) + '</h3>' +
        '<div class="lado"><span class="tag">' + v.partido + '</span><span class="tag">' + esc(v.perfil) + '</span></div>' +
        '<span class="pequeno">Forte em: ' + esc(nomesZonas(c.uf)[v.zona]) + ' · ' + SEGMENTOS[v.seg].curto + '</span>' +
        (fora ? '<span class="pequeno mudo">Traz o ' + v.partido + ' (chance ~' + Math.round(ch * 100) + '%)</span>' : '<span class="pequeno mudo">Do seu partido</span>') + '</button>';
    }).join('') + '</div>' +
    (tent >= 3 ? '<div><button class="btn btn-confirma" data-a="preViceProprio">Seguir com vice do partido</button></div>' : '');
}
ACOES_UI.preViceGov = function (d) {
  var r = escolherViceGov(JOGO, +d.i);
  UI.pre.msgs.push({ ok: r.ok, texto: r.texto });
  if (r.ok) JOGO.etapaPre = proximaEtapa('vice');
  salvarJogo(true);
  atualizar();
};

function preColigacaoEst() {
  var c = jogador(JOGO);
  var restantes = MAX_NEGOCIACOES - (JOGO.negociacoesPre || 0);
  var lista = partidosNegociaveisEst(JOGO).sort(function (a, b) { return b.bancada - a.bancada; });
  return '<p class="sec">Os partidos aliados somam tempo de TV no horário estadual e palanques com prefeitos e vereadores. Partidos que já têm candidato próprio não entram em outra chapa.</p>' +
    '<div class="entre"><span class="tag">Rodadas de negociação restantes: ' + restantes + '</span><button class="btn btn-confirma" data-a="preAvancar">Fechar coligação</button></div>' +
    '<div class="tabela-caixa"><table class="tabela"><thead><tr><th>Partido</th><th>Perfil</th><th class="n">Força no ' + REGIOES[ESTADO_POR_UF[c.uf].reg] + '</th><th>Situação</th><th>Proposta</th></tr></thead><tbody>' +
    lista.map(function (p) {
      var dono = donoPartidoEst(JOGO, c, p.sigla);
      var chC = chancePartidoEst(JOGO, c, p.sigla, 'cargos'), chP = chancePartidoEst(JOGO, c, p.sigla, 'pauta');
      var dis = restantes <= 0 ? ' disabled' : '';
      return '<tr><td><b>' + p.sigla + '</b><br><span class="mudo pequeno">' + esc(p.nome) + '</span></td>' +
        '<td class="pequeno">' + rotuloIdeologia(p.ideo) + '<br><span class="mudo">' + (p.fisio > 0.6 ? 'Fisiológico' : (p.fisio < 0.25 ? 'Ideológico' : 'Pragmático')) + '</span></td>' +
        '<td class="n">' + Math.round((p.forca[ESTADO_POR_UF[c.uf].reg] || 0) * 100) + '</td>' +
        '<td class="pequeno">' + (dono ? 'Apoia ' + esc(dono.urna) : 'Livre') + '</td>' +
        '<td><div class="pilha" style="gap:6px"><button class="btn btn-peq" data-a="preNegociarEst" data-s="' + p.sigla + '" data-o="cargos"' + dis + '>Cargos · ' + Math.round(chC * 100) + '%</button>' +
        '<button class="btn btn-peq" data-a="preNegociarEst" data-s="' + p.sigla + '" data-o="pauta"' + dis + '>Pauta: ' + TEMAS[p.pauta].curto + ' · ' + Math.round(chP * 100) + '%</button></div></td></tr>';
    }).join('') + '</tbody></table></div>';
}
ACOES_UI.preNegociarEst = function (d) {
  if ((JOGO.negociacoesPre || 0) >= MAX_NEGOCIACOES) return;
  var r = negociarPartidoEst(JOGO, d.s, d.o);
  UI.pre.msgs.push({ ok: r.ok, texto: r.texto });
  salvarJogo(true);
  atualizar();
};

function preMarqEst() {
  var c = jogador(JOGO);
  var teto = tetoCargo(c.cargo, c.uf, 1);
  var caixa = fundoEstadual(c) * DIFICULDADES[JOGO.config.dificuldade].dinheiro * 0.7 + (c.dinheiroExtra || 0);
  return '<p class="sec">A agência define a qualidade da sua TV, das redes e da preparação para debates. O contrato sai da primeira parcela do fundo (' + fmtDinheiro(caixa) + ').</p>' +
    '<div class="opcoes-grandes">' + MARQUETEIROS_EST.map(function (m) {
      var custo = m.fator * teto;
      var pode = custo <= caixa * 0.6;
      return '<button class="opcao' + (c.marqueteiro === m.id ? ' sel' : '') + '" data-a="preMarq" data-id="' + m.id + '"' + (pode ? '' : ' disabled') + '><h3>' + esc(m.nome) + '</h3>' +
        '<span class="sec pequeno">' + esc(m.desc) + '</span>' +
        '<span class="pequeno">TV ×' + fmtNum(m.tv, 2) + ' · Redes ×' + fmtNum(m.digital, 2) + ' · Debates +' + m.debate + '</span>' +
        '<b>' + fmtDinheiro(custo) + '</b>' + (pode ? '' : '<span class="ruim pequeno">Fora do orçamento</span>') + '</button>';
    }).join('') + '</div>';
}

function preDobrada() {
  var c = jogador(JOGO);
  var lista = opcoesDobrada(JOGO);
  var outro = c.cargo === 'depfed' ? 'deputado estadual' : 'deputado federal';
  return '<p class="sec">Dobradinha é a parceria com um candidato do seu partido na outra casa (' + outro + '): vocês dividem santinhos, carros de som e cabos eleitorais, e um leva votos para o outro.</p>' +
    '<div class="opcoes-grandes">' + lista.map(function (d, i) {
      return '<button class="opcao" data-a="preDobrada" data-i="' + i + '"><h3>' + esc(d.urna) + '</h3><span class="sec pequeno">' + esc(d.cargoNome) + ' · ' + esc(d.desc) + '</span>' +
        '<span class="pequeno">Forte em: ' + esc(nomesZonas(c.uf)[d.zona]) + ' · ' + SEGMENTOS[d.seg].curto + '</span></button>';
    }).join('') + '<button class="opcao" data-a="preDobrada" data-i="-1"><h3>Sem dobradinha</h3><span class="sec pequeno">Campanha solo, sem dividir o reduto.</span></button></div>';
}
ACOES_UI.preDobrada = function (d) {
  escolherDobrada(JOGO, +d.i < 0 ? null : +d.i);
  irEtapa(proximaEtapa('dobrada'));
};

function prePalanque() {
  var c = jogador(JOGO);
  var dopartido = JOGO.partidos[c.partido] ? candPorId(JOGO, JOGO.partidos[c.partido]) : null;
  var r = JOGO._cache;
  var pres = ordenarPor(r.nac, r.ids).map(function (id) { return candPorId(JOGO, id); });
  return '<p class="sec">Eleitores costumam "casar" o voto: quem vota num presidenciável tende a votar nos candidatos do palanque dele. Apoiar alguém forte no seu estado ajuda; apoiar quem é rejeitado aqui atrapalha.' +
    (dopartido ? ' Seu partido apoia <b>' + esc(dopartido.urna) + '</b>; escolher outro nome é dissidência e gera desgaste.' : ' Seu partido está liberado na eleição presidencial.') + '</p>' +
    '<div class="opcoes-grandes">' + pres.map(function (p) {
      var noEstado = r.uf[c.uf] ? r.uf[c.uf][p.id] : 0;
      return '<button class="opcao' + (c.palanque === p.id ? ' sel' : '') + '" data-a="prePalanque" data-id="' + p.id + '" style="--cor:' + cor(p) + '"><h3><span class="pt"></span>' + esc(p.urna) + '</h3>' +
        '<span class="sec pequeno">' + esc(p.partido) + ' · ' + rotuloIdeologia(p.x) + '</span>' +
        '<span class="pequeno">' + fmtNum(r.nac[p.id], 0) + '% no país · ' + fmtNum(noEstado, 0) + '% em ' + c.uf + '</span>' +
        (dopartido && dopartido.id !== p.id ? '<span class="pequeno ruim">Dissidência do partido</span>' : '') + '</button>';
    }).join('') + '<button class="opcao' + (!c.palanque ? ' sel' : '') + '" data-a="prePalanque" data-id=""><h3>Neutro</h3><span class="sec pequeno">Sem palanque presidencial. Evita rejeição, perde o voto casado.</span></button></div>';
}
ACOES_UI.prePalanque = function (d) {
  definirPalanqueJogador(JOGO, d.id || null);
  irEtapa(proximaEtapa('palanque'));
};

/* ---------- Palanques do presidenciável nos estados ---------- */
function prePalanques() {
  var c = jogador(JOGO);
  var restantes = MAX_LANCAMENTOS - (JOGO.lancamentos || 0);
  return '<p class="sec">Em cada estado, seus aliados disputam o governo. Escolha quem será o seu palanque oficial ou lance um candidato do ' + esc(c.partido) + ' onde o partido não tem nome. Um palanque forte puxa votos para você, e você puxa votos para ele.</p>' +
    '<div class="entre"><span class="tag">Lançamentos disponíveis: ' + restantes + '</span><button class="btn btn-confirma" data-a="preAvancar">Confirmar palanques</button></div>' +
    '<div class="tabela-caixa"><table class="tabela"><thead><tr><th>UF</th><th>Seu palanque</th><th class="n">Pesquisa</th><th>Opções</th></tr></thead><tbody>' +
    UFS_MAPA.slice().sort(function (a, b) { return ESTADO_POR_UF[b].eleitores - ESTADO_POR_UF[a].eleitores; }).map(function (uf) {
      var r = intencoesEstadual(JOGO, uf, 'governador', {});
      var aliados = candsDisputa(JOGO, uf, 'governador').filter(function (o) { return o.palanque === c.id || c.coligacao.indexOf(o.partido) >= 0; });
      var of = palanqueNoEstado(JOGO, uf, c.id);
      var temProprio = candsDisputa(JOGO, uf, 'governador').some(function (o) { return o.partido === c.partido; });
      var sel = aliados.length > 1 ? '<select data-mudar="prePalOficial" data-uf="' + uf + '">' + aliados.map(function (o) { return '<option value="' + o.id + '"' + (of && of.id === o.id ? ' selected' : '') + '>' + esc(o.urna) + ' (' + o.partido + ')</option>'; }).join('') + '</select>' : '';
      return '<tr><td>' + uf + '</td><td>' + (of ? esc(of.urna) + ' <span class="mudo">(' + of.partido + ')</span>' : '<span class="mudo">Sem palanque</span>') + '</td>' +
        '<td class="n">' + (of ? fmtNum(r.total[of.id], 0) + '%' : '—') + '</td>' +
        '<td><div class="lado">' + sel + (!temProprio && restantes > 0 ? '<button class="btn btn-peq" data-a="preLancar" data-uf="' + uf + '">Lançar candidato do ' + esc(c.partido) + '</button>' : '') + '</div></td></tr>';
    }).join('') + '</tbody></table></div>';
}
ACOES_UI.prePalOficial = function (d, el) { definirPalanqueOficial(JOGO, d.uf, el.value); atualizar(); };
ACOES_UI.preLancar = function (d) {
  if ((JOGO.lancamentos || 0) >= MAX_LANCAMENTOS) return;
  var n = lancarCandidatoProprio(JOGO, d.uf);
  if (n) UI.pre.msgs.push({ ok: true, texto: 'O ' + n.partido + ' lança ' + n.urna + ' ao governo ' + prepUF(d.uf, 'de') + '.' });
  salvarJogo(true);
  atualizar();
};
