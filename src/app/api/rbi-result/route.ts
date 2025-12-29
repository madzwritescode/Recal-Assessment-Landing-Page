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

    // CRITICAL FIX: ALWAYS check the LAST row first (most recent submission)
    // The last row is ALWAYS the newest entry in the sheet
    // If it has calculated values, it's the most recent completed submission
    if (rows.length > 1) {
      const lastRow = rows[rows.length - 1];
      const lastRowEmail = normalize(lastRow[emailIdx] ?? '');
      const lastRowResult = {
        score: scoreIdx >= 0 ? (lastRow[scoreIdx] ?? '').toString().trim() || null : null,
        grade: gradeIdx >= 0 ? (lastRow[gradeIdx] ?? '').toString().trim() || null : null,
        badge: badgeIdx >= 0 ? (lastRow[badgeIdx] ?? '').toString().trim() || null : null,
      };
      
      const hasCalculatedValues = !!(lastRowResult.score || lastRowResult.grade || lastRowResult.badge);
      
      console.log('=== CHECKING LAST ROW (MOST RECENT SUBMISSION) ===');
      console.log('Last row index:', rows.length - 1, '(Row', rows.length, 'including header)');
      console.log('Last row email:', `"${lastRowEmail}"`);
      console.log('Searching for email:', `"${normalizedSearchEmail}"`);
      console.log('Emails match?', lastRowEmail === normalizedSearchEmail);
      console.log('Last row has calculated values?', hasCalculatedValues);
      console.log('Last row result:', lastRowResult);
      console.log('Raw cell values:', {
        scoreRaw: lastRow[scoreIdx],
        gradeRaw: lastRow[gradeIdx],
        badgeRaw: lastRow[badgeIdx],
        scoreIdx,
        gradeIdx,
        badgeIdx,
      });
      console.log('Full last row (first 15 cells):', lastRow.slice(0, 15));
      
      // CRITICAL: If last row email matches, this is definitely the user's most recent submission
      // Return it if it has values, or return null if still processing (don't search old rows)
      if (lastRowEmail === normalizedSearchEmail) {
        if (hasCalculatedValues) {
          console.log('✅ Last row email MATCHES and has calculated values - returning most recent result:', lastRowResult);
          return NextResponse.json(lastRowResult);
        } else {
          console.log('⏳ Last row email matches but no calculated values yet (Apps Script still processing)');
          console.log('Returning null - will retry (do NOT search old rows)');
          return NextResponse.json({ score: null, grade: null, badge: null });
        }
      }
      
      console.log('⚠️ Last row email does NOT match');
      console.log('Last row email:', `"${lastRowEmail}"`);
      console.log('Searching for:', `"${normalizedSearchEmail}"`);
      console.log('Email comparison:', {
        lastRowEmail,
        normalizedSearchEmail,
        exactMatch: lastRowEmail === normalizedSearchEmail,
        lastRowEmailLength: lastRowEmail.length,
        searchEmailLength: normalizedSearchEmail.length,
      });
      
      // CRITICAL: If last row has calculated values but email doesn't match,
      // it means someone else just submitted. Don't search old rows - return null and retry.
      // The user's submission should be the last row once Apps Script processes it.
      if (hasCalculatedValues) {
        console.log('⚠️ Last row has calculated values but email does NOT match');
        console.log('This means someone else just submitted. Returning null - will retry.');
        console.log('The user\'s submission should be the last row once Apps Script processes it.');
        return NextResponse.json({ score: null, grade: null, badge: null });
      }
      
      console.log('Last row has no calculated values - will search by email (but this may return stale data)');
    }

    // PRIORITY 2: Search from bottom to top for email match
    // ONLY reach here if last row email didn't match AND last row has no calculated values
    // This is a fallback - ideally we should wait for the last row to be processed
    console.log('=== SEARCHING BY EMAIL (BOTTOM TO TOP - MOST RECENT FIRST) ===');
    console.log('⚠️ WARNING: Last row email did not match - searching for email in older rows');
    console.log('⚠️ This could return stale data if the last row is still being processed');
    
    let mostRecentMatch = null;
    let mostRecentMatchIndex = -1;
    const allMatches: Array<{ index: number; result: { score: string | null; grade: string | null; badge: string | null }; hasValues: boolean }> = [];
    
    for (let i = rows.length - 1; i >= 1; i--) {
      const row = rows[i];
      const rowEmail = normalize(row[emailIdx] ?? '');
      
      // Log all emails for debugging (especially last 5 rows)
      if (i >= rows.length - 5) {
        console.log(`Row ${i} email: "${rowEmail}" (searching for: "${normalizedSearchEmail}")`);
        console.log(`Row ${i} is ${rows.length - i - 1} rows from the bottom`);
      }
      
      if (rowEmail === normalizedSearchEmail) {
        const result = {
          score: scoreIdx >= 0 ? (row[scoreIdx] ?? '').toString().trim() || null : null,
          grade: gradeIdx >= 0 ? (row[gradeIdx] ?? '').toString().trim() || null : null,
          badge: badgeIdx >= 0 ? (row[badgeIdx] ?? '').toString().trim() || null : null,
        };
        
        const hasValues = !!(result.score || result.grade || result.badge);
        
        console.log(`✅ Found email match at row ${i} (row number ${i + 1} including header)`);
        console.log(`Row ${i} is ${rows.length - i - 1} rows from the bottom (last row is ${rows.length - 1})`);
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
        
        // CRITICAL FIX: Return the FIRST match we find (most recent since we go bottom to top)
        // This ensures we get the most recent submission for this email, not an old one
        if (mostRecentMatch === null) {
          mostRecentMatch = result;
          mostRecentMatchIndex = i;
          console.log(`📌 Storing first match at row ${i} as most recent`);
          
          // If this match has calculated values, check if it's recent enough
          // Only return if it's within the last 3 rows (to avoid returning very old data)
          if (hasValues) {
            const rowsFromBottom = rows.length - 1 - i;
            console.log(`✅ First match at row ${i} has calculated values`);
            console.log(`Row ${i} is ${rowsFromBottom} rows from the bottom (last row is ${rows.length - 1})`);
            
            // Only return if it's within the last 3 rows (most recent submissions)
            // This prevents returning very old data
            if (rowsFromBottom <= 2) {
              console.log(`✅ Match is recent (within last 3 rows) - returning immediately`);
              console.log('Returning result:', result);
              return NextResponse.json(result);
            } else {
              console.log(`⚠️ WARNING: Match is ${rowsFromBottom} rows from bottom - this is OLD data!`);
              console.log(`⚠️ Last row (${rows.length - 1}) email did not match, but found old match at row ${i}`);
              console.log(`⚠️ This is likely stale data. The user's new submission should be the last row.`);
              console.log(`⚠️ Returning null to retry - the last row should have the user's data once processed`);
              // Don't return this old data - return null to retry
              return NextResponse.json({ score: null, grade: null, badge: null });
            }
          } else {
            console.log(`⏳ First match at row ${i} found but no calculated values yet - will continue searching for one with values`);
          }
        } else {
          console.log(`⚠️ Found another match at row ${i}, but already have match at row ${mostRecentMatchIndex}`);
          console.log(`Skipping row ${i} - using first match (most recent)`);
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
    
    // Return the most recent match we found (if any)
    // This should have been returned already if it had values, but handle the case where it doesn't
    if (mostRecentMatch !== null) {
      const hasCalculatedValues = !!(mostRecentMatch.score || mostRecentMatch.grade || mostRecentMatch.badge);
      
      if (hasCalculatedValues) {
        console.log(`✅ Returning most recent match for email at row ${mostRecentMatchIndex} with calculated values:`, mostRecentMatch);
        console.log(`⚠️ NOTE: This should have been returned earlier - check why it wasn't`);
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

