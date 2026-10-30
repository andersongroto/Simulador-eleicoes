/* Eleições proporcionais (deputados federais e estaduais).
 *
 * Os votos são calculados por partido em cada estado: ideologia, máquina partidária,
 * voto casado com o presidenciável e com o candidato a governador apoiados pelo partido,
 * e os "puxadores" de voto. As cadeiras seguem as regras do Código Eleitoral:
 * quociente eleitoral, quociente partidário (com mínimo de 10% do QE por candidato),
 * sobras pelas maiores médias (partidos com 80% do QE e candidatos com 20%) e,
 * se ainda sobrarem vagas, maiores médias entre todos os partidos.
 * Na lista aberta, ficam com as vagas os mais votados de cada partido. */

var PARAM_P = {
  K_IDEO: 1.8, K_MAQ: 0.7, K_COAT: 1.1, K_COAT_GOV: 0.45, K_PUX_JOG: 0.6,
  C_NONE: -2.25, LEGENDA: 0.09
};

function govDoPartido(jogo, uf, sigla) {
  var govs = candsDisputa(jogo, uf, 'governador', true);
  for (var i = 0; i < govs.length; i++) if (govs[i].coligacao.indexOf(sigla) >= 0) return govs[i];
  return null;
}

/* Fração de votos de cada partido no estado. casa: 'depfed' | 'depest' */
function intencoesProporcional(jogo, uf, casa, opts) {
  opts = opts || {};
  var cel = celulasEstado(uf);
  var e = ESTADO_POR_UF[uf];
  var presSeg = jogo._cache && jogo._cache.seg ? jogo._cache.seg[uf] : null;
  var gov = opts.gov || cacheEstadual(jogo, uf, 'governador');
  var alfa = jogo.est.alfaP || {};
  var dados = jogo.est.ufs[uf].prop;
  var jog = jogador(jogo);
  var ehListaJog = jog && jog.escopo === 'estadual' && jog.cargo === casa && jog.uf === uf;
  var ps = PARTIDOS.map(function (p) {
    var fixo = (alfa[p.sigla] || 0) + PARAM_P.K_MAQ * (p.forca[e.reg] || 0) + dados.eps[p.sigla][casa] + dados.puxador[p.sigla][casa];
    if (opts.erro && opts.erro[p.sigla]) fixo += opts.erro[p.sigla];
    var g = govDoPartido(jogo, uf, p.sigla);
    return { p: p, fixo: fixo, pal: jogo.partidos[p.sigla], gov: g ? g.id : null };
  });
  var acc = { nenhum: 0 }, zon = { metro: { nenhum: 0 }, interior: { nenhum: 0 } };
  PARTIDOS.forEach(function (p) { acc[p.sigla] = 0; zon.metro[p.sigla] = 0; zon.interior[p.sigla] = 0; });
  var uNone = PARAM_P.C_NONE, n = ps.length, ex = new Array(n);
  var shareJog = ehListaJog && opts.pessoal ? opts.pessoal : null;
  for (var i = 0; i < cel.length; i++) {
    var cc = cel[i];
    var tot = Math.exp(uNone);
    for (var k = 0; k < n; k++) {
      var o = ps[k];
      var dx = (o.p.ideo - cc.x) / 100;
      var u = o.fixo - PARAM_P.K_IDEO * dx * dx;
      if (presSeg && o.pal && presSeg[cc.g] && presSeg[cc.g][o.pal] !== undefined) u += PARAM_P.K_COAT * presSeg[cc.g][o.pal];
      if (o.gov && gov.zona[cc.z][o.gov] !== undefined) u += PARAM_P.K_COAT_GOV * gov.zona[cc.z][o.gov] / 100;
      if (shareJog && o.p.sigla === jog.partido) u += PARAM_P.K_PUX_JOG * shareJog[cc.z + cc.g];
      ex[k] = Math.exp(u);
      tot += ex[k];
    }
    acc.nenhum += cc.w * Math.exp(uNone) / tot;
    zon[cc.z].nenhum += cc.w * Math.exp(uNone) / tot;
    for (k = 0; k < n; k++) {
      acc[ps[k].p.sigla] += cc.w * ex[k] / tot;
      zon[cc.z][ps[k].p.sigla] += cc.w * ex[k] / tot;
    }
  }
  var res = { total: {}, zona: { metro: {}, interior: {} } };
  for (var key in acc) res.total[key] = acc[key];
  ZONAS.forEach(function (z) { for (var kk in zon[z]) res.zona[z][kk] = zon[z][kk] / cel.zonaPeso[z]; });
  return res;
}

