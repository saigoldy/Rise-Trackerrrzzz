# Multi-User Social Connections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Risetrack fully multi-user — each user stores their own platform API credentials in Supabase, sees only their own stats, and goes through a guided onboarding wizard.

**Architecture:** The `api/` directory holds Vercel serverless functions (production); `api/_lib/auth.js` already has `verifyUser`, `getPlatformCreds`, and signed OAuth state helpers. The changes are: (1) finish wiring all handlers to use per-user credentials instead of env vars, (2) rebuild the Connections UI to collect multi-field credentials per platform, (3) add a 3-step onboarding wizard, (4) add a `platform_snapshots` table and cron/refresh routes to store historical stats, (5) update the Dashboard to read from snapshots instead of making live API calls.

**Tech Stack:** React + TypeScript (frontend), Vercel serverless functions (Node.js ESM, `api/`), Supabase (Postgres + RLS + service role), Vite proxy in dev (routes `/api` → Express server at `:3001`)

## Note on Local Development

In development, Vite proxies `/api` to the Express server at `localhost:3001` (`server/`), which still reads platform credentials from `.env`. The `api/` Vercel functions are production only. This means the per-user credential changes in Tasks 2–3 only take effect in production (Vercel). To test OAuth and credential flows locally, either: (a) use `vercel dev` instead of `npm run dev`, which runs the `api/` functions directly; or (b) after deploying to Vercel, test on the preview URL.

---

## Global Constraints

- All `api/` files use ESM (`import`/`export default`), not CommonJS.
- All `server/` files use CommonJS (`require`/`module.exports`) — keep consistent with existing.
- Supabase RLS must enforce user ownership on every table — service role bypasses RLS only in server-side cron/refresh.
- Never log or expose credential values (API keys, secrets) in server responses.
- The Vercel Hobby plan allows 12 serverless functions. Current count is 6. Adding `api/cron/fetch-stats.js` and `api/stats/refresh.js` brings total to 8 — within limit.
- `OAUTH_STATE_SECRET`, `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` are the only platform-related env vars that remain after this work.

---

### Task 1: DB Migration — `platform_snapshots` + `onboarding_complete`

**Files:**
- Create: `supabase/migrations/002_multi_user.sql`

**Interfaces:**
- Produces: `platform_snapshots` table (columns: `id`, `user_id`, `platform`, `fetched_at`, `metrics jsonb`); `profiles.onboarding_complete boolean`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/002_multi_user.sql`:

```sql
-- Add onboarding_complete to profiles
alter table profiles
  add column if not exists onboarding_complete boolean not null default false;

-- platform_snapshots: historical stats per user per platform
create table platform_snapshots (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references profiles(id) on delete cascade,
  platform    text        not null,
  fetched_at  timestamptz not null default now(),
  metrics     jsonb       not null default '{}'
);

create index on platform_snapshots (user_id, platform, fetched_at desc);

alter table platform_snapshots enable row level security;

-- Users can read their own snapshots; only service role can insert
create policy "users read own snapshots"
  on platform_snapshots for select
  using (user_id = auth.uid());
```

- [ ] **Step 2: Apply the migration**

Open the Supabase dashboard → SQL Editor → paste the migration SQL → Run.

Or if using the Supabase CLI:
```bash
supabase db push
```

- [ ] **Step 3: Verify the schema**

In Supabase dashboard → Table Editor, confirm:
- `profiles` table has `onboarding_complete` column (boolean, default false)
- `platform_snapshots` table exists with the correct columns and RLS policy

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_multi_user.sql
git commit -m "feat: add platform_snapshots table and onboarding_complete to profiles"
```

---

### Task 2: Add `api/_lib/platformFetch.js` — Pure Per-User Stats Fetchers

**Files:**
- Create: `api/_lib/platformFetch.js`

**Interfaces:**
- Consumes: credentials objects shaped as defined in spec (e.g. `{ api_key, channel_id }` for YouTube)
- Produces: `fetchStats(platform, creds)` → `Promise<object>` — metrics object for that platform

- [ ] **Step 1: Create `api/_lib/platformFetch.js`**

```js
import { createHmac, randomBytes } from 'node:crypto'

// YouTube — creds: { api_key, channel_id }
export async function fetchYouTubeStats(creds) {
  const url = new URL('https://www.googleapis.com/youtube/v3/channels')
  url.searchParams.set('part', 'statistics')
  url.searchParams.set('id', creds.channel_id)
  url.searchParams.set('key', creds.api_key)

  const r = await fetch(url.toString())
  if (!r.ok) throw new Error(`YouTube API error ${r.status}`)
  const d = await r.json()
  const ch = d.items?.[0]?.statistics
  if (!ch) throw new Error('Channel not found')
  return {
    subscribers: Number(ch.subscriberCount ?? 0),
    views: Number(ch.viewCount ?? 0),
    video_count: Number(ch.videoCount ?? 0),
  }
}

// Spotify — creds: { client_id, client_secret, artist_id }
export async function fetchSpotifyStats(creds) {
  const encoded = Buffer.from(`${creds.client_id}:${creds.client_secret}`).toString('base64')
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${encoded}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) throw new Error('Spotify token exchange failed')

  const r = await fetch(`https://api.spotify.com/v1/artists/${creds.artist_id}`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  if (!r.ok) throw new Error(`Spotify API error ${r.status}`)
  const d = await r.json()
  return {
    followers: d.followers?.total ?? 0,
    popularity: d.popularity ?? 0,
    monthly_listeners: d.followers?.total ?? 0,
  }
}

// Instagram — creds: { app_id, app_secret, access_token, user_id }
export async function fetchInstagramStats(creds) {
  if (!creds.access_token) throw new Error('Instagram not connected via OAuth')
  const r = await fetch(
    `https://graph.instagram.com/me?fields=followers_count,media_count&access_token=${creds.access_token}`
  )
  if (!r.ok) throw new Error(`Instagram API error ${r.status}`)
  const d = await r.json()
  return {
    followers: d.followers_count ?? 0,
    media_count: d.media_count ?? 0,
  }
}

// TikTok — creds: { client_key, client_secret, access_token, open_id }
export async function fetchTikTokStats(creds) {
  if (!creds.access_token) throw new Error('TikTok not connected via OAuth')
  const r = await fetch(
    'https://open.tiktokapis.com/v2/user/info/?fields=follower_count,video_count,like_count',
    { headers: { Authorization: `Bearer ${creds.access_token}`, 'Content-Type': 'application/json' } }
  )
  if (!r.ok) throw new Error(`TikTok API error ${r.status}`)
  const d = await r.json()
  const info = d.data?.user ?? {}
  return {
    followers: info.follower_count ?? 0,
    likes: info.like_count ?? 0,
    video_count: info.video_count ?? 0,
  }
}

