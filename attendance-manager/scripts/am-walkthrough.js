/* Walkthrough module - lazy-loaded when user clicks "Tour" */
(function () {
  'use strict';

  // Guard to prevent multiple loads
  if (window.attWalkthroughLoaded) return;
  window.attWalkthroughLoaded = true;

  const $ = id => document.getElementById(id);

  // DOM elements used by the tour overlay
  const walkthroughOverlay = $('att-walkthrough-overlay');
  const walkthroughClose = $('att-walkthrough-close');
  const walkthroughProgress = $('att-walkthrough-progress');
  const walkthroughContent = $('att-walkthrough-content');
  const walkthroughStepCount = $('att-walkthrough-step-count');
  const walkthroughPrev = $('att-walkthrough-prev');
  const walkthroughNext = $('att-walkthrough-next');

  let currentWalkthroughStep = 0;

  // Steps come from the main UI flow; keep them self-contained here
  const walkthroughSteps = [
    {
      icon: '\u{1F44B}',
      title: 'Welcome to Attendance Tracker',
      description: 'This tool helps you manage attendance for your ministry programs. Let\'s walk through the main features together.<ul><li>Track who attends each session</li><li>Register new students and volunteers</li><li>Export data for reporting</li></ul>'
    },
    {
      icon: '\u2705',
      title: 'Collect Attendance',
      description: 'The main tab for recording who\'s present today.<ul><li>This view shows everyone for your location (all time) and lists people who most recently attended at the top</li><li>Check the boxes next to people who are present</li><li>Use the search box to quickly find someone</li><li>Click Submit Attendance when you\'re done</li></ul>',
      highlightTab: 'collect'
    },
    {
      icon: '\u{1F4CB}',
      title: 'View Records',
      description: 'Review and edit past attendance records.<ul><li>Choose a quick range (Last Year / YTD / Last Month / Last Week) or pick Custom Range to reveal start/end date fields</li><li>Click on any record to edit details</li><li>Add notes, levels, or class placements</li></ul>',
      highlightTab: 'view'
    },
    {
      icon: '\u{1F4DD}',
      title: 'New Registration',
      description: 'Add new students or volunteers to your program.<ul><li>Choose Student or Volunteer registration</li><li>Fill out the multi-step form</li><li>Students can have children added to their record</li></ul>',
      highlightTab: 'register'
    },
    {
      icon: '\u{1F4CA}',
      title: 'Export Data',
      description: 'Download your data as Excel spreadsheets.<ul><li>Use quick ranges or pick Custom Range to specify exact start/end dates</li><li>Export attendance records or attendee lists</li><li>Preview data before downloading; exports include Refuge branding</li></ul>',
      highlightTab: 'export'
    },
    {
      icon: '\u2699\uFE0F',
      title: 'Event Configuration',
      description: 'Set up your event details (gear icon).<ul><li>Configure event name and location</li><li>Set the day and time of your program</li><li>These settings are saved for future sessions</li></ul>',
      highlightTab: 'config'
    }
  ];

  function startWalkthrough() {
    currentWalkthroughStep = 0;
    walkthroughOverlay && walkthroughOverlay.classList.add('active');
    renderWalkthroughStep();
    try { localStorage.setItem('att-walkthrough-seen', 'true'); } catch(e) {}
  }

  function closeWalkthrough() {
    walkthroughOverlay && walkthroughOverlay.classList.remove('active');
    document.querySelectorAll('.att-highlight-pulse').forEach(el => {
      el.classList.remove('att-highlight-pulse');
      el.removeAttribute('data-att-walkthrough-highlight');
      if (el.getAttribute('data-att-walkthrough-tabindex') !== null) {
        el.setAttribute('tabindex', el.getAttribute('data-att-walkthrough-tabindex'));
        el.removeAttribute('data-att-walkthrough-tabindex');
      }
      el.blur && el.blur();
    });
  }

  function renderWalkthroughStep() {
    const step = walkthroughSteps[currentWalkthroughStep];
    const total = walkthroughSteps.length;

    if (!walkthroughProgress || !walkthroughContent || !walkthroughStepCount) return;

    // Progress bar
    walkthroughProgress.innerHTML = walkthroughSteps.map((_, i) => {
      let className = 'att-walkthrough-progress-step';
      if (i < currentWalkthroughStep) className += ' completed';
      else if (i === currentWalkthroughStep) className += ' current';
      return `<div class="${className}"></div>`;
    }).join('');

    // Content
    walkthroughContent.innerHTML = `
      <div class="att-walkthrough-step-icon">${step.icon}</div>
      <div class="att-walkthrough-step-title">${step.title}</div>
      <div class="att-walkthrough-step-description">${step.description}</div>
    `;

    walkthroughStepCount.textContent = `Step ${currentWalkthroughStep + 1} of ${total}`;

    // buttons
    walkthroughPrev && (walkthroughPrev.disabled = currentWalkthroughStep === 0);

    if (currentWalkthroughStep === total - 1) {
      walkthroughNext && (walkthroughNext.textContent = 'Get Started!');
      walkthroughNext && walkthroughNext.classList.add('att-walkthrough-btn-finish');
    } else {
      walkthroughNext && (walkthroughNext.textContent = 'Next \u2192');
      walkthroughNext && walkthroughNext.classList.remove('att-walkthrough-btn-finish');
    }

    // Clear previous highlights
    document.querySelectorAll('.att-highlight-pulse').forEach(el => el.classList.remove('att-highlight-pulse'));

    if (step.highlightTab) {
      const tabBtn = document.querySelector(`.att-tab[data-tab="${step.highlightTab}"]`);
      if (tabBtn) {
        tabBtn.classList.add('att-highlight-pulse');
        try { tabBtn.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch (e) {}

        if (tabBtn.hasAttribute('tabindex')) {
          tabBtn.setAttribute('data-att-walkthrough-tabindex', tabBtn.getAttribute('tabindex'));
        }
        tabBtn.setAttribute('tabindex', '-1');
        tabBtn.setAttribute('data-att-walkthrough-highlight', 'true');
        try { tabBtn.focus({ preventScroll: true }); } catch (e) {}
      }
    }
  }

  function nextWalkthroughStep() {
    if (currentWalkthroughStep < walkthroughSteps.length - 1) {
      currentWalkthroughStep++;
      renderWalkthroughStep();
    } else {
      // finish
      closeWalkthrough();
      // Tell the parent script that the walkthrough completed so it can enable hints if desired
      try { document.dispatchEvent(new CustomEvent('att-walkthrough-completed')); } catch (e) {}
    }
  }

  function prevWalkthroughStep() {
    if (currentWalkthroughStep > 0) {
      currentWalkthroughStep--;
      renderWalkthroughStep();
    }
  }

  // Accessibility helpers
  function attachListeners() {
    if (walkthroughClose) walkthroughClose.addEventListener('click', closeWalkthrough);
    if (walkthroughNext) walkthroughNext.addEventListener('click', nextWalkthroughStep);
    if (walkthroughPrev) walkthroughPrev.addEventListener('click', prevWalkthroughStep);

    // keyboard shortcuts for overlay
    document.addEventListener('keydown', (e) => {
      if (!walkthroughOverlay || !walkthroughOverlay.classList.contains('active')) return;
      if (e.key === 'Escape') { closeWalkthrough(); }
      if (e.key === 'ArrowRight') { nextWalkthroughStep(); }
      if (e.key === 'ArrowLeft') { prevWalkthroughStep(); }
    });
  }

  attachListeners();

  // Expose start to the loader
  window.attWalkthrough = window.attWalkthrough || {};
  window.attWalkthrough.startWalkthrough = startWalkthrough;

})();
