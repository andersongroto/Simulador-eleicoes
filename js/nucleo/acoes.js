/* Ações de campanha. Os efeitos estão em "escala semanal": no ritmo diário cada ação
 * vale 5/14 de uma ação semanal (são 2 ações por dia contra 5 por semana). */

var SLOTS_SEMANA = 5, SLOTS_DIA = 2;

function escalaRitmo(jogo) { return jogo.config.ritmo === 'diario' ? 5 / 14 : 1; }

function fatorEnergia(c) {
  if (c.energia >= 50) return 1;
  if (c.energia >= 25) return 0.85;
  return 0.65;
}

function efetividade(jogo, c) {
  var dif = DIFICULDADES[jogo.config.dificuldade];
  var m = c.jogador ? dif.jogador : dif.ia;
  return escalaRitmo(jogo) * m * fatorEnergia(c) * (0.85 + rand() * 0.3);
}

function tetoAtual(jogo) { return jogo.fase === 'campanha2' ? TETO_1T + TETO_2T : TETO_1T; }

function podePagar(jogo, c, custo) {
  return c.dinheiro >= custo - 1e-9 && c.gasto + custo <= tetoAtual(jogo) + 1e-9;
}

function gastar(c, v) { c.dinheiro -= v; c.gasto += v; }

function crescerRecog(c, uf, taxa) {
  c.recog[uf] = Math.min(99, c.recog[uf] + (100 - c.recog[uf]) * taxa);
}

function ufsDaRegiao(reg) { return ESTADOS.filter(function (e) { return e.reg === reg; }).map(function (e) { return e.uf; }); }

var NOMES_VISITA = {
  evang: 'Culto em igreja evangélica',
  popular: 'Visita a comunidade da periferia',
  media: 'Encontro com associação comercial',
  agro: 'Feira agropecuária',
  jovem: 'Debate em universidade'
};

var LINHAS_ATAQUE = {
  corrupcao: { nome: 'Corrupção e escândalos', attr: 'integridade' },
  incompetencia: { nome: 'Incompetência na gestão', attr: 'gestao' },
  radicalismo: { nome: 'Radicalismo e extremismo', attr: null },
  promessas: { nome: 'Promessas impossíveis', attr: null }
};

function custoDeslocamento(c, uf) {
  var origem = ESTADO_POR_UF[c.local], destino = ESTADO_POR_UF[uf];
  if (!origem || !destino) return 0.15;
  if (origem.uf === destino.uf) return 0;
  return origem.reg === destino.reg ? 0.08 : 0.18;
}

