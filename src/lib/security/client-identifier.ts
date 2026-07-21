import { isIP } from "node:net";

type RuntimeEnvironment = {
  NODE_ENV?: string;
  TRUST_CF_CONNECTING_IP?: string;
  TRUSTED_PROXY_IP_HEADER?: string;
};

export function getTrustedClientIdentifier(
  headers: Headers,
  environment: RuntimeEnvironment = process.env,
): string {
  const trustedHeader = getTrustedHeader(environment);
  const trustedClient = trustedHeader
    ? normalizeIp(headers.get(trustedHeader))
    : undefined;

  if (trustedClient) {
    return `${trustedHeader}:${trustedClient}`;
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

  return candidate && candidate.length <= 64 && isIP(candidate) !== 0
    ? candidate
    : undefined;
}

function getTrustedHeader(environment: RuntimeEnvironment): TrustedClientIpHeader | undefined {
  const trustCloudflare = environment.TRUST_CF_CONNECTING_IP === "true";
  const trustedProxyHeader = isTrustedProxyHeader(environment.TRUSTED_PROXY_IP_HEADER)
    ? environment.TRUSTED_PROXY_IP_HEADER
    : undefined;

  // Ambiguous trust configuration fails closed instead of selecting one header silently.
  if (trustCloudflare === Boolean(trustedProxyHeader)) return undefined;

  return trustCloudflare ? "cf-connecting-ip" : trustedProxyHeader;
}

type TrustedClientIpHeader = "cf-connecting-ip" | "x-forwarded-for" | "x-real-ip";

function isTrustedProxyHeader(value: string | undefined): value is "x-forwarded-for" | "x-real-ip" {
  return value === "x-forwarded-for" || value === "x-real-ip";
}
