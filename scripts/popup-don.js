//const processDonationAPI = 'https://prod-01.westus.logic.azure.com:443/workflows/654fe9a05e5748ec83e27aaa6c899efc/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=2ty13qi1crX_IsZkHS4fZFyQWcSN8P4XKFMzD3tYqFk';
const processDonationAPI = 'https://prod-08.westus.logic.azure.com:443/workflows/aa6dd00627e9488eb2d9e5af99110e26/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=lnc3194xuZhPQnVi6pDF_LuvDSG8BElOsVFllpS6UpE';
const states = ["", "AL - Alabama", "AK - Alaska", "AZ - Arizona", "AR - Arkansas", "CA - California", "CO - Colorado", "CT - Connecticut", "DE - Delaware", "FL - Florida", "GA - Georgia", "HI - Hawaii", "ID - Idaho", "IL - Illinois", "IN - Indiana", "IA - Iowa", "KS - Kansas", "KY - Kentucky", "LA - Louisiana", "ME - Maine", "MD - Maryland", "MA - Massachusetts", "MI - Michigan", "MN - Minnesota", "MS - Mississippi", "MO - Missouri", "MT - Montana", "NE - Nebraska", "NV - Nevada", "NH - New Hampshire", "NJ - New Jersey", "NM - New Mexico", "NY - New York", "NC - North Carolina", "ND - North Dakota", "OH - Ohio", "OK - Oklahoma", "OR - Oregon", "PA - Pennsylvania", "RI - Rhode Island", "SC - South Carolina", "SD - South Dakota", "TN - Tennessee", "TX - Texas", "UT - Utah", "VT - Vermont", "VA - Virginia", "WA - Washington", "WV - West Virginia", "WI - Wisconsin", "WY - Wyoming", "Outside US"];
const countries = ["United States", "Afghanistan", "Akrotiri", "Albania", "Algeria", "American Samoa", "Andorra", "Angola", "Anguilla", "Antarctica", "Antigua and Barbuda", "Argentina", "Armenia", "Aruba", "Ashmore and Cartier Islands", "Australia", "Austria", "Azerbaijan", "Bahamas, The", "Bahrain", "Bangladesh", "Barbados", "Bassas da India", "Belarus", "Belgium", "Belize", "Benin", "Bermuda", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Bouvet Island", "Brazil", "British Indian Ocean Territory", "British Virgin Islands", "Brunei", "Bulgaria", "Burkina Faso", "Burma", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Cayman Islands", "Central African Republic", "Chad", "Chile", "China", "Christmas Island", "Clipperton Island", "Cocos (Keeling) Islands", "Colombia", "Comoros", "Congo, Democratic Republic of the", "Congo, Republic of the", "Cook Islands", "Coral Sea Islands", "Costa Rica", "Cote d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Dhekelia", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Europa Island", "Falkland Islands (Islas Malvinas)", "Faroe Islands", "Fiji", "Finland", "France", "French Guiana", "French Polynesia", "French Southern and Antarctic Lands", "Gabon", "Gambia, The", "Gaza Strip", "Georgia", "Germany", "Ghana", "Gibraltar", "Glorioso Islands", "Greece", "Greenland", "Grenada", "Guadeloupe", "Guam", "Guatemala", "Guernsey", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Heard Island and McDonald Islands", "Holy See (Vatican City)", "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Isle of Man", "Israel", "Italy", "Jamaica", "Jan Mayen", "Japan", "Jersey", "Jordan", "Juan de Nova Island", "Kazakhstan", "Kenya", "Kiribati", "North Korea", "South Korea", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Macau", "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Martinique", "Mauritania", "Mauritius", "Mayotte", "Mexico", "Micronesia, Federated States of", "Moldova", "Monaco", "Mongolia", "Montserrat", "Morocco", "Mozambique", "Namibia", "Nauru", "Navassa Island", "Nepal", "Netherlands", "Netherlands Antilles", "New Caledonia", "New Zealand", "Nicaragua", "Niger", "Nigeria", "Niue", "Norfolk Island", "Northern Ireland", "Northern Mariana Islands", "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paracel Islands", "Paraguay", "Peru", "Philippines", "Pitcairn Islands", "Poland", "Portugal", "Puerto Rico", "Qatar", "Reunion", "Romania", "Russia", "Rwanda", "Saint Helena", "Saint Kitts and Nevis", "Saint Lucia", "Saint Pierre and Miquelon", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia and Montenegro", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Georgia and the South Sandwich Islands", "Spain", "Spratly Islands", "Sri Lanka", "Sudan", "Suriname", "Svalbard", "Swaziland", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tokelau", "Tonga", "Trinidad and Tobago", "Tromelin Island", "Tunisia", "Turkey", "Turkmenistan", "Turks and Caicos Islands", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Virgin Islands", "Wake Island", "Wallis and Futuna", "West Bank", "Western Sahara", "Yemen", "Zambia", "Zimbabwe", "Myanmar (Burma)", "Palestine", "Democratic Republic of the Congo", "Not Listed"];
const style = `<style>
            .payment-method-row {
                display: none;
                align-items: center;
                margin: 15px 0;
            }
            .payment-method-row label {
                margin-right: 10px;
                font-weight: normal;
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
                margin-bottom: 4px;
                font-weight: bold;
            }
            #donation-form {
                background-color: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            }
            .form-row {
                display: flex;
                margin-bottom: 15px;
            }
            .form-row > div {
                flex: 1;
                margin-right: 10px;
            }
            .form-row > div:last-child {
                margin-right: 0;
            }
            .form-row input,
            .form-row select {
                width: 100%;
                padding: 10px;
                border: 1px solid #ccc;
                border-radius: 5px;
                box-sizing: border-box;
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
                    <div class="payment-method-row" id="popup-payment-method-row">
                        <label for="popup-payment-method">Payment Method:</label>
                        <select id="popup-payment-method" name="payment-method">
                            <option value="card">Credit/Debit Card</option>
                            <option value="ach">ACH Bank Transfer</option>
                            <option value="wallet">Digital Wallet (Apple Pay, Google Pay, etc.)</option>
                        </select>
                    </div>
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
                    <div><button type="submit" id="popup-total-amount-display">Donate</button></div>
                    <div style="text-align: center;"><small>Upon clicking "Donate", you will be taken to our donation processing platform, Stripe, to enter your payment information.</small></div>
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
    document.getElementById("popup-cover-fee").onchange = function() {
        const coverFeeChecked = this.checked;
        const paymentRow = document.getElementById("popup-payment-method-row");
        paymentRow.style.display = coverFeeChecked ? "flex" : "none";
        updateTotalAmount();
    };

    document.getElementById("popup-payment-method").onchange = updateTotalAmount;

    document.getElementById("popup-donation-form").onsubmit = async function (event) {
        event.preventDefault();

        //const submitButton = document.querySelector('button[type="submit"]');
        const submitButton = document.querySelector('#popup-total-amount-display');
        submitButton.disabled = true;

    const paymentMethod = document.getElementById("popup-payment-method").value;
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
            // Stripe fee calculation based on payment method
            // Card: 2.9% + $0.30, ACH: 0.8% (max $5), Wallet: 2.9% + $0.30
            let fee = 0;
            let baseAmount = jsonData.amount / 100;
            if (paymentMethod === 'card' || paymentMethod === 'wallet') {
                fee = baseAmount * 0.029 + 0.30;
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
        let paymentMethod = 'card';
        const paymentMethodElem = document.getElementById("popup-payment-method");
        if (paymentMethodElem) paymentMethod = paymentMethodElem.value;
        let fee = 0;
        if (coverFee) {
            if (paymentMethod === 'card' || paymentMethod === 'wallet') {
                fee = amountInDollars * 0.029 + 0.30;
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
        // Add payment method row to embedded form markup
        let styleEmbedded = style.replaceAll("popup-", "embedded-");
        let formDataEmbedded = formData.replaceAll("popup-", "embedded-");
        // Insert payment method row after cover fee checkbox
        formDataEmbedded = formDataEmbedded.replace(
            /<div class=\"checkbox-row\"[\s\S]*?<\/div>/,
            match => match + `\n<div class=\"payment-method-row\" id=\"embedded-payment-method-row\">\n<label for=\"embedded-payment-method\">Payment Method:</label>\n<select id=\"embedded-payment-method\" name=\"payment-method\">\n<option value=\"card\">Credit/Debit Card</option>\n<option value=\"ach\">ACH Bank Transfer</option>\n<option value=\"wallet\">Digital Wallet (Apple Pay, Google Pay, etc.)</option>\n</select>\n</div>`
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
    if (coverFeeInput) {
        coverFeeInput.oninput = function() {
            const coverFeeChecked = this.checked;
            const paymentRow = document.getElementById("embedded-payment-method-row");
            paymentRow.style.display = coverFeeChecked ? "flex" : "none";
            updateTotalAmount();
        };
    }

    const paymentMethodInput = document.getElementById("embedded-payment-method");
    if (paymentMethodInput) {
        paymentMethodInput.onchange = updateTotalAmount;
    }

    const donationFormToSubmit = document.getElementById("embedded-donation-form");
    if (donationFormToSubmit) {
        donationFormToSubmit.onsubmit = async function (event) {
            event.preventDefault();
            const submitButton = document.querySelector('#embedded-total-amount-display');
            submitButton.disabled = true;
            const paymentMethod = document.getElementById("embedded-payment-method").value;
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
                let fee = 0;
                let baseAmount = jsonData.amount / 100;
                if (paymentMethod === 'card' || paymentMethod === 'wallet') {
                    fee = baseAmount * 0.029 + 0.30;
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
        let paymentMethod = 'card';
        const paymentMethodElem = document.getElementById("embedded-payment-method");
        if (paymentMethodElem) paymentMethod = paymentMethodElem.value;
        let fee = 0;
        if (coverFee) {
            if (paymentMethod === 'card' || paymentMethod === 'wallet') {
                fee = amountInDollars * 0.029 + 0.30;
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