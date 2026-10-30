/* Disputas estaduais: governador (dois turnos) e Senado (uma ou duas vagas).
 *
 * Cada estado é dividido em duas zonas (capital/região metropolitana e interior), cada uma
 * com sua composição de perfis de eleitor. A utilidade de um candidato numa célula soma os
 * mesmos fatores da disputa presidencial e o "voto casado": eleitores que votam num
 * presidenciável tendem a votar no candidato do palanque dele. */

var PARAM_E = {
  K_IDEO: 2.2, K_ISS: 0.8, K_REC: 0.8, K_PRES: 0.8, K_CAR: 0.3, K_DESG: 1.3,
  K_INC: 1.2,        // governador candidato à reeleição: aprovação conta muito
  K_SUC: 0.5,        // sucessor apoiado pelo governador
  K_COAT: 1.4,       // voto casado com o presidenciável
  K_OFICIAL: 0.1,    // palanque oficial do presidenciável no estado
  K_CAP: 0.24, K_EPS: 0.2,
  C_NONE_GOV: -1.9, C_NONE_SEN: -1.3, C_UND0: -0.4, C_UND1: -2.1,
  VIAB0: 0.06, VIAB1: 0.4
};

var CELULAS_EST = {};
function celulasEstado(uf) {
  if (CELULAS_EST[uf]) return CELULAS_EST[uf];
  var e = ESTADO_POR_UF[uf], m = FRACAO_METRO[uf];
  var lo = 0, hi = 20, k = 1;
  for (var it = 0; it < 50; it++) {
    k = (lo + hi) / 2;
    var s = 0;
    SEG_IDS.forEach(function (g) { s += e.seg[g] * Math.min(1, SEGMENTOS[g].urbano * k); });
    if (s > m) hi = k; else lo = k;
  }
  var zonaSeg = { metro: {}, interior: {} };
  SEG_IDS.forEach(function (g) {
    zonaSeg.metro[g] = e.seg[g] * Math.min(1, SEGMENTOS[g].urbano * k);
    zonaSeg.interior[g] = e.seg[g] - zonaSeg.metro[g];
  });
  var cel = [];
  ZONAS.forEach(function (z) {
    SEG_IDS.forEach(function (g) {
      for (var b = 0; b < BINS_Z.length; b++) {
        cel.push({ z: z, g: g, b: b, x: clamp(e.segMedia[g] + BINS_Z[b] * PARAM.BIN_SD, -100, 100), w: zonaSeg[z][g] * BINS_W[b] });
      }
    });
  });
  cel.zonaSeg = zonaSeg;
  cel.zonaPeso = { metro: soma(SEG_IDS.map(function (g) { return zonaSeg.metro[g]; })), interior: soma(SEG_IDS.map(function (g) { return zonaSeg.interior[g]; })) };
  CELULAS_EST[uf] = cel;
  return cel;
}

/* ---------- Geração das candidaturas ---------- */

function presidenciaveisPrincipais(jogo, n) {
  var r = jogo._cache || calcularIntencoes(jogo, { dia: 0 });
  return ordenarPor(r.nac, r.ids).slice(0, n || 2).map(function (id) { return candPorId(jogo, id); });
}

function pesoPartidoNoEstado(p, e) {
  return (p.forca[e.reg] || 0.1) * (0.25 + Math.min(1.2, p.bancada / 55)) * Math.exp(-Math.abs(p.ideo - e.lean) / 70);
}

function escolherPartido(e, usados, filtro) {
  var ops = PARTIDOS.filter(function (p) { return usados.indexOf(p.sigla) < 0 && (!filtro || filtro(p)); });
  if (!ops.length) return null;
  return escolherPeso(ops, function (p) { return pesoPartidoNoEstado(p, e) * (p.sigla === 'PCR' ? 0.15 : 1); }).sigla;
}

var TRAJ_POR_CARGO = {
  governador: ['exprefeito', 'exprefeito', 'senador', 'deputado', 'vicegov', 'secretario', 'empresario', 'delegado'],
  senador: ['deputado', 'deputado', 'exprefeito', 'empresario', 'delegado', 'pastor', 'radialista', 'atleta', 'medico', 'sindicalista', 'militar'],
  depfed: ['depestadual', 'depestadual', 'pastor', 'delegado', 'radialista', 'medico', 'professor', 'sindicalista', 'empresario', 'produtor', 'militar', 'atleta', 'ativista', 'secretario'],
  depest: ['pastor', 'delegado', 'radialista', 'medico', 'professor', 'sindicalista', 'empresario', 'produtor', 'militar', 'ativista', 'secretario']
};

