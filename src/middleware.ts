import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicSupabaseConfig } from "@/lib/supabase/config";
import { areAccountsEnabled } from "@/lib/accounts/config";
import { getOAuthFailureUrl, hasOAuthErrorReturn } from "@/lib/auth/oauth-return";
import {
  DEFAULT_SITE_LOCALE,
  getPathLocale,
  getSiteLocaleCookieDomain,
  isSiteLocale,
  localizePath,
  SITE_LOCALE_COOKIE,
  SITE_LOCALE_HEADER,
  SITE_PATHNAME_HEADER,
  stripSiteLocale,
  type SiteLocale,
} from "@/lib/i18n/site-locale";

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0] ?? "";
  const isAppHostname = hostname.startsWith("app.");
  const targetUrl = request.nextUrl.clone();
  const originalPathname = request.nextUrl.pathname;
  const pathLocale = getPathLocale(originalPathname);

  if (isAppHostname && originalPathname === "/") {
    if (hasOAuthErrorReturn(request.nextUrl)) {
      if (!areAccountsEnabled()) {
        targetUrl.pathname = "/app";
        targetUrl.search = "";
        return NextResponse.redirect(targetUrl, 307);
      }
      return NextResponse.redirect(getOAuthFailureUrl(targetUrl.origin), 307);
    }
    if (request.nextUrl.searchParams.has("code")) {
      targetUrl.pathname = "/auth/callback";
      return NextResponse.redirect(targetUrl, 307);
    }
  }

  if (hostname === "maillume.nl" || hostname === "www.maillume.nl") {
    targetUrl.protocol = "https:";
    targetUrl.hostname = "maillume.io";
    targetUrl.port = "";
    targetUrl.pathname = localizePath(originalPathname, "nl");
    return NextResponse.redirect(targetUrl, 301);
  }

  if (
    (hostname === "maillume.io" || hostname === "www.maillume.io")
    && /^\/(?:auth|account)(?:\/|$)/.test(originalPathname)
  ) {
    targetUrl.protocol = "https:";
    targetUrl.hostname = "app.maillume.io";
    targetUrl.port = "";
    return NextResponse.redirect(targetUrl, 307);
  }

  if (hostname === "www.maillume.io") {
    targetUrl.protocol = "https:";
    targetUrl.hostname = "maillume.io";
    targetUrl.port = "";
    return NextResponse.redirect(targetUrl, 301);
  }

  const internalLocale = request.nextUrl.searchParams.get("__maillume_locale");
  if (isSiteLocale(internalLocale)) {
    const internalHeaders = new Headers(request.headers);
    internalHeaders.set(SITE_LOCALE_HEADER, internalLocale);
    internalHeaders.set(
      SITE_PATHNAME_HEADER,
      request.nextUrl.searchParams.get("__maillume_path") || originalPathname,
    );
    return NextResponse.next({ request: { headers: internalHeaders } });
  }

  if (pathLocale === DEFAULT_SITE_LOCALE) {
    targetUrl.pathname = stripSiteLocale(originalPathname);
    const redirectResponse = NextResponse.redirect(targetUrl, 308);
    setLocalePreferenceCookies(redirectResponse, request, DEFAULT_SITE_LOCALE);
    return redirectResponse;
  }

  if (pathLocale && !shouldUseLocalizedPage(request, stripSiteLocale(originalPathname))) {
    targetUrl.pathname = stripSiteLocale(originalPathname);
    return NextResponse.redirect(targetUrl, 308);
  }

  const cookieLocale = request.cookies.get(SITE_LOCALE_COOKIE)?.value;
  const locale: SiteLocale = pathLocale ?? (isSiteLocale(cookieLocale) ? cookieLocale : DEFAULT_SITE_LOCALE);

  if (
    !pathLocale &&
    locale !== DEFAULT_SITE_LOCALE &&
    shouldUseLocalizedPage(request)
  ) {
    targetUrl.pathname = localizePath(originalPathname, locale);
    return NextResponse.redirect(targetUrl, 307);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(SITE_LOCALE_HEADER, locale);
  requestHeaders.set(SITE_PATHNAME_HEADER, originalPathname);

  if (pathLocale) {
    targetUrl.pathname = stripSiteLocale(originalPathname);
    targetUrl.searchParams.set("__maillume_locale", locale);
    targetUrl.searchParams.set("__maillume_path", originalPathname);
  }

  if (isAppHostname && targetUrl.pathname === "/") {
    targetUrl.pathname = "/app";
  }

  const shouldRewrite = targetUrl.pathname !== originalPathname;
  const createResponse = () => {
    const nextResponse = shouldRewrite
      ? NextResponse.rewrite(targetUrl, { request: { headers: requestHeaders } })
      : NextResponse.next({ request: { headers: requestHeaders } });

    if (pathLocale) {
      setLocalePreferenceCookies(nextResponse, request, locale);
    }

    return nextResponse;
  };
  let response = createResponse();

  if (!areAccountsEnabled()) {
    return response;
  }

  const config = getPublicSupabaseConfig();

  if (!config) {
    return response;
  }

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        const nextResponse = createResponse();

        cookiesToSet.forEach(({ name, options, value }) => {
          nextResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          nextResponse.headers.set(name, value);
        });
        response = nextResponse;
      },
    },
  });

  try {
    await supabase.auth.getClaims();
  } catch {
    // Authentication is optional; an auth outage must not block anonymous scanning.
  }

  return response;
}

function setLocalePreferenceCookies(
  response: NextResponse,
  request: NextRequest,
  locale: SiteLocale,
) {
  const options = {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
  };
  const hostname = request.headers.get("host")?.split(":")[0] ?? request.nextUrl.hostname;

  const domain = getSiteLocaleCookieDomain(hostname);
  response.cookies.set(SITE_LOCALE_COOKIE, locale, {
    ...options,
    ...(domain ? { domain } : {}),
  });
}

function shouldUseLocalizedPage(request: NextRequest, pathname = request.nextUrl.pathname) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  return ![
    "/api/",
    "/auth/callback",
    "/auth/sign-out",
    "/account/api-keys",
    "/account/delete",
    "/language/",
  ].some((prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
