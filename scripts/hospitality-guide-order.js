const processOrderAPI = 'https://payment-processing-function.azurewebsites.net/api/transaction';

// The forms service, which records the order as a Form__c record in Salesforce:
// who ordered, for how many participants, where it ships. The payment service
// above records the money; this records the order. Same endpoint the volunteer,
// waiver, event and registration forms post to (mprefuge/forms, public/*.js).
const submitFormAPI = 'https://rif-hhh8e6e7cbc2hvdw.eastus-01.azurewebsites.net/api/form';

// ---------------------------------------------------------------------------
// SALESFORCE FORM RECORD
//
// The forms service takes the whole form configuration inline, on each request,
// as `__formConfig` - the client owns it, and there is nothing to deploy on the
// service to add a new form. This is that configuration.
//
// allowedFields is an allowlist, and it governs updates as well as creates:
// anything not named here is dropped from the payload before it reaches
// Salesforce. So a field added to the payload without being added here fails
// silently, which is exactly the sort of thing to remember when this is next
// edited.
//
// The participant count goes to Quantity__c, a whole-number field added to
// Form__c for exactly this. It is what makes "how many guides have we sold"
// answerable with a report rather than by reading records one at a time.
//
// It is ALSO still written into the Custom__c JSON, and that duplication is
// deliberate: Custom__c is what the forms service unpacks into the notification
// email, so the count stays visible to whoever reads that, and records created
// before Quantity__c existed stay readable the same way as the ones after.
// ---------------------------------------------------------------------------
// Who gets the notification email when an order is submitted.
//
// The forms service resolves recipients from the FIRST source that yields any:
// the submitted data, then this config's notificationEmails, then the function
// app's AdminEmail setting. There is no merging - naming anyone here REPLACES
// the AdminEmail default for this form, which is why it is one editable line.
// Semicolons or commas separate multiple addresses, the same convention the
// registration configs in the forms repo use.
//
// Matt owns the product and info@ is the address the buyer is pointed at, so
// both see every order as it arrives. The testing alias stays on the list while
// this is being proved out and can come off in the same edit later - though it
// costs nothing to leave, since it is a filtered alias.
//
// A live order and a test order look identical in this inbox, which is worth
// remembering while testing: everyone on this list sees the test ones too.
const HOSPITALITY_GUIDE_NOTIFICATION_EMAILS =
  "mattr@refugeintl.org;info@refugeintl.org;micah+testing@refugeintl.org";

const HOSPITALITY_GUIDE_FORM_CONFIG = {
  id: "hospitality-guide-order",
  name: "Hospitality Guide Order",
  description: "Order for the Hospitality Guide, priced per participant",
  version: "1.0.0",
  salesforce: {
    objectName: "Form__c",
    // An existing record type for standalone registrations, not tied to an
    // event Campaign - which is what a product order placed from the guide page
    // is. Keeps these out of event-registration reporting.
    recordTypeName: "Registration",
    allowedFields: [
      "FirstName__c",
      "LastName__c",
      "Email__c",
      "Phone__c",
      "Church__c",
      "Street__c",
      "City__c",
      "State__c",
      "Zip__c",
      "Country__c",
      "CurrentStatus__c",
      "Source__c",
      "WillPay__c",
      // The participant count, as a number Salesforce can total in a report.
      "Quantity__c",
      "Custom__c",
      "FormCode__c",
      // Written after Stripe answers, so the Salesforce record points at the
      // checkout session it became.
      "Stripe_Checkout_Session_Id__c"
    ],
    queryFields: ["Id", "FormCode__c", "FirstName__c", "LastName__c", "Email__c", "CreatedDate"],
    updateFields: [],
    searchField: "FormCode__c",
    lookupEmailField: "Email__c",
    lookupCodeField: "FormCode__c",
    codeGenerationEnabled: true,
    codeLength: 5
  },
  // Read straight off this config by the forms service. It has to live here
  // rather than in the payload: the notification resolver is handed the
  // FILTERED Salesforce fields, so a top-level NotificationEmail key in the
  // payload is dropped by the allowlist before anything reads it.
  notificationEmails: HOSPITALITY_GUIDE_NOTIFICATION_EMAILS,
  terms: { orgName: "Refuge International" }
};

// Where a buyer is sent with a question - printed in the confirmation email
// and in the too-large-to-order-online message below. One literal, so the two
// cannot drift apart if the address ever changes.
const HOSPITALITY_GUIDE_CONTACT_EMAIL = "info@refugeintl.org";

// The buyer's confirmation email.
//
// This is not optional decoration: asking the forms service to send anything
// (which is what puts the order in front of a human, via the notification to
// the address above) REQUIRES a confirmation template, and without one the
// service rejects the whole request with HTTP 400 and creates no record at all.
// That is exactly how the first version of this failed - silently, because a
// failed form submission never blocks the payment.
//
// The wording matters. This email is sent when the record is created, which is
// BEFORE the buyer has paid: they are about to be handed to Stripe and may
// never arrive. So it confirms the order details and says plainly that payment
// completes it - it must not claim the order is paid for.
//
// Available variables include FirstName, FormCode__c, orgName, and every
// Form__c field on the payload.
const HOSPITALITY_GUIDE_ORDER_EMAIL = {
  subject: "Your Hospitality Guide order",
  text: "Hello {{FirstName}},\n\nThank you - we have your order for the Hospitality Guide.\n\nYour order reference is: {{FormCode__c}}\n\nIf you have just been taken to our payment page, your order is confirmed once that payment completes. Guides and printed discussion workbooks ship at release.\n\nIf you have any questions, please email " + HOSPITALITY_GUIDE_CONTACT_EMAIL + " and quote your order reference.\n\n{{orgName}}",
  html: "<p>Hello {{FirstName}},</p><p>Thank you &mdash; we have your order for the <strong>Hospitality Guide</strong>.</p><p>Your order reference is: <strong>{{FormCode__c}}</strong></p><p>If you have just been taken to our payment page, your order is confirmed once that payment completes. Guides and printed discussion workbooks ship at release.</p><p>If you have any questions, please email <a href=\"mailto:" + HOSPITALITY_GUIDE_CONTACT_EMAIL + "\">" + HOSPITALITY_GUIDE_CONTACT_EMAIL + "</a> and quote your order reference.</p><p>{{orgName}}</p>"
};

// How long to wait for the forms service before giving up on it and going to
// payment anyway. Deliberately shorter than the payment timeout: this call is
// the ancillary one, and a buyer must never be kept waiting on it.
const FORM_SUBMIT_TIMEOUT_MS = 12000;

// ---------------------------------------------------------------------------
// HOSPITALITY GUIDE ORDER FORM
//
// A dedicated order form for the Hospitality Guide, embedded on the Hospitality
// Guide page rather than folded into the general donation form: per-participant
// tier pricing and a time-limited launch discount are order logic, not giving
// logic, and do not belong in a form whose job is to take donations.
//
// It computes the order total from the number of participants, applies whatever
// discount window is open today, and hands the finished total to the same
// payment service the donation form uses, which creates the Stripe Checkout
// Session the buyer is redirected to. No card details are ever entered here.
//
// Embed it with either mount point:
//     <div id="hospitality-guide-order"></div>      <!-- inline on the page -->
//     <div id="hospitality-guide-popup"></div>      <!-- modal, opens on #order-guide -->
//     <script src=".../hospitality-guide-order.js"></script>
//
// window.openHospitalityGuideModal() opens the modal from a button.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PRICING - per participant, by order size.
//
// These are the confirmed prices (Matt Reynolds, 28 Aug 2026). Every order is
// priced at ONE tier - the tier the whole order falls in - not by filling lower
// tiers first, so 30 participants is 30 x $38, never 24 x $40 plus 6 x $38.
//
// Prices are held in whole cents so nothing downstream has to divide. Edit a
// price or a boundary here and the tier table, the running total, the checkout
// amount and the order metadata all follow.
//
// The ranges must be contiguous and ascending: maxQty of one tier is exactly one
// below minQty of the next, and the last tier is open-ended (maxQty null).
// ---------------------------------------------------------------------------
const HOSPITALITY_GUIDE_TIERS = [
  { minQty: 1, maxQty: 9, unitCents: 4500, label: "Under 10 participants" },
  { minQty: 10, maxQty: 24, unitCents: 4000, label: "10-24 participants" },
  { minQty: 25, maxQty: 49, unitCents: 3800, label: "25-49 participants" },
  { minQty: 50, maxQty: 74, unitCents: 3500, label: "50-74 participants" },
  { minQty: 75, maxQty: 99, unitCents: 3000, label: "75-99 participants" },
  { minQty: 100, maxQty: null, unitCents: 2500, label: "100+ participants" }
];

// The largest order this form will take online. Not a business rule about how
// many guides can be sold - it is a guard so a typo (a stray zero, a pasted
// phone number) cannot mint a five-figure Checkout Session. Larger orders are
// real, and the form says who to contact.
const MAX_PARTICIPANTS = 1000;

// Who a too-large order is sent to. Shown only when the guard above trips.
const LARGE_ORDER_CONTACT = HOSPITALITY_GUIDE_CONTACT_EMAIL;

// ---------------------------------------------------------------------------
// DISCOUNT WINDOWS
//
// Two windows were agreed, and both are time-limited:
//
//   Pre-order  25% off, from now until the resource is released. Payment is
//              taken at order time - the discount is the incentive to buy early
//              - and the guides ship at release.
//   Launch     15% off, for the first month after release, promoted through
//              podcasts, social media and the SBC/PCA/Spire contact lists.
//
// The discount comes off the ORDER TOTAL, not off each participant's price.
// Matt asked for it that way and it is the simpler of the two to reason about;
// at these numbers the two are the same figure anyway, give or take a rounding
// cent on an odd total.
//
// EDIT THESE DATES. The release date is a mid-October target, not a confirmed
// date - Chip's video and the printed workbooks both have to land first - so
// the two boundaries below are placeholders and MUST be reset once the release
// date is fixed. Nothing else in this file needs to change with them.
//
// Each boundary is an exact instant with an explicit UTC offset, so the switch
// happens at midnight Eastern for every buyer rather than at midnight in
// whatever timezone their laptop happens to be set to. Mind the offset: -04:00
// is EDT (through 1 Nov 2026), -05:00 is EST after it.
//
// Windows are tried in order and the first one open today wins, so they must not
// overlap. When none is open the guide simply sells at full tier price - that is
// the intended end state after the launch month, not a fault.
// ---------------------------------------------------------------------------
const HOSPITALITY_GUIDE_RELEASE_TARGET = "mid-October 2026";

const HOSPITALITY_GUIDE_PROMOS = [
  {
    id: "preorder",
    percentOff: 25,
    // Open from the moment this form goes up until release.
    startsAt: null,
    endsAt: "2026-10-15T00:00:00-04:00",
    badge: "Pre-order pricing - 25% off",
    // Shown under the badge, and again above the pay button. This is the promise
    // the buyer is agreeing to, so it says plainly that the card is charged now.
    note: "Your card is charged today to reserve your order. Guides and printed discussion workbooks ship when the resource releases (target: " + HOSPITALITY_GUIDE_RELEASE_TARGET + ").",
    fulfillment: "ships-at-release"
  },
  {
    id: "launch",
    percentOff: 15,
    startsAt: "2026-10-15T00:00:00-04:00",
    endsAt: "2026-11-15T00:00:00-05:00",
    badge: "Launch month - 15% off",
    note: "Launch pricing, for the first month after release. Guides and printed discussion workbooks ship after your order is placed.",
    fulfillment: "ships-on-order"
  }
];

