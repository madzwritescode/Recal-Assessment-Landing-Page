# Maintenance Mode

The landing page can be put in **maintenance mode** so the live site shows an “under maintenance” message while you develop and test locally.

## How it works

- **Production (Vercel):** If `NEXT_PUBLIC_MAINTENANCE_MODE` is set to `true` or `1`, visitors see a maintenance page instead of the normal site.
- **Local:** Don’t set the variable (or set it to `false`). You’ll see the normal site at `http://localhost:3000` and can work as usual.

## Turn maintenance mode ON (production)

1. In the [Vercel dashboard](https://vercel.com), open your project.
2. Go to **Settings → Environment Variables**.
3. Add (or edit):
   - **Name:** `NEXT_PUBLIC_MAINTENANCE_MODE`
   - **Value:** `true`
4. **Redeploy** the project (e.g. trigger a new deployment or push a commit).  
   Env vars are applied at build time, so a new build is required.

## Turn maintenance mode OFF (go live again)

1. In Vercel, either:
   - Set `NEXT_PUBLIC_MAINTENANCE_MODE` to `false`, or  
   - Delete the variable.
2. **Redeploy** the project.

## Local development

- Do **not** add `NEXT_PUBLIC_MAINTENANCE_MODE` to `.env.local`, or set it to `false`.
- Run `npm run dev` and use the normal landing page and RBI flow.
- When you’re happy with changes, commit, push, and then turn maintenance mode off in Vercel and redeploy to go live.

## Optional: test maintenance view locally

To see the maintenance page on your machine:

1. In the project root, create or edit `.env.local`.
2. Add: `NEXT_PUBLIC_MAINTENANCE_MODE=true`
3. Restart the dev server (`npm run dev`).
4. Remove the variable or set it to `false` when you want the normal site back.
