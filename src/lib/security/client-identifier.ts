type RuntimeEnvironment = { NODE_ENV?: string };

export function getTrustedClientIdentifier(
  headers: Headers,
  environment: RuntimeEnvironment = process.env,
): string {
  const cloudflareClient = normalizeIp(headers.get("cf-connecting-ip"));

  if (cloudflareClient) {
    return `cf:${cloudflareClient}`;
  }

  if (environment.NODE_ENV === "production") {
    return "anonymous";
  }

  const forwardedClient = normalizeIp(headers.get("x-forwarded-for")?.split(",")[0] ?? null);
  const realClient = normalizeIp(headers.get("x-real-ip"));

  return forwardedClient ?? realClient ?? "anonymous";
}

function normalizeIp(value: string | null): string | undefined {
  const candidate = value?.trim();

  return candidate && candidate.length <= 64 && /^[0-9a-f:.]+$/i.test(candidate)
    ? candidate
    : undefined;
}
