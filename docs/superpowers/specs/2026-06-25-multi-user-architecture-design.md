# Multi-User Architecture Design
**Date:** 2026-06-25
**Status:** Approved

## Overview

Transform the JuKatha single-artist dashboard into an open multi-user creator platform. Any music creator can sign up, connect their own social media accounts, and see only their own data. Architecture: Supabase (auth + database with RLS) + Vercel API routes (platform API proxy + OAuth flows) + React frontend.

---

## 1. Data Model

All tables live in Supabase Postgres. Every table has Row Level Security enabled with the policy `user_id = auth.uid()` — the database enforces data isolation; no application-level ownership checks are needed.

### `profiles`
Extends Supabase's built-in `auth.users`. Created automatically on first sign-in.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | FK → auth.users.id, primary key |
| artist_name | text | |
| display_name | text | |
| location | text | |
| genre | text | |
| created_at | timestamptz | |

### `platform_connections`
One row per user per platform. Stores only the user-specific identifier — app-level API keys stay as Vercel environment variables.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | primary key |
| user_id | uuid | FK → auth.users.id |
| platform | text | youtube, spotify, instagram, tiktok, audiomack |
| credentials | jsonb | platform-specific identifiers (see below) |
| connected_at | timestamptz | |
| updated_at | timestamptz | |

**Credentials shape per platform:**
- `youtube` → `{ channel_id: string }`
- `spotify` → `{ artist_id: string }`
- `instagram` → `{ access_token: string, user_id: string }`
- `tiktok` → `{ access_token: string, open_id: string }`
- `audiomack` → `{ slug: string }`

App-level secrets (YouTube API key, Spotify client credentials, Instagram/TikTok app credentials, Audiomack consumer key/secret) remain as Vercel env vars shared across all users. Users never enter developer credentials.

### `daily_slate`
One row per user per calendar day.

| Column | Type |
|--------|------|
| id | uuid |
| user_id | uuid |
| date | date |
| gym | boolean |
| salon_duty | boolean |
| study | boolean |
| content_posted | boolean |
| verse_written | boolean |

Unique constraint: `(user_id, date)`.

### `content_posts`
User's content log.

| Column | Type |
|--------|------|
| id | uuid |
| user_id | uuid |
| title | text |
| type | text (freestyle, cover, original, bts, vocal-clip, collab) |
| platform | text |
| date | date |
| views | integer |
| likes | integer |
| shares | integer |
| comments | integer |

### `tracks`
Music releases per user.

| Column | Type |
|--------|------|
| id | uuid |
| user_id | uuid |
| title | text |
| type | text (single, collab) |
| featuring | text (nullable) |
| release_date | date |
| upc | text |
| isrc | text |
| genre | text |

### `track_distribution`
Per-track per-platform distribution status. No `user_id` column — access controlled via `tracks` JOIN.

| Column | Type |
|--------|------|
| id | uuid |
| track_id | uuid (FK → tracks.id) |
| platform | text |
| status | text (live, pending, unavailable) |
| streams | integer |

RLS policy: `EXISTS (SELECT 1 FROM tracks WHERE tracks.id = track_id AND tracks.user_id = auth.uid())`

### `milestones`
Tracks which phases are unlocked and which badges are earned per user.

| Column | Type |
|--------|------|
| id | uuid |
| user_id | uuid |
| phase | integer (1, 2, 3) |
| unlocked | boolean |
| badge_ids | jsonb (array of earned badge ids) |

---

## 2. Authentication

**Providers:** Google Sign-In + Magic Link (email). Both handled by Supabase Auth.

**Sign-in page** (`/signin`) — the only public route. Google button calls `supabase.auth.signInWithOAuth({ provider: 'google' })`. Magic link form calls `supabase.auth.signInWithOtp({ email })` and shows "Check your email" confirmation.

**Onboarding** (`/onboarding`) — shown once after first sign-in if no `profiles` row exists. Collects artist name, location, genre. Writes to `profiles` via Supabase JS client. Redirects to Dashboard on save.

**Session management** — `@supabase/supabase-js` handles session storage, refresh, and expiry. `AuthContext` wraps the entire app, listens to `supabase.auth.onAuthStateChange`, and exposes `{ user, session, loading }`.

**`ProtectedRoute` component** — reads from `AuthContext`. Shows spinner while loading. Redirects to `/signin` if no session. Renders children otherwise.

**Vercel API routes** — every frontend fetch to a Vercel route includes the Supabase JWT:
```
Authorization: Bearer <session.access_token>
```
Routes verify the JWT using `SUPABASE_JWT_SECRET` (Vercel env var), extract `user_id`, then look up that user's credentials from `platform_connections`.

---

## 3. Platform Connection Flow

### Simple ID connections (YouTube, Spotify, Audiomack)

The Connections page shows input fields. The user pastes their identifier:
- YouTube → Channel ID (from `youtube.com/channel/UCxxxxxx`)
- Spotify → Artist ID (from `open.spotify.com/artist/xxxxx`)
- Audiomack → Profile slug (from `audiomack.com/your-slug`)