function credInicial(x, attr, extra) {
  var cred = {};
  TEMA_IDS.forEach(function (t) {
    var base = 45 + randn() * 6;
    if (t === 'social') base += -x * 0.25;
    if (t === 'ambiente') base += -x * 0.22;
    if (t === 'seguranca') base += x * 0.22;
    if (t === 'costumes') base += x * 0.3;
    if (t === 'economia') base += x * 0.08 + (attr.gestao - 50) * 0.25;
    if (t === 'saude' || t === 'educacao') base += (attr.gestao - 50) * 0.2;
    if (t === 'corrupcao') base += (attr.integridade - 50) * 0.3;
    cred[t] = clamp(base + ((extra && extra[t]) || 0), 8, 95);
  });
  return cred;
}

function numeroCandidato(jogo, cargo, partido, uf) {
  var p = PARTIDO_POR_SIGLA[partido];
  if (cargo === 'governador') return String(p.numero);
  var usados = jogo.est.numeros[uf + cargo] = jogo.est.numeros[uf + cargo] || {};
  var dig = cargo === 'senador' ? 1 : (cargo === 'depfed' ? 2 : 3);
  var n;
  do { n = String(p.numero) + String(randInt(dig === 1 ? 1 : Math.pow(10, dig - 1), Math.pow(10, dig) - 1)); } while (usados[n]);
  usados[n] = true;
  return n;
}

/* Cria um candidato estadual. opts: { traj, pessoa, incumbente, apoioGov, recog, jogador, id } */
function criarCandEst(jogo, uf, cargo, partido, opts) {
  opts = opts || {};
  var e = ESTADO_POR_UF[uf], p = PARTIDO_POR_SIGLA[partido];
  var traj = opts.traj || escolher(TRAJ_POR_CARGO[cargo]);
  var t = TRAJ_ESTADUAIS[traj] || { cred: {}, recog: 10, seg: {}, nome: traj };
  var pessoa = opts.pessoa || gerarPessoa(traj);
  var attr = opts.attr || {
    carisma: clamp(Math.round(50 + randn() * 13), 20, 92), oratoria: clamp(Math.round(50 + randn() * 13), 20, 92),
    gestao: clamp(Math.round(50 + randn() * 13 + (opts.incumbente ? 10 : 0)), 20, 92), articulacao: clamp(Math.round(50 + randn() * 13), 20, 92),
    integridade: clamp(Math.round(58 + randn() * 15), 15, 95)
  };
  var x = opts.x !== undefined ? opts.x : clamp(p.ideo + randn() * 11, -100, 100);
  var recog = opts.recog !== undefined ? opts.recog : clamp(t.recog + 9 * Math.log(1 + p.bancada / 10) + (cargo === 'governador' ? 12 : cargo === 'senador' ? 6 : 0) + randn() * 6, 3, 85);
  var id = opts.id || (cargo.slice(0, 3) + '-' + uf + '-' + (jogo.est.seq++));
  var c = {
    id: id, escopo: 'estadual', cargo: cargo, uf: uf, nome: pessoa.nome, urna: pessoa.urna, genero: pessoa.genero, idade: pessoa.idade,
    partido: partido, numero: numeroCandidato(jogo, cargo, partido, uf), trajetoria: traj,
    bio: (opts.incumbente ? (pessoa.genero === 'F' ? 'Governadora' : 'Governador') + ' do estado, candidat' + (pessoa.genero === 'F' ? 'a' : 'o') + ' à reeleição' : maiuscula(t.nome)) + ' (' + partido + ').',
    x: x, base: 0, attr: attr, cred: credInicial(x, attr, t.cred), segAff: {}, segTemp: {},
    recog: { metro: clamp(recog * (traj === 'exprefeito' ? 1.35 : 1.08), 2, 97), interior: clamp(recog * (traj === 'produtor' ? 1.2 : 0.92), 2, 97) },
    presenca: { metro: 0, interior: 0 }, eps: { metro: randn() * PARAM_E.K_EPS, interior: randn() * PARAM_E.K_EPS },
    imagem: 0, desgaste: 0, situacao: false, incumbente: !!opts.incumbente, apoioGov: !!opts.apoioGov,
    coligacao: [partido], palanque: jogo.partidos[partido] || null, palanqueOficial: false,
    dinheiro: 0, gasto: 0, arrecadado: 0, energia: 100,
    tv: { estrategia: 'positiva', tema: null, alvo: null, invest: 2 }, tvShare: 0,
    marqueteiro: 'local', preparo: 0, apoios: [], propostas: [], cor: 1, jogador: !!opts.jogador, ativo: true,
    estilo: escolher(['propositivo', 'propositivo', 'agressivo', 'regional']), local: 'metro',
    stats: { comicios: 0, ataques: 0, ataquesRecebidos: {}, debates: [], estados: {}, propostas: 0, apoiosGanhos: 0, eventos: 0 },
    bandeiras: []
  };
  SEG_IDS.forEach(function (g) { c.segAff[g] = (t.seg && t.seg[g]) || 0; c.segTemp[g] = 0; });
  c.tv.tema = TEMA_IDS.slice().sort(function (a, b) { return c.cred[b] - c.cred[a]; })[0];
  jogo.est.cands[id] = c;
  return c;
}

