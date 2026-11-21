# MASAPEP PRO — Trading Command Center (Phase 2 Frontend)

Premium Dark Gold / Balanced / English UI. Built with React, TypeScript, Vite, Tailwind CSS and Recharts.

## Current delivery scope
- Responsive desktop/tablet/mobile shell and 9 navigation areas.
- Overview, live-position layout, market intelligence, signal center, performance charts, gold-news placeholders, EA command center, Telegram center and system settings.
- Command review modal with safe preview behavior.
- Complete MT5 timeframe selector: M1, M2, M3, M4, M5, M6, M10, M12, M15, M20, M30, H1, H2, H3, H4, H6, H8, H12, D1, W1 and MN1.
- Multi-timeframe matrix, selectable period details, EA-source coverage indicators and pending-telemetry states.
- Professional monitoring modules: risk/exposure, trend confluence, trading sessions, economic-event risk, execution quality, data integrity and audit.
- All illustrative values are labeled DEMO / sample. No fabricated live MT5 or news data is presented as connected.
- Frontend does not execute trades and does not change EA strategy/risk parameters.

## Run locally
1. Install Node.js 20 LTS or newer.
2. Extract this ZIP and open the project folder in a terminal.
3. Run `npm install`.
4. Run `npm test`.
5. Run `npm run dev` and open the local URL printed by Vite.
6. Run `npm run build` before deployment.

## Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- No environment variables are required for this visual/demo frontend.
- For later Supabase work, set only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` after Phase 3/5 is implemented. Never place secret/service_role keys or Telegram bot tokens in frontend variables.

## Deployment
The `netlify.toml` file configures the SPA fallback. Connect the project repository to Netlify or upload the generated `dist` folder after a successful build.

## Important limitations
This is the Phase 2 design system + Phase 4 frontend foundation, not the complete production platform. Supabase authentication/RLS, live database reads, Edge Functions, MT5 HTTPS telemetry/heartbeat/lease, Telegram web history, authenticated command queue, news providers and security audit are not yet implemented. Do not connect a live account or use this preview to send trading commands.

## Source of truth
The MASAPEP EA remains authoritative for entry/exit logic, risk settings and trade execution. The frontend intentionally does not reimplement signal rules. The dashboard now displays all 21 standard MT5 timeframe choices. The inspected V3.09 EA source currently lists M1, M5, M15, M30 and H1 only. The other periods are visible in the dashboard but explicitly marked as not yet supplied by that EA source; real readings require a compatible additive EA telemetry update and backend integration.


## Phase 3.1 — Annual market history

- Added historical range controls: 1D, 1W, 1M, 3M, 6M, 1Y, 3Y, 5Y, 10Y and ALL.
- Added an Annual View specification. Y1 is derived by aggregating chronological MN1 monthly OHLC candles into one yearly OHLC candle; Y1 is not a native MT5 timeframe.
- Added tested `aggregateMonthlyToAnnual()` utility, including empty and malformed input handling.
- The annual chart intentionally shows no prices until a trusted historical feed is connected. The UI labels the feed as disconnected; no fabricated market values are used.
- EA V3.09 is unchanged. Dashboard timeframe availability does not imply that the EA currently transmits all timeframe data.

### Verification
`npm test` runs 10 unit tests. `npm run build` has not been verified in this environment because frontend dependencies (React, Recharts, Lucide) are not installed; install dependencies with `npm install` before building.

## Phase 4.1 — Secure Supabase database integration package
- Added account-scoped RLS migration (`202611210002_account_scoped_rls.sql`) to replace broad authenticated reads with explicit `account_members` grants.
- Added hardened telemetry Edge Function validation, token digest comparison, payload-size limit, configurable allowed origins, and generic server errors.
- Added instructions for granting the first authenticated dashboard user access to a specific MT5 account.
- This package is not deployed to the user's Supabase project. Apply migrations and deploy the function manually in the project dashboard; no project credentials are required in chat.
- EA source is unchanged. No live telemetry will arrive until the additive EA sender is reviewed, compiled and tested on a demo account.


## Phase 4.2 telemetry bridge
See `supabase/README.md`. This additive Edge Function + EA source sends account/heartbeat telemetry only; command execution is intentionally disabled.