var ACOES = {
  comicio: {
    nome: 'Comício', cat: 'rua', energia: 12,
    desc: 'Grande ato público num estado. Aumenta muito a presença e o conhecimento local.',
    custo: function (jogo, c, p) { return 0.5 + 0.06 * Math.pow(ESTADO_POR_UF[p.uf].eleitores, 0.7) + custoDeslocamento(c, p.uf); },
    rotulo: function (p) { return 'Comício em ' + ESTADO_POR_UF[p.uf].nome + (p.tema ? ' · ' + TEMAS[p.tema].curto : ''); },
    executar: function (jogo, c, p, ef) {
      var uf = p.uf, e = ESTADO_POR_UF[uf];
      var forca = ef * (0.75 + 0.5 * c.attr.carisma / 100);
      c.presenca[uf] = Math.min(100, c.presenca[uf] + 20 * forca * (1 - c.presenca[uf] / 150));
      crescerRecog(c, uf, 0.09 * forca);
      ufsDaRegiao(e.reg).forEach(function (u) { if (u !== uf) c.presenca[u] = Math.min(100, c.presenca[u] + 3 * forca); });
      if (p.tema) c.cred[p.tema] = Math.min(98, c.cred[p.tema] + 0.8 * forca);
      c.imagem += 0.01 * forca;
      c.local = uf;
      c.stats.comicios++;
      c.stats.estados[uf] = (c.stats.estados[uf] || 0) + 1;
      var r = rand();
      if (r < 0.08 + (c.energia < 25 ? 0.08 : 0)) {
        c.imagem -= 0.035;
        return { tipo: 'ruim', texto: 'Comício esvaziado em ' + e.capital + ': imagens de cadeiras vazias circulam nas redes.' };
      }
      if (r > 0.9 - c.attr.carisma / 1000) {
        c.imagem += 0.04;
        return { tipo: 'bom', texto: 'Multidão lota o comício em ' + e.capital + '. As imagens repercutem em todo o país.' };
      }
      return { tipo: 'neutro', texto: 'Comício em ' + e.capital + ' reúne militância e lideranças locais.' };
    }
  },
  carreata: {
    nome: 'Carreata e caminhada', cat: 'rua', energia: 8,
    desc: 'Corpo a corpo nas ruas. Mais barato que um comício, com apelo popular.',
    custo: function (jogo, c, p) { return 0.25 + 0.02 * Math.pow(ESTADO_POR_UF[p.uf].eleitores, 0.7) + custoDeslocamento(c, p.uf) * 0.7; },
    rotulo: function (p) { return 'Carreata em ' + ESTADO_POR_UF[p.uf].nome; },
    executar: function (jogo, c, p, ef) {
      var uf = p.uf;
      c.presenca[uf] = Math.min(100, c.presenca[uf] + 11 * ef * (1 - c.presenca[uf] / 150));
      crescerRecog(c, uf, 0.045 * ef);
      c.segTemp.popular += 0.012 * ef;
      c.local = uf;
      c.stats.estados[uf] = (c.stats.estados[uf] || 0) + 1;
      return { tipo: 'neutro', texto: 'Carreata percorre bairros de ' + ESTADO_POR_UF[uf].capital + '.' };
    }
  },
  visita: {
    nome: 'Visita a um público', cat: 'rua', energia: 7,
    desc: 'Encontro com um perfil de eleitor (evangélicos, periferia, classe média, agro ou jovens).',
    custo: function (jogo, c, p) { return 0.2 + custoDeslocamento(c, p.uf) * 0.7; },
    rotulo: function (p) { return NOMES_VISITA[p.seg] + ' (' + p.uf + ')'; },
    executar: function (jogo, c, p, ef) {
      var uf = p.uf;
      c.presenca[uf] = Math.min(100, c.presenca[uf] + 7 * ef);
      c.segTemp[p.seg] += 0.045 * ef;
      crescerRecog(c, uf, 0.03 * ef);
      c.local = uf;
      c.stats.estados[uf] = (c.stats.estados[uf] || 0) + 1;
      return { tipo: 'neutro', texto: NOMES_VISITA[p.seg] + ' em ' + ESTADO_POR_UF[uf].nome + ' aproxima a campanha do eleitorado ' + SEGMENTOS[p.seg].curto.toLowerCase() + '.' };
    }
  },
  entrevista: {
    nome: 'Rodada de entrevistas regionais', cat: 'midia', energia: 5,
    desc: 'Rádios, TVs e portais de uma região. Barato e amplia o conhecimento.',
    custo: function () { return 0.1; },
    rotulo: function (p) { return 'Entrevistas no ' + REGIOES[p.reg]; },
    executar: function (jogo, c, p, ef) {
      ufsDaRegiao(p.reg).forEach(function (u) {
        crescerRecog(c, u, 0.05 * ef);
        c.presenca[u] = Math.min(100, c.presenca[u] + 2.5 * ef);
      });
      var rolagem = c.attr.oratoria + randn() * 20 - (c.energia < 25 ? 15 : 0);
      if (rolagem < 22) {
        c.desgaste += 3;
        return { tipo: 'ruim', texto: 'Declaração atrapalhada em entrevista no ' + REGIOES[p.reg] + ' vira meme.' };
      }
      if (rolagem > 88) {
        c.imagem += 0.03;
        return { tipo: 'bom', texto: 'Entrevista no ' + REGIOES[p.reg] + ' tem ótima repercussão.' };
      }
      return { tipo: 'neutro', texto: 'Rodada de entrevistas em emissoras do ' + REGIOES[p.reg] + '.' };
    }
  },
  digital: {
    nome: 'Campanha digital', cat: 'midia', energia: 3,
    desc: 'Impulsionamento pago, lives ou conteúdo para viralizar nas redes.',
    custo: function (jogo, c, p) { return { impulsionar: 1.2, live: 0.05, viral: 0.4 }[p.tipo]; },
    rotulo: function (p) { return { impulsionar: 'Impulsionar conteúdo nas redes', live: 'Live com apoiadores', viral: 'Apostar em conteúdo viral' }[p.tipo]; },
    executar: function (jogo, c, p, ef) {
      var dig = c.marqueteiro ? MARQ_POR_ID[c.marqueteiro].digital : 1;
      if (p.tipo === 'impulsionar') {
        UFS.forEach(function (u) { crescerRecog(c, u, 0.018 * ef * dig); });
        c.segTemp.jovem += 0.03 * ef * dig;
        c.segTemp.media += 0.015 * ef * dig;
        return { tipo: 'neutro', texto: 'Impulsionamento leva os vídeos da campanha a milhões de telas.' };
      }
      if (p.tipo === 'live') {
        c.segTemp.jovem += 0.02 * ef * dig;
        c.imagem += 0.01 * ef;
        if (chance(0.07)) { c.desgaste += 2.5; return { tipo: 'ruim', texto: 'Frase infeliz durante a live é recortada e circula nas redes.' }; }
        return { tipo: 'neutro', texto: 'Live reúne centenas de milhares de apoiadores.' };
      }
      var r = rand() * dig;
      if (r > 0.72) {
        c.imagem += 0.07; c.segTemp.jovem += 0.05;
        UFS.forEach(function (u) { crescerRecog(c, u, 0.025); });
        return { tipo: 'bom', texto: 'Vídeo da campanha viraliza e domina os assuntos mais comentados do dia.' };
      }
      if (r < 0.2) {
        c.desgaste += 4;
        return { tipo: 'ruim', texto: 'Conteúdo da campanha vira piada e gera onda de memes contra ' + c.urna + '.' };
      }
      c.segTemp.jovem += 0.015;
      return { tipo: 'neutro', texto: 'Conteúdo nas redes tem engajamento moderado.' };
    }
  },
  arrecadar: {
    nome: 'Jantar de arrecadação', cat: 'politica', energia: 8,
    desc: 'Encontro com doadores (pessoas físicas). Rende recursos, mas expõe a riscos.',
    custo: function () { return 0; },
    rotulo: function (p) { return 'Arrecadação no ' + REGIOES[p.reg]; },
    executar: function (jogo, c, p, ef) {
      var share = (jogo.percepcao && jogo.percepcao[c.id]) || 3;
      var fReg = { SE: 1.4, S: 1.1, CO: 1.15, NE: 0.8, N: 0.7 }[p.reg] || 1;
      var fIdeo = c.x > 0 ? 1 + c.x / 200 : 1 + c.x / 400;
      var valor = (1.3 + 2.6 * rand()) * (0.6 + share / 25) * fReg * fIdeo * (escalaRitmo(jogo) === 1 ? 1 : 0.6);
      valor = Math.round(valor * 10) / 10;
      c.dinheiro += valor; c.arrecadado += valor;
      if (chance((100 - c.attr.integridade) / 450)) c.suspeitaDoacao = (c.suspeitaDoacao || 0) + valor;
      return { tipo: 'neutro', texto: 'Jantar com empresários no ' + REGIOES[p.reg] + ' arrecada ' + fmtDinheiro(valor) + '.', valor: valor };
    }
  },
  ataque: {
    nome: 'Atacar adversário', cat: 'politica', energia: 5,
    desc: 'Coletiva e peças contra um rival. Desgasta o alvo, mas aumenta sua rejeição.',
    custo: function () { return 0.2; },
    rotulo: function (p, jogo) { return 'Ataque a ' + (jogo ? candPorId(jogo, p.alvo).urna : p.alvo) + ': ' + LINHAS_ATAQUE[p.linha].nome.toLowerCase(); },
    executar: function (jogo, c, p, ef) {
      var alvo = candPorId(jogo, p.alvo);
      var vuln;
      if (p.linha === 'corrupcao') vuln = (110 - alvo.attr.integridade) / 60;
      else if (p.linha === 'incompetencia') vuln = (110 - alvo.attr.gestao) / 60;
      else if (p.linha === 'radicalismo') vuln = (Math.abs(alvo.x) + 10) / 60;
      else vuln = 0.6 + (alvo.stats.fiscal || 0) * 0.12;
      var ataque = ef * vuln * (0.6 + c.attr.oratoria / 100);
      if (alvo.tv && alvo.tv.estrategia === 'defesa') ataque *= 0.7;
      alvo.desgaste += 3.5 * ataque;
      alvo.stats.ataquesRecebidos[c.id] = (alvo.stats.ataquesRecebidos[c.id] || 0) + 1;
      c.desgaste += 1.2 * escalaRitmo(jogo);
      c.stats.ataques++;
      if (chance(0.13)) {
        c.desgaste += 3;
        return { tipo: 'ruim', texto: 'Ataque de ' + c.urna + ' a ' + alvo.urna + ' é visto como baixaria e repercute mal.' };
      }
      return { tipo: ataque > 1 ? 'bom' : 'neutro', texto: c.urna + ' ataca ' + alvo.urna + ' (' + LINHAS_ATAQUE[p.linha].nome.toLowerCase() + ').' };
    }
  },
  apoio: {
    nome: 'Negociar apoio', cat: 'politica', energia: 6,
    desc: 'Reunião para conquistar o apoio de um governador ou de um setor organizado.',
    custo: function (jogo, c, p) {
      if (p.alvo.indexOf('gov:') === 0) return 0;
      return APOIO_POR_ID[p.alvo].custo || 0;
    },
    rotulo: function (p) {
      if (p.alvo.indexOf('gov:') === 0) return 'Apoio do governador (' + p.alvo.slice(4) + ')';
      return 'Apoio: ' + APOIO_POR_ID[p.alvo].curto;
    },
    executar: function (jogo, c, p, ef) { return negociarApoio(jogo, c, p.alvo, p.oferta || 'programa'); }
  },
  proposta: {
    nome: 'Lançar proposta', cat: 'estrategia', energia: 3,
    desc: 'Anunciar uma proposta do programa de governo para conquistar um público.',
    custo: function () { return 0.1; },
    rotulo: function (p) { return 'Proposta: ' + PROPOSTA_POR_ID[p.id].nome; },
    executar: function (jogo, c, p, ef) { return lancarProposta(jogo, c, PROPOSTA_POR_ID[p.id]); }
  },
  preparar: {
    nome: 'Preparação para debate', cat: 'estrategia', energia: 6,
    desc: 'Simulações com a equipe. Melhora o desempenho no próximo debate.',
    custo: function () { return 0.05; },
    rotulo: function () { return 'Preparação para o debate'; },
    executar: function (jogo, c, p, ef) {
      c.preparo = Math.min(60, c.preparo + 25 * Math.min(1, ef / escalaRitmo(jogo)) * (jogo.config.ritmo === 'diario' ? 0.6 : 1));
      return { tipo: 'neutro', texto: 'Equipe simula perguntas e réplicas para o próximo debate.' };
    }
  },
  descanso: {
    nome: 'Descanso', cat: 'estrategia', energia: -30,
    desc: 'Agenda reduzida para recuperar energia. Candidato cansado erra mais.',
    custo: function () { return 0; },
    rotulo: function () { return 'Descanso e agenda interna'; },
    executar: function (jogo, c) { return { tipo: 'neutro', texto: 'Agenda reduzida para recuperar as forças.' }; }
  }
};

