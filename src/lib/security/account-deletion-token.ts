import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_PURPOSE = "maillume-account-deletion-v1";

type AccountDeletionTokenInput = {
  lastSignInAt?: string;
  userId: string;
};

export function createAccountDeletionToken(
  input: AccountDeletionTokenInput,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(getTokenPayload(input))
    .digest("base64url");
}

export function verifyAccountDeletionToken(
  token: string | null,
  input: AccountDeletionTokenInput,
  secret: string,
): boolean {
  if (!token || !secret) return false;

  const expected = createAccountDeletionToken(input, secret);
  const candidateBytes = Buffer.from(token);
  const expectedBytes = Buffer.from(expected);

  return candidateBytes.length === expectedBytes.length
    && timingSafeEqual(candidateBytes, expectedBytes);
}

function getTokenPayload({ lastSignInAt, userId }: AccountDeletionTokenInput): string {
  return `${TOKEN_PURPOSE}\n${userId}\n${lastSignInAt ?? ""}`;
}
