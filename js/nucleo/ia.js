/* Inteligência dos candidatos adversários. */

function posicaoNaCorrida(jogo, c) {
  var perc = jogo.percepcao || {};
  var ativos = candidatosAtivos(jogo).slice().sort(function (a, b) { return (perc[b.id] || 0) - (perc[a.id] || 0); });
  var idx = ativos.indexOf(c);
  return { idx: idx, ordem: ativos, perc: perc };
}

/* Valor marginal de fazer campanha em um estado: eleitorado × p(1-p), com retorno decrescente. */
function valorEstado(jogo, c, uf) {
  var e = ESTADO_POR_UF[uf];
  var p = jogo._cache && jogo._cache.uf[uf] ? (jogo._cache.uf[uf][c.id] || 1) / 100 : 0.1;
  var v = e.eleitores * Math.max(0.03, p * (1 - p)) * (1 - c.presenca[uf] / 130);
  if (c.uf === uf) v *= c.estilo === 'regional' ? 1.5 : 1.15;
  if (c.local && ESTADO_POR_UF[c.local] && ESTADO_POR_UF[c.local].reg === e.reg) v *= 1.1;
  return v * (0.6 + rand() * 0.8);
}

function melhorEstado(jogo, c) {
  var melhor = null, mv = -1;
  UFS_MAPA.forEach(function (uf) {
    var v = valorEstado(jogo, c, uf);
    if (v > mv) { mv = v; melhor = uf; }
  });
  return melhor;
}

function melhorTema(jogo, c) {
  var sal = jogo.saliencia || {};
  return TEMA_IDS.slice().sort(function (a, b) {
    return c.cred[b] * (sal[b] || 1) - c.cred[a] * (sal[a] || 1);
  })[0];
}

/* Segmento onde o candidato tem mais espaço para crescer. */
function melhorSegmento(jogo, c) {
  return escolherPeso(SEG_IDS, function (g) {
    var d = 0, w = 0;
    ESTADOS.forEach(function (e) { w += e.eleitores * e.seg[g]; d += e.eleitores * e.seg[g] * Math.abs(e.segMedia[g] - c.x); });
    var dist = d / w;
    return Math.max(0.05, 1.4 - dist / 70);
  });
}

function alvoDeAtaque(jogo, c) {
  var pos = posicaoNaCorrida(jogo, c);
  var ordem = pos.ordem, perc = pos.perc, i = pos.idx;
  if (ordem.length < 2) return null;
  var prog = jogo.dia / jogo.cal.eleicao1;
  if (jogo.fase === 'campanha2') return ordem[i === 0 ? 1 : 0];
  if (i === 0) {
    var gap = (perc[c.id] || 0) - (perc[ordem[1].id] || 0);
    return gap < 6 ? ordem[1] : null;
  }
  if (i === 1) return prog > 0.3 ? ordem[0] : null;
  if (i === 2) return (perc[ordem[1].id] - perc[c.id]) < 9 ? ordem[1] : (c.estilo === 'agressivo' ? ordem[0] : null);
  return c.estilo === 'agressivo' && chance(0.5) ? ordem[Math.min(1, i - 1)] : null;
}

function linhaDeAtaque(alvo) {
  var op = [
    ['corrupcao', 110 - alvo.attr.integridade],
    ['incompetencia', 110 - alvo.attr.gestao],
    ['radicalismo', Math.abs(alvo.x) + 10],
    ['promessas', 40 + (alvo.stats.fiscal || 0) * 8]
  ];
  return escolherPeso(op, function (o) { return o[1] * o[1]; })[0];
}