// Audiomack — creds: { consumer_key, consumer_secret, slug }
function buildOAuth1Header(method, url, consumerKey, consumerSecret) {
  const nonce = randomBytes(16).toString('hex')
  const ts = Math.floor(Date.now() / 1000).toString()
  const params = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: ts,
    oauth_version: '1.0',
  }
  const paramStr = Object.entries(params).sort()
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  const base = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`
  const sig = createHmac('sha1', `${encodeURIComponent(consumerSecret)}&`).update(base).digest('base64')
  params.oauth_signature = sig
  return 'OAuth ' + Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`).join(', ')
}

export async function fetchAudiomackStats(creds) {
  const url = `https://api.audiomack.com/v1/artist/${creds.slug}`
  const auth = buildOAuth1Header('GET', url, creds.consumer_key, creds.consumer_secret)
  const r = await fetch(url, { headers: { Authorization: auth } })
  if (!r.ok) throw new Error(`Audiomack API error ${r.status}`)
  const d = await r.json()
  return {
    followers: d.results?.followers ?? 0,
    plays: d.results?.plays ?? 0,
    songs: d.results?.song_count ?? 0,
  }
}

// Dispatcher
export async function fetchStats(platform, creds) {
  switch (platform) {
    case 'youtube':   return fetchYouTubeStats(creds)
    case 'spotify':   return fetchSpotifyStats(creds)
    case 'instagram': return fetchInstagramStats(creds)
    case 'tiktok':    return fetchTikTokStats(creds)
    case 'audiomack': return fetchAudiomackStats(creds)
    default: throw new Error(`Unknown platform: ${platform}`)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/_lib/platformFetch.js
git commit -m "feat: add per-user platform stats fetchers"
```

---

### Task 3: Update `api/` Handlers to Use Per-User Credentials

**Files:**
- Modify: `api/youtube/[endpoint].js`
- Modify: `api/spotify/[endpoint].js`
- Modify: `api/instagram/[endpoint].js`
- Modify: `api/tiktok/[endpoint].js`
- Modify: `api/audiomack/[endpoint].js`

**Interfaces:**
- Consumes: `verifyUser`, `getPlatformCreds`, `signOAuthState`, `verifyOAuthState`, `supabaseAdmin` from `../_lib/auth.js`
- Consumes: `fetchYouTubeStats`, `fetchSpotifyStats`, etc. from `../_lib/platformFetch.js`

- [ ] **Step 1: Replace `api/youtube/[endpoint].js`**

```js
import { verifyUser, getPlatformCreds } from '../_lib/auth.js'
import { fetchYouTubeStats } from '../_lib/platformFetch.js'

async function channel(req, res, creds) {
  const stats = await fetchYouTubeStats(creds)
  res.json(stats)
}

async function videos(req, res, creds) {
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
  searchUrl.searchParams.set('part', 'id')
  searchUrl.searchParams.set('channelId', creds.channel_id)
  searchUrl.searchParams.set('maxResults', '10')
  searchUrl.searchParams.set('order', 'date')
  searchUrl.searchParams.set('type', 'video')
  searchUrl.searchParams.set('key', creds.api_key)

  const searchRes = await fetch(searchUrl.toString())
  if (!searchRes.ok) return res.status(searchRes.status).json({ error: 'YouTube search error' })

  const searchData = await searchRes.json()
  const ids = (searchData.items ?? []).map(i => i.id.videoId).join(',')
  if (!ids) return res.json([])

  const statsUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
  statsUrl.searchParams.set('part', 'snippet,statistics')
  statsUrl.searchParams.set('id', ids)
  statsUrl.searchParams.set('key', creds.api_key)

  const statsRes = await fetch(statsUrl.toString())
  const statsData = await statsRes.json()

  res.json((statsData.items ?? []).map(v => ({
    id: v.id,
    title: v.snippet.title,
    published: v.snippet.publishedAt,
    thumbnail: v.snippet.thumbnails?.medium?.url ?? '',
    views: Number(v.statistics.viewCount ?? 0),
    likes: Number(v.statistics.likeCount ?? 0),
    comments: Number(v.statistics.commentCount ?? 0),
  })))
}

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'youtube')
    const { endpoint } = req.query
    if (endpoint === 'channel') return await channel(req, res, creds)
    if (endpoint === 'videos')  return await videos(req, res, creds)
    res.status(404).json({ error: 'Unknown endpoint' })
  } catch (err) {
    res.status(err.message?.includes('No youtube') ? 404 : 401).json({ error: err.message })
  }
}
```

- [ ] **Step 2: Replace `api/spotify/[endpoint].js`**

```js
import { verifyUser, getPlatformCreds } from '../_lib/auth.js'
import { fetchSpotifyStats } from '../_lib/platformFetch.js'

async function getToken(creds) {
  const encoded = Buffer.from(`${creds.client_id}:${creds.client_secret}`).toString('base64')
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${encoded}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  const d = await r.json()
  if (!d.access_token) throw new Error('Spotify token exchange failed')
  return d.access_token
}

async function artist(req, res, creds) {
  const stats = await fetchSpotifyStats(creds)
  res.json(stats)
}

async function topTracks(req, res, creds) {
  const token = await getToken(creds)
  const r = await fetch(`https://api.spotify.com/v1/artists/${creds.artist_id}/top-tracks?market=US`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) return res.status(r.status).json({ error: 'Spotify API error' })
  const d = await r.json()
  res.json((d.tracks ?? []).map(t => ({
    id: t.id,
    name: t.name,
    album: t.album.name,
    releaseDate: t.album.release_date,
    popularity: t.popularity,
    previewUrl: t.preview_url,
    thumbnail: t.album.images?.[0]?.url ?? '',
  })))
}

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'spotify')
    const { endpoint } = req.query
    if (endpoint === 'artist')     return await artist(req, res, creds)
    if (endpoint === 'top-tracks') return await topTracks(req, res, creds)
    res.status(404).json({ error: 'Unknown endpoint' })
  } catch (err) {
    res.status(err.message?.includes('No spotify') ? 404 : 401).json({ error: err.message })
  }
}
```

- [ ] **Step 3: Replace `api/audiomack/[endpoint].js`**

```js
import { verifyUser, getPlatformCreds } from '../_lib/auth.js'
import { fetchAudiomackStats } from '../_lib/platformFetch.js'
import { createHmac, randomBytes } from 'node:crypto'

function buildOAuth1Header(method, url, consumerKey, consumerSecret) {
  const nonce = randomBytes(16).toString('hex')
  const ts = Math.floor(Date.now() / 1000).toString()
  const params = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: ts,
    oauth_version: '1.0',
  }
  const paramStr = Object.entries(params).sort()
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  const base = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`
  const sig = createHmac('sha1', `${encodeURIComponent(consumerSecret)}&`).update(base).digest('base64')
  params.oauth_signature = sig
  return 'OAuth ' + Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`).join(', ')
}

