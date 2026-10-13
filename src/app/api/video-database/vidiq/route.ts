import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  getVidIQBalance,
  getVidIQUserChannels,
  scoreVidIQTitle,
  scoreVidIQThumbnail,
  researchVidIQKeywords,
  getVidIQTranscript,
  getVidIQVideoStats,
  getVidIQOutliers,
  generateVidIQChapters,
  pollVidIQJob,
  callVidIQTool,
} from '@/lib/vidiq/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const defaultChannelId =
      process.env.VIDIQ_DEFAULT_CHANNEL_ID || 'UCoZzl3VZCgvwvPqT33KiMGQ';

    // 1. Fetch live balance from vidIQ
    let balance = null;
    let balanceError = null;
    try {
      balance = await getVidIQBalance();
    } catch (e) {
      balanceError = e instanceof Error ? e.message : String(e);
    }

    // 2. Fetch authorized channels
    let channels = null;
    try {
      channels = await getVidIQUserChannels();
    } catch {
      // ignore channel fetch error if balance succeeded
    }

    // 3. Check Supabase integration setting
    const { data: dbSettings } = await supabase
      .from('recal_settings')
      .select('*')
      .eq('key', 'vidiq_integration')
      .maybeSingle();

    let integrationData = null;
    if (dbSettings?.value) {
      try {
        integrationData = JSON.parse(dbSettings.value);
      } catch {
        integrationData = dbSettings.value;
      }
    }

    return NextResponse.json({
      connected: !balanceError,
      channelId: defaultChannelId,
      channelTitle: 'Recal Training',
      balance,
      channels: channels?.channels || [],
      error: balanceError,
      dbSettings: integrationData,
    });
  } catch (err) {
    console.error('Error in vidIQ API route:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'score_title': {
        const { title, videoId } = payload || {};
        if (!title) {
          return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }
        const result = await scoreVidIQTitle(title, videoId);
        return NextResponse.json({ result });
      }

      case 'generate_titles': {
        const { videoId, title } = payload || {};
        const result = await callVidIQTool('vidiq_generate_titles', { videoId, title });
        return NextResponse.json({ result });
      }

      case 'score_thumbnail': {
        const { thumbnailUrl, title } = payload || {};
        if (!thumbnailUrl) {
          return NextResponse.json({ error: 'thumbnailUrl is required' }, { status: 400 });
        }
        const result = await scoreVidIQThumbnail(thumbnailUrl, title);
        return NextResponse.json({ result });
      }

      case 'keywords': {
        const { query } = payload || {};
        if (!query) {
          return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }
        const result = await researchVidIQKeywords(query);
        return NextResponse.json({ result });
      }

      case 'transcript': {
        const { videoId } = payload || {};
        if (!videoId) {
          return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
        }
        const result = (await getVidIQTranscript(videoId)) as Record<string, unknown>;

        // Extract transcription string if present
        let transcriptionText: string | null = null;
        const resObj = result as {
          structuredContent?: { transcription?: string };
          transcription?: string;
          content?: Array<{ text?: string }>;
        };

        if (resObj?.structuredContent?.transcription) {
          transcriptionText = resObj.structuredContent.transcription;
        } else if (resObj?.transcription) {
          transcriptionText = resObj.transcription;
        } else if (resObj?.content?.[0]?.text) {
          try {
            const parsed = JSON.parse(resObj.content[0].text);
            transcriptionText = parsed.transcription || resObj.content[0].text;
          } catch {
            transcriptionText = resObj.content[0].text;
          }
        }

        // Auto-persist to Supabase so it becomes globally searchable for 0 future credits!
        if (transcriptionText) {
          try {
            await supabase
              .from('recal_videos')
              .update({ transcript: transcriptionText, updated_at: new Date().toISOString() })
              .eq('source_id', videoId);
          } catch (dbErr) {
            console.warn('Could not auto-save transcript to Supabase:', dbErr);
          }
        }

        return NextResponse.json({ result, savedToDb: Boolean(transcriptionText) });
      }

      case 'save_transcript': {
        const { videoId, transcript } = payload || {};
        if (!videoId || !transcript) {
          return NextResponse.json({ error: 'videoId and transcript are required' }, { status: 400 });
        }
        const { error } = await supabase
          .from('recal_videos')
          .update({ transcript, updated_at: new Date().toISOString() })
          .eq('source_id', videoId);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      case 'outliers': {
        const { keyword, limit, contentType, publishedWithin } = payload || {};
        const rawResult = (await getVidIQOutliers(keyword, {
          limit: limit ? parseInt(limit, 10) : 25,
          contentType: contentType || 'long',
          publishedWithin: publishedWithin || 'oneYear',
        })) as Record<string, unknown>;

        // Extract and normalize video list
        const rawVideos = (Array.isArray(rawResult?.videos) ? rawResult.videos : []) as Array<Record<string, unknown>>;

        // Strict Safety & Relevance filter (block NSFW, clickbait, adult, bikini, etc.)
        const unsafeRegex = /\b(porn|nsfw|sex|sexy|erotic|nude|naked|bikini|onlyfans|hot tub|swimsuit|babe|fetish|escort)\b/i;

        const sanitizedVideos = rawVideos
          .filter((v) => {
            const title = String(v.videoTitle || v.title || '');
            const tags = Array.isArray(v.videoTags) ? v.videoTags.join(' ') : '';
            return !unsafeRegex.test(title) && !unsafeRegex.test(tags);
          })
          .map((v) => ({
            ...v,
            videoId: v.videoId || v.id,
            title: v.videoTitle || v.title || 'Video',
            thumbnailUrl:
              v.videoThumbnail ||
              v.thumbnailUrl ||
              (v.videoId ? `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg` : ''),
            channelTitle: v.channelTitle || v.creatorTitle || 'Creator',
            viewCount: v.viewCount || v.views || 0,
            breakoutScore: Number(v.breakoutScore || v.outlierScore || 2.0),
            vph: Number(v.vph || v.viewsPerHour || 0),
          }));

        return NextResponse.json({
          result: {
            ...rawResult,
            videos: sanitizedVideos,
          },
        });
      }

      case 'generate_chapters': {
        const { videoId, chapterCount } = payload || {};
        if (!videoId) {
          return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
        }
        const result = await generateVidIQChapters(videoId, chapterCount || 6);
        return NextResponse.json({ result });
      }

      case 'poll_job': {
        const { mcpJobId } = payload || {};
        if (!mcpJobId) {
          return NextResponse.json({ error: 'mcpJobId is required' }, { status: 400 });
        }
        const result = await pollVidIQJob(mcpJobId);
        return NextResponse.json({ result });
      }

      case 'video_stats': {
        const { videoId } = payload || {};
        if (!videoId) {
          return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
        }
        const result = await getVidIQVideoStats(videoId);
        return NextResponse.json({ result });
      }

      case 'call_tool': {
        const { toolName, args } = payload || {};
        if (!toolName) {
          return NextResponse.json({ error: 'toolName is required' }, { status: 400 });
        }
        const result = await callVidIQTool(toolName, args || {});
        return NextResponse.json({ result });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error('Error executing vidIQ action:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error processing request' },
      { status: 500 }
    );
  }
}
