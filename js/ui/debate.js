/* Telas do debate na TV e da sabatina no telejornal. */

var NOMES_PASSO = { pergunta: 'Pergunta dos jornalistas', perguntar: 'Confronto direto: sua pergunta', replica: 'Sua réplica', responder: 'Confronto direto: você é questionado', consideracoes: 'Considerações finais' };

function pulpitos(s, falando) {
  return '<div class="palco">' + s.participantes.map(function (id) {
    var c = candPorId(JOGO, id);
    return '<div class="pulpito' + (c.jogador ? ' voce' : '') + (falando === id ? ' falando' : '') + '" style="--cor:' + cor(c) + '"><span class="n">' + esc(c.urna) + '</span><span class="p">' + c.numero + ' · ' + esc(c.partido) + '</span></div>';
  }).join('') + '</div>';
}

function transcricao(log) {
  return '<div class="transcricao" id="transcricao">' + (log.length ? log.map(function (l) {
    if (l.quem === 'jornalista') return '<div class="fala jornalista"><div class="quem">Jornalista</div><div class="txt">' + esc(l.texto) + '</div></div>';
    var c = candPorId(JOGO, l.quem);
    return '<div class="fala"><div class="quem"><span class="pt" style="--cor:' + cor(c) + '"></span>' + esc(c.urna) + (l.nota ? ' <span class="nota nota-' + l.nota + '">' + l.nota + '</span>' : '') + '</div><div class="txt">' + esc(l.texto) + '</div></div>';
  }).join('') : '<p style="color:#9fb0c8">Boa noite. Começa agora o debate entre os candidatos à Presidência da República.</p>') + '</div>';
}

TELAS.debate = function () {
  var s = JOGO.debateAtual || UI.debateFim;
  if (!s) return '';
  var c = jogador(JOGO);
  var mesa;
  if (UI.debRes) {
    var r = UI.debRes;
    var ids = ordenarPor(r.quemVenceu, s.participantes);
    var minha = r.medias ? r.medias[c.id] : 0;
    mesa = '<div class="mesa-debate"><span class="rotulo">Pesquisa com espectadores</span><h2>Quem venceu o debate?</h2>' +
      ids.map(function (id) { var o = candPorId(JOGO, id); return '<div class="entre"><span><span class="pt" style="--cor:' + cor(o) + '"></span>' + esc(o.urna) + '</span><b class="tnum">' + r.quemVenceu[id] + '%</b></div>'; }).join('') +
      '<p style="color:#9fb0c8">Sua nota média: <b style="color:#eef1f6">' + fmtNum(minha, 1) + '</b> (de −2,5 a 4), ' +
      (r.efeitos[c.id] > 0.03 ? 'acima da média dos participantes. Sua imagem sai fortalecida.' : r.efeitos[c.id] < -0.03 ? 'abaixo da média dos participantes. Sua imagem sai arranhada.' : 'na média dos participantes.') + '</p>' +
      '<button class="btn btn-confirma" data-a="sairDebate">Voltar à campanha</button></div>';
  } else {
    var p = s.passos[s.passo];
    mesa = '<div class="mesa-debate"><span class="rotulo">Bloco ' + (s.passo + 1) + ' de ' + s.passos.length + ' · ' + NOMES_PASSO[p.tipo] + '</span>' + mesaPasso(s, p) + '</div>';
  }
  var falando = UI.debRes ? null : (s.passos[s.passo] && s.passos[s.passo].tipo === 'responder' ? s.passos[s.passo].de : c.id);
  return '<main class="estudio"><div class="gutter"><div class="estudio-topo" style="max-width:1200px;margin:0 auto"><div class="lado"><span class="ao-vivo">Ao vivo</span><span class="emissora">' + esc(s.emissora) + '</span></div>' +
    '<span style="color:#9fb0c8">' + (s.escopo ? 'Debate para ' + (s.escopo.cargo === 'governador' ? 'governador' : 'o Senado') + ' ' + esc(prepUF(s.escopo.uf, 'em')) + (s.segundoTurno && s.escopo.cargo === 'governador' ? ' (2º turno)' : '') : (s.segundoTurno ? 'Debate do 2º turno' : 'Debate presidencial')) + ' · ' + fmtData(JOGO.cal, s.dia) + ' · audiência estimada de ' + s.audiencia + ' pontos</span></div>' +
    pulpitos(s, falando) +
    '<div class="estudio-grade"><div class="pilha">' + transcricao(s.log) + '</div><div>' + mesa + '</div></div></div></main>';
};
TELAS.debate_depois = function () {
  var t = document.getElementById('transcricao');
  if (t) t.scrollTop = t.scrollHeight;
};

