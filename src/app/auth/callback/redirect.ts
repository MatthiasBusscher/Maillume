const DEFAULT_REDIRECT_PATH = "/account";
const MAX_REDIRECT_DECODING_PASSES = 8;
const UNSAFE_REDIRECT_CHARACTERS = /[\\\u0000-\u001f\u007f]/;

export function getSafeOAuthRedirectUrl(requestedNext: string, origin: string) {
  const fallbackUrl = new URL(DEFAULT_REDIRECT_PATH, origin);
  const hasRelativePathPrefix =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//");

  if (!hasRelativePathPrefix || !hasSafeRedirectEncoding(requestedNext)) {
    return fallbackUrl;
  }

  try {
    const destination = new URL(requestedNext, origin);
    return destination.origin === fallbackUrl.origin ? destination : fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}

function hasSafeRedirectEncoding(requestedNext: string) {
  let candidate = requestedNext;

  for (let pass = 0; pass < MAX_REDIRECT_DECODING_PASSES; pass += 1) {
    if (
      !candidate.startsWith("/") ||
      candidate.startsWith("//") ||
      UNSAFE_REDIRECT_CHARACTERS.test(candidate)
    ) {
      return false;
    }

    let decoded: string;

    try {
      decoded = decodeURIComponent(candidate);
    } catch {
      return false;
    }

    if (decoded === candidate) {
      return true;
    }

    candidate = decoded;
  }

  return false;
}
