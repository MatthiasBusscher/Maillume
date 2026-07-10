export type FeedbackConfig =
  | { mode: "disabled" }
  | { mode: "memory" }
  | {
      mode: "supabase";
      supabaseUrl: string;
      apiKey: string;
      useLegacyAuthorization: boolean;
    };

type FeedbackEnvironment = Record<string, string | undefined>;

export class FeedbackConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedbackConfigError";
  }
}

export function getFeedbackConfig(env: FeedbackEnvironment = process.env): FeedbackConfig {
  const mode = env.FEEDBACK_STORAGE?.trim().toLowerCase() || "disabled";

  if (mode === "disabled") {
    return { mode };
  }

  if (mode === "memory") {
    if (env.NODE_ENV === "production") {
      throw new FeedbackConfigError("In-memory feedback storage cannot be used in production.");
    }

    return { mode };
  }

  if (mode !== "supabase") {
    throw new FeedbackConfigError("FEEDBACK_STORAGE must be disabled, memory, or supabase.");
  }

  const supabaseUrl = env.SUPABASE_URL?.trim();
  const secretKey = env.SUPABASE_SECRET_KEY?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const apiKey = secretKey || serviceRoleKey;

  if (!supabaseUrl || !isSupportedSupabaseUrl(supabaseUrl)) {
    throw new FeedbackConfigError("SUPABASE_URL must be an HTTPS URL or a local HTTP URL.");
  }

  if (!apiKey) {
    throw new FeedbackConfigError(
      "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required for feedback storage.",
    );
  }

  return {
    mode,
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    apiKey,
    useLegacyAuthorization: !secretKey,
  };
}

export function isFeedbackEnabled(env: FeedbackEnvironment = process.env): boolean {
  try {
    return getFeedbackConfig(env).mode !== "disabled";
  } catch {
    return false;
  }
}

function isSupportedSupabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "https:" || (url.protocol === "http:" && isLocalHostname(url.hostname));
  } catch {
    return false;
  }
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}
