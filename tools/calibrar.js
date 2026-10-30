const { carregar } = require('./carregar');
carregar(s => s.includes('/dados/') || s.includes('/nucleo/'));
const jogo = novoJogo({ ritmo: 'semanal', dificuldade: 'normal', seed: 42 }, { tipo: 'pronto', id: 'helena' });
let r0 = calcularIntencoes(jogo, { dia: 0, modo: 'pesquisa' });
jogo.percepcao = r0.nac;
let r = calcularIntencoes(jogo, { dia: 0, modo: 'pesquisa', rej: true });
function show(r, titulo) {
  console.log('==', titulo);
  const ids = r.ids;
  ordenarPor(r.nac, ids).forEach(id => console.log(id.padEnd(12), r.nac[id].toFixed(1).padStart(5), ' rej', (r.rej[id]||0).toFixed(1)));
  console.log('nenhum', r.nac.nenhum.toFixed(1), 'indeciso', r.nac.indeciso.toFixed(1));
  const val = paraValidos(r.nac, ids);
  console.log('válidos:', ordenarPor(val, ids).map(id => id + ' ' + val[id].toFixed(1)).join(' | '));
  const lideres = {};
  UFS.forEach(uf => { const o = r.uf[uf]; const l = ordenarPor(o, ids)[0]; lideres[uf] = l + ' ' + o[l].toFixed(0); });
  console.log(Object.entries(lideres).map(([u, l]) => u + ':' + l).join('  '));
}
show(r, 'dia 0');
jogo.percepcao = r.nac;
r = calcularIntencoes(jogo, { dia: 49, modo: 'pesquisa', rej: true });
show(r, 'dia 49 (sem campanha)');
jogo.percepcao = r.nac;
r = calcularIntencoes(jogo, { dia: 49, modo: 'urna', rej: true });
show(r, 'urna');
