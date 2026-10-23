import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ffplovqjoadirzfeaela.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder-key-for-build-step';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface TranscriptMatchHit {
  timestamp_seconds: number;
  timestamp_formatted: string;
  is_exact: boolean;
  snippet: string;
}

export interface RecalVideoRecord {
  id?: string;
  source: 'youtube' | 'gdrive';
  source_id: string;
  title: string;
  description?: string | null;
  transcript?: string | null;
  transcript_match_snippet?: string | null;
  transcript_matches?: TranscriptMatchHit[];
  has_transcript?: boolean;
  privacy_status: 'public' | 'unlisted' | 'private' | 'draft';
  is_live: boolean;
  live_broadcast_content?: string | null;
  duration_seconds: number;
  duration_formatted?: string | null;
  file_size_bytes?: number | null;
  file_size_formatted?: string | null;
  view_count?: number;
  folder_path?: string | null;
  direct_url: string;
  thumbnail_url?: string | null;
  mime_type?: string | null;
  status: 'active' | 'deleted' | 'moved';
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  last_synced_at?: string;
}
