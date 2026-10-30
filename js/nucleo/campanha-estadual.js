/* Campanhas estaduais: ações, IA, horário eleitoral, pesquisas e resultados de
 * governador, Senado e deputados. */

function crescerRecogZ(c, z, taxa) { c.recog[z] = Math.min(99, c.recog[z] + (100 - c.recog[z]) * taxa); }
function crescerRecogTodos(c, taxa) {
  if (c.escopo === 'estadual') { ZONAS.forEach(function (z) { crescerRecogZ(c, z, taxa); }); return; }
  UFS.forEach(function (u) { crescerRecog(c, u, taxa); });
}
/* Presença num local: para candidatos estaduais, UF do próprio estado vira as duas zonas. */
function somarPresenca(c, onde, v) {
  if (c.escopo === 'estadual') {
    var zs = ZONAS.indexOf(onde) >= 0 ? [onde] : (onde === c.uf ? ZONAS : ['interior']);
    zs.forEach(function (z) { c.presenca[z] = Math.min(100, c.presenca[z] + v); });
    return;
  }
  if (c.presenca[onde] !== undefined) c.presenca[onde] = Math.min(100, c.presenca[onde] + v);
}

function tetoDoCandidato(jogo, c) {
  if (c.escopo !== 'estadual') return tetoAtual(jogo);
  var t2 = jogo.fase === 'campanha2' && c.cargo === 'governador' ? 2 : 1;
  return tetoCargo(c.cargo, c.uf, t2);
}
function podePagarC(jogo, c, custo) {
  return c.dinheiro >= custo - 1e-9 && c.gasto + custo <= tetoDoCandidato(jogo, c) + 1e-9;
}

function custoZona(c, zona, base) {
  var e = ESTADO_POR_UF[c.uf];
  var el = e.eleitores * (zona === 'metro' ? FRACAO_METRO[c.uf] : 1 - FRACAO_METRO[c.uf]);
  var desloc = c.local === zona ? 0 : 0.1;
  return escalaCustoCargo(c.cargo, c.uf) * (base + 0.06 * Math.pow(el, 0.7) + desloc);
}

var NOMES_ZONA_CURTO = { metro: 'capital', interior: 'interior' };

function rotuloZona(c, z) { return nomesZonas(c.uf)[z]; }

