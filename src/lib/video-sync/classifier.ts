export type VideoOrientation = 'vertical' | 'horizontal';
export type VideoCategory = 'webinar' | 'ad' | 'final_cut' | 'raw_footage' | 'campaign' | 'general';

export interface VideoClassification {
  orientation: VideoOrientation;
  orientationLabel: string;
  category: VideoCategory;
  categoryLabel: string;
  categoryColor: string;
  isShortForm: boolean;
}

export function classifyVideo(
  title: string,
  folderPath: string = '',
  durationSeconds: number = 0
): VideoClassification {
  const t = title.toLowerCase();
  const f = folderPath.toLowerCase();

  // 1. Detect Orientation
  const isVertical =
    t.includes('portrait') ||
    t.includes('9-16') ||
    t.includes('9x16') ||
    t.includes('reel') ||
    t.includes('short') ||
    t.includes('tiktok') ||
    f.includes('portrait') ||
    f.includes('reels') ||
    f.includes('shorts') ||
    (durationSeconds > 0 && durationSeconds <= 60 && !t.includes('landscape') && !f.includes('landscape'));

  const orientation: VideoOrientation = isVertical ? 'vertical' : 'horizontal';
  const orientationLabel = isVertical ? '📱 9:16 Vertical (Reel/Short)' : '🖥️ 16:9 Landscape';

  // 2. Detect Content Category
  let category: VideoCategory = 'general';
  let categoryLabel = '📁 General Asset';
  let categoryColor = 'bg-slate-500/10 text-slate-400 border-slate-500/20';

  if (
    f.includes('webinar') ||
    f.includes('recording') ||
    t.includes('webinar') ||
    t.includes('workshop') ||
    t.includes('live q&a') ||
    t.includes('q&a')
  ) {
    category = 'webinar';
    categoryLabel = '🟣 Webinar / Q&A';
    categoryColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  } else if (f.includes('ad') || t.includes('ad ') || t.includes('commercial') || f.includes('ads')) {
    category = 'ad';
    categoryLabel = '🟠 Paid Social Ad';
    categoryColor = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  } else if (
    t.includes('cut') ||
    t.includes('final') ||
    t.includes('portrait') ||
    t.includes('landscape') ||
    t.includes('countdown') ||
    t.includes('intro') ||
    t.includes('cinematic')
  ) {
    category = 'final_cut';
    categoryLabel = '🟢 Final Edit';
    categoryColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  } else if (/^img_\d+/i.test(title)) {
    category = 'raw_footage';
    categoryLabel = '🟡 Raw Camera Take';
    categoryColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  } else if (f.includes('kilimanjaro') || f.includes('everest') || t.includes('kili') || t.includes('everest')) {
    category = 'campaign';
    categoryLabel = '🏔️ Expedition / Campaign';
    categoryColor = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
  }

  return {
    orientation,
    orientationLabel,
    category,
    categoryLabel,
    categoryColor,
    isShortForm: durationSeconds > 0 && durationSeconds <= 60,
  };
}
