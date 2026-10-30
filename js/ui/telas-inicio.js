/* Telas de abertura: capa, configuração, escolha e criação do candidato. */

TELAS.inicio = function () {
  var salvo = temJogoSalvo();
  var rec = lerRecordes().slice(-6).reverse();
  var tabRec = rec.length ? '<div class="recordes"><div class="rotulo">Suas últimas campanhas</div><table>' + rec.map(function (r) {
    return '<tr><td>' + esc(r.data.split('-').reverse().join('/')) + '</td><td>' + esc(r.nome) + ' (' + esc(r.partido) + ')</td><td class="tnum">' +
      (r.pct2 !== null && r.pct2 !== undefined ? '2º turno: ' + fmtPct(r.pct2) : '1º turno: ' + fmtPct(r.pct1 || 0)) + '</td><td>' + (r.venceu ? 'Eleito(a)' : 'Derrotado(a)') + '</td></tr>';
  }).join('') + '</table></div>' : '';
  return '<main class="capa gutter"><div class="capa-grade">' +
    '<div><div class="rotulo" style="color:var(--urna-muted)">Simulador de eleição presidencial</div>' +
    '<h1>Palanque</h1>' +
    '<p class="sub">Monte sua chapa, costure alianças, percorra os 27 estados, enfrente os debates na TV e acompanhe a apuração voto a voto até a posse no Palácio do Planalto.</p>' +
    '<div class="linha-botoes">' +
    '<button class="btn btn-confirma btn-grande" data-a="novaCampanha">Nova campanha</button>' +
    (salvo ? '<button class="btn btn-grande" data-a="continuar">Continuar campanha salva</button>' : '') +
    '<button class="btn btn-grande" data-a="comoJogar">Como jogar</button>' +
    '</div>' + tabRec + '<p class="pequeno" style="color:var(--urna-muted);margin-top:28px">Personagens e partidos fictícios. Mapa: svg-maps (CC BY 4.0).</p></div>' +
    '<div><div class="urna-tela" aria-hidden="true"><div class="cargo">Seu voto para</div><div class="tit">Presidente</div>' +
    '<div class="lado" style="align-items:flex-end;gap:14px"><span class="pequeno">Número:</span>' + digitosUrna('  ').replace(/<div class="digito"> <\/div>/g, '<div class="digito">&nbsp;</div>') + '</div>' +
    '<div class="pequeno" style="margin-top:12px">Nome: ____________________<br>Partido: ________</div>' +
    '<div class="rodape-urna">Aperte a tecla:<br><b>CONFIRMA</b> para CONFIRMAR este voto<br><b>CORRIGE</b> para REINICIAR este voto</div></div>' +
    '<div class="teclado" aria-hidden="true">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''].map(function (d) { return d ? '<div class="tecla">' + d + '</div>' : '<div></div>'; }).join('') + '</div>' +
    '<div class="linha-botoes" style="margin-top:10px" aria-hidden="true"><span class="btn btn-branco btn-peq">Branco</span><span class="btn btn-corrige btn-peq">Corrige</span><span class="btn btn-confirma btn-peq">Confirma</span></div>' +
    '</div></div></main>';
};

