import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { SiteLanguageLinks } from "@/components/site-header";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { accountEn } from "@/lib/i18n/account-en";
import { accountNl } from "@/lib/i18n/account-nl";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";
import { localizePath } from "@/lib/i18n/site-locale";
import { PASSWORD_RECOVERY_COOKIE, PASSWORD_RECOVERY_COOKIE_VALUE } from "@/lib/auth/recovery";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Update password",
  robots: { index: false, follow: false },
};

export default async function UpdatePasswordPage() {
  const locale = await getRequestSiteLocale();
  const labels = (locale === "nl" ? accountNl : accountEn).signIn.email;
  const cookieStore = await cookies();
  if (cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value !== PASSWORD_RECOVERY_COOKIE_VALUE) {
    redirect(localizePath("/auth/sign-in", locale));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef1eb] px-5 py-12">
      <section className="w-full max-w-md border border-[#aeb6ac] bg-[#f9faf7] p-7 shadow-[0_24px_70px_rgba(17,23,17,0.12)] sm:p-9">
        <div className="flex items-center justify-between gap-4">
          <BrandMark />
          <SiteLanguageLinks locale={locale} pathname="/auth/update-password" />
        </div>
        <h1 className="mt-8 text-3xl font-semibold text-[#111711]">{labels.updateTitle}</h1>
        <p className="mt-3 text-sm leading-6 text-[#59655a]">{labels.updateBody}</p>
        <UpdatePasswordForm configured={getPublicSupabaseConfig() !== null} labels={labels} locale={locale} />
      </section>
    </main>
  );
}
