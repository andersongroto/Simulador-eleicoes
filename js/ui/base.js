/* Infraestrutura da interface: estado da UI, renderização, eventos, modais e gravação. */

var UI = {
  tela: 'inicio',       // inicio, config, escolha, criar, pre, campanha, debate, sabatina, vespera, apuracao, entreturnos, eliminado, fim
  aba: 'agenda',
  modoMapa: 'lider',
  ufSel: null,
  acaoSel: null,
  formAcao: {},
  config: { ritmo: 'semanal', dificuldade: 'normal', ano: 2026 },
  escolha: null,
  criar: null,
  pre: {},
  sab: null,
  apur: null
};
var JOGO = null;
var CHAVE_SAVE = 'simuladorEleicoes.save';

function $(sel) { return document.querySelector(sel); }

var TELAS = {};
var ACOES_UI = {};

function render() {
  var f = TELAS[UI.tela];
  var app = $('#app');
  if (!f || !app) return;
  var y = window.scrollY;
  app.innerHTML = f();
  if (TELAS[UI.tela + '_depois']) TELAS[UI.tela + '_depois']();
  if (UI.manterScroll) window.scrollTo(0, y);
  UI.manterScroll = false;
}

function irPara(tela) {
  UI.tela = tela;
  var t = $('#toast'); if (t) t.hidden = true;
  render();
  window.scrollTo(0, 0);
}

/* Re-renderiza mantendo a posição de rolagem. */
function atualizar() { UI.manterScroll = true; render(); }

document.addEventListener('click', function (ev) {
  var el = ev.target.closest('[data-a]');
  if (!el || el.disabled) return;
  var f = ACOES_UI[el.getAttribute('data-a')];
  if (f) { ev.preventDefault(); f(el.dataset, el, ev); }
});
document.addEventListener('change', function (ev) {
  var el = ev.target.closest('[data-mudar]');
  if (!el) return;
  var f = ACOES_UI[el.getAttribute('data-mudar')];
  if (f) f(el.dataset, el, ev);
});
document.addEventListener('input', function (ev) {
  var el = ev.target.closest('[data-digitar]');
  if (!el) return;
  var f = ACOES_UI[el.getAttribute('data-digitar')];
  if (f) f(el.dataset, el, ev);
});
document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape' && UI.modalFechavel) fecharModal();
});

/* ---------- Modal e avisos ---------- */
function abrirModal(html, opts) {
  opts = opts || {};
  var camada = $('#camada');
  camada.innerHTML = '<div class="fundo-modal" role="dialog" aria-modal="true"><div class="modal' + (opts.largo ? ' largo' : '') + '">' + html + '</div></div>';
  UI.modalFechavel = opts.fechavel !== false;
  var b = camada.querySelector('button, [tabindex]');
  if (b) b.focus();
}
function fecharModal() { $('#camada').innerHTML = ''; UI.modalFechavel = false; }
function modalAberto() { return !!$('#camada').innerHTML; }

var _toastTimer = null;
function toast(msg) {
  var t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function () { t.hidden = true; }, 3200);
}

/* ---------- Gravação ---------- */
function serializar(jogo) {
  var copia = {};
  for (var k in jogo) if (k !== '_cache') copia[k] = jogo[k];
  copia.rng = RNG.estado;
  return JSON.stringify(copia);
}
function salvarJogo(silencioso) {
  if (!JOGO) return;
  try {
    localStorage.setItem(CHAVE_SAVE, serializar(JOGO));
    if (!silencioso) toast('Campanha salva neste navegador.');
  } catch (e) { if (!silencioso) toast('Não foi possível salvar: o navegador bloqueou o armazenamento.'); }
}
function temJogoSalvo() {
  try { return !!localStorage.getItem(CHAVE_SAVE); } catch (e) { return false; }
}
function restaurarJogo(texto) {
  var j = JSON.parse(texto);
  RNG.estado = j.rng || { s: 1 };
  j.rng = RNG.estado;
  JOGO = j;
  atualizarCache(JOGO);
  return JOGO;
}
function carregarJogo() {
  try {
    var t = localStorage.getItem(CHAVE_SAVE);
    if (!t) return false;
    restaurarJogo(t);
    return true;
  } catch (e) { return false; }
}
function apagarJogo() { try { localStorage.removeItem(CHAVE_SAVE); } catch (e) { /* ignora */ } }
function lerRecordes() {
  try { return JSON.parse(localStorage.getItem('simuladorEleicoes.recordes') || '[]'); } catch (e) { return []; }
}

/* ---------- Componentes ---------- */
function cor(c) { return 'var(--c' + c.cor + ')'; }
function corId(id) { var c = candPorId(JOGO, id); return c ? cor(c) : 'var(--muted)'; }
function esc(s) { return escapar(s); }

function ptCand(c) { return '<span class="pt" style="--cor:' + cor(c) + '"></span>'; }
function nomeCand(c) { return ptCand(c) + esc(c.urna); }

function barrasIntencao(dist, ids, opts) {
  opts = opts || {};
  var max = opts.max || Math.max.apply(null, ids.map(function (id) { return dist[id] || 0; }).concat([opts.min || 10]));
  var linhas = ids.map(function (id) {
    var c = candPorId(JOGO, id);
    var v = dist[id] || 0;
    var cls = 'barra-linha' + (c && c.jogador ? ' voce' : '') + (c && !c.ativo && opts.marcarFora ? ' fora' : '');
    return '<div class="' + cls + '" style="--cor:' + cor(c) + '"><div class="nm"><span class="pt"></span>' + esc(c.urna) + (c.jogador ? ' <span class="mudo">(você)</span>' : '') + '</div>' +
      '<div class="trilho"><div class="ench" style="width:' + (v / max * 100).toFixed(1) + '%"></div></div><div class="val">' + fmtNum(v, opts.casas || 0) + '%</div></div>';
  });
  if (opts.extras) opts.extras.forEach(function (ex) {
    linhas.push('<div class="barra-linha" style="--cor:var(--muted)"><div class="nm mudo">' + esc(ex[0]) + '</div><div class="trilho"><div class="ench" style="width:' + (ex[1] / max * 100).toFixed(1) + '%;background:var(--surface-3)"></div></div><div class="val mudo">' + fmtNum(ex[1], opts.casas || 0) + '%</div></div>');
  });
  return '<div class="barras">' + linhas.join('') + '</div>';
}

function digitosUrna(numero) {
  return '<div class="digitos">' + String(numero).split('').map(function (d) { return '<div class="digito">' + d + '</div>'; }).join('') + '</div>';
}

function atributosHtml(attr) {
  var nomes = { carisma: 'Carisma', oratoria: 'Oratória', gestao: 'Gestão', articulacao: 'Articulação', integridade: 'Integridade' };
  return '<div class="atributos">' + Object.keys(nomes).map(function (k) {
    return '<div class="atributo"><span class="mudo">' + nomes[k] + '</span><div class="trilho"><div class="enchimento" style="width:' + attr[k] + '%"></div></div><span class="tnum">' + Math.round(attr[k]) + '</span></div>';
  }).join('') + '</div>';
}

function nomeDia(dia) { return fmtData(JOGO.cal, dia); }