ACOES_UI.novaCampanha = function () { irPara('config'); };
ACOES_UI.continuar = function () {
  if (!carregarJogo()) { toast('Não foi possível carregar a campanha salva.'); return; }
  retomarTela();
};
ACOES_UI.comoJogar = function () {
  abrirModal('<div class="modal-topo"><h2>Como jogar</h2></div><div class="modal-corpo pilha">' +
    '<p><b>Objetivo:</b> ser eleito(a) presidente. Se ninguém tiver mais da metade dos votos válidos no 1º turno, os dois mais votados disputam o 2º turno.</p>' +
    '<p><b>Pré-campanha:</b> escolha o vice, negocie a coligação (mais partidos = mais tempo de TV, dinheiro e palanques nos estados), contrate o marqueteiro e defina as bandeiras do programa.</p>' +
    '<p><b>Campanha:</b> a cada semana (ou dia, no ritmo diário) você monta a agenda: comícios, carreatas, visitas a públicos específicos, entrevistas, redes sociais, arrecadação, ataques, propostas e negociação de apoios com governadores e setores organizados.</p>' +
    '<p><b>Recursos:</b> dinheiro (fundo eleitoral + doações, com teto de gastos), energia do candidato (cansaço gera gafes) e tempo de TV (definido pela bancada da coligação).</p>' +
    '<p><b>Mídia:</b> no horário eleitoral você escolhe a linha do programa — propositiva, ataque ou defesa. Há sabatina no telejornal e debates em várias emissoras.</p>' +
    '<p><b>Pesquisas:</b> institutos publicam pesquisas com margem de erro e viés. Encomende pesquisas internas para ver os números reais por estado e por perfil de eleitor.</p>' +
    '<p><b>Eleitorado:</b> cada estado tem cinco perfis de eleitor (evangélicos, classe popular, classe média, agro/interior e jovens) com prioridades diferentes. Voto útil cresce perto da eleição.</p>' +
    '<p><b>Apuração:</b> acompanhe a totalização como na noite da eleição. As urnas das capitais chegam primeiro; o interior e o Norte, depois.</p>' +
    '<p class="mudo pequeno">Candidatos, partidos, governadores e institutos são fictícios. Eleitorado por estado baseado em dados do TSE; mapa do Brasil de svg-maps (Victor Cazanave), licença CC BY 4.0.</p>' +
    '</div><div class="modal-rodape"><button class="btn btn-confirma" data-a="fecharModal">Entendi</button></div>');
};
ACOES_UI.fecharModal = function () { fecharModal(); };

/* ---------- Configuração ---------- */
TELAS.config = function () {
  var c = UI.config;
  function op(grupo, val, titulo, desc) {
    return '<button class="opcao' + (c[grupo] === val ? ' sel' : '') + '" data-a="cfg" data-g="' + grupo + '" data-v="' + val + '"><h3>' + titulo + '</h3><p class="sec pequeno">' + desc + '</p></button>';
  }
  return cabecalhoTela('Nova campanha', 'Configuração da partida', 0) +
    '<main class="container gutter pilha-g">' +
    '<section class="pilha"><h2>Ritmo da campanha</h2><div class="opcoes-grandes">' +
    op('ritmo', 'semanal', 'Semanal', 'Cada rodada é uma semana, com 5 compromissos na agenda. Cerca de 7 rodadas no 1º turno e 3 no 2º. Partidas de 30 a 60 minutos.') +
    op('ritmo', 'diario', 'Diário', 'Cada rodada é um dia, com 2 compromissos (manhã e tarde/noite). Cerca de 49 rodadas no 1º turno e 20 no 2º. Controle fino, partidas longas.') +
    '</div></section>' +
    '<section class="pilha"><h2>Dificuldade</h2><div class="opcoes-grandes">' +
    op('dificuldade', 'facil', 'Fácil', 'Mais dinheiro, ações mais eficazes e adversários menos agressivos.') +
    op('dificuldade', 'normal', 'Normal', 'Condições equilibradas.') +
    op('dificuldade', 'dificil', 'Difícil', 'Menos recursos, adversários mais eficientes e crises mais duras.') +
    '</div></section>' +
    '<section class="pilha"><h2>Ano da eleição</h2><div class="opcoes-grandes">' +
    op('ano', 2026, '2026', '1º turno em 4 de outubro e 2º turno em 25 de outubro.') +
    op('ano', 2030, '2030', '1º turno em 6 de outubro e 2º turno em 27 de outubro.') +
    '</div></section>' +
    '<div class="linha-botoes"><button class="btn" data-a="voltarInicio">Voltar</button><button class="btn btn-confirma btn-grande" data-a="irEscolha">Escolher candidato</button></div>' +
    '</main>';
};

