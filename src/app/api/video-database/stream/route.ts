import { NextRequest, NextResponse } from 'next/server';
import { getGoogleDriveCredentials } from '@/lib/video-sync/drive-credentials';

export const dynamic = 'force-dynamic';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const creds = await getGoogleDriveCredentials();
  if (!creds) {
    throw new Error('Missing Google Drive Service Account credentials');
  }

  const { google } = await import('googleapis');
  const auth = new google.auth.JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  const tokenRes = await auth.getAccessToken();
  if (!tokenRes.token) {
    throw new Error('Failed to obtain Google Drive access token');
  }

  cachedToken = {
    token: tokenRes.token,
    expiresAt: Date.now() + 50 * 60 * 1000,
  };

  return tokenRes.token;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    const token = await getAccessToken();
    const rangeHeader = req.headers.get('range');

    const upstreamHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (rangeHeader) {
      upstreamHeaders['Range'] = rangeHeader;
    }

    const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}?alt=media&supportsAllDrives=true`;

    const upstreamRes = await fetch(driveUrl, {
      headers: upstreamHeaders,
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return NextResponse.json(
        { error: `Drive stream returned status ${upstreamRes.status}` },
        { status: upstreamRes.status }
      );
    }

    const responseHeaders = new Headers();
    const contentType = upstreamRes.headers.get('content-type') || 'video/mp4';
    const contentLength = upstreamRes.headers.get('content-length');
    const contentRange = upstreamRes.headers.get('content-range');

    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'private, max-age=3600');

    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error('Error streaming Google Drive video:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to stream video' },
      { status: 500 }
    );
  }
}
