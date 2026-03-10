/* ============================================================
   Summit Readiness Assessment — Recal Training
   ============================================================ */

'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

const FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSchaXGfiaO3ynpzwmy2keiSQGRKDsoZVqDyAOdztWyq_iVMAA/formResponse';

const DOMAINS = [
  {
    id: 'aerobic',
    icon: '💪',
    title: 'Aerobic & Muscular Durability',
    desc: 'Your capacity to sustain physical effort over time and under load.',
    color: '#0A4367',
    questions: [
      {
        entry: 'entry.1002851429',
        label: 'Sustained Effort Capacity',
        text: 'How well can you sustain moderate aerobic effort for extended periods?',
        options: [
          '0: I struggle to maintain steady effort beyond 60 minutes',
          '1: I can sustain 60–90 minutes but fatigue noticeably',
          '2: I can sustain 2–3 hours with consistent pacing',
          '3: I regularly sustain 3+ hours with minimal performance drop'
        ]
      },
      {
        entry: 'entry.158149559',
        label: 'Load or Fatigue Resistance',
        text: 'When training or hiking with fatigue or load:',
        options: [
          '0: My movement quality breaks down quickly',
          '1: I can manage short efforts but slow significantly',
          '2: I maintain form and pacing for several hours',
          '3: I remain efficient even late into long or loaded days'
        ]
      }
    ]
  },
  {
    id: 'recovery',
    icon: '🔄',
    title: 'Recovery & Autonomic Resilience',
    desc: 'How quickly and reliably you bounce back from hard days and high-stress periods.',
    color: '#1a6b9e',
    questions: [
      {
        entry: 'entry.197086545',
        label: 'Recovery Between Hard Days',
        text: 'After a hard training day:',
        options: [
          '0: I feel run down for several days',
          '1: I need 48+ hours to feel normal',
          '2: I recover well within 24–36 hours',
          '3: I often feel ready again within 24 hours'
        ]
      },
      {
        entry: 'entry.1995005739',
        label: 'Stress Load Tolerance',
        text: 'When life stress increases (work, travel, poor sleep):',
        options: [
          '0: My training and mood deteriorate quickly',
          '1: I struggle but can maintain some consistency',
          '2: I adapt with minor performance impact',
          '3: I remain stable with deliberate adjustments'
        ]
      }
    ]
  },
  {
    id: 'fueling',
    icon: '⚡',
    title: 'Fueling, Hydration & GI Stability',
    desc: 'Your ability to fuel consistently and manage gut issues under physical and environmental stress.',
    color: '#2e8b57',
    questions: [
      {
        entry: 'entry.1392028128',
        label: 'Fueling During Long Efforts',
        text: 'During long training sessions or hikes:',
        options: [
          '0: I often bonk or forget to eat',
          '1: I fuel inconsistently and feel energy swings',
          '2: I fuel regularly with manageable dips',
          '3: I fuel consistently with stable energy'
        ]
      },
      {
        entry: 'entry.1044599284',
        label: 'GI Tolerance Under Stress',
        text: 'Under fatigue, cold, or exertion:',
        options: [
          '0: I frequently experience nausea or GI distress',
          '1: I occasionally struggle to eat',
          '2: I tolerate food with minor issues',
          '3: I can reliably eat even when uncomfortable'
        ]
      }
    ]
  },
  {
    id: 'sleep',
    icon: '🌙',
    title: 'Sleep & Environmental Resilience',
    desc: 'How well you sleep in difficult conditions and perform in cold or harsh environments.',
    color: '#5c3b8c',
    questions: [
      {
        entry: 'entry.1358412920',
        label: 'Sleep Consistency',
        text: 'In unfamiliar or uncomfortable environments:',
        options: [
          '0: My sleep is very poor',
          '1: I sleep lightly and wake often',
          '2: My sleep is disrupted but adequate',
          '3: I generally sleep well despite conditions'
        ]
      },
      {
        entry: 'entry.1064566425',
        label: 'Cold / Environmental Stress',
        text: 'In cold, wind, or bad weather:',
        options: [
          '0: I become mentally overwhelmed',
          '1: I struggle but push through',
          '2: I adapt with systems and pacing',
          '3: I remain calm and functional'
        ]
      }
    ]
  },
  {
    id: 'cognitive',
    icon: '🧠',
    title: 'Cognitive & Psychological Stability',
    desc: 'Your ability to make decisions, manage discomfort, and stay composed under extreme fatigue.',
    color: '#c47c1a',
    questions: [
      {
        entry: 'entry.1128018511',
        label: 'Decision-Making Under Fatigue',
        text: 'When exhausted:',
        options: [
          '0: I make impulsive or avoidant decisions',
          '1: I struggle to think clearly',
          '2: I slow down but remain deliberate',
          '3: I maintain clear, disciplined decision-making'
        ]
      },
      {
        entry: 'entry.2007665370',
        label: 'Response to Discomfort',
        text: 'When progress is slow or uncomfortable:',
        options: [
          '0: I become frustrated or anxious',
          '1: I fixate on the discomfort',
          '2: I accept it and adjust expectations',
          '3: I remain emotionally steady and adaptive'
        ]
      }
    ]
  },
  {
    id: 'experience',
    icon: '🎒',
    title: 'Experience with Prolonged Stress',
    desc: 'How often you have operated under real-world sustained physical and mental demands.',
    color: '#8b3b2e',
    questions: [
      {
        entry: 'entry.346723911',
        label: 'Operating While Depleted',
        text: 'I have experience functioning when tired, cold, and under-recovered:',
        options: [
          '0: Rarely or never',
          '1: Occasionally',
          '2: Regularly',
          '3: Frequently and deliberately'
        ]
      },
      {
        entry: 'entry.1174770986',
        label: 'Multi-Day Endurance Experience',
        text: 'What is your multi-day endurance experience level?',
        options: [
          '0: No multi-day endurance or expedition experience',
          '1: 1–2 trips of 3–5 days',
          '2: Several trips of 5–10 days',
          '3: Multiple 10+ day expeditions or equivalents'
        ]
      }
    ]
  },
  {
    id: 'altitude',
    icon: '🏔️',
    title: 'Exposure & Expedition Experience',
    desc: 'Your direct experience at altitude and managing full expedition systems.',
    color: '#1a4a6e',
    questions: [
      {
        entry: 'entry.502239037',
        label: 'Highest Functional Altitude',
        text: 'What is your highest functional altitude experience?',
        options: [
          '0: No experience above 4000 m (~13,000 ft)',
          '1: One or more climbs to 4000–4900 m (13–16,000 ft) with limited acclimatization',
          '2: Multiple exposures to 5000–5500 m (16–18,000 ft) with multiple acclimatization days',
          '3: Repeated exposures above 5500 m (18,000 ft) with staged acclimatization and maintained performance'
        ]
      },
      {
        entry: 'entry.444849892',
        label: 'Expedition Systems Management',
        text: 'Which best describes your past experience preparing and managing expedition systems (gear, nutrition, layering, recovery)?',
        options: [
          '0: Limited experience managing full expedition systems in the field',
          '1: Participated in expeditions but relied heavily on guides or others for systems',
          '2: Planned and tested most personal systems on prior multi-day trips',
          '3: Independently planned, tested, and refined full expedition systems across multiple trips'
        ]
      }
    ]
  }
];

