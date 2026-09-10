# Order form checks

Playwright suites that drive `dev/hospitality-guide-preview.html` in a real
browser and assert what the Hospitality Guide order form actually does.

They are here rather than in a scratchpad because a regression guard that does
not survive the session is not a guard. Nothing runs them automatically — this
repo has no CI — so run them by hand before changing
`scripts/hospitality-guide-order.js`.

## Running them

```bash
# from the repository root
python3 -m http.server 8000
# in another shell
node dev/checks/tax-check.js
```

They need Playwright, which this repo does not depend on — install it wherever
you run them (`npm i -D playwright`, or globally and run with `NODE_PATH` set).
Each script points `executablePath` at `/opt/pw-browsers/chromium`; change that
line if your Chromium lives elsewhere.

The preview harness mocks every service the form talks to, so none of this
creates a Stripe session, a Salesforce record or an email. That mocking is the
point — see the comment block at the top of the preview page.

| Suite | Checks | What it is for |
|---|---|---|
| `check.js` | 60 | Discount codes end to end: applying, removing, expiry at submit, repricing |
| `tax-check.js` | 26 | Kentucky sales tax, the subtotal-then-address flow, the fee gross-up |
| `cert-check.js` | 39 | The 51A126 exemption: that a ticked box alone does not remove the tax |
| `rail-check.js` | 20 | Rail ordering by collection cost, and that the gross-up is unchanged |
| `check-check.js` | 33 | Paying by check: the confirmation, and that no Stripe session is minted |
| `agree-check.js` | 73 | **See below** |

## agree-check.js is the important one

The tier table, the tax rules and the discount arithmetic exist **twice**: here
in `scripts/hospitality-guide-order.js`, and in payment-processor
`src/domain/hospitalityGuideOrder.ts`, where the server-side price check uses
them to decide whether a charge is honest.

Neither repo's tests catch a drift between the two, because each asserts its own
copy of the constants. This one drives the browser across every tier boundary,
both tax states and three discount levels, and compares the number the form
would charge against the number the server would expect.

**A price change applied to one copy and not the other makes every legitimate
order mismatch.** That is why the server-side check ships in `report` mode. Run
this after touching either copy.

It is the one suite that needs the other repository:

```bash
# payment-processor must be checked out as a sibling directory and built
cd ../payment-processor && npx tsc
cd ../site-assets && node dev/checks/agree-check.js
```

It requires the compiled `dist/`, not the source, and the path is at the top of
the file.
