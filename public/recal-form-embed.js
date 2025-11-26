/**
 * Recal Form Embed Script
 * 
 * Usage:
 * <div id="recal-form-container"></div>
 * <script>
 *   window.RECAL_FORM_CONFIG = {
 *     baseUrl: 'https://yourdomain.com',
 *     gaId: 'G-XXXXXXXXXX' // optional
 *   };
 * </script>
 * <script src="https://yourdomain.com/recal-form-embed.js"></script>
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = window.RECAL_FORM_CONFIG || {};
    const BASE_URL = CONFIG.baseUrl || 'https://yourdomain.com';
    // Default GA ID (Recal's main tracking) - use partner's ID if provided, otherwise use default
    const DEFAULT_GA_ID = 'G-TZ8Y3WV5HP';
    const GA_ID = CONFIG.gaId || DEFAULT_GA_ID;
    const COMPANY_NAME = CONFIG.companyName || 'Unknown';
    const CONTAINER_ID = CONFIG.containerId || 'recal-form-container';

    // Google Form configuration
    const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfdvHwTAuYDUZrqKntNaIcZbNM_RPothRiZgcMbwFPeb8Mx0A/viewform';
    const FORM_ENTRY_IDS = {
        firstName: 'entry.1328606392',
        lastName: 'entry.343152274',
        email: 'entry.1362361142'
    };

    // CSS Styles
    const STYLES = `
        <style>
            @font-face {
                font-family: 'Rogue Sans Ext';
                src: url('${BASE_URL}/fonts/fonnts.com-Rogue_Sans_Ext_Bold_It.otf') format('opentype');
                font-weight: 700;
                font-style: italic;
                font-display: swap;
            }
            .recal-widget-shell {
                background: linear-gradient(135deg, #f7f8ff, #eef4ff);
                border-radius: 30px;
                padding: 6px;
                border: 2px solid #d9c3ff;
                box-shadow: 0 15px 45px rgba(133, 96, 169, 0.25);
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .recal-form-card {
                background: linear-gradient(160deg, #ffffff 0%, #f2f7ff 100%);
                border-radius: 25px;
                padding: 24px;
                box-shadow: 0 25px 55px rgba(12, 48, 82, 0.18);
            }
            .recal-brand-header {
                background: linear-gradient(120deg, #0A4367, #0F5C89 60%, #4A90A4);
                border-radius: 18px;
                padding: 18px 22px;
                margin-bottom: 20px;
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 12px 35px rgba(10, 67, 103, 0.4);
                color: #ffffff;
            }
            .recal-brand-logo {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .recal-brand-logo img {
                height: 30px;
                width: auto;
                filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.4));
            }
            .recal-brand-logo span {
                font-size: 14px;
                font-weight: 700;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                font-family: 'Rogue Sans Ext', sans-serif;
            }
            .recal-tagline {
                font-size: 15px;
                color: rgba(10, 67, 103, 0.82);
                margin-bottom: 22px;
                font-weight: 600;
            }
            .recal-form {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .recal-form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }
            .recal-input {
                width: 100%;
                padding: 14px 16px;
                border: 2px solid rgba(8, 63, 107, 0.9);
                border-radius: 16px;
                font-size: 16px;
                height: 52px;
                font-weight: 600;
                background: rgba(255, 255, 255, 0.92);
                color: #0A4367;
                font-family: 'Rogue Sans Ext', sans-serif;
                box-shadow: 0 6px 15px rgba(10, 67, 103, 0.08);
                transition: border-color 0.2s, box-shadow 0.2s;
            }
            .recal-input:focus {
                outline: none;
                border-color: #0F5C89;
                box-shadow: 0 0 0 3px rgba(15, 92, 137, 0.15);
            }
            .recal-input::placeholder {
                color: #0A4367;
                font-weight: 600;
                opacity: 0.9;
                font-family: 'Rogue Sans Ext', sans-serif;
            }
            .recal-button {
                width: 100%;
                padding: 14px 24px;
                background: linear-gradient(120deg, #06355C, #0B4D7C);
                color: white;
                border: none;
                border-radius: 18px;
                font-size: 16px;
                font-weight: 700;
                font-family: 'Rogue Sans Ext', sans-serif;
                height: 54px;
                cursor: pointer;
                box-shadow: 0 18px 30px rgba(6, 53, 92, 0.35);
                transition: transform 0.15s ease, box-shadow 0.15s ease;
            }
            .recal-button:hover {
                transform: translateY(-1px);
                box-shadow: 0 20px 32px rgba(6, 53, 92, 0.4);
            }
            .recal-button:disabled {
                opacity: 0.65;
                cursor: not-allowed;
            }
            .recal-fine-print {
                text-align: center;
                font-size: 12px;
                color: #7a8595;
                margin: 0;
            }
            .recal-subtitle {
                text-align: center;
                font-size: 14px;
                color: #0A4367;
                font-weight: 600;
                font-style: italic;
                margin: 4px 0 0;
            }
            .recal-loading {
                opacity: 0.6;
                pointer-events: none;
            }
            @media (max-width: 640px) {
                .recal-form-row {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    `;

    // Form HTML
    const FORM_HTML = `
        <div class="recal-widget-shell">
            <div class="recal-form-card">
                <div class="recal-brand-header">
                    <div class="recal-brand-logo">
                        <img src="${BASE_URL}/assets/recal-embed-logo.png" alt="Recal logo" />
                        <span>Recal Breath Index</span>
                    </div>
                </div>
                <div class="recal-form-content">
                    <p class="recal-tagline">Instant breathing diagnostics designed for elite performance.</p>
                    <form id="recalForm" class="recal-form">
                        <div class="recal-form-row">
                            <input
                                type="text"
                                name="firstName"
                                id="recalFirstName"
                                placeholder="First Name"
                                class="recal-input"
                                required
                            />
                            <input
                                type="text"
                                name="lastName"
                                id="recalLastName"
                                placeholder="Last Name"
                                class="recal-input"
                            />
                        </div>
                        <input
                            type="email"
                            name="email"
                            id="recalEmail"
                            placeholder="Email"
                            class="recal-input"
                            required
                        />
                        <button type="submit" class="recal-button" id="recalSubmitButton">
                            Start My Assessment
                        </button>
                        <p class="recal-fine-print">
                            Takes 5-10 minutes on average to complete
                        </p>
                        <p class="recal-subtitle">
                            Your info will never be shared with anyone.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Initialize Google Analytics 4
    function initGA4() {
        if (!GA_ID) return;
        
        // Check if GA4 is already loaded
        if (window.gtag && window.dataLayer) {
            // GA4 already initialized, just configure this tracking ID
            window.gtag('config', GA_ID);
            // Track widget view after GA is ready
            setTimeout(() => trackWidgetView(), 100);
            return;
        }

        // Load GA4 script dynamically
        window.dataLayer = window.dataLayer || [];
        function gtag(){window.dataLayer.push(arguments);}
        window.gtag = gtag;
        window.gtag('js', new Date());
        window.gtag('config', GA_ID);

        // Load the gtag.js script
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
        script.onload = function() {
            // Track widget view after GA script loads
            trackWidgetView();
        };
        document.head.appendChild(script);
    }

    // Track widget view event
    function trackWidgetView() {
        if (GA_ID && typeof window.gtag !== 'undefined') {
            window.gtag('event', 'widget_view', {
                event_category: 'Engagement',
                event_label: 'Form Widget Loaded',
                category: 'Engagement',
                label: 'Form Widget Loaded',
                company_name: COMPANY_NAME,
                company: COMPANY_NAME,
                value: 1,
            });
        }
    }

    // Track event helper with GA4-native parameters
    function trackEvent(action, category, label, value) {
        if (GA_ID && typeof window.gtag !== 'undefined') {
            window.gtag('event', action, {
                // GA4 custom parameters
                category: category,
                label: label,
                company_name: COMPANY_NAME,
                company: COMPANY_NAME,
                // Legacy parameters for backward compatibility
                event_category: category,
                event_label: label,
                ...(value !== undefined && { value: value }),
            });
        }
    }

    // Record signup to API
    async function recordSignup(firstName, lastName, email) {
        try {
            const response = await fetch(`${BASE_URL}/api/record-landing-signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: firstName,
                    lastName: lastName || '',
                    email: email,
                }),
            });

            if (response.ok) {
                console.log('Recal: Signup recorded successfully');
            } else {
                console.error('Recal: Failed to record signup');
            }
        } catch (error) {
            console.error('Recal: Error recording signup:', error);
        }
    }

    // Initialize form
    function initForm() {
        // Initialize GA4 first if needed
        initGA4();

        const container = document.getElementById(CONTAINER_ID);
        if (!container) {
            console.error('Recal Form: Container element not found. Make sure you have a div with id="' + CONTAINER_ID + '"');
            return;
        }

        // Inject styles and form
        container.innerHTML = STYLES + FORM_HTML;

        // Get form elements
        const form = document.getElementById('recalForm');
        const submitButton = document.getElementById('recalSubmitButton');
        const firstNameInput = document.getElementById('recalFirstName');
        const lastNameInput = document.getElementById('recalLastName');
        const emailInput = document.getElementById('recalEmail');

        // Handle form submission
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const firstName = firstNameInput.value.trim();
            const lastName = lastNameInput.value.trim();
            const email = emailInput.value.trim();

            if (!firstName || !email) {
                alert('Please fill in all required fields.');
                return;
            }

            // Disable form
            form.classList.add('recal-loading');
            submitButton.disabled = true;
            submitButton.textContent = 'Opening Assessment...';

            // Track conversion
            trackEvent('start_assessment_click', 'Conversion', 'Embedded Form CTA', 1);

            // Record signup (async)
            recordSignup(firstName, lastName, email).catch(console.error);

            // Build Google Form URL
            const url = new URL(GOOGLE_FORM_URL);
            url.searchParams.append(FORM_ENTRY_IDS.firstName, firstName);
            if (lastName) {
                url.searchParams.append(FORM_ENTRY_IDS.lastName, lastName);
            }
            url.searchParams.append(FORM_ENTRY_IDS.email, email);

            // Open Google Form
            window.open(url.toString(), '_blank');

            // Reset form
            setTimeout(() => {
                form.reset();
                form.classList.remove('recal-loading');
                submitButton.disabled = false;
                submitButton.textContent = 'Start My Assessment';
            }, 1000);
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initForm);
    } else {
        initForm();
    }
})();

