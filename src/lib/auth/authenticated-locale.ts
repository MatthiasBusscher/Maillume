import { getAccountLocale, getAccountLocaleMetadata } from "../i18n/account-locale";
import type { SiteLocale } from "../i18n/site-locale";

type LocaleAwareAuthClient = {
  getUser: () => Promise<{ data: { user: { user_metadata: unknown } | null } }>;
  updateUser: (attributes: { data: Record<string, string> }) => Promise<unknown>;
};

export async function resolveAuthenticatedLocale(
  auth: LocaleAwareAuthClient,
  fallbackLocale: SiteLocale,
): Promise<SiteLocale> {
  const { data } = await auth.getUser();
  const storedLocale = getAccountLocale(data.user?.user_metadata);

  if (storedLocale || !data.user) return storedLocale ?? fallbackLocale;

  try {
    await auth.updateUser({ data: getAccountLocaleMetadata(fallbackLocale) });
  } catch {
    // A successful sign-in should not fail when this optional preference write does.
  }

  return fallbackLocale;
}
