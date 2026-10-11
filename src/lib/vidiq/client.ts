/**
 * vidIQ Client & MCP Bridge for Recal Training
 * 
 * Interacts with the official vidIQ MCP API endpoint (https://mcp.vidiq.com/mcp)
 * using the configured API key and connects with Supabase video database.
 */

const VIDIQ_ENDPOINT = 'https://mcp.vidiq.com/mcp';

export interface VidIQToolCallResponse<T = unknown> {
  result?: {
    content?: Array<{ type: string; text?: string }>;
    structuredContent?: T;
    _meta?: Record<string, unknown>;
  };
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface VidIQBalance {
  type: string;
  totalCredits: number;
  renewableCredits: number;
  maxRenewableCredits: number;
  renewableResetsAt: string;
  addOnCredits: number;
  maxAddOnCredits: number;
  planName?: string;
}

export interface VidIQUserChannel {
  channelId: string;
  title?: string;
  subscriberCount?: number;
}

export interface VidIQVideoItem {
  videoId: string;
  title: string;
  tags?: string[];
  privacyStatus: string;
  uploadStatus: string;
  publishedAt: string;
  scheduledPublishAt?: string | null;
  videoType: 'long' | 'short';
  duration: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

/**
 * Execute a low-level tool call against the vidIQ MCP API
 */
export async function callVidIQTool<T = unknown>(
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<VidIQToolCallResponse<T>> {
  const apiKey = process.env.VIDIQ_API_KEY || 'vidiq_ii7QOdnF6Pps_JJtPDwAbXYHPq5yNcG9AzQ3aVdT';

  if (!apiKey) {
    throw new Error('VIDIQ_API_KEY is not set in environment.');
  }

  const res = await fetch(VIDIQ_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`vidIQ API responded with status ${res.status}: ${errorText}`);
  }

  const text = await res.text();

  // Try parsing SSE data line
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        const parsed = JSON.parse(line.slice(6));
        return parsed;
      } catch {
        // Continue searching
      }
    }
  }

  // Fallback: raw JSON parse
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Failed to parse vidIQ response: ${text.slice(0, 200)}`);
  }
}

/**
 * Helper: Parse structuredContent or text content safely
 */
function extractStructured<T>(response: VidIQToolCallResponse<T>): T {
  if (response.error) {
    throw new Error(`vidIQ error [${response.error.code}]: ${response.error.message}`);
  }
  if (response.result?.structuredContent) {
    return response.result.structuredContent;
  }
  const text = response.result?.content?.[0]?.text;
  if (text) {
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }
  throw new Error('No structured or text payload returned from vidIQ tool.');
}

/**
 * Get current credits and plan information
 */
export async function getVidIQBalance(): Promise<VidIQBalance> {
  const res = await callVidIQTool<VidIQBalance>('vidiq_balance', {});
  return extractStructured(res);
}

/**
 * Get authorized YouTube channels
 */
export async function getVidIQUserChannels(): Promise<{ channels: VidIQUserChannel[] }> {
  const res = await callVidIQTool<{ channels: VidIQUserChannel[] }>('vidiq_user_channels', {});
  return extractStructured(res);
}

/**
 * Get videos for an authorized channel directly via vidIQ
 */
export async function getVidIQUserVideos(
  channelId: string,
  limit = 50,
  nextPageToken?: string
): Promise<{ channelId: string; videos: VidIQVideoItem[]; nextPageToken?: string }> {
  const args: Record<string, unknown> = { channelId, limit };
  if (nextPageToken) args.nextPageToken = nextPageToken;

  const res = await callVidIQTool<{
    channelId: string;
    videos: VidIQVideoItem[];
    nextPageToken?: string;
  }>('vidiq_user_videos', args);

  return extractStructured(res);
}

/**
 * Score a candidate title (0-100 score + recommendation)
 */
export async function scoreVidIQTitle(
  title: string,
  optionsOrVideoId:
    | string
    | {
        type?: 'long' | 'short';
        videoId?: string;
        channelId?: string;
      } = {}
) {
  const options =
    typeof optionsOrVideoId === 'string'
      ? { videoId: optionsOrVideoId }
      : optionsOrVideoId;

  const args: Record<string, unknown> = {
    title,
    type: options.type || 'long',
    channelId: options.channelId || process.env.VIDIQ_DEFAULT_CHANNEL_ID || 'UCoZzl3VZCgvwvPqT33KiMGQ',
  };
  if (options.videoId) args.videoId = options.videoId;
  const res = await callVidIQTool('vidiq_score_title', args);
  return extractStructured(res);
}

/**
 * Score a thumbnail URL
 */
export async function scoreVidIQThumbnail(thumbnailUrl: string, title?: string) {
  const args: Record<string, unknown> = { thumbnailUrl };
  if (title) args.title = title;
  const res = await callVidIQTool('vidiq_score_thumbnail', args);
  return extractStructured(res);
}

/**
 * Perform YouTube keyword research
 */
export async function researchVidIQKeywords(queryOrKeyword: string, mode = 'research') {
  const res = await callVidIQTool('vidiq_keyword_research', {
    keyword: queryOrKeyword,
    mode,
  });
  return extractStructured(res);
}

/**
 * Fetch video transcript for a YouTube video
 */
export async function getVidIQTranscript(videoId: string) {
  const res = await callVidIQTool('vidiq_video_transcript', { videoId });
  return extractStructured(res);
}

/**
 * Fetch historical and live stats for a YouTube video
 */
export async function getVidIQVideoStats(videoId: string) {
  const res = await callVidIQTool('vidiq_video_stats', { videoId });
  return extractStructured(res);
}

/**
 * Fetch competitor channels
 */
export async function getVidIQCompetitorChannels(channelId: string) {
  const res = await callVidIQTool('vidiq_similar_channels', { channelId });
  return extractStructured(res);
}
