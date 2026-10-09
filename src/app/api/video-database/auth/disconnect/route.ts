import { NextResponse } from 'next/server';
import { deleteYouTubeTokens } from '@/lib/video-sync/token-store';

export async function POST() {
  try {
    await deleteYouTubeTokens();
    return NextResponse.json({ success: true, message: 'YouTube disconnected successfully' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to disconnect YouTube';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
