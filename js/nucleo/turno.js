/* Fluxo do jogo: pré-campanha → 1º turno → apuração → 2º turno → apuração → fim. */

var CUSTO_ESTRUTURA_DIA = 0.14;   // equipe, viagens e estrutura fixa (R$ mi/dia)

/* Investimento na produção do programa de TV (custo por dia de propaganda). */
var INVEST_TV = {
  1: { nome: 'Econômica', custo: 0.08, mult: 0.8 },
  2: { nome: 'Padrão', custo: 0.22, mult: 1 },
  3: { nome: 'Premium', custo: 0.5, mult: 1.18 }
};

function atualizarCache(jogo) {
  jogo._cache = calcularIntencoes(jogo, { rej: true });
  return jogo._cache;
}

/* ---------- Pré-campanha ---------- */

function vicesDisponiveis(jogo) {
  var c = jogador(jogo);
  return Object.keys(VICES).filter(function (id) {
    var v = VICES[id];
    if (Math.abs(v.x - c.x) > 55) return false;
    var dono = jogo.partidos[v.partido];
    return !(dono && dono !== c.id);
  }).sort(function (a, b) { return Math.abs(VICES[a].x - c.x) - Math.abs(VICES[b].x - c.x); }).slice(0, 6);
}

function escolherVice(jogo, viceId) {
  var c = jogador(jogo), v = VICES[viceId];
  var msg;
  if (v.partido !== c.partido && c.coligacao.indexOf(v.partido) < 0) {
    var ch = chancePartido(jogo, c, v.partido, 'vice');
    if (rand() > ch) return { ok: false, texto: v.nome + ' agradece o convite, mas o ' + v.partido + ' não aceita indicar o vice da sua chapa.' };
    c.coligacao.push(v.partido);
    jogo.partidos[v.partido] = c.id;
    msg = 'O ' + v.partido + ' entra na sua coligação com ' + v.nome + ' na vice.';
  } else {
    msg = v.nome + ' aceita ser ' + (v.genero === 'F' ? 'sua vice' : 'seu vice') + '.';
  }
  c.vice = viceId; c.viceUf = v.uf;
  for (var t in v.cred) c.cred[t] = clamp(c.cred[t] + v.cred[t], 5, 98);
  for (var g in v.segAff) c.segAff[g] = (c.segAff[g] || 0) + v.segAff[g];
  if (v.dinheiro) c.dinheiroExtra = (c.dinheiroExtra || 0) + v.dinheiro;
  ESTADOS.forEach(function (e) { if (e.uf === v.uf) c.recog[e.uf] = Math.min(98, c.recog[e.uf] + 12); });
  c.tentativasVice = (c.tentativasVice || 0) + 1;
  return { ok: true, texto: msg };
}

function partidosNegociaveis(jogo) {
  var c = jogador(jogo);
  return PARTIDOS.filter(function (p) {
    if (c.coligacao.indexOf(p.sigla) >= 0) return false;
    var dono = jogo.partidos[p.sigla];
    if (dono && candPorId(jogo, dono) && candPorId(jogo, dono).partido === p.sigla) return false; // partido com candidato próprio
    return true;
  });
}

function negociarPartido(jogo, sigla, oferta) {
  var c = jogador(jogo), p = PARTIDO_POR_SIGLA[sigla];
  var ch = chancePartido(jogo, c, sigla, oferta);
  jogo.negociacoesPre = (jogo.negociacoesPre || 0) + 1;
  if (rand() > ch) return { ok: false, texto: 'O ' + sigla + ' recusa a proposta.' };
  var antigo = jogo.partidos[sigla] ? candPorId(jogo, jogo.partidos[sigla]) : null;
  if (antigo) antigo.coligacao = antigo.coligacao.filter(function (s) { return s !== sigla; });
  c.coligacao.push(sigla);
  jogo.partidos[sigla] = c.id;
  if (oferta === 'pauta') c.cred[p.pauta] = Math.min(98, c.cred[p.pauta] + 4);
  if (oferta === 'cargos') c.desgaste += 1;
  return { ok: true, texto: 'O ' + p.nome + ' (' + sigla + ') fecha aliança com você' + (antigo ? ', deixando a chapa de ' + antigo.urna : '') + '.' };
}