async function artistHandler(req, res, creds) {
  const stats = await fetchAudiomackStats(creds)
  res.json(stats)
}

async function songs(req, res, creds) {
  const url = `https://api.audiomack.com/v1/artist/${creds.slug}/songs`
  const auth = buildOAuth1Header('GET', url, creds.consumer_key, creds.consumer_secret)
  const r = await fetch(url, { headers: { Authorization: auth } })
  if (!r.ok) return res.status(r.status).json({ error: 'Audiomack API error' })
  const d = await r.json()
  res.json((d.results ?? []).slice(0, 10).map(s => ({
    id: s.id,
    title: s.title,
    plays: s.plays ?? 0,
    favorites: s.favorites ?? 0,
    date: s.created,
    thumbnail: s.image ?? '',
  })))
}

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'audiomack')
    const { endpoint } = req.query
    if (endpoint === 'artist') return await artistHandler(req, res, creds)
    if (endpoint === 'songs')  return await songs(req, res, creds)
    res.status(404).json({ error: 'Unknown endpoint' })
  } catch (err) {
    res.status(err.message?.includes('No audiomack') ? 404 : 401).json({ error: err.message })
  }
}
```

- [ ] **Step 4: Replace `api/instagram/[endpoint].js`**

Key change: `auth` reads `creds.app_id` from DB instead of `process.env.INSTAGRAM_APP_ID`. The callback reads `creds.app_id/app_secret` using the `userId` decoded from state, then merges the `access_token` into the existing credentials.

```js
import {
  verifyUser, getPlatformCreds, signOAuthState, verifyOAuthState, supabaseAdmin
} from '../_lib/auth.js'
import { fetchInstagramStats } from '../_lib/platformFetch.js'

async function auth(req, res) {
  const user = await verifyUser(req)
  const creds = await getPlatformCreds(user.id, 'instagram')
  if (!creds.app_id) return res.status(400).json({ error: 'Save App ID and App Secret first' })

  const { state, nonce } = signOAuthState(user.id)
  const host = req.headers.host ?? 'localhost:3001'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirect = `${protocol}://${host}/api/instagram/callback`

  const params = new URLSearchParams({
    client_id: creds.app_id,
    redirect_uri: redirect,
    scope: 'user_profile,user_media',
    response_type: 'code',
    state,
  })

  res.setHeader('Set-Cookie', `ig_nonce=${nonce}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`)
  res.redirect(`https://api.instagram.com/oauth/authorize?${params}`)
}

