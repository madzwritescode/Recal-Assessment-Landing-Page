export type AnnotationUsageStatus = 'unused' | 'in_progress' | 'used';

export interface VideoAnnotation {
  id: string;
  video_source_id: string;
  video_source: 'youtube' | 'gdrive';
  video_title: string;
  video_folder_path?: string | null;
  video_direct_url: string;
  video_thumbnail_url?: string | null;
  start_seconds: number;
  start_formatted: string;
  end_seconds?: number | null;
  end_formatted?: string | null;
  topic: string;
  comment: string;
  author: string;
  status: AnnotationUsageStatus;
  used_for?: string | null;
  created_at: string;
  updated_at: string;
}

export const PRESET_ANNOTATION_TOPICS = [
  'Kilimanjaro',
  'Everest',
  'Breathwork Technique',
  'CO2 Tolerance',
  'Hypoxia & Altitude',
  'Acclimatization',
  'Ad Hook / CTA',
  'Client Testimonial',
  'Mindset & Recovery',
  'B-Roll / Cinematic',
];

/**
 * Formats seconds (e.g. 135) into MM:SS or H:MM:SS (e.g. "02:15")
 */
export function formatSecondsToTimestamp(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
    return '00:00';
  }
  const totalSec = Math.floor(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Parses a human-entered timestamp string ("02:15", "1:02:15", "135", "2m15s") into seconds.
 * Returns null if empty or invalid.
 */
export function parseTimestampInput(input: string): number | null {
  if (!input || !input.trim()) return null;
  const cleaned = input.trim().toLowerCase();

  // Handle "2m15s" or "90s" style
  const hmMatch = cleaned.match(/^(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?$/);
  if (hmMatch && (hmMatch[1] || hmMatch[2] || hmMatch[3]) && /[hms]/.test(cleaned)) {
    const h = parseInt(hmMatch[1] || '0', 10);
    const m = parseInt(hmMatch[2] || '0', 10);
    const s = parseInt(hmMatch[3] || '0', 10);
    return h * 3600 + m * 60 + s;
  }

  // Handle colon format "MM:SS" or "HH:MM:SS"
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':').map((p) => parseInt(p.trim(), 10));
    if (parts.some((p) => isNaN(p) || p < 0)) return null;
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return null;
  }

  // Handle raw seconds "135"
  const num = Number(cleaned);
  if (!isNaN(num) && num >= 0) {
    return Math.floor(num);
  }

  return null;
}

export function getStatusBadgeStyle(status: AnnotationUsageStatus): {
  label: string;
  shortLabel: string;
  classes: string;
  dotColor: string;
} {
  switch (status) {
    case 'used':
      return {
        label: 'Used / Published',
        shortLabel: 'Used',
        classes: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        dotColor: 'bg-blue-400',
      };
    case 'in_progress':
      return {
        label: 'In Editing',
        shortLabel: 'In Editing',
        classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        dotColor: 'bg-amber-400',
      };
    case 'unused':
    default:
      return {
        label: 'Unused / Ready',
        shortLabel: 'Unused',
        classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        dotColor: 'bg-emerald-400',
      };
  }
}
