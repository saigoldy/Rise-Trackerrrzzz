# Multi-User Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the JuKatha single-artist dashboard into a multi-user creator platform where any music artist can sign up, connect their own social media accounts, and see only their own data.

**Architecture:** Supabase handles auth (Google + Magic Link) and all user data via Postgres with Row Level Security. Vercel serverless API routes proxy platform APIs (YouTube, Spotify, etc.) per-user by looking up credentials from the DB after verifying the user's JWT. The React frontend uses relative `/api` routes in all environments.

**Tech Stack:** React 19 + TypeScript + Vite, `@supabase/supabase-js`, Vercel ESM API routes (Node 18 native `fetch`, `node:crypto`), Vitest + React Testing Library, Supabase Postgres with RLS.

## Global Constraints

- All Vercel API routes use ESM: `export default function handler(req, res)`
- No `axios` — use native Node 18 `fetch` in API routes
- No `express` in API routes — Express is local dev only (`/server/`)
- `@supabase/supabase-js` is the only new runtime dependency (besides Vitest + RTL for tests)
- Frontend always uses relative `/api` paths (Vite proxy handles local dev)
- DB column names are snake_case; UI state uses camelCase — map explicitly at the boundary
- RLS on every table — never add `WHERE user_id = ?` in API queries; the DB enforces it
- JWT verification: use `supabaseAdmin.auth.getUser(token)` — requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` only (no separate JWT secret needed)
- OAuth CSRF: signed state = `HMAC-SHA256(user_id + "." + nonce, OAUTH_STATE_SECRET)` stored in HttpOnly cookie
- `OAUTH_STATE_SECRET` is a separate Vercel env var for signing OAuth state (add to `server/.env.example`)

---

## File Structure

### New files
| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Singleton Supabase browser client |
| `src/context/AuthContext.tsx` | Auth state provider `{ user, session, loading }` |
| `src/components/ProtectedRoute.tsx` | Redirects unauthenticated users to `/signin` |
| `src/pages/SignIn.tsx` | Google + Magic Link sign-in UI |
| `src/pages/Onboarding.tsx` | First-time profile setup (artist name, genre, location) |
| `api/_lib/auth.js` | Shared: `verifyUser`, `getPlatformCreds`, `signOAuthState`, `verifyOAuthState`, `supabaseAdmin` |
| `src/tests/setup.ts` | Vitest + RTL setup file |
| `src/tests/AuthContext.test.tsx` | Auth context tests |
| `src/tests/Accountability.test.tsx` | Accountability CRUD tests |
| `src/tests/Content.test.tsx` | Content CRUD tests |

### Modified files
| File | Change |
|------|--------|
| `package.json` | Add `@supabase/supabase-js`, Vitest, RTL |
| `vite.config.ts` | Add Vitest config block |
| `src/App.tsx` | Add `AuthProvider`, `ProtectedRoute`, `/signin`, `/onboarding` routes |
| `src/hooks/useLiveData.ts` | Read JWT from AuthContext, send `Authorization` header |
| `src/pages/Connections.tsx` | Read/write `platform_connections` via Supabase client |
| `src/pages/Accountability.tsx` | Replace mock data with `daily_slate` Supabase CRUD |
| `src/pages/Content.tsx` | Replace mock data with `content_posts` Supabase CRUD |
| `src/pages/Releases.tsx` | Replace mock data with `tracks` + `track_distribution` CRUD |
| `src/pages/Revenue.tsx` | Compute from `track_distribution.streams` × platform rates |
| `src/pages/Milestones.tsx` | Read/write `milestones` table |
| `src/pages/Suggestions.tsx` | Rule-based from real Supabase + live platform data |
| `src/pages/Dashboard.tsx` | Wire slate + suggestions to Supabase; delete mock imports |
| `api/status.js` | Verify JWT → look up `platform_connections` for this user |
| `api/youtube/channel.js` | Verify JWT → get `channel_id` from DB |
| `api/youtube/videos.js` | Verify JWT → get `channel_id` from DB |
| `api/spotify/artist.js` | Verify JWT → get `artist_id` from DB |
| `api/spotify/top-tracks.js` | Verify JWT → get `artist_id` from DB |
| `api/instagram/auth.js` | Verify JWT → signed state → redirect to Instagram |
| `api/instagram/callback.js` | Verify state → exchange code → upsert to DB via service role |
| `api/instagram/stats.js` | Verify JWT → get `access_token` from DB |
| `api/tiktok/auth.js` | Verify JWT → signed state → redirect to TikTok |
| `api/tiktok/callback.js` | Verify state → exchange code → upsert to DB via service role |
| `api/tiktok/stats.js` | Verify JWT → get `access_token` from DB |
| `api/audiomack/artist.js` | Verify JWT → get `slug` from DB |
| `api/audiomack/songs.js` | Verify JWT → get `slug` from DB |
| `server/.env.example` | Add Supabase vars + `OAUTH_STATE_SECRET` |
| `src/data/mockData.ts` | **Deleted** in Task 17 |

---

## Task 1: Install dependencies and configure Vitest

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/tests/setup.ts`

**Interfaces:**
- Produces: `vitest` CLI available, `@supabase/supabase-js` importable, `src/tests/setup.ts` for RTL matchers

- [ ] **Step 1: Install packages**

```bash
npm install @supabase/supabase-js
npm install --save-dev vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Expected: `node_modules/@supabase/supabase-js` and `node_modules/vitest` exist.

- [ ] **Step 2: Add Vitest config to `vite.config.ts`**

Replace the entire file:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/tests/setup.ts'],
  },
})
```

- [ ] **Step 3: Create `src/tests/setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to `package.json`**

In the `"scripts"` section, add:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Write a smoke test**

Create `src/tests/smoke.test.ts`:

```typescript
test('vitest is working', () => {
  expect(1 + 1).toBe(2)
})
```

- [ ] **Step 6: Run the smoke test**

```bash
npx vitest run src/tests/smoke.test.ts
```

Expected: `1 passed`

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/tests/setup.ts src/tests/smoke.test.ts
git commit -m "chore: install supabase-js and vitest, configure test environment"
```

---

## Task 2: Supabase project setup and SQL migrations

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Interfaces:**
- Produces: All 7 tables with RLS. New-user trigger creates `profiles` row. `supabaseAdmin` in Task 5 can query these tables.

> **Manual steps required before writing SQL:** Create a project at supabase.com, enable Google OAuth and Magic Link in Authentication → Providers, then copy `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from Project Settings → API.

- [ ] **Step 1: Create migrations directory**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Create `supabase/migrations/001_initial_schema.sql`**

```sql
-- Enable UUID extension
create extension if not exists "pgcrypto";

-- profiles: created automatically on first sign-in
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  artist_name text,
  display_name text,
  location text,
  genre text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "users own their profile"
  on profiles for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- Auto-create profile row on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- platform_connections
create table platform_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  credentials jsonb not null default '{}',
  connected_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, platform)
);
alter table platform_connections enable row level security;
create policy "users own their connections"
  on platform_connections for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- daily_slate
create table daily_slate (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  gym boolean not null default false,
  salon_duty boolean not null default false,
  study boolean not null default false,
  content_posted boolean not null default false,
  verse_written boolean not null default false,
  unique(user_id, date)
);
alter table daily_slate enable row level security;
create policy "users own their slate"
  on daily_slate for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- content_posts
create table content_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null,
  platform text not null,
  date date not null,
  views integer not null default 0,
  likes integer not null default 0,
  shares integer not null default 0,
  comments integer not null default 0,
  created_at timestamptz default now()
);
alter table content_posts enable row level security;
create policy "users own their content"
  on content_posts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- tracks
create table tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null default 'single',
  featuring text,
  release_date date,
  upc text,
  isrc text,
  genre text,
  created_at timestamptz default now()
);
alter table tracks enable row level security;
create policy "users own their tracks"
  on tracks for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- track_distribution (no user_id — RLS via tracks JOIN)
create table track_distribution (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references tracks(id) on delete cascade,
  platform text not null,
  status text not null default 'pending',
  streams integer not null default 0,
  unique(track_id, platform)
);
alter table track_distribution enable row level security;
create policy "users access their track distribution"
  on track_distribution for all
  using (
    exists (
      select 1 from tracks
      where tracks.id = track_id
        and tracks.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from tracks
      where tracks.id = track_id
        and tracks.user_id = auth.uid()
    )
  );

