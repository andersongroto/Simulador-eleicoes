/* Gera uma versão do jogo em um único arquivo HTML (CSS e JS embutidos).
 * Uso: node tools/gerar-arquivo-unico.js [saida.html] [--fragmento]
 * --fragmento omite <!doctype>, <html>, <head> e <body> (para hospedagens que montam o esqueleto). */
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const args = process.argv.slice(2);
const fragmento = args.includes('--fragmento');
const saida = args.find(a => !a.startsWith('--')) || path.join(raiz, 'dist', 'palanque.html');
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(raiz, 'css', 'estilo.css'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const js = scripts.map(s => '/* ' + s + ' */\n' + fs.readFileSync(path.join(raiz, s), 'utf8')).join('\n');
const fontes = html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/)[0];
const titulo = '<title>Palanque</title>';
const corpo = '<div id="app"></div>\n<div id="camada"></div>\n<div id="toast" class="toast" role="status" hidden></div>\n' +
  '<script>\n' + js.replace(/<\/script/gi, '<\\/script') + '\n</script>\n';
let out;
if (fragmento) {
  out = titulo + '\n<meta name="claude:viewport-fit-sides" content="cover">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' + fontes + '\n<style>\n' + css + '\n</style>\n' + corpo;
} else {
  out = '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + titulo + '\n' +
    fontes + '\n<style>\n' + css + '\n</style>\n</head>\n<body>\n' + corpo + '</body>\n</html>\n';
}
fs.mkdirSync(path.dirname(saida), { recursive: true });
fs.writeFileSync(saida, out);
console.log('Gerado:', saida, (out.length / 1024).toFixed(0) + ' KB');
