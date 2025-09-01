(function(window, document) {
  'use strict';

  // Default configuration
  const DEFAULT_CONFIG = {
    container: '#event-form-container',
    multiStep: true,
    event: {
      eventName: null,
      eventDate: null,
      eventTime: null,
      eventLength: null,
      timezone: null
    },
    address: {
      provider: 'nominatim',
      endpoint: 'https://nominatim.openstreetmap.org',
      debounceMs: 250,
      minChars: 3,
      countryCodes: null
    },
    payment: {
      enabled: false,
      amount: null,
      currency: 'USD',
      description: null,
      feeHandling: 'userChoice', // 'userChoice', 'alwaysInclude', 'alwaysExclude'
      processingFee: {
        card: { rate: 0.022, fixed: 0.30 },
        amex: { rate: 0.035, fixed: 0.30 },
        ach: { rate: 0.008, fixed: 0, max: 5.00 },
        wallet: { rate: 0.022, fixed: 0.30 }
      },
      stripeKeys: {
        live: 'pk_live_fJSacHhPB2h0mJfsFowRm8lQ',
        test: 'pk_test_y47nraQZ5IFgnTMlwbDvfj8D'
      },
      apiEndpoint: 'https://prod-08.westus.logic.azure.com:443/workflows/aa6dd00627e9488eb2d9e5af99110e26/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=lnc3194xuZhPQnVi6pDF_LuvDSG8BElOsVFllpS6UpE',
      liveMode: true
    },
    fields: {
      eventName: 'eventName',
      eventDate: 'eventDate',
      eventTime: 'eventTime',
      eventLength: 'eventLength',
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'email',
      phone: 'phone',
      address1: 'address1',
      address2: 'address2',
      city: 'city',
      region: 'state',
      postalCode: 'zipCode',
      country: 'country',
      church: 'church',
      currentlyServing: 'currentlyServing',
      servingLocation: 'servingLocation',
      keepInformed: 'keepInformed',
      howHeard: 'howHeard',
      photoPermission: 'photoPermission',
      paymentAmount: 'paymentAmount',
      coverFees: 'coverFees',
      paymentMethod: 'paymentMethod'
    },
    lookup: {
      // Use window.lookup if available, otherwise fallback to defaults
      servingAreas: null, // Will be populated from window.lookup.servingAreas
      howHeard: null,     // Will be populated from window.lookup.howHeard
      states: null,       // Will be populated from window.lookup.states
      countries: null     // Will be populated from window.lookup.countries
    },
    submit: {
      action: '/submit',
      method: 'POST'
    },
    callbacks: {
      onReady: null,
      onAddressSelected: null,
      onManualAddressToggle: null,
      onSubmitStart: null,
      onSubmitEnd: null,
      onStepChange: null
    }
  };

  // Helper functions
  function deepMerge(target, source) {
    const output = { ...target };
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    });
    return output;
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function parseDataAttributes(scriptTag) {
    const config = {};
    Array.from(scriptTag.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        const key = attr.name.slice(5).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        
        // Parse event-specific attributes
        if (key.startsWith('event')) {
          const eventKey = key.charAt(5).toLowerCase() + key.slice(6);
          config.event = config.event || {};
          config.event[eventKey] = attr.value;
        } else {
          config[key] = attr.value;
        }
      }
    });
    return config;
  }

  function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const config = { event: {} };
    
    params.forEach((value, key) => {
      if (['eventName', 'eventDate', 'eventTime', 'eventLength', 'timezone'].includes(key)) {
        config.event[key] = value;
      } else {
        config[key] = value;
      }
    });
    
    return config;
  }

  // Date/Time formatting utilities
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
      const monthYear = dateFormatter.format(dateObj).replace(/\d+,/, '');
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

  // Address autocomplete functionality
  class AddressAutocomplete {
    constructor(container, config, callbacks = {}) {
      this.container = container;
      this.config = config;
      this.callbacks = callbacks;
      this.isManual = false;
      this.selectedIndex = -1;
      this.suggestions = [];
      this.abortController = null;
      
      this.init();
    }

    init() {
      this.createElements();
      this.bindEvents();
    }

    createElements() {
      this.container.innerHTML = `
        <div class="efe-address-toggle">
          <button type="button" class="efe-manual-toggle" aria-pressed="false">
            Enter manually
          </button>
        </div>
        <div class="efe-address-autocomplete">
          <div class="efe-form-group">
            <label class="efe-form-label required">Address</label>
            <div class="efe-address-container">
              <input type="text" class="efe-form-control" placeholder="Start typing your address..." 
                     aria-expanded="false" aria-autocomplete="list" role="combobox">
              <div class="efe-address-suggestions" role="listbox" style="display: none;"></div>
            </div>
          </div>
        </div>
        <div class="efe-manual-address">
          <div class="efe-form-group">
            <label class="efe-form-label required">Street Address</label>
            <input type="text" class="efe-form-control" name="address1" required>
            <div class="efe-error-message">Please enter your street address</div>
          </div>
          <div class="efe-form-group">
            <label class="efe-form-label">Address Line 2</label>
            <input type="text" class="efe-form-control" name="address2">
          </div>
          <div class="efe-form-row">
            <div class="efe-form-group">
              <label class="efe-form-label required">City</label>
              <input type="text" class="efe-form-control" name="city" required>
              <div class="efe-error-message">Please enter your city</div>
            </div>
            <div class="efe-form-group">
              <label class="efe-form-label required">State/Region</label>
              <input type="text" class="efe-form-control" name="state" required>
              <div class="efe-error-message">Please enter your state/region</div>
            </div>
          </div>
          <div class="efe-form-row">
            <div class="efe-form-group">
              <label class="efe-form-label required">Postal Code</label>
              <input type="text" class="efe-form-control" name="zipCode" required>
              <div class="efe-error-message">Please enter your postal code</div>
            </div>
            <div class="efe-form-group">
              <label class="efe-form-label required">Country</label>
              <input type="text" class="efe-form-control" name="country" required>
              <div class="efe-error-message">Please enter your country</div>
            </div>
          </div>
        </div>
      `;

      // Cache elements
      this.toggleBtn = this.container.querySelector('.efe-manual-toggle');
      this.autocompleteContainer = this.container.querySelector('.efe-address-autocomplete');
      this.manualContainer = this.container.querySelector('.efe-manual-address');
      this.input = this.container.querySelector('.efe-address-autocomplete input');
      this.suggestionsContainer = this.container.querySelector('.efe-address-suggestions');
    }

    bindEvents() {
      // Toggle button
      this.toggleBtn.addEventListener('click', () => {
        this.toggleManualEntry();
      });

      // Autocomplete input
      const debouncedSearch = debounce(this.searchAddresses.bind(this), this.config.debounceMs);
      this.input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length >= this.config.minChars) {
          debouncedSearch(query);
        } else {
          this.hideSuggestions();
        }
      });

      // Keyboard navigation
      this.input.addEventListener('keydown', this.handleKeydown.bind(this));
      
      // Click outside to close
      document.addEventListener('click', (e) => {
        if (!this.container.contains(e.target)) {
          this.hideSuggestions();
        }
      });
    }

    toggleManualEntry() {
      this.isManual = !this.isManual;
      
      this.toggleBtn.setAttribute('aria-pressed', this.isManual.toString());
      this.toggleBtn.textContent = this.isManual ? 'Use autocomplete' : 'Enter manually';
      
      if (this.isManual) {
        this.autocompleteContainer.style.display = 'none';
        this.manualContainer.classList.add('visible');
        this.hideSuggestions();
      } else {
        this.autocompleteContainer.style.display = 'block';
        this.manualContainer.classList.remove('visible');
      }
      
      if (this.callbacks.onManualAddressToggle) {
        this.callbacks.onManualAddressToggle(this.isManual);
      }
    }

    async searchAddresses(query) {
      if (this.abortController) {
        this.abortController.abort();
      }
      
      this.abortController = new AbortController();
      
      try {
        this.showLoading();
        
        let url;
        if (this.config.provider === 'photon') {
          url = `${this.config.endpoint}/api/?q=${encodeURIComponent(query)}&limit=5`;
        } else {
          // Default to Nominatim
          url = `${this.config.endpoint}/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
          if (this.config.countryCodes) {
            url += `&countrycodes=${this.config.countryCodes.join(',')}`;
          }
        }
        
        const response = await fetch(url, {
          signal: this.abortController.signal,
          headers: {
            'User-Agent': 'EventFormEmbed/1.0'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        this.displaySuggestions(data);
        
      } catch (error) {
        if (error.name === 'AbortError') {
          return; // Request was cancelled
        }
        
        console.error('Address search error:', error);
        this.showError('Address search temporarily unavailable. Please enter manually.');
        
        // Auto-switch to manual entry on error
        setTimeout(() => {
          if (!this.isManual) {
            this.toggleManualEntry();
          }
        }, 2000);
      }
    }

    displaySuggestions(results) {
      this.suggestions = results;
      this.selectedIndex = -1;
      
      if (results.length === 0) {
        this.showError('No addresses found. Try a different search or enter manually.');
        return;
      }
      
      const html = results.map((result, index) => {
        const displayName = this.config.provider === 'photon' 
          ? result.properties.name || result.properties.label
          : result.display_name;
          
        return `<div class="efe-address-suggestion" role="option" data-index="${index}" aria-selected="false">
          ${this.escapeHtml(displayName)}
        </div>`;
      }).join('');
      
      this.suggestionsContainer.innerHTML = html;
      this.showSuggestions();
      
      // Add click handlers
      this.suggestionsContainer.querySelectorAll('.efe-address-suggestion').forEach(item => {
        item.addEventListener('click', () => {
          const index = parseInt(item.dataset.index);
          this.selectSuggestion(index);
        });
      });
    }

    showSuggestions() {
      this.suggestionsContainer.style.display = 'block';
      this.input.setAttribute('aria-expanded', 'true');
    }

    hideSuggestions() {
      this.suggestionsContainer.style.display = 'none';
      this.input.setAttribute('aria-expanded', 'false');
      this.selectedIndex = -1;
    }

    showLoading() {
      this.suggestionsContainer.innerHTML = '<div class="efe-address-loading">Searching...</div>';
      this.showSuggestions();
    }

    showError(message) {
      this.suggestionsContainer.innerHTML = `<div class="efe-address-error">${this.escapeHtml(message)}</div>`;
      this.showSuggestions();
    }

    handleKeydown(e) {
      if (!this.suggestionsContainer.style.display || this.suggestionsContainer.style.display === 'none') {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.moveSelection(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.moveSelection(-1);
          break;
        case 'Enter':
          e.preventDefault();
          if (this.selectedIndex >= 0) {
            this.selectSuggestion(this.selectedIndex);
          }
          break;
        case 'Escape':
          this.hideSuggestions();
          break;
      }
    }

    moveSelection(direction) {
      const suggestions = this.suggestionsContainer.querySelectorAll('.efe-address-suggestion');
      if (suggestions.length === 0) return;

      // Remove current selection
      if (this.selectedIndex >= 0) {
        suggestions[this.selectedIndex].classList.remove('highlighted');
        suggestions[this.selectedIndex].setAttribute('aria-selected', 'false');
      }

      // Update selection
      this.selectedIndex += direction;
      if (this.selectedIndex < 0) this.selectedIndex = suggestions.length - 1;
      if (this.selectedIndex >= suggestions.length) this.selectedIndex = 0;

      // Apply new selection
      suggestions[this.selectedIndex].classList.add('highlighted');
      suggestions[this.selectedIndex].setAttribute('aria-selected', 'true');
      suggestions[this.selectedIndex].scrollIntoView({ block: 'nearest' });
    }

    selectSuggestion(index) {
      const result = this.suggestions[index];
      if (!result) return;

      // Parse address components
      let addressData;
      if (this.config.provider === 'photon') {
        const props = result.properties;
        addressData = {
          address1: [props.housenumber, props.street].filter(Boolean).join(' ') || props.name,
          address2: '',
          city: props.city || props.town || props.village,
          state: props.state,
          zipCode: props.postcode,
          country: props.country
        };
      } else {
        // Nominatim
        const addr = result.address || {};
        addressData = {
          address1: [addr.house_number, addr.road].filter(Boolean).join(' ') || addr.amenity || addr.shop,
          address2: '',
          city: addr.city || addr.town || addr.village || addr.hamlet,
          state: addr.state,
          zipCode: addr.postcode,
          country: addr.country
        };
      }

      // Fill manual form fields
      Object.entries(addressData).forEach(([key, value]) => {
        if (value) {
          const field = this.manualContainer.querySelector(`[name="${key}"]`) ||
                       this.manualContainer.querySelector(`[name="${this.config.fields[key]}"]`);
          if (field) {
            field.value = value;
          }
        }
      });

      this.input.value = this.config.provider === 'photon' 
        ? result.properties.label || result.properties.name
        : result.display_name;
        
      this.hideSuggestions();

      if (this.callbacks.onAddressSelected) {
        this.callbacks.onAddressSelected(addressData);
      }
    }

    escapeHtml(unsafe) {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    getFormData() {
      if (this.isManual) {
        const data = {};
        this.manualContainer.querySelectorAll('input').forEach(input => {
          if (input.name && input.value) {
            data[input.name] = input.value;
          }
        });
        return data;
      } else {
        // Return parsed data from selected address
        const data = {};
        this.manualContainer.querySelectorAll('input').forEach(input => {
          if (input.name && input.value) {
            data[input.name] = input.value;
          }
        });
        return data;
      }
    }

    validate() {
      let isValid = true;
      const requiredFields = this.isManual 
        ? this.manualContainer.querySelectorAll('input[required]')
        : [this.input];

      requiredFields.forEach(field => {
        field.classList.remove('error');
        if (field.required && !field.value.trim()) {
          field.classList.add('error');
          isValid = false;
        }
      });

      return isValid;
    }

    destroy() {
      if (this.abortController) {
        this.abortController.abort();
      }
    }
  }

  // Main EventFormEmbed class
  class EventFormEmbed {
    constructor(config = {}) {
      this.config = deepMerge(DEFAULT_CONFIG, config);
      
      // Initialize lookup data from window.lookup if available
      this.initializeLookupData();
      
      this.container = null;
      this.form = null;
      this.addressAutocomplete = null;
      this.eventSummary = null;
      this.isEnhanceMode = false;
      this.currentStep = 1;
      this.totalSteps = this.config.payment.enabled ? 5 : 4;
      
      this.init();
    }

    initializeLookupData() {
      // Initialize lookup data from window.lookup if available
      if (window.lookup) {
        // Serving areas (convert from servingAreas to match expected format)
        if (window.lookup.servingAreas && Array.isArray(window.lookup.servingAreas)) {
          this.config.lookup.servingAreas = window.lookup.servingAreas.map(item => ({
            text: item.text,
            value: item.value
          }));
        }

        // How heard options
        if (window.lookup.howHeard && Array.isArray(window.lookup.howHeard)) {
          this.config.lookup.howHeard = window.lookup.howHeard.map(item => ({
            text: item.text,
            value: item.value
          }));
        }

        // States
        if (window.lookup.states && Array.isArray(window.lookup.states)) {
          this.config.lookup.states = window.lookup.states.map(item => ({
            text: item.text,
            value: item.value
          }));
        }

        // Countries  
        if (window.lookup.countries && Array.isArray(window.lookup.countries)) {
          this.config.lookup.countries = window.lookup.countries.map(item => ({
            text: item.text,
            value: item.value
          }));
        }
      }

      // Set fallback values if lookup data is not available
      if (!this.config.lookup.servingAreas) {
        this.config.lookup.servingAreas = [
          { text: 'Prayer Team', value: 'Prayer Team' },
          { text: 'Worship Team', value: 'Worship Team' },
          { text: 'Children\'s Ministry', value: 'Children\'s Ministry' },
          { text: 'Youth Ministry', value: 'Youth Ministry' },
          { text: 'Outreach', value: 'Outreach' },
          { text: 'Administration', value: 'Administration' },
          { text: 'Hospitality', value: 'Hospitality' }
        ];
      }

      if (!this.config.lookup.howHeard) {
        this.config.lookup.howHeard = [
          { text: 'Church Website', value: 'Church Website' },
          { text: 'Social Media', value: 'Social Media' },
          { text: 'Friend/Family', value: 'Friend/Family' },
          { text: 'Pastor/Staff', value: 'Pastor/Staff' },
          { text: 'Flyer/Poster', value: 'Flyer/Poster' },
          { text: 'Other', value: 'Other' }
        ];
      }

      if (!this.config.lookup.states) {
        this.config.lookup.states = [
          { text: '', value: '' },
          { text: 'Alabama', value: 'Alabama' },
          { text: 'Alaska', value: 'Alaska' },
          { text: 'Arizona', value: 'Arizona' },
          { text: 'Arkansas', value: 'Arkansas' },
          { text: 'California', value: 'California' },
          { text: 'Colorado', value: 'Colorado' },
          { text: 'Connecticut', value: 'Connecticut' },
          { text: 'Delaware', value: 'Delaware' },
          { text: 'Florida', value: 'Florida' },
          { text: 'Georgia', value: 'Georgia' },
          { text: 'Hawaii', value: 'Hawaii' },
          { text: 'Idaho', value: 'Idaho' },
          { text: 'Illinois', value: 'Illinois' },
          { text: 'Indiana', value: 'Indiana' },
          { text: 'Iowa', value: 'Iowa' },
          { text: 'Kansas', value: 'Kansas' },
          { text: 'Kentucky', value: 'Kentucky' },
          { text: 'Louisiana', value: 'Louisiana' },
          { text: 'Maine', value: 'Maine' },
          { text: 'Maryland', value: 'Maryland' },
          { text: 'Massachusetts', value: 'Massachusetts' },
          { text: 'Michigan', value: 'Michigan' },
          { text: 'Minnesota', value: 'Minnesota' },
          { text: 'Mississippi', value: 'Mississippi' },
          { text: 'Missouri', value: 'Missouri' },
          { text: 'Montana', value: 'Montana' },
          { text: 'Nebraska', value: 'Nebraska' },
          { text: 'Nevada', value: 'Nevada' },
          { text: 'New Hampshire', value: 'New Hampshire' },
          { text: 'New Jersey', value: 'New Jersey' },
          { text: 'New Mexico', value: 'New Mexico' },
          { text: 'New York', value: 'New York' },
          { text: 'North Carolina', value: 'North Carolina' },
          { text: 'North Dakota', value: 'North Dakota' },
          { text: 'Ohio', value: 'Ohio' },
          { text: 'Oklahoma', value: 'Oklahoma' },
          { text: 'Oregon', value: 'Oregon' },
          { text: 'Pennsylvania', value: 'Pennsylvania' },
          { text: 'Rhode Island', value: 'Rhode Island' },
          { text: 'South Carolina', value: 'South Carolina' },
          { text: 'South Dakota', value: 'South Dakota' },
          { text: 'Tennessee', value: 'Tennessee' },
          { text: 'Texas', value: 'Texas' },
          { text: 'Utah', value: 'Utah' },
          { text: 'Vermont', value: 'Vermont' },
          { text: 'Virginia', value: 'Virginia' },
          { text: 'Washington', value: 'Washington' },
          { text: 'West Virginia', value: 'West Virginia' },
          { text: 'Wisconsin', value: 'Wisconsin' },
          { text: 'Wyoming', value: 'Wyoming' },
          { text: 'Outside US', value: 'Outside US' }
        ];
      }

      if (!this.config.lookup.countries) {
        this.config.lookup.countries = [
          { text: '', value: '' },
          { text: 'United States', value: 'United States' },
          { text: 'Canada', value: 'Canada' }
        ];
      }
    }

    init() {
      try {
        // Find container
        this.container = typeof this.config.container === 'string' 
          ? document.querySelector(this.config.container)
          : this.config.container;

        if (!this.container) {
          throw new Error(`Container not found: ${this.config.container}`);
        }

        // Check if we're enhancing existing form or creating new
        this.form = this.container.querySelector('form');
        this.isEnhanceMode = !!this.form;

        if (this.isEnhanceMode) {
          this.enhanceExistingForm();
        } else {
          this.createFullForm();
        }

        this.bindEvents();
        
        if (this.config.callbacks.onReady) {
          this.config.callbacks.onReady(this);
        }
      } catch (error) {
        console.error('EventFormEmbed initialization failed:', error);
      }
    }

    enhanceExistingForm() {
      // Add event summary if event data is complete
      this.eventSummary = formatEventSummary(this.config);
      if (this.eventSummary) {
        this.addEventSummary();
        this.addHiddenFields();
      } else {
        this.addEventFields();
      }

      // Replace address section
      this.replaceAddressSection();
    }

    createFullForm() {
      const isMultiStep = this.config.multiStep;
      
      this.container.innerHTML = `
        <div class="efe-container">
          <div class="efe-card">
            ${isMultiStep ? this.generateProgressBar() : ''}
            <div class="efe-event-summary-container"></div>
            <form class="efe-form" novalidate>
              ${this.generateFormSections()}
              ${this.generateNavigation()}
            </form>
          </div>
        </div>
      `;

      this.form = this.container.querySelector('form');
      
      // Add event summary or fields
      this.eventSummary = formatEventSummary(this.config);
      if (this.eventSummary) {
        this.addEventSummary();
        this.addHiddenFields();
      } else {
        this.addEventFields();
      }

      // Initialize address section
      this.initializeAddressSection();
      
      if (isMultiStep) {
        this.initializeSteps();
      }
    }

    generateProgressBar() {
      return `
        <div class="efe-progress-bar">
          <div class="efe-progress-fill" style="width: ${((this.currentStep - 1) / this.totalSteps) * 100}%"></div>
        </div>
        <div class="efe-progress-steps">
          ${Array.from({length: this.totalSteps}, (_, i) => `
            <div class="efe-step-indicator ${i + 1 === this.currentStep ? 'active' : i + 1 < this.currentStep ? 'completed' : ''}"></div>
          `).join('')}
        </div>
      `;
    }

    generateFormSections() {
      const isMultiStep = this.config.multiStep;
      
      return `
        <!-- Section 1: Personal Info -->
        <div class="efe-form-section ${!isMultiStep || this.currentStep === 1 ? 'active' : ''}" data-step="1">
          <h2 class="efe-section-title">Personal Information</h2>
          <div class="efe-event-fields-container"></div>
          <div class="efe-form-row">
            <div class="efe-form-group">
              <label class="efe-form-label required">First Name</label>
              <input type="text" class="efe-form-control" name="${this.config.fields.firstName}" required>
              <div class="efe-error-message">Please enter your first name</div>
            </div>
            <div class="efe-form-group">
              <label class="efe-form-label required">Last Name</label>
              <input type="text" class="efe-form-control" name="${this.config.fields.lastName}" required>
              <div class="efe-error-message">Please enter your last name</div>
            </div>
          </div>
          <div class="efe-form-group">
            <label class="efe-form-label required">Email Address</label>
            <input type="email" class="efe-form-control" name="${this.config.fields.email}" required>
            <div class="efe-error-message">Please enter a valid email address</div>
          </div>
          <div class="efe-form-group">
            <label class="efe-form-label">Phone Number</label>
            <input type="tel" class="efe-form-control" name="${this.config.fields.phone}">
            <div class="efe-error-message">Please enter a valid phone number</div>
          </div>
        </div>
        
        <!-- Section 2: Address -->
        <div class="efe-form-section ${!isMultiStep || this.currentStep === 2 ? 'active' : ''}" data-step="2">
          <h2 class="efe-section-title">Address Information</h2>
          <div class="efe-address-section"></div>
        </div>
        
        <!-- Section 3: Church & Service -->
        <div class="efe-form-section ${!isMultiStep || this.currentStep === 3 ? 'active' : ''}" data-step="3">
          <h2 class="efe-section-title">Church & Service Information</h2>
          <div class="efe-form-group">
            <label class="efe-form-label">Church Name</label>
            <input type="text" class="efe-form-control" name="${this.config.fields.church}">
          </div>
          <div class="efe-form-group">
            <label class="efe-form-label required">Are you currently serving with Refuge?</label>
            <div class="efe-radio-group">
              <label class="efe-radio-label">
                <input type="radio" name="${this.config.fields.currentlyServing}" value="Yes" required>
                <span>Yes</span>
              </label>
              <label class="efe-radio-label">
                <input type="radio" name="${this.config.fields.currentlyServing}" value="No" required>
                <span>No</span>
              </label>
            </div>
            <div class="efe-error-message">Please select an option</div>
            <div class="efe-conditional-field" id="servingLocationField">
              <label class="efe-form-label required">Where are you currently serving?</label>
              <div class="efe-multi-select-container">
                <select class="efe-form-control efe-multi-select" name="${this.config.fields.servingLocation}" multiple>
                  ${this.config.lookup.servingAreas.map(item => 
                    `<option value="${item.value}">${this.escapeHtml(item.text)}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="efe-error-message">Please select at least one option</div>
            </div>
          </div>
        </div>
        
        <!-- Section 4: Final Details -->
        <div class="efe-form-section ${!isMultiStep || this.currentStep === 4 ? 'active' : ''}" data-step="4">
          <h2 class="efe-section-title">Final Details</h2>
          <div class="efe-form-group">
            <label class="efe-form-label required">Would you like us to keep you informed on upcoming events?</label>
            <div class="efe-radio-group">
              <label class="efe-radio-label">
                <input type="radio" name="${this.config.fields.keepInformed}" value="Yes" required>
                <span>Yes</span>
              </label>
              <label class="efe-radio-label">
                <input type="radio" name="${this.config.fields.keepInformed}" value="No" required>
                <span>No</span>
              </label>
            </div>
            <div class="efe-error-message">Please select an option</div>
          </div>
          <div class="efe-form-group">
            <label class="efe-form-label required">How did you hear about this Refuge event?</label>
            <div class="efe-multi-select-container">
              <select class="efe-form-control efe-multi-select" name="${this.config.fields.howHeard}" multiple required>
                ${this.config.lookup.howHeard.map(item => 
                  `<option value="${item.value}">${this.escapeHtml(item.text)}</option>`
                ).join('')}
              </select>
            </div>
            <div class="efe-error-message">Please select at least one option</div>
          </div>
          <div class="efe-form-group">
            <label class="efe-form-label required">Do you give Refuge International permission to use your photo in promotional materials?</label>
            <div class="efe-radio-group">
              <label class="efe-radio-label">
                <input type="radio" name="${this.config.fields.photoPermission}" value="Yes" required>
                <span>Yes</span>
              </label>
              <label class="efe-radio-label">
                <input type="radio" name="${this.config.fields.photoPermission}" value="No" required>
                <span>No</span>
              </label>
            </div>
            <div class="efe-error-message">Please select an option</div>
          </div>
        </div>
        
        <!-- Section 5: Payment (if enabled) -->
        ${this.config.payment.enabled ? `
        <div class="efe-form-section ${!isMultiStep || this.currentStep === 5 ? 'active' : ''}" data-step="5">
          <h2 class="efe-section-title">Payment Information</h2>
          ${this.generatePaymentSection()}
        </div>
        ` : ''}
      `;
    }

    generatePaymentSection() {
      const amount = this.config.payment.amount || 0;
      const currency = this.config.payment.currency || 'USD';
      const description = this.config.payment.description || 
                         (this.config.event.eventName ? `Registration for ${this.config.event.eventName}` : 'Event Registration');
      
      const feeHandling = this.config.payment.feeHandling || 'userChoice';
      
      // Calculate fee based on default payment method
      const defaultFeeConfig = this.config.payment.processingFee.card;
      const defaultFee = amount * defaultFeeConfig.rate + defaultFeeConfig.fixed;
      
      // Determine initial total and fee display based on fee handling mode
      let initialTotal = amount;
      let showFeeSection = false;
      let showCheckbox = false;
      let showPaymentMethods = true;
      let showPercentages = true;
      
      switch(feeHandling) {
        case 'alwaysInclude':
          initialTotal = amount + defaultFee;
          showFeeSection = true;
          showCheckbox = false;
          showPaymentMethods = true;
          showPercentages = false;
          break;
        case 'alwaysExclude':
          initialTotal = amount;
          showFeeSection = false;
          showCheckbox = false;
          showPaymentMethods = false;
          showPercentages = false;
          break;
        case 'userChoice':
        default:
          initialTotal = amount;
          showFeeSection = false;
          showCheckbox = true;
          showPaymentMethods = false;
          showPercentages = true;
          break;
      }
      
      return `
        <div class="efe-payment-container dp-card">
          <div class="efe-payment-summary">
            <div class="dp-title">Registration Fee</div>
            <div class="efe-payment-item dp-summary">
              <div>
                <div style="display:flex;justify-content:space-between;gap:12px;">
                  <div>${this.escapeHtml(description)}</div>
                  <div>$${amount.toFixed(2)}</div>
                </div>
                <div style="display:flex;justify-content:space-between;gap:12px;margin-top:6px;" id="payment-fees" ${!showFeeSection ? 'style="display:none;"' : ''}>
                  <div>Processing fees ${feeHandling === 'alwaysExclude' ? '' : '<span id="fee-label"></span>'}</div>
                  <div id="fee-amount">$${showFeeSection ? defaultFee.toFixed(2) : '0.00'}</div>
                </div>
              </div>
            </div>
          </div>
          
          ${showCheckbox ? `
          <div class="dp-card" style="margin-bottom:16px;">
            <div class="dp-fee-checkbox-container" style="margin-bottom:16px;">
              <label class="dp-checkbox-container">
                <input type="checkbox" name="${this.config.fields.coverFees}" id="cover-fees-checkbox" class="dp-checkbox">
                <span style="font-weight:600;">I would like to cover the processing fees</span>
              </label>
            </div>
            
            <div id="payment-method-section" style="display:none;">
              <label class="dp-label">Payment Method</label>
              <div class="dp-payment-grid" id="payment-method-row">
                <button type="button" class="dp-chip dp-payment-chip" data-method="card">
                  <img src="https://js.stripe.com/v3/fingerprinted/img/card-ce24697297bd3c6a00fdd2fb6f760f0d.svg" alt="Card" width="32" height="32" />
                  <span>Credit/Debit Card</span>
                  <small>2.2% + $0.30</small>
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
            </div>
          </div>
          ` : ''}
          
          ${showPaymentMethods && !showCheckbox ? `
          <div class="dp-card" style="margin-bottom:16px;">
            <label class="dp-label">Payment Method</label>
            <div class="dp-payment-grid" id="payment-method-row">
              <button type="button" class="dp-chip dp-payment-chip selected" data-method="card">
                <img src="https://js.stripe.com/v3/fingerprinted/img/card-ce24697297bd3c6a00fdd2fb6f760f0d.svg" alt="Card" width="32" height="32" />
                <span>Credit/Debit Card</span>
                ${showPercentages ? '<small>2.2% + $0.30</small>' : ''}
              </button>
              <button type="button" class="dp-chip dp-payment-chip" data-method="ach">
                <img src="https://js.stripe.com/v3/fingerprinted/img/bank-de5c9ead31505d57120e98291cb20e57.svg" alt="ACH/Bank Transfer" width="32" height="32" />
                <span>Bank Transfer</span>
                ${showPercentages ? '<small>0.8% (max $5)</small>' : ''}
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
                ${showPercentages ? '<small>2.2% + $0.30</small>' : ''}
              </button>
            </div>
          </div>
          ` : ''}
          
          <div class="dp-total-container" style="padding:16px; background:#f8f9fa; border-radius:12px; border:2px solid transparent; transition:all 0.3s ease;" id="payment-total-container">
            <div class="dp-total-amount">
              Total: <span id="total-amount">$${initialTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <input type="hidden" name="${this.config.fields.paymentMethod}" id="payment-method-input" value="card">
          <input type="hidden" name="${this.config.fields.paymentAmount}" value="${amount}">
          
          <div style="text-align:center;font-size:14px;color:#666;margin:12px 0 6px 0;">After clicking "Complete Registration & Pay", you will be taken to Stripe to enter your payment information.</div>
          <div class="dp-trust">🔒 Secure Payment powered by Stripe</div>
        </div>
      `;
    }

    generateNavigation() {
      const submitButtonText = this.config.payment.enabled ? 'Complete Registration & Pay' : 'Submit Registration';
      
      if (!this.config.multiStep) {
        return `
          <div class="efe-form-navigation">
            <button type="submit" class="efe-button efe-button-primary efe-submit-button">
              ${submitButtonText}
            </button>
          </div>
        `;
      }
      
      return `
        <div class="efe-form-navigation">
          <button type="button" class="efe-nav-button efe-button-prev" style="display: ${this.currentStep === 1 ? 'none' : 'block'}">Previous</button>
          <button type="button" class="efe-nav-button efe-button-next" style="display: ${this.currentStep === this.totalSteps ? 'none' : 'block'}">Next</button>
          <button type="submit" class="efe-nav-button efe-button-submit" style="display: ${this.currentStep === this.totalSteps ? 'block' : 'none'}">${submitButtonText}</button>
        </div>
      `;
    }

    initializeSteps() {
      const nextButton = this.container.querySelector('.efe-button-next');
      const prevButton = this.container.querySelector('.efe-button-prev');
      const sections = this.container.querySelectorAll('.efe-form-section');
      
      if (nextButton) {
        nextButton.addEventListener('click', () => {
          const currentSection = this.container.querySelector(`.efe-form-section[data-step="${this.currentStep}"]`);
          if (this.validateSection(currentSection)) {
            this.currentStep++;
            this.showSection(this.currentStep);
          }
        });
      }
      
      if (prevButton) {
        prevButton.addEventListener('click', () => {
          this.currentStep--;
          this.showSection(this.currentStep);
        });
      }
      
      // Handle conditional serving location field
      this.container.querySelectorAll(`input[name="${this.config.fields.currentlyServing}"]`).forEach(radio => {
        radio.addEventListener('change', (e) => {
          const servingLocationField = this.container.querySelector('#servingLocationField');
          const servingLocationSelect = servingLocationField.querySelector('select');

          if (e.target.value === 'Yes') {
            servingLocationField.classList.add('visible');
            servingLocationSelect.required = true;
          } else {
            servingLocationField.classList.remove('visible');
            servingLocationSelect.required = false;
            // Clear selections
            Array.from(servingLocationSelect.selectedOptions).forEach(option => option.selected = false);
          }
        });
      });
    }

    showSection(step) {
      const sections = this.container.querySelectorAll('.efe-form-section');
      const prevButton = this.container.querySelector('.efe-button-prev');
      const nextButton = this.container.querySelector('.efe-button-next');
      const submitButton = this.container.querySelector('.efe-button-submit');
      
      sections.forEach(section => {
        section.classList.remove('active');
      });
      
      const currentSection = this.container.querySelector(`.efe-form-section[data-step="${step}"]`);
      if (currentSection) {
        currentSection.classList.add('active');
      }
      
      // Update navigation
      if (prevButton) {
        prevButton.style.display = step === 1 ? 'none' : 'block';
      }
      
      if (step === this.totalSteps) {
        if (nextButton) nextButton.style.display = 'none';
        if (submitButton) submitButton.style.display = 'block';
      } else {
        if (nextButton) nextButton.style.display = 'block';
        if (submitButton) submitButton.style.display = 'none';
      }
      
      this.updateProgress();
      
      if (this.config.callbacks.onStepChange) {
        this.config.callbacks.onStepChange(step, this.totalSteps);
      }
    }

    updateProgress() {
      const progressFill = this.container.querySelector('.efe-progress-fill');
      const stepIndicators = this.container.querySelectorAll('.efe-step-indicator');
      
      if (progressFill) {
        const progress = ((this.currentStep - 1) / this.totalSteps) * 100;
        progressFill.style.width = `${progress}%`;
      }
      
      stepIndicators.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index + 1 < this.currentStep) {
          step.classList.add('completed');
        } else if (index + 1 === this.currentStep) {
          step.classList.add('active');
        }
      });
    }

    validateSection(section) {
      const inputs = section.querySelectorAll('input[required], select[required]');
      let isValid = true;

      inputs.forEach(input => {
        input.classList.remove('error');

        if (input.required && !this.isFieldValid(input)) {
          isValid = false;
          input.classList.add('error');
        }
      });

      return isValid;
    }

    isFieldValid(input) {
      if (input.type === 'radio') {
        return this.form.querySelector(`input[name="${input.name}"]:checked`) !== null;
      }
      
      if (input.multiple && input.tagName === 'SELECT') {
        return Array.from(input.selectedOptions).length > 0;
      }
      
      if (input.type === 'email') {
        return input.value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value);
      }
      
      if (input.type === 'tel') {
        return !input.value || (/^[\d()-. ]+$/.test(input.value) && input.value.length >= 10);
      }
      
      return input.value && input.value.trim() !== '';
    }

    addEventSummary() {
      const summaryContainer = this.container.querySelector('.efe-event-summary-container') ||
                              this.container;
      
      const summaryHtml = `
        <div class="efe-event-summary">
          <h1>${this.escapeHtml(this.eventSummary.name)}</h1>
          <h2>${this.escapeHtml(this.eventSummary.date)}</h2>
          <h3>${this.escapeHtml(this.eventSummary.timeRange)}</h3>
        </div>
      `;
      
      if (this.container.querySelector('.efe-event-summary-container')) {
        summaryContainer.innerHTML = summaryHtml;
      } else {
        summaryContainer.insertAdjacentHTML('afterbegin', summaryHtml);
      }
    }

    addHiddenFields() {
      const hiddenFields = [
        { name: this.config.fields.eventName, value: this.config.event.eventName },
        { name: this.config.fields.eventDate, value: this.config.event.eventDate },
        { name: this.config.fields.eventTime, value: this.config.event.eventTime },
        { name: this.config.fields.eventLength, value: this.config.event.eventLength }
      ];

      hiddenFields.forEach(field => {
        if (field.value) {
          let input = this.form.querySelector(`input[name="${field.name}"]`);
          if (!input) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = field.name;
            this.form.appendChild(input);
          }
          input.value = field.value;
        }
      });
    }

    addEventFields() {
      const fieldsContainer = this.container.querySelector('.efe-event-fields-container') ||
                             this.container;
      
      const fields = [];
      
      if (!this.config.event.eventName) {
        fields.push(`
          <div class="efe-form-group">
            <label class="efe-form-label required">Event Name</label>
            <input type="text" class="efe-form-control" name="${this.config.fields.eventName}" 
                   value="${this.config.event.eventName || ''}" required>
            <div class="efe-error-message">Please enter the event name</div>
          </div>
        `);
      }
      
      if (!this.config.event.eventDate) {
        fields.push(`
          <div class="efe-form-group">
            <label class="efe-form-label required">Event Date</label>
            <input type="date" class="efe-form-control" name="${this.config.fields.eventDate}" 
                   value="${this.config.event.eventDate || ''}" required>
            <div class="efe-error-message">Please select an event date</div>
          </div>
        `);
      }
      
      if (!this.config.event.eventTime) {
        fields.push(`
          <div class="efe-form-group">
            <label class="efe-form-label required">Event Time</label>
            <input type="time" class="efe-form-control" name="${this.config.fields.eventTime}" 
                   value="${this.config.event.eventTime || ''}" required>
            <div class="efe-error-message">Please select an event time</div>
          </div>
        `);
      }
      
      if (!this.config.event.eventLength) {
        fields.push(`
          <div class="efe-form-group">
            <label class="efe-form-label required">Duration (minutes)</label>
            <input type="number" class="efe-form-control" name="${this.config.fields.eventLength}" 
                   value="${this.config.event.eventLength || ''}" min="1" required>
            <div class="efe-error-message">Please enter the event duration</div>
          </div>
        `);
      }

      if (fields.length > 0) {
        const fieldsHtml = fields.join('');
        if (fieldsContainer.classList && fieldsContainer.classList.contains('efe-event-fields-container')) {
          fieldsContainer.innerHTML = fieldsHtml;
        } else {
          fieldsContainer.insertAdjacentHTML('afterbegin', fieldsHtml);
        }
      }

      // Add hidden fields for provided values
      this.addHiddenFields();
    }

    replaceAddressSection() {
      const addressSection = this.form.querySelector('.efe-address-section') ||
                            this.form.querySelector('[data-address-section]') ||
                            this.findAddressSection();
      
      if (addressSection) {
        this.initializeAddressSection(addressSection);
      }
    }

    findAddressSection() {
      // Try to find existing address fields
      const addressFields = this.form.querySelectorAll('input[name*="address"], input[name*="street"], input[name*="city"]');
      if (addressFields.length > 0) {
        return addressFields[0].closest('.form-section, .efe-form-section, div');
      }
      return null;
    }

    initializeAddressSection(container = null) {
      const addressContainer = container || this.container.querySelector('.efe-address-section');
      if (!addressContainer) return;

      this.addressAutocomplete = new AddressAutocomplete(
        addressContainer,
        this.config.address,
        this.config.callbacks
      );
    }

    bindEvents() {
      if (!this.form) return;

      this.form.addEventListener('submit', this.handleSubmit.bind(this));
      
      // Payment-specific event handlers
      if (this.config.payment.enabled) {
        this.bindPaymentEvents();
      }
    }
    
    bindPaymentEvents() {
      const coverFeesCheckbox = this.container.querySelector('#cover-fees-checkbox');
      const paymentMethodSection = this.container.querySelector('#payment-method-section');
      const paymentMethodRow = this.container.querySelector('#payment-method-row');
      const paymentMethodInput = this.container.querySelector('#payment-method-input');
      const feeHandling = this.config.payment.feeHandling || 'userChoice';
      
      // Handle cover fees checkbox (only for userChoice mode)
      if (coverFeesCheckbox && paymentMethodSection && feeHandling === 'userChoice') {
        coverFeesCheckbox.addEventListener('change', (e) => {
          if (e.target.checked) {
            paymentMethodSection.style.display = 'block';
          } else {
            paymentMethodSection.style.display = 'none';
          }
          this.updatePaymentTotal();
        });
      }
      
      // Handle payment method chip clicks (donation popup style)
      if (paymentMethodRow) {
        paymentMethodRow.addEventListener('click', (e) => {
          const chip = e.target.closest('.dp-payment-chip');
          if (!chip) return;
          
          const method = chip.getAttribute('data-method');
          
          // Update chip selection styling
          paymentMethodRow.querySelectorAll('.dp-payment-chip').forEach(c => {
            c.classList.remove('selected');
          });
          chip.classList.add('selected');
          
          // Update hidden input
          if (paymentMethodInput) {
            paymentMethodInput.value = method;
          }
          
          this.updatePaymentTotal();
        });
      }
      
      // Initialize payment total
      this.updatePaymentTotal();
    }
    
    updatePaymentTotal() {
      const amount = this.config.payment.amount || 0;
      const coverFeesCheckbox = this.container.querySelector('#cover-fees-checkbox');
      const paymentMethodInput = this.container.querySelector('#payment-method-input');
      const feesSection = this.container.querySelector('#payment-fees');
      const feeAmountEl = this.container.querySelector('#fee-amount');
      const totalAmountEl = this.container.querySelector('#total-amount');
      const feeHandling = this.config.payment.feeHandling || 'userChoice';
      
      let fee = 0;
      let total = amount;
      let shouldShowFees = false;
      let shouldIncludeFees = false;
      
      // Determine the current payment method
      let paymentMethod = 'card'; // default
      if (paymentMethodInput) {
        paymentMethod = paymentMethodInput.value || 'card';
      }
      
      const feeConfig = this.config.payment.processingFee[paymentMethod] || this.config.payment.processingFee.card;
      
      // Calculate fee for the current payment method
      if (paymentMethod === 'ach') {
        fee = Math.min(amount * feeConfig.rate, feeConfig.max);
      } else {
        fee = amount * feeConfig.rate + feeConfig.fixed;
      }
      
      // Determine fee inclusion and display based on feeHandling mode
      switch(feeHandling) {
        case 'alwaysInclude':
          shouldIncludeFees = true;
          shouldShowFees = true;
          break;
        case 'alwaysExclude':
          shouldIncludeFees = false;
          shouldShowFees = false;
          break;
        case 'userChoice':
        default:
          shouldIncludeFees = coverFeesCheckbox && coverFeesCheckbox.checked;
          shouldShowFees = shouldIncludeFees;
          break;
      }
      
      // Update total
      if (shouldIncludeFees) {
        total = amount + fee;
      }
      
      // Update display
      if (feesSection && feeAmountEl) {
        if (shouldShowFees) {
          feesSection.style.display = 'block';
          feeAmountEl.textContent = '$' + fee.toFixed(2);
        } else {
          feesSection.style.display = 'none';
        }
      }
      
      if (totalAmountEl) {
        totalAmountEl.textContent = '$' + total.toFixed(2);
      }
    }

    async handleSubmit(e) {
      e.preventDefault();

      if (this.config.callbacks.onSubmitStart) {
        this.config.callbacks.onSubmitStart(this.form);
      }

      // Validate form
      if (!this.validate()) {
        return;
      }

      // Collect form data
      const formData = this.collectFormData();
      
      try {
        const submitButton = this.form.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = 'Submitting...';
        }

        // Submit form
        if (this.config.payment.enabled) {
          const response = await this.processPayment(formData);
        } else {
          const response = await this.submitForm(formData);
        }
        
        if (this.config.callbacks.onSubmitEnd) {
          this.config.callbacks.onSubmitEnd(response);
        }

        // Reset form on success
        this.form.reset();
        if (this.addressAutocomplete) {
          this.addressAutocomplete.isManual = false;
          this.addressAutocomplete.toggleManualEntry();
        }

      } catch (error) {
        console.error('Form submission error:', error);
        
        if (this.config.callbacks.onSubmitEnd) {
          this.config.callbacks.onSubmitEnd(error);
        } else {
          alert('There was an error submitting the form. Please try again.');
        }
      } finally {
        const submitButton = this.form.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = this.config.payment.enabled ? 'Complete Registration & Pay' : 'Submit Registration';
        }
      }
    }

    validate() {
      // For multi-step forms, validate current step only during navigation
      // For submit, validate all steps
      if (this.config.multiStep) {
        return this.validateAllSteps();
      }
      
      return this.validateCurrentForm();
    }
    
    validateCurrentForm() {
      let isValid = true;
      const requiredFields = this.form.querySelectorAll('[required]');
      
      requiredFields.forEach(field => {
        field.classList.remove('error');
        if (!this.isFieldValid(field)) {
          field.classList.add('error');
          isValid = false;
        }
      });

      // Validate address section
      if (this.addressAutocomplete && !this.addressAutocomplete.validate()) {
        isValid = false;
      }

      return isValid;
    }
    
    validateAllSteps() {
      let isValid = true;
      
      for (let step = 1; step <= this.totalSteps; step++) {
        const section = this.container.querySelector(`.efe-form-section[data-step="${step}"]`);
        if (section && !this.validateSection(section)) {
          isValid = false;
          // Show first invalid step
          if (isValid === false && step !== this.currentStep) {
            this.currentStep = step;
            this.showSection(step);
          }
          break;
        }
      }
      
      return isValid;
    }

    validateEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    collectFormData() {
      const formData = new FormData(this.form);
      const data = {};

      // Handle regular fields
      formData.forEach((value, key) => {
        const element = this.form.querySelector(`[name="${key}"]`);
        
        if (element && element.tagName === 'SELECT' && element.multiple) {
          // Handle multi-select fields
          data[key] = Array.from(element.selectedOptions).map(option => option.value);
        } else {
          // Handle regular fields, including radio buttons
          if (data[key] === undefined) {
            data[key] = value;
          } else if (!Array.isArray(data[key])) {
            data[key] = [data[key], value];
          } else {
            data[key].push(value);
          }
        }
      });

      // Add address data if using autocomplete
      if (this.addressAutocomplete) {
        const addressData = this.addressAutocomplete.getFormData();
        Object.assign(data, addressData);
      }

      return data;
    }

    async submitForm(data) {
      if (this.isEnhanceMode) {
        // For enhanced forms, let the existing form handle submission
        return Promise.resolve(data);
      }

      // For full render mode, submit to configured endpoint
      const response = await fetch(this.config.submit.action, {
        method: this.config.submit.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    }

    async processPayment(data) {
      const amount = this.config.payment.amount || 0;
      const coverFeesCheckbox = this.container.querySelector('#cover-fees-checkbox');
      const paymentMethodInput = this.container.querySelector('#payment-method-input');
      const feeHandling = this.config.payment.feeHandling || 'userChoice';
      
      let paymentMethod = 'card';
      if (paymentMethodInput) {
        paymentMethod = paymentMethodInput.value || 'card';
      }
      
      // Determine if fees should be covered based on fee handling mode
      let coverFees = false;
      switch(feeHandling) {
        case 'alwaysInclude':
          coverFees = true;
          break;
        case 'alwaysExclude':
          coverFees = false;
          break;
        case 'userChoice':
        default:
          coverFees = coverFeesCheckbox && coverFeesCheckbox.checked;
          break;
      }
      
      // Calculate total with fees if applicable
      let fee = 0;
      let total = amount;
      
      if (coverFees) {
        const feeConfig = this.config.payment.processingFee[paymentMethod] || this.config.payment.processingFee.card;
        
        if (paymentMethod === 'ach') {
          fee = Math.min(amount * feeConfig.rate, feeConfig.max);
        } else {
          fee = amount * feeConfig.rate + feeConfig.fixed;
        }
        
        total = amount + fee;
      }
      
      // Prepare payment payload for donation API
      const paymentPayload = {
        donationType: 'individual',
        livemode: this.config.payment.liveMode,
        email: data.email,
        phone: data.phone,
        firstname: data.firstName,
        lastname: data.lastName,
        address: {
          line1: data.address1 || '',
          line2: data.address2 || '',
          city: data.city || '',
          state: data.state || '',
          postal_code: data.zipCode || '',
          country: data.country || 'United States'
        },
        amount: Math.round(total * 100), // Convert to cents
        coverFee: coverFees,
        paymentMethod: paymentMethod,
        frequency: 'onetime', // Events are always one-time payments
        category: data.eventName || this.config.event.eventName || 'Event Registration'
      };

      console.log('Processing payment with payload:', paymentPayload);

      // Call the donation API
      const response = await fetch(this.config.payment.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentPayload)
      });

      if (!response.ok) {
        throw new Error(`Payment processing failed: ${response.status} ${response.statusText}`);
      }

      const session = await response.json();
      
      if (!session || !session.id) {
        throw new Error('Invalid payment session response');
      }

      // Redirect to Stripe Checkout
      const stripeKey = this.config.payment.liveMode ? 
                       this.config.payment.stripeKeys.live : 
                       this.config.payment.stripeKeys.test;
      
      if (window.Stripe) {
        const stripe = window.Stripe(stripeKey);
        return stripe.redirectToCheckout({ sessionId: session.id });
      } else {
        throw new Error('Stripe.js not loaded. Please include Stripe.js in your page.');
      }
    }

    escapeHtml(unsafe) {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    destroy() {
      if (this.addressAutocomplete) {
        this.addressAutocomplete.destroy();
      }
      
      if (this.container) {
        this.container.innerHTML = '';
      }
    }
  }

  // Auto-initialize from script tag data attributes
  function autoInit() {
    const scripts = document.querySelectorAll('script[src*="embed-event-form"]');
    scripts.forEach(script => {
      const dataConfig = parseDataAttributes(script);
      const urlConfig = parseUrlParams();
      const config = deepMerge(dataConfig, urlConfig);
      
      if (config.container || config.autoInit !== false) {
        new EventFormEmbed(config);
      }
    });
  }

  // Public API
  window.EventFormEmbed = {
    init: function(config) {
      return new EventFormEmbed(config);
    },
    version: '1.0.0'
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

})(window, document);