var ACOES_EST = {
  comicio: {
    nome: 'Comício', cat: 'rua', energia: 12, desc: 'Ato público com militância e lideranças. Presença e conhecimento.',
    custo: function (jogo, c, p) { return custoZona(c, p.zona, 0.5); },
    rotulo: function (p, c) { return 'Comício · ' + (c ? rotuloZona(c, p.zona) : p.zona) + (p.tema ? ' · ' + TEMAS[p.tema].curto : ''); },
    executar: function (jogo, c, p, ef) {
      var f = ef * (0.75 + 0.5 * c.attr.carisma / 100);
      c.presenca[p.zona] = Math.min(100, c.presenca[p.zona] + 22 * f * (1 - c.presenca[p.zona] / 150));
      crescerRecogZ(c, p.zona, 0.1 * f);
      var outra = p.zona === 'metro' ? 'interior' : 'metro';
      c.presenca[outra] = Math.min(100, c.presenca[outra] + 3 * f);
      if (p.tema) c.cred[p.tema] = Math.min(98, c.cred[p.tema] + 0.8 * f);
      c.imagem += 0.01 * f; c.local = p.zona; c.stats.comicios++;
      var r = rand();
      if (r < 0.08) { c.imagem -= 0.03; return { tipo: 'ruim', texto: 'Ato esvaziado em ' + rotuloZona(c, p.zona) + ' vira assunto nas redes.' }; }
      if (r > 0.92) { c.imagem += 0.035; return { tipo: 'bom', texto: 'Ato lotado em ' + rotuloZona(c, p.zona) + ' anima a campanha.' }; }
      return { tipo: 'neutro', texto: 'Ato de campanha em ' + rotuloZona(c, p.zona) + '.' };
    }
  },
  corpo: {
    nome: 'Corpo a corpo e panfletagem', cat: 'rua', energia: 8, desc: 'Feiras, terminais e porta a porta. Barato e eficaz para quem é pouco conhecido.',
    custo: function (jogo, c, p) { return custoZona(c, p.zona, 0.15); },
    rotulo: function (p, c) { return 'Corpo a corpo · ' + (c ? rotuloZona(c, p.zona) : p.zona); },
    executar: function (jogo, c, p, ef) {
      c.presenca[p.zona] = Math.min(100, c.presenca[p.zona] + 13 * ef * (1 - c.presenca[p.zona] / 150));
      crescerRecogZ(c, p.zona, 0.06 * ef);
      c.segTemp.popular += 0.012 * ef; c.local = p.zona;
      return { tipo: 'neutro', texto: 'Corpo a corpo em ' + rotuloZona(c, p.zona) + '.' };
    }
  },
  visita: {
    nome: 'Visita a um público', cat: 'rua', energia: 7, desc: 'Encontro com um perfil de eleitor: igreja, periferia, comércio, agro ou universidade.',
    custo: function (jogo, c, p) { return custoZona(c, p.zona, 0.1); },
    rotulo: function (p, c) { return NOMES_VISITA[p.seg] + ' · ' + (c ? NOMES_ZONA_CURTO[p.zona] : p.zona); },
    executar: function (jogo, c, p, ef) {
      c.presenca[p.zona] = Math.min(100, c.presenca[p.zona] + 7 * ef);
      c.segTemp[p.seg] += 0.05 * ef;
      crescerRecogZ(c, p.zona, 0.035 * ef); c.local = p.zona;
      return { tipo: 'neutro', texto: NOMES_VISITA[p.seg] + ' (' + rotuloZona(c, p.zona) + ').' };
    }
  },
  radio: {
    nome: 'Rádios e TVs locais', cat: 'midia', energia: 5, desc: 'Entrevistas e participações em programas de grande audiência.',
    custo: function (jogo, c) { return escalaCustoCargo(c.cargo, c.uf) * 0.1; },
    rotulo: function (p, c) { return 'Entrevistas · ' + (c ? rotuloZona(c, p.zona) : p.zona); },
    executar: function (jogo, c, p, ef) {
      crescerRecogZ(c, p.zona, 0.07 * ef);
      crescerRecogZ(c, p.zona === 'metro' ? 'interior' : 'metro', 0.02 * ef);
      var rol = c.attr.oratoria + randn() * 20 - (c.energia < 25 ? 15 : 0);
      if (rol < 22) { c.desgaste += 2.5; return { tipo: 'ruim', texto: 'Resposta atrapalhada em entrevista vira piada nas redes.' }; }
      if (rol > 88) { c.imagem += 0.03; return { tipo: 'bom', texto: 'Entrevista tem ótima repercussão.' }; }
      return { tipo: 'neutro', texto: 'Rodada de entrevistas em ' + rotuloZona(c, p.zona) + '.' };
    }
  },
  digital: {
    nome: 'Campanha digital', cat: 'midia', energia: 3, desc: 'Impulsionamento, lives e grupos de mensagens.',
    custo: function (jogo, c, p) { return escalaCustoCargo(c.cargo, c.uf) * { impulsionar: 1.2, live: 0.05, viral: 0.4 }[p.tipo]; },
    rotulo: function (p) { return { impulsionar: 'Impulsionar conteúdo', live: 'Live com apoiadores', viral: 'Apostar em conteúdo viral' }[p.tipo]; },
    executar: function (jogo, c, p, ef) {
      var dig = MARQ_EST_POR_ID[c.marqueteiro] ? MARQ_EST_POR_ID[c.marqueteiro].digital : 1;
      if (p.tipo === 'impulsionar') { ZONAS.forEach(function (z) { crescerRecogZ(c, z, 0.035 * ef * dig); }); c.segTemp.jovem += 0.03 * ef * dig; return { tipo: 'neutro', texto: 'Vídeos impulsionados alcançam milhares de eleitores do estado.' }; }
      if (p.tipo === 'live') { c.segTemp.jovem += 0.02 * ef * dig; c.imagem += 0.008; return { tipo: 'neutro', texto: 'Live com apoiadores.' }; }
      var r = rand() * dig;
      if (r > 0.72) { c.imagem += 0.06; c.segTemp.jovem += 0.05; ZONAS.forEach(function (z) { crescerRecogZ(c, z, 0.05); }); return { tipo: 'bom', texto: 'Vídeo da campanha viraliza no estado.' }; }
      if (r < 0.2) { c.desgaste += 3.5; return { tipo: 'ruim', texto: 'Conteúdo da campanha vira meme contra ' + c.urna + '.' }; }
      return { tipo: 'neutro', texto: 'Conteúdo com engajamento moderado.' };
    }
  },
  arrecadar: {
    nome: 'Arrecadação', cat: 'politica', energia: 8, desc: 'Encontro com doadores (pessoas físicas).',
    custo: function () { return 0; },
    rotulo: function () { return 'Jantar de arrecadação'; },
    executar: function (jogo, c, p, ef) {
      var sh = percebidoEst2(jogo, c);
      var v = escalaCustoCargo(c.cargo, c.uf) * (1.3 + 2.4 * rand()) * (0.6 + sh / 25) * (c.x > 0 ? 1 + c.x / 200 : 1 + c.x / 400) * (escalaRitmo(jogo) === 1 ? 1 : 0.6);
      v = Math.round(v * 100) / 100;
      c.dinheiro += v; c.arrecadado += v;
      if (chance((100 - c.attr.integridade) / 450)) c.suspeitaDoacao = (c.suspeitaDoacao || 0) + v;
      return { tipo: 'neutro', texto: 'Arrecadação rende ' + fmtDinheiro(v) + '.', valor: v };
    }
  },
  ataque: {
    nome: 'Atacar adversário', cat: 'politica', energia: 5, cargos: ['governador', 'senador'], desc: 'Desgasta o alvo, mas aumenta sua rejeição.',
    custo: function (jogo, c) { return escalaCustoCargo(c.cargo, c.uf) * 0.2; },
    rotulo: function (p, c, jogo) { return 'Ataque a ' + (jogo ? candPorId(jogo, p.alvo).urna : p.alvo); },
    executar: function (jogo, c, p, ef) { return ACOES.ataque.executar(jogo, c, p, ef); }
  },
  apoio: {
    nome: 'Negociar apoio', cat: 'politica', energia: 6, desc: 'Prefeitos, governador e setores organizados do estado.',
    custo: function () { return 0; },
    rotulo: function (p) { return 'Apoio: ' + (APOIO_EST_POR_ID[p.alvo] ? APOIO_EST_POR_ID[p.alvo].curto : p.alvo); },
    executar: function (jogo, c, p) { return negociarApoioEst(jogo, c, p.alvo, p.oferta || 'programa'); }
  },
  presidenciavel: {
    nome: 'Ato com o presidenciável', cat: 'politica', energia: 6, desc: 'Traz seu candidato a presidente ao estado. Reforça o voto casado.',
    custo: function (jogo, c) { return escalaCustoCargo(c.cargo, c.uf) * 0.6; },
    rotulo: function (p, c, jogo) { return 'Ato com ' + (jogo && c && c.palanque && candPorId(jogo, c.palanque) ? candPorId(jogo, c.palanque).urna : 'o presidenciável'); },
    executar: function (jogo, c, p, ef) {
      var pres = c.palanque ? candPorId(jogo, c.palanque) : null;
      if (!pres || !pres.ativo) return { tipo: 'neutro', texto: 'Sem presidenciável para trazer ao estado.' };
      var perc = (jogo.percepcao && jogo.percepcao[pres.id]) || 5;
      if (!chance(0.45 + Math.min(0.4, percebidoEst2(jogo, c) / 60))) return { tipo: 'ruim', texto: pres.urna + ' não conseguiu encaixar o estado na agenda.' };
      ZONAS.forEach(function (z) { c.presenca[z] = Math.min(100, c.presenca[z] + 10 * ef); crescerRecogZ(c, z, 0.06 * ef); });
      c.palanqueOficial = true;
      c.imagem += 0.02 * (perc > 25 ? 1 : 0.3);
      pres.presenca[c.uf] = Math.min(100, pres.presenca[c.uf] + 12);
      return { tipo: 'bom', texto: pres.urna + ' faz ato ao lado de ' + c.urna + ' em ' + ESTADO_POR_UF[c.uf].capital + '.' };
    }
  },
  dobrada: {
    nome: 'Agenda com a dobradinha', cat: 'politica', energia: 6, cargos: ['depfed', 'depest'], desc: 'Campanha conjunta com seu par na outra casa: custos divididos.',
    custo: function (jogo, c) { return escalaCustoCargo(c.cargo, c.uf) * 0.15; },
    rotulo: function () { return 'Agenda com a dobradinha'; },
    executar: function (jogo, c, p, ef) {
      if (!c.dobrada) return { tipo: 'neutro', texto: 'Você não tem dobradinha definida.' };
      ZONAS.forEach(function (z) { c.presenca[z] = Math.min(100, c.presenca[z] + 8 * ef); crescerRecogZ(c, z, 0.04 * ef); });
      c.segTemp[c.dobrada.seg] += 0.03 * ef;
      return { tipo: 'neutro', texto: 'Agenda conjunta com ' + c.dobrada.urna + ' (' + c.dobrada.cargoNome + ').' };
    }
  },
  proposta: {
    nome: 'Lançar proposta', cat: 'estrategia', energia: 3, desc: 'Compromisso de campanha para conquistar um público.',
    custo: function (jogo, c) { return escalaCustoCargo(c.cargo, c.uf) * 0.1; },
    rotulo: function (p) { return 'Proposta: ' + (PROPOSTA_EST_POR_ID[p.id] || PROPOSTA_POR_ID[p.id]).nome; },
    executar: function (jogo, c, p) {
      var prop = PROPOSTA_EST_POR_ID[p.id] || PROPOSTA_POR_ID[p.id];
      var r = lancarProposta(jogo, c, prop);
      if (prop.zona && !r.falhou) for (var z in prop.zona) c.eps[z] += prop.zona[z];
      return r;
    }
  },
  preparar: {
    nome: 'Preparação para debate', cat: 'estrategia', energia: 6, cargos: ['governador', 'senador'], desc: 'Melhora o desempenho no próximo debate.',
    custo: function (jogo, c) { return escalaCustoCargo(c.cargo, c.uf) * 0.05; },
    rotulo: function () { return 'Preparação para o debate'; },
    executar: function (jogo, c, p, ef) { return ACOES.preparar.executar(jogo, c, p, ef); }
  },
  descanso: {
    nome: 'Descanso', cat: 'estrategia', energia: -30, desc: 'Recupera a energia.',
    custo: function () { return 0; },
    rotulo: function () { return 'Descanso'; },
    executar: function () { return { tipo: 'neutro', texto: 'Agenda reduzida para descansar.' }; }
  }
};

