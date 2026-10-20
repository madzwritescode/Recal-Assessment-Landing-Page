import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  VideoAnnotation,
  formatSecondsToTimestamp as formatTimestamp,
} from '@/lib/video-sync/annotations';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const SETTINGS_KEY = 'video_annotations_v1';

async function loadAllAnnotations(): Promise<VideoAnnotation[]> {
  try {
    const { data, error } = await supabase
      .from('recal_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    if (error || !data?.value) {
      return [];
    }

    const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    if (Array.isArray(parsed)) {
      return parsed.map((item: VideoAnnotation) => {
        if (
          item.end_seconds !== null &&
          item.end_seconds !== undefined &&
          item.end_seconds <= item.start_seconds
        ) {
          const fixedEnd = item.start_seconds + 30;
          return {
            ...item,
            end_seconds: fixedEnd,
            end_formatted: formatTimestamp(fixedEnd),
          };
        }
        return item;
      });
    }
    return [];
  } catch (err) {
    console.error('Error loading video annotations from Supabase:', err);
    return [];
  }
}

async function saveAllAnnotations(annotations: VideoAnnotation[]): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from('recal_settings').upsert({
      key: SETTINGS_KEY,
      value: JSON.stringify(annotations),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return { error: error.message };
    }
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to save annotations' };
  }
}

// GET /api/video-database/annotations?videoId=...&status=...&topic=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');
    const status = searchParams.get('status');
    const topic = searchParams.get('topic');
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    let annotations = await loadAllAnnotations();

    if (videoId) {
      annotations = annotations.filter((a) => a.video_source_id === videoId);
      // Sort by start timestamp ascending for a single video
      annotations.sort((a, b) => a.start_seconds - b.start_seconds);
    } else {
      // Sort newest first for global view
      annotations.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    if (status && status !== 'all') {
      annotations = annotations.filter((a) => a.status === status);
    }

    if (topic && topic !== 'all') {
      annotations = annotations.filter(
        (a) => a.topic.toLowerCase() === topic.toLowerCase()
      );
    }

    if (search) {
      annotations = annotations.filter(
        (a) =>
          a.comment.toLowerCase().includes(search) ||
          a.topic.toLowerCase().includes(search) ||
          a.video_title.toLowerCase().includes(search) ||
          (a.used_for && a.used_for.toLowerCase().includes(search)) ||
          (a.author && a.author.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      annotations,
      total: annotations.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch annotations' },
      { status: 500 }
    );
  }
}

// POST /api/video-database/annotations — Create a new annotation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      video_source_id,
      video_source,
      video_title,
      video_folder_path,
      video_direct_url,
      video_thumbnail_url,
      start_seconds,
      end_seconds,
      topic,
      comment,
      author,
      status,
      used_for,
    } = body;

    if (!video_source_id || !comment || !comment.trim()) {
      return NextResponse.json(
        { error: 'video_source_id and comment are required' },
        { status: 400 }
      );
    }

    const startSec = Math.max(0, Number(start_seconds) || 0);
    let endSec: number | null = null;
    if (end_seconds !== undefined && end_seconds !== null && end_seconds !== '') {
      const parsedEnd = Number(end_seconds);
      if (!isNaN(parsedEnd) && parsedEnd > startSec) {
        endSec = parsedEnd;
      } else if (!isNaN(parsedEnd) && parsedEnd > 0 && parsedEnd <= startSec) {
        return NextResponse.json(
          {
            error: `End time (${formatTimestamp(parsedEnd)}) must be after Start time (${formatTimestamp(startSec)}).`,
          },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();
    const newAnnotation: VideoAnnotation = {
      id: crypto.randomUUID(),
      video_source_id: String(video_source_id),
      video_source: video_source === 'youtube' ? 'youtube' : 'gdrive',
      video_title: String(video_title || 'Untitled Video'),
      video_folder_path: video_folder_path || null,
      video_direct_url: String(video_direct_url || ''),
      video_thumbnail_url: video_thumbnail_url || null,
      start_seconds: startSec,
      start_formatted: formatTimestamp(startSec),
      end_seconds: endSec,
      end_formatted: endSec !== null ? formatTimestamp(endSec) : null,
      topic: String(topic || 'General').trim() || 'General',
      comment: String(comment).trim(),
      author: String(author || 'Anthony').trim() || 'Anthony',
      status:
        status === 'used' || status === 'in_progress' ? status : 'unused',
      used_for: used_for ? String(used_for).trim() : null,
      created_at: now,
      updated_at: now,
    };

    const existing = await loadAllAnnotations();
    const updated = [newAnnotation, ...existing];
    const { error } = await saveAllAnnotations(updated);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      annotation: newAnnotation,
      annotations: updated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create annotation' },
      { status: 500 }
    );
  }
}

// PATCH /api/video-database/annotations — Update status, comment, topic, timestamps, or used_for
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      status,
      comment,
      topic,
      start_seconds,
      end_seconds,
      used_for,
      author,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Annotation id is required' }, { status: 400 });
    }

    const existing = await loadAllAnnotations();
    const idx = existing.findIndex((a) => a.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    const current = existing[idx];
    const nextStart =
      start_seconds !== undefined ? Math.max(0, Number(start_seconds) || 0) : current.start_seconds;
    let nextEnd = current.end_seconds;
    if (end_seconds !== undefined) {
      if (end_seconds === null || end_seconds === '') {
        nextEnd = null;
      } else {
        const parsedEnd = Number(end_seconds);
        if (!isNaN(parsedEnd) && parsedEnd > nextStart) {
          nextEnd = parsedEnd;
        } else {
          return NextResponse.json(
            {
              error: `End time (${formatTimestamp(parsedEnd)}) must be after Start time (${formatTimestamp(nextStart)}).`,
            },
            { status: 400 }
          );
        }
      }
    }

    const updatedItem: VideoAnnotation = {
      ...current,
      status:
        status === 'unused' || status === 'in_progress' || status === 'used'
          ? status
          : current.status,
      comment: comment !== undefined ? String(comment).trim() : current.comment,
      topic: topic !== undefined ? String(topic).trim() : current.topic,
      author: author !== undefined ? String(author).trim() : current.author,
      used_for:
        used_for !== undefined
          ? used_for
            ? String(used_for).trim()
            : null
          : current.used_for,
      start_seconds: nextStart,
      start_formatted: formatTimestamp(nextStart),
      end_seconds: nextEnd,
      end_formatted: nextEnd !== null && nextEnd !== undefined ? formatTimestamp(nextEnd) : null,
      updated_at: new Date().toISOString(),
    };

    existing[idx] = updatedItem;
    const { error } = await saveAllAnnotations(existing);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      annotation: updatedItem,
      annotations: existing,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update annotation' },
      { status: 500 }
    );
  }
}

// DELETE /api/video-database/annotations?id=...
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {
        // ignore body parse error
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Annotation id is required' }, { status: 400 });
    }

    const existing = await loadAllAnnotations();
    const filtered = existing.filter((a) => a.id !== id);

    if (filtered.length === existing.length) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    const { error } = await saveAllAnnotations(filtered);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedId: id,
      annotations: filtered,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete annotation' },
      { status: 500 }
    );
  }
}
