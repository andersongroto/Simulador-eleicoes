/* Debates na TV e sabatina no telejornal.
 * A sessão do debate fica em jogo.debateAtual e avança passo a passo pela interface. */

function notaDe(rolagem) {
  for (var i = 0; i < NOTAS_DEBATE.length; i++) if (rolagem >= NOTAS_DEBATE[i].min) return NOTAS_DEBATE[i];
  return NOTAS_DEBATE[NOTAS_DEBATE.length - 1];
}

function bonusMarqueteiro(c) {
  var m = MARQ_POR_ID[c.marqueteiro] || (typeof MARQ_EST_POR_ID !== 'undefined' && MARQ_EST_POR_ID[c.marqueteiro]);
  return m ? m.debate : 0;
}

/* Escopo do debate: presidencial (null) ou estadual ({ cargo, uf }). */
function candsDoEscopo(jogo, esc) { return esc ? candsDisputa(jogo, esc.uf, esc.cargo) : candidatosAtivos(jogo); }
function percDoEscopo(jogo, esc) { return esc ? (disputa(jogo, esc.uf, esc.cargo).percepcao || {}) : (jogo.percepcao || {}); }
function alvoNoDebate(jogo, s, c) { return s && s.escopo ? rivalEst(jogo, c) : alvoDeAtaque(jogo, c); }

function energiaDebate(c) { return c.energia < 25 ? -8 : (c.energia < 50 ? -3 : 0); }

function rolagemBase(c) { return c.preparo * 0.35 + bonusMarqueteiro(c) + energiaDebate(c); }

function proximoDebate(jogo) {
  var lista = jogo.fase === 'campanha2' ? jogo.cal.debates2 : jogo.cal.debates1;
  for (var i = 0; i < lista.length; i++) if (lista[i].dia >= jogo.dia && jogo.debatesFeitos.indexOf(lista[i].dia) < 0) return lista[i];
  return null;
}

function debateNoDia(jogo, dia) {
  var lista = dia > jogo.cal.eleicao1 ? jogo.cal.debates2 : jogo.cal.debates1;
  for (var i = 0; i < lista.length; i++) if (lista[i].dia === dia) return lista[i];
  return null;
}

function participantesDebate(jogo, esc) {
  if (esc) return candsDoEscopo(jogo, esc).filter(function (c) {
    var perc = percDoEscopo(jogo, esc)[c.id] || 0;
    return c.jogador || perc >= 2 || PARTIDO_POR_SIGLA[c.partido].bancada >= 5;
  }).map(function (c) { return c.id; });
  return candidatosAtivos(jogo).filter(function (c) {
    if (jogo.fase === 'campanha2') return true;
    var perc = (jogo.percepcao && jogo.percepcao[c.id]) || 0;
    return bancadaColigacao(c) >= 5 || perc >= 4;
  }).map(function (c) { return c.id; });
}

function temaDoDebate(jogo, usados) {
  var sal = jogo.saliencia || {};
  var op = TEMA_IDS.filter(function (t) { return usados.indexOf(t) < 0; });
  return escolherPeso(op, function (t) { return (sal[t] || 1) * ({ economia: 3, saude: 2, seguranca: 2, social: 1.5, educacao: 1.5, corrupcao: 1.5, costumes: 1, ambiente: 1 }[t]); });
}

function preencher(txt, c, extra) {
  extra = extra || {};
  return txt.replace('{o}', c ? oa(c) : 'o').replace('{cand}', c ? candidatoA(c) : 'candidato')
    .replace('{alvo}', extra.alvo || '').replace('{bandeira}', extra.bandeira || '')
    .replace('{tema}', extra.tema || '').replace('{aprov}', extra.aprov || '')
    .replace(/\{Osenhor\}/g, c && c.genero === 'F' ? 'A senhora' : 'O senhor')
    .replace(/\{osenhor\}/g, c && c.genero === 'F' ? 'a senhora' : 'o senhor');
}

