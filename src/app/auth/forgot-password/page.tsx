import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { areAccountsEnabled } from "@/lib/accounts/config";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";
import { localizePath } from "@/lib/i18n/site-locale";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  const locale = await getRequestSiteLocale();

  if (!areAccountsEnabled()) {
    redirect(localizePath("/app", locale));
  }

  redirect(`${localizePath("/auth/sign-in", locale)}?mode=forgot`);
}