// The campaign every order is filed under, in Stripe, Salesforce and
// QuickBooks - and the product name shown on the Stripe payment page.
//
// One value for the life of the product, deliberately: it is a reporting key,
// so a pre-order and a launch-month order and a full-price order all belong to
// the same campaign and add up in one place. What distinguishes them travels in
// the order metadata instead - discount_promo, discount_percent and fulfillment
// - where it can be read per order without splitting the campaign.
const HOSPITALITY_GUIDE_CATEGORY = "Hospitality Guide";

// Used when no discount window is open.
const HOSPITALITY_GUIDE_FULFILLMENT = "ships-on-order";

// Shipping is included in the prices above. If the printer starts billing
// freight separately, set this to the flat amount in cents and it is added to
// every order, quoted on its own line. Left at 0 there is no shipping line at
// all - the form does not show a $0.00 charge.
const HOSPITALITY_GUIDE_SHIPPING_CENTS = 0;

// How close to the next tier a buyer has to be before the form points out that
// ordering a few more copies would drop their per-person price.
const TIER_NUDGE_WITHIN = 10;

// ---------------------------------------------------------------------------
// PROCESSING FEE CONFIGURATION - set the rate once, here.
//
// The HG_ prefix is load-bearing, not decoration. The donation form declares
// these same seven names at the top level of its own file, and two `const`
// declarations of one name in the same global scope is a SyntaxError that kills
// whichever script the page loads second - silently, as far as the visitor is
// concerned: one of the two forms simply never appears. Any page carrying both
// (the donation popup is injected site-wide, and it only takes one page to also
// carry this form) would lose one of them. Keep every top-level name in this
// file prefixed, and do not "tidy" the prefix away.
//
// window.STRIPE_RATE and data-stripe-rate are deliberately NOT prefixed: they
// are the host page's knob for the account's card rate, and both forms should
// answer to the same one.
//
// Identical in behaviour to the donation form's block, and for the same reason:
// the rate quoted on the payment chips and the rate the total is grossed up by
// are the same number by construction, so the form can never advertise one rate
// and charge another.
//
// A host page can override it without editing this file, either by setting
//     window.STRIPE_RATE = 2.2;   // before this script loads
// or by putting the rate on this script's own tag:
//     <script src=".../hospitality-guide-order.js" data-stripe-rate="2.2"></script>
// An override that is absent, empty, null, non-numeric, or outside the sane
// range (greater than 0, at most 10) is ignored and the default below is used.
const HG_STRIPE_RATE_PERCENT_DEFAULT = 2.2;

// American Express settles higher than the other card brands and is quoted on
// its own chip, so it gets its own knob.
const HG_STRIPE_AMEX_RATE_PERCENT = 3.5;

// Stripe's per-transaction fixed fee on cards and wallets, in cents.
const HG_STRIPE_FIXED_FEE_CENTS = 30;

function hgStripeConfiguredRatePercent() {
  var raw = null;
  try {
    if (typeof window !== "undefined" && window.STRIPE_RATE !== undefined && window.STRIPE_RATE !== null) {
      raw = window.STRIPE_RATE;
    }
    if (raw === null && typeof document !== "undefined") {
      var tag = document.currentScript || document.querySelector("script[data-stripe-rate]");
      if (tag && tag.getAttribute) raw = tag.getAttribute("data-stripe-rate");
    }
  } catch (e) {
    raw = null;
  }
  if (raw === null || raw === undefined || String(raw).trim() === "") return HG_STRIPE_RATE_PERCENT_DEFAULT;
  var pct = parseFloat(raw);
  if (!isFinite(pct) || pct <= 0 || pct > 10) return HG_STRIPE_RATE_PERCENT_DEFAULT;
  return pct;
}

const HG_STRIPE_RATE_BPS = Math.round(hgStripeConfiguredRatePercent() * 100);
const HG_STRIPE_AMEX_RATE_BPS = Math.round(HG_STRIPE_AMEX_RATE_PERCENT * 100);

function hgFeeChipLabel(bps, fixedCents) {
  return String(bps / 100) + "% + $" + (fixedCents / 100).toFixed(2);
}

const HG_STRIPE_CARD_FEE_LABEL = hgFeeChipLabel(HG_STRIPE_RATE_BPS, HG_STRIPE_FIXED_FEE_CENTS);
const HG_STRIPE_AMEX_FEE_LABEL = hgFeeChipLabel(HG_STRIPE_AMEX_RATE_BPS, HG_STRIPE_FIXED_FEE_CENTS);
// ---------------------------------------------------------------------------

