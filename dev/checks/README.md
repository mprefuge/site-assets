# Order form checks

A Playwright suite that drives `dev/hospitality-guide-preview.html` in a real
browser and asserts what the Hospitality Guide order form actually does with a
discount code — applying one, removing it, switching between codes, and the
re-check at submit that stops an order going through at a discount that has
since expired.

It also holds the form to what it charges and what it shows: the processing fee
is absorbed by Refuge International, so the buyer is never asked to cover it,
no fee is ever added to the charge, and no payment rail is pinned in the
payload. The step-1 layout is asserted too — the discount code box below the
participants section, no per-line "Guides" figure — along with the circular back
arrow in the top-left corner of the review step.

And the pay-by-check path, which is a form submission and nothing else: no
Stripe session and no payment record are ever requested, the record carries
`PaymentMethod: "Check"`, the confirmation shows the mailing address and the
confirmation code the forms service actually minted, and a submission that
failed to save is reported rather than confirmed.

That last one is why the suite asserts the submission *carried the order*, not
merely that one was sent. An earlier version branched to the check path above
`var formPayload = ...`; hoisting meant the assignment had not run, so it posted
`undefined` as the body — and the preview harness answered with a cheerful
canned success.

**Keep the mocks honest.** `POST /api/form` answers `{ id, formCode }`, and the
harness must answer the same. It used to reply `{ Id, FormCode__c }` — the
Salesforce field names the *request* is written in — which is what the form was
reading. The form found nothing, treated it as "no code", and carried on, so no
order ever carried its confirmation code into Stripe metadata and no checkout
session id was ever written back. The suite passed throughout, because the
harness was agreeing with the form instead of with production. A mock kinder
than the service it stands in for is worse than no mock at all.

It is here rather than in a scratchpad because a regression guard that does not
survive the session is not a guard. Nothing runs it automatically — this repo
has no CI — so run it by hand before changing
`scripts/hospitality-guide-order.js`.

```bash
# from the repository root
python3 -m http.server 8000
# in another shell
node dev/checks/check.js
```

It needs Playwright, which this repo does not depend on — install it wherever
you run it (`npm i -D playwright`, or globally and run with `NODE_PATH` set).
The script points `executablePath` at `/opt/pw-browsers/chromium`; change that
line if your Chromium lives elsewhere.

The preview harness mocks every service the form talks to, so none of this
creates a Stripe session, a Salesforce record or an email. That mocking is the
point — see the comment block at the top of the preview page.