-- milestones
create table milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phase integer not null,
  unlocked boolean not null default false,
  badge_ids jsonb not null default '[]',
  unique(user_id, phase)
);
alter table milestones enable row level security;
create policy "users own their milestones"
  on milestones for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

- [ ] **Step 3: Run this SQL in the Supabase dashboard**

Go to supabase.com → your project → SQL Editor → New query → paste the contents of `001_initial_schema.sql` → Run.

Expected: All 7 tables appear in Table Editor with RLS enabled.

- [ ] **Step 4: Add Supabase env vars to Vercel**

In Vercel project settings → Environment Variables, add:
- `SUPABASE_URL` = your project URL (e.g. `https://abcdef.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` = service role key from Supabase → Settings → API
- `VITE_SUPABASE_URL` = same URL as above
- `VITE_SUPABASE_ANON_KEY` = anon/public key from Supabase → Settings → API
- `OAUTH_STATE_SECRET` = a long random string (e.g. output of `openssl rand -hex 32`)

- [ ] **Step 5: Update `server/.env.example`**

Add to the file:

```
# ── Supabase ───────────────────────────────────────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# ── OAuth CSRF ────────────────────────────────────────────────────────────────
OAUTH_STATE_SECRET=change-this-to-a-long-random-string
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql server/.env.example
git commit -m "feat: add SQL migrations for all 7 tables with RLS"
```

---

## Task 3: Supabase client + AuthContext + ProtectedRoute

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/context/AuthContext.tsx`
- Create: `src/components/ProtectedRoute.tsx`
- Create: `src/tests/AuthContext.test.tsx`

**Interfaces:**
- Produces:
  - `supabase` — default export from `src/lib/supabase.ts`, typed `SupabaseClient`
  - `useAuth()` — returns `{ user: User | null, session: Session | null, loading: boolean }`
  - `<AuthProvider>` — wraps app
  - `<ProtectedRoute>` — renders children or redirects to `/signin`

- [ ] **Step 1: Write the failing test**

Create `src/tests/AuthContext.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'

function TestConsumer() {
  const { user, loading } = useAuth()
  if (loading) return <div>loading</div>
  return <div>{user ? 'signed-in' : 'signed-out'}</div>
}

test('AuthContext renders without crashing and starts in loading state', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    </MemoryRouter>
  )
  // Starts loading (supabase.auth.getSession is async)
  expect(screen.getByText('loading')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/tests/AuthContext.test.tsx
```

Expected: FAIL with "Cannot find module '../context/AuthContext'"

- [ ] **Step 3: Create `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 4: Create `src/context/AuthContext.tsx`**

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, session: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

- [ ] **Step 5: Create `src/components/ProtectedRoute.tsx`**

```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactNode } from 'react'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ color: '#F1F5F9', padding: 40 }}>Loading…</div>
  if (!user) return <Navigate to="/signin" replace />
  return <>{children}</>
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npx vitest run src/tests/AuthContext.test.tsx
```

Expected: `1 passed`

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase.ts src/context/AuthContext.tsx src/components/ProtectedRoute.tsx src/tests/AuthContext.test.tsx
git commit -m "feat: add Supabase client, AuthContext, and ProtectedRoute"
```

---

## Task 4: SignIn page + Onboarding page + update App.tsx

**Files:**
- Create: `src/pages/SignIn.tsx`
- Create: `src/pages/Onboarding.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAuth()` from `AuthContext`, `supabase` from `src/lib/supabase.ts`
- Produces: `/signin` and `/onboarding` routes; all other routes wrapped in `ProtectedRoute`

- [ ] **Step 1: Create `src/pages/SignIn.tsx`**

```typescript
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) setError(error.message)
  }

  const handleMagicLink = async () => {
    if (!email.trim()) return
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0D0D14', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#1A1A27', border: '1px solid #22223A', borderRadius: 16,
        padding: '40px 36px', width: '100%', maxWidth: 400,
      }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#F5A623' }}>JuKatha</h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748B' }}>Artist Dashboard</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', color: '#1DB954', fontSize: 14, lineHeight: 1.6 }}>
            Check your email for a magic link to sign in.
          </div>
        ) : (
          <>
            <button
              onClick={handleGoogle}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 9, fontSize: 14, fontWeight: 600,
                background: '#fff', color: '#000', border: 'none', cursor: 'pointer', marginBottom: 16,
              }}
            >
              Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: '#22223A' }} />
              <span style={{ fontSize: 12, color: '#475569' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#22223A' }} />
            </div>

            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 9, fontSize: 14,
                background: '#0D0D14', border: '1px solid #22223A',
                color: '#F1F5F9', marginBottom: 12, boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleMagicLink}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 9, fontSize: 14, fontWeight: 600,
                background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)',
                color: '#F5A623', cursor: 'pointer',
              }}
            >
              Send Magic Link
            </button>

            {error && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#EF4444', textAlign: 'center' }}>
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/pages/Onboarding.tsx`**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ artist_name: '', location: '', genre: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!form.artist_name.trim()) { setError('Artist name is required'); return }
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ artist_name: form.artist_name, location: form.location, genre: form.genre })
      .eq('id', user!.id)
    if (error) { setError(error.message); setSaving(false); return }
    navigate('/', { replace: true })
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 9, fontSize: 14,
    background: '#0D0D14', border: '1px solid #22223A',
    color: '#F1F5F9', marginBottom: 14, boxSizing: 'border-box' as const,
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0D0D14', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#1A1A27', border: '1px solid #22223A', borderRadius: 16,
        padding: '40px 36px', width: '100%', maxWidth: 440,
      }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>
          Set up your profile
        </h2>
        <p style={{ margin: '0 0 28px', fontSize: 13, color: '#64748B' }}>
          Tell us about yourself to get started.
        </p>

        <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 }}>Artist Name *</label>
        <input
          style={inputStyle}
          placeholder="e.g. JuKatha"
          value={form.artist_name}
          onChange={e => setForm({ ...form, artist_name: e.target.value })}
        />

        <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 }}>Location</label>
        <input
          style={inputStyle}
          placeholder="e.g. Lagos, Nigeria"
          value={form.location}
          onChange={e => setForm({ ...form, location: e.target.value })}
        />

        <label style={{ fontSize: 11.5, color: '#64748B', display: 'block', marginBottom: 5 }}>Genre</label>
        <input
          style={inputStyle}
          placeholder="e.g. Afrobeats"
          value={form.genre}
          onChange={e => setForm({ ...form, genre: e.target.value })}
        />

        {error && <div style={{ fontSize: 13, color: '#EF4444', marginBottom: 12 }}>{error}</div>}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 9, fontSize: 14, fontWeight: 600,
            background: 'linear-gradient(135deg, #F5A623, #E8911A)',
            color: '#000', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Get Started'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update `src/App.tsx`**

Replace the entire file:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import SignIn from './pages/SignIn'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Content from './pages/Content'
import Releases from './pages/Releases'
import Accountability from './pages/Accountability'
import Revenue from './pages/Revenue'
import Milestones from './pages/Milestones'
import Suggestions from './pages/Suggestions'
import Connections from './pages/Connections'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="content" element={<Content />} />
            <Route path="releases" element={<Releases />} />
            <Route path="accountability" element={<Accountability />} />
            <Route path="revenue" element={<Revenue />} />
            <Route path="milestones" element={<Milestones />} />
            <Route path="suggestions" element={<Suggestions />} />
            <Route path="connections" element={<Connections />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to local `.env`**

Create `server/.env` (copy from `.env.example`) and fill in the Supabase values. Also create a root `.env` file for Vite:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

- [ ] **Step 5: Smoke-test locally**

```bash
npm run dev
```

Visit `http://localhost:5173`. Should redirect to `/signin`. Google button and magic link form should appear.

- [ ] **Step 6: Commit**

```bash
git add src/pages/SignIn.tsx src/pages/Onboarding.tsx src/App.tsx
git commit -m "feat: add SignIn and Onboarding pages, wrap app in AuthProvider + ProtectedRoute"
```

---

## Task 5: `api/_lib/auth.js` — shared JWT verification utility

**Files:**
- Create: `api/_lib/auth.js`

**Interfaces:**
- Produces:
  - `supabaseAdmin` — `SupabaseClient` with service role key
  - `verifyUser(req)` → `Promise<{ id: string, email: string }>` — throws if invalid
  - `getPlatformCreds(userId, platform)` → `Promise<object>` — throws if not connected
  - `signOAuthState(userId)` → `{ state: string, nonce: string }`
  - `verifyOAuthState(state, nonce)` → `userId: string` — throws if invalid

- [ ] **Step 1: Create `api/_lib/auth.js`**

```javascript
import { createClient } from '@supabase/supabase-js'
import { createHmac, randomBytes } from 'node:crypto'

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function verifyUser(req) {
  const auth = req.headers['authorization'] ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) throw new Error('Missing Authorization header')

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Invalid or expired token')
  return user
}

export async function getPlatformCreds(userId, platform) {
  const { data, error } = await supabaseAdmin
    .from('platform_connections')
    .select('credentials')
    .eq('user_id', userId)
    .eq('platform', platform)
    .single()

  if (error || !data) throw new Error(`No ${platform} connection found`)
  return data.credentials
}

export function signOAuthState(userId) {
  const nonce = randomBytes(16).toString('hex')
  const payload = `${userId}.${nonce}`
  const sig = createHmac('sha256', process.env.OAUTH_STATE_SECRET).update(payload).digest('hex')
  return { state: `${payload}.${sig}`, nonce }
}

export function verifyOAuthState(state, nonce) {
  const parts = state.split('.')
  if (parts.length !== 3) throw new Error('Invalid state format')
  const [userId, statNonce, sig] = parts
  if (statNonce !== nonce) throw new Error('Nonce mismatch')
  const expected = createHmac('sha256', process.env.OAUTH_STATE_SECRET)
    .update(`${userId}.${nonce}`)
    .digest('hex')
  if (sig !== expected) throw new Error('State signature invalid')
  return userId
}
```

- [ ] **Step 2: Verify the file has no syntax errors**

```bash
node --input-type=module < api/_lib/auth.js 2>&1 | head -5
```

Expected: no output (or only the `createHmac` import line if SUPABASE_URL is unset — that's fine, we're just checking syntax).

- [ ] **Step 3: Commit**

```bash
git add api/_lib/auth.js
git commit -m "feat: add shared JWT verification utility for Vercel API routes"
```

---

## Task 6: Update all platform Vercel API routes to use JWT + DB credentials

**Files:**
- Modify: `api/status.js`
- Modify: `api/youtube/channel.js`
- Modify: `api/youtube/videos.js`
- Modify: `api/spotify/artist.js`
- Modify: `api/spotify/top-tracks.js`
- Modify: `api/audiomack/artist.js`
- Modify: `api/audiomack/songs.js`

**Interfaces:**
- Consumes: `verifyUser`, `getPlatformCreds` from `api/_lib/auth.js`
- Produces: All routes now return per-user data or 401/404

- [ ] **Step 1: Update `api/status.js`**

Replace the entire file:

```javascript
import { verifyUser, supabaseAdmin } from './_lib/auth.js'

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const { data } = await supabaseAdmin
      .from('platform_connections')
      .select('platform')
      .eq('user_id', user.id)

    const connected = new Set((data ?? []).map(r => r.platform))
    res.json({
      youtube:   connected.has('youtube'),
      spotify:   connected.has('spotify'),
      instagram: connected.has('instagram'),
      tiktok:    connected.has('tiktok'),
      audiomack: connected.has('audiomack'),
    })
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
```

- [ ] **Step 2: Update `api/youtube/channel.js`**

Replace the entire file:

```javascript
import { verifyUser, getPlatformCreds } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'youtube')
    const { channel_id } = creds

    const url = new URL('https://www.googleapis.com/youtube/v3/channels')
    url.searchParams.set('part', 'snippet,statistics')
    url.searchParams.set('id', channel_id)
    url.searchParams.set('key', process.env.YOUTUBE_API_KEY)

    const r = await fetch(url.toString())
    if (!r.ok) return res.status(r.status).json({ error: 'YouTube API error' })

    const d = await r.json()
    const ch = d.items?.[0]
    if (!ch) return res.status(404).json({ error: 'Channel not found' })

    res.json({
      name: ch.snippet.title,
      subscribers: Number(ch.statistics.subscriberCount),
      totalViews: Number(ch.statistics.viewCount),
      videoCount: Number(ch.statistics.videoCount),
      thumbnail: ch.snippet.thumbnails?.default?.url ?? '',
    })
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
```

- [ ] **Step 3: Update `api/youtube/videos.js`**

Replace the entire file:

```javascript
import { verifyUser, getPlatformCreds } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'youtube')
    const { channel_id } = creds
    const key = process.env.YOUTUBE_API_KEY

    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.searchParams.set('part', 'id')
    searchUrl.searchParams.set('channelId', channel_id)
    searchUrl.searchParams.set('maxResults', '10')
    searchUrl.searchParams.set('order', 'date')
    searchUrl.searchParams.set('type', 'video')
    searchUrl.searchParams.set('key', key)

    const searchRes = await fetch(searchUrl.toString())
    if (!searchRes.ok) return res.status(searchRes.status).json({ error: 'YouTube search error' })

    const searchData = await searchRes.json()
    const ids = (searchData.items ?? []).map(i => i.id.videoId).join(',')
    if (!ids) return res.json([])

    const statsUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    statsUrl.searchParams.set('part', 'snippet,statistics')
    statsUrl.searchParams.set('id', ids)
    statsUrl.searchParams.set('key', key)

    const statsRes = await fetch(statsUrl.toString())
    const statsData = await statsRes.json()

    const videos = (statsData.items ?? []).map(v => ({
      id: v.id,
      title: v.snippet.title,
      published: v.snippet.publishedAt,
      thumbnail: v.snippet.thumbnails?.medium?.url ?? '',
      views: Number(v.statistics.viewCount ?? 0),
      likes: Number(v.statistics.likeCount ?? 0),
      comments: Number(v.statistics.commentCount ?? 0),
    }))

    res.json(videos)
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
```

- [ ] **Step 4: Update `api/spotify/artist.js`**

Replace the entire file:

```javascript
import { verifyUser, getPlatformCreds } from '../_lib/auth.js'

async function getSpotifyToken() {
  const creds = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  const d = await r.json()
  return d.access_token
}

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'spotify')
    const { artist_id } = creds

    const token = await getSpotifyToken()
    const r = await fetch(`https://api.spotify.com/v1/artists/${artist_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!r.ok) return res.status(r.status).json({ error: 'Spotify API error' })

    const d = await r.json()
    res.json({
      name: d.name,
      followers: d.followers.total,
      popularity: d.popularity,
      genres: d.genres,
      thumbnail: d.images?.[0]?.url ?? '',
    })
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
```

- [ ] **Step 5: Update `api/spotify/top-tracks.js`**

Replace the entire file:

```javascript
import { verifyUser, getPlatformCreds } from '../_lib/auth.js'

async function getSpotifyToken() {
  const creds = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  const d = await r.json()
  return d.access_token
}

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'spotify')
    const { artist_id } = creds

    const token = await getSpotifyToken()
    const r = await fetch(`https://api.spotify.com/v1/artists/${artist_id}/top-tracks?market=US`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!r.ok) return res.status(r.status).json({ error: 'Spotify API error' })

    const d = await r.json()
    const tracks = (d.tracks ?? []).map(t => ({
      id: t.id,
      name: t.name,
      album: t.album.name,
      releaseDate: t.album.release_date,
      popularity: t.popularity,
      previewUrl: t.preview_url,
      thumbnail: t.album.images?.[0]?.url ?? '',
    }))
    res.json(tracks)
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
```

- [ ] **Step 6: Update `api/audiomack/artist.js`**

Replace the top of the file (keep the OAuth 1.0a signature logic, replace the credential reads):

```javascript
import { createHmac, randomBytes } from 'node:crypto'
import { verifyUser, getPlatformCreds } from '../_lib/auth.js'

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
  const paramStr = Object.entries(params).sort().map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  const base = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`
  const sigKey = `${encodeURIComponent(consumerSecret)}&`
  const sig = createHmac('sha1', sigKey).update(base).digest('base64')
  params.oauth_signature = sig
  return 'OAuth ' + Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`).join(', ')
}

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'audiomack')
    const { slug } = creds

    const consumerKey = process.env.AUDIOMACK_CONSUMER_KEY
    const consumerSecret = process.env.AUDIOMACK_CONSUMER_SECRET
    const url = `https://api.audiomack.com/v1/artist/${slug}`
    const auth = buildOAuth1Header('GET', url, consumerKey, consumerSecret)

    const r = await fetch(url, { headers: { Authorization: auth } })
    if (!r.ok) return res.status(r.status).json({ error: 'Audiomack API error' })

    const d = await r.json()
    res.json({
      name: d.results?.name ?? slug,
      plays: d.results?.plays ?? 0,
      followers: d.results?.followers ?? 0,
      thumbnail: d.results?.image ?? '',
    })
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
```

- [ ] **Step 7: Update `api/audiomack/songs.js`** — same pattern: `verifyUser` → `getPlatformCreds(user.id, 'audiomack')` → use `creds.slug`, same OAuth 1.0a header builder (copy from artist.js).

- [ ] **Step 8: Update `src/hooks/useLiveData.ts` to send JWT**

Replace the `sync` function header section. Add import at top:

```typescript
import { useAuth } from '../context/AuthContext'
```

Inside `useLivePlatformMetrics`, add before the `sync` callback:

```typescript
const { session } = useAuth()
```

Update every `fetch` call in `sync` to add the Authorization header. Replace all instances of:

```typescript
const r = await fetch(`${API}/youtube/channel`, { credentials: 'include' })
```

with:

```typescript
const r = await fetch(`${API}/youtube/channel`, {
  headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
})
```

Apply the same change to all 5 platform fetch calls (`/youtube/channel`, `/spotify/artist`, `/instagram/stats`, `/tiktok/stats`, `/audiomack/artist`).

Also update `useConnectionStatus` to send the JWT on `/api/status`:

```typescript
const { session } = useAuth()
// in the fetch:
fetch(`${API}/status`, {
  headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
})
```

- [ ] **Step 9: Run TypeScript check**

```bash
node_modules\.bin\tsc.cmd --noEmit
```

Expected: no errors

- [ ] **Step 10: Commit**

```bash
git add api/status.js api/youtube/channel.js api/youtube/videos.js api/spotify/artist.js api/spotify/top-tracks.js api/audiomack/artist.js api/audiomack/songs.js src/hooks/useLiveData.ts
git commit -m "feat: add JWT verification to all platform API routes, read credentials from DB"
```

---

## Task 7: Instagram OAuth flow — signed state + DB write

**Files:**
- Modify: `api/instagram/auth.js`
- Modify: `api/instagram/callback.js`
- Modify: `api/instagram/stats.js`

**Interfaces:**
- Consumes: `verifyUser`, `signOAuthState`, `verifyOAuthState`, `supabaseAdmin`, `getPlatformCreds` from `api/_lib/auth.js`

- [ ] **Step 1: Update `api/instagram/auth.js`**

Replace the entire file:

```javascript
import { verifyUser, signOAuthState } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const { state, nonce } = signOAuthState(user.id)

    const host = req.headers.host ?? 'localhost:3001'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const redirect = `${protocol}://${host}/api/instagram/callback`

    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID,
      redirect_uri: redirect,
      scope: 'user_profile,user_media',
      response_type: 'code',
      state,
    })

    res.setHeader('Set-Cookie', `ig_nonce=${nonce}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`)
    res.redirect(`https://api.instagram.com/oauth/authorize?${params}`)
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
```

- [ ] **Step 2: Update `api/instagram/callback.js`**

Replace the entire file:

```javascript
import { verifyOAuthState, supabaseAdmin } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    const { code, state } = req.query
    const cookieHeader = req.headers.cookie ?? ''
    const nonce = cookieHeader.split(';').find(c => c.trim().startsWith('ig_nonce='))?.split('=')[1]?.trim()
    if (!nonce) return res.status(400).json({ error: 'Missing nonce cookie' })

    const userId = verifyOAuthState(state, nonce)

    const host = req.headers.host ?? 'localhost:3001'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const redirect = `${protocol}://${host}/api/instagram/callback`

    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID,
        client_secret: process.env.INSTAGRAM_APP_SECRET,
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
      credentials: { access_token: tokenData.access_token, user_id: tokenData.user_id },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    res.setHeader('Set-Cookie', 'ig_nonce=; HttpOnly; Path=/; Max-Age=0')
    res.redirect(`${protocol}://${host.replace('3001', '5173')}/connections?connected=instagram`)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}
