import type { PublicApiKey } from "./api-keys";

/**
 * Older extension pairings created ordinary developer credentials before
 * browser lifecycle metadata existed. They cannot be safely identified or
 * reclassified later, so the account UI offers recovery guidance only when
 * an account still has an active developer credential and no active managed
 * browser connection.
 *
 * This module deliberately has no server-only runtime dependencies because
 * the account key manager runs in the browser.
 */
export function shouldShowBrowserConnectionRecovery(
  keys: readonly Pick<PublicApiKey, "credential_kind" | "status">[],
): boolean {
  const hasActiveBrowserConnection = keys.some(
    (key) => key.credential_kind === "browser" && key.status === "active",
  );
  const hasActiveDeveloperKey = keys.some(
    (key) => key.credential_kind === "developer" && key.status === "active",
  );
  return !hasActiveBrowserConnection && hasActiveDeveloperKey;
}