function gerarGovernadores(jogo, uf) {
  var e = ESTADO_POR_UF[uf], gov = jogo.governadores[uf];
  var n = e.eleitores > 8 ? randInt(5, 6) : e.eleitores > 3 ? randInt(4, 5) : randInt(3, 4);
  var usados = [], cands = [];
  var reeleicao = chance(0.55);
  if (reeleicao) {
    var nm = gov.nome.split(' ');
    cands.push(criarCandEst(jogo, uf, 'governador', gov.partido, {
      incumbente: true, traj: 'vicegov', recog: 86 + randn() * 4,
      pessoa: { nome: gov.nome, urna: nm.length > 1 ? nm[0] + ' ' + nm[nm.length - 1] : gov.nome, genero: /a$/.test(nm[0]) && nm[0] !== 'Luca' ? 'F' : 'M', idade: randInt(45, 66) }
    }));
  } else {
    cands.push(criarCandEst(jogo, uf, 'governador', gov.partido, { apoioGov: true, traj: escolher(['vicegov', 'secretario', 'exprefeito', 'deputado']) }));
  }
  usados.push(gov.partido);
  // palanques dos dois principais presidenciáveis
  presidenciaveisPrincipais(jogo, 2).forEach(function (pres) {
    if (!pres) return;
    if (cands.some(function (c) { return pres.coligacao.indexOf(c.partido) >= 0; })) return;
    var sig = escolherPartido(e, usados, function (p) { return pres.coligacao.indexOf(p.sigla) >= 0; });
    if (!sig) return;
    usados.push(sig);
    cands.push(criarCandEst(jogo, uf, 'governador', sig, {}));
  });
  while (cands.length < n) {
    var s = escolherPartido(e, usados);
    if (!s) break;
    usados.push(s);
    cands.push(criarCandEst(jogo, uf, 'governador', s, {}));
  }
  return cands;
}

function gerarSenado(jogo, uf) {
  var e = ESTADO_POR_UF[uf];
  var n = e.eleitores > 8 ? randInt(6, 8) : e.eleitores > 3 ? randInt(5, 6) : randInt(4, 5);
  var usados = [], cands = [];
  if (chance(0.45)) {
    var s0 = escolherPartido(e, usados, function (p) { return p.bancada >= 14; });
    usados.push(s0);
    cands.push(criarCandEst(jogo, uf, 'senador', s0, { traj: 'senador', recog: 55 + randn() * 8 }));
  }
  presidenciaveisPrincipais(jogo, 2).forEach(function (pres) {
    if (!pres) return;
    if (cands.some(function (c) { return pres.coligacao.indexOf(c.partido) >= 0; })) return;
    var sig = escolherPartido(e, usados, function (p) { return pres.coligacao.indexOf(p.sigla) >= 0; });
    if (!sig) return;
    usados.push(sig);
    cands.push(criarCandEst(jogo, uf, 'senador', sig, {}));
  });
  while (cands.length < n) {
    var s = escolherPartido(e, usados);
    if (!s) break;
    usados.push(s);
    cands.push(criarCandEst(jogo, uf, 'senador', s, {}));
  }
  return cands;
}

