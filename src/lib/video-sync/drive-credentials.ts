import { google, drive_v3 } from 'googleapis';
import { supabase } from '../supabase';

export interface GoogleDriveCredentials {
  clientEmail: string;
  privateKey: string;
  folderId: string;
}

export async function getGoogleDriveCredentials(): Promise<GoogleDriveCredentials | null> {
  // 1. Check environment variables
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return {
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      folderId: process.env.GOOGLE_DRIVE_MARKETING_FOLDER_ID || '1SIHLo8DE7_YBXhxglXcAtfo8Ga8c_xp-',
    };
  }

  // 2. Fallback to Supabase recal_settings table
  try {
    const { data, error } = await supabase
      .from('recal_settings')
      .select('value')
      .eq('key', 'google_drive_credentials')
      .maybeSingle();

    if (!error && data?.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replace(/\\n/g, '\n'),
          folderId: parsed.folder_id || '1SIHLo8DE7_YBXhxglXcAtfo8Ga8c_xp-',
        };
      }
    }
  } catch (err) {
    console.warn('Failed to fetch google_drive_credentials from recal_settings:', err);
  }

  return null;
}

export async function getDriveClient(): Promise<drive_v3.Drive> {
  const creds = await getGoogleDriveCredentials();
  if (!creds) {
    throw new Error('Missing Google Service Account credentials (not found in env or database).');
  }

  const auth = new google.auth.JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
}
