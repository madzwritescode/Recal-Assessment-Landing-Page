# Recal Form Embed Instructions

This document explains how to embed the Recal Breath Assessment form on third-party websites.

## Option 1: Iframe Embed (Recommended)

The simplest way to embed the form is using an iframe. This keeps the form completely isolated and works on any website.

### Basic Usage

```html
<iframe 
    src="https://yourdomain.com/recal-form-embed.html" 
    width="100%" 
    height="400" 
    frameborder="0"
    style="border: none; max-width: 500px;">
</iframe>
```

### With Configuration

If you need to configure the base URL for API calls, you can pass it as a query parameter:

```html
<iframe 
    src="https://yourdomain.com/recal-form-embed.html?baseUrl=https://yourdomain.com" 
    width="100%" 
    height="400" 
    frameborder="0"
    style="border: none; max-width: 500px;">
</iframe>
```

### Responsive Iframe

For a responsive iframe that adapts to different screen sizes:

```html
<div style="position: relative; padding-bottom: 100%; height: 0; overflow: hidden; max-width: 500px;">
    <iframe 
        src="https://yourdomain.com/recal-form-embed.html" 
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
        frameborder="0">
    </iframe>
</div>
```

## Option 2: Script-Based Embed

For more control and better integration, use the JavaScript embed script.

### Basic Usage

```html
<!-- 1. Create a container div -->
<div id="recal-form-container"></div>

<!-- 2. Configure the form (optional) -->
<script>
    window.RECAL_FORM_CONFIG = {
        baseUrl: 'https://yourdomain.com',  // Required: Your Next.js app URL
        gaId: 'G-XXXXXXXXXX',              // Optional: Google Analytics ID
        containerId: 'recal-form-container'  // Optional: Custom container ID
    };
</script>

<!-- 3. Load the embed script -->
<script src="https://yourdomain.com/recal-form-embed.js"></script>
```

### Custom Container ID

If you want to use a different container ID:

```html
<div id="my-custom-form-container"></div>

<script>
    window.RECAL_FORM_CONFIG = {
        baseUrl: 'https://yourdomain.com',
        containerId: 'my-custom-form-container'
    };
</script>
<script src="https://yourdomain.com/recal-form-embed.js"></script>
```

## Configuration Options

### `baseUrl` (Required)
The base URL of your Next.js application where the API endpoints are hosted.
- Example: `'https://yourdomain.com'`
- Example: `'http://localhost:3000'` (for development)

### `gaId` (Optional)
Your Google Analytics tracking ID for conversion tracking.
- Example: `'G-XXXXXXXXXX'`
- If not provided, analytics tracking will be skipped

### `containerId` (Optional)
The ID of the HTML element where the form should be rendered.
- Default: `'recal-form-container'`
- Only used with script-based embed

## How It Works

1. **Form Submission**: When a user submits the form, it:
   - Validates the required fields (First Name and Email)
   - Records the signup to your API endpoint (`/api/record-landing-signup`)
   - Opens the Google Form in a new tab with pre-filled data
   - Tracks the conversion event (if GA is configured)

2. **API Integration**: The form makes a POST request to:
   - `${baseUrl}/api/record-landing-signup`
   - This endpoint records the signup to your Google Sheet

3. **Google Form Redirect**: The form opens:
   - Google Form URL with pre-filled First Name, Last Name, and Email
   - Opens in a new tab/window

## Styling

The form comes with built-in styles that match your landing page design:
- Border color: `#4A90A4`
- Button color: `#0A4367`
- Font: Rogue Sans Ext (with fallback to system fonts)
- Responsive design (stacks on mobile)

### Custom Styling

You can override styles by adding CSS after the embed:

```html
<style>
    #recal-form-container .recal-button {
        background-color: #your-color !important;
    }
</style>
```

## CORS Configuration

If you're embedding on a different domain, make sure your Next.js API routes allow cross-origin requests. Add this to your API route:

```typescript
// In your API route file
export async function POST(request: Request) {
    // Your existing code...
    
    const response = NextResponse.json({ success: true });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
```

## Testing

1. **Local Testing**: Use `http://localhost:3000` as the baseUrl
2. **Production**: Use your production domain URL
3. **Test the flow**: Submit the form and verify:
   - Signup is recorded in your Google Sheet
   - Google Form opens with pre-filled data
   - Analytics events are tracked (if configured)

## Troubleshooting

### Form not appearing
- Check that the container div exists
- Verify the script is loaded (check browser console)
- Ensure `baseUrl` is correctly configured

### API calls failing
- Check CORS settings in your API routes
- Verify the `baseUrl` is correct
- Check browser console for error messages

### Google Form not opening
- Check that popup blockers aren't blocking the new window
- Verify the Google Form URL is correct

## Files

- `recal-form-embed.html` - Standalone HTML file for iframe embedding
- `recal-form-embed.js` - JavaScript embed script
- Both files should be placed in your `public/` folder

## Support

For issues or questions, check:
- Browser console for JavaScript errors
- Network tab for API call failures
- Your Next.js server logs

