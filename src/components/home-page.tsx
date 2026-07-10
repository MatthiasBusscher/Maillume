"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, Database, ScanSearch } from "lucide-react";

import { EmailScanForm } from "@/components/email-scan-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  DEFAULT_LOCALE,
  dictionaries,
  getBrowserLocale,
  type Locale,
} from "@/lib/i18n/dictionary";

export function HomePage({ feedbackEnabled }: { feedbackEnabled: boolean }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const dictionary = useMemo(() => dictionaries[locale], [locale]);

  useEffect(() => {
    setLocale(getBrowserLocale(window.navigator.language));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <main className="min-h-screen">
      <a
        href="#scanner"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-white focus:bg-[#171a1f] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
      >
        {dictionary.app.skipToScanner}
      </a>
      <header className="border-b border-black bg-[#171a1f] text-white">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center bg-[#d8ff3e] text-[#171a1f]">
              <ScanSearch className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
              <span
                className="absolute -bottom-1 -right-1 h-3 w-3 border-2 border-[#171a1f] bg-[#ff6b57]"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="text-base font-semibold text-white sm:text-lg">{dictionary.app.name}</p>
              <p className="font-mono text-[10px] uppercase text-[#aeb6bf] sm:text-xs">
                {dictionary.app.status}
              </p>
            </div>
          </div>

          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
            <LanguageSwitcher
              dictionary={dictionary}
              locale={locale}
              onLocaleChange={setLocale}
            />
            <a
              href="#scanner"
              className="inline-flex h-10 items-center gap-2 border border-white/30 px-3 text-sm font-semibold text-white transition hover:border-[#d8ff3e] hover:text-[#d8ff3e]"
            >
              {dictionary.app.startScan}
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <section className="border-b border-[#c5cbd1] bg-[#f7f8f9]">
        <div className="mx-auto grid max-w-[1480px] gap-7 px-5 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-end lg:px-8 lg:py-10">
          <div className="max-w-4xl">
            <div className="mb-4 flex items-center gap-3 font-mono text-xs text-[#5d6670]">
              <span className="h-px w-8 bg-[#171a1f]" aria-hidden="true" />
              {dictionary.app.audience}
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-[#171a1f] sm:text-5xl">
              {dictionary.app.name}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#4e5965] sm:text-lg">
              {dictionary.app.hero}
            </p>
          </div>

          <div className="grid grid-cols-2 border border-[#aeb6bf] bg-white">
            <div className="border-r border-[#aeb6bf] p-3">
              <Database className="h-4 w-4 text-[#087b87]" aria-hidden="true" />
              <p className="mt-3 font-mono text-[10px] uppercase text-[#69737d]">
                {dictionary.app.privacyStatus}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#171a1f]">0</p>
            </div>
            <div className="p-3">
              <ScanSearch className="h-4 w-4 text-[#ff6b57]" aria-hidden="true" />
              <p className="mt-3 font-mono text-[10px] uppercase text-[#69737d]">
                {dictionary.app.assessmentStatus}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#171a1f]">24/7</p>
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
    </main>
  );
}
