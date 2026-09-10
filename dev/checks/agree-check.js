/**
 * Do the browser's price and the server's price agree?
 *
 * The tier table, the tax rules and the discount arithmetic now exist TWICE: in
 * site-assets scripts/hospitality-guide-order.js, and in payment-processor
 * src/domain/hospitalityGuideOrder.ts. A price change applied to one and not the
 * other makes every legitimate order mismatch - which is the whole reason the
 * price check ships in report mode.
 *
 * Report mode makes that survivable. This makes it visible: the browser is driven
 * across the tier boundaries and both tax states, and its number is compared
 * against the server's for the same inputs. Neither test suite catches a drift on
 * its own, because each asserts its own copy of the constants.
 */
const { chromium } = require('playwright');
const {
  priceHospitalityGuideOrder,
} = require('../../../payment-processor/dist/domain/hospitalityGuideOrder');

const results = [];
const check = (n, a, e) => {
  const ok = a === e;
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `\n        browser: ${a}\n        server:  ${e}`}`);
};

const centsFromMoney = (text) => Math.round(parseFloat(String(text).replace(/[^0-9.]/g, '')) * 100);

// The tier boundaries, both sides of each, plus the two tax outcomes and the two
// discounts the preview knows about.
const QUANTITIES = [1, 9, 10, 24, 25, 49, 50, 74, 75, 99, 100, 137];
const STATES = [['KY - Kentucky', 'KY'], ['TN - Tennessee', 'TN']];
const CODES = [['', 0], ['PREVIEW25', 25], ['PREVIEW10', 10]];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 900, height: 1600 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('http://localhost:8000/dev/hospitality-guide-preview.html', { waitUntil: 'networkidle' });
  const p = 'hg-embedded';
  const $ = (id) => page.locator(`#${p}-${id}`);
  const pause = (ms = 120) => page.waitForTimeout(ms);

  // Navigation has to be idempotent: the loops below arrive at each step from
  // more than one place, and clicking Previous when already on step 1 hangs.
  const currentStep = () =>
    page.evaluate((pre) => [1, 2, 3].find((i) =>
      document.getElementById(pre + '-step' + i)?.classList.contains('active')) || 0, p);

  const ensureStep = async (target) => {
    for (let guard = 0; guard < 6; guard++) {
      const at = await currentStep();
      if (at === target) return;
      if (at > target) await $('prev' + at).click();
      else await $('next' + at).click();
      await pause();
    }
    throw new Error('could not reach step ' + target);
  };

  // Fill the buyer once; only qty, state and the code move after this.
  await $('qty').fill('10');
  await pause();
  await $('next1').click();
  for (const [id, v] of [['organization-name', 'Grace Baptist Church'], ['firstname', 'Pat'],
                         ['lastname', 'Buyer'], ['email', 'pat@example.org'], ['phone', '5025550123']]) {
    await $(id).fill(v);
  }
  await $('enter-manually').click();
  await $('addr1').fill('1 Main St');
  await $('city').fill('Somewhere');
  await $('zip').fill('40202');
  await $('country').selectOption('United States');

  for (const [code, expectedPercent] of CODES) {
    // The code entry lives on step 1.
    await ensureStep(1);
    // An applied code hides the entry box behind its badge, so clear it first
    // whatever comes next.
    if (await $('code-remove').isVisible().catch(() => false)) {
      await $('code-remove').click();
      await pause();
    }
    if (code) {
      await $('code').fill(code);
      await $('code-apply').click();
      await page.waitForTimeout(500);
    }

    for (const qty of QUANTITIES) {
      await ensureStep(1);
      await $('qty').fill(String(qty));
      await pause();
      await ensureStep(2);

      for (const [option, stateCode] of STATES) {
        await ensureStep(2);
        await $('state').selectOption(option);
        await pause();
        await ensureStep(3);
        await pause(180);

        const shown = (await $('submit').textContent()).trim();
        const browserCents = centsFromMoney(shown);

        const server = priceHospitalityGuideOrder({
          participants: qty,
          percentOff: expectedPercent,
          state: stateCode,
          certificateComplete: false,
        });

        check(
          `${String(qty).padStart(3)} guides, ${stateCode}, ${code || 'no code'}`,
          browserCents,
          server.orderCents
        );

      }

      await ensureStep(1);
    }
  }

  check('no uncaught page errors', errors.length, 0);
  if (errors.length) console.log(errors);

  await browser.close();
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} orders priced identically on both sides`);
  process.exit(failed ? 1 : 0);
})();