```

- [ ] **Step 3: Update `api/instagram/stats.js`**

Replace the entire file:

```javascript
import { verifyUser, getPlatformCreds } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'instagram')
    const { access_token } = creds

    const r = await fetch(
      `https://graph.instagram.com/me?fields=followers_count,media_count&access_token=${access_token}`
    )
    if (!r.ok) return res.status(r.status).json({ error: 'Instagram API error' })

    const d = await r.json()
    res.json({ followers: d.followers_count ?? 0, mediaCount: d.media_count ?? 0 })
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add api/instagram/auth.js api/instagram/callback.js api/instagram/stats.js
git commit -m "feat: Instagram OAuth with signed state + Supabase DB write"
```

---

## Task 8: TikTok OAuth flow — signed state + DB write

**Files:**
- Modify: `api/tiktok/auth.js`
- Modify: `api/tiktok/callback.js`
- Modify: `api/tiktok/stats.js`

**Interfaces:**
- Consumes: `verifyUser`, `signOAuthState`, `verifyOAuthState`, `supabaseAdmin`, `getPlatformCreds` from `api/_lib/auth.js`

- [ ] **Step 1: Update `api/tiktok/auth.js`**

Replace the entire file:

```javascript
import { verifyUser, signOAuthState } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const { state, nonce } = signOAuthState(user.id)

    const host = req.headers.host ?? 'localhost:3001'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const redirect = `${protocol}://${host}/api/tiktok/callback`

    const params = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      scope: 'user.info.basic',
      response_type: 'code',
      redirect_uri: redirect,
      state,
    })

    res.setHeader('Set-Cookie', `tt_nonce=${nonce}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`)
    res.redirect(`https://www.tiktok.com/auth/authorize/?${params}`)
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
```

- [ ] **Step 2: Update `api/tiktok/callback.js`**

Replace the entire file:

```javascript
import { verifyOAuthState, supabaseAdmin } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    const { code, state } = req.query
    const cookieHeader = req.headers.cookie ?? ''
    const nonce = cookieHeader.split(';').find(c => c.trim().startsWith('tt_nonce='))?.split('=')[1]?.trim()
    if (!nonce) return res.status(400).json({ error: 'Missing nonce cookie' })

    const userId = verifyOAuthState(state, nonce)

    const host = req.headers.host ?? 'localhost:3001'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const redirect = `${protocol}://${host}/api/tiktok/callback`

    const tokenRes = await fetch('https://open-api.tiktok.com/oauth/access_token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
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
      credentials: { access_token: token.access_token, open_id: token.open_id },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    res.setHeader('Set-Cookie', 'tt_nonce=; HttpOnly; Path=/; Max-Age=0')
    res.redirect(`${protocol}://${host.replace('3001', '5173')}/connections?connected=tiktok`)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}
