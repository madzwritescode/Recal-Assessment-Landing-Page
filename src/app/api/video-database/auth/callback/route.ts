import { NextResponse } from 'next/server';
import { getOAuth2Client } from '@/lib/video-sync/youtube-harvester';
import { saveYouTubeTokens } from '@/lib/video-sync/token-store';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    const host = request.headers.get('host') || 'localhost:3001';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const redirectUri = `${proto}://${host}/api/video-database/auth/callback`;

    if (error) {
      return NextResponse.redirect(`${proto}://${host}/video-database?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return NextResponse.redirect(`${proto}://${host}/video-database?error=missing_code`);
    }

    const oauth2Client = getOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    // Fetch channel metadata to confirm channel name
    let channelTitle = 'Recal YouTube';
    let channelId = '';
    try {
      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
      const channelRes = await youtube.channels.list({ part: ['snippet'], mine: true });
      if (channelRes.data.items?.[0]) {
        channelTitle = channelRes.data.items[0].snippet?.title || channelTitle;
        channelId = channelRes.data.items[0].id || '';
      }
    } catch (chanErr) {
      console.warn('Could not fetch channel details during callback:', chanErr);
    }

    await saveYouTubeTokens({
      access_token: tokens.access_token || undefined,
      refresh_token: tokens.refresh_token || undefined,
      scope: tokens.scope || undefined,
      token_type: tokens.token_type || undefined,
      expiry_date: tokens.expiry_date || undefined,
      channel_id: channelId,
      channel_title: channelTitle,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.redirect(
      `${proto}://${host}/video-database?auth=success&channel=${encodeURIComponent(channelTitle)}`
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'auth_failed';
    console.error('OAuth callback error:', err);
    const host = request.headers.get('host') || 'localhost:3001';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    return NextResponse.redirect(
      `${proto}://${host}/video-database?error=${encodeURIComponent(errorMsg)}`
    );
  }
}
