import { states, countries } from './constants.js';
import { API_URLS } from './config.js';
import { populateSelect, updateTotalAmount } from './utils.js';
import { createModal, showModal, hideModal } from './components/Modal.js';
import { createForm } from './components/Form.js';
import { formData } from './formData.js';

// Dynamically load styles.css
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = './styles.css';
document.head.appendChild(link);

// Updated API URL usage
const processDonationAPI = API_URLS.processDonation;

// Create and display the donation modal
const donationContent = `<div class="logo-container">
    <img src="https://images.squarespace-cdn.com/content/v1/5af0bc3a96d45593d7d7e55b/c8c56eb8-9c50-4540-822a-5da3f5d0c268/refuge-logo-edit+%28circle+with+horizontal+RI+name%29+-+small.png" height="100" alt="Refuge International">
</div>`;
const donationModal = createModal(donationContent, () => {
    history.pushState("", document.title, window.location.pathname + window.location.search);
});

// Populate select elements
populateSelect('popup-state', states);
populateSelect('popup-country', countries);

// Event listeners for form submission and updates
const form = createForm(formData, async (formElement) => {
    const jsonData = {
        firstname: formElement.querySelector('#popup-firstname').value,
        lastname: formElement.querySelector('#popup-lastname').value,
        email: formElement.querySelector('#popup-email').value,
        phone: formElement.querySelector('#popup-phone').value,
        address: {
            line1: formElement.querySelector('#popup-address-line1').value,
            line2: formElement.querySelector('#popup-address-line2').value,
            city: formElement.querySelector('#popup-city').value,
            state: formElement.querySelector('#popup-state').value,
            postal_code: formElement.querySelector('#popup-postal_code').value,
            country: formElement.querySelector('#popup-country').value,
        },
        amount: (() => {
            const selectedButton = formElement.querySelector('.popup-amount-btn.selected');
            if (!selectedButton) return 0;
            const value = selectedButton.getAttribute('data-value');
            return value === 'custom' ? parseFloat(formElement.querySelector('#popup-custom-amount').value) : parseFloat(value);
        })(),
        frequency: formElement.querySelector('#popup-frequency').value,
        category: formElement.querySelector('#popup-category').value,
        coverFee: formElement.querySelector('#popup-cover-fee').checked,
    };

    try {
        const response = await fetch(processDonationAPI, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jsonData),
        });
        const session = await response.json();
        const stripe = Stripe('your-stripe-key');
        await stripe.redirectToCheckout({ sessionId: session.id });
    } catch (error) {
        console.error('Error:', error);
    }
});

donationModal.querySelector('.modal-content').appendChild(form);

// Show modal on hash change
window.addEventListener('hashchange', () => {
    if (window.location.hash === '#donate') {
        showModal(donationModal);
    }
});