import fs from 'fs';
import path from 'path';
import { supabase } from '../supabase';

const TOKEN_FILE = path.join(process.cwd(), '.youtube_tokens.json');

export interface StoredTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string | null;
  token_type?: string | null;
  expiry_date?: number | null;
  channel_id?: string | null;
  channel_title?: string | null;
  updated_at?: string;
}

export async function saveYouTubeTokens(tokens: StoredTokens): Promise<void> {
  // 1. Try to persist into Supabase (if table exists)
  try {
    await supabase.from('recal_settings').upsert({
      key: 'youtube_oauth_tokens',
      value: JSON.stringify(tokens),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not save tokens to Supabase recal_settings table:', err);
  }

  // 2. Also save to local file as guaranteed persistent store
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write local token file:', err);
  }
}

export async function getYouTubeTokens(): Promise<StoredTokens | null> {
  // 1. Try Supabase
  try {
    const { data } = await supabase
      .from('recal_settings')
      .select('value')
      .eq('key', 'youtube_oauth_tokens')
      .single();

    if (data?.value) {
      return JSON.parse(data.value);
    }
  } catch {
    // Ignore and fallback to file
  }

  // 2. Fallback to local file
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const content = fs.readFileSync(TOKEN_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed to read local token file:', err);
  }

  return null;
}

export async function deleteYouTubeTokens(): Promise<void> {
  // 1. Delete from Supabase
  try {
    await supabase.from('recal_settings').delete().eq('key', 'youtube_oauth_tokens');
  } catch (err) {
    console.warn('Could not delete tokens from Supabase recal_settings table:', err);
  }

  // 2. Delete local file
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      fs.unlinkSync(TOKEN_FILE);
    }
  } catch (err) {
    console.error('Failed to delete local token file:', err);
  }
}
