import { NextResponse } from "next/server";

import {
  isSiteLocale,
  localizePath,
  SITE_LOCALE_COOKIE,
} from "@/lib/i18n/site-locale";
import { getAppRouteHref, getMarketingHref } from "@/lib/site";
import { getPublicAppOrigin } from "@/app/auth/callback/origin";

export async function GET(
  request: Request,
  context: { params: Promise<{ locale: string }> },
) {
  const { locale } = await context.params;
  const requestUrl = new URL(request.url);
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const publicOrigin = getPublicOrigin(request, requestUrl, nextPath);

  if (!isSiteLocale(locale)) {
    return NextResponse.redirect(new URL("/", publicOrigin), 303);
  }

  const destination = new URL(localizePath(nextPath, locale), publicOrigin);
  const response = NextResponse.redirect(destination, 303);
  const hostname = destination.hostname;

  const cookieOptions = {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: destination.protocol === "https:",
  } as const;

  response.cookies.set(SITE_LOCALE_COOKIE, locale, cookieOptions);
  if (hostname === "maillume.io" || hostname.endsWith(".maillume.io")) {
    response.cookies.set(SITE_LOCALE_COOKIE, locale, {
      ...cookieOptions,
      domain: ".maillume.io",
    });
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function getPublicOrigin(request: Request, requestUrl: URL, nextPath: string) {
  if (/^\/(?:app|account|auth)(?:\/|$)/.test(nextPath)) {
    const configuredAppHref = getAppRouteHref("/");
    return getPublicAppOrigin({
      configuredAppUrl: configuredAppHref.startsWith("http") ? configuredAppHref : undefined,
      forwardedHost: request.headers.get("x-forwarded-host"),
      forwardedProto: request.headers.get("x-forwarded-proto"),
      host: request.headers.get("host"),
      requestUrl: request.url,
    });
  }

  const configuredHref = getMarketingHref();

  if (configuredHref.startsWith("http://") || configuredHref.startsWith("https://")) {
    return new URL(configuredHref).origin;
  }

  return requestUrl.origin;
}

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const parsed = new URL(value, "https://maillume.invalid");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}