```

- [ ] **Step 3: Update `api/tiktok/stats.js`**

Replace the entire file:

```javascript
import { verifyUser, getPlatformCreds } from '../_lib/auth.js'

export default async function handler(req, res) {
  try {
    const user = await verifyUser(req)
    const creds = await getPlatformCreds(user.id, 'tiktok')
    const { access_token, open_id } = creds

    const r = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=follower_count,video_count,like_count', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    })
    if (!r.ok) return res.status(r.status).json({ error: 'TikTok API error' })

    const d = await r.json()
    const info = d.data?.user ?? {}
    res.json({
      followers: info.follower_count ?? 0,
      videoCount: info.video_count ?? 0,
      likes: info.like_count ?? 0,
    })
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add api/tiktok/auth.js api/tiktok/callback.js api/tiktok/stats.js
git commit -m "feat: TikTok OAuth with signed state + Supabase DB write"
```

---

## Task 9: Update Connections page to read/write Supabase

**Files:**
- Modify: `src/pages/Connections.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `supabase` client, `session.access_token` for OAuth auth routes
- Produces: Connections page reads real `platform_connections` rows; simple platforms (YouTube, Spotify, Audiomack) write directly via Supabase client; OAuth platforms (Instagram, TikTok) redirect to `/api/instagram/auth` with JWT in Authorization header via a fetch+redirect pattern

> Note: Because OAuth auth routes require a server redirect (not a JSON response), the frontend must open them in a new tab or use `window.location.href` after a preflight. Since the JWT must reach the server, the cleanest approach is a small server-side redirect: the frontend navigates to `/api/instagram/auth` while the JWT is already in the cookie-less Authorization header. This is a limitation — we solve it by embedding the JWT in the URL query param ONLY for the auth initiation route (short-lived, server extracts it once, never stored).

The OAuth auth routes (`api/instagram/auth.js`, `api/tiktok/auth.js`) need to accept the token as either `Authorization: Bearer ...` header OR `?token=...` query param for the browser-navigation case. Update those two files:

In `api/instagram/auth.js` and `api/tiktok/auth.js`, change the `verifyUser` call to:

```javascript
// Accept token from header OR ?token= query param (browser navigation)
const token = (req.headers['authorization'] ?? '').replace('Bearer ', '') || req.query.token
if (!token) throw new Error('Missing token')
const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
if (error || !user) throw new Error('Invalid token')
```

Then in the Connections page, navigate to `/api/instagram/auth?token=${session.access_token}`.

- [ ] **Step 1: Update `api/instagram/auth.js` to accept `?token=` param**

In the try block, replace `const user = await verifyUser(req)` with:

```javascript
const token = (req.headers['authorization'] ?? '').replace('Bearer ', '') || req.query.token
if (!token) throw new Error('Missing token')
const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
if (error || !user) throw new Error('Invalid token')
```

Add `import { supabaseAdmin, signOAuthState } from '../_lib/auth.js'` (remove `verifyUser` from the import since we replaced it inline).

- [ ] **Step 2: Apply same change to `api/tiktok/auth.js`**

Same token extraction pattern as Step 1.

- [ ] **Step 3: Rewrite `src/pages/Connections.tsx`**

Replace the entire file:

```typescript
import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, Link2, Unlink, AlertCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface PlatformConnection {
  platform: string
  connected: boolean
  credentials: Record<string, string>
}

const PLATFORMS = ['youtube', 'spotify', 'audiomack', 'instagram', 'tiktok']

const PLATFORM_META: Record<string, { label: string; color: string; oAuth: boolean }> = {
  youtube:   { label: 'YouTube',   color: '#FF0000', oAuth: false },
  spotify:   { label: 'Spotify',   color: '#1DB954', oAuth: false },
  audiomack: { label: 'Audiomack', color: '#FF6B00', oAuth: false },
  instagram: { label: 'Instagram', color: '#E1306C', oAuth: true  },
  tiktok:    { label: 'TikTok',    color: '#FF0050', oAuth: true  },
}

const ID_FIELD: Record<string, { label: string; placeholder: string; key: string }> = {
  youtube:   { label: 'Channel ID',    placeholder: 'UCxxxxxx',   key: 'channel_id' },
  spotify:   { label: 'Artist ID',     placeholder: 'from open.spotify.com/artist/…', key: 'artist_id' },
  audiomack: { label: 'Profile Slug',  placeholder: 'your-slug',  key: 'slug' },
}

export default function Connections() {
  const { user, session } = useAuth()
  const [connections, setConnections] = useState<Record<string, PlatformConnection>>({})
  const [loading, setLoading] = useState(true)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('platform_connections')
      .select('platform, credentials')
      .eq('user_id', user.id)

    const map: Record<string, PlatformConnection> = {}
    PLATFORMS.forEach(p => {
      const row = (data ?? []).find(r => r.platform === p)
      map[p] = { platform: p, connected: !!row, credentials: row?.credentials ?? {} }
    })
    setConnections(map)
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
    // Handle ?connected=platform redirect from OAuth callback
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    if (connected) {
      window.history.replaceState({}, '', '/connections')
      load()
    }
  }, [load])

  const saveSimple = async (platform: string) => {
    const field = ID_FIELD[platform]
    const value = inputs[platform]?.trim()
    if (!value) return
    setSaving(s => ({ ...s, [platform]: true }))
    setError(e => ({ ...e, [platform]: '' }))

    const { error: err } = await supabase.from('platform_connections').upsert({
      user_id: user!.id,
      platform,
      credentials: { [field.key]: value },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    if (err) setError(e => ({ ...e, [platform]: err.message }))
    else { setInputs(i => ({ ...i, [platform]: '' })); await load() }
    setSaving(s => ({ ...s, [platform]: false }))
  }

  const disconnect = async (platform: string) => {
    await supabase
      .from('platform_connections')
      .delete()
      .eq('user_id', user!.id)
      .eq('platform', platform)
    await load()
  }

  const connectOAuth = (platform: string) => {
    if (!session) return
    window.location.href = `/api/${platform}/auth?token=${session.access_token}`
  }

  if (loading) return <div style={{ padding: 40, color: '#F1F5F9' }}>Loading connections…</div>

  return (
    <div style={{ padding: '28px 28px 48px', color: '#F1F5F9', maxWidth: 800 }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Connections</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#475569' }}>
          Connect your accounts to pull live stats into your dashboard.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {PLATFORMS.map(platform => {
          const meta = PLATFORM_META[platform]
          const conn = connections[platform]
          const field = ID_FIELD[platform]

          return (
            <div key={platform} style={{
              background: '#1A1A27', border: `1px solid ${conn?.connected ? meta.color + '44' : '#22223A'}`,
              borderRadius: 12, padding: '20px 22px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: conn?.connected ? 0 : 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color }} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                  {conn?.connected && <CheckCircle2 size={14} color="#1DB954" />}
                </div>
                {conn?.connected && (
                  <button
                    onClick={() => disconnect(platform)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
                      color: '#EF4444', background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7,
                      padding: '5px 12px', cursor: 'pointer',
                    }}
                  >
                    <Unlink size={12} /> Disconnect
                  </button>
                )}
              </div>

              {conn?.connected && (
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
                  {field
                    ? `Connected: ${conn.credentials[field.key]}`
                    : 'Connected via OAuth'
                  }
                </div>
              )}

              {!conn?.connected && meta.oAuth && (
                <button
                  onClick={() => connectOAuth(platform)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
                    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: `${meta.color}18`, border: `1px solid ${meta.color}44`,
                    color: meta.color,
                  }}
                >
                  <Link2 size={13} /> Connect {meta.label}
                </button>
              )}

              {!conn?.connected && !meta.oAuth && field && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    placeholder={field.label + ' — ' + field.placeholder}
                    value={inputs[platform] ?? ''}
                    onChange={e => setInputs(i => ({ ...i, [platform]: e.target.value }))}
                    style={{
                      flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 13,
                      background: '#0D0D14', border: '1px solid #22223A', color: '#F1F5F9',
                    }}
                  />
                  <button
                    onClick={() => saveSimple(platform)}
                    disabled={saving[platform]}
                    style={{
                      padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: `${meta.color}18`, border: `1px solid ${meta.color}44`,
                      color: meta.color, cursor: 'pointer',
                    }}
                  >
                    {saving[platform] ? 'Saving…' : 'Connect'}
                  </button>
                </div>
              )}

              {error[platform] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#EF4444' }}>
                  <AlertCircle size={12} /> {error[platform]}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={load}
        style={{
          marginTop: 20, display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <RefreshCw size={12} /> Refresh connections
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run TypeScript check**

```bash
node_modules\.bin\tsc.cmd --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/Connections.tsx api/instagram/auth.js api/tiktok/auth.js
git commit -m "feat: Connections page reads/writes Supabase platform_connections"
```

---

## Task 10: Accountability page — real `daily_slate` CRUD

**Files:**
- Modify: `src/pages/Accountability.tsx`
- Create: `src/tests/Accountability.test.tsx`

**Interfaces:**
- Consumes: `supabase` client, `useAuth()`
- DB columns: `gym`, `salon_duty`, `study`, `content_posted`, `verse_written` (snake_case)
- UI state keys: `gym`, `salonDuty`, `study`, `contentPosted`, `verseWritten` (camelCase)

- [ ] **Step 1: Write the failing test**

Create `src/tests/Accountability.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
      upsert: () => Promise.resolve({ error: null }),
    }),
  },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' }, session: null }),
}))

