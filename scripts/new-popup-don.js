const processDonationAPI = 'https://prod-08.westus.logic.azure.com:443/workflows/aa6dd00627e9488eb2d9e5af99110e26/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=lnc3194xuZhPQnVi6pDF_LuvDSG8BElOsVFllpS6UpE';

(function () {
  "use strict";

  var BRAND_PRIMARY = "#BD2135";
  var BRAND_SECONDARY = "#000000";
  var BRAND_TERTIARY = "#ffffff";

  var states = ["", "AL - Alabama", "AK - Alaska", "AZ - Arizona", "AR - Arkansas", "CA - California", "CO - Colorado", "CT - Connecticut", "DE - Delaware", "FL - Florida", "GA - Georgia", "HI - Hawaii", "ID - Idaho", "IL - Illinois", "IN - Indiana", "IA - Iowa", "KS - Kansas", "KY - Kentucky", "LA - Louisiana", "ME - Maine", "MD - Maryland", "MA - Massachusetts", "MI - Michigan", "MN - Minnesota", "MS - Mississippi", "MO - Missouri", "MT - Montana", "NE - Nebraska", "NV - Nevada", "NH - New Hampshire", "NJ - New Jersey", "NM - New Mexico", "NY - New York", "NC - North Carolina", "ND - North Dakota", "OH - Ohio", "OK - Oklahoma", "OR - Oregon", "PA - Pennsylvania", "RI - Rhode Island", "SC - South Carolina", "SD - South Dakota", "TN - Tennessee", "TX - Texas", "UT - Utah", "VT - Vermont", "VA - Virginia", "WA - Washington", "WV - West Virginia", "WI - Wisconsin", "WY - Wyoming", "Outside US"];
  var countries = ["", "United States", "Afghanistan", "Akrotiri", "Albania", "Algeria", "American Samoa", "Andorra", "Angola", "Anguilla", "Antarctica", "Antigua and Barbuda", "Argentina", "Armenia", "Aruba", "Ashmore and Cartier Islands", "Australia", "Austria", "Azerbaijan", "Bahamas, The", "Bahrain", "Bangladesh", "Barbados", "Bassas da India", "Belarus", "Belgium", "Belize", "Benin", "Bermuda", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Bouvet Island", "Brazil", "British Indian Ocean Territory", "British Virgin Islands", "Brunei", "Bulgaria", "Burkina Faso", "Burma", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Cayman Islands", "Central African Republic", "Chad", "Chile", "China", "Christmas Island", "Clipperton Island", "Cocos (Keeling) Islands", "Colombia", "Comoros", "Congo, Democratic Republic of the", "Congo, Republic of the", "Cook Islands", "Coral Sea Islands", "Costa Rica", "Cote d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Dhekelia", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Europa Island", "Falkland Islands (Islas Malvinas)", "Faroe Islands", "Fiji", "Finland", "France", "French Guiana", "French Polynesia", "French Southern and Antarctic Lands", "Gabon", "Gambia, The", "Gaza Strip", "Georgia", "Germany", "Ghana", "Gibraltar", "Glorioso Islands", "Greece", "Greenland", "Grenada", "Guadeloupe", "Guam", "Guatemala", "Guernsey", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Heard Island and McDonald Islands", "Holy See (Vatican City)", "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Isle of Man", "Israel", "Italy", "Jamaica", "Jan Mayen", "Japan", "Jersey", "Jordan", "Juan de Nova Island", "Kazakhstan", "Kenya", "Kiribati", "North Korea", "South Korea", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Macau", "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Martinique", "Mauritania", "Mauritius", "Mayotte", "Mexico", "Micronesia, Federated States of", "Moldova", "Monaco", "Mongolia", "Montserrat", "Morocco", "Mozambique", "Namibia", "Nauru", "Navassa Island", "Nepal", "Netherlands", "Netherlands Antilles", "New Caledonia", "New Zealand", "Nicaragua", "Niger", "Nigeria", "Niue", "Norfolk Island", "Northern Ireland", "Northern Mariana Islands", "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paracel Islands", "Paraguay", "Peru", "Philippines", "Pitcairn Islands", "Poland", "Portugal", "Puerto Rico", "Qatar", "Reunion", "Romania", "Russia", "Rwanda", "Saint Helena", "Saint Kitts and Nevis", "Saint Lucia", "Saint Pierre and Miquelon", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia and Montenegro", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Georgia and the South Sandwich Islands", "Spain", "Spratly Islands", "Sri Lanka", "Sudan", "Suriname", "Svalbard", "Swaziland", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tokelau", "Tonga", "Trinidad and Tobago", "Tromelin Island", "Tunisia", "Turkey", "Turkmenistan", "Turks and Caicos Islands", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Virgin Islands", "Wake Island", "Wallis and Futuna", "West Bank", "Western Sahara", "Yemen", "Zambia", "Zimbabwe", "Myanmar (Burma)", "Palestine", "Democratic Republic of the Congo", "Not Listed"];

  var style = `
  <style id="donation-popup-style">
    :root { --brand:#BD2135; }
    .dp-modal { display:none; position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.48); align-items:center; justify-content:center; }
    .dp-panel { background:#fff; width:100%; max-width:760px; border-radius:24px; box-shadow:0 10px 40px rgba(0,0,0,.15); overflow:visible; }
    .dp-header { display:flex; align-items:center; justify-content:center; position:relative; padding:12px 16px; background:#fff; color:#000; border-bottom:4px solid var(--brand); border-radius:24px 24px 0 0; }
    .dp-header .dp-btn-back { position:absolute; left:16px; margin:0; }
    .dp-header img { height:56px; }
    .dp-close { position:absolute; top:50%; right:16px; transform:translateY(-50%); font-size:24px; line-height:1; color:#000; opacity:.75; cursor:pointer; border:0; background:transparent; }
    .dp-close:hover { opacity:1; }
    .dp-body { padding:16px; max-width:700px; margin:0 auto; position:relative; overflow:visible; }
    .dp-card { background:#fff; border-radius:18px; box-shadow: 0 6px 24px rgba(189,33,53,0.10), 0 1px 6px rgba(0,0,0,0.08); padding:24px; margin-bottom:16px; max-width:700px; margin-left:auto; margin-right:auto; overflow:visible; }
    .dp-title { font-weight:700; margin-bottom:16px; text-align:center; }
    .dp-grid { display:grid; gap:12px; }
    .dp-grid-2 { grid-template-columns: 1fr 1fr; }
    .dp-grid-3 { grid-template-columns: 2fr 1fr; }
    .dp-grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
    .dp-label { display:block; font-size:14px; font-weight:600; margin-bottom:6px; color:#222; }
    .dp-input, .dp-select { width:100%; padding:12px; border:1.5px solid #e0e0e0; border-radius:10px; background:#fafbfc; font-size:16px; outline:none; transition:.2s border-color,.2s box-shadow,.2s background; box-sizing:border-box; }
    .dp-input:focus, .dp-select:focus { border-color:var(--brand); box-shadow:0 0 0 2px #BD213533; background:#fff; }
    .dp-row { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; }
    .dp-amount-row { flex-wrap:nowrap; margin-bottom:8px; }
    .dp-amount-row:last-child { margin-bottom:0; }
    .dp-chip { padding:12px 18px; border-radius:999px; border:1.5px solid #d4d4d4; background:#fff; font-weight:700; cursor:pointer; transition:.2s; font-size:16px; }
    .dp-chip:hover { border-color:var(--brand); color:var(--brand); }
    .dp-chip.selected { background:var(--brand); border-color:var(--brand); color:#fff; box-shadow:0 2px 10px rgba(189,33,53,.25); }
    
    /* Amount chips with more rectangular styling */
    .dp-amount-chip { border-radius:8px; min-width:90px; padding:14px 18px; font-size:18px; font-weight:800; white-space:nowrap; }
    .dp-amount-chip:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(189,33,53,.15); }
    .dp-amount-chip.selected { transform:translateY(-1px); box-shadow:0 4px 12px rgba(189,33,53,.25); }
    
    /* Frequency chips */
    .dp-frequency-chip { border-radius:8px; min-width:120px; }
    
    /* Tribute chips */
    .dp-tribute-chip { border-radius:8px; min-width:120px; }
    
    /* Donation type chips */
    .dp-donation-type-chip { border-radius:8px; min-width:120px; }
    
    /* Frequency options */
    .dp-frequency-container { display:flex; flex-direction:column; gap:8px; }
    .dp-frequency-options { justify-content:center; }
    
    /* Elegant frequency stepper */
    .dp-recurring-stepper { margin-top:12px; }
    .dp-stepper-container { display:flex; align-items:center; justify-content:center; gap:12px; }
    .dp-stepper-btn { 
      display:flex; align-items:center; justify-content:center; 
      width:32px; height:32px; border-radius:50%; 
      border:2px solid var(--brand); background:transparent; color:var(--brand); 
      cursor:pointer; font-size:20px; font-weight:700; transition:.2s; 
    }
    .dp-stepper-btn:hover { background:var(--brand); color:#fff; }
    .dp-stepper-btn:disabled { 
      opacity:0.3; cursor:not-allowed; border-color:#ccc; color:#ccc; 
    }
    .dp-stepper-btn:disabled:hover { background:transparent; color:#ccc; }
    .dp-stepper-display { 
      font-size:16px; font-weight:600; color:#333; 
      min-width:100px; text-align:center; 
      padding:8px 16px; border-radius:8px; 
      background:#f8f9fa; border:1px solid #e9ecef; 
    }
    
    /* Personal info card wider */
    .dp-personal-info-card { max-width:700px; margin:0 auto; }
    
    /* Back arrow positioning */
    .dp-back-arrow-container { margin-bottom:16px; }
    .dp-back-arrow-container .dp-btn-back { margin:0; }
    
    /* Fee checkbox positioning fix */
    .dp-fee-checkbox-container { position:relative; z-index:1; }
    .dp-payment-chip { display:flex; flex-direction:column; align-items:center; gap:4px; padding:12px 16px; min-width:120px; max-width:140px; text-align:center; border-radius:12px !important; }
    .dp-payment-chip img, .dp-payment-chip svg { margin-bottom:4px; }
    .dp-payment-chip small { font-size:12px; font-weight:500; opacity:0.8; }
    .dp-payment-chip.selected img { filter:brightness(0) invert(1); }
    .dp-payment-chip.selected .wallet-svg-main { fill:#fff !important; stroke:#fff !important; }
    .dp-payment-chip.selected .wallet-svg-circle { fill:var(--brand) !important; }
    .dp-payment-chip.selected .wallet-svg-bar { fill:var(--brand) !important; }
    .dp-payment-chip.selected .dp-wallet-explainer { color:#fff; }
    .dp-payment-methods { justify-content:center; }
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
    .dp-step { display:flex; align-items:center; justify-content:center; width:12px; height:12px; border-radius:50%; background:#ccc; color:#666; font-weight:700; margin:0 8px; position:relative; }
    .dp-step.active { background:var(--brand); color:#fff; }
    .dp-step.completed { background:#000; color:#fff; }
    .dp-step::after { content:''; position:absolute; top:50%; left:100%; width:40px; height:2px; background:#ccc; transform:translateY(-50%); z-index:-1; }
    .dp-step:last-child::after { display:none; }
    .dp-step.completed::after { background:#000; }
    .dp-step.active::after { background:var(--brand); }
    
    .dp-step-content { display:none; }
    .dp-step-content.active { display:block; }
    .dp-nav-buttons { display:flex; justify-content:space-between; margin-top:20px; }
    .dp-btn { padding:12px 24px; border:2px solid var(--brand); background:var(--brand); color:#fff; border-radius:8px; cursor:pointer; font-weight:600; transition:.2s; }
    .dp-btn.secondary { background:transparent; color:var(--brand); }
    .dp-btn:hover { opacity:0.9; }
    .dp-btn:disabled { opacity:0.5; cursor:not-allowed; }
    .dp-btn-back { display:flex; align-items:center; justify-content:center; width:48px; height:48px; border:2px solid var(--brand); background:transparent; color:var(--brand); border-radius:50%; cursor:pointer; font-size:24px; font-weight:700; transition:.2s; margin-right:12px; flex-shrink:0; }
    /* Custom checkbox styling to match theme */
    .dp-checkbox-container { position:relative; display:inline-flex; align-items:center; gap:8px; cursor:pointer; margin-bottom:12px; }
    .dp-checkbox { appearance:none; width:20px; height:20px; border:2px solid #e0e0e0; border-radius:4px; background:#fff; cursor:pointer; transition:.2s; position:relative; }
    .dp-checkbox:checked { background:var(--brand); border-color:var(--brand); }
    .dp-checkbox:checked::after { content:'✓'; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:#fff; font-size:12px; font-weight:700; }
    .dp-checkbox:focus { outline:none; box-shadow:0 0 0 2px rgba(189,33,53,.25); }
    
    /* Total display styling */
    .dp-total-container { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
    .dp-total-amount { font-size:18px; font-weight:700; color:#000000; flex:1; text-align:center; margin-right:16px; }
    
    /* Wallet explainer text */
    .dp-wallet-explainer { font-size:10px; color:#666; margin-top:2px; text-align:center; line-height:1.2; word-wrap:break-word; overflow-wrap:break-word; max-width:100%; }
    .dp-btn-back:hover { background:var(--brand); color:#fff; }
    
    /* Error message styling */
    .dp-error-message { color:var(--brand); font-size:12px; font-weight:600; margin-top:4px; display:none; }
    
    /* Step 3 specific positioning */
    .dp-step3-container { position:relative; }
    
    /* Responsive */
    @media (max-width: 600px) {
      .dp-modal { padding: 10px; }
      .dp-panel { width: 100%; max-width: none; max-height:90vh; border-radius:12px; overflow-y:auto; overflow-x:visible; }
      .dp-header { border-radius:12px 12px 0 0; }
      .dp-body { padding:12px; position:relative; overflow:visible; }
      .dp-grid-2, .dp-grid-3, .dp-grid-4 { grid-template-columns: 1fr; }
      .dp-cta { border-radius:999px; font-size:18px; }
      .dp-summary .dp-total { font-size:22px; }
      .dp-row { justify-content: center; }
      .dp-amount-row { flex-wrap:wrap; justify-content:center; margin-bottom:8px; }
      .dp-amount-row:last-child { margin-bottom:0; }
      .dp-chip { padding:10px 14px; font-size:15px; }
      .dp-payment-chip { min-width:110px; max-width:130px; }
      
      /* Ensure address dropdown is not clipped */
      .dp-card { overflow:visible; }
      #popup-address-suggestions, #embedded-address-suggestions { 
        z-index:10000 !important; 
        max-height:200px !important;
      }
    }
    @media (min-width: 601px) and (max-width: 900px) {
      .dp-amount-row { flex-wrap:wrap; justify-content:center; margin-bottom:8px; }
      .dp-amount-row:last-child { margin-bottom:0; }
      .dp-amount-chip { min-width:85px; padding:12px 16px; font-size:16px; }
    }
    @media (max-width: 400px) {
      .dp-modal { padding: 8px; }
      .dp-panel { width: 100%; max-width: none; max-height:85vh; overflow-y:auto; overflow-x:visible; border-radius:8px; }
      .dp-header { border-radius:8px 8px 0 0; }
      .dp-body { padding:8px; }
      .dp-card { padding:18px; margin-bottom:12px; }
      .dp-grid { gap:8px; }
      .dp-row { gap:6px; }
      .dp-amount-row { flex-wrap:wrap; margin-bottom:8px; }
      .dp-amount-row:last-child { margin-bottom:0; }
      .dp-chip { padding:8px 12px; font-size:14px; }
      .dp-payment-chip { min-width:100px; max-width:120px; padding:10px 12px; }
      .dp-input, .dp-select { padding:10px; font-size:14px; }
      .dp-cta { padding:14px; font-size:16px; }
      .dp-btn-back { width:40px; height:40px; font-size:20px; margin-right:8px; }
      
      /* Smaller address dropdown on very small screens */
      #popup-address-suggestions, #embedded-address-suggestions { 
        max-height:150px !important;
        font-size:14px !important;
      }
    }
  </style>`;
  // Helper function to group amounts into rows with proper "Other" placement
  function groupAmountsIntoRows(amounts) {
    const rows = [];
    const totalAmounts = amounts.length;
    
    // If we have 1-2 amounts, put them with "Other" in one row
    if (totalAmounts <= 2) {
      rows.push([...amounts, 'other']);
      return rows;
    }
    
    // Calculate how to distribute amounts
    const amountRows = Math.ceil(totalAmounts / 3);
    
    // Check if "Other" fits in the last row or needs its own row
    const lastRowSize = totalAmounts % 3;
    const otherNeedsOwnRow = lastRowSize === 0;
    
    // Create rows of amounts (3 per row)
    for (let i = 0; i < totalAmounts; i += 3) {
      const row = amounts.slice(i, i + 3);
      rows.push(row);
    }
    
    // Handle "Other" placement
    if (otherNeedsOwnRow) {
      // "Other" gets its own row
      rows.push(['other']);
    } else {
      // Add "Other" to the last row
      rows[rows.length - 1].push('other');
    }
    
    return rows;
  }

  function donationDetailsHTML(prefix) {
    // Generate amount rows HTML
    const amounts = [500,100,50,25,10];
    const amountRows = groupAmountsIntoRows(amounts);
    
    const amountRowsHTML = amountRows.map((row, index) => {
      const buttonsHTML = row.map(item => {
        if (item === 'other') {
          return `<button type="button" class="dp-chip dp-amount-chip" data-value="custom">Other</button>`;
        } else {
          return `<button type="button" class="dp-chip dp-amount-chip" data-value="${item}">$${item}</button>`;
        }
      }).join('');
      
      return `<div class="dp-row dp-amount-row" data-row="${index}">${buttonsHTML}</div>`;
    }).join('');

    return `
      <div class="dp-step-content active" id="${prefix}-step1">
        <div class="dp-card">
          <div class="dp-title">Donation Details</div>
          <!-- Frequency -->
          <div style="margin-bottom:16px;">
            <label class="dp-label" for="${prefix}-frequency">Frequency</label>
            <div class="dp-frequency-container">
              <div class="dp-row dp-frequency-options">
                <button type="button" class="dp-chip dp-frequency-chip selected" data-frequency="onetime">One-Time</button>
                <button type="button" class="dp-chip dp-frequency-chip" data-frequency="recurring">Recurring</button>
              </div>
              <div id="${prefix}-recurring-stepper" class="dp-recurring-stepper" style="display:none;margin-top:12px;">
                <div class="dp-stepper-container">
                  <button type="button" class="dp-stepper-btn dp-stepper-minus" id="${prefix}-freq-minus">−</button>
                  <div class="dp-stepper-display" id="${prefix}-freq-display">Monthly</div>
                  <button type="button" class="dp-stepper-btn dp-stepper-plus" id="${prefix}-freq-plus">+</button>
                </div>
              </div>
            </div>
            <input type="hidden" id="${prefix}-frequency" value="onetime">
          </div>
          
          <!-- Donation Amount - Multiple Rows -->
          <div style="margin-bottom:16px;">
            <label class="dp-label">Amount</label>
            <div id="${prefix}-amount-row">
              ${amountRowsHTML}
            </div>
            <div id="${prefix}-custom-wrap" style="display:none;margin-top:8px;">
              <input type="number" min="1" step="0.01" id="${prefix}-custom" class="dp-input" placeholder="Enter custom amount">
            </div>
            <div id="${prefix}-amount-error" class="dp-error-message">Please select or enter a donation amount</div>
          </div>

          <!-- Category with Other Field -->
          <div style="margin-bottom:16px;">
            <label class="dp-label" for="${prefix}-category">Category</label>
            <select id="${prefix}-category" class="dp-select">
              <option>General Giving</option>
              <option>Cooking and Culture</option>
              <option>Corporate Sponsor</option>
              <option>Ministry Support Dinner</option>
              <option>TNND Payment</option>
              <option>Volunteer Application</option>
              <option>Other</option>
            </select>
            <div id="${prefix}-category-other-wrap" style="display:none;margin-top:8px;">
              <input type="text" id="${prefix}-category-other" class="dp-input" placeholder="Specify">
              <div id="${prefix}-category-error" class="dp-error-message">Please describe what this donation is for</div>
            </div>
          </div>
            <div class="dp-fee-checkbox-container" style="margin-bottom:12px;">
              <label class="dp-checkbox-container">
                <input type="checkbox" id="${prefix}-cover-fee" class="dp-checkbox">
                <span style="font-weight:600;">I would like to cover the processing fees</span>
              </label>
            </div>
          <!-- Payment Method with Icons - Only shown when covering fees -->
          <div id="${prefix}-payment-method-section" style="margin-bottom:16px;display:none;">
            <label class="dp-label">Payment Method</label>
            <div class="dp-row dp-payment-methods" id="${prefix}-pm-row">
              <button type="button" class="dp-chip dp-payment-chip" data-method="card">
                <img src="https://js.stripe.com/v3/fingerprinted/img/card-ce24697297bd3c6a00fdd2fb6f760f0d.svg" alt="Card" width="28" height="28" />
                <span>Card</span>
                <small>2.2% + $0.30</small>
              </button>
              <button type="button" class="dp-chip dp-payment-chip" data-method="ach">
                <img src="https://js.stripe.com/v3/fingerprinted/img/bank-de5c9ead31505d57120e98291cb20e57.svg" alt="ACH/Bank Transfer" width="28" height="28" />
                <span>ACH/Bank Transfer</span>
                <small>0.8% (max $5)</small>
              </button>
              <button type="button" class="dp-chip dp-payment-chip" data-method="wallet">
                <svg width="28" height="28" viewBox="0 0 40 28" fill="none">
                  <rect class="wallet-svg-main" x="2" y="4" width="36" height="20" rx="4" fill="#000"/>
                  <rect class="wallet-svg-main" x="2" y="4" width="36" height="20" rx="4" stroke="#333" stroke-width="2"/>
                  <circle class="wallet-svg-circle" cx="32" cy="14" r="4" fill="#fff"/>
                  <rect class="wallet-svg-bar" x="6" y="10" width="18" height="4" rx="2" fill="#fff"/>
                </svg>
                <span>Wallet</span>
                <div class="dp-wallet-explainer">PayPal, Apple Pay, Google Pay</div>
                <small>2.2% + $0.30</small>
              </button>
            </div>
          </div>

          <!-- Cover Processing Fees and Total -->
          <div class="dp-fee-section" style="margin-bottom:20px;">
            <div class="dp-total-container">
              <div class="dp-total-amount">
                Total: <span id="${prefix}-total-preview">$0.00</span>
              </div>
              <button type="button" class="dp-btn" id="${prefix}-next1">Next</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function personalAndAddressHTML(prefix) {
    return `
      <div class="dp-step-content" id="${prefix}-step2">
        <div class="dp-card dp-personal-info-card">
          <div class="dp-title">Your Information</div>
          
          <!-- Donation Type Selection -->
          <div style="margin-bottom:20px;">
            <div class="dp-row" style="justify-content:center;">
              <button type="button" class="dp-chip dp-donation-type-chip selected" data-donation-type="individual">Individual</button>
              <button type="button" class="dp-chip dp-donation-type-chip" data-donation-type="organization">Organization</button>
            </div>
            <input type="hidden" id="${prefix}-donation-type" value="individual">
          </div>
          
          <!-- Individual Fields -->
          <div id="${prefix}-individual-fields">
            <!-- Row 1: First Name, Last Name -->
            <div class="dp-grid dp-grid-2" style="margin-bottom:16px;">
              <div>
                <label class="dp-label" for="${prefix}-firstname">First Name</label>
                <input class="dp-input" id="${prefix}-firstname" required>
                <div id="${prefix}-firstname-error" class="dp-error-message">Please enter your first name</div>
              </div>
              <div>
                <label class="dp-label" for="${prefix}-lastname">Last Name</label>
                <input class="dp-input" id="${prefix}-lastname" required>
                <div id="${prefix}-lastname-error" class="dp-error-message">Please enter your last name</div>
              </div>
            </div>
          </div>
          
          <!-- Organization Fields -->
          <div id="${prefix}-organization-fields" style="display:none;">
            <!-- Row 1: Organization Name -->
            <div style="margin-bottom:16px;">
              <label class="dp-label" for="${prefix}-organization-name">Organization Name</label>
              <input class="dp-input" id="${prefix}-organization-name" required>
              <div id="${prefix}-organization-name-error" class="dp-error-message">Please enter the organization name</div>
            </div>
          </div>
          
          <!-- Row 2: Email, Phone -->
          <div class="dp-grid dp-grid-2" style="margin-bottom:16px;">
            <div>
              <label class="dp-label" for="${prefix}-email">Email</label>
              <input type="email" class="dp-input" id="${prefix}-email" required>
              <div id="${prefix}-email-error" class="dp-error-message">Please enter a valid email address</div>
            </div>
            <div>
              <label class="dp-label" for="${prefix}-phone">Phone</label>
              <input type="tel" class="dp-input" id="${prefix}-phone" required>
              <div id="${prefix}-phone-error" class="dp-error-message">Please enter your phone number</div>
            </div>
          </div>
          
          <div class="dp-grid" id="${prefix}-address-lookup-row" style="margin-bottom:16px;">
            <div style="position:relative;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                <label class="dp-label" for="${prefix}-address-lookup" style="margin:0;">Address</label>
                <span id="${prefix}-enter-manually" style="font-size:14px;font-weight:700;cursor:pointer;color:${BRAND_PRIMARY};">Enter manually</span>
              </div>
              <input class="dp-input" id="${prefix}-address-lookup" placeholder="Start typing your address..." autocomplete="off">
              <div id="${prefix}-address-suggestions" style="position:absolute;z-index:10001;top:100%;left:0;width:100%;background:#fff;border:1px solid #ddd;border-radius:0 0 10px 10px;box-shadow:0 8px 20px rgba(0,0,0,.08);display:none;max-height:220px;overflow:auto;"></div>
              <div id="${prefix}-address-lookup-error" class="dp-error-message">Please include your address</div>
            </div>
          </div>
          
          <div id="${prefix}-manual-address" style="display:none;">
            <!-- Row 3: Address Line 1, Address Line 2 (optional) -->
            <div class="dp-grid dp-grid-2" style="margin-bottom:12px;">
              <div>
                <label class="dp-label" for="${prefix}-addr1">Address Line 1</label>
                <input class="dp-input" id="${prefix}-addr1">
                <div id="${prefix}-addr1-error" class="dp-error-message">Please enter your address</div>
              </div>
              <div>
                <label class="dp-label" for="${prefix}-addr2">Address Line 2 (optional)</label>
                <input class="dp-input" id="${prefix}-addr2">
              </div>
            </div>
            
            <!-- Row 4: City, State, Zip, Country -->
            <div class="dp-grid dp-grid-4" style="margin-bottom:12px;">
              <div>
                <label class="dp-label" for="${prefix}-city">City</label>
                <input class="dp-input" id="${prefix}-city">
                <div id="${prefix}-city-error" class="dp-error-message">Please enter your city</div>
              </div>
              <div>
                <label class="dp-label" for="${prefix}-state">State</label>
                <select class="dp-select" id="${prefix}-state"></select>
                <div id="${prefix}-state-error" class="dp-error-message">Please enter your state</div>
              </div>
              <div>
                <label class="dp-label" for="${prefix}-zip">Zip Code</label>
                <input class="dp-input" id="${prefix}-zip">
                <div id="${prefix}-zip-error" class="dp-error-message">Please enter your zip code</div>
              </div>
              <div>
                <label class="dp-label" for="${prefix}-country">Country</label>
                <select class="dp-select" id="${prefix}-country"></select>
                <div id="${prefix}-country-error" class="dp-error-message">Please enter your country</div>
              </div>
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

  function tributeHTML(prefix) {
    return `
      <div class="dp-step-content" id="${prefix}-step3">
        <div class="dp-card">
          <div class="dp-title">Tribute Information</div>
          
          <!-- Tribute Type Selection -->
          <div style="margin-bottom:20px;">
            <label class="dp-label">This donation is:</label>
            <div class="dp-row" style="justify-content:center;">
              <button type="button" class="dp-chip dp-tribute-chip selected" data-tribute-type="honor">In Honor</button>
              <button type="button" class="dp-chip dp-tribute-chip" data-tribute-type="memory">In Memory</button>
            </div>
            <input type="hidden" id="${prefix}-tribute-type" value="honor">
          </div>

          <!-- Tribute Person Information -->
          <div class="dp-grid dp-grid-2" style="margin-bottom:16px;">
            <div>
              <label class="dp-label" for="${prefix}-tribute-firstname">First Name</label>
              <input class="dp-input" id="${prefix}-tribute-firstname" required>
              <div id="${prefix}-tribute-firstname-error" class="dp-error-message">Please enter the person's first name</div>
            </div>
            <div>
              <label class="dp-label" for="${prefix}-tribute-lastname">Last Name</label>
              <input class="dp-input" id="${prefix}-tribute-lastname" required>
              <div id="${prefix}-tribute-lastname-error" class="dp-error-message">Please enter the person's last name</div>
            </div>
          </div>

          <!-- Optional Message -->
          <div style="margin-bottom:20px;">
            <label class="dp-label" for="${prefix}-tribute-message">Message (optional)</label>
            <textarea class="dp-input" id="${prefix}-tribute-message" rows="3" placeholder="Enter a message for this tribute..."></textarea>
          </div>

          <div class="dp-nav-buttons">
            <button type="button" class="dp-btn secondary" id="${prefix}-prev3">Previous</button>
            <button type="button" class="dp-btn" id="${prefix}-next3">Next</button>
          </div>
        </div>
      </div>
    `;
  }

  function reviewAndSubmitHTML(prefix) {
    return `
      <div class="dp-step-content" id="${prefix}-step-review">
        <div class="dp-card">
          <div class="dp-title">Review Your Donation</div>
          <div class="dp-summary">
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;gap:12px;">
                <div>Amount</div><div id="${prefix}-gift">$0.00</div>
              </div>
              <div style="display:flex;justify-content:space-between;gap:12px;margin-top:6px;">
                <div>Processing fees <span id="${prefix}-fee-label">(added)</span></div><div id="${prefix}-fee">$0.00</div>
              </div>
              <div id="${prefix}-tribute-summary" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid #eee;">
                <div style="font-weight:600;margin-bottom:6px;">Tribute Information:</div>
                <div id="${prefix}-tribute-display"></div>
              </div>
              <div style="font-size:12px;color:#555;margin-top:6px;" id="${prefix}-recur-note"></div>
            </div>
          </div>
          <button type="button" id="${prefix}-submit" class="dp-cta" disabled>Select an amount</button>
          <div style="text-align:center;font-size:14px;color:#666;margin:12px 0 6px 0;">After clicking donate, you will be taken to Stripe to enter your payment information.</div>
          <div class="dp-trust">Secure Payment powered by Stripe</div>
        </div>
      </div>
    `;
  }

  function headerHTML(prefix, embedded) {
    return `
      <div class="${embedded ? "dp-embedded" : ""}">
        <div class="dp-panel">
          <div class="dp-header">
            <button type="button" class="dp-btn-back" id="${prefix}-header-back" aria-label="Go back" style="display:none;">←</button>
            <img src="https://images.squarespace-cdn.com/content/v1/5af0bc3a96d45593d7d7e55b/c8c56eb8-9c50-4540-822a-5da3f5d0c268/refuge-logo-edit+%28circle+with+horizontal+RI+name%29+-+small.png" alt="Refuge International"/>
            ${embedded ? "" : `<button class="dp-close" id="${prefix}-close" aria-label="Close">&times;</button>`}
          </div>
          <div class="dp-body" id="${prefix}-body">
            <div class="dp-steps" id="${prefix}-step-indicators">
              <div class="dp-step active" id="${prefix}-step-indicator-1"></div>
              <div class="dp-step" id="${prefix}-step-indicator-2"></div>
              <div class="dp-step" id="${prefix}-step-indicator-3"></div>
              <div class="dp-step" id="${prefix}-step-indicator-4" style="display:none;"></div>
            </div>
            ${donationDetailsHTML(prefix)}
            ${personalAndAddressHTML(prefix)}
            ${tributeHTML(prefix)}
            ${reviewAndSubmitHTML(prefix)}
          </div>
        </div>
      </div>
    `;
  }

  function mountPopup() {
    var root = document.getElementById("donation-popup");
    if (!root) return;

    if (!document.getElementById("donation-popup-style")) {
      document.head.insertAdjacentHTML("beforeend", style);
    }

    root.innerHTML = `
      <div class="dp-modal" id="dp-modal">
        ${headerHTML("popup", false)}
      </div>
    `;

    var modal = document.getElementById("dp-modal");
    var closeBtn = document.getElementById("popup-close");
    function showModal() { modal.style.display = "flex"; }
    function hideModal() { modal.style.display = "none"; history.pushState("", document.title, window.location.pathname + window.location.search); }

    function checkHash() { if (window.location.hash === "#donate") showModal(); }
    checkHash();
    window.addEventListener("hashchange", checkHash);

    modal.addEventListener("click", function (e) {
      if (e.target === modal) hideModal();
    });
    if (closeBtn) closeBtn.addEventListener("click", hideModal);

    wireUp("popup");
  }

  function mountEmbedded() {
    var root = document.getElementById("donation-form-embedded");
    if (!root) return;

    if (!document.getElementById("donation-popup-style")) {
      document.head.insertAdjacentHTML("beforeend", style);
    }

    root.innerHTML = headerHTML("embedded", true);
    wireUp("embedded");
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

  function wireUp(prefix) {
    var currentStep = 1;
    var totalSteps = 3;
    var isTributeSelected = false;
    
    // Category configuration - easily adjustable mapping of frequency to categories
    var categoryConfig = {
      onetime: [
        "General Giving",
        "Cooking and Culture",
        "Corporate Sponsor",
        "Ministry Support Dinner",
        "TNND Payment", 
        "Volunteer Application",
        "Tribute",
        "Other (specify)"
      ],
      recurring: [
        "General Giving",
        "Corporate Sponsor",
        "Tribute",
        "Other (specify)"
      ]
    };
    
    function updateStepStructure() {
      var step4Indicator = document.getElementById(prefix + "-step-indicator-4");
      
      if (isTributeSelected) {
        totalSteps = 4;
        if (step4Indicator) step4Indicator.style.display = "block";
      } else {
        totalSteps = 3;
        if (step4Indicator) step4Indicator.style.display = "none";
      }
    }
    
    function showStep(step) {
      // Hide all steps first
      document.getElementById(prefix + "-step1").classList.remove("active");
      document.getElementById(prefix + "-step2").classList.remove("active");
      
      var tributeStep = document.getElementById(prefix + "-step3");
      var reviewStep = document.getElementById(prefix + "-step-review");
      
      if (tributeStep) tributeStep.classList.remove("active");
      if (reviewStep) reviewStep.classList.remove("active");
      
      // Update step indicators
      for (var i = 1; i <= 4; i++) {
        var indicatorEl = document.getElementById(prefix + "-step-indicator-" + i);
        if (indicatorEl) {
          indicatorEl.classList.remove("active", "completed");
          if (i < step) indicatorEl.classList.add("completed");
          else if (i === step) indicatorEl.classList.add("active");
        }
      }
      
      // Show the appropriate step content
      var targetStepEl;
      if (step === 1) {
        targetStepEl = document.getElementById(prefix + "-step1");
      } else if (step === 2) {
        targetStepEl = document.getElementById(prefix + "-step2");
      } else if (step === 3) {
        if (isTributeSelected) {
          // Step 3 is tribute information when tribute is selected
          targetStepEl = tributeStep;
        } else {
          // Step 3 is review when tribute is not selected
          targetStepEl = reviewStep;
        }
      } else if (step === 4 && isTributeSelected) {
        // Step 4 is review when tribute is selected
        targetStepEl = reviewStep;
      }
      
      if (targetStepEl) targetStepEl.classList.add("active");
      
      var headerBackBtn = document.getElementById(prefix + "-header-back");
      var actualTotalSteps = isTributeSelected ? 4 : 3;
      if (headerBackBtn) {
        if (step === actualTotalSteps) {
          headerBackBtn.style.display = "block";
        } else {
          headerBackBtn.style.display = "none";
        }
      }
      
      currentStep = step;
    }
    
    function validateStep(step) {
      switch(step) {
        case 1:
          var amountOk = customActive ? (parseFloat(customInput.value || "0") > 0) : (selectedAmount > 0);
          var category = document.getElementById(prefix + "-category").value;
          var otherOk = true;
          var categoryError = document.getElementById(prefix + "-category-error");
          var amountError = document.getElementById(prefix + "-amount-error");
          
          // Amount validation
          if (!amountOk && amountError) {
            amountError.style.display = "block";
          } else if (amountError) {
            amountError.style.display = "none";
          }
          
          // Category validation
          if (category === "Other (specify)") {
            var otherValue = document.getElementById(prefix + "-category-other").value.trim();
            otherOk = otherValue.length > 0;
            if (!otherOk && categoryError) {
              categoryError.style.display = "block";
            } else if (categoryError) {
              categoryError.style.display = "none";
            }
          } else if (categoryError) {
            categoryError.style.display = "none";
          }
          
          return amountOk && otherOk;
        case 2:
          var donationType = document.getElementById(prefix + "-donation-type").value;
          var email = document.getElementById(prefix + "-email").value.trim();
          var phone = document.getElementById(prefix + "-phone").value.trim();
          var manualWrap = document.getElementById(prefix + "-manual-address");
          var lookupInput = document.getElementById(prefix + "-address-lookup");
          var addr1 = document.getElementById(prefix + "-addr1");
          var city = document.getElementById(prefix + "-city");
          var stateSel = document.getElementById(prefix + "-state");
          var zip = document.getElementById(prefix + "-zip");
          var countrySel = document.getElementById(prefix + "-country");
          
          // Validate based on donation type
          var identityOk = false;
          if (donationType === "individual") {
            // Individual validation
            var fname = document.getElementById(prefix + "-firstname").value.trim();
            var lname = document.getElementById(prefix + "-lastname").value.trim();
            
            var fnameError = document.getElementById(prefix + "-firstname-error");
            var lnameError = document.getElementById(prefix + "-lastname-error");
            
            var fnameOk = fname.length > 0;
            var lnameOk = lname.length > 0;
            
            // Show/hide error messages for individual
            if (fnameError) fnameError.style.display = fnameOk ? "none" : "block";
            if (lnameError) lnameError.style.display = lnameOk ? "none" : "block";
            
            identityOk = fnameOk && lnameOk;
          } else {
            // Organization validation
            var orgName = document.getElementById(prefix + "-organization-name").value.trim();
            var orgNameError = document.getElementById(prefix + "-organization-name-error");
            
            var orgNameOk = orgName.length > 0;
            
            // Show/hide error messages for organization
            if (orgNameError) orgNameError.style.display = orgNameOk ? "none" : "block";
            
            identityOk = orgNameOk;
          }
          
          // Common field validation (email, phone)
          var emailError = document.getElementById(prefix + "-email-error");
          var phoneError = document.getElementById(prefix + "-phone-error");
          
          var emailOk = /.+@.+\..+/.test(email);
          var phoneOk = phone.length > 0;
          
          // Show/hide error messages for common fields
          if (emailError) emailError.style.display = emailOk ? "none" : "block";
          if (phoneError) phoneError.style.display = phoneOk ? "none" : "block";
          
          identityOk = identityOk && emailOk && phoneOk;
          
          // Address validation with error messages
          var hasManualAddressData = addr1.value.trim() || city.value.trim() || stateSel.value.trim() || zip.value.trim() || countrySel.value.trim();
          var isManualAddress = manualWrap.style.display !== "none" || hasManualAddressData;
          var addressOk = false;
          
          if (isManualAddress) {
            // Manual address validation
            var addr1Ok = addr1.value.trim().length > 0;
            var cityOk = city.value.trim().length > 0;
            var stateOk = stateSel.value.length > 0;
            var zipOk = zip.value.trim().length > 0;
            var countryOk = countrySel.value.length > 0;
            
            // Show/hide error messages for manual address
            var addr1Error = document.getElementById(prefix + "-addr1-error");
            var cityError = document.getElementById(prefix + "-city-error");
            var stateError = document.getElementById(prefix + "-state-error");
            var zipError = document.getElementById(prefix + "-zip-error");
            var countryError = document.getElementById(prefix + "-country-error");
            
            if (addr1Error) addr1Error.style.display = addr1Ok ? "none" : "block";
            if (cityError) cityError.style.display = cityOk ? "none" : "block";
            if (stateError) stateError.style.display = stateOk ? "none" : "block";
            if (zipError) zipError.style.display = zipOk ? "none" : "block";
            if (countryError) countryError.style.display = countryOk ? "none" : "block";
            
            addressOk = addr1Ok && cityOk && stateOk && zipOk && countryOk;
            
            // Hide lookup error if manual address is being used
            var lookupError = document.getElementById(prefix + "-address-lookup-error");
            if (lookupError) lookupError.style.display = "none";
          } else {
            // Address lookup validation
            var lookupOk = lookupInput.value.trim().length >= 5;
            var lookupError = document.getElementById(prefix + "-address-lookup-error");
            
            if (lookupError) lookupError.style.display = lookupOk ? "none" : "block";
            
            addressOk = lookupOk;
            
            // Hide manual address errors if lookup is being used
            var manualErrors = [
              document.getElementById(prefix + "-addr1-error"),
              document.getElementById(prefix + "-city-error"),
              document.getElementById(prefix + "-state-error"),
              document.getElementById(prefix + "-zip-error"),
              document.getElementById(prefix + "-country-error")
            ];
            
            manualErrors.forEach(function(errorEl) {
              if (errorEl) errorEl.style.display = "none";
            });
          }
          
          return identityOk && addressOk;
        case 3:
          // If tribute is not selected, this is the review step, so validation passes
          if (!isTributeSelected) return true;
          
          // Tribute validation
          var tributeFirstName = document.getElementById(prefix + "-tribute-firstname").value.trim();
          var tributeLastName = document.getElementById(prefix + "-tribute-lastname").value.trim();
          
          var tributeFirstNameError = document.getElementById(prefix + "-tribute-firstname-error");
          var tributeLastNameError = document.getElementById(prefix + "-tribute-lastname-error");
          
          var tributeFirstNameOk = tributeFirstName.length > 0;
          var tributeLastNameOk = tributeLastName.length > 0;
          
          if (tributeFirstNameError) tributeFirstNameError.style.display = tributeFirstNameOk ? "none" : "block";
          if (tributeLastNameError) tributeLastNameError.style.display = tributeLastNameOk ? "none" : "block";
          
          return tributeFirstNameOk && tributeLastNameOk;
        default:
          return true;
      }
    }
    
    function updateCategoryOptions(frequency) {
      var catSel = document.getElementById(prefix + "-category");
      if (!catSel) return;
      
      var currentValue = catSel.value;
      var categories = categoryConfig[frequency] || categoryConfig.onetime;
      
      // Clear existing options
      catSel.innerHTML = "";
      
      // Add new options based on frequency
      categories.forEach(function(category) {
        var option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        catSel.appendChild(option);
      });
      
      // Try to preserve the current selection if it exists in the new list
      var optionExists = categories.indexOf(currentValue) !== -1;
      if (optionExists) {
        catSel.value = currentValue;
      } else {
        // Default to first option if current selection doesn't exist
        catSel.value = categories[0] || "";
      }
      
      // Trigger change event to update "Other" field visibility
      var changeEvent = new Event('change');
      catSel.dispatchEvent(changeEvent);
    }
    
    function setupStepNavigation() {
      // Setup navigation for all possible steps (1-4)
      for (var i = 1; i <= 4; i++) {
        var nextBtn = document.getElementById(prefix + "-next" + i);
        var prevBtn = document.getElementById(prefix + "-prev" + i);
        
        if (nextBtn) {
          nextBtn.addEventListener("click", (function(step) {
            return function() {
              if (validateStep(step)) {
                var nextStep = step + 1;
                var maxSteps = isTributeSelected ? 4 : 3;
                
                if (nextStep <= maxSteps) {
                  showStep(nextStep);
                  updateTotals();
                }
              }
            };
          })(i));
        }
        
        if (prevBtn) {
          prevBtn.addEventListener("click", (function(step) {
            return function() {
              var prevStep = step - 1;
              
              if (prevStep >= 1) {
                showStep(prevStep);
              }
            };
          })(i));
        }
      }
    }
    
    populateSelect(prefix + "-state", states);
    populateSelect(prefix + "-country", countries);

    setupStepNavigation();
    
    // Initialize category options for default frequency (One-Time)
    updateCategoryOptions("onetime");
    
    var headerBackBtn = document.getElementById(prefix + "-header-back");
    if (headerBackBtn) {
      headerBackBtn.addEventListener("click", function() {
        if (currentStep > 1) {
          showStep(currentStep - 1);
        }
      });
    }

    var amountRow = document.getElementById(prefix + "-amount-row");
    var customWrap = document.getElementById(prefix + "-custom-wrap");
    var customInput = document.getElementById(prefix + "-custom");
    var totalPreview = document.getElementById(prefix + "-total-preview");
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
      
      // Clear amount error when user selects an amount
      var amountError = document.getElementById(prefix + "-amount-error");
      if (amountError) amountError.style.display = "none";
      
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

    // frequency handling with elegant stepper system
    var freqHidden = document.getElementById(prefix + "-frequency");
    var frequencyOptions = document.querySelector("#" + prefix + "-step1 .dp-frequency-options");
    var recurringStepper = document.getElementById(prefix + "-recurring-stepper");
    var freqDisplay = document.getElementById(prefix + "-freq-display");
    var freqMinus = document.getElementById(prefix + "-freq-minus");
    var freqPlus = document.getElementById(prefix + "-freq-plus");
    
    // Frequency options: Weekly → Bi-Weekly → Monthly → Yearly
    var recurringFreqs = [
      { value: "year", label: "Yearly" },
      { value: "month", label: "Monthly" },
      { value: "biweek", label: "Bi-Weekly" },
      { value: "week", label: "Weekly" }
    ];
    var currentFreqIndex = 1; // Default to Monthly (index 1)
    
    function updateStepperDisplay() {
      var current = recurringFreqs[currentFreqIndex];
      freqDisplay.textContent = current.label;
      freqHidden.value = current.value;
      
      // Update button states
      freqMinus.disabled = currentFreqIndex === 0; // Disable at Bi-Weekly
      freqPlus.disabled = currentFreqIndex === recurringFreqs.length - 1; // Disable at Yearly
      
      updateTotals();
    }
    
    // Handle frequency option selection (One-Time vs Recurring)
    frequencyOptions.addEventListener("click", function (e) {
      var t = e.target.closest(".dp-frequency-chip");
      if (!t) return;
      var freq = t.getAttribute("data-frequency");
      
      frequencyOptions.querySelectorAll(".dp-frequency-chip").forEach(function(chip) {
        chip.classList.remove("selected");
      });
      t.classList.add("selected");
      
      // Show/hide recurring stepper
      if (freq === "recurring") {
        recurringStepper.style.display = "block";
        currentFreqIndex = 1; // Reset to Monthly when switching to recurring
        updateStepperDisplay();
        updateCategoryOptions("recurring");
      } else {
        recurringStepper.style.display = "none";
        freqHidden.value = "onetime";
        updateCategoryOptions("onetime");
        updateTotals();
      }
    });
    
    // Handle stepper button clicks
    freqMinus.addEventListener("click", function() {
      if (currentFreqIndex > 0) {
        currentFreqIndex--;
        updateStepperDisplay();
      }
    });
    
    freqPlus.addEventListener("click", function() {
      if (currentFreqIndex < recurringFreqs.length - 1) {
        currentFreqIndex++;
        updateStepperDisplay();
      }
    });

    var freqSel = freqHidden; // Keep reference for compatibility
    // category + other
    var catSel = document.getElementById(prefix + "-category");
    var catOtherWrap = document.getElementById(prefix + "-category-other-wrap");
    var catOtherInput = document.getElementById(prefix + "-category-other");
    catSel.addEventListener("change", function () {
      var isOther = catSel.value.indexOf("Other") === 0 || catSel.value.indexOf("Other (specify)") === 0;
      var wasTributeSelected = isTributeSelected;
      isTributeSelected = catSel.value === "Tribute";
      
      catOtherWrap.style.display = isOther ? "" : "none";
      var categoryError = document.getElementById(prefix + "-category-error");
      if (categoryError) {
        categoryError.style.display = "none";
      }
      
      // Update step structure if tribute selection changed
      if (wasTributeSelected !== isTributeSelected) {
        updateStepStructure();
        // If we're currently past step 2 and tribute selection changed, 
        // navigate to the appropriate step
        if (currentStep > 2) {
          if (isTributeSelected) {
            // Tribute was just selected, go to tribute step (step 3)
            showStep(3);
          } else {
            // Tribute was deselected, go to review step (step 3 when no tribute)
            showStep(3);
          }
        }
      }
      
      updateTotals();
    });

    var coverFee = document.getElementById(prefix + "-cover-fee");
    var paymentMethodSection = document.getElementById(prefix + "-payment-method-section");
    
    coverFee.addEventListener("change", function() {
      if (coverFee.checked) {
        paymentMethodSection.style.display = "block";
      } else {
        paymentMethodSection.style.display = "none";
      }
      updateTotals();
    });

    var pmRow = document.getElementById(prefix + "-pm-row");
    var paymentMethod = "card";
    pmRow.addEventListener("click", function (e) {
      var t = e.target.closest(".dp-chip");
      if (!t) return;
      paymentMethod = t.getAttribute("data-method");
      selectChipGroup(pmRow, "data-method", paymentMethod);
      updateTotals();
    });
    // Set default selection to card
    selectChipGroup(pmRow, "data-method", "card");

    // Tribute option selection
    var tributeTypeHidden = document.getElementById(prefix + "-tribute-type");
    var tributeOptionsRow = document.querySelector("#" + prefix + "-step3 .dp-row");
    if (tributeOptionsRow) {
      tributeOptionsRow.addEventListener("click", function (e) {
        var t = e.target.closest(".dp-tribute-chip");
        if (!t) return;
        var tributeType = t.getAttribute("data-tribute-type");
        
        tributeOptionsRow.querySelectorAll(".dp-tribute-chip").forEach(function(chip) {
          chip.classList.remove("selected");
        });
        t.classList.add("selected");
        
        if (tributeTypeHidden) {
          tributeTypeHidden.value = tributeType;
        }
        
        updateTributeDisplay();
      });
    }

    // Donation type selection (Individual vs Organization)
    var donationTypeHidden = document.getElementById(prefix + "-donation-type");
    var donationTypeRow = document.querySelector("#" + prefix + "-step2 .dp-row");
    var individualFields = document.getElementById(prefix + "-individual-fields");
    var organizationFields = document.getElementById(prefix + "-organization-fields");
    
    if (donationTypeRow) {
      donationTypeRow.addEventListener("click", function (e) {
        var t = e.target.closest(".dp-donation-type-chip");
        if (!t) return;
        var donationType = t.getAttribute("data-donation-type");
        
        donationTypeRow.querySelectorAll(".dp-donation-type-chip").forEach(function(chip) {
          chip.classList.remove("selected");
        });
        t.classList.add("selected");
        
        if (donationTypeHidden) {
          donationTypeHidden.value = donationType;
        }
        
        // Show/hide appropriate fields
        if (donationType === "individual") {
          individualFields.style.display = "block";
          organizationFields.style.display = "none";
        } else {
          individualFields.style.display = "none";
          organizationFields.style.display = "block";
        }
        
        // Clear error messages when switching
        clearFieldErrors();
      });
    }

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

    function updateTributeDisplay() {
      var tributeSummary = document.getElementById(prefix + "-tribute-summary");
      var tributeDisplay = document.getElementById(prefix + "-tribute-display");
      
      if (!tributeSummary || !tributeDisplay) return;
      
      if (isTributeSelected) {
        var tributeType = document.getElementById(prefix + "-tribute-type").value;
        var tributeFirstName = document.getElementById(prefix + "-tribute-firstname").value.trim();
        var tributeLastName = document.getElementById(prefix + "-tribute-lastname").value.trim();
        var tributeMessage = document.getElementById(prefix + "-tribute-message").value.trim();
        
        if (tributeFirstName && tributeLastName) {
          var displayText = (tributeType === "honor" ? "In Honor of: " : "In Memory of: ") + 
                           tributeFirstName + " " + tributeLastName;
          if (tributeMessage) {
            displayText += "<br><em>\"" + tributeMessage + "\"</em>";
          }
          
          tributeDisplay.innerHTML = displayText;
          tributeSummary.style.display = "block";
        } else {
          tributeSummary.style.display = "none";
        }
      } else {
        tributeSummary.style.display = "none";
      }
    }

    function computeTotals() {
      var amt = customActive ? parseFloat(customInput.value || "0") : Number(selectedAmount || 0);
      var cover = coverFee.checked;
      
      // Always calculate fee for display purposes
      var fee = 0;
      if (paymentMethod === "ach") {
        fee = Math.min(amt * 0.008, 5.0);
      } else {
        // card & wallet: 2.2% + $0.30
        fee = amt * 0.022 + 0.30;
      }
      
      // Only add fee to total if covering fees
      var total = cover ? amt + fee : amt;
      
      return { amt: amt, fee: fee, total: total };
    }

    function validateRequired() {
      var donationType = document.getElementById(prefix + "-donation-type").value;
      var email = document.getElementById(prefix + "-email").value.trim();
      var phone = document.getElementById(prefix + "-phone").value.trim();
      var manualWrap = document.getElementById(prefix + "-manual-address");
      var lookupInput = document.getElementById(prefix + "-address-lookup");
      var addr1 = document.getElementById(prefix + "-addr1");
      var city = document.getElementById(prefix + "-city");
      var stateSel = document.getElementById(prefix + "-state");
      var zip = document.getElementById(prefix + "-zip");
      var countrySel = document.getElementById(prefix + "-country");
      
      // Check if any manual address fields have values
      var hasManualAddressData = addr1.value.trim() || city.value.trim() || stateSel.value.trim() || zip.value.trim() || countrySel.value.trim();
      
      var addressOk = false;
      if (manualWrap.style.display !== "none" || hasManualAddressData) {
        // Manual address mode - check if all required fields are filled
        addressOk = addr1.value.trim() && city.value.trim() && stateSel.value.trim() && zip.value.trim() && countrySel.value.trim();
      } else {
        // Address lookup mode - check if lookup has at least 5 characters
        addressOk = lookupInput.value.trim().length >= 5;
      }
      
      var amountOk = customActive ? (parseFloat(customInput.value || "0") > 0) : (selectedAmount > 0);
      var category = document.getElementById(prefix + "-category").value;
      var otherOk = true;
      if (category.indexOf("Other") === 0) {
        otherOk = (document.getElementById(prefix + "-category-other").value.trim().length > 0);
      }
      
      // Validate identity based on donation type
      var identityOk = false;
      if (donationType === "individual") {
        var fname = document.getElementById(prefix + "-firstname").value.trim();
        var lname = document.getElementById(prefix + "-lastname").value.trim();
        identityOk = fname && lname && /.+@.+\..+/.test(email) && phone;
      } else {
        var orgName = document.getElementById(prefix + "-organization-name").value.trim();
        identityOk = orgName && /.+@.+\..+/.test(email) && phone;
      }
      
      // Tribute validation
      var tributeOk = true;
      if (isTributeSelected) {
        var tributeFirstName = document.getElementById(prefix + "-tribute-firstname").value.trim();
        var tributeLastName = document.getElementById(prefix + "-tribute-lastname").value.trim();
        tributeOk = tributeFirstName.length > 0 && tributeLastName.length > 0;
      }

      return identityOk && addressOk && amountOk && otherOk && tributeOk;
    }

    function updateTotals() {
      var t = computeTotals();
      var currentAmount = customActive ? (parseFloat(customInput.value || "0")) : selectedAmount;
      
      var freq = freqSel.value;
      var freqMap = { onetime: "", week: " every week", biweek: " every two weeks", month: " every month", year: " every year" };
      var freqText = freqMap[freq] || "";
      
      // Update the total preview on step 1
      if (totalPreview) {
        totalPreview.textContent = format(t.total) + freqText;
      }
      
      // Update step 3 summary elements if they exist
      if (giftEl) giftEl.textContent = format(currentAmount);
      if (feeEl) feeEl.textContent = format(t.fee); // Always show the actual fee amount
      if (feeLabel) feeLabel.textContent = document.getElementById(prefix + "-cover-fee").checked ? "(added)" : "(covered by Refuge International)";
      
      // No need for custom interval logic since we're using fixed options now
      
      if (currentAmount > 0) {
        if (submitBtn) submitBtn.textContent = "Donate " + format(t.total) + freqText;
      } else {
        if (submitBtn) submitBtn.textContent = "Select an amount";
      }
      
      if (submitBtn) submitBtn.disabled = !validateRequired();

      // Update tribute display
      updateTributeDisplay();

      // Remove the separate recurring note since it's now in the button
      if (recurNote) recurNote.textContent = "";
    }

    function clearFieldErrors() {
      // Clear all error messages when users are actively fixing issues
      var errorIds = [
        prefix + "-amount-error",
        prefix + "-firstname-error",
        prefix + "-lastname-error", 
        prefix + "-organization-name-error",
        prefix + "-email-error",
        prefix + "-phone-error",
        prefix + "-address-lookup-error",
        prefix + "-addr1-error",
        prefix + "-city-error", 
        prefix + "-state-error",
        prefix + "-zip-error",
        prefix + "-country-error",
        prefix + "-tribute-firstname-error",
        prefix + "-tribute-lastname-error"
      ];
      
      errorIds.forEach(function(errorId) {
        var errorEl = document.getElementById(errorId);
        if (errorEl) {
          errorEl.style.display = "none";
        }
      });
    }
    
    // Category other reveal initial state
    catSel.dispatchEvent(new Event("change"));

    // Recalc handlers
    ["input","change"].forEach(function (ev) {
      document.getElementById(prefix + "-firstname").addEventListener(ev, function() {
        var fnameError = document.getElementById(prefix + "-firstname-error");
        if (fnameError) fnameError.style.display = "none";
        updateTotals();
      });
      document.getElementById(prefix + "-lastname").addEventListener(ev, function() {
        var lnameError = document.getElementById(prefix + "-lastname-error");
        if (lnameError) lnameError.style.display = "none";
        updateTotals();
      });
      // Organization name field event listener
      var orgNameInput = document.getElementById(prefix + "-organization-name");
      if (orgNameInput) {
        orgNameInput.addEventListener(ev, function() {
          var orgNameError = document.getElementById(prefix + "-organization-name-error");
          if (orgNameError) orgNameError.style.display = "none";
          updateTotals();
        });
      }
      document.getElementById(prefix + "-email").addEventListener(ev, function() {
        var emailError = document.getElementById(prefix + "-email-error");
        if (emailError) emailError.style.display = "none";
        updateTotals();
      });
      document.getElementById(prefix + "-phone").addEventListener(ev, function() {
        var phoneError = document.getElementById(prefix + "-phone-error");
        if (phoneError) phoneError.style.display = "none";
        updateTotals();
      });
      customInput.addEventListener(ev, function() {
        var amountError = document.getElementById(prefix + "-amount-error");
        if (amountError) amountError.style.display = "none";
        updateTotals();
      });
      freqSel.addEventListener(ev, updateTotals);
      catSel.addEventListener(ev, updateTotals);
      if (catOtherInput) {
        catOtherInput.addEventListener(ev, function() {
          var categoryError = document.getElementById(prefix + "-category-error");
          if (categoryError) {
            categoryError.style.display = "none";
          }
          updateTotals();
        });
      }
      coverFee.addEventListener(ev, updateTotals);
      addr1.addEventListener(ev, function() {
        var addr1Error = document.getElementById(prefix + "-addr1-error");
        if (addr1Error) addr1Error.style.display = "none";
        updateTotals();
      });
      addr2.addEventListener(ev, updateTotals);
      city.addEventListener(ev, function() {
        var cityError = document.getElementById(prefix + "-city-error");
        if (cityError) cityError.style.display = "none";
        updateTotals();
      });
      stateSel.addEventListener(ev, function() {
        var stateError = document.getElementById(prefix + "-state-error");
        if (stateError) stateError.style.display = "none";
        updateTotals();
      });
      zip.addEventListener(ev, function() {
        var zipError = document.getElementById(prefix + "-zip-error");
        if (zipError) zipError.style.display = "none";
        updateTotals();
      });
      countrySel.addEventListener(ev, function() {
        var countryError = document.getElementById(prefix + "-country-error");
        if (countryError) countryError.style.display = "none";
        updateTotals();
      });
      lookupInput.addEventListener(ev, function() {
        var lookupError = document.getElementById(prefix + "-address-lookup-error");
        if (lookupError) lookupError.style.display = "none";
        updateTotals();
      });
      
      // Tribute field event listeners
      var tributeFirstNameInput = document.getElementById(prefix + "-tribute-firstname");
      var tributeLastNameInput = document.getElementById(prefix + "-tribute-lastname");
      var tributeMessageInput = document.getElementById(prefix + "-tribute-message");
      
      if (tributeFirstNameInput) {
        tributeFirstNameInput.addEventListener(ev, function() {
          var tributeFirstNameError = document.getElementById(prefix + "-tribute-firstname-error");
          if (tributeFirstNameError) tributeFirstNameError.style.display = "none";
          updateTotals();
        });
      }
      
      if (tributeLastNameInput) {
        tributeLastNameInput.addEventListener(ev, function() {
          var tributeLastNameError = document.getElementById(prefix + "-tribute-lastname-error");
          if (tributeLastNameError) tributeLastNameError.style.display = "none";
          updateTotals();
        });
      }
      
      if (tributeMessageInput) {
        tributeMessageInput.addEventListener(ev, updateTotals);
      }
    });

    // Submit
    submitBtn.addEventListener("click", function () {
      if (!validateRequired()) return;

      var donationType = document.getElementById(prefix + "-donation-type").value;
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
        donationType: donationType,
        livemode: category.toLowerCase() === "test" ? false : true,
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
      
      // Add individual or organization specific fields
      if (donationType === "individual") {
        var first = document.getElementById(prefix + "-firstname").value.trim();
        var last = document.getElementById(prefix + "-lastname").value.trim();
        payload.firstname = first;
        payload.lastname = last;
      } else {
        var orgName = document.getElementById(prefix + "-organization-name").value.trim();
        payload.organizationName = orgName;
        // For organization donations, the backend might still expect name fields
        // Try using organization name as the first name and empty last name
        payload.firstname = orgName;
        payload.lastname = "";
      }
      
      // Add tribute information if applicable
      if (isTributeSelected) {
        var tributeType = document.getElementById(prefix + "-tribute-type").value;
        var tributeFirstName = document.getElementById(prefix + "-tribute-firstname").value.trim();
        var tributeLastName = document.getElementById(prefix + "-tribute-lastname").value.trim();
        var tributeMessage = document.getElementById(prefix + "-tribute-message").value.trim();
        
        payload.tribute = {
          type: tributeType,
          firstName: tributeFirstName,
          lastName: tributeLastName,
          message: tributeMessage
        };
      }

      // Store original button text and show transfer message
      var originalButtonText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Transferring to Stripe...";

      console.log("Sending donation payload:", JSON.stringify(payload, null, 2));
      
      fetch(processDonationAPI, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      .then(function (r) { 
        console.log("API Response status:", r.status);
        return r.json(); 
      })
      .then(function (session) {
        console.log("API Response data:", session);
        
        if (!session || !session.id) {
          throw new Error("Invalid session response: missing session ID. Response: " + JSON.stringify(session));
        }
        
        var key = payload.livemode ? "pk_live_fJSacHhPB2h0mJfsFowRm8lQ" : "pk_test_y47nraQZ5IFgnTMlwbDvfj8D";
        var stripe = window.Stripe ? window.Stripe(key) : null;
        if (!stripe) { console.error("Stripe.js not loaded"); return; }
        return stripe.redirectToCheckout({ sessionId: session.id });
      })
      .catch(function (err) {
        console.error("Checkout error:", err);
        // Restore original button state only on error
        submitBtn.textContent = originalButtonText;
        submitBtn.disabled = false;
      });
    });

    // Initial totals
    updateTotals();
  }

  window.openDonationModal = function () {
    var modal = document.getElementById("dp-modal");
    if (modal) modal.style.display = "flex";
  };
  window.closeDonationModal = function () {
    var modal = document.getElementById("dp-modal");
    if (modal) modal.style.display = "none";
  };

  document.addEventListener("DOMContentLoaded", function () {
    mountPopup();     // attaches to #donation-popup (if present)
    mountEmbedded();  // attaches to #donation-form-embedded (if present)
  });
})();
