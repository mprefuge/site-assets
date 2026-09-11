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
  "mattr@refugeintl.org;info@refugeintl.org;micah@refugeintl.org";

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
  text: "Hello {{FirstName}},\n\nThank you - we have your order for the Hospitality Guide.\n\nYour order reference is: {{FormCode__c}}\n\nIf you have just been taken to our payment page, your order is confirmed once that payment completes. Workbooks ship at release.\n\nIf you have any questions, please email " + HOSPITALITY_GUIDE_CONTACT_EMAIL + " and quote your order reference.\n\n{{orgName}}",
  html: "<p>Hello {{FirstName}},</p><p>Thank you &mdash; we have your order for the <strong>Hospitality Guide</strong>.</p><p>Your order reference is: <strong>{{FormCode__c}}</strong></p><p>If you have just been taken to our payment page, your order is confirmed once that payment completes. Workbooks ship at release.</p><p>If you have any questions, please email <a href=\"mailto:" + HOSPITALITY_GUIDE_CONTACT_EMAIL + "\">" + HOSPITALITY_GUIDE_CONTACT_EMAIL + "</a> and quote your order reference.</p><p>{{orgName}}</p>"
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
// DISCOUNTS - discount codes, not automatic windows.
//
// This used to be a table of date windows in this file: 25% off automatically
// until release, then 15% for the launch month. It is now a code the buyer
// types, checked against Salesforce, because the discount had to become
// something staff could add, change and switch off themselves - a partner code
// for a podcast, a conference rate, a code that runs for one week - without a
// developer editing this file and redeploying it.
//
// Codes are Discount_Code__c records. Each one carries its own percentage, its
// own start and end dates and an Active tick, so "give Russell Moore's audience
// 25% until the end of October" is a record somebody creates in Salesforce, not
// a change here. See the Discount Codes section of the mprefuge/forms README.
//
// WHAT REPLACING THE AUTOMATIC 25% MEANS IN PRACTICE: nobody gets a discount now
// unless they have a code. If the pre-order discount is still meant to be open
// to everyone, that is a code (say PREORDER25) published on the guide page
// alongside the form - the same discount, but visible as a deliberate offer that
// can be ended by unticking a box.
//
// The discount still comes off the ORDER TOTAL rather than off each
// participant's price, which is how it was agreed and the simpler of the two to
// reason about.
//
// The code is checked server-side, and the list of codes is never sent to the
// browser: a buyer can test one code at a time, and cannot read the others out
// of this script.
// ---------------------------------------------------------------------------

// The forms service endpoint that checks a code. Same Function App as the order
// record below, which is why there is nothing new to deploy or configure to
// reach it.
const discountCodeAPI = submitFormAPI + "/discount-code";

// Codes are scoped to a CAMPAIGN in Salesforce, and the campaign a code is
// checked against is the same one this order is filed under - see
// HOSPITALITY_GUIDE_CATEGORY below, which is what the payment service resolves
// to Transaction__c.Campaign__c.
//
// One constant serving both is the point rather than a convenience: it means a
// code can only ever discount a purchase that lands on the campaign the code
// was issued for. Splitting them would let the two drift, and a code would
// start discounting orders it was never meant to touch.

// How long to wait for the code check. Short: the buyer is sitting there
// watching the button, and a code that cannot be checked simply is not applied -
// they can retry, and the form says so rather than pretending.
const DISCOUNT_LOOKUP_TIMEOUT_MS = 10000;

// ---------------------------------------------------------------------------
// FULFILMENT
//
// Deliberately NOT folded into discount codes, though it used to travel with the
// promo windows.
//
// Whether an order ships now or at release is a fact about the calendar, not
// about who typed which code: an order placed before the guide exists ships at
// release whether it was discounted or not, and an order placed afterwards ships
// on order. Attaching it to codes would have meant a full-price pre-order was
// silently labelled "ships-on-order" and promised delivery of something that had
// not been printed yet.
//
// So the release date lives on here as one boundary, and it drives the shipping
// promise shown to the buyer, the `fulfillment` value in the Stripe metadata,
// and the Fulfillment line on the Salesforce record.
//
// EDIT THIS DATE. Mid-October is a target, not a confirmed date - Chip's video
// and the printed workbooks both have to land first - so it is a placeholder and
// MUST be reset once the release date is fixed.
//
// It is an exact instant with an explicit UTC offset, so the switch happens at
// midnight Eastern for every buyer rather than at midnight in whatever timezone
// their laptop is set to. Mind the offset: -04:00 is EDT (through 1 Nov 2026),
// -05:00 is EST after it.
// ---------------------------------------------------------------------------
const HOSPITALITY_GUIDE_RELEASE_TARGET = "mid-October 2026";
const HOSPITALITY_GUIDE_RELEASE_AT = "2026-10-15T00:00:00-04:00";

// The promise made to a buyer ordering before the guide is out. This is what
// they are agreeing to, so it says plainly that the card is charged today.
const HOSPITALITY_GUIDE_PREORDER_NOTE =
  "Your card is charged today to reserve your order. Workbooks ship when the resource releases " +
  "(target: " + HOSPITALITY_GUIDE_RELEASE_TARGET + ").";

const HOSPITALITY_GUIDE_INSTOCK_NOTE =
  "Workbooks ship after your order is placed.";

// The same two promises for a buyer paying by check, where nothing is charged
// today and the order is held until the money arrives. Kept as separate strings
// rather than patched at render time: what a buyer is agreeing to should be
// readable in one piece, not assembled from a conditional.
// The check versions say nothing about not being charged. The box directly above
// them is headed "Where to send your check" and spells out the whole
// arrangement; repeating it underneath reads like a form letter.
const HOSPITALITY_GUIDE_PREORDER_NOTE_CHECK =
  "Workbooks ship when the resource releases (target: " + HOSPITALITY_GUIDE_RELEASE_TARGET + ").";

