# MASAPEP PRO — Phase 4.2: Existing-schema telemetry bridge

This is an additive telemetry bridge for the user's existing Supabase schema. It does not execute trades or read dashboard commands.

## Scope
- Writes only `mt5_instances`, `ea_heartbeat`, and `account_snapshots`.
- Uses existing column names: `account_ref`, `connection_status`, `floating_profit`, `drawdown_percent`.
- Does not create or alter database tables.
- Does not ingest positions, trade history, signals, or timeframe snapshots yet; those require exact column and unique-constraint verification.
- `drawdown_percent` is NULL because the current EA has no verified persistent peak-equity baseline.
- Dashboard command execution is not implemented.

## Supabase Edge Function secrets
Set these server-side:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only; never put in EA, Netlify, browser, GitHub, or chat.
- `MASAPEP_EA_INGEST_TOKEN` — dedicated random token, never reuse Telegram token.
- `MASAPEP_USER_ID` — UUID of the intended owner from Supabase Auth.
- `MASAPEP_ALLOWED_ACCOUNT_REFS` — comma-separated MT5 login(s) authorized for this token.
- `MASAPEP_ALLOWED_ORIGINS` — exact dashboard origins, comma-separated.

The endpoint verifies the EA token and account allowlist. It uses the configured `MASAPEP_USER_ID`, never a user_id supplied by the EA.

## Deploy
Deploy `supabase/functions/mt5-telemetry` as Edge Function `mt5-telemetry`. Set the secrets above in Supabase. Do NOT run the ZIP's old SQL migrations on the existing database.

## MT5 setup
1. Compile `MASAPEP_V3_10_SUPABASE_TELEMETRY_BWK.mq5` in MetaEditor.
2. MT5 > Tools > Options > Expert Advisors > Allow WebRequest for listed URL.
3. Add the Supabase project origin, e.g. `https://YOUR_PROJECT_REF.supabase.co`.
4. Attach to the intended DEMO XAUUSD chart first.
5. Inputs > `17 SECURE SUPABASE TELEMETRY`:
   - `InpEnableSupabaseTelemetry = true`
   - `InpSupabaseTelemetryURL = https://YOUR_PROJECT_REF.supabase.co/functions/v1/mt5-telemetry`
   - `InpSupabaseEAIngestToken =` dedicated ingest token
   - `InpSupabaseInstanceName = PC-PRIMARY`
   - interval 60 seconds; timeout 1500 ms.
6. Keep existing Telegram inputs unchanged. Never share secrets in chat or screenshots.

## Verification
- Run `npm test`.
- MetaEditor compilation is required; this environment cannot run MetaEditor, so compilation is not claimed.
- In MT5 Experts tab, look for `MASAPEP Supabase telemetry terkirim. HTTP=200`.
- Confirm new `ea_heartbeat` and `account_snapshots` rows for the intended instance.
- Demo testing only until verified.

## Next phase
Add positions/trade history after verifying their exact columns and unique constraints. Add timeframe snapshots after verifying all columns and uniqueness key. Annual Y1 must be derived from real MN1 history, never fabricated.
