/* Simula partidas completas sem interface: o "jogador" é controlado pela IA.
 * Uso: node tools/simular.js [partidas] [candidato|presidente|criar|governador|senador|depfed|depest] [ritmo] [dificuldade] [UF]
 * ("presidente" joga com Helena Vasconcelos, a pré-candidata padrão) */
const { carregar } = require('./carregar');
global.localStorage = { getItem: () => null, setItem: () => {} };
carregar(s => s.includes('/dados/') || s.includes('/nucleo/'));

function responderDebateAuto(jogo, s) {
  while (!debateTerminou(s)) {
    const p = s.passos[s.passo];
    const adv = s.participantes.filter(id => id !== jogo.jogadorId);
    if (p.tipo === 'perguntar') responderDebate(jogo, s, { alvo: adv[0], tema: 'economia', tom: 'propositiva' });
    else { const ops = opcoesDebate(jogo, s); responderDebate(jogo, s, { id: ops[0].id, alvo: adv[0] }); }
  }
  concluirDebate(jogo, s);
}

function jogarAuto(seed, quem, ritmo, dif, uf) {
  const estadual = ['governador', 'senador', 'depfed', 'depest'].includes(quem);
  const dados = { nome: 'Joana Teste', urna: 'Joana', genero: 'F', idade: 50, partido: estadual ? 'MDN' : 'PSN', uf: uf || 'MG', trajetoria: estadual && quem.startsWith('dep') ? 'deputado' : 'governador', x: 12, attr: { carisma: 60, oratoria: 60, gestao: 60, articulacao: 60, integridade: 60 } };
  const escolha = estadual ? { tipo: 'estadual', dados } : quem === 'criar' ? { tipo: 'criar', dados } : { tipo: 'pronto', id: quem };
  const jogo = novoJogo({ ritmo, dificuldade: dif, seed, cargo: estadual ? quem : 'presidente', uf: uf || 'MG' }, escolha);
  const c = jogador(jogo);
  if (!estadual) {
    const vs = vicesDisponiveis(jogo);
    if (vs.length) escolherVice(jogo, vs[0]);
    partidosNegociaveis(jogo).sort((a, b) => b.bancada - a.bancada).slice(0, 3).forEach(p => negociarPartido(jogo, p.sigla, 'cargos'));
    contratarMarqueteiro(jogo, 'nunes');
  } else contratarMarqueteiro(jogo, 'local');
  definirProgramaJogador(jogo, TEMA_IDS.slice().sort((a, b) => c.cred[b] - c.cred[a]).slice(0, 3));
  iniciarCampanha(jogo);
  let guard = 0;
  const jogarCampanha = () => {
    while ((jogo.fase === 'campanha1' || jogo.fase === 'campanha2') && guard++ < 500) {
      jogo.pendentes.forEach(ev => { const ops = opcoesDisponiveis(jogo, ev); resolverEvento(jogo, ev, ops.findIndex(o => o.ok)); });
      jogo.pendentes = [];
      const n = slotsDoTurno(jogo);
      const jg = jogador(jogo);
      if (jg.escopo === 'estadual') { jogo.agenda = []; if (jg.ativo) for (let i = 0; i < n; i++) jogo.agenda.push(iaAcaoEst(jogo, jg)); }
      else { jogo.agenda = iaEscolherAcoes(jogo, jg, n); iaEstrategiaTV(jogo, jg); }
      let r = processarTurno(jogo);
      while (r.tipo !== 'fimTurno') {
        if (r.tipo === 'sabatina') { const sab = montarSabatina(jogo); while (sab.idx < sab.perguntas.length) responderSabatina(jogo, sab, 'direto'); concluirSabatina(jogo, sab); }
        else if (r.tipo === 'debate') responderDebateAuto(jogo, r.sessao);
        r = processarTurno(jogo);
      }
      encerrarTurno(jogo);
    }
  };
  jogarCampanha();
  realizarEleicao(jogo);
  const f = resolverPrimeiroTurno(jogo);
  if (f === 'entreturnos') {
    jogo.candidatos.filter(x => x.eliminado).forEach(x => pedirApoioSegundoTurno(jogo, x.id, 'programa'));
    iniciarCampanha2(jogo); jogarCampanha(); realizarEleicao(jogo); resolverSegundoTurno(jogo);
  } else if (f === 'entreturnosGov') {
    iniciarCampanha2(jogo); jogarCampanha(); realizarEleicao(jogo); resolverSegundoTurno(jogo);
  } else if (f === 'eliminado' || f === 'acompanhar') {
    if (f === 'eliminado') jogo.apoios2[jogo.jogadorId] = 'neutro';
    simularSegundoTurnoAutomatico(jogo); realizarEleicao(jogo); resolverSegundoTurno(jogo);
  }
  return jogo;
}
module.exports = { jogarAuto };

if (require.main === module) {
  const N = +(process.argv[2] || 5);
  const quem = (process.argv[3] || 'helena').replace(/^presidente$/, 'helena');
  const ritmo = process.argv[4] || 'semanal';
  const dif = process.argv[5] || 'normal';
  const uf = process.argv[6] || 'MG';
  let venceu = 0; const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const jogo = jogarAuto(1000 + i, quem, ritmo, dif, uf);
    const rj = resultadoJogador(jogo);
    if (rj.venceu) venceu++;
    const r1 = jogo.resultado1;
    let linha = 'Pres: ' + r1.ordem.slice(0, 3).map(id => id + ' ' + r1.pct[id].toFixed(1)).join(' | ') + (jogo.resultado2 ? '  2T ' + jogo.resultado2.ordem.map(id => id + ' ' + jogo.resultado2.pct[id].toFixed(1)).join(' x ') : '');
    const cam = Object.entries(jogo.resEst1.camara).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s, n]) => s + ' ' + n).join(', ');
    linha += '\n   Câmara: ' + cam + ' | gov 2T em ' + jogo.govSegundo.length + ' UFs';
    const c = jogador(jogo);
    if (c.escopo === 'estadual') {
      if (rj.rp) linha += '\n   Você: ' + Math.round(rj.rp.jogador.votos) + ' votos, posição ' + rj.rp.jogador.posicaoLista + ' na lista, partido fez ' + rj.rp.jogador.cadeirasPartido + ' cadeiras, QE ' + rj.rp.qe + (rj.venceu ? ' ELEITO(A)' : '');
      else { [rj.r1, rj.r2].filter(Boolean).forEach((rr, t) => { linha += '\n   Você ' + (t + 1) + 'T: ' + (rr.pct[c.id] !== undefined ? rr.pct[c.id].toFixed(1) + '%' : 'fora') + ' ' + (rj.venceu ? 'ELEITO(A)' : '') + ' | ' + rr.ordem.slice(0, 4).map(id => jogo.est.cands[id].urna + ' ' + rr.pct[id].toFixed(1)).join(' | '); }); }
    }
    if (i < 4) console.log(linha);
  }
  console.log('jogador venceu', venceu + '/' + N, '| ms/partida', Math.round((Date.now() - t0) / N));
}