function iniciarDebate(jogo, def) {
  var parts = participantesDebate(jogo, def.escopo);
  var jg = jogo.jogadorId;
  var s = {
    dia: def.dia, emissora: def.emissora, audiencia: def.audiencia, participantes: parts, escopo: def.escopo || null,
    segundoTurno: def.escopo ? parts.length <= 2 : jogo.fase === 'campanha2',
    jogadorParticipa: parts.indexOf(jg) >= 0 && jogador(jogo).ativo,
    pontos: {}, n: {}, log: [], passo: 0, temasUsados: [], frases: []
  };
  parts.forEach(function (id) { s.pontos[id] = 0; s.n[id] = 0; });
  var adv = parts.filter(function (id) { return id !== jg; });
  var passos = [];
  if (s.segundoTurno) {
    passos.push({ tipo: 'pergunta' });
    passos.push({ tipo: 'perguntar' });
    passos.push({ tipo: 'responder', de: adv[0] });
    passos.push({ tipo: 'perguntar' });
    passos.push({ tipo: 'responder', de: adv[0] });
    passos.push({ tipo: 'consideracoes' });
  } else {
    passos.push({ tipo: 'pergunta' });
    passos.push({ tipo: 'perguntar' });
    passos.push({ tipo: 'responder', de: null });
    passos.push({ tipo: 'pergunta' });
    passos.push({ tipo: 'perguntar' });
    passos.push({ tipo: 'consideracoes' });
  }
  s.passos = passos;
  jogo.debateAtual = s;
  prepararPasso(jogo, s);
  return s;
}

/* Define o contexto do passo atual (tema, quem pergunta etc.). */
function prepararPasso(jogo, s) {
  var p = s.passos[s.passo];
  if (!p) return;
  var jg = jogador(jogo);
  if (p.tipo === 'pergunta') {
    p.tema = temaDoDebate(jogo, s.temasUsados);
    s.temasUsados.push(p.tema);
    p.jornalista = escolher(JORNALISTAS);
    p.texto = preencher(escolher(PERGUNTAS_TEMA[p.tema]), jg);
  } else if (p.tipo === 'responder') {
    if (!p.de) {
      // o adversário que mais tem interesse em atacar o jogador
      var adv = s.participantes.filter(function (id) { return id !== jg.id; });
      p.de = escolherPeso(adv, function (id) {
        var c = candPorId(jogo, id), alvo = alvoNoDebate(jogo, s, c);
        return alvo && alvo.id === jg.id ? 4 : 1;
      });
    }
    var fraco = TEMA_IDS.slice().sort(function (a, b) { return jg.cred[a] - jg.cred[b]; })[randInt(0, 1)];
    p.tema = fraco;
    p.tom = chance(0.6) ? 'provocar' : 'propositiva';
    var q = candPorId(jogo, p.de);
    p.texto = p.tom === 'provocar'
      ? preencher(escolher(FALAS_ATAQUE[linhaDeAtaque(jg)]), q, { alvo: jg.urna }) + ' O que ' + oa(jg) + ' ' + candidatoA(jg) + ' tem a dizer sobre ' + TEMAS[fraco].nome.toLowerCase() + '?'
      : 'Qual é a sua proposta para ' + TEMAS[fraco].nome.toLowerCase() + '? Até hoje ninguém entendeu.';
  }
}

function opcoesDebate(jogo, s) {
  var p = s.passos[s.passo];
  if (!p) return [];
  if (p.tipo === 'pergunta') return Object.keys(ABORDAGENS).map(function (k) { return { id: k, nome: ABORDAGENS[k].nome, desc: ABORDAGENS[k].desc }; });
  if (p.tipo === 'responder') return Object.keys(RESPOSTAS_CONFRONTO).map(function (k) { return { id: k, nome: RESPOSTAS_CONFRONTO[k].nome, desc: RESPOSTAS_CONFRONTO[k].desc }; });
  if (p.tipo === 'replica') return Object.keys(REPLICAS).map(function (k) { return { id: k, nome: REPLICAS[k].nome, desc: REPLICAS[k].desc }; });
  if (p.tipo === 'consideracoes') return Object.keys(CONSIDERACOES).map(function (k) { return { id: k, nome: CONSIDERACOES[k].nome, desc: CONSIDERACOES[k].desc }; });
  return [];
}