var MARQ_POR_ID = {};
MARQUETEIROS.forEach(function (m) { MARQ_POR_ID[m.id] = m; });

/* Executa uma ação para um candidato. Retorna o resultado (texto e tipo) ou null se inviável. */
function executarAcao(jogo, c, acao) {
  var def = ACOES[acao.tipo];
  if (!def) return null;
  var custo = def.custo(jogo, c, acao.p || {});
  if (!podePagar(jogo, c, custo)) {
    return { tipo: 'ruim', texto: 'Sem recursos para: ' + def.rotulo(acao.p || {}, jogo) + '.', falhou: true };
  }
  gastar(c, custo);
  var esc = escalaRitmo(jogo);
  if (def.energia > 0) c.energia = Math.max(0, c.energia - def.energia * esc);
  else c.energia = Math.min(100, c.energia - def.energia * esc);
  var ef = efetividade(jogo, c);
  var r = def.executar(jogo, c, acao.p || {}, ef) || { tipo: 'neutro', texto: '' };
  r.custo = custo;
  return r;
}

/* ---------- Apoios ---------- */

function partidoNaColigacaoDeOutro(jogo, sigla, cid) {
  var dono = jogo.partidos[sigla];
  return dono && dono !== cid;
}

function chanceApoio(jogo, c, alvo, oferta) {
  var art = c.attr.articulacao;
  var share = (jogo.percepcao && jogo.percepcao[c.id]) || 3;
  var p;
  if (alvo.indexOf('gov:') === 0) {
    var uf = alvo.slice(4), gv = jogo.governadores[uf];
    if (!gv) return 0;
    if (gv.apoio === c.id) return 0;
    var part = PARTIDO_POR_SIGLA[gv.partido];
    var dist = Math.abs(part.ideo - c.x);
    var shareUF = (jogo._cache && jogo._cache.uf[uf] && jogo._cache.uf[uf][c.id]) || share;
    p = 0.38 - dist / 260 + (shareUF - 18) / 110 + (art - 50) / 220;
    if (oferta === 'cargos') p += 0.06 + part.fisio * 0.12;
    if (partidoNaColigacaoDeOutro(jogo, gv.partido, c.id)) p *= 0.3;
    else if (gv.apoio) p *= 0.6;
  } else {
    var a = APOIO_POR_ID[alvo];
    if (jogo.apoios[a.id] === c.id) return 0;
    if (a.req.ideoMin !== undefined && c.x < a.req.ideoMin) return 0;
    if (a.req.ideoMax !== undefined && c.x > a.req.ideoMax) return 0;
    if (a.req.viab !== undefined && share < a.req.viab) return 0;
    p = 0.58 - a.dif * 0.38 + (share - 12) / 120 + (art - 50) / 220;
    if (oferta === 'cargos') p += 0.1;
    else p += 0.04;
    if (jogo.apoios[a.id]) p *= 0.45;
  }
  var tent = (c.tentativas && c.tentativas[alvo]) || 0;
  p *= Math.pow(0.7, tent);
  return clamp(p, 0.03, 0.9);
}

