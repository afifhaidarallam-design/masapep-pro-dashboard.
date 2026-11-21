-- MASAPEP PRO telemetry foundation. Apply in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.mt5_instances (
  id uuid primary key default gen_random_uuid(),
  account_login text not null,
  broker text,
  account_currency text,
  terminal_name text,
  instance_name text not null,
  status text not null default 'offline' check (status in ('active','standby','offline')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique(account_login, instance_name)
);

create table if not exists public.ea_heartbeat (
  id bigint generated always as identity primary key,
  instance_id uuid not null references public.mt5_instances(id) on delete cascade,
  account_login text not null,
  symbol text not null,
  ea_version text,
  terminal_connected boolean not null default false,
  trading_allowed boolean not null default false,
  server_time timestamptz,
  received_at timestamptz not null default now()
);
create index if not exists ea_heartbeat_instance_time_idx on public.ea_heartbeat(instance_id, received_at desc);

create table if not exists public.account_snapshots (
  id bigint generated always as identity primary key,
  instance_id uuid not null references public.mt5_instances(id) on delete cascade,
  account_login text not null,
  currency text not null,
  balance numeric(20,6) not null,
  equity numeric(20,6) not null,
  margin numeric(20,6) not null default 0,
  free_margin numeric(20,6) not null default 0,
  margin_level numeric(20,6),
  floating_pnl numeric(20,6) not null default 0,
  drawdown_pct numeric(12,6),
  captured_at timestamptz not null default now()
);
create index if not exists account_snapshots_time_idx on public.account_snapshots(account_login, captured_at desc);

create table if not exists public.positions (
  ticket text primary key,
  instance_id uuid not null references public.mt5_instances(id) on delete cascade,
  account_login text not null,
  symbol text not null,
  side text not null check (side in ('BUY','SELL')),
  volume numeric(20,8) not null,
  open_price numeric(20,8) not null,
  current_price numeric(20,8),
  stop_loss numeric(20,8),
  take_profit numeric(20,8),
  floating_pnl numeric(20,6) not null default 0,
  opened_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.timeframe_snapshots (
  id bigint generated always as identity primary key,
  instance_id uuid not null references public.mt5_instances(id) on delete cascade,
  account_login text not null,
  symbol text not null,
  timeframe text not null,
  trend text not null check (trend in ('BULLISH','BEARISH','NEUTRAL','UNKNOWN')),
  k_value numeric(12,6),
  d_value numeric(12,6),
  candle_time timestamptz,
  captured_at timestamptz not null default now(),
  unique(instance_id, symbol, timeframe, candle_time)
);
create index if not exists timeframe_snapshots_latest_idx on public.timeframe_snapshots(symbol, timeframe, captured_at desc);

create table if not exists public.dashboard_commands (
  id uuid primary key default gen_random_uuid(),
  account_login text not null,
  instance_id uuid references public.mt5_instances(id) on delete set null,
  command text not null check (command in ('PAUSE','RESUME','CLOSE_ALL','CLOSE_BUY','CLOSE_SELL','STATUS')),
  parameters jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','claimed','acknowledged','executed','rejected','expired','failed')),
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 minutes'),
  acknowledged_at timestamptz,
  result jsonb,
  idempotency_key text not null unique
);

-- Browser users can read telemetry only after authentication. Writes are service-side only.
alter table public.mt5_instances enable row level security;
alter table public.ea_heartbeat enable row level security;
alter table public.account_snapshots enable row level security;
alter table public.positions enable row level security;
alter table public.timeframe_snapshots enable row level security;
alter table public.dashboard_commands enable row level security;

drop policy if exists "authenticated read mt5 instances" on public.mt5_instances;
create policy "authenticated read mt5 instances" on public.mt5_instances for select to authenticated using (true);
drop policy if exists "authenticated read heartbeat" on public.ea_heartbeat;
create policy "authenticated read heartbeat" on public.ea_heartbeat for select to authenticated using (true);
drop policy if exists "authenticated read snapshots" on public.account_snapshots;
create policy "authenticated read snapshots" on public.account_snapshots for select to authenticated using (true);
drop policy if exists "authenticated read positions" on public.positions;
create policy "authenticated read positions" on public.positions for select to authenticated using (true);
drop policy if exists "authenticated read timeframe" on public.timeframe_snapshots;
create policy "authenticated read timeframe" on public.timeframe_snapshots for select to authenticated using (true);
drop policy if exists "authenticated read commands" on public.dashboard_commands;
create policy "authenticated read commands" on public.dashboard_commands for select to authenticated using (true);

revoke all on public.mt5_instances, public.ea_heartbeat, public.account_snapshots, public.positions, public.timeframe_snapshots, public.dashboard_commands from anon;
grant select on public.mt5_instances, public.ea_heartbeat, public.account_snapshots, public.positions, public.timeframe_snapshots, public.dashboard_commands to authenticated;
