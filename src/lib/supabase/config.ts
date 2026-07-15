export type PublicSupabaseConfig = {
  publishableKey: string;
  url: string;
};

export function getPublicSupabaseConfig(
  env?: Partial<NodeJS.ProcessEnv>,
): PublicSupabaseConfig | null {
  const url = (
    env ? env.NEXT_PUBLIC_SUPABASE_URL : process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.trim();
  const publishableKey = (env
    ? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  return { publishableKey, url };
}

export function arePasskeysEnabled(env?: Partial<NodeJS.ProcessEnv>): boolean {
  return (env ? env.NEXT_PUBLIC_PASSKEYS_ENABLED : process.env.NEXT_PUBLIC_PASSKEYS_ENABLED) === "true";
}
