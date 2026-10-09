import { NextResponse } from 'next/server';
import { runFullVideoSync } from '@/lib/video-sync/sync-coordinator';
import { getYouTubeTokens } from '@/lib/video-sync/token-store';
import { supabase } from '@/lib/supabase';

// Disallow caching for live sync endpoints
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tokens = await getYouTubeTokens();
    const isYouTubeConnected = Boolean(tokens && (tokens.refresh_token || tokens.access_token));

    const { count: totalActive } = await supabase
      .from('recal_videos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { data: latestVideo } = await supabase
      .from('recal_videos')
      .select('last_synced_at')
      .order('last_synced_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      youtubeConnected: isYouTubeConnected,
      channelTitle: tokens?.channel_title || null,
      totalActiveVideos: totalActive || 0,
      lastSyncedAt: latestVideo?.last_synced_at || null,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to retrieve sync status';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log('[Video Sync] Initiating full video crawl and synchronization...');
    const report = await runFullVideoSync((progress) => {
      console.log(`[Video Sync Progress]: ${progress}`);
    });

    return NextResponse.json({
      success: report.success,
      report,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Synchronization failed';
    console.error('[Video Sync Failed]:', err);
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