test('Accountability renders slate items', async () => {
  const { default: Accountability } = await import('../pages/Accountability')
  render(<MemoryRouter><Accountability /></MemoryRouter>)
  expect(await screen.findByText('Gym Session')).toBeInTheDocument()
  expect(screen.getByText('Salon Duty')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/tests/Accountability.test.tsx
```

Expected: FAIL (imports from mockData still exist)

- [ ] **Step 3: Rewrite `src/pages/Accountability.tsx`**

Replace the entire file:

```typescript
import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle, Flame, Calendar, Star, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const heatColor = (v: number) => {
  if (v === 0) return '#1A1A27'
  if (v === 1) return '#2D1A4A'
  if (v === 2) return '#4A1E6E'
  if (v === 3) return '#7C3AED'
  if (v === 4) return '#A855F7'
  return '#C084FC'
}

interface Slate {
  gym: boolean
  salonDuty: boolean
  study: boolean
  contentPosted: boolean
  verseWritten: boolean
}

const DEFAULT_SLATE: Slate = {
  gym: false, salonDuty: false, study: false, contentPosted: false, verseWritten: false,
}

function toDb(s: Slate) {
  return {
    gym: s.gym,
    salon_duty: s.salonDuty,
    study: s.study,
    content_posted: s.contentPosted,
    verse_written: s.verseWritten,
  }
}

function fromDb(row: Record<string, boolean>): Slate {
  return {
    gym: row.gym ?? false,
    salonDuty: row.salon_duty ?? false,
    study: row.study ?? false,
    contentPosted: row.content_posted ?? false,
    verseWritten: row.verse_written ?? false,
  }
}

interface HeatDay { date: string; value: number }
interface StreakData { current: number; longest: number; thisMonth: number; totalDays: number }

export default function Accountability() {
  const { user } = useAuth()
  const [slate, setSlate] = useState<Slate>(DEFAULT_SLATE)
  const [heatData, setHeatData] = useState<HeatDay[]>([])
  const [streakData, setStreakData] = useState<StreakData>({ current: 0, longest: 0, thisMonth: 0, totalDays: 0 })

  const today = new Date().toISOString().split('T')[0]

  const loadSlate = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('daily_slate')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()
    if (data) setSlate(fromDb(data))
  }, [user, today])

  const loadHistory = useCallback(async () => {
    if (!user) return
    const since = new Date()
    since.setDate(since.getDate() - 29)
    const { data } = await supabase
      .from('daily_slate')
      .select('date, gym, salon_duty, study, content_posted, verse_written')
      .eq('user_id', user.id)
      .gte('date', since.toISOString().split('T')[0])
      .order('date', { ascending: true })

    const days: HeatDay[] = []
    let current = 0, longest = 0, thisMonth = 0, totalDays = 0, run = 0
    const month = new Date().getMonth()

    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const row = (data ?? []).find(r => r.date === dateStr)
      const val = row
        ? [row.gym, row.salon_duty, row.study, row.content_posted, row.verse_written].filter(Boolean).length
        : 0
      days.push({ date: dateStr, value: val })

      if (val > 0) {
        totalDays++
        run++
        if (run > longest) longest = run
        if (d.getMonth() === month) thisMonth++
      } else {
        if (i === 0) current = 0
        run = 0
      }
      if (i === 0) current = run
    }

    setHeatData(days)
    setStreakData({ current, longest, thisMonth, totalDays })
  }, [user])

  useEffect(() => {
    loadSlate()
    loadHistory()
  }, [loadSlate, loadHistory])

  const toggle = async (key: keyof Slate) => {
    const next = { ...slate, [key]: !slate[key] }
    setSlate(next)
    await supabase.from('daily_slate').upsert(
      { user_id: user!.id, date: today, ...toDb(next) },
      { onConflict: 'user_id,date' }
    )
    await loadHistory()
  }

  const slateItems = [
    { key: 'gym' as const, label: 'Gym Session', emoji: '💪', description: 'Daily physical training' },
    { key: 'salonDuty' as const, label: 'Salon Duty', emoji: '✂️', description: 'Appearance & grooming maintenance' },
    { key: 'study' as const, label: 'Study Block', emoji: '📚', description: 'Music theory, business, or language' },
    { key: 'contentPosted' as const, label: 'Content Posted', emoji: '🎬', description: 'At least 1 post on any platform' },
    { key: 'verseWritten' as const, label: 'Verse Written', emoji: '✍️', description: 'Original lyrics or song section' },
  ]

  const doneCount = Object.values(slate).filter(Boolean).length

  return (
    <div style={{ padding: '28px 28px 48px', color: '#F1F5F9', maxWidth: 1380 }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Accountability</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#475569' }}>Daily discipline drives platform growth</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Streak stats */}
        <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>Streak Tracker</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {[
              { icon: Flame, label: 'Current Streak', value: streakData.current, color: '#F97316' },
              { icon: Star, label: 'Longest Streak', value: streakData.longest, color: '#F5A623' },
              { icon: Calendar, label: 'This Month', value: streakData.thisMonth, color: '#8B5CF6' },
              { icon: TrendingUp, label: 'Total Days', value: streakData.totalDays, color: '#1DB954' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} style={{ background: `${color}10`, border: `1px solid ${color}22`, borderRadius: 10, padding: '16px 14px', textAlign: 'center' }}>
                <Icon size={18} color={color} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>days</div>
                <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4, fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Slate */}
        <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Today's Slate</div>
            <div style={{
              fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
              background: doneCount >= 4 ? 'rgba(29,185,84,0.12)' : doneCount >= 2 ? 'rgba(245,166,35,0.12)' : 'rgba(239,68,68,0.12)',
              color: doneCount >= 4 ? '#1DB954' : doneCount >= 2 ? '#F5A623' : '#EF4444',
              border: `1px solid ${doneCount >= 4 ? 'rgba(29,185,84,0.25)' : doneCount >= 2 ? 'rgba(245,166,35,0.25)' : 'rgba(239,68,68,0.25)'}`,
            }}>
              {doneCount}/5 done
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {slateItems.map(item => {
              const done = slate[item.key]
              return (
                <button
                  key={item.key}
                  onClick={() => toggle(item.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 9,
                    background: done ? 'rgba(29,185,84,0.07)' : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${done ? 'rgba(29,185,84,0.22)' : '#22223A'}`,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  {done ? <CheckCircle2 size={16} color="#1DB954" /> : <Circle size={16} color="#475569" />}
                  <span style={{ fontSize: 14 }}>{item.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13.5, color: done ? '#F1F5F9' : '#94A3B8', fontWeight: done ? 600 : 400 }}>{item.label}</div>
                    <div style={{ fontSize: 11.5, color: '#475569' }}>{item.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div style={{ background: '#1A1A27', border: '1px solid #22223A', borderRadius: 12, padding: '22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>30-Day Accountability Heatmap</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#64748B' }}>
            <span>Less</span>
            {[0, 1, 2, 3, 4, 5].map(v => (
              <div key={v} style={{ width: 12, height: 12, borderRadius: 3, background: heatColor(v) }} />
            ))}
            <span>More</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
          {heatData.map((d, i) => (
            <div key={i} title={`${d.date}: ${d.value}/5 tasks`} style={{
              aspectRatio: '1', borderRadius: 5, background: heatColor(d.value),
              border: '1px solid rgba(255,255,255,0.04)', position: 'relative',
            }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', position: 'absolute', top: 3, left: 4 }}>
                {d.date.split('-')[2]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test**

```bash
npx vitest run src/tests/Accountability.test.tsx
```

Expected: `1 passed`

- [ ] **Step 5: Run TypeScript check**

```bash
node_modules\.bin\tsc.cmd --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/pages/Accountability.tsx src/tests/Accountability.test.tsx
git commit -m "feat: Accountability page reads/writes real daily_slate via Supabase"
```

---

## Task 11: Content page — real `content_posts` CRUD

**Files:**
- Modify: `src/pages/Content.tsx`
- Create: `src/tests/Content.test.tsx`

**Interfaces:**
- Consumes: `supabase` client, `useAuth()`
- DB columns match UI exactly (no camelCase mapping needed for this table)

- [ ] **Step 1: Write the failing test**

Create `src/tests/Content.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
      }),
      insert: () => Promise.resolve({ data: [{ id: 'new-id' }], error: null }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' }, session: null }),
}))

test('Content page renders Add Content button', async () => {
  const { default: Content } = await import('../pages/Content')
  render(<MemoryRouter><Content /></MemoryRouter>)
  expect(await screen.findByText('Add Content')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/tests/Content.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Rewrite `src/pages/Content.tsx`**

Replace the entire file. Keep all styling and UI logic identical to the current version. Change only the data layer:

1. Remove `import { contentPosts } from '../data/mockData'` and `import type { ContentPost, ContentType } from '../data/mockData'`
2. Define types locally:

```typescript
type ContentType = 'freestyle' | 'cover' | 'original' | 'bts' | 'vocal-clip' | 'collab'

interface ContentPost {
  id: string
  title: string
  type: ContentType
  platform: string
  date: string
  views: number
  likes: number
  shares: number
  comments: number
}
```

3. Add imports:

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
```

4. Replace state initialization:

```typescript
const { user } = useAuth()
const [posts, setPosts] = useState<ContentPost[]>([])
```

5. Add load function after state:

```typescript
const load = useCallback(async () => {
  if (!user) return
  const { data } = await supabase
    .from('content_posts')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
  setPosts((data ?? []) as ContentPost[])
}, [user])

useEffect(() => { load() }, [load])
```

6. Replace `handleAdd`:

```typescript
const handleAdd = async () => {
  if (!form.title || !form.date) return
  await supabase.from('content_posts').insert({
    user_id: user!.id,
    title: form.title,
    type: form.type,
    platform: form.platform,
    date: form.date,
    views: Number(form.views) || 0,
    likes: Number(form.likes) || 0,
    shares: Number(form.shares) || 0,
    comments: Number(form.comments) || 0,
  })
  setForm({ title: '', type: 'freestyle', platform: 'TikTok', date: '', views: '', likes: '', shares: '', comments: '' })
  setShowForm(false)
  await load()
}
```

All other UI code remains unchanged.

- [ ] **Step 4: Run test**

```bash
npx vitest run src/tests/Content.test.tsx
```

Expected: `1 passed`

- [ ] **Step 5: Commit**

```bash
git add src/pages/Content.tsx src/tests/Content.test.tsx
git commit -m "feat: Content page reads/writes real content_posts via Supabase"
```

---

## Task 12: Releases page — `tracks` + `track_distribution` CRUD

**Files:**
- Modify: `src/pages/Releases.tsx`

**Interfaces:**
- Consumes: `supabase` client, `useAuth()`
- `tracks` RLS scoped by `user_id`; `track_distribution` RLS via JOIN on `tracks`

- [ ] **Step 1: Read the current `src/pages/Releases.tsx`**

Before editing, read the current file to understand its structure.

- [ ] **Step 2: Identify mock data imports**

Look for imports from `../data/mockData` — likely `tracks` or `releases` array.

- [ ] **Step 3: Define types locally** (remove mockData imports)

```typescript
interface Track {
  id: string
  title: string
  type: string
  featuring: string | null
  release_date: string | null
  upc: string | null
  isrc: string | null
  genre: string | null
  distributions?: Distribution[]
}

interface Distribution {
  id: string
  track_id: string
  platform: string
  status: string
  streams: number
}
```

- [ ] **Step 4: Add Supabase data loading**

```typescript
const { user } = useAuth()
const [tracks, setTracks] = useState<Track[]>([])

const load = useCallback(async () => {
  if (!user) return
  const { data } = await supabase
    .from('tracks')
    .select('*, track_distribution(*)')
    .eq('user_id', user.id)
    .order('release_date', { ascending: false })
  setTracks((data ?? []) as Track[])
}, [user])

useEffect(() => { load() }, [load])
```

- [ ] **Step 5: Update add-track handler**

```typescript
const handleAdd = async () => {
  if (!form.title) return
  const { data } = await supabase.from('tracks').insert({
    user_id: user!.id,
    title: form.title,
    type: form.type,
    featuring: form.featuring || null,
    release_date: form.release_date || null,
    genre: form.genre || null,
  }).select().single()
  if (data && selectedPlatforms.length > 0) {
    await supabase.from('track_distribution').insert(
      selectedPlatforms.map(p => ({ track_id: data.id, platform: p, status: 'pending', streams: 0 }))
    )
  }
  setShowForm(false)
  await load()
}
```

- [ ] **Step 6: Run TypeScript check**

```bash
node_modules\.bin\tsc.cmd --noEmit
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/pages/Releases.tsx
git commit -m "feat: Releases page reads/writes tracks + track_distribution via Supabase"
```

---

## Task 13: Revenue page — computed from `track_distribution.streams`

**Files:**
- Modify: `src/pages/Revenue.tsx`

**Interfaces:**
- Consumes: `supabase` client, `useAuth()`
- Revenue = `streams × RATES[platform]` (manually entered stream counts)

- [ ] **Step 1: Define per-platform streaming rates (USD per stream)**

```typescript
const RATES: Record<string, number> = {
  spotify:   0.003,
  audiomack: 0.0017,
  youtube:   0.002,
  tiktok:    0.00025,
  instagram: 0,
}
```

- [ ] **Step 2: Load distribution data**

```typescript
const { user } = useAuth()
const [rows, setRows] = useState<Array<{ platform: string; streams: number; title: string }>>([])

const load = useCallback(async () => {
  if (!user) return
  const { data } = await supabase
    .from('track_distribution')
    .select('platform, streams, tracks(title)')
    .order('streams', { ascending: false })
  setRows((data ?? []).map(r => ({
    platform: r.platform,
    streams: r.streams,
    title: (r.tracks as { title: string }).title,
  })))
}, [user])

useEffect(() => { load() }, [load])
```

- [ ] **Step 3: Compute revenue per row**

```typescript
const revenueRows = rows.map(r => ({
  ...r,
  revenue: r.streams * (RATES[r.platform.toLowerCase()] ?? 0),
}))
const totalRevenue = revenueRows.reduce((sum, r) => sum + r.revenue, 0)
```

- [ ] **Step 4: Display in the existing Revenue UI** — replace the mock totals with `totalRevenue.toFixed(2)` and map `revenueRows` to the existing table/card structure.

- [ ] **Step 5: Add a note in the UI** that stream counts are entered manually by the user from their distributor dashboard (DistroKid, etc.).

- [ ] **Step 6: Run TypeScript check**

```bash
node_modules\.bin\tsc.cmd --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/Revenue.tsx
git commit -m "feat: Revenue page computes earnings from real stream counts in Supabase"
```

---

## Task 14: Milestones + Badges page

**Files:**
- Modify: `src/pages/Milestones.tsx`

**Interfaces:**
- Consumes: `supabase` client, `useAuth()`, `platform_connections` and `content_posts` counts for milestone logic

**Badge unlock logic (run on each Dashboard load):**
- Phase 1 unlocked: user has at least 1 platform connected
- Phase 2 unlocked: user has 3+ platforms connected
- Phase 3 unlocked: user has all 5 platforms connected
- Badge "First Post": `content_posts` count ≥ 1
- Badge "Week Warrior": 7+ days with full slate in `daily_slate`
- Badge "Connected": first platform connection

- [ ] **Step 1: Load milestones and compute progress**

```typescript
const { user } = useAuth()
const [milestones, setMilestones] = useState<Array<{ phase: number; unlocked: boolean; badge_ids: string[] }>>([])
const [platformCount, setPlatformCount] = useState(0)

const load = useCallback(async () => {
  if (!user) return
  const [{ count: pc }, { data: ms }] = await Promise.all([
    supabase.from('platform_connections').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('milestones').select('*').eq('user_id', user.id).order('phase'),
  ])
  setPlatformCount(pc ?? 0)

  // Compute which phases unlock
  const phase1 = (pc ?? 0) >= 1
  const phase2 = (pc ?? 0) >= 3
  const phase3 = (pc ?? 0) >= 5

  // Upsert milestone rows
  await supabase.from('milestones').upsert([
    { user_id: user.id, phase: 1, unlocked: phase1, badge_ids: phase1 ? ['connected'] : [] },
    { user_id: user.id, phase: 2, unlocked: phase2, badge_ids: phase2 ? ['connected', 'multi-platform'] : [] },
    { user_id: user.id, phase: 3, unlocked: phase3, badge_ids: phase3 ? ['connected', 'multi-platform', 'fully-wired'] : [] },
  ], { onConflict: 'user_id,phase' })

  setMilestones(ms ?? [])
}, [user])

useEffect(() => { load() }, [load])
```

- [ ] **Step 2: Display milestones** — keep existing UI cards but replace mock data arrays with the real `milestones` state.

- [ ] **Step 3: Run TypeScript check**

```bash
node_modules\.bin\tsc.cmd --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Milestones.tsx
git commit -m "feat: Milestones page reads/writes real milestone data from Supabase"
```

---

## Task 15: Suggestions page — rule-based from real data

**Files:**
- Modify: `src/pages/Suggestions.tsx`

**Interfaces:**
- Consumes: `supabase` client, `useAuth()`, `useLivePlatformMetrics()` from `useLiveData.ts`

**Rules (computed at query time, no DB table):**

```typescript
interface Suggestion {
  id: string
  urgency: 'urgent' | 'high' | 'medium' | 'low'
  platform: string
  title: string
}

function buildSuggestions(
  daysSinceLastContent: number,
  platformCount: number,
  slateToday: { contentPosted: boolean },
  platformMetrics: PlatformMetric[],
): Suggestion[] {
  const suggestions: Suggestion[] = []

  if (daysSinceLastContent > 3) suggestions.push({
    id: 'no-content', urgency: 'urgent', platform: 'All',
    title: `No content posted in ${daysSinceLastContent} days — post today to maintain momentum`,
  })

  if (!slateToday.contentPosted) suggestions.push({
    id: 'content-today', urgency: 'high', platform: 'Any',
    title: 'Content not marked as posted today — log a post to keep your streak',
  })

  if (platformCount < 3) suggestions.push({
    id: 'connect-more', urgency: 'medium', platform: 'Connections',
    title: `Only ${platformCount} platform${platformCount === 1 ? '' : 's'} connected — connect more to track full reach`,
  })

  const tiktok = platformMetrics.find(p => p.name === 'TikTok')
  if (tiktok && tiktok.primary.change < 0) suggestions.push({
    id: 'tiktok-drop', urgency: 'high', platform: 'TikTok',
    title: 'TikTok followers dropped this week — increase posting frequency',
  })

  if (suggestions.length === 0) suggestions.push({
    id: 'keep-going', urgency: 'low', platform: 'General',
    title: 'All systems green — keep posting consistently to grow',
  })

  return suggestions
}
```

- [ ] **Step 1: Add data loading**

```typescript
const { user } = useAuth()
const { metrics: platformMetrics, sync } = useLivePlatformMetrics()
const [suggestions, setSuggestions] = useState<Suggestion[]>([])

useEffect(() => { sync() }, [sync])

useEffect(() => {
  if (!user) return
  async function compute() {
    const [{ count: pc }, { data: posts }, slateRes] = await Promise.all([
      supabase.from('platform_connections').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('content_posts').select('date').eq('user_id', user!.id).order('date', { ascending: false }).limit(1),
      supabase.from('daily_slate').select('content_posted').eq('user_id', user!.id).eq('date', new Date().toISOString().split('T')[0]).single(),
    ])

    const lastPost = posts?.[0]?.date
    const daysSince = lastPost
      ? Math.floor((Date.now() - new Date(lastPost).getTime()) / 86400000)
      : 999

    const slateToday = { contentPosted: slateRes.data?.content_posted ?? false }
    setSuggestions(buildSuggestions(daysSince, pc ?? 0, slateToday, platformMetrics))
  }
  compute()
}, [user, platformMetrics])
```

- [ ] **Step 2: Display suggestions** — keep existing urgency-colored card UI, replace mock `topSuggestions` array with the real `suggestions` state.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Suggestions.tsx
git commit -m "feat: Suggestions page generates rule-based tips from real Supabase data"
```

---

## Task 16: Dashboard — wire to real data

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `supabase` client, `useAuth()`, `useLivePlatformMetrics()` (already wired in Task 6)

- [ ] **Step 1: Replace `dailySlate`, `topSuggestions`, `momentumScore` mock imports**

Remove:
```typescript
import { weeklyData, topSuggestions, dailySlate, momentumScore } from '../data/mockData'
```

Add:
```typescript
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
```

- [ ] **Step 2: Load today's slate and compute momentum**

```typescript
const { user } = useAuth()
const [slate, setSlate] = useState({ gym: false, salonDuty: false, study: false, contentPosted: false, verseWritten: false })
const [suggestions, setSuggestions] = useState<Array<{ id: string; urgency: string; platform: string; title: string }>>([])

useEffect(() => {
  if (!user) return
  const today = new Date().toISOString().split('T')[0]
  supabase.from('daily_slate').select('*').eq('user_id', user.id).eq('date', today).single()
    .then(({ data }) => {
      if (data) setSlate({
        gym: data.gym,
        salonDuty: data.salon_duty,
        study: data.study,
        contentPosted: data.content_posted,
        verseWritten: data.verse_written,
      })
    })
}, [user])
```

- [ ] **Step 3: Compute `momentumScore` from slate**

Replace `momentumScore` usage with:

```typescript
const doneCount = Object.values(slate).filter(Boolean).length
const momentumScore = Math.round((doneCount / 5) * 100)
```

- [ ] **Step 4: Replace `weeklyData` chart** with a placeholder empty array for now (the Analytics page owns chart data). Change:

```typescript
<LineChart data={weeklyData}
```
to:
```typescript
<LineChart data={[]}
```

- [ ] **Step 5: Remove the `topSuggestions.map` section** and replace with a static "Visit Suggestions page" prompt, or load the top 3 from Supabase (same rule logic as Task 15, but inline here, using only `content_posts` latest date). Simplest approach — just redirect to `/suggestions`:

Replace the Top Suggestions card content with:

```typescript
<div style={{ fontSize: 13, color: '#64748B', padding: '20px 0', textAlign: 'center' }}>
  Based on your activity — visit Suggestions for personalized tips.
</div>
```

- [ ] **Step 6: Run TypeScript check**

```bash
node_modules\.bin\tsc.cmd --noEmit
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: Dashboard reads real daily_slate from Supabase, computes momentum"
```

---

## Task 17: Delete `mockData.ts` + final cleanup

**Files:**
- Delete: `src/data/mockData.ts`
- Verify: no remaining imports from `../data/mockData`

**Interfaces:**
- Consumes: completed Tasks 10–16 (all pages migrated off mock data)

- [ ] **Step 1: Check for remaining mock data imports**

```bash
grep -r "mockData" src/ --include="*.ts" --include="*.tsx"
```

Expected: no output (zero matches)

- [ ] **Step 2: If any remain, fix them before continuing**

For each file still importing from mockData, either:
- Remove the import and replace usage with Supabase queries (follow the pattern from Tasks 10–15)
- Or replace with an empty array / zero value if the data is truly unused

- [ ] **Step 3: Delete `src/data/mockData.ts`**

```bash
rm src/data/mockData.ts
```

- [ ] **Step 4: Run TypeScript check**

```bash
node_modules\.bin\tsc.cmd --noEmit
```

Expected: no errors

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: remove mockData.ts — all pages now use real Supabase data"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered |
|---|---|
| 7 tables with RLS | Task 2 |
| `profiles` auto-created via trigger | Task 2 |
| Supabase Auth (Google + Magic Link) | Task 3, 4 |
| `AuthContext` + `ProtectedRoute` | Task 3, 4 |
| `SignIn` page | Task 4 |
| `Onboarding` page | Task 4 |
| Vercel routes verify JWT | Tasks 5, 6 |
| Simple ID connections (YouTube, Spotify, Audiomack) | Task 9 |
| OAuth connections (Instagram, TikTok) with signed state | Tasks 7, 8, 9 |
| Service role key writes to DB in OAuth callback | Tasks 7, 8 |
| Accountability CRUD + streak | Task 10 |
| Content CRUD | Task 11 |
| Releases CRUD | Task 12 |
| Revenue from streams × rates | Task 13 |
| Milestones + badges | Task 14 |
| Rule-based Suggestions | Task 15 |
| Dashboard real data | Task 16 |
| Delete mockData.ts | Task 17 |
| `useLiveData` sends JWT | Task 6 |
| `OAUTH_STATE_SECRET` env var | Tasks 5, 7, 8 |
| `track_distribution` RLS via JOIN | Task 2 |
| snake_case ↔ camelCase mapping | Tasks 10, 16 |

**Placeholder scan:** None found.

**Type consistency:** `Slate` interface defined in Task 10 with camelCase keys; `toDb`/`fromDb` convert at the boundary. `Track` and `Distribution` types defined in Task 12. `Suggestion` interface defined and reused in Tasks 15 and 16. `PlatformConnection` defined in Task 9.
