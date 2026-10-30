/* Joga uma partida completa pela interface no Chromium (Playwright), registrando erros e capturas.
 * Uso: node tools/teste-ui.js [pasta-capturas] [candidato|criar|governador|senador|depfed|depest] [ritmo] [UF] */
const { chromium } = require('playwright');
const path = require('path');
const pasta = process.argv[2] || 'capturas';
const quem = process.argv[3] || 'helena';
const ritmo = process.argv[4] || 'semanal';
const uf = process.argv[5] || 'MG';
const estadual = ['governador', 'senador', 'depfed', 'depest'].includes(quem);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  const erros = [];
  page.on('pageerror', e => erros.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text()) && !/ERR_/.test(m.text())) erros.push('console: ' + m.text()); });
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const shot = async (nome) => page.screenshot({ path: path.join(pasta, nome + '.png'), fullPage: false });
  const clicar = async (sel) => { await page.click(sel); await page.waitForTimeout(60); };
  const existe = async (sel) => !!(await page.$(sel));
  const tela = () => page.evaluate(() => UI.tela);
  await shot('01-capa');
  await clicar('[data-a="novaCampanha"]');
  await clicar(`[data-a="cfg"][data-g="cargo"][data-v="${estadual ? quem : 'presidente'}"]`);
  if (estadual) await page.selectOption('#cfg-uf', uf);
  await clicar(`[data-a="cfg"][data-g="ritmo"][data-v="${ritmo}"]`);
  await shot('02-config');
  if (estadual || quem === 'criar') {
    await clicar(estadual ? '[data-a="irCriar"]' : '[data-a="irEscolha"]');
    if (!estadual) await clicar('[data-a="irCriar"]');
    await clicar('[data-a="sortearCandidato"]');
    await shot('03-criar');
    await clicar('[data-a="confirmarCriacao"]');
  } else {
    await clicar('[data-a="irEscolha"]');
    await shot('03-escolha');
    await clicar(`[data-a="escolherPronto"][data-id="${quem}"]`);
  }
  // pré-campanha: percorre as etapas que aparecerem
  const vistas = {};
  for (let g = 0; g < 40 && (await tela()) === 'pre'; g++) {
    const etapa = await page.evaluate(() => JOGO.etapaPre);
    if (!vistas[etapa]) { vistas[etapa] = true; await shot('04-pre-' + etapa); }
    if (await existe('[data-a="preViceProprio"]')) { await clicar('[data-a="preViceProprio"]'); continue; }
    if (await existe('[data-a="preVice"]:not([disabled])')) { await clicar('[data-a="preVice"]:not([disabled])'); continue; }
    if (await existe('[data-a="preViceGov"]:not([disabled])')) { await clicar('[data-a="preViceGov"]:not([disabled])'); continue; }
    if (etapa === 'coligacao') {
      for (let i = 0; i < 3; i++) { const b = await page.$('[data-a="preNegociar"]:not([disabled]), [data-a="preNegociarEst"]:not([disabled])'); if (b) { await b.click(); await page.waitForTimeout(50); } }
      await clicar('[data-a="preAvancar"]'); continue;
    }
    if (etapa === 'palanques') { if (await existe('[data-a="preLancar"]')) await clicar('[data-a="preLancar"]'); await clicar('[data-a="preAvancar"]'); continue; }
    if (await existe('[data-a="preDobrada"]')) { await clicar('[data-a="preDobrada"]'); continue; }
    if (await existe('[data-a="preMarq"]:not([disabled])')) { await clicar('[data-a="preMarq"]:not([disabled])'); continue; }
    if (await existe('[data-a="prePalanque"]')) { await clicar('[data-a="prePalanque"]'); continue; }
    if (await existe('[data-a="preBandeira"]')) {
      for (let i = 0; i < 3; i++) { await page.locator('[data-a="preBandeira"]').nth(i).click(); await page.waitForTimeout(40); }
      await clicar('[data-a="preIniciar"]'); continue;
    }
    erros.push('etapa sem ação: ' + etapa); break;
  }
  await shot('07-inicio-campanha');
  if (await existe('#camada [data-a="fecharModalEventos"]')) await clicar('#camada [data-a="fecharModalEventos"]');
  let rod = 0, debates = 0, abasFeitas = false;
  const resolverModais = async () => {
    for (let k = 0; k < 10; k++) {
      if (await existe('[data-a="decidirEvento"]')) { if (rod < 3) await shot('evento-' + rod); await clicar('[data-a="decidirEvento"]:not([disabled])'); continue; }
      if (await existe('#camada [data-a="fecharModalEventos"]')) { await clicar('#camada [data-a="fecharModalEventos"]'); continue; }
      if (await existe('#camada [data-a="fecharResumo"]')) { if (rod < 2) await shot('resumo-' + rod); await clicar('#camada [data-a="fecharResumo"]'); continue; }
      break;
    }
  };
  for (let guard = 0; guard < 400; guard++) {
    const t = await tela();
    if (t === 'campanha') {
      await resolverModais();
      if (rod === 1 && !abasFeitas) {
        abasFeitas = true;
        const abas = await page.$$eval('.abas [data-a="aba"]', els => els.map(e => e.getAttribute('data-v')));
        for (const aba of abas) { await clicar(`[data-a="aba"][data-v="${aba}"]`); await shot('aba-' + aba); }
        await clicar('[data-a="aba"][data-v="agenda"]');
      }
      await clicar('[data-a="sugerirAgenda"]');
      if (rod === 0) await shot('agenda-cheia');
      await clicar('[data-a="avancar"]');
      if (await existe('#camada [data-a="avancarMesmo"]')) await clicar('#camada [data-a="avancarMesmo"]');
      rod++;
      continue;
    }
    if (t === 'sabatina') {
      await shot('sabatina');
      while (await existe('[data-a="sabResp"]')) await clicar('[data-a="sabResp"]');
      await clicar('[data-a="sairSabatina"]');
      continue;
    }
    if (t === 'debate') {
      if (debates === 0) await shot('debate-inicio');
      for (let k = 0; k < 20; k++) {
        if (await existe('[data-a="debPerguntar"]')) { await clicar('[data-a="debTom"][data-v="propositiva"]'); await clicar('[data-a="debPerguntar"]'); continue; }
        if (await existe('[data-a="debResp"]')) { await clicar('[data-a="debResp"]'); continue; }
        break;
      }
      if (debates === 0) await shot('debate-fim');
      debates++;
      await clicar('[data-a="sairDebate"]');
      continue;
    }
    if (t === 'vespera') {
      await resolverModais();
      const fase = await page.evaluate(() => JOGO.fase);
      await shot('vespera-' + fase);
      await clicar('[data-a="iniciarApuracao"]');
      await page.waitForTimeout(2500);
      await shot('apuracao-parcial-' + fase);
      const abas = await page.$$eval('.abas-apur [data-a="abaApur"]', els => els.map(e => e.getAttribute('data-v')));
      for (const aba of abas) { await clicar(`[data-a="abaApur"][data-v="${aba}"]`); await page.waitForTimeout(400); await shot('apur-' + fase + '-' + aba); }
      await clicar('[data-a="fimApur"]');
      await page.waitForTimeout(400);
      await shot('apuracao-fim-' + fase);
      await clicar('[data-a="posApuracao"]');
      continue;
    }
    if (t === 'entreturnos' || t === 'entreturnosGov') {
      await shot(t);
      for (let k = 0; k < 8; k++) { const b = await page.$('[data-a="pedirApoio2"], [data-a="pedirApoioGov"]'); if (!b) break; await b.click(); await page.waitForTimeout(50); }
      await clicar('[data-a="comecar2"]');
      continue;
    }
    if (t === 'eliminado') { await shot('eliminado'); await clicar('[data-a="apoiarFinalista"]'); continue; }
    if (t === 'acompanhar') { await shot('acompanhar'); await page.screenshot({ path: path.join(pasta, 'acompanhar-inteira.png'), fullPage: true }); await clicar('[data-a="acompanharSegundo"]'); continue; }
    if (t === 'fim') { await shot('fim'); await page.screenshot({ path: path.join(pasta, 'fim-inteira.png'), fullPage: true }); break; }
    erros.push('tela inesperada: ' + t); break;
  }
  console.log('rodadas:', rod, 'debates:', debates, 'tela final:', await tela(), 'venceu:', await page.evaluate(() => JOGO && JOGO.venceuJogador));
  console.log(erros.length ? 'ERROS:\n' + erros.slice(0, 20).join('\n') : 'Sem erros de página.');
  await browser.close();
})();
