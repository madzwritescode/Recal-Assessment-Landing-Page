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
    
    // TEMPORARY DEBUG LOGGING
    console.log('=== RBI RESULT API - REQUEST RECEIVED ===');
    console.log('Request body:', JSON.stringify(body, null, 2));
    console.log('Email received:', email);
    console.log('Email type:', typeof email);
    console.log('Email length:', email?.length);
    
    if (!email) {
      console.error('❌ ERROR: No email provided in request');
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
    console.log('=== RBI RESULT API - LOOKUP STARTING ===');
    console.log('Original email:', email);
    console.log('Normalized search email:', normalizedSearchEmail);
    console.log('Total rows in sheet:', rows.length);
    console.log('Data rows (excluding header):', rows.length - 1);
    console.log('Column indices - Email:', emailIdx, 'Score:', scoreIdx, 'Grade:', gradeIdx, 'Badge:', badgeIdx);
    console.log('Column headers found:', {
      email: header[emailIdx] || 'NOT FOUND',
      score: header[scoreIdx] || 'NOT FOUND',
      grade: header[gradeIdx] || 'NOT FOUND',
      badge: header[badgeIdx] || 'NOT FOUND',
    });
    console.log('Full header row:', header);

    // PRIORITY 1: Check the LAST row first (most recent submission)
    // If it matches the email, it's definitely the most recent for this user
    if (rows.length > 1) {
      const lastRow = rows[rows.length - 1];
      const lastRowEmail = normalize(lastRow[emailIdx] ?? '');
      const lastRowResult = {
        score: scoreIdx >= 0 ? (lastRow[scoreIdx] ?? '').toString().trim() || null : null,
        grade: gradeIdx >= 0 ? (lastRow[gradeIdx] ?? '').toString().trim() || null : null,
        badge: badgeIdx >= 0 ? (lastRow[badgeIdx] ?? '').toString().trim() || null : null,
      };
      
      console.log('=== CHECKING LAST ROW (MOST RECENT) ===');
      console.log('Last row index:', rows.length - 1);
      console.log('Last row email:', lastRowEmail);
      console.log('Searching for:', normalizedSearchEmail);
      console.log('Emails match?', lastRowEmail === normalizedSearchEmail);
      console.log('Last row result:', lastRowResult);
      
      if (lastRowEmail === normalizedSearchEmail) {
        const hasCalculatedValues = !!(lastRowResult.score || lastRowResult.grade || lastRowResult.badge);
        console.log('✅ Last row email MATCHES!');
        console.log('Last row has calculated values?', hasCalculatedValues);
        console.log('Last row raw data:', {
          scoreCell: lastRow[scoreIdx],
          gradeCell: lastRow[gradeIdx],
          badgeCell: lastRow[badgeIdx],
          scoreIdx,
          gradeIdx,
          badgeIdx,
        });
        
        if (hasCalculatedValues) {
          console.log('✅ Returning last row result with calculated values:', lastRowResult);
          return NextResponse.json(lastRowResult);
        } else {
          console.log('⏳ Last row email matches but no calculated values yet (Apps Script still processing)');
          console.log('Returning null to trigger retry');
          return NextResponse.json({ score: null, grade: null, badge: null });
        }
      } else {
        console.log('❌ Last row email does NOT match');
        console.log('Last row email:', `"${lastRowEmail}"`);
        console.log('Searching for:', `"${normalizedSearchEmail}"`);
        console.log('Exact match?', lastRowEmail === normalizedSearchEmail);
        console.log('Length comparison:', lastRowEmail.length, 'vs', normalizedSearchEmail.length);
      }
    }

    // PRIORITY 2: Search from bottom to top for email match
    // This ensures we get the MOST RECENT entry for this specific email
    // We search bottom to top to get the latest submission for this user
    console.log('=== SEARCHING BY EMAIL (BOTTOM TO TOP - MOST RECENT FIRST) ===');
    let mostRecentMatch = null;
    let mostRecentMatchIndex = -1;
    const allMatches: Array<{ index: number; result: any; hasValues: boolean }> = [];
    
    for (let i = rows.length - 1; i >= 1; i--) {
      const row = rows[i];
      const rowEmail = normalize(row[emailIdx] ?? '');
      
      // Log all emails for debugging
      if (i >= rows.length - 5) {
        console.log(`Row ${i} email: "${rowEmail}" (searching for: "${normalizedSearchEmail}")`);
      }
      
      if (rowEmail === normalizedSearchEmail) {
        const result = {
          score: scoreIdx >= 0 ? (row[scoreIdx] ?? '').toString().trim() || null : null,
          grade: gradeIdx >= 0 ? (row[gradeIdx] ?? '').toString().trim() || null : null,
          badge: badgeIdx >= 0 ? (row[badgeIdx] ?? '').toString().trim() || null : null,
        };
        
        const hasValues = !!(result.score || result.grade || result.badge);
        
        console.log(`✅ Found email match at row ${i} (row number ${i + 1} including header)`);
        console.log('Match result:', result);
        console.log('Has calculated values?', hasValues);
        console.log('Raw cell values:', {
          score: row[scoreIdx],
          grade: row[gradeIdx],
          badge: row[badgeIdx],
          scoreType: typeof row[scoreIdx],
          gradeType: typeof row[gradeIdx],
          badgeType: typeof row[badgeIdx],
        });
        console.log('Full row data (first 10 cells):', row.slice(0, 10));
        
        allMatches.push({ index: i, result, hasValues });
        
        // Store the first match (most recent since we're going bottom to top)
        // But prefer matches with calculated values
        if (mostRecentMatch === null) {
          mostRecentMatch = result;
          mostRecentMatchIndex = i;
        } else if (hasValues && !(mostRecentMatch.score || mostRecentMatch.grade || mostRecentMatch.badge)) {
          // If we found a match with values and the previous one didn't have values, use this one
          mostRecentMatch = result;
          mostRecentMatchIndex = i;
          console.log(`🔄 Updating to row ${i} because it has calculated values`);
        }
      }
    }
    
    if (allMatches.length > 0) {
      console.log(`Found ${allMatches.length} total matches for this email:`, allMatches.map(m => ({
        row: m.index,
        hasValues: m.hasValues,
        score: m.result.score
      })));
    }
    
    // Only return if we found a match AND it has calculated values
    // No fallbacks - only return actual results
    if (mostRecentMatch !== null) {
      const hasCalculatedValues = !!(mostRecentMatch.score || mostRecentMatch.grade || mostRecentMatch.badge);
      
      if (hasCalculatedValues) {
        console.log(`✅ Returning most recent match for email at row ${mostRecentMatchIndex} with calculated values:`, mostRecentMatch);
        return NextResponse.json(mostRecentMatch);
      } else {
        console.log(`⏳ Found match at row ${mostRecentMatchIndex} but no calculated values yet (Apps Script still processing)`);
        // Return null to indicate we need to retry
        return NextResponse.json({ score: null, grade: null, badge: null });
      }
    }

    console.warn('❌ No matching email found. Searched email:', normalizedSearchEmail);
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