var MARQ_EST_POR_ID = {};
MARQUETEIROS_EST.forEach(function (m) { MARQ_EST_POR_ID[m.id] = m; });

function acoesDoCargo(cargo) {
  return Object.keys(ACOES_EST).filter(function (k) { return !ACOES_EST[k].cargos || ACOES_EST[k].cargos.indexOf(cargo) >= 0; });
}

function percebidoEst2(jogo, c) {
  if (c.cargo === 'governador' || c.cargo === 'senador') return percebidoEst(jogo, c);
  return 10;
}

function executarAcaoEst(jogo, c, acao) {
  var def = ACOES_EST[acao.tipo];
  if (!def) return null;
  var custo = def.custo(jogo, c, acao.p || {});
  if (!podePagarC(jogo, c, custo)) return { tipo: 'ruim', texto: 'Sem recursos para: ' + def.rotulo(acao.p || {}, c, jogo) + '.', falhou: true };
  gastar(c, custo);
  var esc = escalaRitmo(jogo);
  if (def.energia > 0) c.energia = Math.max(0, c.energia - def.energia * esc);
  else c.energia = Math.min(100, c.energia - def.energia * esc);
  var ef = efetividade(jogo, c);
  var r = def.executar(jogo, c, acao.p || {}, ef) || { tipo: 'neutro', texto: '' };
  r.custo = custo;
  return r;
}

/* ---------- Apoios estaduais ---------- */

function chaveApoiosEst(c) { return c.cargo === 'governador' || c.cargo === 'senador' ? c.cargo : 'dep'; }