/* Partidos sem candidato próprio a governador entram na coligação de algum candidato. */
function montarColigacoesEstaduais(jogo, uf) {
  var d = jogo.est.ufs[uf];
  var govs = d.gov.ids.map(function (id) { return jogo.est.cands[id]; });
  var e = ESTADO_POR_UF[uf];
  PARTIDOS.forEach(function (p) {
    if (govs.some(function (c) { return c.partido === p.sigla; })) return;
    var palanqueNac = jogo.partidos[p.sigla];
    var melhor = null, mv = 0;
    govs.forEach(function (c) {
      var v = Math.max(0, 1 - Math.abs(p.ideo - c.x) / 70) * (1 - p.fisio) + p.fisio * (c.incumbente ? 0.8 : 0.35) * (0.5 + c.recog.metro / 100);
      if (palanqueNac && c.palanque === palanqueNac) v += 0.6;
      v *= 0.7 + rand() * 0.6;
      if (v > mv) { mv = v; melhor = c; }
    });
    if (melhor && mv > 0.3 && !melhor.jogador) melhor.coligacao.push(p.sigla);
  });
}

/* Senadores que não estão em disputa (mandato até a próxima eleição). */
function gerarSenadoContinuidade(jogo) {
  var restantes = 81 - 27 * jogo.est.vagasSen;
  var pesos = PARTIDOS.map(function (p) { return Math.max(0.2, p.bancada); });
  var tot = soma(pesos), res = {}, alocados = 0;
  PARTIDOS.forEach(function (p, i) { res[p.sigla] = Math.floor(restantes * pesos[i] / tot); alocados += res[p.sigla]; });
  while (alocados < restantes) { var p = escolherPeso(PARTIDOS, function (pp) { return pp.bancada; }); res[p.sigla]++; alocados++; }
  return res;
}

function gerarEleicoesEstaduais(jogo) {
  jogo.est = { ufs: {}, cands: {}, seq: 1, numeros: {}, vagasSen: vagasSenado(jogo.cal.ano), pesqEst: [] };
  jogo.est.senadoContinua = gerarSenadoContinuidade(jogo);
  UFS_MAPA.forEach(function (uf) {
    var gov = gerarGovernadores(jogo, uf);
    var sen = gerarSenado(jogo, uf);
    var cap = gerarPessoa(escolher(['exprefeito', 'empresario', 'medico']));
    jogo.est.ufs[uf] = {
      gov: { ids: gov.map(function (c) { return c.id; }), percepcao: null },
      sen: { ids: sen.map(function (c) { return c.id; }), percepcao: null, vagas: jogo.est.vagasSen },
      prefeito: { nome: cap.nome, partido: escolherPartido(ESTADO_POR_UF[uf], []) },
      apoios: { governador: {}, senador: {} },
      prop: { eps: {}, puxador: {} }
    };
    montarColigacoesEstaduais(jogo, uf);
    coresDisputa(jogo, jogo.est.ufs[uf].gov.ids);
    coresDisputa(jogo, jogo.est.ufs[uf].sen.ids);
    PARTIDOS.forEach(function (p) {
      jogo.est.ufs[uf].prop.eps[p.sigla] = { depfed: randn() * 0.3, depest: randn() * 0.3 };
      jogo.est.ufs[uf].prop.puxador[p.sigla] = { depfed: chance(p.bancada > 30 ? 0.1 : 0.03) ? 0.25 + rand() * 0.3 : 0, depest: chance(0.05) ? 0.2 + rand() * 0.2 : 0 };
    });
  });
}

/* Cores fixas por candidato dentro de cada disputa (ordem da força inicial). */
function coresDisputa(jogo, ids) {
  var ord = ids.slice().sort(function (a, b) {
    var ca = jogo.est.cands[a], cb = jogo.est.cands[b];
    return (cb.recog.metro + cb.recog.interior + (cb.incumbente ? 60 : 0)) - (ca.recog.metro + ca.recog.interior + (ca.incumbente ? 60 : 0));
  });
  ord.forEach(function (id, i) { jogo.est.cands[id].cor = (i % 8) + 1; });
}

function candsDisputa(jogo, uf, cargo, todos) {
  var d = jogo.est.ufs[uf][cargo === 'governador' ? 'gov' : 'sen'];
  return d.ids.map(function (id) { return jogo.est.cands[id]; }).filter(function (c) { return todos || c.ativo; });
}
function disputa(jogo, uf, cargo) { return jogo.est.ufs[uf][cargo === 'governador' ? 'gov' : 'sen']; }

/* ---------- Modelo de voto ---------- */

