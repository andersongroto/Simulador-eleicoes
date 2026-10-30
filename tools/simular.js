/* Simula partidas completas sem interface: o "jogador" é controlado pela IA.
 * Uso: node tools/simular.js [partidas] [candidato|criar] [ritmo] [dificuldade] */
const { carregar } = require('./carregar');
global.localStorage = { getItem: () => null, setItem: () => {} };
carregar(s => s.includes('/dados/') || s.includes('/nucleo/'));

function jogarAuto(seed, escolha, ritmo, dif, verbose) {
  const jogo = novoJogo({ ritmo, dificuldade: dif, seed }, escolha);
  // pré-campanha
  const vs = vicesDisponiveis(jogo);
  if (vs.length) escolherVice(jogo, vs[0]);
  const negs = partidosNegociaveis(jogo).sort((a, b) => b.bancada - a.bancada).slice(0, 3);
  negs.forEach(p => negociarPartido(jogo, p.sigla, 'cargos'));
  contratarMarqueteiro(jogo, 'nunes');
  const c = jogador(jogo);
  definirProgramaJogador(jogo, TEMA_IDS.slice().sort((a, b) => c.cred[b] - c.cred[a]).slice(0, 3));
  iniciarCampanha(jogo);
  let guard = 0;
  const jogarCampanha = () => {
    while ((jogo.fase === 'campanha1' || jogo.fase === 'campanha2') && guard++ < 500) {
      jogo.pendentes.forEach(ev => {
        const ops = opcoesDisponiveis(jogo, ev);
        let i = ops.findIndex(o => o.ok);
        resolverEvento(jogo, ev, i);
      });
      jogo.pendentes = [];
      const n = slotsDoTurno(jogo);
      jogo.agenda = iaEscolherAcoes(jogo, jogador(jogo), n);
      iaEstrategiaTV(jogo, jogador(jogo));
      let r = processarTurno(jogo);
      while (r.tipo !== 'fimTurno') {
        if (r.tipo === 'sabatina') {
          const sab = montarSabatina(jogo);
          while (sab.idx < sab.perguntas.length) responderSabatina(jogo, sab, 'direto');
          concluirSabatina(jogo, sab);
        } else if (r.tipo === 'debate') {
          const s = r.sessao;
          while (!debateTerminou(s)) {
            const p = s.passos[s.passo];
            const adv = s.participantes.filter(id => id !== jogo.jogadorId);
            if (p.tipo === 'perguntar') responderDebate(jogo, s, { alvo: adv[0], tema: 'economia', tom: 'propositiva' });
            else { const ops = opcoesDebate(jogo, s); responderDebate(jogo, s, { id: ops[0].id, alvo: adv[0] }); }
          }
          concluirDebate(jogo, s);
        }
        r = processarTurno(jogo);
      }
      encerrarTurno(jogo);
    }
  };
  jogarCampanha();
  realizarEleicao(jogo);
  const r1 = jogo.resultado1;
  const out = { r1: r1.ordem.map(id => [id, r1.pct[id]]) };
  const f = resolverPrimeiroTurno(jogo);
  if (f === 'entreturnos') {
    jogo.candidatos.filter(x => x.eliminado).forEach(x => pedirApoioSegundoTurno(jogo, x.id, 'programa'));
    iniciarCampanha2(jogo);
    jogarCampanha();
    realizarEleicao(jogo);
    resolverSegundoTurno(jogo);
  } else if (f === 'eliminado') {
    simularSegundoTurnoAutomatico(jogo);
    realizarEleicao(jogo);
    resolverSegundoTurno(jogo);
  }
  if (jogo.resultado2) out.r2 = jogo.resultado2.ordem.map(id => [id, jogo.resultado2.pct[id]]);
  out.vencedor = jogo.vencedor;
  out.jogo = jogo;
  return out;
}

const N = +(process.argv[2] || 10);
const quem = process.argv[3] || 'helena';
const ritmo = process.argv[4] || 'semanal';
const dif = process.argv[5] || 'normal';
const escolha = quem === 'criar'
  ? { tipo: 'criar', dados: { nome: 'Joana Teste', urna: 'Joana', genero: 'F', idade: 50, partido: 'PSN', uf: 'MG', trajetoria: 'governador', x: 15, attr: { carisma: 60, oratoria: 60, gestao: 60, articulacao: 60, integridade: 60 } } }
  : { tipo: 'pronto', id: quem };
const vit = {}; let jogVence = 0, segundos = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const o = jogarAuto(1000 + i, escolha, ritmo, dif);
  vit[o.vencedor] = (vit[o.vencedor] || 0) + 1;
  if (o.vencedor === o.jogo.jogadorId) jogVence++;
  if (o.r2) segundos++;
  if (i < 6) console.log('1T:', o.r1.slice(0, 5).map(([id, p]) => id + ' ' + p.toFixed(1)).join(' | '), o.r2 ? ' 2T: ' + o.r2.map(([id, p]) => id + ' ' + p.toFixed(1)).join(' x ') : ' (1º turno)');
}
console.log('vitórias:', vit, '| jogador venceu', jogVence + '/' + N, '| 2º turno em', segundos, '| ms/partida', Math.round((Date.now() - t0) / N));
