/* Inicialização. */
(function () {
  function iniciar(dados) {
    if (dados && dados.jogo) {
      try { restaurarJogo(dados.jogo); UI.tela = dados.tela || 'campanha'; } catch (e) { JOGO = null; }
    }
    if (JOGO && UI.tela !== 'inicio') retomarTela();
    else render();
  }
  var hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) {
    hot.snapshot(function () { return JOGO ? { jogo: serializar(JOGO), tela: UI.tela } : {}; });
  }
  if (hot && hot.ready) hot.ready(iniciar);
  else iniciar((hot && hot.data) || {});
})();