function aprovacaoGovernador(jogo, uf) { return jogo.governadores[uf] ? jogo.governadores[uf].aprov : 50; }

function capilaridadeEst(c, reg) {
  var s = 0;
  c.coligacao.forEach(function (sig) {
    var p = PARTIDO_POR_SIGLA[sig];
    if (p) s += (p.forca[reg] || 0) * Math.min(1, p.bancada / 50 + 0.1);
  });
  return PARAM_E.K_CAP * Math.sqrt(s);
}

/* opts.modo: 'pesquisa' | 'urna' | 'segundo'; opts.erro: { id: deslocamento } */
function intencoesEstadual(jogo, uf, cargo, opts) {
  opts = opts || {};
  var modo = opts.modo || 'pesquisa';
  var dia = opts.dia === undefined ? jogo.dia : opts.dia;
  var cel = celulasEstado(uf);
  var e = ESTADO_POR_UF[uf];
  var d = disputa(jogo, uf, cargo);
  var cands = opts.ids ? opts.ids.map(function (id) { return jogo.est.cands[id]; }) : candsDisputa(jogo, uf, cargo);
  var ids = cands.map(function (c) { return c.id; });
  var n = cands.length;
  var presSeg = jogo._cache && jogo._cache.seg ? jogo._cache.seg[uf] : null;
  var aprov = aprovacaoGovernador(jogo, uf);
  var prog = clamp(dia / jogo.cal.eleicao1, 0, 1);
  var viab = (modo === 'segundo' || n <= 2) ? 0 : lerp(PARAM_E.VIAB0, PARAM_E.VIAB1, Math.pow(prog, 1.4)) + (modo === 'urna' ? 0.05 : 0);
  var apoios = jogo.est.ufs[uf].apoios[cargo] || {};
  var transf = cargo === 'governador' && jogo.est.transf && jogo.est.transf[uf] && jogo.resEst1 && n === 2 ? jogo.est.transf[uf] : null;
  var base = cands.map(function (c) {
    var r = { seg: {}, zona: {} };
    SEG_IDS.forEach(function (g) {
      var v = termoTemas(jogo, c, g) + (c.segAff[g] || 0) + (c.segTemp[g] || 0);
      if (transf && transf[c.id]) transf[c.id].forEach(function (el) { v += PARAM.K_TRANSF * (jogo.resEst1.gov[uf].seg[g][el] || 0) / 100; });
      v += c.imagem - PARAM_E.K_DESG * c.desgaste / 100 + PARAM_E.K_CAR * (c.attr.carisma - 50) / 50;
      r.seg[g] = v;
    });
    var fixo = capilaridadeEst(c, e.reg);
    if (c.incumbente) fixo += 0.25 + PARAM_E.K_INC * (aprov - 47) / 30;
    if (c.apoioGov) fixo += PARAM_E.K_SUC * (aprov - 47) / 30 + 0.12;
    if (c.palanqueOficial) fixo += PARAM_E.K_OFICIAL;
    if (viab) {
      var pc = d.percepcao && d.percepcao[c.id] !== undefined ? d.percepcao[c.id] : 100 / n;
      fixo += viab * Math.log((pc + 1.5) / 30);
    }
    if (opts.erro && opts.erro[c.id]) fixo += opts.erro[c.id];
    ZONAS.forEach(function (z) {
      var v = PARAM_E.K_REC * Math.log(Math.max(1, c.recog[z]) / 100) + PARAM_E.K_PRES * c.presenca[z] / 100 + c.eps[z];
      for (var aid in apoios) {
        if (apoios[aid] !== c.id) continue;
        var a = APOIO_EST_POR_ID[aid];
        if (a && a.efeito.zona && a.efeito.zona[z]) v += a.efeito.zona[z];
      }
      r.zona[z] = v + fixo;
    });
    return r;
  });
  var uNone = cargo === 'senador' ? PARAM_E.C_NONE_SEN : PARAM_E.C_NONE_GOV;
  if (modo === 'segundo') uNone += 0.2;
  var uUnd = modo === 'pesquisa' ? lerp(PARAM_E.C_UND0, PARAM_E.C_UND1, prog) : null;
  if (modo === 'pesquisa' && dia > jogo.cal.eleicao1) uUnd = PARAM_E.C_UND1 - 0.2;

  var acc = { nenhum: 0, indeciso: 0 }, zon = { metro: { nenhum: 0 }, interior: { nenhum: 0 } }, seg = {};
  ids.forEach(function (id) { acc[id] = 0; zon.metro[id] = 0; zon.interior[id] = 0; });
  SEG_IDS.forEach(function (g) { seg[g] = {}; ids.forEach(function (id) { seg[g][id] = 0; }); });
  var segPeso = {};
  SEG_IDS.forEach(function (g) { segPeso[g] = 0; });
  var ex = new Array(n);
  for (var i = 0; i < cel.length; i++) {
    var cc = cel[i];
    var tot = Math.exp(uNone) + (uUnd !== null ? Math.exp(uUnd) : 0);
    for (var k = 0; k < n; k++) {
      var c = cands[k];
      var dx = (c.x - cc.x) / 100;
      var u = base[k].seg[cc.g] + base[k].zona[cc.z] - PARAM_E.K_IDEO * dx * dx;
      if (presSeg && c.palanque && presSeg[cc.g] && presSeg[cc.g][c.palanque] !== undefined) u += PARAM_E.K_COAT * presSeg[cc.g][c.palanque];
      ex[k] = Math.exp(u);
      tot += ex[k];
    }
    var pNone = Math.exp(uNone) / tot;
    var probs = ex.map(function (v) { return v / tot; });
    var votos = probs;
    if (cargo === 'senador' && d.vagas === 2) {
      // segundo voto: o eleitor escolhe outro candidato (independência de alternativas irrelevantes)
      votos = probs.map(function (pi, a) {
        var q = 0;
        for (var b = 0; b < n; b++) if (b !== a) q += probs[b] * pi / Math.max(0.02, 1 - probs[b]);
        return (pi + q) / 2;
      });
      pNone = 1 - soma(votos) - (uUnd !== null ? Math.exp(uUnd) / tot : 0);
    }
    acc.nenhum += cc.w * pNone;
    zon[cc.z].nenhum += cc.w * pNone;
    if (uUnd !== null) acc.indeciso += cc.w * Math.exp(uUnd) / tot;
    for (k = 0; k < n; k++) {
      acc[ids[k]] += cc.w * votos[k];
      zon[cc.z][ids[k]] += cc.w * votos[k];
      seg[cc.g][ids[k]] += cc.w * votos[k];
    }
    segPeso[cc.g] += cc.w;
  }
  var res = { uf: uf, cargo: cargo, ids: ids, total: {}, zona: { metro: {}, interior: {} }, seg: {} };
  for (var key in acc) res.total[key] = acc[key] * 100;
  ZONAS.forEach(function (z) {
    var w = cel.zonaPeso[z];
    for (var kk in zon[z]) res.zona[z][kk] = zon[z][kk] / w * 100;
  });
  SEG_IDS.forEach(function (g) {
    res.seg[g] = {};
    ids.forEach(function (id) { res.seg[g][id] = segPeso[g] > 0 ? seg[g][id] / segPeso[g] * 100 : 0; });
  });
  return res;
}

