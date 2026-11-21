import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const edge = readFileSync(new URL('../supabase/functions/mt5-telemetry/index.ts', import.meta.url), 'utf8');

test('EA ingestion validates a dedicated token and bounds payload size', () => {
  assert.match(edge, /tokenMatches\(expected, supplied\)/);
  assert.match(edge, /contentLength > 64_000/);
  assert.match(edge, /MASAPEP_EA_INGEST_TOKEN/);
  assert.match(edge, /MASAPEP_ALLOWED_ACCOUNT_REFS/);
});

test('server binds incoming telemetry to a configured owner instead of trusting client user_id', () => {
  assert.match(edge, /MASAPEP_USER_ID/);
  assert.match(edge, /user_id: configuredUserId/);
  assert.doesNotMatch(edge, /user_id:\s*p\.user_id/);
});

test('service role remains server-side and database errors are not exposed', () => {
  assert.match(edge, /Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)/);
  assert.doesNotMatch(edge, /detail:\s*.*\.message/);
});