function pontuar(s, id, pts, peso) {
  peso = peso === undefined ? 1 : peso;
  s.pontos[id] += pts * peso;
  s.n[id] += peso;
}

/* Penalidade direta (sem contar como intervenção). */
function penalizar(s, id, pts) { s.pontos[id] -= pts; }

function mediaDebate(s, id) { return s.n[id] ? s.pontos[id] / s.n[id] : 0; }

function registrar(s, quem, texto, nota, extra) {
  s.log.push({ quem: quem, texto: texto, nota: nota ? nota.rotulo : null, pontos: nota ? nota.pontos : 0, extra: extra || null });
}

/* Simula a participação de um candidato da IA num bloco. */
function iaResponde(jogo, s, id, tema) {
  var c = candPorId(jogo, id);
  var cred = tema ? c.cred[tema] : 50;
  var rol = 0.5 * c.attr.oratoria + 0.2 * c.attr.carisma + 0.3 * cred + rolagemBase(c) + randn() * 15 - 5;
  var n = notaDe(rol);
  pontuar(s, id, n.pontos);
  var frase;
  if (tema && chance(0.65)) frase = escolher(FALAS_PROPOSTA[tema]);
  else frase = escolher(FALAS_EMOCAO);
  return { nota: n, frase: frase };
}

/* Duelos entre candidatos da IA (acontecem em paralelo aos blocos do jogador). */
function duelosIA(jogo, s) {
  var jg = jogo.jogadorId;
  var ia = s.participantes.filter(function (id) { return id !== jg; });
  if (ia.length < 2) return;
  var a = escolher(ia);
  var alvo = alvoNoDebate(jogo, s, candPorId(jogo, a));
  var b = alvo && alvo.id !== jg && ia.indexOf(alvo.id) >= 0 ? alvo.id : escolher(ia.filter(function (x) { return x !== a; }));
  var ca = candPorId(jogo, a), cb = candPorId(jogo, b);
  var rolA = 0.7 * ca.attr.oratoria + rolagemBase(ca) + randn() * 18;
  var rolB = 0.7 * cb.attr.oratoria + rolagemBase(cb) + randn() * 18;
  var linha = linhaDeAtaque(cb);
  var na = notaDe(rolA), nb = notaDe(rolB);
  pontuar(s, a, na.pontos, 0.8);
  pontuar(s, b, nb.pontos, 0.8);
  if (rolA > rolB + 10) cb.desgaste += 1.5;
  registrar(s, a, preencher(escolher(FALAS_ATAQUE[linha]), ca, { alvo: cb.urna }), na, { alvo: b });
  registrar(s, b, rolB > rolA ? 'Rebate com firmeza e devolve a acusação.' : 'Tenta se defender, mas sai na defensiva.', nb);
}