/* Cache diário das disputas do estado (usado por IA, mapa e pesquisas). */
function cacheEstadual(jogo, uf, cargo, forcar) {
  jogo._cacheEst = jogo._cacheEst || {};
  var k = uf + ':' + cargo;
  var c = jogo._cacheEst[k];
  if (!c || forcar || c.dia !== jogo.dia) {
    c = intencoesEstadual(jogo, uf, cargo, {});
    c.dia = jogo.dia;
    jogo._cacheEst[k] = c;
  }
  return c;
}
function invalidarCacheEstadual(jogo) { jogo._cacheEst = {}; }

function percebidoEst(jogo, c) {
  var d = disputa(jogo, c.uf, c.cargo === 'senador' ? 'senador' : 'governador');
  return d.percepcao && d.percepcao[c.id] !== undefined ? d.percepcao[c.id] : 10;
}

/* Cria o candidato do jogador numa disputa estadual. d: dados do formulário de criação. */
function criarJogadorEstadual(jogo, d) {
  var dif = DIFICULDADES[jogo.config.dificuldade];
  var cargo = jogo.cargo, uf = jogo.ufJogador;
  var traj = TRAJETORIAS[d.trajetoria];
  var attr = copiar(d.attr);
  for (var k in traj.attr) attr[k] = clamp(attr[k] + traj.attr[k], 10, 98);
  var dep = cargo === 'depfed' || cargo === 'depest';
  var recog = clamp((traj.recogUF * 0.75 + traj.recogNac * 0.5 + 8) * (dep ? 0.6 : 1) + dif.recog, 3, 80);
  var ant = null;
  if (!dep) {
    var dsp = disputa(jogo, uf, cargo);
    ant = candsDisputa(jogo, uf, cargo, true).filter(function (c) { return c.partido === d.partido; })[0] || null;
    if (ant) { dsp.ids = dsp.ids.filter(function (id) { return id !== ant.id; }); delete jogo.est.cands[ant.id]; }
  }
  var c = criarCandEst(jogo, uf, cargo, d.partido, {
    id: 'jogador', jogador: true, attr: attr, x: d.x, recog: recog, traj: 'deputado',
    pessoa: { nome: d.nome, urna: d.urna, genero: d.genero, idade: d.idade }
  });
  c.trajetoria = d.trajetoria;
  c.bio = traj.nome + ' ' + prepUF(uf, 'de') + ', ' + d.idade + ' anos.';
  c.slogan = d.slogan || '';
  c.cred = credInicial(d.x, attr, traj.cred);
  SEG_IDS.forEach(function (g) { c.segAff[g] = (traj.segAff && traj.segAff[g]) || 0; });
  c.eps = { metro: 0, interior: 0 };
  c.dinheiroExtra = (traj.dinheiro || 0) * escalaCustoCargo(cargo, uf) * 0.5;
  c.marqueteiro = null;
  c.palanque = jogo.partidos[d.partido] || null;
  c.estilo = 'propositivo';
  if (ant) {
    c.coligacao = ant.coligacao.slice();
    c.incumbente = false;
    c.apoioGov = ant.incumbente || ant.apoioGov;
    c.cor = ant.cor;
  }
  if (!dep) {
    disputa(jogo, uf, cargo).ids.push(c.id);
    if (!ant) coresDisputa(jogo, disputa(jogo, uf, cargo).ids);
  } else {
    gerarListaJogador(jogo, c);
  }
  jogo.jogadorId = c.id;
  return c;
}

