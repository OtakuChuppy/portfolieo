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

### Option 1: Vercel (Recommended)

1. Push this repo to GitHub
2. Import to Vercel
3. Add environment variables:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key
4. Deploy

### Option 2: Static Hosting

1. Run `npm run build`
2. Deploy `dist/` to any static host (Netlify, GitHub Pages, Cloudflare Pages, etc.)

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
