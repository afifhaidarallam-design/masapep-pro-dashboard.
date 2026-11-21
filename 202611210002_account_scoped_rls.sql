-- MASAPEP PRO: account-scoped read access. Apply AFTER 202611210001_masapep_core.sql.
-- Add one row per authenticated dashboard user and MT5 account they may view.
create table if not exists public.account_members (
  user_id uuid not null references auth.users(id) on delete cascade,
  account_login text not null,
  access_role text not null default 'viewer' check (access_role in ('owner','operator','viewer')),
  created_at timestamptz not null default now(),
  primary key (user_id, account_login)
);

alter table public.account_members enable row level security;
revoke all on public.account_members from anon;
grant select on public.account_members to authenticated;
drop policy if exists "members read own grants" on public.account_members;
create policy "members read own grants" on public.account_members
  for select to authenticated using (user_id = auth.uid());

-- Replace broad authenticated-read policies with account-scoped policies.
drop policy if exists "authenticated read mt5 instances" on public.mt5_instances;
create policy "members read mt5 instances" on public.mt5_instances for select to authenticated
  using (exists (select 1 from public.account_members am where am.user_id = auth.uid() and am.account_login = mt5_instances.account_login));

drop policy if exists "authenticated read heartbeat" on public.ea_heartbeat;
create policy "members read heartbeat" on public.ea_heartbeat for select to authenticated
  using (exists (select 1 from public.account_members am where am.user_id = auth.uid() and am.account_login = ea_heartbeat.account_login));

drop policy if exists "authenticated read snapshots" on public.account_snapshots;
create policy "members read snapshots" on public.account_snapshots for select to authenticated
  using (exists (select 1 from public.account_members am where am.user_id = auth.uid() and am.account_login = account_snapshots.account_login));

drop policy if exists "authenticated read positions" on public.positions;
create policy "members read positions" on public.positions for select to authenticated
  using (exists (select 1 from public.account_members am where am.user_id = auth.uid() and am.account_login = positions.account_login));

drop policy if exists "authenticated read timeframe" on public.timeframe_snapshots;
create policy "members read timeframe" on public.timeframe_snapshots for select to authenticated
  using (exists (select 1 from public.account_members am where am.user_id = auth.uid() and am.account_login = timeframe_snapshots.account_login));

drop policy if exists "authenticated read commands" on public.dashboard_commands;
create policy "members read commands" on public.dashboard_commands for select to authenticated
  using (exists (select 1 from public.account_members am where am.user_id = auth.uid() and am.account_login = dashboard_commands.account_login));

-- No browser-side writes: ingestion remains exclusively server-side via Edge Function.
revoke insert, update, delete on public.account_members, public.mt5_instances, public.ea_heartbeat,
  public.account_snapshots, public.positions, public.timeframe_snapshots, public.dashboard_commands from anon, authenticated;
