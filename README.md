# 🔥 Campfire

Team status board — what's everyone working on right now?

Static site hosted on GitHub Pages. Data lives in Supabase (free tier).

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `schema.sql`
3. Copy your project URL and anon key from Settings → API

### 2. Configure

Edit `config.js` with your Supabase details:

```js
window.CAMPFIRE_CONFIG = {
  supabaseUrl: 'https://xxxxx.supabase.co',
  supabaseKey: 'eyJ...',
  teamId: '1'
};
```

### 3. Deploy

Push to GitHub and enable Pages (Settings → Pages → Deploy from branch → `main`).

Live at: `https://booksvp.github.io/campfire/`

## API Usage

Post a status update directly via Supabase REST API:

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/rest/v1/status_updates' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"team_id": 1, "team_user_id": 1, "status": "Deep work on pricing"}'
```

With expiry:

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/rest/v1/status_updates' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"team_id": 1, "team_user_id": 1, "status": "In a meeting", "expires_at": "2026-03-23T15:00:00Z"}'
```

## Architecture

- **GitHub Pages** → static HTML/CSS/JS
- **Supabase** → Postgres database + auto-generated REST API
- **No backend server** → zero hosting cost
