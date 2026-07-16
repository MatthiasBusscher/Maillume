export function getSupabaseAdminConfig(env: Partial<NodeJS.ProcessEnv> = process.env) {
  const serverUrl = env.SUPABASE_URL?.trim();
  const publicUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const url = serverUrl || publicUrl;
  const secretKey =
    env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (
    !url
    || !secretKey
    || !isValidProjectUrl(url)
    || (serverUrl && publicUrl && getOrigin(serverUrl) !== getOrigin(publicUrl))
  ) {
    return null;
  }

  return { secretKey, url };
}

function isValidProjectUrl(value: string): boolean {
  const origin = getOrigin(value);
  return origin !== null && new URL(value).origin === value.replace(/\/$/, "");
}

function getOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}
