-- Soundi public archive setup
-- Run this once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  author text not null check (char_length(author) between 1 and 20),
  owner_id text,
  step_count integer not null default 64 check (step_count >= 1),
  cover jsonb not null default '{"type":"block","color":"#ffdc21","image":""}'::jsonb,
  composition jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz
);

alter table public.songs enable row level security;

revoke all on table public.songs from anon, authenticated;
grant select, insert on table public.songs to anon, authenticated;

drop policy if exists "Public can read songs" on public.songs;
create policy "Public can read songs"
on public.songs
for select
to anon, authenticated
using (true);

drop policy if exists "Public can publish songs" on public.songs;
create policy "Public can publish songs"
on public.songs
for insert
to anon, authenticated
with check (
  char_length(author) between 1 and 20
  and lower(author) not in ('admin', 'administrator')
  and author <> '관리자'
);

create index if not exists songs_created_at_idx
on public.songs (created_at desc);


alter table public.songs
add column if not exists owner_id text;

create index if not exists songs_owner_id_idx
on public.songs (owner_id);


alter table public.songs
add column if not exists status text not null default 'draft';

alter table public.songs
add column if not exists published_at timestamptz;

-- Do not automatically change existing song status here.
-- Draft/published state is controlled only by the Soundi save/publish actions.

-- Google Auth ownership policies.
-- owner_id stores the authenticated Supabase user's UUID as text.
revoke update, delete on table public.songs from anon;
grant update, delete on table public.songs to authenticated;

drop policy if exists "Prototype can update songs" on public.songs;
drop policy if exists "Users can update own songs" on public.songs;
create policy "Users can update own songs"
on public.songs
for update
to authenticated
using ((select auth.uid())::text = owner_id)
with check (
  (select auth.uid())::text = owner_id
  and char_length(author) between 1 and 20
  and lower(author) not in ('admin', 'administrator')
  and author <> '관리자'
);

drop policy if exists "Prototype can delete songs" on public.songs;
drop policy if exists "Users can delete own songs" on public.songs;
create policy "Users can delete own songs"
on public.songs
for delete
to authenticated
using ((select auth.uid())::text = owner_id);


-- Dashboard visit tracking.
-- Run this section once in Supabase Dashboard > SQL Editor.
create table if not exists public.site_visits (
  user_id uuid not null,
  visit_date date not null default current_date,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (user_id, visit_date)
);

alter table public.site_visits enable row level security;
revoke all on table public.site_visits from anon, authenticated;

create index if not exists site_visits_visit_date_idx
on public.site_visits (visit_date desc);

create or replace function public.record_site_visit()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.site_visits (user_id, visit_date, first_seen, last_seen)
  values (auth.uid(), current_date, now(), now())
  on conflict (user_id, visit_date)
  do update set last_seen = excluded.last_seen;
end;
$$;

revoke all on function public.record_site_visit() from public;
grant execute on function public.record_site_visit() to authenticated;

create or replace function public.dashboard_visit_stats()
returns table (
  today_visitors bigint,
  total_visitors bigint,
  revisit_rate numeric
)
language sql
security definer
set search_path = public
as $$
  with per_user as (
    select user_id, count(distinct visit_date) as visit_days
    from public.site_visits
    group by user_id
  ),
  totals as (
    select
      count(distinct user_id) filter (where visit_date = current_date) as today_visitors,
      count(distinct user_id) as total_visitors
    from public.site_visits
  )
  select
    totals.today_visitors,
    totals.total_visitors,
    case
      when totals.total_visitors = 0 then 0
      else round((count(*) filter (where per_user.visit_days >= 2)::numeric / totals.total_visitors::numeric) * 100, 1)
    end as revisit_rate
  from totals
  left join per_user on true
  group by totals.today_visitors, totals.total_visitors;
$$;

revoke all on function public.dashboard_visit_stats() from public;
grant execute on function public.dashboard_visit_stats() to anon, authenticated;

-- Nickname policy
alter table public.profiles
add column if not exists nickname_updated_at timestamptz;

create unique index if not exists profiles_nickname_unique_idx
on public.profiles (lower(nickname));
