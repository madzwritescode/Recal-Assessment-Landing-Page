// ========================================
// WORKBOOK LINKS — one PDF per week version
// Anything over 16 weeks uses the 16-week workbook
// ========================================
const WORKBOOK_LINKS = {
  5:  'https://media2-production.mightynetworks.com/asset/d35a4e3e-c4b5-4084-a51e-334fd3df9c56/SUMMIT-Ready_Workbook_-_5-Week_Program.pdf',
  6:  'https://media2-production.mightynetworks.com/asset/3b0d69c6-09e5-4df5-a2ec-98a85b05ac9f/SUMMIT-Ready_Workbook_-_6-Week_Program.pdf',
  7:  'https://media2-production.mightynetworks.com/asset/afeb4cdd-b2d7-4a35-bf67-561626d43ac2/SUMMIT-Ready_Workbook_-_7-Week_Program.pdf',
  8:  'https://media2-production.mightynetworks.com/asset/1d88d117-e088-454d-a652-76e6cd21f15a/SUMMIT-Ready_Workbook_-_8-Week_Program.pdf',
  9:  'https://media2-production.mightynetworks.com/asset/d9775356-7533-4dfa-b51f-2599c5c4e66e/SUMMIT-Ready_Workbook_-_9-Week_Program.pdf',
  10: 'https://media2-production.mightynetworks.com/asset/a2b99444-e023-4be1-bc8d-75bb7058aeba/SUMMIT-Ready_Workbook_-_10-Week_Program.pdf',
  11: 'https://media2-production.mightynetworks.com/asset/8387e73e-5c49-4519-b95c-ae61f0b2c169/SUMMIT-Ready_Workbook_-_11-Week_Program.pdf',
  12: 'https://media2-production.mightynetworks.com/asset/454ea31c-4c08-485c-ad2a-638f87eee86c/SUMMIT-Ready_Workbook_-_12-Week_Program.pdf',
  13: 'https://media2-production.mightynetworks.com/asset/f4948b9e-9b84-4b11-8ca6-be288b918f7f/SUMMIT-Ready_Workbook_-_13-Week_Program.pdf',
  14: 'https://media2-production.mightynetworks.com/asset/eda1e623-2235-4812-83d6-1e88258b0c17/SUMMIT-Ready_Workbook_-_14-Week_Program.pdf',
  15: 'https://media2-production.mightynetworks.com/asset/7550fca4-a4e6-49ec-b73b-259c2cc2f671/SUMMIT-Ready_Workbook_-_15-Week_Program.pdf',
  16: 'https://media2-production.mightynetworks.com/asset/696c7b10-601a-4769-8936-a758caa4176c/SUMMIT-Ready_Workbook_-_16-Week_Program.pdf',
};

function getWorkbookUrl(weeks) {
  const capped = Math.min(weeks, 16);
  return WORKBOOK_LINKS[capped] || WORKBOOK_LINKS[16];
}

// ========================================

// Sends current document height to parent window for iframe auto-resize
function notifyParentHeight() {
  const height = document.documentElement.scrollHeight;
  window.parent.postMessage({ type: 'summit-calc-resize', height }, '*');
}

