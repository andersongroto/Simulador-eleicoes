/* Pré-campanha: convenção partidária, vice, coligação, marqueteiro e programa. */

var ETAPAS_PRE = ['vice', 'coligacao', 'marqueteiro', 'programa'];
var MAX_NEGOCIACOES = 3;

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
  var etapa = JOGO.etapaPre || 'vice';
  var passo = 2 + ETAPAS_PRE.indexOf(etapa);
  var titulos = { vice: 'Convenção: escolha o vice', coligacao: 'Negocie a coligação', marqueteiro: 'Contrate o marqueteiro', programa: 'Defina as bandeiras do programa' };
  var corpo = { vice: preVice, coligacao: preColigacao, marqueteiro: preMarqueteiro, programa: prePrograma }[etapa]();
  var msgs = (UI.pre.msgs || []).slice(-4).map(function (m) {
    return '<div class="noticia"><div class="meta"><span class="selo ' + (m.ok ? 'bom' : 'ruim') + '">' + (m.ok ? 'Acordo fechado' : 'Sem acordo') + '</span></div><div class="txt">' + esc(m.texto) + '</div></div>';
  }).join('');
  return cabecalhoTela('Pré-campanha · julho de ' + JOGO.cal.ano, titulos[etapa], passo) +
    '<main class="container gutter"><div class="mesa mesa-larga">' +
    '<div class="pilha-g">' + corpo + '</div>' +
    '<aside class="pilha" style="align-content:start">' + resumoChapa(c) + (msgs ? '<div class="cartao cartao-corpo"><div class="rotulo">Negociações</div><div class="noticias">' + msgs + '</div></div>' : '') + pesquisaPre() + '</aside>' +
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
  if (r.ok) { JOGO.etapaPre = 'coligacao'; atualizarCache(JOGO); }
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
  JOGO.etapaPre = 'coligacao';
  atualizar();
};

function preColigacao() {
  var c = jogador(JOGO);
  var restantes = MAX_NEGOCIACOES - (JOGO.negociacoesPre || 0);
  var lista = partidosNegociaveis(JOGO).sort(function (a, b) { return b.bancada - a.bancada; });
  return '<p class="sec">Cada partido aliado soma tempo de TV (pela bancada), dinheiro do fundo eleitoral e palanques com governadores e prefeitos. Partidos ideológicos olham afinidade; os fisiológicos olham suas chances e o espaço no governo. Tirar um partido de outra chapa é difícil.</p>' +
    '<div class="entre"><span class="tag">Rodadas de negociação restantes: ' + restantes + '</span><button class="btn btn-confirma" data-a="preAvancar" data-para="marqueteiro">Fechar coligação</button></div>' +
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
ACOES_UI.preAvancar = function (d) { JOGO.etapaPre = d.para; salvarJogo(true); atualizar(); window.scrollTo(0, 0); };

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
  JOGO.etapaPre = 'programa';
  salvarJogo(true);
  atualizar();
  window.scrollTo(0, 0);
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
  if (!c.marqueteiro) contratarMarqueteiro(JOGO, 'propria');
  definirProgramaJogador(JOGO, UI.pre.bandeiras);
  iniciarCampanha(JOGO);
  UI.aba = 'agenda';
  salvarJogo(true);
  irPara('campanha');
  abrirModal('<div class="modal-topo"><span class="rotulo">' + fmtDataLonga(JOGO.cal, 0) + '</span><h2>A campanha começou</h2></div><div class="modal-corpo pilha">' +
    '<p>Sua candidatura foi registrada. Até ' + fmtDataLonga(JOGO.cal, JOGO.cal.eleicao1) + ' você terá ' + JOGO.turnos.length + ' rodadas para convencer o eleitorado.</p>' +
    '<p class="sec">Monte a agenda escolhendo ações na aba <b>Agenda</b> ou clicando nos estados do mapa. Quando terminar, aperte <b>Confirma</b> para executar a rodada.</p>' +
    '<p class="sec">Tempo de TV por bloco: <b>' + fmtTempo(c.tvSeg) + '</b> · Caixa: <b>' + fmtDinheiro(c.dinheiro) + '</b> · Teto de gastos: ' + fmtDinheiro(TETO_1T) + '</p>' +
    '</div><div class="modal-rodape"><button class="btn btn-confirma" data-a="fecharModalEventos">Começar</button></div>');
};
