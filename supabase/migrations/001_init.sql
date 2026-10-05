-- Clipping-dashboard: eerste schema.
-- Draai dit in de Supabase SQL-editor (of via de Supabase CLI).

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table public.sources (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  url         text,
  type        text not null default 'overig'
              check (type in ('podcast', 'stream', 'youtube', 'overig')),
  notes       text,
  created_at  timestamptz not null default now()
);

create table public.clips (
  id                uuid primary key default gen_random_uuid(),
  source_id         uuid references public.sources (id) on delete set null,
  title             text not null,
  source_timestamp  text,  -- bv. '01:23:10'
  status            text not null default 'idee'
                    check (status in ('idee', 'geknipt', 'gepost')),
  notes             text,
  created_by        uuid default auth.uid() references auth.users (id) on delete set null,
  created_at        timestamptz not null default now()
);

create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  clip_id      uuid not null references public.clips (id) on delete cascade,
  platform     text not null check (platform in ('tiktok', 'youtube')),
  url          text,
  external_id  text,  -- voor een latere API-koppeling
  posted_at    timestamptz not null default now()
);

-- Dagelijkse snapshots met lopende totalen (zoals het platform ze toont).
create table public.post_stats (
  id        uuid primary key default gen_random_uuid(),
  post_id   uuid not null references public.posts (id) on delete cascade,
  date      date not null default current_date,
  views     integer not null default 0 check (views >= 0),
  likes     integer not null default 0 check (likes >= 0),
  comments  integer not null default 0 check (comments >= 0),
  shares    integer not null default 0 check (shares >= 0),
  unique (post_id, date)
);

create table public.allowed_users (
  email  text primary key
);

create index clips_source_id_idx on public.clips (source_id);
create index posts_clip_id_idx on public.posts (clip_id);
create index post_stats_post_date_idx on public.post_stats (post_id, date);

-- ---------------------------------------------------------------------------
-- Toegangscontrole
-- ---------------------------------------------------------------------------

-- Alleen ingelogde gebruikers wiens e-mail in allowed_users staat.
-- security definer, zodat de check ook werkt terwijl allowed_users zelf
-- afgeschermd is.
create function public.is_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.allowed_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

alter table public.sources       enable row level security;
alter table public.clips         enable row level security;
alter table public.posts         enable row level security;
alter table public.post_stats    enable row level security;
alter table public.allowed_users enable row level security;

create policy "allowed users: alles" on public.sources
  for all to authenticated
  using (public.is_allowed()) with check (public.is_allowed());

create policy "allowed users: alles" on public.clips
  for all to authenticated
  using (public.is_allowed()) with check (public.is_allowed());

create policy "allowed users: alles" on public.posts
  for all to authenticated
  using (public.is_allowed()) with check (public.is_allowed());

create policy "allowed users: alles" on public.post_stats
  for all to authenticated
  using (public.is_allowed()) with check (public.is_allowed());

-- allowed_users: een gebruiker mag alleen de eigen rij lezen (voor de
-- toegangscheck in de app). Toevoegen en verwijderen gaat via de SQL-editor.
create policy "eigen rij lezen" on public.allowed_users
  for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ---------------------------------------------------------------------------
-- View: nieuwste stats per post (voor het overzicht)
-- ---------------------------------------------------------------------------

create view public.latest_post_stats
with (security_invoker = true)
as
select distinct on (post_id)
  post_id,
  date,
  views,
  likes,
  comments,
  shares
from public.post_stats
order by post_id, date desc;