function negociarApoio(jogo, c, alvo, oferta) {
  if (alvo.indexOf('gov:') === 0 ? (jogo.governadores[alvo.slice(4)] || {}).apoio === c.id : jogo.apoios[alvo] === c.id) {
    return { tipo: 'neutro', texto: 'O apoio já estava garantido; a reunião serviu para alinhar a agenda.', sucesso: true };
  }
  var p = chanceApoio(jogo, c, alvo, oferta);
  c.tentativas = c.tentativas || {};
  c.tentativas[alvo] = (c.tentativas[alvo] || 0) + 1;
  var ok = rand() < p;
  var custoImagem = oferta === 'cargos' && chance(0.3);
  if (custoImagem) c.desgaste += 2;
  if (alvo.indexOf('gov:') === 0) {
    var uf = alvo.slice(4), gv = jogo.governadores[uf];
    if (!ok) return { tipo: 'ruim', texto: 'Governador(a) ' + gv.nome + ' (' + uf + ') decide não subir no palanque de ' + c.urna + ' por enquanto.', sucesso: false };
    var traicao = partidoNaColigacaoDeOutro(jogo, gv.partido, c.id);
    gv.apoio = c.id; gv.fixo = true;
    c.stats.apoiosGanhos++;
    c.imagem += 0.02;
    return { tipo: 'bom', sucesso: true,
      texto: 'Governador(a) ' + gv.nome + ' (' + gv.partido + '-' + uf + ') declara apoio a ' + c.urna + (traicao ? ', contrariando o próprio partido.' : '.') +
        (custoImagem ? ' A imprensa fala em troca de cargos.' : '') };
  }
  var a = APOIO_POR_ID[alvo];
  if (!ok) return { tipo: 'ruim', texto: a.nome + ' não fecha apoio a ' + c.urna + '.', sucesso: false };
  var tinha = jogo.apoios[a.id] ? candPorId(jogo, jogo.apoios[a.id]) : null;
  concederApoio(jogo, c, a);
  c.imagem += 0.02;
  return { tipo: 'bom', sucesso: true,
    texto: a.nome + ' anuncia apoio a ' + c.urna + (tinha ? ' e abandona ' + tinha.urna + '.' : '.') + (custoImagem ? ' Críticos falam em toma lá, dá cá.' : '') };
}