function iaEscolherAcoes(jogo, c, nSlots) {
  var acoes = [];
  var energiaPrev = c.energia;
  var esc = escalaRitmo(jogo);
  var dinheiroPrev = c.dinheiro;
  for (var s = 0; s < nSlots; s++) {
    var a = null;
    if (energiaPrev < 28) a = { tipo: 'descanso', p: {} };
    else if (dinheiroPrev < 2.5 && chance(0.7)) a = { tipo: 'arrecadar', p: { reg: escolher(['SE', 'SE', 'S', 'CO', 'NE']) } };
    else {
      var alvo = alvoDeAtaque(jogo, c);
      var pAtaque = alvo ? (c.estilo === 'agressivo' ? 0.16 : 0.08) * (0.6 + jogo.dia / jogo.cal.eleicao1) : 0;
      var debateProx = proximoDebate(jogo);
      var pPrep = debateProx && debateProx.dia - jogo.dia <= 7 && c.preparo < 30 ? 0.12 : 0;
      var propDisp = PROPOSTAS.filter(function (p) { return c.propostas.indexOf(p.id) < 0 && Math.abs(p.ideo - c.x) < 45; });
      var pProp = propDisp.length && c.propostas.length < 7 ? 0.06 : 0;
      var apoiosDisp = APOIOS.filter(function (ap) { return chanceApoio(jogo, c, ap.id, 'programa') > 0.25; });
      Object.keys(jogo.governadores).forEach(function (uf) {
        var g = jogo.governadores[uf];
        if (!g.apoio && ESTADO_POR_UF[uf].eleitores > 3 && chanceApoio(jogo, c, 'gov:' + uf, 'cargos') > 0.3) apoiosDisp.push({ id: 'gov:' + uf });
      });
      var pApoio = apoiosDisp.length ? 0.05 : 0;
      var r = rand();
      if ((r -= pAtaque) < 0) a = { tipo: 'ataque', p: { alvo: alvo.id, linha: linhaDeAtaque(alvo) } };
      else if ((r -= pPrep) < 0) a = { tipo: 'preparar', p: {} };
      else if ((r -= pProp) < 0) {
        var prop = escolherPeso(propDisp, function (p) { return 1.2 - Math.abs(p.ideo - c.x) / 50; });
        a = { tipo: 'proposta', p: { id: prop.id } };
      } else if ((r -= pApoio) < 0) {
        var ap = escolher(apoiosDisp);
        a = { tipo: 'apoio', p: { alvo: ap.id, oferta: chance(0.5) ? 'cargos' : 'programa' } };
      } else if ((r -= (dinheiroPrev > 35 ? 0.12 : 0.05)) < 0 && dinheiroPrev > 6) {
        a = { tipo: 'digital', p: { tipo: escolher(['impulsionar', 'impulsionar', 'live', 'viral']) } };
      } else if ((r -= 0.06) < 0) {
        a = { tipo: 'entrevista', p: { reg: escolherPeso(['N', 'NE', 'CO', 'SE', 'S'], function (rg) { return ufsDaRegiao(rg).reduce(function (t, u) { return t + ESTADO_POR_UF[u].eleitores; }, 0); }) } };
      } else if ((r -= 0.14) < 0) {
        a = { tipo: 'visita', p: { uf: melhorEstado(jogo, c), seg: melhorSegmento(jogo, c) } };
      } else if ((r -= 0.08) < 0) {
        a = { tipo: 'carreata', p: { uf: melhorEstado(jogo, c) } };
      } else {
        a = { tipo: 'comicio', p: { uf: melhorEstado(jogo, c), tema: melhorTema(jogo, c) } };
      }
    }
    var def = ACOES[a.tipo];
    var custo = def.custo(jogo, c, a.p);
    if (!podePagar(jogo, c, custo)) a = dinheiroPrev < 1 ? { tipo: 'arrecadar', p: { reg: 'SE' } } : { tipo: 'visita', p: { uf: melhorEstado(jogo, c), seg: melhorSegmento(jogo, c) } };
    energiaPrev -= ACOES[a.tipo].energia * esc;
    dinheiroPrev -= ACOES[a.tipo].custo(jogo, c, a.p);
    acoes.push(a);
  }
  return acoes;
}

