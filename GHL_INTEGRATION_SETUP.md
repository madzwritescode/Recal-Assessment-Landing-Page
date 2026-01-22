# GoHighLevel Integration Setup

## Overview
This integration sends RBI form data and results to GoHighLevel Contacts API after form submission, then redirects users to the results page.

## Files Created/Modified

### 1. `/src/app/api/submitRBI/route.ts`
Serverless API route that:
- Accepts POST requests with RBI form data and computed scores
- Sends data to GoHighLevel Contacts API
- Maps form fields to GHL custom fields
- Returns success/error responses

### 2. `/src/components/DiagnosticModal.tsx`
Updated form submission handler to:
- Call `/api/submitRBI` endpoint after assessment results are fetched
- Show loading state during submission
- Redirect to results page on success

## Environment Variables (Vercel)

Set these in your Vercel project settings:

### Required:
- `GHL_API_TOKEN` - Your GoHighLevel Private Integration Token
- `GHL_API_VERSION` - API version (default: "2021-07-28")

### Optional:
- `GHL_LOCATION_ID` - Specific location ID if using location-specific endpoints
- `NEXT_PUBLIC_GHL_RESULTS_URL` - Results page URL (default: "https://results.assessment.recal.training")

## GoHighLevel Custom Fields

Ensure these custom fields exist in your GoHighLevel account with these exact unique keys:

- `rbi_timestamp` - Timestamp of RBI assessment
- `primary_goal` - User's primary training goal
- `bolt_score` - BOLT test score
- `co2_tolerance_score` - CO₂ tolerance test score
- `mbt_score` - Maximum Breathlessness Test score
- `lom_zones` - Location of Movement zones
- `rom_percentage` - Range of Motion percentage
- `rbi_total_score` - Total RBI score
- `rbi_grade` - RBI grade
- `rbi_badge` - RBI badge

## Field Mapping

| Form Field | GHL Custom Field Key | Type |
|------------|---------------------|------|
| `boltScore` | `bolt_score` | String |
| `co2ttScore` | `co2_tolerance_score` | String |
| `mbtSteps` | `mbt_score` | String |
| `lomZone` | `lom_zones` | String |
| `romPercent` | `rom_percentage` | String |
| `assessmentResult.score` | `rbi_total_score` | String |
| `assessmentResult.grade` | `rbi_grade` | String |
| `assessmentResult.badge` | `rbi_badge` | String |
| `goalType + goalDetail` | `primary_goal` | String |
| `new Date().toISOString()` | `rbi_timestamp` | String |

## Standard Fields

- `firstName` - Contact's first name
- `email` - Contact's email address (used for contact lookup/creation)

## Testing

1. Fill out the RBI assessment form
2. Submit the form
3. Check Vercel function logs for API calls
4. Verify contact is created/updated in GoHighLevel
5. Confirm redirect to results page occurs

## Error Handling

- If GoHighLevel API fails, the error is logged but doesn't block the form submission
- User will still be redirected to results page even if GHL submission fails
- Check Vercel function logs for detailed error messages

## API Endpoint

**POST** `/api/submitRBI`

**Request Body:**
```json
{
  "firstName": "John",
  "email": "john@example.com",
  "boltScore": "25",
  "co2ToleranceScore": "68",
  "mbtScore": "61",
  "lomZones": "Zone 2",
  "romPercentage": "105.8",
  "rbiTotalScore": "85",
  "rbiGrade": "A",
  "rbiBadge": "Elite",
  "primaryGoal": "Climb a high altitude mountain - Mt. Rainier in July",
  "rbiTimestamp": "2024-01-15T10:30:00.000Z"
}
```

**Success Response:**
```json
{
  "success": true,
  "contactId": "contact_id_here",
  "message": "Contact created/updated successfully in GoHighLevel"
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```
