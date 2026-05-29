import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const normalize = (value?: string) => {
  if (!value) return '';
  return value.toString().replace(/\s+/g, '').toLowerCase().trim();
};

const findColumnIndex = (headerRow: string[], labels: string[]) => {
  for (const label of labels) {
    const idx = headerRow.findIndex((cell) => normalize(cell) === normalize(label));
    if (idx !== -1) return idx;
  }
  const keyword = labels[0]?.split(' ')[0] ?? '';
  if (keyword) {
    const fuzzyIdx = headerRow.findIndex((cell) => normalize(cell).includes(normalize(keyword)));
    if (fuzzyIdx !== -1) return fuzzyIdx;
  }
  return -1;
};

// CORS headers helper
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(),
  });
}

export async function GET() {
  try {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const dataRange = process.env.GOOGLE_RBI_RESULTS_RANGE || 'Form Responses 2!A:Z';
    
    const emailHeader = process.env.GOOGLE_RBI_EMAIL_HEADER || 'Email Address';
    const scoreHeader = process.env.GOOGLE_RBI_SCORE_HEADER || 'Calculated Summit-Ready Score';

    if (!clientEmail || !privateKey || !sheetId) {
      console.error('Missing required environment variables for Google Sheets integration');
      const response = NextResponse.json(
        { error: 'Missing Sheets configuration' },
        { status: 500 }
      );
      Object.entries(getCorsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: dataRange,
    });

    const rows = sheetResponse.data.values;
    if (!rows || rows.length <= 1) {
      const response = NextResponse.json({
        allTime: [],
        thisMonth: [],
        currentMonthName: new Date().toLocaleString('en-US', { month: 'long' })
      });
      Object.entries(getCorsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    const header = rows[0];
    const timestampIdx = findColumnIndex(header, ['Timestamp', 'Date', 'Time']);
    const firstNameIdx = findColumnIndex(header, ['First Name', 'FirstName', 'Name']);
    const lastNameIdx = findColumnIndex(header, ['Last Name', 'LastName']);
    const emailIdx = findColumnIndex(header, [emailHeader, 'Email Address', 'Email']);
    const scoreIdx = findColumnIndex(header, [scoreHeader, 'Score', 'Total Score']);
    const goalTypeIdx = findColumnIndex(header, ['Goal Type', 'GoalType', 'Goal']);
    const goalDetailIdx = findColumnIndex(header, ['Goal Detail', 'GoalDetail']);

    // Utility to format name safely (protect privacy)
    const formatName = (first: string, last: string) => {
      const f = first.trim();
      const l = last.trim();
      if (!f) return 'Anonymous Athlete';
      return l ? `${f} ${l.charAt(0).toUpperCase()}.` : f;
    };

    interface LeaderboardEntry {
      timestamp: string;
      firstName: string;
      lastName: string;
      email: string;
      score: number;
      badge: string;
      goal: string;
    }

    const parsedEntries: LeaderboardEntry[] = [];

    // Parse all rows (skipping header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const rawEmail = emailIdx >= 0 ? row[emailIdx] : '';
      const email = normalize(rawEmail);
      if (!email) continue; // Skip entries without emails

      const rawScore = scoreIdx >= 0 ? row[scoreIdx] : '';
      const score = Math.round(parseFloat(rawScore));
      if (isNaN(score) || score <= 0) continue; // Skip entries without valid calculated scores

      const timestamp = timestampIdx >= 0 ? row[timestampIdx] ?? '' : '';
      const firstName = firstNameIdx >= 0 ? row[firstNameIdx] ?? '' : '';
      const lastName = lastNameIdx >= 0 ? row[lastNameIdx] ?? '' : '';
      
      // Dynamically calculate the proper V2 badge based on the total score
      let badge = 'Summit-Ready';
      if (score >= 93) {
        badge = 'Everest-Ready';
      } else if (score >= 80) {
        badge = 'Summit-Ready';
      } else if (score >= 65) {
        badge = 'Summit-Approaching';
      } else if (score >= 50) {
        badge = 'Acclimatizing';
      } else if (score >= 31) {
        badge = 'Altitude Apprentice';
      } else {
        badge = 'Base Camp Beginner';
      }

      const gType = goalTypeIdx >= 0 ? row[goalTypeIdx] ?? '' : '';
      const gDetail = goalDetailIdx >= 0 ? row[goalDetailIdx] ?? '' : '';
      let goal = gType;
      if (gDetail && gType) {
        goal = `${gType} - ${gDetail}`;
      } else if (gDetail) {
        goal = gDetail;
      }

      parsedEntries.push({
        timestamp,
        firstName,
        lastName,
        email,
        score,
        badge,
        goal: goal || 'High Altitude Training'
      });
    }

    // Get the most recent month represented in the sheet's data
    const now = new Date();
    let targetMonth = now.getMonth(); // 0-11
    let targetYear = now.getFullYear();
    let currentMonthName = now.toLocaleString('en-US', { month: 'long' });

    let mostRecentTime = 0;
    parsedEntries.forEach((entry) => {
      const entryDate = new Date(entry.timestamp);
      const time = entryDate.getTime();
      if (!isNaN(time) && time > mostRecentTime) {
        mostRecentTime = time;
      }
    });

    if (mostRecentTime > 0) {
      const mostRecentDate = new Date(mostRecentTime);
      targetMonth = mostRecentDate.getMonth();
      targetYear = mostRecentDate.getFullYear();
      
      const monthLabel = mostRecentDate.toLocaleString('en-US', { month: 'long' });
      // If it's a different year, append the year (e.g. September 2025)
      currentMonthName = targetYear !== now.getFullYear() 
        ? `${monthLabel} ${targetYear}` 
        : monthLabel;
    }

    // Maps to group by unique attendee (by email) and keep only their HIGHEST score
    const allTimeMap = new Map<string, LeaderboardEntry>();
    const monthlyMap = new Map<string, LeaderboardEntry>();

    parsedEntries.forEach((entry) => {
      // 1. All-time highest score grouping
      const existingAllTime = allTimeMap.get(entry.email);
      if (!existingAllTime || entry.score > existingAllTime.score) {
        allTimeMap.set(entry.email, entry);
      }

      // 2. This month highest score grouping (targeting the dynamically detected month)
      const entryDate = new Date(entry.timestamp);
      if (!isNaN(entryDate.getTime())) {
        const isThisMonth = entryDate.getMonth() === targetMonth && entryDate.getFullYear() === targetYear;
        if (isThisMonth) {
          const existingMonthly = monthlyMap.get(entry.email);
          if (!existingMonthly || entry.score > existingMonthly.score) {
            monthlyMap.set(entry.email, entry);
          }
        }
      }
    });

    // Sort descending by score and format output
    const allTime = Array.from(allTimeMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((entry, idx) => ({
        rank: idx + 1,
        name: formatName(entry.firstName, entry.lastName),
        score: entry.score,
        badge: entry.badge,
        goal: entry.goal,
        date: entry.timestamp
      }));

    const thisMonth = Array.from(monthlyMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((entry, idx) => ({
        rank: idx + 1,
        name: formatName(entry.firstName, entry.lastName),
        score: entry.score,
        badge: entry.badge,
        goal: entry.goal,
        date: entry.timestamp
      }));

    // Next.js response with CORS headers
    const response = NextResponse.json({
      allTime,
      thisMonth,
      currentMonthName
    });

    Object.entries(getCorsHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('Leaderboard error:', error);
    const response = NextResponse.json(
      { error: 'Failed to compute leaderboard' },
      { status: 500 }
    );
    Object.entries(getCorsHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
}
