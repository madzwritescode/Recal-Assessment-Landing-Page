import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Get environment variables
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!clientEmail || !privateKey || !sheetId) {
      console.error('Missing required environment variables');
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
    }

    // Parse request body
    const { firstName, lastName, email } = await request.json();

    if (!firstName || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create JWT auth client
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Create sheets API instance
    const sheets = google.sheets({ version: 'v4', auth });

    // Add the signup data to the "Landing Page Signups" tab
    const timestamp = new Date().toISOString();
    
    // Match your exact column structure: Timestamp, First Name, Last Name, Email
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Landing Page Signups!A:D',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[timestamp, firstName, lastName || '', email]]
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error recording landing signup:', error);
    return NextResponse.json({ error: 'Failed to record signup' }, { status: 500 });
  }
}