function definirProgramaJogador(jogo, bandeiras) {
  var c = jogador(jogo);
  c.bandeiras = bandeiras.slice(0, 3);
  c.bandeiras.forEach(function (t) { c.cred[t] = Math.min(98, c.cred[t] + 6); });
  c.tv.tema = c.bandeiras[0];
}

function contratarMarqueteiro(jogo, id) {
  jogador(jogo).marqueteiro = id;
}

/* Fecha a pré-campanha e abre o 1º turno. */
function iniciarCampanha(jogo) {
  var dif = DIFICULDADES[jogo.config.dificuldade];
  iaFecharColigacoes(jogo);
  var ativos = candidatosAtivos(jogo);
  var ids = ativos.map(function (c) { return c.id; });
  var tv = calcularTempoTV(jogo, ids, false);
  ativos.forEach(function (c) {
    var fundo = fundoColigacao(c);
    if (c.jogador) fundo *= dif.dinheiro;
    c.fundoTotal = fundo;
    c.dinheiro = fundo * 0.7 + (c.dinheiroExtra || 0);
    c.arrecadado = 0;
    c.tvSeg = tv[c.id];
    if (!c.jogador) {
      c.marqueteiro = fundo > 80 ? 'farol' : (fundo > 40 ? 'nunes' : (c.x < -60 || c.estilo === 'agressivo' ? 'redeviva' : 'propria'));
      iaEstrategiaTV(jogo, c);
    }
    var m = MARQ_POR_ID[c.marqueteiro || 'propria'];
    c.marqueteiro = m.id;
    gastar(c, m.custo);
  });
  jogo.fase = 'campanha1';
  jogo.turnos = montarTurnos(0, jogo.cal.eleicao1, jogo.config.ritmo);
  jogo.turnoIdx = 0;
  jogo.dia = 0;
  atualizarCache(jogo);
  jogo.percepcao = jogo._cache.nac;
  ['datanacao', 'pulso'].forEach(function (inst) { jogo.pesquisas.push(gerarPesquisa(jogo, inst, 0)); });
  atualizarPercepcao(jogo);
  registrarHistorico(jogo);
  noticia(jogo, 'Começa oficialmente a campanha eleitoral', 'A partir de hoje estão liberados comícios, carreatas e propaganda na internet. A propaganda no rádio e na TV começa em ' + fmtDataCurta(jogo.cal, jogo.cal.hgpe1[0]) + '.', 'marco');
  iniciarTurno(jogo);
}

function registrarHistorico(jogo) {
  var c = jogo._cache || atualizarCache(jogo);
  var v = {};
  c.ids.forEach(function (id) { v[id] = Math.round(c.nac[id] * 10) / 10; });
  v.nenhum = Math.round(c.nac.nenhum * 10) / 10;
  v.indeciso = Math.round(c.nac.indeciso * 10) / 10;
  jogo.historico.push({ dia: jogo.dia, v: v });
}

/* ---------- Turnos ---------- */

function turnoAtual(jogo) { return jogo.turnos[jogo.turnoIdx]; }

function slotsDoTurno(jogo) {
  var t = turnoAtual(jogo);
  var dias = t[1] - t[0] + 1;
  var c = jogador(jogo);
  var n = jogo.config.ritmo === 'diario' ? SLOTS_DIA : Math.max(1, Math.round(SLOTS_SEMANA * dias / 7));
  if (c && c.repouso) n = Math.max(0, n - (jogo.config.ritmo === 'diario' ? Math.min(2, c.repouso) : c.repouso));
  return n;
}

