import type { Metadata } from "next";

import { BrandMark } from "@/components/brand-mark";
import { getSafeOAuthRedirectUrl } from "@/app/auth/callback/redirect";
import { MfaChallengeForm } from "@/components/mfa-challenge-form";
import { SiteLanguageLinks } from "@/components/site-header";
import { accountEn } from "@/lib/i18n/account-en";
import { accountNl } from "@/lib/i18n/account-nl";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";
import { localizePath } from "@/lib/i18n/site-locale";

export const metadata: Metadata = {
  title: "Two-factor verification",
  robots: { index: false, follow: false },
};

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const locale = await getRequestSiteLocale();
  const labels = (locale === "nl" ? accountNl : accountEn).signIn.mfa;
  const nextPath = getSafeNextPath((await searchParams).next, localizePath("/account", locale));

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef1eb] px-5 py-12">
      <section className="w-full max-w-md border border-[#aeb6ac] bg-[#f9faf7] p-7 shadow-[0_24px_70px_rgba(17,23,17,0.12)] sm:p-9">
        <div className="flex items-center justify-between gap-4">
          <BrandMark />
          <SiteLanguageLinks locale={locale} pathname="/auth/mfa" />
        </div>
        <p className="mt-8 font-mono text-[10px] uppercase text-[#087b72]">{labels.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#111711]">{labels.title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#59655a]">{labels.body}</p>
        <MfaChallengeForm labels={labels} nextPath={nextPath} />
      </section>
    </main>
  );
}

function getSafeNextPath(value: string | undefined, fallback: string) {
  const parsed = getSafeOAuthRedirectUrl(value ?? fallback, "https://maillume.invalid");
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
