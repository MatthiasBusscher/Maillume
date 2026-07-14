export const ACCOUNT_API_KEY_MAX_REQUEST_BYTES = 4 * 1024;
export const ACCOUNT_DELETE_MAX_REQUEST_BYTES = 1024;
export const RECENT_AUTH_MAX_AGE_MS = 15 * 60 * 1000;

type BoundedBodyResult =
  | { ok: true; text: string }
  | { ok: false; reason: "too_large" };

export function isStrictSameOriginMutation(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const candidate = new URL(origin);
    const requestUrl = new URL(request.url);
    const fetchSite = request.headers.get("sec-fetch-site");
    const acceptedOrigins = new Set([requestUrl.origin]);
    const requestHost = request.headers.get("host")?.trim();
    const forwardedProtocol = request.headers.get("x-forwarded-proto")
      ?.split(",", 1)[0]
      .trim()
      .toLowerCase();
    const requestProtocol = forwardedProtocol || requestUrl.protocol.slice(0, -1);

    if (requestHost && (requestProtocol === "http" || requestProtocol === "https")) {
      const headerUrl = new URL(`${requestProtocol}://${requestHost}`);
      if (
        !headerUrl.username
        && !headerUrl.password
        && headerUrl.pathname === "/"
        && !headerUrl.search
        && !headerUrl.hash
        && headerUrl.host === requestHost.toLowerCase()
      ) {
        acceptedOrigins.add(headerUrl.origin);
      }
    }

    if (
      candidate.username
      || candidate.password
      || candidate.pathname !== "/"
      || candidate.search
      || candidate.hash
      || !acceptedOrigins.has(candidate.origin)
    ) {
      return false;
    }

    return !fetchSite || fetchSite === "same-origin";
  } catch {
    return false;
  }
}

export function hasRequestContentType(request: Request, expected: string): boolean {
  return request.headers.get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase() === expected;
}

export async function readBoundedRequestBody(
  request: Request,
  maxBytes: number,
): Promise<BoundedBodyResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > maxBytes) {
      return { ok: false, reason: "too_large" };
    }
  }

  if (!request.body) return { ok: true, text: "" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      return { ok: false, reason: "too_large" };
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, text: new TextDecoder().decode(body) };
}

export function hasRecentAuthentication(
  lastSignInAt: string | undefined,
  now = Date.now(),
  maxAgeMs = RECENT_AUTH_MAX_AGE_MS,
): boolean {
  if (!lastSignInAt) return false;
  const signedInAt = Date.parse(lastSignInAt);
  if (!Number.isFinite(signedInAt)) return false;

  const age = now - signedInAt;
  return age >= 0 && age <= maxAgeMs;
}
