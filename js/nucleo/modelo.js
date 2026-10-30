/* Modelo de intenção de voto.
 *
 * O eleitorado de cada UF é dividido em 5 perfis (evangélicos, popular, classe média,
 * agro/interior, jovens) e cada perfil em 5 faixas ideológicas. Para cada célula, a
 * utilidade de cada candidato soma: proximidade ideológica, credibilidade nos temas que
 * o perfil valoriza, quanto o candidato é conhecido, presença de campanha no estado,
 * apoios, imagem/desgaste, carisma, reduto eleitoral, avaliação do governo e voto útil.
 * A escolha é um logit multinomial com as opções "branco/nulo" e "indeciso". */

var PARAM = {
  K_IDEO: 2.7,      // peso da distância ideológica (ao quadrado, escala 0-2)
  K_ISS: 0.9,       // credibilidade nos temas
  K_REC: 0.7,       // conhecimento do candidato (log)
  K_PRES: 0.75,     // presença de campanha no estado
  K_CAR: 0.35,      // carisma
  K_DESG: 1.3,      // desgaste (ataques, escândalos)
  K_GOV: 0.28,      // apoio do governador
  K_CAP: 0.16,      // capilaridade da coligação
  K_HOME: 0.55,     // estado natal
  K_REG: 0.12,      // região natal
  K_SIT: 0.9,       // efeito da aprovação do governo no candidato da situação
  EPS_SD: 0.14,     // afinidade idiossincrática candidato × estado
  VIAB0: 0.12, VIAB1: 0.62,   // voto útil no início e no fim da campanha
  C_NONE: -1.35,    // branco/nulo/nenhum (pesquisa)
  C_UND0: -0.7, C_UND1: -2.3, // indecisos no início e na véspera
  C_NONE_URNA: -1.75, // branco/nulo na urna (1º turno)
  C_NONE2: -1.75,    // branco/nulo no 2º turno
  BIN_SD: 40,
  K_REJ: 1.5, TH_REJ: -1.15,
  K_TRANSF: 1.6,    // transferência de votos por apoio no 2º turno
  K_BASE: 1.45      // identificação afetiva com o líder do campo (polarização)
};

var BINS_Z = [-1.6, -0.8, 0, 0.8, 1.6];
var BINS_W = [0.11, 0.24, 0.30, 0.24, 0.11];
var SIT_SEG = { evang: 0.8, popular: 1.3, media: 0.8, agro: 0.7, jovem: 1.0 };

var CELULAS = null;
function prepararCelulas() {
  if (CELULAS) return CELULAS;
  CELULAS = [];
  ESTADOS.forEach(function (e, i) {
    SEG_IDS.forEach(function (g) {
      for (var k = 0; k < BINS_Z.length; k++) {
        CELULAS.push({
          i: i, uf: e.uf, g: g,
          x: clamp(e.segMedia[g] + BINS_Z[k] * PARAM.BIN_SD, -100, 100),
          w: e.seg[g] * BINS_W[k]
        });
      }
    });
  });
  return CELULAS;
}

function candidatosAtivos(jogo) {
  return jogo.candidatos.filter(function (c) { return c.ativo; });
}
function candPorId(jogo, id) {
  for (var i = 0; i < jogo.candidatos.length; i++) if (jogo.candidatos[i].id === id) return jogo.candidatos[i];
  return null;
}

/* Polarização afetiva: eleitores do mesmo campo se identificam com o líder do campo. */
function termoBase(c, x) {
  if (!c.base) return 0;
  var lado = c.x < 0 ? -x : x;
  return PARAM.K_BASE * c.base * clamp((lado - 5) / 55, -0.6, 1.2);
}

/* Termo de temas: quanto o candidato é crível nos assuntos que o perfil valoriza. */
function termoTemas(jogo, c, g) {
  var pesos = SEGMENTOS[g].pesos, sal = jogo.saliencia || {}, t, tot = 0, wsum = 0;
  for (t in pesos) {
    var w = pesos[t] * (sal[t] || 1);
    tot += w * (c.cred[t] - 50) / 50;
    wsum += w;
  }
  return PARAM.K_ISS * tot / wsum;
}

