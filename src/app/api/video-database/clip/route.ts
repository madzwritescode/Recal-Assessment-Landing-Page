import { NextRequest, NextResponse } from 'next/server';
import { getGoogleDriveCredentials } from '@/lib/video-sync/drive-credentials';
import { formatSecondsToTimestamp } from '@/lib/video-sync/annotations';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import ffmpegStatic from 'ffmpeg-static';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getDriveAccessToken(): Promise<string> {
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

function resolveFfmpegPath(): string {
  if (typeof ffmpegStatic === 'string' && fs.existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }
  const fallbackNodeModules = path.join(
    process.cwd(),
    'node_modules',
    'ffmpeg-static',
    process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  );
  if (fs.existsSync(fallbackNodeModules)) {
    return fallbackNodeModules;
  }
  return 'ffmpeg';
}

function runFfmpeg(bin: string, args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => resolve({ code: code ?? 1, stderr }));
  });
}

function buildSafeClipFilename(title: string, topic: string, startSec: number, endSec: number): string {
  const cleanTitle = (title || 'Recal_Video')
    .replace(/\.[a-zA-Z0-9]{2,4}$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 45);

  const cleanTopic = (topic || '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 25);

  const startTag = formatSecondsToTimestamp(startSec).replace(/:/g, 'm') + 's';
  const endTag = formatSecondsToTimestamp(endSec).replace(/:/g, 'm') + 's';

  const prefix = cleanTopic ? `${cleanTitle}_${cleanTopic}` : cleanTitle;
  return `${prefix || 'Recal_Clip'}_${startTag}-${endTag}.mp4`;
}

export async function GET(req: NextRequest) {
  let tmpOutputPath: string | null = null;

  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const title = searchParams.get('title') || 'Recal_Clip';
    const topic = searchParams.get('topic') || '';

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    const startSec = Math.max(0, Number(startParam) || 0);
    let endSec =
      endParam !== null && endParam !== '' && !isNaN(Number(endParam)) && Number(endParam) > startSec
        ? Number(endParam)
        : startSec + 30; // Default 30s clip if no end timestamp was set

    // Cap single clip download at 10 minutes (600s) to stay fast & within serverless limits
    if (endSec - startSec > 600) {
      endSec = startSec + 600;
    }

    const durationSec = Math.max(1, endSec - startSec);
    const token = await getDriveAccessToken();
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}?alt=media&supportsAllDrives=true`;

    const ffmpegBin = resolveFfmpegPath();
    tmpOutputPath = path.join(os.tmpdir(), `recal-clip-${crypto.randomUUID()}.mp4`);

    // 1. Primary: Ultra-fast HTTP Range Seek + Stream Copy (no re-encoding, preserves 100% quality)
    const copyArgs = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-headers',
      `Authorization: Bearer ${token}\r\n`,
      '-ss',
      String(startSec),
      '-t',
      String(durationSec),
      '-i',
      driveUrl,
      '-c',
      'copy',
      '-movflags',
      '+faststart',
      '-avoid_negative_ts',
      'make_zero',
      '-y',
      tmpOutputPath,
    ];

    let result = await runFfmpeg(ffmpegBin, copyArgs);

    // 2. Fallback: If stream copy failed or produced an empty file, transcode with ultrafast H.264/AAC
    const fileValid =
      result.code === 0 &&
      fs.existsSync(tmpOutputPath) &&
      fs.statSync(tmpOutputPath).size > 1024;

    if (!fileValid) {
      const transcodeArgs = [
        '-hide_banner',
        '-loglevel',
        'error',
        '-headers',
        `Authorization: Bearer ${token}\r\n`,
        '-ss',
        String(startSec),
        '-t',
        String(durationSec),
        '-i',
        driveUrl,
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-crf',
        '23',
        '-c:a',
        'aac',
        '-movflags',
        '+faststart',
        '-y',
        tmpOutputPath,
      ];
      result = await runFfmpeg(ffmpegBin, transcodeArgs);
    }

    if (!fs.existsSync(tmpOutputPath) || fs.statSync(tmpOutputPath).size === 0) {
      throw new Error(result.stderr || 'FFmpeg failed to extract video clip segment');
    }

    const fileBuffer = fs.readFileSync(tmpOutputPath);
    const filename = buildSafeClipFilename(title, topic, startSec, endSec);

    try {
      fs.unlinkSync(tmpOutputPath);
      tmpOutputPath = null;
    } catch {
      // Ignore cleanup error
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(fileBuffer.byteLength),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    if (tmpOutputPath && fs.existsSync(tmpOutputPath)) {
      try {
        fs.unlinkSync(tmpOutputPath);
      } catch {
        // Ignore cleanup error
      }
    }
    console.error('Error cutting video clip:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to extract clip' },
      { status: 500 }
    );
  }
}
