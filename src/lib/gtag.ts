// Declare the gtag function on the window interface
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: { [key: string]: any }
    ) => void;
  }
}

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

// GA4 Event Tracking
// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({ action, category, label, value }: {
  action: string;
  category: string;
  label: string;
  value?: number;
}) => {
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
    // GA4 uses custom parameters - category and label as custom dimensions
    window.gtag('event', action, {
      event_category: category, // Kept for backward compatibility
      event_label: label, // Kept for backward compatibility
      category: category, // GA4 custom parameter
      label: label, // GA4 custom parameter
      ...(value !== undefined && { value: value }),
    });
  }
};
