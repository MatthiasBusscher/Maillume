import Link from "next/link";
import { Github, LogIn, Menu, ScanSearch } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { getAppHref, SOURCE_REPOSITORY_URL } from "@/lib/site";

const navigation = [
  { href: "/platform", label: "Platform" },
  { href: "/self-hosted", label: "Self-hosted" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteHeader() {
  const appHref = getAppHref();

  return (
    <header className="sticky top-0 z-40 border-b border-[#cbd0c5] bg-[#f7f8f4]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex-none" aria-label="Maillume home">
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-[#434c43] md:flex" aria-label="Main navigation">
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
          <Link
            href="/auth/sign-in"
            className="inline-flex h-10 items-center gap-2 border border-[#aeb6ac] px-4 text-sm font-semibold text-[#2b342c] transition hover:border-[#111711] hover:bg-white"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </Link>
          <a
            href={appHref}
            className="inline-flex h-10 items-center gap-2 bg-[#111711] px-4 text-sm font-semibold text-white transition hover:bg-[#087b72]"
          >
            <ScanSearch className="h-4 w-4 text-[#dfff52]" aria-hidden="true" />
            Check an email
          </a>
        </div>

        <details className="group relative md:hidden">
          <summary
            className="flex h-10 w-10 cursor-pointer list-none items-center justify-center border border-[#aeb6ac] bg-white text-[#111711] [&::-webkit-details-marker]:hidden"
            title="Open menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Open menu</span>
          </summary>
          <div className="absolute right-0 top-12 w-[min(19rem,calc(100vw-2.5rem))] border border-[#aeb6ac] bg-[#f7f8f4] p-3 shadow-[0_20px_50px_rgba(17,23,17,0.18)]">
            <nav className="grid" aria-label="Mobile navigation">
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
              <Link
                href="/auth/sign-in"
                className="inline-flex h-10 items-center justify-center border border-[#aeb6ac] bg-white px-3 text-sm font-semibold"
              >
                Sign in
              </Link>
              <a
                href={appHref}
                className="inline-flex h-10 items-center justify-center bg-[#111711] px-3 text-sm font-semibold text-white"
              >
                Open scanner
              </a>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
