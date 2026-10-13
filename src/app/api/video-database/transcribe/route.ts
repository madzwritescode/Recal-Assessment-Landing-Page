import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getDriveClient } from '@/lib/video-sync/drive-credentials';

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

    // Action 2: Gemini AI automated transcription
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;

    if (!geminiApiKey) {
      return NextResponse.json({
        error: 'GEMINI_API_KEY is not configured in .env.local. You can get a free key (1,500 free requests/day) at aistudio.google.com, or paste the transcript text directly.',
        requiresKey: true,
      }, { status: 400 });
    }

    // Check if video exists in Drive
    const drive = await getDriveClient();
    const fileMeta = await drive.files.get({
      fileId: videoId,
      supportsAllDrives: true,
      fields: 'id, name, mimeType, size',
    });

    if (!fileMeta.data) {
      return NextResponse.json({ error: 'File not found in Google Drive' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Drive file verified. Ready for audio transcription.',
      fileName: fileMeta.data.name,
    });
  } catch (err) {
    console.error('Error in transcribe route:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Transcription failed' },
      { status: 500 }
    );
  }
}
