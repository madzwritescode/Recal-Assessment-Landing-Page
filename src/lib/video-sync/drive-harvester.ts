import { google, drive_v3 } from 'googleapis';
import { RecalVideoRecord } from '../supabase';
import { formatDuration, formatFileSize } from './formatters';

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_MARKETING_FOLDER_ID || '1SIHLo8DE7_YBXhxglXcAtfo8Ga8c_xp-';

function getDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Google Service Account credentials in environment variables.');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
}

export async function harvestGoogleDriveVideos(
  onProgress?: (msg: string) => void
): Promise<{ videos: RecalVideoRecord[]; totalFoldersScanned: number }> {
  const drive = getDriveClient();
  const collectedVideos: RecalVideoRecord[] = [];
  let totalFolders = 0;

  async function crawlFolder(folderId: string, currentBreadcrumb: string) {
    totalFolders++;
    if (onProgress && totalFolders % 10 === 0) {
      onProgress(`Scanned ${totalFolders} folders (${collectedVideos.length} videos found so far)...`);
    }

    let pageToken: string | undefined = undefined;

    do {
      const response: { data: drive_v3.Schema$FileList } = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 100,
        pageToken,
        fields:
          'nextPageToken, files(id, name, mimeType, size, videoMediaMetadata, webViewLink, webContentLink, thumbnailLink, createdTime, modifiedTime, description)',
      });

      const files = response.data?.files || [];

      for (const item of files) {
        if (!item.id || !item.name) continue;

        if (item.mimeType === 'application/vnd.google-apps.folder') {
          const nextBreadcrumb = `${currentBreadcrumb} > ${item.name}`;
          await crawlFolder(item.id, nextBreadcrumb);
        } else {
          const isVideoMime = item.mimeType?.startsWith('video/');
          const isVideoExt = /\.(mp4|mov|mkv|webm|avi|m4v|wmv|flv)$/i.test(item.name);

          if (isVideoMime || isVideoExt) {
            const sizeBytes = item.size ? parseInt(item.size, 10) : 0;
            const durationSec = item.videoMediaMetadata?.durationMillis
              ? Math.round(parseInt(item.videoMediaMetadata.durationMillis, 10) / 1000)
              : 0;

            const videoRecord: RecalVideoRecord = {
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
              thumbnail_url: item.thumbnailLink || null,
              mime_type: item.mimeType || 'video/mp4',
              status: 'active',
              published_at: item.createdTime || new Date().toISOString(),
              created_at: item.createdTime || new Date().toISOString(),
              updated_at: item.modifiedTime || new Date().toISOString(),
              last_synced_at: new Date().toISOString(),
            };

            collectedVideos.push(videoRecord);
          }
        }
      }

      pageToken = response.data?.nextPageToken || undefined;
    } while (pageToken);
  }

  if (onProgress) onProgress('Starting deep scan of Recal Marketing folder tree...');
  await crawlFolder(ROOT_FOLDER_ID, 'Recal Marketing');

  if (onProgress) onProgress(`Crawl complete: Discovered ${collectedVideos.length} videos across ${totalFolders} folders.`);

  return {
    videos: collectedVideos,
    totalFoldersScanned: totalFolders,
  };
}