// Score thresholds (out of 42)
const TIERS = [
  {
    min: 0, max: 13,
    label: 'Foundation Phase',
    tagline: 'Early stage — key gaps identified across readiness domains',
    description: 'Your results highlight meaningful development areas across several readiness domains. This is precisely the information you need to train with intention. A structured breathwork and conditioning program now will pay real dividends on the mountain.',
    color: '#c0392b',
    cta: '🏗️ Start Building Your Foundation',
    url: 'https://recal.training'
  },
  {
    min: 14, max: 25,
    label: 'Building Climber',
    tagline: 'Solid foundations with clear areas to develop',
    description: 'You have meaningful fitness and some expedition experience, but there are specific domains where focused preparation will make a real difference. A 12–16 week targeted program is your ideal next step before a major expedition.',
    color: '#c47c1a',
    cta: '📈 Get Your Preparation Plan',
    url: 'https://recal.training'
  },
  {
    min: 26, max: 34,
    label: 'Summit Approach Ready',
    tagline: 'Well-prepared with targeted areas to sharpen',
    description: 'You\'re performing well across most domains — you understand how to train, fuel, and recover. A focused 8–12 week pre-expedition block targeting your specific gaps will put you in excellent shape for summit day.',
    color: '#2e8b57',
    cta: '🎯 Optimize Your Summit Prep',
    url: 'https://recal.training'
  },
  {
    min: 35, max: 42,
    label: 'Expedition Grade',
    tagline: 'Exceptional readiness across all key domains',
    description: 'You demonstrate elite-level preparation across physical, cognitive, and experiential domains. You\'re built for high-altitude expeditions. Focus on maintaining peak condition and fine-tuning your expedition-specific systems as the date approaches.',
    color: '#0A4367',
    cta: '🏔️ Explore Advanced Training',
    url: 'https://recal.training'
  }
];

