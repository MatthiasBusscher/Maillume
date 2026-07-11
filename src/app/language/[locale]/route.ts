import { NextResponse } from "next/server";

import {
  isSiteLocale,
  localizePath,
  SITE_LOCALE_COOKIE,
} from "@/lib/i18n/site-locale";

export async function GET(
  request: Request,
  context: { params: Promise<{ locale: string }> },
) {
  const { locale } = await context.params;
  const requestUrl = new URL(request.url);

  if (!isSiteLocale(locale)) {
    return NextResponse.redirect(new URL("/", requestUrl.origin), 303);
  }

  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const destination = new URL(localizePath(nextPath, locale), requestUrl.origin);
  const response = NextResponse.redirect(destination, 303);
  const hostname = requestUrl.hostname;

  response.cookies.set(SITE_LOCALE_COOKIE, locale, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: requestUrl.protocol === "https:",
    ...(hostname === "maillume.io" || hostname.endsWith(".maillume.io")
      ? { domain: ".maillume.io" }
      : {}),
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
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