/* ---------- Propostas ---------- */

function lancarProposta(jogo, c, prop) {
  if (c.propostas.indexOf(prop.id) >= 0) return { tipo: 'neutro', texto: 'Proposta já anunciada.', falhou: true };
  c.propostas.push(prop.id);
  c.stats.propostas++;
  var dist = Math.abs(prop.ideo - c.x);
  var mult = 1.15 - dist / 140;
  var incoerente = dist > 75;
  if (incoerente) mult = 0.35;
  var g, t;
  for (g in prop.seg) {
    var v = prop.seg[g];
    c.segAff[g] = (c.segAff[g] || 0) + (v > 0 ? v * mult : v);
  }
  for (t in prop.cred) c.cred[t] = clamp(c.cred[t] + prop.cred[t] * Math.max(0.3, mult), 5, 98);
  if (prop.fiscal > 0) { c.stats.fiscal = (c.stats.fiscal || 0) + prop.fiscal; if (c.stats.fiscal > 4) c.cred.economia = Math.max(5, c.cred.economia - prop.fiscal); }
  c.imagem += 0.02;
  // propostas puxam levemente a posição percebida do candidato
  c.x = clamp(c.x + (prop.ideo - c.x) * 0.03, -100, 100);
  if (incoerente) {
    c.desgaste += 3;
    return { tipo: 'ruim', texto: c.urna + ' anuncia "' + prop.nome + '". Adversários acusam oportunismo: a proposta contradiz sua trajetória.' };
  }
  return { tipo: 'bom', texto: c.urna + ' anuncia: ' + prop.nome + '. "' + prop.texto + '"' };
}
