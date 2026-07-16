import { isSiteLocale, type SiteLocale } from "./site-locale";

export const ACCOUNT_LOCALE_METADATA_KEY = "locale";

export function getAccountLocale(userMetadata: unknown): SiteLocale | null {
  if (!userMetadata || typeof userMetadata !== "object") return null;

  const locale = (userMetadata as Record<string, unknown>)[ACCOUNT_LOCALE_METADATA_KEY];
  return typeof locale === "string" && isSiteLocale(locale) ? locale : null;
}

export function getAccountLocaleMetadata(locale: SiteLocale) {
  return { [ACCOUNT_LOCALE_METADATA_KEY]: locale };
}