// ─── State ────────────────────────────────────────────────────────────────────

// Steps: 0=intro, 1=info, 2–8=domains 0–6, 9=loading, 10=results
let currentStep = 0;
let answers = {};       // { 'entry.XXXXXXX': '2: answer text', ... }
let firstName = '';
let email = '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScore(entryId) {
  const val = answers[entryId];
  if (!val) return 0;
  const n = parseInt(val.charAt(0), 10);
  return isNaN(n) ? 0 : n;
}

function totalScore() {
  return DOMAINS.flatMap(d => d.questions).reduce((sum, q) => sum + getScore(q.entry), 0);
}

function domainScore(domain) {
  return domain.questions.reduce((sum, q) => sum + getScore(q.entry), 0);
}

function getTier(score) {
  return TIERS.find(t => score >= t.min && score <= t.max) || TIERS[0];
}

function barColorClass(score, max) {
  const pct = score / max;
  if (pct >= 0.84) return 'score-elite';
  if (pct >= 0.58) return 'score-high';
  if (pct >= 0.34) return 'score-mid';
  return 'score-low';
}

function stripPrefix(opt) {
  return opt.replace(/^\d+:\s*/, '');
}

// Total question steps = 7 domains + 1 info step
// Progress shown for steps 1–9 (9 steps total)
function progressPct() {
  if (currentStep <= 0) return 0;
  if (currentStep >= 9) return 100;
  return Math.round(((currentStep) / 9) * 100);
}

function domainStepIndex() {
  // currentStep 2–8 → domain index 0–6
  return currentStep - 2;
}

function isDomainStep() {
  return currentStep >= 2 && currentStep <= 8;
}

function allAnsweredForStep() {
  if (currentStep === 1) {
    return firstName.trim().length > 0 && email.trim().length > 0;
  }
  if (isDomainStep()) {
    const domain = DOMAINS[domainStepIndex()];
    return domain.questions.every(q => answers[q.entry]);
  }
  return true;
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Progress bar (visible for steps 1–9)
  if (currentStep >= 1 && currentStep <= 9) {
    const pct = progressPct();
    app.insertAdjacentHTML('beforeend', `
      <div class="sr-progress-wrap">
        <div class="sr-progress-bar" style="width:${pct}%"></div>
      </div>
      <div class="sr-progress-label">${pct}% complete</div>
    `);
  }

  if (currentStep === 0) return renderIntro(app);
  if (currentStep === 1) return renderInfo(app);
  if (isDomainStep())   return renderDomain(app, domainStepIndex());
  if (currentStep === 9) return renderLoading(app);
  if (currentStep === 10) return renderResults(app);
}

function renderIntro(app) {
  app.insertAdjacentHTML('beforeend', `
    <div class="sr-card">
      <div class="sr-intro">
        <img src="/training-timeline-calculator/Recal Logo White in Blue.png" alt="Recal Training" class="sr-logo" />
        <h1>Summit Readiness Assessment</h1>
        <p class="sr-intro-desc">
          Discover exactly how prepared your body and mind are for a high-altitude expedition.
          Answer 14 questions across 7 key domains. Takes about 3 minutes.
        </p>
        <div class="sr-intro-meta">
          <span class="sr-meta-item"><span class="sr-meta-icon">📋</span> 14 Questions</span>
          <span class="sr-meta-item"><span class="sr-meta-icon">⏱️</span> ~3 Minutes</span>
          <span class="sr-meta-item"><span class="sr-meta-icon">🏔️</span> 7 Domains</span>
        </div>
        <div class="sr-domain-preview">
          ${DOMAINS.map(d => `<span class="sr-domain-chip">${d.icon} ${d.title}</span>`).join('')}
        </div>
        <button class="sr-btn-primary" onclick="goNext()">
          Begin Assessment <span>→</span>
        </button>
      </div>
    </div>
  `);
}

