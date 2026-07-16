import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, ScanSearch, ShieldCheck, UserRound } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { AccountLanguageLinks } from "@/components/account-language-links";
import { ApiKeyManager } from "@/components/api-key-manager";
import { AccountSecurityManager, MfaSessionGate } from "@/components/account-security-manager";
import { SiteFooter } from "@/components/site-footer";
import { SiteLanguageLinks } from "@/components/site-header";
import { accountEn } from "@/lib/i18n/account-en";
import { accountNl } from "@/lib/i18n/account-nl";
import { getRequestSiteLocale } from "@/lib/i18n/request-locale";
import { localizePath } from "@/lib/i18n/site-locale";
import { getAppHref, getMarketingHref } from "@/lib/site";
import { getSupabaseAdminConfig } from "@/lib/supabase/admin";
import { arePasskeysEnabled } from "@/lib/supabase/config";
import { hasRecentAuthentication } from "@/lib/security/account-request";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { areAccountsEnabled } from "@/lib/accounts/config";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = (await getRequestSiteLocale()) === "nl" ? accountNl : accountEn;
  return { title: dictionary.metadata.accountTitle, description: dictionary.metadata.accountDescription, robots: { index: false, follow: false } };
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const locale = await getRequestSiteLocale();
  if (!areAccountsEnabled()) {
    redirect(localizePath("/app", locale));
  }
  const dictionary = locale === "nl" ? accountNl : accountEn;
  const copy = dictionary.account;
  const requestedError = (await searchParams).error;
  const supabase = await createServerSupabaseClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const { data: assurance } = supabase
    ? await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    : { data: null };
  const hasAal2 = assurance?.currentLevel === "aal2";
  const deletionConfigured = getSupabaseAdminConfig() !== null;
  const deletionError = requestedError
    ? {
        confirmation_required: copy.deletionErrors.confirmationRequired,
        deletion_unavailable: copy.deletionErrors.unavailable,
        deletion_failed: copy.deletionErrors.failed,
        recent_auth_required: copy.deletionErrors.recentAuthRequired,
      }[requestedError]
    : undefined;

  if (!data.user) {
    return (
      <main className="flex min-h-screen flex-col bg-[#eef1eb]">
        <section className="flex flex-1 items-center justify-center px-5 py-5 sm:py-8">
          <div className="w-full max-w-lg border border-[#aeb6ac] bg-white p-7 sm:p-9">
            <div className="flex items-center justify-between gap-4">
              <BrandMark />
              <SiteLanguageLinks locale={locale} pathname="/account" />
            </div>
            <h1 className="mt-8 text-3xl font-semibold text-[#111711]">{copy.noSessionTitle}</h1>
            <p className="mt-4 text-sm leading-7 text-[#59655a]">{copy.noSessionBody}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={localizePath("/auth/sign-in", locale)} className="inline-flex h-11 items-center gap-2 bg-[#111711] px-4 text-sm font-semibold text-white hover:bg-[#087b72]"><UserRound className="h-4 w-4" aria-hidden="true" /> {copy.signIn}</Link>
              <a href={getAppHref()} className="inline-flex h-11 items-center gap-2 border border-[#111711] px-4 text-sm font-semibold text-[#111711] hover:bg-[#eef1eb]"><ScanSearch className="h-4 w-4" aria-hidden="true" /> {copy.openScanner}</a>
            </div>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#eef1eb]">
      <header className="border-b border-[#aeb6ac] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <a href={getMarketingHref()}><BrandMark /></a>
          <div className="flex items-center gap-2">
            <AccountLanguageLinks locale={locale} />
            <form action="/auth/sign-out" method="post">
              <button type="submit" className="inline-flex h-10 items-center gap-2 border border-[#aeb6ac] px-3 text-sm font-semibold text-[#374238] hover:border-[#111711]"><LogOut className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">{copy.signOut}</span></button>
            </form>
          </div>
        </div>
      </header>
      <section className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-6">
        <p className="font-mono text-[10px] uppercase text-[#087b72]">{copy.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#111711]">{copy.welcome}</h1>
        <p className="mt-3 text-sm text-[#59655a]">{copy.signedInAs} {data.user.email ?? copy.googleUser}</p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="border border-[#aeb6ac] bg-white p-6">
            <ScanSearch className="h-5 w-5 text-[#ff705f]" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-semibold text-[#111711]">{copy.assessmentTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-[#59655a]">{copy.assessmentBody}</p>
            <a href={getAppHref()} className="mt-6 inline-flex h-10 items-center bg-[#111711] px-4 text-sm font-semibold text-white hover:bg-[#087b72]">{copy.openScanner}</a>
          </div>
          <div className="border border-[#aeb6ac] bg-[#dfff52] p-6">
            <ShieldCheck className="h-5 w-5 text-[#087b72]" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-semibold text-[#111711]">{copy.scopeTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-[#455045]">{copy.scopeBody}</p>
          </div>
        </div>

        <MfaSessionGate labels={copy.security} locale={locale}>
          <AccountSecurityManager canManage={hasRecentAuthentication(data.user.last_sign_in_at)} labels={copy.security} passkeysEnabled={arePasskeysEnabled()} />

          {deletionConfigured && hasAal2 ? (
            <ApiKeyManager labels={dictionary.apiKeys} locale={locale} />
          ) : deletionConfigured ? (
            <section className="mt-10 border-l-4 border-[#c78c32] bg-[#fff0cf] px-5 py-4">
              <h2 className="font-semibold text-[#5f4111]">{copy.apiKeysMfaTitle}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#714812]">{copy.apiKeysMfaBody}</p>
            </section>
          ) : null}

          <section className="mt-10 border-t border-[#aeb6ac] pt-8">
            <p className="font-mono text-[10px] uppercase text-[#b2382b]">{copy.controlEyebrow}</p>
            <h2 className="mt-3 text-xl font-semibold text-[#111711]">{copy.deleteTitle}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#59655a]">{copy.deleteBody}</p>
            {deletionError ? (
              <p role="alert" className="mt-4 max-w-2xl border-l-4 border-[#b2382b] bg-[#fff7f5] px-4 py-3 text-sm leading-6 text-[#71352e]">
                {deletionError}
              </p>
            ) : null}
            {deletionConfigured ? (
              <details className="mt-5 max-w-2xl border border-[#d08b82] bg-[#fff7f5] p-4">
                <summary className="cursor-pointer font-semibold text-[#8f251b]">{copy.showDeletion}</summary>
                <form action="/account/delete" method="post" className="mt-4">
                  <label className="flex items-start gap-3 text-sm leading-6 text-[#5f3934]">
                    <input type="checkbox" name="confirm" value="delete" required className="mt-1 h-4 w-4 accent-[#b2382b]" />
                    {copy.deletionConfirmation}
                  </label>
                  <button type="submit" className="mt-4 inline-flex h-10 items-center border border-[#b2382b] px-4 text-sm font-semibold text-[#8f251b] hover:bg-[#b2382b] hover:text-white">{copy.deletePermanently}</button>
                </form>
              </details>
            ) : (
              <p className="mt-4 max-w-2xl border-l-4 border-[#c78c32] bg-[#fff0cf] px-4 py-3 text-sm leading-6 text-[#714812]">{copy.deletionUnavailable}</p>
            )}
          </section>
        </MfaSessionGate>
      </section>
      <SiteFooter />
    </main>
  );
}
