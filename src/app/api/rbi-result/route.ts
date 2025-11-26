import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const normalize = (value?: string) => value?.trim().toLowerCase() ?? '';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const dataRange = process.env.GOOGLE_RBI_RESULTS_RANGE || 'Form Responses 1!A:O';
    const emailHeader = process.env.GOOGLE_RBI_EMAIL_HEADER || 'Email';
    const scoreHeader = process.env.GOOGLE_RBI_SCORE_HEADER || 'Calculated Summit-Ready Score';
    const gradeHeader = process.env.GOOGLE_RBI_GRADE_HEADER || 'Calculated Grade';
    const badgeHeader = process.env.GOOGLE_RBI_BADGE_HEADER || 'Calculated Badge';

    if (!clientEmail || !privateKey || !sheetId) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: dataRange,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ score: null, grade: null, badge: null });
    }

    const header = rows[0];
    const findIndex = (label: string) =>
      header.findIndex((cell) => normalize(cell) === normalize(label));

    const emailIdx = findIndex(emailHeader);
    const scoreIdx = findIndex(scoreHeader);
    const gradeIdx = findIndex(gradeHeader);
    const badgeIdx = findIndex(badgeHeader);

    if (emailIdx === -1) {
      return NextResponse.json({ error: 'Email column not found' }, { status: 500 });
    }

    for (let i = rows.length - 1; i >= 1; i--) {
      const row = rows[i];
      if (normalize(row[emailIdx]) === normalize(email)) {
        return NextResponse.json({
          score: scoreIdx >= 0 ? row[scoreIdx] ?? null : null,
          grade: gradeIdx >= 0 ? row[gradeIdx] ?? null : null,
          badge: badgeIdx >= 0 ? row[badgeIdx] ?? null : null,
        });
      }
    }

    return NextResponse.json({ score: null, grade: null, badge: null });
  } catch (error) {
    console.error('Error fetching RBI result:', error);
    return NextResponse.json({ error: 'Failed to fetch RBI result' }, { status: 500 });
  }
}