function iniciarTurno(jogo) {
  var t = turnoAtual(jogo);
  jogo.dia = t[0];
  jogo.agenda = [];
  jogo.resumoInicio = { noticias: jogo.noticias.length, pesquisas: jogo.pesquisas.length, percepcao: copiar(jogo.percepcao || {}), dinheiro: jogador(jogo).dinheiro };
  candidatosAtivos(jogo).forEach(function (c) { if (!c.jogador) iaEstrategiaTV(jogo, c); });
  var jog = jogador(jogo);
  jogo.pendentes = jog.ativo ? sortearEventosJogador(jogo, t[1] - t[0] + 1) : [];
  atualizarCache(jogo);
}

/* Distribui n ações ao longo dos dias do turno. */
function diasDasAcoes(n, inicio, fim) {
  var dias = [], tot = fim - inicio + 1;
  for (var i = 0; i < n; i++) dias.push(inicio + Math.floor(i * tot / Math.max(1, n)));
  return dias;
}

/* Processa os dias do turno até o fim ou até um evento interativo (debate, sabatina). */
function processarTurno(jogo) {
  var t = turnoAtual(jogo);
  if (!jogo.proc) {
    var dias = diasDasAcoes(Math.max(jogo.agenda.length, 1), t[0], t[1]);
    jogo.agenda.forEach(function (a, i) { a.dia = dias[i]; });
    var jog = jogador(jogo);
    if (jog.repouso) jog.repouso = Math.max(0, jog.repouso - (jogo.config.ritmo === 'diario' ? 2 : jog.repouso));
    // ações da IA: mesma quantidade de ações por turno que o jogador teria
    var nIA = jogo.config.ritmo === 'diario' ? SLOTS_DIA : Math.max(1, Math.round(SLOTS_SEMANA * (t[1] - t[0] + 1) / 7));
    var diasIA = diasDasAcoes(nIA, t[0], t[1]);
    jogo.agendaIA = {};
    candidatosAtivos(jogo).forEach(function (c) {
      if (c.jogador) return;
      var acoes = iaEscolherAcoes(jogo, c, nIA);
      acoes.forEach(function (a, i) { a.dia = diasIA[i]; });
      jogo.agendaIA[c.id] = acoes;
    });
    jogo.proc = { dia: t[0], diaFeito: false };
    jogo.resultadosTurno = [];
  }
  var proc = jogo.proc;
  while (proc.dia <= t[1]) {
    var d = proc.dia;
    jogo.dia = d;
    if (!proc.diaFeito) {
      processarDia(jogo, d);
      proc.diaFeito = true;
    }
    var jg = jogador(jogo);
    if (d === jogo.cal.sabatina && !jogo.sabatinaFeita && jg.ativo && jogo.fase === 'campanha1') {
      return { tipo: 'sabatina' };
    }
    var deb = debateNoDia(jogo, d);
    if (deb && jogo.debatesFeitos.indexOf(d) < 0) {
      var s = jogo.debateAtual || iniciarDebate(jogo, deb);
      if (s.jogadorParticipa) return { tipo: 'debate', sessao: s };
      simularDebateSemJogador(jogo, s);
      var r = concluirDebate(jogo, s);
      jogo.resultadosTurno.push({ tipo: 'debate', sessao: s, res: r });
      atualizarCache(jogo);
    }
    proc.dia++;
    proc.diaFeito = false;
  }
  jogo.proc = null;
  return { tipo: 'fimTurno' };
}

