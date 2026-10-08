# Portfolieo

A fast, polished portfolio website with Meta Ads strategy, built with vanilla ES modules and Vite.

## Tech Stack

- **HTML5 + CSS3 + JavaScript (ES Modules)** — no build step at runtime
- **Vite** — fast production builds
- **Three.js** — 3D particle globe in the hero section
- **Motion** — spring animations
- **Supabase** — database (enquiries, purchases, admin content)
- **LocalStorage** — client-side fallback (zero-config local development)

## Features

- 🌟 Particle globe 3D morph (Three.js + GSAP-like spring motion)
- 📱 Fully responsive (desktop + mobile)
- 📊 Works gallery with modal preview
- 💬 Contact/enquiry form with live updates
- 🛒 Checkout/pricing cards with purchase tracking
- 📈 Tracking integration (Firebase/GA4)
- ⚡ Skeleton loading for images

## Deployment

This project can be deployed to GitHub, Firebase, and Vercel.

### Option A: Vercel (Recommended)

The project is already linked to Vercel (`.vercel/project.json`).

1. Push this repo to GitHub (`origin` → `https://github.com/OtakuChuppy/portfolieo.git`)
2. Set build-time env vars (`vercel env add <name> production`):
   - `VITE_SUPABASE_URL` — Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — Supabase anon key
   - `VITE_STRIPE_PUBLISHABLE_KEY` / `VITE_STRIPE_PUBLISHABLE_KEY_2` — Stripe publishable keys
3. Deploy:

```bash
vercel --prod
```

`vercel.json` runs `npm run build` and serves `dist/` with clean URLs (`/admin`, `/checkout`).

**Live:** https://md-r-h-chuppy.vercel.app

### Option B: Firebase Hosting

1. Log in and deploy:

```bash
firebase login
firebase deploy --only hosting
```

`firebase.json` serves `dist/`, rewrites unknown routes to `index.html` (SPA), and sets security + cache headers. Run `npm run build` first, or use `./deploy.sh --firebase`.

The repo is linked to Firebase project `chuppi-protfolieo-firebase` via `.firebaserc`.

**Live:** https://chuppi-protfolieo-firebase.web.app

### Option C: GitHub Pages (CI/CD)

1. Push to `main` — `.github/workflows/deploy.yml` builds and deploys automatically
2. In the repo: **Settings → Pages → Source: GitHub Actions** (enabled)
3. The build receives all four `VITE_*` values from **Settings → Actions → Variables** and builds with `--base=/portfolieo/` so assets resolve under the project subpath

**Live:** https://otakuchuppy.github.io/portfolieo/

### Any Static Host

1. Run `npm run build`
2. Upload `dist/` to any static host (Netlify, Cloudflare Pages, etc.)

## Local Development

```bash
npm install
npm run dev
```


## Stripe (Publishable Key)

> **SECURITY:** Publishable keys can safely live in frontend code. Do not commit `.env` to git.

Get your publishable key from your Stripe dashboard (Developers → API keys). Current keys:
- `VITE_STRIPE_PUBLISHABLE_KEY` = `sb_publishable_6gk7AGDZYS7NkHIX8nwoyQ_zYXJ9H1Y`
- `VITE_STRIPE_PUBLISHABLE_KEY_2` = `sb_publishable_QiFiwgevChbNjCsez0B8lA_Mnq3KmD3`

Add to Vercel environment variables if using Stripe on the live site.

Open `admin.html` in your browser. Login is handled via Firebase Anonymous Auth (or Supabase auth in production).

## Database Schema

The project uses Supabase with the following tables:

- `enquiries` — contact form submissions
- `purchases` — checkout orders
- `content` — admin-editable content (works, pricing, skills, stats)

### Default Admin Account

Create a new admin user via Supabase Auth with email/password. No default credentials are pre-seeded.

## License

MIT
