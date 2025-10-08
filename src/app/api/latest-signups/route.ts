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

    // Get data from columns A and B (timestamp and first name)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'A:B', // Columns A and B
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      return NextResponse.json({ names: [] });
    }

    // Remove header row and get last 5 names from column B (second column)
    const allNames = rows
      .slice(1) // Remove header
      .map(row => row[1]?.trim()) // Get second column value (first name)
      .filter(name => name && name.length > 0); // Filter out empty values

    // Get last 5 names for testimonials
    const names = allNames.slice(-5);
    
    // Get total count of all entries
    const totalCount = allNames.length;

    return NextResponse.json({ names, totalCount });

  } catch (error) {
    console.error('Error fetching signups:', error);
    return NextResponse.json({ error: 'Failed to fetch signups' }, { status: 500 });
  }
}