function chanceApoioEst(jogo, c, alvo, oferta) {
  var a = APOIO_EST_POR_ID[alvo];
  if (!a) return 0;
  if (a.cargos && a.cargos.indexOf(c.cargo) < 0) return 0;
  var ap = jogo.est.ufs[c.uf].apoios[chaveApoiosEst(c)] = jogo.est.ufs[c.uf].apoios[chaveApoiosEst(c)] || {};
  if (ap[alvo] === c.id) return 0;
  if (a.req && a.req.ideoMin !== undefined && c.x < a.req.ideoMin) return 0;
  if (a.req && a.req.ideoMax !== undefined && c.x > a.req.ideoMax) return 0;
  var sh = percebidoEst2(jogo, c);
  var p = 0.58 - a.dif * 0.38 + (sh - 15) / 120 + (c.attr.articulacao - 50) / 220;
  if (alvo === 'governadorAtual') {
    var gv = jogo.governadores[c.uf];
    var pg = PARTIDO_POR_SIGLA[gv.partido];
    if (c.cargo === 'governador') return 0;
    p += c.coligacao.indexOf(gv.partido) >= 0 || c.partido === gv.partido ? 0.35 : -Math.abs(pg.ideo - c.x) / 200;
  }
  if (alvo === 'prefCapital') {
    var pf = PARTIDO_POR_SIGLA[jogo.est.ufs[c.uf].prefeito.partido];
    p += c.partido === pf.sigla || c.coligacao.indexOf(pf.sigla) >= 0 ? 0.3 : -Math.abs(pf.ideo - c.x) / 220;
  }
  if (c.cargo === 'depfed' || c.cargo === 'depest') p += 0.08;
  if (oferta === 'cargos') p += 0.1;
  if (ap[alvo]) p *= 0.45;
  var tent = (c.tentativas && c.tentativas[alvo]) || 0;
  p *= Math.pow(0.7, tent);
  return clamp(p, 0.03, 0.9);
}

function negociarApoioEst(jogo, c, alvo, oferta) {
  var a = APOIO_EST_POR_ID[alvo];
  var ap = jogo.est.ufs[c.uf].apoios[chaveApoiosEst(c)] = jogo.est.ufs[c.uf].apoios[chaveApoiosEst(c)] || {};
  if (ap[alvo] === c.id) return { tipo: 'neutro', texto: a.nome + ' já apoia sua candidatura.', sucesso: true };
  var p = chanceApoioEst(jogo, c, alvo, oferta);
  c.tentativas = c.tentativas || {};
  c.tentativas[alvo] = (c.tentativas[alvo] || 0) + 1;
  if (oferta === 'cargos' && chance(0.3)) c.desgaste += 1.5;
  if (rand() >= p) return { tipo: 'ruim', texto: a.nome + ' não fecha apoio a ' + c.urna + '.', sucesso: false };
  var antes = ap[alvo] ? jogo.est.cands[ap[alvo]] : null;
  if (antes) aplicarApoioEst(antes, a, -1);
  ap[alvo] = c.id;
  c.apoios.push(alvo);
  aplicarApoioEst(c, a, 1);
  c.stats.apoiosGanhos++;
  c.imagem += 0.015;
  return { tipo: 'bom', sucesso: true, texto: a.nome + ' declara apoio a ' + c.urna + (antes ? ' e deixa ' + antes.urna + '.' : '.') };
}

/* Efeitos de zona são aplicados no modelo; aqui entram perfis, credibilidade e dinheiro. */
function aplicarApoioEst(c, a, sinal) {
  var ef = a.efeito;
  if (ef.seg) for (var g in ef.seg) c.segAff[g] = (c.segAff[g] || 0) + sinal * ef.seg[g];
  if (ef.cred) for (var t in ef.cred) c.cred[t] = clamp(c.cred[t] + sinal * ef.cred[t], 5, 98);
  if (ef.dinheiro && sinal > 0) { var v = ef.dinheiro * tetoCargo(c.cargo, c.uf, 1); c.dinheiro += v; c.arrecadado += v; }
  if (ef.zona && (c.cargo === 'depfed' || c.cargo === 'depest')) for (var z in ef.zona) c.eps[z] += sinal * ef.zona[z] * 0.6;
}

/* ---------- IA dos candidatos estaduais ---------- */

function valorZona(jogo, c, z) {
  var cache = (c.cargo === 'governador' || c.cargo === 'senador') ? cacheEstadual(jogo, c.uf, c.cargo) : null;
  var p = cache ? (cache.zona[z][c.id] || 1) / 100 : 0.1;
  var peso = z === 'metro' ? FRACAO_METRO[c.uf] : 1 - FRACAO_METRO[c.uf];
  return peso * Math.max(0.03, p * (1 - p)) * (1 - c.presenca[z] / 130) * (0.6 + rand() * 0.8);
}
function melhorZona(jogo, c) { return valorZona(jogo, c, 'metro') > valorZona(jogo, c, 'interior') ? 'metro' : 'interior'; }

function rivalEst(jogo, c) {
  var cands = candsDisputa(jogo, c.uf, c.cargo).filter(function (o) { return o.id !== c.id; });
  if (!cands.length) return null;
  var d = disputa(jogo, c.uf, c.cargo), perc = d.percepcao || {};
  var meu = perc[c.id] || 0;
  cands.sort(function (a, b) { return Math.abs((perc[a.id] || 0) - meu) - Math.abs((perc[b.id] || 0) - meu); });
  return cands[0];
}

