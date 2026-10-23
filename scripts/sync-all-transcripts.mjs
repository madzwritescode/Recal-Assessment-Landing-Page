/**
 * Automated Batch Transcription Pipeline
 * 
 * Fetches auto-generated captions for Google Drive videos (via Drive TimedText API)
 * and YouTube videos (via vidIQ / YouTube caption bridge), formats spoken text,
 * and saves verbatim transcripts to Supabase (recal_videos.transcript).
 */

import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Setup log file
const logDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logFile = path.resolve(logDir, 'transcript-sync.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  console.log(line);
  logStream.write(line + '\n');
}

// 1. Load environment variables from .env.local if present
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  log('Error: Supabase credentials not found in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// XML Parser for Google Drive TimedText -> "[mm:ss] text" lines (~8s groups) so search hits can jump to the exact moment
function fmtTs(totalSec) {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const r = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function parseTimedTextXml(xml) {
  if (!xml || typeof xml !== 'string') return null;
  const regex = /<text\s+start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/gi;
  const cues = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const text = match[3]
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) cues.push({ start: parseFloat(match[1]), dur: parseFloat(match[2] || '3'), text });
  }
  if (!cues.length) return null;

  // Same grouping rules as /api/video-database/transcribe
  const lines = [];
  let curStart = cues[0].start;
  let curEnd = cues[0].start + cues[0].dur;
  let words = [cues[0].text];
  const flush = () => lines.push(`[${fmtTs(curStart)}] ${words.join(' ')}`);
  for (let i = 1; i < cues.length; i++) {
    const cue = cues[i];
    const elapsed = cue.start - curStart;
    const gap = cue.start - curEnd;
    const endsSentence = /[.?!]$/.test(words[words.length - 1] || '');
    if (elapsed >= 8 || (elapsed >= 4 && endsSentence) || gap > 1.5) {
      flush();
      curStart = cue.start;
      curEnd = cue.start + cue.dur;
      words = [cue.text];
    } else {
      words.push(cue.text);
      curEnd = Math.max(curEnd, cue.start + cue.dur);
    }
  }
  flush();
  return lines.join('\n');
}

// Sleep helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getGoogleDriveAuth() {
  let clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    const { data } = await supabase
      .from('recal_settings')
      .select('value')
      .eq('key', 'google_drive_credentials')
      .maybeSingle();

    if (data?.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      clientEmail = parsed.client_email;
      privateKey = parsed.private_key;
    }
  }

  if (!clientEmail || !privateKey) {
    throw new Error('Google Drive credentials not available.');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return auth;
}

// Token manager for Drive
class DriveTokenManager {
  constructor(auth) {
    this.auth = auth;
    this.token = null;
    this.expiresAt = 0;
  }

  async getToken() {
    const now = Date.now();
    if (!this.token || now > this.expiresAt - 60000) {
      const res = await this.auth.getAccessToken();
      this.token = res.token;
      this.expiresAt = now + 50 * 60 * 1000; // 50 mins
    }
    return this.token;
  }
}

// Paginated fetcher for Supabase
const BACKFILL = process.argv.includes('--backfill');

async function fetchAllPendingVideos(source) {
  let all = [];
  let page = 0;
  const pageSize = 500;
  while (true) {
    let q = supabase.from('recal_videos').select('id, source_id, title').eq('source', source);
    // --backfill: re-fetch existing plain-text transcripts (no [mm:ss] markers) to add timestamps.
    // Always paginate over a stable order; rows that fail stay untouched.
    q = BACKFILL
      ? q.neq('transcript', '').not('transcript', 'is', null).not('transcript', 'like', '[%').order('id')
      : q.is('transcript', null);
    const { data, error } = await q.range(page * pageSize, (page + 1) * pageSize - 1);

    if (error || !data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    page++;
  }
  return all;
}

async function syncDriveTranscripts(tokenManager) {
  log('\n========================================');
  log('--- STEP 1: Processing Google Drive Videos ---');
  log('========================================');

  const videos = await fetchAllPendingVideos('gdrive');
  const total = videos.length;
  log(`Found ${total} Google Drive videos awaiting transcript processing.`);

  let transcribedCount = 0;
  let silentCount = 0;
  let errorCount = 0;

  for (let i = 0; i < total; i++) {
    const v = videos[i];
    const prefix = `[GDrive ${i + 1}/${total}]`;

    try {
      const token = await tokenManager.getToken();
      let transcriptText = null;

      const trackUrls = [
        `https://drive.google.com/timedtext?v=${v.source_id}&type=track&lang=en&name=&kind=asr`,
        `https://drive.google.com/timedtext?v=${v.source_id}&type=track&lang=en`,
      ];

      for (const url of trackUrls) {
        try {
          const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
          if (res.status === 200) {
            const xml = await res.text();
            const parsed = parseTimedTextXml(xml);
            if (parsed) {
              transcriptText = parsed;
              break;
            }
          }
        } catch {
          // ignore sub-track error and try next
        }
      }

      if (transcriptText) {
        await supabase
          .from('recal_videos')
          .update({ transcript: transcriptText, updated_at: new Date().toISOString() })
          .eq('id', v.id);

        transcribedCount++;
        log(`${prefix} ✓ TRANSCRIBED (${transcriptText.length} chars): "${v.title}"`);
      } else if (BACKFILL) {
        log(`${prefix} - No caption track returned, keeping existing transcript: "${v.title}"`);
      } else {
        // Mark as empty string so it indicates checked with no speech
        await supabase
          .from('recal_videos')
          .update({ transcript: '', updated_at: new Date().toISOString() })
          .eq('id', v.id);

        silentCount++;
        log(`${prefix} - No spoken speech / B-roll: "${v.title}"`);
      }
    } catch (err) {
      errorCount++;
      log(`${prefix} ✗ ERROR for "${v.title}": ${err.message}`);
    }

    // Small delay between requests to avoid rate issues
    await sleep(60);
  }

  log('\n--- Google Drive Sync Complete ---');
  log(`Transcribed with speech: ${transcribedCount}`);
  log(`Silent / B-roll clips:    ${silentCount}`);
  log(`Errors:                   ${errorCount}`);
}

async function main() {
  log('=====================================================');
  log('Starting Recal Video Database Full Transcription Sync');
  log('Timestamp: ' + new Date().toISOString());
  log('=====================================================');

  const startTime = Date.now();

  try {
    const auth = await getGoogleDriveAuth();
    const tokenManager = new DriveTokenManager(auth);

    // 1. Process Google Drive Videos (100% Free Google Drive TimedText - 0 vidIQ credits)
    await syncDriveTranscripts(tokenManager);

    const elapsedMinutes = ((Date.now() - startTime) / 60000).toFixed(1);
    log('\n=====================================================');
    log(`GOOGLE DRIVE TRANSCRIPTION SYNC FINISHED IN ${elapsedMinutes} MINUTES!`);
    log('=====================================================');
  } catch (err) {
    log('Fatal error during sync: ' + err.message);
    process.exit(1);
  }
}

main();
