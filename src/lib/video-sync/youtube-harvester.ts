import { google, youtube_v3 } from 'googleapis';
import { RecalVideoRecord } from '../supabase';
import { formatDuration, parseIsoDuration } from './formatters';
import { getYouTubeTokens, saveYouTubeTokens } from './token-store';

export function getOAuth2Client(redirectUri?: string) {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const defaultRedirect =
    process.env.NODE_ENV === 'production'
      ? 'https://assessment.recal.training/api/video-database/auth/callback'
      : 'http://localhost:3001/api/video-database/auth/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Missing YouTube OAuth Client ID or Client Secret.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri || defaultRedirect);
}

export async function harvestYouTubeVideos(
  onProgress?: (msg: string) => void
): Promise<{ videos: RecalVideoRecord[]; channelTitle: string; channelId: string }> {
  const tokens = await getYouTubeTokens();

  if (!tokens || (!tokens.refresh_token && !tokens.access_token)) {
    throw new Error('YOUTUBE_NOT_CONNECTED: YouTube Studio is not connected. Please authorize YouTube.');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  oauth2Client.on('tokens', async (newTokens) => {
    await saveYouTubeTokens({
      ...tokens,
      ...newTokens,
      updated_at: new Date().toISOString(),
    });
  });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  if (onProgress) onProgress('Fetching YouTube channel details...');

  // 1. Get channel details and uploads playlist ID
  const channelRes: { data: youtube_v3.Schema$ChannelListResponse } = await youtube.channels.list({
    part: ['snippet', 'contentDetails'],
    mine: true,
  });

  const channel = channelRes.data?.items?.[0];
  if (!channel) {
    throw new Error('No YouTube channel found for the authenticated account.');
  }

  const channelTitle = channel.snippet?.title || 'Recal Training';
  const channelId = channel.id || '';
  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error('Could not find uploads playlist for the YouTube channel.');
  }

  if (onProgress) onProgress(`Found channel: ${channelTitle}. Scanning all videos in uploads playlist...`);

  // 2. Fetch all playlist items (covers public, unlisted, and private videos)
  const videoIds: string[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const playlistRes: { data: youtube_v3.Schema$PlaylistItemListResponse } = await youtube.playlistItems.list({
      playlistId: uploadsPlaylistId,
      part: ['snippet', 'contentDetails'],
      maxResults: 50,
      pageToken,
    });

    const items = playlistRes.data?.items || [];
    for (const item of items) {
      const vid = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      if (vid) videoIds.push(vid);
    }

    pageToken = playlistRes.data?.nextPageToken || undefined;
  } while (pageToken);

  if (onProgress) onProgress(`Retrieved ${videoIds.length} video IDs. Fetching full video metadata...`);

  // 3. Batch fetch detailed metadata (up to 50 at a time)
  const collectedVideos: RecalVideoRecord[] = [];
  const chunkSize = 50;

  for (let i = 0; i < videoIds.length; i += chunkSize) {
    const chunk = videoIds.slice(i, i + chunkSize);
    const detailsRes: { data: youtube_v3.Schema$VideoListResponse } = await youtube.videos.list({
      id: chunk,
      part: ['snippet', 'contentDetails', 'statistics', 'status', 'liveStreamingDetails'],
    });

    const items = detailsRes.data?.items || [];
    for (const video of items) {
      if (!video.id) continue;

      const durationSec = video.contentDetails?.duration
        ? parseIsoDuration(video.contentDetails.duration)
        : 0;

      const privacy = (video.status?.privacyStatus as 'public' | 'unlisted' | 'private') || 'unlisted';
      const liveBroadcast = video.snippet?.liveBroadcastContent || 'none';
      const isLive = liveBroadcast === 'live';

      const thumbnails = video.snippet?.thumbnails;
      const thumbUrl =
        thumbnails?.maxres?.url ||
        thumbnails?.standard?.url ||
        thumbnails?.high?.url ||
        thumbnails?.medium?.url ||
        thumbnails?.default?.url ||
        null;

      const viewCount = video.statistics?.viewCount ? parseInt(video.statistics.viewCount, 10) : 0;

      collectedVideos.push({
        source: 'youtube',
        source_id: video.id,
        title: video.snippet?.title || 'Untitled YouTube Video',
        description: video.snippet?.description || null,
        privacy_status: privacy,
        is_live: isLive,
        live_broadcast_content: liveBroadcast,
        duration_seconds: durationSec,
        duration_formatted: formatDuration(durationSec),
        file_size_bytes: null,
        file_size_formatted: null,
        view_count: viewCount,
        folder_path: `YouTube Channel: ${channelTitle}`,
        direct_url: `https://www.youtube.com/watch?v=${video.id}`,
        thumbnail_url: thumbUrl,
        mime_type: 'video/youtube',
        status: 'active',
        published_at: video.snippet?.publishedAt || new Date().toISOString(),
        created_at: video.snippet?.publishedAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      });
    }
  }

  return {
    videos: collectedVideos,
    channelTitle,
    channelId,
  };
}
