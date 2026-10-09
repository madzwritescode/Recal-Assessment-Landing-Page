import { NextResponse } from 'next/server';
import { getOAuth2Client } from '@/lib/video-sync/youtube-harvester';

export async function GET(request: Request) {
  try {
    const host = request.headers.get('host') || 'localhost:3001';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const redirectUri = `${proto}://${host}/api/video-database/auth/callback`;

    const oauth2Client = getOAuth2Client(redirectUri);

    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Ensure refresh_token is always returned
    });

    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Login initiation failed';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
