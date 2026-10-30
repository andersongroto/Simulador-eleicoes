const { jogarAuto } = require('./simular');
const jogo = jogarAuto(+(process.argv[2] || 7), process.argv[3] || 'brandao', 'semanal', 'normal', 'SP');
const r = jogo.resEst1, r2 = jogo.resEst2 || { gov: {} };
let inc = 0, incV = 0, alinh = {};
UFS_MAPA.forEach(uf => {
  const g = r2.gov[uf] || r.gov[uf];
  const v = jogo.est.cands[g.ordem[0]];
  const cands = candsDisputa(jogo, uf, 'governador', true);
  const incumb = cands.find(c => c.incumbente);
  if (incumb) { inc++; if (incumb.id === v.id) incV++; }
  alinh[v.palanque || 'nenhum'] = (alinh[v.palanque || 'nenhum'] || 0) + 1;
  const s = r.sen[uf];
  console.log(uf, 'Gov:', v.urna, v.partido, (r2.gov[uf] ? '2T ' : '1T ') + g.pct[v.id].toFixed(1) + '%', (v.incumbente ? '(reeleito)' : ''), '| Sen:', s.ordem.slice(0, s.vagas).map(id => jogo.est.cands[id].urna + ' ' + jogo.est.cands[id].partido + ' ' + s.pct[id].toFixed(1)).join(', '));
});
console.log('incumbentes', inc, 'reeleitos', incV, '| governadores por palanque', alinh);
console.log('Câmara', Object.entries(r.camara).sort((a, b) => b[1] - a[1]).map(([s, n]) => s + ' ' + n).join(', '), '= ', Object.values(r.camara).reduce((a, b) => a + b));
console.log('Senado', Object.entries(r.senado).sort((a, b) => b[1] - a[1]).map(([s, n]) => s + ' ' + n).join(', '), '= ', Object.values(r.senado).reduce((a, b) => a + b));
console.log('Cláusula: não passaram', Object.entries(r.clausula).filter(([s, c]) => !c.passou).map(([s, c]) => s + ' ' + c.pct.toFixed(1) + '%').join(', '));
const sp = r.depfed.SP; console.log('SP QE', sp.qe, 'cadeiras', JSON.stringify(sp.cadeiras), 'eleitos top', sp.eleitos.slice(0, 5).map(e => e.urna + ' ' + e.sigla + ' ' + e.votos).join('; '));
const vias = {}; UFS_MAPA.forEach(uf => r.depfed[uf].eleitos.forEach(e => vias[e.via] = (vias[e.via] || 0) + 1)); console.log('vias', vias);
console.log('presidente eleito', jogo.vencedor, 'base', JSON.stringify(baseDoPresidente(jogo)));
