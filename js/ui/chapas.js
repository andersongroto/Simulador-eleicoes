/* Aba "Palanques" do candidato a presidente: aliados nos estados e projeção da bancada. */

function abaPalanques() {
  var c = jogador(JOGO);
  if (!UI.projCamara || UI.projCamara.dia !== JOGO.dia) UI.projCamara = { dia: JOGO.dia, cad: projecaoCamara(JOGO) };
  var cad = UI.projCamara.cad;
  var minha = soma(c.coligacao.map(function (s) { return cad[s] || 0; }));
  var liderando = 0, comPalanque = 0;
  var linhas = UFS_MAPA.slice().sort(function (a, b) { return ESTADO_POR_UF[b].eleitores - ESTADO_POR_UF[a].eleitores; }).map(function (uf) {
    var al = palanqueNoEstado(JOGO, uf, c.id);
    var p = ultimaPesquisaEst(JOGO, uf, 'governador');
    var lider = p ? ordenarPor(p.res, p.ids)[0] : null;
    if (al) comPalanque++;
    if (al && lider === al.id) liderando++;
    var minhaEstado = JOGO._cache.uf[uf] ? JOGO._cache.uf[uf][c.id] : null;
    var lc = lider ? JOGO.est.cands[lider] : null;
    return '<tr><td>' + uf + '</td><td>' + (al ? nomeCand(al) + ' <span class="mudo">' + al.partido + '</span>' : '<span class="mudo">Sem palanque</span>') + '</td>' +
      '<td class="n">' + (al && p && p.res[al.id] !== undefined ? p.res[al.id] + '%' : '—') + '</td>' +
      '<td>' + (lc ? (lc === al ? '<b class="bom">Seu aliado</b>' : nomeCand(lc)) : '—') + '</td>' +
      '<td class="n">' + (minhaEstado !== null ? fmtNum(minhaEstado, 0) + '%' : '—') + '</td>' +
      '<td><div class="lado" style="flex-wrap:nowrap"><button class="btn btn-peq" data-a="prepAcao" data-t="comicioConjunto" data-uf="' + uf + '" title="Comício no estado' + (al ? ' com ' + esc(al.urna) : '') + '">Comício</button>' +
      (al ? '<button class="btn btn-peq" data-a="repassar" data-id="' + al.id + '" title="Repassar R$ 1 milhão para ' + esc(al.urna) + '"' + (podePagar(JOGO, c, 1) ? '' : ' disabled') + '>+R$ 1 mi</button>' : '') + '</div></td></tr>';
  }).join('');
  return '<p class="sec pequeno">Seus palanques nos estados puxam votos para você, e você puxa votos para eles. Comícios com o aliado fortalecem os dois; repasses de recursos saem do seu caixa e contam no seu teto de gastos.</p>' +
    '<div class="resumo-votos">' +
    '<div class="it"><span class="rotulo">Estados com palanque</span><span class="v">' + comPalanque + ' de 27</span></div>' +
    '<div class="it"><span class="rotulo">Aliados liderando</span><span class="v">' + liderando + '</span></div>' +
    '<div class="it"><span class="rotulo">Bancada projetada da coligação</span><span class="v">' + minha + ' deputados</span></div>' +
    '<div class="it"><span class="rotulo">Maioria na Câmara</span><span class="v">257</span></div></div>' +
    '<div class="tabela-caixa"><table class="tabela"><thead><tr><th>UF</th><th>Governador aliado</th><th class="n">Pesq.</th><th>Lidera</th><th class="n">Você no estado</th><th></th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
    '<div class="divisor"></div><h4>Projeção da Câmara (513 cadeiras)</h4>' + barrasPartidos(cad, c.coligacao);
}

/* Barras de bancada por partido, coloridas pelo campo ideológico. */
function barrasPartidos(cad, destaque) {
  var ord = Object.keys(cad).filter(function (s) { return cad[s] > 0; }).sort(function (a, b) { return cad[b] - cad[a]; });
  var max = cad[ord[0]] || 1;
  return '<div class="barras">' + ord.map(function (s) {
    var p = PARTIDO_POR_SIGLA[s];
    return '<div class="barra-linha' + (destaque && destaque.indexOf(s) >= 0 ? ' voce' : '') + '" style="--cor:' + corIdeologia(p.ideo) + '"><div class="nm"><span class="pt"></span>' + s + '</div><div class="trilho"><div class="ench" style="width:' + (cad[s] / max * 100).toFixed(1) + '%"></div></div><div class="val">' + cad[s] + '</div></div>';
  }).join('') + '</div><p class="mudo pequeno">Cores pelo campo ideológico: esquerda em vermelho, centro em cinza, direita em azul.' + (destaque ? ' Em negrito, partidos da sua coligação.' : '') + '</p>';
}

ACOES_UI.repassar = function (d) {
  if (repassarRecursos(JOGO, d.id, 1)) toast('R$ 1 mi repassado para ' + JOGO.est.cands[d.id].urna + '.');
  atualizar();
};
