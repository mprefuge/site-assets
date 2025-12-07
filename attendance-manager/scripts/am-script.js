  (function () {
    'use strict';

    // ============================================
    // CONFIGURATION - Update this with your API URL
    // ============================================
    const API_BASE_URL = 'https://attendancetrackerfa.azurewebsites.net/api'; // 'http://localhost:7071/api'; //Change to your Azure Function URL in production
    // Organization logo used in UI and exported files
    const ORG_LOGO_URL = 'https://images.squarespace-cdn.com/content/v1/5af0bc3a96d45593d7d7e55b/c8c56eb8-9c50-4540-822a-5da3f5d0c268/refuge-logo-edit+%28circle+with+horizontal+RI+name%29+-+small.png';
    // Example: const API_BASE_URL = 'https://your-function-app.azurewebsites.net/api';

    // ============================================
    // STATE
    // ============================================
    let currentUser = null;
    let attendeesData = [];
    // currently selected attendee type filter (All / Student / Volunteer / Child)
    let selectedAttendeeTypeFilter = 'All';
    let recordsData = [];
    // cache raw records for the currently fetched date range so type filters can be applied client-side
    let recordsDataRaw = [];
    let lastViewQueryKey = '';

    // ============================================
    // DOM ELEMENTS
    // ============================================
    const $ = (id) => document.getElementById(id);
    const $$ = (selector) => document.querySelectorAll(selector);

    // Auth elements
    const authSection = $('att-auth-section');
    const mainSection = $('att-main-section');
    const authBtn = $('att-auth-btn');
    const authSpinner = $('att-auth-spinner');
    const authBtnText = $('att-auth-btn-text');
    const authError = $('att-auth-error');
    const logoutBtn = $('att-logout-btn');
    const userMenuWrapper = $('att-user-menu-wrapper');
    const userMenuBtn = $('att-user-menu-btn');
    const userMenu = $('att-user-menu');
    // tracks whether the menu was explicitly opened via click (so it should persist until clicked closed)
    let userMenuOpenByClick = false;

    // Tab elements
    const tabs = $$('.att-tab');
    const tabContents = $$('.att-tab-content');

    // Collect attendance elements
    const loadError = $('att-load-error');
    const attendeesSection = $('att-attendees-section');
    const attendeesContainer = $('att-attendees-container');
    const searchInput = $('att-search-attendees');
    const typeFilterAllBtn = $('att-filter-type-all');
    const typeFilterStudentsBtn = $('att-filter-type-students');
    const typeFilterVolunteersBtn = $('att-filter-type-volunteers');
    const typeFilterChildrenBtn = $('att-filter-type-children');
    const selectAllCheckbox = $('att-select-all-checkbox');
    const selectAllContainer = document.querySelector('.att-select-all');
    const selectedCount = $('att-selected-count');
    const submitBtn = $('att-submit-attendance-btn');
    const submitSpinner = $('att-submit-spinner');
    const submitBtnText = $('att-submit-btn-text');
    const submitSuccess = $('att-submit-success');
    const submitError = $('att-submit-error');

    // Event configuration elements
    const eventNameInput = $('att-event-name');
    const eventLocationInput = $('att-event-location');
    const eventDaySelect = $('att-event-day');
    const eventStartTimeInput = $('att-event-start-time');
    const eventEndTimeInput = $('att-event-end-time');
    const eventDescriptionTextarea = $('att-event-description');
    const saveConfigBtn = $('att-save-config-btn');
    const saveConfigSpinner = $('att-save-config-spinner');
    const saveConfigBtnText = $('att-save-config-btn-text');
    const resetConfigBtn = $('att-reset-config-btn');
    const configSuccess = $('att-config-success');
    const configError = $('att-config-error');
    // Temporary override used for a single submission when editing inline in the collect page
    let temporaryEventConfig = null;

    // View records elements
    const viewRecordsBtn = $('att-view-records-btn');
    const viewSpinner = $('att-view-spinner');
    const viewBtnText = $('att-view-btn-text');
    const viewError = $('att-view-error');
    // View Records type filters
    const viewFilterAllBtn = $('att-view-filter-all');
    const viewFilterStudentsBtn = $('att-view-filter-students');
    const viewFilterVolunteersBtn = $('att-view-filter-volunteers');
    const viewFilterChildrenBtn = $('att-view-filter-children');
    const recordsSection = $('att-records-section');
    const recordsTbody = $('att-records-tbody');
    const recordsCount = $('att-records-count');

    // Registration form elements
    const registerForm = $('att-register-form');
    const regTypeInput = $('att-reg-type');
    const studentFields = $('att-student-fields');
    const childrenContainer = $('att-children-container');
    const addChildBtn = $('att-add-child-btn');
    const regSpinner = $('att-reg-spinner');
    const regBtnText = $('att-reg-btn-text');
    const regSuccess = $('att-reg-success');
    const regError = $('att-reg-error');
    const regTypeSelection = $('att-reg-type-selection');
    const regFormContainer = $('att-reg-form-container');
    const backToTypeBtn = $('att-back-to-type');
    const regTypeLabel = $('att-reg-type-label');
    const addressSearchInput = $('att-reg-address-search');
    const addressSuggestions = $('att-address-suggestions');
    const toggleManualAddress = $('att-toggle-manual-address');
    const manualAddressFields = $('att-manual-address-fields');

    // Registration state
    let selectedRegType = null;
    let currentFormPage = 1;
    let addressDebounceTimer = null;

    // Export elements
    const exportPreviewBtn = $('att-preview-btn');
    const exportPreviewSection = $('att-export-preview');
    const exportPreviewTbody = $('att-export-preview-tbody');
    const exportTypeButtons = document.querySelectorAll('.att-export-type-btn');
    const exportFilterAllBtn = $('att-export-filter-all');
    const exportFilterStudentsBtn = $('att-export-filter-students');
    const exportFilterVolunteersBtn = $('att-export-filter-volunteers');
    const exportFilterChildrenBtn = $('att-export-filter-children');
    const exportFormatSelect = $('att-export-format');
    const exportBtn = $('att-export-btn');
    const exportError = $('att-export-error');
    const exportSuccess = $('att-export-success');
    let cachedExportData = null;
    // Keep raw export results per date-range/type so filtering by attendee type is local
    let cachedExportDataRaw = null;
    let lastExportQueryKey = '';

    // Modal elements
    const editModal = $('att-edit-modal');
    const modalClose = $('att-modal-close');
    const modalCancel = $('att-modal-cancel');
    const modalSave = $('att-modal-save');
    const modalError = $('att-modal-error');

    // Hints & Walkthrough elements
    const hintsSwitch = $('att-hints-switch');
    const hintsToggle = document.querySelector('.att-hints-toggle');
    const walkthroughStartBtn = $('att-walkthrough-start');
    const walkthroughOverlay = $('att-walkthrough-overlay');
    const walkthroughClose = $('att-walkthrough-close');
    const walkthroughProgress = $('att-walkthrough-progress');
    const walkthroughContent = $('att-walkthrough-content');
    const walkthroughStepCount = $('att-walkthrough-step-count');
    const walkthroughPrev = $('att-walkthrough-prev');
    const walkthroughNext = $('att-walkthrough-next');
    const trackerRoot = document.querySelector('.att-tracker');
    let currentWalkthroughStep = 0;
    // dismissed hints (persisted) - will contain hint IDs
    let dismissedHints = new Set();
    // When opening a collect-mode edit modal we hide the originating edit button so it doesn't
    // duplicate UI; store ref here so we can restore when modal closes.
    let __hiddenEditButton = null;
    // set of all hint IDs present in the app (captured on init)
    let knownHintIds = new Set();

    // load/save helpers for dismissed hints
    function loadDismissedHints() {
      try {
        const raw = localStorage.getItem('att-hints-dismissed');
        dismissedHints = new Set(raw ? JSON.parse(raw) : []);
      } catch (e) {
        dismissedHints = new Set();
      }
    }

    function saveDismissedHints() {
      try { localStorage.setItem('att-hints-dismissed', JSON.stringify(Array.from(dismissedHints))); } catch (e) {}
    }

    // collect all hint ids from the DOM
    function loadKnownHintIds() {
      knownHintIds = new Set(Array.from(document.querySelectorAll('.att-hint-box'))
        .map(h => h.dataset?.hintId)
        .filter(Boolean));
    }

    // attach handlers to dismiss buttons in hint boxes
    function attachHintDismissHandlers() {
      document.querySelectorAll('.att-hint-dismiss').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = btn.getAttribute('data-hint-id') || (btn.closest('.att-hint-box') || {}).dataset?.hintId;
          if (!id) return;
          dismissedHints.add(id);
          saveDismissedHints();
          const el = document.querySelector(`.att-hint-box[data-hint-id="${id}"]`);
          if (el) {
            el.classList.add('att-hint-dismissed');
            setTimeout(() => el.style.display = 'none', 220);
          }

          // Determine all hint IDs currently present in DOM (in case some sections are rendered later)
          const allHintIdsNow = new Set(Array.from(document.querySelectorAll('.att-hint-box')).map(h => h.dataset?.hintId).filter(Boolean));

          // If every hint ID present right now is recorded as dismissed, auto-disable hints
          if (allHintIdsNow.size > 0 && Array.from(allHintIdsNow).every(idVal => dismissedHints.has(idVal))) {
            // update global state and persist
            hintsEnabled = false;
            try { localStorage.setItem('att-hints-enabled', false); } catch (e) {}
            try { hintsSwitch.classList.remove('active'); } catch (e) {}
            try { trackerRoot.classList.remove('hints-enabled'); } catch (e) {}
            // ensure visibility updated
            try { updateHintVisibility(); } catch (e) {}
          }
        });
        // keyboard accessibility
        btn.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
            e.preventDefault();
            btn.click();
          }
        });
      });
    }

    function updateHintVisibility() {
      document.querySelectorAll('.att-hint-box').forEach(el => {
        const id = el.dataset?.hintId;
        // if the user previously dismissed this hint, ensure it's hidden
        if (id && dismissedHints.has(id)) {
          el.classList.add('att-hint-dismissed');
          el.style.display = 'none';
          return;
        }
        // otherwise show/hide based on hintsEnabled
        if (hintsEnabled && trackerRoot.classList.contains('hints-enabled')) {
          el.classList.remove('att-hint-dismissed');
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });
    }
    // Default hints to ON unless explicitly disabled
    let hintsEnabled = (function () {
      const v = localStorage.getItem('att-hints-enabled');
      return v === null ? true : (v === 'true');
    })();

    // Populate Ministry & Location selects from lookup.js (if available)
    function escapeHtml(str) {
      if (str == null) return '';
      return String(str).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    // Normalize various incoming record type strings to our UI categories
    function getNormalizedAttendeeType(record) {
      const raw = String(record?.AttendeeType || record?.Type || (record?.RecordType && record.RecordType.Name) || '').trim();
      if (!raw) return '';
      const low = raw.toLowerCase();

      // Map legacy/alternate types into canonical UI types
      if (low === 'refugee' || low.includes('refugee')) return 'Student';
      if (low === 'contact' || low.includes('contact')) return 'Volunteer';
      if (low.includes('volunt') || low === 'volunteer') return 'Volunteer';
      if (low.includes('student') || low === 'student') return 'Student';
      if (low.includes('child') || low === 'children') return 'Child';

      // Fallback: capitalize first letter
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }

    function ensureNormalizedRecords(records) {
      if (!Array.isArray(records)) return records || [];
      return records.map(r => ({ ...r, AttendeeType: getNormalizedAttendeeType(r) }));
    }


    function populateLookupSelects() {
      const ministrySelect = $('att-ministry');
      const locationSelect = $('att-location');
      if (!ministrySelect || !locationSelect) return;

      const sa = (window.lookup && Array.isArray(window.lookup.servingAreas)) ? window.lookup.servingAreas : [{ value: '', text: '' }];
      const locs = (window.lookup && Array.isArray(window.lookup.eslLocations)) ? window.lookup.eslLocations : [{ value: '', text: '' }];

      // Populate quickly from lookup.js if available so UI isn't blank while we fetch
      ministrySelect.innerHTML = sa.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.text)}</option>`).join('\n');
      locationSelect.innerHTML = locs.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.text)}</option>`).join('\n');

      // Mark the current source so developers can inspect window.attLookupSource
      try { window.attLookupSource = 'lookup'; } catch (e) { /* ignore */ }

      // Now attempt to fetch authoritative values from the remote endpoint and override when available
        (function fetchAndReplace() {
          console.info('populateLookupSelects: attempting remote fetch to override lookup.js values');
        const endpoint = 'https://attendancetrackerfa.azurewebsites.net/api/ministries';

        // Abort if fetch takes too long
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        fetch(endpoint, { signal: controller.signal })
          .then(r => {
            clearTimeout(timeoutId);
            if (!r.ok) throw new Error('Network response not ok: ' + r.status);
            return r.json();
          })
          .then(data => {
            console.info('populateLookupSelects: fetched remote data', data);
            // Expect { ministries: [...], locations: [...] }
            if (data && Array.isArray(data.ministries)) {
              // Ensure default blank placeholder is first
              const mins = [{ value: '', text: 'Select a Ministry Area' }].concat(
                data.ministries.map(m => ({ value: m, text: String(m).replace(/_/g, ' ') }))
              );
              ministrySelect.innerHTML = mins.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.text)}</option>`).join('\n');
            }

            if (data && Array.isArray(data.locations)) {
              // Ensure default blank placeholder is first
              const locsArr = [{ value: '', text: 'Select a location' }].concat(
                data.locations.map(l => ({ value: l, text: l }))
              );
              locationSelect.innerHTML = locsArr.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.text)}</option>`).join('\n');
            }
            try { window.attLookupSource = 'api'; } catch (e) { /* ignore */ }
            console.info('populateLookupSelects: remote values applied to selects (source=api)');
          })
          .then(() => {
            // finished
          })
          .catch(err => {
            // Don't block the UI — keep the lookup.js values already present
            console.warn('populateLookupSelects: could not fetch ministries/locations — using existing lookup data', err);
            // If this is a CORS/opaque failure show hint for debugging
            if (err.name === 'AbortError') {
              console.warn('populateLookupSelects: fetch aborted (timeout)');
            }
          });
      })();

      // Populate Level / Class Placement / Assessment from lookup.js as well
      const levelSelect = $('att-edit-level');
      const classSelect = $('att-edit-class');
      const assessmentSelect = $('att-edit-assessment');

      if (levelSelect) {
        const levels = (window.lookup && Array.isArray(window.lookup.studentLevel)) ? window.lookup.studentLevel : [{ value: '', text: '' }];
        levelSelect.innerHTML = levels.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.text)}</option>`).join('\n');
      }

      if (classSelect) {
        const classes = (window.lookup && Array.isArray(window.lookup.classPlacement)) ? window.lookup.classPlacement : [{ value: '', text: '' }];
        classSelect.innerHTML = classes.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.text)}</option>`).join('\n');
      }

      if (assessmentSelect) {
        const scores = (window.lookup && Array.isArray(window.lookup.assessmentScore)) ? window.lookup.assessmentScore : [{ value: '', text: '' }];
        assessmentSelect.innerHTML = scores.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.text)}</option>`).join('\n');
      }
    }

    // Populate now (script loads at end of body so DOM elements exist)
    populateLookupSelects();

    // Walkthrough implementation has been moved to a lazily-loaded module
    // (assets/walkthrough.js). When the user clicks the Tour button we will
    // dynamically load that file and call its start function.

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function showElement(el) {
      el.classList.remove('att-hidden');
    }

    function hideElement(el) {
      el.classList.add('att-hidden');
    }

    function showError(el, message) {
      el.textContent = message;
      showElement(el);
    }

    function showSuccess(el, message) {
      el.textContent = message;
      showElement(el);
    }

    function setLoading(btn, spinner, textEl, isLoading) {
      btn.disabled = isLoading;
      if (isLoading) {
        showElement(spinner);
        textEl.style.opacity = '0.5';
      } else {
        hideElement(spinner);
        textEl.style.opacity = '1';
      }
    }

    function formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString();
    }

    // Format an ISO date/time string into a compact 12-hour string like "4pm" or "4:30pm"
    function formatTime(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12;
      if (hours === 0) hours = 12;
      if (minutes === 0) return `${hours}${ampm}`;
      const mins = String(minutes).padStart(2, '0');
      return `${hours}:${mins}${ampm}`;
    }

    // Convert a HH:MM string (from <input type="time">) to the compact 12-hour representation
    function formatTimeFromHHMM(hhmm) {
      if (!hhmm) return '';
      const parts = hhmm.split(':');
      if (parts.length < 1) return '';
      const h = parseInt(parts[0], 10);
      const m = parts.length > 1 ? parseInt(parts[1], 10) : 0;
      if (isNaN(h) || isNaN(m)) return hhmm;
      const ampm = h >= 12 ? 'pm' : 'am';
      let hours = h % 12;
      if (hours === 0) hours = 12;
      if (m === 0) return `${hours}${ampm}`;
      return `${hours}:${String(m).padStart(2, '0')}${ampm}`;
    }

    function formatDateTimeLocal(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // ============================================
    // HINTS & WALKTHROUGH FUNCTIONS
    // ============================================
    function initHints() {
      // Initialize hints state
      if (hintsEnabled) {
        hintsSwitch.classList.add('active');
        trackerRoot.classList.add('hints-enabled');
      }

      // load dismissed hint ids, collect current hint ids, attach dismiss handlers and set initial visibility
      loadDismissedHints();
      loadKnownHintIds();
      attachHintDismissHandlers();
      updateHintVisibility();

      // Accessibility: expose switch role and state for assistive tech
      try {
        hintsSwitch.setAttribute('role', 'switch');
        hintsSwitch.setAttribute('tabindex', '0');
        hintsSwitch.setAttribute('aria-label', 'Toggle step-by-step hints');
        hintsSwitch.setAttribute('aria-checked', hintsEnabled ? 'true' : 'false');
      } catch (e) { /* defensive: keep page functional if element missing */ }
  // hide hints toggle on sign-in screen (only show when user is signed-in)
  try { updateHintsToggleVisibility(); } catch (e) {}

      // Check if this is the user's first visit
      const hasSeenWalkthrough = localStorage.getItem('att-walkthrough-seen');
      if (!hasSeenWalkthrough) {
        // Show walkthrough automatically on first visit (after they're logged in)
        // We'll trigger this after login
      }
    }

    function toggleHints() {
      const prev = hintsEnabled;
      hintsEnabled = !hintsEnabled;
      localStorage.setItem('att-hints-enabled', hintsEnabled);

      if (hintsEnabled) {
        hintsSwitch.classList.add('active');
        trackerRoot.classList.add('hints-enabled');
        // When enabling hints after they were disabled, clear any dismissed hints so users see fresh hints
        if (!prev) {
          dismissedHints.clear();
          saveDismissedHints();
        }
      } else {
        hintsSwitch.classList.remove('active');
        trackerRoot.classList.remove('hints-enabled');
      }

      // update accessible state
      try { hintsSwitch.setAttribute('aria-checked', hintsEnabled ? 'true' : 'false'); } catch (e) {}

      // update hint visibility (after enabling/disabling)
      try { updateHintVisibility(); } catch (e) {}
    }

    // Walkthrough UI + interactions have been moved to assets/walkthrough.js
    // The loader below will dynamically load that script and call its start
    // routine when the Tour button is clicked.
    

    // common days array for select
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // debounce helper
    function debounce(fn, delay = 250) {
      let t = null;
      return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), delay);
      };
    }

    // Find the closest date that matches a weekday name within today or the last 7 days
    function findClosestDateForWeekday(weekdayName) {
      if (!weekdayName) return null;
      const targetIndex = daysOfWeek.indexOf(weekdayName);
      if (targetIndex < 0) return null;

      const today = new Date();
      // check today first (offset 0), then go back up to 6 days
      for (let offset = 0; offset < 7; offset++) {
        const d = new Date(today);
        d.setDate(today.getDate() - offset);
        if (d.getDay() === targetIndex) return d;
      }

      // Fallback to today if none found
      return today;
    }

    // Combine a date (Date object) with an HH:MM time string (local), returning an ISO string
    function combineDateWithTimeISO(dateObj, timeStr) {
      if (!dateObj || !timeStr) return null;
      const [hh, mm] = timeStr.split(':').map(s => parseInt(s, 10));
      if (isNaN(hh) || isNaN(mm)) return null;
      const copy = new Date(dateObj);
      copy.setHours(hh, mm, 0, 0);
      return copy.toISOString();
    }

    // Compute effective start/end datetimes (ISO) and readable date for an event config
    // Supports two cases:
    // - Recurring weekly event: cfg.day + cfg.startTime + cfg.endTime -> returns a date (closest weekday) and start/end ISOs
    // - One-time event: cfg.startDateTime + cfg.endDateTime -> returns exact start/end ISOs and the date
    function computeEventDateRangeFromConfig(cfg) {
      if (!cfg) return null;
      // One-time event explicitly specified
      if (cfg.startDateTime && cfg.endDateTime) {
        try {
          const sIso = new Date(cfg.startDateTime).toISOString();
          const eIso = new Date(cfg.endDateTime).toISOString();
          const date = new Date(cfg.startDateTime);
          return { startIso: sIso, endIso: eIso, date, isOneTime: true };
        } catch (err) {
          return null;
        }
      }
      // If cfg defines day and both startTime & endTime, compute closest date
      if (cfg.day && cfg.startTime && cfg.endTime) {
        const date = findClosestDateForWeekday(cfg.day);
        if (!date) return null;
        let startIso = combineDateWithTimeISO(date, cfg.startTime);
        let endIso = combineDateWithTimeISO(date, cfg.endTime);
        // If end occurs before start (cross-midnight), move end to the next day
        if (startIso && endIso) {
          const s = new Date(startIso);
          const e = new Date(endIso);
          if (e <= s) {
            // bump end date by one day
            e.setDate(e.getDate() + 1);
            endIso = e.toISOString();
          }
        }
        return { startIso, endIso, date, isOneTime: false };
      }
      return null;
    }

    function getAttendeeTypeBadgeClass(type) {
      switch (type) {
        case 'Student': return 'att-badge-student';
        case 'Volunteer': return 'att-badge-volunteer';
        case 'Child': return 'att-badge-child';
        default: return '';
      }
    }

    function setDefaultDates() {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0);

      $('att-start-datetime').value = formatDateTimeLocal(startOfDay);
      $('att-end-datetime').value = formatDateTimeLocal(endOfDay);

      // Set view/export dates to last 30 days and mark the default shortcuts
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      $('att-view-start-date').value = thirtyDaysAgo.toISOString().split('T')[0];
      $('att-view-end-date').value = now.toISOString().split('T')[0];
      $('att-export-start-date').value = thirtyDaysAgo.toISOString().split('T')[0];
      $('att-export-end-date').value = now.toISOString().split('T')[0];
      // For View Records tab default to last week per product requirement, and Export tab also default to last week
      setDateRange('last-week', 'view');
      setDateRange('last-week', 'export');

      // Ensure the View Records type defaults to All and is highlighted
      if (viewFilterAllBtn) viewFilterAllBtn.classList.add('active');
      if (viewFilterStudentsBtn) viewFilterStudentsBtn.classList.remove('active');
      if (viewFilterVolunteersBtn) viewFilterVolunteersBtn.classList.remove('active');
      if (viewFilterChildrenBtn) viewFilterChildrenBtn.classList.remove('active');

      // Ensure Export defaults: Attendance Records type + All attendee-type filter
      // If no export type button is active, select the 'attendance' type (Attendance Records)
      if (exportTypeButtons && exportTypeButtons.length > 0) {
        const anyActive = Array.from(exportTypeButtons).some(b => b.classList.contains('active'));
        if (!anyActive) {
          exportTypeButtons.forEach(b => b.classList.toggle('active', b.dataset.type === 'attendance'));
        }
      }
      if (exportFilterAllBtn) exportFilterAllBtn.classList.add('active');
      if (exportFilterStudentsBtn) exportFilterStudentsBtn.classList.remove('active');
      if (exportFilterVolunteersBtn) exportFilterVolunteersBtn.classList.remove('active');
      if (exportFilterChildrenBtn) exportFilterChildrenBtn.classList.remove('active');

      // Auto-load attendees for all time on page load (Collect shows everyone sorted by most recent attendance)
      setTimeout(() => {
        loadAttendees();
      }, 300);
    }

    // ============================================
    // EVENT CONFIGURATION
    // ============================================
    function loadEventConfig() {
      const savedConfig = localStorage.getItem('att-event-config');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          eventNameInput.value = config.name || '';
          eventLocationInput.value = config.location || '';
          if (config.locationLat) eventLocationInput.dataset.lat = config.locationLat;
          if (config.locationLon) eventLocationInput.dataset.lon = config.locationLon;
          eventDaySelect.value = config.day || '';
          eventStartTimeInput.value = config.startTime || '';
          eventEndTimeInput.value = config.endTime || '';
          eventDescriptionTextarea.value = config.description || '';
        } catch (e) {
          console.error('Failed to load event config:', e);
        }
      }
      else {
        // No saved config: set sensible defaults
        if (currentUser) {
          eventNameInput.value = currentUser.ministry || '';
          // default location to the user's location string; may be non-address but is a sensible default
          eventLocationInput.value = currentUser.location || '';
        }

        // Derive day/time from existing attendance records (best-effort)
        deriveEventDefaults().catch(err => console.warn('Could not derive event defaults:', err));
      }
    }

    // Try to derive reasonable defaults for the event day/time by inspecting recent attendance records
    async function deriveEventDefaults() {
      if (!currentUser) return;

      const now = new Date();
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const startDate = oneYearAgo.toISOString().split('T')[0];
      const endDate = now.toISOString().split('T')[0];

      try {
        const { ok, data } = await apiCall(
          `/attendance?name=${encodeURIComponent(currentUser.name)}&ministry=${encodeURIComponent(currentUser.ministry)}&location=${encodeURIComponent(currentUser.location)}&startDate=${startDate}&endDate=${endDate}`
        );

        if (!ok || !Array.isArray(data) || data.length === 0) {
          // fallback: current day 6pm-8pm
          const dow = daysOfWeek[new Date().getDay()];
          eventDaySelect.value = dow;
          eventStartTimeInput.value = '18:00';
          eventEndTimeInput.value = '20:00';
          return;
        }

        // Count most common day and start/end times
        const dayCounts = {};
        const startCounts = {};
        const endCounts = {};

        data.forEach(rec => {
          try {
            const s = new Date(rec.StartDateTime);
            const e = new Date(rec.EndDateTime);
            const dow = daysOfWeek[s.getDay()];
            const startKey = `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`;
            const endKey = `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`;

            dayCounts[dow] = (dayCounts[dow] || 0) + 1;
            startCounts[startKey] = (startCounts[startKey] || 0) + 1;
            endCounts[endKey] = (endCounts[endKey] || 0) + 1;
          } catch (err) {
            // ignore any malformed dates
          }
        });

        const mostCommon = (counts) => {
          let best = null, bestCount = 0;
          Object.keys(counts).forEach(k => {
            if (counts[k] > bestCount) { best = k; bestCount = counts[k]; }
          });
          return best;
        };

        const commonDay = mostCommon(dayCounts);
        const commonStart = mostCommon(startCounts);
        const commonEnd = mostCommon(endCounts);

        eventDaySelect.value = commonDay || daysOfWeek[new Date().getDay()];
        eventStartTimeInput.value = commonStart || '18:00';
        eventEndTimeInput.value = commonEnd || '20:00';
        // update preview after deriving defaults
        renderEventPreview();
        // Also populate the Collect start/end inputs with the derived defaults
        try {
          const tempCfg = { day: eventDaySelect.value, startTime: eventStartTimeInput.value, endTime: eventEndTimeInput.value };
          const c = computeEventDateRangeFromConfig(tempCfg);
          if (c && $('att-start-datetime') && $('att-end-datetime')) {
            $('att-start-datetime').value = formatDateTimeLocal(c.startIso);
            $('att-end-datetime').value = formatDateTimeLocal(c.endIso);
          }
        } catch (e) {}

      } catch (error) {
        console.warn('deriveEventDefaults error', error);
        const dow = daysOfWeek[new Date().getDay()];
        eventDaySelect.value = dow;
        eventStartTimeInput.value = '18:00';
        eventEndTimeInput.value = '20:00';
        renderEventPreview();
      }
    }

    function saveEventConfig() {
      const config = {
        name: eventNameInput.value.trim(),
        location: eventLocationInput.value.trim(),
        locationLat: eventLocationInput.dataset.lat || null,
        locationLon: eventLocationInput.dataset.lon || null,
        day: eventDaySelect.value,
        startTime: eventStartTimeInput.value,
        endTime: eventEndTimeInput.value,
        description: eventDescriptionTextarea.value.trim()
      };

      localStorage.setItem('att-event-config', JSON.stringify(config));
      return config;
    }

    function resetEventConfig() {
      eventNameInput.value = '';
      eventLocationInput.value = '';
      eventDaySelect.value = '';
      eventStartTimeInput.value = '';
      eventEndTimeInput.value = '';
      eventDescriptionTextarea.value = '';
      localStorage.removeItem('att-event-config');
    }

    function getEventConfig() {
      const savedConfig = localStorage.getItem('att-event-config');
      if (savedConfig) {
        try {
          return JSON.parse(savedConfig);
        } catch (e) {
          console.error('Failed to parse event config:', e);
        }
      }
      return null;
    }

    async function saveEventConfiguration() {
      hideElement(configError);
      setLoading(saveConfigBtn, saveConfigSpinner, saveConfigBtnText, true);

      try {
        const config = saveEventConfig();

        // Validate required fields
        if (!config.name || !config.location) {
          throw new Error('Event name and location are required');
        }

        showElement(configSuccess);
        configSuccess.textContent = 'Event configuration saved successfully!';
        // update the preview so Collect Attendance reflects the saved configuration
        temporaryEventConfig = null; // saved config becomes canonical
        renderEventPreview();

        // ensure the collect start/end inputs reflect the saved configuration
        try {
          const computedSaved = computeEventDateRangeFromConfig(getEventConfig() || {});
          if (computedSaved && $('att-start-datetime') && $('att-end-datetime')) {
            $('att-start-datetime').value = formatDateTimeLocal(computedSaved.startIso);
            $('att-end-datetime').value = formatDateTimeLocal(computedSaved.endIso);
          }
        } catch (e) {}

        // Hide success message after 3 seconds
        setTimeout(() => {
          hideElement(configSuccess);
        }, 3000);

      } catch (error) {
        showError(configError, error.message || 'Failed to save configuration');
      } finally {
        setLoading(saveConfigBtn, saveConfigSpinner, saveConfigBtnText, false);
      }
    }

    // Renders the small event preview shown in the Collect Attendance tab
    function renderEventPreview() {
      // Prefer temporary overrides, then saved config; if neither exist use the current form inputs
      let cfg = temporaryEventConfig || getEventConfig();
      if (!cfg) {
        cfg = {
          name: (eventNameInput && eventNameInput.value) || currentUser?.ministry || '(no name)',
          day: (eventDaySelect && eventDaySelect.value) || '',
          startTime: (eventStartTimeInput && eventStartTimeInput.value) || '',
          endTime: (eventEndTimeInput && eventEndTimeInput.value) || '',
          location: (eventLocationInput && eventLocationInput.value) || currentUser?.location || ''
        };
      }
      const name = cfg.name || currentUser?.ministry || '(no name)';
      const day = cfg.day || '';
      const start = cfg.startTime || '';
      const end = cfg.endTime || '';
      const location = cfg.location || currentUser?.location || '';

      $('att-preview-name').textContent = name;
      // compute exact date/time (closest occurrence) if possible
      const computed = computeEventDateRangeFromConfig(temporaryEventConfig || getEventConfig() || {});
      // If computed is a one-time event, show an explicit time range instead of weekday + times.
      if (computed && computed.isOneTime) {
        const startTimeStr = formatTime(computed.startIso);
        const endTimeStr = formatTime(computed.endIso);
        $('att-preview-daytime').textContent = (startTimeStr || endTimeStr) ? `${startTimeStr}${startTimeStr && endTimeStr ? ' - ' + endTimeStr : ''}` : '';
      } else {
        const startDisplay = start ? formatTimeFromHHMM(start) : '';
        const endDisplay = end ? formatTimeFromHHMM(end) : '';
        $('att-preview-daytime').textContent = (day || startDisplay || endDisplay) ? `${day ? day + ' \u2022 ' : ''}${startDisplay ? startDisplay : ''}${startDisplay && endDisplay ? ' - ' + endDisplay : ''}` : '';
      }

      // compute exact date already performed above
      if (computed && computed.date) {
        const dateStr = new Date(computed.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        $('att-preview-exactdate').textContent = `${dateStr}`;
      } else {
        $('att-preview-exactdate').textContent = '';
      }

      // For one-time configured submissions, hide Location in the small preview (it will still be used when posting)
      const previewLocationEl = $('att-preview-location');
      if (computed && computed.isOneTime) {
        hideElement(previewLocationEl);
      } else {
        previewLocationEl.textContent = location;
        showElement(previewLocationEl);
      }
    }

    function openInlineEditor() {
      const cfg = temporaryEventConfig || getEventConfig() || {};
      const inlineName = $('att-inline-event-name');
      const inlineDay = $('att-inline-event-day');
      const inlineStart = $('att-inline-event-start');
      const inlineEnd = $('att-inline-event-end');
      const inlineStartDt = $('att-inline-event-start-datetime');
      const inlineEndDt = $('att-inline-event-end-datetime');

      inlineName.value = cfg.name || currentUser?.ministry || '';

      // Determine editing mode: one-time (specific start/end datetimes) vs recurring (weekday + times)
      let isOneTime = false;
      if (cfg.startDateTime && cfg.endDateTime) isOneTime = true;
      else if (!cfg.day && $('att-start-datetime') && $('att-start-datetime').value) isOneTime = true;

      if (isOneTime) {
        // show the date-time editors and hide the day/time fields
        hideElement(inlineDay);
        hideElement(inlineStart);
        hideElement(inlineEnd);
        showElement(inlineStartDt);
        showElement(inlineEndDt);

        // populate one-time datetime values
        inlineStartDt.value = cfg.startDateTime ? formatDateTimeLocal(cfg.startDateTime) : ($('att-start-datetime') ? $('att-start-datetime').value : '');
        inlineEndDt.value = cfg.endDateTime ? formatDateTimeLocal(cfg.endDateTime) : ($('att-end-datetime') ? $('att-end-datetime').value : '');
      } else {
        // show weekday/time editing and hide datetimes
        showElement(inlineDay);
        showElement(inlineStart);
        showElement(inlineEnd);
        hideElement(inlineStartDt);
        hideElement(inlineEndDt);

        inlineDay.value = cfg.day || '';
        inlineStart.value = cfg.startTime || '';
        inlineEnd.value = cfg.endTime || '';
      }

      // hide the inline edit button while the inline editor is open
      try {
        const inlineBtn = $('att-event-edit-inline-btn');
        if (inlineBtn) { inlineBtn.classList.add('att-edit-hidden'); try { inlineBtn.disabled = true; inlineBtn.style.display = 'none'; } catch (e) {} __hiddenEditButton = inlineBtn; }
      } catch (e) {}

      showElement($('att-event-inline-editor'));
    }

    function closeInlineEditor() {
      hideElement($('att-event-inline-editor'));
      // restore the inline edit button if we hid it
      if (__hiddenEditButton) {
        try { __hiddenEditButton.classList.remove('att-edit-hidden'); __hiddenEditButton.disabled = false; __hiddenEditButton.style.display = ''; } catch (e) {}
        __hiddenEditButton = null;
      }
    }

    function saveInlineConfig() {
      const cfg = {
        name: $('att-inline-event-name').value.trim(),
        // Location is intentionally not edited inline; prefer saved config or top-level event location form
        location: getEventConfig()?.location || $('att-event-location').value || currentUser?.location || ''
      };

      // If the inline one-time datetime inputs are visible, use those for a one-time event
      const inlineStartDt = $('att-inline-event-start-datetime');
      const inlineEndDt = $('att-inline-event-end-datetime');
      if (inlineStartDt && !inlineStartDt.classList.contains('att-hidden') && inlineStartDt.value) {
        // store ISO datetimes on the temporary config so preview + submit will use them
        try {
          cfg.startDateTime = new Date(inlineStartDt.value).toISOString();
          cfg.endDateTime = inlineEndDt && inlineEndDt.value ? new Date(inlineEndDt.value).toISOString() : null;
        } catch (err) {
          // if parsing fails, leave as-is
        }
      } else {
        // recurring/weekly event fields
        cfg.day = $('att-inline-event-day').value;
        cfg.startTime = $('att-inline-event-start').value;
        cfg.endTime = $('att-inline-event-end').value;
      }

      temporaryEventConfig = cfg;
      renderEventPreview();
      // Update the collect start/end inputs so inline edits immediately affect the Collect view
      try {
        const computed = computeEventDateRangeFromConfig(temporaryEventConfig || cfg);
        if (computed && $('att-start-datetime') && $('att-end-datetime')) {
          if (computed.startIso) $('att-start-datetime').value = formatDateTimeLocal(computed.startIso);
          if (computed.endIso) $('att-end-datetime').value = formatDateTimeLocal(computed.endIso);
        }
      } catch (e) {}
      closeInlineEditor();
    }

    function clearTemporaryEventConfig() {
      temporaryEventConfig = null;
      renderEventPreview();
      // Restore collect start/end to the saved event config if present
      try {
        const cfg = getEventConfig() || {};
        const computed = computeEventDateRangeFromConfig(cfg);
        if (computed && $('att-start-datetime') && $('att-end-datetime')) {
          $('att-start-datetime').value = formatDateTimeLocal(computed.startIso);
          $('att-end-datetime').value = formatDateTimeLocal(computed.endIso);
        }
      } catch (e) {}
    }

    // Address lookup using OpenStreetMap Nominatim (open-source). Presents a simple suggestion dropdown.
    const eventLocationSuggestions = $('att-event-location-suggestions');

    async function searchEventAddress(query) {
      if (!query || query.length < 3) {
        eventLocationSuggestions.innerHTML = '';
        hideElement(eventLocationSuggestions);
        return;
      }
      // show a temporary 'searching' indicator while the network request runs
      try {
        eventLocationSuggestions.innerHTML = `
          <div class="att-loading-inner" style="padding:12px 18px; display:flex; align-items:center; gap:8px;">
            <span class="att-spinner" aria-hidden="true"></span>
            <div style="font-size:14px; color:var(--muted);">Searching…</div>
          </div>
        `;
        showElement(eventLocationSuggestions);
      } catch (e) {}

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`);
        const results = await res.json();

        if (!Array.isArray(results) || results.length === 0) {
          eventLocationSuggestions.innerHTML = '';
          hideElement(eventLocationSuggestions);
          return;
        }

        eventLocationSuggestions.innerHTML = results.map(r => `
        <div class=\"att-address-suggestion\" data-display='${r.display_name.replace(/'/g, "&#39;")}' data-lat='${r.lat}' data-lon='${r.lon}'>
          ${r.display_name}
        </div>
      `).join('');

        showElement(eventLocationSuggestions);

        // Attach click handlers to suggestions
        eventLocationSuggestions.querySelectorAll('.att-address-suggestion').forEach(el => {
          el.addEventListener('click', () => {
            const display = el.dataset.display;
            eventLocationInput.value = display;
            // store coordinates on the input element for later persistence
            if (el.dataset.lat) eventLocationInput.dataset.lat = el.dataset.lat;
            if (el.dataset.lon) eventLocationInput.dataset.lon = el.dataset.lon;
            hideElement(eventLocationSuggestions);
          });
        });

      } catch (err) {
        console.warn('Address lookup failed', err);
        // If the lookup fails, clear the suggestions and hide the UI
        eventLocationSuggestions.innerHTML = '';
        hideElement(eventLocationSuggestions);
      }
    }

    // Inline event address search (separate suggestions list)
    // Inline address lookup removed — inline editor no longer accepts location input

    // ============================================
    // API FUNCTIONS
    // ============================================
    async function apiCall(endpoint, options = {}) {
      const url = `${API_BASE_URL}${endpoint}`;
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        });

        // Try to parse JSON when possible; if not JSON fall back to text
        let data = null;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            data = await response.json();
          } catch (err) {
            data = { message: 'Invalid JSON response' };
          }
        } else {
          try {
            const text = await response.text();
            // Normalize non-JSON responses into { message }
            data = text ? { message: text } : null;
          } catch (err) {
            data = { message: 'Failed to read response' };
          }
        }

        // If the server returned a plain string body, ensure callers can read a `message` property
        if (data && typeof data !== 'object') data = { message: String(data) };

        return { ok: response.ok, status: response.status, data };
      } catch (err) {
        // Network-level failure (CORS blocked, DNS failure, offline, TLS issues, etc.)
        return { ok: false, status: null, data: { message: err?.message || 'Network error' } };
      }
    }

    // ============================================
    // AUTHORIZATION
    // ============================================
    async function authorize() {
      const name = $('att-name').value.trim();
      const ministry = $('att-ministry').value.trim();
      const location = $('att-location').value.trim();

      if (!name || !ministry || !location) {
        showError(authError, 'Please fill in all fields');
        return;
      }

      hideElement(authError);
      setLoading(authBtn, authSpinner, authBtnText, true);

      try {
        const { ok, data } = await apiCall(
          `/authorization?name=${encodeURIComponent(name)}&ministry=${encodeURIComponent(ministry)}&location=${encodeURIComponent(location)}`
        );

        if (ok && data.authorized) {
          currentUser = data;
          localStorage.setItem('att-user', JSON.stringify(currentUser));
          showMainInterface();
        } else {
          showError(authError, data.message || 'Authorization failed. Please check your credentials.');
        }
      } catch (error) {
        showError(authError, 'Network error. Please check your connection and try again.');
      } finally {
        setLoading(authBtn, authSpinner, authBtnText, false);
      }
    }

    function logout() {
      currentUser = null;
      // Clear all app-related session data and sessionStorage
      try {
        if (typeof clearAppSession === 'function') {
          clearAppSession();
        } else {
          // fallback: at least remove the primary user key
          localStorage.removeItem('att-user');
        }
      } catch (e) {
        // ignore storage errors
        try { localStorage.removeItem('att-user'); } catch (er) {}
      }
      hideElement(mainSection);
      showElement(authSection);
      $('att-name').value = '';
      $('att-ministry').value = '';
      $('att-location').value = '';
      // hide/disable top-right menu
      if (userMenuWrapper) {
        userMenuWrapper.setAttribute('aria-hidden', 'true');
      }
      if (userMenuBtn) {
        userMenuBtn.textContent = 'RI';
        userMenuBtn.setAttribute('aria-expanded', 'false');
        userMenuBtn.removeAttribute('title');
        userMenuBtn.removeAttribute('aria-label');
      }
      if (userMenu) {
        userMenu.setAttribute('aria-hidden', 'true');
      }
      userMenuOpenByClick = false;
      // Hide Tour button when logged out
      updateWalkthroughVisibility();
      // hide hints toggle on sign-out
      updateHintsToggleVisibility();
    }

    function showMainInterface() {
      hideElement(authSection);
      showElement(mainSection);
      $('att-user-name').textContent = currentUser.name;
      $('att-user-ministry').textContent = currentUser.ministry;
      $('att-user-location').textContent = currentUser.location;
      // show and populate top-right menu with initials & info
      if (userMenuWrapper) userMenuWrapper.setAttribute('aria-hidden', 'false');
      const initials = (currentUser.name || '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(s => s[0].toUpperCase())
        .join('') || 'RI';
      if (userMenuBtn) {
        userMenuBtn.textContent = initials;
        userMenuBtn.setAttribute('aria-expanded', 'false');
        userMenuBtn.setAttribute('aria-label', `Open user menu for ${currentUser.name}`);
        userMenuBtn.setAttribute('title', currentUser.name);
      }
      // ensure the popover is hidden initially
      hideUserMenu(true);
      setDefaultDates();
      loadEventConfig();
      // ensure preview is in sync with saved settings
      temporaryEventConfig = null;
      renderEventPreview();
      // Populate collect start/end inputs with saved or computed event range so Collect view defaults
      try {
        const cfg = getEventConfig() || {};
        const computed = computeEventDateRangeFromConfig(cfg);
        if (computed && computed.startIso && $('att-start-datetime') && $('att-end-datetime')) {
          $('att-start-datetime').value = formatDateTimeLocal(computed.startIso);
          $('att-end-datetime').value = formatDateTimeLocal(computed.endIso);
        }
      } catch (e) { /* non-fatal */ }
      // Ensure Tour button visibility matches signed-in state
      updateWalkthroughVisibility();
      // show hints toggle now that a user is signed in
      updateHintsToggleVisibility();
    }

    // Menu show/hide helpers (with small hide delay to make hover -> menu transitions smoother)
    let userMenuHideTimer = null;

    function showUserMenu() {
      if (!userMenu || !userMenuWrapper || !userMenuBtn) return;
      // cancel hide timer
      if (userMenuHideTimer) {
        clearTimeout(userMenuHideTimer);
        userMenuHideTimer = null;
      }
      userMenu.setAttribute('data-visible', 'true');
      userMenu.setAttribute('aria-hidden', 'false');
      userMenuBtn.setAttribute('aria-expanded', 'true');
    }

    function hideUserMenu(immediate = false) {
      if (!userMenu || !userMenuWrapper || !userMenuBtn) return;
      if (userMenuHideTimer) {
        clearTimeout(userMenuHideTimer);
        userMenuHideTimer = null;
      }
      const doHide = () => {
        userMenu.setAttribute('data-visible', 'false');
        userMenu.setAttribute('aria-hidden', 'true');
        userMenuBtn.setAttribute('aria-expanded', 'false');
        userMenuOpenByClick = false;
      };
      if (immediate) doHide();
      else userMenuHideTimer = setTimeout(doHide, 200);
    }

    // Toggle menu on click
    if (userMenuBtn) {
      userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const expanded = userMenuBtn.getAttribute('aria-expanded') === 'true';
          const newExpanded = !expanded;
          // pinned state when clicked
          userMenuOpenByClick = newExpanded;
          if (newExpanded) showUserMenu();
          else hideUserMenu(true);
      });

      // Keep menu visible while the cursor is over the wrapper (button or menu)
      if (userMenuWrapper) {
        userMenuWrapper.addEventListener('mouseenter', () => {
          // on hover, always keep the menu visible
          showUserMenu();
        });

        userMenuWrapper.addEventListener('mouseleave', () => {
          // only hide when the menu isn't pinned open by click
          if (userMenuOpenByClick) return;
          // schedule a delayed hide so quick pointer moves don't immediately close it
          hideUserMenu();
        });
      }
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!userMenuWrapper) return;
      if (userMenuWrapper.getAttribute('aria-hidden') === 'true') return; // outer wrapper not visible (logged out)
      if (!userMenuWrapper.contains(e.target)) {
        hideUserMenu(true);
      }
    });

    // Close with Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideUserMenu(true);
      }
    });

    // Show/hide the walkthrough (Tour) start button depending on whether a user is signed in
    function updateWalkthroughVisibility() {
      if (!walkthroughStartBtn) return;
      if (currentUser) showElement(walkthroughStartBtn);
      else hideElement(walkthroughStartBtn);
    }

    // Show or hide the global hints toggle depending on whether a user is signed in
    function updateHintsToggleVisibility() {
      if (!hintsToggle) return;
      if (currentUser) showElement(hintsToggle);
      else hideElement(hintsToggle);
    }

    function checkSavedUser() {
      const savedUser = localStorage.getItem('att-user');
      if (savedUser) {
        try {
          currentUser = JSON.parse(savedUser);
          showMainInterface();
        } catch (e) {
          localStorage.removeItem('att-user');
        }
      }
    }

    // ============================================
    // TAB NAVIGATION
    // ============================================
    function switchTab(tabName) {
      tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
      });
      tabContents.forEach(content => {
        const contentId = content.id.replace('att-tab-', '');
        content.classList.toggle('att-hidden', contentId !== tabName);
      });

      // If user views the Event Configuration tab, refresh defaults (useful if location/user changed)
      if (tabName === 'config') {
        // Re-load configuration (will fallback to derived defaults if not saved)
        loadEventConfig();
      }

      // When switching to the View tab, automatically fetch records for the active quick-range
      // (skip auto-run for 'custom' so user can pick explicit dates first)
      if (tabName === 'view') {
        try {
          // Ensure attendee-type defaults exist (keep any existing selection if set)
          if (viewFilterAllBtn && ![viewFilterAllBtn, viewFilterStudentsBtn, viewFilterVolunteersBtn, viewFilterChildrenBtn].some(b => b && b.classList.contains('active'))) {
            viewFilterAllBtn.classList.add('active');
          }

          // Find active date-range shortcut (only date-range buttons have data-range)
          const activeRangeBtn = document.querySelector('#att-tab-view .att-filter-btn[data-range].active');
          const activeRange = activeRangeBtn ? activeRangeBtn.dataset.range : null;

          if (!activeRange) {
            // No date-range selected — default to last-week and fetch
            setDateRange('last-week', 'view');
            viewRecords();
          } else if (activeRange !== 'custom') {
            // Only auto-run when not using a custom range (user must pick dates first)
            viewRecords();
          }
        } catch (err) {
          // Non-fatal — if viewRecords or DOM queries fail for some reason, ignore
          console.warn('Auto-fetch on view tab failed:', err);
        }
      }

      // When switching to the Export tab, automatically preview data for the active quick-range
      // (skip auto-run for 'custom' so user can pick explicit dates first)
      if (tabName === 'export') {
        try {
          // Ensure export type has a default (attendance) if none selected
          if (exportTypeButtons && exportTypeButtons.length > 0 && !Array.from(exportTypeButtons).some(b => b.classList.contains('active'))) {
            exportTypeButtons.forEach(b => b.classList.toggle('active', b.dataset.type === 'attendance'));
          }

          // Ensure attendee-type defaults exist for export
          if (exportFilterAllBtn && ![exportFilterAllBtn, exportFilterStudentsBtn, exportFilterVolunteersBtn, exportFilterChildrenBtn].some(b => b && b.classList.contains('active'))) {
            exportFilterAllBtn.classList.add('active');
          }

          // Find active date-range shortcut (only date-range buttons have data-range)
          const activeRangeBtn = document.querySelector('#att-tab-export .att-filter-btn[data-range].active');
          const activeRange = activeRangeBtn ? activeRangeBtn.dataset.range : null;

          if (!activeRange) {
            // No date-range selected — default to last-week and preview
            setDateRange('last-week', 'export');
            previewExportData();
          } else if (activeRange !== 'custom') {
            // Only auto-run when not using a custom range (user must pick dates first)
            previewExportData();
          }
        } catch (err) {
          console.warn('Auto-preview on export tab failed:', err);
        }
      }
    }

    // ============================================
    // COLLECT ATTENDANCE
    // ============================================
    function setDateRange(range, target = 'collect') {
      const now = new Date();
      let startDate, endDate;

      switch (range) {
        case 'last-year':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          endDate = new Date(now);
          break;
        case 'year-to-date':
          startDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
          endDate = new Date(now);
          break;
        case 'last-month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          endDate = new Date(now);
          break;
        case 'last-week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          endDate = new Date(now);
          break;
        case 'custom':
          // Custom selection: we'll show custom inputs for the selected tab but still
          // continue so the active button state updates (we don't auto-run queries).
          if (target === 'collect') showElement($('att-custom-range'));
          else if (target === 'view') showElement($('att-view-custom-range'));
          else if (target === 'export') showElement($('att-export-custom-range'));
          // DO NOT return here so we can update button active states below -- actual actions
          // (view/preview/load) are only triggered by the button handler unless a non-custom
          // range is selected.
          break;
        default:
          return;
      }

      // Hide the custom-range UI for the target tab when switching away from custom
      if (target === 'collect' && range !== 'custom') hideElement($('att-custom-range'));
      if (target === 'view' && range !== 'custom') hideElement($('att-view-custom-range'));
      if (target === 'export' && range !== 'custom') hideElement($('att-export-custom-range'));

      // Update filter button states only for date-range shortcut buttons within the active tab group
      // (don't touch non-date type-filter buttons that share the .att-filter-btn class)
      const parent = document.getElementById(`att-tab-${target}`) || document;
      parent.querySelectorAll('.att-filter-btn[data-range]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.range === range);
      });

      // Set the date/time inputs depending on target
      if (target === 'collect') {
        if (startDate) {
          $('att-start-datetime').value = formatDateTimeLocal(startDate);
          $('att-end-datetime').value = formatDateTimeLocal(endDate);
        }
      } else if (target === 'view') {
        // set date inputs (YYYY-MM-DD)
        if (startDate) {
          $('att-view-start-date').value = startDate.toISOString().split('T')[0];
          $('att-view-end-date').value = endDate.toISOString().split('T')[0];
        }
        // Only show the View Records button when using a custom range -- for quick ranges
        // the filter buttons auto-run viewRecords, so the explicit button isn't required.
        if (typeof viewRecordsBtn !== 'undefined' && viewRecordsBtn) {
          if (range === 'custom') showElement(viewRecordsBtn); else hideElement(viewRecordsBtn);
        }
      } else if (target === 'export') {
        if (startDate) {
          $('att-export-start-date').value = startDate.toISOString().split('T')[0];
          $('att-export-end-date').value = endDate.toISOString().split('T')[0];
        }

        // Preview button should only be visible for Custom Range
        if (range === 'custom') showElement(exportPreviewBtn); else hideElement(exportPreviewBtn);
      }
    }

    async function loadAttendees() {
      // Collect pulls attendees for all-time (backend returns most recent per person) - no date filters required here.
      hideElement(loadError);
      // show loading indicator while attendees are fetched
      const attendeesLoading = $('att-attendees-loading');
      if (attendeesLoading) showElement(attendeesLoading);
      // Only disable any filter buttons located inside the Collect tab while loading
      const filterButtons = document.querySelectorAll('#att-tab-collect .att-filter-btn');
      filterButtons.forEach(b => b.disabled = true);

      try {
        const { ok, data } = await apiCall(
          `/attendees?name=${encodeURIComponent(currentUser.name)}&ministry=${encodeURIComponent(currentUser.ministry)}&location=${encodeURIComponent(currentUser.location)}`
        );

        if (ok && Array.isArray(data)) {
          attendeesData = data;
          // Sort so most-recently-seen attendees appear first. Backend provides LastSeen when available.
          attendeesData.sort((a, b) => {
            const aDate = a.LastSeen ? new Date(a.LastSeen) : null;
            const bDate = b.LastSeen ? new Date(b.LastSeen) : null;
            if (!aDate && !bDate) return 0;
            if (!aDate) return 1;
            if (!bDate) return -1;
            return bDate.getTime() - aDate.getTime();
          });
          // Apply currently selected filters (type + search) when rendering
          applyAttendeeFilters(searchInput.value || '');
          showElement(attendeesSection);
          updateSelectedCount();
        } else {
          showError(loadError, data.message || 'Failed to load attendees');
        }
      } catch (error) {
        showError(loadError, 'Network error. Please try again.');
      } finally {
        // hide loading indicator
        if (attendeesLoading) hideElement(attendeesLoading);
        // re-enable filter buttons
        filterButtons.forEach(b => b.disabled = false);
      }
    }

    function renderAttendees(attendees) {
      // Hide/show select-all control depending on result length
      try {
        if (selectAllContainer) {
          if (!attendees || attendees.length === 0) hideElement(selectAllContainer); else showElement(selectAllContainer);
        }
      } catch (err) {
        // ignore
      }

      if (!attendees || attendees.length === 0) {
        attendeesContainer.innerHTML = `
        <div class="att-empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p>No attendees found for this location.</p>
        </div>
      `;
        return;
      }

      // Render attendees
      attendeesContainer.innerHTML = attendees.map(attendee => {
        const hasData = (attendee.Notes || attendee.ClassPlacement || attendee.AssessmentScore || attendee.Level) ? 'has' : '';
        return `
      <div class="att-attendee-item" data-person-id="${attendee.PersonID}">
        <input type="checkbox" class="att-attendee-checkbox" id="att-cb-${attendee.PersonID}" 
               data-attendee='${JSON.stringify(attendee).replace(/'/g, "&#39;")}'>
        <div class="att-attendee-info">
          <div style="display:flex; gap:8px; align-items:center; justify-content:space-between;">
            <div style="display:flex; gap:8px; align-items:center;">
              <span class="att-attendee-name">${attendee.FirstName || ''} ${attendee.LastName || ''}</span>
              <span class="att-badge ${getAttendeeTypeBadgeClass(attendee.AttendeeType)}">${attendee.AttendeeType || 'Unknown'}</span>
            </div>
            <div style="text-align:right; font-size:12px; color:#6b7280;">
              ${attendee.ClassPlacement ? `<div class="att-class-placement">${escapeHtml(attendee.ClassPlacement)}</div>` : ''}
              ${attendee.Level ? `<div class="att-level">${escapeHtml(attendee.Level)}</div>` : ''}
            </div>
          </div>
          ${attendee.ClassPlacement || attendee.Level ?
          `<div class="att-attendee-details">${[attendee.ClassPlacement, attendee.Level].filter(Boolean).join(' \u2022 ')}</div>` : ''}
          ${(attendee.StartDateTime || attendee.EndDateTime) ? `<div class="att-attendee-time">${attendee.StartDateTime ? formatTime(attendee.StartDateTime) : ''}${(attendee.StartDateTime && attendee.EndDateTime) ? ' - ' : ''}${attendee.EndDateTime ? formatTime(attendee.EndDateTime) : ''}</div>` : ''}
        </div>
        <div class="att-attendee-actions">
          <button class="att-edit-record-btn" data-person-id="${attendee.PersonID}" title="Edit note / placement / assessment" aria-label="Edit details for ${escapeHtml(attendee.FirstName || '')} ${escapeHtml(attendee.LastName || '')}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"></path>
              <path d="M20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0L15.13 5.12l3.75 3.75 1.83-1.83z"></path>
            </svg>
          </button>
          ${hasData ? '<span class="att-attendee-has-data" title="Has notes or placement"></span>' : ''}
        </div>
      </div>
    `;
      }).join('');

      // Add click handlers to items
      attendeesContainer.querySelectorAll('.att-attendee-item').forEach(item => {
        item.addEventListener('click', (e) => {
          // Ignore clicks coming from interactive controls (inputs, textareas, selects, buttons) so user can focus/type
          const targetTag = (e.target && e.target.tagName || '').toLowerCase();
          if (['input', 'textarea', 'select', 'button'].includes(targetTag)) return;

          const checkbox = item.querySelector('input[type="checkbox"]');
          if (!checkbox) return;
          checkbox.checked = !checkbox.checked;
          item.classList.toggle('selected', checkbox.checked);
          updateSelectedCount();
        });
      });

      // Add checkbox change handlers
      attendeesContainer.querySelectorAll('.att-attendee-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
          cb.closest('.att-attendee-item').classList.toggle('selected', cb.checked);
          updateSelectedCount();
        });
      });

      // Use event-delegation on the container to support dynamic rows
      if (!attendeesContainer.__attEditHandlerAttached) {
        attendeesContainer.addEventListener('click', function onAttendeesClick(e) {
        const btn = e.target.closest && e.target.closest('.att-edit-record-btn');
        if (btn && attendeesContainer.contains(btn)) {
          e.stopPropagation();
          const pid = btn.dataset.personId;
          openCollectEditModal(pid);
        }
        });
        attendeesContainer.__attEditHandlerAttached = true;
      }
    }

    function filterAttendees(searchTerm) {
      applyAttendeeFilters(searchTerm);
    }

    // Apply both attendee type filter and optional text search
    function applyAttendeeFilters(searchTerm = '') {
      const term = (searchTerm || '').toLowerCase();
      const filtered = attendeesData.filter(a => {
        // Type filter: All means include everybody
        if (selectedAttendeeTypeFilter && selectedAttendeeTypeFilter !== 'All') {
          if ((a.AttendeeType || '').toLowerCase() !== selectedAttendeeTypeFilter.toLowerCase()) return false;
        }
        // Text search
        if (!term) return true;
        return (
          (a.FirstName || '').toLowerCase().includes(term) ||
          (a.LastName || '').toLowerCase().includes(term) ||
          (a.AttendeeType || '').toLowerCase().includes(term)
        );
      });
      renderAttendees(filtered);
    }

    function updateSelectedCount() {
      const count = attendeesContainer.querySelectorAll('.att-attendee-checkbox:checked').length;
      selectedCount.textContent = count;
    }

    function toggleSelectAll() {
      const checkboxes = attendeesContainer.querySelectorAll('.att-attendee-checkbox');
      const isChecked = selectAllCheckbox.checked;
      checkboxes.forEach(cb => {
        cb.checked = isChecked;
        cb.closest('.att-attendee-item').classList.toggle('selected', isChecked);
      });
      updateSelectedCount();
    }

    async function submitAttendance() {
      const selectedCheckboxes = attendeesContainer.querySelectorAll('.att-attendee-checkbox:checked');

      if (selectedCheckboxes.length === 0) {
        showError(submitError, 'Please select at least one attendee');
        return;
      }

      const startDateTime = $('att-start-datetime').value;
      const endDateTime = $('att-end-datetime').value;

      // Allow eventConfig (temporary or saved) day/start/end to provide the effective datetimes
      const effectiveEventCfg = temporaryEventConfig || getEventConfig() || {};
      const computedRangePreview = computeEventDateRangeFromConfig(effectiveEventCfg);

      if (!computedRangePreview && (!startDateTime || !endDateTime)) {
        showError(submitError, 'Please set start and end date/time');
        return;
      }

      hideElement(submitError);
      hideElement(submitSuccess);
      setLoading(submitBtn, submitSpinner, submitBtnText, true);

      // Compute effective start/end datetimes: prefer event config (temporary or saved)
      const computedRange = computeEventDateRangeFromConfig(effectiveEventCfg);
      const effectiveStartIso = computedRange ? computedRange.startIso : new Date(startDateTime).toISOString();
      const effectiveEndIso = computedRange ? computedRange.endIso : new Date(endDateTime).toISOString();

      const attendance = Array.from(selectedCheckboxes).map(cb => {
        const attendee = JSON.parse(cb.dataset.attendee);
        // Notes/class/assessment values are saved on the attendee dataset (edited via the modal)
        return {
          PersonID: attendee.PersonID,
          // Use computed ISO datetimes if event config provides a day/time; otherwise use inputs
          StartDateTime: attendee.StartDateTime || effectiveStartIso,
          EndDateTime: attendee.EndDateTime || effectiveEndIso,
          AttendeeType: attendee.AttendeeType || 'Student',
          Notes: attendee.Notes || '',
          Level: attendee.Level || '',
          AssessmentScore: attendee.AssessmentScore || '',
          ClassPlacement: attendee.ClassPlacement || ''
        };
      });

      try {
        const eventConfig = temporaryEventConfig || getEventConfig() || {};

        const { ok, data } = await apiCall('/attendance', {
          method: 'POST',
          body: JSON.stringify({
            name: currentUser.name,
            ministry: currentUser.ministry,
            location: currentUser.location,
            eventConfig: eventConfig || {},
            attendance
          })
        });

        if (ok) {
          showSuccess(submitSuccess, `Successfully submitted attendance for ${attendance.length} attendee(s)!`);
          // Clear selections
          attendeesContainer.querySelectorAll('.att-attendee-checkbox:checked').forEach(cb => {
            cb.checked = false;
            cb.closest('.att-attendee-item').classList.remove('selected');
          });
          selectAllCheckbox.checked = false;
          updateSelectedCount();
          // clear temporary inline config after successful submit
          clearTemporaryEventConfig();
        } else {
          // If backend returned detailed submit errors, surface them to the user to aid debugging
          let message = data.message || 'Failed to submit attendance';
          if (data.details && Array.isArray(data.details)) {
            const details = data.details.map(d => {
              if (d.personId) return `${d.personId}: ${d.message}`;
              if (d.eventId) return `${d.eventId}: ${d.message}`;
              return `${d.type || 'error'}: ${d.message}`;
            }).join('\n');
            message = `${message} - ${details}`;
          }
          showError(submitError, message);
        }
      } catch (error) {
        showError(submitError, 'Network error. Please try again.');
      } finally {
        setLoading(submitBtn, submitSpinner, submitBtnText, false);
      }
    }

    // ============================================
    // VIEW RECORDS
    // ============================================
    async function viewRecords() {
      const startDate = $('att-view-start-date').value;
      const endDate = $('att-view-end-date').value;

      hideElement(viewError);
      setLoading(viewRecordsBtn, viewSpinner, viewBtnText, true);

      let queryParams = `name=${encodeURIComponent(currentUser.name)}&ministry=${encodeURIComponent(currentUser.ministry)}&location=${encodeURIComponent(currentUser.location)}`;
      if (startDate) queryParams += `&startDate=${startDate}`;
      if (endDate) queryParams += `&endDate=${endDate}`;

      // We'll fetch all attendee types for this date range (no server-side attendeeTypes filter)
      // and then apply type filters client-side so toggling type filters doesn't trigger
      // additional API requests for the same date range.
      const cacheKey = `${startDate || ''}|${endDate || ''}|${currentUser?.location || ''}`;
      const viewTypes = getViewSelectedTypes();

      // If we already fetched this date range, re-filter locally and return early
      if (lastViewQueryKey === cacheKey && Array.isArray(recordsDataRaw) && recordsDataRaw.length >= 0) {
        try {
          // recordsDataRaw is normalized when first cached (see below) so filtering is correct
          recordsData = filterRecordsByTypes(recordsDataRaw, viewTypes);
          renderRecords(recordsData);
          recordsCount.textContent = recordsData.length;
          showElement(recordsSection);
        } finally {
          setLoading(viewRecordsBtn, viewSpinner, viewBtnText, false);
        }
        return;
      }

      try {
        const { ok, data } = await apiCall(`/attendance?${queryParams}`);

        if (ok && Array.isArray(data)) {
          // Cache full result for this date range and apply the current view-type filter
          recordsDataRaw = ensureNormalizedRecords(data);
          lastViewQueryKey = cacheKey;
          recordsData = filterRecordsByTypes(recordsDataRaw, viewTypes);
          renderRecords(recordsData);
          recordsCount.textContent = recordsData.length;
          showElement(recordsSection);
        } else {
          showError(viewError, data.message || 'Failed to load records');
        }
      } catch (error) {
        showError(viewError, 'Network error. Please try again.');
      } finally {
        setLoading(viewRecordsBtn, viewSpinner, viewBtnText, false);
      }
    }

    function renderRecords(records) {
      if (records.length === 0) {
        recordsTbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: #888;">
            No attendance records found for the selected date range.
          </td>
        </tr>
      `;
        return;
      }

      recordsTbody.innerHTML = records.map(record => `
      <tr>
        <td>${record.FirstName || ''} ${record.LastName || ''}</td>
        <td><span class="att-badge ${getAttendeeTypeBadgeClass(getNormalizedAttendeeType(record))}">${getNormalizedAttendeeType(record) || ''}</span></td>
        <td>${formatDate(record.StartDateTime)}</td>
        <td>${formatTime(record.StartDateTime)} - ${formatTime(record.EndDateTime)}</td>
        <td>${record.Notes || ''}</td>
        <td>
          <button class="att-btn att-btn-secondary" style="padding: 6px 12px; font-size: 12px;" 
            onclick="window.attEditRecord('${record.EventID}', this)">Edit</button>
        </td>
      </tr>
    `).join('');
    }

    function filterRecordsByTypes(records, types) {
      if (!Array.isArray(types) || (types.length === 1 && types[0] === 'All')) return records;
      const normalized = types.map(t => t.toLowerCase());
      return records.filter(r => {
        const t = (getNormalizedAttendeeType(r) || '').toLowerCase();
        if (!t) return false;
        return normalized.some(sel => {
          if (sel === 'child' || sel === 'children') return t.includes('child');
          return t === sel;
        });
      });
    }

    // ============================================
    // EDIT RECORD MODAL
    // ============================================
    window.attEditRecord = function (eventId, triggerBtn) {
      // If a trigger button was passed in (records table), hide it while modal is active
      try {
        if (triggerBtn && triggerBtn.classList) {
          triggerBtn.classList.add('att-edit-hidden');
          try { triggerBtn.disabled = true; triggerBtn.style.display = 'none'; } catch(e) {}
          __hiddenEditButton = triggerBtn;
        }
      } catch (e) {}
      const record = recordsData.find(r => r.EventID === eventId);
      if (!record) return;

      $('att-edit-event-id').value = record.EventID;
      $('att-edit-person-id').value = record.PersonID;
      $('att-edit-firstname').value = record.FirstName || '';
      $('att-edit-lastname').value = record.LastName || '';
      $('att-edit-start').value = formatDateTimeLocal(record.StartDateTime);
      $('att-edit-end').value = formatDateTimeLocal(record.EndDateTime);
      $('att-edit-type').value = getNormalizedAttendeeType(record) || 'Student';
      $('att-edit-notes').value = record.Notes || '';
      $('att-edit-level').value = record.Level || '';
      $('att-edit-class').value = record.ClassPlacement || '';

      hideElement(modalError);
      showElement(editModal);
    };

    // Open the same edit modal but in "collect" mode for a person (no EventID)
    function openCollectEditModal(personId) {
      // locate the attendee record from the cached attendeesData or DOM
      let record = attendeesData.find(a => a.PersonID === personId);
      if (!record) {
        const cb = document.getElementById(`att-cb-${personId}`);
        if (cb && cb.dataset && cb.dataset.attendee) {
          try { record = JSON.parse(cb.dataset.attendee); } catch (e) { record = null; }
        }
      }
      if (!record) return;

      // put empty event id so saveRecordChanges will treat this as a local update
      $('att-edit-event-id').value = '';
      $('att-edit-person-id').value = record.PersonID || '';
      $('att-edit-firstname').value = record.FirstName || '';
      $('att-edit-lastname').value = record.LastName || '';
      // Default start/end to attendee values, falling back to the computed event range
      try {
        const effectiveEventCfg = temporaryEventConfig || getEventConfig() || {};
        const computed = computeEventDateRangeFromConfig(effectiveEventCfg);
        const startVal = record.StartDateTime ? formatDateTimeLocal(record.StartDateTime) : (computed ? formatDateTimeLocal(computed.startIso) : '');
        const endVal = record.EndDateTime ? formatDateTimeLocal(record.EndDateTime) : (computed ? formatDateTimeLocal(computed.endIso) : '');
        $('att-edit-start').value = startVal;
        $('att-edit-end').value = endVal;
      } catch (e) {
        $('att-edit-start').value = record.StartDateTime ? formatDateTimeLocal(record.StartDateTime) : '';
        $('att-edit-end').value = record.EndDateTime ? formatDateTimeLocal(record.EndDateTime) : '';
      }
      $('att-edit-type').value = getNormalizedAttendeeType(record) || 'Student';
      $('att-edit-notes').value = record.Notes || '';
      $('att-edit-level').value = record.Level || '';
      $('att-edit-class').value = record.ClassPlacement || '';
      $('att-edit-assessment').value = record.AssessmentScore || '';

      hideElement(modalError);
      // hide the per-row edit button while modal is active
      try {
        const cbElem = document.getElementById(`att-cb-${personId}`);
        if (cbElem) {
          const row = cbElem.closest('.att-attendee-item');
          const btn = row ? row.querySelector('.att-edit-record-btn') : null;
            if (btn) {
            btn.classList.add('att-edit-hidden');
            try { btn.disabled = true; btn.style.display = 'none'; } catch (e) {}
            __hiddenEditButton = btn;
          }
        }
      } catch (e) {}

      showElement(editModal);
    }

    function closeModal() {
      hideElement(editModal);
      // restore any hidden edit button when closing
      if (__hiddenEditButton) {
        try { __hiddenEditButton.classList.remove('att-edit-hidden'); __hiddenEditButton.disabled = false; __hiddenEditButton.style.display = ''; } catch (e) {}
        __hiddenEditButton = null;
      }
    }

    async function saveRecordChanges() {
      const eventId = $('att-edit-event-id').value;
      const personId = $('att-edit-person-id').value;

      const changes = [{
        EventID: eventId,
        PersonID: personId,
        FirstName: $('att-edit-firstname').value,
        LastName: $('att-edit-lastname').value,
        StartDateTime: new Date($('att-edit-start').value).toISOString(),
        EndDateTime: new Date($('att-edit-end').value).toISOString(),
        AttendeeType: $('att-edit-type').value,
        Notes: $('att-edit-notes').value,
        Level: $('att-edit-level').value,
        ClassPlacement: $('att-edit-class').value,
        AssessmentScore: $('att-edit-assessment').value
      }];

      // If this is a collect-mode edit (no EventID), update local attendee state and DOM
      if (!eventId) {
        try {
          const personId = $('att-edit-person-id').value;
          // find attendee in attendeesData and update in-place
          let idx = attendeesData.findIndex(a => a.PersonID === personId);
          const updated = {
            ...((idx >= 0) ? attendeesData[idx] : {}),
            FirstName: $('att-edit-firstname').value,
            LastName: $('att-edit-lastname').value,
            AttendeeType: $('att-edit-type').value,
            Notes: $('att-edit-notes').value,
            Level: $('att-edit-level').value,
            ClassPlacement: $('att-edit-class').value,
            AssessmentScore: $('att-edit-assessment').value,
            // capture explicit start/end if provided in the modal
            StartDateTime: (function () {
              const v = $('att-edit-start').value; try { return v ? new Date(v).toISOString() : ''; } catch (e) { return '' }
            })(),
            EndDateTime: (function () {
              const v = $('att-edit-end').value; try { return v ? new Date(v).toISOString() : ''; } catch (e) { return '' }
            })()
          };

          if (idx >= 0) {
            attendeesData[idx] = updated;
          } else {
            attendeesData.push(updated);
            idx = attendeesData.length - 1;
          }

          // update the DOM checkbox dataset for this person if present
          const cb = document.getElementById(`att-cb-${personId}`);
          if (cb) {
            try { cb.dataset.attendee = JSON.stringify(updated).replace(/'/g, "&#39;"); } catch (e) {}
            // update row UI for class placement / level / has-data indicator
            const row = cb.closest('.att-attendee-item');
            if (row) {
              // Update visible name
              const nameEl = row.querySelector('.att-attendee-name');
              if (nameEl) nameEl.textContent = `${updated.FirstName || ''} ${updated.LastName || ''}`.trim();
              // Update badge text and classes
              const badgeEl = row.querySelector('.att-badge');
              if (badgeEl) {
                badgeEl.textContent = updated.AttendeeType || '';
                // update badge class if helper available
                try {
                  const cls = getAttendeeTypeBadgeClass(updated.AttendeeType);
                  badgeEl.className = `att-badge ${cls}`;
                } catch (e) {}
              }

              const cpEl = row.querySelector('.att-class-placement');
              if (cpEl) cpEl.textContent = updated.ClassPlacement || '';
              const lvlEl = row.querySelector('.att-level');
              if (lvlEl) lvlEl.textContent = updated.Level || '';
              // update attendee time display if present
              const timeEl = row.querySelector('.att-attendee-time');
              const s = updated.StartDateTime ? formatTime(updated.StartDateTime) : '';
              const e = updated.EndDateTime ? formatTime(updated.EndDateTime) : '';
              if (s || e) {
                if (timeEl) {
                  timeEl.textContent = `${s}${s && e ? ' - ' + e : ''}`;
                } else {
                  const div = document.createElement('div');
                  div.className = 'att-attendee-time';
                  div.textContent = `${s}${s && e ? ' - ' + e : ''}`;
                  // insert after details (if present) otherwise append in info area
                  const detailsEl = row.querySelector('.att-attendee-details');
                  if (detailsEl && detailsEl.parentNode) detailsEl.parentNode.insertBefore(div, detailsEl.nextSibling); else {
                    const info = row.querySelector('.att-attendee-info'); if (info) info.appendChild(div);
                  }
                }
              } else if (timeEl) {
                timeEl.remove();
              }
              // ensure the row stays selected and checkbox remains checked
              cb.checked = true;
              row.classList.add('selected');
              updateSelectedCount();

              // show or hide the small pip indicator
              const pip = row.querySelector('.att-attendee-has-data');
              const has = (updated.Notes || updated.ClassPlacement || updated.AssessmentScore || updated.Level);
              if (has && !pip) {
                const actions = row.querySelector('.att-attendee-actions');
                if (actions) {
                  const s = document.createElement('span');
                  s.className = 'att-attendee-has-data';
                  s.title = 'Has notes or placement';
                  actions.appendChild(s);
                }
              } else if (!has && pip) {
                pip.remove();
              }
            }
          }

          // Inform user this saved locally and will be included when submitting attendance
          try { showSuccess(submitSuccess, 'Saved locally — will be included when you submit attendance'); } catch (e) {}
          setTimeout(() => { hideElement(submitSuccess); }, 2200);
          closeModal();
          return;
        } catch (err) {
          showError(modalError, 'Failed to save changes locally');
          return;
        }
      }

      // Otherwise persist to server (existing flow)
      hideElement(modalError);
      setLoading(modalSave, $('att-modal-save-spinner'), $('att-modal-save-text'), true);

      try {
        const { ok, data } = await apiCall('/attendance', {
          method: 'PATCH',
          body: JSON.stringify({
            name: currentUser.name,
            ministry: currentUser.ministry,
            location: currentUser.location,
            changes
          })
        });

        if (ok) {
          closeModal();
          viewRecords(); // Refresh the records
        } else {
          showError(modalError, data.message || 'Failed to save changes');
        }
      } catch (error) {
        showError(modalError, 'Network error. Please try again.');
      } finally {
        setLoading(modalSave, $('att-modal-save-spinner'), $('att-modal-save-text'), false);
      }
    }

    // ============================================
    // REGISTRATION (Student/Volunteer/Children)
    // ============================================
    let childCounter = 0;

    // Registration Type Selection
    window.attSelectRegType = function (type) {
      selectedRegType = type;
      regTypeInput.value = type;

      // Update card selection UI
      document.querySelectorAll('.att-reg-type-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.type === type);
      });

      // Show form container
      hideElement(regTypeSelection);
      showElement(regFormContainer);

      // Update type label
      regTypeLabel.innerHTML = `<strong>Registering as:</strong> ${type === 'Student' ? '\u{1F393} Student' : '\u{1F91D} Site Volunteer'}`;

      // Show/hide student-specific elements
      const isStudent = type === 'Student';
      document.querySelectorAll('.att-student-only').forEach(el => {
        el.style.display = isStudent ? '' : 'none';
      });
      showElement(studentFields);
      if (!isStudent) {
        hideElement(studentFields);
      }

      // Update step 3 buttons
      const volunteerSubmit = document.querySelector('.att-volunteer-submit');
      const studentNext = document.querySelector('.att-student-next');
      if (isStudent) {
        hideElement(volunteerSubmit);
        showElement(studentNext);
      } else {
        showElement(volunteerSubmit);
        hideElement(studentNext);
      }

      // Reset to first page
      currentFormPage = 1;
      updateFormPage();
    };

    // Back to type selection
    function backToTypeSelection() {
      hideElement(regFormContainer);
      showElement(regTypeSelection);
      hideElement(regSuccess);
      hideElement(regError);
      selectedRegType = null;
      regTypeInput.value = '';
      document.querySelectorAll('.att-reg-type-card').forEach(card => {
        card.classList.remove('selected');
      });
      currentFormPage = 1;
      updateFormPage();
    }

    // Form pagination
    function getTotalPages() {
      return selectedRegType === 'Student' ? 4 : 3;
    }

    window.attNextPage = function () {
      const totalPages = getTotalPages();
      if (currentFormPage < totalPages) {
        // Validate current page before moving
        if (!validateCurrentPage()) return;
        currentFormPage++;
        updateFormPage();
      }
    };

    window.attPrevPage = function () {
      if (currentFormPage > 1) {
        currentFormPage--;
        updateFormPage();
      }
    };

    function updateFormPage() {
      // Update pages
      document.querySelectorAll('.att-form-page').forEach(page => {
        const pageNum = parseInt(page.dataset.page);
        page.classList.toggle('active', pageNum === currentFormPage);
      });

      // Update step indicators
      document.querySelectorAll('.att-form-step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove('active', 'completed');
        if (stepNum === currentFormPage) {
          step.classList.add('active');
        } else if (stepNum < currentFormPage) {
          step.classList.add('completed');
        }
      });

      // Update dividers
      document.querySelectorAll('.att-step-divider').forEach((divider, index) => {
        divider.classList.toggle('completed', index + 1 < currentFormPage);
      });
    }

    function validateCurrentPage() {
      if (currentFormPage === 1) {
        const firstName = $('att-reg-firstname').value.trim();
        const lastName = $('att-reg-lastname').value.trim();
        const email = $('att-reg-email').value.trim();
        const phone = $('att-reg-phone').value.trim();

        if (!firstName || !lastName || !email || !phone) {
          showError(regError, 'Please fill in all required fields (First Name, Last Name, Email, Phone)');
          return false;
        }

        // Basic email validation
        if (!email.includes('@') || !email.includes('.')) {
          showError(regError, 'Please enter a valid email address');
          return false;
        }
      }
      hideElement(regError);
      return true;
    }

    // Address Autocomplete using OpenStreetMap Nominatim
    function searchAddress(query) {
      if (query.length < 3) {
        hideElement(addressSuggestions);
        return;
      }

      clearTimeout(addressDebounceTimer);
      addressDebounceTimer = setTimeout(async () => {
        // show a brief searching indicator while the remote lookup runs
        try {
          addressSuggestions.innerHTML = `
            <div class="att-loading-inner" style="padding:12px 18px; display:flex; align-items:center; gap:8px;">
              <span class="att-spinner" aria-hidden="true"></span>
              <div style="font-size:14px; color:var(--muted);">Searching…</div>
            </div>
          `;
          showElement(addressSuggestions);
        } catch (e) {}
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=us&limit=5&q=${encodeURIComponent(query)}`,
            { headers: { 'User-Agent': 'RefugeAttendanceTracker/1.0' } }
          );
          const results = await response.json();

          if (results.length > 0) {
            displayAddressSuggestions(results);
          } else {
            addressSuggestions.innerHTML = '';
            hideElement(addressSuggestions);
          }
        } catch (error) {
          console.error('Address search error:', error);
          addressSuggestions.innerHTML = '';
          hideElement(addressSuggestions);
        }
      }, 300);
    }

    function displayAddressSuggestions(results) {
      addressSuggestions.innerHTML = results.map((result, index) => `
      <div class="att-address-suggestion" data-index="${index}" onclick="window.attSelectAddress(${index})">
        ${result.display_name}
      </div>
    `).join('');
      addressSuggestions.dataset.results = JSON.stringify(results);
      showElement(addressSuggestions);
    }

    window.attSelectAddress = function (index) {
      const results = JSON.parse(addressSuggestions.dataset.results);
      const selected = results[index];
      const address = selected.address || {};

      // Parse and fill address fields
      const houseNumber = address.house_number || '';
      const road = address.road || '';
      $('att-reg-street1').value = `${houseNumber} ${road}`.trim();
      $('att-reg-city').value = address.city || address.town || address.village || address.municipality || '';
      $('att-reg-state').value = address.state || '';
      $('att-reg-zip').value = address.postcode || '';
      $('att-reg-country').value = address.country || 'USA';

      // Update search input with selected address
      addressSearchInput.value = selected.display_name;
      hideElement(addressSuggestions);
    };

    function toggleManualAddressEntry() {
      const isHidden = manualAddressFields.classList.contains('att-hidden');
      if (isHidden) {
        showElement(manualAddressFields);
        toggleManualAddress.textContent = 'Use address search';
        hideElement(addressSuggestions);
      } else {
        hideElement(manualAddressFields);
        toggleManualAddress.textContent = 'Enter address manually';
      }
    }

    // Child management functions
    function addChildEntry() {
      childCounter++;
      const childCard = document.createElement('div');
      childCard.className = 'att-child-card';
      childCard.id = `att-child-${childCounter}`;
      childCard.innerHTML = `
      <h4>
        <span>Child ${childrenContainer.children.length + 1}</span>
        <button type="button" class="att-remove-child" onclick="window.attRemoveChild(${childCounter})">&times;</button>
      </h4>
      <div class="att-form-row">
        <div class="att-form-group">
          <label>First Name *</label>
          <input type="text" class="child-firstname" required>
        </div>
        <div class="att-form-group">
          <label>Last Name *</label>
          <input type="text" class="child-lastname" required>
        </div>
      </div>
      <div class="att-form-row">
        <div class="att-form-group">
          <label>Birthdate</label>
          <input type="date" class="child-birthdate">
        </div>
        <div class="att-form-group">
          <label>Gender</label>
          <select class="child-gender">
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>
      <div class="att-form-row">
        <div class="att-form-group">
          <div class="att-checkbox-group">
            <input type="checkbox" class="child-allergies" id="child-allergies-${childCounter}">
            <label for="child-allergies-${childCounter}">Child has allergies</label>
          </div>
        </div>
      </div>
      <div class="att-form-group child-allergy-details-group att-hidden">
        <label>Allergy Details *</label>
        <textarea class="child-allergy-details" rows="2" placeholder="Please list all allergies and severity..."></textarea>
      </div>
      <div class="att-form-group">
        <label>Additional Notes</label>
        <textarea class="child-notes" rows="2" placeholder="Any special instructions for childcare..."></textarea>
      </div>
    `;
      childrenContainer.appendChild(childCard);

      // Add allergy checkbox toggle listener
      const allergyCheckbox = childCard.querySelector('.child-allergies');
      const allergyDetailsGroup = childCard.querySelector('.child-allergy-details-group');
      allergyCheckbox.addEventListener('change', () => {
        if (allergyCheckbox.checked) {
          allergyDetailsGroup.classList.remove('att-hidden');
        } else {
          allergyDetailsGroup.classList.add('att-hidden');
        }
      });
      renumberChildren();
    }

    window.attRemoveChild = function (id) {
      const child = $(`att-child-${id}`);
      if (child) {
        child.remove();
        renumberChildren();
      }
    };

    function renumberChildren() {
      const children = childrenContainer.querySelectorAll('.att-child-card');
      children.forEach((child, index) => {
        child.querySelector('h4 span').textContent = `Child ${index + 1}`;
      });
    }

    function getChildrenData() {
      const children = [];
      childrenContainer.querySelectorAll('.att-child-card').forEach(card => {
        const firstName = card.querySelector('.child-firstname').value.trim();
        const lastName = card.querySelector('.child-lastname').value.trim();
        if (firstName && lastName) {
          children.push({
            firstName,
            lastName,
            birthdate: card.querySelector('.child-birthdate').value || undefined,
            gender: card.querySelector('.child-gender').value || undefined,
            hasAllergies: card.querySelector('.child-allergies').checked,
            allergyDetails: card.querySelector('.child-allergy-details').value.trim() || undefined,
            notes: card.querySelector('.child-notes').value.trim() || undefined
          });
        }
      });
      return children;
    }

    // Submit registration
    window.attSubmitReg = async function () {
      if (!selectedRegType) {
        showError(regError, 'Please select a registration type');
        return;
      }

      hideElement(regError);
      hideElement(regSuccess);

      const submitBtn = document.querySelector('.att-form-page.active .att-btn-primary:last-child');
      if (submitBtn) submitBtn.disabled = true;
      showElement(regSpinner);
      regBtnText.style.opacity = '0.5';

      const registrationData = {
        registrationType: selectedRegType,
        firstName: $('att-reg-firstname').value.trim(),
        lastName: $('att-reg-lastname').value.trim(),
        email: $('att-reg-email').value.trim(),
        phoneNumber: $('att-reg-phone').value.trim(),
        ministry: currentUser.ministry,
        location: currentUser.location,
        street1: $('att-reg-street1').value.trim(),
        street2: $('att-reg-street2').value.trim(),
        city: $('att-reg-city').value.trim(),
        state: $('att-reg-state').value.trim(),
        zip: $('att-reg-zip').value.trim(),
        country: $('att-reg-country').value.trim(),
        birthdate: $('att-reg-birthdate').value || undefined,
        gender: $('att-reg-gender').value || undefined,
        churchName: $('att-reg-church').value.trim(),
        emailOptIn: $('att-reg-email-optin').checked,
        // Student-specific fields
        level: selectedRegType === 'Student' ? $('att-reg-level').value.trim() : undefined,
        classPlacement: selectedRegType === 'Student' ? $('att-reg-class').value.trim() : undefined,
        assessmentScore: selectedRegType === 'Student' ? $('att-reg-assessment').value.trim() : undefined,
        // Children
        children: selectedRegType === 'Student' ? getChildrenData() : []
      };

      try {
        const { ok, data } = await apiCall('/registrations', {
          method: 'POST',
          body: JSON.stringify(registrationData)
        });

        if (ok) {
          let successMessage = data.message || 'Registration completed successfully!';
          if (data.childResults && data.childResults.length > 0) {
            const failed = data.childResults.filter(c => !c.success);
            if (failed.length > 0) {
              successMessage += ' Some children could not be registered: ' + failed.map(c => c.name).join(', ');
            }
          }
          showSuccess(regSuccess, successMessage);

          // Reset form
          registerForm.reset();
          $('att-reg-country').value = 'USA';
          $('att-reg-email-optin').checked = true;
          childrenContainer.innerHTML = '';
          childCounter = 0;
          addressSearchInput.value = '';

          // Go back to type selection
          backToTypeSelection();
        } else {
          showError(regError, data.message || 'Failed to complete registration');
        }
      } catch (error) {
        showError(regError, 'Network error. Please try again.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        hideElement(regSpinner);
        regBtnText.style.opacity = '1';
      }
    };

    // ============================================
    // EXPORT
    // ============================================

    // Preview export data
    async function previewExportData() {
      const activeTypeBtn = document.querySelector('.att-export-type-btn.active');
      const type = activeTypeBtn ? activeTypeBtn.dataset.type : 'attendance';
      const startDate = $('att-export-start-date').value;
      const endDate = $('att-export-end-date').value;

      hideElement(exportError);
      hideElement(exportSuccess);
      hideElement(exportPreviewSection);

      const spinner = $('att-preview-spinner');
      const btnText = $('att-preview-btn-text');
      exportPreviewBtn.disabled = true;
      showElement(spinner);
      btnText.style.opacity = '0.5';

      let queryParams = `name=${encodeURIComponent(currentUser.name)}&ministry=${encodeURIComponent(currentUser.ministry)}&location=${encodeURIComponent(currentUser.location)}&type=${type}&format=json`;
      if (startDate) queryParams += `&startDate=${startDate}`;
      if (endDate) queryParams += `&endDate=${endDate}`;
      // We'll fetch the full dataset for the given export type + date-range and then
      // apply attendee-type filtering client-side. This avoids multiple API calls
      // while toggling type filters for the same date range.
      const cacheKey = `${type}|${startDate || ''}|${endDate || ''}|${currentUser?.location || ''}`;
      const selectedTypes = getExportSelectedTypes();

      // If we have cached raw data for this exact key, just filter & render immediately
      if (lastExportQueryKey === cacheKey && cachedExportDataRaw && (cachedExportDataRaw.records || cachedExportDataRaw.attendees)) {
        // Filter locally and render
        const filtered = filterExportRecordsByTypes(cachedExportDataRaw.records || cachedExportDataRaw.attendees || [], selectedTypes);
        // Build a response-shaped object so renderExportPreview works unchanged
        const filteredResponse = Object.assign({}, cachedExportDataRaw, { records: filtered, attendees: filtered });
        cachedExportData = { data: cachedExportDataRaw, type, startDate, endDate };
        renderExportPreview(filteredResponse);
        showElement(exportPreviewSection);
        exportPreviewBtn.disabled = false;
        hideElement(spinner);
        btnText.style.opacity = '1';
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/export?${queryParams}`);
        const data = await response.json();

        if (response.ok) {
          // Cache the raw response for this query key (full dataset)
          // Normalize records before caching so subsequent client-side filters see canonical types
          const allRecords = data.records || data.attendees || [];
          const normalized = ensureNormalizedRecords(allRecords);
          data.records = normalized;
          data.attendees = normalized;
          cachedExportDataRaw = data;
          lastExportQueryKey = cacheKey;
          // Apply the current attendee-type filtering locally when rendering
          const normalizedRecords = data.records || data.attendees || [];
          const filtered = filterExportRecordsByTypes(normalizedRecords, selectedTypes);
          const filteredResponse = Object.assign({}, data, { records: filtered, attendees: filtered });
          cachedExportData = { data, type, startDate, endDate };
          renderExportPreview(filteredResponse);
          showElement(exportPreviewSection);
        } else {
          showError(exportError, data.message || 'Failed to load preview');
        }
      } catch (error) {
        showError(exportError, 'Network error. Please try again.');
      } finally {
        exportPreviewBtn.disabled = false;
        hideElement(spinner);
        btnText.style.opacity = '1';
      }
    }

    // Render preview table
    function renderExportPreview(data) {
      const records = data.records || data.attendees || [];

      // Count by normalized type
      const counts = { Student: 0, Volunteer: 0, Child: 0 };
      records.forEach(r => {
        const recType = getNormalizedAttendeeType(r) || 'Unknown';
        if (counts[recType] !== undefined) counts[recType]++;
      });

      // Update counts display
      $('att-export-count').textContent = records.length;
      $('att-preview-students').textContent = counts.Student;
      $('att-preview-volunteers').textContent = counts.Volunteer;
      $('att-preview-children').textContent = counts.Child;

      // Render table rows
      exportPreviewTbody.innerHTML = records.map(record => {
        const name = record.Name || record.Contact?.Name || `${record.FirstName || ''} ${record.LastName || ''}`.trim() || 'N/A';
        const recType = getNormalizedAttendeeType(record) || '';
        const date = record.StartDateTime || record.LastActivityDate ? new Date(record.StartDateTime || record.LastActivityDate).toLocaleDateString() : '';
        const email = record.Email || record.Contact?.Email || '';
        const phone = record.Phone || record.MobilePhone || record.Contact?.Phone || '';

        const badgeClass = recType === 'Student' ? 'att-badge-student' :
          recType === 'Volunteer' ? 'att-badge-volunteer' : 'att-badge-child';

        return `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td><span class="att-badge ${badgeClass}">${escapeHtml(recType)}</span></td>
          <td>${escapeHtml(date)}</td>
          <td>${escapeHtml(email)}</td>
          <td>${escapeHtml(phone)}</td>
        </tr>
      `;
      }).join('');

      if (records.length === 0) {
        exportPreviewTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888; padding: 24px;">No records found for the selected criteria.</td></tr>';
      }
    }

    function filterExportRecordsByTypes(records, types) {
      if (!Array.isArray(types) || (types.length === 1 && types[0] === 'All')) return records;
      const normalized = types.map(t => t.toLowerCase());
      return records.filter(r => {
        const recType = (getNormalizedAttendeeType(r) || '').toLowerCase();
        if (!recType) return false;
        return normalized.some(sel => {
          if (sel === 'child' || sel === 'children') return recType.includes('child');
          return recType === sel;
        });
      });
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // Export data in selected format
    async function exportData() {
      if (!cachedExportData) {
        showError(exportError, 'Please preview the data first');
        return;
      }

      const format = exportFormatSelect.value;
      const { data, type, startDate, endDate } = cachedExportData;
      const raw = cachedExportDataRaw || data;
      const recordsAll = (raw && (raw.records || raw.attendees)) ? (raw.records || raw.attendees) : [];
      const selectedTypes = getExportSelectedTypes();
      const records = filterExportRecordsByTypes(recordsAll, selectedTypes);

      hideElement(exportError);
      hideElement(exportSuccess);

      const spinner = $('att-export-spinner');
      const btnText = $('att-export-btn-text');
      exportBtn.disabled = true;
      showElement(spinner);
      btnText.style.opacity = '0.5';

      try {
        // New filename format: {location}-{type}-{yyyymmdd}
        const now = new Date();
        const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const locationSafe = (currentUser.location || 'location').replace(/\s+/g, '-');
        const filename = `${locationSafe}-${type}-${yyyymmdd}`;

        if (format === 'xlsx') {
          await generateXlsxExport(records, type, startDate, endDate, filename);
          showSuccess(exportSuccess, 'Excel file downloaded successfully!');
        } else if (format === 'csv') {
          generateCsvExport(records, filename);
          showSuccess(exportSuccess, 'CSV file downloaded successfully!');
        } else {
          generateJsonExport(data, filename);
          showSuccess(exportSuccess, 'JSON file downloaded successfully!');
        }
      } catch (error) {
        showError(exportError, error.message || 'Export failed');
      } finally {
        exportBtn.disabled = false;
        hideElement(spinner);
        btnText.style.opacity = '1';
      }
    }

    // Generate branded XLSX export using ExcelJS for proper .xlsx format with styling
    async function generateXlsxExport(records, type, startDate, endDate, filename) {
      if (!window.ExcelJS) {
        throw new Error('ExcelJS library not loaded. Please refresh the page and try again.');
      }

      const ExcelJS = window.ExcelJS;
      const workbook = new ExcelJS.Workbook();
      // Try to fetch the organization logo and add to the workbook so the exported xlsx is branded
      let imageId = null;
      try {
        const resp = await fetch(ORG_LOGO_URL);
        if (resp.ok) {
          const blob = await resp.blob();
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              try { resolve(reader.result.split(',')[1]); } catch (e) { reject(e); }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          imageId = workbook.addImage({ base64: base64, extension: 'png' });
        }
      } catch (e) {
        // ignore image errors -- excel still exports
        imageId = null;
      }
      // Helper to extract record data
      function getRecordData(record) {
        return {
          name: record.Name || record.Contact?.Name || `${record.FirstName || ''} ${record.LastName || ''}`.trim(),
          type: getNormalizedAttendeeType(record) || '',
          date: record.StartDateTime || record.LastActivityDate ? new Date(record.StartDateTime || record.LastActivityDate).toLocaleDateString() : '',
          email: record.Email || record.Contact?.Email || '',
          phone: record.Phone || record.MobilePhone || record.Contact?.Phone || '',
          street: record.Street || record.MailingStreet || record.Contact?.MailingStreet || '',
          city: record.City || record.MailingCity || record.Contact?.MailingCity || '',
          state: record.State || record.MailingState || record.Contact?.MailingState || '',
          zip: record.PostalCode || record.MailingPostalCode || record.Contact?.MailingPostalCode || '',
          country: record.Country || record.MailingCountry || record.Contact?.MailingCountry || '',
          notes: record.Notes || record.Notes__c || record.Description || ''
        };
      }

      // Separate records by type
      const students = [];
      const volunteers = [];
      const children = [];

      records.forEach(r => {
        const recType = getNormalizedAttendeeType(r) || 'Unknown';
        if (recType === 'Student') students.push(r);
        else if (recType === 'Volunteer') volunteers.push(r);
        else if (recType === 'Child') children.push(r);
      });

      const displayStartDate = startDate || 'All time';
      const displayEndDate = endDate || 'Present';

      // Define styles
      const brandHeaderStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 16, name: 'Arial' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBD2135' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      const subHeaderStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12, name: 'Arial' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a1a' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      const sectionTitleStyle = {
        font: { bold: true, color: { argb: 'FFBD2135' }, size: 14, name: 'Arial' },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: { bottom: { style: 'thin', color: { argb: 'FFBD2135' } } }
      };

      const tableHeaderStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Arial' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a1a' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { bottom: { style: 'thin', color: { argb: 'FF1a1a1a' } } }
      };

      const infoLabelStyle = {
        font: { bold: true, color: { argb: 'FF1a1a1a' }, size: 11, name: 'Arial' },
        alignment: { horizontal: 'left', vertical: 'center' }
      };

      const infoValueStyle = {
        font: { color: { argb: 'FF666666' }, size: 11, name: 'Arial' },
        alignment: { horizontal: 'left', vertical: 'center' }
      };

      const countLabelStyle = {
        font: { bold: true, color: { argb: 'FF1a1a1a' }, size: 11, name: 'Arial' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf5f5f5' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: { bottom: { style: 'thin', color: { argb: 'FFe0e0e0' } } }
      };

      const countValueStyle = {
        font: { bold: true, color: { argb: 'FFBD2135' }, size: 12, name: 'Arial' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf5f5f5' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { bottom: { style: 'thin', color: { argb: 'FFe0e0e0' } } }
      };

      const totalLabelStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Arial' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a1a' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      };

      const totalValueStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12, name: 'Arial' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a1a' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      const dataStyle = {
        font: { color: { argb: 'FF1a1a1a' }, size: 10, name: 'Arial' },
        alignment: { vertical: 'center', wrapText: true },
        border: { bottom: { style: 'thin', color: { argb: 'FFe0e0e0' } } }
      };

      const dataAltStyle = {
        font: { color: { argb: 'FF1a1a1a' }, size: 10, name: 'Arial' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFfafafa' } },
        alignment: { vertical: 'center', wrapText: true },
        border: { bottom: { style: 'thin', color: { argb: 'FFe0e0e0' } } }
      };

      // Helper function to create a worksheet
      function createWorksheet(sheetName, title, recordList) {
        const worksheet = workbook.addWorksheet(sheetName);

        // Set column widths
        worksheet.columns = [
          { width: 25 }, // Name
          { width: 12 }, // Type
          { width: 12 }, // Date
          { width: 25 }, // Email
          { width: 15 }, // Phone
          { width: 20 }, // Street
          { width: 15 }, // City
          { width: 8 },  // State
          { width: 10 }, // ZIP
          { width: 12 }, // Country
          { width: 30 }  // Notes
        ];

        let rowIndex = 1;

        // Brand Header (text + optional logo image)
        const brandRow = worksheet.getRow(rowIndex++);
        brandRow.height = 35;
        const brandCell = brandRow.getCell(1);
        brandCell.value = 'REFUGE INTERNATIONAL';
        brandCell.style = brandHeaderStyle;
        worksheet.mergeCells(rowIndex - 1, 1, rowIndex - 1, 11);
        if (imageId) {
          try {
            // place logo top-right of header in the sheet
            worksheet.addImage(imageId, { tl: { col: 10, row: 0 }, ext: { width: 64, height: 64 } });
          } catch (e) { /* ignore */ }
        }

        // Location Header
        const locationRow = worksheet.getRow(rowIndex++);
        locationRow.height = 28;
        const locationCell = locationRow.getCell(1);
        locationCell.value = `${currentUser.ministry} - ${currentUser.location}`;
        locationCell.style = subHeaderStyle;
        worksheet.mergeCells(rowIndex - 1, 1, rowIndex - 1, 11);

        // Spacer
        rowIndex++;

        // Section Title
        const titleRow = worksheet.getRow(rowIndex++);
        titleRow.height = 25;
        const titleCell = titleRow.getCell(1);
        titleCell.value = title;
        titleCell.style = sectionTitleStyle;
        worksheet.mergeCells(rowIndex - 1, 1, rowIndex - 1, 11);

        // Count
        const countRow = worksheet.getRow(rowIndex++);
        countRow.height = 22;
        countRow.getCell(1).value = 'Total Records:';
        countRow.getCell(1).style = infoLabelStyle;
        countRow.getCell(2).value = recordList.length;
        countRow.getCell(2).style = countValueStyle;

        // Spacer
        rowIndex++;

        // Table Header
        const headerRow = worksheet.getRow(rowIndex++);
        headerRow.height = 25;
        const headers = ['Name', 'Type', 'Date', 'Email', 'Phone', 'Street', 'City', 'State', 'ZIP', 'Country', 'Notes'];
        headers.forEach((header, index) => {
          const cell = headerRow.getCell(index + 1);
          cell.value = header;
          cell.style = tableHeaderStyle;
        });

        // Add data rows
        recordList.forEach((record, idx) => {
          const d = getRecordData(record);
          const row = worksheet.getRow(rowIndex++);
          row.height = 22;

          const style = idx % 2 === 0 ? dataStyle : dataAltStyle;

          row.getCell(1).value = d.name;
          row.getCell(2).value = d.type;
          row.getCell(3).value = d.date;
          row.getCell(4).value = d.email;
          row.getCell(5).value = d.phone;
          row.getCell(6).value = d.street;
          row.getCell(7).value = d.city;
          row.getCell(8).value = d.state;
          row.getCell(9).value = d.zip;
          row.getCell(10).value = d.country;
          row.getCell(11).value = d.notes;

          for (let i = 1; i <= 11; i++) {
            row.getCell(i).style = style;
          }
        });
      }

      // Create Summary worksheet
      const summarySheet = workbook.addWorksheet('Summary');

      // Set column widths for summary
      summarySheet.columns = [
        { width: 25 }, // Name
        { width: 12 }, // Type
        { width: 12 }, // Date
        { width: 25 }, // Email
        { width: 15 }, // Phone
        { width: 20 }, // Street
        { width: 15 }, // City
        { width: 8 },  // State
        { width: 10 }, // ZIP
        { width: 12 }, // Country
        { width: 30 }  // Notes
      ];

      let summaryRowIndex = 1;

      // Brand Header and optional logo for summary
      const summaryBrandRow = summarySheet.getRow(summaryRowIndex++);
      summaryBrandRow.height = 40;
      const summaryBrandCell = summaryBrandRow.getCell(1);
      summaryBrandCell.value = 'REFUGE INTERNATIONAL';
      summaryBrandCell.style = brandHeaderStyle;
      summarySheet.mergeCells(summaryRowIndex - 1, 1, summaryRowIndex - 1, 11);
      if (imageId) {
        try {
          summarySheet.addImage(imageId, { tl: { col: 10, row: 0 }, ext: { width: 80, height: 80 } });
        } catch (e) { /* ignore */ }
      }

      // Location Header
      const summaryLocationRow = summarySheet.getRow(summaryRowIndex++);
      summaryLocationRow.height = 30;
      const summaryLocationCell = summaryLocationRow.getCell(1);
      summaryLocationCell.value = `${currentUser.ministry} - ${currentUser.location}`;
      summaryLocationCell.style = subHeaderStyle;
      summarySheet.mergeCells(summaryRowIndex - 1, 1, summaryRowIndex - 1, 11);

      // Spacer
      summaryRowIndex++;

      // Export Summary Title
      const summaryTitleRow = summarySheet.getRow(summaryRowIndex++);
      summaryTitleRow.height = 28;
      const summaryTitleCell = summaryTitleRow.getCell(1);
      summaryTitleCell.value = 'EXPORT SUMMARY';
      summaryTitleCell.style = sectionTitleStyle;
      summarySheet.mergeCells(summaryRowIndex - 1, 1, summaryRowIndex - 1, 11);

      // Spacer
      summaryRowIndex++;

      // Date Range
      const dateRangeRow = summarySheet.getRow(summaryRowIndex++);
      dateRangeRow.height = 22;
      dateRangeRow.getCell(1).value = 'Date Range:';
      dateRangeRow.getCell(1).style = infoLabelStyle;
      dateRangeRow.getCell(2).value = `${displayStartDate} to ${displayEndDate}`;
      dateRangeRow.getCell(2).style = infoValueStyle;
      summarySheet.mergeCells(summaryRowIndex - 1, 2, summaryRowIndex - 1, 3);

      // Export Date
      const exportDateRow = summarySheet.getRow(summaryRowIndex++);
      exportDateRow.height = 22;
      exportDateRow.getCell(1).value = 'Export Date:';
      exportDateRow.getCell(1).style = infoLabelStyle;
      exportDateRow.getCell(2).value = new Date().toLocaleDateString();
      exportDateRow.getCell(2).style = infoValueStyle;

      // Exported By
      const exportedByRow = summarySheet.getRow(summaryRowIndex++);
      exportedByRow.height = 22;
      exportedByRow.getCell(1).value = 'Exported By:';
      exportedByRow.getCell(1).style = infoLabelStyle;
      exportedByRow.getCell(2).value = currentUser.name;
      exportedByRow.getCell(2).style = infoValueStyle;

      // Spacer
      summaryRowIndex++;

      // Counts Title
      const countsTitleRow = summarySheet.getRow(summaryRowIndex++);
      countsTitleRow.height = 28;
      const countsTitleCell = countsTitleRow.getCell(1);
      countsTitleCell.value = 'ATTENDANCE COUNTS';
      countsTitleCell.style = sectionTitleStyle;
      summarySheet.mergeCells(summaryRowIndex - 1, 1, summaryRowIndex - 1, 11);

      // Spacer
      summaryRowIndex++;

      // Students Count
      const studentsRow = summarySheet.getRow(summaryRowIndex++);
      studentsRow.height = 24;
      studentsRow.getCell(1).value = 'Students';
      studentsRow.getCell(1).style = countLabelStyle;
      studentsRow.getCell(2).value = students.length;
      studentsRow.getCell(2).style = countValueStyle;

      // Volunteers Count
      const volunteersRow = summarySheet.getRow(summaryRowIndex++);
      volunteersRow.height = 24;
      volunteersRow.getCell(1).value = 'Volunteers';
      volunteersRow.getCell(1).style = countLabelStyle;
      volunteersRow.getCell(2).value = volunteers.length;
      volunteersRow.getCell(2).style = countValueStyle;

      // Children Count
      const childrenRow = summarySheet.getRow(summaryRowIndex++);
      childrenRow.height = 24;
      childrenRow.getCell(1).value = 'Children';
      childrenRow.getCell(1).style = countLabelStyle;
      childrenRow.getCell(2).value = children.length;
      childrenRow.getCell(2).style = countValueStyle;

      // Total
      const totalRow = summarySheet.getRow(summaryRowIndex++);
      totalRow.height = 26;
      totalRow.getCell(1).value = 'TOTAL';
      totalRow.getCell(1).style = totalLabelStyle;
      totalRow.getCell(2).value = records.length;
      totalRow.getCell(2).style = totalValueStyle;

      // Spacer
      summaryRowIndex++;

      // All Records Title
      const allRecordsTitleRow = summarySheet.getRow(summaryRowIndex++);
      allRecordsTitleRow.height = 28;
      const allRecordsTitleCell = allRecordsTitleRow.getCell(1);
      allRecordsTitleCell.value = 'ALL RECORDS';
      allRecordsTitleCell.style = sectionTitleStyle;
      summarySheet.mergeCells(summaryRowIndex - 1, 1, summaryRowIndex - 1, 11);

      // Spacer
      summaryRowIndex++;

      // Table Header
      const summaryHeaderRow = summarySheet.getRow(summaryRowIndex++);
      summaryHeaderRow.height = 25;
      const summaryHeaders = ['Name', 'Type', 'Date', 'Email', 'Phone', 'Street', 'City', 'State', 'ZIP', 'Country', 'Notes'];
      summaryHeaders.forEach((header, index) => {
        const cell = summaryHeaderRow.getCell(index + 1);
        cell.value = header;
        cell.style = tableHeaderStyle;
      });

      // Add all records to summary
      records.forEach((record, idx) => {
        const d = getRecordData(record);
        const row = summarySheet.getRow(summaryRowIndex++);
        row.height = 22;

        const style = idx % 2 === 0 ? dataStyle : dataAltStyle;

        row.getCell(1).value = d.name;
        row.getCell(2).value = d.type;
        row.getCell(3).value = d.date;
        row.getCell(4).value = d.email;
        row.getCell(5).value = d.phone;
        row.getCell(6).value = d.street;
        row.getCell(7).value = d.city;
        row.getCell(8).value = d.state;
        row.getCell(9).value = d.zip;
        row.getCell(10).value = d.country;
        row.getCell(11).value = d.notes;

        for (let i = 1; i <= 11; i++) {
          row.getCell(i).style = style;
        }
      });

      // Add type-specific worksheets
      if (students.length > 0) {
        createWorksheet('Students', 'STUDENTS', students);
      }
      if (volunteers.length > 0) {
        createWorksheet('Volunteers', 'VOLUNTEERS', volunteers);
      }
      if (children.length > 0) {
        createWorksheet('Children', 'CHILDREN', children);
      }

      // Generate and download the file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }

    // Generate CSV export
    function generateCsvExport(records, filename) {
      const headers = ['Name', 'Type', 'Date', 'Email', 'Phone', 'Street', 'City', 'State', 'ZIP', 'Country', 'Notes'];
      const rows = records.map(record => {
        const name = record.Name || record.Contact?.Name || `${record.FirstName || ''} ${record.LastName || ''}`.trim();
        const recType = getNormalizedAttendeeType(record) || '';
        const date = record.StartDateTime || record.LastActivityDate ? new Date(record.StartDateTime || record.LastActivityDate).toLocaleDateString() : '';
        const email = record.Email || record.Contact?.Email || '';
        const phone = record.Phone || record.MobilePhone || record.Contact?.Phone || '';
        const street = record.Street || record.MailingStreet || record.Contact?.MailingStreet || '';
        const city = record.City || record.MailingCity || record.Contact?.MailingCity || '';
        const state = record.State || record.MailingState || record.Contact?.MailingState || '';
        const zip = record.PostalCode || record.MailingPostalCode || record.Contact?.MailingPostalCode || '';
        const country = record.Country || record.MailingCountry || record.Contact?.MailingCountry || '';
        const notes = record.Notes || record.Notes__c || record.Description || '';

        return [name, recType, date, email, phone, street, city, state, zip, country, notes].map(val => {
          // Escape CSV values
          const str = String(val || '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',');
      });

      // Prepend a logo URL row to indicate branding (can't embed images in CSV)
      const csv = [
        `LogoURL,${ORG_LOGO_URL}`,
        headers.join(','),
        ...rows
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }

    // Generate JSON export
    function generateJsonExport(data, filename) {
      // Include branding metadata in the JSON export
      const exportObj = Object.assign({}, data, {
        logo: ORG_LOGO_URL,
        exportedAt: new Date().toISOString(),
        location: currentUser?.location || null
      });
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================
    authBtn.addEventListener('click', authorize);
    $('att-name').addEventListener('keypress', (e) => e.key === 'Enter' && authorize());
    $('att-ministry').addEventListener('keydown', (e) => e.key === 'Enter' && authorize());
    $('att-location').addEventListener('keydown', (e) => e.key === 'Enter' && authorize());

    logoutBtn.addEventListener('click', logout);

    tabs.forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Filter button event listeners -- support buttons in Collect, View, and Export tabs
    // Only wire the global handler to buttons that define a data-range attribute (date shortcuts)
    document.querySelectorAll('.att-filter-btn[data-range]').forEach(btn => {
      btn.addEventListener('click', () => {
        const parentTab = btn.closest('.att-tab-content');
        const target = parentTab ? parentTab.id.replace('att-tab-', '') : 'collect';
        setDateRange(btn.dataset.range, target);

        // Trigger action depending on which tab the buttons live in
        // For custom ranges, we only show inputs -- do not auto-run the action so the user can pick dates first.
        if (btn.dataset.range === 'custom') return;

        if (target === 'collect') {
          loadAttendees();
        } else if (target === 'view') {
          // run view records automatically when a non-custom filter is chosen
          viewRecords();
        } else if (target === 'export') {
          // refresh export preview for non-custom filters
          hideElement(exportPreviewSection);
          cachedExportData = null;
          cachedExportDataRaw = null;
          lastExportQueryKey = '';
          previewExportData();
        }
      });
    });

    searchInput.addEventListener('input', (e) => filterAttendees(e.target.value));
    // (Sort / Level / Class controls removed) no-op
    // Type filter button handlers
    [typeFilterAllBtn, typeFilterStudentsBtn, typeFilterVolunteersBtn, typeFilterChildrenBtn].forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        // Update active state
        [typeFilterAllBtn, typeFilterStudentsBtn, typeFilterVolunteersBtn, typeFilterChildrenBtn].forEach(b => b && b.classList.remove('active'));
        btn.classList.add('active');
        selectedAttendeeTypeFilter = btn.dataset.type || 'All';
        applyAttendeeFilters(searchInput.value || '');
      });
    });
    selectAllCheckbox.addEventListener('change', toggleSelectAll);
    submitBtn.addEventListener('click', submitAttendance);

    // Event configuration listeners
    saveConfigBtn.addEventListener('click', saveEventConfiguration);
    resetConfigBtn.addEventListener('click', () => {
      resetEventConfig();
      // reload derived defaults
      loadEventConfig();
      temporaryEventConfig = null;
      renderEventPreview();
      showElement(configSuccess);
      configSuccess.textContent = 'Configuration reset to defaults!';
      setTimeout(() => hideElement(configSuccess), 3000);
    });

    viewRecordsBtn.addEventListener('click', viewRecords);

    // Registration form events
    backToTypeBtn.addEventListener('click', backToTypeSelection);
    addChildBtn.addEventListener('click', addChildEntry);
    addressSearchInput.addEventListener('input', (e) => searchAddress(e.target.value));
    toggleManualAddress.addEventListener('click', toggleManualAddressEntry);
    // Event config location address lookup
    eventLocationInput.addEventListener('input', debounce((e) => {
      // clear stored coords until user selects a suggestion
      eventLocationInput.dataset.lat = '';
      eventLocationInput.dataset.lon = '';
      searchEventAddress(e.target.value);
    }, 350));

    // Collect page inline edit listeners
    $('att-event-edit-inline-btn').addEventListener('click', () => openInlineEditor());
    // (settings icon removed from inline event preview) no-op for opening full event configuration here
    $('att-inline-save-btn').addEventListener('click', () => saveInlineConfig());
    $('att-inline-cancel-btn').addEventListener('click', () => closeInlineEditor());
    // Inline editor no longer contains a location input so no lookup handler required

    // Hide address suggestions when clicking outside (existing address field)
    document.addEventListener('click', (e) => {
      if (!addressSearchInput.contains(e.target) && !addressSuggestions.contains(e.target)) {
        hideElement(addressSuggestions);
      }
      // Event location suggestions
      if (typeof eventLocationInput !== 'undefined' && typeof eventLocationSuggestions !== 'undefined') {
        if (!eventLocationInput.contains(e.target) && !eventLocationSuggestions.contains(e.target)) {
          hideElement(eventLocationSuggestions);
        }
      }
      // Inline editor no longer uses a location input or suggestions
    });

    exportPreviewBtn.addEventListener('click', previewExportData);
    exportBtn.addEventListener('click', exportData);

    // Re-fetch preview when export type, filters, or dates change
    exportTypeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // toggle active state
        exportTypeButtons.forEach(b => b.classList.toggle('active', b === btn));
        hideElement(exportPreviewSection);
        cachedExportData = null;
        cachedExportDataRaw = null;
        lastExportQueryKey = '';
        cachedExportDataRaw = null;
        lastExportQueryKey = '';
        // Act like the user clicked preview so the data refreshes for this type/date range
        previewExportData();
      });
    });

    // Attendee type filter handlers
    function getExportSelectedTypes() {
      // Single-select buttons: if All active, return ['All'] to indicate no filtering
      if (exportFilterAllBtn && exportFilterAllBtn.classList.contains('active')) return ['All'];
      const list = [];
      if (exportFilterStudentsBtn && exportFilterStudentsBtn.classList.contains('active')) list.push('Student');
      if (exportFilterVolunteersBtn && exportFilterVolunteersBtn.classList.contains('active')) list.push('Volunteer');
      if (exportFilterChildrenBtn && exportFilterChildrenBtn.classList.contains('active')) list.push('Children');
      // If nothing selected, default to All
      if (list.length === 0) return ['All'];
      return list;
    }

    // For View Records tab: determine selected type(s) from view filter buttons
    function getViewSelectedTypes() {
      if (viewFilterAllBtn && viewFilterAllBtn.classList.contains('active')) return ['All'];
      const list = [];
      if (viewFilterStudentsBtn && viewFilterStudentsBtn.classList.contains('active')) list.push('Student');
      if (viewFilterVolunteersBtn && viewFilterVolunteersBtn.classList.contains('active')) list.push('Volunteer');
      if (viewFilterChildrenBtn && viewFilterChildrenBtn.classList.contains('active')) list.push('Child');
      if (list.length === 0) return ['All'];
      return list;
    }

    // Wire up view filter buttons (single-select behavior)
    [viewFilterAllBtn, viewFilterStudentsBtn, viewFilterVolunteersBtn, viewFilterChildrenBtn].forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        [viewFilterAllBtn, viewFilterStudentsBtn, viewFilterVolunteersBtn, viewFilterChildrenBtn].forEach(b => b && b.classList.remove('active'));
        btn.classList.add('active');
        // refresh records for the selected filter
        hideElement(recordsSection);
        // run viewRecords to immediately apply the new filter
        viewRecords();
      });
    });

    // Attach click handlers to the export type buttons so it's single-select and refreshes preview
    [exportFilterAllBtn, exportFilterStudentsBtn, exportFilterVolunteersBtn, exportFilterChildrenBtn].forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        // clear active state on all
        [exportFilterAllBtn, exportFilterStudentsBtn, exportFilterVolunteersBtn, exportFilterChildrenBtn].forEach(b => b && b.classList.remove('active'));
        // mark clicked button active
        btn.classList.add('active');
        // Try to use cached data for filtering if we already fetched the full dataset for the
        // selected export type + date-range. If not cached, behave like pressing Preview.
        const activeTypeBtn = document.querySelector('.att-export-type-btn.active');
        const type = activeTypeBtn ? activeTypeBtn.dataset.type : 'attendance';
        const startDate = $('att-export-start-date').value;
        const endDate = $('att-export-end-date').value;
        const cacheKey = `${type}|${startDate || ''}|${endDate || ''}|${currentUser?.location || ''}`;

        if (lastExportQueryKey === cacheKey && cachedExportDataRaw && (cachedExportDataRaw.records || cachedExportDataRaw.attendees)) {
          // Apply client-side filter and render
          const selectedTypes = getExportSelectedTypes();
          const records = filterExportRecordsByTypes(cachedExportDataRaw.records || cachedExportDataRaw.attendees || [], selectedTypes);
          const filteredResponse = Object.assign({}, cachedExportDataRaw, { records, attendees: records });
          cachedExportData = { data: cachedExportDataRaw, type, startDate, endDate };
          renderExportPreview(filteredResponse);
          showElement(exportPreviewSection);
        } else {
          // Not cached: refresh as if preview clicked
          hideElement(exportPreviewSection);
          cachedExportData = null;
          cachedExportDataRaw = null;
          lastExportQueryKey = '';
          cachedExportDataRaw = null;
          lastExportQueryKey = '';
          previewExportData();
        }
      });
    });

    $('att-export-start-date').addEventListener('change', () => {
      hideElement(exportPreviewSection);
      cachedExportData = null;
      cachedExportDataRaw = null;
      lastExportQueryKey = '';
    });
    $('att-export-end-date').addEventListener('change', () => {
      hideElement(exportPreviewSection);
      cachedExportData = null;
    });

    modalClose.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);
    modalSave.addEventListener('click', saveRecordChanges);
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeModal();
    });

    // Hints & Walkthrough event listeners
    hintsSwitch.addEventListener('click', toggleHints);
    // allow keyboard toggle (Space / Enter) for accessibility
    hintsSwitch.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
        e.preventDefault();
        toggleHints();
      }
    });
    // Lazy-load the walkthrough module when the Tour button is clicked
    walkthroughStartBtn.addEventListener('click', () => {
      // If already loaded, start the tour immediately
      if (window.attWalkthrough && typeof window.attWalkthrough.startWalkthrough === 'function') {
        try { window.attWalkthrough.startWalkthrough(); } catch (e) { console.error(e); }
        return;
      }

      // Otherwise inject the module script and start when ready
      const script = document.createElement('script');
      script.src = 'https://mprefuge.github.io/site-assets/attendance-manager/scripts/am-walkthrough.js';
      script.async = true;
      script.onload = () => {
        if (window.attWalkthrough && typeof window.attWalkthrough.startWalkthrough === 'function') {
          try { window.attWalkthrough.startWalkthrough(); } catch (e) { console.error(e); }
        }
      };
      script.onerror = () => console.error('Failed to load walkthrough module');
      document.body.appendChild(script);
    });

    // The walkthrough module will dispatch 'att-walkthrough-completed' when
    // the user finishes the tour — use that hook to enable hints if needed.
    document.addEventListener('att-walkthrough-completed', () => {
      if (!hintsEnabled) toggleHints();
    });

    // ============================================
    // INITIALIZATION
    // ============================================
    initHints();
    checkSavedUser();
    // Ensure the Tour button matches the current auth state on initial load
    updateWalkthroughVisibility();
  })();

  // Load ExcelJS library for proper .xlsx export with styling
  (function () {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
    script.onload = () => console.log('ExcelJS loaded');
    script.onerror = () => console.error('Failed to load ExcelJS');
    document.head.appendChild(script);
  })();