function cabecalhoTela(rotulo, titulo, passo) {
  var passos = ['Configuração', 'Candidato', 'Vice', 'Coligação', 'Marqueteiro', 'Programa'];
  return '<header class="cabecalho-tela gutter"><div style="max-width:1180px;margin:0 auto"><div class="rotulo">' + esc(rotulo) + '</div><h1>' + esc(titulo) + '</h1>' +
    '<div class="passos">' + passos.map(function (p, i) {
      return '<span class="passo' + (i === passo ? ' ativo' : (i < passo ? ' feito' : '')) + '">' + (i + 1) + '. ' + p + '</span>';
    }).join('') + '</div></div></header>';
}

ACOES_UI.cfg = function (d) {
  UI.config[d.g] = d.g === 'ano' ? +d.v : d.v;
  atualizar();
};
ACOES_UI.voltarInicio = function () { irPara('inicio'); };
ACOES_UI.irEscolha = function () { irPara('escolha'); };

/* ---------- Escolha do candidato ---------- */
var PERFIL_LARGADA = { ribeiro: 'Favorito · candidato do governo', valente: 'Líder da oposição', albuquerque: 'Terceira via à esquerda', helena: 'Terceira via de centro', teixeira: 'Centro-direita', fernanda: 'Esquerda radical', castro: 'Liberal estreante', brandao: 'Azarão linha-dura' };
var DIFICULDADE_CAND = { ribeiro: 'Fácil', valente: 'Média', albuquerque: 'Difícil', helena: 'Difícil', teixeira: 'Difícil', fernanda: 'Muito difícil', castro: 'Muito difícil', brandao: 'Muito difícil' };

function santinhoHtml(d, sel, acao) {
  var p = PARTIDO_POR_SIGLA[d.partido];
  return '<button class="santinho' + (sel ? ' sel' : '') + '" style="--cor:var(--c' + d.cor + ')" data-a="' + acao + '" data-id="' + d.id + '">' +
    '<div class="santinho-topo"><div><div class="rotulo">' + esc(PERFIL_LARGADA[d.id] || '') + '</div><div class="santinho-nome">' + esc(d.urna) + '</div></div><div class="santinho-num">' + p.numero + '</div></div>' +
    '<div class="santinho-corpo"><div class="lado"><span class="tag"><span class="pt"></span>' + esc(d.partido) + '</span><span class="tag">' + rotuloIdeologia(d.x) + '</span><span class="tag">' + esc(d.uf) + '</span></div>' +
    '<div class="sec">' + esc(d.nome) + ', ' + d.idade + ' anos. ' + esc(d.bio) + '</div>' +
    atributosHtml(d.attr) +
    '<div class="entre pequeno"><span class="mudo">Conhecido por ' + d.recog + '% dos eleitores</span>' + (DIFICULDADE_CAND[d.id] ? '<span><b>Desafio:</b> ' + DIFICULDADE_CAND[d.id] + '</span>' : '') + '</div>' +
    '</div></button>';
}

TELAS.escolha = function () {
  return cabecalhoTela('Nova campanha', 'Quem vai para a disputa?', 1) +
    '<main class="container gutter pilha-g">' +
    '<p class="sec">Escolha um dos pré-candidatos ou crie o seu. Os demais serão seus adversários, controlados pelo computador. Todos os nomes e partidos são fictícios.</p>' +
    '<div class="santinhos">' + CANDIDATOS_PRONTOS.map(function (d) { return santinhoHtml(d, false, 'escolherPronto'); }).join('') +
    '<button class="santinho" style="--cor:var(--ink)" data-a="irCriar"><div class="santinho-topo"><div><div class="rotulo">Do zero</div><div class="santinho-nome">Criar candidato</div></div><div class="santinho-num">??</div></div>' +
    '<div class="santinho-corpo"><div class="sec">Defina nome, partido, estado de origem, trajetória, posição ideológica e atributos. Se escolher um partido que já tem candidato, você ocupa a vaga dele.</div></div></button>' +
    '</div><div class="linha-botoes"><button class="btn" data-a="novaCampanha">Voltar</button></div></main>';
};

