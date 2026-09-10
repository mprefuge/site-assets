const { chromium } = require('playwright');

const results = [];
const check = (n, a, e) => {
  const ok = a === e;
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `\n        got:      ${a}\n        expected: ${e}`}`);
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 900, height: 1500 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const posted = [];
  page.on('console', (m) => {
    const t = m.text();
    if (t.startsWith('__POSTED__')) { try { posted.push(JSON.parse(t.slice(10))); } catch (e) {} }
  });

  await page.goto('http://localhost:8000/dev/hospitality-guide-preview.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const inner = window.fetch;
    window.fetch = function (u, o) {
      try { console.log('__POSTED__' + JSON.stringify({ url: String(u), body: (o && o.body) || null })); } catch (e) {}
      return inner(u, o);
    };
  });

  const p = 'hg-embedded';
  const $ = (id) => page.locator(`#${p}-${id}`);

  // --- step 1 must stop at the subtotal --------------------------------------
  await $('qty').fill('10');
  await page.waitForTimeout(150);
  check('step 1 last line is labelled Subtotal',
    (await page.locator(`#${p}-step1-lines .hg-line-total span`).first().textContent()).trim(), 'Subtotal');
  check('step 1 shows the tax base, not a total', (await $('order-total').textContent()).trim(), '$400.00');
  check('step 1 explains the missing total', await $('await-address').isVisible(), true);

  const fillAndAdvance = async (state) => {
    await $('next1').click();
    const vals = [['organization-name', 'Test Church'], ['firstname', 'Pat'], ['lastname', 'Buyer'],
                  ['email', 'pat@example.org'], ['phone', '5025550123']];
    for (const [id, v] of vals) await $(id).fill(v);
    await $('enter-manually').click();
    await $('addr1').fill('1 Main St');
    await $('city').fill('Somewhere');
    await $('state').selectOption(state);
    await $('zip').fill('40202');
    await $('country').selectOption('United States');
    await $('next2').click();
    await page.waitForTimeout(250);
  };

  // --- Kentucky: 6% -----------------------------------------------------------
  await fillAndAdvance('KY - Kentucky');
  check('tax line is visible', await $('review-tax-line').isVisible(), true);
  check('tax line names the rate', (await $('review-tax-label').textContent()).trim(), 'KY sales tax (6%)');
  check('6% of $400.00', (await $('review-tax').textContent()).trim(), '$24.00');
  check('total is base plus tax', (await $('review-total').textContent()).trim(), '$424.00');
  check('pay button matches', (await $('submit').textContent()).trim(), 'Pay $424.00');

  // --- cover fees must gross up on the TAX-INCLUSIVE total -------------------
  await $('cover-fee').check();
  await page.waitForTimeout(200);
  // ceil((42400 + 30) * 10000 / 9780) = 43385 cents. Rounded UP so the
  // processor's cut can never leave the organisation short of the tax it owes.
  check('fee grosses up on the tax-inclusive total', (await $('review-total').textContent()).trim(), '$433.85');
  check('tax is not itself grossed up', (await $('review-tax').textContent()).trim(), '$24.00');
  await $('cover-fee').uncheck();
  await page.waitForTimeout(150);

  // --- a state outside the tax table ----------------------------------------
  await $('prev3').click();
  await $('state').selectOption('TN - Tennessee');
  await $('next2').click();
  await page.waitForTimeout(250);
  check('tax line still shown outside KY', await $('review-tax-line').isVisible(), true);
  check('tax reads $0.00 rather than being absent', (await $('review-tax').textContent()).trim(), '$0.00');
  check('label falls back to plain Sales tax', (await $('review-tax-label').textContent()).trim(), 'Sales tax');
  check('total carries no tax', (await $('review-total').textContent()).trim(), '$400.00');

  // --- back to KY, and submit -------------------------------------------------
  await $('prev3').click();
  await $('state').selectOption('KY - Kentucky');
  await $('next2').click();
  await page.waitForTimeout(250);
  await $('submit').click();
  await page.waitForTimeout(1300);

  const pay = posted.filter((r) => r.url.includes('/api/transaction'))
    .map((r) => JSON.parse(r.body)).pop();
  const form = posted.filter((r) => r.url.includes('/api/form') && !r.url.includes('discount-code') && r.body)
    .map((r) => JSON.parse(r.body)).filter((b) => b.Custom__c).pop();

  check('charged amount includes tax', pay.amount, 42400);
  check('metadata tax_base_cents', pay.metadata.tax_base_cents, 40000);
  check('metadata tax_amount_cents', pay.metadata.tax_amount_cents, 2400);
  check('metadata tax_rate', pay.metadata.tax_rate, 6);
  check('metadata tax_state', pay.metadata.tax_state, 'KY');
  check('metadata certificate status', pay.metadata.tax_certificate_status, 'Not Applicable');
  check('base + tax equals the charge, to the cent',
    pay.metadata.tax_base_cents + pay.metadata.tax_amount_cents, pay.amount);

  const c = JSON.parse(form.Custom__c);
  check('order record carries the tax base', c.TaxBase, '$400.00');
  check('order record carries the rate', c.TaxRate, '6%');
  check('order record carries the state', c.TaxState, 'KY');
  check('order record carries the tax', c.TaxAmount, '$24.00');

  check('no uncaught page errors', errors.length, 0);
  if (errors.length) console.log(errors);

  await browser.close();
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
