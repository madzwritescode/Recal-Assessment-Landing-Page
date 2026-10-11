#!/usr/bin/env node

/**
 * VidIQ Database Sync & Enrichment Script
 * 
 * Bridges vidIQ MCP API with Supabase (recal_videos and recal_settings).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env.local
const envPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[match[1].trim()] = val;
    }
  });
}

const VIDIQ_ENDPOINT = 'https://mcp.vidiq.com/mcp';
const VIDIQ_API_KEY = process.env.VIDIQ_API_KEY || 'vidiq_ii7QOdnF6Pps_JJtPDwAbXYHPq5yNcG9AzQ3aVdT';
const CHANNEL_ID = process.env.VIDIQ_DEFAULT_CHANNEL_ID || 'UCoZzl3VZCgvwvPqT33KiMGQ';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ffplovqjoadirzfeaela.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  console.error('❌ Error: Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function callVidIQ(name, args = {}) {
  const res = await fetch(VIDIQ_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VIDIQ_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`VidIQ error [${res.status}]: ${text}`);
  }

  const text = await res.text();
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      if (data.result?.structuredContent) return data.result.structuredContent;
      if (data.result?.content?.[0]?.text) {
        try {
          return JSON.parse(data.result.content[0].text);
        } catch {
          return data.result.content[0].text;
        }
      }
    }
  }
  return null;
}

function parseDurationIso(iso) {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  return h * 3600 + m * 60 + s;
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n) => n.toString().padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

async function syncStatusToSettings() {
  console.log('⚡ Checking VidIQ account balance and channels...');
  const balance = await callVidIQ('vidiq_balance');
  const userChannels = await callVidIQ('vidiq_user_channels');

  console.log('📊 VidIQ Balance:', JSON.stringify(balance, null, 2));
  console.log('📺 Authorized Channels:', JSON.stringify(userChannels, null, 2));

  // Persist integration state in recal_settings table
  const integrationData = {
    connected: true,
    channel_id: CHANNEL_ID,
    channel_title: 'Recal Training',
    plan: balance?.planName || 'Boost',
    total_credits: balance?.totalCredits || 0,
    renewable_credits: balance?.renewableCredits || 0,
    resets_at: balance?.renewableResetsAt || null,
    connected_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('recal_settings').upsert({
    key: 'vidiq_integration',
    value: JSON.stringify(integrationData),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('❌ Failed to update recal_settings:', error.message);
  } else {
    console.log('✅ Successfully persisted VidIQ settings into Supabase database (recal_settings)!');
  }

  return integrationData;
}

async function harvestFromVidIQ() {
  console.log(`\n📥 Harvesting videos directly from VidIQ for channel: ${CHANNEL_ID}...`);
  let pageToken;
  let totalHarvested = 0;

  do {
    const res = await callVidIQ('vidiq_user_videos', {
      channelId: CHANNEL_ID,
      limit: 50,
      nextPageToken: pageToken,
    });

    const videos = res?.videos || [];
    if (videos.length === 0) break;

    const records = videos.map((v) => {
      const durSec = parseDurationIso(v.duration);
      return {
        source: 'youtube',
        source_id: v.videoId,
        title: v.title,
        description: null,
        privacy_status: v.privacyStatus || 'public',
        is_live: false,
        live_broadcast_content: 'none',
        duration_seconds: durSec,
        duration_formatted: formatDuration(durSec),
        file_size_bytes: null,
        file_size_formatted: null,
        view_count: v.viewCount || 0,
        folder_path: 'YouTube / Recal Training',
        direct_url: `https://www.youtube.com/watch?v=${v.videoId}`,
        thumbnail_url: v.thumbnailUrl || `https://i.ytimg.com/vi/${v.videoId}/maxresdefault.jpg`,
        mime_type: 'video/youtube',
        status: 'active',
        published_at: v.publishedAt || new Date().toISOString(),
        created_at: v.publishedAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from('recal_videos')
      .upsert(records, { onConflict: 'source_id' });

    if (error) {
      console.error('Error upserting batch to Supabase:', error.message);
    } else {
      totalHarvested += records.length;
      console.log(`   Upserted batch of ${records.length} videos (total: ${totalHarvested}).`);
    }

    pageToken = res?.nextPageToken;
  } while (pageToken);

  console.log(`🚀 Successfully synced ${totalHarvested} videos from VidIQ into recal_videos!`);
}

async function main() {
  const args = process.argv.slice(2);
  const doHarvest = args.includes('--harvest');

  try {
    await syncStatusToSettings();
    if (doHarvest) {
      await harvestFromVidIQ();
    }
  } catch (err) {
    console.error('Execution error:', err);
    process.exit(1);
  }
}

main();
