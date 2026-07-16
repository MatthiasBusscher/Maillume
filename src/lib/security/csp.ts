const SELF_SOURCE = "'self'";

export function getCspConnectSources(supabaseUrl?: string): string[] {
  const sources = [SELF_SOURCE];
  const candidate = supabaseUrl?.trim();

  if (!candidate) return sources;

  try {
    const url = new URL(candidate);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:")
      || url.username
      || url.password
    ) {
      return sources;
    }

    sources.push(url.origin);
    sources.push(`${url.protocol === "https:" ? "wss:" : "ws:"}//${url.host}`);
  } catch {
    return sources;
  }

  return sources;
}
