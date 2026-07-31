const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Supabase clients accept a project origin, never an endpoint path. Remote
 * deployments must use TLS; HTTP is reserved for explicit local development.
 */
export function isSafeSupabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);

    if (
      (url.protocol !== "https:" && url.protocol !== "http:")
      || url.username
      || url.password
      || url.pathname !== "/"
      || url.search
      || url.hash
    ) {
      return false;
    }

    return url.protocol === "https:" || LOOPBACK_HOSTNAMES.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
