import type { SupabaseClient } from "@supabase/supabase-js";

export async function requiresMfaChallenge(client: SupabaseClient): Promise<boolean> {
  const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return true;
  return data.currentLevel === "aal1" && data.nextLevel === "aal2";
}

export async function hasAal2Session(client: SupabaseClient): Promise<boolean> {
  const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  return !error && data.currentLevel === "aal2";
}