function processarDia(jogo, d) {
  var cal = jogo.cal;
  var ordem = embaralhar(candidatosAtivos(jogo));
  ordem.forEach(function (c) {
    var lista = c.jogador ? jogo.agenda : (jogo.agendaIA[c.id] || []);
    lista.forEach(function (a) {
      if (a.dia !== d || a.feito) return;
      var r = executarAcao(jogo, c, a);
      a.feito = true;
      a.resultado = r;
      if (r && c.jogador) {
        jogo.resultadosTurno.push({ tipo: 'acao', dia: d, acao: a, res: r });
        if (r.tipo !== 'neutro' || a.tipo === 'apoio' || a.tipo === 'proposta') noticia(jogo, r.texto, '', r.tipo === 'bom' ? 'bom' : (r.tipo === 'ruim' ? 'ruim' : 'campanha'), c.id);
      } else if (r && !c.jogador && (a.tipo === 'apoio' && r.sucesso || a.tipo === 'proposta' || (a.tipo === 'ataque' && chance(0.35)) || (r.tipo !== 'neutro' && chance(0.5)))) {
        noticia(jogo, r.texto, '', a.tipo === 'ataque' ? 'ataque' : (r.tipo === 'bom' ? 'adv-bom' : (r.tipo === 'ruim' ? 'adv-ruim' : 'campanha')), c.id);
      }
    });
  });
  // propaganda no rádio e na TV
  if (emHGPE(cal, d)) aplicarHGPE(jogo, d);
  if (d === cal.hgpe1[0] || d === cal.hgpe2[0]) noticia(jogo, 'Começa o horário eleitoral gratuito no rádio e na TV', 'Os candidatos dividem dois blocos diários de 12min30s, além de inserções ao longo da programação.', 'marco');
  // segunda parcela do fundo eleitoral
  if (d === cal.fundo2) candidatosAtivos(jogo).forEach(function (c) { c.dinheiro += (c.fundoTotal || 0) * 0.3; });
  // dinâmica natural
  candidatosAtivos(jogo).forEach(function (c) {
    UFS.forEach(function (uf) { c.presenca[uf] *= 0.972; });
    c.imagem *= 0.955;
    c.desgaste *= 0.975;
    SEG_IDS.forEach(function (g) { c.segTemp[g] *= 0.975; });
    c.energia = Math.min(100, c.energia + 5);
    var cobertura = 0.0016 * (1 + ((jogo.percepcao && jogo.percepcao[c.id]) || 2) / 12);
    UFS.forEach(function (uf) { crescerRecog(c, uf, cobertura); });
    var custoFixo = CUSTO_ESTRUTURA_DIA * (c.tvSeg > 200 ? 1.4 : c.tvSeg > 80 ? 1 : 0.6);
    if (c.dinheiro > custoFixo) gastar(c, custoFixo);
  });
  eventosDiarios(jogo);
  verificarDesistencias(jogo, d);
  atualizarCache(jogo);
  pesquisasAgendadas(jogo, d).forEach(function (inst) {
    var p = gerarPesquisa(jogo, inst, d);
    jogo.pesquisas.push(p);
    if (p.res) {
      var ord = ordenarPor(p.res, p.ids);
      noticia(jogo, p.nome + ': ' + candPorId(jogo, ord[0]).urna + ' ' + p.res[ord[0]] + '%, ' + candPorId(jogo, ord[1]).urna + ' ' + p.res[ord[1]] + '%',
        'Pesquisa registrada no TSE sob o número ' + p.registro + '. Margem de erro de ' + fmtNum(p.margem, 1) + ' pontos.', 'pesquisa');
    }
  });
  atualizarPercepcao(jogo);
  registrarHistorico(jogo);
}

/* Efeitos diários da propaganda de rádio e TV. */
function aplicarHGPE(jogo, d) {
  var ativos = candidatosAtivos(jogo);
  ativos.forEach(function (c) {
    var share = (c.tvSeg || 0) / 750;
    var m = MARQ_POR_ID[c.marqueteiro || 'propria'];
    var inv = INVEST_TV[c.tv.invest || 2], mult = 0.7;
    if (podePagar(jogo, c, inv.custo)) { gastar(c, inv.custo); mult = inv.mult; }
    var pontos = share * m.tv * mult;
    UFS.forEach(function (uf) { crescerRecog(c, uf, 0.004 + 0.022 * pontos); });
    var e = c.tv.estrategia;
    if (e === 'positiva') {
      c.imagem += 0.03 * pontos;
      if (c.tv.tema) c.cred[c.tv.tema] = Math.min(98, c.cred[c.tv.tema] + 0.6 * pontos);
    } else if (e === 'ataque' && c.tv.alvo) {
      var alvo = candPorId(jogo, c.tv.alvo);
      if (alvo && alvo.ativo) {
        var dano = 0.5 * pontos * (alvo.tv.estrategia === 'defesa' ? 0.5 : 1);
        alvo.desgaste += dano;
        alvo.stats.ataquesRecebidos[c.id] = (alvo.stats.ataquesRecebidos[c.id] || 0) + 0.15;
        c.desgaste += 0.18 * pontos;
      }
    } else if (e === 'defesa') {
      c.desgaste = Math.max(0, c.desgaste - 0.8 * pontos);
      c.imagem += 0.008 * pontos;
    }
  });
}