const HOSPITALITY_GUIDE_INSTOCK_NOTE_CHECK =
  "Workbooks ship once your check arrives.";

// The campaign every order is filed under, in Stripe, Salesforce and
// QuickBooks - and the product name shown on the Stripe payment page.
//
// One value for the life of the product, deliberately: it is a reporting key,
// so a pre-order and a discounted order and a full-price order all belong to
// the same campaign and add up in one place. What distinguishes them travels in
// the order metadata instead - discount_code, discount_percent and fulfillment
// - where it can be read per order without splitting the campaign.
const HOSPITALITY_GUIDE_CATEGORY = "Hospitality Guide";

// Used once the guide has been released.
const HOSPITALITY_GUIDE_FULFILLMENT = "ships-on-order";

// Shipping is included in the prices above. If the printer starts billing
// freight separately, set this to the flat amount in cents and it is added to
// every order, quoted on its own line. Left at 0 there is no shipping line at
// all - the form does not show a $0.00 charge.
const HOSPITALITY_GUIDE_SHIPPING_CENTS = 0;

// How close to the next tier a buyer has to be before the form points out that
// ordering a few more copies would drop their per-person price.
const TIER_NUDGE_WITHIN = 10;

// Where a check goes, and who it is made out to. Printed on the review step
// before the buyer commits and again on the confirmation, because a buyer who
// has to go looking for the address is a check that never gets posted.
const HOSPITALITY_GUIDE_CHECK_PAYEE = "Refuge International";
const HOSPITALITY_GUIDE_CHECK_ADDRESS = ["5590 Bruce Avenue", "Louisville, KY 40214"];

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
// The donation form still declares the Stripe rate knobs (window.STRIPE_RATE
// and data-stripe-rate) because it still asks its donors to cover the fee. This
// form does not: Refuge International absorbs the processing fee on Hospitality
// Guide orders, so it quotes no rate and declares no rate name at all.
//
// Refuge International absorbs the processing fee on Hospitality Guide orders.
// The buyer is charged the order total and nothing else, so this form quotes no
// rate, offers no rail chips, and never grosses a total up. Stripe Checkout is
// left to offer whatever methods the account has enabled.
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

    /* Pre-order notice banner */
    .hg-notice { display:flex; flex-direction:column; gap:6px; align-items:center; text-align:center; padding:14px 16px; border-radius:12px; background:#fdf1f3; border:1.5px solid ${BRAND_PRIMARY}; margin-bottom:18px; }
    .hg-notice[hidden] { display:none; }
    .hg-notice-badge { font-weight:800; color:${BRAND_PRIMARY}; letter-spacing:.02em; }
    .hg-notice-note { font-size:13px; color:#444; line-height:1.45; }

    /* Discount code entry */
    .hg-code { margin-bottom:14px; }
    .hg-code[hidden] { display:none; }
    .hg-code-optional { font-weight:500; color:#777; }
    .hg-code-row { display:flex; gap:8px; align-items:stretch; }
    /* The code itself reads as a code: fixed pitch, spaced, upper case, so a
       transposed character is visible before the buyer presses Apply. */
    .hg-code-input { flex:1; text-transform:uppercase; letter-spacing:.06em; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
    .hg-code-input::placeholder { text-transform:none; letter-spacing:normal; font-family:inherit; }
    .hg-code-btn { flex:0 0 auto; padding:12px 20px; }
    .hg-code-status { font-size:13px; font-weight:600; margin-top:6px; min-height:18px; }
    .hg-code-status.hg-code-error { color:${BRAND_PRIMARY}; }
    .hg-code-status.hg-code-working { color:#555; font-weight:500; }
    .hg-code-applied { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border-radius:12px; background:#fdf1f3; border:1.5px solid ${BRAND_PRIMARY}; margin-bottom:14px; }
    .hg-code-applied[hidden] { display:none; }
    .hg-code-applied-text { display:flex; flex-direction:column; gap:2px; min-width:0; }
    .hg-code-applied-badge { font-weight:800; color:${BRAND_PRIMARY}; }
    .hg-code-applied-label { font-size:13px; color:#444; overflow-wrap:anywhere; }
    .hg-code-remove { flex:0 0 auto; border:0; background:transparent; color:${BRAND_PRIMARY}; font-weight:700; font-size:13px; cursor:pointer; text-decoration:underline; padding:4px; }
    .hg-code-remove:hover { opacity:.8; }

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
       with no discount code applied and the shipping line quotes a $0.00 charge. */
    .hg-line[hidden] { display:none; }
    .hg-line-muted { color:#555; font-size:13px; }
    .hg-line-discount { color:${BRAND_PRIMARY}; font-weight:700; }
    .hg-line-total { font-weight:800; font-size:20px; border-top:1px solid #eee; padding-top:10px; margin-top:10px; }
    .hg-line-total span:last-child { color:${BRAND_PRIMARY}; }

    /* Payment method chips */

    /* Checkbox */

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
    .hg-card-with-back { position:relative; }
    .hg-back { position:absolute; top:16px; left:16px; width:36px; height:36px; display:flex; align-items:center; justify-content:center; padding:0; border:2px solid ${BRAND_PRIMARY}; background:transparent; color:${BRAND_PRIMARY}; border-radius:50%; cursor:pointer; transition:.3s all ease; }
    .hg-back:hover { background:${BRAND_PRIMARY}; color:#fff; transform:translateY(-1px); box-shadow:0 4px 12px rgba(189,33,53,.25); }
    .hg-back:focus-visible { outline:none; box-shadow:0 0 0 3px rgba(189,33,53,.25); }
    .hg-card-with-back .hg-title { padding:0 44px; }
    .hg-cta { display:block; width:100%; padding:16px; font-size:20px; font-weight:800; border:0; border-radius:12px; background:${BRAND_PRIMARY}; color:#fff; cursor:pointer; transition:.2s; box-shadow:0 6px 20px rgba(189,33,53,.18); }
    .hg-cta:hover { background:#a81c2d; }
    .hg-cta:disabled { opacity:.5; cursor:not-allowed; }
    .hg-trust { text-align:center; font-size:12px; color:#555; margin-top:10px; }
    .hg-pay-when-label { margin-top:22px; }
    .hg-pay-when { margin:10px 0 4px; }
    .hg-pay-chip { flex:1 1 160px; max-width:240px; }
    .hg-check-note { border:1.5px solid #eee; border-radius:12px; padding:14px 16px; margin:12px 0 4px; font-size:13px; color:#333; line-height:1.5; }
    .hg-check-note strong { display:block; font-size:14px; margin-bottom:4px; }
    .hg-check-address { margin:8px 0; font-weight:600; white-space:pre-line; }
    .hg-done-title { font-weight:800; font-size:22px; text-align:center; margin-bottom:6px; }
    .hg-done-lead { text-align:center; font-size:14px; color:#555; margin-bottom:16px; }
    .hg-done-ref { text-align:center; font-size:13px; color:#555; margin-top:14px; }
    .hg-done-ref code { font-weight:700; color:#1a1a1a; }
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
      .hg-back { top:12px; left:12px; }
      .hg-card-with-back .hg-title { padding:0 36px; }
      .hg-grid-2, .hg-grid-4 { grid-template-columns:1fr; }
      .hg-tiers { grid-template-columns:1fr; }
      /* Side by side, the code field and Apply both get too narrow to use on a
         phone - the field ends up showing about six characters. */
      .hg-code-row { flex-direction:column; }
      .hg-code-btn { width:100%; }
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

  // Whether the guide has been released yet, judged against the one boundary
  // above. This decides the shipping promise, not the price.
  //
  // A boundary that will not parse is treated as "not released yet", which is
  // the safe way round: it promises delivery at release rather than promising to
  // ship today something that may not exist.
  function releasedAt(nowMs) {
    var releasesAt = Date.parse(HOSPITALITY_GUIDE_RELEASE_AT);
    if (!isFinite(releasesAt)) return false;
    return nowMs >= releasesAt;
  }

  function fulfillmentAt(nowMs) {
    return releasedAt(nowMs)
      ? {
          id: HOSPITALITY_GUIDE_FULFILLMENT,
          note: HOSPITALITY_GUIDE_INSTOCK_NOTE,
          checkNote: HOSPITALITY_GUIDE_INSTOCK_NOTE_CHECK
        }
      : {
          id: "ships-at-release",
          note: HOSPITALITY_GUIDE_PREORDER_NOTE,
          checkNote: HOSPITALITY_GUIDE_PREORDER_NOTE_CHECK
        };
  }

  // Reduce whatever was typed to the redeemable character set, exactly as the
  // forms service does before it looks the code up. Doing it here as well means
  // the code shown back to the buyer is the one that was actually checked, and
  // that "russell moore" and "RUSSELLMOORE" are visibly the same code rather
  // than two attempts.
  function normalizeDiscountCode(raw) {
    if (raw === null || raw === undefined) return "";
    return String(raw).toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
  }

  // The percentage a discount is worth, or 0 for no discount.
  //
  // Anything outside 1-100 counts for nothing rather than being clamped. The
  // service refuses to return such a value in the first place; this is the
  // second lock on the same door, and the failure it guards against - a total
  // that goes up, or a "discount" that takes nothing off - is one the buyer
  // would see on the pay button.
  function discountPercentOff(discount) {
    if (!discount) return 0;
    var pct = Number(discount.percentOff);
    if (!isFinite(pct) || pct < 1 || pct > 100) return 0;
    return Math.round(pct);
  }

  // The whole order, priced. One function, so the tier table, the running total,
  // the review lines, the pay button and the payload all read the same numbers.
  //
  // The discount is taken off the order total, as agreed, and rounded to the
  // whole cent. Shipping is added after the discount: a freight charge is not
  // part of what a discount code discounts.
  function priceOrder(qty, discount) {
    var tier = qty > 0 ? tierFor(qty) : null;
    var unitCents = tier ? tier.unitCents : 0;
    var subtotalCents = tier ? qty * unitCents : 0;
    var percentOff = discountPercentOff(discount);
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

          <div class="hg-notice" id="${prefix}-notice" hidden>
            <div class="hg-notice-badge" id="${prefix}-notice-badge"></div>
            <div class="hg-notice-note" id="${prefix}-notice-note"></div>
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

          <div class="hg-code" id="${prefix}-code-block">
            <label class="hg-label" for="${prefix}-code">Discount code <span class="hg-code-optional">(optional)</span></label>
            <div class="hg-code-row">
              <input class="hg-input hg-code-input" id="${prefix}-code" placeholder="Enter a code" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="${prefix}-code-status">
              <button type="button" class="hg-btn hg-code-btn" id="${prefix}-code-apply">Apply</button>
            </div>
            <div id="${prefix}-code-status" class="hg-code-status" role="status" aria-live="polite"></div>
          </div>

          <div class="hg-code-applied" id="${prefix}-code-applied" hidden>
            <div class="hg-code-applied-text">
              <span class="hg-code-applied-badge" id="${prefix}-code-applied-badge"></span>
              <span class="hg-code-applied-label" id="${prefix}-code-applied-label"></span>
            </div>
            <button type="button" class="hg-code-remove" id="${prefix}-code-remove">Remove</button>
          </div>

          <div class="hg-lines" id="${prefix}-step1-lines">
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
          <div class="hg-subtitle">Where should we ship the workbooks?</div>

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
        <div class="hg-card hg-card-with-back">
          <button type="button" class="hg-back" id="${prefix}-prev3" aria-label="Back to your details">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="hg-title">Review Your Order</div>
          <div class="hg-subtitle" id="${prefix}-review-ship-to"></div>

          <div class="hg-lines">
            <div class="hg-line"><span id="${prefix}-review-guides-label">Guides</span><span id="${prefix}-review-guides">$0.00</span></div>
            <div class="hg-line hg-line-discount" id="${prefix}-review-discount-line" hidden><span id="${prefix}-review-discount-label">Discount</span><span id="${prefix}-review-discount">$0.00</span></div>
            <div class="hg-line hg-line-muted" id="${prefix}-review-shipping-line" hidden><span>Shipping</span><span id="${prefix}-review-shipping">$0.00</span></div>
            <div class="hg-line hg-line-total"><span id="${prefix}-review-total-label">Total charged today</span><span id="${prefix}-review-total">$0.00</span></div>
          </div>

          <label class="hg-label hg-pay-when-label">How would you like to pay?</label>
          <div class="hg-row hg-pay-when" id="${prefix}-pay-when-row">
            <button type="button" class="hg-chip hg-pay-chip selected" data-pay-when="now">Pay now</button>
            <button type="button" class="hg-chip hg-pay-chip" data-pay-when="check">Pay by check</button>
          </div>

          <div class="hg-check-note" id="${prefix}-check-note" hidden>
            <strong>Where to send your check</strong>
            Make it out to <strong style="display:inline;">${HOSPITALITY_GUIDE_CHECK_PAYEE}</strong> and mail it to:
            <div class="hg-check-address">${HOSPITALITY_GUIDE_CHECK_ADDRESS.join("\n")}</div>
            We'll hold your order until your check arrives. Write your order number on the check so we know what it's for.
          </div>

          <div class="hg-fineprint" id="${prefix}-fulfillment-note"></div>

          <button type="button" id="${prefix}-submit" class="hg-cta" disabled>Enter the number of participants</button>
          <div id="${prefix}-submit-error" class="hg-error-message hg-center" role="alert" aria-live="assertive" style="margin-top:8px;"></div>
          <div class="hg-fineprint" id="${prefix}-submit-fineprint">After clicking pay, you will be taken to Stripe to enter your payment information.</div>
          <div class="hg-trust" id="${prefix}-trust">Secure payment powered by Stripe</div>
        </div>

        <div class="hg-card" id="${prefix}-check-done" hidden>
          <div class="hg-done-title">Thanks for your order</div>
          <div class="hg-done-lead" id="${prefix}-done-lead"></div>

          <div class="hg-check-note">
            <strong>Where to send your check</strong>
            Make it out to <strong style="display:inline;">${HOSPITALITY_GUIDE_CHECK_PAYEE}</strong> and mail it to:
            <div class="hg-check-address">${HOSPITALITY_GUIDE_CHECK_ADDRESS.join("\n")}</div>
            Write your order number on the check so we know what it's for.
          </div>

          <div class="hg-done-ref">
            Order number <code id="${prefix}-done-ref"></code>
          </div>
          <div class="hg-fineprint" id="${prefix}-done-note"></div>
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

    // The clock the release boundary is judged against.
    //
    // ?asOf=<date> lets QA see what the form looks like before and after
    // release without editing the file. It stays gated behind the operator key
    // even though the date no longer decides the price: it decides what the
    // buyer is promised about shipping, and an ungated override would be a link
    // that tells somebody their order ships today when it cannot.
    function nowMs() {
      if (isTestModeRequested() && params && typeof params.asOf === "string") {
        var pinned = Date.parse(params.asOf);
        if (isFinite(pinned)) return pinned;
      }
      return Date.now();
    }

    // Resolved fresh on every recalculation rather than cached at load, so a page
    // left open across the release boundary updates its shipping promise instead
    // of holding yesterday's.
    function currentFulfillment() {
      return fulfillmentAt(nowMs());
    }

    // The discount the buyer has successfully applied, as the service returned
    // it: { code, percentOff, label }. Null until a code is applied, and back to
    // null the moment one is removed or stops being valid.
    var appliedDiscount = null;

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
    function nudgeText(qty, discount) {
      if (qty <= 0) return "";
      var idx = tierIndexFor(qty);
      if (idx < 0 || idx >= HOSPITALITY_GUIDE_TIERS.length - 1) return "";
      var next = HOSPITALITY_GUIDE_TIERS[idx + 1];
      var need = next.minQty - qty;
      if (need <= 0 || need > TIER_NUDGE_WITHIN) return "";

      var msg = "Add " + need + (need === 1 ? " more participant" : " more participants") +
        " to reach " + moneyShort(next.unitCents) + "/person";
      var here = priceOrder(qty, discount).orderCents;
      var there = priceOrder(next.minQty, discount).orderCents;
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

    // --- discount code ------------------------------------------------------
    //
    // The buyer types a code and presses Apply; the forms service says whether
    // it is good and for how much off. The list of codes is never sent here, so
    // this is the only way to find out - one code at a time.

    var codeBlock = el("code-block");
    var codeInput = el("code");
    var codeApplyBtn = el("code-apply");
    var codeStatus = el("code-status");
    var codeApplied = el("code-applied");
    var codeAppliedBadge = el("code-applied-badge");
    var codeAppliedLabel = el("code-applied-label");
    var codeRemoveBtn = el("code-remove");

    // True while a lookup is in flight. Guards against a double-press queueing
    // two lookups and the slower answer overwriting the faster one.
    var checkingCode = false;

    function setCodeStatus(message, kind) {
      if (!codeStatus) return;
      codeStatus.textContent = message || "";
      codeStatus.classList.remove("hg-code-error", "hg-code-working");
      if (message && kind) codeStatus.classList.add(kind);
    }

    // Show either the entry field or the applied banner, never both: once a code
    // is on the order, the thing to offer is a way to take it off, not a second
    // box to type into.
    function paintDiscount() {
      var applied = !!appliedDiscount;
      if (codeBlock) codeBlock.hidden = applied;
      if (codeApplied) codeApplied.hidden = !applied;

      if (applied) {
        codeAppliedBadge.textContent = appliedDiscount.code + " applied - " + appliedDiscount.percentOff + "% off";
        // The label is the Salesforce record's own name ("Russell Moore
        // podcast"), which tells the buyer the code was recognised as the one
        // they were given rather than as some other code that happens to match.
        codeAppliedLabel.textContent = appliedDiscount.label || "";
        codeAppliedLabel.hidden = !appliedDiscount.label;
      }
    }

    function clearDiscount() {
      appliedDiscount = null;
      if (codeInput) codeInput.value = "";
      setCodeStatus("", null);
      paintDiscount();
      updateTotals();
    }

    /**
     * Ask the service about one code.
     *
     * Resolves to { ok: true, discount } for a code that works, to
     * { ok: false, message } for one that does not, and to
     * { ok: false, unavailable: true, message } when the check itself could not
     * be made.
     *
     * That third case is kept separate on purpose. "We could not check" is not
     * "your code is no good": a buyer holding a perfectly good code must be told
     * to try again rather than quietly charged full price, which is exactly what
     * folding the two together would do.
     */
    function lookupDiscountCode(code) {
      var controller = typeof AbortController === "function" ? new AbortController() : null;
      var timedOut = false;
      var timeoutId = setTimeout(function () {
        timedOut = true;
        if (controller) controller.abort();
      }, DISCOUNT_LOOKUP_TIMEOUT_MS);

      var url = discountCodeAPI +
        "?code=" + encodeURIComponent(code) +
        "&campaign=" + encodeURIComponent(HOSPITALITY_GUIDE_CATEGORY);

      var options = { method: "GET", headers: { "Accept": "application/json" } };
      if (controller) options.signal = controller.signal;

      return fetch(url, options)
        .then(function (r) {
          clearTimeout(timeoutId);
          return r.text().then(function (text) {
            var data = null;
            try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }

            if (r.status === 429) {
              return {
                ok: false,
                unavailable: true,
                message: (data && data.message) || "Too many attempts. Please wait a moment and try again."
              };
            }

            // Anything that is not a clean 200 with a verdict is "could not
            // check", including a 502 from the service when Salesforce is down.
            if (!r.ok || !data || typeof data.valid !== "boolean") {
              console.error("[Hospitality Guide] Discount code check failed: HTTP " + r.status + " " + text);
              return {
                ok: false,
                unavailable: true,
                message: "We could not check that code just now. Please try again."
              };
            }

            if (!data.valid) {
              return { ok: false, message: data.message || "That code was not recognised." };
            }

            var percentOff = Number(data.percentOff);
            if (!isFinite(percentOff) || percentOff < 1 || percentOff > 100) {
              console.error("[Hospitality Guide] Discount code returned an unusable percentage:", data.percentOff);
              return { ok: false, message: "That code is not set up correctly. Please contact us." };
            }

            return {
              ok: true,
              discount: {
                code: normalizeDiscountCode(data.code) || code,
                percentOff: Math.round(percentOff),
                label: typeof data.label === "string" ? data.label : ""
              }
            };
          });
        })
        .catch(function (err) {
          clearTimeout(timeoutId);
          console.error(timedOut
            ? "Discount code check did not respond within " + DISCOUNT_LOOKUP_TIMEOUT_MS + "ms"
            : "Discount code check failed", err);
          return {
            ok: false,
            unavailable: true,
            message: "We could not check that code just now. Please try again."
          };
        });
    }

    function applyTypedCode() {
      if (checkingCode) return;

      var code = normalizeDiscountCode(codeInput ? codeInput.value : "");
      if (!code) {
        setCodeStatus("Enter a code first.", "hg-code-error");
        return;
      }

      checkingCode = true;
      codeApplyBtn.disabled = true;
      setCodeStatus("Checking...", "hg-code-working");
      // A lookup in flight must not leave a stale pay button clickable at a
      // price that is about to change.
      updateTotals();

      lookupDiscountCode(code).then(function (result) {
        checkingCode = false;
        codeApplyBtn.disabled = false;

        if (result.ok) {
          appliedDiscount = result.discount;
          setCodeStatus("", null);
        } else {
          appliedDiscount = null;
          setCodeStatus(result.message, "hg-code-error");
        }

        paintDiscount();
        updateTotals();
      });
    }

    if (codeApplyBtn) codeApplyBtn.addEventListener("click", applyTypedCode);
    if (codeRemoveBtn) codeRemoveBtn.addEventListener("click", clearDiscount);

    if (codeInput) {
      // Enter applies the code rather than doing nothing. The form has no
      // <form> element, so there is no implicit submit to worry about.
      codeInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.keyCode === 13) {
          e.preventDefault();
          applyTypedCode();
        }
      });
      // Typing after a rejection clears the rejection - the message referred to
      // what was in the box a moment ago.
      codeInput.addEventListener("input", function () {
        if (codeStatus && codeStatus.classList.contains("hg-code-error")) setCodeStatus("", null);
      });
    }

    // A code carried in the link is applied during the initial paint at the
    // bottom of this function, NOT here. applyTypedCode repaints the whole form,
    // and half the things it repaints - the fee checkbox, the pay button - are
    // still undeclared at this point in wireUp.

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

    // --- how they intend to pay ---------------------------------------------
    //
    // "now" hands off to Stripe and the money moves. "check" does not: the order
    // is recorded as pending and somebody posts a check. Two different endpoints
    // and two different outcomes, so the buyer is asked once, plainly, rather
    // than discovering it after a redirect.
    var payWhen = "now";
    var payWhenRow = el("pay-when-row");

    if (payWhenRow) {
      payWhenRow.addEventListener("click", function (e) {
        var t = e.target.closest(".hg-pay-chip");
        if (!t) return;
        payWhen = t.getAttribute("data-pay-when") === "check" ? "check" : "now";
        payWhenRow.querySelectorAll(".hg-pay-chip").forEach(function (c) { c.classList.remove("selected"); });
        t.classList.add("selected");
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

    // Single source of truth for every money figure on the form. Everything is
    // derived from the same integers, so the number on the pay button and the
    // numbers in the payload cannot drift apart.
    //
    // The org absorbs the processing fee, so the buyer is charged the order
    // total and nothing more: totalCents IS orderCents, and the covered fee is
    // always zero. Those two are still reported separately because the payment
    // service charges amount + feeAmount and reads both.
    function computeTotals() {
      var order = priceOrder(quantity(), appliedDiscount);

      return {
        fulfillment: currentFulfillment(),
        discount: appliedDiscount,
        order: order,
        coverFee: false,
        coveredFeeCents: 0,
        totalCents: order.orderCents
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

    // HG-YYMMDD-XXXXXX rather than a UUID. This is only ever an idempotency key
    // now - a buyer paying by check quotes their form confirmation code, not
    // this - but it reaches Stripe as client_reference_id and shows up in the
    // dashboard, where somebody reconciling a payment by eye would much rather
    // read a date and six characters than thirty-six hex digits.
    //
    // I and O are left out of the alphabet so a 1 or a 0 read back from a screen
    // cannot be mistaken for a letter.
    function makeReferenceId() {
      var now = new Date();
      var stamp = String(now.getFullYear()).slice(2) +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0");

      var alphabet = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
      var suffix = "";
      if (window.crypto && typeof window.crypto.getRandomValues === "function") {
        var bytes = new Uint8Array(6);
        window.crypto.getRandomValues(bytes);
        for (var i = 0; i < bytes.length; i++) suffix += alphabet.charAt(bytes[i] % alphabet.length);
      } else {
        for (var j = 0; j < 6; j++) suffix += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      }

      return "HG-" + stamp + "-" + suffix;
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
      var discount = t.discount;
      var fulfillment = t.fulfillment;

      // Fulfilment banner. Shown only before release, where it is telling the
      // buyer something they need to know before paying - that the card is
      // charged today for something that ships later. After release there is
      // nothing to warn about and the banner would just be noise.
      var noticeEl = el("notice");
      if (noticeEl) {
        var isPreorder = fulfillment.id === "ships-at-release";
        if (isPreorder) {
          el("notice-badge").textContent = "Pre-order";
          el("notice-note").textContent = fulfillment.note;
          noticeEl.hidden = false;
        } else {
          noticeEl.hidden = true;
        }
      }

      // Quantity controls
      var qty = quantity();
      qtyMinus.disabled = qty <= 1;
      qtyPlus.disabled = qty >= MAX_PARTICIPANTS;
      paintTiers(qty);
      if (nudgeEl) nudgeEl.textContent = nudgeText(qty, discount);

      var problem = quantityProblem();
      if (qtyError && problem) {
        qtyError.textContent = problem;
        qtyError.style.display = "block";
      } else if (qtyError && qtyError.style.display === "block" && !problem) {
        qtyError.style.display = "none";
      }

      var guidesLabel = qty > 0 ? participantsLabel(qty, order.unitCents) : "Guides";
      // The code is named on the discount line so the buyer can see which code
      // produced the figure, and so the receipt they screenshot says it too.
      var discountLabel = discount ? discount.code + " (" + order.percentOff + "% off)" : "";
      var showDiscountLine = !!discount && order.discountCents > 0;

      // Step 1 lines
      el("discount-line").hidden = !showDiscountLine;
      el("discount-label").textContent = discountLabel;
      el("discount").textContent = "-" + money(order.discountCents);
      el("shipping-line").hidden = order.shippingCents <= 0;
      el("shipping").textContent = money(order.shippingCents);
      el("order-total").textContent = money(order.orderCents);

      // Step 3 lines
      el("review-guides-label").textContent = guidesLabel;
      el("review-guides").textContent = money(order.subtotalCents);
      el("review-discount-line").hidden = !showDiscountLine;
      el("review-discount-label").textContent = discountLabel;
      el("review-discount").textContent = "-" + money(order.discountCents);
      el("review-shipping-line").hidden = order.shippingCents <= 0;
      el("review-shipping").textContent = money(order.shippingCents);
      el("review-total").textContent = money(t.totalCents);

      var shipTo = el("review-ship-to");
      if (shipTo) {
        var cityValue = city.value.trim();
        var stateValue = (stateSel.value || "").split(" - ")[0];
        shipTo.textContent = cityValue && stateValue ? "Shipping to " + cityValue + ", " + stateValue : "";
      }

      // Everything from the total down changes with how they mean to pay: what
      // the total is called, what the button promises, where it says they are
      // going, and whether the check address is on screen before they commit
      // rather than after.
      var payingByCheck = payWhen === "check";

      var totalLabel = el("review-total-label");
      // "Charged today" is simply untrue of a check, and this is the line the
      // buyer reads hardest.
      if (totalLabel) totalLabel.textContent = payingByCheck ? "Total due" : "Total charged today";

      var fulfillmentNote = el("fulfillment-note");
      if (fulfillmentNote) fulfillmentNote.textContent = payingByCheck ? fulfillment.checkNote : fulfillment.note;
      var checkNote = el("check-note");
      if (checkNote) checkNote.hidden = !payingByCheck;
      var submitFineprint = el("submit-fineprint");
      if (submitFineprint) {
        // Nothing to add on the check path. The line under the pay button exists
        // to warn a card buyer they are about to leave for Stripe; a buyer
        // mailing a check is going nowhere, and the box above has already said
        // everything there is to say.
        submitFineprint.hidden = payingByCheck;
        if (!payingByCheck) {
          submitFineprint.textContent =
            "After clicking pay, you will be taken to Stripe to enter your payment information.";
        }
      }
      var trust = el("trust");
      if (trust) trust.hidden = payingByCheck;

      // Leave the button label alone while a submission is in flight, so a
      // keystroke cannot wipe out the "Transferring to Stripe..." message.
      if (!submitting) {
        submitBtn.textContent = t.totalCents > 0
          ? (payingByCheck ? "Place order and send a check for " + money(t.totalCents) : "Pay " + money(t.totalCents))
          : "Enter the number of participants";
        submitBtn.disabled = !readyToSubmit();
      }
    }

    function readyToSubmit() {
      if (submitting) return false;
      // A code being checked is a price about to change. Letting the button stay
      // live through that is how a buyer pays the undiscounted total a moment
      // before the discount lands.
      if (checkingCode) return false;
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
      if (checkingCode) return;
      if (!orderStepValid(true) || !buyerStepValid(true)) return;

      // A code applied ten minutes ago is not necessarily a code that is still
      // good: it may have expired at midnight, hit its redemption limit, or been
      // switched off by somebody who found it posted publicly. Re-checking it
      // here is what the old code did by re-resolving the promo window at
      // submission, and it matters for the same reason - a page left open must
      // not be charged at yesterday's discount.
      //
      // If it comes back bad, the order is stopped and repriced rather than put
      // through: the buyer sees the new total and decides, instead of being
      // charged a number they never agreed to.
      if (!appliedDiscount) {
        beginSubmission();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Checking your code...";
      hideSubmitError();

      lookupDiscountCode(appliedDiscount.code).then(function (result) {
        if (result.ok) {
          appliedDiscount = result.discount;
          paintDiscount();
          updateTotals();
          beginSubmission();
          return;
        }

        // Could-not-check is not the same as no-good. Neither is allowed to put
        // an order through at a discount nobody has confirmed, but they say
        // different things to the buyer: one is "try again", the other is "this
        // code is finished".
        if (!result.unavailable) {
          appliedDiscount = null;
          paintDiscount();
        }

        updateTotals();
        submitBtn.disabled = !readyToSubmit();
        showSubmitError(
          result.unavailable
            ? result.message + " Your card has not been charged."
            // The buyer is on the review step, and the code field is back on the
            // first one where they cannot see it. Say where to go rather than
            // leaving them hunting for a box that is not on screen.
            : result.message + " Your order has been repriced without it. Check the total before paying," +
              " or go back to the first step to try another code."
        );
      });
    });

    function beginSubmission() {
      // Priced one last time at the moment of submission rather than reusing a
      // figure painted earlier, so what is charged is what the buyer is looking
      // at right now.
      var totals = computeTotals();
      if (totals.totalCents <= 0) {
        submitBtn.disabled = !readyToSubmit();
        updateTotals();
        return;
      }

      var discount = totals.discount;
      var fulfillment = totals.fulfillment;
      var order = totals.order;
      var buyerType = buyerTypeHidden.value;
      var firstname = el("firstname").value.trim();
      var lastname = el("lastname").value.trim();
      var organization = el("organization-name").value.trim();

      var summary = participantsLabel(order.qty, order.unitCents) + " = " + money(order.subtotalCents) +
        (order.discountCents > 0 ? ", less " + order.percentOff + "% code " + discount.code + " (" + money(order.discountCents) + ")" : "") +
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
        // Refuge International absorbs the processing fee on these orders, so
        // the buyer never covers it and there is nothing to add to the charge.
        // Both fields are still sent, and sent explicitly: the payment service
        // charges amount + feeAmount, and a missing feeAmount would leave that
        // sum to a default this form does not control.
        coverFee: false,
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
          // The code that produced the discount, so an order can be traced back
          // to the partner it came through and a total can be checked against
          // the percentage the code was actually worth.
          discount_code: discount ? discount.code : "none",
          discount_percent: order.percentOff,
          discount_amount: money(order.discountCents),
          // The same figure as an integer number of cents, which is what the
          // payment service reads into Transaction__c.Discount_Amount__c.
          //
          // The formatted string above stays, because it is what a human reads
          // in the Stripe dashboard - but it is a DISPLAY value and nothing
          // should parse it. Sending only that is how Cover_Fees_Amount__c came
          // to be stored 100x overstated on one of the two write paths: a
          // number that has been through a currency formatter has already lost
          // the argument about what unit it is in. Cents, integer, like
          // `amount` and `feeAmount` at the top level.
          discount_amount_cents: order.discountCents,
          shipping: money(order.shippingCents),
          order_total: money(order.orderCents),
          order_summary: summary,
          fulfillment: fulfillment.id,
          workbooks: order.qty
        }
      };

      if (buyerType === "organization") {
        payload.organization = organization;
      }

      // No payment rail is declared. The form no longer asks the buyer which
      // one they will use, and naming one here would pin Stripe Checkout to it;
      // omitting it lets Checkout offer every method the account has enabled.
      // The field must be OMITTED, not sent as null or "" - request validation
      // accepts an absent field and rejects an empty string with HTTP 400.

      // Stable across retries of the same order: a buyer who resubmits after a
      // failure keeps the same reference, while a changed order gets a new one.
      // Every field that can move the charged total belongs here.
      var referenceSignature = [
        payload.amount,
        payload.feeAmount,
        payload.category,
        payload.email,
        payload.donationType,
        order.qty,
        // The code is part of the signature even though it can only change the
        // total, which is already here: an order that changed from one code to
        // another at the same percentage is a different order, and should not
        // reuse the abandoned one's reference.
        discount ? discount.code : "",
        order.percentOff
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

      var payingByCheck = payWhen === "check";

      submitting = true;
      // Derived from the total rather than read off the button, because the
      // button may currently say "Checking your code..." - restoring that on a
      // failure would leave the buyer looking at a stale message and no price.
      var originalButtonText = payingByCheck
        ? "Place order and send a check for " + money(totals.totalCents)
        : "Pay " + money(totals.totalCents);
      submitBtn.disabled = true;
      submitBtn.textContent = payingByCheck ? "Placing your order..." : "Transferring to Stripe...";
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
          DiscountCode: discount ? discount.code : "none",
          Discount: discount ? order.percentOff + "% (" + discount.code + ")" : "none",
          DiscountAmount: money(order.discountCents),
          OrderTotal: money(order.orderCents),
          // Always zero on this form. Recorded as words rather than $0.00 so a
          // reader of the record cannot mistake it for a buyer who declined.
          CoveredProcessingFee: "absorbed by Refuge International",
          // How they said they would pay. An order paid by check creates NO
          // payment record anywhere - this form record is the only trace of it -
          // so this is what tells the office a check is coming, and it travels
          // into the notification email they get when the order arrives.
          PaymentMethod: payWhen === "check" ? "Check" : "Card",
          TotalCharged: money(totals.totalCents),
          Fulfillment: fulfillment.id,
          OrderSummary: summary,
          ClientReferenceId: clientReferenceId
        })
      };

      if (buyerType === "organization") {
        formPayload.Church__c = organization;
      }

      // BELOW formPayload, not above it, and that is load bearing. `var` hoists
      // the declaration but not the assignment, so branching off any earlier
      // left createFormRecord stringifying `undefined` and posting an empty body
      // - which the preview harness answered with a cheerful canned success.
      if (payingByCheck) {
        submitCheckOrder(order, totals, originalButtonText);
        return;
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
                  "returned HTTP " + r.status + ". " +
                  (payWhen === "check"
                    ? "The buyer is being told so; nothing was saved anywhere."
                    : "The payment still went ahead.") +
                  " Response: " + text
                );
                return null;
              }
              return data;
            });
          })
          .catch(function (err) {
            clearTimeout(formTimeoutId);
            console.error(formTimedOut
              ? "Form service did not respond within " + FORM_SUBMIT_TIMEOUT_MS + "ms"
              : "Form service call failed",
              payWhen === "check" ? "; nothing was saved" : "; continuing to payment", err);
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

      /**
       * Place an order nobody is paying online.
       *
       * No Stripe session, no redirect, and no money. The forms service records
       * the order exactly as it does on the card path - same Form__c record, same
       * confirmation email - and then the payment service writes a PENDING
       * transaction keyed on this order's reference, so the money owed exists in
       * the financial object from the moment the buyer commits rather than from
       * the moment a check turns up.
       *
       * THE ORDER OF THE TWO CALLS MATTERS. The forms service creates the buyer's
       * Contact; the check endpoint only ever LOOKS ONE UP, never creates one. So
       * the form record goes first, and its confirmation code travels into the
       * transaction metadata the same way it does on the card path.
       *
       * A failure here is reported plainly and the button comes back. There is no
       * half-success to paper over: either we are expecting a check or we are not,
       * and a buyer about to walk to the post box needs to know which.
       */
      function submitCheckOrder(order, totals, originalButtonText) {
        createFormRecord()
          .then(function (record) {
            formRecord = record;
            var code = readFormField(record, "FormCode__c");

            // On the card path a failed form submission is bad bookkeeping and
            // the payment goes ahead anyway - Stripe still has the money, and
            // the record can be rebuilt from it. Here there is no payment and no
            // transaction record: this form record is the only trace the order
            // ever existed. If it did not save there is nothing to confirm, and
            // telling somebody to mail a check for an order we have no record of
            // is the worst outcome on offer.
            if (!code) {
              throw new Error("We could not save your order.");
            }

            showCheckConfirmation(code, order, totals);
          })
          .catch(function (err) {
            console.error("Check order error:", err);

            showSubmitError(
              (err && err.message ? err.message : "Something went wrong while saving your order.") +
              " Nothing was saved, so don't send a check yet. Please try again."
            );

            submitting = false;
            submitBtn.textContent = originalButtonText;
            submitBtn.disabled = false;
          });
      }

      /** Swap the review card for the confirmation, and say what happens next. */
      function showCheckConfirmation(orderCode, order, totals) {
        var reviewCard = document.querySelector("#" + prefix + "-step3 .hg-card");
        var done = el("check-done");
        if (!done) return;

        var lead = el("done-lead");
        if (lead) {
          lead.textContent =
            "We've got your order for " + order.qty +
            (order.qty === 1 ? " participant" : " participants") +
            ". Your total is " + money(totals.totalCents) + ".";
        }

        var ref = el("done-ref");
        // The confirmation code the forms service actually minted - the one on
        // the record and in their email - so the number on the check, the number
        // they were sent, and the number the office searches on are one number.
        if (ref) ref.textContent = orderCode;

        var note = el("done-note");
        if (note) {
          note.textContent =
            "We've emailed you a copy of this. We'll hold your order until your check arrives.";
        }

        if (reviewCard) reviewCard.hidden = true;
        done.hidden = false;
        try { done.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) { /* older browsers */ }
      }
    }

    // --- initial paint ------------------------------------------------------
    if (params && params.participants) {
      var preset = parseInt(params.participants, 10);
      if (isFinite(preset) && preset > 0) qtyInput.value = String(Math.min(MAX_PARTICIPANTS, preset));
    }

    updateTotals();

    // A code can be carried in the link, so a partner can send their audience
    // straight to a form with the discount already on it:
    //     .../hospitality-guide?code=RUSSELLMOORE
    //
    // It goes through exactly the same check as one typed by hand, so a link
    // carrying an expired or invented code discounts nothing - the code in the
    // URL is a convenience, never an authority.
    //
    // Applied here, after the first paint, because applyTypedCode repaints the
    // whole form and everything it touches has to exist first.
    if (params && params.code) {
      var linkedCode = normalizeDiscountCode(params.code);
      if (linkedCode && codeInput) {
        codeInput.value = linkedCode;
        applyTypedCode();
      }
    }

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