function iaAcaoEst(jogo, c) {
  var teto = tetoCargo(c.cargo, c.uf, 1);
  if (c.energia < 28) return { tipo: 'descanso', p: {} };
  if (c.dinheiro < teto * 0.04 && chance(0.7)) return { tipo: 'arrecadar', p: {} };
  var r = rand(), prog = jogo.dia / jogo.cal.eleicao1;
  if ((c.cargo === 'governador' || c.cargo === 'senador')) {
    if ((r -= (c.estilo === 'agressivo' ? 0.12 : 0.05) * (0.5 + prog)) < 0) {
      var alvo = rivalEst(jogo, c);
      if (alvo) return { tipo: 'ataque', p: { alvo: alvo.id, linha: linhaDeAtaque(alvo) } };
    }
    var deb = proximoDebateEst(jogo, c);
    if (deb && deb.dia - jogo.dia <= 6 && c.preparo < 30 && (r -= 0.1) < 0) return { tipo: 'preparar', p: {} };
  }
  if ((r -= 0.04) < 0 && c.palanque) return { tipo: 'presidenciavel', p: {} };
  if ((r -= 0.04) < 0) {
    var ap = APOIOS_EST.filter(function (a) { return chanceApoioEst(jogo, c, a.id, 'programa') > 0.25; });
    if (ap.length) return { tipo: 'apoio', p: { alvo: escolher(ap).id, oferta: chance(0.5) ? 'cargos' : 'programa' } };
  }
  if ((r -= 0.05) < 0 && c.propostas.length < 6) {
    var props = PROPOSTAS_EST.filter(function (p) { return p.cargos.indexOf(c.cargo) >= 0 && c.propostas.indexOf(p.id) < 0 && Math.abs(p.ideo - c.x) < 45; });
    if (props.length) return { tipo: 'proposta', p: { id: escolher(props).id } };
  }
  var z = melhorZona(jogo, c);
  if ((r -= 0.16) < 0) return { tipo: 'visita', p: { zona: z, seg: melhorSegmento(jogo, c) } };
  if ((r -= 0.12) < 0) return { tipo: 'corpo', p: { zona: z } };
  if ((r -= 0.07) < 0) return { tipo: 'radio', p: { zona: z } };
  if ((r -= 0.05) < 0 && c.dinheiro > teto * 0.2) return { tipo: 'digital', p: { tipo: 'impulsionar' } };
  return { tipo: 'comicio', p: { zona: z, tema: melhorTema(jogo, c) } };
}

/* ---------- Início da campanha estadual ---------- */

function fundoEstadual(c) {
  var p = PARTIDO_POR_SIGLA[c.partido];
  var teto = tetoCargo(c.cargo, c.uf, 1);
  var f = c.cargo === 'governador' ? 0.35 + 0.45 * Math.min(1, p.bancada / 60)
    : c.cargo === 'senador' ? 0.25 + 0.4 * Math.min(1, p.bancada / 60)
    : 0.2 + 0.3 * Math.min(1, p.bancada / 60);
  if (c.incumbente || c.apoioGov) f += 0.15;
  return teto * f;
}

function iniciarEstaduais(jogo) {
  var dif = DIFICULDADES[jogo.config.dificuldade];
  for (var id in jogo.est.cands) {
    var cc = jogo.est.cands[id];
    if (!cc.jogador && jogo.partidos[cc.partido]) cc.palanque = jogo.partidos[cc.partido];
  }
  UFS_MAPA.forEach(function (uf) {
    ['governador', 'senador'].forEach(function (cargo) {
      var cands = candsDisputa(jogo, uf, cargo);
      var banc = {}, totB = 0;
      cands.forEach(function (c) {
        var b = c.coligacao.map(function (s) { return PARTIDO_POR_SIGLA[s].bancada; }).sort(function (a, b2) { return b2 - a; }).slice(0, 6).reduce(function (a, x) { return a + x; }, 0);
        banc[c.id] = b; totB += b;
      });
      cands.forEach(function (c) {
        c.tvShare = 0.1 / cands.length + 0.9 * (totB ? banc[c.id] / totB : 1 / cands.length);
        var f = fundoEstadual(c) * (c.jogador ? dif.dinheiro : (0.8 + rand() * 0.4));
        c.fundoTotal = f;
        c.dinheiro = f * 0.7 + (c.dinheiroExtra || 0);
        if (!c.jogador) {
          c.marqueteiro = f > tetoCargo(cargo, uf, 1) * 0.6 ? 'farolEst' : f > tetoCargo(cargo, uf, 1) * 0.35 ? 'local' : 'digitalEst';
          gastar(c, MARQ_EST_POR_ID[c.marqueteiro].fator * tetoCargo(cargo, uf, 1));
        } else {
          var m = MARQ_EST_POR_ID[c.marqueteiro || 'proprio'];
          c.marqueteiro = m.id;
          gastar(c, m.fator * tetoCargo(cargo, uf, 1));
        }
      });
    });
  });
  var j = jogador(jogo);
  if (j && j.escopo === 'estadual' && (j.cargo === 'depfed' || j.cargo === 'depest')) {
    var f2 = fundoEstadual(j) * dif.dinheiro;
    j.fundoTotal = f2;
    j.dinheiro = f2 * 0.7 + (j.dinheiroExtra || 0);
    var m2 = MARQ_EST_POR_ID[j.marqueteiro || 'proprio'];
    j.marqueteiro = m2.id;
    gastar(j, m2.fator * tetoCargo(j.cargo, j.uf, 1));
  }
  invalidarCacheEstadual(jogo);
  UFS_MAPA.forEach(function (uf) { atualizarPercepcaoEstadual(jogo, uf, true); });
  if (j && j.escopo === 'estadual' && (j.cargo === 'governador' || j.cargo === 'senador')) jogo.percInicialJog = percebidoEst(jogo, j);
}

/* ---------- Dinâmica diária ---------- */

function candidatosEstaduaisAtivos(jogo) {
  var lista = [];
  UFS_MAPA.forEach(function (uf) {
    candsDisputa(jogo, uf, 'governador').forEach(function (c) { lista.push(c); });
    if (jogo.fase !== 'campanha2') candsDisputa(jogo, uf, 'senador').forEach(function (c) { lista.push(c); });
  });
  return lista;
}

