import Link from "next/link";
import { Github, LogIn, Menu, ScanSearch } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { getAppHref, SOURCE_REPOSITORY_URL } from "@/lib/site";
import { getRequestPathname, getRequestSiteLocale } from "@/lib/i18n/request-locale";
import { localizePath } from "@/lib/i18n/site-locale";

export async function SiteHeader() {
  const [locale, pathname] = await Promise.all([getRequestSiteLocale(), getRequestPathname()]);
  const copy = locale === "nl" ? {
    home: "Maillume-startpagina", mainNav: "Hoofdnavigatie", mobileNav: "Mobiele navigatie",
    menu: "Menu openen", signIn: "Inloggen", scan: "Controleer een e-mail", openScanner: "Scanner openen",
    navigation: [["/platform", "Platform"], ["/self-hosted", "In eigen beheer"], ["/pricing", "Prijzen"]] as const,
  } : {
    home: "Maillume home", mainNav: "Main navigation", mobileNav: "Mobile navigation",
    menu: "Open menu", signIn: "Sign in", scan: "Check an email", openScanner: "Open scanner",
    navigation: [["/platform", "Platform"], ["/self-hosted", "Self-hosted"], ["/pricing", "Pricing"]] as const,
  };
  const appHref = localizeHref(getAppHref(), locale);
  const navigation = copy.navigation.map(([href, label]) => ({ href: localizePath(href, locale), label }));

  return (
    <header className="sticky top-0 z-40 border-b border-[#cbd0c5] bg-[#f7f8f4]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-6 lg:px-8">
        <Link href={localizePath("/", locale)} className="flex-none" aria-label={copy.home}>
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-[#434c43] md:flex" aria-label={copy.mainNav}>
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-[#087b72]">
              {item.label}
            </Link>
          ))}
          <a
            href={SOURCE_REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition hover:text-[#087b72]"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            GitHub
          </a>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageLinks locale={locale} pathname={pathname} />
          <Link
            href={localizePath("/auth/sign-in", locale)}
            className="inline-flex h-10 items-center gap-2 border border-[#aeb6ac] px-4 text-sm font-semibold text-[#2b342c] transition hover:border-[#111711] hover:bg-white"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {copy.signIn}
          </Link>
          <a
            href={appHref}
            className="inline-flex h-10 items-center gap-2 bg-[#111711] px-4 text-sm font-semibold text-white transition hover:bg-[#087b72]"
          >
            <ScanSearch className="h-4 w-4 text-[#dfff52]" aria-hidden="true" />
            {copy.scan}
          </a>
        </div>

        <details className="group relative md:hidden">
          <summary
            className="flex h-10 w-10 cursor-pointer list-none items-center justify-center border border-[#aeb6ac] bg-white text-[#111711] [&::-webkit-details-marker]:hidden"
            title={copy.menu}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">{copy.menu}</span>
          </summary>
          <div className="absolute right-0 top-12 w-[min(19rem,calc(100vw-2.5rem))] border border-[#aeb6ac] bg-[#f7f8f4] p-3 shadow-[0_20px_50px_rgba(17,23,17,0.18)]">
            <nav className="grid" aria-label={copy.mobileNav}>
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-b border-[#d8dcd3] px-3 py-3 text-sm font-semibold text-[#2b342c]"
                >
                  {item.label}
                </Link>
              ))}
              <a
                href={SOURCE_REPOSITORY_URL}
                target="_blank"
                rel="noreferrer"
                className="border-b border-[#d8dcd3] px-3 py-3 text-sm font-semibold text-[#2b342c]"
              >
                GitHub
              </a>
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="col-span-2"><LanguageLinks locale={locale} pathname={pathname} /></div>
              <Link
                href={localizePath("/auth/sign-in", locale)}
                className="inline-flex h-10 items-center justify-center border border-[#aeb6ac] bg-white px-3 text-sm font-semibold"
              >
                {copy.signIn}
              </Link>
              <a
                href={appHref}
                className="inline-flex h-10 items-center justify-center bg-[#111711] px-3 text-sm font-semibold text-white"
              >
                {copy.openScanner}
              </a>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}

function LanguageLinks({ locale, pathname }: { locale: "en" | "nl"; pathname: string }) {
  return (
    <div className="inline-flex border border-[#aeb6ac] bg-white p-1" aria-label={locale === "nl" ? "Taal" : "Language"}>
      {(["en", "nl"] as const).map((option) => (
        <Link key={option} href={`/language/${option}?next=${encodeURIComponent(pathname)}`} className={`flex h-8 min-w-9 items-center justify-center px-2 text-xs font-semibold ${option === locale ? "bg-[#111711] text-white" : "text-[#434c43] hover:bg-[#e9ede6]"}`} aria-current={option === locale ? "true" : undefined}>
          {option.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}

function localizeHref(href: string, locale: "en" | "nl") {
  if (href.startsWith("/")) return localizePath(href, locale);
  const url = new URL(href);
  url.pathname = localizePath(url.pathname || "/app", locale);
  return url.toString();
}