/* Candidatos nanicos podem desistir e apoiar alguém (até 20 dias antes da eleição). */
function verificarDesistencias(jogo, d) {
  if (jogo.fase !== 'campanha1' || d > jogo.cal.eleicao1 - 20 || d < 20) return;
  candidatosAtivos(jogo).forEach(function (c) {
    if (c.jogador) return;
    var perc = (jogo.percepcao && jogo.percepcao[c.id]) || 0;
    if (perc >= 1.5 || !chance(0.012)) return;
    var outros = candidatosAtivos(jogo).filter(function (o) { return o.id !== c.id && (jogo.percepcao[o.id] || 0) > 5; });
    if (!outros.length) return;
    outros.sort(function (a, b) { return Math.abs(a.x - c.x) - Math.abs(b.x - c.x); });
    var apoiado = outros[0];
    c.ativo = false;
    c.desistiu = apoiado.id;
    // parte do eleitorado migra junto
    SEG_IDS.forEach(function (g) { apoiado.segAff[g] = (apoiado.segAff[g] || 0) + 0.02; });
    c.coligacao.forEach(function (s) { jogo.partidos[s] = apoiado.id; apoiado.coligacao.push(s); });
    noticia(jogo, c.urna + ' desiste da candidatura e apoia ' + apoiado.urna, 'Com ' + Math.round(perc) + '% nas pesquisas, ' + c.urna + ' retira o nome da disputa.', 'marco', c.id);
  });
}

/* Avança para o próximo turno ou para a eleição. */
function encerrarTurno(jogo) {
  jogo.turnoIdx++;
  if (jogo.turnoIdx >= jogo.turnos.length) {
    jogo.dia = jogo.fase === 'campanha1' ? jogo.cal.eleicao1 : jogo.cal.eleicao2;
    jogo.fase = jogo.fase === 'campanha1' ? 'apuracao1' : 'apuracao2';
    return 'eleicao';
  }
  iniciarTurno(jogo);
  return 'turno';
}

/* ---------- Eleição e 2º turno ---------- */

function realizarEleicao(jogo) {
  var turno = jogo.fase === 'apuracao1' ? 1 : 2;
  var res = calcularResultado(jogo, turno);
  if (turno === 1) jogo.resultado1 = res; else jogo.resultado2 = res;
  return res;
}

function resolverPrimeiroTurno(jogo) {
  var res = jogo.resultado1;
  var o = res.ordem;
  if (res.pct[o[0]] > 50) {
    jogo.vencedor = o[0];
    jogo.fase = 'fim';
    finalizarJogo(jogo);
    return 'fim';
  }
  jogo.finalistas = [o[0], o[1]];
  jogo.transf = {};
  jogo.transf[o[0]] = []; jogo.transf[o[1]] = [];
  jogo.apoios2 = {};
  var jg = jogo.jogadorId;
  candidatosAtivos(jogo).forEach(function (c) {
    if (jogo.finalistas.indexOf(c.id) < 0) {
      c.ativo = false;
      c.eliminado = true;
    }
  });
  // os eliminados da IA decidem seus apoios (alguns esperam a negociação do jogador)
  jogo.candidatos.forEach(function (c) {
    if (!c.eliminado || c.jogador) return;
    jogo.apoios2[c.id] = null;
  });
  jogo.fase = jogo.finalistas.indexOf(jg) >= 0 ? 'entreturnos' : 'eliminado';
  return jogo.fase;
}

