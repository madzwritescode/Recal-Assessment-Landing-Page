import { NextResponse } from 'next/server';

// CORS headers helper
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

export async function POST(request: Request) {
  try {
    // Get environment variables
    const ghlApiToken = process.env.GHL_API_TOKEN;
    const ghlApiVersion = process.env.GHL_API_VERSION || '2021-07-28';
    const ghlLocationId = process.env.GHL_LOCATION_ID; // Optional: if you have a specific location ID

    if (!ghlApiToken) {
      console.error('Missing GHL_API_TOKEN environment variable');
      const response = NextResponse.json(
        { error: 'Missing API configuration' },
        { status: 500 }
      );
      Object.entries(getCorsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Parse request body
    const body = await request.json();
    const {
      firstName,
      email,
      boltScore,
      co2ToleranceScore,
      mbtScore,
      lomZones,
      romPercentage,
      rbiTotalScore,
      rbiGrade,
      rbiBadge,
      primaryGoal,
      rbiTimestamp,
    } = body;

    // Validate required fields
    if (!firstName || !email) {
      const response = NextResponse.json(
        { error: 'Missing required fields: firstName and email are required' },
        { status: 400 }
      );
      Object.entries(getCorsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Build GoHighLevel contact payload
    // Reference: https://marketplace.gohighlevel.com/docs/ghl/contacts/create-contact
    const customFields: Record<string, string> = {};

    // Map custom fields to GoHighLevel custom field unique keys
    if (rbiTimestamp) {
      customFields['rbi_timestamp'] = String(rbiTimestamp);
    }
    if (primaryGoal) {
      customFields['primary_goal'] = String(primaryGoal);
    }
    if (boltScore !== undefined && boltScore !== null && boltScore !== '') {
      customFields['bolt_score'] = String(boltScore);
    }
    if (co2ToleranceScore !== undefined && co2ToleranceScore !== null && co2ToleranceScore !== '') {
      customFields['co2_tolerance_score'] = String(co2ToleranceScore);
    }
    if (mbtScore !== undefined && mbtScore !== null && mbtScore !== '') {
      customFields['mbt_score'] = String(mbtScore);
    }
    if (lomZones) {
      customFields['lom_zones'] = String(lomZones);
    }
    if (romPercentage !== undefined && romPercentage !== null && romPercentage !== '') {
      customFields['rom_percentage'] = String(romPercentage);
    }
    if (rbiTotalScore !== undefined && rbiTotalScore !== null && rbiTotalScore !== '') {
      customFields['rbi_total_score'] = String(rbiTotalScore);
    }
    if (rbiGrade) {
      customFields['rbi_grade'] = String(rbiGrade);
    }
    if (rbiBadge) {
      customFields['rbi_badge'] = String(rbiBadge);
    }

    interface GHLContactPayload {
      firstName: string;
      email: string;
      customFields?: Record<string, string>;
    }

    const ghlPayload: GHLContactPayload = {
      firstName: firstName.trim(),
      email: email.trim().toLowerCase(),
    };

    // Only include customFields if there are any
    if (Object.keys(customFields).length > 0) {
      ghlPayload.customFields = customFields;
    }

    // GoHighLevel Contacts API endpoint
    const ghlBaseUrl = 'https://services.leadconnectorhq.com';
    const endpoint = `${ghlBaseUrl}/contacts/`;

    // Prepare headers
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${ghlApiToken}`,
      'Version': ghlApiVersion,
      'Content-Type': 'application/json',
    };

    // Add Location-Id header if provided
    if (ghlLocationId) {
      headers['Location-Id'] = ghlLocationId;
    }

    // Make request to GoHighLevel API
    const ghlResponse = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(ghlPayload),
    });

    const ghlResponseData = await ghlResponse.json().catch(() => ({}));

    if (!ghlResponse.ok) {
      console.error('GoHighLevel API error:', {
        status: ghlResponse.status,
        statusText: ghlResponse.statusText,
        response: ghlResponseData,
      });

      const response = NextResponse.json(
        {
          error: 'Failed to submit to GoHighLevel',
          details: ghlResponseData.message || ghlResponseData.error || 'Unknown error',
        },
        { status: ghlResponse.status || 500 }
      );
      Object.entries(getCorsHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Success response
    const response = NextResponse.json({
      success: true,
      contactId: ghlResponseData.contact?.id || ghlResponseData.id,
      message: 'Contact created/updated successfully in GoHighLevel',
    });
    Object.entries(getCorsHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;

  } catch (error) {
    console.error('Error submitting RBI to GoHighLevel:', error);
    const response = NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
    Object.entries(getCorsHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
}
