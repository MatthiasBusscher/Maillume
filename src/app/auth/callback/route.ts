import { NextResponse } from "next/server";

import { getOAuthFailureUrl, hasOAuthErrorReturn } from "@/lib/auth/oauth-return";
import {
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_COOKIE_VALUE,
  PASSWORD_RECOVERY_MAX_AGE_SECONDS,
} from "@/lib/auth/recovery";
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

  if (hasOAuthErrorReturn(requestUrl)) {
    return privateRedirect(getOAuthFailureUrl(publicOrigin));
  }

  if (code) {
    try {
      const supabase = await createServerSupabaseClient({ strictCookieWrites: true });

      if (supabase) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
          const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (assurance?.currentLevel === "aal1" && assurance.nextLevel === "aal2") {
            const mfaUrl = new URL("/auth/mfa", publicOrigin);
            mfaUrl.searchParams.set(
              "next",
              `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`,
            );
            return privateRedirect(mfaUrl, false);
          }
          return privateRedirect(redirectUrl, isPasswordRecoveryDestination(redirectUrl));
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

function privateRedirect(url: URL, passwordRecovery = false) {
  const response = NextResponse.redirect(url);
  if (passwordRecovery) {
    response.cookies.set(PASSWORD_RECOVERY_COOKIE, PASSWORD_RECOVERY_COOKIE_VALUE, {
      httpOnly: true,
      maxAge: PASSWORD_RECOVERY_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: url.protocol === "https:",
    });
  }
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function isPasswordRecoveryDestination(url: URL) {
  return /\/(?:auth\/)?update-password$/.test(url.pathname);
}
