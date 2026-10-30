import { type NextRequest, NextResponse } from "next/server";

import {
  DEFAULT_SITE_LOCALE,
  getPathLocale,
  getSiteLocaleCookieDomain,
  getVerifiedInternalPathname,
  isSiteLocale,
  localizePath,
  SITE_LOCALE_COOKIE,
  SITE_LOCALE_HEADER,
  SITE_PATHNAME_HEADER,
  stripSiteLocale,
  type SiteLocale,
} from "@/lib/i18n/site-locale";
import { createContentSecurityPolicy } from "@/lib/security/csp";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = createContentSecurityPolicy({
    isDevelopment: process.env.NODE_ENV !== "production",
    nonce,
  });
  const createRequestHeaders = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", contentSecurityPolicy);
    return headers;
  };
  const secureResponse = <T extends NextResponse>(response: T): T => {
    response.headers.set("Content-Security-Policy", contentSecurityPolicy);
    return response;
  };
  const hostname = request.headers.get("host")?.split(":")[0] ?? "";
  const isAppHostname = hostname.startsWith("app.");
  const targetUrl = request.nextUrl.clone();
  const originalPathname = request.nextUrl.pathname;
  const pathLocale = getPathLocale(originalPathname);

  if (hostname === "maillume.nl" || hostname === "www.maillume.nl") {
    targetUrl.protocol = "https:";
    targetUrl.hostname = "maillume.io";
    targetUrl.port = "";
    targetUrl.pathname = localizePath(originalPathname, "nl");
    return secureResponse(NextResponse.redirect(targetUrl, 301));
  }

  // Accounts were retired; old sign-in, account, and extension-approval links land on the scanner.
  if (/^\/(?:auth|account)(?:\/|$)/.test(stripSiteLocale(originalPathname))) {
    targetUrl.pathname = localizePath("/app", pathLocale ?? DEFAULT_SITE_LOCALE);
    targetUrl.search = "";
    return secureResponse(NextResponse.redirect(targetUrl, 308));
  }

  if (hostname === "www.maillume.io") {
    targetUrl.protocol = "https:";
    targetUrl.hostname = "maillume.io";
    targetUrl.port = "";
    return secureResponse(NextResponse.redirect(targetUrl, 301));
  }

  const internalLocale = request.nextUrl.searchParams.get("__maillume_locale");
  if (isSiteLocale(internalLocale)) {
    const internalHeaders = createRequestHeaders();
    internalHeaders.set(SITE_LOCALE_HEADER, internalLocale);
    internalHeaders.set(
      SITE_PATHNAME_HEADER,
      getVerifiedInternalPathname(
        originalPathname,
        request.nextUrl.searchParams.get("__maillume_path"),
        internalLocale,
      ),
    );
    return secureResponse(NextResponse.next({ request: { headers: internalHeaders } }));
  }

  if (pathLocale === DEFAULT_SITE_LOCALE) {
    targetUrl.pathname = stripSiteLocale(originalPathname);
    const redirectResponse = NextResponse.redirect(targetUrl, 308);
    setLocalePreferenceCookies(redirectResponse, request, DEFAULT_SITE_LOCALE);
    return secureResponse(redirectResponse);
  }

  if (pathLocale && !shouldUseLocalizedPage(request, stripSiteLocale(originalPathname))) {
    targetUrl.pathname = stripSiteLocale(originalPathname);
    return secureResponse(NextResponse.redirect(targetUrl, 308));
  }

  // The address bar is the source of truth for language. A saved preference can
  // make the language switcher convenient, but it must never silently turn an
  // explicit English URL such as /self-hosted into /nl/self-hosted.
  const locale: SiteLocale = pathLocale ?? DEFAULT_SITE_LOCALE;

  const requestHeaders = createRequestHeaders();
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

    return secureResponse(nextResponse);
  };
  return createResponse();
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
    "/language/",
  ].some((prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
