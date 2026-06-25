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
