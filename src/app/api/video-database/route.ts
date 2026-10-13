import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const source = searchParams.get('source') || 'all';
    const privacy = searchParams.get('privacy') || 'all';
    const isLive = searchParams.get('is_live') || 'all';
    const duration = searchParams.get('duration') || 'all';
    const sort = searchParams.get('sort') || 'newest';
    const status = searchParams.get('status') || 'active';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '50', 10)));

    const searchMode = searchParams.get('search_mode') || 'all'; // 'all', 'metadata', 'transcript'

    let query = supabase.from('recal_videos').select('*', { count: 'exact' });

    // Status filter (active, deleted, etc.)
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Source filter (youtube vs gdrive)
    if (source !== 'all') {
      query = query.eq('source', source);
    }

    // Privacy filter (unlisted, public, private)
    if (privacy !== 'all') {
      query = query.eq('privacy_status', privacy);
    }

    // Live broadcast filter
    if (isLive === 'true') {
      query = query.eq('is_live', true);
    } else if (isLive === 'false') {
      query = query.eq('is_live', false);
    }

    // Duration filter
    if (duration === 'short') {
      // Under 60 seconds (Shorts / Reels)
      query = query.gt('duration_seconds', 0).lte('duration_seconds', 60);
    } else if (duration === 'medium') {
      // 1 - 20 minutes
      query = query.gt('duration_seconds', 60).lte('duration_seconds', 1200);
    } else if (duration === 'long') {
      // 20 - 60 minutes
      query = query.gt('duration_seconds', 1200).lte('duration_seconds', 3600);
    } else if (duration === 'extended') {
      // 1 hour+ (Webinars, long workshops)
      query = query.gt('duration_seconds', 3600);
    }

    // Search query across title, description, folder_path, and spoken transcript
    if (search.trim()) {
      const term = `%${search.trim()}%`;
      if (searchMode === 'transcript') {
        query = query.ilike('transcript', term);
      } else if (searchMode === 'metadata') {
        query = query.or(`title.ilike.${term},folder_path.ilike.${term},description.ilike.${term}`);
      } else {
        query = query.or(`title.ilike.${term},folder_path.ilike.${term},description.ilike.${term},transcript.ilike.${term}`);
      }
    }

    // Sorting
    switch (sort) {
      case 'oldest':
        query = query.order('published_at', { ascending: true, nullsFirst: false });
        break;
      case 'views_desc':
        query = query.order('view_count', { ascending: false, nullsFirst: false });
        break;
      case 'duration_desc':
        query = query.order('duration_seconds', { ascending: false, nullsFirst: false });
        break;
      case 'duration_asc':
        query = query.order('duration_seconds', { ascending: true, nullsFirst: false });
        break;
      case 'size_desc':
        query = query.order('file_size_bytes', { ascending: false, nullsFirst: false });
        break;
      case 'title_asc':
        query = query.order('title', { ascending: true });
        break;
      case 'newest':
      default:
        query = query.order('published_at', { ascending: false, nullsFirst: false });
        break;
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    let { data: videos, count, error } = await query;

    // Graceful fallback if transcript column does not exist yet
    if (error && error.message.toLowerCase().includes('transcript')) {
      console.warn('Transcript column pending migration, falling back to metadata search.');
      let fallbackQuery = supabase.from('recal_videos').select('*', { count: 'exact' });
      if (status !== 'all') fallbackQuery = fallbackQuery.eq('status', status);
      if (source !== 'all') fallbackQuery = fallbackQuery.eq('source', source);
      if (privacy !== 'all') fallbackQuery = fallbackQuery.eq('privacy_status', privacy);
      if (isLive === 'true') fallbackQuery = fallbackQuery.eq('is_live', true);
      else if (isLive === 'false') fallbackQuery = fallbackQuery.eq('is_live', false);
      if (search.trim()) {
        const term = `%${search.trim()}%`;
        fallbackQuery = fallbackQuery.or(`title.ilike.${term},folder_path.ilike.${term},description.ilike.${term}`);
      }
      const fallbackRes = await fallbackQuery.order('published_at', { ascending: false }).range(from, to);
      videos = fallbackRes.data;
      count = fallbackRes.count;
      error = fallbackRes.error;
    }

    if (error) {
      console.error('Error fetching videos from Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich results with transcript highlight snippets
    const enrichedVideos = (videos || []).map((v: Record<string, unknown>) => {
      let matchSnippet: string | null = null;
      if (search.trim() && typeof v.transcript === 'string') {
        const queryTerm = search.trim().toLowerCase();
        const transcriptLower = v.transcript.toLowerCase();
        const idx = transcriptLower.indexOf(queryTerm);
        if (idx !== -1) {
          const start = Math.max(0, idx - 60);
          const end = Math.min(v.transcript.length, idx + queryTerm.length + 80);
          const prefix = start > 0 ? '...' : '';
          const suffix = end < v.transcript.length ? '...' : '';
          matchSnippet = `${prefix}${v.transcript.slice(start, end).trim()}${suffix}`;
        }
      }
      return {
        ...v,
        transcript_match_snippet: matchSnippet,
        has_transcript: Boolean(v.transcript),
      };
    });

    // Calculate Exact Counts across all active records
    const [
      totalCountRes,
      driveCountRes,
      ytCountRes,
      unlistedCountRes,
      publicCountRes,
      privateCountRes,
      liveCountRes,
    ] = await Promise.all([
      supabase.from('recal_videos').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('recal_videos').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('source', 'gdrive'),
      supabase.from('recal_videos').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('source', 'youtube'),
      supabase.from('recal_videos').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('privacy_status', 'unlisted'),
      supabase.from('recal_videos').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('privacy_status', 'public'),
      supabase.from('recal_videos').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('privacy_status', 'private'),
      supabase.from('recal_videos').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('is_live', true),
    ]);

    // Fetch all active records without the 1000 limit for exact duration and file size sums
    const { data: allActiveStats } = await supabase
      .from('recal_videos')
      .select('duration_seconds, file_size_bytes, view_count')
      .eq('status', 'active')
      .range(0, 10000);

    let totalDurationSeconds = 0;
    let totalFileSizeBytes = 0;
    let totalViews = 0;

    if (allActiveStats) {
      for (const row of allActiveStats) {
        if (row.duration_seconds) totalDurationSeconds += row.duration_seconds;
        if (row.file_size_bytes) totalFileSizeBytes += row.file_size_bytes;
        if (row.view_count) totalViews += row.view_count;
      }
    }

    return NextResponse.json({
      videos: enrichedVideos || [],
      pagination: {
        page,
        limit,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      stats: {
        total: totalCountRes.count || (allActiveStats?.length || 0),
        youtube: ytCountRes.count || 0,
        drive: driveCountRes.count || 0,
        unlisted: unlistedCountRes.count || 0,
        public: publicCountRes.count || 0,
        private: privateCountRes.count || 0,
        live: liveCountRes.count || 0,
        totalDurationSeconds,
        totalFileSizeBytes,
        totalViews,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
