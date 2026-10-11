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
        const result = await getVidIQTranscript(videoId);
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
