import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPublicAppOrigin } from "./origin";
import { getSafeOAuthRedirectUrl } from "./redirect";

const DEFAULT_REDIRECT_PATH = "/account";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next") ?? DEFAULT_REDIRECT_PATH;
  const publicOrigin = getPublicAppOrigin({
    configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    host: request.headers.get("host"),
    requestUrl: request.url,
  });
  const redirectUrl = getSafeOAuthRedirectUrl(requestedNext, publicOrigin);

  if (code) {
    try {
      const supabase = await createServerSupabaseClient({ strictCookieWrites: true });

      if (supabase) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
          return privateRedirect(redirectUrl);
        }
      }
    } catch {
      // A failed exchange or cookie write returns to a private, user-visible error state.
    }
  }

  const signInUrl = new URL("/auth/sign-in", publicOrigin);
  signInUrl.searchParams.set("error", "oauth_callback_failed");
  return privateRedirect(signInUrl);
}

function privateRedirect(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}
