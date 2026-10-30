/* Gráficos em SVG: linhas (pesquisas ao longo do tempo) e mapa do Brasil. */

var GRAFICOS = {};
var _idGraf = 0;

/* series: [{ id, nome, cor, pontos: [{x, y}] }] */
function graficoLinhas(cfg) {
  var id = 'g' + (++_idGraf);
  var estreito = typeof window !== 'undefined' && window.innerWidth < 600;
  var W = estreito ? 400 : 640, H = cfg.altura || (estreito ? 260 : 250), mL = 30, mR = estreito ? 92 : 96, mT = 10, mB = 24;
  var xMin = cfg.xMin, xMax = Math.max(cfg.xMax, cfg.xMin + 1);
  var yMax = Math.max(10, Math.ceil((cfg.yMax || 50) / 10) * 10);
  var sx = function (x) { return mL + (x - xMin) / (xMax - xMin) * (W - mL - mR); };
  var sy = function (y) { return mT + (1 - y / yMax) * (H - mT - mB); };
  var partes = [];
  partes.push('<g class="grade">');
  for (var y = 0; y <= yMax; y += 10) partes.push('<line x1="' + mL + '" x2="' + (W - mR) + '" y1="' + sy(y) + '" y2="' + sy(y) + '"></line>');
  partes.push('</g><g class="eixo">');
  for (var y2 = 0; y2 <= yMax; y2 += 10) partes.push('<text x="' + (mL - 6) + '" y="' + (sy(y2) + 3) + '" text-anchor="end">' + y2 + '%</text>');
  (cfg.ticksX || []).forEach(function (t) {
    partes.push('<text x="' + sx(t.x) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(t.rotulo) + '</text>');
  });
  partes.push('</g>');
  partes.push('<line class="base" x1="' + mL + '" x2="' + (W - mR) + '" y1="' + sy(0) + '" y2="' + sy(0) + '"></line>');
  (cfg.marcos || []).forEach(function (m) {
    if (m.x < xMin || m.x > xMax) return;
    partes.push('<g class="marco"><line x1="' + sx(m.x) + '" x2="' + sx(m.x) + '" y1="' + mT + '" y2="' + (H - mB) + '"></line><text x="' + (sx(m.x) + 3) + '" y="' + (mT + 8) + '">' + esc(m.rotulo) + '</text></g>');
  });
  var fins = [];
  cfg.series.forEach(function (s) {
    if (!s.pontos.length) return;
    var d = s.pontos.map(function (p, i) { return (i ? 'L' : 'M') + sx(p.x).toFixed(1) + ' ' + sy(p.y).toFixed(1); }).join('');
    partes.push('<path class="serie" d="' + d + '" stroke="' + s.cor + '"></path>');
    var u = s.pontos[s.pontos.length - 1];
    fins.push({ s: s, x: sx(u.x), y: sy(u.y), v: u.y });
  });
  // rótulos no fim das linhas, com linhas-guia quando precisam ser afastados
  fins.sort(function (a, b) { return a.y - b.y; });
  var rotulados = fins.filter(function (f) { return f.v >= (cfg.minRotulo || 3); }).slice(0, 6);
  var ultimoY = -999;
  rotulados.forEach(function (f) { f.ly = Math.max(f.y, ultimoY + 13); ultimoY = f.ly; });
  fins.forEach(function (f) {
    partes.push('<circle class="ponto-fim" cx="' + f.x + '" cy="' + f.y + '" r="4" fill="' + f.s.cor + '"></circle>');
  });
  rotulados.forEach(function (f) {
    var lx = W - mR + 10;
    if (Math.abs(f.ly - f.y) > 2) partes.push('<line x1="' + (f.x + 5) + '" y1="' + f.y + '" x2="' + (lx - 2) + '" y2="' + f.ly + '" stroke="' + f.s.cor + '" stroke-width="1"></line>');
    var nm = f.s.nome.length > 13 ? f.s.nome.split(' ').slice(-1)[0].slice(0, 12) : f.s.nome;
    partes.push('<text class="rot-fim" x="' + lx + '" y="' + (f.ly + 4) + '">' + esc(nm) + ' ' + fmtNum(f.v, 0) + '%</text>');
  });
  partes.push('<line class="mira" x1="0" x2="0" y1="' + mT + '" y2="' + (H - mB) + '" style="display:none"></line>');
  partes.push('<rect x="' + mL + '" y="' + mT + '" width="' + (W - mL - mR) + '" height="' + (H - mT - mB) + '" fill="transparent" class="area-hover"></rect>');
  GRAFICOS[id] = { cfg: cfg, W: W, H: H, sx: sx, sy: sy, mL: mL, mR: mR };
  var legenda = '<div class="legenda">' + cfg.series.map(function (s) { return '<span class="it"><span class="sw" style="--cor:' + s.cor + '"></span>' + esc(s.nome) + '</span>'; }).join('') + '</div>';
  return '<div class="pilha" style="gap:8px">' + legenda + '<div class="grafico" id="' + id + '"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(cfg.titulo || 'Gráfico') + '">' + partes.join('') + '</svg><div class="dica" hidden></div></div></div>';
}