ACOES_UI.escolherPronto = function (d) {
  UI.escolha = { tipo: 'pronto', id: d.id };
  comecarJogo();
};
ACOES_UI.irCriar = function () {
  UI.criar = UI.criar || {
    nome: '', urna: '', genero: 'F', idade: 52, uf: 'MG', partido: 'PSN', trajetoria: 'governador', x: 15, slogan: '',
    attr: { carisma: 55, oratoria: 55, gestao: 55, articulacao: 55, integridade: 55 }
  };
  irPara('criar');
};

/* ---------- Criação do candidato ---------- */
var PONTOS_ATRIBUTOS = 275;
function pontosUsados(attr) { return attr.carisma + attr.oratoria + attr.gestao + attr.articulacao + attr.integridade; }

TELAS.criar = function () {
  var f = UI.criar;
  var p = PARTIDO_POR_SIGLA[f.partido];
  var dono = CANDIDATOS_PRONTOS.filter(function (c) { return c.partido === f.partido; })[0];
  var restantes = PONTOS_ATRIBUTOS - pontosUsados(f.attr);
  var nomesAttr = { carisma: 'Carisma', oratoria: 'Oratória (debates)', gestao: 'Gestão', articulacao: 'Articulação política', integridade: 'Integridade' };
  var traj = TRAJETORIAS[f.trajetoria];
  var preview = {
    id: 'novo', urna: f.urna || f.nome.split(' ')[0] || 'Seu nome', nome: f.nome || 'Seu nome completo', idade: f.idade, partido: f.partido,
    uf: f.uf, x: f.x, cor: dono ? dono.cor : 8, bio: traj.nome + ' de ' + ESTADO_POR_UF[f.uf].nome + '.', recog: clamp(8 + traj.recogNac, 3, 70), attr: f.attr
  };
  var minX = clamp(p.ideo - 35, -100, 100), maxX = clamp(p.ideo + 35, -100, 100);
  return cabecalhoTela('Nova campanha', 'Criar candidato', 1) +
    '<main class="container gutter"><div class="mesa mesa-larga">' +
    '<div class="pilha-g">' +
    '<section class="cartao cartao-corpo pilha"><h3>Identidade</h3><div class="grade-campos">' +
    '<div class="campo"><label for="c-nome">Nome completo</label><input type="text" id="c-nome" maxlength="40" value="' + esc(f.nome) + '" data-digitar="criarCampo" data-k="nome" placeholder="Ex.: Joana Martins da Silva"></div>' +
    '<div class="campo"><label for="c-urna">Nome na urna</label><input type="text" id="c-urna" maxlength="18" value="' + esc(f.urna) + '" data-digitar="criarCampo" data-k="urna" placeholder="Ex.: Joana"></div>' +
    '<div class="campo"><label for="c-genero">Gênero</label><select id="c-genero" data-mudar="criarCampo" data-k="genero"><option value="F"' + (f.genero === 'F' ? ' selected' : '') + '>Feminino</option><option value="M"' + (f.genero === 'M' ? ' selected' : '') + '>Masculino</option></select></div>' +
    '<div class="campo"><label for="c-idade">Idade (mínimo 35 anos)</label><input type="number" id="c-idade" min="35" max="90" value="' + f.idade + '" data-mudar="criarCampo" data-k="idade"></div>' +
    '<div class="campo"><label for="c-uf">Estado de origem</label><select id="c-uf" data-mudar="criarCampo" data-k="uf">' + UFS_MAPA.map(function (u) { return '<option value="' + u + '"' + (u === f.uf ? ' selected' : '') + '>' + ESTADO_POR_UF[u].nome + '</option>'; }).join('') + '</select></div>' +
    '<div class="campo"><label for="c-slogan">Slogan (opcional)</label><input type="text" id="c-slogan" maxlength="48" value="' + esc(f.slogan) + '" data-digitar="criarCampo" data-k="slogan" placeholder="Ex.: O Brasil pode mais"></div>' +
    '</div></section>' +
    '<section class="cartao cartao-corpo pilha"><h3>Partido</h3>' +
    '<div class="campo"><label for="c-partido">Legenda</label><select id="c-partido" data-mudar="criarCampo" data-k="partido">' + PARTIDOS.map(function (pp) {
      var dd = CANDIDATOS_PRONTOS.filter(function (c) { return c.partido === pp.sigla; })[0];
      return '<option value="' + pp.sigla + '"' + (pp.sigla === f.partido ? ' selected' : '') + '>' + pp.sigla + ' ' + pp.numero + ' · ' + esc(pp.nome) + (dd ? ' (vaga de ' + dd.urna + ')' : '') + '</option>';
    }).join('') + '</select></div>' +
    '<div class="lado"><span class="tag">' + rotuloIdeologia(p.ideo) + '</span><span class="tag">' + p.bancada + ' deputados</span><span class="tag">Fundo: ' + fmtDinheiro(p.fundo) + '</span><span class="tag">Número ' + p.numero + '</span></div>' +
    '<p class="sec pequeno">' + (dono ? 'Você substitui ' + esc(dono.nome) + ' como candidato(a) do partido e herda a coligação dele(a).' : 'O candidato mais fraco da disputa (' + esc(CANDIDATOS_PRONTOS[CANDIDATOS_PRONTOS.length - 1].urna) + ') desiste antes das convenções e abre espaço para você.') +
    ' Partidos grandes dão mais tempo de TV e dinheiro; partidos pequenos podem ficar fora de debates.</p></section>' +
    '<section class="cartao cartao-corpo pilha"><h3>Trajetória</h3><div class="opcoes-grandes" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr))">' +
    Object.keys(TRAJETORIAS).map(function (k) {
      var t = TRAJETORIAS[k];
      return '<button class="opcao' + (k === f.trajetoria ? ' sel' : '') + '" data-a="criarTraj" data-v="' + k + '"><h4>' + esc(t.nome) + '</h4><span class="sec pequeno">' + esc(t.desc) + '</span></button>';
    }).join('') + '</div></section>' +
    '<section class="cartao cartao-corpo pilha"><h3>Posição ideológica</h3>' +
    '<div class="campo"><label for="c-x">' + rotuloIdeologia(f.x) + ' (' + f.x + ')</label><input type="range" id="c-x" min="' + minX + '" max="' + maxX + '" value="' + f.x + '" data-digitar="criarX"></div>' +
    '<p class="sec pequeno">O partido aceita candidatos entre ' + minX + ' e ' + maxX + '. Quanto mais ao centro, maior o eleitorado potencial; quanto mais perto de um polo, mais forte a disputa com o candidato daquele campo.</p></section>' +
    '<section class="cartao cartao-corpo pilha"><div class="entre"><h3>Atributos</h3><span class="tag ' + (restantes < 0 ? 'ruim' : '') + '">Pontos restantes: ' + restantes + '</span></div>' +
    Object.keys(nomesAttr).map(function (k) {
      return '<div class="campo"><label for="a-' + k + '">' + nomesAttr[k] + ': <b class="tnum">' + f.attr[k] + '</b></label><input type="range" id="a-' + k + '" min="20" max="90" value="' + f.attr[k] + '" data-digitar="criarAttr" data-k="' + k + '"></div>';
    }).join('') +
    '<p class="sec pequeno">A trajetória soma bônus a estes valores. Carisma pesa em comícios; oratória, nos debates; gestão, na credibilidade das propostas; articulação, nas alianças; integridade reduz o risco de escândalos.</p></section>' +
    '</div>' +
    '<aside class="pilha" style="align-content:start;position:sticky;top:16px">' + santinhoHtml(preview, true, 'nada').replace('<button', '<div').replace(/<\/button>$/, '</div>') +
    '<button class="btn btn-confirma btn-grande" data-a="confirmarCriacao"' + (restantes < 0 ? ' disabled' : '') + '>Registrar pré-candidatura</button>' +
    '<button class="btn" data-a="irEscolha">Voltar</button></aside>' +
    '</div></main>';
};

