const processDonationAPI = 'https://prod-08.westus.logic.azure.com:443/workflows/aa6dd00627e9488eb2d9e5af99110e26/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=lnc3194xuZhPQnVi6pDF_LuvDSG8BElOsVFllpS6UpE';

(function () {
  "use strict";

  var BRAND_PRIMARY = "#BD2135";
  var BRAND_SECONDARY = "#000000";
  var BRAND_TERTIARY = "#ffffff";

  // Default configuration for unified donation/event form
  var DEFAULT_CONFIG = {
    type: "donation", // "donation" or "event-registration"
    event: {
      eventName: null,
      eventDate: null,
      eventTime: null,
      eventLength: null,
      timezone: null,
      // Configuration for event registration pages
      pages: {
        personalInfo: true,        // First/Last name, Email, Phone
        address: true,             // Address information
        churchService: false,     // Church & Service information (optional)
        finalDetails: false,      // Keep informed, how heard, photo permission (optional)  
        payment: true             // Payment/review page
      },
      // Field configurations for optional pages
      fields: {
        church: false,
        currentlyServing: false,
        servingLocation: false,
        keepInformed: false,
        howHeard: false,
        photoPermission: false
      }
    },
    payment: {
      enabled: true, // For donations, always enabled. For events, configurable
      amount: null, // Fixed amount for events, null for donations
      currency: 'USD',
      description: null,
      feeHandling: 'userChoice', // 'userChoice', 'alwaysInclude', 'alwaysExclude'
      processingFee: {
        card: { rate: 0.022, fixed: 0.30 },
        amex: { rate: 0.035, fixed: 0.30 },
        ach: { rate: 0.008, fixed: 0, max: 5.00 },
        wallet: { rate: 0.022, fixed: 0.30 }
      },
      liveMode: true
    },
    amounts: [500, 100, 50, 25, 10], // Predefined amounts for donations
    categories: [
      "General Giving",
      "Cooking and Culture",
      "Corporate Sponsor", 
      "Ministry Support Dinner",
      "TNND Payment",
      "Volunteer Application",
      "Other"
    ]
  };

  // Deep merge utility function
  function deepMerge(target, source) {
    var output = Object.assign({}, target);
    Object.keys(source).forEach(function(key) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    });
    return output;
  }

  // Event formatting utilities
  function formatEventSummary(config) {
    const { eventName, eventDate, eventTime, eventLength, timezone } = config.event;
    
    if (!eventName || !eventDate || !eventTime || !eventLength) {
      return null;
    }

    try {
      // Parse the date and time
      const dateObj = new Date(eventDate + 'T' + eventTime);
      
      // Handle timezone if provided
      const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Format date
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric', 
        year: 'numeric',
        timeZone: tz
      });
      
      const dayOfMonth = dateObj.getDate();
      const ordinalSuffix = getOrdinalSuffix(dayOfMonth);
      const formattedDate = `${dateFormatter.format(dateObj).split(' ')[0]} ${dayOfMonth}${ordinalSuffix} ${dateObj.getFullYear()}`;
      
      // Calculate end time
      const endTime = new Date(dateObj.getTime() + (parseInt(eventLength) * 60000));
      
      // Format time range
      const startTimeStr = formatTime(dateObj);
      const endTimeStr = formatTime(endTime);
      
      // Check if it crosses to next day
      const dayDiff = endTime.getDate() - dateObj.getDate();
      const timeRange = dayDiff > 0 ? `${startTimeStr}–${endTimeStr} (+1 day)` : `${startTimeStr}–${endTimeStr}`;
      
      return {
        name: eventName,
        date: formattedDate,
        timeRange: timeRange
      };
    } catch (error) {
      console.error('Error formatting event summary:', error);
      return null;
    }
  }

  function getOrdinalSuffix(day) {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(/\s/, '').toLowerCase();
  }

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
    .dp-body { padding:0; max-width:700px; margin:0 auto; position:relative; overflow:visible; display:flex; flex-direction:column; }
    .dp-body > .dp-steps { margin-bottom:0; }
    .dp-body > .dp-step-content, .dp-body > div:not(.dp-steps) { padding:16px; }
    .dp-card { background:#fff; border-radius:18px; box-shadow: 0 6px 24px rgba(189,33,53,0.10), 0 1px 6px rgba(0,0,0,0.08); padding:24px; margin:16px; margin-bottom:16px; max-width:700px; margin-left:auto; margin-right:auto; overflow:visible; }
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
    .dp-fee-checkbox-container { 
      position:relative; 
      z-index:1; 
      display:flex; 
      justify-content:center; 
      align-items:center; 
    }
    
    /* Payment method grid layout for more elegant appearance */
    .dp-payment-grid { 
      display:grid; 
      grid-template-columns:repeat(3,1fr); 
      gap:12px; 
      justify-items:center; 
      margin-bottom:16px; 
    }
    
    .dp-payment-chip { 
      display:flex; 
      flex-direction:column; 
      align-items:center; 
      gap:6px; 
      padding:16px 20px; 
      min-width:140px; 
      max-width:160px; 
      min-height:120px;
      text-align:center; 
      border-radius:16px !important; 
      transition:.3s all ease; 
      justify-content:center;
    }
    .dp-payment-chip:hover { transform:translateY(-3px); box-shadow:0 8px 20px rgba(189,33,53,.2); }
    .dp-payment-chip img, .dp-payment-chip svg { margin-bottom:6px; }
    .dp-payment-chip span { font-weight:600; font-size:14px; }
    .dp-payment-chip small { font-size:11px; font-weight:500; opacity:0.8; margin-top:2px; }
    .dp-payment-chip.selected { transform:translateY(-3px); box-shadow:0 8px 20px rgba(189,33,53,.4); }
    
    /* Icon color inversion when payment method is selected */
    .dp-payment-chip.selected img { filter: invert(1); }
    .dp-payment-chip.selected svg .wallet-svg-main { fill: #fff; stroke: #fff; }
    .dp-payment-chip.selected svg .wallet-svg-circle { fill: var(--brand); }
    .dp-payment-chip.selected svg .wallet-svg-bar { fill: var(--brand); }
    
    /* Card type chips for sub-selection */
    .dp-card-type-chip {
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:4px;
      padding:12px 16px;
      min-width:100px;
      text-align:center;
      border-radius:12px !important;
      transition:.3s all ease;
    }
    .dp-card-type-chip:hover { transform:translateY(-2px); box-shadow:0 4px 12px rgba(189,33,53,.15); }
    .dp-card-type-chip span { font-weight:600; font-size:13px; }
    .dp-card-type-chip small { font-size:10px; font-weight:500; opacity:0.8; }
    .dp-card-type-chip.selected { transform:translateY(-2px); box-shadow:0 4px 12px rgba(189,33,53,.3); }
    /* Keep original logo colors when selected - only change wallet explainer text to white */
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

    .dp-steps { display:flex; justify-content:center; margin-bottom:20px; padding: 16px 0; position: relative; top: 0; z-index: 100; background: #ffffff; border-bottom: 2px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.1); order: -1; }
    .dp-embedded .dp-steps { position: sticky; top: 0; }
    .dp-step { display:flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:50%; background:#e5e7eb; color:#9ca3af; font-weight:700; margin:0 16px; position:relative; transition: all 0.3s ease; z-index: 1; border: 2px solid #d1d5db; }
    .dp-step.active { background:var(--brand); color:#fff; box-shadow: 0 0 0 4px rgba(189, 33, 53, 0.2); border-color: var(--brand); }
    .dp-step.completed { background:#22c55e; color:#fff; border-color: #22c55e; }
    .dp-step::after { content:''; position:absolute; top:50%; left:calc(100% + 8px); width:32px; height:4px; background:#d1d5db; transform:translateY(-50%); z-index:0; border-radius:2px; }
    .dp-step:last-child::after { display:none; }
    .dp-step.completed::after { background:#22c55e; }
    .dp-step.active::after { background:var(--brand); }
    
    .dp-step-content { display:none; }
    .dp-step-content.active { display:block; }
    .dp-nav-buttons { display:flex; justify-content:space-between; margin-top:20px; }
    .dp-btn { padding:12px 24px; border:2px solid var(--brand); background:var(--brand); color:#fff; border-radius:8px; cursor:pointer; font-weight:600; transition:.3s all ease; }
    .dp-btn.secondary { background:transparent; color:var(--brand); }
    .dp-btn:hover { opacity:0.9; transform:translateY(-1px); box-shadow:0 4px 12px rgba(189,33,53,.25); }
    .dp-btn:disabled { opacity:0.5; cursor:not-allowed; }
    .dp-btn-back { display:flex; align-items:center; justify-content:center; width:48px; height:48px; border:2px solid var(--brand); background:transparent; color:var(--brand); border-radius:50%; cursor:pointer; font-size:24px; font-weight:700; transition:.2s; margin-right:12px; flex-shrink:0; }
    /* Custom checkbox styling to match theme */
    .dp-checkbox-container { position:relative; display:inline-flex; align-items:center; gap:8px; cursor:pointer; margin-bottom:12px; }
    .dp-checkbox { appearance:none; width:20px; height:20px; border:2px solid #e0e0e0; border-radius:4px; background:#fff; cursor:pointer; transition:.2s; position:relative; }
    .dp-checkbox:checked { background:var(--brand); border-color:var(--brand); }
    .dp-checkbox:checked::after { content:'✓'; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:#fff; font-size:12px; font-weight:700; }
    .dp-checkbox:focus { outline:none; box-shadow:0 0 0 2px rgba(189,33,53,.25); }
    
    /* Radio group styling for event registration pages */
    .dp-radio-group { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
    .dp-radio-label { display:flex; align-items:center; padding:12px; border:1.5px solid #e0e0e0; border-radius:8px; cursor:pointer; transition:.2s; background:#fafbfc; }
    .dp-radio-label:hover { border-color:var(--brand); background:#fff; }
    .dp-radio-label input[type="radio"] { margin-right:12px; width:18px; height:18px; accent-color:var(--brand); }
    .dp-radio-label span { font-weight:500; color:#222; }
    .dp-radio-label input[type="radio"]:checked + span { color:var(--brand); font-weight:600; }
    
    /* Checkbox label styling for event registration */
    .dp-checkbox-label { font-weight:500; color:#222; cursor:pointer; }
    
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
      .dp-payment-grid { grid-template-columns:1fr; gap:8px; }
      .dp-payment-chip { min-width:100%; max-width:100%; min-height:100px; padding:12px 16px; }
      .dp-card-type-chip { min-width:80px; padding:8px 12px; }
      
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
      .dp-payment-grid { grid-template-columns:1fr; gap:6px; }
      .dp-payment-chip { min-width:100%; max-width:100%; min-height:90px; padding:8px 12px; }
      .dp-card-type-chip { min-width:70px; padding:6px 10px; }
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
  // Helper function to calculate total steps for event registration
  function getEventRegistrationSteps(config) {
    if (!config.event || !config.event.pages) {
      // Default event registration steps (simplified)
      var defaultSteps = ['details', 'personalInfo'];
      // Only include review step for paid events
      if (config.payment && config.payment.enabled !== false) {
        defaultSteps.push('review');
      }
      return defaultSteps;
    }
    
    var steps = ['details']; // Always start with event details
    
    // Add personal info step (which always includes address if address is enabled)
    if (config.event.pages.personalInfo) {
      steps.push('personalInfo');
    }
    
    // Add other pages as separate steps only if they're enabled
    if (config.event.pages.churchService) steps.push('churchService');
    if (config.event.pages.finalDetails) steps.push('finalDetails');
    
    // Add review step only for paid events (free events skip directly to completion)
    if (config.payment && config.payment.enabled !== false) {
      steps.push('review');
    }
    
    return steps;
  }

  // Helper function to generate step indicators HTML
  function generateStepIndicators(prefix, config, isEventRegistration) {
    var stepIndicatorsHTML = '';
    
    if (isEventRegistration) {
      var steps = getEventRegistrationSteps(config);
      var stepElements = [];
      
      for (var i = 0; i < steps.length; i++) {
        var stepNum = i + 1;
        var stepType = steps[i];
        var stepId = stepType === 'review' ? 'review' : stepNum.toString();
        var isActive = i === 0 ? 'active' : '';
        stepElements.push(`<div class="dp-step ${isActive}" id="${prefix}-step-indicator-${stepId}"></div>`);
      }
      
      stepIndicatorsHTML = `
        <div class="dp-steps" id="${prefix}-step-indicators">
          ${stepElements.join('')}
        </div>
      `;
    } else {
      // Full donation flow with tribute step
      stepIndicatorsHTML = `
        <div class="dp-steps" id="${prefix}-step-indicators">
          <div class="dp-step active" id="${prefix}-step-indicator-1"></div>
          <div class="dp-step" id="${prefix}-step-indicator-2"></div>
          <div class="dp-step" id="${prefix}-step-indicator-3"></div>
          <div class="dp-step" id="${prefix}-step-indicator-review"></div>
        </div>
      `;
    }
    
    return stepIndicatorsHTML;
  }

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

  function donationDetailsHTML(prefix, config) {
    config = config || DEFAULT_CONFIG;
    var isEventRegistration = config.type === 'event-registration';
    var isPaymentEnabled = config.payment && config.payment.enabled;
    
    // Event summary for event registration
    var eventSummaryHTML = '';
    if (isEventRegistration && config.event) {
      var eventSummary = formatEventSummary(config);
      if (eventSummary) {
        eventSummaryHTML = `
          <div style="margin-bottom:20px; padding:16px; background:#f0f9ff; border-radius:12px; border:2px solid #0ea5e9;">
            <h3 style="margin:0 0 8px 0; color:#0c4a6e; font-size:18px;">${eventSummary.name}</h3>
            <p style="margin:0; color:#075985; font-size:14px; font-weight:500;">
              📅 ${eventSummary.date}<br>
              🕒 ${eventSummary.timeRange}
            </p>
          </div>
        `;
      }
    }

    // Generate amount section based on form type
    var amountSectionHTML = '';
    
    if (isEventRegistration && !isPaymentEnabled) {
      // Free event - no amount section, just a note
      amountSectionHTML = `
        <div style="margin-bottom:16px; padding:16px; background:#f0f9ff; border-radius:12px; border:2px solid #22c55e;">
          <div style="text-align:center;">
            <div style="font-size:18px; font-weight:700; color:#15803d;">Free Event</div>
            <div style="font-size:14px; color:#166534; margin-top:4px;">No payment required</div>
          </div>
        </div>
      `;
    } else if (!isEventRegistration || (isEventRegistration && !config.payment.amount)) {
      // Standard donation amounts OR event without fixed amount
      const amounts = config.amounts || [500,100,50,25,10];
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

      amountSectionHTML = `
        <div style="margin-bottom:16px;">
          <label class="dp-label">Amount</label>
          <div id="${prefix}-amount-row">
            ${amountRowsHTML}
          </div>
          <div id="${prefix}-custom-wrap" style="display:none;margin-top:8px;">
            <input type="number" min="1" step="0.01" id="${prefix}-custom" class="dp-input" placeholder="Enter custom amount">
          </div>
          <div id="${prefix}-amount-error" class="dp-error-message">Please select or enter an amount</div>
        </div>
      `;
    } else if (isEventRegistration && config.payment.amount) {
      // Fixed event registration fee
      amountSectionHTML = `
        <div style="margin-bottom:16px;">
          <div class="dp-fixed-amount" style="padding:16px; background:#f8f9fa; border-radius:12px; text-align:center;">
            <div style="font-size:14px; color:#6b7280; margin-bottom:4px;">Registration Fee</div>
            <div style="font-size:24px; font-weight:bold; color:#111827;">$${config.payment.amount.toFixed(2)}</div>
            ${config.payment.description ? `<div style="font-size:14px; color:#6b7280; margin-top:4px;">${config.payment.description}</div>` : ''}
          </div>
          <input type="hidden" id="${prefix}-amount" value="${config.payment.amount}">
        </div>
      `;
    }

    // Frequency section - hide for events (always one-time)
    var frequencyHTML = '';
    if (!isEventRegistration) {
      frequencyHTML = `
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
      `;
    } else {
      // Hidden field for events (always one-time)
      frequencyHTML = `<input type="hidden" id="${prefix}-frequency" value="onetime">`;
    }

    // Category section
    var categoryHTML = '';
    if (!isEventRegistration) {
      const categoryOptions = (config.categories || DEFAULT_CONFIG.categories).map(cat => 
        `<option>${cat}</option>`
      ).join('');
      
      categoryHTML = `
        <div style="margin-bottom:16px;">
          <label class="dp-label" for="${prefix}-category">Category</label>
          <select id="${prefix}-category" class="dp-select">
            ${categoryOptions}
          </select>
          <div id="${prefix}-category-other-wrap" style="display:none;margin-top:8px;">
            <input type="text" id="${prefix}-category-other" class="dp-input" placeholder="Specify">
            <div id="${prefix}-category-error" class="dp-error-message">Please describe what this donation is for</div>
          </div>
        </div>
      `;
    } else {
      // Hidden field for events
      var eventCategory = config.event && config.event.eventName ? `${config.event.eventName} Registration` : 'Event Registration';
      categoryHTML = `<input type="hidden" id="${prefix}-category" value="${eventCategory}">`;
    }

    var title = isEventRegistration ? 'Registration Details' : 'Donation Details';

    return `
      <div class="dp-step-content active" id="${prefix}-step1">
        <div class="dp-card">
          <div class="dp-title">${title}</div>
          ${eventSummaryHTML}
          ${frequencyHTML}
          ${amountSectionHTML}
          ${categoryHTML}

          <!-- Total Display -->
          <div class="dp-fee-section" style="margin-bottom:20px;">
            <div class="dp-total-container" style="padding:16px; background:#f8f9fa; border-radius:12px; border:2px solid transparent; transition:all 0.3s ease;" id="${prefix}-total-container">
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

  // Church & Service Information page for event registration
  function churchServiceHTML(prefix, config) {
    if (!config.event || !config.event.pages || !config.event.pages.churchService) {
      return ''; // Skip if not configured
    }
    
    return `
      <div class="dp-step-content" id="${prefix}-step-church">
        <div class="dp-card">
          <div class="dp-title">Church & Service Information</div>
          
          <div style="margin-bottom:16px;">
            <label class="dp-label" for="${prefix}-church">Church Name</label>
            <input class="dp-input" id="${prefix}-church" type="text">
          </div>
          
          <div style="margin-bottom:16px;">
            <label class="dp-label required">Are you currently serving with Refuge?</label>
            <div class="dp-radio-group">
              <label class="dp-radio-label">
                <input type="radio" name="${prefix}-currently-serving" value="Yes" required>
                <span>Yes</span>
              </label>
              <label class="dp-radio-label">
                <input type="radio" name="${prefix}-currently-serving" value="No" required>
                <span>No</span>
              </label>
            </div>
            <div id="${prefix}-currently-serving-error" class="dp-error-message">Please select an option</div>
          </div>
          
          <div style="margin-bottom:16px; display:none;" id="${prefix}-serving-location-wrap">
            <label class="dp-label">Where are you serving?</label>
            <select class="dp-select" id="${prefix}-serving-location">
              <option value="">Select location...</option>
              <option value="Local Church">Local Church</option>
              <option value="International">International</option>
              <option value="Domestic">Domestic</option>
              <option value="Other">Other</option>
            </select>
            <div id="${prefix}-serving-location-error" class="dp-error-message">Please select your serving location</div>
          </div>
          
          <div class="dp-nav-buttons">
            <button type="button" class="dp-btn secondary" id="${prefix}-prev-church">Previous</button>
            <button type="button" class="dp-btn" id="${prefix}-next-church">Next</button>
          </div>
        </div>
      </div>
    `;
  }

  // Final Details page for event registration  
  function finalDetailsHTML(prefix, config) {
    if (!config.event || !config.event.pages || !config.event.pages.finalDetails) {
      return ''; // Skip if not configured
    }
    
    return `
      <div class="dp-step-content" id="${prefix}-step-final">
        <div class="dp-card">
          <div class="dp-title">Final Details</div>
          
          <div style="margin-bottom:16px;">
            <label class="dp-label required">Would you like us to keep you informed on upcoming events?</label>
            <div class="dp-radio-group">
              <label class="dp-radio-label">
                <input type="radio" name="${prefix}-keep-informed" value="Yes" required>
                <span>Yes</span>
              </label>
              <label class="dp-radio-label">
                <input type="radio" name="${prefix}-keep-informed" value="No" required>
                <span>No</span>
              </label>
            </div>
            <div id="${prefix}-keep-informed-error" class="dp-error-message">Please select an option</div>
          </div>
          
          <div style="margin-bottom:16px;">
            <label class="dp-label">How did you hear about this event?</label>
            <select class="dp-select" id="${prefix}-how-heard">
              <option value="">Select option...</option>
              <option value="Social Media">Social Media</option>
              <option value="Website">Website</option>
              <option value="Email">Email</option>
              <option value="Friend/Family">Friend/Family</option>
              <option value="Church">Church</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div style="margin-bottom:16px;">
            <label class="dp-label">Photo Permission</label>
            <div class="dp-checkbox-container">
              <input type="checkbox" id="${prefix}-photo-permission" class="dp-checkbox">
              <label for="${prefix}-photo-permission" class="dp-checkbox-label">
                I give permission for my photo to be taken and used for promotional purposes
              </label>
            </div>
          </div>
          
          <div class="dp-nav-buttons">
            <button type="button" class="dp-btn secondary" id="${prefix}-prev-final">Previous</button>
            <button type="button" class="dp-btn" id="${prefix}-next-final">Next</button>
          </div>
        </div>
      </div>
    `;
  }

  // Personal Information page for event registration
  function personalInfoHTML(prefix, config) {
    // Check if address should be included in this step
    var includeAddress = config.event && config.event.pages && config.event.pages.address;
    var isEventRegistration = config.type === 'event-registration';
    
    var addressFieldsHTML = '';
    if (includeAddress) {
      addressFieldsHTML = `
          <!-- Address Section -->
          <div style="margin-top:24px; padding-top:20px; border-top: 1px solid #E2E8F0;">
            <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1a202c;">Address</h3>
            
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
              <!-- Row 1: Address Line 1, Address Line 2 (optional) -->
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
              
              <!-- Row 2: City, State, Zip, Country -->
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
          </div>`;
    }
    
    // For event registration, hide Individual/Organization selection and show only individual fields
    var donationTypeSelectionHTML = '';
    if (!isEventRegistration) {
      donationTypeSelectionHTML = `
          <!-- Donation Type Selection -->
          <div style="margin-bottom:20px;">
            <div class="dp-row" style="justify-content:center;">
              <button type="button" class="dp-chip dp-donation-type-chip selected" data-donation-type="individual">Individual</button>
              <button type="button" class="dp-chip dp-donation-type-chip" data-donation-type="organization">Organization</button>
            </div>
            <input type="hidden" id="${prefix}-donation-type" value="individual">
          </div>`;
    } else {
      // For event registration, set donation type to individual by default (hidden)
      donationTypeSelectionHTML = `<input type="hidden" id="${prefix}-donation-type" value="individual">`;
    }
    
    return `
      <div class="dp-step-content" id="${prefix}-step-personal">
        <div class="dp-card dp-personal-info-card">
          <div class="dp-title">${includeAddress ? 'Your Information' : 'Personal Information'}</div>
          
          ${donationTypeSelectionHTML}
          
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
          
          ${addressFieldsHTML}
          
          <div class="dp-nav-buttons">
            <button type="button" class="dp-btn secondary" id="${prefix}-prev-personal">Previous</button>
            <button type="button" class="dp-btn primary" id="${prefix}-next-personal">Next</button>
          </div>
        </div>
      </div>
    `;
  }

  // Address Information page for event registration
  function addressHTML(prefix, config) {
    return `
      <div class="dp-step-content" id="${prefix}-step-address">
        <div class="dp-card">
          <div class="dp-title">Address Information</div>
          
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
            <!-- Row 1: Address Line 1, Address Line 2 (optional) -->
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
            
            <!-- Row 2: City, State, Zip, Country -->
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
            <button type="button" class="dp-btn secondary" id="${prefix}-prev-address">Previous</button>
            <button type="button" class="dp-btn primary" id="${prefix}-next-address">Next</button>
          </div>
        </div>
      </div>
    `;
  }

  // Legacy function for donation flow (combines personal and address for donations)
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

  function tributeHTML(prefix, config) {
    config = config || DEFAULT_CONFIG;
    var isEventRegistration = config.type === 'event-registration';
    
    // Event registrations typically don't have tribute options - skip this step
    if (isEventRegistration) {
      return `
        <div class="dp-step-content" id="${prefix}-step3" style="display:none;">
          <input type="hidden" id="${prefix}-tribute-type" value="">
        </div>
      `;
    }

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

  function reviewAndSubmitHTML(prefix, config) {
    config = config || DEFAULT_CONFIG;
    var isEventRegistration = config.type === 'event-registration';
    var feeHandling = config.payment && config.payment.feeHandling ? config.payment.feeHandling : 'userChoice';
    
    var title = isEventRegistration ? 'Review Your Registration' : 'Review Your Donation';
    var amountLabel = isEventRegistration ? 'Registration Fee' : 'Amount';
    
    // Fee handling section based on mode
    var feeHandlingHTML = '';
    if (feeHandling === 'userChoice') {
      // Standard fee choice UI
      feeHandlingHTML = `
        <div class="dp-fee-checkbox-container" style="margin-bottom:16px;">
          <label class="dp-checkbox-container">
            <input type="checkbox" id="${prefix}-cover-fee" class="dp-checkbox">
            <span style="font-weight:600;">I would like to cover the processing fees</span>
          </label>
        </div>
        
        <!-- Payment Method with Icons - Only shown when covering fees -->
        <div id="${prefix}-payment-method-section" style="display:none;">
          <label class="dp-label">Payment Method</label>
          <div class="dp-payment-grid" id="${prefix}-pm-row">
            <button type="button" class="dp-chip dp-payment-chip" data-method="card">
              <img src="https://js.stripe.com/v3/fingerprinted/img/card-ce24697297bd3c6a00fdd2fb6f760f0d.svg" alt="Card" width="32" height="32" />
              <span>Credit/Debit Card</span>
            </button>
            <button type="button" class="dp-chip dp-payment-chip" data-method="ach">
              <img src="https://js.stripe.com/v3/fingerprinted/img/bank-de5c9ead31505d57120e98291cb20e57.svg" alt="ACH/Bank Transfer" width="32" height="32" />
              <span>Bank Transfer</span>
              <small>0.8% (max $5)</small>
            </button>
            <button type="button" class="dp-chip dp-payment-chip" data-method="wallet">
              <svg width="32" height="32" viewBox="0 0 40 28" fill="none">
                <rect class="wallet-svg-main" x="2" y="4" width="36" height="20" rx="4" fill="#000"/>
                <rect class="wallet-svg-main" x="2" y="4" width="36" height="20" rx="4" stroke="#333" stroke-width="2"/>
                <circle class="wallet-svg-circle" cx="32" cy="14" r="4" fill="#fff"/>
                <rect class="wallet-svg-bar" x="6" y="10" width="18" height="4" rx="2" fill="#fff"/>
              </svg>
              <span>Digital Wallet</span>
              <div class="dp-wallet-explainer">PayPal, Apple Pay, Google Pay</div>
              <small>2.2% + $0.30</small>
            </button>
          </div>
          
          <!-- Card Type Selection - Only shown when card is selected -->
          <div id="${prefix}-card-type-section" style="margin-top:12px;display:none;">
            <label class="dp-label">Card Type</label>
            <div class="dp-row dp-card-types" id="${prefix}-card-type-row">
              <button type="button" class="dp-chip dp-card-type-chip" data-card-type="visa">
                <svg width="24" height="24" viewBox="0 0 24 16" fill="none">
                  <rect width="24" height="16" rx="2" fill="#1A1F71"/>
                  <text x="12" y="10" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="6" font-weight="bold">VISA</text>
                </svg>
                <span>Visa</span>
                <small>2.2% + $0.30</small>
              </button>
              <button type="button" class="dp-chip dp-card-type-chip" data-card-type="mastercard">
                <svg width="24" height="24" viewBox="0 0 24 16" fill="none">
                  <rect width="24" height="16" rx="2" fill="#EB001B"/>
                  <circle cx="9" cy="8" r="4" fill="#FF5F00" opacity="0.8"/>
                  <circle cx="15" cy="8" r="4" fill="#F79E1B" opacity="0.8"/>
                </svg>
                <span>Mastercard</span>
                <small>2.2% + $0.30</small>
              </button>
              <button type="button" class="dp-chip dp-card-type-chip" data-card-type="amex">
                <svg width="24" height="24" viewBox="0 0 24 16" fill="none">
                  <rect width="24" height="16" rx="2" fill="#006FCF"/>
                  <text x="12" y="10" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="5" font-weight="bold">AMEX</text>
                </svg>
                <span>American Express</span>
                <small>3.5% + $0.30</small>
              </button>
              <button type="button" class="dp-chip dp-card-type-chip" data-card-type="other">
                <svg width="24" height="24" viewBox="0 0 24 16" fill="none">
                  <rect width="24" height="16" rx="2" fill="#666" stroke="#999"/>
                  <text x="12" y="10" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="5" font-weight="bold">OTHER</text>
                </svg>
                <span>Other</span>
                <small>2.2% + $0.30</small>
              </button>
            </div>
          </div>
        </div>
      `;
    } else if (feeHandling === 'alwaysInclude') {
      // Fees always included - show info but no choice
      feeHandlingHTML = `
        <div style="padding:12px; background:#f0f9ff; border-radius:8px; margin-bottom:16px;">
          <div style="font-size:14px; color:#0c4a6e; font-weight:500;">
            📋 Processing fees are included in the total amount.
          </div>
        </div>
        <input type="hidden" id="${prefix}-cover-fee" value="true">
      `;
    } else if (feeHandling === 'alwaysExclude') {
      // Fees never included - show info but no choice
      feeHandlingHTML = `
        <div style="padding:12px; background:#f9fafb; border-radius:8px; margin-bottom:16px;">
          <div style="font-size:14px; color:#374151; font-weight:500;">
            💰 This is the exact amount you'll be charged.
          </div>
        </div>
        <input type="hidden" id="${prefix}-cover-fee" value="false">
      `;
    }

    return `
      <div class="dp-step-content" id="${prefix}-step-review">
        <div class="dp-card">
          <div class="dp-title">${title}</div>
          <div class="dp-summary">
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;gap:12px;">
                <div>${amountLabel}</div><div id="${prefix}-gift">$0.00</div>
              </div>
              <div style="display:flex;justify-content:space-between;gap:12px;margin-top:6px;">
                <div>Processing fees <span id="${prefix}-fee-label"></span></div><div id="${prefix}-fee">$0.00</div>
              </div>
              <div id="${prefix}-tribute-summary" style="display:${isEventRegistration ? 'none' : 'none'};margin-top:12px;padding-top:12px;border-top:1px solid #eee;">
                <div style="font-weight:600;margin-bottom:6px;">Tribute Information:</div>
                <div id="${prefix}-tribute-display"></div>
              </div>
              <div style="font-size:12px;color:#555;margin-top:6px;" id="${prefix}-recur-note"></div>
            </div>
          </div>
          
          <!-- Fee handling section -->
          <div class="dp-card" style="margin-bottom:16px;">
            ${feeHandlingHTML}
          </div>
          
          <button type="button" id="${prefix}-submit" class="dp-cta" ${isEventRegistration && config.payment && config.payment.enabled === false ? '' : 'disabled'}>${isEventRegistration && config.payment && config.payment.enabled === false ? 'Register for Free' : 'Select an amount'}</button>
          ${isEventRegistration && config.payment && config.payment.enabled === false ? 
            '<div style="text-align:center;font-size:14px;color:#666;margin:12px 0 6px 0;">Complete your free event registration.</div>' : 
            `<div style="text-align:center;font-size:14px;color:#666;margin:12px 0 6px 0;">After clicking ${isEventRegistration ? 'register' : 'donate'}, you will be taken to Stripe to enter your payment information.</div>`}
          ${isEventRegistration && config.payment && config.payment.enabled === false ? '' : '<div class="dp-trust">Secure Payment powered by Stripe</div>'}
        </div>
      </div>
    `;
  }

  function headerHTML(prefix, embedded, config) {
    config = config || DEFAULT_CONFIG;
    var isEventRegistration = config.type === 'event-registration';

    // Generate step HTML based on form type
    var stepHTML = '';
    if (isEventRegistration) {
      // For event registration, include steps based on configuration
      stepHTML = donationDetailsHTML(prefix, config); // Details step (always included)
      
      if (config.event && config.event.pages) {
        if (config.event.pages.personalInfo || config.event.pages.address) {
          stepHTML += personalInfoHTML(prefix, config);
        }
        // Note: addressHTML is no longer generated separately since it's combined with personalInfo
        if (config.event.pages.churchService) {
          stepHTML += churchServiceHTML(prefix, config);
        }
        if (config.event.pages.finalDetails) {
          stepHTML += finalDetailsHTML(prefix, config);
        }
      }
      
      stepHTML += tributeHTML(prefix, config); // Hidden for events
      stepHTML += reviewAndSubmitHTML(prefix, config); // Review/Payment step
    } else {
      // For donations, use traditional layout
      stepHTML = donationDetailsHTML(prefix, config) +
                  personalAndAddressHTML(prefix) +
                  churchServiceHTML(prefix, config) +
                  finalDetailsHTML(prefix, config) +
                  tributeHTML(prefix, config) +
                  reviewAndSubmitHTML(prefix, config);
    }

    return `
      <div class="${embedded ? "dp-embedded" : ""}">
        <div class="dp-panel">
          <div class="dp-header">
            <button type="button" class="dp-btn-back" id="${prefix}-header-back" aria-label="Go back" style="display:none;">←</button>
            <img src="https://images.squarespace-cdn.com/content/v1/5af0bc3a96d45593d7d7e55b/c8c56eb8-9c50-4540-822a-5da3f5d0c268/refuge-logo-edit+%28circle+with+horizontal+RI+name%29+-+small.png" alt="Refuge International"/>
            ${embedded ? "" : `<button class="dp-close" id="${prefix}-close" aria-label="Close">&times;</button>`}
          </div>
          <div class="dp-body" id="${prefix}-body">
            ${isEventRegistration ? generateStepIndicators(prefix, config, true) : ''}
            ${stepHTML}
          </div>
        </div>
      </div>
    `;
  }

  function mountPopup(config) {
    var root = document.getElementById("donation-popup");
    if (!root) return;

    // Merge with default config
    config = deepMerge(DEFAULT_CONFIG, config || {});
    
    // Store config for later use
    root._dpConfig = config;

    // Clear any existing content and cached references for clean initialization
    root.innerHTML = '';
    root._activeFormInstance = null;

    if (!document.getElementById("donation-popup-style")) {
      document.head.insertAdjacentHTML("beforeend", style);
    }

    root.innerHTML = `
      <div class="dp-modal" id="dp-modal">
        ${headerHTML("popup", false, config)}
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

    wireUp("popup", config);
  }

  function mountEmbedded(config) {
    var root = document.getElementById("donation-form-embedded");
    if (!root) return;

    // Merge with default config
    config = deepMerge(DEFAULT_CONFIG, config || {});
    
    // Store config for later use
    root._dpConfig = config;

    // Clean up any existing event listeners by removing all children
    // This ensures old form instances don't interfere
    while (root.firstChild) {
      root.removeChild(root.firstChild);
    }
    
    // Additional cleanup: Remove any orphaned event listeners by clearing container completely
    root.innerHTML = '';
    
    // Clear any cached DOM references that might cause conflicts
    root._activeFormInstance = null;

    if (!document.getElementById("donation-popup-style")) {
      document.head.insertAdjacentHTML("beforeend", style);
    }

    root.innerHTML = headerHTML("embedded", true, config);
    wireUp("embedded", config);
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

  function wireUp(prefix, config) {
    config = config || DEFAULT_CONFIG;
    var isEventRegistration = config.type === 'event-registration';
    var feeHandling = config.payment && config.payment.feeHandling ? config.payment.feeHandling : 'userChoice';
    
    // Create a unique form instance ID to prevent interference from old instances
    var formInstanceId = prefix + '-' + Date.now();
    var isActiveInstance = true;
    
    // Store the active instance ID on the container
    var container = document.getElementById(prefix === 'popup' ? 'donation-popup' : 'donation-form-embedded');
    if (container) {
      container._activeFormInstance = formInstanceId;
    }
    
    var currentStep = 1;
    
    // Calculate total steps based on form type and configuration
    var eventSteps = isEventRegistration ? getEventRegistrationSteps(config) : [];
    var totalSteps = isEventRegistration ? eventSteps.length : 4; // Default donation steps
    var isTributeSelected = false;
    
    // Step mapping for event registrations
    var stepMap = {};
    if (isEventRegistration) {
      for (var i = 0; i < eventSteps.length; i++) {
        stepMap[i + 1] = eventSteps[i];
      }
    }
    
    function handleEventCompletion() {
      // Collect form data for event registration
      var formData = collectEventFormData(prefix, config);
      
      // Submit to eventEndpoint for free events
      submitEventRegistration(formData, config, prefix);
    }
    
    function collectEventFormData(prefix, config) {
      var data = {
        eventLocation: config.event.eventLocation || '',
        startTime: config.event.eventTime || '',
        endTime: calculateEndTime(config.event.eventTime, config.event.eventLength) || '',
        eventDate: config.event.eventDate || '',
        event: config.event.eventName || '',
        otherEvent: '', // Only used if "Other" event is selected
        firstName: getFieldValue(prefix + '-firstname') || '',
        lastName: getFieldValue(prefix + '-lastname') || '',
        email: getFieldValue(prefix + '-email') || '',
        phone: getFieldValue(prefix + '-phone') || '',
        street: getFieldValue(prefix + '-addr1') || '',
        city: getFieldValue(prefix + '-city') || '',
        state: getFieldValue(prefix + '-state') || '',
        zipCode: getFieldValue(prefix + '-zip') || '',
        country: getFieldValue(prefix + '-country') || '',
        church: getFieldValue(prefix + '-church') || '',
        currentlyServing: getRadioValue(prefix + '-currently-serving') || '',
        keepInformed: getRadioValue(prefix + '-keep-informed') || '',
        howHeard: [getFieldValue(prefix + '-how-heard') || ''],
        photoPermission: getCheckboxValue(prefix + '-photo-permission') ? 'Yes' : 'No'
      };
      
      return data;
    }
    
    function getFieldValue(id) {
      var element = document.getElementById(id);
      return element ? element.value.trim() : '';
    }
    
    function getRadioValue(name) {
      var radio = document.querySelector('input[name="' + name + '"]:checked');
      return radio ? radio.value : '';
    }
    
    function getCheckboxValue(id) {
      var element = document.getElementById(id);
      return element ? element.checked : false;
    }
    
    function calculateEndTime(startTime, lengthMinutes) {
      if (!startTime || !lengthMinutes) return '';
      
      var startDate = new Date('2000-01-01T' + startTime + ':00');
      var endDate = new Date(startDate.getTime() + lengthMinutes * 60000);
      
      return endDate.toTimeString().substring(0, 5);
    }
    
    function submitEventRegistration(eventData, config, prefix) {
      // Show loading state
      var loadingHTML = `
        <div class="dp-step-content active" id="${prefix}-step-loading">
          <div class="dp-card">
            <div class="dp-title" style="text-align: center;">Submitting Registration...</div>
            <div style="text-align: center; padding: 40px;">
              <div style="font-size: 18px; margin-bottom: 16px;">
                Please wait while we process your registration.
              </div>
              <div style="font-size: 14px; color: #666;">
                This may take a few moments.
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Hide current step and show loading
      var currentStep = document.querySelector('.dp-step-content.active');
      if (currentStep) currentStep.classList.remove('active');
      
      var body = document.getElementById(prefix + '-body');
      if (body) {
        body.insertAdjacentHTML('beforeend', loadingHTML);
      }
      
      // Submit to eventEndpoint (configurable)
      var eventEndpoint = config.eventEndpoint || 'https://prod-54.westus.logic.azure.com:443/workflows/730ec843b9e044d79280e543f1c15282/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=RQWP0FWed4nx_f3ir2Yvj31pGUWPThB0xF6PdpNQdm0';
      
      fetch(eventEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ formData: eventData })
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Event registration failed: ' + response.status);
        }
        // Handle case where response is not JSON
        return response.text().then(function(text) {
          try {
            return JSON.parse(text);
          } catch (e) {
            // If response is not JSON, return a success object
            console.log('Non-JSON response received, treating as success');
            return { success: true, message: 'Registration completed' };
          }
        });
      })
      .then(function(result) {
        console.log('Event registration successful:', result);
        
        // Show success message
        showEventCompletionSuccess(prefix, config);
        
        // If event has payment, proceed to payment
        if (config.payment && config.payment.enabled !== false) {
          submitEventPayment(eventData, config, prefix);
        }
      })
      .catch(function(error) {
        console.error('Event registration error:', error);
        
        // In development/testing environment, simulate success for common errors
        var isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        var isNetworkError = error.message.includes('Failed to fetch') || error.message.includes('CORS') || error.message.includes('blocked');
        var isJsonError = error.message.includes('JSON') || error.message.includes('Unexpected end of JSON');
        
        if (isDevelopment && (isNetworkError || isJsonError)) {
          console.log('Development mode: simulating successful registration for', error.message);
          showEventCompletionSuccess(prefix, config);
        } else {
          showEventCompletionError(prefix, config, error);
        }
      });
    }
    
    function submitEventPayment(eventData, config, prefix) {
      // Create payment data in the required schema
      var paymentData = {
        donationType: 'Event Registration',
        livemode: (config.event && config.event.eventName && config.event.eventName.toLowerCase().includes("test")) ? false : (config.payment.liveMode !== false),
        email: eventData.email,
        phone: eventData.phone,
        address: {
          line1: eventData.street,
          line2: '',
          city: eventData.city,
          state: eventData.state,
          postal_code: eventData.zipCode,
          country: eventData.country
        },
        amount: selectedAmount || config.payment.amount || 0,
        coverFee: document.getElementById(prefix + '-cover-fee') ? document.getElementById(prefix + '-cover-fee').checked : false,
        paymentMethod: 'card', // Default to card
        frequency: 'onetime',
        category: config.event.eventName + ' Registration',
        organizationName: '', // For individual registrations
        firstname: eventData.firstName,
        lastname: eventData.lastName
      };
      
      var paymentEndpoint = config.paymentEndpoint || 'https://prod-08.westus.logic.azure.com:443/workflows/aa6dd00627e9488eb2d9e5af99110e26/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=lnc3194xuZhPQnVi6pDF_LuvDSG8BElOsVFllpS6UpE';
      
      return fetch(paymentEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Payment processing failed: ' + response.status);
        }
        return response.json();
      })
      .then(function(session) {
        console.log('Payment session created:', session);
        
        // Redirect to Stripe checkout
        if (session && session.id) {
          var key = paymentData.livemode ? "pk_live_fJSacHhPB2h0mJfsFowRm8lQ" : "pk_test_y47nraQZ5IFgnTMlwbDvfj8D";
          var stripe = window.Stripe ? window.Stripe(key) : null;
          if (stripe) {
            return stripe.redirectToCheckout({ sessionId: session.id });
          }
        }
        throw new Error('Invalid payment session response');
      });
    }
    
    function showEventCompletionSuccess(prefix, config) {
      var completionHTML = `
        <div class="dp-step-content active" id="${prefix}-step-completion">
          <div class="dp-card">
            <div class="dp-title" style="text-align: center; color: #22c55e;">Registration Complete!</div>
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 18px; margin-bottom: 16px;">
                Thank you for registering for <strong>${config.event.eventName}</strong>
              </div>
              <div style="font-size: 16px; color: #666; margin-bottom: 20px;">
                You will receive a confirmation email with event details shortly.
              </div>
              <button type="button" class="dp-btn" onclick="window.location.reload()">Register Another</button>
            </div>
          </div>
        </div>
      `;
      
      // Hide current step and show completion
      var currentStep = document.querySelector('.dp-step-content.active');
      if (currentStep) currentStep.classList.remove('active');
      
      var body = document.getElementById(prefix + '-body');
      if (body) {
        body.insertAdjacentHTML('beforeend', completionHTML);
      }
      
      // Keep step indicators visible for consistency
    }
    
    function showEventCompletionError(prefix, config, error) {
      var errorHTML = `
        <div class="dp-step-content active" id="${prefix}-step-error">
          <div class="dp-card">
            <div class="dp-title" style="text-align: center; color: #ef4444;">Registration Failed</div>
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 16px; margin-bottom: 16px; color: #666;">
                We encountered an error while processing your registration. Please try again.
              </div>
              <div style="font-size: 14px; color: #999; margin-bottom: 20px;">
                Error: ${error.message}
              </div>
              <button type="button" class="dp-btn" onclick="window.location.reload()">Try Again</button>
            </div>
          </div>
        </div>
      `;
      
      // Hide current step and show error
      var currentStep = document.querySelector('.dp-step-content.active');
      if (currentStep) currentStep.classList.remove('active');
      
      var body = document.getElementById(prefix + '-body');
      if (body) {
        body.insertAdjacentHTML('beforeend', errorHTML);
      }
    }
    
    function updateStepStructure() {
      if (isEventRegistration) {
        // Event registration steps are dynamically calculated
        totalSteps = eventSteps.length;
      } else {
        // For donations, structure depends on tribute selection
        if (isTributeSelected) {
          totalSteps = 4;
          var step3Indicator = document.getElementById(prefix + "-step-indicator-3");
          var step4Indicator = document.getElementById(prefix + "-step-indicator-4");
          
          if (step3Indicator) step3Indicator.style.display = "block";
          if (step4Indicator) step4Indicator.style.display = "block";
        } else {
          totalSteps = 3;
          var step3Indicator = document.getElementById(prefix + "-step-indicator-3");
          var step4Indicator = document.getElementById(prefix + "-step-indicator-4");
          
          if (step3Indicator) step3Indicator.style.display = "block";
          if (step4Indicator) step4Indicator.style.display = "none";
        }
      }
    }
    
    function getStepElementId(stepNumber) {
      if (isEventRegistration) {
        var stepType = stepMap[stepNumber];
        switch (stepType) {
          case 'details': return prefix + '-step1';
          case 'personalInfo': return prefix + '-step2';
          case 'address': return prefix + '-step-address';
          case 'churchService': return prefix + '-step-church';
          case 'finalDetails': return prefix + '-step-final';
          case 'review': return prefix + '-step-review';
          default: return prefix + '-step1';
        }
      } else {
        // Donation steps
        if (stepNumber === 1) return prefix + '-step1';
        if (stepNumber === 2) return prefix + '-step2';
        if (stepNumber === 3) return isTributeSelected ? prefix + '-step3' : prefix + '-step-review';
        if (stepNumber === 4) return prefix + '-step-review';
        return prefix + '-step1';
      }
    }
    
    // Category configuration - easily adjustable mapping of frequency to categories
    var categoryConfig = {
      onetime: config.categories || DEFAULT_CONFIG.categories,
      recurring: config.categories || DEFAULT_CONFIG.categories
    };
    
    function showStep(step) {
      if (isEventRegistration) {
        showEventStep(step);
      } else {
        showDonationStep(step);
      }
      currentStep = step;
    }
    
    function showDonationStep(step) {
      // Hide all steps first
      document.getElementById(prefix + "-step1").classList.remove("active");
      document.getElementById(prefix + "-step2").classList.remove("active");
      
      var tributeStep = document.getElementById(prefix + "-step3");
      var reviewStep = document.getElementById(prefix + "-step-review");
      
      if (tributeStep) tributeStep.classList.remove("active");
      if (reviewStep) reviewStep.classList.remove("active");
      
      // Update step indicators for donations
      var maxSteps = isTributeSelected ? 4 : 3;
      for (var i = 1; i <= 4; i++) {
        var indicatorSelector = i === 4 ? prefix + "-step-indicator-review" : prefix + "-step-indicator-" + i;
        var indicatorEl = document.getElementById(indicatorSelector);
        if (indicatorEl) {
          indicatorEl.classList.remove("active", "completed");
          if (i < step) indicatorEl.classList.add("completed");
          else if (i === step) indicatorEl.classList.add("active");
          
          // Hide step 4 indicator if tribute is not selected
          if (i === 4 && !isTributeSelected) {
            indicatorEl.style.display = "none";
          } else {
            indicatorEl.style.display = "block";
          }
        }
      }
      
      // Show the appropriate step content
      var targetStepEl;
      if (step === 1) {
        targetStepEl = document.getElementById(prefix + "-step1");
      } else if (step === 2) {
        targetStepEl = document.getElementById(prefix + "-step2");
      } else if (step === 3) {
        if (!isTributeSelected) {
          // No tribute, step 3 is review
          targetStepEl = reviewStep;
        } else {
          // Tribute selected, step 3 is tribute information
          targetStepEl = tributeStep;
        }
      } else if (step === 4 && isTributeSelected) {
        // Step 4 is review when tribute is selected
        targetStepEl = reviewStep;
      }
      
      if (targetStepEl) targetStepEl.classList.add("active");
      
      var headerBackBtn = document.getElementById(prefix + "-header-back");
      if (headerBackBtn) {
        if (step === maxSteps) {
          headerBackBtn.style.display = "block";
        } else {
          headerBackBtn.style.display = "none";
        }
      }
    }
    
    function showEventStep(step) {
      var steps = getEventRegistrationSteps(config);
      var totalSteps = steps.length;
      
      // Hide all possible step elements
      var allStepElements = [
        document.getElementById(prefix + "-step1"),
        document.getElementById(prefix + "-step-personal"),
        document.getElementById(prefix + "-step-address"),
        document.getElementById(prefix + "-step2"),
        document.getElementById(prefix + "-step3"),
        document.getElementById(prefix + "-step-church"),
        document.getElementById(prefix + "-step-final"),
        document.getElementById(prefix + "-step-review")
      ];
      
      allStepElements.forEach(function(el) {
        if (el) el.classList.remove("active");
      });
      
      // Update step indicators for event registration
      for (var i = 1; i <= totalSteps; i++) {
        var stepType = steps[i - 1];
        var stepId = stepType === 'review' ? 'review' : i.toString();
        var indicatorEl = document.getElementById(prefix + "-step-indicator-" + stepId);
        if (indicatorEl) {
          indicatorEl.classList.remove("active", "completed");
          if (i < step) indicatorEl.classList.add("completed");
          else if (i === step) indicatorEl.classList.add("active");
          indicatorEl.style.display = "block";
        }
      }
      
      // Hide unused indicators (beyond the actual step count)
      var maxPossibleSteps = 5; // Maximum possible steps
      var allPossibleIds = ['1', '2', '3', '4', '5', 'review'];
      
      for (var i = 0; i < allPossibleIds.length; i++) {
        var stepId = allPossibleIds[i];
        var indicatorEl = document.getElementById(prefix + "-step-indicator-" + stepId);
        if (indicatorEl) {
          // Check if this stepId is actually used in the current step configuration
          var stepIndex = -1;
          for (var j = 0; j < steps.length; j++) {
            var currentStepType = steps[j];
            var currentStepId = currentStepType === 'review' ? 'review' : (j + 1).toString();
            if (currentStepId === stepId) {
              stepIndex = j;
              break;
            }
          }
          
          if (stepIndex === -1) {
            // This stepId is not used in the current configuration, hide it
            indicatorEl.style.display = "none";
          }
        }
      }
      
      // Show the appropriate step content based on step mapping
      var stepType = steps[step - 1];
      var targetStepEl;
      
      switch (stepType) {
        case 'details':
          targetStepEl = document.getElementById(prefix + "-step1");
          break;
        case 'personalInfo':
          targetStepEl = document.getElementById(prefix + "-step-personal");
          break;
        case 'churchService':
          targetStepEl = document.getElementById(prefix + "-step-church");
          break;
        case 'finalDetails':
          targetStepEl = document.getElementById(prefix + "-step-final");
          break;
        case 'review':
          targetStepEl = document.getElementById(prefix + "-step-review");
          break;
        default:
          targetStepEl = document.getElementById(prefix + "-step1");
          break;
      }
      
      if (targetStepEl) targetStepEl.classList.add("active");
      
      var headerBackBtn = document.getElementById(prefix + "-header-back");
      if (headerBackBtn) {
        if (step === totalSteps) {
          headerBackBtn.style.display = "block";
        } else {
          headerBackBtn.style.display = "none";
        }
      }
    }
    
    function validateStep(step) {
      // For event registrations, validate based on actual step content, not step number
      if (isEventRegistration) {
        return validateEventStep(step);
      }
      
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
    
    function validateEventStep(step) {
      var steps = getEventRegistrationSteps(config);
      var stepName = steps[step - 1];
      
      switch(stepName) {
        case 'details':
          // Event details step - validate amount for events with configurable amounts
          if (config.payment && config.payment.enabled === false) {
            // Free events always pass details validation
            return true;
          }
          
          if (!config.payment || !config.payment.amount) {
            var amountOk = customActive ? (parseFloat(customInput.value || "0") > 0) : (selectedAmount > 0);
            var amountError = document.getElementById(prefix + "-amount-error");
            
            if (!amountOk && amountError) {
              amountError.style.display = "block";
            } else if (amountError) {
              amountError.style.display = "none";
            }
            
            return amountOk;
          }
          return true; // Fixed amount events always pass details validation
          
        case 'personalInfo':
          // Personal info validation (includes address if both are enabled)
          var email = document.getElementById(prefix + "-email").value.trim();
          var phone = document.getElementById(prefix + "-phone").value.trim();
          var fname = document.getElementById(prefix + "-firstname").value.trim();
          var lname = document.getElementById(prefix + "-lastname").value.trim();
          
          var emailError = document.getElementById(prefix + "-email-error");
          var phoneError = document.getElementById(prefix + "-phone-error");
          var fnameError = document.getElementById(prefix + "-firstname-error");
          var lnameError = document.getElementById(prefix + "-lastname-error");
          
          var emailOk = /.+@.+\..+/.test(email);
          var phoneOk = phone.length > 0;
          var fnameOk = fname.length > 0;
          var lnameOk = lname.length > 0;
          
          if (emailError) emailError.style.display = emailOk ? "none" : "block";
          if (phoneError) phoneError.style.display = phoneOk ? "none" : "block";
          if (fnameError) fnameError.style.display = fnameOk ? "none" : "block";
          if (lnameError) lnameError.style.display = lnameOk ? "none" : "block";
          
          var basicInfoOk = emailOk && phoneOk && fnameOk && lnameOk;
          
          // If address is enabled, validate address fields too
          var addressOk = true;
          if (config.event && config.event.pages && config.event.pages.address) {
            var manualWrap = document.getElementById(prefix + "-manual-address");
            var lookupInput = document.getElementById(prefix + "-address-lookup");
            var addr1 = document.getElementById(prefix + "-addr1");
            var city = document.getElementById(prefix + "-city");
            var stateSel = document.getElementById(prefix + "-state");
            var zip = document.getElementById(prefix + "-zip");
            var countrySel = document.getElementById(prefix + "-country");
            
            var hasManualAddressData = addr1 && (addr1.value.trim() || city.value.trim() || stateSel.value.trim() || zip.value.trim() || countrySel.value.trim());
            var isManualAddress = manualWrap && (manualWrap.style.display !== "none" || hasManualAddressData);
            
            if (isManualAddress) {
              var addr1Ok = addr1 && addr1.value.trim().length > 0;
              var cityOk = city && city.value.trim().length > 0;
              var stateOk = stateSel && stateSel.value.length > 0;
              var zipOk = zip && zip.value.trim().length > 0;
              var countryOk = countrySel && countrySel.value.length > 0;
              
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
            } else if (lookupInput) {
              var lookupOk = lookupInput.value.trim().length >= 5;
              var lookupError = document.getElementById(prefix + "-address-lookup-error");
              
              if (lookupError) lookupError.style.display = lookupOk ? "none" : "block";
              
              addressOk = lookupOk;
            }
          }
          
          return basicInfoOk && addressOk;
          
        case 'churchService':
          // Church service validation
          var currentlyServingRadios = document.querySelectorAll('input[name="' + prefix + '-currently-serving"]:checked');
          var currentlyServingOk = currentlyServingRadios.length > 0;
          var currentlyServingError = document.getElementById(prefix + "-currently-serving-error");
          
          if (currentlyServingError) {
            currentlyServingError.style.display = currentlyServingOk ? "none" : "block";
          }
          
          // If "Yes" is selected, validate serving location
          var servingLocationOk = true;
          if (currentlyServingOk && currentlyServingRadios[0].value === "Yes") {
            var servingLocationSelect = document.getElementById(prefix + "-serving-location");
            var servingLocationWrap = document.getElementById(prefix + "-serving-location-wrap");
            
            // Check if the serving location field is visible and required
            if (servingLocationWrap && servingLocationWrap.style.display !== "none" && servingLocationSelect) {
              servingLocationOk = servingLocationSelect.value.length > 0;
              var servingLocationError = document.getElementById(prefix + "-serving-location-error");
              if (servingLocationError) {
                servingLocationError.style.display = servingLocationOk ? "none" : "block";
              }
            }
          }
          
          return currentlyServingOk && servingLocationOk;
          
        case 'finalDetails':
          // Final details validation
          var keepInformedRadios = document.querySelectorAll('input[name="' + prefix + '-keep-informed"]:checked');
          var keepInformedOk = keepInformedRadios.length > 0;
          var keepInformedError = document.getElementById(prefix + "-keep-informed-error");
          
          if (keepInformedError) {
            keepInformedError.style.display = keepInformedOk ? "none" : "block";
          }
          
          return keepInformedOk;
          
        case 'review':
          // Review step - always valid (no required fields)
          return true;
          
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
      if (isEventRegistration) {
        setupEventNavigationHandlers();
      } else {
        setupDonationNavigationHandlers();
      }
    }
    
    function setupDonationNavigationHandlers() {
      // Setup navigation for donation steps (1-4)
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
    
    function setupEventNavigationHandlers() {
      var steps = getEventRegistrationSteps(config);
      var totalSteps = steps.length;
      
      // Setup standard numbered step navigation
      for (var i = 1; i <= totalSteps; i++) {
        var nextBtn = document.getElementById(prefix + "-next" + i);
        var prevBtn = document.getElementById(prefix + "-prev" + i);
        
        if (nextBtn) {
          nextBtn.addEventListener("click", (function(step) {
            return function() {
              if (validateStep(step)) {
                var nextStep = step + 1;
                if (nextStep <= totalSteps) {
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
      
      // Setup custom step navigation buttons (church, final)
      setupCustomEventNavigationButtons();
    }
    
    function setupCustomEventNavigationButtons() {
      // Personal info navigation
      var personalPrevBtn = document.getElementById(prefix + "-prev-personal");
      var personalNextBtn = document.getElementById(prefix + "-next-personal");
      
      if (personalPrevBtn) {
        personalPrevBtn.addEventListener("click", function() {
          var steps = getEventRegistrationSteps(config);
          var currentIndex = steps.indexOf('personalInfo');
          if (currentIndex > 0) {
            showStep(currentIndex); // Go to previous step (1-indexed, so currentIndex is the previous step)
          }
        });
      }
      
      if (personalNextBtn) {
        personalNextBtn.addEventListener("click", function() {
          var steps = getEventRegistrationSteps(config);
          var currentIndex = steps.indexOf('personalInfo') + 1; // Current step index (1-based)
          
          if (validateStep(currentIndex)) {
            var nextStep = currentIndex + 1;
            if (nextStep <= steps.length) {
              showStep(nextStep);
              updateTotals();
            }
          }
        });
      }
      
      // Church service navigation
      var churchPrevBtn = document.getElementById(prefix + "-prev-church");
      var churchNextBtn = document.getElementById(prefix + "-next-church");
      
      if (churchPrevBtn) {
        churchPrevBtn.addEventListener("click", function() {
          var steps = getEventRegistrationSteps(config);
          var currentStepIndex = steps.indexOf('churchService'); // 0-based index
          var currentStep = currentStepIndex + 1; // 1-based step number
          var prevStep = currentStep - 1;
          if (prevStep > 0) {
            showStep(prevStep);
          }
        });
      }
      
      if (churchNextBtn) {
        churchNextBtn.addEventListener("click", function() {
          var steps = getEventRegistrationSteps(config);
          var currentStepIndex = steps.indexOf('churchService'); // 0-based index
          var currentStep = currentStepIndex + 1; // 1-based step number
          
          if (validateEventStep(currentStep)) {
            var nextStep = currentStep + 1;
            if (nextStep <= steps.length) {
              showStep(nextStep);
              updateTotals();
            } else {
              // For free events, this might be the last step - show completion message or redirect
              handleEventCompletion();
            }
          }
        });
      }
      
      // Final details navigation
      var finalPrevBtn = document.getElementById(prefix + "-prev-final");
      var finalNextBtn = document.getElementById(prefix + "-next-final");
      
      if (finalPrevBtn) {
        finalPrevBtn.addEventListener("click", function() {
          var steps = getEventRegistrationSteps(config);
          var currentStepIndex = steps.indexOf('finalDetails'); // 0-based index
          var currentStep = currentStepIndex + 1; // 1-based step number
          var prevStep = currentStep - 1;
          if (prevStep > 0) {
            showStep(prevStep);
          }
        });
      }
      
      if (finalNextBtn) {
        finalNextBtn.addEventListener("click", function() {
          var steps = getEventRegistrationSteps(config);
          var currentStepIndex = steps.indexOf('finalDetails'); // 0-based index
          var currentStep = currentStepIndex + 1; // 1-based step number
          
          if (validateEventStep(currentStep)) {
            var nextStep = currentStep + 1;
            if (nextStep <= steps.length) {
              showStep(nextStep);
              updateTotals();
            } else {
              // For free events, this might be the last step - show completion message or redirect
              handleEventCompletion();
            }
          }
        });
      }
      
      // Setup radio button handlers for conditional fields
      setupEventConditionalFields();
    }
    
    function setupEventConditionalFields() {
      // Handle "currently serving" radio button changes
      var currentlyServingRadios = document.querySelectorAll('input[name="' + prefix + '-currently-serving"]');
      currentlyServingRadios.forEach(function(radio) {
        radio.addEventListener('change', function() {
          var servingLocationWrap = document.getElementById(prefix + "-serving-location-wrap");
          var servingLocationSelect = document.getElementById(prefix + "-serving-location");
          
          if (this.value === "Yes") {
            if (servingLocationWrap) servingLocationWrap.style.display = "block";
            if (servingLocationSelect) servingLocationSelect.required = true;
          } else {
            if (servingLocationWrap) servingLocationWrap.style.display = "none";
            if (servingLocationSelect) {
              servingLocationSelect.required = false;
              servingLocationSelect.value = "";
            }
          }
        });
      });
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

    // For event registrations with fixed amounts, set the selectedAmount from config
    if (isEventRegistration && config.payment && config.payment.amount) {
      selectedAmount = config.payment.amount;
    }

    function selectChipGroup(row, valueAttr, value) {
      if (!row) return; // Handle null row
      var btns = row.querySelectorAll(".dp-chip");
      btns.forEach(function (b) { b.classList.remove("selected"); });
      var target = Array.prototype.find.call(btns, function (b) { return b.getAttribute(valueAttr) === value; });
      if (target) target.classList.add("selected");
    }

    // Only add amount row event listener if amountRow exists (not for fixed event fees)
    if (amountRow) {
      amountRow.addEventListener("click", function (e) {
        var t = e.target.closest(".dp-chip");
        if (!t) return;
        var v = t.getAttribute("data-value");
        
        // Clear amount error when user selects an amount
        var amountError = document.getElementById(prefix + "-amount-error");
        if (amountError) amountError.style.display = "none";
        
        if (v === "custom") {
          customActive = true;
          if (customWrap) customWrap.style.display = "";
          selectChipGroup(amountRow, "data-value", "custom");
          if (customInput) customInput.focus();
        } else {
          customActive = false;
          if (customWrap) customWrap.style.display = "none";
          selectedAmount = Number(v);
          selectChipGroup(amountRow, "data-value", v);
        }
        updateTotals();
      });
    }

    // Only add custom input event listener if customInput exists
    if (customInput) {
      customInput.addEventListener("input", updateTotals);
    }

    // frequency handling with elegant stepper system (only for donations)
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
      if (freqDisplay && freqHidden) {
        var current = recurringFreqs[currentFreqIndex];
        freqDisplay.textContent = current.label;
        freqHidden.value = current.value;
        
        // Update button states
        if (freqMinus) freqMinus.disabled = currentFreqIndex === 0;
        if (freqPlus) freqPlus.disabled = currentFreqIndex === recurringFreqs.length - 1;
        
        updateTotals();
      }
    }
    
    // Handle frequency option selection (One-Time vs Recurring) - only if elements exist
    if (frequencyOptions) {
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
          if (recurringStepper) recurringStepper.style.display = "block";
          currentFreqIndex = 1; // Reset to Monthly when switching to recurring
          updateStepperDisplay();
          updateCategoryOptions("recurring");
        } else {
          if (recurringStepper) recurringStepper.style.display = "none";
          if (freqHidden) freqHidden.value = "onetime";
          updateCategoryOptions("onetime");
          updateTotals();
        }
      });
      
      // Handle stepper button clicks
      if (freqMinus) {
        freqMinus.addEventListener("click", function() {
          if (currentFreqIndex > 0) {
            currentFreqIndex--;
            updateStepperDisplay();
          }
        });
      }
      
      if (freqPlus) {
        freqPlus.addEventListener("click", function() {
          if (currentFreqIndex < recurringFreqs.length - 1) {
            currentFreqIndex++;
            updateStepperDisplay();
          }
        });
      }
    }

    var freqSel = freqHidden; // Keep reference for compatibility
    // category + other
    var catSel = document.getElementById(prefix + "-category");
    var catOtherWrap = document.getElementById(prefix + "-category-other-wrap");
    var catOtherInput = document.getElementById(prefix + "-category-other");
    
    // Only add category change listener if category select exists (donations only)
    if (catSel) {
      catSel.addEventListener("change", function () {
        var isOther = catSel.value.indexOf("Other") === 0 || catSel.value.indexOf("Other (specify)") === 0;
        var wasTributeSelected = isTributeSelected;
        isTributeSelected = catSel.value === "Tribute";
        
        if (catOtherWrap) {
          catOtherWrap.style.display = isOther ? "" : "none";
        }
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
    }

    var coverFee = document.getElementById(prefix + "-cover-fee");
    var paymentMethodSection = document.getElementById(prefix + "-payment-method-section");
    
    if (coverFee) {
      coverFee.addEventListener("change", function() {
        if (coverFee.checked) {
          paymentMethodSection.style.display = "block";
        } else {
          paymentMethodSection.style.display = "none";
        }
        updateTotals();
      });
    }

    var pmRow = document.getElementById(prefix + "-pm-row");
    if (pmRow) {
      pmRow.addEventListener("click", function (e) {
        var t = e.target.closest(".dp-chip");
        if (!t) return;
        paymentMethod = t.getAttribute("data-method");
        selectChipGroup(pmRow, "data-method", paymentMethod);
        
        // Show/hide card type selection based on payment method
        var cardTypeSection = document.getElementById(prefix + "-card-type-section");
      if (paymentMethod === "card") {
        cardTypeSection.style.display = "block";
        // Reset to default card type if not already selected
        if (!cardType) {
          cardType = "visa";
          var cardTypeRow = document.getElementById(prefix + "-card-type-row");
          selectChipGroup(cardTypeRow, "data-card-type", cardType);
        }
      } else {
        cardTypeSection.style.display = "none";
        cardType = null;
      }
      
      updateTotals();
      
      // Improve UX: Highlight the Next button and total container after payment method selection
      var nextBtn = document.getElementById(prefix + "-next1");
      var totalContainer = document.getElementById(prefix + "-total-container");
      
      if (nextBtn) {
        // Add a subtle animation to draw attention to the Next button
        nextBtn.style.transform = "scale(1.05)";
        nextBtn.style.boxShadow = "0 4px 20px rgba(189,33,53,.4)";
        setTimeout(function() {
          nextBtn.style.transform = "scale(1)";
          nextBtn.style.boxShadow = "";
        }, 1500);
        
        // Smooth scroll to ensure the Next button is visible
        nextBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      
      if (totalContainer) {
        // Highlight the total container to show where to proceed
        totalContainer.style.borderColor = "var(--brand)";
        totalContainer.style.backgroundColor = "#fff";
        setTimeout(function() {
          totalContainer.style.borderColor = "transparent";
          totalContainer.style.backgroundColor = "#f8f9fa";
        }, 2000);
      }
    });
    }
    
    var paymentMethod = "card";
    var cardType = "visa"; // Default card type
    
    // Card type selection
    var cardTypeRow = document.getElementById(prefix + "-card-type-row");
    if (cardTypeRow) {
      cardTypeRow.addEventListener("click", function (e) {
        var t = e.target.closest(".dp-chip");
        if (!t) return;
        cardType = t.getAttribute("data-card-type");
        selectChipGroup(cardTypeRow, "data-card-type", cardType);
        updateTotals();
      });
    }
    
    // Set default selections
    selectChipGroup(pmRow, "data-method", "card");
    if (cardTypeRow) {
      selectChipGroup(cardTypeRow, "data-card-type", "visa");
      // Show card type section by default since card is selected
      var cardTypeSection = document.getElementById(prefix + "-card-type-section");
      cardTypeSection.style.display = "block";
    }

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
    if (lookupInput) {
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
    } // Close lookupInput null check

    if (lookupRow && suggestions) {
      document.addEventListener("click", function (e) {
        if (!lookupRow.contains(e.target)) suggestions.style.display = "none";
      });
    }

    if (enterManual) {
      enterManual.addEventListener("click", function () {
        manualWrap.style.display = "";
        lookupRow.style.display = "none";
      });
    }

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
      // Check if this is still the active form instance
      var container = document.getElementById(prefix === 'popup' ? 'donation-popup' : 'donation-form-embedded');
      if (!container || container._activeFormInstance !== formInstanceId) {
        return { amt: 0, fee: 0, total: 0 };
      }
      
      // Get amount - either from custom input, selected amount, or fixed event amount
      var amt = 0;
      if (isEventRegistration && config.payment && config.payment.amount) {
        // Fixed event registration fee
        amt = config.payment.amount;
      } else {
        // Variable donation amount or event without fixed fee
        amt = customActive ? parseFloat(customInput.value || "0") : Number(selectedAmount || 0);
      }
      
      // Determine if fees should be covered based on fee handling mode
      var cover = false;
      switch(feeHandling) {
        case 'alwaysInclude':
          cover = true;
          break;
        case 'alwaysExclude':
          cover = false;
          break;
        case 'userChoice':
        default:
          cover = coverFee && coverFee.checked;
          break;
      }
      
      // Calculate fee using configuration
      var fee = 0;
      
      // No fees for free events, when payment is disabled, or when amount is 0
      if ((isEventRegistration && config.payment && config.payment.enabled === false) || amt <= 0) {
        fee = 0;
      } else {
        var feeConfig = config.payment && config.payment.processingFee ? config.payment.processingFee : DEFAULT_CONFIG.payment.processingFee;
        
        if (paymentMethod === "ach") {
          var achConfig = feeConfig.ach || { rate: 0.008, fixed: 0, max: 5.00 };
          fee = Math.min(amt * achConfig.rate + (achConfig.fixed || 0), achConfig.max || 5.00);
        } else if (paymentMethod === "card") {
          // Different rates based on card type
          if (cardType === "amex") {
            var amexConfig = feeConfig.amex || { rate: 0.035, fixed: 0.30 };
            fee = amt * amexConfig.rate + amexConfig.fixed;
          } else {
            var cardConfig = feeConfig.card || { rate: 0.022, fixed: 0.30 };
            fee = amt * cardConfig.rate + cardConfig.fixed;
          }
        } else {
          // wallet: PayPal, Apple Pay, Google Pay
          var walletConfig = feeConfig.wallet || { rate: 0.022, fixed: 0.30 };
          fee = amt * walletConfig.rate + walletConfig.fixed;
        }
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
      // Check if this is still the active form instance
      var container = document.getElementById(prefix === 'popup' ? 'donation-popup' : 'donation-form-embedded');
      if (!container || container._activeFormInstance !== formInstanceId) {
        return;
      }
      
      var t = computeTotals();
      var currentAmount = customActive ? (parseFloat(customInput.value || "0")) : selectedAmount;
      
      var freq = freqSel ? freqSel.value : 'onetime';
      var freqMap = { onetime: "", week: " every week", biweek: " every two weeks", month: " every month", year: " every year" };
      var freqText = freqMap[freq] || "";
      
      // Update the total preview on step 1
      if (totalPreview) {
        if (isEventRegistration) {
          // For event registration, hide total on first page - only show at payment time
          if (currentStep === 1) {
            totalPreview.parentNode.style.display = 'none';
          } else {
            totalPreview.parentNode.style.display = 'block';
            totalPreview.textContent = format(t.total) + freqText;
          }
        } else {
          // For donations, always show total
          totalPreview.parentNode.style.display = 'block';
          totalPreview.textContent = format(t.total) + freqText;
        }
      }
      
      // Update step 3 summary elements if they exist
      if (giftEl) giftEl.textContent = format(currentAmount);
      if (feeEl) feeEl.textContent = format(t.fee); // Always show the actual fee amount
      if (feeLabel) {
        // Fee label logic based on fee handling mode
        if (feeHandling === 'alwaysInclude') {
          // Fees always included - never show "covered by" text
          feeLabel.textContent = "";
        } else if (feeHandling === 'alwaysExclude') {
          // Fees always excluded - always show "covered by" text
          feeLabel.textContent = "(covered by Refuge International)";
        } else {
          // User choice - show "covered by" only when user doesn't check the box
          feeLabel.textContent = document.getElementById(prefix + "-cover-fee").checked ? "" : "(covered by Refuge International)";
        }
      }
      
      // No need for custom interval logic since we're using fixed options now
      
      if (currentAmount > 0) {
        if (submitBtn) submitBtn.textContent = "Donate " + format(t.total) + freqText;
      } else {
        // Check if this is a free event registration
        if (isEventRegistration && config.payment && config.payment.enabled === false) {
          if (submitBtn) submitBtn.textContent = "Register for Free";
        } else {
          if (submitBtn) submitBtn.textContent = "Select an amount";
        }
      }
      
      // Enable submit button for free events, or validate required fields for paid events/donations
      if (isEventRegistration && config.payment && config.payment.enabled === false) {
        if (submitBtn) submitBtn.disabled = false; // Free events are always enabled
      } else {
        if (submitBtn) submitBtn.disabled = !validateRequired();
      }

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
      var firstnameEl = document.getElementById(prefix + "-firstname");
      if (firstnameEl) {
        firstnameEl.addEventListener(ev, function() {
          var fnameError = document.getElementById(prefix + "-firstname-error");
          if (fnameError) fnameError.style.display = "none";
          updateTotals();
        });
      }
      var lastnameEl = document.getElementById(prefix + "-lastname");
      if (lastnameEl) {
        lastnameEl.addEventListener(ev, function() {
          var lnameError = document.getElementById(prefix + "-lastname-error");
          if (lnameError) lnameError.style.display = "none";
          updateTotals();
        });
      }
      // Organization name field event listener
      var orgNameInput = document.getElementById(prefix + "-organization-name");
      if (orgNameInput) {
        orgNameInput.addEventListener(ev, function() {
          var orgNameError = document.getElementById(prefix + "-organization-name-error");
          if (orgNameError) orgNameError.style.display = "none";
          updateTotals();
        });
      }
      var emailEl = document.getElementById(prefix + "-email");
      if (emailEl) {
        emailEl.addEventListener(ev, function() {
          var emailError = document.getElementById(prefix + "-email-error");
          if (emailError) emailError.style.display = "none";
          updateTotals();
        });
      }
      var phoneEl = document.getElementById(prefix + "-phone");
      if (phoneEl) {
        phoneEl.addEventListener(ev, function() {
          var phoneError = document.getElementById(prefix + "-phone-error");
          if (phoneError) phoneError.style.display = "none";
          updateTotals();
        });
      }
      
      // Only add custom input listener if customInput exists (not for fixed event fees)
      if (customInput) {
        customInput.addEventListener(ev, function() {
          var amountError = document.getElementById(prefix + "-amount-error");
          if (amountError) amountError.style.display = "none";
          updateTotals();
        });
      }
      
      // Only add frequency and category listeners if they exist (donations only)
      if (freqSel) freqSel.addEventListener(ev, updateTotals);
      if (catSel) catSel.addEventListener(ev, updateTotals);
      if (catOtherInput) {
        catOtherInput.addEventListener(ev, function() {
          var categoryError = document.getElementById(prefix + "-category-error");
          if (categoryError) {
            categoryError.style.display = "none";
          }
          updateTotals();
        });
      }
      if (coverFee) coverFee.addEventListener(ev, updateTotals);
      if (addr1) {
        addr1.addEventListener(ev, function() {
          var addr1Error = document.getElementById(prefix + "-addr1-error");
          if (addr1Error) addr1Error.style.display = "none";
          updateTotals();
        });
      }
      if (addr2) addr2.addEventListener(ev, updateTotals);
      if (city) {
        city.addEventListener(ev, function() {
          var cityError = document.getElementById(prefix + "-city-error");
          if (cityError) cityError.style.display = "none";
          updateTotals();
        });
      }
      if (stateSel) {
        stateSel.addEventListener(ev, function() {
          var stateError = document.getElementById(prefix + "-state-error");
          if (stateError) stateError.style.display = "none";
          updateTotals();
        });
      }
      if (zip) {
        zip.addEventListener(ev, function() {
          var zipError = document.getElementById(prefix + "-zip-error");
          if (zipError) zipError.style.display = "none";
          updateTotals();
        });
      }
      if (countrySel) {
        countrySel.addEventListener(ev, function() {
          var countryError = document.getElementById(prefix + "-country-error");
          if (countryError) countryError.style.display = "none";
          updateTotals();
        });
      }
      if (lookupInput) {
        lookupInput.addEventListener(ev, function() {
          var lookupError = document.getElementById(prefix + "-address-lookup-error");
          if (lookupError) lookupError.style.display = "none";
          updateTotals();
        });
      }
      
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
    if (submitBtn) {
      submitBtn.addEventListener("click", function () {
        if (!validateRequired()) return;

        // Handle event registration vs donation differently
        if (isEventRegistration) {
          // Event registration submission
          var eventData = collectEventFormData(prefix, config);
          
          // First submit to eventEndpoint
          submitEventRegistration(eventData, config, prefix);
        } else {
        // Original donation submission logic
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
          livemode: (category.toLowerCase().includes("test") || (config.event && config.event.eventName && config.event.eventName.toLowerCase().includes("test"))) ? false : true,
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
      } // End of else block for donation submission
    }); // End of submit button addEventListener
    } else {
      console.warn('Submit button not found for prefix:', prefix);
    }

    // Initial totals
    updateTotals();
  }

  // Public API - Initialize donation/event registration form
  window.DonationPopup = {
    init: function(config) {
      config = config || {};
      
      // Auto-detect container if not specified
      if (!config.container) {
        if (document.getElementById("donation-popup")) {
          config.container = "#donation-popup";
        } else if (document.getElementById("donation-form-embedded")) {
          config.container = "#donation-form-embedded";  
        }
      }
      
      if (config.container === "#donation-popup" || config.container === "donation-popup") {
        mountPopup(config);
      } else if (config.container === "#donation-form-embedded" || config.container === "donation-form-embedded") {
        mountEmbedded(config);
      }
      
      return config;
    },
    version: '2.0.0'
  };

  // Legacy modal functions
  window.openDonationModal = function () {
    var modal = document.getElementById("dp-modal");
    if (modal) modal.style.display = "flex";
  };
  window.closeDonationModal = function () {
    var modal = document.getElementById("dp-modal");
    if (modal) modal.style.display = "none";
  };

  // Auto-initialize on DOM ready (legacy mode)
  document.addEventListener("DOMContentLoaded", function () {
    // Check for configuration in script tags
    var scripts = document.querySelectorAll('script[src*="donation-popup"]');
    var autoConfig = null;
    
    scripts.forEach(function(script) {
      if (script.dataset) {
        autoConfig = {};
        Object.keys(script.dataset).forEach(function(key) {
          var value = script.dataset[key];
          // Try to parse as JSON for complex values
          try {
            value = JSON.parse(value);
          } catch (e) {
            // Keep as string
          }
          autoConfig[key] = value;
        });
      }
    });
    
    // Auto-mount with config or legacy mode
    mountPopup(autoConfig);     // attaches to #donation-popup (if present)  
    mountEmbedded(autoConfig);  // attaches to #donation-form-embedded (if present)
  });
})();
