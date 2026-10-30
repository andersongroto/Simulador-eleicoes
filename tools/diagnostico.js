const { carregar } = require('./carregar');
global.localStorage = { getItem: () => null, setItem: () => {} };
carregar(s => s.includes('/dados/') || s.includes('/nucleo/'));
const quem = process.argv[2] || 'helena';
const jogo = novoJogo({ ritmo: 'semanal', dificuldade: 'normal', seed: 1001 }, { tipo: 'pronto', id: quem });
const pre = process.argv[3] !== 'sempre';
if (pre) {
  const vs = vicesDisponiveis(jogo); if (vs.length) console.log(escolherVice(jogo, vs[0]).texto);
  partidosNegociaveis(jogo).sort((a, b) => b.bancada - a.bancada).slice(0, 3).forEach(p => console.log(negociarPartido(jogo, p.sigla, 'cargos').texto));
}
contratarMarqueteiro(jogo, 'nunes');
iniciarCampanha(jogo);
const linha = () => {
  const ids = jogo._cache.ids;
  return ordenarPor(jogo._cache.nac, ids).map(id => {
    const c = candPorId(jogo, id);
    const rec = UFS.reduce((t, u) => t + c.recog[u] * ESTADO_POR_UF[u].eleitores, 0) / TOTAL_ELEITORES;
    const pres = UFS.reduce((t, u) => t + c.presenca[u] * ESTADO_POR_UF[u].eleitores, 0) / TOTAL_ELEITORES;
    return `${id.slice(0, 5)} ${jogo._cache.nac[id].toFixed(1)} r${rec.toFixed(0)} p${pres.toFixed(0)} i${c.imagem.toFixed(2)} d${c.desgaste.toFixed(0)} $${c.dinheiro.toFixed(0)}`;
  }).join(' | ');
};
console.log('TV:', jogo.candidatos.map(c => c.id + ' ' + Math.round(c.tvSeg) + 's ' + c.coligacao.join('+')).join('; '));
console.log('d0', linha());
while (jogo.fase === 'campanha1') {
  jogo.pendentes = [];
  jogo.agenda = iaEscolherAcoes(jogo, jogador(jogo), slotsDoTurno(jogo));
  let r = processarTurno(jogo);
  while (r.tipo !== 'fimTurno') {
    if (r.tipo === 'sabatina') { const sab = montarSabatina(jogo); while (sab.idx < 4) responderSabatina(jogo, sab, 'direto'); concluirSabatina(jogo, sab); }
    else { simularDebateSemJogador(jogo, r.sessao); concluirDebate(jogo, r.sessao); }
    r = processarTurno(jogo);
  }
  console.log('d' + jogo.dia, linha());
  encerrarTurno(jogo);
}
