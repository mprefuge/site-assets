/* donation-popup.js — Refuge Intl
   - Brand: #BD2135, black, white
   - Popup + Embedded, mobile-friendly, no flicker
   - “Other (specify)” category with required free-text
   - Personal info + address lookup/manual
   - Stripe handoff with cover-fee math
*/
const processDonationAPI = 'https://prod-08.westus.logic.azure.com:443/workflows/aa6dd00627e9488eb2d9e5af99110e26/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=lnc3194xuZhPQnVi6pDF_LuvDSG8BElOsVFllpS6UpE';

(function () {
  "use strict";

  // ---------- Config ----------
  var BRAND_RED = "#BD2135";
  var BRAND_BLACK = "#000000";
  var BRAND_WHITE = "#ffffff";

  // If you haven’t already, define: window.processDonationAPI = "https://your.api/endpoint"


  // Utility: countries/states options (short lists to keep file brief; add as needed)
  var states = ["", "AL - Alabama", "AK - Alaska", "AZ - Arizona", "AR - Arkansas", "CA - California", "CO - Colorado", "CT - Connecticut", "DE - Delaware", "FL - Florida", "GA - Georgia", "HI - Hawaii", "ID - Idaho", "IL - Illinois", "IN - Indiana", "IA - Iowa", "KS - Kansas", "KY - Kentucky", "LA - Louisiana", "ME - Maine", "MD - Maryland", "MA - Massachusetts", "MI - Michigan", "MN - Minnesota", "MS - Mississippi", "MO - Missouri", "MT - Montana", "NE - Nebraska", "NV - Nevada", "NH - New Hampshire", "NJ - New Jersey", "NM - New Mexico", "NY - New York", "NC - North Carolina", "ND - North Dakota", "OH - Ohio", "OK - Oklahoma", "OR - Oregon", "PA - Pennsylvania", "RI - Rhode Island", "SC - South Carolina", "SD - South Dakota", "TN - Tennessee", "TX - Texas", "UT - Utah", "VT - Vermont", "VA - Virginia", "WA - Washington", "WV - West Virginia", "WI - Wisconsin", "WY - Wyoming", "Outside US"];
  var countries = ["United States", "Afghanistan", "Akrotiri", "Albania", "Algeria", "American Samoa", "Andorra", "Angola", "Anguilla", "Antarctica", "Antigua and Barbuda", "Argentina", "Armenia", "Aruba", "Ashmore and Cartier Islands", "Australia", "Austria", "Azerbaijan", "Bahamas, The", "Bahrain", "Bangladesh", "Barbados", "Bassas da India", "Belarus", "Belgium", "Belize", "Benin", "Bermuda", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Bouvet Island", "Brazil", "British Indian Ocean Territory", "British Virgin Islands", "Brunei", "Bulgaria", "Burkina Faso", "Burma", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Cayman Islands", "Central African Republic", "Chad", "Chile", "China", "Christmas Island", "Clipperton Island", "Cocos (Keeling) Islands", "Colombia", "Comoros", "Congo, Democratic Republic of the", "Congo, Republic of the", "Cook Islands", "Coral Sea Islands", "Costa Rica", "Cote d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Dhekelia", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Europa Island", "Falkland Islands (Islas Malvinas)", "Faroe Islands", "Fiji", "Finland", "France", "French Guiana", "French Polynesia", "French Southern and Antarctic Lands", "Gabon", "Gambia, The", "Gaza Strip", "Georgia", "Germany", "Ghana", "Gibraltar", "Glorioso Islands", "Greece", "Greenland", "Grenada", "Guadeloupe", "Guam", "Guatemala", "Guernsey", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Heard Island and McDonald Islands", "Holy See (Vatican City)", "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Isle of Man", "Israel", "Italy", "Jamaica", "Jan Mayen", "Japan", "Jersey", "Jordan", "Juan de Nova Island", "Kazakhstan", "Kenya", "Kiribati", "North Korea", "South Korea", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Macau", "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Martinique", "Mauritania", "Mauritius", "Mayotte", "Mexico", "Micronesia, Federated States of", "Moldova", "Monaco", "Mongolia", "Montserrat", "Morocco", "Mozambique", "Namibia", "Nauru", "Navassa Island", "Nepal", "Netherlands", "Netherlands Antilles", "New Caledonia", "New Zealand", "Nicaragua", "Niger", "Nigeria", "Niue", "Norfolk Island", "Northern Ireland", "Northern Mariana Islands", "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paracel Islands", "Paraguay", "Peru", "Philippines", "Pitcairn Islands", "Poland", "Portugal", "Puerto Rico", "Qatar", "Reunion", "Romania", "Russia", "Rwanda", "Saint Helena", "Saint Kitts and Nevis", "Saint Lucia", "Saint Pierre and Miquelon", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia and Montenegro", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Georgia and the South Sandwich Islands", "Spain", "Spratly Islands", "Sri Lanka", "Sudan", "Suriname", "Svalbard", "Swaziland", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tokelau", "Tonga", "Trinidad and Tobago", "Tromelin Island", "Tunisia", "Turkey", "Turkmenistan", "Turks and Caicos Islands", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Virgin Islands", "Wake Island", "Wallis and Futuna", "West Bank", "Western Sahara", "Yemen", "Zambia", "Zimbabwe", "Myanmar (Burma)", "Palestine", "Democratic Republic of the Congo", "Not Listed"];

  // ---------- Styles ----------
  var style = `
  <style id="donation-popup-style">
    :root { --brand:#BD2135; }
    .dp-modal { display:none; position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.48); align-items:center; justify-content:center; }
    .dp-panel { background:#fff; width:100%; max-width:600px; border-radius:24px; box-shadow:0 10px 40px rgba(0,0,0,.15); overflow:hidden; }
    .dp-header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:#000; color:#fff; border-bottom:4px solid var(--brand); }
    .dp-header img { height:56px; }
    .dp-close { font-size:24px; line-height:1; color:#fff; opacity:.75; cursor:pointer; border:0; background:transparent; }
    .dp-close:hover { opacity:1; }
    .dp-body { padding:16px; }
    .dp-card { background:#fff; border-radius:18px; box-shadow: 0 6px 24px rgba(189,33,53,0.10), 0 1px 6px rgba(0,0,0,0.08); padding:16px; margin-bottom:16px; }
    .dp-title { font-weight:700; margin-bottom:12px; }
    .dp-grid { display:grid; gap:12px; }
    .dp-grid-2 { grid-template-columns: 1fr 1fr; }
    .dp-grid-3 { grid-template-columns: 2fr 1fr; }
    .dp-label { display:block; font-size:14px; font-weight:600; margin-bottom:6px; color:#222; }
    .dp-input, .dp-select { width:100%; padding:12px; border:1.5px solid #e0e0e0; border-radius:10px; background:#fafbfc; font-size:16px; outline:none; transition:.2s border-color,.2s box-shadow,.2s background; }
    .dp-input:focus, .dp-select:focus { border-color:var(--brand); box-shadow:0 0 0 2px #BD213533; background:#fff; }
    .dp-row { display:flex; flex-wrap:wrap; gap:8px; }
    .dp-chip { padding:10px 16px; border-radius:999px; border:1.5px solid #d4d4d4; background:#fff; font-weight:700; cursor:pointer; transition:.2s; }
    .dp-chip:hover { border-color:var(--brand); color:var(--brand); }
    .dp-chip.selected { background:var(--brand); border-color:var(--brand); color:#fff; box-shadow:0 2px 10px rgba(189,33,53,.25); }
    .dp-fee { font-size:13px; color:#444; margin-top:6px; }
    .dp-summary { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
    .dp-summary .dp-total { font-weight:800; font-size:24px; color:var(--brand); }
    .dp-cta { display:block; width:100%; padding:16px; font-size:20px; font-weight:800; border:0; border-radius:12px; background:var(--brand); color:#fff; cursor:pointer; transition:.2s; box-shadow:0 6px 20px rgba(189,33,53,.18); }
    .dp-cta:hover { background:#a81c2d; }
    .dp-trust { text-align:center; font-size:12px; color:#555; margin-top:6px; }

    /* Embedded */
    .dp-embedded { max-width:760px; margin:0 auto; }
    .dp-embedded .dp-panel { max-width:none; border-radius:20px; }
    .dp-embedded .dp-header { border-radius:20px 20px 0 0; }

    .dp-steps { display:flex; justify-content:center; margin-bottom:20px; }
    .dp-step { display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:50%; background:#e0e0e0; color:#666; font-weight:700; margin:0 8px; position:relative; }
    .dp-step.active { background:var(--brand); color:#fff; }
    .dp-step.completed { background:#28a745; color:#fff; }
    .dp-step::after { content:''; position:absolute; top:50%; left:100%; width:40px; height:2px; background:#e0e0e0; transform:translateY(-50%); z-index:-1; }
    .dp-step:last-child::after { display:none; }
    .dp-step.completed::after { background:#28a745; }
    .dp-step.active::after { background:var(--brand); }
    
    .dp-step-content { display:none; }
    .dp-step-content.active { display:block; }
    .dp-nav-buttons { display:flex; justify-content:space-between; margin-top:20px; }
    .dp-btn { padding:12px 24px; border:2px solid var(--brand); background:var(--brand); color:#fff; border-radius:8px; cursor:pointer; font-weight:600; transition:.2s; }
    .dp-btn.secondary { background:transparent; color:var(--brand); }
    .dp-btn:hover { opacity:0.9; }
    .dp-btn:disabled { opacity:0.5; cursor:not-allowed; }
    
    /* Responsive */
    @media (max-width: 640px) {
      .dp-panel { max-width:100%; height:100%; border-radius:0; }
      .dp-body { padding:12px; }
      .dp-grid-2, .dp-grid-3 { grid-template-columns: 1fr; }
      .dp-cta { border-radius:999px; font-size:18px; }
      .dp-summary .dp-total { font-size:22px; }
      .dp-row { justify-content: center; }
      .dp-chip { padding:8px 12px; font-size:14px; }
    }
    @media (max-width: 480px) {
      .dp-body { padding:8px; }
      .dp-card { padding:12px; margin-bottom:12px; }
      .dp-grid { gap:8px; }
      .dp-row { gap:4px; }
      .dp-chip { padding:6px 10px; font-size:13px; }
      .dp-input, .dp-select { padding:10px; font-size:14px; }
      .dp-cta { padding:14px; font-size:16px; }
    }
  </style>`;

  // ---------- Templating ----------

  function personalInfoHTML(prefix) {
    return `
      <div class="dp-step-content active" id="${prefix}-step1">
        <div class="dp-card">
          <div class="dp-title">Personal Information</div>
          <div class="dp-grid dp-grid-2">
            <div><label class="dp-label" for="${prefix}-firstname">First Name</label><input class="dp-input" id="${prefix}-firstname" required></div>
            <div><label class="dp-label" for="${prefix}-lastname">Last Name</label><input class="dp-input" id="${prefix}-lastname" required></div>
          </div>
          <div class="dp-grid dp-grid-2" style="margin-top:12px;">
            <div><label class="dp-label" for="${prefix}-email">Email</label><input type="email" class="dp-input" id="${prefix}-email" required></div>
            <div><label class="dp-label" for="${prefix}-phone">Phone</label><input type="tel" class="dp-input" id="${prefix}-phone" required></div>
          </div>
          <div class="dp-nav-buttons">
            <div></div>
            <button type="button" class="dp-btn" id="${prefix}-next1">Next</button>
          </div>
        </div>
      </div>
    `;
  }

  function addressHTML(prefix) {
    return `
      <div class="dp-step-content" id="${prefix}-step2">
        <div class="dp-card">
          <div class="dp-title">Address Information</div>
          <div class="dp-grid" id="${prefix}-address-lookup-row">
            <div style="position:relative;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                <label class="dp-label" for="${prefix}-address-lookup" style="margin:0;">Address</label>
                <span id="${prefix}-enter-manually" style="font-size:14px;font-weight:700;cursor:pointer;color:${BRAND_RED};">Enter manually</span>
              </div>
              <input class="dp-input" id="${prefix}-address-lookup" placeholder="Start typing your address..." autocomplete="off">
              <div id="${prefix}-address-suggestions" style="position:absolute;z-index:1001;top:100%;left:0;width:100%;background:#fff;border:1px solid #ddd;border-radius:0 0 10px 10px;box-shadow:0 8px 20px rgba(0,0,0,.08);display:none;max-height:220px;overflow:auto;"></div>
            </div>
          </div>
          <div id="${prefix}-manual-address" style="display:none;margin-top:12px;">
            <div class="dp-grid dp-grid-2">
              <div><label class="dp-label" for="${prefix}-addr1">Address Line 1</label><input class="dp-input" id="${prefix}-addr1"></div>
              <div><label class="dp-label" for="${prefix}-addr2">Address Line 2 (optional)</label><input class="dp-input" id="${prefix}-addr2"></div>
            </div>
            <div class="dp-grid dp-grid-3" style="margin-top:12px;">
              <div><label class="dp-label" for="${prefix}-city">City</label><input class="dp-input" id="${prefix}-city"></div>
              <div><label class="dp-label" for="${prefix}-state">State</label><select class="dp-select" id="${prefix}-state"></select></div>
              <div><label class="dp-label" for="${prefix}-zip">Zip Code</label><input class="dp-input" id="${prefix}-zip"></div>
            </div>
            <div class="dp-grid" style="margin-top:12px;">
              <div><label class="dp-label" for="${prefix}-country">Country</label><select class="dp-select" id="${prefix}-country"></select></div>
            </div>
          </div>
          <div class="dp-nav-buttons">
            <button type="button" class="dp-btn secondary" id="${prefix}-prev2">Previous</button>
            <button type="button" class="dp-btn" id="${prefix}-next2">Next</button>
          </div>
        </div>
      </div>
    `;
  }

  function donationControlsHTML(prefix) {
    return `
      <div class="dp-step-content" id="${prefix}-step3">
        <div class="dp-card">
          <div class="dp-title">Donation Details</div>
          <div class="dp-grid dp-grid-2" style="gap:16px;">
            <div>
              <label class="dp-label">Select Donation Amount</label>
              <div class="dp-row" id="${prefix}-amount-row">
                ${[500,100,50,25,10].map(function(v){ return `<button type="button" class="dp-chip" data-value="${v}">$${v}</button>`; }).join("")}
                <button type="button" class="dp-chip" data-value="custom">Other</button>
              </div>
              <div id="${prefix}-custom-wrap" style="display:none;margin-top:8px;">
                <input type="number" min="1" step="0.01" id="${prefix}-custom" class="dp-input" placeholder="Enter custom amount">
              </div>
              <div class="dp-fee" style="margin-top:12px;">
                <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;">
                  <input type="checkbox" id="${prefix}-cover-fee" checked>
                  I would like to cover the processing fees
                </label>
              </div>
            </div>
            <div>
              <label class="dp-label" for="${prefix}-frequency">Donation Frequency</label>
              <select id="${prefix}-frequency" class="dp-select">
                <option value="onetime">One-time</option>
                <option value="week">Weekly</option>
                <option value="biweek">Bi-Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
              <div style="margin-top:12px;">
                <label class="dp-label" for="${prefix}-category">Category</label>
                <select id="${prefix}-category" class="dp-select">
                  <option>General Giving</option>
                  <option>Cooking and Culture</option>
                  <option>Corporate Sponsor</option>
                  <option>Ministry Support Dinner</option>
                  <option>TNND Payment</option>
                  <option>Volunteer Application</option>
                  <option>Other (specify)</option>
                </select>
                <div id="${prefix}-category-other-wrap" style="display:none;margin-top:8px;">
                  <input type="text" id="${prefix}-category-other" class="dp-input" placeholder="Please describe what this donation is for">
                </div>
              </div>
              <div style="margin-top:12px;">
                <label class="dp-label">Payment Method</label>
                <div class="dp-row" id="${prefix}-pm-row">
                  <button type="button" class="dp-chip" data-method="card">Card</button>
                  <button type="button" class="dp-chip" data-method="ach">US Bank</button>
                  <button type="button" class="dp-chip" data-method="wallet">Wallet</button>
                </div>
              </div>
            </div>
          </div>
          <div class="dp-nav-buttons">
            <button type="button" class="dp-btn secondary" id="${prefix}-prev3">Previous</button>
            <button type="button" class="dp-btn" id="${prefix}-next3">Next</button>
          </div>
        </div>
      </div>
    `;
  }

  function summaryAndSubmitHTML(prefix) {
    return `
      <div class="dp-step-content" id="${prefix}-step4">
        <div class="dp-card">
          <div class="dp-title">Review Your Donation</div>
          <div class="dp-summary">
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;gap:12px;">
                <div>Gift</div><div id="${prefix}-gift">$0.00</div>
              </div>
              <div style="display:flex;justify-content:space-between;gap:12px;margin-top:6px;">
                <div>Processing fees <span id="${prefix}-fee-label">(added)</span></div><div id="${prefix}-fee">$0.00</div>
              </div>
              <div style="font-size:12px;color:#555;margin-top:6px;" id="${prefix}-recur-note"></div>
            </div>
          </div>
          <button type="button" id="${prefix}-submit" class="dp-cta" disabled>Select an amount</button>
          <div class="dp-trust">Secure Payment powered by Stripe</div>
          <div class="dp-nav-buttons" style="margin-top:16px;">
            <button type="button" class="dp-btn secondary" id="${prefix}-prev4">Previous</button>
            <div></div>
          </div>
        </div>
      </div>
    `;
  }

  function headerHTML(prefix, embedded) {
    return `
      <div class="${embedded ? "dp-embedded" : ""}">
        <div class="dp-panel">
          <div class="dp-header">
            <img src="https://images.squarespace-cdn.com/content/v1/5af0bc3a96d45593d7d7e55b/c8c56eb8-9c50-4540-822a-5da3f5d0c268/refuge-logo-edit+%28circle+with+horizontal+RI+name%29+-+small.png" alt="Refuge International"/>
            ${embedded ? "" : `<button class="dp-close" id="${prefix}-close" aria-label="Close">&times;</button>`}
          </div>
          <div class="dp-body" id="${prefix}-body">
            <div class="dp-steps">
              <div class="dp-step active" id="${prefix}-step-indicator-1">1</div>
              <div class="dp-step" id="${prefix}-step-indicator-2">2</div>
              <div class="dp-step" id="${prefix}-step-indicator-3">3</div>
              <div class="dp-step" id="${prefix}-step-indicator-4">4</div>
            </div>
            ${personalInfoHTML(prefix)}
            ${addressHTML(prefix)}
            ${donationControlsHTML(prefix)}
            ${summaryAndSubmitHTML(prefix)}
          </div>
        </div>
      </div>
    `;
  }

  // ---------- Mount helpers ----------
  function mountPopup() {
    var root = document.getElementById("donation-popup");
    if (!root) return;

    // Inject style once
    if (!document.getElementById("donation-popup-style")) {
      document.head.insertAdjacentHTML("beforeend", style);
    }

    root.innerHTML = `
      <div class="dp-modal" id="dp-modal">
        ${headerHTML("popup", false)}
      </div>
    `;

    // Open/close by hash
    var modal = document.getElementById("dp-modal");
    var closeBtn = document.getElementById("popup-close");
    function showModal() { modal.style.display = "flex"; }
    function hideModal() { modal.style.display = "none"; history.pushState("", document.title, window.location.pathname + window.location.search); }

    function checkHash() { if (window.location.hash === "#donate") showModal(); }
    checkHash();
    window.addEventListener("hashchange", checkHash);

    // Overlay click to close
    modal.addEventListener("click", function (e) {
      if (e.target === modal) hideModal();
    });
    if (closeBtn) closeBtn.addEventListener("click", hideModal);

    wireUp("popup");
  }

  function mountEmbedded() {
    var root = document.getElementById("donation-form-embedded");
    if (!root) return;

    // Inject style once
    if (!document.getElementById("donation-popup-style")) {
      document.head.insertAdjacentHTML("beforeend", style);
    }

    root.innerHTML = headerHTML("embedded", true);
    wireUp("embedded");
  }

  // ---------- Logic ----------
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

  function wireUp(prefix) {
    // Step navigation
    var currentStep = 1;
    var totalSteps = 4;
    
    function showStep(step) {
      // Hide all steps
      for (var i = 1; i <= totalSteps; i++) {
        var stepEl = document.getElementById(prefix + "-step" + i);
        var indicatorEl = document.getElementById(prefix + "-step-indicator-" + i);
        if (stepEl) stepEl.classList.remove("active");
        if (indicatorEl) {
          indicatorEl.classList.remove("active", "completed");
          if (i < step) indicatorEl.classList.add("completed");
          else if (i === step) indicatorEl.classList.add("active");
        }
      }
      
      // Show current step
      var activeStep = document.getElementById(prefix + "-step" + step);
      if (activeStep) activeStep.classList.add("active");
      currentStep = step;
    }
    
    function validateStep(step) {
      switch(step) {
        case 1:
          var fname = document.getElementById(prefix + "-firstname").value.trim();
          var lname = document.getElementById(prefix + "-lastname").value.trim();
          var email = document.getElementById(prefix + "-email").value.trim();
          var phone = document.getElementById(prefix + "-phone").value.trim();
          return fname && lname && /.+@.+\..+/.test(email) && phone;
        case 2:
          var manualWrap = document.getElementById(prefix + "-manual-address");
          var lookupInput = document.getElementById(prefix + "-address-lookup");
          var addr1 = document.getElementById(prefix + "-addr1");
          var city = document.getElementById(prefix + "-city");
          var stateSel = document.getElementById(prefix + "-state");
          var zip = document.getElementById(prefix + "-zip");
          var countrySel = document.getElementById(prefix + "-country");
          return manualWrap.style.display !== "none"
            ? (addr1.value && city.value && stateSel.value && zip.value && countrySel.value)
            : (lookupInput.value.trim().length >= 5);
        case 3:
          var amountOk = customActive ? (parseFloat(customInput.value || "0") > 0) : (selectedAmount > 0);
          var category = document.getElementById(prefix + "-category").value;
          var otherOk = true;
          if (category === "Other (specify)") {
            otherOk = (document.getElementById(prefix + "-category-other").value.trim().length > 0);
          }
          return amountOk && otherOk;
        default:
          return true;
      }
    }
    
    // Navigation button handlers
    function setupStepNavigation() {
      for (var i = 1; i <= totalSteps; i++) {
        var nextBtn = document.getElementById(prefix + "-next" + i);
        var prevBtn = document.getElementById(prefix + "-prev" + i);
        
        if (nextBtn) {
          nextBtn.addEventListener("click", (function(step) {
            return function() {
              if (validateStep(step)) {
                showStep(step + 1);
                updateTotals();
              }
            };
          })(i));
        }
        
        if (prevBtn) {
          prevBtn.addEventListener("click", (function(step) {
            return function() {
              showStep(step - 1);
            };
          })(i));
        }
      }
    }
    
    // selects
    populateSelect(prefix + "-state", states);
    populateSelect(prefix + "-country", countries);

    // Setup step navigation
    setupStepNavigation();

    // amount chips
    var amountRow = document.getElementById(prefix + "-amount-row");
    var customWrap = document.getElementById(prefix + "-custom-wrap");
    var customInput = document.getElementById(prefix + "-custom");
    var selectedAmount = 0; // no default selection
    var customActive = false;

    function selectChipGroup(row, valueAttr, value) {
      var btns = row.querySelectorAll(".dp-chip");
      btns.forEach(function (b) { b.classList.remove("selected"); });
      var target = Array.prototype.find.call(btns, function (b) { return b.getAttribute(valueAttr) === value; });
      if (target) target.classList.add("selected");
    }

    amountRow.addEventListener("click", function (e) {
      var t = e.target.closest(".dp-chip");
      if (!t) return;
      var v = t.getAttribute("data-value");
      if (v === "custom") {
        customActive = true;
        customWrap.style.display = "";
        selectChipGroup(amountRow, "data-value", "custom");
        customInput.focus();
      } else {
        customActive = false;
        customWrap.style.display = "none";
        selectedAmount = parseFloat(v);
        selectChipGroup(amountRow, "data-value", v);
        updateTotals();
      }
    });

    if (!customActive) { // no default selection
      // selectChipGroup(amountRow, "data-value", "100");
    }

    customInput.addEventListener("input", updateTotals);

    // frequency
    var freqSel = document.getElementById(prefix + "-frequency");
    // category + other
    var catSel = document.getElementById(prefix + "-category");
    var catOtherWrap = document.getElementById(prefix + "-category-other-wrap");
    var catOtherInput = document.getElementById(prefix + "-category-other");
    catSel.addEventListener("change", function () {
      var isOther = catSel.value.indexOf("Other") === 0 || catSel.value.indexOf("Other (specify)") === 0;
      catOtherWrap.style.display = isOther ? "" : "none";
      updateTotals();
    });

    // cover fees
    var coverFee = document.getElementById(prefix + "-cover-fee");
    coverFee.addEventListener("change", updateTotals);

    // payment method
    var pmRow = document.getElementById(prefix + "-pm-row");
    var paymentMethod = "card";
    pmRow.addEventListener("click", function (e) {
      var t = e.target.closest(".dp-chip");
      if (!t) return;
      paymentMethod = t.getAttribute("data-method");
      selectChipGroup(pmRow, "data-method", paymentMethod);
      updateTotals();
    });
    selectChipGroup(pmRow, "data-method", "card");

    // address lookup / manual
    var lookupRow = document.getElementById(prefix + "-address-lookup-row");
    var lookupInput = document.getElementById(prefix + "-address-lookup");
    var suggestions = document.getElementById(prefix + "-address-suggestions");
    var enterManual = document.getElementById(prefix + "-enter-manually");
    var manualWrap = document.getElementById(prefix + "-manual-address");

    var addr1 = document.getElementById(prefix + "-addr1");
    var addr2 = document.getElementById(prefix + "-addr2");
    var city = document.getElementById(prefix + "-city");
    var stateSel = document.getElementById(prefix + "-state");
    var zip = document.getElementById(prefix + "-zip");
    var countrySel = document.getElementById(prefix + "-country");

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
              div.addEventListener("mouseenter", function(){ div.style.background = "#f7f7f7"; });
              div.addEventListener("mouseleave", function(){ div.style.background = "#fff"; });
              div.addEventListener("click", function () {
                lookupInput.value = item.display_name;
                var a = item.address || {};
                addr1.value = (a.house_number ? a.house_number + " " : "") + (a.road || a.pedestrian || a.footway || a.cycleway || a.path || "");
                city.value = a.city || a.town || a.village || a.hamlet || "";
                zip.value = a.postcode || "";
                // best-effort state match
                var stateName = a.state || "";
                var stateOpt = states.find(function (s) { return stateName && s.toLowerCase().indexOf(stateName.toLowerCase()) >= 0; }) || "";
                stateSel.value = stateOpt;
                countrySel.value = countries.find(function (c) { return c === (a.country || "United States"); }) || "United States";
                suggestions.style.display = "none";
                manualWrap.style.display = "";
                lookupRow.style.display = "none";
              });
              suggestions.appendChild(div);
            });
            suggestions.style.display = "block";
          })
          .catch(function () { suggestions.style.display = "none"; });
      }, 300);
    });

    document.addEventListener("click", function (e) {
      if (!lookupRow.contains(e.target)) suggestions.style.display = "none";
    });

    enterManual.addEventListener("click", function () {
      manualWrap.style.display = "";
      lookupRow.style.display = "none";
    });

    // summary + submit
    var giftEl = document.getElementById(prefix + "-gift");
    var feeEl = document.getElementById(prefix + "-fee");
    var feeLabel = document.getElementById(prefix + "-fee-label");
    var totalEl = null; // No separate total element, total is shown in button text
    var recurNote = document.getElementById(prefix + "-recur-note");
    var submitBtn = document.getElementById(prefix + "-submit");

    function format(n) { return "$" + (Number(n || 0).toFixed(2)); }

    function computeTotals() {
      var amt = customActive ? parseFloat(customInput.value || "0") : Number(selectedAmount || 0);
      var cover = coverFee.checked;
      var fee = 0;
      if (cover) {
        if (paymentMethod === "ach") fee = Math.min(amt * 0.008, 5.0);
        else fee = amt * 0.022 + 0.30; // card & wallet
      }
      var total = amt + fee;
      return { amt: amt, fee: fee, total: total };
    }

    function validateRequired() {
      var fname = document.getElementById(prefix + "-firstname").value.trim();
      var lname = document.getElementById(prefix + "-lastname").value.trim();
      var email = document.getElementById(prefix + "-email").value.trim();
      var phone = document.getElementById(prefix + "-phone").value.trim();
      var addressOk = manualWrap.style.display !== "none"
        ? (addr1.value && city.value && stateSel.value && zip.value && countrySel.value)
        : (lookupInput.value.trim().length >= 5);
      var amountOk = customActive ? (parseFloat(customInput.value || "0") > 0) : (selectedAmount > 0);
      var category = document.getElementById(prefix + "-category").value;
      var otherOk = true;
      if (category.indexOf("Other") === 0) {
        otherOk = (document.getElementById(prefix + "-category-other").value.trim().length > 0);
      }
      var identityOk = fname && lname && /.+@.+\..+/.test(email) && phone;

      // Debugging logs
      console.log("Validation Results:", { identityOk, addressOk, amountOk, otherOk });

      return identityOk && addressOk && amountOk && otherOk;
    }

    function updateTotals() {
      var t = computeTotals();
      var currentAmount = customActive ? (parseFloat(customInput.value || "0")) : selectedAmount;
      
      giftEl.textContent = format(currentAmount);
      feeEl.textContent = document.getElementById(prefix + "-cover-fee").checked ? format(t.fee) : "$0.00";
      feeLabel.textContent = document.getElementById(prefix + "-cover-fee").checked ? "(added)" : "(not covered)";
      
      var freq = freqSel.value;
      var freqMap = { onetime: "", week: " every week", biweek: " every two weeks", month: " every month", year: " every year" };
      var freqText = freqMap[freq] || "";
      
      if (currentAmount > 0) {
        submitBtn.textContent = "Donate " + format(t.total) + freqText;
      } else {
        submitBtn.textContent = "Select an amount";
      }
      
      submitBtn.disabled = !validateRequired();

      // Remove the separate recurring note since it's now in the button
      recurNote.textContent = "";
    }

    // Category other reveal initial state
    catSel.dispatchEvent(new Event("change"));

    // Recalc handlers
    ["input","change"].forEach(function (ev) {
      document.getElementById(prefix + "-firstname").addEventListener(ev, updateTotals);
      document.getElementById(prefix + "-lastname").addEventListener(ev, updateTotals);
      document.getElementById(prefix + "-email").addEventListener(ev, updateTotals);
      document.getElementById(prefix + "-phone").addEventListener(ev, updateTotals);
      customInput.addEventListener(ev, updateTotals);
      freqSel.addEventListener(ev, updateTotals);
      catSel.addEventListener(ev, updateTotals);
      if (catOtherInput) catOtherInput.addEventListener(ev, updateTotals);
      coverFee.addEventListener(ev, updateTotals);
      addr1.addEventListener(ev, updateTotals);
      addr2.addEventListener(ev, updateTotals);
      city.addEventListener(ev, updateTotals);
      stateSel.addEventListener(ev, updateTotals);
      zip.addEventListener(ev, updateTotals);
      countrySel.addEventListener(ev, updateTotals);
      lookupInput.addEventListener(ev, updateTotals);
    });

    // Submit
    submitBtn.addEventListener("click", function () {
      if (!validateRequired()) return;

      var first = document.getElementById(prefix + "-firstname").value.trim();
      var last = document.getElementById(prefix + "-lastname").value.trim();
      var email = document.getElementById(prefix + "-email").value.trim();
      var phone = document.getElementById(prefix + "-phone").value.trim();
      var freq = freqSel.value;
      var category = catSel.value;
      // If "Other (specify)" is selected, replace it with the custom text
      if (category === "Other (specify)") {
        var categoryOther = document.getElementById(prefix + "-category-other").value.trim();
        category = categoryOther || "Other";
      }

      var totals = computeTotals();
      var baseAmount = customActive ? parseFloat(customInput.value || "0") : selectedAmount;

      var payload = {
        firstname: first,
        lastname: last,
        livemode: first.toLowerCase() === "test" ? false : true,
        email: email,
        phone: phone,
        address: {
          line1: addr1.value,
          line2: addr2.value,
          city: city.value,
          state: (stateSel.value || "").split(" - ")[0],
          postal_code: zip.value,
          country: countrySel.value
        },
        amount: Math.round(totals.total * 100),
        coverFee: coverFee.checked,
        paymentMethod: paymentMethod,
        frequency: freq,
        category: category
      };

      submitBtn.disabled = true;

      fetch(processDonationAPI, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      .then(function (r) { return r.json(); })
      .then(function (session) {
        var key = payload.livemode ? "pk_live_fJSacHhPB2h0mJfsFowRm8lQ" : "pk_test_y47nraQZ5IFgnTMlwbDvfj8D";
        var stripe = window.Stripe ? window.Stripe(key) : null;
        if (!stripe) { console.error("Stripe.js not loaded"); return; }
        return stripe.redirectToCheckout({ sessionId: session.id });
      })
      .catch(function (err) {
        console.error("Checkout error:", err);
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
    });

    // Initial totals
    updateTotals();
  }

  // ---------- Public helpers ----------
  window.openDonationModal = function () {
    var modal = document.getElementById("dp-modal");
    if (modal) modal.style.display = "flex";
  };
  window.closeDonationModal = function () {
    var modal = document.getElementById("dp-modal");
    if (modal) modal.style.display = "none";
  };

  // ---------- Boot ----------
  document.addEventListener("DOMContentLoaded", function () {
    mountPopup();     // attaches to #donation-popup (if present)
    mountEmbedded();  // attaches to #donation-form-embedded (if present)
  });
})();
