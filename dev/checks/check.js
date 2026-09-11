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

  // --- step 1 layout --------------------------------------------------------
  //
  // The first page shows the code, the discount, shipping and the total. The
  // per-line "Guides" figure was removed from it; it still appears on the
  // review step, where the buyer is checking the order before paying.
  check('step 1 no longer carries a Guides line', await $('subtotal').count(), 0);
  check('step 1 no longer carries a Guides label', await $('subtotal-label').count(), 0);

  const step1Order = await page.evaluate((prefix) => {
    const at = (id) => {
      const node = document.getElementById(prefix + '-' + id);
      return node ? node.getBoundingClientRect().top : null;
    };
    return { qty: at('qty'), tiers: at('tiers'), code: at('code-block'), lines: at('step1-lines') };
  }, p);
  check('the discount code box sits below the participants section', step1Order.code > step1Order.qty, true);
  check('the discount code box sits above the order total', step1Order.code < step1Order.lines, true);

  // --- pricing with no code ------------------------------------------------
  await $('qty').fill('30');
  await page.waitForTimeout(120);
  check('no discount line without a code', await $('discount-line').isHidden(), true);
  check('order total is 30 participants at $38 each', (await $('order-total').textContent()).trim(), '$1140.00');

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

  // --- the org absorbs the processing fee ----------------------------------
  //
  // Refuge International eats the fee, so the buyer is never asked about it and
  // never sees it: no checkbox, no rail chips, no fee line, and the total
  // charged is the order total to the cent with nothing grossed up onto it.
  check('no cover-the-fee checkbox', await $('cover-fee').count(), 0);
  check('no payment-method chips', await $('pm-row').count(), 0);
  check('no card-type chips', await $('card-type-row').count(), 0);
  check('no processing fee line in the summary', await $('review-fee').count(), 0);
  check('the total charged is the order total, not a grossed-up one', (await $('review-total').textContent()).trim(), '$855.00');

  // --- the back arrow -------------------------------------------------------
  check('step 3 still has a way back', await $('prev3').count(), 1);
  check('it is an icon, not a "Previous" button', (await $('prev3').textContent()).trim(), '');
  check('no Previous button is left on the review step', (await $('step3').textContent()).includes('Previous'), false);

  const backShape = await page.evaluate((prefix) => {
    const btn = document.getElementById(prefix + '-prev3');
    const card = btn.closest('.hg-card');
    const b = btn.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const style = getComputedStyle(btn);
    return {
      square: Math.round(b.width) === Math.round(b.height),
      round: parseFloat(style.borderRadius) >= b.width / 2,
      fromLeft: b.left - c.left,
      fromTop: b.top - c.top
    };
  }, p);
  check('the back control is circular', backShape.square && backShape.round, true);
  check('it sits in the top-left corner of the card', backShape.fromLeft < 40 && backShape.fromTop < 40, true);

  await $('prev3').click();
  await page.waitForTimeout(150);
  check('the back arrow goes back a step', await $('step2').isVisible(), true);
  await $('next2').click();
  await page.waitForTimeout(200);
  check('and forward again returns to the review step', await $('step3').isVisible(), true);

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
  // The buyer never covers the fee, so nothing is ever added to the charge -
  // and no rail is named, which is what leaves Stripe Checkout free to offer
  // every method the account has enabled rather than pinning it to one.
  check('the payload never covers the fee', paymentPayload.coverFee, false);
  check('no fee is added to the charge', paymentPayload.feeAmount, 0);
  check('the charge is the order total and nothing else', paymentPayload.amount + paymentPayload.feeAmount, 85500);
  check('no payment rail is pinned', Object.prototype.hasOwnProperty.call(paymentPayload, 'paymentMethod'), false);
  check('no card type is pinned', Object.prototype.hasOwnProperty.call(paymentPayload, 'cardType'), false);
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

  // --- paying by check ------------------------------------------------------
  //
  // A different endpoint and a different outcome: nothing is charged, no Stripe
  // session is created, and the order is recorded as pending for somebody to
  // reconcile when the check arrives.
  await page.goto(URL, { waitUntil: 'networkidle' });
  await recordRequests();
  clearPosted();
  await $('qty').fill('30');
  await $('code').fill('PREVIEW25');
  await $('code-apply').click();
  await page.waitForTimeout(300);
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

  check('paying now is the default', await $('check-note').isHidden(), true);
  check('the default button offers to pay', (await $('submit').textContent()).trim(), 'Pay $855.00');

  await page.locator(`#${p}-pay-when-row .hg-pay-chip[data-pay-when="check"]`).click();
  await page.waitForTimeout(150);

  check('choosing check shows where to send it', await $('check-note').isVisible(), true);
  check(
    'the address is on screen before they commit',
    (await $('check-note').textContent()).includes('5590 Bruce Avenue'),
    true
  );
  check(
    'and who to make it out to',
    (await $('check-note').textContent()).includes('Refuge International'),
    true
  );
  check(
    'the button no longer says pay',
    (await $('submit').textContent()).trim(),
    'Place order and send a check for $855.00'
  );
  check('the fineprint under the button goes away entirely', await $('submit-fineprint').isHidden(), true);

  // And comes back if they change their mind. Hiding it is a toggle, not a
  // one-way door: a card buyer still needs telling they are about to leave.
  await page.locator(`#${p}-pay-when-row .hg-pay-chip[data-pay-when="now"]`).click();
  await page.waitForTimeout(150);
  check('switching back restores the Stripe warning', await $('submit-fineprint').isVisible(), true);
  check('and the trust line', await $('trust').isVisible(), true);
  check('and the total is charged again', (await $('review-total-label').textContent()).trim(), 'Total charged today');
  await page.locator(`#${p}-pay-when-row .hg-pay-chip[data-pay-when="check"]`).click();
  await page.waitForTimeout(150);
  check('the Stripe trust line is gone', await $('trust').isHidden(), true);
  check(
    'the pre-order note stops saying the card is charged today',
    /card is charged/.test(await $('fulfillment-note').textContent()),
    false
  );
  // What ships is workbooks. "Guides and printed discussion workbooks" read as
  // two things when there is only one.
  check(
    'what ships is workbooks, not guides and workbooks',
    (await $('fulfillment-note').textContent()).trim(),
    'Workbooks ship when the resource releases (target: mid-October 2026).'
  );

  await $('submit').click();
  await page.waitForTimeout(900);

  // A check order is a FORM SUBMISSION AND NOTHING ELSE. No payment record is
  // created anywhere, so this form record is the only trace the order exists.
  const checkForm = postedBody('/api/form?') || posted
    .filter((r) => r.url.indexOf('/api/form') !== -1 && r.body && r.body.indexOf('__formConfig') !== -1)
    .map((r) => JSON.parse(r.body))
    .pop();
  check('the order was recorded as a form submission', !!checkForm, true);
  // The body, specifically. An earlier version branched to the check path above
  // `var formPayload = ...`; hoisting meant the assignment had not run, so it
  // posted `undefined` as the body and the harness answered with a canned
  // success. Asserting the record exists was not enough - it has to carry the
  // order.
  check('and the submission actually carried the order', Object.keys(checkForm).length > 10, true);

  const checkCustom = JSON.parse(checkForm.Custom__c);
  check('the record says they are paying by check', checkCustom.PaymentMethod, 'Check');
  check('and what they owe', checkCustom.OrderTotal, '$855.00');
  check('and how many participants', checkForm.Quantity__c, 30);
  check('and who they are', checkForm.Email__c, 'pat@example.org');
  check('and which organisation', checkForm.Church__c, 'Test Church');

  // The two that matter most: nothing was asked of the payment service at all.
  check(
    'no Stripe checkout session was requested',
    posted.some((r) => r.url.indexOf('/api/transaction') !== -1),
    false
  );
  check(
    'no transaction record was created either',
    posted.some((r) => r.url.indexOf('/transaction') !== -1),
    false
  );

  check('the confirmation replaces the review step', await $('check-done').isVisible(), true);
  check(
    'the confirmation names the amount owed',
    (await $('done-lead').textContent()).includes('$855.00'),
    true
  );
  check(
    'the confirmation repeats the address',
    (await $('check-done').textContent()).includes('5590 Bruce Avenue'),
    true
  );
  // The number on the check, the number in their email and the number the office
  // searches on all have to be the same number - so it is the confirmation code
  // the forms service actually minted, not anything this page made up.
  check(
    'the order number is the code the forms service returned',
    (await $('done-ref').textContent()).trim(),
    'PRV01'
  );
  // The buyer is not told that somebody will chase them in a week. That is the
  // office's business, and saying it turns a thank-you into a warning.
  check(
    'the confirmation does not threaten a follow-up',
    /follow|chase|get in touch|7 days/i.test(await $('check-done').textContent()),
    false
  );
  check(
    'it says what happens next instead',
    (await $('done-note').textContent()).includes("hold your order until your check arrives"),
    true
  );

  // --- a check order the forms service does not save -------------------------
  //
  // On the card path a failed form submission is bad bookkeeping and the payment
  // goes ahead anyway. Here there is no payment and no transaction: this record
  // is the only trace. Telling somebody to mail a check for an order nobody has
  // is the worst outcome available, so it has to fail loudly.
  await page.goto(URL, { waitUntil: 'networkidle' });
  await recordRequests();
  clearPosted();
  await $('qty').fill('30');
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
  await page.locator(`#${p}-pay-when-row .hg-pay-chip[data-pay-when="check"]`).click();
  await page.waitForTimeout(150);

  await page.evaluate(() => {
    const inner = window.fetch;
    window.fetch = function (url, options) {
      if (typeof url === 'string' && url.indexOf('/api/form') !== -1 && url.indexOf('discount-code') === -1) {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve(JSON.stringify({ error: 'Salesforce unavailable' }))
        });
      }
      return inner(url, options);
    };
  });

  await $('submit').click();
  await page.waitForTimeout(900);

  check('a form submission that failed is not confirmed', await $('check-done').isHidden(), true);
  check(
    'the buyer is told nothing was saved',
    (await $('submit-error').textContent()).includes('Nothing was saved'),
    true
  );
  check(
    'and told not to send a check yet',
    (await $('submit-error').textContent()).includes("don't send a check yet"),
    true
  );
  check('the button comes back so they can retry', await $('submit').isEnabled(), true);

  check('no uncaught page errors', errors.length, 0);
  if (errors.length) console.log(errors);

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
