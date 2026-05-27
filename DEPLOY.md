# Deployment Guide — Vercel + Auto-Deploy

This project is a static Vite MPA. Vercel can host it as-is. Once linked to GitHub, every push triggers a fresh build + deploy automatically.

---

## 1 · One-time setup

### 1.1 Push to GitHub

```bash
cd /path/to/optics
git add -A
git commit -m "Initial commit: 13 modules + infra"

gh repo create encyclopedia-of-color --public --source=. --remote=origin --push
# …or use the GitHub UI to create the repo, then:
#   git remote add origin git@github.com:<you>/encyclopedia-of-color.git
#   git push -u origin main
```

### 1.2 Connect Vercel

Easiest path (web UI):

1. Visit https://vercel.com/new
2. "Import Git Repository" → pick `encyclopedia-of-color`
3. Framework Preset: **Vite** (auto-detected)
4. Build Command: `npm run build`     ← already in `vercel.json`
5. Output Directory: `dist`           ← already in `vercel.json`
6. Click **Deploy**

CLI alternative:

```bash
npm i -g vercel
vercel login
vercel link              # one-time: link this folder to a project
vercel --prod            # ship to production
```

After linking, the project gets a stable URL like:
`https://encyclopedia-of-color.vercel.app`

### 1.3 Custom domain (optional)

In the Vercel dashboard → **Settings → Domains**, add `encyclopedia.color`
(or any domain you own). Vercel issues an SSL certificate automatically.

If you change the production origin, also update `SITE.origin` in
`scripts/lib/meta-schema.ts` so OG tags emit the new absolute URL.

---

## 2 · Auto-deploy on every commit

Once GitHub is connected, the cycle is:

```
edit a module locally
   ↓
git add . && git commit -m "tweak filament module"
   ↓
git push
   ↓
Vercel builds → preview URL on every push
                   → production URL on push to `main`
```

Every push gets a **unique preview URL** for review.
Push to `main` (or your "Production Branch" in Vercel settings) updates the live site.

### Build steps that run on Vercel

The `vercel.json` `buildCommand: "npm run build"` invokes:

1. **`tsx scripts/inject-meta.ts`** — refreshes every module's `<head>` meta block from `meta.json`. Authors only edit `meta.json`; Vercel handles the rest.
2. **`tsc --noEmit`** — type check. Build fails on any TS error.
3. **`vite build`** — main MPA bundle to `dist/`.
4. **`vite build --config vite.embed.config.ts`** — the `embed/loader.js` IIFE bundle.

OG static images in `public/og/` are copied to `dist/og/` automatically by Vite's publicDir handling.

### What is *not* run on Vercel

- `scripts/predownload-icloud.mjs` — macOS-only, exits early on Linux.
- `scripts/generate-og.ts` — generates fresh OG PNGs locally with headless Chromium. Run `npm run build:og` on your laptop after meaningful visual changes, then commit `public/og/*.png` so Vercel ships them.
- `scripts/og-server.ts` — the dynamic OG server is a separate service. To deploy it as a Vercel Serverless Function, see §3.

### Environment variables

`vercel.json` sets `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` at install time so Vercel doesn't download a 300 MB Chromium that isn't needed for the build.

---

## 3 · (Optional) Dynamic OG server on Vercel

The `scripts/og-server.ts` standalone HTTP server can be ported to a Vercel
Serverless Function for *per-state* OG cards (`/og/<id>.png?theta1=42`).

Sketch (`api/og/[...path].ts`):

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
// Use @sparticuz/chromium + puppeteer-core (much smaller than full Playwright)
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // …open headless Chromium, navigate to /modules/<id>/?og=1&<state>, screenshot, return PNG
}
```

Skipped here because the static cards in `public/og/` already cover the 13 published modules at their default hero state. Add this when you start sharing deep-state URLs heavily.

---

## 4 · Workflow when adding a new module

```bash
# 1. Scaffold from the catalog
npm run new-module -- light-propagation/inverse-square --tier=reference --bloom=L2

# 2. Implement main.ts and refine meta.json
$EDITOR src/modules/light-propagation/inverse-square/main.ts
$EDITOR src/modules/light-propagation/inverse-square/meta.json

# 3. Refresh meta tags (also runs automatically before dev / build)
npm run inject-meta

# 4. Generate the OG card
npm run dev &              # in another terminal
npm run build:og

# 5. Verify
npm run verify:og --no-image-fetch
npm run typecheck

# 6. Ship
git add -A
git commit -m "add light-propagation/inverse-square module"
git push
```

Vercel picks it up from step 6 and the new module is live within ~60 seconds.

---

## 5 · Rollback

In the Vercel dashboard → **Deployments**, click any past deployment → "Promote to Production". Instant rollback.

Or from the CLI: `vercel rollback <deployment-url>`.

---

## 6 · Monitoring

- **Vercel Analytics** (free tier) — enable in dashboard for traffic per module.
- **Vercel Logs** — see build errors, function invocations.
- **Custom**: deploy a small "ping" job that hits `/healthz` (currently 200 OK redirect) every 5 minutes.

The repo's `package.json` already wires `npm run verify:og` as a self-test you can plug into a GitHub Action for pre-merge checks.
