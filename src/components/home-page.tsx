"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  Database,
  Github,
  LogIn,
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
  userEmail,
}: {
  feedbackEnabled: boolean;
  initialLocale: Locale;
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
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <a href={marketingHref} aria-label="Maillume website">
              <BrandMark inverse />
            </a>
            <span className="hidden h-7 w-px bg-white/20 sm:block" aria-hidden="true" />
            <p className="hidden font-mono text-[10px] uppercase text-[#aeb6bf] sm:block">
              {dictionary.app.status}
            </p>
          </div>

          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
            <LanguageSwitcher
              dictionary={dictionary}
              locale={locale}
              onLocaleChange={changeLocale}
            />
            <a
              href={SOURCE_REPOSITORY_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={dictionary.legal.source}
              title={dictionary.legal.source}
              className="hidden h-10 w-10 items-center justify-center border border-white/30 text-white transition hover:border-[#dfff52] hover:text-[#dfff52] sm:inline-flex"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link
              href={localizePath(userEmail ? "/account" : "/auth/sign-in", locale)}
              aria-label={userEmail ? dictionary.app.account : dictionary.app.signIn}
              title={userEmail ? dictionary.app.account : dictionary.app.signIn}
              className="inline-flex h-10 items-center justify-center gap-2 border border-white/30 px-2 text-sm font-semibold text-white transition hover:border-[#dfff52] hover:text-[#dfff52] sm:px-3"
            >
              {userEmail ? <UserRound className="h-4 w-4" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
              <span>
                {userEmail ? dictionary.app.account : dictionary.app.signIn}
              </span>
            </Link>
            <a
              href={marketingHref}
              aria-label={dictionary.app.website}
              title={dictionary.app.website}
              className="hidden h-10 items-center justify-center gap-2 border border-white/30 px-3 text-sm font-semibold text-white transition hover:border-[#dfff52] hover:text-[#dfff52] sm:inline-flex"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:inline">{dictionary.app.website}</span>
            </a>
            <a
              href="#scanner"
              className="inline-flex h-10 items-center gap-2 border border-white/30 px-3 text-sm font-semibold text-white transition hover:border-[#dfff52] hover:text-[#dfff52]"
            >
              {dictionary.app.startScan}
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <section className="border-b border-[#aeb6ac] bg-[#dfff52]">
        <div className="mx-auto grid max-w-[1480px] gap-7 px-5 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-end lg:px-8 lg:py-10">
          <div className="max-w-4xl">
            <div className="mb-4 flex items-center gap-3 font-mono text-xs text-[#4f5b50]">
              <span className="h-px w-8 bg-[#111711]" aria-hidden="true" />
              {dictionary.app.audience}
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-[#111711] sm:text-4xl">
              {dictionary.app.workspaceTitle}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#4f5b50]">
              {dictionary.app.hero}
            </p>
          </div>

          <div className="grid grid-cols-2 border border-[#111711] bg-[#f7f8f4]">
            <div className="border-r border-[#aeb6ac] p-3">
              <Database className="h-4 w-4 text-[#087b72]" aria-hidden="true" />
              <p className="mt-3 font-mono text-[10px] uppercase text-[#69737d]">
                {dictionary.app.privacyStatus}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#111711]">0</p>
            </div>
            <div className="p-3">
              <ScanSearch className="h-4 w-4 text-[#ff705f]" aria-hidden="true" />
              <p className="mt-3 font-mono text-[10px] uppercase text-[#69737d]">
                {dictionary.app.assessmentStatus}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#111711]">
                {dictionary.app.assessmentValue}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="scanner"
        tabIndex={-1}
        className="mx-auto max-w-[1480px] scroll-mt-6 px-5 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
      >
        <EmailScanForm dictionary={dictionary} feedbackEnabled={feedbackEnabled} locale={locale} />
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