/* O jogador escolhe uma opção no passo atual. escolha: { id, alvo, tema, tom } */
function responderDebate(jogo, s, escolha) {
  var p = s.passos[s.passo];
  var c = jogador(jogo);
  var base = rolagemBase(c);
  var rol, n, alvo;
  if (p.tipo === 'pergunta') {
    registrar(s, 'jornalista', p.jornalista + ': ' + p.texto, null, { tema: p.tema });
    if (escolha.id === 'proposta') rol = 0.4 * c.attr.oratoria + 0.35 * c.cred[p.tema] + 0.25 * c.attr.gestao + base + randn() * 12;
    else if (escolha.id === 'emocao') rol = 0.6 * c.attr.carisma + 0.35 * c.attr.oratoria + base + randn() * 20 + 2;
    else if (escolha.id === 'ataque') rol = 0.75 * c.attr.oratoria + base + randn() * 20;
    else rol = 0.45 * c.attr.oratoria + 0.2 * c.attr.carisma + base + randn() * 6 + 6;
    if (escolha.id === 'desviar') rol = Math.min(rol, 66);
    n = notaDe(rol);
    var fala;
    if (escolha.id === 'proposta') fala = escolher(FALAS_PROPOSTA[p.tema]);
    else if (escolha.id === 'emocao') fala = escolher(FALAS_EMOCAO);
    else if (escolha.id === 'desviar') fala = preencher(escolher(FALAS_DESVIO), c, { bandeira: TEMAS[c.tv.tema || 'economia'].nome.toLowerCase() });
    else {
      alvo = candPorId(jogo, escolha.alvo);
      var linha = linhaDeAtaque(alvo);
      fala = preencher(escolher(FALAS_ATAQUE[linha]), c, { alvo: alvo.urna });
      if (rol >= 63) { penalizar(s, alvo.id, 1.5); alvo.desgaste += 2.5; }
      else if (rol < 40) { c.desgaste += 2; }
      alvo.stats.ataquesRecebidos[c.id] = (alvo.stats.ataquesRecebidos[c.id] || 0) + 1;
    }
    pontuar(s, c.id, n.pontos);
    registrar(s, c.id, fala, n);
    if (n.pontos >= 4) s.frases.push({ quem: c.id, texto: fala });
    // os demais respondem a perguntas sobre outros temas
    s.participantes.forEach(function (id) {
      if (id === c.id) return;
      var t = temaDoDebate(jogo, []);
      var r = iaResponde(jogo, s, id, t);
      registrar(s, id, r.frase, r.nota, { tema: t });
    });
  } else if (p.tipo === 'perguntar') {
    alvo = candPorId(jogo, escolha.alvo);
    var tema = escolha.tema;
    var tom = escolha.tom;
    var perg = tom === 'provocar'
      ? preencher(escolher(FALAS_ATAQUE[linhaDeAtaque(alvo)]), c, { alvo: alvo.urna }) + ' Qual a sua resposta sobre ' + TEMAS[tema].nome.toLowerCase() + '?'
      : 'Eu tenho um plano claro para ' + TEMAS[tema].nome.toLowerCase() + '. E ' + oa(alvo) + ' ' + candidatoA(alvo) + ', o que propõe?';
    var rolJ = (tom === 'provocar' ? 0.7 * c.attr.oratoria + 0.1 * (100 - alvo.cred[tema]) : 0.45 * c.attr.oratoria + 0.45 * c.cred[tema]) + base + randn() * (tom === 'provocar' ? 18 : 11);
    var rolA = 0.55 * alvo.attr.oratoria + 0.35 * alvo.cred[tema] + rolagemBase(alvo) + randn() * 15;
    var nj = notaDe(rolJ), na = notaDe(rolA);
    pontuar(s, c.id, nj.pontos);
    pontuar(s, alvo.id, na.pontos);
    if (tom === 'provocar') {
      alvo.stats.ataquesRecebidos[c.id] = (alvo.stats.ataquesRecebidos[c.id] || 0) + 1;
      if (rolJ > rolA + 8) { alvo.desgaste += 2.5; penalizar(s, alvo.id, 1); }
      else if (rolA > rolJ + 12) { c.desgaste += 1.5; }
    }
    registrar(s, c.id, perg, nj, { alvo: alvo.id, tema: tema });
    registrar(s, alvo.id, rolA > 55 ? escolher(FALAS_PROPOSTA[tema]) : 'Responde de forma genérica e foge da pergunta.', na);
    s.passos.splice(s.passo + 1, 0, { tipo: 'replica', alvo: alvo.id, tema: tema });
    duelosIA(jogo, s);
  } else if (p.tipo === 'responder') {
    var q = candPorId(jogo, p.de);
    registrar(s, q.id, p.texto, notaDe(0.6 * q.attr.oratoria + rolagemBase(q) + randn() * 15), { alvo: c.id, tema: p.tema });
    if (escolha.id === 'dados') rol = 0.45 * c.attr.oratoria + 0.45 * c.cred[p.tema] + base + randn() * 12;
    else if (escolha.id === 'devolver') rol = 0.8 * c.attr.oratoria + base + randn() * 22 - 3;
    else if (escolha.id === 'emocao') rol = 0.6 * c.attr.carisma + 0.3 * c.attr.oratoria + base + randn() * 18;
    else rol = Math.min(55, 0.5 * c.attr.oratoria + base + randn() * 6 + 8);
    n = notaDe(rol);
    pontuar(s, c.id, n.pontos);
    var falaResp = escolha.id === 'dados' ? escolher(FALAS_PROPOSTA[p.tema])
      : escolha.id === 'devolver' ? preencher(escolher(FALAS_ATAQUE[linhaDeAtaque(q)]), c, { alvo: q.urna })
      : escolha.id === 'emocao' ? escolher(FALAS_EMOCAO)
      : 'Responde de forma vaga e muda de assunto.';
    if (escolha.id === 'devolver') {
      q.stats.ataquesRecebidos[c.id] = (q.stats.ataquesRecebidos[c.id] || 0) + 1;
      if (rol > 63) { q.desgaste += 2; penalizar(s, q.id, 1); }
      else if (rol < 40) c.desgaste += 2;
    }
    if (n.pontos <= -2.5) c.desgaste += 2.5;
    registrar(s, c.id, falaResp, n);
    if (n.pontos >= 4) s.frases.push({ quem: c.id, texto: falaResp });
    var trq = iaResponde(jogo, s, q.id, p.tema);
    registrar(s, q.id, 'Tréplica: ' + trq.frase, trq.nota);
    duelosIA(jogo, s);
  } else if (p.tipo === 'replica') {
    alvo = candPorId(jogo, p.alvo);
    var rep = escolha.id;
    var rolR = rep === 'ironia' ? 0.7 * c.attr.oratoria + 0.2 * c.attr.carisma + base + randn() * 24 - 4
      : rep === 'proposta' ? 0.4 * c.attr.oratoria + 0.45 * c.cred[p.tema] + base + randn() * 10
      : 0.75 * c.attr.oratoria + base + randn() * 15;
    var nr = notaDe(rolR);
    pontuar(s, c.id, nr.pontos, 0.7);
    var falaR = rep === 'ironia' ? (nr.pontos >= 2.5 ? '"Com todo respeito, ' + alvo.urna + ', essa resposta não convence nem os seus assessores."' : 'Faz uma ironia que soa arrogante.')
      : rep === 'proposta' ? escolher(FALAS_PROPOSTA[p.tema])
      : 'Rebate ponto a ponto, com números, a resposta de ' + alvo.urna + '.';
    registrar(s, c.id, 'Réplica: ' + falaR, nr);
    if (nr.pontos >= 4 && rep === 'ironia') s.frases.push({ quem: c.id, texto: falaR });
    var tr = iaResponde(jogo, s, alvo.id, p.tema);
    registrar(s, alvo.id, 'Tréplica: ' + tr.frase, tr.nota);
  } else if (p.tipo === 'consideracoes') {
    var cons = CONSIDERACOES[escolha.id];
    var percL = percDoEscopo(jogo, s.escopo);
    var lider = s.participantes.every(function (id) { return (percL[id] || 0) <= (percL[c.id] || 0); });
    var encaixe = 0;
    if (escolha.id === 'esperanca') encaixe = (c.situacao || lider) ? 8 : 2;
    if (escolha.id === 'indignacao') encaixe = c.situacao ? -10 : 7;
    if (escolha.id === 'uniao') encaixe = Math.abs(c.x) < 40 ? 7 : 1;
    if (escolha.id === 'firmeza') encaixe = c.x > 20 ? 7 : 0;
    rol = 0.5 * c.attr.carisma + 0.4 * c.attr.oratoria + base + encaixe + randn() * 12;
    n = notaDe(rol);
    pontuar(s, c.id, n.pontos);
    registrar(s, c.id, cons.fala, n);
    s.participantes.forEach(function (id) {
      if (id === c.id) return;
      var r = iaResponde(jogo, s, id, null);
      var o = candPorId(jogo, id);
      var tom = o.situacao ? 'esperanca' : (o.x > 40 ? 'firmeza' : (Math.abs(o.x) < 25 ? 'uniao' : 'indignacao'));
      registrar(s, id, CONSIDERACOES[tom].fala, r.nota);
    });
  }
  s.passo++;
  prepararPasso(jogo, s);
  return s.log.length;
}

