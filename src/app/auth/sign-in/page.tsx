import type { Metadata } from "next";
import { ArrowLeft, LockKeyhole, ScanSearch } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { EmailAuthForm } from "@/components/email-auth-form";
import { SiteLanguageLinks } from "@/components/site-header";
import { PasskeySignInButton } from "@/components/passkey-sign-in-button";
import { getAppHref, getMarketingHref } from "@/lib/site";
import { accountEn } from "@/lib/i18n/account-en";
import { accountNl } from "@/lib/i18n/account-nl";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";
import { arePasskeysEnabled, getPublicSupabaseConfig } from "@/lib/supabase/config";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = (await getRequestSiteLocale()) === "nl" ? accountNl : accountEn;
  return { title: dictionary.metadata.signInTitle, description: dictionary.metadata.signInDescription, robots: { index: false, follow: false } };
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const locale = await getRequestSiteLocale();
  const dictionary = locale === "nl" ? accountNl : accountEn;
  const copy = dictionary.signIn;
  const configured = getPublicSupabaseConfig() !== null;
  const marketingHref = getMarketingHref();
  const authError = (await searchParams).error;
  const authErrorMessage = authError === "oauth_callback_failed"
    ? copy.google.callbackFailed
    : authError === "oauth_provider_failed"
      ? copy.google.providerFailed
      : null;

  return (
    <main className="grid min-h-screen bg-[#eef1eb] lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex min-h-[360px] flex-col justify-between bg-[#111711] p-6 text-white sm:p-10 lg:min-h-screen lg:p-14">
        <div className="flex items-center justify-between gap-4">
          <a href={marketingHref} aria-label={copy.homeLabel}><BrandMark inverse /></a>
          <SiteLanguageLinks locale={locale} pathname="/auth/sign-in" />
        </div>
        <div className="max-w-xl py-12 lg:py-0">
          <p className="font-mono text-[10px] uppercase text-[#dfff52]">{copy.eyebrow}</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">{copy.title}</h1>
          <p className="mt-5 text-base leading-7 text-[#c8d1c6]">{copy.intro}</p>
        </div>
        <div className="flex items-center gap-3 border-t border-white/20 pt-5 text-xs text-[#93a091]">
          <LockKeyhole className="h-4 w-4 text-[#dfff52]" aria-hidden="true" />
          {copy.authNote}
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md border border-[#aeb6ac] bg-[#f9faf7] p-6 shadow-[0_24px_70px_rgba(17,23,17,0.12)] sm:p-8">
          <p className="font-mono text-[10px] uppercase text-[#087b72]">{copy.accountEyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold text-[#111711]">{copy.continueTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-[#59655a]">{copy.continueBody}</p>
          <div className="mt-7">
            <EmailAuthForm configured={configured} labels={copy.email} locale={locale} />
          </div>
          <div className="my-5 flex items-center gap-3 text-[10px] uppercase text-[#778177]">
            <span className="h-px flex-1 bg-[#cbd0c5]" />
            Google
            <span className="h-px flex-1 bg-[#cbd0c5]" />
          </div>
          <div>
            <GoogleSignInButton configured={configured} labels={copy.google} />
            <PasskeySignInButton enabled={configured && arePasskeysEnabled()} labels={copy.passkey} locale={locale} />
          </div>
          {authErrorMessage ? (
            <p role="alert" className="mt-4 border-l-4 border-[#b2382b] bg-[#fff0ed] px-4 py-3 text-sm leading-6 text-[#7a2b23]">
              {authErrorMessage}
            </p>
          ) : null}
          <div className="my-7 flex items-center gap-3 text-[10px] uppercase text-[#778177]">
            <span className="h-px flex-1 bg-[#cbd0c5]" />
            {copy.separator}
            <span className="h-px flex-1 bg-[#cbd0c5]" />
          </div>
          <a href={getAppHref()} className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[#111711] px-5 text-sm font-semibold text-white hover:bg-[#087b72]">
            <ScanSearch className="h-4 w-4 text-[#dfff52]" aria-hidden="true" /> {copy.openScanner}
          </a>
          <a href={marketingHref} className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-[#59655a] hover:text-[#087b72]">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> {copy.back}
          </a>
        </div>
      </section>
    </main>
  );
}
