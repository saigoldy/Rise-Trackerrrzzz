# Multi-User Social Connections Design

**Date:** 2026-06-25
**Status:** Approved

## Overview

Risetrack currently runs as a single-artist app — all platform credentials live in `.env` and point to one account. This spec covers making the platform fully multi-user: each user registers their own developer apps with each social platform, stores their own credentials in Supabase, and sees only their own stats.

---

## Decisions

| Question | Decision |
|---|---|
| How users connect accounts | Full OAuth for all platforms (each user registers their own app) |
| Who manages API keys | Each user manages their own (no shared platform-owner keys) |
| Platform connections required | All optional |
| Where connection happens | Step in onboarding (skippable) + Connections page always available |
| Stats fetching | Daily scheduled fetch (Vercel Cron) + manual Refresh button |

---

## 1. Data Model

### `platform_connections` (existing — no schema change)

The existing table already supports multi-user via `user_id`. The `credentials` JSONB field stores all per-platform config.

**Credentials shape per platform:**

| Platform | Fields |
|---|---|
| YouTube | `api_key`, `channel_id` |
| Spotify | `client_id`, `client_secret`, `artist_id` |
| Instagram | `app_id`, `app_secret`, `access_token`, `user_id` |
| TikTok | `client_key`, `client_secret`, `access_token`, `open_id` |
| Audiomack | `consumer_key`, `consumer_secret`, `slug` |

Instagram and TikTok `access_token` fields are populated after OAuth. All other fields are entered manually by the user.

### `platform_snapshots` (new table)

Stores historical stats snapshots for trend charts and fast dashboard loads.

```sql
CREATE TABLE platform_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  platform text not null,
  fetched_at timestamptz not null default now(),
  metrics jsonb not null default '{}'
);

CREATE INDEX ON platform_snapshots (user_id, platform, fetched_at DESC);
```

**RLS:** Users can only read their own rows. Only the service role (used by the server) can insert.

**`metrics` JSONB shape per platform:**

| Platform | Example |
|---|---|
| YouTube | `{ "subscribers": 12000, "views": 500000, "video_count": 45 }` |
| Spotify | `{ "followers": 8000, "popularity": 62, "monthly_listeners": 25000 }` |
| Instagram | `{ "followers": 5000, "media_count": 120 }` |
| TikTok | `{ "followers": 15000, "likes": 80000, "video_count": 67 }` |
| Audiomack | `{ "followers": 3000, "plays": 120000, "songs": 15 }` |

### `profiles` table addition

Add `onboarding_complete boolean not null default false` if not already present, so returning users bypass the onboarding wizard.

---

## 2. Connections Page UI

Each platform card has two states:

**Not configured**
Shows credential input fields for that platform plus a link to the relevant developer portal. User fills in fields and clicks "Save". Credentials are written to `platform_connections` via the Supabase client (user JWT, RLS enforced).

**Configured — no OAuth needed (YouTube, Spotify, Audiomack)**
After saving, card shows a green "Connected" badge with the channel/artist identifier. An "Edit" button lets them update credentials.

**Configured — OAuth needed (Instagram, TikTok)**
After saving the App ID/Secret, a "Connect Account" button appears. Clicking it starts the OAuth flow. On completion the card shows "Connected" with their username/follower count.

**Developer portal links per platform:**

| Platform | Developer portal |
|---|---|
| YouTube | console.cloud.google.com → APIs → YouTube Data API v3 |
| Spotify | developer.spotify.com → Create App |
| Instagram | developers.facebook.com → My Apps → Instagram Basic Display |
| TikTok | developers.tiktok.com → Manage Apps |
| Audiomack | audiomack.com/oauth-clients |

---

## 3. Onboarding Flow

The existing single-form onboarding is extended to a **3-step wizard**:

**Step 1 — Profile** *(existing)*
Artist name, location, genre. Writes to `profiles`. Unchanged.

**Step 2 — Connect Platforms** *(new, skippable)*
Shows all 5 platforms with their credential input fields inline. Identical fields to the full Connections page but without the detailed developer portal instructions — just field labels with a small tooltip ("Where do I find this?"). "Skip for now" link is prominent at the bottom. Each platform saves independently — partial completion is preserved.

**Step 3 — Done**
Summary of connected platforms. "Go to Dashboard" button. Sets `onboarding_complete = true` on `profiles`.

A step indicator (`1 → 2 → 3`) sits at the top of the wizard. Each step writes to Supabase before advancing so progress is never lost on drop-off.

On subsequent logins, users with `onboarding_complete = true` skip the wizard entirely.

---

## 4. Server — Per-User Credential Lookup

### Authentication middleware

All platform API routes get a `requireAuth` middleware:
1. Reads `Authorization: Bearer <jwt>` header
2. Verifies JWT via `supabase.auth.getUser(token)`
3. Attaches `req.userId` to the request
4. Returns `401` if missing or invalid

### Credential lookup helper

```js
// server/lib/credentials.js
async function getCredentials(userId, platform) {
  const { data, error } = await supabase
    .from('platform_connections')
    .select('credentials')
    .eq('user_id', userId)
    .eq('platform', platform)
    .single();
  if (error || !data) throw new Error(`No credentials for ${platform}`);
  return data.credentials;
}
```

All platform route handlers call `getCredentials(req.userId, 'youtube')` etc. instead of `process.env`.

### OAuth flow change (Instagram, TikTok)

**Before:** `GET /api/instagram/auth` reads `INSTAGRAM_APP_ID` from `.env`

**After:**
1. Frontend sends JWT when initiating OAuth: `GET /api/instagram/auth` with `Authorization` header
2. Server calls `getCredentials(req.userId, 'instagram')` to get `app_id` and `app_secret`
3. Builds redirect URL with those credentials
4. Encodes `user_id` in the OAuth `state` parameter
5. Callback decodes `state`, looks up user, writes `access_token` + `user_id` back to `platform_connections.credentials`

### `.env` going forward

Only holds infrastructure config — no platform credentials:

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
PORT=3001
SESSION_SECRET=
CRON_SECRET=
OAUTH_STATE_SECRET=
```

---

## 5. Scheduled Fetch & Manual Refresh

### Daily cron (Vercel Cron)

Route: `GET /api/cron/fetch-stats`
Protected by `Authorization: Bearer <CRON_SECRET>` header check.

Logic:
1. Query all `platform_connections` rows (all users, all platforms)
2. For each row, fetch stats using stored credentials
3. Bulk-insert rows into `platform_snapshots`

`vercel.json` triggers this daily:
```json
{
  "crons": [{ "path": "/api/cron/fetch-stats", "schedule": "0 6 * * *" }]
}
```

### Manual refresh

Route: `POST /api/stats/refresh` (requires auth)
Fetches stats for the requesting user's connected platforms only and inserts new `platform_snapshots` rows. Returns the fresh metrics so the frontend can update without a separate query.

### Dashboard data source

The dashboard reads the **latest `platform_snapshots` row per platform** for the current user directly from Supabase — no live API calls on page load.

The Analytics 30-day trend chart reads the last 30 `platform_snapshots` rows per platform ordered by `fetched_at DESC`.

---

## 6. Out of Scope

- Token refresh flows (access tokens expire; auto-refresh is a follow-on)
- Platform credential encryption at rest (Supabase encrypts storage at rest; field-level encryption is a follow-on)
- Admin dashboard for viewing all users' connection status
- Email notifications when a platform disconnects or token expires