function debateTerminou(s) { return s.passo >= s.passos.length; }

/* Debate sem o jogador: simulação rápida. */
function simularDebateSemJogador(jogo, s) {
  for (var k = 0; k < 4; k++) {
    s.participantes.forEach(function (id) {
      if (id === jogo.jogadorId) return;
      var r = iaResponde(jogo, s, id, temaDoDebate(jogo, []));
      if (k === 0) registrar(s, id, r.frase, r.nota);
    });
    duelosIA(jogo, s);
  }
  s.passo = s.passos.length;
}

/* Fecha o debate: pesquisa "quem venceu", efeitos na imagem e no conhecimento. */
function concluirDebate(jogo, s) {
  var ids = s.participantes;
  var perc = percDoEscopo(jogo, s.escopo);
  var medias = {};
  ids.forEach(function (id) { medias[id] = mediaDebate(s, id); });
  var media = soma(ids.map(function (id) { return medias[id]; })) / ids.length;
  var pesos = {}, tot = 0;
  ids.forEach(function (id) {
    var w = Math.exp(medias[id] / 1.2) * Math.sqrt((perc[id] || 3) + 4);
    pesos[id] = w; tot += w;
  });
  var vencedor = null, vmax = -1;
  var res = { quemVenceu: {}, efeitos: {} };
  var audf = Math.sqrt(s.audiencia / 10);
  ids.forEach(function (id) {
    var c = candPorId(jogo, id);
    res.quemVenceu[id] = Math.round(pesos[id] / tot * 100);
    if (res.quemVenceu[id] > vmax) { vmax = res.quemVenceu[id]; vencedor = id; }
    var delta = (medias[id] - media) / 8 * audf;
    c.imagem += delta;
    crescerRecogTodos(c, 0.035 * audf);
    c.preparo = 0;
    c.stats.debates.push({ dia: s.dia, media: medias[id], pct: res.quemVenceu[id] });
    res.efeitos[id] = delta;
    res.medias = medias;
  });
  // candidatos fora do debate perdem visibilidade
  candsDoEscopo(jogo, s.escopo).forEach(function (c) { if (ids.indexOf(c.id) < 0) c.imagem -= 0.02; });
  res.vencedor = vencedor;
  s.resultado = res;
  jogo.debatesFeitos.push(s.dia);
  var cv = candPorId(jogo, vencedor);
  noticia(jogo, 'Debate na ' + s.emissora + ': ' + cv.urna + ' vence, segundo pesquisa', 'Para ' + res.quemVenceu[vencedor] + '% dos espectadores, ' + cv.urna + ' se saiu melhor.', 'debate', vencedor);
  if (s.frases.length) {
    var f = s.frases[0];
    noticia(jogo, 'Frase de ' + candPorId(jogo, f.quem).urna + ' viraliza após o debate', f.texto, 'debate', f.quem);
  }
  jogo.debateAtual = null;
  jogo.ultimoDebate = s;
  return res;
}