/* Negociação de apoio no 2º turno (jogador finalista pede apoio a um eliminado). */
function pedirApoioSegundoTurno(jogo, elimId, oferta) {
  var elim = candPorId(jogo, elimId);
  var dec = decidirApoioSegundoTurno(jogo, elim, jogo.finalistas, oferta);
  jogo.apoios2[elimId] = dec;
  return dec;
}

function fecharApoiosSegundoTurno(jogo) {
  jogo.candidatos.forEach(function (c) {
    if (!c.eliminado || c.jogador) return;
    if (jogo.apoios2[c.id] === null || jogo.apoios2[c.id] === undefined) jogo.apoios2[c.id] = decidirApoioSegundoTurno(jogo, c, jogo.finalistas, null);
  });
  for (var id in jogo.apoios2) {
    var dec = jogo.apoios2[id];
    var c = candPorId(jogo, id);
    if (dec && dec !== 'neutro') {
      jogo.transf[dec].push(id);
      // partidos do eliminado passam a apoiar o finalista
      c.coligacao.forEach(function (s) { jogo.partidos[s] = dec; });
      noticia(jogo, c.urna + ' declara apoio a ' + candPorId(jogo, dec).urna + ' no 2º turno', '', 'apoio2', id);
    } else {
      noticia(jogo, c.urna + ' fica neutr' + oa(c) + ' no 2º turno', 'Libera seus eleitores para votarem como quiserem.', 'apoio2', id);
    }
  }
  atualizarApoioGovernadores(jogo);
}

function iniciarCampanha2(jogo) {
  fecharApoiosSegundoTurno(jogo);
  var ids = jogo.finalistas;
  var tv = calcularTempoTV(jogo, ids, true);
  ids.forEach(function (id) {
    var c = candPorId(jogo, id);
    c.dinheiro += TETO_2T * (c.jogador ? DIFICULDADES[jogo.config.dificuldade].dinheiro * 0.75 : 0.75);
    c.tvSeg = tv[id];
    c.energia = Math.max(c.energia, 75);
    c.preparo = 0;
    UFS.forEach(function (uf) { c.presenca[uf] *= 0.6; });
  });
  jogo.fase = 'campanha2';
  jogo.turnos = montarTurnos(jogo.cal.eleicao1 + 1, jogo.cal.eleicao2, jogo.config.ritmo);
  jogo.turnoIdx = 0;
  jogo.dia = jogo.cal.eleicao1 + 1;
  atualizarCache(jogo);
  jogo.percepcao = jogo._cache.nac;
  var p = gerarPesquisa(jogo, 'datanacao', jogo.dia);
  jogo.pesquisas.push(p);
  atualizarPercepcao(jogo);
  registrarHistorico(jogo);
  noticia(jogo, 'Começa a campanha do 2º turno', candPorId(jogo, ids[0]).urna + ' e ' + candPorId(jogo, ids[1]).urna + ' disputam a Presidência em ' + fmtDataLonga(jogo.cal, jogo.cal.eleicao2) + '.', 'marco');
  iniciarTurno(jogo);
}

/* Quando o jogador é eliminado: o 2º turno é simulado sem ele. */
function simularSegundoTurnoAutomatico(jogo) {
  iniciarCampanha2(jogo);
  var guard = 0;
  while (jogo.fase === 'campanha2' && guard++ < 100) {
    var r = processarTurno(jogo);
    while (r.tipo !== 'fimTurno' && guard++ < 200) {
      if (r.tipo === 'debate') { simularDebateSemJogador(jogo, r.sessao); concluirDebate(jogo, r.sessao); }
      r = processarTurno(jogo);
    }
    encerrarTurno(jogo);
  }
}