function processarDiaEstadual(jogo, d) {
  var cal = jogo.cal;
  invalidarCacheEstadual(jogo);
  var j = jogador(jogo);
  var ativos = candidatosEstaduaisAtivos(jogo);
  ativos.forEach(function (c) {
    if (c.jogador) return;
    var nIA = jogo.config.ritmo === 'diario' ? 2 : (chance(5 / 7) ? 1 : 0);
    for (var i = 0; i < nIA; i++) {
      var a = iaAcaoEst(jogo, c);
      var r = executarAcaoEst(jogo, c, a);
      if (r && j && j.escopo === 'estadual' && c.uf === j.uf && c.cargo === j.cargo && (r.tipo !== 'neutro' || a.tipo === 'ataque' || (a.tipo === 'apoio' && r.sucesso)) && chance(0.6)) {
        noticia(jogo, r.texto, '', a.tipo === 'ataque' ? 'ataque' : (r.tipo === 'bom' ? 'adv-bom' : r.tipo === 'ruim' ? 'adv-ruim' : 'campanha'), c.id);
      }
    }
  });
  // horário eleitoral estadual
  var hg = jogo.fase === 'campanha2' ? cal.hgpe2 : cal.hgpe1;
  if (d >= hg[0] && d <= hg[1]) ativos.forEach(function (c) { aplicarHGPEEst(jogo, c); });
  // jogador deputado também envelhece a presença
  var lista = ativos.slice();
  if (j && j.escopo === 'estadual' && lista.indexOf(j) < 0) lista.push(j);
  lista.forEach(function (c) {
    ZONAS.forEach(function (z) { c.presenca[z] *= 0.972; });
    c.imagem *= 0.955; c.desgaste *= 0.975;
    SEG_IDS.forEach(function (g) { c.segTemp[g] *= 0.975; });
    c.energia = Math.min(100, c.energia + 5);
    ZONAS.forEach(function (z) { crescerRecogZ(c, z, 0.0015 * (1 + percebidoEst2(jogo, c) / 15)); });
    var fixo = escalaCustoCargo(c.cargo, c.uf) * 0.1;
    if (c.dinheiro > fixo) gastar(c, fixo);
    if (d === cal.fundo2 && c.fundoTotal) c.dinheiro += c.fundoTotal * 0.3;
  });
  // escândalos nas disputas estaduais
  ativos.forEach(function (c) {
    if (c.jogador || !chance((100 - c.attr.integridade) / 9000)) return;
    c.desgaste += 5 + rand() * 6;
    if (j && j.uf === c.uf || ESTADO_POR_UF[c.uf].eleitores > 10) {
      noticia(jogo, escolher(['Investigação atinge ', 'Denúncia de caixa dois contra ', 'Áudio vazado complica ']) + c.urna + ' (' + nomeCargo(c.cargo, c.genero).toLowerCase() + ', ' + c.uf + ')', '', 'escandalo', c.id);
    }
  });
  // pesquisas estaduais às quartas e sábados
  var dow = diaDaSemana(cal, d);
  if (dow === 3 || (dow === 6 && j && j.escopo === 'estadual')) {
    var ufs = dow === 3 ? UFS_MAPA : [j.uf];
    ufs.forEach(function (uf) { pesquisasEstaduaisDoDia(jogo, uf, d, dow === 3 ? 'census' : 'pulso'); });
  }
}

function aplicarHGPEEst(jogo, c) {
  var m = MARQ_EST_POR_ID[c.marqueteiro] || MARQ_EST_POR_ID.proprio;
  var inv = INVEST_TV[c.tv.invest || 2], mult = 0.7;
  var custo = inv.custo * escalaCustoCargo(c.cargo, c.uf);
  if (podePagarC(jogo, c, custo)) { gastar(c, custo); mult = inv.mult; }
  var pontos = c.tvShare * m.tv * mult;
  ZONAS.forEach(function (z) { crescerRecogZ(c, z, 0.004 + 0.022 * pontos); });
  if (c.tv.estrategia === 'positiva') {
    c.imagem += 0.03 * pontos;
    if (c.tv.tema) c.cred[c.tv.tema] = Math.min(98, c.cred[c.tv.tema] + 0.6 * pontos);
  } else if (c.tv.estrategia === 'ataque' && c.tv.alvo && jogo.est.cands[c.tv.alvo] && jogo.est.cands[c.tv.alvo].ativo) {
    var alvo = jogo.est.cands[c.tv.alvo];
    alvo.desgaste += 0.5 * pontos * (alvo.tv.estrategia === 'defesa' ? 0.5 : 1);
    alvo.stats.ataquesRecebidos[c.id] = (alvo.stats.ataquesRecebidos[c.id] || 0) + 0.15;
    c.desgaste += 0.18 * pontos;
  } else if (c.tv.estrategia === 'defesa') {
    c.desgaste = Math.max(0, c.desgaste - 0.8 * pontos);
  }
}

/* Estratégia de TV da IA estadual, revista a cada rodada. */
function iaEstrategiaTVEst(jogo, c) {
  var alvo = rivalEst(jogo, c);
  var invest = c.dinheiro > tetoCargo(c.cargo, c.uf, 1) * 0.3 ? 3 : 2;
  if (c.desgaste > 18 && chance(0.6)) { c.tv = { estrategia: 'defesa', tema: melhorTema(jogo, c), alvo: null, invest: invest }; return; }
  var pAt = alvo ? (c.estilo === 'agressivo' ? 0.4 : 0.2) + (jogo.fase === 'campanha2' ? 0.15 : 0) : 0;
  if (alvo && chance(pAt)) c.tv = { estrategia: 'ataque', tema: melhorTema(jogo, c), alvo: alvo.id, invest: invest };
  else c.tv = { estrategia: 'positiva', tema: melhorTema(jogo, c), alvo: null, invest: invest };
}

/* ---------- Pesquisas estaduais ---------- */

function pesquisasEstaduaisDoDia(jogo, uf, d, inst) {
  var cargos = jogo.fase === 'campanha2' ? (jogo.govSegundo && jogo.govSegundo.indexOf(uf) >= 0 ? ['governador'] : []) : ['governador', 'senador'];
  cargos.forEach(function (cargo) {
    var base = cacheEstadual(jogo, uf, cargo);
    var r = ruidoPesquisa(base.total, base.ids, { indecisoExtra: 0 }, inst === 'census' ? 1200 : 900);
    var ps = { dia: d, uf: uf, cargo: cargo, instituto: inst, nome: INSTITUTOS[inst].nome, ids: base.ids, res: arredondarPesquisa(r), turno: jogo.fase === 'campanha2' ? 2 : 1 };
    jogo.est.pesqEst.push(ps);
  });
  atualizarPercepcaoEstadual(jogo, uf);
}

