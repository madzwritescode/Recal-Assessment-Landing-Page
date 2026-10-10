import { supabase } from '../supabase';
import { harvestGoogleDriveVideos } from './drive-harvester';
import { harvestYouTubeVideos } from './youtube-harvester';
import { getYouTubeTokens } from './token-store';

export interface SyncReport {
  success: boolean;
  drive: {
    scannedFolders: number;
    totalVideos: number;
    upserted: number;
    deletedDetected: number;
    error?: string;
  };
  youtube: {
    connected: boolean;
    channelTitle?: string;
    totalVideos: number;
    upserted: number;
    deletedDetected: number;
    error?: string;
  };
  totalVideosInDatabase: number;
  durationMs: number;
  syncedAt: string;
}

export async function runFullVideoSync(
  onProgress?: (step: string) => void
): Promise<SyncReport> {
  const startTime = Date.now();
  const report: SyncReport = {
    success: true,
    drive: { scannedFolders: 0, totalVideos: 0, upserted: 0, deletedDetected: 0 },
    youtube: { connected: false, totalVideos: 0, upserted: 0, deletedDetected: 0 },
    totalVideosInDatabase: 0,
    durationMs: 0,
    syncedAt: new Date().toISOString(),
  };

  // 1. Sync Google Drive
  const hasDriveCreds = Boolean(
    process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
  );

  if (!hasDriveCreds) {
    report.drive.error = 'Google Drive skipped: Missing Service Account credentials in environment variables.';
    if (onProgress) onProgress('Google Drive credentials not found; skipping Drive scan.');
  } else {
    try {
      if (onProgress) onProgress('Starting Google Drive scan...');
      const driveResult = await harvestGoogleDriveVideos(onProgress);
      report.drive.scannedFolders = driveResult.totalFoldersScanned;
      report.drive.totalVideos = driveResult.videos.length;

      if (driveResult.videos.length > 0) {
        if (onProgress) onProgress(`Upserting ${driveResult.videos.length} Drive videos into database...`);

        // Upsert in batches of 50
        const batchSize = 50;
        for (let i = 0; i < driveResult.videos.length; i += batchSize) {
          const batch = driveResult.videos.slice(i, i + batchSize);
          const { error } = await supabase
            .from('recal_videos')
            .upsert(batch, { onConflict: 'source_id' });

          if (error) {
            console.error('Error upserting Drive batch:', error);
            report.drive.error = error.message;
          } else {
            report.drive.upserted += batch.length;
          }
        }

        // Detect deleted Google Drive files
        const activeDriveIds = driveResult.videos.map((v) => v.source_id);
        const { data: existingDriveVideos } = await supabase
          .from('recal_videos')
          .select('source_id')
          .eq('source', 'gdrive')
          .eq('status', 'active');

        if (existingDriveVideos) {
          const deletedIds = existingDriveVideos
            .filter((v) => !activeDriveIds.includes(v.source_id))
            .map((v) => v.source_id);

          if (deletedIds.length > 0) {
            await supabase
              .from('recal_videos')
              .update({ status: 'deleted', updated_at: new Date().toISOString() })
              .in('source_id', deletedIds);
            report.drive.deletedDetected = deletedIds.length;
          }
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Drive sync failed';
      console.error('Google Drive sync error:', err);
      report.drive.error = errorMsg;
    }
  }

  // 2. Sync YouTube Studio
  try {
    const tokens = await getYouTubeTokens();
    if (tokens && (tokens.refresh_token || tokens.access_token)) {
      report.youtube.connected = true;
      if (onProgress) onProgress('Starting YouTube Studio scan...');

      const ytResult = await harvestYouTubeVideos(onProgress);
      report.youtube.channelTitle = ytResult.channelTitle;
      report.youtube.totalVideos = ytResult.videos.length;

      if (ytResult.videos.length > 0) {
        if (onProgress) onProgress(`Upserting ${ytResult.videos.length} YouTube videos into database...`);

        const batchSize = 50;
        for (let i = 0; i < ytResult.videos.length; i += batchSize) {
          const batch = ytResult.videos.slice(i, i + batchSize);
          const { error } = await supabase
            .from('recal_videos')
            .upsert(batch, { onConflict: 'source_id' });

          if (error) {
            console.error('Error upserting YouTube batch:', error);
            report.youtube.error = error.message;
          } else {
            report.youtube.upserted += batch.length;
          }
        }

        // Detect deleted YouTube videos
        const activeYtIds = ytResult.videos.map((v) => v.source_id);
        const { data: existingYtVideos } = await supabase
          .from('recal_videos')
          .select('source_id')
          .eq('source', 'youtube')
          .eq('status', 'active');

        if (existingYtVideos) {
          const deletedYtIds = existingYtVideos
            .filter((v) => !activeYtIds.includes(v.source_id))
            .map((v) => v.source_id);

          if (deletedYtIds.length > 0) {
            await supabase
              .from('recal_videos')
              .update({ status: 'deleted', updated_at: new Date().toISOString() })
              .in('source_id', deletedYtIds);
            report.youtube.deletedDetected = deletedYtIds.length;
          }
        }
      }
    } else {
      report.youtube.connected = false;
      report.youtube.error = 'YouTube account not yet authorized.';
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'YouTube sync failed';
    console.error('YouTube sync error:', err);
    report.youtube.error = errorMsg;
  }

  // 3. Count total active videos in DB
  const { count } = await supabase
    .from('recal_videos')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  report.totalVideosInDatabase = count || 0;
  report.durationMs = Date.now() - startTime;

  const driveOk = hasDriveCreds && !report.drive.error;
  const ytOk = report.youtube.connected && !report.youtube.error;

  // Sync is considered successful if at least one service completed successfully,
  // or if both were handled without fatal errors
  report.success = driveOk || ytOk;

  return report;
}
