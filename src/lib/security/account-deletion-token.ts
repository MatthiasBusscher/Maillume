import {
  createAccountMutationToken,
  verifyAccountMutationToken,
} from "./account-mutation-token";

type AccountDeletionTokenInput = {
  lastSignInAt?: string;
  userId: string;
};

export function createAccountDeletionToken(
  input: AccountDeletionTokenInput,
  secret: string,
): string {
  return createAccountMutationToken("delete", input, secret);
}

export function verifyAccountDeletionToken(
  token: string | null,
  input: AccountDeletionTokenInput,
  secret: string,
): boolean {
  return verifyAccountMutationToken("delete", token, input, secret);
}
