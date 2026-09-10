const { chromium } = require('playwright');

const results = [];
const check = (n, a, e) => {
  const ok = a === e;
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `\n        got:      ${a}\n        expected: ${e}`}`);
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 900, height: 1800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('http://localhost:8000/dev/hospitality-guide-preview.html', { waitUntil: 'networkidle' });
  const p = 'hg-embedded';
  const $ = (id) => page.locator(`#${p}-${id}`);
  const pause = (ms = 250) => page.waitForTimeout(ms);

  const orderOf = (method) =>
    page.evaluate(([pre, m]) =>
      getComputedStyle(document.querySelector(`#${pre}-pm-row [data-method="${m}"]`)).order,
      [p, method]);

  // qty lives on step 1 and the rails on step 3, so changing the order size
  // means walking back through step 2 and forward again.
  const requote = async (qty, state) => {
    await $('prev3').click();
    await pause(120);
    await $('prev2').click();
    await pause(120);
    await $('qty').fill(String(qty));
    await pause(150);
    await $('next1').click();
    await pause(120);
    if (state) await $('state').selectOption(state);
    await $('next2').click();
    await pause();
  };

  const setup = async (qty, state) => {
    await $('qty').fill(String(qty));
    await pause(150);
    if (await $('next1').isVisible()) await $('next1').click();
    for (const [id, v] of [['organization-name', 'Grace Baptist Church'], ['firstname', 'Pat'],
                           ['lastname', 'Buyer'], ['email', 'pat@example.org'], ['phone', '5025550123']]) {
      await $(id).fill(v);
    }
    if (await $('enter-manually').isVisible()) await $('enter-manually').click();
    await $('addr1').fill('1 Main St');
    await $('city').fill('Somewhere');
    await $('state').selectOption(state);
    await $('zip').fill('40202');
    await $('country').selectOption('United States');
    await $('next2').click();
    await pause();
  };

  // --- a small order keeps the familiar card-first layout ---------------------
  await setup(10, 'KY - Kentucky');
  await $('cover-fee').check();
  await pause();
  check('$424 order: card leads', await orderOf('card'), '1');
  check('$424 order: bank second', await orderOf('us_bank_account'), '2');
  check('$424 order: no lead note', await $('rail-lead').isVisible(), false);

  // --- a large one leads with the rail that costs less to collect -------------
  await requote(25, null);
  check('$1,007 order: bank leads', await orderOf('us_bank_account'), '1');
  check('$1,007 order: card second', await orderOf('card'), '2');
  check('wallet stays last either way', await orderOf('wallet'), '3');
  check('the note appears', await $('rail-lead').isVisible(), true);
  // 2.2% + 30c on $1,007.00 is $22.45; 0.8% capped at $5.00 is $5.00.
  check('and says what it is worth', (await $('rail-lead').textContent()).trim(),
    'Bank transfer costs $17.45 less to process on an order this size, so it is listed first.');

  // --- the boundary, out of state so tax does not move it ---------------------
  await requote(15, 'TN - Tennessee');
  // $600.00: card $13.50, bank $4.80 - saves $8.70, under the $10 policy.
  check('$600 saves under $10: card still leads', await orderOf('card'), '1');
  check('and no note', await $('rail-lead').isVisible(), false);

  await requote(17, null);
  // $680.00: card $15.26, bank capped at $5.00 - saves $10.26, over the policy.
  check('$680 saves over $10: bank leads', await orderOf('us_bank_account'), '1');
  check('note quotes the saving', (await $('rail-lead').textContent()).trim(),
    'Bank transfer costs $10.26 less to process on an order this size, so it is listed first.');

  // --- reordering must not break selection or the fee math -------------------
  check('card is still the default selection',
    await page.locator(`#${p}-pm-row [data-method="card"]`).evaluate((e) => e.classList.contains('selected')), true);
  // Card: ceil((68000 + 30) * 10000 / 9780) = 69561 -> $695.61
  check('card gross-up unchanged', (await $('review-total').textContent()).trim(), '$695.61');

  await page.locator(`#${p}-pm-row [data-method="us_bank_account"]`).click();
  await pause();
  check('the moved chip still selects',
    await page.locator(`#${p}-pm-row [data-method="us_bank_account"]`).evaluate((e) => e.classList.contains('selected')), true);
  // ACH is capped at $5.00, so the gross-up is the flat cap on top of $680.00.
  check('bank gross-up is the capped fee', (await $('review-total').textContent()).trim(), '$685.00');
  check('the quoted fee agrees', (await $('review-fee').textContent()).trim(), '$5.00');

  await page.locator(`#${p}-pm-row [data-method="card"]`).click();
  await pause();
  check('and back to card', (await $('review-total').textContent()).trim(), '$695.61');

  // --- unticking cover-fee hides the rails, as before -------------------------
  await $('cover-fee').uncheck();
  await pause();
  check('rails hidden when the org pays the fee',
    await page.locator(`#${p}-payment-method-section`).isVisible(), false);

  check('no uncaught page errors', errors.length, 0);
  if (errors.length) console.log(errors);

  await browser.close();
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
