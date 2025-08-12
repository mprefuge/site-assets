//const processDonationAPI = 'https://prod-01.westus.logic.azure.com:443/workflows/654fe9a05e5748ec83e27aaa6c899efc/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=2ty13qi1crX_IsZkHS4fZFyQWcSN8P4XKFMzD3tYqFk';
const processDonationAPI = 'https://prod-08.westus.logic.azure.com:443/workflows/aa6dd00627e9488eb2d9e5af99110e26/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=lnc3194xuZhPQnVi6pDF_LuvDSG8BElOsVFllpS6UpE';
const states = ["", "AL - Alabama", "AK - Alaska", "AZ - Arizona", "AR - Arkansas", "CA - California", "CO - Colorado", "CT - Connecticut", "DE - Delaware", "FL - Florida", "GA - Georgia", "HI - Hawaii", "ID - Idaho", "IL - Illinois", "IN - Indiana", "IA - Iowa", "KS - Kansas", "KY - Kentucky", "LA - Louisiana", "ME - Maine", "MD - Maryland", "MA - Massachusetts", "MI - Michigan", "MN - Minnesota", "MS - Mississippi", "MO - Missouri", "MT - Montana", "NE - Nebraska", "NV - Nevada", "NH - New Hampshire", "NJ - New Jersey", "NM - New Mexico", "NY - New York", "NC - North Carolina", "ND - North Dakota", "OH - Ohio", "OK - Oklahoma", "OR - Oregon", "PA - Pennsylvania", "RI - Rhode Island", "SC - South Carolina", "SD - South Dakota", "TN - Tennessee", "TX - Texas", "UT - Utah", "VT - Vermont", "VA - Virginia", "WA - Washington", "WV - West Virginia", "WI - Wisconsin", "WY - Wyoming", "Outside US"];
const countries = ["United States", "Afghanistan", "Akrotiri", "Albania", "Algeria", "American Samoa", "Andorra", "Angola", "Anguilla", "Antarctica", "Antigua and Barbuda", "Argentina", "Armenia", "Aruba", "Ashmore and Cartier Islands", "Australia", "Austria", "Azerbaijan", "Bahamas, The", "Bahrain", "Bangladesh", "Barbados", "Bassas da India", "Belarus", "Belgium", "Belize", "Benin", "Bermuda", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Bouvet Island", "Brazil", "British Indian Ocean Territory", "British Virgin Islands", "Brunei", "Bulgaria", "Burkina Faso", "Burma", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Cayman Islands", "Central African Republic", "Chad", "Chile", "China", "Christmas Island", "Clipperton Island", "Cocos (Keeling) Islands", "Colombia", "Comoros", "Congo, Democratic Republic of the", "Congo, Republic of the", "Cook Islands", "Coral Sea Islands", "Costa Rica", "Cote d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Dhekelia", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Europa Island", "Falkland Islands (Islas Malvinas)", "Faroe Islands", "Fiji", "Finland", "France", "French Guiana", "French Polynesia", "French Southern and Antarctic Lands", "Gabon", "Gambia, The", "Gaza Strip", "Georgia", "Germany", "Ghana", "Gibraltar", "Glorioso Islands", "Greece", "Greenland", "Grenada", "Guadeloupe", "Guam", "Guatemala", "Guernsey", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Heard Island and McDonald Islands", "Holy See (Vatican City)", "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Isle of Man", "Israel", "Italy", "Jamaica", "Jan Mayen", "Japan", "Jersey", "Jordan", "Juan de Nova Island", "Kazakhstan", "Kenya", "Kiribati", "North Korea", "South Korea", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Macau", "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Martinique", "Mauritania", "Mauritius", "Mayotte", "Mexico", "Micronesia, Federated States of", "Moldova", "Monaco", "Mongolia", "Montserrat", "Morocco", "Mozambique", "Namibia", "Nauru", "Navassa Island", "Nepal", "Netherlands", "Netherlands Antilles", "New Caledonia", "New Zealand", "Nicaragua", "Niger", "Nigeria", "Niue", "Norfolk Island", "Northern Ireland", "Northern Mariana Islands", "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paracel Islands", "Paraguay", "Peru", "Philippines", "Pitcairn Islands", "Poland", "Portugal", "Puerto Rico", "Qatar", "Reunion", "Romania", "Russia", "Rwanda", "Saint Helena", "Saint Kitts and Nevis", "Saint Lucia", "Saint Pierre and Miquelon", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia and Montenegro", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Georgia and the South Sandwich Islands", "Spain", "Spratly Islands", "Sri Lanka", "Sudan", "Suriname", "Svalbard", "Swaziland", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tokelau", "Tonga", "Trinidad and Tobago", "Tromelin Island", "Tunisia", "Turkey", "Turkmenistan", "Turks and Caicos Islands", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Virgin Islands", "Wake Island", "Wallis and Futuna", "West Bank", "Western Sahara", "Yemen", "Zambia", "Zimbabwe", "Myanmar (Burma)", "Palestine", "Democratic Republic of the Congo", "Not Listed"];
const style = `<style>
            .payment-method-row {
                display: none;
                margin: 10px 0 20px 0;
                justify-content: center;
                gap: 16px;
            }
            .payment-method-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
                border: 2px solid #ccc;
                background: #fff;
                border-radius: 8px;
                padding: 10px 18px 8px 18px;
                cursor: pointer;
                font-size: 16px;
                transition: border-color 0.2s, box-shadow 0.2s, background 0.2s, color 0.2s;
                min-width: 140px;
                outline: none;
                color: #000;
                font-weight: 500;
                position: relative;
            }
            .payment-method-btn.selected, .payment-method-btn:focus {
                border-color: #BD2135;
                background: #BD2135;
                color: #fff;
                box-shadow: 0 0 0 2px #BD213533;
            }
            .payment-method-btn.selected img {
                filter: brightness(0) invert(1);
            }
            .payment-method-btn svg, .payment-method-btn img {
                width: 28px;
                height: 28px;
                display: inline-block;
                vertical-align: middle;
                transition: filter 0.2s;
            }
            /* Wallet SVG color swap on selection */
            .payment-method-btn.selected .wallet-svg-main {
                fill: #fff !important;
                stroke: #fff !important;
            }
            .payment-method-btn.selected .wallet-svg-circle {
                fill: #BD2135 !important;
            }
            .payment-method-btn.selected .wallet-svg-bar {
                fill: #BD2135 !important;
            }
            .payment-method-label {
                margin-top: 4px;
                font-size: 16px;
                font-weight: 600;
                letter-spacing: 0.01em;
            }
            .payment-method-fee {
                margin-top: 2px;
                font-size: 14px;
                font-weight: bold;
                color: #BD2135;
                background: none;
                border-radius: 4px;
                padding: 0 2px;
                text-align: center;
                line-height: 1.2;
            }
            .payment-method-btn.selected .payment-method-fee {
                color: #fff;
                background: #BD2135;
                padding: 0 4px;
            }
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 20px;
            }
            /* Modal styles */
            .modal {
                display: none; 
                position: fixed;
                z-index: 9999;
                left: 0;
                top: 0;
                width: 100%; 
                height: 100%; 
                overflow: hidden;/*auto; */
                background-color: rgba(0, 0, 0, 0.4);
                align-items: center;
                justify-content: center;
            }
            .modal-content {
                background-color: #fefefe;
                max-height: 100%;
                overflow-y: auto;
                margin: auto;
                padding: 20px;
                border: 1px solid #888;
                width: 50%; 
                border-radius: 25px;
                z-index: 10000; 
                position: relative;
                scrollbar-width: thin;
                scrollbar-color: rgba(0, 0, 0, 0.5) transparent;
            }
            .modal-content::-webkit-scrollbar {
                width: 8px;
            }

            .modal-content::-webkit-scrollbar-thumb {
                background: rgba(0, 0, 0, 0.5);
                border-radius: 4px;
            }

            .modal-content::-webkit-scrollbar-track {
                background: transparent;
                margin-right: 10px;
            }

            @media (max-width: 600px) {
                .modal-content {
                    width: 100%; 
                    height: 100%; 
                    border-radius: 0; 
                    margin: 0; 
                    padding: 10px;
                }

                .form-row {
                    flex-direction: column; /* Stack fields vertically */
                }
            }

            .close-button {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
            }
            .close-button:hover,
            .close-button:focus {
                color: black;
                text-decoration: none;
                cursor: pointer;
            }
            /* Form styles */
            label {
                display: block;
                margin-bottom: 6px;
                font-weight: 600;
                color: #222;
                letter-spacing: 0.01em;
                font-size: 15px;
            }
            #donation-form, #popup-donation-form, #embedded-donation-form {
                background-color: #fff;
                padding: 28px 24px 20px 24px;
                border-radius: 18px;
                box-shadow: 0 6px 32px 0 rgba(189,33,53,0.10), 0 1.5px 6px 0 rgba(0,0,0,0.08);
                max-width: 540px;
                margin: 0 auto;
            }
            .form-row {
                display: flex;
                gap: 18px;
                margin-bottom: 18px;
            }
            .form-row > div {
                flex: 1;
                margin-right: 0;
            }
            .form-row > div:last-child {
                margin-right: 0;
            }
            .form-row input,
            .form-row select {
                width: 100%;
                padding: 13px 12px;
                border: 1.5px solid #e0e0e0;
                border-radius: 8px;
                box-sizing: border-box;
                font-size: 16px;
                background: #fafbfc;
                color: #222;
                transition: border-color 0.2s, box-shadow 0.2s;
                outline: none;
            }
            .form-row input:focus,
            .form-row select:focus {
                border-color: #BD2135;
                box-shadow: 0 0 0 2px #BD213533;
                background: #fff;
            }
            .form-row input:disabled,
            .form-row select:disabled {
                background: #f4f4f4;
                color: #aaa;
            }
            .form-row input[type="number"]::-webkit-inner-spin-button,
            .form-row input[type="number"]::-webkit-outer-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
            .form-row input[type="number"] {
                -moz-appearance: textfield;
            }
            .checkbox-row {
                display: flex;
                align-items: center;
                margin: 18px 0 10px 0;
                gap: 10px;
            }
            .checkbox-row input[type="checkbox"] {
                accent-color: #BD2135;
                width: 18px;
                height: 18px;
                margin-right: 8px;
            }
            .header-row {
                background: #BD2135;
                color: #fff;
                text-align: center;
                padding: 16px 0 12px 0;
                border-radius: 8px 8px 0 0;
                margin-bottom: 18px;
            }
            .header-row h2 {
                margin: 0;
                font-size: 26px;
                color: #fff;
                font-weight: 700;
                letter-spacing: 0.01em;
            }
            #popup-amount-buttons, #embedded-amount-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 18px;
            }
            .popup-amount-btn, .embedded-amount-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 7px;
                background-color: #000;
                color: #fff;
                font-size: 17px;
                cursor: pointer;
                flex-grow: 1;
                text-align: center;
                transition: background 0.2s, color 0.2s;
                font-weight: 600;
                box-shadow: 0 1.5px 6px 0 rgba(0,0,0,0.08);
            }
            .popup-amount-btn.selected, .embedded-amount-btn.selected {
                background-color: #BD2135;
                color: #fff;
            }
            #popup-custom-amount-container, #embedded-custom-amount-container {
                display: none;
                margin-bottom: 18px;
            }
            #popup-custom-amount, #embedded-custom-amount {
                width: 100%;
                padding: 13px 12px;
                border: 1.5px solid #e0e0e0;
                border-radius: 8px;
                box-sizing: border-box;
                font-size: 16px;
                background: #fafbfc;
                color: #222;
                transition: border-color 0.2s, box-shadow 0.2s;
                outline: none;
            }
            #popup-custom-amount:focus, #embedded-custom-amount:focus {
                border-color: #BD2135;
                box-shadow: 0 0 0 2px #BD213533;
                background: #fff;
            }
            #popup-total-amount-display-bg, #embedded-total-amount-display-bg {
                background-color: #000;
                text-align: center;
                padding: 7px;
                border-radius: 25px;
                margin-bottom: 18px;
            }
            button[type="submit"], #popup-total-amount-display, #embedded-total-amount-display {
                background: #BD2135;
                color: #fff;
                padding: 18px 0;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 24px;
                font-weight: bold;
                width: 100%;
                margin-top: 10px;
                box-shadow: 0 2px 8px 0 rgba(189,33,53,0.10);
                transition: background 0.2s, color 0.2s;
            }
                button[type="submit"]:hover, #popup-total-amount-display:hover, #embedded-total-amount-display:hover {
                    background: #000;
                    color: #fff;
            }
            button[type="submit"]:disabled, #popup-total-amount-display:disabled, #embedded-total-amount-display:disabled {
                background: #e0e0e0;
                color: #aaa;
                cursor: not-allowed;
            }
            .logo-container {
                text-align: center;
                margin-bottom: 18px;
            }
            .modal-content {
                background-color: #fff;
                max-height: 100%;
                overflow-y: auto;
                margin: auto;
                padding: 0;
                border: none;
                width: 100%;
                max-width: 600px;
                border-radius: 25px;
                z-index: 10000;
                position: relative;
                box-shadow: 0 6px 32px 0 rgba(189,33,53,0.10), 0 1.5px 6px 0 rgba(0,0,0,0.08);
            }
            @media (max-width: 600px) {
                .modal-content {
                    width: 100%;
                    height: 100%;
                    border-radius: 0;
                    margin: 0;
                    padding: 0;
                }
                .form-row {
                    flex-direction: column;
                    gap: 0;
                }
                #donation-form, #popup-donation-form, #embedded-donation-form {
                    padding: 12px 4px 8px 4px;
                }
            }
            #popup-amount-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-bottom: 15px;
            }
            .popup-amount-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                background-color: black;
                color: white;
                font-size: 16px;
                cursor: pointer;
                flex-grow: 1;
                text-align: center;
                transition: background-color 0.3s ease;
            }
            .popup-amount-btn.selected {
                background-color: #BD2135;
            }
            #popup-custom-amount-container {
                display: none;
            }
            #popup-custom-amount {
                width: 100%;
                padding: 10px;
                border: 1px solid #ccc;
                border-radius: 5px;
                box-sizing: border-box;
            }
            #popup-total-amount-display-bg {
                background-color: #000000;
                text-align: center;
                padding: 5px;
                border-radius: 25px;
            }
            button[type="submit"] {
                background-color: #BD2135;
                color: white;
                padding: 15px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 24px;
                font-weight: bold;
                width: 100%;
            }
            button[type="submit"]:hover {
                background-color: #a11d2d;
            }
            button[type="submit"]:disabled {
                background-color: gray;
                cursor: not-allowed;
            }
            .checkbox-row {
                display: flex;
                align-items: center;
                margin: 15px 0;
            }
            .checkbox-row input[type="checkbox"] {
                margin-right: 10px;
            }
            .logo-container {
                text-align: center;
            }
            .header-row {
                background-color: #000000;/*#BD2135;*/
                color: white;
                text-align: center;
                padding: 10px;
                border-radius: 5px;
            }
            .header-row h2 {
                margin: 0;
                font-size: 24px;
                color: white;
            }
        </style>`
const formData = `<div class="header-row">
                    <h2>Please Provide the Following Information</h2>
                </div>
                <form id="popup-donation-form">
                    <div class="form-row">
                        <div>
                            <label for="popup-firstname">First Name:</label>
                            <input type="text" id="popup-firstname" name="firstname" required>
                        </div>
                        <div>
                            <label for="popup-lastname">Last Name:</label>
                            <input type="text" id="popup-lastname" name="lastname" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div>
                            <label for="popup-email">Email:</label>
                            <input type="email" id="popup-email" name="email" required>
                        </div>
                        <div>
                            <label for="popup-phone">Phone:</label>
                            <input type="tel" id="popup-phone" name="phone" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div>
                            <label for="popup-address-line1">Address Line 1:</label>
                            <input type="text" id="popup-address-line1" name="address_line1" required>
                        </div>
                        <div>
                            <label for="popup-address-line2">Address Line 2 (optional):</label>
                            <input type="text" id="popup-address-line2" name="address_line2">
                        </div>
                    </div>
                    <div class="form-row">
                        <div>
                            <label for="popup-city">City:</label>
                            <input type="text" id="popup-city" name="city" required>
                        </div>
                        <div>
                            <label for="popup-state">State:</label>
                            <select id="popup-state" name="state" class="field-element" required></select>
                        </div>
                        <div>
                            <label for="popup-postal_code">Zip Code:</label>
                            <input type="text" id="popup-postal_code" name="postal_code" required>
                        </div>
                        <div>
                            <label for="popup-country">Country:</label>
                            <select id="popup-country" name="country" class="field-element" required></select>
                        </div>
                    </div>
                    <label>Select Donation Amount:</label>
                    <div id="popup-amount-buttons">
                        <div class="popup-amount-btn" data-value="500">$500</div>
                        <div class="popup-amount-btn" data-value="100">$100</div>
                        <div class="popup-amount-btn" data-value="50">$50</div>
                        <div class="popup-amount-btn" data-value="25">$25</div>
                        <div class="popup-amount-btn" data-value="10">$10</div>
                        <div class="popup-amount-btn" data-value="custom">Other</div>
                    </div>
                    <div id="popup-custom-amount-container" style="display: none;">
                        <label for="popup-custom-amount">Enter your custom amount:</label>
                        <input type="number" id="popup-custom-amount" name="custom-amount" min="1" step="0.01">
                    </div>
                    <div class="form-row">
                        <div>
                            <label for="popup-frequency">Donation Frequency:</label>
                            <select id="popup-frequency" name="frequency" required>
                                <option value="onetime">One-time</option>
                                <option value="week">Weekly</option>
                                <option value="biweek">Bi-Weekly</option>
                                <option value="month">Monthly</option>
                                <option value="year">Yearly</option>
                            </select>
                        </div>
                        <div>
                            <label for="popup-category">Category:</label>
                            <select id="popup-category" name="category" required>
                                <option value="General Giving">General Giving</option>
                                <option value="Cooking and Culture">Cooking and Culture</option>
                                <option value="Corporate Sponsor">Corporate Sponsor</option>
                                <option value="Ministry Support Dinner">Ministry Support Dinner</option>
                                <option value="TNND Payment">TNND</option>
                                <option value="Volunteer Application">Volunteer Application</option>
                            </select>
                        </div>
                    </div>
                    <div class="checkbox-row">
                        <input type="checkbox" id="popup-cover-fee" name="cover-fee" checked>
                        <label for="popup-cover-fee">I would like to cover the processing fees</label>
                    </div>
                    <div class="payment-method-row" id="popup-payment-method-row" style="display: flex;">
                        <button type="button" class="payment-method-btn selected" data-method="card" aria-label="Card">
                            <img src="https://js.stripe.com/v3/fingerprinted/img/card-ce24697297bd3c6a00fdd2fb6f760f0d.svg" alt="Card" />
                            <span class="payment-method-label">Card</span>
                            <span class="payment-method-fee">2.2% + $0.30</span>
                        </button>
                        <button type="button" class="payment-method-btn" data-method="ach" aria-label="US Bank Account">
                            <img src="https://js.stripe.com/v3/fingerprinted/img/bank-de5c9ead31505d57120e98291cb20e57.svg" alt="US Bank Account" />
                            <span class="payment-method-label">US Bank Account</span>
                            <span class="payment-method-fee">0.8% (max $5)</span>
                        </button>
                        <button type="button" class="payment-method-btn" data-method="wallet" aria-label="Wallet">
                            <svg viewBox="0 0 40 28" fill="none">
                                <rect class="wallet-svg-main" x="2" y="4" width="36" height="20" rx="4" fill="#000"/>
                                <rect class="wallet-svg-main" x="2" y="4" width="36" height="20" rx="4" stroke="#333" stroke-width="2"/>
                                <circle class="wallet-svg-circle" cx="32" cy="14" r="4" fill="#fff"/>
                                <rect class="wallet-svg-bar" x="6" y="10" width="18" height="4" rx="2" fill="#fff"/>
                            </svg>
                            <span class="payment-method-label">Wallet</span>
                            <span class="payment-method-fee">2.2% + $0.30</span>
                            <span class="wallet-helper" style="display:block;font-size:12px;color:#555;margin-top:2px;">Apple Pay, Google Pay, etc.</span>
                        </button>
                    </div>
                    <div><button type="submit" id="popup-total-amount-display">Donate</button></div>
                    <div style="margin-top: 12px; text-align: center;">
                        <span style="display: inline-flex; align-items: center; gap: 8px; color: #222; font-size: 15px; font-weight: 500;">
                            Secure Payment Powered by
                            <svg width="80" height="24" viewBox="0 0 60 24" fill="none" style="vertical-align: middle;">
                                <path fill="var(--userLogoColor, #0A2540)" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.88z" fill-rule="evenodd"></path>
                            </svg>
                        </span>
                    </div>
                </form>
            </div>`

document.addEventListener("DOMContentLoaded", function () {

    const donationPopup = document.getElementById("donation-popup");
    donationPopup.innerHTML = `${style}<div class="modal" id="donation-modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <div class="logo-container">
                    <img src="https://images.squarespace-cdn.com/content/v1/5af0bc3a96d45593d7d7e55b/c8c56eb8-9c50-4540-822a-5da3f5d0c268/refuge-logo-edit+%28circle+with+horizontal+RI+name%29+-+small.png" height="100" alt="Refuge International">
                </div>${formData}</div>`;

    const modal = document.getElementById("donation-modal");

    checkHashParameter();

    window.addEventListener('hashchange', checkHashParameter);

    const span = modal.getElementsByClassName("close-button")[0];
    span.onclick = function () {
        modal.style.display = "none";
        history.pushState("", document.title, window.location.pathname + window.location.search);
    };

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
            history.pushState("", document.title, window.location.pathname + window.location.search);
        }
    };
    populateSelect('popup-state', states);
    populateSelect('popup-country', countries);
    const amountButtons = document.querySelectorAll('.popup-amount-btn');
    amountButtons.forEach(button => {
        button.onclick = function () {
            amountButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            const selectedValue = button.getAttribute('data-value');
            if (selectedValue === 'custom') {
                document.getElementById("popup-custom-amount-container").style.display = "block";
            } else {
                document.getElementById("popup-custom-amount-container").style.display = "none";
                updateTotalAmount();
            }
        };
    });

    document.getElementById("popup-custom-amount").oninput = updateTotalAmount;
    document.getElementById("popup-frequency").onchange = updateTotalAmount;

    // Show/hide payment method row when cover fee is checked
    // Show/hide payment method row when cover fee is checked
    const coverFeeCheckbox = document.getElementById("popup-cover-fee");
    const paymentRow = document.getElementById("popup-payment-method-row");
    // On load, show if checked
    paymentRow.style.display = coverFeeCheckbox.checked ? "flex" : "none";
    coverFeeCheckbox.onchange = function() {
        paymentRow.style.display = this.checked ? "flex" : "none";
        updateTotalAmount();
    };

    // Payment method button group logic
    const paymentBtns = document.querySelectorAll('#popup-payment-method-row .payment-method-btn');
    let selectedPaymentMethod = 'card';
    paymentBtns.forEach(btn => {
        btn.onclick = function() {
            paymentBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedPaymentMethod = btn.getAttribute('data-method');
            updateTotalAmount();
        };
    });

    document.getElementById("popup-donation-form").onsubmit = async function (event) {
        event.preventDefault();

        //const submitButton = document.querySelector('button[type="submit"]');
        const submitButton = document.querySelector('#popup-total-amount-display');
        submitButton.disabled = true;

    let paymentMethod = selectedPaymentMethod;
    let jsonData = {
            firstname: document.getElementById("popup-firstname").value,
            lastname: document.getElementById("popup-lastname").value,
            livemode: document.getElementById("popup-firstname").value.toLowerCase() === 'test' ? false : true,
            email: document.getElementById("popup-email").value,
            phone: document.getElementById("popup-phone").value,
            address: {
                line1: document.getElementById("popup-address-line1").value,
                line2: document.getElementById("popup-address-line2").value,
                city: document.getElementById("popup-city").value,
                state: document.getElementById("popup-state").value.split(" - ")[0],
                postal_code: document.getElementById("popup-postal_code").value,
                country: document.getElementById("popup-country").value
            },
            amount: (() => {
                
    let selectedButton = document.querySelector('.popup-amount-btn.selected');
    if (!selectedButton) return; // Exit if no button is selected
    let amount = selectedButton.getAttribute('data-value');
    
                if (amount === "custom") {
                    amount = document.getElementById("popup-custom-amount").value;
                }
                return parseFloat(amount) * 100;
            })(),
            coverFee: document.getElementById("popup-cover-fee").checked,
            paymentMethod: paymentMethod,
            frequency: document.getElementById("popup-frequency").value,
            category: document.getElementById("popup-category").value
        };

        if (jsonData.coverFee) {
            // Stripe nonprofit rates: Card/Wallet 2.2% + $0.30, ACH 0.8% (max $5)
            let fee = 0;
            let baseAmount = jsonData.amount / 100;
            if (paymentMethod === 'card' || paymentMethod === 'wallet') {
                fee = baseAmount * 0.022 + 0.30;
            } else if (paymentMethod === 'ach') {
                fee = Math.min(baseAmount * 0.008, 5.00);
            }
            jsonData.amount = Math.ceil((baseAmount + fee) * 100);
        }

        try {
            const response = await fetch(processDonationAPI, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(jsonData),
            });

            const session = await response.json();
            //const stripe = Stripe('pk_live_fJSacHhPB2h0mJfsFowRm8lQ');
            const key = jsonData.firstname.toLowerCase() === 'test' ? 'pk_test_y47nraQZ5IFgnTMlwbDvfj8D' : 'pk_live_fJSacHhPB2h0mJfsFowRm8lQ';
            const stripe = Stripe(key);
            const result = await stripe.redirectToCheckout({ sessionId: session.id });

            if (result.error) {
                console.error(result.error.message);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            submitButton.disabled = false;
        }
    };

    updateTotalAmount();

    function checkHashParameter() {
        if (window.location.hash === '#donate') {
            modal.style.display = "flex";
        }
    }

    function updateTotalAmount() {
        let selectedButton = document.querySelector('.popup-amount-btn.selected');
        if (!selectedButton) return;
        let amount = selectedButton.getAttribute('data-value');
        if (amount === "custom") {
            amount = document.getElementById("popup-custom-amount").value || 0;
        }
        let amountInDollars = parseFloat(amount);
        const coverFee = document.getElementById("popup-cover-fee").checked;
    let paymentMethod = selectedPaymentMethod;
        let fee = 0;
        if (coverFee) {
            // Stripe nonprofit rates: Card/Wallet 2.2% + $0.30, ACH 0.8% (max $5)
            if (paymentMethod === 'card' || paymentMethod === 'wallet') {
                fee = amountInDollars * 0.022 + 0.30;
            } else if (paymentMethod === 'ach') {
                fee = Math.min(amountInDollars * 0.008, 5.00);
            }
            amountInDollars = amountInDollars + fee;
        }
        let frequency = document.getElementById("popup-frequency").value;
        let frequencyText = {
            "onetime": "one time",
            "week": "every week",
            "biweek": "every two weeks",
            "month": "every month",
            "year": "every year"
        }[frequency];
        let displayElement = document.getElementById("popup-total-amount-display");
        if (displayElement) {
            displayElement.innerHTML = `Donate $${amountInDollars.toFixed(2)} ${frequencyText}`;
        }
    }
});