function mesaPasso(s, p) {
  var c = jogador(JOGO);
  var adv = s.participantes.filter(function (id) { return id !== c.id; });
  var sug = alvoNoDebate(JOGO, s, c);
  UI.debAlvo = UI.debAlvo && adv.indexOf(UI.debAlvo) >= 0 ? UI.debAlvo : (sug && adv.indexOf(sug.id) >= 0 ? sug.id : adv[0]);
  var selAlvo = '<div class="campo"><label for="deb-alvo" style="color:#9fb0c8">Adversário</label><select id="deb-alvo" data-mudar="debCampo" data-k="debAlvo">' + adv.map(function (id) {
    return '<option value="' + id + '"' + (id === UI.debAlvo ? ' selected' : '') + '>' + esc(candPorId(JOGO, id).urna) + '</option>';
  }).join('') + '</select></div>';
  var html = '';
  if (p.tipo === 'pergunta') {
    html += '<div class="pergunta"><b>' + esc(p.jornalista) + ':</b> ' + esc(p.texto) + '</div><span class="rotulo">Tema: ' + TEMAS[p.tema].nome + ' · sua credibilidade: ' + Math.round(c.cred[p.tema]) + '</span>';
    html += '<div class="opcoes-evento">' + opcoesDebate(JOGO, s).map(function (o) {
      return '<button class="opcao-evento" data-a="debResp" data-id="' + o.id + '"><b>' + esc(o.nome) + '</b><span>' + esc(o.desc) + '</span></button>';
    }).join('') + '</div>' + (adv.length ? selAlvo.replace('Adversário', 'Alvo, se escolher atacar') : '');
  } else if (p.tipo === 'perguntar') {
    UI.debTema = UI.debTema || c.bandeiras[0] || 'economia';
    UI.debTom = UI.debTom || 'provocar';
    var alvo = candPorId(JOGO, UI.debAlvo);
    html += '<p>Sua vez de perguntar. Escolha a quem, o tema e o tom.</p>' + selAlvo +
      '<div class="campo"><label for="deb-tema" style="color:#9fb0c8">Tema</label><select id="deb-tema" data-mudar="debCampo" data-k="debTema">' + TEMA_IDS.map(function (t) {
        return '<option value="' + t + '"' + (t === UI.debTema ? ' selected' : '') + '>' + TEMAS[t].nome + ' (você ' + Math.round(c.cred[t]) + ' × ' + esc(alvo.urna) + ' ' + Math.round(alvo.cred[t]) + ')</option>';
      }).join('') + '</select></div>' +
      '<div class="opcoes-evento">' + Object.keys(TOMS_PERGUNTA).map(function (k) {
        return '<button class="opcao-evento' + (UI.debTom === k ? ' sel' : '') + '" data-a="debTom" data-v="' + k + '"><b>' + TOMS_PERGUNTA[k].nome + '</b><span>' + TOMS_PERGUNTA[k].desc + '</span></button>';
      }).join('') + '</div><button class="btn btn-confirma" data-a="debPerguntar">Fazer a pergunta</button>';
  } else if (p.tipo === 'replica') {
    html += '<p>' + esc(candPorId(JOGO, p.alvo).urna) + ' respondeu. Sua réplica:</p><div class="opcoes-evento">' + opcoesDebate(JOGO, s).map(function (o) {
      return '<button class="opcao-evento" data-a="debResp" data-id="' + o.id + '"><b>' + esc(o.nome) + '</b><span>' + esc(o.desc) + '</span></button>';
    }).join('') + '</div>';
  } else if (p.tipo === 'responder') {
    var q = candPorId(JOGO, p.de);
    html += '<div class="pergunta"><b>' + esc(q.urna) + ':</b> ' + esc(p.texto) + '</div><span class="rotulo">Tema: ' + TEMAS[p.tema].nome + ' · sua credibilidade: ' + Math.round(c.cred[p.tema]) + '</span>' +
      '<div class="opcoes-evento">' + opcoesDebate(JOGO, s).map(function (o) {
        return '<button class="opcao-evento" data-a="debResp" data-id="' + o.id + '"><b>' + esc(o.nome) + '</b><span>' + esc(o.desc) + '</span></button>';
      }).join('') + '</div>';
  } else if (p.tipo === 'consideracoes') {
    html += '<p>Você tem um minuto para falar diretamente ao eleitor. Qual o tom?</p><div class="opcoes-evento">' + opcoesDebate(JOGO, s).map(function (o) {
      return '<button class="opcao-evento" data-a="debResp" data-id="' + o.id + '"><b>' + esc(o.nome) + '</b><span>' + esc(o.desc) + '</span></button>';
    }).join('') + '</div>';
  }
  html += '<p style="color:#9fb0c8;font-size:0.8rem">Preparo: ' + Math.round(c.preparo) + '/60 · Energia: ' + Math.round(c.energia) + '% · Oratória: ' + c.attr.oratoria + '</p>';
  return html;
}

