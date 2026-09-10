const { chromium } = require('playwright');

const results = [];
const check = (n, a, e) => {
  const ok = a === e;
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `\n        got:      ${a}\n        expected: ${e}`}`);
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 900, height: 2000 } });
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
  const pause = (ms = 250) => page.waitForTimeout(ms);

  await $('qty').fill('10');
  await pause(150);
  await $('next1').click();
  for (const [id, v] of [['organization-name', 'Grace Baptist Church'], ['firstname', 'Pat'],
                         ['lastname', 'Buyer'], ['email', 'pat@example.org'], ['phone', '5025550123']]) {
    await $(id).fill(v);
  }
  await $('enter-manually').click();
  await $('addr1').fill('1 Main St');
  await $('city').fill('Louisville');
  await $('state').selectOption('KY - Kentucky');
  await $('zip').fill('40202');
  await $('country').selectOption('United States');
  await $('next2').click();
  await pause();

  // --- the option is offered, and the card path is untouched -----------------
  check('the check option is offered', await $('check-switch').isVisible(), true);
  check('the card button is still there', await $('submit').isVisible(), true);
  check('and still quotes the taxed total', (await $('submit').textContent()).trim(), 'Pay $424.00');

  // --- opening it hides the card apparatus ------------------------------------
  await $('check-toggle').click();
  await pause();
  check('the panel opens', await $('check-panel').isVisible(), true);
  check('the pay button is hidden, not just disabled', await $('submit').isVisible(), false);
  check('the amount is the order total', (await $('check-amount').textContent()).trim(), '$424.00');
  check('the payee is named', (await $('check-payable').textContent()).trim(), 'Refuge International');
  check('the address is shown',
    (await $('check-address').textContent()).trim().split('\n')[0].trim(), 'Refuge International');

  // --- covering fees is meaningless on a check --------------------------------
  await $('check-cancel').click();
  await pause();
  await $('cover-fee').check();
  await pause();
  check('cover-fee grossed the card total up', (await $('submit').textContent()).trim(), 'Pay $433.85');
  await $('check-toggle').click();
  await pause();
  check('switching to check unticks cover-fee', await $('cover-fee').isChecked(), false);
  check('and the check amount carries no fee', (await $('check-amount').textContent()).trim(), '$424.00');

  // --- a failure to record must not send anybody to the post office ----------
  await $('check-cancel').click();
  await pause();
  await $('prev3').click();
  await $('email').fill('checkfail@example.org');
  await $('next2').click();
  await pause();
  await $('check-toggle').click();
  await pause();
  await $('check-submit').click();
  await pause(1400);

  check('a failure to record says so plainly',
    (await $('check-error').textContent()).trim(),
    'We could not record that order just now. Please try again.');
  check('and the confirmation is NOT shown', await $('check-done').isVisible(), false);
  check('the button is usable again',
    (await $('check-submit').textContent()).trim(), 'Place this order and mail a check');
  check('and is not left disabled', await $('check-submit').isDisabled(), false);

  // --- the happy path ---------------------------------------------------------
  await $('check-cancel').click();
  await pause();
  await $('prev3').click();
  await $('email').fill('pat@example.org');
  await $('next2').click();
  await pause();
  await $('check-toggle').click();
  await pause();
  await $('check-submit').click();
  await pause(1600);

  check('the confirmation replaces the panel', await $('check-done').isVisible(), true);
  check('the panel is gone', await $('check-panel').isVisible(), false);
  check('the amount is quoted back', (await $('done-amount').textContent()).trim(), '$424.00');
  check('so is the payee', (await $('done-payable').textContent()).trim(), 'Refuge International');
  check('the address is given in full',
    (await $('done-address').textContent()).trim(),
    'Refuge International\nPO Box 4242\nLouisville, KY 40202');

  const reference = (await $('done-reference').textContent()).trim();
  // A UUID is the right shape for an idempotency key and the wrong shape for a
  // pen. Short, grouped and upper-case, so somebody can copy it onto a check.
  check('the reference is writable by hand', /^HG-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(reference), true);

  const sent = posted.filter((r) => r.url.includes('/api/transaction/check'))
    .map((r) => JSON.parse(r.body)).pop();
  const paymentCalls = posted.filter((r) => r.url.includes('/api/transaction')
    && !r.url.includes('/check'));

  check('no Stripe session was ever asked for', paymentCalls.length, 0);
  check('the recorded amount is the order total', sent.amount, 42400);
  check('the reference sent is the one displayed', sent.clientReferenceId, reference);
  check('the buyer email travels with it', sent.email, 'pat@example.org');
  check('so does the campaign', sent.category, 'Hospitality Guide');
  check('and the organisation', sent.organization, 'Grace Baptist Church');
  check('tax rides along as components', sent.metadata.tax_amount_cents, 2400);
  check('base plus tax equals the amount recorded',
    sent.metadata.tax_base_cents + sent.metadata.tax_amount_cents, sent.amount);
  check('participants are carried so the price can be rechecked', sent.metadata.participants, 10);

  const forms = posted.filter((r) => r.url.includes('/api/form') && !r.url.includes('discount-code')
      && !r.url.includes('tax-exemption-certificate') && r.body)
    .map((r) => JSON.parse(r.body)).filter((b) => b.Custom__c);
  check('the order record was still created', forms.length > 0, true);
  const c = JSON.parse(forms[forms.length - 1].Custom__c);
  check('and shows no processing fee was covered', c.CoveredProcessingFee, 'not covered');

  check('no uncaught page errors', errors.length, 0);
  if (errors.length) console.log(errors);

  await browser.close();
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
