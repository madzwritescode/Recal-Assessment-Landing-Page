# Recal Form Embed - Quick Start

## For Third-Party Websites

### Option 1: Simple Iframe (Easiest)

Copy and paste this code into any HTML page:

```html
<iframe 
    src="https://yourdomain.com/recal-form-embed.html?baseUrl=https://yourdomain.com" 
    width="100%" 
    height="400" 
    frameborder="0"
    style="border: none; max-width: 500px;">
</iframe>
```

**Replace `https://yourdomain.com` with your actual domain.**

### Option 2: JavaScript Embed (More Flexible)

Copy and paste this code:

```html
<!-- Container for the form -->
<div id="recal-form-container"></div>

<!-- Configuration -->
<script>
    window.RECAL_FORM_CONFIG = {
        baseUrl: 'https://yourdomain.com'  // Replace with your domain
    };
</script>

<!-- Load the embed script -->
<script src="https://yourdomain.com/recal-form-embed.js"></script>
```

**Replace `https://yourdomain.com` with your actual domain.**

## Custom CSS (Optional)

If you want to customize the form appearance, add this CSS:

```css
/* Customize button color */
#recal-form-container .recal-button {
    background-color: #your-color !important;
}

/* Customize border color */
#recal-form-container .recal-form-container {
    border-color: #your-color !important;
}

/* Customize input border color */
#recal-form-container .recal-input {
    border-color: #your-color !important;
}
```

## What Happens When Users Submit?

1. Form validates First Name and Email (required)
2. Signup is recorded to your Google Sheet via API
3. Google Form opens in a new tab with pre-filled data
4. User completes the assessment on Google Forms

## Files Location

After deployment, these files will be available at:
- `https://yourdomain.com/recal-form-embed.html` (iframe version)
- `https://yourdomain.com/recal-form-embed.js` (script version)

## Need Help?

See `EMBED_INSTRUCTIONS.md` for detailed documentation.

