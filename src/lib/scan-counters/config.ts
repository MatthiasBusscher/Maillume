export type ScanCounterConfig =
  | { mode: "disabled" }
  | { mode: "memory" }
  | {
      mode: "supabase";
      supabaseUrl: string;
      apiKey: string;
      useLegacyAuthorization: boolean;
    };

type ScanCounterEnvironment = Record<string, string | undefined>;

export function getScanCounterConfig(
  env: ScanCounterEnvironment = process.env,
): ScanCounterConfig {
  const mode = env.SCAN_COUNTERS?.trim().toLowerCase() || "disabled";

  if (mode === "memory") return { mode: "memory" };
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
