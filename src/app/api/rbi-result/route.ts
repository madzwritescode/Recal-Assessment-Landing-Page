import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const normalize = (value?: string) => {
  if (!value) return '';
  // Remove all whitespace, convert to lowercase, and trim
  return value.toString().replace(/\s+/g, '').toLowerCase().trim();
};

const findColumnIndex = (headerRow: string[], labels: string[]) => {
  for (const label of labels) {
    const idx = headerRow.findIndex((cell) => normalize(cell) === normalize(label));
    if (idx !== -1) return idx;
  }
  // fallback: fuzzy match containing keywords
  const keyword = labels[0]?.split(' ')[0] ?? '';
  if (keyword) {
    const fuzzyIdx = headerRow.findIndex((cell) => normalize(cell).includes(normalize(keyword)));
    if (fuzzyIdx !== -1) return fuzzyIdx;
  }
  return -1;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const dataRange = process.env.GOOGLE_RBI_RESULTS_RANGE || 'Form Responses 1!A:O';
    const emailHeader = process.env.GOOGLE_RBI_EMAIL_HEADER || 'Email Address';
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
    const emailIdx = findColumnIndex(header, [emailHeader, 'Email Address', 'Email']);
    const scoreIdx = findColumnIndex(header, [scoreHeader]);
    const gradeIdx = findColumnIndex(header, [gradeHeader]);
    const badgeIdx = findColumnIndex(header, [badgeHeader]);

    if (emailIdx === -1) {
      return NextResponse.json({ error: 'Email column not found' }, { status: 500 });
    }

    const normalizedSearchEmail = normalize(email);
    
    // SIMPLIFIED APPROACH: Only check the LAST row (most recent submission)
    // This is the newest entry in the sheet - if it matches the user's email, it's their submission
    if (rows.length > 1) {
      const lastRow = rows[rows.length - 1];
      const lastRowEmail = normalize(lastRow[emailIdx] ?? '');
      
      const result = {
        score: scoreIdx >= 0 ? (lastRow[scoreIdx] ?? '').toString().trim() || null : null,
        grade: gradeIdx >= 0 ? (lastRow[gradeIdx] ?? '').toString().trim() || null : null,
        badge: badgeIdx >= 0 ? (lastRow[badgeIdx] ?? '').toString().trim() || null : null,
      };
      
      const hasCalculatedValues = !!(result.score || result.grade || result.badge);
      
      // If the last row email matches, this is the user's submission
      if (lastRowEmail === normalizedSearchEmail) {
        if (hasCalculatedValues) {
          // Email matches and has calculated values - return the result
          return NextResponse.json(result);
        } else {
          // Email matches but no calculated values yet - Apps Script still processing
          return NextResponse.json({ score: null, grade: null, badge: null });
        }
      } else {
        // Last row email doesn't match - either:
        // 1. Someone else just submitted (their row is now last)
        // 2. User's submission hasn't been written to sheet yet
        // Return null - don't search old rows to avoid returning stale data
        return NextResponse.json({ score: null, grade: null, badge: null });
      }
    }

    // No data rows
    return NextResponse.json({ score: null, grade: null, badge: null });
  } catch (error) {
    console.error('Error fetching RBI result:', error);
    return NextResponse.json({ error: 'Failed to fetch RBI result' }, { status: 500 });
  }
}
