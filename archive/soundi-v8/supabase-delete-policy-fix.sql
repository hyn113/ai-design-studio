-- Run this in Supabase Dashboard > SQL Editor.
-- Soundi uses Google Auth, and songs.owner_id stores auth.users.id as text.

alter table public.songs enable row level security;

revoke delete on table public.songs from anon;
grant delete on table public.songs to authenticated;

drop policy if exists "Prototype can delete songs" on public.songs;
drop policy if exists "Users can delete own songs" on public.songs;

create policy "Users can delete own songs"
on public.songs
for delete
to authenticated
using ((select auth.uid())::text = owner_id);

-- Optional diagnostic: rows created by the currently signed-in user should have
-- owner_id equal to that user's auth UUID.
