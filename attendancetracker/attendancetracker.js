document.addEventListener('DOMContentLoaded', () => {
  window.authorizedUser = {};
  window.pendingChanges = [];
  window.selectedAttendance = [];
  window.viewAttendanceFilters = {};
  let allAttendanceData = [];
  const ENDPOINT = '{{ATENDPOINT}}';
  const today = new Date().toISOString().substring(0,10);
  toastr.options = {
    "closeButton": true,
    "progressBar": true,
    "positionClass": "toast-top-center",
    "timeOut": "3000",
    "showMethod": "fadeIn",
    "hideMethod": "fadeOut",
    "preventDuplicates": true
  };
  function showLoading() {
    document.getElementById('loading-indicator').style.display = 'block';
  }
  function hideLoading() {
    document.getElementById('loading-indicator').style.display = 'none';
  }
  function disableButton(button, newText) {
    button.disabled = true;
    if (newText) {
      button.textContent = newText;
    }
  }
  function enableButton(button, originalText) {
    button.disabled = false;
    if (originalText) {
      button.textContent = originalText;
    }
  }
  function showSection(sectionId) {
    const sections = document.querySelectorAll('.section:not(#registration-section)');
    sections.forEach(section => {
      if (section.id === sectionId) {
        section.classList.add('active');
        updateMinistryHeaders();
      } else {
        section.classList.remove('active');
      }
    });
  }
  function populateSelects() {
    const ministrySelect = document.getElementById('ministry');
    const locationSelect = document.getElementById('location');
    const editAttendeeTypeSelect = document.getElementById('edit-attendee-type');
    const editLevelSelect = document.getElementById('edit-level');
    const editAssessmentScoreSelect = document.getElementById('edit-assessment-score');
    const editClassPlacementSelect = document.getElementById('edit-class-placement');
    if (window.lookup && Array.isArray(window.lookup.servingAreas)) {
      window.lookup.servingAreas.forEach(area => {
        const option = document.createElement('option');
        option.value = area.value;
        option.textContent = area.text;
        ministrySelect.appendChild(option);
      });
    }
    if (window.lookup && Array.isArray(window.lookup.eslLocations)) {
      window.lookup.eslLocations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.value;
        option.textContent = location.text;
        locationSelect.appendChild(option);
      });
    }
    if (window.lookup && Array.isArray(window.lookup.attendeeType)) {
      window.lookup.attendeeType.forEach(type => {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.text;
        editAttendeeTypeSelect.appendChild(option);
      });
    }
    if (window.lookup && Array.isArray(window.lookup.studentLevel)) {
      window.lookup.studentLevel.forEach(level => {
        const option = document.createElement('option');
        option.value = level.value;
        option.textContent = level.text;
        editLevelSelect.appendChild(option);
      });
    }
    if (window.lookup && Array.isArray(window.lookup.assessmentScore)) {
      window.lookup.assessmentScore.forEach(score => {
        const option = document.createElement('option');
        option.value = score.value;
        option.textContent = score.text;
        editAssessmentScoreSelect.appendChild(option);
      });
    }
    if (window.lookup && Array.isArray(window.lookup.classPlacement)) {
      window.lookup.classPlacement.forEach(placement => {
        const option = document.createElement('option');
        option.value = placement.value;
        option.textContent = placement.text;
        editClassPlacementSelect.appendChild(option);
      });
    }
    const stateSelect = document.getElementById('state');
    if (window.lookup && Array.isArray(window.lookup.states)) {
      window.lookup.states.forEach(state => {
        const option = document.createElement('option');
        option.value = state.value;
        option.textContent = state.text;
        stateSelect.appendChild(option);
      });
    }
    stateSelect.value = 'Kentucky';
    const countrySelect = document.getElementById('country');
    if (window.lookup && Array.isArray(window.lookup.countries)) {
      window.lookup.countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.value;
        option.textContent = country.text;
        countrySelect.appendChild(option);
      });
    }
    countrySelect.value = 'United States';
  }
  function handleDateModeChange() {
    const dateMode = document.getElementById('date-mode').value;
    const singleDate = document.getElementById('single-date-container');
    const dateRange = document.getElementById('date-range-container');
    if (dateMode === 'single') {
      singleDate.style.display = 'block';
      dateRange.style.display = 'none';
    } else if (dateMode === 'range') {
      singleDate.style.display = 'none';
      dateRange.style.display = 'block';
    } else {
      singleDate.style.display = 'none';
      dateRange.style.display = 'none';
    }
  }
  function setDefaultValues() {
    document.getElementById('activity-date').value = today;
    document.getElementById('submit-activity-date').value = today;
    document.getElementById('start-date').value = today;
    document.getElementById('end-date').value = today;
    const startTime = document.getElementById('start-time');
    const endTime = document.getElementById('end-time');
    const now = new Date();
    const startHour = String(now.getHours()).padStart(2, '0') + ":00";
    const endHour = String((now.getHours() + 1) % 24).padStart(2, '0') + ":00";
    if (startTime && endTime) {
      startTime.value = startHour;
      endTime.value = endHour;
    }
  }
  window.lastUsedMinistry = '';
  window.lastUsedLocation = '';
  async function handleAuthFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const ministry = document.getElementById('ministry').value;
    const location = document.getElementById('location').value;
    if (!ministry) {
      toastr.error('Please select a Ministry.');
      return;
    }
    if (!location) {
      toastr.error('Please select a Location.');
      return;
    }
    window.lastUsedMinistry = ministry;
    window.lastUsedLocation = location;
    const payload = {
      type: "authorization",
      name,
      ministry,
      location
    };
    const authSubmitButton = e.target.querySelector('button[type="submit"]');
    try {
      disableButton(authSubmitButton, 'Authorizing...');
      showLoading();
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const data = await response.json();
        window.authorizedUser = { name, ministry, location };
        showSection('post-auth-buttons');
        updateMinistryHeaders();
        toastr.success('Authorization successful!');
      } else {
        const errorData = await response.json();
        toastr.error(`Authorization failed: ${errorData.message || 'Unknown error.'}`);
      }
    } catch (error) {
      console.error('Authorization Error:', error);
      toastr.error('An error occurred. Please try again later.');
    } finally {
      hideLoading();
      enableButton(authSubmitButton, 'Log In');
    }
  }
  function handleViewAttendanceClick() {
    const standaloneRegistration = document.getElementById('standalone-registration');
    if (standaloneRegistration) {
      standaloneRegistration.style.display = 'none';
    }
    showSection('view-attendance-form');
  }
  function handleSubmitAttendanceClick() {
    const standaloneRegistration = document.getElementById('standalone-registration');
    if (standaloneRegistration) {
      standaloneRegistration.style.display = 'none';
    }
    showSection('submit-attendance-form');
  }
  function handleNewStudentClick() {
    const standaloneRegistration = document.getElementById('standalone-registration');
    if (standaloneRegistration) {
      standaloneRegistration.style.display = 'none';
    }
    const existingFormSections = document.querySelectorAll('#dynamic-form-section');
    existingFormSections.forEach(section => section.remove());
    let dynamicFormSection = document.createElement('div');
    dynamicFormSection.id = 'dynamic-form-section';
    dynamicFormSection.className = 'section';
    const backButton = document.createElement('button');
    backButton.id = 'back-dynamic-form';
    backButton.className = 'back-button';
    backButton.textContent = 'Back';
    backButton.addEventListener('click', handleBackDynamicForm);
    const formContainer = document.createElement('form');
    formContainer.id = 'dynamicForm';
    dynamicFormSection.appendChild(backButton);
    dynamicFormSection.appendChild(formContainer);
    const attendanceTracker = document.getElementById('attendance-tracker');
    if (attendanceTracker) {
      attendanceTracker.appendChild(dynamicFormSection);
    }
    showSection('dynamic-form-section');
    const loadScripts = () => {
      return new Promise((resolve, reject) => {
        try {
          const oldScripts = document.querySelectorAll('script[src*="eslnetwork-regform.js"], script[src*="form-main.js"]');
          oldScripts.forEach(script => script.remove());
          const regFormScript = document.createElement('script');
          regFormScript.src = 'https://www.refugeintl.org/s/eslnetwork-regform.js';
          regFormScript.onload = () => {
            const formMainScript = document.createElement('script');
            formMainScript.src = 'https://www.refugeintl.org/s/form-main.js';
            formMainScript.onload = () => {
              setTimeout(() => {
                const dynamicFormSection = document.getElementById('dynamic-form-section');
                const form = document.getElementById('dynamicForm');
                if (dynamicFormSection && form) {
                  if (form.parentElement !== dynamicFormSection) {
                    dynamicFormSection.appendChild(form);
                  }
                } else {
                  console.error('Required elements not found:', {
                    dynamicFormSection: !!dynamicFormSection,
                    form: !!form
                  });
                }
              }, 100);
              resolve();
            };
            formMainScript.onerror = reject;
            document.body.appendChild(formMainScript);
          };
          regFormScript.onerror = reject;
          document.body.appendChild(regFormScript);
        } catch (error) {
          reject(error);
        }
      });
    };
    showLoading();
    loadScripts()
      .then(() => {
        if (window.formConfig) {
          window.formConfig.onSuccess = function(response) {
            toastr.success('Student registration completed successfully!');
            handleBackDynamicForm();
          };
          generateForm('dynamicForm', window.formConfig);
          if (window.formConfig.onLoad) {
            window.formConfig.onLoad();
          }
        } else {
          console.error('Form configuration not loaded');
          toastr.error('Failed to load form configuration');
        }
      })
      .catch(error => {
        console.error('Error loading registration form:', error);
        toastr.error('Failed to load registration form');
      })
      .finally(() => {
        hideLoading();
      });
  }
  function handleNewVolunteerClick() {
    const standaloneRegistration = document.getElementById('standalone-registration');
    if (standaloneRegistration) {
      standaloneRegistration.style.display = 'none';
    }
    showNewPersonForm('Volunteer');
  }
  function handleNewChildClick() {
    showNewPersonForm('Child');
  }
  function handleBackNewPerson() {
    document.getElementById('standalone-registration').style.display = 'block';
    resetNewPersonForm();
    if (window.authorizedUser && window.authorizedUser.name) {
      showSection('post-auth-buttons');
    } else {
      showSection('auth-form');
    }
  }
  function handleBackButtonClick() {
    const standaloneRegistration = document.getElementById('standalone-registration');
    if (standaloneRegistration) {
      standaloneRegistration.style.display = 'block';
    }
    resetState();
    showSection('post-auth-buttons');
  }
  function handleCancelViewAttendance() {
    const standaloneRegistration = document.getElementById('standalone-registration');
    if (standaloneRegistration) {
      standaloneRegistration.style.display = 'block';
    }
    showSection('post-auth-buttons');
  }
  function handleCancelSubmitAttendance() {
    const standaloneRegistration = document.getElementById('standalone-registration');
    if (standaloneRegistration) {
      standaloneRegistration.style.display = 'block';
    }
    showSection('post-auth-buttons');
  }
  async function handleAttendanceFormSubmit(e) {
    e.preventDefault();
    const mode = document.getElementById('date-mode').value;
    let payload = {
      type: "viewAttendance",
      name: window.authorizedUser.name,
      ministry: window.authorizedUser.ministry,
      location: window.authorizedUser.location
    };
    if (mode === 'single') {
      const activityDate = document.getElementById('activity-date').value;
      if (!activityDate) {
        toastr.error('Please select a date.');
        return;
      }
      payload.activityDate = activityDate;
      window.viewAttendanceFilters = { activityDate };
    } else if (mode === 'range') {
      const startDate = document.getElementById('start-date').value;
      const endDate = document.getElementById('end-date').value;
      if (!startDate || !endDate) {
        toastr.error('Please select both a start and end date for the range.');
        return;
      }
      payload.startDate = startDate;
      payload.endDate = endDate;
      window.viewAttendanceFilters = { startDate, endDate };
    } else if (mode === 'all') {
      payload.allTime = true;
      window.viewAttendanceFilters = { allTime: true };
    }
    const viewSubmitButton = e.target.querySelector('button[type="submit"]');
    disableButton(viewSubmitButton, 'Loading...');
    console.log('View Attendance Payload:', payload);
    try {
      showLoading();
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      hideLoading();
      console.log('View Attendance Response Status:', response.status);
      console.log('View Attendance Response Headers:', response.headers);
      if (response.status === 200) {
        const attendanceData = await response.json();
        console.log('View Attendance Response Data:', attendanceData);
        allAttendanceData = attendanceData;
        showSection('view-attendance-table-container');
        populateViewAttendanceTable(attendanceData);
        toastr.success('Attendance data retrieved successfully.');
        enableButton(viewSubmitButton, 'View');
      } else {
        const errorData = await response.json();
        console.error('View Attendance Error:', errorData);
        toastr.error(`Failed to retrieve attendance: ${errorData.message || 'Unknown error.'}`);
        enableButton(viewSubmitButton, 'View');
      }
    } catch (error) {
      hideLoading();
      console.error('View Attendance Fetch Error:', error);
      toastr.error('An error occurred while fetching attendance data. Please try again later.');
      enableButton(viewSubmitButton, 'View');
    }
  }
  async function handleSubmitAttendanceFormSubmit(e) {
    e.preventDefault();
    const activityDate = document.getElementById('submit-activity-date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    if (!activityDate || !startTime || !endTime) {
      toastr.error('Please fill in all required fields.');
      return;
    }
    const startDateTimeObj = new Date(`${activityDate}T${startTime}`);
    const endDateTimeObj = new Date(`${activityDate}T${endTime}`);
    if (endDateTimeObj <= startDateTimeObj) {
      toastr.error('End time must be after start time.');
      return;
    }
    const startDateTime = startDateTimeObj.toISOString();
    const endDateTime = endDateTimeObj.toISOString();
    const payload = {
      type: "collectAttendance",
      name: window.authorizedUser.name,
      ministry: window.authorizedUser.ministry,
      location: window.authorizedUser.location,
      startDateTime,
      endDateTime
    };
    const submitAttendanceButton = e.target.querySelector('button[type="submit"]');
    disableButton(submitAttendanceButton, 'Collecting...');
    console.log('Collect Attendance Payload:', payload);
    try {
      showLoading();
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      hideLoading();
      console.log('Collect Attendance Response Status:', response.status);
      console.log('Collect Attendance Response Headers:', response.headers);
      if (response.status === 200) {
        const attendanceData = await response.json();
        console.log('Collect Attendance Response Data:', attendanceData);
        showSection('submit-attendance-table-container');
        populateSubmitAttendanceTable(attendanceData, startDateTime, endDateTime);
        toastr.success('Attendance collection successful.');
        enableButton(submitAttendanceButton, 'Collect Attendance');
      } else {
        const errorData = await response.json();
        console.error('Collect Attendance Error:', errorData);
        toastr.error(`Failed to collect attendance: ${errorData.message || 'Unknown error.'}`);
        enableButton(submitAttendanceButton, 'Collect Attendance');
      }
    } catch (error) {
      hideLoading();
      console.error('Collect Attendance Fetch Error:', error);
      toastr.error('An error occurred while collecting attendance data. Please try again later.');
      enableButton(submitAttendanceButton, 'Collect Attendance');
    }
  }
  async function handleNewPersonFormSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('person-type').value;
    const formData = {
      firstName: document.getElementById('first-name')?.value.trim(),
      lastName: document.getElementById('last-name')?.value.trim(),
      phoneNumber: document.getElementById('phone-number')?.value.trim(),
      email: document.getElementById('email')?.value.trim(),
      birthdate: document.getElementById('birthdate')?.value,
      gender: document.getElementById('gender')?.value,
      street1: document.getElementById('street-1')?.value.trim(),
      street2: document.getElementById('street-2')?.value.trim(),
      city: document.getElementById('city')?.value.trim(),
      state: document.getElementById('state')?.value,
      zip: document.getElementById('zip')?.value.trim(),
      country: document.getElementById('country')?.value,
      emailOptIn: document.getElementById('emailOptIn')?.checked
    };
    const requiredFields = [
      'firstName', 'lastName', 'phoneNumber', 'email',
      'birthdate', 'gender', 'street1', 'city', 'state',
      'zip', 'country'
    ];
    const missingFields = requiredFields.filter(field => !formData[field]);
    if (missingFields.length > 0) {
      toastr.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }
    let ministry = window.authorizedUser.ministry;
    let location = window.authorizedUser.location;
    if (type === 'Volunteer') {
      const ministrySelect = document.getElementById('volunteer-ministry');
      const locationSelect = document.getElementById('volunteer-location');
      if (!ministrySelect?.value || !locationSelect?.value) {
        toastr.error("Please select both Ministry and Location for the volunteer.");
        return;
      }
      window.lastUsedMinistry = ministrySelect.value;
      window.lastUsedLocation = locationSelect.value;
      ministry = ministrySelect.value;
      location = locationSelect.value;
    }
    const payload = {
      type: type === 'Volunteer' ? 'newVolunteer' : 'newPerson',
      name: window.authorizedUser.name || '',
      ministry: ministry,
      location: location,
      personType: type,
      ...formData
    };
    const submitButton = e.target.querySelector('button[type="submit"]');
    disableButton(submitButton, 'Submitting...');
    try {
      showLoading();
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (response.status === 200) {
        const data = await response.json();
        toastr.success(`New ${type} has been created successfully!`);
        resetNewPersonForm();
        const standaloneRegistration = document.getElementById('standalone-registration');
        if (standaloneRegistration) {
          standaloneRegistration.style.display = 'block';
        }
        if (window.authorizedUser && window.authorizedUser.name) {
          showSection('post-auth-buttons');
        } else {
          showSection('auth-form');
        }
      } else {
        const errorData = await response.json();
        toastr.error(`Failed to create new person: ${errorData.message || 'Unknown error.'}`);
        enableButton(submitButton, 'Submit');
      }
    } catch (error) {
      console.error('New Person Fetch Error:', error);
      toastr.error("An error occurred. Please try again later.");
      enableButton(submitButton, 'Submit');
    } finally {
      hideLoading();
    }
  }
  function resetNewPersonForm() {
    const form = document.getElementById('new-person-form');
    if (form) {
      form.reset();
    }
    const submitButton = form?.querySelector('button[type="submit"]');
    if (submitButton) {
      enableButton(submitButton, 'Submit');
    }
    const volunteerFields = document.getElementById('volunteer-fields');
    if (volunteerFields) {
      volunteerFields.style.display = 'none';
    }
    const ministrySelect = document.getElementById('volunteer-ministry');
    const locationSelect = document.getElementById('volunteer-location');
    if (ministrySelect) {
      ministrySelect.innerHTML = '';
      ministrySelect.required = false;
    }
    if (locationSelect) {
      locationSelect.innerHTML = '';
      locationSelect.required = false;
    }

    // Reset form navigation
    const sections = document.querySelectorAll('.form-section');
    sections.forEach(section => {
      section.classList.remove('active');
    });
    const firstSection = document.querySelector('.form-section[data-step="1"]');
    if (firstSection) {
      firstSection.classList.add('active');
    }

    const nextButton = document.querySelector('.button-next');
    const prevButton = document.querySelector('.button-prev');
    const submitFormButton = document.querySelector('.button-submit');
    const progressFill = document.querySelector('.progress-fill');
    const stepIndicators = document.querySelectorAll('.step-indicator');

    if (nextButton) nextButton.style.display = 'block';
    if (prevButton) prevButton.style.display = 'none';
    if (submitFormButton) submitFormButton.style.display = 'none';
    if (progressFill) progressFill.style.width = '0%';
    
    stepIndicators.forEach((step, index) => {
      step.classList.remove('active', 'completed');
      if (index === 0) {
        step.classList.add('active');
      }
    });

    // Remove existing event listeners
    const newNextButton = nextButton?.cloneNode(true);
    const newPrevButton = prevButton?.cloneNode(true);
    if (nextButton && newNextButton) {
      nextButton.parentNode.replaceChild(newNextButton, nextButton);
    }
    if (prevButton && newPrevButton) {
      prevButton.parentNode.replaceChild(newPrevButton, prevButton);
    }
  }

  function initializeFormNavigation() {
    let currentStep = 1;
    const totalSteps = document.querySelectorAll('.form-section').length;
    const nextButton = document.querySelector('.button-next');
    const prevButton = document.querySelector('.button-prev');
    const submitButton = document.querySelector('.button-submit');
    const progressFill = document.querySelector('.progress-fill');
    const stepIndicators = document.querySelectorAll('.step-indicator');

    function updateProgress() {
      const progress = ((currentStep - 1) / totalSteps) * 100;
      progressFill.style.width = `${progress}%`;

      stepIndicators.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index + 1 < currentStep) {
          step.classList.add('completed');
        } else if (index + 1 === currentStep) {
          step.classList.add('active');
        }
      });
    }

    function showFormSection(step) {
      const sections = document.querySelectorAll('.form-section');
      sections.forEach(section => {
        section.classList.remove('active');
      });
      sections[step - 1].classList.add('active');

      prevButton.style.display = step === 1 ? 'none' : 'block';
      if (step === totalSteps) {
        nextButton.style.display = 'none';
        submitButton.style.display = 'block';
      } else {
        nextButton.style.display = 'block';
        submitButton.style.display = 'none';
      }

      updateProgress();
    }

    function validateSection(section) {
      const inputs = section.querySelectorAll('input[required], select[required]');
      let isValid = true;

      // First, hide all error messages in the section
      section.querySelectorAll('.error-message').forEach(msg => {
        msg.style.display = 'none';
      });
      section.querySelectorAll('input, select').forEach(input => {
        input.classList.remove('error');
      });

      inputs.forEach(input => {
        const errorMessage = input.nextElementSibling;
        let fieldValid = true;

        if (input.required && !input.value) {
          fieldValid = false;
        } else if (input.value) {
          // Pattern validation
          if (input.pattern && !new RegExp(input.pattern).test(input.value)) {
            fieldValid = false;
          }

          // Specific field validations
          switch (input.type) {
            case 'email':
              if (!validateEmail(input.value)) {
                fieldValid = false;
              }
              break;
            case 'tel':
              if (!validatePhone(input.value)) {
                fieldValid = false;
              }
              break;
            case 'date':
              if (!validateDate(input.value)) {
                fieldValid = false;
              }
              break;
          }

          // Length validation
          if (input.minLength && input.value.length < input.minLength) {
            fieldValid = false;
          }
        }

        if (!fieldValid) {
          isValid = false;
          input.classList.add('error');
          if (errorMessage && errorMessage.classList.contains('error-message')) {
            errorMessage.style.display = 'block';
          }
        }
      });

      return isValid;
    }

    function validateEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^@\s]+$/.test(email);
    }

    function validatePhone(phone) {
      const digitsOnly = phone.replace(/\D/g, '');
      return digitsOnly.length >= 10;
    }

    function validateDate(date) {
      const selectedDate = new Date(date);
      const today = new Date();
      return selectedDate instanceof Date && !isNaN(selectedDate) && selectedDate <= today;
    }

    if (nextButton) {
      nextButton.addEventListener('click', () => {
        const currentSection = document.querySelector(`.form-section[data-step="${currentStep}"]`);
        if (validateSection(currentSection)) {
          currentStep++;
          showFormSection(currentStep);
        }
      });
    }

    if (prevButton) {
      prevButton.addEventListener('click', () => {
        currentStep--;
        showFormSection(currentStep);
      });
    }

    updateProgress();
  }

  function showNewPersonForm(personType) {
    resetNewPersonForm();
    
    const standaloneRegistration = document.getElementById('standalone-registration');
    if (standaloneRegistration) {
      standaloneRegistration.style.display = 'none';
    }
    const personTypeInput = document.getElementById('person-type');
    if (personTypeInput) {
      personTypeInput.value = personType;
    }
    const formTitle = document.querySelector('#new-person-form-container h2');
    if (formTitle) {
      formTitle.textContent = personType === 'Volunteer' ? 'Add Site Volunteer' : `Add ${personType}`;
    }
    const volunteerFields = document.getElementById('volunteer-fields');
    if (!volunteerFields) {
      console.error('Volunteer fields container not found');
      return;
    }
    if (personType === 'Volunteer') {
      volunteerFields.style.display = 'block';
      const ministrySelect = document.getElementById('volunteer-ministry');
      if (ministrySelect) {
        ministrySelect.innerHTML = '';
        if (window.lookup && Array.isArray(window.lookup.servingAreas)) {
          window.lookup.servingAreas.forEach(area => {
            const option = document.createElement('option');
            option.value = area.value;
            option.textContent = area.text;
            ministrySelect.appendChild(option);
          });
        }
        ministrySelect.required = true;
        if (window.lastUsedMinistry) {
          ministrySelect.value = window.lastUsedMinistry;
        }
      }
      const locationSelect = document.getElementById('volunteer-location');
      if (locationSelect) {
        locationSelect.innerHTML = '';
        if (window.lookup && Array.isArray(window.lookup.eslLocations)) {
          window.lookup.eslLocations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.value;
            option.textContent = location.text;
            locationSelect.appendChild(option);
          });
        }
        locationSelect.required = true;
        if (window.lastUsedLocation) {
          locationSelect.value = window.lastUsedLocation;
        }
      }
    } else {
      volunteerFields.style.display = 'none';
      const ministrySelect = document.getElementById('volunteer-ministry');
      const locationSelect = document.getElementById('volunteer-location');
      if (ministrySelect) ministrySelect.required = false;
      if (locationSelect) locationSelect.required = false;
    }

    showSection('new-person-form-container');
    initializeFormNavigation();
  }
  function populateViewAttendanceTable(data) {
    const tableBody = document.querySelector('#view-attendance-table tbody');
    tableBody.innerHTML = '';
    data.forEach(record => {
      const tr = document.createElement('tr');
      const EventIDTd = document.createElement('td');
      EventIDTd.textContent = record.EventID;
      tr.appendChild(EventIDTd);
      const PersonIDTd = document.createElement('td');
      PersonIDTd.textContent = record.PersonID;
      tr.appendChild(PersonIDTd);
      const attendeeTypeTd = document.createElement('td');
      attendeeTypeTd.textContent = record.AttendeeType || '';
      tr.appendChild(attendeeTypeTd);
      const firstNameTd = document.createElement('td');
      firstNameTd.textContent = record.FirstName || '';
      tr.appendChild(firstNameTd);
      const lastNameTd = document.createElement('td');
      lastNameTd.textContent = record.LastName || '';
      tr.appendChild(lastNameTd);
      const startDateTimeTd = document.createElement('td');
      startDateTimeTd.textContent = record.StartDateTime ? new Date(record.StartDateTime).toLocaleString() : '';
      tr.appendChild(startDateTimeTd);
      const endDateTimeTd = document.createElement('td');
      endDateTimeTd.textContent = record.EndDateTime ? new Date(record.EndDateTime).toLocaleString() : '';
      tr.appendChild(endDateTimeTd);
      const notesTd = document.createElement('td');
      notesTd.textContent = record.Notes || '';
      tr.appendChild(notesTd);
      const levelTd = document.createElement('td');
      levelTd.textContent = record.Level || '';
      tr.appendChild(levelTd);
      const assessmentScoreTd = document.createElement('td');
      assessmentScoreTd.textContent = record.AssessmentScore || '';
      tr.appendChild(assessmentScoreTd);
      const classPlacementTd = document.createElement('td');
      classPlacementTd.textContent = record.ClassPlacement || '';
      tr.appendChild(classPlacementTd);
      const actionsTd = document.createElement('td');
      const editButton = document.createElement('button');
      editButton.textContent = 'Edit';
      editButton.classList.add('edit-button');
      editButton.addEventListener('click', () => openEditModal(record, tr, 'view'));
      actionsTd.appendChild(editButton);
      tr.appendChild(actionsTd);
      tableBody.appendChild(tr);
    });
    if ($.fn.DataTable.isDataTable('#view-attendance-table')) {
      $('#view-attendance-table').DataTable().destroy();
    }
    $('#view-attendance-table').DataTable({
      "paging": true,
      "searching": true,
      "ordering": true,
      "order": [],
      "columnDefs": [
        {
          "visible": false,
          "targets": [0,1]
        },
        {
          "orderable": false,
          "targets": 11
        }
      ],
      "responsive": true
    });
  }
  function populateSubmitAttendanceTable(data, startDateTime, endDateTime) {
    const tableBody = document.querySelector('#submit-attendance-table tbody');
    tableBody.innerHTML = '';
    window.selectedAttendance = [];
    const ministryLocation = document.getElementById('ministry-location');
    if (ministryLocation) {
      ministryLocation.textContent = `${window.authorizedUser.ministry} - ${window.authorizedUser.location}`;
    }
    const sessionInfo = document.getElementById('session-datetime');
    if (sessionInfo) {
      const startDate = new Date(startDateTime);
      const endDate = new Date(endDateTime);
      const dayDate = startDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      const startTime = startDate.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).toLowerCase();
      const endTime = endDate.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).toLowerCase();
      sessionInfo.textContent = `${dayDate} - ${startTime}-${endTime}`;
    }
    data.forEach(record => {
      const tr = document.createElement('tr');
      tr.classList.add('attendance-row-unchecked');
      
      const selectTd = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.addEventListener('change', (e) => {
        handleCheckboxChange(record, startDateTime, endDateTime, e.target.checked);
        const row = e.target.closest('tr');
        const inputs = row.querySelectorAll('input:not([type="checkbox"]), select');
        const checkMessage = row.querySelector('.check-message');
        
        if (e.target.checked) {
          row.classList.remove('attendance-row-unchecked');
          inputs.forEach(input => {
            input.classList.remove('attendance-fields-disabled');
            input.disabled = false;
          });
        } else {
          row.classList.add('attendance-row-unchecked');
          inputs.forEach(input => {
            input.classList.add('attendance-fields-disabled');
            input.disabled = true;
          });
        }
      });
      selectTd.appendChild(checkbox);
      tr.appendChild(selectTd);

      const EventIDTd = document.createElement('td');
      EventIDTd.style.display = 'none';
      EventIDTd.textContent = record.EventID;
      tr.appendChild(EventIDTd);
      const PersonIDTd = document.createElement('td');
      PersonIDTd.style.display = 'none';
      PersonIDTd.textContent = record.PersonID;
      tr.appendChild(PersonIDTd);
      ['AttendeeType', 'FirstName', 'LastName'].forEach(field => {
        const td = document.createElement('td');
        td.textContent = record[field] || '';
        tr.appendChild(td);
      });
      const notesTd = document.createElement('td');
      const notesInput = document.createElement('input');
      notesInput.type = 'text';
      notesInput.value = record.Notes || '';
      notesInput.disabled = true;
      notesInput.classList.add('attendance-fields-disabled');
      notesInput.addEventListener('change', () => {
        updateSelectedAttendance(record.PersonID, 'Notes', notesInput.value);
      });
      notesTd.appendChild(notesInput);
      
      const checkMessage = document.createElement('div');
      checkMessage.className = 'check-message';
      checkMessage.textContent = 'Check box to enable editing';
      notesTd.appendChild(checkMessage);
      
      tr.appendChild(notesTd);

      const fieldConfigs = [
        { 
          id: 'Level', 
          data: window.lookup.studentLevel,
          text: "-- Select Level --"  // Add distinct labels
        },
        { 
          id: 'AssessmentScore', 
          data: window.lookup.assessmentScore,
          text: "-- Select Score --"
        },
        { 
          id: 'ClassPlacement', 
          data: window.lookup.classPlacement,
          text: "-- Select Placement --"
        }
      ];

      fieldConfigs.forEach(config => {
        const td = document.createElement('td');
        const select = document.createElement('select');
        select.disabled = true;
        select.classList.add('attendance-fields-disabled');
        select.setAttribute('data-field', config.id); // Add data attribute to identify field
        
        // Add empty option with specific text
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = config.text;
        select.appendChild(emptyOption);
        
        // Populate options
        if (window.lookup && Array.isArray(config.data)) {
          config.data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.text;
            select.appendChild(option);
          });
        }
        
        // Set value only if it exists in record for this specific field
        const recordValue = record[config.id];
        if (recordValue) {
          select.value = recordValue;
          console.log(`Setting ${config.id} to ${recordValue}`); // Debug log
        }
        
        select.addEventListener('change', (e) => {
          const newValue = e.target.value;
          const fieldId = e.target.getAttribute('data-field');
          updateSelectedAttendance(record.PersonID, fieldId, newValue);
        });
        
        td.appendChild(select);
        tr.appendChild(td);
      });

      tableBody.appendChild(tr);
    });
    if ($.fn.DataTable.isDataTable('#submit-attendance-table')) {
      $('#submit-attendance-table').DataTable().destroy();
    }
    $('#submit-attendance-table').DataTable({
      "paging": true,
      "searching": true,
      "ordering": true,
      "order": [],
      "columnDefs": [
        {
          "visible": false,
          "targets": [1,2]
        },
        {
          "orderable": false,
          "targets": [0, 6, 7, 8, 9]
        }
      ],
      "responsive": true
    });
    document.getElementById('final-submit-attendance-container').style.display = 'block';
  }
  function handleCheckboxChange(record, startDateTime, endDateTime, isChecked) {
    const row = event.target.closest('tr');
    if (isChecked) {
      // Create initial attendance object with exact record values
      const attendance = {
        EventID: record.EventID,
        PersonID: record.PersonID,
        AttendeeType: record.AttendeeType,
        FirstName: record.FirstName,
        LastName: record.LastName,
        StartDateTime: startDateTime,
        EndDateTime: endDateTime,
        Notes: record.Notes || '',
        Level: record.Level || '',
        AssessmentScore: record.AssessmentScore || '',
        ClassPlacement: record.ClassPlacement || ''
      };

      // Get current form values only for fields that have been modified
      const notesInput = row.querySelector('td:nth-child(7) input[type="text"]');
      const levelSelect = row.querySelector('select[data-field="Level"]');
      const assessmentSelect = row.querySelector('select[data-field="AssessmentScore"]');
      const placementSelect = row.querySelector('select[data-field="ClassPlacement"]');

      // Only update if values exist and are different from record
      if (notesInput?.value !== record.Notes) attendance.Notes = notesInput?.value || '';
      if (levelSelect?.value !== record.Level) attendance.Level = levelSelect?.value || '';
      if (assessmentSelect?.value !== record.AssessmentScore) attendance.AssessmentScore = assessmentSelect?.value || '';
      if (placementSelect?.value !== record.ClassPlacement) attendance.ClassPlacement = placementSelect?.value || '';

      window.selectedAttendance.push(attendance);
      row.classList.add('selected-row');
    } else {
      window.selectedAttendance = window.selectedAttendance.filter(att => att.PersonID !== record.PersonID);
      row.classList.remove('selected-row');
    }
    console.log('Current selected attendance:', window.selectedAttendance);
  }
  function updateSelectedAttendance(PersonID, field, value) {
    const attendee = window.selectedAttendance.find(a => a.PersonID === PersonID);
    if (attendee) {
      // Update the existing attendee's field
      attendee[field] = value;
      console.log(`Updated ${field} to ${value} for attendee ${PersonID}`, attendee);
    } else {
      // If attendee not found, find their row and get current values
      const row = document.querySelector(`#submit-attendance-table tr:has(td:nth-child(3)[text()="${PersonID}"])`);
      if (row) {
        const notesInput = row.querySelector('td:nth-child(7) input');
        const levelSelect = row.querySelector('td:nth-child(8) select');
        const assessmentSelect = row.querySelector('td:nth-child(9) select');
        const placementSelect = row.querySelector('td:nth-child(10) select');
        
        // Create new attendance record with current select values
        const attendance = {
          EventID: row.cells[1].textContent,
          PersonID: PersonID,
          AttendeeType: row.cells[3].textContent,
          FirstName: row.cells[4].textContent,
          LastName: row.cells[5].textContent,
          StartDateTime: document.querySelector('#submit-activity-date').value,
          EndDateTime: document.querySelector('#submit-activity-date').value,
          Notes: notesInput ? notesInput.value : '',
          Level: levelSelect ? levelSelect.value : '',
          AssessmentScore: assessmentSelect ? assessmentSelect.value : '',
          ClassPlacement: placementSelect ? placementSelect.value : ''
        };
        
        // Set the newly changed field
        attendance[field] = value;
        
        window.selectedAttendance.push(attendance);
        console.log(`Created new attendance record with ${field}=${value} for attendee ${PersonID}`, attendance);
        
        // Check the checkbox
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (checkbox && !checkbox.checked) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change'));
        }
      }
    }
  }
  function openEditModal(record, tableRow, context) {
    const modal = document.getElementById('edit-modal');
    const closeModal = modal.querySelector('.close-modal');
    const cancelButton = document.getElementById('cancel-edit');
    document.getElementById('edit-EventID').value = record.EventID;
    document.getElementById('edit-PersonID').value = record.PersonID;
    document.getElementById('edit-attendee-type').value = record.AttendeeType || '';
    document.getElementById('edit-first-name').value = record.FirstName || '';
    document.getElementById('edit-last-name').value = record.LastName || '';
    document.getElementById('edit-start-datetime').value = record.StartDateTime ? new Date(record.StartDateTime).toISOString().slice(0,16) : '';
    document.getElementById('edit-end-datetime').value = record.EndDateTime ? new Date(record.EndDateTime).toISOString().slice(0,16) : '';
    document.getElementById('edit-notes').value = record.Notes || '';
    document.getElementById('edit-level').value = record.Level || '';
    document.getElementById('edit-assessment-score').value = record.AssessmentScore || '';
    document.getElementById('edit-class-placement').value = record.ClassPlacement || '';
    modal.dataset.context = context;
    modal.dataset.rowPersonID = record.PersonID;
    modal.classList.add('active');
    modal.style.display = 'block';
    document.getElementById('edit-attendee-type').focus();
    closeModal.onclick = function() {
      closeEditModal();
    }
    cancelButton.onclick = function() {
      closeEditModal();
    }
    window.onclick = function(event) {
      if (event.target == modal) {
        closeEditModal();
      }
    }
    document.getElementById('edit-form').onsubmit = function(e) {
      e.preventDefault();
      const EventID = document.getElementById('edit-EventID').value;
      const PersonID = document.getElementById('edit-PersonID').value;
      const attendeeType = document.getElementById('edit-attendee-type').value.trim();
      const firstName = document.getElementById('edit-first-name').value.trim();
      const lastName = document.getElementById('edit-last-name').value.trim();
      const startDateTime = document.getElementById('edit-start-datetime').value;
      const endDateTime = document.getElementById('edit-end-datetime').value;
      const notes = document.getElementById('edit-notes').value.trim();
      const level = document.getElementById('edit-level').value.trim();
      const assessmentScore = document.getElementById('edit-assessment-score').value;
      const classPlacement = document.getElementById('edit-class-placement').value.trim();
      if (!attendeeType || !firstName || !lastName || !startDateTime || !endDateTime) {
        toastr.error('Please fill in all required fields (Attendee Type, First Name, Last Name, Start Date/Time, End Date/Time).');
        return;
      }
      const updatedRecord = {
        EventID: EventID,
        PersonID: PersonID,
        AttendeeType: attendeeType,
        FirstName: firstName,
        LastName: lastName,
        StartDateTime: new Date(startDateTime).toISOString(),
        EndDateTime: new Date(endDateTime).toISOString(),
        Notes: notes,
        Level: level,
        AssessmentScore: assessmentScore,
        ClassPlacement: classPlacement
      };
      if (context === 'view') {
        const existingChangeIndex = window.pendingChanges.findIndex(change =>
          change.EventID === EventID && change.PersonID === PersonID
        );
        if (existingChangeIndex !== -1) {
          window.pendingChanges[existingChangeIndex] = updatedRecord;
        } else {
          window.pendingChanges.push(updatedRecord);
        }
        const table = $('#view-attendance-table').DataTable();
        const rowIndex = table.row(tableRow).index();
        if (rowIndex !== undefined) {
          const rowData = table.row(rowIndex).data();
          rowData[2] = updatedRecord.AttendeeType || '';
          rowData[3] = updatedRecord.FirstName || '';
          rowData[4] = updatedRecord.LastName || '';
          rowData[5] = updatedRecord.StartDateTime ? new Date(updatedRecord.StartDateTime).toLocaleString() : '';
          rowData[6] = updatedRecord.EndDateTime ? new Date(updatedRecord.EndDateTime).toLocaleString() : '';
          rowData[7] = updatedRecord.Notes || '';
          rowData[8] = updatedRecord.Level || '';
          rowData[9] = updatedRecord.AssessmentScore || '';
          rowData[10] = updatedRecord.ClassPlacement || '';
          const editButtonHtml = '<button class="edit-button">Edit</button>';
          rowData[11] = editButtonHtml;
          table.row(rowIndex).data(rowData).draw(false);
          const updatedRow = table.row(rowIndex).node();
          $(updatedRow).addClass('pending-change');
          $(updatedRow).attr('title', 'This row has unsaved changes. Click "Submit Changes" to save all edits.');
          $(updatedRow).find('.edit-button').on('click', () => openEditModal(updatedRecord, updatedRow, 'view'));
        }
        console.log('Current pending changes:', window.pendingChanges);
        if (window.pendingChanges.length > 0) {
          document.getElementById('submit-changes').style.display = 'block';
        }
        closeEditModal();
        toastr.info(`Record has been edited. There are now ${window.pendingChanges.length} pending changes. Click "Submit Changes" to save all edits.`);
      } else if (context === 'submit') {
        tableRow.cells[2].querySelector('input').value = updatedRecord.AttendeeType;
        tableRow.cells[3].querySelector('input').value = updatedRecord.FirstName;
        tableRow.cells[4].querySelector('input').value = updatedRecord.LastName;
        tableRow.cells[5].textContent = new Date(updatedRecord.StartDateTime).toLocaleString();
        tableRow.cells[6].textContent = new Date(updatedRecord.EndDateTime).toLocaleString();
        tableRow.cells[7].querySelector('input').value = updatedRecord.Notes;
        tableRow.cells[8].querySelector('input').value = updatedRecord.Level;
        tableRow.cells[9].querySelector('input').value = updatedRecord.AssessmentScore;
        tableRow.cells[10].querySelector('input').value = updatedRecord.ClassPlacement;
        const selectedAttendee = window.selectedAttendance.find(att => att.PersonID === PersonID);
        if (selectedAttendee) {
          selectedAttendee.AttendeeType = updatedRecord.AttendeeType;
          selectedAttendee.FirstName = updatedRecord.FirstName;
          selectedAttendee.LastName = updatedRecord.LastName;
          selectedAttendee.StartDateTime = updatedRecord.StartDateTime;
          selectedAttendee.EndDateTime = updatedRecord.EndDateTime;
          selectedAttendee.Notes = updatedRecord.Notes;
          selectedAttendee.Level = updatedRecord.Level;
          selectedAttendee.AssessmentScore = updatedRecord.AssessmentScore;
          selectedAttendee.ClassPlacement = updatedRecord.ClassPlacement;
        }
        closeEditModal();
        toastr.success('Attendance entry has been updated.');
      }
    }
  }
  function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    modal.style.display = 'none';
    modal.classList.remove('active');
  }
  async function handleSubmitChanges() {
    if (window.pendingChanges.length === 0) {
      toastr.warning('There are no changes to submit.');
      return;
    }
    const confirmSubmit = confirm(`You have ${window.pendingChanges.length} unsaved changes. Do you want to submit them?`);
    if (!confirmSubmit) return;
    const submitChangesButton = document.getElementById('submit-changes');
    disableButton(submitChangesButton, 'Submitting...');
    try {
      showLoading();
      const updateResponse = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: "updateAttendance",
          name: window.authorizedUser.name,
          location: window.authorizedUser.location,
          ministry: window.authorizedUser.ministry,
          changes: [...window.pendingChanges]
        })
      });
      if (updateResponse.status === 200) {
        const viewPayload = {
          type: "viewAttendance",
          name: window.authorizedUser.name,
          ministry: window.authorizedUser.ministry,
          location: window.authorizedUser.location,
          ...window.viewAttendanceFilters
        };
        const viewResponse = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(viewPayload)
        });
        if (viewResponse.status === 200) {
          const freshData = await viewResponse.json();
          window.pendingChanges = [];
          submitChangesButton.style.display = 'none';
          if ($.fn.DataTable.isDataTable('#view-attendance-table')) {
            $('#view-attendance-table').DataTable().destroy();
          }
          allAttendanceData = freshData;
          populateViewAttendanceTable(freshData);
          $('#view-attendance-table tbody tr').removeClass('pending-change').removeAttr('title');
          toastr.success('All changes have been submitted successfully.');
        } else {
          const errorData = await viewResponse.json();
          console.error('View Refresh Error:', errorData);
          toastr.warning('Changes saved but table refresh failed. Please reload the page.');
        }
      } else {
        const errorData = await updateResponse.json();
        console.error('Submit Changes Error:', errorData);
        toastr.error(`Failed to submit changes: ${errorData.message || 'Unknown error.'}`);
      }
    } catch (error) {
      console.error('Submit Changes Fetch Error:', error);
      toastr.error('An error occurred while submitting your changes. Please try again later.');
    } finally {
      hideLoading();
      enableButton(submitChangesButton, 'Submit Changes');
    }
  }
  async function handleFinalSubmitAttendance() {
    if (window.selectedAttendance.length === 0) {
      toastr.warning('Please select at least one attendee to submit attendance.');
      return;
    }
    const confirmSubmit = confirm(`You are about to submit attendance for ${window.selectedAttendance.length} attendee(s). Do you want to proceed?`);
    if (!confirmSubmit) return;
    const updatedAttendance = window.selectedAttendance.map(record => {
      const checkbox = Array.from(document.querySelectorAll('#submit-attendance-table tbody input[type="checkbox"]'))
        .find(cb => cb.checked && cb.closest('tr').cells[2].textContent === record.PersonID);
      if (checkbox) {
        const row = checkbox.closest('tr');
        const notesInput = row.querySelector('td:nth-child(7) input');
        const levelSelect = row.querySelector('td:nth-child(8) select');
        const assessmentSelect = row.querySelector('td:nth-child(9) select');
        const placementSelect = row.querySelector('td:nth-child(10) select');
        return {
          ...record,
          Notes: notesInput ? notesInput.value : '',
          Level: levelSelect ? levelSelect.value : '',
          AssessmentScore: assessmentSelect ? assessmentSelect.value : '',
          ClassPlacement: placementSelect ? placementSelect.value : ''
        };
      }
      return record;
    });
    console.log('Final updated attendance array:', updatedAttendance);
    const payload = {
      type: "submitAttendance",
      name: window.authorizedUser.name,
      ministry: window.authorizedUser.ministry,
      location: window.authorizedUser.location,
      attendance: updatedAttendance
    };
    const finalSubmitButton = document.getElementById('final-submit-attendance');
    disableButton(finalSubmitButton, 'Submitting...');
    console.log('Final Submit Attendance Payload:', payload);
    try {
      showLoading();
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      hideLoading();
      if (response.status === 200) {
        const responseData = await response.json();
        console.log('Final Submit Attendance Response Data:', responseData);
        window.selectedAttendance = [];
        resetSubmitAttendanceTable();
        showSection('post-auth-buttons');
        document.getElementById('final-submit-attendance-container').style.display = 'none';
        toastr.success('Attendance has been submitted successfully.');
        enableButton(finalSubmitButton, 'Submit Attendance');
      } else {
        const errorData = await response.json();
        console.error('Final Submit Attendance Error:', errorData);
        toastr.error(`Failed to submit attendance: ${errorData.message || 'Unknown error.'}`);
        enableButton(finalSubmitButton, 'Submit Attendance');
      }
    } catch (error) {
      hideLoading();
      console.error('Final Submit Attendance Fetch Error:', error);
      toastr.error('An error occurred while submitting attendance. Please try again later.');
      enableButton(finalSubmitButton, 'Submit Attendance');
    }
  }
  function handleExportCSV() {
    if (allAttendanceData.length === 0) {
      toastr.warning('No attendance data available to export.');
      return;
    }
    const ministry = window.authorizedUser.ministry;
    const location = window.authorizedUser.location;
    let activityDate = '';
    if (window.viewAttendanceFilters.activityDate) {
      activityDate = window.viewAttendanceFilters.activityDate;
    } else if (window.viewAttendanceFilters.startDate && window.viewAttendanceFilters.endDate) {
      activityDate = `${window.viewAttendanceFilters.startDate}_to_${window.viewAttendanceFilters.endDate}`;
    } else if (window.viewAttendanceFilters.allTime) {
      activityDate = 'All_Time';
    } else {
      activityDate = new Date().toISOString().split('T')[0];
    }
    const csvRows = [];
    csvRows.push([
      "Attendee Type",
      "First Name",
      "Last Name",
      "Start Date/Time",
      "End Date/Time",
      "Notes",
      "Level",
      "Assessment Score",
      "Class Placement"
    ].map(val => `"${val}"`).join(','));
    allAttendanceData.forEach(record => {
      const startDateTime = record.StartDateTime ?
        new Date(record.StartDateTime).toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }).replace(',', '') : '';
      const endDateTime = record.EndDateTime ?
        new Date(record.EndDateTime).toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }).replace(',', '') : '';
      const row = [
        record.AttendeeType || '',
        record.FirstName || '',
        record.LastName || '',
        startDateTime,
        endDateTime,
        record.Notes || '',
        record.Level || '',
        record.AssessmentScore || '',
        record.ClassPlacement || ''
      ].map(val => `"${val.toString().replace(/"/g, '""')}"`);
      csvRows.push(row.join(','));
    });
    const filename = `${ministry} - ${location} Attendance Report - ${activityDate}.csv`;
    const csvFile = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const downloadLink = document.createElement('a');
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toastr.success('Attendance data exported to CSV successfully.');
  }
  function resetState() {
    resetPendingChanges();
    window.pendingChanges = [];
    window.selectedAttendance = [];
    window.viewAttendanceFilters = {};
    allAttendanceData = [];
    document.getElementById('submit-changes').style.display = 'none';
    document.getElementById('final-submit-attendance-container').style.display = 'none';
    resetSubmitAttendanceTable();
    resetViewAttendanceTable();
    const attendanceForm = document.getElementById('attendance-form');
    if (attendanceForm) {
      attendanceForm.reset();
      document.getElementById('activity-date').value = today;
      document.getElementById('start-date').value = today;
      document.getElementById('end-date').value = today;
      handleDateModeChange();
    }
    const submitAttendanceForm = document.getElementById('submit-attendance-form-element');
    if (submitAttendanceForm) {
      submitAttendanceForm.reset();
      document.getElementById('submit-activity-date').value = today;
      document.getElementById('start-time').value = String((new Date()).getHours()).padStart(2, '0') + ":00";
      document.getElementById('end-time').value = String(((new Date()).getHours() + 1) % 24).padStart(2, '0') + ":00";
    }
    resetNewPersonForm();
    const editModal = document.getElementById('edit-modal');
    if (editModal) {
      editModal.style.display = 'none';
      editModal.classList.remove('active');
    }
  }
  function resetViewAttendanceTable() {
    const viewTableBody = document.querySelector('#view-attendance-table tbody');
    if (viewTableBody) viewTableBody.innerHTML = '';
    if ($.fn.DataTable.isDataTable('#view-attendance-table')) {
      $('#view-attendance-table').DataTable().destroy();
    }
  }
  function resetSubmitAttendanceTable() {
    const submitTableBody = document.querySelector('#submit-attendance-table tbody');
    if (submitTableBody) submitTableBody.innerHTML = '';
    if ($.fn.DataTable.isDataTable('#submit-attendance-table')) {
      $('#submit-attendance-table').DataTable().destroy();
    }
    document.getElementById('final-submit-attendance-container').style.display = 'none';
  }
  function resetPendingChanges() {
    window.pendingChanges = [];
    document.getElementById('submit-changes').style.display = 'none';
    const table = $('#view-attendance-table').DataTable();
    table.$('tr.pending-change').removeClass('pending-change').removeAttr('title');
  }
  function handleEscapeKey(e) {
    if (e.key === 'Escape') {
      const modal = document.getElementById('edit-modal');
      if (modal.style.display === 'block') {
        closeEditModal();
      }
    }
  }
  function attachEventListeners() {
    const safeAddEventListener = (elementId, event, handler) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.addEventListener(event, handler);
      }
    };
    const authForm = document.getElementById('auth-form');
    if (authForm) {
      authForm.addEventListener('submit', handleAuthFormSubmit);
    }
    safeAddEventListener('view-attendance', 'click', handleViewAttendanceClick);
    safeAddEventListener('submit-attendance', 'click', handleSubmitAttendanceClick);
    safeAddEventListener('new-student', 'click', handleNewStudentClick);
    safeAddEventListener('new-volunteer', 'click', handleNewVolunteerClick);
    safeAddEventListener('new-child', 'click', handleNewChildClick);
    safeAddEventListener('back-view-form', 'click', handleCancelViewAttendance);
    const viewAttendanceForm = document.getElementById('attendance-form');
    if (viewAttendanceForm) {
      viewAttendanceForm.addEventListener('submit', handleAttendanceFormSubmit);
    }
    safeAddEventListener('back-submit-attendance', 'click', handleCancelSubmitAttendance);
    const submitAttendanceForm = document.getElementById('submit-attendance-form-element');
    if (submitAttendanceForm) {
      submitAttendanceForm.addEventListener('submit', handleSubmitAttendanceFormSubmit);
    }
    safeAddEventListener('back-view-table', 'click', handleBackButtonClick);
    safeAddEventListener('back-submit-table', 'click', handleBackButtonClick);
    safeAddEventListener('back-new-person', 'click', handleBackNewPerson);
    const dateModeSelect = document.getElementById('date-mode');
    if (dateModeSelect) {
      dateModeSelect.addEventListener('change', handleDateModeChange);
    }
    safeAddEventListener('submit-changes', 'click', handleSubmitChanges);
    safeAddEventListener('final-submit-attendance', 'click', handleFinalSubmitAttendance);
    safeAddEventListener('export-csv', 'click', handleExportCSV);
    const newPersonForm = document.getElementById('new-person-form');
    if (newPersonForm) {
      newPersonForm.addEventListener('submit', handleNewPersonFormSubmit);
    }
  }
  function init() {
    if (window.lookup) {
      populateSelects();
    }
    setDefaultValues();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          const backDynamicFormBtn = document.getElementById('back-dynamic-form');
          if (backDynamicFormBtn && !backDynamicFormBtn.hasEventListener) {
            backDynamicFormBtn.addEventListener('click', handleBackDynamicForm);
            backDynamicFormBtn.hasEventListener = true;
          }
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    attachEventListeners();
  }
  function updateMinistryHeaders() {
    const headers = document.querySelectorAll('.ministry-header');
    headers.forEach(header => {
      if (window.authorizedUser && window.authorizedUser.ministry && window.authorizedUser.location) {
        header.style.display = 'block';
        header.querySelector('#ministry-name').textContent = window.authorizedUser.ministry;
        header.querySelector('#location-name').textContent = window.authorizedUser.location;
      } else {
        header.style.display = 'none';
      }
    });
  }
  function showSection(sectionId) {
    const sections = document.querySelectorAll('.section:not(#registration-section)');
    sections.forEach(section => {
      if (section.id === sectionId) {
        section.classList.add('active');
        updateMinistryHeaders();
      } else {
        section.classList.remove('active');
      }
    });
  }
  function handleBackDynamicForm() {
    const formContainer = document.getElementById('dynamicForm');
    if (formContainer) {
      formContainer.innerHTML = '';
    }
    const dynamicFormSection = document.getElementById('dynamic-form-section');
    if (dynamicFormSection) {
      dynamicFormSection.remove();
    }
    const standaloneRegistration = document.getElementById('standalone-registration');
    if (standaloneRegistration) {
      standaloneRegistration.style.display = 'block';
    }
    if (window.authorizedUser && window.authorizedUser.name) {
      showSection('post-auth-buttons');
    } else {
      showSection('auth-form');
    }
  }
  init();
  document.addEventListener('keydown', handleEscapeKey);
});