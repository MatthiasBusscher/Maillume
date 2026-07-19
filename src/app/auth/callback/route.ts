import { NextResponse } from "next/server";

import { resolveAuthenticatedLocale } from "@/lib/auth/authenticated-locale";
import { getOAuthFailureUrl, hasOAuthErrorReturn } from "@/lib/auth/oauth-return";
import {
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_COOKIE_VALUE,
  PASSWORD_RECOVERY_MAX_AGE_SECONDS,
  isPasswordRecoveryPath,
} from "@/lib/auth/recovery";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DEFAULT_SITE_LOCALE,
  getPathLocale,
  getSiteLocaleCookieDomain,
  isSiteLocale,
  localizePath,
  SITE_LOCALE_COOKIE,
} from "@/lib/i18n/site-locale";
import { getPublicAppOrigin } from "./origin";
import { getSafeOAuthRedirectUrl } from "./redirect";
import { areAccountsEnabled } from "@/lib/accounts/config";

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
  const fallbackLocale = getCallbackLocale(requestUrl, redirectUrl);

  if (!areAccountsEnabled()) {
    return privateRedirect(new URL(localizePath("/app", fallbackLocale), publicOrigin), false, fallbackLocale);
  }

  if (hasOAuthErrorReturn(requestUrl)) {
    return privateRedirect(getOAuthFailureUrl(publicOrigin));
  }

  if (code) {
    try {
      const supabase = await createServerSupabaseClient({ strictCookieWrites: true });

      if (supabase) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
          const locale = await resolveAuthenticatedLocale(supabase.auth, fallbackLocale);
          const localizedRedirectUrl = localizeRedirectUrl(redirectUrl, locale);
          const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (assurance?.currentLevel === "aal1" && assurance.nextLevel === "aal2") {
            const mfaUrl = new URL("/auth/mfa", publicOrigin);
            mfaUrl.searchParams.set(
              "next",
              `${localizedRedirectUrl.pathname}${localizedRedirectUrl.search}${localizedRedirectUrl.hash}`,
            );
            return privateRedirect(
              mfaUrl,
              isPasswordRecoveryPath(localizedRedirectUrl.pathname),
              locale,
            );
          }
          return privateRedirect(
            localizedRedirectUrl,
            isPasswordRecoveryPath(localizedRedirectUrl.pathname),
            locale,
          );
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

function privateRedirect(url: URL, passwordRecovery = false, locale?: "en" | "nl") {
  const response = NextResponse.redirect(url);
  if (locale) {
    const domain = getSiteLocaleCookieDomain(url.hostname);
    response.cookies.set(SITE_LOCALE_COOKIE, locale, {
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      secure: url.protocol === "https:",
      ...(domain ? { domain } : {}),
    });
  }
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

function getCallbackLocale(requestUrl: URL, redirectUrl: URL) {
  const requestedLocale = requestUrl.searchParams.get("locale");
  if (isSiteLocale(requestedLocale)) return requestedLocale;
  return getPathLocale(redirectUrl.pathname) ?? DEFAULT_SITE_LOCALE;
}

function localizeRedirectUrl(redirectUrl: URL, locale: "en" | "nl") {
  const localizedUrl = new URL(redirectUrl);
  localizedUrl.pathname = localizePath(localizedUrl.pathname, locale);
  return localizedUrl;
}