ACOES_UI.debCampo = function (d, el) { UI[d.k] = el.value; atualizar(); };
ACOES_UI.debTom = function (d) { UI.debTom = d.v; atualizar(); };
ACOES_UI.debResp = function (d) {
  var s = JOGO.debateAtual;
  responderDebate(JOGO, s, { id: d.id, alvo: UI.debAlvo });
  posPasso(s);
};
ACOES_UI.debPerguntar = function () {
  var s = JOGO.debateAtual;
  responderDebate(JOGO, s, { alvo: UI.debAlvo, tema: UI.debTema, tom: UI.debTom });
  posPasso(s);
};

function posPasso(s) {
  if (debateTerminou(s)) {
    UI.debateFim = s;
    UI.debRes = concluirDebate(JOGO, s);
    atualizarCache(JOGO);
  }
  atualizar();
}

ACOES_UI.sairDebate = function () {
  UI.debRes = null; UI.debateFim = null; UI.debTema = null; UI.debTom = null;
  continuarRodada();
};

/* ---------- Sabatina ---------- */
TELAS.sabatina = function () {
  var sab = UI.sab, c = jogador(JOGO);
  var log = sab.log.map(function (l) {
    return '<div class="fala jornalista"><div class="quem">Apresentadores</div><div class="txt">' + esc(l.pergunta) + '</div></div>' +
      '<div class="fala"><div class="quem"><span class="pt" style="--cor:' + cor(c) + '"></span>' + esc(c.urna) + ' <span class="nota nota-' + l.nota + '">' + l.nota + '</span></div><div class="txt">' + esc(l.resposta) + '</div></div>';
  }).join('');
  var mesa;
  if (sab.idx >= sab.perguntas.length) {
    mesa = '<div class="mesa-debate"><span class="rotulo">Fim da entrevista</span><h2>' + (sab.pontos >= 6 ? 'Entrevista segura' : sab.pontos >= 0 ? 'Entrevista morna' : 'Entrevista difícil') + '</h2>' +
      '<p style="color:#9fb0c8">Dezenas de milhões de pessoas assistiram. ' + (sab.pontos >= 6 ? 'Comentaristas elogiam seu preparo.' : sab.pontos >= 0 ? 'Sem grandes deslizes, mas sem brilho.' : 'Os trechos mais tensos vão circular nas redes por dias.') + '</p>' +
      '<button class="btn btn-confirma" data-a="sairSabatina">Voltar à campanha</button></div>';
  } else {
    var q = sab.perguntas[sab.idx];
    mesa = '<div class="mesa-debate"><span class="rotulo">Pergunta ' + (sab.idx + 1) + ' de ' + sab.perguntas.length + '</span><div class="pergunta">' + esc(q.texto) + '</div><div class="opcoes-evento">' +
      Object.keys(SABATINA_OPCOES).map(function (k) { return '<button class="opcao-evento" data-a="sabResp" data-v="' + k + '"><b>' + SABATINA_OPCOES[k].nome + '</b><span>' + SABATINA_OPCOES[k].desc + '</span></button>'; }).join('') +
      '</div></div>';
  }
  return '<main class="estudio"><div class="gutter"><div class="estudio-topo" style="max-width:1200px;margin:0 auto"><div class="lado"><span class="ao-vivo">Ao vivo</span><span class="emissora">Jornal da Nação</span></div>' +
    '<span style="color:#9fb0c8">Sabatina com os candidatos à Presidência · ' + fmtData(JOGO.cal, JOGO.dia) + '</span></div>' +
    '<div class="estudio-grade" style="padding-top:20px"><div class="transcricao" id="transcricao">' + (log || '<p style="color:#9fb0c8">Boa noite. Hoje recebemos ' + oa(c) + ' ' + candidatoA(c) + ' ' + esc(c.nome) + ', do ' + esc(c.partido) + '. São quinze minutos de entrevista ao vivo.</p>') + '</div>' + mesa + '</div></div></main>';
};
TELAS.sabatina_depois = TELAS.debate_depois;

ACOES_UI.sabResp = function (d) {
  responderSabatina(JOGO, UI.sab, d.v);
  if (UI.sab.idx >= UI.sab.perguntas.length) { concluirSabatina(JOGO, UI.sab); atualizarCache(JOGO); }
  atualizar();
};
ACOES_UI.sairSabatina = function () { UI.sab = null; continuarRodada(); };
