import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getGoogleDriveCredentials } from '@/lib/video-sync/drive-credentials';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoId, transcriptText, action } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    // Action 1: Direct Save (user pasted transcript or uploaded sidecar .vtt/.srt)
    if (action === 'save_text' || transcriptText) {
      if (!transcriptText || !transcriptText.trim()) {
        return NextResponse.json({ error: 'transcriptText cannot be empty' }, { status: 400 });
      }

      const { error } = await supabase
        .from('recal_videos')
        .update({
          transcript: transcriptText.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('source_id', videoId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Transcript saved to database successfully.',
        savedToDb: true,
      });
    }

    // Action 2: Google Drive native timedtext caption extraction (0 credits, fast & free)
    const creds = await getGoogleDriveCredentials();
    if (!creds) {
      return NextResponse.json(
        { error: 'Google Drive credentials not configured in environment or database' },
        { status: 400 }
      );
    }

    const { google } = await import('googleapis');
    const auth = new google.auth.JWT({
      email: creds.clientEmail,
      key: creds.privateKey,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const tokenRes = await auth.getAccessToken();
    const token = tokenRes.token;

    function parseTimedTextXml(xml: string): string | null {
      if (!xml || typeof xml !== 'string') return null;
      const regex = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/gi;
      const parts: string[] = [];
      let match;
      while ((match = regex.exec(xml)) !== null) {
        const text = match[3]
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\n/g, ' ')
          .trim();
        if (text) parts.push(text);
      }
      if (!parts.length) return null;
      return parts.join(' ');
    }

    let parsedTranscript: string | null = null;
    const trackUrls = [
      `https://drive.google.com/timedtext?v=${videoId}&type=track&lang=en&name=&kind=asr`,
      `https://drive.google.com/timedtext?v=${videoId}&type=track&lang=en`,
    ];

    for (const url of trackUrls) {
      try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 200) {
          const xml = await res.text();
          const parsed = parseTimedTextXml(xml);
          if (parsed) {
            parsedTranscript = parsed;
            break;
          }
        }
      } catch (fetchErr) {
        console.warn('Timedtext fetch warning:', fetchErr);
      }
    }

    if (parsedTranscript) {
      const { error: dbErr } = await supabase
        .from('recal_videos')
        .update({
          transcript: parsedTranscript,
          updated_at: new Date().toISOString(),
        })
        .eq('source_id', videoId);

      if (dbErr) {
        return NextResponse.json({ error: dbErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        transcript: parsedTranscript,
        savedToDb: true,
        message: 'Transcript extracted and saved to database successfully.',
      });
    }

    return NextResponse.json({
      success: false,
      message: 'No spoken transcript found in Google Drive for this video (likely silent footage, B-roll, or background music).',
    });
  } catch (err) {
    console.error('Error in transcribe route:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Transcription failed' },
      { status: 500 }
    );
  }
}