The frontend writes directly to `platform_connections` via the Supabase JS client. RLS scopes the write to the signed-in user. No Vercel route involved.

### OAuth connections (Instagram, TikTok)

```
1.  User clicks "Connect Instagram" on Connections page
2.  Frontend calls GET /api/instagram/auth
      Header: Authorization: Bearer <jwt>
3.  Route verifies JWT → extracts user_id
4.  Generates: nonce = randomBytes(16), state = sign(user_id + "." + nonce, JWT_SECRET)
5.  Stores nonce in a short-lived HttpOnly cookie (10 min TTL)
6.  Redirects browser to Instagram OAuth URL with state param
7.  User approves on Instagram
8.  Instagram redirects to GET /api/instagram/callback?code=...&state=...
9.  Route verifies: signature valid + nonce matches cookie → extracts user_id
10. Exchanges code for access_token via Instagram API
11. Upserts { access_token, user_id } into platform_connections
      using Supabase service role key (SUPABASE_SERVICE_ROLE_KEY Vercel env var)
12. Redirects to /connections?connected=instagram
```

Same flow for TikTok. The `state` parameter carries user identity through the redirect. The service role key lets the callback write to the DB without needing the user's own JWT on the return leg.

---

## 4. Frontend Architecture

### New files

| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Singleton Supabase client (`createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`) |
| `src/context/AuthContext.tsx` | Auth state provider — `{ user, session, loading }` |
| `src/components/ProtectedRoute.tsx` | Redirects unauthenticated users to `/signin` |
| `src/pages/SignIn.tsx` | Google + Magic Link sign-in UI |
| `src/pages/Onboarding.tsx` | First-time profile setup |

### Updated route structure

```
/signin           → public
/onboarding       → session required, no profile yet
/ + all others    → ProtectedRoute → Layout → page
```

### Data fetching pattern

| Data type | Source |
|-----------|--------|
| User profile, slate, content, tracks, milestones | Supabase JS client directly (RLS filters automatically) |
| Live platform stats (YouTube subs, Spotify followers, etc.) | Vercel API routes with `Authorization: Bearer <token>` |

The `useLiveData` hook is updated to read `session.access_token` from `AuthContext` and include it in every fetch to Vercel routes.

### Migration from mock data

`src/data/mockData.ts` stays as a skeleton/fallback while pages are migrated. Pages are converted one at a time — each page stops importing from mock data once its Supabase queries are in place. The file is deleted in Phase 5.

---

## 5. Implementation Phases

### Phase 1 — Supabase setup
- Create Supabase project
- Configure Google OAuth and Magic Link in Supabase dashboard
- Create all 7 tables with RLS policies via SQL migrations
- Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` to Vercel env vars

### Phase 2 — Auth layer
- Install `@supabase/supabase-js`
- Build `src/lib/supabase.ts`, `AuthContext`, `ProtectedRoute`
- Build `SignIn` page (Google + Magic Link)
- Build `Onboarding` page
- Update `App.tsx` routing
- **End state:** App requires login, shows mock data after sign-in

### Phase 3 — Connections + platform credentials
- Update Connections page to read/write `platform_connections` from Supabase
- Update Instagram + TikTok OAuth routes with signed-state flow and service role DB write
- Update all Vercel API routes: verify JWT → look up user credentials → call platform API
- Analytics page: already reads from Vercel routes — automatically works per-user once routes are updated
- **End state:** Live platform stats and Analytics work per-user on Vercel

### Phase 4 — User data pages (one at a time)
- Accountability: daily_slate CRUD + streak calculation
- Content: content_posts CRUD
- Releases: tracks + track_distribution CRUD
- Revenue: computed from `track_distribution.streams × per-platform rate`. Stream counts are **manually entered** by the user from their distributor dashboard (DistroKid, etc.) — streaming platforms do not expose per-track earnings via their public APIs.
- Milestones + Badges: milestone progress computed from `platform_connections` live data; badge unlock logic runs on each Dashboard load
- Suggestions: rule-based, computed from the user's real data (e.g. "No content in 2 days" from `content_posts`, "TikTok views dropped" from live platform stats). No separate table needed — generated at query time.
- **End state:** All pages show real per-user data

### Phase 5 — Dashboard + cleanup
- Dashboard pulls live platform metrics (JWT-authenticated Vercel routes) + real slate/content/milestone summaries (Supabase)
- Delete `src/data/mockData.ts`
- **End state:** Fully multi-user, no mock data

---

## Environment Variables

### Vercel (server-side only)
```
SUPABASE_JWT_SECRET          # For verifying user JWTs in API routes
SUPABASE_SERVICE_ROLE_KEY    # For OAuth callbacks writing to DB
YOUTUBE_API_KEY              # Shared app-level key
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
INSTAGRAM_APP_ID
INSTAGRAM_APP_SECRET
TIKTOK_CLIENT_KEY
TIKTOK_CLIENT_SECRET
AUDIOMACK_CONSUMER_KEY
AUDIOMACK_CONSUMER_SECRET
```

### Vercel + local `.env` (client-side, safe to expose)
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```
