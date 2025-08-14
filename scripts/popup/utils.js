export function populateSelect(elementId, options) {
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

export function updateTotalAmount(selectedPaymentMethod) {
    let selectedButton = document.querySelector('.popup-amount-btn.selected');
    if (!selectedButton) return;
    let amount = selectedButton.getAttribute('data-value');
    if (amount === "custom") {
        amount = document.getElementById("popup-custom-amount").value || 0;
    }
    let amountInDollars = parseFloat(amount);
    const coverFee = document.getElementById("popup-cover-fee").checked;
    let fee = 0;
    if (coverFee) {
        // Stripe nonprofit rates: Card/Wallet 2.2% + $0.30, ACH 0.8% (max $5)
        if (selectedPaymentMethod === 'card' || selectedPaymentMethod === 'wallet') {
            fee = amountInDollars * 0.022 + 0.30;
        } else if (selectedPaymentMethod === 'ach') {
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