function atualizarPercepcaoEstadual(jogo, uf, inicial) {
  ['governador', 'senador'].forEach(function (cargo) {
    var d = disputa(jogo, uf, cargo);
    if (inicial) {
      var base = intencoesEstadual(jogo, uf, cargo, {});
      d.percepcao = {};
      base.ids.forEach(function (id) { d.percepcao[id] = base.total[id]; });
      return;
    }
    var turno = jogo.fase === 'campanha2' ? 2 : 1;
    var lista = jogo.est.pesqEst.filter(function (p) { return p.uf === uf && p.cargo === cargo && p.turno === turno; }).slice(-2);
    if (!lista.length) return;
    var perc = {};
    lista[lista.length - 1].ids.forEach(function (id) {
      var s = 0, n = 0;
      lista.forEach(function (p) { if (p.res[id] !== undefined) { s += p.res[id]; n++; } });
      perc[id] = n ? s / n : 0;
    });
    d.percepcao = perc;
  });
}

function ultimaPesquisaEst(jogo, uf, cargo) {
  var turno = jogo.fase === 'campanha2' ? 2 : 1;
  var l = jogo.est.pesqEst.filter(function (p) { return p.uf === uf && p.cargo === cargo && p.turno === turno; });
  return l[l.length - 1] || null;
}

/* ---------- Debates estaduais (só na disputa do jogador) ---------- */

function debatesEstaduais(jogo, cargo, uf) {
  var cal = jogo.cal;
  if (cargo === 'governador') return [
    { dia: cal.eleicao1 - 30, emissora: emissoraLocal(uf, 0), audiencia: 6, escopo: { cargo: 'governador', uf: uf } },
    { dia: cal.eleicao1 - 6, emissora: emissoraLocal(uf, 2), audiencia: 12, escopo: { cargo: 'governador', uf: uf } },
    { dia: cal.eleicao2 - 5, emissora: emissoraLocal(uf, 1), audiencia: 14, escopo: { cargo: 'governador', uf: uf }, segundo: true }
  ];
  if (cargo === 'senador') return [{ dia: cal.eleicao1 - 15, emissora: emissoraLocal(uf, 1), audiencia: 5, escopo: { cargo: 'senador', uf: uf } }];
  return [];
}

function proximoDebateEst(jogo, c) {
  var l = debatesEstaduais(jogo, c.cargo, c.uf);
  for (var i = 0; i < l.length; i++) if (l[i].dia >= jogo.dia) return l[i];
  return null;
}

function debateEstadualNoDia(jogo, d) {
  var j = jogador(jogo);
  if (!j || j.escopo !== 'estadual' || !j.ativo) return null;
  var l = debatesEstaduais(jogo, j.cargo, j.uf);
  for (var i = 0; i < l.length; i++) if (l[i].dia === d) return l[i];
  return null;
}

/* Principal indicador do desempenho do jogador (pesquisas ou votos projetados). */
function medidaJogador(jogo) {
  var c = jogador(jogo);
  var pct = function (v) { return fmtNum(v, 1) + '%'; };
  if (!c) return { valor: 0, rotulo: '', fmt: pct };
  if (c.escopo !== 'estadual') return { valor: (jogo.percepcao && jogo.percepcao[c.id]) || 0, rotulo: 'Média nas pesquisas', fmt: pct };
  if (c.cargo === 'governador' || c.cargo === 'senador') return { valor: percebidoEst(jogo, c), rotulo: 'Média nas pesquisas', fmt: pct };
  if (!jogo.est.ufs[c.uf].lista) return { valor: 0, rotulo: 'Votos projetados', fmt: fmtVotos, votos: true };
  return { valor: projecaoDeputado(jogo).meus, rotulo: 'Votos projetados (equipe)', fmt: fmtVotos, votos: true };
}

/* ---------- Pré-campanha estadual ---------- */

function opcoesViceGov(jogo) {
  jogo.preOpc = jogo.preOpc || {};
  if (jogo.preOpc.vices) return jogo.preOpc.vices;
  var c = jogador(jogo), e = ESTADO_POR_UF[c.uf];
  var correndo = candsDisputa(jogo, c.uf, 'governador', true).map(function (o) { return o.partido; });
  var parts = PARTIDOS.filter(function (p) { return (p.sigla === c.partido || correndo.indexOf(p.sigla) < 0) && Math.abs(p.ideo - c.x) < 60; });
  var lista = [];
  var perfis = [['exprefeito', 'metro', 'media'], ['produtor', 'interior', 'agro'], ['pastor', 'interior', 'evang'], ['sindicalista', 'metro', 'popular'], ['medico', 'metro', 'media'], ['delegado', 'interior', 'evang'], ['professor', 'metro', 'jovem']];
  embaralhar(perfis).slice(0, 4).forEach(function (pf, i) {
    var sig = i === 0 ? c.partido : escolherPeso(parts, function (p) { return pesoPartidoNoEstado(p, e); }).sigla;
    var pe = gerarPessoa(pf[0]);
    lista.push({ nome: pe.nome, urna: pe.urna, genero: pe.genero, partido: sig, traj: pf[0], zona: pf[1], seg: pf[2], perfil: TRAJ_ESTADUAIS[pf[0]].nome });
  });
  jogo.preOpc.vices = lista;
  return lista;
}

