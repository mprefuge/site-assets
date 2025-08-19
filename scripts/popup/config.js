/**
 * Configuration file for donation form
 * Supports environment variables and GitHub secrets through process.env
 * Falls back to default values if environment variables are not set
 */

// Helper function to get environment variable or default value
function getEnvVar(key, defaultValue) {
  // In browser environment, check if variables are injected globally
  if (typeof window !== 'undefined' && window.DONATION_CONFIG) {
    return window.DONATION_CONFIG[key] !== undefined ? window.DONATION_CONFIG[key] : defaultValue;
  }
  // In Node.js environment, use process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] !== undefined ? process.env[key] : defaultValue;
  }
  return defaultValue;
}

// Helper function to parse JSON from environment variable or return default
function getEnvJSON(key, defaultValue) {
  const envValue = getEnvVar(key);
  if (envValue && envValue !== key) {
    try {
      return JSON.parse(envValue);
    } catch (e) {
      console.warn(`Failed to parse JSON from ${key}, using default value:`, e);
      return defaultValue;
    }
  }
  return defaultValue;
}

// Configuration object
const donationConfig = {
  // API Configuration - use GitHub secrets for sensitive endpoints
  api: {
    // Main donation processing endpoint
    processDonationEndpoint: getEnvVar('DONATION_API_ENDPOINT', 'HTTPS://APIENDPOINT'),
    
    // Stripe API keys - should come from GitHub secrets
    stripePublicKeyLive: getEnvVar('STRIPE_PUBLIC_KEY_LIVE', 'pk_live_'),
    stripePublicKeyTest: getEnvVar('STRIPE_PUBLIC_KEY_TEST', 'pk_test_')
  },

  // Brand Colors Configuration
  branding: {
    BRAND_PRIMARY: getEnvVar('BRAND_PRIMARY', '#000000'),
    BRAND_SECONDARY: getEnvVar('BRAND_SECONDARY', '#ffffff'),
    BRAND_TERTIARY: getEnvVar('BRAND_TERTIARY', '#000000')
  },

  // Donation Amounts Configuration
  amounts: getEnvJSON('DONATION_AMOUNTS', [1, 2, 3, 4, 5]),

  // Category Configuration - supports onetime, recurring, or both
  categories: {
    // Available category types: 'onetime', 'recurring', 'both'
    availableTypes: getEnvVar('CATEGORY_TYPES', 'both').split(',').map(s => s.trim()),
    
    onetime: getEnvJSON('CATEGORIES_ONETIME', [
      "ONE-TIME CATEGORY"
    ]),
    
    recurring: getEnvJSON('CATEGORIES_RECURRING', [
      "RECURRING CATEGORY"
    ])
  },

  // Frequency Configuration
  frequency: {
    // Available frequencies: 'onetime', 'recurring', 'both'
    availableTypes: getEnvVar('FREQUENCY_TYPES', 'both').split(',').map(s => s.trim()),
    
    // Default frequency when form loads
    defaultType: getEnvVar('DEFAULT_FREQUENCY', 'onetime')
  },

  // Processing Fee Configuration
  processingFee: {
    // Whether to show the "cover processing fee" checkbox
    showCoverFeeOption: getEnvVar('SHOW_COVER_PROCESSING_FEES', 'true') === 'true',
    
    // Default state of the checkbox (true = checked by default)
    coverFeeDefaultChecked: getEnvVar('COVER_PROCESSING_FEES_DEFAULT', 'false') === 'true',
    
    // Fee calculation settings (can be customized if needed)
    achFeePercentage: parseFloat(getEnvVar('ACH_FEE_PERCENTAGE', '0.0')),
    achFeeMax: parseFloat(getEnvVar('ACH_FEE_MAX', '0.0')),
    cardFeePercentage: parseFloat(getEnvVar('CARD_FEE_PERCENTAGE', '0.0')),
    cardFeeFixed: parseFloat(getEnvVar('CARD_FEE_FIXED', '0.0'))
  },

  // UI Configuration
  ui: {
    // Maximum width for the donation panel
    maxWidth: getEnvVar('UI_MAX_WIDTH', '760px'),
    
    // Number of total steps in the form
    totalSteps: parseInt(getEnvVar('UI_TOTAL_STEPS', '3')),
    
    // Whether to show payment method selection
    showPaymentMethods: getEnvVar('SHOW_PAYMENT_METHODS', 'true') === 'true'
  }
};

// Export configuration for different environments
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = donationConfig;
} else {
  // Browser environment - attach to window object
  window.DonationConfig = donationConfig;
}

// For immediate use, also make available as a global
if (typeof window !== 'undefined') {
  window.DonationConfig = donationConfig;
}
