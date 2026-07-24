import assert from "node:assert/strict";

import { areScanCountersEnabled, getScanCounterConfig } from "./config";
import { recordScan, type MemoryScanCounter } from "./storage";

const SUPABASE_ENV = {
  SCAN_COUNTERS: "supabase",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_value",
};

async function main() {
  assert.equal(getScanCounterConfig({}).mode, "disabled");
  assert.equal(getScanCounterConfig({ SCAN_COUNTERS: "memory" }).mode, "memory");
  assert.equal(areScanCountersEnabled({}), false);
  assert.equal(areScanCountersEnabled({ SCAN_COUNTERS: "memory" }), true);

  const supabase = getScanCounterConfig(SUPABASE_ENV);
  assert.equal(supabase.mode, "supabase");
  if (supabase.mode === "supabase") {
    assert.equal(supabase.supabaseUrl, "https://project.supabase.co");
    assert.equal(supabase.useLegacyAuthorization, false);
  }

  // A trailing slash must not produce a double-slashed RPC URL.
  const trailing = getScanCounterConfig({ ...SUPABASE_ENV, SUPABASE_URL: "https://project.supabase.co/" });
  if (trailing.mode === "supabase") assert.equal(trailing.supabaseUrl, "https://project.supabase.co");

  const legacy = getScanCounterConfig({
    SCAN_COUNTERS: "supabase",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "legacy_service_role",
  });
  assert.equal(legacy.mode === "supabase" && legacy.useLegacyAuthorization, true);

  // An incomplete or unusable configuration disables counting rather than raising,
  // because a scan must never fail over a counter.
  for (const env of [
    { SCAN_COUNTERS: "supabase" },
    { SCAN_COUNTERS: "supabase", SUPABASE_URL: "https://project.supabase.co" },
    { SCAN_COUNTERS: "supabase", SUPABASE_SECRET_KEY: "sb_secret_value" },
    { ...SUPABASE_ENV, SUPABASE_URL: "http://analytics.example.test" },
    { ...SUPABASE_ENV, SUPABASE_URL: "not-a-url" },
  ]) {
    assert.equal(getScanCounterConfig(env).mode, "disabled", JSON.stringify(env));
  }

  const memoryCounters: MemoryScanCounter[] = [];
  const now = () => Date.parse("2026-07-24T22:15:00.000Z");
  await recordScan("paste", { config: { mode: "memory" }, memoryCounters, now });
  await recordScan("paste", { config: { mode: "memory" }, memoryCounters, now });
  await recordScan("eml", { config: { mode: "memory" }, memoryCounters, now });
  assert.deepEqual(memoryCounters, [
    { period_start: "2026-07-24", input_mode: "paste", scan_count: 2 },
    { period_start: "2026-07-24", input_mode: "eml", scan_count: 1 },
  ]);

  const requests: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    requests.push({ url, init });
    return new Response(null, { status: 204 });
  }) as unknown as typeof fetch;

  await recordScan("screenshot", { config: getScanCounterConfig(SUPABASE_ENV), fetchImpl });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://project.supabase.co/rest/v1/rpc/record_scan");
  assert.equal(requests[0].init.method, "POST");

  // The request may carry the input mode and nothing else. No content, result, score,
  // identifier, or caller-chosen date may reach the counter.
  const body = JSON.parse(String(requests[0].init.body));
  assert.deepEqual(Object.keys(body), ["p_input_mode"]);
  assert.equal(body.p_input_mode, "screenshot");

  const disabled: Array<unknown> = [];
  await recordScan("paste", {
    config: { mode: "disabled" },
    fetchImpl: (async () => {
      disabled.push(1);
      return new Response(null);
    }) as unknown as typeof fetch,
  });
  assert.equal(disabled.length, 0, "a disabled counter must not make a request");

  // A counter outage must never surface to the caller.
  await recordScan("paste", {
    config: getScanCounterConfig(SUPABASE_ENV),
    fetchImpl: (() => Promise.reject(new Error("network down"))) as unknown as typeof fetch,
  });

  await recordScan("paste", {
    config: getScanCounterConfig(SUPABASE_ENV),
    fetchImpl: (async () => new Response("denied", { status: 403 })) as unknown as typeof fetch,
  });

  console.log("Checked aggregate scan counter configuration and content-free recording.");
}

void main();
