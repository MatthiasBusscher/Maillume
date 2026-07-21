export const SITE_LOCALES = ["en", "nl"] as const;
export const DEFAULT_SITE_LOCALE: SiteLocale = "en";
export const SITE_LOCALE_COOKIE = "maillume-locale-v2";
export const SITE_LOCALE_HEADER = "x-maillume-locale";
export const SITE_PATHNAME_HEADER = "x-maillume-pathname";

export type SiteLocale = (typeof SITE_LOCALES)[number];

export function isSiteLocale(value: string | null | undefined): value is SiteLocale {
  return SITE_LOCALES.includes(value as SiteLocale);
}

export function getPathLocale(pathname: string): SiteLocale | null {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return isSiteLocale(firstSegment) ? firstSegment : null;
}

export function stripSiteLocale(pathname: string): string {
  const locale = getPathLocale(pathname);
  if (!locale) return normalizePathname(pathname);
  const stripped = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "");
  return normalizePathname(stripped);
}

export function localizePath(pathname: string, locale: SiteLocale): string {
  const normalized = stripSiteLocale(pathname);
  if (locale === DEFAULT_SITE_LOCALE) return normalized;
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

export function getVerifiedInternalPathname(
  resolvedPathname: string,
  internalPathname: string | null,
  locale: SiteLocale,
): string {
  const resolved = normalizePathname(resolvedPathname);

  if (
    !internalPathname
    || !internalPathname.startsWith("/")
    || /[\\?#\u0000-\u001f\u007f]/.test(internalPathname)
    || getPathLocale(internalPathname) !== locale
    || stripSiteLocale(internalPathname) !== resolved
  ) {
    return resolved;
  }

  return normalizePathname(internalPathname);
}

export function getLanguageName(locale: SiteLocale) {
  return locale === "nl" ? "Nederlands" : "English";
}

export function getSiteLocaleCookieDomain(hostname: string): string | undefined {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  return normalized === "maillume.io" || normalized.endsWith(".maillume.io")
    ? ".maillume.io"
    : undefined;
}

function normalizePathname(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  const withSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return withSlash.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
}