ACOES_UI.nada = function () {};
ACOES_UI.criarCampo = function (d, el) {
  var v = el.value;
  if (d.k === 'idade') v = clamp(parseInt(v, 10) || 35, 35, 90);
  UI.criar[d.k] = v;
  if (d.k === 'nome' || d.k === 'urna') {
    var alvo = document.querySelector('aside .santinho-nome');
    if (alvo) alvo.textContent = (UI.criar.urna || UI.criar.nome.split(' ')[0] || 'Seu nome');
  }
  if (d.k === 'partido') {
    var p = PARTIDO_POR_SIGLA[v];
    UI.criar.x = clamp(UI.criar.x, p.ideo - 35, p.ideo + 35);
  }
  if (el.tagName === 'SELECT' || d.k === 'idade') atualizar();
};
ACOES_UI.criarTraj = function (d) { UI.criar.trajetoria = d.v; atualizar(); };
ACOES_UI.criarX = function (d, el) {
  UI.criar.x = +el.value;
  var lab = el.parentNode.querySelector('label');
  lab.textContent = rotuloIdeologia(UI.criar.x) + ' (' + UI.criar.x + ')';
};
ACOES_UI.criarAttr = function (d, el) {
  var f = UI.criar;
  var v = +el.value;
  var outros = pontosUsados(f.attr) - f.attr[d.k];
  v = Math.min(v, PONTOS_ATRIBUTOS - outros);
  v = Math.max(20, v);
  f.attr[d.k] = v;
  el.value = v;
  var lab = el.parentNode.querySelector('label b');
  lab.textContent = v;
  var tag = el.closest('section').querySelector('.tag');
  tag.textContent = 'Pontos restantes: ' + (PONTOS_ATRIBUTOS - pontosUsados(f.attr));
};
ACOES_UI.confirmarCriacao = function () {
  var f = UI.criar;
  if (!f.nome.trim()) { toast('Informe o nome completo do candidato.'); return; }
  if (f.idade < 35) { toast('A Constituição exige idade mínima de 35 anos para presidente.'); return; }
  UI.escolha = { tipo: 'criar', dados: {
    nome: f.nome.trim(), urna: (f.urna || f.nome.split(' ')[0]).trim(), genero: f.genero, idade: +f.idade, uf: f.uf, partido: f.partido,
    trajetoria: f.trajetoria, x: +f.x, attr: copiar(f.attr), slogan: f.slogan.trim()
  } };
  comecarJogo();
};

