import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const edge = fs.readFileSync(new URL('../supabase/functions/mt5-telemetry/index.ts', import.meta.url), 'utf8');
const ea = fs.readFileSync(new URL('../MASAPEP_V3_10_SUPABASE_TELEMETRY_BWK.mq5', import.meta.url), 'utf8');

test('telemetry endpoint uses the existing database column names', () => {
  for (const field of ['account_ref','user_id','instance_name','broker','platform','symbol','is_active','last_seen_at']) assert.ok(edge.includes(field));
  for (const field of ['connection_status','ea_version','terminal_name','last_heartbeat_at','message']) assert.ok(edge.includes(field));
  for (const field of ['floating_profit','drawdown_percent','free_margin','margin_level','currency']) assert.ok(edge.includes(field));
  assert.ok(!edge.includes('account_login'));
  assert.ok(!edge.includes('terminal_connected'));
  assert.ok(!edge.includes('floating_pnl'));
  assert.ok(!edge.includes('drawdown_pct'));
});

test('telemetry endpoint does not poll or execute dashboard commands', () => {
  assert.ok(!edge.includes('from("dashboard_commands")'));
  assert.ok(!edge.includes('from("dashboard_command")'));
  assert.ok(!edge.includes('CLOSE_ALL'));
});

test('EA telemetry is opt-in and rate-limited with bounded timeout', () => {
  assert.match(ea, /InpEnableSupabaseTelemetry=false/);
  assert.match(ea, /InpSupabaseTelemetryIntervalSec=60/);
  assert.match(ea, /InpSupabaseTimeoutMs=1500/);
  assert.ok(ea.includes('if(InpEnableSupabaseTelemetry &&'));
});

test('EA telemetry payload does not include Supabase admin credentials', () => {
  assert.ok(ea.includes('account_ref'));
  assert.ok(ea.includes('floating_profit'));
  assert.ok(ea.includes('x-ea-token'));
  assert.ok(!ea.includes('SUPABASE_SERVICE_ROLE_KEY'));
});