function chancePartidoEst(jogo, c, sigla, oferta) {
  var p = PARTIDO_POR_SIGLA[sigla];
  var dist = Math.abs(p.ideo - c.x);
  var sh = c.cargo === 'governador' || c.cargo === 'senador' ? percebidoEstInicial(jogo, c) : 5;
  var afin = Math.max(0, 1 - dist / 70);
  var ch = (1 - p.fisio) * afin * 0.75 + p.fisio * (clamp(sh / 30, 0, 1.3) * 0.6 + afin * 0.2) + (c.attr.articulacao - 50) / 250;
  if (oferta === 'cargos') ch += 0.08 + p.fisio * 0.15;
  if (oferta === 'pauta') ch += 0.1 * (1 - p.fisio) + 0.05;
  if (oferta === 'vice') ch += 0.2;
  if (jogo.partidos[sigla] && c.palanque && jogo.partidos[sigla] === c.palanque) ch += 0.1;
  var dono = donoPartidoEst(jogo, c, sigla);
  if (dono && dono.id !== c.id) ch *= 0.3;
  return clamp(ch, 0.02, 0.92);
}

function percebidoEstInicial(jogo, c) {
  var r = intencoesEstadual(jogo, c.uf, c.cargo, {});
  return r.total[c.id] || 2;
}

function donoPartidoEst(jogo, c, sigla) {
  var cands = candsDisputa(jogo, c.uf, c.cargo, true);
  for (var i = 0; i < cands.length; i++) if (cands[i].coligacao.indexOf(sigla) >= 0) return cands[i];
  return null;
}

function partidosNegociaveisEst(jogo) {
  var c = jogador(jogo);
  var proprios = candsDisputa(jogo, c.uf, c.cargo, true).map(function (o) { return o.partido; });
  return PARTIDOS.filter(function (p) { return c.coligacao.indexOf(p.sigla) < 0 && proprios.indexOf(p.sigla) < 0; });
}

function negociarPartidoEst(jogo, sigla, oferta) {
  var c = jogador(jogo), p = PARTIDO_POR_SIGLA[sigla];
  var ch = chancePartidoEst(jogo, c, sigla, oferta);
  jogo.negociacoesPre = (jogo.negociacoesPre || 0) + 1;
  if (rand() > ch) return { ok: false, texto: 'O ' + sigla + ' recusa a proposta.' };
  var dono = donoPartidoEst(jogo, c, sigla);
  if (dono) dono.coligacao = dono.coligacao.filter(function (s) { return s !== sigla; });
  c.coligacao.push(sigla);
  if (oferta === 'pauta') c.cred[p.pauta] = Math.min(98, c.cred[p.pauta] + 4);
  if (oferta === 'cargos') c.desgaste += 1;
  return { ok: true, texto: 'O ' + p.nome + ' (' + sigla + ') entra na sua coligação' + (dono ? ', deixando a chapa de ' + dono.urna : '') + '.' };
}

function escolherViceGov(jogo, i) {
  var c = jogador(jogo), v = opcoesViceGov(jogo)[i];
  var msg;
  if (v.partido !== c.partido && c.coligacao.indexOf(v.partido) < 0) {
    if (rand() > chancePartidoEst(jogo, c, v.partido, 'vice')) {
      c.tentativasVice = (c.tentativasVice || 0) + 1;
      return { ok: false, texto: 'O ' + v.partido + ' não aceita indicar ' + v.nome + ' para a vice.' };
    }
    var dono = donoPartidoEst(jogo, c, v.partido);
    if (dono) dono.coligacao = dono.coligacao.filter(function (s) { return s !== v.partido; });
    c.coligacao.push(v.partido);
    msg = 'O ' + v.partido + ' entra na coligação com ' + v.nome + ' na vice.';
  } else msg = v.nome + ' será ' + (v.genero === 'F' ? 'sua vice.' : 'seu vice.');
  c.vice = null;
  c.viceGov = v;
  crescerRecogZ(c, v.zona, 0.12);
  c.segAff[v.seg] = (c.segAff[v.seg] || 0) + 0.05;
  return { ok: true, texto: msg };
}

function opcoesDobrada(jogo) {
  jogo.preOpc = jogo.preOpc || {};
  if (jogo.preOpc.dobras) return jogo.preOpc.dobras;
  var c = jogador(jogo);
  var outro = c.cargo === 'depfed' ? 'depest' : 'depfed';
  var perfis = [['radialista', 'interior', 'popular', 0.22, 'Puxador de votos no interior'], ['pastor', 'metro', 'evang', 0.18, 'Forte entre os evangélicos'],
    ['sindicalista', 'metro', 'popular', 0.15, 'Base nos sindicatos'], ['produtor', 'interior', 'agro', 0.18, 'Liderança do agro'], ['professor', 'metro', 'jovem', 0.14, 'Popular entre os jovens']];
  jogo.preOpc.dobras = embaralhar(perfis).slice(0, 3).map(function (pf) {
    var pe = gerarPessoa(pf[0]);
    return { urna: pe.urna, nome: pe.nome, genero: pe.genero, cargo: outro, cargoNome: nomeCargo(outro, pe.genero), zona: pf[1], seg: pf[2], bonus: pf[3], desc: pf[4] };
  });
  return jogo.preOpc.dobras;
}

function escolherDobrada(jogo, i) {
  var c = jogador(jogo);
  if (i === null) { c.dobrada = null; c.dobradaBonus = 0; return; }
  var d = opcoesDobrada(jogo)[i];
  c.dobrada = d;
  c.dobradaBonus = d.bonus * 0.5;
  c.eps[d.zona] += d.bonus * 0.3;
  c.segAff[d.seg] = (c.segAff[d.seg] || 0) + 0.04;
}

/* Candidato estadual escolhe qual presidenciável apoiar (null = neutro). */
function definirPalanqueJogador(jogo, presId) {
  var c = jogador(jogo);
  var dopartido = jogo.partidos[c.partido];
  c.palanque = presId;
  c.palanqueDissidente = !!(dopartido && presId !== dopartido);
  if (c.palanqueDissidente) c.desgaste += 2;
}
