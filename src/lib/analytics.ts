// Optional, cookieless visit statistics with a self-hosted Umami instance.
// Only the official deployment sets these variables; self-hosted instances load nothing.
// They are read at request time, so the same image works with or without analytics.

export type AnalyticsConfig = {
  scriptUrl: string;
  websiteId: string;
  origin: string;
};

const WEBSITE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getAnalyticsConfig(env: Record<string, string | undefined> = process.env): AnalyticsConfig | null {
  const scriptUrl = env.UMAMI_SCRIPT_URL?.trim();
  const websiteId = env.UMAMI_WEBSITE_ID?.trim();
  if (!scriptUrl || !websiteId || !WEBSITE_ID_PATTERN.test(websiteId)) return null;

  try {
    const url = new URL(scriptUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return { scriptUrl: url.href, websiteId: websiteId.toLowerCase(), origin: url.origin };
  } catch {
    return null;
  }
}
