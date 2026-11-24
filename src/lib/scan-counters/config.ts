export type ScanCounterConfig =
  | { mode: "disabled" }
  | { mode: "memory" }
  | {
      mode: "supabase";
      supabaseUrl: string;
      apiKey: string;
      useLegacyAuthorization: boolean;
    }
  | {
      // A self-hosted PostgREST in front of Postgres with the record_scan function
      // (docs/self-hosted-scan-counters.md). It runs on a private network, so it needs no key.
      mode: "postgrest";
      postgrestUrl: string;
    };

type ScanCounterEnvironment = Record<string, string | undefined>;

export function getScanCounterConfig(
  env: ScanCounterEnvironment = process.env,
): ScanCounterConfig {
  const mode = env.SCAN_COUNTERS?.trim().toLowerCase() || "disabled";

  if (mode === "memory") return { mode: "memory" };
  if (mode === "postgrest") return getPostgrestConfig(env);
  if (mode !== "supabase") return { mode: "disabled" };

  const supabaseUrl = env.SUPABASE_URL?.trim();
  const secretKey = env.SUPABASE_SECRET_KEY?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const apiKey = secretKey || serviceRoleKey;

  // Counting is never worth failing a scan over, so an incomplete configuration
  // disables it instead of raising.
  if (!supabaseUrl || !apiKey || !isSupportedSupabaseUrl(supabaseUrl)) {
    return { mode: "disabled" };
  }

  return {
    mode: "supabase",
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    apiKey,
    useLegacyAuthorization: !secretKey,
  };
}

export function areScanCountersEnabled(env: ScanCounterEnvironment = process.env): boolean {
  return getScanCounterConfig(env).mode !== "disabled";
}

function getPostgrestConfig(env: ScanCounterEnvironment): ScanCounterConfig {
  const value = env.SCAN_COUNTER_POSTGREST_URL?.trim();
  if (!value || !isSupportedPostgrestUrl(value)) return { mode: "disabled" };
  return { mode: "postgrest", postgrestUrl: value.replace(/\/$/, "") };
}

/**
 * An origin only (no credentials, path, query or fragment). Plain HTTP is accepted for
 * loopback and for single-label hostnames such as a Docker service name, which only
 * resolve on a private network; anything with a dot must use HTTPS.
 */
function isSupportedPostgrestUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return false;
    if (url.protocol === "https:") return true;
    if (url.protocol !== "http:") return false;
    return isLocalHostname(url.hostname) || /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function isSupportedSupabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && isLocalHostname(url.hostname);
  } catch {
    return false;
  }
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}