function comecarJogo() {
  JOGO = novoJogo({ ritmo: UI.config.ritmo, dificuldade: UI.config.dificuldade, ano: UI.config.ano }, UI.escolha);
  atualizarCache(JOGO);
  UI.pre = { vice: null, msgs: [], negociacoes: 0, marq: null, bandeiras: [] };
  UI.aba = 'agenda';
  UI.ufSel = null;
  irPara('pre');
}

/* Volta para a tela correspondente à fase do jogo carregado. */
function retomarTela() {
  var f = JOGO.fase;
  if (f === 'precampanha') { UI.pre = UI.pre || { msgs: [], negociacoes: JOGO.negociacoesPre || 0, bandeiras: [] }; UI.pre.msgs = UI.pre.msgs || []; UI.pre.bandeiras = UI.pre.bandeiras || []; irPara('pre'); }
  else if (f === 'campanha1' || f === 'campanha2') {
    if (JOGO.debateAtual) irPara('debate');
    else { irPara('campanha'); mostrarEventosPendentes(); }
  }
  else if (f === 'apuracao1' || f === 'apuracao2') irPara('vespera');
  else if (f === 'entreturnos') irPara('entreturnos');
  else if (f === 'eliminado') irPara('eliminado');
  else if (f === 'fim') irPara('fim');
  else irPara('inicio');
}