/* ---------- Palanques do candidato a presidente ---------- */

/* Candidato a governador que é o palanque de um presidenciável no estado. */
function palanqueNoEstado(jogo, uf, presId) {
  if (!jogo.est || !jogo.est.ufs[uf]) return null;
  var cands = candsDisputa(jogo, uf, 'governador').filter(function (c) { return c.palanque === presId; });
  if (!cands.length) return null;
  var of = cands.filter(function (c) { return c.palanqueOficial; })[0];
  if (of) return of;
  cands.sort(function (a, b) { return (b.recog.metro + b.recog.interior) - (a.recog.metro + a.recog.interior); });
  return cands[0];
}

function definirPalanqueOficial(jogo, uf, candId) {
  var pres = jogadorPres(jogo);
  candsDisputa(jogo, uf, 'governador', true).forEach(function (c) {
    if (c.id === candId) { c.palanque = pres.id; c.palanqueOficial = true; }
    else if (c.palanque === pres.id) c.palanqueOficial = false;
  });
}

/* O partido do presidenciável lança candidato próprio a governador num estado. */
function lancarCandidatoProprio(jogo, uf) {
  var pres = jogadorPres(jogo);
  var dsp = disputa(jogo, uf, 'governador');
  if (candsDisputa(jogo, uf, 'governador', true).some(function (c) { return c.partido === pres.partido; })) return null;
  var c = criarCandEst(jogo, uf, 'governador', pres.partido, {});
  c.palanque = pres.id;
  dsp.ids.push(c.id);
  var usadas = candsDisputa(jogo, uf, 'governador', true).map(function (o) { return o.cor; });
  for (var k = 1; k <= 8; k++) if (usadas.indexOf(k) < 0) { c.cor = k; break; }
  definirPalanqueOficial(jogo, uf, c.id);
  jogo.lancamentos = (jogo.lancamentos || 0) + 1;
  return c;
}

/* Transferência de recursos da campanha presidencial para um aliado estadual. */
function repassarRecursos(jogo, candId, valor) {
  var c = jogador(jogo), al = jogo.est.cands[candId];
  if (!podePagar(jogo, c, valor)) return false;
  gastar(c, valor);
  al.dinheiro += valor;
  ZONAS.forEach(function (z) { al.presenca[z] = Math.min(100, al.presenca[z] + 3 * valor / Math.max(0.5, escalaCustoCargo('governador', al.uf))); });
  al.repassado = (al.repassado || 0) + valor;
  return true;
}
