const { chromium } = require('playwright');

const URL = 'http://localhost:8000/dev/hospitality-guide-preview.html';

const results = [];
function check(name, actual, expected) {
  const ok = actual === expected;
  results.push({ ok, name, actual, expected });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        got:      ${actual}\n        expected: ${expected}`}`);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));


  await page.goto(URL, { waitUntil: 'networkidle' });

  // On success the form hands off to checkout and the page goes away, taking
  // the preview panels with it. So the payloads are recorded as they are sent,
  // by wrapping the harness's own mocked fetch from the outside.
  // Recorded through the console rather than into a page variable: the handoff
  // navigates, and anything held on `window` goes with it. Console messages are
  // delivered to the test as they happen, so they survive.
  const posted = [];
  page.on('console', (m) => {
    const text = m.text();
    if (text.indexOf('__POSTED__') !== 0) return;
    try { posted.push(JSON.parse(text.slice('__POSTED__'.length))); } catch (e) { /* ignore */ }
  });

  const recordRequests = () => page.evaluate(() => {
    const inner = window.fetch;
    window.fetch = function (url, options) {
      try {
        console.log('__POSTED__' + JSON.stringify({ url: String(url), body: (options && options.body) || null }));
      } catch (e) { /* recording only */ }
      return inner(url, options);
    };
  });
  await recordRequests();

  const postedBody = (match) => {
    const hits = posted.filter((r) => r.url.indexOf(match) !== -1 && r.body);
    return hits.length ? JSON.parse(hits[hits.length - 1].body) : null;
  };
  const clearPosted = () => { posted.length = 0; };

  const p = 'hg-embedded';
  const $ = (id) => page.locator(`#${p}-${id}`);

  // --- pre-order notice, no discount ---------------------------------------
  check('pre-order notice is shown', await $('notice').isVisible(), true);
  check('notice badge reads Pre-order', (await $('notice-badge').textContent()).trim(), 'Pre-order');

  // --- pricing with no code ------------------------------------------------
  await $('qty').fill('30');
  await page.waitForTimeout(120);
  check('30 participants subtotal is 30 x $38', (await $('subtotal').textContent()).trim(), '$1140.00');
  check('no discount line without a code', await $('discount-line').isHidden(), true);
  check('order total is the undiscounted subtotal', (await $('order-total').textContent()).trim(), '$1140.00');

  // --- an unknown code ------------------------------------------------------
  await $('code').fill('NOPE');
  await $('code-apply').click();
  await page.waitForTimeout(300);
  check('unknown code is refused', (await $('code-status').textContent()).trim(), 'That code was not recognised.');
  check('unknown code applies no discount', await $('discount-line').isHidden(), true);

  // --- an expired code ------------------------------------------------------
  await $('code').fill('EXPIRED');
  await $('code-apply').click();
  await page.waitForTimeout(300);
  check('expired code says so', (await $('code-status').textContent()).trim(), 'That code has expired.');

  // --- a code that cannot be checked ---------------------------------------
  await $('code').fill('BROKEN');
  await $('code-apply').click();
  await page.waitForTimeout(300);
  check(
    'unreachable service says try again, not "invalid"',
    (await $('code-status').textContent()).trim(),
    'We could not check that code just now. Please try again.'
  );
  check('unreachable service applies no discount', await $('discount-line').isHidden(), true);

  // --- a good code ----------------------------------------------------------
  await $('code').fill('preview25');
  await $('code-apply').click();
  await page.waitForTimeout(300);
  check('applied banner replaces the entry field', await $('code-block').isHidden(), true);
  check('applied banner is shown', await $('code-applied').isVisible(), true);
  check('applied badge names code and percent', (await $('code-applied-badge').textContent()).trim(), 'PREVIEW25 applied - 25% off');
  check('applied label is the Salesforce record name', (await $('code-applied-label').textContent()).trim(), 'Preview partner');
  check('discount line is shown', await $('discount-line').isVisible(), true);
  check('discount line names the code', (await $('discount-label').textContent()).trim(), 'PREVIEW25 (25% off)');
  check('discount is 25% of $1140.00', (await $('discount').textContent()).trim(), '-$285.00');
  check('order total is subtotal less discount', (await $('order-total').textContent()).trim(), '$855.00');

  // --- switching codes reprices --------------------------------------------
  await $('code-remove').click();
  await page.waitForTimeout(120);
  check('removing the code restores the full subtotal', (await $('order-total').textContent()).trim(), '$1140.00');
  check('entry field comes back', await $('code-block').isVisible(), true);

  await $('code').fill('PREVIEW10');
  await $('code-apply').click();
  await page.waitForTimeout(300);
  check('second code reprices to 10% off', (await $('order-total').textContent()).trim(), '$1026.00');

  // --- lower-case and spaced entry -----------------------------------------
  await $('code-remove').click();
  await $('code').fill('  preview 25 ');
  await $('code-apply').click();
  await page.waitForTimeout(300);
  check('spaces and case are forgiven', (await $('code-applied-badge').textContent()).trim(), 'PREVIEW25 applied - 25% off');

  // --- review step carries the same numbers --------------------------------
  await $('next1').click();
  await $('organization-name').fill('Test Church');
  await $('firstname').fill('Pat');
  await $('lastname').fill('Buyer');
  await $('email').fill('pat@example.org');
  await $('phone').fill('5025550123');
  await $('enter-manually').click();
  await $('addr1').fill('1 Main St');
  await $('city').fill('Louisville');
  await $('state').selectOption('KY - Kentucky');
  await $('zip').fill('40202');
  await $('country').selectOption('United States');
  await $('next2').click();
  await page.waitForTimeout(200);

  check('review discount matches step 1', (await $('review-discount').textContent()).trim(), '-$285.00');
  check('review discount names the code', (await $('review-discount-label').textContent()).trim(), 'PREVIEW25 (25% off)');
  check('review total is the discounted base', (await $('review-total').textContent()).trim(), '$855.00');
  check('pay button shows the discounted total', (await $('submit').textContent()).trim(), 'Pay $855.00');
  check('fulfilment note is the pre-order promise', (await $('fulfillment-note').textContent()).includes('ship when the resource releases'), true);

  // --- cover fees grosses up on the DISCOUNTED total ------------------------
  await $('cover-fee').check();
  await page.waitForTimeout(200);
  const coveredTotal = (await $('review-total').textContent()).trim();
  // ceil((85500 + 30) * 10000 / 9780) = 87454 cents - the gross-up runs on the
  // discounted total, since the processor takes its cut of the whole charge.
  check('cover-fee grosses up from the discounted total', coveredTotal, '$874.54');
  await $('cover-fee').uncheck();
  await page.waitForTimeout(150);

  // --- submit: the payload carries the code and the discounted amount -------
  await $('submit').click();
  await page.waitForTimeout(900);

  const formPayload = postedBody('/api/form?') || posted
    .filter((r) => r.url.indexOf('/api/form') !== -1 && r.body && r.body.indexOf('__formConfig') !== -1)
    .map((r) => JSON.parse(r.body))
    .filter((b) => !b.Stripe_Checkout_Session_Id__c)
    .pop();
  const paymentPayload = postedBody('/api/transaction');
  check('an order record was submitted', !!formPayload, true);
  check('a payment was requested', !!paymentPayload, true);

  check('payment amount is the discounted total in cents', paymentPayload.amount, 85500);
  check('metadata carries the code', paymentPayload.metadata.discount_code, 'PREVIEW25');
  check('metadata carries the percent', paymentPayload.metadata.discount_percent, 25);
  check('metadata carries the discount amount for humans', paymentPayload.metadata.discount_amount, '$285.00');
  // The field that has to reconcile is the integer one. A currency-formatted
  // string has already lost the argument about what unit it is in - which is
  // how Cover_Fees_Amount__c came to be stored 100x overstated.
  check('metadata carries the discount amount in integer cents', paymentPayload.metadata.discount_amount_cents, 28500);
  check('cents and the display string agree', paymentPayload.metadata.discount_amount_cents / 100, 285.00);
  check(
    'subtotal less discount equals the charge, to the cent',
    paymentPayload.amount + paymentPayload.metadata.discount_amount_cents,
    114000
  );
  check('the code is checked against the order campaign', paymentPayload.category, 'Hospitality Guide');
  check('metadata fulfilment is ships-at-release', paymentPayload.metadata.fulfillment, 'ships-at-release');
  check('order summary names the code', paymentPayload.metadata.order_summary.includes('code PREVIEW25'), true);

  const custom = JSON.parse(formPayload.Custom__c);
  check('Salesforce record carries the code', custom.DiscountCode, 'PREVIEW25');
  check('Salesforce record carries the discount', custom.Discount, '25% (PREVIEW25)');
  check('Salesforce record carries the discount amount', custom.DiscountAmount, '$285.00');
  check('Salesforce record total matches the charge', custom.OrderTotal, '$855.00');
  check('Salesforce quantity is the participant count', formPayload.Quantity__c, 30);

  // --- a code that goes bad between Apply and Pay ---------------------------
  //
  // The important one. A page left open long enough for a code to expire, hit
  // its limit, or be switched off must not put the order through at the old
  // price. The code is re-checked at submit; here the answer changes underneath
  // it, which is exactly what would happen in real life.
  await page.goto(URL, { waitUntil: "networkidle" });
  await recordRequests();
  clearPosted();
  await $('qty').fill('30');
  await $('code').fill('PREVIEW25');
  await $('code-apply').click();
  await page.waitForTimeout(300);
  check('code applied before it goes bad', (await $('order-total').textContent()).trim(), '$855.00');

  await $('next1').click();
  await $('organization-name').fill('Test Church');
  await $('firstname').fill('Pat');
  await $('lastname').fill('Buyer');
  await $('email').fill('pat@example.org');
  await $('phone').fill('5025550123');
  await $('enter-manually').click();
  await $('addr1').fill('1 Main St');
  await $('city').fill('Louisville');
  await $('state').selectOption('KY - Kentucky');
  await $('zip').fill('40202');
  await $('country').selectOption('United States');
  await $('next2').click();
  await page.waitForTimeout(200);

  // The code stops working while the buyer is sitting on the review step.
  await page.evaluate(() => {
    const inner = window.fetch;
    window.fetch = function (url, options) {
      if (typeof url === 'string' && url.indexOf('/api/form/discount-code') !== -1) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({
            valid: false, code: 'PREVIEW25', reason: 'expired', message: 'That code has expired.'
          }))
        });
      }
      return inner(url, options);
    };
  });

  await $('submit').click();
  await page.waitForTimeout(800);

  check('a code that went bad stops the order before payment', postedBody('/api/transaction'), null);
  check(
    'no order record was created either',
    posted.some((r) => r.url.indexOf('/api/form') !== -1 && r.url.indexOf('discount-code') === -1),
    false
  );
  check(
    'the buyer is told why and that the order was repriced',
    (await $('submit-error').textContent()).includes('repriced'),
    true
  );
  // Repriced without the code, at the full list price.
  check('the order is repriced to full price', (await $('review-total').textContent()).trim(), '$1140.00');
  check('the pay button shows the new total', (await $('submit').textContent()).trim(), 'Pay $1140.00');
  // Checked on the attribute, not on visibility: the buyer is on the review
  // step, so step 1 as a whole is off screen. What matters is that the field is
  // waiting for them when they go back.
  check(
    'the entry field is waiting on step 1 so another code can be tried',
    await $('code-block').getAttribute('hidden'),
    null
  );
  check(
    'the error says where to go to try another code',
    (await $('submit-error').textContent()).includes('go back to the first step'),
    true
  );

  check('no uncaught page errors', errors.length, 0);
  if (errors.length) console.log(errors);

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
