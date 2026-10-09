import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load .env.local
const envPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[match[1].trim()] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ffplovqjoadirzfeaela.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n) => n.toString().padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 MB';
  const gb = bytes / (1024 * 1024 * 1024);
  const mb = bytes / (1024 * 1024);
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

async function syncDrive() {
  console.log('🔄 Crawling Google Drive: Recal Marketing...');
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/"/g, '');
  const rootFolderId = process.env.GOOGLE_DRIVE_MARKETING_FOLDER_ID || '1SIHLo8DE7_YBXhxglXcAtfo8Ga8c_xp-';

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const drive = google.drive({ version: 'v3', auth });

  const collectedVideos = [];
  let foldersCount = 0;

  async function crawlFolder(folderId, currentBreadcrumb) {
    foldersCount++;
    let pageToken;
    do {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 100,
        pageToken,
        fields:
          'nextPageToken, files(id, name, mimeType, size, videoMediaMetadata, webViewLink, createdTime, modifiedTime, description)',
      });

      const files = res.data.files || [];
      for (const item of files) {
        if (item.mimeType === 'application/vnd.google-apps.folder') {
          await crawlFolder(item.id, `${currentBreadcrumb} > ${item.name}`);
        } else if (item.mimeType?.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi|m4v|wmv)$/i.test(item.name)) {
          const durationSec = item.videoMediaMetadata?.durationMillis
            ? Math.round(item.videoMediaMetadata.durationMillis / 1000)
            : 0;
          const sizeBytes = item.size ? parseInt(item.size, 10) : 0;

          collectedVideos.push({
            source: 'gdrive',
            source_id: item.id,
            title: item.name,
            description: item.description || null,
            privacy_status: 'unlisted',
            is_live: false,
            live_broadcast_content: 'none',
            duration_seconds: durationSec,
            duration_formatted: formatDuration(durationSec),
            file_size_bytes: sizeBytes,
            file_size_formatted: formatFileSize(sizeBytes),
            view_count: 0,
            folder_path: currentBreadcrumb,
            direct_url: item.webViewLink || `https://drive.google.com/file/d/${item.id}/view`,
            thumbnail_url: null,
            mime_type: item.mimeType || 'video/mp4',
            status: 'active',
            published_at: item.createdTime || new Date().toISOString(),
            created_at: item.createdTime || new Date().toISOString(),
            updated_at: item.modifiedTime || new Date().toISOString(),
            last_synced_at: new Date().toISOString(),
          });
        }
      }
      pageToken = res.data.nextPageToken;
    } while (pageToken);
  }

  await crawlFolder(rootFolderId, 'Recal Marketing');
  console.log(`✅ Discovered ${collectedVideos.length} videos across ${foldersCount} folders in Google Drive.`);

  // Upsert in chunks of 50
  for (let i = 0; i < collectedVideos.length; i += 50) {
    const chunk = collectedVideos.slice(i, i + 50);
    const { error } = await supabase.from('recal_videos').upsert(chunk, { onConflict: 'source_id' });
    if (error) console.error('Supabase upsert error:', error);
  }
  console.log(`🚀 Successfully synced ${collectedVideos.length} Google Drive videos to Supabase!`);
}

syncDrive().catch(console.error);
