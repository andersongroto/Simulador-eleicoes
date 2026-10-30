/* Utilidades gerais: números aleatórios com semente, formatação pt-BR, matemática. */

/* Gerador mulberry32. O estado fica em RNG.estado.s, que é salvo junto com o jogo. */
var RNG = { estado: { s: 1 } };
function semear(seed) { RNG.estado = { s: seed >>> 0 }; }
function rand() {
  var t = (RNG.estado.s = (RNG.estado.s + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function randn() {
  var u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function randInt(a, b) { return a + Math.floor(rand() * (b - a + 1)); }
function chance(p) { return rand() < p; }
function escolher(arr) { return arr[Math.floor(rand() * arr.length)]; }
function escolherPeso(arr, pesoFn) {
  var tot = 0, i, pesos = arr.map(function (x) { var p = Math.max(0, pesoFn(x)); tot += p; return p; });
  if (tot <= 0) return arr[0];
  var r = rand() * tot;
  for (i = 0; i < arr.length; i++) { r -= pesos[i]; if (r <= 0) return arr[i]; }
  return arr[arr.length - 1];
}
function embaralhar(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
/* Hash determinístico de texto (para ruídos estáveis, sem consumir o gerador). */
function hashTexto(s) {
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/* Ruído normal estável a partir de uma chave. */
function ruidoFixo(chave) {
  var h1 = hashTexto(chave), h2 = hashTexto(chave + '#');
  var u = (h1 + 1) / 4294967297, v = (h2 + 1) / 4294967297;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
function lerp(a, b, t) { return a + (b - a) * t; }
function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
function soma(arr) { var t = 0; for (var i = 0; i < arr.length; i++) t += arr[i]; return t; }
function copiar(o) { return JSON.parse(JSON.stringify(o)); }

/* ---------- Formatação ---------- */
function fmtNum(n, casas) {
  casas = casas || 0;
  var s = Math.abs(n).toFixed(casas).split('.');
  s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '−' : '') + s.join(',');
}
function fmtPct(x, casas) { return fmtNum(x, casas === undefined ? 1 : casas) + '%'; }
function fmtDinheiro(mi) {
  if (Math.abs(mi) < 1) return 'R$ ' + fmtNum(mi * 1000, 0) + ' mil';
  return 'R$ ' + fmtNum(mi, 1) + ' mi';
}
function fmtSinal(x, casas) { return (x > 0 ? '+' : '') + fmtNum(x, casas === undefined ? 1 : casas); }
function fmtVotos(n) { return fmtNum(Math.round(n)); }
function maiuscula(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function escapar(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* ---------- Gênero gramatical ---------- */
function oa(c) { return c && c.genero === 'F' ? 'a' : 'o'; }
function OA(c) { return c && c.genero === 'F' ? 'A' : 'O'; }
function candidatoA(c) { return c && c.genero === 'F' ? 'candidata' : 'candidato'; }
function senhorA(c) { return c && c.genero === 'F' ? 'senhora' : 'senhor'; }
function eleitoA(c) { return c && c.genero === 'F' ? 'eleita' : 'eleito'; }
function eleA(c) { return c && c.genero === 'F' ? 'ela' : 'ele'; }
