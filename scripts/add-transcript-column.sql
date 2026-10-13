-- Migration: Add transcript column and Full-Text Search index to recal_videos
ALTER TABLE public.recal_videos 
ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Create GIN index for ultra-fast full-text search across title, description, and transcript
CREATE INDEX IF NOT EXISTS idx_recal_videos_fts ON public.recal_videos 
USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(transcript, '')));