function populateSelect(elementId, options) {
    const select = document.getElementById(elementId);
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.innerHTML = option;
        
    if (select) {
        select.appendChild(opt);
    }
    
    });
}


document.addEventListener("DOMContentLoaded", function () {
    const donationForm = document.getElementById("donation-form-embedded");
    if (donationForm) {
        // Add payment method button group with icons after cover fee checkbox
        let styleEmbedded = style.replaceAll("popup-", "embedded-");
        let formDataEmbedded = formData.replaceAll("popup-", "embedded-");
        formDataEmbedded = formDataEmbedded.replace(
            /<div class=\"checkbox-row\"[\s\S]*?<\/div>/,
            match => match + `\n<div class=\"payment-method-row\" id=\"embedded-payment-method-row\" style=\"display: flex;\">\n<button type=\"button\" class=\"payment-method-btn selected\" data-method=\"card\" aria-label=\"Card\">\n<img src=\"https://js.stripe.com/v3/fingerprinted/img/card-ce24697297bd3c6a00fdd2fb6f760f0d.svg\" alt=\"Card\" />\n<span class=\"payment-method-label\">Card</span>\n<span class=\"payment-method-fee\">2.2% + $0.30</span>\n</button>\n<button type=\"button\" class=\"payment-method-btn\" data-method=\"ach\" aria-label=\"US Bank Account\">\n<img src=\"https://js.stripe.com/v3/fingerprinted/img/bank-de5c9ead31505d57120e98291cb20e57.svg\" alt=\"US Bank Account\" />\n<span class=\"payment-method-label\">US Bank Account</span>\n<span class=\"payment-method-fee\">0.8% (max $5)</span>\n</button>\n<button type=\"button\" class=\"payment-method-btn\" data-method=\"wallet\" aria-label=\"Wallet\">\n<svg viewBox=\"0 0 40 28\" fill=\"none\">\n<rect class=\"wallet-svg-main\" x=\"2\" y=\"4\" width=\"36\" height=\"20\" rx=\"4\" fill=\"#000\"/>\n<rect class=\"wallet-svg-main\" x=\"2\" y=\"4\" width=\"36\" height=\"20\" rx=\"4\" stroke=\"#333\" stroke-width=\"2\"/>\n<circle class=\"wallet-svg-circle\" cx=\"32\" cy=\"14\" r=\"4\" fill=\"#fff\"/>\n<rect class=\"wallet-svg-bar\" x=\"6\" y=\"10\" width=\"18\" height=\"4\" rx=\"2\" fill=\"#fff\"/>\n</svg>\n<span class=\"payment-method-label\">Wallet</span>\n<span class=\"payment-method-fee\">2.2% + $0.30</span>\n<span class=\"wallet-helper\" style=\"display:block;font-size:12px;color:#555;margin-top:2px;\">Apple Pay, Google Pay, etc.</span>\n</button>\n</div>`
        );

        // Move Secure Payment section to the bottom and update text/SVG
        formDataEmbedded = formDataEmbedded.replace(
            /<div><button type=\"submit\" id=\"embedded-total-amount-display\">Donate<\/button><\/div>\s*<div style=\"text-align: center; margin-top: 6px;\">[\s\S]*?<\/div>/,
            `<div><button type="submit" id="embedded-total-amount-display">Donate</button></div>\n<div style="margin-top: 12px; text-align: center;">\n<span style="display: inline-flex; align-items: center; gap: 8px; color: #222; font-size: 15px; font-weight: 500;">\n<svg width="80" height="24" viewBox="0 0 60 24" fill="none" style="vertical-align: middle;">\n<path fill="var(--userLogoColor, #0A2540)" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.88z" fill-rule="evenodd"></path>\n</svg>\n<span>Secure Payment through Stripe</span>\n</span>\n</div>`
        );
        donationForm.innerHTML = `${styleEmbedded}${formDataEmbedded}`;
    }

    populateSelect('embedded-state', states);
    populateSelect('embedded-country', countries);
    const amountButtons = document.querySelectorAll('.embedded-amount-btn');
    amountButtons.forEach(button => {
        button.onclick = function () {
            amountButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            const selectedValue = button.getAttribute('data-value');
            if (selectedValue === 'custom') {
                document.getElementById("embedded-custom-amount-container").style.display = "block";
            } else {
                document.getElementById("embedded-custom-amount-container").style.display = "none";
                updateTotalAmount();
            }
        };
    });

    const customAmountInput = document.getElementById("embedded-custom-amount");
    if (customAmountInput) {
        customAmountInput.oninput = updateTotalAmount;
    }

    const frequencyInput = document.getElementById("embedded-frequency");
    if (frequencyInput) {
        frequencyInput.oninput = updateTotalAmount;
    }

    const coverFeeInput = document.getElementById("embedded-cover-fee");
    const paymentRow = document.getElementById("embedded-payment-method-row");
    if (coverFeeInput) {
        // On load, show if checked
        paymentRow.style.display = coverFeeInput.checked ? "flex" : "none";
        coverFeeInput.oninput = function() {
            paymentRow.style.display = this.checked ? "flex" : "none";
            updateTotalAmount();
        };
    }


    // Payment method button group logic for embedded
    const paymentBtns = document.querySelectorAll('#embedded-payment-method-row .payment-method-btn');
    let selectedPaymentMethod = 'card';
    paymentBtns.forEach(btn => {
        btn.onclick = function() {
            paymentBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedPaymentMethod = btn.getAttribute('data-method');
            updateTotalAmount();
        };
    });

    const donationFormToSubmit = document.getElementById("embedded-donation-form");
    if (donationFormToSubmit) {
        donationFormToSubmit.onsubmit = async function (event) {
            event.preventDefault();
            const submitButton = document.querySelector('#embedded-total-amount-display');
            submitButton.disabled = true;
            let paymentMethod = selectedPaymentMethod;
            let jsonData = {
                firstname: document.getElementById("embedded-firstname").value,
                lastname: document.getElementById("embedded-lastname").value,
                livemode: document.getElementById("embedded-firstname").value.toLowerCase() === 'test' ? false : true,
                email: document.getElementById("embedded-email").value,
                phone: document.getElementById("embedded-phone").value,
                address: {
                    line1: document.getElementById("embedded-address-line1").value,
                    line2: document.getElementById("embedded-address-line2").value,
                    city: document.getElementById("embedded-city").value,
                    state: document.getElementById("embedded-state").value.split(" - ")[0],
                    postal_code: document.getElementById("embedded-postal_code").value,
                    country: document.getElementById("embedded-country").value
                },
                amount: (() => {
                    let amount = document.querySelector('.embedded-amount-btn.selected').getAttribute('data-value');
                    if (amount === "custom") {
                        amount = document.getElementById("embedded-custom-amount").value;
                    }
                    return parseFloat(amount) * 100;
                })(),
                coverFee: document.getElementById("embedded-cover-fee").checked,
                paymentMethod: paymentMethod,
                frequency: document.getElementById("embedded-frequency").value,
                category: document.getElementById("embedded-category").value
            };
            if (jsonData.coverFee) {
                // Stripe nonprofit rates: Card/Wallet 2.2% + $0.30, ACH 0.8% (max $5)
                let fee = 0;
                let baseAmount = jsonData.amount / 100;
                if (paymentMethod === 'card' || paymentMethod === 'wallet') {
                    fee = baseAmount * 0.022 + 0.30;
                } else if (paymentMethod === 'ach') {
                    fee = Math.min(baseAmount * 0.008, 5.00);
                }
                jsonData.amount = Math.ceil((baseAmount + fee) * 100);
            }
            try {
                const response = await fetch(processDonationAPI, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(jsonData),
                });
                const session = await response.json();
                const key = jsonData.firstname.toLowerCase() === 'test' ? 'pk_test_y47nraQZ5IFgnTMlwbDvfj8D' : 'pk_live_fJSacHhPB2h0mJfsFowRm8lQ';
                const stripe = Stripe(key);
                const result = await stripe.redirectToCheckout({ sessionId: session.id });
                if (result.error) {
                    console.error(result.error.message);
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                submitButton.disabled = false;
            }
        }
    }

    updateTotalAmount();

    function updateTotalAmount() {
        let selectedButton = document.querySelector('.embedded-amount-btn.selected');
        if (!selectedButton) return;
        let amount = selectedButton.getAttribute('data-value');
        if (amount === "custom") {
            amount = document.getElementById("embedded-custom-amount").value || 0;
        }
        let amountInDollars = parseFloat(amount);
        const coverFee = document.getElementById("embedded-cover-fee").checked;
    let paymentMethod = selectedPaymentMethod;
        let fee = 0;
        if (coverFee) {
            // Stripe nonprofit rates: Card/Wallet 2.2% + $0.30, ACH 0.8% (max $5)
            if (paymentMethod === 'card' || paymentMethod === 'wallet') {
                fee = amountInDollars * 0.022 + 0.30;
            } else if (paymentMethod === 'ach') {
                fee = Math.min(amountInDollars * 0.008, 5.00);
            }
            amountInDollars = amountInDollars + fee;
        }
        let frequency = document.getElementById("embedded-frequency").value;
        let frequencyText = {
            "onetime": "one time",
            "week": "every week",
            "biweek": "every two weeks",
            "month": "every month",
            "year": "every year"
        }[frequency];
        let displayElement = document.getElementById("embedded-total-amount-display");
        if (displayElement) {
            displayElement.innerHTML = `Donate $${amountInDollars.toFixed(2)} ${frequencyText}`;
        }
    }
});
