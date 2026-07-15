type PublicOriginInput = {
  configuredAppUrl?: string;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  host?: string | null;
  requestUrl: string;
};

export function getPublicAppOrigin({
  configuredAppUrl,
  forwardedHost,
  forwardedProto,
  host,
  requestUrl,
}: PublicOriginInput): string {
  const configuredOrigin = getHttpOrigin(configuredAppUrl);
  if (configuredOrigin) return configuredOrigin;

  const requestOrigin = new URL(requestUrl).origin;
  const publicHost = firstHeaderValue(forwardedHost) || firstHeaderValue(host);
  const publicProto = firstHeaderValue(forwardedProto);

  if (publicHost && (publicProto === "http" || publicProto === "https")) {
    const forwardedOrigin = getHttpOrigin(`${publicProto}://${publicHost}`);
    if (forwardedOrigin && isTrustedFallbackHostname(new URL(forwardedOrigin).hostname)) {
      return forwardedOrigin;
    }
  }

  return requestOrigin;
}

function isTrustedFallbackHostname(hostname: string): boolean {
  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "maillume.io"
    || hostname.endsWith(".maillume.io");
}

function firstHeaderValue(value?: string | null): string {
  return value?.split(",")[0]?.trim() ?? "";
}

function getHttpOrigin(value?: string): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}
