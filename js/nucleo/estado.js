/* Criação do estado inicial do jogo. */

var DIFICULDADES = {
  facil:   { nome: 'Fácil', jogador: 1.2, ia: 0.9, dinheiro: 1.25, recog: 8, eventosRuins: 0.8 },
  normal:  { nome: 'Normal', jogador: 1.0, ia: 1.0, dinheiro: 1.0, recog: 0, eventosRuins: 1.0 },
  dificil: { nome: 'Difícil', jogador: 0.9, ia: 1.12, dinheiro: 0.9, recog: -3, eventosRuins: 1.25 }
};

var TETO_1T = 115, TETO_2T = 57.5;   // teto de gastos (R$ milhões), estimativa

function montarCandidato(def, jogo, eJogador) {
  var c = {
    id: def.id, nome: def.nome, urna: def.urna, genero: def.genero, idade: def.idade,
    partido: def.partido, numero: PARTIDO_POR_SIGLA[def.partido].numero,
    uf: def.uf, trajetoria: def.trajetoria, bio: def.bio, slogan: def.slogan || '',
    x: def.x, base: def.base || 0, attr: copiar(def.attr), cred: copiar(def.cred),
    segAff: {}, segTemp: {}, recog: {}, presenca: {}, eps: {},
    imagem: 0, desgaste: 0, situacao: !!def.situacao,
    coligacao: (def.coligacao || [def.partido]).slice(), vice: def.vice || null, viceUf: null,
    dinheiro: 0, gasto: 0, arrecadado: 0, energia: 100,
    tv: { estrategia: 'positiva', tema: null, alvo: null, invest: 2 }, tvSeg: 0,
    marqueteiro: eJogador ? null : 'nunes', preparo: 0,
    apoios: [], propostas: [], cor: def.cor, jogador: !!eJogador, ativo: true,
    estilo: def.estilo || 'propositivo', local: def.uf,
    stats: { comicios: 0, ataques: 0, ataquesRecebidos: {}, debates: [], estados: {}, propostas: 0, apoiosGanhos: 0, eventos: 0 },
    bandeiras: []
  };
  SEG_IDS.forEach(function (g) { c.segAff[g] = (def.segAff && def.segAff[g]) || 0; c.segTemp[g] = 0; });
  var base = def.recog;
  var regCasa = ESTADO_POR_UF[def.uf] ? ESTADO_POR_UF[def.uf].reg : null;
  ESTADOS.forEach(function (e) {
    var r = base * (0.88 + 0.24 * (ruidoFixo(jogo.seed + c.id + e.uf + 'r') * 0.5 + 0.5));
    if (e.uf === def.uf) r = Math.max(r, base + (def.recogUF || 28));
    else if (e.reg === regCasa) r += 6;
    c.recog[e.uf] = clamp(r, 2, 98);
    c.presenca[e.uf] = 0;
    c.eps[e.uf] = ruidoFixo(jogo.seed + ':' + c.id + ':' + e.uf) * PARAM.EPS_SD;
  });
  if (!c.tv.tema) {
    var melhor = TEMA_IDS.slice().sort(function (a, b) { return c.cred[b] - c.cred[a]; })[0];
    c.tv.tema = melhor;
  }
  return c;
}