function iaEstrategiaTV(jogo, c) {
  var alvo = alvoDeAtaque(jogo, c);
  var invest = c.dinheiro > 40 ? 3 : (c.dinheiro > 12 ? 2 : 1);
  if (c.desgaste > 18 && chance(0.6)) { c.tv = { estrategia: 'defesa', tema: melhorTema(jogo, c), alvo: null, invest: invest }; return; }
  var pAt = alvo ? (c.estilo === 'agressivo' ? 0.45 : 0.25) : 0;
  if (jogo.fase === 'campanha2') pAt += 0.15;
  if (alvo && chance(pAt)) c.tv = { estrategia: 'ataque', tema: melhorTema(jogo, c), alvo: alvo.id, invest: invest };
  else c.tv = { estrategia: 'positiva', tema: melhorTema(jogo, c), alvo: null, invest: invest };
}

/* Pré-campanha: partidos livres escolhem um lado (ou ficam neutros). */
function iaFecharColigacoes(jogo) {
  var r0 = calcularIntencoes(jogo, { dia: 0 });
  PARTIDOS.forEach(function (p) {
    if (jogo.partidos[p.sigla]) return;
    var cands = candidatosAtivos(jogo).filter(function (c) { return !c.jogador; });
    var melhor = null, mv = 0;
    cands.forEach(function (c) {
      var dist = Math.abs(p.ideo - c.x);
      var share = r0.nac[c.id];
      var v = (1 - p.fisio) * Math.max(0, 1 - dist / 60) + p.fisio * Math.max(0, share / 35 - dist / 200);
      v *= 0.7 + rand() * 0.6;
      if (v > mv) { mv = v; melhor = c; }
    });
    if (melhor && mv > 0.35) {
      melhor.coligacao.push(p.sigla);
      jogo.partidos[p.sigla] = melhor.id;
      noticia(jogo, p.sigla + ' fecha aliança com ' + melhor.urna, 'O ' + p.nome + ' indica apoio formal à chapa de ' + melhor.urna + '.', 'coligacao', melhor.id);
    } else {
      noticia(jogo, p.sigla + ' decide ficar neutro', 'O ' + p.nome + ' libera seus filiados na disputa presidencial.', 'coligacao');
    }
  });
  atualizarApoioGovernadores(jogo);
}

/* Probabilidade de um partido aceitar entrar na coligação do jogador. */
function chancePartido(jogo, c, sigla, oferta) {
  var p = PARTIDO_POR_SIGLA[sigla];
  var dist = Math.abs(p.ideo - c.x);
  var r0 = jogo._cache || calcularIntencoes(jogo, { dia: 0 });
  var share = r0.nac[c.id] || 2;
  var afinidade = Math.max(0, 1 - dist / 70);
  var viab = clamp(share / 30, 0, 1.3);
  var ch = (1 - p.fisio) * afinidade * 0.75 + p.fisio * (viab * 0.6 + afinidade * 0.2);
  ch += (c.attr.articulacao - 50) / 250;
  if (oferta === 'cargos') ch += 0.08 + p.fisio * 0.15;
  if (oferta === 'vice') ch += 0.2;
  if (oferta === 'pauta') ch += 0.1 * (1 - p.fisio) + 0.05;
  if (jogo.partidos[sigla] && jogo.partidos[sigla] !== c.id) ch *= 0.2;
  if (dist > 90) ch *= 0.2;
  return clamp(ch, 0.02, 0.92);
}

/* 2º turno: candidato eliminado decide quem apoiar. ofertaJogador: null | 'programa' | 'cargos' */
function decidirApoioSegundoTurno(jogo, elim, finalistas, ofertaJogador) {
  var scores = finalistas.map(function (fid) {
    var f = candPorId(jogo, fid);
    var dist = Math.abs(f.x - elim.x);
    var s = 1 - dist / 80;
    var ataques = (elim.stats.ataquesRecebidos[fid] || 0);
    s -= ataques * 0.06;
    if (f.jogador && ofertaJogador) s += ofertaJogador === 'cargos' ? 0.18 : 0.12;
    if (f.jogador) s += (f.attr.articulacao - 50) / 300;
    return s + randn() * 0.12;
  });
  var mx = Math.max.apply(null, scores);
  if (mx < 0.15) return 'neutro';
  var i = scores.indexOf(mx);
  if (Math.abs(scores[0] - scores[1]) < 0.06 && chance(0.4)) return 'neutro';
  return finalistas[i];
}
