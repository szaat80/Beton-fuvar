create table if not exists public.app_sync_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  backup jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_sync_data enable row level security;

revoke all on public.app_sync_data from anon;
grant select, insert, update on public.app_sync_data to authenticated;

drop policy if exists "Users can read their own app backup" on public.app_sync_data;
create policy "Users can read their own app backup"
  on public.app_sync_data for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own app backup" on public.app_sync_data;
create policy "Users can insert their own app backup"
  on public.app_sync_data for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own app backup" on public.app_sync_data;
create policy "Users can update their own app backup"
  on public.app_sync_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
