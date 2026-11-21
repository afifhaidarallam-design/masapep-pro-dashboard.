import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("MASAPEP_ALLOWED_ORIGINS") ?? "")
  .split(",").map((v) => v.trim()).filter(Boolean);
const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin)
    ? origin : (allowedOrigins[0] ?? "https://localhost"),
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ea-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
});
const json = (body: unknown, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
const text = (v: unknown, max = 128) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const finite = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 1e12;

async function tokenMatches(expected: string, supplied: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
    crypto.subtle.digest("SHA-256", enc.encode(supplied)),
  ]);
  const aa = new Uint8Array(a), bb = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST")
    return json({ error: { code: "METHOD_NOT_ALLOWED", message: "POST required" } }, 405, origin);
  if (origin && allowedOrigins.length && !allowedOrigins.includes(origin))
    return json({ error: { code: "ORIGIN_NOT_ALLOWED", message: "Origin not allowed" } }, 403, origin);

  const expected = Deno.env.get("MASAPEP_EA_INGEST_TOKEN") ?? "";
  const supplied = req.headers.get("x-ea-token") ?? "";
  if (!expected || !supplied || !(await tokenMatches(expected, supplied)))
    return json({ error: { code: "UNAUTHORIZED", message: "Invalid EA token" } }, 401, origin);

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 64_000)
    return json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Payload exceeds 64 KB" } }, 413, origin);

  let p: any;
  try { p = await req.json(); }
  catch { return json({ error: { code: "INVALID_JSON", message: "Request body must be JSON" } }, 400, origin); }

  const configuredUserId = Deno.env.get("MASAPEP_USER_ID") ?? "";
  const allowedAccountRefs = (Deno.env.get("MASAPEP_ALLOWED_ACCOUNT_REFS") ?? "")
    .split(",").map((v) => v.trim()).filter(Boolean);
  if (!configuredUserId || !/^[0-9a-f-]{36}$/i.test(configuredUserId))
    return json({ error: { code: "SERVER_NOT_CONFIGURED", message: "MASAPEP_USER_ID is not configured" } }, 503, origin);

  if (!p || typeof p !== "object" ||
      !text(p.account_ref, 64) || !text(p.instance_name, 64) ||
      !text(p.symbol, 32) || !p.account || typeof p.account !== "object")
    return json({ error: { code: "INVALID_PAYLOAD", message: "Required telemetry fields are missing" } }, 400, origin);
  if (!allowedAccountRefs.length || !allowedAccountRefs.includes(String(p.account_ref)))
    return json({ error: { code: "ACCOUNT_NOT_ALLOWED", message: "MT5 account is not explicitly allowlisted" } }, 403, origin);

  const a = p.account;
  for (const key of ["balance", "equity", "margin", "free_margin"])
    if (!finite(a[key]))
      return json({ error: { code: "INVALID_ACCOUNT_VALUE", message: `Invalid ${key}` } }, 422, origin);
  for (const key of ["margin_level", "floating_profit"])
    if (a[key] !== null && a[key] !== undefined && !finite(a[key]))
      return json({ error: { code: "INVALID_ACCOUNT_VALUE", message: `Invalid ${key}` } }, 422, origin);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey)
    return json({ error: { code: "SERVER_NOT_CONFIGURED", message: "Supabase server credentials are missing" } }, 503, origin);

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Match the user's existing public.mt5_instances schema.
  const lookup = await db.from("mt5_instances").select("id")
    .eq("user_id", configuredUserId)
    .eq("account_ref", String(p.account_ref))
    .eq("instance_name", String(p.instance_name))
    .maybeSingle();
  if (lookup.error)
    return json({ error: { code: "INSTANCE_LOOKUP_FAILED", message: "Could not resolve MT5 instance" } }, 500, origin);

  let instanceId = lookup.data?.id as string | undefined;
  const instanceValues = {
    user_id: configuredUserId,
    instance_name: String(p.instance_name),
    account_ref: String(p.account_ref),
    broker: text(p.broker, 100) ? p.broker : null,
    platform: "MT5",
    symbol: String(p.symbol),
    is_active: true,
    last_seen_at: new Date().toISOString(),
  };
  if (instanceId) {
    const update = await db.from("mt5_instances").update(instanceValues).eq("id", instanceId);
    if (update.error)
      return json({ error: { code: "INSTANCE_UPDATE_FAILED", message: "Could not update MT5 instance" } }, 500, origin);
  } else {
    const insert = await db.from("mt5_instances").insert(instanceValues).select("id").single();
    if (insert.error || !insert.data)
      return json({ error: { code: "INSTANCE_CREATE_FAILED", message: "Could not register MT5 instance" } }, 500, origin);
    instanceId = insert.data.id;
  }

  const heartbeat = await db.from("ea_heartbeat").upsert({
    instance_id: instanceId,
    user_id: configuredUserId,
    connection_status: "ONLINE",
    ea_version: text(p.ea_version, 32) ? p.ea_version : "3.09",
    terminal_name: text(p.terminal_name, 100) ? p.terminal_name : null,
    last_heartbeat_at: new Date().toISOString(),
    message: p.trading_allowed === true
      ? "Telemetry received; terminal trading permission enabled"
      : "Telemetry received; terminal trading permission disabled",
  }, { onConflict: "instance_id" });
  if (heartbeat.error)
    return json({ error: { code: "HEARTBEAT_WRITE_FAILED", message: "Could not save EA heartbeat" } }, 500, origin);

  // Existing schema names: floating_profit and drawdown_percent.
  // drawdown_percent remains NULL until a persistent peak-equity baseline is implemented.
  const snapshot = await db.from("account_snapshots").insert({
    user_id: configuredUserId,
    instance_id: instanceId,
    balance: a.balance,
    equity: a.equity,
    margin: a.margin,
    free_margin: a.free_margin,
    margin_level: a.margin_level ?? null,
    floating_profit: a.floating_profit ?? null,
    drawdown_percent: null,
    currency: text(a.currency, 8) ? a.currency : "USD",
  });
  if (snapshot.error)
    return json({ error: { code: "SNAPSHOT_WRITE_FAILED", message: "Could not save account snapshot" } }, 500, origin);

  return json({
    ok: true,
    instance_id: instanceId,
    accepted: ["mt5_instances", "ea_heartbeat", "account_snapshots"],
    drawdown_status: "not_calculated",
    received_at: new Date().toISOString(),
  }, 200, origin);
});