(function () {
  "use strict";

  var BRAND_PRIMARY = "#BD2135";

  var states = ["", "AL - Alabama", "AK - Alaska", "AZ - Arizona", "AR - Arkansas", "CA - California", "CO - Colorado", "CT - Connecticut", "DE - Delaware", "FL - Florida", "GA - Georgia", "HI - Hawaii", "ID - Idaho", "IL - Illinois", "IN - Indiana", "IA - Iowa", "KS - Kansas", "KY - Kentucky", "LA - Louisiana", "ME - Maine", "MD - Maryland", "MA - Massachusetts", "MI - Michigan", "MN - Minnesota", "MS - Mississippi", "MO - Missouri", "MT - Montana", "NE - Nebraska", "NV - Nevada", "NH - New Hampshire", "NJ - New Jersey", "NM - New Mexico", "NY - New York", "NC - North Carolina", "ND - North Dakota", "OH - Ohio", "OK - Oklahoma", "OR - Oregon", "PA - Pennsylvania", "RI - Rhode Island", "SC - South Carolina", "SD - South Dakota", "TN - Tennessee", "TX - Texas", "UT - Utah", "VT - Vermont", "VA - Virginia", "WA - Washington", "WV - West Virginia", "WI - Wisconsin", "WY - Wyoming", "Outside US"];
  // Short on purpose. Unlike a donation, every order here ships a box of printed
  // workbooks, and the address lookup below only covers US addresses. Anywhere
  // else picks "Not Listed" and we sort the shipping out with them directly.
  var countries = ["", "United States", "Canada", "Mexico", "United Kingdom", "Ireland", "Australia", "New Zealand", "Not Listed"];

  var style = `
  <style id="hospitality-guide-style">
    .hg-modal { display:none; position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.48); align-items:center; justify-content:center; padding:16px; }
    /* The form paints its own light surfaces, so it has to state its own text
       colour too. Inheriting it from the host page looked fine on a white page
       and went white-on-white on a dark-themed one: the card titles, the
       "N participants x $40" line and its amount, and "Order total" all
       vanished, leaving a form that appeared to have lost the count. The
       colour-scheme is pinned for the same reason - it is what keeps the
       browser painting the text inside inputs, selects and the native
       checkbox dark, whatever scheme the surrounding page declares. */
    .hg-panel { background:#fff; color:#1a1a1a; color-scheme:light; width:100%; max-width:760px; border-radius:24px; box-shadow:0 10px 40px rgba(0,0,0,.15); }
    .hg-modal .hg-panel { max-height:92vh; overflow-y:auto; }
    .hg-header { display:flex; align-items:center; justify-content:center; position:relative; padding:12px 16px; background:#fff; color:#000; border-bottom:4px solid ${BRAND_PRIMARY}; border-radius:24px 24px 0 0; }
    .hg-header img { height:56px; }
    .hg-close { position:absolute; top:50%; right:16px; transform:translateY(-50%); font-size:24px; line-height:1; color:#000; opacity:.75; cursor:pointer; border:0; background:transparent; }
    .hg-close:hover { opacity:1; }
    .hg-body { padding:16px; max-width:700px; margin:0 auto; }
    .hg-card { background:#fff; border-radius:18px; box-shadow:0 6px 24px rgba(189,33,53,0.10), 0 1px 6px rgba(0,0,0,0.08); padding:24px; margin-bottom:16px; }
    .hg-card-inner { box-shadow:none; border:1.5px solid #eee; padding:18px; }
    .hg-title { font-weight:700; font-size:20px; margin-bottom:4px; text-align:center; }
    .hg-subtitle { font-size:14px; color:#555; text-align:center; margin-bottom:18px; }
    .hg-grid { display:grid; gap:12px; }
    .hg-grid-2 { grid-template-columns:1fr 1fr; }
    .hg-grid-4 { grid-template-columns:1fr 1fr 1fr 1fr; }
    .hg-label { display:block; font-size:14px; font-weight:600; margin-bottom:6px; color:#222; }
    /* Form controls do not inherit colour from an ancestor by default, so
       stating it on the panel above is not enough for these. */
    .hg-input, .hg-select { width:100%; padding:12px; border:1.5px solid #e0e0e0; border-radius:10px; background:#fafbfc; color:#1a1a1a; font-size:16px; outline:none; transition:.2s border-color,.2s box-shadow,.2s background; box-sizing:border-box; }
    .hg-input::placeholder { color:#8b8b8b; opacity:1; }
    .hg-input:focus, .hg-select:focus { border-color:${BRAND_PRIMARY}; box-shadow:0 0 0 2px #BD213533; background:#fff; }
    .hg-row { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; }
    .hg-chip { padding:12px 18px; border-radius:8px; border:1.5px solid #d4d4d4; background:#fff; color:#1a1a1a; font-weight:700; cursor:pointer; transition:.2s; font-size:16px; }
    .hg-chip:hover { border-color:${BRAND_PRIMARY}; color:${BRAND_PRIMARY}; }
    .hg-chip.selected { background:${BRAND_PRIMARY}; border-color:${BRAND_PRIMARY}; color:#fff; box-shadow:0 2px 10px rgba(189,33,53,.25); }

    /* Promo banner */
    .hg-promo { display:flex; flex-direction:column; gap:6px; align-items:center; text-align:center; padding:14px 16px; border-radius:12px; background:#fdf1f3; border:1.5px solid ${BRAND_PRIMARY}; margin-bottom:18px; }
    .hg-promo[hidden] { display:none; }
    .hg-promo-badge { font-weight:800; color:${BRAND_PRIMARY}; letter-spacing:.02em; }
    .hg-promo-note { font-size:13px; color:#444; line-height:1.45; }

    /* Quantity stepper */
    .hg-qty-wrap { display:flex; align-items:center; justify-content:center; gap:12px; margin-bottom:8px; }
    .hg-qty-btn { display:flex; align-items:center; justify-content:center; width:44px; height:44px; border-radius:50%; border:2px solid ${BRAND_PRIMARY}; background:transparent; color:${BRAND_PRIMARY}; cursor:pointer; font-size:24px; font-weight:700; transition:.2s; flex-shrink:0; }
    .hg-qty-btn:hover { background:${BRAND_PRIMARY}; color:#fff; }
    .hg-qty-btn:disabled { opacity:.3; cursor:not-allowed; border-color:#ccc; color:#ccc; background:transparent; }
    /* The native number spinners sit right next to the -/+ buttons and do the
       same job at a quarter of the size, so they are hidden. */
    .hg-qty-input { width:120px; text-align:center; font-size:22px; font-weight:800; padding:10px; appearance:textfield; -moz-appearance:textfield; }
    .hg-qty-input::-webkit-outer-spin-button, .hg-qty-input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
    .hg-nudge { text-align:center; font-size:13px; font-weight:600; color:${BRAND_PRIMARY}; min-height:18px; margin-bottom:12px; }

    /* Tier table */
    .hg-tiers { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px; }
    .hg-tier { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 14px; border:1.5px solid #e6e6e6; border-radius:10px; background:#fff; color:#1a1a1a; cursor:pointer; font-size:14px; text-align:left; transition:.2s; }
    .hg-tier:hover { border-color:${BRAND_PRIMARY}; }
    .hg-tier.active { border-color:${BRAND_PRIMARY}; background:#fdf1f3; box-shadow:0 2px 10px rgba(189,33,53,.12); }
    .hg-tier-range { color:#333; font-weight:600; }
    .hg-tier-price { font-weight:800; color:${BRAND_PRIMARY}; white-space:nowrap; }
    .hg-tier-price small { font-weight:600; color:#666; font-size:11px; }

    /* Money summary */
    .hg-lines { border-top:1px solid #eee; padding-top:12px; }
    .hg-line { display:flex; justify-content:space-between; gap:12px; font-size:15px; margin-bottom:6px; }
    /* Load-bearing: a line's own display:flex beats the [hidden] attribute's
       default display:none, so without this the discount line reads "-$0.00"
       outside a promotion and the shipping line quotes a $0.00 charge. */
    .hg-line[hidden] { display:none; }
    .hg-line-muted { color:#555; font-size:13px; }
    .hg-line-discount { color:${BRAND_PRIMARY}; font-weight:700; }
    .hg-line-total { font-weight:800; font-size:20px; border-top:1px solid #eee; padding-top:10px; margin-top:10px; }
    .hg-line-total span:last-child { color:${BRAND_PRIMARY}; }

    /* Payment method chips */
    .hg-payment-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; justify-items:center; margin-bottom:12px; }
    .hg-payment-chip { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; padding:16px 18px; min-width:100%; min-height:118px; text-align:center; border-radius:16px; transition:.3s all ease; }
    .hg-payment-chip:hover { transform:translateY(-3px); box-shadow:0 8px 20px rgba(189,33,53,.2); }
    .hg-payment-chip span { font-weight:600; font-size:14px; }
    .hg-payment-chip small { font-size:11px; font-weight:500; opacity:.8; }
    .hg-payment-chip.selected { transform:translateY(-3px); box-shadow:0 8px 20px rgba(189,33,53,.4); }
    .hg-payment-chip.selected img { filter:invert(1); }
    .hg-payment-chip.selected .hg-wallet-explainer { color:#fff; }
    .hg-payment-chip.selected svg .hg-wallet-main { fill:#fff; stroke:#fff; }
    .hg-payment-chip.selected svg .hg-wallet-circle, .hg-payment-chip.selected svg .hg-wallet-bar { fill:${BRAND_PRIMARY}; }
    .hg-wallet-explainer { font-size:10px; color:#666; line-height:1.2; }
    .hg-card-type-chip { display:flex; flex-direction:column; align-items:center; gap:4px; padding:12px 16px; min-width:104px; border-radius:12px; }
    .hg-card-type-chip span { font-weight:600; font-size:13px; }
    .hg-card-type-chip small { font-size:10px; font-weight:500; opacity:.8; }

    /* Checkbox */
    .hg-checkbox-container { display:inline-flex; align-items:center; gap:8px; cursor:pointer; }
    .hg-checkbox { appearance:none; width:20px; height:20px; border:2px solid #e0e0e0; border-radius:4px; background:#fff; cursor:pointer; transition:.2s; position:relative; flex-shrink:0; }
    .hg-checkbox:checked { background:${BRAND_PRIMARY}; border-color:${BRAND_PRIMARY}; }
    .hg-checkbox:checked::after { content:'\\2713'; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#fff; font-size:12px; font-weight:700; }
    .hg-checkbox:focus { outline:none; box-shadow:0 0 0 2px rgba(189,33,53,.25); }

    /* Buttons + steps */
    .hg-steps { display:flex; justify-content:center; margin-bottom:20px; }
    .hg-step { width:12px; height:12px; border-radius:50%; background:#ccc; margin:0 8px; }
    .hg-step.active { background:${BRAND_PRIMARY}; }
    .hg-step.completed { background:#000; }
    .hg-step-content { display:none; }
    .hg-step-content.active { display:block; }
    .hg-nav-buttons { display:flex; justify-content:space-between; align-items:center; margin-top:20px; gap:12px; }
    .hg-btn { padding:12px 24px; border:2px solid ${BRAND_PRIMARY}; background:${BRAND_PRIMARY}; color:#fff; border-radius:8px; cursor:pointer; font-weight:600; transition:.3s all ease; }
    .hg-btn.secondary { background:transparent; color:${BRAND_PRIMARY}; }
    .hg-btn:hover { opacity:.9; transform:translateY(-1px); box-shadow:0 4px 12px rgba(189,33,53,.25); }
    .hg-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; box-shadow:none; }
    .hg-cta { display:block; width:100%; padding:16px; font-size:20px; font-weight:800; border:0; border-radius:12px; background:${BRAND_PRIMARY}; color:#fff; cursor:pointer; transition:.2s; box-shadow:0 6px 20px rgba(189,33,53,.18); }
    .hg-cta:hover { background:#a81c2d; }
    .hg-cta:disabled { opacity:.5; cursor:not-allowed; }
    .hg-trust { text-align:center; font-size:12px; color:#555; margin-top:10px; }
    .hg-fineprint { text-align:center; font-size:13px; color:#666; margin:12px 0 4px; line-height:1.45; }
    .hg-error-message { color:${BRAND_PRIMARY}; font-size:12px; font-weight:600; margin-top:4px; display:none; }
    .hg-error-message.hg-center { text-align:center; }

    /* Test-mode indicator: loud, and deliberately not brand red - brand red
       already means "something went wrong" everywhere else on this form. */
    .hg-testmode { display:flex; align-items:center; justify-content:center; gap:10px; flex-wrap:wrap; padding:10px 14px; font-size:13px; font-weight:600; line-height:1.4; text-align:center; background:#FFD34D; color:#1a1a1a; border-bottom:4px solid #1a1a1a; }
    .hg-testmode[hidden] { display:none; }
    .hg-testmode .hg-testmode-tag { display:inline-block; padding:3px 10px; border-radius:999px; background:#1a1a1a; color:#FFD34D; font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; white-space:nowrap; }
    .hg-testmode.hg-testmode-mismatch { background:#1a1a1a; color:#FFD34D; border-bottom-color:${BRAND_PRIMARY}; }
    .hg-testmode.hg-testmode-mismatch .hg-testmode-tag { background:${BRAND_PRIMARY}; color:#fff; }

    .hg-embedded { max-width:760px; margin:0 auto; }
    .hg-embedded .hg-panel { max-width:none; border-radius:20px; }
    .hg-embedded .hg-header { border-radius:20px 20px 0 0; }

    @media (max-width: 600px) {
      .hg-panel { border-radius:12px; }
      .hg-header { border-radius:12px 12px 0 0; }
      .hg-body { padding:12px; }
      .hg-card { padding:18px; }
      .hg-grid-2, .hg-grid-4 { grid-template-columns:1fr; }
      .hg-tiers { grid-template-columns:1fr; }
      .hg-payment-grid { grid-template-columns:1fr; }
      .hg-payment-chip { min-height:96px; }
      .hg-cta { border-radius:999px; font-size:18px; }
      .hg-nav-buttons { flex-direction:column-reverse; align-items:stretch; }
    }
  </style>`;

  // --- money + pricing helpers ---------------------------------------------
  //
  // Everything is computed in whole cents and formatted only at the edges, so
  // the figure on the pay button and the figure in the payload are the same
  // integer rather than two roundings of one float.

  function money(cents) {
    return "$" + (Math.round(cents) / 100).toFixed(2);
  }

  // Whole-dollar prices read better without the ".00" in the tier table.
  function moneyShort(cents) {
    return cents % 100 === 0 ? "$" + (cents / 100) : money(cents);
  }

  function tierFor(qty) {
    for (var i = 0; i < HOSPITALITY_GUIDE_TIERS.length; i++) {
      var t = HOSPITALITY_GUIDE_TIERS[i];
      if (qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty)) return t;
    }
    return null;
  }

  function tierIndexFor(qty) {
    for (var i = 0; i < HOSPITALITY_GUIDE_TIERS.length; i++) {
      var t = HOSPITALITY_GUIDE_TIERS[i];
      if (qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty)) return i;
    }
    return -1;
  }

  // A window is open when now is at or after startsAt (or it has no start) and
  // strictly before endsAt.
  //
  // A boundary that will not parse is treated as "this window is not open",
  // never as "no limit". A typo in a date must fall back to full price rather
  // than leave 25% off running forever.
  function promoOpenAt(promo, nowMs) {
    if (!promo) return false;
    if (promo.startsAt) {
      var starts = Date.parse(promo.startsAt);
      if (!isFinite(starts)) return false;
      if (nowMs < starts) return false;
    }
    if (promo.endsAt) {
      var ends = Date.parse(promo.endsAt);
      if (!isFinite(ends)) return false;
      if (nowMs >= ends) return false;
    }
    return true;
  }

  function activePromoAt(nowMs) {
    for (var i = 0; i < HOSPITALITY_GUIDE_PROMOS.length; i++) {
      if (promoOpenAt(HOSPITALITY_GUIDE_PROMOS[i], nowMs)) return HOSPITALITY_GUIDE_PROMOS[i];
    }
    return null;
  }

  // The whole order, priced. One function, so the tier table, the running total,
  // the review lines, the pay button and the payload all read the same numbers.
  //
  // The discount is taken off the order total, as agreed, and rounded to the
  // whole cent. Shipping is added after the discount: a freight charge is not
  // part of what the launch promotion discounts.
  function priceOrder(qty, promo) {
    var tier = qty > 0 ? tierFor(qty) : null;
    var unitCents = tier ? tier.unitCents : 0;
    var subtotalCents = tier ? qty * unitCents : 0;
    var percentOff = promo ? promo.percentOff : 0;
    var discountCents = Math.round(subtotalCents * percentOff / 100);
    var shippingCents = subtotalCents > 0 ? HOSPITALITY_GUIDE_SHIPPING_CENTS : 0;
    return {
      qty: qty,
      tier: tier,
      unitCents: unitCents,
      subtotalCents: subtotalCents,
      percentOff: percentOff,
      discountCents: discountCents,
      shippingCents: shippingCents,
      orderCents: subtotalCents - discountCents + shippingCents
    };
  }

  // --- markup ---------------------------------------------------------------

  function orderDetailsHTML(prefix) {
    var tiersHTML = HOSPITALITY_GUIDE_TIERS.map(function (t, i) {
      return `
        <button type="button" class="hg-tier" data-tier="${i}" data-min="${t.minQty}" title="Set participants to ${t.minQty}">
          <span class="hg-tier-range">${t.label}</span>
          <span class="hg-tier-price">${moneyShort(t.unitCents)}<small>/person</small></span>
        </button>`;
    }).join("");

    return `
      <div class="hg-step-content active" id="${prefix}-step1">
        <div class="hg-card">
          <div class="hg-title">Order the Hospitality Guide</div>
          <div class="hg-subtitle">Pricing is per participant, and the price per person drops as your group grows. Every order includes a printed discussion workbook for each participant.</div>

          <div class="hg-promo" id="${prefix}-promo" hidden>
            <div class="hg-promo-badge" id="${prefix}-promo-badge"></div>
            <div class="hg-promo-note" id="${prefix}-promo-note"></div>
          </div>

          <label class="hg-label" for="${prefix}-qty" style="text-align:center;">How many participants?</label>
          <div class="hg-qty-wrap">
            <button type="button" class="hg-qty-btn" id="${prefix}-qty-minus" aria-label="One fewer participant">&minus;</button>
            <input type="number" inputmode="numeric" min="1" max="${MAX_PARTICIPANTS}" step="1" id="${prefix}-qty" class="hg-input hg-qty-input" placeholder="0" aria-describedby="${prefix}-qty-error">
            <button type="button" class="hg-qty-btn" id="${prefix}-qty-plus" aria-label="One more participant">+</button>
          </div>
          <div id="${prefix}-qty-error" class="hg-error-message hg-center" role="alert"></div>
          <div class="hg-nudge" id="${prefix}-nudge"></div>

          <div class="hg-tiers" id="${prefix}-tiers">${tiersHTML}</div>

          <div class="hg-lines" id="${prefix}-step1-lines">
            <div class="hg-line"><span id="${prefix}-subtotal-label">Guides</span><span id="${prefix}-subtotal">$0.00</span></div>
            <div class="hg-line hg-line-discount" id="${prefix}-discount-line" hidden><span id="${prefix}-discount-label">Discount</span><span id="${prefix}-discount">$0.00</span></div>
            <div class="hg-line hg-line-muted" id="${prefix}-shipping-line" hidden><span>Shipping</span><span id="${prefix}-shipping">$0.00</span></div>
            <div class="hg-line hg-line-total"><span>Order total</span><span id="${prefix}-order-total">$0.00</span></div>
          </div>

          <div class="hg-nav-buttons">
            <span></span>
            <button type="button" class="hg-btn" id="${prefix}-next1">Next</button>
          </div>
        </div>
      </div>`;
  }

  function buyerInfoHTML(prefix) {
    return `
      <div class="hg-step-content" id="${prefix}-step2">
        <div class="hg-card">
          <div class="hg-title">Your Information</div>
          <div class="hg-subtitle">Where should we ship the guides and workbooks?</div>

          <div style="margin-bottom:20px;">
            <div class="hg-row">
              <button type="button" class="hg-chip hg-buyer-type-chip selected" data-buyer-type="organization">Church / Organization</button>
              <button type="button" class="hg-chip hg-buyer-type-chip" data-buyer-type="individual">Individual</button>
            </div>
            <input type="hidden" id="${prefix}-buyer-type" value="organization">
          </div>

          <div id="${prefix}-organization-fields" style="margin-bottom:16px;">
            <label class="hg-label" for="${prefix}-organization-name">Church or Organization Name</label>
            <input class="hg-input" id="${prefix}-organization-name">
            <div id="${prefix}-organization-name-error" class="hg-error-message">Please enter the church or organization name</div>
          </div>

          <div class="hg-grid hg-grid-2" style="margin-bottom:16px;">
            <div>
              <label class="hg-label" for="${prefix}-firstname">Contact First Name</label>
              <input class="hg-input" id="${prefix}-firstname">
              <div id="${prefix}-firstname-error" class="hg-error-message">Please enter a first name</div>
            </div>
            <div>
              <label class="hg-label" for="${prefix}-lastname">Contact Last Name</label>
              <input class="hg-input" id="${prefix}-lastname">
              <div id="${prefix}-lastname-error" class="hg-error-message">Please enter a last name</div>
            </div>
          </div>

          <div class="hg-grid hg-grid-2" style="margin-bottom:16px;">
            <div>
              <label class="hg-label" for="${prefix}-email">Email</label>
              <input type="email" class="hg-input" id="${prefix}-email">
              <div id="${prefix}-email-error" class="hg-error-message">Please enter a valid email address</div>
            </div>
            <div>
              <label class="hg-label" for="${prefix}-phone">Phone</label>
              <input type="tel" class="hg-input" id="${prefix}-phone">
              <div id="${prefix}-phone-error" class="hg-error-message">Please enter a phone number</div>
            </div>
          </div>

          <div class="hg-grid" id="${prefix}-address-lookup-row" style="margin-bottom:16px;">
            <div style="position:relative;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                <label class="hg-label" for="${prefix}-address-lookup" style="margin:0;">Shipping Address</label>
                <span id="${prefix}-enter-manually" style="font-size:14px;font-weight:700;cursor:pointer;color:${BRAND_PRIMARY};">Enter manually</span>
              </div>
              <input class="hg-input" id="${prefix}-address-lookup" placeholder="Start typing your address..." autocomplete="off">
              <div id="${prefix}-address-suggestions" style="position:absolute;z-index:10001;top:100%;left:0;width:100%;background:#fff;border:1px solid #ddd;border-radius:0 0 10px 10px;box-shadow:0 8px 20px rgba(0,0,0,.08);display:none;max-height:220px;overflow:auto;"></div>
            </div>
          </div>

          <div id="${prefix}-manual-address" style="display:none;">
            <div class="hg-grid hg-grid-2" style="margin-bottom:12px;">
              <div>
                <label class="hg-label" for="${prefix}-addr1">Address Line 1</label>
                <input class="hg-input" id="${prefix}-addr1">
                <div id="${prefix}-addr1-error" class="hg-error-message">Please enter the shipping address</div>
              </div>
              <div>
                <label class="hg-label" for="${prefix}-addr2">Address Line 2 (optional)</label>
                <input class="hg-input" id="${prefix}-addr2">
              </div>
            </div>
            <div class="hg-grid hg-grid-4" style="margin-bottom:12px;">
              <div>
                <label class="hg-label" for="${prefix}-city">City</label>
                <input class="hg-input" id="${prefix}-city">
                <div id="${prefix}-city-error" class="hg-error-message">Please enter your city</div>
              </div>
              <div>
                <label class="hg-label" for="${prefix}-state">State</label>
                <select class="hg-select" id="${prefix}-state"></select>
                <div id="${prefix}-state-error" class="hg-error-message">Please choose your state</div>
              </div>
              <div>
                <label class="hg-label" for="${prefix}-zip">Zip Code</label>
                <input class="hg-input" id="${prefix}-zip">
                <div id="${prefix}-zip-error" class="hg-error-message">Please enter your zip code</div>
              </div>
              <div>
                <label class="hg-label" for="${prefix}-country">Country</label>
                <select class="hg-select" id="${prefix}-country"></select>
                <div id="${prefix}-country-error" class="hg-error-message">Please choose your country</div>
              </div>
            </div>
          </div>

          <div class="hg-nav-buttons">
            <button type="button" class="hg-btn secondary" id="${prefix}-prev2">Previous</button>
            <button type="button" class="hg-btn" id="${prefix}-next2">Next</button>
          </div>
        </div>
      </div>`;
  }

  function reviewHTML(prefix) {
    return `
      <div class="hg-step-content" id="${prefix}-step3">
        <div class="hg-card">
          <div class="hg-title">Review Your Order</div>
          <div class="hg-subtitle" id="${prefix}-review-ship-to"></div>

          <div class="hg-lines">
            <div class="hg-line"><span id="${prefix}-review-guides-label">Guides</span><span id="${prefix}-review-guides">$0.00</span></div>
            <div class="hg-line hg-line-discount" id="${prefix}-review-discount-line" hidden><span id="${prefix}-review-discount-label">Discount</span><span id="${prefix}-review-discount">$0.00</span></div>
            <div class="hg-line hg-line-muted" id="${prefix}-review-shipping-line" hidden><span>Shipping</span><span id="${prefix}-review-shipping">$0.00</span></div>
            <div class="hg-line hg-line-muted"><span>Processing fees <span id="${prefix}-fee-label"></span></span><span id="${prefix}-review-fee">$0.00</span></div>
            <div class="hg-line hg-line-total"><span>Total charged today</span><span id="${prefix}-review-total">$0.00</span></div>
          </div>

          <div class="hg-card hg-card-inner" style="margin-top:16px;">
            <div style="display:flex;justify-content:center;">
              <label class="hg-checkbox-container">
                <input type="checkbox" id="${prefix}-cover-fee" class="hg-checkbox">
                <span style="font-weight:600;">I would like to cover the processing fees</span>
              </label>
            </div>

            <div id="${prefix}-payment-method-section" style="display:none;margin-top:16px;">
              <label class="hg-label">Payment Method</label>
              <div class="hg-payment-grid" id="${prefix}-pm-row">
                <button type="button" class="hg-chip hg-payment-chip" data-method="card">
                  <img src="https://js.stripe.com/v3/fingerprinted/img/card-ce24697297bd3c6a00fdd2fb6f760f0d.svg" alt="" width="32" height="32" />
                  <span>Credit/Debit Card</span>
                </button>
                <button type="button" class="hg-chip hg-payment-chip" data-method="us_bank_account">
                  <img src="https://js.stripe.com/v3/fingerprinted/img/bank-de5c9ead31505d57120e98291cb20e57.svg" alt="" width="32" height="32" />
                  <span>Bank Transfer</span>
                  <small>0.8% (max $5)</small>
                </button>
                <button type="button" class="hg-chip hg-payment-chip" data-method="wallet">
                  <svg width="32" height="32" viewBox="0 0 40 28" fill="none" aria-hidden="true">
                    <rect class="hg-wallet-main" x="2" y="4" width="36" height="20" rx="4" fill="#000"/>
                    <rect class="hg-wallet-main" x="2" y="4" width="36" height="20" rx="4" stroke="#333" stroke-width="2"/>
                    <circle class="hg-wallet-circle" cx="32" cy="14" r="4" fill="#fff"/>
                    <rect class="hg-wallet-bar" x="6" y="10" width="18" height="4" rx="2" fill="#fff"/>
                  </svg>
                  <span>Digital Wallet</span>
                  <div class="hg-wallet-explainer">Apple Pay, Google Pay</div>
                  <small>${HG_STRIPE_CARD_FEE_LABEL}</small>
                </button>
              </div>

              <div id="${prefix}-card-type-section" style="margin-top:12px;">
                <label class="hg-label">Card Type</label>
                <div class="hg-row" id="${prefix}-card-type-row">
                  <button type="button" class="hg-chip hg-card-type-chip" data-card-type="visa"><span>Visa</span><small>${HG_STRIPE_CARD_FEE_LABEL}</small></button>
                  <button type="button" class="hg-chip hg-card-type-chip" data-card-type="mastercard"><span>Mastercard</span><small>${HG_STRIPE_CARD_FEE_LABEL}</small></button>
                  <button type="button" class="hg-chip hg-card-type-chip" data-card-type="amex"><span>Amex</span><small>${HG_STRIPE_AMEX_FEE_LABEL}</small></button>
                  <button type="button" class="hg-chip hg-card-type-chip" data-card-type="other"><span>Other</span><small>${HG_STRIPE_CARD_FEE_LABEL}</small></button>
                </div>
              </div>
            </div>
          </div>

          <div class="hg-fineprint" id="${prefix}-fulfillment-note"></div>

          <button type="button" id="${prefix}-submit" class="hg-cta" disabled>Enter the number of participants</button>
          <div id="${prefix}-submit-error" class="hg-error-message hg-center" role="alert" aria-live="assertive" style="margin-top:8px;"></div>
          <div class="hg-fineprint">After clicking pay, you will be taken to Stripe to enter your payment information.</div>
          <div class="hg-trust">Secure payment powered by Stripe</div>

          <div class="hg-nav-buttons">
            <button type="button" class="hg-btn secondary" id="${prefix}-prev3">Previous</button>
            <span></span>
          </div>
        </div>
      </div>`;
  }

  function formHTML(prefix, embedded) {
    return `
      <div class="${embedded ? "hg-embedded" : ""}">
        <div class="hg-panel">
          <div class="hg-header">
            <img src="https://images.squarespace-cdn.com/content/v1/5af0bc3a96d45593d7d7e55b/c8c56eb8-9c50-4540-822a-5da3f5d0c268/refuge-logo-edit+%28circle+with+horizontal+RI+name%29+-+small.png" alt="Refuge International"/>
            ${embedded ? "" : `<button class="hg-close" id="${prefix}-close" aria-label="Close">&times;</button>`}
          </div>
          <div class="hg-testmode" id="${prefix}-testmode" role="status" aria-live="polite" hidden>
            <span class="hg-testmode-tag" id="${prefix}-testmode-tag"></span>
            <span class="hg-testmode-text" id="${prefix}-testmode-text"></span>
          </div>
          <div class="hg-body" id="${prefix}-body">
            <div class="hg-steps">
              <div class="hg-step active" id="${prefix}-step-indicator-1"></div>
              <div class="hg-step" id="${prefix}-step-indicator-2"></div>
              <div class="hg-step" id="${prefix}-step-indicator-3"></div>
            </div>
            ${orderDetailsHTML(prefix)}
            ${buyerInfoHTML(prefix)}
            ${reviewHTML(prefix)}
          </div>
        </div>
      </div>`;
  }

  function ensureStyle() {
    if (!document.getElementById("hospitality-guide-style")) {
      document.head.insertAdjacentHTML("beforeend", style);
    }
  }

  // Parameters are read from the page's query string AND from the hash, so a
  // link can carry them either way round:
  //     .../hospitality-guide?testMode=1&testKey=<key>
  //     .../hospitality-guide#order-guide?testMode=1&testKey=<key>
  //
  // The donation form reads the hash only, because its parameters ride on the
  // same #donate fragment that opens its modal. This form is embedded in the
  // page rather than opened by a fragment, so the query string is the more
  // natural place to put them and the one an operator reaches for first - a
  // keyed test link that silently did nothing would be a trap, and the whole
  // point of the key is that the operator can tell test from live.
  //
  // Both are read rather than one or the other, and the hash wins where they
  // disagree: it is the more specific of the two, and the form of link the
  // donation form established.
  function parseParams() {
    var params = {};

    function absorb(queryString) {
      if (!queryString) return;
      new URLSearchParams(queryString).forEach(function (value, key) {
        params[key] = value;
      });
    }

    absorb((window.location.search || "").replace(/^\?/, ""));

    var hash = window.location.hash || "";
    var marker = hash.indexOf("?");
    if (marker !== -1) absorb(hash.slice(marker + 1));

    return params;
  }

  function mountPopup() {
    var root = document.getElementById("hospitality-guide-popup");
    if (!root) return;
    ensureStyle();

    root.innerHTML = `<div class="hg-modal" id="hg-modal">${formHTML("hg-popup", false)}</div>`;

    var modal = document.getElementById("hg-modal");
    var closeBtn = document.getElementById("hg-popup-close");

    function hideModal() {
      modal.style.display = "none";
      history.pushState("", document.title, window.location.pathname + window.location.search);
    }
    function checkHash() {
      if ((window.location.hash || "").indexOf("#order-guide") === 0) modal.style.display = "flex";
    }
    checkHash();
    window.addEventListener("hashchange", checkHash);
    modal.addEventListener("click", function (e) { if (e.target === modal) hideModal(); });
    if (closeBtn) closeBtn.addEventListener("click", hideModal);

    wireUp("hg-popup", parseParams());
  }

  function mountEmbedded() {
    var root = document.getElementById("hospitality-guide-order");
    if (!root) return;
    ensureStyle();
    root.innerHTML = formHTML("hg-embedded", true);
    wireUp("hg-embedded", parseParams());
  }

  function populateSelect(id, options) {
    var sel = document.getElementById(id);
    if (!sel) return;
    options.forEach(function (opt) {
      var o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      sel.appendChild(o);
    });
  }

  function wireUp(prefix, params) {
    var el = function (suffix) { return document.getElementById(prefix + "-" + suffix); };

    var currentStep = 1;
    var TOTAL_STEPS = 3;

    // --- test mode ----------------------------------------------------------
    //
    // Carried over from the donation form unchanged, and for the same reason:
    // ?testMode=1 on its own is something anybody can put in a link and send to
    // a buyer, so it only takes effect alongside the operator's key, which the
    // payment service checks against its own setting. Without the key this is an
    // ordinary live order with no badge and nothing unusual shown.
    function testModeKey() {
      var key = params && params.testKey;
      if (typeof key !== "string") return "";
      return key.trim();
    }

    function isTestModeRequested() {
      var flag = params && params.testMode;
      if (typeof flag !== "string") return false;
      flag = flag.trim().toLowerCase();
      if (flag !== "1" && flag !== "true" && flag !== "yes") return false;
      return testModeKey() !== "";
    }

    // The clock the discount windows are judged against.
    //
    // ?asOf=<date> lets QA see what the form will look like during the launch
    // window, or after every window has closed, without editing the file. It is
    // gated behind the same operator key as test mode on purpose: the date
    // decides the price, so an ungated override would be a link that hands
    // anyone 25% off long after the pre-order window shut.
    function nowMs() {
      if (isTestModeRequested() && params && typeof params.asOf === "string") {
        var pinned = Date.parse(params.asOf);
        if (isFinite(pinned)) return pinned;
      }
      return Date.now();
    }

    // Resolved fresh on every recalculation rather than cached at load, so a page
    // left open across midnight on the day a window closes reprices itself
    // instead of quietly holding an expired discount.
    function currentPromo() {
      return activePromoAt(nowMs());
    }

    // --- quantity -----------------------------------------------------------
    var qtyInput = el("qty");
    var qtyMinus = el("qty-minus");
    var qtyPlus = el("qty-plus");
    var qtyError = el("qty-error");
    var nudgeEl = el("nudge");
    var tiersRow = el("tiers");

    // The quantity as an order quantity: a whole number of participants, or 0
    // when the field does not hold one yet. 0 is "not answered", which is why
    // the total reads $0.00 and the pay button stays disabled.
    function quantity() {
      var raw = (qtyInput.value || "").trim();
      if (raw === "") return 0;
      var n = parseInt(raw, 10);
      if (!isFinite(n) || n < 1) return 0;
      if (n > MAX_PARTICIPANTS) return MAX_PARTICIPANTS;
      return n;
    }

    function quantityProblem() {
      var raw = (qtyInput.value || "").trim();
      if (raw === "") return "";
      var n = Number(raw);
      if (!isFinite(n) || Math.floor(n) !== n) return "Please enter a whole number of participants.";
      if (n < 1) return "Please enter at least 1 participant.";
      if (n > MAX_PARTICIPANTS) {
        return "For orders over " + MAX_PARTICIPANTS + " participants, please contact us at " + LARGE_ORDER_CONTACT + ".";
      }
      return "";
    }

    function setQuantity(n) {
      qtyInput.value = String(Math.max(1, Math.min(MAX_PARTICIPANTS, n)));
      updateTotals();
    }

    // The typed-in count is recalculated by the shared field loop further down,
    // along with every other input on the form.
    qtyMinus.addEventListener("click", function () { setQuantity(quantity() - 1); });
    qtyPlus.addEventListener("click", function () { setQuantity(quantity() + 1); });

    // Clicking a tier is the fastest way to say "we are a group of about this
    // size" - it jumps the count to the smallest order that earns that price.
    tiersRow.addEventListener("click", function (e) {
      var t = e.target.closest(".hg-tier");
      if (!t) return;
      setQuantity(parseInt(t.getAttribute("data-min"), 10));
    });

    // What ordering a few more copies would buy. Only shown when the next tier
    // is genuinely within reach, and it says so in the buyer's terms: the price
    // per person, and - where the tier break more than pays for the extra copies
    // - that the larger order actually costs less in total.
    function nudgeText(qty, promo) {
      if (qty <= 0) return "";
      var idx = tierIndexFor(qty);
      if (idx < 0 || idx >= HOSPITALITY_GUIDE_TIERS.length - 1) return "";
      var next = HOSPITALITY_GUIDE_TIERS[idx + 1];
      var need = next.minQty - qty;
      if (need <= 0 || need > TIER_NUDGE_WITHIN) return "";

      var msg = "Add " + need + (need === 1 ? " more participant" : " more participants") +
        " to reach " + moneyShort(next.unitCents) + "/person";
      var here = priceOrder(qty, promo).orderCents;
      var there = priceOrder(next.minQty, promo).orderCents;
      if (there < here) {
        msg += " - " + need + " more " + (need === 1 ? "copy" : "copies") + " for " + money(here - there) + " less overall";
      }
      return msg + ".";
    }

    function paintTiers(qty) {
      var activeIndex = qty > 0 ? tierIndexFor(qty) : -1;
      var buttons = tiersRow.querySelectorAll(".hg-tier");
      Array.prototype.forEach.call(buttons, function (btn) {
        var idx = parseInt(btn.getAttribute("data-tier"), 10);
        btn.classList.toggle("active", idx === activeIndex);
      });
    }

    // --- buyer type ---------------------------------------------------------
    var buyerTypeHidden = el("buyer-type");
    var organizationFields = el("organization-fields");
    var buyerTypeRow = document.querySelector("#" + prefix + "-step2 .hg-row");

    if (buyerTypeRow) {
      buyerTypeRow.addEventListener("click", function (e) {
        var t = e.target.closest(".hg-buyer-type-chip");
        if (!t) return;
        var type = t.getAttribute("data-buyer-type");
        buyerTypeRow.querySelectorAll(".hg-buyer-type-chip").forEach(function (c) { c.classList.remove("selected"); });
        t.classList.add("selected");
        buyerTypeHidden.value = type;
        // An individual buyer still gives a name; they just have no organization
        // to name, so that field goes away rather than becoming an optional
        // question they have to decide about.
        organizationFields.style.display = type === "organization" ? "" : "none";
        clearFieldErrors();
        updateTotals();
      });
    }

    // --- address ------------------------------------------------------------
    populateSelect(prefix + "-state", states);
    populateSelect(prefix + "-country", countries);

    var lookupRow = el("address-lookup-row");
    var lookupInput = el("address-lookup");
    var suggestions = el("address-suggestions");
    var enterManual = el("enter-manually");
    var manualWrap = el("manual-address");

    var addr1 = el("addr1");
    var addr2 = el("addr2");
    var city = el("city");
    var stateSel = el("state");
    var zip = el("zip");
    var countrySel = el("country");

    function revealManualAddress() {
      if (manualWrap) manualWrap.style.display = "";
    }

    var lookupTimeout = null;
    lookupInput.addEventListener("input", function () {
      var val = lookupInput.value.trim();
      if (val.length < 5) { suggestions.style.display = "none"; suggestions.innerHTML = ""; return; }
      if (lookupTimeout) clearTimeout(lookupTimeout);
      lookupTimeout = setTimeout(function () {
        fetch("https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(val) + "&format=json&addressdetails=1&limit=5&countrycodes=us")
          .then(function (r) { return r.json(); })
          .then(function (res) {
            suggestions.innerHTML = "";
            if (!res || !res.length) { suggestions.style.display = "none"; return; }
            res.forEach(function (item) {
              var div = document.createElement("div");
              div.textContent = item.display_name;
              div.style.padding = "10px 12px";
              div.style.cursor = "pointer";
              div.addEventListener("mouseenter", function () { div.style.background = "#f7f7f7"; });
              div.addEventListener("mouseleave", function () { div.style.background = "#fff"; });
              div.addEventListener("click", function () {
                lookupInput.value = item.display_name;
                var a = item.address || {};
                addr1.value = (a.house_number ? a.house_number + " " : "") + (a.road || a.pedestrian || a.footway || a.cycleway || a.path || "");
                city.value = a.city || a.town || a.suburb || a.village || a.hamlet || a.municipality || a.city_district || a.county || "";
                zip.value = a.postcode || "";
                // Match the state exactly, against the option's two letter code or
                // its full name. A substring scan files every Kansas buyer as an
                // Arkansas buyer: "AR - Arkansas" lowercases to a string that
                // contains "kansas", and AR is reached first.
                var stateName = (a.state || "").trim().toLowerCase();
                var stateOpt = !stateName ? "" : (states.find(function (s) {
                  var parts = s.split(" - ");
                  return parts.length === 2 && (stateName === parts[0].toLowerCase() || stateName === parts[1].toLowerCase());
                }) || "");
                stateSel.value = stateOpt;
                countrySel.value = countries.find(function (c) { return c === (a.country || "United States"); }) || "United States";
                suggestions.style.display = "none";
                manualWrap.style.display = "";
                lookupRow.style.display = "none";
                updateTotals();
              });
              suggestions.appendChild(div);
            });
            suggestions.style.display = "block";
          })
          .catch(function () {
            // The lookup can fail or be rate limited. Silently hiding the dropdown
            // leaves the buyer with nothing to click, so open the manual fields.
            suggestions.style.display = "none";
            revealManualAddress();
          });
      }, 300);
    });

    document.addEventListener("click", function (e) {
      if (!lookupRow.contains(e.target)) suggestions.style.display = "none";
    });

    enterManual.addEventListener("click", function () {
      manualWrap.style.display = "";
      lookupRow.style.display = "none";
    });

    // --- fees ---------------------------------------------------------------
    var coverFee = el("cover-fee");
    var paymentMethodSection = el("payment-method-section");
    var pmRow = el("pm-row");
    var cardTypeRow = el("card-type-row");
    var cardTypeSection = el("card-type-section");

    var paymentMethod = "card";
    var cardType = "visa";

    function selectChipGroup(row, valueAttr, value) {
      if (!row) return;
      var btns = row.querySelectorAll(".hg-chip");
      btns.forEach(function (b) { b.classList.remove("selected"); });
      var target = Array.prototype.find.call(btns, function (b) { return b.getAttribute(valueAttr) === value; });
      if (target) target.classList.add("selected");
    }

    selectChipGroup(pmRow, "data-method", paymentMethod);
    selectChipGroup(cardTypeRow, "data-card-type", cardType);

    coverFee.addEventListener("change", function () {
      if (coverFee.checked) {
        paymentMethodSection.style.display = "block";
      } else {
        paymentMethodSection.style.display = "none";
        // The chips live entirely inside that section, so once it is hidden the
        // buyer can no longer see or change what is selected. Put both back to
        // their defaults so the form never submits a rail that is invisible.
        paymentMethod = "card";
        cardType = "visa";
        selectChipGroup(pmRow, "data-method", paymentMethod);
        selectChipGroup(cardTypeRow, "data-card-type", cardType);
        if (cardTypeSection) cardTypeSection.style.display = "block";
      }
      updateTotals();
    });

    pmRow.addEventListener("click", function (e) {
      var t = e.target.closest(".hg-chip");
      if (!t) return;
      paymentMethod = t.getAttribute("data-method");
      selectChipGroup(pmRow, "data-method", paymentMethod);
      if (paymentMethod === "card") {
        cardTypeSection.style.display = "block";
        if (!cardType) {
          cardType = "visa";
          selectChipGroup(cardTypeRow, "data-card-type", cardType);
        }
      } else {
        cardTypeSection.style.display = "none";
        cardType = null;
      }
      updateTotals();
    });

    if (cardTypeRow) {
      cardTypeRow.addEventListener("click", function (e) {
        var t = e.target.closest(".hg-chip");
        if (!t) return;
        cardType = t.getAttribute("data-card-type");
        selectChipGroup(cardTypeRow, "data-card-type", cardType);
        updateTotals();
      });
    }

    // The processing fee this form quotes, by payment method: a percentage in
    // basis points, a fixed charge in cents, and an optional cap. One table,
    // because both numbers feed the gross-up as well as the quote.
    function feeRateFor(method, card) {
      if (method === "us_bank_account") {
        // Stripe's ACH pricing is its own structure and does not follow the card
        // rate: 0.8% capped at $5.00, and NO per-transaction fixed fee.
        return { bps: 80, fixedCents: 0, capCents: 500 };
      }
      if (method === "card" && card === "amex") {
        return { bps: HG_STRIPE_AMEX_RATE_BPS, fixedCents: HG_STRIPE_FIXED_FEE_CENTS, capCents: null };
      }
      return { bps: HG_STRIPE_RATE_BPS, fixedCents: HG_STRIPE_FIXED_FEE_CENTS, capCents: null };
    }

    // What the processor deducts from a charge of totalCents - what the org
    // gives up, not what the buyer adds.
    function feeCentsOn(totalCents) {
      if (totalCents <= 0) return 0;
      var rate = feeRateFor(paymentMethod, cardType);
      var fee = Math.round(totalCents * rate.bps / 10000) + rate.fixedCents;
      if (rate.capCents !== null && fee > rate.capCents) return rate.capCents;
      return fee;
    }

    // The total to charge so that, once the processor has taken its cut, exactly
    // baseCents reaches the org.
    //
    // This is a gross-up, not a surcharge. Charging baseCents plus the fee ON
    // baseCents always lands short, because the processor then takes its
    // percentage on the larger total too: the fee has to pay for itself. Solving
    //     total - (pct * total + fixed) = base
    // gives total = (base + fixed) / (1 - pct), carried out in basis points so
    // both operands stay exact integers, rounded UP to the whole cent so the
    // rounding can never leave the org short.
    function grossedUpTotalCents(baseCents) {
      if (baseCents <= 0) return 0;
      var rate = feeRateFor(paymentMethod, cardType);
      var numerator = (baseCents + rate.fixedCents) * 10000;
      var denominator = 10000 - rate.bps;
      var totalCents = Math.floor((numerator + denominator - 1) / denominator);
      // Past the cap the fee stops growing with the total, so grossing up is just
      // the flat cap on top; the formula above would over-charge beyond that.
      if (rate.capCents !== null && totalCents - baseCents > rate.capCents) {
        return baseCents + rate.capCents;
      }
      return totalCents;
    }

    // Single source of truth for every money figure on the form. Everything is
    // derived from the same integers, so the number on the pay button and the
    // numbers in the payload cannot drift apart: the button shows totalCents,
    // and the payload sends orderCents and coveredFeeCents, whose sum is
    // totalCents by construction.
    function computeTotals() {
      var promo = currentPromo();
      var order = priceOrder(quantity(), promo);
      var cover = coverFee.checked;
      var totalCents = cover ? grossedUpTotalCents(order.orderCents) : order.orderCents;
      var feeCents = cover ? totalCents - order.orderCents : feeCentsOn(order.orderCents);

      return {
        promo: promo,
        order: order,
        coverFee: cover,
        feeCents: feeCents,
        coveredFeeCents: cover ? feeCents : 0,
        totalCents: totalCents
      };
    }

    // --- steps + validation -------------------------------------------------
    function showStep(step) {
      for (var i = 1; i <= TOTAL_STEPS; i++) {
        var content = el("step" + i);
        if (content) content.classList.toggle("active", i === step);
        var indicator = el("step-indicator-" + i);
        if (indicator) {
          indicator.classList.remove("active", "completed");
          if (i < step) indicator.classList.add("completed");
          else if (i === step) indicator.classList.add("active");
        }
      }
      currentStep = step;
      updateTotals();
    }

    function orderStepValid(showErrors) {
      var problem = quantityProblem();
      var ok = quantity() > 0 && problem === "";
      if (showErrors && qtyError) {
        var message = problem || (quantity() > 0 ? "" : "Please enter the number of participants.");
        qtyError.textContent = message;
        qtyError.style.display = message ? "block" : "none";
      }
      return ok;
    }

    function buyerStepValid(showErrors) {
      var buyerType = buyerTypeHidden.value;
      var checks = [
        { ok: /.+@.+\..+/.test(el("email").value.trim()), error: "email-error" },
        { ok: el("phone").value.trim().length > 0, error: "phone-error" },
        { ok: el("firstname").value.trim().length > 0, error: "firstname-error" },
        { ok: el("lastname").value.trim().length > 0, error: "lastname-error" },
        // The payload sends the structured address fields and nothing else, so
        // those are what has to be filled in. Text left in the lookup box is not
        // an address anything can ship to.
        { ok: addr1.value.trim().length > 0, error: "addr1-error" },
        { ok: city.value.trim().length > 0, error: "city-error" },
        { ok: stateSel.value.trim().length > 0, error: "state-error" },
        { ok: zip.value.trim().length > 0, error: "zip-error" },
        { ok: countrySel.value.trim().length > 0, error: "country-error" }
      ];

      if (buyerType === "organization") {
        checks.push({ ok: el("organization-name").value.trim().length > 0, error: "organization-name-error" });
      }

      var allOk = true;
      checks.forEach(function (check) {
        if (!check.ok) allOk = false;
        if (showErrors) {
          var errorEl = el(check.error);
          if (errorEl) errorEl.style.display = check.ok ? "none" : "block";
        }
      });

      // If the address is not complete, make sure the buyer can actually see and
      // finish the fields rather than being stopped by a hidden requirement.
      if (showErrors && !allOk) revealManualAddress();

      return allOk;
    }

    function clearFieldErrors() {
      var ids = ["qty-error", "organization-name-error", "firstname-error", "lastname-error",
        "email-error", "phone-error", "addr1-error", "city-error", "state-error", "zip-error", "country-error"];
      ids.forEach(function (id) {
        var errorEl = el(id);
        if (errorEl) errorEl.style.display = "none";
      });
    }

    el("next1").addEventListener("click", function () { if (orderStepValid(true)) showStep(2); });
    el("next2").addEventListener("click", function () { if (buyerStepValid(true)) showStep(3); });
    el("prev2").addEventListener("click", function () { showStep(1); });
    el("prev3").addEventListener("click", function () { showStep(2); });

    // --- submit-side state --------------------------------------------------
    var submitBtn = el("submit");
    var submitError = el("submit-error");

    function showSubmitError(message) {
      if (!submitError) return;
      submitError.textContent = message;
      submitError.style.display = "block";
    }

    function hideSubmitError() {
      if (!submitError) return;
      submitError.textContent = "";
      submitError.style.display = "none";
    }

    // True from the moment a submission is sent until it fails. updateTotals()
    // runs on input across the whole form and re-derives submitBtn.disabled, so
    // without this flag a keystroke during an in-flight request would re-enable
    // the button and a second click would mint a second Checkout Session.
    var submitting = false;

    // The payment function cold-starts, so a slow first call is normal - but the
    // buyer should not be left on a dead button indefinitely either.
    var SUBMIT_TIMEOUT_MS = 45000;

    var clientReferenceId = null;
    var clientReferenceSignature = null;

    function makeReferenceId() {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
      }
      return "ref-" + Date.now().toString(16) +
        "-" + Math.random().toString(16).slice(2, 10) +
        "-" + Math.random().toString(16).slice(2, 10);
    }

    // --- test-mode indicator ------------------------------------------------
    //
    // isTestModeRequested() is only this form's intent. The payment service
    // resolves live vs test itself, so an indicator driven by intent alone can
    // cheerfully say TEST MODE while the server is about to take a real card
    // payment. Before submit it says exactly what was requested; once the
    // service answers, the mode is re-read from the Checkout Session it actually
    // created and the indicator is confirmed, corrected, or turned into a stop.
    var testModeBanner = el("testmode");
    var testModeTag = el("testmode-tag");
    var testModeText = el("testmode-text");

    function setTestModeBanner(tag, text, isMismatch) {
      if (!testModeBanner) return;
      if (isMismatch) {
        testModeBanner.classList.add("hg-testmode-mismatch");
        testModeBanner.setAttribute("role", "alert");
        testModeBanner.setAttribute("aria-live", "assertive");
      } else {
        testModeBanner.classList.remove("hg-testmode-mismatch");
        testModeBanner.setAttribute("role", "status");
        testModeBanner.setAttribute("aria-live", "polite");
      }
      if (testModeTag) testModeTag.textContent = tag;
      if (testModeText) testModeText.textContent = text;
      testModeBanner.hidden = false;
    }

    function hideTestModeBanner() {
      if (!testModeBanner) return;
      testModeBanner.hidden = true;
      testModeBanner.classList.remove("hg-testmode-mismatch");
    }

    // What Stripe itself says about the session the service just created: true
    // for live, false for test, null when the response carries neither signal.
    // Never guess here - a wrong "confirmed" is worse than an honest
    // "unconfirmed".
    function readSessionLivemode(session) {
      if (!session) return null;
      if (typeof session.livemode === "boolean") return session.livemode;
      var haystack = "";
      if (typeof session.id === "string") haystack += session.id;
      if (typeof session.url === "string") haystack += " " + session.url;
      if (haystack.indexOf("cs_test_") !== -1) return false;
      if (haystack.indexOf("cs_live_") !== -1) return true;
      return null;
    }

    // --- painting -----------------------------------------------------------
    function participantsLabel(qty, unitCents) {
      return qty + (qty === 1 ? " participant" : " participants") + " x " + moneyShort(unitCents);
    }

    function updateTotals() {
      var t = computeTotals();
      var order = t.order;
      var promo = t.promo;

      // Promo banner
      var promoEl = el("promo");
      if (promoEl) {
        if (promo) {
          el("promo-badge").textContent = promo.badge;
          el("promo-note").textContent = promo.note;
          promoEl.hidden = false;
        } else {
          promoEl.hidden = true;
        }
      }

      // Quantity controls
      var qty = quantity();
      qtyMinus.disabled = qty <= 1;
      qtyPlus.disabled = qty >= MAX_PARTICIPANTS;
      paintTiers(qty);
      if (nudgeEl) nudgeEl.textContent = nudgeText(qty, promo);

      var problem = quantityProblem();
      if (qtyError && problem) {
        qtyError.textContent = problem;
        qtyError.style.display = "block";
      } else if (qtyError && qtyError.style.display === "block" && !problem) {
        qtyError.style.display = "none";
      }

      var guidesLabel = qty > 0 ? participantsLabel(qty, order.unitCents) : "Guides";
      var discountLabel = promo ? promo.badge.split(" - ")[0] + " (" + promo.percentOff + "% off)" : "";

      // Step 1 lines
      el("subtotal-label").textContent = guidesLabel;
      el("subtotal").textContent = money(order.subtotalCents);
      el("discount-line").hidden = !promo || order.discountCents <= 0;
      el("discount-label").textContent = discountLabel;
      el("discount").textContent = "-" + money(order.discountCents);
      el("shipping-line").hidden = order.shippingCents <= 0;
      el("shipping").textContent = money(order.shippingCents);
      el("order-total").textContent = money(order.orderCents);

      // Step 3 lines
      el("review-guides-label").textContent = guidesLabel;
      el("review-guides").textContent = money(order.subtotalCents);
      el("review-discount-line").hidden = !promo || order.discountCents <= 0;
      el("review-discount-label").textContent = discountLabel;
      el("review-discount").textContent = "-" + money(order.discountCents);
      el("review-shipping-line").hidden = order.shippingCents <= 0;
      el("review-shipping").textContent = money(order.shippingCents);
      el("review-fee").textContent = money(t.feeCents);
      el("fee-label").textContent = t.coverFee ? "" : "(covered by Refuge International)";
      el("review-total").textContent = money(t.totalCents);

      var shipTo = el("review-ship-to");
      if (shipTo) {
        var cityValue = city.value.trim();
        var stateValue = (stateSel.value || "").split(" - ")[0];
        shipTo.textContent = cityValue && stateValue ? "Shipping to " + cityValue + ", " + stateValue : "";
      }

      var fulfillmentNote = el("fulfillment-note");
      if (fulfillmentNote) fulfillmentNote.textContent = promo ? promo.note : "";

      // Leave the button label alone while a submission is in flight, so a
      // keystroke cannot wipe out the "Transferring to Stripe..." message.
      if (!submitting) {
        submitBtn.textContent = t.totalCents > 0
          ? "Pay " + money(t.totalCents)
          : "Enter the number of participants";
        submitBtn.disabled = !readyToSubmit();
      }
    }

    function readyToSubmit() {
      if (submitting) return false;
      return orderStepValid(false) && buyerStepValid(false);
    }

    // Recalculate on anything that can move a number or unlock the button.
    ["qty", "organization-name", "firstname", "lastname", "email", "phone",
      "addr1", "addr2", "city", "state", "zip", "country", "address-lookup"].forEach(function (id) {
      var field = el(id);
      if (!field) return;
      ["input", "change"].forEach(function (ev) {
        field.addEventListener(ev, function () {
          var errorEl = el(id + "-error");
          if (errorEl && id !== "qty") errorEl.style.display = "none";
          updateTotals();
        });
      });
    });

    // --- submit -------------------------------------------------------------
    submitBtn.addEventListener("click", function () {
      if (submitting) return;
      if (!orderStepValid(true) || !buyerStepValid(true)) return;

      // Priced one last time at the moment of submission rather than reusing a
      // figure painted earlier: on a page left open across a window boundary,
      // this is what stops an order being charged at yesterday's discount.
      var totals = computeTotals();
      if (totals.totalCents <= 0) return;

      var promo = totals.promo;
      var order = totals.order;
      var buyerType = buyerTypeHidden.value;
      var firstname = el("firstname").value.trim();
      var lastname = el("lastname").value.trim();
      var organization = el("organization-name").value.trim();

      var summary = participantsLabel(order.qty, order.unitCents) + " = " + money(order.subtotalCents) +
        (order.discountCents > 0 ? ", less " + order.percentOff + "% " + promo.id + " discount (" + money(order.discountCents) + ")" : "") +
        (order.shippingCents > 0 ? ", plus " + money(order.shippingCents) + " shipping" : "") +
        " = " + money(order.orderCents);

      var payload = {
        // What this form believes the Stripe mode should be, and the key that
        // authorises the service to act on it. Without a matching key the
        // service ignores `livemode` and routes by its own configuration, which
        // is what keeps a crafted ?testMode=1 link from diverting a real order.
        livemode: !isTestModeRequested(),
        donationType: buyerType,
        email: el("email").value.trim(),
        phone: el("phone").value.trim(),
        firstname: firstname,
        lastname: lastname,
        address: {
          line1: addr1.value,
          line2: addr2.value,
          city: city.value,
          state: (stateSel.value || "").split(" - ")[0],
          postal_code: zip.value,
          country: countrySel.value
        },
        // The order total in whole cents, after the discount, with no fee folded
        // in. The service charges exactly amount + feeAmount.
        amount: order.orderCents,
        coverFee: coverFee.checked,
        // The fee this form quoted, in whole cents - always a non-negative
        // integer, and 0 whenever the buyer did not elect to cover it. The API
        // uses this verbatim instead of recalculating, so the charge is exactly
        // the number printed on the pay button.
        feeAmount: totals.coveredFeeCents,
        // Purchases are never recurring.
        frequency: "onetime",
        // The campaign, and the product name on the Stripe Checkout page. The
        // same for every order whatever window it was placed in; the window
        // itself is recorded in metadata below.
        category: HOSPITALITY_GUIDE_CATEGORY,
        // Everything needed to fulfil and reconcile the order, carried through
        // to Stripe metadata (and from there to Salesforce and QuickBooks).
        // These are the numbers the printer's order and the packing list are
        // built from, so they travel with the payment rather than living only in
        // this browser.
        metadata: {
          product: "hospitality-guide",
          participants: order.qty,
          unit_price: money(order.unitCents),
          price_tier: order.tier ? order.tier.label : "",
          subtotal: money(order.subtotalCents),
          discount_promo: promo ? promo.id : "none",
          discount_percent: order.percentOff,
          discount_amount: money(order.discountCents),
          shipping: money(order.shippingCents),
          order_total: money(order.orderCents),
          order_summary: summary,
          fulfillment: promo ? promo.fulfillment : HOSPITALITY_GUIDE_FULFILLMENT,
          workbooks: order.qty
        }
      };

      if (buyerType === "organization") {
        payload.organization = organization;
      }

      // Declare a payment rail only when the buyer actually chose one. The rail
      // chips are shown only when cover-fees is ticked; posting the reset
      // default otherwise would pin Checkout to card only and make paying by
      // bank impossible for exactly the orders that cost the most to collect.
      // It must be OMITTED, not sent as null or "" - request validation accepts
      // an absent field and rejects an empty string with HTTP 400.
      if (coverFee.checked) {
        payload.paymentMethod = paymentMethod;
        payload.cardType = cardType;
      }

      // Stable across retries of the same order: a buyer who resubmits after a
      // failure keeps the same reference, while a changed order gets a new one.
      // Every field that can move the charged total belongs here.
      var referenceSignature = [
        payload.amount,
        payload.feeAmount,
        payload.category,
        payload.email,
        payload.coverFee,
        payload.paymentMethod,
        payload.cardType,
        payload.donationType,
        order.qty
      ].join("|");

      if (!clientReferenceId || referenceSignature !== clientReferenceSignature) {
        clientReferenceId = makeReferenceId();
        clientReferenceSignature = referenceSignature;
      }
      payload.clientReferenceId = clientReferenceId;

      // Only on the test path, and added after the signature is built on
      // purpose: the key does not change the charged total, so switching it must
      // not mint a new reference id for what is otherwise the same attempt.
      if (isTestModeRequested()) {
        payload.testKey = testModeKey();
      }

      submitting = true;
      var originalButtonText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Transferring to Stripe...";
      hideSubmitError();

      // The Salesforce side of the order: who ordered, how many participants,
      // and where it ships.
      //
      // Field names are Form__c's own. Church__c holds the church or
      // organisation name - the object has no generic "organisation" field, and
      // the buyers for this resource are churches. An individual buyer simply
      // leaves it unset.
      //
      // Quantity__c carries the participant count as a number, so it can be
      // summed and filtered in a report. Custom__c carries it again, along with
      // everything Form__c has nowhere else to put, because that is what the
      // notification email is built from.
      var formPayload = {
        __formConfig: HOSPITALITY_GUIDE_FORM_CONFIG,
        // Asks the service to send its notification, so an order lands in
        // somebody's inbox rather than only in Salesforce. The service unpacks
        // Custom__c into readable rows in that email.
        //
        // __emailTemplates is required alongside it - the key has to end in
        // "Copy" for the service to recognise it - and omitting it fails the
        // whole submission, not just the email.
        __sendEmail: true,
        __emailTemplates: { orderCopy: HOSPITALITY_GUIDE_ORDER_EMAIL },
        FirstName__c: firstname,
        LastName__c: lastname,
        Email__c: payload.email,
        Phone__c: payload.phone,
        Street__c: [addr1.value, addr2.value].filter(Boolean).join(", "),
        City__c: city.value,
        State__c: (stateSel.value || "").split(" - ")[0],
        Zip__c: zip.value,
        Country__c: countrySel.value,
        // The form was submitted; whether it was paid is a question for the
        // payment record. Nothing here flips this to Registered when the charge
        // succeeds - that would have to happen in the payment pipeline.
        CurrentStatus__c: "Submitted",
        WillPay__c: true,
        Source__c: "Hospitality Guide order form",
        Quantity__c: order.qty,
        Custom__c: JSON.stringify({
          Product: "Hospitality Guide",
          Participants: order.qty,
          Workbooks: order.qty,
          PricePerParticipant: money(order.unitCents),
          PriceTier: order.tier ? order.tier.label : "",
          Subtotal: money(order.subtotalCents),
          Discount: promo ? promo.percentOff + "% " + promo.id : "none",
          DiscountAmount: money(order.discountCents),
          OrderTotal: money(order.orderCents),
          CoveredProcessingFee: totals.coveredFeeCents ? money(totals.coveredFeeCents) : "not covered",
          TotalCharged: money(totals.totalCents),
          Fulfillment: promo ? promo.fulfillment : HOSPITALITY_GUIDE_FULFILLMENT,
          OrderSummary: summary,
          ClientReferenceId: clientReferenceId
        })
      };

      if (buyerType === "organization") {
        formPayload.Church__c = organization;
      }

      // Best effort, and deliberately so. A buyer who is ready to pay must not
      // be stopped because the forms service is slow or down: the money is the
      // part that cannot be recreated later, and everything in the form record
      // is also carried in the payment payload's own metadata, so nothing is
      // actually lost if this fails. It resolves to the created record, or to
      // null - it never rejects.
      function createFormRecord() {
        var formController = typeof AbortController === "function" ? new AbortController() : null;
        var formTimedOut = false;
        var formTimeoutId = setTimeout(function () {
          formTimedOut = true;
          if (formController) formController.abort();
        }, FORM_SUBMIT_TIMEOUT_MS);

        var options = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formPayload)
        };
        if (formController) options.signal = formController.signal;

        return fetch(submitFormAPI, options)
          .then(function (r) {
            clearTimeout(formTimeoutId);
            return r.text().then(function (text) {
              var data = null;
              try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
              if (!r.ok) {
                console.error(
                  "[Hospitality Guide] The order was NOT recorded in Salesforce: the forms service " +
                  "returned HTTP " + r.status + ". The payment still went ahead. Response: " + text
                );
                return null;
              }
              return data;
            });
          })
          .catch(function (err) {
            clearTimeout(formTimeoutId);
            console.error(formTimedOut
              ? "Form service did not respond within " + FORM_SUBMIT_TIMEOUT_MS + "ms; continuing to payment"
              : "Form service call failed; continuing to payment", err);
            return null;
          });
      }

      // The confirmation code and record id the forms service hands back, kept
      // so the payment can name them and the record can be updated afterwards.
      var formRecord = null;

      function readFormField(record, name) {
        if (!record || typeof record !== "object") return "";
        var direct = record[name];
        if (typeof direct === "string" && direct) return direct;
        var nested = record.form || record.record || record.data;
        if (nested && typeof nested === "object" && typeof nested[name] === "string") return nested[name];
        return "";
      }

      // Once Stripe has answered, point the Salesforce record at the checkout
      // session it became. Sent with keepalive so it still completes after the
      // redirect takes the page away, and never awaited: this is bookkeeping,
      // and the buyer should not wait a round trip for it.
      function linkCheckoutSession(session) {
        var code = readFormField(formRecord, "FormCode__c");
        if (!code || !session || !session.id) return;
        try {
          fetch(submitFormAPI, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify({
              __formConfig: HOSPITALITY_GUIDE_FORM_CONFIG,
              FormCode__c: code,
              Stripe_Checkout_Session_Id__c: session.id
            })
          }).catch(function () { /* bookkeeping only */ });
        } catch (e) {
          /* bookkeeping only */
        }
      }

      // Redacted copy: this line goes to a console the buyer can open, and on a
      // shared screen or a screenshot the key would travel with it.
      var loggablePayload = Object.assign({}, payload);
      if (loggablePayload.testKey) loggablePayload.testKey = "[redacted]";
      console.log("Sending Hospitality Guide order payload:", JSON.stringify(loggablePayload, null, 2));

      var controller = typeof AbortController === "function" ? new AbortController() : null;
      var timedOut = false;
      var timeoutId = setTimeout(function () {
        timedOut = true;
        if (controller) controller.abort();
      }, SUBMIT_TIMEOUT_MS);

      var fetchOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      };
      if (controller) fetchOptions.signal = controller.signal;

      // The order record is created first, the same way the event registration
      // form does it, so the confirmation code it mints can travel with the
      // payment and tie the two together in Salesforce. It never rejects and
      // never blocks: a null record just means the payment carries no code.
      createFormRecord()
        .then(function (record) {
          formRecord = record;
          var code = readFormField(record, "FormCode__c");
          var id = readFormField(record, "Id");
          if (code) payload.metadata.form_code = code;
          if (id) payload.metadata.form_id = id;
          if (code || id) {
            fetchOptions.body = JSON.stringify(payload);
            console.log("Order recorded in Salesforce" + (code ? " as " + code : "") + "; sending to payment");
          }
          return fetch(processOrderAPI, fetchOptions);
        })
        .then(function (r) {
          clearTimeout(timeoutId);
          // Read the body as text first. An error page from the host (an Azure
          // 502 or 504) is HTML, and r.json() would die on it with an opaque
          // parse error.
          return r.text().then(function (text) {
            var data = null;
            if (text) {
              try { data = JSON.parse(text); } catch (e) { data = null; }
            }

            if (!r.ok) {
              console.error("Order service error body:", text);
              // A 4xx usually says something the buyer can act on; a 5xx is ours
              // and its message is internal detail, so that stays in the console.
              var detail = (r.status < 500 && data && (data.message || data.error)) || "";
              throw new Error(
                "We could not start your order (error " + r.status + ")." + (detail ? " " + detail : "")
              );
            }

            if (!data) {
              throw new Error("We got an unexpected response from the payment service (status " + r.status + ").");
            }

            return data;
          });
        })
        .then(function (session) {
          if (!session || (!session.url && !session.id)) {
            throw new Error("The payment service did not return a checkout session.");
          }

          // Reconcile what this form asked for against what the service actually
          // did, before the buyer leaves for Stripe.
          var requestedTest = isTestModeRequested();
          var serverLive = readSessionLivemode(session);

          if (serverLive === null) {
            // The response proves nothing about which Stripe account was used.
            // Say so rather than confirming something we cannot see. Live
            // ordering stays silent: there is no claim to correct.
            if (requestedTest) {
              setTestModeBanner(
                "Test mode unconfirmed",
                "The payment service did not report which Stripe mode it used, so this could not be verified. Check the Stripe dashboard before treating this as a test.",
                false
              );
            }
          } else if (serverLive !== requestedTest) {
            // Intent and reality agree. Only test mode is announced - a real
            // buyer must never see a mode badge.
            if (requestedTest) {
              setTestModeBanner(
                "Test mode confirmed",
                "The payment service created a Stripe TEST checkout session. No real money will move and no real card is needed.",
                false
              );
            } else {
              hideTestModeBanner();
            }
          } else {
            // Intent and reality disagree, which is the whole reason this check
            // exists: either a test run is about to charge a real card, or a
            // real order is about to land in the test account and collect
            // nothing. Neither is recoverable after the redirect.
            var mismatchMessage = requestedTest
              ? "This form asked for TEST mode, but the payment service created a LIVE Stripe checkout session. Continuing would charge a real card."
              : "This form is running in LIVE mode, but the payment service created a TEST Stripe checkout session. An order completed here would not collect any money.";

            setTestModeBanner("Stripe mode mismatch", mismatchMessage + " Stopped before payment.", true);
            console.error(
              "Stripe mode mismatch: form requested " + (requestedTest ? "test" : "live") +
              " mode, backend returned a " + (serverLive ? "live" : "test") + " checkout session."
            );
            showSubmitError(
              mismatchMessage +
              " We stopped before sending you to the payment page, and your card has not been charged." +
              " Please contact us instead of retrying - the payment service needs to be reconfigured first."
            );

            // submitting stays true and the button stays disabled on purpose.
            // Retrying would hit the same mismatch and mint another abandoned
            // Checkout Session.
            submitBtn.textContent = "Stopped - payment mode mismatch";
            return;
          }

          // Only once the mode checks above have passed, so a session the form
          // refused to send the buyer to is never written to the record either.
          linkCheckoutSession(session);

          if (session.url) {
            window.location.assign(session.url);
            return;
          }

          var key = session.livemode
            ? "pk_live_fJSacHhPB2h0mJfsFowRm8lQ"
            : "pk_test_51PzyoABS5xFjv3JBy3mmsCoOLtKn6FBWwX86eUifluDOUkqUZzz5FVRwrqpM046SLkXDIc32rmDaQtcldtBYU2Yt00jeGdMCmn";
          if (!window.Stripe) {
            throw new Error("The payment library did not load, so we could not open the payment page.");
          }

          return window.Stripe(key).redirectToCheckout({ sessionId: session.id })
            .then(function (result) {
              // redirectToCheckout resolves with an { error } object instead of
              // rejecting when the redirect cannot happen.
              if (result && result.error) {
                throw new Error(result.error.message || "Stripe could not open the payment page.");
              }
            });
        })
        .catch(function (err) {
          clearTimeout(timeoutId);

          if (timedOut) {
            console.error("Checkout error: no response within " + SUBMIT_TIMEOUT_MS + "ms, request aborted");
          } else {
            console.error("Checkout error:", err);
          }

          showSubmitError(
            (timedOut
              ? "The payment service did not respond in time."
              : (err && err.message ? err.message : "Something went wrong while starting your order.")) +
            " Your card has not been charged. Please try again."
          );

          // Restore the button only on error. On success the redirect takes
          // over, so the guard stays set and the button stays disabled.
          submitting = false;
          submitBtn.textContent = originalButtonText;
          submitBtn.disabled = false;
        });
    });

    // --- initial paint ------------------------------------------------------
    if (params && params.participants) {
      var preset = parseInt(params.participants, 10);
      if (isFinite(preset) && preset > 0) qtyInput.value = String(Math.min(MAX_PARTICIPANTS, preset));
    }

    updateTotals();

    // Provisional half of the test-mode indicator. All this can honestly claim
    // before a request has been made is what the form is going to ask for.
    if (isTestModeRequested()) {
      setTestModeBanner(
        "Test mode requested",
        "This form will ask the payment service for Stripe test mode. That is confirmed against the real checkout session when you submit - do not treat this as proof yet.",
        false
      );
    } else {
      hideTestModeBanner();
    }
  }

  window.openHospitalityGuideModal = function () {
    var modal = document.getElementById("hg-modal");
    if (modal) modal.style.display = "flex";
  };
  window.closeHospitalityGuideModal = function () {
    var modal = document.getElementById("hg-modal");
    if (modal) modal.style.display = "none";
  };

  document.addEventListener("DOMContentLoaded", function () {
    mountPopup();     // attaches to #hospitality-guide-popup (if present)
    mountEmbedded();  // attaches to #hospitality-guide-order (if present)
  });
})();
