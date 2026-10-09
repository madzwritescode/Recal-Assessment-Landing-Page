import { NextResponse } from 'next/server';
import { deleteYouTubeTokens } from '@/lib/video-sync/token-store';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // 1. Delete stored tokens
    await deleteYouTubeTokens();

    // 2. Erase any videos imported from the disconnected YouTube channel
    await supabase.from('recal_videos').delete().eq('source', 'youtube');

    return NextResponse.json({
      success: true,
      message: 'YouTube disconnected and channel videos removed from database.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to disconnect YouTube';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
