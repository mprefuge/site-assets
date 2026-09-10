const { chromium } = require('playwright');

const results = [];
const check = (n, a, e) => {
  const ok = a === e;
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `\n        got:      ${a}\n        expected: ${e}`}`);
};

const TODAY_EASTERN = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 900, height: 2200 } });
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
  const pause = (ms = 200) => page.waitForTimeout(ms);

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
  await $('zip').fill('40202');
  await $('country').selectOption('United States');

  // --- the question is asked only where the tax is charged --------------------
  await $('state').selectOption('TN - Tennessee');
  await pause();
  check('exemption block hidden outside Kentucky', await $('exempt-block').isVisible(), false);

  await $('state').selectOption('KY - Kentucky');
  await pause();
  check('exemption block shown for Kentucky', await $('exempt-block').isVisible(), true);
  check('certificate form is closed until the box is ticked', await $('cert').isVisible(), false);

  // --- ticking the box alone must NOT remove the tax --------------------------
  await $('exempt').check();
  await pause();
  check('certificate form opens', await $('cert').isVisible(), true);
  check('organization prefilled from the order', await $('cert-org').inputValue(), 'Grace Baptist Church');
  check('date prefilled with today in Eastern time', await $('cert-date').inputValue(), TODAY_EASTERN);
  check('Apply is unavailable until the form is filled in', await $('cert-apply').isDisabled(), true);

  await $('next2').click();
  await pause(250);
  check('a ticked box on its own leaves the tax on', (await $('review-tax').textContent()).trim(), '$24.00');
  check('and the total with it', (await $('review-total').textContent()).trim(), '$424.00');
  await $('prev3').click();
  await pause();

  // --- a complete certificate -------------------------------------------------
  const fillCert = async (id) => {
    await $('cert-id').fill(id);
    await $('cert-type').selectOption('Resident nonprofit religious institution');
    await $('cert-signer').fill('Pat Buyer');
    await $('cert-title').fill('Treasurer');
    await $('cert-signature').fill('Pat Buyer');
    await pause(150);
  };

  await fillCert('A-12345');
  check('Apply unlocks once every part is present', await $('cert-apply').isDisabled(), false);

  await $('cert-apply').click();
  await pause(600);
  check('the certificate is recorded', await $('cert-applied').isVisible(), true);
  check('and the form closes behind it', await $('cert').isVisible(), false);
  check('the badge names the organization and number',
    (await $('cert-applied-label').textContent()).trim(), 'Grace Baptist Church - A-12345');

  await $('next2').click();
  await pause(250);
  check('a recorded certificate removes the tax', (await $('review-tax').textContent()).trim(), '$0.00');
  check('and the line says why', (await $('review-tax-label').textContent()).trim(), 'KY sales tax (exempt)');
  check('the total is the untaxed order', (await $('review-total').textContent()).trim(), '$400.00');
  check('the pay button agrees', (await $('submit').textContent()).trim(), 'Pay $400.00');

  // --- editing the certificate puts the tax back ------------------------------
  await $('prev3').click();
  await $('cert-remove').click();
  await pause();
  check('Change reopens the form', await $('cert').isVisible(), true);
  await $('next2').click();
  await pause(250);
  check('an un-applied certificate is taxed again', (await $('review-tax').textContent()).trim(), '$24.00');
  await $('prev3').click();
  await pause();

  await $('cert-apply').click();
  await pause(600);
  check('the boxes are sealed behind the badge once recorded',
    await $('cert-signature').isVisible(), false);

  // --- a number already on file for somebody else -----------------------------
  await $('cert-remove').click();
  await pause();
  await $('cert-id').fill('TAKEN');
  await pause(150);
  await $('cert-apply').click();
  await pause(600);
  check('a number claimed by another organization is refused',
    (await $('cert-status').textContent()).trim(),
    'That exemption number is already on file for a different organization. Please check the number, or contact us.');
  await $('next2').click();
  await pause(250);
  check('a refused certificate does not remove the tax', (await $('review-tax').textContent()).trim(), '$24.00');
  await $('prev3').click();
  await pause();

  // --- the service being down is not a rejection, and is still taxed ----------
  await $('cert-id').fill('BROKEN');
  await pause(150);
  await $('cert-apply').click();
  await pause(600);
  check('a failure to record says try again',
    (await $('cert-status').textContent()).trim(),
    'We could not record your certificate just now. Please try again.');
  await $('next2').click();
  await pause(250);
  check('and the order is taxed rather than exempted on trust',
    (await $('review-tax').textContent()).trim(), '$24.00');
  await $('prev3').click();
  await pause();

  // --- unticking the box, having recorded a certificate -----------------------
  await $('cert-id').fill('A-12345');
  await pause(150);
  await $('cert-apply').click();
  await pause(600);
  await $('exempt').uncheck();
  await pause(200);
  await $('next2').click();
  await pause(250);
  check('unticking the claim puts the tax back', (await $('review-tax').textContent()).trim(), '$24.00');
  await $('prev3').click();
  await $('exempt').check();
  await pause(200);
  check('re-ticking restores the recorded certificate', await $('cert-applied').isVisible(), true);

  // --- submit ------------------------------------------------------------------
  await $('next2').click();
  await pause(250);
  check('exempt again before paying', (await $('review-tax').textContent()).trim(), '$0.00');
  await $('submit').click();
  await pause(1400);

  const pay = posted.filter((r) => r.url.includes('/api/transaction'))
    .map((r) => JSON.parse(r.body)).pop();
  const form = posted.filter((r) => r.url.includes('/api/form') && !r.url.includes('discount-code')
      && !r.url.includes('tax-exemption-certificate') && r.body)
    .map((r) => JSON.parse(r.body)).filter((b) => b.Custom__c).pop();

  check('the charge carries no tax', pay.amount, 40000);
  check('tax_amount_cents is zero, not absent', pay.metadata.tax_amount_cents, 0);
  check('tax_rate is zero on an exempt order', pay.metadata.tax_rate, 0);
  check('the destination state is still recorded', pay.metadata.tax_state, 'KY');
  check('certificate status is Complete', pay.metadata.tax_certificate_status, 'Complete');
  check('the exemption number travels with the payment', pay.metadata.tax_exemption_id, 'A-12345');
  check('so does the certificate record id', pay.metadata.tax_certificate_id, 'a1YPREVIEW000001');
  check('base plus tax still equals the charge',
    pay.metadata.tax_base_cents + pay.metadata.tax_amount_cents, pay.amount);

  const c = JSON.parse(form.Custom__c);
  check('the order record says it was exempt', c.TaxCertificateStatus, 'Complete');
  check('and names the number', c.TaxExemptionId, 'A-12345');
  check('and shows no tax charged', c.TaxAmount, '$0.00');

  check('no uncaught page errors', errors.length, 0);
  if (errors.length) console.log(errors);

  await browser.close();
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