function renderInfo(app) {
  app.insertAdjacentHTML('beforeend', `
    <div class="sr-card">
      <div class="sr-info">
        <h2>Before We Begin</h2>
        <p class="sr-info-sub">Your results will be sent to your email so you have them for reference. No spam — just your score.</p>
        <div class="sr-field">
          <label for="sr-firstname">First Name</label>
          <input
            type="text"
            id="sr-firstname"
            placeholder="Your first name"
            value="${escHtml(firstName)}"
            oninput="handleInfoInput()"
            autocomplete="given-name"
          />
        </div>
        <div class="sr-field">
          <label for="sr-email">Email Address</label>
          <input
            type="email"
            id="sr-email"
            placeholder="you@example.com"
            value="${escHtml(email)}"
            oninput="handleInfoInput()"
            autocomplete="email"
          />
          <p class="sr-field-hint">This is where you'll receive a detailed breakdown of your results.</p>
        </div>
      </div>
      <div class="sr-nav">
        <button class="sr-btn-back" onclick="goBack()">← Back</button>
        <button class="sr-btn-next" id="sr-next-btn" onclick="goNext()" ${allAnsweredForStep() ? '' : 'disabled'}>
          Start Assessment →
        </button>
      </div>
    </div>
  `);
}

function renderDomain(app, domainIdx) {
  const domain = DOMAINS[domainIdx];
  const stepNum = domainIdx + 1;

  app.insertAdjacentHTML('beforeend', `
    <div class="sr-card">
      <div class="sr-domain-header">
        <div class="sr-domain-icon">${domain.icon}</div>
        <div>
          <div class="sr-domain-num">Domain ${stepNum} of ${DOMAINS.length}</div>
          <div class="sr-domain-title">${domain.title}</div>
          <div class="sr-domain-desc">${domain.desc}</div>
        </div>
      </div>
      <div class="sr-questions">
        ${domain.questions.map((q, qi) => renderQuestion(q, qi, domainIdx)).join('')}
      </div>
      <div class="sr-nav">
        <button class="sr-btn-back" onclick="goBack()">← Back</button>
        <button class="sr-btn-next" id="sr-next-btn" onclick="goNext()" ${allAnsweredForStep() ? '' : 'disabled'}>
          ${domainIdx < DOMAINS.length - 1 ? 'Next →' : 'See My Results →'}
        </button>
      </div>
    </div>
  `);
}

