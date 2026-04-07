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
// GOOGLE FORM — SAVE MY ROADMAP
// entry.869802007  = Email
// entry.583038684  = Training Start Date (DD/MM/YY)
// entry.422682755  = Peak / Expedition Date (DD/MM/YY)
// entry.2086515229 = Workbook Type (e.g. "12-Week Program")
// ========================================
const TIMELINE_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdW4iGddXid5bwavCldMZAFHVBxj_gCG5hFnLt2Ibvsd7EeRA/formResponse';

async function submitTimelineData(email, trainingStart, expeditionDate, totalWeeks) {
  const fmt = (d) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  const body = new URLSearchParams({
    'entry.869802007':  email,
    'entry.583038684':  fmt(trainingStart),
    'entry.422682755':  fmt(expeditionDate),
    'entry.2086515229': `${totalWeeks}-Week Program`,
  });

  // Fire-and-forget — no-cors so we never read the response
  fetch(TIMELINE_FORM_URL, {
    method: 'POST',
    mode:   'no-cors',
    body,
  }).catch(e => console.warn('[Timeline] form submission warning:', e));
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
    const email         = document.getElementById('email').value.trim();

    if (!mountain)      { alert('Please select a mountain'); return; }
    if (!departureDate) { alert('Please select a departure date'); return; }
    if (!email)         { alert('Please enter your email address'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

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
    // totalWeeks: how many full 7-day training weeks fit (min 5)
    // m2WeekNumber: week Module M2 starts = totalWeeks - 4
    //   → always gives exactly 4 weeks of M2 before Taper:
    //       M2 start | +1 Continue | +2 Continue | Finish | Taper
    //
    // Examples:
    //   5-week  → m2Week = 2 (M2 starts same week as M, 1 continue week)
    //   6-week  → m2Week = 2 (M2 starts same week as M)
    //   7-week  → m2Week = 3
    //  11-week  → m2Week = 7
    // ==========================================

    const rawWeeks = Math.floor(daysUntilExpedition / 7);
    const isCram   = rawWeeks < 5;

    // =====================================================
    // OVER-16 LOGIC
    // If the user is more than 16 weeks out, we split the
    // timeline into two phases:
    //   Phase A: Week 1 now (Module U)
    //   Bridge:  Nasal breathing maintenance until E-16
    //   Phase B: Full 16-week plan starting at E-16
    // =====================================================
    const isOver16 = rawWeeks > 16;

    // The plan that actually runs is always capped at 16 (max) or min 5
    const planWeeks    = Math.min(16, Math.max(5, rawWeeks));
    const m2WeekNumber = Math.max(2, planWeeks - 4);

    // For over-16: Phase B starts exactly 16 weeks before expedition
    const planStart = isOver16
      ? (() => { const d = new Date(expeditionDate); d.setDate(d.getDate() - planWeeks * 7); return d; })()
      : new Date(trainingStart);

    // Taper anchors backward from expedition — the final 7 days before departure
    const taperDate = new Date(expeditionDate);
    taperDate.setDate(taperDate.getDate() - 7);

    function planWeekDate(w) {
      if (w === planWeeks) return new Date(taperDate);
      const d = new Date(planStart);
      d.setDate(d.getDate() + (w - 1) * 7);
      return d;
    }

    // Check whether there's a gap between the end of the "Finish M+M2" week
    // and when the taper week actually starts (remainder days = 0–6)
    const finishWeekEnd = planWeekDate(planWeeks - 1);
    finishWeekEnd.setDate(finishWeekEnd.getDate() + 7);
    const bufferDays = Math.round((taperDate - finishWeekEnd) / (1000 * 60 * 60 * 24));

    // ==========================================
    // VERSION HEADER
    // ==========================================
    const versionHeader = document.getElementById('version-header');
    if (isOver16) {
      versionHeader.textContent =
        `You are more than 16 weeks out. Your full 16-Week Plan begins on ${formatDate(planStart)}. Start Module U now and focus on nasal breathing until then.`;
    } else {
      versionHeader.textContent =
        `According to your Expedition Date, your timeline is best for the ${planWeeks}-Week version of the training.`;
    }

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

    // ---- HELPER: render and append a single week row ----
    function appendWeekRow(weekLabel, date, subtitle, markerClass, activities) {
      activities.forEach(({ label, detail }) => {
        csvRows.push([weekLabel, formatDate(date), label, detail]);
      });

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
          <div class="timeline-title">${weekLabel}</div>
          <div class="timeline-date">${formatDate(date)}</div>
          <div class="week-subtitle">${subtitle}</div>
          <div class="week-activities">${activitiesHTML}</div>
        </div>
      `;
      phaseDiv.appendChild(item);
    }

    if (isOver16) {
      // ---- Phase A: Week 1 now ----
      appendWeekRow('Week 1', trainingStart,
        'Assessment & Begin Module U',
        'week1',
        [
          { label: 'Take Assessment', detail: 'Recal Breath Index (RBI)', isSendoff: false },
          { label: 'Start',           detail: 'Module U — Unlearn Bad Habits', isSendoff: false }
        ]
      );

      // ---- Bridge: Nasal breathing maintenance ----
      appendWeekRow('Now → ' + formatDate(planStart), trainingStart,
        'Nasal Breathing Maintenance Phase',
        'week-m',
        [
          {
            label: 'Focus',
            detail: 'Focus on nasal breathing during your regular training and workouts until your 16-Week Plan begins on ' + formatDate(planStart),
            isSendoff: false
          }
        ]
      );

      // ---- Phase B: Full 16-week plan ----
      for (let w = 1; w <= planWeeks; w++) {
        const date = planWeekDate(w);
        let subtitle    = '';
        let markerClass = '';
        let activities  = [];

        if (w === 1) {
          subtitle    = 'Assessment & Begin Module U';
          markerClass = 'week1';
          activities  = [
            { label: 'Take Assessment', detail: 'Recal Breath Index (RBI)', isSendoff: false },
            { label: 'Start',           detail: 'Module U — Unlearn Bad Habits', isSendoff: false }
          ];
        } else if (w === 2 && m2WeekNumber === 2) {
          subtitle    = 'Begin Modules M + M2 — Muscle & Mountain Simulation';
          markerClass = 'week-m2';
          activities  = [
            { label: 'Start',    detail: 'Module M — Muscle Strength', isSendoff: false },
            { label: 'Start',    detail: 'Module M2 — Mountain Simulation', isSendoff: false },
            { label: 'Includes', detail: 'Respiratory Muscle Training, Lung Capacity Development, and High Altitude Simulation breathwork protocols', isSendoff: false },
            { label: 'Read',     detail: 'Module I — Integrate', isSendoff: false }
          ];
        } else if (w === 2) {
          subtitle    = 'Begin Module M — Muscle Strength';
          markerClass = 'week-m';
          activities  = [
            { label: 'Start',    detail: 'Module M — Muscle Strength', isSendoff: false },
            { label: 'Includes', detail: 'Respiratory Muscle Training and Lung Capacity Development protocols', isSendoff: false },
            { label: 'Read',     detail: 'Module I — Integrate', isSendoff: false }
          ];
        } else if (w > 2 && w < m2WeekNumber) {
          subtitle    = 'Continue Module M';
          markerClass = 'week-m';
          activities  = [{ label: 'Continue', detail: 'Module M', isSendoff: false }];
        } else if (w === m2WeekNumber && m2WeekNumber > 2) {
          subtitle    = 'Begin Module M2 — Mountain Simulation';
          markerClass = 'week-m2';
          activities  = [
            { label: 'Start',    detail: 'Module M2 — Mountain Simulation', isSendoff: false },
            { label: 'Includes', detail: 'High Altitude Simulation breathwork protocols', isSendoff: false },
            { label: 'Continue', detail: 'Module M', isSendoff: false }
          ];
        } else if (w > m2WeekNumber && w < planWeeks - 1) {
          subtitle    = 'Continue Modules M + M2';
          markerClass = 'week-m';
          activities  = [{ label: 'Continue', detail: 'Modules M + M2', isSendoff: false }];
        } else if (w === planWeeks - 1) {
          subtitle    = 'Finish Modules M + M2';
          markerClass = 'week-m';
          activities  = [{ label: 'Finish', detail: 'Modules M + M2', isSendoff: false }];
          if (bufferDays > 0) {
            activities.push({
              label: 'Continue',
              detail: `Modules M + M2 until your Taper Week begins on ${formatDate(taperDate)}`,
              isSendoff: false
            });
          }
        } else if (w === planWeeks) {
          subtitle    = 'Taper & Final Assessment';
          markerClass = 'week-taper';
          activities  = [
            { label: 'Start',           detail: 'Module T — Taper', isSendoff: false },
            { label: 'Take Assessment', detail: 'Recal Breath Index (RBI)', isSendoff: false },
            { label: 'Send-off',        detail: 'Get your Expedition Breathing Playbook — Good luck on your climb! 🏔️', isSendoff: true }
          ];
        }

        appendWeekRow(`Plan Week ${w}`, date, subtitle, markerClass, activities);
      }

    } else {
      // ==========================================
      // STANDARD PATH (≤ 16 weeks) — original logic
      // ==========================================
      for (let w = 1; w <= planWeeks; w++) {
        const date = planWeekDate(w);
        let subtitle    = '';
        let markerClass = '';
        let activities  = [];

        if (w === 1) {
          subtitle    = 'Assessment & Begin Module U';
          markerClass = 'week1';
          activities  = [
            { label: 'Take Assessment', detail: 'Recal Breath Index (RBI)', isSendoff: false },
            { label: 'Start',           detail: 'Module U — Unlearn Bad Habits', isSendoff: false }
          ];
        } else if (w === 2 && m2WeekNumber === 2) {
          subtitle    = 'Begin Modules M + M2 — Muscle & Mountain Simulation';
          markerClass = 'week-m2';
          activities  = [
            { label: 'Start',    detail: 'Module M — Muscle Strength', isSendoff: false },
            { label: 'Start',    detail: 'Module M2 — Mountain Simulation', isSendoff: false },
            { label: 'Includes', detail: 'Respiratory Muscle Training, Lung Capacity Development, and High Altitude Simulation breathwork protocols', isSendoff: false },
            { label: 'Read',     detail: 'Module I — Integrate', isSendoff: false }
          ];
        } else if (w === 2) {
          subtitle    = 'Begin Module M — Muscle Strength';
          markerClass = 'week-m';
          activities  = [
            { label: 'Start',    detail: 'Module M — Muscle Strength', isSendoff: false },
            { label: 'Includes', detail: 'Respiratory Muscle Training and Lung Capacity Development protocols', isSendoff: false },
            { label: 'Read',     detail: 'Module I — Integrate', isSendoff: false }
          ];
        } else if (w > 2 && w < m2WeekNumber) {
          subtitle    = 'Continue Module M';
          markerClass = 'week-m';
          activities  = [{ label: 'Continue', detail: 'Module M', isSendoff: false }];
        } else if (w === m2WeekNumber && m2WeekNumber > 2) {
          subtitle    = 'Begin Module M2 — Mountain Simulation';
          markerClass = 'week-m2';
          activities  = [
            { label: 'Start',    detail: 'Module M2 — Mountain Simulation', isSendoff: false },
            { label: 'Includes', detail: 'High Altitude Simulation breathwork protocols', isSendoff: false },
            { label: 'Continue', detail: 'Module M', isSendoff: false }
          ];
        } else if (w > m2WeekNumber && w < planWeeks - 1) {
          subtitle    = 'Continue Modules M + M2';
          markerClass = 'week-m';
          activities  = [{ label: 'Continue', detail: 'Modules M + M2', isSendoff: false }];
        } else if (w === planWeeks - 1) {
          subtitle    = 'Finish Modules M + M2';
          markerClass = 'week-m';
          activities  = [{ label: 'Finish', detail: 'Modules M + M2', isSendoff: false }];
          if (bufferDays > 0) {
            activities.push({
              label: 'Continue',
              detail: `Modules M + M2 until your Taper Week begins on ${formatDate(taperDate)}`,
              isSendoff: false
            });
          }
        } else if (w === planWeeks) {
          subtitle    = 'Taper & Final Assessment';
          markerClass = 'week-taper';
          activities  = [
            { label: 'Start',           detail: 'Module T — Taper', isSendoff: false },
            { label: 'Take Assessment', detail: 'Recal Breath Index (RBI)', isSendoff: false },
            { label: 'Send-off',        detail: 'Get your Expedition Breathing Playbook — Good luck on your climb! 🏔️', isSendoff: true }
          ];
        }

        appendWeekRow(`Week ${w}`, date, subtitle, markerClass, activities);
      }
    }

    timelineContainer.appendChild(phaseDiv);

    // Add expedition row to CSV
    csvRows.push(['Expedition', formatDate(expeditionDate), 'Departure', mountain]);

    // Update display dates
    document.getElementById('today-date').textContent          = formatDate(today);
    document.getElementById('training-start-date').textContent = formatDate(trainingStart);
    document.getElementById('expedition-date').textContent     = formatDate(expeditionDate);
    document.getElementById('selected-mountain').textContent   = mountain;

    // Workbook CTA always uses 16-week (or the actual planWeeks if ≤16)
    const workbookWeeks = Math.min(16, planWeeks);
    moreInfoBtn.innerHTML = `<span class="btn-icon">📥</span> Download Your ${workbookWeeks}-Week Training Workbook`;
    moreInfoBtn.dataset.workbookUrl = getWorkbookUrl(workbookWeeks);

    // Silent background submission — fires before results are shown
    submitTimelineData(email, trainingStart, expeditionDate, workbookWeeks);

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