function ligarGraficos() {
  Object.keys(GRAFICOS).forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) { delete GRAFICOS[id]; return; }
    if (el._ligado) return;
    el._ligado = true;
    var g = GRAFICOS[id], svg = el.querySelector('svg'), mira = el.querySelector('.mira'), dica = el.querySelector('.dica');
    var xs = [];
    g.cfg.series.forEach(function (s) { s.pontos.forEach(function (p) { if (xs.indexOf(p.x) < 0) xs.push(p.x); }); });
    xs.sort(function (a, b) { return a - b; });
    function mover(ev) {
      var r = svg.getBoundingClientRect();
      var px = (ev.clientX - r.left) / r.width * g.W;
      var melhor = xs[0], md = 1e9;
      xs.forEach(function (x) { var d = Math.abs(g.sx(x) - px); if (d < md) { md = d; melhor = x; } });
      mira.setAttribute('x1', g.sx(melhor)); mira.setAttribute('x2', g.sx(melhor)); mira.style.display = '';
      var vals = g.cfg.series.map(function (s) {
        var p = null; s.pontos.forEach(function (q) { if (q.x <= melhor) p = q; });
        return p ? { s: s, v: p.y } : null;
      }).filter(Boolean).sort(function (a, b) { return b.v - a.v; });
      dica.innerHTML = '<div class="rotulo" style="color:var(--urna-muted)">' + esc(g.cfg.fmtX ? g.cfg.fmtX(melhor) : melhor) + '</div>' +
        vals.map(function (v) { return '<div class="l" style="--cor:' + v.s.cor + '"><i></i><span>' + esc(v.s.nome) + '</span><b class="tnum">' + fmtNum(v.v, 0) + '%</b></div>'; }).join('');
      dica.hidden = false;
      var left = (g.sx(melhor) / g.W) * r.width + 12;
      if (left > r.width - 170) left = (g.sx(melhor) / g.W) * r.width - 172;
      dica.style.left = Math.max(0, left) + 'px';
      dica.style.top = '8px';
    }
    svg.addEventListener('mousemove', mover);
    svg.addEventListener('mouseleave', function () { mira.style.display = 'none'; dica.hidden = true; });
  });
}

/* ---------- Mapa ---------- */
/* opts.preencher(uf) → { cor, opacidade }; opts.dica(uf) → html; opts.sel: UF selecionada */
function mapaSvg(opts) {
  var M = MAPA_BRASIL;
  var paths = UFS_MAPA.map(function (uf) {
    var f = opts.preencher(uf);
    return '<path data-uf="' + uf + '" d="' + M.ufs[uf].d + '" fill="' + f.cor + '" fill-opacity="' + (f.opacidade === undefined ? 1 : f.opacidade) + '"' + (opts.sel === uf ? ' class="sel"' : '') + ' data-a="' + (opts.acao || 'selUF') + '" data-v="' + uf + '"><title>' + esc(ESTADO_POR_UF[uf].nome) + '</title></path>';
  });
  // UFs pequenas do litoral nordestino e o DF recebem rótulos deslocados
  var desloc = { RN: [14, -4], PB: [16, 2], PE: [26, 2], AL: [18, 6], SE: [14, 8], ES: [14, 6], RJ: [10, 10], DF: [0, -2], SC: [6, 0] };
  var labels = UFS_MAPA.map(function (uf) {
    var u = M.ufs[uf], d = desloc[uf] || [0, 0];
    return '<text x="' + (u.cx + d[0]) + '" y="' + (u.cy + d[1] + 3) + '" text-anchor="middle">' + uf + '</text>';
  });
  return '<svg class="mapa-svg" viewBox="' + M.viewBox + '" role="img" aria-label="' + esc(opts.titulo || 'Mapa do Brasil') + '">' + paths.join('') + labels.join('') + '</svg>';
}

function ligarDicasMapa(container, dicaFn) {
  if (!container) return;
  var svg = container.querySelector('svg'), dica = container.querySelector('.dica-mapa');
  if (!svg || !dica) return;
  svg.addEventListener('mousemove', function (ev) {
    var p = ev.target.closest('path');
    if (!p) { dica.hidden = true; return; }
    var r = container.getBoundingClientRect();
    dica.innerHTML = dicaFn(p.getAttribute('data-uf'));
    dica.hidden = false;
    var x = ev.clientX - r.left + 14, y = ev.clientY - r.top + 14;
    if (x > r.width - 250) x = ev.clientX - r.left - 250;
    dica.style.left = Math.max(0, x) + 'px';
    dica.style.top = y + 'px';
  });
  svg.addEventListener('mouseleave', function () { dica.hidden = true; });
}

/* Escala sequencial de 7 passos (azul) a partir de limites. */
function corSequencial(v, limites) {
  var i = 0;
  while (i < limites.length && v >= limites[i]) i++;
  return 'var(--seq-' + Math.min(6, i) + ')';
}

function escalaHtml(limites, sufixo) {
  var passos = [];
  for (var i = 0; i <= limites.length && i < 7; i++) passos.push('<i style="background:var(--seq-' + i + ')"></i>');
  return '<div class="escala"><span>' + (sufixo === '%' ? '0%' : '0') + '</span><span class="grad">' + passos.join('') + '</span><span>' + limites[limites.length - 1] + (sufixo || '') + '+</span></div>';
}