/* ---------- Sabatina no telejornal ---------- */

function montarSabatina(jogo) {
  var c = jogador(jogo);
  var fraco = TEMA_IDS.slice().sort(function (a, b) { return c.cred[a] - c.cred[b]; })[0];
  var ks = ['fraqueza'];
  if (c.coligacao.length > 1) ks.push('aliados');
  if (Math.abs(c.x) > 45) ks.push('extremo');
  ks.push('dinheiro');
  if (c.attr.gestao < 50 || ['celebridade', 'empresario', 'militar', 'religioso'].indexOf(c.trajetoria) >= 0) ks.push('experiencia');
  if (c.situacao) ks.push('governo');
  ks = ks.slice(0, 4);
  while (ks.length < 4) ks.push(['dinheiro', 'extremo', 'experiencia'][ks.length % 3]);
  return {
    perguntas: ks.map(function (k) {
      return { k: k, texto: preencher(SABATINA_PERGUNTAS[k], c, { tema: TEMAS[fraco].nome.toLowerCase(), aprov: Math.round(jogo.aprovacao) }) };
    }),
    idx: 0, pontos: 0, log: []
  };
}

function responderSabatina(jogo, sab, op) {
  var c = jogador(jogo);
  var q = sab.perguntas[sab.idx];
  var rol;
  if (op === 'direto') rol = 0.35 * c.attr.oratoria + 0.3 * c.attr.integridade + 0.2 * c.attr.gestao + 0.15 * c.attr.carisma + randn() * 12;
  else if (op === 'evasivo') rol = Math.min(52, 0.5 * c.attr.oratoria + randn() * 8 + 10);
  else rol = 0.5 * c.attr.carisma + 0.3 * c.attr.oratoria + randn() * 22 - 6;
  var n = notaDe(rol);
  sab.pontos += n.pontos;
  if (op === 'contra') c.base = Math.min(1.2, (c.base || 0) + 0.02);
  var falas = {
    direto: n.pontos > 0 ? 'Reconhece os desafios e detalha como fará diferente.' : 'Tenta ser franco, mas se perde nos números.',
    evasivo: 'Contorna a pergunta. O apresentador insiste e o constrangimento fica no ar.',
    contra: n.pontos > 0 ? 'Rebate a pergunta e acusa a imprensa de parcialidade. A militância aplaude.' : 'Discute com os apresentadores. O vídeo vira assunto nacional.'
  };
  sab.log.push({ pergunta: q.texto, resposta: falas[op], nota: n.rotulo, pontos: n.pontos });
  sab.idx++;
  return n;
}

function concluirSabatina(jogo, sab) {
  var c = jogador(jogo);
  var delta = sab.pontos / 40;
  c.imagem += delta;
  if (sab.pontos < -2) c.desgaste += 3;
  UFS.forEach(function (u) { crescerRecog(c, u, 0.04); });
  jogo.sabatinaFeita = true;
  noticia(jogo, c.urna + ' é entrevistad' + oa(c) + ' no Jornal da Nação',
    sab.pontos >= 6 ? 'Desempenho seguro agrada até críticos.' : sab.pontos >= 0 ? 'Entrevista morna, sem grandes deslizes.' : 'Entrevista tensa expõe fragilidades da candidatura.',
    sab.pontos >= 0 ? 'bom' : 'ruim', c.id);
  // adversários também passam pela sabatina
  candidatosAtivos(jogo).forEach(function (o) {
    if (o.jogador) return;
    var r = (0.4 * o.attr.oratoria + 0.3 * o.attr.integridade + 0.3 * o.attr.gestao + randn() * 14 - 50) / 25;
    o.imagem += r * 0.1;
    UFS.forEach(function (u) { crescerRecog(o, u, 0.03); });
  });
  return delta;
}
