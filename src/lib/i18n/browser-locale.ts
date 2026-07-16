"use client";

import { getSiteLocaleCookieDomain, SITE_LOCALE_COOKIE, type SiteLocale } from "./site-locale";

export function persistBrowserSiteLocale(locale: SiteLocale) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const domain = getSiteLocaleCookieDomain(window.location.hostname);
  const domainAttribute = domain ? `; Domain=${domain}` : "";
  document.cookie = `${SITE_LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}${domainAttribute}`;
}