function capilaridade(jogo, c, reg) {
  var s = 0;
  c.coligacao.forEach(function (sig) {
    var p = PARTIDO_POR_SIGLA[sig];
    if (p) s += (p.forca[reg] || 0) * Math.min(1, p.bancada / 50 + 0.1);
  });
  return PARAM.K_CAP * Math.sqrt(s);
}

function pesoViabilidade(jogo, dia, modo) {
  if (modo === 'segundo' || modo === 'cenario2') return 0;
  var cal = jogo.cal;
  var prog = clamp(dia / cal.eleicao1, 0, 1);
  var v = lerp(PARAM.VIAB0, PARAM.VIAB1, Math.pow(prog, 1.4));
  if (modo === 'urna') v += 0.06;
  return v;
}

/* Calcula intenções de voto.
 * opts.modo: 'pesquisa' (padrão, com indecisos), 'urna' (dia da eleição), 'segundo' (2º turno)
 * opts.ids: candidatos considerados (padrão: ativos)
 * opts.dia: dia de referência
 * opts.seg: true para guardar a distribuição por UF × perfil
 * opts.rej: true para calcular rejeição */
function calcularIntencoes(jogo, opts) {
  opts = opts || {};
  prepararCelulas();
  var modo = opts.modo || 'pesquisa';
  var dia = opts.dia === undefined ? jogo.dia : opts.dia;
  var ids = opts.ids || candidatosAtivos(jogo).map(function (c) { return c.id; });
  var cands = ids.map(function (id) { return candPorId(jogo, id); });
  var n = cands.length;
  var viab = pesoViabilidade(jogo, dia, modo);
  var aprov = jogo.aprovacao;
  var erro = (modo === 'urna' || modo === 'segundo') && opts.erro ? opts.erro : null;

  // Componentes por candidato × segmento
  var A = cands.map(function (c) {
    var r = {};
    SEG_IDS.forEach(function (g) {
      var v = termoTemas(jogo, c, g) + (c.segAff[g] || 0) + (c.segTemp[g] || 0);
      v += c.imagem - PARAM.K_DESG * c.desgaste / 100;
      v += PARAM.K_CAR * (c.attr.carisma - 50) / 50;
      if (c.situacao) v += PARAM.K_SIT * (aprov - 40) / 40 * SIT_SEG[g];
      r[g] = v;
    });
    return r;
  });
  // Viabilidade nacional (percepção pelas pesquisas)
  var V = cands.map(function (c) {
    if (!viab) return 0;
    var p = (jogo.percepcao && jogo.percepcao[c.id] !== undefined) ? jogo.percepcao[c.id] : 5;
    return viab * Math.log((p + 1.5) / 30);
  });
  // Componentes por candidato × UF
  var B = cands.map(function (c, ci) {
    var r = {}, rejBase = {};
    ESTADOS.forEach(function (e) {
      var rec = Math.max(1, c.recog[e.uf]);
      var v = PARAM.K_REC * Math.log(rec / 100);
      v += PARAM.K_PRES * (c.presenca[e.uf] || 0) / 100;
      var gv = jogo.governadores[e.uf];
      if (gv && gv.apoio === c.id) v += PARAM.K_GOV * gv.aprov / 50;
      v += capilaridade(jogo, c, e.reg);
      var b = 0;
      if (c.uf === e.uf) b += PARAM.K_HOME;
      else if (ESTADO_POR_UF[c.uf] && ESTADO_POR_UF[c.uf].reg === e.reg) b += PARAM.K_REG;
      if (c.viceUf === e.uf) b += PARAM.K_HOME * 0.35;
      b += c.eps[e.uf] || 0;
      if (erro) b += (erro.nac[c.id] || 0) + ((erro.uf[c.id] && erro.uf[c.id][e.uf]) || 0);
      r[e.uf] = v + b + V[ci];
      rejBase[e.uf] = b;
    });
    return { u: r, rb: rejBase };
  });

  var progresso = clamp(dia / jogo.cal.eleicao1, 0, 1);
  var uNone, uUnd = null;
  if (modo === 'pesquisa') {
    uNone = PARAM.C_NONE;
    uUnd = lerp(PARAM.C_UND0, PARAM.C_UND1, progresso);
    if (jogo.fase === 'campanha2' || jogo.fase === 'entreturnos') { uNone = PARAM.C_NONE2 + 0.25; uUnd = PARAM.C_UND1 - 0.2; }
  } else if (modo === 'cenario2') {
    uNone = PARAM.C_NONE2 + 0.25;
    uUnd = PARAM.C_UND1 - 0.2;
  } else if (modo === 'urna') {
    uNone = PARAM.C_NONE_URNA;
  } else {
    uNone = PARAM.C_NONE2;
  }
  var transf = (modo === 'segundo' || (modo === 'pesquisa' && n === 2)) ? (jogo.transf || null) : null;

  var res = { ids: ids, uf: {}, nac: {}, seg: opts.seg ? {} : null, rej: {} };
  var acc = {}, accRej = {};
  ESTADOS.forEach(function (e) {
    var o = { nenhum: 0, indeciso: 0 };
    ids.forEach(function (id) { o[id] = 0; });
    acc[e.uf] = o;
    accRej[e.uf] = ids.map(function () { return 0; });
    if (res.seg) { res.seg[e.uf] = {}; }
  });

  var U = new Array(n), cel, i, k, ex, tot;
  for (var ci2 = 0; ci2 < CELULAS.length; ci2++) {
    cel = CELULAS[ci2];
    var uf = cel.uf;
    var bonusT = null;
    if (transf && jogo.resultado1 && jogo.resultado1.seg) bonusT = jogo.resultado1.seg[uf][cel.g];
    tot = Math.exp(uNone);
    if (uUnd !== null) tot += Math.exp(uUnd);
    for (i = 0; i < n; i++) {
      var dx = (cands[i].x - cel.x) / 100;
      var u = A[i][cel.g] + B[i].u[uf] - PARAM.K_IDEO * dx * dx + termoBase(cands[i], cel.x);
      if (bonusT && transf[cands[i].id]) {
        // eleitores de candidatos eliminados que apoiaram este finalista
        var lista = transf[cands[i].id];
        for (k = 0; k < lista.length; k++) u += PARAM.K_TRANSF * (bonusT[lista[k]] || 0);
      }
      U[i] = u;
      ex = Math.exp(u);
      tot += ex;
      U[i] = ex;
    }
    var o2 = acc[uf];
    o2.nenhum += cel.w * Math.exp(uNone) / tot;
    if (uUnd !== null) o2.indeciso += cel.w * Math.exp(uUnd) / tot;
    for (i = 0; i < n; i++) o2[ids[i]] += cel.w * U[i] / tot;
    if (res.seg) {
      var sg = res.seg[uf][cel.g] || (res.seg[uf][cel.g] = {});
      for (i = 0; i < n; i++) sg[ids[i]] = (sg[ids[i]] || 0) + BINS_W[ci2 % 5] * U[i] / tot;
    }
    if (opts.rej) {
      for (i = 0; i < n; i++) {
        var c = cands[i];
        var dx2 = (c.x - cel.x) / 100;
        var vr = A[i][cel.g] + B[i].rb[uf] - PARAM.K_IDEO * dx2 * dx2 + termoBase(c, cel.x);
        var conhece = Math.min(1, c.recog[uf] / 100 * 1.15);
        accRej[uf][i] += cel.w * conhece * sigmoid(PARAM.K_REJ * (PARAM.TH_REJ - vr));
      }
    }
  }

  // Agregação nacional ponderada pelo eleitorado
  var nac = { nenhum: 0, indeciso: 0 };
  ids.forEach(function (id) { nac[id] = 0; res.rej[id] = 0; });
  ESTADOS.forEach(function (e) {
    var o = acc[e.uf];
    var pct = {};
    for (var key in o) pct[key] = o[key] * 100;
    res.uf[e.uf] = pct;
    var w = e.eleitores / TOTAL_ELEITORES;
    for (key in o) nac[key] += o[key] * 100 * w;
    if (opts.rej) ids.forEach(function (id, ii) { res.rej[id] += accRej[e.uf][ii] * 100 * w; });
  });
  res.nac = nac;
  return res;
}

/* Votos válidos (exclui brancos, nulos e indecisos). */
function paraValidos(dist, ids) {
  var t = 0, r = {};
  ids.forEach(function (id) { t += dist[id]; });
  ids.forEach(function (id) { r[id] = t > 0 ? dist[id] / t * 100 : 0; });
  return r;
}

/* Ordena ids por intenção, do maior para o menor. */
function ordenarPor(dist, ids) {
  return ids.slice().sort(function (a, b) { return dist[b] - dist[a]; });
}