/* Constrói os dados de um candidato criado pelo jogador. */
function definicaoCriada(d, dif) {
  var traj = TRAJETORIAS[d.trajetoria];
  var p = PARTIDO_POR_SIGLA[d.partido];
  var attr = copiar(d.attr);
  for (var k in traj.attr) attr[k] = clamp(attr[k] + traj.attr[k], 10, 98);
  var cred = {};
  TEMA_IDS.forEach(function (t) {
    // credibilidade inicial segue a ideologia: esquerda forte no social, direita na segurança e costumes
    var base = 45;
    var x = d.x;
    if (t === 'social') base += -x * 0.25;
    if (t === 'ambiente') base += -x * 0.22;
    if (t === 'seguranca') base += x * 0.22;
    if (t === 'costumes') base += x * 0.3;
    if (t === 'economia') base += x * 0.08 + (attr.gestao - 50) * 0.25;
    if (t === 'saude' || t === 'educacao') base += (attr.gestao - 50) * 0.2;
    if (t === 'corrupcao') base += (attr.integridade - 50) * 0.3;
    cred[t] = clamp(base + (traj.cred[t] || 0), 10, 95);
  });
  return {
    id: 'jogador', nome: d.nome, urna: d.urna || d.nome.split(' ')[0], genero: d.genero, idade: d.idade,
    partido: d.partido, uf: d.uf, trajetoria: d.trajetoria,
    bio: traj.nome + ' de ' + ESTADO_POR_UF[d.uf].nome + ', ' + d.idade + ' anos.',
    slogan: d.slogan || '', x: d.x, attr: attr, recog: clamp(8 + traj.recogNac + dif.recog, 3, 70),
    recogUF: traj.recogUF, cred: cred, segAff: copiar(traj.segAff || {}),
    situacao: d.partido === 'FPT', coligacao: [d.partido], cor: 8, estilo: 'propositivo',
    dinheiroExtra: traj.dinheiro || 0, vice: null
  };
}

/* escolha: { tipo: 'pronto', id } ou { tipo: 'criar', dados } */
function novoJogo(config, escolha) {
  var seed = config.seed || Math.floor(Math.random() * 1e9);
  semear(seed);
  var dif = DIFICULDADES[config.dificuldade] || DIFICULDADES.normal;
  var jogo = {
    versao: 1, seed: seed, rng: RNG.estado,
    config: { ritmo: config.ritmo, dificuldade: config.dificuldade, ano: config.ano || 2026 },
    cal: montarCalendario(config.ano || 2026),
    fase: 'precampanha', etapaPre: 'vice',
    dia: 0, turnoIdx: 0, turnos: [],
    candidatos: [], jogadorId: null,
    partidos: {}, governadores: {}, apoios: {},
    aprovacao: 40, saliencia: {},
    pesquisas: [], historico: [], noticias: [], percepcao: null,
    agenda: [], pendentes: [], internas: {},
    debatesFeitos: [], sabatinaFeita: false,
    resultado1: null, resultado2: null, transf: null, apoios2: {},
    conquistas: [], log: []
  };

  var defs = CANDIDATOS_PRONTOS.map(function (d) { return copiar(d); });
  var defJog;
  if (escolha.tipo === 'pronto') {
    defJog = defs.filter(function (d) { return d.id === escolha.id; })[0];
    jogo.jogadorId = defJog.id;
  } else {
    defJog = definicaoCriada(escolha.dados, dif);
    jogo.jogadorId = 'jogador';
    // Mesmo partido de um candidato pronto: o jogador ocupa a vaga dele.
    var mesmo = defs.filter(function (d) { return d.partido === defJog.partido; })[0];
    var sai = mesmo || defs[defs.length - 1];
    defJog.cor = sai.cor;
    if (mesmo) defJog.coligacao = mesmo.coligacao.slice();
    defs = defs.filter(function (d) { return d !== sai; });
    // o partido do jogador deixa qualquer coligação adversária
    defs.forEach(function (d) { d.coligacao = d.coligacao.filter(function (s) { return s !== defJog.partido; }); });
    defs.push(defJog);
  }
  defJog.recog = clamp(defJog.recog + dif.recog, 3, 95);

  jogo.candidatos = defs.map(function (d) { return montarCandidato(d, jogo, d === defJog); });
  jogo.candidatos.sort(function (a, b) { return a.cor - b.cor; });
  var jog = candPorId(jogo, jogo.jogadorId);
  jog.dinheiroExtra = defJog.dinheiroExtra || 0;
  jog.vice = null;

  // Partidos: quem apoia quem
  PARTIDOS.forEach(function (p) { jogo.partidos[p.sigla] = null; });
  jogo.candidatos.forEach(function (c) {
    c.coligacao.forEach(function (s) { jogo.partidos[s] = c.id; });
    if (!c.jogador && c.vice && VICES[c.vice]) c.viceUf = VICES[c.vice].uf;
  });

  // Governadores
  ESTADOS.forEach(function (e) {
    if (!e.gov) return;
    jogo.governadores[e.uf] = { nome: e.gov.nome, partido: e.gov.partido, aprov: e.gov.aprov, apoio: null };
  });
  atualizarApoioGovernadores(jogo);

  // Apoios setoriais iniciais
  APOIOS.forEach(function (a) {
    jogo.apoios[a.id] = null;
    if (a.inicial && candPorId(jogo, a.inicial) && !candPorId(jogo, a.inicial).jogador) {
      concederApoio(jogo, candPorId(jogo, a.inicial), a, true);
    }
  });

  jogo.rng = RNG.estado;
  return jogo;
}