/* Ajusta as constantes dos partidos para que o ponto de partida reproduza as bancadas atuais. */
function calibrarPartidos(jogo) {
  jogo.est.alfaP = {};
  PARTIDOS.forEach(function (p) { jogo.est.alfaP[p.sigla] = 0; });
  var alvo = {}, totB = soma(PARTIDOS.map(function (p) { return p.bancada + 1; }));
  PARTIDOS.forEach(function (p) { alvo[p.sigla] = (p.bancada + 1) / totB; });
  for (var it = 0; it < 6; it++) {
    var share = {}, tot = 0;
    PARTIDOS.forEach(function (p) { share[p.sigla] = 0; });
    UFS_MAPA.forEach(function (uf) {
      var r = intencoesProporcional(jogo, uf, 'depfed');
      var w = VAGAS_FED[uf];
      PARTIDOS.forEach(function (p) { share[p.sigla] += r.total[p.sigla] * w; tot += r.total[p.sigla] * w; });
    });
    PARTIDOS.forEach(function (p) {
      var s = share[p.sigla] / tot;
      jogo.est.alfaP[p.sigla] += 0.9 * Math.log(alvo[p.sigla] / Math.max(1e-6, s));
    });
  }
}

/* ---------- Listas de candidatos ---------- */

function tamanhoLista(p, vagas) {
  var f = clamp(0.25 + p.bancada / 70, 0.2, 1);
  return Math.max(2, Math.min(vagas + 1, Math.round((vagas + 1) * f)));
}

/* Distribui os votos nominais do partido entre os candidatos (cauda longa, como na realidade). */
function pesosLista(n, puxador) {
  var w = [];
  for (var i = 0; i < n; i++) w.push(Math.pow(i + 1, -0.9) * Math.exp(randn() * 0.4));
  if (puxador) w[0] *= 5;
  var t = soma(w);
  return w.map(function (x) { return x / t; }).sort(function (a, b) { return b - a; });
}

/* Lista do partido do jogador: concorrentes internos com nome, força relativa e base eleitoral. */
function gerarListaJogador(jogo, c) {
  c = c || jogador(jogo);
  var uf = c.uf, casa = c.cargo;
  var p = PARTIDO_POR_SIGLA[c.partido];
  var vagas = casa === 'depfed' ? VAGAS_FED[uf] : vagasEstaduais(uf);
  var n = tamanhoLista(p, vagas) - 1;
  var pux = jogo.est.ufs[uf].prop.puxador[c.partido][casa] > 0;
  var pesos = pesosLista(n, pux);
  var lista = pesos.map(function (w, i) {
    var traj = escolher(TRAJ_POR_CARGO[casa]);
    var pessoa = gerarPessoa(traj);
    return {
      id: 'lst-' + i, nome: pessoa.nome, urna: pessoa.urna, genero: pessoa.genero, trajetoria: traj,
      numero: numeroCandidato(jogo, casa, c.partido, uf), peso: w, zona: chance(0.5) ? 'metro' : 'interior',
      seg: escolher(SEG_IDS), puxador: pux && i === 0
    };
  });
  jogo.est.ufs[uf].lista = lista;
  return lista;
}

/* ---------- Votos pessoais do jogador candidato a deputado ---------- */

var PARAM_D = { A0: -4.6, K_REC: 1.1, K_PRES: 1.6, K_SEG: 2.2, K_IMG: 1.2 };

/* Fração dos votos do próprio partido que o jogador conquista, por zona e perfil. */
function participacaoPessoal(jogo, c) {
  var r = {};
  ZONAS.forEach(function (z) {
    SEG_IDS.forEach(function (g) {
      var u = PARAM_D.A0 + PARAM_D.K_REC * Math.log(Math.max(1, c.recog[z]) / 100) + PARAM_D.K_PRES * c.presenca[z] / 100 +
        PARAM_D.K_SEG * ((c.segAff[g] || 0) + (c.segTemp[g] || 0)) + PARAM_D.K_IMG * (c.imagem - c.desgaste / 100) +
        0.4 * (c.attr.carisma - 50) / 50 + (c.dobradaBonus || 0) + (c.eps[z] || 0);
      var w = Math.exp(u);
      r[z + g] = w / (1 + w);
    });
  });
  return r;
}