async function callback(req, res) {
  const { code, state } = req.query
  const cookieHeader = req.headers.cookie ?? ''
  const nonce = cookieHeader.split(';')
    .find(c => c.trim().startsWith('ig_nonce='))?.split('=')[1]?.trim()
  if (!nonce) return res.status(400).json({ error: 'Missing nonce cookie' })

  const userId = verifyOAuthState(state, nonce)

  const existingCreds = await getPlatformCreds(userId, 'instagram')

  const host = req.headers.host ?? 'localhost:3001'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirect = `${protocol}://${host}/api/instagram/callback`

  const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: existingCreds.app_id,
      client_secret: existingCreds.app_secret,
      grant_type: 'authorization_code',
      redirect_uri: redirect,
      code,
    }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) return res.status(400).json({ error: 'Token exchange failed' })

  await supabaseAdmin.from('platform_connections').upsert({
    user_id: userId,
    platform: 'instagram',
    credentials: { ...existingCreds, access_token: tokenData.access_token, user_id: String(tokenData.user_id) },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' })

  const frontendHost = host.includes('localhost') ? 'localhost:5173' : host
  const frontendUrl = `${protocol}://${frontendHost}/connections?connected=instagram`
  res.setHeader('Set-Cookie', 'ig_nonce=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax')
  res.redirect(frontendUrl)
}

async function stats(req, res) {
  const user = await verifyUser(req)
  const creds = await getPlatformCreds(user.id, 'instagram')
  const result = await fetchInstagramStats(creds)
  res.json(result)
}

export default async function handler(req, res) {
  const { endpoint } = req.query
  try {
    if (endpoint === 'auth')     return await auth(req, res)
    if (endpoint === 'callback') return await callback(req, res)
    if (endpoint === 'stats')    return await stats(req, res)
    res.status(404).json({ error: 'Unknown endpoint' })
  } catch (err) {
    const status = err.message?.includes('nonce') || err.message?.includes('state') ? 400
      : err.message?.includes('No instagram') ? 404 : 401
    res.status(status).json({ error: err.message })
  }
}
```

- [ ] **Step 5: Replace `api/tiktok/[endpoint].js`**

Same pattern as Instagram — read `creds.client_key/client_secret` from DB instead of env vars.

```js
import {
  verifyUser, getPlatformCreds, signOAuthState, verifyOAuthState, supabaseAdmin
} from '../_lib/auth.js'
import { fetchTikTokStats } from '../_lib/platformFetch.js'

async function auth(req, res) {
  const user = await verifyUser(req)
  const creds = await getPlatformCreds(user.id, 'tiktok')
  if (!creds.client_key) return res.status(400).json({ error: 'Save Client Key and Client Secret first' })

  const { state, nonce } = signOAuthState(user.id)
  const host = req.headers.host ?? 'localhost:3001'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirect = `${protocol}://${host}/api/tiktok/callback`

  const params = new URLSearchParams({
    client_key: creds.client_key,
    scope: 'user.info.basic',
    response_type: 'code',
    redirect_uri: redirect,
    state,
  })

  res.setHeader('Set-Cookie', `tt_nonce=${nonce}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`)
  res.redirect(`https://www.tiktok.com/auth/authorize/?${params}`)
}

async function callback(req, res) {
  const { code, state } = req.query
  const cookieHeader = req.headers.cookie ?? ''
  const nonce = cookieHeader.split(';')
    .find(c => c.trim().startsWith('tt_nonce='))?.split('=')[1]?.trim()
  if (!nonce) return res.status(400).json({ error: 'Missing nonce cookie' })

  const userId = verifyOAuthState(state, nonce)
  const existingCreds = await getPlatformCreds(userId, 'tiktok')

  const host = req.headers.host ?? 'localhost:3001'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirect = `${protocol}://${host}/api/tiktok/callback`

  const tokenRes = await fetch('https://open-api.tiktok.com/oauth/access_token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: existingCreds.client_key,
      client_secret: existingCreds.client_secret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirect,
    }),
  })
  const tokenData = await tokenRes.json()
  const token = tokenData.data
  if (!token?.access_token) return res.status(400).json({ error: 'Token exchange failed' })

  await supabaseAdmin.from('platform_connections').upsert({
    user_id: userId,
    platform: 'tiktok',
    credentials: { ...existingCreds, access_token: token.access_token, open_id: token.open_id },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' })

  const frontendHost = host.includes('localhost') ? 'localhost:5173' : host
  const frontendUrl = `${protocol}://${frontendHost}/connections?connected=tiktok`
  res.setHeader('Set-Cookie', 'tt_nonce=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax')
  res.redirect(frontendUrl)
}

async function stats(req, res) {
  const user = await verifyUser(req)
  const creds = await getPlatformCreds(user.id, 'tiktok')
  const result = await fetchTikTokStats(creds)
  res.json(result)
}

export default async function handler(req, res) {
  const { endpoint } = req.query
  try {
    if (endpoint === 'auth')     return await auth(req, res)
    if (endpoint === 'callback') return await callback(req, res)
    if (endpoint === 'stats')    return await stats(req, res)
    res.status(404).json({ error: 'Unknown endpoint' })
  } catch (err) {
    const status = err.message?.includes('nonce') || err.message?.includes('state') ? 400
      : err.message?.includes('No tiktok') ? 404 : 401
    res.status(status).json({ error: err.message })
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add api/youtube/[endpoint].js api/spotify/[endpoint].js api/audiomack/[endpoint].js api/instagram/[endpoint].js api/tiktok/[endpoint].js
git commit -m "feat: wire all api/ handlers to per-user credentials from Supabase"
```

---

### Task 4: Update Connections Page — Multi-Field Credential Forms

**Files:**
- Modify: `src/pages/Connections.tsx`

**Interfaces:**
- Consumes: `supabase` client, `useAuth` (`user`, `session`)
- Produces: updated `platform_connections` rows with all credential fields per platform

- [ ] **Step 1: Replace `src/pages/Connections.tsx`**

Full replacement — multi-field forms, credential merging, two-state cards (credentials saved vs. OAuth connected):

```tsx
import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Link2, Unlink, AlertCircle, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Credentials { [key: string]: string }

const PLATFORM_META: Record<string, {
  label: string
  color: string
  oAuth: boolean
  portalLabel: string
  portalUrl: string
  fields: Array<{ key: string; label: string; placeholder: string; secret?: boolean }>
}> = {
  youtube: {
    label: 'YouTube', color: '#FF0000', oAuth: false,
    portalLabel: 'console.cloud.google.com → APIs → YouTube Data API v3',
    portalUrl: 'https://console.cloud.google.com',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'AIzaSy…', secret: true },
      { key: 'channel_id', label: 'Channel ID', placeholder: 'UCxxxxxx' },
    ],
  },
  spotify: {
    label: 'Spotify', color: '#1DB954', oAuth: false,
    portalLabel: 'developer.spotify.com → Create App',
    portalUrl: 'https://developer.spotify.com/dashboard',
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'from Spotify dashboard' },
      { key: 'client_secret', label: 'Client Secret', placeholder: '32-char hex', secret: true },
      { key: 'artist_id', label: 'Artist ID', placeholder: 'from open.spotify.com/artist/…' },
    ],
  },
  audiomack: {
    label: 'Audiomack', color: '#FF6B00', oAuth: false,
    portalLabel: 'audiomack.com/oauth-clients',
    portalUrl: 'https://audiomack.com/oauth-clients',
    fields: [
      { key: 'consumer_key', label: 'Consumer Key', placeholder: 'from Audiomack OAuth clients' },
      { key: 'consumer_secret', label: 'Consumer Secret', placeholder: '…', secret: true },
      { key: 'slug', label: 'Profile Slug', placeholder: 'your-audiomack-slug' },
    ],
  },
  instagram: {
    label: 'Instagram', color: '#E1306C', oAuth: true,
    portalLabel: 'developers.facebook.com → Instagram Basic Display',
    portalUrl: 'https://developers.facebook.com',
    fields: [
      { key: 'app_id', label: 'App ID', placeholder: 'from Meta for Developers' },
      { key: 'app_secret', label: 'App Secret', placeholder: '…', secret: true },
    ],
  },
  tiktok: {
    label: 'TikTok', color: '#FF0050', oAuth: true,
    portalLabel: 'developers.tiktok.com → Manage Apps',
    portalUrl: 'https://developers.tiktok.com',
    fields: [
      { key: 'client_key', label: 'Client Key', placeholder: 'from TikTok developers' },
      { key: 'client_secret', label: 'Client Secret', placeholder: '…', secret: true },
    ],
  },
}

const PLATFORMS = ['youtube', 'spotify', 'audiomack', 'instagram', 'tiktok']

function isCredentialsComplete(platform: string, creds: Credentials): boolean {
  const meta = PLATFORM_META[platform]
  if (meta.oAuth) return !!creds.access_token
  return meta.fields.every(f => !!creds[f.key])
}

function hasOAuthPrereqs(platform: string, creds: Credentials): boolean {
  const meta = PLATFORM_META[platform]
  if (!meta.oAuth) return false
  return meta.fields.every(f => !!creds[f.key])
}

function identifierLabel(platform: string, creds: Credentials): string {
  if (platform === 'youtube') return creds.channel_id ?? ''
  if (platform === 'spotify') return creds.artist_id ?? ''
  if (platform === 'audiomack') return creds.slug ?? ''
  if (platform === 'instagram') return `user ${creds.user_id ?? ''}`
  if (platform === 'tiktok') return `open_id ${creds.open_id ?? ''}`
  return ''
}

