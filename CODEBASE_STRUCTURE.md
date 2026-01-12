# Codebase Structure Guide

This is a **Next.js 15** application built with **React 19** and **TypeScript**. Here's how everything is organized:

## 🏗️ Project Architecture

### **Next.js App Router Structure**
This project uses Next.js's **App Router** (not the old Pages Router). The key difference:
- Files in `src/app/` automatically become routes
- `page.tsx` = the actual page component
- `layout.tsx` = wrapper that applies to all pages
- `route.ts` = API endpoints

---

## 📁 Root Directory Files

```
Recal-Assessment-Landing-Page/
├── package.json          # Project dependencies & scripts
├── tsconfig.json         # TypeScript configuration
├── next.config.ts        # Next.js configuration
├── postcss.config.mjs    # PostCSS config (for Tailwind CSS)
├── eslint.config.mjs     # ESLint rules (code quality)
└── vercel.env            # Environment variables template
```

**What they do:**
- **package.json**: Lists all npm packages (React, Next.js, Google APIs, etc.)
- **tsconfig.json**: TypeScript settings (strict mode, path aliases like `@/*`)
- **next.config.ts**: Next.js build settings
- **postcss.config.mjs**: Processes CSS (Tailwind CSS)
- **eslint.config.mjs**: Linting rules to catch code errors

---

## 📂 `/src` - Main Source Code

### **`src/app/`** - Next.js App Router Pages & Routes

```
src/app/
├── layout.tsx              # Root layout (wraps ALL pages)
├── page.tsx                # Homepage (landing page)
├── globals.css             # Global styles (Tailwind + custom CSS)
├── favicon.ico             # Site icon
│
├── admin/                  # Admin pages (protected routes)
│   └── embed-generator/
│       └── page.tsx        # Tool to generate embed codes for partners
│
└── api/                    # API Routes (backend endpoints)
    ├── record-landing-signup/
    │   └── route.ts        # Records form submissions to Google Sheets
    ├── rbi-result/
    │   └── route.ts        # Fetches assessment results from Google Sheets
    └── latest-signups/
        └── route.ts        # Gets recent signups (admin feature)
```

**How it works:**
- `src/app/page.tsx` → `https://yourdomain.com/`
- `src/app/admin/embed-generator/page.tsx` → `https://yourdomain.com/admin/embed-generator`
- `src/app/api/rbi-result/route.ts` → `https://yourdomain.com/api/rbi-result` (POST endpoint)

### **`src/components/`** - Reusable React Components

```
src/components/
└── DiagnosticModal.tsx     # The main RBI assessment modal/form
```

**What it does:**
- Multi-step form for the breath assessment
- Handles form submission to Google Forms
- Fetches results from the API
- Displays results with score, grade, and badge

### **`src/lib/`** - Utility Functions

```
src/lib/
└── gtag.ts                 # Google Analytics helper functions
```

---

## 📂 `/public` - Static Assets

```
public/
├── assets/                 # Partner logos (SVG files)
│   ├── Mountain Madness.svg
│   ├── RMI.svg
│   └── ... (30+ partner logos)
│
├── fonts/                  # Custom fonts
│   └── fonnts.com-Rogue_Sans_Ext_Bold_It.otf
│
├── recal-form-embed.html   # Standalone embed HTML (for iframes)
├── recal-form-embed.js     # JavaScript embed script
│
└── hero-image.png          # Landing page hero image
```

**What they do:**
- **assets/**: Partner company logos displayed on the landing page
- **fonts/**: Custom "Rogue Sans Ext" font used throughout the site
- **recal-form-embed.***: Files for embedding the form on partner websites

---

## 📂 `/design` - Design Tokens (Figma Export)

```
design/
├── nodes.json              # Full Figma design structure
├── styles.json              # Colors, fonts, spacing
└── ... (other Figma exports)
```

**What it does:**
- Exported from Figma design files
- Used by `scripts/extract-figma-tokens.mjs` to generate CSS variables
- Keeps design system in sync with code

---

## 📂 `/scripts` - Build Scripts

```
scripts/
└── extract-figma-tokens.mjs  # Converts Figma JSON to CSS variables
```

**Usage:**
```bash
npm run tokens  # Extracts design tokens from Figma files
```

---

## 🔄 How Data Flows

### **1. User Submits Assessment Form**

```
User fills form in DiagnosticModal.tsx
    ↓
Submits to Google Forms (via POST)
    ↓
Google Apps Script calculates score/grade/badge
    ↓
Results written to Google Sheet
    ↓
Frontend polls /api/rbi-result
    ↓
API reads from Google Sheet
    ↓
Results displayed in modal
```

### **2. Landing Page Signup**

```
User enters name/email on homepage
    ↓
Submits to /api/record-landing-signup
    ↓
API writes to Google Sheet
    ↓
Google Form opens in new tab
```

---

## 🛠️ Key Technologies

1. **Next.js 15** - React framework with server-side rendering
2. **React 19** - UI library
3. **TypeScript** - Type-safe JavaScript
4. **Tailwind CSS** - Utility-first CSS framework
5. **Google Sheets API** - Reads/writes assessment data
6. **Google Analytics** - Tracks user events
7. **Framer Motion** - Animations (if used)

---

## 🔐 Environment Variables

Stored in `.env.local` (not in git) or Vercel dashboard:

- `GOOGLE_SHEET_ID` - Google Sheet ID
- `GOOGLE_CLIENT_EMAIL` - Service account email
- `GOOGLE_PRIVATE_KEY` - Service account private key
- `NEXT_PUBLIC_GA_ID` - Google Analytics ID
- `NEXT_PUBLIC_GOOGLE_FORM_URL` - Google Form URL

---

## 📝 File Naming Conventions

- **`page.tsx`** = A page/route (Next.js convention)
- **`layout.tsx`** = Layout wrapper (Next.js convention)
- **`route.ts`** = API endpoint (Next.js convention)
- **`.tsx`** = TypeScript + JSX (React components)
- **`.ts`** = TypeScript (utilities, configs)
- **`.css`** = Stylesheets
- **`.mjs`** = ES Module JavaScript

---

## 🚀 Running the Project

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm run start    # Run production build
npm run lint     # Check for code errors
```

---

## 🎯 Key Features

1. **Landing Page** (`src/app/page.tsx`)
   - Hero section with partner logos
   - Form to collect name/email
   - Opens assessment modal

2. **Assessment Modal** (`src/components/DiagnosticModal.tsx`)
   - Multi-step form (BOLT, CO2TT, MBT, ROM, LOM)
   - Submits to Google Forms
   - Fetches and displays results

3. **API Routes** (`src/app/api/*`)
   - Record signups
   - Fetch assessment results
   - Read from Google Sheets

4. **Embed Generator** (`src/app/admin/embed-generator/page.tsx`)
   - Admin tool to generate embed codes
   - Creates partner-specific tracking

---

## 🔍 Path Aliases

In `tsconfig.json`, `@/*` maps to `src/*`:

```typescript
import DiagnosticModal from "@/components/DiagnosticModal";
// Instead of: import DiagnosticModal from "../../components/DiagnosticModal";
```

---

## 📦 Dependencies Breakdown

**Production:**
- `next` - Framework
- `react` / `react-dom` - UI library
- `googleapis` - Google Sheets API client
- `framer-motion` - Animations

**Development:**
- `typescript` - Type checking
- `tailwindcss` - CSS framework
- `eslint` - Code linting

---

This structure follows Next.js 15 best practices and keeps code organized, maintainable, and scalable! 🎉