/* Estimativa de votos do jogador e posição na lista do partido. */
function projecaoDeputado(jogo, opts) {
  opts = opts || {};
  var c = jogador(jogo), uf = c.uf, casa = c.cargo;
  var e = ESTADO_POR_UF[uf], cel = celulasEstado(uf);
  var pess = participacaoPessoal(jogo, c);
  var prop = opts.prop || intencoesProporcional(jogo, uf, casa, { pessoal: pess });
  var comp = e.eleitores * 1e6 * 0.8;
  var validos = comp * (1 - prop.total.nenhum);
  var votosPartido = prop.total[c.partido] * comp;
  var meus = 0;
  cel.forEach(function (cc) { meus += cc.w * comp * prop.zona[cc.z][c.partido] * pess[cc.z + cc.g] * (1 - PARAM_P.LEGENDA); });
  var nominaisOutros = votosPartido * (1 - PARAM_P.LEGENDA) - meus;
  var lista = jogo.est.ufs[uf].lista || [];
  var outros = lista.map(function (o) { return { nome: o.urna, votos: Math.max(0, nominaisOutros) * o.peso }; });
  var vagas = casa === 'depfed' ? VAGAS_FED[uf] : vagasEstaduais(uf);
  var qe = validos / vagas;
  var cadeiras = votosPartido / qe;
  var rank = 1 + outros.filter(function (o) { return o.votos > meus; }).length;
  return { meus: meus, votosPartido: votosPartido, validos: validos, qe: qe, cadeirasEstimadas: cadeiras, rank: rank, outros: outros, partidos: prop.total, comp: comp };
}

/* ---------- Distribuição das cadeiras ---------- */

function quocienteEleitoral(validos, vagas) {
  var q = validos / vagas, f = q - Math.floor(q);
  return f > 0.5 ? Math.ceil(q) : Math.floor(q);
}

/* votos: { sigla: total do partido (nominais + legenda) }
 * listas: { sigla: [{ votos, ... }] ordenadas por votos (desc) } */
function distribuirCadeiras(votos, listas, vagas) {
  var siglas = Object.keys(votos).filter(function (s) { return votos[s] > 0; });
  var validos = soma(siglas.map(function (s) { return votos[s]; }));
  var qe = quocienteEleitoral(validos, vagas);
  var cad = {}, prox = {}, eleitos = [];
  siglas.forEach(function (s) { cad[s] = 0; prox[s] = 0; });
  var restantes = vagas;
  // 1ª fase: quociente partidário, com candidatos de pelo menos 10% do QE
  siglas.forEach(function (s) {
    var qp = Math.floor(votos[s] / qe);
    var lista = listas[s] || [];
    while (qp > 0 && prox[s] < lista.length && lista[prox[s]].votos >= 0.1 * qe && restantes > 0) {
      eleitos.push({ sigla: s, cand: lista[prox[s]], via: 'quociente' });
      prox[s]++; cad[s]++; qp--; restantes--;
    }
  });
  // 2ª fase: sobras para partidos com 80% do QE e candidatos com 20% do QE
  while (restantes > 0) {
    var melhor = null, mv = -1;
    siglas.forEach(function (s) {
      var lista = listas[s] || [];
      if (votos[s] < 0.8 * qe || prox[s] >= lista.length || lista[prox[s]].votos < 0.2 * qe) return;
      var m = votos[s] / (cad[s] + 1);
      if (m > mv) { mv = m; melhor = s; }
    });
    if (!melhor) break;
    eleitos.push({ sigla: melhor, cand: listas[melhor][prox[melhor]], via: 'media' });
    prox[melhor]++; cad[melhor]++; restantes--;
  }
  // 3ª fase: vagas restantes pelas maiores médias entre todos os partidos
  while (restantes > 0) {
    var b = null, bv = -1;
    siglas.forEach(function (s) {
      var lista = listas[s] || [];
      if (prox[s] >= lista.length) return;
      var m = votos[s] / (cad[s] + 1);
      if (m > bv) { bv = m; b = s; }
    });
    if (!b) break;
    eleitos.push({ sigla: b, cand: listas[b][prox[b]], via: 'media-geral' });
    prox[b]++; cad[b]++; restantes--;
  }
  return { qe: qe, validos: validos, cadeiras: cad, eleitos: eleitos };
}

/* Projeção rápida da Câmara (maiores médias, sem cláusulas de candidato). */
function projecaoCamara(jogo) {
  var tot = {};
  PARTIDOS.forEach(function (p) { tot[p.sigla] = 0; });
  UFS_MAPA.forEach(function (uf) {
    var r = intencoesProporcional(jogo, uf, 'depfed');
    var cad = {};
    PARTIDOS.forEach(function (p) { cad[p.sigla] = 0; });
    for (var i = 0; i < VAGAS_FED[uf]; i++) {
      var m = null, mv = -1;
      PARTIDOS.forEach(function (p) { var v = r.total[p.sigla] / (cad[p.sigla] + 1); if (v > mv) { mv = v; m = p.sigla; } });
      cad[m]++;
    }
    PARTIDOS.forEach(function (p) { tot[p.sigla] += cad[p.sigla]; });
  });
  return tot;
}
