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
    
    // NEW APPROACH: Search ALL rows from bottom to top (most recent first)
    // Find the most recent row with matching email that has calculated values
    console.log('=== API: Searching for email ===');
    console.log('Searching for:', normalizedSearchEmail);
    console.log('Total rows:', rows.length);
    console.log('Column indices:', { emailIdx, scoreIdx, gradeIdx, badgeIdx });
    
    let mostRecentMatch = null;
    let mostRecentMatchIndex = -1;
    
    // Search from bottom to top (most recent first)
    for (let i = rows.length - 1; i >= 1; i--) {
      const row = rows[i];
      const rowEmail = normalize(row[emailIdx] ?? '');
      
      // Check if email matches
      if (rowEmail === normalizedSearchEmail) {
        const rawScore = scoreIdx >= 0 ? row[scoreIdx] : undefined;
        const rawGrade = gradeIdx >= 0 ? row[gradeIdx] : undefined;
        const rawBadge = badgeIdx >= 0 ? row[badgeIdx] : undefined;
        
        const result = {
          score: rawScore ? rawScore.toString().trim() || null : null,
          grade: rawGrade ? rawGrade.toString().trim() || null : null,
          badge: rawBadge ? rawBadge.toString().trim() || null : null,
        };
        
        const hasCalculatedValues = !!(result.score || result.grade || result.badge);
        
        console.log(`Row ${i}: Email match found. Has calculated values:`, hasCalculatedValues);
        console.log(`Row ${i}: Raw values:`, { score: rawScore, grade: rawGrade, badge: rawBadge });
        
        // Store the first match (most recent since we go bottom to top)
        if (mostRecentMatch === null) {
          mostRecentMatch = result;
          mostRecentMatchIndex = i;
          
          // If this match has calculated values, return it immediately
          if (hasCalculatedValues) {
            console.log(`✅ Found match at row ${i} with calculated values. Returning:`, result);
            return NextResponse.json(result);
          }
        }
      }
    }
    
    // If we found a match but no calculated values yet, return null (still processing)
    if (mostRecentMatch !== null) {
      console.log(`⏳ Found match at row ${mostRecentMatchIndex} but no calculated values yet (Apps Script still processing)`);
      return NextResponse.json({ 
        score: null, 
        grade: null, 
        badge: null,
        debug: {
          found: true,
          rowIndex: mostRecentMatchIndex,
          hasCalculatedValues: false,
          columnIndices: { emailIdx, scoreIdx, gradeIdx, badgeIdx },
        }
      });
    }
    
    // No match found
    console.log('❌ No email match found in sheet');
    return NextResponse.json({ 
      score: null, 
      grade: null, 
      badge: null,
      debug: {
        found: false,
        searchingFor: normalizedSearchEmail,
        totalRows: rows.length,
        columnIndices: { emailIdx, scoreIdx, gradeIdx, badgeIdx },
      }
    });

    // No data rows
    return NextResponse.json({ score: null, grade: null, badge: null });
  } catch (error) {
    console.error('Error fetching RBI result:', error);
    return NextResponse.json({ error: 'Failed to fetch RBI result' }, { status: 500 });
  }
}
