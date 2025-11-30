(function() {
  'use strict';

  if (window.AttendanceTrackerLoaded) {
    return;
  }
  window.AttendanceTrackerLoaded = true;

  const SCRIPT_ELEMENT = document.currentScript;
  const BASE_URL = 'https://mprefuge.github.io/site-assets';
  const CACHE_BUST = 'v=' + Date.now();
  
  const CSS_DEPENDENCIES = [
    'https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css',
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&family=Roboto&display=swap',
    `${BASE_URL}/styles/attendancetracker.css?${CACHE_BUST}`,
    `${BASE_URL}/styles/form-styles.css?${CACHE_BUST}`
  ];

  const JS_DEPENDENCIES = [
    { src: 'https://code.jquery.com/jquery-3.6.0.min.js', test: () => typeof jQuery !== 'undefined' },
    { src: 'https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js', test: () => typeof jQuery !== 'undefined' && jQuery.fn.DataTable },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js', test: () => typeof toastr !== 'undefined' },
    { src: `${BASE_URL}/scripts/lookup.js?${CACHE_BUST}`, test: () => typeof window.lookup !== 'undefined' },
    { src: `${BASE_URL}/attendancetracker/attendancetracker.js?${CACHE_BUST}`, test: () => true }
  ];

  const HTML_TEMPLATE = `
<a href="#attendance-tracker" class="skip-link">Skip to main content</a>

<div id="attendance-tracker" role="main" aria-label="Attendance Tracker Application">
  <form id="auth-form" class="section active" aria-labelledby="auth-form-title">
    <h1 id="auth-form-title">Login to Track Attendance</h1>
    <div class="form-group">
      <label for="name">Name:<span class="required-indicator" aria-hidden="true">*</span></label>
      <input type="text" id="name" name="name" required aria-required="true" autocomplete="name" placeholder="Enter your full name" />
    </div>
    <div class="form-group">
      <label for="ministry">Ministry:<span class="required-indicator" aria-hidden="true">*</span></label>
      <select id="ministry" name="ministry" required aria-required="true">
        <option value="">-- Select Ministry --</option>
      </select>
    </div>
    <div class="form-group">
      <label for="location">Location:<span class="required-indicator" aria-hidden="true">*</span></label>
      <select id="location" name="location" required aria-required="true">
        <option value="">-- Select Location --</option>
      </select>
    </div>
    <button type="submit" aria-describedby="login-help">Log In</button>
    <p id="login-help" class="help-text"><span class="required-indicator">*</span> Required fields</p>
  </form>

  <div id="standalone-registration" role="region" aria-labelledby="registration-title">
    <h2 id="registration-title">New Registration</h2>
    <p>Need to register? Select one of the options below:</p>
    <div class="button-group">
      <button type="button" id="new-student" aria-label="Register a new student">
        <span class="button-icon" aria-hidden="true">📚</span> New Student
      </button>
      <button type="button" id="new-volunteer" aria-label="Register a new site volunteer">
        <span class="button-icon" aria-hidden="true">🤝</span> New Site Volunteer
      </button>
    </div>
  </div>

  <div id="post-auth-buttons" class="button-group section">
    <h2>Attendance Management</h2>
    <h3>Select an option below to either view existing attendance records or submit attendance for a specific date and time.</h3>
    <div class="button-group">
      <button id="view-attendance">View Attendance</button>
      <button id="submit-attendance">Submit Attendance</button>
    </div>
  </div>

  <div id="new-person-form-container" class="section">
    <h2>Add New Person</h2>
    <form id="new-person-form">
      <input type="hidden" id="person-type" name="person-type" value="" />
      
      <div class="progress-bar">
        <div class="progress-fill" style="width: 0%"></div>
      </div>

      <div class="progress-steps">
        <div class="step-indicator active"></div>
        <div class="step-indicator"></div>
        <div class="step-indicator"></div>
      </div>

      <!-- Section 1: Ministry Information (for volunteers) -->
      <div class="form-section active" data-step="1">
        <h3>Ministry Information</h3>
        <div id="volunteer-fields" style="display: none;">
          <div class="form-group">
            <label for="volunteer-ministry">Ministry:</label>
            <select id="volunteer-ministry" name="ministry">
            </select>
            <div class="error-message">Please select a ministry</div>
          </div>
          <div class="form-group">
            <label for="volunteer-location">Location:</label>
            <select id="volunteer-location" name="location">
            </select>
            <div class="error-message">Please select a location</div>
          </div>
        </div>
      </div>

      <!-- Section 2: Personal Information -->
      <div class="form-section" data-step="2">
        <h3>Personal Information</h3>
        <div class="form-group">
          <label for="first-name">First Name:<span class="required-indicator" aria-hidden="true">*</span></label>
          <input type="text" id="first-name" name="firstName" required pattern="[A-Za-z-' ]+" minlength="2" autocomplete="given-name" placeholder="Enter first name" />
          <div class="error-message" role="alert">Please enter a valid first name (letters, hyphens, and apostrophes only)</div>
        </div>
        <div class="form-group">
          <label for="last-name">Last Name:<span class="required-indicator" aria-hidden="true">*</span></label>
          <input type="text" id="last-name" name="lastName" required pattern="[A-Za-z-' ]+" minlength="2" autocomplete="family-name" placeholder="Enter last name" />
          <div class="error-message" role="alert">Please enter a valid last name (letters, hyphens, and apostrophes only)</div>
        </div>
        <div class="form-group">
          <label for="email">Email:<span class="required-indicator" aria-hidden="true">*</span></label>
          <input type="email" id="email" name="email" required pattern="[^@\\s]+@[^@\\s]+\\.[^@\\s]+" autocomplete="email" placeholder="example@email.com" />
          <div class="error-message" role="alert">Please enter a valid email address</div>
        </div>
        <div class="form-group">
          <label for="phone-number">Phone Number:<span class="required-indicator" aria-hidden="true">*</span></label>
          <input type="tel" id="phone-number" name="phoneNumber" required pattern="[0-9()-. ]+" minlength="10" autocomplete="tel" placeholder="(555) 123-4567" />
          <div class="error-message" role="alert">Please enter a valid phone number (at least 10 digits)</div>
        </div>
        <div class="form-group">
          <label for="birthdate">Birthdate:<span class="required-indicator" aria-hidden="true">*</span></label>
          <input type="date" id="birthdate" name="birthdate" required aria-describedby="birthdate-help" />
          <div id="birthdate-help" class="help-text">Date cannot be in the future</div>
          <div class="error-message" role="alert">Please enter a valid birthdate (cannot be in the future)</div>
        </div>
        <div class="form-group">
          <label for="gender">Gender:</label>
          <select id="gender" name="gender" required>
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <div class="error-message">Please select a gender</div>
        </div>
      </div>

      <!-- Section 3: Address -->
      <div class="form-section" data-step="3">
        <h3>Address Information</h3>
        <div class="form-group">
          <label for="street-1">Street Address:<span class="required-indicator" aria-hidden="true">*</span></label>
          <input type="text" id="street-1" name="street1" required minlength="5" autocomplete="address-line1" placeholder="123 Main Street" />
          <div class="error-message" role="alert">Please enter a valid street address</div>
        </div>
        <div class="form-group">
          <label for="street-2">Apartment/Suite/Unit (Optional):</label>
          <input type="text" id="street-2" name="street2" autocomplete="address-line2" placeholder="Apt 4B" />
        </div>
        <div class="form-group">
          <label for="city">City:<span class="required-indicator" aria-hidden="true">*</span></label>
          <input type="text" id="city" name="city" required pattern="[A-Za-z- ]+" minlength="2" autocomplete="address-level2" placeholder="Louisville" />
          <div class="error-message" role="alert">Please enter a valid city name</div>
        </div>
        <div class="form-group">
          <label for="state">State:</label>
          <select id="state" name="state" required>
            <option value="">Select State</option>
          </select>
          <div class="error-message">Please select a state</div>
        </div>
        <div class="form-group">
          <label for="zip">ZIP Code:<span class="required-indicator" aria-hidden="true">*</span></label>
          <input type="text" id="zip" name="zip" required pattern="[0-9]{5}(-[0-9]{4})?" autocomplete="postal-code" placeholder="40202" />
          <div class="error-message" role="alert">Please enter a valid ZIP code (12345 or 12345-6789)</div>
        </div>
        <div class="form-group">
          <label for="country">Country:</label>
          <select id="country" name="country" required>
            <option value="">Select Country</option>
          </select>
          <div class="error-message">Please select a country</div>
        </div>
        <div class="form-group">
          <input type="checkbox" id="emailOptIn" name="emailUpdates" checked style="width: auto; margin-right: 10px;">
          <label for="emailOptIn" style="display: inline;">I would like to receive occasional email updates and announcements related to Refuge International</label>
        </div>
      </div>

      <div class="form-navigation">
        <button type="button" class="nav-button button-prev" style="display: none">Previous</button>
        <button type="button" class="nav-button button-next">Next</button>
        <button type="submit" class="nav-button button-submit" style="display: none">Submit</button>
      </div>
    </form>
    <button class="back-button" id="back-new-person">Back to Main Menu</button>
  </div>

  <div id="view-attendance-form" class="section">
    <h2>View Attendance Records</h2>
    <h3>Select a Single Date, Date Range, or All Time</h3>
    <p>Use the options below to filter attendance records. You can view records for a single date, a date range, or all time if you prefer no date filtering.</p>
    <form id="attendance-form">
      <div>
        <label for="date-mode">Date Mode:</label>
        <select id="date-mode" name="date-mode" required aria-required="true">
          <option value="single">Single Date</option>
          <option value="range">Date Range</option>
          <option value="all">All Time</option>
        </select>
      </div>
      <div id="single-date-container">
        <label for="activity-date">Select Date:</label>
        <input type="date" id="activity-date" name="activity-date" />
      </div>
      <div id="date-range-container" style="display: none;">
        <div>
          <label for="start-date">Start Date:</label>
          <input type="date" id="start-date" name="start-date" />
        </div>
        <div>
          <label for="end-date">End Date:</label>
          <input type="date" id="end-date" name="end-date" />
        </div>
      </div>
      <button type="submit">View</button>
      <button type="button" id="back-view-form" class="secondary-button">Back</button>
    </form>
  </div>

  <div id="submit-attendance-form" class="section">
    <h2>Submit Attendance</h2>
    <h3>Record Attendance for a Specific Date & Time</h3>
    <p>Please choose the date and specify the start and end times for the session. Then, you can select attendees and add notes before submitting.</p>
    <form id="submit-attendance-form-element">
      <div>
        <label for="submit-activity-date">Date:</label>
        <input type="date" id="submit-activity-date" name="submit-activity-date" required aria-required="true" />
      </div>
      <div>
        <label for="start-time">Start Time:</label>
        <input type="time" id="start-time" name="start-time" required aria-required="true" step="900" />
      </div>
      <div>
        <label for="end-time">End Time:</label>
        <input type="time" id="end-time" name="end-time" required aria-required="true" step="900" />
      </div>
      <button type="submit">Collect Attendance</button>
      <button type="button" id="back-submit-attendance" class="secondary-button">Back</button>
    </form>
  </div>

  <div id="view-attendance-table-container" class="section">
    <h2>Attendance Records</h2>
    <p>Below is a list of attendance records based on your selected filters. Use the search box or column sorting to find specific records. You can edit them and then submit changes if needed.</p>
    <table id="view-attendance-table" class="display" style="width:100%">
      <thead>
        <tr>
          <th style="display: none;">EventID</th>
          <th style="display: none;">PersonID</th>
          <th>Attendee Type</th>
          <th>First Name</th>
          <th>Last Name</th>
          <th>Start DateTime</th>
          <th>End DateTime</th>
          <th>Notes</th>
          <th>Level</th>
          <th>Assessment Score</th>
          <th>Class Placement</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    </table>
    <button id="submit-changes" class="submit-changes-button" style="display: none;">Submit Changes</button>
    <div class="button-container">
      <button class="export-button" id="export-csv">Export Report</button>
      <button class="back-button" id="back-view-table">Back</button>
    </div>
  </div>

  <div id="submit-attendance-table-container" class="section">
    <div class="session-info">
      <h1 id="ministry-location"></h1>
      <h2 id="session-datetime"></h2>
    </div>
    <p>Select the attendees you wish to include for the chosen date and time. You can also add notes, level, assessment score, and class placement for each attendee before final submission.</p>
    <table id="submit-attendance-table" class="display" style="width:100%">
      <thead>
        <tr>
          <th>Present</th>
          <th style="display: none;">EventID</th>
          <th style="display: none;">PersonID</th>
          <th>Attendee Type</th>
          <th>First Name</th>
          <th>Last Name</th>
          <th>Notes</th>
          <th>Level</th>
          <th>Assessment Score</th>
          <th>Class Placement</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    </table>
    <div id="final-submit-attendance-container" style="display: none; margin-top: 20px;">
      <button id="final-submit-attendance">Submit Attendance</button>
      <button class="back-button" id="back-submit-table">Back</button>
    </div>
  </div>

  <div id="loading-indicator" role="status" aria-live="polite" aria-label="Loading content">
    <div class="loading-spinner" aria-hidden="true"></div>
    <p id="loading-message">Loading...</p>
  </div>
</div>

<div id="edit-modal" class="modal" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
  <div class="modal-content">
    <span class="close-modal" role="button" tabindex="0" aria-label="Close modal (Press Escape)">&times;</span>
    <h2 id="edit-modal-title">Edit Attendance Record</h2>
    <p class="modal-hint"><kbd>Esc</kbd> to close</p>
    <form id="edit-form">
      <input type="hidden" id="edit-EventID" name="EventID" />
      <input type="hidden" id="edit-PersonID" name="PersonID" />
      <div>
        <label for="edit-attendee-type">Attendee Type:</label>
        <select id="edit-attendee-type" name="attendeeType" required aria-required="true">
        </select>
      </div>
      <div>
        <label for="edit-first-name">First Name:</label>
        <input type="text" id="edit-first-name" name="firstName" required aria-required="true" />
      </div>
      <div>
        <label for="edit-last-name">Last Name:</label>
        <input type="text" id="edit-last-name" name="lastName" required aria-required="true" />
      </div>
      <div>
        <label for="edit-start-datetime">Start Date/Time:</label>
        <input type="datetime-local" id="edit-start-datetime" name="startDateTime" required aria-required="true" />
      </div>
      <div>
        <label for="edit-end-datetime">End Date/Time:</label>
        <input type="datetime-local" id="edit-end-datetime" name="endDateTime" required aria-required="true" />
      </div>
      <div>
        <label for="edit-notes">Notes:</label>
        <textarea id="edit-notes" name="notes" rows="3"></textarea>
      </div>
      <div>
        <label for="edit-level">Level:</label>
        <select id="edit-level" name="level">
        </select>
      </div>
      <div>
        <label for="edit-assessment-score">Assessment Score:</label>
        <select id="edit-assessment-score" name="assessmentScore">
        </select>
      </div>
      <div>
        <label for="edit-class-placement">Class Placement:</label>
        <select id="edit-class-placement" name="classPlacement">
        </select>
      </div>
      <button type="submit">Save Changes</button>
      <button type="button" id="cancel-edit" class="secondary-button">Cancel</button>
    </form>
  </div>
</div>
`;

  function loadCSS(href) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`link[href="${href}"]`)) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
      document.head.appendChild(link);
    });
  }

  function loadScript(src, testFn) {
    return new Promise((resolve, reject) => {
      if (testFn && testFn()) {
        resolve();
        return;
      }

      function waitForTest(callback, timeout = 10000) {
        if (!testFn) {
          callback();
          return;
        }
        const startTime = Date.now();
        const checkLoaded = setInterval(() => {
          if (testFn()) {
            clearInterval(checkLoaded);
            callback();
          } else if (Date.now() - startTime > timeout) {
            clearInterval(checkLoaded);
            callback();
          }
        }, 50);
      }

      if (document.querySelector(`script[src="${src}"]`)) {
        waitForTest(resolve);
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => {
        waitForTest(resolve);
      };
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.body.appendChild(script);
    });
  }

  async function loadAllCSS() {
    const promises = CSS_DEPENDENCIES.map(href => loadCSS(href));
    await Promise.all(promises);
  }

  async function loadAllJS() {
    for (const dep of JS_DEPENDENCIES) {
      await loadScript(dep.src, dep.test);
    }
  }

  function injectHTML(insertionPoint) {
    let container = document.createElement('div');
    container.id = 'attendance-tracker-container';

    if (insertionPoint && insertionPoint.parentNode) {
      insertionPoint.parentNode.insertBefore(container, insertionPoint.nextSibling);
    } else {
      document.body.appendChild(container);
    }

    container.innerHTML = HTML_TEMPLATE;
  }

  function showInitialLoading(insertionPoint) {
    let loadingDiv = document.createElement('div');
    loadingDiv.id = 'attendance-tracker-initial-loading';
    loadingDiv.innerHTML = `
      <style>
        #attendance-tracker-initial-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          font-family: 'Roboto', sans-serif;
        }
        #attendance-tracker-initial-loading .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #BD2135;
          border-radius: 50%;
          animation: att-spin 1s linear infinite;
        }
        @keyframes att-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        #attendance-tracker-initial-loading p {
          margin-top: 15px;
          color: #333;
        }
      </style>
      <div class="spinner"></div>
      <p>Loading Attendance Tracker...</p>
    `;

    if (insertionPoint && insertionPoint.parentNode) {
      insertionPoint.parentNode.insertBefore(loadingDiv, insertionPoint.nextSibling);
    } else {
      document.body.appendChild(loadingDiv);
    }

    return loadingDiv;
  }

  function hideInitialLoading(loadingDiv) {
    if (loadingDiv && loadingDiv.parentNode) {
      loadingDiv.parentNode.removeChild(loadingDiv);
    }
  }

  function populateDropdowns() {
    if (!window.lookup) {
      console.error('lookup.js not loaded');
      return;
    }
    
    const ministrySelect = document.getElementById('ministry');
    const locationSelect = document.getElementById('location');
    
    if (ministrySelect && window.lookup.servingAreas) {
      window.lookup.servingAreas.forEach(area => {
        const option = document.createElement('option');
        option.value = area.value;
        option.textContent = area.text;
        ministrySelect.appendChild(option);
      });
    }
    
    if (locationSelect && window.lookup.eslLocations) {
      window.lookup.eslLocations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.value;
        option.textContent = location.text;
        locationSelect.appendChild(option);
      });
    }
    
    const stateSelect = document.getElementById('state');
    if (stateSelect && window.lookup.states) {
      window.lookup.states.forEach(state => {
        const option = document.createElement('option');
        option.value = state.value;
        option.textContent = state.text;
        stateSelect.appendChild(option);
      });
      stateSelect.value = 'Kentucky';
    }
    
    const countrySelect = document.getElementById('country');
    if (countrySelect && window.lookup.countries) {
      window.lookup.countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.value;
        option.textContent = country.text;
        countrySelect.appendChild(option);
      });
      countrySelect.value = 'United States';
    }
    
    const editAttendeeTypeSelect = document.getElementById('edit-attendee-type');
    if (editAttendeeTypeSelect && window.lookup.attendeeType) {
      window.lookup.attendeeType.forEach(type => {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.text;
        editAttendeeTypeSelect.appendChild(option);
      });
    }
    
    const editLevelSelect = document.getElementById('edit-level');
    if (editLevelSelect && window.lookup.studentLevel) {
      window.lookup.studentLevel.forEach(level => {
        const option = document.createElement('option');
        option.value = level.value;
        option.textContent = level.text;
        editLevelSelect.appendChild(option);
      });
    }
    
    const editAssessmentScoreSelect = document.getElementById('edit-assessment-score');
    if (editAssessmentScoreSelect && window.lookup.assessmentScore) {
      window.lookup.assessmentScore.forEach(score => {
        const option = document.createElement('option');
        option.value = score.value;
        option.textContent = score.text;
        editAssessmentScoreSelect.appendChild(option);
      });
    }
    
    const editClassPlacementSelect = document.getElementById('edit-class-placement');
    if (editClassPlacementSelect && window.lookup.classPlacement) {
      window.lookup.classPlacement.forEach(placement => {
        const option = document.createElement('option');
        option.value = placement.value;
        option.textContent = placement.text;
        editClassPlacementSelect.appendChild(option);
      });
    }
  }

  async function initialize() {
    const loadingDiv = showInitialLoading(SCRIPT_ELEMENT);

    try {
      await loadAllCSS();
      injectHTML(loadingDiv);
      await loadAllJS();
      populateDropdowns();
      hideInitialLoading(loadingDiv);
      document.dispatchEvent(new CustomEvent('attendanceTrackerReady'));

    } catch (error) {
      console.error('Failed to initialize Attendance Tracker:', error);
      hideInitialLoading(loadingDiv);
      
      const container = document.getElementById('attendance-tracker-container');
      if (container) {
        container.innerHTML = `
          <div style="padding: 20px; background: #fee; border: 1px solid #c00; border-radius: 8px; margin: 20px;">
            <h3 style="color: #c00; margin: 0 0 10px;">Failed to Load Attendance Tracker</h3>
            <p style="margin: 0;">Please refresh the page or contact support if the problem persists.</p>
            <p style="margin: 10px 0 0; font-size: 12px; color: #666;">Error: ${error.message}</p>
          </div>
        `;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
