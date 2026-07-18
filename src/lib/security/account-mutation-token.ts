import { createHmac, timingSafeEqual } from "node:crypto";

export type AccountMutationAction = "delete" | "language" | "sign-out";

export type AccountMutationTokenInput = {
  lastSignInAt?: string;
  userId: string;
};

export const ACCOUNT_MUTATION_TOKEN_TTL_MS = 30 * 60 * 1000;

export function isAccountMutationTokenCandidate(token: string | null): token is string {
  return typeof token === "string" && /^[a-z0-9]{6,10}\.[A-Za-z0-9_-]{43}$/.test(token);
}

export function createAccountMutationToken(
  action: AccountMutationAction,
  input: AccountMutationTokenInput,
  secret: string,
  now = Date.now(),
): string {
  const expiresAt = Math.floor((now + ACCOUNT_MUTATION_TOKEN_TTL_MS) / 1000);
  const encodedExpiry = expiresAt.toString(36);
  const signature = createHmac("sha256", secret)
    .update(getTokenPayload(action, input, expiresAt))
    .digest("base64url");
  return `${encodedExpiry}.${signature}`;
}

export function verifyAccountMutationToken(
  action: AccountMutationAction,
  token: string | null,
  input: AccountMutationTokenInput,
  secret: string,
  now = Date.now(),
): boolean {
  if (!isAccountMutationTokenCandidate(token) || !secret) return false;

  const [encodedExpiry, candidateSignature] = token.split(".", 2);
  const expiresAt = Number.parseInt(encodedExpiry, 36);
  if (!Number.isSafeInteger(expiresAt) || expiresAt * 1000 < now) return false;

  const expectedSignature = createHmac("sha256", secret)
    .update(getTokenPayload(action, input, expiresAt))
    .digest("base64url");
  const candidateBytes = Buffer.from(candidateSignature);
  const expectedBytes = Buffer.from(expectedSignature);

  return candidateBytes.length === expectedBytes.length
    && timingSafeEqual(candidateBytes, expectedBytes);
}

export function isAuthorizedAccountMutation({
  action,
  input,
  sameOrigin,
  secret,
  token,
  now = Date.now(),
}: {
  action: AccountMutationAction;
  input: AccountMutationTokenInput;
  now?: number;
  sameOrigin: boolean;
  secret?: string;
  token: string | null;
}): boolean {
  return sameOrigin || Boolean(
    secret && verifyAccountMutationToken(action, token, input, secret, now),
  );
}

function getTokenPayload(
  action: AccountMutationAction,
  { lastSignInAt, userId }: AccountMutationTokenInput,
  expiresAt: number,
): string {
  return `maillume-account-mutation-v2\n${action}\n${userId}\n${lastSignInAt ?? ""}\n${expiresAt}`;
}
