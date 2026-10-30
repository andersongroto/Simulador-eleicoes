/* Joga uma partida completa pela interface no Chromium (Playwright), registrando erros e capturas.
 * Uso: node tools/teste-ui.js [pasta-capturas] [candidato] [ritmo] */
const { chromium } = require('playwright');
const path = require('path');
const pasta = process.argv[2] || 'capturas';
const cand = process.argv[3] || 'helena';
const ritmo = process.argv[4] || 'semanal';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  const erros = [];
  page.on('pageerror', e => erros.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text()) && !/ERR_/.test(m.text())) erros.push('console: ' + m.text()); });
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const shot = async (nome) => page.screenshot({ path: path.join(pasta, nome + '.png'), fullPage: false });
  const clicar = async (sel) => { await page.click(sel); await page.waitForTimeout(60); };
  await shot('01-capa');
  await clicar('[data-a="novaCampanha"]');
  await clicar(`[data-a="cfg"][data-g="ritmo"][data-v="${ritmo}"]`);
  await shot('02-config');
  await clicar('[data-a="irEscolha"]');
  await shot('03-escolha');
  if (cand === 'criar') {
    await clicar('[data-a="irCriar"]');
    await page.fill('#c-nome', 'Joana Martins');
    await page.fill('#c-urna', 'Joana');
    await shot('03b-criar');
    await clicar('[data-a="confirmarCriacao"]');
  } else {
    await clicar(`[data-a="escolherPronto"][data-id="${cand}"]`);
  }
  // pré-campanha
  for (let i = 0; i < 4 && await page.$('[data-a="preVice"]'); i++) { await clicar('[data-a="preVice"]:not([disabled])'); }
  if (await page.$('[data-a="preViceProprio"]')) await clicar('[data-a="preViceProprio"]');
  await shot('04-coligacao');
  for (let i = 0; i < 3; i++) { const b = await page.$('[data-a="preNegociar"]:not([disabled])'); if (b) { await b.click(); await page.waitForTimeout(50); } }
  await clicar('[data-a="preAvancar"]');
  await shot('05-marqueteiro');
  await clicar('[data-a="preMarq"]:not([disabled])');
  for (let i = 0; i < 3; i++) { await page.locator('[data-a="preBandeira"]').nth(i).click(); await page.waitForTimeout(40); }
  await shot('06-programa');
  await clicar('[data-a="preIniciar"]');
  await shot('07-inicio-campanha');
  await clicar('[data-a="fecharModalEventos"]');
  let rod = 0, debates = 0;
  const resolverModais = async () => {
    for (let k = 0; k < 10; k++) {
      if (await page.$('[data-a="decidirEvento"]')) { if (rod < 3) await shot('evento-' + rod); await clicar('[data-a="decidirEvento"]:not([disabled])'); continue; }
      if (await page.$('#camada [data-a="fecharModalEventos"]')) { await clicar('#camada [data-a="fecharModalEventos"]'); continue; }
      if (await page.$('#camada [data-a="fecharResumo"]')) { if (rod < 2) await shot('resumo-' + rod); await clicar('#camada [data-a="fecharResumo"]'); continue; }
      break;
    }
  };
  for (let guard = 0; guard < 400; guard++) {
    const tela = await page.evaluate(() => UI.tela);
    if (tela === 'campanha') {
      await resolverModais();
      if (rod === 1) {
        for (const aba of ['pesquisas', 'apoios', 'estrategia', 'noticias', 'adversarios']) { await clicar(`[data-a="aba"][data-v="${aba}"]`); await shot('aba-' + aba); }
        await clicar('[data-a="aba"][data-v="agenda"]');
        await clicar('path[data-uf="SP"]');
        await clicar('[data-a="prepAcao"][data-t="comicio"][data-uf="SP"]');
        await shot('agenda-form');
        await clicar('[data-a="addAcao"]');
        for (const m of ['voce', 'presenca', 'governadores']) { await clicar(`[data-a="modoMapa"][data-v="${m}"]`); }
        await shot('mapa-governadores');
        await clicar('[data-a="modoMapa"][data-v="lider"]');
      }
      await clicar('[data-a="sugerirAgenda"]');
      if (rod === 0) await shot('agenda-cheia');
      await clicar('[data-a="avancar"]');
      if (await page.$('#camada [data-a="avancarMesmo"]')) await clicar('#camada [data-a="avancarMesmo"]');
      rod++;
      continue;
    }
    if (tela === 'sabatina') {
      await shot('sabatina');
      while (await page.$('[data-a="sabResp"]')) await clicar('[data-a="sabResp"]');
      await shot('sabatina-fim');
      await clicar('[data-a="sairSabatina"]');
      continue;
    }
    if (tela === 'debate') {
      if (debates === 0) await shot('debate-inicio');
      for (let k = 0; k < 20; k++) {
        if (await page.$('[data-a="debPerguntar"]')) { await clicar('[data-a="debTom"][data-v="propositiva"]'); await clicar('[data-a="debPerguntar"]'); continue; }
        if (await page.$('[data-a="debResp"]')) { await clicar('[data-a="debResp"]'); continue; }
        break;
      }
      if (debates === 0) await shot('debate-fim');
      debates++;
      await clicar('[data-a="sairDebate"]');
      continue;
    }
    if (tela === 'vespera') {
      await resolverModais();
      await shot('vespera-' + (await page.evaluate(() => JOGO.fase)));
      await clicar('[data-a="iniciarApuracao"]');
      await page.waitForTimeout(2500);
      await shot('apuracao-parcial-' + (await page.evaluate(() => JOGO.fase)));
      await clicar('[data-a="fimApur"]');
      await page.waitForTimeout(300);
      await shot('apuracao-fim-' + (await page.evaluate(() => JOGO.fase)));
      await clicar('[data-a="posApuracao"]');
      continue;
    }
    if (tela === 'entreturnos') {
      await shot('entreturnos');
      for (let k = 0; k < 8; k++) { const b = await page.$('[data-a="pedirApoio2"]'); if (!b) break; await b.click(); await page.waitForTimeout(50); }
      await clicar('[data-a="comecar2"]');
      continue;
    }
    if (tela === 'eliminado') { await shot('eliminado'); await clicar('[data-a="apoiarFinalista"]'); continue; }
    if (tela === 'fim') { await shot('fim'); await page.screenshot({ path: path.join(pasta, 'fim-inteira.png'), fullPage: true }); break; }
    erros.push('tela inesperada: ' + tela); break;
  }
  console.log('rodadas:', rod, 'debates:', debates, 'tela final:', await page.evaluate(() => UI.tela), 'vencedor:', await page.evaluate(() => JOGO && JOGO.vencedor));
  console.log(erros.length ? 'ERROS:\n' + erros.slice(0, 20).join('\n') : 'Sem erros de página.');
  await browser.close();
})();