/* Governadores apoiam o candidato da coligação do seu partido. */
function atualizarApoioGovernadores(jogo) {
  for (var uf in jogo.governadores) {
    var g = jogo.governadores[uf];
    if (g.fixo) continue;
    g.apoio = jogo.partidos[g.partido] || null;
  }
}

function concederApoio(jogo, c, a, silencioso) {
  var anterior = jogo.apoios[a.id];
  if (anterior) {
    var ca = candPorId(jogo, anterior);
    if (ca) {
      aplicarEfeitoApoio(ca, a, -1);
      ca.apoios = ca.apoios.filter(function (x) { return x !== a.id; });
    }
  }
  jogo.apoios[a.id] = c.id;
  c.apoios.push(a.id);
  aplicarEfeitoApoio(c, a, 1);
  if (!silencioso) c.stats.apoiosGanhos++;
}

function aplicarEfeitoApoio(c, a, sinal) {
  var ef = a.efeito;
  if (ef.seg) for (var g in ef.seg) c.segAff[g] = (c.segAff[g] || 0) + sinal * ef.seg[g];
  if (ef.cred) for (var t in ef.cred) c.cred[t] = clamp(c.cred[t] + sinal * ef.cred[t], 5, 98);
  if (ef.dinheiro && sinal > 0) { c.dinheiro += ef.dinheiro; c.arrecadado += ef.dinheiro; }
}

function jogador(jogo) { return candPorId(jogo, jogo.jogadorId); }

/* Distribuição do tempo de TV (por bloco de 12min30s): 10% igualitário, 90% pela bancada. */
function calcularTempoTV(jogo, ids, segundoTurno) {
  var total = 750;
  var res = {};
  if (segundoTurno) { ids.forEach(function (id) { res[id] = total / 2; }); return res; }
  var banc = {}, soma = 0;
  ids.forEach(function (id) {
    var c = candPorId(jogo, id);
    var b = c.coligacao.map(function (s) { return PARTIDO_POR_SIGLA[s].bancada; })
      .sort(function (a, b2) { return b2 - a; }).slice(0, 6).reduce(function (a, x) { return a + x; }, 0);
    banc[id] = b; soma += b;
  });
  ids.forEach(function (id) {
    res[id] = total * (0.1 / ids.length + 0.9 * (soma ? banc[id] / soma : 1 / ids.length));
  });
  return res;
}

function bancadaColigacao(c) {
  return c.coligacao.reduce(function (a, s) { return a + PARTIDO_POR_SIGLA[s].bancada; }, 0);
}

/* Recursos do fundo eleitoral: partido próprio integral, aliados 30%. */
function fundoColigacao(c) {
  var t = 0;
  c.coligacao.forEach(function (s, i) {
    var p = PARTIDO_POR_SIGLA[s];
    t += s === c.partido ? p.fundo : p.fundo * 0.3;
  });
  return t;
}
