import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get environment variables
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!clientEmail || !privateKey || !sheetId) {
      console.error('Missing required environment variables');
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
    }

    // Create JWT auth client
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    // Create sheets API instance
    const sheets = google.sheets({ version: 'v4', auth });

    // Get data from columns A, B (timestamp and first name)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'A:B', // Columns A and B
    });

    // Get goals from column K separately
    const goalsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'K:K', // Column K (goals)
    });

    const rows = response.data.values;
    const goalsRows = goalsResponse.data.values;
    
    if (!rows || rows.length === 0) {
      return NextResponse.json({ names: [] });
    }

    // Remove header row and get last 5 entries with names and goals
    const allEntries = rows
      .slice(1) // Remove header
      .map((row, index) => ({
        name: row[1]?.trim(), // Get second column value (first name)
        goal: goalsRows && goalsRows[index + 1] ? goalsRows[index + 1][0]?.trim() : '' // Get corresponding goal from column K
      }))
      .filter(entry => entry.name && entry.name.length > 0); // Filter out empty names

    // Get last 5 entries for testimonials
    const entries = allEntries.slice(-5);
    const names = entries.map(entry => entry.name);
    const goals = entries.map(entry => entry.goal);
    
    // Get total count of all entries
    const totalCount = allEntries.length;

    return NextResponse.json({ names, totalCount, goals });

  } catch (error) {
    console.error('Error fetching signups:', error);
    return NextResponse.json({ error: 'Failed to fetch signups' }, { status: 500 });
  }
}
