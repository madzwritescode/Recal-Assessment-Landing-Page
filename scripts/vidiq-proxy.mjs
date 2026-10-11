#!/usr/bin/env node

/**
 * VidIQ MCP Stdio Proxy Server
 * 
 * Provides a local Model Context Protocol (stdio) interface to the official
 * vidIQ remote MCP endpoint (https://mcp.vidiq.com/mcp) with Bearer token authentication.
 */

import readline from 'readline';

const VIDIQ_ENDPOINT = 'https://mcp.vidiq.com/mcp';
const VIDIQ_API_KEY = process.env.VIDIQ_API_KEY || 'vidiq_ii7QOdnF6Pps_JJtPDwAbXYHPq5yNcG9AzQ3aVdT';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

async function forwardToVidIQ(message) {
  try {
    const res = await fetch(VIDIQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VIDIQ_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify(message)
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        jsonrpc: '2.0',
        id: message.id ?? null,
        error: {
          code: -32603,
          message: `VidIQ HTTP error ${res.status}: ${res.statusText}`,
          data: errText
        }
      };
    }

    const text = await res.text();
    // Parse SSE lines
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          return JSON.parse(line.slice(6));
        } catch (e) {
          // Continue searching
        }
      }
    }

    // Fallback: Check if response is raw JSON
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch (err) {
    return {
      jsonrpc: '2.0',
      id: message.id ?? null,
      error: {
        code: -32603,
        message: `Network error calling VidIQ: ${err.message}`
      }
    };
  }
}

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let message;
  try {
    message = JSON.parse(trimmed);
  } catch (err) {
    process.stderr.write(`[vidiq-proxy] Failed to parse JSON-RPC line: ${err.message}\n`);
    return;
  }

  // If this is a notification (no id property), send without waiting for reply
  if (message.id === undefined || message.id === null) {
    forwardToVidIQ(message).catch(err => {
      process.stderr.write(`[vidiq-proxy] Error in notification: ${err.message}\n`);
    });
    return;
  }

  // Forward request and write result back to stdout
  const response = await forwardToVidIQ(message);
  if (response) {
    process.stdout.write(JSON.stringify(response) + '\n');
  }
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
