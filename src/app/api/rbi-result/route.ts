import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const normalize = (value?: string) => value?.trim().toLowerCase() ?? '';

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
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const dataRange = process.env.GOOGLE_RBI_RESULTS_RANGE || 'Form Responses 1!A:O';
    const emailHeader =
      process.env.GOOGLE_RBI_EMAIL_HEADER ||
      'Email Address';
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

    const emailIdx = findColumnIndex(header, [
      emailHeader,
      'Email Address',
      'Email',
    ]);
    const scoreIdx = findColumnIndex(header, [scoreHeader]);
    const gradeIdx = findColumnIndex(header, [gradeHeader]);
    const badgeIdx = findColumnIndex(header, [badgeHeader]);

    if (emailIdx === -1) {
      console.error('Email column not found. Headers:', header);
      return NextResponse.json({ error: 'Email column not found' }, { status: 500 });
    }

    if (scoreIdx === -1) {
      console.warn('Score column not found. Headers:', header, 'Looking for:', scoreHeader);
    }
    if (gradeIdx === -1) {
      console.warn('Grade column not found. Headers:', header, 'Looking for:', gradeHeader);
    }
    if (badgeIdx === -1) {
      console.warn('Badge column not found. Headers:', header, 'Looking for:', badgeHeader);
    }

    const normalizedSearchEmail = normalize(email);
    console.log('Searching for email:', normalizedSearchEmail, 'in', rows.length - 1, 'rows');
    console.log('Column indices - Email:', emailIdx, 'Score:', scoreIdx, 'Grade:', gradeIdx, 'Badge:', badgeIdx);

    // Search from bottom to top to get the most recent entry
    let foundMatch = false;
    for (let i = rows.length - 1; i >= 1; i--) {
      const row = rows[i];
      const rowEmail = normalize(row[emailIdx] ?? '');
      
      if (rowEmail === normalizedSearchEmail) {
        const result = {
          score: scoreIdx >= 0 ? (row[scoreIdx] ?? '').toString().trim() || null : null,
          grade: gradeIdx >= 0 ? (row[gradeIdx] ?? '').toString().trim() || null : null,
          badge: badgeIdx >= 0 ? (row[badgeIdx] ?? '').toString().trim() || null : null,
        };
        
        console.log('Found matching row at index', i, 'Result:', result);
        console.log('Raw row values - Score cell:', row[scoreIdx], 'Grade cell:', row[gradeIdx], 'Badge cell:', row[badgeIdx]);
        foundMatch = true;
        return NextResponse.json(result);
      }
    }

    // If no email match found, try to get the last row as fallback (most recent submission)
    // This is a fallback in case email matching fails but we know the last row is the new submission
    if (!foundMatch && rows.length > 1) {
      const lastRow = rows[rows.length - 1];
      const lastRowEmail = normalize(lastRow[emailIdx] ?? '');
      console.warn('No email match found. Using last row as fallback. Last row email:', lastRowEmail, 'Searching for:', normalizedSearchEmail);
      
      const fallbackResult = {
        score: scoreIdx >= 0 ? (lastRow[scoreIdx] ?? '').toString().trim() || null : null,
        grade: gradeIdx >= 0 ? (lastRow[gradeIdx] ?? '').toString().trim() || null : null,
        badge: badgeIdx >= 0 ? (lastRow[badgeIdx] ?? '').toString().trim() || null : null,
      };
      
      // Only return fallback if it has at least one non-empty value
      if (fallbackResult.score || fallbackResult.grade || fallbackResult.badge) {
        console.log('Returning fallback result from last row:', fallbackResult);
        return NextResponse.json(fallbackResult);
      }
    }

    console.warn('No matching email found and fallback also failed. Searched email:', normalizedSearchEmail);
    // Log a few sample emails from the sheet for debugging
    if (rows.length > 1) {
      const sampleEmails = rows.slice(Math.max(1, rows.length - 5), rows.length).map((row, idx) => ({
        rowIndex: rows.length - (rows.length - Math.max(1, rows.length - 5)) + idx,
        email: normalize(row[emailIdx] ?? ''),
        score: scoreIdx >= 0 ? row[scoreIdx] : 'N/A',
      }));
      console.log('Last 5 rows from sheet:', sampleEmails);
    }

    return NextResponse.json({ score: null, grade: null, badge: null });
  } catch (error) {
    console.error('Error fetching RBI result:', error);
    return NextResponse.json({ error: 'Failed to fetch RBI result' }, { status: 500 });
  }
}

