"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Database,
  ExternalLink,
  Github,
  LogIn,
  Menu,
  Scale,
  ScanSearch,
  UserRound,
} from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { EmailScanForm } from "@/components/email-scan-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  DEFAULT_LOCALE,
  dictionaries,
  type Locale,
} from "@/lib/i18n/dictionary";
import { localizePath, SITE_LOCALE_COOKIE } from "@/lib/i18n/site-locale";
import { LICENSE_URL, SOURCE_REPOSITORY_URL } from "@/lib/project-links";
import { getMarketingHref } from "@/lib/site";

export function ScannerPage({
  feedbackEnabled,
  initialLocale,
  maxRequestBytes,
  userEmail,
}: {
  feedbackEnabled: boolean;
  initialLocale: Locale;
  maxRequestBytes: number;
  userEmail?: string;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);
  const dictionary = useMemo(() => dictionaries[locale], [locale]);
  const marketingHref = getMarketingHref();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function changeLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    const domain = window.location.hostname.endsWith("maillume.io") ? "; Domain=.maillume.io" : "";
    document.cookie = `${SITE_LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}${domain}`;
    const pathname = localizePath(window.location.pathname, nextLocale);
    window.history.replaceState(window.history.state, "", `${pathname}${window.location.search}${window.location.hash}`);
  }

  return (
    <main className="min-h-screen bg-[#e9ede6]">
      <a
        href="#scanner"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-white focus:bg-[#111711] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
      >
        {dictionary.app.skipToScanner}
      </a>
      <header className="border-b border-black bg-[#111711] text-white">
        <div className="mx-auto flex h-[63px] max-w-[1480px] items-center justify-between gap-3 px-5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <a href={marketingHref} aria-label="Maillume website">
              <BrandMark inverse />
            </a>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher
              dictionary={dictionary}
              locale={locale}
              onLocaleChange={changeLocale}
            />
            <Link
              href={localizePath(userEmail ? "/account" : "/auth/sign-in", locale)}
              aria-label={userEmail ? dictionary.app.account : dictionary.app.signIn}
              title={userEmail ? dictionary.app.account : dictionary.app.signIn}
              className="inline-flex h-10 w-10 items-center justify-center gap-2 border border-white/30 text-sm font-semibold text-white transition hover:border-[#dfff52] hover:text-[#dfff52] sm:w-auto sm:px-3"
            >
              {userEmail ? <UserRound className="h-4 w-4" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
              <span className="hidden sm:inline">
                {userEmail ? dictionary.app.account : dictionary.app.signIn}
              </span>
            </Link>
            <details className="group relative">
              <summary
                aria-label={dictionary.app.more}
                title={dictionary.app.more}
                className="flex h-10 w-10 cursor-pointer list-none items-center justify-center border border-white/30 text-white transition hover:border-[#dfff52] hover:text-[#dfff52] [&::-webkit-details-marker]:hidden"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </summary>
              <nav className="absolute right-0 top-12 z-20 w-52 border border-[#aeb6bf] bg-white p-2 text-[#111711] shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
                <a href={marketingHref} className="flex h-10 items-center gap-3 px-3 text-sm font-semibold hover:bg-[#eef1eb]">
                  <ArrowLeft className="h-4 w-4 text-[#087b72]" aria-hidden="true" />
                  {dictionary.app.website}
                </a>
                <a href={SOURCE_REPOSITORY_URL} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-3 px-3 text-sm font-semibold hover:bg-[#eef1eb]">
                  <Github className="h-4 w-4 text-[#087b72]" aria-hidden="true" />
                  <span className="flex-1">{dictionary.legal.source}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-[#6a747e]" aria-hidden="true" />
                </a>
              </nav>
            </details>
          </div>
        </div>
      </header>

      <section
        id="scanner"
        tabIndex={-1}
        className="mx-auto min-h-[calc(100svh-4rem)] max-w-[1480px] scroll-mt-6 px-5 py-2 outline-none sm:px-6 lg:px-8"
      >
        <div className="mb-3 flex flex-col gap-4 border-l-4 border-[#dfff52] pl-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="font-mono text-[10px] uppercase text-[#087b72]">{dictionary.app.audience}</p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight text-[#111711] sm:text-3xl">{dictionary.app.workspaceTitle}</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#4f5b50]">{dictionary.app.hero}</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#4f5b50]">
            <span className="inline-flex items-center gap-2"><Database className="h-4 w-4 text-[#087b72]" aria-hidden="true" /> {dictionary.app.privacyStatus}: <strong className="text-[#111711]">0</strong></span>
            <span className="inline-flex items-center gap-2"><ScanSearch className="h-4 w-4 text-[#ff705f]" aria-hidden="true" /> {dictionary.app.assessmentValue}</span>
          </div>
        </div>
        <EmailScanForm
          dictionary={dictionary}
          feedbackEnabled={feedbackEnabled}
          locale={locale}
          maxRequestBytes={maxRequestBytes}
        />
      </section>

      <footer className="border-t border-[#aeb6ac] bg-[#f7f8f4]">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-5 py-5 text-xs leading-5 text-[#59646f] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p>{dictionary.legal.notice}</p>
            <p className="mt-1 font-mono text-[10px] uppercase text-[#737d86]">
              {dictionary.legal.copyright}
            </p>
          </div>
          <nav className="flex items-center gap-4" aria-label={dictionary.legal.license}>
            <a
              href={SOURCE_REPOSITORY_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-semibold text-[#26313b] hover:text-[#087b72]"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              {dictionary.legal.source}
            </a>
            <a
              href={LICENSE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-semibold text-[#26313b] hover:text-[#087b72]"
            >
              <Scale className="h-4 w-4" aria-hidden="true" />
              {dictionary.legal.license}
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
