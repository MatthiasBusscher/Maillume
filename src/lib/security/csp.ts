const SELF_SOURCE = "'self'";

type ContentSecurityPolicyOptions = {
  isDevelopment?: boolean;
  nonce: string;
  supabaseUrl?: string;
};

export function createContentSecurityPolicy({
  isDevelopment = false,
  nonce,
  supabaseUrl,
}: ContentSecurityPolicyOptions): string {
  if (!/^[A-Za-z0-9+/_=-]+$/.test(nonce)) {
    throw new Error("CSP nonce contains unsupported characters.");
  }

  const scriptSources = [
    SELF_SOURCE,
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "'wasm-unsafe-eval'",
    "blob:",
  ];

  if (isDevelopment) {
    scriptSources.push("'unsafe-eval'");
  }

  return [
    `default-src ${SELF_SOURCE}`,
    `base-uri ${SELF_SOURCE}`,
    `form-action ${SELF_SOURCE}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptSources.join(" ")}`,
    `style-src ${SELF_SOURCE} 'unsafe-inline'`,
    `img-src ${SELF_SOURCE} data: blob:`,
    `font-src ${SELF_SOURCE} data:`,
    `connect-src ${getCspConnectSources(supabaseUrl).join(" ")}`,
    `worker-src ${SELF_SOURCE} blob:`,
    `child-src ${SELF_SOURCE} blob:`,
    `manifest-src ${SELF_SOURCE}`,
    "media-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

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