export default function Connections() {
  const { user, session } = useAuth()
  const [connections, setConnections] = useState<Record<string, Credentials>>({})
  const [loading, setLoading] = useState(true)
  const [inputs, setInputs] = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('platform_connections')
      .select('platform, credentials')
      .eq('user_id', user.id)
    const map: Record<string, Credentials> = {}
    PLATFORMS.forEach(p => {
      const row = (data ?? []).find(r => r.platform === p)
      map[p] = row?.credentials ?? {}
    })
    setConnections(map)
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected')) { window.history.replaceState({}, '', '/connections'); load() }
  }, [load])

  const saveCredentials = async (platform: string) => {
    const fields = PLATFORM_META[platform].fields
    const newCreds = inputs[platform] ?? {}
    if (fields.some(f => !newCreds[f.key]?.trim())) {
      setErrors(e => ({ ...e, [platform]: 'All fields are required' }))
      return
    }
    setSaving(s => ({ ...s, [platform]: true }))
    setErrors(e => ({ ...e, [platform]: '' }))

    const merged = { ...connections[platform], ...Object.fromEntries(fields.map(f => [f.key, newCreds[f.key].trim()])) }
    const { error } = await supabase.from('platform_connections').upsert({
      user_id: user!.id, platform, credentials: merged, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    if (error) setErrors(e => ({ ...e, [platform]: error.message }))
    else { setInputs(i => ({ ...i, [platform]: {} })); setEditing(ed => ({ ...ed, [platform]: false })); await load() }
    setSaving(s => ({ ...s, [platform]: false }))
  }

  const disconnect = async (platform: string) => {
    await supabase.from('platform_connections').delete().eq('user_id', user!.id).eq('platform', platform)
    await load()
  }

  const connectOAuth = (platform: string) => {
    if (!session) return
    window.location.href = `/api/${platform}/auth?token=${session.access_token}`
  }

  if (loading) return <div style={{ padding: 40, color: '#F1F5F9' }}>Loading…</div>

  return (
    <div style={{ padding: '28px 28px 48px', color: '#F1F5F9', maxWidth: 800 }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Connections</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#475569' }}>
          Connect your accounts. Each platform needs your own developer app credentials.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {PLATFORMS.map(platform => {
          const meta = PLATFORM_META[platform]
          const creds = connections[platform] ?? {}
          const complete = isCredentialsComplete(platform, creds)
          const hasPrereqs = hasOAuthPrereqs(platform, creds)
          // OAuth platforms: show form until app_id/app_secret saved; then show OAuth button
          // Non-OAuth platforms: show form until all fields saved
          const showCredentialForm = editing[platform] || (meta.oAuth ? !hasPrereqs : !complete)
          const showOAuthButton = meta.oAuth && !complete && hasPrereqs && !editing[platform]

          return (
            <div key={platform} style={{
              background: '#1A1A27',
              border: `1px solid ${complete ? meta.color + '44' : '#22223A'}`,
              borderRadius: 12, padding: '20px 22px',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color }} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                  {complete && <CheckCircle2 size={14} color="#1DB954" />}
                </div>
                {complete && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditing(ed => ({ ...ed, [platform]: !ed[platform] }))}
                      style={{ fontSize: 12, color: '#94A3B8', background: 'none', border: '1px solid #22223A', borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>
                      Edit
                    </button>
                    <button onClick={() => disconnect(platform)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '5px 12px', cursor: 'pointer' }}>
                      <Unlink size={12} /> Disconnect
                    </button>
                  </div>
                )}
              </div>

              {/* Connected summary */}
              {complete && !showCredentialForm && (
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  Connected{identifierLabel(platform, creds) ? ` — ${identifierLabel(platform, creds)}` : ' via OAuth'}
                </div>
              )}

              {/* Credential form */}
              {showCredentialForm && (
                <div>
                  <a href={meta.portalUrl} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#64748B', marginBottom: 12, textDecoration: 'none' }}>
                    <ExternalLink size={11} /> {meta.portalLabel}
                  </a>
                  {meta.fields.map(field => (
                    <div key={field.key} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 4 }}>{field.label}</label>
                      <input
                        type={field.secret ? 'password' : 'text'}
                        placeholder={field.placeholder}
                        value={inputs[platform]?.[field.key] ?? creds[field.key] ?? ''}
                        onChange={e => setInputs(i => ({ ...i, [platform]: { ...i[platform], [field.key]: e.target.value } }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: '#0D0D14', border: '1px solid #22223A', color: '#F1F5F9', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                  <button onClick={() => saveCredentials(platform)} disabled={saving[platform]}
                    style={{ padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: `${meta.color}18`, border: `1px solid ${meta.color}44`, color: meta.color, cursor: 'pointer', marginTop: 4 }}>
                    {saving[platform] ? 'Saving…' : 'Save Credentials'}
                  </button>
                </div>
              )}

              {/* OAuth button — shown after app credentials saved, before OAuth done */}
              {showOAuthButton && (
                <button onClick={() => connectOAuth(platform)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: `${meta.color}18`, border: `1px solid ${meta.color}44`, color: meta.color, marginTop: 8 }}>
                  <Link2 size={13} /> Connect {meta.label} Account
                </button>
              )}

              {errors[platform] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#EF4444' }}>
                  <AlertCircle size={12} /> {errors[platform]}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in dev**

Run `npm run dev` and open `/connections`. Confirm:
- Each platform shows its credential fields
- Saving credentials shows the "Edit" button and identifier
- For Instagram/TikTok, after saving App ID/Secret, the "Connect Account" button appears

- [ ] **Step 3: Commit**

```bash
git add src/pages/Connections.tsx
git commit -m "feat: Connections page supports multi-field credentials per platform"
```

---

### Task 5: Onboarding Wizard + Auth Routing

**Files:**
- Modify: `src/context/AuthContext.tsx`
- Modify: `src/components/ProtectedRoute.tsx`
- Modify: `src/pages/Onboarding.tsx`

**Interfaces:**
- Consumes: `profiles.onboarding_complete` column (from Task 1)
- Produces: `useAuth()` now exposes `onboardingComplete: boolean` and `refreshOnboardingStatus: () => Promise<void>`

- [ ] **Step 1: Update `src/context/AuthContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  onboardingComplete: boolean
  refreshOnboardingStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null, session: null, loading: true,
  onboardingComplete: false, refreshOnboardingStatus: async () => {},
})

async function fetchOnboardingStatus(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_complete')
    .eq('id', userId)
    .single()
  return data?.onboarding_complete ?? false
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboardingComplete, setOnboardingComplete] = useState(false)

  const loadProfile = useCallback(async (u: User | null) => {
    if (!u) { setOnboardingComplete(false); setLoading(false); return }
    const complete = await fetchOnboardingStatus(u.id)
    setOnboardingComplete(complete)
    setLoading(false)
  }, [])

  const refreshOnboardingStatus = useCallback(async () => {
    if (!user) return
    const complete = await fetchOnboardingStatus(user.id)
    setOnboardingComplete(complete)
  }, [user])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      loadProfile(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      loadProfile(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  return (
    <AuthContext.Provider value={{ user, session, loading, onboardingComplete, refreshOnboardingStatus }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

- [ ] **Step 2: Update `src/components/ProtectedRoute.tsx`**

```tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactNode } from 'react'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, onboardingComplete } = useAuth()
  if (loading) return <div style={{ color: '#F1F5F9', padding: 40 }}>Loading…</div>
  if (!user) return <Navigate to="/signin" replace />
  if (!onboardingComplete) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}
```

- [ ] **Step 3: Replace `src/pages/Onboarding.tsx` with a 3-step wizard**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Link2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const PLATFORM_META: Record<string, {
  label: string; color: string; oAuth: boolean
  fields: Array<{ key: string; label: string; placeholder: string; secret?: boolean; tip: string }>
}> = {
  youtube: {
    label: 'YouTube', color: '#FF0000', oAuth: false,
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'AIzaSy…', secret: true, tip: 'console.cloud.google.com → APIs → YouTube Data API v3' },
      { key: 'channel_id', label: 'Channel ID', placeholder: 'UCxxxxxx', tip: 'youtube.com/channel/YOUR_ID' },
    ],
  },
  spotify: {
    label: 'Spotify', color: '#1DB954', oAuth: false,
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'from Spotify dashboard', tip: 'developer.spotify.com' },
      { key: 'client_secret', label: 'Client Secret', placeholder: '32-char hex', secret: true, tip: 'developer.spotify.com' },
      { key: 'artist_id', label: 'Artist ID', placeholder: 'from open.spotify.com/artist/…', tip: 'Open your Spotify artist page — the ID is in the URL' },
    ],
  },
  audiomack: {
    label: 'Audiomack', color: '#FF6B00', oAuth: false,
    fields: [
      { key: 'consumer_key', label: 'Consumer Key', placeholder: 'from audiomack.com/oauth-clients', tip: 'audiomack.com/oauth-clients' },
      { key: 'consumer_secret', label: 'Consumer Secret', placeholder: '…', secret: true, tip: 'audiomack.com/oauth-clients' },
      { key: 'slug', label: 'Profile Slug', placeholder: 'your-slug', tip: 'Your Audiomack URL slug' },
    ],
  },
  instagram: {
    label: 'Instagram', color: '#E1306C', oAuth: true,
    fields: [
      { key: 'app_id', label: 'App ID', placeholder: 'from developers.facebook.com', tip: 'developers.facebook.com → Instagram Basic Display' },
      { key: 'app_secret', label: 'App Secret', placeholder: '…', secret: true, tip: 'developers.facebook.com' },
    ],
  },
  tiktok: {
    label: 'TikTok', color: '#FF0050', oAuth: true,
    fields: [
      { key: 'client_key', label: 'Client Key', placeholder: 'from developers.tiktok.com', tip: 'developers.tiktok.com → Manage Apps' },
      { key: 'client_secret', label: 'Client Secret', placeholder: '…', secret: true, tip: 'developers.tiktok.com' },
    ],
  },
}

const PLATFORMS = ['youtube', 'spotify', 'audiomack', 'instagram', 'tiktok']

export default function Onboarding() {
  const { user, session, refreshOnboardingStatus } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState({ artist_name: '', location: '', genre: '' })
  const [profileError, setProfileError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [platformInputs, setPlatformInputs] = useState<Record<string, Record<string, string>>>({})
  const [savingPlatform, setSavingPlatform] = useState<Record<string, boolean>>({})
  const [savedPlatforms, setSavedPlatforms] = useState<Record<string, boolean>>({})
  const [finishing, setFinishing] = useState(false)

  const card = {
    background: '#1A1A27', border: '1px solid #22223A', borderRadius: 16,
    padding: '40px 36px', width: '100%', maxWidth: 520,
  }
  const input = {
    width: '100%', padding: '11px 14px', borderRadius: 9, fontSize: 14,
    background: '#0D0D14', border: '1px solid #22223A', color: '#F1F5F9',
    marginBottom: 14, boxSizing: 'border-box' as const,
  }

  const saveProfile = async () => {
    if (!profile.artist_name.trim()) { setProfileError('Artist name is required'); return }
    setSavingProfile(true)
    const { error } = await supabase.from('profiles')
      .update({ artist_name: profile.artist_name, location: profile.location, genre: profile.genre })
      .eq('id', user!.id)
    setSavingProfile(false)
    if (error) { setProfileError(error.message); return }
    setStep(2)
  }

  const savePlatform = async (platform: string) => {
    const fields = PLATFORM_META[platform].fields
    const vals = platformInputs[platform] ?? {}
    if (fields.some(f => !vals[f.key]?.trim())) return
    setSavingPlatform(s => ({ ...s, [platform]: true }))
    const creds = Object.fromEntries(fields.map(f => [f.key, vals[f.key].trim()]))
    const { error } = await supabase.from('platform_connections').upsert({
      user_id: user!.id, platform, credentials: creds, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })
    setSavingPlatform(s => ({ ...s, [platform]: false }))
    if (!error) setSavedPlatforms(s => ({ ...s, [platform]: true }))
  }

  const connectOAuth = (platform: string) => {
    if (!session) return
    window.location.href = `/api/${platform}/auth?token=${session.access_token}`
  }

  const finish = async () => {
    setFinishing(true)
    await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', user!.id)
    await refreshOnboardingStatus()
    navigate('/', { replace: true })
  }

  const StepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
      {[1, 2, 3].map(n => (
        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 12, fontWeight: 700,
            background: step >= n ? 'linear-gradient(135deg, #F5A623, #E8911A)' : '#22223A',
            color: step >= n ? '#000' : '#64748B',
          }}>{n}</div>
          {n < 3 && <div style={{ width: 32, height: 1, background: step > n ? '#F5A623' : '#22223A' }} />}
        </div>
      ))}
      <span style={{ fontSize: 12, color: '#64748B', marginLeft: 8 }}>
        {step === 1 ? 'Profile' : step === 2 ? 'Connect Platforms' : 'Done'}
      </span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={card}>
        <StepIndicator />

        {/* Step 1 — Profile */}
        {step === 1 && (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>Set up your profile</h2>
            <p style={{ margin: '0 0 28px', fontSize: 13, color: '#64748B' }}>Tell us about yourself to get started.</p>
            <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 }}>Artist Name *</label>
            <input style={input} placeholder="e.g. Risetrack" value={profile.artist_name} onChange={e => setProfile({ ...profile, artist_name: e.target.value })} />
            <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 }}>Location</label>
            <input style={input} placeholder="e.g. Kampala, Uganda" value={profile.location} onChange={e => setProfile({ ...profile, location: e.target.value })} />
            <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 }}>Genre</label>
            <input style={input} placeholder="e.g. Afrobeats" value={profile.genre} onChange={e => setProfile({ ...profile, genre: e.target.value })} />
            {profileError && <div style={{ fontSize: 13, color: '#EF4444', marginBottom: 12 }}>{profileError}</div>}
            <button onClick={saveProfile} disabled={savingProfile} style={{ width: '100%', padding: '12px 0', borderRadius: 9, fontSize: 14, fontWeight: 600, background: 'linear-gradient(135deg, #F5A623, #E8911A)', color: '#000', border: 'none', cursor: 'pointer' }}>
              {savingProfile ? 'Saving…' : 'Continue →'}
            </button>
          </>
        )}

        {/* Step 2 — Connect Platforms */}
        {step === 2 && (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>Connect your platforms</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748B' }}>Add your developer app credentials. You can skip and do this later.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PLATFORMS.map(platform => {
                const meta = PLATFORM_META[platform]
                const saved = savedPlatforms[platform]
                const vals = platformInputs[platform] ?? {}
                const hasAll = meta.fields.every(f => !!vals[f.key]?.trim())
                return (
                  <div key={platform} style={{ background: '#0D0D14', border: `1px solid ${saved ? meta.color + '44' : '#22223A'}`, borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: saved ? 0 : 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                      {saved && <CheckCircle2 size={13} color="#1DB954" />}
                    </div>
                    {!saved && (
                      <>
                        {meta.fields.map(field => (
                          <div key={field.key} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <label style={{ fontSize: 11, color: '#64748B' }}>{field.label}</label>
                              <span style={{ fontSize: 10, color: '#475569' }}>{field.tip}</span>
                            </div>
                            <input
                              type={field.secret ? 'password' : 'text'}
                              placeholder={field.placeholder}
                              value={vals[field.key] ?? ''}
                              onChange={e => setPlatformInputs(i => ({ ...i, [platform]: { ...i[platform], [field.key]: e.target.value } }))}
                              style={{ width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 12, background: '#1A1A27', border: '1px solid #22223A', color: '#F1F5F9', boxSizing: 'border-box' as const }}
                            />
                          </div>
                        ))}
                        {!meta.oAuth && (
                          <button onClick={() => savePlatform(platform)} disabled={!hasAll || savingPlatform[platform]}
                            style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 7, background: `${meta.color}18`, border: `1px solid ${meta.color}44`, color: meta.color, cursor: hasAll ? 'pointer' : 'not-allowed', opacity: hasAll ? 1 : 0.5 }}>
                            {savingPlatform[platform] ? 'Saving…' : 'Save'}
                          </button>
                        )}
                        {meta.oAuth && hasAll && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => savePlatform(platform)} disabled={savingPlatform[platform]}
                              style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 7, background: '#22223A', border: '1px solid #22223A', color: '#94A3B8', cursor: 'pointer' }}>
                              {savingPlatform[platform] ? 'Saving…' : 'Save Credentials'}
                            </button>
                            <button onClick={() => connectOAuth(platform)}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 7, background: `${meta.color}18`, border: `1px solid ${meta.color}44`, color: meta.color, cursor: 'pointer' }}>
                              <Link2 size={11} /> Connect Account
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button onClick={() => setStep(3)} style={{ fontSize: 13, color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}>Skip for now →</button>
              <button onClick={() => setStep(3)} style={{ padding: '10px 22px', borderRadius: 9, fontSize: 14, fontWeight: 600, background: 'linear-gradient(135deg, #F5A623, #E8911A)', color: '#000', border: 'none', cursor: 'pointer' }}>
                Continue →
              </button>
            </div>
          </>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <>
            <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>You're all set!</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748B' }}>
              {Object.keys(savedPlatforms).length > 0
                ? `Connected: ${Object.keys(savedPlatforms).join(', ')}. You can add more any time from the Connections page.`
                : 'No platforms connected yet — go to Connections any time to add your accounts.'}
            </p>
            <button onClick={finish} disabled={finishing}
              style={{ width: '100%', padding: '12px 0', borderRadius: 9, fontSize: 14, fontWeight: 600, background: 'linear-gradient(135deg, #F5A623, #E8911A)', color: '#000', border: 'none', cursor: 'pointer' }}>
              {finishing ? 'Loading…' : 'Go to Dashboard →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify the full onboarding flow**

1. Sign out if signed in, then sign up as a new test user.
2. Confirm you're redirected to `/onboarding`.
3. Complete Step 1 (profile save), advance to Step 2.
4. Skip Step 2 with "Skip for now →", advance to Step 3.
5. Click "Go to Dashboard →" — confirm you land on the Dashboard and the wizard does not appear again on refresh.

- [ ] **Step 5: Commit**

```bash
git add src/context/AuthContext.tsx src/components/ProtectedRoute.tsx src/pages/Onboarding.tsx
git commit -m "feat: 3-step onboarding wizard with platform connect step and onboarding_complete gate"
```

---

### Task 6: Snapshot Infrastructure — Cron + Manual Refresh

**Files:**
- Create: `api/cron/fetch-stats.js`
- Create: `api/stats/refresh.js`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `fetchStats` from `../_lib/platformFetch.js` (or `../../_lib/platformFetch.js`)
- Consumes: `verifyUser`, `supabaseAdmin` from `../_lib/auth.js`
- Produces: rows inserted into `platform_snapshots`; `POST /api/stats/refresh` returns `{ snapshots: Array<{ platform, metrics }> }`

- [ ] **Step 1: Create `api/cron/fetch-stats.js`**

```js
import { supabaseAdmin } from '../_lib/auth.js'
import { fetchStats } from '../_lib/platformFetch.js'

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: connections, error } = await supabaseAdmin
    .from('platform_connections')
    .select('user_id, platform, credentials')

  if (error) return res.status(500).json({ error: error.message })

  const snapshots = []
  for (const conn of connections ?? []) {
    try {
      const metrics = await fetchStats(conn.platform, conn.credentials)
      snapshots.push({ user_id: conn.user_id, platform: conn.platform, metrics })
    } catch (err) {
      console.error(`cron fetch failed user=${conn.user_id} platform=${conn.platform}: ${err.message}`)
    }
  }

  if (snapshots.length > 0) {
    const { error: insertErr } = await supabaseAdmin.from('platform_snapshots').insert(snapshots)
    if (insertErr) return res.status(500).json({ error: insertErr.message })
  }

  res.json({ fetched: snapshots.length, total: connections?.length ?? 0 })
}
```

- [ ] **Step 2: Create `api/stats/refresh.js`**

```js
import { verifyUser, supabaseAdmin } from '../_lib/auth.js'
import { fetchStats } from '../_lib/platformFetch.js'

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)

    const { data: connections } = await supabaseAdmin
      .from('platform_connections')
      .select('platform, credentials')
      .eq('user_id', user.id)

    const snapshots = []
    for (const conn of connections ?? []) {
      try {
        const metrics = await fetchStats(conn.platform, conn.credentials)
        snapshots.push({ user_id: user.id, platform: conn.platform, metrics })
      } catch (err) {
        console.error(`refresh failed platform=${conn.platform}: ${err.message}`)
      }
    }

    if (snapshots.length > 0) {
      await supabaseAdmin.from('platform_snapshots').insert(snapshots)
    }

    res.json({ snapshots: snapshots.map(s => ({ platform: s.platform, metrics: s.metrics })) })
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
```

- [ ] **Step 3: Update `vercel.json` to add cron**

Replace the entire contents of `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "crons": [
    { "path": "/api/cron/fetch-stats", "schedule": "0 6 * * *" }
  ]
}
```

- [ ] **Step 4: Add `CRON_SECRET` to `.env`**

Open `.env` and add:
```
CRON_SECRET=change-this-to-a-long-random-string
```

- [ ] **Step 5: Commit**

```bash
git add api/cron/fetch-stats.js api/stats/refresh.js vercel.json .env
git commit -m "feat: add snapshot cron and manual refresh API routes"
```

---

### Task 7: Dashboard Reads from Snapshots

**Files:**
- Create: `src/hooks/useSnapshots.ts`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Analytics.tsx`

**Interfaces:**
- Consumes: `platform_snapshots` table (from Task 1), `POST /api/stats/refresh` (from Task 6)
- Produces: `useSnapshots()` → `{ latest: Record<string, Metrics>, history: Record<string, Snapshot[]>, loading: boolean, refresh: () => Promise<void> }`

- [ ] **Step 1: Create `src/hooks/useSnapshots.ts`**

```ts
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export interface Metrics {
  subscribers?: number
  views?: number
  video_count?: number
  followers?: number
  popularity?: number
  monthly_listeners?: number
  media_count?: number
  likes?: number
  plays?: number
  songs?: number
}

export interface Snapshot {
  platform: string
  fetched_at: string
  metrics: Metrics
}

export interface SnapshotsResult {
  latest: Record<string, Snapshot>
  history: Record<string, Snapshot[]>
  loading: boolean
  refreshing: boolean
  refresh: () => Promise<void>
}

export function useSnapshots(): SnapshotsResult {
  const { user, session } = useAuth()
  const [latest, setLatest] = useState<Record<string, Snapshot>>({})
  const [history, setHistory] = useState<Record<string, Snapshot[]>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadSnapshots = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('platform_snapshots')
      .select('platform, fetched_at, metrics')
      .eq('user_id', user.id)
      .order('fetched_at', { ascending: false })
      .limit(150)

    const latestMap: Record<string, Snapshot> = {}
    const historyMap: Record<string, Snapshot[]> = {}

    for (const row of data ?? []) {
      if (!latestMap[row.platform]) latestMap[row.platform] = row
      if (!historyMap[row.platform]) historyMap[row.platform] = []
      if (historyMap[row.platform].length < 30) historyMap[row.platform].push(row)
    }

    setLatest(latestMap)
    setHistory(historyMap)
    setLoading(false)
  }, [user])

  useEffect(() => { loadSnapshots() }, [loadSnapshots])

  const refresh = useCallback(async () => {
    if (!session) return
    setRefreshing(true)
    try {
      await fetch('/api/stats/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      await loadSnapshots()
    } finally {
      setRefreshing(false)
    }
  }, [session, loadSnapshots])

  return { latest, history, loading, refreshing, refresh }
}
```

- [ ] **Step 2: Update `src/pages/Dashboard.tsx` — replace `useLivePlatformMetrics` with `useSnapshots`**

In `src/pages/Dashboard.tsx`:

**Line 8** — replace the import:
```tsx
// remove:
import { useLivePlatformMetrics } from '../hooks/useLiveData'
// add:
import { useSnapshots } from '../hooks/useSnapshots'
```

**Line 15** — replace the hook call:
```tsx
// remove:
const { metrics: platformMetrics, sync } = useLivePlatformMetrics()
// add:
const { latest, refreshing, refresh } = useSnapshots()
```

**Line 20** — delete this line entirely:
```tsx
useEffect(() => { sync() }, [sync])
```

In the JSX, find the block that maps over `platformMetrics` to render 5 platform stat cards (it's a `.map()` call somewhere in the return statement). Replace the entire platform cards rendering with:

```tsx
{['tiktok', 'youtube', 'spotify', 'audiomack', 'instagram'].map(platform => {
  const snap = latest[platform]
  const color = { tiktok: '#FF0050', youtube: '#FF0000', spotify: '#1DB954', audiomack: '#FF6B00', instagram: '#E1306C' }[platform]
  const label = { tiktok: 'TikTok', youtube: 'YouTube', spotify: 'Spotify', audiomack: 'Audiomack', instagram: 'Instagram' }[platform]
  const primary = snap ? (
    platform === 'youtube' ? snap.metrics.subscribers :
    platform === 'spotify' ? snap.metrics.followers :
    platform === 'audiomack' ? snap.metrics.plays :
    snap.metrics.followers
  ) : null

  return (
    <div key={platform} style={{ background: '#1A1A27', border: `1px solid ${snap ? color + '33' : '#22223A'}`, borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{label}</span>
      </div>
      {snap ? (
        <div style={{ fontSize: 26, fontWeight: 700, color: '#F1F5F9' }}>
          {primary != null ? (primary >= 1000 ? `${(primary / 1000).toFixed(1)}K` : String(primary)) : '—'}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: '#475569' }}>Not connected</div>
      )}
      {snap && <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
        Updated {new Date(snap.fetched_at).toLocaleDateString()}
      </div>}
    </div>
  )
})}
```

Add a Refresh button in the Dashboard header area (next to the "Week 16 of Plan" badge):
```tsx
<button onClick={refresh} disabled={refreshing}
  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B', background: 'none', border: '1px solid #22223A', borderRadius: 7, padding: '7px 12px', cursor: 'pointer' }}>
  {refreshing ? 'Refreshing…' : '↻ Refresh Stats'}
</button>
```

- [ ] **Step 3: Update `src/pages/Analytics.tsx` — use snapshot history for 30-day trend**

Add the import at the top:
```tsx
import { useSnapshots } from '../hooks/useSnapshots'
```

Inside the component, add:
```tsx
const { history } = useSnapshots()
```

For the 30-day area chart that currently uses mock data, replace the data source with snapshot history. Find the chart data array (likely named something like `chartData` or passed directly as `data=`) and replace it with:

```tsx
const trendData = (history[selectedPlatform?.toLowerCase() ?? 'tiktok'] ?? [])
  .slice()
  .reverse()
  .map(snap => ({
    date: new Date(snap.fetched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: snap.metrics.followers ?? snap.metrics.subscribers ?? snap.metrics.plays ?? 0,
  }))
```

Then pass `trendData` as the data prop to the chart.

- [ ] **Step 4: Verify**

1. Open Dashboard — platform cards show "Not connected" if no snapshots exist.
2. Click "Refresh Stats" — confirm the button shows "Refreshing…" and then updates.
3. Open Analytics — trend chart shows data if snapshots exist, empty state if not.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSnapshots.ts src/pages/Dashboard.tsx src/pages/Analytics.tsx
git commit -m "feat: dashboard and analytics read from platform_snapshots; add manual refresh"
```

---

## Post-Implementation Checklist

- [ ] Run `npm run build` — no TypeScript errors
- [ ] Test onboarding flow end-to-end with a fresh account
- [ ] Test Connections page: save credentials for one platform, verify it persists on reload
- [ ] Test manual Refresh button on Dashboard
- [ ] Confirm `CRON_SECRET`, `OAUTH_STATE_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel environment variables (Settings → Environment Variables)
- [ ] Remove `YOUTUBE_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_ARTIST_ID`, `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `AUDIOMACK_CONSUMER_KEY`, `AUDIOMACK_CONSUMER_SECRET`, `AUDIOMACK_SLUG` from Vercel environment variables (they're now per-user in Supabase)