function renderQuestion(q, qi, domainIdx) {
  return `
    <div class="sr-question-block">
      <div class="sr-question-label">${q.label}</div>
      <div class="sr-question-text">${q.text}</div>
      <div class="sr-options">
        ${q.options.map(opt => `
          <button
            class="sr-option${answers[q.entry] === opt ? ' selected' : ''}"
            data-entry="${q.entry}"
            data-value="${escHtml(opt)}"
            onclick="selectOption(this, '${q.entry}', ${escHtml(JSON.stringify(opt))})"
          >
            <span class="sr-option-dot"></span>
            <span class="sr-option-text">${escHtml(stripPrefix(opt))}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderLoading(app) {
  app.insertAdjacentHTML('beforeend', `
    <div class="sr-card">
      <div class="sr-loading">
        <div class="sr-spinner"></div>
        <h2>Calculating Your Readiness...</h2>
        <p>Scoring across all 7 domains</p>
      </div>
    </div>
  `);
}

function renderResults(app) {
  const score = totalScore();
  const tier  = getTier(score);
  const max   = 42;

  // SVG circle: r=62, circumference = 2π×62 ≈ 389.56
  const r = 62;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / max) * circ;

  app.insertAdjacentHTML('beforeend', `
    <div class="sr-card">
      <div class="sr-results-header">
        <img src="/training-timeline-calculator/Recal Logo White in Blue.png" alt="Recal" class="sr-results-logo" />

        <div class="sr-score-circle-wrap">
          <svg class="sr-score-svg" width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="${r}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="12"/>
            <circle cx="80" cy="80" r="${r}" fill="none" stroke="white" stroke-width="12"
              stroke-dasharray="${circ.toFixed(2)}"
              stroke-dashoffset="${offset.toFixed(2)}"
              stroke-linecap="round"
            />
          </svg>
          <div class="sr-score-text">
            <span class="sr-score-number">${score}</span>
            <span class="sr-score-denom">out of ${max}</span>
          </div>
        </div>

        <div class="sr-tier-badge">Summit Readiness Score</div>
        <div class="sr-tier-label">${tier.label}</div>
        <div class="sr-tier-tagline">${tier.tagline}</div>
      </div>

      <div class="sr-results-body">
        <p class="sr-results-desc">${tier.description}</p>

        <div class="sr-section-title">Performance by Domain</div>
        <div class="sr-domain-bars">
          ${DOMAINS.map(d => {
            const ds = domainScore(d);
            const dmax = 6;
            const dpct = Math.round((ds / dmax) * 100);
            const colorClass = barColorClass(ds, dmax);
            return `
              <div class="sr-domain-bar-row">
                <div class="sr-domain-bar-meta">
                  <span class="sr-domain-bar-name">${d.icon} ${d.title}</span>
                  <span class="sr-domain-bar-score">${ds} / ${dmax}</span>
                </div>
                <div class="sr-domain-bar-track">
                  <div class="sr-domain-bar-fill ${colorClass}" style="width:${dpct}%"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="sr-results-cta">
          <button class="sr-btn-primary" onclick="window.print()">
            🖨️ Save Results as PDF
          </button>
          <button class="sr-btn-restart" onclick="restart()">
            ↩ Retake Assessment
          </button>
        </div>
      </div>
    </div>
  `);
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

function selectOption(btn, entry, value) {
  answers[entry] = value;

  // Deselect all sibling options for this question (no full re-render = no blink)
  const optionsGroup = btn.closest('.sr-options');
  if (optionsGroup) {
    optionsGroup.querySelectorAll('.sr-option').forEach(b => b.classList.remove('selected'));
  }
  btn.classList.add('selected');

  // Enable Next button if all questions in this domain are answered
  const nextBtn = document.getElementById('sr-next-btn');
  if (nextBtn) nextBtn.disabled = !allAnsweredForStep();
}

function handleInfoInput() {
  firstName = (document.getElementById('sr-firstname') || {}).value || '';
  email     = (document.getElementById('sr-email')    || {}).value || '';
  const btn = document.getElementById('sr-next-btn');
  if (btn) btn.disabled = !allAnsweredForStep();
}

function goNext() {
  if (currentStep === 1) {
    // Capture info values
    firstName = (document.getElementById('sr-firstname') || {}).value || firstName;
    email     = (document.getElementById('sr-email')    || {}).value || email;
  }

  if (!allAnsweredForStep()) return;

  if (currentStep === 8) {
    // Last domain → show loading, then results
    currentStep = 9;
    render();
    submitToGoogleForm();
    setTimeout(() => {
      currentStep = 10;
      render();
    }, 1800);
    return;
  }

  currentStep++;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
  if (currentStep <= 0) return;
  currentStep--;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function restart() {
  currentStep = 0;
  answers = {};
  firstName = '';
  email = '';
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Google Form Submission ───────────────────────────────────────────────────

function submitToGoogleForm() {
  try {
    const form = document.createElement('form');
    form.action = FORM_ACTION;
    form.method = 'POST';
    form.target = 'sr-hidden-iframe';
    form.style.display = 'none';

    const fields = {
      'entry.1328606392': firstName,
      'entry.1362361142': email,
      ...answers
    };

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type  = 'hidden';
      input.name  = name;
      input.value = value || '';
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  } catch (e) {
    // Silent fail — results display regardless
    console.warn('Form submission error:', e);
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Auto-resize for iframe embedding ────────────────────────────────────────

function notifyParentHeight() {
  try {
    const h = document.getElementById('app').scrollHeight + 80;
    window.parent.postMessage({ type: 'sr-resize', height: h }, '*');
  } catch (_) {}
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  render();
  // Observe DOM changes to notify parent of height changes
  const obs = new MutationObserver(notifyParentHeight);
  obs.observe(document.getElementById('app'), { childList: true, subtree: true });
  notifyParentHeight();
});
