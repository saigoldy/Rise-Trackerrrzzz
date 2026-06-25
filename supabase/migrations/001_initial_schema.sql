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
