import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getGoogleDriveCredentials } from '@/lib/video-sync/drive-credentials';

export const dynamic = 'force-dynamic';

export interface TimedTranscriptSegment {
  start: number;
  dur: number;
  end: number;
  formatted: string;
  text: string;
}

function formatSecToTimestamp(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const rem = sec % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function parseTimedTextXml(xml: string): {
  transcript: string;
  timestampedTranscript: string;
  segments: TimedTranscriptSegment[];
} | null {
  if (!xml || typeof xml !== 'string') return null;
  const regex = /<text\s+start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/gi;
  const rawCues: Array<{ start: number; dur: number; text: string }> = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const start = parseFloat(match[1] || '0');
    const dur = parseFloat(match[2] || '3');
    const text = match[3]
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) {
      rawCues.push({ start, dur, text });
    }
  }
  if (!rawCues.length) return null;

  // Group very short cues into natural ~5-10s spoken phrases while preserving exact start timestamps
  const segments: TimedTranscriptSegment[] = [];
  let currentStart = rawCues[0].start;
  let currentEnd = rawCues[0].start + rawCues[0].dur;
  let currentWords: string[] = [rawCues[0].text];

  for (let i = 1; i < rawCues.length; i++) {
    const cue = rawCues[i];
    const prevText = currentWords[currentWords.length - 1] || '';
    const elapsed = cue.start - currentStart;
    const gap = cue.start - currentEnd;
    const endsSentence = /[.?!]$/.test(prevText);

    if (elapsed >= 8 || (elapsed >= 4 && endsSentence) || gap > 1.5) {
      const startSec = Math.floor(currentStart);
      const endSec = Math.max(startSec + 1, Math.ceil(currentEnd));
      segments.push({
        start: startSec,
        dur: Number((currentEnd - currentStart).toFixed(2)),
        end: endSec,
        formatted: formatSecToTimestamp(startSec),
        text: currentWords.join(' '),
      });
      currentStart = cue.start;
      currentEnd = cue.start + cue.dur;
      currentWords = [cue.text];
    } else {
      currentWords.push(cue.text);
      currentEnd = Math.max(currentEnd, cue.start + cue.dur);
    }
  }

  if (currentWords.length > 0) {
    const startSec = Math.floor(currentStart);
    const endSec = Math.max(startSec + 1, Math.ceil(currentEnd));
    segments.push({
      start: startSec,
      dur: Number((currentEnd - currentStart).toFixed(2)),
      end: endSec,
      formatted: formatSecToTimestamp(startSec),
      text: currentWords.join(' '),
    });
  }

  const transcript = rawCues.map((c) => c.text).join(' ');
  const timestampedTranscript = segments
    .map((s) => `[${s.formatted}] ${s.text}`)
    .join('\n');

  return {
    transcript,
    timestampedTranscript,
    segments,
  };
}

async function fetchDriveTimedText(videoId: string) {
  const creds = await getGoogleDriveCredentials();
  if (!creds) {
    throw new Error('Google Drive credentials not configured in environment or database');
  }

  const { google } = await import('googleapis');
  const auth = new google.auth.JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const tokenRes = await auth.getAccessToken();
  const token = tokenRes.token;

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
          return parsed;
        }
      }
    } catch (fetchErr) {
      console.warn('Timedtext fetch warning:', fetchErr);
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const parsed = await fetchDriveTimedText(videoId);
    if (!parsed) {
      return NextResponse.json({
        success: false,
        segments: [],
        message: 'No timed caption track available from Google Drive.',
      });
    }

    return NextResponse.json({
      success: true,
      segments: parsed.segments,
      timestampedTranscript: parsed.timestampedTranscript,
      transcript: parsed.transcript,
    });
  } catch (err) {
    console.error('Error in GET /api/video-database/transcribe:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch timed segments' },
      { status: 500 }
    );
  }
}

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
    const parsed = await fetchDriveTimedText(videoId);

    if (parsed) {
      const { error: dbErr } = await supabase
        .from('recal_videos')
        .update({
          transcript: parsed.timestampedTranscript,
          updated_at: new Date().toISOString(),
        })
        .eq('source_id', videoId);

      if (dbErr) {
        return NextResponse.json({ error: dbErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        transcript: parsed.timestampedTranscript,
        segments: parsed.segments,
        savedToDb: true,
        message: 'Timestamped transcript extracted and saved to database successfully.',
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