function resolverSegundoTurno(jogo) {
  var res = jogo.resultado2;
  jogo.vencedor = res.ordem[0];
  jogo.fase = 'fim';
  finalizarJogo(jogo);
}

/* Conquistas e pontuação final. */
function finalizarJogo(jogo) {
  var c = jogador(jogo);
  var venceu = jogo.vencedor === c.id;
  var conq = [];
  var r1 = jogo.resultado1;
  var hist0 = jogo.historico[0] ? jogo.historico[0].v : {};
  if (venceu) conq.push({ id: 'presidente', nome: 'Presidente da República', desc: 'Venceu a eleição presidencial.' });
  if (venceu && !jogo.resultado2) conq.push({ id: 'primeiroturno', nome: 'Liquidou no 1º turno', desc: 'Mais de 50% dos votos válidos no 1º turno.' });
  if (venceu && (hist0[c.id] || 0) < 10) conq.push({ id: 'zebra', nome: 'Zebra histórica', desc: 'Venceu começando com menos de 10% das intenções de voto.' });
  if (r1 && r1.pct[c.id] !== undefined) {
    var ganhos = UFS_MAPA.filter(function (uf) { return ordenarPor(r1.uf[uf].votos, r1.ids)[0] === c.id; });
    if (ganhos.indexOf('SP') >= 0) conq.push({ id: 'sp', nome: 'Locomotiva', desc: 'Venceu em São Paulo no 1º turno.' });
    var ne = ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'];
    if (ne.every(function (u) { return ganhos.indexOf(u) >= 0; })) conq.push({ id: 'nordeste', nome: 'Nordeste fechado', desc: 'Venceu nos nove estados do Nordeste.' });
    var sul = ['PR', 'SC', 'RS'];
    if (sul.every(function (u) { return ganhos.indexOf(u) >= 0; })) conq.push({ id: 'sul', nome: 'Dono do Sul', desc: 'Venceu nos três estados do Sul.' });
    if (ganhos.length >= 20) conq.push({ id: 'nacional', nome: 'Onda nacional', desc: 'Venceu em 20 ou mais estados no 1º turno.' });
  }
  if (c.stats.debates.length >= 2 && c.stats.debates.every(function (d) { return d.media > 1.8; })) conq.push({ id: 'debatedor', nome: 'Debatedor nato', desc: 'Foi bem em todos os debates de que participou.' });
  if (c.stats.ataques === 0 && venceu) conq.push({ id: 'limpa', nome: 'Campanha limpa', desc: 'Venceu sem fazer nenhum ataque direto aos adversários.' });
  if (c.stats.apoiosGanhos >= 5) conq.push({ id: 'articulador', nome: 'Grande articulador', desc: 'Conquistou cinco ou mais apoios durante a campanha.' });
  if (jogo.resultado2 && jogo.resultado2.ids.indexOf(c.id) >= 0 && r1.ordem[0] !== c.id && venceu) conq.push({ id: 'virada', nome: 'Virada no 2º turno', desc: 'Venceu depois de terminar o 1º turno em segundo lugar.' });
  jogo.conquistas = conq;
  salvarRecorde(jogo);
}

function salvarRecorde(jogo) {
  try {
    var c = jogador(jogo);
    var lista = JSON.parse(localStorage.getItem('simuladorEleicoes.recordes') || '[]');
    var pct1 = jogo.resultado1 ? jogo.resultado1.pct[c.id] : null;
    var pct2 = jogo.resultado2 && jogo.resultado2.pct[c.id] !== undefined ? jogo.resultado2.pct[c.id] : null;
    lista.push({
      data: new Date().toISOString().slice(0, 10), nome: c.urna, partido: c.partido, venceu: jogo.vencedor === c.id,
      pct1: pct1, pct2: pct2, dificuldade: jogo.config.dificuldade, ritmo: jogo.config.ritmo
    });
    localStorage.setItem('simuladorEleicoes.recordes', JSON.stringify(lista.slice(-30)));
  } catch (e) { /* armazenamento indisponível */ }
}