document.addEventListener('DOMContentLoaded', function () {
  // Embed mode: ?embed=true adds transparent background
  const urlParams = new URLSearchParams(window.location.search);
  const isEmbed = urlParams.get('embed') === 'true';
  if (isEmbed) {
    document.body.classList.add('embed-mode');
  }

  // Send initial height to parent on load
  notifyParentHeight();

  const calculateBtn = document.getElementById('calculate-btn');
  const moreInfoBtn   = document.getElementById('more-info-btn');
  const printBtn      = document.getElementById('print-btn');
  const csvBtn        = document.getElementById('csv-btn');

  calculateBtn.addEventListener('click', calculateTimeline);
  moreInfoBtn.addEventListener('click', handleMoreInfo);
  printBtn.addEventListener('click', () => window.print());
  csvBtn.addEventListener('click', downloadCSV);

  // Stored timeline rows for CSV export
  let csvRows = [];
  let exportMountain = '';

  // ==========================================
  // MAIN CALCULATION
  // ==========================================

  function calculateTimeline() {
    const mountain      = document.getElementById('mountain').value;
    const departureDate = document.getElementById('departure-date').value;

    if (!mountain)      { alert('Please select a mountain'); return; }
    if (!departureDate) { alert('Please select a departure date'); return; }

    const expeditionDate = new Date(departureDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expeditionDate <= today) {
      alert('Please select a future date.');
      return;
    }

    // Training always starts tomorrow
    const trainingStart = new Date(today);
    trainingStart.setDate(trainingStart.getDate() + 1);

    const daysUntilExpedition = Math.ceil(
      (expeditionDate - today) / (1000 * 60 * 60 * 24)
    );

    // ==========================================
    // ACCORDION VERSION LOGIC
    //
    // totalWeeks: how many full 7-day training weeks fit (min 6)
    // m2WeekNumber: week Module M2 starts = totalWeeks - 4
    //   → always gives exactly 4 weeks of M2 before Taper:
    //       M2 start | +1 Continue | +2 Continue | Finish | Taper
    //
    // Examples:
    //   6-week  → m2Week = 2 (M2 starts same week as M)
    //   7-week  → m2Week = 3
    //  11-week  → m2Week = 7
    // ==========================================

    const rawWeeks   = Math.floor(daysUntilExpedition / 7);
    const totalWeeks = Math.max(6, rawWeeks);
    const isCram     = rawWeeks < 6;

    // M2 starts at week (totalWeeks - 4); minimum week 2
    const m2WeekNumber = Math.max(2, totalWeeks - 4);

    // Taper ALWAYS anchors backward from expedition — the final 7 days before departure
    const taperDate = new Date(expeditionDate);
    taperDate.setDate(taperDate.getDate() - 7);

    // Week date: forward from trainingStart for all weeks except the taper week,
    // which always uses the backward-anchored taperDate
    function weekDate(w) {
      if (w === totalWeeks) return new Date(taperDate);
      const d = new Date(trainingStart);
      d.setDate(d.getDate() + (w - 1) * 7);
      return d;
    }

    // Check whether there's a gap between the end of the "Finish M+M2" week
    // and when the taper week actually starts (remainder days = 0–6)
    const finishWeekEnd = weekDate(totalWeeks - 1);
    finishWeekEnd.setDate(finishWeekEnd.getDate() + 7);
    const bufferDays = Math.round((taperDate - finishWeekEnd) / (1000 * 60 * 60 * 24));

    // ==========================================
    // VERSION HEADER
    // ==========================================
    const versionHeader = document.getElementById('version-header');
    versionHeader.textContent =
      `According to your Expedition Date, your timeline is best for the ${totalWeeks}-Week version of the training.`;

    const warningBanner = document.getElementById('warning-banner');
    if (isCram) {
      warningBanner.textContent =
        '⚠️ Your expedition is less than 6 weeks away. Complete as much of the program as you can — every week counts!';
      warningBanner.classList.remove('hidden');
    } else {
      warningBanner.classList.add('hidden');
    }

    // ==========================================
    // BUILD TIMELINE
    // ==========================================
    const timelineContainer = document.getElementById('timeline-container');
    timelineContainer.innerHTML = '';
    csvRows = [];
    exportMountain = mountain;

    const phaseDiv = document.createElement('div');
    phaseDiv.className = 'timeline-phase';

    for (let w = 1; w <= totalWeeks; w++) {
      const date = weekDate(w);
      let subtitle    = '';
      let markerClass = '';
      let activities  = [];

      // ---- WEEK 1: Assessment + Module U ----
      if (w === 1) {
        subtitle    = 'Assessment & Begin Module U';
        markerClass = 'week1';
        activities  = [
          { label: 'Take Assessment', detail: 'Recal Breath Index (RBI)', isSendoff: false },
          { label: 'Start',           detail: 'Module U — Unlearn Bad Habits', isSendoff: false }
        ];

      // ---- WEEK 2 (6-week plan): M + M2 + I all start together ----
      } else if (w === 2 && m2WeekNumber === 2) {
        subtitle    = 'Begin Modules M + M2 — Muscle & Mountain Simulation';
        markerClass = 'week-m2';
        activities  = [
          { label: 'Start',    detail: 'Module M — Muscle Strength', isSendoff: false },
          { label: 'Start',    detail: 'Module M2 — Mountain Simulation', isSendoff: false },
          { label: 'Includes', detail: 'Respiratory Muscle Training, Lung Capacity Development, and High Altitude Simulation breathwork protocols', isSendoff: false },
          { label: 'Read',     detail: 'Module I — Integrate', isSendoff: false }
        ];

      // ---- WEEK 2 (7+ week plans): M + I only ----
      } else if (w === 2) {
        subtitle    = 'Begin Module M — Muscle Strength';
        markerClass = 'week-m';
        activities  = [
          { label: 'Start',    detail: 'Module M — Muscle Strength', isSendoff: false },
          { label: 'Includes', detail: 'Respiratory Muscle Training and Lung Capacity Development protocols', isSendoff: false },
          { label: 'Read',     detail: 'Module I — Integrate', isSendoff: false }
        ];

      // ---- WEEKS 3 to m2WeekNumber-1: Continue M only ----
      } else if (w > 2 && w < m2WeekNumber) {
        subtitle    = 'Continue Module M';
        markerClass = 'week-m';
        activities  = [
          { label: 'Continue', detail: 'Module M', isSendoff: false }
        ];

      // ---- M2 START WEEK (7+ week plans only) ----
      } else if (w === m2WeekNumber && m2WeekNumber > 2) {
        subtitle    = 'Begin Module M2 — Mountain Simulation';
        markerClass = 'week-m2';
        activities  = [
          { label: 'Start',    detail: 'Module M2 — Mountain Simulation', isSendoff: false },
          { label: 'Includes', detail: 'High Altitude Simulation breathwork protocols', isSendoff: false },
          { label: 'Continue', detail: 'Module M', isSendoff: false }
        ];

      // ---- WEEKS m2WeekNumber+1 to totalWeeks-2: Continue M + M2 ----
      } else if (w > m2WeekNumber && w < totalWeeks - 1) {
        subtitle    = 'Continue Modules M + M2';
        markerClass = 'week-m';
        activities  = [
          { label: 'Continue', detail: 'Modules M + M2', isSendoff: false }
        ];

      // ---- WEEK totalWeeks-1: Finish M + M2 ----
      } else if (w === totalWeeks - 1) {
        subtitle    = 'Finish Modules M + M2';
        markerClass = 'week-m';
        activities  = [
          { label: 'Finish', detail: 'Modules M + M2', isSendoff: false }
        ];
        // If there are leftover days before taper, prompt the user to keep going
        if (bufferDays > 0) {
          activities.push({
            label: 'Continue',
            detail: `Modules M + M2 until your Taper Week begins on ${formatDate(taperDate)}`,
            isSendoff: false
          });
        }

      // ---- WEEK totalWeeks: Taper + Final Assessment + Send-off ----
      } else if (w === totalWeeks) {
        subtitle    = 'Taper & Final Assessment';
        markerClass = 'week-taper';
        activities  = [
          { label: 'Start',           detail: 'Module T — Taper', isSendoff: false },
          { label: 'Take Assessment', detail: 'Recal Breath Index (RBI)', isSendoff: false },
          { label: 'Send-off',        detail: 'Get your Expedition Breathing Playbook — Good luck on your climb! 🏔️', isSendoff: true }
        ];
      }

      // Store for CSV
      activities.forEach(({ label, detail }) => {
        csvRows.push([`Week ${w}`, formatDate(date), label, detail]);
      });

      // Render week item
      const activitiesHTML = activities.map(({ label, detail, isSendoff }) => `
        <div class="activity-item${isSendoff ? ' send-off' : ''}">
          <span class="activity-label">${label}:</span>
          <span class="activity-detail">${detail}</span>
        </div>
      `).join('');

      const item = document.createElement('div');
      item.className = 'timeline-item';
      item.innerHTML = `
        <div class="timeline-marker ${markerClass}"></div>
        <div class="timeline-content">
          <div class="timeline-title">Week ${w}</div>
          <div class="timeline-date">${formatDate(date)}</div>
          <div class="week-subtitle">${subtitle}</div>
          <div class="week-activities">${activitiesHTML}</div>
        </div>
      `;
      phaseDiv.appendChild(item);
    }

    timelineContainer.appendChild(phaseDiv);

    // Add expedition row to CSV
    csvRows.push(['Expedition', formatDate(expeditionDate), 'Departure', mountain]);

    // Update display dates
    document.getElementById('today-date').textContent          = formatDate(today);
    document.getElementById('training-start-date').textContent = formatDate(trainingStart);
    document.getElementById('expedition-date').textContent     = formatDate(expeditionDate);
    document.getElementById('selected-mountain').textContent   = mountain;

    // Update workbook CTA button for this specific week version
    moreInfoBtn.innerHTML = `<span class="btn-icon">📥</span> Download Your ${totalWeeks}-Week Training Workbook`;
    moreInfoBtn.dataset.workbookUrl = getWorkbookUrl(totalWeeks);

    // Show results
    const resultsDiv = document.getElementById('results');
    resultsDiv.classList.remove('hidden');
    moreInfoBtn.classList.remove('hidden');
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Notify parent iframe of new height after content renders
    setTimeout(notifyParentHeight, 400);
  }

  // ==========================================
  // CSV DOWNLOAD
  // ==========================================
  function downloadCSV() {
    if (!csvRows.length) return;

    const header = ['"Week"', '"Date"', '"Activity"', '"Detail"'];
    const body   = csvRows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    );
    const csv = [header.join(','), ...body].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `recal-training-${exportMountain.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ==========================================
  // HELPERS
  // ==========================================
  function formatDate(date) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  function handleMoreInfo() {
    const url = moreInfoBtn.dataset.workbookUrl;
    if (!url) return;
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (w) w.focus();
    else window.location.href = url;
  }
});
