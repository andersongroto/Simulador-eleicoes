/* Carrega os scripts do jogo no Node (sem navegador) para testes e simulações. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const raiz = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
function carregar(filtro) {
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  for (const s of scripts) {
    if (filtro && !filtro(s)) continue;
    vm.runInThisContext(fs.readFileSync(path.join(raiz, s), 'utf8'), { filename: s });
  }
}
module.exports = { carregar };
