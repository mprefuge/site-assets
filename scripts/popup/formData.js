export const formData = `
<div class="header-row">
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
    <div class="form-row" id="popup-address-lookup-row">
        <div style="width:100%;position:relative;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
                <label for="popup-address-lookup" style="margin-bottom:0;">Address:</label>
                <span style="font-size:15px;font-weight:600;cursor:pointer;color:#BD2135;z-index:10;" id="popup-enter-manually-link">Enter Manually</span>
            </div>
            <input type="text" id="popup-address-lookup" name="address_lookup" autocomplete="off" placeholder="Start typing your address..." required style="margin-top:2px;">
            <div id="popup-address-suggestions" style="position:absolute;z-index:1001;top:100%;left:0;width:100%;background:#fff;border:1px solid #ccc;border-radius:0 0 8px 8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);display:none;"></div>
        </div>
    </div>
    <div id="popup-manual-address-fields" style="display:none;">
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
            Secure Donations by
            <svg width="80" height="24" viewBox="0 0 60 24" fill="none" style="vertical-align: middle;">
                <path fill="var(--userLogoColor, #0A2540)" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.88z" fill-rule="evenodd"></path>
            </svg>
        </span>
    </div>
</form>`;
