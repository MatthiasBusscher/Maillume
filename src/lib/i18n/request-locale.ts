import "server-only";

import { cookies, headers } from "next/headers";

import {
  DEFAULT_SITE_LOCALE,
  isSiteLocale,
  SITE_LOCALE_COOKIE,
  SITE_LOCALE_HEADER,
  SITE_PATHNAME_HEADER,
} from "./site-locale";

export async function getRequestSiteLocale() {
  const requestHeaders = await headers();
  const locale = requestHeaders.get(SITE_LOCALE_HEADER);
  if (isSiteLocale(locale)) return locale;
  const cookieLocale = (await cookies()).get(SITE_LOCALE_COOKIE)?.value;
  return isSiteLocale(cookieLocale) ? cookieLocale : DEFAULT_SITE_LOCALE;
}

export async function getRequestPathname() {
  const requestHeaders = await headers();
  return requestHeaders.get(SITE_PATHNAME_HEADER) || "/";
}
