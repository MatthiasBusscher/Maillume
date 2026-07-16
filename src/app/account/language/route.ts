import { NextResponse } from "next/server";

import { getPublicAppOrigin } from "@/app/auth/callback/origin";
import { getAccountLocaleMetadata } from "@/lib/i18n/account-locale";
import {
  getSiteLocaleCookieDomain,
  isSiteLocale,
  localizePath,
  SITE_LOCALE_COOKIE,
} from "@/lib/i18n/site-locale";
import {
  hasRequestContentType,
  isStrictSameOriginMutation,
  readBoundedRequestBody,
} from "@/lib/security/account-request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ACCOUNT_LANGUAGE_MAX_REQUEST_BYTES = 128;

export async function POST(request: Request) {
  const publicOrigin = getPublicAppOrigin({
    configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    host: request.headers.get("host"),
    requestUrl: request.url,
  });

  if (!isStrictSameOriginMutation(request, publicOrigin)) {
    return privateResponse("Cross-origin language changes are not allowed.", 403);
  }

  if (!hasRequestContentType(request, "application/x-www-form-urlencoded")) {
    return privateResponse("Invalid language change request.", 415);
  }

  const body = await readBoundedRequestBody(request, ACCOUNT_LANGUAGE_MAX_REQUEST_BYTES);
  if (!body.ok) {
    return privateResponse("Language change request body is too large.", 413);
  }

  const locale = new URLSearchParams(body.text).get("locale");
  if (!isSiteLocale(locale)) {
    return privateResponse("Unsupported language.", 400);
  }

  const supabase = await createServerSupabaseClient({ strictCookieWrites: true });
  if (!supabase) {
    return privateRedirect(new URL("/auth/sign-in", publicOrigin));
  }

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) {
    return privateRedirect(new URL("/auth/sign-in", publicOrigin));
  }

  const { error: updateError } = await supabase.auth.updateUser({
    data: getAccountLocaleMetadata(locale),
  });
  if (updateError) {
    return privateResponse("Language preference could not be saved.", 503);
  }

  const destination = new URL(localizePath("/account", locale), publicOrigin);
  const response = privateRedirect(destination);
  const domain = getSiteLocaleCookieDomain(destination.hostname);
  response.cookies.set(SITE_LOCALE_COOKIE, locale, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: destination.protocol === "https:",
    ...(domain ? { domain } : {}),
  });
  return response;
}

function privateRedirect(url: URL) {
  const response = NextResponse.redirect(url, 303);
  applyPrivateHeaders(response);
  return response;
}

function privateResponse(message: string, status: number) {
  const response = new NextResponse(message, { status });
  applyPrivateHeaders(response);
  return response;
}

function applyPrivateHeaders(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
}
