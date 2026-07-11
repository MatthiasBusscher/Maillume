import Link from "next/link";
import { ArrowLeft, ScanSearch } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { getAppHref } from "@/lib/site";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#111711] px-5 py-12 text-white">
      <div className="w-full max-w-3xl border-y border-white/25 py-10 sm:py-14">
        <BrandMark inverse />
        <p className="mt-12 font-mono text-[10px] uppercase text-[#dfff52]">404 / Message not found</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">This route did not pass inspection.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-[#c8d1c6]">
          The page may have moved, or the address may be incomplete. The scanner and public product pages are still available.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="inline-flex h-11 items-center gap-2 bg-[#dfff52] px-4 text-sm font-bold text-[#111711] hover:bg-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back home
          </Link>
          <a href={getAppHref()} className="inline-flex h-11 items-center gap-2 border border-white/35 px-4 text-sm font-semibold text-white hover:border-white">
            <ScanSearch className="h-4 w-4 text-[#dfff52]" aria-hidden="true" /> Open scanner
          </a>
        </div>
      </div>
    </main>
  );
}
